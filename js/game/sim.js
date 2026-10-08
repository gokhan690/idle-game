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
      const k = (pr.core === pr.c ? 1 : own ? 0.6 : 0.3) * (G.occMul ? G.occMul(pr) : 1);
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
        const D = G.lineDesign(c, l);
        const add = ic / (e.cost * (D ? G.designStats(l.e, D).cm : 1)), old = c.stock[l.e] || 0, lv = l.lv || G.bestLevel(c, l.e);
        if (D) G.stockAdd(c, l.e, old, add, D);
        else c.sl[l.e] = old + add > 0 ? ((c.sl[l.e] || lv) * old + lv * add) / (old + add) : lv;
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
      if (ratio < 0.25) { // teçhizat bekleniyor; YZ uzun bekleyen tümeni iptal eder
        t.w = (t.w || 0) + 1;
        if (c.tag !== st.player && t.w > 60) { c.train.splice(i, 1); i--; }
        continue;
      }
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
  // Kara doktrini dalları: dm/df/dg/da — yalnızca bir dal (HOI4)
  G.docTreeOf = (id) => (/^d[mfga][1-4]$/.test(id) ? id[1] : null);
  G.docTree = (c) => { for (const id of Object.keys(c.tech)) { const t = G.docTreeOf(id); if (t) return t; } for (const r of c.res || []) { const t = G.docTreeOf(r.id); if (t) return t; } return null; };
  G.docPref = (c) => ({ GER: 'm', SOV: 'a', CHI: 'a', PRC: 'a', ENG: 'g', FRA: 'g', JAP: 'g', USA: 'f', ITA: 'f', TUR: 'g' })[c.tag] || ({ fas: 'm', com: 'a', dem: 'f' })[c.ideo] || 'g';
  G.techAvailable = (c, id) => {
    const t = g.TECH_BY_ID[id]; if (!t) return false;
    const tr = G.docTreeOf(id); if (tr) { const cur = G.docTree(c); if (cur && cur !== tr) return false; }
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

  // Denizde rotasız kalan birlik (bozulan çıkarma, kapanan boğaz): en yakın dost limana döner
  G.returnToPort = (u) => {
    const st = G.st, prev = new Map([[u.loc, -1]]), q = [u.loc];
    for (let k = 0; k < q.length; k++) {
      const n = q[k];
      let port = -1;
      for (const [b] of G.adj[n]) {
        if (b >= NP) continue;
        const c = st.prov[b].c;
        if ((c === u.t || (G.friendly(u.t, c) && !G.atWar(u.t, c))) && !G.hostileIn(b, u.t)) { port = b; if (c === u.t) break; }
      }
      if (port >= 0) { const path = [port]; let x = n; while (x !== u.loc) { path.unshift(x); x = prev.get(x); } u.path = path; u.prog = 0; return true; }
      for (const [b] of G.adj[n]) if (b >= NP && !prev.has(b) && !G.straitBlocked(u.t, n, b)) { prev.set(b, n); q.push(b); }
    }
    return false;
  };

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
      if (!u.path.length && u.loc >= NP && !G.returnToPort(u)) u.str = Math.max(0.05, u.str - 0.01);
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
    for (const u of st.units) if (!u.dead) reinforce(u, !u.path.length && !G.inBattle.has(u));
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
        const sl = c.sl[e]; if (!sl || !T.eq[e]) continue;
        if (k === 'tank') { if (u.lv.tq && G.vecLevel('tank', G.stockVec(c, 'tank')) <= G.vecLevel('tank', u.lv.tq) + 0.04) continue; } else if (sl <= u.lv[k] + 0.04) continue;
        const need = T.eq[e] * 0.04;
        if (c._rf == null || c._rfDay !== st.day) { c._rf = {}; c._rfDay = st.day; }
        // takviye önceliklidir: yalnızca ordunun ihtiyacının üstündeki stok modernizasyona gider
        if (c._ae == null || c._aeDay !== st.day) { c._ae = {}; c._aeDay = st.day; for (const x of st.units) if (x.t === c.tag) { const tx = G.T(x.t, x.u); for (const [q, v] of Object.entries(tx.eq)) c._ae[q] = (c._ae[q] || 0) + v; } }
        const budget = c._rf[e] ?? Math.max(0, (c.stock[e] || 0) - (c._ae[e] || 0) * (c.enemies.length ? 0.2 : 0.05)) * 0.015;
        if (budget < need) continue;
        c._rf[e] = budget - need;
        c.stock[e] -= need;
        if (k === 'tank') { u.lv.tq = G.blendVec(u.lv.tq || G.stockVec(c, 'tank'), G.stockVec(c, 'tank'), 0.1); u.lv.tank = G.vecLevel('tank', u.lv.tq); u._sd = -1; }
        else u.lv[k] = Math.min(sl, u.lv[k] + (sl - u.lv[k]) * 0.08 + 0.005);
      }
    }
  }
  // Takviye (HOI4: muharebede ve harekette de sürer; ikmal ve dost toprak gerekir)
  function reinforce(u, still) {
    const st = G.st, c = st.C[u.t];
    if (u.loc >= NP || u.str >= 1) return;
    const pr = st.prov[u.loc];
    if (!(pr.c === u.t || G.friendly(u.t, pr.c))) return;
    const sr = G.supplyRatio(u); if (sr < 0.4) return;
    {
      const def = G.T(u.t, u.u);
      let r = Math.min((still ? 0.05 : 0.025) * Math.min(1, sr + 0.2), 1 - u.str);
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
  // HOI4 muharebe modeli: her tümenin saldırısı = yumuşak·(1−sertlik) + sert·sertlik (hedef tarafın sertliği).
  // Gelen saldırılar savunmayla (savunan) ya da atılımla (saldıran) karşılanır: karşılanan kısım %10,
  // aşan kısım %40 isabet eder. Zırh, karşı tarafın delmesinden yüksekse hasar yarıya kadar düşer.
  G.COMBAT = { H: 24, lo: 0.1, hi: 0.4, kOrg: 0.03, kStr: 0.009 };
  const sideHard = (L) => { let h = 0, w = 0; for (const u of L) { h += (u._s.hd || 0) * u.str; w += u.str; } return w ? h / w : 0; };
  const sidePrc = (L) => { let mx = 0, s = 0; for (const u of L) { mx = Math.max(mx, u._s.prc); s += u._s.prc; } return L.length ? 0.4 * mx + 0.6 * s / L.length : 0; };
  G.sideHard = sideHard; G.sidePrc = sidePrc;
  // Vatan savunması: asli topraklarında savunan ülke, teslim olmaya yaklaştıkça daha inatçı direnir (HOI4: seferberlik, Volkssturm, Büyük Vatanseverlik)
  // Tarihî akış dengesi (yalnızca tarihî YZ modunda, YZ'ye karşı YZ muharebelerinde):
  // kilit cephelerde savunanın asli toprak kaybı tarihî eğriden çok saparsa, geride kalan taraf
  // muharebede kademeli üstünlük kazanır (en çok %30-50). Oyuncunun muharebelerine uygulanmaz.
  // Eğri türleri:
  //  - ülke: savunanın asli toprak kaybı (oran) tarihî eğriyle karşılaştırılır
  //  - bölge: saldıran tarafın belirli şehirleri kontrol oranı (ör. Güneydoğu Asya kaynak bölgesi)
  // aMax: saldıran geride kalınca en çok destek, dMax: saldıran önde gidince savunana en çok destek,
  // aFrom: saldırana destek bu tarihten önce verilmez (erken taarruz dönemi)
  // anc: çapa savaş [taraf, taraf, tarihî başlangıç]. Eğri, bu savaşın gerçek başlangıcına göre kayar:
  // oyuncu Barbarossa'yı bir yıl geciktirirse Doğu Cephesi eğrisi de bir yıl kayar. Çapa savaşı hiç
  // başlamadıysa eğri uygulanmaz. Oyuncunun taraf olduğu cephelerde eğri büyük ölçüde gevşer.
  const HIST_COURSE = [
    { a: 'GER', d: 'SOV', anc: ['GER', 'SOV', '1941-06-22'], pts: [['1941-06-22', 0], ['1941-09-01', 0.24], ['1941-12-01', 0.36], ['1942-05-01', 0.34], ['1942-11-15', 0.44], ['1943-03-15', 0.36], ['1943-09-01', 0.28], ['1943-12-31', 0.2], ['1944-06-15', 0.12], ['1944-09-01', 0.03], ['1945-01-01', 0]], aMax: 0.3, dMax: 0.5 },
    { a: 'JAP', d: 'CHI', anc: ['JAP', 'CHI', '1937-07-07'], pts: [['1937-07-07', 0], ['1938-01-01', 0.25], ['1938-11-01', 0.42], ['1944-12-31', 0.48], ['1945-08-15', 0.42]], aMax: 0.35, dMax: 0.5, aFrom: '1939-06-01' },
    { a: '*', d: 'GER', anc: ['GER', 'SOV', '1941-06-22'], pts: [['1939-09-01', 0], ['1944-06-06', 0], ['1944-12-31', 0.04], ['1945-02-15', 0.2], ['1945-04-15', 0.6], ['1945-05-08', 0.9]], aMax: 0.3, dMax: 0.6 },
    // Güneydoğu Asya ve Pasifik: Japonya'nın kontrol oranı (1942 baharı genişleme, 1944-45 geri çekilme)
    { a: 'JAP', anc: ['JAP', 'USA', '1941-12-07'], set: ['Manila', 'Cebu City', 'San Jose', 'Singapur', 'Kuala Lumpur', 'Kota Bharu', 'Hong Kong', 'Batavya', 'Palembang', 'Balikpapan', 'Medan', 'Surabaya', 'Semarang', 'Rangun', 'Rabaul', 'Guam', 'Wake', 'Kuching'],
      pts: [['1941-12-07', 0], ['1942-01-20', 0.45], ['1942-04-01', 0.9], ['1944-10-01', 0.9], ['1945-03-15', 0.6], ['1945-08-15', 0.45]], aMax: 0.4, dMax: 0.4,
      region: (n) => n < NP && ((P[n].lon > 90 && P[n].lat < 24 && P[n].lat > -15) || P[n].lon > 140 || P[n].lon < -150) },
  ];
  for (const h of HIST_COURSE) {
    h.pts = h.pts.map(([d, v]) => [G.dayOf(d), v]);
    h.aFromD = h.aFrom ? G.dayOf(h.aFrom) : 0;
    h.ancD = G.dayOf(h.anc[2]);
    h.key = h.a + '>' + (h.d || 'bölge');
  }
  // çapa savaşının gerçek başlangıcı ile tarihî başlangıç arasındaki fark (gün); savaş hiç başlamadıysa null
  const histShift = (h) => {
    const st = G.st, k = G.pairKey(h.anc[0], h.anc[1]);
    const d = (st.wstart && st.wstart[k]) ?? st.wars[k]?.since;
    return d == null ? null : d - h.ancD;
  };
  // oyuncu bu cephede taraf mı
  const playerIn = (h, hi) => {
    const st = G.st, pl = st.player, pc = st.C[pl];
    if (!pc || !pc.alive || !pc.enemies.length) return false;
    if (h.set) return pl === h.a || G.sameFaction(pl, h.a) || (G.atWar(pl, h.a) && SETS[hi].some((i) => st.prov[i].core === pl));
    if (pl === h.a || pl === h.d) return true;
    if (G.atWar(pl, h.d) && (h.a === '*' || G.sameFaction(pl, h.a))) return true;
    if (G.sameFaction(pl, h.d) && (h.a === '*' || G.atWar(pl, h.a))) return true;
    return false;
  };
  let SETS = null;
  const refAt = (pts, day) => { if (day <= pts[0][0]) return pts[0][1]; for (let k = 1; k < pts.length; k++) if (day <= pts[k][0]) { const [d0, v0] = pts[k - 1], [d1, v1] = pts[k]; return v0 + (v1 - v0) * (day - d0) / (d1 - d0); } return pts[pts.length - 1][1]; };
  // saldıranın tarihî eğriye göre ne kadar önde olduğu (yoksa null)
  G.histAhead = (a, d) => { const x = G._hcs && G._hcs[a + '>' + d]; return x ? x.loss - x.ref : null; };
  G.histCourse = () => {
    const st = G.st; G._hc = []; G._hcs = {};
    if (!st.opts.hist) return;
    if (!SETS) SETS = HIST_COURSE.map((h) => (h.set ? h.set.map((nm) => P.findIndex((p) => p.n === nm)).filter((i) => i >= 0) : null));
    HIST_COURSE.forEach((h, hi) => {
      const sh = histShift(h);
      if (sh == null) return;
      const day = st.day - sh; // tarihî takvime çevrilmiş gün
      if (day < h.pts[0][0]) return;
      let v; // saldıranın ilerleme ölçüsü (ülke: savunanın kaybı, bölge: saldıranın kontrol oranı)
      if (h.set) {
        if (!st.C[h.a]?.alive || !st.C[h.a].enemies.length) return;
        let w = 0, x = 0;
        for (const i of SETS[hi]) { const k = 1 + P[i].vp; w += k; const pc = st.prov[i].c; if (pc === h.a || (G.sameFaction(pc, h.a) && !G.atWar(pc, h.a))) x += k; }
        v = w ? x / w : 0;
      } else {
        const d = h.d;
        if (!st.C[d]?.alive) return;
        if (h.a === '*' ? !st.C[d].enemies.length : !(st.C[h.a]?.alive && G.atWar(h.a, d))) return;
        let hh = 0, w = 0;
        for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.oc !== d) continue; const x = 1 + P[i].vp; w += x; if (pr.c === d || (G.sameFaction(d, pr.c) && !G.atWar(d, pr.c))) hh += x; }
        v = 1 - hh / Math.max(1, w);
      }
      const ref = refAt(h.pts, day), e = v - ref; // + : saldıran tarihten önde
      // oyuncu taraf olduğunda tarih onun elinde: geniş tolerans ve zayıf düzeltme
      const pl = playerIn(h, hi), tol = pl ? 0.12 : 0.05, str = pl ? 0.35 : 1;
      G._hcs[h.key] = { loss: v, ref, pl };
      if (Math.abs(e) < tol) return;
      if (e < 0 && day < h.aFromD) return;
      G._hc.push({ h, fav: e > 0 ? 'd' : 'a', k: str * Math.min(1, (Math.abs(e) - tol) / 0.25) * (e > 0 ? h.dMax : h.aMax) });
    });
  };
  // taraf çarpanı: x tarafı y'ye karşı (n: muharebe eyaleti, bölgesel eğriler için)
  G.histMul = (x, y, n) => {
    const st = G.st; if (!G._hc || !G._hc.length || x === st.player || y === st.player) return 1;
    // birden çok eğri eşleşirse (ör. Doğu Cephesi ve Almanya'nın asli toprakları) etkiler birleşir
    let m = 1;
    for (const { h, fav, k } of G._hc) {
      if (h.region && (n == null || !h.region(n))) continue;
      const inA = (t) => (h.a === '*' ? G.atWar(t, h.d) : t === h.a || G.sameFaction(t, h.a));
      const inD = (t) => (h.set ? G.atWar(t, h.a) : t === h.d);
      let side = null;
      if (inA(x) && inD(y)) side = 'a'; else if (inD(x) && inA(y)) side = 'd';
      if (!side) continue;
      m *= side === fav ? 1 + k : 1 - k / 2;
    }
    return Math.max(0.55, Math.min(1.6, m));
  };
  G.homeDef = (tag, n) => { const pr = G.st.prov[n]; if (pr.core !== tag) return 1; const c = G.st.C[tag]; return 1 + 0.35 * Math.min(1, c.surrender || 0); };
  function fight(b) {
    const st = G.st, CB = G.COMBAT;
    const n = b.n, te = g.TERRAIN[P[n].te], pr = st.prov[n];
    const attTag = b.att[0].t;
    const defs = (G.unitsAt[n] || []).filter((u) => !u.dead && G.atWar(u.t, attTag));
    const atts = b.att.filter((u) => !u.dead && defs.some((d) => G.atWar(u.t, d.t)));
    if (!defs.length || !atts.length) return;
    for (const u of defs) if (!u._s || u._sd !== st.day) u._s = G.unitStats(u);
    // cephe genişliği: arazi + birden çok yönden saldırıda kanat genişliği (HOI4: +%50 / yön)
    const dirs = new Set(atts.map((u) => u.loc)).size;
    const baseW = (te.width + (P[n].ar > 1500 ? 1 : 0)) * 20;
    const width = Math.round(baseW * (1 + 0.5 * Math.min(2, dirs - 1)));
    atts.sort((a, b2) => b2.org / b2._s.org - a.org / a._s.org); defs.sort((a, b2) => b2.org / b2._s.org - a.org / a._s.org);
    const fit = (L, wmax) => { const out = []; let w = 0; for (const u of L) { const uw = u._s.t.w || 15; if (out.length && w + uw > wmax) break; out.push(u); w += uw; } return out; };
    const A = fit(atts, width), D = fit(defs, baseW);
    for (const u of defs) G.inBattle.add(u);
    for (const u of atts) { G.inBattle.add(u); u.bd = u.bt === n ? (u.bd || 0) + 1 : 0; u.bt = n; }
    const diffMul = (tag) => (tag === st.player ? 1 : [1.15, 1, 0.9][st.opts.diff] || 1);
    const lat = P[n].lat, month = G.dateOf(st.day).getUTCMonth();
    // uçaksavar: düşman hava üstünlüğünü azaltır
    const aaOf = (L) => Math.min(0.5, L.reduce((s, u) => s + (u._s.t.aa || 0), 0) / L.length * 2);
    const airAdj = (mod, enemyAA) => (mod > 1 ? 1 + (mod - 1) * (1 - enemyAA) : mod);
    const aAA = aaOf(A), dAA = aaOf(D);
    const aAirM = G.airCombatMod(attTag, n), dAirM = G.airCombatMod(defs[0].t, n);
    const hdA = sideHard(A), hdD = sideHard(D), prcA = sidePrc(A), prcD = sidePrc(D);
    const hmA = G.histMul(attTag, defs[0].t, n), hmD = G.histMul(defs[0].t, attTag, n);
    let hitD = 0, hitA = 0;
    for (const u of A) {
      const s = u._s, c = st.C[u.t];
      let atk = (s.sa * (1 - hdD) + s.ha * hdD) * u.str;
      let tm = (1 + te.atk) * terrainMul(s, te, lat, month) * (1 - 0.1 * pr.fort);
      if (b.amph && u.loc >= NP) { const am = Math.min(0.9, 0.5 + (c.mods.invasion || 0) + (s.gb ? s.gb.amph * 0.3 : 0)); tm *= am + (0.9 - am) * (s.t.amph || 0); }
      if (u.army) { const ar = G.armyById(c, u.army); if (ar) { tm *= 1 + (ar.plan || 0); ar._fought = st.day; } }
      else if (s.gb && s.gb.plan && u.bd < 8) tm *= 1 + 0.5 * s.gb.plan * (1 - u.bd / 8);
      const wx = G.WINTER_READY.has(u.t) ? 1 - 0.2 * G.wx.snow[n] - 0.3 * G.wx.mud[n] : G.wxAtk(n);
      atk *= Math.max(0.25, tm * wx) * airAdj(aAirM, dAA) * diffMul(u.t) * G.supplyMul(u) * hmA * (c.decryptAll || (c.decrypt && c.decrypt[defs[0].t] > st.day) ? 1.12 : 1);
      hitD += atk; G.contrib(defs[0].t, u.t, atk);
    }
    for (const u of D) {
      const s = u._s, c = st.C[u.t];
      let atk = (s.sa * (1 - hdA) + s.ha * hdA) * u.str;
      atk *= airAdj(dAirM, aAA) * diffMul(u.t) * G.supplyMul(u) * terrainMul(s, te, lat, month) * hmD * (c.decryptAll || (c.decrypt && c.decrypt[attTag] > st.day) ? 1.12 : 1);
      hitA += atk; G.contrib(attTag, u.t, atk);
    }
    const rD = 0.85 + G.rand() * 0.3, rA = 0.85 + G.rand() * 0.3;
    const wOf = (L) => L.reduce((s, u) => s + (u._s.t.w || 15), 0);
    const wA = wOf(A), wD = wOf(D);
    const hits = (inc, dv) => (Math.min(inc, dv) * CB.lo + Math.max(0, inc - dv) * CB.hi) * CB.H;
    const casMul = (s) => Math.max(0.4, 1 - (s.t.cas || 0) - (s.gb ? s.gb.cas : 0));
    for (const u of D) {
      const s = u._s;
      const inc = hitD * rD * (s.t.w || 15) / wD;
      const dv = s.df * u.str * (1 + 0.15 * pr.fort) * (1 + 0.25 * u.ent) * terrainMul(s, te, lat, month) * (G.WINTER_READY.has(u.t) ? 1 + 0.25 * G.wx.snow[n] : 1) * G.homeDef(u.t, n) * hmD;
      const h = hits(inc, dv), armF = s.arm > 0 ? Math.max(0.5, Math.min(1, prcA / s.arm)) : 1;
      u.org -= h * CB.kOrg * armF;
      const sl = h * CB.kStr * armF / Math.max(10, s.hp);
      u.str -= sl; st.C[u.t].dead += sl * s.t.mp * casMul(s);
    }
    for (const u of A) {
      const s = u._s;
      const inc = hitA * rA * (s.t.w || 15) / wA;
      const bv = s.bt * u.str * (u.loc >= NP ? 0.5 : 1) * hmA;
      const h = hits(inc, bv), armF = s.arm > 0 ? Math.max(0.5, Math.min(1, prcD / s.arm)) : 1;
      u.org -= h * CB.kOrg * armF;
      const sl = h * CB.kStr * armF / Math.max(10, s.hp);
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
    const aPow = A.reduce((s, u) => s + Math.max(0, u.org) / u._s.org, 0) / A.length, dPow = D.reduce((s, u) => s + Math.max(0, u.org) / u._s.org, 0) / D.length;
    G.battles.push({ n, att: attTag, def: defs[0].t, from: atts[0].loc, adv: aPow / (aPow + dPow + 0.001), na: atts.length, nd: remaining,
      A, D, atts, defs, width, baseW, dirs, te: te.id, fort: pr.fort, amph: b.amph, hitA, hitD, aAir: aAirM, dAir: dAirM, hdA, hdD, prcA, prcD, hmA, hmD });
    if (!remaining) for (const u of atts) if (!u.dead) u.prog = Math.max(u.prog, G.edgeDays(u.loc, n, 1) * (u.loc >= NP ? G.SEA_SPEED : 1) * 0.6);
  }

  // Muharebe tahmini (YZ kararı): aynı formüllerle iki tarafın moralinin kaç günde biteceği
  G.predictBattle = (us, n, tag) => {
    const st = G.st, CB = G.COMBAT, te = g.TERRAIN[P[n].te], pr = st.prov[n];
    const Dall = (G.unitsAt[n] || []).filter((u) => !u.dead && G.atWar(u.t, tag));
    if (!Dall.length) return { defT: 0, attT: 99, ratio: 99 };
    for (const u of us) u._s = G.unitStats(u);
    for (const u of Dall) u._s = G.unitStats(u);
    const dirs = new Set(us.map((u) => u.loc)).size;
    const baseW = (te.width + (P[n].ar > 1500 ? 1 : 0)) * 20, width = baseW * (1 + 0.5 * Math.min(2, dirs - 1));
    const fit = (L, wmax) => { const out = []; let w = 0; for (const u of L) { const uw = u._s.t.w || 15; if (out.length && w + uw > wmax) break; out.push(u); w += uw; } return out; };
    const A = fit(us, width), D = fit(Dall, baseW);
    const hdA = sideHard(A), hdD = sideHard(D), prcA = sidePrc(A), prcD = sidePrc(D);
    const hmA = G.histMul(tag, D[0].t, n), hmD = G.histMul(D[0].t, tag, n);
    const lat = P[n].lat, month = G.dateOf(st.day).getUTCMonth();
    const aAir = G.airCombatMod(tag, n) * hmA, dAir = G.airCombatMod(D[0].t, n) * hmD;
    let aTot = 0, dTot = 0;
    for (const u of A) { const s = u._s; const c = st.C[u.t]; const ar = u.army ? G.armyById(c, u.army) : null; aTot += (s.sa * (1 - hdD) + s.ha * hdD) * u.str * Math.max(0.25, (1 + te.atk) * terrainMul(s, te, lat, month) * (1 - 0.1 * pr.fort) * G.wxAtk(n)) * (1 + (ar?.plan || 0)) * G.supplyMul(u) * aAir; }
    for (const u of D) { const s = u._s; dTot += (s.sa * (1 - hdA) + s.ha * hdA) * u.str * terrainMul(s, te, lat, month) * G.supplyMul(u) * dAir; }
    const wA = A.reduce((s2, u) => s2 + (u._s.t.w || 15), 0), wD = D.reduce((s2, u) => s2 + (u._s.t.w || 15), 0);
    const hits = (inc, dv) => (Math.min(inc, dv) * CB.lo + Math.max(0, inc - dv) * CB.hi) * CB.H;
    let defT = 0, attT = 0;
    for (const u of D) {
      const s = u._s, dv = s.df * u.str * (1 + 0.15 * pr.fort) * (1 + 0.25 * u.ent) * terrainMul(s, te, lat, month) * G.homeDef(u.t, n) * hmD;
      const armF = s.arm > 0 ? Math.max(0.5, Math.min(1, prcA / s.arm)) : 1;
      defT += Math.max(0, u.org) / Math.max(0.01, hits(aTot * (s.t.w || 15) / wD, dv) * CB.kOrg * armF);
    }
    for (const u of A) {
      const s = u._s, armF = s.arm > 0 ? Math.max(0.5, Math.min(1, prcD / s.arm)) : 1;
      attT += Math.max(0, u.org - 0.15 * s.org) / Math.max(0.01, hits(dTot * (s.t.w || 15) / wA, s.bt * u.str * hmA) * CB.kOrg * armF);
    }
    defT /= D.length; attT /= A.length;
    // yedekler savunmayı uzatır
    if (Dall.length > D.length) defT *= Math.pow(Dall.length / D.length, 0.7);
    return { defT, attT, ratio: attT / Math.max(0.1, defT) };
  };

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
    pr.c = nc; pr.cd = st.day;
    G.mapDirty = 1; G.needSummary = 1;
    // Sovyet sanayisinin doğuya taşınması: düşen asli eyaletteki fabrikaların bir kısmı Urallara ve Sibirya'ya kaçırılır
    if (prev === 'SOV' && pr.core === 'SOV' && (pr.mil + pr.civ) > 0 && st.C.SOV?.alive && st.C.SOV.tag !== st.player) G.relocate('SOV', n, 0.6, 0.4);
    if (P[n].vp >= 10 && (tag === st.player || prev === st.player || pr.o === st.player)) G.log(`${G.pname(n)} ${G.cname(nc)} kontrolüne geçti.`, [nc, prev], prev === st.player ? 'bad' : 'good');
  };

  // Gerideki boş düşman adacıkları: içinde düşman birliği olmayan ve bütün kara komşuları asli sahibinin
  // (ya da dostlarının) kontrolünde olan eyalet asli sahibine döner (cephe geçtikten sonra arkada unutulan iller)
  G.enclaves = () => {
    const st = G.st;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i], k = pr.core;
      if (!k || pr.c === k || !st.C[k]?.alive || !G.atWar(k, pr.c)) continue;
      const A = P[i].a; if (!A.length) continue;
      if ((G.unitsAt[i] || []).some((u) => G.atWar(u.t, k))) continue;
      if (A.every((j) => { const c = st.prov[j].c; return c === k || (G.friendly(k, c) && !G.atWar(k, c)); })) G.capture(i, k);
    }
  };
  // Fabrika tahliyesi: kaybedilen eyaletten askerî ve sivil fabrikaların bir kısmı uzak doğudaki asli eyaletlere
  G.relocate = (tag, n, fm, fc) => {
    const st = G.st, pr = st.prov[n], c = st.C[tag];
    const cap = c.cap >= 0 ? c.cap : n;
    const dest = [];
    for (let i = 0; i < NP; i++) { const q = st.prov[i]; if (q.c === tag && q.core === tag && P[i].lon > P[n].lon + 8 && G.freeSlots(i) > 0) dest.push(i); }
    if (!dest.length) return;
    dest.sort((a, b) => G.dist(b, n) - G.dist(a, n) || G.freeSlots(b) - G.freeSlots(a));
    const mv = (type, f) => { let k = Math.floor(pr[type] * f + G.rand()); for (let t = 0; t < k && pr[type] > 0; t++) { const d = dest[t % Math.min(6, dest.length)]; if (G.freeSlots(d) <= 0) continue; pr[type]--; st.prov[d][type]++; } };
    mv('mil', fm); mv('civ', fc);
    void cap;
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
    // ordusu tükenmiş ülke (en çok 2 tümen) topraklarının yarısından fazlasını yitirdiyse direnemez
    // (ör. 1945'te Sardunya ve Arnavutluk'ta tek tümenle tutunan İtalya)
    const divs = {}; for (const u of st.units) divs[u.t] = (divs[u.t] || 0) + 1;
    for (const c of Object.values(st.C)) {
      if (st.conf) return;
      if (!c.alive || !c.enemies.length) continue;
      const lost = 1 - (have[c.tag] || 0) / (c.startW || 1);
      if (lost >= 0.55 && (divs[c.tag] || 0) + c.train.length <= 2 && c.tag !== st.player) { c.surrender = 1; G.capitulate(c.tag); continue; }
      // başkent düştüyse en değerli toprağa taşı
      // (önce asli topraklar; asıl başkent geri alınınca başkent oraya döner)
      if (c.cap0 >= 0 && c.cap !== c.cap0 && st.prov[c.cap0]?.c === c.tag) c.cap = c.cap0;
      if (c.cap >= 0 && st.prov[c.cap].c !== c.tag) {
        let best = -1, bv = -1;
        for (let i = 0; i < NP; i++) { const q = st.prov[i]; if (q.c !== c.tag) continue; const v = P[i].vp + (q.core === c.tag ? 100 : 0); if (v > bv) { bv = v; best = i; } }
        if (best >= 0) { if (c.tag === st.player) G.log(`Başkent ${G.pname(best)} şehrine taşındı.`, [c.tag], 'bad'); c.cap = best; }
      }
      // otoriter büyük güçler sonuna dek savaşır (HOI4: Almanya ve Japonya geç teslim olur)
      const civil = (st.civil || []).some((p) => p.includes(c.tag));
      const th = civil ? 0.85 : Math.min(0.95, (c.tag === 'SOV' ? 0.9 : c.tag === 'CHI' ? 0.96 : c.major ? (c.ideo === 'fas' || c.ideo === 'com' ? 0.88 : 0.68) : 0.58) + ((c.ws ?? 0.3) - 0.3) * 0.12);
      c.surrender = lost / th;
      if (lost >= th) G.capitulate(c.tag);
    }
  }

  G.capitulate = (tag) => {
    const st = G.st, c = st.C[tag];
    const enemies = c.enemies.filter((t) => st.C[t]?.alive);
    // iç savaş: kaybeden taraf tamamen ilhak edilir (HOI4)
    const cw = (st.civil || []).find((p) => p.includes(tag) && enemies.includes(p[0] === tag ? p[1] : p[0]));
    if (cw) {
      const win = cw[0] === tag ? cw[1] : cw[0];
      st.civil = st.civil.filter((p) => p !== cw);
      for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete st.wars[k]; }
      G.refreshEnemies();
      G.annex(win, tag);
      for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.oc === tag || pr.oc === win) { if (pr.o === win) pr.core = win; } }
      G.cwDirty = 1; st.C[win].startW = G.coreWeight(win, true);
      G.log(`${G.cname(win)} iç savaşı kazandı: ${G.cname(tag)} teslim oldu ve tüm ülke ${G.cname(win)} yönetimine geçti.`, [win, tag], 'major');
      if (G.onCapitulate) G.onCapitulate(tag, win, true, null);
      return;
    }
    // savaşlardan çık; yabancı topraklardaki işgal sona erer; verdiği garantiler düşer
    for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete st.wars[k]; }
    delete st.guar[tag]; c.capd = st.day;
    if (c.fac) G.leaveFaction(tag);
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === tag && pr.o !== tag) pr.c = pr.o; }
    for (const u of st.units) if (u.t === tag && (u.loc >= NP || st.prov[u.loc].c !== tag)) u.dead = 1;
    st.units = st.units.filter((u) => !u.dead);
    c.train = []; c.just = null;
    st.tension = Math.min(100, st.tension + 3);
    G.refreshEnemies();
    G.mapDirty = 1; G.needSummary = 1;
    G.log(`${G.cname(tag)} teslim oldu! Barış konferansı toplanıyor.`, [tag], tag === st.player ? 'bad' : 'major');
    // barış konferansı
    const conf = G.startConference(tag, enemies);
    if (!conf) { G.updateSummaries(); G.rebuildUnitIndex(); if (!c.sum.provs) G.killCountry(tag); return; }
    G.confRun(conf);
    if (!conf.done && st.player && conf.parts.some((p) => p.t === st.player)) {
      st.conf = conf; // oyuncu sırası: simülasyon konferans bitene dek durur
      if (G.onConference) G.onConference(conf);
      return;
    }
    G.confEnd(conf);
  };
  G.confEnd = (conf) => {
    const st = G.st;
    G.confFinish(conf);
    st.conf = null;
    G.rebuildUnitIndex();
    if (G.onCapitulate) G.onCapitulate(conf.L, conf.top, conf.full, conf);
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
    if (st.conf) return; // barış konferansı sürüyor
    st.day++;
    if (G.updateWeather()) G.supDirty = 1;
    if (G.needSummary) { G.updateSummaries(); G.needSummary = 0; }
    G.precomputeTrade();
    airNaval();
    G.navalTick();
    if (st.day % 7 === 3) G.tradeTick();
    precomputeManpower();
    if (st.day % 5 === 0 || G.supDirty) { computeSupply(); G.supDirty = 0; }
    for (const c of Object.values(st.C)) if (c.alive) { G.polTick(c); economy(c); G.xpTick(c); }
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
    if (st.day % 10 === 5 && G.occTick) G.occTick();
    if (st.day % 10 === 7) G.enclaves();
    if (st.day % 5 === 1) G.histCourse();
    G.opsTick();
    if (st.day % 30 === 0) st.tension = Math.max(0, st.tension - 0.3);
  };
})(window);
