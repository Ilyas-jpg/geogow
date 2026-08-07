"use client";

import { useEffect, useRef } from "react";
import { Map as MapGL, Popup, type Map as HaritaTipi } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Alan } from "@/lib/alan";
import { depremRengi, depremYaricapi, type Deprem } from "@/lib/deprem";
import { TUR_BILGISI, type Nokta } from "@/lib/altyapi";
import { NOKTA_YAKINLASMASI, type IlIsareti } from "@/lib/haritaAyar";

/**
 * ⚠️ maplibre-gl v6 KIRIK (vault dersi): harita tamamen boş kalıyor, hata da
 * vermiyor — `load` hiç ateşlenmiyor, tile isteği çıkmıyor. v5.24 kullanılıyor
 * ve v6'ya yükseltilmeyecek.
 *
 * v5'te varsayılan dışa aktarım YOK: `import { Map as MapGL }` şart.
 */

/**
 * 🐛 İlk yazımda URL'de `{r}` vardı (Leaflet'in retina yer tutucusu).
 * MapLibre bunu ÇÖZMEZ, ham metin olarak isteğe koyar ve her karo 404 döner —
 * harita bomboş kalır. Gerçek pikselde görüldü, konsolda 89 hata vardı.
 * MapLibre'de retina için ayrı `@2x` URL'i verilir; 256'lık düz karo yeterli.
 */
const ALTLIK = "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

/** Nokta üstünde gösterilen tek harf — renk TEK BAŞINA bilgi taşımasın diye. */
const TUR_HARFI: Record<Nokta["tur"], string> = { h: "H", i: "İ", s: "S" };

export default function Harita({
  alanlar,
  depremler = [],
  altyapi = [],
  ilIsaretleri = [],
  konum,
  secili,
  onSec,
  onGorunum,
  onIlSec,
}: {
  alanlar: Alan[];
  depremler?: Deprem[];
  altyapi?: Nokta[];
  /** Düşük yakınlaşmada gösterilen il rozetleri. */
  ilIsaretleri?: IlIsareti[];
  konum: { enlem: number; boylam: number } | null;
  secili: number | null;
  onSec: (id: number) => void;
  /** Harita durduğunda görünen alanı bildirir — hangi ilin indirileceğini belirler. */
  onGorunum?: (bilgi: {
    zoom: number;
    kutu: [number, number, number, number];
  }) => void;
  /** İl rozetine tıklanınca o ile yakınlaş. */
  onIlSec?: (plaka: number) => void;
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
  useEffect(() => {
    onSecRef.current = onSec;
    onGorunumRef.current = onGorunum;
    onIlSecRef.current = onIlSec;
  });

  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const harita = new MapGL({
      container: kapRef.current,
      style: {
        version: 8,
        sources: {
          altlik: {
            type: "raster",
            tiles: [ALTLIK],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OSM</a> katkıcıları · © <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          { id: "zemin", type: "background", paint: { "background-color": "#0b0d10" } },
          { id: "altlik", type: "raster", source: "altlik" },
        ],
      },
      center: [35.2, 39.0],
      zoom: 5.2,
      attributionControl: { compact: true },
    });

    /**
     * Açılışta ülkeyi EKRANA SIĞDIR — sabit zoom kullanma.
     *
     * Ölçüldü (420 px genişlik, zoom 5.2): görünen boylam aralığı ~8° oluyor
     * ve İstanbul (29°D) ekranın dışında kalıyordu. Yani telefonda açan
     * kullanıcı en büyük veri setinin (3.158 alan) rozetini hiç görmüyordu.
     * `fitBounds` genişliğe göre kendisi ölçekliyor.
     */
    harita.fitBounds(
      [
        [25.6, 35.8],
        [44.9, 42.2],
      ],
      { padding: 24, duration: 0 }
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

    harita.on("load", () => {
      hazirRef.current = true;
      harita.addSource("alanlar", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "alan-nokta",
        type: "circle",
        source: "alanlar",
        paint: {
          // Yarıçap ÖLÇEKTEN türetiliyor, başka katmandan kopyalanmıyor
          // (vault dersi: kopyalanan çarpan daireleri 4 kat şişirmişti).
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 12, 7, 16, 11],
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "secili"], false],
            "#4c7dff",
            "#35c48a",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0b0d10",
          "circle-opacity": 0.9,
        },
      });
      harita.addLayer({
        id: "alan-etiket",
        type: "symbol",
        source: "alanlar",
        minzoom: 13,
        layout: {
          "text-field": ["get", "ad"],
          "text-size": 12,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-max-width": 12,
        },
        paint: {
          "text-color": "#f2f4f7",
          "text-halo-color": "#0b0d10",
          "text-halo-width": 1.4,
        },
      });
      /* ── Depremler: toplanma alanlarının ALTINDA çizilir ──
       * Sıralama bilinçli: bu ürünün birincil bilgisi "nereye gideceğim",
       * deprem noktaları bağlamdır. Üste alınırsa alanları örter. */
      harita.addSource("depremler", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer(
        {
          id: "deprem-halka",
          type: "circle",
          source: "depremler",
          paint: {
            "circle-radius": ["get", "yaricap"],
            "circle-color": ["get", "renk"],
            "circle-opacity": 0.18,
            "circle-stroke-width": 1.2,
            "circle-stroke-color": ["get", "renk"],
            "circle-stroke-opacity": 0.75,
          },
        },
        "alan-nokta"
      );
      harita.addLayer(
        {
          id: "deprem-etiket",
          type: "symbol",
          source: "depremler",
          minzoom: 5,
          layout: {
            "text-field": ["get", "etiket"],
            "text-size": 11,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#f2f4f7",
            "text-halo-color": "#0b0d10",
            "text-halo-width": 1.2,
          },
        },
        "alan-nokta"
      );

      /* ── Acil altyapı (hastane · itfaiye · sağlık merkezi) ──
       * Toplanma alanlarının ALTINDA: bu ürünün birincil cevabı hâlâ
       * "nereye gideceğim". Altyapı destekleyici bağlamdır. */
      harita.addSource("altyapi", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer(
        {
          id: "altyapi-nokta",
          type: "circle",
          source: "altyapi",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 12, 8, 16, 12],
            "circle-color": ["get", "renk"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0b0d10",
            "circle-opacity": 0.92,
          },
        },
        "alan-nokta"
      );
      harita.addLayer(
        {
          id: "altyapi-harf",
          type: "symbol",
          source: "altyapi",
          minzoom: 10,
          layout: {
            // Marka anayasası §2: renk tek başına bilgi taşımaz. Her nokta
            // türünü harfle de söyler (H hastane · İ itfaiye · S sağlık).
            "text-field": ["get", "harf"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 16, 13],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            // Üç tür rengi de açık tonda; koyu yazı hepsinde okunur
            // (beyaz yazı #009db4 üzerinde 3,4:1 ile eşiğin altında kalıyor).
            "text-color": "#0b0d10",
          },
        },
        "alan-nokta"
      );
      harita.addLayer(
        {
          id: "altyapi-etiket",
          type: "symbol",
          source: "altyapi",
          minzoom: 14,
          layout: {
            "text-field": ["get", "ad"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-max-width": 11,
          },
          paint: {
            "text-color": "#b8c0cc",
            "text-halo-color": "#0b0d10",
            "text-halo-width": 1.4,
          },
        },
        "alan-nokta"
      );

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
      harita.on("mouseenter", "altyapi-nokta", () => {
        harita.getCanvas().style.cursor = "pointer";
      });
      harita.on("mouseleave", "altyapi-nokta", () => {
        harita.getCanvas().style.cursor = "";
      });

      /* ── İl rozetleri: ülke görünümünde harita BOŞ KALMAZ ──
       * Ziyaretçi hiçbir izin vermeden nerede veri olduğunu görür; asıl
       * noktalar yakınlaşınca iner. Önceki sürümde harita açılışta bomboştu
       * ve kullanıcı konum iznini vermeden hiçbir şey göremiyordu. */
      harita.addSource("iller", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "il-halka",
        type: "circle",
        source: "iller",
        maxzoom: NOKTA_YAKINLASMASI,
        paint: {
          // Yarıçap alan sayısına göre: büyük il görsel olarak da büyük.
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "alan"],
            0, 14,
            3200, 30,
          ],
          "circle-color": "#35c48a",
          "circle-opacity": 0.16,
          "circle-stroke-width": 1.6,
          "circle-stroke-color": "#35c48a",
          "circle-stroke-opacity": 0.7,
        },
      });
      harita.addLayer({
        id: "il-etiket",
        type: "symbol",
        source: "iller",
        maxzoom: NOKTA_YAKINLASMASI,
        layout: {
          "text-field": ["get", "etiket"],
          "text-size": 12,
          "text-line-height": 1.2,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#f2f4f7",
          "text-halo-color": "#0b0d10",
          "text-halo-width": 1.6,
        },
      });
      harita.on("click", "il-halka", (olay) => {
        const oge = olay.features?.[0];
        if (!oge) return;
        const plaka = oge.properties?.plaka;
        if (typeof plaka !== "number") return;
        onIlSecRef.current?.(plaka);
        // Rozete basmak o ile yakınlaştırır: nokta eşiğinin hemen üstüne
        // çıkılır ki gerçek toplanma alanları aynı hareketle görünsün.
        if (oge.geometry.type === "Point") {
          harita.easeTo({
            center: oge.geometry.coordinates as [number, number],
            zoom: NOKTA_YAKINLASMASI + 0.6,
            duration: 700,
          });
        }
      });
      harita.on("mouseenter", "il-halka", () => {
        harita.getCanvas().style.cursor = "pointer";
      });
      harita.on("mouseleave", "il-halka", () => {
        harita.getCanvas().style.cursor = "";
      });

      harita.addSource("konum", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      harita.addLayer({
        id: "konum-nokta",
        type: "circle",
        source: "konum",
        paint: {
          "circle-radius": 7,
          "circle-color": "#4c7dff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      harita.on("click", "alan-nokta", (olay) => {
        const id = olay.features?.[0]?.properties?.id;
        if (typeof id === "number") onSecRef.current(id);
      });
      harita.on("mouseenter", "alan-nokta", () => {
        harita.getCanvas().style.cursor = "pointer";
      });
      harita.on("mouseleave", "alan-nokta", () => {
        harita.getCanvas().style.cursor = "";
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
            // Yıldız = bu depremi yalnız Kandilli bildirdi (lejantta açıklanıyor).
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

  // İl rozetleri değişince kaynağı güncelle
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
          properties: {
            plaka: il.plaka,
            alan: il.alan,
            // Sayı yazıyla da veriliyor: rozetin büyüklüğü tek başına
            // "kaç alan" bilgisini taşımaz.
            etiket: `${il.il}\n${il.alan.toLocaleString("tr-TR")} alan`,
          },
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
        harita.easeTo({ center: [konum.boylam, konum.enlem], zoom: 14, duration: 800 });
      }
    };
    if (hazirRef.current) uygula();
    else harita.once("load", uygula);
  }, [konum]);

  // Seçili alanı vurgula ve görünür yap
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita || !hazirRef.current || secili == null) return;
    for (const alan of alanlar) {
      harita.setFeatureState({ source: "alanlar", id: alan.id }, { secili: alan.id === secili });
    }
    const hedef = alanlar.find((a) => a.id === secili);
    if (hedef) {
      harita.easeTo({ center: [hedef.boylam, hedef.enlem], zoom: Math.max(harita.getZoom(), 15) });
    }
  }, [secili, alanlar]);

  return <div ref={kapRef} className="h-full w-full" aria-label="Toplanma alanları haritası" />;
}
