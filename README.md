# Demir Cephe

1936–1945 dönemini konu alan, telefonda oynanmak üzere tasarlanmış, dünya haritalı bir büyük strateji oyunu. Hearts of Iron IV'ten esinlenir: bir ulus seçer, sanayini kurar, ordunu eğitir, ittifakları yönetir ve İkinci Dünya Savaşı'nın gidişatını değiştirirsin.

## Oynamak

- **Tek dosya:** `dist/demir-cephe.html` dosyasını telefonda veya bilgisayarda bir tarayıcıyla aç. İnternet gerekmez (yalnızca yazı tipleri internetten yüklenir; yoksa yedek yazı tipi kullanılır).
- **Web sitesi / PWA:** Depoyu herhangi bir statik sunucuda (ör. GitHub Pages) yayınla ve `index.html`'i aç. Tarayıcı menüsünden "Ana ekrana ekle" ile uygulama gibi tam ekran ve çevrimdışı çalışır.
- **Yerelde:** `npm run serve` ve ardından `http://localhost:8080`.

## Neler var

- **Gerçek dünya haritası:** Natural Earth sınırlarından üretilmiş, 1936 sınırlarına göre düzenlenmiş ~1500 kara eyaleti ve ~630 deniz bölgesi; 70'ten fazla oynanabilir ülke. Siyasi, arazi, sanayi ve ittifak harita modları.
- **Dokunmatik kontrol:** Tek parmakla kaydırma, iki parmakla yakınlaştırma, birlik sayacına dokunarak seçim, hedefe dokunarak otomatik yol bulma, uzun basışla seçime ekleme, alan seçimi.
- **Ekonomi:** Sivil/askerî fabrikalar ve tersaneler, inşaat kuyruğu, üretim hatları ve verimlilik, çelik/petrol kaynakları ve ithalat, tüketim malları, abluka ve stratejik bombardıman.
- **Ordu:** Piyade, dağ, süvari, motorize, zırhlı ve deniz piyadesi tümenleri; insan gücü, teçhizat, moral ve güç; arazi, tahkimat, siper, hava üstünlüğü, zırh/zırh delme ve ikmal mesafesi etkili muharebe; geri çekilme ve kuşatma; deniz yoluyla taşıma ve çıkarma harekâtı.
- **Araştırma:** Piyade, topçu, zırh, hava, deniz, sanayi ve doktrin dallarında 58 teknoloji; zamanından önce araştırma cezası.
- **Siyaset ve diplomasi:** Askerlik ve ekonomi yasaları, kararlar, savaş gerekçesi, savaş ilanı, ittifak kurma/davet/katılma, askerî geçiş izni, saldırmazlık paktı, garanti, beyaz barış, dünya gerginliği, teslim olma ve ilhak.
- **Tarihî olaylar:** Roma-Berlin Mihveri, Marco Polo Köprüsü, Anschluss, Münih, Çekoslovakya'nın sonu, Molotov-Ribbentrop, Polonya'nın işgali, Kış Savaşı, Weserübung, Fall Gelb, Baltık ilhakı, Barbarossa, Pearl Harbor ve daha fazlası. Oyuncu olayın tarafıysa karar ona kalır. "Serbest dünya" modunda yapay zekâ kendi hedeflerini kovalar.
- **Yapay zekâ:** Her ülke ekonomisini, araştırmasını, üretimini ve ordusunu yönetir; cepheleri tutar, zayıf noktalara yüklenir, gerekirse çıkarma yapar.
- **Ordular ve komutanlar:** Tarihî general ve mareşaller (Fevzi Çakmak, Manstein, Rommel, Jukov, Patton…), saldırı/savunma/planlama/lojistik becerileri, özellikler, tecrübe ve terfi; ordulara "Bekle / Savun / Taarruz" emri ve cephe seçimi.
- **Tümen tasarımcısı:** Taburlar ve destek bölükleriyle kendi tümen şablonlarını tasarla; genişlik, zırh, zırh delme ve hız buna göre hesaplanır.
- **Siyaset:** İstikrar, savaş desteği, parti destekleri ve hükümet değişikliği, siyasi danışmanlar, askerî komutanlar ve tasarım büroları, ulusal ruhlar, askerlik/ekonomi/ticaret yasaları.
- **HOI4 tarzı odak ağaçları:** Türkiye, Almanya, SSCB, Britanya, Fransa, İtalya, Japonya ve ABD için birbirini dışlayan yolları olan ulusal ağaçlar; diğer ülkeler için genel ağaç. Ağaç, çizgileriyle kaydırılabilir bir görünümde gösterilir.
- **Yatay ekran:** Telefon yan çevrildiğinde menü sola, paneller sağa geçer.
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
