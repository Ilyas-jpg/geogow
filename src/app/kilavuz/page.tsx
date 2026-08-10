import type { Metadata } from "next";
import Link from "next/link";
import { AFETLER } from "@/lib/afet";
import { CANTA, PLAN_ALANLARI } from "@/lib/hazirlik";

export const metadata: Metadata = {
  title: "Basılabilir afet kılavuzu",
  description:
    "Dokuz afet, çanta listesi ve aile buluşma planı tek sayfada. " +
    "Tarayıcıdan “PDF olarak kaydet” ile indirin, yazdırıp çantanıza koyun — " +
    "kâğıt internetsiz de şarjsız da çalışır.",
  alternates: { canonical: "/kilavuz" },
};

/**
 * BASILABİLİR KILAVUZ — Tokyo Bosai modeli.
 *
 * Amaç: eğitimde dağıtılabilen, evde çantaya konabilen, internetsiz çalışan
 * kâğıt. Ekranda da okunur ama asıl hedef çıktı.
 *
 * ⚠️ PDF SUNUCUDA ÜRETİLMİYOR. Tarayıcının kendi "PDF olarak kaydet"i
 * kullanılıyor: ek bağımlılık yok, her cihazda çalışır ve sunucuya yük
 * binmez (feedback_3rd_party_servis_minimize).
 *
 * 🔑 İçerik üçüncü kez YAZILMADI. Zengin sayfa, sade sayfa ve bu kılavuz
 * aynı `src/lib/afet.ts` + `src/lib/hazirlik.ts` kaynağından besleniyor.
 * Basılı kâğıt en tehlikeli kopyadır: yanlışı düzeltilemez, cepte yıllarca
 * kalır. O yüzden tek kaynak kuralı burada en katı biçimde geçerli.
 *
 * Baskı davranışı `globals.css` içindeki `@media print` bloğunda:
 * A4 + 14mm kenar boşluğu (delgeç payı), başlık yalnız kalmaz, madde
 * ikiye bölünmez, `.yazdirma-yeni-sayfa` yeni sayfadan başlar.
 */
export default function KilavuzSayfasi() {
  const temel = CANTA.filter((b) => !b.eklenti);
  const eklentiler = CANTA.filter((b) => b.eklenti);
  const basimTarihi = new Date().toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
  });

  return (
    <main id="icerik" className="mx-auto max-w-3xl px-5 py-8">
      {/* ── Ekranda görünen, kâğıda basılmayan üst şerit ── */}
      <div className="yazdirma-gizle mb-8 rounded-xl border border-cizgi bg-zemin-2 p-5">
        <p className="text-sm text-metin-2">
          Bu sayfa <strong className="text-metin">yazdırılmak</strong> için
          hazırlandı. Tarayıcının yazdırma penceresinden{" "}
          <strong className="text-metin">“PDF olarak kaydet”</strong> seçerek
          indirebilir, çıktı alıp çantanıza koyabilirsiniz.
        </p>
        <p className="mt-2 text-sm text-metin-3">
          Tek bir afetin buzdolabına asılık kartı için:{" "}
          {AFETLER.map((a, i) => (
            <span key={a.slug}>
              {i > 0 && " · "}
              <Link href={`/kilavuz/${a.slug}`} className="text-vurgu underline">
                {a.ad}
              </Link>
            </span>
          ))}
        </p>
        <p className="mt-3 text-sm">
          <Link href="/" className="text-vurgu underline">
            ← Siteye dön
          </Link>
        </p>
      </div>

      {/* ── Kapak ── */}
      <header className="border-b border-cizgi pb-6">
        {/* Marka anayasası md.5: wordmark bir GÖRSELDİR, metinle dizilmez.
            Beyaz kâğıt için siyah varyant. */}
        <img
          src="/marka/geogow-wordmark-siyah.png"
          alt="GeoGow"
          width={172}
          height={36}
          className="hidden h-[26px] w-auto yazdirma-goster"
        />
        <img
          src="/marka/geogow-wordmark.png"
          alt="GeoGow"
          width={172}
          height={36}
          className="h-[26px] w-auto yazdirma-gizle"
        />
        <h1 className="mt-4 text-3xl font-semibold">Afet kılavuzu</h1>
        <p className="mt-2 text-metin-2">
          Dokuz afette o anda ne yapılır, öncesinde ne hazırlanır, sonrasında
          ne beklenir. Çanta listesi ve aile buluşma planı ekte.
        </p>
        <p className="mt-4 text-lg font-semibold">
          Acil çağrı: 112
        </p>
        <p className="mt-1 text-sm text-metin-3">
          Bu kâğıt resmî uyarı değildir. Yetkili uyarı AFAD, valilik ve 112
          üzerinden gelir. Baskı: {basimTarihi} · geogow.net
        </p>
      </header>

      {/* ── Afetler: her biri yeni sayfada ── */}
      {AFETLER.map((afet) => (
        <section key={afet.slug} className="mt-10 yazdirma-yeni-sayfa">
          <h2 className="text-2xl font-semibold">{afet.ad}</h2>
          <p className="mt-2 text-metin-2">{afet.ozet}</p>

          <h3 className="mt-5 font-semibold">O anda</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {afet.anAdimlari.map((adim) => (
              <li key={adim.baslik}>
                <strong className="text-metin">{adim.baslik}</strong>
                <span className="text-metin-2"> — {adim.detay}</span>
              </li>
            ))}
          </ol>

          {afet.varyantlar.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold">Neredeysen</h3>
              <ul className="mt-2 space-y-1">
                {afet.varyantlar.map((v) => (
                  <li key={v.yer}>
                    <strong className="text-metin">{v.yer}:</strong>{" "}
                    <span className="text-metin-2">{v.ne}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">Öncesinde</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-metin-2">
                {afet.oncesi.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Sonrasında</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-metin-2">
                {afet.sonrasi.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          <h3 className="mt-5 font-semibold">Nasıl anlaşılır</h3>
          <p className="mt-2 text-metin-2">{afet.nasilAnlasilir}</p>

          {afet.mitler.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold">Doğru bilinen yanlışlar</h3>
              <ul className="mt-2 space-y-2">
                {afet.mitler.map((mit) => (
                  <li key={mit.yanlis}>
                    <strong className="text-kritik">Yanlış:</strong>{" "}
                    <span className="text-metin-2">{mit.yanlis}</span>{" "}
                    <strong className="text-guvenli">Doğru:</strong>{" "}
                    <span className="text-metin">{mit.dogru}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-4 text-xs text-metin-3">
            Kaynak: {afet.kaynaklar.map((k) => k.kurum).join(" · ")}
          </p>
        </section>
      ))}

      {/* ── Çanta ── */}
      <section className="mt-10 yazdirma-yeni-sayfa">
        <h2 className="text-2xl font-semibold">Afet çantası</h2>
        <p className="mt-2 text-metin-2">
          Her maddede ne kadar ve neden yazıyor. Çanta karanlıkta
          bulunabilecek, kapıya yakın bir yerde durur.
        </p>

        {temel.map((bolum) => (
          <div key={bolum.id} className="mt-5">
            <h3 className="font-semibold">{bolum.baslik}</h3>
            <ul className="mt-2 space-y-2">
              {bolum.maddeler.map((m) => (
                <li key={m.id}>
                  {/* Kâğıtta işaretlenebilsin diye kutu; baskı stili bunu
                      gerçek kareye çeviriyor. */}
                  <span aria-hidden className="mr-2">
                    ☐
                  </span>
                  <strong className="text-metin">{m.ad}</strong>
                  <span className="text-metin-2"> — {m.miktar}. {m.neden}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {eklentiler.map((bolum) => (
          <div key={bolum.id} className="mt-5">
            <h3 className="font-semibold">{bolum.baslik}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {bolum.maddeler.map((m) => (
                <li key={m.id}>
                  <span aria-hidden className="mr-2">
                    ☐
                  </span>
                  <strong className="text-metin">{m.ad}</strong>
                  <span className="text-metin-2"> — {m.miktar}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── Aile planı ── */}
      <section className="mt-10 yazdirma-yeni-sayfa">
        <h2 className="text-2xl font-semibold">Aile buluşma planı</h2>
        <p className="mt-2 text-metin-2">
          Elle doldurun. Şebeke çöktüğünde plan telefonda değil, cepte işe
          yarar.
        </p>
        <ol className="mt-4 space-y-5">
          {PLAN_ALANLARI.map((alan) => (
            <li key={alan.id}>
              <strong className="text-metin">{alan.etiket}</strong>
              <p className="text-sm text-metin-3">{alan.ipucu}</p>
              <p
                aria-hidden
                className="mt-2 border-b border-cizgi pb-6"
              />
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-10 border-t border-cizgi pt-4 text-xs text-metin-3">
        <p>
          GeoGow · geogow.net · Baskı: {basimTarihi}. Bu kâğıt resmî uyarı
          değildir; yetkili uyarı AFAD, valilik ve 112 üzerinden gelir.
          İçerik AFAD, USGS, FEMA, OGM, DSİ, MGM, EAWS ve WHO kaynaklarına
          dayanır, kaynak künyesi her afetin altında yazılıdır.
        </p>
      </footer>
    </main>
  );
}
