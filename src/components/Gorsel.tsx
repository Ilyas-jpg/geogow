/**
 * GÖRSEL — `<picture>` sarmalayıcı: AVIF → WebP → PNG.
 *
 * Tarayıcı desteklediği İLK kaynağı alır; hiçbirini tanımıyorsa `<img>`
 * PNG'yi indirir. Bu ürünün hedefi eski telefon olduğu için PNG yedeği
 * kaldırılmaz: AVIF iOS 16, WebP iOS 14 öncesinde yok.
 *
 * Ölçülen kazanç (2026-08-08, 49 görsel): PNG 737 KB · WebP 556 KB ·
 * AVIF 397 KB. Depoda üç kopya durur ama istemci YALNIZ BİRİNİ indirir;
 * bütçe transfer edilen bayta göre ölçülür.
 *
 * ⚠️ `display: contents` bilerek: `<picture>` kutu üretmez, `<img>` üst
 * kabın doğrudan çocuğuymuş varsayan flex/grid sınıfları (`shrink-0`,
 * `h-12 w-12`) çalışmaya devam eder. Sarmalayıcı normal `inline` kalsaydı
 * ekipman ikonları ve kart kapakları kayardı.
 *
 * Varyantları `node scripts/gorsel-varyant.mjs` üretir. Yeni PNG ekleyen
 * betiği çalıştırmadan commit etmesin: varyant yoksa `<source>` düşer ve
 * tarayıcı sessizce PNG'ye iner — kırılmaz ama bütçe tutmaz.
 */
type Props = {
  /** `/cizim/...png` — varyant yolları bu addan türetilir. */
  kaynak: string;
  /** Bilgi taşımayan süs görselinde boş string bırakılır. */
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Katlamanın üstündeki görselde `eager`; gerisi tembel. */
  loading?: "eager" | "lazy";
  /** Çanta görselinde opaklık geçişi için gerekiyor. */
  style?: React.CSSProperties;
};

export default function Gorsel({
  kaynak,
  alt,
  width,
  height,
  className,
  loading = "lazy",
  style,
}: Props) {
  const taban = kaynak.replace(/\.png$/, "");
  return (
    <picture className="contents">
      <source srcSet={`${taban}.avif`} type="image/avif" />
      <source srcSet={`${taban}.webp`} type="image/webp" />
      <img
        src={kaynak}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={className}
        style={style}
      />
    </picture>
  );
}
