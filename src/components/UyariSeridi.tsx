"use client";

import { useEffect, useState } from "react";
import type { Kademe, Uyari } from "@/lib/mgmUyari";

/**
 * MGM AKTİF UYARI ŞERİDİ.
 *
 * Sayfanın anlattığı afet için ŞU AN geçerli resmî uyarı varsa gösterilir.
 * Uyarı yoksa HİÇBİR ŞEY çizilmez — "şu an uyarı yok" kutusu hem yer kaplar
 * hem de kaynağa ulaşılamadığı durumla karıştırılır.
 *
 * 🔑 Kaynağın metni AYNEN aktarılır, özetlenmez. Resmî uyarıyı kısaltmak
 * şiddetini değiştirmek olur.
 *
 * ⚠️ ÇÖZÜNÜRLÜK İLÇEDİR. Ekranda il adı yazılır; "mahallende uyarı var"
 * denmez, çünkü veri o kadar ince değil.
 *
 * ⚠️ Bu bileşen istemcide çalışır: JavaScript inmezse şerit görünmez ama
 * sayfanın kendisi tam okunur. Sayfanın "JavaScript gerektirmez" sözü
 * bozulmaz — şerit ilerlemeli bir ektir.
 */

type Yanit = { uyarilar?: Uyari[] };

/**
 * Kademe → görsel dil. Marka anayasası §2: renk TEK BAŞINA bilgi taşımaz,
 * bu yüzden kademenin adı her zaman YAZIYLA da yazılır ("Turuncu uyarı").
 */
const BICIM: Record<Kademe, { sinif: string; ad: string }> = {
  red: { sinif: "border-kritik/60 bg-kritik/10 text-kritik", ad: "Kırmızı uyarı" },
  orange: { sinif: "border-uyari/60 bg-uyari/10 text-uyari", ad: "Turuncu uyarı" },
  yellow: { sinif: "border-uyari/35 bg-uyari/5 text-uyari", ad: "Sarı uyarı" },
};

/**
 * MGM saatleri UTC yayınlıyor (`…Z`), kullanıcı TSİ okuyor.
 * Çevrilmezse tüm saatler 3 saat geriye kayar — bu projede aynı tuzak
 * Kandilli'de yaşandı ("az önce" etiketleri tamamen yanlış çıkmıştı).
 */
const GUN = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
});
const SAAT = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
});

function aralik(baslangic: string, bitis: string): string {
  const b = Date.parse(baslangic);
  const s = Date.parse(bitis);
  if (!Number.isFinite(s)) return "";
  if (!Number.isFinite(b)) return `${GUN.format(s)} ${SAAT.format(s)}'ye kadar`;
  const ayniGun = GUN.format(b) === GUN.format(s);
  return ayniGun
    ? `${GUN.format(b)} ${SAAT.format(b)} – ${SAAT.format(s)}`
    : `${GUN.format(b)} ${SAAT.format(b)} → ${GUN.format(s)} ${SAAT.format(s)}`;
}

function illerMetni(iller: { ad: string }[]): string {
  const adlar = iller.map((i) => i.ad);
  if (adlar.length <= 4) return adlar.join(", ");
  return `${adlar.slice(0, 4).join(", ")} ve ${adlar.length - 4} il daha`;
}

export default function UyariSeridi({ afet }: { afet: string }) {
  const [uyarilar, setUyarilar] = useState<Uyari[]>([]);

  useEffect(() => {
    const iptal = new AbortController();
    fetch("/api/uyari", { signal: iptal.signal })
      .then((y) => (y.ok ? (y.json() as Promise<Yanit>) : null))
      .then((veri) => {
        if (!veri?.uyarilar) return;
        /**
         * Süre kontrolü sunucuda da yapılıyor, burada TEKRAR yapılıyor:
         * yanıt kenarda `s-maxage=600` + `stale-while-revalidate=1800` ile
         * tutuluyor, yani süresi dolmuş bir uyarı yarım saate kadar
         * önbellekten gelebilir. Bitmiş uyarıyı "şu an geçerli" gibi
         * göstermek, uyarı göstermemekten kötüdür.
         */
        const simdi = Date.now();
        setUyarilar(
          veri.uyarilar.filter(
            (u) => u.afetler.includes(afet) && Date.parse(u.bitis) > simdi
          )
        );
      })
      // Kaynağa ulaşılamazsa sessiz kal: uyarı şeridinin yokluğu, sayfanın
      // asıl içeriğini (ne yapılacağı) engellememeli.
      .catch(() => {});
    return () => iptal.abort();
  }, [afet]);

  if (!uyarilar.length) return null;

  // En fazla iki uyarı gösterilir; gerisi sayıyla belirtilir. Panik anında
  // okunacak şey uzun bir liste değil, en ciddi olan.
  const gosterilen = uyarilar.slice(0, 2);
  const kalan = uyarilar.length - gosterilen.length;

  return (
    <div className="mt-6 space-y-3" role="status">
      {gosterilen.map((u) => {
        const bicim = BICIM[u.kademe];
        return (
          <article
            key={`${u.no}-${u.kademe}`}
            className={`rounded-xl border px-5 py-4 ${bicim.sinif}`}
          >
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-base font-semibold">{bicim.ad}</span>
              <span className="text-sm font-medium text-metin">
                {illerMetni(u.iller)}
              </span>
              <span className="text-sm text-metin-3">{aralik(u.baslangic, u.bitis)}</span>
            </p>
            <p className="mt-2 text-metin-2">{u.metin}</p>
            <p className="mt-2 text-xs text-metin-3">
              Kaynak: Meteoroloji Genel Müdürlüğü · uyarı il/ilçe düzeyindedir
            </p>
          </article>
        );
      })}
      {kalan > 0 && (
        <p className="text-sm text-metin-3">
          Bu afet için {kalan} uyarı daha var.
        </p>
      )}
    </div>
  );
}
