// Oyun içeriği: arazi, teçhizat, birlikler, teknolojiler, ulusal odaklar, yasalar.
(function (g) {
  g.TERRAIN = [
    { id: 'plains', n: 'Ova', atk: 0, move: 1.0, width: 4, c: '#9aa66a' },
    { id: 'forest', n: 'Orman', atk: -0.15, move: 1.3, width: 3, c: '#4f7a45' },
    { id: 'hills', n: 'Tepelik', atk: -0.25, move: 1.5, width: 3, c: '#a08a5c' },
    { id: 'mountain', n: 'Dağlık', atk: -0.5, move: 2.0, width: 2, c: '#7d7268' },
    { id: 'desert', n: 'Çöl', atk: 0, move: 1.3, width: 4, c: '#d8c48d' },
    { id: 'marsh', n: 'Bataklık', atk: -0.4, move: 2.0, width: 2, c: '#5f8a7c' },
    { id: 'jungle', n: 'Cangıl', atk: -0.3, move: 2.0, width: 2, c: '#2f6a3a' },
    { id: 'urban', n: 'Şehir', atk: -0.3, move: 1.0, width: 3, c: '#9c8f86' },
  ];

  // Teçhizat: maliyet (IC), fabrika türü, günlük kaynak ihtiyacı (fabrika başına)
  g.EQUIP = {
    inf: { n: 'Piyade Teçhizatı', s: 'Piyade T.', cost: 0.5, fac: 'mil', steel: 0.4, oil: 0 },
    art: { n: 'Topçu', s: 'Topçu', cost: 3.5, fac: 'mil', steel: 0.8, oil: 0 },
    mot: { n: 'Motorlu Araç', s: 'Motorlu', cost: 2.5, fac: 'mil', steel: 0.5, oil: 0.5, req: 'mot1' },
    tank: { n: 'Tank', s: 'Tank', cost: 8, fac: 'mil', steel: 1, oil: 0.6, req: 'tank1' },
    fig: { n: 'Savaş Uçağı', s: 'Avcı', cost: 22, fac: 'mil', steel: 0.4, oil: 0.6, air: 1 },
    cas: { n: 'Yakın Destek Uçağı', s: 'YDU', cost: 24, fac: 'mil', steel: 0.5, oil: 0.6, air: 1 },
    bom: { n: 'Bombardıman Uçağı', s: 'Bombacı', cost: 35, fac: 'mil', steel: 0.6, oil: 0.8, air: 1 },
    dd: { n: 'Muhrip', s: 'Muhrip', cost: 1500, fac: 'dock', steel: 1, oil: 0.3, ship: 1, str: 1 },
    cr: { n: 'Kruvazör', s: 'Kruvazör', cost: 3500, fac: 'dock', steel: 1.2, oil: 0.3, ship: 1, str: 3 },
    bb: { n: 'Zırhlı Gemi', s: 'Zırhlı', cost: 10000, fac: 'dock', steel: 1.5, oil: 0.4, ship: 1, str: 10 },
    ss: { n: 'Denizaltı', s: 'Denizaltı', cost: 1000, fac: 'dock', steel: 0.8, oil: 0.2, ship: 1, str: 0.8 },
    cv: { n: 'Uçak Gemisi', s: 'U. Gemisi', cost: 12000, fac: 'dock', steel: 1.5, oil: 0.5, ship: 1, str: 12, req: 'cv1' },
  };
  g.SHIPS = ['dd', 'cr', 'bb', 'ss', 'cv'];
  g.PLANES = ['fig', 'cas', 'bom'];

  // Tümen tipleri
  g.UNITS = {
    inf: { n: 'Piyade Tümeni', s: 'PİY', mp: 10, eq: { inf: 1000, art: 36 }, days: 60, atk: 12, def: 20, org: 60, spd: 4, arm: 0, prc: 6 },
    mtn: { n: 'Dağ Tümeni', s: 'DAĞ', mp: 10, eq: { inf: 1100, art: 24 }, days: 80, atk: 12, def: 22, org: 70, spd: 4, arm: 0, prc: 5, bonus: { mountain: 0.35, hills: 0.2 }, req: 'mtn1' },
    cav: { n: 'Süvari Tümeni', s: 'SÜV', mp: 8, eq: { inf: 900 }, days: 50, atk: 9, def: 15, org: 60, spd: 6, arm: 0, prc: 4 },
    mot: { n: 'Motorize Tümen', s: 'MOT', mp: 10, eq: { inf: 1000, art: 36, mot: 300 }, days: 90, atk: 14, def: 22, org: 60, spd: 10, arm: 2, prc: 8, req: 'mot1' },
    arm: { n: 'Zırhlı Tümen', s: 'ZRH', mp: 8, eq: { inf: 500, tank: 120, mot: 200 }, days: 120, atk: 32, def: 14, org: 50, spd: 9, arm: 30, prc: 35, req: 'tank1' },
    mar: { n: 'Deniz Piyadesi', s: 'DNZ', mp: 8, eq: { inf: 1000, art: 12 }, days: 90, atk: 12, def: 18, org: 65, spd: 4, arm: 0, prc: 5, amph: 1, req: 'mar1' },
  };

  // Teknolojiler: cat, year, pre (önkoşul), fx (etkiler)
  const T = (id, n, cat, year, pre, fx, d) => ({ id, n, cat, year, pre, fx, d });
  g.TECH_CATS = { inf: 'Piyade', art: 'Topçu', arm: 'Zırh', air: 'Hava', nav: 'Deniz', ind: 'Sanayi', doc: 'Doktrin' };
  g.TECHS = [
    T('inf1', 'Piyade Teçhizatı I', 'inf', 1936, [], { eq_inf: 1 }, 'Temel tüfek ve makineli tüfekler.'),
    T('sup1', 'Destek Bölükleri', 'inf', 1936, [], { org: 0.05, landDef: 0.05 }, 'İstihkâm ve keşif bölükleri: +%5 savunma ve moral.'),
    T('mot1', 'Motorizasyon', 'inf', 1936, [], { unlock: 'mot' }, 'Motorize tümenler ve motorlu araç üretimi.'),
    T('mtn1', 'Dağ Piyadesi', 'inf', 1936, ['sup1'], { unlock: 'mtn' }, 'Dağlık arazide uzman tümenler.'),
    T('inf2', 'Piyade Teçhizatı II', 'inf', 1939, ['inf1'], { eq_inf: 2 }, 'Yarı otomatik tüfekler: piyade +%15 saldırı.'),
    T('mar1', 'Deniz Piyadesi', 'inf', 1938, ['sup1'], { unlock: 'mar' }, 'Çıkarma harekâtına özel tümenler.'),
    T('sup2', 'Gelişmiş Lojistik', 'inf', 1940, ['sup1'], { org: 0.1, speed: 0.1 }, '+%10 moral ve hareket hızı.'),
    T('inf3', 'Piyade Teçhizatı III', 'inf', 1942, ['inf2'], { eq_inf: 3 }, 'Taarruz tüfekleri.'),
    T('art1', 'Topçu I', 'art', 1936, [], { eq_art: 1 }, 'Sahra topları.'),
    T('art2', 'Topçu II', 'art', 1939, ['art1'], { eq_art: 2 }, 'Uzun menzilli obüsler: +%10 saldırı.'),
    T('at1', 'Tanksavar', 'art', 1938, ['art1'], { prc: 15 }, 'Piyadenin zırh delme gücü +15.'),
    T('aa1', 'Uçaksavar', 'art', 1938, ['art1'], { aa: 0.3 }, 'Düşman hava üstünlüğü etkisi -%30.'),
    T('art3', 'Topçu III', 'art', 1942, ['art2'], { eq_art: 3 }, 'Roketatarlar ve ağır topçu.'),
    T('at2', 'Gelişmiş Tanksavar', 'art', 1942, ['at1'], { prc: 20 }, 'Zırh delme +20.'),
    T('tank1', 'Hafif Tank', 'arm', 1936, [], { unlock: 'arm', eq_tank: 1 }, 'Zırhlı tümenleri açar.'),
    T('tank2', 'Orta Tank', 'arm', 1939, ['tank1'], { eq_tank: 2 }, 'Zırhlı tümen gücü +%25.'),
    T('tank3', 'Ağır Tank', 'arm', 1941, ['tank2'], { eq_tank: 3 }, 'Zırhlı tümen gücü +%25.'),
    T('tank4', 'Modern Tank', 'arm', 1944, ['tank3'], { eq_tank: 4 }, 'Zırhlı tümen gücü +%25.'),
    T('fig1', 'Avcı Uçağı I', 'air', 1936, [], { eq_fig: 1 }, 'Çift kanatlı avcılar.'),
    T('cas1', 'Yakın Destek I', 'air', 1936, [], { eq_cas: 1 }, 'Pike bombardıman uçakları.'),
    T('bom1', 'Bombardıman I', 'air', 1936, [], { eq_bom: 1 }, 'Stratejik bombardıman uçakları.'),
    T('fig2', 'Avcı Uçağı II', 'air', 1940, ['fig1'], { eq_fig: 2 }, 'Tek kanatlı avcılar.'),
    T('cas2', 'Yakın Destek II', 'air', 1940, ['cas1'], { eq_cas: 2 }, ''),
    T('bom2', 'Bombardıman II', 'air', 1940, ['bom1'], { eq_bom: 2 }, ''),
    T('fig3', 'Avcı Uçağı III', 'air', 1943, ['fig2'], { eq_fig: 3 }, ''),
    T('jet', 'Jet Motoru', 'air', 1944, ['fig3'], { eq_fig: 4 }, ''),
    T('dd1', 'Muhrip I', 'nav', 1936, [], { eq_dd: 1 }, ''),
    T('ss1', 'Denizaltı I', 'nav', 1936, [], { eq_ss: 1 }, ''),
    T('bb1', 'Zırhlı Gemi I', 'nav', 1936, [], { eq_bb: 1, eq_cr: 1 }, ''),
    T('cv1', 'Uçak Gemisi', 'nav', 1937, ['dd1'], { unlock_eq: 'cv', eq_cv: 1 }, 'Uçak gemisi üretimini açar.'),
    T('dd2', 'Muhrip II', 'nav', 1940, ['dd1'], { eq_dd: 2 }, ''),
    T('ss2', 'Denizaltı II', 'nav', 1940, ['ss1'], { eq_ss: 2 }, ''),
    T('bb2', 'Zırhlı Gemi II', 'nav', 1940, ['bb1'], { eq_bb: 2, eq_cr: 2 }, ''),
    T('radar', 'Radar', 'nav', 1941, ['dd2'], { navy: 0.15, air: 0.1 }, 'Deniz gücü +%15, hava +%10.'),
    T('ind1', 'Sanayi Teknikleri I', 'ind', 1936, [], { factory: 0.1 }, 'Fabrika verimi +%10.'),
    T('con1', 'İnşaat Teknikleri I', 'ind', 1936, [], { construct: 0.1 }, 'İnşaat hızı +%10.'),
    T('eff1', 'Üretim Verimliliği I', 'ind', 1937, ['ind1'], { effCap: 0.1 }, 'Üretim verim tavanı +%10.'),
    T('ind2', 'Sanayi Teknikleri II', 'ind', 1938, ['ind1'], { factory: 0.1 }, ''),
    T('con2', 'İnşaat Teknikleri II', 'ind', 1938, ['con1'], { construct: 0.1 }, ''),
    T('syn1', 'Sentetik Yakıt', 'ind', 1939, ['ind2'], { oil: 20 }, 'Günlük +20 petrol.'),
    T('eff2', 'Üretim Verimliliği II', 'ind', 1939, ['eff1'], { effCap: 0.1 }, ''),
    T('ind3', 'Sanayi Teknikleri III', 'ind', 1940, ['ind2'], { factory: 0.1 }, ''),
    T('comp', 'Elektromekanik Hesaplama', 'ind', 1940, ['ind2'], { research: 0.1 }, 'Araştırma hızı +%10.'),
    T('con3', 'İnşaat Teknikleri III', 'ind', 1940, ['con2'], { construct: 0.15 }, ''),
    T('ind4', 'Sanayi Teknikleri IV', 'ind', 1942, ['ind3'], { factory: 0.1 }, ''),
    T('eff3', 'Üretim Verimliliği III', 'ind', 1941, ['eff2'], { effCap: 0.1 }, ''),
    T('atom', 'Atom Araştırması', 'ind', 1944, ['comp'], { research: 0.1 }, ''),
    T('doc_mob', 'Seri Harp (Blitzkrieg)', 'doc', 1936, [], { armAtk: 0.15, speed: 0.1 }, 'Zırhlı ve motorize saldırısı +%15, hız +%10.'),
    T('doc_fire', 'Üstün Ateş Gücü', 'doc', 1936, [], { landAtk: 0.1 }, 'Tüm kara birlikleri saldırı +%10.'),
    T('doc_mass', 'Kitle Saldırısı', 'doc', 1936, [], { mp: 0.15, landDef: 0.05 }, 'İnsan gücü +%15, savunma +%5.'),
    T('doc_grand', 'Büyük Savaş Planı', 'doc', 1936, [], { entrench: 0.5, landDef: 0.1 }, 'Tahkimat hızı +%50, savunma +%10.'),
    T('doc_air', 'Hava Üstünlüğü', 'doc', 1937, [], { air: 0.25 }, 'Hava gücü +%25.'),
    T('doc_nav', 'Deniz Doktrini', 'doc', 1937, [], { navy: 0.2, invasion: 0.25 }, 'Deniz gücü +%20, çıkarma cezası azalır.'),
    T('doc_mob2', 'Derin Taarruz', 'doc', 1940, ['doc_mob'], { armAtk: 0.15, org: 0.05 }, ''),
    T('doc_fire2', 'Entegre Destek', 'doc', 1940, ['doc_fire'], { landAtk: 0.1 }, ''),
    T('doc_mass2', 'Halk Savaşı', 'doc', 1940, ['doc_mass'], { mp: 0.15, landDef: 0.1 }, ''),
    T('doc_grand2', 'Tahkimli Savunma', 'doc', 1940, ['doc_grand'], { landDef: 0.15 }, ''),
  ];
  g.TECH_BY_ID = Object.fromEntries(g.TECHS.map((t) => [t.id, t]));
  // Başlangıç teknolojileri (ülke tl seviyesine göre)
  g.START_TECHS = [
    ['inf1', 'art1', 'fig1', 'dd1', 'ss1'],
    ['sup1', 'bb1', 'cas1', 'con1'],
    ['mot1', 'tank1', 'ind1', 'bom1', 'mtn1'],
    ['eff1', 'doc_mob'],
  ];

  // Ulusal odaklar. x: sütun, y: satır (ağaç görünümü için)
  const F = (id, n, x, y, pre, fx, d, extra) => Object.assign({ id, n, x, y, pre, fx, d }, extra || {});
  g.FOCUS_GENERIC = [
    F('ind_1', 'Sanayi Hamlesi', 0, 0, [], { addCiv: 3 }, '+3 sivil fabrika.'),
    F('ind_2', 'Altyapı Yatırımı', 0, 1, ['ind_1'], { construct: 0.1 }, 'İnşaat hızı +%10.'),
    F('ind_3', 'Askerî Sanayi', 0, 2, ['ind_2'], { addMil: 3 }, '+3 askerî fabrika.'),
    F('ind_4', 'Araştırma Enstitüsü', 0, 3, ['ind_2'], { slots: 1 }, '+1 araştırma yuvası.'),
    F('ind_5', 'Sanayi Uzmanlığı', 0, 4, ['ind_3'], { factory: 0.1 }, 'Fabrika verimi +%10.'),
    F('ind_6', 'Çelik Hamlesi', 0, 5, ['ind_5'], { steel: 15 }, 'Günlük +15 çelik.'),
    F('ind_7', 'Petrol Arama', 0, 6, ['ind_5'], { oil: 15 }, 'Günlük +15 petrol.'),
    F('ind_8', 'Bilim Akademisi', 0, 7, ['ind_4', 'ind_6'], { slots: 1, research: 0.05 }, '+1 araştırma yuvası, +%5 hız.'),
    F('army_1', 'Ordu Reformu', 1, 0, [], { landAtk: 0.05, org: 0.05 }, 'Kara birlikleri saldırı ve moral +%5.'),
    F('army_2', 'Seferberlik Hazırlığı', 1, 1, ['army_1'], { mp: 0.2 }, 'Kullanılabilir insan gücü +%20.'),
    F('army_3', 'Topçu Okulu', 1, 2, ['army_1'], { landAtk: 0.05 }, 'Saldırı +%5.'),
    F('army_4', 'Zırhlı Kuvvetler', 1, 3, ['army_3'], { armAtk: 0.1, tech: 'tank1' }, 'Hafif tank teknolojisi ve zırhlı saldırı +%10.'),
    F('army_5', 'Sınır Tahkimatı', 1, 4, ['army_2'], { forts: 2 }, 'Sınır eyaletlerine 2 kademe tahkimat.'),
    F('army_6', 'Kurmay Akademisi', 1, 5, ['army_4', 'army_5'], { landDef: 0.1, org: 0.1 }, 'Savunma ve moral +%10.'),
    F('air_1', 'Hava Kuvvetleri', 2, 0, [], { addPlanes: 150 }, '+150 avcı uçağı.'),
    F('air_2', 'Havacılık Okulu', 2, 1, ['air_1'], { air: 0.15 }, 'Hava gücü +%15.'),
    F('air_3', 'Bombardıman Filoları', 2, 2, ['air_2'], { addBombers: 80 }, '+80 bombardıman uçağı.'),
    F('nav_1', 'Donanma Genişlemesi', 3, 0, [], { addDock: 2 }, '+2 tersane.'),
    F('nav_2', 'Çıkarma Doktrini', 3, 1, ['nav_1'], { invasion: 0.3, tech: 'mar1' }, 'Deniz piyadesi ve çıkarma cezası -%30.'),
    F('nav_3', 'Mavi Su Donanması', 3, 2, ['nav_2'], { navy: 0.2 }, 'Deniz gücü +%20.'),
    F('pol_1', 'Siyasi Etki', 4, 0, [], { pp: 0.5 }, 'Günlük +0.5 siyasi güç.'),
    F('pol_2', 'Ulusal Birlik', 4, 1, ['pol_1'], { cg: -0.05, pp: 0.25 }, 'Tüketim malları -%5.'),
    F('pol_3', 'İttifak Arayışı', 4, 2, ['pol_2'], { canFaction: 1 }, 'Kendi ittifakını kurabilirsin.'),
    F('pol_dem', 'Özgür Dünyanın Savunucusu', 4, 3, ['pol_2'], { ignoreTension: 1, pp: 0.25 }, 'Gerginlik şartı olmadan savaş ekonomisi.', { ideo: 'dem' }),
    F('pol_fas', 'Yayılmacı Politika', 4, 3, ['pol_2'], { justify: 0.5, pp: 0.25 }, 'Savaş gerekçesi %50 daha ucuz ve hızlı.', { ideo: 'fas' }),
    F('pol_com', 'Devrim İhracı', 4, 3, ['pol_2'], { justify: 0.4, mp: 0.1 }, 'Savaş gerekçesi daha hızlı, insan gücü +%10.', { ideo: 'com' }),
    F('pol_neu', 'Silahlı Tarafsızlık', 4, 3, ['pol_2'], { landDef: 0.15, forts: 1 }, 'Savunma +%15 ve sınır tahkimatı.', { ideo: 'neu' }),
  ];
  // Ülkeye özel odaklar (genel ağacın başına eklenen sütun)
  g.FOCUS_SPECIAL = {
    GER: [F('ger_1', 'Dört Yıllık Plan', 5, 0, [], { addMil: 5, addCiv: 2 }, '+5 askerî, +2 sivil fabrika.'),
      F('ger_2', 'Luftwaffe', 5, 1, ['ger_1'], { addPlanes: 200, air: 0.1 }, '+200 avcı uçağı, hava +%10.'),
      F('ger_3', 'Panzer Tümenleri', 5, 2, ['ger_1'], { armAtk: 0.15, tech: 'tank2' }, 'Orta tank teknolojisi, zırhlı +%15.')],
    SOV: [F('sov_1', 'Beş Yıllık Plan', 5, 0, [], { addCiv: 5, addMil: 5 }, '+5 sivil, +5 askerî fabrika.'),
      F('sov_2', 'Ural Sanayisi', 5, 1, ['sov_1'], { addMil: 6, steel: 20 }, '+6 askerî fabrika, +20 çelik.'),
      F('sov_3', 'Kızıl Ordu Reformu', 5, 2, ['sov_2'], { landDef: 0.15, org: 0.1 }, 'Savunma +%15, moral +%10.')],
    USA: [F('usa_1', 'Yeni Düzen (New Deal)', 5, 0, [], { addCiv: 6 }, '+6 sivil fabrika.'),
      F('usa_2', 'Demokrasinin Cephaneliği', 5, 1, ['usa_1'], { addMil: 10, ignoreTension: 1 }, '+10 askerî fabrika.'),
      F('usa_3', 'İki Okyanus Donanması', 5, 2, ['usa_2'], { addDock: 6, navy: 0.15 }, '+6 tersane.')],
    ENG: [F('eng_1', 'Yeniden Silahlanma', 5, 0, [], { addMil: 4 }, '+4 askerî fabrika.'),
      F('eng_2', 'Radar Zinciri', 5, 1, ['eng_1'], { air: 0.2, tech: 'radar' }, 'Radar teknolojisi, hava +%20.'),
      F('eng_3', 'Kraliyet Donanması', 5, 2, ['eng_2'], { navy: 0.25, addDock: 3 }, 'Deniz +%25, +3 tersane.')],
    FRA: [F('fra_1', 'Maginot Hattı', 5, 0, [], { forts: 3, landDef: 0.1 }, 'Sınırlara ağır tahkimat.'),
      F('fra_2', 'Sanayi Millîleştirmesi', 5, 1, ['fra_1'], { addMil: 4 }, '+4 askerî fabrika.')],
    ITA: [F('ita_1', 'Mare Nostrum', 5, 0, [], { navy: 0.2, addDock: 2 }, 'Deniz +%20, +2 tersane.'),
      F('ita_2', 'Yeni Roma İmparatorluğu', 5, 1, ['ita_1'], { justify: 0.4, addMil: 3 }, '+3 askerî fabrika.')],
    JAP: [F('jap_1', 'Zaibatsu Seferberliği', 5, 0, [], { addMil: 5 }, '+5 askerî fabrika.'),
      F('jap_2', 'Kaigun Genişlemesi', 5, 1, ['jap_1'], { addDock: 4, navy: 0.15 }, '+4 tersane, deniz +%15.')],
    TUR: [F('tur_1', 'Boğazların Tahkimi', 5, 0, [], { forts: 3, landDef: 0.1 }, 'Sınırlara ağır tahkimat, savunma +%10.'),
      F('tur_2', 'Karabük Demir Çelik', 5, 1, ['tur_1'], { addCiv: 2, steel: 15 }, '+2 sivil fabrika, +15 çelik.'),
      F('tur_3', 'Millî Sanayi Planı', 5, 2, ['tur_2'], { addMil: 4 }, '+4 askerî fabrika.')],
    CHI: [F('chi_1', 'Alman Danışmanlar', 5, 0, [], { landAtk: 0.1, org: 0.1 }, 'Saldırı ve moral +%10.'),
      F('chi_2', 'Birleşik Cephe', 5, 1, ['chi_1'], { mp: 0.3 }, 'İnsan gücü +%30.')],
    POL: [F('pol_s1', 'Merkezî Sanayi Bölgesi', 5, 0, [], { addCiv: 2, addMil: 2 }, '+2 sivil, +2 askerî fabrika.')],
  };
  g.FOCUS_DAYS = 70;

  g.LAWS = {
    mob: { n: 'Askerlik Yasası', opts: [
      { n: 'Gönüllü Ordu', d: '%2 nüfus askere alınabilir', mp: 0.02 },
      { n: 'Sınırlı Askerlik', d: '%3.5 nüfus', mp: 0.035 },
      { n: 'Zorunlu Askerlik', d: '%6 nüfus, -%5 fabrika verimi', mp: 0.06, factory: -0.05, war: 1 },
      { n: 'Topyekûn Seferberlik', d: '%10 nüfus, -%15 fabrika verimi', mp: 0.10, factory: -0.15, war: 2 },
    ] },
    eco: { n: 'Ekonomi Yasası', opts: [
      { n: 'Sivil Ekonomi', d: 'Tüketim malları %35', cg: 0.35 },
      { n: 'Kısmi Seferberlik', d: 'Tüketim malları %25', cg: 0.25 },
      { n: 'Savaş Ekonomisi', d: 'Tüketim malları %15, inşaat +%10', cg: 0.15, construct: 0.1, war: 1 },
      { n: 'Topyekûn Savaş', d: 'Tüketim malları %8, inşaat +%20', cg: 0.08, construct: 0.2, war: 2 },
    ] },
  };

  g.BUILDINGS = {
    civ: { n: 'Sivil Fabrika', cost: 10800, s: 'Sivil' },
    mil: { n: 'Askerî Fabrika', cost: 7200, s: 'Askerî' },
    dock: { n: 'Tersane', cost: 6400, s: 'Tersane', coastal: 1 },
    fort: { n: 'Kara Tahkimatı', cost: 1800, s: 'Tahkimat', max: 5 },
  };
})(window);
