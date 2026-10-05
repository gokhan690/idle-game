// Yeni oyun kurulumu, kayıt/yükleme.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  function provWeight(p) { return p.vp + 1 + (p.te === 7 ? 4 : 0); }

  function distribute(list, total, weightFn, field, cap) {
    if (!list.length || total <= 0) return;
    const ws = list.map(weightFn); const sum = ws.reduce((a, b) => a + b, 0) || 1;
    let left = total;
    const shares = list.map((_, i) => (ws[i] / sum) * total);
    list.forEach((pr, i) => { const v = Math.min(cap, Math.floor(shares[i])); pr[field] += v; left -= v; });
    // kalanları en büyük paylara dağıt
    const order = list.map((_, i) => i).sort((a, b) => (shares[b] % 1) - (shares[a] % 1) || ws[b] - ws[a]);
    let k = 0, guard = 0;
    while (left > 0 && guard++ < 10000) { const pr = list[order[k % order.length]]; if (pr[field] < cap) { pr[field]++; left--; } k++; }
  }

  G.slotsOf = (i) => { const p = P[i]; const base = [6, 4, 4, 2, 2, 2, 2, 12][p.te]; return Math.min(20, base + Math.floor(p.vp / 8)); };

  G.newCountry = (tag) => {
    const d = g.COUNTRY_DEFS[tag];
    const c = {
      tag, alive: 1, major: d.major || 0, pp: 50, ideo: d.id, fac: null, laws: { mob: 0, eco: 0 },
      tech: {}, res: [], focus: { done: {}, cur: null, p: 0 }, fmods: {}, mods: {},
      lines: [], stock: { inf: 0, art: 0, mot: 0, tank: 0, fig: 0, cas: 0, bom: 0 }, ships: { dd: 0, cr: 0, bb: 0, ss: 0, cv: 0 },
      constr: [], train: [], dead: 0, just: null, cap: -1, startW: 0, enemies: [], ai: { t: 0 }, sl: {}, air: { bomb: 'auto', cas: 1 }, fleets: [], ops: [],
      auto: { res: 0, prod: 0, con: 0, focus: 0, trade: 1 }, sum: {},
    };
    for (let l = 0; l <= (d.tl || 0); l++) for (const id of g.START_TECHS[l]) c.tech[id] = 1;
    if (d.div.mtn) c.tech.mtn1 = c.tech.sup1 = 1;
    if (d.div.mot) c.tech.mot1 = 1;
    if (d.div.arm) c.tech.tank1 = 1;
    if (d.div.mar) c.tech.mar1 = c.tech.sup1 = 1;
    if (d.navy[4]) c.tech.cv1 = 1;
    if (d.bonus) Object.assign(c.fmods, d.bonus);
    c.tpl = JSON.parse(JSON.stringify(g.DEFAULT_TEMPLATES));
    c.armies = [];
    G.initPolitics(c);
    G.recomputeMods(c);
    G.initGenerals(c);
    return c;
  };

  G.newGame = (player, opts) => {
    const st = {
      v: 4, day: 0, seed: 12345 + Math.floor(Math.random() * 1e6), player, opts: Object.assign({ hist: 1, diff: 1 }, opts || {}),
      prov: [], C: {}, units: [], wars: {}, factions: {}, tension: 8, ev: {}, pacts: {}, access: {}, guar: {}, goals: {}, deals: [], embargo: {}, ops: [],
      log: [], nextId: 1, over: 0,
    };
    G.st = st;
    for (let i = 0; i < NP; i++) {
      const p = P[i];
      st.prov.push({ o: p.t, c: p.t, core: p.t, oc: p.t, civ: 0, mil: 0, dock: 0, fort: 0, pop: 0 });
    }
    const byTag = {};
    P.forEach((p, i) => { (byTag[p.t] || (byTag[p.t] = [])).push(i); });
    for (const tag of Object.keys(g.COUNTRY_DEFS)) {
      const d = g.COUNTRY_DEFS[tag];
      const c = (st.C[tag] = G.newCountry(tag));
      const list = byTag[tag] || [];
      if (!list.length) { c.alive = 0; continue; }
      // başkent
      let cap = list.find((i) => P[i].n === d.cap || (P[i].cs || []).includes(d.cap));
      if (cap === undefined) cap = list.reduce((b, i) => (P[i].vp > P[b].vp ? i : b), list[0]);
      c.cap = c.cap0 = cap;
      const prs = list.map((i) => st.prov[i]);
      const capBoost = (i) => provWeight(P[i]) * (i === cap ? 3 : 1);
      distribute(list.map((i) => Object.assign(st.prov[i], { _i: i })), d.civ, (pr) => capBoost(pr._i), 'civ', 20);
      distribute(prs, d.mil, (pr) => capBoost(pr._i) * (G.slotsOf(pr._i) - pr.civ > 0 ? 1 : 0.01), 'mil', 20);
      const coastal = prs.filter((pr) => P[pr._i].c);
      distribute(coastal.length ? coastal : prs, d.dock, (pr) => provWeight(P[pr._i]), 'dock', 10);
      // nüfus (milyon)
      const totalW = prs.reduce((s, pr) => s + provWeight(P[pr._i]) + P[pr._i].ar / 400, 0);
      prs.forEach((pr) => { pr.pop = (d.pop * (provWeight(P[pr._i]) + P[pr._i].ar / 400)) / totalW; delete pr._i; });
      // donanma ve hava
      g.SHIPS.forEach((e, k) => (c.ships[e] = d.navy[k] || 0));
      const CONV = { ENG: 450, USA: 320, JAP: 220, FRA: 160, ITA: 130, HOL: 120, GER: 100, SOV: 60, NOR: 60, SPR: 40, CAN: 40, AST: 30 };
      c.ships.conv = CONV[tag] ?? Math.min(40, d.dock * 10 + 5);
      c.stock.fig = d.air[0]; c.stock.cas = d.air[1]; c.stock.bom = d.air[2];
    }
    // ittifaklar
    for (const [id, f] of Object.entries(g.FACTION_DEFS)) {
      st.factions[id] = { n: f.n, c: f.c, leader: f.leader, members: f.members.filter((t) => st.C[t]?.alive) };
      st.factions[id].members.forEach((t) => (st.C[t].fac = id));
    }
    // ağırlıklı zafer puanı (teslim olma için)
    G.cwDirty = 1;
    for (const c of Object.values(st.C)) if (c.alive) c.startW = G.coreWeight(c.tag, true);
    // birlikler
    for (const [tag, d] of Object.entries(g.COUNTRY_DEFS)) {
      const c = st.C[tag]; if (!c.alive) continue;
      const own = byTag[tag];
      const total = Object.values(d.div).reduce((a, b) => a + b, 0);
      // birlikleri başkent, şehirler, sınırlar ve sömürgelere yay
      const home = own.filter((i) => G.dist(i, c.cap) < 420);
      const colonies = own.filter((i) => G.dist(i, c.cap) >= 420 && P[i].vp >= 3).sort((a, b) => P[b].vp - P[a].vp);
      const spots = home.slice().sort((a, b) => P[b].vp - P[a].vp);
      const border = home.filter((i) => P[i].a.some((j) => st.prov[j].o !== tag));
      const warFront = tag === 'ITA' ? own.filter((i) => P[i].a.some((j) => st.prov[j].o === 'ETH')) : [];
      let k = 0;
      for (const [type, n] of Object.entries(d.div)) {
        for (let j = 0; j < n; j++) {
          let loc;
          if (k === 0) loc = c.cap;
          else if (warFront.length && type === 'inf' && j < 10) loc = warFront[j % warFront.length];
          else if (colonies.length && type === 'inf' && k % 5 === 4) loc = colonies[(k / 5 | 0) % colonies.length];
          else {
            const pool = (k % 3 === 0 || !border.length) ? spots.slice(0, Math.max(1, Math.ceil(spots.length / 3))) : border;
            loc = pool[Math.floor(G.rand() * pool.length)];
          }
          { const u0 = G.makeUnit(tag, type, loc, 1); u0.xp = 0.25; st.units.push(u0); }
          k++;
        }
      }
      // başlangıç stokları ve üretim hatları
      c.stock.inf = total * 150 + 300; c.stock.art = total * 6 + 20; c.stock.sup = total * 4 + 30;
      if (c.mods.unlockEq.mot) c.stock.mot = 100;
      if (c.mods.unlockEq.tank) c.stock.tank = 40;
      G.defaultLines(c);
      c.lines.forEach((l) => (l.eff = 0.5));
    }
    G.refreshEnemies();
    // başlangıç savaşı: İtalya - Etiyopya
    if (st.C.ITA.alive && st.C.ETH.alive) G.setWar('ITA', 'ETH');
    st.tension = 8;
    G.rebuildUnitIndex();
    G.updateSummaries();
    for (const c of Object.values(st.C)) if (c.alive) { G.initFleets(c); c._mpu = null; G.econCalc(c); }
    if (st.C[st.player]) { G.autoArmies(st.C[st.player]); for (const a of st.C[st.player].armies || []) a.ord = 'hold'; }
    G.log('1 Ocak 1936. Avrupa\'da gerginlik tırmanıyor.', [], 'info');
    return st;
  };

  G.makeUnit = (tag, type, loc, str) => {
    const st = G.st;
    const c = st.C[tag];
    const u = { id: st.nextId++, t: tag, u: type, loc, path: [], prog: 0, str: str, org: 0, ent: 0, auto: tag !== st.player ? 1 : 0, ret: 0, xp: 0.2, lv: { inf: G.lvl(c, 'inf'), art: G.lvl(c, 'art'), tank: G.lvl(c, 'tank') } };
    u.org = G.unitStats(u).org * (str >= 1 ? 1 : 0.5);
    return u;
  };

  // Varsayılan üretim hattı dağılımı
  G.defaultLines = (c) => {
    const mil = c.sum.mil || Object.values(G.st.prov).reduce((s, pr) => s + (pr.c === c.tag ? pr.mil : 0), 0);
    const dock = c.sum.dock || G.st.prov.reduce((s, pr) => s + (pr.c === c.tag ? pr.dock : 0), 0);
    const want = c.major
      ? [['inf', 0.36], ['art', 0.16], ['mot', 0.08], ['tank', 0.14], ['fig', 0.16], ['cas', 0.06], ['bom', 0.04]]
      : [['inf', 0.5], ['art', 0.25], ['fig', 0.15], ['cas', 0.1]];
    const lines = [];
    let used = 0;
    for (const [e, w] of want) {
      if (!c.mods.unlockEq[e]) continue;
      const f = Math.floor(mil * w);
      if (f > 0) { lines.push({ e, f, eff: 0.3, acc: 0, lv: G.bestLevel(c, e) }); used += f; }
    }
    if (mil >= 6) { lines.push({ e: 'sup', f: 1, eff: 0.3, acc: 0, lv: 1 }); used += 1; }
    if (mil > used) { const inf = lines.find((l) => l.e === 'inf'); if (inf) inf.f += mil - used; else lines.push({ e: 'inf', f: mil - used, eff: 0.3, acc: 0 }); }
    if (dock > 0) {
      const dw = c.major ? [['dd', 0.3], ['ss', 0.3], ['cr', 0.2], ['bb', 0.2]] : [['dd', 0.5], ['ss', 0.5]];
      let du = 0;
      for (const [e, w] of dw) { const f = Math.floor(dock * w); if (f > 0) { lines.push({ e, f, eff: 0.3, acc: 0 }); du += f; } }
      if (dock > du) { const l = lines.find((x) => x.e === 'dd'); if (l) l.f += dock - du; else lines.push({ e: 'dd', f: dock - du, eff: 0.3, acc: 0 }); }
    }
    c.lines = lines;
  };

  // Teslim olma için ağırlıklı çekirdek zafer puanı (başkente uzak topraklar daha az sayılır)
  G.cw = new Float32Array(NP);
  G.cwDirty = 1;
  G.recalcCoreWeights = () => {
    const st = G.st;
    for (let i = 0; i < NP; i++) {
      const c = st.C[st.prov[i].core];
      const cap = c ? (c.cap0 != null && c.cap0 >= 0 ? c.cap0 : c.cap) : -1;
      const d = cap >= 0 ? G.dist(i, cap) : 0;
      G.cw[i] = (P[i].vp + 1) * (d < 160 ? 1 : d < 420 ? 0.5 : 0.15);
    }
    G.cwDirty = 0;
  };
  G.coreWeight = (tag, all) => {
    const st = G.st;
    if (G.cwDirty) G.recalcCoreWeights();
    let w = 0;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.core !== tag) continue;
      if (!all && !(pr.c === tag || (G.friendly(tag, pr.c) && !G.atWar(tag, pr.c)))) continue;
      w += G.cw[i];
    }
    return w;
  };

  // ---------- Kayıt ----------
  const SKIP = new Set(['eset', 'mods', 'sum', 'econ', '_s', 'enemies', '_tc', '_best', '_bestDay', '_mpu', '_sd', '_rf', '_rfDay']);
  G.serialize = () => JSON.stringify(G.st, (k, v) => (SKIP.has(k) ? undefined : v));
  G.deserialize = (s) => {
    const st = JSON.parse(s);
    if (!st || st.v !== 4) throw new Error('Kayıt sürümü uyumsuz');
    G.st = st;
    for (const c of Object.values(st.C)) { G.recomputeMods(c); c.enemies = []; }
    G.refreshEnemies();
    G.cwDirty = 1;
    G.rebuildUnitIndex();
    G.updateSummaries();
    for (const c of Object.values(st.C)) if (c.alive) G.econCalc(c);
    return st;
  };
})(window);
