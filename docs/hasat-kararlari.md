# Hasat kararları ve çürütülen alternatifler

Bu dosya, toplanma alanı hasadında **ölçülerek** alınan kararları tutar.
Amaç: aynı yolu ikinci kez denememek. Her madde bir ölçüme dayanır.

## Kabul edilen yöntem: mahalle temelli hasat

e-Devlet'in kendi il → ilçe → mahalle listesi gezilir; her mahallenin sınır
poligonu alınır (`btn=Sorgula`), poligondan örnek noktalar çıkarılır ve her
nokta için `getAlanlarForNokta` sorulur. Yeni bulunan her alanın kendi
merkezinden de sorularak keşif genişletilir.

**Ölçüm (Kırıkkale, 2026-08-06):** 351 mahalle · 289 benzersiz alan ·
1.028 istek · **2,93 istek/mahalle** · 0 hata · kapsam %100.

## 🔴 WAF tuzağı — `pn` parametresi

POST gövdesine `pn=/afet-ve-acil-durum-…` diye **ham eğik çizgili yol**
koyulursa F5 BIG-IP ASM isteği **HTTP 406** ile reddediyor (gövdede 503
sayfası döner, yanıltıcı). Ölçüm:

| gövde | sonuç |
|---|---|
| `pn` ham | **406** |
| `pn` URL-encoded | 200 |
| `pn` yok | 200 ← seçildi |

Token'ın `{}` süslü parantezleri sorun değil, ham gönderilebiliyor.

## ⛔ Çürütülen: OSM yerleşim noktalarıyla tohumlama

**Hipotez:** Pahalı olan `Sorgula` isteğini (40 KB HTML + yönlendirme, ~2,5 sn)
tamamen atlayıp, OSM'nin `place=*` düğümlerini tohum yapıp yalnız hızlı nokta
sorgularıyla (0,65 sn) taramak. Alanlar zaten `il/ilce/mahalle_adi` taşıdığı
için eşleme yine kurulabilir.

**Ölçüm (Kırıkkale kutusu, 600 OSM yerleşim düğümü, 283 istek, 7 dk):**

| | mahalle temelli (taban) | OSM tohumlu |
|---|---|---|
| Bulunan Kırıkkale alanı | **289** | **189** (%65) |
| Tabanda olup kaçırılan | — | **100** |
| Tabanda olmayıp yeni bulunan | — | **0** |

**Hüküm: reddedildi.** Daha ucuz değil, yalnızca daha eksik. Sebep: e-Devlet'in
mahalle listesi (Kırıkkale'de 351 kayıt) OSM yerleşim düğümlerinin ulaşmadığı
kentsel mahalleleri ve köy birimlerini de kapsıyor; alan kümeleri "en yakın 3"
komşuluğuyla birbirine tam bağlı değil, bu yüzden keşif genişlemesi tek başına
boşlukları kapatmıyor.

## Ölçülen hız ve ülke tahmini

- Nokta sorgusu gecikmesi: **0,57–0,75 sn** (Kırıkkale, Kilis, İstanbul, İzmir'de ölçüldü)
- `Sorgula` gecikmesi belirgin biçimde daha yüksek (40 KB HTML + 302)
- Uçtan uca gözlenen hız: **0,5–1,8 istek/sn** (gün içinde değişiyor)
- Türkiye'de e-Devlet mahalle sayısı Kırıkkale örneğine göre İçişleri listesinden
  ~%29 fazla görünüyor (351 ↔ 273) → kaba ülke tahmini **~65.000 mahalle**
- Beklenen toplam: **~190.000 istek**. Tek oturumda 30–90 saat; bu yüzden
  paralel oturum ve kontrol noktası zorunlu.

## Kontrol noktası tasarımı

İlçe bazlı dosya (`data/ham/<plaka>/<ilceId>.json`) **ve yarım kayıt desteği**
(`tamamlandi:false` + `islenmisMahalleler`). Gerekçe ölçümle çıktı: Kilis'in
MERKEZ ilçesi 157 mahalle ve tek başına süre bütçesini aşıyor; ilçe sınırında
beklemek saatlerce işi çöpe atıyordu.

İl dosyası (`data/ham/<plaka>.json`) **yalnız tüm ilçeler bittiğinde** yazılır —
yarım il dosyası "tamamlanmış" sanılıp bir daha toplanmazdı.

## Bilinçli olarak yapılmayanlar

- **Kapasite (kaç kişi alır) hesaplanmıyor** — dayanağımız yok; afet anında
  uydurma sayı zarar verir. Yalnız kaba alan (m²) yayınlanıyor.
- **Toplu veri indirme butonu yok** — veri kamuya açık *sorgulanabilir*;
  toplu yeniden yayın ayrı bir konu (TKGM dersinin aynısı).

## ⚖️ Paralellik ölçüldü — çok işçi DAHA YAVAŞ

**Hipotez:** darboğaz sunucu gecikmesi olduğuna göre 3 paralel oturum hızı 3'e
katlar.

**Gerçek (2026-08-06, ~1,5 saatlik sürekli hasat sonrası):**

| Ayar | Sonuç |
|---|---|
| 3 işçi · 260 ms | **0,44–0,56 istek/sn**, hata oranı **%11** (curl çıkış 35/56 — servis bağlantıyı düşürüyor) |
| 1 işçi · 700 ms | **1,00 istek/sn**, **322 istekte 0 hata** |

**Hüküm:** e-Devlet önündeki WAF paralelliği IP başına cezalandırıyor; düşürülen
bağlantılar yeniden denemeye dönüşüyor ve toplam iş azalıyor. **Varsayılan
1 işçi + 700 ms.** İstemciye ayrıca **uyum denetimi** eklendi: her hata istek
aralığını 1,8× büyütüyor (tavan 6 sn), her başarı %8 geri getiriyor — yani
servis geri ittiğinde betik kendiliğinden yavaşlıyor.
