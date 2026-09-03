# Trade Empire — V5 (Part 1)

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
sipariş anında ödersiniz. V3 ile teslim süresi sabit bir sayı olmaktan çıktı —
tedarikçinin menşe ülkesi, seçtiğiniz taşıma yöntemi ve ton başına navlun
birlikte hem süreyi hem de malın depoya varmış hâlindeki gerçek maliyetini
(landed cost) belirliyor.

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

### Tedarikçiler ve menşe

| Tedarikçi | Menşe | Ürünler | Min | Hazırlık | Spot altı indirim |
| --- | --- | --- | --- | --- | --- |
| Spot Piyasa | İstanbul, Türkiye | hepsi | 1 ton | anında | — |
| Express Supply | İstanbul, Türkiye | hepsi | 2 ton | 0 gün | %0–4 |
| Atlas Emtia | Belgrad, Sırbistan | alüminyum, bakır | 5 ton | 0 gün | %4–9 |
| Anadolu Hububat | Konya, Türkiye | buğday | 10 ton | 1 gün | %4–11 |
| Prime Materials | Köstence, Romanya | hepsi | 10 ton | 1 gün | %9–15 |
| BulkSource | Novorossiysk, Rusya | hepsi | 25 ton | 1 gün | %15–22 |

### Rotalar ve taşıma

Toplam teslim süresi = **tedarikçi hazırlığı + rota transiti**. Navlun ton
başınadır; bu yüzden ucuz emtiada (buğday) rota seçimi belirleyici, pahalı
emtiada (bakır) neredeyse önemsizdir.

| Rota | Taşıma | Transit | Navlun/ton |
| --- | --- | --- | --- |
| İstanbul → İstanbul | Karayolu | 1 gün | $4 |
| Konya → İstanbul | Karayolu | 1 gün | $12 |
| Belgrad → İstanbul | Karayolu | 2 gün | $28 |
| Belgrad → İstanbul | Demiryolu | 4 gün | $14 |
| Köstence → İstanbul | Karayolu | 2 gün | $34 |
| Köstence → İstanbul | Deniz | 3 gün | $16 |
| Novorossiysk → İstanbul | Karayolu | 3 gün | $52 |
| Novorossiysk → İstanbul | Deniz | 5 gün | $18 |

### Lojistik riski ve gecikmeler

Planlanan süre kesin varış değildir. Her rotanın günlük bir aksama olasılığı
vardır; olaylar sipariş başına ayrı zar değil **rota bazlı günlük dünya
durumu** olarak üretilir, yani aynı hattaki bütün sevkiyatlar aynı gerçek
koşuldan etkilenir.

Ekranda gösterilen güvenilirlik modelin kendi tahminidir, dekorasyon değil:

```
güvenilirlik = (1 - dailyRisk) ^ toplamTeslimSüresi
```

| Rota | Taşıma | Süre | Güvenilirlik | Ölçülen (400 sevkiyat) |
| --- | --- | --- | --- | --- |
| İstanbul → İstanbul | Karayolu | 1 | %99 | %98,5 |
| Konya → İstanbul | Karayolu | 2 | %97 | %97,5 |
| Belgrad → İstanbul | Karayolu | 2 | %94 | %95,3 |
| Belgrad → İstanbul | Demiryolu | 4 | %95 | %95,0 |
| Köstence → İstanbul | Karayolu | 3 | %94 | %92,8 |
| Köstence → İstanbul | Deniz | 4 | %92 | %90,5 |
| Novorossiysk → İstanbul | Karayolu | 4 | %91 | %88,8 |
| Novorossiysk → İstanbul | Deniz | 6 | %89 | %87,8 |

**Bilinen sorun plana girer, sonradan çıkan olay gecikmedir.** Sipariş anında
hatta aktif bir aksama varsa süre baştan artırılır (sürpriz değil, bilgi);
siparişten sonra çıkan olay `totalDelayDays` olarak yazılır.

```
plannedLeadTime / plannedArrivalDay   : sipariş anında sabitlenir, değişmez
daysLeft / currentEtaDay              : olaylarla uzar
totalDelayDays                        : toplam gecikme (tavan 3 gün)
```

Sözleşme zaman tamponu her rota için gösterilir:
`tampon = sözleşmenin kalan günü − rotanın planlanan süresi`. Tampon 0 ise
açık uyarı çıkar, negatifse "planlanan sürede yetişmez" denir — ama sipariş
hiçbir zaman engellenmez.

Lojistik gecikme müşteri cezası kesmez; sözleşme gecikirse cezayı her zamanki
gibi ContractSystem bir kez keser.

### Nakliye piyasası (V4 Part 2)

Harici nakliyecinin kapasitesi sınırsız değildir. Her rotanın **her gün** bir
taşıma kapasitesi ve bir navlun çarpanı vardır; ikisi de aynı sıkışıklık
değerinden türer, yani kapasite daraldığında navlun pahalanır.

```
harici navlun/ton = CONFIG base navlun x günlük çarpan
```

| Rota | Base navlun | Günlük kapasite (base) |
| --- | --- | --- |
| İstanbul → İstanbul · Karayolu | $4 | 160 ton |
| Konya → İstanbul · Karayolu | $12 | 130 ton |
| Belgrad → İstanbul · Karayolu | $28 | 100 ton |
| Belgrad → İstanbul · Demiryolu | $14 | 190 ton |
| Köstence → İstanbul · Karayolu | $34 | 100 ton |
| Köstence → İstanbul · Deniz | $16 | 260 ton |
| Novorossiysk → İstanbul · Karayolu | $52 | 80 ton |
| Novorossiysk → İstanbul · Deniz | $18 | 320 ton |

Ölçülen dağılım (40 seed × 60 gün × 8 rota): çarpan **0.85 – 1.30**, günlerin
**%70'i 0.95 – 1.10** arasında, **%2,5'i 1.20 ve üstü**. Kapasite base değerin
**%62 – %140**'ı arasında. Durum dağılımı ≈ %20 RAHAT · %67 NORMAL · %13 SIKIŞIK.

Piyasa durumu ayrı bir zar değildir, üretilen fiyat ve kapasiteden türer:

| Durum | Koşul |
| --- | --- |
| SIKIŞIK | çarpan ≥ 1.12 **veya** kapasite base'in %78'inin altında |
| RAHAT | çarpan ≤ 0.96 **ve** kapasite base'in %112'sinin üstünde |
| NORMAL | diğer |

**Kapasite yalnız sipariş anında tüketilir.** 60 tonluk hatta 25 ton sipariş
verirsen 35 ton kalır; ikinci 20 tonluk sipariş sonrası 15 ton kalır ve üçüncü
20 tonluk sipariş **reddedilir**. Reddedilen sipariş nakit düşürmez, depo
rezerve etmez, araç bağlamaz. Yola çıkmış sevkiyat ertesi günün kapasitesini
tekrar tüketmez; teslim olduğunda da geri vermez. Kullanılmayan kapasite
devretmez, her sabah yeniden oluşur.

Sipariş anında navlun **kilitlenir**. Ertesi gün piyasa değişse bile açık
siparişin `freightPerTon` / `freightCost` / `landedUnitCost` / `totalCost`
değerleri asla yeniden fiyatlanmaz.

Nakliye piyasası sıkışıklığı **teslim süresine dokunmaz**. Sipariş anındaki arz
ve fiyat FreightMarketSystem'in, yola çıktıktan sonraki gecikme riski
LogisticsSystem'in işidir; sıkışık piyasa kendiliğinden transit gün eklemez.

Deniz hatlarında kalan kapasite konteyner slotu olarak da gösterilir
(`20 ton = 1 slot`). Bu yalnız karar desteğidir: 25 ton sipariş 25 ton olarak
ücretlendirilir, 40 tona yuvarlanmaz.

### Şirket filosu (V4 Part 1)

Şirket değeri **$75.000**'i geçtiğinde kendi araç filonuz açılır. Filo yalnızca
**karayolu** rotalarında kullanılabilir; deniz ve demiryolu her zaman harici
nakliyecidir.

| Araç | Kapasite | Fiyat | Dönüş | Not |
| --- | --- | --- | --- | --- |
| Hafif Kamyon (HK) | 10 ton | $1.800 | 1 gün | Küçük siparişlerde esnek |
| Standart Tır (ST) | 20 ton | $3.600 | 1 gün | Genel amaçlı |
| Ağır Tır (AT) | 30 ton | $4.600 | 2 gün | Büyük hacimde verimli |

Araç satın almak **şirket değerini değiştirmez**: nakit azalır, aynı tutar
filonun defter değeri olarak geri gelir. Kazanç ya da kayıp, aracın sonraki
seferlerinde ortaya çıkar.

```
harici navlun  = freightPerTon x qty
filo navlunu   = fleetCostPerTon x qty + fleetDispatchCost x araçSayısı
```

| Karayolu rotası | Harici/ton | Filo/ton | Araç sevk |
| --- | --- | --- | --- |
| İstanbul → İstanbul | $4 | $1,5 | $12 |
| Konya → İstanbul | $12 | $4 | $30 |
| Belgrad → İstanbul | $28 | $9 | $60 |
| Köstence → İstanbul | $34 | $11 | $75 |
| Novorossiysk → İstanbul | $52 | $17 | $110 |

Sevk bedeli araç başınadır, bu yüzden **yarım dolu araç pahalıdır**. Araç
seçimi otomatiktir: önce en az sayıda araç, eşitlikte en az fazla kapasite.
35 ton için 10+30 (fazlalık 5) seçilir, 20+30 (fazlalık 15) değil.

Bir siparişte taşıyıcılar karıştırılamaz: sipariş ya tamamen harici ya tamamen
kendi filonuzladır. Sipariş verildiği anda araçlar bağlanır, teslimattan sonra
`returnDays` kadar dönüşte kalır ve ancak sonra yeniden müsait olur. Yalnızca
**müsait** araçlar kapasiteye sayılır.

Filo, teslim süresini ve rota güvenilirliğini **değiştirmez**. Aynı rotadaki
kendi aracınız da harici nakliyeci de aynı gecikme olaylarından etkilenir.

Filonun asıl stratejik değeri **kapasite bağımsızlığıdır**: kendi aracınız
harici nakliye piyasasının kapasitesini tüketmez ve günlük navlun çarpanından
etkilenmez. Belgrad karayolunda harici kapasite bittiyse (0 ton kaldı) ve
elinizde 60 ton boş filo varsa, o gün yine 60 tonluk sevkiyat çıkarabilirsiniz —
üstelik harici navlun %24 pahalıyken bile filo işletme maliyetiniz sabit kalır.

Araç fiyatları simülasyonla kalibre edildi. Ölçülen amortisman süresi (tam yük,
sefer + dönüş döngüsü üzerinden):

| Araç | Belgrad | Köstence | Novorossiysk |
| --- | --- | --- | --- |
| Hafif Kamyon | 42 gün | 46 gün | 38 gün |
| Standart Tır | 34 gün | 37 gün | 31 gün |
| Ağır Tır | 36 gün | 37 gün | 29 gün |

Yurtiçi kısa hatlarda (İstanbul, Konya) harici navlun zaten ucuz olduğu için
filo kendini 110 günden önce amorti etmez: **kendi filon uzun uluslararası
karayolu hattında kazandırır.** Boş bekleyen araç ise doğrudan zarardır —
sermaye bağlanır, tasarruf üretilmez.

### Landed cost

```
goodsCost      = goodsUnitPrice x qty
freightCost    = harici : BUGÜNKÜ piyasa navlunu x qty
                 filo   : fleetCostPerTon x qty + fleetDispatchCost x araçSayısı
totalCost      = goodsCost + freightCost        (sipariş anında peşin ödenir)
landedUnitCost = totalCost / qty                (stok maliyeti budur)
```

Mal depoya ulaştığında ağırlıklı ortalama maliyete **landed** birim maliyetle
girer, yani rota seçimi sonraki satışın kâr/zararına doğrudan yansır. Fiyat,
rota, navlun ve süre sipariş anında PO içine kopyalanır; sonradan CONFIG veya
günlük teklif değişse bile açık sipariş etkilenmez.

İndirimler simülasyonla kalibre edildi. Sipariş bedeli peşin ödendiği için
yavaş tedarikçide sermaye günlerce bağlanır; indirim bu taşıma maliyetini
karşılayacak kadar derin olmalıdır, aksi hâlde tedarikçiler spot piyasaya
karşı her zaman zararlı kalır.

## Ekip ve departmanlar (V5 Part 1)

Şirket değeri **$120.000**'i ilk kez geçtiğinde ekip sistemi kalıcı olarak
açılır. Personel kapasitesi şirketin **gördüğü en yüksek değere** göre artar;
değer sonradan düşerse kimse kovulmaz, kapasite geri alınmaz.

| Şirket değeri | Personel kapasitesi |
| --- | --- |
| $120.000 | 3 |
| $300.000 | 5 |
| $750.000 | 8 |
| $1.500.000 | 12 |

Üç departman vardır ve **hiçbiri işi senin yerine yapmaz**. Tek ürettikleri şey
günlük *departman aksiyon hakkı*dır; o hakkı sen harcarsın.

| Departman | Çalışan | Aksiyon |
| --- | --- | --- |
| Satış | Satış Uzmanı | **MÜŞTERİ ARA** — ekstra sözleşme fırsatı arar |
| Ticaret | Ticaret Uzmanı | **PAZARLIK YAP** — bir tedarikçi/ürün için tek kullanımlık indirim |
| Lojistik | Lojistik Uzmanı | **YARINI ANALİZ ET** — yarınki nakliye piyasasını okur |

### Skill, maaş ve aksiyon

| Skill | Ünvan | Günlük maaş | Günlük aksiyon |
| --- | --- | --- | --- |
| ★ | Junior | $140 – $220 | 1 |
| ★★ | Uzman | $240 – $340 | 1 |
| ★★★ | Kıdemli | $380 – $520 | **2** |

İşe alım gideri = **2 günlük maaş** (tek seferlik, varlık değildir). Maaşlar her
gün başında nakitten düşer ve şirket değerini gerçekten azaltır — çalışan bir
şirket varlığı değildir. Bu partta XP, terfi, moral, izin, prim yoktur; skill
işe alındığı anda sabittir.

İşe alınan çalışan **aynı gün aksiyon üretmez**, ilk tam çalışma günü ertesi
gündür. Böylece "işe al → aksiyonu kullan → kov" istismarı oluşmaz. Aksiyon
puanları her gün sıfırdan kurulur, **devretmez**.

### Satış: müşteri arama

Her aksiyon bir **denemedir**, garanti değil. Başarı şansı itibarla ve satış
ekibinin en yüksek skill'iyle artar (%30–55 × skill çarpanı). Deneme boşa
çıksa da puan harcanır — aksi hâlde butona basarak RNG bedava ileri sarılırdı.

Bir günde piyasada bulunabilecek yeni müşteri sınırlıdır: kaç satışçın olursa
olsun **günde en fazla 2 yeni fırsat** çıkar. Satış ekibi ayrıca ekranda
tutulabilen fırsat sayısını artırır (kişi başı +1, tavan +3). Sözleşme fiyat
algoritmasına dokunulmaz, itibar etkilenmez.

### Ticaret: pazarlık

Departmanın **en yüksek** skill'i indirimi belirler:

| Skill | İndirim |
| --- | --- |
| ★ | %0,7 – %1,1 |
| ★★ | %1,2 – %1,7 |
| ★★★ | %1,7 – %2,3 |

Tedarikçinin günlük teklifi **asla değiştirilmez**; pazarlık ayrı state'te
tek kullanımlık bir teklif olarak durur. Aynı tedarikçi/ürün için stack yoktur.
Sipariş gerçekten oluşursa tüketilir; nakit, depo veya nakliye kapasitesi
yüzünden reddedilen sipariş pazarlık hakkını yakmaz. Ertesi gün expire olur.

### Lojistik: nakliye tahmini

Nakliye piyasası saf hash tabanlı olduğu için gelecek gün **RNG tüketmeden**
okunabilir. Tahmin geleceği değiştirmez, yalnız gözlemler: ertesi gün
gerçekleşen piyasa tahminle birebir tutar.

| Skill | Gösterdiği |
| --- | --- |
| ★ | Yalnız yarınki durum (RAHAT / NORMAL / SIKIŞIK) |
| ★★ | Durum + yaklaşık navlun bandı + yaklaşık kapasite bandı |
| ★★★ | Kesin navlun ve kapasite + 2 gün sonrasının durumu |

Aynı rota ve hedef gün için ikinci kez puan harcanmaz.

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
| `ProcurementSystem` | Tedarikçiler, ülke/hub/rota/taşıma, günlük teklifler, landed cost, satın alma siparişleri, yoldaki mallar |
| `LogisticsSystem` | Rota güvenilirliği, hat durumları, gecikme olayları, ETA yönetimi |
| `FleetSystem` | Araç tipleri, satın alma, araç atama, sevkiyat/dönüş döngüsü, filo kapasitesi |
| `FreightMarketSystem` | Günlük harici navlun ve taşıma kapasitesi, rezervasyon, piyasa durumu |
| `EmployeeSystem` | Aday pazarı, işe alım/çıkarma, maaşlar, departman aksiyon hakları |
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
- **V2 Part 2** — tedarikçiler, satın alma siparişleri, teslim süresi ✅
- **V3 Part 1** — ülkeler, ticaret merkezleri, rotalar, taşıma yöntemleri,
  navlun ve landed cost ✅
- **V3 Part 2** — rota güvenilirliği, hat durumları, gerçek gecikmeler ve
  ETA yönetimi ✅
- **V4 Part 1** — şirket filosu, kamyonlar, lojistik kapasitesi ✅
- **V4 Part 2** — nakliye piyasası, harici taşıma kapasitesi, konteyner
  slotları ✅
- **V5 Part 1** — çalışanlar, departmanlar, maaşlar, manuel departman
  aksiyonları ✅ *(bu sürüm)*
- **V5 Part 2** — departman politikaları ve otomasyon/delegasyon
- **Sonrası** — gümrük/vergi, sigorta, gemi/uçak filosu, şoför ve bakım,
  navlun hedge, yakıt piyasası, birden fazla depo, banka/kredi, fabrikalar,
  rakip şirketler

Otomatik sözleşme kabulü, otomatik satın alma/satış, otomatik rota seçimi ve
filo sevki, departman müdürü / CEO / CFO, çalışan XP ve terfisi, moral,
hastalık, izin, prim, ofis binası, savaş, yaptırım, siyasi risk, rota kapanması,
navlun hedge, uzun dönem taşıyıcı kontratı, fiziksel konteyner envanteri,
yakıt piyasası, gümrük, vergi, sigorta, Incoterms, döviz, gemi/uçak/tren
filosu, araç bakımı, şoför, araç satışı, birden fazla depo, liman sahipliği,
bankalar, kredi, fabrikalar ve rakip şirketler bu sürümde
**bilinçli olarak yoktur**. Tüm oyun USD ile
çalışır. Sözleşme sistemi, sonradan
eklenecek geminin/fabrikanın/çalışanın oyunda gerçek bir sebebi olsun diye önce
kuruldu.

## Test

Playwright ile on bir ayrı takım çalışır (toplam 1044 kontrol):

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
- `test-v5.js` — kayıt sağlamlığı: bozuk `totalCost` varyantlarının kanonik
  maliyete kurulması, geçmiş kayıtlarının normalize edilmesi, çift ve çakışan
  id temizliği, `purchaseSeq` güvenliği
- `test-v6.js` — uluslararası tedarik: ülke/hub/rota modeli, hazırlık + transit
  toplamı, navlun ve landed cost zinciri, sipariş anında rota/fiyat kilidi,
  landed maliyetle stok girişi, sözleşme-rota zamanlaması, eski V2 siparişlerin
  ekonomik olarak korunması, bozuk rota verisi ve 320–390 px yerleşim
- `test-v7.js` — lojistik riski: gecikme mekaniği ve ETA, olay kapsamı
  (mod/hub), gecikme tavanı, rezervasyon ve şirket değerinin korunması,
  sözleşme sonuçları, zaman tamponu, bilinen koşulun plana dahil edilmesi,
  determinizm, legacy/snapshot/orphan davranışı ve yerleşim
- `test-v8.js` — şirket filosu: açılma eşiği, araç satın alma ve defter değeri,
  müsait/sevkiyatta/dönüşte kapasite, araç atama önceliği, filo navlunu ve
  landed cost, araçların siparişe bağlanması ve dönüş döngüsü, filonun risk
  sistemine etkisizliği, PO↔araç referans bütünlüğü göçü, birebir yeniden
  yükleme ve 320–390 px yerleşim
- `test-v9.js` — nakliye piyasası: gecikmiş PO'nun göçte korunması, kısmi filo
  atamasının kurtarılması, günlük quote/kapasite üretimi ve determinizmi, aynı
  gün rerender ve reload sabitliği, taşıyıcıya göre `maxOrder`, kapasite
  rezervasyonu ve reddedilen siparişin yan etkisizliği, kendi filonun kapasite
  bağımsızlığı, navlun kilidi, konteyner slotu gösterimi, V1–V4P1 kayıtlarının
  yeniden fiyatlanmaması ve 320–390 px yerleşim
- `test-v10.js` — ekip: açılma eşiği ve kapasite kademeleri, aday pazarı
  determinizmi, işe alım/çıkarma, maaş akışı ve negatif nakit davranışı,
  skill başına aksiyon üretimi, satış aramasının puan tüketmesi, pazarlığın
  tedarikçi teklifini bozmaması ve tek kullanımlık olması, tahminin piyasayı
  mutate etmemesi ve ertesi gün tutması, V1–V4P2 kayıtlarının açılması ve
  320–390 px yerleşim
