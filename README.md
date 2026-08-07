# GeoGow

**Afette en yakın toplanma alanını gösteren, çevrimdışı da çalışan açık kaynak harita.**
🌐 [geogow.net](https://geogow.net)

Türkiye'de eksik olan veri değil, **erişim**. AFAD'ın toplanma alanı verisi
e-Devlet'te var ama il/ilçe/mahalle seçtirerek tek tek sorgulatıyor: harita yok,
"bana en yakın" yok ve şebeke çökünce hiç yok. GeoGow bunu tek ekranda,
telefonda, ağ olmadan da çalışacak şekilde birleştirir.

## Ne yapar

- **En yakın toplanma alanı** — konum izniyle en yakın 3 alan: mesafe, yön,
  kaba yürüme süresi, adres ve sahadaki **tabela kodu**.
  Arama **tamamen tarayıcıda** yapılır; konum cihazdan çıkmaz.
- **Çevrimdışı çalışır** — servis çalışanı uygulama kabuğunu, gezilen harita
  karolarını ve indirilen ilin verisini saklar. "İlini çevrimdışı kaydet"
  düğmesi gerçekten kaç MB tuttuğunu söyler.
- **Metin sürümü (`/dusuk`)** — JavaScript ve harita gerektirmez; il → ilçe →
  mahalle seçilir, alanlar listelenir. En dayanıklı yüzey.
- **Deprem katmanı** — AFAD canlı servisi, yalnız katman açıkken çekilir.
- **Veri karnesi (`/kapsam`)** — hangi il yayında, kapsam ne, ne eksik.
  Zayıflık gizlenmez, ölçülüp yayınlanır.

## Dürüstlük kuralları

Bunlar kod incelemesinde uygulanan kurallardır, süs değil:

- **"Alan yok" demeyiz.** AFAD kaydında görünmüyorsa öyle yazarız — ikisi
  farklı iddiadır.
- **Kapasite hesaplamayız.** Kaç kişi alacağının dayanağı yok; afet anında
  uydurma sayı zarar verir. Yalnız kaba alan (m²).
- **Mesafeler kuş uçuşudur** ve bu ekranda yazar.
- **Can kaybı sayısı üretmeyiz**; yalnız resmî kaynaktan, kurum ve saat
  bilgisiyle aktarılır, paylaşım görsellerinde yer almaz.
- **Boş katman "tehlike yok" demek değildir** — katman kendi boşluğunu açıklar.

## Mimari

Next.js 16 (App Router, SSG) · Tailwind v4 · MapLibre GL **5.24** · Node 24.
Ücretli servis, hesap, veritabanı ve çalışma zamanı bağımlılığı **yok**;
toplanma alanı verisi statik dosyalardır, böylece afet anındaki trafik
patlamasında dinamik uç çökse bile çekirdek çalışır.

```
src/lib/          Ortak saf mantık — TEK KAYNAK. Node 24 TypeScript'i doğrudan
                  çalıştırdığı için hasat betikleri de bu dosyaları kullanır.
src/app/          Sayfalar (SSG) + /api/deprem
src/components/   Harita, uygulama kabuğu, çevrimdışı bileşenleri
scripts/          Hasat · derleme · denetim boru hattı
public/data/      Yayınlanan toplanma alanı verisi
docs/             Ölçülmüş kararlar ve çürütülen alternatifler
```

## Veri boru hattı

```bash
npm run hasat -- --il=71        # tek il (kontrol noktalı, kesilirse sürer)
npm run hasat -- --hepsi        # nüfus sırasıyla ülke geneli
npm run derle                   # ham → yayınlanabilir dosyalar (+ brotli bütçe ölçümü)
npm run denetim                 # KRİTİK bulgu varsa yayın durur
```

Ülke geneli hasat uzun bir iştir (ölçülen hız ~1,3 istek/sn). Gece boyu
kendiliğinden süren döngü:

```powershell
.\scripts\hasat-dongu.ps1
```

Yöntem, ölçümler ve **çürütülen alternatifler** (ör. OSM tohumlu tarama neden
reddedildi, paralel oturum neden daha yavaş): [docs/hasat-kararlari.md](docs/hasat-kararlari.md).

## Geliştirme

```bash
npm install
npm run dev          # http://localhost:3070
npm test             # saf mantık testleri
npx tsc --noEmit
npm run build
```

## Katkı

Hata bildirimi ve düzeltme memnuniyetle. İki şart:

1. **Veri iddiası kanıtlı olsun.** "Şu alan yanlış" diyorsan kaynağı ekle.
2. **Dürüstlük kurallarını bozma.** Eksik veriyi tam gibi gösteren, uydurma
   sayı üreten veya kaynağı gizleyen değişiklikler alınmaz.

## Lisans

**AGPL-3.0-or-later** — [LICENSE](LICENSE).
GeoGow/Algow adları ve logoları lisans kapsamı dışındadır: [NOTICE.md](NOTICE.md).

Kaynaklar: AFAD (toplanma alanları, depremler) · © OpenStreetMap katkıcıları ·
© CARTO. **Resmî uyarı kanalı değildir — acil durumda 112 · AFAD 122.**
