// Harita çizimi: Path2D ile vektör eyaletler, sınırlar, birlik sayaçları, muharebeler.
(function (g) {
  const G = g.G;
  const { M, P, SEAS, NP } = G;
  const Q = M.Q;

  const R = (G.R = {
    cv: null, ctx: null, dpr: 1, w: 0, h: 0,
    cam: { x: M.W * 0.53, y: M.H * 0.3, z: 1 },
    mode: 'pol', // pol | terrain | ind | fac
    sel: { prov: -1, units: new Set() },
    dirty: 1, mapDirty: 1, t: 0, box: null, hover: -1,
  });

  // ---------- Çokgen kod çözme ----------
  const decode = (arr) => { const out = new Float32Array(arr.length); let x = 0, y = 0; for (let i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out[i] = x / Q; out[i + 1] = y / Q; } return out; };
  const provRings = P.map((p) => p.p.flat().map(decode));
  const provPath = provRings.map((rings) => { const pa = new Path2D(); for (const r of rings) { pa.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) pa.lineTo(r[i], r[i + 1]); pa.closePath(); } return pa; });
  const borders = M.borders.map(([a, b, e]) => ({ a, b, pts: decode(e) }));
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
  let fillGroups = new Map(), occGroups = new Map(), countryBorder = new Path2D(), provBorder = new Path2D(), labels = [];
  function rebuild() {
    const st = G.st;
    fillGroups = new Map(); occGroups = new Map();
    const keyOf = (i) => {
      const pr = st.prov[i];
      if (R.mode === 'terrain') return 'te' + P[i].te;
      if (R.mode === 'ind') { const v = pr.civ + pr.mil + pr.dock; return 'ind' + Math.min(6, Math.ceil(v / 2)); }
      if (R.mode === 'fac') { const f = st.C[pr.c]?.fac; return f ? 'fac:' + f : 'nofac:' + pr.c; }
      return pr.c;
    };
    const hasAdd = typeof Path2D.prototype.addPath === 'function';
    for (let i = 0; i < NP; i++) {
      const k = keyOf(i);
      let pa = fillGroups.get(k); if (!pa) fillGroups.set(k, (pa = hasAdd ? new Path2D() : []));
      if (hasAdd) pa.addPath(provPath[i]); else pa.push(i);
      const pr = st.prov[i];
      if (R.mode === 'pol' && pr.o !== pr.c) { let o = occGroups.get(pr.o); if (!o) occGroups.set(pr.o, (o = hasAdd ? new Path2D() : [])); if (hasAdd) o.addPath(provPath[i]); else o.push(i); }
    }
    countryBorder = new Path2D(); provBorder = new Path2D();
    for (const bd of borders) {
      if (bd.b < 0) continue;
      const ca = st.prov[bd.a].c, cb = st.prov[bd.b].c;
      addLine(ca !== cb ? countryBorder : provBorder, bd.pts);
    }
    buildLabels();
    R.mapDirty = 0;
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
    R.minZ = Math.max(R.w / M.W, R.h / M.H) * 0.98;
    R.clamp(); R.dirty = 1;
  };
  R.clamp = () => {
    const c = R.cam;
    c.z = Math.max(R.minZ || 0.1, Math.min(14, c.z));
    const hw = R.w / 2 / c.z, hh = R.h / 2 / c.z;
    c.x = Math.max(hw, Math.min(M.W - hw, c.x)); c.y = Math.max(hh * 0.6, Math.min(M.H - hh * 0.6, c.y));
    if (hw * 2 > M.W) c.x = M.W / 2;
  };
  R.toWorld = (sx, sy) => ({ x: R.cam.x + (sx - R.w / 2) / R.cam.z, y: R.cam.y + (sy - R.h / 2) / R.cam.z });
  R.toScreen = (wx, wy) => ({ x: (wx - R.cam.x) * R.cam.z + R.w / 2, y: (wy - R.cam.y) * R.cam.z + R.h / 2 });
  R.zoomAt = (sx, sy, f) => {
    const before = R.toWorld(sx, sy);
    R.cam.z *= f; R.clamp();
    const after = R.toWorld(sx, sy);
    R.cam.x += before.x - after.x; R.cam.y += before.y - after.y; R.clamp(); R.dirty = 1;
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
  const IND_COLORS = ['#2e3a2a', '#4b5a33', '#6b7a35', '#94913a', '#c0a03c', '#d98a37', '#e0663a'];

  // ---------- Çizim ----------
  R.draw = () => {
    const st = G.st, ctx = R.ctx, cam = R.cam, z = cam.z, dpr = R.dpr;
    if (!st) return;
    if (R.mapDirty || (G.mapDirty && performance.now() - (R.lastRebuild || 0) > 180)) { rebuild(); G.mapDirty = 0; R.lastRebuild = performance.now(); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // okyanus
    const grd = ctx.createLinearGradient(0, 0, 0, R.h);
    grd.addColorStop(0, '#16283a'); grd.addColorStop(1, '#10202f');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, R.w, R.h);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (R.w / 2 - cam.x * z), dpr * (R.h / 2 - cam.y * z));
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
      else col = R.ccolor(k);
      if (R.mode === 'pol' && st.C[k] && !st.C[k].alive) col = mix(col, '#555', 0.6);
      ctx.fillStyle = col;
      if (Array.isArray(pa)) for (const i of pa) ctx.fill(provPath[i], 'evenodd'); else ctx.fill(pa, 'evenodd');
    }
    // işgal çizgileri
    if (R.mode === 'pol') for (const [owner, pa] of occGroups) {
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
    // seçili eyalet
    if (R.sel.prov >= 0 && R.sel.prov < NP) {
      ctx.strokeStyle = '#f2d27a'; ctx.lineWidth = 2.2 / z; ctx.stroke(provPath[R.sel.prov]);
      ctx.fillStyle = 'rgba(242,210,122,0.14)'; ctx.fill(provPath[R.sel.prov], 'evenodd');
    }
    // hedef önizleme
    if (R.hover >= 0 && R.hover < NP && R.sel.units.size) { ctx.strokeStyle = '#ffffff'; ctx.setLineDash([4 / z, 3 / z]); ctx.lineWidth = 1.6 / z; ctx.stroke(provPath[R.hover]); ctx.setLineDash([]); }

    // ---------- ekran uzayı katmanları ----------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels(ctx, z);
    drawPaths(ctx);
    drawBattles(ctx);
    drawUnits(ctx, z);
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
    // şehirler
    if (z > 1.7) {
      ctx.font = `500 ${z > 4 ? 12 : 11}px "Barlow Semi Condensed", sans-serif`;
      for (let i = 0; i < NP; i++) {
        const p = P[i];
        const minVp = z > 4.5 ? 1 : z > 3 ? 3 : 10;
        if (p.vp < minVp || p.n.startsWith('#')) continue;
        const s = visible(p.x, p.y, 40); if (!s) continue;
        const isCap = Object.values(st.C).some((c) => c.alive && c.cap === i);
        const r = isCap ? 4 : p.vp >= 10 ? 3 : 2;
        ctx.fillStyle = isCap ? '#f2d27a' : '#efe9d8'; ctx.strokeStyle = 'rgba(10,10,8,0.8)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); if (isCap) { starPath(ctx, s.x, s.y - 9, r + 1.5); } else ctx.arc(s.x, s.y - 9, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (z > 2.4 || p.vp >= 10) {
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,14,10,0.75)'; ctx.strokeText(p.n, s.x, s.y + 3);
          ctx.fillStyle = '#efe9d8'; ctx.fillText(p.n, s.x, s.y + 3);
        }
      }
    }
  }
  function starPath(ctx, x, y, r) {
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const rr = k % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
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
      for (const n of u.path) { const q = R.toScreen(G.nodeX[n], G.nodeY[n]); ctx.lineTo(q.x, q.y); prev = s; s = q; }
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
      const mx = (G.nodeX[b.n] * 2 + G.nodeX[b.from]) / 3, my = (G.nodeY[b.n] * 2 + G.nodeY[b.from]) / 3;
      const s = visible(mx, my, 30); if (!s) continue;
      const mine = b.att === st.player || G.sameFaction(b.att, st.player) ? b.adv : (b.def === st.player || G.sameFaction(b.def, st.player)) ? 1 - b.adv : null;
      const col = mine == null ? '#d8d0b8' : mine > 0.55 ? '#7fb069' : mine < 0.45 ? '#d4553f' : '#e0a83a';
      const pulse = 1 + 0.12 * Math.sin(R.t / 180);
      ctx.fillStyle = 'rgba(14,14,12,0.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, 11 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      // çapraz kılıçlar
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(s.x - 5, s.y - 5); ctx.lineTo(s.x + 5, s.y + 5); ctx.moveTo(s.x + 5, s.y - 5); ctx.lineTo(s.x - 5, s.y + 5); ctx.stroke();
      R.battleMarks.push({ x: s.x - 12, y: s.y - 12, w: 24, h: 24, b });
    }
  }

  function drawUnits(ctx, z) {
    const st = G.st;
    R.counters = [];
    if (!G.unitsAt) return;
    const showAll = z > 2.6;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
        const w = 30, h = 19;
        const x = s.x - w / 2 + k * 6, y = s.y - h / 2 + 12 + k * 21;
        const sel = gl.some((u) => R.sel.units.has(u.id));
        const col = R.ccolor(tag);
        ctx.fillStyle = 'rgba(8,10,8,0.55)'; ctx.fillRect(x + 1.5, y + 2, w, h);
        ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + h - 4, w, 4);
        let org = 0, os = 0, str = 0;
        for (const u of gl) { const sOrg = (u._s && u._s.org) || 60; org += u.org; os += sOrg; str += u.str; }
        ctx.fillStyle = '#7fb069'; ctx.fillRect(x, y + h - 4, w * Math.max(0, Math.min(1, org / os)), 2);
        ctx.fillStyle = '#e0c45a'; ctx.fillRect(x, y + h - 2, w * Math.min(1, str / gl.length), 2);
        ctx.strokeStyle = sel ? '#f2d27a' : enemy ? '#d4553f' : 'rgba(10,10,8,0.9)'; ctx.lineWidth = sel ? 2.5 : 1.3;
        ctx.strokeRect(x, y, w, h);
        const light = luminance(col) > 0.55;
        ctx.fillStyle = light ? '#14160f' : '#f4efe0';
        ctx.font = '700 12px "Barlow Semi Condensed", sans-serif';
        const arm = gl.some((u) => u.u === 'arm');
        ctx.fillText(String(gl.length), x + w / 2 + (arm ? 4 : 0), y + h / 2 - 2);
        if (arm) { ctx.beginPath(); ctx.ellipse(x + 8, y + 7.5, 4.5, 2.6, 0, 0, Math.PI * 2); ctx.strokeStyle = light ? '#14160f' : '#f4efe0'; ctx.lineWidth = 1.2; ctx.stroke(); }
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
