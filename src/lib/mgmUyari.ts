import { ILLER, katla } from "./iller.ts";

/**
 * MGM METEOROLOJİK UYARILARI — çözümleme mantığı.
 *
 * Ölçüldü 2026-08-10 (`docs/zenginlestirme-arastirma-2.md`):
 *
 * 🔴 `Origin: https://www.mgm.gov.tr` BAŞLIĞI ZORUNLU. Başlıksız istek
 * **500 `{"error":"ServerError","message":"Not allowed by MGM"}`** döner.
 * Eski araştırma turu "200 ama gövde boş" diye kaydetmişti ve bundan
 * "aktif uyarı yok" sonucu çıkarılmıştı — yanlış sonuç: istek engelleniyordu.
 * Buradaki ders geneldir: **boş dönen uç, engellenmiş istek olabilir.**
 *
 * 🔑 `/web/alarmlar` ucunda COĞRAFYA YOK (il yalnız başlık metninde geçer,
 * ayıklamak kırılgan tahmindir). Kullanılan uç `/web/meteoalarm`: uyarıyı
 * ilçe kodu dizisiyle veriyor.
 *
 * Şema:
 *   text    : { yellow|orange|red: "uyarı metni" }
 *   weather : { yellow|orange|red: ["thunderstorm", …] }
 *   towns   : { yellow|orange|red: [95201, …] }   ← MGM `merkezId`
 *   begin / end : ISO, UTC
 *
 * ⚠️ ÇÖZÜNÜRLÜK İLÇEDİR, poligon değil. Üründe "mahallende uyarı var"
 * DENMEZ; en fazla "ilinde/ilçende uyarı var" denir.
 */

/** MGM'nin şiddet kademeleri; dizideki sıra ciddiden hafife. */
export const KADEMELER = ["red", "orange", "yellow"] as const;
export type Kademe = (typeof KADEMELER)[number];

/** Üründe kullanılan Türkçe karşılıklar. */
export const KADEME_ADI: Record<Kademe, string> = {
  red: "kırmızı",
  orange: "turuncu",
  yellow: "sarı",
};

/**
 * MGM tehlike türü → bizim afet sayfamız.
 *
 * Ölçülen tür listesi (5.801 uyarılık arşiv): thunderstorm · wind · snow ·
 * rain · dust · agricultural · avalanche · ice · snowmelt · fog · hot.
 * Dokuz afetimizin DÖRDÜ karşılanıyor. Karşılığı olmayan türler
 * (snow, ice, fog, dust, agricultural) bilerek eşlenmedi: o afet sayfamız
 * yok, uydurma eşleme kullanıcıyı yanlış sayfaya götürür.
 *
 * ⚠️ Heyelan MGM'de tür DEĞİL — yağış uyarılarının metninde geçiyor.
 * Metinden çıkarım yapmak "uyarı var" demenin en kırılgan yolu olurdu,
 * bu yüzden heyelan sayfasına uyarı bağlanmadı.
 */
export const TEHLIKE_AFET: Record<string, string[]> = {
  thunderstorm: ["sel"],
  rain: ["sel"],
  snowmelt: ["sel"],
  wind: ["firtina"],
  avalanche: ["cig"],
  hot: ["asiri-sicak"],
};

/**
 * MGM uyarısı olabilecek afetler. Diğer beş afet sayfasında uyarı ucu hiç
 * çağrılmaz — karşılığı olmayan sayfada istek atmak boşuna yük olurdu.
 */
export const UYARI_KAPSAMI: ReadonlySet<string> = new Set(
  Object.values(TEHLIKE_AFET).flat()
);

/** MGM `/web/meteoalarm` ham kaydı. */
export type HamUyari = {
  text?: Partial<Record<Kademe, string>>;
  weather?: Partial<Record<Kademe, string[]>>;
  towns?: Partial<Record<Kademe, number[]>>;
  alertNo?: number;
  begin?: string;
  end?: string;
};

/** MGM `/web/merkezler/tumu` ham kaydı. */
export type HamMerkez = { merkezId?: number; il?: string; ilce?: string };

export type Uyari = {
  no: number;
  kademe: Kademe;
  /** MGM'nin kendi tür kodları — çevrilmez, kaynağa sadık kalınır. */
  turler: string[];
  /** Bizim afet slug'larımız; boş olabilir (karşılığı olmayan tür). */
  afetler: string[];
  /** MGM'nin kendi uyarı metni. Özetlenmez: resmî uyarı çarpıtılmaz. */
  metin: string;
  baslangic: string;
  bitis: string;
  iller: { plaka: number; ad: string }[];
  ilceSayisi: number;
};

const PLAKA_ADI = new Map(ILLER.map((il) => [katla(il.ad), il]));

/**
 * Bir uyarı kaydı, her kademesi için ayrı bir `Uyari`ye açılır: MGM aynı
 * kayıtta hem sarı hem turuncu bölge verebiliyor (ölçülen örnek: 4 ilçe
 * sarı, 78 ilçe turuncu). Tek kademeye indirmek, turuncu bölgedeki kişiye
 * sarı göstermek ya da tersi olurdu.
 */
export function uyariCozumle(
  ham: HamUyari[],
  merkezler: HamMerkez[],
  simdi = new Date()
): { uyarilar: Uyari[]; cozulemeyenKod: number } {
  const merkezHaritasi = new Map<number, HamMerkez>();
  for (const m of merkezler) {
    if (typeof m.merkezId === "number") merkezHaritasi.set(m.merkezId, m);
  }

  const uyarilar: Uyari[] = [];
  let cozulemeyenKod = 0;

  for (const kayit of ham) {
    // Bitmiş uyarı gösterilmez. `end` yoksa kayda güvenilmez, atlanır.
    if (!kayit.end || !(Date.parse(kayit.end) > simdi.getTime())) continue;

    for (const kademe of KADEMELER) {
      const ilceler = kayit.towns?.[kademe] ?? [];
      if (!ilceler.length) continue;

      const plakalar = new Map<number, { plaka: number; ad: string }>();
      for (const kod of ilceler) {
        const merkez = merkezHaritasi.get(kod);
        // ⚠️ Eşleşmeyen kod SESSİZCE YUTULMAZ; sayılır ve uca çıkar.
        // Bu projede "boş çıktıyı yine de yaz" hatası daha önce yaşandı.
        if (!merkez?.il) {
          cozulemeyenKod++;
          continue;
        }
        const il = PLAKA_ADI.get(katla(merkez.il));
        if (!il) {
          cozulemeyenKod++;
          continue;
        }
        plakalar.set(il.plaka, { plaka: il.plaka, ad: il.ad });
      }
      if (!plakalar.size) continue;

      const turler = kayit.weather?.[kademe] ?? [];
      const afetler = [...new Set(turler.flatMap((t) => TEHLIKE_AFET[t] ?? []))];

      uyarilar.push({
        no: kayit.alertNo ?? 0,
        kademe,
        turler,
        afetler,
        metin: (kayit.text?.[kademe] ?? "").trim(),
        baslangic: kayit.begin ?? "",
        bitis: kayit.end,
        iller: [...plakalar.values()].sort((a, b) => a.plaka - b.plaka),
        ilceSayisi: ilceler.length,
      });
    }
  }

  // Ciddi olan önce; eşitlikte yakında bitecek olan önce.
  const sira = { red: 0, orange: 1, yellow: 2 };
  uyarilar.sort(
    (a, b) => sira[a.kademe] - sira[b.kademe] || Date.parse(a.bitis) - Date.parse(b.bitis)
  );

  return { uyarilar, cozulemeyenKod };
}

/** Belirli bir afet sayfasına ait uyarılar. */
export function afeteGore(uyarilar: Uyari[], afetSlug: string): Uyari[] {
  return uyarilar.filter((u) => u.afetler.includes(afetSlug));
}
