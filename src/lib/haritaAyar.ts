/**
 * Harita sözleşmesinin MapLibre'ye BAĞIMLI OLMAYAN parçası.
 *
 * Neden ayrı dosya: `Harita.tsx` `dynamic(..., { ssr: false })` ile ayrı
 * parçaya alınıyor ki alan listesi MapLibre'yi beklemesin. Bu sabiti oradan
 * statik `import` etmek maplibre-gl'i ana pakete geri çeker ve o kazanımı
 * sessizce yok eder — ölçmeden fark edilmez.
 */

/**
 * Bu yakınlaşmadan itibaren gerçek toplanma alanı noktaları indirilir.
 * Altında il rozeti gösterilir: ülke görünümünde 8 ilin dosyasını birden
 * indirmek ~200 KB eder ve o ölçekte binlerce nokta okunamaz bir leke olur.
 */
export const NOKTA_YAKINLASMASI = 8.5;

/** Düşük yakınlaşmada gösterilen il rozeti. */
export type IlIsareti = {
  plaka: number;
  il: string;
  alan: number;
  /** [enlem, boylam] */
  merkez: [number, number];
};
