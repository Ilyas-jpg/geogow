/**
 * ACİL ALTYAPI — hastane, itfaiye ve sağlık merkezi noktalarının TEK kaynağı.
 *
 * Veri: OpenStreetMap (Overpass API), lisans **ODbL**. Atıf zorunludur ve
 * haritada gösterilir.
 *
 * ── NEDEN AFAD/SAĞLIK BAKANLIĞI DEĞİL? ──
 * Bu kurumların halka açık, serbest lisanslı ve makinece okunabilir bir
 * konum servisi bulunamadı (ölçüm: docs/zenginlestirme-yol-haritasi.md).
 * OSM eksiksiz değildir ve arayüzde bu AÇIKÇA yazılır — "listede yok"
 * "orada hastane yok" demek değildir.
 *
 * ── NEDEN ECZANE YOK? ──
 * Ölçüldü: Türkiye'de OSM'de ~28.000 eczane var, yani veri bütçesini tek
 * başına yiyor; üstelik afet anında nöbetçi olmayan eczane kapalıdır.
 * Hastane ve itfaiye ise afetin ilk saatinde çalışır durumda olması beklenen
 * yerlerdir. Kapsam/fayda dengesi bu üç türü seçtirdi.
 */

/** Tek harfli tür kodu — dosya boyutunu düşürür (kötü bağlantı bütçesi). */
export type AltyapiTuru = "h" | "i" | "s";

/** İstemciye giden kompakt satır: [tür, enlem, boylam, ad] */
export type KompaktNokta = [AltyapiTuru, number, number, string];

export type AltyapiVerisi = {
  /** plaka */
  p: number;
  il: string;
  /** toplandığı an (ISO) */
  t: string;
  /** kaynak künyesi — arayüzde gösterilir */
  k: string;
  n: KompaktNokta[];
};

export type Nokta = {
  tur: AltyapiTuru;
  enlem: number;
  boylam: number;
  ad: string;
};

export const TUR_BILGISI: Record<
  AltyapiTuru,
  { ad: string; cogul: string; renk: string; osm: string[] }
> = {
  h: {
    ad: "Hastane",
    cogul: "Hastaneler",
    // Anlam renkleri dörtle sınırlı; altyapı için marka koyusu kullanılıyor
    // ki toplanma alanının yeşili ve depremin kırmızısıyla karışmasın.
    renk: "#009db4",
    osm: ["hospital"],
  },
  i: {
    ad: "İtfaiye",
    cogul: "İtfaiye",
    renk: "#f2a33c",
    osm: ["fire_station"],
  },
  s: {
    ad: "Sağlık merkezi",
    cogul: "Sağlık merkezleri",
    renk: "#8b93a1",
    osm: ["clinic", "doctors"],
  },
};

/** OSM `amenity` değeri → tür kodu. Bilinmeyen değer atılır. */
export function turKodu(amenity: string | undefined): AltyapiTuru | null {
  if (!amenity) return null;
  for (const [kod, bilgi] of Object.entries(TUR_BILGISI)) {
    if (bilgi.osm.includes(amenity)) return kod as AltyapiTuru;
  }
  return null;
}

export function kompakttanNokta(satir: KompaktNokta): Nokta {
  const [tur, enlem, boylam, ad] = satir;
  return { tur, enlem, boylam, ad: ad || TUR_BILGISI[tur].ad };
}

/**
 * OSM adları bazen tür bilgisini zaten taşır ("... Devlet Hastanesi").
 * Ad yoksa tür adı kullanılır — boş etiket göstermek yerine.
 */
export function noktaAdi(ad: string | null | undefined, tur: AltyapiTuru): string {
  const temiz = (ad ?? "").replace(/\s+/g, " ").trim();
  return temiz || TUR_BILGISI[tur].ad;
}
