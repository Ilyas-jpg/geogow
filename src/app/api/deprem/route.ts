import { NextResponse } from "next/server";
import { birlestir, depremleriCevir, dilimler } from "@/lib/deprem";

/**
 * Son depremler — AFAD servisnet.
 *
 * Sunucuda önbelleklenir: afet anında binlerce kişi aynı anda açtığında
 * üst kaynağa binlerce istek gitmesin. Kullanıcıdan hiçbir bilgi
 * (konum dahil) bu uca gönderilmez.
 */
export const revalidate = 0;

const UC = "https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter";
const IZINLI_SAAT = [24, 72, 168];

export async function GET(istek: Request) {
  const url = new URL(istek.url);
  const istenen = Number(url.searchParams.get("saat") ?? 24);
  const saat = IZINLI_SAAT.includes(istenen) ? istenen : 24;
  const enAz = Number(url.searchParams.get("minmag") ?? 1.5);

  const enAzGecerli = Number.isFinite(enAz) ? Math.max(0, Math.min(9, enAz)) : 1.5;
  const LIMIT = 400;

  /** Tek dilimi çeker; limite dayanırsa dilimi ikiye bölüp yeniden dener. */
  async function dilimCek(
    start: string,
    end: string,
    derinlik = 0
  ): Promise<ReturnType<typeof depremleriCevir>> {
    const sorgu = new URLSearchParams({
      start,
      end,
      orderby: "timedesc",
      limit: String(LIMIT),
      minmag: String(enAzGecerli),
    });
    const yanit = await fetch(`${UC}?${sorgu}`, {
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });
    if (!yanit.ok) throw new Error(`kaynak ${yanit.status}`);
    const ham = await yanit.json();
    const cevrilen = depremleriCevir(ham);

    // Limite dayandıysak bu dilimde kayıp var demektir (AFAD limiti
    // sıralamadan önce uyguluyor) → ikiye böl. En fazla 3 kademe.
    if (Array.isArray(ham) && ham.length >= LIMIT && derinlik < 3) {
      const orta = new Date((Date.parse(`${start}Z`) + Date.parse(`${end}Z`)) / 2)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const [ilk, son] = await Promise.all([
        dilimCek(orta, end, derinlik + 1),
        dilimCek(start, orta, derinlik + 1),
      ]);
      return birlestir(ilk, son);
    }
    return cevrilen;
  }

  try {
    // Dilimler en yeniden eskiye sıralı; sırayla çekiliyor ki üst kaynağa
    // aynı anda yüklenmeyelim.
    const gruplar = [];
    for (const { start, end } of dilimler(saat)) {
      gruplar.push(await dilimCek(start, end));
    }
    const depremler = birlestir(...gruplar);

    return NextResponse.json(
      {
        depremler,
        saat,
        kaynak: "AFAD Deprem ve Risk Azaltma Genel Müdürlüğü",
        alindi: new Date().toISOString(),
      },
      {
        headers: {
          "cache-control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (hata) {
    console.error("deprem ucu düştü:", (hata as Error).message);
    return NextResponse.json(
      { depremler: [], hata: "kaynağa ulaşılamadı", kaynak: "AFAD" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
