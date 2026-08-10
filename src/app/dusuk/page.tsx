import type { Metadata } from "next";
import Link from "next/link";
import { yayindakiIller, ozetOku } from "@/lib/veri";

export const metadata: Metadata = {
  title: "Metin sürümü — toplanma alanları",
  description:
    "Haritasız, JavaScript gerektirmeyen liste. Kötü bağlantıda ve eski " +
    "telefonlarda açılır: il → ilçe → mahalle seçin, toplanma alanlarını görün.",
};

/**
 * METİN SÜRÜMÜ — ürünün en dayanıklı yüzeyi.
 *
 * Harita motoru yok, konum izni yok, veri indirmesi yok. Afet anında şebeke
 * dizlerinin üstündeyken çalışması gereken sayfa budur; bu yüzden tamamı
 * SSG ve içerik JavaScript'siz okunur.
 *
 * 📏 ÖLÇÜLDÜ (2026-08-10, üretim derlemesi, gzip):
 *   /dusuk 6,8 KB · /dusuk/afet 3,9 KB · /dusuk/afet/deprem 7,6 KB ·
 *   /dusuk/hazirlik 14,7 KB  → hepsi 50 KB hedefinin ALTINDA.
 *
 * ⚠️ "JS sıfır" LAFZEN DOĞRU DEĞİL: Next App Router her sayfaya ~188 KB
 * React/Next runtime'ı ekliyor ve bu sade sayfalarda da iniyor. Önemli olan
 * şu: tüm script etiketleri `async`, yani ENGELLEYİCİ yük yalnız yukarıdaki
 * HTML. Sayfa JS gelmeden okunur ve bağlantıları çalışır; JS hiç gelmese de
 * içerik tamdır. Kötü bağlantıda belirleyici olan sayı 7,6 KB, 199 KB değil.
 *
 * ✓ MapLibre bu sayfalara BİNMİYOR (chunk'lar tarandı) — kod bölme doğru.
 *
 * 🔒 KARAR (İlyas, 2026-08-10): **App Router'dan ÇIKILMAYACAK ve "sıfır JS"
 * hedefi şimdilik KALKTI.** Bu sayfaların sözü bundan sonra "JavaScript
 * GEREKTİRMEZ" — ölçülmüş ve doğru olan iddia bu. "Sıfır JS" bir daha hedef
 * olarak yazılmayacak; kullanıcıya da hiçbir yerde öyle söylenmiyor.
 */
export default async function MetinAnasayfa() {
  const iller = await yayindakiIller();
  const ozet = await ozetOku();

  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">GeoGow — metin sürümü</h1>
      <p className="mt-3 text-metin-2">
        Harita, görsel ve JavaScript gerektirmez. Kötü bağlantıda ve eski
        telefonlarda açılır; sitenin tüm içeriğinin sade karşılığı buradadır.
      </p>

      {/* Afet anı ve hazırlık ÖNCE geliyor: buraya düşen kullanıcı büyük
          ihtimalle ya bağlantısı kötü ya da olayın içinde. Toplanma alanı
          listesi önemli ama ilk hareketi anlatan sayfa daha acil. */}
      <nav aria-label="Bölümler" className="mt-6 grid gap-2">
        <Link
          href="/dusuk/afet"
          className="rounded border border-kritik/40 bg-kritik/10 px-4 py-3 hover:border-kritik"
        >
          <span className="font-medium text-metin">Şu an ne yapmalıyım?</span>
          <span className="mt-0.5 block text-sm text-metin-2">
            Dokuz afet için o anda ne yapılır, öncesi ve sonrası
          </span>
        </Link>
        <Link
          href="/dusuk/hazirlik"
          className="rounded border border-cizgi bg-zemin-2 px-4 py-3 hover:border-vurgu"
        >
          <span className="font-medium text-metin">Hazırlık</span>
          <span className="mt-0.5 block text-sm text-metin-2">
            Afet çantası ve aile buluşma planı — yazdırılabilir
          </span>
        </Link>
      </nav>

      <nav aria-label="Yayındaki iller" className="mt-8">
        <p className="text-metin-2">
          Toplanma alanı aramak için ilinizi seçin, ilçe ve mahallenize inin.
        </p>
        <h2 className="text-sm uppercase tracking-wide text-metin-3">
          Yayındaki iller ({iller.length})
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {iller.map((il) => (
            <li key={il.plaka}>
              <Link
                href={`/dusuk/${il.slug}`}
                className="flex min-h-[44px] items-center justify-between rounded border border-cizgi bg-zemin-2 px-4 py-2 hover:border-vurgu"
              >
                <span>{il.il}</span>
                <span className="text-sm text-metin-3">{il.alan} alan</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {iller.length < 81 && (
        <p className="mt-6 rounded border border-cizgi bg-zemin-2 p-4 text-sm text-metin-2">
          <strong className="text-metin">81 ilin {iller.length} tanesi yayında.</strong>{" "}
          Veri, AFAD&apos;ın e-Devlet üzerindeki sorgulama hizmetinden il il
          toplanıyor ve her il tamamlandıkça buraya ekleniyor. Eksik iller için
          henüz veri toplamadık — &ldquo;o ilde alan yok&rdquo; anlamına gelmez.
        </p>
      )}

      {/* ⚠️ Burada bir zamanlar "Acil durumda 112 · 112." yazıyordu: 122 ve 177
          kaldırılırken artık bir numara kalmış ve aynı numara iki kez
          basılıyordu. */}
      <p className="mt-6 text-sm text-metin-3">
        Kaynak: {ozet?.kaynak ?? "AFAD / e-Devlet"} · Resmî uyarı değildir.
        Acil durumda <strong className="text-metin-2">112</strong>.
      </p>

      <p className="mt-4 text-sm">
        <Link href="/" className="text-vurgu underline">
          Haritalı sürüme geç →
        </Link>
      </p>
    </main>
  );
}
