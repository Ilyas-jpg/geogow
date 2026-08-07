import Link from "next/link";

/**
 * İÇERİK SAYFALARININ ÜST MENÜSÜ.
 *
 * Önceki sürümde her sayfa kendi dip bağlantı listesini taşıyordu: hangi
 * sayfaların var olduğu ancak dibe inince görülüyordu ve sayfadan sayfaya
 * sıra değişiyordu. Tek bileşen, sabit sıra, her sayfada aynı yer.
 *
 * Sıra rastgele değil: acil olan solda. Afet anı > Hazırlık > Mitler.
 *
 * Sunucu bileşeni — JavaScript gerektirmez, `/afet-ani`nin sıfır-JS
 * iddiasını bozmaz.
 */

/** Kısa etiketler bilinçli: uzun adlar mobilde menüyü üç satıra sarıyordu. */
const BAGLANTILAR = [
  { yol: "/", ad: "Harita" },
  { yol: "/afet-ani", ad: "Afet anı" },
  { yol: "/hazirlik", ad: "Hazırlık" },
  { yol: "/mitler", ad: "Yanlışlar" },
  { yol: "/dusuk", ad: "Metin" },
] as const;

export default function UstMenu({ aktif }: { aktif?: string }) {
  /* Yükseklik SABİT ve değişkenden geliyor: altında yapışan ikinci çubuk
     (hazırlık sayfasındaki çanta barı) aynı değeri `top` olarak kullanıyor.
     Serbest bırakılırsa iki çubuk üst üste biner.
     Not: süslü parantezli JSX yorumu `return (` ardında kullanılamaz. */
  return (
    <header className="yazdirma-gizle sticky top-0 z-30 h-[var(--ust-menu-yuksekligi)] border-b border-cizgi bg-zemin/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1180px] items-center gap-x-6 px-6">
        {/* Wordmark yalnız geniş ekranda: mobilde 115 px genişliğiyle menüyü
            üçüncü satıra itiyor ve 127 px'lik yapışkan bir başlık üretiyordu.
            Telefonda "Harita" bağlantısı zaten ana sayfaya götürüyor. */}
        <Link
          href="/"
          className="hidden shrink-0 sm:block"
          aria-label="GeoGow ana sayfa"
        >
          {/* Marka anayasası §5: wordmark bir GÖRSELDİR, metinle dizilmez. */}
          <img
            src="/marka/geogow-wordmark.png"
            alt="GeoGow"
            width={172}
            height={36}
            className="h-[24px] w-auto"
          />
        </Link>

        <nav aria-label="Ana menü" className="min-w-0 flex-1">
          <ul className="flex items-center justify-between gap-x-3 sm:justify-start sm:gap-x-4">
            {BAGLANTILAR.map((b) => {
              const secili = b.yol === aktif;
              return (
                <li key={b.yol}>
                  <Link
                    href={b.yol}
                    aria-current={secili ? "page" : undefined}
                    /* Bulunduğun sayfa yalnız renkle değil alt çizgiyle de
                       belli — renk tek başına bilgi taşımaz. */
                    className={`inline-flex min-h-[36px] items-center border-b-2 text-sm transition-colors duration-200 ${
                      secili
                        ? "border-vurgu font-medium text-metin"
                        : "border-transparent text-metin-2 hover:text-metin"
                    }`}
                  >
                    {b.ad}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
