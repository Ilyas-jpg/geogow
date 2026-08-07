#!/usr/bin/env node
/**
 * DENETİM — hasat çıktısını yayınlamadan önce sınar.
 *
 * Kural (perspektif projesinin kanıtlanmış dersi): "yanlış sınır basmaktansa
 * boş kalsın". KRİTİK bulgu varsa derleme/yayın yapılmaz.
 *
 * ⚠️ Bu betik ÖZET SATIRINA DEĞİL, dosyanın kendisine bakar. Vault dersi:
 *    "ARTIK 9.634 birim çizilir" yazan özetin çıktısında 0 tane vardı.
 *
 * Kullanım: node scripts/toplanma-denetim.mjs [--il=71] [--ayrinti]
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PLAKAYA_GORE } from "../src/lib/iller.ts";
import { alanM2, halkalar, turkiyeIcinde, mesafeM } from "../src/lib/geo.ts";

const HAM_DIZIN = "data/ham";

/** Bir toplanma alanı bu değerlerden büyükse veri hatası şüphesi var. */
const EN_BUYUK_MAKUL_M2 = 2_000_000; // 2 km² — en büyük şehir parkları bunun altında
const EN_KUCUK_MAKUL_M2 = 20; // 20 m² altı çizim hatası

export function ilDenetle(plaka) {
  const ham = JSON.parse(readFileSync(`${HAM_DIZIN}/${plaka}.json`, "utf8"));
  const il = PLAKAYA_GORE.get(plaka);
  const kritik = [];
  const uyari = [];
  const bilgi = [];

  /* ── Kimlik bütünlüğü ── */
  const gorulen = new Set();
  const cift = [];
  for (const alan of ham.alanlar) {
    if (alan.id == null) kritik.push("id'siz alan kaydı var");
    else if (gorulen.has(alan.id)) cift.push(alan.id);
    else gorulen.add(alan.id);
  }
  if (cift.length) kritik.push(`${cift.length} tekrarlı alan kimliği`);

  /* ── Konum ── */
  const disarida = ham.alanlar.filter(
    (a) => !Number.isFinite(a.enlem) || !Number.isFinite(a.boylam) || !turkiyeIcinde(a.enlem, a.boylam)
  );
  if (disarida.length)
    kritik.push(
      `${disarida.length} alan Türkiye kutusu dışında/koordinatsız ` +
        `(ilk: ${disarida[0]?.ad ?? "?"} ${disarida[0]?.enlem},${disarida[0]?.boylam})`
    );

  /* ── Geometri ── */
  const geometrisiz = ham.alanlar.filter((a) => !a.geometri);
  if (geometrisiz.length) uyari.push(`${geometrisiz.length} alanın poligonu yok`);

  const bozuk = [];
  const cokBuyuk = [];
  const cokKucuk = [];
  const uzakMerkez = [];
  for (const alan of ham.alanlar) {
    if (!alan.geometri) continue;
    const halkaDizisi = halkalar(alan.geometri);
    if (!halkaDizisi.length || halkaDizisi.some((h) => h.length < 4)) {
      bozuk.push(alan.id);
      continue;
    }
    const m2 = alanM2(alan.geometri);
    if (m2 > EN_BUYUK_MAKUL_M2) cokBuyuk.push({ id: alan.id, ad: alan.ad, m2 });
    else if (m2 < EN_KUCUK_MAKUL_M2) cokKucuk.push({ id: alan.id, ad: alan.ad, m2 });

    // Servisin verdiği x/y ile poligonun kendisi tutuyor mu?
    const ilkNokta = halkaDizisi[0][0];
    if (ilkNokta && Number.isFinite(alan.enlem)) {
      const uzaklik = mesafeM(alan.enlem, alan.boylam, ilkNokta[1], ilkNokta[0]);
      if (uzaklik > 5000) uzakMerkez.push({ id: alan.id, ad: alan.ad, uzaklik: Math.round(uzaklik) });
    }
  }
  if (bozuk.length) kritik.push(`${bozuk.length} bozuk poligon (halka < 4 nokta)`);
  if (cokBuyuk.length)
    uyari.push(
      `${cokBuyuk.length} alan 2 km²'den büyük (en büyüğü ${Math.round(
        Math.max(...cokBuyuk.map((c) => c.m2)) / 10000
      )} ha)`
    );
  if (cokKucuk.length) uyari.push(`${cokKucuk.length} alan 20 m²'den küçük`);
  if (uzakMerkez.length)
    kritik.push(
      `${uzakMerkez.length} alanın nokta koordinatı poligonundan 5 km'den uzak ` +
        `(ilk: ${uzakMerkez[0].ad} ${uzakMerkez[0].uzaklik} m)`
    );

  /* ── İçerik ── */
  const adsiz = ham.alanlar.filter((a) => !a.ad);
  if (adsiz.length) uyari.push(`${adsiz.length} alanın adı yok`);
  const tabelali = ham.alanlar.filter((a) => a.tabelaKod).length;
  bilgi.push(
    `tabela kodu olan ${tabelali}/${ham.alanlar.length} ` +
      `(%${Math.round((tabelali / Math.max(1, ham.alanlar.length)) * 100)})`
  );

  /* ── Kapsam ── */
  const toplamMahalle = ham.ilceler.reduce((t, i) => t + i.tarananMahalle, 0);
  const kapsanan = Object.keys(ham.mahalleAlan).length;
  const gorunmeyen = ham.alansizMahalleler.length + ham.sinirsizMahalleler.length;
  if (toplamMahalle && kapsanan / toplamMahalle < 0.5)
    kritik.push(
      `kapsam %${Math.round((kapsanan / toplamMahalle) * 100)} — yarıdan az, hasat eksik olabilir`
    );
  const bosIlceler = ham.ilceler.filter((i) => {
    const idler = new Set(
      ham.alanlar.filter((a) => a.ilce && a.ilce.toUpperCase() === i.ad.toUpperCase()).map((a) => a.id)
    );
    return idler.size === 0;
  });
  if (bosIlceler.length)
    uyari.push(`${bosIlceler.length} ilçede hiç alan yok: ${bosIlceler.map((i) => i.ad).join(", ")}`);

  bilgi.push(
    `${ham.alanlar.length} alan · ${ham.ilceler.length} ilçe · ` +
      `${kapsanan}/${toplamMahalle} mahalle kapsandı · kayıtta görünmeyen ${gorunmeyen}`
  );
  bilgi.push(
    `hasat ölçümü: ${ham.olcum.istek} istek · ${ham.olcum.hata} hata · ` +
      `${(ham.olcum.istek / Math.max(1, ham.olcum.taranan)).toFixed(2)} istek/mahalle`
  );

  return { plaka, il: il.ad, kritik, uyari, bilgi, cokBuyuk, cokKucuk };
}

function main() {
  const arg = process.argv.slice(2);
  const ayrinti = arg.includes("--ayrinti");
  const secili = arg.find((a) => a.startsWith("--il="));
  if (!existsSync(HAM_DIZIN)) {
    console.error(`${HAM_DIZIN} yok — önce hasat çalıştırılmalı.`);
    process.exit(1);
  }
  const plakalar = secili
    ? secili.slice(5).split(",").map(Number)
    : readdirSync(HAM_DIZIN)
        .filter((d) => /^\d+\.json$/.test(d))
        .map((d) => Number(d.replace(".json", "")))
        .sort((a, b) => a - b);

  let kritikToplam = 0;
  for (const plaka of plakalar) {
    const s = ilDenetle(plaka);
    kritikToplam += s.kritik.length;
    console.log(`\n── ${s.il} (${s.plaka}) ──`);
    for (const b of s.bilgi) console.log(`   ${b}`);
    for (const u of s.uyari) console.log(`   ⚠ ${u}`);
    for (const k of s.kritik) console.log(`   🔴 KRİTİK: ${k}`);
    if (ayrinti && s.cokBuyuk.length) {
      console.log("   büyük alanlar:");
      for (const c of s.cokBuyuk.slice(0, 5))
        console.log(`     ${Math.round(c.m2 / 10000)} ha · ${c.ad}`);
    }
  }

  console.log(
    `\n${plakalar.length} il denetlendi · KRİTİK ${kritikToplam}` +
      (kritikToplam ? " → yayınlanmamalı" : " ✓")
  );
  process.exit(kritikToplam ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
