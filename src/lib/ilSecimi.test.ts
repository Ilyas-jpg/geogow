import { test } from "node:test";
import assert from "node:assert/strict";
import { ilAdaylari, type IlAdayi } from "./ilSecimi.ts";

/**
 * Gerçek `ozet.json` değerleri (2026-08-07 hasadı). Uydurma kutu kullanılmıyor:
 * bu hatanın sebebi zaten gerçek kutuların beklenenden çok çakışmasıydı.
 */
const ANKARA: IlAdayi = {
  plaka: 6,
  il: "Ankara",
  slug: "ankara",
  kutu: [31.33, 38.92, 33.81, 40.49],
  merkez: [39.705, 32.57],
};
const KIRIKKALE: IlAdayi = {
  plaka: 71,
  il: "Kırıkkale",
  slug: "kirikkale",
  kutu: [33.29, 39.43, 34.2, 40.33],
  merkez: [39.88, 33.745],
};
/** Kırıkkale şehir merkezi — iki ilin de kutusunun içinde kalıyor. */
const KIRIKKALE_MERKEZ = { enlem: 39.8468, boylam: 33.5153 };

test("kutuları çakışan illerden merkezi YAKIN olan seçilir", () => {
  // Dizi sırası plaka sırası: Ankara (6) önce gelir. Hata buydu —
  // sıralanmadığı için Kırıkkale'deki kullanıcı Ankara verisi indiriyordu.
  const adaylar = ilAdaylari([ANKARA, KIRIKKALE], KIRIKKALE_MERKEZ.enlem, KIRIKKALE_MERKEZ.boylam);
  assert.equal(adaylar[0].plaka, 71, "Kırıkkale'deki konum için ilk aday Kırıkkale olmalı");
  assert.equal(adaylar[1].plaka, 6, "Ankara ikinci aday olarak kalmalı");
});

test("giriş sırası sonucu değiştirmez", () => {
  const a = ilAdaylari([ANKARA, KIRIKKALE], KIRIKKALE_MERKEZ.enlem, KIRIKKALE_MERKEZ.boylam);
  const b = ilAdaylari([KIRIKKALE, ANKARA], KIRIKKALE_MERKEZ.enlem, KIRIKKALE_MERKEZ.boylam);
  assert.deepEqual(
    a.map((i) => i.plaka),
    b.map((i) => i.plaka)
  );
});

test("kutusu kapsayan il, merkezi daha yakın olsa da kapsamayanın önünde gelir", () => {
  // Ankara'nın batısında, yalnız Ankara kutusunda kalan bir nokta.
  const adaylar = ilAdaylari([KIRIKKALE, ANKARA], 39.6, 31.9);
  assert.equal(adaylar[0].plaka, 6);
});

test("merkezi olmayan il aday listesine girmez", () => {
  const eksik: IlAdayi = { plaka: 1, il: "Adana", slug: "adana", kutu: null, merkez: null };
  const adaylar = ilAdaylari([eksik, KIRIKKALE], KIRIKKALE_MERKEZ.enlem, KIRIKKALE_MERKEZ.boylam);
  assert.deepEqual(
    adaylar.map((i) => i.plaka),
    [71]
  );
});
