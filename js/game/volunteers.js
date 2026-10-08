// Gönüllü kuvvetler (HOI4): savaşa girmeden başka bir ülkenin savaşına tümen ve hava kanadı gönderme.
// Gönüllü tümen alıcının birimi olur (u.t = alıcı) ve u.vol = gönderen ile işaretlenir; alıcının YZ'si yönetir,
// insan gücü ve takviye gönderenden düşer, muharebe tecrübesi gönderene kara tecrübesi (axp) olarak döner.
// Hava gönüllüsü alıcının c.wings listesine w.vol = gönderen ile girer. Savaş bitince hayatta kalanlar eve döner.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const alive = (t) => G.st.C[t]?.alive;
  const pName = (t) => G.cname(t);

  // ---------- Kotalar (ordunun ~%10'u, en az 1 tümen) ----------
  const ownDivs = (a) => { let n = 0; for (const u of G.st.units) if ((u.vol || u.t) === a) n++; return n; };
  G.volSent = (a, b) => { let n = 0; for (const u of G.st.units) if (u.vol === a && (!b || u.t === b)) n++; return n; };
  G.volCap = (a) => Math.max(1, Math.floor(ownDivs(a) * 0.1));
  const ownPlanes = (c) => { let n = 0; for (const e of g.PLANES) n += c.stock[e] || 0; for (const w of c.wings || []) if (!w.vol) n += w.n; return n; };
  G.volAirSent = (a, b) => { let n = 0; for (const c of Object.values(G.st.C)) if (c.alive && (!b || c.tag === b)) for (const w of c.wings || []) if (w.vol === a) n += w.n; return n; };
  G.volAirCap = (a) => { const c = G.st.C[a]; return Math.max(20, Math.floor(0.1 * (ownPlanes(c) + G.volAirSent(a)))); };
  G.volLeft = (a) => ({ div: Math.max(0, G.volCap(a) - G.volSent(a)), air: Math.max(0, G.volAirCap(a) - Math.floor(G.volAirSent(a))) });

  // ---------- Ulaşılabilirlik: kara ya da deniz yoluyla (düşman toprağından geçmeden) ----------
  const reachCache = {};
  G.volReach = (a, b) => {
    const st = G.st, key = a + '>' + b, hit = reachCache[key];
    if (hit && st.day - hit.d < 20 && hit.d <= st.day) return hit.ok;
    const ca = st.C[a];
    let from = ca.cap; if (from < 0 || st.prov[from].c !== a) from = G.anyOwnProvince(a);
    let ok = false;
    if (from >= 0) {
      const seen = new Uint8Array(G.NN), q = [from]; seen[from] = 1;
      for (let i = 0; i < q.length && !ok; i++) {
        const n = q[i];
        if (n < NP && st.prov[n].c === b) { ok = true; break; }
        for (const [m] of G.adj[n]) {
          if (seen[m]) continue;
          if (m < NP) { const pc = st.prov[m].c; if (pc !== a && G.atWar(a, pc)) continue; }
          else if (n >= NP && G.straitBlocked(a, n, m)) continue;
          seen[m] = 1; q.push(m);
        }
      }
    }
    reachCache[key] = { d: st.day, ok };
    return ok;
  };

  // ---------- Kurallar ----------
  // opts.force: tarihî/komut dışı gönderimlerde gerginlik ve alıcı görüşü şartı aranmaz
  G.volCheck = (a, b, opts = {}) => {
    const st = G.st, ca = st.C[a], cb = st.C[b];
    const no = (why) => ({ ok: false, why });
    if (!ca?.alive || !cb?.alive || a === b) return no('Geçersiz hedef.');
    if (!cb.enemies.length) return no('Alıcı savaşta değil.');
    if (cb.capd) return no('Alıcı teslim olmuş.');
    if (ca.enemies.includes(b)) return no('Bu ülkeyle savaştasın.');
    if (ca.enemies.some((e) => cb.eset.has(e))) return no('Alıcının düşmanıyla zaten savaştasın; gönüllüye gerek yok.');
    if (cb.enemies.some((e) => G.sameFaction(a, e))) return no('Alıcının düşmanıyla aynı ittifaktasın.');
    for (const m of G.sideOf(b)) if (ca.eset.has(m)) return no('Alıcının müttefikleriyle savaştasın.');
    if (!opts.force) {
      if (st.tension < 10) return no('Dünya gerginliği en az %10 olmalı.');
      if (b !== st.player && G.opinion(b, a) <= -20) return no('Alıcı hükümet, ideolojik nedenlerle gönüllüleri kabul etmiyor.');
    }
    if (!G.volReach(a, b)) return no('Alıcıya kara ya da deniz yoluyla ulaşılamıyor.');
    const left = G.volLeft(a);
    if (!opts.force && left.div < 1 && left.air < 10) return no('Gönüllü kotası dolu (ordunun %10\'u).');
    return { ok: true, left: left.div, airLeft: left.air };
  };

  // Gönüllülerin ineceği eyalet: alıcının başkenti; düşmüşse düşmansız en değerli dost eyalet
  function dest(t) {
    const st = G.st, c = st.C[t];
    if (c.cap >= 0 && st.prov[c.cap].c === t && !G.hostileIn(c.cap, t)) return c.cap;
    let best = -1, bv = -1;
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === t && !G.hostileIn(i, t) && P[i].vp > bv) { bv = P[i].vp; best = i; } }
    return best;
  }

  const notify = (a, b, msg, kind) => { const pl = G.st.player; G.log(msg, [a, b], a === pl || b === pl ? (kind || 'good') : 'info'); };

  // ---------- Tümen gönderme ----------
  G.sendVolunteers = (a, b, n, opts = {}) => {
    const st = G.st, ca = st.C[a], cb = st.C[b];
    const r = G.volCheck(a, b, opts); if (!r.ok) return { ok: false, why: r.why, n: 0 };
    n = opts.force ? n | 0 : Math.min(n | 0, r.left); // tarihî gönderimler kotayı aşabilir
    if (n < 1) return { ok: false, why: 'Gönüllü tümen kotası dolu.', n: 0 };
    const to = dest(b); if (to < 0) return { ok: false, why: 'Alıcının güvenli bir yerleşim yeri yok.', n: 0 };
    const front = (u) => (P[u.loc].a.some((j) => G.atWar(a, st.prov[j].c)) ? 1 : 0);
    const pool = st.units.filter((u) => u.t === a && !u.vol && !u.dead && u.loc < NP && !u.gar && !u.sr && u.str > 0.5 && !(G.inBattle && G.inBattle.has(u)));
    const pref = (u) => (opts.pref && G.T(a, u.u)[opts.pref] > 0 ? 0 : 1);
    pool.sort((x, y) => pref(x) - pref(y) || front(x) - front(y) || y.str - x.str || x.id - y.id);
    const pick = pool.slice(0, n);
    if (!pick.length) return { ok: false, why: 'Gönderilebilecek uygun tümen yok.', n: 0 };
    const pc = cb.tag === st.player ? cb : null;
    for (const u of pick) {
      u.t = b; u.vol = a; u.vu = opts.until ? G.dayOf(opts.until) : 0;
      u.army = 0; u.path = []; u.prog = 0; u.sr = 0; u.gar = 0; u.ret = 0; u.ent = 0; u.loc = to;
      u.auto = pc ? 0 : 1;
      if (pc && pc.deployArmy && G.armyById(pc, pc.deployArmy) && G.armyUnits(pc, pc.deployArmy).length < G.ARMY_MAX) { u.army = pc.deployArmy; u.auto = 0; }
    }
    ca._mpu = null; cb._mpu = null;
    G.rebuildUnitIndex(); G.needSummary = 1; G.mapDirty = 1;
    st.tension = Math.min(100, st.tension + 1);
    notify(a, b, `${pName(a)}, ${pName(b)}'${G.ek(b)} ${pick.length} gönüllü tümen gönderdi.`);
    return { ok: true, n: pick.length };
  };

  // ---------- Hava gönüllüsü ----------
  G.sendAirVolunteers = (a, b, e, n, opts = {}) => {
    const st = G.st, ca = st.C[a], cb = st.C[b];
    const r = G.volCheck(a, b, opts); if (!r.ok) return { ok: false, why: r.why, n: 0 };
    if (!g.PLANES.includes(e)) return { ok: false, why: 'Geçersiz uçak türü.', n: 0 };
    G.ensureAirbases();
    const reg = G.homeRegion(cb);
    // sahip olunan uçak: stok + kendi kanatları
    const wingsOf = ca.wings ? ca.wings.filter((w) => w.e === e && !w.vol && w.n >= 1) : [];
    const have = (ca.stock[e] || 0) + wingsOf.reduce((s, w) => s + w.n, 0);
    n = Math.floor(Math.min(n, opts.force ? n : r.airLeft, have));
    if (n < 10) return { ok: false, why: !opts.force && r.airLeft < 10 ? 'Hava gönüllüsü kotası dolu.' : 'Yeterli uçak yok.', n: 0 };
    if (reg < 0) return { ok: false, why: 'Alıcıda uygun bir hava bölgesi yok.', n: 0 };
    let sent = 0;
    const until = opts.until ? G.dayOf(opts.until) : 0;
    while (n - sent >= 10) {
      const k = Math.min(G.WING_MAX, n - sent);
      // önce stok, sonra en dolu kanat
      let q, took;
      if ((ca.stock[e] || 0) >= k) { ca.stock[e] -= k; took = k; q = Object.assign({}, G.stockVec(ca, e)); }
      else {
        const w0 = wingsOf.filter((w) => w.n >= 1).sort((x, y) => y.n - x.n)[0];
        if (!w0) break;
        took = Math.min(k, w0.n); w0.n -= took; q = Object.assign({}, G.wingQ(ca, w0));
        if (w0.n < 1) { ca.wings.splice(ca.wings.indexOf(w0), 1); wingsOf.splice(wingsOf.indexOf(w0), 1); }
      }
      const w = { id: st.nextId++, e, n: took, max: G.WING_MAX, r: reg, mis: e === 'bom' ? 'str' : G.WING_TYPES[e].m[0], q, vol: a, vu: until };
      (cb.wings || (cb.wings = [])).push(w);
      G._abLoad = null;
      G.setBase(w, G.bestBaseFor(cb, w, reg));
      if (w.b < 0 || w.b == null) G.fixBase(cb, w);
      if (w.b == null || w.b < 0) { // üs bulunamadı: uçaklar geri alınır
        cb.wings.pop(); ca.stock[e] = (ca.stock[e] || 0) + took; G._abLoad = null;
        if (!sent) return { ok: false, why: 'Alıcıda uçaklara uygun hava üssü yok.', n: 0 };
        break;
      }
      sent += took;
    }
    if (!sent) return { ok: false, why: 'Gönderilemedi.', n: 0 };
    st.tension = Math.min(100, st.tension + 0.5);
    notify(a, b, `${pName(a)}, ${pName(b)}'${G.ek(b)} ${Math.round(sent)} uçaklık hava gönüllüsü gönderdi (${G.WING_TYPES[e].n.toLowerCase()}).`);
    return { ok: true, n: sent };
  };

  // ---------- Geri dönüş ----------
  // b'deki a gönüllülerini eve gönder (filter: yalnızca bu birimler/kanatlar)
  G.volReturn = (a, b, why, filter) => {
    const st = G.st, ca = st.C[a], cb = st.C[b];
    const okA = !!ca?.alive;
    const home = okA ? dest(a) : -1;
    let nu = 0, nw = 0;
    for (const u of st.units) {
      if (u.vol !== a || u.t !== b || u.dead || (filter && !filter(u))) continue;
      if (!okA) { u.vol = 0; u.vu = 0; continue; } // gönderen yok: alıcıda kalır
      if (home < 0) { u.dead = 1; continue; }
      u.t = a; u.vol = 0; u.vu = 0; u.army = 0; u.path = []; u.prog = 0; u.sr = 0; u.gar = 0; u.ret = 0; u.loc = home;
      u.auto = a === st.player ? 0 : 1;
      nu++;
    }
    if (cb && cb.wings) {
      for (const w of cb.wings.slice()) {
        if (w.vol !== a || (filter && !filter(w))) continue;
        cb.wings.splice(cb.wings.indexOf(w), 1);
        if (!okA) { w.vol = 0; w.vu = 0; cb.wings.push(w); continue; }
        if (w.n < 1) continue;
        w.vol = 0; w.vu = 0; w.manual = 0; w.r = G.homeRegion(ca); w.mis = w.e === 'bom' ? 'str' : G.WING_TYPES[w.e].m[0]; w.b = -1;
        (ca.wings || (ca.wings = [])).push(w);
        G._abLoad = null; G.fixBase(ca, w);
        nw += Math.round(w.n);
      }
    }
    if (ca) ca._mpu = null; if (cb) cb._mpu = null;
    if (st.units.some((u) => u.dead)) st.units = st.units.filter((u) => !u.dead);
    G.rebuildUnitIndex(); G.needSummary = 1; G.mapDirty = 1;
    if (okA && (nu || nw)) notify(a, b, `${pName(a)} gönüllüleri ${pName(b)} cephesinden geri çekildi (${why}): ${nu ? nu + ' tümen' : ''}${nu && nw ? ', ' : ''}${nw ? nw + ' uçak' : ''}.`, 'info');
    return nu + nw;
  };
  // alıcı çökerken ya da yok olurken bütün gönüllüler eve döner
  G.volReturnTo = (b) => {
    const st = G.st, froms = new Set();
    for (const u of st.units) if (u.vol && u.t === b) froms.add(u.vol);
    for (const w of (st.C[b]?.wings || [])) if (w.vol) froms.add(w.vol);
    for (const a of froms) G.volReturn(a, b, 'alıcı çöktü');
  };

  // ---------- Günlük döngü ----------
  // Geri dönüş nedeni (yoksa null)
  function returnReason(a, b) {
    const st = G.st, ca = st.C[a], cb = st.C[b];
    if (!ca?.alive) return 'gönderen ülke yok oldu';
    if (!cb?.alive || cb.capd) return 'alıcı teslim oldu';
    if (!cb.enemies.length) return 'savaş sona erdi';
    if (ca.enemies.includes(b)) return 'iki ülke savaşa tutuştu';
    if (ca.enemies.some((e) => cb.eset.has(e))) return 'gönderen savaşa girdi';
    if (cb.enemies.some((e) => G.sameFaction(a, e))) return 'gönderen alıcının düşmanıyla ittifak kurdu';
    if (ca.enemies.length && (ca.surrender || 0) > 0.06) return 'yurt savunması';
    return null;
  }

  // Tarihî gönderimler: [anahtar, gönderen, alıcı, başlangıç, bitiş (yoksa 400 gün), tümen, uçaklar, seçenekler]
  const HIST = [
    { k: 'condor', a: 'GER', b: 'SPN', d0: '1936-11-06', div: 1, air: [['fig', 30], ['bom', 30]], pref: 'tanks' }, // Lejyon Kondor
    { k: 'ctv', a: 'ITA', b: 'SPN', d0: '1936-12-22', div: 3, air: [['fig', 20]] }, // Corpo Truppe Volontarie
    { k: 'sovspr', a: 'SOV', b: 'SPR', d0: '1936-10-25', div: 2, air: [['fig', 60], ['bom', 30]] }, // Sovyet tankçı ve pilotlar
    { k: 'sovchi', a: 'SOV', b: 'CHI', d0: '1937-09-01', d1: '1941-06-01', air: [['fig', 40], ['bom', 30]], airMax: 100, repeat: 150, until: '1941-06-22' }, // Çin'de Sovyet gönüllü pilotları
    { k: 'swefin', a: 'SWE', b: 'FIN', d0: '1939-12-10', d1: '1940-03-15', div: 1, until: '1940-03-31' }, // Kış Savaşı İsveç Gönüllü Kolordusu
  ];
  function histSend() {
    const st = G.st;
    for (const r of HIST) {
      const last = st.vol[r.k];
      if (last === 'x' || r.a === st.player) continue;
      const d0 = G.dayOf(r.d0), d1 = r.d1 ? G.dayOf(r.d1) : d0 + 400;
      if (st.day < d0) continue;
      if (st.day > d1) { st.vol[r.k] = 'x'; continue; }
      if (typeof last === 'number' && st.day - last < r.repeat) continue;
      if (!alive(r.a) || !alive(r.b) || !st.C[r.b].enemies.length) continue;
      const o = { force: 1, pref: r.pref, until: r.until };
      let got = 0;
      if (r.div) got += G.sendVolunteers(r.a, r.b, r.div, o).n;
      for (const [e, n] of r.air || []) {
        const room = r.airMax ? r.airMax - G.volAirSent(r.a, r.b) : n;
        if (room >= 10) got += G.sendAirVolunteers(r.a, r.b, e, Math.min(n, room), o).n;
      }
      if (got || r.airMax) st.vol[r.k] = r.repeat ? st.day : 'x';
    }
  }
  // Serbest mod: YZ büyük güçleri ideolojilerine yakın tarafa nadiren gönüllü gönderir
  function freeSend() {
    const st = G.st;
    for (const ca of Object.values(st.C)) {
      if (!ca.alive || !ca.major || ca.tag === st.player || ca.capd || ca.enemies.length > 1 || G.rand() > 0.12) continue;
      if (ca.ideo === 'neu') continue;
      let best = null, bs = 25;
      for (const cb of Object.values(st.C)) {
        if (!cb.alive || cb.tag === ca.tag || !cb.enemies.length || cb.ideo !== ca.ideo || cb.capd) continue;
        const sc = G.opinion(ca.tag, cb.tag) + (cb.surrender || 0) * 40 + G.rand() * 10;
        if (sc <= bs || !G.volCheck(ca.tag, cb.tag).ok) continue;
        bs = sc; best = cb.tag;
      }
      if (!best) continue;
      const n = G.sendVolunteers(ca.tag, best, ca.sum.mil > 20 ? 2 : 1).n;
      if (n && G.rand() < 0.5) G.sendAirVolunteers(ca.tag, best, 'fig', 40);
    }
  }

  G.volTick = () => {
    const st = G.st;
    if (!st.vol) st.vol = {};
    const d = st.day;
    if (d % 5 === 2) {
      const pairs = new Map();
      for (const u of st.units) if (u.vol) pairs.set(u.vol + '>' + u.t, [u.vol, u.t]);
      for (const c of Object.values(st.C)) if (c.alive) for (const w of c.wings || []) if (w.vol) pairs.set(w.vol + '>' + c.tag, [w.vol, c.tag]);
      for (const [a, b] of pairs.values()) {
        const why = returnReason(a, b);
        if (why) { G.volReturn(a, b, why); continue; }
        // süresi dolan (tarihî) gönüllüler
        if (st.units.some((u) => u.vol === a && u.t === b && u.vu && d >= u.vu) || (st.C[b].wings || []).some((w) => w.vol === a && w.vu && d >= w.vu)) G.volReturn(a, b, 'görev süresi doldu', (x) => x.vu && d >= x.vu);
      }
      // hava tecrübesi: görevdeki gönüllü kanatlar gönderene tecrübe kazandırır
      for (const c of Object.values(st.C)) if (c.alive && c.enemies.length) for (const w of c.wings || []) if (w.vol && w.r >= 0 && w.n > 10 && st.C[w.vol]) st.C[w.vol].fxp = Math.min(500, (st.C[w.vol].fxp ?? 30) + 0.15);
    }
    if (d % 5 === 1 && st.opts.hist) histSend();
    if (d % 60 === 23 && !st.opts.hist) freeSend();
  };

  // Savaş alanında ya da yurt dışında kalmış, göndereni olmayan işaretleri temizle (eski/bozuk kayıtlar)
  G.volFix = () => { for (const u of G.st.units) if (u.vol && !G.st.C[u.vol]) u.vol = 0; };
})(window);
