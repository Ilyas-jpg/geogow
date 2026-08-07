/**
 * Kullanıcının konumuna göre HANGİ il dosyasının indirileceğini seçer.
 *
 * Neden gerekli: ülke geneli tek dosya olamaz (İstanbul tek başına binlerce
 * alan). İstemci önce küçük `ozet.json`'u alır, buradan doğru ili bulur ve
 * yalnız onun ~25 KB'lık dosyasını indirir. Kötü bağlantı bütçesi bu şekilde
 * korunur.
 */

import { mesafeM } from "./geo.ts";
import type { IlOzeti } from "./veri.ts";

export type IlAdayi = {
  plaka: number;
  il: string;
  slug: string;
  kutu: [number, number, number, number] | null;
  merkez: [number, number] | null;
};

function kutuIcinde(
  kutu: [number, number, number, number],
  enlem: number,
  boylam: number,
  paySn = 0.05
) {
  const [b, g, d, k] = kutu;
  return (
    boylam >= b - paySn && boylam <= d + paySn && enlem >= g - paySn && enlem <= k + paySn
  );
}

/**
 * Konumu kapsayan iller önce, sonra kapsamayanlar — her iki grup da il
 * merkezine uzaklığa göre sıralanır.
 *
 * 🐛 Kapsayan grup ÖNCEDEN HİÇ SIRALANMIYORDU ve `ozet.json`'daki plaka
 * sırasıyla dönüyordu. İl kutuları dikdörtgendir ve fazlasıyla çakışır:
 * ölçüldü — Kırıkkale merkezi (39,8468 / 33,5153) hem Kırıkkale'nin hem
 * ANKARA'nın kutusunun içinde kalıyor (Ankara kutusu 31,33–33,81 D).
 * Plaka sırası Ankara'yı (6) Kırıkkale'den (71) önce koyduğu için
 * Kırıkkale'deki kullanıcıya Ankara'nın dosyası indiriliyor ve "en yakın
 * toplanma alanı" 24 km uzakta çıkıyordu — oysa Kırıkkale'nin kendi 264
 * alanı %100 kapsamla yayında. Merkeze uzaklık: Kırıkkale 20 km, Ankara
 * 82 km. Artık doğru il seçiliyor.
 *
 * Kutu içi/dışı ayrımı korunuyor: kutu kaba da olsa gerçek bir sinyaldir,
 * yalnız merkeze bakmak çok geniş illerde (Konya) yanlış seçim üretir.
 *
 * Birden çok aday dönmesi bilinçli: il sınırındaki bir kullanıcı için en
 * yakın alan komşu ilde olabilir — arayüz gerekirse ikinci ili de indirir.
 */
export function ilAdaylari(
  iller: (IlOzeti | IlAdayi)[],
  enlem: number,
  boylam: number
): IlAdayi[] {
  const hazir = iller.filter((il) => il.merkez) as IlAdayi[];
  const merkezeUzaklik = (il: IlAdayi) =>
    mesafeM(enlem, boylam, il.merkez![0], il.merkez![1]);
  const yakindanUzaga = (a: IlAdayi, b: IlAdayi) => merkezeUzaklik(a) - merkezeUzaklik(b);

  const kapsayan = hazir
    .filter((il) => il.kutu && kutuIcinde(il.kutu, enlem, boylam))
    .sort(yakindanUzaga);
  const kapsayanKume = new Set(kapsayan);
  const digerleri = hazir.filter((il) => !kapsayanKume.has(il)).sort(yakindanUzaga);

  return [...kapsayan, ...digerleri];
}
