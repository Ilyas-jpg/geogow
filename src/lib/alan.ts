/**
 * Toplanma alanı tipleri ve sunum yardımcıları — TEK KAYNAK.
 * Hem hasat/derleme betikleri hem uygulama buradan okur.
 */

import { mesafeM, pusulaYonu, yonAcisi } from "./geo.ts";

/** Ham hasat kaydı (data/ham/<plaka>.json içindeki biçim). */
export type HamAlan = {
  id: number;
  ad: string | null;
  tabelaKod: string | null;
  adres: string | null;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  sokak: string | null;
  enlem: number;
  boylam: number;
  alanM2: number | null;
  geometri: unknown;
};

/** İstemciye giden kompakt satır: [id, enlem, boylam, kısaAd, tabela, alanM2] */
export type KompaktAlan = [number, number, number, string, string, number];

export type IlVerisi = {
  p: number;
  il: string;
  t: string;
  a: KompaktAlan[];
};

/** Ekranda kullanılan çözülmüş alan. */
export type Alan = {
  id: number;
  enlem: number;
  boylam: number;
  ad: string;
  tabelaKod: string | null;
  alanM2: number | null;
};

/**
 * AFAD adları iki kalıpta geliyor (ölçüldü, Kırıkkale 289 + Kilis 169 kayıt):
 *  ① "Kırıkkale İl Afet Müdahale Planı-Toplanma Alanı-30-Fatih Mah. Samsun
 *     Bulvarı Boş Alan" → önek gürültü, asıl bilgi sonda
 *  ② "Ulaş Köyü Köy Toplanma Alanı-13" → zaten kısa
 * Kısaltma bilgi ATMAZ: tam ad kayıtta durur, kartta gösterilir.
 */
export function kisaAd(tamAd: string | null | undefined): string | null {
  if (!tamAd) return null;
  const ad = String(tamAd).replace(/\s+/g, " ").trim();

  const plan = ad.match(
    /^.*?(?:İl|il)\s*Afet\s*M[üu]dahale\s*Plan[ıi]\s*-\s*Toplanma\s*Alan[ıi]\s*-\s*(\d+)\s*-\s*(.+)$/
  );
  if (plan) return plan[2].trim();

  const planSade = ad.match(
    /^.*?(?:İl|il)\s*Afet\s*M[üu]dahale\s*Plan[ıi]\s*-\s*Toplanma\s*Alan[ıi]\s*-\s*(\d+)\s*$/
  );
  if (planSade) return `Toplanma Alanı ${planSade[1]}`;

  return ad;
}

/**
 * Tabela kodu alanı serviste üç ayrı biçimde "yok" diyor: "-", "tabela yok",
 * boş dize. Bunları ekrana basmak kullanıcıya sahada olmayan bir kod aratır.
 * Ölçüldü: Kırıkkale'de 289 kaydın 197'si, Kilis'te tamamı bu kalıplardaydı.
 */
export function temizTabela(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const d = String(deger).trim();
  if (!d || d === "-") return null;
  const katlanmis = d.toLocaleLowerCase("tr");
  if (katlanmis === "tabela yok" || katlanmis === "yok" || katlanmis === "tabelasız")
    return null;
  return d;
}

/** Adres alanı adın birebir kopyasıysa tekrar göstermenin anlamı yok. */
export function anlamliAdres(
  adres: string | null | undefined,
  tamAd: string | null | undefined
): string | null {
  if (!adres) return null;
  const sadelestir = (m: string) => m.replace(/\s+/g, " ").trim().toLowerCase();
  return sadelestir(adres) === sadelestir(tamAd ?? "") ? null : adres.trim();
}

/** 4150 → "4.150 m²". Yalnız KABA ALAN; kapasite (kaç kişi alır) DEĞİL. */
export function alanYazisi(m2: number | null | undefined): string | null {
  if (!Number.isFinite(m2) || (m2 as number) <= 0) return null;
  const deger = m2 as number;
  if (deger >= 1_000_000)
    return `${(deger / 1_000_000).toFixed(1).replace(".", ",")} km²`;
  return `${deger.toLocaleString("tr-TR")} m²`;
}

/** 850 → "850 m" · 4200 → "4,2 km" */
export function mesafeYazisi(metre: number): string {
  if (metre < 1000) return `${Math.round(metre / 10) * 10} m`;
  return `${(metre / 1000).toFixed(1).replace(".", ",")} km`;
}

/**
 * Kaba yürüme süresi (5 km/sa). "Kuş uçuşu" olduğu arayüzde AÇIKÇA yazılır —
 * gerçek yol daha uzundur; afet anında eksik tahmin tehlikelidir.
 */
export function yurumeDakika(metre: number): number {
  return Math.max(1, Math.round(metre / (5000 / 60)));
}

/** Ham kayıt → istemciye giden kompakt satır (derleme adımı kullanır). */
export function kompaktSatir(alan: HamAlan): KompaktAlan {
  return [
    alan.id,
    Number(alan.enlem?.toFixed(5)),
    Number(alan.boylam?.toFixed(5)),
    kisaAd(alan.ad) ?? "",
    temizTabela(alan.tabelaKod) ?? "",
    alan.alanM2 ?? 0,
  ];
}

export function kompakttanAlan(satir: KompaktAlan): Alan {
  const [id, enlem, boylam, ad, tabela, m2] = satir;
  return {
    id,
    enlem,
    boylam,
    ad: ad || "Toplanma alanı",
    tabelaKod: tabela || null,
    alanM2: m2 || null,
  };
}

export type YakinAlan = Alan & {
  mesafeM: number;
  yon: string;
  yurumeDk: number;
};

/**
 * Bir konuma en yakın N alan. Tamamen istemcide çalışır — konum cihazdan
 * çıkmaz, sunucuya sorulmaz, saklanmaz. Çevrimdışı çalışmasının sebebi de bu.
 */
export function enYakinlar(
  konum: { enlem: number; boylam: number },
  alanlar: Alan[],
  adet = 3
): YakinAlan[] {
  return alanlar
    .map((alan) => {
      const m = mesafeM(konum.enlem, konum.boylam, alan.enlem, alan.boylam);
      return {
        ...alan,
        mesafeM: m,
        yon: pusulaYonu(yonAcisi(konum.enlem, konum.boylam, alan.enlem, alan.boylam)),
        yurumeDk: yurumeDakika(m),
      };
    })
    .sort((a, b) => a.mesafeM - b.mesafeM)
    .slice(0, adet);
}
