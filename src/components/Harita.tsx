"use client";

import { useEffect, useRef } from "react";
import { Map as MapGL, type Map as HaritaTipi } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Alan } from "@/lib/alan";
import { depremRengi, depremYaricapi, type Deprem } from "@/lib/deprem";

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

export default function Harita({
  alanlar,
  depremler = [],
  konum,
  secili,
  onSec,
}: {
  alanlar: Alan[];
  depremler?: Deprem[];
  konum: { enlem: number; boylam: number } | null;
  secili: number | null;
  onSec: (id: number) => void;
}) {
  const kapRef = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<HaritaTipi | null>(null);
  const hazirRef = useRef(false);

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
    haritaRef.current = harita;

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
        if (typeof id === "number") onSec(id);
      });
      harita.on("mouseenter", "alan-nokta", () => {
        harita.getCanvas().style.cursor = "pointer";
      });
      harita.on("mouseleave", "alan-nokta", () => {
        harita.getCanvas().style.cursor = "";
      });
    });

    return () => {
      harita.remove();
      haritaRef.current = null;
      hazirRef.current = false;
    };
  }, [onSec]);

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
