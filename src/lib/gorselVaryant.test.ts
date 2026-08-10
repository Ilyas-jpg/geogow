/**
 * HER PNG'NİN AVIF VE WEBP KARDEŞİ OLMALI.
 *
 * 2026-08-10: dört yeni mit görseli eklendi, `npm run gorsel` çalıştırılmadı
 * ve dört kart da CANLIDA KIRIK görünecekti. Konsol dört kez 404 verdi.
 *
 * 🔴 Bu, `NASIL.md`'de yazdığım varsayımı ÇÜRÜTTÜ. Orada "varyant yoksa
 * kırılma olmaz, tarayıcı sessizce PNG'ye iner" yazıyordu. YANLIŞ:
 * `<picture>` kaynak seçimini `type` özniteliğine göre YAPAR ve seçtiği
 * kaynak 404 dönerse BİR SONRAKİNE DÜŞMEZ — `<img>` kırık kalır. Sıralı
 * deneme yalnız biçim DESTEKLENMİYORSA olur, dosya EKSİKSE olmaz.
 *
 * Yani eksik varyant sessiz bir küçülme değil, görünür bir kırılmadır ve
 * testle tutulması gerekir.
 */
import { strict as assert } from "node:assert";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const DIZIN = "public/cizim";

/** Alt dizinler dahil tüm PNG'ler. */
function pngler(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, ad.name);
    if (ad.isDirectory()) cikti.push(...pngler(yol));
    else if (ad.name.endsWith(".png")) cikti.push(yol);
  }
  return cikti;
}

test("her PNG'nin .avif ve .webp kardeşi var", () => {
  const eksik: string[] = [];
  for (const png of pngler(DIZIN)) {
    const taban = png.slice(0, -4);
    if (!existsSync(`${taban}.avif`)) eksik.push(`${taban}.avif`);
    if (!existsSync(`${taban}.webp`)) eksik.push(`${taban}.webp`);
  }
  assert.deepEqual(
    eksik,
    [],
    `Varyantı eksik görsel var → sayfada KIRIK görünür. Çöz: npm run gorsel\n` +
      eksik.map((e) => `  - ${e}`).join("\n")
  );
});

test("PNG'ler 200 KB tavanını aşmıyor", () => {
  // Tavan NASIL.md'de: bu ürünün iddiası kötü bağlantıda açılmak.
  const TAVAN = 200 * 1024;
  const asanlar = pngler(DIZIN)
    .map((p) => ({ p, b: statSync(p).size }))
    .filter((x) => x.b > TAVAN);
  assert.deepEqual(
    asanlar.map((x) => `${x.p} (${Math.round(x.b / 1024)} KB)`),
    [],
    "200 KB üstü PNG var — scripts/gorsel-al.mjs ile yeniden sıkıştır"
  );
});
