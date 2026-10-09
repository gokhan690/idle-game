// Tarihî dönüm noktaları (HOI4): Fransa'nın düşüşü ve Vichy, Doğu Cephesi'nde Moskova ve Leningrad savunması,
// Almanya'nın son dönem yedekleri.
// - Compiègne Mütarekesi: Paris düşünce Fransa ateşkes imzalar. Kuzey ve Atlantik kıyısı Alman işgalinde kalır,
//   güneyde Pétain'in Vichy hükümeti tarafsız kalır; Alsas-Loren Almanya'ya bağlanır.
// - Anton Harekâtı (Kasım 1942): Almanya Vichy bölgesini de işgal eder.
// - Paris'in Kurtuluşu: Müttefikler Paris'i alınca Hür Fransa (de Gaulle) savaşa döner, kurtarılan iller Fransa'ya geçer.
// - Mozhaisk ve Luga hatları (Temmuz 1941): Moskova ve Leningrad çevresine tahkimat.
// - Sibirya tümenleri (Ekim 1941): Japonya saldırmayacağı anlaşılınca Uzak Doğu ordusu Moskova'ya gelir.
// - Yedek Ordu (1943-45, tarihî mod): Almanya asli topraklarını tarihten hızlı kaybederse yedek tümenler kurar.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const alive = (t) => G.st.C[t]?.alive;
  const pidx = (n) => P.findIndex((p) => p.n === n);
  const axisSide = (t) => t === 'GER' || G.sameFaction(t, 'GER');
  const alliedSide = (t) => t !== 'FRA' && G.st.C.ENG && (t === 'ENG' || G.sameFaction(t, 'ENG') || t === 'USA');
  // Fransa anakarası (Korsika dahil)
  const metro = (i) => P[i].lat > 41 && P[i].lat < 51.6 && P[i].lon > -5.6 && P[i].lon < 9.7;
  // 1940 işgal bölgesi: kuzey ve Atlantik kıyı şeridi
  const occZone = (i) => P[i].lat >= 46.6 || (P[i].lon < 0.2 && P[i].lat >= 43.3);
  const ALSACE = ['Strazburg', 'Metz', 'Mulhouse'];
  const news = (title, text) => { const st = G.st; if (st.player && G.newsOn !== false) G.queuePopup({ eyebrow: 'Dünya haberleri · ' + G.fmtDate(st.day), title, text, opts: [{ n: 'Tamam', fx: () => {} }] }); };

  // ---------- Fransa ----------
  const armistice = () => {
    const st = G.st, c = st.C.FRA; if (!c || !c.alive) return;
    st.vichy = 1;
    // Mihver ile savaşlar biter (Fransa ile savaşan öteki ülkelerle de)
    for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === 'FRA' || b === 'FRA') delete st.wars[k]; }
    if (c.fac) G.leaveFaction('FRA');
    delete st.guar.FRA; c.capd = st.day; // verdiği garantiler düşer; garanti yoluyla savaşa çekilmez
    const paris = pidx('Paris'), nice = pidx('Nice');
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (pr.o !== 'FRA' || !metro(i)) { if (pr.c === 'FRA' && pr.o !== 'FRA') pr.c = pr.o; continue; }
      if (ALSACE.includes(P[i].n)) { pr.o = 'GER'; pr.c = 'GER'; continue; }
      pr.c = occZone(i) ? 'GER' : 'FRA';
    }
    if (nice >= 0 && alive('ITA') && axisSide('ITA')) st.prov[nice].c = 'ITA';
    // Vichy hükümeti: Pétain, tarafsız; küçük bir ateşkes ordusu
    const vichy = pidx('Vichy');
    if (vichy >= 0) c.cap = vichy; // asıl başkent (cap0) Paris kalır: Barbarossa gibi olaylar Paris'in düşüşüne bakar
    c.ideo = 'neu'; c.pop.neu = Math.max(c.pop.neu || 0, 0.5); if (G.normalizePop) G.normalizePop(c);
    c.leader = 'Philippe Pétain'; c.surrender = 0; c.train = [];
    let kept = 0;
    for (const u of st.units) {
      if (u.t !== 'FRA') continue;
      const ok = u.loc < NP && st.prov[u.loc].c === 'FRA';
      if (!ok || kept >= 12) u.dead = 1; else { kept++; u.path = []; }
    }
    st.units = st.units.filter((u) => !u.dead);
    if (paris >= 0) st.prov[paris].c = 'GER';
    G.cwDirty = 1; G.refreshEnemies(); G.rebuildUnitIndex();
    G.mapDirty = 1; G.needSummary = 1; G.supDirty = 1;
    G.log('Compiègne Mütarekesi: Fransa ateşkes imzaladı. Kuzey Fransa Alman işgalinde, güneyde Pétain\'in Vichy hükümeti kuruldu.', ['FRA', 'GER'], 'major');
    if (st.player !== 'FRA' && st.player !== 'GER') news('Fransa Düştü', 'Compiègne ormanında, 1918\'deki aynı vagonda ateşkes imzalandı. Fransa\'nın kuzeyi Alman işgalinde; Mareşal Pétain Vichy\'de yeni bir hükümet kurdu.');
  };
  const anton = () => {
    const st = G.st;
    if (!alive('FRA') || !alive('GER') || G.atWar('GER', 'FRA')) return;
    const ita = alive('ITA') && axisSide('ITA');
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (pr.o !== 'FRA' || pr.c !== 'FRA' || !metro(i)) continue;
      pr.c = ita && P[i].lon > 5.6 && P[i].lat < 45.4 ? 'ITA' : 'GER';
    }
    // Toulon'da filo batırıldı; anakaradaki Vichy ordusu dağıtıldı
    const c = st.C.FRA;
    for (const e of g.SHIPS) c.ships[e] = Math.floor((c.ships[e] || 0) * 0.3);
    for (const f of c.fleets || []) for (const e of g.SHIPS) if (f.sh[e]) f.sh[e] = Math.floor(f.sh[e] * 0.3);
    for (const u of st.units) if (u.t === 'FRA' && u.loc < NP && metro(u.loc)) u.dead = 1;
    st.units = st.units.filter((u) => !u.dead);
    G.cwDirty = 1; G.rebuildUnitIndex(); G.mapDirty = 1; G.needSummary = 1; G.supDirty = 1;
    G.log('Anton Harekâtı: Almanya Vichy bölgesini işgal etti; Fransız filosu Toulon\'da kendini batırdı.', ['GER', 'FRA'], 'major');
  };
  const liberate = () => {
    const st = G.st, c = st.C.FRA;
    if (!c || !c.alive || st.vichyLib) return;
    st.vichyLib = 1;
    // Hür Fransa: de Gaulle, Müttefiklere katılır; Müttefiklerin kurtardığı Fransız illeri Fransa'ya geçer
    c.ideo = 'dem'; c.pop.dem = Math.max(c.pop.dem || 0, 0.6); if (G.normalizePop) G.normalizePop(c);
    c.leader = 'Charles de Gaulle';
    const fid = Object.keys(st.factions).find((k) => st.factions[k].members.includes('ENG'));
    if (fid && c.fac !== fid) G.joinFaction('FRA', fid);
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if ((pr.o === 'FRA' || pr.core === 'FRA') && alliedSide(pr.c)) pr.c = 'FRA'; }
    const paris = pidx('Paris'); if (paris >= 0) { c.cap = paris; c.cap0 = paris; }
    for (const t of ['GER', 'ITA']) if (alive(t) && axisSide(t)) G.setWar('FRA', t);
    // kurtarılan ülke ordusunu yeniden kurar
    if (paris >= 0) { for (let k = 0; k < 6; k++) { const u = G.makeUnit('FRA', 'inf', paris, 0.8); u.xp = 0.3; st.units.push(u); } }
    // teslim ölçüsü kurtuluş anındaki duruma göre: hâlâ işgaldeki iller hemen teslime yol açmaz
    G.cwDirty = 1; c.startW = Math.max(G.coreWeight('FRA', false), 0.3 * G.coreWeight('FRA', true)); c.surrender = 0;
    G.rebuildUnitIndex(); G.mapDirty = 1; G.needSummary = 1; G.supDirty = 1;
    G.log('Paris kurtarıldı! General de Gaulle Hür Fransa hükümetini kurdu; Fransa yeniden Müttefiklerin yanında.', ['FRA'], 'major');
    if (st.player !== 'FRA') news('Paris\'in Kurtuluşu', 'Müttefik ordular Paris\'e girdi. General de Gaulle Champs-Élysées\'de yürüdü; Hür Fransa yeniden savaşta.');
  };

  // ---------- Doğu Cephesi ----------
  const fortify = (names, lv) => { const st = G.st; for (const nm of names) { const i = pidx(nm); if (i >= 0 && st.prov[i].c === 'SOV') st.prov[i].fort = Math.max(st.prov[i].fort || 0, lv); } };
  const lines = () => {
    fortify(['Moskova', 'Leningrad'], 4);
    fortify(['Mozhaysk', 'Kalinin', 'Kaluga', 'Tula', 'Luga', 'Novgorod', 'Volosovo', 'Kirishi'], 2);
    G.supDirty = 1; G.mapDirty = 1;
    G.log('Mozhaisk ve Luga savunma hatları: Moskova ve Leningrad çevresine tahkimat kazıldı.', ['SOV'], G.st.player === 'SOV' ? 'good' : 'info');
  };
  const siberia = () => {
    const st = G.st, mos = pidx('Moskova');
    let L = [mos, ...P[mos].a].filter((i) => i >= 0 && st.prov[i].c === 'SOV');
    if (!L.length) { L = []; for (let i = 0; i < NP; i++) if (st.prov[i].c === 'SOV' && st.prov[i].core === 'SOV') L.push(i); L.sort((a, b) => G.dist(a, mos) - G.dist(b, mos)); L = L.slice(0, 4); }
    if (!L.length) return;
    for (let k = 0; k < 14; k++) { const u = G.makeUnit('SOV', 'inf', L[k % L.length], 1); u.xp = 0.5; st.units.push(u); }
    G.rebuildUnitIndex();
    G.log('Sibirya tümenleri Moskova\'ya ulaştı: Uzak Doğu\'dan 14 tecrübeli tümen cepheye sevk edildi.', ['SOV'], 'major');
    if (st.player !== 'SOV') news('Sibirya Tümenleri', 'Casus Richard Sorge Japonya\'nın Sovyetlere saldırmayacağını bildirdi. Kışa alışkın Sibirya tümenleri trenlerle Moskova önlerine taşınıyor.');
  };

  const EV = [
    { id: 'compiegne', date: '1940-05-20', actor: 'GER', title: 'Compiègne Mütarekesi',
      text: 'Paris düştü. Fransız hükümeti Bordeaux\'ya çekildi; Mareşal Pétain ateşkes istiyor. Kuzey Fransa ve Atlantik kıyısı işgal altında kalacak, güneyde tarafsız bir Fransız hükümeti kurulacak.',
      cond: () => { const st = G.st, p = pidx('Paris'); return !st.vichy && alive('GER') && alive('FRA') && G.atWar('GER', 'FRA') && p >= 0 && axisSide(st.prov[p].c) && (st.C.FRA.surrender || 0) >= 0.15; },
      retryUntil: '1949-12-31',
      opts: [{ n: 'Ateşkesi imzala', fx: () => {
        const st = G.st;
        if (st.player === 'FRA') G.queuePopup({ title: 'Almanya Ateşkes Öneriyor', text: 'Paris düştü. Ateşkesi kabul edersek kuzey işgal altında kalır, güneyde Vichy hükümeti kurulur ve savaştan çekiliriz. Reddedersek kalan topraklarımızla savaşmayı sürdürürüz.', opts: [{ n: 'Ateşkesi kabul et (Vichy)', fx: armistice }, { n: 'Savaşa devam et', fx: () => { st.C.FRA.wsX += 0.05; } }] });
        else armistice();
      } }, { n: 'Fransa\'yı tamamen fethet', fx: () => {} }] },
    { id: 'anton', date: '1942-11-11', actor: 'GER', title: 'Anton Harekâtı',
      text: 'Müttefikler Kuzey Afrika\'ya çıktı. Vichy bölgesini de işgal edip Akdeniz kıyısını güvenceye alalım.',
      cond: () => G.st.vichy && !G.st.vichyLib && alive('GER') && alive('FRA') && !G.atWar('GER', 'FRA') && G.st.player !== 'FRA', retryUntil: '1944-12-31',
      opts: [{ n: 'Vichy bölgesini işgal et', fx: anton }, { n: 'Vichy\'ye dokunma', fx: () => {} }] },
    { id: 'parislib', date: '1943-01-01', actor: 'FRA', title: 'Paris\'in Kurtuluşu',
      text: 'Müttefik ordular Paris\'e girdi. General de Gaulle Hür Fransa hükümetini kuruyor; Fransa yeniden savaşa dönüyor.',
      cond: () => { const st = G.st, p = pidx('Paris'); return st.vichy && !st.vichyLib && alive('FRA') && p >= 0 && alliedSide(st.prov[p].c); }, retryUntil: '1952-12-31',
      opts: [{ n: 'Hür Fransa\'yı kur', fx: liberate }] },
    { id: 'mozhaisk', date: '1941-07-16', actor: 'SOV', title: 'Mozhaisk ve Luga Hatları',
      text: 'Alman ordular hızla ilerliyor. Moskova ve Leningrad önlerinde yüz binlerce sivil tank hendekleri ve sığınaklar kazıyor.',
      cond: () => alive('SOV') && alive('GER') && G.atWar('GER', 'SOV'), retryUntil: '1945-12-31',
      opts: [{ n: 'Savunma hatlarını kaz', fx: lines }, { n: 'Kaynakları başka yere ayır', fx: () => {} }] },
    { id: 'sibir', date: '1941-10-15', actor: 'SOV', title: 'Sibirya Tümenleri',
      text: 'Tokyo\'daki ajanımız Sorge, Japonya\'nın güneye yöneldiğini ve Sovyetlere saldırmayacağını bildirdi. Uzak Doğu ordusunu Moskova\'ya taşıyabiliriz.',
      cond: () => alive('SOV') && alive('GER') && G.atWar('GER', 'SOV') && !(alive('JAP') && G.atWar('JAP', 'SOV')), retryUntil: '1943-06-01',
      opts: [{ n: 'Tümenleri batıya gönder', fx: siberia }, { n: 'Uzak Doğu\'yu koru', fx: () => {} }] },
  ];
  for (const e of EV) { e.day = G.dayOf(e.date); e.ext = 1; G.EVENTS.push(e); }

  // ---------- Almanya'nın yedek ordusu (tarihî mod) ----------
  // Almanya'nın asli toprakları tarihten hızlı düşüyorsa (Müttefikler ve Sovyetler 1944'te Berlin'e varıyorsa)
  // aylık yedek tümenler kurulur (toplam en çok 70). Tarihte Almanya 1945 baharına kadar direndi.
  G.gerReserves = () => {
    const st = G.st, c = st.C.GER;
    if (!st.opts.hist || !c || !c.alive || st.player === 'GER' || !c.enemies.length || st.day % 30 !== 15) return;
    if ((st.gerRes || 0) >= 70 || st.day >= G.dayOf('1945-04-01')) return;
    const ahead = G.histAhead ? G.histAhead('*', 'GER') : null;
    const divs = st.units.filter((u) => u.t === 'GER').length;
    // yalnızca asli topraklar tarihten hızlı düşüyorsa ya da ordu 1944'ten önce erimişse
    if (!((ahead != null && ahead > 0.04) || (st.day >= G.dayOf('1943-06-01') && st.day < G.dayOf('1944-09-01') && divs < 130))) return;
    const L = []; for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === 'GER' && pr.core === 'GER' && !P[i].a.some((j) => G.atWar('GER', st.prov[j].c))) L.push(i); }
    if (!L.length) return;
    L.sort((a, b) => P[b].vp - P[a].vp || a - b);
    const n = 6, k = Math.min(6, L.length);
    for (let j = 0; j < n; j++) { const u = G.makeUnit('GER', 'inf', L[j % k], 0.85); u.xp = 0.25; st.units.push(u); }
    G.rebuildUnitIndex();
    st.gerRes = (st.gerRes || 0) + n;
    if (st.gerRes === n) G.log('Almanya yedek ordusunu (Ersatzheer) cepheye sürüyor: yeni tümenler kuruluyor.', ['GER'], 'info');
  };
})(window);
