/**
 * Sunucu tarafı veri erişimi — yayınlanmış toplanma alanı dosyaları.
 *
 * Veri `public/data/toplanma/` altında STATİK dosyalardır: SSG sayfaları
 * derleme anında okur, tarayıcı da aynı dosyayı doğrudan indirir. Böylece
 * afet anında dinamik uç çökse bile çekirdek çalışmaya devam eder.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IlVerisi } from "./alan.ts";

const DIZIN = join(process.cwd(), "public", "data", "toplanma");

export type IlOzeti = {
  plaka: number;
  il: string;
  slug: string;
  /** İlin alanlarından türetilen kaba kapsayıcı kutu [batı,güney,doğu,kuzey] */
  kutu: [number, number, number, number] | null;
  /** Kutu merkezi [enlem, boylam] — istemci hangi ili indireceğini bundan bulur */
  merkez: [number, number] | null;
  alan: number;
  poligon: number;
  ilce: number;
  mahalle: number;
  kapsananMahalle: number;
  kapsamYuzde: number;
  kayittaGorunmeyen: number;
  toplandi: string;
  minBrotliKB: number;
};

export type Ozet = {
  uretildi: string;
  kaynak: string;
  ilSayisi: number;
  toplamAlan: number;
  iller: IlOzeti[];
};

export type MahalleDosyasi = {
  plaka: number;
  il: string;
  toplandi: string;
  ilceler: { id: number; ad: string; mahalleSayisi: number }[];
  mahalleAlan: Record<string, number[]>;
  kayittaGorunmeyen: { id: number; ad: string; ilce: string | null }[];
};

async function oku<T>(dosya: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(DIZIN, dosya), "utf8")) as T;
  } catch {
    // Henüz hasat edilmemiş il = hata değil, "veri yok" durumu.
    return null;
  }
}

export type MetinAlan = {
  id: number;
  ad: string | null;
  tamAd: string | null;
  tabelaKod: string | null;
  adres: string | null;
  enlem: number;
  boylam: number;
  alanM2: number | null;
};

export type MetinVerisi = {
  plaka: number;
  il: string;
  ilSlug: string;
  toplandi: string;
  ilceler: {
    ad: string;
    slug: string;
    mahalleler: { ad: string; slug: string; alanlar: MetinAlan[] }[];
  }[];
};

export const metinVerisiOku = (plaka: number) =>
  oku<MetinVerisi>(`${plaka}.metin.json`);

export const ozetOku = () => oku<Ozet>("ozet.json");
export const ilVerisiOku = (plaka: number) => oku<IlVerisi>(`${plaka}.min.json`);
export const mahalleVerisiOku = (plaka: number) =>
  oku<MahalleDosyasi>(`${plaka}-mahalle.json`);

/** Yayınlanmış (hasadı tamamlanmış) illerin listesi — SSG yolları buradan. */
export async function yayindakiIller(): Promise<IlOzeti[]> {
  const ozet = await ozetOku();
  return ozet?.iller ?? [];
}
