/**
 * AFAD deprem verisi — saf ayrıştırma ve sunum kuralları.
 *
 * Uç (ölçüldü 2026-08-06, 200 dönüyor):
 *   servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter
 * ⚠️ `deprem.afad.gov.tr` üzerinden gitmek yönlendirmede takılıyor
 *    ([[reference_izmir_acil_bot]] dersi) — doğrudan servisnet kullanılır.
 * ⚠️ Servisin `date` alanı UTC'dir; yerel saate çevirmeden göstermek
 *    depremi 3 saat önce olmuş gibi gösterir.
 */

export type HamDeprem = {
  eventID: string;
  location: string;
  latitude: string;
  longitude: string;
  depth: string;
  type: string;
  magnitude: string;
  country: string;
  province: string;
  district: string;
  neighborhood: string;
  date: string;
  isEventUpdate?: boolean;
  lastUpdateDate?: string;
};

export type Deprem = {
  id: string;
  buyukluk: number;
  tur: string;
  derinlikKm: number;
  enlem: number;
  boylam: number;
  yer: string;
  il: string | null;
  ilce: string | null;
  /** UTC ISO — gösterim yerel saatte yapılır. */
  zaman: string;
  guncellendi: boolean;
  /** Hangi kurum bildirdi (uçta doldurulur). */
  kaynak?: "AFAD" | "KOERI";
  /** Aynı deprem için diğer kurumun büyüklüğü — farklıysa gizlenmez. */
  kandilliBuyukluk?: number | null;
};

/** Servis yanıtındaki bir kaydı ürün tipine çevirir; bozuksa null. */
export function depremCevir(ham: HamDeprem): Deprem | null {
  const enlem = Number(ham?.latitude);
  const boylam = Number(ham?.longitude);
  const buyukluk = Number(ham?.magnitude);
  if (!Number.isFinite(enlem) || !Number.isFinite(boylam) || !Number.isFinite(buyukluk))
    return null;
  if (!ham.date) return null;

  return {
    id: String(ham.eventID),
    buyukluk,
    tur: (ham.type ?? "").trim() || "ML",
    derinlikKm: Number(ham.depth) || 0,
    enlem,
    boylam,
    yer: (ham.location ?? "").trim(),
    il: (ham.province ?? "").trim() || null,
    ilce: (ham.district ?? "").trim() || null,
    // Servis "2023-02-06T10:24:47" verir ve bu UTC'dir.
    zaman: ham.date.endsWith("Z") ? ham.date : `${ham.date}Z`,
    guncellendi: Boolean(ham.isEventUpdate),
  };
}

export function depremleriCevir(gelen: unknown): Deprem[] {
  if (!Array.isArray(gelen)) return [];
  return gelen
    .map((h) => depremCevir(h as HamDeprem))
    .filter((d): d is Deprem => d !== null)
    .sort((a, b) => Date.parse(b.zaman) - Date.parse(a.zaman));
}

/**
 * Haritadaki daire yarıçapı (piksel). Büyüklük logaritmik bir ölçek olduğu
 * için yarıçap da öyle davranmalı: M3 ile M7 arasındaki fark göze çarpmalı
 * ama M7 ekranı yutmamalı.
 */
export function depremYaricapi(buyukluk: number): number {
  const b = Math.max(0, Math.min(9, buyukluk));
  return Math.round((3 + Math.pow(1.55, b) * 0.55) * 10) / 10;
}

/** 4 anlam rengi kuralı: yalnız üç eşik, dördüncüsü eklenmeyecek. */
export function depremRengi(buyukluk: number): string {
  if (buyukluk >= 5) return "#ff5d5d"; // kritik
  if (buyukluk >= 4) return "#f2a33c"; // uyarı
  return "#8b93a1"; // nötr
}

/** "3 dk önce" · "2 sa önce" · "12 Ağu 04:31" */
export function zamanYazisi(zamanIso: string, simdi = Date.now()): string {
  const fark = simdi - Date.parse(zamanIso);
  if (!Number.isFinite(fark)) return "";
  const dk = Math.round(fark / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.round(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return new Date(zamanIso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sorgu penceresi: AFAD `start`/`end` ister, biçim "YYYY-MM-DD HH:mm:ss" (UTC). */
export function pencere(saat: number, simdi = Date.now()): { start: string; end: string } {
  const bicim = (t: number) => new Date(t).toISOString().slice(0, 19).replace("T", " ");
  return { start: bicim(simdi - saat * 3600_000), end: bicim(simdi + 60_000) };
}

/**
 * 🔴 AFAD `limit`'i SIRALAMADAN ÖNCE uyguluyor.
 *
 * Ölçüldü (2026-08-07): 24 saatlik pencere + `orderby=timedesc&limit=8`
 * → dönen 8 kayıt günün **en ESKİ** depremleri (00:01–01:51), en yenisi
 * 09:24 olmasına rağmen. Yani `orderby` sonucu değil yalnız sunum sırasını
 * etkiliyor.
 *
 * Bunun bedeli tam da ürünün var olma sebebinde ortaya çıkardı: artçı
 * serisinde 24 saatte binlerce kayıt olur, tek istekte limit'e takılırız ve
 * **en eski 500 depremi gösterip devam eden seriyi kaçırırdık** — üstelik
 * sessizce, hiçbir hata vermeden.
 *
 * Çözüm: pencereyi dilimlere böl, her dilimi ayrı sor. Bir dilim limite
 * dayanırsa o dilim daha da bölünür (çağıran tarafın işi).
 */
export function dilimler(
  saat: number,
  simdi = Date.now(),
  parcaSaat = 3
): { start: string; end: string }[] {
  const bicim = (t: number) => new Date(t).toISOString().slice(0, 19).replace("T", " ");
  const bitis = simdi + 60_000;
  const baslangic = simdi - saat * 3600_000;
  const adim = parcaSaat * 3600_000;
  const liste: { start: string; end: string }[] = [];
  for (let t = bitis; t > baslangic; t -= adim) {
    const dilimBasi = Math.max(baslangic, t - adim);
    // ⚠️ Son dilim, ileriye eklenen 1 dakikalık pay yüzünden dakikalık bir
    // artığa dönüşebiliyordu — her çağrıda boşa giden bir ağ isteği. Kısa
    // artık, bir önceki dilimin içine katılır.
    const oncekiler = liste[liste.length - 1];
    if (oncekiler && t - dilimBasi < adim * 0.1) {
      oncekiler.start = bicim(dilimBasi);
      break;
    }
    liste.push({ start: bicim(dilimBasi), end: bicim(t) });
  }
  return liste; // en yeni dilim başta
}

/** Aynı depremi iki kez göstermemek için kimliğe göre birleştirir. */
export function birlestir(...gruplar: Deprem[][]): Deprem[] {
  const harita = new Map<string, Deprem>();
  for (const grup of gruplar) {
    for (const d of grup) if (!harita.has(d.id)) harita.set(d.id, d);
  }
  return [...harita.values()].sort((a, b) => Date.parse(b.zaman) - Date.parse(a.zaman));
}
