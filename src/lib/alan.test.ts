import { test } from "node:test";
import assert from "node:assert/strict";

import {
  kisaAd,
  anlamliAdres,
  alanYazisi,
  mesafeYazisi,
  yurumeDakika,
  enYakinlar,
  kompakttanAlan,
} from "./alan.ts";

/** Gerçek AFAD kayıtlarından alınmış adlar (Kırıkkale + Kilis hasadı). */
test("plan öneki kısaltılır, bilgi atılmaz", () => {
  assert.equal(
    kisaAd(
      "Kırıkkale İl Afet Müdahale Planı-Toplanma Alanı-30-Fatih Mah. Samsun Bulvarı Boş Alan"
    ),
    "Fatih Mah. Samsun Bulvarı Boş Alan"
  );
  assert.equal(
    kisaAd("Kırıkkale İl Afet Müdahale Planı-Toplanma Alanı-46"),
    "Toplanma Alanı 46"
  );
});

test("zaten kısa olan ad değiştirilmez", () => {
  assert.equal(kisaAd("Ulaş Köyü Köy Toplanma Alanı-13"), "Ulaş Köyü Köy Toplanma Alanı-13");
  assert.equal(kisaAd("KİLİS BEŞİRİYE KÖY OKULU"), "KİLİS BEŞİRİYE KÖY OKULU");
  assert.equal(kisaAd(null), null);
});

test("adres adın kopyasıysa gösterilmez", () => {
  const ad = "Fatih Mahallesi Köy Toplanma Alanı-7";
  assert.equal(anlamliAdres(ad, ad), null);
  assert.equal(anlamliAdres("Fatih Mah. No:1", ad), "Fatih Mah. No:1");
  assert.equal(anlamliAdres(null, ad), null);
});

test("alan yazısı kaba alandır, kapasite değildir", () => {
  assert.equal(alanYazisi(4150), "4.150 m²");
  assert.equal(alanYazisi(1_500_000), "1,5 km²");
  assert.equal(alanYazisi(0), null);
  assert.equal(alanYazisi(null), null);
});

test("mesafe ve yürüme süresi okunur biçimde", () => {
  assert.equal(mesafeYazisi(842), "840 m");
  assert.equal(mesafeYazisi(4200), "4,2 km");
  assert.equal(yurumeDakika(400), 5);
  assert.equal(yurumeDakika(10), 1, "çok yakın alanda bile en az 1 dakika yazılır");
});

test("en yakın alanlar mesafeye göre sıralanır ve yön verir", () => {
  // Kırıkkale merkezinde gerçek ölçekli üç nokta
  const alanlar = [
    kompakttanAlan([1, 39.8512, 33.5784, "Fatih Bulvarı", "7101-013-30", 95230]),
    kompakttanAlan([2, 39.8778, 33.5775, "Ulaş Köyü", "", 1042]),
    kompakttanAlan([3, 39.8503, 33.5767, "Fatih Mahallesi", "", 13999]),
  ];
  const sonuc = enYakinlar({ enlem: 39.8505, boylam: 33.577 }, alanlar, 2);
  assert.equal(sonuc.length, 2);
  assert.equal(sonuc[0].id, 3, "en yakın alan başta olmalı");
  assert.ok(sonuc[0].mesafeM < sonuc[1].mesafeM);
  assert.ok(sonuc[0].mesafeM < 200);
  // Kuzeydeki alan için yön kuzeyi göstermeli
  const kuzey = enYakinlar({ enlem: 39.8505, boylam: 33.5775 }, [alanlar[1]], 1)[0];
  assert.ok(kuzey.yon.startsWith("K"), `beklenmedik yön: ${kuzey.yon}`);
});
