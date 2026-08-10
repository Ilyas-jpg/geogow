import type { Metadata } from "next";
import Link from "next/link";
import { CANTA, PLAN_ALANLARI, SU_NOTU } from "@/lib/hazirlik";

export const metadata: Metadata = {
  title: "Hazırlık — metin sürümü",
  description:
    "Afet çantası ve aile buluşma planı; düz liste hâlinde. Görselsiz, " +
    "JavaScript gerektirmez, yazdırılabilir.",
};

/**
 * HAZIRLIĞIN SADE SÜRÜMÜ.
 *
 * Zengin `/hazirlik` işaretlenebilir kutular, ilerleme çubuğu ve 37 ikon
 * taşıyor; hepsi JavaScript ve localStorage'a bağlı. Buradaki sürüm düz
 * liste: işaret kutusu YOK.
 *
 * 🔑 Kutuların olmaması eksiklik değil, bilinçli: bu sayfanın işi kâğıda
 * dökülmek ve JavaScript çalışmadığında da okunabilmek. İşaretlenemeyen
 * bir kutu göstermek, çalışıyormuş gibi durup çalışmamak olurdu.
 *
 * İçerik zengin sayfayla aynı kaynaktan (`src/lib/hazirlik.ts`) geliyor;
 * ikinci kopya yok.
 */
export default function SadeHazirlik() {
  const temel = CANTA.filter((b) => !b.eklenti);
  const eklentiler = CANTA.filter((b) => b.eklenti);

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Yol izi" className="text-sm text-metin-3">
        <Link href="/dusuk" className="underline">
          Metin sürümü
        </Link>{" "}
        / Hazırlık
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">Hazırlık — metin sürümü</h1>
      <p className="mt-3 text-metin-2">
        Afet çantası ve aile buluşma planı. Bu sayfa yazdırılabilir: kâğıt,
        şarjı biten telefondan uzun dayanır.
      </p>

      {temel.map((bolum) => (
        <section key={bolum.id} className="mt-8">
          <h2 className="text-lg font-semibold">{bolum.baslik}</h2>
          {bolum.aciklama && (
            <p className="mt-2 text-sm text-metin-2">{bolum.aciklama}</p>
          )}
          <ul className="mt-3 space-y-3">
            {bolum.maddeler.map((m) => (
              <li key={m.id}>
                <p>
                  <strong className="text-metin">{m.ad}</strong>
                  <span className="text-metin-2"> — {m.miktar}</span>
                </p>
                <p className="text-sm text-metin-2">{m.neden}</p>
                {m.ipucu && <p className="text-sm text-metin-3">{m.ipucu}</p>}
                {m.tazele && (
                  <p className="text-sm text-metin-3">Tazele: {m.tazele}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-8 rounded border border-cizgi bg-zemin-2 p-4">
        <h2 className="text-base font-semibold">Su miktarı hakkında</h2>
        <p className="mt-2 text-sm text-metin-2">{SU_NOTU}</p>
      </section>

      {eklentiler.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Kime göre eklenenler</h2>
          <p className="mt-2 text-sm text-metin-2">
            Aşağıdakiler herkes için değil: evinde ilgili kişi varsa eklenir.
          </p>
          {eklentiler.map((bolum) => (
            <div key={bolum.id} className="mt-5">
              <h3 className="font-medium text-metin">{bolum.baslik}</h3>
              {bolum.aciklama && (
                <p className="mt-1 text-sm text-metin-2">{bolum.aciklama}</p>
              )}
              <ul className="mt-2 space-y-2">
                {bolum.maddeler.map((m) => (
                  <li key={m.id} className="text-sm">
                    <strong className="text-metin">{m.ad}</strong>
                    <span className="text-metin-2"> — {m.miktar}. {m.neden}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Aile buluşma planı</h2>
        <p className="mt-2 text-sm text-metin-2">
          Aşağıdaki başlıkları bir kâğıda yazıp çantaya koyun. Şebeke
          çöktüğünde plan telefonda değil, cepte işe yarar.
        </p>
        <ol className="mt-3 list-decimal space-y-3 pl-5">
          {PLAN_ALANLARI.map((alan) => (
            <li key={alan.id}>
              <strong className="text-metin">{alan.etiket}</strong>
              <p className="text-sm text-metin-2">{alan.ipucu}</p>
              {/* Doldurulacak boşluk: yazdırıldığında elle doldurulur. */}
              <p aria-hidden className="mt-1 text-metin-3">
                ......................................................
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/hazirlik" className="text-vurgu underline">
          İşaretlenebilir sürüme geç →
        </Link>
      </p>
    </main>
  );
}
