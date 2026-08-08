import type { Metadata } from "next";
import Link from "next/link";
import { AFETLER, METIN_SINIFI } from "@/lib/afet";
import { AfetIkonu, KAPAK_GORSELI } from "@/components/AfetCizim";
import SayfaKabugu from "@/components/SayfaKabugu";

export const metadata: Metadata = {
  title: "Afet anı — şu an ne yapmalıyım?",
  description:
    "Deprem, yangın, sel, KBRN, heyelan, çığ, fırtına ve aşırı sıcakta " +
    "o anda yapılacaklar. JavaScript gerekmez, çevrimdışı çalışır.",
};

/**
 * AFET ANI — ürünün en kritik ekranı.
 *
 * ── NEDEN AKORDEON DEĞİL IZGARA (2026-08-08, İlyas'ın itirazı) ──
 * Önce dokuz afet açılır-kapanır `<details>` olarak dizilmişti. İlyas
 * haklı olarak "sayfalarda alt alta açılan menüler" dedi: panikteki insan
 * önce doğru kartı bulup sonra açmak zorunda kalıyordu ve ekranda hiçbir
 * görsel yoktu. Artık kapak görselli kart ızgarası — afetini GÖREREK
 * seçiyorsun, tıklayınca doğrudan adımlara gidiyorsun.
 *
 * ── DEĞİŞMEYEN İLKELER ──
 *  • SIFIR JAVASCRIPT. Izgara saf CSS grid, kartlar düz bağlantı.
 *  • Tamamen SSG + servis çalışanı kabuğunda: ağsız açılır.
 *  • Dokunma hedefi ≥44 px, gövde 17 px, hareket yok (panikte animasyon yok).
 */
export default function AfetAniSayfasi() {
  return (
    <SayfaKabugu aktif="/afet-ani">
      <>
        {/* ── Giriş + acil numaralar yan yana (geniş ekranda) ── */}
        <section className="grid gap-6 pt-8 lg:grid-cols-[1fr_20rem]">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Şu an ne yapmalıyım?
            </h1>
            <p className="mt-3 max-w-[60ch] text-metin-2">
              Afetini seç, ilk hareketleri sırayla oku. Bu sayfa{" "}
              <strong className="text-metin">internet olmadan da</strong> açılır
              ve JavaScript gerektirmez — şebeke çökse bile telefonunda durur.
            </p>
          </div>

          {/* TEK NUMARA: Türkiye'de 112 bütün acil çağrıları karşılıyor.
              Önce yanında AFAD 122 de duruyordu; ikisini ayrı göstermek hem
              eski hem panik anında bir saniye düşündürüyordu (İlyas). */}
          <a
            href="tel:112"
            className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl bg-kritik/15 ring-1 ring-kritik/50 transition-colors duration-200 hover:bg-kritik/25 lg:self-end"
          >
            <span className="text-5xl font-semibold tabular-nums text-kritik">
              112
            </span>
            <span className="mt-1 text-sm text-metin-2">
              Acil çağrı — her afet için
            </span>
          </a>
        </section>

        {/* ── Afet türü olmadan geçerli üç kural ── */}
        <section className="mt-8 rounded-2xl border border-cizgi bg-zemin-2 p-6">
          <h2 className="text-lg font-semibold">Hangi afet olursa olsun</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              [
                "Kendi güvenliğin önce gelir",
                "Kendini riske atan kişi kurtarılacak ikinci kişi olur. Yardım etmenin ilk şartı ayakta kalmaktır.",
              ],
              [
                "Doğrulanmış bilgiyi dinle",
                "AFAD, valilik ve 112. Sosyal medyadaki kaynaksız bilgiye göre hareket etme, yaymadan önce doğrula.",
              ],
              [
                "Şebekeyi meşgul etme",
                "Konuşma yerine kısa mesaj gönder; hatlar tıkalıyken metin daha çok geçer. Telefonun şarjını koru.",
              ],
            ].map(([baslik, metin], sira) => (
              <li key={baslik} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zemin-3 text-sm font-semibold tabular-nums"
                >
                  {sira + 1}
                </span>
                <span>
                  <strong className="block text-metin">{baslik}</strong>
                  <span className="mt-1 block text-sm text-metin-2">{metin}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Afet ızgarası: kapak görselli kartlar ── */}
        <h2 className="mt-12 text-2xl font-semibold">Afetini seç</h2>
        <p className="mt-2 text-metin-2">
          Her kart o afetin ilk hareketini söylüyor; tıklayınca adımlara,
          öncesine ve sonrasına gidersin.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AFETLER.map((afet) => {
            const kapak = KAPAK_GORSELI[afet.slug];
            return (
              <Link
                key={afet.slug}
                href={`/afet/${afet.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-cizgi bg-zemin-2 transition-colors duration-200 hover:border-vurgu"
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-zemin">
                  {kapak ? (
                    <img
                      src={`/cizim/${kapak}`}
                      alt=""
                      aria-hidden
                      width={1200}
                      height={800}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={`flex h-full w-full items-center justify-center ${METIN_SINIFI[afet.renk]}`}
                    >
                      <AfetIkonu slug={afet.slug} boyut={64} />
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <span className="flex items-center gap-2.5">
                    <span className={`shrink-0 ${METIN_SINIFI[afet.renk]}`}>
                      <AfetIkonu slug={afet.slug} boyut={22} />
                    </span>
                    <span className="text-lg font-semibold text-metin">
                      {afet.ad}
                    </span>
                  </span>
                  <span className={`text-sm font-medium ${METIN_SINIFI[afet.renk]}`}>
                    {afet.ozet}
                  </span>
                  <span className="mt-auto pt-3 text-sm text-metin-3 group-hover:text-vurgu">
                    {afet.anAdimlari.length} adım · öncesi ve sonrası →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Sonrası ── */}
        <section className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-cizgi bg-zemin-2 p-6">
            <h2 className="text-lg font-semibold">Afet geçtikten sonra</h2>
            <p className="mt-2 text-sm text-metin-2">
              En yakın toplanma alanını{" "}
              <Link href="/" className="text-vurgu underline">
                haritadan
              </Link>{" "}
              bulabilirsin; internet yoksa{" "}
              <Link href="/dusuk" className="text-vurgu underline">
                metin sürümü
              </Link>{" "}
              haritasız çalışır.
            </p>
          </div>
          <div className="rounded-2xl border border-cizgi bg-zemin-2 p-6">
            <h2 className="text-lg font-semibold">Bu iş bitmeden önce</h2>
            <p className="mt-2 text-sm text-metin-2">
              Hazırlık afet anında düşünmek zorunda kalmamaktır:{" "}
              <Link href="/hazirlik" className="text-vurgu underline">
                afet çantası ve aile buluşma planı
              </Link>
              . Yaygın yanlışlar için{" "}
              <Link href="/mitler" className="text-vurgu underline">
                doğru bilinen yanlışlar
              </Link>
              .
            </p>
          </div>
        </section>

      </>
    </SayfaKabugu>
  );
}
