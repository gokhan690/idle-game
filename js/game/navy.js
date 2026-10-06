// Donanma: filolar, görevler, deniz muharebeleri, deniz üstünlüğü, konvoy akınları.
(function (g) {
  const G = g.G;
  const { P, NP, SEAS } = G;
  const SH = g.SHIPS;

  G.MISSIONS = { hold: 'Limanda', patrol: 'Devriye', strike: 'Saldırı', raid: 'Konvoy akını', escort: 'Konvoy refakati' };

  // Ülkenin ana limanına en yakın deniz bölgesi
  G.homeZone = (c) => {
    const st = G.st;
    let best = -1, bv = -1;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag || !P[i].s.length) continue;
      const v = pr.dock * 10 + P[i].vp + (i === c.cap ? 5 : 0);
      if (v > bv) { bv = v; best = i; }
    }
    return best >= 0 ? NP + P[best].s[0] : -1;
  };

  G.initFleets = (c) => {
    c.fleets = [];
    const home = G.homeZone(c);
    if (home < 0) return;
    const surf = { dd: c.ships.dd, cr: c.ships.cr, bb: c.ships.bb, ss: 0, cv: c.ships.cv };
    const subs = c.ships.ss;
    if (SH.some((e) => surf[e] > 0)) c.fleets.push({ id: G.st.nextId++, n: '1. Filo', loc: home, home, sh: surf, mis: c.tag === G.st.player ? 'hold' : 'patrol', path: [], prog: 0, auto: 1 });
    if (subs > 0) c.fleets.push({ id: G.st.nextId++, n: 'Denizaltı Filosu', loc: home, home, sh: { dd: 0, cr: 0, bb: 0, ss: subs, cv: 0 }, mis: c.tag === G.st.player ? 'hold' : 'raid', path: [], prog: 0 });
    for (const e of SH) c.ships[e] = 0;
  };
  // Yeni gemi: otomatik takviye işaretli filoya, yoksa yedeğe
  G.addShip = (c, e) => {
    const f = (c.fleets || []).find((x) => x.auto && (e === 'ss' ? true : true));
    if (f && e !== 'ss') f.sh[e] = (f.sh[e] || 0) + 1;
    else { const sf = (c.fleets || []).find((x) => x.sh.ss > 0 && e === 'ss'); if (sf) sf.sh.ss++; else c.ships[e] = (c.ships[e] || 0) + 1; }
  };
  G.fleetPower = (c, f) => G.shipsPower(c, f.sh) * (1 + 0.15 * (f.sh.cv || 0) * (G.planes(c, 'fig') > 50 ? 1 : 0.3));
  G.fleetShips = (f) => SH.reduce((a, e) => a + (f.sh[e] || 0), 0);

  // Bir bölgedeki deniz üstünlüğü (0..1): dost / (dost + düşman), komşu bölgeler yarım ağırlık
  G.navalSupremacy = (tag, zone) => {
    const st = G.st;
    let mine = 0.5, theirs = 0;
    const near = new Set([zone]); for (const [n] of G.adj[zone]) if (n >= NP) near.add(n);
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.fleets) continue;
      const friend = c.tag === tag || G.sameFaction(c.tag, tag), enemy = G.atWar(tag, c.tag);
      if (!friend && !enemy) continue;
      for (const f of c.fleets) {
        if (!near.has(f.loc)) continue;
        const w = f.loc === zone ? 1 : 0.5;
        const p = G.fleetPower(c, f) * w * (f.mis === 'hold' ? 0.3 : 1);
        if (friend) mine += p; else theirs += p;
      }
    }
    return mine / (mine + theirs);
  };

  G.fleetPath = (from, to, tag) => {
    // yalnızca deniz düğümleri; düşman kontrolündeki boğazlardan geçilmez
    if (from === to) return [];
    const prev = new Map([[from, -1]]); const q = [from];
    for (let k = 0; k < q.length; k++) {
      const n = q[k]; if (n === to) break;
      for (const [b] of G.adj[n]) if (b >= NP && !prev.has(b) && !(tag && G.straitBlocked(tag, n, b))) { prev.set(b, n); q.push(b); }
    }
    if (!prev.has(to)) return null;
    const path = []; let n = to; while (n !== from) { path.push(n); n = prev.get(n); } return path.reverse();
  };
  G.zoneDist = (from, to, tag) => { const p = G.fleetPath(from, to, tag); return p ? p.length : 99; };

  G.navalTick = () => {
    const st = G.st;
    G.navalBattles = [];
    // hareket
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.fleets) continue;
      c.fleets = c.fleets.filter((f) => G.fleetShips(f) >= 0.5);
      for (const f of c.fleets) {
        if (!f.path.length) continue;
        if (G.straitBlocked(c.tag, f.loc, f.path[0])) { const sn = G.straitAt(f.loc, f.path[0])?.n || 'Boğaz'; f.path = []; f.prog = 0; if (c.tag === st.player) G.log(`${f.n}: ${sn} düşman kontrolünde, geçilemiyor.`, [c.tag], 'warn'); continue; }
        f.prog += g.SHIP_SPEED;
        const need = G.dist(f.loc, f.path[0]);
        if (f.prog >= need) { f.loc = f.path.shift(); f.prog = 0; }
      }
      if (c.tag !== st.player && (st.day + c.tag.charCodeAt(0)) % 3 === 0) aiFleets(c);
      else if (c.tag === st.player && st.day % 3 === 0) for (const f of c.fleets) if (f.mis !== 'hold' && !f.path.length) fleetMission(c, f);
    }
    // muharebeler
    const byZone = new Map();
    for (const c of Object.values(st.C)) if (c.alive && c.fleets) for (const f of c.fleets) { if (f.path.length && f.prog > 0) continue; let L = byZone.get(f.loc); if (!L) byZone.set(f.loc, (L = [])); L.push([c, f]); }
    for (const [zone, L] of byZone) {
      if (L.length < 2) continue;
      const a0 = L[0][0].tag;
      const enemies = L.filter(([c]) => G.atWar(a0, c.tag));
      if (!enemies.length) continue;
      const allies = L.filter(([c]) => !G.atWar(a0, c.tag) && (c.tag === a0 || G.sameFaction(c.tag, a0) || G.coBelligerent(c.tag, a0)));
      const pa = allies.reduce((s, [c, f]) => s + G.fleetPower(c, f), 0), pb = enemies.reduce((s, [c, f]) => s + G.fleetPower(c, f), 0);
      if (pa <= 0 || pb <= 0) continue;
      const hit = (side, oppP, ownP) => {
        for (const [c, f] of side) {
          const frac = 0.05 * oppP / (ownP + oppP) * (0.7 + G.rand() * 0.6);
          for (const e of SH) {
            let k = frac * (e === 'ss' ? 1.4 : e === 'bb' ? 0.6 : e === 'cv' ? 0.8 : 1);
            f.sh[e] = Math.max(0, (f.sh[e] || 0) * (1 - k));
            if (f.sh[e] < 0.3) f.sh[e] = 0;
          }
        }
      };
      hit(allies, pb, pa); hit(enemies, pa, pb);
      G.navalBattles.push({ loc: zone, a: allies[0][0].tag, b: enemies[0][0].tag, adv: pa / (pa + pb) });
      // zayıf taraf limana çekilir
      const retreat = (side, ownP, oppP) => { if (ownP < oppP * 0.35) for (const [c, f] of side) { const p = G.fleetPath(f.loc, f.home, c.tag); if (p) { f.path = p; f.prog = 0; } } };
      retreat(allies, pa, pb); retreat(enemies, pb, pa);
      const pl = st.player;
      G._nbLog = G._nbLog || {};
      if ([...allies, ...enemies].some(([c]) => c.tag === pl) && !(G._nbLog[zone] > st.day - 10) && (G._nbLog[zone] = st.day)) G.log(`Deniz muharebesi: ${G.cname(allies[0][0].tag)} - ${G.cname(enemies[0][0].tag)} (${Math.round(pa)} / ${Math.round(pb)})`, [allies[0][0].tag, enemies[0][0].tag], 'warn');
    }
    // konvoy akınları
    for (const c of Object.values(st.C)) {
      c.raid = 0;
      if (!c.alive || !c.enemies.length) continue;
      let raid = 0, esc = 0;
      for (const t of c.enemies) for (const f of st.C[t].fleets || []) if (f.mis === 'raid') raid += G.fleetPower(st.C[t], f) + (f.sh.ss || 0) * 2;
      for (const f of c.fleets || []) if (f.mis === 'escort') esc += G.fleetPower(c, f) + (f.sh.dd || 0) * 2;
      if (raid > 0) {
        c.raid = Math.min(0.7, raid / (raid + esc * 1.5 + 25));
        c.ships.conv = Math.max(0, (c.ships.conv || 0) * (1 - 0.004 * c.raid));
      }
    }
  };

  function fleetMission(c, f) {
    const st = G.st;
    if (f.mis === 'patrol' || f.mis === 'strike') {
      // yakındaki düşman filosuna saldır (yeterince güçlüysek)
      let best = null, bd = 99;
      const myP = G.fleetPower(c, f);
      for (const t of c.enemies) for (const ef of st.C[t].fleets || []) {
        const ep = G.fleetPower(st.C[t], ef);
        if (myP < ep * (f.mis === 'strike' ? 0.9 : 1.2)) continue;
        const d = G.zoneDist(f.loc, ef.loc, c.tag);
        if (d < bd && d <= (f.mis === 'strike' ? 14 : 6)) { bd = d; best = ef; }
      }
      if (best) { const p = G.fleetPath(f.loc, best.loc, c.tag); if (p) { f.path = p; f.prog = 0; } return; }
      if (f.loc !== f.home && G.zoneDist(f.loc, f.home, c.tag) > 6) { const p = G.fleetPath(f.loc, f.home, c.tag); if (p) f.path = p; }
    } else if (f.mis === 'raid') {
      if (!c.enemies.length) return;
      // düşman kıyısına komşu bir bölge
      if (f.raidZone == null || !c.enemies.some((t) => SEAS[f.raidZone - NP]?.p.some((i) => G.st.prov[i].c === t))) {
        let best = -1, bd = 99;
        for (let s = 0; s < SEAS.length; s++) {
          if (!SEAS[s].p.some((i) => G.atWar(c.tag, st.prov[i].c))) continue;
          const d = G.zoneDist(f.loc, NP + s, c.tag); if (d < bd) { bd = d; best = NP + s; }
        }
        f.raidZone = best;
      }
      if (f.raidZone >= 0 && f.loc !== f.raidZone) { const p = G.fleetPath(f.loc, f.raidZone, c.tag); if (p) f.path = p; }
    } else if (f.mis === 'escort') {
      if (f.loc !== f.home) { const p = G.fleetPath(f.loc, f.home, c.tag); if (p) f.path = p; }
    }
  }
  function aiFleets(c) {
    for (const f of c.fleets) {
      if (f.path.length) continue;
      if (!c.enemies.length) { if (f.loc !== f.home) { const p = G.fleetPath(f.loc, f.home, c.tag); if (p) f.path = p; } continue; }
      if (f.mis === 'hold') f.mis = f.sh.ss > G.fleetShips(f) * 0.6 ? 'raid' : 'patrol';
      fleetMission(c, f);
    }
    // yedek gemileri ana filoya kat
    const main = c.fleets.find((f) => f.auto) || c.fleets[0];
    if (main) { for (const e of SH) if (c.ships[e] >= 1) { main.sh[e] = (main.sh[e] || 0) + c.ships[e]; c.ships[e] = 0; } }
    else if (SH.some((e) => c.ships[e] >= 3)) { const home = G.homeZone(c); if (home >= 0) { c.fleets.push({ id: G.st.nextId++, n: `${c.fleets.length + 1}. Filo`, loc: home, home, sh: Object.fromEntries(SH.map((e) => [e, c.ships[e]])), mis: 'patrol', path: [], prog: 0, auto: 1 }); for (const e of SH) c.ships[e] = 0; } }
  }
  G.fleetMission = fleetMission;
})(window);
(function (g) { const G = g.G; G.navyCount = (c, e) => (c.ships[e] || 0) + (c.fleets || []).reduce((a, f) => a + (f.sh[e] || 0), 0); })(window);
