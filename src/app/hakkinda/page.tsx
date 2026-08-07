import type { Metadata } from "next";
import Link from "next/link";
import { ozetOku } from "@/lib/veri";

export const metadata: Metadata = {
  title: "Hakkında — veri kaynakları, sınırlar ve lisans",
  description:
    "GeoGow verisini nereden alır, neyi göstermez, konum bilgisine ne yapar, " +
    "hangi lisansla yayınlanır. Güncelleme notları.",
};

/**
 * HAKKINDA — ürünün kendini açıkladığı yer.
 *
 * Afet uygulamasında kullanıcı "bu bilgi nereden geliyor, ne kadar güvenilir"
 * sorusunun cevabını bulamıyorsa uygulamaya güvenmemeli. Bu sayfa o cevabı
 * verir: kaynak, sınır, gizlilik, lisans ve neyin BİLİNÇLİ olarak yapılmadığı.
 */
export default async function HakkindaSayfasi() {
  const ozet = await ozetOku();

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">GeoGow hakkında</h1>
      <p className="mt-3 text-metin-2">
        GeoGow, deprem · yangın · sel gibi afetlerde{" "}
        <strong className="text-metin">
          &ldquo;ben nereye gideceğim&rdquo;
        </strong>{" "}
        sorusunun cevabı olan toplanma alanlarını tek ekranda gösteren ücretsiz
        bir kamu yararı projesidir. Reklam yok, hesap yok, bağış toplama yok.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Veri nereden geliyor?</h2>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-metin">Toplanma alanları</dt>
          <dd className="text-metin-2">
            AFAD&apos;ın e-Devlet üzerindeki{" "}
            <a
              href="https://www.turkiye.gov.tr/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama"
              className="text-vurgu underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Afet ve Acil Durum Toplanma Alanı Sorgulama
            </a>{" "}
            hizmetinden il il toplanır. Şu an{" "}
            <Link href="/kapsam" className="text-vurgu underline">
              {ozet?.ilSayisi ?? 0} il ve{" "}
              {(ozet?.toplamAlan ?? 0).toLocaleString("tr-TR")} alan
            </Link>{" "}
            yayında.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">Depremler</dt>
          <dd className="text-metin-2">
            AFAD Deprem ve Risk Azaltma Genel Müdürlüğü canlı servisi. Büyüklük
            ve konum resmî kaynağındır; biz yorumlamayız.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">Harita altlığı</dt>
          <dd className="text-metin-2">
            © OpenStreetMap katkıcıları · © CARTO
          </dd>
        </div>
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Konum bilgin ne oluyor?</h2>
      <p className="mt-3 text-sm text-metin-2">
        <strong className="text-metin">Cihazından çıkmıyor.</strong> &ldquo;En
        yakın toplanma alanı&rdquo; hesabı tamamen telefonun içinde yapılır:
        ilinin alan listesi indirilir, mesafe tarayıcında hesaplanır. Konumun
        hiçbir sunucuya gönderilmez, kaydedilmez, üçüncü tarafa verilmez.
        Hesap yok, çerezle izleme yok.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Neyi göstermiyoruz?</h2>
      <ul className="mt-3 space-y-2 text-sm text-metin-2">
        <li>
          <strong className="text-metin">Kapasite yok.</strong> Bir alanın kaç
          kişi alacağını hesaplamıyoruz — dayanağımız yok ve afet anında
          uydurma sayı zarar verir. Yalnız kaba alan (m²) yazılır.
        </li>
        <li>
          <strong className="text-metin">Yol tarifi yok.</strong> Mesafeler kuş
          uçuşudur; gerçek yürüme yolu daha uzundur. Rota için telefonunun kendi
          harita uygulamasına yönlendiriyoruz.
        </li>
        <li>
          <strong className="text-metin">Can kaybı sayısı üretmiyoruz.</strong>{" "}
          Böyle bir sayı yalnız resmî kaynaktan, kurum ve saat bilgisiyle
          aktarılır; paylaşım görsellerinde hiç yer almaz.
        </li>
        <li>
          <strong className="text-metin">İhtiyaç bildirimi yok.</strong>{" "}
          Moderasyonsuz bir ihtiyaç akışı afet anında zarar verir; resmî
          kanallara ve mevcut platformlara yönlendiriyoruz.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Çevrimdışı çalışır</h2>
      <p className="mt-3 text-sm text-metin-2">
        Şebeke afet anında ilk çöken şeydir. GeoGow bir kez açıldıktan sonra
        uygulama kabuğunu, gezdiğin harita karolarını ve indirdiğin ilin
        alanlarını cihazında saklar; ağ olmadan da açılır. Sonuç panelindeki
        &ldquo;ilini çevrimdışı kaydet&rdquo; düğmesi bunu kalıcı yapar ve
        gerçekten kaç MB yer kapladığını söyler.
      </p>
      <p className="mt-2 text-sm text-metin-2">
        JavaScript veya harita hiç çalışmıyorsa{" "}
        <Link href="/dusuk" className="text-vurgu underline">
          metin sürümü
        </Link>{" "}
        her koşulda açılır.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Sınırlar ve sorumluluk</h2>
      <p className="mt-3 text-sm text-metin-2">
        GeoGow <strong className="text-metin">resmî bir uyarı kanalı
        değildir</strong>. Bilgiler değişebilir; sahadaki tabela ve resmî
        duyuru esastır. Acil durumda{" "}
        <strong className="text-metin">112</strong> ve{" "}
        <strong className="text-metin">AFAD 122</strong>.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Kaynak kodu ve lisans</h2>
      <p className="mt-3 text-sm text-metin-2">
        GeoGow açık kaynaktır ve <strong className="text-metin">AGPL-3.0</strong>{" "}
        ile yayınlanır: kodu alıp geliştirebilir, kendi sunucunda
        çalıştırabilirsin — değiştirip ağ üzerinden hizmet verirsen kaynağını da
        açmak zorundasın. Algow ve GeoGow adları ile logolar bu lisansın
        kapsamı dışındadır.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Güncelleme notları</h2>
      <ul className="mt-3 space-y-3 text-sm text-metin-2">
        <li>
          <strong className="text-metin">6 Ağustos 2026 — ilk yayın.</strong>{" "}
          Toplanma alanı haritası, en yakın alan araması, metin sürümü, veri
          kapsamı karnesi, AFAD deprem katmanı ve çevrimdışı çalışma.
        </li>
      </ul>

      <p className="mt-8 text-sm">
        <Link href="/" className="text-vurgu underline">
          Haritaya dön
        </Link>
      </p>
    </main>
  );
}
