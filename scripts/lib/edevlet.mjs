/**
 * e-Devlet "Afet ve Acil Durum Toplanma Alanı Sorgulama" istemcisi.
 *
 * Hizmet GİRİŞ GEREKTİRMİYOR; oturum çerezi + sayfadaki `data-token` yetiyor.
 * Önünde F5 BIG-IP ASM (TS… çerezi) var ve bazı istekleri gövdeye bakarak
 * reddediyor — aşağıdaki ölçülmüş kurallar ona göre.
 *
 * ── ÖLÇÜLMÜŞ SÖZLEŞME (2026-08-06, canlı doğrulandı) ────────────────────
 *  ① GET  {SVC}?bolge=Secimi          → <body data-token="{…}"> + çerezler
 *  ② POST {SVC}?bolge=Secimi&submit   → body: token=<ham>&ajax=1&ilKodu=71
 *                                       → {"data":{"dataArr":[{id,name}…]}}
 *                                       ilceKodu=<id> → mahalleler
 *  ③ POST {SVC}?bolge=Secimi&submit   → body: ilKodu&ilceKodu&mahalleKodu&
 *                                       sokakKodu=&token&btn=Sorgula (302 →)
 *                                       HTML içinde `toplanmaAlanlari = [...]`
 *                                       = MAHALLE SINIR POLİGONU (alan değil!)
 *  ④ POST {SVC}?submit                → body: token&ajax=1&islem=getAlanlarForNokta
 *                                       &lat=&lng=  → {"features":[…3 alan…]}
 *                                       ASIL TOPLANMA ALANLARI BURADAN GELİR.
 *
 * 🔴 WAF TUZAĞI — SAATLER YAKABİLİRDİ: gövdeye `pn=/afet-ve-acil-…` diye
 *    HAM EĞİK ÇİZGİLİ yol koyulursa F5 isteği **HTTP 406** ile reddediyor
 *    (gövde 503 "Geçici Olarak Hizmet Dışı" sayfası). Ölçüm:
 *      pn ham      → 406
 *      pn encoded  → 200
 *      pn yok      → 200   ← bizim seçimimiz (en sade)
 *    Token'ın `{}` süslü parantezleri sorun DEĞİL, ham gönderilebiliyor.
 *
 * 🔴 TAŞIYICI: Node'un yerleşik fetch'i TR kamu sunucularında sessizce
 *    düşüyor (vault: 253 hostta fetch 1, curl 42 gördü) → curl + --http1.1.
 */

import { execFile } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { promisify } from "node:util";

const calistir = promisify(execFile);

const TABAN = "https://www.turkiye.gov.tr";
const YOL = "/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama";
const BOLGE_URL = `${TABAN}${YOL}?bolge=Secimi`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class EDevletHatasi extends Error {}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

export class EDevlet {
  /**
   * @param {object} [ayar]
   * @param {string} [ayar.cerezDosyasi] Oturum çerez kavanozu (yol).
   * @param {number} [ayar.enAzAralikMs] İki istek arasındaki en az süre.
   * @param {number} [ayar.zamanAsimiSn] Tek istek zaman aşımı.
   * @param {number} [ayar.denemeSayisi] WAF/kopma durumunda deneme sayısı.
   * @param {(satir: string) => void} [ayar.gunluk]
   */
  constructor(ayar = {}) {
    this.cerezDosyasi =
      ayar.cerezDosyasi ?? `scripts/.oturum/cerez-${process.pid}.txt`;
    this.enAzAralikMs = ayar.enAzAralikMs ?? 260;
    this.zamanAsimiSn = ayar.zamanAsimiSn ?? 30;
    this.denemeSayisi = ayar.denemeSayisi ?? 4;
    this.gunluk = ayar.gunluk ?? (() => {});
    this.token = null;
    this.sonIstek = 0;
    /**
     * UYUM DENETİMİ (adaptive backoff). Ölçüldü: uzun süre 3 işçiyle
     * bastırınca servis bağlantıları düşürmeye başlıyor (curl 35/56) ve hata
     * oranı %11'e çıkıyor. Hızlı gitmeye çalışmak bu noktadan sonra DAHA AZ
     * iş bitiriyor — ve kaynağı zorlamak zaten yapmayacağımız şey.
     * Her hata aralığı büyütür, her başarı yavaşça geri getirir.
     */
    this.tabanAralikMs = this.enAzAralikMs;
    this.enFazlaAralikMs = ayar.enFazlaAralikMs ?? 6000;
    this.ardArdaHata = 0;
    /** Ölçüm: kaç istek attık, kaçı hata verdi, ne kadar bekledik. */
    this.sayac = { istek: 0, hata: 0, tokenYenileme: 0, beklemeMs: 0 };
    mkdirSync(this.cerezDosyasi.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
  }

  /** Hata sonrası aralığı büyüt (üstel, tavanlı) ve durumu görünür kıl. */
  #yavasla() {
    this.ardArdaHata++;
    const onceki = this.enAzAralikMs;
    this.enAzAralikMs = Math.min(
      this.enFazlaAralikMs,
      Math.max(this.tabanAralikMs, Math.round(this.enAzAralikMs * 1.8) + 200)
    );
    if (this.enAzAralikMs !== onceki) {
      this.gunluk(
        `  🐢 servis geri itiyor (${this.ardArdaHata} ard arda hata) — ` +
          `istek aralığı ${onceki} → ${this.enAzAralikMs} ms`
      );
    }
  }

  /** Başarıda yavaşça normale dön — birden hızlanmak tekrar düşürtüyor. */
  #hizlan() {
    this.ardArdaHata = 0;
    if (this.enAzAralikMs > this.tabanAralikMs) {
      this.enAzAralikMs = Math.max(
        this.tabanAralikMs,
        Math.round(this.enAzAralikMs * 0.92)
      );
    }
  }

  async #gecikme() {
    const kalan = this.sonIstek + this.enAzAralikMs - Date.now();
    if (kalan > 0) {
      this.sayac.beklemeMs += kalan;
      await bekle(kalan);
    }
    this.sonIstek = Date.now();
  }

  /** Tek bir curl çağrısı. Gövdeyi ve HTTP kodunu birlikte döndürür. */
  async #curl(url, { govde = null, basliklar = {}, takipEt = false } = {}) {
    await this.#gecikme();
    this.sayac.istek++;

    const argv = [
      "-s",
      "--http1.1",
      "-m",
      String(this.zamanAsimiSn),
      "-A",
      UA,
      "-b",
      this.cerezDosyasi,
      "-c",
      this.cerezDosyasi,
      "-w",
      "\n__KOD__%{http_code}",
    ];
    if (takipEt) argv.push("-L");
    for (const [k, v] of Object.entries({
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      ...basliklar,
    })) {
      argv.push("-H", `${k}: ${v}`);
    }
    if (govde !== null) argv.push("--data-raw", govde);
    argv.push(url);

    let stdout;
    try {
      ({ stdout } = await calistir("curl", argv, {
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      }));
    } catch (hata) {
      // ⚠️ execFile hatası TÜM argv'yi mesaja koyuyor — içinde oturum token'ı
      // var ve log'a düşüyordu. Ayrıca bu düşüşler sayaca girmiyordu, yani
      // "0 hata" yazarken gerçekte istek kaybediyorduk. İkisi de düzeltildi.
      this.sayac.hata++;
      this.#yavasla();
      const kod = hata.code ?? "?";
      throw new EDevletHatasi(`curl düştü (çıkış ${kod}) — ${url.slice(0, 60)}…`);
    }
    this.#hizlan();
    const ayrac = stdout.lastIndexOf("\n__KOD__");
    if (ayrac === -1) throw new EDevletHatasi("curl çıktısı okunamadı");
    return {
      kod: Number(stdout.slice(ayrac + 8).trim()),
      metin: stdout.slice(0, ayrac),
    };
  }

  /** Yeni oturum + taze token. WAF engelinden çıkmanın yolu budur. */
  async oturumAc() {
    try {
      rmSync(this.cerezDosyasi, { force: true });
    } catch {}
    const { kod, metin } = await this.#curl(BOLGE_URL);
    if (kod !== 200) throw new EDevletHatasi(`Sayfa alınamadı (HTTP ${kod})`);
    const eslesme = metin.match(/data-token="([^"]*)"/);
    if (!eslesme) throw new EDevletHatasi("Sayfada data-token bulunamadı");
    this.token = eslesme[1];
    return this.token;
  }

  async #tokenGerek() {
    if (!this.token) await this.oturumAc();
    return this.token;
  }

  /**
   * AJAX uçları. Gövdeye `pn` KOYMUYORUZ — ham eğik çizgi WAF'ı tetikliyor
   * (yukarıdaki ölçüm). Yanıt JSON değilse token bayatlamıştır → yenile.
   */
  async #ajax(parametreler, { url = `${BOLGE_URL}&submit`, referer = BOLGE_URL } = {}) {
    for (let deneme = 0; deneme < 3; deneme++) {
      const token = await this.#tokenGerek();
      const govde =
        `token=${token}&ajax=1&` +
        Object.entries(parametreler)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&");

      const { kod, metin } = await this.#curl(url, {
        govde,
        basliklar: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: TABAN,
          Referer: referer,
        },
      });

      if (kod === 200) {
        try {
          return JSON.parse(metin);
        } catch {
          /* JSON değil → token bayat */
        }
      }
      this.sayac.hata++;
      this.sayac.tokenYenileme++;
      this.gunluk(`  ⟳ oturum yenileniyor (HTTP ${kod}, deneme ${deneme + 1})`);
      await bekle(1500 * (deneme + 1));
      await this.oturumAc();
    }
    throw new EDevletHatasi(
      `AJAX yanıtı alınamadı: ${JSON.stringify(parametreler).slice(0, 120)}`
    );
  }

  /** Bir açılır listeyi getirir: [{id, name}, …] */
  async #liste(alan, deger) {
    const yanit = await this.#ajax({ [alan]: deger });
    const dizi = yanit?.data?.dataArr;
    if (!Array.isArray(dizi))
      throw new EDevletHatasi(`Beklenmeyen liste yanıtı (${alan}=${deger})`);
    return dizi;
  }

  /** İl plakasına göre ilçeler. */
  ilceler(plaka) {
    return this.#liste("ilKodu", plaka);
  }

  /** İlçe kimliğine göre mahalle/köyler. */
  mahalleler(ilceId) {
    return this.#liste("ilceKodu", ilceId);
  }

  /**
   * Mahalle SINIR poligonu (GeoJSON Feature listesi) — toplanma alanı DEĞİL.
   * Sayfadaki `toplanmaAlanlari` değişkeni yanıltıcı adlandırılmış:
   * özellikleri {id, name, uavt_code} yani mahallenin kendisi.
   * Alan yoksa null döner.
   */
  async mahalleSiniri(plaka, ilceId, mahalleId) {
    for (let deneme = 0; deneme < 3; deneme++) {
      const token = await this.#tokenGerek();
      const govde =
        `ilKodu=${plaka}&ilceKodu=${ilceId}&mahalleKodu=${mahalleId}` +
        `&sokakKodu=&token=${token}&btn=Sorgula`;
      const { kod, metin } = await this.#curl(`${BOLGE_URL}&submit`, {
        govde,
        takipEt: true,
        basliklar: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: TABAN,
          Referer: BOLGE_URL,
        },
      });

      if (kod === 200) {
        const cikan = ayiklaToplanmaAlanlari(metin);
        if (cikan !== undefined) return cikan;
      }
      this.sayac.hata++;
      this.gunluk(`  ⟳ sınır sorgusu yinelenecek (HTTP ${kod})`);
      await bekle(1500 * (deneme + 1));
      await this.oturumAc();
    }
    throw new EDevletHatasi(
      `Mahalle sınırı alınamadı (il=${plaka} ilçe=${ilceId} mahalle=${mahalleId})`
    );
  }

  /**
   * Bir koordinata hizmet veren toplanma alanları.
   * ÖLÇÜLDÜ: her zaman **en yakın 3 alan** dönüyor (Kırıkkale ve Kadıköy'de
   * ayrı ayrı doğrulandı) ve ülkenin her yerinde çalışıyor.
   * Kapsama dışında JSON null gelebiliyor → boş dizi.
   */
  async alanlarNokta(enlem, boylam) {
    const yanit = await this.#ajax(
      { islem: "getAlanlarForNokta", lat: enlem, lng: boylam },
      { url: `${TABAN}${YOL}?submit`, referer: `${TABAN}${YOL}` }
    );
    if (!yanit || typeof yanit !== "object") return [];
    return Array.isArray(yanit.features) ? yanit.features : [];
  }

  temizle() {
    if (existsSync(this.cerezDosyasi)) rmSync(this.cerezDosyasi, { force: true });
  }
}

/**
 * Sorgula yanıtındaki `toplanmaAlanlari = …;` değişkenini ayıklar.
 * Saf fonksiyon — fixture ile test edilir; e-Devlet sayfası değişirse test
 * kırılır ve sessiz veri kaybı olmaz.
 *
 * @returns {Array|null|undefined} Feature listesi · null (alan yok) ·
 *          undefined (değişken sayfada hiç yok = sayfa beklenenden farklı)
 */
export function ayiklaToplanmaAlanlari(html) {
  const eslesme = html.match(/toplanmaAlanlari\s*=\s*(.+?);\s*(?:\r?\n|<\/script>)/s);
  if (!eslesme) return undefined;
  const ham = eslesme[1].trim();
  if (ham === "null" || ham === "[]") return null;
  try {
    const cozulen = JSON.parse(ham);
    return Array.isArray(cozulen) && cozulen.length ? cozulen : null;
  } catch {
    return undefined;
  }
}

export const SABIT = { TABAN, YOL, BOLGE_URL };
