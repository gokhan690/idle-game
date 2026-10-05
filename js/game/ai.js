// Yapay zekâ: ekonomi, araştırma, odak, eğitim, ordu yönetimi, diplomasi.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  const TECH_PRIORITY = ['ind1', 'con1', 'inf1', 'art1', 'sup1', 'ind2', 'con2', 'eff1', 'doc_fire', 'doc_grand', 'doc_mass', 'doc_mob', 'mot1', 'tank1', 'fig1', 'inf2', 'art2', 'at1', 'tank2', 'aa1', 'fig2', 'cas1', 'eff2', 'ind3', 'con3', 'syn1', 'mtn1', 'sup2', 'doc_air', 'comp', 'cas2', 'tank3', 'inf3', 'art3', 'at2', 'eff3', 'ind4', 'fig3', 'doc_fire2', 'doc_mob2', 'doc_grand2', 'doc_mass2', 'bom1', 'bom2', 'tank4', 'jet', 'mar1', 'dd1', 'ss1', 'dd2', 'ss2', 'bb1', 'bb2', 'cv1', 'radar', 'doc_nav', 'atom'];

  G.aiResearch = (c) => {
    const yr = G.year(G.st.day);
    while (c.res.length < c.mods.slots) {
      let pick = null;
      for (const id of TECH_PRIORITY) {
        const t = g.TECH_BY_ID[id];
        if (!G.techAvailable(c, id) || t.year > yr + 1) continue;
        if (t.cat === 'nav' && (c.sum.dock || 0) < 2) continue;
        pick = id; break;
      }
      if (!pick) break;
      c.res.push({ id: pick, p: 0 });
    }
  };

  G.aiFocus = (c) => {
    if (c.focus.cur) return;
    const list = G.focusList(c);
    const special = list.filter((f) => f.x === 5);
    const order = special.concat(list.filter((f) => f.x !== 5).sort((a, b) => a.y - b.y || a.x - b.x));
    const f = order.find((f) => G.focusAvailable(c, f));
    if (f) { c.focus.cur = f.id; c.focus.p = 0; }
  };

  G.aiConstruction = (c) => {
    const st = G.st;
    const atWar = c.enemies.length > 0;
    while (c.constr.length < Math.max(2, Math.ceil((c.econ?.civFree || 0) / 15))) {
      const type = atWar || st.tension > 55 || (G.year(st.day) >= 1938 && G.rand() < 0.6) ? 'mil' : 'civ';
      let best = -1, bv = 0;
      for (let i = 0; i < NP; i++) {
        const pr = st.prov[i]; if (pr.c !== c.tag || pr.o !== c.tag) continue;
        const queued = c.constr.filter((q) => q.p === i && q.b !== 'fort').length;
        const free = G.freeSlots(i) - queued;
        if (free <= 0) continue;
        const v = free + P[i].vp * 0.1 + (i === c.cap ? 2 : 0);
        if (v > bv) { bv = v; best = i; }
      }
      if (best < 0) break;
      c.constr.push({ b: type, p: best, prog: 0 });
    }
    // savaşta sınır tahkimatı
    if (atWar && c.constr.length < 4 && G.rand() < 0.3) {
      for (let i = 0; i < NP; i++) {
        const pr = st.prov[i];
        if (pr.c === c.tag && pr.fort < 3 && P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) && !c.constr.some((q) => q.p === i)) { c.constr.push({ b: 'fort', p: i, prog: 0 }); break; }
      }
    }
  };

  G.aiProduction = (c) => {
    // eksik teçhizata göre hatları yeniden dağıt
    const need = { inf: 0, art: 0, mot: 0, tank: 0 };
    for (const u of G.st.units) if (u.t === c.tag) for (const [e, n] of Object.entries(g.UNITS[u.u].eq)) need[e] += n * (1 - u.str) + n * 0.15;
    for (const t of c.train) for (const [e, n] of Object.entries(g.UNITS[t.u].eq)) need[e] += n;
    const s = c.sum;
    const total = s.mil;
    if (!total) { c.lines = c.lines.filter((l) => g.EQUIP[l.e].fac === 'dock'); }
    const w = {};
    const def = c.major ? { inf: 0.32, art: 0.15, mot: 0.08, tank: 0.15, fig: 0.18, cas: 0.07, bom: 0.05 } : { inf: 0.5, art: 0.22, fig: 0.18, cas: 0.1 };
    for (const [e, v] of Object.entries(def)) if (c.mods.unlockEq[e]) w[e] = v;
    for (const e of ['inf', 'art', 'mot', 'tank']) if (w[e] != null) {
      const stock = c.stock[e] || 0; const ratio = need[e] > 0 ? need[e] / (stock + 1) : 0;
      if (ratio > 1) w[e] *= 1 + Math.min(1.5, (ratio - 1) * 0.5); else if (stock > need[e] * 3 + 2000) w[e] *= 0.5;
    }
    const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    const lines = c.lines.filter((l) => g.EQUIP[l.e].fac === 'dock');
    let used = 0;
    for (const [e, v] of Object.entries(w)) {
      const f = Math.floor((total * v) / sum);
      if (f <= 0) continue;
      const old = c.lines.find((l) => l.e === e);
      lines.push({ e, f, eff: old ? old.eff : 0.3, acc: 0 }); used += f;
    }
    if (total > used) { const l = lines.find((x) => x.e === 'inf'); if (l) l.f += total - used; else lines.push({ e: 'inf', f: total - used, eff: 0.3, acc: 0 }); }
    // tersaneler
    const docks = s.dock;
    const dl = lines.filter((l) => g.EQUIP[l.e].fac === 'dock');
    const dUsed = dl.reduce((a, l) => a + l.f, 0);
    if (docks > 0 && dUsed !== docks) {
      for (const l of dl) lines.splice(lines.indexOf(l), 1);
      const dw = c.major ? [['dd', 0.3], ['ss', 0.3], ['cr', 0.2], ['bb', 0.2]] : [['dd', 0.5], ['ss', 0.5]];
      let du = 0;
      for (const [e, v] of dw) { const f = Math.floor(docks * v); if (f > 0) { const old = dl.find((l) => l.e === e); lines.push({ e, f, eff: 1, acc: old ? old.acc : 0 }); du += f; } }
      if (docks > du) { const l = lines.find((x) => x.e === 'dd'); if (l) l.f += docks - du; else lines.push({ e: 'dd', f: docks - du, eff: 1, acc: 0 }); }
    }
    c.lines = lines;
  };

  G.aiTraining = (c) => {
    const st = G.st;
    const units = st.units.filter((u) => u.t === c.tag).length + c.train.length;
    const s = c.sum;
    const atWar = c.enemies.length > 0;
    const target = Math.min(c.major ? 220 : 90, Math.round((s.mil * 1.1 + s.civ * 0.2 + 4) * (atWar ? 1.3 : st.tension > 50 ? 1.1 : 0.9)));
    if (units >= target || c.train.length >= Math.max(2, Math.ceil(s.mil / 4))) return;
    if ((c.mpAvail || 0) < 15) return;
    let type = 'inf';
    const r = G.rand();
    if (c.mods.unlock.arm && c.major && r < 0.18 && (c.stock.tank || 0) > 60) type = 'arm';
    else if (c.mods.unlock.mot && c.major && r < 0.28 && (c.stock.mot || 0) > 150) type = 'mot';
    else if (c.mods.unlock.mtn && r > 0.9) type = 'mtn';
    c.train.push({ u: type, d: g.UNITS[type].days });
  };

  G.aiLaws = (c) => {
    const st = G.st;
    const atWar = c.enemies.length > 0;
    const allowed = (opt) => !opt.war || (opt.war === 1 ? (atWar || st.tension >= 50 || c.ideo !== 'dem' || c.mods.ignoreTension) : atWar);
    for (const k of ['eco', 'mob']) {
      const L = g.LAWS[k];
      const want = atWar ? (k === 'mob' && c.mpAvail < 50 ? 3 : 2) : st.tension > 40 ? 1 : 0;
      const nx = c.laws[k] + 1;
      if (nx <= want && nx < L.opts.length && allowed(L.opts[nx]) && c.pp >= 100) { c.pp -= 100; c.laws[k] = nx; G.recomputeMods(c); }
    }
  };

  G.aiEconomy = (c) => {
    G.aiResearch(c); G.aiFocus(c); G.aiConstruction(c); G.aiProduction(c); G.aiTraining(c); G.aiLaws(c);
  };

  G.playerAuto = (c, i) => {
    const st = G.st;
    if ((st.day + i) % 2 === 0 && st.units.some((u) => u.t === c.tag && u.auto)) G.aiMilitary(c, (u) => u.auto);
    if ((st.day + i) % 7 === 0) {
      if (c.auto.res) G.aiResearch(c);
      if (c.auto.focus) G.aiFocus(c);
      if (c.auto.con) G.aiConstruction(c);
      if (c.auto.prod) G.aiProduction(c);
    }
  };

  // ---------- Ordu ----------
  function provThreat(n, tag) {
    let v = 0; const L = G.unitsAt[n]; if (!L) return 0;
    for (const u of L) if (G.atWar(u.t, tag)) v += G.unitPower(u);
    return v;
  }
  function myPowerAt(n, tag, filter) {
    let v = 0; const L = G.unitsAt[n]; if (!L) return 0;
    for (const u of L) if (u.t === tag && filter(u)) v += G.unitPower(u);
    return v;
  }

  G.aiMilitary = (c, filter) => {
    const st = G.st, tag = c.tag;
    filter = filter || (() => true);
    const mine = st.units.filter((u) => u.t === tag && filter(u));
    if (!mine.length) return;
    for (const u of mine) u._s = G.unitStats(u);
    c.ai = c.ai || {};
    const atWar = c.enemies.length > 0;
    // cephe eyaletleri
    const front = []; const frontSet = new Set();
    if (atWar) {
      for (let i = 0; i < NP; i++) {
        const pr = st.prov[i]; if (pr.c !== tag && !(G.friendly(tag, pr.c) && !G.atWar(tag, pr.c))) continue;
        let threat = 0, enemyAdj = [];
        for (const j of P[i].a) if (G.atWar(tag, st.prov[j].c)) { enemyAdj.push(j); threat += provThreat(j, tag) + 3; }
        if (enemyAdj.length) { front.push({ i, threat, enemyAdj, own: pr.c === tag }); frontSet.add(i); }
      }
    }
    const idle = mine.filter((u) => !u.path.length && u.loc < NP && !u.ret);
    if (atWar && front.length) {
      // yalnızca kendi bölgesine yakın cepheleri dikkate al (müttefik cephelere de yardım)
      // 1) Saldırılar
      const committed = new Set();
      const byFront = new Map();
      for (const u of idle) if (frontSet.has(u.loc)) { (byFront.get(u.loc) || byFront.set(u.loc, []).get(u.loc)).push(u); }
      const targets = new Map();
      for (const f of front) {
        const here = byFront.get(f.i); if (!here || !here.length) continue;
        for (const e of f.enemyAdj) { let t = targets.get(e); if (!t) targets.set(e, (t = { e, from: [] })); t.from.push(f.i); }
      }
      const war0 = Math.min(...c.enemies.map((e) => st.wars[G.pairKey(tag, e)]?.since ?? st.day));
      const stalemate = Math.min(0.25, Math.max(0, (st.day - war0 - 60) / 400));
      const aggr = (st.opts.diff === 2 ? 1.2 : st.opts.diff === 0 ? 1.6 : 1.4) - (c.ideo === 'fas' || c.ideo === 'com' ? 0.2 : 0) - stalemate;
      // Tarihî modda demokrasiler ve tarafsızlar 1942 ortasına dek yalnızca kendi/müttefik topraklarını geri alır
      const passive = tag !== st.player && st.opts.hist && c.ideo !== 'fas' && c.ideo !== 'com' && st.day < G.dayOf('1942-06-01');
      const tlist = [...targets.values()].filter((t) => !passive || G.sameFaction(tag, st.prov[t.e].core) || st.prov[t.e].core === tag).map((t) => ({ ...t, def: provThreat(t.e, tag), vp: P[t.e].vp })).sort((a, b) => (a.def - b.def) || (b.vp - a.vp));
      for (const t of tlist) {
        const te = g.TERRAIN[P[t.e].te];
        const fortMul = 1 + 0.15 * st.prov[t.e].fort;
        const need = t.def * aggr * fortMul / Math.max(0.4, 1 + te.atk);
        const avail = [];
        for (const fi of t.from) for (const u of byFront.get(fi) || []) if (!committed.has(u) && u.org > u._s.org * 0.7 && u.str > 0.5) avail.push(u);
        if (!avail.length) continue;
        if (t.def === 0) {
          // boş eyalet: en hızlı birim
          avail.sort((a, b) => b._s.spd - a._s.spd);
          const u = avail[0];
          const left = (byFront.get(u.loc) || []).filter((x) => !committed.has(x) && x !== u).length;
          const otherThreat = P[u.loc].a.some((j) => j !== t.e && provThreat(j, tag) > 0);
          if (left === 0 && otherThreat) continue;
          u.path = [t.e]; committed.add(u); continue;
        }
        let pow = 0; const go = [];
        avail.sort((a, b) => G.unitPower(b) - G.unitPower(a));
        for (const u of avail) { pow += G.unitPower(u) * (u._s.atk / ((u._s.atk + u._s.def) / 2)); go.push(u); if (pow > need * 1.3) break; }
        if (pow >= need) {
          for (const u of go) {
            const rest = (byFront.get(u.loc) || []).filter((x) => !committed.has(x) && x !== u && !go.includes(x)).length;
            const otherThreat = P[u.loc].a.some((j) => j !== t.e && provThreat(j, tag) > 0);
            if (rest === 0 && otherThreat && go.length > 1 && u === go[go.length - 1]) continue;
            u.path = [t.e]; committed.add(u);
          }
        }
      }
      // 2) Takviye: boştaki birlikleri akış alanıyla ihtiyaç duyan cephelere dağıt
      const free = idle.filter((u) => !committed.has(u) && (!frontSet.has(u.loc) || (byFront.get(u.loc) || []).length > 3));
      if (free.length) {
        const fl = front.map((f) => ({ ...f, have: myPowerAt(f.i, tag, () => true) }));
        const totalNeed = fl.reduce((s2, f) => s2 + f.threat + 6, 0) || 1;
        // saldırı yönü: zayıf savunulan düşman eyaletlerine bakan cepheler ek takviye alır
        for (const f of fl) { let weak = 0; for (const e of f.enemyAdj) { const th = provThreat(e, tag); if (th < f.have * 0.8) weak += 1 + P[e].vp * 0.1; } f.push = weak; }
        const quota = new Map(fl.map((f) => [f.i, Math.max(1, Math.ceil(((f.threat + 6 + f.push * 4) / totalNeed) * (free.length + mine.length * 0.5)) - Math.round(f.have / 15))]));
        let pending = free.filter((u) => !frontSet.has(u.loc) || (byFront.get(u.loc) || []).length > 3);
        for (let pass = 0; pass < 3 && pending.length; pass++) {
          const srcs = fl.filter((f) => (quota.get(f.i) || 0) > 0).map((f) => ({ i: f.i, c: 6 / (1 + (f.threat + 6) / (f.have + 6)) * (f.own ? 1 : 1.5) }));
          if (!srcs.length) break;
          const ff = G.flowField(tag, srcs, { naval: pass === 2 });
          const rest = [];
          for (const u of pending) {
            if (ff.dist[u.loc] === Infinity) { rest.push(u); continue; }
            const tgt = ff.src[u.loc];
            if (tgt === u.loc) continue;
            if ((quota.get(tgt) || 0) <= 0) { rest.push(u); continue; }
            const path = G.followField(ff, u.loc);
            if (path.length) { u.path = path; quota.set(tgt, quota.get(tgt) - 1); }
          }
          pending = rest;
        }
      }
    } else if (atWar) {
      // kara cephesi yok: deniz çıkarması dene
      aiInvasion(c, idle);
    }
    if (!atWar || !front.length) aiGarrison(c, idle, atWar);
  };

  function aiInvasion(c, idle) {
    const st = G.st, tag = c.tag;
    if (idle.length < 3) return;
    if (c.ai.inv && st.day - c.ai.inv < 45) return;
    c.ai.inv = st.day;
    const myNavy = G.navyPower(c);
    if (myNavy < 10 || myNavy < (c.eNavy || 0) * 0.5) return;
    // hedef: en zayıf savunulan düşman kıyı eyaleti (birliklerin bulunduğu yere yakın)
    const ux = idle.reduce((s, u) => s + G.nodeX[u.loc], 0) / idle.length, uy = idle.reduce((s, u) => s + G.nodeY[u.loc], 0) / idle.length;
    let best = -1, bv = -Infinity;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (!P[i].c || !G.atWar(tag, pr.c)) continue;
      const d = Math.hypot(G.nodeX[i] - ux, G.nodeY[i] - uy);
      const v = P[i].vp * 0.5 - provThreat(i, tag) * 0.4 - d / 120 + (st.C[pr.c].major ? 3 : 0);
      if (v > bv) { bv = v; best = i; }
    }
    if (best < 0) return;
    const n = Math.min(idle.length - 1, 8);
    const group = idle.slice().sort((a, b) => G.dist(a.loc, best) - G.dist(b.loc, best)).slice(0, n);
    for (const u of group) {
      const path = G.findPath(u.loc, best, tag, u._s.spd, { naval: true });
      if (path && path.length && G.pathDays(u.loc, path, u._s.spd) < 80) u.path = path;
    }
  }

  function aiGarrison(c, idle, atWar) {
    const st = G.st, tag = c.tag;
    if (!idle.length) return;
    if (!atWar && c.ai.gar && st.day - c.ai.gar < 20) return;
    c.ai.gar = st.day;
    // tehdit puanı: komşu ülke ordusu
    const own = [];
    for (let i = 0; i < NP; i++) if (st.prov[i].c === tag) own.push(i);
    if (!own.length) return;
    const threatOf = {};
    const spots = [];
    for (const i of own) {
      let w = 0;
      for (const j of P[i].a) {
        const t = st.prov[j].c; if (t === tag || G.sameFaction(tag, t)) continue;
        if (threatOf[t] == null) {
          const o = st.C[t]; let th = 0.3;
          if (G.atWar(tag, t)) th = 5;
          else if (st.goals[t + '>' + tag] != null || o.just?.t === tag) th = 4;
          else if (c.just?.t === t || st.goals[tag + '>' + t] != null) th = 2.5;
          else if (G.opinion(tag, t) < 0) th = 1.5;
          threatOf[t] = th * (1 + (o.sum.mil || 0) / 10);
        }
        w = Math.max(w, threatOf[t]);
      }
      if (w > 0) spots.push({ i, w: w + P[i].vp * 0.05 });
    }
    spots.push({ i: c.cap, w: 3 });
    spots.sort((a, b) => b.w - a.w);
    const top = spots.slice(0, Math.max(3, Math.min(spots.length, Math.ceil(idle.length * 0.8))));
    const totalW = top.reduce((s, x) => s + x.w, 0);
    const quota = new Map(top.map((s) => [s.i, Math.max(1, Math.round((s.w / totalW) * idle.length))]));
    // mevcut dağılım
    const count = new Map();
    for (const u of idle) count.set(u.loc, (count.get(u.loc) || 0) + 1);
    let moves = 0;
    for (const u of idle) {
      if (moves > 25) break;
      const q = quota.get(u.loc) || 0;
      if (q && (count.get(u.loc) || 0) <= q) continue;
      // açığı en büyük nokta
      let best = null, bv = 0;
      for (const s of top) { const gap = (quota.get(s.i) || 0) - (count.get(s.i) || 0); const v = gap - G.dist(u.loc, s.i) / 500; if (gap > 0 && (best === null || v > bv)) { bv = v; best = s; } }
      if (!best) break;
      const path = G.findPath(u.loc, best.i, tag, u._s.spd, { naval: false });
      if (!path) continue;
      u.path = path; moves++;
      count.set(u.loc, count.get(u.loc) - 1); count.set(best.i, (count.get(best.i) || 0) + 1);
    }
  }

  // ---------- Diplomasi ----------
  G.aiDiplomacy = (c) => {
    const st = G.st, tag = c.tag;
    const yr = G.year(st.day);
    // ittifaka katılım: saldırıya uğrayan ülke, saldırganla zaten savaşan ittifaka sığınır;
    // serbest modda gerginlik yüksekse ideolojik ittifaklara katılım da olur
    if (!c.fac && !c.major) {
      for (const [fid, f] of Object.entries(st.factions)) {
        const L = st.C[f.leader];
        if (!L?.alive || L.tag === st.player) continue;
        const shared = c.enemies.length && c.enemies.every((e) => L.eset.has(e));
        const ideoOk = L.ideo === c.ideo && c.ideo !== 'neu';
        const near = G.dist(L.cap, c.cap) < 700;
        if (shared && G.opinion(tag, L.tag) > -20) { G.joinFaction(tag, fid); break; }
        if (!st.opts.hist && !c.enemies.length && ideoOk && near && st.tension > 50 && G.rand() < 0.2) { G.joinFaction(tag, fid); break; }
      }
    }
    // tarihî modda serbest saldırganlık 1943'ten önce kapalı
    const dynamic = !st.opts.hist || yr >= 1943;
    if (!dynamic) return;
    if (c.ideo === 'dem' || c.ideo === 'neu') return;
    if (!c.major && c.sum.mil < 10) return;
    if (c.enemies.length >= 2 || c.just) return;
    // hazır gerekçe varsa savaş ilan et
    for (const k of Object.keys(st.goals)) {
      const [a, b] = k.split('>');
      if (a !== tag || !st.C[b]?.alive) continue;
      const my = G.armyPower(tag), their = G.sidePower(b, (x) => G.armyPower(x.tag));
      if (my > their * 1.4) { G.declareWar(tag, b); return; }
    }
    if (c.pp < 80 || st.tension < G.tensionNeeded(c)) return;
    // zayıf komşu seç
    const neigh = new Set();
    for (let i = 0; i < NP; i++) if (st.prov[i].c === tag) for (const j of P[i].a) { const t = st.prov[j].c; if (t !== tag) neigh.add(t); }
    let best = null, bv = 0;
    const my = G.armyPower(tag);
    for (const t of neigh) {
      if (!st.C[t]?.alive || G.sameFaction(tag, t) || G.atWar(tag, t) || st.pacts[G.pairKey(tag, t)]) continue;
      if (t === st.player && st.day < 365) continue;
      const their = G.sidePower(t, (x) => G.armyPower(x.tag));
      const r = my / (their + 1);
      if (r > 1.8 && r > bv) { bv = r; best = t; }
    }
    if (best && G.rand() < 0.35) G.startJustify(tag, best);
  };
})(window);
