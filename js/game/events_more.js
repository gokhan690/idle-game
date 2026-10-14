// Yeni tarihî olaylar (HOI4): büyük güçler ve Türkiye için tarihli olay pencereleri.
// Olay oyuncunun ülkesindeyse seçenekli pencere açılır ve seçenek yalnız oyuncuyu etkiler.
// Yapay zekâ ülkesinde: tarihî modda yalnızca dünya haberi (tarih akışı değişmez); diğer modlarda ilk seçenek uygulanır.
(function (g) {
  const G = g.G;
  const alive = (t) => !!G.st.C[t]?.alive;
  const war = (a, b) => alive(a) && alive(b) && G.atWar(a, b);
  // etki: pp siyasi güç, stab/ws istikrar ve savaş desteği (kalıcı ek), mp insan gücü (bin), axp kara tecrübesi, ten gerginlik, fac [tür, adet]
  const apply = (c, o) => {
    if (!o) return;
    if (o.pp) c.pp = Math.max(0, c.pp + o.pp);
    if (o.stab) c.stabX = (c.stabX || 0) + o.stab;
    if (o.ws) c.wsX = (c.wsX || 0) + o.ws;
    if (o.mp) c.mpAvail = Math.max(0, (c.mpAvail || 0) + o.mp);
    if (o.axp) c.axp = Math.min(500, (c.axp ?? 30) + o.axp);
    if (o.ten) G.st.tension = Math.max(0, Math.min(100, G.st.tension + o.ten));
    if (o.fac) G.addFactories(c.tag, o.fac[0], o.fac[1]);
  };
  const D = (o) => { const p = []; if (o.pp) p.push(`siyasi güç ${o.pp > 0 ? '+' : ''}${o.pp}`); if (o.stab) p.push(`istikrar ${o.stab > 0 ? '+' : '−'}%${Math.round(Math.abs(o.stab) * 100)}`); if (o.ws) p.push(`savaş desteği ${o.ws > 0 ? '+' : '−'}%${Math.round(Math.abs(o.ws) * 100)}`); if (o.mp) p.push(`insan gücü +${o.mp}K`); if (o.axp) p.push(`kara tecrübesi +${o.axp}`); if (o.ten) p.push(`dünya gerginliği ${o.ten > 0 ? '+' : ''}${o.ten}`); if (o.fac) p.push(`+${o.fac[1]} ${o.fac[0] === 'mil' ? 'askerî' : 'sivil'} fabrika`); return p.join(', '); };
  // [kimlik, tarih, ülke, koşul, başlık, metin, [[seçenek, etki], ...], haber]
  const EV = [
    // Almanya
    ['rhine', '1936-03-07', 'GER', () => true, 'Ren Bölgesi', 'Wehrmacht birlikleri askerden arındırılmış Ren bölgesine giriyor. Fransa ve İngiltere tepki verecek mi?', [['Birlikler ilerlesin', { ws: 0.05, ten: 3, pp: 15 }], ['Temkinli ol', { stab: 0.03 }]], 1],
    ['olymp', '1936-08-01', 'GER', () => true, 'Berlin Olimpiyatları', 'Dünyanın gözü Berlin\'de. Oyunlar rejimin vitrini olacak.', [['Propaganda şöleni', { pp: 25, stab: 0.02 }], ['Sporculara odaklan', { stab: 0.04 }]], 1],
    ['bob', '1940-07-10', 'GER', () => war('GER', 'ENG'), 'Britanya Muharebesi', 'Luftwaffe Manş üzerinde Kraliyet Hava Kuvvetleri\'ne karşı hava üstünlüğü kurmaya çalışıyor.', [['Hava saldırısını sürdür', { ws: 0.02, axp: 10 }], ['Doğuya hazırlan', { axp: 15 }]], 1],
    ['stalingrad', '1942-08-23', 'GER', () => war('GER', 'SOV'), 'Stalingrad Muharebesi', '6. Ordu Volga kıyısındaki şehre giriyor. Sokak sokak, ev ev çarpışma başladı.', [['Şehri ne pahasına olursa olsun al', { ws: 0.03, mp: -40 }], ['Kuşatma hattını koru', { stab: 0.02 }]], 1],
    ['kursk', '1943-07-05', 'GER', () => war('GER', 'SOV'), 'Kale Harekâtı (Kursk)', 'Tarihin en büyük tank muharebesi başlıyor. Panzerler Kursk çıkıntısına yükleniyor.', [['Saldır', { axp: 25, ws: -0.02 }], ['Savunmaya geç', { stab: 0.02, axp: 10 }]], 1],
    ['july20', '1944-07-20', 'GER', () => alive('GER') && G.st.C.GER.ideo === 'fas', '20 Temmuz Suikast Girişimi', 'Kurt İni\'nde bir bomba patladı. Subaylardan oluşan bir grup rejimi devirmeye çalıştı.', [['Komplocuları tasfiye et', { stab: 0.03, pp: -30 }], ['Orduya güvenmeyi sürdür', { stab: -0.05, axp: 10 }]], 1],
    ['ardennes', '1944-12-16', 'GER', () => war('GER', 'USA') || war('GER', 'ENG'), 'Ardenler Taarruzu', 'Son büyük Alman taarruzu karlı ormanlarda başlıyor: hedef Anvers.', [['Her şeyi ortaya koy', { ws: 0.04, mp: -30 }], ['Batı Duvarı\'nda bekle', { stab: 0.02 }]], 1],
    // Sovyetler Birliği
    ['sovconst', '1936-12-05', 'SOV', () => true, 'Stalin Anayasası', 'Yeni anayasa "dünyanın en demokratik anayasası" olarak ilan edildi.', [['Kutlamalar düzenle', { pp: 20, stab: 0.03 }]], 0],
    ['leningrad', '1941-09-08', 'SOV', () => war('GER', 'SOV'), 'Leningrad Kuşatması', 'Alman ve Fin orduları Leningrad\'ın etrafındaki çemberi kapattı. Şehir aç ve soğuk bir kışa hazırlanıyor.', [['Hayat Yolu\'nu aç', { stab: 0.03 }], ['Şehir son adama kadar direnecek', { ws: 0.05 }]], 1],
    ['moscow', '1941-10-02', 'SOV', () => war('GER', 'SOV'), 'Moskova Muharebesi', 'Tayfun Harekâtı başladı: Alman orduları başkente yöneliyor.', [['Halk milisleri seferber', { mp: 80, ws: 0.03 }], ['Hükümeti Kuybişev\'e taşı', { stab: -0.03, pp: 30 }]], 1],
    ['order227', '1942-07-28', 'SOV', () => war('GER', 'SOV'), '227 Sayılı Emir', '"Bir adım bile geri yok!" Stalin\'in emri cepheye okunuyor.', [['Emri uygula', { ws: 0.05, stab: -0.02 }], ['Komutanlara esneklik tanı', { axp: 15 }]], 0],
    ['leninlift', '1944-01-27', 'SOV', () => war('GER', 'SOV'), 'Leningrad Kurtarıldı', '872 günlük kuşatma sona erdi. Şehir top atışlarıyla kutlanıyor.', [['Kahraman şehir', { ws: 0.04, stab: 0.03 }]], 1],
    ['bagration', '1944-06-22', 'SOV', () => war('GER', 'SOV'), 'Bagration Harekâtı', 'Kızıl Ordu Beyaz Rusya\'da Ordu Grubu Merkez\'e karşı dev bir taarruz başlattı.', [['Derin harekât', { axp: 25 }], ['Kayıpları sınırla', { mp: 40 }]], 1],
    // Birleşik Krallık
    ['abdic', '1936-12-11', 'ENG', () => true, 'VIII. Edward Tahttan Çekildi', 'Kral, Wallis Simpson ile evlenmek için tahttan feragat etti. Taç VI. George\'a geçiyor.', [['Monarşiyi koru', { stab: 0.02 }]], 1],
    ['churchill', '1940-05-10', 'ENG', () => war('GER', 'ENG'), 'Churchill Başbakan', '"Size kan, emek, gözyaşı ve terden başka bir şey vaat edemem." Winston Churchill hükümeti kurdu.', [['Asla teslim olmayacağız', { ws: 0.08, pp: 20 }]], 1],
    ['dynamo', '1940-05-26', 'ENG', () => war('GER', 'ENG') && war('GER', 'FRA'), 'Dinamo Harekâtı', 'Dunkerque kumsallarında sıkışan ordunun tahliyesi için her tekne seferber edildi.', [['Küçük tekneler de katılsın', { mp: 60, ws: 0.03 }], ['Yalnızca donanma', { stab: 0.02 }]], 1],
    ['tobruk', '1941-04-11', 'ENG', () => war('ENG', 'ITA') || war('ENG', 'GER'), 'Tobruk Kuşatması', 'Avustralya ve İngiliz birlikleri Tobruk limanında kuşatıldı. "Tobruk Fareleri" direniyor.', [['Limanı tut', { axp: 15, ws: 0.02 }], ['Denizden ikmal et', { stab: 0.02 }]], 0],
    ['alamein', '1942-10-23', 'ENG', () => war('ENG', 'GER') || war('ENG', 'ITA'), 'El Alamein', 'Montgomery\'nin 8. Ordusu çölde büyük taarruza geçti.', [['Taarruz', { axp: 20, ws: 0.04 }]], 1],
    ['yalta', '1945-02-04', 'ENG', () => alive('USA') && alive('SOV') && alive('ENG'), 'Yalta Konferansı', 'Churchill, Roosevelt ve Stalin savaş sonrası dünyayı Kırım\'da konuşuyor.', [['Uzlaşma', { stab: 0.02, pp: 20 }], ['Doğu Avrupa\'da sert dur', { ws: 0.02 }]], 1],
    // Fransa
    ['frontpop', '1936-06-04', 'FRA', () => G.st.C.FRA?.ideo === 'dem', 'Halk Cephesi Hükümeti', 'Léon Blum başbakan oldu. Grevler, ücretli izin ve 40 saatlik çalışma haftası gündemde.', [['Sosyal reformlar', { stab: 0.05 }], ['Silahlanmaya öncelik', { ws: 0.03, stab: -0.03 }]], 0],
    ['appeal18', '1940-06-18', 'FRA', () => war('GER', 'FRA'), '18 Haziran Çağrısı', 'General de Gaulle Londra radyosundan sesleniyor: "Fransız direnişinin alevi sönmemeli."', [['Direniş sürüyor', { ws: 0.06 }]], 1],
    // ABD
    ['quarantine', '1937-10-05', 'USA', () => true, 'Karantina Konuşması', 'Roosevelt saldırgan devletlerin "karantinaya alınması" çağrısında bulundu.', [['Yalnızcılığa karşı çık', { ws: 0.04, stab: -0.02 }], ['Kamuoyunu zorlama', { stab: 0.02 }]], 1],
    ['draft40', '1940-09-16', 'USA', () => true, 'Seçici Hizmet Yasası', 'Barış zamanında ilk zorunlu askerlik yasası Kongre\'den geçti.', [['Yasayı imzala', { mp: 150, ws: 0.03 }]], 0],
    ['fdrdeath', '1945-04-12', 'USA', () => alive('USA'), 'Roosevelt Öldü', 'Başkan Franklin D. Roosevelt Warm Springs\'te hayatını kaybetti. Harry S. Truman yemin etti.', [['Ulusal yas', { stab: -0.02, ws: 0.02 }]], 1],
    // İtalya
    ['ducefall', '1943-07-25', 'ITA', () => alive('ITA') && G.st.C.ITA.ideo === 'fas' && G.st.C.ITA.enemies.length > 0, 'Mussolini\'nin Düşüşü', 'Faşist Büyük Konsey Duçe\'ye güvensizlik oyu verdi; Kral, Mussolini\'yi tutuklattı.', [['Savaşı sürdür', { stab: -0.05 }], ['Gizli barış görüşmeleri', { ws: -0.05, stab: 0.03 }]], 1],
    // Japonya
    ['singapore', '1942-02-15', 'JAP', () => war('JAP', 'ENG'), 'Singapur Düştü', 'Doğunun Cebelitarık\'ı teslim oldu: İngiliz İmparatorluğu\'nun en büyük yenilgisi.', [['Zafer kutlaması', { ws: 0.05, pp: 20 }]], 1],
    ['iwojima', '1945-02-19', 'JAP', () => war('JAP', 'USA'), 'Iwo Jima', 'Amerikan deniz piyadeleri volkanik adaya çıktı. Garnizon son adama kadar direnecek.', [['Son adama kadar', { ws: 0.03, axp: 10 }]], 1],
    // Türkiye
    ['montreux36', '1936-07-20', 'TUR', () => true, 'Montrö Boğazlar Sözleşmesi', 'Boğazlar üzerindeki Türk egemenliği uluslararası antlaşmayla tanındı; Boğazlar yeniden askerîleştirilebilir.', [['Boğazları tahkim et', { pp: 20, stab: 0.03 }]], 0],
    ['milli_sef', '1938-12-26', 'TUR', () => G.st.C.TUR?.alive, 'Millî Şef', 'Olağanüstü kurultay İsmet İnönü\'yü "Değişmez Genel Başkan" ve "Millî Şef" ilan etti.', [['Birlik ve beraberlik', { stab: 0.04, pp: 15 }]], 0],
    ['koyenst', '1940-04-17', 'TUR', () => G.st.C.TUR?.alive, 'Köy Enstitüleri', 'Köylerin öğretmenini yetiştirecek Köy Enstitüleri Kanunu kabul edildi.', [['Kanunu uygula', { stab: 0.03, pp: -15 }], ['Bütçeyi orduya ayır', { ws: 0.02 }]], 0],
    ['tur_ger_break', '1944-08-02', 'TUR', () => alive('TUR') && alive('GER') && !G.atWar('TUR', 'GER'), 'Almanya ile İlişkiler Kesildi', 'Müttefiklerin baskısıyla Türkiye, Almanya ile diplomatik ve ekonomik ilişkilerini kesti; krom satışı durdu.', [['Müttefiklere yaklaş', { ws: 0.03, pp: 10 }], ['Tarafsızlığı koru', { stab: 0.02 }]], 0],
    // Çin
    ['xian', '1936-12-12', 'CHI', () => alive('CHI'), 'Xi\'an Olayı', 'Çan Kay-şek kendi generalleri tarafından alıkonuldu; komünistlerle Japonya\'ya karşı birleşik cephe isteniyor.', [['Birleşik cephe', { stab: 0.04, ws: 0.04 }], ['Komünistlere karşı kampanya', { pp: 20, stab: -0.03 }]], 1],
  ];
  G.MORE_EV = EV;
  let days = null;
  G.moreEvTick = () => {
    const st = G.st;
    if (!days) days = EV.map((e) => G.dayOf(e[1]));
    for (let i = 0; i < EV.length; i++) {
      if (st.day !== days[i]) continue;
      const [id, , tag, cond, title, text, opts, news] = EV[i];
      if (!alive(tag) || !cond()) continue;
      const c = st.C[tag];
      if (G.isLocal(tag)) {
        G.queuePopup({ title, text, opts: opts.map(([n, o]) => ({ n, d: D(o), fx: () => { apply(c, o); G.log(`${title}: ${n}.`, [tag], 'major'); } })) });
      } else {
        if (!st.opts.hist) apply(c, opts[0][1]);
        G.log(`${G.cname(tag)}: ${title}.`, [tag], news ? 'major' : 'info');
        if (news && st.player && G.newsOn && st._newsDay !== st.day) { st._newsDay = st.day; G.queuePopup({ news: 1, eyebrow: 'Dünya haberleri · ' + G.fmtDate(st.day), title, text, opts: [{ n: 'İlginç', fx: () => {} }] }); }
      }
    }
  };
})(window);
