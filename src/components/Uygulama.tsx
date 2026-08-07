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
import type { Ozet } from "@/lib/veri";

// Harita motoru ayrı parça: alan listesi MapLibre'yi BEKLEMEZ.
const Harita = dynamic(() => import("./Harita"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zemin-2" aria-hidden />,
});

type Durum =
  | { tip: "hazir" }
  | { tip: "araniyor" }
  | { tip: "bulundu"; enlem: number; boylam: number; dogruluk: number }
  | { tip: "hata"; mesaj: string };

export default function Uygulama({ ozet }: { ozet: Ozet | null }) {
  const [durum, setDurum] = useState<Durum>({ tip: "hazir" });
  const [alanlar, setAlanlar] = useState<Alan[]>([]);
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

  /** İl verisini indirir. Yalnız gereken il — kötü bağlantı bütçesi böyle korunur. */
  const ilYukle = useCallback(async (il: IlAdayi) => {
    setYukleniyor(true);
    try {
      const yanit = await fetch(`/data/toplanma/${il.plaka}.min.json`);
      if (!yanit.ok) throw new Error(String(yanit.status));
      // Servis çalışanı önbellekten servis ettiyse başlıkla bildiriyor.
      // (Ağ tamamen düştüğünde tetiklenir; tarayıcı HTTP önbelleği devreye
      //  girerse `navigator.onLine` dinleyicisi yakalar.)
      if (yanit.headers.get("x-geogow-cevrimdisi") === "1") setCevrimdisi(true);
      const veri: IlVerisi = await yanit.json();
      setAlanlar(veri.a.map(kompakttanAlan));
      setSecIl(il);
    } catch {
      setDurum({
        tip: "hata",
        mesaj: "Alan verisi indirilemedi. Bağlantını kontrol edip tekrar dene.",
      });
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
    if (durum.tip !== "bulundu" || secIl || yukleniyor) return;
    const adaylar = ilAdaylari(iller, durum.enlem, durum.boylam);
    if (!adaylar.length) return;
    void ilYukle(adaylar[0]);
  }, [durum, iller, secIl, yukleniyor, ilYukle]);

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
      <header className="flex items-center justify-between gap-3 border-b border-cizgi bg-zemin px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Geogow</h1>
          <p className="text-xs text-metin-3">Toplanma alanları ve acil durum haritası</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDepremAcik((a) => !a)}
            aria-pressed={depremAcik}
            className={`min-h-[44px] rounded-lg border px-3 text-sm ${
              depremAcik ? "border-vurgu bg-zemin-3 text-metin" : "border-cizgi text-metin-2"
            }`}
          >
            Son depremler
          </button>
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
          konum={konum}
          secili={secili}
          onSec={setSecili}
        />

        {/* ── Tek birincil eylem ── */}
        {durum.tip !== "bulundu" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="pointer-events-auto mx-auto max-w-md rounded-xl border border-cizgi bg-zemin-2/95 p-4 backdrop-blur">
              <button
                type="button"
                onClick={konumBul}
                disabled={durum.tip === "araniyor"}
                className="min-h-[52px] w-full rounded-lg bg-vurgu px-4 text-base font-semibold text-white disabled:opacity-60"
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
                  <h2 className="text-sm uppercase tracking-wide text-metin-3">
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
