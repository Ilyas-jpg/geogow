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
      {/* Okuma sayfası: tek kolon, 60ch (16 px gövdede ~74 karakter). 1180 px'te satırlar 159
          karaktere çıkıyordu (dedektör: 25 line-length). */}
      <div className="max-w-[60ch]">
      <h1 className="pt-8 text-3xl font-semibold sm:text-4xl">GeoGow hakkında</h1>
      <p className="mt-3 max-w-[62ch] text-lg text-metin-2">
        GeoGow, deprem · yangın · sel gibi afetlerde{" "}
        <strong className="text-metin">
          &ldquo;ben nereye gideceğim&rdquo;
        </strong>{" "}
        sorusunun cevabı olan toplanma alanlarını tek ekranda gösteren ücretsiz
        bir kamu yararı projesidir. Reklam yok, hesap yok, bağış toplama yok.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Veri nereden geliyor?</h2>
      <dl className="mt-3 space-y-3 text-base">
        <div>
          <dt className="font-medium text-metin">Toplanma alanları</dt>
          <dd className="text-metin-2">
            AFAD&apos;ın e-Devlet üzerindeki{" "}
            <a
              href="https://www.turkiye.gov.tr/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama"
              className="baglanti"
              rel="noopener noreferrer"
              target="_blank"
            >
              Afet ve Acil Durum Toplanma Alanı Sorgulama
            </a>{" "}
            hizmetinden il il toplanır. Şu an{" "}
            <Link href="/kapsam" className="baglanti">
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
              className="baglanti"
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
            <Link href="/afet-ani" className="baglanti">
              afet sayfasının
            </Link>{" "}
            altında yazılıdır.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">Sıcaklık ve meteorolojik uyarılar</dt>
          <dd className="text-metin-2">
            Meteoroloji Genel Müdürlüğü. Sıcaklık il merkezi ölçümüdür;
            uyarılar ilçe düzeyindedir ve MGM&apos;nin kendi metniyle gösterilir.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">Uydu ısı noktaları</dt>
          <dd className="text-metin-2">
            NASA FIRMS uydu verisi,{" "}
            <a
              href="https://yangin.algow.net"
              className="baglanti"
              rel="noopener noreferrer"
              target="_blank"
            >
              yangin.algow.net
            </a>{" "}
            üzerinden. Isı noktası &ldquo;yangın var&rdquo; demek değildir; anız
            ve sanayi bacası da ısı üretir.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-metin">Harita altlığı</dt>
          <dd className="text-metin-2">
            © OpenStreetMap katkıcıları · © OpenMapTiles ·{" "}
            <a
              href="https://openfreemap.org"
              className="baglanti"
              rel="noopener noreferrer"
              target="_blank"
            >
              OpenFreeMap
            </a>{" "}
            (anahtarsız ve limitsiz açık altlık; harita karoları cihazında
            önbelleklenir)
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 text-xl font-semibold">Ölçüldü ama yayınlanmadı</h2>
      <p className="mt-3 text-base text-metin-2">
        Bazı kaynakları denedik ve yayınlamamaya karar verdik. Bunu saklamak
        yerine yazıyoruz ki neyin neden eksik olduğu belli olsun:
      </p>
      <ul className="mt-3 space-y-2 text-base text-metin-2">
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
          <strong className="text-metin">Meteoroloji uyarısı mahalle değil ilçe çözünürlüğündedir.</strong>{" "}
          MGM&apos;nin aktif uyarıları sel, fırtına, çığ ve aşırı sıcak
          sayfalarında şerit olarak gösterilir ve metni aynen aktarılır; il
          adı yazılır, &ldquo;mahallende uyarı var&rdquo; denmez, çünkü veri o
          kadar ince değil.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Konum bilgin ne oluyor?</h2>
      <p className="mt-3 text-base text-metin-2">
        <strong className="text-metin">Cihazından çıkmıyor.</strong> &ldquo;En
        yakın toplanma alanı&rdquo; hesabı tamamen telefonun içinde yapılır:
        ilinin alan listesi indirilir, mesafe tarayıcında hesaplanır. Konumun
        hiçbir sunucuya gönderilmez, kaydedilmez, üçüncü tarafa verilmez.
        Hesap yok, çerezle izleme yok.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Neyi göstermiyoruz?</h2>
      <ul className="mt-3 space-y-2 text-base text-metin-2">
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

      <h2 className="mt-10 text-xl font-semibold">Çevrimdışı çalışır</h2>
      <p className="mt-3 text-base text-metin-2">
        Şebeke afet anında ilk çöken şeydir. GeoGow bir kez açıldıktan sonra
        uygulama kabuğunu, gezdiğin harita karolarını ve indirdiğin ilin
        alanlarını cihazında saklar; ağ olmadan da açılır. Sonuç panelindeki
        &ldquo;ilini çevrimdışı kaydet&rdquo; düğmesi bunu kalıcı yapar ve
        gerçekten kaç MB yer kapladığını söyler.
      </p>
      <p className="mt-2 text-base text-metin-2">
        JavaScript veya harita hiç çalışmıyorsa{" "}
        <Link href="/dusuk" className="baglanti">
          sade sürüm
        </Link>{" "}
        her koşulda açılır.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Sınırlar ve sorumluluk</h2>
      <p className="mt-3 text-base text-metin-2">
        GeoGow <strong className="text-metin">resmî bir uyarı kanalı
        değildir</strong>. Bilgiler değişebilir; sahadaki tabela ve resmî
        duyuru esastır. Acil durumda{" "}
        <strong className="text-metin">112</strong>.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Kaynak kodu ve lisans</h2>
      <p className="mt-3 text-base text-metin-2">
        GeoGow açık kaynaktır ve <strong className="text-metin">AGPL-3.0</strong>{" "}
        ile yayınlanır: kodu alıp geliştirebilir, kendi sunucunda
        çalıştırabilirsin — değiştirip ağ üzerinden hizmet verirsen kaynağını da
        açmak zorundasın. Algow ve GeoGow adları ile logolar bu lisansın
        kapsamı dışındadır.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Güncelleme notları</h2>
      <ul className="mt-3 space-y-3 text-base text-metin-2">
        <li>
          <strong className="text-metin">11 Eylül 2026 — paylaşılabilir bağlantı, konumsuz arama, yayın modu, aile planı bağlantısı.</strong>{" "}
          Seçili alan ve açık katmanlar adres çubuğuna yazılıyor; &ldquo;Paylaş&rdquo;
          artık Google bağlantısı değil, aynı alanı açan GeoGow bağlantısı
          veriyor. Konum izni vermeden haritanın ortasına en yakın alanlar
          listelenebiliyor; harita kaydıkça liste izliyor. Haber kanalı ve
          projeksiyon için tam ekran <Link href="/yayin" className="baglanti">yayın modu</Link>{" "}
          geldi (büyük yazı, canlı deprem listesi, saat). Hazırlık sayfasındaki
          aile buluşma planı bir bağlantıyla telefondan telefona taşınıyor,
          sunucuya gitmiyor. Masaüstünde panel sola yaslandı; harita seçili
          pini ve ölçüm noktasını her zaman görünür alanda tutuyor. Aynı gün
          cila: harita altlığı inmezse ürün içi uyarı, katman çipinde yükleniyor
          işareti, son bakılan il önerisi, ekran okuyucuya sonuç duyurusu, deprem
          etiketleri halkanın dışında, bu sayfa ve hazırlık metinleri okuma
          genişliğinde.
        </li>
        <li>
          <strong className="text-metin">11 Eylül 2026 — koyu harita, Türkçe yer adları, yeni çizimler.</strong>{" "}
          Harita yangin.algow.net ile aynı koyu dile geçti: yer adları Türkçe
          (Lefkoşa, Midilli, Selanik), Kuzey Kıbrıs ve il sınırları çizildi,
          komşu ülkelerin bölge etiketleri kapatıldı. Hazırlık sayfasındaki 37
          çanta çizimi ve çantanın üç hâli tek tek yeniden üretildi.
        </li>
        <li>
          <strong className="text-metin">10 Eylül 2026 — altlık değişti, panel ve sade sürüm düzeldi.</strong>{" "}
          Harita altlığı OpenFreeMap&apos;e geçti; önceki sağlayıcının ücretsiz
          karoları filigranlı hale gelmişti. Telefonda alt panel küçültülüp
          büyütülebiliyor, katman notları katlanıyor. Sade sürümün üst menüsü
          geldi; yön artık kısaltma değil, ok ve sözcük. Gizlilik ve atıf
          satırları büyütüldü.
        </li>
        <li>
          <strong className="text-metin">10–14 Ağustos 2026 — harita Google diline geçti, katmanlar çoğaldı.</strong>{" "}
          Açık altlık, kümeli pinler, arama ve katman çipleri; uydu ısı
          noktaları, il sıcaklıkları, MGM uyarı şeridi; basılabilir malzeme
          kataloğu ve tek sayfalık A4 afet kartları; adım şeritleri dokuz
          afette tamamlandı.
        </li>
        <li>
          <strong className="text-metin">7 Ağustos 2026 — afet bilgisi eklendi.</strong>{" "}
          Dokuz afet türü için{" "}
          <Link href="/afet-ani" className="baglanti">
            afet anı ekranı
          </Link>{" "}
          (JavaScript gerektirmez, çevrimdışı açılır), öncesi–sırası–sonrası
          sayfaları,{" "}
          <Link href="/hazirlik" className="baglanti">
            işaretlenebilir afet çantası ve yazdırılabilir aile buluşma planı
          </Link>
          , &ldquo;hayat üçgeni&rdquo; dahil{" "}
          <Link href="/mitler" className="baglanti">
            doğru bilinen yanlışlar
          </Link>{" "}
          sayfası. Haritaya hastane, itfaiye ve sağlık merkezi katmanı geldi.
        </li>
        <li>
          <strong className="text-metin">6 Ağustos 2026 — ilk yayın.</strong>{" "}
          Toplanma alanı haritası, en yakın alan araması, sade sürüm, veri
          kapsamı karnesi, AFAD deprem katmanı ve çevrimdışı çalışma.
        </li>
      </ul>

      <p className="mt-8 text-base">
        <Link href="/" className="baglanti">
          Haritaya dön
        </Link>
      </p>
      </div>
    </SayfaKabugu>
  );
}
