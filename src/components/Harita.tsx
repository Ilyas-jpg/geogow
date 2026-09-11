"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapGL,
  Popup,
  type Map as HaritaTipi,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Alan } from "@/lib/alan";
import { depremRengi, depremYaricapi, type Deprem } from "@/lib/deprem";
import { TUR_BILGISI, type Nokta } from "@/lib/altyapi";
import { isiYaricapi, type Isi } from "@/lib/yangin";
import { sicaklikRengi, type IlSicakligi } from "@/lib/sicaklik";
import { NOKTA_YAKINLASMASI, type IlIsareti } from "@/lib/haritaAyar";

/**
 * ⚠️ maplibre-gl v6 KIRIK (vault dersi): harita tamamen boş kalıyor, hata da
 * vermiyor — `load` hiç ateşlenmiyor, tile isteği çıkmıyor. v5.24 kullanılıyor
 * ve v6'ya yükseltilmeyecek.
 *
 * v5'te varsayılan dışa aktarım YOK: `import { Map as MapGL }` şart.
 */

/**
 * Altlık: OpenFreeMap "bright" (OSM Bright) — vektör karo, anahtarsız,
 * limitsiz, ticari kullanım serbest. Google Haritalar diline en yakın açık
 * stil: sarı ana yollar, beyaz sokaklar, mavi su, yeşil park (2026-09-10'da
 * liberty / bright / positron yan yana render edilip seçildi; liberty ülke
 * görünümünde rölyefle karanlık, positron gri).
 *
 * 🔴 2026-09-10: CARTO Voyager'dan geçildi — CARTO'nun ücretsiz raster
 * karoları anahtar istemeye başlamış ve her karonun İÇİNE "API KEY REQUIRED"
 * filigranı basıyordu (z6 ve z14 karoları indirilip görüldü). Ürünün kapısı
 * üçüncü tarafın hata mesajını gösteriyordu.
 *
 * Host değişince üç yer birlikte değişir: burası · next.config.ts CSP
 * (img-src + connect-src) · public/sw.js karo önbelleği (ALTLIK_HOST).
 * Vektör karo ek gereksinim getirmez (MapLibre zaten WebGL istiyordu); tek
 * karo dört yakınlaşma seviyesine hizmet eder (z14 → z18 üst örnekleme), yani
 * çevrimdışı önbellek aynı sayıda dosyayla daha geniş alan tutar.
 *
 * Yazı tipi: stil Noto Sans (Regular/Bold) gliflerini sunuyor; bizim symbol
 * katmanları da onu ister. MapLibre'nin varsayılanı "Open Sans" bu hostta
 * yok — istenirse etiketler sessizce boş kalırdı.
 */
/**
 * 2026-09-11: "bright"tan "dark"a. İlyas yangin.algow.net'in haritasını
 * istedi ("oradaki şık haritayı istiyorum"): o site CARTO Dark Matter GL
 * kullanıyor; OpenFreeMap'in `dark` stili aynı Dark Matter'ın anahtarsız
 * portu (zemin rgb 12,12,12 · su rgb 27,27,29). 2026-08-14'teki "koyu
 * altlık izleme paneli gibi" kararı bununla geri alındı — o zamanki koyu
 * altlık raster `dark_all`dı ve etiketleri Türkçe değildi; asıl rahatsızlık
 * oydu. Site zemini (#0b0d10) ile harita artık tek dünya.
 */
const ALTLIK_STILI = "https://tiles.openfreemap.org/styles/dark";
const YAZI = ["Noto Sans Regular"];
const YAZI_KALIN = ["Noto Sans Bold"];

/** Koyu zeminde marka yeşili — sayı/desen üstüne KOYU yazılır (9:1). */
export const ALAN_YESILI = "#35c48a";
/** Seçili alan pini — marka turkuazı, yeşille karışmaz, koyu zeminde parlar. */
const SECILI_RENGI = "#05e1f5";
/** Google'ın konum mavisi: kullanıcı bu noktayı başka haritalardan tanıyor. */
const KONUM_MAVISI = "#1a73e8";
/** Koyu karo üstünde etiket rengi (yangın haritasıyla aynı açık gri). */
const ETIKET_RENGI = "#e7e7ea";
/** Etiket halosu — zemin rengi, yazı altlıktan ayrılsın. */
const HALO_RENGI = "#08090b";

/** Nokta üstünde gösterilen tek harf — renk TEK BAŞINA bilgi taşımasın diye. */
const TUR_HARFI: Record<Nokta["tur"], string> = { h: "H", i: "İ", s: "S" };

/**
 * Toplanma alanı pini — çalışma anında canvas'la çizilir (ağ isteği yok,
 * eşzamanlı: `addImage` katmanlardan ÖNCE bitmiş olur, "eksik görsel" yarışı
 * doğmaz). Baş kısımdaki motif AFAD toplanma tabelasındaki gibi merkeze
 * koşan dört ok + nokta — insan figürü BİLEREK yok (vault dersi: elle
 * çizilen figür anatomisi tutmuyor; geometri tutuyor).
 */
function pinCiz(renk: string, genislikCss: number): ImageData {
  const oran = 2; // retina
  const g = genislikCss * oran;
  const y = Math.round((genislikCss * 4 / 3) * oran);
  const tuval = document.createElement("canvas");
  tuval.width = g;
  tuval.height = y;
  const cizim = tuval.getContext("2d")!;

  // Klasik damla gövde: 24×36 tasarım ızgarasından ölçeklenir.
  const olcek = g / 26;
  cizim.setTransform(olcek, 0, 0, olcek, g / 2 - 12 * olcek, 1.2 * olcek);
  const govde = new Path2D(
    "M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"
  );
  cizim.fillStyle = renk;
  cizim.fill(govde);
  cizim.lineWidth = 1.7;
  cizim.strokeStyle = "#ffffff";
  cizim.stroke(govde);

  // Baş: beyaz disk + merkeze koşan dört ok + merkez nokta (toplanma motifi).
  cizim.beginPath();
  cizim.arc(12, 12, 7.6, 0, Math.PI * 2);
  cizim.fillStyle = "#ffffff";
  cizim.fill();

  cizim.fillStyle = renk;
  cizim.beginPath();
  cizim.arc(12, 12, 1.7, 0, Math.PI * 2);
  cizim.fill();
  for (let i = 0; i < 4; i++) {
    const aci = (Math.PI / 2) * i + Math.PI / 4;
    const yonX = Math.cos(aci);
    const yonY = Math.sin(aci);
    const dikX = -yonY;
    const dikY = yonX;
    // Uç merkeze 2,6 uzaklıkta, taban 6,1'de — ok içeri bakar.
    cizim.beginPath();
    cizim.moveTo(12 + yonX * 2.6, 12 + yonY * 2.6);
    cizim.lineTo(12 + yonX * 6.1 + dikX * 1.9, 12 + yonY * 6.1 + dikY * 1.9);
    cizim.lineTo(12 + yonX * 6.1 - dikX * 1.9, 12 + yonY * 6.1 - dikY * 1.9);
    cizim.closePath();
    cizim.fill();
  }

  cizim.setTransform(1, 0, 0, 1, 0, 0);
  return cizim.getImageData(0, 0, g, y);
}

/** Uygulama katmanının haritayı sürmesi için dar sözleşme. */
export type HaritaApi = {
  yaklas: () => void;
  uzaklas: () => void;
  git: (enlem: number, boylam: number, zoom?: number) => void;
};

export default function Harita({
  alanlar,
  depremler = [],
  altyapi = [],
  yanginlar = [],
  sicakliklar = [],
  ilIsaretleri = [],
  konum,
  secili,
  onSec,
  onGorunum,
  onIlSec,
  onHazir,
}: {
  alanlar: Alan[];
  depremler?: Deprem[];
  altyapi?: Nokta[];
  /** Uydu ısı noktaları — "yangın var" değil, termal anomali. */
  yanginlar?: Isi[];
  /** İl merkezi anlık sıcaklıkları (MGM). */
  sicakliklar?: IlSicakligi[];
  /** Düşük yakınlaşmada gösterilen il noktaları. */
  ilIsaretleri?: IlIsareti[];
  konum: { enlem: number; boylam: number } | null;
  secili: number | null;
  onSec: (id: number | null) => void;
  /** Harita durduğunda görünen alanı bildirir — hangi ilin indirileceğini belirler. */
  onGorunum?: (bilgi: {
    zoom: number;
    kutu: [number, number, number, number];
  }) => void;
  /** İl noktasına tıklanınca o ilin verisi insin. */
  onIlSec?: (plaka: number) => void;
  /** Harita kurulunca üst katmana kumanda verir (yakınlaş/uzaklaş/git). */
  onHazir?: (api: HaritaApi) => void;
}) {
  const kapRef = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<HaritaTipi | null>(null);
  const hazirRef = useRef(false);

  /* Geri çağrılar ref'te tutulur ve kurulum efekti bağımlılıksız çalışır.
     Aksi hâlde her render'da yeni bir fonksiyon kimliği haritayı YIKIP
     yeniden kuruyor; kullanıcının kaydırdığı konum ve inen karolar gidiyor. */
  const onSecRef = useRef(onSec);
  const onGorunumRef = useRef(onGorunum);
  const onIlSecRef = useRef(onIlSec);
  const onHazirRef = useRef(onHazir);
  useEffect(() => {
    onSecRef.current = onSec;
    onGorunumRef.current = onGorunum;
    onIlSecRef.current = onIlSec;
    onHazirRef.current = onHazir;
  });

  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const harita = new MapGL({
      container: kapRef.current,
      style: ALTLIK_STILI,
      center: [35.2, 39.0],
      zoom: 5.2,
      minZoom: 4,
      // ⚠️ maxBounds KOYULMAZ: dikey telefonda görünen enlem aralığı ~30°
      //   olur; dar bir sınır kutusu MapLibre'yi zorla yakınlaştırır ve
      //   İstanbul yine ekran dışında kalır (ölçüldü, 390 px'te z 4,8→5,9).
      //
      // Atıf kutusu kapalı: telefonda alt kart haritanın dibini örtüyor ve
      // MapLibre'nin köşe kutusu ARKADA kalıyordu. OSM/ODbL atfı görünür
      // olmak ZORUNDA — alt kartın dibinde kalıcı satır olarak veriliyor
      // (Uygulama.tsx), yani gizli değil, her durumda ekranda.
      attributionControl: false,
    });

    /**
     * Açılışta ülkeyi EKRANA SIĞDIR — sabit zoom kullanma.
     * Ölçüldü (420 px genişlik, zoom 5.2): İstanbul ekranın dışında kalıyordu.
     */
    harita.fitBounds(
      [
        [25.6, 35.8],
        [44.9, 42.2],
      ],
      // Üstte arama+çipler, altta kart var: ülke ARADAKİ pencerede ortalanır.
      // Simetrik 24 px kullanılınca Türkiye kartın arkasına sarkıyordu.
      { padding: { top: 130, right: 24, bottom: 250, left: 24 }, duration: 0 }
    );
    haritaRef.current = harita;

    /** Görünen alanı üst bileşene bildirir: hangi ilin verisi inecek. */
    const bildir = () => {
      const k = harita.getBounds();
      onGorunumRef.current?.({
        zoom: harita.getZoom(),
        kutu: [k.getWest(), k.getSouth(), k.getEast(), k.getNorth()],
      });
    };
    harita.on("moveend", bildir);

    // Yalnız geliştirmede: Playwright ile etiket/katman QA'sı için erişim.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __harita?: MapGL }).__harita = harita;
    }

    harita.on("load", () => {
      hazirRef.current = true;

      /* ── ALTLIK ETİKETLERİ TÜRKÇE (yangin.algow.net ile aynı kural) ──
       * Karo verisinin `name` alanı yerel dili veriyor: Kıbrıs'ta Yunanca
       * (Λευκωσία), ülke adında İngilizce ("Turkey"), Ege adalarında Yunanca,
       * Suriye'de Arapça. Her etiket önce `name:tr`, yoksa `name:latin`, en
       * sonda ham `name` — böylece Lefkoşa, Türkiye, Midilli, Halep yazar.
       * Dark Matter'ın yer adları koyu zeminde sönük (gri 101); açık metin +
       * halo ile okunur hale getirilir. Sokak adları dokunulmadan kalır. */
      const YER_ADI = ["coalesce", ["get", "name:tr"], ["get", "name:latin"], ["get", "name"]];
      for (const katman of harita.getStyle().layers) {
        if (katman.type !== "symbol") continue;
        const alan = harita.getLayoutProperty(katman.id, "text-field");
        if (!alan || !JSON.stringify(alan).includes("name")) continue;
        harita.setLayoutProperty(katman.id, "text-field", YER_ADI);
        if (katman.id.startsWith("place_")) {
          harita.setPaintProperty(katman.id, "text-color", "#e7e7ea");
          harita.setPaintProperty(katman.id, "text-halo-color", HALO_RENGI);
          harita.setPaintProperty(katman.id, "text-halo-width", 1.4);
          harita.setPaintProperty(katman.id, "text-halo-blur", 0.4);
        } else if (katman.id === "water_name") {
          // Deniz adları stilde siyah (%70) — koyu suda görünmüyordu.
          harita.setPaintProperty(katman.id, "text-color", "#6f7a88");
          harita.setPaintProperty(katman.id, "text-halo-width", 0);
        }
      }
      // Altlığın il sınırı katmanı eksik ve kopuk; sınırlar aşağıda kendi
      // verimizden çizilir, altlığınki kapatılır (yangın haritasındaki ders).
      if (harita.getLayer("boundary_state")) {
        harita.setLayoutProperty("boundary_state", "visibility", "none");
      }
      // Komşu ülkelerin bölge/eyalet etiketleri (Attika, Halep İli, Kürdistan
      // Bölgesel Yönetimi…) Türkiye haritasında gürültü: ülke görünümünde
      // il noktalarıyla yarışıyordu. Türkiye'nin illeri bu katmanda zaten
      // yazmıyor (altlık onları şehir olarak etiketler), kapatmak kayıpsız.
      if (harita.getLayer("place_state")) {
        harita.setLayoutProperty("place_state", "visibility", "none");
      }
      // Sınır çizgileri yer adlarının ALTINA girer; ilk symbol katmanı sınırdır.
      const ilkEtiket = harita.getStyle().layers.find((k) => k.type === "symbol")?.id;

      /* ── İL SINIRLARI + KKTC SINIRI (Natural Earth 10m, kamu malı, 121 KB) ──
       * yangin.algow.net ile aynı dosya. İlk kare için gerekmediğinden harita
       * oturduktan sonra boşta yüklenir. `?v=` servis çalışanı önbelleği için:
       * dosya değişirse sürüm artmalı, yoksa kullanıcı eskisini görür. */
      const sinirlariYukle = () => {
        if (harita.getSource("sinirlar")) return;
        harita.addSource("sinirlar", { type: "geojson", data: "/tr-iller.json?v=1" });
        harita.addLayer(
          {
            id: "il-sinir",
            type: "line",
            source: "sinirlar",
            filter: ["!=", ["get", "tur"], "kktc"],
            paint: {
              "line-color": "#5b6472",
              "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 8, 0.9, 11, 1.3],
              "line-opacity": ["interpolate", ["linear"], ["zoom"], 4.5, 0, 5.5, 0.5, 9, 0.7],
              "line-dasharray": [3, 2.5],
            },
          },
          ilkEtiket
        );
        // KKTC kara sınırı il sınırından farklı bir şeydir: daha belirgin ve
        // düşük zoom'dan itibaren görünür. Kaynak: Natural Earth
        // "Northern Cyprus" harita birimi.
        harita.addLayer(
          {
            id: "kktc-sinir",
            type: "line",
            source: "sinirlar",
            filter: ["==", ["get", "tur"], "kktc"],
            paint: {
              "line-color": "#8b94a3",
              "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.9, 9, 1.6],
              "line-opacity": 0.85,
              "line-dasharray": [2.5, 1.8],
            },
          },
          ilkEtiket
        );
      };
      const bosta = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback;
      if (bosta) bosta(sinirlariYukle);
      else setTimeout(sinirlariYukle, 1200);

      // Pinler eşzamanlı çizilir — katmanlar kurulmadan hazır olurlar.
      harita.addImage("pin-alan", pinCiz(ALAN_YESILI, 30), { pixelRatio: 2 });
      harita.addImage("pin-secili", pinCiz(SECILI_RENGI, 40), { pixelRatio: 2 });

      /* ── Toplanma alanları: KÜMELİ kaynak ──
       * Binlerce nokta tek tek çizilince okunmaz bir leke oluyordu (İlyas:
       * "her yer yeşil daire"). Küme sayısı yazıyla verilir, yaklaşınca
       * gerçek pinlere açılır — Google Haritalar'ın bilinen davranışı. */
      harita.addSource("alanlar", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 14,
      });

      /* ── Depremler: toplanma alanlarının ALTINDA çizilir ──
       * Bu ürünün birincil bilgisi "nereye gideceğim"; deprem bağlamdır. */
      harita.addSource("depremler", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "deprem-halka",
        type: "circle",
        source: "depremler",
        paint: {
          "circle-radius": ["get", "yaricap"],
          "circle-color": ["get", "renk"],
          "circle-opacity": 0.22,
          "circle-stroke-width": 1.6,
          "circle-stroke-color": ["get", "renk"],
          "circle-stroke-opacity": 0.9,
        },
      });
      harita.addLayer({
        id: "deprem-etiket",
        type: "symbol",
        source: "depremler",
        // 🐛 Önceki minzoom 5'ti; telefonun ülke görünümü ~4,3'te kalıyor ve
        // etiketler HİÇ görünmüyordu — "katman açtım, bir şey yok" şikayeti.
        minzoom: 4,
        layout: {
          "text-field": ["get", "etiket"],
          "text-font": YAZI,
          "text-size": 11,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": ETIKET_RENGI,
          "text-halo-color": HALO_RENGI,
          "text-halo-width": 1.4,
        },
      });

      /* ── Uydu ısı noktaları (yangın katmanı) ── */
      harita.addSource("yangin", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "yangin-nokta",
        type: "circle",
        source: "yangin",
        paint: {
          "circle-radius": ["get", "yaricap"],
          "circle-color": "#ff6a00",
          // Güven düşükse nokta daha sönük: veri belirsizliği görünür olsun.
          "circle-opacity": ["get", "saydamlik"],
          "circle-blur": 0.35,
          "circle-stroke-width": 0.8,
          "circle-stroke-color": "#c24f00",
        },
      });

      /* ── Sıcaklık (il merkezi ölçümü) — sayı asıl bilgi, renk yardımcı ── */
      harita.addSource("sicaklik", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "sicaklik-nokta",
        type: "circle",
        source: "sicaklik",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 11, 8, 16, 12, 20],
          "circle-color": ["get", "renk"],
          "circle-opacity": 0.92,
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "#ffffff",
        },
      });
      harita.addLayer({
        id: "sicaklik-yazi",
        type: "symbol",
        source: "sicaklik",
        layout: {
          "text-field": ["get", "etiket"],
          "text-font": YAZI_KALIN,
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 12, 12, 14],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        // Skalanın tamamı açık ton; koyu yazı hepsinde okunur.
        paint: { "text-color": "#0b0d10" },
      });

      /* ── Acil altyapı (hastane · itfaiye · sağlık merkezi) ── */
      harita.addSource("altyapi", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "altyapi-nokta",
        type: "circle",
        source: "altyapi",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 12, 8, 16, 12],
          "circle-color": ["get", "renk"],
          "circle-stroke-width": 1.6,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });
      harita.addLayer({
        id: "altyapi-harf",
        type: "symbol",
        source: "altyapi",
        minzoom: 10,
        layout: {
          // Marka anayasası §2: renk tek başına bilgi taşımaz. Her nokta
          // türünü harfle de söyler (H hastane · İ itfaiye · S sağlık).
          "text-field": ["get", "harf"],
          "text-font": YAZI_KALIN,
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 16, 13],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        // Üç tür rengi de açık tonda; koyu yazı hepsinde okunur.
        paint: { "text-color": "#0b0d10" },
      });
      harita.addLayer({
        id: "altyapi-etiket",
        type: "symbol",
        source: "altyapi",
        minzoom: 14,
        layout: {
          "text-field": ["get", "ad"],
          "text-font": YAZI,
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-max-width": 11,
        },
        paint: {
          "text-color": "#c9d1db",
          "text-halo-color": HALO_RENGI,
          "text-halo-width": 1.4,
        },
      });

      /* Dokunmatikte etiket okunmuyor: noktaya basınca ad ve tür yazılır. */
      const balon = new Popup({ closeButton: true, closeOnClick: true, maxWidth: "260px" });
      harita.on("click", "altyapi-nokta", (olay) => {
        const o = olay.features?.[0]?.properties;
        if (!o) return;
        balon
          .setLngLat(olay.lngLat)
          .setHTML(
            `<div style="font:14px/1.35 system-ui;color:#0b0d10">
               <strong>${String(o.ad ?? "").replace(/[<>&]/g, "")}</strong><br>
               <span style="color:#4a5260">${String(o.turAdi ?? "")} · OpenStreetMap</span>
             </div>`
          )
          .addTo(harita);
      });

      /* ── Toplanma alanı katmanları (kaynak yukarıda kuruldu) ── */
      harita.addLayer({
        id: "alan-kume",
        type: "circle",
        source: "alanlar",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ALAN_YESILI,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            25, 18,
            100, 22,
            500, 27,
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      harita.addLayer({
        id: "alan-kume-sayi",
        type: "symbol",
        source: "alanlar",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": YAZI_KALIN,
          "text-size": 13,
          "text-allow-overlap": true,
        },
        // Parlak yeşil üstünde koyu sayı (9:1); beyaz 1,9:1 kalıyordu.
        paint: { "text-color": "#0b0d10" },
      });
      harita.addLayer({
        id: "alan-pin",
        type: "symbol",
        source: "alanlar",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "pin-alan",
          "icon-anchor": "bottom",
          // Kapanan pin "yok" sanılır — pinler her zaman çizilir, yoğunluğu
          // zaten kümeleme çözüyor.
          "icon-allow-overlap": true,
        },
      });
      harita.addLayer({
        id: "alan-etiket",
        type: "symbol",
        source: "alanlar",
        filter: ["!", ["has", "point_count"]],
        minzoom: 13,
        layout: {
          "text-field": ["get", "ad"],
          "text-font": YAZI,
          "text-size": 12,
          "text-offset": [0, 0.4],
          "text-anchor": "top",
          "text-max-width": 12,
        },
        paint: {
          "text-color": ETIKET_RENGI,
          "text-halo-color": HALO_RENGI,
          "text-halo-width": 1.6,
        },
      });

      /* Seçili alan AYRI kaynaktan büyük pinle çizilir. Kümeli kaynakta
         feature-state kimlikleri kümelenince kayboluyor; ayrı kaynak hem
         bundan bağımsız hem de pin her zaman en üstte kalıyor. */
      harita.addSource("secili-alan", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "secili-pin",
        type: "symbol",
        source: "secili-alan",
        layout: {
          "icon-image": "pin-secili",
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "text-field": ["get", "ad"],
          "text-font": YAZI_KALIN,
          "text-size": 13,
          "text-offset": [0, 0.5],
          "text-anchor": "top",
          "text-max-width": 12,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": SECILI_RENGI,
          "text-halo-color": HALO_RENGI,
          "text-halo-width": 1.8,
        },
      });

      /* ── İl noktaları: ülke görünümünde KÜÇÜK işaret ──
       * Eski sürümde alan sayısına göre büyüyen yarı saydam halkalar vardı;
       * 68 il yayına girince ülke "üst üste binmiş yeşil balon" oldu (İlyas:
       * "her yer yeşil daire, başka bir şey yok"). Artık: küçük nokta,
       * il adı yalnız yakınlaşınca. Alan sayısı aramada ve il kartında yazar. */
      harita.addSource("iller", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "il-nokta",
        type: "circle",
        source: "iller",
        maxzoom: NOKTA_YAKINLASMASI,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3.5, 8, 6],
          "circle-color": ALAN_YESILI,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      /* Görünmez geniş vuruş alanı: 4 px'lik noktaya parmakla basılamaz. */
      harita.addLayer({
        id: "il-vurus",
        type: "circle",
        source: "iller",
        maxzoom: NOKTA_YAKINLASMASI,
        paint: { "circle-radius": 14, "circle-opacity": 0 },
      });
      /* İl adı katmanı ("il-etiket") 2026-09-11'de KALDIRILDI: koyu altlık
         Türkçe şehir adlarını zaten yazıyor, bizimki aynı adı yeşil ikinci
         kez basıyordu ("ÇANAKKALE" + "Çanakkale"). Nokta kaldı: yeşil =
         yayında; ad altlıktan gelir, il kartı tıklayınca açılır. */

      /* ── Kullanıcı konumu: tanıdık mavi nokta + yumuşak hale ── */
      harita.addSource("konum", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "konum-hale",
        type: "circle",
        source: "konum",
        paint: {
          "circle-radius": 18,
          "circle-color": KONUM_MAVISI,
          "circle-opacity": 0.15,
        },
      });
      harita.addLayer({
        id: "konum-nokta",
        type: "circle",
        source: "konum",
        paint: {
          "circle-radius": 7,
          "circle-color": KONUM_MAVISI,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      /* ── Etkileşim ── */
      harita.on("click", "alan-pin", (olay) => {
        const id = olay.features?.[0]?.properties?.id;
        if (typeof id === "number") onSecRef.current(id);
      });
      harita.on("click", "alan-kume", (olay) => {
        const oge = olay.features?.[0];
        const kumeId = oge?.properties?.cluster_id;
        if (typeof kumeId !== "number" || oge?.geometry.type !== "Point") return;
        const merkez = oge.geometry.coordinates as [number, number];
        const kaynak = harita.getSource("alanlar") as GeoJSONSource;
        kaynak
          .getClusterExpansionZoom(kumeId)
          .then((z) => harita.easeTo({ center: merkez, zoom: z + 0.2, duration: 500 }))
          .catch(() => harita.easeTo({ center: merkez, zoom: harita.getZoom() + 2, duration: 500 }));
      });
      harita.on("click", "il-vurus", (olay) => {
        const oge = olay.features?.[0];
        if (!oge) return;
        const plaka = oge.properties?.plaka;
        if (typeof plaka !== "number") return;
        onIlSecRef.current?.(plaka);
        // Noktaya basmak o ile yakınlaştırır: nokta eşiğinin hemen üstüne
        // çıkılır ki gerçek toplanma alanları aynı hareketle görünsün.
        if (oge.geometry.type === "Point") {
          harita.easeTo({
            center: oge.geometry.coordinates as [number, number],
            zoom: NOKTA_YAKINLASMASI + 0.6,
            duration: 700,
          });
        }
      });
      // Boş zemine basmak seçimi kapatır (Google davranışı).
      harita.on("click", (olay) => {
        const vurulan = harita.queryRenderedFeatures(olay.point, {
          layers: ["alan-pin", "alan-kume", "il-vurus", "altyapi-nokta", "secili-pin"],
        });
        if (!vurulan.length) onSecRef.current(null);
      });

      for (const katman of ["alan-pin", "alan-kume", "il-vurus", "altyapi-nokta"]) {
        harita.on("mouseenter", katman, () => {
          harita.getCanvas().style.cursor = "pointer";
        });
        harita.on("mouseleave", katman, () => {
          harita.getCanvas().style.cursor = "";
        });
      }

      onHazirRef.current?.({
        yaklas: () => harita.zoomIn({ duration: 250 }),
        uzaklas: () => harita.zoomOut({ duration: 250 }),
        git: (enlem, boylam, zoom) =>
          harita.easeTo({
            center: [boylam, enlem],
            zoom: zoom ?? Math.max(harita.getZoom(), NOKTA_YAKINLASMASI + 0.6),
            // Alt kart haritanın dibini örtüyor; hedef görünür pencerede kalsın.
            offset: [0, -60],
            duration: 650,
          }),
      });

      bildir();
    });

    return () => {
      harita.remove();
      haritaRef.current = null;
      hazirRef.current = false;
    };
  }, []);

  // Alanlar değişince kaynağı güncelle
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const uygula = () => {
      const kaynak = harita.getSource("alanlar");
      if (!kaynak || !("setData" in kaynak)) return;
      (kaynak as { setData: (v: unknown) => void }).setData({
        type: "FeatureCollection",
        features: alanlar.map((a) => ({
          type: "Feature",
          id: a.id,
          geometry: { type: "Point", coordinates: [a.boylam, a.enlem] },
          properties: { id: a.id, ad: a.ad },
        })),
      });
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [alanlar]);

  // Depremler değişince kaynağı güncelle
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const uygula = () => {
      const kaynak = harita.getSource("depremler");
      if (!kaynak || !("setData" in kaynak)) return;
      (kaynak as { setData: (v: unknown) => void }).setData({
        type: "FeatureCollection",
        features: depremler.map((d) => ({
          type: "Feature",
          id: d.id,
          geometry: { type: "Point", coordinates: [d.boylam, d.enlem] },
          properties: {
            id: d.id,
            yaricap: depremYaricapi(d.buyukluk),
            renk: depremRengi(d.buyukluk),
            // Büyüklük virgüllü yazılır; "M 4.2" değil "M 4,2".
            // Yıldız = bu depremi yalnız Kandilli bildirdi (durum satırında açıklanıyor).
            etiket:
              `M ${d.buyukluk.toFixed(1).replace(".", ",")}` +
              (d.kaynak === "KOERI" ? "*" : ""),
          },
        })),
      });
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [depremler]);

  // Acil altyapı değişince kaynağı güncelle
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const uygula = () => {
      const kaynak = harita.getSource("altyapi");
      if (!kaynak || !("setData" in kaynak)) return;
      (kaynak as { setData: (v: unknown) => void }).setData({
        type: "FeatureCollection",
        features: altyapi.map((n, sira) => ({
          type: "Feature",
          id: sira,
          geometry: { type: "Point", coordinates: [n.boylam, n.enlem] },
          properties: {
            ad: n.ad,
            harf: TUR_HARFI[n.tur],
            renk: TUR_BILGISI[n.tur].renk,
            turAdi: TUR_BILGISI[n.tur].ad,
          },
        })),
      });
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [altyapi]);

  // Uydu ısı noktaları değişince kaynağı güncelle
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const uygula = () => {
      const kaynak = harita.getSource("yangin");
      if (!kaynak || !("setData" in kaynak)) return;
      (kaynak as { setData: (v: unknown) => void }).setData({
        type: "FeatureCollection",
        features: yanginlar.map((n, sira) => ({
          type: "Feature",
          id: sira,
          geometry: { type: "Point", coordinates: n.k },
          properties: {
            yaricap: isiYaricapi(n.guc),
            saydamlik: n.guven === "l" ? 0.4 : n.guven === "h" ? 0.85 : 0.65,
          },
        })),
      });
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [yanginlar]);

  // İl sıcaklıkları değişince kaynağı güncelle
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const uygula = () => {
      const kaynak = harita.getSource("sicaklik");
      if (!kaynak || !("setData" in kaynak)) return;
      (kaynak as { setData: (v: unknown) => void }).setData({
        type: "FeatureCollection",
        features: sicakliklar.map((s) => ({
          type: "Feature",
          id: s.plaka,
          geometry: { type: "Point", coordinates: [s.boylam, s.enlem] },
          properties: {
            etiket: `${Math.round(s.sicaklik)}°`,
            renk: sicaklikRengi(s.sicaklik),
          },
        })),
      });
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [sicakliklar]);

  // İl noktaları değişince kaynağı güncelle
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;
    const uygula = () => {
      const kaynak = harita.getSource("iller");
      if (!kaynak || !("setData" in kaynak)) return;
      (kaynak as { setData: (v: unknown) => void }).setData({
        type: "FeatureCollection",
        features: ilIsaretleri.map((il) => ({
          type: "Feature",
          id: il.plaka,
          geometry: { type: "Point", coordinates: [il.merkez[1], il.merkez[0]] },
          properties: { plaka: il.plaka, il: il.il },
        })),
      });
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [ilIsaretleri]);

  // Konum değişince noktayı taşı ve ilk seferde oraya uç
  const ucusYapildi = useRef(false);
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita || !konum) return;
    const uygula = () => {
      const kaynak = harita.getSource("konum");
      if (kaynak && "setData" in kaynak) {
        (kaynak as { setData: (v: unknown) => void }).setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [konum.boylam, konum.enlem] },
              properties: {},
            },
          ],
        });
      }
      if (!ucusYapildi.current) {
        ucusYapildi.current = true;
        harita.easeTo({
          center: [konum.boylam, konum.enlem],
          zoom: 14,
          // "En yakın 3" kartı altta açılır — mavi nokta onun arkasında kalmasın.
          offset: [0, -110],
          duration: 800,
        });
      }
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [konum]);

  // Seçim değişince büyük pini taşı ve alanı görünür yap.
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita || !hazirRef.current) return;
    const kaynak = harita.getSource("secili-alan");
    if (!kaynak || !("setData" in kaynak)) return;
    const hedef = secili == null ? null : alanlar.find((a) => a.id === secili) ?? null;
    (kaynak as { setData: (v: unknown) => void }).setData({
      type: "FeatureCollection",
      features: hedef
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [hedef.boylam, hedef.enlem] },
              properties: { ad: hedef.ad },
            },
          ]
        : [],
    });
    if (hedef) {
      harita.easeTo({
        center: [hedef.boylam, hedef.enlem],
        zoom: Math.max(harita.getZoom(), 15),
        // Alt kart pinin üstüne binmesin: merkez hafif yukarı alınır.
        offset: [0, -70],
        duration: 600,
      });
    }
  }, [secili, alanlar]);

  return <div ref={kapRef} className="h-full w-full" aria-label="Toplanma alanları haritası" />;
}
