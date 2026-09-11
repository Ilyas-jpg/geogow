import type { Metadata } from "next";
import Uygulama from "@/components/Uygulama";
import { ozetOku } from "@/lib/veri";

/**
 * YAYIN MODU — haber kanalı / projeksiyon için tam ekran harita.
 *
 * Menü, arama, çipler ve panel yok; koyu harita + 1,6× yazı + sağda canlı
 * deprem listesi (2 dakikada bir yenilenir) + saat. Bir şehre kilitlemek
 * için `?il=<slug>`: /yayin?il=istanbul. Katman: `?k=deprem,sicaklik`.
 *
 * Arama motorlarına kapalı (noindex): bu bir sayfa değil, sahne.
 */
export const metadata: Metadata = {
  title: "Yayın modu — GeoGow",
  description: "Haber kanalı ve projeksiyon için tam ekran toplanma alanı haritası.",
  robots: { index: false, follow: false },
};

export default async function Yayin() {
  const ozet = await ozetOku();
  return (
    <>
      <h1 className="sr-only">GeoGow yayın modu — toplanma alanları ve canlı deprem haritası</h1>
      <Uygulama ozet={ozet} yayin />
    </>
  );
}
