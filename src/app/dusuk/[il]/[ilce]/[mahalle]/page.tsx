import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { metinVerisiOku, yayindakiIller } from "@/lib/veri";
import { alanYazisi } from "@/lib/alan";

type Param = { params: Promise<{ il: string; ilce: string; mahalle: string }> };

async function bul(ilSlug: string, ilceSlug: string, mahalleSlug: string) {
  const iller = await yayindakiIller();
  const il = iller.find((i) => i.slug === ilSlug);
  if (!il) return null;
  const metin = await metinVerisiOku(il.plaka);
  const ilce = metin?.ilceler.find((i) => i.slug === ilceSlug);
  const mahalle = ilce?.mahalleler.find((m) => m.slug === mahalleSlug);
  return metin && ilce && mahalle ? { il, metin, ilce, mahalle } : null;
}

export async function generateStaticParams() {
  const iller = await yayindakiIller();
  const yollar: { il: string; ilce: string; mahalle: string }[] = [];
  for (const il of iller) {
    const metin = await metinVerisiOku(il.plaka);
    for (const ilce of metin?.ilceler ?? []) {
      for (const mahalle of ilce.mahalleler) {
        yollar.push({ il: il.slug, ilce: ilce.slug, mahalle: mahalle.slug });
      }
    }
  }
  return yollar;
}

export async function generateMetadata({ params }: Param): Promise<Metadata> {
  const { il, ilce, mahalle } = await params;
  const veri = await bul(il, ilce, mahalle);
  if (!veri) return { title: "Bulunamadı" };
  return {
    title: `${veri.mahalle.ad} toplanma alanları (${veri.ilce.ad}, ${veri.il.il})`,
    description: `${veri.mahalle.ad} mahallesine bağlı ${veri.mahalle.alanlar.length} AFAD kayıtlı toplanma alanı: ad, adres ve konum.`,
  };
}

export default async function MahalleSayfasi({ params }: Param) {
  const { il: ilSlug, ilce: ilceSlug, mahalle: mahalleSlug } = await params;
  const veri = await bul(ilSlug, ilceSlug, mahalleSlug);
  if (!veri) notFound();
  const { il, ilce, mahalle } = veri;

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Yol izi" className="text-sm text-metin-3">
        <Link href="/dusuk" className="underline">
          Metin
        </Link>{" "}
        /{" "}
        <Link href={`/dusuk/${il.slug}`} className="underline">
          {il.il}
        </Link>{" "}
        /{" "}
        <Link href={`/dusuk/${il.slug}/${ilce.slug}`} className="underline">
          {ilce.ad}
        </Link>{" "}
        / {mahalle.ad}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">{mahalle.ad}</h1>
      <p className="mt-2 text-metin-2">
        {mahalle.alanlar.length} toplanma alanı · {ilce.ad}, {il.il}
      </p>

      <ol className="mt-6 space-y-3">
        {mahalle.alanlar.map((alan) => (
          <li
            key={alan.id}
            className="rounded border border-cizgi bg-zemin-2 p-4"
          >
            <h2 className="font-medium text-guvenli">{alan.ad}</h2>
            {alan.adres && <p className="mt-1 text-sm text-metin-2">{alan.adres}</p>}
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-metin-3">
              {alan.tabelaKod && (
                <div className="flex gap-1">
                  <dt>Tabela kodu:</dt>
                  <dd className="text-metin-2">{alan.tabelaKod}</dd>
                </div>
              )}
              {alan.alanM2 ? (
                <div className="flex gap-1">
                  <dt>Kaba alan:</dt>
                  <dd className="text-metin-2">{alanYazisi(alan.alanM2)}</dd>
                </div>
              ) : null}
              <div className="flex gap-1">
                <dt>Konum:</dt>
                <dd className="text-metin-2">
                  {alan.enlem}, {alan.boylam}
                </dd>
              </div>
            </dl>
            {/* Rota motoru KULLANMIYORUZ: kullanıcının kendi harita
                uygulaması çizsin — çevrimdışı ve kullanım koşulu sorunu yok. */}
            <p className="mt-3">
              <a
                href={`geo:${alan.enlem},${alan.boylam}?q=${alan.enlem},${alan.boylam}(${encodeURIComponent(
                  alan.ad ?? "Toplanma alanı"
                )})`}
                className="inline-flex min-h-[44px] items-center text-vurgu underline"
              >
                Telefonun harita uygulamasında aç
              </a>
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-metin-3">
        Kaynak: AFAD / e-Devlet Afet ve Acil Durum Toplanma Alanı Sorgulama.
        Bilgiler değişebilir; sahadaki tabela ve resmî duyuru esastır. Resmî
        uyarı değildir — acil durumda 112 · AFAD 122.
      </p>
    </main>
  );
}
