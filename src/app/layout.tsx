import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"], // latin-ext olmadan ş/ğ/ı düşer
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://geogow.net"),
  title: {
    default: "Geogow — Toplanma alanları ve acil durum haritası",
    template: "%s · Geogow",
  },
  description:
    "Deprem, yangın, sel gibi afetlerde en yakın toplanma alanını gösteren " +
    "ücretsiz harita. AFAD kayıtlı toplanma alanları, çevrimdışı da çalışır.",
  applicationName: "Geogow",
  authors: [{ name: "Algow" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Geogow",
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
      </body>
    </html>
  );
}
