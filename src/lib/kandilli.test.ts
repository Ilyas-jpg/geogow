import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { kandilliAyristir, ayniDeprem } from "./kandilli.ts";
import type { Deprem } from "./deprem.ts";

const buradan = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(buradan, "fixture", "koeri-gercek.html"), "utf8");

test("gerçek KOERI listesi ayrıştırılır", () => {
  const d = kandilliAyristir(fixture);
  assert.ok(d.length >= 5, `beklenenden az kayıt: ${d.length}`);
  const ilk = d[0];
  assert.ok(ilk.enlem > 35 && ilk.enlem < 43, `enlem Türkiye dışında: ${ilk.enlem}`);
  assert.ok(ilk.boylam > 25 && ilk.boylam < 45);
  assert.ok(ilk.buyukluk > 0 && ilk.buyukluk < 8);
  assert.ok(ilk.yer.length > 2);
});

test("🔴 TSİ → UTC çevrimi yapılır (3 saatlik sessiz kayma tuzağı)", () => {
  const d = kandilliAyristir(
    "2026.08.07 12:24:06  37.8360   29.6130        3.1      -.-  1.8  -.-   BOZKURT (DENIZLI)"
  );
  assert.equal(d.length, 1);
  // Kandilli 12:24 TSİ yazar → UTC 09:24 olmalı
  assert.equal(d[0].zaman, "2026-08-07T09:24:06Z");
  // Yerel saate geri çevrilince yine 12:24 görünmeli
  const yerel = new Date(d[0].zaman).toLocaleTimeString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  });
  assert.equal(yerel, "12:24");
});

test("'-.-' ölçülmedi demektir, sıfır değil", () => {
  const d = kandilliAyristir(
    "2026.08.07 10:10:56  36.0882   28.0712        1.4      -.-  3.5  3.5   RODOS ADASI (AKDENIZ)"
  );
  assert.equal(d[0].md, null, "MD ölçülmemişse null olmalı");
  assert.equal(d[0].ml, 3.5);
  assert.equal(d[0].mw, 3.5);
  // Mw varsa büyüklük ondan gelir
  assert.equal(d[0].buyukluk, 3.5);
  assert.equal(d[0].tur, "MW");
});

test("yer adından çözüm niteliği ayıklanır", () => {
  const d = kandilliAyristir(
    "2026.08.07 11:26:07  37.8282   29.6855        7.9      -.-  2.4  -.-   CARDAK (DENIZLI)                                  İlksel"
  );
  assert.equal(d[0].yer, "CARDAK (DENIZLI)");
});

test("başlık ve boş satırlar sessizce atlanır", () => {
  assert.equal(kandilliAyristir("<html><body>Son Depremler</body></html>").length, 0);
  assert.equal(kandilliAyristir("").length, 0);
});

const temel: Deprem = {
  id: "a",
  buyukluk: 4.1,
  tur: "ML",
  derinlikKm: 7,
  enlem: 38.0,
  boylam: 37.0,
  yer: "X",
  il: null,
  ilce: null,
  zaman: "2026-08-07T09:00:00Z",
  guncellendi: false,
};

test("aynı deprem eşleşir, farklı deprem eşleşmez", () => {
  // 20 sn sonra, 10 km ötede aynı olay
  assert.ok(
    ayniDeprem(temel, { ...temel, id: "b", zaman: "2026-08-07T09:00:20Z", enlem: 38.09 })
  );
  // 5 dakika sonrası ayrı artçı
  assert.ok(
    !ayniDeprem(temel, { ...temel, id: "c", zaman: "2026-08-07T09:05:00Z" }),
    "5 dakika arayla olan iki olay birleştirilmemeli"
  );
  // Aynı anda ama 300 km ötede — ayrı deprem
  assert.ok(!ayniDeprem(temel, { ...temel, id: "d", enlem: 40.7 }));
});
