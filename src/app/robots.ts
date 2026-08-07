import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Uçlar taranmasın: veri zaten sayfalarda, tarayıcı botu üst kaynağa
        // (AFAD) gereksiz yük bindirmesin.
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://geogow.net/sitemap.xml",
  };
}
