"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CANTA, PLAN_ALANLARI, SU_NOTU } from "@/lib/hazirlik";

const CANTA_ANAHTARI = "geogow-canta";
const PLAN_ANAHTARI = "geogow-plan";

/**
 * HAZIRLIK — işaretlenebilir afet çantası + doldurulabilir aile planı.
 *
 * ── GİZLİLİK (pazarlık konusu değil) ──
 * Hiçbir alan sunucuya gitmez. İşaretler ve plan metni yalnız bu cihazın
 * `localStorage`ında durur; hesap yok, senkron yok, analitik yok. Aile
 * planında ad, telefon ve tıbbi bilgi yazılabildiği için bu bir gereklilik.
 *
 * ── JAVASCRIPT YOKSA ──
 * Sunucuda da render edilir: liste okunur, plan alanları görünür, sayfa
 * yazdırılabilir. Yalnız "hatırlama" özelliği çalışmaz — kullanıcıya bu
 * söylenir, sessizce kaybolmaz.
 *
 * ── HİDRASYON ──
 * Kayıtlı değerler `useEffect` içinde okunur, ilk render'da DEĞİL. Sunucu
 * çıktısıyla istemci ilk çıktısı böylece birebir aynı olur; `localStorage`ı
 * render sırasında okumak klasik hidrasyon uyuşmazlığı üretir.
 */
export default function Hazirlik() {
  const [isaretli, setIsaretli] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<Record<string, string>>({});
  const [acikEklentiler, setAcikEklentiler] = useState<Record<string, boolean>>({});
  /** Kayıtlı veri okunana kadar "kaydedildi" bilgisi gösterilmez. */
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CANTA_ANAHTARI);
      if (c) setIsaretli(JSON.parse(c));
      const p = localStorage.getItem(PLAN_ANAHTARI);
      if (p) setPlan(JSON.parse(p));
    } catch {
      /* Bozuk/erişilemez depo kullanıcıyı engellemez; liste yine çalışır. */
    }
    setYuklendi(true);
  }, []);

  /** Eklenti bölümü, içinde işaretli madde varsa açık başlar. */
  useEffect(() => {
    if (!yuklendi) return;
    const acik: Record<string, boolean> = {};
    for (const bolum of CANTA) {
      if (!bolum.eklenti) continue;
      if (bolum.maddeler.some((m) => isaretli[m.id])) acik[bolum.id] = true;
    }
    if (Object.keys(acik).length) setAcikEklentiler((o) => ({ ...acik, ...o }));
    // Yalnız ilk yüklemede: sonrasında kullanıcının açıp kapatması esastır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yuklendi]);

  /**
   * Yazdırmadan önce katlanmış eklenti bölümlerini AÇAR, baskı bitince eski
   * hâline döndürür. Kullanıcı ekranda "engelli birey varsa" bölümünü kapatmış
   * olabilir ama kâğıda listenin tamamı basılmalı.
   *
   * `flushSync` zorunlu: `beforeprint` tetiklendiğinde tarayıcı hemen ardından
   * sayfayı rasterize eder. React'in normal (ertelenmiş) güncellemesi baskı
   * alındıktan SONRA uygulanır ve bölümler kâğıtta yine kapalı çıkardı.
   *
   * Ctrl+P ile de, sayfadaki "Yazdır" düğmesiyle de aynı olay tetiklenir —
   * o yüzden düğmenin ayrıca bir şey yapmasına gerek yok.
   */
  const yazdirmaOncesiRef = useRef<Record<string, boolean> | null>(null);
  useEffect(() => {
    const hepsiAcik = Object.fromEntries(
      CANTA.filter((b) => b.eklenti).map((b) => [b.id, true])
    );
    const once = () => {
      flushSync(() => {
        setAcikEklentiler((onceki) => {
          yazdirmaOncesiRef.current = onceki;
          return hepsiAcik;
        });
      });
    };
    const sonra = () => {
      const geri = yazdirmaOncesiRef.current;
      if (!geri) return;
      yazdirmaOncesiRef.current = null;
      flushSync(() => setAcikEklentiler(geri));
    };
    window.addEventListener("beforeprint", once);
    window.addEventListener("afterprint", sonra);
    return () => {
      window.removeEventListener("beforeprint", once);
      window.removeEventListener("afterprint", sonra);
    };
  }, []);

  const kaydet = useCallback((anahtar: string, deger: unknown) => {
    try {
      localStorage.setItem(anahtar, JSON.stringify(deger));
    } catch {
      /* Depo dolu veya kapalı (gizli sekme): işaretleme yine çalışır, kalıcı olmaz. */
    }
  }, []);

  const maddeDegis = useCallback(
    (id: string) => {
      setIsaretli((onceki) => {
        const yeni = { ...onceki, [id]: !onceki[id] };
        kaydet(CANTA_ANAHTARI, yeni);
        return yeni;
      });
    },
    [kaydet]
  );

  const planDegis = useCallback(
    (id: string, deger: string) => {
      setPlan((onceki) => {
        const yeni = { ...onceki, [id]: deger };
        kaydet(PLAN_ANAHTARI, yeni);
        return yeni;
      });
    },
    [kaydet]
  );

  const temizle = useCallback(() => {
    // Yazdığı planı ve işaretleri geri getirmek imkânsız — önce sorulur.
    if (!confirm("İşaretlerin ve yazdığın plan bu cihazdan silinecek. Emin misin?")) {
      return;
    }
    setIsaretli({});
    setPlan({});
    try {
      localStorage.removeItem(CANTA_ANAHTARI);
      localStorage.removeItem(PLAN_ANAHTARI);
    } catch {
      /* yok sayılır */
    }
  }, []);

  /** İlerleme YALNIZ temel bölümden sayılır: eklentiler herkes için geçerli değil. */
  const ilerleme = useMemo(() => {
    const temel = CANTA.filter((b) => !b.eklenti).flatMap((b) => b.maddeler);
    const tamam = temel.filter((m) => isaretli[m.id]).length;
    return { tamam, toplam: temel.length };
  }, [isaretli]);

  const yuzde = Math.round((ilerleme.tamam / ilerleme.toplam) * 100);

  return (
    <>
      {/* ── İlerleme ── */}
      <div className="yazdirma-gizle sticky top-0 z-10 -mx-4 mb-4 border-b border-cizgi bg-zemin/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-metin-2">
            Temel çanta:{" "}
            <strong className="tabular-nums text-metin">
              {ilerleme.tamam}/{ilerleme.toplam}
            </strong>{" "}
            hazır
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[36px] rounded-lg border border-cizgi px-3 text-sm text-metin-2"
            >
              Yazdır
            </button>
            <button
              type="button"
              onClick={temizle}
              className="min-h-[36px] rounded-lg border border-cizgi px-3 text-sm text-metin-3"
            >
              Sıfırla
            </button>
          </div>
        </div>
        {/* Renk tek başına bilgi taşımaz: oran yukarıda yazıyla da var. */}
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-zemin-3"
          role="progressbar"
          aria-valuenow={yuzde}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Temel çanta hazırlık oranı"
        >
          <div className="h-full bg-guvenli" style={{ width: `${yuzde}%` }} />
        </div>
      </div>

      {/* ── Çanta ── */}
      <h2 className="text-lg font-semibold">Afet çantası</h2>
      <p className="mt-2 text-sm text-metin-2">
        İlk 72 saat kendi başına yetebilmek için. Çanta karanlıkta bulunabilecek,
        kapıya yakın bir yerde durur ve{" "}
        <strong className="text-metin">6 ayda bir</strong> içeriği kontrol edilir
        — pil biter, ilaç ve gıda tarihi geçer.
      </p>

      <div className="mt-4 space-y-4">
        {CANTA.map((bolum) => {
          const liste = (
            <ul className="mt-3 space-y-1">
              {bolum.maddeler.map((madde) => (
                <li key={madde.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-zemin-3">
                    <input
                      type="checkbox"
                      checked={!!isaretli[madde.id]}
                      onChange={() => maddeDegis(madde.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#35c48a]"
                    />
                    <span>
                      <span
                        className={
                          isaretli[madde.id] ? "text-metin-3 line-through" : "text-metin"
                        }
                      >
                        {madde.ad}
                      </span>
                      {madde.not && (
                        <span className="mt-0.5 block text-sm text-metin-3">
                          {madde.not}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          );

          /* Temel bölüm herkes için: hiç katlanmaz. */
          if (!bolum.eklenti) {
            return (
              <section
                key={bolum.id}
                className="rounded-xl border border-cizgi bg-zemin-2 p-4"
              >
                <h3 className="font-semibold text-metin">{bolum.baslik}</h3>
                {bolum.aciklama && (
                  <p className="mt-1 text-sm text-metin-3">{bolum.aciklama}</p>
                )}
                {liste}
              </section>
            );
          }

          /* Eklentiler `<details>` ile katlanır — JS OLMADAN da açılıp kapanır.
             React state'li bir düğme kullanılsaydı JS'siz ziyaretçi "bebek
             varsa" / "engelli birey varsa" bölümlerini hiç açamazdı. */
          const bolumTamam = bolum.maddeler.filter((m) => isaretli[m.id]).length;
          return (
            <details
              key={bolum.id}
              open={!!acikEklentiler[bolum.id]}
              /* ⚠️ `olay.currentTarget.open` SENKRON okunur, setState
                 güncelleyicisinin İÇİNDE değil. Güncelleyici daha sonra
                 (render sırasında) çalışır ve React o ana kadar sentetik
                 olayın `currentTarget`ını null'a çeker →
                 "Cannot read properties of null (reading 'open')" ile
                 sayfanın tamamı çöker. Derleme ve tsc bunu yakalamaz;
                 yalnız gerçek tıklamada ortaya çıkar. */
              onToggle={(olay) => {
                const acikMi = olay.currentTarget.open;
                setAcikEklentiler((o) => ({ ...o, [bolum.id]: acikMi }));
              }}
              className="group rounded-xl border border-cizgi bg-zemin-2 p-4 [&[open]]:pb-4"
            >
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-semibold text-metin">{bolum.baslik}</span>
                  {bolumTamam > 0 && (
                    <span className="mt-0.5 block text-xs tabular-nums text-metin-3">
                      {bolumTamam}/{bolum.maddeler.length} işaretli
                    </span>
                  )}
                </span>
                <span className="yazdirma-gizle shrink-0 text-sm text-vurgu underline">
                  <span className="group-open:hidden">ekle ({bolum.maddeler.length})</span>
                  <span className="hidden group-open:inline">gizle</span>
                </span>
              </summary>
              {bolum.aciklama && (
                <p className="mt-1 text-sm text-metin-3">{bolum.aciklama}</p>
              )}
              {liste}
            </details>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl border border-uyari/40 bg-uyari/10 p-4 text-sm text-metin-2">
        <strong className="text-metin">Su hakkında.</strong> {SU_NOTU}
      </p>

      {/* ── Aile planı ── */}
      <h2 className="mt-10 text-lg font-semibold">Aile buluşma planı</h2>
      <p className="mt-2 text-sm text-metin-2">
        Afet anında telefonlar çalışmaz ve herkes farklı yerde olur. Bu planın
        işe yaraması için tek şart var:{" "}
        <strong className="text-metin">ailedeki herkesin bilmesi</strong>. Doldur,
        yazdır, bir kopyasını çantaya koy.
      </p>
      <p className="mt-2 text-sm text-metin-3">
        Yazdıkların <strong className="text-metin-2">yalnız bu cihazda</strong>{" "}
        saklanır — sunucuya gönderilmez, hesap istemez.
        {yuklendi ? "" : " (kayıtlı bilgiler yükleniyor…)"}
      </p>

      <div className="mt-4 space-y-4">
        {PLAN_ALANLARI.map((alan) => (
          <div key={alan.id}>
            <label htmlFor={`plan-${alan.id}`} className="block font-medium text-metin">
              {alan.etiket}
            </label>
            <p className="mt-0.5 text-sm text-metin-3">{alan.ipucu}</p>
            {alan.cokSatir ? (
              <textarea
                id={`plan-${alan.id}`}
                rows={3}
                value={plan[alan.id] ?? ""}
                onChange={(o) => planDegis(alan.id, o.target.value)}
                className="mt-2 w-full rounded-lg border border-cizgi bg-zemin-2 p-3 text-metin"
              />
            ) : (
              <input
                id={`plan-${alan.id}`}
                type="text"
                value={plan[alan.id] ?? ""}
                onChange={(o) => planDegis(alan.id, o.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-lg border border-cizgi bg-zemin-2 px-3 text-metin"
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
