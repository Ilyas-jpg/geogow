"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Servis çalışanını kaydeder ve "ilimi çevrimdışı kaydet" akışını yürütür.
 *
 * Kullanıcıya TAHMİNİ değil ÖLÇÜLMÜŞ boyut gösterilir: SW dosyaları indirip
 * gerçek bayt sayısını geri bildirir. Afet uygulamasında "8 MB indirilecek"
 * deyip 40 MB indirmek kabul edilemez.
 */
export default function CevrimdisiKayit({
  plaka,
  ilAdi,
  ilSlug,
}: {
  plaka: number | null;
  ilAdi: string | null;
  ilSlug: string | null;
}) {
  const [hazir, setHazir] = useState(false);
  const [durum, setDurum] = useState<"bos" | "kaydediliyor" | "tamam" | "hata">("bos");
  const [bilgi, setBilgi] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Kayıt ServisCalisani bileşeninde, sayfa açılışında yapılıyor; burada
    // yalnız hazır olmasını bekliyoruz.
    navigator.serviceWorker.ready.then(() => setHazir(true)).catch(() => setHazir(false));

    const dinle = (olay: MessageEvent) => {
      if (olay.data?.tip !== "il-kaydedildi") return;
      const mb = (olay.data.bayt / 1_048_576).toFixed(1).replace(".", ",");
      setDurum("tamam");
      setBilgi(`${olay.data.basarili} dosya · ${mb} MB cihazına kaydedildi`);
    };
    navigator.serviceWorker.addEventListener("message", dinle);
    return () => navigator.serviceWorker.removeEventListener("message", dinle);
  }, []);

  const kaydet = useCallback(() => {
    if (!plaka || !ilSlug) return;
    const iscik = navigator.serviceWorker.controller;
    if (!iscik) {
      setDurum("hata");
      setBilgi("Çevrimdışı motor henüz hazır değil — sayfayı yenileyip tekrar dene.");
      return;
    }
    setDurum("kaydediliyor");
    setBilgi(null);
    iscik.postMessage({
      tip: "il-kaydet",
      yollar: [
        `/data/toplanma/${plaka}.min.json`,
        `/data/toplanma/${plaka}.metin.json`,
        `/data/toplanma/${plaka}.geo.json`,
        `/data/toplanma/ozet.json`,
        // Acil altyapı: hasadı yapılmamış iller için 404 döner ve SW o
        // dosyayı atlar (tek dosyanın düşmesi diğerlerini götürmez).
        // Ölçülen boyut kullanıcıya zaten gerçek rakamla bildiriliyor.
        `/data/altyapi/${plaka}.min.json`,
        `/dusuk/${ilSlug}`,
      ],
    });
  }, [plaka, ilSlug]);

  if (!hazir || !plaka || !ilAdi) return null;

  return (
    <div className="mt-3 border-t border-cizgi pt-3">
      <button
        type="button"
        onClick={kaydet}
        disabled={durum === "kaydediliyor"}
        className="min-h-[44px] w-full rounded-lg border border-cizgi px-3 text-sm text-metin-2 disabled:opacity-60"
      >
        {durum === "kaydediliyor"
          ? "Kaydediliyor…"
          : `${ilAdi} verisini çevrimdışı kaydet`}
      </button>
      <p className="mt-2 text-xs text-metin-3">
        {bilgi ??
          "Şebeke çökse de bu ilin toplanma alanları telefonunda açılır. " +
            "Harita karoları yalnız gezdiğin bölgeler için saklanır."}
      </p>
    </div>
  );
}
