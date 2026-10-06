// Günlük simülasyon: ekonomi, üretim, araştırma, odak, eğitim, hareket, muharebe, teslim olma.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  // ---------- Özetler ----------
  G.updateSummaries = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) c.sum = { civ: 0, mil: 0, dock: 0, steel: 0, oil: 0, pop: 0, vp: 0, provs: 0, slotsFree: 0, res: { steel: 0, oil: 0, al: 0, rub: 0, tun: 0, chr: 0 } };
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i], c = st.C[pr.c]; if (!c) continue;
      const own = pr.o === pr.c || pr.core === pr.c;
      const k = own ? 1 : 0.4;
      const s = c.sum;
      s.civ += pr.civ * k; s.mil += pr.mil * k; s.dock += pr.dock * k;
      const R = G.PR[i], sr = s.res;
      sr.steel += R.steel * k + (own ? 0.4 : 0.1); sr.oil += R.oil * k + (own ? 0.15 : 0);
      sr.al += R.al * k; sr.rub += R.rub * k; sr.tun += R.tun * k; sr.chr += R.chr * k + (own ? 0.05 : 0);
      s.pop += pr.pop * (own ? 1 : 0.2); s.vp += P[i].vp; s.provs++;
    }
    for (const c of Object.values(st.C)) {
      const s = c.sum;
      s.civ = Math.floor(s.civ); s.mil = Math.floor(s.mil); s.dock = Math.floor(s.dock);
      for (const r of g.RES_KEYS) s.res[r] += c.mods[r] || 0;
      s.steel = s.res.steel; s.oil = s.res.oil;
      if (c.alive && s.provs === 0) G.killCountry(c.tag);
    }
  };

  G.manpower = (c, fresh) => {
    const max = c.sum.pop * 1000 * c.mods.mpRate * (1 + (c.mods.mp || 0));
    let used = c.dead;
    if (fresh || c._mpu == null) { let v = 0; for (const u of G.st.units) if (u.t === c.tag) v += G.T(u.t, u.u).mp * u.str; c._mpu = v; }
    used += c._mpu;
    for (const t of c.train) used += G.T(c.tag, t.u).mp;
    return { max, used, avail: Math.max(0, max - used) };
  };
  function precomputeManpower() {
    const st = G.st;
    for (const c of Object.values(st.C)) c._mpu = 0;
    for (const u of st.units) st.C[u.t]._mpu += G.T(u.t, u.u).mp * u.str;
  }

  // ---------- İkmal: logistics.js (ikmal merkezleri, altyapı, hava) ----------
  function computeSupply() { G.computeSupplyAll(); }

  // ---------- Ekonomi ----------
  // Kaynak dengesi ve serbest sivil fabrika hesabı (durumu değiştirmez)
  G.econCalc = (c) => {
    const m = c.mods, s = c.sum;
    const sold = (G._sold && G._sold[c.tag]) || {};
    let milAssigned = 0, dockAssigned = 0;
    for (const l of c.lines) { const e = g.EQUIP[l.e]; if (e.fac === 'mil') milAssigned += l.f; else dockAssigned += l.f; }
    const milScale = milAssigned > s.mil ? s.mil / milAssigned : 1;
    const dockScale = dockAssigned > s.dock ? s.dock / dockAssigned : 1;
    const need = {}, have = {}, ratio = {};
    for (const r of g.RES_KEYS) need[r] = 0;
    for (const l of c.lines) { const e = g.EQUIP[l.e]; const f = l.f * (e.fac === 'mil' ? milScale : dockScale); for (const [r, v] of Object.entries(e.res)) need[r] += f * v; }
    const im = G.importsOf(c);
    for (const r of g.RES_KEYS) { have[r] = Math.max(0, (s.res ? s.res[r] : 0) - (sold[r] || 0)) + im.imp[r]; ratio[r] = need[r] > 0 ? Math.min(1, have[r] / need[r]) : 1; }
    const civGross = s.civ + im.expCiv;
    const civAfterCG = Math.max(0, civGross * (1 - m.cg));
    const stab = c.stab ?? 0.5;
    const stabF = stab < 0.5 ? (stab - 0.5) * 0.5 : (stab - 0.5) * 0.2;
    c.res = c.res || [];
    c.econ = { civFree: Math.max(0, civAfterCG - im.civ), civGross, trade: im.civ, expCiv: im.expCiv, need, have, ratio, imp: im.imp, convRatio: im.convRatio,
      needSteel: need.steel, needOil: need.oil, rS: ratio.steel, rO: ratio.oil, cg: Math.round(civGross * m.cg), milScale, dockScale, stabF };
    c.mpAvail = G.manpower(c).avail;
    return c.econ;
  };
  function economy(c) {
    const st = G.st, m = c.mods, s = c.sum;
    const { ratio, milScale, dockScale, stabF } = G.econCalc(c);
    c.ppDay = (2 + (m.pp || 0)) * Math.max(0.2, 1 + (m.ppM || 0) + ((c.stab ?? 0.5) - 0.5) * 0.4);
    c.pp = Math.min(2000, c.pp + c.ppDay);
    // inşaat
    let civ = c.econ.civFree;
    for (let i = 0; i < c.constr.length && civ > 0; i++) {
      const q = c.constr[i];
      const pr = st.prov[q.p];
      if (pr.c !== c.tag) { c.constr.splice(i, 1); i--; continue; }
      const n = Math.min(15, civ); civ -= n;
      q.prog += n * 5 * (1 + (m.construct || 0) + stabF);
      const b = g.BUILDINGS[q.b];
      if (q.prog >= b.cost) {
        if (q.b === 'fort') pr.fort = Math.min(5, pr.fort + 1); else if (q.b === 'inf') { pr.inf = Math.min(5, (pr.inf || 1) + 1); G.supDirty = 1; } else pr[q.b]++;
        c.constr.splice(i, 1); i--;
        if (c.tag === st.player) G.log(`${b.n} tamamlandı: ${G.pname(q.p)}`, [c.tag], 'good');
        G.needSummary = 1;
      }
    }
    // üretim
    const effCap = Math.min(1, 0.6 + (m.effCap || 0));
    const bomb = c.bombed || 0;
    for (const l of c.lines) {
      const e = g.EQUIP[l.e];
      if (!c.mods.unlockEq[l.e]) continue;
      const f = l.f * (e.fac === 'mil' ? milScale : dockScale);
      if (f <= 0) continue;
      l.eff = Math.min(effCap, l.eff + 0.004 * (effCap - l.eff + 0.05));
      let rr = 1; for (const r of Object.keys(e.res)) rr = Math.min(rr, ratio[r]);
      const ic = f * (e.fac === 'mil' ? 4.5 : 2.5) * (e.fac === 'mil' ? l.eff : 1) * Math.max(0.2, 1 + (m.factory || 0) + stabF) * (0.25 + 0.75 * rr) * (1 - bomb);
      if (e.convoy) { c.ships.conv = (c.ships.conv || 0) + ic / e.cost; continue; }
      if (e.ship) {
        l.acc = (l.acc || 0) + ic;
        while (l.acc >= e.cost) { l.acc -= e.cost; G.addShip(c, l.e); if (c.tag === st.player) G.log(`Yeni ${e.n} denize indirildi.`, [c.tag], 'good'); }
      } else {
        const add = ic / e.cost, old = c.stock[l.e] || 0, lv = l.lv || G.bestLevel(c, l.e);
        c.sl[l.e] = old + add > 0 ? ((c.sl[l.e] || lv) * old + lv * add) / (old + add) : lv;
        c.stock[l.e] = old + add;
      }
    }
    // araştırma
    const slots = m.slots;
    while (c.res.length > slots) c.res.pop();
    for (let i = 0; i < c.res.length; i++) {
      const r = c.res[i];
      if (c.tech[r.id]) { c.res.splice(i, 1); i--; continue; }
      r.p += G.resSpeed(c, r.id) * (1 + (r.b || 0));
      if (r.p >= G.techCost(c, r.id)) {
        c.tech[r.id] = 1; c.res.splice(i, 1); i--;
        G.recomputeMods(c);
        if (c.tag === st.player) G.log(`Araştırma tamamlandı: ${g.TECH_BY_ID[r.id].n}`, [c.tag], 'good');
      }
    }
    // odak
    if (c.focus.cur) {
      c.focus.p += 1;
      if (c.focus.p >= G.focusDays(G.focusById(c, c.focus.cur))) G.completeFocus(c, c.focus.cur);
    }
    // gerekçe
    if (c.just) {
      if (!st.C[c.just.t]?.alive || G.atWar(c.tag, c.just.t)) c.just = null;
      else if (--c.just.d <= 0) {
        st.goals[c.tag + '>' + c.just.t] = st.day;
        if (c.tag === st.player || c.just.t === st.player) G.log(`${G.cname(c.tag)}, ${G.cname(c.just.t)} için savaş gerekçesini tamamladı.`, [c.tag, c.just.t], 'warn');
        c.just = null;
      }
    }
    // eğitim
    const mp = G.manpower(c);
    c.mpAvail = mp.avail; c.mpMax = mp.max;
    for (let i = 0; i < c.train.length; i++) {
      const t = c.train[i];
      if (t.d > 0) { t.d--; continue; }
      const def = G.T(c.tag, t.u);
      let ratio = 1;
      for (const [e, n] of Object.entries(def.eq)) ratio = Math.min(ratio, (c.stock[e] || 0) / n);
      if (ratio < 0.25) continue; // teçhizat bekleniyor
      const str = Math.min(1, ratio);
      for (const [e, n] of Object.entries(def.eq)) c.stock[e] -= n * str;
      let loc = c.cap;
      if (loc < 0 || st.prov[loc].c !== c.tag) loc = G.anyOwnProvince(c.tag);
      if (loc < 0) { c.train.splice(i, 1); i--; continue; }
      const u = G.makeUnit(c.tag, t.u, loc, str);
      u.auto = t.auto != null ? t.auto : u.auto;
      // oyuncu: yeni tümenler seçili orduya katılır (HOI4 "konuşlandır")
      if (c.tag === st.player && c.deployArmy && G.armyById(c, c.deployArmy) && G.armyUnits(c, c.deployArmy).length < G.ARMY_MAX) { u.army = c.deployArmy; u.auto = 0; }
      st.units.push(u);
      (G.unitsAt[loc] || (G.unitsAt[loc] = [])).push(u);
      c.train.splice(i, 1); i--;
      if (c.tag === st.player) G.log(`${def.n} eğitimini tamamladı (%${Math.round(str * 100)} güç).`, [c.tag], 'good');
    }
    c.mpAvail = mp.avail; c.mpMax = mp.max;
  }

  G.anyOwnProvince = (tag) => {
    const st = G.st; let best = -1, bv = -1;
    for (let i = 0; i < NP; i++) if (st.prov[i].c === tag && P[i].vp > bv) { bv = P[i].vp; best = i; }
    return best;
  };

  G.techCost = (c, id) => {
    const t = g.TECH_BY_ID[id];
    const yr = G.year(G.st.day);
    return 110 * (1 + Math.max(0, t.year - yr) * 0.9);
  };
  G.techAvailable = (c, id) => {
    const t = g.TECH_BY_ID[id];
    return !c.tech[id] && t.pre.every((p) => c.tech[p]) && !c.res.some((r) => r.id === id);
  };

  G.addFactories = (tag, type, n) => {
    const st = G.st;
    const list = [];
    for (let i = 0; i < NP; i++) if (st.prov[i].c === tag && st.prov[i].o === tag && (type !== 'dock' || P[i].c)) list.push(i);
    list.sort((a, b) => (G.freeSlots(b) - G.freeSlots(a)) || (P[b].vp - P[a].vp));
    for (let k = 0; k < n && list.length; k++) st.prov[list[k % list.length]][type]++;
  };
  G.freeSlots = (i) => { const pr = G.st.prov[i]; return G.slotsOf(i) - pr.civ - pr.mil - pr.dock; };
  G.borderForts = (tag, lv) => {
    const st = G.st;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== tag) continue;
      if (P[i].a.some((j) => st.prov[j].c !== tag)) pr.fort = Math.min(5, pr.fort + lv);
    }
  };

  // ---------- Hava / deniz savaşı (soyut) ----------
  // Hava savaşı: airwar.js (bölgeler, kanatlar, görevler)
  function airNaval() { G.airTick(); }

  // ---------- Hareket ve muharebe ----------
  function moveAndFight() {
    const st = G.st;
    const battles = new Map();
    G.rebuildUnitIndex();
    for (const u of st.units) {
      if (u.dead) continue;
      const stats = G.unitStats(u);
      u._s = stats;
      if (u.ret > 0) u.ret--;
      if (!u.path.length) continue;
      const n = u.path[0];
      if (u.sr && (n >= NP || G.hostileIn(n, u.t) || !G.canEnter(u.t, n) || G.atWar(u.t, st.prov[n].c))) { u.path = []; u.prog = 0; u.sr = 0; continue; }
      if (n < NP) {
        if (!G.canEnter(u.t, n)) { u.path = []; u.prog = 0; continue; }
        if (G.hostileIn(n, u.t)) {
          if (u.org < stats.org * 0.15 || u.ret) { u.path = []; u.prog = 0; continue; }
          let b = battles.get(n); if (!b) battles.set(n, (b = { n, att: [], amph: false }));
          b.att.push(u); if (u.loc >= NP) b.amph = true;
          continue;
        }
      }
      // hareket
      const seaLeg = n >= NP || u.loc >= NP;
      u.prog += seaLeg ? G.SEA_SPEED : stats.spd * (u.sr ? 4 : 1);
      if (u.sr) u.org = Math.min(u.org, stats.org * 0.1);
      if (seaLeg && u.loc >= NP) {
        // denizde düşman üstünlüğü varsa kayıp
        const sup = G.navalSupremacy(u.t, u.loc);
        if (sup < 0.4) u.str = Math.max(0.05, u.str - 0.02 * (0.4 - sup) / 0.4);
      }
      const need = G.edgeDays(u.loc, n, 1) * (seaLeg ? G.SEA_SPEED : G.moveMul(n));
      if (u.prog >= need) {
        const from = u.loc;
        u.loc = n; u.path.shift(); u.prog = 0; u.ent = 0;
        const L = G.unitsAt[from]; if (L) { const k = L.indexOf(u); if (k >= 0) L.splice(k, 1); }
        (G.unitsAt[n] || (G.unitsAt[n] = [])).push(u);
        if (n < NP) G.capture(n, u.t);
        if (!u.path.length) u.sr = 0;
      }
    }
    // muharebeler
    G.battles = [];
    G.inBattle = new Set();
    for (const b of battles.values()) fight(b);
    // muharebede olmayan duran birlikler toparlanır; ikmalsizlik ve kış yıpratır
    for (const u of st.units) if (!u.dead && !u.path.length && !G.inBattle.has(u)) recover(u, u._s);
    for (const u of st.units) if (!u.dead) G.attrition(u);
    // ölüleri temizle
    if (st.units.some((u) => u.dead)) { st.units = st.units.filter((u) => !u.dead); G.rebuildUnitIndex(); }
  }

  function recover(u, s) {
    const st = G.st, c = st.C[u.t];
    if (u.loc >= NP) return;
    const pr = st.prov[u.loc];
    const home = pr.c === u.t || G.friendly(u.t, pr.c);
    u.org = Math.min(s.org, u.org + s.org * (home ? 0.08 : 0.04) * G.supplyMul(u));
    u.ent = Math.min(1, u.ent + 0.04 * (1 + (c.mods.entrench || 0) + (s.t.ent || 0) + (s.gb ? s.gb.ent + s.gb.plan : 0)));
    // modernizasyon: stokta daha yeni model varsa yavaşça değiştir
    if (home && u.lv && st.day % 2 === 0) {
      const T = G.T(u.t, u.u);
      for (const [k, e] of [['inf', 'inf'], ['art', 'art'], ['tank', 'tank']]) {
        const sl = c.sl[e]; if (!sl || !T.eq[e] || sl <= u.lv[k] + 0.04) continue;
        const need = T.eq[e] * 0.04;
        if (c._rf == null || c._rfDay !== st.day) { c._rf = {}; c._rfDay = st.day; }
        const budget = c._rf[e] ?? ((c.stock[e] || 0) - T.eq[e] * 2) * 0.03;
        if (budget < need) continue;
        c._rf[e] = budget - need;
        c.stock[e] -= need; u.lv[k] = Math.min(sl, u.lv[k] + (sl - u.lv[k]) * 0.08 + 0.005);
      }
    }
    if (u.str < 1 && home) {
      const def = G.T(u.t, u.u);
      let r = Math.min(0.05, 1 - u.str);
      const mpNeed = def.mp * r;
      if ((c.mpAvail || 0) < mpNeed) r = Math.max(0, (c.mpAvail || 0) / def.mp);
      for (const [e, n] of Object.entries(def.eq)) r = Math.min(r, (c.stock[e] || 0) / n);
      if (r > 0.001) {
        for (const [e, n] of Object.entries(def.eq)) c.stock[e] -= n * r;
        u.str += r; c.mpAvail -= def.mp * r;
        if (u.xp > 0.2) u.xp = Math.max(0.2, u.xp - (u.xp - 0.2) * r * 0.6);
      }
    }
  }

  // Komutan/şablon arazi bonusu
  function terrainMul(s, te, lat, month) {
    let v = 1 + ((s.t.bonus || {})[te.id] || 0);
    if (s.gb) {
      v += s.gb.terrain[te.id] || 0;
      if (s.gb.winter && lat > 42 && (month >= 10 || month <= 2)) v += s.gb.winter;
    }
    return v;
  }
  function fight(b) {
    const st = G.st;
    const n = b.n, te = g.TERRAIN[P[n].te], pr = st.prov[n];
    const attTag = b.att[0].t;
    const defs = (G.unitsAt[n] || []).filter((u) => !u.dead && G.atWar(u.t, attTag));
    const atts = b.att.filter((u) => !u.dead && defs.some((d) => G.atWar(u.t, d.t)));
    if (!defs.length || !atts.length) return;
    const width = (te.width + (P[n].ar > 1500 ? 1 : 0)) * 20;
    atts.sort((a, b2) => b2.org - a.org); defs.sort((a, b2) => b2.org - a.org);
    const fit = (L) => { const out = []; let w = 0; for (const u of L) { const uw = u._s.t.w || 15; if (out.length && w + uw > width) break; out.push(u); w += uw; } return out; };
    const A = fit(atts), D = fit(defs);
    for (const u of defs) G.inBattle.add(u);
    for (const u of atts) { G.inBattle.add(u); u.bd = u.bt === n ? (u.bd || 0) + 1 : 0; u.bt = n; }
    const avgPrc = (L) => L.reduce((s, u) => s + u._s.prc, 0) / L.length;
    const dPrc = avgPrc(D), aPrc = avgPrc(A);
    const diffMul = (tag) => (tag === st.player ? 1 : [1.15, 1, 0.9][st.opts.diff] || 1);
    const lat = P[n].lat, month = G.dateOf(st.day).getUTCMonth();
    // uçaksavar: düşman hava üstünlüğünü azaltır
    const aaOf = (L) => Math.min(0.5, L.reduce((s, u) => s + (u._s.t.aa || 0), 0) / L.length * 2);
    const airAdj = (mod, enemyAA) => (mod > 1 ? 1 + (mod - 1) * (1 - enemyAA) : mod);
    const aAA = aaOf(A), dAA = aaOf(D);
    const aAirM = G.airCombatMod(attTag, n), dAirM = G.airCombatMod(defs[0].t, n);
    let hitD = 0, hitA = 0;
    for (const u of A) {
      const s = u._s, c = st.C[u.t];
      let atk = s.atk * u.str * (0.4 + 0.6 * Math.min(1, u.org / s.org));
      let tm = (1 + te.atk) * terrainMul(s, te, lat, month);
      if (b.amph && u.loc >= NP) { const am = Math.min(0.9, 0.5 + (c.mods.invasion || 0) + (s.gb ? s.gb.amph * 0.3 : 0)); tm *= am + (0.9 - am) * (s.t.amph || 0); }
      if (u.army) { const ar = G.armyById(c, u.army); if (ar) { tm *= 1 + (ar.plan || 0); ar._fought = st.day; } }
      else if (s.gb && s.gb.plan && u.bd < 8) tm *= 1 + 0.5 * s.gb.plan * (1 - u.bd / 8);
      atk *= Math.max(0.3, tm * G.wxAtk(n)) * airAdj(aAirM, dAA) * diffMul(u.t) * G.supplyMul(u) * (c.decryptAll || (c.decrypt && c.decrypt[defs[0].t] > st.day) ? 1.12 : 1);
      if (s.arm > dPrc) atk *= 1.25;
      hitD += atk;
    }
    for (const u of D) {
      const s = u._s, c = st.C[u.t];
      let atk = s.atk * u.str * (0.4 + 0.6 * Math.min(1, u.org / s.org));
      atk *= airAdj(dAirM, aAA) * (1 + 0.1 * pr.fort) * diffMul(u.t) * G.supplyMul(u) * terrainMul(s, te, lat, month) * (c.decryptAll || (c.decrypt && c.decrypt[attTag] > st.day) ? 1.12 : 1);
      if (s.arm > aPrc) atk *= 1.25;
      hitA += atk;
    }
    const rD = 0.85 + G.rand() * 0.3, rA = 0.85 + G.rand() * 0.3;
    const perD = (hitD * 0.9 * rD) / D.length, perA = (hitA * 0.9 * rA) / A.length;
    const casMul = (s) => Math.max(0.4, 1 - (s.t.cas || 0) - (s.gb ? s.gb.cas : 0));
    for (const u of D) {
      const s = u._s;
      const def = s.def * (1 + 0.15 * pr.fort) * (1 + 0.25 * u.ent) * terrainMul(s, te, lat, month) * (G.WINTER_READY.has(u.t) ? 1 + 0.25 * G.wx.snow[n] : 1);
      let ol = perD * 20 / (20 + def);
      if (s.arm > aPrc) ol *= 0.6;
      u.org -= ol; const sl = ol * (s.arm > aPrc ? 0.0025 : 0.004);
      u.str -= sl; st.C[u.t].dead += sl * s.t.mp * casMul(s);
    }
    for (const u of A) {
      const s = u._s;
      const brk = s.def * 0.5 + s.atk * 0.35;
      let ol = perA * 20 / (20 + brk);
      if (s.arm > dPrc) ol *= 0.6;
      u.org -= ol; const sl = ol * (s.arm > dPrc ? 0.003 : 0.005);
      u.str -= sl; st.C[u.t].dead += sl * s.t.mp * casMul(s);
    }
    // tümen tecrübesi (muharebede çarpışan tümenler)
    for (const u of A) u.xp = Math.min(1, (u.xp ?? 0.25) + 0.004 * (st.C[u.t].mods.xpGain ? 1 + st.C[u.t].mods.xpGain : 1));
    for (const u of D) u.xp = Math.min(1, (u.xp ?? 0.25) + 0.003);
    // komutan tecrübesi
    const gens = new Set();
    for (const u of A.concat(D)) { const gen = G.genOf(u); if (gen && u.army) gens.add([u.t, gen]); }
    for (const [tag, gen] of gens) if (G.genXP(gen, 1) && tag === st.player) G.log(`${gen.n} terfi etti (seviye ${gen.lvl}).`, [tag], 'good');
    // sonuçlar
    let lost = 0;
    for (const u of defs) {
      if (u.str <= 0.03) { u.dead = 1; lost++; continue; }
      if (u.org <= 0.5) { if (!retreat(u, n, atts)) { u.dead = 1; lost++; } }
    }
    for (const u of atts) {
      if (u.str <= 0.03) { u.dead = 1; continue; }
      if (u.org <= 0.5) { u.org = 0; u.path = []; u.prog = 0; }
    }
    if (lost && (defs[0].t === st.player || attTag === st.player)) G.log(`${G.pname(n)}: ${lost} tümen kuşatılarak imha edildi!`, [defs[0].t, attTag], defs[0].t === st.player ? 'bad' : 'good');
    const remaining = defs.filter((u) => !u.dead && u.loc === n).length;
    const aPow = A.reduce((s, u) => s + u.org / u._s.org, 0) / A.length, dPow = D.reduce((s, u) => s + Math.max(0, u.org) / u._s.org, 0) / D.length;
    G.battles.push({ n, att: attTag, def: defs[0].t, from: atts[0].loc, adv: aPow / (aPow + dPow + 0.001), na: atts.length, nd: remaining,
      A, D, atts, defs, width, te: te.id, fort: pr.fort, amph: b.amph, hitA, hitD, aAir: aAirM, dAir: dAirM });
    if (!remaining) for (const u of atts) if (!u.dead) u.prog = Math.max(u.prog, G.edgeDays(u.loc, n, 1) * (u.loc >= NP ? G.SEA_SPEED : 1) * 0.6);
  }

  function retreat(u, n, atts) {
    const st = G.st;
    const fromSet = new Set(atts.map((a) => a.loc));
    let best = -1, bs = -Infinity;
    for (const j of P[n].a) {
      const pr = st.prov[j];
      if (!(pr.c === u.t || G.friendly(u.t, pr.c))) continue;
      if (G.hostileIn(j, u.t)) continue;
      let sc = G.rand() * 0.5 - (fromSet.has(j) ? 10 : 0);
      for (const k of P[j].a) if (G.atWar(u.t, st.prov[k].c)) sc -= 0.5;
      if (pr.c === u.t) sc += 1;
      if (sc > bs) { bs = sc; best = j; }
    }
    if (best < 0) return false;
    const L = G.unitsAt[n]; const k = L.indexOf(u); if (k >= 0) L.splice(k, 1);
    u.loc = best; u.path = []; u.prog = 0; u.org = 0; u.ent = 0; u.ret = 4;
    (G.unitsAt[best] || (G.unitsAt[best] = [])).push(u);
    return true;
  }

  G.capture = (n, tag) => {
    const st = G.st, pr = st.prov[n];
    if (pr.c === tag || !G.atWar(tag, pr.c)) return;
    const prev = pr.c;
    let nc = tag;
    if (pr.o !== tag && st.C[pr.o]?.alive && G.sameFaction(tag, pr.o) && !G.atWar(tag, pr.o)) nc = pr.o;
    else if (pr.core !== tag && st.C[pr.core]?.alive && G.sameFaction(tag, pr.core) && !G.atWar(tag, pr.core)) nc = pr.core;
    pr.c = nc;
    G.mapDirty = 1; G.needSummary = 1;
    if (P[n].vp >= 10 && (tag === st.player || prev === st.player || pr.o === st.player)) G.log(`${G.pname(n)} ${G.cname(nc)} kontrolüne geçti.`, [nc, prev], prev === st.player ? 'bad' : 'good');
  };

  // ---------- Teslim olma ----------
  function capitulations() {
    const st = G.st;
    if (G.cwDirty) G.recalcCoreWeights();
    const have = {};
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i], core = pr.core, c = st.C[core];
      if (!c || !c.enemies.length) continue;
      if (pr.c === core || (!c.eset.has(pr.c) && G.friendly(core, pr.c))) have[core] = (have[core] || 0) + G.cw[i];
    }
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.enemies.length) continue;
      const lost = 1 - (have[c.tag] || 0) / (c.startW || 1);
      // başkent düştüyse en değerli toprağa taşı
      if (c.cap >= 0 && st.prov[c.cap].c !== c.tag) {
        let best = -1, bv = -1;
        for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag && P[i].vp > bv) { bv = P[i].vp; best = i; }
        if (best >= 0) { if (c.tag === st.player) G.log(`Başkent ${G.pname(best)} şehrine taşındı.`, [c.tag], 'bad'); c.cap = best; }
      }
      // otoriter büyük güçler sonuna dek savaşır (HOI4: Almanya ve Japonya geç teslim olur)
      const th = Math.min(0.95, (c.tag === 'SOV' ? 0.85 : c.tag === 'CHI' ? 0.92 : c.major ? (c.ideo === 'fas' || c.ideo === 'com' ? 0.8 : 0.68) : 0.58) + ((c.ws ?? 0.3) - 0.3) * 0.12);
      c.surrender = lost / th;
      if (lost >= th) G.capitulate(c.tag);
    }
  }

  G.capitulate = (tag) => {
    const st = G.st, c = st.C[tag];
    const enemies = c.enemies.slice();
    // en çok toprak tutan düşman
    const held = {};
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === tag && pr.c !== tag && enemies.includes(pr.c)) held[pr.c] = (held[pr.c] || 0) + P[i].vp + 1; }
    let winner = enemies[0]; let hv = -1;
    for (const [t, v] of Object.entries(held)) if (v > hv) { hv = v; winner = t; }
    // işgal edilen topraklar işgalciye geçer
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (pr.o === tag && pr.c !== tag) { pr.o = pr.c; pr.core = pr.c; }
    }
    // işgalcilerin yeni çekirdek toprakları
    G.cwDirty = 1;
    for (const t of enemies) if (st.C[t]?.alive) st.C[t].startW = G.coreWeight(t, true);
    // kalan toprak çok azsa tamamen ilhak
    G.cwDirty = 1;
    const remain = G.coreWeight(tag, false);
    const full = remain < (c.startW || 1) * 0.12;
    if (!full && st.prov[c.cap]?.o !== tag) { G.updateSummaries(); c.cap = G.anyOwnProvince(tag); G.cwDirty = 1; }
    if (full && winner) {
      for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === tag) { pr.o = pr.c = pr.core = winner; } }
    }
    // savaşlardan çık
    for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete st.wars[k]; }
    // diğer ülkelerin bu ülkenin topraklarındaki birlikleri çekilir
    if (c.fac) G.leaveFaction(tag);
    for (const u of st.units) if (u.t === tag && (u.loc >= NP || st.prov[u.loc].c !== tag)) u.dead = 1;
    st.units = st.units.filter((u) => !u.dead);
    c.train = []; c.just = null;
    st.tension = Math.min(100, st.tension + 3);
    G.refreshEnemies();
    G.mapDirty = 1; G.needSummary = 1;
    G.updateSummaries();
    if (full || !c.alive) G.killCountry(tag);
    else { G.cwDirty = 1; c.startW = G.coreWeight(tag, true); c.surrender = 0; }
    const msg = full ? `${G.cname(tag)} teslim oldu ve ${G.cname(winner)} tarafından ilhak edildi!` : `${G.cname(tag)} teslim oldu! Kalan toprakları tarafsız bir rejim altında.`;
    G.log(msg, [tag, winner], tag === st.player ? 'bad' : 'major');
    if (G.onCapitulate) G.onCapitulate(tag, winner, full);
    // barış konferansı: oyuncu kazanansa kukla devlet seçeneği
    if (winner === st.player && tag !== st.player && G.queuePopup) {
      G.queuePopup({ title: 'Barış Konferansı', text: `${G.cname(tag)} teslim oldu. İşgal ettiğimiz asli topraklarında ne yapalım?`, opts: [
        { n: 'Topraklarını ilhak et', fx: () => {} },
        { n: 'Kukla devlet olarak kur', fx: () => G.makePuppet(st.player, tag) },
      ] });
    }
    G.rebuildUnitIndex();
  };

  G.killCountry = (tag) => {
    const st = G.st, c = st.C[tag];
    if (!c.alive) return;
    c.alive = 0;
    for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete st.wars[k]; }
    if (c.fac) G.leaveFaction(tag);
    st.units = st.units.filter((u) => u.t !== tag);
    c.train = []; c.constr = [];
    G.refreshEnemies();
    G.rebuildUnitIndex();
    if (tag === st.player) { st.over = 1; if (G.onGameOver) G.onGameOver(); }
  };

  G._moveAndFight = moveAndFight;
  // ---------- Ana gün döngüsü ----------
  G.tick = () => {
    const st = G.st;
    if (st.over === 1) return;
    st.day++;
    if (G.updateWeather()) G.supDirty = 1;
    if (G.needSummary) { G.updateSummaries(); G.needSummary = 0; }
    G.precomputeTrade();
    airNaval();
    G.navalTick();
    if (st.day % 7 === 3) G.tradeTick();
    precomputeManpower();
    if (st.day % 5 === 0 || G.supDirty) { computeSupply(); G.supDirty = 0; }
    for (const c of Object.values(st.C)) if (c.alive) { G.polTick(c); economy(c); }
    // yapay zekâ
    const tags = Object.keys(st.C);
    for (let i = 0; i < tags.length; i++) {
      const c = st.C[tags[i]]; if (!c.alive) continue;
      if (tags[i] === st.player) { G.playerAuto(c, i); continue; }
      if ((st.day + i) % 2 === 0) G.aiMilitary(c);
      if ((st.day + i) % 7 === 0) G.aiEconomy(c);
      if ((st.day + i) % 10 === 0) G.aiAir(c);
      if ((st.day + i) % 15 === 0) G.aiDiplomacy(c);
    }
    moveAndFight();
    if (G.needSummary) { G.updateSummaries(); G.needSummary = 0; }
    capitulations();
    G.checkEvents();
    if (st.day % 5 === 0) G.timedSpirits();
    if (st.day % 10 === 0) G.expelUnits();
    G.opsTick();
    if (st.day % 30 === 0) st.tension = Math.max(0, st.tension - 0.3);
  };
})(window);
