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
 * Konumu kapsayan iller önce, sonra merkeze uzaklığa göre sıralanır.
 * Birden çok aday dönmesi bilinçli: il sınırındaki bir kullanıcı için en
 * yakın alan komşu ilde olabilir — arayüz gerekirse ikinci ili de indirir.
 */
export function ilAdaylari(
  iller: (IlOzeti | IlAdayi)[],
  enlem: number,
  boylam: number
): IlAdayi[] {
  const hazir = iller.filter((il) => il.merkez) as IlAdayi[];
  const kapsayan = hazir.filter((il) => il.kutu && kutuIcinde(il.kutu, enlem, boylam));
  const digerleri = hazir
    .filter((il) => !kapsayan.includes(il))
    .sort(
      (a, b) =>
        mesafeM(enlem, boylam, a.merkez![0], a.merkez![1]) -
        mesafeM(enlem, boylam, b.merkez![0], b.merkez![1])
    );
  return [...kapsayan, ...digerleri];
}
