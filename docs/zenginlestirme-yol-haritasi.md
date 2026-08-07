# Geogow — zenginleştirme yol haritası

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
