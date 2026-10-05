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
    const L = { inf: G.lvl(c, 'inf'), art: G.lvl(c, 'art'), tank: G.lvl(c, 'tank') };
    Object.assign(t, G.levelStats(t, L));
    return t;
  };
  G.levelStats = (t, L) => {
    let atk = t.atkK.flat, def = t.defK.flat;
    for (const k of ['inf', 'art', 'tank']) { const m = G.lvMul(k, L[k] || 1); atk += t.atkK[k] * m; def += t.defK[k] * m; }
    const tm = G.lvMul('tank', L.tank || 1);
    return { atk, def, arm: t.armBase * (t.tanks ? tm : 1), prc: t.prcO + t.prcT * tm };
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
    let atk = ls.atk * (1 + (m.landAtk || 0) + (m.armAtk || 0) * t.mob);
    let def = ls.def * (1 + (m.landDef || 0));
    const org = t.org * (1 + (m.org || 0));
    let spd = t.spd * (1 + (m.speed || 0) + t.spdM) * 2.4;
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
  G.createArmy = (c, unitIds, genId) => {
    c.armies = c.armies || [];
    const n = c.armies.length + 1;
    const a = { id: G.st.nextId++, n: `${n}. Ordu`, gen: genId || null, ord: 'hold', vs: null };
    if (!a.gen) { const free = c.gens.find((x) => !c.armies.some((y) => y.gen === x.id)); if (free) a.gen = free.id; }
    c.armies.push(a);
    for (const u of G.st.units) if (u.t === c.tag && unitIds.includes(u.id)) u.army = a.id;
    return a;
  };
  G.disbandArmy = (c, id) => {
    c.armies = (c.armies || []).filter((a) => a.id !== id);
    for (const u of G.st.units) if (u.t === c.tag && u.army === id) u.army = 0;
  };
  G.armyUnits = (c, id) => G.st.units.filter((u) => u.t === c.tag && u.army === id);
})(window);
