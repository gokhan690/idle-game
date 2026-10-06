// Hava kuvvetleri (HOI4 tarzı): hava bölgeleri, hava kanatları, görevler, hava üstünlüğü,
// yakın hava desteği, stratejik bombardıman, deniz saldırısı ve önleme.
(function (g) {
  const G = g.G;
  const { P, NP, SEAS, NS } = G;

  // ---------- Hava bölgeleri (stratejik bölgeler) ----------
  const NN = NP + NS;
  const regionOf = new Int16Array(NN).fill(-1);
  const regions = [];
  function partition(nodes, k, nb, land) {
    if (!nodes.length) return;
    const set = new Set(nodes);
    // tohumlar: düğüm yoğunluğuna orantılı (Avrupa gibi yoğun yerlerde daha çok bölge), ardından k-ortalamalar
    const wrapDx = (a, b) => { let d = a - b; if (d > G.M.W / 2) d -= G.M.W; if (d < -G.M.W / 2) d += G.M.W; return d; };
    const ord = nodes.slice().sort((a, b) => { const ba = Math.floor(G.nodeY[a] / 90), bb = Math.floor(G.nodeY[b] / 90); return ba - bb || (ba % 2 ? G.nodeX[b] - G.nodeX[a] : G.nodeX[a] - G.nodeX[b]); });
    let centers = []; for (let t = 0; t < k; t++) centers.push(ord[Math.floor((t + 0.5) * ord.length / k)]);
    for (let it = 0; it < 10; it++) {
      const acc = centers.map(() => [0, 0, 0]);
      const own = new Map();
      for (const n of nodes) {
        let b = 0, bd = Infinity;
        for (let ci = 0; ci < centers.length; ci++) { const dx = wrapDx(G.nodeX[n], G.nodeX[centers[ci]]), dy = G.nodeY[n] - G.nodeY[centers[ci]]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; b = ci; } }
        own.set(n, b); const a = acc[b]; a[0] += wrapDx(G.nodeX[n], G.nodeX[centers[b]]); a[1] += G.nodeY[n]; a[2]++;
      }
      centers = centers.map((c, ci) => {
        const a = acc[ci]; if (!a[2]) return c;
        const cx = G.nodeX[c] + a[0] / a[2], cy = a[1] / a[2];
        let b = c, bd = Infinity;
        for (const [n, o] of own) { if (o !== ci) continue; const dx = wrapDx(G.nodeX[n], cx), d = dx * dx + (G.nodeY[n] - cy) ** 2; if (d < bd) { bd = d; b = n; } }
        return b;
      });
    }
    let asg = new Map();
    for (let iter = 0; iter < 1; iter++) {
      // komşuluk üzerinden çok kaynaklı Dijkstra (bölgeler bitişik kalır)
      const dist = new Map(); asg = new Map();
      const heap = [];
      const push = (d, n, c) => { heap.push([d, n, c]); let i = heap.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (heap[j][0] <= heap[i][0]) break; [heap[i], heap[j]] = [heap[j], heap[i]]; i = j; } };
      const pop = () => { const t = heap[0]; const l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return t; };
      centers.forEach((c, ci) => { dist.set(c, 0); push(0, c, ci); });
      while (heap.length) {
        const [d, n, ci] = pop();
        if (asg.has(n)) continue;
        asg.set(n, ci);
        for (const j of nb(n)) { if (!set.has(j) || asg.has(j)) continue; const nd = d + G.dist(n, j); if (nd < (dist.get(j) ?? Infinity)) { dist.set(j, nd); push(nd, j, ci); } }
      }
      // ulaşılamayanlar (adalar): en yakın merkez
      for (const n of nodes) if (!asg.has(n)) { let b = 0, bd = Infinity; centers.forEach((c, ci) => { const d = G.dist(n, c); if (d < bd) { bd = d; b = ci; } }); asg.set(n, b); }
      if (iter === 0) break;
      // merkezleri ağırlık merkezine en yakın düğüme taşı
      const groups = centers.map(() => []);
      for (const [n, ci] of asg) groups[ci].push(n);
      groups.forEach((gr, ci) => {
        if (!gr.length) return;
        let sx = 0, sy = 0; const x0 = G.nodeX[gr[0]];
        for (const n of gr) { let dx = G.nodeX[n] - x0; if (dx > G.M.W / 2) dx -= G.M.W; if (dx < -G.M.W / 2) dx += G.M.W; sx += dx; sy += G.nodeY[n]; }
        const cx = x0 + sx / gr.length, cy = sy / gr.length;
        let b = gr[0], bd = Infinity;
        for (const n of gr) { let dx = Math.abs(G.nodeX[n] - cx); if (dx > G.M.W / 2) dx = G.M.W - dx; const d = dx * dx + (G.nodeY[n] - cy) ** 2; if (d < bd) { bd = d; b = n; } }
        centers[ci] = b;
      });
    }
    const base = regions.length;
    centers.forEach((c) => regions.push({ id: regions.length, land, nodes: [], c }));
    for (const [n, ci] of asg) { regionOf[n] = base + ci; regions[base + ci].nodes.push(n); }
  }
  const OCEANS = (lon, lat) => {
    if (lat > 66) return 'Arktik Okyanusu';
    if (lon > -6 && lon < 37 && lat > 30 && lat < 46) return lon > 22 ? 'Doğu Akdeniz' : lon > 10 ? 'Orta Akdeniz' : 'Batı Akdeniz';
    if (lon > 27 && lon < 42 && lat > 40 && lat < 48) return 'Karadeniz';
    if (lon > 9 && lon < 31 && lat > 53 && lat < 66) return 'Baltık Denizi';
    if (lon > -5 && lon < 10 && lat > 50 && lat < 62) return 'Kuzey Denizi';
    if (lon > 20 && lon < 147 && lat < 30 && lat > -60 && lon < 100) return 'Hint Okyanusu';
    if (lon > -100 && lon < 20) return lat >= 0 ? 'Kuzey Atlantik' : 'Güney Atlantik';
    return lat >= 0 ? 'Kuzey Pasifik' : 'Güney Pasifik';
  };
  {
    const land = []; for (let i = 0; i < NP; i++) land.push(i);
    partition(land, Math.max(20, Math.round(NP / 19)), (n) => P[n].a, true);
    const sea = []; for (let s = 0; s < NS; s++) sea.push(NP + s);
    partition(sea, Math.max(10, Math.round(NS / 7)), (n) => SEAS[n - NP].a.map((j) => NP + j), false);
    const used = new Map();
    for (const r of regions) {
      let name;
      if (r.land) {
        const named = r.nodes.filter((n) => !P[n].n.startsWith('#'));
        const best = (named.length ? named : r.nodes).reduce((b, n) => (P[n].vp > P[b].vp ? n : b), (named.length ? named : r.nodes)[0]);
        name = G.pname(best);
      } else {
        let best = -1, bv = -1;
        for (const n of r.nodes) for (const p of SEAS[n - NP].p) if (P[p].vp > bv) { bv = P[p].vp; best = p; }
        const s0 = SEAS[r.c - NP];
        name = best >= 0 && bv >= 3 ? `${P[best].n} açıkları` : OCEANS(s0.lon, s0.lat);
      }
      const k = (used.get(name) || 0) + 1; used.set(name, k);
      r.n = k > 1 ? `${name} ${k}` : name;
      let sx = 0, sy = 0; const x0 = G.nodeX[r.nodes[0]];
      for (const n of r.nodes) { let dx = G.nodeX[n] - x0; if (dx > G.M.W / 2) dx -= G.M.W; if (dx < -G.M.W / 2) dx += G.M.W; sx += dx; sy += G.nodeY[n]; }
      r.x = ((x0 + sx / r.nodes.length) % G.M.W + G.M.W) % G.M.W; r.y = sy / r.nodes.length;
    }
    // bölge komşulukları
    for (const r of regions) r.adj = new Set();
    for (let n = 0; n < NN; n++) for (const [m] of G.adj[n]) { const a = regionOf[n], b = regionOf[m]; if (a >= 0 && b >= 0 && a !== b) { regions[a].adj.add(b); regions[b].adj.add(a); } }
    for (const r of regions) r.adj = [...r.adj];
  }
  G.AIR = { regionOf, regions };
  G.regionOf = (n) => regionOf[n];

  // ---------- Kanatlar ----------
  G.WING_TYPES = { fig: { n: 'Avcı', m: ['sup', 'int'] }, cas: { n: 'Yakın Destek', m: ['cas', 'nav'] }, bom: { n: 'Bombardıman', m: ['str', 'nav', 'cas'] } };
  G.MIS = {
    sup: { n: 'Hava üstünlüğü', d: 'Bölgede düşman uçaklarıyla çarpışır; hava üstünlüğü kara muharebelerinde saldırı ve savunmayı artırır.' },
    int: { n: 'Önleme', d: 'Düşman bombardıman ve yakın destek uçaklarını avlar; bombardımana karşı etkili.' },
    cas: { n: 'Yakın hava desteği', d: 'Bölgedeki kara muharebelerinde dost tümenlere ek saldırı gücü verir.' },
    str: { n: 'Stratejik bombardıman', d: 'Bölgedeki düşman fabrikalarını ve altyapısını vurur; üretimi ve savaş desteğini düşürür.' },
    nav: { n: 'Deniz saldırısı', d: 'Bölgedeki düşman filolarına ve konvoylara saldırır.' },
  };
  G.WING_MAX = 100;
  G.planes = (c, e) => (c.stock[e] || 0) + (c.wings || []).reduce((s, w) => s + (w.e === e ? w.n : 0), 0);
  G.newWing = (c, e, r, mis, n) => {
    const st = G.st;
    n = Math.floor(Math.min(n ?? G.WING_MAX, c.stock[e] || 0));
    if (n < 10) return null;
    c.stock[e] -= n;
    const w = { id: st.nextId++, e, n, max: G.WING_MAX, r, mis: mis || G.WING_TYPES[e].m[0], q: Object.assign({}, G.stockVec(c, e)) };
    (c.wings || (c.wings = [])).push(w);
    if (G.bestBaseFor) { G.ensureAirbases(); G.setBase(w, G.bestBaseFor(c, w, r)); if (w.b < 0) G.fixBase(c, w); }
    return w;
  };
  G.disbandWing = (c, id) => { const k = (c.wings || []).findIndex((w) => w.id === id); if (k < 0) return; c.stock[c.wings[k].e] = (c.stock[c.wings[k].e] || 0) + c.wings[k].n; c.wings.splice(k, 1); };
  G.homeRegion = (c) => (c.cap >= 0 ? regionOf[c.cap] : -1);
  // Kanat bu bölgede görev yapabilir mi? (menzil: bölgede ya da komşu bölgede dost toprak)
  G.canBase = (tag, r) => {
    const st = G.st;
    if (G.baseOk) { // hava üsleri: menzil içinde (900 km) dost üs
      if (!G._cbCache || G._cbDay !== st.day) { G._cbCache = new Map(); G._cbDay = st.day; }
      const k = tag + '|' + r; const hit = G._cbCache.get(k); if (hit != null) return hit;
      let ok = false;
      for (let i = 0; i < NP && !ok; i++) if (st.prov[i].ab && G.baseOk(tag, i) && G.regionKm(i, r) <= 900) ok = true;
      G._cbCache.set(k, ok); return ok;
    }
    const ok = (rr) => regions[rr].nodes.some((n) => n < NP && (st.prov[n].c === tag || (G.friendly(tag, st.prov[n].c) && !G.atWar(tag, st.prov[n].c))));
    if (ok(r)) return true;
    return regions[r].adj.some(ok);
  };
  G.initWings = (c) => {
    c.wings = [];
    const home = G.homeRegion(c); if (home < 0) return;
    for (const e of g.PLANES) while ((c.stock[e] || 0) >= 30) G.newWing(c, e, home, e === 'bom' ? 'str' : G.WING_TYPES[e].m[0]);
  };

  // ---------- Günlük hava savaşı ----------
  // G.airR: bölge -> { tag: {fig, int, cas, str, nav} } güç toplamları; G._sup önbelleği
  G.airTick = () => {
    const st = G.st;
    const R = new Map();
    G.ensureAirbases(); G._abLoad = null;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.wings) continue;
      c.bombed = 0;
      for (const w of c.wings) {
        if (!G.baseOk(c.tag, w.b)) G.fixBase(c, w);
        // takviye: stoktan
        if (w.n < w.max && (c.stock[w.e] || 0) >= 1) { const k = Math.min(w.max - w.n, c.stock[w.e], 4); w.q = G.blendVec(G.wingQ(c, w), G.stockVec(c, w.e), k / (w.n + k)); w.n += k; c.stock[w.e] -= k; }
        if (w.n < 1 || w.r < 0) continue;
        if (!c.enemies.length && w.mis !== 'sup') continue;
        const eff = G.wingEff(c, w); w._eff = eff;
        if (eff <= 0) continue; // menzil dışı ya da üssüz
        let m = R.get(w.r); if (!m) R.set(w.r, (m = {}));
        const a = m[c.tag] || (m[c.tag] = { sup: 0, int: 0, cas: 0, str: 0, nav: 0, wings: [] });
        a[w.mis] += G.wingPower(c, w) * eff; a.wings.push(w);
      }
    }
    G.airR = R; G._sup = new Map();
    // çarpışmalar ve görev etkileri
    for (const [r, m] of R) {
      const tags = Object.keys(m);
      for (const t of tags) {
        const c = st.C[t]; if (!c.enemies.length) continue;
        let ownF = 0, enF = 0, enInt = 0;
        for (const u of tags) {
          const x = m[u];
          if (u === t || G.sameFaction(u, t) || G.coBelligerent(u, t)) ownF += x.sup + x.int * 0.6;
          else if (G.atWar(u, t)) { enF += x.sup + x.int * 0.6; enInt += x.int; }
        }
        if (enF <= 0) continue;
        const press = enF / (enF + ownF + 1);
        for (const w of m[t].wings) {
          const k = w.mis === 'sup' || w.mis === 'int' ? 0.01 * press : 0.016 * (enF + enInt) / (enF + enInt + ownF * 1.3 + 1);
          const q = G.wingQ(c, w);
          const lost = w.n * (k / Math.max(0.5, q.df) + (1 - q.rel) * 0.002) * (0.7 + G.rand() * 0.6);
          w.n = Math.max(0, w.n - lost);
          c.dead += lost * 0.002;
        }
      }
    }
    // stratejik bombardıman ve deniz saldırısı
    for (const [r, m] of R) for (const [t, x] of Object.entries(m)) {
      const c = st.C[t]; if (!c.enemies.length) continue;
      const sup = G.airSup(t, r);
      if (x.str > 0) {
        const pow = x.str * (0.4 + 0.6 * sup);
        const hit = new Map();
        for (const n of regions[r].nodes) { if (n >= NP) continue; const pr = st.prov[n]; if (!G.atWar(t, pr.c) || pr.civ + pr.mil + pr.dock + (pr.ab || 0) === 0) continue; hit.set(pr.o, (hit.get(pr.o) || 0) + pr.civ + pr.mil + pr.dock); }
        for (const [o, fac] of hit) {
          const oc = st.C[o]; if (!oc) continue;
          oc.bombed = Math.min(0.3, (oc.bombed || 0) + 0.0006 * pow * Math.min(1, fac / 10) / Math.max(1, oc.sum.civ + oc.sum.mil) * 10);
          oc.wsX = (oc.wsX || 0) - 0.00004 * Math.min(1, pow / 300);
          // hava üssü bombardımanı
          if (G.rand() < 0.003 * Math.min(1, pow / 300)) { const ns = regions[r].nodes.filter((n) => n < NP && st.prov[n].o === o && st.prov[n].ab > 0); if (ns.length) { const pr = st.prov[ns[Math.floor(G.rand() * ns.length)]]; pr.ab--; G._abLoad = null; } }
          // ara sıra fabrika hasarı
          if (G.rand() < 0.002 * Math.min(1, pow / 400)) { const ns = regions[r].nodes.filter((n) => n < NP && st.prov[n].o === o && st.prov[n].mil + st.prov[n].civ > 0); if (ns.length) { const pr = st.prov[ns[Math.floor(G.rand() * ns.length)]]; if (pr.mil > 0) pr.mil--; else pr.civ--; G.needSummary = 1; if (o === st.player) G.log(`Düşman bombardımanı ${G.cname(o)} topraklarında bir fabrikayı yıktı.`, [o], 'bad'); } }
        }
      }
      if (x.nav > 0) {
        const pow = x.nav * (0.4 + 0.6 * sup);
        for (const e of c.enemies) for (const f of st.C[e].fleets || []) {
          if (f.loc < NP || regionOf[f.loc] !== r) continue;
          const aa = 1 + (f.sh.cv || 0) * 0.5 + (f.sh.cr || 0) * 0.15;
          const k = Math.min(0.03, 0.00004 * pow / aa);
          for (const sk of g.SHIPS) { f.sh[sk] = Math.max(0, (f.sh[sk] || 0) * (1 - k * (sk === 'bb' ? 0.6 : 1))); if (f.sh[sk] < 0.3) f.sh[sk] = 0; }
        }
        // konvoy avı
        for (const e of c.enemies) { const ec = st.C[e]; if ((ec.ships.conv || 0) > 0 && regions[r].nodes.some((n) => n >= NP && SEAS[n - NP].p.some((p) => st.prov[p].c === e))) ec.ships.conv = Math.max(0, ec.ships.conv * (1 - 0.00003 * pow)); }
      }
    }
  };
  // Hava üstünlüğü: 0..1 (tarafın avcı gücü / toplam). Hiç uçak yoksa 0.5
  G.airSup = (tag, r) => {
    if (r == null || r < 0 || !G.airR) return 0.5;
    const key = tag + '|' + r; const hit = G._sup && G._sup.get(key); if (hit != null) return hit;
    const m = G.airR.get(r); let own = 0, en = 0;
    if (m) for (const [u, x] of Object.entries(m)) {
      const f = x.sup + x.int * 0.6 + x.cas * 0.1;
      if (u === tag || G.sameFaction(u, tag) || G.coBelligerent(u, tag)) own += f; else if (G.atWar(u, tag)) en += f;
    }
    const v = own + en < 1 ? 0.5 : own / (own + en);
    if (G._sup) G._sup.set(key, v);
    return v;
  };
  // Kara muharebesi çarpanı: hava üstünlüğü ve yakın hava desteği
  G.airCombatMod = (tag, n) => {
    const r = regionOf[n]; if (r < 0) return 1;
    const sup = G.airSup(tag, r);
    let cas = 0;
    const m = G.airR && G.airR.get(r);
    if (m) for (const [u, x] of Object.entries(m)) if (u === tag || G.sameFaction(u, tag)) cas += x.cas;
    const casB = 0.22 * cas / (cas + 400) * (0.3 + 0.7 * sup);
    return 1 + 0.2 * (sup - 0.5) + casB;
  };

  // ---------- Yapay zekâ ----------
  G.aiAir = (c) => {
    const st = G.st;
    if (!c.wings) G.initWings(c);
    // stoktaki uçaklardan yeni kanat
    for (const e of g.PLANES) while ((c.stock[e] || 0) >= 60) if (!G.newWing(c, e, G.homeRegion(c), e === 'bom' ? 'str' : G.WING_TYPES[e].m[0])) break;
    const home = G.homeRegion(c);
    if (!c.enemies.length) {
      for (const w of c.wings) {
        if (w.manual) continue;
        w.r = home; w.mis = w.e === 'bom' ? 'str' : G.WING_TYPES[w.e].m[0];
        if (!G.inRange(c, w, w.r) || !G.baseOk(c.tag, w.b) || G.baseLoad(w.b) > G.baseCap(w.b)) {
          let b = G.bestBaseFor(c, w, w.r);
          if (b < 0 || G.baseCap(b) - G.baseLoad(b) + (w.b === b ? w.max : 0) < w.max) { const f = G.freeBaseNear(c, w, c.cap); if (f >= 0) { b = f; w.r = regionOf[f]; } }
          if (b >= 0) G.setBase(w, b);
        }
      }
      return;
    }
    // cephe bölgeleri: düşmana komşu dost eyaletlerin bölgeleri, muharebe sayısıyla ağırlıklı
    const score = new Map();
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag && !(G.friendly(c.tag, pr.c) && !G.atWar(c.tag, pr.c))) continue;
      if (!P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c))) continue;
      const r = regionOf[i]; score.set(r, (score.get(r) || 0) + 1 + P[i].vp * 0.05);
    }
    for (const b of G.battles || []) if (b.att === c.tag || b.def === c.tag) { const r = regionOf[b.n]; score.set(r, (score.get(r) || 0) + 4); }
    const fronts = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r).filter((r) => G.canBase(c.tag, r));
    // bombardıman hedefi: düşman fabrikalarının en yoğun olduğu, menzildeki bölge
    const fac = new Map();
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (!G.atWar(c.tag, pr.c)) continue; const v = pr.civ + pr.mil; if (v) { const r = regionOf[i]; fac.set(r, (fac.get(r) || 0) + v); } }
    const bombT = [...fac.entries()].filter(([r]) => G.canBase(c.tag, r)).sort((a, b) => b[1] - a[1]).map(([r]) => r);
    // düşman filosu olan yakın deniz bölgeleri
    const navT = [];
    for (const e of c.enemies) for (const f of st.C[e].fleets || []) { const r = regionOf[f.loc]; if (r >= 0 && G.canBase(c.tag, r) && !navT.includes(r)) navT.push(r); }
    let fi = 0, ci = 0;
    const r0 = new Map(c.wings.map((w) => [w.id, w.r]));
    for (const w of c.wings) {
      if (w.manual) continue;
      if (w.e === 'fig') { w.r = fronts.length ? fronts[fi++ % Math.min(fronts.length, Math.max(1, Math.ceil(c.wings.filter((x) => x.e === 'fig').length / 2)))] : home; w.mis = 'sup'; }
      else if (w.e === 'cas') { if (navT.length && ci % 4 === 3) { w.r = navT[0]; w.mis = 'nav'; } else { w.r = fronts.length ? fronts[ci % Math.min(fronts.length, 3)] : home; w.mis = 'cas'; } ci++; }
      else { const bt = bombT.find((r) => G.bestBaseFor(c, w, r) >= 0); if (bt != null) { w.r = bt; w.mis = 'str'; } else if (navT.length) { w.r = navT[0]; w.mis = 'nav'; } else { w.r = fronts[0] ?? home; w.mis = 'cas'; } }
      // üs: hedef menzilde değilse uygun üsse taşın; yoksa menzildeki en yakın cephe bölgesi
      if (w.r >= 0 && (r0.get(w.id) !== w.r || !G.inRange(c, w, w.r) || !G.baseOk(c.tag, w.b))) {
        let b = G.bestBaseFor(c, w, w.r);
        if (b < 0) { const alt = fronts.find((r) => G.bestBaseFor(c, w, r) >= 0); if (alt != null) { w.r = alt; if (w.e !== 'fig') w.mis = G.WING_TYPES[w.e].m.includes('cas') ? 'cas' : w.mis; b = G.bestBaseFor(c, w, alt); } }
        if (b >= 0) G.setBase(w, b);
        else { w.r = home; const hb = G.bestBaseFor(c, w, home); if (hb >= 0) G.setBase(w, hb); }
      }
      // kapasite aşımı: aynı bölgeye menzilli boş üs varsa taşın
      else if (w.b >= 0 && G.baseLoad(w.b) > G.baseCap(w.b)) { const b = G.bestBaseFor(c, w, w.r); if (b >= 0 && b !== w.b && G.baseCap(b) - G.baseLoad(b) >= w.max) G.setBase(w, b); }
    }
  };
})(window);
