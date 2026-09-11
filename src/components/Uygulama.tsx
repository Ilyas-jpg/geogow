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
import { mesafeM, pusulaYonu, yonAcisi, yonAdi } from "@/lib/geo";
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
  // Dark Matter'ın zemini — stil gelmeden görünen kare de aynı koyulukta olsun.
  loading: () => <div className="h-full w-full bg-[#0c0c0c]" aria-hidden />,
});

/** Haritadaki pinlerle aynı yeşil (Harita.tsx `ALAN_YESILI`). Statik import
 *  maplibre'yi ana pakete çekeceği için değer burada tekrarlanır. */
/* 2026-09-11: harita koyu altlığa geçince pinler marka yeşiline (#35c48a)
   çıktı; beyaz panelin üstündeki sıra rozetleri ise BEYAZ sayı taşıdığı için
   koyu yeşilde kalır (4,7:1). İki ton aynı "yeşil = toplanma alanı" ailesi. */
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

/**
 * Yön: konuma göre döndürülmüş ok + tam sözcük ("güneydoğu").
 * "GD · K · D" kısaltmaları ezber istiyordu; ok bakışta, sözcük okuyunca
 * anlaşılır (critique 2026-09-10). 0° kuzey, saat yönü.
 */
function YonOku({ derece }: { derece: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <svg
        viewBox="0 0 12 12"
        width="11"
        height="11"
        aria-hidden
        className="shrink-0"
        style={{ transform: `rotate(${Math.round(derece)}deg)` }}
      >
        <path d="M6 1.2L9.6 8.4H6.9V10.8H5.1V8.4H2.4z" fill="currentColor" />
      </svg>
      {yonAdi(derece)}
    </span>
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
  /** `kaynak: "harita"` = konum izni yok, mesafeler haritanın ortasından ölçülür. */
  | { tip: "bulundu"; enlem: number; boylam: number; dogruluk: number; kaynak?: "harita" }
  | { tip: "hata"; mesaj: string };

/**
 * `yayin`: TV / projeksiyon modu (`/yayin`). Menü, arama, çipler ve panel
 * yok; koyu harita + büyük yazı + sağda canlı deprem listesi + saat. Haber
 * kanalı ekrana verdiğinde 3 metreden okunmalı (İlyas, 2026-08-06 hedefi).
 */
export default function Uygulama({ ozet, yayin = false }: { ozet: Ozet | null; yayin?: boolean }) {
  const [durum, setDurum] = useState<Durum>({ tip: "hazir" });
  const durumRef = useRef<Durum>({ tip: "hazir" });
  useEffect(() => {
    durumRef.current = durum;
  }, [durum]);
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
  /** Paylaşım desteklenmeyen tarayıcıda bağlantı panoya kopyalanır; kısa geri bildirim. */
  const [kopyalandi, setKopyalandi] = useState(false);
  /** Görünüm il düzeyine yakınsa "haritanın ortasına göre bul" teklif edilir. */
  const [yakinGorunum, setYakinGorunum] = useState(false);
  /** URL'den gelen `?alan=` — o ilin verisi inince seçilir. */
  const bekleyenAlanRef = useRef<number | null>(null);
  const urlOkunduRef = useRef(false);
  /**
   * Harita hazır olmadan gelen `git` çağrısı burada bekler. URL ile açılışta
   * ilin verisi, haritanın stil dosyasından ÖNCE iniyordu ve çağrı boşa
   * düşüyordu: kart açılıyor, harita ülke görünümünde kalıyordu (ölçüldü).
   */
  const bekleyenGitRef = useRef<{ enlem: number; boylam: number; zoom?: number } | null>(null);
  /** Aramadan/URL'den seçilen ilin slug'ı — adres çubuğuna yazılır. */
  const [urlIl, setUrlIl] = useState<string | null>(null);
  /** Yayın modundaki saat (15 sn'de bir tazelenir). */
  const [saat, setSaat] = useState("");
  const haritaApiRef = useRef<HaritaApi | null>(null);
  const izlemeRef = useRef<number | null>(null);
  /** Alt kartın yüksekliği — konum düğmesi kartın hemen üstünde durur. */
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetYuksekligi, setSheetYuksekligi] = useState(180);

  /**
   * TELEFONDA PANEL KONUMU — kapalı (tutamaç + tek satır) · açık (içerik,
   * en çok 46dvh: harita en az yarım ekran kalır) · tam (85dvh).
   * Önceki sürümde tutamaç süs bir çizgiydi, panel hiç kapanmıyordu ve
   * "en yakın" durumunda ekranın %56'sını alıyordu (critique 2026-09-10).
   * Masaüstünde panel ortada yüzer, konumlar uygulanmaz (`sm:` ezer).
   */
  const [sheetKonum, setSheetKonum] = useState<"kapali" | "acik" | "tam">("acik");
  /** `sm` kesme noktası (640 px, Tailwind ile aynı): panel solda mı altta mı? */
  const [genis, setGenis] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches
  );
  useEffect(() => {
    const sorgu = window.matchMedia("(min-width: 640px)");
    const guncelle = () => setGenis(sorgu.matches);
    guncelle();
    sorgu.addEventListener("change", guncelle);
    return () => sorgu.removeEventListener("change", guncelle);
  }, []);
  /** Katman dürüstlük notları: telefonda katlı, masaüstünde açık başlar. */
  const [katmanDetayAcik, setKatmanDetayAcik] = useState(false);
  const sheetSurukleRef = useRef<{ y: number } | null>(null);
  const sheetIslendiRef = useRef(0);
  const sheetKaydir = useCallback((yon: "yukari" | "asagi") => {
    setSheetKonum((k) =>
      yon === "yukari" ? (k === "kapali" ? "acik" : "tam") : k === "tam" ? "acik" : "kapali"
    );
  }, []);
  const sheetSurukleBasla = useCallback((o: React.PointerEvent<HTMLButtonElement>) => {
    sheetSurukleRef.current = { y: o.clientY };
    o.currentTarget.setPointerCapture?.(o.pointerId);
  }, []);
  const sheetSurukleBitir = useCallback(
    (o: React.PointerEvent<HTMLButtonElement>) => {
      const bas = sheetSurukleRef.current;
      sheetSurukleRef.current = null;
      if (!bas) return;
      const fark = o.clientY - bas.y;
      sheetIslendiRef.current = Date.now();
      if (fark < -40) sheetKaydir("yukari");
      else if (fark > 40) sheetKaydir("asagi");
      else setSheetKonum((k) => (k === "kapali" ? "acik" : "kapali"));
    },
    [sheetKaydir]
  );
  const sheetSurukleIptal = useCallback(() => {
    sheetSurukleRef.current = null;
  }, []);
  /* Dokunma ve fare pointerup'ta işlendi; click yalnız klavye (Enter/Boşluk) için. */
  const sheetDokun = useCallback(() => {
    if (Date.now() - sheetIslendiRef.current < 400) return;
    setSheetKonum((k) => (k === "kapali" ? "acik" : "kapali"));
  }, []);
  useEffect(() => {
    if (secili != null) setSheetKonum((k) => (k === "kapali" ? "acik" : k));
  }, [secili]);
  useEffect(() => {
    if (durum.tip === "bulundu") setSheetKonum((k) => (k === "kapali" ? "acik" : k));
  }, [durum.tip]);
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) setKatmanDetayAcik(true);
  }, []);

  useEffect(() => {
    setPaylasilabilir(typeof navigator !== "undefined" && typeof navigator.share === "function");
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
  const depremYukle = useCallback(() => {
    // Tazelemede eldeki liste durur; "yükleniyor" yalnız ilk çekimde görünür.
    setDepremDurumu((d) => (d === "tamam" ? d : "yukleniyor"));
    return fetch("/api/deprem?saat=24&minmag=2")
      .then((y) => (y.ok ? y.json() : Promise.reject(new Error(String(y.status)))))
      .then((v) => {
        setDepremler(v.depremler ?? []);
        setDepremDurumu("tamam");
      })
      .catch(() => {
        depremIstendiRef.current = false; // tekrar denenebilsin
        setDepremDurumu((d) => (d === "tamam" ? d : "hata"));
      });
  }, []);
  useEffect(() => {
    if (!depremAcik || depremIstendiRef.current) return;
    // 🐛 Uçuştaki istek ref ile korunur; durum bağımlılığa konursa efekt
    // yeniden koşup ilk isteği iptal ediyordu ("çekiliyor…"da kalıyordu).
    depremIstendiRef.current = true;
    void depremYukle();
  }, [depremAcik, depremYukle]);
  /* Yayın modu: deprem katmanı açık başlar ve 2 dakikada bir tazelenir —
     ekranda saatlerce kalan kare bayat veri göstermesin. Saat 15 sn'de bir. */
  useEffect(() => {
    if (!yayin) return;
    setDepremAcik(true);
    const saatYaz = () =>
      setSaat(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    saatYaz();
    const t = setInterval(() => void depremYukle(), 120_000);
    const s = setInterval(saatYaz, 15_000);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, [yayin, depremYukle]);

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
   * HARİTANIN ORTASINA GÖRE — konum izni vermeden. Görünen ilin verisi zaten
   * iniyor; kullanıcı haritayı istediği yere getirir, listede o noktaya en
   * yakın 3 alan çıkar ve harita kaydıkça liste onu izler (critique
   * 2026-09-10 sorusu: "sheet boş durumunda konum sormadan…").
   */
  const merkezdenBul = useCallback(() => {
    const m = haritaApiRef.current?.merkez();
    if (!m) return;
    if (izlemeRef.current != null) {
      navigator.geolocation.clearWatch(izlemeRef.current);
      izlemeRef.current = null;
    }
    setDurum({ tip: "bulundu", enlem: m.enlem, boylam: m.boylam, dogruluk: 0, kaynak: "harita" });
  }, []);

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
    setUrlIl(adaylar[0].slug);
    void ilYukle(adaylar[0].plaka);
  }, [durum, iller, secIl, ilYukle]);

  /**
   * HARİTAYA BAKMAK VERİYİ İNDİRİR — konum izni gerekmez.
   * ⚠️ En fazla 3 il: ülke görünümüne yakın bir kutu 8 ilin dosyasını birden
   * indirtebilir (~200 KB) ve "kötü bağlantıda çalışır" iddiasını çürütür.
   */
  const gorunumDegisti = useCallback(
    ({
      zoom,
      kutu,
      merkez,
    }: {
      zoom: number;
      kutu: [number, number, number, number];
      merkez: { enlem: number; boylam: number };
    }) => {
      setYakinGorunum(zoom >= NOKTA_YAKINLASMASI);
      // Harita merkezi modunda liste haritayı izler: her durmada yeni merkez.
      const d = durumRef.current;
      if (d.tip === "bulundu" && d.kaynak === "harita") {
        setDurum({ tip: "bulundu", enlem: merkez.enlem, boylam: merkez.boylam, dogruluk: 0, kaynak: "harita" });
      }
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

  /** Mesafelerin ölçüldüğü nokta: cihaz konumu ya da haritanın ortası. */
  const referans = useMemo(
    () => (durum.tip === "bulundu" ? { enlem: durum.enlem, boylam: durum.boylam } : null),
    [durum]
  );
  const merkezModu = durum.tip === "bulundu" && durum.kaynak === "harita";
  /** Mavi nokta yalnız gerçek cihaz konumu için; harita merkezi artı ile gösterilir. */
  const konum = merkezModu ? null : referans;

  /**
   * ARAYÜZÜN ÖRTTÜĞÜ KENARLAR (px, harita kabına göre) → haritanın görünür
   * merkezi (MapLibre padding'i). Seçili pin, artı işareti ve "haritanın
   * ortası" ölçümü hep görünür alanda kalır.
   *
   * Telefonda alt kenar = ölçülen panel yüksekliği, panel konumunun tavanıyla
   * sınırlı. Harita merkezi modunda ÖLÇÜM KULLANILMAZ, yalnız tavan: liste
   * içeriği → panel yüksekliği → padding → harita kayması → yeni liste
   * döngüsü kurulmasın (bir satır sarması sonsuz titremeye dönerdi). Tavanın
   * fazlası zararsızdır: artı yalnız biraz yukarıda durur, asla panelin
   * altına girmez. Yayında sağdaki deprem listesi düşülür.
   */
  const dolgu = useMemo(() => {
    if (yayin) return { top: 80, right: 384, bottom: 24, left: 24 };
    if (genis) return { top: 0, right: 0, bottom: 0, left: 464 };
    const ekran = typeof window !== "undefined" ? window.innerHeight : 800;
    const ust = 120; // arama + çipler, kabın üstünden
    const tavan =
      sheetKonum === "kapali"
        ? 140
        : sheetKonum === "acik"
          ? Math.round(ekran * 0.46)
          : // tam: 85dvh ama üstte en az 60 px harita şeridi kalsın (kap = ekran − 52 px menü)
            Math.min(Math.round(ekran * 0.85), ekran - 52 - ust - 60);
    const alt = merkezModu ? tavan : Math.min(tavan, sheetYuksekligi);
    return { top: ust, right: 0, bottom: Math.max(0, alt), left: 0 };
  }, [yayin, genis, sheetKonum, merkezModu, sheetYuksekligi]);

  /** Seçili alan + (konum varsa) mesafe bilgisi. */
  const seciliAlan = useMemo(() => {
    if (secili == null) return null;
    const alan = alanlar.find((a) => a.id === secili);
    if (!alan) return null;
    if (!referans)
      return {
        alan,
        mesafe: null as null | { m: number; yon: string; derece: number; dk: number },
      };
    const m = mesafeM(referans.enlem, referans.boylam, alan.enlem, alan.boylam);
    const derece = yonAcisi(referans.enlem, referans.boylam, alan.enlem, alan.boylam);
    return {
      alan,
      mesafe: { m, yon: pusulaYonu(derece), derece, dk: yurumeDakika(m) },
    };
  }, [secili, alanlar, referans]);

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
      .sort((a, b) => {
        // Başlangıç eşleşmesi önce: "kır" yazana Kırıkkale/Kırklareli/Kırşehir
        // gelir, Diyarbakır listenin başına oturmaz (critique 2026-09-10).
        const aBas = katla(a.ad).startsWith(q) ? 1 : 0;
        const bBas = katla(b.ad).startsWith(q) ? 1 : 0;
        if (aBas !== bBas) return bBas - aBas;
        return Number(Boolean(b.yayinda)) - Number(Boolean(a.yayinda));
      })
      .slice(0, 6);
    const alanSonuc =
      q.length >= 2
        ? alanlar.filter((a) => katla(a.ad).includes(q)).slice(0, 4)
        : [];
    return { iller: ilSonuc, alanlar: alanSonuc };
  }, [arama, ozetPlakalari, alanlar]);

  /** Harita hazırsa hemen gider; değilse hedefi saklar, `onHazir` uygular. */
  const haritayaGit = useCallback((enlem: number, boylam: number, zoom?: number) => {
    const api = haritaApiRef.current;
    if (api) api.git(enlem, boylam, zoom);
    else bekleyenGitRef.current = { enlem, boylam, zoom };
  }, []);

  const ilSec = useCallback(
    (il: IlAdayi) => {
      setArama("");
      setAramaAcik(false);
      setUrlIl(il.slug);
      void ilYukle(il.plaka);
      if (il.merkez) haritayaGit(il.merkez[0], il.merkez[1], NOKTA_YAKINLASMASI + 0.6);
    },
    [ilYukle, haritayaGit]
  );

  /** Seçili alanın hangi ilde olduğu — indirilen listelerden bulunur. */
  const alanIlSlug = useCallback(
    (id: number): string | null => {
      for (const [plaka, liste] of Object.entries(ilVerileri)) {
        if (liste.some((a) => a.id === id)) {
          return iller.find((i) => i.plaka === Number(plaka))?.slug ?? null;
        }
      }
      return null;
    },
    [ilVerileri, iller]
  );

  /* ── URL DURUMU: ?il=<slug>&alan=<id>&k=deprem,isi,sicaklik,altyapi ──
     Paylaşılan bağlantı aynı görünümü açar; yayın modu bir şehre kilitlenir;
     yenileme seçimi kaybetmez (critique 2026-09-10: "URL durumu yok"). */
  useEffect(() => {
    if (urlOkunduRef.current || !iller.length) return;
    urlOkunduRef.current = true;
    const p = new URLSearchParams(window.location.search);
    const k = (p.get("k") ?? "").split(",");
    if (k.includes("deprem")) setDepremAcik(true);
    if (k.includes("isi")) setYanginAcik(true);
    if (k.includes("sicaklik")) setSicaklikAcik(true);
    if (k.includes("altyapi")) setAltyapiAcik(true);
    const alanId = Number(p.get("alan"));
    if (Number.isFinite(alanId) && alanId > 0) bekleyenAlanRef.current = alanId;
    const slug = p.get("il");
    const il = slug ? iller.find((i) => i.slug === slug) : undefined;
    if (il) ilSec(il);
  }, [iller, ilSec]);
  useEffect(() => {
    const id = bekleyenAlanRef.current;
    if (id == null) return;
    const alan = alanlar.find((a) => a.id === id);
    if (!alan) return;
    bekleyenAlanRef.current = null;
    setSecili(id);
    haritayaGit(alan.enlem, alan.boylam, 16);
  }, [alanlar, haritayaGit]);
  useEffect(() => {
    if (!urlOkunduRef.current) return;
    const p = new URLSearchParams();
    const slug = (secili != null ? alanIlSlug(secili) : null) ?? urlIl;
    if (slug) p.set("il", slug);
    if (secili != null) p.set("alan", String(secili));
    const k = [
      depremAcik && "deprem",
      yanginAcik && "isi",
      sicaklikAcik && "sicaklik",
      altyapiAcik && "altyapi",
    ]
      .filter(Boolean)
      .join(",");
    if (k) p.set("k", k);
    const q = p.toString();
    const yeni = `${window.location.pathname}${q ? `?${q}` : ""}`;
    if (yeni !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", yeni);
    }
  }, [secili, urlIl, depremAcik, yanginAcik, sicaklikAcik, altyapiAcik, alanIlSlug]);

  /** Sheet'te hangi içerik: seçili alan kartı > en yakın listesi > başlangıç. */
  const sheetIcerigi: "alan" | "liste" | "bos" = seciliAlan
    ? "alan"
    : durum.tip === "bulundu"
      ? "liste"
      : "bos";

  const katmanAktif = depremAcik || yanginAcik || sicaklikAcik || altyapiAcik;

  /** Panel kapalıyken tutamacın altındaki tek satır. */
  const sheetOzeti =
    sheetIcerigi === "alan" && seciliAlan
      ? seciliAlan.alan.ad
      : sheetIcerigi === "liste"
        ? `${merkezModu ? "Haritanın ortasına en yakın" : "En yakın"} ${yakinlar.length} toplanma alanı${secIl ? ` · ${secIl.il}` : ""}`
        : `Toplanma alanları · ${(ozet?.iller.length ?? 0).toLocaleString("tr-TR")} il`;

  /** Katlı katman satırının özeti — sayılar her zaman görünür, notlar bir dokunuş uzakta. */
  const katmanOzeti = [
    depremAcik &&
      (depremDurumu === "tamam"
        ? `${depremler.length} deprem`
        : depremDurumu === "hata"
          ? "deprem: ulaşılamadı"
          : "deprem…"),
    yanginAcik &&
      (yanginDurumu === "tamam"
        ? `${yanginlar.length} ısı noktası`
        : yanginDurumu === "hata"
          ? "ısı: ulaşılamadı"
          : "ısı…"),
    sicaklikAcik &&
      (sicaklikDurumu === "tamam"
        ? `${sicakliklar.length} il sıcaklık`
        : sicaklikDurumu === "hata"
          ? "sıcaklık: ulaşılamadı"
          : "sıcaklık…"),
    altyapiAcik &&
      (altyapiDurumu === "tamam"
        ? `${altyapi.length} sağlık/itfaiye`
        : altyapiDurumu === "hata"
          ? "altyapı: ulaşılamadı"
          : altyapiDurumu === "bos"
            ? "altyapı: yakınlaş"
            : "altyapı…"),
  ]
    .filter(Boolean)
    .join(" · ");

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

  /**
   * PAYLAŞ = GeoGow bağlantısı (eskiden google.com linki paylaşıyordu ve
   * ürün kayboluyordu). Alan seçili açılır; paylaşım API'si yoksa panoya.
   */
  const paylas = useCallback(
    (alan: Alan) => {
      const slug = alanIlSlug(alan.id);
      const url = `https://geogow.net/?alan=${alan.id}${slug ? `&il=${slug}` : ""}`;
      const metin = `${alan.ad} — resmî toplanma alanı (AFAD)`;
      const panoya = () =>
        navigator.clipboard?.writeText(`${metin}\n${url}`).then(() => {
          setKopyalandi(true);
          setTimeout(() => setKopyalandi(false), 2500);
        });
      const veri = { title: alan.ad, text: metin, url };
      // `"share" in navigator` TS'te navigator'ı never'a daraltıyor; typeof ile.
      // Paylaşım penceresi açılamazsa (izin, masaüstü kısıtı) panoya düşer;
      // yalnız kullanıcının vazgeçmesi (AbortError) sessiz kalır.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare(veri))
      ) {
        void navigator.share(veri).catch((e: unknown) => {
          if (!(e instanceof DOMException && e.name === "AbortError")) void panoya();
        });
        return;
      }
      void panoya();
    },
    [alanIlSlug]
  );

  return (
    <div className="flex h-dvh flex-col">
      <ServisCalisani />
      {/* Harita sayfası da içerik sayfalarıyla AYNI menüyü kullanır.
          ⚠️ Burada süslü parantez ŞART: JSX çocuk konumunda düz blok yorumu
          sayfaya metin olarak basılır. */}
      {!yayin && <UstMenu aktif="/" />}

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
            const b = bekleyenGitRef.current;
            if (b) {
              bekleyenGitRef.current = null;
              api.git(b.enlem, b.boylam, b.zoom);
            }
          }}
          olcek={yayin ? 1.6 : 1}
          dolgu={dolgu}
        />

        {/* Harita merkezi modu: mesafeler bu artıdan ölçülür. Artı, MapLibre'nin
            görünür merkeziyle aynı noktada durur: (sol+genişlik−sağ)/2,
            (üst+yükseklik−alt)/2 — `dolgu` ile birebir. */}
        {merkezModu && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `calc(50% + ${(dolgu.left - dolgu.right) / 2}px)`,
              top: `calc(50% + ${(dolgu.top - dolgu.bottom) / 2}px)`,
            }}
          >
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="9" fill="none" stroke="#05e1f5" strokeWidth="2" />
              <path
                d="M20 2v10M20 28v10M2 20h10M28 20h10"
                stroke="#05e1f5"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        {yayin && (
          <>
            <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-3 rounded-full bg-[#0b0d10]/85 px-4 py-2 ring-1 ring-white/10 backdrop-blur">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marka/geogow-wordmark.png" alt="GeoGow" className="h-7 w-auto" />
              <span className="text-sm text-metin-2">Resmî toplanma alanları · canlı deprem</span>
              <span className="text-sm tabular-nums text-metin">{saat}</span>
            </div>
            <aside className="absolute right-4 top-4 z-20 w-[22rem] max-w-[calc(100%-2rem)] rounded-2xl bg-[#0b0d10]/85 p-4 text-metin ring-1 ring-white/10 backdrop-blur">
              <h2 className="text-lg font-semibold">
                Son 24 saatte {depremler.length} deprem
              </h2>
              <p className="text-xs text-metin-3">
                M2,0 ve üstü · AFAD ve Kandilli · 2 dakikada bir yenilenir
              </p>
              <ol className="mt-3 space-y-1.5 text-[15px]">
                {[...depremler]
                  .sort((a, b) => new Date(b.zaman).getTime() - new Date(a.zaman).getTime())
                  .slice(0, 8)
                  .map((d) => (
                    <li key={d.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">{d.yer}</span>
                      <span className="shrink-0 tabular-nums text-metin-2">
                        M
                        {d.buyukluk.toLocaleString("tr-TR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        · {zamanYazisi(d.zaman)}
                      </span>
                    </li>
                  ))}
              </ol>
              <p className="mt-3 border-t border-white/10 pt-2 text-xs text-metin-3">
                <span
                  aria-hidden
                  className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ background: ALAN_YESILI }}
                />
                toplanma alanı · {(ozet?.iller.length ?? 0).toLocaleString("tr-TR")} il,{" "}
                {(ozet?.toplamAlan ?? 0).toLocaleString("tr-TR")} alan · geogow.net
              </p>
              <p className="mt-1 text-[10px] text-metin-3">
                © OpenStreetMap katkıcıları · © OpenMapTiles · OpenFreeMap · veri: AFAD (e-Devlet)
              </p>
            </aside>
          </>
        )}

        {/* ── ÜST KATMAN: arama + çipler (Google düzeni) ── */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 p-3 ${yayin ? "hidden" : ""}`}>
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
                  className="-mr-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
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
              ad="Uydu ısı noktaları"
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
          className={`absolute right-3 z-20 flex-col items-end gap-2 transition-[bottom] duration-200 sm:!bottom-5 ${yayin ? "hidden" : "flex"}`}
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

        {/* ── ALT KART (Google'ın alt sayfası) ──
            Telefonda üç konum (kapalı · açık · tam); tutamaç GERÇEK düğme:
            dokununca açılır/kapanır, 40 px'ten fazla sürüklenince konum
            değişir, klavyede Enter/Boşluk çalışır. Atıf satırı panel
            kapalıyken de görünür — ODbL gizlenemez. */}
        {/* Masaüstünde panel SOLA yaslı (Google Haritalar düzeni): haritanın
            ortası boş kalır — harita merkezi modundaki artı ve seçili pin
            panelin altında kalmaz (ortalanmış panelde ikisi de kayboluyordu,
            ölçüldü 1440×900). Telefonda alttan çıkan sheet aynen. */}
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 sm:bottom-4 sm:left-4 sm:right-auto ${yayin ? "hidden" : ""}`}>
          <div
            ref={sheetRef}
            className={`pointer-events-auto flex w-full flex-col rounded-t-2xl border border-[#dadce0] bg-white text-[#202124] shadow-[0_-6px_24px_rgba(32,33,36,0.18)] sm:max-h-[62dvh] sm:w-[27rem] sm:rounded-2xl sm:shadow-xl ${
              sheetKonum === "tam"
                ? "max-h-[85dvh]"
                : sheetKonum === "acik"
                  ? "max-h-[46dvh]"
                  : "max-h-none"
            }`}
          >
            {/* Tutamaç her boyutta: telefonda çubuk + sürükleme, masaüstünde
                ok (İlyas 2026-09-11: "şu da kapanabilsin"). Kapalıyken tek
                satır özet + atıf kalır; harita önündeki panel yol açar. */}
            <button
              type="button"
              onClick={sheetDokun}
              onPointerDown={sheetSurukleBasla}
              onPointerUp={sheetSurukleBitir}
              onPointerCancel={sheetSurukleIptal}
              aria-label={sheetKonum === "kapali" ? "Paneli aç" : "Paneli küçült"}
              aria-expanded={sheetKonum !== "kapali"}
              className="flex min-h-[44px] w-full shrink-0 cursor-pointer touch-none flex-col items-center justify-center gap-1.5 sm:min-h-[34px] sm:flex-row sm:gap-2 sm:hover:bg-[#f6f7f8]"
            >
              <span aria-hidden className="h-1 w-9 rounded-full bg-[#dadce0] sm:hidden" />
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden
                className={`hidden text-[#5f6368] transition-transform duration-200 sm:block ${
                  sheetKonum === "kapali" ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {sheetKonum === "kapali" && (
                <span className="max-w-full truncate px-4 text-sm font-medium text-[#202124] sm:px-0">
                  {sheetOzeti}
                </span>
              )}
            </button>

            <div
              className={`ince-kaydirma min-h-0 flex-1 overflow-y-auto ${
                sheetKonum === "kapali" ? "hidden" : ""
              }`}
            >

            {sheetIcerigi === "alan" && seciliAlan && (
              <div className="px-4 pb-4 pt-2 sm:pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[19px] font-semibold leading-snug">
                      {seciliAlan.alan.ad}
                    </h2>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      Toplanma alanı
                      {seciliAlan.mesafe && (
                        <>
                          {" · "}
                          <strong className="font-semibold text-[#202124]">
                            {mesafeYazisi(seciliAlan.mesafe.m)}
                          </strong>{" "}
                          <YonOku derece={seciliAlan.mesafe.derece} />
                          {` · yürüyerek ~${seciliAlan.mesafe.dk} dk`}
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
                    className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
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
                  {(
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
                      {kopyalandi ? "Kopyalandı" : paylasilabilir ? "Paylaş" : "Bağlantıyı kopyala"}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#5f6368]">
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
                    <h2 className="text-[19px] font-semibold leading-snug">
                      {merkezModu ? "Haritanın ortasına" : "Sana"} en yakın {yakinlar.length} toplanma alanı
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
                              <span className="flex flex-wrap items-center gap-x-1 text-xs text-[#5f6368]">
                                <span>yürüyerek ~{alan.yurumeDk} dk ·</span>
                                <YonOku derece={alan.yonDerece} />
                                {alan.alanM2 ? <span>· {alanYazisi(alan.alanM2)}</span> : null}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-[#202124]">
                              {mesafeYazisi(alan.mesafeM)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2 text-xs leading-relaxed text-[#5f6368]">
                      {merkezModu
                        ? "Mesafeler haritanın ortasındaki artıdan ölçülür; haritayı kaydırınca liste yenilenir. "
                        : "Mesafeler kuş uçuşudur; yürüme yolu daha uzun olabilir. "}
                      Resmî uyarı değildir — acil durumda 112.
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
                {yakinGorunum && (
                  <button
                    type="button"
                    onClick={merkezdenBul}
                    className="mt-2 min-h-[44px] w-full cursor-pointer rounded-full border border-[#dadce0] px-4 text-sm font-medium text-[#00758c] transition-colors hover:bg-[#f6f7f8]"
                  >
                    Konum vermeden: haritanın ortasına en yakın alanlar
                  </button>
                )}
                {durum.tip === "hata" && (
                  <p role="alert" className="mt-2 text-sm text-[#c5221f]">
                    {durum.mesaj}
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-[#5f6368]">
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
              /* Katlanır: telefonda dört durum satırı paneli ekranın yarısına
                 çıkarıyordu. Sayılar özet satırında hep görünür, dürüstlük
                 notları bir dokunuş uzakta; masaüstünde açık başlar.
                 ⚠️ `currentTarget.open` SENKRON okunur (Hazirlik.tsx dersi). */
              <details
                open={katmanDetayAcik}
                onToggle={(o) => {
                  const acikMi = o.currentTarget.open;
                  setKatmanDetayAcik(acikMi);
                }}
                className="group border-t border-[#e8eaed] px-4 py-1"
              >
                <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[#3c4043] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 truncate">Katmanlar: {katmanOzeti}</span>
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden
                    className="shrink-0 text-[#5f6368] transition-transform duration-200 group-open:rotate-180"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <div className="space-y-2 pb-2 pt-1">
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
              </details>
            )}
            </div>

            {/* Harita atfı — MapLibre'nin köşe kutusu telefonda kartın
                arkasında kalıyordu; ODbL atfı burada KALICI görünür. */}
            {/* 11 px ve 5,9:1 — atıf ve gizlilik satırları sayfanın en az
                okunur metniydi (10 px, 2,6:1); etik olarak en önemli
                satırlar en azından AA'yı geçmeli (2026-09-10). */}
            <p className="border-t border-[#f1f3f4] px-4 py-1.5 text-[11px] leading-relaxed text-[#5f6368]">
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
                href="https://www.openmaptiles.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenMapTiles
              </a>{" "}
              ·{" "}
              <a
                href="https://openfreemap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenFreeMap
              </a>{" "}
              · Toplanma alanı verisi: AFAD (e-Devlet)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
