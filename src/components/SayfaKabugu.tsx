import Link from "next/link";
import UstMenu from "./UstMenu";

/**
 * SAYFA KABUĞU — tüm içerik sayfalarının ortak çerçevesi.
 *
 * ── NEDEN VAR ──
 * Her sayfa kendi `max-w-2xl` (672 px) kabuğunu taşıyordu. 1530 px ekranda
 * bu, ortada duran dar bir şerit demek; İlyas'ın tarifi: "masaüstünde
 * özensiz bir mobil pencereymiş gibi". Tasarım anayasası md.3 container
 * ~1200 px ve "dolu + dengeli" diyor, aşırı whitespace istemiyor.
 *
 * Genişlik TEK yerde tanımlı: bir daha sayfa sayfa değiştirilmeyecek.
 */

/** Okuma kolonu — uzun düz metin için. 75 karakteri geçmez (anayasa md.3). */
export const OKUMA_GENISLIGI = "max-w-[68ch]";

export default function SayfaKabugu({
  aktif,
  children,
  /** Tam genişlik gerektiren sayfalar (harita) kabuğu kendisi yönetir. */
  genis = false,
  /**
   * Bu sayfanın sade (metin) karşılığı. Verilirse içeriğin üstünde geçiş
   * bağlantısı çıkar.
   *
   * Neden üstte: bağlantının işe yaradığı an, sayfanın AĞIR geldiği andır.
   * Dibe koyarsak zaten yüklenmesini bekleyemeyen kullanıcı onu hiç görmez.
   */
  sadeYol,
}: {
  aktif?: string;
  children: React.ReactNode;
  genis?: boolean;
  sadeYol?: string;
}) {
  return (
    <>
      <UstMenu aktif={aktif} />
      <main
        id="icerik"
        className={
          genis
            ? "w-full"
            : "mx-auto w-full max-w-[1180px] px-5 pb-24 sm:px-6 lg:px-8"
        }
      >
        {sadeYol && (
          <p className="yazdirma-gizle pt-3 text-sm text-metin-3">
            Yavaş bağlantı mı?{" "}
            <Link href={sadeYol} className="text-vurgu underline">
              Sade sürüme geç
            </Link>{" "}
            — görselsiz, JavaScript gerektirmez.
          </p>
        )}
        {children}
      </main>
      <SayfaAltligi />
    </>
  );
}

/**
 * Ortak alt bilgi. Her sayfanın dibinde farklı bir bağlantı listesi vardı;
 * tek yerde toplandı. Sorumluluk uyarısı her yüzeyde görünür olmalı
 * (marka anayasası §4).
 */
function SayfaAltligi() {
  return (
    <footer className="yazdirma-gizle mt-16 border-t border-cizgi bg-zemin-2">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <img
            src="/marka/geogow-wordmark.png"
            alt="GeoGow"
            width={172}
            height={36}
            className="h-[26px] w-auto"
          />
          <p className="mt-3 max-w-[34ch] text-sm text-metin-2">
            Deprem, yangın ve selde nereye gideceğini ve ne yapacağını gösteren
            kamu yararına açık kaynak proje.
          </p>
        </div>

        <nav aria-label="Sayfalar">
          <h2 className="text-sm font-semibold text-metin">Sayfalar</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-metin-2">
            {[
              ["/", "Toplanma alanı haritası"],
              ["/afet-ani", "Afet anı"],
              ["/hazirlik", "Hazırlık"],
              ["/mitler", "Doğru bilinen yanlışlar"],
              /* Katalog giriş noktası — tek belgeye değil rafın tamamına
                 götürür, kullanıcı ne olduğunu görüp seçsin. */
              ["/printables", "Basılabilir malzemeler"],
              ["/dusuk", "Sade sürüm"],
            ].map(([yol, ad]) => (
              <li key={yol}>
                <a href={yol} className="hover:text-metin">
                  {ad}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-metin">Kaynak ve sınırlar</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-metin-2">
            <li>
              <a href="/hakkinda" className="hover:text-metin">
                Hakkında ve kaynaklar
              </a>
            </li>
            <li>
              <a href="/kapsam" className="hover:text-metin">
                Veri kapsamı
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Ilyas-jpg/geogow"
                className="hover:text-metin"
                rel="noopener noreferrer"
                target="_blank"
              >
                Kaynak kodu (AGPL-3.0)
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cizgi">
        <p className="mx-auto max-w-[1180px] px-5 py-4 text-xs text-metin-3 sm:px-6 lg:px-8">
          Bilgilendirme amaçlıdır,{" "}
          <strong className="text-metin-2">resmî uyarının yerine geçmez</strong>.
          Acil durumda <strong className="text-metin-2">112</strong>.
        </p>
      </div>
    </footer>
  );
}
