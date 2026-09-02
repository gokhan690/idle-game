# Trade Empire — V2 (Part 2)

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

Malı nereden alacağınız da bir karardır: spot piyasa anında teslim eder ama
pahalıdır; tedarikçiler daha ucuzdur fakat mal yolda gün harcar ve parayı
sipariş anında ödersiniz.

- **Piyasa** — fiyatlar, günlük değişim, trend grafiği, alış/satış, süresi
  daralan sözleşme uyarıları
- **Depo** — kapasite, stoklar, ortalama maliyet, açık kâr/zarar, taahhüt
  uyarıları, yoldaki mallar, depo geliştirme
- **Ticaret** — Fırsatlar, Aktif Sözleşmeler, Tedarik ve Geçmiş
- **Şirket** — şirket değeri, ünvan ilerlemesi, itibar kademesi, depo seviyesi
- **Profil** — ses, yeni oyun, sıfırlama

İlerleme `localStorage` ile otomatik kaydedilir; sayfa yenilendiğinde oyun
kaldığı yerden devam eder.

## Sözleşme döngüsü

```
teklif (Fırsatlar)  --kabul-->  aktif sözleşme  --teslim-->  tamamlandı  (+3 itibar)
       |                              |
  süresi dolar               son gün de geçer -> gecikmiş (ceza kesilir)
                                      |
                            +-- telafi süresinde teslim -> ödeme alınır (-5 itibar)
                            +-- telafi süresi dolar ------> kaçırıldı     (-8 itibar)
```

Süre sayacı son teslim gününü tam olarak kullandırır:

```
3 GÜN -> 2 GÜN -> 1 GÜN -> SON GÜN -> (bir sonraki gün) GECİKTİ
```

`daysLeft === 0` **SON GÜN** demektir; sözleşme hâlâ aktiftir ve o gün yapılan
teslimat zamanında sayılır (+3 itibar). Gecikme ancak son gün de geçtikten
sonra başlar ve ceza tam o anda, yalnızca bir kez kesilir. Aynı mantık
tekliflerde de geçerlidir: "1 gün daha geçerli" yerine son gün "Son gün ·
bugün kabul edilebilir" yazar ve teklif o gün boyunca kabul edilebilir.

- Teslimat **depodan** yapılır: sözleşme miktarının tamamı depoda olmalıdır.
- Fiyat kabul anında sabitlenir. Piyasa yükselirse malı pahalıya tamamlarsınız,
  düşerse kâr büyür. Risk buradadır.
- Son gün geçtiğinde ceza **bir kez** kesilir ve sözleşme telafi süresine girer;
  bu sürede teslim ederseniz ödemeyi yine alırsınız.
- İptal etmek hem cezayı hem de en büyük itibar kaybını getirir.
- Taahhüt altındaki stoğu spot piyasada satmak **engellenmez** — bilinçli bir
  risktir. Satış sözleşme açığı doğuracaksa, işlem öncesinde açığı, en yakın
  teslim süresini ve risk altındaki toplam cezayı gösteren bir onay ekranı
  çıkar; oyuncu "Riski al ve sat" demeden satış gerçekleşmez.

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

## Tedarik döngüsü

```
günlük tedarikçi teklifi (fiyat piyasadan türetilir, gün boyunca sabit)
        |
   sipariş ver  ->  nakit ANINDA çıkar, mal YOLA çıkar
        |            depo kapasitesi sipariş anında rezerve edilir
   her gün daysLeft azalır:  3 GÜN -> 2 GÜN -> 1 GÜN -> teslim
        |
   mal depoya girer (ağırlıklı ortalama maliyete dahil olur)
```

- Ödeme sipariş anında yapılır; teslimatta ikinci kez nakit hareketi olmaz.
- Yoldaki mal şirket değerine **maliyetiyle** dahildir, yani para yok olmaz:
  `şirket değeri = nakit + depodaki malın güncel değeri + yoldaki malın maliyeti`
- Birim fiyat sipariş anında kilitlenir; piyasa sonradan hareket etse de açık
  siparişin fiyatı değişmez.
- Yoldaki mal kadar depo kapasitesi rezerve edilir, böylece mal geldiğinde yer
  garanti olur. Spot alım da bu rezervasyonu dikkate alır.
- Tedarikçi teslim süresi, o üründeki en yakın sözleşmenin süresiyle
  karşılaştırılır ve "yetişir / telafi süresine yetişir / yetişmez" olarak
  gösterilir. Bu yalnızca karar desteğidir; sipariş engellenmez.

### Tedarikçiler

| Tedarikçi | Ürünler | Min | Teslim | Spot altı indirim |
| --- | --- | --- | --- | --- |
| Spot Piyasa | hepsi | 1 ton | anında | — |
| Express Supply | hepsi | 2 ton | 1 gün | %0–4 |
| Atlas Emtia | alüminyum, bakır | 5 ton | 2 gün | %4–9 |
| Anadolu Hububat | buğday | 10 ton | 2 gün | %4–11 |
| Prime Materials | hepsi | 10 ton | 4 gün | %9–15 |
| BulkSource | hepsi | 25 ton | 6 gün | %15–22 |

İndirimler simülasyonla kalibre edildi. Sipariş bedeli peşin ödendiği için
yavaş tedarikçide sermaye günlerce bağlanır; indirim bu taşıma maliyetini
karşılayacak kadar derin olmalıdır, aksi hâlde tedarikçiler spot piyasaya
karşı her zaman zararlı kalır.

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
| `ProcurementSystem` | Tedarikçiler, günlük fiyat teklifleri, satın alma siparişleri, yoldaki mallar |
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
- **V2 Part 2** — tedarikçiler, satın alma siparişleri, teslim süresi ✅ *(bu sürüm)*
- **V3+** — ülkeler/şehirler, lojistik, çalışanlar, banka/kredi, fabrikalar,
  rakip şirketler, ihaleler

Ülkeler, şehirler, rotalar, limanlar, kamyon/gemi, navlun, gümrük, vergi,
fabrikalar, bankalar, çalışanlar, rakip şirketler ve multiplayer bu sürümde
**bilinçli olarak yoktur**. Sözleşme sistemi, sonradan
eklenecek geminin/fabrikanın/çalışanın oyunda gerçek bir sebebi olsun diye önce
kuruldu.

## Test

Playwright ile beş ayrı takım çalışır (toplam 412 kontrol):

- `test.js` — V1 çekirdeği: alım/satım, ağırlıklı ortalama maliyet, gün
  ilerleme, haber etkisi, depo yükseltme, kayıt/yenileme, mobil yerleşim
- `test-v2.js` — sözleşme mantığı: teklif üretimi, limitler, teslimat, ceza,
  gecikme, iptal, itibar sınırları, kayıt göçü (V1 kaydı dahil), bozuk veri
- `test-ui-v2.js` — dokunmatik akış: kabul/teslim/iptal, uyarılar, rozetler,
  4 ekran boyutunda taşma kontrolü
- `test-v3.js` — sınır durumları: son gün semantiği (1 GÜN → SON GÜN → GECİKTİ),
  son günde zamanında teslim, cezanın tek kez kesilmesi, riskli satış onay
  akışı (vazgeç/riski al), yeniden yükleme ve eski kayıtların açılması
- `test-v4.js` — tedarik: ödeme/stok ayrımı, yoldaki malın şirket değerine
  dahil olması, kapasite rezervasyonu, teslim süresi akışı, fiyat kilidi,
  günlük teklif determinizmi, ağırlıklı ortalama, sözleşme-tedarik zamanlaması,
  V1/V2 göçü, bozuk sipariş verisi ve 320–430 px yerleşim
