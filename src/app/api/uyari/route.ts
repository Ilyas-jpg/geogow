import { NextResponse } from "next/server";
import { uyariCozumle, type HamMerkez, type HamUyari } from "@/lib/mgmUyari";

/**
 * Aktif meteorolojik uyarılar — MGM.
 *
 * Kullanıcıdan hiçbir bilgi (konum dahil) bu uca gönderilmez: uyarılar ülke
 * geneli döner, sayfaya ait olanı istemci süzer.
 */
export const revalidate = 0;

/**
 * 🔴 SÜRE BÜTÇESİ — ölçülmüş bir zorunluluk.
 *
 * MGM arşivi 4,5 MB ve **sıkıştırma yapmıyor**: `Accept-Encoding: gzip`
 * istense bile `Content-Encoding` dönmüyor, gövde aynen 4.499.874 bayt
 * (ölçüldü 2026-08-10). İndirme buradan **12–13 saniye** sürüyor; varsayılan
 * fonksiyon süresiyle soğuk başlangıçta uç 503 veriyordu.
 *
 * ⛔ Küçültme yolları denendi ve YOK: `limit` · `son` · `aktif` · `adet` ·
 * `size` · `page` parametrelerinin hepsi 200 dönüyor ama gövde yine 4,5 MB.
 * ⛔ Ucuz `/web/alarmlar` ucunu (229 bayt) "aktif uyarı var mı" sondası
 * yapmak da REDDEDİLDİ: iki ucun kapsamı aynı değil — `/web/alarmlar`
 * gelecekte başlayacak uyarıyı göstermiyor, sonda boş dönerse gerçek uyarıyı
 * atlardık. Yanlış negatif, yavaş uçtan kötüdür.
 */
export const maxDuration = 60;

const UYARI_UCU = "https://servis.mgm.gov.tr/web/meteoalarm";
const MERKEZ_UCU = "https://servis.mgm.gov.tr/web/merkezler/tumu";

/**
 * 🔴 ORIGIN BAŞLIĞI ZORUNLU. Başlıksız istek 500 döner:
 * `{"error":"ServerError","message":"Not allowed by MGM"}`
 * Ölçüldü 2026-08-10. Kaldırılırsa uç "boş" görünür ve ürün sessizce
 * "aktif uyarı yok" der — yanlış sonucun en tehlikeli biçimi.
 */
const BASLIKLAR = {
  Origin: "https://www.mgm.gov.tr",
  Referer: "https://www.mgm.gov.tr/",
  Accept: "application/json",
};

/**
 * 🔴 NEDEN KENDİ BELLEK ÖNBELLEĞİMİZ VAR (ölçülmüş bir hatanın düzeltmesi):
 *
 * MGM uyarı arşivi **4,5 MB**. Next'in fetch (Data) önbelleği bu boyutu
 * saklamaz — sessizce önbelleklemez, hata da vermez. Sonuç ölçüldü:
 * `next: { revalidate }` ile her istek MGM'den 4,5 MB'ı YENİDEN indiriyordu,
 * uç **5–10 saniye** sürüyordu ve indirmelerden biri düşünce uç **503**
 * döndü. Yani "önbelleğe aldım" sanmak, hem yavaş hem kırılgan bir uçtu.
 *
 * Çözüm: HAM veri süreç belleğinde tutulur; yanıt her istekte yeniden
 * hesaplanır. Ham veriyi (çözülmüşü değil) saklamak şart — uyarının geçerlilik
 * penceresi `end` ile taşınıyor ve süzme "şimdi"ye göre yapılıyor; çözülmüş
 * listeyi saklasaydık süresi dolmuş uyarıyı göstermeye devam ederdik.
 */
const TAZE_MS = 10 * 60 * 1000;
const MERKEZ_TAZE_MS = 24 * 60 * 60 * 1000;

type Kutu<T> = { veri: T; zaman: number };
let uyariKutusu: Kutu<HamUyari[]> | null = null;
let merkezKutusu: Kutu<HamMerkez[]> | null = null;

async function cek<T>(uc: string): Promise<T | null> {
  try {
    const yanit = await fetch(uc, {
      headers: BASLIKLAR,
      // 4,5 MB'ın buradan indirilmesi 12–13 sn; 25 sn'lik bütçe soğuk
      // başlangıçta yetmedi ve 503 verdi (ölçüldü). Bütçe maxDuration'ın
      // altında kalacak şekilde genişletildi.
      signal: AbortSignal.timeout(45_000),
      // Next önbelleği devre dışı: 4,5 MB'ı zaten saklayamıyor, "no-store"
      // demek en azından yanıltıcı bir güven vermez.
      cache: "no-store",
    });
    if (!yanit.ok) {
      console.error(`MGM ${uc} → ${yanit.status}`);
      return null;
    }
    return (await yanit.json()) as T;
  } catch (hata) {
    console.error(`MGM ${uc} düştü:`, (hata as Error).message);
    return null;
  }
}

/** Bayat kutuyu tazelemeye çalışır; başarısızsa BAYATI KORUR. */
async function tazele<T>(
  kutu: Kutu<T> | null,
  uc: string,
  omur: number
): Promise<Kutu<T> | null> {
  if (kutu && Date.now() - kutu.zaman < omur) return kutu;
  const yeni = await cek<T>(uc);
  if (Array.isArray(yeni) && yeni.length) return { veri: yeni, zaman: Date.now() };
  // Tazeleme düştüyse elimizdeki eski veri, hiç veri olmamasından iyidir:
  // uyarılar kendi geçerlilik penceresini taşıdığı için eski kopyadan da
  // doğru süzülür.
  return kutu;
}

export async function GET() {
  [uyariKutusu, merkezKutusu] = await Promise.all([
    tazele(uyariKutusu, UYARI_UCU, TAZE_MS),
    tazele(merkezKutusu, MERKEZ_UCU, MERKEZ_TAZE_MS),
  ]);

  if (!uyariKutusu || !merkezKutusu) {
    return NextResponse.json(
      { uyarilar: [], hata: "kaynağa ulaşılamadı", kaynak: "MGM" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  const { uyarilar, cozulemeyenKod } = uyariCozumle(
    uyariKutusu.veri,
    merkezKutusu.veri
  );

  return NextResponse.json(
    {
      uyarilar,
      kaynak: "Meteoroloji Genel Müdürlüğü",
      /**
       * Çözülemeyen ilçe kodu sayısı GİZLENMEZ. Ölçüldü: 5.801 uyarılık
       * arşivde 204 kod merkez listesinde yok (%0,1). Sayı büyürse MGM kod
       * tabanını değiştirmiş demektir ve bunu fark etmemiz gerekir.
       */
      cozulemeyenKod,
      /** Ham verinin yaşı — uç bayat veriyle çalışıyorsa görünsün. */
      veriYasiSn: Math.round((Date.now() - uyariKutusu.zaman) / 1000),
      alindi: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    }
  );
}
