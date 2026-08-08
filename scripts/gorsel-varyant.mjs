/**
 * GÖRSEL VARYANTI ÜRETİCİ — her PNG'nin yanına .avif ve .webp koyar.
 *
 *   node scripts/gorsel-varyant.mjs            # eksikleri üretir
 *   node scripts/gorsel-varyant.mjs --hepsi    # hepsini yeniden üretir
 *
 * ── NEDEN ──
 * P3'ün kalan görselleri PNG olarak ~770 KB daha eklerdi ve 900 KB
 * bütçesini üçe katlardı. Ölçüm (2026-08-08, 49 görsel):
 *
 *     PNG  737 KB · WebP q82  556 KB (%24) · AVIF q55  397 KB (%46)
 *
 * ⛔ Planın önerdiği "daha agresif palet (colours:32)" ÖLÇÜLDÜ ve ÇÜRÜDÜ:
 *    dosyaları 25 KB BÜYÜTÜYOR. Bu görseller düz vektör; PNG kodlayıcısı
 *    zaten verimli palet seçiyor, renk sayısını zorla düşürünce giren
 *    dithering gürültüsü daha kötü sıkışıyor. Bir daha denenmeyecek.
 *
 * ── PNG NEDEN SİLİNMİYOR ──
 * Bu ürünün hedefi eski telefon ve kötü bağlantı. AVIF iOS 16, WebP iOS 14
 * öncesinde yok. PNG yedeği `<picture>` içinde en son sırada duruyor:
 * modern tarayıcı AVIF'i, eski Safari PNG'yi alır, kimse kırılmaz.
 * Depoda üç kopya durur ama İSTEMCİ yalnız birini indirir — bütçe
 * transfer edilen bayta göre ölçülür, depo boyutuna göre değil.
 */
import { readdir, stat, access } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const KOK = "public/cizim";
const HEPSI = process.argv.includes("--hepsi");

/** Kalite değerleri gözle doğrulandı; düşürmeden önce çıktıya BAK. */
const AVIF_KALITE = 55;
const WEBP_KALITE = 82;

async function pngleriTopla(kok) {
  const cikti = [];
  for (const girdi of await readdir(kok, { withFileTypes: true })) {
    const yol = join(kok, girdi.name);
    if (girdi.isDirectory()) cikti.push(...(await pngleriTopla(yol)));
    else if (extname(girdi.name).toLowerCase() === ".png") cikti.push(yol);
  }
  return cikti;
}

async function varMi(yol) {
  try {
    await access(yol);
    return true;
  } catch {
    return false;
  }
}

const pngler = (await pngleriTopla(KOK)).sort();
if (pngler.length === 0) {
  console.error(`ARIZA: ${KOK} altında PNG yok. Yanlış dizinde misin?`);
  process.exit(1);
}

let png = 0;
let avif = 0;
let webp = 0;
let uretilen = 0;
let atlanan = 0;

for (const yol of pngler) {
  const taban = yol.slice(0, -4);
  const avifYol = `${taban}.avif`;
  const webpYol = `${taban}.webp`;

  const gerekli = HEPSI || !(await varMi(avifYol)) || !(await varMi(webpYol));
  if (gerekli) {
    await sharp(yol).avif({ quality: AVIF_KALITE }).toFile(avifYol);
    await sharp(yol).webp({ quality: WEBP_KALITE }).toFile(webpYol);
    uretilen++;
  } else {
    atlanan++;
  }

  png += (await stat(yol)).size;
  avif += (await stat(avifYol)).size;
  webp += (await stat(webpYol)).size;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const yuzde = (yeni) => `%${(((png - yeni) / png) * 100).toFixed(0)} küçük`;

console.log(`\n${pngler.length} görsel · ${uretilen} üretildi · ${atlanan} zaten vardı\n`);
console.log(`  PNG  (yedek)  ${kb(png)}`);
console.log(`  WebP q${WEBP_KALITE}     ${kb(webp)}  ${yuzde(webp)}`);
console.log(`  AVIF q${AVIF_KALITE}     ${kb(avif)}  ${yuzde(avif)}`);
console.log(`\nModern tarayıcının indireceği: ${kb(avif)} (bütçe ≤900 KB)\n`);

/* Bütçe kapısı: AVIF toplamı 900 KB'ı geçerse sessizce geçme, uyar. */
if (avif > 900 * 1024) {
  console.error("⚠️  AVIF toplamı 900 KB bütçesini AŞTI — yeni görsel eklemeden önce konuş.");
  process.exit(1);
}
