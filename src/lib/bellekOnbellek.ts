/**
 * SÜREÇ BELLEĞİNDE ÖNBELLEK — üç canlı uç aynı sorunu paylaşıyor.
 *
 * 🔴 NEDEN VAR (ölçülmüş bir hatanın düzeltmesi): Next'in fetch (Data)
 * önbelleği büyük yanıtları SAKLAMIYOR ve bunu söylemiyor. MGM uyarı arşivi
 * 4,5 MB; `next: { revalidate }` ile her istek 4,5 MB'ı yeniden indiriyordu,
 * uç 5–10 sn sürüyordu ve indirmelerden biri düşünce 503 dönüyordu.
 * Ham veri süreç belleğinde tutulunca: soğuk 18,1 sn → sonraki istekler 7 ms.
 *
 * ⚠️ Bu önbellek SÜREÇ BAŞINA'dır (sunucusuz örnek başına). Asıl koruma
 * yanıttaki `s-maxage` kenar önbelleğidir; bu, aynı örneğe düşen isteklerin
 * üst kaynağı tekrar tekrar dövmesini engelleyen ikinci settir.
 *
 * 🔑 HAM veri saklanır, çözülmüş sonuç değil: "şu an geçerli mi" süzgeci her
 * istekte yeniden çalışsın diye. Çözülmüş listeyi saklasaydık süresi dolmuş
 * uyarıyı göstermeye devam ederdik.
 */

export type Kutu<T> = { veri: T; zaman: number };

/**
 * Kutu bayatsa tazelemeye çalışır; tazeleme düşerse ESKİYİ KORUR.
 * Gerekçe: elimizdeki eski kopya, hiç veri olmamasından iyidir — kayıtlar
 * kendi geçerlilik bilgisini (zaman damgası) taşıdığı için eskiden de doğru
 * süzülür ve yaşı `veriYasiSn` ile dışarı bildirilir.
 */
export async function tazele<T>(
  kutu: Kutu<T> | null,
  omurMs: number,
  cek: () => Promise<T | null>
): Promise<Kutu<T> | null> {
  if (kutu && Date.now() - kutu.zaman < omurMs) return kutu;
  const yeni = await cek();
  if (yeni == null) return kutu;
  if (Array.isArray(yeni) && yeni.length === 0) return kutu;
  return { veri: yeni, zaman: Date.now() };
}

/** JSON çeken, düşerse sebebi loglayıp null dönen ortak yardımcı. */
export async function jsonCek<T>(
  uc: string,
  ayar: { headers?: Record<string, string>; zamanAsimiMs?: number } = {}
): Promise<T | null> {
  try {
    const yanit = await fetch(uc, {
      headers: ayar.headers,
      signal: AbortSignal.timeout(ayar.zamanAsimiMs ?? 25_000),
      // Next önbelleği bilerek devre dışı: büyük yanıtları zaten saklamıyor,
      // "önbelleğe aldım" sanmak yanıltıcı güven verir.
      cache: "no-store",
    });
    if (!yanit.ok) {
      console.error(`kaynak ${uc} → ${yanit.status}`);
      return null;
    }
    return (await yanit.json()) as T;
  } catch (hata) {
    console.error(`kaynak ${uc} düştü:`, (hata as Error).message);
    return null;
  }
}

/**
 * Sınırlı eşzamanlılıkla sırayla çeker.
 * Sıcaklık katmanı 81 ayrı istek gerektiriyor (MGM'de toplu uç YOK:
 * `merkezid=1,2,3`, `?il=`, `/tumu` denendi — hepsi tek kayıt ya da 404).
 * Hepsini aynı anda atmak üst kaynağı döver; bu projede paralellik daha önce
 * e-Devlet'te ölçülüp çürütülmüştü (3 işçi → %11 hata).
 */
export async function sirayla<G, C>(
  girdiler: G[],
  esZamanli: number,
  is: (girdi: G) => Promise<C>
): Promise<C[]> {
  const sonuc: C[] = new Array(girdiler.length);
  let sonraki = 0;
  const isciler = Array.from({ length: Math.min(esZamanli, girdiler.length) }, async () => {
    while (true) {
      const i = sonraki++;
      if (i >= girdiler.length) return;
      sonuc[i] = await is(girdiler[i]);
    }
  });
  await Promise.all(isciler);
  return sonuc;
}
