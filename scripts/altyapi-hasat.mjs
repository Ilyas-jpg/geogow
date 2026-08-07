/**
 * ACİL ALTYAPI HASADI — OpenStreetMap / Overpass API.
 *
 *   node scripts/altyapi-hasat.mjs            # yayındaki illerin hepsi
 *   node scripts/altyapi-hasat.mjs 34 6       # yalnız verilen plakalar
 *
 * Her il için `public/data/altyapi/<plaka>.min.json` üretir.
 *
 * ── TASARIM KARARLARI ──
 *  • İl seçimi `ISO3166-2="TR-<plaka>"` alanı ile yapılır. Bu, kutu (bbox)
 *    taramasından farklı olarak komşu ilin noktasını sızdırmaz — toplanma
 *    alanı hasadında tam bu hata yaşanmıştı (Konya'nın 291 alanının 178'i
 *    kendi ilindeydi, gerisi komşulara yazılmalıydı).
 *  • Overpass ortak ve ücretsiz bir kaynak: tek işçi, istekler arası bekleme,
 *    hata hâlinde artan geri çekilme. Paralel sorgu YOK — toplanma hasadında
 *    ölçüldü, paralellik hata oranını %11'e çıkarıyor ve hız kazandırmıyor.
 *  • `out center` kullanılır: bina (way) ve alan (relation) kayıtları için
 *    merkez noktası döner, ayrı geometri isteği gerekmez.
 *  • Kısmi çıktı yazılmaz: bir il ya tam yazılır ya hiç. Yarım dosya
 *    kullanıcıya "burada hastane yok" yalanını söyletir.
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { turKodu, noktaAdi, TUR_BILGISI } from "../src/lib/altyapi.ts";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CIKTI = path.join(KOK, "public", "data", "altyapi");
const OZET_YOLU = path.join(KOK, "public", "data", "toplanma", "ozet.json");

const UCLAR = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const ISTEKLER_ARASI_MS = 2500;
const EN_FAZLA_DENEME = 4;

const bekle = (ms) => new Promise((c) => setTimeout(c, ms));

/** Tüm türlerin OSM `amenity` değerleri — sorgu bundan üretilir. */
const AMENITYLER = Object.values(TUR_BILGISI).flatMap((b) => b.osm);

/**
 * ⚠️ ISO 3166-2 kodu SIFIR DOLGULUDUR: Ankara `TR-06`, Antalya `TR-07`.
 * Dolgusuz `TR-6` diye sorulunca Overpass hata vermez — eşleşen alan
 * bulamaz ve BOŞ liste döner. Tek haneli plakalı 8 il (1–9) böylece
 * sessizce "hiç hastane yok" olarak kaydediliyordu.
 */
function ilKodu(plaka) {
  return `TR-${String(plaka).padStart(2, "0")}`;
}

function sorgu(plaka) {
  const satirlar = AMENITYLER.map((a) => `nwr["amenity"="${a}"](area.il);`).join("");
  return `[out:json][timeout:120];area["ISO3166-2"="${ilKodu(plaka)}"]->.il;(${satirlar});out center tags;`;
}

async function overpass(plaka) {
  let sonHata;
  for (let deneme = 1; deneme <= EN_FAZLA_DENEME; deneme++) {
    const uc = UCLAR[(deneme - 1) % UCLAR.length];
    try {
      const yanit = await fetch(uc, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          // Overpass kullanım koşulu: kendini tanıtan bir istemci adı.
          // ⚠️ SALT ASCII: HTTP başlığı ByteString'dir (Latin-1). Türkçe
          //    "yararı"daki `ı` (U+0131) fetch'i daha isteği kurmadan
          //    TypeError ile düşürüyordu.
          "user-agent": "GeoGow/1.0 (public-interest disaster map; geogow.net)",
        },
        body: new URLSearchParams({ data: sorgu(plaka) }),
      });
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
      // ⚠️ Overpass yoğunlukta 200 ile birlikte XML hata belgesi de
      // döndürebiliyor. Doğrudan `.json()` çağırmak burada
      // "Unexpected token '<'" gibi sebebi gizleyen bir hata üretiyordu;
      // gövde önce metin olarak alınıp doğrulanıyor.
      const govde = await yanit.text();
      if (!govde.trimStart().startsWith("{")) {
        throw new Error(`JSON değil: ${govde.trim().slice(0, 120).replace(/\s+/g, " ")}`);
      }
      return JSON.parse(govde);
    } catch (hata) {
      sonHata = hata;
      // Programlama hatasını (geçersiz başlık, bozuk sorgu) tekrar denemek
      // anlamsız: sonuç değişmez, yalnız dakikalarca beklenir. Yalnız ağ ve
      // sunucu hataları yeniden denenir.
      if (hata instanceof TypeError) {
        console.error(`  ✖ ${plaka}: istek kurulamadı — ${hata.message}`);
        throw hata;
      }
      // Overpass yoğunlukta 429/504 verir; artan geri çekilme kuralı.
      // Tavan 20 sn: sınırsız katlama tek ilde dakikalarca bekletiyordu ve
      // 81 illik bir turu kilitlerdi. Kalıcı yoğunlukta il atlanır, komut
      // eksik plakalarla tekrar çalıştırılır.
      const bekleme = Math.min(20_000, 4000 * 2 ** (deneme - 1));
      console.warn(
        `  ⚠ ${plaka}: ${hata.message} — ${bekleme / 1000} sn sonra tekrar (${deneme}/${EN_FAZLA_DENEME})`
      );
      if (deneme < EN_FAZLA_DENEME) await bekle(bekleme);
    }
  }
  throw sonHata;
}

/** Overpass öğesi → kompakt satır. Koordinatsız veya türsüz kayıt atılır. */
function satirla(oge) {
  const tur = turKodu(oge.tags?.amenity);
  if (!tur) return null;
  const enlem = oge.lat ?? oge.center?.lat;
  const boylam = oge.lon ?? oge.center?.lon;
  if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) return null;
  return [
    tur,
    Number(enlem.toFixed(5)),
    Number(boylam.toFixed(5)),
    noktaAdi(oge.tags?.name, tur),
  ];
}

async function ilHasat(plaka, ilAdi) {
  const veri = await overpass(plaka);
  const satirlar = [];
  const gorulen = new Set();
  for (const oge of veri.elements ?? []) {
    const satir = satirla(oge);
    if (!satir) continue;
    // Aynı tesis hem node hem way olarak işaretlenmiş olabilir; tür + 5
    // haneli koordinat (~1 m) çakışması tekilleştirme için yeterli.
    const anahtar = `${satir[0]}|${satir[1]}|${satir[2]}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    satirlar.push(satir);
  }

  // Sıfır sonuç GERÇEK değil, ARIZA belirtisidir: Türkiye'de hastanesi,
  // sağlık merkezi ve itfaiyesi hiç olmayan il yok. Sebep bozuk alan kodu,
  // düşen sorgu ya da OSM'de kayıt olmamasıdır — hangisi olursa olsun boş
  // dosya yazmak kullanıcıya "burada hastane yok" yalanını söyletir.
  if (!satirlar.length) {
    throw new Error(
      `sıfır nokta döndü (alan kodu ${ilKodu(plaka)}, ham öğe ${veri.elements?.length ?? 0}) — dosya YAZILMADI`
    );
  }

  satirlar.sort((a, b) => a[1] - b[1] || a[2] - b[2]);

  const cikti = {
    p: Number(plaka),
    il: ilAdi,
    t: new Date().toISOString(),
    k: "© OpenStreetMap katkıcıları (ODbL)",
    n: satirlar,
  };
  await mkdir(CIKTI, { recursive: true });
  const yol = path.join(CIKTI, `${plaka}.min.json`);
  await writeFile(yol, JSON.stringify(cikti));

  const sayim = {};
  for (const s of satirlar) sayim[s[0]] = (sayim[s[0]] ?? 0) + 1;
  return { yol, toplam: satirlar.length, sayim, ham: veri.elements?.length ?? 0 };
}

async function main() {
  const istenen = process.argv.slice(2).filter((a) => /^\d+$/.test(a));

  if (!existsSync(OZET_YOLU)) {
    console.error("ozet.json yok — önce toplanma verisi derlenmeli.");
    process.exit(1);
  }
  const ozet = JSON.parse(await readFile(OZET_YOLU, "utf8"));
  const iller = ozet.iller.filter(
    (il) => !istenen.length || istenen.includes(String(il.plaka))
  );

  if (!iller.length) {
    console.error("Eşleşen il yok. Yayındaki plakalar:", ozet.iller.map((i) => i.plaka).join(", "));
    process.exit(1);
  }

  console.log(`Acil altyapı hasadı — ${iller.length} il · kaynak OpenStreetMap (ODbL)\n`);
  const basarisiz = [];

  for (const [sira, il] of iller.entries()) {
    process.stdout.write(`[${sira + 1}/${iller.length}] ${il.il} (${il.plaka})… `);
    try {
      const s = await ilHasat(il.plaka, il.il);
      const dokum = Object.entries(s.sayim)
        .map(([k, v]) => `${TUR_BILGISI[k].ad} ${v}`)
        .join(" · ");
      console.log(`${s.toplam} nokta — ${dokum || "kayıt yok"}`);
    } catch (hata) {
      console.log(`BAŞARISIZ: ${hata.message}`);
      basarisiz.push(il.plaka);
    }
    if (sira < iller.length - 1) await bekle(ISTEKLER_ARASI_MS);
  }

  if (basarisiz.length) {
    console.log(`\n⚠ Alınamayan iller: ${basarisiz.join(", ")}`);
    console.log("  Aynı komutu bu plakalarla tekrar çalıştır.");
    process.exitCode = 1;
  }
}

await main();
