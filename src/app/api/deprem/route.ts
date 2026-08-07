import { NextResponse } from "next/server";
import { depremleriCevir, pencere } from "@/lib/deprem";

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

  const { start, end } = pencere(saat);
  const sorgu = new URLSearchParams({
    start,
    end,
    orderby: "timedesc",
    limit: "500",
    minmag: String(Number.isFinite(enAz) ? Math.max(0, Math.min(9, enAz)) : 1.5),
  });

  try {
    const yanit = await fetch(`${UC}?${sorgu}`, {
      signal: AbortSignal.timeout(15_000),
      // Üst kaynağı korumak için 2 dakika: deprem verisi bundan sık değişmez.
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });
    if (!yanit.ok) {
      // Hata gövdesini istemciye YANSITMIYORUZ (yangın projesinde üst kaynak
      // hata gövdesi anahtar sızdırabiliyordu); yalnız durum bilgisi.
      return NextResponse.json(
        { depremler: [], hata: `kaynak ${yanit.status}`, kaynak: "AFAD" },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }
    const depremler = depremleriCevir(await yanit.json());
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
