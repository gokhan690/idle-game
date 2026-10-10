// Alternatif tarih olay zincirleri (HOI4): alternatif yola giren ülkenin kapanan tarihî olaylarının yerini alır.
// Olaylar alternatif odaklar tamamlanınca (gecikmeli) gelir; oyuncu seçer, YZ ilk seçeneği alır.
// İç savaş bitince kazanan tarafa "İç Savaşın Sonu" olayı gelir.
(function (g) {
  const G = g.G;
  const C = (t) => G.st.C[t];
  const alive = (t) => !!C(t)?.alive;
  const ai = (t) => t !== G.st.player;
  const free = (t) => alive(t) && ai(t);
  const sp = (c, id) => { if (!c.spirits.includes(id)) { c.spirits.push(id); G.recomputeMods(c); } };
  const tsp = (c, id, d) => G.timedSpirit(c.tag, id, d);
  const rmsp = (c, id) => { if (c.spirits.includes(id)) { c.spirits = c.spirits.filter((s) => s !== id); G.recomputeMods(c); } };
  const fac = (c, civ, mil) => { if (civ) G.addFactories(c.tag, 'civ', civ); if (mil) G.addFactories(c.tag, 'mil', mil); G.needSummary = 1; };
  const units = (c, n, type = 'inf') => { const st = G.st; for (let k = 0; k < n; k++) st.units.push(G.makeUnit(c.tag, type, c.cap, 1)); G.rebuildUnitIndex(); };
  const stock = (c, e, n) => { c.stock[e] = (c.stock[e] || 0) + n; };
  const rel = (a, b, v) => { const st = G.st; st.rel = st.rel || {}; for (const [x, y] of [[a, b], [b, a]]) st.rel[x + '>' + y] = Math.max(-100, Math.min(100, (st.rel[x + '>' + y] || 0) + v)); };
  const pop = (t, k, v) => { if (alive(t)) G.addPop(C(t), k, v); };
  const goal = (c, list) => G.FX.goal(c, list.filter(alive));
  const invite = (c, list) => G.FX.invite(c, list.filter(alive));
  const flip = (t, ideo) => { if (free(t) && C(t).ideo !== ideo && !C(t).enemies.length) G.setIdeology(C(t), ideo); };
  const tension = (v) => { const st = G.st; st.tension = Math.max(0, Math.min(100, st.tension + v)); };
  const log = (c, m, k = 'major') => G.log(m, [c.tag], k);

  // olaylara özel ulusal ruhlar
  Object.assign(g.SPIRITS, {
    alt_kaiser: { n: 'İkinci Reich', h: 'Hohenzollern tahtı yeniden kuruldu; Prusya disiplini ve imparatorluk sanayisi tek elde.', fx: { stab: 0.1, landAtk: 0.05, factory: 0.05 } },
    alt_redger: { n: 'Avrupa\'nın Kızıl Kalbi', h: 'Alman işçi sınıfı kıtanın devrim merkezi.', fx: { ws: 0.1, org: 0.05, factory: 0.05 } },
    alt_longusa: { n: 'Herkes Bir Kral', h: 'Huey Long\'un popülist düzeni: servet paylaşılıyor, eleştiri susturuluyor.', fx: { stab: 0.05, ws: 0.1, factory: 0.05 } },
    alt_redusa: { n: 'Amerikan Sosyalist Birliği', h: 'Kıtanın sanayisi halkın elinde, plan komiteleri yönetiyor.', fx: { factory: 0.1, mp: 0.5 } },
    alt_commune: { n: 'Fransız Komünü', h: '1871\'in mirası: işçi konseyleri ve yurttaş orduları.', fx: { ws: 0.1, org: 0.05, landDef: 0.05 } },
    alt_bourbon: { n: 'Zambaklar Tahtı', h: 'Kral, ordu ve kilise ittifakı Fransa\'yı yönetiyor.', fx: { stab: 0.15, landDef: 0.05 } },
    alt_ottoman: { n: 'Devlet-i Aliyye', h: 'Osmanlı hanedanı ve Hilafet yeniden İstanbul\'da.', fx: { stab: 0.1, mp: 0.5, landDef: 0.05 } },
    alt_turan: { n: 'Turan Ülküsü', h: 'Bütün Türklerin birliği hayali milleti seferber ediyor.', fx: { ws: 0.15, landAtk: 0.05 } },
    alt_redbrit: { n: 'Britanya Sosyalist Cumhuriyeti', h: 'Kraliyet yok; donanma ve fabrikalar halk komitelerinde.', fx: { navy: 0.1, factory: 0.05, stab: 0.05 } },
    alt_trotsky: { n: 'Sürekli Devrim', h: 'Troçki\'nin Kızıl Ordusu devrimi sınırların ötesine taşımaya hazır.', fx: { landAtk: 0.1, ws: 0.1, stab: -0.05 } },
    alt_bukharin: { n: 'Sosyalist Refah', h: 'Köylü ve işçi barışı; tüketim malları ve istikrar.', fx: { stab: 0.15, factory: 0.05, research: 0.05 } },
    alt_redita: { n: 'İtalyan Sovyetleri', h: 'Kuzeyin fabrikaları ve güneyin toprak komiteleri birleşti.', fx: { factory: 0.05, org: 0.05, ws: 0.05 } },
    alt_taisho: { n: 'Taisho Demokrasisi', h: 'Sivil hükümet orduyu denetliyor; ticaret ve diplomasi öncelikli.', fx: { stab: 0.1, factory: 0.1, research: 0.05 } },
    alt_pol: { n: 'Mocarstwo', h: 'Polonya Baltık\'tan Karadeniz\'e uzanan bir büyük güç.', fx: { ws: 0.1, landDef: 0.05, mp: 0.5 } },
    alt_hun: { n: 'İkili Monarşi', h: 'Habsburg tacı altında Tuna halkları yeniden bir arada.', fx: { stab: 0.1, landDef: 0.05, factory: 0.05 } },
    alt_rom: { n: 'Köylü Demokrasisi', h: 'Toprak reformu köylüleri rejimin en sadık destekçisi yaptı.', fx: { stab: 0.15, mp: 0.5 } },
    alt_gre: { n: 'Megali İdea', h: 'İki kıta ve beş denizin Yunanistan\'ı.', fx: { ws: 0.1, navy: 0.1 } },
    alt_yug: { n: 'Balkan Federasyonu', h: 'Partizan ordusu bütün Güney Slavları tek bayrak altında topluyor.', fx: { org: 0.1, landDef: 0.1 } },
    alt_chi: { n: 'Doğu Asya Yeni Düzeni', h: 'Nanking ve Tokyo ortak refah alanında birleşti.', fx: { stab: 0.1, factory: 0.1 } },
    alt_bul: { n: 'San Stefano Sınırları', h: 'Bulgar ulusu 1878\'in vaadine kavuştu.', fx: { ws: 0.1, landAtk: 0.05 } },
    alt_swe: { n: 'Kuzey İmparatorluğu', h: 'Kalmar\'ın mirası: İskandinavya tek bir güç.', fx: { stab: 0.1, factory: 0.05, landDef: 0.05 } },
    alt_bra: { n: 'Sigma Devleti', h: 'Entegralist düzen Brezilya\'yı kıtanın hâkimi yapmak istiyor.', fx: { ws: 0.1, mp: 0.5, factory: 0.05 } },
    alt_purge: { n: 'Devrimci Tasfiye', h: 'Eski rejimin subayları ordudan uzaklaştırıldı.', fx: { stab: 0.05, org: -0.1, landAtk: -0.05 } },
    alt_mutiny: { n: 'Huzursuz Subaylar', h: 'Ordu yeni rejime tam güvenmiyor.', fx: { org: -0.05, stab: -0.05 } },
    alt_marketboom: { n: 'Pazar Canlanması', h: 'Serbest pazar ve dış krediler ekonomiyi canlandırıyor.', fx: { factory: 0.1, construct: 0.1 } },
    alt_militia: { n: 'Halk Milisleri', h: 'Silahlı işçi milisleri her mahallede.', fx: { mp: 0.5, landDef: 0.1, org: -0.05 } },
    alt_crusade: { n: 'Kutsal Dava', h: 'Kilise ve taht rejimin arkasında.', fx: { stab: 0.05, ws: 0.1 } },
    alt_reconcile: { n: 'Ulusal Uzlaşma', h: 'İç savaşın yaraları sarılıyor; eski düşmanlar affedildi.', fx: { stab: 0.1, factory: 0.05 } },
    alt_reckoning: { n: 'Hesaplaşma', h: 'İç savaşın kaybedenleri yargılanıyor; korku ve disiplin hâkim.', fx: { ws: 0.1, stab: -0.05, mp: 0.5 } },
    alt_ruins: { n: 'İç Savaşın Yıkıntıları', h: 'Fabrikalar ve köprüler harap; yeniden inşa gerekiyor.', fx: { factory: -0.1, construct: 0.1 } },
  });

  // [kimlik, ülke, tetikleyen odak, gecikme (gün), başlık, metin, sanat, [[seçenek, etki, açıklama], ...]]
  const E = [
    // ---------- Almanya: Kayzer ----------
    ['k_hitler', 'GER', 'ger_k_kaiser', 15, 'Hitler\'in Akıbeti', 'Ordu Reichskanzlei\'yi kuşattı; Hitler ve yakın çevresi tutuklandı. Generaller ne yapılacağını soruyor.', 'politics', [
      ['Sürgüne gönder', (c) => { c.stabX += 0.05; pop('GER', 'fas', -0.08); log(c, 'Hitler Arjantin\'e sürgüne gönderildi.'); }, 'İstikrar +%5, faşist destek −%8'],
      ['Leipzig\'de yargıla', (c) => { c.wsX += 0.05; c.stabX -= 0.03; pop('GER', 'fas', -0.15); log(c, 'Hitler vatana ihanetten yargılanıyor.'); }, 'Savaş desteği +%5, istikrar −%3, faşist destek −%15']]],
    ['k_crown', 'GER', 'ger_k_reichstag', 20, 'Veliaht Prens', 'Yaşlı Kayzer günlük işleri yürütmekte zorlanıyor. Veliaht Prens Wilhelm naip olmaya hazır.', 'politics', [
      ['Veliahtı naip yap', (c) => { c.leader = 'Veliaht Prens Wilhelm'; c.pp += 60; log(c, 'Veliaht Prens Wilhelm naip oldu.'); }, '+60 siyasi güç, yeni lider'],
      ['Kayzer yönetmeye devam etsin', (c) => { c.stabX += 0.05; }, 'İstikrar +%5']]],
    ['k_habsburg', 'GER', 'ger_k_mittel', 30, 'Habsburg Sorunu', 'Viyana\'daki monarşistler Habsburg tahtının yeniden kurulmasını istiyor. Berlin\'in onayı belirleyici olacak.', 'diplomacy', [
      ['Habsburg Avusturya\'sını destekle', (c) => { if (free('AUS')) { flip('AUS', 'neu'); C('AUS').leader = 'Otto von Habsburg'; invite(c, ['AUS', 'HUN']); } rel('GER', 'AUS', 30); log(c, 'Otto von Habsburg Viyana\'da tahta çıktı; Avusturya Orta Avrupa Birliği\'ne çağrıldı.'); }, 'Avusturya monarşi olur ve ittifaka çağrılır'],
      ['Avusturya Reich\'a katılsın', (c) => { if (free('AUS') && !G.atWar('GER', 'AUS')) { G.annex('GER', 'AUS'); tension(6); log(c, 'Avusturya, imparatorluğa barışla katıldı.'); } }, 'Avusturya ilhak edilir, dünya gerginliği +6']]],
    ['k_britain', 'GER', 'ger_k_hochsee', 15, 'Londra Tedirgin', 'Açık Deniz Filosu\'nun yeniden doğuşu Londra\'yı 1914\'ü hatırlatıyor. İngiliz büyükelçi bir deniz antlaşması öneriyor.', 'navy', [
      ['Deniz antlaşmasını imzala', (c) => { rel('GER', 'ENG', 30); if (alive('ENG') && ai('ENG')) G.proposePact('GER', 'ENG'); c.stabX += 0.03; }, 'İngiltere ile ilişkiler +30, saldırmazlık paktı'],
      ['Filo yarışı sürsün', (c) => { c.ships.bb = (c.ships.bb || 0) + 1; c.ships.cr = (c.ships.cr || 0) + 2; rel('GER', 'ENG', -30); tension(4); }, '+1 zırhlı, +2 kruvazör; İngiltere ilişkisi −30']]],
    ['k_reich', 'GER', 'ger_k_reich', 5, 'Kaiserreich', 'Versay\'ın zincirleri kırıldı. Hohenzollern bayrağı Berlin\'de yeniden dalgalanıyor; imparatorluk Avrupa\'nın merkezinde.', 'surrender', [
      ['Yaşasın Kayzer!', (c) => sp(c, 'alt_kaiser'), 'Ulusal ruh: İkinci Reich (istikrar +%10, kara saldırısı +%5, fabrika +%5)']]],
    // ---------- Almanya: Spartakist ----------
    ['r_officers', 'GER', 'ger_r_council', 10, 'Reichswehr Subayları', 'Eski imparatorluk subaylarının çoğu kışlalarda bekliyor. Konseyler onlara güvenmiyor.', 'politics', [
      ['Kızıl komiserler ata', (c) => { c.stabX += 0.05; tsp(c, 'alt_mutiny', 240); }, 'İstikrar +%5; 8 ay huzursuz subaylar'],
      ['Subayları tasfiye et', (c) => { tsp(c, 'alt_purge', 365); c.wsX += 0.05; }, 'Savaş desteği +%5; 1 yıl devrimci tasfiye (moral −%10)']]],
    ['r_moscow', 'GER', 'ger_r_comintern', 20, 'Moskova ile İlişkiler', 'Stalin Alman yoldaşları Komintern disiplinine çağırıyor; ama devrimin kalbi artık Berlin\'de atıyor.', 'diplomacy', [
      ['Stalin\'e bağlı kal', (c) => { if (alive('SOV')) { G.lend('SOV', 'GER', 'inf', 3000); G.lend('SOV', 'GER', 'art', 60); } rel('GER', 'SOV', 25); }, 'Sovyet teçhizat yardımı'],
      ['Komintern\'in liderliğini iste', (c) => { c.pp += 100; rel('GER', 'SOV', -25); pop('POL', 'com', 0.05); pop('CZE', 'com', 0.08); }, '+100 siyasi güç, komşu ülkelerde komünist destek; Sovyet ilişkisi −25']]],
    ['r_poland', 'GER', 'ger_r_export', 25, 'Varşova\'da Grev', 'Polonya\'da işçiler genel greve gitti. Polonya Komünist Partisi Berlin\'den yardım istiyor.', 'war', [
      ['Polonyalı yoldaşları destekle', (c) => { pop('POL', 'com', 0.2); if (alive('POL')) C('POL').stabX -= 0.1; }, 'Polonya\'da komünist destek +%20, istikrar −%10'],
      ['Kızıl Ordu sınırı geçsin', (c) => { if (alive('POL') && !G.atWar('GER', 'POL')) G.declareWar('GER', 'POL'); }, 'Polonya\'ya savaş ilan et']]],
    ['r_world', 'GER', 'ger_r_world', 5, 'Avrupa Sovyetler Birliği', 'Berlin\'deki Kongre, kıtanın bütün işçi cumhuriyetlerini tek bir birliğe çağırdı.', 'surrender', [
      ['Bütün ülkelerin işçileri, birleşin!', (c) => sp(c, 'alt_redger'), 'Ulusal ruh: Avrupa\'nın Kızıl Kalbi']]],
    // ---------- ABD: Huey Long ----------
    ['l_court', 'USA', 'usa_f_share', 10, 'Yüksek Mahkeme Direniyor', 'Yüksek Mahkeme "Servetimizi Paylaşalım" yasalarını anayasaya aykırı buldu. Başkan Long öfkeli.', 'politics', [
      ['Mahkemeyi sadık yargıçlarla doldur', (c) => { c.pp += 100; c.stabX -= 0.05; pop('USA', 'dem', -0.05); }, '+100 siyasi güç, istikrar −%5'],
      ['Kararı kabul et', (c) => { c.stabX += 0.05; pop('USA', 'dem', 0.05); }, 'İstikrar +%5, demokratik destek +%5']]],
    ['l_shot', 'USA', 'usa_f_rearm', 35, 'Baton Rouge\'da Suikast', 'Başkan Long, Louisiana Meclisi\'nde vuruldu ama kurtuldu. Ülke diken üstünde.', 'politics', [
      ['Sıkıyönetim ilan et', (c) => { c.wsX += 0.1; c.stabX -= 0.03; units(c, 3); }, 'Savaş desteği +%10, +3 tümen, istikrar −%3'],
      ['Halka seslen', (c) => { pop('USA', 'fas', 0.1); c.stabX += 0.05; }, 'Faşist destek +%10, istikrar +%5']]],
    ['l_mexico', 'USA', 'usa_f_monroe', 25, 'Meksika Petrolü', 'Meksika petrol şirketlerini millîleştirdi. Washington Amerikan şirketlerinin haklarının geri verilmesini istiyor.', 'industry', [
      ['Petrol imtiyazı iste', (c) => { if (alive('MEX')) { rel('USA', 'MEX', -30); goal(c, ['MEX']); } fac(c, 2, 0); }, '+2 sivil fabrika, Meksika\'ya karşı savaş gerekçesi'],
      ['İyi komşuluk', (c) => { rel('USA', 'MEX', 30); if (free('MEX')) invite(c, ['MEX']); }, 'Meksika ilişkisi +30, ittifak daveti']]],
    ['l_order', 'USA', 'usa_f_order', 5, 'Yeni Amerikan Düzeni', 'Beyaz Saray\'dan yeni bir çağ ilan edildi: Amerika artık kendi yolunu çiziyor.', 'surrender', [
      ['Herkes bir kral!', (c) => sp(c, 'alt_longusa'), 'Ulusal ruh: Herkes Bir Kral']]],
    // ---------- ABD: Sosyalist ----------
    ['s_wall', 'USA', 'usa_s_unions', 10, 'Wall Street Kapandı', 'Borsa kapatıldı; bankaların akıbeti belirsiz. Sendika konseyleri kamulaştırma istiyor.', 'industry', [
      ['Bankaları kamulaştır', (c) => { fac(c, 3, 0); c.stabX -= 0.05; }, '+3 sivil fabrika, istikrar −%5'],
      ['Tazminat öde', (c) => { c.stabX += 0.05; c.pp -= 50; }, 'İstikrar +%5, −50 siyasi güç']]],
    ['s_canada', 'USA', 'usa_s_west', 20, 'Kanada\'da Grevler', 'Winnipeg ve Toronto\'da genel grev; Kanadalı sendikalar Amerikan yoldaşlarından yardım bekliyor.', 'war', [
      ['Kanadalı işçileri destekle', (c) => { pop('CAN', 'com', 0.25); if (alive('CAN')) C('CAN').stabX -= 0.1; }, 'Kanada\'da komünist destek +%25'],
      ['Kuzeye yürü', (c) => goal(c, ['CAN']), 'Kanada\'ya karşı savaş gerekçesi']]],
    ['s_latam', 'USA', 'usa_s_latam', 20, 'Meksika Devrimi', 'Cárdenas hükümeti sosyalist Amerika ile yakınlaşmak istiyor.', 'diplomacy', [
      ['Meksika\'yı birliğe çağır', (c) => { flip('MEX', 'com'); invite(c, ['MEX']); }, 'Meksika komünist olur ve ittifaka çağrılır'],
      ['Brezilya\'ya yönel', (c) => { pop('BRA', 'com', 0.25); }, 'Brezilya\'da komünist destek +%25']]],
    ['s_union', 'USA', 'usa_s_union', 5, 'Amerikan Sosyalist Birliği', 'Kıtanın dört bir yanından delegeler Chicago\'da toplandı.', 'surrender', [
      ['Yeni bir dünya!', (c) => sp(c, 'alt_redusa'), 'Ulusal ruh: Amerikan Sosyalist Birliği']]],
    // ---------- Fransa: Komün ----------
    ['c_maginot', 'FRA', 'fra_c_army', 10, 'Maginot Garnizonları', 'Maginot Hattı\'ndaki subaylar Komün\'e bağlılık yemini etmekte ağır davranıyor.', 'war', [
      ['İşçi milislerini gönder', (c) => { tsp(c, 'alt_militia', 365); }, '1 yıl halk milisleri (insan gücü, kara savunması +%10)'],
      ['Subaylara güvence ver', (c) => { c.stabX += 0.05; c.pp -= 40; }, 'İstikrar +%5, −40 siyasi güç']]],
    ['c_spain', 'FRA', 'fra_c_spain', 5, 'Pireneler', 'İspanya Cumhuriyeti hayatta kalma savaşı veriyor. Komün yardım edecek mi?', 'war', [
      ['Gönüllü ve silah gönder', (c) => { if (alive('SPR')) { G.lend('FRA', 'SPR', 'inf', 3000); G.lend('FRA', 'SPR', 'art', 60); rel('FRA', 'SPR', 40); } }, 'İspanya Cumhuriyeti\'ne teçhizat'],
      ['Doğrudan müdahale', (c) => { if (alive('SPN') && alive('SPR') && G.atWar('SPN', 'SPR') && !G.atWar('FRA', 'SPN')) G.declareWar('FRA', 'SPN'); }, 'Milliyetçi İspanya\'ya savaş ilan et']]],
    ['c_algeria', 'FRA', 'fra_c_colonies', 15, 'Cezayir Kongresi', 'Cezayirli milliyetçiler Komün\'ün sömürgecilik karşıtı vaatlerinin yerine getirilmesini istiyor.', 'politics', [
      ['Özerklik tanı', (c) => { c.stabX += 0.05; c.pp += 50; }, 'İstikrar +%5, +50 siyasi güç'],
      ['Önce devrim, sonra özerklik', (c) => { c.wsX += 0.05; c.stabX -= 0.03; }, 'Savaş desteği +%5, istikrar −%3']]],
    ['c_union', 'FRA', 'fra_c_union', 5, 'Fransız Sovyetler Birliği', 'Paris Komünü\'nün düştüğü yerde yeni bir Komün doğdu.', 'surrender', [
      ['Vive la Commune!', (c) => sp(c, 'alt_commune'), 'Ulusal ruh: Fransız Komünü']]],
    // ---------- Fransa: Action Française ----------
    ['m_concordat', 'FRA', 'fra_m_church', 10, 'Vatikan ile Konkordato', 'Papa XI. Pius, kraliyet Fransa\'sıyla yeni bir konkordato imzalamaya hazır.', 'diplomacy', [
      ['Konkordatoyu imzala', (c) => { tsp(c, 'alt_crusade', 730); }, '2 yıl Kutsal Dava (istikrar +%5, savaş desteği +%10)'],
      ['Laik devleti koru', (c) => { c.stabX -= 0.03; c.pp += 60; }, '+60 siyasi güç, istikrar −%3']]],
    ['m_latin', 'FRA', 'fra_m_latin', 20, 'Latin Tahtları', 'İspanya ve Portekiz\'deki monarşistler Paris\'ten destek bekliyor.', 'diplomacy', [
      ['Latin Bloku\'nu kur', (c) => { invite(c, ['POR', 'SPN', 'ITA'].filter((t) => alive(t) && C(t).ideo !== 'com')); }, 'Portekiz, İspanya ve İtalya ittifaka çağrılır'],
      ['Yalnız Fransa', (c) => { c.wsX += 0.05; }, 'Savaş desteği +%5']]],
    ['m_rhine', 'FRA', 'fra_m_rhine', 10, 'Ren Sınırı', 'Kraliyet generalleri doğal sınırın Ren olduğunu söylüyor.', 'war', [
      ['Ren\'e yürü', (c) => { goal(c, ['GER']); c.wsX += 0.1; }, 'Almanya\'ya karşı savaş gerekçesi, savaş desteği +%10'],
      ['Tahkimat yeter', (c) => { c.stabX += 0.05; c.wsX -= 0.03; }, 'İstikrar +%5, savaş desteği −%3']]],
    ['m_bourbon', 'FRA', 'fra_m_bourbon', 5, 'Zambaklar Tahtı', 'Reims Katedrali\'nde taç giyme töreni: Fransa yeniden bir krallık.', 'surrender', [
      ['Vive le Roi!', (c) => sp(c, 'alt_bourbon'), 'Ulusal ruh: Zambaklar Tahtı']]],
    // ---------- Türkiye: Osmanlı ----------
    ['o_heir', 'TUR', 'tur_o_meclis', 10, 'Hanedanın Dönüşü', 'Sürgündeki Osmanlı hanedanı İstanbul\'a dönüyor. Dolmabahçe yeniden saray olacak.', 'politics', [
      ['Hanedana büyük tören', (c) => { c.stabX += 0.05; c.pp -= 30; }, 'İstikrar +%5, −30 siyasi güç'],
      ['Sade bir dönüş', (c) => { c.pp += 40; }, '+40 siyasi güç']]],
    ['o_jihad', 'TUR', 'tur_o_caliphate', 15, 'Hilafet Çağrısı', 'Halife\'nin sesi İslam dünyasında yankılanıyor. Arap ve İran ulemasından mektuplar geliyor.', 'diplomacy', [
      ['Müslüman ülkeleri ittifaka çağır', (c) => { invite(c, ['IRQ', 'SAU', 'PER', 'AFG', 'YEM']); for (const t of ['IRQ', 'SAU', 'PER', 'AFG']) rel('TUR', t, 25); }, 'Irak, Suudi Arabistan, İran, Afganistan, Yemen davet edilir'],
      ['Yalnız manevi otorite', (c) => { c.stabX += 0.05; for (const t of ['IRQ', 'SAU', 'PER', 'EGY']) rel('TUR', t, 15); }, 'İstikrar +%5, ilişkiler +15']]],
    ['o_mosul', 'TUR', 'tur_o_mosul', 10, 'Musul Meselesi', 'Musul\'daki Türkmenler ve Kürt aşiretleri İstanbul\'a bağlılık bildiriyor.', 'war', [
      ['Musul\'u talep et', (c) => { goal(c, ['IRQ']); c.wsX += 0.05; }, 'Irak\'a karşı savaş gerekçesi'],
      ['Aşiretleri silahlandır', (c) => { if (alive('IRQ')) C('IRQ').stabX -= 0.1; units(c, 2, 'cav'); }, 'Irak istikrarı −%10, +2 süvari tümeni']]],
    ['o_devlet', 'TUR', 'tur_o_devlet', 5, 'Devlet-i Aliyye', 'Topkapı\'da Hırka-i Şerif önünde biat töreni: Osmanlı Devleti yeniden kuruldu.', 'surrender', [
      ['Padişahım çok yaşa!', (c) => sp(c, 'alt_ottoman'), 'Ulusal ruh: Devlet-i Aliyye']]],
    // ---------- Türkiye: Turan ----------
    ['t_ocak', 'TUR', 'tur_t_youth', 10, 'Ülkü Ocakları', 'Turancı gençlik örgütleri büyüyor; hükümet onları orduya mı bağlamalı?', 'politics', [
      ['Gençlik tugayları kur', (c) => { units(c, 3); c.wsX += 0.05; }, '+3 piyade tümeni, savaş desteği +%5'],
      ['Okullarda Turan dersi', (c) => { c.pp += 50; pop('TUR', 'fas', 0.05); }, '+50 siyasi güç']]],
    ['t_caucasus', 'TUR', 'tur_t_caucasus', 15, 'Kafkas Gönüllüleri', 'Azerbaycan ve Dağıstan\'dan kaçan gönüllüler Kars\'ta toplandı.', 'war', [
      ['Kafkas Lejyonu kur', (c) => { units(c, 3, 'mtn'); if (alive('SOV')) rel('TUR', 'SOV', -20); }, '+3 dağ tümeni, Sovyet ilişkisi −20'],
      ['Sovyetleri kızdırma', (c) => { c.stabX += 0.05; }, 'İstikrar +%5']]],
    ['t_turkestan', 'TUR', 'tur_t_turkestan', 20, 'Türkistan Ayaklanması', 'Fergana Vadisi\'nde Basmacılar yeniden silaha sarıldı.', 'war', [
      ['Basmacılara silah gönder', (c) => { if (alive('SOV')) { C('SOV').stabX -= 0.05; rel('TUR', 'SOV', -25); } stock(c, 'inf', -500); }, 'Sovyet istikrarı −%5, −500 tüfek'],
      ['Doğrudan Türkistan\'a yürü', (c) => { goal(c, ['SOV']); c.wsX += 0.1; }, 'Sovyetlere karşı savaş gerekçesi, savaş desteği +%10']]],
    ['t_union', 'TUR', 'tur_t_union', 5, 'Turan Birliği', 'Adriyatik\'ten Çin Seddi\'ne bütün Türkler tek bayrak altında toplanma çağrısı yaptı.', 'surrender', [
      ['Ergenekon\'dan çıkış!', (c) => sp(c, 'alt_turan'), 'Ulusal ruh: Turan Ülküsü']]],
    // ---------- İngiltere: Genel Grev ----------
    ['e_king', 'ENG', 'eng_c_soviets', 10, 'Kraliyet Ailesinin Akıbeti', 'Buckingham Sarayı işçi milislerinin elinde. Kral ve ailesi ne olacak?', 'politics', [
      ['Kanada\'ya sürgün', (c) => { c.stabX += 0.05; if (alive('CAN')) rel('ENG', 'CAN', -20); }, 'İstikrar +%5, Kanada ilişkisi −20'],
      ['Cumhuriyeti ilan et, saray müze olsun', (c) => { c.pp += 80; c.wsX += 0.05; }, '+80 siyasi güç, savaş desteği +%5']]],
    ['e_dominion', 'ENG', 'eng_c_dominion', 15, 'Dominyonlar Ayrılıyor', 'Kanada, Avustralya ve Güney Afrika Londra\'daki devrimi tanımıyor.', 'diplomacy', [
      ['Sosyalist Milletler Topluluğu öner', (c) => { for (const t of ['CAN', 'AST', 'SAF', 'NZL']) pop(t, 'com', 0.15); invite(c, ['AST', 'NZL']); }, 'Dominyonlarda komünist destek +%15, ittifak daveti'],
      ['Bırak gitsinler', (c) => { c.stabX += 0.05; c.pp += 50; }, 'İstikrar +%5, +50 siyasi güç']]],
    ['e_india', 'ENG', 'eng_c_peoples', 10, 'Hindistan\'ın Geleceği', 'Gandhi ve Nehru, devrimci Londra\'dan tam bağımsızlık istiyor.', 'politics', [
      ['Bağımsızlık ver', (c) => { if (alive('RAJ')) { C('RAJ').overlord = null; rel('ENG', 'RAJ', 40); } c.pp += 60; }, 'Hindistan bağımsız, +60 siyasi güç'],
      ['Sosyalist Hindistan', (c) => { flip('RAJ', 'com'); invite(c, ['RAJ']); }, 'Hindistan komünist olur ve ittifaka çağrılır']]],
    ['e_union', 'ENG', 'eng_c_union', 5, 'Britanya Sosyalist Cumhuriyeti', 'Westminster\'da kızıl bayrak dalgalanıyor. İmparatorluk bitti, Cumhuriyet başladı.', 'surrender', [
      ['Yoldaşlar, ileri!', (c) => sp(c, 'alt_redbrit'), 'Ulusal ruh: Britanya Sosyalist Cumhuriyeti']]],
    // ---------- Sovyetler: Troçki ----------
    ['t_stalinists', 'SOV', 'sov_t_perm', 10, 'Stalin\'in Yandaşları', 'Stalin\'in eski adamları NKVD\'de ve parti aygıtında hâlâ güçlü.', 'politics', [
      ['Aygıtı temizle', (c) => { tsp(c, 'alt_purge', 365); c.stabX += 0.05; }, 'İstikrar +%5; 1 yıl devrimci tasfiye'],
      ['Genel af', (c) => { c.stabX -= 0.05; c.pp += 80; }, '+80 siyasi güç, istikrar −%5']]],
    ['t_fourth', 'SOV', 'sov_t_fourth', 20, 'Dördüncü Enternasyonal', 'Troçkist partiler Avrupa\'nın dört bir yanında örgütleniyor.', 'politics', [
      ['Avrupa\'yı ayaklandır', (c) => { for (const t of ['FRA', 'SPR', 'ITA', 'POL', 'CZE']) pop(t, 'com', 0.1); tension(4); }, 'Avrupa\'da komünist destek +%10'],
      ['Önce Sovyetleri güçlendir', (c) => { fac(c, 0, 3); }, '+3 askerî fabrika']]],
    ['t_china', 'SOV', 'sov_t_asia', 15, 'Çin Devrimi', 'Mao\'nun Kızıl Ordusu Yenan\'da; Çan Kay-şek ise Japonya\'ya karşı savaşıyor.', 'war', [
      ['Çin\'e teçhizat gönder', (c) => { if (alive('CHI')) { G.lend('SOV', 'CHI', 'inf', 3000); pop('CHI', 'com', 0.15); } }, 'Çin\'e teçhizat, komünist destek +%15'],
      ['Mançurya\'ya yürü', (c) => goal(c, ['MAN', 'JAP']), 'Mançukuo ve Japonya\'ya karşı savaş gerekçesi']]],
    ['t_world', 'SOV', 'sov_t_union', 5, 'Dünya Sovyetler Birliği', 'Troçki\'nin hayali gerçek oluyor: devrim sürekli ve sınırsız.', 'surrender', [
      ['Sürekli devrim!', (c) => sp(c, 'alt_trotsky'), 'Ulusal ruh: Sürekli Devrim']]],
    // ---------- Sovyetler: Buharin ----------
    ['b_market', 'SOV', 'sov_b_nep', 10, 'Köylü Pazarları', 'Kolhozlar dağıtıldı; köylüler ürünlerini serbestçe satmaya başladı.', 'industry', [
      ['Pazarları serbest bırak', (c) => tsp(c, 'alt_marketboom', 540), '18 ay pazar canlanması (fabrika +%10, inşaat +%10)'],
      ['Sınırlı serbestlik', (c) => { c.stabX += 0.05; }, 'İstikrar +%5']]],
    ['b_credit', 'SOV', 'sov_b_trade', 15, 'Batı Kredileri', 'Londra ve New York bankaları Sovyetlere kredi açmaya hazır.', 'industry', [
      ['Krediyi kabul et', (c) => { fac(c, 5, 0); rel('SOV', 'USA', 20); rel('SOV', 'ENG', 20); }, '+5 sivil fabrika, Batı ilişkileri +20'],
      ['Bağımsızlığı koru', (c) => { c.pp += 60; }, '+60 siyasi güç']]],
    ['b_tukha', 'SOV', 'sov_b_reform', 10, 'Tuhaçevski Rehabilite Edildi', 'Mareşal Tuhaçevski ve tasfiye edilen subaylar orduya geri döndü.', 'war', [
      ['Subayları geri çağır', (c) => { rmsp(c, 'purge'); c.stabX += 0.03; }, 'Büyük Temizlik ruhu kalkar'],
      ['Yalnız Tuhaçevski', (c) => { G.FX.general(c); }, 'Yeni komutan']]],
    ['b_welfare', 'SOV', 'sov_b_welfare', 5, 'Sosyalist Refah', 'Buharin\'in Rusya\'sı dünyaya başka bir sosyalizmin mümkün olduğunu gösteriyor.', 'surrender', [
      ['Zenginleşin!', (c) => sp(c, 'alt_bukharin'), 'Ulusal ruh: Sosyalist Refah']]],
    // ---------- İtalya: Sosyalist ----------
    ['i_pope', 'ITA', 'ita_c_land', 10, 'Vatikan ile Gerginlik', 'Papa, toprak reformunu ve kilise mülklerinin kamulaştırılmasını kınadı.', 'politics', [
      ['Lateran Antlaşması\'nı tanı', (c) => { c.stabX += 0.05; }, 'İstikrar +%5'],
      ['Kilise mülklerini kamulaştır', (c) => { fac(c, 2, 0); c.stabX -= 0.05; }, '+2 sivil fabrika, istikrar −%5']]],
    ['i_ethiopia', 'ITA', 'ita_c_ethiopia', 5, 'Habeşistan', 'Habeş direnişi sürüyor; sosyalist hükümet sömürge savaşının bedelini sorguluyor.', 'war', [
      ['Habeşistan\'dan çekil', (c) => { c.stabX += 0.1; c.pp += 50; if (alive('ETH')) rel('ITA', 'ETH', 50); }, 'İstikrar +%10, +50 siyasi güç'],
      ['Sömürgeyi tut', (c) => { c.wsX += 0.05; }, 'Savaş desteği +%5']]],
    ['i_yugo', 'ITA', 'ita_c_balkan', 20, 'Balkan Partizanları', 'Yugoslav ve Arnavut komünistleri Roma\'dan silah istiyor.', 'war', [
      ['Silah gönder', (c) => { pop('YUG', 'com', 0.2); pop('ALB', 'com', 0.2); if (alive('YUG')) C('YUG').stabX -= 0.1; }, 'Yugoslavya ve Arnavutluk\'ta komünist destek +%20'],
      ['Savaş gerekçesi', (c) => goal(c, ['YUG', 'ALB']), 'Yugoslavya ve Arnavutluk\'a karşı savaş gerekçesi']]],
    ['i_union', 'ITA', 'ita_c_union', 5, 'İtalyan Sovyetler Birliği', 'Torino\'dan Palermo\'ya konseyler iktidarda.', 'surrender', [
      ['Avanti popolo!', (c) => sp(c, 'alt_redita'), 'Ulusal ruh: İtalyan Sovyetleri']]],
    // ---------- Japonya: Sivil Hükümet ----------
    ['j_kwantung', 'JAP', 'jap_d_control', 10, 'Kwantung Ordusu', 'Mançurya\'daki Kwantung Ordusu Tokyo\'nun emirlerini dinlemiyor.', 'war', [
      ['Komutanları geri çağır', (c) => { c.stabX += 0.05; tsp(c, 'alt_mutiny', 180); }, 'İstikrar +%5; 6 ay huzursuz subaylar'],
      ['Ordunun bütçesini kes', (c) => { fac(c, 3, 0); c.wsX -= 0.05; }, '+3 sivil fabrika, savaş desteği −%5']]],
    ['j_navy', 'JAP', 'jap_d_treaty', 15, 'Londra Deniz Konferansı', 'ABD ve İngiltere deniz sınırlamalarının yenilenmesini öneriyor.', 'navy', [
      ['Antlaşmayı imzala', (c) => { rel('JAP', 'USA', 30); rel('JAP', 'ENG', 30); fac(c, 2, 0); }, 'ABD ve İngiltere ilişkisi +30, +2 sivil fabrika'],
      ['Eşitlik iste', (c) => { c.ships.cv = (c.ships.cv || 0) + 1; rel('JAP', 'USA', -10); }, '+1 uçak gemisi']]],
    ['j_china', 'JAP', 'jap_d_china', 20, 'Çin ile Barış', 'Nanking hükümeti kalıcı barış için Mançurya\'nın statüsünün görüşülmesini istiyor.', 'diplomacy', [
      ['Mançukuo bağımsız kalsın', (c) => { rel('JAP', 'CHI', 20); c.stabX += 0.03; }, 'Çin ilişkisi +20'],
      ['Ortak kalkınma bölgesi', (c) => { fac(c, 2, 0); rel('JAP', 'CHI', 40); if (alive('CHI')) G.addFactories('CHI', 'civ', 2); }, 'Japonya ve Çin\'e +2 sivil fabrika']]],
    ['j_taisho', 'JAP', 'jap_d_taisho', 5, 'Taisho Demokrasisinin Dönüşü', 'Diyet yeniden ülkenin kalbinde; Japonya Asya\'nın ticaret merkezi oluyor.', 'surrender', [
      ['Banzai!', (c) => sp(c, 'alt_taisho'), 'Ulusal ruh: Taisho Demokrasisi']]],
    // ---------- Polonya ----------
    ['p_beck', 'POL', 'pol_a_legion', 10, 'Albay Beck\'in Diplomasisi', 'Dışişleri Bakanı Beck, Almanya ile Sovyetler arasında denge politikasını sürdürmek istiyor.', 'diplomacy', [
      ['Berlin\'le saldırmazlık', (c) => { if (alive('GER') && ai('GER')) G.proposePact('POL', 'GER'); }, 'Almanya\'ya saldırmazlık paktı'],
      ['Paris\'e yaslan', (c) => { rel('POL', 'FRA', 30); if (alive('FRA') && ai('FRA')) G.guarantee('FRA', 'POL'); }, 'Fransa garantisi']]],
    ['p_lit', 'POL', 'pol_a_vilnius', 20, 'Kaunas\'ın Cevabı', 'Litvanya hükümeti birlik teklifini tartışıyor. Vilnius meselesi yaraları kanatıyor.', 'diplomacy', [
      ['Federal birlik öner', (c) => { rel('POL', 'LIT', 30); c.stabX += 0.03; }, 'Litvanya ilişkisi +30'],
      ['Ültimatom ver', (c) => { goal(c, ['LIT']); }, 'Litvanya\'ya karşı savaş gerekçesi']]],
    ['p_great', 'POL', 'pol_a_great', 5, 'Mocarstwo', 'Polonya artık büyük güçler arasında anılıyor.', 'surrender', [
      ['Jeszcze Polska nie zginęła!', (c) => sp(c, 'alt_pol'), 'Ulusal ruh: Mocarstwo']]],
    // ---------- Macaristan ----------
    ['h_horthy', 'HUN', 'hun_a_crown', 10, 'Horthy\'nin Akıbeti', 'Eski naip Amiral Horthy saraydan ayrılmaya hazırlanıyor.', 'politics', [
      ['Ordu başkomutanı olsun', (c) => { G.FX.general(c); c.stabX += 0.03; }, 'Yeni komutan, istikrar +%3'],
      ['Emekliye ayır', (c) => { c.pp += 60; }, '+60 siyasi güç']]],
    ['h_vienna', 'HUN', 'hun_a_austria', 15, 'Viyana Kararsız', 'Avusturya Habsburg tacını kabul etmekte ikircikli; Schuschnigg zaman istiyor.', 'diplomacy', [
      ['Sabırla bekle', (c) => { rel('HUN', 'AUS', 30); if (free('AUS')) { flip('AUS', 'neu'); invite(c, ['AUS']); } }, 'Avusturya ittifaka çağrılır'],
      ['Baskıyı artır', (c) => goal(c, ['AUS']), 'Avusturya\'ya karşı savaş gerekçesi']]],
    ['h_empire', 'HUN', 'hun_a_empire', 5, 'Avusturya-Macaristan', 'Budapeşte\'de Kral Otto, iki tacın birliğini ilan etti.', 'surrender', [
      ['Viribus Unitis!', (c) => sp(c, 'alt_hun'), 'Ulusal ruh: İkili Monarşi']]],
    // ---------- Romanya ----------
    ['ro_carol', 'ROM', 'rom_a_land', 10, 'Kral Carol\'un Hesabı', 'II. Carol, Maniu hükümetini devirmek için saray darbesi planlıyor.', 'politics', [
      ['Kralı tahttan indir', (c) => { c.leader = 'Iuliu Maniu'; c.stabX -= 0.03; c.pp += 80; }, '+80 siyasi güç, istikrar −%3'],
      ['Anayasal monarşi', (c) => { c.stabX += 0.05; }, 'İstikrar +%5']]],
    ['ro_great', 'ROM', 'rom_a_great', 5, 'Büyük Romanya Demokrasisi', 'Köylü Partisi ülkeyi Balkanların en istikrarlı demokrasisine dönüştürdü.', 'surrender', [
      ['Trăiască România!', (c) => sp(c, 'alt_rom'), 'Ulusal ruh: Köylü Demokrasisi']]],
    // ---------- Yunanistan ----------
    ['g_metaxas', 'GRE', 'gre_a_army', 10, 'Metaksas Direniyor', 'Görevden alınan Metaksas ordudaki taraftarlarıyla gizli toplantılar yapıyor.', 'politics', [
      ['Sürgüne gönder', (c) => { c.stabX += 0.05; }, 'İstikrar +%5'],
      ['Ordunun başına geçir', (c) => { G.FX.general(c); c.wsX += 0.05; }, 'Yeni komutan, savaş desteği +%5']]],
    ['g_byz', 'GRE', 'gre_a_byzantium', 5, 'Bizans\'ın Mirası', 'Atina\'da çanlar çalıyor: Megali İdea gerçek oluyor.', 'surrender', [
      ['Zito i Ellas!', (c) => sp(c, 'alt_gre'), 'Ulusal ruh: Megali İdea']]],
    // ---------- Yugoslavya ----------
    ['y_stalin', 'YUG', 'yug_a_comintern', 20, 'Tito ve Stalin', 'Moskova Yugoslav partisini kendi denetiminde tutmak istiyor; Tito bağımsız bir yol arıyor.', 'diplomacy', [
      ['Moskova\'ya bağlı kal', (c) => { if (alive('SOV')) G.lend('SOV', 'YUG', 'inf', 2000); }, 'Sovyet teçhizatı'],
      ['Kendi yolumuz', (c) => { if (c.fac) G.leaveFaction('YUG'); c.stabX += 0.1; c.pp += 60; }, 'İttifaktan çık, istikrar +%10, +60 siyasi güç']]],
    ['y_fed', 'YUG', 'yug_a_federation', 5, 'Balkan Federasyonu', 'Belgrad\'da Balkan halklarının federasyonu ilan edildi.', 'surrender', [
      ['Smrt fašizmu!', (c) => sp(c, 'alt_yug'), 'Ulusal ruh: Balkan Federasyonu']]],
    // ---------- Çin ----------
    ['ch_tokyo', 'CHI', 'chi_a_peace', 15, 'Tokyo\'nun Şartları', 'Japonya barış için Kuzey Çin\'de askerî üsler ve ekonomik imtiyazlar istiyor.', 'diplomacy', [
      ['Şartları kabul et', (c) => { if (alive('JAP') && G.atWar('CHI', 'JAP') && ai('JAP')) G.makePeace('CHI', 'JAP'); rel('CHI', 'JAP', 40); c.stabX -= 0.05; }, 'Japonya ilişkisi +40, istikrar −%5'],
      ['Pazarlık et', (c) => { rel('CHI', 'JAP', 15); c.pp += 40; }, '+40 siyasi güç']]],
    ['ch_order', 'CHI', 'chi_a_order', 5, 'Doğu Asya Yeni Düzeni', 'Nanking ve Tokyo ortak refah alanının temellerini attı.', 'surrender', [
      ['Yeni düzen!', (c) => sp(c, 'alt_chi'), 'Ulusal ruh: Doğu Asya Yeni Düzeni']]],
    // ---------- Bulgaristan ----------
    ['bu_imro', 'BUL', 'bul_a_macedonia', 10, 'İç Makedonya Devrimci Örgütü', 'İMRO komitacıları Üsküp ve Ohri\'de eylem için emir bekliyor.', 'war', [
      ['Komitacıları silahlandır', (c) => { if (alive('YUG')) C('YUG').stabX -= 0.1; }, 'Yugoslavya istikrarı −%10'],
      ['Örgütü dağıt', (c) => { c.stabX += 0.05; rel('BUL', 'YUG', 20); }, 'İstikrar +%5']]],
    ['bu_stefano', 'BUL', 'bul_a_stefano', 5, 'San Stefano Bulgaristanı', 'Bulgaristan 1878\'de vaat edilen sınırlarına ulaştı.', 'surrender', [
      ['Bulgaristan çok yaşa!', (c) => sp(c, 'alt_bul'), 'Ulusal ruh: San Stefano Sınırları']]],
    // ---------- İsveç ----------
    ['sw_norway', 'SWE', 'swe_a_nordic', 15, 'Oslo ve Kopenhag', 'Norveç ve Danimarka hükümetleri birlik teklifini Stockholm\'ün hegemonyası olarak görüyor.', 'diplomacy', [
      ['Eşit ortaklık öner', (c) => { rel('SWE', 'NOR', 30); rel('SWE', 'DEN', 30); }, 'Norveç ve Danimarka ilişkisi +30'],
      ['İsveç önderliği', (c) => { c.wsX += 0.05; }, 'Savaş desteği +%5']]],
    ['sw_union', 'SWE', 'swe_a_union', 5, 'Kuzey İmparatorluğu', 'Kalmar Birliği yeniden doğdu.', 'surrender', [
      ['Leve Norden!', (c) => sp(c, 'alt_swe'), 'Ulusal ruh: Kuzey İmparatorluğu']]],
    // ---------- Brezilya ----------
    ['br_vargas', 'BRA', 'bra_a_sigma', 10, 'Vargas Sürgünde', 'Getúlio Vargas Montevideo\'dan direnişi örgütlüyor.', 'politics', [
      ['Uruguay\'dan iadesini iste', (c) => { goal(c, ['URU']); }, 'Uruguay\'a karşı savaş gerekçesi'],
      ['Görmezden gel', (c) => { c.stabX += 0.03; }, 'İstikrar +%3']]],
    ['br_empire', 'BRA', 'bra_a_empire', 5, 'Güney Amerika Hegemonyası', 'Rio de Janeiro kıtanın yeni başkenti olmaya aday.', 'surrender', [
      ['Anauê!', (c) => sp(c, 'alt_bra'), 'Ulusal ruh: Sigma Devleti']]],
  ];
  const EV = {}, TRIG = {};
  for (const [id, t, f, delay, title, text, art, opts] of E) {
    EV[id] = { id, t, title, text, art, opts: opts.map(([n, fx, d]) => ({ n, fx, d })) };
    (TRIG[f] || (TRIG[f] = [])).push([id, delay]);
  }
  G.ALTEV = EV; G.ALT_TRIG = TRIG;
  // dışarıdan (küçük ülke yolları vb.) olay ekleme
  G.addAltEvents = (list) => { for (const [id, t, f, delay, title, text, art, opts] of list) { EV[id] = { id, t, title, text, art, opts: opts.map(([n, fx, d]) => ({ n, fx, d })) }; (TRIG[f] || (TRIG[f] = [])).push([id, delay]); } };

  // olayı hemen gerçekleştir (oyuncuya pencere, YZ ilk seçenek)
  G.altFire = (tag, id) => {
    const st = G.st, c = st.C[tag], e = EV[id];
    if (!e || !c || !c.alive) return;
    (st.altDone || (st.altDone = {}))[id] = 1;
    if (tag === st.player) G.queuePopup({ title: e.title, text: e.text, art: e.art, date: st.day, opts: e.opts.map((o) => ({ n: o.n, d: o.d, fx: () => o.fx(st.C[tag]) })) });
    else { try { e.opts[0].fx(c); } catch (err) { console.error('altev', id, err); } if (G.newsAlt) G.newsAlt(tag, e); }
  };
  // YZ ülkesinin alternatif yol zirvesi oyuncuya dünya haberi olarak gelir
  G.newsAlt = (tag, e) => {
    const st = G.st;
    if (e.art !== 'surrender' || !G.newsOn || !st.player || st._newsDay === st.day) return;
    st._newsDay = st.day;
    G.queuePopup({ news: 1, art: 'politics', eyebrow: 'Dünya haberleri · ' + G.fmtDate(st.day), title: `${G.cname(tag)}: ${e.title}`, text: e.text, opts: [{ n: 'Dünya değişiyor', fx: () => {} }] });
  };
  // odak tamamlanınca zincirdeki olayı sıraya koy
  G.altOnFocus = (c, fid) => {
    const st = G.st;
    for (const [id, delay] of TRIG[fid] || []) {
      if (st.altDone && st.altDone[id]) continue;
      (st.altq || (st.altq = [])).push({ t: c.tag, id, day: st.day + delay });
    }
  };
  G.altTick = () => {
    const st = G.st; if (!st.altq || !st.altq.length) return;
    const due = st.altq.filter((x) => st.day >= x.day);
    if (!due.length) return;
    st.altq = st.altq.filter((x) => st.day < x.day);
    for (const x of due) G.altFire(x.t, x.id);
  };

  // iç savaşın sonu: kazanan tarafa uzlaşma ya da hesaplaşma seçimi
  G.onCivilEnd = (win, lose) => {
    const st = G.st, c = st.C[win]; if (!c || !c.alive) return;
    G.timedSpirit(win, 'alt_ruins', 540);
    if (win === st.player && G.achFlag) G.achFlag('civil');
    const opts = [
      { n: 'Ulusal uzlaşma', d: '2 yıl Ulusal Uzlaşma (istikrar +%10, fabrika +%5)', fx: () => G.timedSpirit(win, 'alt_reconcile', 730) },
      { n: 'Hesap sor', d: '2 yıl Hesaplaşma (savaş desteği +%10, insan gücü, istikrar −%5)', fx: () => G.timedSpirit(win, 'alt_reckoning', 730) },
    ];
    if (win === st.player) G.queuePopup({ title: 'İç Savaşın Sonu', art: 'surrender', date: st.day, text: `${G.cname(lose)} teslim oldu; ülke yeniden tek bayrak altında. Ama şehirler yıkık, aileler bölünmüş. Kaybedenlere nasıl davranacağız? (18 ay boyunca "İç Savaşın Yıkıntıları": fabrika −%10)`, opts });
    else opts[0].fx();
  };
})(window);
