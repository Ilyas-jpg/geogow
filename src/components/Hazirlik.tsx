"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CANTA, PLAN_ALANLARI, SU_NOTU } from "@/lib/hazirlik";
import CantaGorseli from "./CantaGorseli";
import Gorsel from "./Gorsel";

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
 * Sunucuda da render edilir: liste ve gerekçeler okunur, plan alanları
 * görünür, sayfa yazdırılabilir. Yalnız "hatırlama" ve animasyon çalışmaz.
 *
 * ── HAREKET ──
 * Animasyon YALNIZ bu sayfada var: burası sakin zamanın ekranı. `/afet-ani`
 * bilerek hareketsizdir — panikte hiçbir şey beklenmez. `prefers-reduced-motion`
 * açıkken uçuş tamamen kapanır, dolum seviyesi anında yerine oturur.
 */
export default function Hazirlik() {
  const [isaretli, setIsaretli] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<Record<string, string>>({});
  const [acikEklentiler, setAcikEklentiler] = useState<Record<string, boolean>>({});
  const [yuklendi, setYuklendi] = useState(false);
  /** Çantaya yeni malzeme düştüğünde kısa vurgu. */
  const [dustu, setDustu] = useState(false);

  const cantaRef = useRef<HTMLDivElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yuklendi]);

  /**
   * Yazdırmadan önce katlanmış eklenti bölümlerini AÇAR, baskı bitince eski
   * hâline döndürür. `flushSync` zorunlu: `beforeprint` tetiklendiğinde
   * tarayıcı hemen ardından rasterize eder, React'in ertelenmiş güncellemesi
   * baskıdan SONRA uygulanır ve bölümler kâğıtta kapalı çıkardı.
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
      /* Depo dolu veya kapalı (gizli sekme): işaretleme çalışır, kalıcı olmaz. */
    }
  }, []);

  /**
   * İşaretlenen malzemeyi çantaya uçurur.
   *
   * Sadece süs değil, geri bildirim: uzun bir listede hangi satırı
   * işaretlediğin ve toplamın nereye gittiği tek hareketle görünür.
   * Uçan öğe `position: fixed` + `transform` ile taşınır — layout'a
   * dokunmaz, sayfa titremez.
   */
  const ucur = useCallback((kaynak: HTMLElement) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const hedefKutu = cantaRef.current?.getBoundingClientRect();
    if (!hedefKutu) return;
    const basKutu = kaynak.getBoundingClientRect();

    const bx = basKutu.left + basKutu.width / 2;
    const by = basKutu.top + basKutu.height / 2;
    const hx = hedefKutu.left + hedefKutu.width / 2;
    const hy = hedefKutu.top + hedefKutu.height / 2;

    const nokta = document.createElement("span");
    nokta.setAttribute("aria-hidden", "true");
    Object.assign(nokta.style, {
      position: "fixed",
      left: `${bx}px`,
      top: `${by}px`,
      width: "14px",
      height: "14px",
      marginLeft: "-7px",
      marginTop: "-7px",
      borderRadius: "999px",
      background: "#35c48a",
      boxShadow: "0 0 0 3px rgba(53,196,138,0.25)",
      pointerEvents: "none",
      zIndex: "60",
    });
    document.body.appendChild(nokta);

    // Ara nokta yukarıda: düz çizgi yerine yay çizer, göz takip edebilir.
    const animasyon = nokta.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        {
          transform: `translate(${(hx - bx) * 0.5}px, ${(hy - by) * 0.5 - 40}px) scale(1.15)`,
          opacity: 1,
          offset: 0.55,
        },
        { transform: `translate(${hx - bx}px, ${hy - by}px) scale(0.35)`, opacity: 0.2 },
      ],
      { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
    let temizlendi = false;
    const kaldir = () => {
      if (temizlendi) return;
      temizlendi = true;
      nokta.remove();
    };
    animasyon.onfinish = () => {
      kaldir();
      setDustu(true);
      window.setTimeout(() => setDustu(false), 320);
    };
    animasyon.oncancel = kaldir;
    /* ⚠️ EMNİYET: sekme arka plandayken tarayıcı kare üretmez, animasyon
       `currentTime: 0`da donar ve `onfinish` HİÇ tetiklenmez — düğüm DOM'da
       kalıcı olarak birikirdi. Ölçüldü: gizli belgede 4 işaretleme = 4 artık
       düğüm. Süre animasyonun iki katı; normal akışta zaten önce onfinish
       çalışır ve bu çağrı boşa döner. */
    window.setTimeout(kaldir, 1200);
  }, []);

  const maddeDegis = useCallback(
    (id: string, olay: React.ChangeEvent<HTMLInputElement>) => {
      const acildi = olay.target.checked;
      // ⚠️ Hedef elemanı SENKRON yakala: setState güncelleyicisi sonra
      // çalışır ve React o ana kadar olayın hedefini serbest bırakır.
      const kaynak = olay.target;
      if (acildi) ucur(kaynak);
      setIsaretli((onceki) => {
        const yeni = { ...onceki, [id]: acildi };
        kaydet(CANTA_ANAHTARI, yeni);
        return yeni;
      });
    },
    [kaydet, ucur]
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
    const eksikler = temel.filter((m) => !isaretli[m.id]);
    return { tamam, toplam: temel.length, eksikler };
  }, [isaretli]);

  const oran = ilerleme.tamam / ilerleme.toplam;

  return (
    <>
      {/* ── Çanta + ilerleme ── */}
      {/* Üst menünün ALTINA yapışır. `top-0` verilirse menü (z-30) bunun
          üstünü örtüyor ve kaydırırken çanta yarım kalıyor. */}
      <div className="yazdirma-gizle sticky top-[var(--ust-menu-yuksekligi)] z-20 -mx-4 mb-6 border-b border-cizgi bg-zemin/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <div ref={cantaRef} className="shrink-0">
            <CantaGorseli oran={oran} boyut={64} vurgula={dustu} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tabular-nums text-metin">
              {ilerleme.tamam}/{ilerleme.toplam} hazır
            </p>
            <p className="mt-0.5 truncate text-sm text-metin-2">
              {ilerleme.tamam === 0
                ? "Bir madde işaretleyerek başla."
                : ilerleme.eksikler.length === 0
                  ? "Temel çanta tamam. Sana uyan eklentileri de gözden geçir."
                  : `Sıradaki eksik: ${ilerleme.eksikler[0].ad}`}
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-zemin-3"
              role="progressbar"
              aria-valuenow={Math.round(oran * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Temel çanta hazırlık oranı"
            >
              <div
                className="h-full rounded-full bg-guvenli"
                style={{
                  width: `${oran * 100}%`,
                  transition: "width 520ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[36px] cursor-pointer rounded-lg border border-cizgi px-3 text-sm text-metin-2 transition-colors duration-200 hover:border-vurgu hover:text-metin"
            >
              Yazdır
            </button>
            <button
              type="button"
              onClick={temizle}
              className="min-h-[36px] cursor-pointer rounded-lg border border-cizgi px-3 text-sm text-metin-3 transition-colors duration-200 hover:border-kritik hover:text-metin-2"
            >
              Sıfırla
            </button>
          </div>
        </div>
      </div>

      {/* ── Çanta listesi ── */}
      <h2 className="text-xl font-semibold">Afet çantası</h2>
      <p className="mt-2 text-metin-2">
        Her maddede <strong className="text-metin">ne kadar</strong> ve{" "}
        <strong className="text-metin">neden</strong> yazıyor: gerekçesini bilen
        kişi eksiğini kendi başına tamamlar. Çanta karanlıkta bulunabilecek,
        kapıya yakın bir yerde durur.
      </p>

      <div className="mt-5 space-y-4">
        {CANTA.map((bolum) => {
          /* Geniş ekranda iki kolon: 1180 px'te tek kolon satırları 100+
             karaktere çıkarıyordu, göz satır başını kaybediyor. */
          const liste = (
            <ul className="mt-3 grid gap-1 lg:grid-cols-2 lg:gap-x-4">
              {bolum.maddeler.map((madde) => {
                const secili = !!isaretli[madde.id];
                return (
                  <li key={madde.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors duration-200 ${
                        secili
                          ? "border-guvenli/40 bg-guvenli/[0.06]"
                          : "border-transparent hover:border-cizgi hover:bg-zemin-3/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={secili}
                        onChange={(olay) => maddeDegis(madde.id, olay)}
                        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#35c48a]"
                      />

                      {/* Ekipman görseli — sözcüğü okumadan da ne olduğu
                          anlaşılsın. Görseli olmayan maddede boş kutu
                          çizilmez, satır ikonsuz akar. */}
                      {madde.ikon && (
                        <Gorsel
                          kaynak={`/cizim/ekipman/${madde.ikon}.png`}
                          /* alt="" görseli erişilebilirlik ağacından zaten
                             çıkarır; ayrıca aria-hidden gereksizdi. */
                          alt=""
                          width={220}
                          height={220}
                          loading="lazy"
                          className="mt-0.5 h-12 w-12 shrink-0 rounded-lg bg-zemin object-contain"
                        />
                      )}

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            className={`font-semibold ${secili ? "text-metin-2" : "text-metin"}`}
                          >
                            {madde.ad}
                          </span>
                          {madde.tazele && (
                            <span className="text-xs text-metin-3">
                              tazele: {madde.tazele}
                            </span>
                          )}
                        </span>

                        {/* NE KADAR — bilgi taşıyan satır, süs rozeti değil. */}
                        <span className="mt-1 block text-sm font-medium text-vurgu">
                          {madde.miktar}
                        </span>

                        {/* NEDEN */}
                        <span className="mt-1 block text-sm text-metin-2">
                          {madde.neden}
                        </span>

                        {madde.ipucu && (
                          <span className="mt-1 block text-sm text-metin-3">
                            {madde.ipucu}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          );

          if (!bolum.eklenti) {
            return (
              <section
                key={bolum.id}
                className="rounded-xl border border-cizgi bg-zemin-2 p-4"
              >
                <h3 className="text-lg font-semibold text-metin">{bolum.baslik}</h3>
                {bolum.aciklama && (
                  <p className="mt-1 text-sm text-metin-3">{bolum.aciklama}</p>
                )}
                {liste}
              </section>
            );
          }

          /* Eklentiler `<details>` ile katlanır — JS OLMADAN da açılıp kapanır. */
          const bolumTamam = bolum.maddeler.filter((m) => isaretli[m.id]).length;
          return (
            <details
              key={bolum.id}
              open={!!acikEklentiler[bolum.id]}
              /* ⚠️ `olay.currentTarget.open` SENKRON okunur; setState
                 güncelleyicisinin içinde okumak sayfayı çökertiyordu. */
              onToggle={(olay) => {
                const acikMi = olay.currentTarget.open;
                setAcikEklentiler((o) => ({ ...o, [bolum.id]: acikMi }));
              }}
              className="group rounded-xl border border-cizgi bg-zemin-2 p-4"
            >
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-lg font-semibold text-metin">
                    {bolum.baslik}
                  </span>
                  <span className="mt-0.5 block text-sm text-metin-3">
                    {bolumTamam > 0
                      ? `${bolumTamam}/${bolum.maddeler.length} işaretli`
                      : `${bolum.maddeler.length} madde`}
                  </span>
                </span>
                <span className="yazdirma-gizle flex shrink-0 items-center gap-1.5 text-sm text-vurgu">
                  <span className="group-open:hidden">Göster</span>
                  <span className="hidden group-open:inline">Gizle</span>
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden
                    className="transition-transform duration-200 group-open:rotate-180"
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
      <h2 className="mt-10 text-xl font-semibold">Aile buluşma planı</h2>
      <p className="mt-2 text-metin-2">
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

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {PLAN_ALANLARI.map((alan) => (
          <div key={alan.id} className={alan.cokSatir ? "lg:col-span-2" : undefined}>
            <label
              htmlFor={`plan-${alan.id}`}
              className="block font-semibold text-metin"
            >
              {alan.etiket}
            </label>
            <p className="mt-0.5 text-sm text-metin-3">{alan.ipucu}</p>
            {alan.cokSatir ? (
              <textarea
                id={`plan-${alan.id}`}
                rows={3}
                value={plan[alan.id] ?? ""}
                onChange={(o) => planDegis(alan.id, o.target.value)}
                className="mt-2 w-full rounded-lg border border-cizgi bg-zemin-2 p-3 text-metin transition-colors duration-200 focus:border-vurgu"
              />
            ) : (
              <input
                id={`plan-${alan.id}`}
                type="text"
                value={plan[alan.id] ?? ""}
                onChange={(o) => planDegis(alan.id, o.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-lg border border-cizgi bg-zemin-2 px-3 text-metin transition-colors duration-200 focus:border-vurgu"
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
