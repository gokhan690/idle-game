// Harita çizimi: Path2D ile vektör eyaletler, sınırlar, birlik sayaçları, muharebeler.
(function (g) {
  const G = g.G;
  const { M, P, SEAS, NP } = G;
  const Q = M.Q;

  const R = (G.R = {
    cv: null, ctx: null, dpr: 1, w: 0, h: 0,
    cam: { x: M.W * 0.53, y: M.H * 0.3, z: 1 },
    mode: 'pol', // pol | terrain | ind | fac | sup
    sel: { prov: -1, units: new Set() },
    dirty: 1, mapDirty: 1, t: 0, box: null, hover: -1,
  });

  // ---------- Çokgen kod çözme ----------
  const decode = (arr) => { const out = new Float32Array(arr.length); let x = 0, y = 0; for (let i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out[i] = x / Q; out[i + 1] = y / Q; } return out; };
  // doğal sınırlar: uzun düz kenarlar belirlenimli orta nokta kaydırmasıyla kıvrılır. Kenarın uçları kanonik
  // sırayla (x, sonra y) ele alınır ve tohum uçların tamsayı koordinatlarından üretilir; böylece aynı kenar iki
  // komşu eyalette ve sınır listesinde birebir aynı eğriyi verir (dolgu, sınır ve dokunma testi uyumlu kalır).
  const WIG_MIN = 4, WIG_AMP = 0.13;
  const hh = (a, b, c, d, k) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ (d * 2654435761) ^ (k * 97531); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const wigSeg = (ax, ay, bx, by, out) => {
    const L = Math.hypot(bx - ax, by - ay); if (L < WIG_MIN) return;
    const ia = Math.round(ax * Q), ja = Math.round(ay * Q), ib = Math.round(bx * Q), jb = Math.round(by * Q);
    const sw = ia > ib || (ia === ib && ja > jb);
    const x0 = sw ? bx : ax, y0 = sw ? by : ay, x1 = sw ? ax : bx, y1 = sw ? ay : by;
    const k0 = sw ? ib : ia, l0 = sw ? jb : ja, k1 = sw ? ia : ib, l1 = sw ? ja : jb;
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L, A = WIG_AMP * L;
    const d2 = (hh(k0, l0, k1, l1, 1) - 0.5) * 2 * A, d1 = (hh(k0, l0, k1, l1, 2) - 0.5) * A, d3 = (hh(k0, l0, k1, l1, 3) - 0.5) * A;
    // kanonik yönde 3 ara nokta (t = 0.25, 0.5, 0.75); orta nokta ana sapma, yan noktalar ona göre yarım genlik
    const pts = [[0.25, (d2 * 0.5 + d1) * 0.55], [0.5, d2], [0.75, (d2 * 0.5 + d3) * 0.55]]; // köşelere yakın sapma küçük: dar köşelerde komşu kenarlar kesişmez
    if (sw) pts.reverse();
    for (const [t, d] of pts) out.push(x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d);
  };
  const wiggle = (r, closed) => {
    const n = r.length / 2, out = [];
    for (let i = 0; i < n; i++) {
      out.push(r[2 * i], r[2 * i + 1]);
      if (i < n - 1 || closed) { const j = (i + 1) % n; wigSeg(r[2 * i], r[2 * i + 1], r[2 * j], r[2 * j + 1], out); }
    }
    return Float32Array.from(out);
  };
  const provRings = P.map((p) => p.p.flat().map((r) => wiggle(decode(r), true)));
  const provPath = provRings.map((rings) => { const pa = new Path2D(); for (const r of rings) { pa.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) pa.lineTo(r[i], r[i + 1]); pa.closePath(); } return pa; });
  const borders = M.borders.map(([a, b, e]) => ({ a, b, pts: wiggle(decode(e), false) }));
  // eyalet çifti -> ortak sınır parçaları (cephe çizgileri için)
  const pairKey = (a, b) => (a < b ? a * 8192 + b : b * 8192 + a);
  const pairMap = new Map();
  for (const bd of borders) if (bd.b >= 0) { const k = pairKey(bd.a, bd.b); let L = pairMap.get(k); if (!L) pairMap.set(k, (L = [])); L.push(bd.pts); }
  function addLine(path, pts) { path.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]); }
  R.provPath = provPath;

  // ---------- Karolar: dünya TX×TY parçaya bölünür, yalnızca ekrandaki karoların yolları çizilir ----------
  // Her öğe sınır kutusunun merkezine göre bir karoya düşer; karo kutusu öğelerinin birleşimine genişler.
  const TX = 10, TY = 5, NT = TX * TY;
  const tBox = new Float64Array(NT * 4);
  for (let t = 0; t < NT; t++) { tBox[4 * t] = Infinity; tBox[4 * t + 1] = Infinity; tBox[4 * t + 2] = -Infinity; tBox[4 * t + 3] = -Infinity; }
  const ptsTile = (arrs) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const a of arrs) for (let i = 0; i < a.length; i += 2) { const x = a[i], y = a[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x0 === Infinity) return 0;
    const cx = Math.max(0, Math.min(TX - 1, Math.floor(((x0 + x1) / 2 / M.W) * TX))), cy = Math.max(0, Math.min(TY - 1, Math.floor(((y0 + y1) / 2 / M.H) * TY)));
    const t = cx + TX * cy, b = 4 * t;
    if (x0 < tBox[b]) tBox[b] = x0; if (y0 < tBox[b + 1]) tBox[b + 1] = y0; if (x1 > tBox[b + 2]) tBox[b + 2] = x1; if (y1 > tBox[b + 3]) tBox[b + 3] = y1;
    return t;
  };
  const provT = provRings.map((rings) => ptsTile(rings));
  for (const bd of borders) bd.t = ptsTile([bd.pts]);
  const tPaths = () => new Array(NT).fill(null);
  const tLine = (tp, t, pts) => { addLine(tp[t] || (tp[t] = new Path2D()), pts); };
  const HAS_ADD = typeof Path2D.prototype.addPath === 'function';
  // eyalet ekle: addPath yoksa eyalet listesi tutulur
  const tProv = (tp, i) => { const t = provT[i]; if (HAS_ADD) (tp[t] || (tp[t] = new Path2D())).addPath(provPath[i]); else (tp[t] || (tp[t] = [])).push(i); };
  let VIS = [];
  const tFill = (ctx, tp, rule) => { for (const t of VIS) { const p = tp[t]; if (!p) continue; if (Array.isArray(p)) { for (const i of p) ctx.fill(provPath[i], rule); } else ctx.fill(p, rule); } };
  const tStroke = (ctx, tp) => { for (const t of VIS) { const p = tp[t]; if (p) ctx.stroke(p); } };
  // kamera kopyası k için görünen karolar
  function setVis(k, pad) {
    const cam = R.cam, z = cam.z, hw = R.w / 2 / z + pad, hh = R.h / 2 / z + pad;
    const x0 = cam.x - k * M.W - hw, x1 = cam.x - k * M.W + hw, y0 = cam.y - hh, y1 = cam.y + hh;
    VIS = [];
    for (let t = 0; t < NT; t++) { const b = 4 * t; if (tBox[b] <= x1 && tBox[b + 2] >= x0 && tBox[b + 1] <= y1 && tBox[b + 3] >= y0) VIS.push(t); }
  }
  const coastPath = tPaths();
  for (const bd of borders) if (bd.b < 0) tLine(coastPath, bd.t, bd.pts);
  const seaPath = tPaths();
  for (const sl of M.seaLines) { const d = decode(sl); tLine(seaPath, ptsTile([d]), d); }

  // ---------- Renk yardımcıları ----------
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (h, k, t) => { const a = hexRgb(h), b = hexRgb(k); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; };
  R.ccolor = (tag) => (g.COUNTRY_DEFS[tag] ? g.COUNTRY_DEFS[tag].c : '#777777');
  R.mix = mix;

  // ---------- Grup yolları (sahiplik değişince yeniden) ----------
  let fillGroups = new Map(), occGroups = new Map(), countryBorder = null, provBorder = null, regionBorder = null, labels = [];
  function rebuild() {
    const st = G.st;
    fillGroups = new Map(); occGroups = new Map();
    const keyOf = (i) => {
      const pr = st.prov[i];
      if (R.mode === 'peace') { const cf = st.conf; if (cf && cf.sOf[i] != null) { const o = cf.own[i]; return o ? 'pk:' + o.t : 'pu:' + cf.L; } return 'po:' + pr.c; }
      if (R.mode === 'terrain') return 'te' + P[i].te;
      if (R.mode === 'ind') { const v = pr.civ + pr.mil + pr.dock; return 'ind' + Math.min(6, Math.ceil(v / 2)); }
      if (R.mode === 'fac') { const f = st.C[pr.c]?.fac; return f ? 'fac:' + f : 'nofac:' + pr.c; }
      if (R.mode === 'air') {
        const r = G.regionOf(i), pl = st.player;
        const m = G.airR && G.airR.get(r);
        const contested = m && Object.keys(m).some((t) => t === pl || G.sameFaction(t, pl)) && Object.keys(m).some((t) => G.atWar(t, pl));
        if (contested) { const v = G.airSup(pl, r); return 'airs' + Math.min(4, Math.floor(v * 5)); }
        return 'airn' + (r % 6);
      }
      if (R.mode === 'sea') return 'nosup:' + pr.c;
      if (R.mode === 'res') { const o = P[i].oil || 0, s = P[i].st || 0; return o >= s && o > 0 ? 'roil' + Math.min(3, Math.ceil(o / 8)) : s > 0 ? 'rst' + Math.min(3, Math.ceil(s / 8)) : 'nosup:' + pr.c; }
      if (R.mode === 'ideo') return 'ideo:' + (st.C[pr.c]?.ideo || 'neu');
      if (R.mode === 'vp') { const v = P[i].vp || 0; return 'vp' + (v >= 25 ? 4 : v >= 10 ? 3 : v >= 5 ? 2 : v >= 1 ? 1 : 0); }
      if (R.mode === 'goal') { const pl = st.player; return G.atWar(pl, pr.c) ? 'gwar' : st.goals[pl + '>' + pr.c] != null ? 'ggoal' : (st.C[pl]?.just && st.C[pl].just.t === pr.c) ? 'gjust' : 'nosup:' + pr.c; }
      if (R.mode === 'occ') return pr.rs == null ? 'nooc:' + pr.c : 'occ' + Math.min(5, Math.floor(pr.rs * 7));
      if (R.mode === 'sup') {
        const pl = st.player, av = G.supAvail[pl];
        if (!av || !(pr.c === pl || (G.friendly(pl, pr.c) && !G.atWar(pl, pr.c)))) return 'nosup:' + pr.c;
        const v = av[i]; return 'sup' + (v < 0.6 ? 0 : v < 1.5 ? 1 : v < 3 ? 2 : v < 5 ? 3 : v < 8 ? 4 : 5);
      }
      return pr.c;
    };
    const grp = (m, k) => { let pa = m.get(k); if (!pa) m.set(k, (pa = tPaths())); return pa; };
    for (let i = 0; i < NP; i++) {
      tProv(grp(fillGroups, keyOf(i)), i);
      const pr = st.prov[i];
      if (R.mode === 'peace' && st.conf && st.conf.sOf[i] != null && !st.conf.own[i] && st.conf.ctrl[i] !== st.conf.L) tProv(grp(occGroups, st.conf.ctrl[i]), i);
      if (R.mode === 'pol' && pr.o !== pr.c) tProv(grp(occGroups, pr.o), i);
    }
    countryBorder = tPaths(); provBorder = tPaths(); regionBorder = tPaths();
    for (const bd of borders) {
      if (bd.b < 0) continue;
      const ca = st.prov[bd.a].c, cb = st.prov[bd.b].c;
      tLine(ca !== cb ? countryBorder : provBorder, bd.t, bd.pts);
      if (R.mode === 'air' && G.regionOf(bd.a) !== G.regionOf(bd.b)) tLine(regionBorder, bd.t, bd.pts);
      if (R.mode === 'peace' && st.conf) { const sa = st.conf.sOf[bd.a], sb = st.conf.sOf[bd.b]; if (sa !== sb && (sa != null || sb != null)) tLine(regionBorder, bd.t, bd.pts); }
    }
    buildLabels();
    buildRails();
    R.mapDirty = 0;
  }

  // demiryolları (ikmal haritasında): seviye ≥ 2 komşu eyaletler arası çizgiler, seviyeye göre kalınlık
  let railPaths = null;
  function buildRails() {
    railPaths = null;
    const st = G.st, pl = st.player;
    if (R.mode !== 'sup' || !pl || !G.railOf) return;
    const ps = [null, null, new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const ok = (i) => { const c = st.prov[i].c; return c === pl || (G.friendly(pl, c) && !G.atWar(pl, c)); };
    const lv = new Int8Array(NP);
    for (let i = 0; i < NP; i++) lv[i] = ok(i) ? Math.round(G.railOf(st.prov[i])) : 0;
    const X = G.nodeX, Y = G.nodeY, HW2 = M.W / 2;
    let n = 0;
    for (let i = 0; i < NP; i++) {
      if (lv[i] < 2) continue;
      for (const j of P[i].a) {
        if (j < i || lv[j] < 2 || Math.abs(X[i] - X[j]) > HW2) continue;
        const k = Math.min(5, lv[i], lv[j]);
        ps[k].moveTo(X[i], Y[i]); ps[k].lineTo(X[j], Y[j]); n++;
      }
    }
    if (n) railPaths = ps;
  }

  function buildLabels() {
    const st = G.st;
    labels = [];
    const seen = new Uint8Array(NP);
    for (let i = 0; i < NP; i++) {
      if (seen[i]) continue;
      const tag = st.prov[i].c;
      // bağlı bileşen
      const comp = [i]; seen[i] = 1;
      for (let k = 0; k < comp.length; k++) for (const j of P[comp[k]].a) if (!seen[j] && st.prov[j].c === tag) { seen[j] = 1; comp.push(j); }
      let area = 0, sx = 0, sy = 0, minX = Infinity, maxX = -Infinity;
      for (const j of comp) { const a = P[j].ar; area += a; sx += P[j].x * a; sy += P[j].y * a; minX = Math.min(minX, P[j].b[0]); maxX = Math.max(maxX, P[j].b[2]); }
      if (area < 900) continue;
      let cx = sx / area, cy = sy / area;
      // ağırlık merkezi bileşen dışında kalırsa en yakın eyalet merkezine çek
      let best = comp[0], bd = Infinity;
      for (const j of comp) { const d = (P[j].x - cx) ** 2 + (P[j].y - cy) ** 2; if (d < bd) { bd = d; best = j; } }
      if (bd > 900) { cx = P[best].x; cy = P[best].y; }
      const width = Math.min(maxX - minX, Math.sqrt(area) * 2.2);
      labels.push({ tag, x: cx, y: cy, w: width, area });
    }
    labels.sort((a, b) => b.area - a.area);
  }

  // ---------- Kamera ----------
  R.resize = () => {
    const cv = R.cv; const od = R.dpr; R.dpr = Math.min(R.dprCap || 3, g.devicePixelRatio || 1); // yüksek çözünürlük: 3×; yavaş cihazda 2×'e düşer
    if (od !== R.dpr) { texPat.clear(); iconCache.clear(); stripeCache.clear(); mudPat = null; wavePat = null; if (G.art && G.art.spriteClear) G.art.spriteClear(); }
    R.w = cv.clientWidth; R.h = cv.clientHeight;
    cv.width = Math.round(R.w * R.dpr); cv.height = Math.round(R.h * R.dpr);
    R.minZ = Math.max(R.w / M.W / 1.6, R.h / M.H) * 0.98;
    R.clamp(); R.dirty = 1;
  };
  R.clamp = () => {
    const c = R.cam;
    c.z = Math.max(R.minZ || 0.1, Math.min(14, c.z));
    const hh = R.h / 2 / c.z;
    // yatayda döngülü dünya
    c.x = ((c.x % M.W) + M.W) % M.W;
    c.y = Math.max(hh * 0.6, Math.min(M.H - hh * 0.6, c.y));
  };
  const HW = M.W / 2;
  R.wrapDx = (dx) => { while (dx > HW) dx -= M.W; while (dx < -HW) dx += M.W; return dx; };
  R.toWorld = (sx, sy) => ({ x: (((R.cam.x + (sx - R.w / 2) / R.cam.z) % M.W) + M.W) % M.W, y: R.cam.y + (sy - R.h / 2) / R.cam.z });
  R.toScreen = (wx, wy) => ({ x: R.wrapDx(wx - R.cam.x) * R.cam.z + R.w / 2, y: (wy - R.cam.y) * R.cam.z + R.h / 2 });
  R.zoomAt = (sx, sy, f) => {
    const before = R.toWorld(sx, sy);
    R.cam.z *= f; R.clamp();
    const after = R.toWorld(sx, sy);
    R.cam.x += R.wrapDx(before.x - after.x); R.cam.y += before.y - after.y; R.clamp(); R.dirty = 1;
  };
  R.focusOn = (n, z) => { R.cam.x = G.nodeX[n]; R.cam.y = G.nodeY[n]; if (z) R.cam.z = Math.max(R.cam.z, z); R.clamp(); R.dirty = 1; };

  // ---------- İsabet testi ----------
  const hitCtx = document.createElement('canvas').getContext('2d');
  R.provAt = (sx, sy) => {
    const w = R.toWorld(sx, sy);
    for (let i = 0; i < NP; i++) {
      const b = P[i].b;
      if (w.x < b[0] || w.x > b[2] || w.y < b[1] || w.y > b[3]) continue;
      if (hitCtx.isPointInPath(provPath[i], w.x, w.y, 'evenodd')) return i;
    }
    return -1;
  };
  R.nodeAt = (sx, sy) => {
    const p = R.provAt(sx, sy); if (p >= 0) return p;
    const w = R.toWorld(sx, sy);
    let best = -1, bd = Infinity;
    for (let s = 0; s < SEAS.length; s++) { const d = (SEAS[s].x - w.x) ** 2 + (SEAS[s].y - w.y) ** 2; if (d < bd) { bd = d; best = s; } }
    return best >= 0 && Math.sqrt(bd) < 140 ? NP + best : -1;
  };
  // birlik sayacı isabeti (ekran pikseli)
  R.counters = [];
  R.counterAt = (sx, sy) => { for (let k = R.counters.length - 1; k >= 0; k--) { const c = R.counters[k]; if (sx >= c.x && sx <= c.x + c.w && sy >= c.y && sy <= c.y + c.h) return c; } return null; };

  // ---------- Desenler ----------
  // desenler cihaz çözünürlüğünde üretilir (PD kat); dönüşümde 1/PD ile küçültülür, böylece 3× ekranda bulanıklaşmaz
  const PD = () => Math.max(1, Math.ceil(R.dpr || 1));
  let wavePat = null;
  function waveCanvas() {
    const pd = PD(), c = document.createElement('canvas'); c.width = c.height = 64 * pd;
    const x = c.getContext('2d'); x.scale(pd, pd);
    x.strokeStyle = 'rgba(170,205,225,0.55)'; x.lineWidth = 0.8; x.lineCap = 'round';
    for (const [cx, cy] of [[8, 10], [40, 6], [24, 30], [54, 38], [10, 50], [36, 56]]) { x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 3, cy - 2.5, cx + 6, cy); x.quadraticCurveTo(cx + 9, cy + 2.5, cx + 12, cy); x.stroke(); }
    return c;
  }
  function stripePattern(color) {
    const pd = PD(), c = document.createElement('canvas'); c.width = c.height = 12 * pd;
    const x = c.getContext('2d'); x.scale(pd, pd);
    x.strokeStyle = color; x.lineWidth = 3.2;
    x.beginPath(); x.moveTo(-3, 15); x.lineTo(15, -3); x.moveTo(-3, 3); x.lineTo(3, -3); x.moveTo(9, 15); x.lineTo(15, 9); x.stroke();
    return c;
  }
  const stripeCache = new Map();
  // ---------- Arazi rölyefi (HOI4 siyasi haritasında renklerin altından görünen arazi) ----------
  const TEX = {
    mountain: { a: 0.42, f: 'rgba(0,0,0,0.13)', d: (x) => { x.strokeStyle = 'rgba(20,16,10,0.9)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(2, 12); x.lineTo(6, 5); x.lineTo(10, 12); x.moveTo(11, 7); x.lineTo(14, 2); x.lineTo(17, 7); x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(6, 5); x.lineTo(7.6, 8); x.moveTo(14, 2); x.lineTo(15.2, 4.4); x.stroke(); } },
    hills: { a: 0.3, f: 'rgba(0,0,0,0.05)', d: (x) => { x.strokeStyle = 'rgba(30,24,14,0.85)'; x.lineWidth = 1.1; x.beginPath(); x.arc(6, 11, 4, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(15, 4, 3.4, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); } },
    forest: { a: 0.3, f: 'rgba(10,40,10,0.08)', d: (x) => { x.fillStyle = 'rgba(14,40,16,0.9)'; for (const [cx, cy] of [[4, 5], [13, 10], [7, 15]]) { x.beginPath(); x.moveTo(cx, cy - 3.2); x.lineTo(cx + 2.4, cy + 1.6); x.lineTo(cx - 2.4, cy + 1.6); x.closePath(); x.fill(); } } },
    jungle: { a: 0.34, f: 'rgba(0,40,10,0.12)', d: (x) => { x.fillStyle = 'rgba(8,36,12,0.9)'; for (const [cx, cy] of [[3, 4], [11, 3], [7, 10], [15, 12], [3, 16]]) { x.beginPath(); x.arc(cx, cy, 1.9, 0, Math.PI * 2); x.fill(); } } },
    marsh: { a: 0.32, f: 'rgba(20,60,70,0.08)', d: (x) => { x.strokeStyle = 'rgba(20,50,60,0.95)'; x.lineWidth = 1; x.beginPath(); for (const [cx, cy] of [[2, 5], [10, 11], [4, 16]]) { x.moveTo(cx, cy); x.lineTo(cx + 5, cy); } x.stroke(); } },
    desert: { a: 0.28, f: 'rgba(255,230,160,0.07)', d: (x) => { x.fillStyle = 'rgba(90,70,30,0.8)'; for (const [cx, cy] of [[3, 3], [12, 6], [6, 12], [15, 15], [9, 17]]) x.fillRect(cx, cy, 1.1, 1.1); } },
  };
  let terrPaths = null; const texPat = new Map();
  // ---------- Arazi simgeleri ve kabartma ----------
  // Simgeler eyalet içine belirlenimli ızgara + sapma ile bir kez yerleştirilir (karo kovalarında x, y, sıra, tür, çeşit).
  // Her simge cihaz çözünürlüğünde önceden çizilmiş küçük bir tuvalden kopyalanır; yoğunluk yakınlaştırmaya göre artar.
  const ICON_T = ['mountain', 'hills', 'forest', 'jungle', 'marsh', 'desert', 'urban'], ICON_STEP = 3.4;
  // karo başına tembel üretim: bir karo ilk kez ekrana girdiğinde simgeleri hesaplanır (açılış maliyeti yok)
  let terrIcons = null, reliefProvs = null, tileProvs = null;
  function initIcons() {
    terrIcons = new Array(NT).fill(null); reliefProvs = Array.from({ length: NT }, () => []); tileProvs = Array.from({ length: NT }, () => []);
    for (let i = 0; i < NP; i++) {
      const ti = ICON_T.indexOf(g.TERRAIN[P[i].te]?.id); if (ti < 0) continue;
      tileProvs[provT[i]].push(i); if (ti <= 1) reliefProvs[provT[i]].push(i);
    }
  }
  function buildTileIcons(t) {
    const out = [];
    for (const i of tileProvs[t]) {
      const ti = ICON_T.indexOf(g.TERRAIN[P[i].te].id);
      const b = P[i].b, pa = provPath[i], step = ICON_STEP * [1, 1.2, 1, 1, 1.1, 1.25, 1.5][ti], m = step * 0.3;
      for (let gy = Math.floor(b[1] / step) * step; gy < b[3]; gy += step) {
        for (let gx = Math.floor(b[0] / step) * step; gx < b[2]; gx += step) {
          const ix = Math.round(gx * 4), iy = Math.round(gy * 4);
          const x = gx + step * (0.5 + (hh(ix, iy, i, ti, 5) - 0.5) * 0.7), y = gy + step * (0.5 + (hh(ix, iy, i, ti, 6) - 0.5) * 0.7);
          // simge eyalet sınırına taşmasın: merkez ve iki yan nokta içeride olmalı
          if (!hitCtx.isPointInPath(pa, x, y, 'evenodd') || !hitCtx.isPointInPath(pa, x - m, y - m * 0.5, 'evenodd') || !hitCtx.isPointInPath(pa, x + m, y - m * 0.5, 'evenodd')) continue;
          out.push(x, y, hh(ix, iy, i, ti, 7), ti, (hh(ix, iy, i, ti, 8) * 3) | 0);
        }
      }
    }
    return (terrIcons[t] = Float32Array.from(out));
  }
  // simge çizimleri (birim kutu: genişlik 1, taban y = 0.9); yarı saydam nötr tonlar ülke rengini örtmez
  const INK = 'rgba(22,18,12,0.88)', LIT = 'rgba(255,251,238,0.62)', SHD = 'rgba(18,14,8,0.42)';
  const ICON_DRAW = [
    (x, v) => { // dağ: ışıklı batı yüzü, gölgeli doğu yüzü, karlı zirve
      const peaks = v === 0 ? [[0.5, 0.12, 0.42]] : v === 1 ? [[0.36, 0.2, 0.34], [0.66, 0.1, 0.36]] : [[0.58, 0.14, 0.4], [0.28, 0.4, 0.26]];
      for (const [cx, top, hw] of peaks) {
        x.fillStyle = LIT; x.beginPath(); x.moveTo(cx - hw, 0.9); x.lineTo(cx, top); x.lineTo(cx + hw * 0.12, 0.9); x.closePath(); x.fill();
        x.fillStyle = SHD; x.beginPath(); x.moveTo(cx + hw * 0.12, 0.9); x.lineTo(cx, top); x.lineTo(cx + hw, 0.9); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.moveTo(cx, top); x.lineTo(cx - hw * 0.3, top + (0.9 - top) * 0.3); x.lineTo(cx - hw * 0.05, top + (0.9 - top) * 0.24); x.lineTo(cx + hw * 0.08, top + (0.9 - top) * 0.32); x.lineTo(cx + hw * 0.28, top + (0.9 - top) * 0.28); x.closePath(); x.fill();
        x.strokeStyle = INK; x.lineWidth = 0.055; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx - hw, 0.9); x.lineTo(cx, top); x.lineTo(cx + hw, 0.9); x.stroke();
      }
    },
    (x, v) => { // tepe: gölgeli yaylar
      const hs = v === 0 ? [[0.5, 0.42]] : [[0.34, 0.3], [0.68, 0.26]];
      for (const [cx, r] of hs) {
        x.fillStyle = SHD; x.beginPath(); x.ellipse(cx + r * 0.12, 0.9, r, r * 0.7, 0, Math.PI, 0); x.fill();
        x.fillStyle = LIT; x.beginPath(); x.ellipse(cx - r * 0.18, 0.9, r * 0.62, r * 0.55, 0, Math.PI, Math.PI * 1.6); x.lineTo(cx - r * 0.18, 0.9); x.fill();
        x.strokeStyle = INK; x.lineWidth = 0.05; x.beginPath(); x.ellipse(cx, 0.9, r, r * 0.7, 0, Math.PI * 1.04, Math.PI * 1.96); x.stroke();
      }
    },
    (x, v) => { // orman: çam kümesi
      const ts = v === 0 ? [[0.3, 0.55, 0.2], [0.62, 0.42, 0.25]] : v === 1 ? [[0.5, 0.4, 0.27]] : [[0.24, 0.5, 0.18], [0.5, 0.35, 0.23], [0.78, 0.55, 0.17]];
      for (const [cx, top, w] of ts) {
        const h = 0.86 - top;
        x.fillStyle = 'rgba(34,24,14,0.85)'; x.fillRect(cx - 0.03, 0.78, 0.06, 0.12);
        x.fillStyle = 'rgba(14,44,18,0.9)';
        for (let k = 0; k < 3; k++) { const ty = top + h * k * 0.28, bw = w * (0.6 + k * 0.22); x.beginPath(); x.moveTo(cx, ty); x.lineTo(cx + bw, ty + h * 0.46); x.lineTo(cx - bw, ty + h * 0.46); x.closePath(); x.fill(); }
        x.fillStyle = 'rgba(120,170,100,0.45)'; x.beginPath(); x.moveTo(cx, top); x.lineTo(cx - w * 0.5, top + h * 0.38); x.lineTo(cx - w * 0.1, top + h * 0.38); x.closePath(); x.fill();
      }
    },
    (x, v) => { // cangıl: palmiye
      const cx = 0.5 + (v - 1) * 0.08;
      x.strokeStyle = 'rgba(40,28,14,0.9)'; x.lineWidth = 0.07; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, 0.9); x.quadraticCurveTo(cx + 0.08, 0.6, cx, 0.32); x.stroke();
      x.strokeStyle = 'rgba(12,52,18,0.92)'; x.lineWidth = 0.09;
      for (const a of [-2.7, -2.1, -1.5, -0.9, -0.35]) { x.beginPath(); x.moveTo(cx, 0.32); x.quadraticCurveTo(cx + Math.cos(a) * 0.22, 0.32 + Math.sin(a) * 0.22, cx + Math.cos(a) * 0.36, 0.42 + Math.sin(a) * 0.08); x.stroke(); }
    },
    (x, v) => { // bataklık: su çizgileri ve saz
      x.strokeStyle = 'rgba(20,60,72,0.85)'; x.lineWidth = 0.06; x.lineCap = 'round';
      x.beginPath(); x.moveTo(0.12, 0.84); x.lineTo(0.5, 0.84); x.moveTo(0.36, 0.7); x.lineTo(0.88, 0.7); x.stroke();
      x.strokeStyle = 'rgba(30,44,16,0.9)'; x.lineWidth = 0.05;
      const cx = 0.5 + (v - 1) * 0.12;
      for (const [dx, h] of [[-0.1, 0.36], [0, 0.48], [0.1, 0.34]]) { x.beginPath(); x.moveTo(cx + dx * 0.4, 0.66); x.lineTo(cx + dx, 0.66 - h); x.stroke(); }
    },
    (x, v) => { // çöl: kum tepesi
      x.fillStyle = 'rgba(255,240,200,0.5)'; x.beginPath(); x.moveTo(0.06, 0.88); x.quadraticCurveTo(0.42, 0.42 + v * 0.06, 0.66, 0.6); x.quadraticCurveTo(0.8, 0.7, 0.94, 0.88); x.closePath(); x.fill();
      x.fillStyle = 'rgba(110,80,30,0.42)'; x.beginPath(); x.moveTo(0.42, 0.88); x.quadraticCurveTo(0.6, 0.64, 0.66, 0.6); x.quadraticCurveTo(0.8, 0.7, 0.94, 0.88); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(90,64,24,0.8)'; x.lineWidth = 0.045; x.beginPath(); x.moveTo(0.06, 0.88); x.quadraticCurveTo(0.42, 0.42 + v * 0.06, 0.66, 0.6); x.quadraticCurveTo(0.8, 0.7, 0.94, 0.88); x.stroke();
    },
    (x, v) => { // şehir: bina blokları
      const bs = v === 0 ? [[0.12, 0.5, 0.24], [0.38, 0.28, 0.24], [0.64, 0.46, 0.24]] : [[0.16, 0.38, 0.26], [0.46, 0.54, 0.22], [0.7, 0.32, 0.18]];
      for (const [bx, top, w] of bs) {
        x.fillStyle = 'rgba(40,36,32,0.78)'; x.fillRect(bx, top, w, 0.9 - top);
        x.fillStyle = 'rgba(255,236,170,0.75)'; for (let wy = top + 0.08; wy < 0.82; wy += 0.14) { x.fillRect(bx + w * 0.2, wy, w * 0.2, 0.06); x.fillRect(bx + w * 0.6, wy, w * 0.2, 0.06); }
      }
    },
  ];
  const iconCache = new Map();
  function iconSprite(ti, v, px) {
    const key = ti * 1000 + v * 100 + px;
    let c = iconCache.get(key);
    if (!c) {
      const pd = PD(); c = document.createElement('canvas'); c.width = c.height = Math.ceil(px * pd);
      const x = c.getContext('2d'); x.scale(px * pd, px * pd); ICON_DRAW[ti](x, v); iconCache.set(key, c);
    }
    return c;
  }
  // kabartma: dağ ve tepe eyaletlerinde kuzeybatıdan ışık, güneydoğuya gölge (gradyan dünya uzayında bir kez kurulur)
  const reliefGrad = new Map();
  function drawRelief(ctx) {
    for (const t of VIS) for (const i of reliefProvs[t]) {
      let gr = reliefGrad.get(i);
      if (!gr) {
        const b = P[i].b, m = g.TERRAIN[P[i].te].id === 'mountain';
        gr = ctx.createLinearGradient(b[0], b[1], b[2], b[3]);
        gr.addColorStop(0, `rgba(255,250,228,${m ? 0.2 : 0.11})`); gr.addColorStop(0.45, 'rgba(255,250,228,0)');
        gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(12,8,4,${m ? 0.26 : 0.14})`);
        reliefGrad.set(i, gr);
      }
      ctx.fillStyle = gr; ctx.fill(provPath[i], 'evenodd');
    }
  }
  function drawIcons(ctx, z, alpha) {
    const px = Math.round(Math.max(9, Math.min(17, 7 + z * 1.25)));
    const show = Math.min(1, Math.pow((ICON_STEP * z) / (px * 1.3), 2)) * (R.quality === 1 ? 0.7 : 1);
    const T = ctx.getTransform(), W = ctx.canvas.width, H = ctx.canvas.height;
    const wx0 = -T.e / T.a - px, wx1 = (W - T.e) / T.a + px, wy0 = -T.f / T.d - px, wy1 = (H - T.f) / T.d + px;
    const s = px / z;
    ctx.globalAlpha = alpha;
    for (const t of VIS) {
      const a = terrIcons[t] || buildTileIcons(t);
      for (let k = 0; k < a.length; k += 5) {
        const x = a[k], y = a[k + 1];
        if (a[k + 2] >= show || x < wx0 || x > wx1 || y < wy0 || y > wy1) continue;
        ctx.drawImage(iconSprite(a[k + 3], a[k + 4], px), x - s / 2, y - s * 0.72, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }
  function terrainLayer(ctx, z) {
    if (!terrPaths) {
      terrPaths = new Map();
      for (let i = 0; i < NP; i++) { const id = g.TERRAIN[P[i].te]?.id; if (!TEX[id]) continue; let pa = terrPaths.get(id); if (!pa) terrPaths.set(id, (pa = tPaths())); tProv(pa, i); }
    }
    const hq = (R.quality ?? 2) > 0;
    if (hq && !terrIcons) initIcons();
    if (hq) drawRelief(ctx);
    // uzak zoomda doku deseni, yakında simgeler (1,3–1,8 arası geçiş)
    const ico = hq ? Math.max(0, Math.min(1, (z - 1.3) / 0.5)) : 0;
    const fade = Math.max(0, Math.min(1, (z - 0.45) / 0.5)) * (1 - ico);
    for (const [id, pa] of terrPaths) {
      const T = TEX[id];
      ctx.fillStyle = T.f; tFill(ctx, pa, 'evenodd');
      if (fade <= 0) continue;
      let pat = texPat.get(id);
      if (!pat) { const pd = PD(), cv = document.createElement('canvas'); cv.width = cv.height = 19 * pd; const x = cv.getContext('2d'); x.scale(pd, pd); T.d(x); pat = ctx.createPattern(cv, 'repeat'); texPat.set(id, pat); }
      const k = 1 / (z * Math.max(1, Math.min(1.6, z * 0.6)) * PD());
      pat.setTransform && pat.setTransform(new DOMMatrix().scale(k, k));
      ctx.globalAlpha = T.a * fade; ctx.fillStyle = pat; tFill(ctx, pa, 'evenodd'); ctx.globalAlpha = 1;
    }
    if (ico > 0) drawIcons(ctx, z, ico);
  }
  // kâğıt dokusu ve kenar karartması (ekran uzayı)
  let noisePat = null, vig = null, vigKey = '';
  // gürültü ve kenar karartması tek bir ekran boyu tuvalde önceden birleştirilir (her karede tek kopya)
  let atmCv = null;
  function atmosphere(ctx) {
    const key = R.w + 'x' + R.h + 'x' + R.dpr;
    if (vigKey !== key) {
      vigKey = key;
      if (!noisePat) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const im = x.createImageData(128, 128);
        let sd = 1234567; const rnd = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = 0; i < im.data.length; i += 4) { const v = 110 + rnd() * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
        x.putImageData(im, 0, 0); noisePat = cv;
      }
      atmCv = atmCv || document.createElement('canvas');
      atmCv.width = Math.round(R.w * R.dpr); atmCv.height = Math.round(R.h * R.dpr);
      const x = atmCv.getContext('2d');
      x.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 0.045; x.fillStyle = x.createPattern(noisePat, 'repeat'); x.fillRect(0, 0, atmCv.width, atmCv.height); x.globalAlpha = 1; x.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
      vig = x.createRadialGradient(R.w / 2, R.h / 2, Math.min(R.w, R.h) * 0.35, R.w / 2, R.h / 2, Math.hypot(R.w, R.h) * 0.62); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.38)');
      x.fillStyle = vig; x.fillRect(0, 0, R.w, R.h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(atmCv, 0, 0);
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  }
  const AIRS_COLORS = ['#a8322a', '#c8682f', '#c9a640', '#7ea54c', '#3f8f4f'];
  const AIRN_COLORS = ['#4d5a6a', '#56634e', '#665a4c', '#4f5f63', '#5d5266', '#5a604a'];
  const SUP_COLORS = ['#a8322a', '#cc6a2c', '#d6a73a', '#a9b54a', '#6fa84d', '#3f8f4f'];
  const IND_COLORS = ['#2e3a2a', '#4b5a33', '#6b7a35', '#94913a', '#c0a03c', '#d98a37', '#e0663a'];

  // ---------- Nehirler (önceden izdüşümlenmiş Path2D; büyük ve küçük ayrı) ----------
  let riverP = null;
  function buildRivers() {
    riverP = { big: tPaths(), small: tPaths() };
    for (const r of G.riverPaths()) {
      const q = r.pts, n = q.length / 2;
      if (n < 2) continue;
      const tp = r.big ? riverP.big : riverP.small, t = ptsTile([q]), pa = tp[t] || (tp[t] = new Path2D());
      pa.moveTo(q[0], q[1]);
      // orta noktalardan geçen ikinci derece eğrilerle yumuşat
      for (let i = 1; i < n - 1; i++) {
        if (Math.abs(q[2 * i] - q[2 * i - 2]) > M.W / 2) { pa.moveTo(q[2 * i], q[2 * i + 1]); continue; }
        pa.quadraticCurveTo(q[2 * i], q[2 * i + 1], (q[2 * i] + q[2 * i + 2]) / 2, (q[2 * i + 1] + q[2 * i + 3]) / 2);
      }
      pa.lineTo(q[2 * n - 2], q[2 * n - 1]);
    }
  }
  function drawRivers(ctx, z) {
    if (!riverP) buildRivers();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // küçük nehirler yakınlaşınca görünür; büyükler her zaman
    if (z > 0.7) { ctx.strokeStyle = `rgba(104,170,226,${Math.min(0.9, 0.35 + (z - 0.7) * 0.6)})`; ctx.lineWidth = Math.min(1.7, 0.8 + z * 0.4) / z; tStroke(ctx, riverP.small); }
    ctx.strokeStyle = 'rgba(86,160,226,0.92)'; ctx.lineWidth = Math.min(3.6, 1.3 + z * 1.3) / z; tStroke(ctx, riverP.big);
  }

  // ---------- Çizim ----------
  // Harita üç önbellek katmanından oluşur: A (okyanus, deniz çizgileri, kıyı ışıması) ve C (arazi dokusu, kıyı, nehirler,
  // atmosfer) yalnızca kamera/kip değişince; B (ülke dolguları, hava, işgal, sınırlar) ayrıca sahiplik değişince çizilir.
  function eachCopy(ctx, fn) {
    const cam = R.cam, z = cam.z, dpr = R.dpr, hw = R.w / 2 / z;
    for (let k = Math.floor((cam.x - hw) / M.W); k <= Math.floor((cam.x + hw) / M.W); k++) {
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (R.w / 2 - (cam.x - k * M.W) * z), dpr * (R.h / 2 - cam.y * z));
      setVis(k, 8 / z);
      if (VIS.length) fn(z);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const SHALLOW = [[26, 0.05], [14, 0.08], [7, 0.13], [3, 0.2]], SHALLOW_LQ = [[20, 0.09], [6, 0.2]];
  function drawLayerA(ctx) {
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    // okyanus
    const grd = ctx.createLinearGradient(0, 0, 0, R.h);
    grd.addColorStop(0, '#132639'); grd.addColorStop(1, '#0c1b2a');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, R.w, R.h);
    eachCopy(ctx, (z) => {
      // yakın zoomda dalga çizgileri (dünya uzayında, cihaz çözünürlüğünde desen)
      if (z > 2.2 && !R.lowQ && R.quality > 0) {
        if (!wavePat) wavePat = ctx.createPattern(waveCanvas(), 'repeat');
        wavePat.setTransform && wavePat.setTransform(new DOMMatrix().scale(1 / (z * PD()), 1 / (z * PD())));
        ctx.globalAlpha = Math.min(0.5, (z - 2.2) * 0.35); ctx.fillStyle = wavePat; ctx.fillRect(-M.W, -M.H, M.W * 3, M.H * 3); ctx.globalAlpha = 1;
      }
      // deniz bölgeleri
      ctx.strokeStyle = 'rgba(160,190,215,0.10)'; ctx.lineWidth = 1 / z; tStroke(ctx, seaPath);
      // sığ su: kıyıdan açığa koyulaşan katmanlı hâle (ekran pikseline göre sabit genişlik)
      // (kaydırma sırasında iki katman ve köşeli birleşim: geniş yuvarlak çizgiler pahalı)
      ctx.lineJoin = R.lowQ ? 'bevel' : 'round'; ctx.lineCap = R.lowQ ? 'butt' : 'round';
      for (const [w, a] of R.lowQ ? SHALLOW_LQ : SHALLOW) { ctx.strokeStyle = `rgba(96,150,182,${a})`; ctx.lineWidth = w / z; tStroke(ctx, coastPath); }
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    });
  }
  function drawLayerB(ctx) {
    const st = G.st;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    eachCopy(ctx, (z) => {
      // kara dolgusu
      for (const [k, pa] of fillGroups) {
        let col;
        if (R.mode === 'terrain') col = g.TERRAIN[+k.slice(2)].c;
        else if (R.mode === 'ind') col = IND_COLORS[+k.slice(3)];
        else if (R.mode === 'fac') { if (k.startsWith('fac:')) col = st.factions[k.slice(4)]?.c || '#777'; else col = mix(R.ccolor(k.slice(6)), '#808070', 0.75); }
        else if (R.mode === 'air') col = k.startsWith('airs') ? AIRS_COLORS[+k.slice(4)] : AIRN_COLORS[+k.slice(4)];
        else if (R.mode === 'peace') { const t = k.slice(3); col = k.startsWith('pk:') ? R.ccolor(t) : k.startsWith('pu:') ? mix(R.ccolor(t), '#d8d2bc', 0.35) : mix(R.ccolor(t), '#33362f', 0.78); }
        else if (R.mode === 'sea') col = mix(R.ccolor(k.slice(6)), '#3a3d36', 0.6);
        else if (R.mode === 'res') col = k.startsWith('roil') ? ['#3a3d36', '#6b5a3a', '#3f3020', '#1d150c'][+k.slice(4)] : k.startsWith('rst') ? ['#3a3d36', '#7d8a96', '#5b6d80', '#3d5068'][+k.slice(3)] : mix(R.ccolor(k.slice(6)), '#3a3d36', 0.75);
        else if (R.mode === 'ideo') col = (g.IDEOLOGIES[k.slice(5)] || g.IDEOLOGIES.neu).c;
        else if (R.mode === 'vp') col = ['#3d4038', '#6b6a4a', '#9a8a48', '#c99a3a', '#e8c35a'][+k.slice(2)];
        else if (R.mode === 'goal') col = k === 'gwar' ? '#b8402e' : k === 'ggoal' ? '#d98a3a' : k === 'gjust' ? '#c9b25a' : mix(R.ccolor(k.slice(6)), '#3a3d36', 0.7);
        else if (R.mode === 'sup') { col = k.startsWith('nosup:') ? mix(R.ccolor(k.slice(6)), '#3a3d36', 0.75) : SUP_COLORS[+k.slice(3)]; }
        else if (R.mode === 'occ') { col = k.startsWith('nooc:') ? mix(R.ccolor(k.slice(5)), '#3a3d36', 0.7) : SUP_COLORS[5 - +k.slice(3)]; }
        else col = R.ccolor(k);
        if (R.mode === 'pol' && st.C[k] && !st.C[k].alive) col = mix(col, '#555', 0.6);
        ctx.fillStyle = col;
        tFill(ctx, pa, 'evenodd');
      }
      // hava: kar ve çamur katmanı
      if (R.showWeather && R.mode !== 'ind') {
        if (wxPaths.snow1) { ctx.fillStyle = 'rgba(235,242,250,0.3)'; tFill(ctx, wxPaths.snow1, 'evenodd'); }
        if (wxPaths.snow2) { ctx.fillStyle = 'rgba(244,248,253,0.52)'; tFill(ctx, wxPaths.snow2, 'evenodd'); }
        if (wxPaths.mud) { if (!mudPat) mudPat = ctx.createPattern(stripePattern('#6b4a2a'), 'repeat'); mudPat.setTransform && mudPat.setTransform(new DOMMatrix().scale(1 / (z * PD()), 1 / (z * PD()))); ctx.globalAlpha = 0.45; ctx.fillStyle = mudPat; tFill(ctx, wxPaths.mud, 'evenodd'); ctx.globalAlpha = 1; }
      }
      // işgal çizgileri
      if (R.mode === 'pol' || R.mode === 'peace') for (const [owner, pa] of occGroups) {
        let pat = stripeCache.get(owner);
        if (!pat) { pat = ctx.createPattern(stripePattern(mix(R.ccolor(owner), '#000000', 0.15)), 'repeat'); stripeCache.set(owner, pat); }
        pat.setTransform && pat.setTransform(new DOMMatrix().scale(1 / (z * PD()), 1 / (z * PD())));
        ctx.globalAlpha = 0.55; ctx.fillStyle = pat;
        tFill(ctx, pa, 'evenodd');
        ctx.globalAlpha = 1;
      }
      // eyalet sınırları
      if (z > 0.55) { ctx.strokeStyle = `rgba(20,24,18,${Math.min(0.45, (z - 0.55) * 0.5)})`; ctx.lineWidth = 0.7 / z; tStroke(ctx, provBorder); }
      const cbw = Math.max(1.2, Math.min(2.4, z * 1.1));
      // ülke sınırı: açık hâle + koyu çizgi (kaydırmada yalnız çizgi)
      if (!R.lowQ) { ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(246,240,214,0.22)'; ctx.lineWidth = (cbw + 2.6) / z; tStroke(ctx, countryBorder); }
      ctx.strokeStyle = 'rgba(10,12,8,0.9)'; ctx.lineWidth = cbw / z; tStroke(ctx, countryBorder); ctx.lineJoin = 'miter';
      if (R.mode === 'air') { ctx.strokeStyle = 'rgba(235,225,190,0.75)'; ctx.lineWidth = 2 / z; ctx.setLineDash([5 / z, 3 / z]); tStroke(ctx, regionBorder); ctx.setLineDash([]); }
      if (R.mode === 'peace') {
        ctx.strokeStyle = 'rgba(20,18,12,0.95)'; ctx.lineWidth = 2.2 / z; tStroke(ctx, regionBorder);
        const cf = st.conf, cs = G.UI && G.UI.cfSel, sel = cf && cs != null ? cf.states[cs] : null;
        if (sel) { ctx.fillStyle = 'rgba(255,240,190,0.28)'; for (const n of sel.p) ctx.fill(provPath[n], 'evenodd'); ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 2.6 / z; for (const n of sel.p) ctx.stroke(provPath[n]); }
      }
      if (railPaths) {
        ctx.lineCap = 'round';
        for (let k = 2; k <= 5; k++) {
          const w = (0.7 + 0.45 * (k - 2)) * Math.max(1, Math.min(1.8, z)) ;
          ctx.strokeStyle = 'rgba(12,14,10,0.75)'; ctx.lineWidth = (w + 1.2) / z; ctx.stroke(railPaths[k]);
          ctx.strokeStyle = k >= 4 ? '#f6efcf' : '#d9d1b0'; ctx.lineWidth = w / z; ctx.stroke(railPaths[k]);
        }
        ctx.lineCap = 'butt';
      }
    });
  }
  function drawLayerC(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    eachCopy(ctx, (z) => {
      // arazi rölyefi: siyasi ve ittifak haritasında dağ, tepe, orman, çöl, bataklık dokusu
      if ((R.mode === 'pol' || R.mode === 'fac') && R.relief !== false && !R.lowQ) terrainLayer(ctx, z);
      ctx.strokeStyle = 'rgba(6,14,22,0.92)'; ctx.lineWidth = Math.max(1.1, Math.min(1.8, z * 0.7)) / z; ctx.lineJoin = 'round'; tStroke(ctx, coastPath);
      if (R.mode !== 'peace' && R.mode !== 'ind') drawRivers(ctx, z);
    });
    atmosphere(ctx);
  }
  // Sabit harita katmanı ayrı bir tuvalde önbelleklenir; kamera, kip ya da harita değişmedikçe her kare yalnızca kopyalanır
  // (telefonda asıl kasma tam ekran dolgu/doku boyamasıydı).
  let baseCv = null, baseCtx = null, baseKey = '', mapVer = 0;
  const LAY = [{}, {}, {}, {}];
  R.bumpMap = () => { mapVer++; };
  R.draw = () => {
    const st = G.st, ctx = R.ctx, cam = R.cam, z = cam.z, dpr = R.dpr;
    if (!st) return;
    if (R.mode === 'sup' && R.supTick !== G.supTick) { R.supTick = G.supTick; R.mapDirty = 1; }
    if ((R.mode === 'goal' || R.mode === 'ideo') && R.gDay !== (st.day / 5 | 0)) { R.gDay = st.day / 5 | 0; R.mapDirty = 1; }
    if (R.mode === 'occ' && R.occDay !== (st.day / 10 | 0)) { R.occDay = st.day / 10 | 0; R.mapDirty = 1; }
    if (R.mode === 'air' && R.airDay !== (st.day / 5 | 0)) { R.airDay = st.day / 5 | 0; R.mapDirty = 1; }
    if (R.mapDirty || (G.mapDirty && performance.now() - (R.lastRebuild || 0) > 350)) { rebuild(); G.mapDirty = 0; R.lastRebuild = performance.now(); mapVer++; }
    if (G.wxDirty) { buildWeather(); G.wxDirty = 0; mapVer++; }
    const W = R.cv.width, H = R.cv.height;
    if (!baseCv || baseCv.width !== W || baseCv.height !== H) {
      for (const L of LAY) { L.cv = L.cv || document.createElement('canvas'); L.cv.width = W; L.cv.height = H; L.ctx = L.cv.getContext('2d'); L.key = ''; }
      baseCv = LAY[3].cv; baseCtx = LAY[3].ctx; baseKey = '';
    }
    const camKey = cam.x + '|' + cam.y + '|' + z + '|' + W + '|' + H + '|' + R.mode;
    const kA = camKey + '|' + (R.lowQ ? 1 : 0) + '|' + R.quality, kC = camKey + '|' + R.relief + '|' + (R.lowQ ? 1 : 0) + '|' + R.quality;
    const kB = camKey + '|' + (R.lowQ ? 1 : 0) + '|' + R.showWeather + '|' + mapVer + '|' + (R.mode === 'peace' ? (G.UI && G.UI.cfSel) : '');
    let ch = 0;
    if (LAY[0].key !== kA) { drawLayerA(LAY[0].ctx); LAY[0].key = kA; ch = 1; }
    if (LAY[1].key !== kB) { drawLayerB(LAY[1].ctx); LAY[1].key = kB; ch = 1; }
    if (LAY[2].key !== kC) { drawLayerC(LAY[2].ctx); LAY[2].key = kC; ch = 1; }
    if (ch || !baseKey) {
      // birleşik katman: A + B + C + etiketler
      baseCtx.setTransform(1, 0, 0, 1, 0, 0); baseCtx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) baseCtx.drawImage(LAY[i].cv, 0, 0);
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLabels(baseCtx, z);
      baseKey = 'ok';
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.drawImage(baseCv, 0, 0);
    const hw = R.w / 2 / z;
    for (let k = Math.floor((cam.x - hw) / M.W); k <= Math.floor((cam.x + hw) / M.W); k++) {
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (R.w / 2 - (cam.x - k * M.W) * z), dpr * (R.h / 2 - cam.y * z));
      if (R.mode !== 'peace') drawFronts(ctx, z);
      // seçili eyalet
      if (R.sel.prov >= 0 && R.sel.prov < NP) {
        ctx.strokeStyle = '#f2d27a'; ctx.lineWidth = 2.2 / z; ctx.stroke(provPath[R.sel.prov]);
        ctx.fillStyle = 'rgba(242,210,122,0.14)'; ctx.fill(provPath[R.sel.prov], 'evenodd');
      }
      // bölge seçimi vurgusu (strateji bölgesi kısa süre parlar)
      if (R.regionFlash && G.AIR) {
        const age = performance.now() - R.regionFlash.t;
        if (age > 1600) R.regionFlash = null;
        else {
          const a = 1 - age / 1600, reg = G.AIR.regions[R.regionFlash.r];
          ctx.fillStyle = `rgba(242,210,122,${0.22 * a})`; ctx.strokeStyle = `rgba(255,236,170,${0.9 * a})`; ctx.lineWidth = 2 / z;
          for (const n of reg.nodes) if (n < NP) { ctx.fill(provPath[n], 'evenodd'); ctx.stroke(provPath[n]); }
          R.dirty = 1;
        }
      }
      // hedef önizleme
      if (R.hover >= 0 && R.hover < NP && R.sel.units.size) { ctx.strokeStyle = '#ffffff'; ctx.setLineDash([4 / z, 3 / z]); ctx.lineWidth = 1.6 / z; ctx.stroke(provPath[R.hover]); ctx.setLineDash([]); }
    }

    // ---------- ekran uzayı katmanları ----------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (R.mode === 'peace') drawConf(ctx);
    else {
      drawHubs(ctx);
      drawPaths(ctx);
      drawArrows(ctx, z);
      drawBattles(ctx);
      drawBorderConflicts(ctx);
      drawUnits(ctx, z);
      drawArmyTags(ctx, z);
    }
    drawAirRegions(ctx, z);
    if (R.mode === 'sea') drawSeaMode(ctx, z);
    if (R.mode === 'vp') drawVpMode(ctx, z);
    if (R.box) { ctx.strokeStyle = '#f2d27a'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; const b = R.box; ctx.strokeRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); ctx.setLineDash([]); ctx.fillStyle = 'rgba(242,210,122,0.08)'; ctx.fillRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); }
    R.dirty = R.regionFlash ? 1 : 0;
  };

  // sınır çatışmaları: eyalette turuncu çerçeveli çapraz kılıç ve kalan gün
  function drawBorderConflicts(ctx) {
    const st = G.st; R.bcMarks = []; if (!st.bc || !st.bc.length) return;
    ctx.font = '700 11px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const x of st.bc) {
      const s = visible(G.nodeX[x.prov], G.nodeY[x.prov], 30); if (!s) continue;
      R.bcMarks.push({ x: s.x, y: s.y, x0: x });
      const pulse = 0.6 + 0.4 * Math.sin(R.t / 220);
      ctx.fillStyle = 'rgba(20,16,10,0.85)'; ctx.strokeStyle = `rgba(240,140,50,${pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 14); ctx.lineTo(s.x + 14, s.y); ctx.lineTo(s.x, s.y + 14); ctx.lineTo(s.x - 14, s.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f2c46a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(s.x - 6, s.y - 6); ctx.lineTo(s.x + 6, s.y + 6); ctx.moveTo(s.x + 6, s.y - 6); ctx.lineTo(s.x - 6, s.y + 6); ctx.stroke();
      ctx.fillStyle = '#f4efe0'; ctx.fillText(`${Math.max(0, x.e - st.day)}g`, s.x, s.y + 22);
    }
  }
  // zafer noktası modu: büyük şehirlerde VP sayısı
  function drawVpMode(ctx, z) {
    ctx.font = '700 11px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const min = z < 1.2 ? 15 : z < 2 ? 8 : 3;
    for (let i = 0; i < NP; i++) {
      const v = P[i].vp || 0; if (v < min) continue;
      const s = visible(G.nodeX[i], G.nodeY[i], 20); if (!s) continue;
      const w = v >= 10 ? 20 : 16;
      ctx.fillStyle = 'rgba(20,16,10,0.85)'; ctx.fillRect(s.x - w / 2, s.y + 6, w, 13);
      ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 1; ctx.strokeRect(s.x - w / 2, s.y + 6, w, 13);
      ctx.fillStyle = '#f2d27a'; ctx.fillText(String(v), s.x, s.y + 12.5);
    }
  }
  // deniz üstünlüğü haritası: her deniz bölgesinde oyuncunun (ve müttefiklerinin) üstünlüğü
  let seaCache = null;
  function drawSeaMode(ctx, z) {
    const st = G.st, pl = st.player; if (!pl || !G.navalSupremacy) return;
    if (!seaCache || seaCache.d !== st.day) {
      const v = new Float32Array(SEAS.length).fill(-1);
      const busy = new Set(); for (const c of Object.values(st.C)) if (c.alive && c.fleets && (c.tag === pl || G.sameFaction(c.tag, pl) || G.atWar(pl, c.tag))) for (const f of c.fleets) { busy.add(f.loc); for (const [n] of G.adj[f.loc]) busy.add(n); }
      for (let s = 0; s < SEAS.length; s++) if (busy.has(NP + s)) v[s] = G.navalSupremacy(pl, NP + s);
      seaCache = { d: st.day, v };
    }
    const r = Math.max(8, Math.min(22, 14 * z));
    ctx.font = '700 11px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let s = 0; s < SEAS.length; s++) {
      const sc = visible(SEAS[s].x, SEAS[s].y, r); if (!sc) continue;
      const v = seaCache.v[s];
      ctx.fillStyle = v < 0 ? 'rgba(120,140,160,0.18)' : v > 0.6 ? 'rgba(90,190,110,0.45)' : v > 0.4 ? 'rgba(230,190,80,0.45)' : 'rgba(220,80,60,0.5)';
      ctx.beginPath(); ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2); ctx.fill();
      if (v >= 0) { ctx.fillStyle = '#f4efe0'; ctx.fillText('%' + Math.round(v * 100), sc.x, sc.y); }
    }
  }
  function visible(x, y, pad) { const s = R.toScreen(x, y); return s.x > -pad && s.y > -pad && s.x < R.w + pad && s.y < R.h + pad ? s : null; }

  function drawLabels(ctx, z) {
    const st = G.st;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (R.mode === 'pol' || R.mode === 'fac') {
      for (const L of labels) {
        const pxw = L.w * z;
        if (pxw < 46) continue;
        const s = visible(L.x, L.y, 200); if (!s) continue;
        const name = (R.mode === 'fac' && st.C[L.tag]?.fac ? G.cname(L.tag) : G.cname(L.tag)).toLocaleUpperCase('tr');
        let size = Math.min(34, Math.max(9, pxw / (name.length * 0.62)));
        if (z > 3.2 && size > 18) size = 18;
        ctx.font = `600 ${size}px "Barlow Semi Condensed", "Arial Narrow", sans-serif`;
        ctx.letterSpacing = `${Math.round(size * 0.12)}px`;
        ctx.fillStyle = `rgba(14,16,12,${z > 3 ? 0.35 : 0.55})`;
        ctx.fillText(name, s.x, s.y);
      }
      ctx.letterSpacing = '0px';
    }
    // şehirler: büyükten küçüğe, çakışmayanlar yazılır; yakınlaştıkça daha çok şehir
    if (z > 1.4) {
      const minVp = z > 3.4 ? 1 : z > 2.4 ? 2 : z > 1.9 ? 3 : 10;
      if (!R._cityOrder) R._cityOrder = P.map((_, i) => i).filter((i) => !P[i].n.startsWith('#')).sort((a, b) => P[b].vp - P[a].vp);
      const boxes = [];
      const caps = new Set(); for (const c of Object.values(st.C)) if (c.alive && c.cap >= 0) caps.add(c.cap);
      ctx.font = `500 ${z > 4 ? 12 : 11}px "Barlow Semi Condensed", sans-serif`;
      for (const i of R._cityOrder) {
        const p = P[i];
        if (p.vp < minVp) break;
        const s = p.q ? visible(p.q[0], p.q[1], 40) : visible(p.x, p.y, 40); if (!s) continue;
        const isCap = caps.has(i);
        const r = isCap ? 4 : p.vp >= 10 ? 3 : 2;
        const tw = ctx.measureText(p.n).width;
        const bx = { x0: s.x - tw / 2 - 2, x1: s.x + tw / 2 + 2, y0: s.y - 14, y1: s.y + 10 };
        if (boxes.some((b) => bx.x0 < b.x1 && bx.x1 > b.x0 && bx.y0 < b.y1 && bx.y1 > b.y0)) { if (!isCap && p.vp < 10) continue; }
        boxes.push(bx);
        ctx.fillStyle = isCap ? '#f2d27a' : '#efe9d8'; ctx.strokeStyle = 'rgba(10,10,8,0.8)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); if (isCap) { starPath(ctx, s.x, s.y - 9, r + 1.5); } else ctx.arc(s.x, s.y - 9, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(10,12,8,0.88)'; ctx.strokeText(p.n, s.x, s.y + 3);
        ctx.fillStyle = '#efe9d8'; ctx.fillText(p.n, s.x, s.y + 3);
      }
    }
  }
  const cityShown = (i, z) => { if (z <= 1.4 || i >= NP || P[i].n.startsWith('#')) return false; const minVp = z > 3.4 ? 1 : z > 2.4 ? 2 : z > 1.9 ? 3 : 10; return (P[i].vp || 0) >= minVp; };
  // barış konferansı: bölge başına maliyet ya da talep eden ülke
  function drawConf(ctx) {
    const st = G.st, cf = st.conf; if (!cf) return;
    const me = st.player, p = cf.parts.find((q) => q.t === me);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 12px "Barlow Semi Condensed", sans-serif';
    for (const s of cf.states) {
      const P0 = P[s.c]; const sc = P0.q ? visible(P0.q[0], P0.q[1], 30) : visible(P0.x, P0.y, 30); if (!sc) continue;
      const fl = s.p.filter((n) => !cf.own[n]);
      let txt, bg, fg = '#14160f';
      if (!fl.length) { const o = cf.own[s.p[0]]; txt = G.cname(o.t).slice(0, 3).toLocaleUpperCase('tr'); bg = R.ccolor(o.t); fg = R.luminance(bg) > 0.55 ? '#14160f' : '#f4efe0'; }
      else { const cost = G.confCost(cf, me, fl); txt = String(cost); bg = p && cost <= p.pts ? '#f2d27a' : '#8d8a7c'; }
      const w = ctx.measureText(txt).width + 10;
      ctx.fillStyle = bg; ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sc.x - w / 2, sc.y - 9, w, 18, 4) : ctx.rect(sc.x - w / 2, sc.y - 9, w, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = fg; ctx.fillText(txt, sc.x, sc.y + 0.5);
    }
  }
  function starPath(ctx, x, y, r) {
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const rr = k % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  }

  // ---------- Hava katmanı ----------
  let wxPaths = {}, mudPat = null;
  R.showWeather = true;
  function buildWeather() {
    const s1 = tPaths(), s2 = tPaths(), md = tPaths(); let n1 = 0, n2 = 0, nm = 0;
    if (!HAS_ADD) { wxPaths = {}; return; }
    for (let i = 0; i < NP; i++) {
      const sn = G.wx.snow[i], m = G.wx.mud[i];
      if (sn > 0.55) { tProv(s2, i); n2++; } else if (sn > 0.15) { tProv(s1, i); n1++; }
      if (m > 0.3) { tProv(md, i); nm++; }
    }
    wxPaths = { snow1: n1 ? s1 : null, snow2: n2 ? s2 : null, mud: nm ? md : null };
  }
  // ikmal merkezleri (ikmal haritasında)
  function drawHubs(ctx) {
    const st = G.st; if (R.mode !== 'sup') return;
    const hubs = G.hubs[st.player] || [];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 10px "Barlow Semi Condensed", sans-serif';
    for (const [i, cap] of hubs) {
      const s = visible(G.nodeX[i], G.nodeY[i], 20); if (!s) continue;
      const big = i === st.C[st.player].cap;
      const built = !big && st.prov[i].hub; // inşa edilmiş ikmal merkezi: turkuaz çerçeve
      const r = big ? 9 : 7;
      ctx.fillStyle = 'rgba(10,12,9,0.85)'; ctx.fillRect(s.x - r, s.y - r - 12, r * 2, r * 2);
      ctx.strokeStyle = big ? '#f2d27a' : built ? '#6fd3c9' : '#cfe3b0'; ctx.lineWidth = built ? 2 : 1.5; ctx.strokeRect(s.x - r, s.y - r - 12, r * 2, r * 2);
      ctx.fillStyle = '#efe9d8'; ctx.fillText(String(Math.round(cap)), s.x, s.y - 12);
    }
  }

  // ---------- Hava bölgeleri: adlar ve kanat rozetleri ----------
  // hava üsleri: kendi ve müttefik üsler, kanat üs→bölge çizgileri, seçili kanadın menzil halkası
  function drawAirBases(ctx, z) {
    const st = G.st, c = st.C[st.player]; if (!c) return;
    const UI = G.UI, pickId = UI && (UI.airPick || UI.basePick);
    const wings = c.wings || [];
    const atBase = new Map(); for (const w of wings) if (w.b >= 0) atBase.set(w.b, (atBase.get(w.b) || 0) + 1);
    // menzil halkası
    const pw = pickId ? wings.find((w) => w.id === pickId) : null;
    if (pw && pw.b >= 0) {
      const s0 = R.toScreen(G.nodeX[pw.b], G.nodeY[pw.b]);
      const rad = G.wingRangeKm(c, pw) / 6371 * G.M.K / Math.cos(P[pw.b].lat * Math.PI / 180) * z;
      ctx.beginPath(); ctx.arc(s0.x, s0.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(127,200,248,0.08)'; ctx.fill();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(127,200,248,0.85)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
    }
    // kanat çizgileri
    ctx.strokeStyle = 'rgba(127,200,248,0.55)'; ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]);
    for (const w of wings) {
      if (w.b < 0 || w.r < 0) continue;
      const r = G.AIR.regions[w.r]; const a = R.toScreen(G.nodeX[w.b], G.nodeY[w.b]), b = R.toScreen(r.x, r.y);
      if (Math.abs(a.x - b.x) > R.w * 1.5) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    // üs simgeleri
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 10px "Barlow Semi Condensed", sans-serif';
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (!pr.ab) continue;
      const own = pr.c === st.player, ally = !own && G.sameFaction(st.player, pr.c) && !G.atWar(st.player, pr.c), enemy = G.atWar(st.player, pr.c);
      const nw = atBase.get(i) || 0;
      if (!own && !ally && !enemy) continue;
      if (!nw && z < (own ? 1.1 : 1.8)) continue;
      const p = P[i]; const sc = p.q ? visible(p.q[0], p.q[1] + 6, 20) : visible(p.x, p.y, 20); if (!sc) continue;
      const txt = '✈' + pr.ab + (nw ? '·' + nw : '');
      const w = ctx.measureText(txt).width + 8, y = sc.y + 12;
      ctx.fillStyle = enemy ? 'rgba(70,20,16,0.9)' : own ? 'rgba(14,30,44,0.92)' : 'rgba(26,34,30,0.85)';
      ctx.fillRect(sc.x - w / 2, y - 7, w, 14);
      ctx.strokeStyle = enemy ? '#e86a5a' : nw ? '#f2d27a' : '#7fc8f8'; ctx.lineWidth = 1; ctx.strokeRect(sc.x - w / 2, y - 7, w, 14);
      ctx.fillStyle = enemy ? '#ffc2b8' : '#e8f2fa'; ctx.fillText(txt, sc.x, y + 0.5);
    }
  }
  function drawAirRegions(ctx, z) {
    if (R.mode !== 'air') return;
    drawAirBases(ctx, z);
    const st = G.st, c = st.C[st.player];
    const mine = new Map();
    for (const w of (c && c.wings) || []) { if (w.r < 0) continue; let m = mine.get(w.r); if (!m) mine.set(w.r, (m = { fig: 0, cas: 0, bom: 0, n: 0 })); m[w.e]++; m.n += w.n; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of G.AIR.regions) {
      const s = visible(r.x, r.y, 60); if (!s) continue;
      const m = mine.get(r.id);
      if (z > 0.9 || m) {
        ctx.font = `600 ${r.land ? 11 : 10}px "Barlow Semi Condensed", sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,9,0.85)'; ctx.strokeText(r.n, s.x, s.y - (m ? 16 : 0));
        ctx.fillStyle = r.land ? '#efe9d8' : '#a9c8e6'; ctx.fillText(r.n, s.x, s.y - (m ? 16 : 0));
      }
      if (m) {
        const label = ['fig', 'cas', 'bom'].filter((e) => m[e]).map((e) => ({ fig: '✈', cas: '⬇', bom: '✦' })[e] + m[e]).join(' ');
        ctx.font = '700 12px "Barlow Semi Condensed", sans-serif';
        const w = ctx.measureText(label).width + 14;
        ctx.fillStyle = 'rgba(16,22,30,0.92)'; ctx.fillRect(s.x - w / 2, s.y - 9, w, 18);
        ctx.strokeStyle = '#7fc8f8'; ctx.lineWidth = 1.4; ctx.strokeRect(s.x - w / 2, s.y - 9, w, 18);
        ctx.fillStyle = '#e8f2fa'; ctx.fillText(label, s.x, s.y);
      }
    }
  }

  // ---------- Ordu cepheleri (HOI4 tarzı) ----------
  const playerArmies = () => { const c = G.st.C[G.st.player]; return c && c.alive ? c.armies || [] : []; };
  function frontSegs(a) {
    const st = G.st, out = [];
    for (const i of a.front || []) for (const j of P[i].a) {
      const ec = st.prov[j].c;
      if (a.vs ? ec !== a.vs : !G.atWar(st.player, ec)) continue;
      const L = pairMap.get(pairKey(i, j)); if (L) for (const pts of L) out.push(pts);
    }
    return out;
  }
  function drawFronts(ctx, z) {
    for (const a of playerArmies()) {
      if (!a.front || !a.front.length) continue;
      const segs = frontSegs(a); if (!segs.length) continue;
      const sel = R.sel.army === a.id;
      const col = G.armyColor(a);
      const pa = new Path2D(); for (const pts of segs) addLine(pa, pts);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.lineWidth = (sel ? 8 : 6) / z; ctx.stroke(pa);
      ctx.strokeStyle = col; ctx.lineWidth = (sel ? 4.5 : 3.2) / z;
      if (a.ord === 'hold') ctx.setLineDash([6 / z, 4 / z]);
      ctx.stroke(pa); ctx.setLineDash([]);
      // taarruz: cephe boyunca kırmızı dişler
      if (a.ord === 'atk') { ctx.strokeStyle = 'rgba(214,72,52,0.9)'; ctx.lineWidth = 1.6 / z; ctx.setLineDash([2 / z, 5 / z]); ctx.stroke(pa); ctx.setLineDash([]); }
      ctx.lineCap = 'butt';
    }
  }
  R.armyAnchor = (a) => {
    // cephenin hedefe en yakın noktası; yoksa birliklerin ağırlık merkezi
    const st = G.st;
    if (a.front && a.front.length) {
      let best = a.front[0];
      if (a.goal != null) { let bd = Infinity; for (const i of a.front) { const d = G.dist(i, a.goal); if (d < bd) { bd = d; best = i; } } }
      else { let sx = 0, sy = 0; for (const i of a.front) { sx += R.wrapDx(G.nodeX[i] - G.nodeX[a.front[0]]); sy += G.nodeY[i]; } const cx = G.nodeX[a.front[0]] + sx / a.front.length, cy = sy / a.front.length; let bd = Infinity; for (const i of a.front) { const d = Math.hypot(R.wrapDx(G.nodeX[i] - cx), G.nodeY[i] - cy); if (d < bd) { bd = d; best = i; } } }
      return best;
    }
    const us = st.units.filter((u) => u.t === st.player && u.army === a.id && u.loc < NP);
    return us.length ? us[Math.floor(us.length / 2)].loc : -1;
  };
  // tek ok: gölge, gövde ve uç (sonraki aşamalar kesik ve soluk)
  function arrow(ctx, s0, s1, col, wdt, later) {
    const span = M.W * R.cam.z; while (s1.x - s0.x > span / 2) s1.x -= span; while (s0.x - s1.x > span / 2) s1.x += span;
    const dx = s1.x - s0.x, dy = s1.y - s0.y, len = Math.hypot(dx, dy); if (len < 6) return;
    const nx = -dy / len, ny = dx / len, bend = Math.min(60, len * 0.18);
    const cx = (s0.x + s1.x) / 2 + nx * bend, cy = (s0.y + s1.y) / 2 + ny * bend;
    ctx.lineCap = 'round';
    if (later) ctx.setLineDash([wdt * 1.6, wdt * 1.1]);
    ctx.strokeStyle = 'rgba(10,10,8,0.8)'; ctx.lineWidth = wdt + 3; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo(cx, cy, s1.x, s1.y); ctx.stroke();
    ctx.strokeStyle = col; ctx.globalAlpha = later ? 0.6 : 0.85; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo(cx, cy, s1.x, s1.y); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    const ang = Math.atan2(s1.y - cy, s1.x - cx), hl = wdt * 2.6;
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.lineWidth = 1.5; ctx.globalAlpha = later ? 0.7 : 1;
    ctx.beginPath(); ctx.moveTo(s1.x + Math.cos(ang) * hl * 0.5, s1.y + Math.sin(ang) * hl * 0.5); ctx.lineTo(s1.x - Math.cos(ang - 0.5) * hl, s1.y - Math.sin(ang - 0.5) * hl); ctx.lineTo(s1.x - Math.cos(ang + 0.5) * hl, s1.y - Math.sin(ang + 0.5) * hl); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
  function drawArrows(ctx, z) {
    for (const a of playerArmies()) {
      if (a.goal == null) continue;
      const from = R.armyAnchor(a); if (from < 0) continue;
      const col = a.ord === 'atk' ? '#d6483a' : G.armyColor(a);
      const wdt = Math.max(5, Math.min(12, 4 + z * 2));
      const chain = [from, a.goal, ...(a.goals || [])];
      for (let k = 0; k < chain.length - 1; k++) {
        const s0 = R.toScreen(G.nodeX[chain[k]], G.nodeY[chain[k]]), s1 = R.toScreen(G.nodeX[chain[k + 1]], G.nodeY[chain[k + 1]]);
        arrow(ctx, s0, s1, col, k ? wdt * 0.8 : wdt, k > 0);
        if (k > 0 || chain.length > 2) { ctx.fillStyle = '#14160f'; ctx.font = '800 11px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.beginPath(); ctx.arc(s1.x, s1.y - 16, 8, 0, Math.PI * 2); ctx.fillStyle = '#f2d27a'; ctx.fill(); ctx.fillStyle = '#14160f'; ctx.fillText(String(k + 1), s1.x, s1.y - 15.5); }
      }
    }
    drawFallbacks(ctx, z);
  }
  // savunma hatları (HOI4 geri çekilme hattı): eyalet merkezlerinden geçen dişli çizgi
  function fbLine(ctx, line, col, sel) {
    if (!line || !line.length) return;
    const pts = line.map((n) => R.toScreen(G.nodeX[n], G.nodeY[n]));
    for (let k = 1; k < pts.length; k++) { const span = M.W * R.cam.z; while (pts[k].x - pts[k - 1].x > span / 2) pts[k].x -= span; while (pts[k - 1].x - pts[k].x > span / 2) pts[k].x += span; }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.lineWidth = sel ? 7 : 6; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = sel ? 3.5 : 2.6; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    // dişler: hattın bir yanına kısa çizgiler
    ctx.lineWidth = 2; ctx.strokeStyle = col;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy); if (L < 4) continue;
      const nx = -dy / L, ny = dx / L, step = 9;
      for (let t = step / 2; t < L; t += step) { const x = a.x + dx * t / L, y = a.y + dy * t / L; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * 5, y + ny * 5); ctx.stroke(); }
    }
    for (const p of [pts[0], pts[pts.length - 1]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(10,10,8,0.9)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  function drawFallbacks(ctx) {
    for (const a of playerArmies()) if (a.fb && a.fb.length) fbLine(ctx, a.fb, G.armyColor(a), R.sel.army === a.id || a.ord === 'fb');
    if (R.fbPreview) fbLine(ctx, R.fbPreview, '#f2d27a', true);
  }
  // Ordu etiketi: komutan, emir ve planlama çubuğu (dokununca ordu seçilir)
  function drawArmyTags(ctx, z) {
    const st = G.st, c = st.C[st.player]; if (!c) return;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // uzak zoomda kısa etiket (ordu numarası); etiketler birbirinin üstüne binmez
    const short = z < 0.95, placed = [];
    for (const a of playerArmies()) {
      const n = R.armyAnchor(a); if (n < 0) continue;
      const s = visible(G.nodeX[n], G.nodeY[n], 80); if (!s) continue;
      const gen = a.gen ? G.genById(c, a.gen) : null;
      const label = short ? `${a.no || ''}. Ordu` : `${a.no || ''}. ${gen ? gen.n.replace(/^(Gen\.|Mareşal|Mar\.)\s*/, '') : 'Komutansız'}`;
      ctx.font = '700 10.5px "Barlow Semi Condensed", sans-serif';
      const w = Math.max(short ? 48 : 60, ctx.measureText(label).width + 24), h = 21;
      const x = s.x - w / 2; let y = s.y - 40;
      for (let t = 0; t < 4 && placed.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y); t++) y -= h + 3;
      placed.push({ x, y, w, h });
      const sel = R.sel.army === a.id;
      ctx.fillStyle = 'rgba(8,10,8,0.55)'; ctx.fillRect(x + 1.5, y + 2, w, h);
      ctx.fillStyle = 'rgba(22,26,20,0.95)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = G.armyColor(a); ctx.fillRect(x, y, 5, h);
      ctx.strokeStyle = sel ? '#f2d27a' : 'rgba(200,190,160,0.5)'; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(x, y, w, h);
      // emir simgesi
      const ox = x + 12, oy = y + 9;
      ctx.fillStyle = a.ord === 'atk' ? '#e0574a' : a.ord === 'def' ? '#7fb069' : '#a9a28a';
      ctx.beginPath();
      if (a.ord === 'atk') { ctx.moveTo(ox - 4, oy - 4); ctx.lineTo(ox + 4, oy); ctx.lineTo(ox - 4, oy + 4); }
      else if (a.ord === 'def') { ctx.moveTo(ox - 4, oy - 4); ctx.lineTo(ox + 4, oy - 4); ctx.lineTo(ox + 4, oy + 1); ctx.lineTo(ox, oy + 5); ctx.lineTo(ox - 4, oy + 1); }
      else { ctx.rect(ox - 4, oy - 4, 3, 8); ctx.rect(ox + 1, oy - 4, 3, 8); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#efe9d8'; ctx.fillText(label, x + 19, y + 8.5);
      // planlama çubuğu
      const mx = G.maxPlan(c, a);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 8, y + h - 6, w - 14, 3);
      ctx.fillStyle = a.ord === 'atk' ? '#e0574a' : '#7fb069'; ctx.fillRect(x + 8, y + h - 6, (w - 14) * Math.min(1, (a.plan || 0) / Math.max(0.01, mx)), 3);
      R.counters.push({ x, y, w, h, n, tag: st.player, army: a.id });
    }
  }

  function drawPaths(ctx) {
    const st = G.st;
    const seen = new Set();
    for (const u of st.units) {
      if (u.t !== st.player || !u.path.length) continue;
      const selected = R.sel.units.has(u.id);
      const key = u.loc + '>' + u.path[u.path.length - 1];
      if (seen.has(key) && !selected) continue; seen.add(key);
      ctx.strokeStyle = selected ? 'rgba(242,210,122,0.95)' : 'rgba(239,233,216,0.6)';
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      let s = R.toScreen(G.nodeX[u.loc], G.nodeY[u.loc]); ctx.moveTo(s.x, s.y);
      let prev = s;
      for (const n of u.path) { const q = R.toScreen(G.nodeX[n], G.nodeY[n]); const span = M.W * R.cam.z; while (q.x - s.x > span / 2) q.x -= span; while (s.x - q.x > span / 2) q.x += span; ctx.lineTo(q.x, q.y); prev = s; s = q; }
      ctx.stroke(); ctx.setLineDash([]);
      // ok ucu
      const a = Math.atan2(s.y - prev.y, s.x - prev.x);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 10 * Math.cos(a - 0.4), s.y - 10 * Math.sin(a - 0.4)); ctx.lineTo(s.x - 10 * Math.cos(a + 0.4), s.y - 10 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    }
  }

  function drawBattles(ctx) {
    const st = G.st;
    R.battleMarks = [];
    for (const b of G.battles || []) {
      const mx = G.nodeX[b.n] + R.wrapDx(G.nodeX[b.from] - G.nodeX[b.n]) / 3, my = (G.nodeY[b.n] * 2 + G.nodeY[b.from]) / 3;
      const s = visible(mx, my, 30); if (!s) continue;
      const mine = b.att === st.player || G.sameFaction(b.att, st.player) ? b.adv : (b.def === st.player || G.sameFaction(b.def, st.player)) ? 1 - b.adv : null;
      const col = mine == null ? '#d8d0b8' : mine > 0.55 ? '#7fb069' : mine < 0.45 ? '#d4553f' : '#e0a83a';
      const pulse = 1 + 0.12 * Math.sin(R.t / 180);
      ctx.fillStyle = 'rgba(14,14,12,0.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, 11 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      // çapraz kılıçlar
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(s.x - 5, s.y - 5); ctx.lineTo(s.x + 5, s.y + 5); ctx.moveTo(s.x + 5, s.y - 5); ctx.lineTo(s.x - 5, s.y + 5); ctx.stroke();
      if (mine != null) {
        ctx.fillStyle = 'rgba(14,14,12,0.9)'; ctx.fillRect(s.x - 15, s.y + 13, 30, 5);
        ctx.fillStyle = col; ctx.fillRect(s.x - 14, s.y + 14, 28 * Math.max(0.03, Math.min(1, mine)), 3);
      }
      R.battleMarks.push({ x: s.x - 16, y: s.y - 16, w: 32, h: 36, b });
    }
  }

  function drawFleets(ctx, z) {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.fleets || !c.fleets.length) continue;
      const mine = c.tag === st.player, rel = mine || G.sameFaction(c.tag, st.player), enemy = G.atWar(c.tag, st.player);
      if (!rel && !enemy && z < 1.6) continue;
      c.fleets.forEach((f, k) => {
        let x0 = G.nodeX[f.loc], y0 = G.nodeY[f.loc];
        if (f.path.length && f.prog > 0) { const n = f.path[0]; const t = Math.min(1, f.prog / Math.max(1, G.dist(f.loc, n))); x0 += R.wrapDx(G.nodeX[n] - x0) * t; y0 += (G.nodeY[n] - y0) * t; }
        const s = visible(x0, y0, 40); if (!s) return;
        const w = 34, h = 18, x = s.x - w / 2 + (k % 3) * 8, y = s.y - h / 2 - 14 + (k % 3) * 6;
        const sel = R.sel.fleet === f.id;
        ctx.fillStyle = 'rgba(8,10,8,0.55)'; ctx.fillRect(x + 1.5, y + 2, w, h);
        ctx.fillStyle = '#1d3550'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = R.ccolor(c.tag); ctx.fillRect(x, y, 6, h);
        ctx.strokeStyle = sel ? '#f2d27a' : enemy ? '#d65a43' : 'rgba(200,220,240,0.7)'; ctx.lineWidth = sel ? 2.5 : 1.2; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#e8eef4'; ctx.font = '700 11px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⚓' + Math.round(G.fleetShips(f)), x + 20, y + h / 2);
        if (mine && f.path.length) {
          ctx.strokeStyle = sel ? 'rgba(242,210,122,0.9)' : 'rgba(170,200,230,0.6)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(s.x, s.y);
          let px = s.x; for (const n of f.path) { const q = R.toScreen(G.nodeX[n], G.nodeY[n]); const span = M.W * R.cam.z; while (q.x - px > span / 2) q.x -= span; while (px - q.x > span / 2) q.x += span; ctx.lineTo(q.x, q.y); px = q.x; }
          ctx.stroke(); ctx.setLineDash([]);
        }
        R.counters.push({ x, y, w, h, n: f.loc, tag: c.tag, fleet: f.id });
      });
    }
    for (const b of G.navalBattles || []) {
      const s = visible(G.nodeX[b.loc], G.nodeY[b.loc], 30); if (!s) continue;
      ctx.strokeStyle = '#7fb3e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y + 8, 13 + 2 * Math.sin(R.t / 160), 0, Math.PI * 2); ctx.stroke();
      (R.battleMarks || (R.battleMarks = [])).push({ x: s.x - 15, y: s.y - 7, w: 30, h: 30, b, naval: 1 });
    }
  }
  // NATO simgesi türü (şablondan)
  R.kindOf = (u) => {
    const t = G.T(u.t, u.u);
    if (t._k) return t._k;
    return (t._k = t.tanks > 0 ? 'arm' : t.mob > 0.5 ? 'mot' : t.s === 'SÜV' ? 'cav' : t.s === 'DAĞ' ? 'mtn' : t.s === 'DNZ' ? 'mar' : t.para >= 0.75 ? 'para' : 'inf');
  };
  function drawNato(ctx, kind, x, y, w, h, ink) {
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.3;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    if (kind === 'arm') { ctx.ellipse(x + w / 2, y + h / 2, w * 0.32, h * 0.26, 0, 0, Math.PI * 2); ctx.stroke(); return; }
    if (kind === 'cav') { ctx.moveTo(x, y + h); ctx.lineTo(x + w, y); ctx.stroke(); return; }
    ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
    if (kind === 'mot') { ctx.beginPath(); ctx.arc(x + w * 0.3, y + h + 2.2, 1.5, 0, Math.PI * 2); ctx.arc(x + w * 0.7, y + h + 2.2, 1.5, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'mtn') { ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.55); ctx.lineTo(x + w / 2 + 3.5, y + h); ctx.lineTo(x + w / 2 - 3.5, y + h); ctx.closePath(); ctx.fill(); }
    else if (kind === 'mar') { ctx.beginPath(); ctx.arc(x + w / 2, y + h - 1, 3, 0, Math.PI); ctx.stroke(); }
    else if (kind === 'para') { ctx.beginPath(); ctx.arc(x + w / 2 - 3.2, y + 3.4, 3.2, Math.PI, 0); ctx.arc(x + w / 2 + 3.2, y + 3.4, 3.2, Math.PI, 0); ctx.stroke(); }
  }
  R.drawNato = drawNato;
  function drawCounter(ctx, x, y, gl, tag, opts) {
    const st = G.st, w = 46, h = 25;
    const col = R.ccolor(tag);
    const light = luminance(col) > 0.55, ink = light ? '#14160f' : '#f4efe0';
    const kinds = {}; for (const u of gl) { const k = R.kindOf(u); kinds[k] = (kinds[k] || 0) + 1; }
    const kind = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0];
    let org = 0, os = 0, str = 0, fighting = false, moving = false;
    for (const u of gl) { const sOrg = (u._s && u._s.org) || 60; org += Math.max(0, u.org); os += sOrg; str += u.str; if (G.inBattle && G.inBattle.has(u)) fighting = true; if (u.path.length) moving = true; }
    ctx.fillStyle = 'rgba(8,10,8,0.6)'; ctx.fillRect(x + 2, y + 2.5, w, h);
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    // kabartma: üstte ışık, altta gölge şeridi
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x, y, w, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fillRect(x, y + h - 6, w, 6);
    // resimli sayaç: ülke üniformalı siluet; yüklenmemişse NATO simgesi
    const sp = R.ctrArt && G.art && G.art.sprite ? G.art.sprite(G.art.kindOf(gl[0]), tag) : null;
    if (sp) { ctx.fillStyle = 'rgba(244,239,224,0.22)'; ctx.fillRect(x + 2, y + 2, 26, 16); ctx.drawImage(sp, x + 2, y + 2, 26, 16); }
    else drawNato(ctx, kind, x + 4, y + 3.5, 18, 11.5, ink);
    ctx.fillStyle = ink; ctx.font = '800 13.5px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(gl.length), x + 37, y + 9.5);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + 1, y + h - 5.5, w - 2, 5);
    ctx.fillStyle = '#86c06e'; ctx.fillRect(x + 1, y + h - 5.5, (w - 2) * Math.max(0, Math.min(1, org / os)), 2.4);
    ctx.fillStyle = '#e6c75a'; ctx.fillRect(x + 1, y + h - 2.6, (w - 2) * Math.min(1, str / gl.length), 2.2);
    const sel = opts.sel;
    ctx.strokeStyle = sel ? '#f2d27a' : fighting ? (Math.sin(R.t / 140) > 0 ? '#ff6a50' : '#8a2a1e') : opts.enemy ? '#d4553f' : 'rgba(10,10,8,0.9)';
    ctx.lineWidth = sel ? 2.6 : fighting ? 2 : 1.3;
    ctx.strokeRect(x, y, w, h);
    if (opts.merged) { ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.lineWidth = 1; ctx.strokeRect(x + 3, y - 3, w, h); ctx.strokeStyle = sel ? '#f2d27a' : 'rgba(244,239,224,0.35)'; ctx.strokeRect(x + 3.5, y - 3.5, w - 1, 2); }
    if (opts.armyCol) { ctx.fillStyle = opts.armyCol; ctx.beginPath(); ctx.moveTo(x + w - 8, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + 8); ctx.closePath(); ctx.fill(); }
    if (moving && tag === st.player) { ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.moveTo(x + w + 2, y + 6); ctx.lineTo(x + w + 7, y + 11); ctx.lineTo(x + w + 2, y + 16); ctx.closePath(); ctx.fill(); }
    if (gl.some((u) => u.sr)) { ctx.fillStyle = '#7fc8f8'; ctx.fillRect(x, y - 3, w, 2); }
    // çıkarma hazırlığı: üstte mavi ilerleme çubuğu
    const iu = gl.find((u) => u.inv); if (iu) { const yy = gl.some((u) => u.sr) ? y - 9 : y - 5; ctx.fillStyle = 'rgba(10,10,8,0.8)'; ctx.fillRect(x, yy, w, 4); ctx.fillStyle = '#5fa8e8'; ctx.fillRect(x + 1, yy + 1, (w - 2) * Math.min(1, iu.inv.p / iu.inv.n), 2); }
    // tecrübe rozeti: düzenli ve üstü için altın şeritler (HOI4)
    let xs = 0; for (const u of gl) xs += u.xp ?? 0.25;
    const xl = G.xpIdx ? G.xpIdx(xs / gl.length) - 1 : 0;
    if (xl > 0) { ctx.fillStyle = '#e8c35a'; for (let k = 0; k < xl; k++) { const cx = x + 30 + k * 5; ctx.beginPath(); ctx.moveTo(cx, y + 14); ctx.lineTo(cx + 2, y + 16.5); ctx.lineTo(cx + 4, y + 14); ctx.lineTo(cx + 4, y + 15.5); ctx.lineTo(cx + 2, y + 18); ctx.lineTo(cx, y + 14.5); ctx.closePath(); ctx.fill(); } }
    const vu = gl.find((u) => u.vol); if (vu) { ctx.fillStyle = R.ccolor(vu.vol); ctx.fillRect(x, y + h - 5, 5, 5); ctx.strokeStyle = 'rgba(10,10,8,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(x, y + h - 5, 5, 5); } // gönüllü: gönderenin renginde köşe işareti
    return { w, h };
  }
  function drawUnits(ctx, z) {
    const st = G.st, cs = R.ctrBig ? 1.25 : 1;
    R.counters = [];
    drawFleets(ctx, z);
    if (!G.unitsAt) return;
    const showAll = z > 2.6;
    // uzak zoom (HOI4 strateji görünümü): üst üste binen sayaçlar ülke ve ordu bazında tek sayaçta birleşir
    const merge = z < 1.9;
    const pc = st.C[st.player];
    const armyCol = new Map(); for (const a of (pc && pc.armies) || []) armyCol.set(a.id, G.armyColor(a));
    const items = [];
    for (const key in G.unitsAt) {
      const L = G.unitsAt[key]; if (!L || !L.length) continue;
      const n = +key;
      const s = visible(G.nodeX[n], G.nodeY[n], 40); if (!s) continue;
      const groups = new Map();
      for (const u of L) {
        // birleşik görünümde oyuncunun tümenleri ordularına göre ayrılır
        const gk = merge && u.t === st.player ? u.t + '|' + (u.army || 0) : u.t;
        let gl = groups.get(gk); if (!gl) groups.set(gk, (gl = [])); gl.push(u);
      }
      for (const [gk, gl] of groups) {
        const tag = gl[0].t;
        const mineOrAlly = tag === st.player || G.sameFaction(tag, st.player);
        const enemy = G.atWar(tag, st.player);
        if (!showAll && !mineOrAlly && !enemy) continue;
        if (z < 0.75 && !enemy && tag !== st.player) continue;
        items.push({ gk, tag, gl, n, x: s.x, y: s.y, enemy });
      }
    }
    let draw = items;
    if (merge) {
      // ızgara üzerinde açgözlü kümeleme: aynı anahtarlı ve yakın sayaçlar birleşir
      const CW = 50 * cs, CH = 30 * cs, grid = new Map(), out = [];
      items.sort((a, b) => b.gl.length - a.gl.length);
      for (const it of items) {
        const cx = Math.floor(it.x / CW), cy = Math.floor(it.y / CH);
        let hit = null;
        for (let dx = -1; dx <= 1 && !hit; dx++) for (let dy = -1; dy <= 1 && !hit; dy++) {
          const L = grid.get((cx + dx) + ',' + (cy + dy)); if (!L) continue;
          for (const c of L) if (c.gk === it.gk && Math.abs(c.x - it.x) < CW && Math.abs(c.y - it.y) < CH) { hit = c; break; }
        }
        if (hit) { hit.gl = hit.gl.concat(it.gl); hit.merged = true; continue; }
        const c = { ...it, gl: it.gl.slice(), merged: false };
        out.push(c); const k2 = cx + ',' + cy; (grid.get(k2) || grid.set(k2, []).get(k2)).push(c);
      }
      draw = out;
    }
    // aynı noktadaki farklı sayaçlar alt alta dizilir; oyuncunun sayaçları önde
    draw.sort((a, b) => (a.tag === st.player ? 0 : 1) - (b.tag === st.player ? 0 : 1));
    const stackAt = new Map();
    for (const it of draw) {
      const sk = Math.round(it.x / 8) + ',' + Math.round(it.y / 8);
      const k = stackAt.get(sk) || 0; stackAt.set(sk, k + 1);
      // şehir adı görünüyorsa sayaç yazının altına iner (ad ile sayaç çakışmaz)
      let y0 = it.y - 1;
      if (cityShown(it.n, z)) { const q = P[it.n].q, c = q ? visible(q[0], q[1], 80) : null; y0 = c ? Math.max(y0, c.y + 11) : it.y + 11; }
      const x = it.x - 23 * cs + k * 6 * cs, y = y0 + k * 26 * cs;
      const sel = it.gl.some((u) => R.sel.units.has(u.id));
      const ac = it.tag === st.player ? it.gl.find((u) => u.army && armyCol.has(u.army)) : null;
      ctx.save(); ctx.translate(x, y); if (cs !== 1) ctx.scale(cs, cs);
      const { w, h } = drawCounter(ctx, 0, 0, it.gl, it.tag, { sel, enemy: it.enemy, armyCol: ac ? armyCol.get(ac.army) : null, merged: it.merged });
      ctx.restore();
      R.counters.push({ x, y, w: w * cs, h: h * cs, n: it.n, tag: it.tag, units: it.gl, merged: it.merged });
    }
  }
  const lumCache = new Map();
  function luminance(h) { let v = lumCache.get(h); if (v == null) { const [r, gg, b] = hexRgb(h); v = (0.299 * r + 0.587 * gg + 0.114 * b) / 255; lumCache.set(h, v); } return v; }
  R.luminance = luminance;

  R.init = (cv) => {
    R.cv = cv; R.ctx = cv.getContext('2d');
    R.resize();
    g.addEventListener('resize', () => { R.resize(); });
  };
  R.setMode = (m) => { R.mode = m; R.mapDirty = 1; R.dirty = 1; };
})(window);
