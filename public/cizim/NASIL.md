# Anlatım görselleri — buraya konur

ChatGPT'de üretilen görseller **bu klasöre** şu adlarla konur:

| Dosya | Nerede kullanılacak |
|---|---|
| `cok-kapan-tutun.png` | `/afet/deprem` ve `/afet-ani` deprem kartı |
| `duman-altinda.png` | `/afet/bina-yangini` |
| `canta-bos.png` · `canta-yarim.png` · `canta-dolu.png` | `/hazirlik` — üç durum, ilerlemeye göre geçiş yapılır |
| `orman-yangini-tahliye.png` | `/afet/orman-yangini` |
| `kbrn-iceride-kal.png` | `/afet/kbrn` |

## Zorunlu teknik şartlar

- **PNG, zemin `#0b0d10` (şeffaf DEĞİL).** ChatGPT şeffaf PNG'yi güvenilir
  vermiyor; sayfa zeminiyle aynı düz koyu renk istemek daha sağlam sonuç
  veriyor ve kart içinde kutu gibi durmuyor.
- **En az 1024 px** kenar. Üç panelli çizim için 1536×640.
- **Dosya boyutu 200 KB altı.** Bu ürünün iddiası kötü bağlantıda açılmak;
  gelen görsel `pngquant` veya `squoosh` ile sıkıştırılır.
- Görselin **içinde yazı olmasın.** Etiketler (ÇÖK / KAPAN / TUTUN, "15 cm")
  HTML ile yazılıyor: hem seçilebilir ve aranabilir olsun hem de İngilizce
  sürümde görseli yeniden üretmek gerekmesin.

## Renk sözlüğü (görselde bunlara sadık kalınmalı)

| Ne | Hex |
|---|---|
| İnsan figürü | `#dfe5ec` |
| Doğru / güvenli (masa, temiz hava) | `#35c48a` |
| Yanlış / tehlike (duman, su) | `#ff5d5d` |
| Yapı / zemin / mobilya | `#4a5563` |
| Vurgu, ölçü çizgisi | `#05e1f5` |

⚠️ Marka turkuazı `#05e1f5` logodan pikselle ölçüldü. Görsel üreticisi hex
tutturamazsa sorun değil — **turkuaz yalnız ölçü/vurgu çizgisinde geçer**,
markayı temsil etmez. Logo, wordmark veya marka bloğu görsel içinde
ÜRETİLMEZ (tasarım anayasası md.5).

## Geldiğinde ne oluyor

`src/components/AfetCizim.tsx` içindeki `FIGURLU_CIZIM_YAYINDA` bayrağı
açılır ve elle çizilmiş SVG figürlerin yerine bu görseller bağlanır.
Elle çizilen sürüm silinmedi; karşılaştırma için duruyor.
