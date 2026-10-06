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
    if (!alive('GER')) return null;
    if (facOf('GER')) return facOf('GER');
    return G.createFaction('GER', 'Mihver');
  };
  const joinAxis = (t) => { const f = ensureAxis(); if (f && alive(t) && facOf(t) !== f) G.joinFaction(t, f); };
  const war = (a, b) => { if (alive(a) && alive(b) && !G.atWar(a, b) && !G.sameFaction(a, b)) G.declareWar(a, b); };

  function scw(switchSide) {
    const st = G.st;
    G.release('SPN', 'SPR', (i) => { const p = P[i]; return (p.lon < -4 && p.lat > 40.0) || (p.lon < -4.6 && p.lat < 38.6) || p.lat < 36.05 || (p.lon >= -4 && p.lon <= -1 && p.lat > 41.6 && p.lat < 42.9); });
    const spn = st.C.SPN; spn.stock.inf += 4000; spn.stock.art += 120; spn.stock.fig = 60;
    G.setWar('SPN', 'SPR');
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
      opts: [{ n: 'Çin\'e savaş ilan et', fx: () => war('JAP', 'CHI') }, { n: 'Barışı koru', fx: () => {} }] },
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
      opts: [{ n: 'Paktı imzala', fx: () => { G.st.pacts[G.pairKey('JAP', 'SOV')] = 'nap'; G.log('Sovyet-Japon Tarafsızlık Paktı imzalandı.', ['JAP', 'SOV'], 'major'); } }, { n: 'İmzalama', fx: () => {} }] },
    { id: 'barbarossa', date: '1941-06-22', actor: 'GER', title: 'Barbarossa Harekâtı',
      text: 'Tarihin en büyük işgal ordusu Sovyet sınırında. Saldırı emri verilsin mi?',
      cond: () => alive('GER') && alive('SOV') && !G.atWar('GER', 'SOV') && (G.st.player === 'GER' || G.st.prov[G.st.C.FRA.cap0]?.c !== 'FRA') && G.st.prov[G.st.C.GER.cap0]?.c === 'GER', retryUntil: '1943-06-01',
      opts: [{ n: 'Sovyetler Birliği\'ne saldır', fx: () => { delete G.st.pacts[G.pairKey('GER', 'SOV')]; war('GER', 'SOV'); G.timedSpirit('SOV', 'barb_surprise', 120); G.timedSpirit('GER', 'barb_drive', 160); if (alive('FIN') && ai('FIN') && !G.atWar('FIN', 'SOV')) { joinAxis('FIN'); } } }, { n: 'Bekle', fx: () => {} }] },
    { id: 'pearl', date: '1941-12-07', actor: 'JAP', title: 'Pearl Harbor',
      text: 'ABD petrol ambargosu uyguluyor. Donanma, Pasifik Filosu\'na ani bir baskın planladı.',
      cond: () => alive('JAP') && alive('USA') && !G.atWar('JAP', 'USA'),
      opts: [{ n: 'Saldır', fx: () => { war('JAP', 'USA'); if (alive('ENG')) war('JAP', 'ENG'); if (alive('HOL')) war('JAP', 'HOL'); if (alive('USA') && ai('USA') && !facOf('USA') && G.st.factions.allies) G.joinFaction('USA', 'allies'); } }, { n: 'Diplomasiyi dene', fx: () => {} }] },
    { id: 'usager', date: '1941-12-11', actor: 'GER', title: 'ABD\'ye Savaş İlanı',
      text: 'Japonya ile dayanışma içinde ABD\'ye savaş ilan edilsin mi?',
      cond: () => alive('GER') && alive('USA') && !G.atWar('GER', 'USA') && G.atWar('JAP', 'USA') && G.sameFaction('GER', 'JAP'),
      opts: [{ n: 'Savaş ilan et', fx: () => war('GER', 'USA') }, { n: 'Bekle', fx: () => {} }] },
    { id: 'usajoin', date: '1942-03-01', actor: 'USA', title: 'Demokrasinin Cephaneliği',
      text: 'Avrupa\'daki savaş ABD\'yi de içine çekiyor. Müttefiklere katılalım mı?',
      cond: () => alive('USA') && !facOf('USA') && G.st.factions.allies && G.st.factions.allies.members.some((t) => G.st.C[t].enemies.length),
      opts: [{ n: 'Müttefiklere katıl', fx: () => G.joinFaction('USA', 'allies') }, { n: 'Tarafsız kal', fx: () => {} }] },
  ];
  G.EVENTS = EVENTS;
  EVENTS.forEach((e) => (e.day = G.dayOf(e.date)));

  G.popupQueue = [];
  G.queuePopup = (p) => { G.popupQueue.push(p); if (G.onPopup) G.onPopup(); };

  G.checkEvents = () => {
    const st = G.st;
    for (const e of EVENTS) {
      if (st.ev[e.id] || st.day < e.day) continue;
      if (!e.cond()) { if (!(e.retryUntil && st.day < G.dayOf(e.retryUntil))) st.ev[e.id] = 1; continue; }
      st.ev[e.id] = 1;
      if (!st.opts.hist && e.actor !== st.player && !['axis', 'tripartite', 'hunjoin', 'romjoin', 'buljoin', 'guarpol', 'usajoin'].includes(e.id)) continue;
      if (e.actor === st.player) G.queuePopup({ title: e.title, text: e.text, opts: e.opts, date: st.day });
      else if (e.targetPrompt === st.player) {
        G.queuePopup({ title: e.title, text: e.text + ' Teklifi kabul ediyor musunuz?', opts: [{ n: 'Kabul et', fx: () => { G.st.pacts[G.pairKey('GER', 'SOV')] = 'nap'; G.st.ev.mrPact = 1; G.log('Molotov-Ribbentrop Paktı imzalandı.', ['GER', 'SOV'], 'major'); } }, { n: 'Reddet', fx: () => {} }] });
      } else e.opts[0].fx();
    }
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
    if (st.day >= G.dayOf('1942-06-01') && drop('GER', 'wehrmacht')) G.log('Wehrmacht doktrini üstünlüğünü yitirdi: Müttefik ordular savaşmayı öğrendi.', ['GER'], 'major');
    const w = st.wars[G.pairKey('GER', 'SOV')];
    if (w && st.day - w.since > 90 && st.C.SOV.alive && add('SOV', 'gpw')) G.log('Sovyetler Birliği: Büyük Vatanseverlik Savaşı ilan edildi.', ['SOV'], 'major');
    if (st.day >= G.dayOf('1941-01-01') && w && drop('SOV', 'purge')) G.log('Kızıl Ordu, Büyük Temizlik\'in etkilerinden kurtuluyor.', ['SOV'], 'info');
  };
})(window);
