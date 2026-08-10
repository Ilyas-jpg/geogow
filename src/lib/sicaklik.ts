import { ILLER, katla } from "./iller.ts";

/**
 * SICAKLIK KATMANI — MGM il merkezi istasyon ölçümleri.
 *
 * Uçlar (ölçüldü 2026-08-10, hepsi `Origin: https://www.mgm.gov.tr` ister):
 *   `/web/merkezler/iller`      → 81 il merkezi, enlem/boylam + istasyon no
 *   `/web/sondurumlar?merkezid=` → o merkezin anlık ölçümü
 *
 * ⛔ TOPLU UÇ YOK: `merkezid=1,2,3` · `?il=` · `/tumu` denendi, hepsi tek
 * kayıt ya da 404 döndü. Yani 81 il = 81 istek; bu yüzden sunucuda
 * önbelleklenir ve istemciye tek dosya olarak iner.
 *
 * 🔴 -9999 "VERİ YOK" DEMEKTİR, SICAKLIK DEĞİL. MGM ölçülmeyen alanları
 * -9999 ile dolduruyor (deniz suyu sıcaklığı, kar yüksekliği vb.).
 * Sayı sanılırsa haritaya -9999 °C yazılır; bu proje aynı sınıf hatayı daha
 * önce Kandilli'nin "-.-" işaretinde yakalamıştı.
 */

/** MGM'nin "ölçüm yok" işareti. */
export const VERI_YOK = -9999;

export type IlSicakligi = {
  plaka: number;
  il: string;
  enlem: number;
  boylam: number;
  /** °C */
  sicaklik: number;
  /** Ölçüm zamanı (ISO). */
  zaman: string;
};

export type HamMerkez = {
  merkezId?: number;
  il?: string;
  enlem?: number;
  boylam?: number;
};

export type HamSonDurum = {
  sicaklik?: number;
  veriZamani?: string;
};

const PLAKA_ADI = new Map(ILLER.map((il) => [katla(il.ad), il]));

/** Geçerli bir sıcaklık mı? -9999 ve akıl dışı değerler elenir. */
export function sicaklikGecerli(deger: unknown): deger is number {
  return (
    typeof deger === "number" &&
    Number.isFinite(deger) &&
    deger !== VERI_YOK &&
    deger > -60 &&
    deger < 60
  );
}

/** Bir merkez + ölçüm çiftini yayınlanabilir kayda çevirir; olmazsa null. */
export function sicaklikBirlestir(
  merkez: HamMerkez,
  olcum: HamSonDurum | null | undefined
): IlSicakligi | null {
  if (!merkez?.il || !sicaklikGecerli(olcum?.sicaklik)) return null;
  const il = PLAKA_ADI.get(katla(merkez.il));
  if (!il) return null;
  if (typeof merkez.enlem !== "number" || typeof merkez.boylam !== "number") return null;

  return {
    plaka: il.plaka,
    il: il.ad,
    enlem: merkez.enlem,
    boylam: merkez.boylam,
    sicaklik: Math.round(olcum!.sicaklik! * 10) / 10,
    zaman: olcum?.veriZamani ?? "",
  };
}

/**
 * Sıcaklık → renk.
 *
 * ⚠️ Bu bir RİSK skalası DEĞİL, ölçüm skalasıdır. "35 derece tehlikeli"
 * demek kişiye, neme, süreye ve gölgeye bağlıdır; uydurma risk eşiği
 * yazmak, olmayan bir kesinlik vaat etmek olur. Risk yargısını MGM'nin
 * kendi `hot` uyarısı taşır (uyarı şeridi), bu katman yalnız kaç derece
 * olduğunu gösterir.
 *
 * Renkler soğuktan sıcağa; marka paletinin turkuazı (vurgu) düşük uçta,
 * kritik kırmızısı yüksek uçta.
 */
export function sicaklikRengi(c: number): string {
  if (c <= 0) return "#7dd3fc";
  if (c <= 10) return "#38bdf8";
  if (c <= 20) return "#35c48a";
  if (c <= 28) return "#facc15";
  if (c <= 35) return "#f2a33c";
  if (c <= 40) return "#fb7185";
  return "#ff5d5d";
}

/** Lejantta gösterilecek aralıklar — renk tek başına bilgi taşımasın diye. */
export const SICAKLIK_ARALIKLARI: { etiket: string; renk: string }[] = [
  { etiket: "0 °C ve altı", renk: "#7dd3fc" },
  { etiket: "1–10 °C", renk: "#38bdf8" },
  { etiket: "11–20 °C", renk: "#35c48a" },
  { etiket: "21–28 °C", renk: "#facc15" },
  { etiket: "29–35 °C", renk: "#f2a33c" },
  { etiket: "36–40 °C", renk: "#fb7185" },
  { etiket: "40 °C üstü", renk: "#ff5d5d" },
];
