/**
 * ÇANTA GÖRSELİ — üç durumlu, ilerlemeye göre değişir.
 *
 * ── NEDEN ELLE SVG DEĞİL ──
 * Elle çizilen SVG sırt çantası gerçek ekranda ASMA KİLİT gibi okunuyordu
 * (İlyas, 2026-08-07). Görseller ChatGPT'de üretildi, `public/cizim/`
 * altında duruyor. Üretim notları: `public/cizim/NASIL.md`.
 *
 * ── ÜÇ DURUM, DOLUM ÇUBUĞU DEĞİL ──
 * Raster görselin içi CSS ile doldurulamaz. Onun yerine aynı çantanın üç
 * hâli (boş / yarım / dolu) üst üste konur ve opaklıkla geçilir. Kesin oran
 * zaten yanındaki ilerleme çubuğunda ve "9/17" yazısında var; buradaki
 * görselin işi oranı ölçmek değil, ilerlemeyi HİSSETTİRMEK.
 *
 * Toplam ağırlık 26 KB (7+6+13) — üçü de peşin yüklenir ki durum
 * değişirken beyaz boşluk oluşmasın.
 */

const DURUMLAR = [
  { esik: 0, dosya: "/cizim/canta-bos.png", alt: "Afet çantası boş" },
  { esik: 0.05, dosya: "/cizim/canta-yarim.png", alt: "Afet çantası yarı dolu" },
  { esik: 0.8, dosya: "/cizim/canta-dolu.png", alt: "Afet çantası dolu" },
] as const;

export default function CantaGorseli({
  oran,
  boyut = 96,
  vurgula = false,
}: {
  /** 0–1 arası doluluk. Temel çantanın işaretli oranı. */
  oran: number;
  boyut?: number;
  /** Yeni malzeme düştüğünde kısa vurgu. */
  vurgula?: boolean;
}) {
  const guvenli = Math.min(1, Math.max(0, oran));
  let etkin = 0;
  for (let i = 0; i < DURUMLAR.length; i++) {
    if (guvenli >= DURUMLAR[i].esik) etkin = i;
  }

  return (
    <div
      className={`relative ${vurgula ? "canta-vurgu" : ""}`}
      style={{ width: boyut, height: boyut }}
      role="img"
      aria-label={`${DURUMLAR[etkin].alt} — yüzde ${Math.round(guvenli * 100)} hazır`}
    >
      {DURUMLAR.map((durum, sira) => (
        <img
          key={durum.dosya}
          src={durum.dosya}
          alt=""
          aria-hidden
          width={boyut}
          height={boyut}
          /* Üçü de yüklü durur, yalnız opaklık değişir: `src` değiştirmek
             yavaş bağlantıda bir kare boş çerçeve gösterirdi. */
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            opacity: sira === etkin ? 1 : 0,
            transition: "opacity 420ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      ))}
    </div>
  );
}
