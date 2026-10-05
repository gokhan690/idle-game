// Tur tabanlı oynanış (European War tarzı): oyuncu evresinde hareket ve saldırı anında olur,
// "Turu bitir" ile dünya bir hafta ilerler (yapay zekâ hareket eder, ekonomi işler).
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  G.TURN_DAYS = 7;
  G.MOVE_BUDGET = 13; // bir turdaki hareket bütçesi (gün eşdeğeri)
  G.isTurn = () => !!(G.st && G.st.opts && G.st.opts.turn);
  G.playerPhase = () => G.isTurn() && !(G.st.turnLeft > 0);

  G.turnReset = () => {
    const st = G.st;
    for (const u of st.units) if (u.t === st.player) { u.mv = 0; u.at = 0; }
  };

  // Seçili birliklerin bu turda gidebileceği eyaletler (Dijkstra, kontrol bölgesi kuralıyla)
  G.moveRange = (units) => {
    const st = G.st;
    const reach = new Map(), prev = new Map();
    const mov = units.filter((u) => !u.mv && !u.at && u.loc < NP && !u.ret);
    if (!mov.length || mov.length !== units.length) return { reach, prev };
    const from = mov[0].loc;
    if (mov.some((u) => u.loc !== from)) return { reach, prev };
    const tag = mov[0].t;
    const spd = Math.min(...mov.map((u) => G.unitStats(u).spd));
    const budget = G.MOVE_BUDGET;
    // European War gibi adım sınırı: piyade 2, hızlı birlikler 3-4 eyalet
    const maxSteps = Math.max(2, Math.min(4, Math.round(spd / 7)));
    const steps = new Map([[from, 0]]);
    const dist = new Map([[from, 0]]);
    const q = [[0, from]];
    while (q.length) {
      q.sort((a, b) => a[0] - b[0]);
      const [d, n] = q.shift();
      if (d > (dist.get(n) ?? Infinity)) continue;
      if (n !== from) {
        reach.set(n, d);
        // düşman toprağına girince ya da düşman birliğine komşu olunca durur (kontrol bölgesi)
        if (G.atWar(tag, st.prov[n].c)) continue;
        if (P[n].a.some((j) => G.hostileIn(j, tag))) continue;
      }
      for (const b of P[n].a) {
        if (!G.canEnter(tag, b) || G.hostileIn(b, tag)) continue;
        const c = d + G.edgeDays(n, b, spd);
        // en az bir eyalet her zaman gidilebilir
        if (c > budget && !(n === from)) continue;
        const sn = steps.get(n) + 1; if (sn > maxSteps) continue;
        if (c < (dist.get(b) ?? Infinity)) { dist.set(b, c); steps.set(b, sn); prev.set(b, n); q.push([c, b]); }
      }
    }
    return { reach, prev };
  };
  // Saldırılabilecek komşu düşman eyaletleri
  G.attackTargets = (units) => {
    const out = new Set();
    for (const u of units) {
      if (u.at || u.loc >= NP || u.org < G.unitStats(u).org * 0.15) continue;
      for (const j of P[u.loc].a) if (G.hostileIn(j, u.t)) out.add(j);
    }
    return out;
  };

  // Saldırı önizlemesi: güç oranından beklenen sonuç
  G.attackPreview = (units, n) => {
    const tag = units[0].t;
    const att = units.filter((u) => !u.at && u.loc < NP && P[u.loc].a.includes(n));
    const defs = (G.unitsAt[n] || []).filter((u) => G.atWar(u.t, tag));
    const te = g.TERRAIN[P[n].te], pr = G.st.prov[n];
    let a = 0, d = 0;
    for (const u of att) { const s = G.unitStats(u); a += s.atk * u.str * (0.4 + 0.6 * Math.min(1, u.org / s.org)); }
    for (const u of defs) { const s = G.unitStats(u); d += s.def * u.str * (0.4 + 0.6 * Math.min(1, Math.max(0, u.org) / s.org)) * (1 + 0.15 * pr.fort) * (1 + 0.25 * (u.ent || 0)); }
    a *= Math.max(0.3, 1 + te.atk);
    const r = a / Math.max(0.1, d);
    return { att: att.length, def: defs.length, defTag: defs[0]?.t, ratio: r, odds: r > 1.6 ? 'Ezici üstünlük' : r > 1.1 ? 'Üstünüz' : r > 0.8 ? 'Denk' : r > 0.5 ? 'Zor' : 'Ağır kayıp riski', terrain: te.n, fort: pr.fort };
  };

  G.instantMove = (units, n, prev) => {
    const st = G.st;
    const path = []; let k = n; while (k != null && k !== units[0].loc) { path.push(k); k = prev.get(k); }
    path.reverse();
    for (const u of units) {
      const L = G.unitsAt[u.loc]; if (L) { const i = L.indexOf(u); if (i >= 0) L.splice(i, 1); }
      u.loc = n; u.path = []; u.prog = 0; u.ent = 0; u.mv = 1; u.auto = 0;
      (G.unitsAt[n] || (G.unitsAt[n] = [])).push(u);
    }
    for (const p of path) G.capture(p, units[0].t);
    G.supDirty = 1;
    return path.length;
  };

  // Anında saldırı: muharebe birkaç tur hemen çözülür, kayıplar raporlanır
  G.instantAttack = (units, n) => {
    const st = G.st;
    const tag = units[0].t;
    const att = units.filter((u) => !u.at && u.loc < NP && P[u.loc].a.includes(n) && u.org > G.unitStats(u).org * 0.15);
    if (!att.length) return null;
    const defs0 = (G.unitsAt[n] || []).filter((u) => G.atWar(u.t, tag));
    if (!defs0.length) return null;
    const snap = (L) => L.map((u) => [u, u.str, u.org]);
    const sa = snap(att), sd = snap(defs0);
    const defTag = defs0[0].t;
    let rounds = 0;
    for (; rounds < 5; rounds++) {
      if (rounds && att.reduce((s2, u) => s2 + (u.dead ? 0 : Math.max(0, u.org) / G.unitStats(u).org), 0) / att.length < 0.25) break;
      for (const u of att) if (!u.dead) u._s = G.unitStats(u);
      for (const u of G.unitsAt[n] || []) u._s = G.unitStats(u);
      const live = att.filter((u) => !u.dead && u.org > 0.5);
      if (!live.length || !G.hostileIn(n, tag)) break;
      G.battles = []; G.inBattle = new Set();
      G._fight({ n, att: live, amph: false });
      for (const u of st.units) if (u.dead) { const L = G.unitsAt[u.loc]; if (L) { const i = L.indexOf(u); if (i >= 0) L.splice(i, 1); } }
    }
    const loss = (s) => { let a = 0; for (const [u, str] of s) a += str - (u.dead ? 0 : u.str); return a / s.length; };
    const killed = sd.filter(([u]) => u.dead).length, lostA = sa.filter(([u]) => u.dead).length;
    const won = !G.hostileIn(n, tag);
    for (const u of att) { u.at = 1; u.mv = 1; u.auto = 0; u.path = []; u.prog = 0; }
    let took = false;
    if (won && G.atWar(tag, st.prov[n].c)) {
      // kazanan tümenler eyalete girer
      const adv = att.filter((u) => !u.dead && u.org > G.unitStats(u).org * 0.1);
      if (adv.length) { G.instantMove(adv, n, new Map([[n, adv[0].loc]])); took = true; for (const u of adv) u.at = 1; }
    }
    st.units = st.units.filter((u) => !u.dead);
    G.rebuildUnitIndex();
    G.battles = [];
    G.mapDirty = 1; G.needSummary = 1;
    const res = { n, from: sa[0][0].loc, aLoss: loss(sa), dLoss: loss(sd), killed, lostA, won, took, rounds, defTag };
    if (tag === st.player && (killed || took)) G.log(`${G.pname(n)}: ${took ? 'ele geçirildi' : 'saldırı'}${killed ? `, ${killed} düşman tümeni imha edildi` : ''}.`, [tag, defTag], 'good');
    return res;
  };

  // Dünya evresi bittiğinde
  G.turnDone = () => {
    const st = G.st;
    st.turn = (st.turn || 1) + 1;
    st.turnLeft = 0; st.paused = 1;
    G.turnReset();
    if (G.onTurn) G.onTurn(st.turn);
  };
  G.endTurn = () => {
    const st = G.st;
    if (!G.isTurn() || st.turnLeft > 0) return;
    st.turnLeft = G.TURN_DAYS; st.paused = 0;
  };
})(window);
