/**
 * DEJENERE GEOMETRİ — "poligon değil" ile "bozuk poligon" ayrımı.
 *
 * 2026-08-08: AFAD, Mersin/Tarsus "TARSUS DEVLET PARKI" alanını iki noktalı
 * bir LineString olarak verdi (alanM2 = 0). Denetim bunu "bozuk poligon"
 * sayıp KRİTİK verdi ve TEK BİR kayıt 39 ilin yayınını durdurdu.
 *
 * Oysa ürün bunu zaten doğru işliyor: `poligonlastir()` null döndüğü için
 * alan `min.json`'a nokta olarak giriyor (en yakın alan araması çalışır) ve
 * `geo.json`'a girmiyor (yanlış şekil çizilmez). Yani sonuç, geometrisi hiç
 * olmayan alanla aynı — o da uyarı.
 *
 * Buradaki testler bu ayrımı sabitler: poligon ÜRETİLEMEMESİ kabul edilebilir
 * bir bozulmadır, poligon İDDİA EDİP bozuk halka vermek değildir.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { halkalar, poligonlastir } from "./geo.ts";

/** Denetimdeki sınıflandırmanın aynısı. */
function siniflandir(geometri: Parameters<typeof halkalar>[0]) {
  const h = halkalar(geometri);
  if (!h.length) return "poligonsuz";
  if (h.some((r) => r.length < 4)) return "bozuk";
  return "saglam";
}

const KARE = [
  [34.0, 36.0],
  [34.1, 36.0],
  [34.1, 36.1],
  [34.0, 36.1],
  [34.0, 36.0],
];

test("🔴 dejenere LineString 'bozuk' değil 'poligonsuz' sayılır", () => {
  const cizgi = {
    type: "LineString",
    coordinates: [
      [34.899247349, 36.947168589],
      [34.900019826, 36.947168589],
    ],
  };
  assert.equal(siniflandir(cizgi), "poligonsuz");
  assert.equal(poligonlastir(cizgi), null, "çizim için poligon üretilmemeli");
});

test("üç noktalı halka BOZUK sayılır — kapalı halka en az 4 nokta ister", () => {
  const eksik = {
    type: "Polygon",
    coordinates: [[[34.0, 36.0], [34.1, 36.0], [34.0, 36.0]]],
  };
  assert.equal(siniflandir(eksik), "bozuk");
});

test("sağlam poligon sağlam kalır", () => {
  assert.equal(siniflandir({ type: "Polygon", coordinates: [KARE] }), "saglam");
});

test("GeometryCollection: poligon + dejenere çizgi birlikteyse sağlam", () => {
  // Ankara/Ayrancı "Pablo Neruda Parkı" böyle geldi.
  const karisik = {
    type: "GeometryCollection",
    geometries: [
      { type: "Polygon", coordinates: [KARE] },
      { type: "LineString", coordinates: [[34.0, 36.0], [34.1, 36.0]] },
    ],
  };
  assert.equal(siniflandir(karisik), "saglam");
  const p = poligonlastir(karisik);
  assert.equal(p?.type, "Polygon", "çizgi atılıp poligon çıkarılmalı");
});

test("yalnız çizgi içeren GeometryCollection poligonsuzdur", () => {
  const yalnizCizgi = {
    type: "GeometryCollection",
    geometries: [{ type: "LineString", coordinates: [[34.0, 36.0], [34.1, 36.0]] }],
  };
  assert.equal(siniflandir(yalnizCizgi), "poligonsuz");
  assert.equal(poligonlastir(yalnizCizgi), null);
});
