import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Geogow — Toplanma alanları ve acil durum haritası",
    short_name: "Geogow",
    description:
      "Afette en yakın toplanma alanını gösteren, çevrimdışı da çalışan ücretsiz harita.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d10",
    theme_color: "#0b0d10",
    lang: "tr",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    // Telefondan doğrudan "en yakın alan"a gitmek için kısayol.
    shortcuts: [
      { name: "Metin sürümü", url: "/dusuk" },
      { name: "Veri kapsamı", url: "/kapsam" },
    ],
  };
}
