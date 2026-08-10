/**
 * BASILABİLİR BELGE KATALOĞU — tek kaynak.
 *
 * `/printables` bu listeden üretilir. Amaç: basılabilir her şeyin tek yerde,
 * ne olduğu ve KAÇ SAYFA tuttuğu yazılı hâlde durması. Sayfa sayısı süs
 * değil: insanlar yazıcıya kâğıt koyarken bunu bilmek ister ve 19 sayfalık
 * bir belgeyi yanlışlıkla basmak gerçek bir maliyet.
 *
 * ⚠️ `sayfa` alanları TAHMİN DEĞİL, ölçüldü: Chromium print media, A4
 * (794×1123 px @96dpi), 14 mm kenar boşluğu → kullanılabilir 1017 px.
 * Ölçüm yöntemi ve tarihi `docs/` yerine burada duruyor çünkü sayı
 * değiştiğinde güncellenmesi gereken yer burası.
 * Son ölçüm: 2026-08-10.
 */

export type BasilabilirTur = "kilavuz" | "kart" | "liste" | "form";

export type Basilabilir = {
  yol: string;
  ad: string;
  /** Ne işe yarar — kâğıdı basmadan önce okunacak tek cümle. */
  ne: string;
  /** Kime / nerede: buzdolabı, çanta, okul, dolap kapağı. */
  nerede: string;
  sayfa: number;
  tur: BasilabilirTur;
  /** Doldurulacak alan var mı — kalemle basılması gerekenler ayrılsın. */
  doldurulur?: boolean;
};

export const BASILABILIRLER: Basilabilir[] = [
  {
    yol: "/kilavuz",
    ad: "Tam afet kılavuzu",
    ne: "Dokuz afetin tamamı: o anda ne yapılır, öncesi, sonrası, yaygın yanlışlar. Çanta listesi ve aile planı ekte.",
    nerede: "Evde dolap kapağında ya da klasörde. Okulda dağıtmak için.",
    sayfa: 19,
    tur: "kilavuz",
  },
  {
    yol: "/printables/canta",
    ad: "Afet çantası listesi",
    ne: "Her maddede ne kadar ve neden yazıyor. İşaretleyerek eksiğini takip et.",
    nerede: "Çantanın yanında, dolabın içinde.",
    sayfa: 3,
    tur: "liste",
    doldurulur: true,
  },
  {
    yol: "/printables/plan",
    ad: "Aile buluşma planı",
    ne: "Buluşma noktaları, şehir dışı irtibat kişisi, okul teslim bilgisi, vana yerleri. Elle doldurulur.",
    nerede: "Herkesin çantasında bir kopya. Şebeke çökünce telefon değil kâğıt çalışır.",
    sayfa: 1,
    tur: "form",
    doldurulur: true,
  },
];

/** Tek sayfalık afet kartları `/kilavuz/<tür>` — dokuzu da bir sayfa (ölçüldü). */
export const KART_SAYFA = 1;
