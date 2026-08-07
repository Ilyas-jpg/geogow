/**
 * 81 il — plaka kodu, resmî ad, URL slug'ı.
 *
 * e-Devlet servisi il seçimini PLAKA koduyla yapıyor (ölçüldü: Kırıkkale=71),
 * yani bu liste hem hasadın hem sitenin tek kaynağı olabiliyor.
 * Hasat başlarken servisin kendi açılır listesiyle KARŞILAŞTIRILIR —
 * uyuşmazlık sessizce geçilmez, uyarı verilir.
 */

export type Il = { plaka: number; ad: string; slug: string };

export const ILLER: Il[] = [
  [1, "Adana", "adana"],
  [2, "Adıyaman", "adiyaman"],
  [3, "Afyonkarahisar", "afyonkarahisar"],
  [4, "Ağrı", "agri"],
  [68, "Aksaray", "aksaray"],
  [5, "Amasya", "amasya"],
  [6, "Ankara", "ankara"],
  [7, "Antalya", "antalya"],
  [75, "Ardahan", "ardahan"],
  [8, "Artvin", "artvin"],
  [9, "Aydın", "aydin"],
  [10, "Balıkesir", "balikesir"],
  [74, "Bartın", "bartin"],
  [72, "Batman", "batman"],
  [69, "Bayburt", "bayburt"],
  [11, "Bilecik", "bilecik"],
  [12, "Bingöl", "bingol"],
  [13, "Bitlis", "bitlis"],
  [14, "Bolu", "bolu"],
  [15, "Burdur", "burdur"],
  [16, "Bursa", "bursa"],
  [17, "Çanakkale", "canakkale"],
  [18, "Çankırı", "cankiri"],
  [19, "Çorum", "corum"],
  [20, "Denizli", "denizli"],
  [21, "Diyarbakır", "diyarbakir"],
  [81, "Düzce", "duzce"],
  [22, "Edirne", "edirne"],
  [23, "Elazığ", "elazig"],
  [24, "Erzincan", "erzincan"],
  [25, "Erzurum", "erzurum"],
  [26, "Eskişehir", "eskisehir"],
  [27, "Gaziantep", "gaziantep"],
  [28, "Giresun", "giresun"],
  [29, "Gümüşhane", "gumushane"],
  [30, "Hakkâri", "hakkari"],
  [31, "Hatay", "hatay"],
  [76, "Iğdır", "igdir"],
  [32, "Isparta", "isparta"],
  [34, "İstanbul", "istanbul"],
  [35, "İzmir", "izmir"],
  [46, "Kahramanmaraş", "kahramanmaras"],
  [78, "Karabük", "karabuk"],
  [70, "Karaman", "karaman"],
  [36, "Kars", "kars"],
  [37, "Kastamonu", "kastamonu"],
  [38, "Kayseri", "kayseri"],
  [71, "Kırıkkale", "kirikkale"],
  [39, "Kırklareli", "kirklareli"],
  [40, "Kırşehir", "kirsehir"],
  [79, "Kilis", "kilis"],
  [41, "Kocaeli", "kocaeli"],
  [42, "Konya", "konya"],
  [43, "Kütahya", "kutahya"],
  [44, "Malatya", "malatya"],
  [45, "Manisa", "manisa"],
  [47, "Mardin", "mardin"],
  [33, "Mersin", "mersin"],
  [48, "Muğla", "mugla"],
  [49, "Muş", "mus"],
  [50, "Nevşehir", "nevsehir"],
  [51, "Niğde", "nigde"],
  [52, "Ordu", "ordu"],
  [80, "Osmaniye", "osmaniye"],
  [53, "Rize", "rize"],
  [54, "Sakarya", "sakarya"],
  [55, "Samsun", "samsun"],
  [56, "Siirt", "siirt"],
  [57, "Sinop", "sinop"],
  [58, "Sivas", "sivas"],
  [63, "Şanlıurfa", "sanliurfa"],
  [73, "Şırnak", "sirnak"],
  [59, "Tekirdağ", "tekirdag"],
  [60, "Tokat", "tokat"],
  [61, "Trabzon", "trabzon"],
  [62, "Tunceli", "tunceli"],
  [64, "Uşak", "usak"],
  [65, "Van", "van"],
  [77, "Yalova", "yalova"],
  [66, "Yozgat", "yozgat"],
  [67, "Zonguldak", "zonguldak"],
].map(([plaka, ad, slug]) => ({
  plaka: plaka as number,
  ad: ad as string,
  slug: slug as string,
}));

export const PLAKAYA_GORE = new Map(ILLER.map((il) => [il.plaka, il]));

/**
 * Hasat önceliği — nüfus büyüklüğüne göre kaba sıra.
 * Gerekçe: ülke geneli hasat günler sürüyor; ürünün ilk günden en çok kişiye
 * karşılık gelmesi için büyük iller önce toplanır. Sıra yalnız TARAMA
 * düzenini belirler, veride hiçbir ayrıcalık yaratmaz.
 */
export const ONCELIK_SIRASI: number[] = [
  34, 6, 35, 16, 7, 42, 1, 63, 27, 41, 33, 21, 31, 45, 38, 55, 10, 46, 65, 9,
  20, 54, 59, 48, 26, 47, 44, 61, 52, 25, 3, 58, 2, 72, 23, 60, 67, 73, 80, 19,
  4, 28, 43, 32, 68, 66, 22, 81, 49, 39, 51, 64, 5, 13, 53, 56, 50, 17, 70, 78,
  40, 24, 30, 12, 37, 36, 71, 15, 57, 77, 76, 11, 14, 18, 74, 8, 79, 29, 75, 62,
  69,
];

/**
 * URL parçası üretir. Türkçe harfler ASCII'ye indirgenir.
 * ⚠️ `toLowerCase()` tek başına yetmez: "İ" birleşen noktalı "i̇" üretir,
 * "I" ise "i" olur — oysa "ı" olmalı. `katla` bunu önce çözüyor.
 */
export function slugla(metin: string): string {
  return katla(metin)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "KIRIKKALE" / "Kırıkkale" → aynı anahtar. İ/I tuzağı burada çözülür. */
export function katla(metin: string): string {
  return String(metin)
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .trim();
}
