// Ek ulusal odak ağaçları (HOI4): orta ve küçük devletler.
// Milliyetçi İspanya, Portekiz, Brezilya, Meksika, Arjantin, Kanada, Avustralya, Britanya Hindistanı,
// Çekoslovakya, Norveç, Hollanda, Siyam.
(function (g) {
  const F = (id, n, x, y, pre, fx, d, extra) => Object.assign({ id, n, x, y, pre: pre || [], fx: fx || {}, d: d || '' }, extra || {});
  const rb = (...cats) => ({ rb: cats.map((c) => (Array.isArray(c) ? c : [c, 0.5])) });
  const box = (a, b, c, d) => (p) => p.lon >= a && p.lon <= c && p.lat >= b && p.lat <= d;
  Object.assign(g.FOCUS_REGIONS, {
    pyrenees: box(-2, 42, 3.4, 43.6),
    sudetenline: box(12, 48.5, 19, 51.2),
    holland: box(3.3, 50.7, 7.3, 53.6),
    norway: box(4, 58, 31, 71.5),
    malaya: box(98, 1, 105, 7),
    burma: box(92, 15, 101, 28.5),
    pacificoz: box(140, -12, 156, -1),
  });
  const N = g.FOCUS_NATIONAL;
  N.SPN = [
    F('spn_caudillo', 'Caudillo', 1, 0, [], { stab: 0.1, ppM: 0.1 }, 'Franco\'nun mutlak yönetimi: istikrar +%10.'),
    F('spn_falange', 'Falanj Birliği', 0, 1, ['spn_caudillo'], { ws: 0.1, pop: { fas: 0.1 } }, 'Savaş desteği +%10.'),
    F('spn_army', 'Afrika Ordusu', 1, 1, ['spn_caudillo'], { units: { inf: 3 }, org: 0.05 }, '+3 tümen, moral +%5.'),
    F('spn_rebuild', 'Ülkeyi Yeniden İnşa', 2, 1, ['spn_caudillo'], { addCiv: 3, construct: 0.1 }, '+3 sivil fabrika, inşaat +%10.', { req: 'year:1939' }),
    F('spn_neutral', 'Tetikte Tarafsızlık', 1, 2, ['spn_army'], { spirit: 'armed_neutrality', fn: ['fortRegion', 'pyrenees', 2] }, 'Savunma +%15, Pireneler\'e tahkimat.', { excl: ['spn_axis'] }),
    F('spn_blue', 'Mavi Tümen', 0, 2, ['spn_falange'], { units: { inf: 1 }, xpGain: 0.1 }, 'Doğu Cephesi gönüllüleri: tecrübe kazanımı +%10.', { req: 'year:1941' }),
    F('spn_axis', 'Mihvere Katıl', 0, 3, ['spn_blue'], { fn: ['joinFac', 'GER'] }, 'Mihver ittifakına katıl.', { ai: 0, excl: ['spn_neutral'] }),
    F('spn_gibraltar', 'Cebelitarık', 1, 3, ['spn_axis'], { fn: ['goal', ['ENG']], ws: 0.1 }, 'Britanya\'ya karşı savaş gerekçesi.', { ai: 0 }),
  ];
  N.POR = [
    F('por_salazar', 'Estado Novo', 1, 0, [], { stab: 0.1 }, 'Salazar\'ın yeni devleti: istikrar +%10.'),
    F('por_wolfram', 'Volfram Ticareti', 0, 1, ['por_salazar'], { tun: 8, addCiv: 1 }, '+8 tungsten, +1 sivil fabrika.'),
    F('por_navy', 'Lizbon Tersaneleri', 1, 1, ['por_salazar'], { addDock: 2, ships: { dd: 2 } }, '+2 tersane, +2 muhrip.'),
    F('por_alliance', 'Eski İttifak', 2, 1, ['por_salazar'], { fn: ['joinFac', 'ENG'] }, 'İngiltere ile en eski ittifak: Müttefiklere katıl.', { ai: 0, req: 'year:1943' }),
    F('por_neutral', 'Tarafsız Liman', 1, 2, ['por_navy'], { spirit: 'armed_neutrality', ppM: 0.1 }, 'Savunma +%15.'),
  ];
  N.BRA = [
    F('bra_vargas', 'Estado Novo (Vargas)', 1, 0, [], { stab: 0.1, ppM: 0.05 }, 'İstikrar +%10.'),
    F('bra_csn', 'Volta Redonda Çeliği', 0, 1, ['bra_vargas'], { addCiv: 2, steel: 10 }, '+2 sivil fabrika, +10 çelik.'),
    F('bra_rubber', 'Kauçuk Savaşı', 1, 1, ['bra_vargas'], { rub: 10, addCiv: 1 }, '+10 kauçuk.'),
    F('bra_usa', 'Washington Yakınlaşması', 2, 1, ['bra_vargas'], { fn: ['joinFac', 'ENG'], stock: { inf: 1500 } }, 'Müttefiklere katıl, Amerikan teçhizatı.', { ai: 0, req: 'year:1942' }),
    F('bra_feb', 'Brezilya Sefer Kuvveti', 2, 2, ['bra_usa'], { units: { inf: 4 }, xpGain: 0.1 }, '+4 tümen: "Yılan duman içiyor".', { req: 'war' }),
    F('bra_industry', 'Sanayileşme', 0, 2, ['bra_csn'], { addMil: 2, construct: 0.1 }, '+2 askerî fabrika.'),
  ];
  N.MEX = [
    F('mex_cardenas', 'Cárdenas Reformları', 1, 0, [], { stab: 0.05, pop: { dem: 0.05 } }, 'Toprak reformu: istikrar +%5.'),
    F('mex_pemex', 'Petrolün Millîleştirilmesi', 0, 1, ['mex_cardenas'], { oil: 12, addCiv: 1 }, 'PEMEX: +12 petrol.'),
    F('mex_army', 'Ordu Modernizasyonu', 1, 1, ['mex_cardenas'], { units: { inf: 2 }, tech: 'mot1' }, '+2 tümen, motorizasyon.'),
    F('mex_201', 'Escuadrón 201', 2, 1, ['mex_cardenas'], { addPlanes: 40, fn: ['joinFac', 'ENG'] }, 'Müttefiklere katıl, +40 avcı.', { ai: 0, req: 'year:1942' }),
    F('mex_industry', 'Monterrey Sanayisi', 0, 2, ['mex_pemex'], { addCiv: 2, addMil: 1 }, '+2 sivil, +1 askerî fabrika.'),
  ];
  N.ARG = [
    F('arg_decada', 'Alçak On Yıl', 1, 0, [], { stab: -0.05, ppM: 0.1 }, 'Muhafazakâr hükümetler: siyasi güç +%10.'),
    F('arg_beef', 'Et ve Tahıl İhracatı', 0, 1, ['arg_decada'], { addCiv: 2 }, '+2 sivil fabrika.'),
    F('arg_navy', 'Arjantin Donanması', 1, 1, ['arg_decada'], { ships: { cr: 2, dd: 2 }, addDock: 1 }, '+2 kruvazör, +2 muhrip.'),
    F('arg_goue', 'GOU Darbesi', 2, 1, ['arg_decada'], { fn: ['leader', 'fas'], ws: 0.1 }, 'Albaylar yönetime el koyar.', { ai: 0, req: 'year:1943' }),
    F('arg_peron', 'Perón ve Emek', 2, 2, ['arg_goue'], { stab: 0.15, addCiv: 2 }, 'İstikrar +%15, +2 sivil fabrika.'),
    F('arg_neutral', 'Tarafsızlık', 0, 2, ['arg_beef'], { spirit: 'armed_neutrality' }, 'Savunma +%15.'),
  ];
  N.CAN = [
    F('can_king', 'Kral ve Ülke', 1, 0, [], { ws: 0.1 }, 'Savaş desteği +%10.'),
    F('can_arsenal', 'Demokrasinin Atölyesi', 0, 1, ['can_king'], { addMil: 2, addCiv: 1 }, '+2 askerî, +1 sivil fabrika.'),
    F('can_rcaf', 'BCATP Eğitim Planı', 1, 1, ['can_king'], { addPlanes: 60, xpGain: 0.1 }, 'İmparatorluk pilot eğitimi: +60 avcı.'),
    F('can_rcn', 'Kanada Kraliyet Donanması', 2, 1, ['can_king'], { ships: { dd: 6 }, addDock: 2 }, 'Atlantik konvoy refakati: +6 muhrip.'),
    F('can_army', 'Birinci Kanada Ordusu', 1, 2, ['can_rcaf', 'can_arsenal'], { units: { inf: 4, mot: 1 } }, '+5 tümen.', { req: 'war' }),
    F('can_ralston', 'Zorunlu Askerlik', 0, 2, ['can_arsenal'], { mp: 0.1, stab: -0.05 }, 'İnsan gücü +%10.', { req: 'war' }),
  ];
  N.AST = [
    F('ast_menzies', 'İmparatorluk Savunması', 1, 0, [], { ws: 0.1 }, 'Savaş desteği +%10.'),
    F('ast_lithgow', 'Lithgow Fabrikaları', 0, 1, ['ast_menzies'], { addMil: 2 }, '+2 askerî fabrika.'),
    F('ast_navy', 'Avustralya Donanması', 1, 1, ['ast_menzies'], { ships: { cr: 2, dd: 3 }, addDock: 1 }, '+2 kruvazör, +3 muhrip.'),
    F('ast_rats', 'Tobruk Fareleri', 2, 1, ['ast_menzies'], { landDef: 0.1, units: { inf: 2 } }, 'Savunma +%10, +2 tümen.', { req: 'war' }),
    F('ast_curtin', 'Amerika\'ya Bakıyoruz', 1, 2, ['ast_navy'], { stock: { inf: 2000, art: 60 }, addPlanes: 50 }, 'Curtin: ABD ile yakın iş birliği.', { req: 'year:1942' }),
    F('ast_kokoda', 'Kokoda Yolu', 2, 2, ['ast_rats'], { units: { inf: 2 }, org: 0.05 }, 'Cangıl savaşı: +2 tümen.', { req: 'war' }),
  ];
  N.RAJ = [
    F('raj_army', 'Hint Ordusu', 1, 0, [], { units: { inf: 4 } }, 'Dünyanın en büyük gönüllü ordusu: +4 tümen.'),
    F('raj_tata', 'Tata Çelik', 0, 1, ['raj_army'], { addCiv: 2, steel: 10 }, '+2 sivil fabrika, +10 çelik.'),
    F('raj_mp', 'Gönüllü Alımı', 1, 1, ['raj_army'], { mp: 0.15 }, 'İnsan gücü +%15.'),
    F('raj_quit', 'Hindistan\'ı Terk Et Hareketi', 2, 1, ['raj_army'], { stab: -0.1, pop: { dem: 0.1 } }, 'Kongre Partisi bağımsızlık istiyor.', { req: 'year:1942', ai: 0 }),
    F('raj_burma', 'Burma Cephesi', 1, 2, ['raj_mp'], { units: { inf: 3 }, fn: ['fortRegion', 'burma', 2] }, '+3 tümen, Burma sınırına tahkimat.', { req: 'war' }),
    F('raj_industry', 'Savaş Sanayisi', 0, 2, ['raj_tata'], { addMil: 3 }, '+3 askerî fabrika.', { req: 'war' }),
  ];
  N.CZE = [
    F('cze_benes', 'Beneš\'in Cumhuriyeti', 1, 0, [], { stab: 0.05 }, 'İstikrar +%5.'),
    F('cze_skoda', 'Škoda Fabrikaları', 0, 1, ['cze_benes'], Object.assign(rb('arm', 'art'), { addMil: 2 }), '+2 askerî fabrika, zırh ve topçu bonusu.'),
    F('cze_line', 'Çekoslovak Sınır Tahkimatı', 1, 1, ['cze_benes'], { fn: ['fortRegion', 'sudetenline', 3] }, 'Südet hattına 3 kademe tahkimat.'),
    F('cze_lt38', 'LT vz. 38', 0, 2, ['cze_skoda'], { tech: 'tank1', units: { arm: 1 } }, 'Hafif tank ve +1 zırhlı tümen.'),
    F('cze_little', 'Küçük İtilaf', 2, 1, ['cze_benes'], { fn: ['pact', ['ROM', 'YUG']] }, 'Romanya ve Yugoslavya ile saldırmazlık.'),
    F('cze_resist', 'Teslim Olmayacağız', 1, 2, ['cze_line'], { landDef: 0.15, ws: 0.15 }, 'Savunma ve savaş desteği +%15.', { req: 'tension:30' }),
  ];
  N.NOR = [
    F('nor_neutral', 'Tarafsızlık', 1, 0, [], { stab: 0.05 }, 'İstikrar +%5.'),
    F('nor_fleet', 'Norveç Ticaret Filosu', 0, 1, ['nor_neutral'], { addConv: 40, addDock: 1 }, 'Nortraship: +40 konvoy.'),
    F('nor_coast', 'Kıyı Tabyaları', 1, 1, ['nor_neutral'], { fn: ['fortRegion', 'norway', 1], navy: 0.05 }, 'Kıyı tahkimatı (Oscarsborg).'),
    F('nor_mines', 'Kuzey Madenleri', 2, 1, ['nor_neutral'], { steel: 8, al: 6 }, '+8 çelik, +6 alüminyum.'),
    F('nor_home', 'Milorg Direnişi', 1, 2, ['nor_coast'], { spirit: 'resistance' }, 'İşgale karşı direniş ruhu.', { req: 'war' }),
  ];
  N.HOL = [
    F('hol_colijn', 'Colijn Hükümeti', 1, 0, [], { stab: 0.05 }, 'İstikrar +%5.'),
    F('hol_water', 'Hollanda Su Hattı', 1, 1, ['hol_colijn'], { fn: ['fortRegion', 'holland', 2], landDef: 0.05 }, 'Su baskını savunması: tahkimat.'),
    F('hol_shell', 'Kraliyet Shell', 0, 1, ['hol_colijn'], { oil: 10, addCiv: 1 }, '+10 petrol.'),
    F('hol_fokker', 'Fokker', 2, 1, ['hol_colijn'], { addPlanes: 30 }, '+30 avcı.'),
    F('hol_indies', 'Doğu Hint Adaları Filosu', 0, 2, ['hol_shell'], { ships: { cr: 2, dd: 4, ss: 4 } }, '+2 kruvazör, +4 muhrip, +4 denizaltı.'),
    F('hol_exile', 'Londra\'da Sürgün Hükümet', 2, 2, ['hol_fokker'], { fn: ['joinFac', 'ENG'] }, 'Müttefiklere katıl.', { ai: 0, req: 'war' }),
  ];
  N.SIA = [
    F('sia_phibun', 'Phibun\'un Milliyetçiliği', 1, 0, [], { ws: 0.1, pop: { fas: 0.1 } }, 'Savaş desteği +%10.'),
    F('sia_rename', 'Tayland Adı', 0, 1, ['sia_phibun'], { stab: 0.1 }, 'Ulusal kimlik: istikrar +%10.'),
    F('sia_army', 'Kraliyet Tay Ordusu', 1, 1, ['sia_phibun'], { units: { inf: 3 } }, '+3 tümen.'),
    F('sia_indochina', 'Kayıp Toprakları Geri Al', 2, 1, ['sia_phibun'], { fn: ['goal', ['FRA']] }, 'Fransız Hindiçini\'sine karşı savaş gerekçesi.', { ai: 0, req: 'year:1940' }),
    F('sia_japan', 'Japonya ile İttifak', 2, 2, ['sia_indochina'], { fn: ['joinFac', 'JAP'] }, 'Refah Alanı\'na katıl.', { ai: 0, req: 'year:1941' }),
    F('sia_seri', 'Seri Tay Hareketi', 0, 2, ['sia_rename'], { fn: ['joinFac', 'ENG'] }, 'Müttefiklere yanaş.', { ai: 0, req: 'year:1943', excl: ['sia_japan'] }),
  ];
})(window);
