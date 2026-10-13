// HOI4 olay penceresi resimleri: olayın konusuna ve geçtiği ülkelere göre çizilen sahneler (askerî çizim kitiyle).
// Ülkeler olay metninden bulunur (ör. "Almanya" → Alman askerleri); bulunamazsa oyuncunun ülkesi kullanılır.
// Arşiv fotoğrafı havası: hafif sepya, film greni ve kenar kararması.
(function (g) {
  const G = g.G;
  let uid = 0;
  const KINDS = [
    ['surrender', /teslim|mütareke|ateşkes|barış|kurtar|zafer|çöküş|capitul/],
    ['navy', /deniz|filo|donanma|liman|pearl|çıkarma|konvoy|gemi|denizaltı|amiral|boğaz|midway|d-günü|overlord|harbor/],
    ['air', /hava |hava$|bombard|luftwaffe|uçak|blitz|paraşüt|hava kuvvet/],
    ['science', /(^|[\s'])atom|nükleer|proje|araştırma|bilim|radar|şifre|enigma|roket|füze|manhattan/],
    ['war', /savaş|saldır|harekât|istila|cephe|taarruz|ordu|işgal|kuşat|tank|barbarossa|sefer|muharebe|direniş|ilhak|seferberlik|asker/],
    ['diplomacy', /pakt|antlaşma|ittifak|anlaşma|görüşme|konferans|nota|ültimatom|garanti|katıl|elçi|dostluk|ticaret|talep/],
    ['politics', /seçim|parti|hükümet|darbe|lider|devrim|meclis|kongre|cumhur|kral|reform|yasa|anayasa|tasfiye|halk|miting|başbakan/],
    ['industry', /fabrika|sanayi|üretim|plan|ekonomi|kredi|silah|maden|petrol|demiryolu|yıllık|beş yıl/],
  ];
  G.eventKind = (p) => {
    if (p.art) return p.art;
    const t = ((p.title || '') + ' ' + (p.text || '')).toLocaleLowerCase('tr');
    // antlaşma ve paktlar önce: "saldırmazlık paktı" savaş sahnesi olmasın
    if (/pakt|antlaşma|konferans|görüşme/.test(t) && !/teslim|mütareke/.test(t)) return 'diplomacy';
    for (const [k, re] of KINDS) if (re.test(t)) return k;
    return 'city';
  };

  // ---------- olay metnindeki ülkeler ----------
  const ALIAS = [['sovyet', 'SOV'], ['alman', 'GER'], ['ingiliz', 'ENG'], ['britanya', 'ENG'], ['fransız', 'FRA'], ['italyan', 'ITA'], ['japon', 'JAP'], ['amerika', 'USA'], ['türk', 'TUR'], ['leh', 'POL'], ['çinli', 'CHI'], ['macar', 'HUN'], ['romen', 'ROM'], ['yunan', 'GRE'], ['fin', 'FIN']];
  let NAMES = null;
  const isL = (ch) => !!ch && /[a-zçğıöşüâîû]/i.test(ch);
  const tagsIn = (txt) => {
    if (!NAMES) {
      NAMES = Object.keys(g.COUNTRY_DEFS || {}).map((t) => [(g.COUNTRY_DEFS[t].n || '').toLocaleLowerCase('tr'), t]).filter((x) => x[0].length > 2).concat(ALIAS);
      NAMES.sort((a, b) => b[0].length - a[0].length);
    }
    const found = [];
    for (const [n, t] of NAMES) {
      let i = txt.indexOf(n);
      while (i >= 0 && isL(txt[i - 1])) i = txt.indexOf(n, i + 1);
      if (i >= 0 && !found.some((f) => f.t === t) && (!G.st || !G.st.C[t] || true)) found.push({ i, t });
    }
    return found.sort((a, b) => a.i - b.i).map((f) => f.t);
  };

  // ---------- sahneler ----------
  const W = 320, H = 140;
  const scene = (k, A, B, v, y) => {
    const K = G.art.kit, { put, soldier, tank, truck, gun, plane, ship, smoke, grass, ground, vignette, PAL, shade, terrain, ruin, blast, insignia, OUT } = K;
    const id = 'ev' + K.next(), sol = (tag, x, yy, sc, pose, kk, flip) => put(soldier(tag, y, pose, kk), x, yy, sc, flip);
    const flag = (tag, x, yy, w = 30, h = 20) => (G.flagAt ? G.flagAt(tag, x, yy, w, h) : '');
    const pole = (tag, x, yy, h) => `<path d="M${x} ${yy}v${-h}" stroke="#2a241c" stroke-width="2"/>${flag(tag, x + 1, yy - h, 26, 17)}`;
    const major = (t) => !!(G.st && G.st.C[t] && G.st.C[t].major);
    let s = '';
    switch (k) {
      case 'war': {
        const te = ['plains', 'forest', 'urban'][v % 3];
        s += ground(W, H, PAL[te === 'urban' ? 'dusk' : 'day'], id) + terrain(te, W, H, v);
        s += smoke(150, 66, 1.2, '#b5ab98', 0.6) + blast(168, 92, 0.9);
        const gy = H - 8;
        if (major(A) && y >= 1939 && v % 2 === 0) { const t = tank(A, y >= 1942 ? 3 : 2, y), sc = 1.15; s += put(t.svg, 26, gy - t.h * sc, sc) + sol(A, 6, gy - 58, 0.9, 'adv', 1); }
        else s += sol(A, 104, gy - 70, 1.1, 'adv', 0) + sol(A, 58, gy - 64, 1.0, 'adv', 1) + sol(A, 14, gy - 58, 0.9, 'kneel', 2);
        if (B) s += `<g transform="translate(${W} 0) scale(-1 1)">${sol(B, 96, gy - 66, 1.05, 'kneel', 0)}${sol(B, 56, gy - 60, 0.95, 'adv', 1)}</g>`;
        else s += smoke(250, 80, 1, '#8a8070', 0.55) + blast(262, 104, 0.6);
        s += grass(W, H - 12, '#2e2e20', v);
        break;
      }
      case 'navy': {
        s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa2ab"/><stop offset="1" stop-color="#ded5bd"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
        s += smoke(220, 40, 1.1, '#6f6a62', 0.6) + `<rect y="78" width="${W}" height="${H}" fill="#56717e"/><path d="M0 84q20-3 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0M0 100q25-3 50 0t50 0t50 0t50 0t50 0t50 0t50 0" stroke="#a6bcc5" stroke-width="1" fill="none"/>`;
        s += put(ship(A, v % 2 ? 'cr' : 'bb'), 30, 44, 1.25) + put(ship(A, 'dd'), 220, 62, 0.62) + put(ship(B || A, v % 2 ? 'conv' : 'dd'), 250, 52, 0.45);
        s += `<g fill="#e8eef0" opacity="0.85"><path d="M150 84q4-22 8 0z"/><path d="M196 86q3-14 6 0z"/></g>`;
        const p = plane(B || A, 'cas', 2, y); s += put(p.svg, 210, 14, 0.9) + put(p.svg, 248, 26, 0.7);
        break;
      }
      case 'air': {
        s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e93a4"/><stop offset="1" stop-color="#e2d7bb"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
        s += `<g fill="#f2eee4" opacity="0.65"><ellipse cx="60" cy="50" rx="60" ry="12"/><ellipse cx="250" cy="34" rx="70" ry="10"/></g>`;
        const bom = plane(A, 'bom', 2, y), fig = plane(A, 'fig', y >= 1944 ? 3 : 2, y);
        s += put(bom.svg, 40, 30, 1.05) + put(bom.svg, 130, 46, 0.85) + put(bom.svg, 200, 24, 0.7) + put(fig.svg, 230, 70, 0.75) + put(fig.svg, 20, 76, 0.6);
        s += `<g fill="#2e2a24" opacity="0.7">${[[110, 20], [180, 70], [70, 90], [260, 50]].map(([x, yy]) => `<circle cx="${x}" cy="${yy}" r="4"/><circle cx="${x + 4}" cy="${yy - 2}" r="3"/>`).join('')}</g>`;
        s += `<path d="M0 120Q80 112 160 118T${W} 114V${H}H0Z" fill="#5a5a40"/>` + smoke(90, 118, 0.9, '#5d564c', 0.65) + smoke(210, 116, 0.7, '#5d564c', 0.55);
        break;
      }
      case 'surrender': {
        s += ground(W, H, PAL.dusk, id) + terrain('urban', W, H, v);
        s += pole(A, 168, 84, 56) + `<path d="M60 84v-46" stroke="#2a241c" stroke-width="2"/><path d="M61 38c12 4 20-2 32 3v20c-12-5-20 1-32-3z" fill="#efeadb" stroke="${OUT}" stroke-width="0.5"/>`;
        const gy = H - 8;
        s += sol(A, 190, gy - 64, 1.0, 'stand', 0) + sol(A, 226, gy - 60, 0.94, 'stand', 1) + sol(A, 262, gy - 56, 0.88, 'stand', 2);
        if (B) s += sol(B, 20, gy - 56, 0.88, 'march', 1) + sol(B, 54, gy - 58, 0.9, 'march', 2);
        break;
      }
      case 'diplomacy': {
        s += `<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdbb94"/><stop offset="1" stop-color="#8f7b58"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}w)"/>`;
        s += `<g fill="#7a6648">${[30, 100, 210, 280].map((x) => `<rect x="${x}" y="0" width="14" height="96"/><rect x="${x - 4}" y="0" width="22" height="8"/>`).join('')}</g>`;
        s += `<path d="M120 4h80v58l-40 10-40-10z" fill="#6b2a24" opacity="0.9"/>`;
        s += flag(A, 52, 20, 36, 24) + flag(B || A, 232, 20, 36, 24);
        s += `<path d="M14 100h292l-12 16H26z" fill="#4a3826" stroke="${OUT}" stroke-width="0.8"/><path d="M90 98l26-3 3 3zM180 96l30 2-2 3z" fill="#ece6d4"/><path d="M150 98v-5h3v5zM166 98v-7h2v7z" fill="#2a241c"/>`;
        const suit = (x, c) => `<g transform="translate(${x} 34)"><circle cx="0" cy="8" r="7" fill="#d9a77f" stroke="${OUT}" stroke-width="0.6"/><path d="M-7 4q7-8 14 0" fill="#3a3028"/><path d="M-12 18q12-6 24 0l2 46h-28z" fill="${c}" stroke="${OUT}" stroke-width="0.7"/><path d="M-2 18l2 10 2-10z" fill="#ece6d4"/></g>`;
        s += suit(132, '#2e2e34') + suit(188, '#3a3a2e') + `<path d="M140 62q20-4 40 0" stroke="#d9a77f" stroke-width="4" stroke-linecap="round" fill="none"/>`;
        break;
      }
      case 'politics': {
        const n = G.art.kit.nat(A), c = (g.COUNTRY_DEFS[A] || {}).c || '#8a2a24', bc = shade(c, -0.25);
        s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8a90"/><stop offset="1" stop-color="#d9cdb0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
        s += `<path d="M0 64h${W}v76H0z" fill="#9a8a70"/><g fill="#7f6f56">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 48}" y="20" width="18" height="50"/>`).join('')}</g>`;
        for (const x of [40, 140, 240]) s += `<rect x="${x}" y="8" width="40" height="78" fill="${bc}" stroke="${OUT}" stroke-width="0.6"/>${flag(A, x + 6, 14, 28, 19)}${insignia(A, x + 20, 58, 10)}`;
        s += `<path d="M120 92h80v22h-80z" fill="#5a4630" stroke="${OUT}" stroke-width="0.8"/>${flag(A, 146, 96, 28, 14)}`;
        s += `<g transform="translate(160 64)"><circle cx="0" cy="6" r="6.5" fill="#d9a77f" stroke="${OUT}" stroke-width="0.6"/><path d="M-11 16q11-6 22 0l2 14h-26z" fill="${n.u}" stroke="${OUT}" stroke-width="0.7"/><path d="M8 18l10-12" stroke="${n.u}" stroke-width="4" stroke-linecap="round"/></g>`;
        let crowd = ''; for (let i = 0; i < 40; i++) { const x = (i * 83) % (W + 10) - 5, yy = 116 + ((i * 53) % 22); crowd += `<circle cx="${x}" cy="${yy}" r="5"/><path d="M${x - 7} ${yy + 4}h14v14h-14z"/>`; if (i % 5 === 0) crowd += `<path d="M${x + 4} ${yy}l4-12" stroke="#2a241c" stroke-width="2"/>`; }
        s += `<g fill="#2e2a24">${crowd}</g>`;
        break;
      }
      case 'industry': {
        s += `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a958a"/><stop offset="1" stop-color="#d8cbb0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}s)"/>`;
        s += smoke(70, 26, 1.1, '#6e685e', 0.6) + smoke(130, 14, 1.3, '#6e685e', 0.6) + smoke(214, 28, 1, '#6e685e', 0.55);
        s += `<g fill="#5a4e40" stroke="${OUT}" stroke-width="0.6"><rect x="64" y="26" width="12" height="60"/><rect x="124" y="14" width="14" height="70"/><rect x="208" y="28" width="12" height="58"/><path d="M0 ${H}V70l40-16v16l40-16v16l40-16v16l40-16v16l40-16v16l40-16v16l40-16V${H}z"/></g>`;
        s += `<g fill="#e9c46a" opacity="0.85">${[20, 60, 100, 140, 180, 220, 260, 300].map((x) => `<rect x="${x}" y="88" width="14" height="10"/>`).join('')}</g>`;
        const t = tank(A, y >= 1942 ? 3 : 2, y); s += `<rect y="${H - 22}" width="${W}" height="22" fill="#3e372e"/>` + put(t.svg, 160, H - 10 - t.h * 0.9, 0.9) + put(truck(A, 0), 30, H - 10 - 42 * 1.05, 1.05);
        break;
      }
      case 'science': {
        s += `<defs><radialGradient id="${id}g" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#f4ead0"/><stop offset="1" stop-color="#6e6a5c"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}g)"/>`;
        if (v % 3 === 0) s += `<g fill="none" stroke="#2e2a24" stroke-width="2.4"><ellipse cx="160" cy="64" rx="60" ry="18"/><ellipse cx="160" cy="64" rx="60" ry="18" transform="rotate(60 160 64)"/><ellipse cx="160" cy="64" rx="60" ry="18" transform="rotate(-60 160 64)"/></g><circle cx="160" cy="64" r="10" fill="#c4161c"/>`;
        else if (v % 3 === 1) s += `<path d="M150 116V40l10-26 10 26v76z" fill="#d9d3c4" stroke="${OUT}" stroke-width="0.9"/><path d="M150 100l-12 16h12zM170 100l12 16h-12z" fill="#2e2a24"/><path d="M120 116V20M200 116V20M120 40h80M120 70h80M120 100h80" stroke="#5a5040" stroke-width="2"/>${smoke(160, 128, 1.2, '#e9e1cc', 0.8)}`;
        else s += `<path d="M120 116l40-50 40 50z" fill="#5a5040"/><path d="M110 50q50-50 100 0q-50 20-100 0z" fill="#c9c4b6" stroke="${OUT}" stroke-width="0.9"/><path d="M160 50v-34" stroke="#2e2a24" stroke-width="2"/><g fill="none" stroke="#2e2a24" stroke-width="1.2" opacity="0.6"><path d="M180 20q10 10 0 20M190 14q16 16 0 32M200 8q22 22 0 44"/></g>`;
        s += `<path d="M0 116h${W}v24H0z" fill="#4a4236"/>` + put(soldier(A, y, 'stand', 0), 40, 60, 0.85) + `<g transform="translate(270 70)"><circle cx="0" cy="6" r="6" fill="#d9a77f"/><path d="M-10 14h20l3 34h-26z" fill="#ece6d4" stroke="${OUT}" stroke-width="0.6"/></g>`;
        break;
      }
      default: {
        s += ground(W, H, PAL.day, id) + terrain('urban', W, H, v) + pole(A, 150, 84, 60);
        s += `<path d="M0 ${H - 20}h${W}v20H0z" fill="#6a5e4c"/>`;
        let crowd = ''; for (let i = 0; i < 30; i++) { const x = (i * 83) % (W + 10) - 5, yy = 116 + ((i * 53) % 14), c = ['#3a3028', '#4a3e30', '#2e2a24', '#5a4a38'][i % 4]; crowd += `<g fill="${c}"><circle cx="${x}" cy="${yy}" r="4.5" fill="#c9946c"/><path d="M${x - 5} ${yy - 2}h10l-1-3h-8z"/><path d="M${x - 6} ${yy + 4}h12v14h-12z"/></g>`; if (i % 4 === 0) crowd += `<path d="M${x + 5} ${yy + 2}l5-10" stroke="#c9946c" stroke-width="2.4" stroke-linecap="round"/>`; }
        s += crowd;
      }
    }
    return s;
  };

  G.eventArt = (p) => {
    const k = G.eventKind(p), txt = ((p.title || '') + ' ' + (p.text || '')).toLocaleLowerCase('tr');
    const st = G.st, y = st ? G.dateOf(st.day).getUTCFullYear() : 1936;
    let tags = tagsIn(txt);
    // teslimiyette başlıkta adı geçen ülke yenilendir: galip sahnenin sahibi olur
    if (k === 'surrender') { const lt = tagsIn((p.title || '').toLocaleLowerCase('tr'))[0]; if (lt && tags.length > 1) tags = tags.filter((t) => t !== lt).concat([lt]); }
    const A = tags[0] || (st && st.player) || 'GER';
    let B = tags[1] || null;
    if (!B && k === 'war' && st && st.C[A] && st.C[A].enemies && st.C[A].enemies[0]) B = st.C[A].enemies[0];
    let v = 0; const tt = p.title || ''; for (let i = 0; i < tt.length; i++) v = (v * 31 + tt.charCodeAt(i)) >>> 0;
    if (!G.art || !G.art.kit) return '';
    const id = 'eg' + uid++;
    return `<svg class="ev-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="${id}v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1b140b" stop-opacity="0.7"/></radialGradient>
<filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${v % 50}"/><feColorMatrix values="0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0 0.12 0 0 0 0.3 0"/></filter></defs>
${scene(k, A, B, v, y)}
<rect width="${W}" height="${H}" fill="#7a5a2a" opacity="0.16"/><rect width="${W}" height="${H}" filter="url(#${id}n)"/><rect width="${W}" height="${H}" fill="url(#${id}v)"/></svg>`;
  };
})(window);
