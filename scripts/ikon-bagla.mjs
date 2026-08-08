/**
 * İKON BAĞLAYICI — kesilmiş ekipman görsellerini `hazirlik.ts` maddelerine bağlar.
 *
 *   node scripts/ikon-bagla.mjs <maddeId>=<ikonAdi> [...]
 *
 * ⚠️ AYNI GÖRSELİ İKİ MADDEYE BAĞLAMAZ. "Her yerde aynı görsel tekrar
 * ediyor" şikâyeti bir kez yaşandı; burada zaten kullanılmış bir ikon
 * ikinci kez bağlanmaya çalışılırsa atlanır ve uyarı basar.
 */

import fs from "node:fs";

const p = "src/lib/hazirlik.ts";
let s = fs.readFileSync(p, "utf8");

const ciftler = process.argv.slice(2).map((a) => a.split("="));
if (!ciftler.length) {
  console.error("Kullanım: node scripts/ikon-bagla.mjs <maddeId>=<ikonAdi> ...");
  process.exit(1);
}

const kullanilan = new Set([...s.matchAll(/ikon: "([^"]+)"/g)].map((m) => m[1]));

let n = 0;
for (const [id, ikon] of ciftler) {
  if (kullanilan.has(ikon)) {
    console.log(`⚠ zaten bağlı, atlandı: ${ikon}`);
    continue;
  }
  if (!fs.existsSync(`public/cizim/ekipman/${ikon}.png`)) {
    console.log(`⚠ görsel yok, atlandı: ${ikon}.png`);
    continue;
  }
  const re = new RegExp(`(id: "${id}",\\s*\\n\\s*ad: "[^"]*",)`);
  const m = s.match(re);
  if (!m) {
    console.log(`⚠ madde bulunamadı: ${id}`);
    continue;
  }
  s = s.replace(re, `${m[1]}\n        ikon: "${ikon}",`);
  kullanilan.add(ikon);
  n++;
}

fs.writeFileSync(p, s);
console.log(`${n} madde bağlandı · toplam ${kullanilan.size} ikon`);
