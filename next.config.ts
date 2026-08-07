import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları — kamu güvenliği haritasında clickjacking bir
 * dezenformasyon vektörüdür (birinin haritasını kendi sayfasına gömüp
 * "AFAD böyle diyor" demesi).
 *
 * CSP nonce'a BİLİNÇLİ OLARAK geçilmiyor: Next 16'da nonce tüm sayfaları
 * dinamik yapar, SSG ve CDN önbelleği ölür. Bu ürünün iddiası kötü
 * bağlantıda hız — takas yanlış olurdu.
 */
const csp = [
  "default-src 'self'",
  // MapLibre çalışma zamanında worker'ı blob'dan kuruyor
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tucbs-public-api.csb.gov.tr",
  "font-src 'self'",
  "connect-src 'self' https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tucbs-public-api.csb.gov.tr",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // /embed ve /yayin dışındaki her yol: çerçevelenemez.
        source: "/((?!embed|yayin).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Konum İZNİ gerekiyor (en yakın alan) ama başka hiçbir şey değil.
            value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Gömme yüzeyleri: haber siteleri ve yayın araçları çerçeveleyebilsin.
        source: "/:yol(embed|yayin)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp.replace("frame-ancestors 'none'", "frame-ancestors *"),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Veri dosyaları uzun süre önbelleklenebilir: hasat tarihi değişince
        // dosya adı değil içeriği değişir, bu yüzden ölçülü bir süre.
        source: "/data/:yol*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
