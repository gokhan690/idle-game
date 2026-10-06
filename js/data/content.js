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

  // Kaynaklar
  g.RES = { steel: 'Çelik', oil: 'Petrol', al: 'Alüminyum', rub: 'Kauçuk', tun: 'Tungsten', chr: 'Krom' };
  g.RES_KEYS = Object.keys(g.RES);
  // Bölgesel kaynak yatakları: [kaynak, batı, güney, doğu, kuzey, eyalet başına miktar]
  g.RES_ZONES = [
    ['rub', 99, -1, 105, 7, 9], ['rub', 95, -9, 120, 6, 4], ['rub', 102, 8, 110, 16, 3], ['rub', 79, 5, 82, 10, 3], ['rub', -12, 4, -7, 9, 5],
    ['rub', -72, -12, -45, 2, 2], ['rub', 14, -6, 30, 4, 1], ['rub', 98, 6, 104, 15, 2],
    ['al', 2, 42, 8, 45, 4], ['al', 16, 45.5, 23, 48.5, 5], ['al', 14, 42, 20, 46, 3], ['al', -60, 2, -53, 8.5, 8], ['al', -95, 32, -89, 36.5, 8],
    ['al', 29, 55, 62, 62, 1], ['al', 104, -2, 110, 2, 3], ['al', -3, 5, 1, 8, 3], ['al', 21, 37, 24, 39, 2], ['al', 5, 58, 12, 63, 3],
    ['al', -76, 45.5, -68, 50, 6], ['al', 115, -35, 118, -30, 2], ['al', 9, 46, 17, 48.5, 1],
    ['tun', 110, 22, 118, 28.5, 8], ['tun', 95, 15, 99, 22, 4], ['tun', -9.5, 39, -6, 42.2, 6], ['tun', -9.5, 41, -5, 44, 3], ['tun', -120, 35, -114, 41.5, 4],
    ['tun', 125, 35, 130, 40, 4], ['tun', 42, 42, 45, 44, 2], ['tun', -69, -22, -63, -15, 5], ['tun', 98, 13, 101, 19, 2], ['tun', 66, 36, 75, 42, 1],
    ['chr', 27, 36, 44.5, 41.5, 4], ['chr', 56, 50, 62, 58.5, 5], ['chr', 25, -27, 31.5, -23, 6], ['chr', 27.5, -21, 32.5, -16, 5], ['chr', 19, 41, 22.5, 44, 3],
    ['chr', 19, 39.8, 21, 42.6, 4], ['chr', 20, 39, 24, 41, 2], ['chr', 119.5, 11, 126.5, 18.5, 3], ['chr', -80, 19.8, -74, 23, 3], ['chr', 84, 19.5, 87.5, 22.5, 3],
    ['chr', 163.5, -23, 167.5, -20, 3], ['chr', 51, 36, 61, 39, 1],
    ['steel', 115, 36, 125, 43, 3], ['steel', 74, 36, 90, 52, 1], ['oil', 46, 25, 56, 31, 4], ['oil', -100, 27, -94, 37, 3], ['oil', 105, -5, 120, 6, 2], ['oil', 46, 39, 53, 46, 2], ['oil', 44, 29, 49, 36, 3],
  ];

  // Teçhizat: maliyet (IC), fabrika türü, fabrika başına günlük kaynak ihtiyacı (res)
  g.EQUIP = {
    inf: { n: 'Piyade Teçhizatı', s: 'Piyade T.', cost: 0.5, fac: 'mil', res: { steel: 0.5 } },
    sup: { n: 'Destek Teçhizatı', s: 'Destek T.', cost: 4, fac: 'mil', res: { steel: 0.4 } },
    art: { n: 'Topçu', s: 'Topçu', cost: 3.5, fac: 'mil', res: { steel: 0.6, tun: 0.3 } },
    at: { n: 'Tanksavar Topu', s: 'Tanksavar', cost: 4, fac: 'mil', res: { steel: 0.4, tun: 0.4 }, req: 'at1' },
    aa: { n: 'Uçaksavar Topu', s: 'Uçaksavar', cost: 4, fac: 'mil', res: { steel: 0.4, al: 0.2 }, req: 'aa1' },
    mot: { n: 'Motorlu Araç', s: 'Motorlu', cost: 2.5, fac: 'mil', res: { oil: 0.4, rub: 0.4 }, req: 'mot1' },
    tank: { n: 'Tank', s: 'Tank', cost: 8, fac: 'mil', res: { steel: 0.8, chr: 0.5 }, req: 'tank1' },
    fig: { n: 'Avcı Uçağı', s: 'Avcı', cost: 22, fac: 'mil', res: { al: 0.8, rub: 0.3 }, air: 1 },
    cas: { n: 'Yakın Destek Uçağı', s: 'YDU', cost: 24, fac: 'mil', res: { al: 0.8, rub: 0.3 }, air: 1 },
    bom: { n: 'Bombardıman Uçağı', s: 'Bombacı', cost: 35, fac: 'mil', res: { al: 1, rub: 0.4, oil: 0.2 }, air: 1 },
    dd: { n: 'Muhrip', s: 'Muhrip', cost: 1500, fac: 'dock', res: { steel: 1, chr: 0.3 }, ship: 1, str: 1 },
    cr: { n: 'Kruvazör', s: 'Kruvazör', cost: 3500, fac: 'dock', res: { steel: 1.2, chr: 0.5 }, ship: 1, str: 3 },
    bb: { n: 'Zırhlı Gemi', s: 'Zırhlı', cost: 10000, fac: 'dock', res: { steel: 1.5, chr: 0.8 }, ship: 1, str: 10 },
    ss: { n: 'Denizaltı', s: 'Denizaltı', cost: 1000, fac: 'dock', res: { steel: 0.8 }, ship: 1, str: 0.8 },
    cv: { n: 'Uçak Gemisi', s: 'U. Gemisi', cost: 12000, fac: 'dock', res: { steel: 1.4, al: 0.6 }, ship: 1, str: 12, req: 'cv1' },
    conv: { n: 'Konvoy', s: 'Konvoy', cost: 120, fac: 'dock', res: { steel: 0.8 }, convoy: 1 },
  };
  // Teçhizat modelleri (araştırılan seviyeye göre ad)
  g.MODEL_N = {
    inf: ['', 'Tüfek M1918', 'Yarı Otomatik', 'Taarruz Tüfeği', 'Modern Piyade'], art: ['', 'Sahra Topu', 'Obüs', 'Ağır Topçu', 'Modern Topçu'],
    tank: ['', 'Hafif Tank', 'Orta Tank', 'Ağır Tank', 'Modern Tank'], fig: ['', 'Çift Kanatlı Avcı', 'Tek Kanatlı Avcı', 'Gelişmiş Avcı', 'Jet Avcı'],
    cas: ['', 'Pike Bombardıman', 'Gelişmiş YDU', 'YDU III', 'YDU IV'], bom: ['', 'Orta Bombardıman', 'Ağır Bombardıman', 'Stratejik Bombardıman', 'Jet Bombardıman'],
  };
  g.SHIPS = ['dd', 'cr', 'bb', 'ss', 'cv'];
  g.SHIP_SPEED = 60;
  g.PLANES = ['fig', 'cas', 'bom'];

  // Tümen tasarımcısı: taburlar (çizgi birimleri) ve destek bölükleri
  g.BATS = {
    inf: { n: 'Piyade', s: 'PİY', w: 2, atk: 1.6, def: 3.0, org: 60, spd: 4, mp: 1.5, eq: { inf: 150 }, arm: 0, prc: 2, kind: 'inf' },
    art: { n: 'Topçu', s: 'TOP', w: 3, atk: 3.8, def: 0.6, org: 20, spd: 4, mp: 0.5, eq: { inf: 20, art: 18 }, arm: 0, prc: 6, kind: 'art' },
    mtn: { n: 'Dağ Piyadesi', s: 'DAĞ', w: 2, atk: 1.6, def: 3.3, org: 70, spd: 4, mp: 1.5, eq: { inf: 170 }, arm: 0, prc: 2, kind: 'inf', bonus: { mountain: 0.35, hills: 0.2 }, req: 'mtn1' },
    cav: { n: 'Süvari', s: 'SÜV', w: 2, atk: 1.4, def: 2.4, org: 60, spd: 6, mp: 1.2, eq: { inf: 120 }, arm: 0, prc: 1, kind: 'inf' },
    mot: { n: 'Motorize Piyade', s: 'MOT', w: 2, atk: 1.7, def: 3.0, org: 60, spd: 10, mp: 1.5, eq: { inf: 150, mot: 60 }, arm: 2, prc: 3, kind: 'inf', mob: 1, req: 'mot1' },
    arm: { n: 'Tank', s: 'TNK', w: 2, atk: 7.5, def: 2.0, org: 30, spd: 9, mp: 0.6, eq: { tank: 40 }, arm: 30, prc: 35, kind: 'tank', mob: 1, req: 'tank1' },
    mar: { n: 'Deniz Piyadesi', s: 'DNZ', w: 2, atk: 1.6, def: 2.8, org: 65, spd: 4, mp: 1.4, eq: { inf: 160 }, arm: 0, prc: 2, kind: 'inf', amph: 1, req: 'mar1' },
  };
  g.SUPPORTS = {
    eng: { n: 'İstihkâm', d: '+2 savunma, siper hızı +%30', def: 2, ent: 0.3, mp: 0.3, eq: { sup: 10 } },
    rec: { n: 'Keşif', d: '+0,8 saldırı, hız +%10', atk: 0.8, spdM: 0.1, mp: 0.2, eq: { sup: 8, inf: 20 } },
    sart: { n: 'Destek Topçusu', d: '+2,5 saldırı', atk: 2.5, mp: 0.3, eq: { art: 12 }, kind: 'art' },
    sat: { n: 'Tanksavar', d: '+15 zırh delme', prcAdd: 15, atk: 0.4, mp: 0.3, eq: { at: 12 }, req: 'at1' },
    saa: { n: 'Uçaksavar', d: 'Düşman hava etkisi -%15, +0,5 savunma', aa: 0.15, def: 0.5, mp: 0.3, eq: { aa: 12 }, req: 'aa1' },
    log: { n: 'Lojistik', d: 'İkmal cezası -%35', sup: 0.35, mp: 0.3, eq: { sup: 10, mot: 10 }, req: 'mot1' },
    hos: { n: 'Sahra Hastanesi', d: 'Kayıplar -%30', cas: 0.3, mp: 0.3, eq: { sup: 8 }, req: 'sup1' },
  };
  g.MAX_BATS = 10; g.MAX_SUP = 5;
  g.DEFAULT_TEMPLATES = {
    inf: { n: 'Piyade Tümeni', b: { inf: 6, art: 1 }, s: {} },
    mtn: { n: 'Dağ Tümeni', b: { mtn: 6 }, s: { eng: 1 } },
    cav: { n: 'Süvari Tümeni', b: { cav: 6 }, s: {} },
    mot: { n: 'Motorize Tümen', b: { mot: 6, art: 1 }, s: {} },
    arm: { n: 'Zırhlı Tümen', b: { arm: 3, mot: 2 }, s: { rec: 1 } },
    mar: { n: 'Deniz Piyadesi Tümeni', b: { mar: 5, art: 1 }, s: {} },
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

  g.FOCUS_DAYS = 70;

  // Yasalar: ws = gereken savaş desteği, war = 2 ise yalnızca savaşta
  g.LAWS = {
    mob: { n: 'Askerlik Yasası', opts: [
      { n: 'Gönüllü Ordu', d: '%2 nüfus askere alınabilir', mp: 0.02 },
      { n: 'Sınırlı Askerlik', d: '%3,5 nüfus', mp: 0.035, ws: 0.05 },
      { n: 'Kapsamlı Askerlik', d: '%6 nüfus, fabrika verimi -%5', mp: 0.06, factory: -0.05, ws: 0.3 },
      { n: 'Hizmet Zorunluluğu', d: '%9 nüfus, fabrika verimi -%10', mp: 0.09, factory: -0.1, ws: 0.55, war: 2 },
      { n: 'Topyekûn Seferberlik', d: '%13 nüfus, fabrika verimi -%20', mp: 0.13, factory: -0.2, ws: 0.75, war: 2 },
    ] },
    eco: { n: 'Ekonomi Yasası', opts: [
      { n: 'Sivil Ekonomi', d: 'Tüketim malları %35', cg: 0.35 },
      { n: 'Erken Seferberlik', d: 'Tüketim malları %30, inşaat +%5', cg: 0.3, construct: 0.05, ws: 0.05 },
      { n: 'Kısmi Seferberlik', d: 'Tüketim malları %25, inşaat +%10', cg: 0.25, construct: 0.1, ws: 0.15 },
      { n: 'Savaş Ekonomisi', d: 'Tüketim malları %15, inşaat +%15', cg: 0.15, construct: 0.15, ws: 0.35 },
      { n: 'Topyekûn Savaş', d: 'Tüketim malları %8, inşaat +%20, istikrar -%10', cg: 0.08, construct: 0.2, stab: -0.1, ws: 0.7, war: 2 },
    ] },
    trade: { n: 'Ticaret Yasası', opts: [
      { n: 'Serbest Ticaret', d: 'Fabrika +%10, araştırma +%5; kaynakların %80\'i satılabilir', factory: 0.1, research: 0.05, exp: 0.8 },
      { n: 'İhracat Odaklı', d: 'Fabrika +%5, araştırma +%2; kaynakların %50\'si satılabilir', factory: 0.05, research: 0.02, exp: 0.5 },
      { n: 'Sınırlı İhracat', d: 'Kaynakların %25\'i satılabilir', exp: 0.25 },
      { n: 'Kapalı Ekonomi', d: 'Hiç kaynak satılmaz, fabrika -%5', factory: -0.05, exp: 0, ws: 0.3 },
    ] },
  };
  g.LAW_COST = 150;

  g.BUILDINGS = {
    civ: { n: 'Sivil Fabrika', cost: 10800, s: 'Sivil' },
    mil: { n: 'Askerî Fabrika', cost: 7200, s: 'Askerî' },
    dock: { n: 'Tersane', cost: 6400, s: 'Tersane', coastal: 1 },
    fort: { n: 'Kara Tahkimatı', cost: 1800, s: 'Tahkimat', max: 5 },
    inf: { n: 'Altyapı ve Demiryolu', cost: 3000, s: 'Altyapı', max: 5 },
  };
})(window);
