// HOI4 tarzı renkli simgeler (üst çubuk kaynakları, uyarılar, panel başlıkları). Satır içi SVG.
(function (g) {
  const G = g.G;
  const S = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  const ICO = {
    // siyasi güç: altın kartal rozeti
    pp: S('<circle cx="12" cy="12" r="10" fill="#e8c35a" stroke="#6b5317" stroke-width="1.5"/><path d="M5.5 10.5c2 .2 3.6 1 4.6 2.4L12 9l1.9 3.9c1-1.4 2.6-2.2 4.6-2.4-1.1 2-2.6 3.3-4.6 3.8l.6 2.7h-5l.6-2.7c-2-.5-3.5-1.8-4.6-3.8z" fill="#5a4210"/>'),
    // istikrar: mavi terazi
    stab: S('<circle cx="12" cy="12" r="10" fill="#3d6fa8" stroke="#1d3655" stroke-width="1.5"/><path d="M12 6v11M8 17h8M6.5 8.5h11" stroke="#eaf2ff" stroke-width="1.6" fill="none"/><path d="M6.5 8.5l-2 4h4zM17.5 8.5l-2 4h4z" fill="#eaf2ff"/>'),
    // savaş desteği: kırmızı yumruk/miğfer
    ws: S('<circle cx="12" cy="12" r="10" fill="#b8392b" stroke="#5c1a12" stroke-width="1.5"/><path d="M6.5 14.5c0-4 2.4-7 5.5-7s5.5 3 5.5 7z" fill="#f3e2c8"/><path d="M5 15h14v1.6H5z" fill="#f3e2c8"/>'),
    // insan gücü
    mp: S('<circle cx="9" cy="8" r="3.2" fill="#d9c7a3"/><path d="M3.5 19c0-3.6 2.4-6 5.5-6s5.5 2.4 5.5 6z" fill="#d9c7a3"/><circle cx="16.5" cy="9" r="2.6" fill="#a99a7a"/><path d="M13 19.5c.3-3 2-5 4-5 2.3 0 3.6 2 3.6 5z" fill="#a99a7a"/>'),
    // sivil fabrika: gri bina, sarı pencere
    civ: S('<path d="M3 20V10l5 3v-3l5 3V6h3v-2h2v2h3v14z" fill="#a9b0a4" stroke="#3a3f37" stroke-width="1"/><path d="M5 15h2v2H5zM9 15h2v2H9zM14 10h2v2h-2zM14 14h2v2h-2zM18 10h1.5v2H18zM18 14h1.5v2H18z" fill="#f0c94a"/>'),
    // askerî fabrika: zeytin bina, namlu
    mil: S('<path d="M3 20V10l5 3v-3l5 3V6h8v14z" fill="#7d8a55" stroke="#2f361f" stroke-width="1"/><path d="M14 9h7v2h-7zM5 15h2v2H5zM9 15h2v2H9z" fill="#2f361f"/><circle cx="16" cy="15.5" r="2" fill="#d6c27a"/>'),
    // tersane: çapa
    dock: S('<circle cx="12" cy="5" r="2.2" fill="none" stroke="#8fb7d9" stroke-width="1.8"/><path d="M12 7v13M7 10h10M4.5 13.5c.5 4 3.5 6.5 7.5 6.5s7-2.5 7.5-6.5" fill="none" stroke="#8fb7d9" stroke-width="1.8" stroke-linecap="round"/>'),
    // çelik külçe
    steel: S('<path d="M3 16l4-6h13l-3 6z" fill="#8e979e" stroke="#3b4247" stroke-width="1"/><path d="M3 16h14v3H3z" fill="#626b72"/><path d="M17 16l3-6v3l-3 6z" fill="#4b5359"/>'),
    // petrol damlası
    oil: S('<path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z" fill="#1e1e1e" stroke="#7a7a6e" stroke-width="1.2"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" stroke="#9c9c90" stroke-width="1.4" fill="none"/>'),
    // yakıt bidonu
    fuel: S('<path d="M5 6h10l4 4v11H5z" fill="#4e6b3a" stroke="#1f2c16" stroke-width="1.2"/><path d="M7 3h5v3H7z" fill="#2c3b20"/><path d="M8 10l6 8M14 10l-6 8" stroke="#c7d6a5" stroke-width="1.5"/>'),
    // tümen: NATO piyade simgesi
    div: S('<rect x="3" y="6" width="18" height="12" fill="#c9cfa3" stroke="#2c2f22" stroke-width="1.4"/><path d="M3 6l18 12M21 6L3 18" stroke="#2c2f22" stroke-width="1.4"/>'),
    // dünya gerginliği
    tension: S('<circle cx="12" cy="12" r="9.5" fill="#6b2a22" stroke="#e05a42" stroke-width="1.5"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" stroke="#f0b8a8" stroke-width="1.1" fill="none"/>'),
    // savaş: çapraz kılıç
    war: S('<path d="M4 4l11 11M20 4L9 15" stroke="#e7dcc0" stroke-width="2.2" stroke-linecap="round"/><path d="M13 17l4-4 2.5 2.5-4 4zM11 17l-4-4-2.5 2.5 4 4z" fill="#b8392b"/>'),
    // konvoy
    conv: S('<path d="M3 15h18l-2.5 4.5h-13z" fill="#8a7f68" stroke="#3a3426" stroke-width="1"/><path d="M7 15V10h4v5M12 15V8h5v7" fill="#b0a58b" stroke="#3a3426" stroke-width="1"/>'),
    // tank
    tank: S('<path d="M2 15h20l-2.5 4.5h-15z" fill="#6d7a4a" stroke="#22281a" stroke-width="1"/><path d="M5 11h12l2 4H3z" fill="#8a9860" stroke="#22281a" stroke-width="1"/><path d="M8 8h6v3H8zM14 9h8v1.5h-8z" fill="#6d7a4a" stroke="#22281a" stroke-width="0.8"/>'),
    // el sıkışma (diplomasi)
    hand: S('<path d="M2 11l4-3 4 1 2-1 3 1 5 3-2 4-2-.5-2 2.5-2-1-1.5 1.5L8 17l-3-1z" fill="#d9c7a3" stroke="#4a3f2a" stroke-width="1.1" stroke-linejoin="round"/><path d="M10 9l3 3M12 13l2 2M10 14l1.5 1.5" stroke="#4a3f2a" stroke-width="1"/>'),
    // uyarılar
    focus: S('<circle cx="12" cy="12" r="9" fill="none" stroke="#f0d27a" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#f0d27a" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="#f0d27a"/>'),
    res: S('<path d="M9 3h6M10 3v6l-5.2 9.2A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.8L14 9V3" fill="none" stroke="#9fd0ff" stroke-width="1.8"/><path d="M7.4 15h9.2l2 3.4a1 1 0 0 1-.9 1.6H6.3a1 1 0 0 1-.9-1.6z" fill="#5aa0e0"/>'),
    con: S('<path d="M4 21h16M7 21V9M7 4v5h12M7 4l12 5" fill="none" stroke="#f0c94a" stroke-width="1.8"/><path d="M14 9v4h-2.5v3H16.5v-3H14" fill="none" stroke="#f0c94a" stroke-width="1.5"/>'),
    trade: S('<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="#e3d6a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    adv: S('<circle cx="12" cy="8" r="3.6" fill="#d9c7a3"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill="#4a5a7a"/><path d="M11 13.5h2l.6 3-1.6 2-1.6-2z" fill="#b8392b"/>'),
    peace: S('<path d="M5 4h11l3 3v13H5z" fill="#e6dcc0" stroke="#5a4f37" stroke-width="1.2"/><path d="M8 9h8M8 12h8M8 15h5" stroke="#5a4f37" stroke-width="1.3"/>'),
    dec: S('<path d="M4 5h16v14H4z" fill="#3d4a33" stroke="#c7b77a" stroke-width="1.4"/><path d="M7 9h10M7 12h10M7 15h6" stroke="#e8dcae" stroke-width="1.4"/>'),
    air: S('<path d="M12 2.5l1.6 6.5 7.4 4v2l-7.4-2-.6 5 2.5 2v1.5L12 20.5 8.5 21.5V20l2.5-2-.6-5-7.4 2v-2l7.4-4z" fill="#cdd7e0"/>'),
    navy: S('<path d="M2 15h20l-3 5H5z" fill="#7d8b97"/><path d="M6 15v-3h3v-2h4v2h5v3" fill="#a3b0bb"/><path d="M11 10V6M11 7h4" stroke="#a3b0bb" stroke-width="1.4"/>'),
  };
  G.ICO = ICO;
  G.ico = (k, cls = '') => `<i class="hi ${cls}">${ICO[k] || ''}</i>`;
})(window);
