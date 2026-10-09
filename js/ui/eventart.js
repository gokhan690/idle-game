// HOI4 olay penceresi resimleri: olayın konusuna göre sepya tonlu, gren dokulu "arşiv fotoğrafı" sahneleri (satır içi SVG).
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
    for (const [k, re] of KINDS) if (re.test(t)) return k;
    return 'city';
  };
  const hills = (y, c) => `<path d="M0 ${y} C40 ${y - 14} 80 ${y - 6} 120 ${y - 12} S200 ${y - 4} 240 ${y - 14} S300 ${y - 8} 320 ${y - 10} V140 H0z" fill="${c}"/>`;
  const smoke = (x, y, s) => `<g fill="#cdbb98" opacity="0.55"><circle cx="${x}" cy="${y}" r="${7 * s}"/><circle cx="${x + 8 * s}" cy="${y - 10 * s}" r="${9 * s}"/><circle cx="${x + 2 * s}" cy="${y - 22 * s}" r="${11 * s}"/><circle cx="${x + 14 * s}" cy="${y - 32 * s}" r="${13 * s}"/></g>`;
  const tank = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><path d="M0 14h46l-4 8H4z"/><path d="M6 6h30l4 8H2z"/><path d="M14 0h14v6H14z"/><path d="M28 2h22v3H28z"/><g fill="#2a2117">${[6, 14, 22, 30, 38].map((cx) => `<circle cx="${cx}" cy="18" r="3"/>`).join('')}</g></g>`;
  const soldier = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><circle cx="5" cy="3" r="3"/><path d="M1 2h8l-1 -2H2z"/><path d="M2 6h6l1 10H1z"/><path d="M2 16h2l-1 9H1zM6 16h2l1 9H7z"/><path d="M8 7l9-7 1 1-9 8z"/></g>`;
  const plane = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><path d="M0 6l30-2 4 2-4 2-30-2z"/><path d="M12 5l6-9h3l-3 10zM12 7l6 9h3l-3-10z"/><path d="M0 6l-3-4h2l4 4z"/></g>`;
  const ship = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><path d="M0 20h120l-10 10H8z"/><path d="M20 12h70v8H20z"/><path d="M40 4h26v8H40z"/><path d="M50 -6h6v10h-6zM60 -2h5v6h-5z"/><path d="M70 14h26v2H70zM8 15h20v2H8z"/></g>`;
  const crowd = (y, n, c) => { let o = ''; for (let i = 0; i < n; i++) { const x = (i * 337) % 330 - 5, yy = y + ((i * 53) % 18); o += `<circle cx="${x}" cy="${yy}" r="5"/><path d="M${x - 6} ${yy + 4}h12v20h-12z"/>`; } return `<g fill="${c}">${o}</g>`; };
  const SCENES = {
    war: () => `${hills(96, '#8a7556')}${smoke(70, 80, 1.2)}${smoke(250, 70, 0.9)}${hills(116, '#5e4d36')}${tank(150, 92, 1.4, '#2f2519')}${tank(40, 104, 1, '#3a2e1f')}${soldier(230, 98, 1.2, '#2f2519')}${soldier(256, 101, 1.15, '#2f2519')}${soldier(280, 99, 1.2, '#2f2519')}`,
    navy: () => `<rect y="88" width="320" height="52" fill="#6f6048"/><path d="M0 92h320M0 104h320M0 120h320" stroke="#8c7a5c" stroke-width="1.5" opacity="0.6"/>${smoke(150, 60, 1)}${ship(90, 66, 1.4, '#2c2318')}${ship(16, 80, 0.55, '#4a3c29')}${ship(250, 78, 0.5, '#4a3c29')}`,
    air: () => `<g fill="#e3d4b3" opacity="0.6"><ellipse cx="60" cy="40" rx="50" ry="12"/><ellipse cx="250" cy="70" rx="70" ry="14"/></g>${plane(70, 50, 2.4, '#2c2318')}${plane(150, 30, 1.7, '#3a2e1f')}${plane(220, 58, 1.9, '#3a2e1f')}${plane(30, 90, 1.2, '#4a3c29')}${hills(128, '#5e4d36')}`,
    politics: () => `<rect x="0" y="0" width="320" height="140" fill="#a99372"/><g fill="#5a4630"><rect x="40" y="10" width="26" height="70"/><rect x="254" y="10" width="26" height="70"/></g><path d="M40 10h26v70l-13-8-13 8z" fill="#7a2c20"/><path d="M254 10h26v70l-13-8-13 8z" fill="#7a2c20"/><rect x="130" y="56" width="60" height="40" fill="#3e3122"/><circle cx="160" cy="40" r="9" fill="#2c2318"/><path d="M148 50h24l4 12h-32z" fill="#2c2318"/>${crowd(100, 34, '#2c2318')}`,
    diplomacy: () => `<rect width="320" height="140" fill="#b09a78"/><rect x="40" y="18" width="240" height="56" fill="#8e7a5a"/><path d="M60 18v56M100 18v56M220 18v56M260 18v56" stroke="#76644a" stroke-width="4"/><path d="M20 92h280l-10 14H30z" fill="#4a3a28"/><path d="M110 88l40-6 4 6zM170 84l36 4-4 4z" fill="#efe3c6"/><g fill="#2c2318"><circle cx="70" cy="60" r="10"/><path d="M56 70h28l6 22H50z"/><circle cx="250" cy="60" r="10"/><path d="M236 70h28l6 22h-40z"/></g><path d="M160 30v40" stroke="#3e3122" stroke-width="2"/><path d="M160 30h18v10h-18z" fill="#7a2c20"/>`,
    industry: () => `<rect width="320" height="140" fill="#a39073"/>${smoke(70, 30, 1.1)}${smoke(130, 20, 1.3)}${smoke(210, 34, 1)}<g fill="#3a2e1f"><rect x="62" y="30" width="12" height="70"/><rect x="122" y="20" width="14" height="80"/><rect x="202" y="34" width="12" height="66"/><path d="M20 140V92l40-20v20l40-20v20l40-20v20l40-20v20l40-20v20l40-20v20l40-20v68z"/></g><g fill="#d9b25c" opacity="0.8">${[40, 80, 120, 160, 200, 240, 280].map((x) => `<rect x="${x}" y="112" width="8" height="8"/>`).join('')}</g>`,
    science: () => `<rect width="320" height="140" fill="#9c8a6c"/><circle cx="160" cy="62" r="40" fill="none" stroke="#3a2e1f" stroke-width="3"/><ellipse cx="160" cy="62" rx="56" ry="18" fill="none" stroke="#3a2e1f" stroke-width="2.5"/><ellipse cx="160" cy="62" rx="56" ry="18" fill="none" stroke="#3a2e1f" stroke-width="2.5" transform="rotate(60 160 62)"/><ellipse cx="160" cy="62" rx="56" ry="18" fill="none" stroke="#3a2e1f" stroke-width="2.5" transform="rotate(-60 160 62)"/><circle cx="160" cy="62" r="7" fill="#7a2c20"/><path d="M0 116h320v24H0z" fill="#4a3c29"/><g fill="#2c2318"><rect x="30" y="86" width="40" height="30"/><rect x="250" y="80" width="44" height="36"/></g>`,
    surrender: () => `<rect width="320" height="140" fill="#b3a07e"/>${hills(110, '#6d5a40')}<path d="M150 20v100" stroke="#2c2318" stroke-width="3"/><path d="M152 22c20 6 34-4 54 4v34c-20-8-34 2-54-4z" fill="#efe6cf"/>${crowd(112, 22, '#2c2318')}`,
    city: () => `<rect width="320" height="140" fill="#ae9a78"/><g fill="#4a3c29"><rect x="10" y="60" width="40" height="80"/><rect x="56" y="40" width="30" height="100"/><rect x="92" y="70" width="44" height="70"/><path d="M150 140V64a20 20 0 0 1 40 0v76z"/><rect x="167" y="30" width="6" height="16"/><rect x="200" y="50" width="34" height="90"/><rect x="240" y="76" width="30" height="64"/><rect x="276" y="56" width="40" height="84"/></g><g fill="#d9c08a" opacity="0.6">${[20, 64, 104, 210, 286].map((x) => `<rect x="${x}" y="84" width="6" height="8"/><rect x="${x + 12}" y="100" width="6" height="8"/>`).join('')}</g>`,
  };
  G.eventArt = (p) => {
    const k = G.eventKind(p), id = 'ea' + uid++;
    return `<svg class="ev-art" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8c7a2"/><stop offset="1" stop-color="#a48f6a"/></linearGradient>
<radialGradient id="${id}v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1b140b" stop-opacity="0.75"/></radialGradient>
<filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${uid % 50}"/><feColorMatrix values="0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0 0.12 0 0 0 0.35 0"/></filter></defs>
<rect width="320" height="140" fill="url(#${id}s)"/>${(SCENES[k] || SCENES.city)()}
<rect width="320" height="140" filter="url(#${id}n)"/><rect width="320" height="140" fill="url(#${id}v)"/></svg>`;
  };
})(window);
