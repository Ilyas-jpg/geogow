# GeoGow — zenginleştirme yol haritası

**Araştırma turu: 2026-08-07.** Aşağıdaki her satır *ölçülmüştür*; "olabilir"
diye yazılan hiçbir kaynak listeye alınmamıştır. Ölçüm tarihleri ve dönen
kodlar yazılıdır ki altı ay sonra tekrar denenmesin.

---

## 1. Ölçülen kaynaklar

### ✅ Kullanılabilir — sıraya girdi

| Kaynak | Uç | Ölçüm (2026-08-07) | Ne kazandırır |
|---|---|---|---|
| **MGM meteorolojik uyarı** | `servis.mgm.gov.tr/web/alarmlar` | **200**, JSON dizi, şu an `[]` (aktif uyarı yok) | Sel/fırtına/kar uyarısı katmanı — planın "sel" ayağı |
| **Kandilli (KOERI)** | `koeri.boun.edu.tr/scripts/lst0.asp` | **200**, 72 KB, sabit genişlikli sütun | Depremde **ikinci kaynak**; iki kurumun farklı büyüklüğü gizlenmez |
| **OSM acil altyapı** | Overpass | eczane **28.360** · okul **24.945** · spor sahası **25.951** · hastane **3.242** · klinik **3.510** · polis **2.596** · itfaiye **699** | Alan çevresindeki destek noktaları |
| **AFAD TDTH tehlike** | `tucbs-public-api.csb.gov.tr/trk_afad_tdth_wms` | **200**, 97 katman `queryable=1` | "Zeminimin deprem tehlikesi" katmanı |

> ⚠️ MGM ucu **bulundu ama şeması bilinmiyor**: liste şu an boş. Şema ilk
> gerçek uyarıda yakalanıp fixture'a alınacak. Uydurma alan adıyla kod
> yazılmayacak.
>
> ⚠️ TDTH **görüntüleme çalışır, nokta sorgusu henüz çalışmıyor**:
> `GetFeatureInfo` 1.1.1 ve 1.3.0 denendi, ikisi de **400**. Katmanlar
> sorgulanabilir işaretli, yani parametre uyumsuzluğu — çözülmeden "zeminin
> ivmesi şu" yazılmayacak.

### ⛔ Ölçüldü, kapalı çıktı — tekrar denenmeyecek

| Deneme | Sonuç |
|---|---|
| **MTA diri fay** | 5 aday host: `tucbs/trk_mta_dirifay_wms` **500** · `yerbilimleri.mta.gov.tr/arcgis` **404** · `gisserver` / `webgis` / `harita.mta.gov.tr` **DNS yok**. **Fay katmanı yayınlanmayacak** — uydurma fay çizgisi tehlikeli dezenformasyondur |
| **KGM yol durumu** | `yolgozlem.kgm.gov.tr` **DNS yok** · KGM yol durumu sayfası **404** |
| **OSM toplanma noktaları** | Türkiye'de yalnız **683** kayıt. Bizim AFAD hasadı 8 ilde zaten **9.912**. Tamamlayıcı değil, gürültü — kullanılmayacak |
| **Bluesky** | Teknik olarak anahtarsız çalışıyor ama Türkiye'de afet anındaki hacmi yok. Düşürüldü (İlyas 2026-08-06) |
| **X/Twitter** | API ücretli |

---

## 2. Elimizdeki veriden üretilebilecek yeni bilgi

### 🔴 Ölçüldü ve YAYINLANAMAZ hâli tespit edildi: kaba boşluk analizi

500 m yürüme eşiğiyle 250 m'lik ızgara taraması yapıldı:

| İl | Izgara hücresi | 500 m içinde | Medyan en yakın |
|---|---:|---:|---:|
| İstanbul | 51.792 | %30 | 831 m |
| Bursa | 19.556 | %27 | 891 m |
| Ankara | 45.852 | %21 | 1.016 m |
| İzmir | 98.416 | %17 | 1.029 m |
| Konya | 18.568 | %11 | 1.142 m |

**Bu sayılar bu hâliyle YANILTICIDIR ve yayınlanmayacaktır:** ızgara ilin
tamamını tarıyor, yani dağ, tarla ve boş arazi de sayılıyor. "%30 kapsam"
*insanların %70'i yoksun* demek DEĞİL. Nüfus/yerleşim ağırlığı olmadan bu
metrik tam da kendi kuralımızın yasakladığı türden — ölçülebilir ama yanlış
okunmaya açık.

### ✅ Doğru yolu bulundu — ucuz düzeltme

Hasat sırasında **her mahallenin sınır poligonu zaten çekiliyor** (`Sorgula`
isteği) ama yalnız örnek nokta üretmek için kullanılıp **atılıyor**. Kontrol
noktasına mahallenin merkezi ve kaba alanı yazılırsa:

- her mahalle için **"merkezden en yakın toplanma alanına mesafe"** hesaplanır
- bu **yerleşim başına** bir ölçüdür, dağ-tarla bulaşmaz
- **sıfır ek istek** — veri zaten geliyor, sadece kaydedilmiyor

Bu, Türkiye'de kimsenin yayınlamadığı bir ölçü olur: *"Mahallenizin en yakın
kayıtlı toplanma alanı X metre uzakta."* Hasadı biten iller için yeniden
toplama gerekir; öncelik, hasat sürerken bu alanın **hemen eklenmesidir** ki
kalan 73 il tek seferde toplansın.

---

## 3. Öncelik sırası

### P0 — hasat sürerken yapılmalı (geri dönüşü pahalı)
1. **Mahalle merkezi + alanı kontrol noktasına yazılsın.** Sıfır ek istek;
   yapılmazsa 81 ilin tamamı ikinci kez toplanır.
2. **Kandilli ikinci deprem kaynağı.** Sabit genişlikli ayrıştırıcı + fixture
   testi. İki kurumun farkı gizlenmez, ikisi de gösterilir.

### P1 — ürünün eksik ayakları (plan borcu)
3. **MGM uyarı katmanı** — uç hazır, şema ilk uyarıda yakalanacak.
4. **`/hazirlik`** — afet çantası + aile buluşma planı, tamamı cihazda,
   yazdırılabilir. Sıfır veri bağımlılığı, yüksek değer.
5. **`/ihtiyac`** — İhtiyaç Haritası / AFAD 122 / 112 yönlendirmeleri,
   kapsamları dürüstçe.
6. **`/yayin` + `/basin`** — haber kanallarının ekrana verebileceği görünüm.
   Planın ayırt edici maddesi, hâlâ yapılmadı.

### P2 — kapsam genişletme
7. **OSM acil altyapı katmanı** (hastane · itfaiye · eczane) — sayılar ölçüldü,
   ODbL atfı zorunlu.
8. **Topluluk doğrulaması** — "bu alan yerinde mi / tabelası var mı".
   Oylamadan daha dar ve daha yararlı bir kullanıcı girdisi: alan kaydının
   sahadaki gerçekle uyumu. Kötüye kullanım yüzeyi küçük.
9. **Belediye/haber gömme (`/embed`)** — organik dağıtım.
10. **TDTH tehlike katmanı** — görüntüleme hazır; nokta sorgusu çözülürse
    "zeminimin tehlikesi" eklenir.

### P3 — büyük işler
11. **AR + KU dil** (RTL dahil) — deprem bölgesindeki gerçek nüfus.
12. **Haber + resmî Telegram kanalı sinyalleri** — yangın projesinin olgun
    mantığı taşınır (5 bilinen tuzak testli).
13. **Web Push** (kendi VAPID'imizle) — M≥4,5 deprem uyarısı; abonelik
    saklamanın gizlilik bedeli ayrıca tartışılmalı.

---

## 4. Bilinçli olarak listede olmayanlar

- **Sığınak verisi** — açık kaynak bulunamadı.
- **Kayıp kişi / enkaz bildirimi** — sorumluluk ve yanlış umut riski taşınabilir
  değil.
- **Kapasite hesabı** — dayanak yok.
- **Kitlesel push (İKAS/Cell Broadcast)** — devlet tekelinde.
- **Elektrik/su kesintisi** — dağıtım şirketlerinde tek tip açık uç yok;
  81 ilde 21 ayrı şirket demek, bakımı sürdürülemez.

---

## 5. Uygulanan P0 işleri (2026-08-07)

### ✅ Mahalle merkezi kaydı — sıfır ek istek

Hasat sırasında çekilen mahalle poligonundan merkez ve kaba alan artık
kontrol noktasına yazılıyor (`mahalleler: [{id, ad, enlem, boylam, alanM2}]`).
Doğrulandı: Kilis/POLATELİ 33/33 mahalle, koordinat + alan tam.

Derleme adımı bundan **yerleşim tabanlı erişim ölçüsü** üretiyor: mahalle
merkezinden en yakın toplanma alanına mesafenin medyanı, %90'lık dilimi ve
500 m / 1 km içindeki mahalle sayısı. Kaba ızgara analizinin (dağ-tarla da
sayıyordu) yerine geçen dürüst metrik budur.

⚠️ Hasadı bu değişiklikten önce biten 8 il için merkez verisi yok; o iller
`--force` ile yeniden toplanana kadar erişim ölçüsü boş kalır.

### 🔴 AFAD deprem ucunda SESSİZ VERİ KAYBI bulundu ve düzeltildi

**Bulgu:** AFAD `limit` parametresini **sıralamadan ÖNCE** uyguluyor.
`orderby=timedesc` yalnız sunum sırasını etkiliyor. Ölçüm (2026-08-07):
24 saatlik pencere + `limit=8` → dönen 8 kayıt günün **en ESKİ** depremleri
(00:01–01:51), oysa o an en yenisi 09:24'tü.

**Bedeli, artçı serisinde ölçüldü — 6 Şubat 2023, 24 saatlik pencere, M2+:**

| Yöntem | Kayıt | Görülen en yeni deprem |
|---|---:|---|
| Tek istek (`limit=400`) | 400 | **17:11** — günün son 7 saati görünmüyor |
| Dilimli (3 saatlik parçalar) | **561** | 00:01 (pencerenin sonu) |

Yani uygulama, artçı serisi sürerken **7 saat geriden** gösterirdi ve hiçbir
hata vermezdi. Tam olarak ürünün var olma sebebindeki senaryo.

**Çözüm:** pencere 3 saatlik dilimlere bölünüp her dilim ayrı sorulur; bir
dilim limite dayanırsa ikiye bölünüp yeniden denenir (en fazla 3 kademe).
Sonuçlar kimliğe göre birleştirilir. `dilimler()` + `birlestir()`, 2 test.

---

## 6. İkinci tur — 2026-08-07 akşamı

### ✅ Yapıldı: afet davranış içeriği (P1 #4'ün genişletilmiş hâli)

`src/lib/afet.ts` dokuz afet türünün TEK kaynağı (an adımları, varyantlar,
öncesi, sonrası, mitler, kaynaklar). Bundan beslenen yüzeyler:
`/afet-ani` · `/afet/<tür>` (9 SSG sayfa) · `/mitler` · `/hazirlik`.

**`/afet-ani` sıfır JavaScript:** açılır kartlar `<details>` ile yapıldı,
React state kullanılmadı. Gerekçe: afet anında JS paketi inmemiş ya da çökmüş
olabilir; bu ekranın çalışmama hakkı yok. Ölçüldü — 9 details, hepsi kapalı
açılıyor, `checkVisibility()` false, `group-open` varyantı doğru çalışıyor.

**Servis çalışanı v2:** kabuk önbelleği 4 → 16 yol (afet-ani + 9 afet sayfası
+ hazirlik + mitler). Aynı sırada gerçek bir kırılganlık düzeltildi:
`cache.addAll` ATOMİKTİR, 16 yoldan biri düşse kabuk tamamen boş kalırdı;
yollar artık `Promise.allSettled` ile tek tek ekleniyor.

### ✅ Yapıldı: OSM acil altyapı katmanı (P2 #7)

`npm run altyapi -- [plaka…]` · `public/data/altyapi/<plaka>.min.json`.
8 il · **2.313 nokta** · toplam **34 KB brotli** (İstanbul tek başına 16,4 KB;
toplanma verisinin üstüne binince 77,8 KB, 80 KB bütçesinin altında ve yalnız
katman açılınca iniyor).

| İl | Nokta | | İl | Nokta |
|---|---:|---|---|---:|
| İstanbul | 1.187 | | Konya | 177 |
| Ankara | 376 | | Bursa | 120 |
| İzmir | 242 | | Kırıkkale | 19 |
| Antalya | 186 | | Kilis | 6 |

⛔ **Eczane bilerek dışarıda:** ülke genelinde ~28.000 kayıt veri bütçesini tek
başına yiyor ve afet anında nöbetçi olmayan eczane kapalı.

🔴 **Hasatta iki gerçek hata yakalandı:**
- **ISO 3166-2 kodu sıfır dolgulu** (`TR-06`), dolgusuz `TR-6` sorulunca
  Overpass hata VERMİYOR, boş liste dönüyor. Ankara ve Antalya "0 nokta"
  olarak kaydedilmişti — tek haneli plakalı 8 ilin tamamını sessizce boşaltan
  bir hata.
- Betik **boş çıktıyı yine de yazıyordu**. Artık sıfır nokta arıza sayılıyor
  ve dosya yazılmıyor: boş dosya kullanıcıya "burada hastane yok" yalanını
  söyletir.
- Ayrıca: HTTP başlığı ByteString'dir, user-agent'taki Türkçe `ı` fetch'i
  daha istek kurulmadan düşürüyordu; ve deterministik hatalar artık yeniden
  denenmiyor (60 sn boşa bekleniyordu).

### 🔴 Yakalanan ürün hatası: YANLIŞ İL SEÇİLİYORDU

`ilAdaylari()` içinde **konumu kapsayan iller hiç sıralanmıyordu** ve
`ozet.json`'daki plaka sırasıyla dönüyordu. İl kutuları dikdörtgen olduğu için
fazlasıyla çakışıyor — ölçüldü: **Kırıkkale merkezi (39,8468 / 33,5153) hem
Kırıkkale'nin hem Ankara'nın kutusunda.** Plaka sırası Ankara'yı (6) öne
koyduğundan Kırıkkale'deki kullanıcıya **Ankara dosyası** iniyor ve "en yakın
toplanma alanı" **24,1 km** çıkıyordu; oysa Kırıkkale'nin kendi 264 alanı
%100 kapsamla yayında.

Düzeltme: kapsayan grup da il merkezine uzaklığa göre sıralanıyor
(Kırıkkale 20 km, Ankara 82 km). Ölçülen sonuç: **24,1 km → 330 m** (4 dk
yürüme), doğru tabela kodlarıyla (7101-…). 4 test eklendi (`ilSecimi.test.ts`).

### ⛔ TDTH tehlike katmanı — ÖLÇÜLDÜ, YAYINLANMAYACAK

| İstek | Sonuç (2026-08-07) |
|---|---|
| GetCapabilities | **200** · 97 katman, `queryable="1"` · PGA katmanları: 54=`PGA_72` · 58=`PGA_475` · 62=`PGA_43` · 66=`PGA_2475` |
| GetMap (katman 58) | **200** · image/png · 4.655 bayt — görüntüleme çalışıyor |
| GetLegendGraphic | **400** |
| GetFeatureInfo | **hepsi başarısız** |

GetFeatureInfo'da sebep bulundu ama çözülmedi: sunucu `info_format`'ı hiç
okumuyor (`The requested format: null`), **`format`** parametresini okuyor —
ama GetCapabilities'in kendi ilan ettiği üç formatın (`text/xml`,
`text/plain`, `application/json`) **üçünü de reddediyor**. Yani servisin
GetFeatureInfo'su yapılandırma olarak bozuk.

**Karar:** lejantsız ve sorgulanamaz bir raster örtü, kullanıcının ne anlama
geldiğini okuyamayacağı renkli bir blob demektir — marka anayasası §2 "renk
tek başına bilgi taşımaz" kuralının doğrudan ihlali. Katman eklenmedi.
Servisin GetFeatureInfo'su düzelirse "zeminimin ivmesi" özelliği açılabilir.

### ⏸ MGM uyarı katmanı — hâlâ şema bekliyor

`servis.mgm.gov.tr/web/alarmlar` yeniden ölçüldü (2026-08-07): **200**, gövde
`[]` (2 bayt), aktif uyarı yok. Şema yakalanamadı, uydurma alan adıyla kod
yazılmadı. İlk gerçek uyarıda fixture'a alınacak.
