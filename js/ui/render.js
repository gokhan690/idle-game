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
  const provRings = P.map((p) => p.p.flat().map(decode));
  const provPath = provRings.map((rings) => { const pa = new Path2D(); for (const r of rings) { pa.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) pa.lineTo(r[i], r[i + 1]); pa.closePath(); } return pa; });
  const borders = M.borders.map(([a, b, e]) => ({ a, b, pts: decode(e) }));
  // eyalet çifti -> ortak sınır parçaları (cephe çizgileri için)
  const pairKey = (a, b) => (a < b ? a * 8192 + b : b * 8192 + a);
  const pairMap = new Map();
  for (const bd of borders) if (bd.b >= 0) { const k = pairKey(bd.a, bd.b); let L = pairMap.get(k); if (!L) pairMap.set(k, (L = [])); L.push(bd.pts); }
  const coastPath = new Path2D();
  for (const bd of borders) if (bd.b < 0) addLine(coastPath, bd.pts);
  const seaPath = new Path2D();
  for (const s of M.seaLines) addLine(seaPath, decode(s));
  function addLine(path, pts) { path.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]); }
  R.provPath = provPath;

  // ---------- Renk yardımcıları ----------
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (h, k, t) => { const a = hexRgb(h), b = hexRgb(k); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; };
  R.ccolor = (tag) => (g.COUNTRY_DEFS[tag] ? g.COUNTRY_DEFS[tag].c : '#777777');
  R.mix = mix;

  // ---------- Grup yolları (sahiplik değişince yeniden) ----------
  let fillGroups = new Map(), occGroups = new Map(), countryBorder = new Path2D(), provBorder = new Path2D(), regionBorder = new Path2D(), labels = [];
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
      if (R.mode === 'occ') return pr.rs == null ? 'nooc:' + pr.c : 'occ' + Math.min(5, Math.floor(pr.rs * 7));
      if (R.mode === 'sup') {
        const pl = st.player, av = G.supAvail[pl];
        if (!av || !(pr.c === pl || (G.friendly(pl, pr.c) && !G.atWar(pl, pr.c)))) return 'nosup:' + pr.c;
        const v = av[i]; return 'sup' + (v < 0.6 ? 0 : v < 1.5 ? 1 : v < 3 ? 2 : v < 5 ? 3 : v < 8 ? 4 : 5);
      }
      return pr.c;
    };
    const hasAdd = typeof Path2D.prototype.addPath === 'function';
    for (let i = 0; i < NP; i++) {
      const k = keyOf(i);
      let pa = fillGroups.get(k); if (!pa) fillGroups.set(k, (pa = hasAdd ? new Path2D() : []));
      if (hasAdd) pa.addPath(provPath[i]); else pa.push(i);
      const pr = st.prov[i];
      if (R.mode === 'peace' && st.conf && st.conf.sOf[i] != null && !st.conf.own[i] && st.conf.ctrl[i] !== st.conf.L) { const ct = st.conf.ctrl[i]; let o = occGroups.get(ct); if (!o) occGroups.set(ct, (o = hasAdd ? new Path2D() : [])); if (hasAdd) o.addPath(provPath[i]); else o.push(i); }
      if (R.mode === 'pol' && pr.o !== pr.c) { let o = occGroups.get(pr.o); if (!o) occGroups.set(pr.o, (o = hasAdd ? new Path2D() : [])); if (hasAdd) o.addPath(provPath[i]); else o.push(i); }
    }
    countryBorder = new Path2D(); provBorder = new Path2D(); regionBorder = new Path2D();
    for (const bd of borders) {
      if (bd.b < 0) continue;
      const ca = st.prov[bd.a].c, cb = st.prov[bd.b].c;
      addLine(ca !== cb ? countryBorder : provBorder, bd.pts);
      if (R.mode === 'air' && G.regionOf(bd.a) !== G.regionOf(bd.b)) addLine(regionBorder, bd.pts);
      if (R.mode === 'peace' && st.conf) { const sa = st.conf.sOf[bd.a], sb = st.conf.sOf[bd.b]; if (sa !== sb && (sa != null || sb != null)) addLine(regionBorder, bd.pts); }
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
    const cv = R.cv; R.dpr = Math.min(2, g.devicePixelRatio || 1);
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
  function stripePattern(color) {
    const c = document.createElement('canvas'); c.width = c.height = 12;
    const x = c.getContext('2d');
    x.strokeStyle = color; x.lineWidth = 3.2;
    x.beginPath(); x.moveTo(-3, 15); x.lineTo(15, -3); x.moveTo(-3, 3); x.lineTo(3, -3); x.moveTo(9, 15); x.lineTo(15, 9); x.stroke();
    return c;
  }
  const stripeCache = new Map();
  const AIRS_COLORS = ['#a8322a', '#c8682f', '#c9a640', '#7ea54c', '#3f8f4f'];
  const AIRN_COLORS = ['#4d5a6a', '#56634e', '#665a4c', '#4f5f63', '#5d5266', '#5a604a'];
  const SUP_COLORS = ['#a8322a', '#cc6a2c', '#d6a73a', '#a9b54a', '#6fa84d', '#3f8f4f'];
  const IND_COLORS = ['#2e3a2a', '#4b5a33', '#6b7a35', '#94913a', '#c0a03c', '#d98a37', '#e0663a'];

  // ---------- Çizim ----------
  R.draw = () => {
    const st = G.st, ctx = R.ctx, cam = R.cam, z = cam.z, dpr = R.dpr;
    if (!st) return;
    if (R.mode === 'sup' && R.supTick !== G.supTick) { R.supTick = G.supTick; R.mapDirty = 1; }
    if (R.mode === 'occ' && R.occDay !== (st.day / 10 | 0)) { R.occDay = st.day / 10 | 0; R.mapDirty = 1; }
    if (R.mode === 'air' && R.airDay !== (st.day / 5 | 0)) { R.airDay = st.day / 5 | 0; R.mapDirty = 1; }
    if (R.mapDirty || (G.mapDirty && performance.now() - (R.lastRebuild || 0) > 180)) { rebuild(); G.mapDirty = 0; R.lastRebuild = performance.now(); }
    if (G.wxDirty) { buildWeather(); G.wxDirty = 0; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // okyanus
    const grd = ctx.createLinearGradient(0, 0, 0, R.h);
    grd.addColorStop(0, '#16283a'); grd.addColorStop(1, '#10202f');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, R.w, R.h);
    const hw = R.w / 2 / z;
    for (let k = Math.floor((cam.x - hw) / M.W); k <= Math.floor((cam.x + hw) / M.W); k++) {
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (R.w / 2 - (cam.x - k * M.W) * z), dpr * (R.h / 2 - cam.y * z));
      // deniz bölgeleri
      ctx.strokeStyle = 'rgba(160,190,215,0.10)'; ctx.lineWidth = 1 / z; ctx.stroke(seaPath);
      // kıyı ışıması
      ctx.strokeStyle = 'rgba(120,170,200,0.18)'; ctx.lineWidth = 7 / z; ctx.lineJoin = 'round'; ctx.stroke(coastPath);
      // kara dolgusu
      for (const [k, pa] of fillGroups) {
        let col;
        if (R.mode === 'terrain') col = g.TERRAIN[+k.slice(2)].c;
        else if (R.mode === 'ind') col = IND_COLORS[+k.slice(3)];
        else if (R.mode === 'fac') { if (k.startsWith('fac:')) col = st.factions[k.slice(4)]?.c || '#777'; else col = mix(R.ccolor(k.slice(6)), '#808070', 0.75); }
        else if (R.mode === 'air') col = k.startsWith('airs') ? AIRS_COLORS[+k.slice(4)] : AIRN_COLORS[+k.slice(4)];
        else if (R.mode === 'peace') { const t = k.slice(3); col = k.startsWith('pk:') ? R.ccolor(t) : k.startsWith('pu:') ? mix(R.ccolor(t), '#d8d2bc', 0.35) : mix(R.ccolor(t), '#33362f', 0.78); }
        else if (R.mode === 'sup') { col = k.startsWith('nosup:') ? mix(R.ccolor(k.slice(6)), '#3a3d36', 0.75) : SUP_COLORS[+k.slice(3)]; }
        else if (R.mode === 'occ') { col = k.startsWith('nooc:') ? mix(R.ccolor(k.slice(5)), '#3a3d36', 0.7) : SUP_COLORS[5 - +k.slice(3)]; }
        else col = R.ccolor(k);
        if (R.mode === 'pol' && st.C[k] && !st.C[k].alive) col = mix(col, '#555', 0.6);
        ctx.fillStyle = col;
        if (Array.isArray(pa)) for (const i of pa) ctx.fill(provPath[i], 'evenodd'); else ctx.fill(pa, 'evenodd');
      }
      // hava: kar ve çamur katmanı
      if (R.showWeather && R.mode !== 'ind') {
        if (wxPaths.snow1) { ctx.fillStyle = 'rgba(235,242,250,0.3)'; ctx.fill(wxPaths.snow1, 'evenodd'); }
        if (wxPaths.snow2) { ctx.fillStyle = 'rgba(244,248,253,0.52)'; ctx.fill(wxPaths.snow2, 'evenodd'); }
        if (wxPaths.mud) { if (!mudPat) mudPat = ctx.createPattern(stripePattern('#6b4a2a'), 'repeat'); mudPat.setTransform && mudPat.setTransform(new DOMMatrix().scale(1 / z, 1 / z)); ctx.globalAlpha = 0.45; ctx.fillStyle = mudPat; ctx.fill(wxPaths.mud, 'evenodd'); ctx.globalAlpha = 1; }
      }
      // işgal çizgileri
      if (R.mode === 'pol' || R.mode === 'peace') for (const [owner, pa] of occGroups) {
        let pat = stripeCache.get(owner);
        if (!pat) { pat = ctx.createPattern(stripePattern(mix(R.ccolor(owner), '#000000', 0.15)), 'repeat'); stripeCache.set(owner, pat); }
        pat.setTransform && pat.setTransform(new DOMMatrix().scale(1 / (z * 1), 1 / (z * 1)));
        ctx.globalAlpha = 0.55; ctx.fillStyle = pat;
        if (Array.isArray(pa)) for (const i of pa) ctx.fill(provPath[i], 'evenodd'); else ctx.fill(pa, 'evenodd');
        ctx.globalAlpha = 1;
      }
      // hafif rölyef: arazi gölgesi (siyasi modda dağ/tepe koyulaştır)
      // eyalet sınırları
      if (z > 0.55) { ctx.strokeStyle = `rgba(20,24,18,${Math.min(0.45, (z - 0.55) * 0.5)})`; ctx.lineWidth = 0.7 / z; ctx.stroke(provBorder); }
      ctx.strokeStyle = 'rgba(12,14,10,0.85)'; ctx.lineWidth = Math.max(1.2, Math.min(2.4, z * 1.1)) / z; ctx.stroke(countryBorder);
      ctx.strokeStyle = 'rgba(8,16,24,0.9)'; ctx.lineWidth = 1.1 / z; ctx.stroke(coastPath);
      if (R.mode === 'air') { ctx.strokeStyle = 'rgba(235,225,190,0.75)'; ctx.lineWidth = 2 / z; ctx.setLineDash([5 / z, 3 / z]); ctx.stroke(regionBorder); ctx.setLineDash([]); }
      if (R.mode === 'peace') {
        ctx.strokeStyle = 'rgba(20,18,12,0.95)'; ctx.lineWidth = 2.2 / z; ctx.stroke(regionBorder);
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
      if (R.mode !== 'peace') drawFronts(ctx, z);
      // seçili eyalet
      if (R.sel.prov >= 0 && R.sel.prov < NP) {
        ctx.strokeStyle = '#f2d27a'; ctx.lineWidth = 2.2 / z; ctx.stroke(provPath[R.sel.prov]);
        ctx.fillStyle = 'rgba(242,210,122,0.14)'; ctx.fill(provPath[R.sel.prov], 'evenodd');
      }
      // hedef önizleme
      if (R.hover >= 0 && R.hover < NP && R.sel.units.size) { ctx.strokeStyle = '#ffffff'; ctx.setLineDash([4 / z, 3 / z]); ctx.lineWidth = 1.6 / z; ctx.stroke(provPath[R.hover]); ctx.setLineDash([]); }
    }

    // ---------- ekran uzayı katmanları ----------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels(ctx, z);
    if (R.mode === 'peace') drawConf(ctx);
    else {
      drawHubs(ctx);
      drawPaths(ctx);
      drawArrows(ctx, z);
      drawBattles(ctx);
      drawUnits(ctx, z);
      drawArmyTags(ctx, z);
    }
    drawAirRegions(ctx, z);
    if (R.box) { ctx.strokeStyle = '#f2d27a'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; const b = R.box; ctx.strokeRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); ctx.setLineDash([]); ctx.fillStyle = 'rgba(242,210,122,0.08)'; ctx.fillRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); }
    R.dirty = 0;
  };

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
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,14,10,0.75)'; ctx.strokeText(p.n, s.x, s.y + 3);
        ctx.fillStyle = '#efe9d8'; ctx.fillText(p.n, s.x, s.y + 3);
      }
    }
  }
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
    const s1 = new Path2D(), s2 = new Path2D(), md = new Path2D(); let n1 = 0, n2 = 0, nm = 0;
    if (typeof Path2D.prototype.addPath !== 'function') { wxPaths = {}; return; }
    for (let i = 0; i < NP; i++) {
      const sn = G.wx.snow[i], m = G.wx.mud[i];
      if (sn > 0.55) { s2.addPath(provPath[i]); n2++; } else if (sn > 0.15) { s1.addPath(provPath[i]); n1++; }
      if (m > 0.3) { md.addPath(provPath[i]); nm++; }
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
  function drawArrows(ctx, z) {
    for (const a of playerArmies()) {
      if (a.goal == null) continue;
      const from = R.armyAnchor(a); if (from < 0) continue;
      const s0 = R.toScreen(G.nodeX[from], G.nodeY[from]), s1 = R.toScreen(G.nodeX[a.goal], G.nodeY[a.goal]);
      const span = M.W * R.cam.z; while (s1.x - s0.x > span / 2) s1.x -= span; while (s0.x - s1.x > span / 2) s1.x += span;
      const dx = s1.x - s0.x, dy = s1.y - s0.y, len = Math.hypot(dx, dy); if (len < 6) continue;
      const nx = -dy / len, ny = dx / len, bend = Math.min(60, len * 0.18);
      const cx = (s0.x + s1.x) / 2 + nx * bend, cy = (s0.y + s1.y) / 2 + ny * bend;
      const col = a.ord === 'atk' ? '#d6483a' : G.armyColor(a);
      const wdt = Math.max(5, Math.min(12, 4 + z * 2));
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(10,10,8,0.8)'; ctx.lineWidth = wdt + 3; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo(cx, cy, s1.x, s1.y); ctx.stroke();
      ctx.strokeStyle = col; ctx.globalAlpha = 0.85; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo(cx, cy, s1.x, s1.y); ctx.stroke(); ctx.globalAlpha = 1;
      const ang = Math.atan2(s1.y - cy, s1.x - cx), hl = wdt * 2.6;
      ctx.fillStyle = col; ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s1.x + Math.cos(ang) * hl * 0.5, s1.y + Math.sin(ang) * hl * 0.5); ctx.lineTo(s1.x - Math.cos(ang - 0.5) * hl, s1.y - Math.sin(ang - 0.5) * hl); ctx.lineTo(s1.x - Math.cos(ang + 0.5) * hl, s1.y - Math.sin(ang + 0.5) * hl); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  // Ordu etiketi: komutan, emir ve planlama çubuğu (dokununca ordu seçilir)
  function drawArmyTags(ctx, z) {
    const st = G.st, c = st.C[st.player]; if (!c) return;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const a of playerArmies()) {
      const n = R.armyAnchor(a); if (n < 0) continue;
      const s = visible(G.nodeX[n], G.nodeY[n], 80); if (!s) continue;
      const gen = a.gen ? G.genById(c, a.gen) : null;
      const label = `${a.no || ''}. ${gen ? gen.n.replace(/^(Gen\.|Mareşal|Mar\.)\s*/, '') : 'Komutansız'}`;
      ctx.font = '700 10.5px "Barlow Semi Condensed", sans-serif';
      const w = Math.max(60, ctx.measureText(label).width + 24), h = 21;
      const x = s.x - w / 2, y = s.y - 40;
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
    }
  }
  // NATO simgesi türü (şablondan)
  R.kindOf = (u) => {
    const t = G.T(u.t, u.u);
    if (t._k) return t._k;
    return (t._k = t.tanks > 0 ? 'arm' : t.mob > 0.5 ? 'mot' : t.s === 'SÜV' ? 'cav' : t.s === 'DAĞ' ? 'mtn' : t.s === 'DNZ' ? 'mar' : 'inf');
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
  }
  R.drawNato = drawNato;
  function drawCounter(ctx, x, y, gl, tag, opts) {
    const st = G.st, w = 40, h = 22;
    const col = R.ccolor(tag);
    const light = luminance(col) > 0.55, ink = light ? '#14160f' : '#f4efe0';
    const kinds = {}; for (const u of gl) { const k = R.kindOf(u); kinds[k] = (kinds[k] || 0) + 1; }
    const kind = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0];
    let org = 0, os = 0, str = 0, fighting = false, moving = false;
    for (const u of gl) { const sOrg = (u._s && u._s.org) || 60; org += Math.max(0, u.org); os += sOrg; str += u.str; if (G.inBattle && G.inBattle.has(u)) fighting = true; if (u.path.length) moving = true; }
    ctx.fillStyle = 'rgba(8,10,8,0.55)'; ctx.fillRect(x + 1.5, y + 2, w, h);
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + h - 5, w, 5);
    drawNato(ctx, kind, x + 4, y + 3, 15, 10, ink);
    ctx.fillStyle = ink; ctx.font = '700 12px "Barlow Semi Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(gl.length), x + 30, y + 8.5);
    ctx.fillStyle = '#7fb069'; ctx.fillRect(x + 1, y + h - 5, (w - 2) * Math.max(0, Math.min(1, org / os)), 2);
    ctx.fillStyle = '#e0c45a'; ctx.fillRect(x + 1, y + h - 2.5, (w - 2) * Math.min(1, str / gl.length), 2);
    const sel = opts.sel;
    ctx.strokeStyle = sel ? '#f2d27a' : fighting ? (Math.sin(R.t / 140) > 0 ? '#ff6a50' : '#8a2a1e') : opts.enemy ? '#d4553f' : 'rgba(10,10,8,0.9)';
    ctx.lineWidth = sel ? 2.6 : fighting ? 2 : 1.3;
    ctx.strokeRect(x, y, w, h);
    if (opts.armyCol) { ctx.fillStyle = opts.armyCol; ctx.beginPath(); ctx.moveTo(x + w - 8, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + 8); ctx.closePath(); ctx.fill(); }
    if (moving && tag === st.player) { ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.moveTo(x + w + 2, y + 6); ctx.lineTo(x + w + 7, y + 11); ctx.lineTo(x + w + 2, y + 16); ctx.closePath(); ctx.fill(); }
    if (gl.some((u) => u.sr)) { ctx.fillStyle = '#7fc8f8'; ctx.fillRect(x, y - 3, w, 2); }
    return { w, h };
  }
  function drawUnits(ctx, z) {
    const st = G.st;
    R.counters = [];
    drawFleets(ctx, z);
    if (!G.unitsAt) return;
    const showAll = z > 2.6;
    const pc = st.C[st.player];
    const armyCol = new Map(); for (const a of (pc && pc.armies) || []) armyCol.set(a.id, G.armyColor(a));
    for (const key in G.unitsAt) {
      const L = G.unitsAt[key]; if (!L || !L.length) continue;
      const n = +key;
      const s = visible(G.nodeX[n], G.nodeY[n], 40); if (!s) continue;
      // ülkeye göre grupla
      const groups = new Map();
      for (const u of L) { let gl = groups.get(u.t); if (!gl) groups.set(u.t, (gl = [])); gl.push(u); }
      let k = 0;
      const order = [...groups.keys()].sort((a, b) => (a === st.player ? -1 : b === st.player ? 1 : 0));
      for (const tag of order) {
        const gl = groups.get(tag);
        const mineOrAlly = tag === st.player || G.sameFaction(tag, st.player);
        const enemy = G.atWar(tag, st.player);
        if (!showAll && !mineOrAlly && !enemy) continue;
        if (z < 0.75 && !enemy && tag !== st.player) continue;
        const x = s.x - 20 + k * 6, y = s.y - 11 + 10 + k * 23;
        const sel = gl.some((u) => R.sel.units.has(u.id));
        const ac = tag === st.player ? gl.find((u) => u.army && armyCol.has(u.army)) : null;
        const { w, h } = drawCounter(ctx, x, y, gl, tag, { sel, enemy, armyCol: ac ? armyCol.get(ac.army) : null });
        R.counters.push({ x, y, w, h, n, tag, units: gl });
        k++;
      }
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
