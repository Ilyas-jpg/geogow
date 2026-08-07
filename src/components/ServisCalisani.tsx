"use client";

import { useEffect } from "react";

/**
 * Servis çalışanını SAYFA AÇILIR AÇILMAZ kaydeder.
 *
 * 🐛 Önce kayıt kodu "ilimi çevrimdışı kaydet" bileşeninin içindeydi; o bileşen
 * ise yalnız konum bulunup sonuç paneli açıldığında render oluyordu. Sonuç:
 * çevrimdışı motor çoğu ziyarette HİÇ kurulmuyordu — yani ürünün birinci
 * vaadi (şebeke çökse de çalışır) sessizce yoktu. Gerçek tarayıcıda ölçülünce
 * görüldü: `serviceWorker.getRegistration()` → null.
 */
export default function ServisCalisani() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Kayıt ilk boyamayı geciktirmesin.
    const zamanlayici = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Kayıt düşerse uygulama çevrimiçi çalışmaya devam eder. */
      });
    }, 800);
    return () => clearTimeout(zamanlayici);
  }, []);

  return null;
}
