#!/usr/bin/env node
/**
 * MARKA VARLIKLARI — geogowlogo.png kaynağından üretim.
 *
 * Kural (tasarım anayasası §5): logo/wordmark ASLA fontla ya da kendi
 * şeklimizle uydurulmaz; daima gerçek asset dosyası kullanılır. Bu betik
 * kaynağı yalnızca KIRPAR ve boyutlandırır — yeniden çizmez, rengini
 * değiştirmez (beyaz sürüm hariç, o da yalnız renk kanalını beyazlar).
 *
 * Kaynakta iki kilit var:
 *   ① üstte siyah "GeoGow" tam wordmark
 *   ② altta turkuaz gradyanlı "Geo" işareti  ← sitenin kimliği (İlyas kararı)
 *
 * 🐛 İLK YAZIMIN HATASI: kaynağın beyaz zeminli olduğu VARSAYILDI ve "beyazı
 * şeffaflaştır" mantığı yazıldı. Oysa kaynak ZATEN ŞEFFAF — boş pikseller
 * `rgba(0,0,0,0)`. O mantık her boş pikseli OPAK SİYAH yaptı; koyu zeminde
 * fark edilmiyordu ama açık zeminde siyah kutu olarak çıkacaktı.
 * Ders: kaynağın piksellerini ölç, arka planını gözle tahmin etme.
 *
 * Kullanım: node scripts/marka-varlik-uret.mjs [kaynak.png]
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const KAYNAK = process.argv[2] ?? "C:/Users/milya/Downloads/geogowlogo.png";
const CIKTI = "public/marka";

async function main() {
  const { data, info } = await sharp(KAYNAK)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: K } = info;
  console.log(`kaynak: ${W}×${H}, ${K} kanal`);

  const px = (x, y) => {
    const i = (y * W + x) * K;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const doluMu = (a) => a > 8;
  const turkuazMi = (r, g, b, a) =>
    doluMu(a) && Math.max(r, g, b) - Math.min(r, g, b) > 45 && b > r;
  const siyahMi = (r, g, b, a) => doluMu(a) && Math.max(r, g, b) < 110;

  /** Koşulu sağlayan içeriğin kutusu (+ kenar yumuşatması için pay). */
  function kutu(kosul, pay = 6) {
    let x1 = W;
    let y1 = H;
    let x2 = -1;
    let y2 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!kosul(...px(x, y), y)) continue;
        if (x < x1) x1 = x;
        if (y < y1) y1 = y;
        if (x > x2) x2 = x;
        if (y > y2) y2 = y;
      }
    }
    if (x2 < 0) return null;
    return {
      x1: Math.max(0, x1 - pay),
      y1: Math.max(0, y1 - pay),
      g: Math.min(W - 1, x2 + pay) - Math.max(0, x1 - pay) + 1,
      y: Math.min(H - 1, y2 + pay) - Math.max(0, y1 - pay) + 1,
    };
  }

  const isaret = kutu(turkuazMi);
  if (!isaret) throw new Error("turkuaz işaret bulunamadı — kaynak beklenenden farklı");
  // Wordmark her zaman işaretin ÜSTÜNDE. Kaynakta aşağıda gözle görünmeyen
  // birkaç koyu artefakt piksel var; sınırlamazsak kutuyu şişiriyorlar.
  const wordmark = kutu((r, g, b, a, y) => siyahMi(r, g, b, a) && y < isaret.y1);
  if (!wordmark) throw new Error("wordmark bulunamadı");
  console.log("işaret  :", JSON.stringify(isaret));
  console.log("wordmark:", JSON.stringify(wordmark));

  /* ── Gradyanı PİKSELDEN ölç: marka hex'i tahmin edilmez ── */
  const ornekler = [];
  for (let p = 0; p <= 20; p++) {
    const x = Math.round(isaret.x1 + (isaret.g - 1) * (p / 20));
    let en = null;
    for (let y = isaret.y1; y < isaret.y1 + isaret.y; y++) {
      const [r, g, b, a] = px(x, y);
      if (!turkuazMi(r, g, b, a)) continue;
      const d = Math.max(r, g, b) - Math.min(r, g, b);
      if (!en || d > en.d) en = { r, g, b, d };
    }
    if (en) ornekler.push({ oran: p / 20, ...en });
  }
  const hex = (o) => "#" + [o.r, o.g, o.b].map((n) => n.toString(16).padStart(2, "0")).join("");
  const baslangic = hex(ornekler[0]);
  const bitis = hex(ornekler[ornekler.length - 1]);
  console.log(`\ngradyan (ölçüldü): ${baslangic} → ${bitis}`);

  /** Kutuyu kaynaktan OLDUĞU GİBİ kırpar — alfa zaten doğru. */
  const kirp = (k) =>
    sharp(KAYNAK).ensureAlpha().extract({ left: k.x1, top: k.y1, width: k.g, height: k.y });

  mkdirSync(CIKTI, { recursive: true });
  await kirp(isaret).png().toFile(`${CIKTI}/geogow-isaret.png`);
  await kirp(wordmark).png().toFile(`${CIKTI}/geogow-wordmark-siyah.png`);

  /* Koyu zemin için beyaz wordmark — yalnız renk kanalı beyazlanır, şekil aynı */
  const wm = await kirp(wordmark).raw().toBuffer({ resolveWithObject: true });
  const beyaz = Buffer.from(wm.data);
  for (let i = 0; i < beyaz.length; i += wm.info.channels) {
    if (beyaz[i + 3] <= 8) continue;
    beyaz[i] = beyaz[i + 1] = beyaz[i + 2] = 255;
  }
  await sharp(beyaz, {
    raw: { width: wm.info.width, height: wm.info.height, channels: wm.info.channels },
  })
    .png()
    .toFile(`${CIKTI}/geogow-wordmark-beyaz.png`);

  /**
   * ⭐ ANA KİLİT — "GeoGow": **"Geo" turkuaz, "Gow" nötr**.
   *
   * Logo tek renk DEĞİL. Kaynak sayfası bunu iki kilitle anlatıyor: üstte
   * tam wordmarkın şekli, altta hangi parçanın renkli olduğu ("Geo").
   * Bu yüzden tam wordmark iki bölgeye ayrılıp boyanır:
   *   x < sinir → işaretten ÖLÇÜLEN turkuaz gradyan
   *   x ≥ sinir → nötr (koyu zeminde beyaz, açık zeminde siyah)
   *
   * Sınır tahmin edilmez: sütun mürekkebindeki EN GENİŞ boşluktan bulunur
   * ("o" ile script "G" arasındaki aralık).
   */
  function sinirBul(veri, g, y, kanal) {
    const sutun = [];
    for (let x = 0; x < g; x++) {
      let n = 0;
      for (let j = 0; j < y; j++) if (veri[(j * g + x) * kanal + 3] > 8) n++;
      sutun.push(n);
    }
    let enIyi = null;
    let bas = -1;
    for (let x = 0; x < g; x++) {
      if (sutun[x] === 0 && bas === -1) bas = x;
      else if (sutun[x] > 0 && bas !== -1) {
        const uzunluk = x - bas;
        // Kelime arası boşluk harf arasından belirgin geniştir
        if (bas > g * 0.25 && bas < g * 0.75 && (!enIyi || uzunluk > enIyi.uzunluk))
          enIyi = { orta: Math.round((bas + x) / 2), uzunluk };
        bas = -1;
      }
    }
    return enIyi ? enIyi.orta : Math.round(g * 0.5);
  }

  const sinir = sinirBul(wm.data, wm.info.width, wm.info.height, wm.info.channels);
  console.log(`"Geo" / "Gow" sınırı: x=${sinir} (%${Math.round((sinir / wm.info.width) * 100)})`);

  /** İki bölgeli boyama: solda ölçülen gradyan, sağda verilen nötr renk. */
  function ikiRenkli(notr) {
    const buf = Buffer.from(wm.data);
    const g = wm.info.width;
    const kanal = wm.info.channels;
    for (let y = 0; y < wm.info.height; y++) {
      for (let x = 0; x < g; x++) {
        const i = (y * g + x) * kanal;
        if (buf[i + 3] <= 8) continue;
        if (x >= sinir) {
          buf[i] = notr[0];
          buf[i + 1] = notr[1];
          buf[i + 2] = notr[2];
          continue;
        }
        const t = x / Math.max(1, sinir - 1);
        const yer = t * (ornekler.length - 1);
        const a = ornekler[Math.floor(yer)];
        const b = ornekler[Math.min(ornekler.length - 1, Math.ceil(yer))];
        const k = yer - Math.floor(yer);
        buf[i] = Math.round(a.r + (b.r - a.r) * k);
        buf[i + 1] = Math.round(a.g + (b.g - a.g) * k);
        buf[i + 2] = Math.round(a.b + (b.b - a.b) * k);
      }
    }
    return sharp(buf, {
      raw: { width: g, height: wm.info.height, channels: kanal },
    }).png();
  }

  // Koyu zemin için (sitenin kullandığı) ve açık zemin için
  await ikiRenkli([255, 255, 255]).toFile(`${CIKTI}/geogow-wordmark.png`);
  await ikiRenkli([17, 17, 17]).toFile(`${CIKTI}/geogow-wordmark-acik.png`);

  /* Uygulama ikonları — kare tuval, işaret ortalı, marka koyusu */
  for (const boy of [192, 512]) {
    const parca = await kirp(isaret)
      .resize({ width: Math.round(boy * 0.74), fit: "inside" })
      .png()
      .toBuffer();
    await sharp({ create: { width: boy, height: boy, channels: 4, background: "#0b0d10" } })
      .composite([{ input: parca, gravity: "center" }])
      .png()
      .toFile(`${CIKTI}/ikon-${boy}.png`);
  }

  writeFileSync(
    `${CIKTI}/kunye.json`,
    JSON.stringify(
      {
        kaynak: "geogowlogo.png (İlyas, 2026-08-07)",
        uretildi: new Date().toISOString(),
        not: "Kaynak şeffaf zeminlidir; kırpma dışında piksele dokunulmaz.",
        isaret: { dosya: "geogow-isaret.png", genislik: isaret.g, yukseklik: isaret.y },
        wordmark: {
          dosya: "geogow-wordmark-siyah.png",
          genislik: wordmark.g,
          yukseklik: wordmark.y,
        },
        gradyan: {
          baslangic,
          bitis,
          ornekler: ornekler.map((o) => ({ oran: o.oran, hex: hex(o) })),
        },
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`✓ ${CIKTI}/ altına yazıldı`);
}

main().catch((h) => {
  console.error(h);
  process.exit(1);
});
