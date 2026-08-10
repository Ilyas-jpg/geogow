# GeoGow — ikinci araştırma turu

**Tarih: 2026-08-10.** Birinci tur `zenginlestirme-yol-haritasi.md`'dir ve
hâlâ geçerlidir; bu dosya onu **değiştirmez, üstüne yazar**.

Aynı kural: buradaki her satır *ölçülmüştür*. "Olabilir" diye yazılan hiçbir
kaynak listeye alınmadı. Ölçüm tarihi ve dönen kod yazılıdır ki altı ay sonra
tekrar denenmesin.

---

## 0. Bu turun özeti

| Bulgu | Sonuç |
|---|---|
| **MGM uyarı kilidi** | 🔓 **AÇILDI** — şema yakalandı, üstelik coğrafyalı arşiv bulundu |
| **Nüfus ağırlıklı kapsam** | ✅ Veri var ve ölçüldü — çürütülen metrik kurtarılabilir |
| **PMTiles çevrimdışı harita** | ⛔ Ölçüldü, **çevrimdışı için çürüdü** · ✅ başka bir iş için sağlam |
| EMSC · USGS · GDACS · Open-Meteo | Ölçüldü; biri hariç **önerilmiyor** (gerekçeli) |

---

## 1. 🔓 MGM — birinci turun açık bıraktığı kilit açıldı

Birinci tur şöyle bitmişti: *"`servis.mgm.gov.tr/web/alarmlar` 200 dönüyor
ama gövde `[]`; şema yakalanamadı, uydurma alan adıyla kod yazılmadı."*
İki ölçümle kapandı.

### 1.1 🔴 `Origin` başlığı ZORUNLU (yeni davranış)

| İstek | Sonuç (2026-08-10) |
|---|---|
| `GET /web/alarmlar` (düz) | **500** · `{"error":"ServerError","message":"Not allowed by MGM"}` |
| `GET /web/alarmlar` + `Origin: https://www.mgm.gov.tr` | **200** |

Birinci turda başlıksız istek 200/boş dönüyordu. MGM sıkılaştırmış. Bu, tek
başına şunu açıklıyor: **"uç boş" sanılan durum aslında engellenmiş istek
olabilir.** Başlıksız çağrıyla "aktif uyarı yok" sonucuna varmak yanlış olurdu.

`Referer` da gönderiliyor ama tek başına belirleyici olan `Origin`.

### 1.2 `/web/alarmlar` şeması (yakalandı)

Ölçüm anında gerçek bir aktif uyarı vardı:

```json
[{"seriNo":"26010427",
  "baslangic":"2026-08-10T16:45:00.000Z",
  "baslik":"Samsun'un Doğusu ile Ordu Çevrelerinde Gök Gürültülü Sağanak Yağışlara Dikkat!",
  "hadiseCinsi":"Gökgürültülü Sağanak Yağış",
  "ihbarTipi":1}]
```

⚠️ Bu uçta **coğrafya yok** — il bilgisi yalnız `baslik` metninin içinde geçiyor.
Başlıktan il ayıklamak kırılgan bir tahmindir; bu uç tek başına kullanılmamalı.

### 1.3 🔑 ASIL BULGU — `/web/meteoalarm`: coğrafyalı, şiddetli, arşivli

| Uç | Sonuç (2026-08-10) |
|---|---|
| `GET /web/meteoalarm` + Origin | **200** · **4.499.874 bayt** · **5.801 uyarı** |
| `GET /web/merkezler/tumu` + Origin | **200** · **247.089 bayt** · **1.105 ilçe merkezi** |
| `GET /web/merkezler/iller` + Origin | **200** · 21.703 bayt · 81 il merkezi, **enlem/boylam ile** |

Kayıt şeması:

```json
{"text":   {"yellow":"…uyarı metni…","orange":"","red":""},
 "weather":{"yellow":["thunderstorm"],"orange":[],"red":[]},
 "towns":  {"yellow":[95201,95202,…],"orange":[],"red":[]},
 "alertNo":2026081002,
 "begin":"2026-08-11T02:00:00.000Z",
 "end":"2026-08-11T12:00:00.000Z"}
```

`towns` dizisindeki sayılar **MGM `merkezId`**'leridir ve
`/web/merkezler/tumu` ile ilçeye çözülür. Ölçülen eşleşme:

| | |
|---|---:|
| Eşleşen ilçe kodu | **205.387** |
| Eşleşmeyen | **204** (%0,1 · örn. `92003`) |

Doğrulanan örnek: `95501 → Samsun / Atakum`. Ölçüm anındaki aktif uyarı
**Ordu + Samsun, 30 ilçe** olarak doğru çözümlendi.

**Şiddet dağılımı (5.801 uyarılık arşiv):** kırmızı **12** · turuncu **876** ·
sarı **5.263**. Yani kırmızı gerçekten nadir — bu, uyarıyı üründe öne çıkarma
kararını kolaylaştırır: kırmızı geldiğinde ekranı kaplaması abartı olmaz.

**Görülen tehlike türleri ve bizim afetlerimizle örtüşmesi:**

| MGM türü | GeoGow afeti |
|---|---|
| `thunderstorm` · `rain` · `snowmelt` | **sel** |
| `wind` | **firtina** |
| `avalanche` | **cig** |
| `hot` | **asiri-sicak** |
| `snow` · `ice` · `fog` · `dust` · `agricultural` | (karşılığı yok) |

**Dokuz afetin dördü** resmî, ilçe kırılımında, üç kademeli ve zaman aralıklı
uyarıyla beslenebiliyor. Heyelan doğrudan bir tür değil ama uyarı metinlerinde
sık geçiyor (metin içinde "heyelan" araması ikinci bir sinyal verir).

#### ⚠️ Dürüstlük sınırları (üründe yazılmalı)
- Çözünürlük **ilçe**dir, poligon değil. "Mahallende uyarı var" denemez;
  "İlçende sarı uyarı var" denir.
- Arşiv **4,5 MB**; üründe yalnız `end > şimdi` olanlar taşınmalı.
- 204 kod eşleşmiyor — eşleşmeyen kod **sessizce yutulmamalı**, sayısı
  denetime yazılmalı (birinci turdaki "boş çıktı yazma" dersinin aynısı).
- MGM kaynak gösterimi ve uyarının **kendi metni** aynen aktarılmalı; özetleyip
  şiddetini değiştirmek resmî uyarıyı çarpıtmak olur.

### 1.4 Bonus — MGM tahmin/gözlem uçları da açık

| Uç | Sonuç | İçerik |
|---|---|---|
| `/web/tahminler/saatlik?istno=…` | **200** | `sicaklik` · **`hissedilenSicaklik`** · `nem` · `ruzgarHizi` · **`maksimumRuzgarHizi`** |
| `/web/tahminler/gunluk?istno=…` | **200** | 5 günlük en düşük/en yüksek sıcaklık ve nem |
| `/web/sondurumlar?merkezid=…` | **200** | anlık sıcaklık, rüzgâr, görüş, yağış (1/6/12/24 saat) |

⚠️ Tuzak: `gunluk` **`gunlukTahminIstNo`**, `saatlik` **`saatlikTahminIstNo`**
ister. Yanlış numarayla 200 döner ama gövde **boş** (2 bayt) — hata vermez,
sessizce boş gelir. Birinci turdaki `TR-6`/`TR-06` tuzağının aynısı.

### 📌 Öneri Ö1 — MGM uyarı şeridi (öncelik: YÜKSEK)
`/afet/<tür>` ve ana sayfada, kullanıcının iline ait **aktif** uyarı varsa
üstte şerit: şiddet rengi + MGM'nin kendi metni + geçerlilik aralığı + kaynak.
Uyarı yoksa hiçbir şey gösterilmez (boş kutu güven kaybettirir).
`hissedilenSicaklik` ile `/afet/asiri-sicak` sayfası "bugün hissedilen 41°"
diyebilir — sayfa artık genel bilgi değil **bugünkü durum** anlatır.

---

## 2. 📊 Nüfus ağırlıklı kapsam — çürütülen metriği kurtaran veri

Birinci turda kaba ızgara kapsamı **haklı olarak yayınlanmadı**: ızgara ilin
tamamını tarıyordu, dağ ve tarla da sayılıyordu, "%30 kapsam" *insanların
%70'i yoksun* demek değildi. Eksik olan tek şey **nüfus ağırlığıydı**.
O veri var ve indirilebilir:

| Veri seti | Ölçüm (2026-08-10) | Not |
|---|---|---|
| **WorldPop TUR 100 m** (`tur_ppp_2020_constrained.tif`) | **200 · 26.529.558 bayt (25,3 MB)** · `image/tiff` | 100 m ızgara, kısıtlı (yerleşim maskeli) |
| **Kontur Population TR** (H3 altıgen, gpkg.gz) | **200 · 33.559.312 bayt (32,0 MB)** | Hazır altıgen, birleştirmesi kolay |

TÜİK tarafında **belgelenmiş açık API bulunamadı** (nip.tuik.gov.tr portal
arayüzü; mahalle nüfusu var ama makine okunur uç yok). Idari veriye
mecbur değiliz — ızgara nüfus zaten daha doğru araç.

**Ne kazandırır:** ürün bugün "mahalle merkezinden en yakın alana mesafe"
üretiyor (medyan, p90, 500 m/1 km içindeki mahalle sayısı). Nüfus ağırlığıyla
bu cümle şuna dönüşür:

> *"Yayındaki 68 ilde, nüfusun %X'i en yakın kayıtlı toplanma alanına
> 500 metreden uzakta."*

Türkiye'de bu sayıyı yayınlayan yok. Sitenin tanıtımda ve eğitimlerde
gösterilecek olması düşünülürse, **manşet değerinde tek çıktı budur.**

#### ⚠️ Dürüstlük sınırları
- Hasat **68/81 il**; sayı ülke geneli diye sunulamaz, kapsam yazılmalı.
- Veri seti **2020** nüfusu; yıl açıkça yazılmalı.
- Lisans atfı zorunlu (WorldPop ve Kontur ikisi de CC-BY ailesi — kullanmadan
  önce sürümün lisans dosyası okunmalı).
- Raster **derleme zamanı** girdisidir, istemciye inmez; 80 KB istemci
  bütçesine dokunmaz.

### 📌 Öneri Ö2 — nüfus ağırlıklı erişim karnesi (öncelik: YÜKSEK)
`/kapsam` sayfası bugün "hangi il yayında"yı gösteriyor. Buna nüfus ağırlıklı
erişim eklenirse karne, zayıflığı gizlemeyen mevcut çizgisiyle tutarlı olarak,
**ülke ölçeğinde bir kamu bulgusu** yayınlamış olur.

---

## 3. 🗺️ PMTiles ile çevrimdışı harita — ÖLÇÜLDÜ, çevrimdışı için ÇÜRÜDÜ

Fikir: raster karo önbelleği yerine tek dosyalık vektör altlık (Protomaps
PMTiles), MapLibre doğrudan okuyor, API anahtarı yok.

| Ölçüm (2026-08-10) | Sonuç |
|---|---|
| Protomaps günlük gezegen derlemesi | **200 · 137.233.667.289 bayt (127,8 GB)** · `Accept-Ranges: bytes` |
| **Kilis** çıkarımı, `--maxzoom=14` | **12,14 MB** (2.605 karo) |
| **İstanbul** çıkarımı, `--maxzoom=14` | **34,14 MB** · süre **31 sn** |
| Bugünkü raster çevrimdışı (İstanbul) | **0,97 MB** (4 dosya) |

⛔ **Varsayılan çevrimdışı indirme olarak ÇÜRÜDÜ.** İstanbul için 34 MB,
bugünkü 0,97 MB'ın **~35 katı**. "Kötü bağlantı, eski telefon" hedefi olan bir
üründe afet öncesi 34 MB indirtmek ürünün kendi sözüyle çelişir.

🔴 **Ölçülen sürpriz:** Kilis gibi küçük bir il bile **12 MB**. "Küçük il ucuz
olur" varsayımı YANLIŞ — z14'te taban geometri her yerde var. Bir daha
"illere böleriz, küçükler hafif olur" denmesin.

✅ **Buna rağmen iki meşru kullanım var:**

1. **İsteğe bağlı "tam çevrimdışı harita"** — ürünün `/hazirlik` felsefesi
   zaten "sakinken hazırlan"; wifi'dayken 34 MB indirmek bir podcast bölümü
   kadar. Varsayılan değil, **açıkça seçilen** bir ek olmalı ve boyutu
   indirmeden önce yazılmalı (bugünkü "ölçülmüş MB'ı geri bildir" davranışı
   aynen sürer).
2. **Çevrimiçi altlığın cartocdn'den alınması** — bugün altlık üçüncü taraf
   CDN'e bağlı ve bu proje **tam da bundan yandı**: CSP `*.basemaps.cartocdn.com`
   ana alan adını kapsamayınca **tüm karolar engellenmişti**. Kendi
   depomuzdaki tek dosya + range isteği, dış bağımlılığı ve o kırılganlığı
   ortadan kaldırır, anahtar da gerektirmez.

### 📌 Öneri Ö3 — altlığı kendi altımıza almak (öncelik: ORTA)
Çevrimdışı iddiası için değil, **bağımlılık ve CSP kırılganlığı** için.
Ölçülmesi gereken tek şey kaldı: sunucu tarafı depolama maliyeti ve
Vercel'in range isteklerindeki davranışı.

---

## 4. Ölçüldü ama önerilmiyor (gerekçeli)

| Kaynak | Ölçüm (2026-08-10) | Karar |
|---|---|---|
| **EMSC FDSN** `seismicportal.eu` | **200** · GeoJSON · anahtarsız | ⛔ **Üçüncü deprem kaynağı önerilmiyor.** AFAD ↔ Kandilli farkı zaten dürüstçe gösteriliyor; üçüncü kaynak "hangisi doğru" sorusunu çözmez, kullanıcıya üç sayı gösterip yükü ona atar. |
| **EMSC "hissettim"** `testimonies-ws` | **200** · JSON · `ev_nbtestimonies` alanı var | 🟡 **Tek yeni sinyal bu.** "Sallandı mı, ben mi?" sorusuna cevap veriyor — AFAD/Kandilli'de karşılığı yok. ⚠️ EMSC kendi belgesinde "gerçek zamanlı güncellenmez" diyor; afet anı ekranına konulamaz, ancak deprem detayında gösterilebilir. |
| **USGS FDSN** | **200** · GeoJSON | ⛔ Türkiye'de pratikte M4,5+ katkısı; AFAD zaten M2+ veriyor. Fazlalık. |
| **GDACS** | **200** · 134.827 bayt GeoJSON | ⛔ Küresel afet listesi; ülke içi çözünürlüğü bizim ihtiyacımızın çok altında. |
| **Open-Meteo** | **200** · anahtarsız · `apparent_temperature` | ⛔ MGM açıldığı için gereksiz. Resmî ulusal kaynak dururken üçüncü taraf modele geçmek, ürünün "resmî kaynağı göster" ilkesine aykırı. Yedek olarak not edilir. |
| **Meteoalarm (Türkiye akışı)** | `feeds.meteoalarm.org/...turkey` → **404** | ⛔ Türkiye akışı yok. |

---

## 5. Önerilerin öncelik sırası

| # | İş | Değer | Emek | Engel |
|---|---|---|---|---|
| **Ö1** | MGM uyarı şeridi (+ hissedilen sıcaklık) | Yüksek — 9 afetin 4'ü canlı veriyle beslenir | Orta | Yok, hepsi ölçüldü |
| **Ö2** | Nüfus ağırlıklı erişim karnesi | Yüksek — ülkede yayınlayan yok | Orta | Hasat 68/81, kapsam yazılmalı |
| **Ö3** | Altlığı cartocdn'den alma | Orta — bağımlılık + CSP kırılganlığı | Yüksek | Depolama maliyeti ölçülmedi |
| Ö4 | EMSC "hissettim" sayısı (deprem detayında) | Düşük-orta | Düşük | Gerçek zamanlı değil |

⏸ Birinci turun bekleyenleri aynen geçerli: `/yayin` + `/basin`, `/ihtiyac`,
topluluk doğrulaması, `/embed`, İngilizce sürüm, Web Push, P8 hasat (13 il).

---

## 6. 🐛 Ölçüm ortamı dersi — indirilen dosya SESSİZCE kesiliyor

Bu turda iki dosya kesik indi ve **ikisi de hata vermedi**:

| Dosya | Beklenen | İlk inen |
|---|---:|---:|
| `meteoalarm.json` | 4.499.874 | **3.900.395** |
| `go-pmtiles…zip` | 17.842.310 | **7.697.433** |

Kesik JSON `JSON.parse`'ta patladı, kesik zip "merkezi dizin yok" dedi — yani
belirti **kaynağa değil kendi indirmene** işaret ediyordu ve bir süre MGM
verisini hatalı sandım. `curl --retry 3 --retry-all-errors` ikisini de düzeltti.

🔑 **Kural: `Content-Length` ile inen boyutu karşılaştırmadan indirilen dosyaya
güvenme.** Bu yalnız araştırma değil, **hasat betikleri için de geçerli** —
sessizce kısa dönen bir yanıt, "veri yok" diye yorumlanabilecek en tehlikeli
hata sınıfıdır ve bu projede tam olarak bu tür hatalar (boş Overpass yanıtı,
AFAD limit sırası) daha önce yakalandı.

---

## 7. Ölçüm komutları (tekrar edilebilirlik)

```bash
# MGM — Origin başlığı olmadan 500 döner
curl -H "Origin: https://www.mgm.gov.tr" https://servis.mgm.gov.tr/web/alarmlar
curl -H "Origin: https://www.mgm.gov.tr" --retry 3 --retry-all-errors \
     -o meteoalarm.json https://servis.mgm.gov.tr/web/meteoalarm
curl -H "Origin: https://www.mgm.gov.tr" https://servis.mgm.gov.tr/web/merkezler/tumu

# PMTiles il çıkarımı (uzak gezegen derlemesinden, range isteğiyle)
pmtiles extract https://build.protomaps.com/20260808.pmtiles ist.pmtiles \
  --bbox=27.95,40.80,29.95,41.62 --maxzoom=14
```

## Kaynaklar

- [SeismicPortal — Web services](https://www.seismicportal.eu/webservices.html)
- [EMSC testimonies servisi (spec)](https://m.emsc-csem.org/Files/epos/specifications/Specs_Testimony-WS.pdf)
- [USGS FDSN Event API](https://earthquake.usgs.gov/fdsnws/event/1/)
- [Protomaps — Basemap downloads](https://docs.protomaps.com/basemaps/downloads)
- [Protomaps — PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre)
- [TÜİK — Adrese Dayalı Nüfus Kayıt Sistemi](https://nip.tuik.gov.tr/Home/Adnks)
- [TÜİK Veri Portalı](https://veriportali.tuik.gov.tr/)
