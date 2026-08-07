import type { Metadata } from "next";
import Link from "next/link";
import { ozetOku, yayindakiIller } from "@/lib/veri";
import { ILLER } from "@/lib/iller";
import SayfaKabugu from "@/components/SayfaKabugu";

export const metadata: Metadata = {
  title: "Veri kapsamı — hangi il yayında, ne kadar eksik",
  description:
    "GeoGow'nun toplanma alanı verisinin il il kapsamı, toplama tarihi ve " +
    "bilinen boşlukları. Zayıflığı gizlemiyoruz, ölçüp yayınlıyoruz.",
};

/**
 * KARNE SAYFASI — ürünün kendi zayıflığını yayınladığı yer.
 *
 * Gerekçe: afet uygulamasında güven, "her şey tamam" demekle değil, neyin
 * eksik olduğunu göstermekle kurulur. Kullanıcı "benim ilim yok" gördüğünde
 * bunun bir arıza mı yoksa henüz toplanmamış veri mi olduğunu bilmeli.
 */
export default async function KapsamSayfasi() {
  const ozet = await ozetOku();
  const yayinda = await yayindakiIller();
  const yayindaPlakalar = new Set(yayinda.map((i) => i.plaka));
  const bekleyen = ILLER.filter((i) => !yayindaPlakalar.has(i.plaka));

  const toplamMahalle = yayinda.reduce((t, i) => t + i.mahalle, 0);
  const kapsanan = yayinda.reduce((t, i) => t + i.kapsananMahalle, 0);

  return (
    <SayfaKabugu>
      <h1 className="pt-8 text-3xl font-semibold sm:text-4xl">Veri kapsamı</h1>
      <p className="mt-3 text-metin-2">
        Toplanma alanı verisi AFAD&apos;ın e-Devlet üzerindeki resmî sorgulama
        hizmetinden il il toplanıyor. Aşağıdaki tablo o toplamanın bugünkü
        durumudur — tamamlanmamış iller dahil.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Yayındaki il", `${yayinda.length} / 81`],
          ["Toplanma alanı", (ozet?.toplamAlan ?? 0).toLocaleString("tr-TR")],
          ["Taranan mahalle", toplamMahalle.toLocaleString("tr-TR")],
          [
            "Alan bağlanan",
            // Ondalık bilerek: %99,6'yı "%100" diye yuvarlamak, tam da
            // dürüstlük sayfasında eksiği gizlemek olurdu.
            toplamMahalle
              ? `%${((kapsanan / toplamMahalle) * 100).toFixed(1).replace(".", ",")}`
              : "—",
          ],
        ].map(([baslik, deger]) => (
          <div key={baslik} className="rounded-lg border border-cizgi bg-zemin-2 p-3">
            <dt className="text-xs text-metin-3">{baslik}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{deger}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-lg font-semibold">Yayındaki iller</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            İl bazında toplanma alanı sayısı, mahalle kapsamı ve toplama tarihi
          </caption>
          <thead>
            <tr className="border-b border-cizgi text-left text-metin-3">
              <th scope="col" className="py-2 pr-3 font-medium">İl</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Alan</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">İlçe</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Mahalle</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Kapsam</th>
              <th scope="col" className="py-2 text-right font-medium">Toplandı</th>
            </tr>
          </thead>
          <tbody>
            {yayinda.map((il) => (
              <tr key={il.plaka} className="border-b border-cizgi/60">
                <td className="py-2 pr-3">
                  <Link href={`/dusuk/${il.slug}`} className="text-vurgu underline">
                    {il.il}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{il.alan}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{il.ilce}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{il.mahalle}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  %{il.kapsamYuzde}
                </td>
                <td className="py-2 text-right text-metin-3">
                  {new Date(il.toplandi).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bekleyen.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">
            Henüz toplanmamış iller ({bekleyen.length})
          </h2>
          <p className="mt-2 text-sm text-metin-2">
            Bu iller için <strong className="text-metin">veri yok değil</strong>{" "}
            — biz henüz toplamadık. Toplama ölçülmüş hızla (~1,3 istek/saniye)
            sürüyor ve büyük illerden başlıyor.
          </p>
          <p className="mt-3 text-sm text-metin-3">
            {bekleyen.map((i) => i.ad).join(" · ")}
          </p>
        </>
      )}

      <h2 className="mt-10 text-lg font-semibold">Bu sayılar ne değildir</h2>
      <ul className="mt-3 space-y-2 text-sm text-metin-2">
        <li>
          <strong className="text-metin">Kapsam %100 olması</strong> her mahalleye
          yürüme mesafesinde alan olduğu anlamına gelmez; o mahalleye hizmet
          veren en yakın alanların kaydedildiği anlamına gelir.
        </li>
        <li>
          <strong className="text-metin">Listede olmayan mahalle</strong>{" "}
          &ldquo;orada alan yok&rdquo; demek değil — AFAD kaydında o mahalleye
          bağlı alan görünmediği anlamına gelir.
        </li>
        <li>
          <strong className="text-metin">Alan büyüklüğü kaba ölçüdür</strong>;
          kaç kişi alacağını hesaplamıyoruz — dayanağımız yok, uydurma sayı afet
          anında zarar verir.
        </li>
        <li>
          Veriler değişebilir. Sahadaki tabela ve resmî duyuru esastır.
        </li>
      </ul>

      <p className="mt-8 text-sm text-metin-3">
        Kaynak: {ozet?.kaynak ?? "AFAD / e-Devlet"} · Son derleme:{" "}
        {ozet ? new Date(ozet.uretildi).toLocaleString("tr-TR") : "—"} · Resmî
        uyarı değildir, acil durumda 112 · AFAD 122.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/" className="text-vurgu underline">
          Haritaya dön
        </Link>
      </p>
    </SayfaKabugu>
  );
}
