# Demir Cephe

1936–1945 dönemini konu alan, telefonda oynanmak üzere tasarlanmış, dünya haritalı bir büyük strateji oyunu. Hearts of Iron IV'ten esinlenir: bir ulus seçer, sanayini kurar, ordunu eğitir, ittifakları yönetir ve İkinci Dünya Savaşı'nın gidişatını değiştirirsin.

## Oynamak

- **Tek dosya:** `dist/demir-cephe.html` dosyasını telefonda veya bilgisayarda bir tarayıcıyla aç. İnternet gerekmez (yalnızca yazı tipleri internetten yüklenir; yoksa yedek yazı tipi kullanılır).
- **GitHub Pages:** Depo ayarlarında *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`* seç. Birkaç dakika sonra oyun `https://gokhan690.github.io/idle-game/` adresinde açılır.
- **Web sitesi / PWA:** Depoyu herhangi bir statik sunucuda yayınla ve `index.html`'i aç. Tarayıcı menüsünden "Ana ekrana ekle" ile uygulama gibi tam ekran ve çevrimdışı çalışır.
- **Yerelde:** `npm run serve` ve ardından `http://localhost:8080`.

## Neler var

- **Gerçek dünya haritası:** Natural Earth sınırlarından üretilmiş, 1936 sınırlarına göre düzenlenmiş ~1500 kara eyaleti ve ~630 deniz bölgesi; 70'ten fazla oynanabilir ülke. Siyasi, arazi, sanayi ve ittifak harita modları.
- **Dokunmatik kontrol:** Tek parmakla kaydırma, iki parmakla yakınlaştırma, birlik sayacına dokunarak seçim, hedefe dokunarak otomatik yol bulma, uzun basışla seçime ekleme, alan seçimi.
- **Ekonomi ve üretim:** Sivil/askerî fabrikalar ve tersaneler, inşaat kuyruğu; üretim hatları ekleme, silme, öne/arkaya alma, fabrika atama; teçhizat modelleri (araştırılan yeni modele hat "Yeni modele geç" ile geçirilir, eski stok kademeli olarak yenilenir), verimlilik; tüketim malları, abluka ve stratejik bombardıman.
- **Kaynaklar ve ticaret:** Çelik, petrol, alüminyum, kauçuk, tungsten ve krom; ticaret yasasına bağlı ihracat sınırı, ülkelerle ticaret anlaşmaları (sivil fabrika karşılığı), ambargo, otomatik ticaret bakanı, deniz aşırı ticaret için konvoy ihtiyacı ve konvoy akınları.
- **Donanma:** Filolar, devriye/saldırı/konvoy akını/konvoy refakati görevleri, deniz muharebeleri, deniz üstünlüğü (çıkarma ve deniz yoluyla ikmal buna bağlı), denizaltı savaşı.
- **Pasifik:** Hawaii (Pearl Harbor), Midway, Wake, Guam, Mariana, Marshall, Caroline, Solomon adaları, Okinawa, Iwo Jima, Aleutlar, Malta, Kıbrıs, Cebelitarık, Hong Kong vb.; harita yatay olarak sarılır, ABD ile Japonya arasında Pasifik kesintisizdir.
- **İstihbarat ve kuklalar:** Ajan ağı, darbe, şifre çözme, propaganda operasyonları; barış konferansında kukla devlet kurma, serbest bırakılabilir uluslar, Lend-Lease (Ödünç Verme-Kiralama), İspanya İç Savaşı.
- **Ordu:** Piyade, dağ, süvari, motorize, zırhlı ve deniz piyadesi tümenleri; insan gücü, teçhizat, moral ve güç; arazi, tahkimat, siper, hava üstünlüğü, zırh/zırh delme ve ikmal mesafesi etkili muharebe; geri çekilme ve kuşatma; deniz yoluyla taşıma ve çıkarma harekâtı.
- **Araştırma:** Piyade, topçu, zırh, hava, deniz, sanayi ve doktrin dallarında 58 teknoloji; zamanından önce araştırma cezası.
- **Siyaset ve diplomasi:** Askerlik ve ekonomi yasaları, kararlar, savaş gerekçesi, savaş ilanı, ittifak kurma/davet/katılma, askerî geçiş izni, saldırmazlık paktı, garanti, beyaz barış, dünya gerginliği, teslim olma ve ilhak.
- **Tarihî olaylar:** Roma-Berlin Mihveri, Marco Polo Köprüsü, Anschluss, Münih, Çekoslovakya'nın sonu, Molotov-Ribbentrop, Polonya'nın işgali, Kış Savaşı, Weserübung, Fall Gelb, Baltık ilhakı, Barbarossa, Pearl Harbor ve daha fazlası. Oyuncu olayın tarafıysa karar ona kalır. "Serbest dünya" modunda yapay zekâ kendi hedeflerini kovalar.
- **Yapay zekâ:** Her ülke ekonomisini, araştırmasını, üretimini ve ordusunu yönetir; cepheleri tutar, zayıf noktalara yüklenir, gerekirse çıkarma yapar.
- **Lojistik ve hava (HOI4 tarzı):** Başkent ve büyük şehirlerde ikmal merkezleri, altyapı ve demiryolu boyunca ikmal akışı, aşırı yığılma ve derin ilerlemede ikmal sıkıntısı, ikmalsizlik ve kış yıpranması; kar, tipi, Doğu Avrupa çamur mevsimi ve muson; ikmal harita modu ve hava katmanı; altyapı inşası. Daha yavaş HOI4 temposu ve 1948'e uzanan oyun.
- **Tarihî savaş akışı:** Yapay zekâ cephe boşluklarını kapatır, yurt garnizonu tutar, yabancı topraktaki birlikler savaş başlayınca geri çekilir; Orak Darbesi, Barbarossa baskını, Büyük Vatanseverlik Savaşı gibi süreli ruhlar ve Sovyet-Japon Tarafsızlık Paktı.
- **Ordular, cepheler ve savaş planları (HOI4 tarzı):** Oyun bölgesel ordular ve tarihî komutanlarla (Fevzi Çakmak, Manstein, Rommel, Jukov, Patton…) başlar; orduya cephe hattı ver, taarruz oku çiz, planlama bonusu dolsun, “Uygula” ile saldır. NATO simgeli sayaçlar, muharebe ekranı (genişlik, yedekler, etkenler), tümen ayrıntısı, tümen tecrübesi (Acemi → Kıdemli), stratejik konuşlanma, yeni tümenleri seçili orduya konuşlandırma.
- **Tümen tasarımcısı:** Taburlar ve destek bölükleriyle kendi tümen şablonlarını tasarla; genişlik, zırh, zırh delme ve hız buna göre hesaplanır.
- **Siyaset:** İstikrar, savaş desteği, parti destekleri ve hükümet değişikliği, siyasi danışmanlar, askerî komutanlar ve tasarım büroları, ulusal ruhlar, askerlik/ekonomi/ticaret yasaları.
- **HOI4 tarzı odak ağaçları:** Türkiye, Almanya, SSCB, Britanya, Fransa, İtalya, Japonya ve ABD için birbirini dışlayan yolları olan ulusal ağaçlar; diğer ülkeler için genel ağaç. Ağaç, çizgileriyle kaydırılabilir bir görünümde gösterilir.
- **Yatay ekran:** Telefon yan çevrildiğinde menü sola, paneller sağa geçer; odak ağacı yatayda da rahatça kaydırılır, odak önce seçilip ayrıntı kartından başlatılır (yanlışlıkla başlatma olmaz).
- **Telefona uygun kolaylıklar:** "Otomatik kurmay" ile tümenleri yapay zekâ komutanına devretme, ekonomi için "bakan" otomasyonları, aylık otomatik kayıt, 3 kayıt yuvası.

## Proje yapısı

```
index.html, css/style.css      Arayüz iskeleti ve tema
js/data/map.js                  Üretilmiş harita verisi (elle düzenlemeyin)
js/data/countries.js            1936 devletleri, ittifaklar
js/data/content.js              Arazi, teçhizat, tümenler, teknolojiler, odaklar, yasalar
js/game/*.js                    Simülasyon: çekirdek, durum, ekonomi/muharebe, diplomasi, yapay zekâ, olaylar
js/ui/*.js, js/main.js          Harita çizimi, paneller, girdi, kayıt, döngü
tools/build-map.mjs             Haritayı Natural Earth verisinden üretir
tools/bundle.mjs                Tek dosyalık dist/demir-cephe.html paketini oluşturur
tools/simtest.mjs               Arayüzsüz yıllar boyu simülasyon testi
tools/battletest.mjs            Muharebe dengesi testi
```

## Geliştirme

```
npm install
npm run build:map      # js/data/map.js'i yeniden üretir
npm run build:bundle   # dist/demir-cephe.html
node tools/simtest.mjs 2200   # 6 yıllık yapay zekâ simülasyonu
```

Harita verisi: [Natural Earth](https://www.naturalearthdata.com/) (kamu malı), `world-atlas` paketi üzerinden.
