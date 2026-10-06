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
      G.startResearch(c, pick);
    }
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
    for (const u of G.st.units) if (u.t === c.tag) for (const [e, n] of Object.entries(G.T(u.t, u.u).eq)) need[e] += n * (1 - u.str) + n * 0.15;
    for (const t of c.train) for (const [e, n] of Object.entries(G.T(c.tag, t.u).eq)) need[e] += n;
    const s = c.sum;
    const total = s.mil;
    if (!total) { c.lines = c.lines.filter((l) => g.EQUIP[l.e].fac === 'dock'); }
    const w = {};
    const def = c.major ? { inf: 0.3, sup: 0.03, art: 0.14, at: 0.02, mot: 0.08, tank: 0.15, fig: 0.18, cas: 0.06, bom: 0.04 } : { inf: 0.48, sup: 0.02, art: 0.22, fig: 0.18, cas: 0.1 };
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
      const best = G.bestLevel(c, e);
      const d = G.aiDesign ? G.aiDesign(c, e) : null;
      lines.push({ e, f, eff: old ? ((old.lv && old.lv < best) || (old.d || null) !== d ? old.eff * 0.7 : old.eff) : 0.3, acc: 0, lv: best, d }); used += f;
    }
    if (total > used) { const l = lines.find((x) => x.e === 'inf'); if (l) l.f += total - used; else lines.push({ e: 'inf', f: total - used, eff: 0.3, acc: 0 }); }
    // tersaneler
    const docks = s.dock;
    const dl = lines.filter((l) => g.EQUIP[l.e].fac === 'dock');
    const dUsed = dl.reduce((a, l) => a + l.f, 0);
    if (docks > 0 && dUsed !== docks) {
      for (const l of dl) lines.splice(lines.indexOf(l), 1);
      const dw = c.major ? [['dd', 0.25], ['ss', 0.25], ['cr', 0.15], ['bb', 0.15], ['conv', 0.2]] : [['dd', 0.4], ['ss', 0.3], ['conv', 0.3]];
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
    // otoriter büyük güçler gerginlik yükseldikçe hızla silahlanır (1937-39 Almanya, Japonya, İtalya)
    const rearm = c.major && (c.ideo === 'fas' || c.ideo === 'com') && st.tension > 25 ? 1.35 : 1;
    const target = Math.min(c.major ? 260 : 90, Math.round((s.mil * 1.1 + s.civ * 0.2 + 4) * (atWar ? 1.3 : st.tension > 50 ? 1.1 : 0.9) * rearm));
    if (units >= target || c.train.length >= Math.max(2, Math.ceil(s.mil / (rearm > 1 ? 3 : 4)))) return;
    if ((c.mpAvail || 0) < 15) return;
    let type = 'inf';
    const r = G.rand();
    if (c.mods.unlock.arm && c.major && r < 0.18 && (c.stock.tank || 0) > 60) type = 'arm';
    else if (c.mods.unlock.mot && c.major && r < 0.28 && (c.stock.mot || 0) > 150) type = 'mot';
    else if (c.mods.unlock.mtn && r > 0.9) type = 'mtn';
    c.train.push({ u: type, d: G.T(c.tag, type).days });
  };

  const st0 = () => G.st;
  G.aiEconomy = (c) => {
    G.aiResearch(c); G.aiFocus(c); G.aiConstruction(c); G.aiProduction(c); G.aiTraining(c); G.aiLaws(c); G.aiAdvisors(c);
    if (c.gens.length < Math.min(6, 1 + st0().units.filter((u) => u.t === c.tag).length / 20) && c.pp > 300) { c.pp -= 50; G.newGeneral(c); }
  };

  G.playerAuto = (c, i) => {
    const st = G.st;
    if ((st.day + i) % 10 === 0) { if (c.auto.air) G.aiAir(c); else if (!c.wings) G.initWings(c); }
    if ((st.day + i) % 2 === 0) {
      if (st.units.some((u) => u.t === c.tag && u.auto && !u.army)) G.aiMilitary(c, (u) => u.auto && !u.army);
      // ordular: cephe ve taarruz planına göre komutan yönetir
      if ((st.day + i) % 6 === 0 || c._frontsDirty) { G.computeFronts(c); c._frontsDirty = 0; }
      for (const a of c.armies || []) {
        if (a.ord === 'hold') continue;
        G.aiMilitary(c, (u) => u.army === a.id && !u.sr, { vs: a.vs, noAttack: a.ord === 'def', aggrMul: a.ord === 'atk' ? (a.goal != null ? 0.75 : 0.85) : 1, army: a, front: new Set(a.front || []), goal: a.goal });
      }
    }
    G.armyTick(c);
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

  G.aiMilitary = (c, filter, opts = {}) => {
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
        if (opts.front && !opts.front.has(i)) continue;
        let threat = 0, enemyAdj = [];
        for (const j of P[i].a) { const ec = st.prov[j].c; if (G.atWar(tag, ec) && (!opts.vs || ec === opts.vs || !G.atWar(tag, opts.vs))) { enemyAdj.push(j); threat += provThreat(j, tag) + 3; } }
        if (enemyAdj.length) { front.push({ i, threat, enemyAdj, own: pr.c === tag }); frontSet.add(i); }
      }
      // potansiyel tehdit: düşmanın toplam ordusu cephe uzunluğuna bölünür (sınırda henüz birliği olmasa bile)
      const flen = {}, epow = {};
      for (const f of front) { const seen = new Set(); for (const j of f.enemyAdj) { const ec = st.prov[j].c; if (!seen.has(ec)) { seen.add(ec); flen[ec] = (flen[ec] || 0) + 1; } } }
      for (const f of front) {
        const seen = new Set();
        for (const j of f.enemyAdj) { const ec = st.prov[j].c; if (seen.has(ec)) continue; seen.add(ec); if (epow[ec] == null) epow[ec] = G.armyPower(ec); f.threat += 0.35 * epow[ec] / Math.max(6, flen[ec]); }
      }
    }
    // yurt garnizonu: savaşta başkent ve büyük şehirlerde yedek tümen tutulur (derin sızmalara karşı)
    if (atWar && !opts.army) aiHomeGuard(c, mine);
    const idle = mine.filter((u) => !u.path.length && u.loc < NP && !u.ret && !(u.gar && st.prov[u.gar - 1]?.c === tag && !P[u.loc].a.some((j) => G.hostileIn(j, tag))));
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
      const aggr = ((st.opts.diff === 2 ? 1.2 : st.opts.diff === 0 ? 1.6 : 1.4) - (c.ideo === 'fas' || c.ideo === 'com' ? 0.2 : 0) - stalemate) * (opts.aggrMul || 1);
      // Tarihî modda demokrasiler ve tarafsızlar 1942 ortasına dek yalnızca kendi/müttefik topraklarını geri alır
      const passive = tag !== st.player && st.opts.hist && c.ideo !== 'fas' && c.ideo !== 'com' && st.day < G.dayOf('1942-06-01');
      const goal = opts.goal != null && st.prov[opts.goal].c !== tag ? opts.goal : null;
      const d0 = goal != null ? Math.min(...front.map((f) => G.dist(f.i, goal))) : 0;
      const tlist = [...targets.values()].filter((t) => !opts.noAttack).filter((t) => goal == null || G.dist(t.e, goal) < d0 + 70).filter((t) => !passive || G.sameFaction(tag, st.prov[t.e].core) || st.prov[t.e].core === tag).map((t) => ({ ...t, def: provThreat(t.e, tag), vp: P[t.e].vp, gd: goal != null ? G.dist(t.e, goal) * 0.25 : 0 })).sort((a, b) => (a.def + a.gd - b.def - b.gd) || (b.vp - a.vp));
      for (const t of tlist) {
        const te = g.TERRAIN[P[t.e].te];
        const fortMul = 1 + 0.15 * st.prov[t.e].fort;
        const need = t.def * aggr * fortMul / Math.max(0.4, 1 + te.atk);
        const avail = [];
        for (const fi of t.from) for (const u of byFront.get(fi) || []) if (!committed.has(u) && u.org > u._s.org * 0.7 && u.str > 0.5 && G.supplyRatio(u) > 0.3) avail.push(u);
        if (!avail.length) continue;
        if (t.def === 0) {
          // boş eyalet: piyade hat hâlinde ilerler (en az iki dost komşu); zırhlı/motorize derinlemesine sızabilir
          avail.sort((a, b) => b._s.spd - a._s.spd);
          const u = avail[0];
          const friendNb = P[t.e].a.reduce((k, j) => k + (st.prov[j].c === tag || (G.friendly(tag, st.prov[j].c) && !G.atWar(tag, st.prov[j].c)) ? 1 : 0), 0);
          if (friendNb < 2 && u._s.t.mob < 0.5 && P[t.e].vp < 10 && G.supplyRatio(u) < 0.7) continue;
          if (G.supplyRatio(u) < 0.45) continue; // ikmali kopmuş öncü durur
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
      // 1b) Cephe boşluklarını kapat: boş cephe eyaletine en yakın boştaki birlik (yığından alınır)
      {
        const holes = front.filter((f) => !(G.unitsAt[f.i] || []).some((u) => u.t === tag || (G.friendly(tag, u.t) && !G.atWar(tag, u.t))));
        if (holes.length) {
          const pool = idle.filter((u) => !committed.has(u) && !u.gar && (!frontSet.has(u.loc) || (byFront.get(u.loc) || []).filter((x) => !committed.has(x)).length >= 2));
          for (const h of holes) {
            let best = null, bd = Infinity;
            for (const u of pool) { if (committed.has(u)) continue; const d = G.dist(u.loc, h.i); if (d < bd && d < 420) { bd = d; best = u; } }
            if (!best) continue;
            const p = best.loc === h.i ? [] : G.findPath(best.loc, h.i, tag, best._s.spd, { avoidHostile: true });
            if (p && p.length) { best.path = p; committed.add(best); const L = byFront.get(best.loc); if (L) { const k = L.indexOf(best); if (k >= 0) L.splice(k, 1); } }
          }
        }
      }
      // 2) Takviye: boştaki birlikleri akış alanıyla ihtiyaç duyan cephelere dağıt.
      // Gereğinden fazla tutulan cephelerden fazlalık serbest bırakılır.
      const released = new Set();
      for (const f of front) {
        const here = (byFront.get(f.i) || []).filter((u) => !committed.has(u)); if (here.length < 2) continue;
        here.sort((a, b) => G.unitPower(b) - G.unitPower(a));
        let kept = 0; const need = f.threat * 1.6 + 4;
        for (const u of here) { if (kept >= need && kept > 0) released.add(u); else kept += G.unitPower(u); }
      }
      const free = idle.filter((u) => !committed.has(u) && (!frontSet.has(u.loc) || released.has(u) || (byFront.get(u.loc) || []).length > 3));
      if (free.length) {
        const fl = front.map((f) => ({ ...f, have: myPowerAt(f.i, tag, () => true) }));
        // yurt savunması: düşman birlikleri yaklaşan başkent ve büyük şehirler savunma noktası olur
        if (!opts.army) {
          const enemyLocs = []; for (const u of st.units) if (u.loc < NP && G.atWar(tag, u.t)) enemyLocs.push(u);
          for (let i = 0; i < NP; i++) {
            const pr = st.prov[i]; if (pr.c !== tag || pr.core !== tag || (P[i].vp < 15 && i !== c.cap) || frontSet.has(i)) continue;
            let near = 0; for (const e of enemyLocs) if (G.dist(i, e.loc) < 120) near += G.unitPower(e);
            if (near > 0) fl.push({ i, threat: near * 0.8 * (i === c.cap ? 2 : 1), enemyAdj: [], own: true, have: myPowerAt(i, tag, () => true), imp: 3 });
          }
        }
        // cephe önemi: yurda (başkent ve çekirdek topraklar) yakın cepheler önce savunulur
        const capI = c.cap >= 0 ? c.cap : -1;
        for (const f of fl) { const near = capI >= 0 ? Math.max(0, 1 - G.dist(f.i, capI) / 900) : 0.3; f.imp = 1 + 2.5 * near + (st.prov[f.i].core === tag ? 1 : 0); f.threat *= f.imp; }
        const totalNeed = fl.reduce((s2, f) => s2 + f.threat + 6, 0) || 1;
        // saldırı yönü: zayıf savunulan düşman eyaletlerine bakan cepheler ek takviye alır
        for (const f of fl) { let weak = 0; for (const e of f.enemyAdj) { const th = provThreat(e, tag); if (th < f.have * 0.8) weak += 1 + P[e].vp * 0.1; } f.push = weak; }
        // aşırı yığılmayı önle: cephe eyaleti başına en fazla ~8 tümen (ikmal ve genişlik); fazlası yedekte kalır
        const quota = new Map(fl.map((f) => { const present = (G.unitsAt[f.i] || []).filter((u) => u.t === tag).length; const q = Math.max(1, Math.ceil(((f.threat + 6 + f.push * 4) / totalNeed) * (free.length + mine.length * 0.5)) - Math.round(f.have / 15)); return [f.i, Math.max(0, Math.min(q, 8 - present))]; }));
        let pending = free.filter((u) => !frontSet.has(u.loc) || released.has(u) || (byFront.get(u.loc) || []).length > 3);
        const landOK = new Set();
        for (let pass = 0; pass < 3 && pending.length; pass++) {
          const srcs = fl.filter((f) => (quota.get(f.i) || 0) > 0).map((f) => ({ i: f.i, c: 6 / (1 + (f.threat + 6) / (f.have + 6)) * (f.own ? 1 : 1.5) * (goal != null ? (G.dist(f.i, goal) < d0 + 70 ? 0.5 : 1.6) : 1) }));
          if (!srcs.length) break;
          const naval = pass === 2;
          // deniz yolu: yalnızca karadan hiçbir cepheye ulaşamayan birlikler, konvoy varsa
          let convLeft = naval ? Math.floor(((c.ships.conv || 0) - G.convoyNeed(tag)) / 5) : 0;
          if (naval && convLeft <= 0) break;
          const ff = G.flowField(tag, srcs, { naval });
          const rest = [];
          for (const u of pending) {
            if (naval && landOK.has(u)) continue;
            if (ff.dist[u.loc] === Infinity) { rest.push(u); continue; }
            if (!naval) landOK.add(u);
            if (naval) { const p0 = G.followField(ff, u.loc); const sea = p0.filter((x) => x >= NP); if (!sea.length || convLeft <= 0 || sea.some((z) => G.navalSupremacy(tag, z) < 0.45)) continue; convLeft--; }
            const tgt = ff.src[u.loc];
            if (tgt === u.loc) continue;
            if ((quota.get(tgt) || 0) <= 0) { rest.push(u); continue; }
            const path = G.followField(ff, u.loc);
            if (path.length) { u.path = path; quota.set(tgt, quota.get(tgt) - 1); }
          }
          pending = rest;
        }
      }
    } else if (atWar && !opts.army) {
      // kara cephesi yok: deniz çıkarması dene
      aiInvasion(c, idle);
    }
    if ((!atWar || !front.length) && !(opts.army && atWar)) aiGarrison(c, idle, atWar, opts);
  };

  function aiHomeGuard(c, mine) {
    const st = G.st, tag = c.tag;
    if (c.ai.hg && st.day - c.ai.hg < 20) return;
    c.ai.hg = st.day;
    for (const u of mine) if (u.gar && st.prov[u.gar - 1]?.c !== tag) u.gar = 0;
    const lmE = new Set(); for (const e of c.enemies) { const ec = st.C[e]; if (ec && ec.cap >= 0) lmE.add(G.landmass[ec.cap]); for (const u of st.units) if (u.t === e && u.loc < NP) lmE.add(G.landmass[u.loc]); }
    const spots = [];
    if (c.cap >= 0 && st.prov[c.cap].c === tag && lmE.has(G.landmass[c.cap])) spots.push([c.cap, Math.max(2, Math.round(mine.length * 0.07))]);
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (i !== c.cap && pr.c === tag && pr.core === tag && P[i].vp >= 10 && lmE.has(G.landmass[i])) spots.push([i, P[i].vp >= 20 ? 2 : 1]); }
    if (!spots.length || mine.length < 12) return;
    const budget = Math.round(mine.length * 0.15);
    let used = mine.filter((u) => u.gar).length;
    for (const [i, need] of spots) {
      let have = mine.filter((u) => u.gar === i + 1).length;
      while (have < need && used < budget) {
        let best = null, bd = Infinity;
        for (const u of mine) { if (u.gar || u.loc >= NP || u.path.length || u.army) continue; if (G.inBattle && G.inBattle.has(u)) continue; if (G.T(u.t, u.u).mob > 0.5) continue; const d = G.dist(u.loc, i); if (d < bd && G.landmass[u.loc] === G.landmass[i]) { bd = d; best = u; } }
        if (!best) break;
        best.gar = i + 1; have++; used++;
        if (best.loc !== i) { const p = G.findPath(best.loc, i, tag, G.unitStats(best).spd, {}); if (p) best.path = p; }
      }
    }
  }

  function aiInvasion(c, idle) {
    const st = G.st, tag = c.tag;
    if (idle.length < 3) return;
    if (c.ai.inv && st.day - c.ai.inv < 45) return;
    c.ai.inv = st.day;
    const myNavy = G.navyPower(c);
    let eNavy = 0; for (const t of c.enemies) eNavy += G.navyPower(G.st.C[t]);
    if (myNavy < 10 || myNavy < eNavy * 0.5) return;
    const freeConv = (c.ships.conv || 0) - G.convoyNeed(tag);
    if (freeConv < 15) return;
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
    const n = Math.min(idle.length - 1, 8, Math.floor(freeConv / 5));
    const group = idle.slice().sort((a, b) => G.dist(a.loc, best) - G.dist(b.loc, best)).slice(0, n);
    for (const u of group) {
      const path = G.findPath(u.loc, best, tag, u._s.spd, { naval: true });
      if (path && path.length && G.pathDays(u.loc, path, u._s.spd) < 80) u.path = path;
    }
  }

  function aiGarrison(c, idle, atWar, opts = {}) {
    const st = G.st, tag = c.tag;
    if (!idle.length) return;
    const gk = opts.army ? 'gar' + opts.army.id : 'gar';
    if (!atWar && c.ai[gk] && st.day - c.ai[gk] < 20) return;
    c.ai[gk] = st.day;
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
        if (opts.vs && t !== opts.vs) continue;
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
    if (!opts.vs) spots.push({ i: c.cap, w: 3 });
    if (!spots.length) return;
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
