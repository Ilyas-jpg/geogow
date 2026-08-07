/**
 * Kandilli Rasathanesi (KOERI) son depremler listesi.
 *
 * Kaynak: `koeri.boun.edu.tr/scripts/lst0.asp` — sabit genişlikli metin
 * tablo, onlarca yıldır aynı biçimde.
 *
 * NEDEN İKİNCİ KAYNAK: AFAD ve Kandilli aynı depremi farklı büyüklükle
 * yayınlayabiliyor (farklı ağ, farklı hesap yöntemi). Bu farkı gizleyip tek
 * sayı göstermek, kullanıcıya olmayan bir kesinlik vaat etmek olur; ikisi de
 * gösterilir ve hangisinin ne dediği yazılır.
 *
 * 🔴 SAAT DİLİMİ TUZAĞI — ölçülerek doğrulandı (2026-08-07):
 *   Kandilli **TSİ (UTC+3)** yayınlıyor, AFAD ise **UTC**.
 *   Kanıt: makine saati 09:37 UTC iken Kandilli'nin en yeni kaydı 12:24'tü
 *   (13 dakika önce olan bir deprem). Dönüştürülmezse tüm Kandilli kayıtları
 *   3 saat geleceğe kayar ve "az önce" etiketleri tamamen yanlış çıkar.
 */

import type { Deprem } from "./deprem.ts";

/** `2026.08.07 11:26:07  37.8282   29.6855   7.9   -.-  2.4  -.-   CARDAK (DENIZLI)` */
const SATIR =
  /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s*$/;

/** "-.-" = ölçülmedi; sayıya çevrilmemeli. */
function sayi(deger: string): number | null {
  if (!deger || deger === "-.-") return null;
  const n = Number(deger);
  return Number.isFinite(n) ? n : null;
}

/** TSİ (UTC+3) → UTC ISO. Kandilli yaz/kış saati uygulamıyor, TR de öyle. */
function tsidenUtc(
  yil: string,
  ay: string,
  gun: string,
  saat: string,
  dakika: string,
  saniye: string
): string {
  const yerel = Date.UTC(
    Number(yil),
    Number(ay) - 1,
    Number(gun),
    Number(saat),
    Number(dakika),
    Number(saniye)
  );
  return new Date(yerel - 3 * 3600_000).toISOString().replace(".000Z", "Z");
}

export type KandilliDeprem = Deprem & {
  /** Kandilli üç ayrı büyüklük yayınlar; hangisinin kullanıldığı görünür olsun. */
  md: number | null;
  ml: number | null;
  mw: number | null;
};

export function kandilliAyristir(metin: string): KandilliDeprem[] {
  const sonuc: KandilliDeprem[] = [];
  for (const satir of metin.split(/\r?\n/)) {
    const e = SATIR.exec(satir);
    if (!e) continue;
    const [, yil, ay, gun, sa, dk, sn, enlemS, boylamS, derinlikS, mdS, mlS, mwS, yerHam] = e;

    const enlem = Number(enlemS);
    const boylam = Number(boylamS);
    if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) continue;

    const md = sayi(mdS);
    const ml = sayi(mlS);
    const mw = sayi(mwS);
    // Kandilli'nin kendi tercih sırası: Mw > ML > MD
    const buyukluk = mw ?? ml ?? md;
    if (buyukluk === null) continue;

    // Satır sonunda "İlksel/Revize" çözüm niteliği olabiliyor — yer adından ayır.
    const yer = yerHam
      .replace(/\s+(İlksel|Ilksel|REVIZE|Revize|Revised)\s*$/i, "")
      .replace(/\s{2,}.*$/, "")
      .trim();

    sonuc.push({
      // AFAD kimlikleriyle çakışmasın diye önek: birleştirmede ayırt edici.
      id: `koeri:${yil}${ay}${gun}${sa}${dk}${sn}:${enlemS}:${boylamS}`,
      buyukluk,
      tur: mw !== null ? "MW" : ml !== null ? "ML" : "MD",
      derinlikKm: Number(derinlikS) || 0,
      enlem,
      boylam,
      yer,
      il: null,
      ilce: null,
      zaman: tsidenUtc(yil, ay, gun, sa, dk, sn),
      guncellendi: false,
      md,
      ml,
      mw,
    });
  }
  return sonuc.sort((a, b) => Date.parse(b.zaman) - Date.parse(a.zaman));
}

/**
 * Aynı deprem mi? İki kurum aynı olayı biraz farklı konum ve saniyeyle
 * yayınlar. Eşik bilinçli olarak geniş değil: fazla geniş olursa iki AYRI
 * depremi birleştirir, dar olursa aynı depremi iki kez gösterir.
 * 60 saniye + ~35 km, artçı serisinde bile ayırt edici.
 */
export function ayniDeprem(a: Deprem, b: Deprem, saniye = 60, km = 35): boolean {
  const dt = Math.abs(Date.parse(a.zaman) - Date.parse(b.zaman)) / 1000;
  if (dt > saniye) return false;
  const dEnlem = (a.enlem - b.enlem) * 111.32;
  const dBoylam =
    (a.boylam - b.boylam) * 111.32 * Math.cos(((a.enlem + b.enlem) / 2) * (Math.PI / 180));
  return Math.hypot(dEnlem, dBoylam) <= km;
}
