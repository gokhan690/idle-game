// Tümen şablonları (tümen tasarımcısı), komutanlar ve ordular.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  // ---------- Şablonlar ----------
  G.templatesOf = (c) => { if (!c.tpl) c.tpl = JSON.parse(JSON.stringify(g.DEFAULT_TEMPLATES)); return c.tpl; };
  G.T = (tag, id) => {
    const c = G.st.C[tag];
    if (!c._tc) c._tc = {};
    let t = c._tc[id];
    if (t) return t;
    const tpl = G.templatesOf(c);
    const src = tpl[id] || g.DEFAULT_TEMPLATES[id] || tpl.inf || g.DEFAULT_TEMPLATES.inf;
    t = c._tc[id] = G.computeTemplate(c, src);
    return t;
  };
  // Seviye çarpanları: piyade/topçu %15, tank %25 (model başına)
  G.lvMul = (kind, l) => (kind === 'tank' ? 1 + 0.25 * (l - 1) : kind === 'art' || kind === 'inf' ? 1 + 0.15 * (l - 1) : 1);
  G.computeTemplate = (c, src) => {
    const atkK = { inf: 0, art: 0, tank: 0, flat: 0 }, defK = { inf: 0, art: 0, tank: 0, flat: 0 };
    let orgS = 0, nb = 0, spd = 99, mp = 0, w = 0, armSum = 0, armMax = 0, prcSumT = 0, prcMaxT = 0, prcSumO = 0, prcMaxO = 0, tanks = 0, mob = 0, amph = 0;
    const eq = {}, bonusRaw = {};
    for (const [k, cnt] of Object.entries(src.b || {})) {
      const b = g.BATS[k]; if (!b || !cnt) continue;
      atkK[b.kind] += b.atk * cnt; defK[b.kind] += b.def * cnt; orgS += b.org * cnt; nb += cnt;
      spd = Math.min(spd, b.spd); mp += b.mp * cnt; w += b.w * cnt;
      armSum += b.arm * cnt; armMax = Math.max(armMax, b.arm);
      if (b.kind === 'tank') { prcSumT += b.prc * cnt; prcMaxT = Math.max(prcMaxT, b.prc); tanks += cnt; } else { prcSumO += b.prc * cnt; prcMaxO = Math.max(prcMaxO, b.prc); }
      if (b.mob) mob += cnt;
      if (b.amph) amph += cnt;
      for (const [e, q] of Object.entries(b.eq)) eq[e] = (eq[e] || 0) + q * cnt;
      if (b.bonus) for (const [te, v] of Object.entries(b.bonus)) bonusRaw[te] = (bonusRaw[te] || 0) + v * cnt;
    }
    if (!nb) { nb = 1; spd = 4; orgS = 10; }
    let ent = 0, spdM = 0, prcAdd = 0, aa = 0, sup = 0, cas = 0;
    for (const [k, on] of Object.entries(src.s || {})) {
      const s2 = g.SUPPORTS[k]; if (!s2 || !on) continue;
      atkK[s2.kind === 'art' ? 'art' : 'flat'] += s2.atk || 0; defK.flat += s2.def || 0; ent += s2.ent || 0; spdM += s2.spdM || 0; prcAdd += s2.prcAdd || 0;
      aa += s2.aa || 0; sup += s2.sup || 0; cas += s2.cas || 0; mp += s2.mp || 0;
      for (const [e, q] of Object.entries(s2.eq)) eq[e] = (eq[e] || 0) + q;
    }
    const bonus = {};
    for (const [te, v] of Object.entries(bonusRaw)) bonus[te] = v / nb;
    const shortOf = () => {
      let best = 'inf', bc = -1;
      for (const [k, cnt] of Object.entries(src.b || {})) if (cnt > bc && k !== 'art') { bc = cnt; best = k; }
      return g.BATS[best]?.s || 'TÜM';
    };
    const tankShare = tanks / nb;
    const t = {
      n: src.n, s: shortOf(), mp: Math.round(mp * 10) / 10, eq, days: Math.round(30 + 4 * nb + 8 * tanks),
      atkK, defK, org: orgS / nb, spd, armBase: armMax ? 0.3 * armMax + 0.7 * armSum / nb : 0,
      prcT: tanks ? (0.4 * prcMaxT + 0.6 * prcSumT / nb) : 0, prcO: (1 - tankShare) * (0.4 * prcMaxO + 0.6 * prcSumO / Math.max(1, nb - tanks)) + prcAdd,
      w, bonus, amph: amph / nb, mob: mob / nb, tanks, ent, spdM, aa, sup, cas, nb,
    };
    // ülkenin mevcut teçhizat seviyesiyle gösterim değerleri
    const L = { inf: G.lvl(c, 'inf'), art: G.lvl(c, 'art'), tank: G.lvl(c, 'tank'), tq: tanks && G.stockVec ? G.stockVec(c, 'tank') : null };
    Object.assign(t, G.levelStats(t, L));
    return t;
  };
  G.levelStats = (t, L) => {
    let atk = t.atkK.flat, def = t.defK.flat;
    for (const k of ['inf', 'art']) { const m = G.lvMul(k, L[k] || 1); atk += t.atkK[k] * m; def += t.defK[k] * m; }
    // tank: tasarım vektörü (saldırı, yarma, zırh, delme) ya da eski seviye çarpanı
    const tq = L.tq, tm = G.lvMul('tank', L.tank || 1);
    atk += t.atkK.tank * (tq ? tq.a : tm); def += t.defK.tank * (tq ? tq.d : tm);
    return { atk, def, arm: t.armBase * (t.tanks ? (tq ? tq.r : tm) : 1), prc: t.prcO + t.prcT * (tq ? tq.p : tm) };
  };
  G.invalidateTemplates = (c) => { c._tc = {}; };

  // ---------- Komutanlar ----------
  const SURNAMES = {
    tr: ['Yıldırım', 'Kaya', 'Demir', 'Aydın', 'Öztürk', 'Şahin', 'Arslan', 'Doğan', 'Kılıç', 'Çelik', 'Koç', 'Kurt', 'Aksoy', 'Tekin', 'Ergin', 'Ateş', 'Yalçın', 'Karaca'],
    de: ['Weber', 'Hoffmann', 'Schulz', 'Keller', 'Brandt', 'Vogel', 'Krüger', 'Richter', 'Lange', 'Wolff', 'Schröder', 'Neumann'],
    ru: ['İvanov', 'Petrov', 'Sokolov', 'Popov', 'Kuznetsov', 'Volkov', 'Morozov', 'Pavlov', 'Orlov', 'Smirnov', 'Fyodorov'],
    sl: ['Nowak', 'Kowalski', 'Novák', 'Petrović', 'Horvat', 'Dvořák', 'Jovanović', 'Wiśniewski', 'Popescu', 'Nagy', 'Georgiev'],
    en: ['Harris', 'Clarke', 'Wright', 'Turner', 'Baker', 'Hughes', 'Foster', 'Bennett', 'Graham', 'Hayes', 'Mitchell', 'Carter'],
    fr: ['Dubois', 'Lefèvre', 'Moreau', 'Laurent', 'Girard', 'Bonnet', 'Mercier', 'Fournier', 'Rousseau', 'Blanc'],
    it: ['Rossi', 'Bianchi', 'Romano', 'Gallo', 'Conti', 'Greco', 'Marino', 'Ferrari', 'Bruno', 'Costa'],
    ja: ['Tanaka', 'Suzuki', 'Takahaşi', 'Watanabe', 'İto', 'Nakamura', 'Kobayaşi', 'Yamamoto', 'Kato', 'Saito'],
    zh: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Zhou', 'Wu'],
    es: ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Álvarez'],
    ar: ['Hasan', 'Halil', 'Said', 'Abbas', 'Rahimi', 'Kerimi', 'Nuri', 'Haddad', 'Mansur', 'Farukî'],
    no: ['Hansen', 'Johansson', 'Nielsen', 'Larsen', 'Virtanen', 'Andersson', 'Berg', 'Lindqvist'],
  };
  const LANG = { TUR: 'tr', GER: 'de', AUS: 'de', SWI: 'de', LUX: 'fr', SOV: 'ru', MON: 'ru', POL: 'sl', CZE: 'sl', SLO: 'sl', YUG: 'sl', BUL: 'sl', ROM: 'sl', HUN: 'sl', ALB: 'sl', GRE: 'sl',
    FRA: 'fr', BEL: 'fr', ITA: 'it', JAP: 'ja', MAN: 'ja', CHI: 'zh', PRC: 'zh', TIB: 'zh', SIK: 'zh', SIA: 'zh', SPR: 'es', POR: 'es', MEX: 'es', ARG: 'es', CHL: 'es', PRU: 'es', BOL: 'es', PAR: 'es', URU: 'es', VEN: 'es', COL: 'es', ECU: 'es',
    GUA: 'es', HON: 'es', ELS: 'es', NIC: 'es', COS: 'es', PAN: 'es', CUB: 'es', DOM: 'es', BRA: 'es', PER: 'ar', IRQ: 'ar', SAU: 'ar', YEM: 'ar', OMA: 'ar', AFG: 'ar', ETH: 'ar',
    NOR: 'no', SWE: 'no', DEN: 'no', FIN: 'no', EST: 'no', LAT: 'no', LIT: 'sl', HOL: 'no' };
  G.newGeneral = (c, opts = {}) => {
    const st = G.st;
    const pool = SURNAMES[LANG[c.tag] || 'en'];
    const used = new Set(c.gens.map((x) => x.n));
    let name = '';
    for (let k = 0; k < 20 && (!name || used.has(name)); k++) name = 'Gen. ' + pool[Math.floor(G.rand() * pool.length)];
    if (used.has(name)) name += ' ' + (c.gens.length + 1);
    const r = () => 1 + Math.floor(G.rand() * (opts.good ? 3 : 2)) + (opts.good ? 1 : 0);
    const gen = { id: st.nextId++, n: name, fm: opts.fm ? 1 : 0, atk: r(), def: r(), plan: r(), log: r(), xp: 0, lvl: 1, tr: [] };
    const traits = Object.keys(g.GEN_TRAITS).filter((t) => t !== 'brilliant');
    if (G.rand() < 0.5) gen.tr.push(traits[Math.floor(G.rand() * traits.length)]);
    c.gens.push(gen);
    return gen;
  };
  G.initGenerals = (c) => {
    c.gens = [];
    const list = g.GENERALS[c.tag];
    if (list) for (const [n, fm, atk, def, plan, log, tr] of list) c.gens.push({ id: G.st.nextId++, n, fm, atk, def, plan, log, xp: 0, lvl: fm ? 3 : 2, tr: tr.slice(), hist: 1 });
    else {
      const divs = Object.values(g.COUNTRY_DEFS[c.tag].div).reduce((a, b) => a + b, 0);
      const n = divs > 20 ? 3 : divs > 6 ? 2 : 1;
      for (let i = 0; i < n; i++) G.newGeneral(c, { fm: i === 0 && divs > 12 });
    }
  };
  const gbCache = new WeakMap();
  G.genBonus = (gen) => {
    const key = gen.atk + ',' + gen.def + ',' + gen.plan + ',' + gen.log + ',' + gen.tr.length + ',' + gen.fm;
    const hit = gbCache.get(gen);
    if (hit && hit.k === key) return hit.b;
    const b = genBonusRaw(gen);
    gbCache.set(gen, { k: key, b });
    return b;
  };
  const genBonusRaw = (gen) => {
    const extra = gen.tr.includes('brilliant') ? 1 : 0;
    const b = { atk: 0.04 * (gen.atk + extra), def: 0.04 * (gen.def + extra), plan: 0.04 * (gen.plan + extra), sup: 0.07 * (gen.log + extra), armAtk: 0, speed: 0, terrain: {}, winter: 0, amph: 0, cas: 0, ent: 0 };
    for (const t of gen.tr) {
      const fx = g.GEN_TRAITS[t]?.fx || {};
      for (const [k, v] of Object.entries(fx)) {
        if (k === 'terrain') for (const [te, x] of Object.entries(v)) b.terrain[te] = (b.terrain[te] || 0) + x;
        else b[k] = (b[k] || 0) + v;
      }
    }
    if (gen.fm) { b.plan += 0.05; b.sup += 0.05; }
    return b;
  };
  G.genById = (c, id) => c.gens.find((x) => x.id === id);
  G.armyById = (c, id) => (c.armies || []).find((a) => a.id === id);
  // Birimin komutanı: oyuncuda ordusunun komutanı; YZ'de en iyi komutanın etkisi herkese
  G.genOf = (u) => {
    const c = G.st.C[u.t];
    if (u.army) { const a = G.armyById(c, u.army); if (a && a.gen) return G.genById(c, a.gen); return null; }
    if (u.t !== G.st.player && c.gens && c.gens.length) {
      if (!c._best || c._bestDay !== G.st.day >> 5) { c._best = c.gens.reduce((b, x) => (x.atk + x.def + x.plan > b.atk + b.def + b.plan ? x : b), c.gens[0]); c._bestDay = G.st.day >> 5; }
      return c._best;
    }
    return null;
  };
  G.genXP = (gen, v) => {
    gen.xp += v;
    const need = 40 * gen.lvl;
    if (gen.xp >= need && gen.lvl < 9) {
      gen.xp -= need; gen.lvl++;
      const k = ['atk', 'def', 'plan', 'log'][Math.floor(G.rand() * 4)];
      gen[k] = Math.min(9, gen[k] + 1);
      if ((gen.lvl === 3 || gen.lvl === 5 || gen.lvl === 7) && gen.tr.length < 4) {
        const pool = Object.keys(g.GEN_TRAITS).filter((t) => !gen.tr.includes(t) && t !== 'brilliant');
        gen.tr.push(pool[Math.floor(G.rand() * pool.length)]);
      }
      return true;
    }
    return false;
  };

  // ---------- Birim istatistikleri (şablon + ülke + komutan) ----------
  G.unitStats = (u) => {
    if (u._sd === G.st.day && u._s) return u._s;
    const t = G.T(u.t, u.u), c = G.st.C[u.t], m = c.mods;
    const ls = u.lv ? G.levelStats(t, u.lv) : t;
    const xm = G.xpMul(u.xp);
    let atk = ls.atk * (1 + (m.landAtk || 0) + (m.armAtk || 0) * t.mob) * xm;
    let def = ls.def * (1 + (m.landDef || 0)) * xm;
    const org = t.org * (1 + (m.org || 0));
    let spd = t.spd * (1 + (m.speed || 0) + t.spdM) * 2.4;
    if (t.tanks && u.lv && u.lv.tq) spd *= 1 + (u.lv.tq.s - 1) * Math.min(1, 2 * t.tanks / t.nb);
    const gen = G.genOf(u);
    let gb = null;
    if (gen) {
      gb = G.genBonus(gen);
      const k = u.army ? 1 : 0.35; // YZ komutanı genel etki
      atk *= 1 + k * (gb.atk + gb.armAtk * t.mob); def *= 1 + k * gb.def; spd *= 1 + k * gb.speed;
    }
    u._sd = G.st.day;
    return (u._s = { atk, def, org, arm: ls.arm, prc: ls.prc + (m.prc || 0) * (1 - t.mob * 0.6), spd, t, gb });
  };

  // ---------- Ordular ----------
  // HOI4 gibi: her ordunun bir komutanı, bir cephesi (düşmanla ortak sınır parçası), isteğe bağlı bir taarruz hedefi (ok)
  // ve planlama bonusu vardır. "Cepheyi tut" sırasında plan dolar, "Uygula" ile taarruz başlar ve plan harcanır.
  G.ARMY_COLORS = ['#f2d27a', '#7fc8f8', '#e58fb8', '#9be38a', '#f4a259', '#c39bd3', '#6fd6c4', '#e86a5a'];
  G.ARMY_MAX = 24;
  G.createArmy = (c, unitIds, genId) => {
    c.armies = c.armies || [];
    const used = new Set(c.armies.map((a) => a.ci));
    let ci = 0; while (used.has(ci) && ci < 40) ci++;
    const num = (c.armies.reduce((m, a) => Math.max(m, a.no || 0), 0) || 0) + 1;
    const a = { id: G.st.nextId++, no: num, n: `${num}. Ordu`, gen: genId || null, ord: 'hold', vs: null, goal: null, plan: 0, front: [], ci };
    if (!a.gen) { const free = c.gens.filter((x) => !c.armies.some((y) => y.gen === x.id)).sort((x, y) => (y.fm - x.fm) || (y.atk + y.def + y.plan - x.atk - x.def - x.plan))[0]; if (free) a.gen = free.id; }
    c.armies.push(a);
    for (const u of G.st.units) if (u.t === c.tag && unitIds.includes(u.id)) { u.army = a.id; u.auto = 0; }
    return a;
  };
  G.disbandArmy = (c, id) => {
    c.armies = (c.armies || []).filter((a) => a.id !== id);
    for (const u of G.st.units) if (u.t === c.tag && u.army === id) u.army = 0;
  };
  G.armyUnits = (c, id) => G.st.units.filter((u) => u.t === c.tag && u.army === id);
  G.armyColor = (a) => G.ARMY_COLORS[(a.ci || 0) % G.ARMY_COLORS.length];
  G.maxPlan = (c, a) => {
    const gen = a.gen ? G.genById(c, a.gen) : null;
    return Math.min(0.5, 0.15 + (gen ? 0.025 * gen.plan + (gen.tr.includes('brilliant') ? 0.05 : 0) + (gen.fm ? 0.03 : 0) : 0) + (c.mods.plan || 0));
  };
  G.planRate = (c, a) => { const gen = a.gen ? G.genById(c, a.gen) : null; return 0.008 + (gen ? 0.0025 * gen.plan : 0); };

  // Oyun başında tümenleri bölgelere göre ordulara ayır (k-ortalamalar), en iyi komutanları ata
  G.autoArmies = (c) => {
    const st = G.st;
    const us = st.units.filter((u) => u.t === c.tag && u.loc < NP && !u.army);
    if (us.length < 4) return;
    const k = Math.max(1, Math.min(Math.ceil(us.length / 20), c.gens.length || 1, 6));
    const xs = us.map((u) => G.nodeX[u.loc]), ys = us.map((u) => G.nodeY[u.loc]);
    // ilk merkezler: en uzak noktalar
    const cen = [[xs[0], ys[0]]];
    while (cen.length < k) {
      let bi = 0, bd = -1;
      for (let i = 0; i < us.length; i++) { const d = Math.min(...cen.map(([x, y]) => Math.hypot(xs[i] - x, ys[i] - y))); if (d > bd) { bd = d; bi = i; } }
      cen.push([xs[bi], ys[bi]]);
    }
    let asg = new Array(us.length).fill(0);
    for (let it = 0; it < 12; it++) {
      asg = us.map((_, i) => { let b = 0, bd = Infinity; cen.forEach(([x, y], j) => { const d = Math.hypot(xs[i] - x, ys[i] - y); if (d < bd) { bd = d; b = j; } }); return b; });
      for (let j = 0; j < k; j++) { const m = us.map((_, i) => i).filter((i) => asg[i] === j); if (m.length) cen[j] = [m.reduce((s, i) => s + xs[i], 0) / m.length, m.reduce((s, i) => s + ys[i], 0) / m.length]; }
    }
    // büyük grupları 24'lük ordulara böl; çok küçük grupları (2'den az) ordusuz bırak
    const groups = [];
    for (let j = 0; j < k; j++) {
      const m = us.filter((_, i) => asg[i] === j);
      for (let o = 0; o < m.length; o += G.ARMY_MAX) groups.push(m.slice(o, o + G.ARMY_MAX));
    }
    groups.sort((a, b) => b.length - a.length);
    for (const grp of groups) {
      if (grp.length < 2) continue;
      const a = G.createArmy(c, grp.map((u) => u.id));
      // bölge adı: en büyük zafer puanlı eyalet
      const best = grp.reduce((b, u) => (P[u.loc].vp > P[b.loc].vp ? u : b), grp[0]);
      a.where = G.pname(best.loc);
    }
  };

  // Cephe ataması: her ordu, birliklerine en yakın düşman sınırı parçasını alır; ordular cepheyi paylaşır.
  G.frontier = (tag, vs) => {
    const st = G.st, out = [];
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (pr.c !== tag && !(G.friendly(tag, pr.c) && !G.atWar(tag, pr.c))) continue;
      for (const j of P[i].a) { const ec = st.prov[j].c; if (vs ? ec === vs : G.atWar(tag, ec)) { out.push(i); break; } }
    }
    return out;
  };
  G.computeFronts = (c) => {
    const st = G.st, tag = c.tag;
    const claimed = new Set();
    for (const a of c.armies || []) {
      a.front = [];
      const vs = a.vs && st.C[a.vs]?.alive ? a.vs : null;
      if (a.ord === 'hold' || (!vs && !c.enemies.length)) continue;
      const F = new Set(G.frontier(tag, vs));
      if (!F.size) continue;
      const us = G.armyUnits(c, a.id).filter((u) => u.loc < NP);
      if (!us.length) continue;
      const want = Math.max(2, Math.ceil(us.length / 1.6));
      const seen = new Set(); const q = [];
      for (const u of us) if (!seen.has(u.loc)) { seen.add(u.loc); q.push(u.loc); }
      // önce boştaki cephe parçaları; hepsi alınmışsa paylaş
      const free = [...F].some((n) => !claimed.has(n));
      for (let k = 0; k < q.length && a.front.length < want && k < 4000; k++) {
        const n = q[k];
        if (F.has(n) && (!free || !claimed.has(n))) { a.front.push(n); claimed.add(n); }
        for (const j of P[n].a) {
          if (seen.has(j)) continue;
          const pr = st.prov[j];
          if (pr.c !== tag && !(G.friendly(tag, pr.c) && !G.atWar(tag, pr.c))) continue;
          seen.add(j); q.push(j);
        }
      }
      // kara yoluyla ulaşılamıyorsa (ör. anakaradan kopuk bölge): en yakın cephe parçaları
      if (!a.front.length) {
        const u0 = us[Math.floor(us.length / 2)].loc;
        const near = [...F].filter((n) => !claimed.has(n) || !free).sort((x, y) => G.dist(x, u0) - G.dist(y, u0)).slice(0, want);
        for (const n of near) { a.front.push(n); claimed.add(n); }
      }
      // tek parça kalsın: ilk bulunan cephe eyaletine bağlı olanlar
      if (a.front.length > 2) {
        const fs = new Set(a.front), keep = new Set([a.front[0]]), qq = [a.front[0]];
        for (let k = 0; k < qq.length; k++) for (const j of P[qq[k]].a) if (fs.has(j) && !keep.has(j)) { keep.add(j); qq.push(j); }
        for (const n of a.front) if (!keep.has(n)) claimed.delete(n);
        a.front = a.front.filter((n) => keep.has(n));
      }
    }
  };
  // Günlük ordu güncellemesi: planlama dolar ya da harcanır, hedefe ulaşılınca taarruz biter
  G.armyTick = (c) => {
    const st = G.st;
    for (const a of c.armies || []) {
      if (a.plan == null) a.plan = 0;
      const mx = G.maxPlan(c, a);
      if (a.ord === 'atk') a.plan = Math.max(0, a.plan - (a._fought === st.day ? 0.012 : 0.003));
      else if (a.ord === 'def' && a.front && a.front.length) a.plan = Math.min(mx, a.plan + G.planRate(c, a));
      else a.plan = Math.max(0, a.plan - 0.004);
      if (a.goal != null && st.prov[a.goal].c === c.tag && a.ord === 'atk') {
        G.log(`${a.n} taarruz hedefine ulaştı: ${G.pname(a.goal)}. Ordu cepheyi tutuyor.`, [c.tag], 'good');
        a.goal = null; a.ord = 'def';
      }
    }
  };
  // Tümen tecrübesi (HOI4: Acemi → Kıdemli)
  G.XP_LV = [[0, 'Acemi'], [0.2, 'Eğitimli'], [0.4, 'Düzenli'], [0.6, 'Tecrübeli'], [0.8, 'Kıdemli']];
  G.xpName = (x) => { let n = G.XP_LV[0][1]; for (const [t, m] of G.XP_LV) if ((x ?? 0.25) >= t) n = m; return n; };
  G.xpMul = (x) => 0.9 + 0.4 * (x ?? 0.25);
})(window);
