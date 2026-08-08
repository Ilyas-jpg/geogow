import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AFETLER, afetBul, METIN_SINIFI, RENK_SINIFI } from "@/lib/afet";
import { AfetDiyagrami, AfetIkonu } from "@/components/AfetCizim";
import SayfaKabugu from "@/components/SayfaKabugu";

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
 * AFET TÜRÜ DETAY SAYFASI.
 *
 * ── MASAÜSTÜ İKİ KOLON ──
 * Tek dar kolon 1440 px ekranda "mobil pencere" gibi duruyordu. Ana akış
 * (adımlar, öncesi, sonrası) solda; bağlam (Türkiye'de durum, kaynaklar,
 * ilgili sayfalar) sağda YAPIŞKAN sütunda. Okuma kolonu 68ch'i geçmez —
 * genişlik arttı diye satır uzunluğu bozulmaz.
 *
 * `/afet-ani` panik anının ekranıysa burası sakin zamanın ekranı; ikisi de
 * `src/lib/afet.ts`ten beslenir, ikinci kopya yoktur.
 */
export default async function AfetSayfasi({ params }: Parametre) {
  const { tur } = await params;
  const afet = afetBul(tur);
  if (!afet) notFound();

  return (
    <SayfaKabugu aktif="/afet-ani">
      <nav className="pt-6 text-sm text-metin-3">
        <Link href="/afet-ani" className="text-vurgu hover:underline">
          Afet anı
        </Link>{" "}
        / {afet.ad}
      </nav>

      {/* ── Başlık ── */}
      <header className="mt-3">
        <h1 className="flex items-center gap-3 text-3xl font-semibold sm:text-4xl">
          <span className={METIN_SINIFI[afet.renk]}>
            <AfetIkonu slug={afet.slug} boyut={36} />
          </span>
          {afet.ad}
        </h1>
        <p
          className={`mt-4 rounded-xl border bg-zemin-2 px-5 py-4 text-lg font-medium ${RENK_SINIFI[afet.renk]}`}
        >
          {afet.ozet}
        </p>
      </header>

      {/* ── İki kolon ── */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ══ ANA AKIŞ ══ */}
        <div className="min-w-0">
          <AfetDiyagrami slug={afet.slug} />

          {/*
            Mekanizma ve erken belirti. Adımlardan ÖNCE gelir çünkü sakin
            zamanda okuyan kişi önce "bu nedir, geldiğini nasıl anlarım"
            sorusunu sorar. Panik ekranı olan `/afet-ani` bu bölümü
            göstermez — orada okunacak tek şey adımlardır.
          */}
          <section className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-cizgi bg-zemin-2 p-5">
              <h2 className="text-xl font-semibold text-metin">Neden olur</h2>
              <p className="mt-3 text-metin-2">{afet.nedenOlur}</p>
            </article>
            <article className="rounded-xl border border-cizgi bg-zemin-2 p-5">
              <h2 className={`text-xl font-semibold ${METIN_SINIFI[afet.renk]}`}>
                Nasıl anlaşılır
              </h2>
              <p className="mt-3 text-metin-2">{afet.nasilAnlasilir}</p>
            </article>
          </section>

          <h2 className="mt-12 text-2xl font-semibold">O anda — sırayla</h2>
          <ol className="mt-4 space-y-5">
            {afet.anAdimlari.map((adim, sira) => (
              <li key={adim.baslik} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zemin-3 text-base font-semibold tabular-nums text-metin"
                >
                  {sira + 1}
                </span>
                <span className="max-w-[62ch]">
                  <strong className="block text-lg text-metin">{adim.baslik}</strong>
                  <span className="mt-1 block text-metin-2">{adim.detay}</span>
                </span>
              </li>
            ))}
          </ol>

          {afet.varyantlar.length > 0 && (
            <>
              <h2 className="mt-12 text-2xl font-semibold">Ya o an…</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {afet.varyantlar.map((v) => (
                  <div
                    key={v.yer}
                    className="rounded-xl border border-cizgi bg-zemin-2 p-4"
                  >
                    <dt className="font-semibold text-metin">{v.yer}</dt>
                    <dd className="mt-1 text-sm text-metin-2">{v.ne}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <h2 className="mt-12 text-2xl font-semibold">Öncesinde — hazırlık</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {afet.oncesi.map((madde) => (
              <li
                key={madde}
                className="flex gap-3 rounded-xl border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2"
              >
                <span aria-hidden className="mt-0.5 shrink-0 text-guvenli">
                  ✓
                </span>
                <span>{madde}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/hazirlik" className="text-vurgu underline">
              Afet çantası ve aile buluşma planı →
            </Link>
          </p>

          <h2 className="mt-12 text-2xl font-semibold">Sonrasında</h2>
          <ul className="mt-4 space-y-2.5 text-metin-2">
            {afet.sonrasi.map((madde) => (
              <li key={madde} className="flex max-w-[62ch] gap-3">
                <span aria-hidden className="mt-1 shrink-0 text-metin-3">
                  →
                </span>
                <span>{madde}</span>
              </li>
            ))}
          </ul>

          {afet.mitler.length > 0 && (
            <>
              <h2 className="mt-12 text-2xl font-semibold">
                Doğru bilinen yanlışlar
              </h2>
              <div className="mt-4 space-y-4">
                {afet.mitler.map((mit) => (
                  <article
                    key={mit.yanlis}
                    className="overflow-hidden rounded-xl border border-cizgi bg-zemin-2"
                  >
                    <div className="grid sm:grid-cols-2">
                      <p className="border-b border-cizgi bg-kritik/10 p-4 text-sm sm:border-b-0 sm:border-r">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-kritik">
                          Yanlış
                        </span>
                        <span className="mt-1 block text-metin-2">{mit.yanlis}</span>
                      </p>
                      <p className="bg-guvenli/10 p-4 text-sm">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-guvenli">
                          Doğru
                        </span>
                        <span className="mt-1 block text-metin">{mit.dogru}</span>
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="max-w-[68ch] text-sm text-metin-2">{mit.neden}</p>
                      <p className="mt-2 text-xs text-metin-3">
                        Kaynak: {mit.kaynaklar.map((k) => k.kurum).join(" · ")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-sm">
                <Link href="/mitler" className="text-vurgu underline">
                  Tüm afetlerdeki doğru bilinen yanlışlar →
                </Link>
              </p>
            </>
          )}
        </div>

        {/* ══ YAPIŞKAN BAĞLAM SÜTUNU ══ */}
        <aside className="lg:sticky lg:top-[calc(var(--ust-menu-yuksekligi)+1.5rem)] lg:self-start">
          <div className="space-y-4">
            {afet.turkiye && (
              <section className="rounded-xl border border-cizgi bg-zemin-2 p-5">
                <h2 className="font-semibold text-metin">Türkiye&apos;de durum</h2>
                <p className="mt-2 text-sm text-metin-2">{afet.turkiye}</p>
              </section>
            )}

            <section className="rounded-xl border border-cizgi bg-zemin-2 p-5">
              <h2 className="font-semibold text-metin">Kaynaklar</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-metin-2">
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
              <p className="mt-3 text-xs text-metin-3">
                Kritik davranış iddiaları en az bir Türkiye-resmî ve bir
                uluslararası otorite kaynağıyla teyit edilir.
              </p>
            </section>

            <section className="rounded-xl border border-cizgi bg-zemin-2 p-5">
              <h2 className="font-semibold text-metin">Diğer afetler</h2>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm lg:grid-cols-1">
                {AFETLER.filter((a) => a.slug !== afet.slug).map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/afet/${a.slug}`}
                      className="flex items-center gap-2 text-metin-2 hover:text-metin"
                    >
                      <span className={`shrink-0 ${METIN_SINIFI[a.renk]}`}>
                        <AfetIkonu slug={a.slug} boyut={16} />
                      </span>
                      {a.ad}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </div>
    </SayfaKabugu>
  );
}
