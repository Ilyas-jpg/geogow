import type { Metadata } from "next";
import Link from "next/link";
import { CANTA, SU_NOTU } from "@/lib/hazirlik";

export const metadata: Metadata = {
  title: "Afet çantası listesi — basılabilir",
  description:
    "İşaretlenebilir afet çantası listesi. Her maddede ne kadar ve neden " +
    "yazıyor. Yazdırıp çantanın yanına asın.",
  alternates: { canonical: "/printables/canta" },
};

/**
 * ÇANTA LİSTESİ — TEK BAŞINA BASILABİLİR BELGE.
 *
 * `/hazirlik` işaretlenebilir ve ilerleme sayan zengin sürüm; `/kilavuz`
 * içinde de bir bölüm olarak var. Bu sayfanın varlık sebebi katalog:
 * `/printables` bir mağaza rafı gibi çalışıyor ve raftaki her ürün kendi
 * başına alınabilmeli. "Şu sayfanın şu bölümünü bas" demek katalog olmaz.
 *
 * Kutular gerçek `☐` karakteri — JavaScript'e bağlı değil, kâğıtta
 * kalemle işaretlenir. Ekranda tıklanabilir kutu isteyen `/hazirlik`'e
 * gider; burada tıklanamayan bir kutu göstermek çalışıyormuş gibi durup
 * çalışmamak olurdu.
 */
export default function CantaBasilabilir() {
  const temel = CANTA.filter((b) => !b.eklenti);
  const eklentiler = CANTA.filter((b) => b.eklenti);
  const basim = new Date().toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
  });

  return (
    <main id="icerik" className="kart-a4 mx-auto max-w-2xl px-5 py-8">
      <div className="yazdirma-gizle mb-6 rounded-xl border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
        Yazdırın ya da{" "}
        <strong className="text-metin">“PDF olarak kaydet”</strong> ile
        indirin.{" "}
        <Link href="/printables" className="text-vurgu underline">
          Diğer basılabilir malzemeler
        </Link>{" "}
        ·{" "}
        <Link href="/hazirlik" className="text-vurgu underline">
          Ekranda işaretlenebilir sürüm
        </Link>
      </div>

      <header className="border-b border-cizgi pb-4">
        <img
          src="/marka/geogow-wordmark-siyah.png"
          alt="GeoGow"
          width={172}
          height={36}
          className="hidden h-[22px] w-auto yazdirma-goster"
        />
        <h1 className="mt-3 text-3xl font-semibold">Afet çantası</h1>
        <p className="mt-1 text-metin-2">
          Her maddede ne kadar ve neden yazıyor. Çanta karanlıkta
          bulunabilecek, kapıya yakın bir yerde durur.
        </p>
      </header>

      {temel.map((bolum) => (
        <section key={bolum.id} className="mt-6">
          <h2 className="text-xl font-semibold">{bolum.baslik}</h2>
          {bolum.aciklama && (
            <p className="mt-1 text-sm text-metin-2">{bolum.aciklama}</p>
          )}
          <ul className="mt-3 space-y-2">
            {bolum.maddeler.map((m) => (
              <li key={m.id} className="flex gap-3">
                <span aria-hidden className="text-lg leading-none">
                  ☐
                </span>
                <span>
                  <strong className="text-metin">{m.ad}</strong>
                  <span className="text-metin-2"> — {m.miktar}</span>
                  <span className="block text-sm text-metin-2">{m.neden}</span>
                  {m.tazele && (
                    <span className="block text-sm text-metin-3">
                      Tazele: {m.tazele}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-6 rounded border border-cizgi p-4">
        <h2 className="text-base font-semibold">Su miktarı hakkında</h2>
        <p className="mt-1 text-sm text-metin-2">{SU_NOTU}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Kime göre eklenenler</h2>
        <p className="mt-1 text-sm text-metin-2">
          Herkes için değil: evinde ilgili kişi varsa eklenir.
        </p>
        {eklentiler.map((bolum) => (
          <div key={bolum.id} className="mt-4">
            <h3 className="font-medium text-metin">{bolum.baslik}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {bolum.maddeler.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span aria-hidden>☐</span>
                  <span>
                    <strong className="text-metin">{m.ad}</strong>
                    <span className="text-metin-2"> — {m.miktar}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <footer className="mt-8 border-t border-cizgi pt-3 text-xs text-metin-3">
        GeoGow · geogow.net · Baskı: {basim}. Kaynak: AFAD, Sphere standardı,
        WHO. Resmî uyarı değildir; acil durumda 112.
      </footer>
    </main>
  );
}
