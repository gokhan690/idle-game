// HOI4 tarzı tek tip simge seti: aynı çizgi kalınlığında, düz (dolu) piktogramlar.
// Üst çubukta renkli madalyon içinde, uyarı/menü/panel başlığında tek renk kullanılır.
(function (g) {
  const G = g.G;
  // her piktogram 24x24, "currentColor" ile boyanır
  const P = {
    pp: '<path d="M12 3.5l1.6 3.2 4.9-2-1.7 4.6 3.7 1.3-4.6 2.3v2.6l-2.2 4.5h-3.4l-2.2-4.5v-2.6L3.5 10.6l3.7-1.3L5.5 4.7l4.9 2z"/>',
    stab: '<path d="M11 4h2v13h-2zM6 19h12v1.8H6zM4.5 6.2h15V8h-15z"/><path d="M6 8l-3 5.2h6zM18 8l-3 5.2h6z"/><path d="M3 13.6h6a3 2 0 0 1-6 0zM15 13.6h6a3 2 0 0 1-6 0z"/>',
    ws: '<path d="M4.5 15.5c0-5.2 3.3-8.6 7.5-8.6s7.5 3.4 7.5 8.6z"/><path d="M2.8 16.2h18.4v2.2H2.8z"/><path d="M10.5 5.6h3V8h-3z"/>',
    mp: '<circle cx="8.5" cy="7.5" r="3.2"/><path d="M2.5 20c0-4 2.7-6.6 6-6.6s6 2.6 6 6.6z"/><circle cx="16.5" cy="8.5" r="2.7" opacity="0.75"/><path d="M14.6 13.6c.6-.2 1.2-.3 1.9-.3 2.8 0 5 2.2 5 5.7h-5.3c0-2-.6-3.9-1.6-5.4z" opacity="0.75"/>',
    civ: '<path fill-rule="evenodd" d="M3 20.5V10.5l5 3v-3l5 3V5.5h2.5v-2h2v2H20v15zM5.5 16h2v2h-2zM9.5 16h2v2h-2zM15 9h2v2h-2zM15 13h2v2h-2z"/>',
    mil: '<path fill-rule="evenodd" d="M21.5 10.4L21.5 13.6L19.2 13.6L18.3 15.9L19.8 17.5L17.5 19.8L15.9 18.3L13.6 19.2L13.6 21.5L10.4 21.5L10.4 19.2L8.1 18.3L6.5 19.8L4.2 17.5L5.7 15.9L4.8 13.6L2.5 13.6L2.5 10.4L4.8 10.4L5.7 8.1L4.2 6.5L6.5 4.2L8.1 5.7L10.4 4.8L10.4 2.5L13.6 2.5L13.6 4.8L15.9 5.7L17.5 4.2L19.8 6.5L18.3 8.1L19.2 10.4zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8z"/>',
    dock: '<circle cx="12" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.2v13M7 10.5h10M4.5 13.5c.6 4.2 3.6 6.8 7.5 6.8s6.9-2.6 7.5-6.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    steel: '<path d="M2.5 16.5l4.5-6.5h14l-3.5 6.5z"/><path d="M2.5 17.2h15v3h-15z" opacity="0.75"/><path d="M18.2 16.8L21.5 10.6v3.4l-3.3 6.2z" opacity="0.5"/>',
    oil: '<path fill-rule="evenodd" d="M12 2.8c3.2 4.6 6.4 7.9 6.4 11.4a6.4 6.4 0 0 1-12.8 0c0-3.5 3.2-6.8 6.4-11.4zM8.6 14.2a3.4 3.4 0 0 0 3.4 3.4v-1.6a1.8 1.8 0 0 1-1.8-1.8z"/>',
    fuel: '<path fill-rule="evenodd" d="M5 7h9.5l4.5 4.5v9.5H5zM8.2 11.2l1.4-1.2 2.5 3 2.5-3 1.4 1.2-2.7 3.2 2.7 3.2-1.4 1.2-2.5-3-2.5 3-1.4-1.2 2.7-3.2z"/><path d="M6.5 3.5h5.5V6H6.5z"/>',
    conv: '<path d="M2 15h20l-2.8 5H4.8z"/><path d="M6 15V9.5h4.5V15zM11.5 15V7h5.5v8z" opacity="0.8"/><path d="M13.5 4.5h1.6V7h-1.6z"/>',
    div: '<path fill-rule="evenodd" d="M2.5 5.5h19v13h-19zM4.5 7.5v9h15v-9z"/><path d="M4.2 7.7l1.1-1.6 14.5 10.2-1.1 1.6zM18.7 6.1l1.1 1.6L5.3 17.9l-1.1-1.6z"/>',
    tension: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    war: '<path d="M4 3.5l10.5 10.5M20 3.5L9.5 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12.5 17.2l4.5-4.5 2.6 2.6-4.5 4.5zM11.5 17.2L7 12.7l-2.6 2.6 4.5 4.5z"/>',
    // uyarı / menü / panel simgeleri
    focus: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8"/>',
    res: '<path d="M8.5 2.8h7v2h-1.3v4.6l5.6 9.4A2 2 0 0 1 18.1 22H5.9a2 2 0 0 1-1.7-3.2l5.6-9.4V4.8H8.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.1 14.5h9.8l2.2 3.8a1.1 1.1 0 0 1-1 1.7H5.9a1.1 1.1 0 0 1-1-1.7z"/>',
    con: '<path d="M3.5 20.5h17v1.6h-17zM6 20.5V4h2.2v16.5z"/><path d="M6 4h14v2.2H6zM8.2 6.2L18 6.2 8.2 12z" opacity="0.6"/><path d="M15.5 6.2h1.6v4.3h-1.6z"/><path d="M13.5 10.5h5.6v3.6h-5.6z"/>',
    trade: '<path d="M3.5 7.5h13l-3-3M20.5 16.5h-13l3 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    adv: '<circle cx="12" cy="7.5" r="3.8"/><path d="M4.5 21c0-4.4 3.3-7.2 7.5-7.2s7.5 2.8 7.5 7.2z"/><path d="M11 13.8h2l.7 3.2-1.7 2-1.7-2z" opacity="0.5"/>',
    peace: '<path fill-rule="evenodd" d="M5 3h10.5L19 6.5V21H5zM7.8 8.5v1.6h8.4V8.5zM7.8 12v1.6h8.4V12zM7.8 15.5v1.6h5.4v-1.6z"/>',
    dec: '<path fill-rule="evenodd" d="M6 3.5h12a2 2 0 0 1 2 2V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1h12.5v1.5a1 1 0 0 0 2 0V5.5zM6 4.5v11h2V7h8.2V5.5a2 2 0 0 0-.3-1z"/><path d="M9.5 8.5h6v1.6h-6zM9.5 11.8h6v1.6h-6z"/>',
    air: '<path d="M12 2.5c.9 0 1.5 1.6 1.5 4.5v1.5l7.5 4.5v2.2l-7.5-2.2v4.3l2.5 2v1.8L12 19.8l-4 1.3v-1.8l2.5-2V13l-7.5 2.2V13l7.5-4.5V7c0-2.9.6-4.5 1.5-4.5z"/>',
    navy: '<path d="M1.5 15h21l-3.2 5H4.7z"/><path d="M5.5 15v-3h3v-2.5h5V12h5v3z" opacity="0.85"/><path d="M10.2 9.5V5.5h1.6v4zM11.8 6.2h3.7v1.4h-3.7z"/>',
    tank: '<path d="M2 14.5h20l-2.2 4.5H4.2z"/><path d="M4.5 10.5h13l2 4H2.5z" opacity="0.85"/><path d="M7.5 7.5h6.5v3H7.5zM14 8.3h8v1.5h-8z"/>',
    hand: '<path d="M1.8 10.8l4-3.3 4.2 1.2 2-1 3 1 5.2 3.2-2.1 4.3-2-.6-2.1 2.6-2-1.1-1.6 1.6-1.8-1-2.9-1.4z"/><path d="M10 9.6l3 3M12 13.6l2 2M9.8 14.4l1.5 1.5" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="1.1"/>',
  };
  // madalyon renkleri (üst çubuk)
  const MED = { pp: '#b8892a', stab: '#2f5f96', ws: '#9a3326', mp: '#6e5e46', civ: '#6d6e66', mil: '#5b6a2f', dock: '#2d5a78', steel: '#585f66', oil: '#2a2a28', fuel: '#4b6a2b', conv: '#6b5d40', div: '#4c5836', tension: '#7a2a20', war: '#8a2418' };
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${P[k] || ''}</svg>`;
  G.ICO = Object.fromEntries(Object.keys(P).map((k) => [k, svg(k)]));
  G.ico = (k, cls = '') => `<i class="hi ${cls}">${svg(k)}</i>`;
  G.med = (k, cls = '') => `<i class="hi med ${cls}" style="--mc:${MED[k] || '#555'}">${svg(k)}</i>`;
})(window);
