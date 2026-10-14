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
    let s = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.s1}"/><stop offset="1" stop-color="${p.s2}"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.gr}"/><stop offset="1" stop-color="${p.gr2}"/></linearGradient><radialGradient id="${id}v" cx="0.5" cy="0.45" r="0.78"><stop offset="0.66" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.26"/></radialGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
    s += `<path d="M0 ${hy - 6} C${W * 0.15} ${hy - 22} ${W * 0.3} ${hy - 10} ${W * 0.45} ${hy - 18} S${W * 0.75} ${hy - 6} ${W * 0.88} ${hy - 20} S${W} ${hy - 12} ${W} ${hy - 14} V${H} H0Z" fill="${p.far}" opacity="0.75"/>`;
    s += `<path d="M0 ${hy + 2} C${W * 0.2} ${hy - 8} ${W * 0.4} ${hy + 4} ${W * 0.6} ${hy - 4} S${W * 0.9} ${hy + 6} ${W} ${hy - 2} V${H} H0Z" fill="${p.mid}"/>`;
    s += `<path d="M0 ${hy + 14} C${W * 0.25} ${hy + 6} ${W * 0.5} ${hy + 18} ${W * 0.75} ${hy + 10} S${W} ${hy + 14} ${W} ${hy + 12} V${H} H0Z" fill="url(#${id}g)"/>`;
    return s;
  };
  const vignette = (W, H, id) => `<rect width="${W}" height="${H}" fill="url(#${id}v)"/>`;
  // duman: CSS bulanıklığı yerine radyal gradyanlı katmanlı bulutlar (her tarayıcıda aynı, keskin ama yumuşak geçişli)
  const smoke = (x, y, s, c = '#d8d0bc', o = 0.55) => { const id = 'sm' + ++uid, d = shade(c, -0.12); return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}"/><stop offset="0.5" stop-color="${c}" stop-opacity="0.85"/><stop offset="1" stop-color="${d}" stop-opacity="0"/></radialGradient></defs><g fill="url(#${id})" opacity="${o}"><circle cx="${x}" cy="${y}" r="${9 * s}"/><circle cx="${x + 8 * s}" cy="${y - 9 * s}" r="${11.5 * s}"/><circle cx="${x + 1 * s}" cy="${y - 19 * s}" r="${13.5 * s}"/><circle cx="${x + 12 * s}" cy="${y - 28 * s}" r="${15 * s}"/><circle cx="${x + 4 * s}" cy="${y - 36 * s}" r="${12 * s}" opacity="0.7"/></g>`; };
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
  const rifle = (x1, y1, x2, y2, bay) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, mx = x1 + ux * L * 0.62, my = y1 + uy * L * 0.62, bx = x1 + ux * L * 0.4, by2 = y1 + uy * L * 0.4; return `<path d="M${x1} ${y1}L${mx.toFixed(1)} ${my.toFixed(1)}" stroke="#4a3220" stroke-width="2" stroke-linecap="round"/><path d="M${x1} ${y1}L${(x1 + ux * 4).toFixed(1)} ${(y1 + uy * 4).toFixed(1)}" stroke="#36241a" stroke-width="2.6" stroke-linecap="round"/><path d="M${bx.toFixed(1)} ${by2.toFixed(1)}l${(-uy * 1.8).toFixed(1)} ${(ux * 1.8).toFixed(1)}" stroke="#2b2b2b" stroke-width="0.8" stroke-linecap="round"/><path d="M${mx.toFixed(1)} ${my.toFixed(1)}L${x2} ${y2}" stroke="#2b2b2b" stroke-width="1.1" stroke-linecap="round"/>${bay ? `<path d="M${x2} ${y2}l${(ux * 5).toFixed(1)} ${(uy * 5).toFixed(1)}" stroke="#bfc3c6" stroke-width="0.7"/>` : ''}`; };
  const limb = (d, c, w) => `<path d="${d}" stroke="${OUT}" stroke-width="${w + 1.3}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // yüz ayrıntısı (kaş, burun gölgesi, çene kayışı); dy baş merkezinin kayması
  const faceBits = (sk, dy) => `<path d="M13.2 ${11.6 + dy}Q14.2 ${15.4 + dy} 18.4 ${15 + dy}" stroke="#2b261f" stroke-width="0.5" fill="none"/><path d="M18 ${8.8 + dy}l2.2 0.3" stroke="#3a2a1e" stroke-width="0.6" stroke-linecap="round"/><path d="M20.5 ${10.6 + dy}l0.9 1.4-1 0.2z" fill="${shade(sk, -0.18)}"/><path d="M12.4 ${9.4 + dy}Q12 ${12.6 + dy} 14 ${14.2 + dy}" stroke="${shade(sk, -0.2)}" stroke-width="1" fill="none" opacity="0.6"/>`;
  const soldier = (tag, year, pose = 'adv', k = 0) => {
    const n = nat(tag), u = n.u, ud = shade(u, -0.22), ul = shade(u, 0.12), sk = skinOf(n, k), boot = '#2a241c', belt = n.ins === 'redstar' || n.ins === 'cross' ? '#2b2620' : '#6b5232';
    const hel = helmet(helmetOf(n, year), n.h === 'cap' ? u : shade(u, -0.05));
    if (pose === 'kneel') {
      return `${limb('M14 40L8 46L4 58', ud, 4.8)}<path d="M2 57h7v3H2z" fill="${boot}"/>${limb('M16 40L24 44L23 58', u, 4.8)}<path d="M21 56h7v3h-7z" fill="${boot}"/>`
        + `<path d="M7 26h5v11H7z" fill="${shade(u, -0.3)}" stroke="${OUT}" stroke-width="0.6"/><path d="M10 22Q15 20 19.5 22L20.5 41L10.5 41Z" fill="${u}" stroke="${OUT}" stroke-width="0.7"/><path d="M12 23Q15 22 17.6 23" stroke="${ul}" stroke-width="1.2" fill="none"/><rect x="10.3" y="35" width="10.4" height="2.2" fill="${belt}"/>`
        + `${rifle(9, 31, 36, 21, 1)}${limb('M12 25L18 30L26 26', ud, 3.4)}${limb('M17 24L24 25L30 23.5', u, 3.4)}<circle cx="30.4" cy="23.4" r="1.6" fill="${sk}"/>`
        + `<rect x="14.6" y="15.5" width="3.2" height="4" fill="${sk}"/><circle cx="16.3" cy="13" r="4.4" fill="${sk}" stroke="${OUT}" stroke-width="0.6"/><circle cx="19" cy="12.6" r="0.55" fill="#222"/>${faceBits(sk, 2.5)}${hel}`;
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
    // teçhizat: sırt çantası, matara, (Alman) gaz maskesi kutusu, Y askılar; üniformada arka gölge
    const gas = n.ins === 'cross' ? `<rect x="6.4" y="31.6" width="3.4" height="6.6" rx="1.5" fill="#6b7062" stroke="${OUT}" stroke-width="0.5"/><path d="M6.4 33.6h3.4M6.4 35.6h3.4" stroke="#4b5045" stroke-width="0.4"/>` : '';
    return `${legs}<path d="M5.6 20.5h5.6v12H5.6z" fill="${shade(u, -0.3)}" stroke="${OUT}" stroke-width="0.6" rx="1"/>${gas}`
      + `<path d="M10 19Q15 16.8 20 19L21 37L11 37Z" fill="${u}" stroke="${OUT}" stroke-width="0.7"/><path d="M10.4 19.4Q11.8 18.4 13 18.4L12.4 37H11Z" fill="#000" opacity="0.16"/><path d="M11.6 20Q15 18.8 18 19.8" stroke="${ul}" stroke-width="1.2" fill="none"/><path d="M15.6 20.5v15" stroke="${ud}" stroke-width="0.5"/><path d="M12 19.6L15.2 31.6M18.8 19.4L16.4 31.6" stroke="${belt}" stroke-width="0.9"/>`
      + `<ellipse cx="11.2" cy="35.4" rx="1.7" ry="2.3" fill="#56584a" stroke="${OUT}" stroke-width="0.4"/><rect x="10.6" y="32.6" width="1.2" height="0.9" fill="#2b2b2b"/>`
      + `<rect x="10.6" y="31.6" width="10.6" height="2.2" fill="${belt}"/><rect x="15" y="31.4" width="2" height="2.6" fill="#a8956a"/><rect x="12" y="32.4" width="2.4" height="3" fill="${shade(belt, 0.1)}"/>`
      + `${arms}<rect x="14.6" y="12.5" width="3.2" height="4" fill="${sk}"/><circle cx="16.3" cy="10.5" r="4.4" fill="${sk}" stroke="${OUT}" stroke-width="0.6"/><circle cx="19" cy="10.2" r="0.55" fill="#222"/><path d="M19.6 12.6h1.4" stroke="#7a4b35" stroke-width="0.5"/>${faceBits(sk, 0)}${hel}`;
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
  // ülkeye özgü silüet: ger kutu gövde (Pz III/IV), 3+ seviyede eğik zırh ve iç içe tekerlek (Panther);
  // sov eğik zırh, basık döküm kule, Christie tekerlek (T-34/IS); usa yüksek gövde, yuvarlak döküm kule, boji (M3/Sherman);
  // eng alçak uzun gövde, köşeli kule (Matilda/Cromwell); jap küçük gövde, ortada kule (Chi-Ha); ita perçinli kutu (M13/40);
  // fra yuvarlak APX kulesi ve yan zırh (Somua/Char B); diğerleri en yakın türe eşlenir
  const TK = { GER: 'ger', HUN: 'ger', BUL: 'ger', SOV: 'sov', PRC: 'sov', MON: 'sov', FIN: 'sov', USA: 'usa', CHI: 'usa', BRA: 'usa', MEX: 'usa', ENG: 'eng', CAN: 'eng', AST: 'eng', RAJ: 'eng', SAF: 'eng', NZL: 'eng', POL: 'eng', HOL: 'eng', JAP: 'jap', MAN: 'jap', SIA: 'jap', ITA: 'ita', CZE: 'ita', SPN: 'ita', SPR: 'sov', FRA: 'fra', BEL: 'fra', ROM: 'fra', YUG: 'fra', GRE: 'fra', TUR: 'eng' };
  const f1 = (v) => +v.toFixed(1);
  const tank = (tag, lvl, year, lod) => {
    const n = nat(tag), lv = Math.max(1, Math.min(4, lvl | 0 || 1)), T = TANK[lv], st = TK[tag] || 'gen', id = 'tk' + ++uid, big = lv >= 3;
    const base = n.cam2y && year >= n.cam2y && n.cam[1] ? n.cam[1] : n.cam[0], blot = n.cam2y && year >= n.cam2y ? n.cam[0] : n.cam[1];
    const [kL, kH, kT] = { jap: [0.84, 0.9, 0.78], eng: [1.06, 0.86, 1], usa: [0.98, 1.16, 1.06], ita: [0.9, 0.95, 0.82], sov: [1.02, 0.94, 1.14], fra: [0.95, 1.08, 0.9] }[st] || [1, 1, 1];
    const L = Math.round(T.L * kL), H = T.H * kH, tw = T.tw * kT, th = T.th * (st === 'sov' ? 0.86 : st === 'eng' ? 1.05 : 1), gun = T.gun * (st === 'jap' || st === 'ita' ? 0.72 : st === 'usa' && lv === 1 ? 0.8 : 1), gw = T.gw;
    const by = 30, top = by - H * (st === 'usa' ? 0.45 : st === 'eng' ? 0.04 : 0.15), bot = by + H;
    const HP = {
      ger: big ? [[0, top + 2], [3, top], [L - H * 1.15, top], [L, by + H * 0.55], [L - 4, bot], [4, bot], [0, by + H * 0.5]]
        : [[0, top + 1.5], [2, top], [L - 4, top], [L - 4, by + H * 0.3], [L, by + H * 0.36], [L, by + H * 0.62], [L - 5, bot], [5, bot], [0, by + H * 0.55]],
      sov: [[0, by + H * 0.25], [H * 0.55, top], [L - H * 1.25, top], [L, by + H * 0.5], [L - 6, bot], [6, bot], [1, by + H * 0.62]],
      usa: [[0, top + 2], [3, top], [L - H * 0.95, top], [L - H * 0.25, by + H * 0.2], [L, by + H * 0.55], [L - 5, bot], [5, bot], [0, by + H * 0.5]],
      eng: [[0, top], [L - 7, top], [L, top + 3], [L, by + H * 0.6], [L - 6, bot], [6, bot], [0, by + H * 0.6]],
      jap: [[0, by + H * 0.15], [5, top], [L * 0.5, top], [L - 9, top + 1.5], [L, by + H * 0.5], [L - 5, bot], [5, bot], [0, by + H * 0.55]],
      ita: [[0, top], [L - 13, top], [L - 3, by + H * 0.22], [L, by + H * 0.55], [L - 5, bot], [4, bot], [0, by + H * 0.55]],
      fra: [[0, by], [4, top], [L - 10, top], [L, by + H * 0.3], [L, by + H * 0.62], [L - 6, bot], [6, bot]],
      gen: [[0, by], [T.slope, top], [L - T.slope * 1.4, top], [L, by + H * 0.5], [L - 4, bot], [4, bot]],
    };
    const hull = 'M' + HP[st].map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z';
    // kule
    const tx = f1(L * ({ jap: 0.4, sov: 0.26, usa: 0.33, eng: 0.3 }[st] || 0.32)), tb = f1(top + 0.5), ty = f1(tb - th), tr = f1(tx + tw);
    const TU = {
      ger: big ? `M${tx} ${tb}L${tx + 1} ${f1(ty + 2)}L${f1(tx + tw * 0.72)} ${ty}L${f1(tr + 2)} ${f1(ty + th * 0.62)}L${f1(tr + 2)} ${tb}Z` : `M${tx} ${tb}L${tx + 2} ${f1(ty + 1)}L${f1(tr - 3)} ${ty}L${f1(tr + 1)} ${f1(ty + th * 0.35)}L${f1(tr + 1)} ${tb}Z`,
      sov: lv >= 4 ? `M${tx - 2} ${tb}Q${tx - 1} ${ty} ${f1(tx + tw * 0.5)} ${ty}Q${f1(tr + 4)} ${f1(ty + 1)} ${f1(tr + 4)} ${tb}Z` : `M${tx - 2} ${tb}L${tx + 3} ${f1(ty + 1)}L${f1(tr - 4)} ${ty}L${f1(tr + 3)} ${f1(ty + th * 0.72)}L${f1(tr + 3)} ${tb}Z`,
      usa: `M${tx} ${tb}Q${tx} ${ty} ${f1(tx + tw * 0.45)} ${ty}Q${f1(tr + 3)} ${ty} ${f1(tr + 3)} ${tb}Z`,
      fra: `M${tx} ${tb}Q${tx + 1} ${ty} ${f1(tx + tw * 0.5)} ${ty}Q${f1(tr + 1)} ${ty} ${f1(tr + 1)} ${tb}Z`,
      eng: `M${tx} ${tb}L${tx} ${ty}L${tr} ${ty}L${f1(tr + 1.5)} ${tb}Z`,
      jap: `M${tx} ${tb}L${tx + 2} ${f1(ty + 1.5)}Q${f1(tx + tw * 0.5)} ${f1(ty - 1)} ${f1(tr - 2)} ${f1(ty + 1.5)}L${tr} ${tb}Z`,
      ita: `M${tx} ${tb}L${tx + 1} ${ty}L${f1(tr - 3)} ${ty}L${f1(tr + 1)} ${f1(ty + th * 0.55)}L${f1(tr + 1)} ${tb}Z`,
      gen: `M${tx} ${tb}L${tx + 3} ${ty}L${tr} ${ty}L${f1(tr + 3)} ${tb}Z`,
    };
    const tur = TU[st];
    const tf = f1(tr + (st === 'sov' ? 3 : st === 'usa' ? 3 : st === 'ger' && big ? 2 : 1)), gy = f1(ty + th * 0.45);
    let s = `<defs><linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient><clipPath id="${id}c"><path d="${hull} ${tur}"/></clipPath></defs>`;
    // yürüyen aksam: tekerlek düzeni türe göre
    const wr0 = T.wr, tY = f1(by + H - 2);
    const WH = { sov: ['chr', 5, 1.3], eng: ['chr', 5, 1.22], ger: big ? ['int', 8, 1.15] : ['sm', 6, 0.72], usa: ['vv', 6, 0.8], jap: ['sm', 8, 0.6], ita: ['sm', 8, 0.58], fra: ['sm', 7, 0.66], gen: ['std', T.wheels, 1] }[st];
    const [wt, wn, wk] = WH, wr = f1(wr0 * wk), tH = f1(wr * 2 + 4), wy = f1(tY + tH / 2);
    if (!lod) s += `<ellipse cx="${f1(L / 2)}" cy="${f1(tY + tH + 0.8)}" rx="${f1(L * 0.54)}" ry="2.6" fill="#000" opacity="0.22"/>`;
    s += `<rect x="1" y="${tY}" width="${L - 2}" height="${tH}" rx="${f1(tH / 2)}" fill="#2b2925" stroke="${OUT}" stroke-width="0.8"/>`;
    if (!lod) { let links = ''; for (let x = 4; x < L - 4; x += 2.6) links += `M${f1(x)} ${f1(tY + 0.6)}v1.6M${f1(x)} ${f1(tY + tH - 2.2)}v1.6`; s += `<path d="${links}" stroke="#57534b" stroke-width="0.9"/>`; }
    const wheel = (cx, r, sh = 0) => {
      let w = `<circle cx="${f1(cx)}" cy="${wy}" r="${r}" fill="${shade('#3d3a33', sh)}" stroke="#1b1a16" stroke-width="0.8"/>`;
      if (lod) return w + `<circle cx="${f1(cx)}" cy="${wy}" r="${f1(r * 0.4)}" fill="#77726a"/>`;
      w += `<circle cx="${f1(cx)}" cy="${wy}" r="${f1(r * 0.72)}" fill="none" stroke="#5a564d" stroke-width="0.6"/><circle cx="${f1(cx)}" cy="${wy}" r="${f1(r * 0.34)}" fill="#77726a" stroke="#2a2823" stroke-width="0.4"/>`;
      if (wt === 'chr') for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; w += `<circle cx="${f1(cx + Math.cos(a) * r * 0.55)}" cy="${f1(wy + Math.sin(a) * r * 0.55)}" r="${f1(r * 0.1)}" fill="#24221d"/>`; }
      return w;
    };
    const span = L - 12 - wr * 2;
    if (wt === 'vv') {
      for (let b = 0; b < 3; b++) { const c0 = 7 + wr + (b * span) / 2.2; s += wheel(c0, wr) + wheel(c0 + wr * 2.1, wr) + `<path d="M${f1(c0 - 1)} ${f1(wy - wr - 1.6)}h${f1(wr * 2.1 + 2)}l-1.5 ${f1(wr + 0.6)}h-${f1(wr * 2.1 - 1)}z" fill="${shade(base, -0.25)}" stroke="${OUT}" stroke-width="0.5"/>`; }
    } else if (wt === 'int') {
      for (let i = 0; i < wn; i++) { const cx = 7 + wr + (i * span) / (wn - 1); if (i % 2) s += wheel(cx, wr, -0.15); }
      for (let i = 0; i < wn; i++) { const cx = 7 + wr + (i * span) / (wn - 1); if (!(i % 2)) s += wheel(cx, wr); }
    } else for (let i = 0; i < wn; i++) s += wheel(7 + wr + (i * span) / (wn - 1), wr);
    // taşıyıcı makaralar ve uç dişliler
    if (!lod && (wt === 'sm' || wt === 'vv')) for (let i = 0; i < 3; i++) s += `<circle cx="${f1(L * (0.25 + i * 0.25))}" cy="${f1(tY + 2)}" r="1.3" fill="#4a463e" stroke="#1b1a16" stroke-width="0.4"/>`;
    s += `<circle cx="${f1(tH / 2 + 1)}" cy="${wy}" r="${f1(tH / 2 - 2.2)}" fill="#34312b" stroke="#1b1a16" stroke-width="0.6"/><circle cx="${f1(L - tH / 2 - 1)}" cy="${wy}" r="${f1(tH / 2 - 2)}" fill="#34312b" stroke="#1b1a16" stroke-width="0.6"/>`;
    // gövde, çamurluk, yan zırh
    s += `<path d="${hull}" fill="${base}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/>`;
    s += `<path d="M0 ${f1(tY - 0.4)}H${L}" stroke="${shade(base, -0.35)}" stroke-width="1.2"/>`;
    if (T.skirt || st === 'fra') s += `<path d="M6 ${f1(by + H - 3)}h${L - 14}v${f1(wr * 0.9 + 1)}h-${L - 14}z" fill="${shade(base, -0.08)}" stroke="${OUT}" stroke-width="0.6"/>`;
    // top: namlu, kalkan (mantle), namlu freni
    s += `<rect x="${tf}" y="${f1(gy - gw / 2)}" width="${f1(gun)}" height="${gw}" fill="${shade(base, -0.22)}" stroke="${OUT}" stroke-width="0.6"/>`;
    if (T.brake && st !== 'eng' && st !== 'jap') s += `<rect x="${f1(tf + gun - 2)}" y="${f1(gy - gw)}" width="5" height="${f1(gw * 2)}" fill="${shade(base, -0.3)}" stroke="${OUT}" stroke-width="0.6"/>`;
    // kule ve ayrıntılar
    s += `<path d="${tur}" fill="${base}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/>`;
    s += `<rect x="${f1(tf - 1.6)}" y="${f1(gy - gw * 1.3)}" width="${f1(st === 'usa' || st === 'ger' ? 4 : 3)}" height="${f1(gw * 2.6)}" rx="1" fill="${shade(base, -0.12)}" stroke="${OUT}" stroke-width="0.6"/>`;
    const cup = st === 'jap' ? f1(tx + tw * 0.55) : st === 'sov' ? f1(tx + tw * 0.3) : f1(tx + 3);
    if (st === 'ger' || st === 'usa' || st === 'fra' || st === 'jap' || big) s += `<path d="M${cup} ${ty}v-2.6h${st === 'jap' ? 4 : 5.5}v2.6z" fill="${shade(base, -0.1)}" stroke="${OUT}" stroke-width="0.6"/>`;
    else s += `<path d="M${f1(tx + tw * 0.25)} ${ty}h${f1(tw * 0.35)}v-1.4h-${f1(tw * 0.35)}z" fill="${shade(base, -0.1)}" stroke="${OUT}" stroke-width="0.5"/>`;
    s += `<path d="M${f1(cup + 2)} ${f1(ty - 2.6)}l-6 -14" stroke="#222" stroke-width="0.6"/>`;
    if (!lod) {
      // perçinler (ita, jap, erken eng), kapaklar, egzoz, aletler, yedek palet
      if (st === 'ita' || st === 'jap' || (st === 'eng' && !big)) { let r = ''; for (let x = 4; x < L - 8; x += 4.5) r += `<circle cx="${f1(x)}" cy="${f1(top + 1.6)}" r="0.45"/><circle cx="${f1(x)}" cy="${f1(by + H * 0.5)}" r="0.45"/>`; for (let x = tx + 2; x < tr - 1; x += 3.5) r += `<circle cx="${f1(x)}" cy="${f1(ty + 1.6)}" r="0.4"/>`; s += `<g fill="${shade(base, -0.4)}">${r}</g>`; }
      s += `<path d="M${f1(L * 0.68)} ${f1(top + 0.2)}h${f1(L * 0.12)}v1.2h-${f1(L * 0.12)}z" fill="${shade(base, -0.18)}"/>`;
      s += `<path d="M${f1(L * 0.12)} ${f1(tY - 2)}h${f1(L * 0.22)}" stroke="#6b5434" stroke-width="1.1" stroke-linecap="round"/><path d="M${f1(L * 0.36)} ${f1(tY - 1.6)}h${f1(L * 0.1)}" stroke="#4a4a46" stroke-width="0.8"/>`;
      s += st === 'ger' ? `<rect x="-1.5" y="${f1(by + H * 0.12)}" width="4" height="3" rx="1.5" fill="#3a3530" stroke="${OUT}" stroke-width="0.4"/>` : `<path d="M0.5 ${f1(by + H * 0.25)}h-2v2h2" fill="#2e2b26"/>`;
      if (st === 'sov' && lv >= 2) s += `<rect x="1" y="${f1(top - 3)}" width="${f1(L * 0.12)}" height="3" rx="1.5" fill="${shade(base, -0.15)}" stroke="${OUT}" stroke-width="0.4"/>`;
      if (st === 'ger' && !big) s += `<path d="M${f1(L - 4)} ${f1(by + H * 0.42)}h3.6v3h-3.6z" fill="#2b2925" stroke="${OUT}" stroke-width="0.4"/>`;
    }
    // kamuflaj lekeleri, ışık ve gölge
    if (blot) { let b = ''; for (let i = 0; i < 6; i++) { const x = ((i * 37 + hash(tag)) % (L - 10)) + 4, y = by - th + ((i * 11) % (H + th)); b += `<ellipse cx="${x}" cy="${f1(y)}" rx="${7 + (i % 3) * 3}" ry="${3 + (i % 2) * 2}" transform="rotate(${(i * 23) % 40 - 20} ${x} ${f1(y)})"/>`; } s += `<g clip-path="url(#${id}c)" fill="${blot}" opacity="0.75">${b}</g>`; }
    s += `<path d="${hull} ${tur}" fill="url(#${id}h)"/>`;
    s += insignia(tag, f1(tx + tw * (st === 'jap' ? 0.35 : 0.5)), f1(ty + th * 0.58), Math.min(lod ? 5 : 4.2, th * (lod ? 0.4 : 0.32)));
    return { svg: s, w: f1(tf + gun + (T.brake ? 4 : 1)), h: f1(tY + tH + (lod ? 0 : 3.4)) };
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
  const plane = (tag, e, lvl, year, lod) => {
    const n = nat(tag), c = n.ins === 'redstar' ? '#55613f' : n.ins === 'usstar' ? (year >= 1944 ? '#b9bcbf' : '#5d6342') : n.ins === 'hinomaru' ? (e === 'fig' ? '#c9c5b2' : '#4f5a3c') : n.ins === 'cross' ? '#5f6852' : n.ins === 'roundel' && n.rc[0] === '#1f3a8a' ? '#6a6446' : shade(n.cam[0], 0.05);
    const belly = n.ins === 'hinomaru' && e === 'fig' ? '#c9c5b2' : '#a9b4b8', cd = shade(c, -0.22), id = 'pl' + ++uid;
    const jet = e === 'fig' && lvl >= 4;
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="0.55" stop-color="${c}"/><stop offset="0.56" stop-color="${belly}"/><stop offset="1" stop-color="${shade(belly, -0.1)}"/></linearGradient></defs>`;
    if (e === 'bom') {
      // ağır bombardıman (USA/ENG 2+): dört motor; GER/SOV/ITA camlı burun; ENG çift dikey kuyruk
      const heavy = (n.ins === 'usstar' || (n.ins === 'roundel' && n.rc[0] === '#1f3a8a')) && lvl >= 2, glaze = ['cross', 'redstar'].includes(n.ins) || tag === 'ITA', twin = n.ins === 'roundel' && n.rc[0] === '#1f3a8a';
      s += `<path d="M4 20Q2 14 10 13L74 12Q90 12 96 18Q90 24 74 24L10 24Q2 24 4 20Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/>`;
      s += twin ? `<path d="M5 13L3 3h6l6 10z" fill="${shade(c, -0.1)}" stroke="${OUT}" stroke-width="0.7"/><path d="M9 14L7 5h6l5 9z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>`
        : `<path d="M6 13L2 2h8l8 11z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>${n.ins === 'usstar' ? `<path d="M10 12.6L18 7.6l10 5z" fill="${c}" stroke="${OUT}" stroke-width="0.6"/>` : ''}`;
      s += `<path d="M3 15.6h14" stroke="${cd}" stroke-width="1.6"/><path d="M30 18L62 18L52 34L40 34Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8" opacity="0.95"/>`;
      const nac = (x, y0, sh) => `<path d="M${x - 14} ${y0}h14l2 6H${x - 16}z" fill="${shade(c, sh)}" stroke="${OUT}" stroke-width="0.7"/><ellipse cx="${x + 3}" cy="${y0 + 3}" rx="1.2" ry="6" fill="#bbb" opacity="0.6"/>`;
      s += heavy ? nac(52, 21, -0.2) + nac(60, 24, -0.08) : nac(58, 20, -0.12);
      s += glaze ? `<path d="M80 12.4Q92 12.6 96 18Q92 23.6 84 23.8Q86 18 80 12.4z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.6"/><path d="M84 13.6q3 4.4 0 10M88 14.6q2 3.4 0 7.4" stroke="#55707c" stroke-width="0.5" fill="none"/>`
        : `<path d="M84 13q6 1 9 4h-9z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/><path d="M66 13q4-3 8 0z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>`;
      if (heavy) s += `<circle cx="70" cy="11.6" r="2.4" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/><circle cx="48" cy="24.6" r="2.2" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>`;
      s += `<path d="M20 15.6h40" stroke="${shade(c, -0.1)}" stroke-width="0.4"/>` + insignia(tag, 24, 18.5, 3.6);
      return { svg: s, w: 98, h: 36 };
    }
    if (jet) {
      s += `<path d="M2 18Q4 14 14 14L60 13Q76 14 82 18Q76 22 60 22L14 22Q4 22 2 18Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/><path d="M6 14L2 4h7l9 10z" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>`;
      s += `<path d="M26 18L46 18L40 28L32 28Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/><path d="M34 21h16q4 2 0 5H34z" fill="#3a3a36" stroke="${OUT}" stroke-width="0.6"/><path d="M56 13q6-5 13 1z" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>` + insignia(tag, 22, 18, 3.2);
      return { svg: s, w: 84, h: 30 };
    }
    // ülkeye özgü avcı: bf (Bf 109) köşeli kuyruk ve kanat ucu, spit eliptik kanat ve kuyruk, yak yuvarlak kuyruk,
    // zero yıldız motor ve uzun kabin, p51 karın radyatörü ve (1944+) damla kabin, mc yıldız motor ve kambur kabin, d5 (D.520)
    const PS = { GER: 'bf', HUN: 'bf', ROM: 'bf', BUL: 'bf', FIN: 'bf', ENG: 'spit', CAN: 'spit', AST: 'spit', RAJ: 'spit', SAF: 'spit', NZL: 'spit', SOV: 'yak', PRC: 'yak', JAP: 'zero', MAN: 'zero', USA: 'p51', CHI: 'p51', ITA: 'mc', POL: 'mc', SPN: 'mc', FRA: 'd5', BEL: 'd5', TUR: 'd5' };
    const ps = PS[tag] || 'gen', radial = ps === 'zero' || ps === 'mc' || (e === 'cas' && n.ins === 'usstar');
    const gull = e === 'cas' && n.ins === 'cross';
    s += radial ? `<path d="M4 17Q3 13 10 12.6L50 11.8L62 11.4L64.4 12.2V21.2L62 22L50 21.4L10 21Q3 21 4 17Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/><path d="M62 11.4h2.8v10.6H62z" fill="${shade(c, -0.3)}" stroke="${OUT}" stroke-width="0.6"/><circle cx="66" cy="16.7" r="1.6" fill="#3a3a36"/>`
      : `<path d="M4 17Q3 13 10 12.6L48 12Q60 12 64 15L68.6 16.5L64 18.2Q60 21 48 21L10 21Q3 21 4 17Z" fill="url(#${id})" stroke="${OUT}" stroke-width="0.9"/><path d="M64 14.6L70 16.5L64 18.4Z" fill="${ps === 'bf' ? '#e8e2cc' : shade(c, -0.3)}" stroke="${OUT}" stroke-width="0.5"/>`;
    const FIN = { bf: 'M7 13L4 3.4h6.6l7 9.6z', spit: 'M8 13Q2 10 4.5 5Q7 2 11 4.5Q14 8 17 13z', yak: 'M7 13Q4 6 6 3.6Q9 3 17 13z', zero: 'M8 13Q4 7 6.5 4Q10 3.2 17 13z', p51: 'M5 13L4 3h5l2 4L22 12.4z', mc: 'M7 13L5 4Q8 2.6 10 4L17 13z', d5: 'M7 13Q4 7 5.5 3.6h4.4L17 13z', gen: 'M7 13L3 3h6l8 10z' };
    s += `<path d="${FIN[ps]}" fill="${c}" stroke="${OUT}" stroke-width="0.8"/><path d="M3 16.2h12" stroke="${cd}" stroke-width="1.4"/>`;
    const WING = { bf: 'M30 17.6L52 17.6L47.5 24.4L37 24.4Z', spit: 'M30 17.6L52 17.6Q51 22 46.4 24.2Q40.6 25.4 35.4 24.2Q30.6 22 30 17.6Z', yak: 'M30 17.6L52 17.6Q48 24.6 40 24.6Q33 24.2 30 17.6Z', zero: 'M30 17.6L52 17.6Q49 25 40 25Q32 24.6 30 17.6Z', p51: 'M30 17.6L53 17.6L46.5 24L39 24Z', mc: 'M30 17.6L51 17.6L46 24.4L36 24.4Z', d5: 'M30 17.6L52 17.6Q47 24.6 39 24.4Z', gen: 'M30 17L50 17L45 24L35 24Z' };
    s += gull ? `<path d="M30 17L36 24L52 22L46 17Z" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/><path d="M38 23v6M48 22v6" stroke="#2b2b2b" stroke-width="1.6"/><path d="M36 28h4v3h-4zM46 27h4v3h-4z" fill="#2b2b2b"/>` : `<path d="${WING[ps]}" fill="${cd}" stroke="${OUT}" stroke-width="0.8"/>`;
    // kabin
    const bubble = ps === 'p51' && year >= 1944;
    const CAN = { bf: 'M37 12.2L40 8.2h8l3 4z', spit: 'M37 12.2Q41 8 47 8.2L51 12z', yak: 'M37 12.2Q41 8.2 47 8.2L50 12z', zero: 'M33 12.2Q35 8.4 43 8.2Q49 8.4 51 12z', p51: bubble ? 'M39 12.2Q43 6.4 50 12z' : 'M37 12.2L40 8.4h7l4 3.8z', mc: 'M36 12Q38 7.6 44 7.6Q48 8 52 11.6L46 12.6z', d5: 'M37 12.2Q40 8.2 46 8.4L50 12z', gen: 'M38 12q4-5 10-0.4z' };
    s += `<path d="${CAN[ps]}" fill="#a9c2cc" stroke="${OUT}" stroke-width="0.5"/>`;
    if (!lod) {
      if (ps === 'bf' || ps === 'zero' || (ps === 'p51' && !bubble)) s += `<path d="M42 8.4v3.8M46 8.4v3.8${ps === 'zero' ? 'M38 9v3.2' : ''}" stroke="#55707c" stroke-width="0.5"/>`;
      if (!radial) s += `<path d="M55.4 14.4h1.4M57.8 14.2h1.4M60.2 14h1.4" stroke="#2b2b2b" stroke-width="0.8"/>`;
      if (ps === 'bf' || ps === 'spit') s += `<path d="M33 12.4l-1-3.4M32 9L9 9.6" stroke="#333" stroke-width="0.3"/>`;
      s += `<path d="M14 16.6h20M26 13v7" stroke="${shade(c, -0.12)}" stroke-width="0.35"/>`;
    }
    if (ps === 'p51') s += `<path d="M30 21h11q-1 3.6-3 3.6h-6z" fill="${cd}" stroke="${OUT}" stroke-width="0.6"/>`;
    if (ps === 'bf' || ps === 'spit') s += `<path d="M38 23.4h6l-0.6 2h-4.8z" fill="${shade(cd, -0.15)}" stroke="${OUT}" stroke-width="0.4"/>`;
    s += `<ellipse cx="${radial ? 67 : 70}" cy="16.5" rx="1.2" ry="9" fill="#ccc" opacity="0.55"/>`;
    if (e === 'cas') s += `<path d="M40 25h10q2 1.2 0 2.4H40z" fill="#2f2f2a"/>`;
    s += insignia(tag, 22, 16.6, 3.2);
    return { svg: s, w: 72, h: 32 };
  };

  // ---------- Gemi (yandan) ----------
  const ship = (tag, e, lod) => {
    const n = nat(tag), c = n.ins === 'usstar' ? '#7c8790' : n.ins === 'redstar' ? '#7a8580' : n.ins === 'hinomaru' ? '#6f7478' : '#8a9094', cd = shade(c, -0.25), deck = '#9a8a6a';
    const turret = (x, y, w, dir = 1) => `<path d="M${x} ${y}h${w}l-1 -${w * 0.45}h-${w - 2}z" fill="${cd}" stroke="${OUT}" stroke-width="0.6"/><path d="M${dir > 0 ? x + w - 1 : x + 1} ${y - w * 0.28}h${dir * w * 1.1}" stroke="#2b2b2b" stroke-width="1.2"/>`;
    const L = { dd: 90, cr: 120, bb: 150, ss: 90, cv: 150, conv: 100 }[e] || 100, H = { dd: 7, cr: 9, bb: 12, ss: 5, cv: 10, conv: 10 }[e] || 9;
    let s = `<path d="M0 30L6 ${30 + H}H${L - 10}L${L} 28Z" fill="${c}" stroke="${OUT}" stroke-width="0.9" stroke-linejoin="round"/><path d="M4 ${33 + H * 0.4}H${L - 6}" stroke="${shade(c, 0.15)}" stroke-width="0.6"/>`;
    if (e === 'ss') return `<path d="M0 32Q4 38 14 38H${L - 12}Q${L} 36 ${L} 33L${L - 6} 31H6Z" fill="#3e4447" stroke="${OUT}" stroke-width="0.9"/><path d="M38 31l3-9h12l3 9z" fill="#4b5256" stroke="${OUT}" stroke-width="0.8"/><path d="M45 22v-8M49 22v-6" stroke="#2b2b2b" stroke-width="1"/><path d="M58 30h6" stroke="#2b2b2b" stroke-width="1.6"/>`;
    if (e === 'cv') { s += `<path d="M-4 28H${L + 4}v-3H-4z" fill="${deck}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.62} 25v-14h12v14z" fill="${cd}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.62 + 4} 11v-6" stroke="#2b2b2b" stroke-width="1"/>`; for (let i = 0; i < 4; i++) s += `<path d="M${14 + i * 18} 24l8-1 2 1-2 1z" fill="${shade(c, -0.35)}"/>`; return s + shipDetail(tag, e, L, H, 1); }
    if (e === 'conv') return s + `<path d="M${L * 0.55} 30v-10h18v10z" fill="#d8d1bf" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.62} 20v-8h5v8z" fill="#2b2b2b"/><path d="M14 30v-6h28v6zM46 30v-5h10v5z" fill="#7a5e3e" stroke="${OUT}" stroke-width="0.6"/><path d="M28 24V8M28 10l-10 8M28 10l10 8" stroke="#3a3a36" stroke-width="0.7"/>`;
    const sup = e === 'bb' ? `<path d="M${L * 0.4} 28v-12h16v12z M${L * 0.45} 16v-12h7v12z" fill="${shade(c, -0.08)}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.6} 28l2-14h7l2 14z" fill="#3a3a36"/>` : `<path d="M${L * 0.38} 28v-9h14v9z M${L * 0.42} 19v-7h6v7z" fill="${shade(c, -0.08)}" stroke="${OUT}" stroke-width="0.7"/><path d="M${L * 0.58} 28l1.5-10h6l1.5 10z" fill="#3a3a36"/>`;
    s += sup + `<path d="M${L * 0.48} 4V-6" stroke="#2b2b2b" stroke-width="0.8"/>`;
    const tw = e === 'bb' ? 12 : e === 'cr' ? 9 : 6;
    const fr = e === 'dd' ? [L * 0.74] : [L * 0.72, L * 0.82], bk = e === 'dd' ? [L * 0.16] : [L * 0.12, L * 0.22];
    for (const x of fr) s += turret(x, 28, tw, 1);
    for (const x of bk) s += turret(x, 28, tw, -1);
    return s + shipDetail(tag, e, L, H, lod);
  };
  // gemi ayrıntısı: korkuluk, lombozlar, direk ve seren, kıç bayrağı, pruva dalgası
  const shipDetail = (tag, e, L, H, lod) => {
    const fc = (g.COUNTRY_DEFS[tag] || {}).c || '#888';
    let d = `<path d="M${L - 12} ${30 + H}q7-1.6 12-${H + 2}q1.4 ${H * 0.7} -4 ${H + 2}z" fill="#f4f6f4" opacity="0.85"/><path d="M${L - 26} ${31 + H}q8 1.6 16-1" stroke="#f4f6f4" stroke-width="1" fill="none" opacity="0.7"/>`;
    d += `<path d="M3 28V18" stroke="#2b2b2b" stroke-width="0.6"/><path d="M3 18h7v4.4H3z" fill="${fc}" stroke="${OUT}" stroke-width="0.4"/>`;
    if (lod) return d;
    d += `<path d="M6 27.4H${L - 12}" stroke="#d8dcdc" stroke-width="0.5" stroke-dasharray="0.6 1.2" opacity="0.8"/>`;
    if (e !== 'dd') { let ph = ''; for (let x = 12; x < L - 16; x += 6) ph += `<circle cx="${x}" cy="${31.6}" r="0.55"/>`; d += `<g fill="#2b2f33" opacity="0.8">${ph}</g>`; }
    d += `<path d="M${L * 0.48 - 5} -3h10M${L * 0.48 - 3.5} 0h7M${L * 0.48} -6L${L * 0.2} 26M${L * 0.48} -6L${L * 0.8} 26" stroke="#2b2b2b" stroke-width="0.4" opacity="0.8"/>`;
    return d;
  };

  // küçük boyut sürümü (LOD): dış konturlar k kat kalınlaşır (uzuvların kontur payı da k kat), küçük resimde kaybolmaz
  const thick = (str, k = 2.2) => str.replace(/stroke="#16150f" stroke-width="([\d.]+)"/g, (m, w) => { const v = +w; return `stroke="#16150f" stroke-width="${(v > 3 ? v + (k - 1) * 1.3 : v * k).toFixed(2)}"`; });
  const svg = (W, H, body, cls = 'art') => `<svg class="${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

  // ---------- Tümen kartı ----------
  // kind: inf mtn cav mot mech arm mar para art; tag ülke; y yıl; lvl tank seviyesi
  G.art = {};
  G.art.unit = (kind, tag, y = yearNow(), lvl = 1, lod = 0) => memo(`u|${kind}|${tag}|${y >= 1942 ? 1942 : y >= 1940 ? 1940 : 1936}|${lvl}|${lod ? 1 : 0}`, () => {
    const W = 320, H = 150, id = 'ua' + ++uid, sd = hash(tag + kind);
    const pal = kind === 'mtn' ? PAL.snow : kind === 'mar' ? PAL.sea : kind === 'para' ? PAL.dusk : ['ITA', 'ENG'].includes(tag) && kind === 'arm' ? PAL.desert : sd % 3 === 0 ? PAL.dusk : PAL.day;
    let s = ground(W, H, pal, id, kind === 'mar' ? 0.55 : 0.62);
    if (kind === 'mtn') s += `<path d="M30 92L90 30L130 70L170 22L230 84L270 46L320 90V110H0Z" fill="#9aa4ad" opacity="0.8"/><path d="M90 30L106 46L98 44L94 50L84 42L76 46Z M170 22L188 42L180 40L174 47L164 38L154 40Z M270 46L284 58L276 57L270 62L262 55L256 57Z" fill="#f4f6f7" opacity="0.95"/>`;
    if (kind === 'mar') s += `<rect y="${H * 0.55}" width="${W}" height="${H * 0.25}" fill="#5f7d8a"/><path d="M0 ${H * 0.62}q20-4 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" stroke="#a9c0c8" stroke-width="1.2" fill="none"/><path d="M0 ${H * 0.8}L${W} ${H * 0.74}V${H}H0Z" fill="#c9b48a"/>`;
    s += smoke(W * 0.78, H * 0.52, 1.1) + smoke(W * 0.12, H * 0.5, 0.8, '#cfc6b2', 0.4);
    const sol = (x, yy, sc, pose, k, flip) => put(soldier(tag, y, pose, k), x, yy, sc, flip);
    switch (kind) {
      case 'arm': { const t = tank(tag, lvl, y, lod), sc = Math.min(1.7, 200 / t.w); s += put(t.svg, 300 - t.w * sc, H - 8 - t.h * sc, sc) + sol(38, 76, 0.95, 'adv', 1) + sol(8, 82, 0.8, 'adv', 2); break; }
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
    return svg(W, H, lod ? thick(s, 2.4) : s, 'art unitart');
  });

  // ---------- Teçhizat resmi ----------
  // e: inf sup art at aa mot tank fig cas bom dd cr bb ss cv conv
  G.art.vehicle = (e, lvl, tag, y = yearNow(), lod = 0) => memo(`v|${e}|${lvl | 0}|${tag}|${y >= 1943 ? 1943 : y >= 1940 ? 1940 : 1936}|${lod ? 1 : 0}`, () => {
    const W = 240, H = 120, id = 'va' + ++uid;
    const naval = ['dd', 'cr', 'bb', 'ss', 'cv', 'conv'].includes(e), air = ['fig', 'cas', 'bom'].includes(e);
    let s = '';
    if (naval) {
      s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93a7b3"/><stop offset="1" stop-color="#dcd6c4"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/>${smoke(150, 50, 0.8, '#c9c4b6', 0.4)}`;
      const L = { dd: 90, cr: 120, bb: 150, ss: 90, cv: 150, conv: 100 }[e] || 100, sc = Math.min(1.45, 200 / L);
      s += put(ship(tag, e, lod), (W - L * sc) / 2, 32, sc) + `<rect y="${32 + 38 * sc}" width="${W}" height="${H}" fill="#5c7684"/><path d="M0 ${36 + 38 * sc}q15-3 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0" stroke="#a6bcc5" stroke-width="1.2" fill="none"/>`;
    } else if (air) {
      s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f9cb0"/><stop offset="1" stop-color="#e2dccb"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/><path d="M20 90q20-12 44-4q18-14 40 0q16-6 30 4z M150 40q14-8 30-2q14-8 26 2z" fill="#f2efe6" opacity="0.7"/>`;
      const p = plane(tag, e, lvl, y, lod), sc = Math.min(2.4, 200 / p.w);
      s += put(p.svg, (W - p.w * sc) / 2, (H - p.h * sc) / 2, sc);
    } else {
      s += ground(W, H, PAL.day, id, 0.6);
      if (e === 'tank') { const t = tank(tag, lvl || 1, y, lod), sc = Math.min(1.75, 200 / t.w, (H - 16) / (t.h + 6)); s += put(t.svg, (W - t.w * sc) / 2 + 4, H - 8 - t.h * sc, sc); }
      else if (e === 'mot') s += put(truck(tag, 0), 40, 26, 2.3);
      else if (e === 'art' || e === 'at' || e === 'aa') s += put(gun(tag, e), 40, 20, 2.3);
      else if (e === 'sup') s += `<g stroke="${OUT}" stroke-width="0.9"><rect x="60" y="62" width="44" height="30" fill="#7a5e3e"/><rect x="108" y="66" width="36" height="26" fill="#6b5232"/><rect x="80" y="40" width="40" height="22" fill="#86683f"/><path d="M60 77h44M108 79h36M80 51h40" stroke="#4a3a28"/></g><path d="M156 92l8-40h6l-6 40z M172 92l12-34h6l-12 34z" fill="#3a3a36"/>` + put(soldier(tag, y, 'stand', 1), 186, 30, 1);
      else s += `<g stroke="${OUT}" stroke-width="0.9"><rect x="44" y="64" width="70" height="28" fill="#6f5434"/><path d="M44 74h70M44 84h70" stroke="#4a3a28"/></g>${rifle(52, 62, 120, 46, 1)}${rifle(56, 58, 124, 40, 0)}` + put(soldier(tag, y, 'stand', 0), 140, 26, 1.05) + put(soldier(tag, y, 'march', 1), 176, 30, 0.95);
    }
    s += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>`;
    return svg(W, H, lod ? thick(s, 2.2) : s, 'art vehart');
  });

  // sivil devlet adamı portresi (demokrat ve tarafsız liderler): takım elbise, kravat, şapkasız
  // portre yüz ayrıntısı: yanak ve çene gölgesi, göz kapağı, göz parıltısı, burun kanadı, alt dudak; omuz gölgesi
  const faceDetail = (cx, cy, ey, fw, skd) => `<g opacity="0.45" fill="${skd}"><ellipse cx="${cx - fw + 7}" cy="${cy + 9}" rx="5" ry="8"/><ellipse cx="${cx + fw - 6}" cy="${cy + 9}" rx="5.4" ry="8.4"/></g>`
    + `<path d="M${cx - fw + 5} ${cy + 15}Q${cx} ${cy + 33} ${cx + fw - 5} ${cy + 15}" stroke="${shade(skd, -0.12)}" stroke-width="2" fill="none" opacity="0.4"/>`
    + `<path d="M${cx - 12.4} ${ey - 1.4}q3.9-2.6 7.8 0M${cx + 4.6} ${ey - 1.4}q3.9-2.6 7.8 0" stroke="#3a2a20" stroke-width="0.9" fill="none" stroke-linecap="round"/>`
    + `<circle cx="${cx - 7.4}" cy="${ey - 0.6}" r="0.55" fill="#fff"/><circle cx="${cx + 9.6}" cy="${ey - 0.6}" r="0.55" fill="#fff"/>`
    + `<path d="M${cx - 4} ${ey + 10.4}q1.2 1.4 2.4 0.6M${cx + 4} ${ey + 10.4}q-1.2 1.4-2.4 0.6" stroke="${shade(skd, -0.2)}" stroke-width="0.8" fill="none"/>`
    + `<path d="M${cx - 4} ${ey + 21.6}q4 1.6 8 0" stroke="${shade(skd, -0.1)}" stroke-width="0.9" fill="none" opacity="0.7"/>`;
  const shoulderShade = (H, id) => `<path d="M6 ${H}Q8 112 34 104L50 100H70L86 104Q112 112 114 ${H}Z" fill="url(#${id}u)"/>`;
  const civPortrait = (s, gen, tag, h, sk, skd, hair, age, fat, must, glasses, W, H, id) => {
    const suit = ['#2b2b30', '#3a3530', '#2e3440'][h % 3], tie = (g.COUNTRY_DEFS[tag] || {}).c || '#6b2a24';
    s += `<path d="M6 ${H}Q8 112 34 104L50 100H70L86 104Q112 112 114 ${H}Z" fill="${suit}" stroke="${OUT}" stroke-width="1"/>` + shoulderShade(H, id);
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
    s += faceDetail(cx, cy, ey, fw, skd);
    if (glasses) s += `<g fill="none" stroke="#2b2b2b" stroke-width="1"><circle cx="${cx - 8.5}" cy="${ey}" r="5"/><circle cx="${cx + 8.5}" cy="${ey}" r="5"/><path d="M${cx - 3.5} ${ey}h7"/></g>`;
    s += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>`;
    return svg(W, H, s, 'art portrait');
  };
  // ülke liderinin portresi: faşist ve komünist liderler üniformalı, diğerleri sivil
  G.art.leader = (tag, name, ideo) => G.art.portrait({ id: 0, n: name, lvl: ideo === 'fas' || ideo === 'com' ? 4 : 1, fm: ideo === 'fas' || ideo === 'com', civ: !(ideo === 'fas' || ideo === 'com') }, tag);
  // ---------- Komutan portresi ----------
  // gen: {id, n, lvl, fm, tr}; belirlenimli (kimlikten hash), oyun rastgeleliğine dokunmaz
  const CAP_C = { schirm: 1, service: 1, kepi: 1, jap: 1, rogat: 1 };
  G.art.portrait = (gen, tag, y = yearNow(), lod = 0) => (lod ? memo(`pl|${tag}|${gen.id}|${gen.n}|${gen.lvl | 0}|${gen.fm ? 1 : 0}|${gen.civ ? 1 : 0}`, () => thick(portraitSvg(gen, tag, y), 2)) : portraitSvg(gen, tag, y));
  const portraitSvg = (gen, tag, y = yearNow()) => memo(`p|${tag}|${gen.id}|${gen.n}|${gen.lvl | 0}|${gen.fm ? 1 : 0}|${gen.civ ? 1 : 0}`, () => {
    const n = nat(tag), h = hash(tag + '|' + gen.n + '|' + gen.id), id = 'pt' + ++uid;
    const W = 120, H = 150, sk = skinOf(n, h), skd = shade(sk, -0.18), hair = ['#2a2018', '#4a3826', '#7a6a58', '#b8b0a4', '#1c1612'][(h >> 3) % 5];
    const age = (h >> 6) % 3, fat = ((h >> 9) % 3) * 2, must = (h >> 11) % 4, glasses = (h >> 13) % 5 === 0, u = n.u, ud = shade(u, -0.2);
    const capT = CAP_C[n.cap] ? n.cap : 'schirm', cc = n.cc || ud, band = n.band || shade(cc, -0.25), gold = gen.fm ? '#e2c25a' : n.trim || '#c9b45e';
    let s = `<defs><radialGradient id="${id}b" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="${shade(u, 0.45)}"/><stop offset="1" stop-color="${shade(u, -0.45)}"/></radialGradient><linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sk}"/><stop offset="1" stop-color="${skd}"/></linearGradient><linearGradient id="${id}u" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#000" stop-opacity="0.32"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.36"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${id}b)"/>`;
    if (gen.civ) return civPortrait(s, gen, tag, h, sk, skd, hair, age, fat, must, glasses, W, H, id);
    // omuzlar ve üniforma
    s += `<path d="M6 ${H}Q8 112 34 104L50 100H70L86 104Q112 112 114 ${H}Z" fill="${u}" stroke="${OUT}" stroke-width="1"/>` + shoulderShade(H, id);
    s += `<path d="M50 100L60 124L70 100Z" fill="${shade(u, 0.1)}" stroke="${OUT}" stroke-width="0.8"/><path d="M52 101L60 118L68 101" fill="#ece6d6"/><path d="M57 104L60 122L63 104Z" fill="#3a3530"/>`;
    s += `<path d="M42 102L52 102L58 112L48 116Z M78 102L68 102L62 112L72 116Z" fill="${shade(u, -0.05)}" stroke="${OUT}" stroke-width="0.7"/>`;
    // yaka işaretleri ve omuz apoletleri
    s += `<path d="M46 106l7-1 2 6-7 2z M74 106l-7-1-2 6 7 2z" fill="${gen.fm ? '#b5232a' : band}" stroke="${gold}" stroke-width="0.8"/>`;
    s += `<path d="M16 112l18-6 2 5-18 7z M104 112l-18-6-2 5 18 7z" fill="${gold}" stroke="${OUT}" stroke-width="0.7"/>`;
    // ülkeye göre yaka arması
    if (n.ins === 'cross') s += `<path d="M47.6 107.6l5-0.8M48.2 109.8l5-0.8M72.4 107.6l-5-0.8M71.8 109.8l-5-0.8" stroke="#d8dcd8" stroke-width="0.8"/>`;
    else if (n.ins === 'redstar' || n.ins === 'chi') s += `<path d="${starPath(50.6, 108.6, 1.8)} ${starPath(69.4, 108.6, 1.8)}" fill="${n.ins === 'chi' ? '#fff' : '#c4161c'}"/>`;
    else if (n.ins === 'usstar') s += `<circle cx="50.6" cy="108.6" r="2" fill="#e2c25a" stroke="${OUT}" stroke-width="0.3"/><circle cx="69.4" cy="108.6" r="2" fill="#e2c25a" stroke="${OUT}" stroke-width="0.3"/>`;
    else if (n.ins === 'hinomaru') s += `<path d="${starPath(49.6, 108.6, 1.1)} ${starPath(52, 108.2, 1.1)} ${starPath(68, 108.2, 1.1)} ${starPath(70.4, 108.6, 1.1)}" fill="#e6c34a"/>`;
    else s += `<path d="M48.6 108.6h4M67.4 108.6h-4" stroke="${gold}" stroke-width="1"/>`;
    // yüksek rütbede boyun nişanı (Şövalye Haçı, Kahraman yıldızı ya da madalya)
    if ((gen.lvl | 0) >= 4 || gen.fm) {
      if (n.ins === 'cross') s += `<path d="M57.6 100l2.4 3 2.4-3" stroke="#111" stroke-width="0.8" fill="none"/><path d="M60 103.4l2.4 1.2 1.2 2.4-1.2 2.4-2.4 1.2-2.4-1.2-1.2-2.4 1.2-2.4z" fill="#111" stroke="#e8e8e8" stroke-width="0.6"/>`;
      else if (n.ins === 'redstar') s += `<rect x="34" y="111" width="5" height="2.6" fill="#b5232a"/><path d="${starPath(36.5, 117, 3.2)}" fill="#e2c25a" stroke="${OUT}" stroke-width="0.4"/>`;
      else s += `<path d="M58 100l2 4 2-4" stroke="${band}" stroke-width="1.4" fill="none"/><circle cx="60" cy="106" r="2.6" fill="#e2c25a" stroke="${OUT}" stroke-width="0.4"/>`;
    }
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
    s += faceDetail(cx, cy, ey, fw, skd);
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
  // patlama: katmanlı parlama, alev dilleri, savrulan toprak ve duman
  const blast = (x, y, s) => { const id = 'bl' + ++uid; let sp = ''; for (let k = 0; k < 7; k++) { const a = -Math.PI * (0.1 + k * 0.13), r = (10 + (k % 3) * 4) * s; sp += `M${x} ${y}L${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}`; }
    return `${smoke(x - 4 * s, y - 6 * s, s, '#8a8070', 0.6)}<defs><radialGradient id="${id}"><stop offset="0" stop-color="#fff6d8"/><stop offset="0.35" stop-color="#ffd27a" stop-opacity="0.95"/><stop offset="0.7" stop-color="#e8762e" stop-opacity="0.5"/><stop offset="1" stop-color="#e8762e" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${14 * s}" fill="url(#${id})"/><path d="${sp}" stroke="#ffb54a" stroke-width="${(1.4 * s).toFixed(1)}" stroke-linecap="round" opacity="0.85"/><g fill="#3a3024">${[[-9, -12, 1.4], [8, -15, 1.1], [13, -6, 0.9], [-14, -4, 1]].map(([dx, dy, r]) => `<circle cx="${(x + dx * s).toFixed(1)}" cy="${(y + dy * s).toFixed(1)}" r="${(r * s).toFixed(1)}"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="${4 * s}" fill="#fffbe8"/>`; };
  // ön plan: krater, dikenli tel, kırık direk, enkaz (sd ile belirlenimli)
  const foreground = (W, H, sd) => {
    const gy = H - 6, cx = 40 + (sd % 7) * 30;
    let f = `<ellipse cx="${cx}" cy="${gy}" rx="22" ry="4.5" fill="#2e2a20" opacity="0.75"/><path d="M${cx - 22} ${gy}q4-6 10-5M${cx + 22} ${gy}q-4-6-10-5" stroke="#6a5c40" stroke-width="2" fill="none"/>`;
    const wx = W * 0.56 + (sd % 5) * 6;
    f += `<path d="M${wx} ${gy - 1}v-12M${wx + 30} ${gy}v-13M${wx + 60} ${gy - 1}v-11" stroke="#4a3a26" stroke-width="1.6"/>`;
    let wire = ''; for (let i = 0; i < 12; i++) { const x0 = wx + i * 5; wire += `<ellipse cx="${x0 + 2.5}" cy="${gy - 7 + (i % 2)}" rx="3.4" ry="2.6"/>`; }
    f += `<g fill="none" stroke="#2b2b28" stroke-width="0.6">${wire}</g><path d="M${wx} ${gy - 10}L${wx + 60} ${gy - 9}M${wx} ${gy - 4}L${wx + 60} ${gy - 5}" stroke="#2b2b28" stroke-width="0.6"/>`;
    f += `<path d="M${W * 0.08} ${gy}l3-16 2 1-2 15z" fill="#5a4630" stroke="${OUT}" stroke-width="0.5"/><path d="M${W * 0.88} ${gy}l10-6 4 2-9 4z M${W * 0.83} ${gy}l6-3 3 2-5 1z" fill="#55524a" stroke="${OUT}" stroke-width="0.5"/>`;
    return f;
  };
  // sahnedeki bayrak (direkli; ülke rengi ve nişanı)
  const flagPole = (x, y, tag, flip) => { const c = (g.COUNTRY_DEFS[tag] || {}).c || '#888', dx = flip ? -1 : 1; return `<path d="M${x} ${y}v-40" stroke="#3a3026" stroke-width="1.4"/><path d="M${x} ${y - 40}q${dx * 9}-3 ${dx * 18} 0t${dx * 18} 0v13q${-dx * 9}-3 ${-dx * 18} 0t${-dx * 18} 0z" fill="${c}" stroke="${OUT}" stroke-width="0.6"/>${insignia(tag, x + dx * 18, y - 33.5, 4)}`; };
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
    s += `<circle cx="${40 + (sd % 9) * 28}" cy="22" r="26" fill="#fff2c8" opacity="0.22"/><circle cx="${40 + (sd % 9) * 28}" cy="22" r="9" fill="#fff6dc" opacity="0.5"/>`;
    s += flagPole(22, H * 0.66, aTag, 0) + flagPole(W - 22, H * 0.66, dTag, 1);
    s += blast(160, 98, 0.9) + blast(222, 108, 0.6) + blast(188, 74, 0.45);
    s += `<path d="M96 88L176 76M104 112L196 100" stroke="#fff0b0" stroke-width="1.3" opacity="0.9" stroke-dasharray="3 16" stroke-linecap="round"/>`;
    s += `<g>${force(aTag, aKind, aLvl, y, H, false)}</g>`;
    s += `<g transform="translate(${W} 0) scale(-1 1)">${force(dTag, dKind, dLvl, y, H, true)}</g>`;
    s += foreground(W, H, sd) + grass(W, H - 14, shade(pal.gr2, -0.2), sd) + vignette(W, H, id);
    return svg(W, H, s, 'art battleart');
  });
  // olay sahneleri için parçalar (eventart.js kullanır)
  G.art.kit = { soldier, horse, tank, truck, gun, plane, ship, insignia, ground, vignette, smoke, grass, put, svg, PAL, shade, hash, terrain, ruin, tree, blast, nat, starPath, OUT, yearNow, memo, foreground, flagPole, next: () => ++uid };

  // <img> olarak kullanım: aynı resim sayfada çok kez geçse de SVG metni bir kez çözülür (blob adresi önbellekte)
  const urls = new Map();
  G.art.url = (svgStr) => {
    let u = urls.get(svgStr);
    if (!u) { try { u = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' })); } catch (e) { u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr); } urls.set(svgStr, u); }
    return u;
  };
  G.art.img = (svgStr, cls = '') => `<img class="artimg ${cls}" src="${G.art.url(svgStr)}" alt="" decoding="async" draggable="false">`;
  // kısayollar: tümen, komutan ve teçhizat resmi
  G.art.unitOf = (u, lod) => { const k = G.art.kindOf(u); return G.art.unit(k, u.t, yearNow(), k === 'arm' ? G.art.tankLvl(G.st.C[u.t]) : 1, lod); };
  G.art.tplOf = (c, tpl, lod) => { const k = G.art.kindOfB(tpl.b); return G.art.unit(k, c.tag, yearNow(), k === 'arm' ? G.art.tankLvl(c) : 1, lod); };
  // küçük resimler (portrait-s, vehthumb) kalın konturlu sade sürümü kullanır
  G.art.genImg = (gen, tag, cls = 'portrait-s') => G.art.img(G.art.portrait(gen, tag, yearNow(), cls === 'portrait-s' ? 1 : 0), cls);
  G.art.eqImg = (e, lvl, tag, cls = 'vehthumb') => G.art.img(G.art.vehicle(e, Math.max(1, Math.floor(lvl || 1)), tag, yearNow(), cls === 'vehthumb' ? 1 : 0), cls);
  // harita sayacı silueti (resimli sayaç): 52x32, saydam zemin; Image önbellekte, yüklenince harita yeniden çizilir
  const sprites = new Map();
  const spriteSvg = (kind, tag, y) => {
    let b = '';
    if (kind === 'arm') { const t = tank(tag, G.art.tankLvl(G.st.C[tag]), y, 1), sc = Math.min(50 / t.w, 30 / t.h); b = put(t.svg, (52 - t.w * sc) / 2, 31 - t.h * sc, sc); }
    else if (kind === 'mot' || kind === 'mech') b = put(truck(tag, kind === 'mech'), 3, 2, 0.7);
    else if (kind === 'cav') b = put(horse(tag, y, 0), 6, 2, 0.47);
    else if (kind === 'art') b = put(gun(tag, 'art'), 3, 4, 0.68);
    else b = put(soldier(tag, y, 'adv', 0), 4, 1, 0.47) + put(soldier(tag, y, 'adv', 1), 24, 1, 0.47);
    return `<svg viewBox="0 0 52 32" xmlns="http://www.w3.org/2000/svg">${thick(b, 2.6)}</svg>`;
  };
  // SVG bir kez yüklenir, sonra sayaçtaki boyutun cihaz pikseli kadar (26×16 × ölçek) bir tuvale çizilir:
  // haritada 1:1 kopyalandığı için 3× ekranda da keskin kalır
  G.art.sprite = (kind, tag) => {
    const R = G.R, sc = Math.max(1, Math.ceil((R && R.dpr ? R.dpr : 1) * (R && R.ctrBig ? 1.25 : 1)));
    const y = yearNow(), k = kind + '|' + tag + '|' + (y >= 1942 ? 1942 : 1936) + '|' + (kind === 'arm' ? G.art.tankLvl(G.st.C[tag]) : 0) + '|' + sc;
    let e = sprites.get(k);
    if (!e) {
      e = { cv: null }; sprites.set(k, e);
      const im = new Image();
      im.onload = () => { const cv = document.createElement('canvas'); cv.width = 26 * sc; cv.height = 16 * sc; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); e.cv = cv; if (R) R.dirty = 1; };
      im.src = G.art.url(spriteSvg(kind, tag, y));
    }
    return e.cv;
  };
  G.art.spriteClear = () => sprites.clear();
  G.art.clear = () => cache.clear();
})(window);
