import type { Metadata } from "next";
import Link from "next/link";
import { AFETLER } from "@/lib/afet";
import { BASILABILIRLER, KART_SAYFA } from "@/lib/basilabilir";
import { AfetIkonu } from "@/components/AfetCizim";
import SayfaKabugu from "@/components/SayfaKabugu";

export const metadata: Metadata = {
  title: "Basılabilir malzemeler — kılavuz, kartlar, çanta listesi",
  description:
    "Yazdırılıp çantaya konabilen, buzdolabına asılabilen, okulda " +
    "dağıtılabilen afet malzemeleri. Hepsi ücretsiz, kaydolmadan, " +
    "tarayıcının “PDF olarak kaydet” özelliğiyle.",
  alternates: { canonical: "/printables" },
};

/**
 * BASILABİLİR MALZEME KATALOĞU.
 *
 * İlyas'ın tarifi: "mağaza katalogu gibi olsun, isteyen istediğini indirip
 * bassın". Normal gezinme akışından ayrı bir yüzey — kullanıcı buraya
 * "okumaya" değil "almaya" gelir.
 *
 * 🔑 Her kalemde SAYFA SAYISI yazıyor ve bu sayı ölçüldü (bkz.
 * `src/lib/basilabilir.ts`). Sebep: insan yazıcıya kâğıt koyarken bunu
 * bilmek ister; 19 sayfalık bir belgeyi yanlışlıkla basmak gerçek bir
 * maliyettir ve kullanıcıyı bir daha basmaktan soğutur.
 *
 * ⚠️ PDF ÜRETİLMİYOR, sunucuda da üretilmeyecek. Tarayıcının kendi
 * "PDF olarak kaydet"i kullanılıyor: ek bağımlılık yok, her cihazda
 * çalışır, dosya saklamak gerekmez.
 */
export default function PrintablesSayfasi() {
  return (
    <SayfaKabugu aktif="/printables">
      <div className="pt-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Basılabilir malzemeler
        </h1>
        <p className="mt-3 max-w-[68ch] text-metin-2">
          Kâğıt, şarjı biten telefondan uzun dayanır ve şebeke çöktüğünde
          çalışmaya devam eder. Aşağıdakileri yazdırıp çantanıza koyabilir,
          buzdolabına asabilir, okulda ve iş yerinde dağıtabilirsiniz.
        </p>
        <p className="mt-3 max-w-[68ch] text-sm text-metin-3">
          Hepsi ücretsiz ve kaydolmadan. Ayrı bir dosya indirmenize gerek yok:
          sayfayı açıp tarayıcının yazdırma penceresinden{" "}
          <strong className="text-metin-2">“PDF olarak kaydet”</strong>{" "}
          seçmeniz yeterli. Sayfa sayıları A4 için ölçüldü.
        </p>

        {/* ── Ana kalemler ── */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BASILABILIRLER.map((b) => (
            <article
              key={b.yol}
              className="flex flex-col rounded-2xl border border-cizgi bg-zemin-2 p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-metin">{b.ad}</h2>
                <span className="shrink-0 rounded-full border border-cizgi px-2 py-0.5 text-xs text-metin-3">
                  {b.sayfa} sayfa
                </span>
              </div>
              <p className="mt-2 text-sm text-metin-2">{b.ne}</p>
              <p className="mt-2 text-sm text-metin-3">{b.nerede}</p>
              {b.doldurulur && (
                <p className="mt-2 text-xs text-vurgu">
                  Kalemle doldurulur — boş alanlarla basılır.
                </p>
              )}
              <Link
                href={b.yol}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-vurgu/50 bg-vurgu/10 px-4 py-2 text-sm font-medium text-vurgu hover:bg-vurgu/20"
              >
                Aç ve yazdır →
              </Link>
            </article>
          ))}
        </div>

        {/* ── Afet kartları ── */}
        <h2 className="mt-12 text-2xl font-semibold">
          Tek sayfalık afet kartları
        </h2>
        <p className="mt-2 max-w-[68ch] text-metin-2">
          Her afet için bir A4. Yalnız o anda ne yapılacağı ve nerede olursan
          ne değiştiği yazıyor — buzdolabına, panoya, dolap kapağına asılacak
          ölçekte. Dokuzu da {KART_SAYFA} sayfa.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AFETLER.map((afet) => (
            <li key={afet.slug}>
              <Link
                href={`/kilavuz/${afet.slug}`}
                className="flex min-h-[56px] items-center gap-3 rounded-xl border border-cizgi bg-zemin-2 px-4 py-3 hover:border-vurgu"
              >
                <AfetIkonu slug={afet.slug} boyut={20} />
                <span className="flex-1">
                  <span className="block font-medium text-metin">
                    {afet.ad}
                  </span>
                  {afet.anAdimlari[0] && (
                    <span className="block text-xs text-metin-3">
                      {afet.anAdimlari[0].baslik}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Nasıl basılır ── */}
        <section className="mt-12 rounded-2xl border border-cizgi bg-zemin-2 p-6">
          <h2 className="text-lg font-semibold text-metin">
            Nasıl PDF yaparım?
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-metin-2">
            <li>Yazdırmak istediğin belgeyi aç.</li>
            <li>
              Yazdır penceresini aç —{" "}
              <kbd className="rounded border border-cizgi px-1.5 py-0.5 text-sm">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-cizgi px-1.5 py-0.5 text-sm">
                P
              </kbd>{" "}
              (Mac&apos;te{" "}
              <kbd className="rounded border border-cizgi px-1.5 py-0.5 text-sm">
                ⌘
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-cizgi px-1.5 py-0.5 text-sm">
                P
              </kbd>
              ).
            </li>
            <li>
              Yazıcı yerine{" "}
              <strong className="text-metin">“PDF olarak kaydet”</strong> seç.
            </li>
            <li>
              Kaydet. İnternet olmadan da açılır; telefona da atabilirsin.
            </li>
          </ol>
          <p className="mt-4 text-sm text-metin-3">
            Belgeler siyah-beyaz yazıcıda da okunur: renk tek başına bilgi
            taşımaz, her uyarı yazıyla da belirtilir.
          </p>
        </section>

        <p className="mt-8 max-w-[68ch] text-sm text-metin-3">
          Bu belgeler resmî uyarı değildir. İçerik AFAD, USGS, FEMA, OGM, DSİ,
          MGM, EAWS ve WHO kaynaklarına dayanır; kaynak künyesi her belgenin
          altında yazılıdır. Acil durumda{" "}
          <strong className="text-metin-2">112</strong>.
        </p>
      </div>
    </SayfaKabugu>
  );
}
