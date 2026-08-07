# NOTICE — GeoGow

## Yazılım lisansı

GeoGow **AGPL-3.0-or-later** ile lisanslanmıştır. Tam metin: [LICENSE](LICENSE).

Özetle: kodu alabilir, inceleyebilir, değiştirebilir ve kendi sunucunuzda
çalıştırabilirsiniz. Değiştirilmiş bir sürümü **ağ üzerinden hizmet olarak**
sunarsanız, kullanıcılarına kaynak kodunu da sunmak zorundasınız.

MIT/Apache değil, düz GPL de değil: MIT'te kapalı ticari klon serbest olurdu,
düz GPL'de ise "kodu al, sunucunda kapalı çalıştır" boşluğu var. AGPL o boşluğu
kapatır — bu proje kamu yararına açık kalsın diye.

## Marka istisnası

Şu adlar ve görsel kimlik öğeleri **lisans kapsamı dışındadır** ve izinsiz
kullanılamaz:

- **GeoGow** adı ve logosu
- **Algow** adı, wordmark'ı ve sparkle simgesi

Kodu fork edip yayınlayabilirsiniz; ancak ürününüzü GeoGow veya Algow adıyla
sunamaz, bu markaların logolarını kullanamazsınız. Farklı bir ad ve kimlikle
yayınlayın.

## Veri kaynakları ve atıf

| Veri | Kaynak | Not |
|---|---|---|
| Toplanma alanları | **AFAD** — e-Devlet "Afet ve Acil Durum Toplanma Alanı Sorgulama" hizmeti | Kamuya açık, girişsiz sorgulanabilir hizmetten toplanmıştır |
| Depremler | **AFAD** Deprem ve Risk Azaltma Genel Müdürlüğü | Canlı servis; büyüklük ve konum kurumun kendi ölçümüdür |
| Harita altlığı | © **OpenStreetMap** katkıcıları · © **CARTO** | ODbL / CARTO kullanım koşulları |

**Veri lisansı hakkında dürüst not:** AFAD verisi kamuya açık *sorgulanabilir*
bir hizmetten gelir. Bu depoda yer alan işlenmiş veri dosyaları
(`public/data/toplanma/`) uygulamanın çalışması için gereklidir ve kaynağı her
ekranda belirtilir. Kurum tarafından bir itiraz veya kaldırma talebi gelirse
veri dosyaları depodan ve yayından **kaldırılır**; uygulama kodu bundan
bağımsız olarak çalışmaya devam eder (`scripts/toplanma-hasat.mjs` ile
yeniden toplanabilir).

Uygulamada bilinçli olarak **"veri setini indir" butonu yoktur**: haritada
gösterim ile toplu veri yeniden yayını farklı şeylerdir.

## Sorumluluk reddi

GeoGow **resmî bir uyarı kanalı değildir**. Gösterilen bilgiler değişebilir;
sahadaki tabela ve resmî duyurular esastır. Acil durumda **112** ve
**AFAD 122** aranmalıdır.

Yazılım "olduğu gibi" sunulur; AGPL-3.0'ın 15. ve 16. maddelerindeki garanti
reddi ve sorumluluk sınırlaması geçerlidir.
