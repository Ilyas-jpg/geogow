import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AFETLER, afetBul } from "@/lib/afet";

type Param = { params: Promise<{ tur: string }> };

/**
 * AFET SAYFASININ SADE SÜRÜMÜ — ürünün en dayanıklı içerik yüzeyi.
 *
 * Zengin `/afet/<tür>` sayfası görsel, ikon ve harita bağlantısı taşır.
 * Burada hiçbiri yok: yalnız metin. Şebeke dizlerinin üstündeyken ve eski
 * bir telefonda açılması gereken sayfa budur.
 *
 * 🔑 İÇERİK İKİNCİ KEZ YAZILMADI. Kaynak zengin sayfayla aynı: `src/lib/afet.ts`.
 * İki kopya olsaydı biri güncellenip diğeri unutulurdu ve afet anında hangi
 * sürümü okuduğun, hangi bilgiyi aldığını belirlerdi — kabul edilemez.
 *
 * SIRALAMA BİLİNÇLİ: adımlar EN ÜSTTE. Zengin sayfa mekanizmayla (neden olur)
 * başlar çünkü orada okuyan kişi hazırlanıyordur; buraya gelen kişi büyük
 * ihtimalle olayın içindedir. Panikte mekanizma değil adım okunur.
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
    title: `${afet.ad} — metin sürümü`,
    description: `${afet.ad}: o anda ne yapılır, öncesinde ne hazırlanır, sonrasında ne beklenir. Görselsiz, JavaScript gerektirmeyen sade sürüm.`,
  };
}

export default async function SadeAfetSayfasi({ params }: Param) {
  const { tur } = await params;
  const afet = afetBul(tur);
  if (!afet) notFound();

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Yol izi" className="text-sm text-metin-3">
        <Link href="/dusuk" className="underline">
          Metin sürümü
        </Link>{" "}
        /{" "}
        <Link href="/dusuk/afet" className="underline">
          Afetler
        </Link>{" "}
        / {afet.ad}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">{afet.ad}</h1>
      <p className="mt-3 text-metin-2">{afet.ozet}</p>

      <p className="mt-4 rounded border border-kritik/40 bg-kritik/10 px-4 py-3 text-sm">
        Acil çağrı <strong className="text-metin">112</strong>. Bu sayfa resmî
        uyarı değildir.
      </p>

      {/* ── O anda ── */}
      <h2 className="mt-8 text-lg font-semibold">O anda ne yapılır</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5">
        {afet.anAdimlari.map((adim) => (
          <li key={adim.baslik}>
            <strong className="text-metin">{adim.baslik}</strong>
            <span className="text-metin-2"> — {adim.detay}</span>
          </li>
        ))}
      </ol>

      {afet.varyantlar.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Neredeysen ona göre</h2>
          <dl className="mt-3 space-y-2">
            {afet.varyantlar.map((v) => (
              <div key={v.yer}>
                <dt className="inline font-medium text-metin">{v.yer}:</dt>{" "}
                <dd className="inline text-metin-2">{v.ne}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {/* ── Öncesi / sonrası ── */}
      <h2 className="mt-8 text-lg font-semibold">Öncesinde</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-metin-2">
        {afet.oncesi.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Sonrasında</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-metin-2">
        {afet.sonrasi.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>

      {/* ── Mekanizma: meraklısına, en sona ── */}
      <h2 className="mt-8 text-lg font-semibold">Neden olur</h2>
      <p className="mt-2 text-metin-2">{afet.nedenOlur}</p>

      <h2 className="mt-6 text-lg font-semibold">Nasıl anlaşılır</h2>
      <p className="mt-2 text-metin-2">{afet.nasilAnlasilir}</p>

      {afet.turkiye && (
        <>
          <h2 className="mt-6 text-lg font-semibold">Türkiye&apos;de</h2>
          <p className="mt-2 text-metin-2">{afet.turkiye}</p>
        </>
      )}

      {afet.mitler.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Yaygın yanlışlar</h2>
          <ul className="mt-3 space-y-4">
            {afet.mitler.map((mit) => (
              <li key={mit.yanlis}>
                <p>
                  <strong className="text-kritik">Yanlış:</strong>{" "}
                  <span className="text-metin-2">{mit.yanlis}</span>
                </p>
                <p>
                  <strong className="text-guvenli">Doğru:</strong>{" "}
                  <span className="text-metin">{mit.dogru}</span>
                </p>
                <p className="mt-1 text-sm text-metin-2">{mit.neden}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 text-lg font-semibold">Kaynaklar</h2>
      <ul className="mt-2 space-y-1 text-sm text-metin-3">
        {afet.kaynaklar.map((k) => (
          <li key={`${k.kurum}-${k.ad}`}>
            {k.kurum} — {k.ad}
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm">
        <Link href={`/afet/${afet.slug}`} className="text-vurgu underline">
          Görselli sürüme geç →
        </Link>
      </p>
    </main>
  );
}
