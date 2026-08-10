/**
 * YANGIN (termal anomali) KATMANI — özet.
 *
 * Kaynak: kendi yangın projemizin açık ucu (`yangin.algow.net/api/fires`),
 * o da NASA FIRMS'ten besleniyor. Ölçüldü 2026-08-10: **200 · 248 KB**
 * GeoJSON FeatureCollection, 1.336 nokta.
 *
 * 🔑 NEDEN FIRMS'e DOĞRUDAN GİTMİYORUZ: FIRMS `MAP_KEY` istiyor ve o anahtar
 * yangın projesinde duruyor. Aynı anahtarı ikinci bir projeye kopyalamak,
 * aynı işi iki yerde bakmak demekti. Proje kararı da zaten "özet katman +
 * yangin.algow.net'e derin link, kod kopyalanmaz" idi (2026-08-06).
 *
 * 🔴 BU KATMAN "YANGIN VAR" DEMEZ. FIRMS uydudan **termal anomali** görür;
 * anız, sanayi bacası, güneş yansıması ve ısınmış çıplak kaya da anomali
 * üretir. Üründe "yangın tespit edildi" denmez, "uydu ısı noktası" denir ve
 * doğrulama için yangın sitesine yönlendirilir. Bu, projenin dürüstlük
 * ilkesinin bu katmandaki karşılığıdır.
 */

/**
 * 🔴 TEK DİKDÖRTGEN YETMİYOR — ölçülüp çürütüldü.
 *
 * İlk sürüm Türkiye'yi tek bir kutuyla (25,5–45 D / 35,5–42,5 K) süzüyordu.
 * Ölçüm (2026-08-10, 1.336 noktalık gerçek akış):
 *
 *   tek dikdörtgen           → 965 nokta
 *   il kutularının birleşimi → 415 nokta
 *   farkı oluşturan 550 nokta örnekleri: [44,37 · 35,51] → **Kerkük, Irak**
 *
 * Yani dikdörtgen, komşu ülkedeki yangınları Türkiye haritasına taşıyordu.
 * Bunun yerine ilin KENDİ hasat verisinden türeyen kutuları kullanılıyor
 * (`ozet.json` → `kutu`), birleşimleri ülke sınırına çok daha yakın.
 *
 * ⚠️ SINIRI: kutusu olmayan (henüz hasat edilmemiş) il, katmana katkı
 * vermez — oradaki ısı noktası görünmez. Hasat ilerledikçe kendiliğinden
 * düzelir; elenen nokta sayısı uçta bildirilir, sessizce yutulmaz.
 */
export type IlKutusu = [bati: number, guney: number, dogu: number, kuzey: number];

function kutuIcinde(lon: number, lat: number, kutular: IlKutusu[]): boolean {
  for (const [bati, guney, dogu, kuzey] of kutular) {
    if (lon >= bati && lon <= dogu && lat >= guney && lat <= kuzey) return true;
  }
  return false;
}

export type Isi = {
  /** [boylam, enlem] — 4 basamağa yuvarlanır (~11 m, katman için fazlasıyla yeter). */
  k: [number, number];
  /** Yangın radyatif gücü (MW). Büyüklük göstergesi, "şiddet" değil. */
  guc: number;
  /** Algılama zamanı (ms). */
  zaman: number;
  /** FIRMS güven sınıfı: l/n/h → düşük/nominal/yüksek. */
  guven: "l" | "n" | "h";
};

type HamOzellik = { frp?: number; dt?: number; conf?: string };
type HamNokta = { geometry?: { coordinates?: number[] }; properties?: HamOzellik };

/** FIRMS güven kodları dışında bir şey gelirse nominal sayılır (uydurma sınıf üretme). */
function guvenCevir(ham: string | undefined): Isi["guven"] {
  return ham === "l" || ham === "h" ? ham : "n";
}

/**
 * Ham FeatureCollection'ı katmanın taşıyacağı sade biçime indirir.
 * Ölçüldü: 965 nokta → 55,8 KB (sıkıştırmasız). Katman yalnız AÇILDIĞINDA
 * indiği için bu, kapalı katmanın kullanıcıya maliyeti sıfır demektir.
 */
export function isiNoktalari(
  ham: unknown,
  kutular: IlKutusu[],
  tazelikSaat = 48
): Isi[] {
  const ozellikler = (ham as { features?: HamNokta[] })?.features;
  if (!Array.isArray(ozellikler) || !kutular.length) return [];

  const enEski = Date.now() - tazelikSaat * 3600_000;
  const noktalar: Isi[] = [];

  for (const o of ozellikler) {
    const koord = o?.geometry?.coordinates;
    if (!Array.isArray(koord) || koord.length < 2) continue;
    const [lon, lat] = koord;
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (!kutuIcinde(lon, lat, kutular)) continue;

    const zaman = Number(o?.properties?.dt);
    if (!Number.isFinite(zaman) || zaman < enEski) continue;

    noktalar.push({
      k: [Number(lon.toFixed(4)), Number(lat.toFixed(4))],
      guc: Number(o?.properties?.frp) || 0,
      zaman,
      guven: guvenCevir(o?.properties?.conf),
    });
  }

  // En yeni önce: katman kalabalıklaşırsa kırpma en eskisini atsın.
  noktalar.sort((a, b) => b.zaman - a.zaman);
  return noktalar;
}

/**
 * Nokta yarıçapı — yangın radyatif gücünden (MW) türetilir.
 * Karekök kullanılıyor: güç dağılımı çok çarpık (çoğu nokta küçük, birkaçı
 * çok büyük); doğrusal ölçekte büyük olanlar haritayı kaplar, küçükler
 * görünmezdi.
 */
export function isiYaricapi(guc: number): number {
  const g = Math.max(0, guc);
  return Math.min(14, 3 + Math.sqrt(g) * 0.9);
}
