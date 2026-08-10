/**
 * GeoGow servis çalışanı — çevrimdışı çekirdek.
 *
 * İLKE: afet anında şebeke ilk çöken şeydir. Toplanma alanı verisi ve
 * uygulama kabuğu bir kez indikten sonra AĞSIZ çalışmak zorundadır.
 *
 * Üç ayrı önbellek, üç ayrı strateji:
 *   KABUK — uygulama iskeleti: önce ağ, düşerse önbellek (dağıtım sonrası
 *           kullanıcı eski sürümde kalmasın)
 *   VERI  — toplanma alanı dosyaları: önce ağ, düşerse önbellek + bayat
 *           olduğunu sayfaya BİLDİR (sessizce eski veri göstermek yanlış)
 *   KARO  — harita karoları: önce önbellek (değişmezler), sınırlı sayıda
 */

const SURUM = "geogow-v5";
const KABUK = `${SURUM}-kabuk`;
const KARO = `${SURUM}-karo`;

/**
 * ⚠️ VERİ ÖNBELLEĞİ BİLEREK SÜRÜMSÜZ.
 *
 * v1→v2 geçişinde kullanıcının "ilimi çevrimdışı kaydet" ile sakladığı
 * dosyalar sürüm adı değiştiği için silinmişti: kişi bir daha çevrimiçi
 * olana kadar kaydettiği ili kaybediyordu — yani tam da çevrimdışı
 * kalınca lazım olan şey, bir uygulama güncellemesi yüzünden gidiyordu.
 * Kabuk ve karo sürümle birlikte tazelenir (kod değişince eski HTML
 * kalmasın), veri kalır. Şema değişirse burası ELLE `geogow-veri-2`
 * yapılır; sürüm numarasına bağlanmaz.
 */
const VERI = "geogow-veri";

/** Karo önbelleği sınırsız büyümemeli — telefon deposu dolmasın. */
const KARO_SINIRI = 700;
const VERI_SINIRI = 120;

/**
 * Kurulumda peşin indirilen sayfalar.
 *
 * Davranış içeriği (`/afet-ani` ve 9 afet sayfası) bilerek buradadır: bu
 * sayfaların var olma sebebi tam olarak şebekenin çöktüğü andır. Ziyaretçi
 * onlara hiç uğramamış olsa bile deprem gecesi açabilmeli. Toplam maliyet
 * birkaç yüz KB statik HTML — bu ürün için doğru takas.
 */
const KABUK_YOLLARI = [
  /*
   * 🔑 SADE SÜRÜM LİSTENİN BAŞINDA — bilerek.
   *
   * Kurulum sırasında ağ kopar ya da kota dolarsa liste sonundakiler
   * yazılamaz. O yüzden en dayanıklı yüzey en başta olmalı: sade sayfalar
   * görselsiz ve JavaScript'siz, yani kabuğa girmesi en ucuz ve afet anında
   * çalışması en garantili olan onlar. Zengin sürüm arkalarından gelir.
   */
  "/dusuk",
  "/dusuk/afet",
  "/dusuk/hazirlik",
  "/dusuk/afet/deprem",
  "/dusuk/afet/bina-yangini",
  "/dusuk/afet/orman-yangini",
  "/dusuk/afet/sel",
  "/dusuk/afet/kbrn",
  "/dusuk/afet/heyelan",
  "/dusuk/afet/cig",
  "/dusuk/afet/firtina",
  "/dusuk/afet/asiri-sicak",

  "/",
  "/kapsam",
  "/hakkinda",
  "/afet-ani",
  "/hazirlik",
  "/mitler",
  "/afet/deprem",
  "/afet/bina-yangini",
  "/afet/orman-yangini",
  "/afet/sel",
  "/afet/kbrn",
  "/afet/heyelan",
  "/afet/cig",
  "/afet/firtina",
  "/afet/asiri-sicak",
  // Anlatım görselleri: davranış bilgisinin yarısı bunlarda. Sayfası
  // çevrimdışı açılıp görseli gelmezse geriye boş çerçeve kalır.
  // Toplam ~420 KB — kabuk sayfalarıyla birlikte tek seferlik maliyet.
  //
  // ⚠️ Bilerek PNG: bu liste ÇEVRİMDIŞI yedeği, çevrimiçi sunulan dosya
  // değil. Çevrimiçi tarayıcı `<picture>` üzerinden AVIF'i alır (%46 küçük);
  // ağ yokken `gorselYedegi()` istenen varyantı buradaki PNG'den karşılar.
  // Üç varyantı birden peşin indirmek tek seferlik maliyeti ikiye katlardı.
  "/cizim/cok-kapan-tutun.png",
  "/cizim/duman-altinda.png",
  "/cizim/orman-yangini.png",
  "/cizim/kbrn-iceride-kal.png",
  "/cizim/heyelan.png",
  "/cizim/cig.png",
  "/cizim/firtina.png",
  "/cizim/asiri-sicak.png",
  "/cizim/canta-bos.png",
  "/cizim/canta-yarim.png",
  "/cizim/canta-dolu.png",
];

self.addEventListener("install", (olay) => {
  olay.waitUntil(
    (async () => {
      const onbellek = await caches.open(KABUK);
      // ⚠️ `addAll` ATOMİKTİR: yollardan biri düşerse HİÇBİRİ yazılmaz ve
      // çevrimdışı çekirdek tamamen boş kalırdı. Tek tek eklenir ki bir
      // sayfanın düşmesi diğerlerini götürmesin — özellikle listenin
      // başındaki sade sürüm her hâlükârda yazılabilsin.
      const sonuclar = await Promise.allSettled(
        KABUK_YOLLARI.map((yol) => onbellek.add(yol))
      );
      const dusen = KABUK_YOLLARI.filter((_, i) => sonuclar[i].status === "rejected");
      if (dusen.length) console.warn("[sw] kabuk önbelleğine alınamadı:", dusen);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    caches
      .keys()
      .then((adlar) =>
        Promise.all(
          adlar
            // ⚠️ `endsWith` yerine önek karşılaştırması: eski sürüm adları
            // yeni sürümün alt dizesi olabiliyor (yangın projesinin dersi).
            // VERİ önbelleği sürümsüzdür ve BU SÜPÜRMEDEN MUAFTIR — yoksa
            // her sürümde kullanıcının kaydettiği il silinir.
            .filter(
              (ad) =>
                ad.startsWith("geogow-") && ad !== VERI && !ad.startsWith(SURUM)
            )
            .map((ad) => caches.delete(ad))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Önbelleği sınırda tut: en eski girdiler düşer. */
async function budala(onbellekAdi, sinir) {
  const onbellek = await caches.open(onbellekAdi);
  const anahtarlar = await onbellek.keys();
  if (anahtarlar.length <= sinir) return;
  for (const anahtar of anahtarlar.slice(0, anahtarlar.length - sinir)) {
    await onbellek.delete(anahtar);
  }
}

function karoMu(url) {
  return url.hostname.endsWith("basemaps.cartocdn.com");
}

function veriMi(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/data/");
}

/**
 * ÇEVRİMDIŞI GÖRSEL YEDEĞİ — varyantlar arası geçiş.
 *
 * Görseller `<picture>` ile AVIF → WebP → PNG sırasıyla sunuluyor, yani
 * modern tarayıcı `/cizim/heyelan.avif` ister. Kabuk önbelleğinde ise
 * yalnız PNG var: üç varyantı birden peşin indirmek çevrimdışı çekirdeğin
 * tek seferlik maliyetini iki katına çıkarırdı ve bu ürünün hedefi kötü
 * bağlantı.
 *
 * Bu yüzden çevrimdışıyken istenen varyant bulunamazsa kardeş dosyalar
 * denenir. PNG gövdesini `.avif` isteğine cevap olarak vermek güvenlidir:
 * `<source type="image/avif">` yalnız SEÇİM için kullanılır, tarayıcı
 * gelen baytların türünü kendi tanır. Alternatif, kırık görsel çerçevesi
 * göstermekti.
 */
const GORSEL_UZANTILARI = [".avif", ".webp", ".png"];

async function gorselYedegi(url) {
  const nokta = url.pathname.lastIndexOf(".");
  if (nokta === -1) return null;
  const taban = url.pathname.slice(0, nokta);
  for (const uzanti of GORSEL_UZANTILARI) {
    const kayitli = await caches.match(taban + uzanti);
    if (kayitli) return kayitli;
  }
  return null;
}

self.addEventListener("fetch", (olay) => {
  const istek = olay.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);

  /* ── Harita karoları: önce önbellek ── */
  if (karoMu(url)) {
    olay.respondWith(
      caches.open(KARO).then(async (onbellek) => {
        const kayitli = await onbellek.match(istek);
        if (kayitli) return kayitli;
        try {
          const yanit = await fetch(istek);
          if (yanit.ok) {
            await onbellek.put(istek, yanit.clone());
            budala(KARO, KARO_SINIRI);
          }
          return yanit;
        } catch {
          // Karo yoksa harita boş kalır ama uygulama çalışmaya devam eder.
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  /* ── Veri dosyaları: önce ağ, düşerse önbellek (bayat olduğunu söyleyerek) ── */
  if (veriMi(url)) {
    olay.respondWith(
      (async () => {
        const onbellek = await caches.open(VERI);
        try {
          const yanit = await fetch(istek);
          if (yanit.ok) {
            await onbellek.put(istek, yanit.clone());
            budala(VERI, VERI_SINIRI);
          }
          return yanit;
        } catch {
          const kayitli = await onbellek.match(istek);
          if (!kayitli) throw new Error("veri yok");
          // Sayfa bunu okuyup kullanıcıya "çevrimdışısın" diyebilsin.
          const govde = await kayitli.blob();
          return new Response(govde, {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-geogow-cevrimdisi": "1",
            },
          });
        }
      })()
    );
    return;
  }

  /* ── Sayfalar ve varlıklar: önce ağ, düşerse önbellek ── */
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // canlı uçlar önbelleklenmez

  olay.respondWith(
    (async () => {
      try {
        const yanit = await fetch(istek);
        if (yanit.ok && istek.destination !== "") {
          const onbellek = await caches.open(KABUK);
          await onbellek.put(istek, yanit.clone());
        }
        return yanit;
      } catch {
        const kayitli = await caches.match(istek);
        if (kayitli) return kayitli;
        if (url.pathname.startsWith("/cizim/")) {
          const yedek = await gorselYedegi(url);
          if (yedek) return yedek;
        }
        if (istek.mode === "navigate") {
          const kok = await caches.match("/");
          if (kok) return kok;
        }
        throw new Error("çevrimdışı ve önbellekte yok");
      }
    })()
  );
});

/**
 * "İlimi çevrimdışı kaydet" — sayfa hangi dosyaların saklanacağını söyler,
 * SW indirir ve GERÇEK boyutu geri bildirir. Kullanıcıya tahmini değil
 * ölçülmüş MB gösterilir.
 */
self.addEventListener("message", (olay) => {
  const veri = olay.data;
  if (!veri || veri.tip !== "il-kaydet") return;

  olay.waitUntil(
    (async () => {
      const onbellek = await caches.open(VERI);
      let bayt = 0;
      let basarili = 0;
      for (const yol of veri.yollar ?? []) {
        try {
          const yanit = await fetch(yol, { cache: "reload" });
          if (!yanit.ok) continue;
          const kopya = yanit.clone();
          await onbellek.put(yol, yanit);
          bayt += (await kopya.blob()).size;
          basarili++;
        } catch {
          /* tek dosya düşerse diğerleri devam etsin */
        }
      }
      olay.source?.postMessage({ tip: "il-kaydedildi", bayt, basarili });
    })()
  );
});
