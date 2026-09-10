import Link from "next/link";

/**
 * SADE SÜRÜM KABUĞU — /dusuk altındaki her sayfanın üstündeki metin çubuğu.
 *
 * ── NEDEN VAR (critique 2026-09-10, P1) ──
 * Sade sayfaların başlığı yoktu: telefonda /dusuk'a düşen kişi haritaya
 * dönmek için 68 il satırının altındaki tek bağlantıya kadar (4.449 px)
 * kaydırmak zorundaydı ve sitenin geri kalanına yol yoktu. Üst menü buraya
 * bilerek alınmadı: wordmark görsel, menü daha ağır — bu yüzey görselsiz ve
 * JavaScript'siz kalır. Dört düz bağlantı, tek satır, kabuk önbelleğinde.
 *
 * Sunucu bileşeni: istemci kodu yok, `<Link>` düz `<a>` olarak iner.
 */
export default function SadeDuzen({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-cizgi bg-zemin-2">
        <nav
          aria-label="Sade sürüm menüsü"
          className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 px-4 text-sm"
        >
          <Link
            href="/dusuk"
            className="inline-flex min-h-[44px] items-center font-semibold text-metin"
          >
            {/* Kısa: mobil gövde 17 px, "sade sürüm" ile satır 390 px'i aşıp
                ikinci satıra sarıyordu (ölçüldü: 88 px başlık). */}
            GeoGow · sade
          </Link>
          <Link href="/dusuk/afet" className="baglanti inline-flex min-h-[44px] items-center">
            Afet anı
          </Link>
          <Link href="/dusuk/hazirlik" className="baglanti inline-flex min-h-[44px] items-center">
            Hazırlık
          </Link>
          {/* "Harita": ana menüyle aynı ad; uzun etiket 390 px'te ikinci satıra sarıyordu. */}
          <Link href="/" className="baglanti ml-auto inline-flex min-h-[44px] items-center">
            Harita
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
