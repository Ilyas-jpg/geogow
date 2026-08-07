import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { metinVerisiOku, yayindakiIller } from "@/lib/veri";
import { alanYazisi } from "@/lib/alan";

type Param = { params: Promise<{ il: string; ilce: string }> };

async function bul(ilSlug: string, ilceSlug: string) {
  const iller = await yayindakiIller();
  const il = iller.find((i) => i.slug === ilSlug);
  if (!il) return null;
  const metin = await metinVerisiOku(il.plaka);
  const ilce = metin?.ilceler.find((i) => i.slug === ilceSlug);
  return metin && ilce ? { il, metin, ilce } : null;
}

export async function generateStaticParams() {
  const iller = await yayindakiIller();
  const yollar: { il: string; ilce: string }[] = [];
  for (const il of iller) {
    const metin = await metinVerisiOku(il.plaka);
    for (const ilce of metin?.ilceler ?? []) {
      yollar.push({ il: il.slug, ilce: ilce.slug });
    }
  }
  return yollar;
}

export async function generateMetadata({ params }: Param): Promise<Metadata> {
  const { il, ilce } = await params;
  const veri = await bul(il, ilce);
  if (!veri) return { title: "Bulunamadı" };
  return {
    title: `${veri.ilce.ad}, ${veri.il.il} toplanma alanları`,
    description: `${veri.ilce.ad} ilçesindeki mahallelere göre AFAD kayıtlı toplanma alanları.`,
  };
}

export default async function IlceSayfasi({ params }: Param) {
  const { il: ilSlug, ilce: ilceSlug } = await params;
  const veri = await bul(ilSlug, ilceSlug);
  if (!veri) notFound();
  const { il, ilce } = veri;

  const toplamAlan = ilce.mahalleler.reduce((t, m) => t + m.alanlar.length, 0);

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Yol izi" className="text-sm text-metin-3">
        <Link href="/dusuk" className="underline">
          Metin sürümü
        </Link>{" "}
        /{" "}
        <Link href={`/dusuk/${il.slug}`} className="underline">
          {il.il}
        </Link>{" "}
        / {ilce.ad}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">
        {ilce.ad} — {toplamAlan} toplanma alanı
      </h1>
      <p className="mt-3 text-metin-2">
        {ilce.mahalleler.length} mahalle/köy listeleniyor. Mahallenizi seçin.
      </p>

      <ul className="mt-6 divide-y divide-cizgi rounded border border-cizgi bg-zemin-2">
        {ilce.mahalleler.map((mahalle) => (
          <li key={mahalle.slug}>
            <Link
              href={`/dusuk/${il.slug}/${ilce.slug}/${mahalle.slug}`}
              className="flex min-h-[44px] items-center justify-between px-4 py-3 hover:bg-zemin-3"
            >
              <span>{mahalle.ad}</span>
              <span className="text-sm text-metin-3">
                {mahalle.alanlar.length} alan
                {mahalle.alanlar.length === 1 &&
                mahalle.alanlar[0].alanM2 &&
                mahalle.alanlar[0].alanM2 > 0
                  ? ` · ${alanYazisi(mahalle.alanlar[0].alanM2)}`
                  : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-metin-3">
        Listede olmayan bir mahalle, &ldquo;orada alan yok&rdquo; anlamına
        gelmez — AFAD kaydında o mahalleye bağlı alan görünmediği anlamına
        gelir. Resmî uyarı değildir; acil durumda 112 · AFAD 122.
      </p>
    </main>
  );
}
