#!/usr/bin/env node
/**
 * TOPLANMA ALANI HASADI — e-Devlet/AFAD servisinden il il toplama.
 *
 * Yöntem (ölçüme dayalı, scripts/lib/edevlet.mjs'teki sözleşmeye bakınız):
 *   ① İl → ilçe → mahalle listesi servisin kendisinden alınır.
 *   ② Her mahalle için SINIR poligonu çekilir (1 istek) → örnek noktalar.
 *   ③ Her örnek nokta için "en yakın 3 toplanma alanı" sorulur (1 istek).
 *   ④ KEŞİF GENİŞLEMESİ: yeni bulunan her alanın kendi merkezinden tekrar
 *      sorulur — alanlar kümelendiği için bu, mahalle başına ek istek
 *      açmadan komşu alanları ortaya çıkarır. Sınırlıdır (bütçe kontrolü).
 *   ⑤ Aynı yer iki kez sorulmaz (≈200 m ızgara tekilleştirmesi).
 *
 * DÜRÜSTLÜK: mahalle için alan bulunamazsa "alan yok" DENMEZ; kayıt
 * `alansizMahalleler`e düşer ve üründe "AFAD kaydında görünmüyor" diye
 * gösterilir. İkisi farklı iddiadır.
 *
 * Kullanım:
 *   node scripts/toplanma-hasat.mjs --il=71
 *   node scripts/toplanma-hasat.mjs --il=71,6 --force
 *   node scripts/toplanma-hasat.mjs --hepsi --gecikme=300
 *   node scripts/toplanma-hasat.mjs --il=71 --mahalle-limit=25   (ölçüm turu)
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { EDevlet } from "./lib/edevlet.mjs";
import {
  merkez,
  alanM2,
  ornekNoktalar,
  izgaraAnahtari,
  turkiyeIcinde,
} from "../src/lib/geo.ts";
import { ONCELIK_SIRASI, PLAKAYA_GORE, katla } from "../src/lib/iller.ts";

const HAM_DIZIN = "data/ham";

/* ─────────────────────────── argümanlar ─────────────────────────── */

function argumanlar(argv) {
  const a = {
    iller: [],
    force: false,
    gecikme: 260,
    mahalleLimit: 0,
    genislemeButce: 2,
    ilce: null,
    isci: 1,
    // Araç/oturum sınırlarına takılmamak için varsayılan süre bütçesi.
    // Dolduğunda ilçe sınırında temiz durur; tekrar çalıştırınca devam eder.
    sureButcesiMs: 8 * 60 * 1000,
  };
  for (const parca of argv.slice(2)) {
    // --hepsi NÜFUS SIRASINDA gezer: ülke geneli günler sürüyor, ürünün ilk
    // günden en çok kişiye karşılık gelmesi için büyük iller önce toplanır.
    if (parca === "--hepsi") a.iller = [...ONCELIK_SIRASI];
    else if (parca === "--force") a.force = true;
    else if (parca.startsWith("--ilce=")) a.ilce = parca.slice(7);
    else if (parca.startsWith("--il=")) {
      a.iller = parca
        .slice(5)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter(Boolean);
    } else if (parca.startsWith("--gecikme=")) a.gecikme = Number(parca.slice(10));
    else if (parca.startsWith("--mahalle-limit=")) a.mahalleLimit = Number(parca.slice(16));
    else if (parca.startsWith("--genisleme=")) a.genislemeButce = Number(parca.slice(12));
    else if (parca.startsWith("--sure=")) a.sureButcesiMs = Number(parca.slice(7)) * 60 * 1000;
    else if (parca.startsWith("--isci=")) a.isci = Number(parca.slice(7));
  }
  return a;
}

/* ─────────────────────────── yardımcılar ─────────────────────────── */

const sure = (ms) => {
  const sn = Math.round(ms / 1000);
  return sn < 90 ? `${sn} sn` : `${Math.floor(sn / 60)} dk ${sn % 60} sn`;
};

/** Servisten gelen ham Feature → yayınlanabilir alan kaydı. */
function alanKaydi(ozellik) {
  const o = ozellik?.properties ?? {};
  const geometri = ozellik?.geometry ?? null;
  const m = geometri ? merkez(geometri) : null;
  const boylam = Number.isFinite(o.x) ? o.x : m?.[0];
  const enlem = Number.isFinite(o.y) ? o.y : m?.[1];
  return {
    id: o.id,
    ad: (o.tesis_adi ?? "").trim() || null,
    tabelaKod: o.tabela_kod && o.tabela_kod !== "-" ? String(o.tabela_kod).trim() : null,
    adres: (o.acik_adres ?? "").trim() || null,
    il: (o.il_adi ?? "").trim() || null,
    ilce: (o.ilce_adi ?? "").trim() || null,
    mahalle: (o.mahalle_adi ?? "").trim() || null,
    sokak: (o.sokak_adi ?? "").trim() || null,
    enlem,
    boylam,
    alanM2: geometri ? alanM2(geometri) : null,
    geometri,
  };
}

/* ─────────────────────────── tek il hasadı ─────────────────────────── */

/** İlçe kontrol noktası dosyası — kesintiye dayanıklılığın temeli. */
const ilceDosyasi = (plaka, ilceId) => `${HAM_DIZIN}/${plaka}/${ilceId}.json`;

async function ilHasadi(istemci, plaka, ayar) {
  const il = PLAKAYA_GORE.get(plaka);
  if (!il) throw new Error(`Bilinmeyen plaka: ${plaka}`);

  const baslangic = Date.now();
  const alanlar = new Map(); // id → alan kaydı
  const mahalleAlan = new Map(); // mahalleId → Set(alanId)
  const mahalleMerkezleri = new Map(); // mahalleId → {id, ad, enlem, boylam, alanM2}
  const alansizMahalleler = [];
  const sinirsizMahalleler = [];
  /** Ağ hatası yüzünden alınamayan mahalleler — sonraki turda yeniden denenir. */
  const hataliMahalleler = [];
  /** Kontrol noktalarından toplanan ölçüm — birden çok tura yayılan iş için. */
  const birikenOlcum = { istek: 0, hata: 0, gecenMs: 0 };
  /** Yardımcı işçilerin (paralel oturumların) kendi istek sayaçları. */
  const birikenIsciOlcumu = { istek: 0, hata: 0 };
  /**
   * Izgara anahtarı → o noktada bulunan alan kimlikleri.
   * 🐛 Bu bir Set'ti ve ölçümde gerçek hata çıkardı: bir mahallenin merkezi
   * daha önce (komşu mahallenin genişlemesiyle) sorulmuş bir hücreye düşünce
   * sorgu atlanıyor, mahalleye HİÇ alan bağlanmıyor ve kayıt "alansız"
   * görünüyordu — yani veri vardı ama biz yokmuş gibi yazıyorduk.
   * Artık sonuç önbellekten okunuyor: istek tasarrufu duruyor, kayıp yok.
   */
  const noktaSonucu = new Map();
  const ilceKayitlari = [];
  let mahalleSayaci = 0;

  console.log(`\n▶ ${il.ad} (${plaka}) hasadı başlıyor`);
  const tumIlceler = await istemci.ilceler(plaka);
  const ilceler = ayar.ilce
    ? tumIlceler.filter((i) => katla(i.name) === katla(ayar.ilce))
    : tumIlceler;
  console.log(
    `  ${tumIlceler.length} ilçe bulundu` +
      (ayar.ilce ? ` · yalnız "${ayar.ilce}" taranacak (${ilceler.length})` : "")
  );

  mkdirSync(`${HAM_DIZIN}/${plaka}`, { recursive: true });
  let sureDoldu = false;

  /**
   * Tek ilçenin hasadı. Paralel çalıştırılabilsin diye kendi istemcisini
   * (kendi oturumu/çerezi/token'ı) alır; paylaşılan durum yalnız JS'in tek
   * iş parçacığında güncellenir, yarış koşulu yoktur.
   */
  const ilceIsle = async (istemci, ilce) => {
    const parcaYolu = ilceDosyasi(plaka, ilce.id);
    /**
     * Kontrol noktası TAMAMLANMIŞ da olabilir YARIM da.
     * Yarım kayıt kritik: İstanbul/Kilis gibi tek ilçesi yüzlerce mahalle olan
     * yerlerde süre bütçesi ilçe ortasında doluyor — ilçe sınırında beklemek
     * saatlerce işi çöpe atardı (Kilis'te birebir yaşandı, 2026-08-06).
     */
    let onceki = null;
    if (existsSync(parcaYolu) && !ayar.force) {
      onceki = JSON.parse(readFileSync(parcaYolu, "utf8"));
      for (const alan of onceki.alanlar) alanlar.set(alan.id, alan);
      for (const [mid, idler] of Object.entries(onceki.mahalleAlan))
        mahalleAlan.set(Number(mid), idler);
      for (const m of onceki.mahalleler ?? []) mahalleMerkezleri.set(m.id, m);
      birikenOlcum.istek += onceki.olcum?.istek ?? 0;
      birikenOlcum.hata += onceki.olcum?.hata ?? 0;
      birikenOlcum.gecenMs += onceki.olcum?.gecenMs ?? 0;

      if (onceki.tamamlandi !== false) {
        alansizMahalleler.push(...onceki.alansizMahalleler);
        sinirsizMahalleler.push(...onceki.sinirsizMahalleler);
        mahalleSayaci += onceki.tarananMahalle;
        ilceKayitlari.push({
          id: ilce.id,
          ad: ilce.name,
          mahalleSayisi: onceki.mahalleSayisi,
          tarananMahalle: onceki.tarananMahalle,
        });
        console.log(
          `  ⤿ ${ilce.name}: kontrol noktasından okundu ` +
            `(${onceki.alanlar.length} alan, ${onceki.tarananMahalle} mahalle)`
        );
        return;
      }
      // 🐛 Yarım kayıtta bu satır yoktu ve sayaç saçmalıyordu:
      // "183/132 mahalle kapsandı" — kapsanan, tarananı geçemez.
      // Kendi karnemizde yanlış sayı, üründe yanlış kapsam demektir.
      mahalleSayaci += onceki.tarananMahalle ?? 0;
    }

    if (sureDoldu) return;

    const ilceBaslangic = Date.now();
    const istekBaslangic = istemci.sayac.istek;
    const hataBaslangic = istemci.sayac.hata;
    const mahalleler = await istemci.mahalleler(ilce.id);
    const kapsam = ayar.mahalleLimit
      ? mahalleler.slice(0, ayar.mahalleLimit)
      : mahalleler;

    // Yarım kalmış ilçeden devam: işlenmiş mahalleler atlanır, birikim korunur.
    const ilceAlanlari = new Map(
      (onceki?.alanlar ?? []).map((a) => [a.id, a])
    );
    const ilceMahalleAlan = new Map(
      Object.entries(onceki?.mahalleAlan ?? {}).map(([k, v]) => [Number(k), v])
    );
    const ilceMahalleler = [...(onceki?.mahalleler ?? [])];
    const ilceAlansiz = [...(onceki?.alansizMahalleler ?? [])];
    const ilceSinirsiz = [...(onceki?.sinirsizMahalleler ?? [])];
    // Ağ hatası yüzünden alınamayanlar — "kayıtta yok" ile KARIŞTIRILMAZ.
    const ilceHatali = [];
    const islenmis = new Set(onceki?.islenmisMahalleler ?? []);
    // Önceki turda düşen istekler yeniden denenir.
    for (const m of onceki?.hataliMahalleler ?? []) islenmis.delete(m.id);
    if (islenmis.size) {
      console.log(
        `  ⤾ ${ilce.name}: yarım kalmış kayıttan devam ` +
          `(${islenmis.size}/${kapsam.length} mahalle bitmişti)`
      );
    }

    /** İlçe kontrol noktasını diske yazar (tamamlanmış ya da yarım). */
    const parcaYaz = (tamamlandi) => {
      if (ayar.mahalleLimit) return;
      writeFileSync(
        parcaYolu,
        JSON.stringify({
          sema: 1,
          plaka,
          ilceId: ilce.id,
          ilce: ilce.name,
          tamamlandi,
          toplandi: new Date().toISOString(),
          olcum: {
            istek: istemci.sayac.istek - istekBaslangic + (onceki?.olcum?.istek ?? 0),
            hata: istemci.sayac.hata - hataBaslangic + (onceki?.olcum?.hata ?? 0),
            gecenMs: Date.now() - ilceBaslangic + (onceki?.olcum?.gecenMs ?? 0),
          },
          mahalleSayisi: mahalleler.length,
          tarananMahalle: islenmis.size,
          islenmisMahalleler: [...islenmis],
          // Mahalle merkezleri: yerleşim tabanlı erişim ölçüsünün girdisi
          mahalleler: ilceMahalleler,
          alanlar: [...ilceAlanlari.values()],
          mahalleAlan: Object.fromEntries(ilceMahalleAlan),
          alansizMahalleler: ilceAlansiz,
          sinirsizMahalleler: ilceSinirsiz,
          hataliMahalleler: ilceHatali,
        }),
        "utf8"
      );
    };

    let butceDoldu = false;
    for (const mahalle of kapsam) {
      if (islenmis.has(mahalle.id)) continue;
      // Süre bütçesi MAHALLE sınırında denetlenir; ilçe sınırını beklemek
      // büyük ilçelerde kesintiye dayanıksızlık üretiyordu.
      // 🔑 Bütçe GENEL son tarihe göre denetlenir, il başına DEĞİL.
      // İl başına olsaydı `--hepsi` her ilde bütçeyi sıfırlar ve dilim hiç
      // bitmezdi; kesinti anında yarım kalan iş de kaydedilmemiş olurdu.
      if (ayar.bitisZamani && Date.now() > ayar.bitisZamani) {
        butceDoldu = true;
        break;
      }
      islenmis.add(mahalle.id);
      mahalleSayaci++;
      let sinir;
      try {
        sinir = await istemci.mahalleSiniri(plaka, ilce.id, mahalle.id);
      } catch (hata) {
        /**
         * 🔴 DÜRÜSTLÜK AYRIMI: bu bir AĞ HATASI, "kayıtta yok" DEĞİL.
         * Önceden ikisi aynı listeye düşüyordu ve üründe kullanıcıya
         * "AFAD kaydında görünmüyor" diye gösterilecekti — oysa sebep
         * bizim düşen isteğimizdi (Ankara'da 88 mahalle böyle işaretlendi).
         * Ayrı listeye alınır ve `islenmis`e EKLENMEZ → sonraki tur yeniden dener.
         */
        console.log(`    ⚠ ${ilce.name}/${mahalle.name}: istek düştü, sonraki turda yeniden denenecek`);
        ilceHatali.push({ id: mahalle.id, ad: mahalle.name, ilce: ilce.name });
        islenmis.delete(mahalle.id);
        continue;
      }
      if (!sinir) {
        ilceSinirsiz.push({ id: mahalle.id, ad: mahalle.name, ilce: ilce.name });
        continue;
      }

      /**
       * 🔑 Mahallenin MERKEZİ ve kaba alanı burada kaydedilir.
       *
       * Poligon zaten `Sorgula` ile geldi ve şimdiye kadar yalnız örnek nokta
       * üretmek için kullanılıp ATILIYORDU. Kaydetmek SIFIR ek istek maliyeti
       * getiriyor ama karşılığında ürünün en ayırt edici ölçüsünü mümkün
       * kılıyor: "mahallenin merkezinden en yakın toplanma alanına mesafe".
       *
       * Bu, il kutusunu ızgaralayan kaba analizin (dağ-tarla da sayılıyordu,
       * yanıltıcıydı) yerine geçen YERLEŞİM TABANLI ölçüdür.
       */
      const mahalleGeometri = sinir[0]?.geometry ?? sinir[0];
      const mahalleMerkezi = mahalleGeometri ? merkez(mahalleGeometri) : null;
      if (mahalleMerkezi) {
        mahalleMerkezleri.set(mahalle.id, {
          id: mahalle.id,
          ad: mahalle.name,
          enlem: Number(mahalleMerkezi[1].toFixed(5)),
          boylam: Number(mahalleMerkezi[0].toFixed(5)),
          alanM2: alanM2(mahalleGeometri),
        });
        ilceMahalleler.push(mahalleMerkezleri.get(mahalle.id));
      }

      const bulunanlar = new Set();
      const kuyruk = ornekNoktalar(mahalleGeometri);
      let genislemeHakki = ayar.genislemeButce;

      while (kuyruk.length) {
        const [enlem, boylam] = kuyruk.shift();
        if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) continue;
        const anahtar = izgaraAnahtari(enlem, boylam);
        const onbellek = noktaSonucu.get(anahtar);
        if (onbellek) {
          for (const id of onbellek) bulunanlar.add(id);
          continue;
        }

        let ozellikler = [];
        try {
          ozellikler = await istemci.alanlarNokta(enlem, boylam);
        } catch (hata) {
          console.log(`    ⚠ nokta sorgusu düştü (${enlem.toFixed(4)},${boylam.toFixed(4)}): ${hata.message}`);
          continue;
        }
        noktaSonucu.set(
          anahtar,
          ozellikler.map((o) => o?.properties?.id).filter((id) => id != null)
        );

        for (const ozellik of ozellikler) {
          const kayit = alanKaydi(ozellik);
          if (kayit.id == null) continue;
          bulunanlar.add(kayit.id);
          ilceAlanlari.set(kayit.id, kayit);
          if (!alanlar.has(kayit.id)) {
            alanlar.set(kayit.id, kayit);
            // ④ keşif genişlemesi: yeni alanın kendi merkezinden de sor
            if (genislemeHakki > 0 && Number.isFinite(kayit.enlem)) {
              genislemeHakki--;
              kuyruk.push([kayit.enlem, kayit.boylam]);
            }
          }
        }
      }

      if (bulunanlar.size) {
        mahalleAlan.set(mahalle.id, [...bulunanlar]);
        ilceMahalleAlan.set(mahalle.id, [...bulunanlar]);
        // Önbellekten gelen alan bu ilçede ilk kez görülüyor olabilir —
        // ilçe dosyası kendi başına eksiksiz olsun diye tamamlıyoruz.
        for (const id of bulunanlar) {
          if (!ilceAlanlari.has(id) && alanlar.has(id))
            ilceAlanlari.set(id, alanlar.get(id));
        }
      } else {
        ilceAlansiz.push({ id: mahalle.id, ad: mahalle.name, ilce: ilce.name });
      }
    }

    parcaYaz(!butceDoldu);
    birikenOlcum.istek += istemci.sayac.istek - istekBaslangic;
    birikenOlcum.hata += istemci.sayac.hata - hataBaslangic;
    birikenOlcum.gecenMs += Date.now() - ilceBaslangic;

    if (butceDoldu) {
      sureDoldu = true;
      console.log(
        `  ⏸ ${ilce.name}: süre bütçesi doldu — ${islenmis.size}/${kapsam.length} ` +
          `mahalle işlendi, kayıt YARIM olarak saklandı. Aynı komutu tekrar ` +
          `çalıştır, kaldığı yerden sürer.`
      );
      return;
    }

    alansizMahalleler.push(...ilceAlansiz);
    sinirsizMahalleler.push(...ilceSinirsiz);
    hataliMahalleler.push(...ilceHatali);
    ilceKayitlari.push({
      id: ilce.id,
      ad: ilce.name,
      mahalleSayisi: mahalleler.length,
      tarananMahalle: islenmis.size,
    });

    console.log(
      `  ✓ ${ilce.name}: ${islenmis.size}/${mahalleler.length} mahalle · ` +
        `ilçede ${ilceAlanlari.size} alan · ilde toplam ${alanlar.size} · ` +
        `${sure(Date.now() - baslangic)}`
    );
  };

  /* ── İlçe kuyruğu: N işçi paralel tüketir ──
   * Darboğaz sunucu gecikmesi (nokta sorgusu 0,6-0,75 sn; Sorgula daha da
   * yavaş) — bizim hız sınırımız değil. Tek oturumda ülke geneli 30-90 saat
   * sürerdi. İşçi sayısı bilerek düşük tutuluyor: kaynağı zorlamak yok. */
  const kuyruk = [...ilceler];
  const ziyaretEdilen = new Set();
  const isciler = [];
  for (let i = 0; i < Math.max(1, Math.min(4, ayar.isci)); i++) {
    const isciIstemcisi =
      i === 0
        ? istemci
        : new EDevlet({
            enAzAralikMs: ayar.gecikme,
            cerezDosyasi: `scripts/.oturum/cerez-${process.pid}-${i}.txt`,
            gunluk: (satir) => console.log(satir),
          });
    isciler.push(
      (async () => {
        if (i > 0) await isciIstemcisi.oturumAc();
        while (kuyruk.length && !sureDoldu) {
          const ilce = kuyruk.shift();
          ziyaretEdilen.add(ilce.id);
          try {
            await ilceIsle(isciIstemcisi, ilce);
          } catch (hata) {
            console.log(`  ✗ ${ilce.name} ilçesi düştü: ${hata.message}`);
          }
        }
        if (i > 0) {
          birikenIsciOlcumu.istek += isciIstemcisi.sayac.istek;
          birikenIsciOlcumu.hata += isciIstemcisi.sayac.hata;
          isciIstemcisi.temizle();
        }
      })()
    );
  }
  await Promise.all(isciler);

  /**
   * 🐛 Süre bütçesi dolunca işçiler kuyruktan hiç ilçe ALMIYORDU; bu yüzden
   * TAMAMLANMIŞ kontrol noktaları bile okunmuyor, `ilceKayitlari` eksik
   * kalıyor ve il dosyası hiç yazılmıyordu. İstanbul'da birebir yaşandı:
   * 39 ilçenin hepsi bitmişti ama `34.json` yazılmadı, il yayına giremedi.
   * Çözüm: ağ İSTEĞİ OLMADAN, kalan ilçelerin bitmiş kayıtlarını topla.
   */
  const bakilmayan = ilceler.filter((i) => !ziyaretEdilen.has(i.id));
  let konsolideEdilen = 0;
  for (const ilce of bakilmayan) {
    const parcaYolu = ilceDosyasi(plaka, ilce.id);
    if (!existsSync(parcaYolu)) continue;
    const onceki = JSON.parse(readFileSync(parcaYolu, "utf8"));
    if (onceki.tamamlandi === false) continue;
    for (const alan of onceki.alanlar) alanlar.set(alan.id, alan);
    for (const [mid, idler] of Object.entries(onceki.mahalleAlan))
      mahalleAlan.set(Number(mid), idler);
    for (const m of onceki.mahalleler ?? []) mahalleMerkezleri.set(m.id, m);
    alansizMahalleler.push(...onceki.alansizMahalleler);
    sinirsizMahalleler.push(...onceki.sinirsizMahalleler);
    mahalleSayaci += onceki.tarananMahalle;
    birikenOlcum.istek += onceki.olcum?.istek ?? 0;
    birikenOlcum.hata += onceki.olcum?.hata ?? 0;
    birikenOlcum.gecenMs += onceki.olcum?.gecenMs ?? 0;
    ilceKayitlari.push({
      id: ilce.id,
      ad: ilce.name,
      mahalleSayisi: onceki.mahalleSayisi,
      tarananMahalle: onceki.tarananMahalle,
    });
    konsolideEdilen++;
  }
  if (konsolideEdilen) {
    console.log(
      `  ⤿ ${konsolideEdilen} ilçe kontrol noktasından konsolide edildi (ağ isteği yok)`
    );
  }

  const gecen = Date.now() - baslangic;
  const sonuc = {
    sema: 1,
    plaka,
    il: il.ad,
    ilSlug: il.slug,
    kaynak: "AFAD / e-Devlet Afet ve Acil Durum Toplanma Alanı Sorgulama",
    toplandi: new Date().toISOString(),
    olcum: {
      // Tüm turların toplamı — tek turluk sayaç yanıltıcı olurdu
      // (Kırıkkale gerçekte 1.028 istekti, son tur yalnız 95 gösteriyordu).
      istek: birikenOlcum.istek + birikenIsciOlcumu.istek,
      hata: birikenOlcum.hata + birikenIsciOlcumu.hata,
      gecenMs: birikenOlcum.gecenMs,
      sonTurIstek: istemci.sayac.istek + birikenIsciOlcumu.istek,
      isci: ayar.isci,
      tokenYenileme: istemci.sayac.tokenYenileme,
      taranan: mahalleSayaci,
      sorulanNokta: noktaSonucu.size,
    },
    ilceler: ilceKayitlari,
    alanlar: [...alanlar.values()],
    mahalleAlan: Object.fromEntries(mahalleAlan),
    mahalleler: [...mahalleMerkezleri.values()],
    alansizMahalleler,
    sinirsizMahalleler,
    hataliMahalleler,
  };

  mkdirSync(HAM_DIZIN, { recursive: true });
  // Kısmi turlar (ölçüm, tek ilçe, süre bütçesi dolması) gerçek il dosyasının
  // üstüne YAZMAZ — yoksa eksik veri "tamamlanmış il" sanılır ve --force
  // olmadan bir daha toplanmaz. İlçe kontrol noktaları yine de diskte durur.
  const eksikIlce = ilceKayitlari.length < ilceler.length;
  const kismi = Boolean(ayar.ilce || ayar.mahalleLimit || eksikIlce);
  writeFileSync(
    `${HAM_DIZIN}/${plaka}${kismi ? ".olcum" : ""}.json`,
    JSON.stringify(sonuc),
    "utf8"
  );
  if (eksikIlce) {
    console.log(
      `  ⏸ ${ilceler.length - ilceKayitlari.length} ilçe kaldı — il dosyası ` +
        `HENÜZ yazılmadı, aynı komutu tekrar çalıştır`
    );
  }

  const kapsanan = mahalleAlan.size;
  console.log(
    `\n■ ${il.ad} bitti — ${sonuc.alanlar.length} benzersiz alan · ` +
      `${kapsanan}/${mahalleSayaci} mahalle kapsandı · ` +
      `${sonuc.olcum.istek} istek (tüm turlar) · ${sonuc.olcum.hata} hata · ` +
      `bu tur ${sure(gecen)}, toplam ${sure(sonuc.olcum.gecenMs)}`
  );
  if (mahalleSayaci) {
    const istekBasi = (sonuc.olcum.istek / mahalleSayaci).toFixed(2);
    const hiz = sonuc.olcum.gecenMs
      ? (sonuc.olcum.istek / (sonuc.olcum.gecenMs / 1000)).toFixed(2)
      : "—";
    console.log(
      `  ölçüm: mahalle başına ${istekBasi} istek · ${hiz} istek/sn · ` +
        `alansız ${alansizMahalleler.length} · sınırsız ${sinirsizMahalleler.length}`
    );
  }
  return sonuc;
}

/* ─────────────────────────── ana akış ─────────────────────────── */

async function main() {
  const ayar = argumanlar(process.argv);
  if (!ayar.iller.length) {
    console.error(
      "Kullanım: node scripts/toplanma-hasat.mjs --il=71[,6] | --hepsi\n" +
        "         [--force] [--gecikme=260] [--mahalle-limit=N] [--genisleme=6]"
    );
    process.exit(1);
  }

  // Genel son tarih: dilim bu ana kadar çalışır, sonra temiz durur.
  ayar.bitisZamani = ayar.sureButcesiMs ? Date.now() + ayar.sureButcesiMs : 0;

  const istemci = new EDevlet({
    enAzAralikMs: ayar.gecikme,
    gunluk: (satir) => console.log(satir),
  });
  await istemci.oturumAc();
  console.log(
    `oturum açıldı · ${ayar.iller.length} il sırada · ${ayar.isci} işçi · ` +
      `dilim bütçesi ${Math.round(ayar.sureButcesiMs / 60000)} dk`
  );

  for (const plaka of ayar.iller) {
    if (ayar.bitisZamani && Date.now() > ayar.bitisZamani) {
      console.log(`\n⏸ dilim bütçesi doldu — kalan iller sıradaki turda`);
      break;
    }
    const dosya = `${HAM_DIZIN}/${plaka}.json`;
    if (existsSync(dosya) && !ayar.force) {
      const onceki = JSON.parse(readFileSync(dosya, "utf8"));
      console.log(
        `→ ${PLAKAYA_GORE.get(plaka)?.ad ?? plaka} zaten var ` +
          `(${onceki.alanlar?.length ?? 0} alan, ${onceki.toplandi}); --force ile yenilenir`
      );
      continue;
    }
    try {
      await ilHasadi(istemci, plaka, ayar);
    } catch (hata) {
      console.error(`✗ ${plaka} hasadı düştü: ${hata.message}`);
    }
  }

  istemci.temizle();
  console.log(
    `\nToplam ${istemci.sayac.istek} istek · ${istemci.sayac.hata} hata · ` +
      `${istemci.sayac.tokenYenileme} oturum yenileme · ` +
      `hız sınırı için beklenen ${sure(istemci.sayac.beklemeMs)}`
  );
}

// Karşılaştırma yardımcı: servis listesiyle bizim listemiz uyuşuyor mu?
export function ilListesiUyusmazliklari(sayfaHtml) {
  const secenekler = [...sayfaHtml.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)]
    .map(([, kod, ad]) => ({ plaka: Number(kod), ad: ad.trim() }))
    .filter((s) => s.plaka >= 1 && s.plaka <= 81);
  const uyusmazlik = [];
  for (const s of secenekler) {
    const bizdeki = PLAKAYA_GORE.get(s.plaka);
    if (!bizdeki) uyusmazlik.push(`bizde yok: ${s.plaka} ${s.ad}`);
    else if (katla(bizdeki.ad) !== katla(s.ad))
      uyusmazlik.push(`ad farkı: ${s.plaka} servis="${s.ad}" bizde="${bizdeki.ad}"`);
  }
  return uyusmazlik;
}

// Windows'ta yol ayracı ve file:// biçimi farklı — pathToFileURL şart.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((hata) => {
    console.error(hata);
    process.exit(1);
  });
}
