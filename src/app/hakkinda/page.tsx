import type { Metadata } from "next";
import Link from "next/link";
import { ozetOku } from "@/lib/veri";
import SayfaKabugu from "@/components/SayfaKabugu";

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
    <SayfaKabugu>
      <h1 className="pt-8 text-3xl font-semibold sm:text-4xl">GeoGow hakkında</h1>
      <p className="mt-3 max-w-[68ch] text-lg text-metin-2">
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
          <dt className="font-medium text-metin">
            Hastane, itfaiye ve sağlık merkezleri
          </dt>
          <dd className="text-metin-2">
            <a
              href="https://www.openstreetmap.org/copyright"
              className="text-vurgu underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              OpenStreetMap
            </a>{" "}
            katkıcıları, ODbL lisansı. Bu kurumların halka açık ve serbest
            lisanslı bir konum servisi bulunamadığı için topluluk verisi
            kullanılıyor.{" "}
            <strong className="text-metin">Liste eksik olabilir</strong> —
            haritada görünmemesi orada tesis olmadığı anlamına gelmez. Eczaneler
            bilerek dışarıda: afet anında nöbetçi olmayan eczane kapalıdır ve
            veri bütçesinin büyük kısmını tek başına harcıyordu.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">
            Afet davranışı, hazırlık ve mit içerikleri
          </dt>
          <dd className="text-metin-2">
            AFAD, MGM, OGM, DSİ ile USGS, FEMA, WHO, INSARAG ve Sphere
            standartları. Kritik davranış iddiaları en az bir Türkiye-resmî ve
            bir uluslararası otorite kaynağıyla teyit edilir; kaynak künyesi her{" "}
            <Link href="/afet-ani" className="text-vurgu underline">
              afet sayfasının
            </Link>{" "}
            altında yazılıdır.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">Harita altlığı</dt>
          <dd className="text-metin-2">
            © OpenStreetMap katkıcıları · © CARTO
          </dd>
        </div>
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Ölçüldü ama yayınlanmadı</h2>
      <p className="mt-3 text-sm text-metin-2">
        Bazı kaynakları denedik ve yayınlamamaya karar verdik. Bunu saklamak
        yerine yazıyoruz ki neyin neden eksik olduğu belli olsun:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-metin-2">
        <li>
          <strong className="text-metin">Diri fay hattı katmanı yok.</strong>{" "}
          MTA&apos;nın harita servislerine beş ayrı adresten ulaşılamadı. Uydurma
          bir fay çizgisi çizmek, hiç çizmemekten çok daha tehlikelidir.
        </li>
        <li>
          <strong className="text-metin">Deprem tehlike (TDTH) katmanı yok.</strong>{" "}
          Kurumun servisi harita görüntüsü veriyor ama lejant isteğini ve nokta
          sorgusunu reddediyor. Bu hâliyle ekrana koyduğumuz şey, kullanıcının
          ne anlama geldiğini okuyamayacağı renkli bir örtü olurdu.
        </li>
        <li>
          <strong className="text-metin">Meteorolojik uyarı katmanı henüz yok.</strong>{" "}
          MGM&apos;nin uyarı ucu çalışıyor fakat ölçüm anlarında aktif uyarı
          bulunmadığı için veri biçimi doğrulanamadı. Tahmin edilen alan
          adlarıyla kod yazmıyoruz; ilk gerçek uyarıda eklenecek.
        </li>
      </ul>

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
          <strong className="text-metin">7 Ağustos 2026 — afet bilgisi eklendi.</strong>{" "}
          Dokuz afet türü için{" "}
          <Link href="/afet-ani" className="text-vurgu underline">
            afet anı ekranı
          </Link>{" "}
          (JavaScript gerektirmez, çevrimdışı açılır), öncesi–sırası–sonrası
          sayfaları,{" "}
          <Link href="/hazirlik" className="text-vurgu underline">
            işaretlenebilir afet çantası ve yazdırılabilir aile buluşma planı
          </Link>
          , &ldquo;hayat üçgeni&rdquo; dahil{" "}
          <Link href="/mitler" className="text-vurgu underline">
            doğru bilinen yanlışlar
          </Link>{" "}
          sayfası. Haritaya hastane, itfaiye ve sağlık merkezi katmanı geldi.
        </li>
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
    </SayfaKabugu>
  );
}
