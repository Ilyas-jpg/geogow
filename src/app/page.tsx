import Link from "next/link";
import Uygulama from "@/components/Uygulama";
import { ozetOku } from "@/lib/veri";

/**
 * Ana sayfa. Harita istemcide çalışır ama bu bileşen SUNUCUDA render edilir:
 * JavaScript'i olmayan ziyaretçi (ve arama motoru) boş belge almaz.
 * Yangın projesinde kök sayfa tamamen istemciye düşüyordu ve JS'siz ziyaretçi
 * bomboş sayfa görüyordu — burada baştan engelleniyor.
 */
export default async function Anasayfa() {
  const ozet = await ozetOku();
  const ilSayisi = ozet?.iller.length ?? 0;
  const alanSayisi = ozet?.toplamAlan ?? 0;

  return (
    <>
      <h1 className="sr-only">
        GeoGow — en yakın toplanma alanını gösteren acil durum haritası
      </h1>

      {/* JS yoksa görünen, JS varsa haritanın altında kalan özet */}
      <noscript>
        <div className="mx-auto max-w-2xl p-4">
          <p className="rounded border border-cizgi bg-zemin-2 p-4">
            Harita için JavaScript gerekiyor. JavaScript olmadan çalışan{" "}
            <Link href="/dusuk" className="text-vurgu underline">
              metin sürümünü
            </Link>{" "}
            kullanabilirsin: il, ilçe ve mahalleni seçerek toplanma alanlarını
            görürsün.
          </p>
        </div>
      </noscript>

      <Uygulama ozet={ozet} />

      {/* Arama motoru ve JS'siz okuyucu için gerçek metin. Gizli değil —
          harita üstünde durduğu için görsel olarak örtülüyor. */}
      <section className="mx-auto max-w-2xl px-4 py-8 text-sm text-metin-2">
        <h2 className="text-base font-semibold text-metin">GeoGow nedir?</h2>
        <p className="mt-2">
          Deprem, yangın, sel gibi afetlerde &ldquo;nereye gideceğim&rdquo;
          sorusunun cevabı olan toplanma alanlarını tek ekranda gösterir. Veri
          AFAD&apos;ın e-Devlet üzerindeki resmî sorgulama hizmetinden alınır;
          şu an {ilSayisi} il ve {alanSayisi} alan yayında.
        </p>
        <p className="mt-2">
          Konum bilgisi cihazdan çıkmaz: en yakın alan hesabı telefonun içinde
          yapılır, sunucuya hiçbir konum gönderilmez.{" "}
          <Link href="/dusuk" className="text-vurgu underline">
            Metin sürümü
          </Link>{" "}
          harita ve JavaScript olmadan da çalışır.
        </p>
        <p className="mt-2">
          Nereye gideceğin kadar{" "}
          <strong className="text-metin">o an ne yapacağın</strong> da önemli:{" "}
          <Link href="/afet-ani" className="text-vurgu underline">
            afet anı ekranı
          </Link>{" "}
          deprem, yangın, sel ve diğer afetlerde ilk hareketleri sırayla
          gösterir — JavaScript gerektirmez, çevrimdışı açılır. Sakinken
          hazırlanmak için{" "}
          <Link href="/hazirlik" className="text-vurgu underline">
            afet çantası ve aile buluşma planı
          </Link>
          .
        </p>
        <p className="mt-2 text-metin-3">
          Resmî uyarı değildir. Acil durumda 112.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/afet-ani" className="text-vurgu underline">
            Afet anı
          </Link>
          <Link href="/hazirlik" className="text-vurgu underline">
            Hazırlık
          </Link>
          <Link href="/mitler" className="text-vurgu underline">
            Doğru bilinen yanlışlar
          </Link>
          <Link href="/hakkinda" className="text-vurgu underline">
            Hakkında ve kaynaklar
          </Link>
          <Link href="/kapsam" className="text-vurgu underline">
            Veri kapsamı
          </Link>
          <a
            href="https://github.com/Ilyas-jpg/geogow"
            className="text-vurgu underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Kaynak kodu (AGPL-3.0)
          </a>
        </p>
      </section>
    </>
  );
}
