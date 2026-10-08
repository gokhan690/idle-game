// Genişletilmiş ulusal odak ağaçları (HOI4 tarzı). Mevcut ağaçların yanına yeni dallar ekler,
// ayrıca küçük devletler için ulusal ağaçlar tanımlar. days: odak süresi (varsayılan 70 gün).
(function (g) {
  const F = (id, n, x, y, pre, fx, d, extra) => Object.assign({ id, n, x, y, pre: pre || [], fx: fx || {}, d: d || '' }, extra || {});
  const rb = (...cats) => ({ rb: cats.map((c) => (Array.isArray(c) ? c : [c, 0.5])) });
  const add = (tag, list) => { g.FOCUS_NATIONAL[tag] = (g.FOCUS_NATIONAL[tag] || []).concat(list); };
  const S = 35; // kısa odak

  // ---------- Türkiye ----------
  add('TUR', [
    // Demiryolları ve sanayi
    F('tur_rails', 'Demir Ağlarla Ör', 10, 0, [], { addInfra: 8, construct: 0.05 }, '“Demir ağlarla ördük anayurdu dört baştan.” 8 eyalette altyapı +1.'),
    F('tur_rail_east', 'Sivas-Erzurum Hattı', 9, 1, ['tur_rails'], { addInfra: 6, supply: 0.1 }, 'Doğu Anadolu\'ya demiryolu: ikmal +%10.'),
    F('tur_coal', 'Zonguldak Kömür Havzası', 11, 1, ['tur_rails'], { steel: 10, addCiv: 1 }, '+10 çelik, +1 sivil fabrika.'),
    F('tur_kirikkale', 'Kırıkkale Fabrikaları', 11, 2, ['tur_coal'], { addMil: 2, stock: { inf: 1500 } }, '+2 askerî fabrika, 1500 piyade teçhizatı.'),
    F('tur_nurikillgil', 'Nuri Killigil Silah Fabrikası', 10, 3, ['tur_kirikkale'], Object.assign(rb('inf', 'art'), { addMil: 1 }), 'Piyade ve topçu araştırma bonusu, +1 askerî fabrika.'),
    F('tur_divrigi', 'Divriği Demir Madeni', 12, 3, ['tur_kirikkale'], { steel: 15 }, '+15 çelik.', { days: S }),
    F('tur_rail_iraq', 'Bağdat Demiryolu Bağlantısı', 9, 2, ['tur_rail_east'], { addInfra: 4, addCiv: 1 }, 'Güneydoğu altyapısı ve ticaret.'),
    F('tur_industry_plan', 'İkinci Beş Yıllık Sanayi Planı', 11, 4, ['tur_nurikillgil', 'tur_divrigi'], { addCiv: 3, addMil: 2, factory: 0.05 }, '+3 sivil, +2 askerî fabrika, fabrika verimi +%5.'),
    // Havacılık
    F('tur_turkkusu', 'Türkkuşu', 13, 0, [], Object.assign(rb('air'), { air: 0.05 }), 'Sivil havacılık okulu: hava araştırma bonusu, hava +%5.', { days: S }),
    F('tur_demirag', 'Nuri Demirağ Uçak Fabrikası', 13, 1, ['tur_turkkusu'], { addPlanes: 60, addMil: 1 }, '+60 avcı uçağı, +1 askerî fabrika.'),
    F('tur_air_academy', 'Hava Harp Okulu', 14, 2, ['tur_demirag'], { air: 0.1, addCas: 40 }, 'Hava +%10, +40 yakın destek uçağı.'),
    F('tur_bombers', 'Bombardıman Filoları', 13, 3, ['tur_demirag'], { addBombers: 40 }, '+40 bombardıman uçağı.'),
    // Deniz
    F('tur_golcuk', 'Gölcük Tersanesi', 15, 0, [], { addDock: 2, navy: 0.05 }, '+2 tersane.'),
    F('tur_yavuz', 'Yavuz\'un Modernizasyonu', 15, 1, ['tur_golcuk'], { navy: 0.1, ships: { dd: 2 } }, 'Deniz +%10, +2 muhrip.'),
    F('tur_subs', 'Denizaltı Filotillası', 16, 2, ['tur_yavuz'], { ships: { ss: 6 }, addConv: 20 }, '+6 denizaltı, +20 konvoy.'),
    F('tur_naval_base', 'İskenderun Deniz Üssü', 15, 3, ['tur_yavuz'], { addDock: 1, fn: ['fortRegion', 'straits', 1] }, '+1 tersane, Boğazlara ek tahkimat.'),
    // Eğitim ve toplum
    F('tur_village', 'Köy Enstitüleri', 18, 0, [], { stab: 0.05, research: 0.05 }, 'Kırsalda eğitim: istikrar ve araştırma +%5.'),
    F('tur_university', 'Üniversite Reformu', 18, 1, ['tur_village'], { slots: 1 }, '+1 araştırma yuvası.'),
    F('tur_halkevleri', 'Halkevleri', 19, 1, ['tur_village'], { pp: 0.25, stab: 0.05 }, 'Günlük +0,25 siyasi güç, istikrar +%5.', { days: S }),
    F('tur_science', 'Türk Tarih ve Dil Kurumları', 18, 2, ['tur_university'], { research: 0.05, ws: 0.05 }, 'Araştırma ve savaş desteği +%5.'),
    F('tur_radio', 'Ankara Radyosu', 19, 2, ['tur_halkevleri'], { ws: 0.05, pp: 0.25 }, 'Propaganda ve siyasi güç.', { days: S }),
    // Ordu
    F('tur_mobilization', 'Seferberlik Planı', 21, 0, [], { mp: 0.1, ws: 0.05 }, 'İnsan gücü +%10, savaş desteği +%5.'),
    F('tur_kuvayi', 'Kuvayi Milliye Ruhu', 21, 1, ['tur_mobilization'], { landDef: 0.1, org: 0.05 }, 'Savunma +%10, moral +%5.'),
    F('tur_mountain', 'Dağ Tümenleri', 22, 1, ['tur_mobilization'], { tech: 'mtn1', units: { mtn: 2 } }, 'Dağ piyadesi teknolojisi, +2 dağ tümeni.'),
    F('tur_cavalry_reform', 'Süvari Reformu', 20, 1, ['tur_mobilization'], { tech: 'mot1', speed: 0.05 }, 'Süvariden motorize birliklere geçiş.'),
    F('tur_artillery', 'Topçu Okulu', 21, 2, ['tur_kuvayi'], rb('art', 'art'), 'İki topçu araştırmasına bonus.', { days: S }),
    F('tur_border', 'Hudut Taburları', 22, 2, ['tur_mountain'], { forts: 1, fn: ['fortRegion', 'east', 2] }, 'Sınır tahkimatı, Doğu Anadolu\'ya 2 kademe.'),
    F('tur_staff', 'Genelkurmay Planlaması', 21, 3, ['tur_artillery', 'tur_border'], { plan: 0.1, entrench: 0.1, fn: ['general'] }, 'Planlama ve siper +%10, yeni komutan.'),
    F('tur_armored', 'İlk Zırhlı Tugay', 20, 2, ['tur_cavalry_reform'], { tech: 'tank1', units: { arm: 1 } }, 'Hafif tank teknolojisi, +1 zırhlı tümen.', { req: 'year:1939' }),
    // Dış politika (ileri)
    F('tur_cyprus', 'Kıbrıs Meselesi', 8, 5, [['tur_join_axis', 'tur_mosul']], { fn: ['demand', 'ENG', 'cyprus'] }, 'Britanya\'dan Kıbrıs\'ı talep et.', { ai: 0 }),
    F('tur_batum', 'Batum ve Kafkasya', 6, 5, ['tur_turan'], { fn: ['demand', 'SOV', 'batumi'] }, 'Sovyetlerden Batum\'u talep et.', { ai: 0 }),
    F('tur_allied_aid', 'İnönü-Churchill Görüşmesi', 4, 5, ['tur_lendlease'], { addPlanes: 80, stock: { inf: 2000, art: 60 } }, 'Müttefiklerden uçak ve teçhizat.', { ai: 0 }),
  ]);

  // ---------- Almanya ----------
  add('GER', [
    F('ger_kdf', 'Kraft durch Freude', 9, 0, [], { stab: 0.05, pp: 0.25 }, 'İstikrar +%5.', { days: S }),
    F('ger_autobahn', 'Reichsautobahn', 9, 1, ['ger_kdf'], { addInfra: 10, speed: 0.05 }, '10 eyalette altyapı +1, hız +%5.'),
    F('ger_vw', 'Volkswagen Fabrikası', 10, 1, ['ger_kdf'], { addCiv: 2, stock: { mot: 300 } }, '+2 sivil fabrika, 300 motorlu araç.'),
    F('ger_speer', 'Speer Bakanlığı', 9, 2, ['ger_autobahn'], { factory: 0.1, effCap: 0.05 }, 'Fabrika verimi +%10.', { req: 'war' }),
    F('ger_ruhr', 'Ruhr Sanayisi', 10, 2, ['ger_vw'], { addMil: 3, steel: 10 }, '+3 askerî fabrika, +10 çelik.'),
    F('ger_wunder', 'Wunderwaffe', 9.5, 3, ['ger_speer', 'ger_ruhr'], { research: 0.1, slots: 1 }, 'Araştırma +%10, +1 araştırma yuvası.', { req: 'year:1942' }),
    F('ger_stuka', 'Stuka Filoları', 12, 0, [], { addCas: 120, rb: [['air', 0.5]] }, '+120 yakın destek uçağı.'),
    F('ger_bf109', 'Messerschmitt Bf 109', 12, 1, ['ger_stuka'], { addPlanes: 150, air: 0.05 }, '+150 avcı, hava +%5.'),
    F('ger_heinkel', 'Heinkel Bombardıman Filosu', 13, 1, ['ger_stuka'], { addBombers: 120 }, '+120 bombardıman.'),
    F('ger_condor', 'Kondor Lejyonu', 12, 2, ['ger_bf109'], { air: 0.1, xpGain: 0.2 }, 'Hava +%10, tecrübe kazanımı +%20.', { req: 'year:1937' }),
    F('ger_me262', 'Jet Programı', 12, 3, ['ger_condor'], Object.assign(rb('air', 'air'), { air: 0.1 }), 'Jet uçaklarına araştırma bonusu.', { req: 'year:1943' }),
    F('ger_bismarck', 'Bismarck Sınıfı', 15, 0, [], { ships: { bb: 2 }, navy: 0.05 }, '+2 zırhlı.'),
    F('ger_uboat', 'Kurt Sürüleri', 15, 1, ['ger_bismarck'], { ships: { ss: 30 }, navy: 0.05 }, '+30 denizaltı.'),
    F('ger_atlantic', 'Atlantik Muharebesi', 15, 2, ['ger_uboat'], { navy: 0.1, ships: { ss: 20 } }, '+20 denizaltı, deniz +%10.', { req: 'war' }),
    F('ger_afrika', 'Afrika Kolordusu', 6, 4, ['ger_hg'], { units: { arm: 2, mot: 2 }, fn: ['general'] }, '+2 zırhlı, +2 motorize tümen, yeni komutan.', { req: 'war' }),
    F('ger_atlantikwall', 'Atlantik Duvarı', 6, 5, ['ger_afrika'], { fn: ['fortRegion', 'atlantic', 3] }, 'Kıyı tahkimatı.', { req: 'year:1942' }),
    F('ger_paratroopers', 'Fallschirmjäger', 5, 4, ['ger_blitz'], { invasion: 0.2, org: 0.05 }, 'Çıkarma cezası -%20, moral +%5.'),
    F('ger_waffen', 'Elit Tümenler', 5, 5, ['ger_paratroopers'], { units: { arm: 2 }, landAtk: 0.05 }, '+2 zırhlı tümen.'),
    F('ger_tiger', 'Tiger Programı', 4, 4, ['ger_blitz'], Object.assign(rb('arm', 'arm'), { tech: 'tank3' }), 'Ağır tank teknolojisi.', { req: 'year:1941' }),
    F('ger_abwehr', 'Abwehr', 10, 4, ['ger_wunder'], { justify: 0.2, pp: 0.25 }, 'Savaş gerekçeleri %20 daha ucuz.', { days: S }),
    F('ger_volkssturm', 'Volkssturm', 4, 7, ['ger_total'], { mp: 0.15, landDef: 0.1 }, 'Son savunma: insan gücü +%15, savunma +%10.', { req: 'war' }),
  ]);

  // ---------- Sovyetler Birliği ----------
  add('SOV', [
    F('sov_stakhanov', 'Stahanovcu Hareket', 10, 0, [], { factory: 0.05, construct: 0.05 }, 'Fabrika ve inşaat +%5.'),
    F('sov_magnitogorsk', 'Magnitogorsk', 10, 1, ['sov_stakhanov'], { steel: 25, addMil: 2 }, '+25 çelik, +2 askerî fabrika.'),
    F('sov_turksib', 'Türksib Demiryolu', 11, 1, ['sov_stakhanov'], { addInfra: 10, supply: 0.1 }, '10 eyalette altyapı +1.'),
    F('sov_metro', 'Moskova Metrosu', 9, 1, ['sov_stakhanov'], { stab: 0.05, addCiv: 2 }, '+2 sivil fabrika.', { days: S }),
    F('sov_chelyabinsk', 'Tankograd', 10, 2, ['sov_magnitogorsk'], { addMil: 4, rb: [['arm', 0.5]] }, '+4 askerî fabrika.'),
    F('sov_fourth_plan', 'Dördüncü Beş Yıllık Plan', 10, 3, ['sov_chelyabinsk', 'sov_turksib'], { addCiv: 4, addMil: 4 }, '+4 sivil, +4 askerî fabrika.', { req: 'year:1941' }),
    F('sov_katyusha', 'Katyuşa', 12, 0, [], Object.assign(rb('art', 'art'), { landAtk: 0.05 }), 'Topçu araştırma bonusu.'),
    F('sov_il2', 'İljuşin Il-2', 13, 0, [], { addCas: 200 }, '+200 yakın destek uçağı.'),
    F('sov_yak', 'Yakovlev Avcıları', 13, 1, ['sov_il2'], { addPlanes: 250, air: 0.05 }, '+250 avcı.'),
    F('sov_kv', 'KV Ağır Tankı', 12, 1, ['sov_katyusha'], Object.assign(rb('arm'), { tech: 'tank3' }), 'Ağır tank teknolojisi.', { req: 'year:1940' }),
    F('sov_not_step', 'Bir Adım Bile Geri Yok', 12, 2, ['sov_kv'], { landDef: 0.1, entrench: 0.2 }, 'Savunma +%10, siper +%20.', { req: 'war' }),
    F('sov_partisans', 'Partizan Hareketi', 13, 2, ['sov_yak'], { supply: -0.0, landDef: 0.05, ws: 0.05 }, 'Düşman gerisinde direniş.', { req: 'warWith:GER' }),
    F('sov_siberian', 'Sibirya Tümenleri', 12, 3, ['sov_not_step'], { units: { inf: 8 }, fn: ['general'] }, '+8 piyade tümeni (kışa hazırlıklı), yeni komutan.', { req: 'warWith:GER' }),
    F('sov_guards', 'Muhafız Tümenleri', 13, 3, ['sov_partisans'], { org: 0.1, xpGain: 0.25 }, 'Moral +%10, tecrübe +%25.', { req: 'war' }),
    F('sov_bagration', 'Bagration Harekâtı', 12.5, 4, ['sov_siberian', 'sov_guards'], { landAtk: 0.1, plan: 0.1 }, 'Saldırı +%10, planlama +%10.', { req: 'year:1943' }),
    F('sov_jap_pact', 'Japonya ile Tarafsızlık', 9, 3, ['sov_world'], { fn: ['pact', ['JAP']] }, 'Japonya ile saldırmazlık.', { ai: 0 }),
    F('sov_persia', 'İran Harekâtı', 8, 5, ['sov_world'], { fn: ['goal', ['PER']] }, 'İran\'a karşı savaş gerekçesi.', { ai: 0 }),
  ]);

  // ---------- Birleşik Krallık ----------
  add('ENG', [
    F('eng_shadow', 'Gölge Fabrikalar', 7, 0, [], { addMil: 3, addCiv: 1 }, '+3 askerî, +1 sivil fabrika.'),
    F('eng_lancaster', 'Bombardıman Komutanlığı', 7, 1, ['eng_shadow'], { addBombers: 150 }, '+150 bombardıman.'),
    F('eng_coastal', 'Kıyı Komutanlığı', 8, 1, ['eng_shadow'], { addCas: 80, navy: 0.05 }, '+80 deniz saldırı uçağı.'),
    F('eng_hurricane', 'Hurricane Filoları', 6, 1, ['eng_shadow'], { addPlanes: 120 }, '+120 avcı.'),
    F('eng_bletchley', 'Bletchley Park', 7, 2, ['eng_lancaster'], { research: 0.05, fn: ['decryptAll'] }, 'Enigma çözülür: düşmanlara karşı muharebede +%12.', { req: 'year:1940' }),
    F('eng_home_guard', 'Yurt Muhafızları', 9, 0, [], { units: { inf: 4 }, landDef: 0.05 }, '+4 piyade tümeni.', { req: 'tension:50' }),
    F('eng_indian', 'Hint Ordusu', 9, 1, ['eng_home_guard'], { mp: 0.2, units: { inf: 6 } }, '+6 piyade tümeni, insan gücü +%20.', { req: 'war' }),
    F('eng_anzac', 'ANZAC Kuvvetleri', 10, 1, ['eng_home_guard'], { units: { inf: 4 } }, '+4 piyade tümeni.', { req: 'war' }),
    F('eng_commandos', 'Komandolar', 9, 2, ['eng_indian'], { invasion: 0.2, tech: 'mar1' }, 'Deniz piyadesi, çıkarma +%20.'),
    F('eng_desert', 'Çöl Faresi', 10, 2, ['eng_anzac'], { units: { arm: 2 }, fn: ['general'] }, '+2 zırhlı tümen, yeni komutan.', { req: 'war' }),
    F('eng_mulberry', 'Mulberry Limanları', 9, 3, ['eng_commandos'], { invasion: 0.25, supply: 0.1 }, 'Çıkarma +%25, ikmal +%10.', { req: 'year:1943' }),
    F('eng_atlantic_charter', 'Atlantik Bildirgesi', 6, 3, ['eng_lendlease'], { ws: 0.1, fn: ['invite', ['USA']] }, 'ABD\'yi ittifaka davet et.', { req: 'year:1941' }),
    F('eng_hood', 'Kraliyet Donanması Yenilemesi', 4, 3, ['eng_convoy'], { ships: { bb: 2, cv: 1 } }, '+2 zırhlı, +1 uçak gemisi.'),
  ]);

  // ---------- Fransa ----------
  add('FRA', [
    F('fra_matignon', 'Matignon Anlaşmaları', 8, 0, [], { stab: 0.05, addCiv: 1 }, 'İşçi barışı: istikrar +%5.', { days: S }),
    F('fra_rail', 'SNCF\'nin Kuruluşu', 8, 1, ['fra_matignon'], { addInfra: 6, supply: 0.05 }, '6 eyalette altyapı +1.'),
    F('fra_renault', 'Renault Fabrikaları', 9, 1, ['fra_matignon'], { addMil: 2, stock: { mot: 200 } }, '+2 askerî fabrika.'),
    F('fra_dewoitine', 'Dewoitine Avcıları', 9, 2, ['fra_renault'], { addPlanes: 100, air: 0.05 }, '+100 avcı.'),
    F('fra_richelieu', 'Richelieu Sınıfı', 10, 0, [], { ships: { bb: 2 }, navy: 0.05 }, '+2 zırhlı.'),
    F('fra_mers', 'Akdeniz Filosu', 10, 1, ['fra_richelieu'], { navy: 0.1, ships: { cr: 2 } }, '+2 kruvazör.'),
    F('fra_afrique', 'Afrika Ordusu', 6, 3, ['fra_colonial'], { units: { inf: 4 }, mp: 0.1 }, '+4 sömürge tümeni.', { req: 'war' }),
    F('fra_indochina', 'Çinhindi Savunması', 7, 3, ['fra_colonial'], { fn: ['fortRegion', 'indochina', 2] }, 'Çinhindi tahkimatı.'),
    F('fra_mobile', 'Zırhlı Tümenler', 1, 3, ['fra_degaulle'], { units: { arm: 2 }, tech: 'tank2' }, '+2 zırhlı tümen, orta tank.'),
    F('fra_resistance', 'Direniş Ağları', 4, 4, ['fra_free'], { landDef: 0.05, ws: 0.1 }, 'Direniş.', { req: 'war' }),
    F('fra_liberation', 'Kurtuluş', 4, 5, ['fra_resistance'], { landAtk: 0.1, units: { inf: 4 } }, '+4 tümen, saldırı +%10.', { req: 'year:1943' }),
  ]);

  // ---------- İtalya ----------
  add('ITA', [
    F('ita_autarky', 'Otarşi', 7, 0, [], { steel: 10, addCiv: 1 }, '+10 çelik.'),
    F('ita_fiat', 'Fiat ve Breda', 7, 1, ['ita_autarky'], { addMil: 3 }, '+3 askerî fabrika.'),
    F('ita_litorio', 'Littorio Zırhlıları', 8, 1, ['ita_autarky'], { ships: { bb: 2 } }, '+2 zırhlı.'),
    F('ita_macchi', 'Macchi Avcıları', 7, 2, ['ita_fiat'], { addPlanes: 100, air: 0.05 }, '+100 avcı.'),
    F('ita_alpini', 'Alpini', 0, 4, ['ita_balkans'], { tech: 'mtn1', units: { mtn: 3 } }, '+3 dağ tümeni.'),
    F('ita_africa', 'Doğu Afrika İmparatorluğu', 4, 3, ['ita_libya'], { units: { inf: 4 }, fn: ['fortRegion', 'eastafrica', 2] }, '+4 tümen, Doğu Afrika tahkimatı.'),
    F('ita_suez', 'Süveyş Hedefi', 3, 3, ['ita_egypt'], { landAtk: 0.05, supply: 0.1 }, 'Saldırı +%5, ikmal +%10.', { req: 'war' }),
    F('ita_xmas', 'Decima MAS', 8, 2, ['ita_litorio'], { navy: 0.1, ships: { ss: 10 } }, '+10 denizaltı.'),
    F('ita_corporatism', 'Korporatizm', 9, 0, [], { factory: 0.05, stab: 0.05 }, 'Fabrika verimi +%5.'),
    F('ita_roads', 'İmparatorluk Yolları', 9, 1, ['ita_corporatism'], { addInfra: 6 }, '6 eyalette altyapı +1.'),
    F('ita_reform', 'Ordu Reformu', 9, 2, ['ita_roads'], { org: 0.1, fn: ['general'] }, 'Moral +%10, yeni komutan.'),
  ]);

  // ---------- Japonya ----------
  add('JAP', [
    F('jap_yamato', 'Yamato Sınıfı', 8, 0, [], { ships: { bb: 2 }, navy: 0.05 }, '+2 zırhlı.'),
    F('jap_kido', 'Kidō Butai', 8, 1, ['jap_yamato'], { ships: { cv: 2 }, addPlanes: 100 }, '+2 uçak gemisi, +100 avcı.'),
    F('jap_lance', 'Uzun Mızrak Torpidosu', 9, 1, ['jap_yamato'], { navy: 0.1, ships: { dd: 10 } }, '+10 muhrip.'),
    F('jap_midway', 'Pasifik Çevresi', 8, 2, ['jap_kido'], { invasion: 0.2, fn: ['fortRegion', 'pacific', 2] }, 'Ada üslerine tahkimat, çıkarma +%20.', { req: 'year:1941' }),
    F('jap_betty', 'Deniz Bombardıman Filoları', 9, 2, ['jap_lance'], { addBombers: 100 }, '+100 bombardıman.'),
    F('jap_rail', 'Mançurya Demiryolları', 10, 0, [], { addInfra: 6, addCiv: 1 }, '6 eyalette altyapı +1.'),
    F('jap_oil', 'Petrol Arayışı', 10, 1, ['jap_rail'], { oil: 15, synth: 0 }, '+15 petrol.'),
    F('jap_heavy', 'Ağır Sanayi Planı', 10, 2, ['jap_oil'], { addMil: 4, addCiv: 2 }, '+4 askerî, +2 sivil fabrika.', { req: 'year:1938' }),
    F('jap_banzai', 'Banzai Ruhu', 4, 3, ['jap_jungle'], { org: 0.1, landAtk: 0.05 }, 'Moral +%10.'),
    F('jap_kamikaze', 'Tokkōtai', 4, 4, ['jap_banzai'], { navy: 0.1, air: 0.1 }, 'Hava ve deniz +%10.', { req: 'year:1944' }),
    F('jap_burma', 'Burma Yolu', 3, 4, ['jap_pearl'], { fn: ['goal', ['RAJ']] }, 'Hindistan\'a karşı savaş gerekçesi.', { ai: 0 }),
  ]);

  // ---------- ABD ----------
  add('USA', [
    F('usa_draft', 'Seçmeli Hizmet Yasası', 6, 0, [], { mp: 0.2, units: { inf: 6 } }, '+6 piyade tümeni, insan gücü +%20.', { req: 'tension:50' }),
    F('usa_armor', 'Zırhlı Kuvvet', 6, 1, ['usa_draft'], { tech: 'tank2', units: { arm: 3 } }, '+3 zırhlı tümen.'),
    F('usa_airborne', 'Hava İndirme Tümenleri', 7, 1, ['usa_draft'], { tech: 'para1', invasion: 0.15, org: 0.05 }, 'Hava indirme teknolojisi, çıkarma +%15.'),
    F('usa_marines', 'Deniz Piyadeleri', 7, 2, ['usa_airborne'], { tech: 'mar1', units: { mar: 3 } }, '+3 deniz piyadesi tümeni.'),
    F('usa_mustang', 'P-51 Mustang', 8, 0, [], { addPlanes: 300, air: 0.05 }, '+300 avcı.', { req: 'year:1941' }),
    F('usa_b29', 'B-29 Süper Kale', 8, 1, ['usa_mustang'], { addBombers: 200 }, '+200 bombardıman.', { req: 'year:1942' }),
    F('usa_essex', 'Essex Sınıfı', 9, 0, [], { ships: { cv: 4 }, navy: 0.1 }, '+4 uçak gemisi.', { req: 'year:1941' }),
    F('usa_liberty', 'Liberty Gemileri', 9, 1, ['usa_essex'], { addConv: 300, addDock: 3 }, '+300 konvoy, +3 tersane.'),
    F('usa_highways', 'Federal Yollar', 5, 1, ['usa_newdeal'], { addInfra: 10, construct: 0.05 }, '10 eyalette altyapı +1.'),
    F('usa_war_prod', 'Savaş Üretim Kurulu', 1, 3, ['usa_arsenal'], { addMil: 8, factory: 0.1 }, '+8 askerî fabrika, verim +%10.', { req: 'war' }),
    F('usa_overlord', 'Overlord Planı', 2, 4, ['usa_join'], { invasion: 0.3, landAtk: 0.05 }, 'Büyük çıkarma: çıkarma +%30.', { req: 'year:1943' }),
  ]);

  // ---------- Küçük devletler için ulusal ağaçlar ----------
  g.FOCUS_NATIONAL.CHI = [
    F('chi_unity', 'Birleşik Cephe', 2, 0, [], { stab: 0.1, rmSpirit: 'warlords' }, 'Savaş ağaları sorunu azalır.'),
    F('chi_germany_advisors', 'Alman Askerî Danışmanlar', 1, 1, ['chi_unity'], { org: 0.1, rb: [['doc', 0.5]] }, 'Moral +%10.'),
    F('chi_central_army', 'Merkezî Ordu', 1, 2, ['chi_germany_advisors'], { units: { inf: 6 }, landDef: 0.05 }, '+6 piyade tümeni.'),
    F('chi_burma_road', 'Burma Yolu', 3, 1, ['chi_unity'], { addInfra: 4, supply: 0.15 }, 'İkmal +%15.'),
    F('chi_industry', 'Çungking Sanayisi', 3, 2, ['chi_burma_road'], { addCiv: 3, addMil: 2 }, '+3 sivil, +2 askerî fabrika.'),
    F('chi_flying_tigers', 'Uçan Kaplanlar', 4, 2, ['chi_burma_road'], { addPlanes: 100 }, '+100 avcı.', { req: 'war' }),
    F('chi_scorched', 'Yakılmış Toprak', 2, 3, ['chi_central_army', 'chi_industry'], { landDef: 0.1, entrench: 0.2 }, 'Savunma +%10.', { req: 'war' }),
    F('chi_mass', 'Halk Seferberliği', 1, 3, ['chi_central_army'], { mp: 0.3, units: { inf: 10 } }, '+10 tümen, insan gücü +%30.', { req: 'war' }),
    F('chi_allies', 'Müttefik Yardımı', 3, 4, ['chi_scorched'], { stock: { inf: 3000, art: 100 }, spirit: 'lend_lease' }, 'Müttefik teçhizatı.', { req: 'year:1941' }),
  ];
  g.FOCUS_NATIONAL.POL = [
    F('pol_cop', 'Merkezî Sanayi Bölgesi', 1, 0, [], { addCiv: 2, addMil: 1 }, '+2 sivil, +1 askerî fabrika.'),
    F('pol_stalowa', 'Stalowa Wola', 1, 1, ['pol_cop'], { addMil: 2, steel: 5 }, '+2 askerî fabrika.'),
    F('pol_7tp', '7TP Tankları', 1, 2, ['pol_stalowa'], { tech: 'tank1', units: { arm: 1 } }, '+1 zırhlı tümen.'),
    F('pol_pzl', 'PZL Uçakları', 2, 1, ['pol_cop'], { addPlanes: 80 }, '+80 avcı.'),
    F('pol_intermarium', 'Intermarium', 3, 0, [], { fn: ['mkFac', 'Intermarium', ['ROM', 'HUN', 'LIT']] }, 'Kendi ittifakını kur.', { ai: 0, excl: ['pol_west'] }),
    F('pol_west', 'Batı Garantileri', 4, 0, [], { ws: 0.1 }, 'İngiltere ve Fransa ile yakınlaşma.', { excl: ['pol_intermarium'] }),
    F('pol_fortify', 'Batı Sınırını Tahkim Et', 2, 2, ['pol_pzl'], { fn: ['fortRegion', 'polwest', 2] }, 'Batı sınırına 2 kademe tahkimat.'),
    F('pol_cavalry', 'Süvari Gelenekleri', 0, 1, ['pol_cop'], { org: 0.05, speed: 0.05 }, 'Moral ve hız +%5.', { days: S }),
    F('pol_mobilize', 'Genel Seferberlik', 1, 3, ['pol_7tp', 'pol_fortify'], { mp: 0.15, units: { inf: 4 } }, '+4 tümen.', { req: 'tension:50' }),
    F('pol_enigma', 'Enigma Çözücüler', 3, 1, ['pol_west'], { research: 0.05, fn: ['decryptAll'] }, 'Enigma şifreleri çözülür.'),
  ];
  g.FOCUS_NATIONAL.ROM = [
    F('rom_oil', 'Ploieşti Petrolü', 1, 0, [], { oil: 15, addCiv: 1 }, '+15 petrol.'),
    F('rom_iar', 'IAR Uçak Fabrikası', 1, 1, ['rom_oil'], { addPlanes: 60, addMil: 1 }, '+60 avcı.'),
    F('rom_carol', 'Kral Carol\'un Diktası', 3, 0, [], { stab: 0.1 }, 'İstikrar +%10.', { excl: ['rom_guard'] }),
    F('rom_guard', 'Demir Muhafız', 4, 0, [], { pop: { fas: 0.3 }, ws: 0.1 }, 'Faşistler güçlenir.', { excl: ['rom_carol'], ai: 0 }),
    F('rom_balkan', 'Balkan Antantı', 3, 1, ['rom_carol'], { fn: ['guar', ['YUG', 'GRE']] }, 'Yugoslavya ve Yunanistan\'ı garanti et.'),
    F('rom_axis', 'Mihvere Katıl', 4, 1, ['rom_guard'], { fn: ['joinFac', 'GER'] }, 'Mihvere katıl.', { ai: 0 }),
    F('rom_carpathian', 'Karpat Hattı', 2, 1, ['rom_oil'], { forts: 1, landDef: 0.05 }, 'Sınır tahkimatı.'),
    F('rom_army', 'Ordu Modernizasyonu', 2, 2, ['rom_iar', 'rom_carpathian'], { units: { inf: 3 }, tech: 'mot1' }, '+3 tümen.'),
  ];
  g.FOCUS_NATIONAL.HUN = [
    F('hun_gyor', 'Győr Programı', 1, 0, [], { addMil: 2, addCiv: 1 }, '+2 askerî, +1 sivil fabrika.'),
    F('hun_rearm', 'Silahlanma Eşitliği', 1, 1, ['hun_gyor'], { units: { inf: 3 }, ws: 0.05 }, '+3 tümen.'),
    F('hun_turan', 'Turán Tankları', 1, 2, ['hun_rearm'], { tech: 'tank1', units: { arm: 1 } }, '+1 zırhlı tümen.'),
    F('hun_revision', 'Trianon\'u Gözden Geçir', 3, 0, [], { fn: ['goal', ['CZE', 'ROM']] }, 'Çekoslovakya ve Romanya\'ya karşı savaş gerekçesi.', { ai: 0 }),
    F('hun_axis', 'Mihverle İş Birliği', 3, 1, ['hun_revision'], { fn: ['joinFac', 'GER'] }, 'Mihvere katıl.', { ai: 0 }),
    F('hun_horthy', 'Horthy\'nin Naipliği', 2, 0, [], { stab: 0.1, pp: 0.25 }, 'İstikrar +%10.', { days: S }),
  ];
  g.FOCUS_NATIONAL.YUG = [
    F('yug_unity', 'Yugoslav Birliği', 1, 0, [], { stab: 0.1 }, 'Sırp-Hırvat uzlaşması.'),
    F('yug_bor', 'Bor Bakır Madenleri', 2, 0, [], { steel: 10, addCiv: 1 }, '+10 çelik.'),
    F('yug_army', 'Kraliyet Ordusu', 1, 1, ['yug_unity'], { units: { inf: 4 }, landDef: 0.05 }, '+4 tümen.'),
    F('yug_mountains', 'Dağ Savunması', 1, 2, ['yug_army'], { tech: 'mtn1', fn: ['fortRegion', 'dinaric', 2] }, 'Dağ piyadesi ve tahkimat.'),
    F('yug_partisans', 'Partizan Direnişi', 2, 2, ['yug_army'], { landDef: 0.1, mp: 0.1 }, 'Savunma +%10.', { req: 'war' }),
    F('yug_balkan', 'Balkan Paktı', 3, 0, [], { fn: ['guar', ['GRE', 'ROM']] }, 'Komşuları garanti et.'),
  ];
  g.FOCUS_NATIONAL.GRE = [
    F('gre_metaxas', 'Metaksas Rejimi', 1, 0, [], { stab: 0.1, ws: 0.05 }, 'İstikrar +%10.'),
    F('gre_line', 'Metaksas Hattı', 1, 1, ['gre_metaxas'], { fn: ['fortRegion', 'macedonia', 3] }, 'Bulgar sınırına 3 kademe tahkimat.'),
    F('gre_ochi', '“Okhi” Günü', 1, 2, ['gre_line'], { landDef: 0.15, ws: 0.1 }, 'Savunma +%15.', { req: 'war' }),
    F('gre_navy', 'Yunan Donanması', 2, 0, [], { ships: { dd: 4 }, addDock: 1 }, '+4 muhrip.'),
    F('gre_britain', 'İngiliz Garantisi', 3, 0, [], { fn: ['joinFac', 'ENG'] }, 'Müttefiklere katıl.', { ai: 0, req: 'war' }),
    F('gre_army', 'Dağ Tümenleri', 2, 1, ['gre_navy'], { tech: 'mtn1', units: { mtn: 2 } }, '+2 dağ tümeni.'),
  ];
  g.FOCUS_NATIONAL.FIN = [
    F('fin_mannerheim_line', 'Mannerheim Hattı', 1, 0, [], { fn: ['fortRegion', 'karelia', 3] }, 'Karelya\'ya 3 kademe tahkimat.'),
    F('fin_motti', 'Motti Taktikleri', 1, 1, ['fin_mannerheim_line'], { landDef: 0.1, org: 0.1 }, 'Savunma ve moral +%10.'),
    F('fin_sisu', 'Sisu', 1, 2, ['fin_motti'], { spirit: 'resistance', ws: 0.15 }, 'Direniş ruhu.', { req: 'war' }),
    F('fin_skis', 'Kayakçı Birlikleri', 2, 1, ['fin_mannerheim_line'], { speed: 0.1, units: { inf: 2 } }, '+2 tümen, hız +%10.'),
    F('fin_suomi', 'Suomi Hafif Makineli', 2, 0, [], Object.assign(rb('inf', 'inf'), { landAtk: 0.05 }), 'Piyade araştırma bonusu.', { days: S }),
    F('fin_continuation', 'Devam Savaşı', 3, 1, ['fin_motti'], { fn: ['goal', ['SOV']] }, 'Sovyetlere karşı savaş gerekçesi.', { ai: 0, req: 'year:1941' }),
  ];
  g.FOCUS_NATIONAL.BUL = [
    F('bul_tsar', 'Çar Boris\'in Dengesi', 1, 0, [], { stab: 0.1 }, 'İstikrar +%10.'),
    F('bul_army', 'Ordu Yasası', 1, 1, ['bul_tsar'], { units: { inf: 3 } }, '+3 tümen.'),
    F('bul_dobruja', 'Güney Dobruca', 2, 1, ['bul_tsar'], { fn: ['demand', 'ROM', 'dobruja'] }, 'Romanya\'dan Güney Dobruca\'yı talep et.', { ai: 0 }),
    F('bul_axis', 'Üçlü Pakt', 2, 2, ['bul_dobruja'], { fn: ['joinFac', 'GER'] }, 'Mihvere katıl.', { ai: 0 }),
    F('bul_industry', 'Sofya Sanayisi', 0, 1, ['bul_tsar'], { addCiv: 2 }, '+2 sivil fabrika.'),
  ];
  g.FOCUS_NATIONAL.PER = [
    F('per_rail', 'Trans-İran Demiryolu', 1, 0, [], { addInfra: 6, addCiv: 1 }, '6 eyalette altyapı +1.'),
    F('per_oil', 'Abadan Rafinerisi', 1, 1, ['per_rail'], { oil: 20 }, '+20 petrol.'),
    F('per_army', 'Pehlevi Ordusu', 2, 0, [], { units: { inf: 4 }, org: 0.05 }, '+4 tümen.'),
    F('per_saadabad', 'Sadabat Paktı', 3, 0, [], { fn: ['pact', ['TUR', 'IRQ', 'AFG']] }, 'Komşularla saldırmazlık.'),
    F('per_neutral', 'Tarafsızlık', 2, 1, ['per_army'], { spirit: 'armed_neutrality' }, 'Savunma +%15.'),
  ];
  g.FOCUS_NATIONAL.SPR = [
    F('spr_popfront', 'Halk Cephesi', 1, 0, [], { stab: 0.05, pop: { com: 0.1 } }, 'Cumhuriyet birliği.'),
    F('spr_brigades', 'Enternasyonal Tugaylar', 1, 1, ['spr_popfront'], { units: { inf: 3 }, org: 0.05 }, '+3 tümen.', { req: 'war' }),
    F('spr_madrid', 'Madrid\'i Savun', 1, 2, ['spr_brigades'], { fn: ['fortRegion', 'madrid', 3], landDef: 0.1 }, '“No pasarán!”', { req: 'war' }),
    F('spr_soviet', 'Sovyet Yardımı', 2, 1, ['spr_popfront'], { stock: { inf: 2000, art: 60 }, addPlanes: 60 }, 'Sovyet teçhizatı ve uçakları.', { req: 'war' }),
    F('spr_industry', 'Katalonya Sanayisi', 2, 0, [], { addMil: 2 }, '+2 askerî fabrika.'),
  ];
  g.FOCUS_NATIONAL.SWE = [
    F('swe_iron', 'Kiruna Demir Cevheri', 1, 0, [], { steel: 15, addCiv: 1 }, '+15 çelik.'),
    F('swe_bofors', 'Bofors', 1, 1, ['swe_iron'], Object.assign(rb('art', 'art'), { addMil: 2 }), '+2 askerî fabrika.'),
    F('swe_saab', 'SAAB Uçakları', 2, 1, ['swe_iron'], { addPlanes: 60 }, '+60 avcı.'),
    F('swe_neutral', 'Silahlı Tarafsızlık', 2, 0, [], { spirit: 'armed_neutrality', forts: 1 }, 'Savunma +%15, sınır tahkimatı.'),
  ];

  // Ek bölge seçicileri
  const box = (a, b, c, d) => (p) => p.lon >= a && p.lon <= c && p.lat >= b && p.lat <= d;
  Object.assign(g.FOCUS_REGIONS, {
    cyprus: box(32.2, 34.5, 34.7, 35.8),
    batumi: box(41.3, 41.2, 42.8, 42.1),
    east: (p) => p.lon > 38.5,
    atlantic: (p) => p.lon < 5 && p.lat > 43,
    indochina: box(100, 8, 110, 24),
    eastafrica: box(33, -2, 52, 18),
    pacific: (p) => p.lon > 130 || p.lon < -150,
    polwest: (p) => p.lon < 19.5,
    dinaric: box(13.5, 42, 20.5, 46),
    macedonia: box(21, 40.6, 26.5, 41.8),
    karelia: box(27, 60, 33, 63.5),
    dobruja: (p) => p.lat > 43.5 && p.lat < 44.2 && p.lon > 26.3,
    madrid: box(-4.5, 39.8, -3, 41),
  });

  // Ek ulusal ruhlar
  Object.assign(g.SPIRITS || {}, {});
})(window);
