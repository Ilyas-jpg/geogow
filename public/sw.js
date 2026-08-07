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

const SURUM = "geogow-v1";
const KABUK = `${SURUM}-kabuk`;
const VERI = `${SURUM}-veri`;
const KARO = `${SURUM}-karo`;

/** Karo önbelleği sınırsız büyümemeli — telefon deposu dolmasın. */
const KARO_SINIRI = 700;
const VERI_SINIRI = 120;

const KABUK_YOLLARI = ["/", "/dusuk", "/kapsam", "/hakkinda"];

self.addEventListener("install", (olay) => {
  olay.waitUntil(
    caches
      .open(KABUK)
      .then((onbellek) => onbellek.addAll(KABUK_YOLLARI))
      .catch(() => {
        /* Kurulumda bir yol düşerse SW yine de kurulsun. */
      })
      .then(() => self.skipWaiting())
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
            .filter((ad) => ad.startsWith("geogow-") && !ad.startsWith(SURUM))
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
