/**
 * AFET TÜRLERİ — davranış bilgisinin TEK kaynağı.
 *
 * `/afet-ani` (tek ekran, çevrimdışı), `/afet/<tür>` (detay), `/mitler`
 * ve ana sayfa aynı bu dosyadan okur. İkinci kopya YOK: bir davranış
 * düzeltildiğinde her yüzeyde aynı anda düzelir.
 *
 * ── İÇERİK KURALLARI (marka anayasası §4, bağlayıcı) ──
 *  1. Her davranış iddiası en az bir Türkiye-resmî + bir uluslararası
 *     otorite kaynağına dayanır (iki-kaynak kuralı).
 *  2. Ölçülmemiş sayı yazılmaz. Kapasite, tahmini can kaybı, "muhtemel" yok.
 *  3. Belirsizlik gizlenmez. Kurumlar çelişiyorsa çelişki YAZILIR —
 *     örn. AFAD'ın kendi sayfasındaki "hayat üçgeni" ifadesi (bkz. mitler).
 *  4. Panik dili ve sansasyon fiili yok. Kısa, sakin, jargonsuz cümle.
 *
 * ⚠️ Bu dosyaya yeni bir davranış eklerken kaynağı da eklenir. Kaynaksız
 *    satır afet anında zarar verir — eksik bilgi, yanlış bilgiden iyidir.
 */

export type Kaynak = {
  kurum: string;
  ad: string;
  url?: string;
};

/** Afet anındaki tek bir hareket. Sıra ÖNEMLİDİR — numaralı gösterilir. */
export type Adim = {
  baslik: string;
  detay: string;
};

/** "Ya ben o an ... isem?" — an davranışının bağlama göre değişen hâli. */
export type Varyant = {
  yer: string;
  ne: string;
};

export type Mit = {
  /** Yaygın yanlış — kullanıcı bunu aradığı için aynen yazılır. */
  yanlis: string;
  dogru: string;
  neden: string;
  kaynaklar: Kaynak[];
};

export type AfetTuru = {
  slug: string;
  ad: string;
  /** Kart üstünde tek satır: afet anında okunacak ilk cümle. */
  ozet: string;
  /** Anlam rengi — dörtten fazlası yok (marka anayasası §2). */
  renk: "kritik" | "uyari" | "guvenli";
  /**
   * Mekanizma: bu afet neden ve nasıl oluşur. Öyküleyici bağlı cümle —
   * madde listesi DEĞİL (marka anayasası §7). Sakin zamanda okunur;
   * `/afet-ani` bu alanı göstermez, panikte mekanizma okunmaz.
   */
  nedenOlur: string;
  /**
   * Erken belirti, uyarı işareti ve resmî uyarı kanalı. Belirtisi
   * olmayan afette (deprem) bu dürüstçe söylenir — uydurma öncü
   * işaret yazmak, insanı olmayan bir uyarıyı beklemeye iter.
   */
  nasilAnlasilir: string;
  anAdimlari: Adim[];
  varyantlar: Varyant[];
  oncesi: string[];
  sonrasi: string[];
  /** Türkiye'ye özgü coğrafi/yapısal gerçek. Ölçülmemiş sayı içermez. */
  turkiye?: string;
  mitler: Mit[];
  kaynaklar: Kaynak[];
};

/* ── Sık kullanılan kaynaklar: tek yerde tanımlı, tekrar yazılmaz ── */

const AFAD: Kaynak = {
  kurum: "AFAD",
  ad: "Afet ve Acil Durum Yönetimi Başkanlığı",
  url: "https://www.afad.gov.tr",
};
const USGS: Kaynak = {
  kurum: "USGS",
  ad: "ABD Jeoloji Araştırmaları Kurumu — deprem güvenliği",
  url: "https://www.usgs.gov/programs/earthquake-hazards",
};
const FEMA: Kaynak = {
  kurum: "FEMA",
  ad: "ready.gov — afete hazırlık",
  url: "https://www.ready.gov",
};
const OGM: Kaynak = {
  kurum: "OGM",
  ad: "Orman Genel Müdürlüğü",
  url: "https://www.ogm.gov.tr",
};
const MGM: Kaynak = {
  kurum: "MGM",
  ad: "Meteoroloji Genel Müdürlüğü",
  url: "https://www.mgm.gov.tr",
};
const DSI: Kaynak = {
  kurum: "DSİ",
  ad: "Devlet Su İşleri — taşkın",
  url: "https://www.dsi.gov.tr",
};
const WHO: Kaynak = {
  kurum: "WHO",
  ad: "Dünya Sağlık Örgütü",
  url: "https://www.who.int",
};
/** Heyelan mekanizması ve erken belirti listesinin uluslararası dayanağı. */
const USGS_HEYELAN: Kaynak = {
  kurum: "USGS",
  ad: "ABD Jeoloji Araştırmaları Kurumu — heyelan tehlikesi",
  url: "https://www.usgs.gov/programs/landslide-hazards",
};
/** Çığ: Avrupa çığ uyarı servislerinin ortak tehlike ölçeği ve işaretleri. */
const EAWS: Kaynak = {
  kurum: "EAWS",
  ad: "Avrupa Çığ Uyarı Servisleri Birliği",
  url: "https://www.avalanches.org",
};

export const AFETLER: AfetTuru[] = [
  /* ─────────────────────────────  DEPREM  ───────────────────────────── */
  {
    slug: "deprem",
    ad: "Deprem",
    ozet: "Çök · Kapan · Tutun. Koşma, dışarı çıkmaya çalışma.",
    renk: "kritik",
    nedenOlur:
      "Anadolu, kuzeyden Avrasya, güneyden Arap ve Afrika levhaları " +
      "arasında sıkışmış bir kara parçasıdır; bu sıkışma onu Kuzey Anadolu " +
      "ve Doğu Anadolu fay hatları boyunca batıya doğru iter. Fay yüzeyleri " +
      "sürtünmeyle kilitli kaldığı sürece hareket durur, ama levhalar " +
      "durmadığı için kayaçta gerilme birikmeye devam eder. Kilit " +
      "koptuğunda biriken enerji saniyeler içinde boşalır ve yüzeye " +
      "sarsıntı olarak ulaşır. Artçılar bu kopmanın ardından kabuğun yeni " +
      "dengesine oturmasıdır: günlerce, bazen aylarca sürer ve ana " +
      "sarsıntının çatlattığı binayı çoğu zaman onlar yıkar.",
    nasilAnlasilir:
      "Dürüst cevap: anlaşılmaz. Bir depremin yerini, zamanını ve " +
      "büyüklüğünü önceden bildiren doğrulanmış bir yöntem yoktur; USGS " +
      "bunu açıkça belirtir ve dolaşan “deprem tahmini” paylaşımlarının " +
      "hiçbiri bilimsel dayanak taşımaz. Önceden bilinebilecek olan " +
      "başkadır: hangi fay kuşağında yaşadığın, oturduğun binanın taşıyıcı " +
      "sistemi ve zeminin cinsi. Sarsıntı başladıktan sonra ise yalnızca " +
      "saniyeler vardır — hızlı giden P dalgası bazen derin bir uğultu ya " +
      "da eşyada kısa bir titreşim olarak asıl sarsıntıdan birkaç saniye " +
      "önce hissedilir; erken uyarı sistemleri de tam olarak bu farkı " +
      "kullanır. Kıyıdaysan güçlü bir sarsıntının ardından denizin " +
      "çekilmesi tsunami işaretidir ve resmî uyarı beklemeden yüksek yere " +
      "çıkmayı gerektirir.",
    anAdimlari: [
      {
        baslik: "ÇÖK",
        detay:
          "Hemen diz üstü çök. Sallanırken ayakta durmaya çalışan kişi düşer; " +
          "çökmek seni hem düşmekten korur hem hareket edebilir bırakır.",
      },
      {
        baslik: "KAPAN",
        detay:
          "Baş ve boynunu kollarınla kapat, sağlam bir masanın altına gir. " +
          "Masa yoksa iç duvar dibine çök, pencere ve devrilebilecek " +
          "eşyalardan (dolap, kitaplık, televizyon) uzaklaş.",
      },
      {
        baslik: "TUTUN",
        detay:
          "Masanın ayağından tut. Masa kayarsa bırakma — onunla birlikte " +
          "hareket et. Sarsıntı bitene kadar bekle.",
      },
      {
        baslik: "Sarsıntı bitince çık",
        detay:
          "Ayakkabını giy (her yer cam olur), gaz ve elektriği kapat, " +
          "asansörü kullanmadan merdivenden in. Binadan uzaklaşıp açık alana, " +
          "toplanma alanına git.",
      },
    ],
    varyantlar: [
      {
        yer: "Yataktaysan",
        ne: "Yatakta kal, yüzüstü dön ve yastıkla başını-boynunu ört. Karanlıkta yatağın yanı cam ve moloz dolu olur.",
      },
      {
        yer: "Araç kullanıyorsan",
        ne: "Sağa çek, dur. Köprü, üst geçit, viyadük ve elektrik direklerinin altında durma. Sarsıntı bitene kadar araçta kal.",
      },
      {
        yer: "Tekerlekli sandalyedeysen",
        ne: "Frenle, öne eğil, baş ve boynunu kollarınla ört. Mümkünse başını korumak için yanına bir yastık/çanta al.",
      },
      {
        yer: "Açık alandaysan",
        ne: "Bina, duvar, direk ve ağaçlardan uzaklaş, olduğun yerde çök. Cephe kaplaması ve cam en çok bina dibine düşer.",
      },
      {
        yer: "Kalabalık kapalı alandaysan",
        ne: "Çıkışa koşma — izdiham yaralar. Koltuk sıraları arasına çök, başını koru, kalabalık dağılınca çık.",
      },
      {
        yer: "Sahildeysen",
        ne: "Sarsıntı bitince yüksek yere çık. Kıyıda güçlü deprem sonrası suyun çekilmesi tsunami işaretidir; resmî uyarı beklemeden uzaklaş.",
      },
    ],
    oncesi: [
      "Devrilebilecek her şeyi duvara sabitle: gardırop, kitaplık, buzdolabı, televizyon, su ısıtıcısı. Depremde ölümlerin büyük kısmı bina çökmesinden değil, düşen ve uçan eşyadan olur.",
      "Yatakların ve oturma yerlerinin üstüne ağır eşya, cam çerçeve, raf koyma.",
      "Evde herkesin bildiği bir buluşma noktası ve şehir dışında bir irtibat kişisi belirle — yerel hatlar kilitlenir, şehir dışı arama bazen bağlanır.",
      "Afet çantanı hazırla ve kapıya yakın tut. Yılda iki kez içindekileri kontrol et.",
      "Binanın yapı durumunu öğren: yapı denetim kaydı, kolon kesilmiş mi, zemin kat dükkâna dönüştürülmüş mü. DASK poliçeni güncel tut.",
      "Gaz, su ve elektrik vanalarının yerini evdeki herkes bilsin.",
    ],
    sonrasi: [
      "Artçı sarsıntılar sürer. Hasarlı binaya eşya almak için girme.",
      "Gaz kokusu alırsan hiçbir elektrik düğmesine dokunma, çakmak yakma — pencereleri aç ve uzaklaş.",
      "Enkaz altındaysan bağırmak yerine düdük çal veya boruya/betona ritmik vur. Ses tasarrufu hayatta kalma süresini uzatır; toz yüzünden bağırmak nefes yolunu tıkar.",
      "Telefonu konuşma yerine kısa mesaj için kullan — şebeke tıkalıyken veri ve SMS daha çok geçer.",
      "Eğitimin yoksa enkaza girme. Eğitimsiz müdahale ikincil çökme yaratıp hem seni hem altta kalanı öldürebilir.",
    ],
    turkiye:
      "6 Şubat 2023 Kahramanmaraş depremlerinde afet ilan edilen illerdeki " +
      "binaların büyük çoğunluğu betonarmeydi; yıkımın ölçeğini belirleyen " +
      "asıl etken malzeme ve denetim kalitesiydi. Bu yüzden hazırlığın en " +
      "büyük parçası çanta değil, oturduğun binanın durumudur.",
    mitler: [
      {
        yanlis: "Hayat üçgeni: sağlam eşyaların yanına çömel, masanın altına girme.",
        dogru: "Çök–Kapan–Tutun. Sağlam bir masanın altına gir ve tutun.",
        neden:
          "“Hayat üçgeni” bilimsel dayanağı olmayan, zincirleme e-posta ve " +
          "sosyal medya paylaşımıyla yayılmış bir modeldir. USGS, FEMA, " +
          "Amerikan Kızılhaçı ve arama-kurtarma standardı INSARAG bu modeli " +
          "açıkça reddeder. Gerekçe: modern binalarda yaralanma ve ölümlerin " +
          "çoğu tam çökmeden değil, düşen ve uçan nesnelerden kaynaklanır; " +
          "sarsıntı sırasında eşyanın yanına ulaşmaya çalışmak seni " +
          "korumasız hâlde ayakta bırakır. AFAD'ın 81 ilde yaptığı resmî " +
          "tatbikat da Çök–Kapan–Tutun hareketi üzerine kuruludur. " +
          "⚠️ Dürüstlük notu: AFAD'ın bazı eski sayfalarında hâlâ “hayat " +
          "üçgeni” ifadesi geçiyor. Bu bir kurum içi tutarsızlıktır; biz " +
          "bilimsel konsensüsü esas alıyoruz ve çelişkiyi gizlemiyoruz.",
        kaynaklar: [
          USGS,
          FEMA,
          {
            kurum: "INSARAG",
            ad: "BM Uluslararası Arama Kurtarma Danışma Grubu",
            url: "https://www.insarag.org",
          },
          AFAD,
        ],
      },
      {
        yanlis: "Kapı eşiği binanın en sağlam yeridir, oraya geç.",
        dogru: "Modern binada kapı eşiği ayrıcalıklı değildir. Masanın altına gir.",
        neden:
          "Bu inanç, kapı çerçevesinin taşıyıcı olduğu eski kerpiç ve yığma " +
          "yapılardan kalmadır. Betonarme binada kapı boşluğu çevresindeki " +
          "duvardan daha güvenli değildir; üstelik seni düşen eşyaya karşı " +
          "korumaz ve sallanan kapı kanadı yaralar.",
        kaynaklar: [USGS, FEMA],
      },
      {
        yanlis: "Sarsıntı başlar başlamaz binadan dışarı koş.",
        dogru: "Sarsıntı sürerken bulunduğun yerde çök, kapan, tutun.",
        neden:
          "Sarsıntı sırasında koşmak düşme demektir. Ayrıca cephe kaplaması, " +
          "cam, saçak ve balkon parçaları en çok bina çıkışına ve kaldırıma " +
          "düşer — yani kaçmaya çalıştığın güzergâh en tehlikeli yerdir. " +
          "Merdiven ve asansör de sarsıntı sırasında güvenli değildir.",
        kaynaklar: [USGS, AFAD],
      },
    ],
    kaynaklar: [
      AFAD,
      USGS,
      FEMA,
      {
        kurum: "Kandilli",
        ad: "Boğaziçi Ü. Kandilli Rasathanesi ve DAE",
        url: "http://www.koeri.boun.edu.tr",
      },
    ],
  },

  /* ──────────────────────────  BİNA YANGINI  ────────────────────────── */
  {
    slug: "bina-yangini",
    ad: "Bina yangını",
    ozet: "Eğil, sürün, çık. Asansör yok, eşya için geri dönme yok.",
    renk: "kritik",
    nedenOlur:
      "Ev yangınlarının çoğu birkaç tanıdık kaynaktan çıkar: gözetimsiz " +
      "bırakılan ocak, aşırı yüklenmiş priz ve uzatma kablosu, eskimiş " +
      "tesisat, ısıtıcı ve söndürülmemiş sigara. Asıl tehlike büyüme " +
      "hızıdır. Alev önce kendi çevresini yakar, ama yükselen sıcak duman " +
      "tavanda birikip odadaki bütün yüzeyleri ısıtır; her yüzey tutuşma " +
      "sıcaklığına ulaştığında yangın tek tek eşyalara değil bir anda " +
      "hacmin tamamına yayılır. Bugünün mobilyası bu süreyi kısaltmıştır: " +
      "sentetik sünger, plastik ve kaplama malzemesi eski doğal " +
      "malzemeden hem daha hızlı yanar hem çok daha yoğun ve zehirli " +
      "duman üretir. Kaçış için kalan süre bu yüzden onlarca yıl öncesine " +
      "göre belirgin biçimde azalmıştır.",
    nasilAnlasilir:
      "Uyuyan bir insanın koku duyusu çalışmaz; gecenin tek gerçek " +
      "uyarısı duman dedektörüdür. Yangın çıkmadan önce de işaret verir: " +
      "sık atan sigorta, ısınan ya da rengi değişen priz ve anahtar, " +
      "yanık plastik kokusu, prizden gelen cızırtı, sürekli ısınan bir " +
      "uzatma kablosu. Bunların hiçbiri kendiliğinden geçmez, hepsi " +
      "kontrol ettirilir. Karbonmonoksit ayrı bir tehlikedir çünkü rengi " +
      "ve kokusu yoktur: evde baş ağrısı, bulantı, sersemlik ve halsizlik " +
      "varsa ve bu şikâyetler evden çıkınca geçiyorsa bu bir yakıt cihazı " +
      "arızasının işaretidir; kombi, şofben ve soba derhal kontrol " +
      "ettirilmelidir.",
    anAdimlari: [
      {
        baslik: "Herkesi uyar, çık",
        detay:
          "Bağırarak uyar ve hemen çıkmaya başla. Yangını söndürmeye çalışmak " +
          "ancak alev küçükse, arkanda açık bir çıkış varsa ve tek başınaysan " +
          "denenir — tereddüt ediyorsan çıkmak doğru karardır.",
      },
      {
        baslik: "Eğil ve sürün",
        detay:
          "Duman yukarı toplanır; temiz hava yere yakındır. Yangında ölümlerin " +
          "büyük kısmı alevden değil duman solumaktan olur. Ağzını nemli bir " +
          "bezle kapat.",
      },
      {
        baslik: "Kapıyı elinin ÜSTÜYLE yokla",
        detay:
          "Kapı kolu ve kapı sıcaksa açma — arkasında yangın var. Elinin üstünü " +
          "kullan: avuç içi yanarsa tutunamazsın. Sıcaksa başka çıkış ara.",
      },
      {
        baslik: "Arkandaki kapıları kapat",
        detay:
          "Kapalı bir kapı dumanı ve alevi dakikalarca tutar. Çıkarken " +
          "kapatmak arkadan gelenlere zaman kazandırır.",
      },
      {
        baslik: "Asla asansör kullanma",
        detay:
          "Asansör yangında elektrik kesilince kabinde kalmak demektir ve " +
          "boşluğu bacaya dönüşüp dumanı taşır. Merdiveni kullan.",
      },
      {
        baslik: "Mahsur kaldıysan görünür ol",
        detay:
          "Kapı altını ıslak bez veya kıyafetle tıka, pencereye git, açık " +
          "renk bir bezle işaret ver ve 112'yi arayıp tam olarak hangi katta " +
          "ve hangi odada olduğunu söyle. Atlama.",
      },
    ],
    varyantlar: [
      {
        yer: "Üstün tutuştuysa",
        ne: "Koşma. Dur – Yat – Yuvarlan. Koşmak alevi büyütür.",
      },
      {
        yer: "Yağ yangınıysa (tava)",
        ne: "Su DÖKME — yağ patlar. Ocağı kapat, kapağı veya ıslak bir beze sararak üstünü kapat, oksijeni kes.",
      },
      {
        yer: "Elektrik kaynaklıysa",
        ne: "Su kullanma. Mümkünse sigortayı indir, kuru kimyevi tozlu (KKT) tüp kullan.",
      },
      {
        yer: "Tüp kaçırıyorsa",
        ne: "Hiçbir düğmeye dokunma, çakmak yakma, zili çalma. Pencereleri aç, tüpün vanasını kapatabiliyorsan kapat, herkesi çıkar.",
      },
    ],
    oncesi: [
      "Duman dedektörü tak ve pilini yılda bir değiştir. Uyurken koku duyusu çalışmaz; seni uyandıracak tek şey dedektördür.",
      "Evden çıkan İKİ ayrı yol belirle ve ailece dene. Tek çıkışlı plan plan değildir.",
      "Yangın tüpünü erişilebilir yerde tut, dolum tarihini takip et.",
      "Tüp, priz ve uzatma kablosu yükünü kontrol et; çoklu prizden ısıtıcı çalıştırma.",
      "Kaçış yolunda ve merdivende eşya biriktirme.",
    ],
    sonrasi: [
      "İtfaiye izin vermeden binaya girme; söndürülmüş yangın saatler sonra tekrar alevlenebilir.",
      "Duman soluduysan kendini iyi hissetsen de sağlık kuruluşuna başvur: karbonmonoksit zehirlenmesinin belirtileri gecikmeli çıkar.",
      "Hasar tespiti ve sigorta için fotoğraf çek, hiçbir şeyi temizlemeden önce kayıt al.",
    ],
    mitler: [
      {
        yanlis: "Yangında hızlıca asansöre binip inmek en hızlı kaçış.",
        dogru: "Asansör yangında kullanılmaz.",
        neden:
          "Yangın elektriği kestiğinde kabin katlar arasında durur ve asansör " +
          "boşluğu dumanı yukarı taşıyan bir baca gibi çalışır.",
        kaynaklar: [
          { kurum: "AFAD", ad: "Afete Hazır Türkiye — yangın" },
          FEMA,
        ],
      },
      {
        yanlis: "Alev büyürse pencereden atlarım.",
        dogru: "Atlamak değil, görünür olmak ve kapıyı tıkamak hayatta tutar.",
        neden:
          "İkinci kattan üstü atlayışlar ağır kırık ve iç kanama üretir. " +
          "Kapı altı tıkanmış bir oda dakikalarca temiz hava tutar; itfaiye " +
          "için asıl bilgi hangi katta ve hangi odada olduğundur.",
        kaynaklar: [FEMA],
      },
    ],
    kaynaklar: [AFAD, FEMA],
  },

  /* ──────────────────────────  ORMAN YANGINI  ───────────────────────── */
  {
    slug: "orman-yangini",
    ad: "Orman yangını",
    ozet: "Erken çık. Geç kalan tahliye, tahliye değil kaçıştır.",
    renk: "uyari",
    nedenOlur:
      "Bir orman yangınının seyrini üç şey belirler: yakıt, hava ve arazi. " +
      "Kuru ot, çalı ve iğne yaprak döküntüsü yakıtı; sıcaklık, düşük nem " +
      "ve rüzgâr havayı; yamacın eğimi de araziyi oluşturur. Yangın yokuş " +
      "yukarı hızlanır, çünkü alev daha oraya varmadan üstündeki bitki " +
      "örtüsünü kurutup tutuşmaya hazırlar; dar ve dik vadiler havayı " +
      "yukarı çekerek bu etkiyi büyütür. Rüzgâr ise cepheyi taşımakla " +
      "kalmaz, kor parçalarını cephenin çok ilerisine düşürerek önde yeni " +
      "yangınlar başlatır — cephe ile aranda mesafe olması güvende olduğun " +
      "anlamına gelmez. Çıkış nedenine gelince, Türkiye'de orman " +
      "yangınlarının büyük bölümü doğal değil insan kaynaklıdır: anız ve " +
      "bahçe atığı yakma, elektrik hattı, izmarit ve söndürülmemiş ateş.",
    nasilAnlasilir:
      "İlk işaret çoğu zaman kokudur; duman rüzgârla kilometrelerce önden " +
      "gelir ve gece uzaktaki bir yangının tek habercisi olabilir. Duman " +
      "sütununun rengi ve yönü de bilgi taşır: koyulaşıp kalınlaşan bir " +
      "sütun büyüyen cepheyi, yön değiştirmesi rüzgârın dönmesini " +
      "gösterir; rüzgâr döndüğünde güvenli sandığın yön birkaç dakikada " +
      "tehlikeli hâle gelebilir. En kritik işaret kor yağmasıdır: üzerine " +
      "küçük yanan parçalar düşmeye başladıysa yangın artık uzakta " +
      "değildir ve tahliye için beklenecek vakit kalmamıştır. Resmî " +
      "tarafta MGM'nin sıcaklık, nem ve rüzgâr uyarıları ile OGM ve " +
      "valilik duyuruları izlenir; yüksek riskli günlerde açıklanan ormana " +
      "giriş yasakları da bu ölçümlere dayanır.",
    anAdimlari: [
      {
        baslik: "Tahliye çağrısını bekleme, erken çık",
        detay:
          "Orman yangınında en ölümcül hata geç çıkmaktır. Duman ve alev " +
          "yaklaşırken yola çıkmak, kapalı yol ve görüş sıfır demektir. " +
          "Şüphedeysen erken çık.",
      },
      {
        baslik: "Rüzgârın yönünü öğren, yan tarafa kaç",
        detay:
          "Yangın rüzgâr yönünde ve yokuş yukarı hızlanır. Alevin önünden " +
          "kaçma; rüzgâra dik yönde, mümkünse yokuş aşağı ve yanmış alana " +
          "veya açıklığa doğru uzaklaş.",
      },
      {
        baslik: "Ağzını ve burnunu ört",
        detay:
          "Nemli bez veya maske kullan. Duman ve ince partikül (PM2.5) " +
          "alevden önce gelir ve nefes yollarını daraltır.",
      },
      {
        baslik: "Araçtaysan camları kapat, klimayı içe al",
        detay:
          "Havalandırmayı iç devreye getir ki duman kabine dolmasın. Farları " +
          "yak. Alev yolu keserse alçak, bitkisiz bir alanda dur; araçtan " +
          "çıkma, yere yat.",
      },
      {
        baslik: "112'yi ara",
        detay:
          "Yerini olabildiğince tarif et: yol, köy, mevki adı ve mümkünse " +
          "konum. Dumanın hangi yöne gittiğini de söyle — ekip yaklaşma " +
          "yönünü ona göre seçer.",
      },
    ],
    varyantlar: [
      {
        yer: "Evde kalmak zorundaysan",
        ne: "Tüm pencere ve kapıları kapat, panjur ve perdeleri kapat, havalandırmayı durdur, tüpü evden uzaklaştır, bahçe hortumunu bağlı bırak ve içeride ıslak bez bulundur.",
      },
      {
        yer: "Hayvanların varsa",
        ne: "Erken tahliyede yanına al veya serbest bırak; bağlı hayvan kaçamaz. Tahliyeyi hayvan için geciktirme.",
      },
      {
        yer: "Yayan kaldıysan",
        ne: "Yanmış (siyah) alan en güvenli yerdir — orada yakıt bitmiştir. Dere yatağı ve boğaz gibi dar-dik yerler baca gibi çeker, girme.",
      },
    ],
    oncesi: [
      "Ev çevresindeki yakıtı temizle: kuru ot, çalı, odun yığını, çatı ve olukta biriken yaprak. Binanın ilk birkaç metresi çıplak olmalı.",
      "Tahliye çantanı yangın mevsiminden önce hazırla ve arabada/kapıda tut.",
      "İki ayrı tahliye rotası belirle — tek yol kapanır.",
      "Anız ve bahçe atığı yakma; Türkiye'de orman yangınlarının büyük bölümü insan kaynaklıdır.",
      "OGM ve valilik duyurularını takip et, yangın riski yüksek günlerde ormana girme yasaklarına uy.",
    ],
    sonrasi: [
      "Hava kalitesi günlerce bozuk kalır; çocuk, yaşlı, astım ve kalp hastası dışarı çıkmasın.",
      "Sıcak noktalar yeniden alevlenebilir; kül altına basma.",
      "Yanmış yamaçta ilk yağmurda heyelan ve çamur akışı riski yükselir — dere yatağına yaklaşma.",
    ],
    turkiye:
      "Türkiye'nin Akdeniz ve Ege kıyı bandı yüksek riskli kuşaktır; yaz " +
      "aylarında sıcak, kuru ve rüzgârlı günler yangını saatler içinde " +
      "kilometrelerce taşıyabilir.",
    mitler: [
      {
        yanlis: "Vatandaş da müdahale etmeli, herkes söndürmeye gitmeli.",
        dogru: "Söndürme profesyonelin işidir; sen erken ve düzenli tahliye et.",
        neden:
          "Eğitimsiz ve donanımsız müdahale hem ikinci bir kurban üretir hem " +
          "de ekiplerin çalışma alanını ve yolları tıkar. Vatandaşın en " +
          "değerli katkısı erken ihbar ve yolu boş bırakmaktır.",
        kaynaklar: [OGM, AFAD],
      },
      {
        yanlis: "Alevi görene kadar vakit var.",
        dogru: "Alev görünmeden çık.",
        neden:
          "Yangın cephesi rüzgârla sıçrayarak ilerler ve kıvılcım cepheden " +
          "kilometrelerce öne düşebilir. Alevi gördüğünde yol çoktan duman " +
          "altında olur.",
        kaynaklar: [OGM],
      },
    ],
    kaynaklar: [OGM, AFAD, MGM],
  },

  /* ───────────────────────────  SEL / TAŞKIN  ──────────────────────── */
  {
    slug: "sel",
    ad: "Sel ve taşkın",
    ozet: "Suya girme. Yaya 15 cm, araç 30 cm akan suda sürüklenir.",
    renk: "uyari",
    nedenOlur:
      "Sel, bir havzaya düşen yağmurun toprağın emebileceğinden ve " +
      "derelerin taşıyabileceğinden fazla olmasıyla başlar. Dik havzalarda " +
      "su yamaçtan hızla iner ve yatağı dakikalar içinde doldurur; buna " +
      "ani taşkın denir ve en tehlikeli yanı, yağmurun senin bulunduğun " +
      "yerde yağmak zorunda olmamasıdır. Yukarı havzada saatler önce " +
      "düşen yağış, aşağıya gökyüzü açıkken gelir. Şehirde tablo ayrıca " +
      "ağırlaşır: asfalt ve beton suyun toprağa geçmesini engellediği için " +
      "yağışın neredeyse tamamı yüzeyden akar, tıkalı ızgara ve yetersiz " +
      "kanalizasyon bu suyu sokakta biriktirir. Üstü kapatılmış dere " +
      "yatakları da su yükseldiğinde yeniden dere olur.",
    nasilAnlasilir:
      "Resmî uyarı en güvenilir kanaldır: MGM'nin turuncu ve kırmızı " +
      "uyarıları ile AFAD ve valilik duyuruları yağış başlamadan önce " +
      "yayınlanır ve telefonda bildirim olarak takip edilebilir. Sahada " +
      "ise suyun kendisi haber verir. Berrak akan bir derenin " +
      "bulanıklaşması, seviyesinin gözle görülür biçimde yükselmesi, dal " +
      "ve çöp taşımaya başlaması yukarıda yağış olduğunu gösterir. Kuru " +
      "bir yatakta duyulan uğultu ise suyun yaklaştığı anlamına gelir ve " +
      "o yataktan hemen çıkmayı gerektirir. Gece gelen ani taşkın en " +
      "ölümcül olanıdır çünkü bu işaretlerin hiçbiri görülmez; bu yüzden " +
      "akşam verilen kuvvetli yağış uyarısı, bodrumdan ve dere kenarından " +
      "önceden çıkmak için tek başına yeterli sebeptir.",
    anAdimlari: [
      {
        baslik: "Yüksek yere çık",
        detay:
          "Bodrum ve zemin katı hemen terk et, üst kata veya yüksek zemine " +
          "çık. Su yükselirken bodrumdan çıkmak birkaç dakika içinde " +
          "imkânsızlaşır.",
      },
      {
        baslik: "Akan suya ASLA girme",
        detay:
          "Bir yetişkini yerden kesmek için yaklaşık 15 cm akan su yeterlidir; " +
          "yaklaşık 30 cm su bir otomobili sürükler. Suyun altındaki yolun " +
          "çökmüş, rögar kapağının açılmış olabileceğini göremezsin.",
      },
      {
        baslik: "Araçla geçmeye çalışma, aracı bırak",
        detay:
          "Su yolu kapattıysa geri dön. Araç sürüklenmeye başladıysa vakit " +
          "kaybetmeden camdan çık ve yüksek yere ulaş; araçta kalma.",
      },
      {
        baslik: "Elektrikten uzak dur",
        detay:
          "Su, direk, pano ve düşmüş kabloyla temas ediyorsa bölgeye girme. " +
          "Evde su yükseliyorsa güvenle ulaşabiliyorsan sigortayı indir; " +
          "suya girerek panoya uzanma.",
      },
      {
        baslik: "Uyarıyı takip et, aşağı inme",
        detay:
          "AFAD ve valilik duyurularını dinle. Su çekilse bile ikinci dalga " +
          "gelebilir; resmî 'geçti' bilgisini bekle.",
      },
    ],
    varyantlar: [
      {
        yer: "Bodrumda oturuyorsan",
        ne: "Yağış uyarısında önceden yukarı çık. Bodrum kat sel ölümlerinde en sık görülen yerdir.",
      },
      {
        yer: "Dere yatağına yakınsan",
        ne: "Ani taşkın dere yatağını dakikalar içinde doldurur; yağmur senin bulunduğun yerde değil, yukarı havzada yağıyor olabilir.",
      },
      {
        yer: "Kamptaysan",
        ne: "Dere kenarına ve kuru görünen yatağa çadır kurma; gece gelen ani taşkın en ölümcül olanıdır.",
      },
    ],
    oncesi: [
      "Evinin ve iş yerinin dere yatağına, taşkın sahasına ya da bodrum kata denk gelip gelmediğini öğren.",
      "MGM'nin turuncu ve kırmızı uyarılarını bildirim olarak takip et.",
      "Bodrumdaki değerli eşya, elektrik panosu ve kombiyi mümkünse yükselt.",
      "Kanalizasyon ve yağmur olukları tıkalı mı kontrol et; mahalle ölçeğinde tıkalı ızgara suyu eve çevirir.",
      "Taşkın sigortasının kapsamını öğren; DASK deprem içindir, seli otomatik kapsamaz.",
    ],
    sonrasi: [
      "Sel suyu kanalizasyon ve kimyasal taşır; temas eden her şeyi temizle, çocukları su birikintisinden uzak tut.",
      "Şebeke suyu resmî olarak temiz denene kadar içme; kaynatmak her kirliliği gidermez.",
      "Islanmış elektrik tesisatını ve cihazları kontrol ettirmeden kullanma.",
      "Hasar kaydı için temizlik öncesi fotoğraf çek.",
    ],
    turkiye:
      "Karadeniz'de dik havzalar nedeniyle ani taşkın; Ege ve Akdeniz'de " +
      "kısa sürede düşen şiddetli yağış tipiktir. Türkiye'de sel " +
      "ölümlerinin tekrar eden nedeni dere yatağına ve taşkın sahasına " +
      "yapılaşmadır.",
    mitler: [
      {
        yanlis: "Arabam yüksek, bu sudan geçerim.",
        dogru: "Geçme. Dön, başka yol bul.",
        neden:
          "Yaklaşık 30 cm akan su bir otomobili yüzdürmeye başlar; SUV ve " +
          "kamyonet de sürüklenir. Ayrıca suyun altında asfaltın çökmüş, " +
          "rögar kapağının açılmış olup olmadığını göremezsin.",
        kaynaklar: [DSI, FEMA, AFAD],
      },
      {
        yanlis: "Su berrak görünüyorsa sığdır.",
        dogru: "Derinlik gözle ölçülmez; akıntı görünenden güçlüdür.",
        neden:
          "Berrak su da yolu oymuş olabilir. Akıntı hızı arttıkça insanı " +
          "yerden kesmek için gereken derinlik azalır.",
        kaynaklar: [DSI, FEMA],
      },
    ],
    kaynaklar: [AFAD, DSI, MGM, FEMA],
  },

  /* ────────────────────────────────  KBRN  ─────────────────────────── */
  {
    slug: "kbrn",
    ad: "Kimyasal, biyolojik, radyolojik, nükleer",
    ozet: "İçeri gir · İçeride kal · Yetkiliyi dinle.",
    renk: "uyari",
    nedenOlur:
      "Bu olaylar çoğunlukla bir kazadan doğar: sanayi tesisinde sızıntı, " +
      "tehlikeli madde taşıyan bir aracın devrilmesi, depo yangınının " +
      "zehirli duman üretmesi ya da bir radyoaktif kaynağın kontrol dışına " +
      "çıkması. Kasıtlı salım da mümkündür ama nadirdir. Sebep ne olursa " +
      "olsun tehlikenin nereye gideceğini belirleyen şey meteorolojidir: " +
      "rüzgârın yönü ve hızı bulutu taşır, yağış onu yere indirir, hava " +
      "sıcaklığındaki fark ise ne kadar yükselip seyreleceğini belirler. " +
      "Bu yüzden aynı olay rüzgârın bir tarafında ciddi risk üretirken " +
      "öbür tarafında hiç risk üretmeyebilir; tahliye ve içeride kalma " +
      "kararları da her zaman rüzgâra göre verilir.",
    nasilAnlasilir:
      "Birincil kaynak resmî uyarıdır: siren, AFAD bildirimi, valilik " +
      "duyurusu ve yayın kuruluşlarından geçilen anons. Kendi gözlemin " +
      "ikincildir ama önemlidir — alışılmadık renkte ya da kokuda bir " +
      "bulut, devrilmiş bir tehlikeli madde tankeri, aynı yerde çok " +
      "sayıda insanın aynı anda öksürmeye, gözleri yaşarmaya, bulanık " +
      "görmeye veya bayılmaya başlaması, kuş ve böceklerin toplu ölümü. " +
      "Kokuya güvenmemek gerekir: bazı maddelerin kokusu hiç yoktur, " +
      "bazılarının kokusu da maruziyet sürdükçe hissedilmez olur. Kokuyu " +
      "tehlikenin ölçüsü saymak yerine, ortamda açıklanamayan bir belirti " +
      "kümesi varsa rüzgârı arkana alıp uzaklaşmak ve en yakın binaya " +
      "girmek doğru karardır.",
    anAdimlari: [
      {
        baslik: "İÇERİ GİR",
        detay:
          "En yakın sağlam binaya gir. Çoğu senaryoda dışarıda kaçmaya " +
          "çalışmak, içeride kalmaktan daha tehlikelidir: bina ile aranızdaki " +
          "duvar seni maruziyetten korur.",
      },
      {
        baslik: "İÇERİDE KAL",
        detay:
          "Kapı ve pencereleri kapat, havalandırma, klima ve aspiratörü " +
          "durdur. Mümkünse penceresiz bir iç odaya geç. Kimyasal madde " +
          "genelde havadan ağırdır: üst kata çık, bodruma inme.",
      },
      {
        baslik: "YETKİLİYİ DİNLE",
        detay:
          "Radyo, AFAD ve valilik duyurularını takip et. Ne olduğunu ve ne " +
          "kadar süreceğini yalnız resmî kaynak söyler; sosyal medyadaki " +
          "doğrulanmamış bilgiye göre hareket etme.",
      },
      {
        baslik: "Maruz kaldıysan soyun ve yıkan",
        detay:
          "Dış giysilerini keserek çıkar (baştan sıyırma), poşetleyip uzağa " +
          "koy ve bol suyla, ovmadan yıkan. Giysiyi çıkarmak maruziyetin " +
          "büyük kısmını ortadan kaldırır.",
      },
      {
        baslik: "İyot hapını kendi başına alma",
        detay:
          "Kararlı iyot yalnız radyolojik/nükleer olayda ve YALNIZCA yetkili " +
          "talimatıyla alınır. Gereksiz kullanımın kendi riskleri vardır ve " +
          "diğer maddelere karşı hiçbir koruma sağlamaz.",
      },
    ],
    varyantlar: [
      {
        yer: "Araçtaysan",
        ne: "Camları kapat, havalandırmayı iç devreye al, bölgeden rüzgâr yönüne dik çıkmaya çalış. Çıkamıyorsan en yakın binaya gir.",
      },
      {
        yer: "Kimyasal koku/duman görüyorsan",
        ne: "Rüzgâr üstüne ve yüksek yere doğru uzaklaş; çukur, bodrum ve alt geçitte gaz birikir.",
      },
      {
        yer: "Endüstriyel tesis yakınındaysan",
        ne: "Tesisin siren ve anons sistemini önceden öğren; tahliye mi sığınma mı istendiğini o anons söyler.",
      },
    ],
    oncesi: [
      "Oturduğun yere yakın sanayi bölgesi, kimyasal tesis veya nükleer santral olup olmadığını bil.",
      "Evde pilli radyo bulundur — KBRN olayında internet ve baz istasyonu ilk kesilen şeydir.",
      "Penceresiz veya en az pencereli bir iç odayı 'sığınma odası' olarak belirle; koli bandı ve plastik örtü bulundur.",
      "AFAD ve valiliğinin resmî duyuru kanallarını önceden takibe al.",
    ],
    sonrasi: [
      "Resmî 'çıkabilirsiniz' bilgisi gelmeden dışarı çıkma.",
      "Maruz kaldığını düşünüyorsan belirti olmasa da sağlık kuruluşuna başvur ve neye maruz kaldığını söyle.",
      "Kontamine olabilecek gıda, su ve yem için yetkili talimatını bekle; şüpheli ürünü tüketme.",
    ],
    mitler: [
      {
        yanlis: "Böyle bir olayda hemen şehirden kaçmak gerekir.",
        dogru: "Çoğu senaryoda doğru hareket içeri girip kalmaktır.",
        neden:
          "Yola çıkmak seni korumasız hâlde, trafikte ve muhtemelen bulutun " +
          "içinde bırakır. Bina duvarı ciddi bir kalkandır ve maruziyetin en " +
          "yoğun olduğu ilk saatler içeride geçirilir. Tahliye gerekiyorsa " +
          "yetkili söyler ve güzergâhı verir.",
        kaynaklar: [
          { kurum: "AFAD", ad: "KBRN" },
          WHO,
          FEMA,
        ],
      },
    ],
    kaynaklar: [{ kurum: "AFAD", ad: "KBRN — Kimyasal Biyolojik Radyolojik Nükleer" }, WHO, FEMA],
  },

  /* ──────────────────────────────  HEYELAN  ────────────────────────── */
  {
    slug: "heyelan",
    ad: "Heyelan",
    ozet: "Yamacın yanına doğru kaç, aşağıya değil.",
    renk: "uyari",
    nedenOlur:
      "Heyelan, bir yamacı yerinde tutan sürtünme direncinin, o kütleyi " +
      "aşağı çeken ağırlığın altına düşmesiyle olur. Dengeyi bozan en " +
      "yaygın etken sudur: uzun süreli yağış veya hızlı kar erimesi " +
      "toprağın boşluklarını doldurur, tanecikler arasındaki tutunmayı " +
      "zayıflatır ve kütleyi ağırlaştırır. Deprem sarsıntısı aynı işi " +
      "saniyeler içinde yapar. İnsan eliyle de tetiklenir: yamacın " +
      "eteğinden yol ya da temel için toprak alınması, üst tarafa dolgu " +
      "yığılması, bitki örtüsünün kaldırılması ve kaçak suyun yamaca " +
      "akıtılması eğimi taşıyabileceğinin ötesine zorlar. Yanmış yamaçlar " +
      "ayrı bir risk taşır, çünkü toprağı kökleriyle bağlayan örtü " +
      "gittiği için ilk büyük yağmurda çamur akışı başlayabilir.",
    nasilAnlasilir:
      "Heyelan, kendini en çok belli eden afettir; çoğu zaman günler, " +
      "hatta haftalar öncesinden işaret verir ve bu işaretler okunduğunda " +
      "can kaybı önlenebilir. Yapıda: duvarda, sıvada ve döşemede beliren " +
      "yeni çatlaklar, daha önce rahat kapanan kapı ve pencerelerin " +
      "sıkışmaya başlaması, kapı ile çerçevesi arasında açılan boşluk. " +
      "Arazide: yolda ve bahçede açılan çatlaklar, istinat duvarının " +
      "şişmesi ya da çatlaması, eğrilmeye başlayan direk, ağaç ve çit, " +
      "daha önce olmayan yerlerden su sızması veya her zaman akan bir " +
      "kaynağın aniden kesilmesi. Hareket yakınsa ses de gelir: ağaç " +
      "çatırtısı, taş yuvarlanması ve giderek yükselen bir uğultu " +
      "duyulduğunda beklenmez, yamacın hareket yönünden yana doğru " +
      "uzaklaşılır.",
    anAdimlari: [
      {
        baslik: "Sesi duyduğunda hemen hareket et",
        detay:
          "Uğultu, ağaç çatırtısı, taş sesi ve aniden bulanan/kesilen dere " +
          "suyu heyelanın habercisidir. Bekleme.",
      },
      {
        baslik: "Yamaca dik yönde kaç",
        detay:
          "Kütlenin akış hattından ÇIK. Aşağı doğru koşmak akışın önünde " +
          "kalmak demektir; yana doğru birkaç on metre hayat kurtarır.",
      },
      {
        baslik: "Çıkamıyorsan sıkış ve başını koru",
        detay:
          "Sağlam bir yapının içinde üst kata çık, iç duvar dibinde kıvrıl, " +
          "baş ve boynunu koru.",
      },
      {
        baslik: "Dere yatağından uzaklaş",
        detay:
          "Çamur ve moloz akışı dere yatağını izler ve şiddetli yağışta " +
          "kilometrelerce ilerleyebilir.",
      },
    ],
    varyantlar: [
      {
        yer: "Araçtaysan",
        ne: "Dik yamaç altında ve dolgu kenarında durma; yol üstünde taş ve çamur varsa geri dön, üstünden geçmeye çalışma.",
      },
      {
        yer: "Geceyse",
        ne: "Riskli yamaç altındaki evde şiddetli yağış gecesinde kalma; heyelan ölümlerinin çoğu uykuda olur.",
      },
    ],
    oncesi: [
      "Evinin dik yamaç altında, eski heyelan alanında veya yeni yapılmış dolgu üzerinde olup olmadığını öğren.",
      "Duvarda ve zeminde büyüyen çatlak, eğrilen direk ve ağaç, kapı-pencerede sıkışma erken uyarıdır — ciddiye al.",
      "Yamaç eteğine su boşaltma, kaçak su ve sızıntıyı hemen tamir ettir; su heyelanın en büyük tetikleyicisidir.",
      "Uzun süreli şiddetli yağışta tahliye planını hazır tut.",
    ],
    sonrasi: [
      "Heyelan alanına girme; ikinci kayma ilkinden hemen sonra gelebilir.",
      "Kopmuş elektrik hattı ve kırılmış boru olabilir, yetkiliye bildir.",
      "Yamaçtaki hasar tespiti yapılmadan eve dönme.",
    ],
    turkiye:
      "Heyelan Türkiye'de özellikle Karadeniz'in dik ve yağışlı havzalarında " +
      "yoğunlaşır; yol yarması, eğim eteğine yapılaşma ve bilinçsiz kazı " +
      "riski artıran başlıca insan etkileridir.",
    mitler: [],
    kaynaklar: [AFAD, MGM, USGS_HEYELAN],
  },

  /* ────────────────────────────────  ÇIĞ  ──────────────────────────── */
  {
    slug: "cig",
    ad: "Çığ",
    ozet: "Yana kaç, tutun, düşersen yüzünün önünde boşluk aç.",
    renk: "uyari",
    nedenOlur:
      "Kar örtüsü tek parça değildir; her yağış, rüzgâr ve erime dönemi " +
      "üst üste binen katmanlar bırakır. Katmanlardan biri zayıfsa — " +
      "açık ve soğuk gecelerde oluşan gevşek kristaller bunun en bilinen " +
      "örneğidir — üstüne binen yeni ve ağır kar sertleşerek bir levha " +
      "hâline gelir ve alttaki zayıf katman bu yükü zar zor taşır. Rüzgâr " +
      "yükü ayrıca eşitsiz dağıtır: karı tepenin rüzgâr alan yüzünden " +
      "alıp arka yüzüne yığar ve orada kalın, gergin bir levha oluşturur. " +
      "Zayıf katman koptuğunda üstündeki levha tek parça hâlinde kayar. " +
      "Çığların büyük bölümü kendiliğinden değil, üzerine çıkan kişinin " +
      "ağırlığıyla tetiklenir; en tehlikeli eğim aralığı otuz ile kırk beş " +
      "derece arasıdır ve kayak ile tırmanış için tercih edilen eğimler " +
      "tam olarak bu aralığa denk gelir.",
    nasilAnlasilir:
      "Risk önce havadan okunur: son iki gün içinde düşen yoğun kar, " +
      "güçlü rüzgâr, ani ısınma ya da kar üstüne yağan yağmur. Rüzgârın " +
      "karı taşıdığı arazide sırtlarda oluşan saçaklar ve ayak altında " +
      "boğuk ses veren sertleşmiş yüzeyler bunun görünür işaretidir. Kar " +
      "örtüsünün kendisi de uyarır: basıldığında duyulan boğuk bir çökme " +
      "sesi ve yüzeyde yanlara doğru koşan çatlaklar, zayıf katmanın " +
      "ayağının altında çöktüğünü söyler; bu, bulunduğun yeri hemen terk " +
      "etmeni gerektiren en net işarettir. Aynı yöne bakan ve aynı " +
      "yükseklikteki bir yamaçta son günlerde inmiş çığ izi görüyorsan " +
      "koşullar değişmemiş demektir. Resmî tarafta AFAD ve valilik çığ " +
      "uyarıları ile MGM'nin kar ve rüzgâr tahminleri izlenir.",
    anAdimlari: [
      {
        baslik: "Yana doğru kaç",
        detay:
          "Çığın akış hattından çık; aşağı kaçmak kütleyle yarışmak demektir.",
      },
      {
        baslik: "Sağlam bir şeye tutun",
        detay: "Kaya, kalın ağaç gövdesi — yüzeyde kalmak gömülmemek demektir.",
      },
      {
        baslik: "Kapıldıysan yüzeyde kalmaya çalış",
        detay:
          "Yüzme hareketiyle üstte kalmaya çalış, ağzını kapat ki kar dolmasın.",
      },
      {
        baslik: "Dururken yüzünün önünde boşluk aç",
        detay:
          "Kar durmadan hemen önce bir elini yüzünün önüne getirip hava " +
          "boşluğu bırak, diğer elini yukarı uzat. Kar durunca beton gibi " +
          "sertleşir; o andan sonra boşluk açamazsın.",
      },
      {
        baslik: "Enerji harcama, dinle",
        detay:
          "Gömüldüysen sürekli bağırma; sesi ancak yakınından duyarlar. " +
          "Kurtarma sesini duyduğunda bağır.",
      },
    ],
    varyantlar: [
      {
        yer: "Grupla gidiyorsan",
        ne: "Riskli yamaçtan teker teker geçilir; hepsi birden geçerse tek çığ herkesi alır.",
      },
      {
        yer: "Kar transceiver'ın varsa",
        ne: "Çıkarken açık olduğunu kontrol et; gömülen kişide kapalı cihaz işe yaramaz.",
      },
    ],
    oncesi: [
      "Çığ uyarısı ve kar durumu raporunu çıkmadan önce oku; taze kar, ani ısınma ve rüzgârla taşınmış kar riski yükseltir.",
      "Kapalı ve işaretlenmiş çığ bölgelerine girme.",
      "Kışın çığ güzergâhındaki yolda park etme ve durma.",
    ],
    sonrasi: [
      "İkinci çığ riski nedeniyle bölgede kalma, yamacın altına girme.",
      "Gömülü kişide dakikalar kritiktir; 112'yi ara ve yerini işaretle.",
    ],
    turkiye:
      "Çığ riski Doğu Anadolu'nun yüksek ve karla kaplı kesimlerinde " +
      "yoğunlaşır; köy yolları ve dağ geçitleri en sık etkilenen yerlerdir.",
    mitler: [],
    kaynaklar: [AFAD, MGM, EAWS],
  },

  /* ─────────────────────────  FIRTINA / HORTUM  ────────────────────── */
  {
    slug: "firtina",
    ad: "Fırtına ve hortum",
    ozet: "İçeri gir, pencereden uzaklaş, en alt ve iç mekâna geç.",
    renk: "uyari",
    nedenOlur:
      "Şiddetli hava, sıcak ve nemli hava ile üstündeki soğuk hava " +
      "arasındaki farkın büyümesiyle başlar. Isınan nemli hava yükselir, " +
      "yükseldikçe içindeki su buharı yoğuşur ve bu sırada açığa çıkan " +
      "ısı yükselişi daha da hızlandırır; ortaya dikey olarak hızla " +
      "büyüyen bir fırtına bulutu çıkar. Yükseklikle rüzgârın yönü ve " +
      "hızı da değişiyorsa yükselen hava kütlesi dönmeye başlar, dönme " +
      "yere kadar uzandığında hortum oluşur. Fırtınanın en yaygın hasar " +
      "biçimi ise hortum değildir: buluttan yere çarpıp yanlara dağılan " +
      "soğuk hava inişi dar bir alanda hortuma yakın hasar üretir ve çok " +
      "daha sık görülür. Türkiye'de hortumlar en çok Ege ve Akdeniz " +
      "kıyılarında, özellikle sonbaharda deniz üstünde oluşup karaya " +
      "geçer.",
    nasilAnlasilir:
      "MGM'nin sarı, turuncu ve kırmızı uyarıları bu olaylar için saatler " +
      "öncesinden ve bölge bazlı yayınlanır; takip edilmesi gereken ilk " +
      "kanal budur. Bulut tarafında birkaç işaret vardır: gökyüzünün " +
      "koyulaşıp yeşile çalması, alçalan ve döndüğü fark edilen bir bulut " +
      "tabanı, rüzgârın aniden kesilip ortalığın sessizleşmesi ve ardından " +
      "yükselen, tren sesini andıran sürekli bir uğultu. Yerden kalkan toz " +
      "ve yaprak dönmeye başladıysa dönme zaten yere ulaşmıştır ve " +
      "sığınmak için saniyeler kalmıştır. Yıldırımda ölçü basittir: gök " +
      "gürültüsünü duyabiliyorsan yıldırımın ulaşabileceği mesafedesin. " +
      "Ses duyulduğu anda kapalı bir alana girilir ve son gürültünün " +
      "üzerinden yaklaşık yarım saat geçmeden dışarı çıkılmaz.",
    anAdimlari: [
      {
        baslik: "Hemen sağlam bir binaya gir",
        detay:
          "Prefabrik, konteyner, çadır ve sundurma fırtınada güvenli değildir.",
      },
      {
        baslik: "Pencereden uzaklaş",
        detay:
          "En alt kata, penceresiz bir iç mekâna (koridor, banyo) geç. " +
          "Yaralanmaların çoğu kırılan camdan olur.",
      },
      {
        baslik: "Baş ve boynunu koru",
        detay: "Çök, kollarınla başını ört, mümkünse sağlam bir masanın altına gir.",
      },
      {
        baslik: "Dışarıda kaldıysan çukura yat",
        detay:
          "Araçta ve açık alanda hortuma yakalanırsan alçak bir çukura yüzükoyun " +
          "yat, başını kolla. Üst geçit altına sığınma — rüzgâr orada hızlanır.",
      },
    ],
    varyantlar: [
      {
        yer: "Denizdeysen",
        ne: "Uyarıyı gördüğün anda kıyıya dön; hortum ve ani fırtına küçük tekneyi dakikalar içinde alabora eder.",
      },
      {
        yer: "Balkonda/teras katındaysan",
        ne: "Saksı, tente, şemsiye ve mobilyayı fırtına gelmeden içeri al; uçan eşya yaralar ve cam kırar.",
      },
    ],
    oncesi: [
      "MGM'nin sarı/turuncu/kırmızı uyarı seviyelerini takip et.",
      "Çatı, baca, uydu anteni ve tenteyi düzenli kontrol ettir.",
      "Fırtına öncesi ağaç altına, direk altına ve reklam panosu yanına park etme.",
    ],
    sonrasi: [
      "Kopmuş elektrik kablosuna yaklaşma, altından geçme.",
      "Hasarlı çatı ve baca altında yürüme; parça saatler sonra da düşer.",
    ],
    mitler: [],
    kaynaklar: [MGM, AFAD],
  },

  /* ──────────────────────  AŞIRI SICAK / SICAK DALGASI  ─────────────── */
  {
    slug: "asiri-sicak",
    ad: "Aşırı sıcak",
    ozet: "Gölgede kal, su iç, aracında kimseyi bırakma.",
    renk: "uyari",
    nedenOlur:
      "Aşırı sıcak, yüksek basıncın bir bölgenin üzerine yerleşip " +
      "günlerce kıpırdamamasıyla oluşur. Alçalan hava bulut oluşumunu " +
      "bastırır, güneş kesintisiz ısıtır ve her günün ısısı bir " +
      "öncekinin üstüne biner. Şehirde tablo ağırlaşır, çünkü asfalt, " +
      "beton ve çatı gün boyu ısı depolayıp bunu gece boyunca geri " +
      "verir; kırsalda düşen gece sıcaklığı şehirde düşmez. Aşırı " +
      "sıcağın öldürücü yanı da buradadır: insan vücudu gündüz biriken " +
      "ısıyı serin gecelerde atar, gece serinlemediğinde bu toparlanma " +
      "hiç olmaz ve yük gün gün birikir. Asıl risk tek bir sıcak öğleden " +
      "sonra değil, gecesi de sıcak geçen üst üste birkaç gündür.",
    nasilAnlasilir:
      "MGM sıcak hava dalgası uyarılarını gün öncesinden yayınlar; " +
      "izlenmesi gereken sayı en yüksek gündüz sıcaklığı kadar en düşük " +
      "gece sıcaklığıdır, çünkü tehlikeyi belirleyen gecenin " +
      "serinleyip serinlemediğidir. Vücudun verdiği işaretler iki " +
      "kademelidir ve aradaki farkı bilmek hayat kurtarır. Sıcak " +
      "bitkinliğinde bol terleme, halsizlik, baş dönmesi, bulantı, baş " +
      "ağrısı ve soğuk-nemli bir cilt görülür; kişi serin bir yere " +
      "alınır, kıyafeti gevşetilir, su verilir ve genellikle toparlanır. " +
      "Sıcak çarpması ise acil bir tıbbi durumdur: cilt sıcaktır ve " +
      "çoğu zaman terleme durmuştur, kişi şaşkın ve huzursuzdur, " +
      "konuşması bozulur, bilinci kapanabilir. Bu tabloda beklenmez, " +
      "hemen 112 aranır ve ambulans gelene kadar kişi gölgeye alınıp " +
      "serinletilir.",
    anAdimlari: [
      {
        baslik: "En sıcak saatlerde dışarı çıkma",
        detay:
          "Öğle ve ikindi arası ağır iş, spor ve uzun yürüyüş erteleyebiliyorsan " +
          "ertelenir.",
      },
      {
        baslik: "Susamayı beklemeden su iç",
        detay:
          "Susama hissi geciktiği için yeterli göstergesi değildir. Alkol ve " +
          "çok şekerli içecek sıvı kaybını artırır.",
      },
      {
        baslik: "Araçta kimseyi bırakma",
        detay:
          "Kapalı araç içi sıcaklığı gölgede bile hızla ölümcül seviyeye " +
          "çıkar. Çocuk ve hayvan 'iki dakika' için bile bırakılmaz.",
      },
      {
        baslik: "Sıcak çarpması belirtisini tanı",
        detay:
          "Yüksek ateşle birlikte deri kuru ve kızarıksa, kişi bilinç " +
          "bulanıklığı, kusma veya bayılma yaşıyorsa bu ACİLDİR: 112'yi ara, " +
          "kişiyi serin yere al, giysisini gevşet, ıslak bezle serinlet.",
      },
    ],
    varyantlar: [
      {
        yer: "Yaşlı bir komşun varsa",
        ne: "Sıcak dalgasında günde bir kez kontrol et; ölümlerin çoğu yalnız yaşayan yaşlılarda ve evde olur.",
      },
      {
        yer: "Dışarıda çalışıyorsan",
        ne: "Gölge molası ve düzenli su zorunludur; baş dönmesi ve kramp ilk uyarıdır, çalışmayı bırak.",
      },
      {
        yer: "Kronik hastalık/ilaç kullanıyorsan",
        ne: "Bazı ilaçlar terlemeyi ve sıvı dengesini etkiler; sıcak dalgası öncesi hekimine sor.",
      },
    ],
    oncesi: [
      "Perde ve panjuru gündüz kapalı tut, havalandırmayı gece yap.",
      "Elektrik kesintisine karşı buz ve su stoğu bulundur.",
      "MGM sıcaklık uyarılarını takip et.",
    ],
    sonrasi: [
      "Sıcak dalgası sonrası halsizlik ve baş dönmesi sürüyorsa sağlık kuruluşuna başvur.",
      "Kesinti yaşandıysa buzdolabında uzun süre kalan gıdayı tüketme.",
    ],
    mitler: [],
    kaynaklar: [MGM, WHO, AFAD],
  },
];

/** Slug → afet. Sayfa üretiminde ve kartlarda kullanılır. */
export function afetBul(slug: string): AfetTuru | undefined {
  return AFETLER.find((a) => a.slug === slug);
}

/** Tüm afetlerin mitleri, hangi afetten geldiği bilgisiyle. `/mitler` için. */
export function tumMitler(): Array<Mit & { afet: AfetTuru }> {
  return AFETLER.flatMap((afet) => afet.mitler.map((mit) => ({ ...mit, afet })));
}

/** Sınıf adları statik yazılır — Tailwind derleyicisi dinamik string göremez. */
export const RENK_SINIFI: Record<AfetTuru["renk"], string> = {
  kritik: "border-kritik/50 text-kritik",
  uyari: "border-uyari/50 text-uyari",
  guvenli: "border-guvenli/50 text-guvenli",
};

/** Yalnız metin/ikon rengi. `RENK_SINIFI`'nı parçalamak kırılgandı. */
export const METIN_SINIFI: Record<AfetTuru["renk"], string> = {
  kritik: "text-kritik",
  uyari: "text-uyari",
  guvenli: "text-guvenli",
};
