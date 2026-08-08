import type { Metadata } from "next";
import Link from "next/link";
import { yayindakiIller, ozetOku } from "@/lib/veri";

export const metadata: Metadata = {
  title: "Metin sürümü — toplanma alanları",
  description:
    "Haritasız, JavaScript gerektirmeyen liste. Kötü bağlantıda ve eski " +
    "telefonlarda açılır: il → ilçe → mahalle seçin, toplanma alanlarını görün.",
};

/**
 * METİN SÜRÜMÜ — ürünün en dayanıklı yüzeyi.
 *
 * Harita motoru yok, konum izni yok, veri indirmesi yok. Afet anında şebeke
 * dizlerinin üstündeyken çalışması gereken sayfa budur; bu yüzden tamamı
 * SSG ve içerik JavaScript'siz okunur.
 */
export default async function MetinAnasayfa() {
  const iller = await yayindakiIller();
  const ozet = await ozetOku();

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Toplanma alanları — metin sürümü</h1>
      <p className="mt-3 text-metin-2">
        Harita ve JavaScript gerektirmez. İlinizi seçin, ilçe ve mahallenize
        inin; toplanma alanlarının adını, adresini ve varsa tabela kodunu
        görün.
      </p>

      <nav aria-label="Yayındaki iller" className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-metin-3">
          Yayındaki iller ({iller.length})
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {iller.map((il) => (
            <li key={il.plaka}>
              <Link
                href={`/dusuk/${il.slug}`}
                className="flex min-h-[44px] items-center justify-between rounded border border-cizgi bg-zemin-2 px-4 py-2 hover:border-vurgu"
              >
                <span>{il.il}</span>
                <span className="text-sm text-metin-3">{il.alan} alan</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {iller.length < 81 && (
        <p className="mt-6 rounded border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
          <strong className="text-metin">81 ilin {iller.length} tanesi yayında.</strong>{" "}
          Veri, AFAD&apos;ın e-Devlet üzerindeki sorgulama hizmetinden il il
          toplanıyor ve her il tamamlandıkça buraya ekleniyor. Eksik iller için
          henüz veri toplamadık — &ldquo;o ilde alan yok&rdquo; anlamına gelmez.
        </p>
      )}

      <p className="mt-6 text-sm text-metin-3">
        Kaynak: {ozet?.kaynak ?? "AFAD / e-Devlet"} · Resmî uyarı değildir.
        Acil durumda <strong className="text-metin-2">112</strong> ·{" "}
        112.
      </p>
      {/* Afet anı ekranı da tamamen JavaScript'sizdir — metin sürümünü
          kullanabilen her cihazda açılır, o yüzden buradan da erişilebilir. */}
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/afet-ani" className="text-vurgu underline">
          Şu an ne yapmalıyım?
        </Link>
        <Link href="/hazirlik" className="text-vurgu underline">
          Hazırlık
        </Link>
        <Link href="/" className="text-vurgu underline">
          Haritalı sürüme geç
        </Link>
      </p>
    </main>
  );
}
