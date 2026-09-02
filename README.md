# Trade Empire — V2 (Part 1)

Mobil öncelikli, tek dosyalık bir ticaret ve şirket büyütme oyunu.
Tüm oyun `index.html` içindedir: harici backend, framework veya bağımlılık yoktur.
Dosyayı bir tarayıcıda açmak yeterlidir.

## Oynanış

10.000 $ sermaye ile küçük bir tüccar olarak başlarsınız. Alüminyum, bakır ve
buğdayı ucuza alıp depolar, fiyatlar yükseldiğinde satar ve şirket değerinizi
büyütürsünüz. Her "Sonraki Gün" ile piyasa hareket eder ve haberler fiyatları
etkiler.

Asıl para, spot alım satımda değil **sözleşmelerde**: müşteri şirketler belirli
bir üründen belirli bir miktarı, piyasa fiyatının üzerinde bir fiyattan ve son
teslim gününe kadar ister. Kabul ettiğinizde fiyat sabitlenir; piyasa ise
hareket etmeye devam eder. Malı zamanında bulup teslim etmek sizin işiniz.

- **Piyasa** — fiyatlar, günlük değişim, trend grafiği, alış/satış, süresi
  daralan sözleşme uyarıları
- **Depo** — kapasite, stoklar, ortalama maliyet, açık kâr/zarar, taahhüt
  uyarıları, depo geliştirme
- **Ticaret** — Fırsatlar (gelen talepler), Aktif Sözleşmeler ve Geçmiş
- **Şirket** — şirket değeri, ünvan ilerlemesi, itibar kademesi, depo seviyesi
- **Profil** — ses, yeni oyun, sıfırlama

İlerleme `localStorage` ile otomatik kaydedilir; sayfa yenilendiğinde oyun
kaldığı yerden devam eder.

## Sözleşme döngüsü

```
teklif (Fırsatlar)  --kabul-->  aktif sözleşme  --teslim-->  tamamlandı  (+3 itibar)
       |                              |
  süresi dolar               son gün geçer -> gecikmiş (ceza kesilir)
                                      |
                            +-- telafi süresinde teslim -> ödeme alınır (-5 itibar)
                            +-- telafi süresi dolar ------> kaçırıldı     (-8 itibar)
```

- Teslimat **depodan** yapılır: sözleşme miktarının tamamı depoda olmalıdır.
- Fiyat kabul anında sabitlenir. Piyasa yükselirse malı pahalıya tamamlarsınız,
  düşerse kâr büyür. Risk buradadır.
- Son gün geçtiğinde ceza **bir kez** kesilir ve sözleşme telafi süresine girer;
  bu sürede teslim ederseniz ödemeyi yine alırsınız.
- İptal etmek hem cezayı hem de en büyük itibar kaybını getirir.

### İtibar (0-100)

İtibar; teklif sıklığını, sipariş büyüklüğünü, piyasa üstü primi, hangi
müşterilerin size ulaştığını ve aynı anda taşıyabileceğiniz sözleşme sayısını
belirler.

| Kademe | İtibar | Eşzamanlı sözleşme |
| --- | --- | --- |
| Bilinmeyen Tedarikçi | 0+ | 2 |
| Güvenilir Tedarikçi | 25+ | 3 |
| Tercih Edilen Tedarikçi | 50+ | 4 |
| Stratejik Ortak | 75+ | 5 |

Siparişler oyuncunun karşılayabileceği hacimle sınırlanır (şirket değerinin bir
payı + depo kapasitesi). Bu yüzden başlangıçta buğday ve alüminyum talepleri
gelir; bakır gibi pahalı ürünlerin büyük siparişleri siz büyüdükçe açılır.

## Piyasa modeli

Fiyatlar rastgele zıplamaz. Her ürünün temel fiyatı, volatilitesi ve mantıklı
bir min/max aralığı vardır. Günlük fiyat şu üç bileşenden oluşur:

```
yeni fiyat = fiyat × (1 + geri çekilme + trend + gürültü + haber etkisi)
```

- **Geri çekilme (mean reversion):** fiyat temel fiyatına doğru çekilir
- **Trend (momentum):** AR(1) süreci, birkaç gün süren yönelimler üretir
- **Gürültü:** ürüne özgü volatilite
- **Haber etkisi:** aktif olayların 1-3 gün süren yönlü etkisi

Rastgelelik, kayıtla birlikte saklanan bir seed üzerinden deterministik olarak
üretilir (mulberry32).

## Kod mimarisi

Kod, ileride yeni sistemler eklenebilecek şekilde bağımsız modüllere ayrılmıştır:

| Modül | Sorumluluk |
| --- | --- |
| `CONFIG` | Tüm oyun dengesi ve içerik (ürünler, depo seviyeleri, ünvanlar, olaylar) |
| `Utils` | Format, matematik, DOM yardımcıları |
| `GameState` | Tek doğruluk kaynağı + türetilmiş değerler + RNG |
| `MarketSystem` | Fiyat modeli ve trend/sparkline |
| `InventorySystem` | Stok ve ağırlıklı ortalama maliyet |
| `TradingSystem` | Al/sat işlemleri, limit kontrolleri, işlem kaydı |
| `EventSystem` | Haber üretimi ve piyasa etkisi |
| `CompanySystem` | Ünvan/seviye ve depo yükseltmeleri |
| `ReputationSystem` | 0-100 itibar, kademeler ve etkileri |
| `ContractSystem` | Müşteri talepleri, sözleşme yaşam döngüsü, ceza ve teslimat |
| `SaveSystem` | localStorage kalıcılığı, şema doğrulama/migrasyon |
| `Audio` | WebAudio geri bildirimi (harici ses dosyası yok) |
| `UI` | Ekran render'ı, bottom sheet, animasyonlar |
| `Game` | Akış kontrolü (init, gün ilerletme) |

Yeni bir ürün eklemek için `CONFIG.PRODUCTS`'a bir eleman, yeni bir haber için
`CONFIG.EVENTS.POOL`'a bir kayıt eklemek yeterlidir. Ülke, lojistik, çalışan,
fabrika, banka/kredi ve rakip şirket sistemleri kendi modülleri olarak eklenip
`GameState` üzerinden bağlanabilir.

Konsoldan hata ayıklama ve test için tüm modüller `window.TradeEmpire` altında
erişilebilirdir.

## Kapsam ve yol haritası

- **V1** — spot ticaret, depo, piyasa modeli, haberler ✅
- **V2 Part 1** — müşteriler, sözleşmeler, itibar ✅ *(bu sürüm)*
- **V2 Part 2** — tedarikçiler ve spot piyasa ayrımı (farklı fiyat, minimum
  miktar ve teslim süresiyle alternatif kaynaklar)
- **V3+** — ülkeler/şehirler, lojistik, çalışanlar, banka/kredi, fabrikalar,
  rakip şirketler, ihaleler

Ülkeler, gemiler, fabrikalar, bankalar, çalışanlar, rakip şirketler ve
multiplayer bu sürümde **bilinçli olarak yoktur**. Sözleşme sistemi, sonradan
eklenecek geminin/fabrikanın/çalışanın oyunda gerçek bir sebebi olsun diye önce
kuruldu.

## Test

Playwright ile üç ayrı takım çalışır (toplam 220 kontrol):

- `test.js` — V1 çekirdeği: alım/satım, ağırlıklı ortalama maliyet, gün
  ilerleme, haber etkisi, depo yükseltme, kayıt/yenileme, mobil yerleşim
- `test-v2.js` — sözleşme mantığı: teklif üretimi, limitler, teslimat, ceza,
  gecikme, iptal, itibar sınırları, kayıt göçü (V1 kaydı dahil), bozuk veri
- `test-ui-v2.js` — dokunmatik akış: kabul/teslim/iptal, uyarılar, rozetler,
  4 ekran boyutunda taşma kontrolü
