/**
 * Coğrafi yardımcılar — TEK KAYNAK.
 *
 * Hem uygulama (tarayıcı) hem hasat betikleri (Node) buradan okur.
 * Node 24 TypeScript'i doğrudan içe aktarabildiği için ikinci bir kopya
 * tutmuyoruz: vault dersi — yangın projesinde aynı kutu beş dosyada ayrı
 * yazılıydı ve biri unutulunca hata SESSİZ oldu (24,9°D batısındaki her olay
 * eksik veri aldı, aylarca fark edilmedi).
 */

export type Konum = { enlem: number; boylam: number };
export type Halka = [number, number][];
export type Geometri = {
  type: "Polygon" | "MultiPolygon" | "Point" | "GeometryCollection" | string;
  coordinates?: unknown;
  /** GeometryCollection üyeleri — AFAD servisi bazı alanları böyle veriyor. */
  geometries?: Geometri[];
};

const DUNYA_YARICAP_M = 6_371_008.8;
const DERECE = Math.PI / 180;

/** GeoJSON koordinatları [boylam, enlem] sırasındadır — karıştırma. */
export function halkalar(geometri: Geometri | null | undefined): Halka[] {
  if (!geometri) return [];
  if (geometri.type === "Polygon") return (geometri.coordinates as Halka[]) ?? [];
  if (geometri.type === "MultiPolygon")
    return ((geometri.coordinates as Halka[][]) ?? []).flat();
  if (geometri.type === "Point") return [[geometri.coordinates as [number, number]]];
  // AFAD servisi bazı alanları GeometryCollection olarak veriyor: geçerli bir
  // poligonun yanında dejenere bir LineString bulunabiliyor (Ankara/Ayrancı
  // "Pablo Neruda Parkı" böyle geldi ve denetim onu "bozuk poligon" sandı).
  if (geometri.type === "GeometryCollection")
    return (geometri.geometries ?? []).flatMap(halkalar);
  return [];
}

/**
 * Haritada çizilebilir tek bir Polygon/MultiPolygon üretir.
 * GeometryCollection içindeki poligon olmayan üyeler (çizgi, nokta) atılır —
 * MapLibre koleksiyonu doğru çizmez, atılan üye de zaten alan taşımaz.
 */
export function poligonlastir(geometri: Geometri | null | undefined): Geometri | null {
  if (!geometri) return null;
  if (geometri.type === "Polygon" || geometri.type === "MultiPolygon") return geometri;
  if (geometri.type !== "GeometryCollection") return null;

  const poligonlar: Halka[][] = [];
  for (const uye of geometri.geometries ?? []) {
    if (uye.type === "Polygon") poligonlar.push(uye.coordinates as Halka[]);
    else if (uye.type === "MultiPolygon")
      poligonlar.push(...((uye.coordinates as Halka[][]) ?? []));
  }
  if (!poligonlar.length) return null;
  return poligonlar.length === 1
    ? { type: "Polygon", coordinates: poligonlar[0] }
    : { type: "MultiPolygon", coordinates: poligonlar };
}

/** [batı, güney, doğu, kuzey] */
export function kutu(geometri: Geometri): [number, number, number, number] {
  let b = Infinity;
  let g = Infinity;
  let d = -Infinity;
  let k = -Infinity;
  for (const halka of halkalar(geometri)) {
    for (const [x, y] of halka) {
      if (x < b) b = x;
      if (y < g) g = y;
      if (x > d) d = x;
      if (y > k) k = y;
    }
  }
  return [b, g, d, k];
}

/** Poligonun ağırlık merkezi (alan ağırlıklı). Dejenere şekilde bbox merkezi. */
export function merkez(geometri: Geometri): [number, number] | null {
  const disHalka = halkalar(geometri)[0];
  if (!disHalka || disHalka.length < 3) {
    const hepsi = halkalar(geometri).flat();
    if (!hepsi.length) return null;
    const k = kutu({ type: "Polygon", coordinates: [hepsi] });
    return [(k[0] + k[2]) / 2, (k[1] + k[3]) / 2];
  }
  let alan2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = disHalka.length - 1; i < disHalka.length; j = i++) {
    const [x1, y1] = disHalka[j];
    const [x2, y2] = disHalka[i];
    const capraz = x1 * y2 - x2 * y1;
    alan2 += capraz;
    cx += (x1 + x2) * capraz;
    cy += (y1 + y2) * capraz;
  }
  if (Math.abs(alan2) < 1e-12) {
    const k = kutu(geometri);
    return [(k[0] + k[2]) / 2, (k[1] + k[3]) / 2];
  }
  return [cx / (3 * alan2), cy / (3 * alan2)];
}

/**
 * İki nokta arası metre (haversine, küresel).
 * Elipsoide göre sapma ~%0,14 — 5 km'de ~7 m. "En yakın alan" sıralamasını
 * değiştirmez; gösterilen mesafeyi hissedilir biçimde bozmaz.
 */
export function mesafeM(
  enlem1: number,
  boylam1: number,
  enlem2: number,
  boylam2: number
): number {
  const dEnlem = (enlem2 - enlem1) * DERECE;
  const dBoylam = (boylam2 - boylam1) * DERECE;
  const a =
    Math.sin(dEnlem / 2) ** 2 +
    Math.cos(enlem1 * DERECE) * Math.cos(enlem2 * DERECE) * Math.sin(dBoylam / 2) ** 2;
  return 2 * DUNYA_YARICAP_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Poligon alanı (m²) — enleme göre düzeltilmiş düzlem yaklaşımı. */
export function alanM2(geometri: Geometri): number {
  let toplam = 0;
  for (const halkaDizisi of halkalar(geometri)) {
    if (!halkaDizisi || halkaDizisi.length < 3) continue;
    const ortEnlem = halkaDizisi.reduce((t, [, y]) => t + y, 0) / halkaDizisi.length;
    const mBoylam = 111_320 * Math.cos(ortEnlem * DERECE);
    const mEnlem = 110_574;
    let alan2 = 0;
    for (let i = 0, j = halkaDizisi.length - 1; i < halkaDizisi.length; j = i++) {
      const [x1, y1] = halkaDizisi[j];
      const [x2, y2] = halkaDizisi[i];
      alan2 += x1 * mBoylam * (y2 * mEnlem) - x2 * mBoylam * (y1 * mEnlem);
    }
    toplam += Math.abs(alan2) / 2;
  }
  return Math.round(toplam);
}

/** Kutunun köşegen uzunluğu (m). */
export function kosegenM(geometri: Geometri): number {
  const [b, g, d, k] = kutu(geometri);
  if (!Number.isFinite(b)) return 0;
  return mesafeM(g, b, k, d);
}

/**
 * Poligonu temsil eden az sayıda örnek nokta: merkez + (çok büyükse) iki uç.
 * ÖLÇÜM (Kırıkkale, 2026-08-06): eşik 3 km + 4 uç ile mahalle başına 10,6
 * istek çıkıyordu (ülke ölçeğinde ~537 bin). Merkez + 2 uzak nokta ve keşif
 * genişlemesiyle 2,9'a indi; kapsam %100 kaldı.
 */
export function ornekNoktalar(
  geometri: Geometri,
  { buyukEsikM = 8000 }: { buyukEsikM?: number } = {}
): [number, number][] {
  const m = merkez(geometri);
  if (!m) return [];
  const noktalar: [number, number][] = [[m[1], m[0]]]; // [enlem, boylam]
  if (kosegenM(geometri) < buyukEsikM) return noktalar;

  const tumNoktalar = halkalar(geometri).flat();
  if (!tumNoktalar.length) return noktalar;
  const enUzak = [...tumNoktalar]
    .sort((a, b) => mesafeM(m[1], m[0], b[1], b[0]) - mesafeM(m[1], m[0], a[1], a[0]))
    .slice(0, 2);
  for (const [x, y] of enUzak) {
    noktalar.push([y + (m[1] - y) * 0.25, x + (m[0] - x) * 0.25]);
  }
  return noktalar;
}

/** ~200 m'lik ızgara anahtarı — aynı yeri iki kez sormamak için. */
export function izgaraAnahtari(enlem: number, boylam: number, adim = 0.002): string {
  return `${Math.round(enlem / adim)}:${Math.round(boylam / adim)}`;
}

/** Türkiye + yakın çevre kaba sınırı — kaçak koordinat denetimi için. */
export const TURKIYE_KUTUSU: [number, number, number, number] = [25.5, 35.5, 45.0, 42.3];

export function turkiyeIcinde(enlem: number, boylam: number): boolean {
  const [b, g, d, k] = TURKIYE_KUTUSU;
  return boylam >= b && boylam <= d && enlem >= g && enlem <= k;
}

/** Kuzeyden saat yönünde açı (derece). */
export function yonAcisi(
  enlem1: number,
  boylam1: number,
  enlem2: number,
  boylam2: number
): number {
  const f1 = enlem1 * DERECE;
  const f2 = enlem2 * DERECE;
  const dl = (boylam2 - boylam1) * DERECE;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) / DERECE + 360) % 360;
}

const PUSULA = ["K", "KKD", "KD", "DKD", "D", "DGD", "GD", "GGD",
                "G", "GGB", "GB", "BGB", "B", "BKB", "KB", "KKB"] as const;

/** 32,25° → "KKD". Yön oku ve metin aynı kaynaktan gelsin diye burada. */
export function pusulaYonu(aci: number): string {
  return PUSULA[Math.round((((aci % 360) + 360) % 360) / 22.5) % 16];
}
