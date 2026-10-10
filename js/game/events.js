// Tarihî olaylar. Oyuncu olayın aktörü ya da hedefi olduğunda seçim penceresi açılır.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const alive = (t) => G.st.C[t]?.alive;
  const ai = (t) => t !== G.st.player;
  const inPoly = (lon, lat, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
  const facOf = (t) => G.st.C[t]?.fac;
  const ensureAxis = () => {
    const st = G.st;
    if (!alive('GER') || st.C.GER.ideo !== 'fas') return null; // alternatif tarih: faşist olmayan Almanya Mihver kurmaz
    if (facOf('GER')) return facOf('GER');
    return G.createFaction('GER', 'Mihver');
  };
  // ABD asli topraklarının en az bu kadarını tutuyor mu (atom bombası koşulu)
  const usaHolds = (f) => { const st = G.st; let a = 0, h = 0; for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.core !== 'USA') continue; a++; if (pr.c === 'USA') h++; } return a && h / a >= f; };
  const joinAxis = (t) => { const f = ensureAxis(); if (f && alive(t) && facOf(t) !== f) G.joinFaction(t, f); };
  const war = (a, b) => { if (alive(a) && alive(b) && !G.atWar(a, b) && !G.sameFaction(a, b)) G.declareWar(a, b); };

  function scw(switchSide) {
    const st = G.st;
    G.release('SPN', 'SPR', (i) => { const p = P[i]; return (p.lon < -4 && p.lat > 40.0) || (p.lon < -4.6 && p.lat < 38.6) || p.lat < 36.05 || (p.lon >= -4 && p.lon <= -1 && p.lat > 41.6 && p.lat < 42.9); });
    const spn = st.C.SPN; spn.stock.inf += 4000; spn.stock.art += 120; spn.stock.fig = 60;
    // isyan bölgelerindeki garnizonlar milliyetçilere katılır; yeni kurulan milis tümenlerinin yarısı dağıtılır
    let made = st.units.filter((u) => u.t === 'SPN');
    for (let k = 0; k < Math.floor(made.length / 2); k++) made[k].dead = 1;
    for (const u of st.units) if (u.t === 'SPR' && u.loc < NP && st.prov[u.loc].o === 'SPN') { u.t = 'SPN'; u.auto = 1; u.army = 0; u.path = []; u.gar = 0; }
    st.units = st.units.filter((u) => !u.dead); G.rebuildUnitIndex();
    // milliyetçilerin sanayisi ve dış yardım (HOI4: Lejyon Kondor, CTV; Cumhuriyete Sovyet yardımı)
    G.addFactories('SPN', 'mil', 3); G.addFactories('SPN', 'civ', 2); G.needSummary = 1;
    if (!spn.spirits.includes('nat_aid')) spn.spirits.push('nat_aid'); G.recomputeMods(spn);
    const spr = st.C.SPR; if (spr && !spr.spirits.includes('rep_chaos')) { spr.spirits.push('rep_chaos'); G.recomputeMods(spr); }
    G.setWar('SPN', 'SPR');
    // iç savaş: teslim olan taraf tamamen ilhak edilir; Cumhuriyetin teslim eşiği bölünmüş topraklara göre
    st.civil = (st.civil || []).concat([['SPN', 'SPR']]);
    G.cwDirty = 1; if (st.C.SPR) st.C.SPR.startW = G.coreWeight('SPR', true);
    for (const t of ['GER', 'ITA']) if (alive(t)) G.lend(t, 'SPN', 'inf', 1000);
    if (alive('SOV')) G.lend('SOV', 'SPR', 'inf', 1000);
    if (switchSide && st.player === 'SPR') { st.player = 'SPN'; for (const u of st.units) u.auto = u.t !== 'SPN' ? 1 : 0; if (G.UI) G.UI.hud(); }
    G.log('İspanya İç Savaşı başladı!', ['SPR', 'SPN'], 'major');
  }
  // demand: hedefe toprak talebi. Hedef oyuncuysa karar penceresi, değilse YZ kabul eder.
  function demand(actor, target, title, text, onAccept, onRefuse) {
    if (target === G.st.player) {
      G.queuePopup({ title, text, opts: [
        { n: 'Kabul et', fx: onAccept },
        { n: 'Reddet (savaş riski)', fx: onRefuse },
      ] });
    } else onAccept();
  }

  const EVENTS = [
    { id: 'axis', date: '1936-10-25', actor: 'GER', title: 'Roma-Berlin Mihveri',
      text: 'Almanya ve İtalya, ortak çıkarlar etrafında bir ittifak oluşturmak üzere anlaştı.',
      cond: () => alive('GER') && alive('ITA') && !facOf('ITA'),
      opts: [{ n: 'Mihveri kur', fx: () => { ensureAxis(); if (ai('ITA')) joinAxis('ITA'); else G.queuePopup({ title: 'Mihvere Davet', text: 'Almanya, İtalya\'yı Mihver ittifakına davet ediyor.', opts: [{ n: 'Katıl', fx: () => joinAxis('ITA') }, { n: 'Reddet', fx: () => {} }] }); } }, { n: 'Yalnız kal', fx: () => {} }] },
    { id: 'china', date: '1937-07-07', actor: 'JAP', title: 'Marco Polo Köprüsü Olayı',
      text: 'Pekin yakınlarında Japon ve Çin birlikleri çatıştı. Tokyo\'daki şahinler topyekûn savaş istiyor.',
      cond: () => alive('JAP') && alive('CHI') && !G.atWar('JAP', 'CHI'),
      opts: [{ n: 'Çin\'e savaş ilan et', fx: () => {
        war('JAP', 'CHI');
        // Mançukuo (Japon kuklası) savaşa katılır; Kwantung Ordusu Mançurya'dan Kuzey Çin'e iner
        if (alive('MAN') && G.atWar('JAP', 'CHI')) { G.st.access['JAP>MAN'] = 1; G.st.access['MAN>JAP'] = 1; if (G.st.player !== 'MAN') war('MAN', 'CHI'); }
      } }, { n: 'Barışı koru', fx: () => {} }] },
    { id: 'scw', date: '1936-07-17', actor: 'SPR', title: 'İspanya İç Savaşı',
      text: 'General Franco liderliğindeki milliyetçi subaylar Fas\'ta ayaklandı. Ülke ikiye bölündü: Cumhuriyetçiler Madrid ve Barselona\'yı, milliyetçiler kuzeybatıyı, Endülüs\'ü ve Fas\'ı tutuyor.',
      cond: () => alive('SPR') && !alive('SPN'),
      opts: [{ n: 'Cumhuriyeti savun', fx: () => scw(false) }, { n: 'Milliyetçilerin tarafına geç', fx: () => scw(true) }] },
    { id: 'ataturk', date: '1938-11-10', actor: 'TUR', title: 'Atatürk\'ün Ölümü',
      text: 'Cumhuriyetin kurucusu Mustafa Kemal Atatürk Dolmabahçe Sarayı\'nda hayatını kaybetti. Millet yasta. Meclis, İsmet İnönü\'yü cumhurbaşkanı seçti.',
      cond: () => alive('TUR') && G.st.C.TUR.leader === 'Mustafa Kemal Atatürk',
      opts: [{ n: 'Millî Şef İsmet İnönü', fx: () => { const c = G.st.C.TUR; c.leader = 'İsmet İnönü'; if (!c.spirits.includes('inonu')) c.spirits.push('inonu'); c.stabX -= 0.05; G.recomputeMods(c); G.log('İsmet İnönü cumhurbaşkanı seçildi.', ['TUR'], 'major'); } }] },
    { id: 'anschluss', date: '1938-03-12', actor: 'GER', title: 'Anschluss',
      text: 'Almanya, Avusturya\'nın Reich\'a katılmasını talep ediyor.',
      cond: () => alive('GER') && alive('AUS') && !G.atWar('GER', 'AUS'),
      opts: [{ n: 'Avusturya\'yı talep et', fx: () => demand('GER', 'AUS', 'Anschluss', 'Almanya, Avusturya\'nın Reich\'a katılmasını talep ediyor.', () => { G.annex('GER', 'AUS'); G.log('Avusturya, Almanya\'ya katıldı (Anschluss).', ['GER', 'AUS'], 'major'); G.st.tension += 8; }, () => war('GER', 'AUS')) }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'sudeten', date: '1938-09-30', actor: 'GER', title: 'Münih Anlaşması',
      text: 'Almanya, Çekoslovakya\'nın Südet bölgesini talep ediyor. Britanya ve Fransa savaşa girmek istemiyor.',
      cond: () => alive('GER') && alive('CZE') && !G.atWar('GER', 'CZE'),
      opts: [{ n: 'Südetleri talep et', fx: () => demand('GER', 'CZE', 'Münih Anlaşması', 'Almanya, Südet bölgesini talep ediyor. Büyük güçler araya girmeyecek.', () => {
        G.annex('GER', 'CZE', (i) => P[i].lon < 18.2 && P[i].a.some((j) => G.st.prov[j].o === 'GER'));
        G.log('Südet bölgesi Almanya\'ya bırakıldı.', ['GER', 'CZE'], 'major'); G.st.tension += 8;
      }, () => war('GER', 'CZE')) }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'czeend', date: '1939-03-15', actor: 'GER', title: 'Çekoslovakya\'nın Sonu',
      text: 'Slovakya bağımsızlık ilan etti. Almanya, Bohemya ve Moravya\'yı himayesine almak istiyor.',
      cond: () => alive('GER') && alive('CZE') && !G.atWar('GER', 'CZE') && G.st.ev.sudeten,
      opts: [{ n: 'Bohemya ve Moravya\'yı al', fx: () => demand('GER', 'CZE', 'Bohemya ve Moravya', 'Almanya kalan Çek topraklarını talep ediyor.', () => {
        if (!alive('SLO')) G.release('SLO', 'CZE', (i) => P[i].lon >= 17.0 && P[i].lon < 22.3);
        if (alive('HUN')) G.annex('HUN', 'CZE', (i) => P[i].lon >= 22.3);
        G.annex('GER', 'CZE');
        if (alive('SLO')) joinAxis('SLO');
        G.log('Çekoslovakya parçalandı. Slovakya bağımsız.', ['GER', 'CZE'], 'major'); G.st.tension += 10;
      }, () => war('GER', 'CZE')) }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'albania', date: '1939-04-07', actor: 'ITA', title: 'Arnavutluk\'un İşgali',
      text: 'İtalya, Arnavutluk\'u himayesine almak istiyor.',
      cond: () => alive('ITA') && alive('ALB') && !G.atWar('ITA', 'ALB'),
      opts: [{ n: 'Arnavutluk\'u talep et', fx: () => demand('ITA', 'ALB', 'İtalyan Ültimatomu', 'İtalya, Arnavutluk\'un İtalyan tacına bağlanmasını talep ediyor.', () => { G.annex('ITA', 'ALB'); G.log('Arnavutluk İtalya\'ya bağlandı.', ['ITA', 'ALB'], 'major'); }, () => war('ITA', 'ALB')) }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'guarpol', date: '1939-03-31', actor: 'ENG', title: 'Polonya\'ya Garanti',
      text: 'Britanya ve Fransa, Polonya\'nın bağımsızlığını garanti etmeyi düşünüyor.',
      cond: () => alive('ENG') && alive('POL'),
      opts: [{ n: 'Polonya\'yı garanti et', fx: () => { G.guarantee('ENG', 'POL'); if (alive('FRA')) G.guarantee('FRA', 'POL'); } }, { n: 'Karışma', fx: () => {} }] },
    { id: 'mr', date: '1939-08-23', actor: 'GER', title: 'Molotov-Ribbentrop Paktı',
      text: 'Almanya ve Sovyetler Birliği gizli protokollerle bir saldırmazlık paktı imzalamaya hazırlanıyor.',
      cond: () => alive('GER') && alive('SOV') && !G.atWar('GER', 'SOV'),
      opts: [{ n: 'Paktı imzala', fx: () => { if (ai('SOV') || G.st.player === 'GER') { G.st.pacts[G.pairKey('GER', 'SOV')] = 'nap'; G.st.ev.mrPact = 1; G.log('Molotov-Ribbentrop Paktı imzalandı.', ['GER', 'SOV'], 'major'); } } }, { n: 'İmzalama', fx: () => {} }],
      targetPrompt: 'SOV' },
    { id: 'poland', date: '1939-09-01', actor: 'GER', title: 'Beyaz Durum (Fall Weiss)',
      text: 'Ordu Polonya sınırında hazır bekliyor. Taarruz emri verilsin mi?',
      cond: () => alive('GER') && alive('POL') && !G.atWar('GER', 'POL'),
      opts: [{ n: 'Polonya\'yı işgal et', fx: () => { G.st.goals['GER>POL'] = G.st.day; war('GER', 'POL'); } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'sovpol', date: '1939-09-17', actor: 'SOV', title: 'Doğu Polonya',
      text: 'Polonya çöküyor. Gizli protokol uyarınca doğu Polonya\'ya girmenin zamanı geldi.',
      cond: () => alive('SOV') && alive('POL') && G.atWar('GER', 'POL') && !G.atWar('SOV', 'POL') && G.st.ev.mrPact,
      opts: [{ n: 'Doğu Polonya\'ya gir', fx: () => G.declareWar('SOV', 'POL', { only: true }) }, { n: 'Bekle', fx: () => {} }] },
    { id: 'winter', date: '1939-11-30', actor: 'SOV', title: 'Kış Savaşı',
      text: 'Finlandiya, Leningrad\'ı koruyacak toprak değişimini reddetti.',
      cond: () => alive('SOV') && alive('FIN') && !G.atWar('SOV', 'FIN') && !facOf('FIN'),
      opts: [{ n: 'Finlandiya\'ya saldır', fx: () => G.declareWar('SOV', 'FIN', { alone: true }) }, { n: 'Bekle', fx: () => {} }] },
    { id: 'weser', date: '1940-04-09', actor: 'GER', title: 'Weserübung',
      text: 'İsveç demirinin güvenliği için Danimarka ve Norveç\'in işgali planlandı.',
      cond: () => alive('GER') && G.st.C.GER.enemies.length > 0 && (alive('DEN') || alive('NOR')),
      opts: [{ n: 'Danimarka ve Norveç\'i işgal et', fx: () => { war('GER', 'DEN'); war('GER', 'NOR'); } }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'gelb', date: '1940-05-10', actor: 'GER', title: 'Sarı Durum (Fall Gelb)',
      text: 'Batı taarruzu Ardenler ve Alçak Ülkeler üzerinden başlayabilir.',
      cond: () => alive('GER') && (alive('BEL') || alive('HOL')) && G.st.C.GER.enemies.includes('FRA'),
      opts: [{ n: 'Batı taarruzunu başlat', fx: () => { war('GER', 'BEL'); war('GER', 'HOL'); war('GER', 'LUX'); G.timedSpirit('GER', 'sichelschnitt', 150); G.timedSpirit('FRA', 'fra_shock', 200); } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'baltic', date: '1940-06-15', actor: 'SOV', title: 'Baltık Ültimatomu',
      text: 'Sovyetler Birliği Baltık devletlerinin Birliğe katılmasını talep ediyor.',
      cond: () => alive('SOV') && (alive('EST') || alive('LAT') || alive('LIT')),
      opts: [{ n: 'Baltıkları talep et', fx: () => { for (const t of ['EST', 'LAT', 'LIT']) if (alive(t) && !G.atWar('SOV', t) && !facOf(t)) demand('SOV', t, 'Sovyet Ültimatomu', 'Sovyetler Birliği ülkenin Birliğe katılmasını talep ediyor.', () => { G.annex('SOV', t); G.log(`${G.cname(t)} Sovyetler Birliği\'ne katıldı.`, ['SOV', t], 'major'); }, () => G.declareWar('SOV', t, { alone: true })); } }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'bessarabia', date: '1940-06-28', actor: 'SOV', title: 'Besarabya',
      text: 'Sovyetler Birliği Romanya\'dan Besarabya ve Kuzey Bukovina\'yı talep ediyor.',
      cond: () => alive('SOV') && alive('ROM') && !G.atWar('SOV', 'ROM'),
      opts: [{ n: 'Besarabya\'yı talep et', fx: () => demand('SOV', 'ROM', 'Sovyet Talebi', 'Sovyetler Birliği Besarabya ve Kuzey Bukovina\'yı istiyor.', () => {
        const poly = [[25.0, 48.6], [28.2, 48.4], [29.5, 47.9], [30.3, 46.4], [29.8, 45.2], [28.15, 45.35], [28.0, 46.2], [27.2, 47.5], [26.2, 48.0], [25.0, 47.8]];
        G.annex('SOV', 'ROM', (i) => inPoly(P[i].lon, P[i].lat, poly));
        G.log('Besarabya Sovyetlere bırakıldı.', ['SOV', 'ROM'], 'major');
      }, () => G.declareWar('SOV', 'ROM', { alone: true })) }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'itajoin', date: '1940-06-10', actor: 'ITA', title: 'İtalya Savaşa Giriyor',
      text: 'Fransa çökmek üzere. Mussolini savaş masasında yer almak istiyor.',
      cond: () => alive('ITA') && alive('GER') && G.sameFaction('ITA', 'GER') && G.st.C.GER.enemies.length > 0 && !G.st.C.ITA.enemies.includes('ENG'),
      opts: [{ n: 'Müttefiklere savaş ilan et', fx: () => { for (const t of G.st.C.GER.enemies.slice()) if (!G.atWar('ITA', t)) G.setWar('ITA', t); G.log('İtalya, Müttefiklere savaş ilan etti!', ['ITA'], 'major'); } }, { n: 'Tarafsız kal', fx: () => {} }] },
    { id: 'tripartite', date: '1940-09-27', actor: 'JAP', title: 'Üçlü Pakt',
      text: 'Japonya, Almanya ve İtalya ile ittifak kurmayı değerlendiriyor.',
      cond: () => alive('JAP') && alive('GER') && facOf('GER') && !G.sameFaction('JAP', 'GER'),
      opts: [{ n: 'Mihvere katıl', fx: () => { const old = facOf('JAP'); const members = old ? G.st.factions[old].members.slice() : ['JAP']; for (const t of members) joinAxis(t); } }, { n: 'Bağımsız kal', fx: () => {} }] },
    { id: 'greece', date: '1940-10-28', actor: 'ITA', title: 'Yunanistan\'a Ültimatom',
      text: 'Mussolini, Yunanistan\'dan stratejik noktaların teslimini istiyor.',
      cond: () => alive('ITA') && alive('GRE') && !G.atWar('ITA', 'GRE') && G.st.C.ITA.enemies.length > 0,
      opts: [{ n: 'Yunanistan\'a saldır', fx: () => war('ITA', 'GRE') }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'hunjoin', date: '1940-11-20', actor: 'HUN', title: 'Macaristan Mihvere Katılıyor', text: 'Macaristan, Mihver ittifakına katılmaya davet edildi.',
      cond: () => alive('HUN') && facOf('GER') && !facOf('HUN'), opts: [{ n: 'Katıl', fx: () => joinAxis('HUN') }, { n: 'Reddet', fx: () => {} }] },
    { id: 'romjoin', date: '1940-11-23', actor: 'ROM', title: 'Romanya Mihvere Katılıyor', text: 'Antonescu yönetimindeki Romanya, Mihvere yaklaşıyor.',
      cond: () => alive('ROM') && facOf('GER') && !facOf('ROM') && !G.atWar('ROM', 'GER'), opts: [{ n: 'Katıl', fx: () => joinAxis('ROM') }, { n: 'Reddet', fx: () => {} }] },
    { id: 'buljoin', date: '1941-03-01', actor: 'BUL', title: 'Bulgaristan Mihvere Katılıyor', text: 'Bulgaristan, Üçlü Pakt\'ı imzalamaya davet edildi.',
      cond: () => alive('BUL') && facOf('GER') && !facOf('BUL'), opts: [{ n: 'Katıl', fx: () => joinAxis('BUL') }, { n: 'Reddet', fx: () => {} }] },
    { id: 'yugo', date: '1941-04-06', actor: 'GER', title: 'Balkan Harekâtı',
      text: 'Belgrad\'daki darbe Mihver karşıtı bir hükümeti iktidara getirdi.',
      cond: () => alive('GER') && alive('YUG') && !G.atWar('GER', 'YUG') && !facOf('YUG'),
      opts: [{ n: 'Yugoslavya\'yı işgal et', fx: () => { war('GER', 'YUG'); if (alive('GRE')) war('GER', 'GRE'); } }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'jsnap', date: '1941-04-13', actor: 'JAP', title: 'Sovyet-Japon Tarafsızlık Paktı',
      text: 'Matsuoka Moskova\'da: Japonya ile Sovyetler Birliği birbirine saldırmama sözü veriyor.',
      cond: () => alive('JAP') && alive('SOV') && !G.atWar('JAP', 'SOV') && G.st.player !== 'SOV',
      opts: [{ n: 'Paktı imzala', fx: () => {
        // pakt Japonya'nın kuklası Mançukuo'yu ve Sovyet uydusu Moğolistan'ı da kapsar
        for (const [x, y] of [['JAP', 'SOV'], ['MAN', 'SOV'], ['JAP', 'MON'], ['MAN', 'MON']]) if (alive(x) && alive(y) && !G.atWar(x, y)) G.st.pacts[G.pairKey(x, y)] = 'nap';
        G.log('Sovyet-Japon Tarafsızlık Paktı imzalandı.', ['JAP', 'SOV'], 'major');
      } }, { n: 'İmzalama', fx: () => {} }] },
    { id: 'indochina', date: '1941-07-24', actor: 'JAP', title: 'Fransız Çinhindi',
      text: 'Japonya, Fransız Çinhindi\'nde askerî üsler talep ediyor.',
      cond: () => alive('JAP') && alive('FRA') && !G.atWar('JAP', 'FRA') && G.st.prov[G.st.C.FRA.cap0]?.c !== 'FRA' && G.st.player !== 'FRA',
      opts: [{ n: 'Üsleri talep et', fx: () => { G.st.access['JAP>FRA'] = 1; G.log('Japon birlikleri Fransız Çinhindi\'ne girdi.', ['JAP', 'FRA'], 'major'); } }, { n: 'Vazgeç', fx: () => {} }] },
    { id: 'barbarossa', date: '1941-06-22', actor: 'GER', title: 'Barbarossa Harekâtı',
      text: 'Tarihin en büyük işgal ordusu Sovyet sınırında. Saldırı emri verilsin mi?',
      cond: () => alive('GER') && alive('SOV') && !G.atWar('GER', 'SOV') && (G.st.player === 'GER' || G.st.prov[G.st.C.FRA.cap0]?.c !== 'FRA') && G.st.prov[G.st.C.GER.cap0]?.c === 'GER', retryUntil: '1943-06-01',
      opts: [{ n: 'Sovyetler Birliği\'ne saldır', fx: () => { delete G.st.pacts[G.pairKey('GER', 'SOV')]; war('GER', 'SOV'); for (const t of ['ROM', 'HUN', 'SLO', 'FIN', 'ITA']) if (alive(t) && ai(t) && (G.sameFaction(t, 'GER') || t === 'FIN') && !G.atWar(t, 'SOV')) G.setWar(t, 'SOV'); G.timedSpirit('SOV', 'barb_surprise', 120); G.timedSpirit('GER', 'barb_drive', 160); if (alive('FIN') && ai('FIN') && !G.atWar('FIN', 'SOV')) { joinAxis('FIN'); } } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'pearl', date: '1941-12-07', actor: 'JAP', title: 'Pearl Harbor',
      text: 'ABD petrol ambargosu uyguluyor. Donanma, Pasifik Filosu\'na ani bir baskın planladı.',
      cond: () => alive('JAP') && alive('USA') && !G.atWar('JAP', 'USA'),
      opts: [{ n: 'Saldır', fx: () => {
        war('JAP', 'USA'); if (alive('ENG')) war('JAP', 'ENG'); if (alive('HOL')) war('JAP', 'HOL');
        if (alive('USA') && ai('USA') && !facOf('USA') && G.st.factions.allies) G.joinFaction('USA', 'allies');
        // Siyam Japonya'ya geçit verir ve İngiltere'ye savaş açar (Ocak 1942)
        if (alive('SIA') && ai('SIA') && !G.atWar('SIA', 'JAP')) { G.st.access['JAP>SIA'] = 1; G.st.access['SIA>JAP'] = 1; if (alive('ENG')) G.setWar('SIA', 'ENG'); }
        // Güneye ilerleme: Malaya, Filipinler, Hong Kong ve Pasifik adaları
        if (G.st.opts.hist && ai('JAP')) { const n = G.landing(['JAP'], ['Kota Bharu', 'Manila', 'Hong Kong', 'Guam', 'Wake'], 16, 'landing'); if (n) G.log(`Japonya Malaya, Filipinler ve Hong Kong'a çıkarma yaptı (${n} tümen).`, ['JAP'], 'major'); }
      } }, { n: 'Diplomasiyi dene', fx: () => {} }] },
    { id: 'midway', date: '1942-06-04', actor: 'USA', title: 'Midway Muharebesi', text: 'ABD şifre çözücüleri Japon saldırı planını okudu: Midway\'de pusu.',
      cond: () => alive('JAP') && alive('USA') && G.atWar('USA', 'JAP') && G.st.opts.hist,
      opts: [{ n: 'Pusuyu kur', fx: () => { let k = 4; for (const f of G.st.C.JAP.fleets || []) { const x = Math.min(k, f.sh.cv || 0); f.sh.cv -= x; k -= x; } G.log('Midway Muharebesi: Japonya dört uçak gemisini kaybetti; Pasifik\'te deniz üstünlüğü el değiştirdi.', ['USA', 'JAP'], 'major'); } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'dei', date: '1942-01-11', actor: 'JAP', title: 'Güney Kaynak Bölgesi',
      text: 'Hollanda Doğu Hint Adaları\'nın petrolü Japon savaş makinesi için hayati.',
      cond: () => alive('JAP') && G.st.opts.hist && (G.atWar('JAP', 'HOL') || G.atWar('JAP', 'ENG')), retryUntil: '1942-06-01',
      opts: [{ n: 'Çıkarma yap', fx: () => { const n = G.landing(['JAP'], ['Balikpapan', 'Palembang', 'Medan', 'Kuching', 'Rabaul', 'Batavya'], 12, 'landing'); if (n) G.log(`Japonya Hollanda Doğu Hint Adaları ve Yeni Gine'ye çıktı (${n} tümen).`, ['JAP'], 'major'); } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'usager', date: '1941-12-11', actor: 'GER', title: 'ABD\'ye Savaş İlanı',
      text: 'Japonya ile dayanışma içinde ABD\'ye savaş ilan edilsin mi?',
      cond: () => alive('GER') && alive('USA') && !G.atWar('GER', 'USA') && G.atWar('JAP', 'USA') && G.sameFaction('GER', 'JAP'),
      opts: [{ n: 'Savaş ilan et', fx: () => war('GER', 'USA') }, { n: 'Bekle', fx: () => {} }] },
    // Achse Harekâtı (Eylül 1943): İtalya teslim olunca Almanya, Müttefiklerin almadığı İtalyan topraklarını
    // işgal eder ve cepheyi İtalya'da tutar (Gustav ve Gotik hatları). Tarihe değil İtalya'nın teslimine bağlıdır.
    { id: 'achse', date: '1939-09-01', actor: 'GER', title: 'Achse Harekâtı',
      text: 'İtalya Müttefiklerle ateşkes imzaladı. Alman birlikleri İtalyan ordusunu silahsızlandırıp yarımadayı savunmaya hazır.',
      cond: () => G.st.opts.hist && alive('GER') && alive('ITA') && G.st.C.ITA.capd && !G.st.C.ITA.enemies.length && !G.st.conf && G.st.player !== 'ITA' && ['ENG', 'USA'].some((t) => G.atWar('GER', t)), retryUntil: '1946-12-31',
      opts: [{ n: 'İtalya\'yı işgal et', fx: () => {
        const st = G.st; let n = 0;
        // iller asli İtalyan toprağı olarak kalır (direniş birikir); Almanya teslim olunca İtalya barışta yeniden kurulabilir
        for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === 'ITA' && pr.c === 'ITA') { pr.o = pr.c = 'GER'; pr.cd = st.day; n++; } }
        // İtalyan ordusu silahsızlandırılır
        st.units = st.units.filter((u) => !(u.t === 'ITA' && u.loc < NP && st.prov[u.loc].c === 'GER')); G.rebuildUnitIndex();
        G.mapDirty = 1; G.needSummary = 1; G.supDirty = 1; G.cwDirty = 1;
        G.log(`Achse Harekâtı: Almanya ${n} İtalyan ilini işgal etti; İtalya cephesi sürüyor.`, ['GER', 'ITA'], 'major');
      } }, { n: 'İtalya\'yı kendi hâline bırak', fx: () => {} }] },
    // Madrid'in düşüşü (28 Mart 1939): Cumhuriyet toprağının önemli bölümünü yitirmişse teslim olur
    { id: 'madrid', date: '1939-03-28', actor: 'SPN', title: 'Madrid\'in Düşüşü',
      text: 'Cumhuriyet cephesi çöktü; Madrid\'de Casado darbesi direnişi sona erdirdi. Milliyetçiler zaferini ilan ediyor.',
      cond: () => G.st.opts.hist && alive('SPN') && alive('SPR') && G.atWar('SPN', 'SPR') && G.st.player !== 'SPR' && ((G.st.C.SPR.surrender || 0) >= 0.35 || G.st.day >= G.dayOf('1939-04-15')), retryUntil: '1941-12-31',
      opts: [{ n: 'Zaferi ilan et', fx: () => { if (alive('SPR') && G.atWar('SPN', 'SPR')) G.capitulate('SPR'); } }, { n: 'Savaşa devam', fx: () => {} }] },
    // Volkssturm (Eylül 1944): Alman asli toprakları tehdit altına girince halk milisi kurulur.
    // Tarihe değil duruma bağlıdır; oyuncu tarihi değiştirse de Almanya ilk ciddi kayıpta milis kurar.
    { id: 'volkssturm', date: '1939-09-01', actor: 'GER', title: 'Volkssturm',
      text: 'Düşman ordular Reich\'ın sınırlarına dayandı. 16 ile 60 yaş arasındaki bütün erkekler halk milisine çağrılıyor.',
      cond: () => alive('GER') && G.st.C.GER.enemies.length > 0 && (G.st.C.GER.surrender || 0) >= 0.12, retryUntil: '1949-12-31',
      opts: [{ n: 'Volkssturm\'u kur', fx: () => {
        const st = G.st, c = st.C.GER;
        if (!c.spirits.includes('volkssturm')) { c.spirits.push('volkssturm'); G.recomputeMods(c); }
        // milisler düşmanın yaklaştığı asli illere (iki adım içinde düşman kontrolü) yerleşir; yoksa büyük şehirlere
        const own = (i) => st.prov[i].c === 'GER' && st.prov[i].core === 'GER';
        const hot = (i) => P[i].a.some((j) => G.atWar('GER', st.prov[j].c) || P[j].a.some((k2) => G.atWar('GER', st.prov[k2].c)));
        let L = []; for (let i = 0; i < NP; i++) if (own(i) && hot(i)) L.push(i);
        if (L.length < 4) { L = []; for (let i = 0; i < NP; i++) if (own(i)) L.push(i); }
        L.sort((a, b) => P[b].vp - P[a].vp || b - a);
        const n = Math.min(30, L.length * 3);
        for (let k = 0; k < n; k++) { const u = G.makeUnit('GER', 'inf', L[k % Math.min(15, L.length)], 0.8); u.xp = 0.05; st.units.push(u); }
        if (n) G.rebuildUnitIndex();
        G.log(`Almanya Volkssturm\'u kurdu: ${n} milis tümeni.`, ['GER'], 'major');
      } }, { n: 'Reddet', fx: () => {} }] },
    { id: 'usajoin', date: '1942-03-01', actor: 'USA', title: 'Demokrasinin Cephaneliği',
      text: 'Avrupa\'daki savaş ABD\'yi de içine çekiyor. Müttefiklere katılalım mı?',
      cond: () => alive('USA') && !facOf('USA') && G.st.factions.allies && G.st.factions.allies.members.some((t) => G.st.C[t].enemies.length),
      opts: [{ n: 'Müttefiklere katıl', fx: () => G.joinFaction('USA', 'allies') }, { n: 'Tarafsız kal', fx: () => {} }] },
  ];
  // Müttefik çıkarmaları (Husky, Overlord): seçilen tümenler kıyıya bitişik deniz bölgesinden saldırır
  G.landing = (tags, names, n, sp) => {
    const st = G.st;
    const tgt = names.map((nm) => P.findIndex((p) => p.n === nm)).filter((i) => i >= 0 && G.atWar(tags[0], st.prov[i].c));
    if (!tgt.length) return 0;
    // cephe gerisindeki birlikler ve kalabalık cephe eyaletlerindeki fazlalık (eyalette en az 2 tümen kalır)
    const here = (n) => (G.unitsAt[n] || []).filter((x) => tags.includes(x.t)).length;
    const taken = new Map();
    const pool = st.units.filter((u) => {
      if (!tags.includes(u.t) || u.loc >= NP || u.gar || u.path.length || (G.inBattle && G.inBattle.has(u)) || u.str <= 0.7) return false;
      if (!P[u.loc].a.some((j) => G.atWar(u.t, st.prov[j].c))) return true;
      const k = taken.get(u.loc) || 0; if (here(u.loc) - k <= 2) return false;
      taken.set(u.loc, k + 1); return true;
    });
    pool.sort((a, b) => G.unitPower(b) - G.unitPower(a));
    let k = 0;
    for (const u of pool.slice(0, n)) {
      const t = tgt[k++ % tgt.length]; const sea = P[t].s[0]; if (sea == null) continue;
      const L = G.unitsAt[u.loc]; if (L) { const i = L.indexOf(u); if (i >= 0) L.splice(i, 1); }
      u.loc = NP + sea; u.path = [t]; u.prog = 0; u.auto = 1; u.army = 0; u.ent = 0;
      (G.unitsAt[u.loc] || (G.unitsAt[u.loc] = [])).push(u);
    }
    if (sp) for (const t of tags) G.timedSpirit(t, sp, 150);
    return Math.min(n, pool.length);
  };
  EVENTS.push(
    { id: 'husky', date: '1943-07-10', actor: 'ENG', title: 'Husky Harekâtı', text: 'Müttefik kuvvetleri Sicilya\'ya çıkarma yapmaya hazır.',
      cond: () => alive('ITA') && alive('ENG') && G.atWar('ENG', 'ITA') && G.st.opts.hist, retryUntil: '1944-03-01',
      opts: [{ n: 'Sicilya\'ya çık', fx: () => { const n = G.landing(['USA', 'ENG', 'CAN'].filter((t) => alive(t) && G.atWar(t, 'ITA')), ['Palermo', 'Catania'], 8, 'landing'); if (n) G.log(`Müttefikler Sicilya\'ya çıktı (${n} tümen).`, ['ENG', 'ITA'], 'major'); } }, { n: 'Ertele', fx: () => {} }] },
    // Pasifik'te ABD karşı taarruzu ve savaşın sonu
    { id: 'saipan', date: '1944-06-15', actor: 'USA', title: 'Marianalar Harekâtı', text: 'ABD deniz piyadeleri Saipan ve Guam\'a çıkmaya hazır.',
      cond: () => alive('JAP') && G.atWar('USA', 'JAP') && G.st.opts.hist && ['Saipan', 'Guam'].some((nm) => { const i = P.findIndex((p) => p.n === nm); return i >= 0 && G.atWar('USA', G.st.prov[i].c); }), retryUntil: '1945-01-01',
      opts: [{ n: 'Çıkarma yap', fx: () => { const n = G.landing(['USA'], ['Saipan', 'Guam'], 6, 'landing'); if (n) G.log(`ABD Marianalar'a çıktı (${n} tümen).`, ['USA', 'JAP'], 'major'); } }, { n: 'Ertele', fx: () => {} }] },
    { id: 'leyte', date: '1944-10-20', actor: 'USA', title: 'Leyte Körfezi', text: 'MacArthur Filipinler\'e dönmeye hazır: "Geri döndüm."',
      cond: () => alive('JAP') && G.atWar('USA', 'JAP') && G.st.opts.hist && ['Manila', 'Cebu City'].some((nm) => { const i = P.findIndex((p) => p.n === nm); return i >= 0 && G.atWar('USA', G.st.prov[i].c); }), retryUntil: '1945-06-01',
      opts: [{ n: 'Filipinler\'e çık', fx: () => { const n = G.landing(['USA', 'AST'].filter((t) => alive(t) && G.atWar(t, 'JAP')), ['Cebu City', 'San Jose', 'Manila'], 12, 'landing'); if (n) G.log(`ABD Filipinler'e çıktı (${n} tümen).`, ['USA', 'JAP'], 'major'); } }, { n: 'Ertele', fx: () => {} }] },
    { id: 'okinawa', date: '1945-04-01', actor: 'USA', title: 'Buzdağı Harekâtı', text: 'Japon anayurduna giden yolda son durak: Okinawa.',
      cond: () => alive('JAP') && G.atWar('USA', 'JAP') && G.st.opts.hist, retryUntil: '1945-08-01',
      opts: [{ n: 'Okinawa\'ya çık', fx: () => { const n = G.landing(['USA'], ['Okinawa', 'Iwo Jima'], 10, 'landing'); if (n) G.log(`ABD Okinawa ve Iwo Jima'ya çıktı (${n} tümen).`, ['USA', 'JAP'], 'major'); } }, { n: 'Ertele', fx: () => {} }] },
    { id: 'augstorm', date: '1945-08-08', actor: 'SOV', title: 'Ağustos Fırtınası', text: 'Yalta\'da verilen söz: Sovyetler Birliği Japonya\'ya savaş açıyor ve Mançurya\'ya giriyor.',
      cond: () => alive('SOV') && alive('JAP') && !G.atWar('SOV', 'JAP') && G.atWar('USA', 'JAP') && G.st.opts.hist && !G.st.C.GER?.enemies.length,
      opts: [{ n: 'Mançurya\'ya gir', fx: () => { for (const k of [G.pairKey('JAP', 'SOV'), G.pairKey('MAN', 'SOV'), G.pairKey('JAP', 'MON'), G.pairKey('MAN', 'MON')]) delete G.st.pacts[k]; war('SOV', 'JAP'); if (alive('MAN') && !G.atWar('SOV', 'MAN')) war('SOV', 'MAN'); } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'jsurrender', date: '1945-08-15', actor: 'USA', title: 'Japonya\'nın Teslimi', text: 'Hiroşima ve Nagazaki\'ye atom bombası atıldı. İmparator teslim olmayı kabul ediyor.',
      cond: () => alive('JAP') && alive('USA') && G.atWar('USA', 'JAP') && G.st.opts.hist && G.st.player !== 'JAP' && !G.st.C.GER?.enemies.length && usaHolds(0.9), retryUntil: '1946-12-31',
      opts: [{ n: 'Teslimi kabul et', fx: () => { G.log('Hiroşima ve Nagazaki\'ye atom bombası atıldı: Japonya koşulsuz teslim oldu.', ['JAP', 'USA'], 'major'); G.capitulate('JAP'); } }, { n: 'Savaşa devam', fx: () => {} }] },
    { id: 'mansurrender', date: '1945-08-16', actor: 'MAN', title: 'Mançukuo\'nun Çöküşü', text: 'Japonya teslim oldu; Mançukuo ayakta kalamaz.',
      cond: () => alive('MAN') && G.st.C.MAN.enemies.length > 0 && G.st.opts.hist && !(alive('JAP') && G.st.C.JAP.enemies.length) && !G.st.conf, retryUntil: '1946-06-01',
      opts: [{ n: 'Teslim ol', fx: () => G.capitulate('MAN') }, { n: 'Direnmeye devam', fx: () => {} }] },
    { id: 'overlord', date: '1944-06-06', actor: 'USA', title: 'Overlord Harekâtı (D-Günü)', text: 'Tarihin en büyük çıkarma harekâtı Normandiya kıyılarında başlamak üzere.',
      cond: () => alive('GER') && alive('USA') && G.atWar('USA', 'GER') && G.st.opts.hist && ['Caen', 'Cherbourg'].some((nm) => { const i = P.findIndex((p) => p.n === nm); return i >= 0 && G.atWar('USA', G.st.prov[i].c); }), retryUntil: '1945-01-01',
      opts: [{ n: 'Normandiya\'ya çık', fx: () => { const n = G.landing(['USA', 'ENG', 'CAN'].filter((t) => alive(t) && G.atWar(t, 'GER')), ['Caen', 'Cherbourg', 'Rouen'], 16, 'landing'); if (n) G.log(`D-Günü: Müttefikler Normandiya\'ya çıktı (${n} tümen).`, ['USA', 'GER'], 'major'); } }, { n: 'Ertele', fx: () => {} }] },
  );
  G.EVENTS = EVENTS;
  // Tarihî harekâtlar öncesi YZ sınırda yığınak yapar (HOI4 YZ "hazırlık cephesi")
  const PREP = {
    GER: [['POL', '1939-07-10', 'poland'], ['BEL', '1940-03-20', 'gelb'], ['HOL', '1940-03-20', 'gelb'], ['LUX', '1940-03-20', 'gelb'], ['YUG', '1941-03-10', 'yugo'], ['SOV', '1941-04-10', 'barbarossa']],
    JAP: [['CHI', '1937-05-15', 'china']],
    ITA: [['GRE', '1940-09-20', 'greece']],
    // savunma hazırlığı: İngiltere, İtalya savaşa girene dek Mısır-Libya sınırını tutar
    ENG: [['ITA', '1939-09-01', 'itajoin']],
    SOV: [['FIN', '1939-10-20', 'winter'], ['POL', '1939-09-05', 'sovpol']],
  };
  G.prepTargets = (tag) => {
    const st = G.st; if (!st.opts.hist || tag === st.player || !PREP[tag]) return [];
    return PREP[tag].filter(([t, d, ev]) => !st.ev[ev] && st.day >= G.dayOf(d) && st.C[t]?.alive && !G.atWar(tag, t)).map(([t]) => t);
  };
  EVENTS.forEach((e) => (e.day = G.dayOf(e.date)));

  G.popupQueue = [];
  G.queuePopup = (p) => { G.popupQueue.push(p); if (G.onPopup) G.onPopup(); };

  // Oyuncu bu olayların aktörüyse olay tarihinde kendiliğinden çıkmaz: ilgili ulusal odakla gerçekleşir (HOI4).
  // Böylece savaşlar oyuncunun odak ağacı hazır olmadan başlamaz; tarihte yalnızca hatırlatma düşülür.
  const FOCUS_EV = { axis: 'ger_axis', anschluss: 'ger_anschluss', sudeten: 'ger_sudeten', czeend: 'ger_czech', mr: 'ger_mr', poland: 'ger_danzig', weser: 'ger_weser', gelb: 'ger_west', barbarossa: 'ger_barbarossa', china: 'jap_china', pearl: 'jap_pearl', albania: 'ita_albania', greece: 'ita_greece', itajoin: 'ita_egypt', winter: 'sov_winter', baltic: 'sov_baltic', bessarabia: 'sov_bessarabia', guarpol: 'eng_guarantee', usajoin: 'usa_join', hunjoin: 'hun_axis', romjoin: 'rom_axis', buljoin: 'bul_axis' };
  G.FOCUS_EV = FOCUS_EV;
  G.EV_OF_FOCUS = Object.fromEntries(Object.entries(FOCUS_EV).map(([e, f]) => [f, e]));
  G.checkEvents = () => {
    const st = G.st;
    for (const e of EVENTS) {
      if (st.ev[e.id] || st.day < e.day) continue;
      const lf = FOCUS_EV[e.id], pc = st.C[st.player];
      if (lf && e.actor === st.player && pc && G.focusById(pc, lf)) {
        st.evHint = st.evHint || {};
        if (!st.evHint[e.id] && e.cond()) {
          st.evHint[e.id] = 1;
          const f = G.focusById(pc, lf);
          G.log(`Tarihte bugün: ${e.title}. ${pc.focus.done[lf] ? '' : pc.focus.cur === lf ? `"${f.n}" odağın sürüyor.` : `Bunu "${f.n}" ulusal odağıyla başlatabilirsin.`}`, [st.player], 'info');
        }
        continue;
      }
      if (!e.cond()) { if (!(e.retryUntil && st.day < G.dayOf(e.retryUntil))) st.ev[e.id] = 1; continue; }
      st.ev[e.id] = 1; (st.evOk || (st.evOk = {}))[e.id] = 1; // gerçekten yaşanan olaylar (güç dengesi vb.)
      if (!st.opts.hist && e.actor !== st.player && !['axis', 'tripartite', 'hunjoin', 'romjoin', 'buljoin', 'guarpol', 'usajoin'].includes(e.id)) continue;
      if (e.actor === st.player) G.queuePopup({ title: e.title, text: e.text, opts: e.opts, date: st.day });
      else if (e.targetPrompt === st.player) {
        G.queuePopup({ title: e.title, text: e.text + ' Teklifi kabul ediyor musunuz?', opts: [{ n: 'Kabul et', fx: () => { G.st.pacts[G.pairKey('GER', 'SOV')] = 'nap'; G.st.ev.mrPact = 1; G.log('Molotov-Ribbentrop Paktı imzalandı.', ['GER', 'SOV'], 'major'); } }, { n: 'Reddet', fx: () => {} }] });
      } else { e.opts[0].fx(); if (G.newsFor) G.newsFor(e); }
    }
  };
  // [anahtar, tarih, ülke, tümen, hedef eyaletler, yeni birlik mi, son tarih]
  const DEPLOY = [
    ['wdf', '1939-09-03', 'ENG', 3, ['Mersa Matruh', 'İskenderiye', 'Kahire'], 1],
    ['sdf', '1939-09-03', 'ENG', 1, ['Hartum', 'Port Sudan'], 1],
    ['kar', '1939-09-03', 'ENG', 2, ['Nairobi', 'Mombasa'], 1],
    ['saf1', '1940-06-15', 'SAF', 2, ['Nairobi', 'Mombasa'], 0],
    ['raj1', '1940-08-01', 'RAJ', 2, ['Hartum', 'Port Sudan', 'Kahire'], 0],
    ['ast1', '1940-11-15', 'AST', 2, ['İskenderiye', 'Kahire', 'Süveyş'], 0],
    ['nzl1', '1941-01-15', 'NZL', 1, ['Kahire', 'Süveyş'], 0],
    ['raj2', '1941-03-01', 'RAJ', 2, ['Kahire', 'Süveyş', 'Kudüs'], 0],
    ['ast2', '1941-04-01', 'AST', 1, ['İskenderiye', 'Kahire', 'Süveyş'], 0],
    ['saf2', '1941-06-01', 'SAF', 1, ['Kahire', 'Süveyş'], 0],
  ];
  const DEPN = { wdf: 'Mısır (Batı Çölü Kuvveti)', sdf: 'Sudan', kar: 'Kenya', saf1: 'Kenya', raj1: 'Sudan ve Mısır', ast1: 'Mısır', nzl1: 'Mısır', raj2: 'Mısır', ast2: 'Mısır', saf2: 'Mısır' };
  // Birlikleri deniz yoluyla dost bir eyalete gönder (ya da orada yeni sömürge tümeni kur)
  G.deploy = (tag, n, names, spawn) => {
    const st = G.st, c = st.C[tag];
    const ok = (i) => { if (i < 0) return false; const pc = st.prov[i].c; return (pc === tag || (G.friendly(tag, pc) && !G.atWar(tag, pc))) && !G.hostileIn(i, tag); };
    const dests = names.map((nm) => P.findIndex((p) => p.n === nm)).filter(ok);
    if (!dests.length) return 0;
    let sent = 0;
    if (spawn) {
      for (let k = 0; k < n; k++) { const u = G.makeUnit(tag, 'inf', dests[k % dests.length], 1); u.xp = 0.2; st.units.push(u); sent++; }
    } else {
      const home = c.cap >= 0 ? G.landmass[c.cap] : -1;
      const pool = st.units.filter((u) => u.t === tag && u.loc < NP && !u.path.length && G.landmass[u.loc] === home && u.str > 0.6 && !(G.inBattle && G.inBattle.has(u))).sort((a, b) => b.str - a.str);
      const keep = Math.max(1, Math.ceil(pool.length * 0.2));
      for (const u of pool.slice(0, Math.max(0, Math.min(n, pool.length - keep)))) { u.loc = dests[sent % dests.length]; u.path = []; u.prog = 0; u.gar = 0; u.army = 0; sent++; }
    }
    if (sent) G.rebuildUnitIndex();
    return sent;
  };
  // Zamana bağlı ulusal ruhlar (HOI4'teki tarihî ruh değişimleri)
  // Süreli ruh: belirli gün sonra kendiliğinden kalkar
  G.timedSpirit = (t, sp, days) => {
    const st = G.st, c = st.C[t]; if (!c || !c.alive) return;
    if (!c.spirits.includes(sp)) c.spirits.push(sp);
    st.tsp = (st.tsp || []).filter((x) => !(x.t === t && x.sp === sp));
    st.tsp.push({ t, sp, until: st.day + days });
    G.recomputeMods(c);
  };
  G.timedSpirits = () => {
    const st = G.st;
    for (const x of st.tsp || []) if (st.day >= x.until) { const c = st.C[x.t]; if (c) { c.spirits = c.spirits.filter((s2) => s2 !== x.sp); G.recomputeMods(c); } }
    if (st.tsp) st.tsp = st.tsp.filter((x) => st.day < x.until);
    const drop = (t, sp) => { const c = st.C[t]; if (c && c.spirits.includes(sp)) { c.spirits = c.spirits.filter((x) => x !== sp); G.recomputeMods(c); return true; } return false; };
    const add = (t, sp) => { const c = st.C[t]; if (c && c.alive && !c.spirits.includes(sp)) { c.spirits.push(sp); G.recomputeMods(c); return true; } return false; };
    // tarihli (until) ve savaşla (war) kalkan ruhlar; savaşta geçen gün sayacı
    for (const c of Object.values(st.C)) {
      if (!c.alive) continue;
      if (c.enemies.length && c.warDays != null) c.warDays += 5;
      for (const s of c.spirits.slice()) {
        const S = g.SPIRITS[s];
        if (!S || !((S.until && st.day >= G.dayOf(S.until)) || (S.war && c.enemies.length))) continue;
        drop(c.tag, s);
        if (c.tag === st.player) G.log(`Ulusal ruh sona erdi: ${S.n}.`, [c.tag], 'info');
      }
    }
    // Müttefikler savaşarak öğrenir: Almanya yaklaşık dört yıl savaştıktan sonra (tarihte 1943 ortası)
    if (st.day >= G.dayOf('1943-07-01') && (st.C.GER?.warDays ?? 9999) >= 1200 && drop('GER', 'wehrmacht')) G.log('Wehrmacht doktrini üstünlüğünü yitirdi: Müttefik ordular savaşmayı öğrendi.', ['GER'], 'major');
    // Doğu Cephesi: Kızıl Ordu reformları ve Alman yıpranması (tarihî tarihlerde, savaş sürüyorsa)
    const wgs = st.wars[G.pairKey('GER', 'SOV')];
    if (wgs) {
      // savaşın başlangıcına göre (tarihte 1942-11 ve 1943-07): oyuncu Barbarossa'yı geciktirirse kayar
      if (st.day - wgs.since >= 510 && add('SOV', 'stavka')) G.log('Kızıl Ordu: Stavka reformları tamamlandı, büyük karşı taarruzlar başlıyor.', ['SOV'], 'major');
      if (st.day - wgs.since >= 740 && add('SOV', 'deep_ops')) G.log('Kızıl Ordu derin harekât doktrinini uyguluyor.', ['SOV'], 'info');
      if (st.day - wgs.since > 540) add('GER', 'ost_crisis');
      // Stavka yedek orduları (1941-42): topraklar işgal edildikçe hazır tüfek stokları ve yedeklerle
      // yeni tümenler kurulur (toplam en çok 60 tümen, ayda 6-8). Tarihî modda düzelticidir: yalnızca
      // Almanya Doğu'da tarihten ileri gittiğinde; serbest modda Sovyet toprak kaybına bağlı.
      const sov = st.C.SOV;
      const behind = st.opts.hist ? (G.histAhead('GER', 'SOV') ?? -1) > 0.03 : (sov?.surrender || 0) >= 0.12;
      if (sov?.alive && st.day % 30 === 0 && behind && (sov.surrender || 0) >= 0.08 && (st.sovRes || 0) < 60) {
        const n = (sov.surrender || 0) > 0.4 ? 8 : 6, mp = G.T('SOV', 'inf').mp;
        const divs = st.units.filter((u) => u.t === 'SOV').length;
        if (divs < 260 && (sov.mpAvail || 0) > mp * n * 1.5) {
          const L = [];
          for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === 'SOV' && pr.core === 'SOV' && !P[i].a.some((j) => G.atWar('SOV', st.prov[j].c))) L.push(i); }
          L.sort((a, b) => P[b].vp - P[a].vp || a - b);
          const k = Math.min(6, L.length);
          for (let j = 0; j < (k ? n : 0); j++) { const u = G.makeUnit('SOV', 'inf', L[j % k], 0.75); u.xp = 0.05; st.units.push(u); }
          if (k) {
            G.rebuildUnitIndex();
            if (!st.sovRes) G.log('Stavka yedek orduları kuruluyor: yeni tümenler cepheye sevk edilecek.', ['SOV'], 'major');
            else if (st.player === 'SOV') G.log(`Stavka yedeği: ${n} yeni tümen.`, ['SOV'], 'info');
            st.sovRes = (st.sovRes || 0) + n;
          }
        }
      }
    }
    // İspanya İç Savaşı: Milliyetçiler tarihten gerideyse Afrika Ordusu'ndan takviye (Faslı birlikler, Lejyon)
    if (st.opts.hist && st.day % 30 === 10 && G.atWar('SPN', 'SPR') && st.player !== 'SPN' && (st.spnRes || 0) < 14 && (G.histAhead('SPN', 'SPR') ?? 0) < -0.08) {
      const L = []; for (let i = 0; i < NP; i++) if (st.prov[i].c === 'SPN' && !P[i].a.some((j) => G.atWar('SPN', st.prov[j].c))) L.push(i);
      L.sort((a, b) => P[b].vp - P[a].vp || a - b);
      if (L.length) { for (let k = 0; k < 2; k++) { const u = G.makeUnit('SPN', 'inf', L[k % Math.min(3, L.length)], 0.9); u.xp = 0.3; st.units.push(u); } G.rebuildUnitIndex(); st.spnRes = (st.spnRes || 0) + 2; }
    }
    // İspanya İç Savaşı: aylık dış yardım
    if (st.day % 30 === 0 && G.atWar('SPN', 'SPR')) {
      for (const t of ['GER', 'ITA']) if (st.C[t]?.alive && t !== st.player) { G.lend(t, 'SPN', 'inf', 450); G.lend(t, 'SPN', 'art', 12); }
      if (st.C.SOV?.alive && st.player !== 'SOV') { G.lend('SOV', 'SPR', 'inf', 450); G.lend('SOV', 'SPR', 'art', 12); }
    } else if (st.C.SPN?.alive && !G.atWar('SPN', 'SPR') && drop('SPN', 'nat_aid')) {}
    // Ödünç Verme-Kiralama: ABD → İngiltere (1941-03), ABD ve İngiltere → SSCB (Barbarossa'dan sonra)
    if (st.day % 30 === 20) {
      const L = (a, b, inf, mot, tank, art, fig) => { if (!st.C[a]?.alive || !st.C[b]?.alive || st.player === a) return; G.lend(a, b, 'inf', inf); G.lend(a, b, 'mot', mot); G.lend(a, b, 'tank', tank); G.lend(a, b, 'art', art); G.lend(a, b, 'fig', fig); };
      if (st.day >= G.dayOf('1941-03-11') && G.atWar('ENG', 'GER')) L('USA', 'ENG', 1500, 200, 40, 20, 30);
      if (G.atWar('GER', 'SOV') && st.day >= G.dayOf('1941-10-01')) { L('USA', 'SOV', 3000, 600, 80, 40, 40); L('ENG', 'SOV', 800, 100, 30, 0, 20); }
    }
    // Çin'e dış yardım: Sovyet yardımı (1937-41), Burma Yolu ve ABD/İngiliz ödünç verme (1939-)
    if (st.day % 30 === 15 && G.atWar('CHI', 'JAP') && st.C.CHI?.alive) {
      const low = (st.C.CHI.stock.inf || 0) < 5000; // stok tükenince yardım artar
      if (st.C.SOV?.alive && st.player !== 'SOV' && !G.atWar('GER', 'SOV')) { G.lend('SOV', 'CHI', 'inf', low ? 2200 : 1100); G.lend('SOV', 'CHI', 'art', 15); }
      if (st.day >= G.dayOf('1939-01-01')) for (const t of ['USA', 'ENG']) if (st.C[t]?.alive && st.player !== t) G.lend(t, 'CHI', 'inf', st.day >= G.dayOf('1941-03-11') ? 900 : 500);
    }
    // İngiliz Milletler Topluluğu konuşlanmaları (tarihî): sömürge tümenleri ve dominyon seferî kuvvetleri
    if (st.opts.hist) {
      st.dep = st.dep || {};
      for (const [k, d, t, n, dest, spawn, until] of DEPLOY) {
        if (st.dep[k] || st.day < G.dayOf(d)) continue;
        if (st.day > G.dayOf(until || '1942-12-31')) { st.dep[k] = 1; continue; }
        const c = st.C[t]; if (!c?.alive) { st.dep[k] = 1; continue; }
        if (!spawn && (t === st.player || !(G.atWar(t, 'ITA') || G.atWar(t, 'GER')))) continue;
        const sent = G.deploy(t, n, dest, spawn);
        if (sent) { st.dep[k] = 1; G.log(`${G.cname(t)}: ${sent} tümen ${DEPN[k]} bölgesine konuşlandı.`, [t], 'info'); }
      }
    }
    // Çin-Japon Savaşı: Çin'in derinliği, Japonya'nın aşırı yayılması
    const wcj = st.wars[G.pairKey('CHI', 'JAP')];
    if (wcj) { add('CHI', 'chi_scorched'); if (st.day - wcj.since > 150) add('JAP', 'jap_overext'); } else drop('JAP', 'jap_overext');
    const w = st.wars[G.pairKey('GER', 'SOV')];
    if (w && st.day - w.since > 90 && st.C.SOV.alive && add('SOV', 'gpw')) G.log('Sovyetler Birliği: Büyük Vatanseverlik Savaşı ilan edildi.', ['SOV'], 'major');
    if (st.day >= G.dayOf('1941-01-01') && w && st.day - w.since > 180 && drop('SOV', 'purge')) G.log('Kızıl Ordu, Büyük Temizlik\'in etkilerinden kurtuluyor.', ['SOV'], 'info');
  };
})(window);
