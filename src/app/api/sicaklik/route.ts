import { NextResponse } from "next/server";
import { jsonCek, sirayla, tazele, type Kutu } from "@/lib/bellekOnbellek";
import {
  sicaklikBirlestir,
  type HamMerkez,
  type HamSonDurum,
  type IlSicakligi,
} from "@/lib/sicaklik";

/**
 * İl merkezi anlık sıcaklıkları — MGM.
 *
 * 🔴 `Origin: https://www.mgm.gov.tr` ZORUNLU; başlıksız istek 500 döner
 * (`Not allowed by MGM`). Kaldırılırsa uç "boş" görünür ve katman sessizce
 * kaybolur.
 *
 * ⛔ TOPLU UÇ YOK (`merkezid=1,2,3` · `?il=` · `/tumu` denendi) → 81 il için
 * 81 ayrı istek. Kullanıcıdan hiçbir bilgi bu uca gönderilmez.
 *
 * 🔴 EŞZAMANLILIK ÖLÇÜLDÜ VE 1'E İNDİRİLDİ. İlk sürüm 6 işçiyle gitti ve MGM
 * isteklerin TAMAMINA **503** döndürdü; uç hiç veri üretemedi. Tam listeyle
 * (81 istek) ölçüm, 2026-08-10:
 *
 *   2 işçi → 200=53 · hata=28 · 5,3 sn
 *   1 işçi → 200=71 · hata=10 · **4,7 sn**
 *
 * 🔑 Paralellik burada HIZ DA KAZANDIRMIYOR: tek işçi hem daha az hata aldı
 * hem daha hızlı bitti. Darboğaz gecikme değil, MGM'nin eşzamanlılık cezası.
 * Aynı ders bu projede e-Devlet hasadında da ölçülmüştü ("WAF paralelliği IP
 * başına cezalandırıyor": 3 işçi %11 hata, 1 işçi 0 hata).
 *
 * Tek işçide bile ~10 istek düşüyor (geçici), o yüzden eksik kalanlar için
 * İKİNCİ TUR atılıyor.
 */
export const revalidate = 0;
export const maxDuration = 60;

const MERKEZ_UCU = "https://servis.mgm.gov.tr/web/merkezler/iller";
const DURUM_UCU = "https://servis.mgm.gov.tr/web/sondurumlar?merkezid=";
const BASLIKLAR = {
  Origin: "https://www.mgm.gov.tr",
  Referer: "https://www.mgm.gov.tr/",
  Accept: "application/json",
};

const MERKEZ_TAZE_MS = 24 * 60 * 60 * 1000;
const OLCUM_TAZE_MS = 15 * 60 * 1000;
/** Ölçüldü: 1 işçi hem en az hatayı hem en kısa süreyi verdi. */
const ES_ZAMANLI = 1;
/** Tek istekte harcanacak en fazla süre; kalanlar sonraki turda tazelenir. */
const SURE_BUTCESI_MS = 30_000;
/** Liste eksik kaldıysa 15 dk beklemeden yeniden dene. */
const EKSIK_TAZE_MS = 60_000;

let merkezKutusu: Kutu<HamMerkez[]> | null = null;
/** Plaka → son bilinen ölçüm. Kısmi tazeleme buranın üstüne yazar. */
let olcumler = new Map<number, IlSicakligi>();
let olcumZamani = 0;

/**
 * Ölçümleri tazeler. Süre bütçesi dolarsa DURUR ve elindekini korur:
 * 81 ilin tamamını her seferinde beklemek, katmanı açan kullanıcıyı
 * 40 saniye bekletmek demekti. Eksik kalan iller bir sonraki turda
 * (en eskiden başlayarak) tazelenir.
 */
async function olcumleriTazele(merkezler: HamMerkez[]): Promise<void> {
  const bitis = Date.now() + SURE_BUTCESI_MS;

  // En eski ölçümü olan il önce: tazeleme sırayla dolaşsın, hep aynı 40 il
  // güncellenip gerisi bayat kalmasın.
  const sira = [...merkezler].sort((a, b) => {
    const ai = olcumler.get(Number(a.merkezId)) ? 1 : 0;
    const bi = olcumler.get(Number(b.merkezId)) ? 1 : 0;
    return ai - bi;
  });

  /** Bir turu çalıştırır, alınamayanları geri döner. */
  async function tur(liste: HamMerkez[]): Promise<HamMerkez[]> {
    const kalan: HamMerkez[] = [];
    await sirayla(liste, ES_ZAMANLI, async (merkez) => {
      if (Date.now() > bitis) return;
      if (typeof merkez.merkezId !== "number") return;
      const dizi = await jsonCek<HamSonDurum[]>(`${DURUM_UCU}${merkez.merkezId}`, {
        headers: BASLIKLAR,
        zamanAsimiMs: 12_000,
      });
      const kayit = sicaklikBirlestir(merkez, Array.isArray(dizi) ? dizi[0] : null);
      // Ölçüm alınamazsa ESKİSİ KORUNUR: bir isteğin düşmesi ili haritadan
      // silmemeli, yoksa "orada ölçüm yok" gibi görünür.
      if (kayit) olcumler.set(kayit.plaka, kayit);
      else kalan.push(merkez);
    });
    return kalan;
  }

  // Tek işçide bile ~10 istek geçici olarak düşüyor (ölçüldü); ikinci tur
  // onları toplar. Üçüncü tura gerek görülmedi — kalan varsa zaten kısa
  // aralıkla yeniden denenecek.
  const kalan = await tur(sira);
  if (kalan.length && Date.now() < bitis) await tur(kalan);

  if (olcumler.size) olcumZamani = Date.now();
}

export async function GET() {
  merkezKutusu = await tazele(merkezKutusu, MERKEZ_TAZE_MS, () =>
    jsonCek<HamMerkez[]>(MERKEZ_UCU, { headers: BASLIKLAR })
  );
  if (!merkezKutusu) {
    return NextResponse.json(
      { iller: [], hata: "kaynağa ulaşılamadı", kaynak: "MGM" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  // Liste eksikse kısa aralıkla, tamsa normal aralıkla tazelenir.
  const eksik = olcumler.size < merkezKutusu.veri.length;
  const bekleme = eksik ? EKSIK_TAZE_MS : OLCUM_TAZE_MS;
  if (Date.now() - olcumZamani > bekleme) {
    await olcumleriTazele(merkezKutusu.veri);
  }

  if (!olcumler.size) {
    return NextResponse.json(
      { iller: [], hata: "ölçümler alınamadı", kaynak: "MGM" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  const iller = [...olcumler.values()].sort((a, b) => a.plaka - b.plaka);

  return NextResponse.json(
    {
      iller,
      /** Ölçümü olmayan il sayısı GİZLENMEZ — eksik harita "hava yok" değildir. */
      olcumsuzIl: merkezKutusu.veri.length - iller.length,
      kaynak: "Meteoroloji Genel Müdürlüğü",
      veriYasiSn: Math.round((Date.now() - olcumZamani) / 1000),
    },
    { headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=1800" } }
  );
}
