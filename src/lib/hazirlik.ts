/**
 * HAZIRLIK — afet çantası ve aile buluşma planının tek kaynağı.
 *
 * `/hazirlik` sayfası ve yazdırma görünümü buradan okur.
 *
 * ── HER MADDE ÜÇ SORUYA CEVAP VERİR ──
 *   NE       → `ad`
 *   NE KADAR → `miktar`  (sayı verilen her yerde dayanağı yazılır)
 *   NEDEN    → `neden`   (bu madde çantadan çıkarsa ne olur)
 * Kullanıcı listeyi ezberlemek zorunda değil; gerekçesini bilen kişi
 * eksiği kendi başına tamamlar. "Şunu da al" demek yetmez.
 *
 * ── KURALLAR ──
 *  • Ölçülmemiş sayı yazılmaz. Miktar veren her satırda ya kurum standardı
 *    (AFAD / Sphere / WHO) ya da açıkça "pratik kural" ibaresi vardır.
 *  • Kurumlar çelişiyorsa çelişki gizlenmez (bkz. SU_NOTU).
 *  • Segment eklentileri burada yalnız ÇANTA maddesidir; kadın/ebeveyn/çocuk
 *    kılavuzları ayrı bir iştir ve bu turda yapılmadı.
 */

export type CantaMaddesi = {
  /** Kalıcı kimlik — işaret durumu bununla saklanır, metin değişse de kaybolmaz. */
  id: string;
  ad: string;
  /** NE KADAR. Dayanağı parantez içinde. */
  miktar: string;
  /** NEDEN. Çıkarılırsa ne olacağını somut söyler. */
  neden: string;
  /** Uygulamaya dönük ek not — nereye koy, nasıl seç. */
  ipucu?: string;
  /** Bitmeyen madde yoktur: kaç ayda bir kontrol edilir. */
  tazele?: string;
  /**
   * `public/cizim/ekipman/<ad>.png` — ChatGPT'de ikon sayfası olarak üretilip
   * `sharp.extract` ile kesildi. Görseli olmayan madde ikonsuz görünür,
   * boş kutu çizilmez.
   */
  ikon?: string;
};

export type CantaBolumu = {
  id: string;
  baslik: string;
  aciklama?: string;
  /** Temel bölüm herkes için; eklentiler yalnız ilgili kişi varsa. */
  eklenti: boolean;
  maddeler: CantaMaddesi[];
};

export const SU_NOTU =
  "Su miktarında kurumlar aynı sayıyı vermiyor ve bunu gizlemiyoruz: " +
  "Sphere insani yardım standardı barınma alanında kişi başı günde en az " +
  "15 litre der (içme + yemek + hijyen hepsi dahil); WHO teknik notu sağlık " +
  "ve hijyen için 20 litreyi esas alır. Bu miktarlar sırt çantasında " +
  "taşınamaz — bir litre su bir kilo demektir. Bu yüzden hazırlık ikiye " +
  "ayrılır: çantada yolda yetecek kadar, evde 72 saatlik stok.";

export const CANTA: CantaBolumu[] = [
  {
    id: "temel",
    baslik: "Temel çanta",
    aciklama:
      "İlk 72 saat dışarıdan yardım gelmeden yetebilmek için. Bu süre " +
      "keyfî değil: büyük bir afette arama-kurtarma ve yardım ekiplerinin " +
      "her mahalleye ulaşması gün alır.",
    eklenti: false,
    maddeler: [
      {
        id: "su",
        ad: "Su",
        ikon: "su",
        miktar: "Çantada kişi başı en az 3 litre; evde 72 saatlik stok ayrıca",
        neden:
          "Susuz kalan bir insanın karar verme ve yürüme yeteneği günler değil " +
          "saatler içinde bozulur. Şebeke suyu depremde hem kesilir hem kırılan " +
          "borulardan kirlenir; çeşmeden akması içilebilir olduğu anlamına gelmez.",
        ipucu:
          "0,5 L'lik şişeler tercih et: açılan büyük şişe taşınırken dökülür ve " +
          "paylaşılamaz. Şişeleri çantanın dibine değil kenarına yerleştir.",
        tazele: "6 ayda bir",
      },
      {
        id: "gida",
        ad: "Bozulmayan yüksek kalorili gıda",
        ikon: "gida",
        miktar: "Kişi başı günde ~2.000 kcal × 3 gün (pişirme gerektirmeyen)",
        neden:
          "Elektrik ve doğalgaz kesilir; pişirilmesi gereken gıda afet anında " +
          "gıda değildir. Şeker ve karbonhidrat yükü değil, tok tutan kalori lazım.",
        ipucu:
          "Konserve (açacağı da koy), kuru meyve, kuruyemiş, tahin-pekmez, " +
          "bisküvi. Susatan çok tuzlu şeylerden kaçın — suyunu hızla bitirirsin.",
        tazele: "6 ayda bir son kullanma tarihi",
      },
      {
        id: "fener",
        ad: "El feneri ve yedek pil",
        ikon: "fener",
        miktar: "Kişi başı 1 fener + 1 takım yedek pil",
        neden:
          "Elektrik ilk kesilen şeydir ve enkaz/merdiven karanlıkta geçilmez. " +
          "Telefonun feneri kullanılır ama telefonun şarjı haberleşme için " +
          "saklanmalıdır — ikisi aynı cihaza yüklenmemeli.",
        ipucu:
          "MUM VEYA ÇAKMAK KULLANMA: deprem sonrası doğalgaz kaçağı olasıdır, " +
          "açık alev patlamaya yol açar. Kafa feneri iki eli boşta bırakır.",
        tazele: "6 ayda bir pil (akmış pil cihazı bozar)",
      },
      {
        id: "radyo",
        ad: "Pilli veya kurmalı radyo",
        ikon: "radyo",
        miktar: "Hane başı 1",
        neden:
          "Baz istasyonları hem elektrik kesintisinden hem aşırı yüklenmeden " +
          "çöker; internet gider. Radyo yayını ayakta kalır ve tahliye, " +
          "toplanma, su dağıtım anonsları oradan duyulur.",
        ipucu: "Kurmalı model pil bitmesi sorununu tamamen ortadan kaldırır.",
        tazele: "6 ayda bir çalışıyor mu diye aç",
      },
      {
        id: "duduk",
        ad: "Düdük",
        ikon: "duduk",
        miktar: "Kişi başı 1 (çantada değil, boyunda veya cepte)",
        neden:
          "Enkaz altında bağırmak birkaç saat içinde sesi tamamen bitirir ve " +
          "her nefeste beton tozu solutur. Düdük neredeyse enerji harcamadan " +
          "çok daha uzağa duyulan, insan sesine benzemeyen bir ses üretir — " +
          "kurtarma ekibi tam da bunu dinler.",
        ipucu:
          "Çantanın içinde kalan düdük işe yaramaz: enkaz altında çantana " +
          "ulaşamayabilirsin. Anahtarlığa ve çocuğun çantasına da tak.",
      },
      {
        id: "ilkyardim",
        ad: "İlk yardım kiti",
        ikon: "ilkyardim",
        miktar: "Hane başı 1 (steril gazlı bez, sargı, bant, makas, eldiven, antiseptik)",
        neden:
          "Afette hastane ilk saatlerde ağır yaralılara ayrılır; kesik ve " +
          "sıyrık için sıra beklenmez. Temiz kapatılmayan yara kirli ortamda " +
          "günler içinde enfeksiyon kapar.",
        ipucu: "İçinde ne olduğunu bilmediğin hazır kiti alma, bir kez aç ve öğren.",
        tazele: "Yılda bir (kullanılan malzemeyi hemen tamamla)",
      },
      {
        id: "ilac",
        ad: "Sürekli kullandığın ilaçlar",
        ikon: "ilac",
        miktar: "En az 7 günlük + reçetenin fotoğrafı",
        neden:
          "Tansiyon, kalp, diyabet, epilepsi ve psikiyatri ilaçları kesilince " +
          "afetin kendisinden hızlı zarar verir. Eczane kapalı, kayıtlar " +
          "erişilemez olabilir; kutunun üstündeki etken madde adı seni " +
          "tanımayan bir hekime ilacı yazdırır.",
        ipucu:
          "72 saat değil 7 gün: tahliye edilirsen evine dönmen bir haftayı bulabilir.",
        tazele: "3 ayda bir son kullanma tarihi",
      },
      {
        id: "powerbank",
        ad: "Powerbank ve kablo",
        ikon: "powerbank",
        miktar: "En az 10.000 mAh (≈2 telefon şarjı), dolu tutulur",
        neden:
          "Telefon afet anında fener, harita, kimlik ve haberleşme demektir; " +
          "şarjı bitince hepsi biter. Elektrik günlerce gelmeyebilir.",
        ipucu:
          "Kabloyu powerbank'e bantla — ayrı duran kablo mutlaka kaybolur. " +
          "Uçak moduna alıp yalnız gerektiğinde açmak pili günlerce uzatır.",
        tazele: "3 ayda bir şarj et (boş bekleyen powerbank şişer ve ölür)",
      },
      {
        id: "belge",
        ad: "Önemli belgelerin kopyası",
        ikon: "belge",
        miktar: "Kimlik, tapu, DASK poliçesi, sigorta, ruhsat — kilitli poşette",
        neden:
          "Hasar tespiti, yardım başvurusu ve sigorta işlemleri belge ister; " +
          "asılları enkazda kalır. Kopya, hakkını aramanın tek yolu olabilir.",
        ipucu:
          "Ayrıca telefonuna fotoğrafla ve şehir dışındaki bir yakınına gönder — " +
          "kâğıt ıslanır, telefon kaybolur, ikisi birden gitmez.",
      },
      {
        id: "nakit",
        ad: "Nakit",
        ikon: "nakit",
        miktar: "Küçük banknotlarla, birkaç günlük temel harcama kadar",
        neden:
          "Elektrik ve internet olmadan POS cihazı ve ATM çalışmaz; kart bir " +
          "plastik parçasına döner. Büyük banknotun para üstü çıkmaz.",
        ipucu: "Çantanın ayrı bir gözünde, ıslanmayacak şekilde dursun.",
      },
      {
        id: "hijyen",
        ad: "Hijyen malzemesi",
        ikon: "hijyen",
        miktar: "Sabun, ıslak mendil, tuvalet kâğıdı, diş fırçası-macun",
        neden:
          "Afet sonrası ölümlerin bir kısmı yaralanmadan değil, bozulan " +
          "sanitasyondan kaynaklanan ishal ve bulaşıcı hastalıklardan olur. " +
          "El yıkamak burada bir konfor değil, bir korunma yöntemidir.",
        ipucu: "Alkol bazlı el jeli su bulunamadığında sabunun yerini tutar.",
      },
      {
        id: "battaniye",
        ad: "Isı yalıtım battaniyesi",
        ikon: "battaniye",
        miktar: "Kişi başı 1 (avuç içi kadar, ~50 g)",
        neden:
          "Hipotermi ılık havada bile öldürür: yağmurda ıslanmış ve hareketsiz " +
          "bir insan gece boyunca donabilir. Enkaz başında beklerken ya da " +
          "açıkta geçirilen ilk gecede en çok bu lazım olur.",
        ipucu:
          "Yer kaplamadığı için ailenin her ferdi için ayrı koy. Ayrıca " +
          "yağmurluk ya da büyük çöp poşeti rüzgâr ve ıslanmaya karşı işe yarar.",
      },
      {
        id: "eldiven",
        ad: "Kalın iş eldiveni ve toz maskesi",
        ikon: "eldiven",
        miktar: "Kişi başı 1 çift eldiven + FFP2/N95 maske",
        neden:
          "Enkaz kırık cam, çivi ve keskin sacdan oluşur; yaralanan el seni " +
          "hem işe yaramaz hem enfeksiyon adayı yapar. Yıkılan betondan çıkan " +
          "ince toz (silika) saatler içinde nefes yollarını daraltır.",
        ipucu: "Bez maske toz için yetersizdir; FFP2/N95 ibaresine bak.",
      },
      {
        id: "caki",
        ad: "Çok amaçlı çakı",
        ikon: "caki",
        miktar: "Hane başı 1 (konserve açacağı ve makas içeren)",
        neden:
          "Konserveyi açamamak, kablo veya kumaş kesememek küçük görünür ama " +
          "elinde başka alet olmadığında akşamını belirler.",
      },
      {
        id: "bant",
        ad: "Koli bandı ve plastik örtü",
        ikon: "bant",
        miktar: "1 rulo geniş bant + 2-3 m² kalın naylon",
        neden:
          "Kırılan pencereyi kapatmak, ıslanmayı önlemek, KBRN durumunda " +
          "odayı izole etmek ve kırık bir eşyayı sabitlemek için. Ucuz ve " +
          "hafif ama yerine geçecek bir şey yok.",
      },
      {
        id: "kagit",
        ad: "Kâğıt ve kalem",
        ikon: "kagit",
        miktar: "Küçük bir defter + kurşun kalem",
        neden:
          "Nereye gittiğini kapıya yazmak, kurtarma ekibine bilgi bırakmak ve " +
          "telefon şarjı yokken bir numarayı not etmek için. Kurşun kalem " +
          "ıslakta ve soğukta çalışır, tükenmez çalışmaz.",
      },
      {
        id: "ayakkabi",
        ad: "Yatağın yanında sağlam ayakkabı ve fener",
        ikon: "ayakkabi",
        miktar: "Her yatağın yanında 1 çift + 1 fener",
        neden:
          "Deprem geceleri olur ve sarsıntı biter bitmez zemin kırık cam, " +
          "devrilmiş eşya ve moloz olur. Çıplak ayakla atılan ilk adım seni " +
          "daha evden çıkmadan yaralı hâle getirir.",
        ipucu:
          "Ayakkabıyı yatağın altına iterek değil, bir file içinde karyola " +
          "ayağına bağlayarak koy — sarsıntıda odanın öbür ucuna kayar.",
      },
    ],
  },
  {
    id: "bebek",
    baslik: "Bebek varsa",
    aciklama: "Bebek erişkinden hızlı üşür, hızlı susuz kalır ve kendini anlatamaz.",
    eklenti: true,
    maddeler: [
      {
        id: "bebek-beslenme",
        ad: "Beslenme malzemesi",
        ikon: "bebek-beslenme",
        miktar: "Emziriyorsan ek malzeme gerekmez; mama kullanıyorsan 3 günlük + temiz su",
        neden:
          "Acil durumda anne sütü en güvenli seçenektir: hazırlama gerektirmez, " +
          "kirlenmez, ısı istemez ve bebeği enfeksiyondan korur. Mama ise temiz " +
          "su ve sterilizasyon ister — ikisinin de bulunmadığı koşulda " +
          "hazırlanan mama bebek için doğrudan risktir.",
        ipucu:
          "Afet bölgesine gelen kontrolsüz mama bağışı bu yüzden sakıncalıdır; " +
          "emziren anneye destek olmak daha önceliklidir.",
      },
      {
        id: "bebek-bez",
        ad: "Bez, pişik kremi ve ıslak mendil",
        ikon: "bebek-bez",
        miktar: "Günde ~6 bez × 3 gün = en az 18 bez",
        neden:
          "Bez değiştirilemeyen bebekte birkaç gün içinde ciddi cilt tahrişi ve " +
          "enfeksiyon çıkar; su kısıtlıyken yıkama da yapılamaz.",
        tazele: "Bebek büyüdükçe beden numarasını güncelle",
      },
      {
        id: "bebek-giysi",
        ad: "Yedek giysi ve ısı yalıtımı",
        ikon: "bebek-giysi",
        miktar: "2 kat yedek giysi + battaniye + şapka",
        neden:
          "Bebek vücut ısısını erişkin gibi koruyamaz; ıslanan bebek ılık havada " +
          "bile hipotermiye girer. Isının önemli kısmı baştan kaybedilir.",
      },
      {
        id: "bebek-oyuncak",
        ad: "Tanıdık bir oyuncak veya örtü",
        ikon: "bebek-oyuncak",
        miktar: "1 adet — bebeğin zaten bildiği bir nesne",
        neden:
          "Afet bebeği de travmatize eder ve sürekli ağlayan bir bebek hem " +
          "kendini hem bakan kişiyi tüketir. Kokusunu ve dokusunu tanıdığı bir " +
          "nesne yatıştırmanın en hızlı yoludur.",
      },
    ],
  },
  {
    id: "kadin",
    baslik: "Menstrüel hijyen",
    aciklama:
      "Afet planlamasında en sık atlanan başlık. Atlanması, kadınların " +
      "barınma alanına gitmekten kaçınmasına kadar giden sonuçlar üretir.",
    eklenti: true,
    maddeler: [
      {
        id: "ped",
        ad: "Ped veya yeniden kullanılabilir malzeme",
        ikon: "ped",
        miktar: "Sphere ölçeği: kişi başı ayda 15 tek kullanımlık ped ya da yılda 6 yeniden kullanılabilir ped",
        neden:
          "Adet afet takvimine göre gelmez. Malzemesiz kalan kişi hareketini " +
          "kısıtlar, ortak alana çıkmaz, yardım kuyruğuna girmez — yani " +
          "korunmasından beslenmesine kadar her şeyi etkiler.",
        ipucu: "Çantaya en az bir döngülük koy; kalanı evde stokta dursun.",
        tazele: "Yılda bir",
      },
      {
        id: "ic-camasiri",
        ad: "Yedek iç çamaşırı",
        ikon: "ic-camasiri",
        miktar: "2-3 adet",
        neden:
          "Yıkama imkânı günlerce olmayabilir; kirli iç çamaşırı kısa sürede " +
          "tahriş ve enfeksiyon üretir.",
      },
      {
        id: "sabun",
        ad: "Ek sabun",
        ikon: "sabun",
        miktar: "Sphere: kişi başı ayda 250 g banyo sabunu",
        neden:
          "Menstrüel hijyen su ve sabun olmadan sürdürülemez; genel hijyen " +
          "payının üstüne ayrıca hesaplanır.",
      },
      {
        id: "poset",
        ad: "Kapaklı atık poşeti",
        ikon: "poset",
        miktar: "Birkaç adet",
        neden:
          "Atık toplama durur. Kapalı poşet hem koku ve sinek sorununu hem de " +
          "mahremiyeti çözer — ortak alanda bu, kullanılıp kullanılmamayı belirler.",
      },
    ],
  },
  {
    id: "yasli",
    baslik: "Yaşlı birey varsa",
    eklenti: true,
    maddeler: [
      {
        id: "yasli-ilac",
        ad: "İlaç listesi ve tıbbi özet",
        ikon: "yasli-ilac",
        miktar: "1 sayfa: tanılar, ilaçlar, dozlar, alerjiler, hekim telefonu",
        neden:
          "Yaşlı hasta çok ilaç kullanır ve stres altında hangisini aldığını " +
          "hatırlayamayabilir. Onu tanımayan bir hekime bu tek sayfa, " +
          "dakikalar süren bir sorgulamanın yerini tutar.",
        tazele: "İlaç değiştikçe",
      },
      {
        id: "yasli-gozluk",
        ad: "Yedek gözlük, protez, işitme cihazı pili",
        ikon: "yasli-gozluk",
        miktar: "Yedek gözlük 1, işitme cihazı pili en az 1 hafta",
        neden:
          "Göremeyen ya da duyamayan kişi tahliye anonsunu almaz ve enkazlı " +
          "zeminde yürüyemez. Kırılan tek bir gözlük kişiyi bağımlı hâle getirir.",
      },
      {
        id: "yasli-plan",
        ad: "Merdiven ve taşıma planı",
        ikon: "yasli-plan",
        miktar: "Yazılı: kim yardım edecek, hangi çıkıştan",
        neden:
          "Asansör çalışmayacak. Yürümekte zorlanan biri için bu, önceden " +
          "konuşulmamışsa dakikalar kaybettiren bir tartışmaya döner. " +
          "Komşu da bilirse plan gerçekten çalışır.",
      },
    ],
  },
  {
    id: "engelli",
    baslik: "Engelli birey varsa",
    eklenti: true,
    maddeler: [
      {
        id: "engelli-belge",
        ad: "Engelli kimlik kartı ve sağlık belgeleri",
        ikon: "engelli-belge",
        miktar: "Kopyası çantada, aslı kilitli poşette",
        neden:
          "Tahliye önceliği, uygun barınma ve yardım tahsisi belge ile " +
          "hızlanır; sözle anlatmak sıra bekletir.",
      },
      {
        id: "engelli-cihaz",
        ad: "Yedek cihaz, pil ve şarj aleti",
        ikon: "engelli-cihaz",
        miktar: "En az 1 hafta yetecek pil/şarj",
        neden:
          "İşitme cihazı, konuşma cihazı veya solunum desteği elektriğe " +
          "bağlıysa kesinti doğrudan hayati risktir. Cihaz bir konfor değil, " +
          "kişinin dünyayla bağlantısıdır.",
        tazele: "3 ayda bir",
      },
      {
        id: "engelli-plan",
        ad: "Kişiye özel tahliye planı",
        ikon: "engelli-plan",
        miktar: "Yazılı, evde ve komşuda birer kopya",
        neden:
          "Asansör çalışmayacak, koridor kalabalık olacak. Kimin nasıl " +
          "taşıyacağı, tekerlekli sandalyenin nerede bırakılacağı ve kişiye " +
          "nasıl iletişim kurulacağı önceden yazılmazsa o an çözülmez.",
      },
    ],
  },
  {
    id: "kronik",
    baslik: "Kronik hastalık varsa",
    eklenti: true,
    maddeler: [
      {
        id: "kronik-ilac",
        ad: "Ek ilaç stoğu ve tıbbi özet",
        ikon: "kronik-ilac",
        miktar: "En az 7 günlük",
        neden:
          "Diyaliz, insülin, tansiyon ve kalp ilaçlarında birkaç günlük kesinti " +
          "afetten bağımsız olarak hastaneye götürür — üstelik hastanenin " +
          "en yoğun olduğu anda.",
        tazele: "3 ayda bir",
      },
      {
        id: "kronik-soguk",
        ad: "Soğuk zincir gereken ilaç için plan",
        ikon: "kronik-soguk",
        miktar: "Termos/soğutucu kutu + buz aküsü",
        neden:
          "İnsülin gibi ilaçlar oda sıcaklığında bozulur ve bozulduğu " +
          "anlaşılmaz. Elektrik kesildiğinde nereye götürüleceği önceden " +
          "belirlenmezse ilaç sessizce işe yaramaz hâle gelir.",
      },
      {
        id: "kronik-cihaz",
        ad: "Cihaz kullanılıyorsa yedek güç",
        ikon: "kronik-cihaz",
        miktar: "Cihazın tükettiğine göre hesaplanmış powerbank/akü",
        neden:
          "Solunum cihazı veya pompa elektriğe bağlıysa kesinti süresi doğrudan " +
          "hayati süre demektir. Genel powerbank çoğu tıbbi cihaza yetmez.",
      },
    ],
  },
  {
    id: "hayvan",
    baslik: "Evcil hayvan varsa",
    eklenti: true,
    maddeler: [
      {
        id: "hayvan-mama",
        ad: "Mama ve su",
        ikon: "hayvan-mama",
        miktar: "3 günlük mama + kabı",
        neden:
          "Barınaklar ve yardım noktaları hayvan maması dağıtmayabilir. " +
          "Aç hayvan kaçar ve kaybolur.",
        tazele: "6 ayda bir",
      },
      {
        id: "hayvan-tasima",
        ad: "Taşıma kabı, tasma ve ağızlık",
        ikon: "hayvan-tasima",
        miktar: "Hayvan başına 1",
        neden:
          "Korkan hayvan kaçar veya ısırır; taşıma kabı olmadan çoğu barınma " +
          "alanına ve toplu taşımaya alınmaz. Tahliyeyi hayvan yüzünden " +
          "geciktirmek insanı da riske atar.",
      },
      {
        id: "hayvan-karne",
        ad: "Aşı karnesi ve kimlik/çip bilgisi",
        ikon: "hayvan-karne",
        miktar: "Kopyası çantada + fotoğrafı telefonda",
        neden:
          "Kaybolan hayvanı geri almanın ve geçici barınmaya kabul ettirmenin " +
          "tek yolu kayıttır. Yanında çekilmiş bir fotoğraf da sahiplik kanıtıdır.",
      },
    ],
  },
];

/** Aile buluşma planında doldurulacak alanlar. Tamamı cihazda kalır. */
export type PlanAlani = {
  id: string;
  etiket: string;
  ipucu: string;
  cokSatir?: boolean;
};

export const PLAN_ALANLARI: PlanAlani[] = [
  {
    id: "yakin-nokta",
    etiket: "Evin hemen dışındaki buluşma noktası",
    ipucu:
      "Örn. sokağın karşısındaki park girişi. Yangın gibi evi hemen terk " +
      "ettiren durumlar için: herkes çıktı mı, burada anlaşılır.",
  },
  {
    id: "mahalle-disi",
    etiket: "Mahalle dışındaki buluşma noktası",
    ipucu:
      "Eve dönülemezse burada buluşulur. Herkesin — çocuk dahil — yürüyerek " +
      "gidebileceği ve adını bildiği bir yer seç.",
  },
  {
    id: "toplanma-alani",
    etiket: "Kayıtlı toplanma alanınız",
    ipucu:
      "Haritadan kendi mahallendekini bul; adını ve varsa tabela kodunu yaz. " +
      "Bir kez de yürüyerek git — kapalı geçit veya yıkık duvar planı bozar.",
  },
  {
    id: "sehir-disi",
    etiket: "Şehir dışı irtibat kişisi (ad ve telefon)",
    ipucu:
      "Afet bölgesindeki yerel hatlar kilitlenirken şehirlerarası arama bazen " +
      "bağlanır. Herkes bu tek kişiyi arayıp durumunu bildirir, o da diğerlerine " +
      "aktarır — birbirini arayan beş kişi şebekeyi kendisi tıkar.",
  },
  {
    id: "okul-is",
    etiket: "Okul ve iş yeri planı",
    ipucu:
      "Çocuk okuldan kime teslim edilir, okulun toplanma alanı neresi, iş " +
      "yerinin tahliye noktası neresi? Okulun afet planını sormak velinin hakkı.",
    cokSatir: true,
  },
  {
    id: "vana",
    etiket: "Gaz, su ve elektrik vanalarının yeri",
    ipucu:
      "Evdeki herkes bilmeli ve kapatabilmeli. Gerekiyorsa anahtarın nerede " +
      "durduğunu da yaz — anahtar aranırken geçen dakika pahalıdır.",
  },
  {
    id: "tibbi",
    etiket: "Tıbbi notlar",
    ipucu:
      "Kan grubu, alerji, sürekli ilaç, engel durumu. Bilinci kapalı birini " +
      "tedavi edecek kişi bunu senden soramaz.",
    cokSatir: true,
  },
  {
    id: "hayvan-plan",
    etiket: "Evcil hayvan planı",
    ipucu: "Evde kimse yokken kim alacak, hangi barınağa veya veterinere gidilecek.",
  },
];
