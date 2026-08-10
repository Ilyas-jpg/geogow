import { test } from "node:test";
import assert from "node:assert/strict";

import { isiNoktalari, isiYaricapi, type IlKutusu } from "./yangin.ts";
import { sicaklikBirlestir, sicaklikGecerli, sicaklikRengi, VERI_YOK } from "./sicaklik.ts";

const simdi = Date.now();
const nokta = (lon: number, lat: number, ek: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: { frp: 5, dt: simdi, conf: "n", ...ek },
});

/** Gerçek `ozet.json` biçiminde iki il kutusu: [batı, güney, doğu, kuzey]. */
const KUTULAR: IlKutusu[] = [
  [32.0, 39.3, 33.5, 40.5], // Ankara civarı
  [34.797, 36.5747, 36.2225, 38.2652], // Adana (gerçek kayıt)
];

test("🔴 il kutusu dışındaki ısı noktaları elenir (Kerkük tuzağı)", () => {
  // Ölçüldü: tek dikdörtgen süzgeci 550 Irak noktasını Türkiye sanıyordu.
  const ham = {
    features: [
      nokta(32.8, 39.9), // Ankara — kalmalı
      nokta(35.3, 37.0), // Adana — kalmalı
      nokta(44.37, 35.51), // Kerkük — elenmeli
      nokta(28.9, 41.0), // İstanbul ama kutusu listede yok — elenmeli
    ],
  };
  const s = isiNoktalari(ham, KUTULAR);
  assert.equal(s.length, 2);
  assert.ok(s.every((n) => n.k[0] < 40), "sınır dışı nokta sızmamalı");
});

test("kutu listesi boşsa hiçbir nokta yayınlanmaz", () => {
  // Boş kutu listesiyle "hepsini geçir" davranışı, tüm bölgeyi Türkiye
  // saymak olurdu.
  assert.deepEqual(isiNoktalari({ features: [nokta(32.8, 39.9)] }, []), []);
});

test("🔴 eski algılamalar elenir (bayat ısı noktası 'şu an yanıyor' sanılır)", () => {
  const ham = {
    features: [
      nokta(32.8, 39.9, { dt: simdi }),
      nokta(33.0, 39.9, { dt: simdi - 100 * 3600_000 }),
    ],
  };
  assert.equal(isiNoktalari(ham, KUTULAR, 48).length, 1);
});

test("bozuk kayıt uygulamayı düşürmez", () => {
  const ham = {
    features: [
      { geometry: null, properties: {} },
      { geometry: { coordinates: ["a", "b"] }, properties: {} },
      { geometry: { coordinates: [32.8] }, properties: {} },
      nokta(32.8, 39.9),
    ],
  };
  assert.equal(isiNoktalari(ham, KUTULAR).length, 1);
  assert.deepEqual(isiNoktalari(null, KUTULAR), []);
  assert.deepEqual(isiNoktalari({}, KUTULAR), []);
});

test("bilinmeyen güven kodu uydurulmaz, nominale düşer", () => {
  const s = isiNoktalari({ features: [nokta(32.8, 39.9, { conf: "??" })] }, KUTULAR);
  assert.equal(s[0].guven, "n");
  const y = isiNoktalari({ features: [nokta(32.8, 39.9, { conf: "h" })] }, KUTULAR);
  assert.equal(y[0].guven, "h");
});

test("yarıçap güçle büyür ama tavanı var", () => {
  assert.ok(isiYaricapi(0) < isiYaricapi(50));
  assert.ok(isiYaricapi(50) < isiYaricapi(500));
  assert.ok(isiYaricapi(100000) <= 14, "tek nokta haritayı kaplayamaz");
});

test("🔴 -9999 sıcaklık DEĞİL, veri yok demektir", () => {
  assert.equal(sicaklikGecerli(VERI_YOK), false);
  assert.equal(sicaklikGecerli(-9999), false);
  assert.equal(sicaklikGecerli(25.7), true);
  assert.equal(sicaklikGecerli(null), false);
  assert.equal(sicaklikGecerli("25"), false);

  const merkez = { merkezId: 90601, il: "Ankara", enlem: 39.97, boylam: 32.86 };
  assert.equal(sicaklikBirlestir(merkez, { sicaklik: VERI_YOK }), null);
  assert.equal(sicaklikBirlestir(merkez, null), null);
});

test("il adı plakaya çözülür (Türkçe İ/I)", () => {
  const kayit = sicaklikBirlestir(
    { merkezId: 1, il: "ISPARTA", enlem: 37.76, boylam: 30.55 },
    { sicaklik: 31.4, veriZamani: "2026-08-10T18:00:00.000Z" }
  );
  assert.ok(kayit);
  assert.equal(kayit.plaka, 32);
  assert.equal(kayit.il, "Isparta");
  assert.equal(kayit.sicaklik, 31.4);
});

test("sıcaklık rengi soğuktan sıcağa ayrışır", () => {
  const renkler = [-5, 5, 15, 25, 32, 38, 45].map(sicaklikRengi);
  assert.equal(new Set(renkler).size, renkler.length, "her kuşak ayrı renk almalı");
});
