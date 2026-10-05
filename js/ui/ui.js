// Arayüz: üst şerit, paneller, eyalet kartı, seçim çubuğu, pencereler, başlangıç ekranı.
(function (g) {
  const G = g.G, R = G.R;
  const { P, NP } = G;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const me = () => G.st.C[G.st.player];
  const r1 = (v) => (Math.round(v * 10) / 10).toLocaleString('tr-TR');
  const int = (v) => Math.round(v).toLocaleString('tr-TR');
  const pct = (v) => '%' + Math.round(v * 100);
  const bar = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;

  const UI = (G.UI = { panel: null, sub: null, tab: { res: 'ind', dip: 'near', train: 'inf' }, cardProv: -1, modalOpen: 0, settings: { autosave: 1 } });

  const DECISIONS = [
    { id: 'civ', n: 'Sanayi Teşviki', d: '+1 sivil fabrika', cost: 150, cd: 120, fx: (c) => G.addFactories(c.tag, 'civ', 1) },
    { id: 'mil', n: 'Silah Sanayii Yatırımı', d: '+1 askerî fabrika', cost: 160, cd: 120, fx: (c) => G.addFactories(c.tag, 'mil', 1) },
    { id: 'arms', n: 'Silah Alımı', d: '+2000 piyade teçhizatı, +80 topçu', cost: 100, cd: 60, fx: (c) => { c.stock.inf += 2000; c.stock.art += 80; } },
    { id: 'planes', n: 'Uçak Satın Al', d: '+80 avcı uçağı', cost: 120, cd: 90, fx: (c) => { c.stock.fig += 80; } },
    { id: 'mob', n: 'Seferberlik Çağrısı', d: '+60 bin insan gücü', cost: 100, cd: 180, fx: (c) => { c.dead -= 60; } },
    { id: 'sci', n: 'Bilim İnsanı Transferi', d: 'Süren araştırmalara +25 gün ilerleme', cost: 150, cd: 180, fx: (c) => { for (const r of c.res) r.p += 25; } },
    { id: 'fort', n: 'Sınır Tahkimatı', d: 'Düşman sınırındaki eyaletlere +1 tahkimat', cost: 120, cd: 180, fx: (c) => { const st = G.st; for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === c.tag && P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c))) pr.fort = Math.min(5, pr.fort + 1); } } },
  ];
  const BRANCH = ['Sanayi', 'Ordu', 'Hava', 'Deniz', 'Siyaset', 'Ulusal'];

  // ---------- Bildirim ----------
  UI.toast = (msg, kind = 'info') => {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast t-' + kind; el.textContent = msg;
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3800);
  };

  // ---------- Üst şerit ----------
  UI.hud = () => {
    const st = G.st, c = me(); if (!c) return;
    const hc = $('hud-country');
    const key = c.tag + c.alive;
    if (hc.dataset.k !== key) { hc.innerHTML = G.flag(c.tag, 30, 20) + `<b>${esc(G.cname(c.tag))}</b>`; hc.dataset.k = key; }
    $('hud-date').textContent = G.fmtDate(st.day);
    $('hud-tension').textContent = `Gerginlik %${Math.round(st.tension)}`;
    const s = c.sum, e = c.econ || {};
    const divs = st.units.reduce((n, u) => n + (u.t === c.tag), 0);
    const chips = [
      ['Siyasi güç', int(c.pp), ''],
      ['İnsan gücü', G.fmtMP(c.mpAvail || 0), (c.mpAvail || 0) < 30 ? 'neg' : ''],
      ['Sivil', s.civ, ''],
      ['Askerî', s.mil, ''],
      ['Tersane', s.dock, ''],
      ['Çelik', `${int(s.steel)}/${int(e.needSteel || 0)}`, (e.rS ?? 1) < 1 ? 'neg' : ''],
      ['Petrol', `${int(s.oil)}/${int(e.needOil || 0)}`, (e.rO ?? 1) < 1 ? 'neg' : ''],
      ['Tümen', divs + (c.train.length ? `+${c.train.length}` : ''), ''],
    ];
    if (c.enemies.length) chips.push(['Savaş', c.enemies.length + ' düşman', 'neg']);
    $('hud-res').innerHTML = chips.map(([k, v, cl]) => `<div class="chip ${cl}"><small>${k}</small><b>${v}</b></div>`).join('');
    const pause = $('btn-pause');
    pause.classList.toggle('paused', !!st.paused);
    document.querySelectorAll('.speed [data-act=speed]').forEach((b) => b.classList.toggle('on', +b.dataset.v === st.speed));
    $('btn-mapmode').title = { pol: 'Siyasi', terrain: 'Arazi', ind: 'Sanayi', fac: 'İttifaklar' }[R.mode];
  };

  // ---------- Panel çerçevesi ----------
  UI.open = (p, sub) => {
    if (UI.panel === p && !sub && !UI.sub) { UI.close(); return; }
    UI.panel = p; UI.sub = sub || null;
    $('card').hidden = true;
    UI.render(true);
  };
  UI.close = () => { UI.panel = null; UI.sub = null; $('sheet').hidden = true; document.querySelectorAll('#nav button').forEach((b) => b.classList.remove('on')); UI.syncOverlays(); };
  UI.render = (reset) => {
    if (!UI.panel) return;
    const sheet = $('sheet'), body = $('sheet-body');
    const scroll = body.scrollTop;
    const tree = body.querySelector('.tree'); const tScroll = tree ? tree.scrollLeft : 0;
    // Dokunma sırasında içerik değiştirilmez; aynı içerik yeniden yazılmaz.
    if (!reset && (performance.now() - UI.lastTouch < 1500)) return;
    const out = PANELS[UI.panel]();
    if (!reset && out.html === UI.lastHtml && !sheet.hidden) return;
    UI.lastHtml = out.html;
    $('sheet-title').textContent = out.title;
    $('sheet-back').hidden = !UI.sub;
    body.innerHTML = out.html;
    sheet.hidden = false;
    if (!reset) { body.scrollTop = scroll; const t2 = body.querySelector('.tree'); if (t2) t2.scrollLeft = tScroll; } else body.scrollTop = 0;
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.p === UI.panel));
    UI.syncOverlays();
  };
  UI.syncOverlays = () => {
    const sheetOpen = !$('sheet').hidden;
    $('selbar').hidden = sheetOpen || !R.sel.units.size;
    if (!$('selbar').hidden) UI.renderSel();
    if (sheetOpen || R.sel.units.size) $('card').hidden = true;
  };

  // ---------- Paneller ----------
  const PANELS = {};
  const sec = (title, inner, aside = '') => `<section class="sec"><h3 class="sec-h">${title}${aside ? `<span>${aside}</span>` : ''}</h3>${inner}</section>`;
  const kv = (pairs) => `<div class="kv">${pairs.map(([k, v, cl]) => `<div><small>${k}</small><b class="${cl || ''}">${v}</b></div>`).join('')}</div>`;

  // Siyaset
  PANELS.pol = () => {
    const st = G.st, c = me(), d = G.def(c.tag);
    if (UI.sub === 'tree') return focusTree(c);
    if (UI.sub && UI.sub.startsWith('law:')) return lawPicker(c, UI.sub.slice(4));
    const id = g.IDEOLOGIES[c.ideo];
    const fac = c.fac ? st.factions[c.fac] : null;
    let html = `<div class="row">${G.flag(c.tag, 54, 36)}<div class="grow"><div style="font-size:20px;font-weight:700">${esc(d.n)}</div><div class="muted small">${esc(d.l)} · <span style="color:${id.c}">${id.n}</span>${fac ? ' · ' + esc(fac.n) : ''}</div></div></div>`;
    html += kv([['Siyasi güç', int(c.pp)], ['Günlük', '+' + r1(2 + (c.mods.pp || 0))], ['Gerginlik', '%' + Math.round(st.tension)], ['Teslim riski', c.enemies.length ? pct(Math.max(0, Math.min(1, c.surrender || 0))) : '—', (c.surrender || 0) > 0.6 ? 'bad' : '']]);
    // odak
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    let fh = cur ? `<div class="item active"><div class="grow"><div class="t">${esc(cur.n)}</div><div class="d">${esc(cur.d)}</div>${bar(c.focus.p / g.FOCUS_DAYS)}<div class="d">${Math.ceil(g.FOCUS_DAYS - c.focus.p)} gün kaldı</div></div></div>` : `<div class="item"><div class="grow"><div class="t warn">Odak seçilmedi</div><div class="d">Her odak ${g.FOCUS_DAYS} günde tamamlanır ve kalıcı bonus verir.</div></div></div>`;
    fh += `<button class="btn pri" data-act="sub" data-v="tree">Odak ağacını aç</button>`;
    html += sec('Ulusal odak', fh, `${Object.keys(c.focus.done).length} tamamlandı`);
    // yasalar
    let lh = '<div class="list">';
    for (const [k, L] of Object.entries(g.LAWS)) {
      const o = L.opts[c.laws[k]];
      lh += `<button class="item" data-act="sub" data-v="law:${k}"><div class="grow"><div class="d">${L.n}</div><div class="t">${o.n}</div><div class="d">${o.d}</div></div><span class="muted">›</span></button>`;
    }
    html += sec('Yasalar', lh + '</div>');
    // kararlar
    c.dec = c.dec || {};
    let dh = '<div class="list">';
    for (const dc of DECISIONS) {
      const ready = (c.dec[dc.id] || 0) <= st.day;
      const can = ready && c.pp >= dc.cost;
      dh += `<div class="item"><div class="grow"><div class="t">${dc.n}</div><div class="d">${dc.d}${ready ? '' : ` · ${c.dec[dc.id] - st.day} gün sonra`}</div></div><button class="btn sm ${can ? 'pri' : ''}" data-act="decide" data-v="${dc.id}" ${can ? '' : 'disabled'}>${dc.cost} SG</button></div>`;
    }
    html += sec('Kararlar', dh + '</div>');
    // otomasyon
    const t = (k, n, d2) => `<button class="toggle ${c.auto[k] ? 'on' : ''}" data-act="auto" data-v="${k}"><span><b>${n}</b><br><span class="muted small">${d2}</span></span><i></i></button>`;
    html += sec('Yardımcı bakanlar', `<div class="list">${t('focus', 'Odak bakanı', 'Sıradaki odağı otomatik seçer')}${t('res', 'Bilim bakanı', 'Boş araştırma yuvalarını doldurur')}${t('prod', 'Sanayi bakanı', 'Üretim hatlarını dengeler')}${t('con', 'Bayındırlık bakanı', 'İnşaat kuyruğunu doldurur')}</div>`);
    return { title: 'Siyaset', html };
  };

  function focusTree(c) {
    const list = G.focusList(c);
    const cols = {};
    for (const f of list) (cols[f.x] || (cols[f.x] = [])).push(f);
    let html = '';
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    html += cur ? `<div class="item active"><div class="grow"><div class="t">${esc(cur.n)}</div>${bar(c.focus.p / g.FOCUS_DAYS)}<div class="d">${Math.ceil(g.FOCUS_DAYS - c.focus.p)} gün kaldı · Yeni odak seçersen ilerleme sıfırlanır.</div></div></div>` : '<p class="muted small" style="margin:0">Uygun bir odağa dokunarak başlat. Okunaklı kartlar şu an seçilebilir.</p>';
    html += '<div class="tree"><div class="tree-grid">';
    for (const x of Object.keys(cols).sort((a, b) => b - a === 0 ? 0 : (a == 5 ? -1 : b == 5 ? 1 : a - b))) {
      html += `<div class="tree-col"><h4>${BRANCH[x]}</h4>`;
      for (const f of cols[x].sort((a, b) => a.y - b.y)) {
        const done = c.focus.done[f.id], active = c.focus.cur === f.id, avail = G.focusAvailable(c, f);
        const cls = done ? 'done' : active ? 'active' : avail ? 'avail' : 'locked';
        const pre = f.pre.length && !done && !avail ? `<span class="d">Önce: ${f.pre.map((p) => esc(G.focusById(c, p)?.n || p)).join(', ')}</span>` : '';
        html += `<button class="fnode ${cls}" data-act="focus" data-v="${f.id}" ${avail ? '' : 'disabled'}><span class="t">${done ? '✓ ' : ''}${esc(f.n)}</span><span class="d">${esc(f.d)}</span>${pre}</button>`;
      }
      html += '</div>';
    }
    html += '</div></div>';
    return { title: 'Ulusal odak ağacı', html };
  }

  function lawPicker(c, k) {
    const L = g.LAWS[k], st = G.st;
    const atWar = c.enemies.length > 0;
    let html = `<p class="muted small" style="margin:0">Yasa değişikliği 100 siyasi güç ister. Bazı seçenekler yalnızca savaşta veya yüksek dünya gerginliğinde açılır.</p><div class="list">`;
    L.opts.forEach((o, i) => {
      const cur = c.laws[k] === i;
      let ok = true, why = '';
      if (o.war === 1 && !(atWar || st.tension >= 50 || c.ideo !== 'dem' || c.mods.ignoreTension)) { ok = false; why = 'Savaş veya %50 gerginlik gerekir'; }
      if (o.war === 2 && !atWar) { ok = false; why = 'Yalnızca savaşta'; }
      if (c.pp < 100) { ok = false; why = why || '100 siyasi güç gerekli'; }
      html += `<div class="item ${cur ? 'active' : ''}"><div class="grow"><div class="t">${o.n}</div><div class="d">${o.d}${why && !cur ? ` · <span class="warn">${why}</span>` : ''}</div></div>${cur ? '<span class="pill ally">Yürürlükte</span>' : `<button class="btn sm ${ok ? 'pri' : ''}" data-act="law" data-k="${k}" data-v="${i}" ${ok ? '' : 'disabled'}>Uygula</button>`}</div>`;
    });
    return { title: L.n, html: html + '</div>' };
  }

  // Araştırma
  PANELS.res = () => {
    const c = me(), m = c.mods;
    let html = '';
    let sh = '<div class="list">';
    for (let i = 0; i < m.slots; i++) {
      const r = c.res[i];
      if (r) {
        const t = g.TECH_BY_ID[r.id], cost = G.techCost(c, r.id);
        const days = Math.ceil((cost - r.p) / (1 + (m.research || 0)));
        sh += `<div class="item active"><div class="grow"><div class="t">${esc(t.n)}</div>${bar(r.p / cost)}<div class="d">${days} gün kaldı</div></div><button class="btn sm" data-act="rescancel" data-v="${r.id}" aria-label="İptal">✕</button></div>`;
      } else sh += `<div class="item"><div class="grow"><div class="t muted">Boş yuva</div><div class="d">Aşağıdan bir teknoloji seç</div></div></div>`;
    }
    html += sec('Araştırma yuvaları', sh + '</div>', `Hız +%${Math.round((m.research || 0) * 100)}`);
    const tab = UI.tab.res;
    html += `<div class="tabs">${Object.entries(g.TECH_CATS).map(([k, n]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-k="res" data-v="${k}">${n}</button>`).join('')}</div>`;
    const yr = G.year(G.st.day);
    let lh = '<div class="list">';
    for (const t of g.TECHS.filter((x) => x.cat === tab).sort((a, b) => a.year - b.year)) {
      const done = c.tech[t.id], active = c.res.some((r) => r.id === t.id), avail = G.techAvailable(c, t.id);
      const cost = G.techCost(c, t.id);
      const ahead = t.year > yr ? ` · <span class="warn">${t.year - yr} yıl erken</span>` : '';
      const cls = done ? 'done' : active ? 'active' : avail ? '' : 'locked';
      const pre = !done && !avail && !active ? `Önce: ${t.pre.map((p) => g.TECH_BY_ID[p].n).join(', ')}` : esc(t.d || fxText(t.fx));
      lh += `<button class="item ${cls}" data-act="research" data-v="${t.id}" ${avail ? '' : 'disabled'}><div class="grow"><div class="t">${done ? '✓ ' : ''}${esc(t.n)} <span class="muted small">${t.year}</span></div><div class="d">${pre}</div><div class="d">${done ? 'Tamamlandı' : active ? 'Araştırılıyor' : `~${Math.ceil(cost / (1 + (m.research || 0)))} gün`}${ahead}</div></div></button>`;
    }
    html += lh + '</div>';
    return { title: 'Araştırma', html };
  };
  function fxText(fx) {
    const N = { factory: 'Fabrika verimi', construct: 'İnşaat hızı', research: 'Araştırma hızı', landAtk: 'Kara saldırısı', landDef: 'Kara savunması', armAtk: 'Zırhlı saldırısı', org: 'Moral', air: 'Hava gücü', navy: 'Deniz gücü', mp: 'İnsan gücü', speed: 'Hız', effCap: 'Verim tavanı', entrench: 'Tahkimat hızı', invasion: 'Çıkarma' };
    return Object.entries(fx).filter(([k]) => N[k]).map(([k, v]) => `${N[k]} +%${Math.round(v * 100)}`).join(', ');
  }

  // Üretim
  PANELS.prod = () => {
    const c = me(), s = c.sum, e = c.econ || {}, m = c.mods;
    let milA = 0, dockA = 0;
    for (const l of c.lines) (g.EQUIP[l.e].fac === 'mil' ? (milA += l.f) : (dockA += l.f));
    let html = kv([
      ['Askerî fab.', `${milA}/${s.mil}`, milA > s.mil ? 'bad' : ''],
      ['Tersane', `${dockA}/${s.dock}`, dockA > s.dock ? 'bad' : ''],
      ['Çelik', `${int(s.steel)} / ${int(e.needSteel || 0)}`, (e.rS ?? 1) < 1 ? 'bad' : 'good'],
      ['Petrol', `${int(s.oil)} / ${int(e.needOil || 0)}`, (e.rO ?? 1) < 1 ? 'bad' : 'good'],
      ['İthalat', `${e.trade || 0} sivil fab.`],
      ['Bombardıman', c.bombed ? '-' + pct(c.bombed) : '—', c.bombed ? 'bad' : ''],
    ]);
    if ((e.rS ?? 1) < 1 || (e.rO ?? 1) < 1) html += `<p class="small warn" style="margin:0">Kaynak açığı üretimi yavaşlatıyor. Çelik/petrol veren toprakları ele geçir, Sentetik Yakıt araştır veya kararlardan yardım al.</p>`;
    const effCap = Math.min(1, 0.6 + (m.effCap || 0));
    const line = (l) => {
      const eq = g.EQUIP[l.e];
      const out = eq.ship ? (l.f * 2.5 * (1 + (m.factory || 0))) : (l.f * 4.5 * l.eff * (1 + (m.factory || 0)) / eq.cost);
      const stock = eq.ship ? `${Math.floor(c.ships[l.e] || 0)} gemi` : `Stok ${int(c.stock[l.e] || 0)}`;
      const rate = eq.ship ? `${l.f ? Math.ceil((eq.cost - (l.acc || 0)) / Math.max(0.1, out)) + ' günde 1 gemi' : 'durdu'}` : `${r1(out)}/gün`;
      return `<div class="item"><div class="grow"><div class="t">${eq.n}</div><div class="d">${stock} · ${rate}${eq.ship ? '' : ` · verim ${pct(l.eff)}/${pct(effCap)}`}</div>${eq.ship ? bar((l.acc || 0) / eq.cost) : bar(l.eff / effCap, 'g')}</div><div class="stepper"><button data-act="line" data-e="${l.e}" data-v="-1" aria-label="Azalt">−</button><b>${l.f}</b><button data-act="line" data-e="${l.e}" data-v="1" aria-label="Artır">+</button></div></div>`;
    };
    const milLines = c.lines.filter((l) => g.EQUIP[l.e].fac === 'mil'), dockLines = c.lines.filter((l) => g.EQUIP[l.e].fac === 'dock');
    const missing = (fac) => Object.entries(g.EQUIP).filter(([k, v]) => v.fac === fac && m.unlockEq[k] && !c.lines.some((l) => l.e === k));
    html += sec('Kara ve hava üretimi', `<div class="list">${milLines.map(line).join('')}</div>${missing('mil').length ? `<div class="btns">${missing('mil').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>` : ''}`, `${s.mil - milA} boşta`);
    html += sec('Tersaneler', `<div class="list">${dockLines.map(line).join('') || '<p class="muted small" style="margin:0">Tersane yok. İnşaat panelinden kıyı eyaletlerine tersane kurabilirsin.</p>'}</div>${s.dock && missing('dock').length ? `<div class="btns">${missing('dock').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>` : ''}`, `${s.dock - dockA} boşta`);
    const ap = G.airPower(c), np = G.navyPower(c);
    html += sec('Hava kuvvetleri', kv([['Avcı', int(c.stock.fig)], ['Yakın destek', int(c.stock.cas)], ['Bombardıman', int(c.stock.bom)], ['Hava gücü', int(ap)], ['Üstünlük', c.enemies.length ? ((c.airMod || 1) >= 1 ? '+' : '') + Math.round(((c.airMod || 1) - 1) * 100) + '%' : '—', (c.airMod || 1) >= 1 ? 'good' : 'bad']]));
    html += sec('Donanma', kv([['Muhrip', int(c.ships.dd)], ['Kruvazör', int(c.ships.cr)], ['Zırhlı', int(c.ships.bb)], ['Denizaltı', int(c.ships.ss)], ['U. gemisi', int(c.ships.cv)], ['Deniz gücü', int(np)]]) + `<p class="muted small" style="margin:0">Deniz gücü çıkarma harekâtlarını mümkün kılar ve düşman ablukasını kırar.</p>`);
    return { title: 'Üretim', html };
  };

  // İnşaat
  PANELS.con = () => {
    const st = G.st, c = me(), e = c.econ || {}, m = c.mods;
    if (UI.sub && UI.sub.startsWith('build:')) return buildPicker(c, UI.sub.slice(6));
    let html = kv([['Sivil fabrika', c.sum.civ], ['Tüketim malları', e.cg || 0], ['İthalat', e.trade || 0], ['İnşaatta', Math.floor(e.civFree || 0), 'good'], ['Hız', '+%' + Math.round((m.construct || 0) * 100)]]);
    let civ = e.civFree || 0;
    let qh = '<div class="list">';
    c.constr.forEach((q, i) => {
      const b = g.BUILDINGS[q.b]; const n = Math.min(15, Math.max(0, civ)); civ -= n;
      const rate = n * 5 * (1 + (m.construct || 0));
      qh += `<div class="item"><div class="grow"><div class="t">${b.n}</div><div class="d">${esc(G.pname(q.p))} · ${Math.floor(n)} fabrika · ${rate > 0 ? Math.ceil((b.cost - q.prog) / rate) + ' gün' : 'beklemede'}</div>${bar(q.prog / b.cost)}</div><div class="btns">${i ? `<button class="btn sm" data-act="cup" data-v="${i}" aria-label="Öne al">▲</button>` : ''}<button class="btn sm" data-act="cdel" data-v="${i}" aria-label="Kaldır">✕</button></div></div>`;
    });
    if (!c.constr.length) qh += '<p class="muted small" style="margin:0">Kuyruk boş. Sivil fabrikalar boşta bekliyor.</p>';
    html += sec('İnşaat kuyruğu', qh + '</div>', `${c.constr.length} proje`);
    html += sec('Yeni proje', `<div class="list">${Object.entries(g.BUILDINGS).map(([k, b]) => `<button class="item" data-act="sub" data-v="build:${k}"><div class="grow"><div class="t">${b.n}</div><div class="d">${int(b.cost)} inşaat puanı${k === 'fort' ? ' · eyalet savunması +%15/kademe' : k === 'dock' ? ' · yalnızca kıyı' : ''}</div></div><span class="muted">›</span></button>`).join('')}</div>`);
    return { title: 'İnşaat', html };
  };
  function buildPicker(c, type) {
    const st = G.st, b = g.BUILDINGS[type];
    const rows = [];
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag) continue;
      if (type !== 'fort' && pr.o !== c.tag) continue;
      if (b.coastal && !P[i].c) continue;
      const queued = c.constr.filter((q) => q.p === i && (type === 'fort' ? q.b === 'fort' : q.b !== 'fort')).length;
      const free = type === 'fort' ? 5 - pr.fort - queued : G.freeSlots(i) - queued;
      if (free <= 0) continue;
      const border = P[i].a.some((j) => st.prov[j].c !== c.tag);
      const score = type === 'fort' ? (P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) ? 100 : 0) + (border ? 50 : 0) + P[i].vp : free * 3 + P[i].vp;
      rows.push({ i, free, score, border });
    }
    rows.sort((a, b2) => b2.score - a.score);
    let html = `<p class="muted small" style="margin:0">${b.n} için eyalet seç. ${type === 'fort' ? 'Sınır ve cephe eyaletleri üstte.' : 'En çok boş yuvası olan eyaletler üstte.'}</p><div class="list">`;
    for (const r of rows.slice(0, 40)) {
      const pr = st.prov[r.i];
      html += `<button class="item" data-act="build" data-b="${type}" data-v="${r.i}"><div class="grow"><div class="t">${esc(G.pname(r.i))}</div><div class="d">${type === 'fort' ? `Tahkimat ${pr.fort}/5${r.border ? ' · sınır' : ''}` : `Boş yuva ${r.free} · S${pr.civ} A${pr.mil} T${pr.dock}`}</div></div><span class="btn sm pri">Ekle</span></button>`;
    }
    if (!rows.length) html += '<p class="muted">Uygun eyalet yok.</p>';
    return { title: b.n, html: html + '</div>' };
  }

  // Ordu
  PANELS.army = () => {
    const st = G.st, c = me();
    const mine = st.units.filter((u) => u.t === c.tag);
    const mp = G.manpower(c);
    let html = kv([['İnsan gücü', G.fmtMP(mp.avail), mp.avail < 30 ? 'bad' : ''], ['Toplam', G.fmtMP(mp.max)], ['Tümen', mine.length], ['Eğitimde', c.train.length], ['Piyade T.', int(c.stock.inf)], ['Topçu', int(c.stock.art)], ['Tank', int(c.stock.tank)], ['Motorlu', int(c.stock.mot)]]);
    // eğitim
    let th = '<div class="list">';
    for (const [k, u] of Object.entries(g.UNITS)) {
      if (!c.mods.unlock[k]) continue;
      const eq = Object.entries(u.eq).map(([e, n]) => `${n} ${g.EQUIP[e].s.toLowerCase()}`).join(', ');
      const ok = mp.avail >= u.mp;
      th += `<div class="item"><div class="grow"><div class="t">${u.n}</div><div class="d">${u.mp}K asker · ${u.days} gün · ${eq}</div><div class="d">Saldırı ${u.atk} · Savunma ${u.def} · Hız ${u.spd}${u.arm ? ' · Zırh ' + u.arm : ''}</div></div><div class="btns"><button class="btn sm ${ok ? 'pri' : ''}" data-act="train" data-v="${k}" data-n="1" ${ok ? '' : 'disabled'}>+1</button><button class="btn sm" data-act="train" data-v="${k}" data-n="5" ${mp.avail >= u.mp * 5 ? '' : 'disabled'}>+5</button></div></div>`;
    }
    html += sec('Tümen eğit', th + '</div>', 'Tümenler başkentte konuşlanır');
    if (c.train.length) {
      let qh = '<div class="list">';
      c.train.forEach((t, i) => {
        const u = g.UNITS[t.u];
        let ratio = 1; for (const [e, n] of Object.entries(u.eq)) ratio = Math.min(ratio, (c.stock[e] || 0) / n);
        qh += `<div class="item"><div class="grow"><div class="t">${u.n}</div><div class="d">${t.d > 0 ? t.d + ' gün kaldı' : ratio < 0.25 ? '<span class="warn">Teçhizat bekleniyor</span>' : 'Konuşlanıyor'}</div>${bar(1 - t.d / u.days)}</div><button class="btn sm" data-act="tdel" data-v="${i}" aria-label="İptal">✕</button></div>`;
      });
      html += sec('Eğitim kuyruğu', qh + '</div>');
    }
    // komuta
    const autoN = mine.filter((u) => u.auto).length;
    html += sec('Komuta', `<button class="toggle ${autoN === mine.length && mine.length ? 'on' : ''}" data-act="allauto"><span><b>Otomatik kurmay</b><br><span class="muted small">${autoN}/${mine.length} tümen yapay zekâ komutasında: cepheleri tutar, fırsat bulunca saldırır.</span></span><i></i></button>`);
    // ordular
    const groups = new Map();
    for (const u of mine) { const k = u.loc; let gl = groups.get(k); if (!gl) groups.set(k, (gl = [])); gl.push(u); }
    const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    let gh = '<div class="list">';
    for (const [loc, gl] of rows.slice(0, 60)) {
      const types = {}; for (const u of gl) types[u.u] = (types[u.u] || 0) + 1;
      const str = gl.reduce((s, u) => s + u.str, 0) / gl.length;
      const org = gl.reduce((s, u) => s + u.org / (G.unitStats(u).org), 0) / gl.length;
      const moving = gl.filter((u) => u.path.length).length;
      const battle = (G.battles || []).some((b) => b.n === loc || gl.some((u) => u.path[0] === b.n));
      const name = loc < NP ? G.pname(loc) : 'Denizde';
      gh += `<button class="item" data-act="selgroup" data-v="${loc}"><div class="grow"><div class="t">${esc(name)} ${battle ? '<span class="pill war">Muharebe</span>' : ''}</div><div class="d">${Object.entries(types).map(([k, n]) => `${n} ${g.UNITS[k].s}`).join(' · ')}${moving ? ` · ${moving} hareket hâlinde` : ''}</div><div class="row" style="gap:6px"><div class="grow">${bar(str, 'g')}</div><div class="grow">${bar(org)}</div></div></div><span class="muted">›</span></button>`;
    }
    html += sec('Ordular', gh + '</div>', `${rows.length} konum · yeşil güç, sarı moral`);
    return { title: 'Ordu', html };
  };

  // Diplomasi
  PANELS.dip = () => {
    const st = G.st, c = me();
    if (UI.sub && UI.sub.startsWith('c:')) return countryView(UI.sub.slice(2));
    let html = '';
    const fac = c.fac ? st.factions[c.fac] : null;
    if (fac) {
      html += sec('İttifak', `<div class="item"><div class="grow"><div class="t">${esc(fac.n)}</div><div class="d">Lider: ${esc(G.cname(fac.leader))}</div><div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${fac.members.filter((t) => st.C[t].alive).map((t) => `<span title="${esc(G.cname(t))}">${G.flag(t, 24, 16)}</span>`).join('')}</div></div></div>`);
    } else {
      const can = c.major || c.mods.canFaction;
      html += sec('İttifak', `<p class="muted small" style="margin:0">Bir ittifakta değilsin. ${can ? 'Kendi ittifakını kurabilir ya da bir ülkenin sayfasından katılma isteyebilirsin.' : 'Büyük güçlerin ittifaklarına katılma isteyebilirsin. Kendi ittifakın için “İttifak Arayışı” odağı gerekir.'}</p>${can ? `<button class="btn pri" data-act="mkfac">İttifak kur</button>` : ''}`);
    }
    const tabs = { war: 'Savaşta', near: 'Komşular', major: 'Büyük güçler', all: 'Tümü' };
    html += `<div class="tabs">${Object.entries(tabs).map(([k, n]) => `<button class="${UI.tab.dip === k ? 'on' : ''}" data-act="tab" data-k="dip" data-v="${k}">${n}</button>`).join('')}</div>`;
    const neigh = new Set();
    for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag) for (const j of P[i].a) neigh.add(st.prov[j].c);
    neigh.delete(c.tag);
    let list = Object.values(st.C).filter((x) => x.alive && x.tag !== c.tag);
    const t = UI.tab.dip;
    if (t === 'war') list = list.filter((x) => G.atWar(c.tag, x.tag));
    if (t === 'near') list = list.filter((x) => neigh.has(x.tag));
    if (t === 'major') list = list.filter((x) => x.major);
    list.sort((a, b) => (b.sum.mil + b.sum.civ) - (a.sum.mil + a.sum.civ));
    let lh = '<div class="list">';
    for (const x of list) lh += `<button class="item" data-act="sub" data-v="c:${x.tag}">${G.flag(x.tag, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(x.tag))}</div><div class="d">${g.IDEOLOGIES[x.ideo].n}${x.fac ? ' · ' + esc(st.factions[x.fac]?.n || '') : ''}</div></div>${relPills(c.tag, x.tag)}<span class="muted">›</span></button>`;
    if (!list.length) lh += `<p class="muted small" style="margin:0">${t === 'war' ? 'Şu an kimseyle savaşta değilsin.' : 'Liste boş.'}</p>`;
    html += lh + '</div>';
    return { title: 'Diplomasi', html: kv([['Dünya gerginliği', '%' + Math.round(st.tension)], ['Savaşlar', c.enemies.length], ['Gerekçe', c.just ? `${G.cname(c.just.t)} (${c.just.d} gün)` : '—']]) + html };
  };
  function relPills(a, b) {
    const st = G.st; const out = [];
    if (G.atWar(a, b)) out.push('<span class="pill war">Savaş</span>');
    else if (G.sameFaction(a, b)) out.push('<span class="pill ally">Müttefik</span>');
    if (st.pacts[G.pairKey(a, b)]) out.push('<span class="pill pact">Pakt</span>');
    if (st.goals[a + '>' + b] != null) out.push('<span class="pill goal">Gerekçe</span>');
    if (st.access[a + '>' + b]) out.push('<span class="pill pact">Geçiş</span>');
    return out.join(' ');
  }
  function countryView(tag) {
    const st = G.st, c = me(), x = st.C[tag], d = G.def(tag);
    const divs = st.units.filter((u) => u.t === tag).length;
    let html = `<div class="row">${G.flag(tag, 54, 36)}<div class="grow"><div style="font-size:20px;font-weight:700">${esc(d.n)}</div><div class="muted small">${esc(d.l)} · <span style="color:${g.IDEOLOGIES[x.ideo].c}">${g.IDEOLOGIES[x.ideo].n}</span>${x.fac ? ' · ' + esc(st.factions[x.fac]?.n || '') : ''}</div><div style="margin-top:4px">${relPills(c.tag, tag)}</div></div></div>`;
    const ratio = G.armyPower(tag) / (G.armyPower(c.tag) + 1);
    html += kv([['Tümen', divs], ['Sivil fab.', x.sum.civ], ['Askerî fab.', x.sum.mil], ['Eyalet', x.sum.provs], ['Ordu gücü', ratio > 1.3 ? 'Bizden güçlü' : ratio < 0.7 ? 'Bizden zayıf' : 'Denk', ratio > 1.3 ? 'bad' : ratio < 0.7 ? 'good' : ''], ['Görüş', G.opinion(tag, c.tag) > 20 ? 'Dostane' : G.opinion(tag, c.tag) < -20 ? 'Düşmanca' : 'Nötr']]);
    if (x.enemies.length) html += `<p class="small" style="margin:0">Savaşta: ${x.enemies.map((t) => esc(G.cname(t))).join(', ')}</p>`;
    const acts = [];
    const atWar = G.atWar(c.tag, tag);
    if (!atWar) {
      const j = G.canJustify(c.tag, tag);
      if (st.goals[c.tag + '>' + tag] == null) acts.push(['justify', `Savaş gerekçesi üret (${G.justifyCost(c)} SG, ${G.justifyDays(c)} gün)`, j.ok, j.why]);
      acts.push(['declare', 'Savaş ilan et', G.canDeclare(c.tag, tag), 'Önce savaş gerekçesi gerekir (müttefikinin düşmanına doğrudan ilan edebilirsin).']);
      const myFac = c.fac ? st.factions[c.fac] : null;
      if (myFac && !G.sameFaction(c.tag, tag)) acts.push(['invite', `${myFac.n} ittifakına davet et`, true]);
      if (x.fac && !G.sameFaction(c.tag, tag)) acts.push(['joinfac', `${st.factions[x.fac].n} ittifakına katılmak iste`, !c.fac || st.factions[c.fac].leader !== c.tag, 'Kendi ittifakının lideriysen başka ittifaka katılamazsın.']);
      if (!st.access[c.tag + '>' + tag] && !G.sameFaction(c.tag, tag)) acts.push(['access', 'Askerî geçiş izni iste', true]);
      if (!st.pacts[G.pairKey(c.tag, tag)]) acts.push(['pact', 'Saldırmazlık paktı öner', true]);
      if (!(st.guar[c.tag] || []).includes(tag)) acts.push(['guar', 'Bağımsızlık garantisi ver', true]);
    } else acts.push(['peace', 'Beyaz barış teklif et', true]);
    let ah = '<div class="list">';
    for (const [k, n, ok, why] of acts) ah += `<button class="item" data-act="dip" data-k="${k}" data-v="${tag}" ${ok ? '' : 'disabled'} style="${ok ? '' : 'opacity:.5'}"><div class="grow"><div class="t">${n}</div>${!ok && why ? `<div class="d warn">${esc(why)}</div>` : ''}</div><span class="muted">›</span></button>`;
    ah += `<button class="item" data-act="showc" data-v="${tag}"><div class="grow"><div class="t">Haritada göster</div></div><span class="muted">›</span></button></div>`;
    html += sec('Eylemler', ah);
    return { title: d.n, html };
  }

  // Menü
  PANELS.menu = () => {
    const st = G.st;
    if (UI.sub === 'log') return { title: 'Olay günlüğü', html: `<div class="list">${st.log.slice(0, 80).map((l) => `<div class="item"><div class="grow"><div class="d">${G.fmtDate(l.d)}</div><div class="t" style="font-weight:500">${esc(l.m)}</div></div></div>`).join('')}</div>` };
    if (UI.sub === 'help') return { title: 'Nasıl oynanır', html: HELP };
    if (UI.sub === 'new') return { title: 'Yeni oyun', html: `<p style="margin:0">Mevcut oyun kaydedilmediyse kaybolur. Otomatik kayıt yine de saklanır.</p><div class="btns"><button class="btn danger" data-act="newgame">Yeni oyuna başla</button><button class="btn" data-act="back">Vazgeç</button></div>` };
    let html = '';
    let sh = '<div class="list">';
    for (const slot of ['1', '2', '3', 'auto']) {
      const meta = G.saveMeta(slot);
      sh += `<div class="item"><div class="grow"><div class="t">${slot === 'auto' ? 'Otomatik kayıt' : 'Yuva ' + slot}</div><div class="d">${meta ? `${esc(G.cname(meta.player))} · ${G.fmtDate(meta.day)}` : 'Boş'}</div></div><div class="btns">${slot !== 'auto' ? `<button class="btn sm pri" data-act="save" data-v="${slot}">Kaydet</button>` : ''}<button class="btn sm" data-act="load" data-v="${slot}" ${meta ? '' : 'disabled'}>Yükle</button></div></div>`;
    }
    html += sec('Kayıt', sh + '</div>', 'Bu cihazda saklanır');
    const modes = { pol: 'Siyasi', terrain: 'Arazi', ind: 'Sanayi', fac: 'İttifaklar' };
    html += sec('Harita modu', `<div class="seg">${Object.entries(modes).map(([k, n]) => `<button class="${R.mode === k ? 'on' : ''}" data-act="setmode" data-v="${k}">${n}</button>`).join('')}</div>`);
    html += sec('Ayarlar', `<div class="list"><button class="toggle ${UI.settings.autosave ? 'on' : ''}" data-act="setting" data-v="autosave"><span><b>Aylık otomatik kayıt</b></span><i></i></button><button class="toggle ${st.opts.hist ? 'on' : ''}" data-act="setting" data-v="hist"><span><b>Tarihî yapay zekâ</b><br><span class="muted small">Kapalıysa ülkeler tarihi olayları izlemez, kendi hedeflerini kovalar.</span></span><i></i></button></div>`);
    html += sec('Oyun', `<div class="list"><button class="item" data-act="sub" data-v="log"><div class="grow"><div class="t">Olay günlüğü</div></div><span class="muted">›</span></button><button class="item" data-act="sub" data-v="help"><div class="grow"><div class="t">Nasıl oynanır</div></div><span class="muted">›</span></button><button class="item" data-act="sub" data-v="new"><div class="grow"><div class="t">Yeni oyun</div></div><span class="muted">›</span></button></div>`);
    return { title: 'Menü', html };
  };

  const HELP = `<div class="sec"><p style="margin:0">Amaç: 1 Ocak 1936'dan itibaren ülkeni büyük bir savaşa hazırla, ittifaklar kur ve zafer puanı taşıyan şehirleri ele geçir.</p></div>
  <section class="sec"><h3 class="sec-h">Harita</h3><p class="small" style="margin:0">Tek parmakla kaydır, iki parmakla yakınlaştır. Bir eyalete dokununca bilgi kartı açılır. Sağdaki düğmeler harita modunu değiştirir, alan seçimini açar ve başkente döner.</p></section>
  <section class="sec"><h3 class="sec-h">Birlikler</h3><p class="small" style="margin:0">Kendi tümenlerinin bulunduğu eyalete (veya sayaca) dokun: tümenler seçilir. Sonra hedef eyalete dokun: en kısa yol bulunur. Deniz aşırı hedeflerde birlikler gemiyle taşınır; düşman kıyısına çıkarma için yeterli deniz gücü gerekir. Düşman birliği olan eyalete yürümek saldırı başlatır. Muharebe simgesindeki renk üstünlüğü gösterir.</p></section>
  <section class="sec"><h3 class="sec-h">Muharebe</h3><p class="small" style="margin:0">Saldırı gücü, savunma, moral (sarı çizgi) ve güç (yeşil çizgi) belirleyicidir. Dağ, orman, bataklık ve şehirler saldırana ceza verir; tahkimat ve siper savunmayı güçlendirir. Moral biten savunucu geri çekilir; geri çekilecek yeri yoksa kuşatılıp yok olur. Kendi topraklarından uzaklaştıkça ikmal azalır.</p></section>
  <section class="sec"><h3 class="sec-h">Ekonomi</h3><p class="small" style="margin:0">Sivil fabrikalar inşaat yapar ve kaynak ithal eder. Askerî fabrikalar teçhizat, tersaneler gemi üretir. Çelik ve petrol eksikliği üretimi düşürür. Yasalar daha fazla asker ve fabrika verir ama savaş veya gerginlik gerektirebilir.</p></section>
  <section class="sec"><h3 class="sec-h">Diplomasi</h3><p class="small" style="margin:0">Savaş ilan etmek için önce savaş gerekçesi üret. Demokrasiler yüksek dünya gerginliği olmadan gerekçe üretemez. İttifak üyeleri saldırıya uğrayan müttefiklerini savunur. Bir ülke topraklarının büyük kısmını kaybedince teslim olur.</p></section>
  <section class="sec"><h3 class="sec-h">İpucu</h3><p class="small" style="margin:0">Telefonda yüzlerce tümeni tek tek yönetmek zorunda değilsin: Ordu panelindeki “Otomatik kurmay” ya da seçim çubuğundaki “Oto” ile tümenleri yapay zekâ komutanına bırakabilirsin. Siyaset panelindeki bakanlar da ekonomiyi senin yerine yönetebilir.</p></section>`;

  // ---------- Eyalet kartı ----------
  UI.showCard = (i) => {
    const st = G.st, c = me();
    UI.cardProv = i;
    if (i < 0) { $('card').hidden = true; return; }
    const pr = st.prov[i], p = P[i];
    const te = g.TERRAIN[p.te];
    const occ = pr.o !== pr.c;
    const units = (G.unitsAt[i] || []);
    const byTag = {}; for (const u of units) byTag[u.t] = (byTag[u.t] || 0) + 1;
    const battle = (G.battles || []).find((b) => b.n === i);
    let html = `<div class="card-h">${G.flag(pr.c, 36, 24)}<div class="grow"><h3>${esc(G.pname(i))}</h3><div class="muted small">${esc(G.cname(pr.c))}${occ ? ` · işgal altında (sahibi ${esc(G.cname(pr.o))})` : ''}</div></div><button class="x" data-act="closecard" aria-label="Kapat">✕</button></div>`;
    html += `<div class="facts"><span>Arazi <b>${te.n}</b></span><span>Zafer puanı <b>${p.vp}</b></span><span>Fabrika <b>S${pr.civ} A${pr.mil} T${pr.dock}</b></span><span>Tahkimat <b>${pr.fort}/5</b></span><span>Nüfus <b>${r1(pr.pop)} M</b></span>${p.st ? `<span>Çelik <b>${p.st}</b></span>` : ''}${p.oil ? `<span>Petrol <b>${p.oil}</b></span>` : ''}${p.c ? '<span><b>Kıyı</b></span>' : ''}</div>`;
    if (units.length) html += `<div class="facts">${Object.entries(byTag).map(([t, n]) => `<span>${G.flag(t, 18, 12)} <b>${n}</b> tümen</span>`).join('')}</div>`;
    if (battle) html += `<div class="small"><span class="pill war">Muharebe</span> ${esc(G.cname(battle.att))} saldırıyor · üstünlük ${pct(battle.adv)}</div>`;
    const btns = [];
    if (byTag[c.tag]) btns.push(`<button class="btn pri" data-act="selprov" data-v="${i}">Birlikleri seç (${byTag[c.tag]})</button>`);
    if (pr.c === c.tag && pr.o === c.tag) btns.push(`<button class="btn" data-act="quickbuild" data-v="${i}">İnşa et</button>`);
    if (pr.c !== c.tag) btns.push(`<button class="btn" data-act="opencountry" data-v="${pr.c}">${esc(G.cname(pr.c))}</button>`);
    if (btns.length) html += `<div class="btns">${btns.join('')}</div>`;
    const card = $('card');
    if (card.dataset.h !== html) { card.innerHTML = html; card.dataset.h = html; }
    card.hidden = !$('sheet').hidden || R.sel.units.size > 0;
  };

  // ---------- Seçim çubuğu ----------
  UI.renderSel = () => {
    const st = G.st;
    const sel = st.units.filter((u) => R.sel.units.has(u.id));
    if (!sel.length) { R.sel.units.clear(); $('selbar').hidden = true; return; }
    const auto = sel.every((u) => u.auto);
    const locs = new Set(sel.map((u) => u.loc));
    const where = locs.size === 1 ? ([...locs][0] < NP ? G.pname([...locs][0]) : 'Denizde') : `${locs.size} konum`;
    let html = `<div class="card-h"><div class="grow"><h3>${sel.length} tümen seçili</h3><div class="muted small">${esc(where)}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>`;
    html += `<div class="units">${sel.slice(0, 40).map((u) => { const s = G.unitStats(u); return `<button class="ubox on" data-act="unsel" data-v="${u.id}"><b>${g.UNITS[u.u].s}</b>${bar(u.str, 'g')}${bar(u.org / s.org)}</button>`; }).join('')}</div>`;
    html += `<div class="hint">${auto ? 'Bu tümenler otomatik kurmayda. Elle yönetmek için Oto’yu kapat.' : 'Hedef eyalete dokun. Düşman eyaleti saldırı başlatır.'}</div>`;
    html += `<div class="btns"><button class="btn sm" data-act="stop">Dur</button><button class="btn sm" data-act="split">Böl</button><button class="btn sm ${auto ? 'pri' : ''}" data-act="selauto">Oto ${auto ? 'açık' : 'kapalı'}</button><button class="btn sm" data-act="selall">Bölgedekilerin tümü</button></div>`;
    const sb = $('selbar');
    if (sb.dataset.h !== html) { sb.innerHTML = html; sb.dataset.h = html; }
    sb.hidden = !$('sheet').hidden;
  };

  // ---------- Pencere ----------
  UI.lastTouch = 0;
  for (const id of ['sheet', 'selbar', 'card']) $(id).addEventListener('pointerdown', () => { UI.lastTouch = performance.now(); }, true);
  UI.showModal = (p) => {
    const m = $('modal');
    if (!UI.modalOpen && !UI.chaining) UI.modalWasRunning = !G.st.paused;
    UI.modalOpen = 1;
    G.st.paused = 1;
    const opts = p.opts || [{ n: 'Tamam', fx: () => {} }];
    m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><p class="eyebrow">${p.eyebrow || G.fmtDate(G.st.day)}</p><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><div class="btns">${opts.map((o, i) => `<button class="btn ${i === 0 ? 'pri' : ''}" data-act="modalopt" data-v="${i}">${esc(o.n)}</button>`).join('')}</div></div>`;
    m.hidden = false;
    UI.modalOpts = opts;
  };
  UI.closeModal = () => {
    $('modal').hidden = true; UI.modalOpen = 0;
    if (G.popupQueue.length) { UI.chaining = 1; UI.showModal(G.popupQueue.shift()); UI.chaining = 0; return; }
    if (UI.modalWasRunning) G.st.paused = 0;
    UI.hud();
  };
  G.onPopup = () => { if (!UI.modalOpen && G.popupQueue.length && G.st.player) UI.showModal(G.popupQueue.shift()); };

  // ---------- Eylemler ----------
  const ACT = {};
  UI.act = (a, ds, el) => { const fn = ACT[a]; if (fn) { fn(ds, el); } };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    UI.act(b.dataset.act, b.dataset, b);
  });
  ACT.panel = (d) => UI.open(d.p);
  ACT.close = () => UI.close();
  ACT.back = () => { if (UI.sub) { UI.sub = null; UI.render(true); } else UI.close(); };
  ACT.sub = (d) => { UI.sub = d.v; UI.render(true); };
  ACT.tab = (d) => { UI.tab[d.k] = d.v; UI.render(); };
  ACT.pause = () => { G.st.paused = !G.st.paused; UI.hud(); };
  ACT.speed = (d) => { G.st.speed = +d.v; G.st.paused = 0; UI.hud(); };
  ACT.focus = (d) => { const c = me(); if (c.focus.cur && c.focus.cur !== d.v && c.focus.p > 5) UI.toast('Önceki odağın ilerlemesi sıfırlandı.', 'warn'); c.focus.cur = d.v; c.focus.p = 0; UI.render(); UI.toast('Odak başladı: ' + G.focusById(c, d.v).n, 'good'); };
  ACT.law = (d) => { const c = me(); if (c.pp < 100) return; c.pp -= 100; c.laws[d.k] = +d.v; G.recomputeMods(c); UI.sub = null; UI.render(true); UI.toast('Yasa değişti: ' + g.LAWS[d.k].opts[+d.v].n, 'good'); };
  ACT.decide = (d) => { const c = me(), dc = DECISIONS.find((x) => x.id === d.v); if (c.pp < dc.cost) return; c.pp -= dc.cost; c.dec = c.dec || {}; c.dec[dc.id] = G.st.day + dc.cd; dc.fx(c); G.needSummary = 1; G.updateSummaries(); UI.render(); UI.toast(dc.n + ' uygulandı.', 'good'); };
  ACT.auto = (d) => { const c = me(); c.auto[d.v] = c.auto[d.v] ? 0 : 1; UI.render(); };
  ACT.research = (d) => { const c = me(); if (c.res.length >= c.mods.slots) { UI.toast('Boş araştırma yuvası yok. Önce birini iptal et.', 'warn'); return; } c.res.push({ id: d.v, p: 0 }); UI.render(); };
  ACT.rescancel = (d) => { const c = me(); c.res = c.res.filter((r) => r.id !== d.v); UI.render(); };
  ACT.line = (d) => {
    const c = me(); const l = c.lines.find((x) => x.e === d.e); if (!l) return;
    const fac = g.EQUIP[d.e].fac; const total = fac === 'mil' ? c.sum.mil : c.sum.dock;
    const used = c.lines.filter((x) => g.EQUIP[x.e].fac === fac).reduce((s, x) => s + x.f, 0);
    const v = +d.v;
    if (v > 0 && used >= total) { UI.toast('Boşta fabrika yok. Başka bir hattan azalt.', 'warn'); return; }
    l.f = Math.max(0, l.f + v);
    if (v > 0) l.eff = Math.max(0.1, l.eff * 0.95);
    UI.render();
  };
  ACT.addline = (d) => { const c = me(); c.lines.push({ e: d.v, f: 0, eff: 0.3, acc: 0 }); UI.render(); };
  ACT.cup = (d) => { const c = me(); const i = +d.v; [c.constr[i - 1], c.constr[i]] = [c.constr[i], c.constr[i - 1]]; UI.render(); };
  ACT.cdel = (d) => { const c = me(); c.constr.splice(+d.v, 1); UI.render(); };
  ACT.build = (d) => { const c = me(); c.constr.push({ b: d.b, p: +d.v, prog: 0 }); UI.toast(`${g.BUILDINGS[d.b].n} kuyruğa eklendi: ${G.pname(+d.v)}`, 'good'); UI.render(); };
  ACT.quickbuild = (d) => { UI.panel = 'con'; UI.sub = null; UI.render(true); };
  ACT.train = (d) => { const c = me(); for (let k = 0; k < +d.n; k++) { if (G.manpower(c, true).avail < g.UNITS[d.v].mp) break; c.train.push({ u: d.v, d: g.UNITS[d.v].days, auto: 0 }); } UI.render(); UI.hud(); };
  ACT.tdel = (d) => { me().train.splice(+d.v, 1); UI.render(); };
  ACT.allauto = () => { const st = G.st; const mine = st.units.filter((u) => u.t === st.player); const on = !mine.every((u) => u.auto); for (const u of mine) { u.auto = on ? 1 : 0; if (!on) { /* elle */ } } UI.render(); UI.toast(on ? 'Tüm tümenler otomatik kurmaya devredildi.' : 'Tümenler senin komutanda.', 'info'); };
  ACT.selgroup = (d) => { const st = G.st; const loc = +d.v; R.sel.units = new Set(st.units.filter((u) => u.t === st.player && u.loc === loc).map((u) => u.id)); R.focusOn(loc, 2.2); UI.close(); UI.renderSel(); R.dirty = 1; };
  ACT.selprov = (d) => ACT.selgroup(d);
  ACT.closecard = () => { $('card').hidden = true; R.sel.prov = -1; R.dirty = 1; };
  ACT.opencountry = (d) => { UI.panel = 'dip'; UI.sub = 'c:' + d.v; UI.render(true); };
  ACT.showc = (d) => { const c = G.st.C[d.v]; if (c.cap >= 0) R.focusOn(c.cap, 1.5); UI.close(); };
  ACT.clearsel = () => { R.sel.units.clear(); $('selbar').hidden = true; R.dirty = 1; };
  ACT.unsel = (d) => { R.sel.units.delete(+d.v); UI.renderSel(); R.dirty = 1; };
  ACT.stop = () => { for (const u of G.st.units) if (R.sel.units.has(u.id)) { u.path = []; u.prog = 0; } R.dirty = 1; UI.toast('Tümenler durduruldu.'); };
  ACT.split = () => { const ids = [...R.sel.units]; const keep = ids.slice(0, Math.ceil(ids.length / 2)); R.sel.units = new Set(keep); UI.renderSel(); R.dirty = 1; };
  ACT.selauto = () => { const sel = G.st.units.filter((u) => R.sel.units.has(u.id)); const on = !sel.every((u) => u.auto); for (const u of sel) { u.auto = on ? 1 : 0; if (on) u.path = []; } UI.renderSel(); };
  ACT.selall = () => { const st = G.st; const locs = new Set(st.units.filter((u) => R.sel.units.has(u.id)).map((u) => u.loc)); for (const u of st.units) if (u.t === st.player && locs.has(u.loc)) R.sel.units.add(u.id); UI.renderSel(); R.dirty = 1; };
  ACT.modalopt = (d) => { const o = UI.modalOpts[+d.v]; try { o.fx && o.fx(); } catch (e) { console.error(e); } UI.closeModal(); G.mapDirty = 1; R.dirty = 1; };
  ACT.mkfac = () => { const c = me(); G.createFaction(c.tag, `${G.cname(c.tag)} Paktı`); UI.render(); };
  ACT.dip = (d) => {
    const st = G.st, c = me(), t = d.v;
    let ok;
    switch (d.k) {
      case 'justify': { const r = G.startJustify(c.tag, t); UI.toast(r.ok ? `${G.cname(t)} için savaş gerekçesi hazırlanıyor.` : r.why, r.ok ? 'good' : 'warn'); break; }
      case 'declare': ok = G.declareWar(c.tag, t); if (ok) UI.toast(`${G.cname(t)} ile savaştayız!`, 'bad'); break;
      case 'invite': ok = G.inviteToFaction(c.tag, t); UI.toast(ok ? `${G.cname(t)} ittifaka katıldı.` : `${G.cname(t)} daveti reddetti.`, ok ? 'good' : 'warn'); break;
      case 'joinfac': ok = G.askJoinFaction(c.tag, st.C[t].fac); UI.toast(ok ? 'İttifaka kabul edildik.' : 'Katılma isteği reddedildi.', ok ? 'good' : 'warn'); break;
      case 'access': ok = G.requestAccess(c.tag, t); UI.toast(ok ? 'Askerî geçiş izni alındı.' : 'Geçiş izni reddedildi.', ok ? 'good' : 'warn'); break;
      case 'pact': ok = G.proposePact(c.tag, t); UI.toast(ok ? 'Saldırmazlık paktı imzalandı.' : 'Pakt teklifi reddedildi.', ok ? 'good' : 'warn'); break;
      case 'guar': G.guarantee(c.tag, t); UI.toast(`${G.cname(t)} artık güvencemizde.`, 'good'); break;
      case 'peace': ok = G.whitePeace(c.tag, t); UI.toast(ok ? 'Barış imzalandı.' : 'Barış teklifi reddedildi. Önce savaşta üstünlük kur.', ok ? 'good' : 'warn'); break;
    }
    G.mapDirty = 1; R.dirty = 1; UI.render(); UI.hud();
  };
  ACT.save = (d) => { const ok = G.saveGame(d.v); UI.toast(ok ? 'Oyun kaydedildi.' : 'Kayıt başarısız: tarayıcı depolaması kullanılamıyor.', ok ? 'good' : 'bad'); UI.render(); };
  ACT.load = (d) => { const ok = G.loadGame(d.v); UI.toast(ok ? 'Kayıt yüklendi.' : 'Kayıt yüklenemedi.', ok ? 'good' : 'bad'); if (ok) { UI.close(); UI.enterGame(); } };
  ACT.setmode = (d) => { R.setMode(d.v); UI.render(); UI.hud(); };
  ACT.mapmode = () => { const order = ['pol', 'terrain', 'ind', 'fac']; R.setMode(order[(order.indexOf(R.mode) + 1) % order.length]); UI.toast('Harita modu: ' + { pol: 'Siyasi', terrain: 'Arazi', ind: 'Sanayi', fac: 'İttifaklar' }[R.mode]); UI.hud(); };
  ACT.setting = (d) => { if (d.v === 'hist') G.st.opts.hist = G.st.opts.hist ? 0 : 1; else UI.settings[d.v] = UI.settings[d.v] ? 0 : 1; UI.render(); };
  ACT.newgame = () => { UI.close(); G.st.paused = 1; UI.showStart(); };
  ACT.home = () => { const c = me(); if (c && c.cap >= 0) R.focusOn(c.cap, 2); };
  ACT.boxsel = () => { R.boxMode = !R.boxMode; $('btn-box').classList.toggle('on', R.boxMode); UI.toast(R.boxMode ? 'Alan seçimi: harita üzerinde parmağını sürükle.' : 'Alan seçimi kapandı.'); };

  // ---------- Başlangıç ekranı ----------
  const FEATURED = ['TUR', 'GER', 'SOV', 'ENG', 'FRA', 'USA', 'ITA', 'JAP', 'CHI', 'POL'];
  UI.startSel = 'TUR';
  UI.startOpts = { hist: 1, diff: 1 };
  UI.showStart = () => {
    $('start').hidden = false;
    ['hud', 'nav', 'map-tools'].forEach((id) => ($(id).hidden = true));
    $('card').hidden = true; $('selbar').hidden = true;
    UI.renderStart();
  };
  UI.renderStart = () => {
    const defs = g.COUNTRY_DEFS;
    const tags = Object.keys(defs).filter((t) => !defs[t].hidden && P.some((p) => p.t === t));
    const card = (t, big) => {
      const d = defs[t]; const id = g.IDEOLOGIES[d.id];
      if (!big) return `<button class="mcard ${UI.startSel === t ? 'on' : ''}" data-act="pick" data-v="${t}">${G.flag(t, 24, 16)}<b>${esc(d.n)}</b></button>`;
      return `<button class="mcard ${UI.startSel === t ? 'on' : ''}" data-act="pick" data-v="${t}"><div class="row">${G.flag(t, 30, 20)}<b>${esc(d.n)}</b></div><div class="d">${esc(d.l)}</div><div class="d"><span style="color:${id.c}">${id.n}</span> · ${d.civ} sivil · ${d.mil} askerî</div></button>`;
    };
    const d = defs[UI.startSel];
    const meta = G.saveMeta('auto');
    let html = '';
    if (meta) html += `<div class="sec"><h3 class="sec-h">Kaldığın yerden</h3><button class="item" data-act="continue"><span>${G.flag(meta.player, 30, 20)}</span><div class="grow"><div class="t">${esc(G.cname(meta.player))}</div><div class="d">${G.fmtDate(meta.day)} · otomatik kayıt</div></div><span class="btn sm pri">Devam et</span></button></div>`;
    html += `<div class="sec"><h3 class="sec-h">Öne çıkan uluslar</h3><div class="majors">${FEATURED.map((t) => card(t, true)).join('')}</div></div>`;
    html += `<div class="sec"><h3 class="sec-h">Tüm ülkeler<span>${tags.length}</span></h3><div class="minors">${tags.filter((t) => !FEATURED.includes(t)).sort((a, b) => defs[a].n.localeCompare(defs[b].n, 'tr')).map((t) => card(t)).join('')}</div></div>`;
    html += `<div class="sec opts"><h3 class="sec-h">Ayarlar</h3>
      <div class="seg"><button class="${UI.startOpts.hist ? 'on' : ''}" data-act="sopt" data-k="hist" data-v="1">Tarihî gidişat</button><button class="${!UI.startOpts.hist ? 'on' : ''}" data-act="sopt" data-k="hist" data-v="0">Serbest dünya</button></div>
      <div class="seg"><button class="${UI.startOpts.diff === 0 ? 'on' : ''}" data-act="sopt" data-k="diff" data-v="0">Kolay</button><button class="${UI.startOpts.diff === 1 ? 'on' : ''}" data-act="sopt" data-k="diff" data-v="1">Normal</button><button class="${UI.startOpts.diff === 2 ? 'on' : ''}" data-act="sopt" data-k="diff" data-v="2">Zor</button></div></div>`;
    html += `<div class="go"><button class="btn pri" data-act="begin">${G.flag(UI.startSel, 30, 20)} ${esc(d.n)} ile başla</button></div>`;
    $('start-body').innerHTML = html;
  };
  ACT.pick = (d) => { UI.startSel = d.v; UI.renderStart(); };
  ACT.sopt = (d) => { UI.startOpts[d.k] = +d.v; UI.renderStart(); };
  ACT.begin = () => {
    G.newGame(UI.startSel, { hist: UI.startOpts.hist, diff: UI.startOpts.diff });
    G.st.speed = 2; G.st.paused = 1;
    UI.enterGame();
    UI.showModal({ eyebrow: '1 Ocak 1936', title: G.cname(UI.startSel), text: `${G.def(UI.startSel).l} yönetimindeki ${G.cname(UI.startSel)} yeni bir çağın eşiğinde. Bir ulusal odak seç, araştırmaları başlat ve üretimi düzenle. Hazır olunca zamanı başlat.`, opts: [{ n: 'Göreve başla', fx: () => {} }] });
    UI.modalWasRunning = false;
  };
  ACT.continue = () => { if (G.loadGame('auto')) UI.enterGame(); else UI.toast('Kayıt yüklenemedi.', 'bad'); };
  UI.enterGame = () => {
    $('start').hidden = true;
    ['hud', 'nav', 'map-tools'].forEach((id) => ($(id).hidden = false));
    R.sel.units.clear(); R.sel.prov = -1;
    G.mapDirty = 1; R.mapDirty = 1;
    const c = me(); if (c && c.cap >= 0) { R.cam.z = Math.max(R.minZ, 1.6); R.focusOn(c.cap); }
    UI.hud(); R.dirty = 1;
  };

  // günlükten bildirime
  G.onLog = (l) => {
    const st = G.st; if (!st.player) return;
    const mineRel = l.t.includes(st.player) || l.t.some((t) => G.sameFaction(t, st.player) || G.atWar(t, st.player));
    if (l.k === 'major' || mineRel) UI.toast(l.m, l.k === 'major' ? 'major' : l.k);
  };
  G.onCapitulate = (tag, winner, full) => {
    const st = G.st;
    if (tag === st.player) {
      if (full) G.queuePopup({ title: 'Teslim olduk', text: 'Ordularımız dağıldı ve ülkemiz ilhak edildi. Savaşı izlemeye devam edebilir ya da yeni bir oyuna başlayabilirsin.', opts: [{ n: 'Yeni oyun', fx: () => UI.showStart() }, { n: 'İzlemeye devam et', fx: () => {} }] });
      else G.queuePopup({ title: 'Ateşkes', text: 'Hükümetimiz teslim oldu. İşgal edilen topraklar kaybedildi, kalan topraklarda tarafsız olarak devam ediyoruz.', opts: [{ n: 'Devam et', fx: () => {} }] });
    } else if (G.atWar(winner, st.player) === false && (st.C[tag].major || G.sameFaction(tag, st.player) || winner === st.player)) {
      G.queuePopup({ title: `${G.cname(tag)} teslim oldu`, text: full ? `${G.cname(tag)} tamamen ilhak edildi.` : `${G.cname(tag)} silahlarını bıraktı; işgal edilen topraklar galiplere geçti.`, opts: [{ n: 'Anlaşıldı', fx: () => {} }] });
    }
  };
  G.onGameOver = () => {};
})(window);
