// Lojistik: altyapı, ikmal merkezleri ve ikmal akışı, mevsim ve hava durumu (HOI4 tarzı).
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  // ---------- Altyapı (1-5) ----------
  const TE_INF = [3, 2, 2, 1, 1, 1, 1, 4]; // ova, orman, tepe, dağ, çöl, bataklık, cangıl, şehir
  G.initInfra = () => {
    const st = G.st;
    const dens = {};
    for (const tag of Object.keys(g.COUNTRY_DEFS)) {
      const d = g.COUNTRY_DEFS[tag]; const c = st.C[tag];
      let n = 0; for (let i = 0; i < NP; i++) if (st.prov[i].o === tag) n++;
      dens[tag] = n ? (d.civ + d.mil) / n : 0;
      if (c) c._dens = dens[tag];
    }
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i], p = P[i], c = st.C[pr.o];
      let v = TE_INF[p.te] ?? 2;
      const dn = dens[pr.o] || 0;
      v += dn > 1.4 ? 2 : dn > 0.55 ? 1 : dn < 0.12 ? -1 : 0;
      if (p.vp >= 10) v += 1;
      if (c && c.cap >= 0 && G.dist(i, c.cap) > 420) v -= 1; // sömürge ve uzak bölgeler
      pr.inf = Math.max(1, Math.min(5, v));
    }
  };
  G.ensureInfra = () => { if (G.st.prov[0].inf == null) G.initInfra(); };

  // ---------- Mevsim ve hava ----------
  // Kuzey yarımküre soğukluk eğrisi (Ocak en soğuk)
  const COLD = [1, 0.9, 0.55, 0.15, 0, 0, 0, 0, 0.05, 0.3, 0.65, 0.95];
  G.wx = { snow: new Float32Array(NP), mud: new Float32Array(NP), month: -1 };
  G.WINTER_READY = new Set(['SOV', 'FIN', 'NOR', 'SWE', 'CAN', 'EST', 'LAT', 'LIT', 'MON']);
  G.updateWeather = (force) => {
    const m = G.dateOf(G.st.day).getUTCMonth();
    if (!force && G.wx.month === m) return false;
    G.wx.month = m;
    for (let i = 0; i < NP; i++) {
      const p = P[i];
      const south = p.lat < 0;
      const cold = COLD[south ? (m + 6) % 12 : m];
      // karasal iklim (Avrasya içleri) daha soğuk, Atlantik kıyıları ılık
      let lat = Math.abs(p.lat);
      if (!south && p.lon > 20 && p.lon < 140 && lat > 38) lat += 6;
      if (!south && p.lon < 8 && p.lon > -12) lat -= 5;
      if (!south && p.lon < -50 && p.lon > -110 && lat > 35) lat += 3;
      let snow = Math.max(0, Math.min(1, (lat - 42) / 20)) * cold;
      if (p.te === 3 && cold > 0.3) snow = Math.min(1, snow + 0.3);
      if (snow < 0.12) snow = 0;
      let mud = 0;
      // rasputitsa: Doğu Avrupa ve Rusya, ilkbahar ve sonbahar
      if (!south && p.lat > 44 && p.lat < 64 && p.lon > 15 && p.lon < 65 && (m === 3 || m === 10 || (m === 2 && snow < 0.4) || m === 9)) mud = m === 3 || m === 10 ? 0.8 : 0.45;
      // muson: Güney ve Güneydoğu Asya
      if (p.lat > 5 && p.lat < 28 && p.lon > 70 && p.lon < 122 && m >= 5 && m <= 8) mud = Math.max(mud, 0.6);
      if (snow > 0.45) mud = 0;
      G.wx.snow[i] = snow; G.wx.mud[i] = mud;
    }
    G.wxDirty = 1;
    return true;
  };
  G.weatherName = (i) => {
    const s = G.wx.snow[i], m = G.wx.mud[i];
    if (s > 0.7) return 'Tipi'; if (s > 0.35) return 'Kar'; if (s > 0) return 'Soğuk';
    if (m > 0.55) return 'Çamur'; if (m > 0) return P[i].lat > 5 && P[i].lat < 28 && P[i].lon > 70 ? 'Muson' : 'Yağmur';
    return 'Açık';
  };
  // Hareket süresi çarpanı (hava + altyapı)
  G.moveMul = (n) => {
    if (n >= NP) return 1;
    const inf = G.st.prov[n].inf || 2;
    return (1 + 1.0 * G.wx.snow[n] + 1.0 * G.wx.mud[n]) * (1.12 - 0.06 * inf);
  };
  // Saldırı çarpanı (hava)
  G.wxAtk = (n) => (n >= NP ? 1 : 1 - 0.45 * G.wx.snow[n] - 0.3 * G.wx.mud[n]);

  // ---------- İkmal ----------
  G.supplyUse = (u) => {
    const t = G.T(u.t, u.u);
    if (t._su == null) t._su = Math.max(0.5, (t.w / 15) * (1 + 0.5 * t.mob + 0.9 * (t.tanks / Math.max(1, t.nb))));
    return t._su;
  };
  // Heap tabanlı çok kaynaklı Dijkstra: anahtar = maliyet - ln(kapasite)/ln(1/ZAYIF)
  const DECAY = 0.86, LND = Math.log(1 / DECAY);
  const key = new Float64Array(NP);
  function heapPush(h, k, n) { h.push([k, n]); let i = h.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (h[j][0] <= h[i][0]) break; [h[i], h[j]] = [h[j], h[i]]; i = j; } }
  function heapPop(h) { const top = h[0]; const last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; } } return top; }

  G.supAvail = {}; G.supRatio = {}; G.hubs = {};
  G.computeSupplyFor = (c) => {
    const st = G.st, tag = c.tag;
    const ctrl = (i) => { const pc = st.prov[i].c; return pc === tag || (G.friendly(tag, pc) && !G.atWar(tag, pc)); };
    // başkente kara bağlantısı
    const conn = new Uint8Array(NP);
    if (c.cap >= 0 && st.prov[c.cap].c === tag) {
      const q = [c.cap]; conn[c.cap] = 1;
      for (let k = 0; k < q.length; k++) for (const j of P[q[k]].a) if (!conn[j] && ctrl(j)) { conn[j] = 1; q.push(j); }
    }
    // ikmal merkezleri: başkent ve büyük şehirler (müttefik merkezleri de paylaşılır)
    const hubs = [];
    const convR = (() => { const need = G.convoyNeed ? G.convoyNeed(tag) : 0; return need > 0 ? Math.min(1, (c.ships.conv || 0) / need) : 1; })();
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (!ctrl(i)) continue;
      const own = pr.c === tag;
      let cap = 0;
      if (own && i === c.cap) cap = 60;
      else if (P[i].vp >= 5 && pr.inf >= 2) cap = 6 + Math.min(12, P[i].vp / 2) + 2 * pr.inf;
      else continue;
      if (!own) cap *= 0.6;
      else if (pr.core !== tag) cap *= 0.5; // işgal edilen şehir: demiryolu onarımı ve direniş
      if (own && !conn[i]) {
        // anakaradan kopuk: yalnızca limanla, konvoy ve deniz üstünlüğüne bağlı
        if (P[i].c && P[i].s.length) { const sup = G.navalSupremacy ? G.navalSupremacy(tag, NP + P[i].s[0]) : 1; cap *= 0.55 * convR * (sup > 0.4 ? 1 : 0.4); }
        else cap *= 0.15;
      }
      cap *= 1 + (c.mods.supply || 0);
      if (cap > 0.3) hubs.push([i, cap]);
    }
    G.hubs[tag] = hubs;
    // akış
    const h = [];
    for (let i = 0; i < NP; i++) key[i] = Infinity;
    for (const [i, cap] of hubs) { const k = -Math.log(cap) / LND; if (k < key[i]) { key[i] = k; heapPush(h, k, i); } }
    while (h.length) {
      const [k, n] = heapPop(h);
      if (k > key[n]) continue;
      for (const j of P[n].a) {
        if (!ctrl(j)) continue;
        const pr = st.prov[j];
        const step = g.TERRAIN[P[j].te].move * (1.45 - 0.13 * (pr.inf || 2)) * (1 + 0.6 * G.wx.snow[j] + 0.6 * G.wx.mud[j]);
        const nk = k + step;
        if (nk < key[j]) { key[j] = nk; heapPush(h, nk, j); }
      }
    }
    const avail = G.supAvail[tag] || (G.supAvail[tag] = new Float32Array(NP));
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      const flow = key[i] === Infinity ? 0 : Math.exp(-key[i] * LND);
      const local = (pr.core === tag && pr.c === tag ? 1.0 * (pr.inf || 2) + 3 : 0.5 * (pr.inf || 2));
      avail[i] = (flow + local) * (1 - 0.35 * G.wx.snow[i] - 0.3 * G.wx.mud[i]);
    }
    // talep ve oran
    const dem = new Float32Array(NP);
    for (const u of st.units) if (u.t === tag && u.loc < NP) dem[u.loc] += G.supplyUse(u);
    const ratio = G.supRatio[tag] || (G.supRatio[tag] = new Float32Array(NP));
    for (let i = 0; i < NP; i++) ratio[i] = dem[i] > 0 ? Math.min(1, avail[i] / dem[i]) : 1;
  };
  G.computeSupplyAll = () => {
    const st = G.st;
    G.ensureInfra();
    for (const c of Object.values(st.C)) {
      if (!c.alive) { delete G.supRatio[c.tag]; continue; }
      if (!c.enemies.length && c.tag !== st.player) { delete G.supRatio[c.tag]; continue; }
      G.computeSupplyFor(c);
    }
    G.supTick = (G.supTick || 0) + 1;
  };
  G.supplyRatio = (u) => { if (u.loc >= NP) return 1; const r = G.supRatio[u.t]; return r ? r[u.loc] : 1; };
  // Muharebe ve toparlanma çarpanı
  G.supplyMul = (u) => {
    const r = G.supplyRatio(u);
    if (r >= 0.999) return 1;
    const s = u._s || G.unitStats(u);
    const red = Math.min(0.7, (s.t.sup || 0) + (s.gb ? s.gb.sup : 0) + (G.st.C[u.t].mods.supply || 0));
    return Math.max(0.4, 1 - (1 - r) * 0.5 * (1 - red));
  };
  // Günlük yıpranma: ikmalsizlik ve kış
  G.attrition = (u) => {
    if (u.loc >= NP) return;
    const st = G.st;
    const r = G.supplyRatio(u);
    let loss = 0;
    if (r < 0.6) loss += 0.0025 * (0.6 - r) / 0.6;
    const sn = G.wx.snow[u.loc];
    if (sn > 0.5) {
      const pr = st.prov[u.loc];
      const home = pr.core === u.t;
      const s = u._s || G.unitStats(u);
      const adapt = G.WINTER_READY.has(u.t) ? 0.25 : 1;
      const genW = s.gb && s.gb.winter ? 0.5 : 1;
      if (!home) loss += 0.0016 * sn * adapt * genW * (r < 0.8 ? 1.6 : 1);
    }
    if (loss > 0) { u.str = Math.max(0.05, u.str - loss); st.C[u.t].dead += loss * G.T(u.t, u.u).mp * 0.4; }
  };
})(window);
