import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_ALANLARI } from "@/lib/hazirlik";

export const metadata: Metadata = {
  title: "Aile buluşma planı — basılabilir form",
  description:
    "Buluşma noktaları, şehir dışı irtibat kişisi, okul teslim bilgisi ve " +
    "vana yerleri için elle doldurulan tek sayfalık form.",
  alternates: { canonical: "/printables/plan" },
};

/**
 * AİLE BULUŞMA PLANI — DOLDURULACAK FORM.
 *
 * Tek sayfa olmak zorunda: herkesin çantasında bir kopya duracak. Bu yüzden
 * açıklama metni kısa, doldurma alanı geniş.
 *
 * 🔑 Alanlar `<input>` DEĞİL, çizgi. Sebep: bu belge ekranda doldurulmak
 * için değil, KALEMLE doldurulmak için var. Girdi alanı koymak "burayı
 * bilgisayarda doldurabilirsin" vaadi eder; oysa kaydetme yok ve sayfa
 * kapanınca yazdıkların gider. Ekranda doldurup saklamak isteyen
 * `/hazirlik`'e gider, orada localStorage'a yazılıyor.
 */
export default function PlanBasilabilir() {
  const basim = new Date().toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
  });

  return (
    <main id="icerik" className="kart-a4 mx-auto max-w-2xl px-5 py-8">
      <div className="yazdirma-gizle mb-6 rounded-xl border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
        Tek A4. Yazdırıp <strong className="text-metin">kalemle</strong>{" "}
        doldurun, herkesin çantasına bir kopya koyun.{" "}
        <Link href="/printables" className="text-vurgu underline">
          Diğer basılabilir malzemeler
        </Link>{" "}
        ·{" "}
        <Link href="/hazirlik" className="text-vurgu underline">
          Ekranda doldurup saklamak için
        </Link>
      </div>

      <header className="border-b border-cizgi pb-3">
        <img
          src="/marka/geogow-wordmark-siyah.png"
          alt="GeoGow"
          width={172}
          height={36}
          className="hidden h-[22px] w-auto yazdirma-goster"
        />
        <h1 className="mt-3 text-3xl font-semibold">Aile buluşma planı</h1>
        <p className="mt-1 text-sm text-metin-2">
          Şebeke çöktüğünde plan telefonda değil, cepte işe yarar. Evdeki
          herkes bu kâğıdın bir kopyasını taşısın.
        </p>
      </header>

      <ol className="mt-5 space-y-5">
        {PLAN_ALANLARI.map((alan) => (
          <li key={alan.id}>
            <strong className="text-metin">{alan.etiket}</strong>
            <p className="text-sm text-metin-3">{alan.ipucu}</p>
            {/* Kalemle doldurulacak çizgi — girdi alanı DEĞİL (bkz. üst not) */}
            <p aria-hidden className="mt-2 border-b border-cizgi pb-7" />
            {alan.cokSatir && (
              <p aria-hidden className="mt-1 border-b border-cizgi pb-7" />
            )}
          </li>
        ))}
      </ol>

      <p className="mt-6 rounded border border-kritik/40 px-4 py-3 text-sm">
        Acil çağrı <strong className="text-metin">112</strong>
      </p>

      <footer className="mt-4 border-t border-cizgi pt-3 text-xs text-metin-3">
        GeoGow · geogow.net · Baskı: {basim}. Resmî uyarı değildir.
      </footer>
    </main>
  );
}
