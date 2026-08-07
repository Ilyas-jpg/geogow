import { test } from "node:test";
import assert from "node:assert/strict";

import {
  depremCevir,
  depremleriCevir,
  depremYaricapi,
  depremRengi,
  zamanYazisi,
  pencere,
  dilimler,
  birlestir,
  type HamDeprem,
  type Deprem,
} from "./deprem.ts";

/** AFAD servisinden gerçekten dönen kayıt (6 Şubat 2023, Elbistan). */
const gercek: HamDeprem = {
  rms: "0.58",
  eventID: "543593",
  location: "Elbistan (Kahramanmaraş)",
  latitude: "38.078",
  longitude: "37.23097",
  depth: "7",
  type: "MW",
  magnitude: "7.6",
  country: "Türkiye",
  province: "Kahramanmaraş",
  district: "Elbistan",
  neighborhood: "Gümüşdöven",
  date: "2023-02-06T10:24:47",
  isEventUpdate: true,
} as unknown as HamDeprem;

test("gerçek AFAD kaydı doğru çevrilir", () => {
  const d = depremCevir(gercek)!;
  assert.equal(d.id, "543593");
  assert.equal(d.buyukluk, 7.6);
  assert.equal(d.tur, "MW");
  assert.equal(d.il, "Kahramanmaraş");
  assert.equal(d.derinlikKm, 7);
});

test("servisin tarihi UTC'dir — Z eklenmezse 3 saat kayar", () => {
  const d = depremCevir(gercek)!;
  assert.equal(d.zaman, "2023-02-06T10:24:47Z");
  // Türkiye'de yerel saat 13:24 olmalı (UTC+3)
  const yerel = new Date(d.zaman).toLocaleTimeString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  });
  assert.equal(yerel, "13:24");
});

test("bozuk kayıt sessizce atılır, listeyi çökertmez", () => {
  assert.equal(depremCevir({ ...gercek, latitude: "abc" }), null);
  assert.equal(depremCevir({ ...gercek, date: "" }), null);
  const liste = depremleriCevir([gercek, { ...gercek, magnitude: "yok" }]);
  assert.equal(liste.length, 1);
  assert.equal(depremleriCevir(null).length, 0);
});

test("liste en yeniden eskiye sıralanır", () => {
  const eski = { ...gercek, eventID: "1", date: "2023-02-06T09:00:00" };
  const yeni = { ...gercek, eventID: "2", date: "2023-02-06T12:00:00" };
  assert.deepEqual(depremleriCevir([eski, yeni]).map((d) => d.id), ["2", "1"]);
});

test("yarıçap logaritmik büyür ama ekranı yutmaz", () => {
  assert.ok(depremYaricapi(2) < depremYaricapi(5));
  assert.ok(depremYaricapi(5) < depremYaricapi(7.6));
  assert.ok(depremYaricapi(7.6) < 40, "en büyük deprem bile makul kalmalı");
  assert.ok(depremYaricapi(1) > 3);
});

test("renk yalnız üç eşik kullanır (4 anlam rengi kuralı)", () => {
  assert.equal(depremRengi(5.1), depremRengi(7.6));
  assert.equal(depremRengi(4.2), "#f2a33c");
  assert.equal(depremRengi(2.9), "#8b93a1");
  assert.notEqual(depremRengi(3.9), depremRengi(4.0));
});

test("zaman yazısı okunur", () => {
  const simdi = Date.parse("2026-08-06T12:00:00Z");
  assert.equal(zamanYazisi("2026-08-06T11:58:00Z", simdi), "2 dk önce");
  assert.equal(zamanYazisi("2026-08-06T09:00:00Z", simdi), "3 sa önce");
  assert.equal(zamanYazisi("2026-08-06T11:59:50Z", simdi), "az önce");
});

test("pencere AFAD'ın beklediği biçimde üretilir", () => {
  const { start, end } = pencere(24, Date.parse("2026-08-06T12:00:00Z"));
  assert.match(start, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.equal(start, "2026-08-05 12:00:00");
  assert.ok(end > start);
});

test("dilimler pencereyi en yeniden eskiye böler — AFAD limit tuzağına karşı", () => {
  const simdi = Date.parse("2026-08-07T12:00:00Z");
  const d = dilimler(24, simdi, 3);
  assert.equal(d.length, 8, "24 sa / 3 sa — dakikalık artık dilim üretilmez");
  // İlk dilim EN YENİ olmalı: kullanıcı önce güncel depremleri görsün
  assert.ok(d[0].end > d[1].end);
  assert.match(d[0].start, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  // Dilimler pencereyi baştan sona kapsamalı, boşluk kalmamalı
  // Pencerenin tamamı kapsanmalı: en eski dilim tam 24 saat öncesinde başlar
  assert.equal(d[d.length - 1].start, "2026-08-06 12:00:00");
  assert.equal(d[0].end, "2026-08-07 12:01:00");
});

test("birlestir aynı depremi tekrarlamaz ve yeniden eskiye sıralar", () => {
  const yap = (id: string, saat: number): Deprem => ({
    ...depremCevir(gercek)!,
    id,
    zaman: `2026-08-07T0${saat}:00:00Z`,
  });
  const sonuc = birlestir([yap("a", 1), yap("b", 3)], [yap("b", 3), yap("c", 2)]);
  assert.deepEqual(sonuc.map((d) => d.id), ["b", "c", "a"]);
});
