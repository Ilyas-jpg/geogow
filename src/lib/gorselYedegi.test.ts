/**
 * ÇEVRİMDIŞI GÖRSEL YEDEĞİ — sw.js'teki varyant düşme mantığının testi.
 *
 * Neden test: kabuk önbelleğinde yalnız PNG var, ama `<picture>` yüzünden
 * tarayıcı `.avif` istiyor. Bu eşleme yanlışsa hata SESSİZDİR — sayfa
 * açılır, yalnız görseller kırık çıkar ve bu ancak uçak modunda fark
 * edilir. Mantık burada saf fonksiyon olarak sabitlendi.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

const GORSEL_UZANTILARI = [".avif", ".webp", ".png"];

/** sw.js `gorselYedegi()` ile aynı mantık; `onbellekte` = cache sorgusu. */
function yedekYolu(yol: string, onbellekte: (aday: string) => boolean) {
  const nokta = yol.lastIndexOf(".");
  if (nokta === -1) return null;
  const taban = yol.slice(0, nokta);
  for (const uzanti of GORSEL_UZANTILARI) {
    if (onbellekte(taban + uzanti)) return taban + uzanti;
  }
  return null;
}

const yalnizPng = (aday: string) => aday.endsWith(".png");

test("AVIF istenip önbellekte yalnız PNG varsa PNG'ye düşer", () => {
  assert.equal(
    yedekYolu("/cizim/heyelan.avif", yalnizPng),
    "/cizim/heyelan.png"
  );
});

test("WebP isteği de aynı PNG'ye düşer", () => {
  assert.equal(yedekYolu("/cizim/cig.webp", yalnizPng), "/cizim/cig.png");
});

test("alt dizindeki ekipman ikonu da çözülür", () => {
  assert.equal(
    yedekYolu("/cizim/ekipman/su.avif", yalnizPng),
    "/cizim/ekipman/su.png"
  );
});

test("AVIF önbellekteyse PNG'ye inmez — sıra korunur", () => {
  const hepsi = () => true;
  assert.equal(yedekYolu("/cizim/sel.avif", hepsi), "/cizim/sel.avif");
});

test("hiçbir varyant yoksa null döner, uydurma yol üretmez", () => {
  assert.equal(yedekYolu("/cizim/olmayan.avif", () => false), null);
});

test("uzantısız yol null döner — nokta arama taşmaz", () => {
  assert.equal(yedekYolu("/cizim/uzantisiz", yalnizPng), null);
});

test("🔴 noktalı klasör adı gövdeyi kesmez", () => {
  // `lastIndexOf` kullanılmasaydı "/cizim/v1.2/sel.avif" yanlış bölünürdü.
  assert.equal(
    yedekYolu("/cizim/v1.2/sel.avif", yalnizPng),
    "/cizim/v1.2/sel.png"
  );
});
