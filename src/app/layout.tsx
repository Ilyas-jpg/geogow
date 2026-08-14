import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"], // latin-ext olmadan ş/ğ/ı düşer
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://geogow.net"),
  title: {
    default: "GeoGow — Toplanma alanları ve acil durum haritası",
    template: "%s · GeoGow",
  },
  description:
    "Deprem, yangın, sel gibi afetlerde en yakın toplanma alanını gösteren " +
    "ücretsiz harita. AFAD kayıtlı toplanma alanları, çevrimdışı da çalışır.",
  applicationName: "GeoGow",
  authors: [{ name: "Algow" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "GeoGow",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  // maximumScale KISITLANMAZ — kısıtlamak erişilebilirlik ihlalidir
  // (yangın projesinin erişilebilirlik turunda düzeltilen hata).
  width: "device-width",
  initialScale: 1,
};

export default function KokDuzen({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-vurgu focus:px-4 focus:py-2"
        >
          İçeriğe geç
        </a>
        {children}
        {/* Vercel Web Analytics — çerezsiz sayaç (2026-08-14 trafik taraması
            kararı: geogow'da ölçüm altyapısı sıfırdı). Komut dosyası aynı
            kaynaktan (/_vercel/insights) gelir: CSP `script-src 'self'`
            kapsamında, ek alan adı gerekmez. SW POST beacon'lara dokunmaz.

            🔴 Yükleyici etiketi BURADA, SSR HTML'in içinde: bileşenin kendi
            `inject()`i etiketi hidrasyon sırasında `document.head`e ekliyor
            ve React 19'un head mutabakatı onu SİLİYORDU (canlıda ölçüldü:
            `window.va` kurulmuş, kuyrukta 1 sayfa görüntüleme, etiket yok,
            istek yok; aynı etiket elle eklenince 200 ile yüklendi). React'in
            kendi render ettiği etiket mutabakattan sağ çıkar; `inject()` de
            "etiket zaten var" kontrolüne takılıp ikinci kez eklemez.
            `data-disable-auto-track`: sayfa görüntülemeyi rota kalıbıyla
            (`/dusuk/[il]` gibi) Analytics bileşeni bildirir, çifte sayım olmaz. */}
        <script
          defer
          src="/_vercel/insights/script.js"
          data-sdkn="@vercel/analytics/next"
          data-disable-auto-track="1"
        />
        <Analytics />
      </body>
    </html>
  );
}
