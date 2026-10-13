// Askerî çizim kiti: ülkeye ve yıla göre üniforma, miğfer, kamuflaj ve nişanla çizilen vektör resimler.
// Tümen kartları (G.art.unit), komutan portreleri (G.art.portrait), teçhizat (G.art.vehicle) ve sahne parçaları.
// Hepsi kod içinde üretilir (dış dosya yok) ve anahtarına göre önbelleğe alınır; oyun durumuna dokunmaz.
(function (g) {
  const G = g.G;
  const cache = new Map();
  let uid = 0;
  const memo = (k, fn) => { let v = cache.get(k); if (v == null) { v = fn(); cache.set(k, v); } return v; };
  const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // renk yardımcıları: f > 0 açar, f < 0 koyulaştırır
  const hx = (c) => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map((x) => x + x).join(''); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); };
  const shade = (c, f) => { const [r, gg, b] = hx(c); const m = (v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f); return '#' + [m(r), m(gg), m(b)].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join(''); };
  const OUT = '#16150f'; // kontur
  const yearNow = () => (G.st ? G.dateOf(G.st.day).getUTCFullYear() : 1936);

  // ---------- Ülke görünümleri ----------
  // u: üniforma, h: miğfer (yıla göre h2), cap: subay şapkası, cam: araç boyası [ana, leke], ins: nişan, sk: ten tonu
  const NAT = {
    GER: { u: '#5d6450', h: 'stahl', cap: 'schirm', cc: '#4f5646', cam: ['#5b605c', '#c4a35a'], cam2y: 1943, ins: 'cross', trim: '#c9b45e' },
    SOV: { u: '#827c55', h: 'ssh36', h2: 'ssh40', h2y: 1940, cap: 'schirm', cc: '#6d7048', band: '#b3262a', cam: ['#4e5b33'], ins: 'redstar', trim: '#c9a640' },
    ENG: { u: '#7c6b47', h: 'brodie', cap: 'service', cc: '#6f6143', band: '#7c2b2b', cam: ['#6b6a48', '#3d3f30'], ins: 'roundel', rc: ['#1f3a8a', '#fff', '#c8102e'], trim: '#c9b45e' },
    USA: { u: '#6e6a44', h: 'brodie', h2: 'm1', h2y: 1942, cap: 'service', cc: '#5d5a3c', cam: ['#4b5320'], ins: 'usstar', trim: '#c9b45e' },
    FRA: { u: '#8a7f58', h: 'adrian', cap: 'kepi', cc: '#3c4a78', cam: ['#7d7550', '#4d5838', '#8a6a44'], ins: 'roundel', rc: ['#ef4135', '#fff', '#0055a4'], trim: '#d6b552' },
    ITA: { u: '#76745a', h: 'm33', cap: 'schirm', cc: '#6b6a52', cam: ['#b49a62', '#7b6a42'], ins: 'roundel', rc: ['#ce2b37', '#fff', '#009246'], trim: '#c9b45e' },
    JAP: { u: '#8a7a40', h: 'type90', cap: 'jap', cc: '#7a6c3a', band: '#a8262c', cam: ['#6c6a3c', '#8a6a3c', '#3e4a2c'], ins: 'hinomaru', trim: '#c9a640', sk: 1 },
    TUR: { u: '#6f6b48', h: 'tur', cap: 'schirm', cc: '#5f5d40', band: '#a8262c', cam: ['#62623f'], ins: 'tur', trim: '#c9b45e' },
    POL: { u: '#6b6c49', h: 'wz31', cap: 'rogat', cc: '#5d5f40', cam: ['#5b6038', '#8a7a4a', '#3d4430'], ins: 'pol', trim: '#c9b45e' },
    CHI: { u: '#5f6a74', h: 'stahl', cap: 'service', cc: '#4f5963', cam: ['#5b6151'], ins: 'chi', trim: '#c9b45e', sk: 1 },
    PRC: { u: '#6c7155', h: 'cap', cap: 'service', cc: '#5d6249', cam: ['#55603b'], ins: 'redstar', trim: '#c9a640', sk: 1 },
    MAN: { u: '#7d7444', h: 'type90', cap: 'jap', cc: '#6d6538', cam: ['#6c6a3c'], ins: 'flag', trim: '#c9a640', sk: 1 },
    HUN: { u: '#6f6a49', h: 'stahl', cap: 'schirm', cc: '#5f5b40', cam: ['#5a5f45'], ins: 'cross', trim: '#c9b45e' },
    ROM: { u: '#77704c', h: 'adrian', cap: 'schirm', cc: '#66603f', cam: ['#5e6040'], ins: 'roundel', rc: ['#ce1126', '#fcd116', '#002b7f'], trim: '#c9b45e' },
    BUL: { u: '#6d6a4a', h: 'stahl', cap: 'schirm', cc: '#5f5b40', cam: ['#5a5f45'], ins: 'roundel', rc: ['#d62612', '#00966e', '#fff'], trim: '#c9b45e' },
    FIN: { u: '#6f6e5c', h: 'stahl', cap: 'schirm', cc: '#5f5e4d', cam: ['#55604a', '#8a8a78'], ins: 'roundel', rc: ['#003580', '#fff', '#003580'], trim: '#c9b45e' },
    YUG: { u: '#6a6748', h: 'adrian', cap: 'schirm', cc: '#5d5a40', cam: ['#5d6040'], ins: 'roundel', rc: ['#c6363c', '#fff', '#0c4076'], trim: '#c9b45e' },
    GRE: { u: '#7a7151', h: 'adrian', cap: 'schirm', cc: '#6a6245', cam: ['#5f6040'], ins: 'roundel', rc: ['#0d5eaf', '#fff', '#0d5eaf'], trim: '#c9b45e' },
    SPR: { u: '#6f6a4c', h: 'adrian', cap: 'service', cc: '#5f5a40', cam: ['#5e6040'], ins: 'roundel', rc: ['#6b2c91', '#f1bf00', '#c60b1e'], trim: '#c9b45e' },
    SPN: { u: '#77704c', h: 'stahl', cap: 'service', cc: '#66603f', cam: ['#5e6040'], ins: 'roundel', rc: ['#c60b1e', '#f1bf00', '#c60b1e'], trim: '#c9b45e' },
    BEL: { u: '#6e6c4c', h: 'adrian', cap: 'service', cc: '#5e5d40', cam: ['#5f6040'], ins: 'roundel', rc: ['#000', '#fdda24', '#ef3340'], trim: '#c9b45e' },
    HOL: { u: '#6a6b55', h: 'stahl', cap: 'service', cc: '#5b5c48', cam: ['#5b6045'], ins: 'roundel', rc: ['#ae1c28', '#fff', '#21468b'], trim: '#c9b45e' },
    CZE: { u: '#6b6c48', h: 'stahl', cap: 'service', cc: '#5d5e40', cam: ['#5b6038', '#8a7a4a'], ins: 'roundel', rc: ['#11457e', '#fff', '#d7141a'], trim: '#c9b45e' },
  };
  for (const t of ['CAN', 'AST', 'RAJ', 'SAF', 'NZL']) NAT[t] = Object.assign({}, NAT.ENG);
  const nat = (tag) => {
    if (NAT[tag]) return NAT[tag];
    // bilinmeyen ülke: ülke renginden tonlanmış haki, Adrian miğferi, bayrak nişanı
    const base = (g.COUNTRY_DEFS && g.COUNTRY_DEFS[tag] && g.COUNTRY_DEFS[tag].c) || '#777777';
    const [r, gg, b] = hx(base), mix = (v, k) => Math.round(v * 0.25 + k * 0.75);
    const u = '#' + [mix(r, 112), mix(gg, 106), mix(b, 72)].map((v) => v.toString(16).padStart(2, '0')).join('');
    return (NAT[tag] = { u, h: 'adrian', cap: 'schirm', cc: shade(u, -0.12), cam: [shade(u, -0.1)], ins: 'flag', trim: '#c9b45e' });
  };
  const helmetOf = (n, y) => (n.h2 && y >= n.h2y ? n.h2 : n.h);
  const SKIN = ['#e2b590', '#d9a77f', '#c9946c', '#e8c09c'], SKIN_A = ['#e0b688', '#d4a676', '#c99a6a'];
  const skinOf = (n, k) => (n.sk ? SKIN_A : SKIN)[k % 3];

  // ---------- Nişanlar ----------
  const starPath = (cx, cy, r, ri = 0.42) => { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * ri : r; d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2); } return d + 'Z'; };
  const insignia = (tag, cx, cy, r) => {
    const n = nat(tag);
    switch (n.ins) {
      case 'cross': return `<path d="M${cx - r} ${cy - r * 0.32}h${r * 0.68}v${-r * 0.68}h${r * 0.64}v${r * 0.68}h${r * 0.68}v${r * 0.64}h${-r * 0.68}v${r * 0.68}h${-r * 0.64}v${-r * 0.68}h${-r * 0.68}z" fill="#111" stroke="#f2f2f2" stroke-width="${r * 0.18}"/>`;
      case 'redstar': return `<path d="${starPath(cx, cy, r)}" fill="#c4161c" stroke="#f4f4f4" stroke-width="${r * 0.14}"/>`;
      case 'usstar': return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1f3a8a"/><path d="${starPath(cx, cy, r * 0.92)}" fill="#fff"/>`;
      case 'hinomaru': return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f4f1ea"/><circle cx="${cx}" cy="${cy}" r="${r * 0.78}" fill="#bc002d"/>`;
      case 'tur': return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="#e30a17"/><rect x="${cx - r * 0.62}" y="${cy - r * 0.62}" width="${r * 1.24}" height="${r * 1.24}" fill="#fff"/><rect x="${cx - r * 0.3}" y="${cy - r * 0.3}" width="${r * 0.6}" height="${r * 0.6}" fill="#e30a17"/>`;
      case 'pol': { const s = r * 0.7; return `<g transform="rotate(45 ${cx} ${cy})"><rect x="${cx - s}" y="${cy - s}" width="${s}" height="${s}" fill="#fff"/><rect x="${cx}" y="${cy - s}" width="${s}" height="${s}" fill="#dc143c"/><rect x="${cx - s}" y="${cy}" width="${s}" height="${s}" fill="#dc143c"/><rect x="${cx}" y="${cy}" width="${s}" height="${s}" fill="#fff"/></g>`; }
      case 'chi': { let rays = ''; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; rays += `M${cx + Math.cos(a) * r * 0.42} ${cy + Math.sin(a) * r * 0.42}L${cx + Math.cos(a + 0.13) * r * 0.82} ${cy + Math.sin(a + 0.13) * r * 0.82}L${cx + Math.cos(a - 0.13) * r * 0.82} ${cy + Math.sin(a - 0.13) * r * 0.82}Z`; } return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a3a8f"/><path d="${rays}" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="#fff"/>`; }
      case 'roundel': { const [a, b, c] = n.rc; return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="${b}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.33}" fill="${a}"/>`; }
      default: { const col = (g.COUNTRY_DEFS && g.COUNTRY_DEFS[tag] && g.COUNTRY_DEFS[tag].c) || '#888'; return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f2efe4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="${col}"/>`; }
    }
  };

  // ---------- Sahne zemini ----------
  // hava: 'day' gündüz, 'dusk' akşam, 'snow' kar, 'sea' deniz, 'desert' çöl
  const PAL = {
    day: { s1: '#9fb2b8', s2: '#e6dcc0', far: '#8e9177', mid: '#6f7552', gr: '#5a5c3e', gr2: '#47482f' },
    dusk: { s1: '#6f6a7a', s2: '#e3b77d', far: '#6e6455', mid: '#56503c', gr: '#4a4532', gr2: '#3a3628' },
    snow: { s1: '#a9b6c2', s2: '#eef0ee', far: '#c9d0d6', mid: '#b4bcc2', gr: '#e4e8ea', gr2: '#cfd5da' },
    desert: { s1: '#b9c3c8', s2: '#efdcb2', far: '#cdb27e', mid: '#c2a36c', gr: '#c9a96d', gr2: '#a88a54' },
    sea: { s1: '#8fa6b5', s2: '#e3dcc6', far: '#7c8d92', mid: '#5b7480', gr: '#4d6a78', gr2: '#3c5866' },
  };
  const ground = (W, H, p, id, horizon = 0.62) => {
    const hy = H * horizon;
    let s = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.s1}"/><stop offset="1" stop-color="${p.s2}"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.gr}"/><stop offset="1" stop-color="${p.gr2}"/></linearGradient><radialGradient id="${id}v" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></radialGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
    s += `<path d="M0 ${hy - 6} C${W * 0.15} ${hy - 22} ${W * 0.3} ${hy - 10} ${W * 0.45} ${hy - 18} S${W * 0.75} ${hy - 6} ${W * 0.88} ${hy - 20} S${W} ${hy - 12} ${W} ${hy - 14} V${H} H0Z" fill="${p.far}" opacity="0.75"/>`;
    s += `<path d="M0 ${hy + 2} C${W * 0.2} ${hy - 8} ${W * 0.4} ${hy + 4} ${W * 0.6} ${hy - 4} S${W * 0.9} ${hy + 6} ${W} ${hy - 2} V${H} H0Z" fill="${p.mid}"/>`;
    s += `<path d="M0 ${hy + 14} C${W * 0.25} ${hy + 6} ${W * 0.5} ${hy + 18} ${W * 0.75} ${hy + 10} S${W} ${hy + 14} ${W} ${hy + 12} V${H} H0Z" fill="url(#${id}g)"/>`;
    return s;
  };
  const vignette = (W, H, id) => `<rect width="${W}" height="${H}" fill="url(#${id}v)"/>`;
  const smoke = (x, y, s, c = '#d8d0bc', o = 0.55) => `<g fill="${c}" opacity="${o}" style="filter:blur(${(1.4 * s).toFixed(1)}px)"><circle cx="${x}" cy="${y}" r="${7 * s}"/><circle cx="${x + 8 * s}" cy="${y - 9 * s}" r="${9 * s}"/><circle cx="${x + 1 * s}" cy="${y - 19 * s}" r="${11 * s}"/><circle cx="${x + 12 * s}" cy="${y - 28 * s}" r="${12 * s}"/></g>`;
  const grass = (W, y, c, seed) => { let d = ''; for (let i = 0; i < 28; i++) { const x = ((seed * 37 + i * 71) % 1000) / 1000 * W, h = 3 + ((i * 13) % 5); d += `M${x.toFixed(1)} ${y + ((i * 7) % 9)}l1.2 ${-h}l1.2 ${h}`; } return `<path d="${d}" fill="none" stroke="${c}" stroke-width="0.9" opacity="0.7"/>`; };

  // ---------- Asker ----------
  // 30x64 kutuda sağa bakan asker; poz: 'adv' ileri atılış, 'march' yürüyüş, 'kneel' diz çökmüş nişan, 'stand'
  const helmet = (type, c) => {
    const hc = shade(c, -0.08), hl = shade(c, 0.18);
    const o = `stroke="${OUT}" stroke-width="0.7" stroke-linejoin="round"`;
    switch (type) {
      case 'stahl': return `<path d="M8.8 15.4L10.9 11.6Q11.6 5.8 16.4 5.8Q21.2 6 21.8 10.8L23 11.8L21.2 12.2L12.6 12.6L11 15.8Z" fill="${hc}" ${o}/><path d="M12.4 8.6Q14.6 6.6 17.6 6.8" stroke="${hl}" stroke-width="1" fill="none"/>`;
      case 'brodie': return `<path d="M12 10.6Q12.4 6.2 16.2 6.2Q20 6.2 20.4 10.6Z" fill="${hc}" ${o}/><ellipse cx="16.2" cy="10.8" rx="7.6" ry="1.5" fill="${hc}" ${o}/>`;
      case 'm1': return `<path d="M10.4 13.4Q10.2 5.6 16.3 5.6Q22.2 5.8 22.2 12L23.2 12.6L10 13.8Z" fill="${hc}" ${o}/><path d="M12.4 8.4Q14.6 6.6 17.4 6.6" stroke="${hl}" stroke-width="1" fill="none"/>`;
      case 'adrian': return `<path d="M11.4 11.2Q11.9 6.4 16.4 6.4Q20.9 6.6 21.2 11.2Z" fill="${hc}" ${o}/><path d="M12.6 8Q16.4 3.6 20.2 8" stroke="${shade(c, -0.3)}" stroke-width="1" fill="none"/><path d="M20.4 10.6L23.8 11.4L20.6 11.9Z M12.2 10.8L9.2 12.6L12.4 12Z" fill="${hc}" ${o}/>`;
      case 'ssh36': return `<path d="M10.4 13.6L11.2 11.6Q11.4 5.8 16.4 5.8Q21.4 6 21.8 11L23.4 11.4L21.6 12.4L11.8 12.8Z" fill="${hc}" ${o}/><path d="M15.6 5.9L16.6 4.6L17.4 5.9" fill="${hc}" ${o}/>`;
      case 'ssh40': return `<path d="M10.6 13.4Q10.6 5.8 16.4 5.8Q21.9 6 22 11.6L23.2 12.2L21.4 12.8L11.2 13.6Z" fill="${hc}" ${o}/><path d="M12.6 8.4Q14.8 6.6 17.6 6.7" stroke="${hl}" stroke-width="1" fill="none"/>`;
      case 'm33': return `<path d="M10.2 13.8L11.2 11.8Q11.6 6 16.4 6Q21 6.2 21.4 11L23 11.8L21.2 12.4L11.8 12.8Z" fill="${hc}" ${o}/>`;
      case 'type90': return `<path d="M11 12.6Q11.2 6.2 16.4 6.2Q21.4 6.4 21.6 11.8L22.8 12.2L10.8 13Z" fill="${hc}" ${o}/><path d="${starPath(19.2, 9.2, 1.1)}" fill="#e6c34a"/><path d="M10.6 12.8L9 16.4L11.6 15.4Z" fill="${shade(c, 0.05)}" opacity="0.9"/>`;
      case 'tur': return `<path d="M9.4 15L11.2 11.6Q11.6 5.8 16.4 5.8Q21.2 6 21.8 10.8L23.2 11.6L21.4 12.2L12.4 12.6L11 15.2Z" fill="${hc}" ${o}/><path d="M12.2 9.6Q16.4 7.2 20.6 9.6" stroke="${shade(c, -0.28)}" stroke-width="0.8" fill="none"/>`;
      case 'wz31': return `<path d="M9.8 14.6L11.2 11.6Q11.6 6 16.4 6Q21 6.2 21.6 10.9L22.8 11.6L21.2 12.2L12.4 12.6L11.2 14.8Z" fill="${hc}" ${o}/>`;
      case 'cap': return `<path d="M11.4 10.6Q12 7 16.4 7Q20.6 7.2 21 10.6Z" fill="${hc}" ${o}/><path d="M20.4 10.4L23.6 10.9L20.6 11.4Z" fill="${shade(c, -0.25)}"/><path d="${starPath(18.4, 8.8, 0.9)}" fill="#c4161c"/>`;
      default: return '';
    }
  };
  // tüfek: dipçik (x1,y1) → namlu (x2,y2)
  const rifle = (x1, y1, x2, y2, bay) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, mx = x1 + ux * L * 0.62, my = y1 + uy * L * 0.62; return `<path d="M${x1} ${y1}L${mx.toFixed(1)} ${my.toFixed(1)}" stroke="#4a3220" stroke-width="2" stroke-linecap="round"/><path d="M${mx.toFixed(1)} ${my.toFixed(1)}L${x2} ${y2}" stroke="#2b2b2b" stroke-width="1.1" stroke-linecap="round"/>${bay ? `<path d="M${x2} ${y2}l${(ux * 5).toFixed(1)} ${(uy * 5).toFixed(1)}" stroke="#bfc3c6" stroke-width="0.7"/>` : ''}`; };
  const limb = (d, c, w) => `<path d="${d}" stroke="${OUT}" stroke-width="${w + 1.3}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const soldier = (tag, year, pose = 'adv', k = 0) => {
    const n = nat(tag), u = n.u, ud = shade(u, -0.22), ul = shade(u, 0.12), sk = skinOf(n, k), boot = '#2a241c', belt = n.ins === 'redstar' || n.ins === 'cross' ? '#2b2620' : '#6b5232';
    const hel = helmet(helmetOf(n, year), n.h === 'cap' ? u : shade(u, -0.05));
    if (pose === 'kneel') {
      return `${limb('M14 40L8 46L4 58', ud, 4.8)}<path d="M2 57h7v3H2z" fill="${boot}"/>${limb('M16 40L24 44L23 58', u, 4.8)}<path d="M21 56h7v3h-7z" fill="${boot}"/>`
        + `<path d="M7 26h5v11H7z" fill="${shade(u, -0.3)}" stroke="${OUT}" stroke-width="0.6"/><path d="M10 22Q15 20 19.5 22L20.5 41L10.5 41Z" fill="${u}" stroke="${OUT}" stroke-width="0.7"/><path d="M12 23Q15 22 17.6 23" stroke="${ul}" stroke-width="1.2" fill="none"/><rect x="10.3" y="35" width="10.4" height="2.2" fill="${belt}"/>`
        + `${rifle(9, 31, 36, 21, 1)}${limb('M12 25L18 30L26 26', ud, 3.4)}${limb('M17 24L24 25L30 23.5', u, 3.4)}<circle cx="30.4" cy="23.4" r="1.6" fill="${sk}"/>`
        + `<rect x="14.6" y="15.5" width="3.2" height="4" fill="${sk}"/><circle cx="16.3" cy="13" r="4.4" fill="${sk}" stroke="${OUT}" stroke-width="0.6"/><circle cx="19" cy="12.6" r="0.55" fill="#222"/>${hel}`;
    }
    const legs = pose === 'ride'
      ? `${limb('M15 35L23 37L22 48', u, 4.8)}<path d="M19.5 46.5h6.5v3h-6.5z" fill="${boot}"/>`
      : pose === 'march'
      ? `${limb('M14 36L12 47L11 58', ud, 4.8)}${limb('M17 36L19 47L20 58', u, 4.8)}<path d="M8 56.5h6.5v3H8z M17.5 56.5h6.5v3h-6.5z" fill="${boot}"/>`
      : pose === 'stand'
        ? `${limb('M14 36L14 47L14 58', ud, 4.8)}${limb('M17.5 36L18 47L18.5 58', u, 4.8)}<path d="M11 56.5h6.5v3H11z M15.5 56.5h6.5v3h-6.5z" fill="${boot}"/>`
        : `${limb('M14 36L10 47L6 57', ud, 4.8)}${limb('M17 36L22 46L26 56', u, 4.8)}<path d="M2.6 55.4l6.4 1.6-0.8 3-6.6-1.4z M23.4 54.6h7v3h-7z" fill="${boot}"/>`;
    const arms = pose === 'ride'
      ? `${rifle(9, 32, 12, 8, 0)}${limb('M12.5 21L13 28L18 31', ud, 3.4)}${limb('M18 21L22 27L26 29', u, 3.4)}<circle cx="26.4" cy="29.2" r="1.6" fill="${sk}"/>`
      : pose === 'march'
      ? `${rifle(12, 34, 19, 6, 0)}${limb('M12.5 21L11 28L13.5 33', ud, 3.4)}${limb('M18 21L21 28L22 33', u, 3.4)}<circle cx="22" cy="33.6" r="1.6" fill="${sk}"/>`
      : pose === 'stand'
        ? `${rifle(21, 36, 23, 6, 0)}${limb('M12.5 21L11.5 29L12 34', ud, 3.4)}${limb('M18.4 21L21 27L22.5 24', u, 3.4)}<circle cx="22.7" cy="23.4" r="1.6" fill="${sk}"/>`
        : `${rifle(8, 31, 37, 18, 1)}${limb('M12.5 21L17 28L24 25', ud, 3.4)}${limb('M18 21L25 24L31 21', u, 3.4)}<circle cx="31.3" cy="20.8" r="1.6" fill="${sk}"/>`;
    return `${legs}<path d="M5.6 20.5h5.6v12H5.6z" fill="${shade(u, -0.3)}" stroke="${OUT}" stroke-width="0.6" rx="1"/>`
      + `<path d="M10 19Q15 16.8 20 19L21 37L11 37Z" fill="${u}" stroke="${OUT}" stroke-width="0.7"/><path d="M11.6 20Q15 18.8 18 19.8" stroke="${ul}" stroke-width="1.2" fill="none"/><path d="M15.6 20.5v15" stroke="${ud}" stroke-width="0.5"/>`
      + `<rect x="10.6" y="31.6" width="10.6" height="2.2" fill="${belt}"/><rect x="15" y="31.4" width="2" height="2.6" fill="#a8956a"/><rect x="12" y="32.4" width="2.4" height="3" fill="${shade(belt, 0.1)}"/>`
      + `${arms}<rect x="14.6" y="12.5" width="3.2" height="4" fill="${sk}"/><circle cx="16.3" cy="10.5" r="4.4" fill="${sk}" stroke="${OUT}" stroke-width="0.6"/><circle cx="19" cy="10.2" r="0.55" fill="#222"/><path d="M19.6 12.6h1.4" stroke="#7a4b35" stroke-width="0.5"/>${hel}`;
  };
  const put = (inner, x, y, s, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${inner}</g>`;

  // ---------- At (süvari) ----------
  const horse = (tag, year, k = 0) => {
    const n = nat(tag), hc = ['#5b3a24', '#3a2a1e', '#7a5232'][k % 3], hd = shade(hc, -0.25), hl = shade(hc, 0.15);
    // 70x64 kutu, sağa bakan at; sırt ~y24
    let s = `${limb('M18 38L15 50L16 61', hd, 3.6)}${limb('M48 38L52 49L50 61', hd, 3.6)}`;
    s += `<path d="M10 33Q8 24 20 23L44 22Q50 21 54 15L58 9Q61 6 64 8L68 14Q69 17 66 18L61 17Q58 24 55 30Q53 38 46 40L20 41Q11 41 10 33Z" fill="${hc}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/>`;
    s += `<path d="M20 25Q32 23 44 24" stroke="${hl}" stroke-width="1.6" fill="none" opacity="0.6"/><path d="M54 14Q51 15 49 20Q47 24 46 23" stroke="${hd}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M10 30Q3 33 4 45" stroke="${hd}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M60 8l1-4 2 4z" fill="${hc}" stroke="${OUT}" stroke-width="0.6"/><circle cx="63" cy="11" r="0.8" fill="#111"/>`;
    s += `${limb('M22 39L23 50L21 61', hc, 3.8)}${limb('M45 38L47 49L46 61', hc, 3.8)}<path d="M18.5 60h5v2.6h-5zM43.5 60h5v2.6h-5zM13.5 60h5v2.6h-5zM47.5 60h5v2.6h-5z" fill="#1d1a14"/>`;
    s += `<path d="M24 22h16l1 7H23z" fill="${shade(n.u, -0.35)}" stroke="${OUT}" stroke-width="0.6"/><path d="M58 12L50 22" stroke="#2a201a" stroke-width="0.7"/>`;
    return s + put(soldier(tag, year, 'ride', k), 17, -10, 0.92);
  };

  // ---------- Tank ----------
  // seviye 1 hafif, 2 orta, 3 geliştirilmiş orta, 4 ağır/modern; ülkeye göre kamuflaj ve nişan
  const TANK = [null,
    { L: 70, H: 13, tw: 22, th: 10, gun: 18, gw: 2.2, wheels: 5, wr: 4.4, slope: 6 },
    { L: 84, H: 15, tw: 28, th: 12, gun: 26, gw: 2.8, wheels: 5, wr: 5.2, slope: 10 },
    { L: 92, H: 16, tw: 31, th: 13, gun: 38, gw: 3.1, wheels: 6, wr: 5.2, slope: 12, brake: 1 },
    { L: 100, H: 17, tw: 34, th: 14, gun: 48, gw: 3.6, wheels: 7, wr: 5.4, slope: 16, brake: 1, skirt: 1 },
  ];
  const tank = (tag, lvl, year) => {
    const n = nat(tag), T = TANK[Math.max(1, Math.min(4, lvl | 0 || 1))], id = 'tk' + ++uid;
    const base = n.cam2y && year >= n.cam2y && n.cam[1] ? n.cam[1] : n.cam[0], blot = n.cam2y && year >= n.cam2y ? n.cam[0] : n.cam[1];
    const L = T.L, H = T.H, by = 30, ty = by - T.th, tx = L * 0.32;
    let s = `<defs><linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></linearGradient>`
      + `<clipPath id="${id}c"><path d="M0 ${by}L${T.slope} ${by - H * 0.15}L${L - T.slope * 1.4} ${by - H * 0.15}L${L} ${by + H * 0.5}L${L - 4} ${by + H}L4 ${by + H}Z M${tx} ${ty}h${T.tw}l3 ${T.th}h-${T.tw + 6}z"/></clipPath></defs>`;
    // paletler ve tekerlekler
    const tY = by + H - 2, tH = T.wr * 2 + 4;
    s += `<rect x="2" y="${tY}" width="${L - 4}" height="${tH}" rx="${tH / 2}" fill="#2b2925" stroke="${OUT}" stroke-width="0.8"/>`;
    let links = ''; for (let x = 4; x < L - 4; x += 3) links += `M${x} ${tY + 0.6}v1.6M${x} ${tY + tH - 2.2}v1.6`; s += `<path d="${links}" stroke="#55514a" stroke-width="1"/>`;
    for (let i = 0; i < T.wheels; i++) { const cx = 8 + T.wr + (i * (L - 16 - T.wr * 2)) / (T.wheels - 1); s += `<circle cx="${cx.toFixed(1)}" cy="${tY + tH / 2}" r="${T.wr}" fill="#3d3a33" stroke="#1b1a16" stroke-width="0.8"/><circle cx="${cx.toFixed(1)}" cy="${tY + tH / 2}" r="${T.wr * 0.38}" fill="#6a665c"/>`; }
    // gövde
    s += `<path d="M0 ${by}L${T.slope} ${by - H * 0.15}L${L - T.slope * 1.4} ${by - H * 0.15}L${L} ${by + H * 0.5}L${L - 4} ${by + H}L4 ${by + H}Z" fill="${base}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/>`;
    if (T.skirt) s += `<path d="M6 ${by + H - 3}h${L - 14}v${T.wr + 2}h-${L - 14}z" fill="${shade(base, -0.08)}" stroke="${OUT}" stroke-width="0.6"/>`;
    // kule ve top
    const gy = ty + T.th * 0.45;
    s += `<rect x="${tx + T.tw}" y="${gy - T.gw / 2}" width="${T.gun}" height="${T.gw}" fill="${shade(base, -0.2)}" stroke="${OUT}" stroke-width="0.6"/>`;
    if (T.brake) s += `<rect x="${tx + T.tw + T.gun - 2}" y="${gy - T.gw}" width="5" height="${T.gw * 2}" fill="${shade(base, -0.3)}" stroke="${OUT}" stroke-width="0.6"/>`;
    s += `<path d="M${tx} ${ty + T.th}L${tx + 3} ${ty}h${T.tw - 3}l3 ${T.th}z" fill="${base}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/>`;
    s += `<path d="M${tx + 6} ${ty}h${T.tw * 0.4}v-3h-${T.tw * 0.4}z" fill="${shade(base, -0.1)}" stroke="${OUT}" stroke-width="0.6"/><path d="M${tx + 8} ${ty - 3}l-6 -14" stroke="#222" stroke-width="0.6"/>`;
    // kamuflaj lekeleri
    if (blot) { let b = ''; for (let i = 0; i < 6; i++) { const x = ((i * 37 + hash(tag)) % (L - 10)) + 4, y = by - T.th + ((i * 11) % (H + T.th)); b += `<ellipse cx="${x}" cy="${y}" rx="${7 + (i % 3) * 3}" ry="${3 + (i % 2) * 2}" transform="rotate(${(i * 23) % 40 - 20} ${x} ${y})"/>`; } s += `<g clip-path="url(#${id}c)" fill="${blot}" opacity="0.75">${b}</g>`; }
    s += `<path d="M0 ${by}L${T.slope} ${by - H * 0.15}L${L - T.slope * 1.4} ${by - H * 0.15}L${L} ${by + H * 0.5}L${L - 4} ${by + H}L4 ${by + H}Z M${tx} ${ty + T.th}L${tx + 3} ${ty}h${T.tw - 3}l3 ${T.th}z" fill="url(#${id}h)"/>`;
    s += insignia(tag, tx + T.tw * 0.5, ty + T.th * 0.55, Math.min(4.2, T.th * 0.32));
    return { svg: s, w: L + T.gun * 0.6 + 6, h: by + H + tH };
  };

  // ---------- Kamyon ve yarı paletli ----------
  const truck = (tag, half) => {
    const n = nat(tag), c = n.cam[0], cd = shade(c, -0.18);
    let s = `<path d="M0 20h46v12H0z" fill="${shade(c, -0.05)}" stroke="${OUT}" stroke-width="0.8"/><path d="M2 6Q24 0 44 6V20H2Z" fill="${shade(c, 0.08)}" stroke="${OUT}" stroke-width="0.8"/><path d="M8 4.6V20M20 2.6V20M32 2.6V20" stroke="${cd}" stroke-width="0.6"/>`;
    s += `<path d="M47 14h12l6 8v10H47z" fill="${c}" stroke="${OUT}" stroke-width="0.8" stroke-linejoin="round"/><path d="M50 16h8l4 6H50z" fill="#9fb4bd" stroke="${OUT}" stroke-width="0.5"/><path d="M62 26h4v4h-4z" fill="${cd}"/>`;
    if (half) s += `<rect x="2" y="30" width="38" height="11" rx="5.5" fill="#2b2925" stroke="${OUT}" stroke-width="0.8"/>${[8, 17, 26, 34].map((x) => `<circle cx="${x}" cy="35.5" r="3.8" fill="#3d3a33"/><circle cx="${x}" cy="35.5" r="1.4" fill="#6a665c"/>`).join('')}`;
    else s += [11, 33].map((x) => `<circle cx="${x}" cy="34" r="5.6" fill="#232220" stroke="${OUT}" stroke-width="0.8"/><circle cx="${x}" cy="34" r="2.2" fill="#6a665c"/>`).join('');
    s += `<circle cx="56" cy="34" r="5.6" fill="#232220" stroke="${OUT}" stroke-width="0.8"/><circle cx="56" cy="34" r="2.2" fill="#6a665c"/>`;
    s += insignia(tag, 52, 26.5, 2.6);
    return s;
  };

  // ---------- Top, tanksavar, uçaksavar ----------
  const gun = (tag, kind) => {
    const c = nat(tag).cam[0], cd = shade(c, -0.2);
    if (kind === 'aa') return `<path d="M4 34h40l-4 6H8z" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/><path d="M14 34l10-12 10 12z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>${[0, 3, 6, 9].map((d) => `<path d="M${22 + d * 0.3} ${24 - d * 0.2}L${42 + d} ${2 + d * 0.2}" stroke="#2b2b2b" stroke-width="1.6"/>`).join('')}<circle cx="24" cy="24" r="4" fill="${c}" stroke="${OUT}" stroke-width="0.7"/>`;
    if (kind === 'at') return `<path d="M2 36L26 30" stroke="${cd}" stroke-width="2.4" stroke-linecap="round"/><path d="M20 18h14v14H20z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/><rect x="33" y="22.4" width="30" height="2.4" fill="#2f2f2b"/><rect x="60" y="21.6" width="5" height="4" fill="#2f2f2b"/><circle cx="26" cy="36" r="6" fill="#242320" stroke="${OUT}" stroke-width="0.8"/><circle cx="26" cy="36" r="2.2" fill="#6a665c"/>`;
    return `<path d="M0 38L28 30" stroke="${cd}" stroke-width="3" stroke-linecap="round"/><path d="M22 26L58 8" stroke="#2f2f2b" stroke-width="4.2" stroke-linecap="round"/><path d="M18 24h14v10H18z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/><circle cx="28" cy="36" r="7.5" fill="#242320" stroke="${OUT}" stroke-width="0.8"/><path d="M28 29v14M21 36h14M23 31l10 10M33 31l-10 10" stroke="#4a4740" stroke-width="0.8"/><circle cx="28" cy="36" r="2.4" fill="#6a665c"/>`;
  };

  // ---------- Uçak (yandan) ----------
  // e: fig avcı, cas yakın destek, bom bombardıman; lvl 4 avcı = jet
  const plane = (tag, e, lvl, year) => {
    const n = nat(tag), c = n.ins === 'redstar' ? '#55613f' : n.ins === 'usstar' ? (year >= 1944 ? '#b9bcbf' : '#5d6342') : n.ins === 'hinomaru' ? (e === 'fig' ? '#c9c5b2' : '#4f5a3c') : n.ins === 'cross' ? '#5f6852' : n.ins === 'roundel' && n.rc[0] === '#1f3a8a' ? '#6a6446' : shade(n.cam[0], 0.05);
    const belly = n.ins === 'hinomaru' && e === 'fig' ? '#c9c5b2' : '#a9b4b8', cd = shade(c, -0.22), id = 'pl' + ++uid;
    const jet = e === 'fig' && lvl >= 4;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="0.55" stop-color="${c}"/><stop offset="0.56" stop-color="${belly}"/><stop offset="1" stop-color="${shade(belly, -0.1)}"/></linearGradient></defs>`;
    if (e === 'bom') {
      s += `<path d="M4 20Q2 14 10 13L74 12Q90 12 96 18Q90 24 74 24L10 24Q2 24 4 20Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/>`;
      s += `<path d="M6 13L2 2h8l8 11z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/><path d="M30 18L62 18L52 34L40 34Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8" opacity="0.95"/>`;
      s += `<path d="M44 20h14l2 6H42z" fill="${shade(c, -0.12)}" stroke="${OUT}" stroke-width="0.7"/><ellipse cx="61" cy="23" rx="1.2" ry="6" fill="#bbb" opacity="0.6"/><path d="M84 13q6 1 9 4h-9z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>`;
      s += `<path d="M66 13q4-3 8 0z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>` + insignia(tag, 24, 18.5, 3.6);
      return { svg: s, w: 98, h: 36 };
    }
    if (jet) {
      s += `<path d="M2 18Q4 14 14 14L60 13Q76 14 82 18Q76 22 60 22L14 22Q4 22 2 18Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/><path d="M6 14L2 4h7l9 10z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>`;
      s += `<path d="M26 18L46 18L40 28L32 28Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/><path d="M34 21h16q4 2 0 5H34z" fill="#3a3a36" stroke="${OUT}" stroke-width="0.6"/><path d="M56 13q6-5 13 1z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>` + insignia(tag, 22, 18, 3.2);
      return { svg: s, w: 84, h: 30 };
    }
    const gull = e === 'cas' && n.ins === 'cross';
    s += `<path d="M4 17Q3 13 10 12.6L48 12Q62 12 66 16.4Q62 21 48 21L10 21Q3 21 4 17Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/><path d="M7 13L3 3h6l8 10z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>`;
    s += gull ? `<path d="M30 17L36 24L52 22L46 17Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/><path d="M38 23v6M48 22v6" stroke="#2b2b2b" stroke-width="1.6"/><path d="M36 28h4v3h-4zM46 27h4v3h-4z" fill="#2b2b2b"/>` : `<path d="M30 17L50 17L45 24L35 24Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/>`;
    s += `<path d="M38 12q4-5 10-0.4z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/><path d="M65 15h3v3h-3z" fill="#3a3a36"/><ellipse cx="69" cy="16.5" rx="1.2" ry="9" fill="#ccc" opacity="0.55"/>`;
    if (e === 'cas') s += `<path d="M40 25h10q2 1.2 0 2.4H40z" fill="#2f2f2a"/>`;
    s += insignia(tag, 22, 16.6, 3.2);
    return { svg: s, w: 72, h: 32 };
  };

  // ---------- Gemi (yandan) ----------
  const ship = (tag, e) => {
    const n = nat(tag), c = n.ins === 'usstar' ? '#7c8790' : n.ins === 'redstar' ? '#7a8580' : n.ins === 'hinomaru' ? '#6f7478' : '#8a9094', cd = shade(c, -0.25), deck = '#9a8a6a';
    const turret = (x, y, w, dir = 1) => `<path d="M${x} ${y}h${w}l-1 -${w * 0.45}h-${w - 2}z" fill="${cd}" stroke="${OUT}" stroke-width="0.6"/><path d="M${dir > 0 ? x + w - 1 : x + 1} ${y - w * 0.28}h${dir * w * 1.1}" stroke="#2b2b2b" stroke-width="1.2"/>`;
    const L = { dd: 90, cr: 120, bb: 150, ss: 90, cv: 150, conv: 100 }[e] || 100, H = { dd: 7, cr: 9, bb: 12, ss: 5, cv: 10, conv: 10 }[e] || 9;
    let s = `<path d="M0 30L6 ${30 + H}H${L - 10}L${L} 28Z" fill="${c}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/><path d="M4 ${33 + H * 0.4}H${L - 6}" stroke="${shade(c, 0.15)}" stroke-width="0.6"/>`;
    if (e === 'ss') return `<path d="M0 32Q4 38 14 38H${L - 12}Q${L} 36 ${L} 33L${L - 6} 31H6Z" fill="#3e4447" stroke="${OUT}" stroke-width="0.9"/><path d="M38 31l3-9h12l3 9z" fill="#4b5256" stroke="${OUT}" stroke-width="0.8"/><path d="M45 22v-8M49 22v-6" stroke="#2b2b2b" stroke-width="1"/><path d="M58 30h6" stroke="#2b2b2b" stroke-width="1.6"/>`;
    if (e === 'cv') { s += `<path d="M-4 28H${L + 4}v-3H-4z" fill="${deck}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.62} 25v-14h12v14z" fill="${cd}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.62 + 4} 11v-6" stroke="#2b2b2b" stroke-width="1"/>`; for (let i = 0; i < 4; i++) s += `<path d="M${14 + i * 18} 24l8-1 2 1-2 1z" fill="${shade(c, -0.35)}"/>`; return s; }
    if (e === 'conv') return s + `<path d="M${L * 0.55} 30v-10h18v10z" fill="#d8d1bf" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.62} 20v-8h5v8z" fill="#2b2b2b"/><path d="M14 30v-6h28v6zM46 30v-5h10v5z" fill="#7a5e3e" stroke="${OUT}" stroke-width="0.6"/><path d="M28 24V8M28 10l-10 8M28 10l10 8" stroke="#3a3a36" stroke-width="0.7"/>`;
    const sup = e === 'bb' ? `<path d="M${L * 0.4} 28v-12h16v12z M${L * 0.45} 16v-12h7v12z" fill="${shade(c, -0.08)}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.6} 28l2-14h7l2 14z" fill="#3a3a36"/>` : `<path d="M${L * 0.38} 28v-9h14v9z M${L * 0.42} 19v-7h6v7z" fill="${shade(c, -0.08)}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.58} 28l1.5-10h6l1.5 10z" fill="#3a3a36"/>`;
    s += sup + `<path d="M${L * 0.48} 4V-6" stroke="#2b2b2b" stroke-width="0.8"/>`;
    const tw = e === 'bb' ? 12 : e === 'cr' ? 9 : 6;
    const fr = e === 'dd' ? [L * 0.74] : [L * 0.72, L * 0.82], bk = e === 'dd' ? [L * 0.16] : [L * 0.12, L * 0.22];
    for (const x of fr) s += turret(x, 28, tw, 1);
    for (const x of bk) s += turret(x, 28, tw, -1);
    return s;
  };

  const svg = (W, H, body, cls = 'art') => `<svg class="${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

  // ---------- Tümen kartı ----------
  // kind: inf mtn cav mot mech arm mar para art; tag ülke; y yıl; lvl tank seviyesi
  G.art = {};
  G.art.unit = (kind, tag, y = yearNow(), lvl = 1) => memo(`u|${kind}|${tag}|${y >= 1942 ? 1942 : y >= 1940 ? 1940 : 1936}|${lvl}`, () => {
    const W = 320, H = 150, id = 'ua' + ++uid, sd = hash(tag + kind);
    const pal = kind === 'mtn' ? PAL.snow : kind === 'mar' ? PAL.sea : kind === 'para' ? PAL.dusk : ['ITA', 'ENG'].includes(tag) && kind === 'arm' ? PAL.desert : sd % 3 === 0 ? PAL.dusk : PAL.day;
    let s = ground(W, H, pal, id, kind === 'mar' ? 0.55 : 0.62);
    if (kind === 'mtn') s += `<path d="M30 92L90 30L130 70L170 22L230 84L270 46L320 90V110H0Z" fill="#9aa4ad" opacity="0.8"/><path d="M90 30L106 46L98 44L94 50L84 42L76 46Z M170 22L188 42L180 40L174 47L164 38L154 40Z M270 46L284 58L276 57L270 62L262 55L256 57Z" fill="#f4f6f7" opacity="0.95"/>`;
    if (kind === 'mar') s += `<rect y="${H * 0.55}" width="${W}" height="${H * 0.25}" fill="#5f7d8a"/><path d="M0 ${H * 0.62}q20-4 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" stroke="#a9c0c8" stroke-width="1.2" fill="none"/><path d="M0 ${H * 0.8}L${W} ${H * 0.74}V${H}H0Z" fill="#c9b48a"/>`;
    s += smoke(W * 0.78, H * 0.52, 1.1) + smoke(W * 0.12, H * 0.5, 0.8, '#cfc6b2', 0.4);
    const sol = (x, yy, sc, pose, k, flip) => put(soldier(tag, y, pose, k), x, yy, sc, flip);
    switch (kind) {
      case 'arm': { const t = tank(tag, lvl, y), sc = Math.min(1.7, 200 / t.w); s += put(t.svg, 300 - t.w * sc, H - 8 - t.h * sc, sc) + sol(38, 76, 0.95, 'adv', 1) + sol(8, 82, 0.8, 'adv', 2); break; }
      case 'mot': s += put(truck(tag, 0), 150, 74, 1.9) + sol(70, 70, 1.15, 'adv', 0) + sol(30, 78, 0.95, 'march', 1); break;
      case 'mech': s += put(truck(tag, 1), 140, 72, 1.9) + sol(60, 70, 1.15, 'adv', 0) + sol(24, 78, 0.95, 'adv', 2); break;
      case 'cav': s += put(horse(tag, y, 2), 222, 72, 0.8) + put(horse(tag, y, 1), 24, 66, 1.0) + put(horse(tag, y, 0), 110, 58, 1.35); break;
      case 'art': s += smoke(262, 54, 0.9, '#efe6cf', 0.75) + `<circle cx="262" cy="68" r="7" fill="#ffd27a" opacity="0.85"/>` + put(gun(tag, 'art'), 150, 58, 2) + sol(118, 66, 1.05, 'kneel', 0) + sol(88, 68, 1.0, 'stand', 1); break;
      case 'para': { const p = plane(tag, 'bom', 2, y); s += put(p.svg, 170, 6, 1.1); for (const [px, py, sc] of [[60, 18, 1], [110, 34, 0.8], [240, 40, 0.7]]) s += `<g transform="translate(${px} ${py}) scale(${sc})"><path d="M-16 0Q0 -18 16 0Z" fill="#e8e2d0" stroke="${OUT}" stroke-width="0.8"/><path d="M-16 0L0 26M16 0L0 26M-6 -3L0 26M6 -3L0 26" stroke="#555" stroke-width="0.5"/>${put(soldier(tag, y, 'stand', 0), -7, 22, 0.42)}</g>`; s += sol(150, 76, 1.15, 'adv', 1) + sol(196, 80, 0.95, 'kneel', 2); break; }
      case 'mar': s += `<path d="M150 88h96l-10 18h-80z" fill="${shade(nat(tag).cam[0], -0.05)}" stroke="${OUT}" stroke-width="0.9"/><path d="M150 88l-6-20h8l4 20z" fill="${shade(nat(tag).cam[0], -0.2)}"/>` + sol(160, 52, 0.75, 'stand', 1) + sol(185, 52, 0.75, 'stand', 2) + sol(70, 74, 1.15, 'adv', 0) + sol(24, 80, 0.95, 'adv', 1); break;
      case 'mtn': s += sol(150, 70, 1.15, 'march', 0) + sol(196, 76, 1.0, 'march', 1) + sol(90, 78, 0.95, 'adv', 2); break;
      default: s += sol(238, 76, 0.95, 'march', 0) + sol(178, 66, 1.18, 'adv', 1) + sol(40, 68, 1.15, 'kneel', 2) + sol(104, 54, 1.45, 'adv', 0);
    }
    s += grass(W, H - 18, shade(pal.gr2, -0.2), sd) + vignette(W, H, id);
    return svg(W, H, s, 'art unitart');
  });

  // ---------- Teçhizat resmi ----------
  // e: inf sup art at aa mot tank fig cas bom dd cr bb ss cv conv
  G.art.vehicle = (e, lvl, tag, y = yearNow()) => memo(`v|${e}|${lvl | 0}|${tag}|${y >= 1943 ? 1943 : y >= 1940 ? 1940 : 1936}`, () => {
    const W = 240, H = 120, id = 'va' + ++uid;
    const naval = ['dd', 'cr', 'bb', 'ss', 'cv', 'conv'].includes(e), air = ['fig', 'cas', 'bom'].includes(e);
    let s = '';
    if (naval) {
      s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93a7b3"/><stop offset="1" stop-color="#dcd6c4"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/>${smoke(150, 50, 0.8, '#c9c4b6', 0.4)}`;
      const L = { dd: 90, cr: 120, bb: 150, ss: 90, cv: 150, conv: 100 }[e] || 100, sc = Math.min(1.45, 200 / L);
      s += put(ship(tag, e), (W - L * sc) / 2, 32, sc) + `<rect y="${32 + 38 * sc}" width="${W}" height="${H}" fill="#5c7684"/><path d="M0 ${36 + 38 * sc}q15-3 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0" stroke="#a6bcc5" stroke-width="1.2" fill="none"/>`;
    } else if (air) {
      s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f9cb0"/><stop offset="1" stop-color="#e2dccb"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/><path d="M20 90q20-12 44-4q18-14 40 0q16-6 30 4z M150 40q14-8 30-2q14-8 26 2z" fill="#f2efe6" opacity="0.7"/>`;
      const p = plane(tag, e, lvl, y), sc = Math.min(2.4, 200 / p.w);
      s += put(p.svg, (W - p.w * sc) / 2, (H - p.h * sc) / 2, sc);
    } else {
      s += ground(W, H, PAL.day, id, 0.6);
      if (e === 'tank') { const t = tank(tag, lvl || 1, y), sc = Math.min(1.75, 200 / t.w); s += put(t.svg, (W - t.w * sc) / 2 + 6, 22, sc); }
      else if (e === 'mot') s += put(truck(tag, 0), 40, 26, 2.3);
      else if (e === 'art' || e === 'at' || e === 'aa') s += put(gun(tag, e), 40, 20, 2.3);
      else if (e === 'sup') s += `<g stroke="${OUT}" stroke-width="0.9"><rect x="60" y="62" width="44" height="30" fill="#7a5e3e"/><rect x="108" y="66" width="36" height="26" fill="#6b5232"/><rect x="80" y="40" width="40" height="22" fill="#86683f"/><path d="M60 77h44M108 79h36M80 51h40" stroke="#4a3a28"/></g><path d="M156 92l8-40h6l-6 40z M172 92l12-34h6l-12 34z" fill="#3a3a36"/>` + put(soldier(tag, y, 'stand', 1), 186, 30, 1);
      else s += `<g stroke="${OUT}" stroke-width="0.9"><rect x="44" y="64" width="70" height="28" fill="#6f5434"/><path d="M44 74h70M44 84h70" stroke="#4a3a28"/></g>${rifle(52, 62, 120, 46, 1)}${rifle(56, 58, 124, 40, 0)}` + put(soldier(tag, y, 'stand', 0), 140, 26, 1.05) + put(soldier(tag, y, 'march', 1), 176, 30, 0.95);
    }
    s += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>`;
    return svg(W, H, s, 'art vehart');
  });

  // sivil devlet adamı portresi (demokrat ve tarafsız liderler): takım elbise, kravat, şapkasız
  const civPortrait = (s, gen, tag, h, sk, skd, hair, age, fat, must, glasses, W, H, id) => {
    const suit = ['#2b2b30', '#3a3530', '#2e3440'][h % 3], tie = (g.COUNTRY_DEFS[tag] || {}).c || '#6b2a24';
    s += `<path d="M6 ${H}Q8 112 34 104L50 100H70L86 104Q112 112 114 ${H}Z" fill="${suit}" stroke="${OUT}" stroke-width="1"/>`;
    s += `<path d="M48 100L60 128L72 100Z" fill="#f2efe6" stroke="${OUT}" stroke-width="0.7"/><path d="M57 104L60 101L63 104L62 126L60 130L58 126Z" fill="${shade(tie, -0.1)}" stroke="${OUT}" stroke-width="0.5"/>`;
    s += `<path d="M48 100L56 122L44 112Z M72 100L64 122L76 112Z" fill="${shade(suit, 0.12)}" stroke="${OUT}" stroke-width="0.6"/>`;
    s += `<path d="M50 84h20v18H50z" fill="${skd}"/>`;
    const fw = 22 + fat, cx = 60, cy = 66, ey = cy - 2, bald = (h >> 15) % 3 === 0, hc = age === 2 ? '#c9c4bb' : hair;
    s += `<path d="M${cx - fw} ${cy - 6}Q${cx - fw} ${cy + 26} ${cx} ${cy + 30}Q${cx + fw} ${cy + 26} ${cx + fw} ${cy - 6}Q${cx + fw} ${cy - 30} ${cx} ${cy - 30}Q${cx - fw} ${cy - 30} ${cx - fw} ${cy - 6}Z" fill="url(#${id}f)" stroke="${OUT}" stroke-width="1"/>`;
    s += `<ellipse cx="${cx - fw}" cy="${cy}" rx="3.4" ry="6" fill="${skd}" stroke="${OUT}" stroke-width="0.7"/><ellipse cx="${cx + fw}" cy="${cy}" rx="3.4" ry="6" fill="${skd}" stroke="${OUT}" stroke-width="0.7"/>`;
    s += bald ? `<path d="M${cx - fw} ${cy - 4}Q${cx - fw} ${cy - 18} ${cx - fw + 6} ${cy - 20}L${cx - fw + 4} ${cy - 4}Z M${cx + fw} ${cy - 4}Q${cx + fw} ${cy - 18} ${cx + fw - 6} ${cy - 20}L${cx + fw - 4} ${cy - 4}Z" fill="${hc}"/>`
      : `<path d="M${cx - fw - 1} ${cy - 2}Q${cx - fw - 3} ${cy - 34} ${cx} ${cy - 34}Q${cx + fw + 3} ${cy - 34} ${cx + fw + 1} ${cy - 2}Q${cx + fw - 2} ${cy - 22} ${cx + 6} ${cy - 24}Q${cx - 10} ${cy - 18} ${cx - fw + 2} ${cy - 8}Z" fill="${hc}" stroke="${OUT}" stroke-width="0.7"/>`;
    s += `<path d="M${cx - 14} ${ey - 7}q6-3 11 0M${cx + 3} ${ey - 7}q6-3 11 0" stroke="${hc}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="${cx - 8.5}" cy="${ey}" rx="3.4" ry="2" fill="#f4f1ea"/><ellipse cx="${cx + 8.5}" cy="${ey}" rx="3.4" ry="2" fill="#f4f1ea"/><circle cx="${cx - 8}" cy="${ey}" r="1.5" fill="#2a2a30"/><circle cx="${cx + 9}" cy="${ey}" r="1.5" fill="#2a2a30"/>`;
    s += `<path d="M${cx} ${ey + 1}L${cx - 3} ${ey + 11}Q${cx} ${ey + 13} ${cx + 3} ${ey + 11}" stroke="${shade(skd, -0.15)}" stroke-width="1.2" fill="none"/>`;
    if (must === 1) s += `<path d="M${cx - 9} ${ey + 16}Q${cx} ${ey + 12} ${cx + 9} ${ey + 16}Q${cx} ${ey + 16.6} ${cx - 9} ${ey + 16}Z" fill="${hc}"/>`;
    s += `<path d="M${cx - 6} ${ey + 19}q6 2.4 12 0" stroke="#7a4b3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    if (glasses) s += `<g fill="none" stroke="#2b2b2b" stroke-width="1"><circle cx="${cx - 8.5}" cy="${ey}" r="5"/><circle cx="${cx + 8.5}" cy="${ey}" r="5"/><path d="M${cx - 3.5} ${ey}h7"/></g>`;
    s += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>`;
    return svg(W, H, s, 'art portrait');
  };
  // ülke liderinin portresi: faşist ve komünist liderler üniformalı, diğerleri sivil
  G.art.leader = (tag, name, ideo) => G.art.portrait({ id: 0, n: name, lvl: ideo === 'fas' || ideo === 'com' ? 4 : 1, fm: ideo === 'fas' || ideo === 'com', civ: !(ideo === 'fas' || ideo === 'com') }, tag);
  // ---------- Komutan portresi ----------
  // gen: {id, n, lvl, fm, tr}; belirlenimli (kimlikten hash), oyun rastgeleliğine dokunmaz
  const CAP_C = { schirm: 1, service: 1, kepi: 1, jap: 1, rogat: 1 };
  G.art.portrait = (gen, tag, y = yearNow()) => memo(`p|${tag}|${gen.id}|${gen.n}|${gen.lvl | 0}|${gen.fm ? 1 : 0}|${gen.civ ? 1 : 0}`, () => {
    const n = nat(tag), h = hash(tag + '|' + gen.n + '|' + gen.id), id = 'pt' + ++uid;
    const W = 120, H = 150, sk = skinOf(n, h), skd = shade(sk, -0.18), hair = ['#2a2018', '#4a3826', '#7a6a58', '#b8b0a4', '#1c1612'][(h >> 3) % 5];
    const age = (h >> 6) % 3, fat = ((h >> 9) % 3) * 2, must = (h >> 11) % 4, glasses = (h >> 13) % 5 === 0, u = n.u, ud = shade(u, -0.2);
    const capT = CAP_C[n.cap] ? n.cap : 'schirm', cc = n.cc || ud, band = n.band || shade(cc, -0.25), gold = gen.fm ? '#e2c25a' : n.trim || '#c9b45e';
    let s = `<defs><radialGradient id="${id}b" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="${shade(u, 0.45)}"/><stop offset="1" stop-color="${shade(u, -0.45)}"/></radialGradient><linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sk}"/><stop offset="1" stop-color="${skd}"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${id}b)"/>`;
    if (gen.civ) return civPortrait(s, gen, tag, h, sk, skd, hair, age, fat, must, glasses, W, H, id);
    // omuzlar ve üniforma
    s += `<path d="M6 ${H}Q8 112 34 104L50 100H70L86 104Q112 112 114 ${H}Z" fill="${u}" stroke="${OUT}" stroke-width="1"/>`;
    s += `<path d="M50 100L60 124L70 100Z" fill="${shade(u, 0.1)}" stroke="${OUT}" stroke-width="0.8"/><path d="M52 101L60 118L68 101" fill="#ece6d6"/><path d="M57 104L60 122L63 104Z" fill="#3a3530"/>`;
    s += `<path d="M42 102L52 102L58 112L48 116Z M78 102L68 102L62 112L72 116Z" fill="${shade(u, -0.05)}" stroke="${OUT}" stroke-width="0.7"/>`;
    // yaka işaretleri ve omuz apoletleri
    s += `<path d="M46 106l7-1 2 6-7 2z M74 106l-7-1-2 6 7 2z" fill="${gen.fm ? '#b5232a' : band}" stroke="${gold}" stroke-width="0.8"/>`;
    s += `<path d="M16 112l18-6 2 5-18 7z M104 112l-18-6-2 5 18 7z" fill="${gold}" stroke="${OUT}" stroke-width="0.7"/>`;
    // nişanlar: seviye kadar şerit, mareşalde kordon
    const ribbons = Math.min(5, Math.max(1, gen.lvl | 0));
    for (let i = 0; i < ribbons; i++) { const cols = [['#b5232a', '#f2efe4'], ['#1f3a8a', '#e2c25a'], ['#2b6b3a', '#f2efe4'], ['#e2c25a', '#111'], ['#6b2c91', '#f2efe4']][(h + i) % 5]; s += `<rect x="${78 + (i % 3) * 7}" y="${118 + Math.floor(i / 3) * 4}" width="6.4" height="3.4" fill="${cols[0]}" stroke="${OUT}" stroke-width="0.3"/><rect x="${80.6 + (i % 3) * 7}" y="${118 + Math.floor(i / 3) * 4}" width="1.3" height="3.4" fill="${cols[1]}"/>`; }
    if ((gen.lvl | 0) >= 3) s += `<path d="${starPath(36, 126, 5)}" fill="#c9cdd0" stroke="${OUT}" stroke-width="0.5"/><path d="M33 120l3 4 3-4" stroke="#111" stroke-width="1.2" fill="none"/>`;
    if (gen.fm) s += `<path d="M30 108Q60 140 92 108" stroke="#e2c25a" stroke-width="2.2" fill="none"/><path d="M30 111Q60 143 92 111" stroke="#b5232a" stroke-width="1" fill="none"/>`;
    // boyun ve yüz
    s += `<path d="M50 84h20v18H50z" fill="${skd}"/>`;
    const fw = 22 + fat, cx = 60, cy = 66;
    s += `<path d="M${cx - fw} ${cy - 6}Q${cx - fw} ${cy + 26} ${cx} ${cy + 30}Q${cx + fw} ${cy + 26} ${cx + fw} ${cy - 6}Q${cx + fw} ${cy - 30} ${cx} ${cy - 30}Q${cx - fw} ${cy - 30} ${cx - fw} ${cy - 6}Z" fill="url(#${id}f)" stroke="${OUT}" stroke-width="1"/>`;
    s += `<ellipse cx="${cx - fw}" cy="${cy}" rx="3.4" ry="6" fill="${skd}" stroke="${OUT}" stroke-width="0.7"/><ellipse cx="${cx + fw}" cy="${cy}" rx="3.4" ry="6" fill="${skd}" stroke="${OUT}" stroke-width="0.7"/>`;
    // saç (şapka altından görünen şakaklar)
    s += `<path d="M${cx - fw + 1} ${cy - 10}Q${cx - fw + 2} ${cy - 2} ${cx - fw + 4} ${cy + 2}V${cy - 12}Z M${cx + fw - 1} ${cy - 10}Q${cx + fw - 2} ${cy - 2} ${cx + fw - 4} ${cy + 2}V${cy - 12}Z" fill="${age === 2 ? '#c9c4bb' : hair}"/>`;
    // gözler, kaşlar, burun, ağız
    const ey = cy - 2;
    s += `<path d="M${cx - 14} ${ey - 7}q6-3 11 0M${cx + 3} ${ey - 7}q6-3 11 0" stroke="${age === 2 ? '#9a948a' : hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="${cx - 8.5}" cy="${ey}" rx="3.4" ry="2" fill="#f4f1ea"/><ellipse cx="${cx + 8.5}" cy="${ey}" rx="3.4" ry="2" fill="#f4f1ea"/><circle cx="${cx - 8}" cy="${ey}" r="1.5" fill="#2a2a30"/><circle cx="${cx + 9}" cy="${ey}" r="1.5" fill="#2a2a30"/>`;
    if (age >= 1) s += `<path d="M${cx - 13} ${ey + 4}q4 2 8 0M${cx + 5} ${ey + 4}q4 2 8 0" stroke="${shade(skd, -0.1)}" stroke-width="0.7" fill="none"/>`;
    s += `<path d="M${cx} ${ey + 1}L${cx - 3} ${ey + 11}Q${cx} ${ey + 13} ${cx + 3} ${ey + 11}" stroke="${shade(skd, -0.15)}" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`;
    if (must === 1) s += `<path d="M${cx - 9} ${ey + 16}Q${cx} ${ey + 12} ${cx + 9} ${ey + 16}Q${cx} ${ey + 16.6} ${cx - 9} ${ey + 16}Z" fill="${age === 2 ? '#c9c4bb' : hair}"/>`;
    else if (must === 2) s += `<path d="M${cx - 3.5} ${ey + 13}h7v3h-7z" fill="${hair}"/>`;
    s += `<path d="M${cx - 6} ${ey + 19}q6 2.4 12 0" stroke="#7a4b3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    if (fat >= 4) s += `<path d="M${cx - 14} ${cy + 22}q14 10 28 0" stroke="${shade(skd, -0.08)}" stroke-width="0.8" fill="none"/>`;
    if (glasses) s += `<g fill="none" stroke="#2b2b2b" stroke-width="1"><circle cx="${cx - 8.5}" cy="${ey}" r="5"/><circle cx="${cx + 8.5}" cy="${ey}" r="5"/><path d="M${cx - 3.5} ${ey}h7M${cx - 13.5} ${ey}l-${fw - 13}-2M${cx + 13.5} ${ey}l${fw - 13}-2"/></g>`;
    // şapka
    const capTop = cy - 26;
    if (capT === 'kepi') s += `<path d="M${cx - 20} ${capTop + 10}L${cx - 17} ${capTop - 16}H${cx + 17}L${cx + 20} ${capTop + 10}Z" fill="${cc}" stroke="${OUT}" stroke-width="1"/><path d="M${cx - 20} ${capTop + 6}H${cx + 20}" stroke="${gold}" stroke-width="2"/><path d="M${cx - 18} ${capTop - 4}H${cx + 18}" stroke="${gold}" stroke-width="${gen.fm ? 3 : 1.4}"/><path d="M${cx - 22} ${capTop + 10}Q${cx} ${capTop + 18} ${cx + 22} ${capTop + 10}L${cx + 18} ${capTop + 13}Q${cx} ${capTop + 20} ${cx - 18} ${capTop + 13}Z" fill="#1d1a16"/>`;
    else if (capT === 'rogat') s += `<path d="M${cx - 24} ${capTop + 8}L${cx - 30} ${capTop - 14}L${cx} ${capTop - 20}L${cx + 30} ${capTop - 14}L${cx + 24} ${capTop + 8}Z" fill="${cc}" stroke="${OUT}" stroke-width="1"/><rect x="${cx - 24}" y="${capTop + 2}" width="48" height="7" fill="${band}" stroke="${OUT}" stroke-width="0.7"/><path d="M${cx - 26} ${capTop + 9}Q${cx} ${capTop + 18} ${cx + 26} ${capTop + 9}L${cx + 22} ${capTop + 13}Q${cx} ${capTop + 20} ${cx - 22} ${capTop + 13}Z" fill="#1d1a16"/>`;
    else {
      const hi = capT === 'schirm' ? 16 : capT === 'jap' ? 8 : 10, wide = capT === 'schirm' ? 34 : 28;
      s += `<path d="M${cx - 24} ${capTop + 8}Q${cx - wide} ${capTop - hi} ${cx} ${capTop - hi - 2}Q${cx + wide} ${capTop - hi} ${cx + 24} ${capTop + 8}Z" fill="${cc}" stroke="${OUT}" stroke-width="1"/>`;
      s += `<rect x="${cx - 24}" y="${capTop + 1}" width="48" height="8" rx="2" fill="${band}" stroke="${OUT}" stroke-width="0.7"/>`;
      s += `<path d="M${cx - 25} ${capTop + 9}Q${cx} ${capTop + 19} ${cx + 25} ${capTop + 9}L${cx + 21} ${capTop + 14}Q${cx} ${capTop + 21} ${cx - 21} ${capTop + 14}Z" fill="#1d1a16"/><path d="M${cx - 20} ${capTop + 12}Q${cx} ${capTop + 18} ${cx + 20} ${capTop + 12}" stroke="${gold}" stroke-width="${gen.fm || (gen.lvl | 0) >= 3 ? 1.6 : 0}" fill="none"/>`;
      // şapka arması
      if (n.ins === 'redstar' || n.ins === 'chi' || capT === 'jap') s += `<path d="${starPath(cx, capTop + 4, 4)}" fill="${n.ins === 'chi' ? '#fff' : n.ins === 'redstar' ? '#c4161c' : '#e6c34a'}" stroke="${OUT}" stroke-width="0.5"/>`;
      else if (n.ins === 'cross') s += `<path d="M${cx - 10} ${capTop - 6}q10-6 20 0l-10 2z" fill="#c9cdd0" stroke="${OUT}" stroke-width="0.5"/><circle cx="${cx}" cy="${capTop + 5}" r="2.4" fill="#c9cdd0" stroke="${OUT}" stroke-width="0.5"/>`;
      else if (n.ins === 'tur') s += `<circle cx="${cx}" cy="${capTop + 5}" r="3.6" fill="#e30a17" stroke="${gold}" stroke-width="0.8"/><circle cx="${cx - 0.6}" cy="${capTop + 5}" r="2" fill="#fff"/><circle cx="${cx + 0.2}" cy="${capTop + 5}" r="1.6" fill="#e30a17"/>`;
      else s += `<ellipse cx="${cx}" cy="${capTop - 2}" rx="5" ry="6" fill="${gold}" stroke="${OUT}" stroke-width="0.5"/>`;
    }
    s += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>`;
    return svg(W, H, s, 'art portrait');
  });

  // kart türü: şablonun taburlarından (tank varsa zırhlı; sonra baskın tabur; topçu %40'tan fazlaysa topçu)
  G.art.kindOfB = (b) => {
    b = b || {}; let all = 0; for (const v of Object.values(b)) all += v || 0;
    if (!all) return 'inf';
    if (b.arm || b.td) return 'arm';
    if (b.mech) return 'mech';
    if (b.spa && (b.spa || 0) / all >= 0.3) return 'art';
    if ((b.art || 0) / all >= 0.4) return 'art';
    const order = ['mot', 'para', 'mar', 'mtn', 'cav', 'inf'];
    let best = 'inf', bv = -1; for (const k of order) if ((b[k] || 0) > bv) { bv = b[k] || 0; best = k; }
    return best;
  };
  G.art.kindOf = (u) => {
    const t = G.T(u.t, u.u); if (t._ak) return t._ak; // şablon değişince G.T önbelleği yenilenir
    const c = G.st.C[u.t]; const src = (c && G.templatesOf(c)[u.u]) || g.DEFAULT_TEMPLATES[u.u] || g.DEFAULT_TEMPLATES.inf;
    return (t._ak = G.art.kindOfB(src.b));
  };
  // ülkenin en iyi tank seviyesi (tasarım bürosu seviyesi; yoksa teknolojiden)
  G.art.tankLvl = (c) => { try { return Math.max(1, Math.min(4, Math.floor(G.bestLevel ? G.bestLevel(c, 'tank') : 1))); } catch (e) { return 1; } };
  // ---------- Arazi katmanları (muharebe ve olay sahneleri) ----------
  const tree = (x, y, h, c) => `<path d="M${x} ${y}l${-h * 0.32} 0l${h * 0.22} ${-h * 0.36}l${-h * 0.14} 0l${h * 0.24} ${-h * 0.34}l${-h * 0.1} 0l${h * 0.1} ${-h * 0.3}l${h * 0.1} ${h * 0.3}l${-h * 0.1} 0l${h * 0.24} ${h * 0.34}l${-h * 0.14} 0l${h * 0.22} ${h * 0.36}z" fill="${c}"/><rect x="${x - 1}" y="${y}" width="2" height="${h * 0.12}" fill="#3a2a1a"/>`;
  const palm = (x, y, h, c) => `<path d="M${x} ${y}q${h * 0.08} ${-h * 0.5} ${h * 0.02} ${-h}" stroke="#5a4428" stroke-width="${h * 0.06}" fill="none"/><g fill="${c}"><path d="M${x + h * 0.02} ${y - h}q${-h * 0.4} ${-h * 0.1} ${-h * 0.55} ${h * 0.25}q${h * 0.3} ${-h * 0.18} ${h * 0.55} ${-h * 0.25}z"/><path d="M${x + h * 0.02} ${y - h}q${h * 0.4} ${-h * 0.12} ${h * 0.55} ${h * 0.25}q${-h * 0.3} ${-h * 0.18} ${-h * 0.55} ${-h * 0.25}z"/><path d="M${x + h * 0.02} ${y - h}q${-h * 0.1} ${-h * 0.35} ${h * 0.3} ${-h * 0.3}q${-h * 0.25} ${h * 0.02} ${-h * 0.3} ${h * 0.3}z"/></g>`;
  const ruin = (x, y, w, h, c) => { let win = ''; for (let i = 0; i < 3; i++) for (let j = 0; j < Math.floor(h / 14); j++) if ((i + j * 3 + x) % 4) win += `<rect x="${x + 4 + i * (w - 8) / 3}" y="${y - h + 6 + j * 14}" width="${(w - 8) / 3 - 4}" height="7" fill="#1e1b16" opacity="0.8"/>`; return `<path d="M${x} ${y}V${y - h + 6}l${w * 0.3} -6l${w * 0.15} 10l${w * 0.25} -4V${y - h * 0.55}l${w * 0.3} 6V${y}z" fill="${c}" stroke="${OUT}" stroke-width="0.6"/>${win}`; };
  const TER_PAL = { plains: 'day', forest: 'day', hills: 'day', mountain: 'day', desert: 'desert', marsh: 'day', jungle: 'day', urban: 'dusk' };
  const terrain = (te, W, H, seed) => {
    const hy = H * 0.62; let s = '';
    if (te === 'forest') { for (let i = 0; i < 26; i++) { const x = (i * 53 + seed) % (W + 20) - 10, yy = hy + 4 + ((i * 17) % 10); s += tree(x, yy, 22 + ((i * 7) % 12), i % 3 ? '#3f5a34' : '#34502c'); } }
    else if (te === 'jungle') { for (let i = 0; i < 16; i++) { const x = (i * 61 + seed) % (W + 20) - 10; s += palm(x, hy + 8 + ((i * 13) % 10), 30 + ((i * 7) % 14), i % 2 ? '#2f5a2c' : '#3b6a33'); } }
    else if (te === 'mountain') s += `<path d="M0 ${hy}L50 ${hy - 50}L90 ${hy - 20}L140 ${hy - 70}L200 ${hy - 14}L250 ${hy - 56}L${W} ${hy - 10}V${hy + 10}H0Z" fill="#8a8e8c"/><path d="M140 ${hy - 70}l14 16l-8-2l-6 6l-8-8l-8 2z M250 ${hy - 56}l12 14l-7-1l-5 5l-7-7l-6 2z M50 ${hy - 50}l10 12l-6-1l-4 4l-6-6l-5 2z" fill="#eef1f2"/>`;
    else if (te === 'hills') s += `<path d="M0 ${hy + 4}Q60 ${hy - 30} 120 ${hy}T240 ${hy - 4}T${W + 40} ${hy}V${hy + 20}H0Z" fill="#7d7c56" opacity="0.9"/>`;
    else if (te === 'desert') s += `<path d="M0 ${hy + 10}Q80 ${hy - 6} 160 ${hy + 8}T${W} ${hy + 4}V${H}H0Z" fill="#d9bd85" opacity="0.8"/><path d="M40 ${hy + 30}q30-8 60 0M200 ${hy + 26}q30-8 60 0" stroke="#b8975e" stroke-width="1.2" fill="none"/>`;
    else if (te === 'marsh') { s += `<g fill="#5f7f80" opacity="0.85"><ellipse cx="80" cy="${hy + 30}" rx="50" ry="6"/><ellipse cx="230" cy="${hy + 24}" rx="40" ry="5"/></g>`; let r = ''; for (let i = 0; i < 30; i++) { const x = (i * 37 + seed) % W; r += `M${x} ${hy + 28 + (i % 5)}l${(i % 3) - 1} -10`; } s += `<path d="${r}" stroke="#4d5a34" stroke-width="1"/>`; }
    else if (te === 'urban') { const xs = [0, 46, 98, 170, 222, 268]; xs.forEach((x, i) => { s += ruin(x, hy + 6, 40 + (i % 2) * 10, 40 + ((i * 17) % 30), i % 2 ? '#6b6158' : '#5b524a'); }); s += `<path d="M0 ${hy + 6}h${W}v6H0z" fill="#4a443c"/>`; }
    return s;
  };
  const riverBand = (W, H) => `<path d="M0 ${H * 0.74}C${W * 0.3} ${H * 0.7} ${W * 0.6} ${H * 0.8} ${W} ${H * 0.73}V${H * 0.84}C${W * 0.6} ${H * 0.9} ${W * 0.3} ${H * 0.8} 0 ${H * 0.85}Z" fill="#5f7f8f"/><path d="M20 ${H * 0.79}q30-3 60 0M150 ${H * 0.8}q30-3 60 0" stroke="#a9c0c8" stroke-width="1" fill="none"/>`;
  const blast = (x, y, s) => `<g opacity="0.9"><circle cx="${x}" cy="${y}" r="${9 * s}" fill="#ffcc66" style="filter:blur(${2 * s}px)"/><circle cx="${x}" cy="${y}" r="${4.5 * s}" fill="#fff4d0"/></g>${smoke(x - 4 * s, y - 6 * s, s, '#8a8070', 0.6)}`;
  // bir tarafın kuvveti (sağa bakan, 0..160 bölgesi); savunan aynalanır
  const force = (tag, kind, lvl, y, H, def) => {
    const sol = (x, yy, sc, pose, k) => put(soldier(tag, y, pose, k), x, yy, sc);
    const gy = H - 10;
    switch (kind) {
      case 'arm': { const t = tank(tag, lvl, y), sc = Math.min(1.2, 120 / t.w); return put(t.svg, 30, gy - t.h * sc, sc) + sol(4, gy - 64 * 0.8, 0.8, 'adv', 1); }
      case 'mot': case 'mech': return put(truck(tag, kind === 'mech'), 6, gy - 42 * 1.3, 1.3) + sol(96, gy - 64 * 0.95, 0.95, 'adv', 0) + sol(126, gy - 64 * 0.82, 0.82, 'adv', 2);
      case 'cav': return put(horse(tag, y, 1), 4, gy - 64 * 0.9, 0.9) + put(horse(tag, y, 0), 64, gy - 64 * 1.05, 1.05);
      case 'art': return put(gun(tag, 'art'), 50, gy - 44 * 1.6, 1.6) + sol(14, gy - 64 * 0.9, 0.9, 'kneel', 0) + blast(150, gy - 74, 0.7);
      default:
        if (def) return `<path d="M110 ${gy}q10-12 22-12h28v12z" fill="#7a6a48" stroke="${OUT}" stroke-width="0.6"/><g fill="#a08a5c" stroke="${OUT}" stroke-width="0.6">${[0, 1, 2, 3].map((i) => `<rect x="${116 + i * 11}" y="${gy - 14}" width="11" height="6" rx="2.5"/><rect x="${121 + i * 11 - 6}" y="${gy - 20}" width="11" height="6" rx="2.5"/>`).join('')}</g>` + sol(96, gy - 64 * 1.05, 1.05, 'kneel', 0) + sol(60, gy - 64 * 0.95, 0.95, 'kneel', 1) + sol(20, gy - 64 * 0.85, 0.85, 'adv', 2);
        return sol(100, gy - 64 * 1.1, 1.1, 'adv', 0) + sol(56, gy - 64 * 1.0, 1.0, 'adv', 1) + sol(14, gy - 64 * 0.9, 0.9, 'kneel', 2);
    }
  };
  // muharebe sahnesi: solda saldıran, sağda (aynalı) savunan; arazi ve nehir arka planda
  G.art.battle = (aTag, aKind, aLvl, dTag, dKind, dLvl, te, river, y = yearNow()) => memo(`b|${aTag}|${aKind}|${aLvl}|${dTag}|${dKind}|${dLvl}|${te}|${river ? 1 : 0}|${y >= 1942 ? 1942 : y >= 1940 ? 1940 : 1936}`, () => {
    const W = 320, H = 150, id = 'bt' + ++uid, sd = hash(aTag + dTag + te);
    const pal = PAL[TER_PAL[te] || 'day'];
    let s = ground(W, H, pal, id) + terrain(te, W, H, sd % 97);
    if (river) s += riverBand(W, H);
    s += smoke(150, 70, 1.3, '#bdb4a2', 0.55) + smoke(200, 64, 0.9, '#cfc6b2', 0.45);
    s += `<path d="M120 96L190 84M128 104L200 96M200 90L140 100" stroke="#ffe08a" stroke-width="0.9" opacity="0.8" stroke-dasharray="6 9"/>`;
    s += blast(160, 98, 0.9) + blast(222, 108, 0.6);
    s += `<g>${force(aTag, aKind, aLvl, y, H, false)}</g>`;
    s += `<g transform="translate(${W} 0) scale(-1 1)">${force(dTag, dKind, dLvl, y, H, true)}</g>`;
    s += grass(W, H - 14, shade(pal.gr2, -0.2), sd) + vignette(W, H, id);
    return svg(W, H, s, 'art battleart');
  });
  // olay sahneleri için parçalar (eventart.js kullanır)
  G.art.kit = { soldier, horse, tank, truck, gun, plane, ship, insignia, ground, vignette, smoke, grass, put, svg, PAL, shade, hash, terrain, ruin, tree, blast, nat, starPath, OUT, yearNow, memo, next: () => ++uid };

  // <img> olarak kullanım: aynı resim sayfada çok kez geçse de SVG metni bir kez çözülür (blob adresi önbellekte)
  const urls = new Map();
  G.art.url = (svgStr) => {
    let u = urls.get(svgStr);
    if (!u) { try { u = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' })); } catch (e) { u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr); } urls.set(svgStr, u); }
    return u;
  };
  G.art.img = (svgStr, cls = '') => `<img class="artimg ${cls}" src="${G.art.url(svgStr)}" alt="" decoding="async" draggable="false">`;
  // kısayollar: tümen, komutan ve teçhizat resmi
  G.art.unitOf = (u) => { const k = G.art.kindOf(u); return G.art.unit(k, u.t, yearNow(), k === 'arm' ? G.art.tankLvl(G.st.C[u.t]) : 1); };
  G.art.tplOf = (c, tpl) => { const k = G.art.kindOfB(tpl.b); return G.art.unit(k, c.tag, yearNow(), k === 'arm' ? G.art.tankLvl(c) : 1); };
  G.art.genImg = (gen, tag, cls = 'portrait-s') => G.art.img(G.art.portrait(gen, tag), cls);
  G.art.eqImg = (e, lvl, tag, cls = 'vehthumb') => G.art.img(G.art.vehicle(e, Math.max(1, Math.floor(lvl || 1)), tag), cls);
  // harita sayacı silueti (resimli sayaç): 52x32, saydam zemin; Image önbellekte, yüklenince harita yeniden çizilir
  const sprites = new Map();
  const spriteSvg = (kind, tag, y) => {
    let b = '';
    if (kind === 'arm') { const t = tank(tag, G.art.tankLvl(G.st.C[tag]), y), sc = Math.min(50 / t.w, 30 / t.h); b = put(t.svg, (52 - t.w * sc) / 2, 31 - t.h * sc, sc); }
    else if (kind === 'mot' || kind === 'mech') b = put(truck(tag, kind === 'mech'), 3, 2, 0.7);
    else if (kind === 'cav') b = put(horse(tag, y, 0), 6, 2, 0.47);
    else if (kind === 'art') b = put(gun(tag, 'art'), 3, 4, 0.68);
    else b = put(soldier(tag, y, 'adv', 0), 4, 1, 0.47) + put(soldier(tag, y, 'adv', 1), 24, 1, 0.47);
    return `<svg viewBox="0 0 52 32" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
  };
  G.art.sprite = (kind, tag) => {
    const y = yearNow(), k = kind + '|' + tag + '|' + (y >= 1942 ? 1942 : 1936) + '|' + (kind === 'arm' ? G.art.tankLvl(G.st.C[tag]) : 0);
    let im = sprites.get(k);
    if (!im) { im = new Image(); im.onload = () => { if (G.R) G.R.dirty = 1; }; im.src = G.art.url(spriteSvg(kind, tag, y)); sprites.set(k, im); }
    return im.complete && im.naturalWidth ? im : null;
  };
  G.art.clear = () => cache.clear();
})(window);
