/**
 * İKON SAYFASI KESİCİ — çanta ekipmanı görselleri.
 *
 *   node scripts/ikon-kes.mjs <kaynak.png> <ad1,ad2,...,ad6>
 *
 * ChatGPT'de üretilen 3×2 ızgarayı altı ayrı ikona böler.
 *
 * ⚠️ HÜCRELER KARE DEĞİL: kaynak kare (1254×1254) ama ızgara 3 sütun × 2
 * satır olduğu için hücre 418×627 çıkıyor. Hücrenin tamamı alınırsa ikon
 * dikey boşlukla, ezik görünüyor — bu yüzden her hücreden ORTALANMIŞ KARE
 * kesilir.
 *
 * ⚠️ SON ADIM ÇAKIŞMA DENETİMİ: "her yerde aynı görsel tekrar ediyor"
 * şikâyeti bir kez yaşandı. Kesim sonrası tüm ikonların MD5'i karşılaştırılır;
 * iki ikon aynıysa uyarı basar.
 */

import sharp from "sharp";
import fs from "node:fs";
import crypto from "node:crypto";

const [, , kaynak, adlarStr] = process.argv;

if (!kaynak || !adlarStr) {
  console.error("Kullanım: node scripts/ikon-kes.mjs <kaynak.png> <ad1,...,ad6>");
  process.exit(1);
}

const adlar = adlarStr.split(",").map((a) => a.trim());
const hedefDizin = "public/cizim/ekipman";
fs.mkdirSync(hedefDizin, { recursive: true });

const m = await sharp(kaynak).metadata();
const hucreGenislik = Math.floor(m.width / 3);
const hucreYukseklik = Math.floor(m.height / 2);
const kenar = Math.min(hucreGenislik, hucreYukseklik) - 16;
const dx = Math.floor((hucreGenislik - kenar) / 2);
const dy = Math.floor((hucreYukseklik - kenar) / 2);

for (let satir = 0; satir < 2; satir++) {
  for (let sutun = 0; sutun < 3; sutun++) {
    const i = satir * 3 + sutun;
    if (!adlar[i]) continue;
    const o = await sharp(kaynak)
      .extract({
        left: sutun * hucreGenislik + dx,
        top: satir * hucreYukseklik + dy,
        width: kenar,
        height: kenar,
      })
      .resize(220)
      .png({ compressionLevel: 9, palette: true, colours: 48, quality: 60 })
      .toFile(`${hedefDizin}/${adlar[i]}.png`);
    console.log(
      adlar[i].padEnd(16),
      `${o.width}x${o.height}`,
      `${(o.size / 1024).toFixed(1)} KB`
    );
  }
}

const imzalar = {};
for (const f of fs.readdirSync(hedefDizin)) {
  const imza = crypto
    .createHash("md5")
    .update(fs.readFileSync(`${hedefDizin}/${f}`))
    .digest("hex")
    .slice(0, 8);
  (imzalar[imza] = imzalar[imza] || []).push(f);
}
const cakisan = Object.values(imzalar).filter((v) => v.length > 1);
console.log(
  cakisan.length
    ? `⚠ AYNI GÖRSEL İKİ KEZ: ${JSON.stringify(cakisan)}`
    : `✓ ${Object.keys(imzalar).length} ikonun hepsi benzersiz`
);
