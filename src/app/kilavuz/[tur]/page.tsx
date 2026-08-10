import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AFETLER, afetBul } from "@/lib/afet";

type Param = { params: Promise<{ tur: string }> };

/**
 * TEK AFETLİK A4 KART — buzdolabına asılacak ölçek.
 *
 * `/kilavuz` tüm içeriği taşır ve kalındır; bu sayfa TEK sayfaya sığmak
 * zorunda. O yüzden bilerek DAR: yalnız o anda ne yapılacağı, nerede olursan
 * ne değişir ve acil numara. Mekanizma, öncesi/sonrası ve mit bölümleri
 * BURAYA KOYULMADI — hepsini sıkıştırmak kartı iki sayfaya taşırır ve
 * buzdolabı kartı olma amacını bitirir. Meraklısı tam kılavuza gider.
 */

export const dynamicParams = false;

export async function generateStaticParams() {
  return AFETLER.map((a) => ({ tur: a.slug }));
}

export async function generateMetadata({ params }: Param): Promise<Metadata> {
  const { tur } = await params;
  const afet = afetBul(tur);
  if (!afet) return { title: "Bulunamadı" };
  return {
    title: `${afet.ad} — tek sayfalık kart`,
    description: `${afet.ad} anında ne yapılacağı, tek A4 sayfaya sığan kart. Yazdırıp buzdolabına asın.`,
  };
}

export default async function KilavuzKarti({ params }: Param) {
  const { tur } = await params;
  const afet = afetBul(tur);
  if (!afet) notFound();

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-5 py-8">
      <div className="yazdirma-gizle mb-6 rounded-xl border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
        Tek A4 sayfaya sığar. Yazdırın ya da{" "}
        <strong className="text-metin">“PDF olarak kaydet”</strong> ile
        indirin.{" "}
        <Link href="/kilavuz" className="text-vurgu underline">
          Tüm afetleri içeren kılavuz
        </Link>
        .
      </div>

      <header className="border-b border-cizgi pb-4">
        <img
          src="/marka/geogow-wordmark-siyah.png"
          alt="GeoGow"
          width={172}
          height={36}
          className="hidden h-[22px] w-auto yazdirma-goster"
        />
        <h1 className="mt-3 text-3xl font-semibold">{afet.ad}</h1>
        <p className="mt-1 text-metin-2">{afet.ozet}</p>
      </header>

      <h2 className="mt-6 text-xl font-semibold">O anda</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-lg">
        {afet.anAdimlari.map((adim) => (
          <li key={adim.baslik}>
            <strong className="text-metin">{adim.baslik}</strong>
            <span className="block text-base text-metin-2">{adim.detay}</span>
          </li>
        ))}
      </ol>

      {afet.varyantlar.length > 0 && (
        <>
          <h2 className="mt-6 text-xl font-semibold">Neredeysen</h2>
          <ul className="mt-2 space-y-1">
            {afet.varyantlar.map((v) => (
              <li key={v.yer}>
                <strong className="text-metin">{v.yer}:</strong>{" "}
                <span className="text-metin-2">{v.ne}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-6 text-2xl font-semibold">Acil çağrı: 112</p>

      <footer className="mt-6 border-t border-cizgi pt-3 text-xs text-metin-3">
        Kaynak: {afet.kaynaklar.map((k) => k.kurum).join(" · ")} · geogow.net ·
        Resmî uyarı değildir.
      </footer>
    </main>
  );
}
