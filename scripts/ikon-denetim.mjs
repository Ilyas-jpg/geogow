/**
 * İKON DENETİMİ — hangi çanta maddesinin görseli eksik?
 *
 *   node scripts/ikon-denetim.mjs
 *
 * Gerçek madde ile bölüm/plan alanını ayırt eder: yalnız `miktar:` alanı
 * olan kayıtlar çanta maddesidir. Bölüm başlıkları (`baslik:`) ve aile planı
 * alanları (`etiket:`) sayılmaz.
 */

import fs from "node:fs";

const s = fs.readFileSync("src/lib/hazirlik.ts", "utf8");

/*
 * ⚠️ Blok sınırı `miktar:` ile ANAHTARLANIR, `{` ile değil.
 * Önceki sürüm `{ id: ... }` arasını alıyordu; bölüm nesnesi (`id: "yasli"`,
 * `baslik:`) ile onu izleyen ilk maddeyi tek blok sanıp bölümleri "ikonsuz
 * madde" diye raporluyordu. Madde ile bölümü ayıran tek şey `miktar:`.
 */
const maddeler = [];
const re = /id: "([^"]+)",\s*\n\s*ad: "[^"]*",\n([\s\S]*?)\n      \},/g;
let m;
while ((m = re.exec(s))) {
  const [, id, govde] = m;
  if (!/miktar:/.test(govde)) continue;
  maddeler.push({ id, ikon: govde.match(/ikon: "([^"]+)"/)?.[1] ?? null });
}

const ikonlu = maddeler.filter((m) => m.ikon);
const eksik = maddeler.filter((m) => !m.ikon);

console.log(`çanta maddesi : ${maddeler.length}`);
console.log(`ikonlu        : ${ikonlu.length}`);
console.log(`eksik (${eksik.length})     : ${eksik.map((m) => m.id).join(", ") || "yok"}`);

/* Aynı ikon iki maddeye bağlanmış mı? */
const sayac = {};
for (const m of ikonlu) sayac[m.ikon] = (sayac[m.ikon] ?? 0) + 1;
const tekrar = Object.entries(sayac).filter(([, n]) => n > 1);
console.log(
  tekrar.length ? `⚠ AYNI İKON BİRDEN FAZLA MADDEDE: ${JSON.stringify(tekrar)}` : "✓ tekrar eden ikon yok"
);
