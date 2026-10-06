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
  g.SPIRITS = {
    kemalist: { n: 'Kemalist Reformlar', d: 'İstikrar +%10, araştırma +%5', fx: { stab: 0.1, research: 0.05 } },
    econ_tur: { n: 'Ekonomik Darlık', d: 'Fabrika verimi -%10', fx: { factory: -0.1 } },
    montreux: { n: 'Montrö Sözleşmesi', d: 'Deniz gücü +%10, savunma +%5', fx: { navy: 0.1, landDef: 0.05 } },
    inonu: { n: 'Millî Şef', d: 'İstikrar +%10, siyasi güç +%10', fx: { stab: 0.1, ppM: 0.1 } },
    purge: { n: 'Büyük Temizlik', d: 'Kara saldırısı -%15, moral -%10, istikrar +%10', fx: { landAtk: -0.15, org: -0.1, stab: 0.1 } },
    gpw: { n: 'Büyük Vatanseverlik Savaşı', d: 'Savaş desteği +%30, savunma +%15, insan gücü +%20', fx: { ws: 0.3, landDef: 0.15, mp: 0.2 } },
    depression: { n: 'Büyük Buhran', d: 'Fabrika verimi -%20, istikrar -%10', fx: { factory: -0.2, stab: -0.1 } },
    neutrality_act: { n: 'Tarafsızlık Yasaları', d: 'Savaş desteği -%20', fx: { ws: -0.2 } },
    arsenal: { n: 'Demokrasinin Cephaneliği', d: 'Fabrika +%15, inşaat +%10', fx: { factory: 0.15, construct: 0.1 } },
    pacifism: { n: 'Barışçı Kamuoyu', d: 'Savaş desteği -%15', fx: { ws: -0.15 } },
    never_surrender: { n: 'Asla Teslim Olmayacağız', d: 'Savunma +%15, savaş desteği +%20', fx: { landDef: 0.15, ws: 0.2 } },
    pol_div: { n: 'Siyasi Bölünme', d: 'İstikrar -%15, siyasi güç -%10', fx: { stab: -0.15, ppM: -0.1 } },
    maginot: { n: 'Maginot Zihniyeti', d: 'Savunma +%10, saldırı -%10', fx: { landDef: 0.1, landAtk: -0.1 } },
    autarky: { n: 'Otarşi Programı', d: 'Fabrika +%5, sentetik petrol +10', fx: { factory: 0.05, oil: 10 } },
    rearm: { n: 'Yeniden Silahlanma', d: 'Savaş desteği +%10, askerî fabrika üretimi +%5', fx: { ws: 0.1, factory: 0.05 } },
    wehrmacht: { n: 'Wehrmacht Doktrini', d: 'Kara saldırısı +%12, zırhlı saldırı +%10, moral +%10 (1942\'ye dek)', fx: { landAtk: 0.12, armAtk: 0.1, org: 0.1 } },
    sichelschnitt: { n: 'Orak Darbesi', d: 'Batı Seferi: kara saldırısı +%20, zırhlı saldırı +%15, hız +%10', fx: { landAtk: 0.2, armAtk: 0.15, speed: 0.1 } },
    fra_shock: { n: 'Savaş Şoku', d: 'Savunma -%15, moral -%15', fx: { landDef: -0.15, org: -0.15 } },
    barb_surprise: { n: 'Barbarossa Baskını', d: 'Savunma -%20, moral -%15', fx: { landDef: -0.2, org: -0.15 } },
    barb_drive: { n: 'Doğu Seferi', d: 'Kara saldırısı +%15, zırhlı saldırı +%10', fx: { landAtk: 0.15, armAtk: 0.1 } },
    blitz: { n: 'Yıldırım Savaşı Ruhu', d: 'Zırhlı saldırı +%10, hız +%5', fx: { armAtk: 0.1, speed: 0.05 } },
    ethiopia: { n: 'Habeşistan Harekâtı', d: 'Savaş desteği +%10, siyasi güç -%10', fx: { ws: 0.1, ppM: -0.1 } },
    mare_nostrum: { n: 'Mare Nostrum', d: 'Deniz gücü +%15', fx: { navy: 0.15 } },
    kwantung: { n: 'Kantō Ordusunun Bağımsızlığı', d: 'Saldırı +%5, istikrar -%10', fx: { landAtk: 0.05, stab: -0.1 } },
    bushido: { n: 'Buşido Ruhu', d: 'Moral +%10, savunma +%5', fx: { org: 0.1, landDef: 0.05 } },
    warlords: { n: 'Savaş Ağaları', d: 'İstikrar -%20, fabrika -%10', fx: { stab: -0.2, factory: -0.1 } },
    china_depth: { n: 'Stratejik Derinlik', d: 'Savunma +%10, insan gücü +%20', fx: { landDef: 0.1, mp: 0.2 } },
    sanacja: { n: 'Sanacja Rejimi', d: 'İstikrar +%5, savaş desteği +%10', fx: { stab: 0.05, ws: 0.1 } },
    lend_lease: { n: 'Ödünç Verme-Kiralama', d: 'Fabrika verimi +%5, kaynak +10', fx: { factory: 0.05, steel: 10, oil: 10 } },
    armed_neutrality: { n: 'Silahlı Tarafsızlık', d: 'Savunma +%15', fx: { landDef: 0.15 } },
    total_war: { n: 'Topyekûn Seferberlik Ruhu', d: 'İnsan gücü +%15, savaş desteği +%10', fx: { mp: 0.15, ws: 0.1 } },
    resistance: { n: 'Direniş Ruhu', d: 'Savunma +%10, istikrar +%5', fx: { landDef: 0.1, stab: 0.05 } },
  };

  // ---------- Başlangıç siyaseti ----------
  // stab, ws, partiler (dem, fas, com, neu), ruhlar, ticaret yasası
  g.POLITICS = {
    TUR: { stab: 0.65, ws: 0.2, pop: { dem: 0.1, fas: 0.05, com: 0.05, neu: 0.8 }, sp: ['kemalist', 'econ_tur'] },
    GER: { stab: 0.6, ws: 0.35, pop: { dem: 0.08, fas: 0.82, com: 0.05, neu: 0.05 }, sp: ['rearm', 'wehrmacht'], trade: 1 },
    SOV: { stab: 0.5, ws: 0.3, pop: { dem: 0.03, fas: 0.02, com: 0.9, neu: 0.05 }, sp: ['purge'], trade: 3 },
    ENG: { stab: 0.75, ws: 0.1, pop: { dem: 0.8, fas: 0.04, com: 0.06, neu: 0.1 }, sp: ['pacifism'] },
    FRA: { stab: 0.45, ws: 0.1, pop: { dem: 0.6, fas: 0.1, com: 0.2, neu: 0.1 }, sp: ['pol_div', 'maginot'] },
    USA: { stab: 0.6, ws: 0.05, pop: { dem: 0.85, fas: 0.03, com: 0.04, neu: 0.08 }, sp: ['depression', 'neutrality_act'] },
    ITA: { stab: 0.6, ws: 0.4, pop: { dem: 0.05, fas: 0.75, com: 0.05, neu: 0.15 }, sp: ['ethiopia'] },
    JAP: { stab: 0.55, ws: 0.45, pop: { dem: 0.15, fas: 0.65, com: 0.02, neu: 0.18 }, sp: ['kwantung', 'bushido'] },
    CHI: { stab: 0.35, ws: 0.4, pop: { dem: 0.1, fas: 0.05, com: 0.15, neu: 0.7 }, sp: ['warlords', 'china_depth'] },
    POL: { stab: 0.55, ws: 0.3, pop: { dem: 0.15, fas: 0.05, com: 0.05, neu: 0.75 }, sp: ['sanacja'] },
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
