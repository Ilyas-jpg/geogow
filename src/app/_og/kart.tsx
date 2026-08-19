/**
 * PAYLAŞIM KARTI (Open Graph / Twitter) — 1200×630.
 *
 * ── NEDEN VAR ──
 * 2026-08-19'a kadar sitede `og:image` HİÇ YOKTU: geogow.net linki
 * WhatsApp'a, X'e ya da LinkedIn'e atıldığında görselsiz, kırık bir kutu
 * çıkıyordu. Kamu yararı güden bir afet haritasının en büyük dağıtım kanalı
 * birinin linki bir gruba atması; önizleme o paylaşımın kapağıdır.
 *
 * ── NEDEN ÇALIŞMA ANINDA ÜRETİLİYOR (elle çizilmiş bir PNG değil) ──
 * Kartta il ve alan sayısı yazıyor. Elle çizilen bir PNG hasat büyüdükçe
 * yalan söylemeye başlardı ("68 il" yazarken 81 il yayında olurdu). Bu
 * bileşen sayıları `ozet.json`dan derleme anında okur; rota statiktir,
 * çalışma anında maliyeti yoktur.
 *
 * ── MARKA KİLİDİ (docs/marka.md) ──
 * · Wordmark METİN OLARAK DİZİLMEZ — gerçek PNG gömülür (§1 yasağı).
 * · Renkler logodan pikselle ölçülmüş değerlerdir, tahmin değil.
 * · Turkuaz zemin üstüne beyaz yazı yok (kontrast 1,60 — okunmaz).
 * · "Resmî uyarı değildir · 112 · AFAD 122" HER YÜZEYDE (§4) — kart dahil.
 * · Ölçülmemiş sayı yazılmaz: sağdaki halka motifinde mesafe etiketi YOK,
 *   yalnız ürünün kendi renk dili var (turkuaz = sen, yeşil = toplanma alanı).
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ozetOku } from "@/lib/veri";

export const KART_BOYUTU = { width: 1200, height: 630 };
export const KART_TIPI = "image/png";
export const KART_ALT =
  "GeoGow — afette en yakın toplanma alanını gösteren acil durum haritası";

/* Marka paleti — docs/marka.md tablosu. Tahmin edilmedi. */
const ZEMIN = "#0b0d10";
const CIZGI = "#262c35";
const METIN = "#f2f4f7";
const METIN_2 = "#b8c0cc";
const METIN_3 = "#8b93a1";
const TURKUAZ = "#05e1f5";
const GUVENLI = "#35c48a"; /* anlam rengi: toplanma alanı */

/** Halka motifinin merkezi — metin sütunuyla çakışmasın diye sağda. */
const MERKEZ_X = 940;
const MERKEZ_Y = 296;

/** Merkeze göre konumlanan daire. `transform`a güvenilmez; left/top elle hesaplanır. */
function daire(cap: number, stil: React.CSSProperties): React.CSSProperties {
  return {
    position: "absolute",
    left: MERKEZ_X - cap / 2,
    top: MERKEZ_Y - cap / 2,
    width: cap,
    height: cap,
    borderRadius: cap,
    ...stil,
  };
}

/** Toplanma alanı noktası — koordinat merkeze göre değil, tuvale göre. */
function nokta(x: number, y: number, cap: number, opaklik: number): React.CSSProperties {
  return {
    position: "absolute",
    left: x - cap / 2,
    top: y - cap / 2,
    width: cap,
    height: cap,
    borderRadius: cap,
    background: GUVENLI,
    opacity: opaklik,
  };
}

export async function kartUret() {
  /* Derleme anında okunur: fontlar ve wordmark repoda, sayılar yayınlanmış
     veri dosyasında. Üçü de ağ istemez — Vercel derlemesi ağsız da geçer. */
  const [inter400, inter700, wordmark, ozet] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_og/Inter-400.ttf")),
    readFile(join(process.cwd(), "src/app/_og/Inter-700.ttf")),
    readFile(join(process.cwd(), "public/marka/geogow-wordmark.png")),
    ozetOku(),
  ]);

  const wordmarkVeri = `data:image/png;base64,${wordmark.toString("base64")}`;
  const ilSayisi = ozet?.ilSayisi ?? 0;
  const alanSayisi = ozet?.toplamAlan ?? 0;
  /* Binlik ayracı Türkçe: 26.801. Marka kuralı — sayılar tabular. */
  const bicimli = (n: number) => n.toLocaleString("tr-TR");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: ZEMIN,
          padding: "56px 64px",
          fontFamily: "Inter",
          color: METIN,
        }}
      >
        {/* Zemindeki turkuaz ışık — halka motifini tuvale bağlar, yoksa
            daireler boşlukta yüzüyor gibi duruyordu. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at 78% 47%, rgba(5,225,245,0.14), rgba(11,13,16,0) 58%)",
          }}
        />

        {/* ── HALKA MOTİFİ ──
            Ürünün kendi görsel dili: ortadaki turkuaz nokta SEN, yeşil
            noktalar toplanma alanları, aradaki noktalı iz "en yakın olan".
            Süs değil, ekranın kısaltması — ilk sürümde halkalar tek başına
            duruyordu ve dekoratif görünüyordu.

            İz BİLEREK yatay: satori'nin `transform` desteğine güvenmek yerine
            hedef nokta merkezle aynı `y`ye kondu; eğik çizgi denenip
            desteklenmezse sessizce yatay düşerdi, yani zaten bu. */}
        <div style={daire(600, { border: `1px solid rgba(5,225,245,0.09)` })} />
        <div style={daire(452, { border: `1px solid rgba(5,225,245,0.15)` })} />
        <div style={daire(310, { border: `1px solid rgba(5,225,245,0.22)` })} />
        <div style={daire(176, { background: "rgba(5,225,245,0.05)" })} />
        <div
          style={daire(176, {
            border: `1px solid rgba(5,225,245,0.34)`,
          })}
        />

        {/* Uzaktaki alanlar — hepsi eşit değil, yakınlık opaklıkla okunuyor. */}
        <div style={nokta(1048, 178, 15, 0.72)} />
        <div style={nokta(836, 368, 13, 0.58)} />
        <div style={nokta(1022, 430, 12, 0.46)} />
        <div style={nokta(872, 162, 11, 0.4)} />

        {/* "En yakın alan" izi: merkezden sağa, 310'luk halkanın üstündeki
            noktaya. Mesafe YAZILMIYOR — uydurma sayı marka kuralını çiğnerdi. */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 982 + i * 20,
              top: MERKEZ_Y - 2,
              width: 4,
              height: 4,
              borderRadius: 4,
              background: TURKUAZ,
              opacity: 0.18 + i * 0.07,
            }}
          />
        ))}
        <div style={nokta(1095, MERKEZ_Y, 20, 1)} />

        {/* Merkez: dıştan içe yumuşayan üç kat — düz nokta yassı duruyordu. */}
        <div style={daire(112, { background: "rgba(5,225,245,0.07)" })} />
        <div
          style={daire(48, {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5,225,245,0.2)",
          })}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 20,
              background: TURKUAZ,
            }}
          />
        </div>

        {/* ── ÜST: WORDMARK ──
            §1: logo görseldir, metinle dizilmez. Yükseklik 46 px — kuraldaki
            24 px tabanın iyi üstünde; oran 1726×360'tan bozulmadan taşındı. */}
        <div style={{ display: "flex", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmarkVeri} width={220} height={46} alt="GeoGow" />
        </div>

        {/* ── ORTA: SORU + CEVAP ──
            Ton kuralı: kısa, sakin, jargonsuz. Panik dili yok; soru afet
            anını değil, bugün bilinmesi gerekeni işaret ediyor. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            maxWidth: 660,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: -2.2,
              lineHeight: 1.06,
              color: METIN,
            }}
          >
            Afette nereye gideceksin?
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 26,
              lineHeight: 1.45,
              color: METIN_2,
            }}
          >
            En yakın AFAD toplanma alanını haritada gösterir. Konumun cihazından
            çıkmaz, çevrimdışı da çalışır.
          </div>
        </div>

        {/* ── ALT: KANIT VE KÜNYE ──
            Sol: ölçülmüş kapsam + kaynak (§4 "kaynak her zaman görünür").
            Sağ: alan adı + her yüzeyde tekrarlanan yasal not. */}
        <div
          style={{
            display: "flex",
            position: "relative",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `1px solid ${CIZGI}`,
            paddingTop: 26,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, color: METIN_2 }}>
              <span style={{ color: TURKUAZ, fontWeight: 700 }}>{ilSayisi}</span>
              <span style={{ marginLeft: 8 }}>il</span>
              <span style={{ margin: "0 12px", color: METIN_3 }}>·</span>
              <span style={{ color: TURKUAZ, fontWeight: 700 }}>
                {bicimli(alanSayisi)}
              </span>
              <span style={{ marginLeft: 8 }}>toplanma alanı</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 19, color: METIN_3 }}>
              Kaynak: AFAD e-Devlet sorgulama hizmeti
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: METIN }}>
              geogow.net
            </div>
            <div style={{ marginTop: 8, fontSize: 19, color: METIN_3 }}>
              Resmî uyarı değildir · 112 · AFAD 122
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...KART_BOYUTU,
      fonts: [
        { name: "Inter", data: inter400, weight: 400, style: "normal" },
        { name: "Inter", data: inter700, weight: 700, style: "normal" },
      ],
    },
  );
}
