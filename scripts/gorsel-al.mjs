/**
 * İNDİRİLEN GÖRSELİ PROJEYE AL — boyutlandır, sıkıştır, doğrula.
 *
 * ChatGPT'den inen ham PNG ~1 MB geliyor; NASIL.md tavanı 200 KB. Bu adım
 * elle yapılırken iki hata çıkmıştı: (a) sıkıştırmayı unutup 1 MB'lık dosyayı
 * commit'lemek, (b) Chrome'un `dosya (1).png` yeniden adlandırması yüzünden
 * YANLIŞ GÖRSELİ işleyip canlıya çıkarmak (fırtına yerine çığ). Betik ikisini
 * de kapatıyor: kaynak dosyayı adıyla alır, boyutu ölçer, tavanı aşarsa
 * HATA VERİP DURUR.
 *
 * Kullanım:
 *   node scripts/gorsel-al.mjs <indirilen-dosya> <hedef-ad> [genişlik]
 *   node scripts/gorsel-al.mjs ~/Downloads/gg-mit-kapi-esigi.png mit-kapi-esigi 1200
 *
 * Sonra `npm run gorsel` ile AVIF/WebP varyantları üretilir.
 */
import { existsSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import sharp from "sharp";

const TAVAN_BAYT = 200 * 1024;
const HEDEF_DIZIN = "public/cizim";
/** NASIL.md: zemin şeffaf DEĞİL, sayfa zemini ile aynı düz koyu renk. */
const ZEMIN = "#0b0d10";

const [, , kaynak, ad, genislikStr] = process.argv;
if (!kaynak || !ad) {
  console.error("Kullanım: node scripts/gorsel-al.mjs <dosya> <hedef-ad> [genişlik]");
  process.exit(1);
}
if (!existsSync(kaynak)) {
  console.error(`🔴 Kaynak yok: ${kaynak}`);
  process.exit(1);
}

/* ⚠️ Chrome ikinci indirmeyi "dosya (1).png" yapar. Adında parantez varsa
   büyük ihtimalle YANLIŞ (eski) dosyayı işliyorsun — sor. */
if (/\(\d+\)/.test(basename(kaynak))) {
  console.error(
    `🔴 Dosya adında "(n)" var: ${basename(kaynak)}\n` +
      "   Chrome bunu ikinci indirmede üretir; muhtemelen ESKİ görsel.\n" +
      "   Doğru dosyadan emin ol, gerekirse indirmeyi benzersiz adla tekrarla."
  );
  process.exit(1);
}

const genislik = Number(genislikStr) || 1200;
const hedef = `${HEDEF_DIZIN}/${ad}.png`;
const girisBayt = statSync(kaynak).size;

/* Kalite kademeli düşürülür: önce renk sayısını kırpmadan dene, tavana
   sığmazsa palet daralt. ⛔ Doğrudan colours:32'ye inme — ölçüldü, düz
   vektörde dosyayı BÜYÜTÜYOR (dithering gürültüsü). */
const KADEMELER = [
  { palette: true, quality: 90, colours: 256 },
  { palette: true, quality: 80, colours: 192 },
  { palette: true, quality: 70, colours: 128 },
  { palette: true, quality: 60, colours: 96 },
];

let yazildi = 0;
let kullanilan = null;
for (const ayar of KADEMELER) {
  const veri = await sharp(kaynak)
    .resize(genislik, null, { withoutEnlargement: true })
    .flatten({ background: ZEMIN })
    .png(ayar)
    .toBuffer();
  if (veri.length <= TAVAN_BAYT || ayar === KADEMELER[KADEMELER.length - 1]) {
    /* 🔴 Tamponu DOĞRUDAN yaz. `sharp(veri).toFile(hedef)` PNG'yi VARSAYILAN
       ayarlarla YENİDEN KODLAR: ölçtüğün tampon ile diske düşen dosya farklı
       olur. Ölçülen 174 KB'lık görsel diskte 226 KB çıktı ve tavan denetimi
       sahte "geçti" verdi. Ne ölçtüysen onu yaz. */
    writeFileSync(hedef, veri);
    yazildi = veri.length;
    kullanilan = ayar;
    break;
  }
}

const meta = await sharp(hedef).metadata();
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

console.log(`✓ ${hedef}`);
console.log(`  ${meta.width}×${meta.height} · ${kb(girisBayt)} → ${kb(yazildi)}` +
  ` (renk ${kullanilan.colours})`);

if (yazildi > TAVAN_BAYT) {
  console.error(
    `\n🔴 ${kb(yazildi)} — tavan ${kb(TAVAN_BAYT)} AŞILDI.\n` +
      "   Görsel fazla detaylı olabilir; daha sade bir kompozisyon iste."
  );
  process.exit(1);
}
console.log(`\n→ Şimdi: npm run gorsel   (AVIF/WebP varyantları)`);
