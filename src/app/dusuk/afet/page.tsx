import type { Metadata } from "next";
import Link from "next/link";
import { AFETLER } from "@/lib/afet";

export const metadata: Metadata = {
  title: "Afetler — metin sürümü",
  description:
    "Dokuz afet için o anda ne yapılacağı, öncesi ve sonrası. Görselsiz, " +
    "JavaScript gerektirmeyen sade sürüm; kötü bağlantıda ve eski " +
    "telefonlarda açılır.",
};

/**
 * SADE AFET DİZİNİ. Kart, ikon, görsel yok — düz bağlantı listesi.
 * Her satır afetin ilk hareketini de gösteriyor: kullanıcı sayfaya
 * girmeden önce en kritik bilgiyi burada görsün.
 */
export default function SadeAfetDizini() {
  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Yol izi" className="text-sm text-metin-3">
        <Link href="/dusuk" className="underline">
          Metin sürümü
        </Link>{" "}
        / Afetler
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">Afetler — metin sürümü</h1>
      <p className="mt-3 text-metin-2">
        Görsel ve JavaScript gerektirmez. Afeti seçin: o anda ne yapılacağı,
        öncesinde ne hazırlanacağı ve sonrasında ne bekleneceği yazıyor.
      </p>

      <p className="mt-4 rounded border border-kritik/40 bg-kritik/10 px-4 py-3 text-sm">
        Acil çağrı <strong className="text-metin">112</strong>.
      </p>

      <ul className="mt-6 space-y-2">
        {AFETLER.map((afet) => (
          <li key={afet.slug}>
            <Link
              href={`/dusuk/afet/${afet.slug}`}
              className="block min-h-[44px] rounded border border-cizgi bg-zemin-2 px-4 py-3 hover:border-vurgu"
            >
              <span className="font-medium text-metin">{afet.ad}</span>
              {afet.anAdimlari[0] && (
                <span className="mt-0.5 block text-sm text-metin-3">
                  İlk hareket: {afet.anAdimlari[0].baslik}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm">
        <Link href="/dusuk/hazirlik" className="text-vurgu underline">
          Hazırlık: çanta ve aile planı →
        </Link>
      </p>
      <p className="mt-2 text-sm">
        <Link href="/afet-ani" className="text-vurgu underline">
          Görselli sürüme geç →
        </Link>
      </p>
    </main>
  );
}
