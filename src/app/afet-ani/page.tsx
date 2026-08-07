import type { Metadata } from "next";
import Link from "next/link";
import { AFETLER, METIN_SINIFI, RENK_SINIFI } from "@/lib/afet";
import { AfetDiyagrami, AfetIkonu } from "@/components/AfetCizim";
import UstMenu from "@/components/UstMenu";

export const metadata: Metadata = {
  title: "Afet anı — şu an ne yapmalıyım?",
  description:
    "Deprem, yangın, sel, KBRN, heyelan, çığ, fırtına ve aşırı sıcakta " +
    "o anda yapılacaklar. Tek ekran, JavaScript gerekmez, çevrimdışı çalışır.",
};

/**
 * AFET ANI — ürünün en kritik ekranı.
 *
 * Tasarım kısıtları, sırayla:
 *  ① SIFIR JAVASCRIPT. Açılır kartlar `<details>` ile yapılır. Afet anında
 *    JS paketi indirilememiş, çökmüş ya da cihaz çok yavaş olabilir; bu
 *    ekranın çalışmama hakkı yok. React state kullanılmaz.
 *  ② TAMAMEN SSG + servis çalışanı kabuğunda. Ağsız açılır.
 *  ③ Titreyen el: dokunma hedefi ≥44 px, gövde 17 px.
 *  ④ Tek birincil eylem yok — burada eylem KULLANICININ durumuna bağlı,
 *    o yüzden ilk ekranda 9 seçenek eşit ağırlıkta durur ve önce
 *    "ilk üç şey" bloğu gelir.
 *  ⑤ Renk tek başına bilgi taşımaz: her kartta metin etiketi de var.
 */
export default function AfetAniSayfasi() {
  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 pb-16">
      <UstMenu aktif="/afet-ani" />
      <h1 className="text-2xl font-semibold">Şu an ne yapmalıyım?</h1>
      <p className="mt-2 text-sm text-metin-2">
        Afetini seç, ilk hareketleri sırayla oku. Bu sayfa{" "}
        <strong className="text-metin">internet olmadan da</strong> açılır ve
        JavaScript gerektirmez.
      </p>

      {/* ── Acil numaralar: her şeyden önce, tıklanabilir ── */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <a
          href="tel:112"
          className="flex min-h-[64px] flex-col items-center justify-center rounded-xl bg-kritik/15 ring-1 ring-kritik/50"
        >
          <span className="text-2xl font-semibold tabular-nums text-kritik">112</span>
          <span className="text-xs text-metin-2">Acil çağrı</span>
        </a>
        <a
          href="tel:122"
          className="flex min-h-[64px] flex-col items-center justify-center rounded-xl bg-uyari/15 ring-1 ring-uyari/50"
        >
          <span className="text-2xl font-semibold tabular-nums text-uyari">122</span>
          <span className="text-xs text-metin-2">AFAD</span>
        </a>
      </div>

      {/* ── Afet türünden bağımsız ilk üç şey ── */}
      <section className="mt-6 rounded-xl border border-cizgi bg-zemin-2 p-4">
        <h2 className="font-semibold text-metin">Hangi afet olursa olsun</h2>
        <ol className="mt-3 space-y-2 text-sm text-metin-2">
          <li>
            <strong className="text-metin">1. Kendi güvenliğin önce gelir.</strong>{" "}
            Kendini riske atan kişi kurtarılacak ikinci kişi olur.
          </li>
          <li>
            <strong className="text-metin">2. Doğrulanmış bilgiyi dinle.</strong>{" "}
            AFAD, valilik ve 112. Sosyal medyadaki kaynaksız bilgiye göre
            hareket etme, yaymadan önce doğrula.
          </li>
          <li>
            <strong className="text-metin">3. Şebekeyi meşgul etme.</strong>{" "}
            Konuşma yerine kısa mesaj gönder; hatlar tıkalıyken metin daha çok
            geçer. Telefonun şarjını koru.
          </li>
        </ol>
      </section>

      {/* ── Afet kartları ── */}
      <h2 className="mt-8 text-lg font-semibold">Afetini seç</h2>
      <div className="mt-3 space-y-3">
        {AFETLER.map((afet) => (
          <details
            key={afet.slug}
            className={`group rounded-xl border bg-zemin-2 ${RENK_SINIFI[afet.renk]}`}
          >
            <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              {/* İkon: dokuz kartı birbirinden ayıran ilk sinyal.
                  Renk tek başına bilgi taşımaz — şekil de ayırt ettiriyor. */}
              <span className={`shrink-0 ${METIN_SINIFI[afet.renk]}`}>
                <AfetIkonu slug={afet.slug} boyut={28} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-metin">
                  {afet.ad}
                </span>
                <span className="mt-0.5 block text-sm text-metin-2">{afet.ozet}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-metin-3">
                <span className="group-open:hidden">Aç</span>
                <span className="hidden group-open:inline">Kapat</span>
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  aria-hidden
                  className="transition-transform duration-200 group-open:rotate-180"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>

            <div className="border-t border-cizgi px-4 py-4">
              {/* Diyagram adımlardan ÖNCE: doğru hareket metni okumadan görünsün. */}
              <div className="mb-4 empty:mb-0">
                <AfetDiyagrami slug={afet.slug} />
              </div>

              <ol className="space-y-4">
                {afet.anAdimlari.map((adim, sira) => (
                  <li key={adim.baslik} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zemin-3 text-sm font-semibold tabular-nums text-metin"
                    >
                      {sira + 1}
                    </span>
                    <span>
                      <strong className="block text-metin">{adim.baslik}</strong>
                      <span className="mt-0.5 block text-sm text-metin-2">
                        {adim.detay}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {afet.varyantlar.length > 0 && (
                <>
                  <h3 className="mt-5 font-semibold text-metin">Ya o an…</h3>
                  <dl className="mt-2 space-y-2 text-sm">
                    {afet.varyantlar.map((v) => (
                      <div key={v.yer} className="rounded-lg bg-zemin p-3">
                        <dt className="font-medium text-metin">{v.yer}</dt>
                        <dd className="text-metin-2">{v.ne}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              <p className="mt-4 text-sm">
                <Link href={`/afet/${afet.slug}`} className="text-vurgu underline">
                  {afet.ad}: öncesi, sonrası ve doğru bilinen yanlışlar
                </Link>
              </p>
            </div>
          </details>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
        <h2 className="text-base font-semibold text-metin">Afet geçtikten sonra</h2>
        <p className="mt-2">
          En yakın toplanma alanını{" "}
          <Link href="/" className="text-vurgu underline">
            haritadan
          </Link>{" "}
          ya da internet yoksa{" "}
          <Link href="/dusuk" className="text-vurgu underline">
            metin sürümünden
          </Link>{" "}
          bulabilirsin. Bu iş bitmeden önce hazırlanmak için{" "}
          <Link href="/hazirlik" className="text-vurgu underline">
            afet çantası ve aile buluşma planı
          </Link>
          .
        </p>
      </section>

      <p className="mt-6 text-xs text-metin-3">
        Bu sayfa bilgilendirme amaçlıdır ve{" "}
        <strong className="text-metin-2">resmî uyarının yerine geçmez</strong>.
        Gerçek acil durumda 112 ve AFAD 122 talimatı esastır. Kaynaklar her afet
        sayfasının altında listelidir.
      </p>
    </main>
  );
}
