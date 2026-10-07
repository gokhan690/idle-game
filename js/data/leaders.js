// Komutanlar, danışmanlar, ulusal ruhlar, alternatif liderler ve başlangıç siyaseti.
(function (g) {
  // ---------- Komutan özellikleri ----------
  g.GEN_TRAITS = {
    panzer: { n: 'Panzer Uzmanı', d: 'Zırhlı ve motorize saldırısı +%15', fx: { armAtk: 0.15 } },
    infantry: { n: 'Piyade Subayı', d: 'Savunma +%10', fx: { def: 0.1 } },
    offensive: { n: 'Saldırgan Taarruzcu', d: 'Saldırı +%12, kayıplar +%10', fx: { atk: 0.12, cas: -0.1 } },
    defensive: { n: 'Savunma Ustası', d: 'Savunma +%15, siper hızı +%25', fx: { def: 0.15, ent: 0.25 } },
    logistics: { n: 'Lojistik Dehası', d: 'İkmal cezası -%50', fx: { sup: 0.5 } },
    desert: { n: 'Çöl Tilkisi', d: 'Çölde saldırı ve savunma +%25', fx: { terrain: { desert: 0.25 } } },
    mountain: { n: 'Dağ Uzmanı', d: 'Dağ ve tepelerde +%25', fx: { terrain: { mountain: 0.25, hills: 0.2 } } },
    jungle: { n: 'Cangıl Faresi', d: 'Cangıl ve bataklıkta +%25', fx: { terrain: { jungle: 0.25, marsh: 0.2 } } },
    winter: { n: 'Kış Uzmanı', d: 'Kuzey cephelerde kışın +%25', fx: { winter: 0.25 } },
    urban: { n: 'Şehir Muharebesi Uzmanı', d: 'Şehirlerde +%25', fx: { terrain: { urban: 0.25 } } },
    cavalry: { n: 'Süvari Geleneği', d: 'Hız +%15', fx: { speed: 0.15 } },
    amphib: { n: 'Çıkarma Uzmanı', d: 'Deniz çıkarmasında ceza -%50', fx: { amph: 0.5 } },
    planner: { n: 'Usta Planlamacı', d: 'Muharebenin ilk günlerinde +%20', fx: { plan: 0.2 } },
    brilliant: { n: 'Parlak Stratejist', d: 'Her beceride +1 seviye', fx: {} },
  };
  // [ad, mareşal mi, saldırı, savunma, planlama, lojistik, özellikler]
  g.GENERALS = {
    GER: [['Erich von Manstein', 1, 5, 4, 6, 3, ['planner', 'brilliant']], ['Gerd von Rundstedt', 1, 4, 4, 4, 3, ['defensive']], ['Fedor von Bock', 1, 4, 3, 3, 3, ['offensive']],
      ['Erwin Rommel', 0, 6, 2, 4, 2, ['desert', 'panzer', 'offensive']], ['Heinz Guderian', 0, 5, 2, 4, 3, ['panzer']], ['Walter Model', 0, 3, 5, 3, 3, ['defensive', 'winter']],
      ['Paul von Kleist', 0, 4, 3, 3, 2, ['panzer']], ['Hermann Hoth', 0, 4, 3, 3, 3, ['panzer']], ['Eduard Dietl', 0, 2, 4, 2, 2, ['mountain', 'winter']]],
    SOV: [['Georgi Jukov', 1, 5, 5, 5, 3, ['brilliant', 'winter']], ['Aleksandr Vasilevski', 1, 3, 4, 6, 4, ['planner']], ['Semyon Timoşenko', 1, 3, 3, 3, 3, []],
      ['Konstantin Rokossovski', 0, 5, 4, 4, 3, ['panzer', 'winter']], ['İvan Konev', 0, 5, 3, 3, 3, ['offensive']], ['Vasili Çuykov', 0, 3, 5, 2, 2, ['urban', 'defensive']],
      ['Semyon Budyonni', 0, 2, 2, 1, 2, ['cavalry']], ['Kliment Voroşilov', 0, 1, 2, 1, 2, []]],
    ENG: [['Alan Brooke', 1, 3, 4, 5, 4, ['planner']], ['Harold Alexander', 1, 4, 4, 4, 3, []], ['Archibald Wavell', 1, 3, 3, 4, 3, ['desert']],
      ['Bernard Montgomery', 0, 4, 4, 6, 4, ['planner', 'desert']], ['Richard O\'Connor', 0, 5, 2, 3, 3, ['desert', 'panzer']], ['William Slim', 0, 4, 4, 4, 4, ['jungle', 'logistics']],
      ['Claude Auchinleck', 0, 3, 4, 3, 3, ['defensive']]],
    FRA: [['Maurice Gamelin', 1, 2, 4, 3, 3, ['defensive']], ['Maxime Weygand', 1, 3, 4, 3, 3, []], ['Charles de Gaulle', 0, 5, 2, 4, 2, ['panzer', 'offensive']],
      ['Alphonse Juin', 0, 4, 3, 4, 3, ['mountain']], ['Philippe Leclerc', 0, 4, 2, 3, 3, ['desert', 'panzer']], ['Henri Giraud', 0, 3, 3, 2, 3, []]],
    USA: [['Dwight Eisenhower', 1, 3, 4, 5, 6, ['logistics', 'planner']], ['Douglas MacArthur', 1, 4, 4, 4, 3, ['amphib', 'jungle']], ['George Patton', 0, 6, 2, 3, 3, ['panzer', 'offensive']],
      ['Omar Bradley', 0, 4, 4, 4, 4, []], ['Mark Clark', 0, 3, 3, 3, 3, ['amphib']], ['Joseph Stilwell', 0, 3, 3, 3, 4, ['jungle']]],
    ITA: [['Pietro Badoglio', 1, 3, 3, 3, 3, []], ['Rodolfo Graziani', 1, 2, 3, 2, 2, ['desert']], ['Giovanni Messe', 0, 4, 4, 3, 3, ['defensive']],
      ['Italo Gariboldi', 0, 2, 3, 2, 2, []], ['Ettore Bastico', 0, 3, 3, 3, 2, ['desert']]],
    JAP: [['Hisaiçi Terauçi', 1, 3, 3, 4, 3, []], ['Yasuji Okamura', 1, 4, 3, 4, 3, []], ['Tomoyuki Yamaşita', 0, 6, 3, 4, 3, ['jungle', 'offensive']],
      ['Masaharu Homma', 0, 4, 3, 3, 3, ['amphib']], ['İvane Matsui', 0, 3, 3, 3, 2, []], ['Tadamiçi Kuribayaşi', 0, 2, 6, 3, 3, ['defensive']]],
    TUR: [['Fevzi Çakmak', 1, 4, 5, 5, 3, ['defensive', 'planner']], ['Kâzım Karabekir', 0, 4, 4, 3, 3, ['mountain']], ['Ali Fuat Cebesoy', 0, 3, 4, 3, 3, []],
      ['Fahrettin Altay', 0, 4, 2, 2, 3, ['cavalry']], ['Asım Gündüz', 0, 3, 4, 3, 3, ['defensive']], ['Salih Omurtak', 0, 3, 3, 3, 3, []], ['İzzettin Çalışlar', 0, 3, 3, 3, 2, ['infantry']]],
    CHI: [['Chen Cheng', 1, 3, 4, 4, 3, []], ['He Yingqin', 1, 2, 3, 3, 3, []], ['Bai Chongxi', 0, 5, 3, 4, 2, ['offensive']], ['Xue Yue', 0, 3, 5, 3, 3, ['defensive']],
      ['Li Zongren', 0, 4, 4, 3, 2, []], ['Sun Li-jen', 0, 4, 3, 3, 3, ['jungle']]],
    POL: [['Edward Rydz-Śmigły', 1, 3, 3, 2, 2, []], ['Władysław Anders', 0, 4, 3, 3, 3, ['cavalry']], ['Tadeusz Kutrzeba', 0, 4, 3, 3, 2, ['offensive']], ['Stanisław Maczek', 0, 4, 2, 3, 3, ['panzer']]],
    FIN: [['Carl Gustaf Mannerheim', 1, 3, 6, 4, 3, ['winter', 'defensive']], ['Hjalmar Siilasvuo', 0, 4, 3, 3, 2, ['winter']]],
    ROM: [['Ion Antonescu', 1, 3, 3, 3, 2, []], ['Petre Dumitrescu', 0, 3, 3, 2, 2, []]],
    HUN: [['Gusztáv Jány', 1, 2, 3, 2, 2, []]],
    SPR: [['Vicente Rojo', 1, 3, 4, 4, 2, ['defensive']], ['Francisco Franco', 0, 4, 3, 4, 3, ['desert']]],
    YUG: [['Dušan Simović', 1, 2, 3, 2, 2, ['mountain']]],
    GRE: [['Alexandros Papagos', 1, 3, 4, 3, 2, ['mountain']]],
  };
  g.GENERIC_GEN_NAMES = ['Kurmay', 'Tümgeneral', 'Korgeneral', 'Orgeneral'];

  // ---------- Danışmanlar ----------
  // rol: pol (siyasi, 3 yuva), army, navy, air (birer), hc (yüksek komuta, 2), tank, plane, ship, ind, theo (tasarım/teorisyen, birer)
  g.ADV_SLOTS = { pol: 3, army: 1, navy: 1, air: 1, hc: 2, tank: 1, plane: 1, ship: 1, ind: 1, theo: 1 };
  g.ADV_ROLE_N = { pol: 'Siyasi danışmanlar', army: 'Kara kuvvetleri komutanı', navy: 'Deniz kuvvetleri komutanı', air: 'Hava kuvvetleri komutanı', hc: 'Yüksek komuta', tank: 'Tank tasarımcısı', plane: 'Uçak tasarımcısı', ship: 'Gemi tasarımcısı', ind: 'Sanayi şirketi', theo: 'Askerî teorisyen' };
  g.ADV_TYPES = {
    workhorse: { r: 'pol', n: 'Sessiz Çalışkan', d: 'Siyasi güç +%15', fx: { ppM: 0.15 } },
    captain: { r: 'pol', n: 'Sanayi Kaptanı', d: 'İnşaat +%10, fabrika +%5', fx: { construct: 0.1, factory: 0.05 } },
    warind: { r: 'pol', n: 'Savaş Sanayii Organizatörü', d: 'Fabrika verimi +%10', fx: { factory: 0.1 } },
    propaganda: { r: 'pol', n: 'Propaganda Bakanı', d: 'Savaş desteği +%15', fx: { ws: 0.15 } },
    figurehead: { r: 'pol', n: 'Halkın Sevdiği Önder', d: 'İstikrar +%15', fx: { stab: 0.15 } },
    recruiter: { r: 'pol', n: 'Askerlik Dairesi Başkanı', d: 'İnsan gücü +%10', fx: { mp: 0.1 } },
    diplomat: { r: 'pol', n: 'Usta Diplomat', d: 'Savaş gerekçesi -%30, gerginlik etkisi azalır', fx: { justify: 0.3 } },
    ideologue: { r: 'pol', n: 'İdeolog', d: 'Yönetici ideoloji desteği artar, istikrar +%5', fx: { drift: 0.002, stab: 0.05 } },
    a_atk: { r: 'army', n: 'Saldırı Doktrini Ustası', d: 'Kara saldırısı +%7', fx: { landAtk: 0.07 } },
    a_def: { r: 'army', n: 'Savunma Doktrini Ustası', d: 'Kara savunması +%7', fx: { landDef: 0.07 } },
    a_man: { r: 'army', n: 'Manevra Ustası', d: 'Hız +%10, moral +%5', fx: { speed: 0.1, org: 0.05 } },
    n_fleet: { r: 'navy', n: 'Filo Amirali', d: 'Deniz gücü +%15', fx: { navy: 0.15 } },
    n_amph: { r: 'navy', n: 'Çıkarma Uzmanı Amiral', d: 'Çıkarma cezası -%25, deniz +%5', fx: { invasion: 0.25, navy: 0.05 } },
    air_sup: { r: 'air', n: 'Hava Üstünlüğü Generali', d: 'Hava gücü +%15', fx: { air: 0.15 } },
    air_cas: { r: 'air', n: 'Yakın Destek Generali', d: 'Hava gücü +%10, kara saldırısı +%3', fx: { air: 0.1, landAtk: 0.03 } },
    hc_inf: { r: 'hc', n: 'Piyade Uzmanı', d: 'Savunma +%5, moral +%5', fx: { landDef: 0.05, org: 0.05 } },
    hc_arm: { r: 'hc', n: 'Zırh Uzmanı', d: 'Zırhlı saldırı +%10', fx: { armAtk: 0.1 } },
    hc_log: { r: 'hc', n: 'Lojistik Uzmanı', d: 'İkmal cezası -%20', fx: { supply: 0.2 } },
    hc_ent: { r: 'hc', n: 'Tahkimat Uzmanı', d: 'Siper hızı +%50', fx: { entrench: 0.5 } },
    d_tank: { r: 'tank', n: 'Tank Tasarım Bürosu', d: 'Zırh araştırması +%15, zırhlı +%5', fx: { rc_arm: 0.15, armAtk: 0.05 } },
    d_plane: { r: 'plane', n: 'Uçak Tasarım Bürosu', d: 'Hava araştırması +%15, hava +%5', fx: { rc_air: 0.15, air: 0.05 } },
    d_ship: { r: 'ship', n: 'Gemi Tasarım Bürosu', d: 'Deniz araştırması +%15, deniz +%5', fx: { rc_nav: 0.15, navy: 0.05 } },
    d_ind: { r: 'ind', n: 'Sanayi Şirketi', d: 'Sanayi araştırması +%15', fx: { rc_ind: 0.15 } },
    d_arms: { r: 'ind', n: 'Silah Üreticisi', d: 'Piyade ve topçu araştırması +%15', fx: { rc_inf: 0.15, rc_art: 0.15 } },
    theo: { r: 'theo', n: 'Askerî Teorisyen', d: 'Doktrin araştırması +%20', fx: { rc_doc: 0.2 } },
  };
  // Ülkeye özel danışman adları: tip -> ad
  g.ADV_NAMES = {
    TUR: { workhorse: 'İsmet İnönü', captain: 'Celal Bayar', diplomat: 'Tevfik Rüştü Aras', ideologue: 'Recep Peker', figurehead: 'Refik Saydam', warind: 'Şükrü Saracoğlu', propaganda: 'Falih Rıfkı Atay', recruiter: 'Kâzım Özalp',
      d_tank: 'MKE Kırıkkale', d_plane: 'Vecihi Hürkuş', d_ship: 'Gölcük Tersanesi', d_ind: 'Karabük Demir Çelik', d_arms: 'Nuri Killigil Fabrikası', theo: 'Fevzi Çakmak' },
    GER: { propaganda: 'Joseph Goebbels', captain: 'Hjalmar Schacht', warind: 'Albert Speer', workhorse: 'Martin Bormann', diplomat: 'Joachim von Ribbentrop', recruiter: 'Fritz Sauckel', ideologue: 'Alfred Rosenberg', figurehead: 'Fritz Todt',
      d_tank: 'Henschel', d_plane: 'Messerschmitt', d_ship: 'Blohm & Voss', d_ind: 'IG Farben', d_arms: 'Krupp', theo: 'Heinz Guderian' },
    SOV: { workhorse: 'Vyaçeslav Molotov', captain: 'Lazar Kaganoviç', warind: 'Nikolai Voznesenski', ideologue: 'Andrei Jdanov', diplomat: 'Maksim Litvinov', propaganda: 'Aleksandr Şçerbakov', figurehead: 'Mihail Kalinin', recruiter: 'Lavrenti Beriya',
      d_tank: 'Harkov Tasarım Bürosu', d_plane: 'Mikoyan-Gureviç', d_ship: 'Nikolayev Tersanesi', d_ind: 'Uralmaş', d_arms: 'Tula Silah Fabrikası', theo: 'Mihail Tuhaçevski' },
    ENG: { diplomat: 'Anthony Eden', warind: 'Lord Beaverbrook', figurehead: 'Clement Attlee', captain: 'John Anderson', workhorse: 'Kingsley Wood', propaganda: 'Brendan Bracken', recruiter: 'Ernest Bevin', ideologue: 'Duff Cooper',
      d_tank: 'Vickers-Armstrong', d_plane: 'Supermarine', d_ship: 'Harland & Wolff', d_ind: 'ICI', d_arms: 'Royal Ordnance', theo: 'J. F. C. Fuller' },
    FRA: { figurehead: 'Léon Blum', captain: 'Paul Reynaud', diplomat: 'Georges Bonnet', warind: 'Raoul Dautry', workhorse: 'Édouard Daladier', propaganda: 'Jean Giraudoux', d_tank: 'Renault', d_plane: 'Dewoitine', d_ship: 'Penhoët Tezgâhları', d_ind: 'Schneider-Creusot', theo: 'Charles de Gaulle' },
    USA: { workhorse: 'Harry Hopkins', captain: 'Henry Morgenthau', diplomat: 'Cordell Hull', warind: 'William Knudsen', figurehead: 'Eleanor Roosevelt', propaganda: 'Elmer Davis', d_tank: 'Chrysler', d_plane: 'Boeing', d_ship: 'Newport News', d_ind: 'General Electric', d_arms: 'Springfield Armory', theo: 'George Marshall' },
    ITA: { diplomat: 'Galeazzo Ciano', captain: 'Alberto Pirelli', propaganda: 'Dino Alfieri', workhorse: 'Achille Starace', warind: 'Carlo Favagrossa', d_tank: 'Ansaldo', d_plane: 'Fiat Aviazione', d_ship: 'Cantieri Riuniti', d_ind: 'Montecatini', theo: 'Pietro Badoglio' },
    JAP: { workhorse: 'Fumimaro Konoe', warind: 'Nobusuke Kişi', diplomat: 'Yosuke Matsuoka', propaganda: 'Sadao Araki', captain: 'Hideki Tojo', d_tank: 'Mitsubişi Ağır Sanayi', d_plane: 'Nakajima', d_ship: 'Kure Deniz Tersanesi', d_ind: 'Mitsui', theo: 'Kanji Işivara' },
  };
  g.ADV_COST = { pol: 150, army: 100, navy: 100, air: 100, hc: 100, tank: 100, plane: 100, ship: 100, ind: 100, theo: 100 };

  // ---------- Ulusal ruhlar ----------
  // h: tarihî açıklama; fx: etkiler (arayüz işaretli olarak gösterir);
  // until: bu tarihte kendiliğinden kalkar; war: ülke savaşa girince kalkar; rm: kaldıran odaklar.
  g.SPIRITS = {
    // Türkiye
    kemalist: { n: 'Kemalist Reformlar', h: 'Laik ve modernleştirici devrimler devletin temelini oluşturuyor.', fx: { stab: 0.1, research: 0.05 } },
    econ_tur: { n: 'Ekonomik Darlık', h: 'Sermaye ve sanayi birikimi yetersiz; ülke hâlâ savaş yıllarının yaralarını sarıyor.', fx: { factory: -0.1 }, rm: ['tur_etatism'] },
    montreux: { n: 'Montrö Sözleşmesi', h: 'Boğazların denetimi yeniden Türkiye\'de.', fx: { navy: 0.1, landDef: 0.05 } },
    inonu: { n: 'Millî Şef', h: 'İsmet İnönü\'nün temkinli ve otoriter liderliği.', fx: { stab: 0.1, ppM: 0.1 } },
    // Sovyetler Birliği
    purge: { n: 'Büyük Temizlik', h: 'Tuhaçevski ve binlerce subay tasfiye edildi; ordu deneyimli komutanlarından yoksun.', fx: { landAtk: -0.15, org: -0.1, stab: 0.1 }, rm: ['sov_purge_end'] },
    pyatiletka: { n: 'Beş Yıllık Planlar', h: 'Ağır sanayiye dayalı zorlayıcı kalkınma.', fx: { construct: 0.1, factory: 0.05, stab: -0.05 } },
    gpw: { n: 'Büyük Vatanseverlik Savaşı', h: 'Bütün ülke anayurt savunması için seferber oldu.', fx: { ws: 0.3, landDef: 0.15, mp: 0.2 } },
    stavka: { n: 'Stavka Reformları', h: 'Uranüs Harekâtı dönemi: Kızıl Ordu savaşmayı öğrendi.', fx: { landAtk: 0.1, org: 0.05 } },
    deep_ops: { n: 'Derin Harekât', h: 'Bagration dönemi: zırhlı kollar düşman cephesini derinlemesine yarıyor.', fx: { armAtk: 0.15, brk: 0.1 } },
    barb_surprise: { n: 'Barbarossa Baskını', h: 'Kızıl Ordu hazırlıksız yakalandı.', fx: { landDef: -0.25, org: -0.2, landAtk: -0.1 } },
    // Birleşik Krallık ve Milletler Topluluğu
    pacifism: { n: 'Barışçı Kamuoyu', h: 'Büyük Savaş\'ın acıları unutulmadı; halk yeni bir savaş istemiyor.', fx: { ws: -0.15 }, rm: ['eng_opinion'] },
    royal_navy: { n: 'Kraliyet Donanması', h: 'Dünyanın en büyük donanması denizlere hâkim.', fx: { navy: 0.1, invasion: 0.1 } },
    never_surrender: { n: 'Asla Teslim Olmayacağız', h: 'Churchill\'in sarsılmaz kararlılığı.', fx: { landDef: 0.15, ws: 0.2 } },
    conscription: { n: 'Zorunlu Askerlik Krizi', h: 'Fransızca konuşan Quebec denizaşırı zorunlu askerliğe karşı.', fx: { mp: -0.25, stab: -0.05 }, rm: ['why_we_fight', 'national_unity'] },
    dominion: { n: 'Dominyon Statüsü', h: 'Westminster Statüsü ile kendi dış politikasını belirliyor; Londra\'ya bağlılık sürüyor.', fx: { ws: -0.1, ppM: -0.05 }, war: 1 },
    saf_split: { n: 'Hertzog-Smuts Ayrılığı', h: 'Afrikaner milliyetçileri ile İngiltere yanlıları arasında derin bölünme.', fx: { stab: -0.1, ws: -0.15 }, war: 1 },
    raj_indep: { n: 'Bağımsızlık Hareketi', h: 'Gandi ve Kongre Partisi İngiliz yönetimine karşı.', fx: { stab: -0.1, ppM: -0.1, factory: -0.05 } },
    // Fransa
    pol_div: { n: 'Siyasi Bölünme', h: 'Halk Cephesi ile sağ ligler arasında derin uçurum.', fx: { stab: -0.15, ppM: -0.1 }, rm: ['fra_unity'] },
    maginot: { n: 'Maginot Zihniyeti', h: 'Ordu tahkimatların ardında savunmaya güveniyor.', fx: { landDef: 0.1, landAtk: -0.1 }, rm: ['fra_degaulle'] },
    victors: { n: 'Büyük Savaş\'ın Galipleri', h: 'Zafer gururu sürüyor ama milyonlarca ölü yeni bir savaşı düşünülemez kılıyor.', fx: { stab: 0.05, ws: -0.1 } },
    fra_shock: { n: 'Savaş Şoku', h: 'Alman yıldırım harekâtı Fransız komutasını felç etti.', fx: { landDef: -0.15, org: -0.15 } },
    resistance: { n: 'Direniş Ruhu', h: 'İşgale karşı halk direnişi.', fx: { landDef: 0.1, stab: 0.05 } },
    // ABD
    depression: { n: 'Büyük Buhran', h: 'Ekonomi 1929 çöküşünden hâlâ toparlanamadı.', fx: { factory: -0.2, stab: -0.1 }, rm: ['usa_newdeal'] },
    neutrality_act: { n: 'Tarafsızlık Yasaları', h: 'Kongre savaşan ülkelere silah satışını yasakladı.', fx: { ws: -0.2 }, rm: ['usa_neutral'] },
    arsenal: { n: 'Demokrasinin Cephaneliği', h: 'Amerikan sanayisi savaş üretimine geçti.', fx: { factory: 0.15, construct: 0.1 } },
    lend_lease: { n: 'Ödünç Verme-Kiralama', h: 'Amerikan teçhizatı ve hammaddesi geliyor.', fx: { factory: 0.05, steel: 10, oil: 10 } },
    landing: { n: 'Müttefik Hava ve Deniz Üstünlüğü', h: 'Çıkarma harekâtı büyük hava ve deniz desteğiyle yapılıyor.', fx: { landAtk: 0.15, invasion: 0.4 } },
    // Almanya
    rearm: { n: 'Yeniden Silahlanma', h: 'Versay kısıtlamaları çiğnendi; ordu hızla büyüyor.', fx: { ws: 0.1, factory: 0.05 } },
    wehrmacht: { n: 'Wehrmacht Doktrini', h: 'Görev taktikleri ve birlikte çalışan silahlar; 1943 ortasına dek üstünlük.', fx: { landAtk: 0.12, armAtk: 0.1, org: 0.1 } },
    autarky: { n: 'Otarşi Programı', h: 'Dört Yıllık Plan: sentetik yakıt ve kendi kendine yetme.', fx: { factory: 0.05, oil: 10 } },
    blitz: { n: 'Yıldırım Savaşı Ruhu', h: 'Hız ve yoğunlaşma.', fx: { armAtk: 0.1, speed: 0.05 } },
    total_war: { n: 'Topyekûn Seferberlik', h: 'Bütün ulus savaş için seferber.', fx: { mp: 0.15, ws: 0.1 } },
    sichelschnitt: { n: 'Orak Darbesi', h: 'Batı Seferi: Ardenler üzerinden zırhlı yarma.', fx: { landAtk: 0.2, armAtk: 0.15, speed: 0.1 } },
    barb_drive: { n: 'Doğu Seferi', h: 'Barbarossa\'nın ilk aylarındaki ivme.', fx: { landAtk: 0.15, armAtk: 0.1 } },
    ost_crisis: { n: 'Doğu Cephesi Yıpranması', h: 'Uzun savaş Alman insan gücünü tüketiyor.', fx: { mp: -0.15, org: -0.05 } },
    // İtalya
    ethiopia: { n: 'Habeşistan Harekâtı', h: 'Doğu Afrika\'daki savaş kaynakları tüketiyor.', fx: { ws: 0.1, ppM: -0.1 }, rm: ['ita_ethiopia'] },
    duce: { n: 'Duce', h: 'Mussolini\'nin kişi kültü rejimi ayakta tutuyor.', fx: { ppM: 0.1, stab: 0.05 } },
    ita_army: { n: 'Hazırlıksız Ordu', h: 'Eski teçhizat, zayıf lojistik ve motorsuz piyade.', fx: { org: -0.05, supply: -0.1 } },
    mare_nostrum: { n: 'Mare Nostrum', h: 'Akdeniz İtalyan gölü olacak.', fx: { navy: 0.15 } },
    // Japonya
    kwantung: { n: 'Kantō Ordusunun Bağımsızlığı', h: 'Mançurya\'daki ordu Tokyo\'yu dinlemiyor.', fx: { landAtk: 0.05, stab: -0.1 }, rm: ['jap_kwantung'] },
    bushido: { n: 'Buşido Ruhu', h: 'Teslim olmayı reddeden savaşçı ahlakı.', fx: { org: 0.1, landDef: 0.05 } },
    jap_rivalry: { n: 'Ordu-Donanma Çekişmesi', h: 'Kara ordusu ile donanma kaynak ve strateji için çekişiyor.', fx: { research: -0.05, ppM: -0.1 } },
    jap_overext: { n: 'Çin Bataklığı', h: 'Japon ordusu Çin\'de aşırı yayıldı.', fx: { landAtk: -0.12, supply: -0.2, mp: -0.25 } },
    // Çin
    warlords: { n: 'Savaş Ağaları', h: 'Taşra valileri Nanking\'e ancak sözde bağlı.', fx: { stab: -0.2, factory: -0.1 }, rm: ['chi_unity'] },
    china_depth: { n: 'Stratejik Derinlik', h: 'Uçsuz bucaksız topraklar ve sonsuz insan gücü.', fx: { landDef: 0.1, mp: 0.2 } },
    chi_corrupt: { n: 'Kuomintang Yolsuzluğu', h: 'Rüşvet ve kayırmacılık devleti kemiriyor.', fx: { construct: -0.15, ppM: -0.1 }, rm: ['chi_industry'] },
    chi_scorched: { n: 'Yanık Toprak ve Derinlik', h: 'Çin\'in iç bölgeleri işgalciyi yutuyor.', fx: { landDef: 0.3, org: 0.1 } },
    guerrilla: { n: 'Gerilla Savaşı', h: 'Uzun Yürüyüş\'ten çıkan Kızıl Ordu köylü desteğiyle savaşıyor.', fx: { org: 0.05, landDef: 0.05 } },
    // Polonya
    sanacja: { n: 'Sanacja Rejimi', h: 'Piłsudski\'nin mirasçıları ülkeyi sıkı denetimle yönetiyor.', fx: { stab: 0.05, ws: 0.1 } },
    pol_two: { n: 'İki Düşman Arasında', h: 'Almanya ile Sovyetler arasında sıkışmış bir ulus.', fx: { ws: 0.1, mp: 0.05 } },
    // İspanya
    spr_violence: { n: 'Siyasi Şiddet', h: 'Sokaklarda sağ ve sol milisler çatışıyor.', fx: { stab: -0.15 }, until: '1939-04-01' },
    nat_aid: { n: 'Lejyon Kondor ve CTV', h: 'Alman ve İtalyan gönüllüler, Faslı birlikler Milliyetçileri destekliyor.', fx: { landAtk: 0.1, org: 0.1, mp: 1.0 } },
    rep_chaos: { n: 'Cumhuriyetçi Bölünme', h: 'Anarşist, komünist ve cumhuriyetçi milisler arasında çekişme.', fx: { org: -0.1, landAtk: -0.1 } },
    // Orta ve Doğu Avrupa
    cze_forts: { n: 'Çekoslovak Sınır Tahkimatı', h: 'Südet dağlarında modern beton istihkâmlar.', fx: { landDef: 0.1, entrench: 0.2 } },
    skoda: { n: 'Škoda Fabrikaları', h: 'Avrupa\'nın en büyük silah üreticilerinden biri.', fx: { factory: 0.1 } },
    stgermain: { n: 'Saint-Germain Antlaşması', h: 'Ordunun boyutu antlaşmayla sınırlandı.', fx: { mp: -0.3, ws: -0.1 } },
    trianon: { n: 'Trianon Antlaşması', h: 'Ordu kısıtlamaları; 1938 Bled Anlaşması ile kalkar.', fx: { mp: -0.3, landAtk: -0.05 }, until: '1938-08-23', rm: ['hun_rearm'] },
    revanchism: { n: 'Revizyonizm', h: 'Trianon\'da yitirilen toprakları geri alma özlemi.', fx: { ws: 0.1 } },
    neuilly: { n: 'Neuilly Antlaşması', h: 'Ordu kısıtlamaları; 1938 Selanik Anlaşması ile kalkar.', fx: { mp: -0.3 }, until: '1938-07-31', rm: ['bul_army'] },
    iron_guard: { n: 'Demir Muhafız Tehdidi', h: 'Faşist lejyonerler kralın otoritesine meydan okuyor.', fx: { stab: -0.1 }, rm: ['rom_carol', 'rom_guard'] },
    yug_ethnic: { n: 'Etnik Gerilimler', h: 'Sırp merkeziyetçiliği ile Hırvat özerklik talepleri çatışıyor.', fx: { stab: -0.15, ws: -0.1 }, rm: ['yug_unity'] },
    gre_debt: { n: 'Dış Borç Yükü', h: 'Uluslararası Mali Komisyon Yunan maliyesini denetliyor.', fx: { construct: -0.1, factory: -0.05 }, rm: ['gre_metaxas'] },
    alb_italy: { n: 'İtalyan Nüfuzu', h: 'Ekonomi ve ordu İtalyan kredilerine bağımlı.', fx: { ppM: -0.15, factory: -0.1 } },
    puppet: { n: 'Kukla Devlet', h: 'Gerçek güç efendi devletin elinde.', fx: { ppM: -0.2, stab: -0.1 } },
    baltic_auth: { n: 'Otoriter Rejim', h: 'Darbe sonrası kurulan tek adam yönetimi; ülke tarafsızlığa sığınıyor.', fx: { stab: 0.05, ws: -0.1 } },
    // Batı ve Kuzey Avrupa
    neutral_state: { n: 'Kesin Tarafsızlık', h: 'Büyük güçlerin çatışmasından uzak durma politikası.', fx: { ws: -0.15, stab: 0.05 }, war: 1 },
    den_disarm: { n: 'Silahsızlanma Politikası', h: 'Sosyal demokrat hükümet orduyu küçülttü.', fx: { landDef: -0.1, mp: -0.2 } },
    swi_redoubt: { n: 'Ulusal Kale (Réduit)', h: 'Alp geçitlerinde tahkimatlı savunma ve milis ordusu.', fx: { landDef: 0.25, entrench: 0.2 } },
    sisu: { n: 'Sisu', h: 'Fin kararlılığı ve kış savaşında ustalık.', fx: { landDef: 0.05, org: 0.05 } },
    armed_neutrality: { n: 'Silahlı Tarafsızlık', h: 'Tarafsız ama saldırıya hazır.', fx: { landDef: 0.15 } },
    estado_novo: { n: 'Estado Novo', h: 'Salazar\'ın korporatist ve tutucu düzeni.', fx: { stab: 0.1, ppM: 0.05 } },
    // Orta Doğu, Afrika ve Asya
    reza_reforms: { n: 'Rıza Şah\'ın Reformları', h: 'Zorlayıcı modernleşme ve merkezîleşme.', fx: { construct: 0.05, stab: -0.05 } },
    iraq_brit: { n: 'İngiliz Nüfuzu', h: '1930 antlaşması İngiltere\'ye üsler ve geniş haklar tanıyor.', fx: { ppM: -0.1 } },
    saudi_tribes: { n: 'Bedevi Kabileleri', h: 'Kabile savaşçıları sadakatle ama düzensiz savaşır.', fx: { mp: 0.1, stab: -0.05 } },
    eth_feudal: { n: 'Feodal Ordu', h: 'Bölgesel ras\'ların silahlı adamları; modern teçhizat yok.', fx: { research: -0.1, factory: -0.1 } },
    gurkha: { n: 'Gurka Geleneği', h: 'Dünyaca ünlü dağ savaşçıları.', fx: { org: 0.1 } },
    sik_soviet: { n: 'Sovyet Nüfuzu', h: 'Şeng Şicay Moskova\'nın desteğine bağımlı.', fx: { ppM: -0.1 } },
    siam_phibun: { n: 'Phibun\'un Milliyetçiliği', h: 'Ülke adını Tayland yapan milliyetçi askerî yönetim.', fx: { ws: 0.1, stab: 0.05 } },
    mon_satellite: { n: 'Sovyet Uydusu', h: 'Moğol Halk Cumhuriyeti Moskova\'ya bağlı.', fx: { ppM: -0.1, speed: 0.05 } },
    // Amerika kıtası
    cardenas: { n: 'Cárdenas Reformları', h: 'Toprak reformu ve 1938\'de petrolün millîleştirilmesi.', fx: { stab: 0.05, construct: 0.05 } },
    vargas: { n: 'Vargas Dönemi', h: 'Getúlio Vargas\'ın merkeziyetçi kalkınma rejimi.', fx: { stab: 0.05, construct: 0.05 } },
    infamous: { n: 'Rezil On Yıl', h: 'Hileli seçimler ve oligarşik yönetim.', fx: { stab: -0.1, ppM: -0.1 }, rm: ['national_unity', 'liberty', 'collectivist'] },
    chaco: { n: 'Chaco Savaşı Yorgunluğu', h: 'Bolivya-Paraguay savaşı ülkeyi tüketti; barış 1938\'de imzalanır.', fx: { mp: -0.2, ws: -0.2, stab: -0.05 }, until: '1938-07-21' },
    banana: { n: 'Yabancı Şirket Nüfuzu', h: 'Ekonomi Amerikan meyve ve maden şirketlerinin elinde.', fx: { factory: -0.1, ppM: -0.05 }, rm: ['construction_effort_2'] },
    caudillo: { n: 'Caudillo Rejimi', h: 'Ordunun desteklediği tek adam yönetimi.', fx: { stab: 0.05, ppM: 0.05 } },
    agrarian: { n: 'Tarım Toplumu', h: 'Sanayi zayıf, nüfusun çoğu köylü.', fx: { research: -0.1, construct: -0.1 }, rm: ['construction_effort_2'] },
  };

  // ---------- Başlangıç siyaseti ----------
  // stab, ws, partiler (dem, fas, com, neu), ruhlar, ticaret yasası
  g.POLITICS = {
    TUR: { stab: 0.65, ws: 0.2, pop: { dem: 0.1, fas: 0.05, com: 0.05, neu: 0.8 }, sp: ['kemalist', 'econ_tur'] },
    GER: { stab: 0.6, ws: 0.35, pop: { dem: 0.08, fas: 0.82, com: 0.05, neu: 0.05 }, sp: ['rearm', 'wehrmacht'], trade: 1 },
    SOV: { stab: 0.5, ws: 0.3, pop: { dem: 0.03, fas: 0.02, com: 0.9, neu: 0.05 }, sp: ['purge', 'pyatiletka'], trade: 3 },
    ENG: { stab: 0.75, ws: 0.1, pop: { dem: 0.8, fas: 0.04, com: 0.06, neu: 0.1 }, sp: ['pacifism', 'royal_navy'] },
    FRA: { stab: 0.45, ws: 0.1, pop: { dem: 0.6, fas: 0.1, com: 0.2, neu: 0.1 }, sp: ['pol_div', 'maginot', 'victors'] },
    USA: { stab: 0.6, ws: 0.05, pop: { dem: 0.85, fas: 0.03, com: 0.04, neu: 0.08 }, sp: ['depression', 'neutrality_act'] },
    ITA: { stab: 0.6, ws: 0.4, pop: { dem: 0.05, fas: 0.75, com: 0.05, neu: 0.15 }, sp: ['ethiopia', 'duce', 'ita_army'] },
    JAP: { stab: 0.55, ws: 0.45, pop: { dem: 0.15, fas: 0.65, com: 0.02, neu: 0.18 }, sp: ['kwantung', 'bushido', 'jap_rivalry'] },
    CHI: { stab: 0.35, ws: 0.4, pop: { dem: 0.1, fas: 0.05, com: 0.15, neu: 0.7 }, sp: ['warlords', 'china_depth', 'chi_corrupt'] },
    POL: { stab: 0.55, ws: 0.3, pop: { dem: 0.15, fas: 0.05, com: 0.05, neu: 0.75 }, sp: ['sanacja', 'pol_two'] },
  };

  // Küçük devletlerin başlangıç ruhları
  g.START_SPIRITS = {
    CZE: ['cze_forts', 'skoda'], AUS: ['stgermain'], HUN: ['trianon', 'revanchism'], BUL: ['neuilly'], ROM: ['iron_guard'],
    YUG: ['yug_ethnic'], GRE: ['gre_debt'], ALB: ['alb_italy'], SPR: ['spr_violence'], POR: ['estado_novo'],
    SWI: ['swi_redoubt', 'neutral_state'], BEL: ['neutral_state'], HOL: ['neutral_state'], LUX: ['neutral_state'],
    DEN: ['neutral_state', 'den_disarm'], NOR: ['neutral_state'], SWE: ['neutral_state'], FIN: ['sisu'], IRE: ['neutral_state'],
    EST: ['baltic_auth'], LAT: ['baltic_auth'], LIT: ['baltic_auth'],
    CAN: ['dominion', 'conscription'], AST: ['dominion'], NZL: ['dominion'], SAF: ['saf_split'], RAJ: ['raj_indep'],
    PRC: ['guerrilla'], MAN: ['puppet'], SLO: ['puppet'], MON: ['mon_satellite'],
    NEP: ['gurkha', 'agrarian'], TIB: ['agrarian'], SIK: ['sik_soviet', 'agrarian'], SIA: ['siam_phibun'],
    PER: ['reza_reforms', 'agrarian'], IRQ: ['iraq_brit'], SAU: ['saudi_tribes', 'agrarian'], YEM: ['agrarian'], OMA: ['agrarian'],
    AFG: ['agrarian'], ETH: ['eth_feudal'], LIB: ['agrarian', 'banana'],
    MEX: ['cardenas'], GUA: ['banana', 'caudillo'], HON: ['banana'], ELS: ['banana', 'caudillo'], NIC: ['banana', 'caudillo'],
    COS: ['banana'], PAN: ['banana'], CUB: ['caudillo'], HAI: ['agrarian'], DOM: ['caudillo'],
    BRA: ['vargas', 'agrarian'], ARG: ['infamous'], CHL: ['agrarian'], PRU: ['agrarian'], BOL: ['chaco', 'agrarian'],
    PAR: ['chaco', 'agrarian'], URU: ['agrarian'], VEN: ['agrarian'], COL: ['agrarian'], ECU: ['agrarian'],
  };

  // ---------- Alternatif liderler (ideoloji değişince) ----------
  g.ALT_LEADERS = {
    TUR: { dem: 'Celal Bayar', fas: 'Cevat Rıfat Atilhan', com: 'Şefik Hüsnü', neu: 'İsmet İnönü' },
    GER: { dem: 'Carl Goerdeler', com: 'Ernst Thälmann', neu: 'Ludwig Beck' },
    SOV: { dem: 'Aleksandr Kerenski', fas: 'Konstantin Rodzayevski', neu: 'Nikolai Buharin' },
    ENG: { fas: 'Oswald Mosley', com: 'Harry Pollitt', neu: 'VIII. Edward', dem: 'Winston Churchill' },
    FRA: { fas: 'Jacques Doriot', com: 'Maurice Thorez', neu: 'Philippe Pétain' },
    USA: { fas: 'William Pelley', com: 'Earl Browder', neu: 'Charles Lindbergh' },
    ITA: { dem: 'Ivanoe Bonomi', com: 'Palmiro Togliatti', neu: 'III. Vittorio Emanuele' },
    JAP: { dem: 'Saionji Kinmoçi', com: 'Sanzo Nosaka', neu: 'Kantaro Suzuki' },
    CHI: { dem: 'Sun Fo', com: 'Mao Zedong', fas: 'Wang Jingwei' },
  };
  g.PARTY_N = { dem: 'Demokratlar', fas: 'Faşistler', com: 'Komünistler', neu: 'Bağlantısızlar' };
})(window);
