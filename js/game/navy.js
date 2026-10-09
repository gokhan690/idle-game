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
  G.fleetPower = (c, f) => G.shipsPower(c, f.sh) * (1 + 0.15 * (f.sh.cv || 0) * (G.planes(c, 'fig') > 50 ? 1 : 0.3)) * G.fuelNavyMul(c);
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
    let v = mine / (mine + theirs);
    // tarihî mod: Pearl Harbor'dan Midway'e dek Batı Pasifik'te Japon deniz üstünlüğü (Müttefikler Filipinler'e,
    // Malaya'ya ve Doğu Hint Adaları'na takviye taşıyamaz)
    // (pencere ABD-Japonya savaşının gerçek başlangıcından itibaren ~6 aydır; oyuncu Japonya ise uygulanmaz)
    const kb = st.opts.hist && st.player !== 'JAP' && ((st.wstart && st.wstart[G.pairKey('JAP', 'USA')]) ?? st.wars[G.pairKey('JAP', 'USA')]?.since);
    if (kb != null && kb !== false && st.day >= kb && st.day < kb + KBD && zone >= NP && G.atWar(tag, 'JAP') && tag !== st.player) {
      const z = G.SEAS[zone - NP]; if (z && z.lon > 95 && z.lat < 30 && z.lat > -15) v = Math.min(v, 0.3);
    }
    return v;
  };
  const KBD = G.dayOf('1942-06-04') - G.dayOf('1941-12-07'); // Pearl Harbor → Midway

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

  // ---------- Deniz muharebesi (HOI4) ----------
  const lv = (c, e) => c.mods['eq_' + e] || 1;
  // tarafın gücü: topçu (muhrip/kruvazör/zırhlı), uçak gemisi saldırısı, denizaltı torpidosu, denizaltı avı ve perde oranı
  function sideStats(side) {
    const n = { dd: 0, cr: 0, bb: 0, ss: 0, cv: 0 }; let gun = 0, air = 0, sub = 0, asw = 0;
    for (const [c, f] of side) {
      const m = (1 + (c.mods.navy || 0)) * G.fuelNavyMul(c);
      for (const e of SH) n[e] += f.sh[e] || 0;
      gun += ((f.sh.dd || 0) * lv(c, 'dd') + (f.sh.cr || 0) * 3 * lv(c, 'cr') + (f.sh.bb || 0) * 10 * lv(c, 'bb')) * m;
      air += (f.sh.cv || 0) * 12 * lv(c, 'cv') * m * (G.planes(c, 'fig') > 50 ? 1 : 0.4);
      sub += (f.sh.ss || 0) * 1.8 * lv(c, 'ss') * m;
      asw += ((f.sh.dd || 0) * 1.5 + (f.sh.cr || 0) * 0.4) * m;
    }
    const caps = n.bb + n.cv, scr = n.dd + 0.5 * n.cr;
    return { n, gun, air, sub, asw, screen: caps > 0.2 ? Math.min(1, scr / (3 * caps)) : 1 };
  }
  // hasar (karşı tarafın ateş gücü) gemi türlerine dayanıklılıkları ve hedef alınma ağırlıklarıyla dağılır:
  // perdesi zayıf filonun büyük gemileri, denizaltılar ise düşman muhriplerince vurulur
  function hit(side, S, O, dmg) {
    const w = {
      dd: 0.6 + 0.8 * S.screen,
      cr: 1,
      bb: 0.45 + 0.9 * (1 - S.screen) + (O.sub > 0 ? 0.25 * (1 - S.screen) : 0),
      cv: 0.5 + 1.1 * (1 - S.screen) + (O.air > 0 ? 0.3 : 0),
      ss: 0.15 + 1.4 * Math.min(1, O.asw / (2 * S.n.ss + 1)),
    };
    const hp = (e) => g.EQUIP[e].str;
    let tot = 0; for (const e of SH) tot += w[e] * S.n[e] * hp(e);
    const lost = {}; if (tot <= 0) return lost;
    for (const [, f] of side) {
      for (const e of SH) {
        const before = f.sh[e] || 0; if (!before) continue;
        const share = dmg * w[e] * before * hp(e) / tot; // bu filodaki bu türe düşen hasar
        const k = Math.min(0.6, share / hp(e) / before);
        let after = before * (1 - k); if (after < 0.3) after = 0;
        f.sh[e] = after; lost[e] = (lost[e] || 0) + before - after;
      }
    }
    return lost;
  }
  // muharebe raporu: oyuncunun katıldığı muharebeler aynı bölgede birkaç gün sürerse birleşir
  function navReport(zone, a, b, A, B, lostA, lostB) {
    const st = G.st, pl = st.player;
    G.navalBattles.push({ loc: zone, a, b, adv: (A.gun + A.air + A.sub) / Math.max(1, A.gun + A.air + A.sub + B.gun + B.air + B.sub) });
    const inA = a === pl || G.sameFaction(a, pl), inB = b === pl || G.sameFaction(b, pl);
    if (!pl || !(inA || inB)) return;
    const me = inA ? { t: a, S: A, L: lostA } : { t: b, S: B, L: lostB }, op = inA ? { t: b, S: B, L: lostB } : { t: a, S: A, L: lostA };
    st.navRep = st.navRep || [];
    let r = st.navRep.find((x) => x.zone === zone && st.day - x.last <= 3);
    if (!r) { r = { zone, day: st.day, last: st.day, me: me.t, op: op.t, nMe: { ...me.S.n }, nOp: { ...op.S.n }, lMe: {}, lOp: {} }; st.navRep.unshift(r); if (st.navRep.length > 10) st.navRep.length = 10; }
    r.last = st.day; r.scMe = me.S.screen; r.scOp = op.S.screen; r.airMe = me.S.air > 0; r.airOp = op.S.air > 0;
    for (const e of SH) { r.lMe[e] = (r.lMe[e] || 0) + (me.L[e] || 0); r.lOp[e] = (r.lOp[e] || 0) + (op.L[e] || 0); }
  }
  G.screenOf = (c, f) => sideStats([[c, f]]).screen;
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
      // HOI4 deniz muharebesi: topçu ateşi, uçak gemisi saldırısı, denizaltı pususu; perde gemileri büyük gemileri korur
      const A = sideStats(allies), B = sideStats(enemies);
      const fire = (X, Y) => X.gun * (0.7 + G.rand() * 0.6) + X.air * 1.2 + X.sub * (1.25 - 0.85 * Y.screen) * (0.6 + 0.8 * G.rand());
      const fA = fire(A, B), fB = fire(B, A);
      const lostA = hit(allies, A, B, 0.05 * fB), lostB = hit(enemies, B, A, 0.05 * fA);
      navReport(zone, allies[0][0].tag, enemies[0][0].tag, A, B, lostA, lostB);
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
