/**
 * HAZIRLIK — afet çantası ve aile buluşma planının tek kaynağı.
 *
 * `/hazirlik` sayfası ve yazdırma görünümü buradan okur.
 *
 * ── KURALLAR ──
 *  • Ölçülmemiş sayı yazılmaz. Miktar veren her satırın standardı yanında
 *    yazılıdır (AFAD / Sphere / WHO) ki kullanıcı nereden geldiğini görsün.
 *  • Kurumlar çelişiyorsa çelişki gizlenmez — su miktarında Sphere ile WHO
 *    farklı sayı verir, ikisi de yazılır (bkz. SU_NOTU).
 *  • Segment eklentileri burada yalnız ÇANTA maddesidir; kadın/ebeveyn/çocuk
 *    kılavuzları ayrı bir iştir ve bu turda yapılmadı.
 */

export type CantaMaddesi = {
  /** Kalıcı kimlik — işaret kutusu durumu bununla saklanır, metin değişse de kaybolmaz. */
  id: string;
  ad: string;
  not?: string;
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
  "15 litre (içme + yemek + hijyen) der; WHO teknik notu sağlık ve hijyen " +
  "için 20 litreyi esas alır. Bu miktarlar bir çantada taşınamaz — çantada " +
  "yolda yetecek kadar su, kalanı evde stok olarak bulunur.";

export const CANTA: CantaBolumu[] = [
  {
    id: "temel",
    baslik: "Temel — herkes için",
    aciklama:
      "İlk 72 saat kendi başına yetebilmek için. Çanta kapıya yakın, " +
      "karanlıkta bulunabilecek bir yerde durur.",
    eklenti: false,
    maddeler: [
      { id: "su", ad: "Su", not: "Yolda yetecek kadar çantada, kalanı evde stok — bkz. aşağıdaki not" },
      {
        id: "gida",
        ad: "Bozulmayan yüksek kalorili gıda",
        not: "Konserve, kuru meyve, kuruyemiş, tahin-pekmez, bebek maması gerekiyorsa ayrıca",
      },
      { id: "fener", ad: "El feneri ve yedek pil", not: "Mumu değil feneri tercih et — gaz kaçağında mum patlamaya yol açar" },
      {
        id: "radyo",
        ad: "Pilli veya kurmalı radyo",
        not: "İnternet ve baz istasyonu ilk kesilen şeydir; resmî duyuruyu radyo taşır",
      },
      {
        id: "duduk",
        ad: "Düdük",
        not: "Enkaz altında bağırmak sesi ve nefesi bitirir; düdük çok daha uzun duyulur",
      },
      { id: "ilkyardim", ad: "İlk yardım kiti" },
      {
        id: "ilac",
        ad: "Sürekli kullandığın ilaçlar ve reçetesi",
        not: "En az birkaç günlük; reçetenin fotoğrafı da olsun",
      },
      { id: "powerbank", ad: "Powerbank ve kablo", not: "Dolu tutulur; 6 ayda bir kontrol edilir" },
      {
        id: "belge",
        ad: "Belge kopyaları",
        not: "Kimlik, tapu, DASK poliçesi, sigorta, ruhsat — ıslanmaması için kilitli poşette",
      },
      { id: "nakit", ad: "Bir miktar nakit", not: "POS ve ATM çalışmaz; küçük banknot işe yarar" },
      { id: "hijyen", ad: "Hijyen malzemesi", not: "Sabun, ıslak mendil, tuvalet kâğıdı, diş fırçası" },
      { id: "battaniye", ad: "Battaniye / yağmurluk", not: "İnce ısı yalıtım battaniyesi yer kaplamaz" },
      { id: "eldiven", ad: "Kalın iş eldiveni ve maske", not: "Moloz keskin, toz yoğun olur" },
      { id: "caki", ad: "Çok amaçlı çakı" },
      { id: "bant", ad: "Koli bandı ve plastik örtü", not: "Kırık camı kapatmak, sığınma odasını izole etmek için" },
      { id: "kagit", ad: "Kâğıt ve kalem", not: "Nereye gittiğini kapıya yazmak için" },
      {
        id: "ayakkabi",
        ad: "Yatağın yanında sağlam ayakkabı ve fener",
        not: "Depremden sonra zemin cam olur; çıplak ayakla yürünmez",
      },
    ],
  },
  {
    id: "bebek",
    baslik: "Bebek varsa",
    eklenti: true,
    maddeler: [
      {
        id: "bebek-beslenme",
        ad: "Beslenme malzemesi",
        not: "Acil durumda anne sütü en güvenli seçenektir; mama kullanılıyorsa temiz su ve sterilizasyon planıyla birlikte düşünülür",
      },
      { id: "bebek-bez", ad: "Bez ve pişik kremi" },
      { id: "bebek-giysi", ad: "Yedek giysi ve ısı yalıtımı", not: "Bebek erişkinden çok daha hızlı üşür" },
      { id: "bebek-oyuncak", ad: "Tanıdık bir oyuncak veya örtü", not: "Bilinen bir nesne çocuğu sakinleştirir" },
    ],
  },
  {
    id: "kadin",
    baslik: "Menstrüel hijyen",
    eklenti: true,
    maddeler: [
      {
        id: "ped",
        ad: "Ped veya yeniden kullanılabilir malzeme",
        not: "Sphere hijyen standardı kişi başı ayda 15 tek kullanımlık ped ya da yılda 6 yeniden kullanılabilir ped ölçeğini verir",
      },
      { id: "ic-camasiri", ad: "Yedek iç çamaşırı" },
      { id: "sabun", ad: "Ek sabun", not: "Sphere: kişi başı ayda 250 g banyo sabunu" },
      { id: "poset", ad: "Kapaklı atık poşeti" },
    ],
  },
  {
    id: "yasli",
    baslik: "Yaşlı birey varsa",
    eklenti: true,
    maddeler: [
      { id: "yasli-ilac", ad: "İlaç listesi ve tıbbi özet" },
      { id: "yasli-gozluk", ad: "Yedek gözlük, protez, işitme cihazı pili" },
      { id: "yasli-baston", ad: "Baston / yürüteç için plan", not: "Merdivenle inilecekse kim yardım edecek, önceden konuşulur" },
    ],
  },
  {
    id: "engelli",
    baslik: "Engelli birey varsa",
    eklenti: true,
    maddeler: [
      { id: "engelli-belge", ad: "Engelli kimlik kartı ve sağlık belgeleri" },
      { id: "engelli-cihaz", ad: "Yedek cihaz, pil ve şarj aleti" },
      {
        id: "engelli-plan",
        ad: "Kişiye özel tahliye planı",
        not: "Asansör çalışmayacak: kim, nasıl, hangi çıkıştan — yazılı olsun ve komşu da bilsin",
      },
    ],
  },
  {
    id: "kronik",
    baslik: "Kronik hastalık varsa",
    eklenti: true,
    maddeler: [
      { id: "kronik-ilac", ad: "Ek ilaç stoğu ve tıbbi özet" },
      {
        id: "kronik-soguk",
        ad: "Soğuk zincir gereken ilaç için plan",
        not: "Elektrik kesildiğinde nereye götürüleceği önceden belirlenir",
      },
      { id: "kronik-cihaz", ad: "Cihaz kullanılıyorsa yedek güç" },
    ],
  },
  {
    id: "hayvan",
    baslik: "Evcil hayvan varsa",
    eklenti: true,
    maddeler: [
      { id: "hayvan-mama", ad: "Birkaç günlük mama ve su" },
      { id: "hayvan-tasima", ad: "Taşıma kabı, tasma ve ağızlık" },
      { id: "hayvan-karne", ad: "Aşı karnesi ve kimlik/çip bilgisi" },
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
    ipucu: "Örn. sokağın karşısındaki park girişi. Ani yangın gibi durumlar için.",
  },
  {
    id: "mahalle-disi",
    etiket: "Mahalle dışındaki buluşma noktası",
    ipucu: "Eve dönülemezse burada buluşulur. Herkesin yürüyerek gidebileceği bir yer seç.",
  },
  {
    id: "toplanma-alani",
    etiket: "Kayıtlı toplanma alanınız",
    ipucu: "Haritadan kendi mahallendekini bul, adını ve tabela kodunu buraya yaz.",
  },
  {
    id: "sehir-disi",
    etiket: "Şehir dışı irtibat kişisi (ad ve telefon)",
    ipucu:
      "Yerel hatlar kilitlenirken şehirlerarası arama bazen bağlanır. Herkes bu kişiyi arayıp durumunu bildirir.",
  },
  {
    id: "okul-is",
    etiket: "Okul ve iş yeri planı",
    ipucu:
      "Çocuk okuldan kime teslim edilir, iş yerinin tahliye noktası neresi — okulun afet planını sor.",
    cokSatir: true,
  },
  {
    id: "vana",
    etiket: "Gaz, su ve elektrik vanalarının yeri",
    ipucu: "Evdeki herkes bilmeli. Gerekiyorsa anahtarın nerede durduğunu da yaz.",
  },
  {
    id: "tibbi",
    etiket: "Tıbbi notlar",
    ipucu: "Kan grubu, alerji, sürekli ilaç, engel durumu — kime söylenmesi gerekiyorsa.",
    cokSatir: true,
  },
  {
    id: "hayvan-plan",
    etiket: "Evcil hayvan planı",
    ipucu: "Evde kimse yokken kim alacak, hangi barınağa/veterinere gidilecek.",
  },
];
