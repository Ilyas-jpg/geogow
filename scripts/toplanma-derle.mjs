#!/usr/bin/env node
/**
 * DERLEME — ham hasat çıktısını yayınlanabilir dosyalara çevirir.
 *
 * Çıktılar (public/data/toplanma/):
 *   {plaka}.min.json      İstemciye giden kompakt nokta seti (bütçe: <80 KB br)
 *   {plaka}.geo.json      Poligonlar — yalnız alan seçilince / çevrimdışı kayıtta
 *   {plaka}-mahalle.json  Mahalle → alan eşlemesi (metin sürümü ve kapsam için)
 *   ozet.json             İl bazında kapsam + toplama tarihi
 *
 * ⚠️ Bütçe ölçümü TAHMİN DEĞİL: brotli ile gerçek boyut hesaplanır ve aşan il
 *    ekrana yazılır. Yangın projesinin dersi: payload'ı sıkıştırmadan ölçmek
 *    yanlış alarm (ve yanlış rahatlama) üretir.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";
import { pathToFileURL } from "node:url";
import { ILLER, PLAKAYA_GORE, katla, slugla } from "../src/lib/iller.ts";
import { kisaAd, anlamliAdres, kompaktSatir, temizTabela } from "../src/lib/alan.ts";
import { mesafeM } from "../src/lib/geo.ts";
import { poligonlastir } from "../src/lib/geo.ts";

const HAM_DIZIN = "data/ham";
const CIKTI_DIZIN = "public/data/toplanma";
const BUTCE_KB = 80;

const brotliKB = (metin) =>
  brotliCompressSync(Buffer.from(metin, "utf8"), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length / 1024;

/** İl adından plakaya — alanlar KENDİ il_adi'sine göre gruplanır. */
const ADDAN_PLAKA = new Map(ILLER.map((il) => [katla(il.ad), il.plaka]));

/**
 * 🔑 Nokta sorgusu il sınırı tanımıyor: Kilis hasadında Gaziantep alanı,
 * referans veri setinde ise Kilis mahallesine Kahramanmaraş alanı döndüğü
 * ölçüldü. Bu yüzden alan, HASADI YAPAN ile değil KENDİ `il_adi`'sine
 * yazılır — yoksa "Kilis'in toplanma alanları" listesinde başka ilin alanı
 * çıkar ve kullanıcı yanlış yere yönlendirilir.
 */
function ilDerle(plaka, havuz) {
  const ham = JSON.parse(readFileSync(`${HAM_DIZIN}/${plaka}.json`, "utf8"));
  const il = PLAKAYA_GORE.get(plaka);

  const alanlar = (havuz.get(plaka) ?? []).filter(
    (a) => Number.isFinite(a.enlem) && Number.isFinite(a.boylam)
  );

  const min = {
    p: plaka,
    il: il.ad,
    t: ham.toplandi,
    // [id, enlem, boylam, kısaAd, tabelaKod, alanM2]
    a: alanlar.map(kompaktSatir),
  };
  const minMetin = JSON.stringify(min);

  const geo = {
    type: "FeatureCollection",
    kaynak: ham.kaynak,
    toplandi: ham.toplandi,
    features: alanlar
      // GeometryCollection'lar çizilebilir poligona indirgenir; poligon
      // içermeyen kayıt haritaya girmez (noktası zaten min dosyasında).
      .map((a) => ({ ...a, cizilebilir: poligonlastir(a.geometri) }))
      .filter((a) => a.cizilebilir)
      .map((a) => ({
        type: "Feature",
        geometry: a.cizilebilir,
        properties: {
          id: a.id,
          ad: a.ad,
          kisaAd: kisaAd(a.ad),
          tabelaKod: temizTabela(a.tabelaKod),
          adres: anlamliAdres(a.adres, a.ad),
          il: a.il,
          ilce: a.ilce,
          mahalle: a.mahalle,
          alanM2: a.alanM2,
        },
      })),
  };

  // Mahalle eşlemesi: metin sürümü (JS'siz) ve kapsam raporu buradan beslenir.
  const ilceAdi = new Map(ham.ilceler.map((i) => [i.id, i.ad]));
  const mahalleKayitlari = [];
  for (const [mahalleId, alanIdler] of Object.entries(ham.mahalleAlan)) {
    mahalleKayitlari.push({ id: Number(mahalleId), alanlar: alanIdler });
  }

  const mahalleDosyasi = {
    plaka,
    il: il.ad,
    toplandi: ham.toplandi,
    ilceler: ham.ilceler.map((i) => ({
      id: i.id,
      ad: i.ad,
      mahalleSayisi: i.mahalleSayisi,
    })),
    mahalleAlan: ham.mahalleAlan,
    // "Alan yok" DEĞİL — "AFAD kaydında görünmüyor". İkisi farklı iddia.
    kayittaGorunmeyen: [...ham.alansizMahalleler, ...ham.sinirsizMahalleler].map(
      (m) => ({ id: m.id, ad: m.ad, ilce: m.ilce ?? ilceAdi.get(m.ilceId) ?? null })
    ),
  };

  /**
   * Metin sürümü indeksi (`/dusuk`) — JS'siz, haritasız erişim için.
   * Mahalle adları alan kayıtlarının kendisinden geliyor (`mahalle_adi`),
   * ayrı bir istek gerekmiyor. Bu sayfa afet anında en dayanıklı yüzey:
   * harita motoru, konum izni, hatta JavaScript gerektirmiyor.
   */
  const metinIlceler = new Map();
  for (const alan of alanlar) {
    const ilceAd = alan.ilce ?? "—";
    const mahalleAd = alan.mahalle ?? "—";
    if (!metinIlceler.has(ilceAd)) metinIlceler.set(ilceAd, new Map());
    const mahalleler = metinIlceler.get(ilceAd);
    if (!mahalleler.has(mahalleAd)) mahalleler.set(mahalleAd, []);
    mahalleler.get(mahalleAd).push({
      id: alan.id,
      ad: kisaAd(alan.ad),
      tamAd: alan.ad,
      tabelaKod: temizTabela(alan.tabelaKod),
      adres: anlamliAdres(alan.adres, alan.ad),
      enlem: Number(alan.enlem?.toFixed(5)),
      boylam: Number(alan.boylam?.toFixed(5)),
      alanM2: alan.alanM2,
    });
  }
  const metin = {
    plaka,
    il: il.ad,
    ilSlug: il.slug,
    toplandi: ham.toplandi,
    ilceler: [...metinIlceler.entries()]
      .map(([ad, mahalleler]) => ({
        ad,
        slug: slugla(ad),
        mahalleler: [...mahalleler.entries()]
          .map(([mAd, alanDizisi]) => ({
            ad: mAd,
            slug: slugla(mAd),
            alanlar: alanDizisi.sort((x, y) => (x.ad ?? "").localeCompare(y.ad ?? "", "tr")),
          }))
          .sort((x, y) => x.ad.localeCompare(y.ad, "tr")),
      }))
      .sort((x, y) => x.ad.localeCompare(y.ad, "tr")),
  };

  mkdirSync(CIKTI_DIZIN, { recursive: true });
  writeFileSync(`${CIKTI_DIZIN}/${plaka}.metin.json`, JSON.stringify(metin), "utf8");
  writeFileSync(`${CIKTI_DIZIN}/${plaka}.min.json`, minMetin, "utf8");
  writeFileSync(`${CIKTI_DIZIN}/${plaka}.geo.json`, JSON.stringify(geo), "utf8");
  writeFileSync(
    `${CIKTI_DIZIN}/${plaka}-mahalle.json`,
    JSON.stringify(mahalleDosyasi),
    "utf8"
  );

  /**
   * YERLEŞİM TABANLI ERİŞİM ÖLÇÜSÜ.
   * Her mahallenin MERKEZİNDEN en yakın toplanma alanına mesafe. İl kutusunu
   * ızgaralayan kaba analiz dağ-tarlayı da sayıyordu ve yanıltıcıydı; bu ölçü
   * yalnız gerçek yerleşim birimlerini sayar. Girdi hasat sırasında sıfır ek
   * istekle toplanır (mahalle poligonu zaten çekiliyordu).
   */
  const mahalleMesafeleri = [];
  for (const m of ham.mahalleler ?? []) {
    if (!Number.isFinite(m.enlem) || !Number.isFinite(m.boylam)) continue;
    let enYakin = Infinity;
    for (const a of alanlar) {
      const d = mesafeM(m.enlem, m.boylam, a.enlem, a.boylam);
      if (d < enYakin) enYakin = d;
    }
    if (Number.isFinite(enYakin)) mahalleMesafeleri.push(Math.round(enYakin));
  }
  mahalleMesafeleri.sort((x, y) => x - y);
  const yuzdelik = (p) =>
    mahalleMesafeleri.length
      ? mahalleMesafeleri[Math.min(mahalleMesafeleri.length - 1, Math.floor(mahalleMesafeleri.length * p))]
      : null;
  const erisim = mahalleMesafeleri.length
    ? {
        olculenMahalle: mahalleMesafeleri.length,
        medyanM: yuzdelik(0.5),
        p90M: yuzdelik(0.9),
        yakin500: mahalleMesafeleri.filter((d) => d <= 500).length,
        yakin1000: mahalleMesafeleri.filter((d) => d <= 1000).length,
      }
    : null;

  const toplamMahalle = ham.ilceler.reduce((t, i) => t + i.tarananMahalle, 0);
  const kapsanan = Object.keys(ham.mahalleAlan).length;
  const minKB = brotliKB(minMetin);

  /**
   * İl kutusu ve merkezi — istemci HANGİ il dosyasını indireceğini buradan
   * bulur. Kutu, ilin alanlarından türetiliyor (ayrı bir sınır veri seti
   * indirmemek için); "kaba kapsayıcı" olduğu bilinçli.
   */
  const enlemler = alanlar.map((a) => a.enlem);
  const boylamlar = alanlar.map((a) => a.boylam);
  const ilKutusu = alanlar.length
    ? [
        Math.min(...boylamlar),
        Math.min(...enlemler),
        Math.max(...boylamlar),
        Math.max(...enlemler),
      ].map((n) => Number(n.toFixed(4)))
    : null;
  const ilMerkezi = ilKutusu
    ? [
        Number(((ilKutusu[1] + ilKutusu[3]) / 2).toFixed(4)),
        Number(((ilKutusu[0] + ilKutusu[2]) / 2).toFixed(4)),
      ]
    : null;

  return {
    plaka,
    il: il.ad,
    slug: il.slug,
    kutu: ilKutusu,
    merkez: ilMerkezi,
    alan: alanlar.length,
    poligon: geo.features.length,
    ilce: ham.ilceler.length,
    mahalle: toplamMahalle,
    kapsananMahalle: kapsanan,
    kapsamYuzde: toplamMahalle ? Math.round((kapsanan / toplamMahalle) * 1000) / 10 : 0,
    kayittaGorunmeyen: mahalleDosyasi.kayittaGorunmeyen.length,
    toplandi: ham.toplandi,
    erisim,
    minBrotliKB: Math.round(minKB * 10) / 10,
    butceAsimi: minKB > BUTCE_KB,
  };
}

function main() {
  if (!existsSync(HAM_DIZIN)) {
    console.error(`${HAM_DIZIN} yok — önce hasat çalıştırılmalı.`);
    process.exit(1);
  }
  const plakalar = readdirSync(HAM_DIZIN)
    .filter((d) => /^\d+\.json$/.test(d))
    .map((d) => Number(d.replace(".json", "")))
    .sort((a, b) => a - b);

  if (!plakalar.length) {
    console.error("Tamamlanmış il dosyası yok (data/ham/<plaka>.json).");
    process.exit(1);
  }

  // ── Tüm hasatlardan gelen alanları KENDİ iline göre havuzla ──
  const havuz = new Map(); // plaka → alan[]
  const gorulen = new Set();
  const ilsiz = [];
  for (const plaka of plakalar) {
    const ham = JSON.parse(readFileSync(`${HAM_DIZIN}/${plaka}.json`, "utf8"));
    for (const alan of ham.alanlar) {
      if (gorulen.has(alan.id)) continue;
      gorulen.add(alan.id);
      const hedef = ADDAN_PLAKA.get(katla(alan.il ?? ""));
      if (!hedef) {
        ilsiz.push(alan);
        continue;
      }
      if (!havuz.has(hedef)) havuz.set(hedef, []);
      havuz.get(hedef).push(alan);
    }
  }
  if (ilsiz.length) {
    console.log(
      `⚠ ${ilsiz.length} alanın il adı tanınmadı (örn. "${ilsiz[0].il}") — ` +
        `hiçbir il dosyasına yazılmadı, sessizce kaybolmasın diye bildiriliyor.`
    );
  }
  const yabanci = [...havuz.keys()].filter((p) => !plakalar.includes(p));
  if (yabanci.length) {
    console.log(
      `ℹ ${yabanci.length} ilin alanı komşu hasadından geldi ` +
        `(${yabanci.map((p) => PLAKAYA_GORE.get(p)?.ad).join(", ")}) — ` +
        `o iller kendi hasadını bekliyor, şimdilik yayınlanmıyor.`
    );
  }

  const satirlar = plakalar.map((plaka) => ilDerle(plaka, havuz));
  const ozet = {
    sema: 1,
    uretildi: new Date().toISOString(),
    kaynak: "AFAD / e-Devlet Afet ve Acil Durum Toplanma Alanı Sorgulama",
    ilSayisi: satirlar.length,
    toplamAlan: satirlar.reduce((t, s) => t + s.alan, 0),
    iller: satirlar,
  };
  writeFileSync(`${CIKTI_DIZIN}/ozet.json`, JSON.stringify(ozet), "utf8");

  console.log(`\n${satirlar.length} il derlendi · toplam ${ozet.toplamAlan} alan\n`);
  console.log("plaka  il                 alan  poligon  mahalle  kapsam   min(br)");
  for (const s of satirlar) {
    console.log(
      `${String(s.plaka).padStart(5)}  ${s.il.padEnd(16)} ${String(s.alan).padStart(5)}` +
        `  ${String(s.poligon).padStart(7)}  ${String(s.mahalle).padStart(7)}` +
        `  %${String(s.kapsamYuzde).padStart(5)}  ${String(s.minBrotliKB).padStart(6)} KB` +
        (s.butceAsimi ? `  ⚠ bütçe aşımı (>${BUTCE_KB} KB)` : "")
    );
  }
  const asan = satirlar.filter((s) => s.butceAsimi);
  if (asan.length) {
    console.log(
      `\n⚠ ${asan.length} il istemci bütçesini aşıyor — ilçe bazlı bölme gerekecek.`
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { ilDerle };
