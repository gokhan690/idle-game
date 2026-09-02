# Trade Empire — V1

Mobil öncelikli, tek dosyalık bir ticaret ve şirket büyütme oyunu.
Tüm oyun `index.html` içindedir: harici backend, framework veya bağımlılık yoktur.
Dosyayı bir tarayıcıda açmak yeterlidir.

## Oynanış

10.000 $ sermaye ile küçük bir tüccar olarak başlarsınız. Alüminyum, bakır ve
buğdayı ucuza alıp depolar, fiyatlar yükseldiğinde satar ve şirket değerinizi
büyütürsünüz. Her "Sonraki Gün" ile piyasa hareket eder ve haberler fiyatları
etkiler.

- **Piyasa** — fiyatlar, günlük değişim, trend grafiği, alış/satış
- **Depo** — kapasite, stoklar, ortalama maliyet, açık kâr/zarar, depo geliştirme
- **Ticaret** — işlem geçmişi ve özet istatistikler
- **Şirket** — şirket değeri, ünvan ilerlemesi, depo seviyesi
- **Profil** — ses, yeni oyun, sıfırlama

İlerleme `localStorage` ile otomatik kaydedilir; sayfa yenilendiğinde oyun
kaldığı yerden devam eder.

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

## V1 kapsamı

V1 yalnızca ticaret çekirdeğini içerir. Fabrika, uluslararası ülkeler, gemiler,
banka/kredi, çalışanlar, rakip şirketler ve multiplayer **bilinçli olarak dahil
edilmemiştir**; kod bunlar için genişletilebilir bırakılmıştır.
