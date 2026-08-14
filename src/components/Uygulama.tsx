"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  kompakttanAlan,
  enYakinlar,
  mesafeYazisi,
  alanYazisi,
  yurumeDakika,
  type Alan,
  type IlVerisi,
  type YakinAlan,
} from "@/lib/alan";
import { mesafeM, pusulaYonu, yonAcisi } from "@/lib/geo";
import { ilAdaylari, type IlAdayi } from "@/lib/ilSecimi";
import { ILLER, katla } from "@/lib/iller";
import CevrimdisiKayit from "./CevrimdisiKayit";
import ServisCalisani from "./ServisCalisani";
import UstMenu from "./UstMenu";
import { zamanYazisi, type Deprem } from "@/lib/deprem";
import { kompakttanNokta, TUR_BILGISI, type Nokta } from "@/lib/altyapi";
import type { Isi } from "@/lib/yangin";
import type { IlSicakligi } from "@/lib/sicaklik";
// ⚠️ Eşik ve tip `Harita.tsx`ten DEĞİL buradan alınır: oradan statik import
// etmek maplibre-gl'i ana pakete geri çeker ve kod bölmeyi yok eder.
import { NOKTA_YAKINLASMASI, type IlIsareti } from "@/lib/haritaAyar";
import type { HaritaApi } from "./Harita";
import type { Ozet } from "@/lib/veri";

// Harita motoru ayrı parça: arayüz MapLibre'yi BEKLEMEZ.
const Harita = dynamic(() => import("./Harita"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#d4e6f4]" aria-hidden />,
});

/** Haritadaki pinlerle aynı yeşil (Harita.tsx `ALAN_YESILI`). Statik import
 *  maplibre'yi ana pakete çekeceği için değer burada tekrarlanır. */
const ALAN_YESILI = "#0b8457";

/**
 * Katman çipi — Google Haritalar'ın üst çip dizisinin karşılığı.
 * Eski sürümde sabit bir "Katmanlar" paneli haritanın üçte birini
 * kapatıyordu; çipler tek satır ve kaydırılabilir.
 * Açık durum yalnız renkle verilmez: dolgu + onay imi birlikte.
 */
function KatmanCipi({
  acik,
  onDegis,
  renk,
  ad,
  sayi,
}: {
  acik: boolean;
  onDegis: () => void;
  renk: string;
  ad: string;
  sayi?: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onDegis}
      aria-pressed={acik}
      className={`flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] leading-none shadow-sm transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${
        acik
          ? "border-transparent text-white"
          : "border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f6f7f8]"
      }`}
      style={acik ? { background: renk } : undefined}
    >
      {acik ? (
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden>
          <path
            d="M2.5 6.2l2.4 2.4 4.6-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: renk }} />
      )}
      <span className="whitespace-nowrap">{ad}</span>
      {acik && sayi != null && (
        <span className="whitespace-nowrap font-semibold tabular-nums">· {sayi}</span>
      )}
    </button>
  );
}

/** Sheet içindeki katman durum satırı — dürüstlük notları burada yaşar. */
function KatmanDurumu({ renk, children }: { renk: string; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-[#5f6368]">
      <span
        aria-hidden
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ background: renk }}
      />
      <span className="min-w-0">{children}</span>
    </p>
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
   * İNDİRİLMİŞ İLLER — plaka → alanlar. Haritada gezinirken de veri iner:
   * kullanıcı konum izni vermeden, sadece bakarak toplanma alanlarını görür.
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
  const [yanginAcik, setYanginAcik] = useState(false);
  const [yanginlar, setYanginlar] = useState<Isi[]>([]);
  const [yanginDurumu, setYanginDurumu] = useState<"bos" | "yukleniyor" | "hata" | "tamam">(
    "bos"
  );
  const [sicaklikAcik, setSicaklikAcik] = useState(false);
  const [sicakliklar, setSicakliklar] = useState<IlSicakligi[]>([]);
  const [sicaklikDurumu, setSicaklikDurumu] = useState<
    "bos" | "yukleniyor" | "hata" | "tamam"
  >("bos");
  const [altyapiAcik, setAltyapiAcik] = useState(false);
  const [altyapiVerileri, setAltyapiVerileri] = useState<Record<number, Nokta[]>>({});
  const [altyapiDurumu, setAltyapiDurumu] = useState<
    "bos" | "yukleniyor" | "hata" | "tamam"
  >("bos");
  /** Yakınlaşınca görünen (en fazla 3) ilin plakaları — altyapı bununla iner. */
  const [gorunenPlakalar, setGorunenPlakalar] = useState<number[]>([]);
  const [arama, setArama] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);
  const [paylasilabilir, setPaylasilabilir] = useState(false);
  const haritaApiRef = useRef<HaritaApi | null>(null);
  const izlemeRef = useRef<number | null>(null);
  /** Alt kartın yüksekliği — konum düğmesi kartın hemen üstünde durur. */
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetYuksekligi, setSheetYuksekligi] = useState(180);

  useEffect(() => {
    setPaylasilabilir(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    const kutu = sheetRef.current;
    if (!kutu || typeof ResizeObserver === "undefined") return;
    const gozle = new ResizeObserver(() => setSheetYuksekligi(kutu.offsetHeight));
    gozle.observe(kutu);
    return () => gozle.disconnect();
  }, []);

  /**
   * Deprem katmanı YALNIZ açıkken çekilir — kapalı katman için ağ isteği
   * yapmak kötü bağlantı bütçesini boşa harcar (yangın projesinin dersi).
   */
  const depremIstendiRef = useRef(false);
  useEffect(() => {
    if (!depremAcik || depremIstendiRef.current) return;
    // 🐛 Uçuştaki istek ref ile korunur; durum bağımlılığa konursa efekt
    // yeniden koşup ilk isteği iptal ediyordu ("çekiliyor…"da kalıyordu).
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

  const yanginIstendiRef = useRef(false);
  useEffect(() => {
    if (!yanginAcik || yanginIstendiRef.current) return;
    yanginIstendiRef.current = true;
    setYanginDurumu("yukleniyor");
    fetch("/api/yangin")
      .then((y) => (y.ok ? y.json() : Promise.reject(new Error(String(y.status)))))
      .then((v) => {
        setYanginlar(v.noktalar ?? []);
        setYanginDurumu("tamam");
      })
      .catch(() => {
        yanginIstendiRef.current = false;
        setYanginDurumu("hata");
      });
  }, [yanginAcik]);

  /**
   * Sıcaklık: 81 il = 81 ayrı MGM isteği ve MGM eşzamanlılığı cezalandırıyor,
   * bu yüzden ilk yanıt EKSİK gelebilir. Liste tamam değilse BİR KEZ yeniden
   * sorulur (ölçüldü: 21 → 79 → 81 il).
   */
  const sicaklikIstendiRef = useRef(false);
  useEffect(() => {
    if (!sicaklikAcik || sicaklikIstendiRef.current) return;
    sicaklikIstendiRef.current = true;
    setSicaklikDurumu("yukleniyor");
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;

    const cek = (tekrarHakki: number) =>
      fetch("/api/sicaklik")
        .then((y) => (y.ok ? y.json() : Promise.reject(new Error(String(y.status)))))
        .then((v) => {
          setSicakliklar(v.iller ?? []);
          setSicaklikDurumu("tamam");
          if (tekrarHakki > 0 && (v.olcumsuzIl ?? 0) > 0) {
            zamanlayici = setTimeout(() => cek(tekrarHakki - 1), 35_000);
          }
        })
        .catch(() => {
          sicaklikIstendiRef.current = false;
          setSicaklikDurumu("hata");
        });

    cek(1);
    return () => {
      if (zamanlayici) clearTimeout(zamanlayici);
    };
  }, [sicaklikAcik]);

  /**
   * Acil altyapı: yalnız AÇIKKEN ve görünürde il varken iner.
   *
   * 🐛 Eski sürüm YALNIZ `secIl`e bakıyordu — o da sadece konum akışında
   * doluyordu. Yani konum izni vermeyen kullanıcı katmanı açınca sonsuza
   * kadar boş bakıyordu: "bazı katmanlar gözükmüyor" şikayetinin kaynağı.
   * Artık haritada görünen iller (toplanma verisiyle aynı eşik) da sayılır.
   */
  const altyapiInenRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!altyapiAcik) return;
    const hedefler = new Set<number>(gorunenPlakalar);
    if (secIl) hedefler.add(secIl.plaka);
    if (!hedefler.size) {
      setAltyapiDurumu((d) => (d === "tamam" ? d : "bos"));
      return;
    }
    const yeniler = [...hedefler].filter((p) => !altyapiInenRef.current.has(p));
    if (!yeniler.length) return;
    for (const p of yeniler) altyapiInenRef.current.add(p);
    setAltyapiDurumu("yukleniyor");
    void Promise.all(
      yeniler.map(async (p) => {
        try {
          const y = await fetch(`/data/altyapi/${p}.min.json`);
          // 404 = o il için henüz hasat yok. Bu "orada hastane yok" DEĞİLDİR.
          if (y.status === 404) return { p, noktalar: [] as Nokta[] };
          if (!y.ok) throw new Error(String(y.status));
          const v = await y.json();
          return { p, noktalar: ((v.n ?? []) as Parameters<typeof kompakttanNokta>[0][]).map(kompakttanNokta) };
        } catch {
          altyapiInenRef.current.delete(p); // tekrar denenebilsin
          return { p, noktalar: null };
        }
      })
    ).then((sonuclar) => {
      const basarili = sonuclar.filter((s) => s.noktalar !== null);
      if (basarili.length) {
        setAltyapiVerileri((o) => {
          const kopya = { ...o };
          for (const s of basarili) kopya[s.p] = s.noktalar as Nokta[];
          return kopya;
        });
      }
      setAltyapiDurumu(basarili.length ? "tamam" : "hata");
    });
  }, [altyapiAcik, gorunenPlakalar, secIl]);

  const altyapi = useMemo<Nokta[]>(
    () => Object.values(altyapiVerileri).flat(),
    [altyapiVerileri]
  );
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
   */
  const inenIllerRef = useRef<Set<number>>(new Set());
  const ilYukle = useCallback(async (plaka: number) => {
    if (inenIllerRef.current.has(plaka)) return;
    inenIllerRef.current.add(plaka);
    setYukleniyor(true);
    try {
      const yanit = await fetch(`/data/toplanma/${plaka}.min.json`);
      if (!yanit.ok) throw new Error(String(yanit.status));
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
              "Konum izni verilmedi. Sorun değil — ilini arayarak ya da haritada gezerek de bulabilirsin.",
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
   * Çevrimdışı durumu iki kaynaktan gelir: SW başlığı + navigator.onLine.
   * İkincisi gerekli çünkü tarayıcının HTTP önbelleği isteği karşılayınca SW
   * ağ hatası görmüyor ve başlık hiç eklenmiyor (ölçüldü).
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
   * ⚠️ En fazla 3 il: ülke görünümüne yakın bir kutu 8 ilin dosyasını birden
   * indirtebilir (~200 KB) ve "kötü bağlantıda çalışır" iddiasını çürütür.
   */
  const gorunumDegisti = useCallback(
    ({ zoom, kutu }: { zoom: number; kutu: [number, number, number, number] }) => {
      if (zoom < NOKTA_YAKINLASMASI) {
        setGorunenPlakalar((o) => (o.length ? [] : o));
        return;
      }
      const [bati, guney, dogu, kuzey] = kutu;
      const kesisen = iller
        .filter((il) => {
          if (!il.kutu) return false;
          const [b, g, d, k] = il.kutu;
          return !(d < bati || b > dogu || k < guney || g > kuzey);
        })
        .slice(0, 3);
      for (const il of kesisen) void ilYukle(il.plaka);
      const plakalar = kesisen.map((il) => il.plaka);
      setGorunenPlakalar((o) =>
        o.length === plakalar.length && o.every((p, i) => p === plakalar[i]) ? o : plakalar
      );
    },
    [iller, ilYukle]
  );

  /** Ülke görünümündeki il noktaları — `ozet.json`'dan, ek istek yok. */
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

  /** Seçili alan + (konum varsa) mesafe bilgisi. */
  const seciliAlan = useMemo(() => {
    if (secili == null) return null;
    const alan = alanlar.find((a) => a.id === secili);
    if (!alan) return null;
    if (!konum) return { alan, mesafe: null as null | { m: number; yon: string; dk: number } };
    const m = mesafeM(konum.enlem, konum.boylam, alan.enlem, alan.boylam);
    return {
      alan,
      mesafe: {
        m,
        yon: pusulaYonu(yonAcisi(konum.enlem, konum.boylam, alan.enlem, alan.boylam)),
        dk: yurumeDakika(m),
      },
    };
  }, [secili, alanlar, konum]);

  /**
   * ARAMA — 81 ilin tamamı listede; yayında olmayan il "hazırlanıyor" diye
   * DÜRÜSTÇE işaretlenir, gizlenmez. Eşleşme Türkçe katlamayla (İ/ı tuzağı).
   */
  const ozetPlakalari = useMemo(
    () => new Map(iller.map((il) => [il.plaka, il])),
    [iller]
  );
  const alanSayilari = useMemo(
    () => new Map((ozet?.iller ?? []).map((il) => [il.plaka, il.alan])),
    [ozet]
  );
  const aramaSonuclari = useMemo(() => {
    const q = katla(arama.trim());
    if (!q) return { iller: [] as { plaka: number; ad: string; yayinda: IlAdayi | null }[], alanlar: [] as Alan[] };
    const ilSonuc = ILLER.filter((il) => katla(il.ad).includes(q))
      .map((il) => ({ plaka: il.plaka, ad: il.ad, yayinda: ozetPlakalari.get(il.plaka) ?? null }))
      .sort((a, b) => Number(Boolean(b.yayinda)) - Number(Boolean(a.yayinda)))
      .slice(0, 6);
    const alanSonuc =
      q.length >= 2
        ? alanlar.filter((a) => katla(a.ad).includes(q)).slice(0, 4)
        : [];
    return { iller: ilSonuc, alanlar: alanSonuc };
  }, [arama, ozetPlakalari, alanlar]);

  const ilSec = useCallback(
    (il: IlAdayi) => {
      setArama("");
      setAramaAcik(false);
      void ilYukle(il.plaka);
      if (il.merkez) haritaApiRef.current?.git(il.merkez[0], il.merkez[1], NOKTA_YAKINLASMASI + 0.6);
    },
    [ilYukle]
  );

  /** Sheet'te hangi içerik: seçili alan kartı > en yakın listesi > başlangıç. */
  const sheetIcerigi: "alan" | "liste" | "bos" = seciliAlan
    ? "alan"
    : durum.tip === "bulundu"
      ? "liste"
      : "bos";

  const katmanAktif = depremAcik || yanginAcik || sicaklikAcik || altyapiAcik;

  /** Yalnız Kandilli'nin bildirdiği depremler — haritada "*" ile işaretli. */
  const koeriSayisi = depremler.filter((d) => d.kaynak === "KOERI").length;
  const ayrisan = depremler.filter(
    (d) =>
      d.kandilliBuyukluk != null && Math.abs(d.kandilliBuyukluk - d.buyukluk) >= 0.2
  ).length;
  const enBuyukDeprem = depremler.length
    ? depremler.reduce((a, b) => (b.buyukluk > a.buyukluk ? b : a))
    : null;

  const yolTarifi = (alan: Alan) =>
    `https://www.google.com/maps/dir/?api=1&destination=${alan.enlem},${alan.boylam}&travelmode=walking`;

  const paylas = useCallback((alan: Alan) => {
    void navigator
      .share({
        title: alan.ad,
        text: `${alan.ad} — toplanma alanı`,
        url: `https://www.google.com/maps/search/?api=1&query=${alan.enlem},${alan.boylam}`,
      })
      .catch(() => {
        /* kullanıcı vazgeçti — hata değil */
      });
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <ServisCalisani />
      {/* Harita sayfası da içerik sayfalarıyla AYNI menüyü kullanır.
          ⚠️ Burada süslü parantez ŞART: JSX çocuk konumunda düz blok yorumu
          sayfaya metin olarak basılır. */}
      <UstMenu aktif="/" />

      {cevrimdisi && (
        <div
          role="status"
          className="border-b border-uyari/40 bg-uyari/10 px-4 py-2 text-xs text-metin-2"
        >
          <strong className="text-metin">Çevrimdışısın.</strong> Toplanma alanları
          telefonuna kayıtlı kopyadan gösteriliyor — güncel olmayabilir.
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <Harita
          alanlar={alanlar}
          depremler={depremAcik ? depremler : []}
          altyapi={altyapiAcik ? altyapi : []}
          yanginlar={yanginAcik ? yanginlar : []}
          sicakliklar={sicaklikAcik ? sicakliklar : []}
          ilIsaretleri={ilIsaretleri}
          konum={konum}
          secili={secili}
          onSec={setSecili}
          onGorunum={gorunumDegisti}
          onIlSec={ilYukle}
          onHazir={(api) => {
            haritaApiRef.current = api;
          }}
        />

        {/* ── ÜST KATMAN: arama + çipler (Google düzeni) ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
          <div className="pointer-events-auto relative mx-auto w-full max-w-md sm:mx-0">
            <div className="flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-4 shadow-md">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden className="shrink-0 text-[#5f6368]">
                <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={arama}
                onChange={(o) => {
                  setArama(o.target.value);
                  setAramaAcik(true);
                }}
                onFocus={() => setAramaAcik(true)}
                onBlur={() => setAramaAcik(false)}
                onKeyDown={(o) => {
                  if (o.key === "Escape") setAramaAcik(false);
                  if (o.key === "Enter") {
                    const ilk = aramaSonuclari.iller.find((s) => s.yayinda);
                    if (ilk?.yayinda) ilSec(ilk.yayinda);
                  }
                }}
                placeholder="İlini ara — en yakın alanı gör"
                aria-label="İl veya toplanma alanı ara"
                className="min-h-[46px] w-full bg-transparent text-[15px] text-[#202124] outline-none placeholder:text-[#80868b]"
              />
              {arama && (
                <button
                  type="button"
                  onClick={() => setArama("")}
                  aria-label="Aramayı temizle"
                  className="shrink-0 cursor-pointer rounded-full p-1 text-[#5f6368] hover:bg-[#f1f3f4]"
                >
                  <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {aramaAcik && arama.trim() && (
              /* onMouseDown blur'dan önce çalışır — satır tıklaması kaybolmasın. */
              <div
                onMouseDown={(o) => o.preventDefault()}
                className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#dadce0] bg-white py-1 shadow-lg"
              >
                {!aramaSonuclari.iller.length && !aramaSonuclari.alanlar.length && (
                  <p className="px-4 py-3 text-sm text-[#5f6368]">
                    Sonuç yok. İl adıyla aramayı dene.
                  </p>
                )}
                {aramaSonuclari.iller.map((s) =>
                  s.yayinda ? (
                    <button
                      key={s.plaka}
                      type="button"
                      onClick={() => s.yayinda && ilSec(s.yayinda)}
                      className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-4 text-left hover:bg-[#f6f7f8]"
                    >
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: ALAN_YESILI }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[15px] text-[#202124]">
                        {s.ad}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-[#5f6368]">
                        {(alanSayilari.get(s.plaka) ?? 0).toLocaleString("tr-TR")} alan
                      </span>
                    </button>
                  ) : (
                    <div
                      key={s.plaka}
                      className="flex min-h-[44px] w-full items-center gap-3 px-4 opacity-70"
                    >
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#dadce0]" />
                      <span className="min-w-0 flex-1 truncate text-[15px] text-[#5f6368]">{s.ad}</span>
                      <span className="shrink-0 text-xs text-[#80868b]">hazırlanıyor</span>
                    </div>
                  )
                )}
                {aramaSonuclari.alanlar.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSecili(a.id);
                      setArama("");
                      setAramaAcik(false);
                      haritaApiRef.current?.git(a.enlem, a.boylam, 15.5);
                    }}
                    className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-4 text-left hover:bg-[#f6f7f8]"
                  >
                    <svg viewBox="0 0 24 36" width="13" height="19" aria-hidden className="shrink-0">
                      <path
                        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"
                        fill={ALAN_YESILI}
                      />
                      <circle cx="12" cy="12" r="5" fill="#fff" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-[#202124]">{a.ad}</span>
                    <span className="shrink-0 text-xs text-[#5f6368]">toplanma alanı</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pointer-events-auto mt-2 flex gap-2 overflow-x-auto pb-1 cip-seridi sm:max-w-xl">
            <KatmanCipi
              acik={depremAcik}
              onDegis={() => setDepremAcik((a) => !a)}
              renk="#d93025"
              ad="Depremler"
              sayi={depremDurumu === "tamam" ? depremler.length : null}
            />
            <KatmanCipi
              acik={yanginAcik}
              onDegis={() => setYanginAcik((a) => !a)}
              renk="#e8710a"
              ad="Isı noktaları"
              sayi={yanginDurumu === "tamam" ? yanginlar.length : null}
            />
            <KatmanCipi
              acik={sicaklikAcik}
              onDegis={() => setSicaklikAcik((a) => !a)}
              renk="#b26a00"
              ad="Sıcaklık"
              sayi={sicaklikDurumu === "tamam" ? sicakliklar.length : null}
            />
            <KatmanCipi
              acik={altyapiAcik}
              onDegis={() => setAltyapiAcik((a) => !a)}
              renk="#00758c"
              ad="Sağlık · itfaiye"
              sayi={altyapiDurumu === "tamam" ? altyapi.length : null}
            />
          </div>

          {yukleniyor && (
            <p
              role="status"
              className="pointer-events-none mx-auto mt-2 w-fit rounded-full bg-white/95 px-3 py-1 text-xs text-[#3c4043] shadow-md"
            >
              Alanlar indiriliyor…
            </p>
          )}
        </div>

        {/* ── SAĞ ALT: konum + (masaüstünde) yakınlaştırma ──
            Telefonda alt kartın hemen üstünde durur (yükseklik ölçülüyor);
            masaüstünde kart ortada yüzdüğü için köşe zaten boş. */}
        <div
          className="absolute right-3 z-20 flex flex-col items-end gap-2 transition-[bottom] duration-200 sm:!bottom-5"
          style={{ bottom: sheetYuksekligi + 14 }}
        >
          <div className="hidden flex-col overflow-hidden rounded-full border border-[#dadce0] bg-white shadow-md sm:flex">
            <button
              type="button"
              onClick={() => haritaApiRef.current?.yaklas()}
              aria-label="Yakınlaştır"
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-xl text-[#3c4043] hover:bg-[#f6f7f8]"
            >
              +
            </button>
            <span aria-hidden className="mx-2 h-px bg-[#e8eaed]" />
            <button
              type="button"
              onClick={() => haritaApiRef.current?.uzaklas()}
              aria-label="Uzaklaştır"
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-2xl leading-none text-[#3c4043] hover:bg-[#f6f7f8]"
            >
              −
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (konum) haritaApiRef.current?.git(konum.enlem, konum.boylam, 15);
              else konumBul();
            }}
            aria-label="Konumumu göster"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[#dadce0] bg-white text-[#1a73e8] shadow-md transition-transform duration-150 active:scale-95"
          >
            {durum.tip === "araniyor" ? (
              <span
                aria-hidden
                className="h-5 w-5 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1a73e8]"
              />
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                <path
                  d="M12 3v3M12 18v3M3 12h3M18 12h3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>

        {/* ── ALT KART (Google'ın alt sayfası) ── */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 sm:bottom-4 sm:flex sm:justify-center">
          <div
            ref={sheetRef}
            className="pointer-events-auto max-h-[62dvh] w-full overflow-y-auto rounded-t-2xl border border-[#dadce0] bg-white text-[#202124] shadow-[0_-6px_24px_rgba(32,33,36,0.18)] sm:w-[27rem] sm:rounded-2xl sm:shadow-xl"
          >
            <div aria-hidden className="flex justify-center pt-2 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-[#dadce0]" />
            </div>

            {sheetIcerigi === "alan" && seciliAlan && (
              <div className="px-4 pb-4 pt-2 sm:pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[17px] font-semibold leading-snug">
                      {seciliAlan.alan.ad}
                    </h2>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      Toplanma alanı
                      {seciliAlan.mesafe && (
                        <>
                          {" · "}
                          <strong className="font-semibold text-[#202124]">
                            {mesafeYazisi(seciliAlan.mesafe.m)}
                          </strong>
                          {` ${seciliAlan.mesafe.yon} · yürüyerek ~${seciliAlan.mesafe.dk} dk`}
                        </>
                      )}
                    </p>
                    {(seciliAlan.alan.tabelaKod || seciliAlan.alan.alanM2) && (
                      <p className="mt-0.5 text-xs text-[#5f6368]">
                        {seciliAlan.alan.tabelaKod
                          ? `Tabela ${seciliAlan.alan.tabelaKod}`
                          : null}
                        {seciliAlan.alan.tabelaKod && seciliAlan.alan.alanM2 ? " · " : null}
                        {alanYazisi(seciliAlan.alan.alanM2)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecili(null)}
                    aria-label="Kartı kapat"
                    className="shrink-0 cursor-pointer rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]"
                  >
                    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={yolTarifi(seciliAlan.alan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-marka px-4 text-[15px] font-semibold text-marka-uzeri transition-transform duration-150 active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path
                        d="M21.7 11.3l-9-9a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-3.5a.5.5 0 0 0-.5.5V15H8v-3a2 2 0 0 1 2-2h4V7.5l3.5 3.5z"
                        fill="currentColor"
                      />
                    </svg>
                    Yol tarifi
                  </a>
                  {paylasilabilir && (
                    <button
                      type="button"
                      onClick={() => paylas(seciliAlan.alan)}
                      className="flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-full border border-[#dadce0] px-4 text-[15px] font-medium text-[#00758c] transition-colors hover:bg-[#f6f7f8]"
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                        <path
                          d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .09.7L8.7 8.26a3 3 0 1 0 0 7.48l6.4 3.56A3 3 0 1 0 18 16a3 3 0 0 0-1.9.68L9.7 13.1a3 3 0 0 0 0-2.2l6.4-3.58A3 3 0 0 0 18 8z"
                          fill="currentColor"
                        />
                      </svg>
                      Paylaş
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#80868b]">
                  Yol tarifi Google Haritalar&apos;da açılır. Mesafe kuş uçuşudur; yürüme
                  yolu daha uzun olabilir.
                </p>
                {yakinlar.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSecili(null)}
                    className="mt-1 cursor-pointer text-sm font-medium text-[#00758c] underline-offset-2 hover:underline"
                  >
                    En yakın alanlar listesine dön
                  </button>
                )}
              </div>
            )}

            {sheetIcerigi === "liste" && (
              <div className="px-4 pb-4 pt-2 sm:pt-4">
                {yukleniyor && !yakinlar.length && (
                  <p className="py-2 text-sm text-[#5f6368]">Alanlar indiriliyor…</p>
                )}

                {!yukleniyor && !yakinlar.length && (
                  <p className="py-2 text-sm text-[#3c4043]">
                    Bulunduğun bölge için henüz veri toplamadık.{" "}
                    <strong>Bu &ldquo;burada alan yok&rdquo; demek değil</strong> — o
                    ilin hasadı sırada.{" "}
                    <Link href="/kapsam" className="text-[#00758c] underline">
                      Yayındaki iller
                    </Link>
                  </p>
                )}

                {yakinlar.length > 0 && (
                  <>
                    <h2 className="text-[15px] font-semibold">
                      Sana en yakın {yakinlar.length} toplanma alanı
                      {secIl ? ` · ${secIl.il}` : ""}
                    </h2>
                    <ol className="mt-2 space-y-1.5">
                      {yakinlar.map((alan, sira) => (
                        <li key={alan.id}>
                          <button
                            type="button"
                            onClick={() => setSecili(alan.id)}
                            className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-xl border border-[#e8eaed] px-3 py-2 text-left transition-colors hover:border-[#dadce0] hover:bg-[#f8f9fa]"
                          >
                            <span
                              aria-hidden
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                              style={{ background: ALAN_YESILI }}
                            >
                              {sira + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-medium text-[#202124]">
                                {alan.ad}
                              </span>
                              <span className="block text-xs text-[#5f6368]">
                                yürüyerek ~{alan.yurumeDk} dk · {alan.yon}
                                {alan.alanM2 ? ` · ${alanYazisi(alan.alanM2)}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-[#202124]">
                              {mesafeYazisi(alan.mesafeM)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#80868b]">
                      Mesafeler kuş uçuşudur; yürüme yolu daha uzun olabilir. Resmî
                      uyarı değildir — acil durumda 112.
                    </p>

                    <CevrimdisiKayit
                      plaka={secIl?.plaka ?? null}
                      ilAdi={secIl?.il ?? null}
                      ilSlug={secIl?.slug ?? null}
                    />
                  </>
                )}
              </div>
            )}

            {sheetIcerigi === "bos" && (
              <div className="px-4 pb-4 pt-2 sm:pt-4">
                <p className="text-sm leading-relaxed text-[#3c4043]">
                  Deprem, yangın ve selde gideceğin{" "}
                  <strong>resmî toplanma alanları</strong> —{" "}
                  {(ozet?.iller.length ?? 0).toLocaleString("tr-TR")} il,{" "}
                  {(ozet?.toplamAlan ?? 0).toLocaleString("tr-TR")} alan yayında.
                </p>
                <button
                  type="button"
                  onClick={konumBul}
                  disabled={durum.tip === "araniyor"}
                  /* Turkuaz üzerine beyaz yazı kontrastı 1,60 (okunmaz);
                     ölçülen koyu ton 10,21 veriyor. */
                  className="mt-3 min-h-[52px] w-full cursor-pointer rounded-full bg-marka px-4 text-base font-semibold text-marka-uzeri transition-transform duration-150 active:scale-[0.985] disabled:opacity-60"
                >
                  {durum.tip === "araniyor"
                    ? "Konum aranıyor…"
                    : "En yakın toplanma alanını bul"}
                </button>
                {durum.tip === "hata" && (
                  <p role="alert" className="mt-2 text-sm text-[#c5221f]">
                    {durum.mesaj}
                  </p>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-[#80868b]">
                  Konumun cihazından çıkmaz — sunucuya gönderilmez, saklanmaz. Konum
                  kullanmadan aramak için yukarıdan ilini yaz ya da{" "}
                  <Link href="/dusuk" className="text-[#00758c] underline">
                    il ve mahalle seç
                  </Link>
                  .
                </p>
              </div>
            )}

            {katmanAktif && (
              <div className="space-y-2 border-t border-[#e8eaed] px-4 py-3">
                {depremAcik && (
                  <KatmanDurumu renk="#d93025">
                    {depremDurumu === "yukleniyor" && "AFAD'dan son 24 saat çekiliyor…"}
                    {depremDurumu === "hata" &&
                      "AFAD verisine şu an ulaşılamıyor — toplanma alanları etkilenmez."}
                    {depremDurumu === "tamam" && depremler.length === 0 &&
                      "Son 24 saatte M2,0 üzeri deprem kaydı yok."}
                    {depremDurumu === "tamam" && enBuyukDeprem && (
                      <>
                        Son 24 saatte {depremler.length} deprem (M2,0+) · en büyüğü M
                        {enBuyukDeprem.buyukluk.toFixed(1).replace(".", ",")}{" "}
                        {enBuyukDeprem.yer} · {zamanYazisi(enBuyukDeprem.zaman)} · kaynak
                        AFAD
                        {koeriSayisi > 0 &&
                          ` ve Kandilli (${koeriSayisi} kayıt * ile yalnız Kandilli'de)`}
                        {ayrisan > 0 &&
                          ` · ${ayrisan} depremde iki kurumun büyüklüğü farklı`}
                      </>
                    )}
                  </KatmanDurumu>
                )}
                {yanginAcik && (
                  <KatmanDurumu renk="#e8710a">
                    {yanginDurumu === "yukleniyor" && "Uydu ısı noktaları indiriliyor…"}
                    {yanginDurumu === "hata" && "Isı noktaları indirilemedi."}
                    {yanginDurumu === "tamam" && (
                      <>
                        {yanginlar.length} ısı noktası (48 saat, NASA FIRMS).{" "}
                        <strong>&ldquo;Yangın var&rdquo; demek değil</strong> — anız ve
                        sanayi bacası da ısı üretir.{" "}
                        <a
                          href="https://yangin.algow.net"
                          className="text-[#00758c] underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Doğrulanmış yangın takibi
                        </a>
                      </>
                    )}
                  </KatmanDurumu>
                )}
                {sicaklikAcik && (
                  <KatmanDurumu renk="#b26a00">
                    {sicaklikDurumu === "yukleniyor" && "MGM ölçümleri alınıyor…"}
                    {sicaklikDurumu === "hata" && "Sıcaklık ölçümleri alınamadı."}
                    {sicaklikDurumu === "tamam" &&
                      `${sicakliklar.length} il merkezi ölçümü (MGM). Bulunduğun yer farklı olabilir.`}
                  </KatmanDurumu>
                )}
                {altyapiAcik && (
                  <KatmanDurumu renk="#00758c">
                    {altyapiDurumu === "bos" &&
                      "Haritada bir şehre yakınlaş ya da konumunu bul."}
                    {altyapiDurumu === "yukleniyor" && "Noktalar indiriliyor…"}
                    {altyapiDurumu === "hata" && "Altyapı verisi indirilemedi."}
                    {altyapiDurumu === "tamam" && altyapi.length === 0 && (
                      <>
                        Görünen iller için veri henüz toplanmadı —{" "}
                        <strong>&ldquo;burada hastane yok&rdquo; demek değil</strong>.
                      </>
                    )}
                    {altyapiDurumu === "tamam" && altyapi.length > 0 && (
                      <>
                        {(["h", "i", "s"] as const)
                          .filter((tur) => (altyapiSayim[tur] ?? 0) > 0)
                          /* ⚠️ `.toLowerCase()` KULLANILMAZ: "İtfaiye" →
                             "i̇tfaiye" (noktalı i + birleşen nokta) çıkıyor. */
                          .map((tur) => `${altyapiSayim[tur]} ${TUR_BILGISI[tur].ad}`)
                          .join(" · ")}
                        {" — haritada H · İ · S harfleriyle. OpenStreetMap (ODbL),"}
                        {" liste eksik olabilir."}
                      </>
                    )}
                  </KatmanDurumu>
                )}
              </div>
            )}

            {/* Harita atfı — MapLibre'nin köşe kutusu telefonda kartın
                arkasında kalıyordu; ODbL atfı burada KALICI görünür. */}
            <p className="border-t border-[#f1f3f4] px-4 py-1.5 text-[10px] text-[#9aa0a6]">
              Harita: ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenStreetMap
              </a>{" "}
              katkıcıları · ©{" "}
              <a
                href="https://carto.com/attributions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                CARTO
              </a>{" "}
              · Toplanma alanı verisi: AFAD (e-Devlet)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
