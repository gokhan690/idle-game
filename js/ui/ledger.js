// Defter paneli (HOI4 "Ledger"): ülke karşılaştırma tabloları ve aylık gidişat grafiği.
(function (g) {
  const G = g.G, UI = G.UI, { esc, sec } = UI.h, PANELS = UI.PANELS, ACT = UI.ACT;
  // grafik dizileri için sabit sıralı kategorik palet (doğrulanmış, koyu yüzey); renk ülkeyi izler, sırayı değil
  const PAL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
  const TABS = [['gen', 'Genel'], ['land', 'Kara'], ['air', 'Hava'], ['sea', 'Deniz'], ['cas', 'Kayıplar'], ['graph', 'Gidişat']];
  const METRICS = { mil: 'Askerî fabrika', civ: 'Sivil fabrika', div: 'Tümen', dead: 'Kayıp (bin)' };
  UI.ledTab = 'gen'; UI.ledMetric = 'mil';
  const fmt = (v) => (v >= 10000 ? G.fmtK(v) : Math.round(v).toLocaleString('tr-TR'));

  function countries() {
    const st = G.st, divs = {};
    for (const u of st.units) divs[u.t] = (divs[u.t] || 0) + 1;
    return Object.values(st.C).filter((c) => c.alive && c.sum).map((c) => ({ c, t: c.tag, div: divs[c.tag] || 0 }));
  }
  // satır tablosu: ilk sütun ülke, sonra sayılar; ana ölçü için çubuk
  function table(rows, cols, main) {
    const me = G.st.player, mx = Math.max(1, ...rows.map((r) => r[main]));
    let h = `<div class="ledt"><div class="lr lh"><span>Ülke</span>${cols.map(([, n]) => `<span>${n}</span>`).join('')}</div>`;
    for (const r of rows) {
      h += `<button class="lr ${r.t === me ? 'me' : ''}" data-act="dipc" data-v="${r.t}"><span class="ln">${G.flag(r.t, 20, 14)}<b>${esc(G.cname(r.t))}</b></span>${cols.map(([k]) => `<span class="num">${fmt(r[k])}</span>`).join('')}<i class="lbar" style="width:${(r[main] / mx * 100).toFixed(1)}%"></i></button>`;
    }
    return h + '</div>';
  }
  function topBy(list, key, n = 12) {
    const me = G.st.player;
    const s = list.slice().sort((a, b) => b[key] - a[key]);
    const out = s.slice(0, n);
    if (!out.some((r) => r.t === me)) { const m = s.find((r) => r.t === me); if (m) out.push(m); }
    return out;
  }

  function chart(metric) {
    const st = G.st, led = st.led;
    if (!led || led.d.length < 2) return '<p class="muted small">Grafik için en az iki aylık kayıt gerekiyor. Oyun ilerledikçe dolar.</p>';
    const tags = Object.keys(led.s).filter((t) => st.C[t]);
    const W = 600, H = 250, L = 40, R = 64, T = 12, B = 26;
    const d0 = led.d[0], d1 = led.d[led.d.length - 1];
    let mx = 1; for (const t of tags) for (const v of led.s[t][metric]) if (v != null && v > mx) mx = v;
    // okunur üst sınır
    const step = Math.pow(10, Math.floor(Math.log10(mx))), top = Math.ceil(mx / step) * step;
    const X = (d) => L + (d - d0) / Math.max(1, d1 - d0) * (W - L - R), Y = (v) => T + (1 - v / top) * (H - T - B);
    let svg = '';
    for (let k = 0; k <= 4; k++) { const v = top * k / 4, y = Y(v); svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="gl"/><text x="${L - 6}" y="${y + 4}" class="ax" text-anchor="end">${fmt(v)}</text>`; }
    const y0 = G.dateOf(d0).getUTCFullYear(), y1 = G.dateOf(d1).getUTCFullYear();
    for (let y = y0 + 1; y <= y1; y++) { const d = G.dayOf(y + '-01-01'); if (d < d0 || d > d1) continue; svg += `<text x="${X(d)}" y="${H - 8}" class="ax" text-anchor="middle">${y}</text>`; }
    const ends = [];
    tags.forEach((t) => {
      const col = PAL[G.LEDGER_TAGS.includes(t) ? G.LEDGER_TAGS.indexOf(t) : 7];
      const vals = led.s[t][metric];
      let p = '', on = false;
      vals.forEach((v, i) => { if (v == null) { on = false; return; } p += `${on ? 'L' : 'M'}${X(led.d[i]).toFixed(1)} ${Y(v).toFixed(1)}`; on = true; });
      svg += `<path d="${p}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const lv = vals[vals.length - 1];
      if (lv != null) ends.push({ t, y: Y(lv), col });
    });
    // doğrudan etiketler: çakışmayı önlemek için dikey itme
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 12) ends[i].y = ends[i - 1].y + 12;
    for (const e of ends) svg += `<circle cx="${W - R}" cy="${e.y}" r="3" fill="${e.col}" stroke="#1c2019" stroke-width="2"/><text x="${W - R + 7}" y="${e.y + 4}" class="dl">${esc(G.cname(e.t).slice(0, 9))}</text>`;
    const legend = `<div class="legend ledleg">${tags.map((t) => `<span><i style="background:${PAL[G.LEDGER_TAGS.includes(t) ? G.LEDGER_TAGS.indexOf(t) : 7]}"></i>${esc(G.cname(t))}</span>`).join('')}</div>`;
    return `${legend}<div class="ledchart" data-m="${metric}" data-l="${L}" data-r="${R}" data-w="${W}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${METRICS[metric]} gidişatı">${svg}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"/></svg><div class="ledtip" hidden></div></div>`;
  }

  PANELS.ledger = () => {
    const tab = UI.ledTab, list = countries();
    let html = `<div class="tabs">${TABS.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="ledtab" data-v="${k}">${n}</button>`).join('')}</div>`;
    if (tab === 'gen') {
      const rows = list.map((r) => ({ t: r.t, fab: r.c.sum.civ + r.c.sum.mil + r.c.sum.dock, civ: r.c.sum.civ, mil: r.c.sum.mil, dock: r.c.sum.dock, mp: Math.round(r.c.mpAvail || 0) }));
      html += sec('Sanayi gücü', table(topBy(rows, 'fab'), [['civ', 'Sivil'], ['mil', 'Askerî'], ['dock', 'Tersane'], ['mp', 'İnsan g. (bin)']], 'fab'), 'toplam fabrikaya göre');
    } else if (tab === 'land') {
      const rows = list.map((r) => ({ t: r.t, div: r.div, inf: r.c.stock.inf || 0, art: r.c.stock.art || 0, tank: r.c.stock.tank || 0 }));
      html += sec('Kara kuvvetleri', table(topBy(rows, 'div'), [['div', 'Tümen'], ['inf', 'Piyade t.'], ['art', 'Topçu'], ['tank', 'Tank']], 'div'), 'tümen sayısına göre');
    } else if (tab === 'air') {
      const rows = list.map((r) => { const p = (e) => (G.planes ? G.planes(r.c, e) : r.c.stock[e] || 0); const fig = p('fig'), cas = p('cas'), bom = p('bom'); return { t: r.t, tot: fig + cas + bom, fig, cas, bom }; });
      html += sec('Hava kuvvetleri', table(topBy(rows, 'tot'), [['fig', 'Avcı'], ['cas', 'Taarruz'], ['bom', 'Bombardıman'], ['tot', 'Toplam']], 'tot'), 'uçak sayısına göre');
    } else if (tab === 'sea') {
      const rows = list.map((r) => { const s = Object.assign({}, r.c.ships); for (const f of r.c.fleets || []) for (const [e, n] of Object.entries(f.sh)) s[e] = (s[e] || 0) + n; return { t: r.t, cap: (s.bb || 0) + (s.cv || 0), cr: s.cr || 0, dd: s.dd || 0, ss: s.ss || 0, tot: (s.bb || 0) * 6 + (s.cv || 0) * 6 + (s.cr || 0) * 2 + (s.dd || 0) + (s.ss || 0), conv: s.conv || 0 }; });
      html += sec('Donanmalar', table(topBy(rows, 'tot'), [['cap', 'Ağır gemi'], ['cr', 'Kruvazör'], ['dd', 'Muhrip'], ['ss', 'Denizaltı'], ['conv', 'Konvoy']], 'tot'), 'ağırlıklı güce göre');
    } else if (tab === 'cas') {
      const rows = list.map((r) => ({ t: r.t, dead: Math.round(r.c.dead || 0), war: r.c.enemies.length, div: r.div })).filter((r) => r.dead > 0 || r.t === G.st.player);
      html += rows.length ? sec('Kara kayıpları', table(topBy(rows, 'dead'), [['dead', 'Kayıp (bin)'], ['war', 'Düşman'], ['div', 'Tümen']], 'dead'), 'savaş başından beri') : '<p class="muted">Henüz kayıp yok.</p>';
    } else {
      const m = UI.ledMetric;
      html += `<div class="tabs">${Object.entries(METRICS).map(([k, n]) => `<button class="${m === k ? 'on' : ''}" data-act="ledmetric" data-v="${k}">${n}</button>`).join('')}</div>`;
      html += sec(METRICS[m], chart(m), 'aylık');
    }
    return { title: 'Defter', html };
  };
  ACT.ledtab = (d) => { UI.ledTab = d.v; UI.render(true); };
  ACT.ledmetric = (d) => { UI.ledMetric = d.v; UI.render(true); };
  ACT.dipc = (d) => { UI.panel = 'dip'; UI.sub = 'c:' + d.v; UI.render(true); };

  // grafik üzerinde dokunma/gezinme: dikey çizgi + o aydaki değerler
  const onMove = (e) => {
    const box = e.target.closest && e.target.closest('.ledchart'); if (!box) return;
    const led = G.st && G.st.led; if (!led || led.d.length < 2) return;
    const svg = box.querySelector('svg'), r = svg.getBoundingClientRect(), W = +box.dataset.w, L = +box.dataset.l, R = +box.dataset.r;
    const x = (e.clientX - r.left) / r.width * W;
    const f = Math.max(0, Math.min(1, (x - L) / (W - L - R)));
    const d = led.d[0] + f * (led.d[led.d.length - 1] - led.d[0]);
    let i = 0; for (let k = 1; k < led.d.length; k++) if (Math.abs(led.d[k] - d) < Math.abs(led.d[i] - d)) i = k;
    const xx = L + (led.d[i] - led.d[0]) / (led.d[led.d.length - 1] - led.d[0]) * (W - L - R);
    const xh = svg.querySelector('.xh'); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.style.display = '';
    const m = box.dataset.m, rows = Object.keys(led.s).filter((t) => G.st.C[t]).map((t) => [t, led.s[t][m][i]]).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
    const tip = box.querySelector('.ledtip');
    tip.innerHTML = `<b>${G.fmtDate(led.d[i])}</b>${rows.map(([t, v]) => `<span><i style="background:${PAL[G.LEDGER_TAGS.includes(t) ? G.LEDGER_TAGS.indexOf(t) : 7]}"></i>${esc(G.cname(t))}<em>${fmt(v)}</em></span>`).join('')}`;
    tip.hidden = false;
    const px = xx / W * r.width;
    tip.style.left = (px > r.width / 2 ? px - tip.offsetWidth - 10 : px + 10) + 'px';
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerdown', onMove);
  document.addEventListener('pointerleave', (e) => { const b = e.target.closest && e.target.closest('.ledchart'); if (b) { b.querySelector('.ledtip').hidden = true; b.querySelector('.xh').style.display = 'none'; } }, true);
})(window);
