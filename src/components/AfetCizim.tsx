/**
 * AFET ÇİZİMLERİ — elle yazılmış inline SVG anlatım diyagramları.
 *
 * ── NEDEN BÖYLE ──
 *  • Çizim süs değil bilgi: "15 cm" yazısını okumayan da su düzeyinin
 *    dizin altında olduğunu görür. Panikte görsel metinden hızlı okunur.
 *  • Inline SVG → ek ağ isteği yok, çevrimdışı açılır, marka rengi elle
 *    tutulur (tasarım anayasası md.4: marka rengi kritik görselde AI gen yasak).
 *  • Çizim dili ISO 7010 tahliye piktogramı: acil durum talimatının
 *    uluslararası standardı. Bağlamı (masa, zemin, su düzlemi, duman
 *    katmanı) taşıdığı için "düz çizgi ikon" değil.
 *
 * ── RENK SÖZLÜĞÜ (her diyagramda aynı) ──
 *   insan  #dfe5ec   · doğru/güvenli #35c48a · yanlış/tehlike #ff5d5d
 *   yapı   #4a5563   · vurgu/ölçü    #05e1f5
 */
import Gorsel from "@/components/Gorsel";

const INSAN = "#dfe5ec";
const YAPI = "#4a5563";
const GUVENLI = "#35c48a";
const TEHLIKE = "#ff5d5d";
const OLCU = "#05e1f5";

/** Ortak figür kalınlığı — panelden panele değişmez, yoksa figür "başkası" olur. */
const KALIN = 7;

/* ══════════════════════════════════════════════════════════════════
   ÇÖK · KAPAN · TUTUN — üç panel
   ══════════════════════════════════════════════════════════════════ */

function Zemin() {
  return <path d="M6 100 H114" stroke={YAPI} strokeWidth="3" strokeLinecap="round" />;
}

/**
 * Masa: DOLU tabla + iki ayak. Tek çizgi tabla "havada duran çubuk" gibi
 * okunuyordu; gövdeli tabla masa olduğunu söylüyor. Güvenli örtü: yeşil.
 */
function Masa({ vurgulaAyak = false }: { vurgulaAyak?: boolean }) {
  return (
    <g>
      <rect x="20" y="50" width="80" height="7" rx="2.5" fill={GUVENLI} />
      <rect
        x="26"
        y="57"
        width={vurgulaAyak ? 7 : 5}
        height="43"
        rx="2"
        fill={vurgulaAyak ? GUVENLI : YAPI}
      />
      <rect x="89" y="57" width="5" height="43" rx="2" fill={YAPI} />
    </g>
  );
}

/**
 * Çömelmiş insan — yandan, sola bakıyor. Üç panelde AYNI figür kullanılır;
 * yalnız bağlam (masa) ve kolun yaptığı iş değişir. Farklı figür çizmek
 * "başka biri" hissi veriyordu.
 *
 * Gövde dolu şekillerle kuruldu: ince çizgi iskelet 78 px genişliğinde
 * okunmuyor, yumru gibi görünüyordu (ekran görüntüsüyle doğrulandı).
 */
function CokenFigur({
  y = 0,
  kolYolu,
  el,
}: {
  /** Dikey kaydırma: masanın altına girerken figür alçalır. */
  y?: number;
  /** Kolun izlediği yol — panelden panele değişen tek parça. */
  kolYolu: string;
  el?: { cx: number; cy: number };
}) {
  return (
    <g transform={`translate(0 ${y})`}>
      {/* Arka bacak (daha soluk: derinlik) */}
      <path
        d="M62 74 L48 92 L32 95"
        fill="none"
        stroke={INSAN}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* Ön bacak: kalça → diz (yerde) → ayak geride */}
      <path
        d="M64 74 L52 94 L34 97"
        fill="none"
        stroke={INSAN}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Gövde: omuzdan kalçaya, öne eğik ve KALIN */}
      <path
        d="M58 52 L65 76"
        stroke={INSAN}
        strokeWidth="15"
        strokeLinecap="round"
      />
      {/* Kol */}
      <path
        d={kolYolu}
        fill="none"
        stroke={INSAN}
        strokeWidth={KALIN}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Baş — gövdenin üstünde, hafif öne */}
      <circle cx="54" cy="42" r="11" fill={INSAN} />
      {el && <circle cx={el.cx} cy={el.cy} r="5" fill={GUVENLI} />}
    </g>
  );
}

export function CizimCokKapanTutun({ adim }: { adim: 1 | 2 | 3 }) {
  const etiket =
    adim === 1
      ? "Çök: diz üstü çökmüş, başını kollarıyla koruyan insan figürü"
      : adim === 2
        ? "Kapan: masanın altına girip baş ve boynunu kollarıyla örten insan figürü"
        : "Tutun: masanın altında, masanın ayağını tutan insan figürü";

  return (
    <svg viewBox="0 0 120 110" role="img" aria-label={etiket} className="h-auto w-full">
      <Zemin />
      {adim > 1 && <Masa vurgulaAyak={adim === 3} />}

      {/* 1 — ÇÖK: masa yok, kol başa doğru gidiyor */}
      {adim === 1 && (
        <CokenFigur kolYolu="M60 56 Q50 50 46 36" />
      )}

      {/* 2 — KAPAN: figür alçalıp masanın altına girer, kol ENSEYİ örter */}
      {adim === 2 && (
        <CokenFigur y={14} kolYolu="M60 56 Q46 48 42 40 Q50 32 60 34" />
      )}

      {/* 3 — TUTUN: aynı duruş, kol masanın AYAĞINA uzanır */}
      {adim === 3 && (
        <CokenFigur
          y={14}
          kolYolu="M60 56 L38 50"
          el={{ cx: 33, cy: 62 }}
        />
      )}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SU SEVİYESİ — 15 cm yayayı, 30 cm aracı götürür
   ══════════════════════════════════════════════════════════════════ */

export function CizimSuSeviyesi() {
  return (
    <svg
      viewBox="0 0 300 130"
      role="img"
      aria-label="Akan suda 15 santimetre bir yetişkini yerden keser, 30 santimetre bir otomobili sürükler"
      className="h-auto w-full"
    >
      {/* Yol */}
      <path d="M6 112 H294" stroke={YAPI} strokeWidth="3" strokeLinecap="round" />

      {/* ── Yaya ── */}
      <g>
        <circle cx="60" cy="34" r="9" fill={INSAN} />
        <path d="M60 44 V76" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M60 50 L46 62" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M60 50 L74 62" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M60 76 L50 110" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M60 76 L71 110" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
      </g>

      {/* ── Araç (yandan siluet) ──
       * ⚠️ Tekerlek yarıçapı ve merkezi yol çizgisine (y=112) OTURMALI:
       * önceki değerlerde (cy=110, r=6) tekerlekler yolun 4 piksel altına
       * taşıyordu ve araç asfaltın içine gömülmüş görünüyordu. */}
      {/* Araç sola yaslı: sağdaki boşluk ölçü etiketinin. Ortada dururken
          "30 cm" yazısı çatının üstüne biniyordu (ölçüldü: yazı 239–276,
          çatı 188–246). */}
      <g>
        <path
          d="M164 88 L170 70 H210 L222 88 Z"
          fill="none"
          stroke={INSAN}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M154 88 H238 a5 5 0 0 1 5 5 v9 H149 v-9 a5 5 0 0 1 5 -5 z"
          fill="none"
          stroke={INSAN}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="172" cy="104" r="7" fill="none" stroke={INSAN} strokeWidth="4" />
        <circle cx="220" cy="104" r="7" fill="none" stroke={INSAN} strokeWidth="4" />
      </g>

      {/* ── Su düzlemleri: yayada dizin altı, araçta tekerlek ortası ── */}
      <g>
        {/* 15 cm — yaya */}
        <path
          d="M14 98 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
          fill="none"
          stroke={TEHLIKE}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.95"
        />
        <rect x="14" y="98" width="112" height="14" fill={TEHLIKE} opacity="0.16" />
        {/* 30 cm — araç */}
        <path
          d="M140 92 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
          fill="none"
          stroke={TEHLIKE}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="140" y="92" width="152" height="20" fill={TEHLIKE} opacity="0.16" />
      </g>

      {/* ── Ölçü çizgileri ── */}
      <g stroke={OLCU} strokeWidth="1.6" fill="none">
        <path d="M96 98 V112" />
        <path d="M92 98 H100 M92 112 H100" />
        <path d="M262 92 V112" />
        <path d="M258 92 H266 M258 112 H266" />
      </g>
      <text x="104" y="106" fill={OLCU} fontSize="12" fontWeight="600">
        15 cm
      </text>
      {/* Ölçü çubuğunun sağında, aracın dışında. */}
      <text x="296" y="106" fill={OLCU} fontSize="12" fontWeight="600" textAnchor="end">
        30 cm
      </text>

      <text x="14" y="24" fill={INSAN} fontSize="12" fontWeight="600">
        Yetişkini yerden keser
      </text>
      <text x="162" y="24" fill={INSAN} fontSize="12" fontWeight="600">
        Otomobili sürükler
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DUMAN ALTINDA — temiz hava yere yakın
   ══════════════════════════════════════════════════════════════════ */

export function CizimDumanAltinda() {
  return (
    <svg
      viewBox="0 0 220 120"
      role="img"
      aria-label="Duman tavanda toplanır, temiz hava yere yakındır; eğilip sürünerek ilerleyen insan figürü"
      className="h-auto w-full"
    >
      {/* Tavan ve zemin */}
      <path d="M8 10 H212" stroke={YAPI} strokeWidth="3" strokeLinecap="round" />
      <path d="M8 110 H212" stroke={YAPI} strokeWidth="3" strokeLinecap="round" />

      {/* Duman katmanı — üstte, yoğun */}
      <g fill={TEHLIKE} opacity="0.2">
        <rect x="8" y="12" width="204" height="42" />
      </g>
      <path
        d="M8 54 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0"
        fill="none"
        stroke={TEHLIKE}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <text x="16" y="34" fill={TEHLIKE} fontSize="12" fontWeight="600">
        Duman ve sıcak hava yukarı toplanır
      </text>

      {/* Temiz hava bandı */}
      <text x="16" y="74" fill={GUVENLI} fontSize="12" fontWeight="600">
        Temiz hava yere yakın
      </text>

      {/* Sürünen figür */}
      <g>
        <circle cx="150" cy="92" r="8.5" fill={INSAN} />
        <path d="M158 96 L186 100" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M160 96 L152 108" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M182 100 L176 109" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
        <path d="M186 100 L196 108" stroke={INSAN} strokeWidth={KALIN} strokeLinecap="round" />
      </g>

      {/* Yön oku: çıkışa doğru */}
      <path
        d="M120 92 H96"
        stroke={GUVENLI}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M102 86 L96 92 L102 98"
        fill="none"
        stroke={GUVENLI}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AFET → DİYAGRAM eşlemesi
   Tek yerde: `/afet-ani` ve `/afet/<tür>` aynı bileşeni çağırır.
   Diyagramı olmayan afet için null döner — boş çerçeve çizilmez.
   ══════════════════════════════════════════════════════════════════ */

/**
 * ⛔ ELLE ÇİZİLEN FİGÜRLER YAYINDA DEĞİL (2026-08-07).
 *
 * Elle SVG ile insan figürü çizme denendi ve TUTMADI: gerçek ekran
 * görüntüsünde "çök-kapan-tutun" figürleri yumru gibi, sürünen figür köpeğe
 * benzer çıktı. Tasarım anayasası md.1 bu seviyeyi (oyuncak/düz-çizgi)
 * açıkça yasaklıyor.
 *
 * Yerlerine ChatGPT'de üretilen görseller kondu (`public/cizim/`, üretim
 * notları `NASIL.md`). Elle çizilen `CizimCokKapanTutun` ve
 * `CizimDumanAltinda` kodda duruyor ama ÇAĞRILMIYOR — aynı hataya tekrar
 * girilmesin diye karşılaştırma olarak bırakıldı.
 *
 * Nesne/şema çizimleri (araç + su seviyesi) elle SVG olarak KALDI: onlar
 * gerçek ekranda okunuyor ve ölçü çizgileri metinle hizalı duruyor.
 */

/** Görsel içinde yazı YOK; etiketler burada, çünkü seçilebilir ve çevrilebilir olmalı. */
const ADIM_ETIKETI = ["ÇÖK", "KAPAN", "TUTUN"] as const;
const ADIM_ALT = [
  "Diz üstü çök — sallanırken ayakta duran düşer",
  "Baş ve boynu kapat, masanın altına gir",
  "Masanın ayağını tut, kayarsa birlikte hareket et",
] as const;

export function AfetDiyagrami({ slug }: { slug: string }) {
  if (slug === "deprem") {
    return (
      <figure className="rounded-xl border border-cizgi bg-zemin-2 p-3">
        <Gorsel
          kaynak="/cizim/cok-kapan-tutun.png"
          alt="Üç adımda deprem anı: diz üstü çöküp başını kollarıyla koruyan, masanın altına giren ve masanın ayağını tutan bir kişi"
          width={1440}
          height={480}
          loading="eager"
          className="w-full rounded-lg"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((adim) => (
            <div key={adim}>
              <p className="text-sm font-semibold text-metin">
                {adim}. {ADIM_ETIKETI[adim - 1]}
              </p>
              <p className="mt-0.5 text-xs text-metin-3">{ADIM_ALT[adim - 1]}</p>
            </div>
          ))}
        </div>
        <figcaption className="mt-3 text-xs text-metin-3">
          Kaynak: AFAD tatbikat hareketi · USGS · FEMA. &ldquo;Hayat üçgeni&rdquo;
          değil.
        </figcaption>
      </figure>
    );
  }

  /* ⛔ Elle çizilen `CizimSuSeviyesi` KALDIRILDI (İlyas: "paintten çizilmiş
     gibi"). Yerine üretilen görsel; 15/30 cm ölçüsü artık altyazıda yazıyor
     çünkü görselin içine yazı koymuyoruz. */

  const gorsel = GORSELLER[slug];
  if (gorsel) {
    return (
      <figure className="rounded-xl border border-cizgi bg-zemin-2 p-3">
        <Gorsel
          kaynak={`/cizim/${gorsel.dosya}`}
          alt={gorsel.alt}
          width={1200}
          height={800}
          /* Diyagram sayfanın en üstünde, katlamanın üstünde duruyor:
             tembel yükleme burada gecikme yaratır, bilerek kapalı. */
          loading="eager"
          className="w-full rounded-lg"
        />
        <figcaption className="mt-3 text-xs text-metin-3">
          {gorsel.aciklama}
        </figcaption>
      </figure>
    );
  }

  return null;
}

/**
 * KART KAPAKLARI — `/afet-ani` ızgarasında kullanılır.
 *
 * Diyagram görselinin kendisi kapak olarak da kullanılıyor: ayrı kapak
 * üretmek hem 9 görsel daha demek hem de aynı sahneyi iki farklı çizimle
 * göstermek kafa karıştırır. Kart `object-cover` ile 3:2 kırpıyor.
 *
 * ⚠️ `sel` burada YOK: sel görseli henüz üretilmedi (P3). Kapağı olmayan
 * afet kartta ikonuyla görünür, boş çerçeve çizilmez.
 */
export const KAPAK_GORSELI: Record<string, string> = {
  deprem: "cok-kapan-tutun.png",
  "bina-yangini": "duman-altinda.png",
  "orman-yangini": "orman-yangini.png",
  sel: "sel.png",
  kbrn: "kbrn-iceride-kal.png",
  heyelan: "heyelan.png",
  cig: "cig.png",
  firtina: "firtina.png",
  "asiri-sicak": "asiri-sicak.png",
};

/**
 * Görselli afetler. Görsellerin İÇİNDE yazı yok — açıklama burada, çünkü
 * seçilebilir, aranabilir ve çevrilebilir olmalı.
 * Üretim notları: `public/cizim/NASIL.md`.
 */
const GORSELLER: Record<string, { dosya: string; alt: string; aciklama: string }> = {
  "bina-yangini": {
    dosya: "duman-altinda.png",
    alt: "Oda kesiti: duman tavanda kalın bir katman hâlinde toplanmış, temiz hava yere yakın; bir kişi dumanın altında emekleyerek çıkışa ilerliyor",
    aciklama:
      "Duman ve sıcak hava yukarı toplanır, temiz hava yere yakındır. Yangında ölümlerin büyük kısmı alevden değil duman solumaktan olur.",
  },
  sel: {
    dosya: "sel.png",
    alt: "Su basmış sokak: solda bir kişi baldır hizasındaki akan suda dengesini kaybediyor ve yeşil ok yüksek zemine çıkan merdiveni gösteriyor, sağda tekerlek üstü suda kalan otomobil yana sürükleniyor",
    aciklama:
      "Yaklaşık 15 cm akan su bir yetişkini yerden keser, 30 cm bir otomobili sürükler. Akıntı hızlandıkça bu derinlikler daha da azalır; suyun altındaki çökmüş asfaltı ve açılmış rögarı göremezsin.",
  },
  "orman-yangini": {
    dosya: "orman-yangini.png",
    alt: "Yamaç kesiti: alevler yokuş yukarı ilerlerken bir kişi yangının ilerleme yönüne dik olarak, aşağı ve yana doğru uzaklaşıyor",
    aciklama:
      "Yangın rüzgâr yönünde ve yokuş yukarı hızlanır. Alevin önünden değil, ilerleme hattına DİK yönde uzaklaşılır.",
  },
  kbrn: {
    dosya: "kbrn-iceride-kal.png",
    alt: "Ev kesiti: dışarıda bulut sürüklenirken pencere ve kapılar kapalı ve bantlanmış, havalandırma kapatılmış; bir kişi içeride penceresiz odada radyo dinliyor",
    aciklama:
      "İçeri gir, içeride kal, yetkiliyi dinle. Bina duvarı ciddi bir kalkandır; maruziyetin en yoğun olduğu ilk saatler içeride geçirilir.",
  },
  heyelan: {
    dosya: "heyelan.png",
    alt: "Dik yamaç kesiti: toprak ve kaya kütlesi aşağı kayarken bir kişi kayma hattına dik olarak yana kaçıyor",
    aciklama:
      "Kütlenin akış hattından ÇIK. Aşağı koşmak akışın önünde kalmak demektir; yana doğru birkaç on metre hayat kurtarır.",
  },
  cig: {
    dosya: "cig.png",
    alt: "Karlı yamaç: çığ aşağı inerken bir kişi çığ hattından yana çıkıp kalın bir ağaç gövdesine tutunuyor",
    aciklama:
      "Çığın akış hattından yana çık ve sağlam bir şeye tutun. Yüzeyde kalmak gömülmemek demektir.",
  },
  firtina: {
    dosya: "firtina.png",
    alt: "Bina kesiti: dışarıda rüzgâr ve uçan parçalar camı çatlatırken bir kişi en alt katta, penceresiz iç koridorda çömelmiş, başını kollarıyla korumuş",
    aciklama:
      "En alt kata ve penceresiz bir iç mekâna geç. Yaralanmaların çoğu kırılan camdan olur.",
  },
  "asiri-sicak": {
    dosya: "asiri-sicak.png",
    alt: "İki yarım: solda kapalı camlı park hâlindeki araç kırmızı uyarıyla işaretli, sağda panjurları kapalı serin iç mekânda bir kişi gölgede su içiyor",
    aciklama:
      "Kapalı araç içi gölgede bile hızla ölümcül seviyeye çıkar — çocuk ve hayvan iki dakika için bile bırakılmaz. Gündüz panjuru kapat, havalandırmayı gece yap.",
  },
};

/* ══════════════════════════════════════════════════════════════════
   AFET İKONLARI — kart başlıklarında, tür ayrımı için
   ══════════════════════════════════════════════════════════════════ */

const IKONLAR: Record<string, React.ReactNode> = {
  deprem: (
    <>
      <path d="M3 15 l4 -6 3 9 4 -13 3 10 4 -6" />
      <path d="M3 20 h18" opacity="0.5" />
    </>
  ),
  "bina-yangini": (
    <>
      <path d="M5 21 V9 l7 -5 7 5 v12" />
      <path d="M10 21 v-5 h4 v5" />
      <path d="M12 8.5 c1.6 1.4 2.4 2.6 2.4 3.8 a2.4 2.4 0 0 1 -4.8 0 c0 -1.2 .8 -2.4 2.4 -3.8 z" />
    </>
  ),
  "orman-yangini": (
    <>
      <path d="M12 3 c2.6 3 4 5.2 4 7.4 a4 4 0 0 1 -8 0 c0 -2.2 1.4 -4.4 4 -7.4 z" />
      <path d="M4 21 h16" />
      <path d="M7 21 c0 -3 1.5 -5 3 -6" opacity="0.6" />
      <path d="M17 21 c0 -3 -1.5 -5 -3 -6" opacity="0.6" />
    </>
  ),
  sel: (
    <>
      <path d="M3 11 q3 -2.5 6 0 t6 0 t6 0" />
      <path d="M3 16 q3 -2.5 6 0 t6 0 t6 0" />
      <path d="M3 21 q3 -2.5 6 0 t6 0 t6 0" />
      <path d="M8 6 l4 -3 4 3" opacity="0.6" />
    </>
  ),
  kbrn: (
    <>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3 a9 9 0 0 1 7.8 4.5 l-5.2 3 a3 3 0 0 0 -2.6 -1.5 z" />
      <path d="M4.2 16.5 a9 9 0 0 1 0 -9 l5.2 3 a3 3 0 0 0 0 3 z" />
      <path d="M19.8 16.5 a9 9 0 0 1 -7.8 4.5 v-6 a3 3 0 0 0 2.6 -1.5 z" />
    </>
  ),
  heyelan: (
    <>
      <path d="M3 20 L13 6 l8 14 z" />
      <circle cx="14" cy="16" r="1.6" />
      <circle cx="9" cy="18" r="1.2" />
      <circle cx="17" cy="18" r="1" />
    </>
  ),
  cig: (
    <>
      <path d="M4 20 L12 5 l8 15 z" />
      <path d="M12 5 L7.5 14 q5 3 9 0 z" opacity="0.55" />
    </>
  ),
  firtina: (
    <>
      <path d="M4 8 h12 a3 3 0 1 0 -3 -3" />
      <path d="M3 13 h15 a3 3 0 1 1 -3 3" />
      <path d="M5 18 h8" opacity="0.6" />
    </>
  ),
  "asiri-sicak": (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M5 5 l2 2 M17 17 l2 2 M19 5 l-2 2 M7 17 l-2 2" />
    </>
  ),
};

export function AfetIkonu({
  slug,
  boyut = 24,
  className,
}: {
  slug: string;
  boyut?: number;
  className?: string;
}) {
  const ikon = IKONLAR[slug];
  if (!ikon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={boyut}
      height={boyut}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {ikon}
    </svg>
  );
}
