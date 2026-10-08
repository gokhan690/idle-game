// Hava üsleri (HOI4 tarzı): eyalet başına 0-10 seviye, seviye başına 100 uçak kapasitesi.
// Kanatlar bir üste konuşlanır; yalnızca uçağın menzili içindeki hava bölgelerinde görev yapar.
(function (g) {
  const G = g.G;
  const { P, NP, SEAS } = G;

  g.BUILDINGS.ab = { n: 'Hava Üssü', cost: 2000, s: 'Hava üssü', max: 10 };
  G.LEVEL_B = new Set(['fort', 'inf', 'ab', 'rail', 'hub']); // fabrika yuvası kullanmayan, seviyeli yapılar
  G.AB_CAP = 100; // seviye başına uçak
  G.RANGE_KM = 700; // menzil değeri 1 = 700 km

  // ---------- Başlangıç üsleri ----------
  G.initAirbases = () => {
    const st = G.st;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i], c = st.C[pr.o];
      let v = 0;
      if (P[i].vp >= 10) v = 2; else if (P[i].vp >= 5 && (pr.inf || 2) >= 2) v = 1; else if (c && c.major && P[i].vp >= 3 && G.dist(i, c.cap) < 420) v = 1;
      if (c && c.major && v) v += 1;
      if (c && c.cap === i) v = Math.max(v, c.major ? 6 : 3);
      pr.ab = v;
    }
  };
  G.ensureAirbases = () => { if (G.st.prov[0].ab == null) G.initAirbases(); };

  // ---------- Mesafe ----------
  const RAD = Math.PI / 180;
  const latOf = (n) => (n < NP ? P[n].lat : SEAS[n - NP].lat), lonOf = (n) => (n < NP ? P[n].lon : SEAS[n - NP].lon);
  G.km = (a, b) => {
    const la1 = latOf(a) * RAD, la2 = latOf(b) * RAD, dl = (lonOf(b) - lonOf(a)) * RAD;
    const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dl / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  // üsten bölgeye en kısa mesafe (bölgenin en yakın eyaleti/deniz alanı)
  const rdCache = new Map();
  G.regionKm = (b, r) => {
    const k = b * 4096 + r; const hit = rdCache.get(k); if (hit != null) return hit;
    let d = Infinity; for (const n of G.AIR.regions[r].nodes) d = Math.min(d, G.km(b, n));
    if (rdCache.size > 200000) rdCache.clear();
    rdCache.set(k, d); return d;
  };
  G.wingRangeKm = (c, w) => G.RANGE_KM * (G.wingQ(c, w).rg || 1);

  // ---------- Üsler ----------
  // Kullanılabilir üs: kendi ya da müttefik kontrolünde, savaşta olmadığı ülkenin
  G.baseOk = (tag, b) => {
    if (b == null || b < 0 || b >= NP) return false;
    const pr = G.st.prov[b];
    return (pr.ab || 0) > 0 && (pr.c === tag || (G.sameFaction(tag, pr.c) && !G.atWar(tag, pr.c)));
  };
  // üs doluluğu önbelleği (kanat atamalarında geçersiz kılınır)
  G._abLoad = null;
  G.baseLoad = (b) => {
    if (!G._abLoad) {
      G._abLoad = new Map();
      for (const c of Object.values(G.st.C)) if (c.alive && c.wings) for (const w of c.wings) if (w.b != null && w.b >= 0) G._abLoad.set(w.b, (G._abLoad.get(w.b) || 0) + w.max);
    }
    return G._abLoad.get(b) || 0;
  };
  G.setBase = (w, b) => { if (w.b !== b) { w.b = b; G._abLoad = null; } };
  G.baseCap = (b) => (G.st.prov[b].ab || 0) * G.AB_CAP;
  G.inRange = (c, w, r) => w.b != null && w.b >= 0 && G.regionKm(w.b, r) <= G.wingRangeKm(c, w);
  // Bölgeye en uygun üs: menzilde, boş kapasitesi olan, bölgeye en yakın
  G.bestBaseFor = (c, w, r, extra) => {
    const st = G.st, rng = G.wingRangeKm(c, w);
    let best = -1, bs = Infinity;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (!pr.ab || !G.baseOk(c.tag, i)) continue;
      const d = r >= 0 ? G.regionKm(i, r) : G.km(i, c.cap);
      if (d > rng) continue;
      const free = G.baseCap(i) - G.baseLoad(i) + (w.b === i ? w.max : 0) + (extra && extra.get(i) || 0);
      // cephe hattındaki üsler biraz geride tercih edilir; dolu üsler cezalı
      const front = P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) ? 250 : 0;
      const sc = d + front + (free >= w.max ? 0 : 2500) - pr.ab * 10;
      if (sc < bs) { bs = sc; best = i; }
    }
    return best;
  };
  // Boş kapasiteli en yakın üs (barışta kanatları dağıtmak için; menzil şartı yok)
  G.freeBaseNear = (c, w, from) => {
    let best = -1, bd = Infinity;
    for (let i = 0; i < NP; i++) {
      if (!G.st.prov[i].ab || G.st.prov[i].c !== c.tag) continue;
      if (G.baseCap(i) - G.baseLoad(i) + (w.b === i ? w.max : 0) < w.max) continue;
      const d = from >= 0 ? G.km(i, from) : 0; if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  // Yuvasız ya da üssünü kaybeden kanadı en yakın üsse taşı
  G.fixBase = (c, w) => {
    if (G.baseOk(c.tag, w.b)) return true;
    const lost = w.b != null && w.b >= 0;
    let b = w.r >= 0 ? G.bestBaseFor(c, w, w.r) : -1;
    if (b < 0) b = G.bestBaseFor(c, w, -1);
    if (b < 0) { let bd = Infinity; for (let i = 0; i < NP; i++) if (G.baseOk(c.tag, i)) { const d = c.cap >= 0 ? G.km(i, c.cap) : 0; if (d < bd) { bd = d; b = i; } } }
    G.setBase(w, b);
    if (lost && b >= 0 && c.tag === G.st.player) G.log(`${G.AIR.regions[G.regionOf(b)].n}: üssünü kaybeden hava kanadı ${G.pname(b)} üssüne çekildi.`, [c.tag], 'warn');
    return b >= 0;
  };
  // Görev etkinliği: menzil dışı 0; kapasite aşımında düşer
  G.wingEff = (c, w) => {
    if (!G.baseOk(c.tag, w.b) || w.r < 0) return 0;
    if (!G.inRange(c, w, w.r)) return 0;
    const cap = G.baseCap(w.b), load = G.baseLoad(w.b);
    return (load > cap ? Math.max(0.3, cap / load) : 1) * G.fuelAirMul(c);
  };
})(window);
