// Nehirler: komşu iller arasındaki nehir kenarları (il merkezlerini birleştiren doğru parçası bir nehri keserse),
// nehir geçişi cezaları (saldırı ve hareket). Veri js/data/rivers.js içinde; hesap ilk ihtiyaçta bir kez yapılır, kayda yazılmaz.
(function (g) {
  const G = g.G;
  const { P, NP, M } = G;

  // Harita izdüşümü (Miller, tools/build-map.mjs ile aynı): boylam/enlem -> dünya koordinatı
  const millerY = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));
  G.projLL = (lon, lat) => {
    const rel = lon - M.LON0, sh = rel < -180 ? 360 : rel >= 180 ? -360 : 0;
    return [(lon - M.LON0 + sh + 180) / 360 * M.W, M.Y_TOP - M.K * millerY(Math.max(-56, Math.min(80, lat)))];
  };

  // HOI4 değerleri: küçük nehir saldırı -%25, büyük nehir -%50; hareket süresi +%10 / +%25
  G.RIVER_ATK = [0, 0.25, 0.5];
  G.RIVER_MOVE = [1, 1.1, 1.25]; // hareket HOI4'ten hafif: Doğu Cephesi dengesi için (benzetimle ayarlandı)
  G.RIVER_DEF = 0.2; // savunana ek: saldırıdaki ortalama cezanın %20'si (küçük +%5, büyük +%10)
  G.RIVER_ENG = 0.4; // istihkâm desteği cezayı %40 azaltır
  G.RIVER_MAR = 0.5; // tümü deniz piyadesi olan tümende ceza yarıya iner
  G.RIVER_BRIDGE = 0.4; // köprübaşı: aynı hedefe 8 gün saldırınca ceza en çok %40 azalır

  let paths = null, edge = null; // paths: [{n, big, pts: Float32Array}], edge[i]: [[j, düzey, nehir adı], ...] | null
  const segCross = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy;
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-9) return false; // paralel
    const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den, u = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  function build() {
    paths = (g.RIVERS || []).map((r) => {
      const pts = new Float32Array(r.p.length);
      for (let k = 0; k < r.p.length; k += 2) { const [x, y] = G.projLL(r.p[k], r.p[k + 1]); pts[k] = x; pts[k + 1] = y; }
      return { n: r.n, big: r.big ? 1 : 0, pts };
    });
    edge = new Array(NP).fill(null);
    // nehir parçalarını kareli ızgaraya yerleştir
    const CS = 40, cells = new Map(), segs = [];
    paths.forEach((r, ri) => {
      for (let k = 0; k + 3 < r.pts.length; k += 2) {
        const s = { ax: r.pts[k], ay: r.pts[k + 1], bx: r.pts[k + 2], by: r.pts[k + 3], ri };
        if (Math.abs(s.ax - s.bx) > M.W / 2) continue; // tarih çizgisini aşan parça
        segs.push(s);
        const x0 = Math.floor(Math.min(s.ax, s.bx) / CS), x1 = Math.floor(Math.max(s.ax, s.bx) / CS), y0 = Math.floor(Math.min(s.ay, s.by) / CS), y1 = Math.floor(Math.max(s.ay, s.by) / CS);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const key = cx * 4096 + cy; let L = cells.get(key); if (!L) cells.set(key, (L = [])); L.push(s); }
      }
    });
    for (let i = 0; i < NP; i++) {
      for (const j of P[i].a) {
        if (j <= i || j >= NP) continue;
        const ax = P[i].x, ay = P[i].y, bx = P[j].x, by = P[j].y;
        if (Math.abs(ax - bx) > M.W / 2) continue;
        let best = -1;
        const x0 = Math.floor(Math.min(ax, bx) / CS), x1 = Math.floor(Math.max(ax, bx) / CS), y0 = Math.floor(Math.min(ay, by) / CS), y1 = Math.floor(Math.max(ay, by) / CS);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
          const L = cells.get(cx * 4096 + cy); if (!L) continue;
          for (const s of L) {
            if (best >= 0 && paths[best].big >= paths[s.ri].big) continue; // büyük nehir küçüğün önüne geçer
            if (segCross(ax, ay, bx, by, s.ax, s.ay, s.bx, s.by)) best = s.ri;
          }
        }
        if (best < 0) continue;
        const lv = paths[best].big ? 2 : 1, nm = paths[best].n;
        (edge[i] || (edge[i] = [])).push([j, lv, nm]);
        (edge[j] || (edge[j] = [])).push([i, lv, nm]);
      }
    }
  }
  G.riverPaths = () => { if (!paths) build(); return paths; };
  // iki komşu il arasındaki geçiş: 0 nehir yok, 1 küçük nehir, 2 büyük nehir
  G.riverEdge = (a, b) => {
    if (a >= NP || b >= NP) return 0;
    if (!edge) build();
    const L = edge[a]; if (!L) return 0;
    for (let k = 0; k < L.length; k++) if (L[k][0] === b) return L[k][1];
    return 0;
  };
  // ilin nehir kenarları: [{to, big, n}]
  G.riversOf = (i) => {
    if (i >= NP) return [];
    if (!edge) build();
    return (edge[i] || []).map(([to, lv, n]) => ({ to, big: lv === 2, n }));
  };
  // saldıran birimin nehir cezası (0..0,5): kenara göre; istihkâm, deniz piyadesi ve köprübaşı azaltır
  G.riverPen = (u, s, n) => {
    const lv = u.loc < NP ? G.riverEdge(u.loc, n) : 0;
    if (!lv) return 0;
    let p = G.RIVER_ATK[lv];
    if (s.t.eng) p *= 1 - G.RIVER_ENG;
    if (s.t.amph) p *= 1 - G.RIVER_MAR * s.t.amph;
    p *= 1 - G.RIVER_BRIDGE * Math.min(1, (u.bt === n ? u.bd || 0 : 0) / 8);
    return p;
  };
})(window);
