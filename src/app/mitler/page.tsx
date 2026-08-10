import type { Metadata } from "next";
import Link from "next/link";
import { afetBul, METIN_SINIFI, tumMitler } from "@/lib/afet";
import { AfetIkonu } from "@/components/AfetCizim";
import SayfaKabugu from "@/components/SayfaKabugu";
import Gorsel from "@/components/Gorsel";

export const metadata: Metadata = {
  title: "Doğru bilinen yanlışlar — hayat üçgeni, kapı eşiği ve diğerleri",
  description:
    "“Hayat üçgeni” neden yanlış, doğrusu neden Çök-Kapan-Tutun? Depremde, " +
    "yangında ve selde yaygın yanlışların kaynaklarıyla düzeltilmesi.",
  alternates: { canonical: "/mitler" },
};

/**
 * MİTLER — ürünün en yüksek etkili tek sayfası.
 *
 * Gerekçe: «hayat üçgeni» Türkiye'de hâlâ yaygın paylaşılıyor ve
 * uygulanması hâlinde insanı sarsıntı sırasında korumasız bırakıyor. Bu
 * sayfanın işi tartışmayı yumuşatmak değil, kanıtla POZİSYON ALMAK.
 *
 * Dürüstlük kuralı burada özellikle geçerli: AFAD'ın resmî tatbikatı
 * Çök-Kapan-Tutun üzerine kurulu ama kurumun bazı eski sayfalarında hâlâ
 * «hayat üçgeni» geçiyor. Bunu saklamak, kullanıcı o sayfayı bulduğunda
 * bize olan güveni bitirir.
 */
/**
 * MİT BAŞINA GÖRSEL — iki panel: solda yanlış hareket, sağda doğrusu.
 *
 * Kartın metni zaten "YANLIŞ / DOĞRU" ikilisiyle konuşuyor; görsel de aynı
 * dili konuşsun diye hepsi bu kalıpta üretildi. Anahtar mitin `yanlis`
 * cümlesi: mit sırası değişse de eşleşme bozulmaz.
 *
 * ⚠️ Görseli olmayan mit görselsiz kalır. Yakın bir görseli "idare eder"
 * diye koymak, aynı resmi iki mite koymanın başka bir biçimi olurdu.
 */
const MIT_GORSELI: Record<string, { dosya: string; alt: string }> = {
  "Kapı eşiği binanın en sağlam yeridir, oraya geç.": {
    dosya: "mit-kapi-esigi.png",
    alt:
      "Solda yanlış: sallanan kapı kanadının altında, düşen sıva parçalarının " +
      "arasında ayakta duran kişi. Sağda doğru: sağlam masanın altında diz üstü " +
      "çökmüş, başını koruyup masanın ayağını tutan kişi.",
  },
  "Sarsıntı başlar başlamaz binadan dışarı koş.": {
    dosya: "mit-disari-kos.png",
    alt:
      "Solda yanlış: sarsıntı sürerken bina çıkışına koşan kişinin üstüne cephe " +
      "ve cam parçaları düşüyor. Sağda doğru: aynı kişi bulunduğu odada masanın " +
      "altında çök-kapan-tutun yapıyor.",
  },
  "Yangında hızlıca asansöre binip inmek en hızlı kaçış.": {
    dosya: "mit-asansor.png",
    alt:
      "Solda yanlış: dumanın baca gibi yükseldiği asansör boşluğunda kabine " +
      "binen kişi. Sağda doğru: ağzını burnunu kapatmış, eğilerek merdivenden " +
      "inen kişi; duman tavanda kalıyor.",
  },
  "Alev büyürse pencereden atlarım.": {
    dosya: "mit-pencere-atlama.png",
    alt:
      "Solda yanlış: üst kattaki pencereden boşluğa atlayan kişi. Sağda doğru: " +
      "kapı altı bezle tıkanmış odada, pencereden bez sallayarak kendini " +
      "görünür kılan kişi.",
  },
};

export default function MitlerSayfasi() {
  const deprem = afetBul("deprem");
  const hayatUcgeni = deprem?.mitler[0];
  const digerleri = tumMitler().filter((m) => m.yanlis !== hayatUcgeni?.yanlis);

  return (
    <SayfaKabugu aktif="/mitler">
      <header className="pt-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Doğru bilinen yanlışlar
        </h1>
        <p className="mt-3 max-w-[68ch] text-lg text-metin-2">
          Afet bilgisinde yanlış bir alışkanlık, bilgisizlikten daha
          tehlikelidir: kişi doğru olduğuna inandığı şeyi tereddütsüz yapar.
          Aşağıdaki maddelerin her biri kaynağıyla birlikte veriliyor.
        </p>
      </header>

      {/* ── Baş madde: hayat üçgeni ── */}
      {hayatUcgeni && deprem && (
        <article className="mt-8 overflow-hidden rounded-2xl border border-kritik/50 bg-zemin-2">
          <div className="grid lg:grid-cols-[1fr_minmax(0,26rem)]">
            <div className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-kritik">
                En yaygın ve en tehlikeli
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                &ldquo;Hayat üçgeni&rdquo; — masanın altına girmekten daha
                güvenli değildir
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-kritik/40 bg-kritik/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-kritik">
                    Yanlış
                  </p>
                  <p className="mt-1 text-sm text-metin-2">{hayatUcgeni.yanlis}</p>
                </div>
                <div className="rounded-xl border border-guvenli/40 bg-guvenli/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-guvenli">
                    Doğru
                  </p>
                  <p className="mt-1 text-sm text-metin">{hayatUcgeni.dogru}</p>
                </div>
              </div>

              <p className="mt-5 max-w-[68ch] text-metin-2">{hayatUcgeni.neden}</p>

              <p className="mt-5 text-sm">
                <Link href="/afet/deprem" className="text-vurgu underline">
                  Depremde adım adım ne yapılır →
                </Link>
              </p>
              <p className="mt-3 text-xs text-metin-3">
                Kaynaklar:{" "}
                {hayatUcgeni.kaynaklar.map((k) => `${k.kurum} (${k.ad})`).join(" · ")}
              </p>
            </div>

            {/* Doğru hareketin görseli — metni okumadan da görünsün */}
            <div className="order-first bg-zemin lg:order-last">
              <Gorsel
                kaynak="/cizim/cok-kapan-tutun.png"
                alt="Doğru hareket: diz üstü çök, baş ve boynu kapat, masanın altına girip ayağını tut"
                width={1440}
                height={480}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </article>
      )}

      {/* ── Kurum içi çelişki ── */}
      <section className="mt-6 rounded-2xl border border-uyari/40 bg-uyari/10 p-6">
        <h2 className="text-lg font-semibold text-metin">
          Neden kafa karışıklığı var?
        </h2>
        <p className="mt-2 max-w-[80ch] text-metin-2">
          Çünkü resmî kaynakların kendi içinde tam bir tutarlılık yok.
          AFAD&apos;ın 81 ilde yaptığı deprem tatbikatı{" "}
          <strong className="text-metin">Çök–Kapan–Tutun</strong> hareketi
          üzerine kuruludur; buna karşılık kurumun bazı eski sayfalarında hâlâ
          &ldquo;hayat üçgeni&rdquo; ifadesi geçmektedir. Bunu saklamıyoruz — bir
          kurumun eski bir sayfası, uluslararası bilimsel konsensüsü
          değiştirmez. GeoGow bu konuda{" "}
          <strong className="text-metin">
            USGS, FEMA, INSARAG ve Amerikan Kızılhaçı
          </strong>
          &apos;nın ortak duruşunu esas alır.
        </p>
      </section>

      {/* ── Diğer mitler: kart ızgarası ── */}
      <h2 className="mt-12 text-2xl font-semibold">Diğer yaygın yanlışlar</h2>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {digerleri.map((mit) => {
          /* ⚠️ Afetin KAPAK görseli burada KULLANILMAZ: aynı afetin iki miti
             aynı görseli tekrar ediyordu ve tembel duruyordu (İlyas).
             Her mitin KENDİ görseli var; olmayan mit görselsiz kalır, aynı
             resmi iki kez göstermektense hiç göstermemek daha dürüst. */
          const gorsel = MIT_GORSELI[mit.yanlis];
          return (
            <article
              key={mit.yanlis}
              className="flex flex-col overflow-hidden rounded-2xl border border-cizgi bg-zemin-2"
            >
              {gorsel && (
                <Gorsel
                  kaynak={`/cizim/${gorsel.dosya}`}
                  alt={gorsel.alt}
                  width={1200}
                  height={600}
                  className="w-full"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <p
                  className={`flex items-center gap-2 text-sm font-medium ${METIN_SINIFI[mit.afet.renk]}`}
                >
                  <AfetIkonu slug={mit.afet.slug} boyut={18} />
                  {mit.afet.ad}
                </p>

                <p className="mt-3 text-sm">
                  <span className="font-semibold text-kritik">YANLIŞ ·</span>{" "}
                  <span className="text-metin-2">{mit.yanlis}</span>
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-guvenli">DOĞRU ·</span>{" "}
                  <span className="text-metin">{mit.dogru}</span>
                </p>
                <p className="mt-3 text-sm text-metin-2">{mit.neden}</p>

                <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-metin-3">
                  <span>Kaynak: {mit.kaynaklar.map((k) => k.kurum).join(" · ")}</span>
                  <Link
                    href={`/afet/${mit.afet.slug}`}
                    className="text-vurgu underline"
                  >
                    {mit.afet.ad} sayfası
                  </Link>
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-12 rounded-2xl border border-cizgi bg-zemin-2 p-6">
        <h2 className="text-lg font-semibold text-metin">
          Bir bilgiyi paylaşmadan önce
        </h2>
        <ul className="mt-3 grid gap-3 text-metin-2 sm:grid-cols-3">
          <li className="rounded-xl bg-zemin p-4 text-sm">
            Kaynağı bir kurum mu, yoksa &ldquo;bir uzman&rdquo; mı?
          </li>
          <li className="rounded-xl bg-zemin p-4 text-sm">
            Tarihi var mı? Eski bir afetin görüntüsü yeni gibi dolaşıyor olabilir.
          </li>
          <li className="rounded-xl bg-zemin p-4 text-sm">
            AFAD, valilik veya 112 doğruluyor mu? Doğrulamıyorsa paylaşma — afet
            anında yanlış bilgi ekipleri yanlış yere gönderir.
          </li>
        </ul>
      </section>
    </SayfaKabugu>
  );
}
