# GeoGow — marka kimliği

Bu belge **bağlayıcıdır**. Site, kılavuzlar, basın görselleri, sunumlar ve
sosyal medya görselleri buradaki değerlerle üretilir.

## 1. Logo

Logo **tek renk değildir**: `Geo` turkuaz gradyanlı, `Gow` nötr (koyu zeminde
beyaz, açık zeminde siyah). İki parça birbirinden ayrılmaz.

| Dosya | Kullanım |
|---|---|
| `public/marka/geogow-wordmark.png` | **Ana kilit** — koyu zemin (sitenin başlığı) |
| `public/marka/geogow-wordmark-acik.png` | Açık zemin — basılı iş, beyaz sayfa |
| `public/marka/geogow-isaret.png` | Yalnız `Geo` işareti — kare alanlar, avatar, favicon |
| `public/marka/ikon-192.png` · `ikon-512.png` | Uygulama ikonu (koyu tuval üstünde işaret) |
| `public/marka/geogow-wordmark-siyah.png` · `-beyaz.png` | Tek renk gereken yerler (faks, tek renk baskı, gravür) |

### Yasaklar
- **Wordmark'ı metin olarak dizme.** Logo bir görseldir; `<h1>GeoGow</h1>` ile
  yazmak marka ihlalidir (tasarım anayasası §5).
- Fontla, kendi çizimimizle ya da AI ile **yeniden üretme**.
- Oranını bozma, döndürme, gölge/kontur ekleme, gradyanı değiştirme.
- `Geo` ile `Gow` arasındaki boşluğu değiştirme.
- Kalabalık fotoğraf üstüne doğrudan koyma — gerekiyorsa koyu bir zemin bloğu.

### Boşluk ve en küçük boyut
Logo çevresinde en az **`G` harfinin yüksekliği kadar** boşluk bırakılır.
Ekranda en küçük yükseklik **24 px**, baskıda **8 mm** — altında `Gow`
okunmuyor, o boyutlarda yalnız `Geo` işareti kullanılır.

## 2. Renk

Değerler **logo dosyasından pikselle ölçülmüştür**, tahmin edilmemiştir
(`public/marka/kunye.json` üretim kaydını tutar).

| Ad | Hex | Kullanım |
|---|---|---|
| **Marka turkuazı** | `#05e1f5` | Birincil eylem, bağlantı, seçili durum, `Geo` gradyanının başı |
| **Marka koyusu** | `#009db4` | Gradyanın sonu, ikincil vurgular |
| **Turkuaz üstü metin** | `#06232b` | Turkuaz zemin üzerine yazı |
| Zemin | `#0b0d10` | Ana koyu zemin |
| Yüzey | `#12151a` · `#1a1f26` | Kart, panel |
| Çizgi | `#262c35` | Ayraç, kenarlık |
| Metin | `#f2f4f7` · `#b8c0cc` · `#8b93a1` | Birincil · ikincil · üçüncül |

### Ölçülmüş kontrast (WCAG)
| Kombinasyon | Oran | Hüküm |
|---|---:|---|
| Turkuaz metin, koyu zemin | **12,13** | ✅ |
| Turkuaz zemin, **beyaz** yazı | **1,60** | ⛔ **Kullanma** — okunmaz |
| Turkuaz zemin, `#06232b` yazı | **10,21** | ✅ Düğme standardı |
| Marka koyusu, koyu zemin | 6,01 | ✅ |

### Anlam renkleri — dörtten fazlası eklenmez
`#35c48a` güvenli/toplanma alanı · `#f2a33c` uyarı · `#ff5d5d` kritik ·
turkuaz marka/eylem. **Renk tek başına bilgi taşımaz**; her zaman ikon veya
metin eşlik eder.

## 3. Tipografi

**Inter** (latin + latin-ext; `latin-ext` olmadan ş/ğ/ı düşer).
Gövde mobilde **17 px** — afet anında okunabilirlik bir güvenlik meselesidir.
Satır uzunluğu 60–75 karakter. Sayılar tabular.
Modern grotesk dışına çıkılmaz; **serif yalnız logonun `Gow` parçasındadır**,
arayüzde serif kullanılmaz.

## 4. Ton

- Kısa, sakin, jargonsuz cümle. Panik dili ve sansasyon fiili yok.
- **Belirsizlik gizlenmez:** "AFAD kaydında görünmüyor" ✓ · "alan yok" ✗
- Kaynak ve tarih her zaman görünür.
- Ölçülmemiş sayı yazılmaz. Kapasite, tahmini can kaybı, "muhtemel" ifadeleri yok.
- Her yüzeyde: *"Resmî uyarı değildir. Acil durumda 112 · AFAD 122."*

## 5. Kılavuz ve basılı iş şablonu

Gelecekte üretilecek kılavuzlar (afet çantası, mahalle broşürü, okul afişi) bu
iskeleti kullanır:

- **Kapak:** koyu zemin (`#0b0d10`), logo sol üstte, başlık Inter 600, altında
  tek satır turkuaz ayraç çizgi.
- **İç sayfa:** beyaz zemin + `geogow-wordmark-acik.png`; başlıklar siyah,
  vurgular marka koyusu (`#009db4` — beyaz üzerinde turkuazdan okunaklı).
- **Uyarı kutusu:** `#f2a33c` kenarlık + ikon; kritik kutu `#ff5d5d`.
- **Alt bilgi:** kaynak satırı + "Resmî uyarı değildir" + geogow.net.
- Görsel gerekiyorsa **fotogerçekçi**; soyut AI konsept, parlayan cam, partikül
  kullanılmaz.

## 6. Varlıkları yeniden üretme

Kaynak: `geogowlogo.png` (İlyas, 2026-08-07 — şeffaf zeminli, 2000×2000).

```bash
node scripts/marka-varlik-uret.mjs [kaynak.png]
```

Betik kırpma sınırlarını ve gradyanı **kaynaktan ölçer**; elle hex girilmez.
`Geo`/`Gow` ayrım noktası da sütun boşluğundan bulunur (ölçülen: x=900, %52).

## 7. Lisans

GeoGow ve Algow adları, wordmark'ları ve logoları **AGPL-3.0 kapsamı
dışındadır** ([NOTICE.md](../NOTICE.md)). Kod fork edilebilir; marka
kullanılamaz.
