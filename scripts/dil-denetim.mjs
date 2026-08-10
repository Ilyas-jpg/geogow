/**
 * DİL VE YAZIM DENETİMİ (P5)
 *
 * ⚠️ YALNIZ KULLANICIYA GÖRÜNEN METNİ tarar: dize sabitleri ve JSX metin
 * düğümleri. Yorumlar ve kod sözdizimi ELENİR.
 *
 * Neden: ilk sürüm tüm dosyayı tarıyordu ve 154 "uyarı" üretti — hepsi kod
 * yorumundaki hizalama boşluğu, spread operatörü (`...`), ternary (`? :`)
 * gibi sahte eşleşmelerdi. Sürekli yanlış alarm veren denetim, denetimsiz
 * olmaktan kötüdür: insan bir süre sonra çıktıya bakmayı bırakır.
 *
 * Yakalanan hata sınıfları (plan P5):
 *  - `.toLowerCase()` kaynaklı bozuk "İ" (i̇ = i + U+0307 birleşen nokta)
 *  - çift boşluk, satır sonu boşluğu
 *  - noktalama öncesi boşluk
 *  - ayrık yazılmış ek ("harca ma")
 *  - düz tırnak (") — JSX'te &ldquo;/&rdquo; ya da “ ” kullanılmalı
 *
 * Anlam, ton ve tekrar makineyle yakalanmaz; bu betik elle okumanın YERİNE
 * değil ÖNÜNE geçer.
 *
 * Çalıştır: node scripts/dil-denetim.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const KOK = "src";
const UZANTI = /\.(ts|tsx)$/;
const ATLA = /\.test\.(ts|tsx)$/;
const TURKCE = /[çğıöşüÇĞİÖŞÜ]/;

/**
 * Yorumları siler ama SATIR SAYISINI KORUR (yerine boşluk koyar), yoksa
 * bildirilen satır numarası kayar ve bulgu bulunamaz hâle gelir.
 */
function yorumlariAt(kaynak) {
  let sonuc = "";
  let mod = "kod"; // kod | tek | cift | ters | satirYorum | blokYorum
  for (let i = 0; i < kaynak.length; i++) {
    const c = kaynak[i];
    const s = kaynak[i + 1];
    if (mod === "kod") {
      if (c === "/" && s === "/") { mod = "satirYorum"; sonuc += "  "; i++; continue; }
      if (c === "/" && s === "*") { mod = "blokYorum"; sonuc += "  "; i++; continue; }
      if (c === "'") mod = "tek";
      else if (c === '"') mod = "cift";
      else if (c === "`") mod = "ters";
      sonuc += c;
      continue;
    }
    if (mod === "satirYorum") {
      if (c === "\n") { mod = "kod"; sonuc += "\n"; } else sonuc += " ";
      continue;
    }
    if (mod === "blokYorum") {
      if (c === "*" && s === "/") { mod = "kod"; sonuc += "  "; i++; }
      else sonuc += c === "\n" ? "\n" : " ";
      continue;
    }
    // dize içindeyiz
    if (c === "\\") { sonuc += c + (s ?? ""); i++; continue; }
    if ((mod === "tek" && c === "'") || (mod === "cift" && c === '"') || (mod === "ters" && c === "`")) mod = "kod";
    sonuc += c;
  }
  return sonuc;
}

/** Dize sabitleri + JSX metin düğümleri — yani ekrana çıkan şeyler. */
function gorunenMetinler(temiz) {
  const parcalar = [];
  const dize = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let e;
  while ((e = dize.exec(temiz))) {
    const satir = temiz.slice(0, e.index).split("\n").length;
    parcalar.push({ satir, metin: e[2] });
  }
  // JSX metni: > ... < arası, süslü parantez ve etiket içermeyen
  const jsx = />([^<>{}]{4,})</g;
  while ((e = jsx.exec(temiz))) {
    const govde = e[1];
    if (!govde.trim()) continue;
    const satir = temiz.slice(0, e.index).split("\n").length;
    parcalar.push({ satir, metin: govde });
  }
  return parcalar.filter((p) => TURKCE.test(p.metin));
}

const KURALLAR = [
  { ad: "bozuk İ (birleşen noktalı i̇) — toLowerCase kaynaklı", re: /i̇/, kritik: true },
  { ad: "düz tırnak — Türkçe metinde “ ” kullanılmalı", re: /(?<=[\s(])"(?=\S)|(?<=\S)"(?=[\s).,;:])/, kritik: false },
  { ad: "çift boşluk", re: /(?<=\S)  +(?=\S)/, kritik: false },
  { ad: "noktalama öncesi boşluk", re: /\s+[,;:!?](?=\s|$)/, kritik: false },
  /* ⛔ "satır sonu boşluğu" kuralı BİLEREK YOK. Bu kod tabanında uzun
     metinler `"...birkaç " + "günlük yedeği..."` diye birleştiriliyor ve
     sondaki boşluk ZORUNLU — silinirse kelimeler yapışır. Kural 488
     bulgunun tamamını sahte üretiyordu. */
  { ad: "üç ayrı nokta (… kullanılmalı)", re: /(?<!\.)\.\.\.(?!\.)/, kritik: false },
];

const AYRIK_EK =
  /\b(\p{L}{4,})\s+(ma|me|mek|mak|yın|yin|yun|dır|dir|dur|dür|nın|nin|nun|nün)\b/giu;

let kritik = 0;
let uyari = 0;

function* dosyalar(dizin) {
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) yield* dosyalar(yol);
    else if (UZANTI.test(ad) && !ATLA.test(ad)) yield yol;
  }
}

for (const yol of dosyalar(KOK)) {
  const temiz = yorumlariAt(readFileSync(yol, "utf8"));
  const bulgular = [];

  for (const { satir, metin } of gorunenMetinler(temiz)) {
    for (const k of KURALLAR) {
      if (k.re.test(metin)) {
        bulgular.push({ satir, ad: k.ad, kritik: k.kritik, metin: metin.trim().slice(0, 88) });
      }
    }
    AYRIK_EK.lastIndex = 0;
    let e;
    while ((e = AYRIK_EK.exec(metin))) {
      bulgular.push({
        satir,
        ad: `ayrık ek şüphesi: "${e[1]} ${e[2]}"`,
        kritik: false,
        metin: metin.trim().slice(0, 88),
      });
    }
  }

  if (bulgular.length) {
    console.log(`\n── ${relative(".", yol)} ──`);
    for (const b of bulgular) {
      console.log(`  ${b.kritik ? "🔴" : "⚠️ "} satır ${b.satir}: ${b.ad}`);
      console.log(`     ${b.metin}`);
      b.kritik ? kritik++ : uyari++;
    }
  }
}

console.log(`\n${kritik} kritik · ${uyari} uyarı` + (kritik ? " → düzeltilmeli" : " ✓"));
process.exit(kritik ? 1 : 0);
