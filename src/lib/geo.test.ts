import { test } from "node:test";
import assert from "node:assert/strict";

import {
  merkez,
  kutu,
  mesafeM,
  alanM2,
  kosegenM,
  ornekNoktalar,
  izgaraAnahtari,
  turkiyeIcinde,
  TURKIYE_KUTUSU,
  type Geometri,
  poligonlastir,
  halkalar,
} from "./geo.ts";

/** Kırıkkale Akşemsettin çevresinde ~500 m'lik kare (gerçek ölçek). */
const kare: Geometri = {
  type: "Polygon",
  coordinates: [
    [
      [33.5600, 39.8700],
      [33.5658, 39.8700],
      [33.5658, 39.8745],
      [33.5600, 39.8745],
      [33.5600, 39.8700],
    ],
  ],
};

test("merkez alan ağırlıklı hesaplanır", () => {
  const [boylam, enlem] = merkez(kare)!;
  assert.ok(Math.abs(boylam - 33.5629) < 1e-3);
  assert.ok(Math.abs(enlem - 39.87225) < 1e-3);
});

test("kutu [batı, güney, doğu, kuzey] sırasındadır", () => {
  assert.deepEqual(kutu(kare), [33.56, 39.87, 33.5658, 39.8745]);
});

test("mesafe küresel yaklaşımla bilinen değeri verir", () => {
  // R = 6.371.008,8 m küresinde 1° = 111.195 m.
  // Gerçek (elipsoit) meridyen derecesi 39. enlemde ≈ 111.038 m → sapma
  // %0,14; 5 km'lik bir mesafede ~7 m. "En yakın alan" sıralamasını
  // değiştirmez, gösterilen mesafeyi hissedilir biçimde bozmaz.
  const m = mesafeM(39.0, 33.0, 40.0, 33.0);
  assert.ok(Math.abs(m - 111_195) < 50, `beklenmedik mesafe: ${m}`);

  // Boylam yönü enlemle daralır: 39. enlemde 1° boylam ≈ 86,4 km
  const yatay = mesafeM(39.0, 33.0, 39.0, 34.0);
  assert.ok(Math.abs(yatay - 86_400) < 800, `beklenmedik yatay mesafe: ${yatay}`);
});

test("alan makul büyüklükte çıkar (kaba alan, kapasite DEĞİL)", () => {
  const a = alanM2(kare);
  // ~0,0058° boylam × ~0,0045° enlem ≈ 495 m × 498 m ≈ 247.000 m²
  assert.ok(a > 200_000 && a < 300_000, `beklenmedik alan: ${a}`);
});

test("küçük mahallede tek örnek nokta, büyükte ek noktalar üretilir", () => {
  assert.equal(ornekNoktalar(kare).length, 1, "küçük şekil tek nokta olmalı");
  assert.ok(kosegenM(kare) < 8000);

  const genis: Geometri = {
    type: "Polygon",
    coordinates: [
      [
        [33.0, 39.0],
        [33.3, 39.0],
        [33.3, 39.3],
        [33.0, 39.3],
        [33.0, 39.0],
      ],
    ],
  };
  const noktalar = ornekNoktalar(genis);
  assert.equal(noktalar.length, 3, "büyük şekil merkez + 2 uzak nokta olmalı");
  for (const [enlem, boylam] of noktalar) {
    assert.ok(enlem > 39.0 && enlem < 39.3, "örnek nokta sınırın içinde kalmalı");
    assert.ok(boylam > 33.0 && boylam < 33.3);
  }
});

test("ızgara anahtarı yakın noktaları toplar, uzağı ayırır", () => {
  // Aynı hücrenin içi (hücre merkezi 39.872 / 33.562 civarı)
  assert.equal(izgaraAnahtari(39.8721, 33.5623), izgaraAnahtari(39.8725, 33.5626));
  // Belirgin uzaklık ayrı hücre
  assert.notEqual(izgaraAnahtari(39.8721, 33.5623), izgaraAnahtari(39.8800, 33.5623));
  // ⚠ Bilinen ve kabul edilen davranış: hücre SINIRINA denk gelen iki yakın
  // nokta ayrı hücrelere düşebilir (33.5628 ↔ 33.5631 gibi). Bedeli yalnız
  // bir fazladan istektir; veri kaybı üretmez — sonuç önbelleği zaten
  // hücre başına tutuluyor.
  assert.notEqual(izgaraAnahtari(39.8721, 33.5628), izgaraAnahtari(39.8721, 33.5631));
});

test("Türkiye kutusu kaçak koordinatı yakalar", () => {
  assert.ok(turkiyeIcinde(39.87, 33.56));
  assert.ok(!turkiyeIcinde(0, 0), "0,0 (Null Island) dışarıda sayılmalı");
  assert.ok(!turkiyeIcinde(48.85, 2.35), "Paris dışarıda sayılmalı");
  // Kutu tek kaynaktır; kopyalanmadığını burada da sabitliyoruz.
  assert.deepEqual(TURKIYE_KUTUSU, [25.5, 35.5, 45.0, 42.3]);
});

/** AFAD servisinden gerçekten gelen biçim (Ankara/Ayrancı, Pablo Neruda Parkı). */
const koleksiyon: Geometri = {
  type: "GeometryCollection",
  geometries: [
    {
      type: "Polygon",
      coordinates: [
        [
          [32.845423506, 39.899133153],
          [32.846432017, 39.899030267],
          [32.846437381, 39.898861533],
          [32.845385955, 39.898861533],
          [32.845423506, 39.899133153],
        ],
      ],
    },
    // Dejenere üye: iki noktalı çizgi — alanı yok, çizilemez.
    {
      type: "LineString",
      coordinates: [
        [32.845423506, 39.899137269],
        [32.845423506, 39.899145499],
      ],
    },
  ],
};

test("GeometryCollection okunur — 'bozuk poligon' sanılmaz", () => {
  const h = halkalar(koleksiyon);
  assert.equal(h.length, 1, "yalnız poligon halkası sayılmalı");
  assert.ok(h[0].length >= 4);
  assert.ok(alanM2(koleksiyon) > 0, "alan hesaplanabilmeli");
});

test("poligonlaştırma çizilebilir tek geometri verir", () => {
  const p = poligonlastir(koleksiyon);
  assert.equal(p?.type, "Polygon");
  assert.equal(poligonlastir(kare)?.type, "Polygon", "zaten poligon olan aynen döner");
  assert.equal(
    poligonlastir({ type: "GeometryCollection", geometries: [] }),
    null,
    "poligon içermeyen koleksiyon null döner"
  );
});
