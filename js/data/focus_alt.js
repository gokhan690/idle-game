// Alternatif tarih dalları (HOI4): büyük ülkelerin ulusal odak ağaçlarına eklenir.
// Kök odak tarihî siyasi yolla ve aynı ülkenin diğer alternatif kökleriyle birbirini dışlar.
// Yapay zekâ bu dalları almaz (ai: 0); tarihî akış korunur, alternatifleri yalnızca oyuncu seçer.
(function (g) {
  // rx/ry: dalın kendi içindeki konumu; ülke ağacının sağına yerleştirilir
  const F = (id, n, rx, ry, pre, fx, d, extra) => Object.assign({ id, n, rx, y: ry, pre: pre || [], fx: fx || {}, d: d || '', alt: 1, ai: 0 }, extra || {});
  const ideo = (i, leader) => ({ fn: ['ideo', i, leader] });
  const A = {
    GER: { block: ['ger_axis'], roots: ['ger_k_kaiser', 'ger_r_red'], list: [
      // Kayzer'in dönüşü
      F('ger_k_kaiser', 'Kayzer\'i Geri Çağır', 0.5, 0, [], Object.assign(ideo('neu', 'Kayzer II. Wilhelm'), { stab: 0.05 }), 'Ordu Hitler\'i devirir; II. Wilhelm Doorn\'dan dönerek tahta çıkar. Nazi yolu kapanır.'),
      F('ger_k_junker', 'Junker Subay Kolordusu', 0, 1, ['ger_k_kaiser'], { landDef: 0.05, org: 0.05 }, 'Kara savunması +%5, moral +%5.'),
      F('ger_k_reichstag', 'İmparatorluk Meclisi', 1, 1, ['ger_k_kaiser'], { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, günlük siyasi güç +0,25.'),
      F('ger_k_mittel', 'Mitteleuropa', 0.5, 2, ['ger_k_junker', 'ger_k_reichstag'], { fn: ['mkFac', 'Orta Avrupa Birliği', ['AUS', 'HUN', 'BUL', 'ROM'], 45] }, 'Orta Avrupa Birliği\'ni kur; Avusturya, Macaristan, Bulgaristan ve Romanya\'yı davet et.'),
      F('ger_k_hochsee', 'Açık Deniz Filosu', 0, 3, ['ger_k_mittel'], { ships: { bb: 2, cr: 3 }, navy: 0.1 }, '+2 zırhlı, +3 kruvazör, deniz +%10.'),
      F('ger_k_1914', '1914 Sınırları', 1, 3, ['ger_k_mittel'], { fn: ['goal', ['POL', 'FRA']] }, 'Polonya ve Fransa\'ya karşı savaş gerekçesi.'),
      F('ger_k_reich', 'Kaiserreich', 0.5, 4, ['ger_k_hochsee', 'ger_k_1914'], { ws: 0.1, landAtk: 0.05, addMil: 3 }, 'Savaş desteği +%10, kara saldırısı +%5, +3 askerî fabrika.'),
      // Kızıl Almanya
      F('ger_r_red', 'Spartakist Ayaklanma', 3.5, 0, [], ideo('com', 'Ernst Thälmann'), 'KPD sokakları ele geçirir; Ernst Thälmann Alman Sovyet Cumhuriyeti\'ni ilan eder.'),
      F('ger_r_council', 'İşçi Konseyleri', 3, 1, ['ger_r_red'], { addCiv: 3, stab: 0.05 }, '+3 sivil fabrika, istikrar +%5.'),
      F('ger_r_army', 'Kızıl Reichswehr', 4, 1, ['ger_r_red'], { landAtk: 0.05, units: { inf: 4 } }, 'Kara saldırısı +%5, +4 piyade tümeni.'),
      F('ger_r_comintern', 'Komintern\'e Katıl', 3.5, 2, ['ger_r_council', 'ger_r_army'], { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'),
      F('ger_r_export', 'Devrimi İhraç Et', 3, 3, ['ger_r_comintern'], { fn: ['goal', ['AUS', 'CZE', 'POL']] }, 'Avusturya, Çekoslovakya ve Polonya\'ya karşı savaş gerekçesi.'),
      F('ger_r_planning', 'Merkezî Planlama', 4, 3, ['ger_r_comintern'], { addMil: 4, effCap: 0.05 }, '+4 askerî fabrika, üretim verimi tavanı +%5.'),
      F('ger_r_world', 'Avrupa Sovyetler Birliği', 3.5, 4, ['ger_r_export', 'ger_r_planning'], { ws: 0.15, org: 0.05, pop: { com: 0.1 } }, 'Savaş desteği +%15, moral +%5.'),
    ] },
    USA: { block: ['usa_neutral'], roots: ['usa_f_long', 'usa_s_red'], list: [
      F('usa_f_long', 'Huey Long Başkan', 0.5, 0, [], ideo('fas', 'Huey Long'), '"Herkes Bir Kral" diyen Huey Long Beyaz Saray\'a girer. Amerika yalnızcılığı bırakır.'),
      F('usa_f_share', 'Servetimizi Paylaşalım', 0, 1, ['usa_f_long'], { stab: 0.1, addCiv: 4 }, 'İstikrar +%10, +4 sivil fabrika.'),
      F('usa_f_rearm', 'Amerikan Silahlanması', 1, 1, ['usa_f_long'], { addMil: 8 }, '+8 askerî fabrika.'),
      F('usa_f_monroe', 'Monroe Doktrini', 0.5, 2, ['usa_f_share', 'usa_f_rearm'], { fn: ['mkFac', 'Amerika Paktı', ['MEX', 'BRA'], 45] }, 'Amerika Paktı\'nı kur; Meksika ve Brezilya\'yı davet et.'),
      F('usa_f_ocean', 'İki Okyanus Hâkimiyeti', 0, 3, ['usa_f_monroe'], { ships: { cv: 2, bb: 2 }, navy: 0.1 }, '+2 uçak gemisi, +2 zırhlı, deniz +%10.'),
      F('usa_f_canada', 'Kanada Meselesi', 1, 3, ['usa_f_monroe'], { fn: ['goal', ['CAN']] }, 'Kanada\'ya karşı savaş gerekçesi.'),
      F('usa_f_order', 'Yeni Amerikan Düzeni', 0.5, 4, ['usa_f_ocean', 'usa_f_canada'], { ws: 0.15, landAtk: 0.05 }, 'Savaş desteği +%15, kara saldırısı +%5.'),
      F('usa_s_red', 'Sosyalist Amerika', 3, 0, [], ideo('com', 'Earl Browder'), 'Büyük Buhran devrime döner; Earl Browder Amerikan Sosyalist Cumhuriyeti\'ni ilan eder.'),
      F('usa_s_unions', 'Sendikalar Devleti', 2.5, 1, ['usa_s_red'], { addCiv: 5 }, '+5 sivil fabrika.'),
      F('usa_s_army', 'Halk Ordusu', 3.5, 1, ['usa_s_red'], { units: { inf: 6 }, org: 0.05 }, '+6 piyade tümeni, moral +%5.'),
      F('usa_s_intl', 'Enternasyonal ile Birlik', 3, 2, ['usa_s_unions', 'usa_s_army'], { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'),
      F('usa_s_west', 'Batı Yarımküre Devrimi', 3, 3, ['usa_s_intl'], { fn: ['goal', ['MEX', 'CAN']], ws: 0.1 }, 'Meksika ve Kanada\'ya karşı savaş gerekçesi, savaş desteği +%10.'),
    ] },
    FRA: { block: ['fra_unity'], roots: ['fra_c_commune', 'fra_m_roi'], list: [
      F('fra_c_commune', 'Halk Cephesi Devrimi', 0.5, 0, [], ideo('com', 'Maurice Thorez'), 'Genel grev devrime döner; Maurice Thorez Fransız Komünü\'nü ilan eder.'),
      F('fra_c_industry', 'Komün Sanayisi', 0, 1, ['fra_c_commune'], { addMil: 4 }, '+4 askerî fabrika.'),
      F('fra_c_army', 'Devrim Ordusu', 1, 1, ['fra_c_commune'], { landAtk: 0.05, org: 0.03 }, 'Kara saldırısı +%5, moral +%3.'),
      F('fra_c_comintern', 'Komintern ile Birlik', 0.5, 2, ['fra_c_industry', 'fra_c_army'], { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'),
      F('fra_c_spain', 'İspanya Cumhuriyeti\'ne Yardım', 0, 3, ['fra_c_comintern'], { fn: ['gift', ['SPR'], { inf: 1500, art: 40 }] }, 'Cumhuriyetçi İspanya\'ya 1.500 piyade teçhizatı ve 40 top.'),
      F('fra_c_europe', 'Avrupa Komünü', 1, 3, ['fra_c_comintern'], { fn: ['goal', ['ITA', 'BEL']], ws: 0.1 }, 'İtalya ve Belçika\'ya karşı savaş gerekçesi, savaş desteği +%10.'),
      F('fra_m_roi', 'Action Française', 3, 0, [], ideo('neu', 'Paris Kontu Henri'), 'Kralcılar Cumhuriyet\'i devirir; Paris Kontu Henri Fransa tahtına çıkar.'),
      F('fra_m_army', 'Taç ve Ordu', 2.5, 1, ['fra_m_roi'], { landDef: 0.1 }, 'Kara savunması +%10.'),
      F('fra_m_latin', 'Latin Bloku', 3.5, 1, ['fra_m_roi'], { fn: ['mkFac', 'Latin Bloku', ['POR', 'ROM', 'YUG'], 45] }, 'Latin Bloku\'nu kur; Portekiz, Romanya ve Yugoslavya\'yı davet et.'),
      F('fra_m_empire', 'Sömürge İmparatorluğu', 3, 2, ['fra_m_army', 'fra_m_latin'], { addMil: 3, addCiv: 2 }, '+3 askerî, +2 sivil fabrika.'),
      F('fra_m_rhine', 'Ren Sınırı', 3, 3, ['fra_m_empire'], { fn: ['goal', ['GER']], ws: 0.1 }, 'Almanya\'ya karşı savaş gerekçesi, savaş desteği +%10.'),
    ] },
    TUR: { block: ['tur_six_arrows'], roots: ['tur_o_caliph', 'tur_t_turan'], list: [
      F('tur_o_caliph', 'Osmanlı Restorasyonu', 0.5, 0, [], Object.assign(ideo('neu', 'Halife Abdülmecid'), { stab: 0.05 }), 'Saltanat ve hilafet geri gelir; Abdülmecid anayasal monarşinin başına geçer.'),
      F('tur_o_sultan', 'Meclis-i Mebusan', 0, 1, ['tur_o_caliph'], { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, günlük siyasi güç +0,25.'),
      F('tur_o_army', 'Nizam-ı Cedid', 1, 1, ['tur_o_caliph'], { landAtk: 0.05, units: { inf: 4 } }, 'Kara saldırısı +%5, +4 piyade tümeni.'),
      F('tur_o_mosul', 'Musul Vilayeti', 0, 2, ['tur_o_sultan'], { fn: ['demand', 'IRQ', 'mosul'] }, 'Irak\'tan Musul\'u talep et; reddederse savaş gerekçesi.'),
      F('tur_o_aegean', 'Onikiadalar', 1, 2, ['tur_o_army'], { fn: ['demand', 'ITA', 'dodecanese'] }, 'İtalya\'dan Onikiadaları talep et.'),
      F('tur_o_arabia', 'Arap Vilayetleri', 0.5, 3, ['tur_o_mosul', 'tur_o_aegean'], { fn: ['goal', ['IRQ', 'SAU']] }, 'Irak ve Suudi Arabistan\'a karşı savaş gerekçesi.'),
      F('tur_o_devlet', 'Devlet-i Aliyye', 0.5, 4, ['tur_o_arabia'], { ws: 0.1, addMil: 4, addCiv: 2 }, 'Savaş desteği +%10, +4 askerî ve +2 sivil fabrika.'),
      F('tur_t_turan', 'Turan Ülküsü', 3, 0, [], ideo('fas', 'Cevat Rıfat Atilhan'), 'Milliyetçi subaylar iktidarı alır; hedef bütün Türk dünyasını birleştirmek.'),
      F('tur_t_youth', 'Ülkü Ocakları', 2.5, 1, ['tur_t_turan'], { ws: 0.1, mp: 0.01 }, 'Savaş desteği +%10, insan gücü +%1.'),
      F('tur_t_rearm', 'Askerî Seferberlik', 3.5, 1, ['tur_t_turan'], { addMil: 4 }, '+4 askerî fabrika.'),
      F('tur_t_axis', 'Mihver\'e Yaklaş', 3, 2, ['tur_t_youth', 'tur_t_rearm'], { fn: ['joinFac', 'GER'] }, 'Almanya\'nın ittifakına katıl.'),
      F('tur_t_caucasus', 'Kafkasya', 2.5, 3, ['tur_t_axis'], { fn: ['demand', 'SOV', 'batumi'] }, 'Sovyetlerden Batum\'u talep et.'),
      F('tur_t_thrace', 'Batı Trakya', 3.5, 3, ['tur_t_axis'], { fn: ['demand', 'GRE', 'thrace'] }, 'Yunanistan\'dan Batı Trakya\'yı talep et.'),
      F('tur_t_union', 'Turan Birliği', 3, 4, ['tur_t_caucasus', 'tur_t_thrace'], { fn: ['goal', ['SOV', 'PER']], landAtk: 0.05 }, 'Sovyetler ve İran\'a karşı savaş gerekçesi, kara saldırısı +%5.'),
    ] },
    ENG: { block: ['eng_churchill', 'eng_edward'], roots: ['eng_c_strike'], list: [
      F('eng_c_strike', 'Genel Grev', 0.5, 0, [], ideo('com', 'Harry Pollitt'), 'Madenci grevi bütün ülkeye yayılır; Harry Pollitt Britanya Sovyet Cumhuriyeti\'ni ilan eder.'),
      F('eng_c_soviets', 'Britanya Sovyetleri', 0, 1, ['eng_c_strike'], { addCiv: 3, stab: 0.05 }, '+3 sivil fabrika, istikrar +%5.'),
      F('eng_c_fleet', 'Kızıl Donanma', 1, 1, ['eng_c_strike'], { navy: 0.1 }, 'Deniz +%10.'),
      F('eng_c_comintern', 'Komintern ile Birlik', 0.5, 2, ['eng_c_soviets', 'eng_c_fleet'], { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'),
      F('eng_c_empire', 'Halkların Birliği', 0.5, 3, ['eng_c_comintern'], { pp: 0.5, stab: 0.1, ws: 0.05 }, 'Günlük siyasi güç +0,5, istikrar +%10, savaş desteği +%5.'),
    ] },
    SOV: { block: [], roots: ['sov_t_trotsky', 'sov_b_bukharin'], list: [
      F('sov_t_trotsky', 'Troçki\'yi Geri Çağır', 0.5, 0, [], { fn: ['leaderName', 'Lev Troçki'], stab: -0.05 }, 'Stalin devrilir; Troçki sürgünden döner. Hedef: sürekli devrim.'),
      F('sov_t_perm', 'Sürekli Devrim', 0, 1, ['sov_t_trotsky'], { ws: 0.1 }, 'Savaş desteği +%10.'),
      F('sov_t_army', 'Tuhaçevski\'nin Ordusu', 1, 1, ['sov_t_trotsky'], { landAtk: 0.07, org: 0.05, fn: ['general'] }, 'Kara saldırısı +%7, moral +%5, yeni komutan.'),
      F('sov_t_world', 'Dünya Devrimi', 0.5, 2, ['sov_t_perm', 'sov_t_army'], { fn: ['goal', ['POL', 'FIN', 'ROM']] }, 'Polonya, Finlandiya ve Romanya\'ya karşı savaş gerekçesi.'),
      F('sov_b_bukharin', 'Buharin\'in Yolu', 3, 0, [], { fn: ['leaderName', 'Nikolay Buharin'], stab: 0.05 }, 'Buharin iktidara gelir; kolektifleştirme yumuşar, köylü ile barışılır.'),
      F('sov_b_nep', 'Yeni Ekonomi Politikası', 2.5, 1, ['sov_b_bukharin'], { addCiv: 5 }, '+5 sivil fabrika.'),
      F('sov_b_peace', 'Barış İçinde Bir Arada Yaşam', 3.5, 1, ['sov_b_bukharin'], { fn: ['pact', ['GER', 'JAP']] }, 'Almanya ve Japonya\'ya saldırmazlık paktı öner.'),
      F('sov_b_trade', 'Batı ile Ticaret', 3, 2, ['sov_b_nep', 'sov_b_peace'], { stab: 0.1, pp: 0.25, effCap: 0.05 }, 'İstikrar +%10, siyasi güç +0,25, üretim verimi tavanı +%5.'),
    ] },
    ITA: { block: ['ita_axis', 'ita_king'], roots: ['ita_c_red'], list: [
      F('ita_c_red', 'Sosyalist İtalya', 0.5, 0, [], ideo('com', 'Palmiro Togliatti'), 'Mussolini devrilir; Palmiro Togliatti İtalyan Sosyalist Cumhuriyeti\'ni kurar.'),
      F('ita_c_partisans', 'Partizan Tugayları', 0, 1, ['ita_c_red'], { units: { inf: 4 }, org: 0.05 }, '+4 piyade tümeni, moral +%5.'),
      F('ita_c_north', 'Kuzey Fabrikaları', 1, 1, ['ita_c_red'], { addMil: 3, addCiv: 2 }, '+3 askerî, +2 sivil fabrika.'),
      F('ita_c_comintern', 'Komintern ile Birlik', 0.5, 2, ['ita_c_partisans', 'ita_c_north'], { fn: ['joinFac', 'SOV'] }, 'Sovyetler Birliği\'nin ittifakına katıl.'),
      F('ita_c_balkan', 'Balkan Devrimi', 0.5, 3, ['ita_c_comintern'], { fn: ['goal', ['YUG', 'ALB']] }, 'Yugoslavya ve Arnavutluk\'a karşı savaş gerekçesi.'),
    ] },
    JAP: { block: ['jap_china'], roots: ['jap_d_civil'], list: [
      F('jap_d_civil', 'Sivil Hükümet', 0.5, 0, [], ideo('dem', 'Saionji Kinmoçi'), 'Ordunun darbesi bastırılır; Saionji\'nin sivil kabinesi orduyu denetim altına alır.'),
      F('jap_d_trade', 'Serbest Ticaret', 0, 1, ['jap_d_civil'], { addCiv: 4 }, '+4 sivil fabrika.'),
      F('jap_d_west', 'Batı ile Uzlaşma', 1, 1, ['jap_d_civil'], { stab: 0.1, pp: 0.25 }, 'İstikrar +%10, siyasi güç +0,25.'),
      F('jap_d_navy', 'Savunma Donanması', 0.5, 2, ['jap_d_trade', 'jap_d_west'], { navy: 0.1, landDef: 0.05 }, 'Deniz +%10, kara savunması +%5.'),
      F('jap_d_bank', 'Asya Kalkınma Bankası', 0.5, 3, ['jap_d_navy'], { addCiv: 3, addInfra: 3 }, '+3 sivil fabrika, 3 bölgede altyapı.'),
    ] },
  };
  for (const [tag, def] of Object.entries(A)) {
    const nat = g.FOCUS_NATIONAL[tag]; if (!nat) continue;
    const base = Math.max(...nat.map((f) => f.x)) + 1.5;
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
