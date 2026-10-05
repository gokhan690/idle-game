// Demir Cephe harita üreticisi.
// Natural Earth (world-atlas) ülke sınırlarını 1936 devletlerine birleştirir, her devleti
// ağırlıklı Voronoi ile eyaletlere böler, komşuluk / kıyı / deniz bölgelerini hesaplar ve
// js/data/map.js dosyasını yazar.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as topojson from 'topojson-client';
import * as simp from 'topojson-simplify';
import { Delaunay } from 'd3-delaunay';
import pc from 'polygon-clipping';
import { CITIES, ISLANDS } from './cities.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const world = require('world-atlas/countries-50m.json');

// ---------- Projeksiyon (Miller, merkez 11.05°D, kesim Bering Boğazı) ----------
const W = 4000;
const K = W / (2 * Math.PI);
const LON0 = 11.05;
const LAT_MAX = 80, LAT_MIN = -56;
const millerY = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));
const Y_TOP = K * millerY(LAT_MAX);
const H = Math.ceil(Y_TOP - K * millerY(LAT_MIN));
const projY = (lat) => Y_TOP - K * millerY(Math.max(LAT_MIN, Math.min(LAT_MAX, lat)));
const projX = (lon, shift) => (lon - LON0 + shift + 180) / 360 * W;
const invLon = (x) => { let l = x / W * 360 - 180 + LON0; if (l > 180) l -= 360; return l; };
const invLat = (y) => { const r = (Y_TOP - y) / K; return (2.5 * Math.atan(Math.exp(0.8 * r)) - 0.625 * Math.PI) * 180 / Math.PI; };

// ---------- 1936 devletleri ----------
const GROUPS = {
  GER: ['Germany'], AUS: ['Austria'], CZE: ['Czechia', 'Slovakia'], POL: ['Poland'], HUN: ['Hungary'],
  ROM: ['Romania', 'Moldova'], YUG: ['Slovenia', 'Croatia', 'Bosnia and Herz.', 'Serbia', 'Montenegro', 'Kosovo', 'Macedonia'],
  BUL: ['Bulgaria'], GRE: ['Greece'], ALB: ['Albania'], TUR: ['Turkey'],
  ITA: ['Italy', 'San Marino', 'Vatican', 'Libya', 'Eritrea', 'Somalia'], ETH: ['Ethiopia'],
  ENG: ['United Kingdom', 'Isle of Man', 'Jersey', 'Guernsey', 'Egypt', 'Sudan', 'S. Sudan', 'Kenya', 'Uganda', 'Tanzania',
    'Nigeria', 'Ghana', 'Sierra Leone', 'Gambia', 'Zimbabwe', 'Zambia', 'Malawi', 'Botswana', 'Lesotho', 'eSwatini', 'Somaliland',
    'Israel', 'Palestine', 'Jordan', 'Cyprus', 'N. Cyprus', 'Malta', 'Kuwait', 'Qatar', 'Bahrain', 'United Arab Emirates',
    'Malaysia', 'Singapore', 'Brunei', 'Guyana', 'Belize', 'Jamaica', 'Bahamas', 'Trinidad and Tobago', 'Falkland Is.',
    'Solomon Is.', 'Fiji', 'Hong Kong', 'Mauritius'],
  RAJ: ['India', 'Pakistan', 'Bangladesh', 'Myanmar', 'Sri Lanka', 'Bhutan', 'Siachen Glacier'], NEP: ['Nepal'],
  CAN: ['Canada'], AST: ['Australia', 'Papua New Guinea'], NZL: ['New Zealand'], SAF: ['South Africa', 'Namibia'], IRE: ['Ireland'],
  FRA: ['France', 'Monaco', 'Andorra', 'Algeria', 'Tunisia', 'Morocco', 'Mauritania', 'Mali', 'Senegal', 'Guinea', "Côte d'Ivoire",
    'Burkina Faso', 'Niger', 'Chad', 'Benin', 'Togo', 'Cameroon', 'Gabon', 'Congo', 'Central African Rep.', 'Madagascar', 'Djibouti',
    'Syria', 'Lebanon', 'Vietnam', 'Laos', 'Cambodia', 'Comoros', 'New Caledonia', 'Fr. Polynesia'],
  BEL: ['Belgium', 'Dem. Rep. Congo', 'Rwanda', 'Burundi'], HOL: ['Netherlands', 'Indonesia', 'Suriname', 'Aruba', 'Curaçao'],
  LUX: ['Luxembourg'], POR: ['Portugal', 'Angola', 'Mozambique', 'Guinea-Bissau', 'Timor-Leste', 'Cabo Verde', 'São Tomé and Principe', 'Macao'],
  SPR: ['Spain', 'W. Sahara', 'Eq. Guinea'], SWI: ['Switzerland', 'Liechtenstein'],
  DEN: ['Denmark', 'Greenland', 'Iceland', 'Faeroe Is.'], NOR: ['Norway'], SWE: ['Sweden'], FIN: ['Finland', 'Åland'],
  EST: ['Estonia'], LAT: ['Latvia'], LIT: ['Lithuania'],
  SOV: ['Russia', 'Ukraine', 'Belarus', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Georgia', 'Armenia', 'Azerbaijan'],
  MON: ['Mongolia'], JAP: ['Japan', 'North Korea', 'South Korea', 'Taiwan', 'N. Mariana Is.', 'Palau'], CHI: ['China'], SIA: ['Thailand'],
  USA: ['United States of America', 'Puerto Rico', 'Philippines', 'Guam'],
  MEX: ['Mexico'], GUA: ['Guatemala'], HON: ['Honduras'], ELS: ['El Salvador'], NIC: ['Nicaragua'], COS: ['Costa Rica'],
  PAN: ['Panama'], CUB: ['Cuba'], HAI: ['Haiti'], DOM: ['Dominican Rep.'],
  BRA: ['Brazil'], ARG: ['Argentina'], CHL: ['Chile'], PRU: ['Peru'], BOL: ['Bolivia'], PAR: ['Paraguay'], URU: ['Uruguay'],
  VEN: ['Venezuela'], COL: ['Colombia'], ECU: ['Ecuador'],
  PER: ['Iran'], IRQ: ['Iraq'], SAU: ['Saudi Arabia'], YEM: ['Yemen'], OMA: ['Oman'], AFG: ['Afghanistan'], LIB: ['Liberia'],
};

// Eyalet merkezine göre 1936 sınır düzeltmeleri: [kaynak devlet, hedef devlet, [lon,lat] çokgeni]
const box = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]];
const REASSIGN = [
  ['POL', 'GER', [[14.1, 54.0], [17.6, 54.85], [17.6, 53.6], [17.0, 53.2], [16.2, 52.9], [15.9, 52.3], [16.4, 51.8], [17.3, 51.6], [17.8, 51.2], [18.2, 50.6], [18.8, 50.2], [18.6, 49.9], [16.5, 50.4], [14.8, 50.9], [14.1, 52.0]]],
  ['POL', 'GER', [[18.8, 54.5], [22.9, 54.5], [22.9, 53.3], [21.0, 53.1], [19.5, 53.4], [18.8, 54.0]]],
  ['SOV', 'GER', box(19.4, 54.3, 22.9, 55.4)],
  ['SOV', 'POL', [[22.0, 54.2], [23.4, 54.25], [24.6, 54.6], [25.3, 55.1], [26.6, 55.75], [27.2, 54.5], [27.0, 53.8], [27.6, 52.5], [26.9, 51.3], [26.5, 50.4], [26.2, 49.3], [25.5, 48.6], [24.6, 48.6], [22.0, 48.9]]],
  ['LIT', 'POL', [[23.5, 54.3], [24.4, 54.75], [25.2, 55.25], [26.7, 55.75], [26.9, 53.9], [23.5, 53.9]]],
  ['SOV', 'ROM', [[25.0, 47.9], [26.6, 48.6], [27.5, 48.45], [28.6, 46.5], [30.6, 46.5], [30.6, 45.1], [28.2, 45.1], [25.0, 47.6]]],
  ['ROM', 'SOV', box(29.25, 46.55, 30.3, 48.4)],
  ['SOV', 'CZE', [[22.1, 48.0], [22.6, 49.1], [23.5, 48.9], [24.6, 48.3], [24.0, 47.9], [22.8, 47.9]]],
  ['SOV', 'FIN', [[27.8, 60.4], [29.9, 60.05], [30.8, 60.9], [32.9, 61.9], [32.6, 62.6], [30.6, 63.0], [28.5, 62.0]]],
  ['SOV', 'FIN', box(28.4, 69.0, 31.9, 70.0)],
  ['GRE', 'ITA', box(26.8, 35.3, 28.4, 37.2)],
  ['BUL', 'ROM', box(26.6, 43.4, 28.8, 44.2)],
  ['YUG', 'ITA', [[13.3, 45.2], [13.7, 46.5], [14.0, 46.5], [14.5, 45.9], [14.6, 45.2], [13.9, 44.8]]],
  ['SOV', 'JAP', box(141, 45.5, 145, 50)],
  ['CHI', 'MAN', [[116.5, 40.4], [120.5, 40.0], [121.0, 38.7], [122.3, 39.0], [124.5, 39.6], [131, 42], [135.5, 48.5], [127, 53.6], [119.5, 53.4], [115.5, 47.5], [116.5, 45], [117.5, 42.5]]],
  ['CHI', 'PRC', box(106.0, 35.3, 110.6, 38.6)],
  ['CHI', 'TIB', [[78.4, 32.5], [80, 35.5], [86, 36.0], [92, 36.0], [97.5, 33.5], [99.0, 31.5], [98.5, 28.3], [94, 28.0], [89, 27.5], [85, 28.2], [81, 29.5], [78.4, 31]]],
  ['CHI', 'SIK', [[73.5, 39.5], [75, 37], [80, 35.6], [86, 36.1], [92, 36.2], [96.5, 40], [96.5, 42.7], [91, 45.5], [87.8, 49.2], [85, 47], [82.5, 45.5], [80.2, 44.8], [80.5, 42.2], [76, 40.5]]],
  ['TUR', 'FRA', box(35.75, 35.8, 36.7, 36.95)],
  ['FRA', 'SPR', box(-6.3, 34.75, -1.9, 36.0)],
];

// ---------- Yoğunluk bölgeleri (eyalet sıklığı) ----------
const DENSITY = [
  [-11, 36, 32, 60, 3.4], [32, 42, 50, 62, 2.0], [4, 60, 32, 71.5, 1.4], [26, 30, 50, 42, 2.1], [-17, 28, 35, 37.5, 1.5],
  [124, 30, 146, 46, 2.3], [105, 20, 123, 42, 1.7], [68, 6, 92, 32, 1.15], [92, -10, 125, 20, 0.9], [-100, 25, -66, 50, 1.0],
  [-17, 15, 35, 28, 0.32], [36, 15, 58, 30, 0.45], [50, 58, 180, 80, 0.22], [50, 40, 145, 58, 0.5], [-170, 56, -50, 80, 0.2],
  [-75, 59, -10, 84, 0.08], [117, -32, 150, -18, 0.28], [-75, -15, -45, 5, 0.4], [73, 30, 120, 53, 0.33], [-125, 30, -100, 50, 0.6],
];
function density(lon, lat) {
  for (const [a, b, c, d, v] of DENSITY) if (lon >= a && lon <= c && lat >= b && lat <= d) return v;
  return 0.65;
}

// ---------- Arazi ----------
const T = { plains: 0, forest: 1, hills: 2, mountain: 3, desert: 4, marsh: 5, jungle: 6, urban: 7 };
const inBox = (lon, lat, a, b, c, d) => lon >= a && lon <= c && lat >= b && lat <= d;
function terrainOf(lon, lat, rnd) {
  const M = [[5.5, 43.8, 16, 47.8], [-1.8, 42.2, 3, 43.1], [18.5, 48.6, 26.5, 49.6], [23.3, 45.2, 26.3, 47.9], [15, 41.5, 21, 44.5],
    [20.2, 38.6, 22.8, 41.2], [38, 41.3, 49, 43.7], [36.5, 37.6, 44.5, 41.1], [45, 28, 56, 35.5], [72, 27.5, 97, 36], [66, 33.5, 75, 40],
    [70, 40, 88, 44], [-121, 33, -105, 55], [-133, 50, -120, 60], [5, 59.5, 17, 68.5], [-8.5, 30.5, 2, 34.5], [36, 7, 41, 14],
    [97, 22, 105, 30], [62, 31, 72, 37], [-108, 17, -98, 27], [-150, 60, -140, 64], [-118, 62, -128, 66]];
  for (const m of M) if (inBox(lon, lat, ...m)) return T.mountain;
  if ((lat > -45 && lat < -18 && lon > -72 && lon < -66.5) || (lat >= -18 && lat < -5 && lon > -78 && lon < -68.5) || (lat >= -5 && lat < 8 && lon > -79 && lon < -73)) return T.mountain;
  const D = [[-17, 17, 33, 29.8], [24, 22, 33, 31], [36, 15, 58, 31], [95, 39, 115, 46], [76, 36, 92, 41], [115, -32, 148, -19],
    [17, -27, 25, -20], [-71, -27, -68, -18], [-117, 31, -108, 37], [69, 24, 74, 29], [53, 29, 61, 35], [54, 37, 66, 45.5], [-15, 18, -6, 25]];
  for (const d of D) if (inBox(lon, lat, ...d)) return T.desert;
  if (inBox(lon, lat, 23.5, 51, 30.5, 52.7) || inBox(lon, lat, 29, 6, 32, 9.5) || inBox(lon, lat, 46, 30.5, 48, 32)) return T.marsh;
  if (lat > -12 && lat < 10 && ((lon > -80 && lon < -40) || (lon > 8 && lon < 32) || (lon > 95 && lon < 152))) return T.jungle;
  if (lat > 0 && lat < 22 && lon > 95 && lon < 110) return T.jungle;
  const H2 = [[-5, 55.5, -2, 58.6], [-4, 50.3, -3, 51.3], [9, 37.5, 17, 44.5], [26, 36.5, 36, 40], [57, 50, 61, 65], [129, 31, 142, 41],
    [100, 30, 112, 36], [-9, 40, -3, 43], [11, 48.5, 18, 51], [-84, 34, -77, 40], [-50, -25, -42, -15], [28, -30, 32, -22], [-6, 41, 1, 42.5]];
  for (const h of H2) if (inBox(lon, lat, ...h)) return T.hills;
  if ((lat > 55 && lat < 68 && lon > 25) || (lat > 58 && lat < 67 && lon > 11 && lon < 30) || (lat > 47 && lat < 62 && lon > -135 && lon < -55)) return rnd() < 0.75 ? T.forest : T.plains;
  if (lat > 40 && lat < 56 && lon > -5 && lon < 40) return rnd() < 0.28 ? T.forest : (rnd() < 0.15 ? T.hills : T.plains);
  if (lat > 30 && lat < 47 && lon > -95 && lon < -70) return rnd() < 0.3 ? T.forest : T.plains;
  return rnd() < 0.12 ? T.hills : (rnd() < 0.12 ? T.forest : T.plains);
}

// ---------- Yardımcılar ----------
let seed = 1936;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function pip(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const ringArea = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; };

// Tarama çizgisi ile çokgen doldurma (çift-tek kuralı), piksel merkezleri
function rasterize(rings, grid, value, onlyIf) {
  let minY = Infinity, maxY = -Infinity;
  for (const r of rings) for (const p of r) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5; xs.length = 0;
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const a = r[j], b = r[i];
        if ((a[1] > sy) !== (b[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x++) {
        const idx = y * W + x;
        if (!onlyIf || onlyIf(idx)) grid[idx] = value;
      }
    }
  }
}

// ---------- 1. Topoloji sadeleştirme ve grupları birleştirme ----------
console.time('total');
const pre = simp.presimplify(world);
const topo = simp.simplify(pre, 0.0009);
const byName = new Map(topo.objects.countries.geometries.map((g) => [g.properties.name, g]));
const used = new Set();
const groups = [];
for (const [tag, names] of Object.entries(GROUPS)) {
  const geoms = names.map((n) => { if (!byName.has(n)) console.warn('missing', n); used.add(n); return byName.get(n); }).filter(Boolean);
  const merged = topojson.merge(topo, geoms);
  const polys = [];
  for (const poly of merged.coordinates) {
    // boylamları süreklileştir (antimeridyen), sonra halkayı bütün olarak kaydır
    const unwrap = (ring) => { const o = []; let prev = null; for (const [lon0, lat] of ring) { let lon = lon0; if (prev !== null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; } o.push([lon, lat]); prev = lon; } return o; };
    const rings = poly.map(unwrap);
    let sum = 0; for (const p of rings[0]) sum += p[0];
    const meanLon = sum / rings[0].length;
    let shift = 0; const rel = meanLon - LON0;
    if (rel < -180) shift = 360; else if (rel >= 180) shift = -360;
    const proj = rings.map((ring) => ring.slice(0, -1).map(([lon, lat]) => [Math.max(0, Math.min(W, projX(lon, shift))), projY(lat)]));
    if (proj[0].length < 3 || Math.abs(ringArea(proj[0])) < 1.5) continue;
    polys.push(proj);
  }
  if (polys.length) groups.push({ tag, polys });
}
for (const n of byName.keys()) if (!used.has(n)) console.log('unused:', n);

// ---------- 2. Grupları rasterleştir ----------
const groupGrid = new Int16Array(W * H).fill(-1);
groups.forEach((g, gi) => { for (const poly of g.polys) rasterize(poly, groupGrid, gi); });
const lonCol = new Float32Array(W).map((_, x) => invLon(x + 0.5));
const latRow = new Float32Array(H).map((_, y) => invLat(y + 0.5));

// ---------- 3. Tohumlar (ağırlıklı k-ortalamalar) ----------
const TARGET = 1500;
const gPix = groups.map(() => []);
let totalW = 0;
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const gi = groupGrid[y * W + x]; if (gi < 0) continue;
  const w = density(lonCol[x], latRow[y]);
  gPix[gi].push(x + 0.5, y + 0.5, w); totalW += w;
}
const baseW = totalW / TARGET;
const provinces = [];
groups.forEach((g, gi) => {
  const pix = gPix[gi]; const n = pix.length / 3;
  if (!n) return;
  let sw = 0; for (let i = 0; i < n; i++) sw += pix[i * 3 + 2];
  const k = Math.max(1, Math.min(n, Math.round(sw / baseW)));
  let seeds = [];
  for (let s = 0; s < k; s++) {
    let r = rnd() * sw, i = 0;
    for (; i < n - 1; i++) { r -= pix[i * 3 + 2]; if (r <= 0) break; }
    seeds.push([pix[i * 3] + rnd() * 0.01, pix[i * 3 + 1] + rnd() * 0.01]);
  }
  for (let it = 0; it < 12 && k > 1; it++) {
    const del = Delaunay.from(seeds);
    const acc = seeds.map(() => [0, 0, 0]);
    let hint = 0;
    for (let i = 0; i < n; i++) {
      const x = pix[i * 3], y = pix[i * 3 + 1], w = pix[i * 3 + 2];
      hint = del.find(x, y, hint);
      const a = acc[hint]; a[0] += x * w; a[1] += y * w; a[2] += w;
    }
    seeds = seeds.map((s, i) => (acc[i][2] > 0 ? [acc[i][0] / acc[i][2], acc[i][1] / acc[i][2]] : s));
  }
  // Hücreleri ülke şekliyle kes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of g.polys) for (const p of poly[0]) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); }
  const polyBoxes = g.polys.map((poly) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const p of poly[0]) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }
    return [a, b, c, d];
  });
  const cells = k > 1 ? Delaunay.from(seeds).voronoi([minX - 1, minY - 1, maxX + 1, maxY + 1]) : null;
  seeds.forEach((s, si) => {
    let shape;
    if (!cells) shape = g.polys.map((p) => p.map((r) => [...r]));
    else {
      const cell = cells.cellPolygon(si); if (!cell) return;
      let cx0 = Infinity, cy0 = Infinity, cx1 = -Infinity, cy1 = -Infinity;
      for (const p of cell) { cx0 = Math.min(cx0, p[0]); cy0 = Math.min(cy0, p[1]); cx1 = Math.max(cx1, p[0]); cy1 = Math.max(cy1, p[1]); }
      const cand = g.polys.filter((_, i) => { const b = polyBoxes[i]; return !(b[0] > cx1 || b[2] < cx0 || b[1] > cy1 || b[3] < cy0); });
      if (!cand.length) return;
      try { shape = pc.intersection([cell], cand); } catch (e) { console.warn('clip fail', g.tag, e.message); return; }
    }
    // Uzak ve küçük parçaları at
    shape = shape.filter((poly) => {
      const a = Math.abs(ringArea(poly[0]));
      if (a < 1.2) return false;
      let mx = 0, my = 0; for (const p of poly[0]) { mx += p[0]; my += p[1]; }
      mx /= poly[0].length; my /= poly[0].length;
      const d = Math.hypot(mx - s[0], my - s[1]);
      return !(a < 40 && d > 70);
    });
    if (!shape.length) return;
    // birbirinden uzak parçaları ayrı eyaletlere böl (ör. uzak adalar)
    const partInfo = shape.map((poly) => { let mx = 0, my = 0; for (const p of poly[0]) { mx += p[0]; my += p[1]; } return { poly, a: Math.abs(ringArea(poly[0])), x: mx / poly[0].length, y: my / poly[0].length }; });
    partInfo.sort((a, b) => b.a - a.a);
    const clusters = [];
    for (const pt of partInfo) {
      const cl = clusters.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < 30);
      const arctic = Math.abs(invLat(pt.y)) > 60 && pt.a < 120;
      if (cl) cl.parts.push(pt.poly);
      else if ((pt.a >= 4 && !arctic) || !clusters.length) clusters.push({ x: pt.x, y: pt.y, parts: [pt.poly] });
      else if (arctic) clusters[0].parts.push(pt.poly);
    }
    for (const cl of clusters) provinces.push({ tag: g.tag, seed: cl === clusters[0] ? s : [cl.x, cl.y], shape: cl.parts });
  });
});
console.log('groups', groups.length, 'provinces', provinces.length);

// ---------- 4. Sınır düzeltmeleri ----------
for (const p of provinces) {
  let big = p.shape[0], ba = 0;
  for (const poly of p.shape) { const a = Math.abs(ringArea(poly[0])); if (a > ba) { ba = a; big = poly; } }
  let mx = 0, my = 0, ma = 0;
  for (let i = 0, j = big[0].length - 1; i < big[0].length; j = i++) {
    const [x0, y0] = big[0][j], [x1, y1] = big[0][i]; const f = x0 * y1 - x1 * y0;
    mx += (x0 + x1) * f; my += (y0 + y1) * f; ma += f;
  }
  p.cx = mx / (3 * ma); p.cy = my / (3 * ma);
  const ll = [invLon(p.cx), invLat(p.cy)];
  for (const [from, to, zone] of REASSIGN) if (p.tag === from && pip(ll, zone)) { p.tag = to; break; }
}

// ---------- 4b. Stratejik adalar ve enklavlar ----------
const circle = (x, y, r, n = 14) => { const o = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; o.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9]); } o.push(o[0]); return o; };
const projPt = (lon, lat) => { const rel = lon - LON0; const sh = rel < -180 ? 360 : rel >= 180 ? -360 : 0; return [projX(lon, sh), projY(lat)]; };
const insideProv = (pt) => provinces.findIndex((p) => { let ins = false; for (const poly of p.shape) for (const r of poly) if (pip(pt, r)) ins = !ins; return ins; });
for (const [name, lon, lat, tag, kind, r] of ISLANDS) {
  const pt = projPt(lon, lat);
  const at = insideProv(pt);
  const circ = [circle(pt[0], pt[1], r || 3.4)];
  if (kind === 'island') {
    if (at >= 0) { if (provinces[at].tag !== tag) { provinces[at].tag = tag; provinces[at].fixed = 1; } continue; }
    // komşu kara ile çakışmasın
    let shape = [circ];
    for (const p of provinces) { if (Math.hypot(p.cx - pt[0], p.cy - pt[1]) > 120) continue; try { shape = pc.difference(shape, p.shape); } catch (e) { /* */ } }
    if (!shape.length) continue;
    provinces.push({ tag, seed: pt, shape, cx: pt[0], cy: pt[1], fixed: 1 });
  } else {
    if (at < 0) continue;
    const host = provinces[at];
    let part, rest;
    try { part = pc.intersection(host.shape, [circ]); rest = pc.difference(host.shape, [circ]); } catch (e) { continue; }
    if (!part.length || !rest.length) continue;
    host.shape = rest;
    provinces.push({ tag, seed: pt, shape: part, cx: pt[0], cy: pt[1], fixed: 1 });
  }
}
console.log('provinces after islands', provinces.length);

// ---------- 5. Kenarları paylaşılan köşelerle böl ve yuvarla ----------
const Q = 4; // 0.25 birim hassasiyet
const qp = (v) => Math.round(v * Q);
// Tüm köşeleri ızgaraya koy
const vgrid = new Map();
const cellKey = (x, y) => (Math.floor(x / 4) * 4096 + Math.floor(y / 4));
for (const p of provinces) for (const poly of p.shape) for (const ring of poly) for (const v of ring) {
  const k = cellKey(v[0], v[1]); let a = vgrid.get(k); if (!a) vgrid.set(k, a = []); a.push(v);
}
const EPS = 0.06;
let inserted = 0;
for (const p of provinces) {
  p.shape = p.shape.map((poly) => poly.map((ring) => {
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      out.push(a);
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      if (L2 < 1e-9) continue;
      const x0 = Math.min(a[0], b[0]) - EPS, x1 = Math.max(a[0], b[0]) + EPS, y0 = Math.min(a[1], b[1]) - EPS, y1 = Math.max(a[1], b[1]) + EPS;
      const found = [];
      for (let gx = Math.floor(x0 / 4); gx <= Math.floor(x1 / 4); gx++) for (let gy = Math.floor(y0 / 4); gy <= Math.floor(y1 / 4); gy++) {
        const arr = vgrid.get(gx * 4096 + gy); if (!arr) continue;
        for (const v of arr) {
          if (v[0] < x0 || v[0] > x1 || v[1] < y0 || v[1] > y1) continue;
          const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
          if (t <= 1e-6 || t >= 1 - 1e-6) continue;
          const px = a[0] + t * dx, py = a[1] + t * dy;
          if (Math.hypot(px - v[0], py - v[1]) < EPS) found.push([t, v]);
        }
      }
      found.sort((u, w) => u[0] - w[0]);
      for (const f of found) { out.push(f[1]); inserted++; }
    }
    // yuvarla, ardışık tekrarları sil
    const q = [];
    for (const v of out) { const x = qp(v[0]), y = qp(v[1]); const l = q[q.length - 1]; if (!l || l[0] !== x || l[1] !== y) q.push([x, y]); }
    while (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    return q;
  }).filter((r) => r.length >= 3));
  p.shape = p.shape.filter((poly) => poly.length);
}
console.log('inserted vertices', inserted);

// ---------- 6. Sınır zincirleri ----------
const edgeMap = new Map();
const ek = (a, b) => (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) ? `${a[0]},${a[1]},${b[0]},${b[1]}` : `${b[0]},${b[1]},${a[0]},${a[1]}`;
provinces.forEach((p, pi) => {
  for (const poly of p.shape) for (const ring of poly) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length]; const k = ek(a, b);
    const e = edgeMap.get(k);
    if (e) { if (e.p2 === -1 && e.p1 !== pi) e.p2 = pi; } else edgeMap.set(k, { a, b, p1: pi, p2: -1 });
  }
});
const pairSegs = new Map();
let single = 0;
for (const e of edgeMap.values()) {
  const lo = Math.min(e.p1, e.p2), hi = Math.max(e.p1, e.p2);
  const key = e.p2 === -1 ? `${e.p1}|-1` : `${lo}|${hi}`;
  if (e.p2 === -1) single++;
  let arr = pairSegs.get(key); if (!arr) pairSegs.set(key, arr = []);
  arr.push([e.a, e.b]);
}
console.log('edges', edgeMap.size, 'single (coast)', single);
// Segmentleri zincirlere birleştir
function chain(segs) {
  const adj = new Map(); const k = (p) => p[0] * 100000 + p[1];
  segs.forEach((s, i) => { for (const p of s) { const kk = k(p); let a = adj.get(kk); if (!a) adj.set(kk, a = []); a.push(i); } });
  const usedS = new Uint8Array(segs.length); const chains = [];
  for (let i = 0; i < segs.length; i++) {
    if (usedS[i]) continue; usedS[i] = 1;
    const line = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const end = dir ? line[line.length - 1] : line[0];
        const nxt = (adj.get(k(end)) || []).find((j) => !usedS[j]);
        if (nxt === undefined) break;
        usedS[nxt] = 1; const s = segs[nxt];
        const other = (s[0][0] === end[0] && s[0][1] === end[1]) ? s[1] : s[0];
        if (dir) line.push(other); else line.unshift(other);
      }
    }
    chains.push(line);
  }
  return chains;
}
const enc = (pts) => { const o = []; let px = 0, py = 0; for (const [x, y] of pts) { o.push(x - px, y - py); px = x; py = y; } return o; };
const borders = [];
for (const [key, segs] of pairSegs) {
  const [a, b] = key.split('|').map(Number);
  for (const c of chain(segs)) borders.push([a, b, enc(c)]);
}

// ---------- 7. Eyalet rasteri, komşuluk, kıyı ----------
const pgrid = new Int16Array(W * H).fill(-1);
provinces.forEach((p, pi) => { for (const poly of p.shape) rasterize(poly.map((r) => r.map(([x, y]) => [x / Q, y / Q])), pgrid, pi); });
const adjSets = provinces.map(() => new Set());
const coastal = new Uint8Array(provinces.length);
const pcount = new Float64Array(provinces.length), psx = new Float64Array(provinces.length), psy = new Float64Array(provinces.length);
const R = 2.5, offs = [];
for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if ((dx || dy) && dx * dx + dy * dy <= R * R && (dy > 0 || (dy === 0 && dx > 0))) offs.push([dx, dy]);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const a = pgrid[y * W + x]; if (a < 0) continue;
  pcount[a]++; psx[a] += x + 0.5; psy[a] += y + 0.5;
  for (const [dx, dy] of offs) {
    const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const b = pgrid[ny * W + nx];
    if (b >= 0 && b !== a) { adjSets[a].add(b); adjSets[b].add(a); }
  }
  if ((x > 0 && pgrid[y * W + x - 1] < 0) || (x < W - 1 && pgrid[y * W + x + 1] < 0) || (y > 0 && pgrid[(y - 1) * W + x] < 0) || (y < H - 1 && pgrid[(y + 1) * W + x] < 0)) coastal[a] = 1;
}
// Rasterde görünmeyen çok küçük eyaletler için sınır kenarlarından komşuluk
for (const [key] of pairSegs) { const [a, b] = key.split('|').map(Number); if (b >= 0) { adjSets[a].add(b); adjSets[b].add(a); } }

// ---------- 8. Deniz bölgeleri ----------
const sgrid = new Int16Array(W * H).fill(-1);
const seaSeeds = [];
const SEA_STEP = (lon, lat) => (inBox(lon, lat, -30, 28, 45, 72) ? 42 : inBox(lon, lat, 95, -12, 150, 45) ? 64 : (Math.abs(lat) > 60 ? 150 : 110));
for (let y = 8; y < H - 4; y += 42) for (let x = 0; x < W; x += 42) {
  const jx = Math.min(W - 1, x + Math.floor(rnd() * 30)), jy = Math.min(H - 1, y + Math.floor(rnd() * 30));
  const st = SEA_STEP(lonCol[jx], latRow[jy]);
  if (rnd() > (42 / st) ** 2) continue;
  if (pgrid[jy * W + jx] < 0) seaSeeds.push([jx, jy]);
}
// Çok kaynaklı BFS: deniz pikselleri en yakın tohuma bağlanır (karadan atlamaz)
{
  let queue = new Int32Array(W * H); let qh = 0, qt = 0;
  seaSeeds.forEach(([x, y], i) => { const idx = y * W + x; if (sgrid[idx] < 0) { sgrid[idx] = i; queue[qt++] = idx; } });
  while (qh < qt) {
    const idx = queue[qh++]; const x = idx % W, y = (idx / W) | 0; const s = sgrid[idx];
    const nb = [x > 0 ? idx - 1 : idx + W - 1, x < W - 1 ? idx + 1 : idx - W + 1, y > 0 ? idx - W : -1, y < H - 1 ? idx + W : -1];
    for (const n of nb) if (n >= 0 && sgrid[n] < 0 && pgrid[n] < 0) { sgrid[n] = s; queue[qt++] = n; }
  }
  queue = null;
}
const seaCount = new Float64Array(seaSeeds.length), ssx = new Float64Array(seaSeeds.length), ssy = new Float64Array(seaSeeds.length);
const seaAdj = seaSeeds.map(() => new Set()), seaProv = seaSeeds.map(() => new Set());
const provSea = provinces.map(() => new Set());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const idx = y * W + x, s = sgrid[idx]; if (s < 0) continue;
  seaCount[s]++; ssx[s] += x; ssy[s] += y;
  for (const [dx, dy] of [[1, 0], [0, 1], [2, 0], [0, 2]]) {
    let nx = x + dx; const ny = y + dy; if (ny >= H) continue; if (nx >= W) nx -= W;
    const n = ny * W + nx; const t = sgrid[n];
    if (t >= 0 && t !== s) { seaAdj[s].add(t); seaAdj[t].add(s); }
    const p = pgrid[n]; if (p >= 0 && dx + dy === 1) { seaProv[s].add(p); provSea[p].add(s); }
  }
  for (const [dx, dy] of [[-1, 0], [0, -1]]) {
    let nx = x + dx; const ny = y + dy; if (ny < 0) continue; if (nx < 0) nx += W;
    const p = pgrid[ny * W + nx]; if (p >= 0) { seaProv[s].add(p); provSea[p].add(s); }
  }
}
// Küçük (göl gibi) ve kıyısız deniz bölgelerini ele
const seaKeep = seaSeeds.map((_, i) => seaCount[i] >= 25);
const seaIdx = new Int32Array(seaSeeds.length).fill(-1); let ns = 0;
seaKeep.forEach((k, i) => { if (k) seaIdx[i] = ns++; });
const seas = [];
for (let i = 0; i < seaSeeds.length; i++) {
  if (!seaKeep[i]) continue;
  let mx = ssx[i] / seaCount[i], my = ssy[i] / seaCount[i];
  const mi = Math.round(my) * W + Math.round(mx);
  if (sgrid[mi] !== i) { mx = seaSeeds[i][0]; my = seaSeeds[i][1]; }
  seas.push({ x: Math.round(mx), y: Math.round(my), a: [...seaAdj[i]].filter((t) => seaKeep[t]).map((t) => seaIdx[t]), p: [...seaProv[i]], lon: invLon(mx), lat: invLat(my) });
}
console.log('sea zones', seas.length);

// Deniz bölgesi sınırlarını (ince kesik çizgiler) çıkar
const seaLines = [];
{
  const segs = new Map();
  const addSeg = (k, a, b) => { let arr = segs.get(k); if (!arr) segs.set(k, arr = []); arr.push([a, b]); };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const s = sgrid[y * W + x]; if (s < 0 || !seaKeep[s]) continue;
    const r = sgrid[y * W + x + 1], d = sgrid[(y + 1) * W + x];
    if (r >= 0 && r !== s && seaKeep[r]) addSeg(Math.min(s, r) + '|' + Math.max(s, r), [(x + 1) * Q, y * Q], [(x + 1) * Q, (y + 1) * Q]);
    if (d >= 0 && d !== s && seaKeep[d]) addSeg(Math.min(s, d) + '|' + Math.max(s, d), [x * Q, (y + 1) * Q], [(x + 1) * Q, (y + 1) * Q]);
  }
  for (const arr of segs.values()) for (const c of chain(arr)) {
    // basamakları azalt: her 3 noktada birini tut
    const s = c.filter((_, i) => i % 3 === 0 || i === c.length - 1);
    if (s.length >= 2) seaLines.push(enc(s));
  }
}

// ---------- 9. Şehirler, isimler, arazi, kaynaklar ----------
const pcity = provinces.map(() => []);
for (const c of CITIES) {
  const [name, lon, lat] = c;
  let rel = lon - LON0; let shift = 0; if (rel < -180) shift = 360; else if (rel >= 180) shift = -360;
  const x = Math.floor(projX(lon, shift)), y = Math.floor(projY(lat));
  let p = -1;
  for (let r = 0; r <= 6 && p < 0; r++) {
    for (let dy = -r; dy <= r && p < 0; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const v = pgrid[yy * W + xx]; if (v >= 0) { p = v; break; }
    }
  }
  if (p < 0) { console.warn('city not placed', name); continue; }
  pcity[p].push(c);
}
const out = provinces.map((p, i) => {
  const cities = pcity[i].sort((a, b) => b[3] - a[3]);
  let lx = pcount[i] ? psx[i] / pcount[i] : p.cx, ly = pcount[i] ? psy[i] / pcount[i] : p.cy;
  if (pcount[i] && pgrid[Math.floor(ly) * W + Math.floor(lx)] !== i) {
    // ortalama dışarıda kaldıysa: tohuma en yakın kendi pikseli
    let best = Infinity;
    for (let y = Math.max(0, Math.floor(p.cy - 40)); y < Math.min(H, p.cy + 40); y++) for (let x = Math.max(0, Math.floor(p.cx - 40)); x < Math.min(W, p.cx + 40); x++) {
      if (pgrid[y * W + x] !== i) continue; const d = (x - lx) ** 2 + (y - ly) ** 2; if (d < best) { best = d; p.lx = x + 0.5; p.ly = y + 0.5; }
    }
    if (best < Infinity) { lx = p.lx; ly = p.ly; }
  }
  const lon = invLon(lx), lat = invLat(ly);
  let te = terrainOf(lon, lat, rnd);
  const vp = cities.reduce((s, c) => s + c[3], 0);
  if (cities.length && cities[0][3] >= 15) te = T.urban;
  let oil = 0, steel = 0;
  for (const c of cities) { if (c[4]?.oil) oil += c[4].oil; if (c[4]?.steel) steel += c[4].steel; }
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const poly of p.shape) for (const ring of poly) for (const [x, y] of ring) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  return {
    t: p.tag, n: cities.length ? cities[0][0] : '', cs: cities.slice(1, 4).map((c) => c[0]),
    x: Math.round(lx * 10) / 10, y: Math.round(ly * 10) / 10, lon: Math.round(lon * 100) / 100, lat: Math.round(lat * 100) / 100,
    b: [bx0 / Q, by0 / Q, bx1 / Q, by1 / Q].map((v) => Math.round(v)), ar: Math.round(pcount[i]),
    te, vp: Math.max(1, vp), oil, st: steel, c: coastal[i],
    a: [...adjSets[i]], s: [...provSea[i]].filter((s) => seaKeep[s]).map((s) => seaIdx[s]),
    p: p.shape.map((poly) => poly.map(enc)),
  };
});
// İsimsiz eyaletler: aynı devletteki en yakın şehir
for (const p of out) {
  if (p.n) continue;
  let best = null, bd = Infinity;
  for (const q of out) {
    if (!q.n || q.t !== p.t || pcity[out.indexOf(q)].length === 0) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; }
  }
  p.nn = best && bd < 160 ? best.n : '';
}
// Yönlü isimler
const DIRS = ['Doğu', 'Kuzeydoğu', 'Kuzey', 'Kuzeybatı', 'Batı', 'Güneybatı', 'Güney', 'Güneydoğu'];
const counts = new Map();
for (const p of out) {
  if (p.n) continue;
  if (p.nn) {
    const ref = out.find((q) => q.n === p.nn);
    const ang = Math.atan2(-(p.y - ref.y), p.x - ref.x); const di = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    let name = `${DIRS[di]} ${p.nn}`; const c = (counts.get(name) || 0) + 1; counts.set(name, c);
    p.n = c > 1 ? `${name} ${'I'.repeat(Math.min(c, 3))}` : name;
  } else {
    const c = (counts.get(p.t) || 0) + 1; counts.set(p.t, c); p.n = `#${p.t}:${c}`;
  }
  delete p.nn;
}
for (const p of out) delete p.nn;

const MAP = { W, H, K, LON0, Q, Y_TOP, provinces: out, seas, borders, seaLines };
const js = `// Otomatik üretildi: tools/build-map.mjs — elle düzenlemeyin.\nwindow.MAP_DATA=${JSON.stringify(MAP)};\n`;
writeFileSync(join(ROOT, 'js/data/map.js'), js);
console.log('wrote map.js', (js.length / 1024 / 1024).toFixed(2), 'MB');
const tagCount = {}; for (const p of out) tagCount[p.t] = (tagCount[p.t] || 0) + 1;
console.log(JSON.stringify(tagCount));
console.timeEnd('total');
