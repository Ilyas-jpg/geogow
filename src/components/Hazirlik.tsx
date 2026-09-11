"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CANTA, PLAN_ALANLARI, SU_NOTU } from "@/lib/hazirlik";
import CantaGorseli from "./CantaGorseli";
import Gorsel from "./Gorsel";

const CANTA_ANAHTARI = "geogow-canta";
const PLAN_ANAHTARI = "geogow-plan";

/**
 * AİLE PLANI BAĞLANTIDA TAŞINIR — sunucu yok, hesap yok. Plan JSON → UTF-8 →
 * base64url olarak `?plan=` parametresine gömülür; açan telefon kendi
 * localStorage'ına yazar. Aile üyeleri aynı planı böyle paylaşır
 * (İlyas, 2026-09-11: "cihazlar arası paylaşma"). Boş alanlar taşınmaz.
 */
function planKodla(plan: Record<string, string>): string {
  const dolu = Object.fromEntries(
    Object.entries(plan).filter(([, deger]) => deger && deger.trim())
  );
  const bayt = new TextEncoder().encode(JSON.stringify(dolu));
  let ikili = "";
  for (const b of bayt) ikili += String.fromCharCode(b);
  return btoa(ikili).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function planCoz(kod: string): Record<string, string> | null {
  try {
    const b64 = kod.replace(/-/g, "+").replace(/_/g, "/");
    const bayt = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const deger: unknown = JSON.parse(new TextDecoder().decode(bayt));
    if (!deger || typeof deger !== "object" || Array.isArray(deger)) return null;
    // Yalnız tanıdığımız alanlar, yalnız metin, makul uzunlukta: yabancı bir
    // bağlantı bu cihazdaki planı çöp anahtarlarla ezemez.
    const bilinen = new Set(PLAN_ALANLARI.map((a) => a.id));
    const temiz = Object.fromEntries(
      Object.entries(deger as Record<string, unknown>).filter(
        ([k, d]) => bilinen.has(k) && typeof d === "string" && d.trim() && d.length <= 2000
      )
    ) as Record<string, string>;
    return Object.keys(temiz).length ? temiz : null;
  } catch {
    return null;
  }
}

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
    /* Bağlantıyla gelen plan (?plan=…): cihazda plan yoksa doğrudan, varsa
       sorarak yazılır; parametre adres çubuğundan silinir ki yenileme
       tekrar sormasın ve bağlantı kazara paylaşılmasın. */
    try {
      const kod = new URLSearchParams(window.location.search).get("plan");
      if (kod) {
        const gelen = planCoz(kod);
        let mevcut: Record<string, string> = {};
        try {
          const p = localStorage.getItem(PLAN_ANAHTARI);
          if (p) mevcut = JSON.parse(p) as Record<string, string>;
        } catch {
          /* yok sayılır */
        }
        const mevcutDolu = Object.values(mevcut).some((v) => v && v.trim());
        if (
          gelen &&
          Object.keys(gelen).length &&
          (!mevcutDolu ||
            confirm("Bağlantıyla gelen aile planı bu cihazdaki planın üstüne yazılsın mı?"))
        ) {
          setPlan(gelen);
          localStorage.setItem(PLAN_ANAHTARI, JSON.stringify(gelen));
        }
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {
      /* bozuk bağlantı mevcut planı bozmaz */
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

  /** Plan bağlantısı: paylaşım API'si varsa onunla, yoksa panoya. */
  const [planPaylasildi, setPlanPaylasildi] = useState(false);
  const planDolu = useMemo(() => Object.values(plan).some((v) => v && v.trim()), [plan]);
  const planPaylas = useCallback(() => {
    const url = `https://geogow.net/hazirlik?plan=${planKodla(plan)}`;
    const satirlar = PLAN_ALANLARI.filter((a) => plan[a.id]?.trim()).map(
      (a) => `${a.etiket}: ${plan[a.id].trim()}`
    );
    const metin = `Ailemizin afet buluşma planı (GeoGow)\n${satirlar.join("\n")}`;
    const panoya = () =>
      navigator.clipboard?.writeText(`${metin}\n${url}`).then(() => {
        setPlanPaylasildi(true);
        setTimeout(() => setPlanPaylasildi(false), 2500);
      });
    const veri = { title: "Aile buluşma planı", text: metin, url };
    // Paylaşım penceresi açılamazsa panoya düşer; vazgeçme (AbortError) sessiz.
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
  }, [plan]);

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
      <div className="yazdirma-gizle sticky top-[var(--ust-menu-yuksekligi)] z-20 -mx-4 mb-6 border-b border-cizgi bg-zemin px-4 py-3">
        <div className="flex items-center gap-4">
          <div ref={cantaRef} className="shrink-0">
            <CantaGorseli oran={oran} boyut={64} vurgula={dustu} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tabular-nums text-metin">
              {ilerleme.tamam}/{ilerleme.toplam} hazır
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-metin-2">
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
              {/* Dolum `transform` ile: `width` geçişi her karede layout
                  hesaplatıyordu (dedektör: layout-transition). */}
              <div
                className="h-full w-full origin-left rounded-full bg-guvenli"
                style={{
                  transform: `scaleX(${oran})`,
                  transition: "transform 520ms cubic-bezier(0.16, 1, 0.3, 1)",
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
      <p className="mt-2 max-w-[62ch] text-metin-2">
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
            /*
              KART IZGARASI — iki kural, ikisi de gözle görülen bir sorunu
              çözüyor:

              1. `items-stretch` + `h-full`: satırdaki kartlar EŞİT YÜKSEKLİKTE.
                 Önce label hücreyi doldurmuyordu; uzun maddenin yanındaki kısa
                 madde yukarıda asılı kalıp altında boşluk bırakıyordu ve ızgara
                 "elle dizilmiş" gibi duruyordu.
              2. Kenarlık HER ZAMAN var (işaretsizken de). Önce işaretsiz kart
                 `border-transparent` idi: yarısı işaretli bir bölümde kartların
                 bir kısmı kutulu, bir kısmı havada görünüyordu.
            */
            <ul className="mt-3 grid items-stretch gap-2 lg:grid-cols-2 lg:gap-x-3">
              {bolum.maddeler.map((madde) => {
                const secili = !!isaretli[madde.id];
                return (
                  <li key={madde.id} className="h-full">
                    <label
                      className={`flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors duration-200 ${
                        secili
                          ? "border-guvenli/40 bg-guvenli/[0.06]"
                          : "border-cizgi/70 bg-zemin-2/50 hover:border-cizgi hover:bg-zemin-3/60"
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
                          width={384}
                          height={384}
                          loading="lazy"
                          /* 64 px: tek tek üretilen yeni çizimlerin detayı
                             48 px'te kayboluyordu (2026-09-11). */
                          className="mt-0.5 h-16 w-16 shrink-0 rounded-lg bg-zemin object-contain"
                        />
                      )}

                      {/*
                        Tek ritim kuralı: bloklar arası boşluk kabın
                        `space-y`'sinden gelir. Önce her blok kendi `mt-1`'ini
                        taşıyordu; blok sayısı maddeden maddeye değiştiği için
                        (kimi 2, kimi 4 blok) kartlar farklı ritimlerde
                        okunuyordu.
                      */}
                      <span className="block min-w-0 space-y-1.5">
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

                        {/* NE KADAR — bilgi taşıyan satır, süs rozeti değil.
                            Açık metin: turkuaz 17 kartta tekrarlanınca hiyerarşi
                            düzleşiyordu (2026-09-10). */}
                        <span className="block text-sm font-medium text-metin">
                          {madde.miktar}
                        </span>

                        {/* NEDEN */}
                        <span className="block text-sm text-metin-2">
                          {madde.neden}
                        </span>

                        {madde.ipucu && (
                          <span className="block text-sm text-metin-3">
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
                  <p className="mt-1 max-w-[62ch] text-sm text-metin-3">{bolum.aciklama}</p>
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
                <span className="yazdirma-gizle flex shrink-0 items-center gap-1.5 text-sm text-metin-2">
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
                <p className="mt-1 max-w-[62ch] text-sm text-metin-3">{bolum.aciklama}</p>
              )}
              {liste}
            </details>
          );
        })}
      </div>

      <p className="mt-4 max-w-[62ch] rounded-xl border border-uyari/40 bg-uyari/10 p-4 text-sm text-metin-2">
        <strong className="text-metin">Su hakkında.</strong> {SU_NOTU}
      </p>

      {/* ── Aile planı ── */}
      <h2 className="mt-10 text-xl font-semibold">Aile buluşma planı</h2>
      <p className="mt-2 max-w-[62ch] text-metin-2">
        Afet anında telefonlar çalışmaz ve herkes farklı yerde olur. Bu planın
        işe yaraması için tek şart var:{" "}
        <strong className="text-metin">ailedeki herkesin bilmesi</strong>. Doldur,
        yazdır, bir kopyasını çantaya koy.
      </p>
      <p className="mt-2 max-w-[62ch] text-sm text-metin-3">
        Yazdıkların <strong className="text-metin-2">yalnız bu cihazda</strong>{" "}
        saklanır — sunucuya gönderilmez, hesap istemez.
        {yuklendi ? "" : " (kayıtlı bilgiler yükleniyor…)"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={planPaylas}
          disabled={!planDolu}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-marka px-4 text-sm font-semibold text-marka-uzeri transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zemin-3 disabled:text-metin-3"
        >
          {planPaylasildi ? "Bağlantı kopyalandı" : "Planı aileyle paylaş"}
        </button>
        <span className="max-w-[48ch] text-xs text-metin-3">
          Plan bağlantının içinde taşınır: açan kişinin telefonuna iner, hiçbir
          sunucuya gitmez.
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {PLAN_ALANLARI.map((alan) => (
          <div key={alan.id} className={alan.cokSatir ? "lg:col-span-2" : undefined}>
            <label
              htmlFor={`plan-${alan.id}`}
              className="block font-semibold text-metin"
            >
              {alan.etiket}
            </label>
            <p className="mt-0.5 max-w-[62ch] text-sm text-metin-3">{alan.ipucu}</p>
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
