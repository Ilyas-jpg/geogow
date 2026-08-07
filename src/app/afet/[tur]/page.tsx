import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AFETLER, afetBul, RENK_SINIFI } from "@/lib/afet";

type Parametre = { params: Promise<{ tur: string }> };

/** 9 afetin tamamı derleme anında üretilir — çalışma anında hesap yok. */
export function generateStaticParams() {
  return AFETLER.map((afet) => ({ tur: afet.slug }));
}

export async function generateMetadata({ params }: Parametre): Promise<Metadata> {
  const { tur } = await params;
  const afet = afetBul(tur);
  if (!afet) return {};
  return {
    title: `${afet.ad} — öncesi, anı ve sonrası`,
    description: `${afet.ad}: ${afet.ozet} Hazırlık, o anda yapılacaklar, sonrası ve doğru bilinen yanlışlar. Kaynaklar açık.`,
    alternates: { canonical: `/afet/${afet.slug}` },
  };
}

/**
 * AFET TÜRÜ DETAY SAYFASI — öncesi / anı / sonrası + mitler + kaynaklar.
 *
 * `/afet-ani` panik anının ekranıysa burası sakin zamanın ekranıdır: aynı
 * veriden (src/lib/afet.ts) beslenir, ikinci kopya yoktur.
 *
 * Kaynak künyesi sayfanın altında GÖRÜNÜR durur (marka anayasası §4:
 * "kaynak ve tarih her zaman görünür").
 */
export default async function AfetSayfasi({ params }: Parametre) {
  const { tur } = await params;
  const afet = afetBul(tur);
  if (!afet) notFound();

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <nav className="text-sm text-metin-3">
        <Link href="/afet-ani" className="text-vurgu underline">
          Afet anı
        </Link>{" "}
        / {afet.ad}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">{afet.ad}</h1>
      <p
        className={`mt-3 rounded-xl border bg-zemin-2 px-4 py-3 text-base font-medium ${RENK_SINIFI[afet.renk]}`}
      >
        {afet.ozet}
      </p>

      {afet.turkiye && (
        <section className="mt-5 rounded-xl border border-cizgi bg-zemin-2 p-4">
          <h2 className="text-sm uppercase tracking-wide text-metin-3">
            Türkiye&apos;de durum
          </h2>
          <p className="mt-2 text-sm text-metin-2">{afet.turkiye}</p>
        </section>
      )}

      {/* ── ANI ── */}
      <h2 className="mt-8 text-lg font-semibold">O anda — sırayla</h2>
      <ol className="mt-3 space-y-4">
        {afet.anAdimlari.map((adim, sira) => (
          <li key={adim.baslik} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zemin-3 text-sm font-semibold tabular-nums text-metin"
            >
              {sira + 1}
            </span>
            <span>
              <strong className="block text-metin">{adim.baslik}</strong>
              <span className="mt-0.5 block text-sm text-metin-2">{adim.detay}</span>
            </span>
          </li>
        ))}
      </ol>

      {afet.varyantlar.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Ya o an…</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {afet.varyantlar.map((v) => (
              <div key={v.yer} className="rounded-lg border border-cizgi bg-zemin-2 p-3">
                <dt className="font-medium text-metin">{v.yer}</dt>
                <dd className="mt-0.5 text-metin-2">{v.ne}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {/* ── ÖNCESİ ── */}
      <h2 className="mt-8 text-lg font-semibold">Öncesinde — hazırlık</h2>
      <ul className="mt-3 space-y-2 text-sm text-metin-2">
        {afet.oncesi.map((madde) => (
          <li key={madde} className="flex gap-2">
            <span aria-hidden className="mt-[3px] text-guvenli">
              ✓
            </span>
            <span>{madde}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        <Link href="/hazirlik" className="text-vurgu underline">
          Afet çantası ve aile buluşma planı
        </Link>
      </p>

      {/* ── SONRASI ── */}
      <h2 className="mt-8 text-lg font-semibold">Sonrasında</h2>
      <ul className="mt-3 space-y-2 text-sm text-metin-2">
        {afet.sonrasi.map((madde) => (
          <li key={madde} className="flex gap-2">
            <span aria-hidden className="mt-[3px] text-metin-3">
              →
            </span>
            <span>{madde}</span>
          </li>
        ))}
      </ul>

      {/* ── MİTLER ── */}
      {afet.mitler.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Doğru bilinen yanlışlar</h2>
          <div className="mt-3 space-y-4">
            {afet.mitler.map((mit) => (
              <article
                key={mit.yanlis}
                className="rounded-xl border border-cizgi bg-zemin-2 p-4"
              >
                <p className="text-sm">
                  <span className="font-semibold text-kritik">YANLIŞ ·</span>{" "}
                  <span className="text-metin-2">{mit.yanlis}</span>
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-guvenli">DOĞRU ·</span>{" "}
                  <span className="text-metin">{mit.dogru}</span>
                </p>
                <p className="mt-2 text-sm text-metin-2">{mit.neden}</p>
                <p className="mt-2 text-xs text-metin-3">
                  Kaynak: {mit.kaynaklar.map((k) => k.kurum).join(" · ")}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm">
            <Link href="/mitler" className="text-vurgu underline">
              Tüm afetlerdeki doğru bilinen yanlışlar
            </Link>
          </p>
        </>
      )}

      {/* ── KAYNAKLAR ── */}
      <h2 className="mt-8 text-lg font-semibold">Kaynaklar</h2>
      <ul className="mt-3 space-y-1 text-sm text-metin-2">
        {afet.kaynaklar.map((k) => (
          <li key={`${k.kurum}-${k.ad}`}>
            <strong className="text-metin">{k.kurum}</strong> — {k.ad}
            {k.url && (
              <>
                {" · "}
                <a
                  href={k.url}
                  className="text-vurgu underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  bağlantı
                </a>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-metin-3">
        Bu sayfa bilgilendirme amaçlıdır ve{" "}
        <strong className="text-metin-2">resmî uyarının yerine geçmez</strong>.
        Gerçek acil durumda 112 ve AFAD 122 talimatı esastır.
      </p>

      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/afet-ani" className="text-vurgu underline">
          Afet anı ekranı
        </Link>
        <Link href="/hazirlik" className="text-vurgu underline">
          Hazırlık
        </Link>
        <Link href="/" className="text-vurgu underline">
          Toplanma alanı haritası
        </Link>
      </p>
    </main>
  );
}
