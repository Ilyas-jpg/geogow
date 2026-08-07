import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GeoGow — Toplanma alanları ve acil durum haritası",
    short_name: "GeoGow",
    description:
      "Afette en yakın toplanma alanını gösteren, çevrimdışı da çalışan ücretsiz harita.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d10",
    theme_color: "#0b0d10",
    lang: "tr",
    orientation: "portrait-primary",
    icons: [
      { src: "/marka/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/marka/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/marka/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Telefondan doğrudan "en yakın alan"a gitmek için kısayol.
    shortcuts: [
      { name: "Metin sürümü", url: "/dusuk" },
      { name: "Veri kapsamı", url: "/kapsam" },
    ],
  };
}
