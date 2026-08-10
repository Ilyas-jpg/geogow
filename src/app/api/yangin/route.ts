import { NextResponse } from "next/server";
import { jsonCek, tazele, type Kutu } from "@/lib/bellekOnbellek";
import { isiNoktalari, type IlKutusu } from "@/lib/yangin";
import { yayindakiIller } from "@/lib/veri";

/**
 * Uydu ısı noktaları (termal anomali) — özet katman.
 *
 * Kaynak kendi yangın projemizin açık ucu; o da NASA FIRMS'ten besleniyor.
 * FIRMS anahtarını ikinci bir projeye kopyalamak yerine tek yerde tutuyoruz
 * (proje kararı 2026-08-06: "özet katman + derin link, kod kopyalanmaz").
 *
 * 🔴 "Yangın var" DEMEZ: anız, sanayi bacası ve ısınmış kaya da anomali
 * üretir. Ürün dilinde "uydu ısı noktası" denir, doğrulama için yangın
 * sitesine yönlendirilir.
 */
export const revalidate = 0;
export const maxDuration = 30;

const UC = "https://yangin.algow.net/api/fires";
const TAZE_MS = 15 * 60 * 1000;
/** Katman kalabalıklaşmasın: en yeni N nokta. Ölçüldü — TR içi 965 nokta. */
const TAVAN = 1200;

let kutu: Kutu<unknown> | null = null;

export async function GET() {
  kutu = await tazele(kutu, TAZE_MS, () => jsonCek<unknown>(UC, { zamanAsimiMs: 20_000 }));

  if (!kutu) {
    return NextResponse.json(
      { noktalar: [], hata: "kaynağa ulaşılamadı" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  /**
   * Süzgeç, ilin KENDİ hasat verisinden türeyen kutular. Tek dikdörtgen
   * kullanmak ölçülüp çürütüldü: 550 Kerkük noktasını Türkiye sanıyordu.
   */
  const iller = await yayindakiIller();
  const kutular = iller
    .map((il) => il.kutu)
    .filter((k): k is IlKutusu => Array.isArray(k) && k.length === 4);

  const tumu = isiNoktalari(kutu.veri, kutular);
  const noktalar = tumu.slice(0, TAVAN);

  return NextResponse.json(
    {
      noktalar,
      /** Kırpma OLDUYSA gizlenmez — kullanıcı eksik gördüğünü bilsin. */
      kirpilan: tumu.length - noktalar.length,
      /**
       * Katmanın kapsamı hasada bağlı: kutusu olmayan il katkı vermez.
       * Sayı dışarı çıkar ki "orada yangın yok" sanılmasın.
       */
      kapsananIl: kutular.length,
      kaynak: "NASA FIRMS (yangin.algow.net üzerinden)",
      veriYasiSn: Math.round((Date.now() - kutu.zaman) / 1000),
    },
    { headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=1800" } }
  );
}
