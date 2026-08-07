import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ayiklaToplanmaAlanlari } from "./edevlet.mjs";

const buradan = dirname(fileURLToPath(import.meta.url));
const fixture = (ad) => readFileSync(join(buradan, "fixture", ad), "utf8");

/**
 * Bu testin amacı ayrıştırıcının doğruluğu KADAR e-Devlet sayfasının
 * değişmesini yakalamaktır: fixture gerçek yanıttan alınmıştır.
 * Sayfa yapısı değişirse burada kırılır — üretimde sessiz veri kaybı olmaz.
 */
test("gerçek Sorgula yanıtından mahalle poligonunu çıkarır", () => {
  const sonuc = ayiklaToplanmaAlanlari(fixture("sorgula-gercek.html"));
  assert.ok(Array.isArray(sonuc), "Feature dizisi bekleniyordu");
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].type, "Feature");
  assert.equal(sonuc[0].geometry.type, "Polygon");
  assert.equal(sonuc[0].properties.name, "AKŞEMSETTİN");
  // Değişkenin adı yanıltıcı: içeriği TOPLANMA ALANI değil, MAHALLE sınırı.
  // Alanların kendisi getAlanlarForNokta ucundan gelir (ölçüldü 2026-08-06).
  assert.equal(sonuc[0].properties.uavt_code, 90324);
  assert.ok(sonuc[0].geometry.coordinates[0].length > 3);
});

test("alan tanımlı değilse null döner (boş dizi ve null gövdesi)", () => {
  assert.equal(ayiklaToplanmaAlanlari("var toplanmaAlanlari = null;\n"), null);
  assert.equal(ayiklaToplanmaAlanlari("var toplanmaAlanlari = [];\n"), null);
});

test("değişken sayfada yoksa undefined döner — 'veri yok' ile karıştırılmaz", () => {
  // Bu ayrım kritik: null = 'AFAD kaydında alan yok',
  // undefined = 'sayfa beklediğimiz gibi değil' (hata, sessizce yutulmamalı).
  assert.equal(ayiklaToplanmaAlanlari("<html><body>hata</body></html>"), undefined);
  assert.equal(ayiklaToplanmaAlanlari("var toplanmaAlanlari = {bozuk;\n"), undefined);
});

test("değişken </script> ile aynı satırda bitse de okunur", () => {
  const html = 'var toplanmaAlanlari = [{"type":"Feature"}];</script>';
  const sonuc = ayiklaToplanmaAlanlari(html);
  assert.ok(Array.isArray(sonuc));
  assert.equal(sonuc.length, 1);
});
