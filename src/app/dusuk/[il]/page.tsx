import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { metinVerisiOku, yayindakiIller } from "@/lib/veri";

type Param = { params: Promise<{ il: string }> };

async function ilBul(slug: string) {
  const iller = await yayindakiIller();
  const il = iller.find((i) => i.slug === slug);
  if (!il) return null;
  const metin = await metinVerisiOku(il.plaka);
  return metin ? { il, metin } : null;
}

export async function generateStaticParams() {
  const iller = await yayindakiIller();
  return iller.map((il) => ({ il: il.slug }));
}

export async function generateMetadata({ params }: Param): Promise<Metadata> {
  const { il: slug } = await params;
  const veri = await ilBul(slug);
  if (!veri) return { title: "Bulunamadı" };
  return {
    title: `${veri.il.il} toplanma alanları — metin sürümü`,
    description: `${veri.il.il} genelinde AFAD kaydındaki ${veri.il.alan} toplanma alanı. İlçe seçerek mahallenizi bulun.`,
  };
}

export default async function IlSayfasi({ params }: Param) {
  const { il: slug } = await params;
  const veri = await ilBul(slug);
  if (!veri) notFound();
  const { il, metin } = veri;

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Yol izi" className="text-sm text-metin-3">
        <Link href="/dusuk" className="underline">
          Metin sürümü
        </Link>{" "}
        / {il.il}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">{il.il} — toplanma alanları</h1>
      <p className="mt-3 text-metin-2">
        AFAD kaydında {il.alan} toplanma alanı bulundu. {metin.ilceler.length} ilçe
        listeleniyor.
      </p>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {metin.ilceler.map((ilce) => {
          const alanSayisi = ilce.mahalleler.reduce((t, m) => t + m.alanlar.length, 0);
          return (
            <li key={ilce.slug}>
              <Link
                href={`/dusuk/${il.slug}/${ilce.slug}`}
                className="flex min-h-[44px] items-center justify-between rounded border border-cizgi bg-zemin-2 px-4 py-2 hover:border-vurgu"
              >
                <span>{ilce.ad}</span>
                <span className="text-sm text-metin-3">{alanSayisi} alan</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-sm text-metin-3">
        Veri {new Date(metin.toplandi).toLocaleDateString("tr-TR")} tarihinde
        AFAD / e-Devlet hizmetinden alındı. Resmî uyarı değildir; acil durumda
        112.
      </p>
    </main>
  );
}
