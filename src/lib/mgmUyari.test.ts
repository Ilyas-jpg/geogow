import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { uyariCozumle, afeteGore, type HamUyari, type HamMerkez } from "./mgmUyari.ts";

const buradan = dirname(fileURLToPath(import.meta.url));
const oku = (ad: string) =>
  JSON.parse(readFileSync(join(buradan, "fixture", ad), "utf8"));

/** Gerçek MGM yanıtından kırpılmış fixture (2026-08-10 ölçümü). */
const HAM: HamUyari[] = oku("mgm-meteoalarm.json");
const MERKEZLER: HamMerkez[] = oku("mgm-merkezler.json");

/** Fixture'daki kayıtların hepsinin açık olduğu bir an. */
const ESKI_AN = new Date("2020-01-01T00:00:00Z");

test("gerçek MGM yanıtı çözümlenir ve iller bulunur", () => {
  const { uyarilar, cozulemeyenKod } = uyariCozumle(HAM, MERKEZLER, ESKI_AN);
  assert.ok(uyarilar.length >= 5, `beklenenden az uyarı: ${uyarilar.length}`);
  assert.equal(cozulemeyenKod, 0, "fixture'daki tüm kodlar çözülmeliydi");
  for (const u of uyarilar) {
    assert.ok(u.iller.length > 0, "il listesi boş olmamalı");
    assert.ok(u.metin.length > 10, "MGM metni taşınmalı");
    assert.ok(u.iller.every((i) => i.plaka >= 1 && i.plaka <= 81));
  }
});

test("🔴 bitmiş uyarı gösterilmez", () => {
  const simdi = new Date("2030-01-01T00:00:00Z");
  const { uyarilar } = uyariCozumle(HAM, MERKEZLER, simdi);
  assert.equal(uyarilar.length, 0, "geleceğe göre hepsi bitmiş olmalıydı");
});

test("aynı kayıttaki iki kademe AYRI uyarı olur", () => {
  // MGM tek kayıtta hem sarı hem turuncu bölge verebiliyor; tek kademeye
  // indirmek turuncu bölgedeki kişiye sarı göstermek olurdu.
  const cokKademeli = HAM.filter(
    (u) => (u.towns?.yellow?.length ?? 0) > 0 && (u.towns?.orange?.length ?? 0) > 0
  );
  assert.ok(cokKademeli.length > 0, "fixture çok kademeli kayıt içermeli");

  const { uyarilar } = uyariCozumle(cokKademeli, MERKEZLER, ESKI_AN);
  const kademeler = new Set(uyarilar.map((u) => u.kademe));
  assert.ok(kademeler.has("yellow") && kademeler.has("orange"));
});

test("tehlike türü doğru afet sayfasına bağlanır", () => {
  const { uyarilar } = uyariCozumle(HAM, MERKEZLER, ESKI_AN);

  const sicak = uyarilar.find((u) => u.turler.includes("hot"));
  assert.ok(sicak, "fixture 'hot' uyarısı içermeli");
  assert.deepEqual(sicak.afetler, ["asiri-sicak"]);

  const cig = uyarilar.find((u) => u.turler.includes("avalanche"));
  assert.ok(cig, "fixture 'avalanche' uyarısı içermeli");
  assert.deepEqual(cig.afetler, ["cig"]);

  assert.ok(afeteGore(uyarilar, "sel").length > 0, "yağış uyarısı sele bağlanmalı");
  assert.equal(afeteGore(uyarilar, "deprem").length, 0, "depremin meteoroloji uyarısı olmaz");
});

test("🔴 karşılığı olmayan tür uydurma afete bağlanmaz", () => {
  const ham: HamUyari[] = [
    {
      alertNo: 1,
      end: "2030-01-01T00:00:00.000Z",
      text: { yellow: "Yoğun sis bekleniyor, görüş mesafesi düşecektir." },
      weather: { yellow: ["fog"] },
      towns: { yellow: [MERKEZLER[0].merkezId as number] },
    },
  ];
  const { uyarilar } = uyariCozumle(ham, MERKEZLER, ESKI_AN);
  assert.equal(uyarilar.length, 1);
  assert.deepEqual(uyarilar[0].afetler, [], "sis hiçbir afet sayfamıza bağlanmamalı");
});

test("🔴 çözülemeyen ilçe kodu sessizce yutulmaz, sayılır", () => {
  // Ölçüldü: 5.801 uyarılık arşivde 204 kod merkez listesinde yok.
  // Sessizce atlamak, "burada uyarı yok" yalanının kaynağı olur.
  const ham: HamUyari[] = [
    {
      alertNo: 2,
      end: "2030-01-01T00:00:00.000Z",
      text: { yellow: "Kuvvetli rüzgar bekleniyor, dikkatli olunmalıdır." },
      weather: { yellow: ["wind"] },
      towns: { yellow: [MERKEZLER[0].merkezId as number, 999999] },
    },
  ];
  const { uyarilar, cozulemeyenKod } = uyariCozumle(ham, MERKEZLER, ESKI_AN);
  assert.equal(cozulemeyenKod, 1);
  assert.equal(uyarilar.length, 1, "bir kod çözülemedi diye uyarı düşmemeli");
});

test("ciddi kademe önce sıralanır", () => {
  const { uyarilar } = uyariCozumle(HAM, MERKEZLER, ESKI_AN);
  const sira = { red: 0, orange: 1, yellow: 2 };
  for (let i = 1; i < uyarilar.length; i++) {
    assert.ok(
      sira[uyarilar[i - 1].kademe] <= sira[uyarilar[i].kademe],
      "kırmızı sarıdan sonra gelemez"
    );
  }
});

test("🔴 Türkçe il adı büyük harfle gelse de eşleşir (İ/I tuzağı)", () => {
  // MGM il adını "Şanlıurfa" yazıyor; başka uçlarda "ŞANLIURFA" geçiyor.
  // katla() olmadan "I" → "i" olur ve Isparta/İstanbul karışır.
  const merkezler: HamMerkez[] = [
    { merkezId: 1, il: "ŞANLIURFA", ilce: "Merkez" },
    { merkezId: 2, il: "ısparta", ilce: "Merkez" },
    { merkezId: 3, il: "İSTANBUL", ilce: "Kadıköy" },
  ];
  const ham: HamUyari[] = [
    {
      alertNo: 3,
      end: "2030-01-01T00:00:00.000Z",
      text: { yellow: "Sağanak yağış bekleniyor, tedbirli olunmalıdır." },
      weather: { yellow: ["rain"] },
      towns: { yellow: [1, 2, 3] },
    },
  ];
  const { uyarilar, cozulemeyenKod } = uyariCozumle(ham, merkezler, ESKI_AN);
  assert.equal(cozulemeyenKod, 0);
  assert.deepEqual(
    uyarilar[0].iller.map((i) => i.plaka).sort((a, b) => a - b),
    [32, 34, 63]
  );
});
