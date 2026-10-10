// Alternatif tarih dalları (HOI4): büyük ülkelerin ulusal odak ağaçlarına eklenir.
// Her yol 10 odaktır: kök → iki kol → birleşme → üç kol → iki kol → zirve.
// Kök odak tarihî siyasi yolla ve aynı ülkenin diğer alternatif kökleriyle birbirini dışlar; bazı kökler iç savaş başlatır.
// Yapay zekâ bu dalları almaz (ai: 0); tarihî akış korunur, alternatifleri yalnızca oyuncu seçer.
(function (g) {
  const ideo = (i, leader, cw) => ({ fn: cw ? ['ideo', i, leader, cw] : ['ideo', i, leader] });
  // yol: c = dalın orta sütunu (ağacın sağına göre), N = 10 düğüm [id, ad, fx, açıklama]
  // sıra: kök, sol, sağ, orta, sol2, orta2, sağ2, sol3, sağ3, zirve
  function path(c, N) {
    const [r, l1, r1, m1, l2, m2, r2, l3, r3, cap] = N;
    const mk = ([id, n, fx, d], rx, y, pre) => ({ id, n, rx, y, pre, fx, d, alt: 1, ai: 0 });
    return [
      mk(r, c, 0, []),
      mk(l1, c - 1, 1, [r[0]]), mk(r1, c + 1, 1, [r[0]]),
      mk(m1, c, 2, [l1[0], r1[0]]),
      mk(l2, c - 1, 3, [m1[0]]), mk(m2, c, 3, [m1[0]]), mk(r2, c + 1, 3, [m1[0]]),
      mk(l3, c - 1, 4, [l2[0]]), mk(r3, c + 1, 4, [r2[0]]),
      mk(cap, c, 5, [l3[0], m2[0], r3[0]]),
    ];
  }
  const A = {
    GER: { block: ['ger_axis'], roots: ['ger_k_kaiser', 'ger_r_red'], list: [
      ...path(1, [
        ['ger_k_kaiser', 'Kayzer\'i Geri Çağır', Object.assign(ideo('neu', 'Kayzer II. Wilhelm'), { stab: 0.05 }), 'Ordu Hitler\'i devirir; II. Wilhelm Doorn\'dan dönerek tahta çıkar. Nazi yolu kapanır.'],
        ['ger_k_junker', 'Junker Subay Kolordusu', { landDef: 0.05, org: 0.05 }, 'Kara savunması +%5, moral +%5.'],
        ['ger_k_reichstag', 'İmparatorluk Meclisi', { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, günlük siyasi güç +0,25.'],
        ['ger_k_mittel', 'Mitteleuropa', { fn: ['mkFac', 'Orta Avrupa Birliği', ['AUS', 'HUN', 'BUL', 'ROM'], 45] }, 'Orta Avrupa Birliği\'ni kur; Avusturya, Macaristan, Bulgaristan ve Romanya\'yı davet et.'],
        ['ger_k_staff', 'Prusya Genelkurmayı', { landAtk: 0.03, fn: ['general'] }, 'Kara saldırısı +%3, yeni komutan.'],
        ['ger_k_krupp', 'Krupp ile Anlaşma', { addMil: 4 }, '+4 askerî fabrika.'],
        ['ger_k_hochsee', 'Açık Deniz Filosu', { ships: { bb: 2, cr: 3 }, navy: 0.1 }, '+2 zırhlı, +3 kruvazör, deniz +%10.'],
        ['ger_k_east', 'Doğu Sınırı', { fn: ['demand', 'POL', 'polwest'] }, 'Polonya\'dan 1914 öncesi Alman topraklarını talep et.'],
        ['ger_k_colonies', 'Sömürgeleri Geri İste', { fn: ['goal', ['FRA']], ws: 0.05 }, 'Fransa\'ya karşı savaş gerekçesi, savaş desteği +%5.'],
        ['ger_k_reich', 'Kaiserreich', { ws: 0.1, landAtk: 0.05, addMil: 3 }, 'Savaş desteği +%10, kara saldırısı +%5, +3 askerî fabrika.'],
      ]),
      ...path(4.5, [
        ['ger_r_red', 'Spartakist Ayaklanma', ideo('com', 'Ernst Thälmann', { n: 'Nasyonal Sosyalist Almanya', l: 'Hermann Göring', share: 0.35 }), 'KPD sokakları ele geçirir; Thälmann Alman Sovyet Cumhuriyeti\'ni ilan eder. Naziler ve ordunun bir kısmı ayaklanır: İÇ SAVAŞ.'],
        ['ger_r_council', 'İşçi Konseyleri', { addCiv: 3, stab: 0.05 }, '+3 sivil fabrika, istikrar +%5.'],
        ['ger_r_army', 'Kızıl Reichswehr', { landAtk: 0.05, units: { inf: 4 } }, 'Kara saldırısı +%5, +4 piyade tümeni.'],
        ['ger_r_comintern', 'Komintern\'e Katıl', { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'],
        ['ger_r_plan', 'Merkezî Planlama', { addMil: 4, effCap: 0.05 }, '+4 askerî fabrika, üretim verimi tavanı +%5.'],
        ['ger_r_air', 'Kızıl Hava Kuvvetleri', { addPlanes: 100, air: 0.05 }, '+100 avcı uçağı, hava +%5.'],
        ['ger_r_export', 'Devrimi İhraç Et', { fn: ['goal', ['AUS', 'CZE', 'POL']] }, 'Avusturya, Çekoslovakya ve Polonya\'ya karşı savaş gerekçesi.'],
        ['ger_r_ruhr', 'Ruhr Kombinaları', { addMil: 3, addCiv: 2 }, '+3 askerî, +2 sivil fabrika.'],
        ['ger_r_front', 'Kızıl Cephe Birlikleri', { units: { inf: 6 }, org: 0.05 }, '+6 piyade tümeni, moral +%5.'],
        ['ger_r_world', 'Avrupa Sovyetler Birliği', { ws: 0.15, org: 0.05, pop: { com: 0.1 } }, 'Savaş desteği +%15, moral +%5.'],
      ]),
    ] },
    USA: { block: ['usa_neutral'], roots: ['usa_f_long', 'usa_s_red'], list: [
      ...path(1, [
        ['usa_f_long', 'Huey Long Başkan', ideo('fas', 'Huey Long', { n: 'Amerikan Anayasa Birliği', l: 'Franklin D. Roosevelt', id: 'dem', share: 0.3 }), '"Herkes Bir Kral" diyen Huey Long Beyaz Saray\'a girer. Anayasa yanlısı eyaletler ayaklanır: İÇ SAVAŞ.'],
        ['usa_f_share', 'Servetimizi Paylaşalım', { stab: 0.1, addCiv: 4 }, 'İstikrar +%10, +4 sivil fabrika.'],
        ['usa_f_rearm', 'Amerikan Silahlanması', { addMil: 8 }, '+8 askerî fabrika.'],
        ['usa_f_monroe', 'Monroe Doktrini', { fn: ['mkFac', 'Amerika Paktı', ['MEX', 'BRA'], 45] }, 'Amerika Paktı\'nı kur; Meksika ve Brezilya\'yı davet et.'],
        ['usa_f_guard', 'Ulusal Muhafız Ordusu', { units: { inf: 8 } }, '+8 piyade tümeni.'],
        ['usa_f_air', 'Amerikan Hava Gücü', { addPlanes: 150, air: 0.05 }, '+150 avcı uçağı, hava +%5.'],
        ['usa_f_ocean', 'İki Okyanus Hâkimiyeti', { ships: { cv: 2, bb: 2 }, navy: 0.1 }, '+2 uçak gemisi, +2 zırhlı, deniz +%10.'],
        ['usa_f_canada', 'Kanada Meselesi', { fn: ['goal', ['CAN']] }, 'Kanada\'ya karşı savaş gerekçesi.'],
        ['usa_f_carib', 'Karayipler', { fn: ['goal', ['MEX']], navy: 0.05 }, 'Meksika\'ya karşı savaş gerekçesi, deniz +%5.'],
        ['usa_f_order', 'Yeni Amerikan Düzeni', { ws: 0.15, landAtk: 0.05 }, 'Savaş desteği +%15, kara saldırısı +%5.'],
      ]),
      ...path(4.5, [
        ['usa_s_red', 'Sosyalist Amerika', ideo('com', 'Earl Browder', { n: 'Amerikan Cumhuriyeti', l: 'Franklin D. Roosevelt', share: 0.35 }), 'Büyük Buhran devrime döner; Earl Browder Amerikan Sosyalist Cumhuriyeti\'ni ilan eder. Eski düzen yanlıları ayaklanır: İÇ SAVAŞ.'],
        ['usa_s_unions', 'Sendikalar Devleti', { addCiv: 5 }, '+5 sivil fabrika.'],
        ['usa_s_army', 'Halk Ordusu', { units: { inf: 6 }, org: 0.05 }, '+6 piyade tümeni, moral +%5.'],
        ['usa_s_intl', 'Enternasyonal ile Birlik', { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'],
        ['usa_s_plan', 'Planlı Ekonomi', { addMil: 6 }, '+6 askerî fabrika.'],
        ['usa_s_air', 'Kızıl Hava Filosu', { addPlanes: 120, air: 0.05 }, '+120 avcı uçağı, hava +%5.'],
        ['usa_s_fleet', 'Pasifik Filosu', { ships: { cv: 1, cr: 3 }, navy: 0.05 }, '+1 uçak gemisi, +3 kruvazör, deniz +%5.'],
        ['usa_s_west', 'Batı Yarımküre Devrimi', { fn: ['goal', ['MEX', 'CAN']] }, 'Meksika ve Kanada\'ya karşı savaş gerekçesi.'],
        ['usa_s_latam', 'Latin Amerika Devrimi', { fn: ['goal', ['BRA', 'ARG']] }, 'Brezilya ve Arjantin\'e karşı savaş gerekçesi.'],
        ['usa_s_union', 'Amerikan Sosyalist Birliği', { ws: 0.15, stab: 0.1 }, 'Savaş desteği +%15, istikrar +%10.'],
      ]),
    ] },
    FRA: { block: ['fra_unity'], roots: ['fra_c_commune', 'fra_m_roi'], list: [
      ...path(1, [
        ['fra_c_commune', 'Halk Cephesi Devrimi', ideo('com', 'Maurice Thorez', { n: 'Fransız Devleti', l: 'Philippe Pétain', id: 'neu', share: 0.3 }), 'Genel grev devrime döner; Thorez Fransız Komünü\'nü ilan eder. Ordu ve muhafazakârlar Pétain etrafında ayaklanır: İÇ SAVAŞ.'],
        ['fra_c_industry', 'Komün Sanayisi', { addMil: 4 }, '+4 askerî fabrika.'],
        ['fra_c_army', 'Devrim Ordusu', { landAtk: 0.05, org: 0.03 }, 'Kara saldırısı +%5, moral +%3.'],
        ['fra_c_comintern', 'Komintern ile Birlik', { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'],
        ['fra_c_militia', 'İşçi Milisleri', { landDef: 0.08, forts: 1 }, 'Kara savunması +%8, sınır tahkimatı.'],
        ['fra_c_spain', 'İspanya Cumhuriyeti\'ne Yardım', { fn: ['gift', ['SPR'], { inf: 1500, art: 40 }] }, 'Cumhuriyetçi İspanya\'ya 1.500 piyade teçhizatı ve 40 top.'],
        ['fra_c_fleet', 'Kızıl Akdeniz Filosu', { navy: 0.1 }, 'Deniz +%10.'],
        ['fra_c_europe', 'Avrupa Komünü', { fn: ['goal', ['ITA', 'BEL']] }, 'İtalya ve Belçika\'ya karşı savaş gerekçesi.'],
        ['fra_c_colonies', 'Sömürgelerin Kurtuluşu', { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, siyasi güç +0,25.'],
        ['fra_c_union', 'Fransız Sovyetler Birliği', { ws: 0.15, addMil: 3 }, 'Savaş desteği +%15, +3 askerî fabrika.'],
      ]),
      ...path(4.5, [
        ['fra_m_roi', 'Action Française', ideo('neu', 'Paris Kontu Henri', { n: 'Fransız Cumhuriyeti', l: 'Léon Blum', id: 'dem', share: 0.3 }), 'Kralcılar Cumhuriyet\'i devirir; Paris Kontu Henri tahta çıkar. Cumhuriyetçiler Blum etrafında direnir: İÇ SAVAŞ.'],
        ['fra_m_army', 'Taç ve Ordu', { landDef: 0.1 }, 'Kara savunması +%10.'],
        ['fra_m_latin', 'Latin Bloku', { fn: ['mkFac', 'Latin Bloku', ['POR', 'ROM', 'YUG'], 45] }, 'Latin Bloku\'nu kur; Portekiz, Romanya ve Yugoslavya\'yı davet et.'],
        ['fra_m_empire', 'Sömürge İmparatorluğu', { addMil: 3, addCiv: 2 }, '+3 askerî, +2 sivil fabrika.'],
        ['fra_m_royal', 'Kraliyet Ordusu', { units: { inf: 6 } }, '+6 piyade tümeni.'],
        ['fra_m_navy', 'Kraliyet Donanması', { ships: { bb: 1, cr: 2 }, navy: 0.05 }, '+1 zırhlı, +2 kruvazör, deniz +%5.'],
        ['fra_m_church', 'Katolik Birlik', { stab: 0.1, pop: { neu: 0.1 } }, 'İstikrar +%10, monarşi desteği artar.'],
        ['fra_m_rhine', 'Ren Sınırı', { fn: ['goal', ['GER']] }, 'Almanya\'ya karşı savaş gerekçesi.'],
        ['fra_m_alps', 'Savoie ve Nice', { fn: ['goal', ['ITA']] }, 'İtalya\'ya karşı savaş gerekçesi.'],
        ['fra_m_bourbon', 'Bourbon Restorasyonu', { ws: 0.1, landAtk: 0.05 }, 'Savaş desteği +%10, kara saldırısı +%5.'],
      ]),
    ] },
    TUR: { block: ['tur_six_arrows'], roots: ['tur_o_caliph', 'tur_t_turan'], list: [
      ...path(1, [
        ['tur_o_caliph', 'Osmanlı Restorasyonu', ideo('neu', 'Halife Abdülmecid', { n: 'Türkiye Cumhuriyeti', l: 'İsmet İnönü', share: 0.25 }), 'Saltanat ve hilafet geri gelir; Abdülmecid anayasal monarşinin başına geçer. Cumhuriyetçi subaylar Ankara dışında direnir: İÇ SAVAŞ.'],
        ['tur_o_meclis', 'Meclis-i Mebusan', { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, günlük siyasi güç +0,25.'],
        ['tur_o_army', 'Nizam-ı Cedid', { landAtk: 0.05, units: { inf: 4 } }, 'Kara saldırısı +%5, +4 piyade tümeni.'],
        ['tur_o_caliphate', 'Hilafet Otoritesi', { ws: 0.05, stab: 0.05 }, 'Savaş desteği +%5, istikrar +%5.'],
        ['tur_o_mosul', 'Musul Vilayeti', { fn: ['demand', 'IRQ', 'mosul'] }, 'Irak\'tan Musul\'u talep et; reddederse savaş gerekçesi.'],
        ['tur_o_navy', 'Osmanlı Donanması', { ships: { cr: 2, dd: 4 }, navy: 0.1 }, '+2 kruvazör, +4 muhrip, deniz +%10.'],
        ['tur_o_aegean', 'Onikiadalar', { fn: ['demand', 'ITA', 'dodecanese'] }, 'İtalya\'dan Onikiadaları talep et.'],
        ['tur_o_arabia', 'Arap Vilayetleri', { fn: ['goal', ['IRQ', 'SAU']] }, 'Irak ve Suudi Arabistan\'a karşı savaş gerekçesi.'],
        ['tur_o_rumeli', 'Rumeli', { fn: ['goal', ['GRE', 'BUL']] }, 'Yunanistan ve Bulgaristan\'a karşı savaş gerekçesi.'],
        ['tur_o_devlet', 'Devlet-i Aliyye', { ws: 0.1, addMil: 4, addCiv: 2 }, 'Savaş desteği +%10, +4 askerî ve +2 sivil fabrika.'],
      ]),
      ...path(4.5, [
        ['tur_t_turan', 'Turan Ülküsü', ideo('fas', 'Cevat Rıfat Atilhan'), 'Milliyetçi subaylar kansız bir darbeyle iktidarı alır; hedef bütün Türk dünyasını birleştirmek.'],
        ['tur_t_youth', 'Ülkü Ocakları', { ws: 0.1, mp: 0.01 }, 'Savaş desteği +%10, insan gücü +%1.'],
        ['tur_t_rearm', 'Askerî Seferberlik', { addMil: 4 }, '+4 askerî fabrika.'],
        ['tur_t_axis', 'Mihver\'e Yaklaş', { fn: ['joinFac', 'GER'] }, 'Almanya\'nın ittifakına katıl.'],
        ['tur_t_caucasus', 'Kafkasya', { fn: ['demand', 'SOV', 'batumi'] }, 'Sovyetlerden Batum\'u talep et.'],
        ['tur_t_army', 'Turan Ordusu', { units: { inf: 6 }, landAtk: 0.03 }, '+6 piyade tümeni, kara saldırısı +%3.'],
        ['tur_t_thrace', 'Batı Trakya', { fn: ['demand', 'GRE', 'thrace'] }, 'Yunanistan\'dan Batı Trakya\'yı talep et.'],
        ['tur_t_turkestan', 'Türkistan', { fn: ['goal', ['SOV']] }, 'Sovyetlere karşı savaş gerekçesi.'],
        ['tur_t_azer', 'Güney Azerbaycan', { fn: ['goal', ['PER']] }, 'İran\'a karşı savaş gerekçesi.'],
        ['tur_t_union', 'Turan Birliği', { landAtk: 0.05, ws: 0.1 }, 'Kara saldırısı +%5, savaş desteği +%10.'],
      ]),
    ] },
    ENG: { block: ['eng_churchill', 'eng_edward'], roots: ['eng_c_strike'], list: [
      ...path(1, [
        ['eng_c_strike', 'Genel Grev', ideo('com', 'Harry Pollitt', { n: 'Britanya Krallığı', l: 'Kral VI. George', share: 0.3 }), 'Madenci grevi bütün ülkeye yayılır; Pollitt Britanya Sovyet Cumhuriyeti\'ni ilan eder. Kraliyet yanlıları ayaklanır: İÇ SAVAŞ.'],
        ['eng_c_soviets', 'Britanya Sovyetleri', { addCiv: 3, stab: 0.05 }, '+3 sivil fabrika, istikrar +%5.'],
        ['eng_c_fleet', 'Kızıl Donanma', { navy: 0.1 }, 'Deniz +%10.'],
        ['eng_c_comintern', 'Komintern ile Birlik', { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'],
        ['eng_c_industry', 'Planlı Sanayi', { addMil: 5 }, '+5 askerî fabrika.'],
        ['eng_c_air', 'Kızıl Hava Kuvvetleri', { addPlanes: 100, air: 0.05 }, '+100 avcı uçağı, hava +%5.'],
        ['eng_c_dominion', 'Dominyonlar Konseyi', { pp: 0.25, stab: 0.05 }, 'Siyasi güç +0,25, istikrar +%5.'],
        ['eng_c_peoples', 'Halkların Birliği', { pp: 0.25, stab: 0.1, ws: 0.05 }, 'Siyasi güç +0,25, istikrar +%10, savaş desteği +%5.'],
        ['eng_c_europe', 'Avrupa Devrimi', { fn: ['goal', ['BEL', 'HOL']] }, 'Belçika ve Hollanda\'ya karşı savaş gerekçesi.'],
        ['eng_c_union', 'Britanya Sosyalist Cumhuriyeti', { ws: 0.15, addMil: 3 }, 'Savaş desteği +%15, +3 askerî fabrika.'],
      ]),
    ] },
    SOV: { block: [], roots: ['sov_t_trotsky', 'sov_b_bukharin'], list: [
      ...path(1, [
        ['sov_t_trotsky', 'Troçki\'yi Geri Çağır', ideo('com', 'Lev Troçki', { n: 'Stalinist Sovyetler', l: 'Josef Stalin', share: 0.3 }), 'Troçki sürgünden döner ve Politbüro\'yu ele geçirir. Stalin yanlıları Urallarda direnir: İÇ SAVAŞ.'],
        ['sov_t_perm', 'Sürekli Devrim', { ws: 0.1 }, 'Savaş desteği +%10.'],
        ['sov_t_army', 'Tuhaçevski\'nin Ordusu', { landAtk: 0.07, org: 0.05, fn: ['general'] }, 'Kara saldırısı +%7, moral +%5, yeni komutan.'],
        ['sov_t_fourth', 'Dördüncü Enternasyonal', { pp: 0.25, pop: { com: 0.05 } }, 'Siyasi güç +0,25.'],
        ['sov_t_air', 'Kızıl Hava Filosu', { addPlanes: 150, air: 0.05 }, '+150 avcı uçağı, hava +%5.'],
        ['sov_t_industry', 'Ağır Sanayi Hamlesi', { addMil: 6 }, '+6 askerî fabrika.'],
        ['sov_t_world', 'Dünya Devrimi', { fn: ['goal', ['POL', 'FIN', 'ROM']] }, 'Polonya, Finlandiya ve Romanya\'ya karşı savaş gerekçesi.'],
        ['sov_t_baltic', 'Baltık Devrimi', { fn: ['goal', ['EST', 'LAT', 'LIT']] }, 'Baltık ülkelerine karşı savaş gerekçesi.'],
        ['sov_t_asia', 'Asya Devrimi', { fn: ['goal', ['MAN', 'JAP']] }, 'Mançukuo ve Japonya\'ya karşı savaş gerekçesi.'],
        ['sov_t_union', 'Dünya Sovyetler Birliği', { ws: 0.15, landAtk: 0.05 }, 'Savaş desteği +%15, kara saldırısı +%5.'],
      ]),
      ...path(4.5, [
        ['sov_b_bukharin', 'Buharin\'in Yolu', Object.assign(ideo('com', 'Nikolay Buharin'), { stab: 0.05 }), 'Buharin iktidara gelir; kolektifleştirme yumuşar, köylü ile barışılır.'],
        ['sov_b_nep', 'Yeni Ekonomi Politikası', { addCiv: 5 }, '+5 sivil fabrika.'],
        ['sov_b_peace', 'Barış İçinde Bir Arada Yaşam', { fn: ['pact', ['GER', 'JAP']] }, 'Almanya ve Japonya\'ya saldırmazlık paktı öner.'],
        ['sov_b_trade', 'Batı ile Ticaret', { stab: 0.1, pp: 0.25, effCap: 0.05 }, 'İstikrar +%10, siyasi güç +0,25, üretim verimi tavanı +%5.'],
        ['sov_b_coop', 'Köylü Kooperatifleri', { addCiv: 3, stab: 0.05 }, '+3 sivil fabrika, istikrar +%5.'],
        ['sov_b_front', 'Halk Cephesi Diplomasisi', { fn: ['invite', ['CZE', 'FRA']] }, 'Çekoslovakya ve Fransa\'yı ittifaka davet et.'],
        ['sov_b_lines', 'Savunma Hatları', { forts: 1, landDef: 0.05 }, 'Sınır tahkimatı, kara savunması +%5.'],
        ['sov_b_goods', 'Tüketim Malları', { stab: 0.1 }, 'İstikrar +%10.'],
        ['sov_b_reform', 'Kızıl Ordu Reformu', { org: 0.05, landDef: 0.05 }, 'Moral +%5, kara savunması +%5.'],
        ['sov_b_welfare', 'Sosyalist Refah', { stab: 0.1, pp: 0.25, addCiv: 3 }, 'İstikrar +%10, siyasi güç +0,25, +3 sivil fabrika.'],
      ]),
    ] },
    ITA: { block: ['ita_axis', 'ita_king'], roots: ['ita_c_red'], list: [
      ...path(1, [
        ['ita_c_red', 'Sosyalist İtalya', ideo('com', 'Palmiro Togliatti', { n: 'Faşist İtalya', l: 'Benito Mussolini', share: 0.35 }), 'Mussolini devrilir; Togliatti İtalyan Sosyalist Cumhuriyeti\'ni kurar. Kara gömlekliler ayaklanır: İÇ SAVAŞ.'],
        ['ita_c_partisans', 'Partizan Tugayları', { units: { inf: 4 }, org: 0.05 }, '+4 piyade tümeni, moral +%5.'],
        ['ita_c_north', 'Kuzey Fabrikaları', { addMil: 3, addCiv: 2 }, '+3 askerî, +2 sivil fabrika.'],
        ['ita_c_comintern', 'Komintern ile Birlik', { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'],
        ['ita_c_land', 'Toprak Reformu', { stab: 0.1 }, 'İstikrar +%10.'],
        ['ita_c_fleet', 'Kızıl Akdeniz', { navy: 0.1, ships: { cr: 2 } }, 'Deniz +%10, +2 kruvazör.'],
        ['ita_c_ethiopia', 'Habeşistan\'ı Bırak', { pp: 0.25, ws: 0.05 }, 'Siyasi güç +0,25, savaş desteği +%5.'],
        ['ita_c_balkan', 'Balkan Devrimi', { fn: ['goal', ['YUG', 'ALB']] }, 'Yugoslavya ve Arnavutluk\'a karşı savaş gerekçesi.'],
        ['ita_c_danube', 'Tuna Devrimi', { fn: ['goal', ['AUS', 'HUN']] }, 'Avusturya ve Macaristan\'a karşı savaş gerekçesi.'],
        ['ita_c_union', 'İtalyan Sovyetler Birliği', { ws: 0.15, addMil: 3 }, 'Savaş desteği +%15, +3 askerî fabrika.'],
      ]),
    ] },
    JAP: { block: ['jap_china'], roots: ['jap_d_civil'], list: [
      ...path(1, [
        ['jap_d_civil', 'Sivil Hükümet', ideo('dem', 'Saionji Kinmoçi', { n: 'Kwantung Ordusu', l: 'Hideki Tojo', share: 0.25 }), 'Saionji\'nin sivil kabinesi orduyu denetim altına almak ister; militarist subaylar ayaklanır: İÇ SAVAŞ.'],
        ['jap_d_trade', 'Serbest Ticaret', { addCiv: 4 }, '+4 sivil fabrika.'],
        ['jap_d_west', 'Batı ile Uzlaşma', { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, siyasi güç +0,25.'],
        ['jap_d_navy', 'Savunma Donanması', { navy: 0.1, landDef: 0.05 }, 'Deniz +%10, kara savunması +%5.'],
        ['jap_d_bank', 'Asya Kalkınma Bankası', { addCiv: 3, addInfra: 3 }, '+3 sivil fabrika, 3 bölgede altyapı.'],
        ['jap_d_control', 'Ordunun Sivil Denetimi', { stab: 0.1, org: 0.03 }, 'İstikrar +%10, moral +%3.'],
        ['jap_d_treaty', 'Washington Antlaşmasını Yenile', { fn: ['pact', ['USA', 'ENG']] }, 'ABD ve İngiltere\'ye saldırmazlık paktı öner.'],
        ['jap_d_china', 'Çin ile Barış', { fn: ['pact', ['CHI']] }, 'Çin\'e saldırmazlık paktı öner.'],
        ['jap_d_bloc', 'Pasifik Ticaret Bloku', { fn: ['invite', ['SIA', 'MAN']] }, 'Siyam ve Mançukuo\'yu ittifaka davet et.'],
        ['jap_d_taisho', 'Taisho Demokrasisinin Dönüşü', { stab: 0.15, addCiv: 4 }, 'İstikrar +%15, +4 sivil fabrika.'],
      ]),
    ] },
  };
  for (const [tag, def] of Object.entries(A)) {
    const nat = g.FOCUS_NATIONAL[tag]; if (!nat) continue;
    const base = Math.max(...nat.map((f) => f.x)) + 2;
    const ids = new Set(nat.map((f) => f.id));
    for (const f of def.list) { f.x = base + f.rx; delete f.rx; }
    // kökler: tarihî siyasi yol ve diğer alternatif köklerle karşılıklı dışlama
    for (const r of def.roots) {
      const root = def.list.find((f) => f.id === r);
      root.excl = def.roots.filter((x) => x !== r).concat(def.block.filter((b) => ids.has(b)));
    }
    for (const b of def.block) { const f = nat.find((x) => x.id === b); if (f) f.excl = (f.excl || []).concat(def.roots); }
    nat.push(...def.list);
  }
})(window);
