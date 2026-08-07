"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  kompakttanAlan,
  enYakinlar,
  mesafeYazisi,
  alanYazisi,
  type Alan,
  type IlVerisi,
  type YakinAlan,
} from "@/lib/alan";
import { ilAdaylari, type IlAdayi } from "@/lib/ilSecimi";
import CevrimdisiKayit from "./CevrimdisiKayit";
import ServisCalisani from "./ServisCalisani";
import { zamanYazisi, type Deprem } from "@/lib/deprem";
import { kompakttanNokta, TUR_BILGISI, type Nokta } from "@/lib/altyapi";
// ⚠️ Eşik ve tip `Harita.tsx`ten DEĞİL buradan alınır: oradan statik import
// etmek maplibre-gl'i ana pakete geri çeker ve kod bölmeyi yok eder.
import { NOKTA_YAKINLASMASI, type IlIsareti } from "@/lib/haritaAyar";
import type { Ozet } from "@/lib/veri";

// Harita motoru ayrı parça: alan listesi MapLibre'yi BEKLEMEZ.
const Harita = dynamic(() => import("./Harita"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zemin-2" aria-hidden />,
});

/**
 * Katman anahtarı: renk örneği + ad + açıklama + açık/kapalı işareti.
 * Renk TEK BAŞINA bilgi taşımaz (marka anayasası §2) — durum hem kutucukla
 * hem `aria-pressed` ile hem de kenarlık rengiyle veriliyor.
 */
function KatmanSatiri({
  acik,
  onDegis,
  renk,
  ad,
  aciklama,
}: {
  acik: boolean;
  onDegis: () => void;
  renk: string;
  ad: string;
  aciklama: string;
}) {
  return (
    <button
      type="button"
      onClick={onDegis}
      aria-pressed={acik}
      className={`flex w-full cursor-pointer items-center gap-2.5 border-b border-cizgi px-3 py-2.5 text-left transition-colors duration-200 ${
        acik ? "bg-zemin-3" : "hover:bg-zemin-3/60"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          acik ? "border-transparent" : "border-cizgi"
        }`}
        style={acik ? { background: renk } : undefined}
      >
        {acik && (
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path
              d="M2.5 6.2l2.4 2.4 4.6-5"
              fill="none"
              stroke="#0b0d10"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${acik ? "text-metin" : "text-metin-2"}`}>
          {ad}
        </span>
        {/* Açıklama yalnız geniş ekranda: telefonda panel haritanın %20'sini
            kapatıyordu. Katmanın ADI ve RENGİ her koşulda görünür kalır —
            "hangi katman" sorusunun cevabı onlar. */}
        <span className="hidden text-xs text-metin-3 sm:block">{aciklama}</span>
      </span>
      {/* Kapalıyken de rengin hangisi olduğu görünsün. */}
      {!acik && (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
          style={{ background: renk }}
        />
      )}
    </button>
  );
}

type Durum =
  | { tip: "hazir" }
  | { tip: "araniyor" }
  | { tip: "bulundu"; enlem: number; boylam: number; dogruluk: number }
  | { tip: "hata"; mesaj: string };

export default function Uygulama({ ozet }: { ozet: Ozet | null }) {
  const [durum, setDurum] = useState<Durum>({ tip: "hazir" });
  /**
   * İNDİRİLMİŞ İLLER — plaka → alanlar.
   *
   * Tek il yerine sözlük tutuluyor çünkü artık haritada gezinirken de veri
   * iniyor: kullanıcı konum izni vermeden, sadece bakarak toplanma
   * alanlarını görebilmeli. İl sınırında duran biri iki ilin alanını
   * birden görür.
   */
  const [ilVerileri, setIlVerileri] = useState<Record<number, Alan[]>>({});
  const alanlar = useMemo<Alan[]>(
    () => Object.values(ilVerileri).flat(),
    [ilVerileri]
  );
  const [secIl, setSecIl] = useState<IlAdayi | null>(null);
  /** Veri önbellekten geldiyse kullanıcıya SÖYLENİR — sessizce bayat veri gösterilmez. */
  const [cevrimdisi, setCevrimdisi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [secili, setSecili] = useState<number | null>(null);
  const [depremAcik, setDepremAcik] = useState(false);
  const [depremler, setDepremler] = useState<Deprem[]>([]);
  const [depremDurumu, setDepremDurumu] = useState<"bos" | "yukleniyor" | "hata" | "tamam">(
    "bos"
  );
  const [altyapiAcik, setAltyapiAcik] = useState(false);
  const [altyapi, setAltyapi] = useState<Nokta[]>([]);
  const [altyapiDurumu, setAltyapiDurumu] = useState<
    "bos" | "yukleniyor" | "hata" | "yok" | "tamam"
  >("bos");
  const izlemeRef = useRef<number | null>(null);

  /**
   * Deprem katmanı YALNIZ açıkken çekilir — kapalı katman için ağ isteği
   * yapmak kötü bağlantı bütçesini boşa harcar (yangın projesinin dersi).
   */
  const depremIstendiRef = useRef(false);
  useEffect(() => {
    if (!depremAcik || depremIstendiRef.current) return;
    // 🐛 Önceki sürümde `depremDurumu` hem set ediliyor hem bağımlılıktaydı:
    // durum "yukleniyor"a dönünce efekt yeniden koşuyor, İLK koşunun
    // temizliği `iptal = true` yapıyor ve yanıt geldiğinde hiçbir şey
    // güncellenmiyordu — bant sonsuza kadar "çekiliyor…" yazıyordu.
    // Uçuştaki istek artık ref ile korunuyor, durum bağımlılıkta değil.
    depremIstendiRef.current = true;
    setDepremDurumu("yukleniyor");
    fetch("/api/deprem?saat=24&minmag=2")
      .then((y) => (y.ok ? y.json() : Promise.reject(new Error(String(y.status)))))
      .then((v) => {
        setDepremler(v.depremler ?? []);
        setDepremDurumu("tamam");
      })
      .catch(() => {
        depremIstendiRef.current = false; // tekrar denenebilsin
        setDepremDurumu("hata");
      });
  }, [depremAcik]);

  /**
   * Acil altyapı katmanı: yalnız AÇIKKEN ve il belliyken indirilir.
   * (İstanbul için ölçüldü: 16,4 KB brotli — kapalı katman için bunu
   *  harcamak kötü bağlantı bütçesini boşa yer.)
   *
   * Her il için ayrı istek gerektiğinden "hangi il indirildi" ref'te tutulur;
   * deprem katmanındaki tek seferlik bayrak burada yetmez.
   */
  const altyapiIlRef = useRef<number | null>(null);
  useEffect(() => {
    const plaka = secIl?.plaka ?? null;
    if (!altyapiAcik || plaka == null || altyapiIlRef.current === plaka) return;
    altyapiIlRef.current = plaka;
    setAltyapiDurumu("yukleniyor");
    fetch(`/data/altyapi/${plaka}.min.json`)
      .then((y) => {
        // 404 = o il için henüz hasat yapılmadı. Bu "orada hastane yok"
        // DEĞİLDİR ve kullanıcıya öyle gösterilmez.
        if (y.status === 404) return null;
        if (!y.ok) throw new Error(String(y.status));
        return y.json();
      })
      .then((v) => {
        if (!v) {
          setAltyapi([]);
          setAltyapiDurumu("yok");
          return;
        }
        setAltyapi((v.n ?? []).map(kompakttanNokta));
        setAltyapiDurumu("tamam");
      })
      .catch(() => {
        altyapiIlRef.current = null; // tekrar denenebilsin
        setAltyapiDurumu("hata");
      });
  }, [altyapiAcik, secIl]);

  const altyapiSayim = useMemo(() => {
    const s: Record<string, number> = {};
    for (const n of altyapi) s[n.tur] = (s[n.tur] ?? 0) + 1;
    return s;
  }, [altyapi]);

  const iller = useMemo<IlAdayi[]>(
    () =>
      (ozet?.iller ?? []).map((il) => ({
        plaka: il.plaka,
        il: il.il,
        slug: il.slug,
        kutu: il.kutu,
        merkez: il.merkez,
      })),
    [ozet]
  );

  /**
   * İl verisini indirir. Yalnız gereken il — kötü bağlantı bütçesi böyle korunur.
   * Aynı il iki kez indirilmez; uçuştaki istek de ref ile korunur.
   */
  const inenIllerRef = useRef<Set<number>>(new Set());
  const ilYukle = useCallback(async (plaka: number) => {
    if (inenIllerRef.current.has(plaka)) return;
    inenIllerRef.current.add(plaka);
    setYukleniyor(true);
    try {
      const yanit = await fetch(`/data/toplanma/${plaka}.min.json`);
      if (!yanit.ok) throw new Error(String(yanit.status));
      // Servis çalışanı önbellekten servis ettiyse başlıkla bildiriyor.
      // (Ağ tamamen düştüğünde tetiklenir; tarayıcı HTTP önbelleği devreye
      //  girerse `navigator.onLine` dinleyicisi yakalar.)
      if (yanit.headers.get("x-geogow-cevrimdisi") === "1") setCevrimdisi(true);
      const veri: IlVerisi = await yanit.json();
      setIlVerileri((onceki) => ({
        ...onceki,
        [plaka]: veri.a.map(kompakttanAlan),
      }));
    } catch {
      inenIllerRef.current.delete(plaka); // tekrar denenebilsin
      setDurum((o) =>
        o.tip === "bulundu"
          ? o
          : {
              tip: "hata",
              mesaj: "Alan verisi indirilemedi. Bağlantını kontrol edip tekrar dene.",
            }
      );
    } finally {
      setYukleniyor(false);
    }
  }, []);

  const konumBul = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setDurum({ tip: "hata", mesaj: "Bu cihaz konum desteklemiyor. Aşağıdan ilini seç." });
      return;
    }
    setDurum({ tip: "araniyor" });
    // watchPosition: kullanıcı yürürken mesafe canlı güncellensin.
    izlemeRef.current = navigator.geolocation.watchPosition(
      (konum) => {
        setDurum({
          tip: "bulundu",
          enlem: konum.coords.latitude,
          boylam: konum.coords.longitude,
          dogruluk: konum.coords.accuracy,
        });
      },
      (hata) => {
        // Geçici hata (tünel, bina içi) izlemeyi ÖLDÜRMEZ; yalnız izin reddi durdurur.
        if (hata.code === hata.PERMISSION_DENIED) {
          setDurum({
            tip: "hata",
            mesaj:
              "Konum izni verilmedi. Sorun değil — aşağıdan ilini ve mahalleni seçerek de bulabilirsin.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
    );
  }, []);

  useEffect(
    () => () => {
      if (izlemeRef.current != null) navigator.geolocation.clearWatch(izlemeRef.current);
    },
    []
  );

  /**
   * Çevrimdışı durumu iki kaynaktan gelir:
   *  ① servis çalışanının `x-geogow-cevrimdisi` başlığı (gerçek ağ hatası)
   *  ② `navigator.onLine` + online/offline olayları
   * ②'ye ihtiyaç var çünkü tarayıcının kendi HTTP önbelleği isteği
   * karşılayınca SW ağ hatası GÖRMÜYOR ve başlık hiç eklenmiyor — ölçüldü:
   * sunucu kapalıyken veri 200 döndü ama başlık boştu. Sessizce bayat veri
   * göstermek bu üründe kabul edilemez.
   */
  useEffect(() => {
    const guncelle = () => setCevrimdisi(!navigator.onLine);
    guncelle();
    window.addEventListener("online", guncelle);
    window.addEventListener("offline", guncelle);
    return () => {
      window.removeEventListener("online", guncelle);
      window.removeEventListener("offline", guncelle);
    };
  }, []);

  // Konum bulununca doğru ilin verisini indir.
  useEffect(() => {
    if (durum.tip !== "bulundu" || secIl) return;
    const adaylar = ilAdaylari(iller, durum.enlem, durum.boylam);
    if (!adaylar.length) return;
    setSecIl(adaylar[0]);
    void ilYukle(adaylar[0].plaka);
  }, [durum, iller, secIl, ilYukle]);

  /**
   * HARİTAYA BAKMAK VERİYİ İNDİRİR — konum izni gerekmez.
   *
   * Önceki sürümde harita açılışta bomboştu ve kullanıcı konum iznini
   * vermeden hiçbir toplanma alanı göremiyordu. Artık: ülke görünümünde il
   * rozetleri, yakınlaşınca görünen illerin gerçek noktaları iner.
   *
   * ⚠️ En fazla 3 il: ülke görünümüne yakın bir kutu 8 ilin dosyasını birden
   * indirtebilir (~200 KB) ve bu, ürünün "kötü bağlantıda çalışır" iddiasını
   * doğrudan çürütür. Yakınlaşma eşiği zaten bunu büyük ölçüde engelliyor,
   * bu sınır ikinci emniyet.
   */
  const gorunumDegisti = useCallback(
    ({ zoom, kutu }: { zoom: number; kutu: [number, number, number, number] }) => {
      if (zoom < NOKTA_YAKINLASMASI) return;
      const [bati, guney, dogu, kuzey] = kutu;
      const kesisen = iller.filter((il) => {
        if (!il.kutu) return false;
        const [b, g, d, k] = il.kutu;
        return !(d < bati || b > dogu || k < guney || g > kuzey);
      });
      for (const il of kesisen.slice(0, 3)) void ilYukle(il.plaka);
    },
    [iller, ilYukle]
  );

  /** Ülke görünümündeki il rozetleri — `ozet.json`'dan, ek istek yok. */
  const ilIsaretleri = useMemo<IlIsareti[]>(
    () =>
      (ozet?.iller ?? [])
        .filter((il) => il.merkez)
        .map((il) => ({
          plaka: il.plaka,
          il: il.il,
          alan: il.alan,
          merkez: il.merkez as [number, number],
        })),
    [ozet]
  );

  const yakinlar: YakinAlan[] = useMemo(() => {
    if (durum.tip !== "bulundu" || !alanlar.length) return [];
    return enYakinlar({ enlem: durum.enlem, boylam: durum.boylam }, alanlar, 3);
  }, [durum, alanlar]);

  const konum = durum.tip === "bulundu" ? { enlem: durum.enlem, boylam: durum.boylam } : null;

  /** Yalnız Kandilli'nin bildirdiği depremler — haritada "*" ile işaretli. */
  const koeriSayisi = depremler.filter((d) => d.kaynak === "KOERI").length;
  /**
   * İki kurumun 0,2+ ayrıştığı depremler. Gizlemek yerine sayısını yazıyoruz:
   * büyüklük tek bir kesin sayı değil, farklı ağların farklı ölçümü.
   * Ölçüldü (2026-08-07): Marmaris depremi AFAD'da M4,1, Kandilli'de M3,5.
   */
  const ayrisan = depremler.filter(
    (d) =>
      d.kandilliBuyukluk != null && Math.abs(d.kandilliBuyukluk - d.buyukluk) >= 0.2
  ).length;

  return (
    <div className="flex h-dvh flex-col">
      <ServisCalisani />
      {/* Başlık SARMALI: dar ekranda eylemler ikinci satıra iner.
          Tek satırda tutmak için bir eylemi gizlemek (örn. deprem katmanını
          mobilde kaldırmak) telefonu birincil cihaz olan bir afet
          uygulamasında özellik kaybıdır — satır eklemek daha ucuz. */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-cizgi bg-zemin px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Marka anayasası §5: wordmark bir GÖRSELDİR, tipografi değil —
              metinle dizilmez, gerçek asset kullanılır. */}
          <img
            src="/marka/geogow-wordmark.png"
            alt="GeoGow"
            width={172}
            height={36}
            className="h-[30px] w-auto"
          />
          {/* Slogan yalnız geniş ekranda: mobilde başlık çubuğundaki yeri
              "Afet anı" bağlantısına bırakıyor. Bilgi değil süs olan tek
              öğe bu, o yüzden düşen de bu oldu. */}
          <p className="hidden text-xs text-metin-3 sm:block">
            Toplanma alanları ve acil durum haritası
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Afet anı ekranı: sıfır JS, çevrimdışı çalışır. Haritadan bile
              önce gelen soru "şu an ne yapmalıyım" olduğu için başlıkta. */}
          <Link
            href="/afet-ani"
            className="flex min-h-[44px] items-center rounded-lg border border-uyari/50 px-3 text-sm font-medium text-uyari"
          >
            Afet anı
          </Link>
          {/* Katman anahtarları başlıkta DEĞİL, haritanın üstünde: ikinci
              katman gelince başlık dar ekranda taşıyordu ve katman kontrolü
              zaten haritaya ait bir araçtır. */}
          <Link href="/hazirlik" className="text-sm text-vurgu underline">
            Hazırlık
          </Link>
          <Link href="/dusuk" className="text-sm text-vurgu underline">
            Metin
          </Link>
        </div>
      </header>

      {cevrimdisi && (
        <div
          role="status"
          className="border-b border-uyari/40 bg-uyari/10 px-4 py-2 text-xs text-metin-2"
        >
          <strong className="text-metin">Çevrimdışısın.</strong> Toplanma alanları
          telefonuna kayıtlı kopyadan gösteriliyor — güncel olmayabilir.
        </div>
      )}

      {depremAcik && (
        <div
          role="status"
          className="border-b border-cizgi bg-zemin-2 px-4 py-2 text-xs text-metin-2"
        >
          {depremDurumu === "yukleniyor" && "AFAD'dan son 24 saat çekiliyor…"}
          {depremDurumu === "hata" &&
            "AFAD verisine şu an ulaşılamıyor — toplanma alanları etkilenmez."}
          {depremDurumu === "tamam" && depremler.length === 0 &&
            "Son 24 saatte M2,0 üzeri kayıt yok."}
          {depremDurumu === "tamam" && depremler.length > 0 && (
            <>
              Son 24 saatte <strong className="text-metin">{depremler.length}</strong>{" "}
              deprem (M2,0+) · en büyüğü{" "}
              <strong className="text-metin">
                M{Math.max(...depremler.map((d) => d.buyukluk)).toFixed(1).replace(".", ",")}
              </strong>{" "}
              {depremler.reduce((a, b) => (b.buyukluk > a.buyukluk ? b : a)).yer} ·{" "}
              {zamanYazisi(depremler.reduce((a, b) => (b.buyukluk > a.buyukluk ? b : a)).zaman)}
              {" · kaynak AFAD"}
              {koeriSayisi > 0 && (
                <>
                  {" ve Kandilli · "}
                  <strong className="text-metin">{koeriSayisi}</strong>
                  {"'i (*) yalnız Kandilli'de"}
                </>
              )}
              {ayrisan > 0 && (
                <>
                  {" · "}
                  <strong className="text-metin">{ayrisan}</strong>
                  {" depremde iki kurumun büyüklüğü farklı"}
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="relative flex-1">
        <Harita
          alanlar={alanlar}
          depremler={depremAcik ? depremler : []}
          altyapi={altyapiAcik ? altyapi : []}
          ilIsaretleri={ilIsaretleri}
          konum={konum}
          secili={secili}
          onSec={setSecili}
          onGorunum={gorunumDegisti}
          onIlSec={ilYukle}
        />

        {/* ── KATMANLAR ──
         * Başlıklı panel: "hangi katman ne" sorusunun cevabı renk örneği,
         * ad ve açık/kapalı işaretiyle aynı anda görünür. Önceki sürümde
         * iki isimsiz düğme vardı ve hangi rengin hangisi olduğu ancak
         * katman açılınca anlaşılıyordu. */}
        <div className="pointer-events-auto absolute right-3 top-3 w-[13.5rem] overflow-hidden rounded-xl border border-cizgi bg-zemin-2/95 backdrop-blur">
          <p className="border-b border-cizgi px-3 py-2 text-xs font-semibold text-metin-2">
            Katmanlar
          </p>

          <KatmanSatiri
            acik={depremAcik}
            onDegis={() => setDepremAcik((a) => !a)}
            renk="#ff5d5d"
            ad="Son depremler"
            aciklama="AFAD ve Kandilli, son 24 saat"
          />
          {depremAcik && (
            <p className="border-b border-cizgi bg-zemin px-3 py-2 text-xs text-metin-3">
              Daire büyüklüğü depremin büyüklüğünü gösterir.{" "}
              <strong className="text-metin-2">*</strong> işaretli olanları yalnız
              Kandilli bildirdi.
            </p>
          )}

          <KatmanSatiri
            acik={altyapiAcik}
            onDegis={() => setAltyapiAcik((a) => !a)}
            renk={TUR_BILGISI.h.renk}
            ad="Hastane ve itfaiye"
            aciklama="Sağlık merkezleri dahil"
          />
          {altyapiAcik && (
            <div
              role="status"
              className="border-b border-cizgi bg-zemin px-3 py-2 text-xs text-metin-2"
            >
              {altyapiDurumu === "bos" &&
                "Haritada bir ile yakınlaş ya da konumunu bul."}
              {altyapiDurumu === "yukleniyor" && "Noktalar indiriliyor…"}
              {altyapiDurumu === "hata" && "Altyapı verisi indirilemedi."}
              {altyapiDurumu === "yok" && (
                <>
                  Bu il için veri henüz toplanmadı —{" "}
                  <strong className="text-metin">
                    &ldquo;burada hastane yok&rdquo; demek değil
                  </strong>
                  .
                </>
              )}
              {altyapiDurumu === "tamam" && (
                <>
                  <ul className="space-y-1">
                    {(["h", "i", "s"] as const).map((tur) => (
                      <li key={tur} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-zemin"
                          style={{ background: TUR_BILGISI[tur].renk }}
                        >
                          {tur === "h" ? "H" : tur === "i" ? "İ" : "S"}
                        </span>
                        {/* ⚠️ `.toLowerCase()` KULLANILMAZ: "İtfaiye" →
                            "i̇tfaiye" (noktalı i + birleşen nokta) çıkıyor. */}
                        <span className="tabular-nums">
                          {altyapiSayim[tur] ?? 0} {TUR_BILGISI[tur].ad}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-metin-3">
                    OpenStreetMap (ODbL) · liste eksik olabilir
                  </p>
                </>
              )}
            </div>
          )}

          {/* Toplanma alanı katmanı kapatılamaz: ürünün kendisi o. Yine de
              lejantta yer alır, yoksa yeşil noktaların ne olduğu yazmaz. */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: "#35c48a" }}
            />
            <span className="min-w-0">
              <span className="block text-sm text-metin">Toplanma alanları</span>
              <span className="hidden text-xs text-metin-3 sm:block">
                AFAD kaydı · her zaman açık
              </span>
            </span>
          </div>
        </div>

        {/* ── Tek birincil eylem ── */}
        {durum.tip !== "bulundu" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="pointer-events-auto mx-auto max-w-md rounded-xl border border-cizgi bg-zemin-2/95 p-4 backdrop-blur">
              <button
                type="button"
                onClick={konumBul}
                disabled={durum.tip === "araniyor"}
                /* Turkuaz üzerine beyaz yazı kontrastı 1,60 (okunmaz);
                   ölçülen koyu ton 10,21 veriyor. */
                className="min-h-[52px] w-full rounded-lg bg-marka px-4 text-base font-semibold text-marka-uzeri disabled:opacity-60"
              >
                {durum.tip === "araniyor"
                  ? "Konum aranıyor…"
                  : "En yakın toplanma alanını bul"}
              </button>
              <p className="mt-3 text-xs text-metin-3">
                Konumun <strong className="text-metin-2">cihazından çıkmaz</strong> —
                sunucuya gönderilmez, saklanmaz. Arama telefonun içinde yapılır.
              </p>
              {durum.tip === "hata" && (
                <p role="alert" className="mt-3 text-sm text-uyari">
                  {durum.mesaj}
                </p>
              )}
              <p className="mt-3 text-xs text-metin-3">
                Konum kullanmadan aramak için{" "}
                <Link href="/dusuk" className="text-vurgu underline">
                  il ve mahalle seç
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* ── Sonuç paneli ── */}
        {durum.tip === "bulundu" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 max-h-[60%] overflow-y-auto p-3">
            <div className="pointer-events-auto mx-auto max-w-md rounded-xl border border-cizgi bg-zemin-2/95 p-4 backdrop-blur">
              {yukleniyor && <p className="text-sm text-metin-2">Alanlar indiriliyor…</p>}

              {!yukleniyor && !yakinlar.length && (
                <p className="text-sm text-metin-2">
                  Bulunduğun bölge için henüz veri toplamadık.{" "}
                  <strong className="text-metin">
                    Bu &ldquo;burada alan yok&rdquo; demek değil
                  </strong>{" "}
                  — o ilin hasadı sırada.{" "}
                  <Link href="/dusuk" className="text-vurgu underline">
                    Yayındaki iller
                  </Link>
                </p>
              )}

              {yakinlar.length > 0 && (
                <>
                  <h2 className="font-semibold text-metin">
                    Sana en yakın {yakinlar.length} toplanma alanı
                    {secIl ? ` · ${secIl.il}` : ""}
                  </h2>
                  <ol className="mt-2 space-y-2">
                    {yakinlar.map((alan) => (
                      <li key={alan.id}>
                        <button
                          type="button"
                          onClick={() => setSecili(alan.id)}
                          aria-pressed={secili === alan.id}
                          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-left ${
                            secili === alan.id
                              ? "border-vurgu bg-zemin-3"
                              : "border-cizgi bg-zemin"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="font-medium text-guvenli">{alan.ad}</span>
                            <span className="shrink-0 text-sm text-metin-2">
                              {mesafeYazisi(alan.mesafeM)} · {alan.yon}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-xs text-metin-3">
                            yürüyerek ~{alan.yurumeDk} dk
                            {alan.tabelaKod ? ` · tabela ${alan.tabelaKod}` : ""}
                            {alan.alanM2 ? ` · ${alanYazisi(alan.alanM2)}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-metin-3">
                    Mesafeler <strong className="text-metin-2">kuş uçuşudur</strong>;
                    yürüme yolu daha uzun olabilir. Resmî uyarı değildir — 112 · AFAD 122.
                  </p>

                  <CevrimdisiKayit
                    plaka={secIl?.plaka ?? null}
                    ilAdi={secIl?.il ?? null}
                    ilSlug={secIl?.slug ?? null}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
