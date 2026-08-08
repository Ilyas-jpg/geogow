import type { Metadata } from "next";
import Link from "next/link";
import Hazirlik from "@/components/Hazirlik";
import SayfaKabugu from "@/components/SayfaKabugu";

export const metadata: Metadata = {
  title: "Hazırlık — afet çantası ve aile buluşma planı",
  description:
    "İşaretlenebilir afet çantası listesi ve doldurulup yazdırılabilen aile " +
    "buluşma planı. Her şey cihazında kalır, hesap gerekmez.",
  alternates: { canonical: "/hazirlik" },
};

/**
 * HAZIRLIK — sakin zamanın sayfası.
 *
 * Sunucuda render edilen kabuk + istemcide çalışan liste. Liste bileşeni
 * "use client" olsa da SSR edildiği için JavaScript'i olmayan ziyaretçi de
 * tam listeyi görür ve yazdırabilir; yalnız işaretlerin hatırlanması çalışmaz.
 */
export default function HazirlikSayfasi() {
  return (
    <SayfaKabugu aktif="/hazirlik">
      <header className="yazdirma-gizle pt-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Hazırlık</h1>
        <p className="mt-3 max-w-[68ch] text-lg text-metin-2">
          Hazırlık afet anında düşünmek zorunda kalmamaktır. Aşağıdaki listeyi
          işaretle, planı doldur ve yazdırıp çantana koy — kâğıt, şarjı biten
          telefondan uzun dayanır.
        </p>
      </header>

      {/* Yazdırılan sayfada logo yerine düz başlık: baskıda görsel varlık
          yüklenmeyebilir ve marka anayasası wordmark'ın metinle dizilmesini
          yasaklar — o yüzden baskıda yalnız site adı yazılır, wordmark değil. */}
      <div className="hidden yazdirma-goster">
        <p className="text-lg font-semibold">Afet çantası ve aile planı</p>
        <p className="text-sm">geogow.net</p>
      </div>

      <Hazirlik />

      <section className="yazdirma-gizle mt-12">
        <h2 className="text-2xl font-semibold">Sırada ne var?</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          <li className="rounded-xl border border-cizgi bg-zemin-2 p-5 text-sm text-metin-2">
            Mahallendeki{" "}
            <Link href="/" className="text-vurgu underline">
              toplanma alanını haritadan bul
            </Link>{" "}
            ve plana yaz — afet anında aramak için geç olur.
          </li>
          <li className="rounded-xl border border-cizgi bg-zemin-2 p-5 text-sm text-metin-2">
            İlini{" "}
            <Link href="/" className="text-vurgu underline">
              çevrimdışı kaydet
            </Link>{" "}
            ki şebeke çöktüğünde de açılsın.
          </li>
          <li className="rounded-xl border border-cizgi bg-zemin-2 p-5 text-sm text-metin-2">
            <Link href="/afet-ani" className="text-vurgu underline">
              Afet anı ekranını
            </Link>{" "}
            bir kez sakinken oku; o an okumak için vakit olmaz.
          </li>
        </ul>
      </section>

      <p className="mt-8 text-xs text-metin-3">
        Miktar veren maddelerin standardı yanında yazılıdır (AFAD · Sphere ·
        WHO). Bu sayfa bilgilendirme amaçlıdır ve resmî uyarının yerine geçmez —
        acil durumda 112.
      </p>
    </SayfaKabugu>
  );
}
