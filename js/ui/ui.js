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
      ['İstikrar', pct(c.stab ?? 0.5), (c.stab ?? 0.5) < 0.4 ? 'neg' : ''],
      ['Savaş desteği', pct(c.ws ?? 0.2), ''],
      ['İnsan gücü', G.fmtMP(c.mpAvail || 0), (c.mpAvail || 0) < 30 ? 'neg' : ''],
      ['Sivil', s.civ, ''],
      ['Askerî', s.mil, ''],
      ['Tersane', s.dock, ''],
      ['Çelik', `${int(s.steel)}/${int(e.needSteel || 0)}`, (e.rS ?? 1) < 1 ? 'neg' : ''],
      ['Petrol', `${int(s.oil)}/${int(e.needOil || 0)}`, (e.rO ?? 1) < 1 ? 'neg' : ''],
      ['Tümen', divs + (c.train.length ? `+${c.train.length}` : ''), ''],
    ];
    if (c.enemies.length) chips.push(['Savaş', c.enemies.length + ' düşman', 'neg']);
    const hr = chips.map(([k, v, cl]) => `<div class="chip ${cl}"><small>${k}</small><b>${v}</b></div>`).join('');
    if ($('hud-res').dataset.h !== hr) { $('hud-res').innerHTML = hr; $('hud-res').dataset.h = hr; }
    // HOI4 tarzı uyarılar
    const al = [];
    if (!c.focus.cur && G.focusList(c).some((f) => G.focusAvailable(c, f))) al.push(['pol', 'tree', 'Odak seçilmedi']);
    if (c.res.length < c.mods.slots) al.push(['res', '', `${c.mods.slots - c.res.length} boş araştırma`]);
    const milA = c.lines.reduce((a, l) => a + (g.EQUIP[l.e].fac === 'mil' ? l.f : 0), 0);
    if (s.mil - milA > 0) al.push(['prod', '', `${s.mil - milA} boşta fabrika`]);
    if (!c.constr.length && (e.civFree || 0) > 0) al.push(['con', '', 'İnşaat kuyruğu boş']);
    const shortR = g.RES_KEYS.filter((r) => (e.ratio || {})[r] < 0.95);
    if (shortR.length) al.push(['trade', '', `Kaynak açığı: ${shortR.map((r) => g.RES[r]).join(', ')}`]);
    const freeAdv = Object.entries(g.ADV_SLOTS).some(([r, n]) => (c.adv[r] || []).length < n);
    if (freeAdv && c.pp >= 180) al.push(['pol', '', 'Danışman atanabilir']);
    if (c.enemies.length) {
      const idle = st.units.filter((u) => u.t === c.tag && !u.army && !u.auto && !u.path.length).length;
      if (idle > 3) al.push(['army', '', `${idle} emirsiz tümen`]);
    }
    const ah = al.map(([p, sub, n]) => `<button class="alert" data-act="alert" data-p="${p}" data-s="${sub}">${n}</button>`).join('');
    const box = $('hud-alerts');
    if (box && box.dataset.h !== ah) { box.innerHTML = ah; box.dataset.h = ah; box.hidden = !ah; }
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
  UI.render = (reset, auto) => {
    if (!UI.panel) return;
    const sheet = $('sheet'), body = $('sheet-body');
    const scroll = body.scrollTop;
    // Dokunma sırasında içerik değiştirilmez; aynı içerik yeniden yazılmaz.
    if (auto && (performance.now() - UI.lastTouch < 1500)) return;
    const out = PANELS[UI.panel]();
    if (auto && out.html === UI.lastHtml && !sheet.hidden) return;
    UI.lastHtml = out.html;
    $('sheet-title').textContent = out.title;
    $('sheet-back').hidden = !UI.sub;
    body.innerHTML = out.html;
    sheet.hidden = false;
    const ft = body.querySelector('.ftree');
    if (!reset) { body.scrollTop = scroll; if (ft && UI.ftScroll) { ft.scrollLeft = UI.ftScroll[0]; ft.scrollTop = UI.ftScroll[1]; } }
    else {
      body.scrollTop = 0;
      if (ft) { const n = ft.querySelector('.fn.active') || ft.querySelector('.fn.avail'); if (n) { ft.scrollLeft = Math.max(0, n.offsetLeft - ft.clientWidth / 2 + n.offsetWidth / 2); ft.scrollTop = Math.max(0, n.offsetTop - 40); } }
    }
    if (ft) ft.onscroll = () => { UI.ftScroll = [ft.scrollLeft, ft.scrollTop]; };
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.p === UI.panel));
    UI.syncOverlays();
  };
  UI.syncOverlays = () => {
    const sheetOpen = !$('sheet').hidden;
    $('selbar').hidden = sheetOpen || (!R.sel.units.size && !R.sel.fleet);
    if (!$('selbar').hidden) UI.renderSel();
    if (sheetOpen || R.sel.units.size || R.sel.fleet) $('card').hidden = true;
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
    if (UI.sub && UI.sub.startsWith('adv:')) return advPicker(c, UI.sub.slice(4));
    const id = g.IDEOLOGIES[c.ideo];
    const fac = c.fac ? st.factions[c.fac] : null;
    let html = `<div class="row">${G.flag(c.tag, 54, 36)}<div class="grow"><div style="font-size:20px;font-weight:700">${esc(d.n)}</div><div class="muted small">${esc(c.leader)} · <span style="color:${id.c}">${id.n}</span>${fac ? ' · ' + esc(fac.n) : ''}</div></div></div>`;
    html += kv([['Siyasi güç', int(c.pp)], ['Günlük', '+' + r1(c.ppDay || 2)], ['İstikrar', pct(c.stab ?? 0.5), (c.stab ?? 0.5) < 0.4 ? 'bad' : 'good'], ['Savaş desteği', pct(c.ws ?? 0.2), (c.ws ?? 0) < 0.2 ? 'warn' : 'good'], ['Gerginlik', '%' + Math.round(st.tension)], ['Teslim riski', c.enemies.length ? pct(Math.max(0, Math.min(1, c.surrender || 0))) : '—', (c.surrender || 0) > 0.6 ? 'bad' : '']]);
    // parti desteği
    const IDS = ['dem', 'fas', 'com', 'neu'];
    let ph = `<div class="party">${IDS.map((k) => `<i style="width:${(c.pop[k] * 100).toFixed(1)}%;background:${g.IDEOLOGIES[k].c}"></i>`).join('')}</div>`;
    ph += `<div class="legend">${IDS.map((k) => `<span><i style="background:${g.IDEOLOGIES[k].c}"></i>${g.PARTY_N[k]} <b>${pct(c.pop[k])}</b>${k === c.ideo ? ' ★' : ''}</span>`).join('')}</div>`;
    ph += `<p class="muted small" style="margin:0">Bir parti %50'yi geçerse hükümet değişikliği gündeme gelir. Yönetici partinin desteği %40'ın altına düşerse istikrar azalır.</p>`;
    html += sec('Parti desteği', ph);
    // ulusal ruhlar
    const sp = c.spirits.filter((s) => g.SPIRITS[s]);
    html += sec('Ulusal ruhlar', sp.length ? `<div class="list">${sp.map((s) => `<div class="item spirit"><div class="grow"><div class="t">${g.SPIRITS[s].n}</div><div class="d">${g.SPIRITS[s].d}</div></div></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Etkin ulusal ruh yok.</p>');
    // odak
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    let fh = cur ? `<div class="item active"><div class="grow"><div class="t">${esc(cur.n)}</div><div class="d">${esc(cur.d)}</div>${bar(c.focus.p / g.FOCUS_DAYS)}<div class="d">${Math.ceil(g.FOCUS_DAYS - c.focus.p)} gün kaldı</div></div></div>` : `<div class="item"><div class="grow"><div class="t warn">Odak seçilmedi</div><div class="d">Her odak ${g.FOCUS_DAYS} günde tamamlanır ve kalıcı etki verir.</div></div></div>`;
    fh += `<button class="btn pri" data-act="sub" data-v="tree">Odak ağacını aç${g.FOCUS_NATIONAL[c.tag] ? ' · ulusal ağaç' : ''}</button>`;
    html += sec('Ulusal odak', fh, `${Object.keys(c.focus.done).length}/${G.focusList(c).length} tamamlandı`);
    // danışmanlar
    let ah = '<div class="advgrid">';
    for (const [role, n] of Object.entries(g.ADV_SLOTS)) {
      const cur2 = c.adv[role] || [];
      for (let i = 0; i < n; i++) {
        const t = cur2[i];
        ah += t ? `<div class="adv on"><small>${g.ADV_ROLE_N[role]}</small><b>${esc(G.advName(c.tag, t))}</b><span class="d">${g.ADV_TYPES[t].d}</span><button class="x" data-act="fireadv" data-v="${t}" aria-label="Görevden al">✕</button></div>`
          : `<button class="adv" data-act="sub" data-v="adv:${role}"><small>${g.ADV_ROLE_N[role]}</small><b class="muted">+ Ata</b><span class="d">${g.ADV_COST[role]} SG</span></button>`;
      }
    }
    html += sec('Danışmanlar ve tasarım büroları', ah + '</div>');
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
    const t = (k, n, d2) => `<button class="toggle ${c.auto[k] ? 'on' : ''}" data-act="auto" data-v="${k}"><span><b>${n}</b><br><span class="muted small">${d2}</span></span><i></i></button>`;
    html += sec('Yardımcı bakanlar', `<div class="list">${t('focus', 'Odak bakanı', 'Sıradaki odağı otomatik seçer')}${t('res', 'Bilim bakanı', 'Boş araştırma yuvalarını doldurur')}${t('prod', 'Sanayi bakanı', 'Üretim hatlarını dengeler')}${t('con', 'Bayındırlık bakanı', 'İnşaat kuyruğunu doldurur')}</div>`);
    return { title: 'Siyaset', html };
  };

  function advPicker(c, role) {
    let html = `<p class="muted small" style="margin:0">${g.ADV_ROLE_N[role]}: yuva ${(c.adv[role] || []).length}/${g.ADV_SLOTS[role]}. Elinde ${int(c.pp)} siyasi güç var.</p><div class="list">`;
    for (const [type, a] of Object.entries(g.ADV_TYPES)) {
      if (a.r !== role) continue;
      const r = G.canHire(c, type);
      html += `<div class="item"><div class="grow"><div class="t">${esc(G.advName(c.tag, type))}</div><div class="d">${a.n} · ${a.d}</div>${!r.ok ? `<div class="d warn">${r.why}</div>` : ''}</div><button class="btn sm ${r.ok ? 'pri' : ''}" data-act="hire" data-v="${type}" ${r.ok ? '' : 'disabled'}>${G.advCost(c, type)} SG</button></div>`;
    }
    return { title: g.ADV_ROLE_N[role], html: html + '</div>' };
  }

  function focusTree(c) {
    const list = G.focusList(c);
    const NW = 128, NH = 74, GX = 140, GY = 104, PAD = 14;
    const maxX = Math.max(...list.map((f) => f.x)), maxY = Math.max(...list.map((f) => f.y));
    const W = Math.ceil((maxX + 1) * GX + PAD * 2), H = Math.ceil((maxY + 1) * GY + PAD * 2);
    const pos = (f) => ({ x: PAD + f.x * GX, y: PAD + f.y * GY });
    const byId = Object.fromEntries(list.map((f) => [f.id, f]));
    let lines = '';
    for (const f of list) {
      const b = pos(f);
      for (const p of f.pre) {
        const group = Array.isArray(p) ? p : [p];
        for (const pid of group) {
          const a = byId[pid]; if (!a) continue;
          const s = pos(a);
          const x1 = s.x + NW / 2, y1 = s.y + NH, x2 = b.x + NW / 2, y2 = b.y, my = (y1 + y2) / 2;
          const done = c.focus.done[pid];
          lines += `<path d="M${x1} ${y1}V${my}H${x2}V${y2}" class="${done ? 'ln done' : 'ln'}${Array.isArray(p) ? ' or' : ''}"/>`;
        }
      }
      for (const e of f.excl || []) {
        const o = byId[e]; if (!o || o.id < f.id || o.y !== f.y) continue;
        const a = pos(f), b2 = pos(o);
        const x = (Math.min(a.x, b2.x) + NW + Math.max(a.x, b2.x)) / 2, y = a.y + NH / 2;
        lines += `<g class="excl"><circle cx="${x}" cy="${y}" r="9"/><text x="${x}" y="${y + 4}" text-anchor="middle">⇄</text></g>`;
      }
    }
    let nodes = '';
    for (const f of list) {
      const p = pos(f);
      const done = c.focus.done[f.id], active = c.focus.cur === f.id, avail = G.focusAvailable(c, f), excl = G.focusExcluded(c, f) && !done;
      const cls = done ? 'done' : active ? 'active' : excl ? 'excl' : avail ? 'avail' : 'locked';
      nodes += `<button class="fn ${cls}${UI.fsel === f.id ? ' sel' : ''}" style="left:${p.x}px;top:${p.y}px;width:${NW}px;height:${NH}px" data-act="focus" data-v="${f.id}"><span class="t">${done ? '✓ ' : ''}${esc(f.n)}</span><span class="d">${esc(f.d)}</span>${active ? `<i class="fp" style="width:${(c.focus.p / g.FOCUS_DAYS * 100).toFixed(0)}%"></i>` : ''}</button>`;
    }
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    let html = cur ? `<div class="item active"><div class="grow"><div class="t">${esc(cur.n)} · ${Math.ceil(g.FOCUS_DAYS - c.focus.p)} gün</div>${bar(c.focus.p / g.FOCUS_DAYS)}</div></div>` : '<p class="muted small" style="margin:0">Parlak çerçeveli odaklar seçilebilir; ⇄ işaretliler birbirini dışlar. Ağacı parmağınla her yöne kaydır, bir odağa dokunup ayrıntısını gör ve “Başlat” de.</p>';
    html += `<div class="ftree" id="ftree"><div class="ftree-in" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${lines}</svg>${nodes}</div></div>`;
    const sf = UI.fsel ? G.focusById(c, UI.fsel) : null;
    if (sf) {
      const done = c.focus.done[sf.id], active = c.focus.cur === sf.id, avail = G.focusAvailable(c, sf);
      const why = done ? 'Tamamlandı.' : active ? `Sürüyor: ${Math.ceil(g.FOCUS_DAYS - c.focus.p)} gün kaldı.` : avail ? `${g.FOCUS_DAYS} gün sürer.` : G.focusExcluded(c, sf) ? 'Seçtiğin başka bir odak bunu dışlıyor.' : !G.focusPreOk(c, sf) ? 'Önce bağlı olduğu odakları tamamla: ' + sf.pre.flat().filter((p) => !c.focus.done[p]).map((p) => G.focusById(c, p)?.n || p).join(', ') + '.' : G.focusReq(c, sf).why + '.';
      html += `<div class="fdetail"><div class="row"><div class="grow"><div class="t">${esc(sf.n)}</div><div class="d">${esc(sf.d)}</div><div class="d ${avail ? 'good' : 'warn'}">${why}</div></div><button class="x" data-act="focusclose" aria-label="Kapat" style="width:32px;height:32px;color:var(--muted)">✕</button></div>${avail ? `<button class="btn pri" data-act="focusgo" data-v="${sf.id}">${c.focus.cur ? 'Bu odağa geç' : 'Odağı başlat'}</button>` : ''}</div>`;
    }
    return { title: g.FOCUS_NATIONAL[c.tag] ? `${G.cname(c.tag)} odak ağacı` : 'Odak ağacı', html };
  }

  function lawPicker(c, k) {
    const L = g.LAWS[k];
    let html = `<p class="muted small" style="margin:0">Yasa değişikliği ${g.LAW_COST} siyasi güç ister. Seçenekler savaş desteğine (şu an ${pct(c.ws ?? 0)}) bağlıdır; bazıları yalnızca savaşta açılır.</p><div class="list">`;
    L.opts.forEach((o, i) => {
      const cur = c.laws[k] === i;
      const r = G.lawAllowed(c, k, i);
      let ok = r.ok, why = r.why || '';
      if (ok && c.pp < g.LAW_COST) { ok = false; why = `${g.LAW_COST} siyasi güç gerekli`; }
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
        const days = Math.ceil((cost - r.p) / (G.resSpeed(c, r.id) * (1 + (r.b || 0))));
        sh += `<div class="item active"><div class="grow"><div class="t">${esc(t.n)}</div>${bar(r.p / cost)}<div class="d">${days} gün kaldı</div></div><button class="btn sm" data-act="rescancel" data-v="${r.id}" aria-label="İptal">✕</button></div>`;
      } else sh += `<div class="item"><div class="grow"><div class="t muted">Boş yuva</div><div class="d">Aşağıdan bir teknoloji seç</div></div></div>`;
    }
    if ((c.rb || []).length) sh += `<div class="d good" style="font-size:13px">Araştırma bonusları: ${c.rb.map(([cat, v]) => `${g.TECH_CATS[cat]} +%${Math.round(v * 100)}`).join(' · ')}</div>`;
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
      const bon = (c.rb || []).find((x) => x[0] === t.cat);
      lh += `<button class="item ${cls}" data-act="research" data-v="${t.id}" ${avail ? '' : 'disabled'}><div class="grow"><div class="t">${done ? '✓ ' : ''}${esc(t.n)} <span class="muted small">${t.year}</span></div><div class="d">${pre}</div><div class="d">${done ? 'Tamamlandı' : active ? 'Araştırılıyor' : `~${Math.ceil(cost / (G.resSpeed(c, t.id) * (1 + (bon ? bon[1] : 0))))} gün`}${bon && avail ? ` · <span class="good">bonus +%${Math.round(bon[1] * 100)}</span>` : ''}${ahead}</div></div></button>`;
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
      ['Fabrika verimi', (m.factory >= 0 ? '+' : '') + Math.round(((m.factory || 0) + (e.stabF || 0)) * 100) + '%'],
      ['Bombardıman', c.bombed ? '-' + pct(c.bombed) : '—', c.bombed ? 'bad' : ''],
    ]);
    const short = g.RES_KEYS.filter((r) => (e.ratio || {})[r] < 1);
    if (short.length) html += `<p class="small warn" style="margin:0">Kaynak açığı: ${short.map((r) => g.RES[r]).join(', ')}. Eksik kaynak gerektiren hatlar yavaşlar. Ticaret panelinden satın al.</p>`;
    const effCap = Math.min(1, 0.6 + (m.effCap || 0));
    const line = (l, i) => {
      const eq = g.EQUIP[l.e];
      const best = G.bestLevel(c, l.e), lv = l.lv || best;
      const out = eq.ship || eq.convoy ? (l.f * 2.5 * (1 + (m.factory || 0))) : (l.f * 4.5 * l.eff * (1 + (m.factory || 0)) / eq.cost);
      const stock = eq.convoy ? `${int(c.ships.conv || 0)} konvoy` : eq.ship ? `${Math.round(G.navyCount(c, l.e))} gemi` : `Stok ${int(c.stock[l.e] || 0)}`;
      const rate = eq.convoy ? `${r1(out / eq.cost)}/gün` : eq.ship ? `${l.f ? Math.ceil((eq.cost - (l.acc || 0)) / Math.max(0.1, out)) + ' günde 1' : 'durdu'}` : `${r1(out)}/gün`;
      const model = (g.MODEL_N[l.e] || [])[lv];
      const upg = !eq.ship && !eq.convoy && lv < best;
      const resTxt = Object.entries(eq.res).map(([r, v]) => `${g.RES[r].slice(0, 3)} ${r1(v * l.f)}`).join(' · ');
      return `<div class="item line"><div class="grow"><div class="t">${eq.n}${model ? ` <span class="muted small">${model}</span>` : ''}</div><div class="d">${stock} · ${rate}${eq.ship || eq.convoy ? '' : ` · verim ${pct(l.eff)}/${pct(effCap)}`}</div><div class="d">${resTxt}</div>${eq.ship ? bar((l.acc || 0) / eq.cost) : bar(l.eff / effCap, 'g')}
        <div class="btns" style="margin-top:4px">${upg ? `<button class="btn sm pri" data-act="lineup" data-v="${i}">Yeni modele geç: ${(g.MODEL_N[l.e] || [])[best] || 'Seviye ' + best}</button>` : ''}<button class="btn sm danger" data-act="linedel" data-v="${i}">Hattı sil</button></div></div>
        <div class="stepper"><button data-act="line" data-e="${l.e}" data-i="${i}" data-v="-1" aria-label="Azalt">−</button><b>${l.f}</b><button data-act="line" data-e="${l.e}" data-i="${i}" data-v="1" aria-label="Artır">+</button></div></div>`;
    };
    const idx = (fac) => c.lines.map((l, i) => [l, i]).filter(([l]) => g.EQUIP[l.e].fac === fac);
    const avail = (fac) => Object.entries(g.EQUIP).filter(([k, v]) => v.fac === fac && (m.unlockEq[k] || (!v.req && fac === 'mil') || (v.req && c.tech[v.req]) || k === 'conv' || k === 'sup'));
    html += sec('Kara ve hava üretimi', `<div class="list">${idx('mil').map(([l, i]) => line(l, i)).join('')}</div><div class="btns">${avail('mil').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>`, `${s.mil - milA} boşta`);
    html += sec('Tersaneler', `<div class="list">${idx('dock').map(([l, i]) => line(l, i)).join('') || '<p class="muted small" style="margin:0">Tersane hattı yok. İnşaat panelinden kıyı eyaletlerine tersane kurabilirsin.</p>'}</div>${s.dock ? `<div class="btns">${avail('dock').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>` : ''}`, `${s.dock - dockA} boşta`);
    // teçhizat stoğu ve modeller
    const rows = ['inf', 'sup', 'art', 'at', 'aa', 'mot', 'tank', 'fig', 'cas', 'bom'].map((k) => `<div><small>${g.EQUIP[k].s}</small><b>${int(c.stock[k] || 0)}</b><span class="muted small">${(g.MODEL_N[k] || [])[Math.round(G.lvl(c, k))] || 'Sv ' + r1(G.lvl(c, k))}</span></div>`).join('');
    html += sec('Teçhizat deposu', `<div class="kv">${rows}</div><p class="muted small" style="margin:0">Yeni teknoloji araştırınca hatları “Yeni modele geç” ile güncelle. Ordudaki tümenler depodaki yeni modelleri takviye sırasında yavaşça alır.</p>`);
    return { title: 'Üretim', html };
  };

  // Ticaret
  PANELS.trade = () => {
    const st = G.st, c = me(), e = c.econ || {};
    if (UI.sub && UI.sub.startsWith('buy:')) return buyPicker(c, UI.sub.slice(4));
    let html = kv([['İthalat (fab.)', `${e.trade || 0}`], ['İhracat (fab.)', `+${e.expCiv || 0}`], ['Konvoy', `${int(c.ships.conv || 0)} / ${int(G.convoyNeed(c.tag))}`, (e.convRatio ?? 1) < 1 ? 'bad' : ''], ['Konvoy akını', c.raid ? '-' + pct(c.raid) : '—', c.raid ? 'bad' : ''], ['Ticaret yasası', g.LAWS.trade.opts[c.laws.trade].n]]);
    html += `<button class="toggle ${c.auto.trade ? 'on' : ''}" data-act="auto" data-v="trade"><span><b>Ticaret bakanı</b><br><span class="muted small">Açıksa eksik kaynakları otomatik satın alır, fazlayı iptal eder.</span></span><i></i></button>`;
    let rh = '<div class="restable"><div class="rh"><span>Kaynak</span><span>Üretim</span><span>İthal</span><span>Satılan</span><span>İhtiyaç</span><span></span></div>';
    const sold = (G._sold && G._sold[c.tag]) || {};
    for (const r of g.RES_KEYS) {
      const prod = c.sum.res[r] || 0, imp = (e.imp || {})[r] || 0, need = (e.need || {})[r] || 0, bal = (e.have || {})[r] - need;
      rh += `<div class="rr ${bal < -0.5 ? 'neg' : ''}"><span><b>${g.RES[r]}</b></span><span>${r1(prod)}</span><span>${r1(imp)}</span><span>${r1(sold[r] || 0)}</span><span>${r1(need)}</span><span><button class="btn sm" data-act="sub" data-v="buy:${r}">Al</button></span></div>`;
    }
    html += sec('Kaynaklar', rh + '</div>', 'günlük birim');
    const mine = st.deals.map((d, k) => [d, k]).filter(([d]) => d.i === c.tag);
    let dh = '<div class="list">';
    for (const [d, k] of mine) dh += `<div class="item">${G.flag(d.e, 26, 17)}<div class="grow"><div class="t">${g.RES[d.r]} ${int(d.n)}</div><div class="d">${esc(G.cname(d.e))} · ${G.dealCiv(d.n)} sivil fabrika${G.overseas(c.tag, d.e) ? ' · deniz aşırı (konvoy gerekir)' : ' · kara yolu'}</div></div><button class="btn sm" data-act="dealdel" data-v="${k}" aria-label="İptal">✕</button></div>`;
    if (!mine.length) dh += '<p class="muted small" style="margin:0">İthalat anlaşması yok.</p>';
    html += sec('İthalat anlaşmaları', dh + '</div>', `${mine.length}`);
    const out = st.deals.filter((d) => d.e === c.tag);
    if (out.length) html += sec('İhracat', `<div class="list">${out.map((d) => `<div class="item">${G.flag(d.i, 26, 17)}<div class="grow"><div class="t">${g.RES[d.r]} ${int(d.n)}</div><div class="d">${esc(G.cname(d.i))} · +${G.dealCiv(d.n)} sivil fabrika</div></div></div>`).join('')}</div>`);
    return { title: 'Ticaret', html };
  };
  function buyPicker(c, r) {
    const st = G.st, comm = G.committed();
    const list = Object.values(st.C).filter((x) => x.alive && x.tag !== c.tag).map((x) => ({ t: x.tag, free: G.exportFree(x.tag, r, comm), ok: G.canTradeWith(c.tag, x.tag) })).filter((x) => x.free >= 1).sort((a, b) => b.free - a.free);
    let html = `<p class="muted small" style="margin:0">${g.RES[r]} satan ülkeler. Her 8 birim 1 sivil fabrikaya mal olur. Deniz aşırı anlaşmalar konvoy ister.</p><div class="list">`;
    for (const x of list.slice(0, 30)) html += `<div class="item">${G.flag(x.t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(x.t))}</div><div class="d">Satılabilir ${r1(x.free)}${G.overseas(c.tag, x.t) ? ' · deniz aşırı' : ' · kara yolu'}${x.ok ? '' : ' · <span class="warn">ticarete kapalı</span>'}</div></div><div class="btns"><button class="btn sm pri" data-act="buy" data-k="${x.t}" data-v="${r}" data-n="8" ${x.ok && x.free >= 4 ? '' : 'disabled'}>+8</button><button class="btn sm" data-act="buy" data-k="${x.t}" data-v="${r}" data-n="${Math.floor(x.free)}" ${x.ok ? '' : 'disabled'}>Tümü</button></div></div>`;
    if (!list.length) html += '<p class="muted">Şu an satan ülke yok.</p>';
    return { title: `${g.RES[r]} satın al`, html: html + '</div>' };
  }

  // Donanma ve hava
  PANELS.navy = () => {
    const st = G.st, c = me();
    let html = kv([['Deniz gücü', int(G.navyPower(c))], ['Konvoy', int(c.ships.conv || 0)], ['Akın kaybı', c.raid ? pct(c.raid) : '—', c.raid ? 'bad' : ''], ['Hava gücü', int(G.airPower(c))], ['Hava üstünlüğü', c.enemies.length ? ((c.airMod || 1) >= 1 ? '+' : '') + Math.round(((c.airMod || 1) - 1) * 100) + '%' : '—', (c.airMod || 1) >= 1 ? 'good' : 'bad']]);
    let fh = '<div class="list">';
    for (const f of c.fleets) {
      const p = G.fleetPower(c, f);
      const where = SEA_N(f.loc);
      fh += `<div class="item army"><div class="grow"><div class="row"><div class="t grow">${esc(f.n)} <span class="muted small">${where}${f.path.length ? ' · yolda' : ''}</span></div><button class="btn sm" data-act="fleetsel" data-v="${f.id}">Seç</button></div>
        <div class="d">${g.SHIPS.filter((e2) => f.sh[e2] >= 0.5).map((e2) => `${Math.round(f.sh[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(' · ') || 'gemi yok'} · güç ${int(p)}</div>
        <div class="seg sm">${Object.entries(G.MISSIONS).map(([k, n]) => `<button class="${f.mis === k ? 'on' : ''}" data-act="fleetmis" data-k="${f.id}" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="btns"><button class="btn sm" data-act="fleethome" data-v="${f.id}">Limana dön</button><button class="btn sm" data-act="fleetauto" data-v="${f.id}">${f.auto ? '✓ ' : ''}Yeni gemiler buraya</button>${c.fleets.length > 1 ? `<button class="btn sm danger" data-act="fleetmerge" data-v="${f.id}">Birleştir</button>` : ''}</div></div></div>`;
    }
    if (!c.fleets.length) fh += '<p class="muted small" style="margin:0">Filon yok. Tersane kurup gemi üret.</p>';
    const res = g.SHIPS.filter((e2) => c.ships[e2] >= 1);
    fh += `</div>${res.length ? `<div class="item"><div class="grow"><div class="t">Yedek gemiler</div><div class="d">${res.map((e2) => `${Math.floor(c.ships[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(' · ')}</div></div><button class="btn sm pri" data-act="fleetnew">Yeni filo kur</button></div>` : ''}`;
    fh += '<p class="muted small" style="margin:0">Devriye: yakındaki zayıf düşman filolarına saldırır. Saldırı: daha uzağa ve cesurca saldırır. Konvoy akını: düşman ticaretini ve konvoylarını vurur. Refakat: kendi konvoylarını korur. Bir filoyu “Seç”ip haritada bir deniz bölgesine dokunarak elle taşıyabilirsin.</p>';
    html += sec('Filolar', fh);
    // hava görevleri
    const a = c.air || (c.air = { bomb: 'auto', cas: 1 });
    const tgts = ['auto', 'off', ...c.enemies];
    html += sec('Hava görevleri', `<div class="list">
      <button class="toggle ${a.cas ? 'on' : ''}" data-act="aircas"><span><b>Yakın hava desteği</b><br><span class="muted small">Yakın destek uçakları muharebelere katılır (${int(c.stock.cas)} uçak).</span></span><i></i></button>
      <div class="item"><div class="grow"><div class="t">Stratejik bombardıman</div><div class="d">${int(c.stock.bom)} bombardıman uçağı · hedef: ${a.bomb === 'auto' ? 'otomatik (en güçlü düşman)' : a.bomb === 'off' ? 'kapalı' : esc(G.cname(a.bomb))}</div></div><button class="btn sm" data-act="airbomb">Değiştir</button></div>
      </div>${kv([['Avcı', int(c.stock.fig)], ['Yakın destek', int(c.stock.cas)], ['Bombardıman', int(c.stock.bom)]])}`);
    void tgts;
    return { title: 'Donanma ve hava', html };
  };
  const SEA_N = (n) => {
    if (n < NP) return G.pname(n);
    const s = G.SEAS[n - NP];
    const near = s.p.map((i) => P[i]).sort((a, b) => b.vp - a.vp)[0];
    return near ? `${near.n.startsWith('#') ? 'Açık deniz' : near.n} açıkları` : 'Açık deniz';
  };
  G.seaName = SEA_N;

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
  const ORD_N = { hold: 'Bekle', def: 'Savun', atk: 'Taarruz' };
  const genLine = (gen) => `${esc(gen.n)} <span class="muted small">${gen.fm ? 'Mareşal' : 'General'} · Sv ${gen.lvl}</span>`;
  const genSkills = (gen) => `<span class="skills"><b title="Saldırı">S ${gen.atk}</b><b title="Savunma">Sv ${gen.def}</b><b title="Planlama">P ${gen.plan}</b><b title="Lojistik">L ${gen.log}</b></span>${gen.tr.length ? `<div class="d">${gen.tr.map((t) => g.GEN_TRAITS[t].n).join(' · ')}</div>` : ''}`;
  PANELS.army = () => {
    const st = G.st, c = me();
    if (UI.sub && UI.sub.startsWith('tpl:')) return templateDesigner(c, UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('gen:')) return generalPicker(c, +UI.sub.slice(4));
    if (UI.sub === 'gens') return generalList(c);
    const mine = st.units.filter((u) => u.t === c.tag);
    const mp = G.manpower(c);
    let html = kv([['İnsan gücü', G.fmtMP(mp.avail), mp.avail < 30 ? 'bad' : ''], ['Toplam', G.fmtMP(mp.max)], ['Tümen', mine.length], ['Eğitimde', c.train.length], ['Piyade T.', int(c.stock.inf)], ['Topçu', int(c.stock.art)], ['Tank', int(c.stock.tank)], ['Motorlu', int(c.stock.mot)]]);
    // ordular
    const enemies = c.enemies.slice();
    let oh = '<div class="list">';
    for (const a of c.armies || []) {
      const us = G.armyUnits(c, a.id);
      const gen = a.gen ? G.genById(c, a.gen) : null;
      const str = us.length ? us.reduce((s, u) => s + u.str, 0) / us.length : 0;
      const battle = (G.battles || []).filter((b) => us.some((u) => u.loc === b.n || u.path[0] === b.n)).length;
      oh += `<div class="item army"><div class="grow">
        <div class="row" style="gap:8px"><div class="t grow">${esc(a.n)} <span class="muted small">${us.length} tümen${battle ? ` · <span class="bad">${battle} muharebe</span>` : ''}</span></div><button class="btn sm" data-act="armysel" data-v="${a.id}">Seç</button></div>
        <button class="genrow" data-act="sub" data-v="gen:${a.id}">${gen ? `<div>${genLine(gen)}</div>${genSkills(gen)}` : '<span class="warn">Komutan ata ›</span>'}</button>
        <div class="seg sm">${Object.entries(ORD_N).map(([k, n]) => `<button class="${a.ord === k ? 'on' : ''}" data-act="armyord" data-k="${a.id}" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="armyvs" data-v="${a.id}">Cephe: ${a.vs ? esc(G.cname(a.vs)) : 'Tüm düşmanlar'}</button><button class="btn sm" data-act="armyadd" data-v="${a.id}" ${R.sel.units.size ? '' : 'disabled'}>Seçilileri ekle</button><button class="btn sm danger" data-act="armydel" data-v="${a.id}">Dağıt</button></div>
        ${bar(str, 'g')}</div></div>`;
    }
    if (!(c.armies || []).length) oh += '<p class="muted small" style="margin:0">Henüz ordu yok. Tümenleri bir orduda toplayıp komutan atarsan, komutan becerileri muharebeye eklenir ve “Savun” ya da “Taarruz” emriyle cepheyi senin yerine yönetir.</p>';
    oh += `</div><div class="btns"><button class="btn pri" data-act="armynew">${R.sel.units.size ? `Seçili ${R.sel.units.size} tümenden ordu kur` : 'Ordusuz tümenlerden ordu kur'}</button><button class="btn" data-act="sub" data-v="gens">Komutanlar (${c.gens.length})</button></div>`;
    html += sec('Ordular', oh, enemies.length ? `${enemies.length} düşman` : 'barış');
    // şablonlar ve eğitim
    const tpl = G.templatesOf(c);
    let th = '<div class="list">';
    for (const id of Object.keys(tpl)) {
      const t = G.T(c.tag, id);
      const locked = Object.keys(tpl[id].b).some((k) => g.BATS[k]?.req && !c.tech[g.BATS[k].req]);
      const ok = !locked && mp.avail >= t.mp;
      th += `<div class="item"><div class="grow"><div class="t">${esc(t.n)}</div><div class="d">${Object.entries(tpl[id].b).map(([k, n]) => `${n}×${g.BATS[k].n}`).join(', ')}${Object.keys(tpl[id].s || {}).length ? ' · ' + Object.keys(tpl[id].s).map((k) => g.SUPPORTS[k].n).join(', ') : ''}</div><div class="d">Saldırı ${r1(t.atk)} · Savunma ${r1(t.def)} · Moral ${Math.round(t.org)} · Hız ${t.spd} · Genişlik ${t.w}${t.arm ? ' · Zırh ' + Math.round(t.arm) : ''} · ${t.mp}K asker · ${t.days} gün${locked ? ' · <span class="warn">teknoloji gerekli</span>' : ''}</div></div><div class="btns col"><button class="btn sm ${ok ? 'pri' : ''}" data-act="train" data-v="${id}" data-n="1" ${ok ? '' : 'disabled'}>+1</button><button class="btn sm" data-act="train" data-v="${id}" data-n="5" ${ok && mp.avail >= t.mp * 5 ? '' : 'disabled'}>+5</button><button class="btn sm" data-act="sub" data-v="tpl:${id}">Tasarla</button></div></div>`;
    }
    th += `</div><button class="btn" data-act="tplnew">+ Yeni tümen şablonu</button>`;
    html += sec('Tümen tasarımcısı ve eğitim', th, 'Tümenler başkentte konuşlanır');
    if (c.train.length) {
      let qh = '<div class="list">';
      c.train.forEach((t, i) => {
        const u = G.T(c.tag, t.u);
        let ratio = 1; for (const [e, n] of Object.entries(u.eq)) ratio = Math.min(ratio, (c.stock[e] || 0) / n);
        qh += `<div class="item"><div class="grow"><div class="t">${esc(u.n)}</div><div class="d">${t.d > 0 ? t.d + ' gün kaldı' : ratio < 0.25 ? '<span class="warn">Teçhizat bekleniyor</span>' : 'Konuşlanıyor'}</div>${bar(1 - t.d / u.days)}</div><button class="btn sm" data-act="tdel" data-v="${i}" aria-label="İptal">✕</button></div>`;
      });
      html += sec('Eğitim kuyruğu', qh + '</div>');
    }
    const free = mine.filter((u) => !u.army);
    const autoN = free.filter((u) => u.auto).length;
    html += sec('Ordusuz tümenler', `<button class="toggle ${autoN === free.length && free.length ? 'on' : ''}" data-act="allauto"><span><b>Otomatik kurmay</b><br><span class="muted small">${autoN}/${free.length} ordusuz tümen yapay zekâ komutasında.</span></span><i></i></button>`);
    const groups = new Map();
    for (const u of mine) { const k = u.loc; let gl = groups.get(k); if (!gl) groups.set(k, (gl = [])); gl.push(u); }
    const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    let gh = '<div class="list">';
    for (const [loc, gl] of rows.slice(0, 50)) {
      const types = {}; for (const u of gl) { const s = G.T(u.t, u.u).s; types[s] = (types[s] || 0) + 1; }
      const str = gl.reduce((s, u) => s + u.str, 0) / gl.length;
      const org = gl.reduce((s, u) => s + u.org / G.unitStats(u).org, 0) / gl.length;
      const moving = gl.filter((u) => u.path.length).length;
      const name = loc < NP ? G.pname(loc) : 'Denizde';
      gh += `<button class="item" data-act="selgroup" data-v="${loc}"><div class="grow"><div class="t">${esc(name)}</div><div class="d">${Object.entries(types).map(([k, n]) => `${n} ${k}`).join(' · ')}${moving ? ` · ${moving} hareket hâlinde` : ''}</div><div class="row" style="gap:6px"><div class="grow">${bar(str, 'g')}</div><div class="grow">${bar(org)}</div></div></div><span class="muted">›</span></button>`;
    }
    html += sec('Konuşlanma', gh + '</div>', `${rows.length} konum · yeşil güç, sarı moral`);
    return { title: 'Ordu', html };
  };

  function generalList(c) {
    let html = `<p class="muted small" style="margin:0">Komutanlar muharebede tecrübe kazanır, seviye atlar ve yeni özellikler edinir. Saldırı (S) ve savunma (Sv) muharebe gücünü, planlama (P) muharebenin ilk günlerini ve siperi, lojistik (L) ikmali etkiler.</p><div class="list">`;
    for (const gen of c.gens) {
      const a = (c.armies || []).find((x) => x.gen === gen.id);
      html += `<div class="item"><div class="grow"><div class="t">${genLine(gen)}</div>${genSkills(gen)}<div class="d">${a ? esc(a.n) + ' komutanı' : 'Görevsiz'} · tecrübe ${Math.round(gen.xp)}/${40 * gen.lvl}</div></div></div>`;
    }
    html += `</div><button class="btn pri" data-act="newgen" ${c.pp >= 50 ? '' : 'disabled'}>Yeni komutan ata (50 SG)</button>`;
    return { title: 'Komutanlar', html };
  }
  function generalPicker(c, armyId) {
    const a = G.armyById(c, armyId);
    let html = `<p class="muted small" style="margin:0">${esc(a.n)} için komutan seç. Bir general en iyi 24 tümene kadar komuta eder; mareşaller büyük ordularda da tam etki gösterir.</p><div class="list">`;
    const sorted = c.gens.slice().sort((x, y) => (y.atk + y.def + y.plan + y.log) - (x.atk + x.def + x.plan + x.log));
    for (const gen of sorted) {
      const other = (c.armies || []).find((x) => x.gen === gen.id && x.id !== armyId);
      html += `<button class="item ${a.gen === gen.id ? 'active' : ''}" data-act="setgen" data-k="${armyId}" data-v="${gen.id}"><div class="grow"><div class="t">${genLine(gen)}</div>${genSkills(gen)}${other ? `<div class="d warn">Şu an ${esc(other.n)} komutanı</div>` : ''}</div></button>`;
    }
    return { title: 'Komutan seç', html: html + '</div>' };
  }
  function templateDesigner(c, id) {
    const tpl = G.templatesOf(c)[id];
    if (!tpl) { UI.sub = null; return PANELS.army(); }
    const t = G.T(c.tag, id);
    const nb = Object.values(tpl.b).reduce((a, b) => a + b, 0);
    const ns = Object.values(tpl.s || {}).filter(Boolean).length;
    let html = `<label class="field"><span>Şablon adı</span><input id="tpl-name" data-tpl="${id}" value="${esc(tpl.n)}" maxlength="28"></label>`;
    html += kv([['Saldırı', r1(t.atk)], ['Savunma', r1(t.def)], ['Moral', Math.round(t.org)], ['Hız', t.spd], ['Zırh', Math.round(t.arm)], ['Zırh delme', Math.round(t.prc)], ['Genişlik', t.w], ['Asker', t.mp + 'K'], ['Eğitim', t.days + ' gün']]);
    html += `<p class="muted small" style="margin:0">Teçhizat: ${Object.entries(t.eq).map(([e, n]) => `${Math.round(n)} ${g.EQUIP[e].s.toLowerCase()}`).join(', ')}. Muharebe genişliği arazinin kaldırabileceği tümen sayısını belirler (ovada 80).</p>`;
    let bh = '<div class="list">';
    for (const [k, b] of Object.entries(g.BATS)) {
      const locked = b.req && !c.tech[b.req];
      const n = tpl.b[k] || 0;
      bh += `<div class="item ${locked ? 'locked' : ''}"><div class="grow"><div class="t">${b.n}</div><div class="d">S ${b.atk} · Sv ${b.def} · Moral ${b.org} · Hız ${b.spd} · G ${b.w}${b.arm ? ' · Zırh ' + b.arm : ''}${locked ? ' · teknoloji gerekli' : ''}</div></div><div class="stepper"><button data-act="tplb" data-k="${id}" data-e="${k}" data-v="-1" ${n ? '' : 'disabled'}>−</button><b>${n}</b><button data-act="tplb" data-k="${id}" data-e="${k}" data-v="1" ${locked || nb >= g.MAX_BATS ? 'disabled' : ''}>+</button></div></div>`;
    }
    html += sec('Muharebe taburları', bh + '</div>', `${nb}/${g.MAX_BATS}`);
    let sh = '<div class="list">';
    for (const [k, s] of Object.entries(g.SUPPORTS)) {
      const locked = s.req && !c.tech[s.req];
      const on = !!(tpl.s || {})[k];
      sh += `<button class="toggle ${on ? 'on' : ''}" data-act="tpls" data-k="${id}" data-v="${k}" ${locked || (!on && ns >= g.MAX_SUP) ? 'disabled' : ''} style="${locked ? 'opacity:.45' : ''}"><span><b>${s.n}</b><br><span class="muted small">${s.d}${locked ? ' · teknoloji gerekli' : ''}</span></span><i></i></button>`;
    }
    html += sec('Destek bölükleri', sh + '</div>', `${ns}/${g.MAX_SUP}`);
    if (!g.DEFAULT_TEMPLATES[id]) html += `<button class="btn danger" data-act="tpldel" data-v="${id}">Şablonu sil</button>`;
    html += '<p class="muted small" style="margin:0">Değişiklikler hemen geçerlidir. Mevcut tümenler yeni teçhizat ihtiyacını takviye ile tamamlar.</p>';
    return { title: 'Tümen tasarımcısı', html };
  }

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
    const rel = G.releasable(c.tag);
    if (rel.length) html += sec('Serbest bırakılabilir uluslar', `<div class="list">${rel.map(({ t, n }) => `<div class="item">${G.flag(t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(t))}</div><div class="d">${n} asli eyaleti elimizde</div></div><button class="btn sm pri" data-act="release" data-v="${t}">Kukla olarak kur</button></div>`).join('')}</div>`);
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
    // ticaret ve yardım
    let th = '<div class="list">';
    const emb = st.embargo[c.tag + '>' + tag];
    th += `<button class="item" data-act="embargo" data-v="${tag}"><div class="grow"><div class="t">${emb ? 'Ambargoyu kaldır' : 'Ambargo uygula'}</div><div class="d">Ambargo uygulanan ülke senden kaynak alamaz.</div></div><span class="muted">›</span></button>`;
    if (!atWar) th += `<div class="item"><div class="grow"><div class="t">Ödünç verme-kiralama</div><div class="d">Teçhizat gönder; ilişkiler iyileşir.</div><div class="btns" style="margin-top:6px">${G.LEND.map(([e2, n, nm]) => `<button class="btn sm" data-act="lend" data-k="${tag}" data-e="${e2}" data-v="${n}" ${((e2 === 'conv' ? c.ships.conv : c.stock[e2]) || 0) >= n ? '' : 'disabled'}>${n} ${nm}</button>`).join('')}</div></div></div>`;
    html += sec('Ticaret ve yardım', th + '</div>');
    // istihbarat
    let ih = '<div class="list">';
    for (const [op, O] of Object.entries(G.OPS)) {
      const run = st.ops.find((o) => o.a === c.tag && o.t === tag && o.op === op);
      const r = G.opAllowed(c.tag, tag, op);
      ih += `<div class="item"><div class="grow"><div class="t">${O.n}</div><div class="d">${O.d} · ${O.cost} SG · ${O.days} gün</div>${run ? `<div class="d good">Sürüyor: ${run.d} gün kaldı</div>` : !r.ok ? `<div class="d warn">${esc(r.why)}</div>` : ''}</div>${run ? '' : `<button class="btn sm ${r.ok ? 'pri' : ''}" data-act="op" data-k="${tag}" data-v="${op}" ${r.ok ? '' : 'disabled'}>Başlat</button>`}</div>`;
    }
    html += sec('İstihbarat operasyonları', ih + '</div>');
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
    html += sec('Ekran', `<div class="list"><button class="item" data-act="fullscreen"><div class="grow"><div class="t">Tam ekran ve yatay mod</div><div class="d">Telefonu yan çevirince arayüz otomatik olarak yatay düzene geçer. Bu düğme destekleyen tarayıcılarda tam ekrana geçip ekranı yatay kilitler.</div></div><span class="muted">›</span></button></div>`);
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
  <section class="sec"><h3 class="sec-h">Ordular ve komutanlar</h3><p class="small" style="margin:0">Ordu panelinde tümenlerini ordulara topla ve her orduya bir general ya da mareşal ata. Komutanın saldırı, savunma, planlama ve lojistik becerileri ile özellikleri (Panzer Uzmanı, Kış Uzmanı, Çöl Tilkisi…) muharebeye eklenir. “Savun” emri cepheyi tutar, “Taarruz” emri fırsat buldukça saldırır; “Cephe” düğmesiyle hangi ülkeye karşı savaşacağını seçersin. Komutanlar muharebede tecrübe kazanıp seviye atlar.</p></section>
  <section class="sec"><h3 class="sec-h">Tümen tasarımcısı</h3><p class="small" style="margin:0">Her şablon piyade, topçu, tank, motorize, dağ, süvari ve deniz piyadesi taburlarından ve destek bölüklerinden oluşur. Genişlik, arazinin kaç tümeni aynı anda savaştırabileceğini belirler.</p></section>
  <section class="sec"><h3 class="sec-h">Siyaset</h3><p class="small" style="margin:0">İstikrar fabrika verimini ve siyasi gücü, savaş desteği ise hangi askerlik ve ekonomi yasalarını seçebileceğini belirler. Danışmanlar ve tasarım büroları siyasi güçle atanır. Ulusal ruhlar kalıcı etkilerdir; odaklarla kazanılır ya da kaldırılır. Bir partinin desteği %50'yi geçerse hükümet değişebilir.</p></section>
  <section class="sec"><h3 class="sec-h">Yatay ekran</h3><p class="small" style="margin:0">Telefonu yan çevirdiğinde menü sola, paneller sağa geçer; harita ortada geniş kalır. Menü → Ekran bölümünden tam ekrana geçebilirsin.</p></section>
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
    if (R.sel.fleet) {
      const c = me(); const f = c.fleets.find((x) => x.id === R.sel.fleet);
      if (!f) { R.sel.fleet = null; $('selbar').hidden = true; return; }
      const html2 = `<div class="card-h"><div class="grow"><h3>${esc(f.n)}</h3><div class="muted small">${G.seaName(f.loc)}${f.path.length ? ' · yolda' : ''} · güç ${int(G.fleetPower(c, f))}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>
        <div class="small">${g.SHIPS.filter((e2) => f.sh[e2] >= 0.5).map((e2) => `${Math.round(f.sh[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(' · ')}</div>
        <div class="hint">Bir deniz bölgesine dokunarak filoyu gönder.</div>
        <div class="seg sm">${Object.entries(G.MISSIONS).map(([k, n]) => `<button class="${f.mis === k ? 'on' : ''}" data-act="fleetmis" data-k="${f.id}" data-v="${k}">${n}</button>`).join('')}</div>`;
      const sb = $('selbar'); if (sb.dataset.h !== html2) { sb.innerHTML = html2; sb.dataset.h = html2; }
      sb.hidden = !$('sheet').hidden; return;
    }
    const sel = st.units.filter((u) => R.sel.units.has(u.id));
    if (!sel.length) { R.sel.units.clear(); $('selbar').hidden = true; return; }
    const auto = sel.every((u) => u.auto);
    const locs = new Set(sel.map((u) => u.loc));
    const where = locs.size === 1 ? ([...locs][0] < NP ? G.pname([...locs][0]) : 'Denizde') : `${locs.size} konum`;
    let html = `<div class="card-h"><div class="grow"><h3>${sel.length} tümen seçili</h3><div class="muted small">${esc(where)}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>`;
    html += `<div class="units">${sel.slice(0, 40).map((u) => { const s = G.unitStats(u); return `<button class="ubox on" data-act="unsel" data-v="${u.id}"><b>${s.t.s}</b>${bar(u.str, 'g')}${bar(u.org / s.org)}</button>`; }).join('')}</div>`;
    const c0 = me(); const a0 = sel[0].army && sel.every((u) => u.army === sel[0].army) ? G.armyById(c0, sel[0].army) : null;
    if (a0) { const gen = a0.gen ? G.genById(c0, a0.gen) : null; html += `<div class="small muted">${esc(a0.n)} · ${gen ? esc(gen.n) : 'komutansız'} · emir: ${({ hold: 'Bekle', def: 'Savun', atk: 'Taarruz' })[a0.ord]}</div>`; }
    html += `<div class="hint">${auto ? 'Bu tümenler otomatik kurmayda. Elle yönetmek için Oto’yu kapat.' : 'Hedef eyalete dokun. Düşman eyaleti saldırı başlatır.'}</div>`;
    if (!sel.length) return;
    html += `<div class="btns"><button class="btn sm" data-act="stop">Dur</button><button class="btn sm" data-act="split">Böl</button><button class="btn sm ${auto ? 'pri' : ''}" data-act="selauto">Oto ${auto ? 'açık' : 'kapalı'}</button><button class="btn sm" data-act="selall">Bölgedekilerin tümü</button><button class="btn sm" data-act="selarmy">${a0 ? 'Ordu emirleri' : 'Ordu kur'}</button></div>`;
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
  ACT.alert = (d) => { UI.panel = d.p; UI.sub = d.s || null; $('card').hidden = true; UI.render(true); };
  ACT.close = () => UI.close();
  ACT.back = () => { if (UI.sub) { UI.sub = null; UI.render(true); } else UI.close(); };
  ACT.sub = (d) => { UI.sub = d.v; UI.render(true); };
  ACT.tab = (d) => { UI.tab[d.k] = d.v; UI.render(); };
  ACT.pause = () => { G.st.paused = !G.st.paused; UI.hud(); };
  ACT.speed = (d) => { G.st.speed = +d.v; G.st.paused = 0; UI.hud(); };
  ACT.focus = (d) => { UI.fsel = d.v; UI.render(); };
  ACT.focusgo = (d) => {
    const c = me(); const f = G.focusById(c, d.v);
    if (!G.focusAvailable(c, f)) return;
    if (c.focus.cur && c.focus.p > 5) UI.toast('Önceki odağın ilerlemesi sıfırlandı.', 'warn');
    c.focus.cur = d.v; c.focus.p = 0; UI.fsel = null; UI.render(); UI.toast('Odak başladı: ' + f.n, 'good');
  };
  ACT.focusclose = () => { UI.fsel = null; UI.render(); };
  ACT.hire = (d) => { const c = me(); const r = G.hireAdvisor(c, d.v); UI.toast(r.ok ? `${G.advName(c.tag, d.v)} göreve başladı.` : r.why, r.ok ? 'good' : 'warn'); if (r.ok) UI.sub = null; UI.render(true); UI.hud(); };
  ACT.fireadv = (d) => { G.fireAdvisor(me(), d.v); UI.render(); };
  ACT.law = (d) => { const c = me(); if (c.pp < g.LAW_COST || !G.lawAllowed(c, d.k, +d.v).ok) return; c.pp -= g.LAW_COST; c.laws[d.k] = +d.v; G.recomputeMods(c); UI.sub = null; UI.render(true); UI.toast('Yasa değişti: ' + g.LAWS[d.k].opts[+d.v].n, 'good'); };
  ACT.decide = (d) => { const c = me(), dc = DECISIONS.find((x) => x.id === d.v); if (c.pp < dc.cost) return; c.pp -= dc.cost; c.dec = c.dec || {}; c.dec[dc.id] = G.st.day + dc.cd; dc.fx(c); G.needSummary = 1; G.updateSummaries(); UI.render(); UI.toast(dc.n + ' uygulandı.', 'good'); };
  ACT.auto = (d) => { const c = me(); c.auto[d.v] = c.auto[d.v] ? 0 : 1; UI.render(); };
  ACT.research = (d) => { const c = me(); if (c.res.length >= c.mods.slots) { UI.toast('Boş araştırma yuvası yok. Önce birini iptal et.', 'warn'); return; } G.startResearch(c, d.v); UI.render(); };
  ACT.rescancel = (d) => { const c = me(); c.res = c.res.filter((r) => r.id !== d.v); UI.render(); };
  ACT.line = (d) => {
    const c = me(); const l = c.lines[+d.i]; if (!l) return;
    const fac = g.EQUIP[l.e].fac; const total = fac === 'mil' ? c.sum.mil : c.sum.dock;
    const used = c.lines.filter((x) => g.EQUIP[x.e].fac === fac).reduce((s2, x) => s2 + x.f, 0);
    const v = +d.v;
    if (v > 0 && used >= total) { UI.toast('Boşta fabrika yok. Başka bir hattan azalt.', 'warn'); return; }
    l.f = Math.max(0, l.f + v);
    if (v > 0) l.eff = Math.max(0.1, l.eff * 0.95);
    UI.render();
  };
  ACT.lineup = (d) => { const c = me(); const l = c.lines[+d.v]; l.lv = G.bestLevel(c, l.e); l.eff = Math.max(0.1, l.eff * 0.6); UI.toast(`${g.EQUIP[l.e].n} hattı yeni modele geçti (verim düştü).`, 'good'); UI.render(); };
  ACT.linedel = (d) => { const c = me(); c.lines.splice(+d.v, 1); UI.render(); };
  ACT.dealdel = (d) => { G.cancelDeal(+d.v); G.refreshTradeCache(); UI.render(); };
  ACT.buy = (d) => { const c = me(); const n = Math.max(1, Math.min(+d.n, Math.floor(G.exportFree(d.k, d.v)))); G.addDeal(c.tag, d.k, d.v, n); G.refreshTradeCache(); G.econCalc(c); UI.toast(`${G.cname(d.k)} ile ${g.RES[d.v].toLowerCase()} anlaşması: ${n} birim.`, 'good'); UI.render(); };
  ACT.fleetsel = (d) => { const c = me(); const f = c.fleets.find((x) => x.id === +d.v); R.sel.fleet = f.id; R.sel.units.clear(); R.focusOn(f.loc, 1.4); UI.close(); UI.renderSel(); R.dirty = 1; UI.toast('Filo seçildi: bir deniz bölgesine dokunarak gönder.'); };
  ACT.fleetmis = (d) => { const f = me().fleets.find((x) => x.id === +d.k); f.mis = d.v; if (d.v === 'hold') f.path = []; UI.render(); UI.renderSel(); };
  ACT.fleethome = (d) => { const f = me().fleets.find((x) => x.id === +d.v); const p = G.fleetPath(f.loc, f.home); if (p) { f.path = p; f.prog = 0; } f.mis = 'hold'; UI.render(); UI.renderSel(); };
  ACT.fleetauto = (d) => { for (const f of me().fleets) f.auto = f.id === +d.v ? 1 : 0; UI.render(); };
  ACT.fleetmerge = (d) => {
    const c = me(); const f = c.fleets.find((x) => x.id === +d.v); const o = c.fleets.find((x) => x.id !== f.id && x.loc === f.loc);
    if (!o) { UI.toast('Birleştirmek için başka bir filo aynı deniz bölgesinde olmalı.', 'warn'); return; }
    for (const e2 of g.SHIPS) { o.sh[e2] = (o.sh[e2] || 0) + (f.sh[e2] || 0); }
    c.fleets = c.fleets.filter((x) => x !== f); UI.render();
  };
  ACT.fleetnew = () => {
    const c = me(); const home = G.homeZone(c); if (home < 0) return;
    const sh = {}; for (const e2 of g.SHIPS) { sh[e2] = Math.floor(c.ships[e2] || 0); c.ships[e2] -= sh[e2]; }
    c.fleets.push({ id: G.st.nextId++, n: `${c.fleets.length + 1}. Filo`, loc: home, home, sh, mis: 'hold', path: [], prog: 0 });
    UI.render();
  };
  ACT.aircas = () => { const a = me().air; a.cas = a.cas ? 0 : 1; UI.render(); };
  ACT.airbomb = () => { const c = me(); const opts = ['auto', 'off', ...c.enemies]; const k = opts.indexOf(c.air.bomb); c.air.bomb = opts[(k + 1) % opts.length]; UI.render(); };
  ACT.addline = (d) => { const c = me(); c.lines.push({ e: d.v, f: 0, eff: 0.3, acc: 0, lv: G.bestLevel(c, d.v) }); UI.toast(`${g.EQUIP[d.v].n} hattı eklendi; + ile fabrika ata.`, 'good'); UI.render(); };
  ACT.cup = (d) => { const c = me(); const i = +d.v; [c.constr[i - 1], c.constr[i]] = [c.constr[i], c.constr[i - 1]]; UI.render(); };
  ACT.cdel = (d) => { const c = me(); c.constr.splice(+d.v, 1); UI.render(); };
  ACT.build = (d) => { const c = me(); c.constr.push({ b: d.b, p: +d.v, prog: 0 }); UI.toast(`${g.BUILDINGS[d.b].n} kuyruğa eklendi: ${G.pname(+d.v)}`, 'good'); UI.render(); };
  ACT.quickbuild = (d) => { UI.panel = 'con'; UI.sub = null; UI.render(true); };
  ACT.train = (d) => { const c = me(); const t = G.T(c.tag, d.v); for (let k = 0; k < +d.n; k++) { if (G.manpower(c, true).avail < t.mp) break; c.train.push({ u: d.v, d: t.days, auto: 0 }); } UI.render(); UI.hud(); };
  // ordular
  const armyOf = (id) => G.armyById(me(), +id);
  ACT.armynew = () => {
    const st = G.st, c = me();
    let ids = [...R.sel.units];
    if (!ids.length) ids = st.units.filter((u) => u.t === c.tag && !u.army).slice(0, 24).map((u) => u.id);
    if (!ids.length) { UI.toast('Ordu kurmak için tümen yok.', 'warn'); return; }
    const a = G.createArmy(c, ids);
    for (const u of st.units) if (ids.includes(u.id)) u.auto = 0;
    UI.toast(`${a.n} kuruldu (${ids.length} tümen).`, 'good'); UI.render(); R.dirty = 1;
  };
  ACT.armyadd = (d) => { const c = me(); for (const u of G.st.units) if (R.sel.units.has(u.id) && u.t === c.tag) { u.army = +d.v; u.auto = 0; } UI.toast('Tümenler orduya eklendi.', 'good'); UI.render(); UI.renderSel(); };
  ACT.armydel = (d) => { G.disbandArmy(me(), +d.v); UI.render(); };
  ACT.armyord = (d) => { const a = armyOf(d.k); a.ord = d.v; if (d.v === 'hold') for (const u of G.armyUnits(me(), a.id)) { u.path = []; } UI.toast(`${a.n}: ${({ hold: 'beklemede', def: 'cepheyi savunuyor', atk: 'taarruz emri aldı' })[d.v]}.`, d.v === 'atk' ? 'major' : 'info'); UI.render(); };
  ACT.armyvs = (d) => {
    const st = G.st, c = me(), a = armyOf(d.v);
    const neigh = new Set(); for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag) for (const j of P[i].a) { const t = st.prov[j].c; if (t !== c.tag) neigh.add(t); }
    const opts = [null, ...new Set([...c.enemies, ...neigh])].filter((t) => t === null || st.C[t]?.alive);
    const k = opts.indexOf(a.vs); a.vs = opts[(k + 1) % opts.length]; UI.render();
  };
  ACT.armysel = (d) => { const c = me(); const us = G.armyUnits(c, +d.v); if (!us.length) { UI.toast('Orduda tümen yok.', 'warn'); return; } R.sel.units = new Set(us.map((u) => u.id)); R.focusOn(us[0].loc, 1.8); UI.close(); UI.renderSel(); R.dirty = 1; };
  ACT.setgen = (d) => { const c = me(); for (const a of c.armies) if (a.gen === +d.v) a.gen = null; armyOf(d.k).gen = +d.v; UI.sub = null; UI.render(true); };
  ACT.newgen = () => { const c = me(); if (c.pp < 50) return; c.pp -= 50; const gen = G.newGeneral(c); UI.toast(`${gen.n} göreve başladı.`, 'good'); UI.render(); };
  ACT.tplnew = () => { const c = me(); const tpl = G.templatesOf(c); const id = 't' + G.st.nextId++; tpl[id] = { n: 'Yeni Tümen ' + (Object.keys(tpl).length - 5), b: { inf: 7, art: 2 }, s: {} }; G.invalidateTemplates(c); UI.sub = 'tpl:' + id; UI.render(true); };
  ACT.tplb = (d) => { const c = me(); const t = G.templatesOf(c)[d.k]; const n = (t.b[d.e] || 0) + +d.v; if (n <= 0) delete t.b[d.e]; else t.b[d.e] = n; if (!Object.keys(t.b).length) t.b.inf = 1; G.invalidateTemplates(c); UI.render(); };
  ACT.tpls = (d) => { const c = me(); const t = G.templatesOf(c)[d.k]; t.s = t.s || {}; if (t.s[d.v]) delete t.s[d.v]; else t.s[d.v] = 1; G.invalidateTemplates(c); UI.render(); };
  ACT.tpldel = (d) => { const c = me(); delete G.templatesOf(c)[d.v]; for (const u of G.st.units) if (u.t === c.tag && u.u === d.v) u.u = 'inf'; c.train = c.train.filter((t) => t.u !== d.v); G.invalidateTemplates(c); UI.sub = null; UI.render(true); };
  document.addEventListener('change', (e) => { if (e.target.id === 'tpl-name') { const c = me(); const t = G.templatesOf(c)[e.target.dataset.tpl]; if (t) { t.n = e.target.value.trim() || t.n; G.invalidateTemplates(c); } } });
  ACT.selarmy = () => {
    const c = me(); const sel = G.st.units.filter((u) => R.sel.units.has(u.id));
    const a0 = sel[0]?.army;
    if (a0 && sel.every((u) => u.army === a0)) { UI.open('army'); return; }
    ACT.armynew();
  };
  ACT.tdel = (d) => { me().train.splice(+d.v, 1); UI.render(); };
  ACT.allauto = () => { const st = G.st; const mine = st.units.filter((u) => u.t === st.player); const on = !mine.every((u) => u.auto); for (const u of mine) { u.auto = on ? 1 : 0; if (!on) { /* elle */ } } UI.render(); UI.toast(on ? 'Tüm tümenler otomatik kurmaya devredildi.' : 'Tümenler senin komutanda.', 'info'); };
  ACT.selgroup = (d) => { const st = G.st; const loc = +d.v; R.sel.units = new Set(st.units.filter((u) => u.t === st.player && u.loc === loc).map((u) => u.id)); R.focusOn(loc, 2.2); UI.close(); UI.renderSel(); R.dirty = 1; };
  ACT.selprov = (d) => ACT.selgroup(d);
  ACT.closecard = () => { $('card').hidden = true; R.sel.prov = -1; R.dirty = 1; };
  ACT.opencountry = (d) => { UI.panel = 'dip'; UI.sub = 'c:' + d.v; UI.render(true); };
  ACT.showc = (d) => { const c = G.st.C[d.v]; if (c.cap >= 0) R.focusOn(c.cap, 1.5); UI.close(); };
  ACT.clearsel = () => { R.sel.fleet = null; R.sel.units.clear(); $('selbar').hidden = true; R.dirty = 1; };
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
  ACT.embargo = (d) => { const st = G.st, k = me().tag + '>' + d.v; if (st.embargo[k]) delete st.embargo[k]; else { st.embargo[k] = 1; st.deals = st.deals.filter((x) => !(x.e === me().tag && x.i === d.v)); } G.refreshTradeCache(); UI.render(); };
  ACT.lend = (d) => { const ok = G.lend(me().tag, d.k, d.e, +d.v); UI.toast(ok ? `${G.cname(d.k)} ülkesine gönderildi.` : 'Yeterli stok yok.', ok ? 'good' : 'warn'); UI.render(); };
  ACT.op = (d) => { const r = G.startOp(me().tag, d.k, d.v); UI.toast(r.ok ? `${G.OPS[d.v].n} başladı.` : r.why, r.ok ? 'good' : 'warn'); UI.render(); };
  ACT.release = (d) => { const ok = G.makePuppet(me().tag, d.v); UI.toast(ok ? `${G.cname(d.v)} kukla devlet olarak kuruldu.` : 'Kurulamadı.', ok ? 'good' : 'warn'); G.mapDirty = 1; UI.render(); };
  ACT.save = (d) => { const ok = G.saveGame(d.v); UI.toast(ok ? 'Oyun kaydedildi.' : 'Kayıt başarısız: tarayıcı depolaması kullanılamıyor.', ok ? 'good' : 'bad'); UI.render(); };
  ACT.load = (d) => { const ok = G.loadGame(d.v); UI.toast(ok ? 'Kayıt yüklendi.' : 'Kayıt yüklenemedi.', ok ? 'good' : 'bad'); if (ok) { UI.close(); UI.enterGame(); } };
  ACT.setmode = (d) => { R.setMode(d.v); UI.render(); UI.hud(); };
  ACT.mapmode = () => { const order = ['pol', 'terrain', 'ind', 'fac']; R.setMode(order[(order.indexOf(R.mode) + 1) % order.length]); UI.toast('Harita modu: ' + { pol: 'Siyasi', terrain: 'Arazi', ind: 'Sanayi', fac: 'İttifaklar' }[R.mode]); UI.hud(); };
  ACT.setting = (d) => { if (d.v === 'hist') G.st.opts.hist = G.st.opts.hist ? 0 : 1; else UI.settings[d.v] = UI.settings[d.v] ? 0 : 1; UI.render(); };
  ACT.newgame = () => { UI.close(); G.st.paused = 1; UI.showStart(); };
  ACT.fullscreen = async () => {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen());
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
      UI.toast('Yatay mod açık.', 'good');
    } catch (e) { UI.toast('Bu tarayıcı tam ekranı/kilidi desteklemiyor. Telefonu yan çevirmen yeterli.', 'warn'); }
    setTimeout(() => R.resize(), 300);
  };
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
