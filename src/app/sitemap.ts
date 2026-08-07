import type { MetadataRoute } from "next";
import { metinVerisiOku, yayindakiIller } from "@/lib/veri";

const TABAN = "https://geogow.net";

/**
 * Site haritası — metin sürümünün il/ilçe/mahalle sayfaları arama motorunun
 * asıl işine yarayan yüzey ("X mahallesi toplanma alanı" sorgusu). Sayfalar
 * SSG olduğu için burada üretmek maliyetsiz.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const girdiler: MetadataRoute.Sitemap = [
    { url: `${TABAN}/`, changeFrequency: "daily", priority: 1 },
    { url: `${TABAN}/dusuk`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${TABAN}/kapsam`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${TABAN}/hakkinda`, changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const il of await yayindakiIller()) {
    const guncelleme = new Date(il.toplandi);
    girdiler.push({
      url: `${TABAN}/dusuk/${il.slug}`,
      lastModified: guncelleme,
      changeFrequency: "monthly",
      priority: 0.8,
    });
    const metin = await metinVerisiOku(il.plaka);
    for (const ilce of metin?.ilceler ?? []) {
      girdiler.push({
        url: `${TABAN}/dusuk/${il.slug}/${ilce.slug}`,
        lastModified: guncelleme,
        changeFrequency: "monthly",
        priority: 0.7,
      });
      for (const mahalle of ilce.mahalleler) {
        girdiler.push({
          url: `${TABAN}/dusuk/${il.slug}/${ilce.slug}/${mahalle.slug}`,
          lastModified: guncelleme,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  }
  return girdiler;
}
