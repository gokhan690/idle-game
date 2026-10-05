// Basitleştirilmiş bayraklar (SVG). Bilinmeyen ülkeler için ülke renginden üretilir.
(function (g) {
  const G = g.G;
  const h3 = (a, b, c) => `<rect width="30" height="20" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`;
  const v3 = (a, b, c) => `<rect width="30" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
  const h2 = (a, b) => `<rect width="30" height="20" fill="${a}"/><rect y="10" width="30" height="10" fill="${b}"/>`;
  const nordic = (bg, c1, c2) => `<rect width="30" height="20" fill="${bg}"/><rect x="8" width="6" height="20" fill="${c1}"/><rect y="7" width="30" height="6" fill="${c1}"/>` + (c2 ? `<rect x="9.5" width="3" height="20" fill="${c2}"/><rect y="8.5" width="30" height="3" fill="${c2}"/>` : '');
  const star = (cx, cy, r, fill) => { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2); } return `<path d="${d}Z" fill="${fill}"/>`; };
  const jack = (x, y, w, hh) => `<g transform="translate(${x},${y}) scale(${w / 30},${hh / 20})"><rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#C8102E" stroke-width="3.6"/></g>`;
  const ensign = (bg) => `<rect width="30" height="20" fill="${bg}"/>${jack(0, 0, 15, 10)}`;
  const F = {
    GER: h3('#111', '#fff', '#dd0000'),
    ITA: v3('#009246', '#fff', '#ce2b37'),
    FRA: v3('#0055a4', '#fff', '#ef4135'),
    ENG: jack(0, 0, 30, 20),
    SOV: `<rect width="30" height="20" fill="#cc0000"/>${star(5.5, 4.5, 2.6, '#ffd700')}`,
    USA: (() => { let s = '<rect width="30" height="20" fill="#fff"/>'; for (let i = 0; i < 7; i++) s += `<rect y="${i * 2.86}" width="30" height="1.43" fill="#b22234"/>`; return s + '<rect width="13" height="10" fill="#3c3b6e"/>'; })(),
    JAP: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.6" fill="#bc002d"/>',
    CHI: '<rect width="30" height="20" fill="#d00"/><rect width="15" height="10" fill="#0a2a8a"/><circle cx="7.5" cy="5" r="2.6" fill="#fff"/>',
    PRC: `<rect width="30" height="20" fill="#d00"/>${star(5.5, 5, 3, '#ffde00')}`,
    MAN: '<rect width="30" height="20" fill="#f7d417"/><rect width="10" height="1.7" fill="#d00"/><rect y="1.7" width="10" height="1.7" fill="#1a3fbf"/><rect y="3.4" width="10" height="1.6" fill="#fff"/><rect y="5" width="10" height="1.7" fill="#111"/>',
    TUR: '<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/>' + star(17.5, 10, 2.4, '#fff'),
    POL: h2('#fff', '#dc143c'),
    CZE: '<rect width="30" height="20" fill="#fff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0 0L15 10L0 20Z" fill="#11457e"/>',
    AUS: h3('#ed2939', '#fff', '#ed2939'),
    HUN: h3('#ce2939', '#fff', '#477050'),
    ROM: v3('#002b7f', '#fcd116', '#ce1126'),
    YUG: h3('#1a4fa0', '#fff', '#d0202a'),
    BUL: h3('#fff', '#00966e', '#d62612'),
    GRE: (() => { let s = '<rect width="30" height="20" fill="#0d5eaf"/>'; for (let i = 1; i < 9; i += 2) s += `<rect y="${i * 2.22}" width="30" height="2.22" fill="#fff"/>`; return s + '<rect width="11" height="11.1" fill="#0d5eaf"/><rect x="4.4" width="2.2" height="11.1" fill="#fff"/><rect y="4.45" width="11" height="2.2" fill="#fff"/>'; })(),
    ALB: `<rect width="30" height="20" fill="#e41e20"/><path d="M15 5l4 3-1.5 6h-5L11 8z" fill="#111"/>`,
    SPR: h3('#c60b1e', '#ffc400', '#6c2f8e'),
    POR: '<rect width="30" height="20" fill="#ff0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.2" fill="#ffcc00"/>',
    SWI: '<rect width="30" height="20" fill="#d52b1e"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>',
    BEL: v3('#111', '#fdda24', '#ef3340'),
    HOL: h3('#ae1c28', '#fff', '#21468b'),
    LUX: h3('#ed2939', '#fff', '#00a1de'),
    DEN: nordic('#c8102e', '#fff'),
    NOR: nordic('#ba0c2f', '#fff', '#00205b'),
    SWE: nordic('#006aa7', '#fecc00'),
    FIN: nordic('#fff', '#003580'),
    EST: h3('#0072ce', '#111', '#fff'),
    LAT: '<rect width="30" height="20" fill="#9e3039"/><rect y="8" width="30" height="4" fill="#fff"/>',
    LIT: h3('#fdb913', '#006a44', '#c1272d'),
    IRE: v3('#169b62', '#fff', '#ff883e'),
    CAN: ensign('#c8102e'), RAJ: ensign('#c8102e'), AST: ensign('#012169') + star(22, 13, 2.4, '#fff'), NZL: ensign('#012169') + star(22, 10, 1.8, '#c8102e'),
    SAF: h3('#ff7900', '#fff', '#00247d'),
    MEX: v3('#006847', '#fff', '#ce1126'),
    BRA: '<rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5L27 10L15 17.5L3 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4" fill="#002776"/>',
    ARG: h3('#74acdf', '#fff', '#74acdf'),
    CHL: '<rect width="30" height="20" fill="#fff"/><rect y="10" width="30" height="10" fill="#d52b1e"/><rect width="10" height="10" fill="#0039a6"/>' + star(5, 5, 2.4, '#fff'),
    PRU: v3('#d91023', '#fff', '#d91023'),
    BOL: h3('#d52b1e', '#f9e300', '#007934'),
    PAR: h3('#d52b1e', '#fff', '#0038a8'),
    URU: (() => { let s = '<rect width="30" height="20" fill="#fff"/>'; for (let i = 1; i < 9; i += 2) s += `<rect y="${i * 2.22}" width="30" height="2.22" fill="#0038a8"/>`; return s + '<rect width="11" height="11" fill="#fff"/><circle cx="5.5" cy="5.5" r="2.6" fill="#fcd116"/>'; })(),
    VEN: h3('#ffcc00', '#00247d', '#cf142b'),
    COL: '<rect width="30" height="20" fill="#ce1126"/><rect width="30" height="10" fill="#fcd116"/><rect y="10" width="30" height="5" fill="#003893"/>',
    ECU: '<rect width="30" height="20" fill="#ce1126"/><rect width="30" height="10" fill="#ffdd00"/><rect y="10" width="30" height="5" fill="#034ea2"/>',
    ETH: h3('#078930', '#fcdd09', '#da121a'),
    MON: v3('#c4272f', '#015197', '#c4272f'),
    SIA: '<rect width="30" height="20" fill="#a51931"/><rect y="3.33" width="30" height="13.33" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.67" fill="#2d2a4a"/>',
    PER: h3('#239f40', '#fff', '#da0000'),
    IRQ: '<rect width="30" height="20" fill="#111"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#007a3d"/><path d="M0 0L9 10L0 20Z" fill="#ce1126"/>',
    SAU: '<rect width="30" height="20" fill="#006c35"/><rect x="7" y="13" width="16" height="1.5" fill="#fff"/>',
    AFG: v3('#111', '#d32011', '#007a36'),
    SLO: h3('#fff', '#0b4ea2', '#ee1c25'),
    LIB: (() => { let s = '<rect width="30" height="20" fill="#fff"/>'; for (let i = 0; i < 11; i += 2) s += `<rect y="${i * 1.82}" width="30" height="1.82" fill="#bf0a30"/>`; return s + '<rect width="10" height="9.1" fill="#002868"/>' + star(5, 4.5, 2.2, '#fff'); })(),
    CUB: (() => { let s = '<rect width="30" height="20" fill="#002a8f"/>'; for (let i = 1; i < 5; i += 2) s += `<rect y="${i * 4}" width="30" height="4" fill="#fff"/>`; return s + '<path d="M0 0L13 10L0 20Z" fill="#cf142b"/>' + star(4.5, 10, 2.4, '#fff'); })(),
    PAN: '<rect width="30" height="20" fill="#fff"/><rect x="15" width="15" height="10" fill="#d21034"/><rect y="10" width="15" height="10" fill="#005293"/>',
    GUA: v3('#4997d0', '#fff', '#4997d0'), HON: h3('#0073cf', '#fff', '#0073cf'), ELS: h3('#0f47af', '#fff', '#0f47af'), NIC: h3('#0067c6', '#fff', '#0067c6'),
    COS: '<rect width="30" height="20" fill="#002b7f"/><rect y="3.33" width="30" height="13.33" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#ce1126"/>',
    HAI: h2('#00209f', '#d21034'),
    DOM: '<rect width="30" height="20" fill="#fff"/><rect width="13" height="8" fill="#002d62"/><rect x="17" width="13" height="8" fill="#ce1126"/><rect y="12" width="13" height="8" fill="#ce1126"/><rect x="17" y="12" width="13" height="8" fill="#002d62"/>',
    NEP: '<rect width="30" height="20" fill="#003893"/><path d="M8 1.5L22 10H11L22 18.5H8Z" fill="#dc143c"/>',
    TIB: '<rect width="30" height="20" fill="#c8102e"/><path d="M15 10L0 0H6L15 10L12 0H18L15 10L24 0H30L15 10Z" fill="#00247d"/><circle cx="15" cy="13" r="3" fill="#ffd700"/>',
    SIK: `<rect width="30" height="20" fill="#2a6ebb"/>${star(15, 10, 4, '#fff')}`,
    YEM: `<rect width="30" height="20" fill="#c8102e"/>${star(15, 10, 3.5, '#fff')}`,
    OMA: '<rect width="30" height="20" fill="#c8102e"/><rect width="8" height="20" fill="#c8102e"/>',
  };
  G.flag = (tag, w = 30, hh = 20, cls = 'flag') => {
    let body = F[tag];
    if (!body) {
      const c = (g.COUNTRY_DEFS[tag] || {}).c || '#777777';
      body = `<rect width="30" height="20" fill="${c}"/><rect y="13" width="30" height="7" fill="rgba(0,0,0,0.28)"/>`;
    }
    return `<svg class="${cls}" width="${w}" height="${hh}" viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  };
})(window);
