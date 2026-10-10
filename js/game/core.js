// Çekirdek: statik harita yapıları, oyun durumu, yardımcılar, yol bulma.
(function (g) {
  const G = (g.G = g.G || {});
  const M = g.MAP_DATA;
  const P = M.provinces, SEAS = M.seas;
  const NP = P.length, NS = SEAS.length, NN = NP + NS;
  Object.assign(G, { M, P, SEAS, NP, NS, NN });

  // ---------- Statik grafik ----------
  const nodeX = new Float32Array(NN), nodeY = new Float32Array(NN);
  P.forEach((p, i) => { nodeX[i] = p.x; nodeY[i] = p.y; });
  SEAS.forEach((s, i) => { nodeX[NP + i] = s.x; nodeY[NP + i] = s.y; });
  const adj = Array.from({ length: NN }, () => []);
  const link = (a, b) => {
    if (a === b) return;
    let dx = Math.abs(nodeX[a] - nodeX[b]); if (dx > M.W / 2) dx = M.W - dx;
    const d = Math.hypot(dx, nodeY[a] - nodeY[b]);
    if (!adj[a].some((e) => e[0] === b)) adj[a].push([b, d]);
    if (!adj[b].some((e) => e[0] === a)) adj[b].push([a, d]);
  };
  P.forEach((p, i) => { p.a.forEach((j) => link(i, j)); p.s.forEach((s) => link(i, NP + s)); });
  SEAS.forEach((s, i) => s.a.forEach((j) => link(NP + i, NP + j)));
  G.adj = adj; G.nodeX = nodeX; G.nodeY = nodeY;
  // Boğazlar ve kanallar: kontrol eyaletlerinden biri düşmandaysa geçilemez (HOI4)
  G.STRAITS = M.straits || [];
  const straitMap = new Map();
  // aynı geçide birden çok boğaz/kanal düşebilir (ör. Danimarka Boğazları ve Kiel Kanalı): biri açıksa geçilir
  const addS = (k, st) => { const L = straitMap.get(k); if (L) { if (!L.includes(st)) L.push(st); } else straitMap.set(k, [st]); };
  for (const st of G.STRAITS) for (const [x, y] of st.e || [[st.a, st.b]]) { const a = NP + x, b = NP + y; addS(a * 8192 + b, st); addS(b * 8192 + a, st); }
  G.straitAt = (a, b) => (straitMap.get(a * 8192 + b) || [])[0];
  const closed = (tag, s) => { for (const i of s.p) { const c = G.st.prov[i].c; if (c !== tag && G.atWar(tag, c)) return true; } return false; };
  G.straitBlocked = (tag, a, b) => {
    if (a < NP || b < NP) return false;
    const L = straitMap.get(a * 8192 + b); if (!L) return false;
    return L.every((s) => closed(tag, s));
  };
  G.isSea = (n) => n >= NP;
  const HW = M.W / 2;
  G.dist = (a, b) => { let dx = nodeX[a] - nodeX[b]; if (dx < 0) dx = -dx; if (dx > HW) dx = M.W - dx; const dy = nodeY[a] - nodeY[b]; return Math.sqrt(dx * dx + dy * dy); };

  // ---------- Tarih ----------
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const EPOCH = Date.UTC(1936, 0, 1);
  G.dateOf = (day) => new Date(EPOCH + day * 864e5);
  G.fmtDate = (day) => { const d = G.dateOf(day); return `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  G.year = (day) => G.dateOf(day).getUTCFullYear();
  G.dayOf = (s) => Math.round((Date.parse(s + 'T00:00:00Z') - EPOCH) / 864e5);
  G.AYLAR = AYLAR;

  // ---------- Rastgele (kayıtla birlikte saklanır) ----------
  G.rand = () => { const st = G.st; st.seed = (st.seed * 1664525 + 1013904223) >>> 0; return st.seed / 4294967296; };

  // ---------- Yardımcılar ----------
  G.def = (tag) => g.COUNTRY_DEFS[tag];
  G.cname = (tag) => (g.COUNTRY_DEFS[tag] ? g.COUNTRY_DEFS[tag].n : tag);
  G.pname = (i) => P[i].n.startsWith('#') ? `${G.cname(P[i].n.slice(1).split(':')[0])} Bölgesi ${P[i].n.split(':')[1]}` : P[i].n;
  G.fmtK = (v) => (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v).toString());
  G.fmtMP = (k) => (k >= 1000 ? (k / 1000).toFixed(2) + 'M' : Math.round(k) + 'K');
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  G.pairKey = key;

  G.atWar = (a, b) => { const c = G.st.C[a]; return !!(c && c.eset && c.eset.has(b)); };
  G.enemies = (tag) => { const c = G.st.C[tag]; return c ? c.enemies : []; };
  G.sameFaction = (a, b) => { if (a === b) return true; const ca = G.st.C[a], cb = G.st.C[b]; return !!(ca && cb && ca.fac && ca.fac === cb.fac); };
  G._cob = new Map();
  G.coBelligerent = (a, b) => {
    const ca = G.st.C[a], cb = G.st.C[b];
    if (!ca || !cb || !ca.enemies.length || !cb.enemies.length) return false;
    const k = a + b; let v = G._cob.get(k);
    if (v === undefined) { v = ca.enemies.some((e) => cb.eset.has(e)) && !ca.eset.has(b); G._cob.set(k, v); }
    return v;
  };
  // dost ilişkisi önbelleği: her gün başında ve savaş/ittifak/geçiş değişince temizlenir
  let FR = Object.create(null), FRst = null;
  G.relClear = () => { G._cob.clear(); FR = Object.create(null); FRst = G.st; };
  // bit 1: dost, bit 2: savaşta
  const rel = (a, b) => {
    if (FRst !== G.st) G.relClear();
    const m = FR[a] || (FR[a] = Object.create(null));
    let v = m[b];
    if (v === undefined) v = m[b] = (G.sameFaction(a, b) || G.coBelligerent(a, b) || !!G.st.access[a + '>' + b] ? 1 : 0) | (G.atWar(a, b) ? 2 : 0);
    return v;
  };
  G.rel = rel;
  G.friendly = (a, b) => a === b || (rel(a, b) & 1) === 1;
  G.canEnter = (tag, n) => {
    if (n >= NP) return true;
    const c = G.st.prov[n].c;
    return c === tag || rel(tag, c) !== 0;
  };
  G.hostileIn = (n, tag) => { const L = G.unitsAt[n]; if (!L) return false; for (const u of L) if (G.atWar(u.t, tag)) return true; return false; };

  // Birim istatistikleri army.js içinde (şablon + komutan).
  G.unitPower = (u) => { const s = G.unitStats(u); return (0.12 * (s.sa + s.ha) + 0.06 * s.df + 0.05 * s.bt) * u.str * (0.35 + 0.65 * Math.min(1, u.org / s.org)); };

  // ---------- Yol bulma (A*) ----------
  // Tip dizili ikili yığın (eski dizi tabanlı yığınla aynı sıralama; bellek ayırmadan)
  class Heap {
    constructor() { this.k = new Float64Array(1024); this.v = new Int32Array(1024); this.size = 0; }
    clear() { this.size = 0; }
    push(n, p) {
      if (this.size === this.k.length) { const k = new Float64Array(this.size * 2), v = new Int32Array(this.size * 2); k.set(this.k); v.set(this.v); this.k = k; this.v = v; }
      const K = this.k, V = this.v; let i = this.size++;
      K[i] = p; V[i] = n;
      while (i > 0) { const j = (i - 1) >> 1; if (K[j] <= K[i]) break; const tk = K[i]; K[i] = K[j]; K[j] = tk; const tv = V[i]; V[i] = V[j]; V[j] = tv; i = j; }
    }
    // en küçüğü çıkarır: anahtarı this.pk'ye yazar, düğümü döndürür
    pop() {
      const K = this.k, V = this.v;
      const tk = K[0], tv = V[0];
      const last = --this.size;
      if (last > 0) {
        K[0] = K[last]; V[0] = V[last];
        let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < last && K[l] < K[m]) m = l; if (r < last && K[r] < K[m]) m = r; if (m === i) break; const xk = K[i]; K[i] = K[m]; K[m] = xk; const xv = V[i]; V[i] = V[m]; V[m] = xv; i = m; }
      }
      this.pk = tk;
      return tv;
    }
  }
  G.Heap = Heap;
  const SEA_SPEED = 40;
  G.SEA_SPEED = SEA_SPEED;
  // Kenar maliyeti (gün)
  G.edgeDays = (a, b, spd) => {
    const d = G.dist(a, b);
    if (a < NP && b < NP) return (d * g.TERRAIN[P[b].te].move * G.RIVER_MOVE[G.riverEdge(a, b)]) / spd; // nehir geçişi yavaştır
    if (a < NP && b >= NP) return (d + 40) / SEA_SPEED;
    if (a >= NP && b < NP) return (d + 20) / SEA_SPEED;
    return d / SEA_SPEED;
  };
  // kenar maliyetleri önceden: edgeDays(a, b, spd) = L / spd + C (L kara-kara payı, C deniz sabiti)
  let EO = null, EI = null;
  const edgeTabs = () => {
    EO = []; EI = [];
    for (let x = 0; x < NN; x++) {
      const L = adj[x], o = new Float64Array(L.length * 2), i = new Float64Array(L.length * 2);
      for (let k = 0; k < L.length; k++) {
        const y = L[k][0];
        if (x < NP && y < NP) { o[2 * k] = G.dist(x, y) * g.TERRAIN[P[y].te].move * G.RIVER_MOVE[G.riverEdge(x, y)]; i[2 * k] = G.dist(y, x) * g.TERRAIN[P[x].te].move * G.RIVER_MOVE[G.riverEdge(y, x)]; }
        else { o[2 * k + 1] = G.edgeDays(x, y, 1); i[2 * k + 1] = G.edgeDays(y, x, 1); }
      }
      EO.push(o); EI.push(i);
    }
  };
  const gScore = new Float64Array(NN), came = new Int32Array(NN), stamp = new Int32Array(NN);
  let curStamp = 0;
  const pH = new Heap(), fH = new Heap();
  // opts: {naval: bool, maxDays}
  G.findPath = (from, to, tag, spd, opts = {}) => {
    if (from === to) return [];
    if (to < NP && !G.canEnter(tag, to)) return null;
    curStamp++;
    if (!EO) edgeTabs();
    const h = pH; h.clear();
    const prov = G.st.prov, naval = !!opts.naval, avoid = !!opts.avoidHostile, maxD = opts.maxDays;
    const hs = Math.max(spd * 1.0, SEA_SPEED);
    const heur = (n) => G.dist(n, to) / hs;
    stamp[from] = curStamp; gScore[from] = 0; came[from] = -1;
    h.push(from, heur(from));
    let iter = 0;
    while (h.size) {
      const n = h.pop();
      if (n === to) break;
      if (++iter > 6000) return null;
      const gn = gScore[n], A = adj[n], E = EO[n];
      for (let k = 0; k < A.length; k++) {
        const b = A[k][0];
        if (b >= NP) {
          if (!naval) continue;
          if (n >= NP && G.straitBlocked(tag, n, b)) continue;
        } else if (b !== to) {
          const pc = prov[b].c;
          if (pc !== tag && rel(tag, pc) === 0) continue;
          if (avoid && G.hostileIn(b, tag)) continue;
        }
        // denizden geçiş: kara düğümlerinden denize sadece kıyıdan
        const cost = gn + (E[2 * k] / spd + E[2 * k + 1]);
        if (maxD && cost > maxD) continue;
        if (stamp[b] !== curStamp || cost < gScore[b]) {
          stamp[b] = curStamp; gScore[b] = cost; came[b] = n;
          h.push(b, cost + heur(b));
        }
      }
    }
    if (stamp[to] !== curStamp) return null;
    const path = []; let n = to;
    while (n !== from && n !== -1) { path.push(n); n = came[n]; }
    if (n !== from) return null;
    path.reverse();
    return path;
  };
  // Akış alanı: kaynak düğümlere (ör. cephe eyaletleri) en kısa yolların ters ağacı
  const fDist = new Float64Array(NN), fNext = new Int32Array(NN), fSrc = new Int32Array(NN);
  G.flowField = (tag, sources, opts = {}) => {
    fDist.fill(Infinity); fNext.fill(-1); fSrc.fill(-1);
    if (!EO) edgeTabs();
    const h = fH; h.clear();
    for (const s of sources) { if (s.c < fDist[s.i]) { fDist[s.i] = s.c; fSrc[s.i] = s.i; h.push(s.i, s.c); } }
    const spd = opts.spd || 9.6, naval = !!opts.naval, prov = G.st.prov;
    while (h.size) {
      const m = h.pop(), d = h.pk;
      if (d > fDist[m]) continue;
      const A = adj[m], E = EI[m];
      for (let k = 0; k < A.length; k++) {
        const n = A[k][0];
        if (n >= NP) {
          if (!naval) continue;
          if (m >= NP && G.straitBlocked(tag, n, m)) continue;
        } else {
          const pc = prov[n].c;
          if (pc !== tag && rel(tag, pc) !== 1) continue; // yalnızca kendi ve savaşta olmayan dost topraklar
        }
        const c = d + (E[2 * k] / spd + E[2 * k + 1]);
        if (c < fDist[n]) { fDist[n] = c; fNext[n] = m; fSrc[n] = fSrc[m]; h.push(n, c); }
      }
    }
    return { dist: fDist, next: fNext, src: fSrc };
  };
  G.followField = (ff, from) => {
    const path = []; let n = from, guard = 0;
    while (ff.next[n] >= 0 && guard++ < 400) { n = ff.next[n]; path.push(n); }
    return path;
  };
  G.pathDays = (from, path, spd) => { let d = 0, a = from; for (const b of path) { d += G.edgeDays(a, b, spd); a = b; } return d; };

  // ---------- Ülke değiştirici hesaplama ----------
  G.recomputeMods = (c) => {
    const m = { eq_inf: 0, eq_art: 0, eq_tank: 0, eq_fig: 0, eq_cas: 0, eq_bom: 0, eq_dd: 0, eq_cr: 0, eq_bb: 0, eq_ss: 0, eq_cv: 0, unlock: { inf: 1, cav: 1 }, unlockEq: { inf: 1, art: 1, fig: 1, cas: 1, bom: 1, dd: 1, cr: 1, bb: 1, ss: 1 } };
    const add = (fx) => {
      for (const [k, v] of Object.entries(fx)) {
        if (k.startsWith('eq_')) m[k] = Math.max(m[k] || 0, v);
        else if (k === 'unlock') m.unlock[v] = 1;
        else if (k === 'unlock_eq') m.unlockEq[v] = 1;
        else if (typeof v === 'number' && !['addCiv', 'addMil', 'addDock', 'addPlanes', 'addBombers', 'forts'].includes(k)) m[k] = (m[k] || 0) + v;
      }
    };
    for (const id of Object.keys(c.tech)) if (g.TECH_BY_ID[id]) add(g.TECH_BY_ID[id].fx);
    add(c.fmods);
    for (const sp of c.spirits || []) if (g.SPIRITS[sp]) add(g.SPIRITS[sp].fx);
    if (G.bopFx) { const bf = G.bopFx(c); if (bf) add(bf); } // güç dengesi kademesi
    if (G.diffFx && G.st) { const df = G.diffFx(c); if (df) add(df); } // zorluk seviyesi
    if (G.intelFx) { const xf = G.intelFx(c); if (xf) add(xf); } // istihbarat: propaganda bürosu
    for (const list of Object.values(c.adv || {})) for (const t of list) if (g.ADV_TYPES[t]) add(g.ADV_TYPES[t].fx);
    // süren kararların değiştiricileri (js/data/decisions.js)
    for (const x of Array.isArray(c.dec) ? c.dec : []) { const d = g.DEC_BY_ID && g.DEC_BY_ID[x.id]; if (d && d.mod) add(d.mod); }
    const lm = g.LAWS.mob.opts[c.laws.mob], le = g.LAWS.eco.opts[c.laws.eco], lt = g.LAWS.trade.opts[c.laws.trade ?? 1];
    m.factory = (m.factory || 0) + (lm.factory || 0) + (lt.factory || 0);
    m.research = (m.research || 0) + (lt.research || 0);
    m.expCap = lt.exp ?? 0.5;
    m.construct = (m.construct || 0) + (le.construct || 0);
    m.mpRate = lm.mp; m.cg = Math.max(0.05, le.cg + (m.cg || 0));
    if (m.unlock.mot) m.unlockEq.mot = 1;
    if (m.unlock.arm) m.unlockEq.tank = 1;
    for (const k of ['inf', 'art', 'fig', 'cas', 'bom', 'dd', 'cr', 'bb', 'ss']) m['eq_' + k] = Math.max(1, m['eq_' + k]);
    if (m.unlock.arm) m.eq_tank = Math.max(1, m.eq_tank);
    m.slots = (c.major ? 3 : 2) + (m.slots || 0);
    c.mods = m;
    c._tc = {};
  };

  // ---------- Kuvvet hesapları ----------
  G.bestLevel = (c, e) => c.mods['eq_' + e] || 1;
  G.lvl = (c, e) => (c.sl && c.sl[e]) || c.mods['eq_' + e] || 1;
  G.airPower = (c) => {
    const m = c.mods;
    return (G.planes(c, 'fig') * G.lvl(c, 'fig') + G.planes(c, 'cas') * G.lvl(c, 'cas') * 0.6 + G.planes(c, 'bom') * G.lvl(c, 'bom') * 0.3) * (1 + (m.air || 0));
  };
  G.shipsPower = (c, sh) => {
    const m = c.mods; let v = 0;
    for (const e of g.SHIPS) v += (sh[e] || 0) * g.EQUIP[e].str * (m['eq_' + e] || 1);
    return v * (1 + (m.navy || 0));
  };
  G.navyPower = (c) => {
    let v = G.shipsPower(c, c.ships);
    for (const f of c.fleets || []) v += G.shipsPower(c, f.sh);
    return v;
  };
  G.armyPower = (tag) => { let v = 0; for (const u of G.st.units) if (u.t === tag) v += G.unitPower(u); return v; };
  G.sidePower = (tag, fn) => { const c = G.st.C[tag]; let v = fn(c); if (c.fac) for (const t of G.st.factions[c.fac].members) if (t !== tag && G.st.C[t]?.alive) v += fn(G.st.C[t]); return v; };

  // ---------- Birim indeksleri ----------
  G.rebuildUnitIndex = () => {
    const at = {};
    for (const u of G.st.units) { (at[u.loc] || (at[u.loc] = [])).push(u); }
    G.unitsAt = at;
  };

  G.log = (msg, tags, kind) => {
    const st = G.st;
    st.log.unshift({ d: st.day, m: msg, k: kind || 'info', t: tags || [] });
    if (st.log.length > 150) st.log.length = 150;
    if (G.onLog) G.onLog(st.log[0]);
  };
})(window);
