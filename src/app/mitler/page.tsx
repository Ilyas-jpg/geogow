import type { Metadata } from "next";
import Link from "next/link";
import { afetBul, tumMitler } from "@/lib/afet";

export const metadata: Metadata = {
  title: "Doğru bilinen yanlışlar — hayat üçgeni, kapı eşiği ve diğerleri",
  description:
    "«Hayat üçgeni» neden yanlış, doğrusu neden Çök-Kapan-Tutun? Depremde, " +
    "yangında ve selde yaygın yanlışların kaynaklarıyla düzeltilmesi.",
  alternates: { canonical: "/mitler" },
};

/**
 * MİTLER — ürünün en yüksek etkili tek sayfası.
 *
 * Gerekçe: «hayat üçgeni» Türkiye'de hâlâ yaygın olarak paylaşılıyor ve
 * uygulanması hâlinde insanı sarsıntı sırasında korumasız bırakıyor. Bu
 * sayfanın işi tartışmayı yumuşatmak değil, kanıtla POZİSYON ALMAK.
 *
 * Dürüstlük kuralı burada özellikle geçerli: AFAD'ın resmî tatbikatı
 * Çök-Kapan-Tutun üzerine kurulu ama kurumun bazı eski sayfalarında hâlâ
 * «hayat üçgeni» ifadesi geçiyor. Bu çelişkiyi saklamak, kullanıcı o sayfayı
 * bulduğunda bize olan güveni bitirir — o yüzden açıkça yazıyoruz.
 */
export default function MitlerSayfasi() {
  const deprem = afetBul("deprem");
  const hayatUcgeni = deprem?.mitler[0];
  const digerleri = tumMitler().filter((m) => m.yanlis !== hayatUcgeni?.yanlis);

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Doğru bilinen yanlışlar</h1>
        <Link href="/" className="shrink-0 text-sm text-vurgu underline">
          Haritaya dön
        </Link>
      </div>
      <p className="mt-2 text-metin-2">
        Afet bilgisinde yanlış bir alışkanlık, bilgisizlikten daha tehlikelidir:
        kişi doğru olduğuna inandığı şeyi tereddütsüz yapar. Aşağıdaki
        maddelerin her biri kaynağıyla birlikte veriliyor.
      </p>

      {/* ── Baş madde: hayat üçgeni ── */}
      {hayatUcgeni && (
        <article className="mt-6 rounded-xl border border-kritik/50 bg-zemin-2 p-5">
          <p className="text-xs uppercase tracking-wide text-metin-3">
            En yaygın ve en tehlikeli
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            &ldquo;Hayat üçgeni&rdquo; — uygulama, masanın altına girmekten daha
            güvenli değildir
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-kritik/40 bg-kritik/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-kritik">
                Yanlış
              </p>
              <p className="mt-1 text-sm text-metin-2">{hayatUcgeni.yanlis}</p>
            </div>
            <div className="rounded-lg border border-guvenli/40 bg-guvenli/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-guvenli">
                Doğru
              </p>
              <p className="mt-1 text-sm text-metin">{hayatUcgeni.dogru}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-metin-2">{hayatUcgeni.neden}</p>

          <p className="mt-4 text-sm">
            <Link href="/afet/deprem" className="text-vurgu underline">
              Depremde adım adım ne yapılır
            </Link>
          </p>

          <p className="mt-3 text-xs text-metin-3">
            Kaynaklar:{" "}
            {hayatUcgeni.kaynaklar.map((k) => `${k.kurum} (${k.ad})`).join(" · ")}
          </p>
        </article>
      )}

      {/* ── Kurum içi çelişki: gizlemek yerine yazıyoruz ── */}
      <section className="mt-6 rounded-xl border border-uyari/40 bg-uyari/10 p-4">
        <h2 className="text-base font-semibold text-metin">
          Neden kafa karışıklığı var?
        </h2>
        <p className="mt-2 text-sm text-metin-2">
          Çünkü resmî kaynakların kendi içinde tam bir tutarlılık yok. AFAD&apos;ın
          81 ilde yaptığı deprem tatbikatı <strong className="text-metin">
          Çök–Kapan–Tutun</strong> hareketi üzerine kuruludur; buna karşılık
          kurumun bazı eski sayfalarında hâlâ &ldquo;hayat üçgeni&rdquo; ifadesi
          geçmektedir. Bunu saklamıyoruz — bir kurumun eski bir sayfası,
          uluslararası bilimsel konsensüsü değiştirmez. GeoGow bu konuda{" "}
          <strong className="text-metin">USGS, FEMA, INSARAG ve Amerikan
          Kızılhaçı</strong>&apos;nın ortak duruşunu esas alır.
        </p>
      </section>

      {/* ── Diğer mitler ── */}
      <h2 className="mt-10 text-lg font-semibold">Diğer yaygın yanlışlar</h2>
      <div className="mt-3 space-y-4">
        {digerleri.map((mit) => (
          <article
            key={mit.yanlis}
            className="rounded-xl border border-cizgi bg-zemin-2 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-metin-3">
              {mit.afet.ad}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-semibold text-kritik">YANLIŞ ·</span>{" "}
              <span className="text-metin-2">{mit.yanlis}</span>
            </p>
            <p className="mt-2 text-sm">
              <span className="font-semibold text-guvenli">DOĞRU ·</span>{" "}
              <span className="text-metin">{mit.dogru}</span>
            </p>
            <p className="mt-2 text-sm text-metin-2">{mit.neden}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-metin-3">
              <span>Kaynak: {mit.kaynaklar.map((k) => k.kurum).join(" · ")}</span>
              <Link href={`/afet/${mit.afet.slug}`} className="text-vurgu underline">
                {mit.afet.ad} sayfası
              </Link>
            </p>
          </article>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
        <h2 className="text-base font-semibold text-metin">
          Bir bilgiyi paylaşmadan önce
        </h2>
        <ul className="mt-2 space-y-1">
          <li>Kaynağı bir kurum mu, yoksa &ldquo;bir uzman&rdquo; mı?</li>
          <li>Tarihi var mı? Eski bir afetin görüntüsü yeni gibi dolaşıyor olabilir.</li>
          <li>
            Aynı bilgiyi AFAD, valilik veya 112 doğruluyor mu? Doğrulamıyorsa
            paylaşma — afet anında yanlış bilgi ekipleri yanlış yere gönderir.
          </li>
        </ul>
      </section>

      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/afet-ani" className="text-vurgu underline">
          Afet anı ekranı
        </Link>
        <Link href="/hazirlik" className="text-vurgu underline">
          Hazırlık
        </Link>
        <Link href="/hakkinda" className="text-vurgu underline">
          Kaynaklar ve yöntem
        </Link>
      </p>
    </main>
  );
}
