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

  const UI = (G.UI = { panel: null, sub: null, tab: { res: 'ind', dip: 'near', train: 'inf' }, cardProv: -1, modalOpen: 0, settings: { autosave: 1, news: 1 } });

  // ---------- Bildirim ----------
  UI.toast = (msg, kind = 'info') => {
    const box = $('toasts');
    const fade = (el) => () => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); };
    for (const el of box.children) if (el.textContent === msg) { clearTimeout(el._t); el._t = setTimeout(fade(el), 3200); return; }
    const el = document.createElement('div');
    el.className = 'toast t-' + kind; el.textContent = msg;
    el.onclick = () => el.remove();
    box.prepend(el);
    while (box.children.length > 2) box.lastChild.remove();
    el._t = setTimeout(fade(el), 3200);
  };

  // ---------- Üst şerit ----------
  UI.hud = () => {
    const st = G.st, c = me(); if (!c) return;
    const hc = $('hud-country');
    const key = c.tag + c.alive;
    if (hc.dataset.k !== key) { hc.innerHTML = `<span class="hud-flag">${G.flag(c.tag, 54, 36)}</span><b>${esc(G.cname(c.tag))}</b>`; hc.dataset.k = key; }
    $('hud-date').textContent = G.fmtDate(st.day);
    const s = c.sum, e = c.econ || {};
    const divs = st.units.reduce((n, u) => n + (u.t === c.tag), 0);
    const milA0 = c.lines.reduce((a, l) => a + (g.EQUIP[l.e].fac === 'mil' ? l.f : 0), 0);
    const civUsed = Math.max(0, s.civ - (e.civFree || 0));
    const fo = fuelOf(c);
    // HOI4 üst çubuğu: simge + değer; dokununca açıklama
    const res = [
      ['pp', int(c.pp), '', 'Siyasi güç', `+${(c.ppDay || 2).toFixed(2)}/gün`],
      ['stab', pct(c.stab ?? 0.5), (c.stab ?? 0.5) < 0.4 ? 'neg' : '', 'İstikrar', ''],
      ['ws', pct(c.ws ?? 0.2), '', 'Savaş desteği', ''],
      ['mp', G.fmtMP(c.mpAvail || 0), (c.mpAvail || 0) < 30 ? 'neg' : '', 'Kullanılabilir insan gücü', ''],
      ['civ', `${civUsed}/${s.civ}`, '', 'Sivil fabrikalar (kullanılan/toplam)', `${e.civFree || 0} inşaatta, kalanı tüketim malı ve ticarette`],
      ['mil', `${milA0}/${s.mil}`, s.mil - milA0 > 0 ? 'warn' : '', 'Askerî fabrikalar (atanan/toplam)', ''],
      ['dock', s.dock, '', 'Tersaneler', ''],
      ['steel', `${int(s.steel)}/${int(e.needSteel || 0)}`, (e.rS ?? 1) < 1 ? 'neg' : '', 'Çelik (eldeki/gereken)', ''],
      ['oil', `${int(s.oil)}/${int(e.needOil || 0)}`, (e.rO ?? 1) < 1 ? 'neg' : '', 'Petrol (eldeki/gereken)', ''],
      ['fuel', `${int(fo.fuel)}`, G.fuelRatio(c) < 1 ? 'neg' : '', 'Yakıt stoku', `kapasite ${int(fo.cap)}`],
      ['conv', int(c.ships?.conv || 0), '', 'Konvoylar', ''],
      ['div', divs + (c.train.length ? `+${c.train.length}` : ''), '', 'Tümenler (+eğitimde)', ''],
      ['tension', '%' + Math.round(st.tension), st.tension > 50 ? 'neg' : '', 'Dünya gerginliği', ''],
    ];
    if (c.enemies.length) res.push(['war', c.enemies.length, 'neg', 'Savaşta olunan ülkeler', c.enemies.map((t) => G.cname(t)).join(', ')]);
    UI._resInfo = Object.fromEntries(res.map(([k, v, , n, d]) => [k, `${n}: ${v}${d ? ' · ' + d : ''}`]));
    const hr = res.map(([k, v, cl, n]) => `<button class="res ${cl}" data-act="resinfo" data-k="${k}" title="${n}">${G.ico(k)}<b>${v}</b></button>`).join('');
    if ($('hud-res').dataset.h !== hr) { $('hud-res').innerHTML = hr; $('hud-res').dataset.h = hr; }
    // HOI4 tarzı uyarılar: yuvarlak simgeler (dokununca ilgili panel + açıklama)
    const al = [];
    if (st.conf) al.push(['peace', '', 'Barış konferansı sürüyor', 'peace']);
    if (!c.focus.cur && G.focusList(c).some((f) => G.focusAvailable(c, f))) al.push(['pol', 'tree', 'Odak seçilmedi', 'focus']);
    if (c.res.length < c.mods.slots) al.push(['res', '', `${c.mods.slots - c.res.length} boş araştırma`, 'res', c.mods.slots - c.res.length]);
    const milA = milA0;
    if (s.mil - milA > 0) al.push(['prod', '', `${s.mil - milA} boşta fabrika`, 'mil', s.mil - milA]);
    if (!c.constr.length && (e.civFree || 0) > 0) al.push(['con', '', 'İnşaat kuyruğu boş', 'con']);
    const shortR = g.RES_KEYS.filter((r) => (e.ratio || {})[r] < 0.95);
    if (shortR.length) al.push(['trade', '', `Kaynak açığı: ${shortR.map((r) => g.RES[r]).join(', ')}`, 'steel', shortR.length]);
    if (fuelOf(c).fr < 0.2) al.push(['trade', '', 'Yakıt azalıyor', 'fuel']);
    const freeAdv = Object.entries(g.ADV_SLOTS).some(([r, n]) => (c.adv[r] || []).length < n);
    if (freeAdv && c.pp >= 180) al.push(['pol', '', 'Danışman atanabilir', 'adv']);
    if (c.enemies.length) {
      const idle = st.units.filter((u) => u.t === c.tag && !u.army && !u.auto && !u.path.length).length;
      if (idle > 3) al.push(['army', '', `${idle} emirsiz tümen`, 'div', idle]);
    }
    const ah = al.map(([p, sub, n, ic, cnt]) => `<button class="alert ${['peace', 'focus', 'res'].includes(ic) ? 'a-hi' : ''}" data-act="alert" data-p="${p}" data-s="${sub}" data-n="${esc(n)}" title="${esc(n)}" aria-label="${esc(n)}">${G.ico(ic)}${cnt > 1 ? `<em>${cnt}</em>` : ''}</button>`).join('');
    const box = $('hud-alerts');
    if (box && box.dataset.h !== ah) { box.innerHTML = ah; box.dataset.h = ah; box.hidden = !ah; }
    const pause = $('btn-pause');
    pause.classList.toggle('paused', !!st.paused);
    document.querySelectorAll('.speed [data-act=speed]').forEach((b) => { b.classList.toggle('on', +b.dataset.v <= st.speed); b.classList.toggle('cur', +b.dataset.v === st.speed); });
    $('btn-mapmode').title = UI.MODE_N[R.mode];
    UI.placeToasts();
  };
  // bildirimler üst şeridin (uyarılar dahil) altında çıkar; uyarıların önünü kapatmaz
  UI.placeToasts = () => {
    const hud = $('hud'); if (!hud || hud.hidden) return;
    const b = Math.round(hud.getBoundingClientRect().bottom);
    if (b !== UI._hudB) { UI._hudB = b; document.documentElement.style.setProperty('--hud-b', b + 'px'); }
  };
  g.addEventListener('resize', () => setTimeout(() => UI.placeToasts && UI.placeToasts(), 60));

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
    sheet.classList.toggle('half', UI.panel === 'peace');
    // odak ağacı HOI4'teki gibi tam ekran açılır (dikeyde ve yatayda)
    sheet.classList.toggle('full', UI.panel === 'pol' && UI.sub === 'tree');
    // dikey ekranda panel büyütülebilir (tasarımcılar ve uzun listeler için)
    sheet.classList.toggle('tall', !!UI.tall && UI.panel !== 'peace');
    $('sheet-tall').textContent = UI.tall ? '⤡' : '⤢';
    $('sheet-tall').setAttribute('aria-label', UI.tall ? 'Paneli küçült' : 'Paneli büyüt');
    const ft = body.querySelector('.ftree');
    if (!reset) { body.scrollTop = scroll; if (ft && UI.ftScroll) { ft.scrollLeft = UI.ftScroll[0]; ft.scrollTop = UI.ftScroll[1]; } }
    else {
      body.scrollTop = 0;
      if (ft) { const n = ft.querySelector('.fn.active') || ft.querySelector('.fn.avail'); if (n) { ft.scrollLeft = Math.max(0, n.offsetLeft - ft.clientWidth / 2 + n.offsetWidth / 2); ft.scrollTop = Math.max(0, n.offsetTop - 40); } }
    }
    if (ft) {
      // yatay ekranda ayrıntı paneli ağacın hizasından başlar
      const fd = body.querySelector('.fdetail'); if (fd && sheet.classList.contains('full') && innerWidth > innerHeight) fd.style.top = ft.offsetTop + 'px';
      ft.onscroll = () => { UI.ftScroll = [ft.scrollLeft, ft.scrollTop]; };
      // iki parmakla yakınlaştırma (odak ağacı)
      let pd = 0;
      const dist = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      ft.ontouchstart = (e) => { if (e.touches.length === 2) pd = dist(e); };
      ft.ontouchmove = (e) => {
        if (e.touches.length !== 2 || !pd) return;
        e.preventDefault();
        const r = dist(e) / pd; if (r > 0.8 && r < 1.25) return;
        const rc = ft.getBoundingClientRect(), mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rc.left, my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rc.top;
        const z = UI.ftZoom(); let i = FT_Z.findIndex((x) => x >= z - 0.001); if (i < 0) i = FT_Z.length - 1;
        const nz = FT_Z[Math.max(0, Math.min(FT_Z.length - 1, i + (r > 1 ? 1 : -1)))];
        pd = 0; if (nz !== z) UI.ftSetZoom(nz, mx, my);
      };
    }
    for (const cv of body.querySelectorAll('canvas.nato')) { const x = cv.getContext('2d'); x.fillStyle = cv.dataset.c; x.fillRect(0, 0, cv.width, cv.height); R.drawNato(x, cv.dataset.k, 8, 6, 28, 18, R.luminance(cv.dataset.c) > 0.55 ? '#14160f' : '#f4efe0'); }
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
    if (UI.sub === 'dec') return decView(c);
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
    html += electionSection(c);
    // ulusal ruhlar
    const sp = c.spirits.filter((s) => g.SPIRITS[s]);
    if (G.BOP && G.BOP[c.tag] && c.bop != null) html += bopHtml(c);
    html += sec('Ulusal ruhlar', sp.length ? `<div class="list">${sp.map((s) => spiritHtml(s, c)).join('')}</div>` : '<p class="muted small" style="margin:0">Etkin ulusal ruh yok.</p>', sp.length ? `${sp.length}` : '');
    // odak
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    let fh = cur ? `<div class="item active"><div class="grow"><div class="t">${esc(cur.n)}</div><div class="d">${esc(cur.d)}</div>${bar(c.focus.p / G.focusDays(cur))}<div class="d">${Math.ceil(G.focusDays(cur) - c.focus.p)} gün kaldı</div></div></div>` : `<div class="item"><div class="grow"><div class="t warn">Odak seçilmedi</div><div class="d">Odaklar 35 ya da 70 günde tamamlanır ve kalıcı etki verir.</div></div></div>`;
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
      const o = L.opts[c.laws[k] ?? 1] || L.opts[0];
      lh += `<button class="item" data-act="sub" data-v="law:${k}"><div class="grow"><div class="d">${L.n}</div><div class="t">${o.n}</div><div class="d">${o.d}</div></div><span class="muted">›</span></button>`;
    }
    html += sec('Yasalar', lh + '</div>');
    // kararlar: ayrıntılar alt görünümde (UI.sub === 'dec')
    const nAv = g.DECISIONS.filter((d) => G.decVisible(c, d) && G.decAvailable(c, d).ok).length;
    let dh = '';
    if ((c.dec || []).length) dh += `<div class="list">${c.dec.map((x) => decActiveCard(c, x)).join('')}</div>`;
    dh += `<button class="btn pri" data-act="sub" data-v="dec">Kararları aç · ${nAv} alınabilir</button>`;
    html += sec('Kararlar', dh, `${(c.dec || []).length} süren`);
    const t = (k, n, d2) => `<button class="toggle ${c.auto[k] ? 'on' : ''}" data-act="auto" data-v="${k}"><span><b>${n}</b><br><span class="muted small">${d2}</span></span><i></i></button>`;
    html += sec('Yardımcı bakanlar', `<div class="list">${t('focus', 'Odak bakanı', 'Sıradaki odağı otomatik seçer')}${t('res', 'Bilim bakanı', 'Boş araştırma yuvalarını doldurur')}${t('prod', 'Sanayi bakanı', 'Üretim hatlarını dengeler')}${t('con', 'Bayındırlık bakanı', 'İnşaat kuyruğunu doldurur')}</div>`);
    return { title: 'Siyaset', html };
  };

  // ---------- Kararlar ----------
  const decDur = (d) => (d.once ? 'Tek seferlik' : d.cd ? `Bekleme ${d.cd} gün` : '');
  // kararın etkileri: süreli değiştirici, anlık etkiler, bitince gelen ulusal ruh
  const decFx = (d) => {
    let h = '';
    const ch = fxChips(d.mod);
    if (ch) h += `<div class="fxl">${d.days > 0 ? '<span class="dec-lbl">Süre boyunca</span>' : ''}${ch}</div>`;
    for (const t of d.fxd || []) h += `<div class="d good">${esc(t)}</div>`;
    const S = d.spAdd && g.SPIRITS[d.spAdd];
    if (S) h += `<div class="d">Ulusal ruh${d.days > 0 ? ' (bitince)' : ''}: <b>${esc(S.n)}</b></div><div class="fxl">${fxChips(S.fx)}</div>`;
    const R = d.spRm && g.SPIRITS[d.spRm];
    if (R) h += `<div class="d good">Kaldırır: ${esc(R.n)}</div>`;
    return h;
  };
  const decActiveCard = (c, x) => {
    const d = g.DEC_BY_ID[x.id]; if (!d) return '';
    const st = G.st, left = Math.max(0, Math.ceil(x.e - st.day));
    return `<div class="item dec active"><div class="grow"><div class="dec-h"><div class="t">${esc(d.n)}${x.t ? ' · ' + esc(G.cname(x.t)) : ''}</div><span class="muted small">${left} gün kaldı</span></div>${bar((st.day - x.s) / Math.max(1, x.e - x.s))}${decFx(d)}</div></div>`;
  };
  const decCard = (c, d) => {
    const r = G.decAvailable(c, d), tg = d.targets ? d.targets(c) : null;
    let h = `<div class="item dec ${r.ok ? '' : 'off'}"><div class="grow"><div class="dec-h"><div class="t">${esc(d.n)}</div><span class="dec-cost ${c.pp >= d.cost ? '' : 'bad'}">${d.cost} SG</span></div><div class="d">${esc(d.d)}</div>${decFx(d)}`;
    h += `<div class="d">${[d.days > 0 ? d.days + ' gün sürer' : 'Anında', decDur(d)].filter(Boolean).join(' · ')}</div>`;
    if (!r.ok) h += `<div class="d warn">${esc(r.why)}</div>`;
    if (tg) h += `<div class="dec-tg">${tg.map((t) => `<button class="btn sm" data-act="decide" data-v="${d.id}" data-t="${t}" ${G.decAvailable(c, d, t).ok ? '' : 'disabled'}>${G.flag(t, 18, 12)} ${esc(G.cname(t))}</button>`).join('')}</div>`;
    else h += `<button class="btn sm ${r.ok ? 'pri' : ''}" data-act="decide" data-v="${d.id}" ${r.ok ? '' : 'disabled'}>Al · ${d.cost} SG</button>`;
    return h + '</div></div>';
  };
  function decView(c) {
    const vis = g.DECISIONS.filter((d) => G.decVisible(c, d));
    let html = kv([['Siyasi güç', int(c.pp)], ['Günlük', '+' + r1(c.ppDay || 2)], ['Süren', (c.dec || []).length]]);
    if ((c.dec || []).length) html += sec('Süren kararlar', `<div class="list">${c.dec.map((x) => decActiveCard(c, x)).join('')}</div>`);
    for (const [cat, name] of Object.entries(g.DEC_CATS)) {
      const L = vis.filter((d) => d.cat === cat && !G.decActive(c, d.id) && (c.decCd[d.id] || 0) < 1e8);
      if (!L.length) continue;
      const ok = L.map((d) => [d, G.decAvailable(c, d).ok ? 0 : 1]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
      html += sec(name, `<div class="list">${ok.map((d) => decCard(c, d)).join('')}</div>`, `${L.filter((d) => G.decAvailable(c, d).ok).length}/${L.length}`);
    }
    const once = vis.filter((d) => (c.decCd[d.id] || 0) >= 1e8);
    if (once.length) html += sec('Uygulananlar', `<p class="muted small" style="margin:0">${once.map((d) => esc(d.n)).join(' · ')}</p>`);
    return { title: 'Kararlar', html };
  }

  function advPicker(c, role) {
    let html = `<p class="muted small" style="margin:0">${g.ADV_ROLE_N[role]}: yuva ${(c.adv[role] || []).length}/${g.ADV_SLOTS[role]}. Elinde ${int(c.pp)} siyasi güç var.</p><div class="list">`;
    for (const [type, a] of Object.entries(g.ADV_TYPES)) {
      if (a.r !== role) continue;
      const r = G.canHire(c, type);
      html += `<div class="item"><div class="grow"><div class="t">${esc(G.advName(c.tag, type))}</div><div class="d">${a.n} · ${a.d}</div>${!r.ok ? `<div class="d warn">${r.why}</div>` : ''}</div><button class="btn sm ${r.ok ? 'pri' : ''}" data-act="hire" data-v="${type}" ${r.ok ? '' : 'disabled'}>${G.advCost(c, type)} SG</button></div>`;
    }
    return { title: g.ADV_ROLE_N[role], html: html + '</div>' };
  }

  // odak türü (HOI4'teki simge renkleri): sanayi, kara, hava/deniz, siyaset, diplomasi
  const FOCUS_ICO = { ind: 'civ', land: 'tank', sea: 'navy', pol: 'pp', dip: 'hand' };
  const FOCUS_CAT = { ind: ['Sanayi', '#d6aa4c'], land: ['Kara kuvvetleri', '#c9614a'], sea: ['Hava ve deniz', '#5f9bd0'], pol: ['Siyaset', '#a783d1'], dip: ['Diplomasi', '#6dba73'] };
  const focusCat = (f) => {
    const fx = f.fx || {}, k = Object.keys(fx), fn = Array.isArray(fx.fn) ? fx.fn[0] : '';
    if (['demand', 'demandMany', 'guar', 'invite', 'joinFac', 'mkFac', 'pact', 'goal', 'gift'].includes(fn)) return 'dip';
    if (k.some((x) => ['addCiv', 'addMil', 'construct', 'factory', 'effCap', 'addInfra', 'synth', 'stock', 'steel', 'oil', 'al', 'rub', 'tun', 'chr', 'research'].includes(x)) || (fx.rb || []).some((r) => r[0] === 'ind' || r[0] === 'elec')) return 'ind';
    if (k.some((x) => ['addPlanes', 'addBombers', 'addCas', 'air', 'navy', 'ships', 'addDock', 'addConv', 'invasion'].includes(x)) || (fx.rb || []).some((r) => r[0] === 'air' || r[0] === 'nav')) return 'sea';
    if (k.some((x) => ['landAtk', 'landDef', 'armAtk', 'org', 'units', 'forts', 'tech', 'plan', 'entrench', 'brk', 'train', 'mp', 'speed', 'xpGain'].includes(x)) || fn === 'general' || fn === 'fortRegion' || (fx.rb || []).length) return 'land';
    return 'pol';
  };
  // varsayılan yakınlaştırma: dikeyde birkaç sütun, yatayda daha fazlası sığsın
  const FT_Z = [0.45, 0.6, 0.75, 0.9, 1.1];
  UI.ftZoom = () => UI.ftZ || (innerWidth < innerHeight ? 0.6 : 0.75);
  function focusTree(c) {
    const list = G.focusList(c);
    const k = UI.ftZoom(), mini = k < 0.6;
    // genişlik yakınlaştırmayla ölçeklenir; yükseklik yazı boyuna göre sabit (iki satır başlık + süre)
    const fz = k < 0.6 ? 10 : k < 0.7 ? 10.5 : k < 0.85 ? 11.5 : 12.5;
    const NW = Math.round((mini ? 104 : 140) * k), NH = mini ? 34 : Math.round(fz * 2.4 + 30), GX = NW + Math.round(Math.max(8, 14 * k)), GY = NH + (mini ? 18 : 26), PAD = 12;
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
          // yatay parça hedefin hemen üstündeki boşluktan geçer: aradaki düğümlerin üstünü çizmez
          const x1 = s.x + NW / 2, y1 = s.y + NH, x2 = b.x + NW / 2, y2 = b.y, my = y2 - Math.round((GY - NH) / 2);
          const done = c.focus.done[pid];
          lines += `<path d="M${x1} ${y1}V${my}H${x2}V${y2}" class="${done ? 'ln done' : 'ln'}${Array.isArray(p) ? ' or' : ''}"/>`;
        }
      }
      for (const e of f.excl || []) {
        const o = byId[e]; if (!o || o.id < f.id || o.y !== f.y) continue;
        const a = pos(f), b2 = pos(o);
        const x = (Math.min(a.x, b2.x) + NW + Math.max(a.x, b2.x)) / 2, y = a.y + NH / 2;
        lines += `<g class="excl"><circle cx="${x}" cy="${y}" r="${mini ? 7 : 9}"/><text x="${x}" y="${y + 4}" text-anchor="middle">⇄</text></g>`;
      }
    }
    let nodes = '';
    for (const f of list) {
      const p = pos(f);
      const done = c.focus.done[f.id], active = c.focus.cur === f.id, avail = G.focusAvailable(c, f), excl = G.focusExcluded(c, f) && !done;
      const cls = done ? 'done' : active ? 'active' : excl ? 'excl' : avail ? 'avail' : 'locked';
      const cat = FOCUS_CAT[focusCat(f)][1];
      const days = active ? `${Math.ceil(G.focusDays(f) - c.focus.p)} gün kaldı` : done ? 'Tamamlandı' : `${G.focusDays(f)} gün`;
      nodes += `<button class="fn ${cls}${UI.fsel === f.id ? ' sel' : ''}" style="left:${p.x}px;top:${p.y}px;width:${NW}px;height:${NH}px;--fc:${cat}" data-act="focus" data-v="${f.id}" aria-label="${esc(f.n)}">${G.ico ? G.ico(FOCUS_ICO[focusCat(f)], 'fic') : ''}<span class="t">${done ? '✓ ' : ''}${esc(f.n)}</span>${mini ? '' : `<span class="dd">${days}</span>`}${active ? `<i class="fp" style="width:${(c.focus.p / G.focusDays(f) * 100).toFixed(0)}%"></i>` : ''}</button>`;
    }
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    const nAvail = list.filter((f) => G.focusAvailable(c, f)).length;
    let html = `<div class="ftbar"><button class="btn sm" data-act="ftzoom" data-v="-1" aria-label="Uzaklaştır" ${k <= FT_Z[0] ? 'disabled' : ''}>−</button><button class="btn sm" data-act="ftzoom" data-v="1" aria-label="Yakınlaştır" ${k >= FT_Z[FT_Z.length - 1] ? 'disabled' : ''}>+</button><button class="btn sm ${nAvail && !cur ? 'pri' : ''}" data-act="ftnext">Seçilebilir (${nAvail}) ›</button><span class="muted small">${Object.keys(c.focus.done).length}/${list.length}</span>${cur ? `<span class="ftcur" data-act="focus" data-v="${cur.id}"><b>${esc(cur.n)}</b> · ${Math.ceil(G.focusDays(cur) - c.focus.p)} gün</span>` : ''}<div class="ftleg">${Object.values(FOCUS_CAT).map(([n, col]) => `<span><i style="background:${col}"></i>${n}</span>`).join('')}<span>⇄ birbirini dışlar</span></div></div>`;
    html += `<div class="ftree ${mini ? 'compact' : ''}" id="ftree" style="--fz:${fz}px"><div class="ftree-in" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${lines}</svg>${nodes}</div></div>`;
    const sf = UI.fsel ? G.focusById(c, UI.fsel) : null;
    if (sf) {
      const done = c.focus.done[sf.id], active = c.focus.cur === sf.id, avail = G.focusAvailable(c, sf);
      const why = done ? 'Tamamlandı.' : active ? `Sürüyor: ${Math.ceil(G.focusDays(sf) - c.focus.p)} gün kaldı.` : avail ? `${G.focusDays(sf)} gün sürer.` : G.focusExcluded(c, sf) ? 'Seçtiğin başka bir odak bunu dışlıyor.' : !G.focusPreOk(c, sf) ? 'Önce bağlı olduğu odakları tamamla: ' + sf.pre.flat().filter((p) => !c.focus.done[p]).map((p) => G.focusById(c, p)?.n || p).join(', ') + '.' : G.focusReq(c, sf).why + '.';
      const addS = sf.fx.spirit && g.SPIRITS[sf.fx.spirit];
      const rmS = c.spirits.filter((s) => g.SPIRITS[s] && (sf.fx.rmSpirit === s || (g.SPIRITS[s].rm || []).includes(sf.id))).map((s) => g.SPIRITS[s].n);
      const hev = G.EV_OF_FOCUS && G.EV_OF_FOCUS[sf.id] && G.EVENTS.find((e) => e.id === G.EV_OF_FOCUS[sf.id]);
      const histD = hev && !done ? `<div class="d muted">Tarihte: ${esc(hev.title)} · ${G.fmtDate(hev.day)}${G.st.ev[hev.id] ? ' (gerçekleşti)' : ''}</div>` : '';
      const sfx = histD + (addS ? `<div class="d">Ulusal ruh ekler: <b>${esc(addS.n)}</b></div><div class="fxl">${fxChips(addS.fx)}</div>` : '') + (rmS.length && !done ? `<div class="d good">Kaldırır: ${rmS.map(esc).join(', ')}</div>` : '');
      html += `<div class="fdetail"><div class="row"><div class="grow"><div class="t">${esc(sf.n)}</div><div class="d"><span class="fcat" style="--fc:${FOCUS_CAT[focusCat(sf)][1]}">${FOCUS_CAT[focusCat(sf)][0]}</span> ${esc(sf.d)}</div>${fxParts(sf.fx).length ? `<div class="fxl">${fxChips(sf.fx)}</div>` : ''}${sfx}<div class="d ${avail ? 'good' : 'warn'}">${why}</div></div><button class="x" data-act="focusclose" aria-label="Kapat" style="width:32px;height:32px;color:var(--muted)">✕</button></div>${avail ? `<button class="btn pri" data-act="focusgo" data-v="${sf.id}">${c.focus.cur ? 'Bu odağa geç' : 'Odağı başlat'}</button>` : ''}</div>`;
    }
    return { title: g.FOCUS_NATIONAL[c.tag] ? `${G.cname(c.tag)} odak ağacı` : 'Odak ağacı', html };
  }

  function lawPicker(c, k) {
    const L = g.LAWS[k];
    let html = `<p class="muted small" style="margin:0">Yasa değişikliği ${g.LAW_COST} siyasi güç ister. Seçenekler savaş desteğine (şu an ${pct(c.ws ?? 0)}) bağlıdır; bazıları yalnızca savaşta açılır.</p><div class="list">`;
    L.opts.forEach((o, i) => {
      const cur = (c.laws[k] ?? 1) === i;
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
        sh += `<div class="item active${UI.resFlash === r.id ? ' slot-in' : ''}"><div class="grow"><div class="t">${esc(t.n)}</div>${bar(r.p / cost)}<div class="d">${days} gün kaldı</div></div><button class="btn sm" data-act="rescancel" data-v="${r.id}" aria-label="İptal">✕</button></div>`;
      } else sh += `<button class="item slot-empty" data-act="slotpick"><div class="grow"><div class="t">＋ Boş araştırma yuvası</div><div class="d">Dokun: seçilebilir teknolojiler yansın</div></div></button>`;
    }
    if ((c.rb || []).length) sh += `<div class="d good" style="font-size:13px">Araştırma bonusları: ${c.rb.map(([cat, v]) => `${g.TECH_CATS[cat]} +%${Math.round(v * 100)}`).join(' · ')}</div>`;
    html += sec('Araştırma yuvaları', sh + '</div>', `Hız +%${Math.round((m.research || 0) * 100)}`);
    const tab = UI.tab.res;
    const freeSlot = c.res.length < m.slots, glow = UI.slotPick && Date.now() - UI.slotPick < 4000;
    const nAv = (k) => g.TECHS.filter((x) => x.cat === k && G.techAvailable(c, x.id) && !c.res.some((r) => r.id === x.id)).length;
    html += `<div class="tabs" id="res-tabs">${Object.entries(g.TECH_CATS).map(([k, n]) => { const a = freeSlot ? nAv(k) : 0; return `<button class="${k === tab ? 'on' : ''}${a && glow ? ' glow' : ''}" data-act="tab" data-k="res" data-v="${k}">${n}${a ? ` <span class="tcount">${a}</span>` : ''}</button>`; }).join('')}<button class="${tab === 'proj' ? 'on' : ''}" data-act="tab" data-k="res" data-v="proj">Projeler</button></div>`;
    if (tab === 'proj') return { title: 'Araştırma', html: html + projHtml(c) };
    const yr = G.year(G.st.day);
    let lh = '<div class="list">';
    if (tab === 'doc') lh += `<p class="muted small" style="margin:0">HOI4'teki gibi dört kara doktrini dalından yalnızca birini izleyebilirsin: ${Object.values(g.DOC_TREES).join(', ')}. İlk araştırma dalı belirler.${G.docTree(c) ? ` Seçilen dal: <b>${g.DOC_TREES[G.docTree(c)]}</b>.` : ''}</p>`;
    for (const t of g.TECHS.filter((x) => x.cat === tab).sort((a, b) => (G.docTreeOf(a.id) || 'z').localeCompare(G.docTreeOf(b.id) || 'z') || a.year - b.year)) {
      const done = c.tech[t.id], active = c.res.some((r) => r.id === t.id), avail = G.techAvailable(c, t.id);
      const cost = G.techCost(c, t.id);
      const ahead = t.year > yr ? ` · <span class="warn">${t.year - yr} yıl erken</span>` : '';
      const cls = done ? 'done' : active ? 'active' : avail ? '' : 'locked';
      const tr = G.docTreeOf(t.id), curTr = G.docTree(c);
      const pre = !done && !avail && !active ? (tr && curTr && curTr !== tr ? `<span class="warn">Başka bir doktrin dalı seçildi (${g.DOC_TREES[curTr]})</span>` : `Önce: ${t.pre.map((p) => g.TECH_BY_ID[p].n).join(', ')}`) : esc(t.d || fxText(t.fx));
      const bon = (c.rb || []).find((x) => x[0] === t.cat);
      lh += `<button class="item ${cls}${avail && !active && glow ? ' glow' : ''}" data-act="research" data-v="${t.id}" ${avail ? '' : 'disabled'}><div class="grow"><div class="t">${done ? '✓ ' : ''}${esc(t.n)} <span class="muted small">${t.year}</span></div><div class="d">${pre}</div><div class="d">${done ? 'Tamamlandı' : active ? 'Araştırılıyor' : `~${Math.ceil(cost / (G.resSpeed(c, t.id) * (1 + (bon ? bon[1] : 0))))} gün`}${bon && avail ? ` · <span class="good">bonus +%${Math.round(bon[1] * 100)}</span>` : ''}${ahead}</div></div></button>`;
    }
    html += lh + '</div>';
    return { title: 'Araştırma', html };
  };
  // Güç dengesi (HOI4): iki iç güç arasındaki ibre, kademeler ve destek düğmeleri
  function bopHtml(c) {
    const B = G.BOP[c.tag], v = c.bop, bi = G.bopBand(c), st = G.st;
    const seg = B.b.map((x, i) => `<i class="${i === bi ? 'on' : ''}" title="${esc(x[0])}"></i>`).join('');
    const dr = B.dr(c, st) * 30;
    const drT = Math.abs(dr) < 0.001 ? 'İbre şu an sabit' : `Ayda ${dr > 0 ? B.r[0] : B.l[0]} yönüne %${Math.abs(Math.round(dr * 50))} kayıyor`;
    const can = G.bopAct && c.pp >= G.BOP_COST && !(c.bopCd > st.day);
    const cd = c.bopCd > st.day ? ` · ${c.bopCd - st.day} gün bekle` : '';
    const h = `<div class="bop" style="--bl:${B.l[1]};--br:${B.r[1]}"><div class="bop-ends"><b>${esc(B.l[0])}</b><b>${esc(B.r[0])}</b></div><div class="bop-bar">${seg}<span class="bop-m" style="left:${((v + 1) / 2 * 100).toFixed(1)}%"></span></div>
      <div class="bop-cur"><b>${esc(B.b[bi][0])}</b>${fxParts(B.b[bi][1]).length ? `<div class="fxl">${fxChips(B.b[bi][1])}</div>` : '<span class="muted small"> · etkisi yok</span>'}</div>
      <div class="muted small">${drT}. Olaylar ibreyi iter.</div>
      <div class="btns"><button class="btn sm" data-act="bop" data-v="-1" ${can ? '' : 'disabled'}>‹ ${esc(B.l[0])}</button><button class="btn sm" data-act="bop" data-v="1" ${can ? '' : 'disabled'}>${esc(B.r[0])} ›</button></div>
      <div class="muted small">Destek: ${G.BOP_COST} siyasi güç, ibreyi %${Math.round(G.BOP_STEP * 50)} iter${cd}.</div></div>`;
    return sec('Güç dengesi', h, B.b[bi][0]);
  }
  // Özel projeler (HOI4 1.12): uzun soluklu gizli programlar ve atom bombası
  function projHtml(c) {
    const pj = c.proj || { done: {} };
    let h = '<p class="muted small" style="margin:0 0 8px">Özel projeler ön koşul teknolojisi araştırılınca siyasi güçle başlatılır. Aynı anda tek proje yürür; hızı araştırma hızına bağlıdır. Manhattan Projesi atom bombası üretimini açar.</p><div class="list">';
    if (pj.cur) { const p = g.PROJECTS[pj.cur]; h += `<div class="item active"><div class="grow"><div class="t">${esc(p.n)}</div>${bar(pj.p / p.days)}<div class="d">~${Math.ceil((p.days - pj.p) / (1 + (c.mods.research || 0)))} gün kaldı</div></div></div>`; }
    for (const [id, p] of Object.entries(g.PROJECTS)) {
      if (pj.cur === id) continue;
      const done = pj.done[id], a = G.projAvailable(c, id);
      h += `<div class="item ${done ? 'done' : a.ok ? '' : 'locked'}"><div class="grow"><div class="t">${done ? '✓ ' : ''}${esc(p.n)} <span class="muted small">${p.days} gün · ${p.cost} SG</span></div><div class="d">${esc(p.d)}</div>${done ? '<div class="d good">Tamamlandı</div>' : a.ok ? '' : `<div class="d warn">${esc(a.why)}</div>`}</div>${done ? '' : `<button class="btn sm ${a.ok ? 'pri' : ''}" data-act="projstart" data-v="${id}" ${a.ok ? '' : 'disabled'}>Başlat</button>`}</div>`;
    }
    h += '</div>';
    if (pj.done.atom) {
      const tg = G.nukeTargets(c.tag).slice(0, 12);
      let nh = `<p class="small" style="margin:0 0 8px">Hazır bomba: <b>${c.nukes || 0}</b> · sonraki ${G.fmtDate(c.nukeNext || 0)}. Atom bombası şehirdeki sanayi ve altyapıyı yıkar, oradaki birlikleri ezer; düşmanın savaş desteği ve istikrarı düşer.</p><div class="list">`;
      if (!tg.length) nh += '<div class="item"><div class="grow"><div class="d muted">Savaşta olduğun bir düşmanın büyük şehri yok.</div></div></div>';
      for (const n of tg) nh += `<div class="item"><div class="grow"><div class="t">${esc(G.pname(n))}</div><div class="d">${esc(G.cname(G.st.prov[n].c))} · zafer puanı ${G.P[n].vp}</div></div><button class="btn sm danger" data-act="nuke" data-v="${n}" ${c.nukes > 0 ? '' : 'disabled'}>Bomba at</button></div>`;
      h += sec('Atom bombası', nh + '</div>');
    }
    return h;
  }
  // Etki metni (HOI4 tarzı, işaretli). Yüzde olmayan anahtarlar mutlak değerdir; INV: artışı kötü olanlar.
  const FX_N = { factory: 'Fabrika verimi', construct: 'İnşaat hızı', research: 'Araştırma hızı', landAtk: 'Kara saldırısı', landDef: 'Kara savunması', armAtk: 'Zırhlı saldırısı', org: 'Moral', air: 'Hava gücü', navy: 'Deniz gücü', mp: 'İnsan gücü', speed: 'Hız', effCap: 'Verim tavanı', entrench: 'Tahkimat hızı', invasion: 'Çıkarma', brk: 'Atılım', plan: 'Planlama', stab: 'İstikrar', ws: 'Savaş desteği', ppM: 'Siyasi güç kazanımı', pp: 'Günlük siyasi güç', supply: 'İkmal', resist: 'İşgalde direniş', comply: 'İşgalde uyum', justify: 'Savaş gerekçesi hızı', xpGain: 'Tecrübe kazanımı', slots: 'Araştırma yuvası', train: 'Eğitim hızı', civdef: 'Bombardıman direnci', steel: 'Çelik', oil: 'Petrol', al: 'Alüminyum', rub: 'Kauçuk', tun: 'Tungsten', chr: 'Krom' };
  const FX_ABS = new Set(['pp', 'slots', 'steel', 'oil', 'al', 'rub', 'tun', 'chr']), FX_INV = new Set(['resist']);
  const fxParts = (fx) => Object.entries(fx || {}).filter(([k, v]) => FX_N[k] && typeof v === 'number' && v).map(([k, v]) => {
    const s = v > 0 ? '+' : '−', a = Math.abs(v);
    return { t: `${FX_N[k]} ${FX_ABS.has(k) ? s + (Math.round(a * 100) / 100) : s + '%' + Math.round(a * 100)}`, good: (v > 0) !== FX_INV.has(k) };
  });
  function fxText(fx) { return fxParts(fx).map((x) => x.t).join(', '); }
  const fxChips = (fx) => fxParts(fx).map((x) => `<span class="fxc ${x.good ? 'good' : 'bad'}">${x.t}</span>`).join('');
  // ulusal ruh kartı: ad, tarihî açıklama, etkiler ve nasıl kalkacağı
  const spiritHtml = (id, c) => {
    const S = g.SPIRITS[id]; if (!S) return '';
    const rm = [];
    if (S.until) rm.push(`${G.fmtDate(G.dayOf(S.until))} tarihinde sona erer`);
    if (S.war) rm.push('savaşa girince kalkar');
    const fs = (S.rm || []).map((f) => c && G.focusById(c, f)).filter(Boolean);
    if (fs.length) rm.push('kaldıran odak: ' + fs.map((f) => esc(f.n)).join(' / '));
    const tm = c && (G.st.tsp || []).find((x) => x.t === c.tag && x.sp === id);
    if (tm) rm.push(`${Math.max(0, tm.until - G.st.day)} gün sonra kalkar`);
    const bad = fxParts(S.fx).filter((x) => !x.good).length, good = fxParts(S.fx).length - bad;
    return `<div class="item spirit ${bad && !good ? 'neg' : good && !bad ? 'pos' : ''}"><div class="grow"><div class="t">${esc(S.n)}</div>${S.h ? `<div class="d">${esc(S.h)}</div>` : ''}<div class="fxl">${fxChips(S.fx)}</div>${rm.length ? `<div class="d muted">${rm.join(' · ')}</div>` : ''}</div></div>`;
  };
  UI.spiritHtml = spiritHtml;

  // Üretim
  // ---------- Tasarım bürosu (tank ve uçak tasarımcısı) ----------
  const XPN = { axp: 'Kara tecrübesi', fxp: 'Hava tecrübesi' };
  const STAT_SHOW = {
    a: (v) => r1(v * 13), d: (v) => r1(v * 30), r: (v) => r1(v * 10), p: (v) => `${r1(v * 5)} / ${Math.round(v * 15)}`, s: (v) => Math.round(v * 9 * 4) + ' km/s', rel: (v) => '%' + Math.round(v * 100),
    aa: (v) => r1(v * 10), df: (v) => r1(v * 10), ga: (v) => r1(v * 10), sb: (v) => r1(v * 10), na: (v) => r1(v * 10), rg: (v) => Math.round(v * 500) + ' km',
  };
  const statTable = (e, st0, ref) => {
    const D = g.DESIGN[e];
    return `<div class="dzst">${D.stats.map(([k, n]) => { const v = st0.v[k] || 0, r = ref ? ref.v[k] || 0 : v; const dlt = r ? (v - r) / r : 0; return `<div><span>${n}</span><b>${STAT_SHOW[k](v)}</b><span class="${dlt > 0.005 ? 'good' : dlt < -0.005 ? 'bad' : 'muted'} small">${Math.abs(dlt) > 0.005 ? (dlt > 0 ? '+' : '') + Math.round(dlt * 100) + '%' : '—'}</span></div>`; }).join('')}<div><span>Üretim maliyeti</span><b>${r1(g.EQUIP[e].cost * st0.cm)}</b><span class="${st0.cm > (ref ? ref.cm : st0.cm) + 0.005 ? 'bad' : st0.cm < (ref ? ref.cm : st0.cm) - 0.005 ? 'good' : 'muted'} small">×${st0.cm.toFixed(2)}</span></div></div>`;
  };
  function designer(c, e) {
    const D = g.DESIGN[e], best = Math.floor(G.bestLevel(c, e));
    if (!UI.dz || UI.dz.e !== e) UI.dz = { e, t: Math.max(1, best), m: {}, n: '' };
    const dz = UI.dz; if (dz.t > best) dz.t = Math.max(1, best);
    const xk = G.XP_KIND[e], cost = G.designCost(e, dz), err = G.designValid(c, e, dz);
    const pv = G.designPreview(e, dz), ref = G.designStats(e, G.defaultDesign(e, dz.t));
    let html = `<div class="row" style="justify-content:space-between;align-items:center"><span class="small">${XPN[xk]}: <b>${Math.floor(c[xk] ?? 30)}</b></span><span class="small">Kaydetme: <b class="${(c[xk] ?? 30) >= cost ? '' : 'bad'}">${cost} tecrübe</b></span></div>`;
    html += sec(D.n === 'Tank' ? 'Şasi' : 'Gövde', `<div class="seg sm wrap">${D.tierN.slice(1).map((n, i) => `<button class="${dz.t === i + 1 ? 'on' : ''}" data-act="dztier" data-v="${i + 1}" ${i + 1 > best ? 'disabled' : ''}>${esc(n)}</button>`).join('')}</div>`);
    let mh = '';
    for (const sl of D.slots) {
      const lock = sl.req && dz.t < sl.req;
      if (sl.lvl) {
        const n = dz.m[sl.k] | 0;
        mh += `<div class="dzslot"><div class="row" style="justify-content:space-between;align-items:center"><span class="t">${sl.n}</span><div class="stepper"><button data-act="dzlvl" data-k="${sl.k}" data-v="-1" aria-label="Azalt">−</button><b>${n}/${sl.lvl}</b><button data-act="dzlvl" data-k="${sl.k}" data-v="1" aria-label="Artır" ${lock ? 'disabled' : ''}>+</button></div></div><div class="muted small">${Object.entries(sl.per.fx).map(([k, v]) => `${(D.stats.find((x) => x[0] === k) || [k, k])[1]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(', ')} · maliyet +${Math.round(sl.per.cost * 100)}% (kademe başına)</div></div>`;
        continue;
      }
      const cur = dz.m[sl.k] ?? sl.def;
      mh += `<div class="dzslot"><span class="t">${sl.n}${lock ? ` <span class="muted small">(${D.tierN[sl.req]} gerekli)</span>` : ''}</span><div class="seg sm wrap">${sl.opts.map((o) => `<button class="${cur === o.id ? 'on' : ''}" data-act="dzmod" data-k="${sl.k}" data-v="${o.id}" ${lock || (o.req && dz.t < o.req) ? 'disabled' : ''}>${esc(o.n)}</button>`).join('')}</div></div>`;
    }
    html += sec('Modüller', mh);
    html += sec('Özellikler', statTable(e, pv, ref) + '<p class="muted small" style="margin:0">Yüzdeler aynı şasinin standart modeline göredir.</p>');
    html += `<label class="field"><span>Tasarım adı</span><input id="dz-name" value="${esc(dz.n)}" maxlength="28" placeholder="${esc(D.n)} ${(c.designs || []).filter((x) => x.e === e).length + 1}"></label>`;
    if (err) html += `<p class="small warn" style="margin:0">${esc(err)}</p>`;
    html += `<div class="btns"><button class="btn pri" data-act="dzsave" ${err ? 'disabled' : ''}>Kaydet</button>${UI.dzLine != null ? `<button class="btn" data-act="dzsave" data-v="line" ${err ? 'disabled' : ''}>Kaydet ve hatta ata</button>` : ''}<button class="btn" data-act="dzreset">Sıfırla</button></div>`;
    return { title: `${g.EQUIP[e].s} tasarımcısı`, html };
  }
  function linePicker(c, i) {
    const l = c.lines[i]; if (!l) { UI.sub = null; return PANELS.prod(); }
    const cur = G.lineDesign(c, l), list = G.designsFor(c, l.e).reverse();
    const ref = G.designStats(l.e, G.defaultDesign(l.e, Math.floor(G.bestLevel(c, l.e))));
    let html = `<p class="muted small" style="margin:0">Hattın ürettiği tasarımı değiştirmek fabrika verimini düşürür (yeniden donanım).</p>`;
    html += `<div class="list">${list.map((d) => { const st0 = G.designStats(l.e, d), on = cur && cur.id === d.id; return `<div class="item ${on ? 'active' : ''}"><div class="grow"><div class="t">${esc(d.n)} <span class="muted small">${esc(g.DESIGN[l.e].tierN[d.t])}</span></div>${statTable(l.e, st0, ref)}</div>${on ? '<span class="muted small">üretimde</span>' : `<button class="btn sm pri" data-act="linedesign" data-k="${i}" data-v="${d.id}">Seç</button>`}</div>`; }).join('')}</div>`;
    html += `<div class="btns"><button class="btn pri" data-act="dznew" data-v="${l.e}" data-k="${i}">+ Yeni tasarım</button></div>`;
    return { title: `${g.EQUIP[l.e].n}: tasarım seç`, html };
  }

  PANELS.prod = () => {
    const c = me(), s = c.sum, e = c.econ || {}, m = c.mods;
    if (UI.sub && UI.sub.startsWith('design:')) return designer(c, UI.sub.slice(7));
    if (UI.sub && UI.sub.startsWith('line:')) return linePicker(c, +UI.sub.slice(5));
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
      const out = eq.ship || eq.convoy ? (l.f * 2.5 * (1 + (m.factory || 0))) : (l.f * 4.5 * l.eff * (1 + (m.factory || 0)) / (eq.cost * G.lineCostMul(c, l)));
      const stock = eq.convoy ? `${int(c.ships.conv || 0)} konvoy` : eq.ship ? `${Math.round(G.navyCount(c, l.e))} gemi` : `Stok ${int(c.stock[l.e] || 0)}`;
      const rate = eq.convoy ? `${r1(out / eq.cost)}/gün` : eq.ship ? `${l.f ? Math.ceil((eq.cost - (l.acc || 0)) / Math.max(0.1, out)) + ' günde 1' : 'durdu'}` : `${r1(out)}/gün`;
      const dsg = G.lineDesign(c, l);
      const model = dsg ? dsg.n : (g.MODEL_N[l.e] || [])[lv];
      const upg = !dsg && !eq.ship && !eq.convoy && lv < best;
      const dUp = dsg && dsg.t < Math.floor(best);
      const resTxt = Object.entries(eq.res).map(([r, v]) => `${g.RES[r].slice(0, 3)} ${r1(v * l.f)}`).join(' · ');
      return `<div class="item line"><div class="grow"><div class="t">${eq.n}${model ? ` <span class="muted small">${model}</span>` : ''}</div><div class="d">${stock} · ${rate}${eq.ship || eq.convoy ? '' : ` · verim ${pct(l.eff)}/${pct(effCap)}`}</div><div class="d">${resTxt}</div>${eq.ship ? bar((l.acc || 0) / eq.cost) : bar(l.eff / effCap, 'g')}
        <div class="btns" style="margin-top:4px">${dsg ? `<button class="btn sm ${dUp ? 'pri' : ''}" data-act="sub" data-v="line:${i}">${dUp ? 'Yeni şasi var · ' : ''}Tasarım ▾</button>` : ''}${upg ? `<button class="btn sm pri" data-act="lineup" data-v="${i}">Yeni modele geç: ${(g.MODEL_N[l.e] || [])[best] || 'Seviye ' + best}</button>` : ''}<button class="btn sm danger" data-act="linedel" data-v="${i}">Hattı sil</button></div></div>
        <div class="stepper"><button data-act="line" data-e="${l.e}" data-i="${i}" data-v="-1" aria-label="Azalt">−</button><b>${l.f}</b><button data-act="line" data-e="${l.e}" data-i="${i}" data-v="1" aria-label="Artır">+</button></div></div>`;
    };
    const idx = (fac) => c.lines.map((l, i) => [l, i]).filter(([l]) => g.EQUIP[l.e].fac === fac);
    const avail = (fac) => Object.entries(g.EQUIP).filter(([k, v]) => v.fac === fac && (m.unlockEq[k] || (!v.req && fac === 'mil') || (v.req && c.tech[v.req]) || k === 'conv' || k === 'sup'));
    html += sec('Kara ve hava üretimi', `<div class="list">${idx('mil').map(([l, i]) => line(l, i)).join('')}</div><div class="btns">${avail('mil').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>`, `${s.mil - milA} boşta`);
    html += sec('Tersaneler', `<div class="list">${idx('dock').map(([l, i]) => line(l, i)).join('') || '<p class="muted small" style="margin:0">Tersane hattı yok. İnşaat panelinden kıyı eyaletlerine tersane kurabilirsin.</p>'}</div>${s.dock ? `<div class="btns">${avail('dock').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>` : ''}`, `${s.dock - dockA} boşta`);
    // teçhizat stoğu ve modeller
    const rows = ['inf', 'sup', 'art', 'at', 'aa', 'mot', 'tank', 'fig', 'cas', 'bom'].map((k) => `<div><small>${g.EQUIP[k].s}</small><b>${int(c.stock[k] || 0)}</b><span class="muted small">${(g.MODEL_N[k] || [])[Math.round(G.lvl(c, k))] || 'Sv ' + r1(G.lvl(c, k))}</span></div>`).join('');
    // tasarım bürosu
    const cus = (c.designs || []).filter((d) => !d.id.startsWith('ai'));
    let dh = `<div class="row" style="gap:12px"><span class="small">${XPN.axp}: <b>${Math.floor(c.axp ?? 30)}</b></span><span class="small">${XPN.fxp}: <b>${Math.floor(c.fxp ?? 30)}</b></span></div>`;
    dh += `<div class="btns">${[...G.DESIGNABLE].filter((k) => m.unlockEq[k] || !g.EQUIP[k].req || c.tech[g.EQUIP[k].req]).map((k) => `<button class="btn sm" data-act="dznew" data-v="${k}">+ ${g.EQUIP[k].s} tasarla</button>`).join('')}</div>`;
    if (cus.length) dh += `<div class="list">${cus.map((d) => { const st0 = G.designStats(d.e, d); return `<div class="item"><div class="grow"><div class="t">${esc(d.n)} <span class="muted small">${esc(g.DESIGN[d.e].tierN[d.t])}</span></div>${statTable(d.e, st0, G.designStats(d.e, G.defaultDesign(d.e, d.t)))}</div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm" data-act="dzcopy" data-v="${d.id}">Kopyala</button><button class="btn sm danger" data-act="dzdel" data-v="${d.id}">Sil</button></div></div>`; }).join('')}</div>`;
    else dh += '<p class="muted small" style="margin:0">Tasarım yok. Şasi/gövde ve modülleri seçip kendi tankını ve uçağını tasarla; sonra üretim hattında “Tasarım ▾” ile üretime al. Tasarım kaydetmek tecrübe puanı harcar (savaşta ve görevlerde kazanılır).</p>';
    html += sec('Tasarım bürosu', dh, `${cus.length} tasarım`);
    html += sec('Teçhizat deposu', `<div class="kv">${rows}</div><p class="muted small" style="margin:0">Yeni teknoloji araştırınca hatları “Yeni modele geç” ile güncelle. Ordudaki tümenler depodaki yeni modelleri takviye sırasında yavaşça alır.</p>`);
    return { title: 'Üretim', html };
  };

  // Ticaret
  // Yakıt deposu: miktar, kapasite ve doluluk (depo ilk günde kurulmamışsa varsayılanla başlatılır)
  const fuelOf = (c) => { if (c.fuel == null) G.fuelInit(c); const cap = c._fcap || G.fuelCap(c); return { fuel: c.fuel, cap, fr: c.fuel / cap }; };
  const fuelSec = (c) => {
    const f = fuelOf(c), inn = c.fuelIn || 0, out = c.fuelOut || 0, dem = c.fuelDem || 0, net = inn - out;
    const lvl = f.fr < 0.2 ? 'r' : f.fr < 0.4 ? '' : 'g';
    let h = `<div class="fuelbar">${bar(f.fr, lvl)}</div>`;
    h += kv([['Yakıt deposu', `${int(f.fuel)} / ${int(f.cap)}`, f.fr < 0.2 ? 'bad' : ''], ['Günlük üretim', '+' + r1(inn), 'good'], ['Günlük tüketim', '-' + r1(out), out < dem - 0.5 ? 'bad' : ''], ['Net', (net >= 0 ? '+' : '') + r1(net), net < 0 ? 'bad' : 'good'], ['Rafineri', int(c._ref || 0)]]);
    const r = G.fuelRatio(c);
    h += r < 1
      ? `<p class="warn small" style="margin:6px 0 0">Yakıt azalıyor: motorlu ve zırhlı tümenlerin hızı ve saldırısı −%${Math.round((1 - G.fuelMul({ t: c.tag, u: 'arm' })) * 100)}, uçak görev etkinliği −%${Math.round((1 - G.fuelAirMul(c)) * 100)}, deniz gücü −%${Math.round((1 - G.fuelNavyMul(c)) * 100)}. Petrol ithal et ya da Sentetik Rafineri kur.</p>`
      : `<p class="muted small" style="margin:6px 0 0">Petrol her gün yakıta dönüşür (kullanılmayan petrolün %${Math.round(G.FUEL.rate * 100)}'i). Motorlu tümenler, uçaklar ve gemiler görevdeyken yakıt yakar; depo %20'nin altına inerse ceza başlar.</p>`;
    return sec('Yakıt', h, 'günlük birim');
  };
  PANELS.trade = () => {
    const st = G.st, c = me(), e = c.econ || {};
    if (UI.sub && UI.sub.startsWith('buy:')) return buyPicker(c, UI.sub.slice(4));
    let html = kv([['İthalat (fab.)', `${e.trade || 0}`], ['İhracat (fab.)', `+${e.expCiv || 0}`], ['Konvoy', `${int(c.ships.conv || 0)} / ${int(G.convoyNeed(c.tag))}`, (e.convRatio ?? 1) < 1 ? 'bad' : ''], ['Konvoy akını', c.raid ? '-' + pct(c.raid) : '—', c.raid ? 'bad' : ''], ['Ticaret yasası', g.LAWS.trade.opts[c.laws.trade].n]]);
    html += fuelSec(c);
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
        ${(f.sh.bb || 0) + (f.sh.cv || 0) >= 0.5 ? (() => { const sc = G.screenOf(c, f); return `<div class="d ${sc < 0.6 ? 'warn' : 'good'}">Perde %${Math.round(sc * 100)}${sc < 1 ? ' · büyük gemi başına 3 muhrip/kruvazör gerekir; perdesiz zırhlılar torpido ve uçaklara açık' : ''}</div>`; })() : ''}
        <div class="seg sm">${Object.entries(G.MISSIONS).map(([k, n]) => `<button class="${f.mis === k ? 'on' : ''}" data-act="fleetmis" data-k="${f.id}" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="btns"><button class="btn sm" data-act="fleethome" data-v="${f.id}">Limana dön</button><button class="btn sm" data-act="fleetauto" data-v="${f.id}">${f.auto ? '✓ ' : ''}Yeni gemiler buraya</button>${c.fleets.length > 1 ? `<button class="btn sm danger" data-act="fleetmerge" data-v="${f.id}">Birleştir</button>` : ''}</div></div></div>`;
    }
    if (!c.fleets.length) fh += '<p class="muted small" style="margin:0">Filon yok. Tersane kurup gemi üret.</p>';
    const res = g.SHIPS.filter((e2) => c.ships[e2] >= 1);
    fh += `</div>${res.length ? `<div class="item"><div class="grow"><div class="t">Yedek gemiler</div><div class="d">${res.map((e2) => `${Math.floor(c.ships[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(' · ')}</div></div><button class="btn sm pri" data-act="fleetnew">Yeni filo kur</button></div>` : ''}`;
    fh += '<p class="muted small" style="margin:0">Devriye: yakındaki zayıf düşman filolarına saldırır. Saldırı: daha uzağa ve cesurca saldırır. Konvoy akını: düşman ticaretini ve konvoylarını vurur. Refakat: kendi konvoylarını korur. Bir filoyu “Seç”ip haritada bir deniz bölgesine dokunarak elle taşıyabilirsin.</p>';
    html += sec('Filolar', fh);
    // deniz muharebesi raporları (HOI4)
    const reps = st.navRep || [];
    if (reps.length) {
      const L = (o) => g.SHIPS.filter((e2) => (o[e2] || 0) >= 0.5).map((e2) => `${Math.round(o[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(', ') || 'kayıp yok';
      const N = (o) => g.SHIPS.filter((e2) => (o[e2] || 0) >= 0.5).map((e2) => `${Math.round(o[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(', ');
      let rh = '<div class="list">';
      for (const r of reps) {
        const lm = g.SHIPS.reduce((a, e2) => a + (r.lMe[e2] || 0) * g.EQUIP[e2].str, 0), lo = g.SHIPS.reduce((a, e2) => a + (r.lOp[e2] || 0) * g.EQUIP[e2].str, 0);
        const won = lo > lm * 1.2, lost = lm > lo * 1.2;
        rh += `<div class="item nbrep"><div class="grow"><div class="t">${esc(SEA_N(r.zone))} <span class="pill ${won ? 'ally' : lost ? 'enemy' : ''}">${won ? 'Zafer' : lost ? 'Yenilgi' : 'Berabere'}</span></div><div class="d muted">${G.fmtDate(r.day)}${r.last > r.day ? ' – ' + G.fmtDate(r.last) : ''} · ${esc(G.cname(r.me))} – ${esc(G.cname(r.op))}</div>
          <div class="nbcols"><div><b>Biz</b><span>${esc(N(r.nMe))}</span><span class="bad">Kayıp: ${esc(L(r.lMe))}</span><span class="muted">Perde %${Math.round((r.scMe ?? 1) * 100)}${r.airMe ? ' · uçak gemisi' : ''}</span></div><div><b>Düşman</b><span>${esc(N(r.nOp))}</span><span class="good">Kayıp: ${esc(L(r.lOp))}</span><span class="muted">Perde %${Math.round((r.scOp ?? 1) * 100)}${r.airOp ? ' · uçak gemisi' : ''}</span></div></div></div></div>`;
      }
      html += sec('Deniz muharebeleri', rh + '</div><p class="muted small" style="margin:0">Topçu ateşi, uçak gemisi saldırısı ve denizaltı torpidoları birlikte hesaplanır. Perdesi zayıf filonun zırhlı ve uçak gemileri ağır kayıp verir; muhripler denizaltıları avlar.</p>');
    }
    return { title: 'Donanma', html };
  };
  // ---------- Hava kuvvetleri (HOI4 tarzı) ----------
  const WIC = { fig: '✈', cas: '⬇', bom: '✦' };
  UI.wingName = (c, w) => { const k = c.wings.filter((x) => x.e === w.e).indexOf(w) + 1; return `${k}. ${G.WING_TYPES[w.e].n} Kanadı${w.vol ? ` · Gönüllü (${G.cname(w.vol)})` : ''}`; };
  PANELS.air = () => {
    const st = G.st, c = me();
    if (!c.wings) G.initWings(c);
    const tot = (e) => int(G.planes(c, e));
    let html = kv([['Avcı', tot('fig')], ['Yakın destek', tot('cas')], ['Bombardıman', tot('bom')], ['Stokta avcı', int(c.stock.fig || 0)], ['Stokta YDU', int(c.stock.cas || 0)], ['Stokta bombacı', int(c.stock.bom || 0)]]);
    html += `<button class="toggle ${c.auto.air ? 'on' : ''}" data-act="airauto"><span><b>Hava kurmayı (otomatik)</b><br><span class="muted small">Açıkken kanatlar cephelere, düşman sanayisine ve filolarına kendiliğinden atanır. Elle bölge verdiğin kanatlar sende kalır.</span></span><i></i></button>`;
    let wh = '<div class="list">';
    for (const w of c.wings) {
      const reg = w.r >= 0 ? G.AIR.regions[w.r] : null;
      const sup = reg ? G.airSup(c.tag, w.r) : 0.5;
      const pick = UI.airPick === w.id;
      wh += `<div class="item army ${pick ? 'active' : ''}"><div class="grow">
        <div class="row" style="gap:8px"><div class="t grow"><span class="wic">${WIC[w.e]}</span> ${esc(UI.wingName(c, w))} <span class="muted small">${Math.round(w.n)}/${w.max} uçak · ${g.MODEL_N?.[w.e]?.[Math.floor(G.lvl(c, w.e))] || ''}</span></div>${w.manual ? '<span class="pill">elle</span>' : '<span class="pill ally">oto</span>'}</div>
        ${bar(w.n / w.max, 'g')}
        <div class="small">Bölge: <b>${reg ? esc(reg.n) : '—'}</b>${reg && c.enemies.length ? ` · hava üstünlüğü <b class="${sup > 0.55 ? 'good' : sup < 0.45 ? 'bad' : 'warn'}">%${Math.round(sup * 100)}</b>` : ''}</div>
        <div class="small">Üs: <b>${w.b >= 0 ? esc(G.pname(w.b)) : '—'}</b>${w.b >= 0 ? ` <span class="muted">(seviye ${st.prov[w.b].ab || 0}, ${Math.round(G.baseLoad(w.b) / 100)}/${st.prov[w.b].ab || 0} kanat)</span>` : ''} · menzil ${Math.round(G.wingRangeKm(c, w))} km${reg && w.b >= 0 ? (G.inRange(c, w, w.r) ? ` · hedefe ${Math.round(G.regionKm(w.b, w.r))} km` : ' · <b class="bad">hedef menzil dışında</b>') : ''}${w._eff > 0 && w._eff < 1 ? ` · <b class="warn">üs dolu: etkinlik %${Math.round(w._eff * 100)}</b>` : ''}</div>
        <div class="seg sm">${G.WING_TYPES[w.e].m.map((k) => `<button class="${w.mis === k ? 'on' : ''}" data-act="wingmis" data-k="${w.id}" data-v="${k}">${G.MIS[k].n}</button>`).join('')}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm ${pick ? 'pri' : ''}" data-act="wingpick" data-v="${w.id}">${pick ? 'Haritada bölgeye dokun…' : 'Bölge seç (harita)'}</button><button class="btn sm ${UI.basePick === w.id ? 'pri' : ''}" data-act="basepick" data-v="${w.id}">Üs seç (harita)</button>${w.manual ? `<button class="btn sm" data-act="wingauto" data-v="${w.id}">Kurmaya bırak</button>` : ''}<button class="btn sm danger" data-act="wingdel" data-v="${w.id}">Dağıt</button></div>
      </div></div>`;
    }
    if (!c.wings.length) wh += '<p class="muted small" style="margin:0">Hava kanadın yok. Üretim panelinden uçak üret; stokta 10+ uçak olunca buradan kanat kur.</p>';
    wh += `</div><div class="btns">${g.PLANES.map((e) => `<button class="btn ${c.stock[e] >= 10 ? 'pri' : ''}" data-act="wingnew" data-v="${e}" ${c.stock[e] >= 10 ? '' : 'disabled'}>+ ${G.WING_TYPES[e].n} kanadı (${int(Math.min(G.WING_MAX, c.stock[e] || 0))})</button>`).join('')}</div>`;
    html += sec('Hava kanatları', wh, `${c.wings.length} kanat`);
    // görev rehberi
    html += sec('Görevler', `<div class="mods">${Object.entries(G.MIS).map(([k, m]) => `<div><span><b>${m.n}</b><br><span class="muted small">${m.d}</span></span><b class="small">${Object.entries(G.WING_TYPES).filter(([, t]) => t.m.includes(k)).map(([, t]) => t.n).join(', ')}</b></div>`).join('')}</div><p class="muted small" style="margin:6px 0 0">Kanat yalnızca kendi ya da müttefik toprağı bulunan veya ona komşu bölgelerde görev yapabilir (menzil). Kayıplar stoktaki uçaklarla kendiliğinden takviye edilir. Harita modu “Hava” bölgeleri ve hava üstünlüğünü gösterir.</p>`);
    // çekişmeli bölgeler
    if (c.enemies.length && G.airR) {
      const rows = [];
      for (const [r, m] of G.airR) { const tags = Object.keys(m); if (!tags.some((t) => t === c.tag || G.sameFaction(t, c.tag)) && !tags.some((t) => G.atWar(t, c.tag))) continue; if (!tags.some((t) => G.atWar(t, c.tag))) continue; rows.push([r, G.airSup(c.tag, r)]); }
      rows.sort((a, b) => a[1] - b[1]);
      if (rows.length) html += sec('Hava savaşı', `<div class="mods">${rows.slice(0, 12).map(([r, v]) => `<div><span>${esc(G.AIR.regions[r].n)}</span><b class="${v > 0.55 ? 'good' : v < 0.45 ? 'bad' : 'warn'}">%${Math.round(v * 100)}</b></div>`).join('')}</div>`, 'bizim hava üstünlüğümüz');
    }
    return { title: 'Hava kuvvetleri', html };
  };
  // Barış konferansı
  PANELS.peace = () => {
    const st = G.st, cf = st.conf;
    if (!cf) return { title: 'Barış konferansı', html: '<p class="muted">Şu an süren bir barış konferansı yok.</p>' };
    const me0 = st.player, p = cf.parts.find((q) => q.t === me0), turn = G.confTurn(cf), myTurn = turn === me0 && !cf.done;
    let html = `<div class="cfhead">${G.flag(cf.L, 30, 20)}<div class="grow"><b>${esc(G.cname(cf.L))}</b> <span class="muted small">tur ${cf.round}</span><div class="small">${cf.done ? '<b class="good">Paylaşım tamamlandı</b>' : myTurn ? '<b class="good">Sıra sende</b>' : 'Sıra: ' + esc(G.cname(turn))}</div></div>${cf.parts.map((q) => `<span class="cfpart ${q.t === turn ? 'on' : ''} ${q.pass === 2 ? 'off' : ''}" title="${esc(G.cname(q.t))} · katkı %${Math.round(q.sh * 100)}">${G.flag(q.t, 22, 15)}<b>${q.pts}</b></span>`).join('')}</div>`;
    // seçili bölge
    const sel = UI.cfSel != null ? cf.states[UI.cfSel] : null;
    if (sel) {
      const fl = sel.p.filter((n) => !cf.own[n]);
      const cost = fl.length ? G.confCost(cf, me0, fl) : 0;
      const ctrl = {}; for (const n of sel.p) ctrl[cf.ctrl[n]] = (ctrl[cf.ctrl[n]] || 0) + 1;
      const owner = !fl.length ? cf.own[sel.p[0]] : null;
      html += `<div class="item active"><div class="grow"><div class="t">${esc(sel.n)} <span class="muted small">${sel.p.length} eyalet · ${sel.vp} ZP · ${sel.ind} fabrika</span></div><div class="d">İşgalci: ${Object.entries(ctrl).map(([t, n]) => `${esc(G.cname(t))} ${n}`).join(', ')}${sel.oc !== cf.L ? ` · asli sahibi ${esc(G.cname(sel.oc))}` : ''}</div>${owner ? `<div class="d">Talep eden: <b>${esc(G.cname(owner.by || owner.t))}</b></div>` : ''}</div>${fl.length && myTurn ? `<button class="btn sm ${cost <= p.pts ? 'pri' : ''}" data-act="cftake" data-v="${sel.id}" ${cost <= p.pts ? '' : 'disabled'}>Talep et · ${cost}</button>` : ''}</div>`;
    } else if (!cf.done) html += '<p class="muted small" style="margin:0">Haritada bir bölgeye dokun ya da aşağıdan seç. Rakam senin için maliyet: kendi işgalin ucuz, başkasının işgali pahalı, eski asli toprakların yarı fiyat.</p>';
    if (myTurn) html += '<div class="btns"><button class="btn" data-act="cfpass">Pas geç</button><button class="btn danger" data-act="cfquit">Konferanstan çekil</button></div>';
    else if (cf.done) html += '<div class="btns"><button class="btn pri" data-act="cfend">Antlaşmayı imzala</button></div>';
    if (myTurn) {
      const pc = G.confPuppetCost(cf), canP = !cf.puppet && G.confRemainFrac(cf) >= 0.05;
      let ah = '';
      if (canP) ah += `<div class="item"><div class="grow"><div class="t">Kukla devlet kur</div><div class="d">Talep edilmemiş tüm topraklarda ${esc(G.cname(cf.L))} sana bağlı kukla olur.</div></div><button class="btn sm ${pc <= p.pts ? 'pri' : ''}" data-act="cfpuppet" ${pc <= p.pts ? '' : 'disabled'}>${pc}</button></div>`;
      for (const r of G.confReleasable(cf)) { const rc = G.confReleaseCost(cf, me0, r.provs); ah += `<div class="item">${G.flag(r.t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(r.t))} ulusunu serbest bırak</div><div class="d">${r.provs.length} asli eyaleti · sana bağlı kukla olur</div></div><button class="btn sm ${rc <= p.pts ? 'pri' : ''}" data-act="cfrelease" data-v="${r.t}" ${rc <= p.pts ? '' : 'disabled'}>${rc}</button></div>`; }
      if (ah) html += sec('Özel talepler', `<div class="list">${ah}</div>`, `${p.pts} puanın var`);
    }
    // bölgeler
    const rows = cf.states.map((s) => { const fl = s.p.filter((n) => !cf.own[n]); return { s, fl, cost: fl.length ? G.confCost(cf, me0, fl) : 1e9 }; }).sort((a, b) => (a.fl.length ? 0 : 1) - (b.fl.length ? 0 : 1) || a.cost - b.cost);
    html += sec('Bölgeler', `<div class="list">${rows.map(({ s, fl, cost }) => { const o = !fl.length ? cf.own[s.p[0]] : null; return `<button class="item ${UI.cfSel === s.id ? 'active' : ''}" data-act="cfsel" data-v="${s.id}">${o ? G.flag(o.by || o.t, 22, 15) : ''}<div class="grow"><div class="t">${esc(s.n)}</div><div class="d">${s.p.length} eyalet · ${s.vp} ZP · ${s.ind} fabrika${o ? ` · ${esc(G.cname(o.t))}${o.by && o.by !== o.t ? ' (' + esc(G.cname(o.by)) + ')' : ''}` : ''}</div></div>${fl.length ? `<b class="${p && cost <= p.pts ? 'good' : 'muted'}">${cost}</b>` : ''}</button>`; }).join('')}</div>`, `${cf.states.length} bölge`);
    if (cf.log.length) html += sec('Konferans günlüğü', `<div class="list">${cf.log.slice().reverse().slice(0, 30).map((l) => `<div class="item">${G.flag(l.t, 22, 15)}<div class="grow"><div class="d">${esc(G.cname(l.t))}: ${esc(l.m)}</div></div></div>`).join('')}</div>`);
    return { title: 'Barış konferansı', html };
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
    html += sec('Yeni proje', `<div class="list">${Object.entries(g.BUILDINGS).map(([k, b]) => `<button class="item" data-act="sub" data-v="build:${k}"><div class="grow"><div class="t">${b.n}</div><div class="d">${int(b.cost)} inşaat puanı${k === 'fort' ? ' · eyalet savunması +%15/kademe' : k === 'dock' ? ' · yalnızca kıyı' : k === 'inf' ? ' · ikmal akışı ve hareket hızı artar' : k === 'rail' ? ' · ikmal uzağa daha az zayıflayarak akar' : k === 'hub' ? ' · yeni ikmal kaynağı (altyapı 2+, kıyı ya da demiryolu)' : k === 'ab' ? ' · seviye başına 100 uçak, en fazla 10' : k === 'ref' ? ' · seviye başına günlük +2,5 yakıt ve +30 depo, en fazla 5' : ''}</div></div><span class="muted">›</span></button>`).join('')}</div>`);
    return { title: 'İnşaat', html };
  };
  const lowSup = (c, i) => { const r = G.supRatio[c.tag]; return r && r[i] < 0.8; };
  function buildPicker(c, type) {
    const st = G.st, b = g.BUILDINGS[type];
    const rows = [];
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag) continue;
      if (!G.LEVEL_B.has(type) && pr.o !== c.tag) continue;
      if (b.coastal && !P[i].c) continue;
      if (type === 'hub' && !G.canHub(i)) continue;
      const queued = c.constr.filter((q) => q.p === i && (G.LEVEL_B.has(type) ? q.b === type : !G.LEVEL_B.has(q.b))).length;
      const free = type === 'fort' ? 5 - pr.fort - queued : type === 'inf' ? 5 - (pr.inf || 1) - queued : type === 'ab' ? 10 - (pr.ab || 0) - queued : type === 'rail' ? 5 - (pr.rail || 0) - queued : type === 'hub' ? 1 - queued : type === 'ref' ? g.BUILDINGS.ref.max - (pr.ref || 0) - queued : G.freeSlots(i) - queued;
      if (free <= 0) continue;
      const border = P[i].a.some((j) => st.prov[j].c !== c.tag);
      const front = type === 'ab' ? P[i].a.some((j) => P[j].a.some((k) => G.atWar(c.tag, st.prov[k].c))) : false;
      const score = type === 'ab' ? (front ? 80 : 0) + (pr.ab || 0) * 6 + P[i].vp + (i === c.cap ? 20 : 0) : type === 'fort' ? (P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) ? 100 : 0) + (border ? 50 : 0) + P[i].vp : type === 'inf' ? (G.supRatio[c.tag] && G.supRatio[c.tag][i] < 0.8 ? 80 : 0) + (border ? 30 : 0) + P[i].vp - (pr.inf || 1) * 5 : type === 'rail' ? (lowSup(c, i) ? 80 : 0) + (border ? 30 : 0) + P[i].vp - (pr.rail || 0) * 6 : type === 'hub' ? (lowSup(c, i) ? 80 : 0) + (border ? 20 : 0) + P[i].vp * 2 : free * 3 + P[i].vp;
      rows.push({ i, free, score, border });
    }
    rows.sort((a, b2) => b2.score - a.score);
    let html = `<p class="muted small" style="margin:0">${b.n} için eyalet seç. ${type === 'fort' ? 'Sınır ve cephe eyaletleri üstte.' : type === 'inf' ? 'İkmali zayıf ve sınırdaki eyaletler üstte. Altyapı ikmal akışını ve hareket hızını artırır.' : type === 'rail' ? 'İkmali zayıf ve sınırdaki eyaletler üstte. Her demiryolu kademesi ikmalin o eyaletten geçerken zayıflamasını azaltır; işgal edilen eyaletlerde hasarlıdır, zamanla onarılır.' : type === 'hub' ? 'Altyapısı 2 ve üstü, kıyıda ya da demiryolu bağlı eyaletlerde kurulur. İkmal merkezi, büyük bir şehir gibi çevresine ikmal yayar; cephenin gerisindeki zayıf ikmalli bölgelere kur.' : type === 'ab' ? 'Cepheye yakın ve büyük üsler üstte. Her seviye 100 uçak (bir kanat) barındırır; kanatlar yalnızca üslerinden menzil içindeki bölgelerde görev yapar.' : type === 'ref' ? 'Büyük şehirler üstte. Rafineri petrol gerektirmeden günlük yakıt üretir ve yakıt deposunu büyütür.' : 'En çok boş yuvası olan eyaletler üstte.'}</p><div class="list">`;
    for (const r of rows.slice(0, 40)) {
      const pr = st.prov[r.i];
      html += `<button class="item" data-act="build" data-b="${type}" data-v="${r.i}"><div class="grow"><div class="t">${esc(G.pname(r.i))}</div><div class="d">${type === 'fort' ? `Tahkimat ${pr.fort}/5${r.border ? ' · sınır' : ''}` : type === 'inf' ? `Altyapı ${pr.inf || 1}/5${r.border ? ' · sınır' : ''}${G.supAvail[c.tag] ? ' · ikmal ' + r1(G.supAvail[c.tag][r.i]) : ''}` : type === 'rail' ? `Demiryolu ${pr.rail || 0}/5 · altyapı ${pr.inf || 1}/5${r.border ? ' · sınır' : ''}${G.supAvail[c.tag] ? ' · ikmal ' + r1(G.supAvail[c.tag][r.i]) : ''}` : type === 'hub' ? `Altyapı ${pr.inf || 1}/5 · demiryolu ${pr.rail || 0}/5${P[r.i].c ? ' · kıyı' : ''}${G.supAvail[c.tag] ? ' · ikmal ' + r1(G.supAvail[c.tag][r.i]) : ''}` : type === 'ref' ? `Rafineri ${pr.ref || 0}/${b.max}` : type === 'ab' ? `Hava üssü ${pr.ab || 0}/10 · ${Math.round(G.baseLoad(r.i) / 100)}/${pr.ab || 0} kanat${P[r.i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) ? ' · cephe' : ''}` : `Boş yuva ${r.free} · S${pr.civ} A${pr.mil} T${pr.dock}`}</div></div><span class="btn sm pri">Ekle</span></button>`;
    }
    if (!rows.length) html += '<p class="muted">Uygun eyalet yok.</p>';
    return { title: b.n, html: html + '</div>' };
  }

  // Ordu
  const ORD_N = { hold: 'Bekle', def: 'Cepheyi tut', atk: 'Uygula ▶', fb: 'Hatta çekil' };
  UI.ORD_N = ORD_N;
  const genLine = (gen) => `${esc(gen.n)} <span class="muted small">${gen.fm ? 'Mareşal' : 'General'} · Sv ${gen.lvl}</span>`;
  const genSkills = (gen) => `<span class="skills"><b title="Saldırı">S ${gen.atk}</b><b title="Savunma">Sv ${gen.def}</b><b title="Planlama">P ${gen.plan}</b><b title="Lojistik">L ${gen.log}</b></span>${gen.tr.length ? `<div class="d">${gen.tr.map((t) => g.GEN_TRAITS[t].n).join(' · ')}</div>` : ''}`;
  PANELS.army = () => {
    const st = G.st, c = me();
    if (UI.sub && UI.sub.startsWith('tpl:')) return templateDesigner(c, UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('gen:')) return generalPicker(c, +UI.sub.slice(4));
    if (UI.sub === 'gens') return generalList(c);
    if (UI.sub && UI.sub.startsWith('div:')) return divisionView(c, +UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('divs:')) return armyDivisions(c, +UI.sub.slice(5));
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
      const mx = G.maxPlan(c, a);
      oh += `<div class="item army" style="border-left:4px solid ${G.armyColor(a)}"><div class="grow">
        <div class="row" style="gap:8px"><div class="t grow">${esc(a.n)} <span class="muted small">${us.length}/${G.ARMY_MAX} tümen${battle ? ` · <span class="bad">${battle} muharebe</span>` : ''}</span></div><button class="btn sm" data-act="armysel" data-v="${a.id}">Haritada seç</button></div>
        <button class="genrow" data-act="sub" data-v="gen:${a.id}">${gen ? `<div>${genLine(gen)}</div>${genSkills(gen)}` : '<span class="warn">Komutan ata ›</span>'}</button>
        <div class="small muted">Cephe: ${a.vs ? esc(G.cname(a.vs)) : 'tüm düşmanlar'} · ${a.front && a.front.length ? a.front.length + ' eyaletlik hat' : 'hat yok'}${a.goal != null ? ' · hedef: ' + esc(G.pname(a.goal)) : ''}</div>
        <div class="row" style="gap:8px;align-items:center"><span class="small">Plan %${Math.round((a.plan || 0) * 100)}/${Math.round(mx * 100)}</span><div class="grow">${bar((a.plan || 0) / mx, a.ord === 'atk' ? 'r' : 'g')}</div></div>
        <div class="seg sm">${Object.entries(ORD_N).map(([k, n]) => `<button class="${a.ord === k ? 'on' : ''}" data-act="armyord" data-k="${a.id}" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="armyvs" data-v="${a.id}">Cephe değiştir</button><button class="btn sm" data-act="armygoal" data-v="${a.id}">Taarruz oku çiz</button>${a.goal != null ? `<button class="btn sm" data-act="armygoalclr" data-v="${a.id}">Oku sil</button>` : ''}<button class="btn sm ${c.deployArmy === a.id ? 'pri' : ''}" data-act="armydeploy" data-v="${a.id}">Yeni tümenler buraya</button><button class="btn sm" data-act="armyadd" data-v="${a.id}" ${R.sel.units.size ? '' : 'disabled'}>Seçilileri ekle</button><button class="btn sm danger" data-act="armydel" data-v="${a.id}">Dağıt</button></div>
        <div class="row" style="gap:6px"><div class="grow">${bar(str, 'g')}</div></div></div></div>`;
    }
    oh += `<p class="muted small" style="margin:0">HOI4'teki gibi: orduya bir <b>cephe</b> ver (“Cepheyi tut”), istersen <b>taarruz oku</b> çiz. Cephede beklerken <b>planlama</b> dolar; hazır olunca <b>Uygula</b> ile taarruz başlar ve plan bonusu saldırıya eklenir. Ordu başına en fazla ${G.ARMY_MAX} tümen.</p>`;
    oh += `</div><div class="btns"><button class="btn pri" data-act="armynew">${R.sel.units.size ? `Seçili ${R.sel.units.size} tümenden ordu kur` : 'Ordusuz tümenlerden ordu kur'}</button><button class="btn" data-act="sub" data-v="gens">Komutanlar (${c.gens.length})</button></div>`;
    html += sec('Ordular', oh, enemies.length ? `${enemies.length} düşman` : 'barış');
    const oc = G.occSummary ? G.occSummary(c.tag) : null;
    if (oc && oc.n) html += sec('İşgal altındaki topraklar', kv([['Eyalet', oc.n], ['Ort. direniş', pct(oc.rs), oc.rs > 0.4 ? 'bad' : ''], ['Ort. uyum', pct(oc.cp)], ['Sabotaj', oc.sab, oc.sab ? 'bad' : ''], ['İşgal yasası', g.LAWS.occ.opts[c.laws.occ ?? 1].n]]) + `<p class="muted small" style="margin:0">Direniş, işgal ettiğin yerlerden gelen sanayiyi ve ikmali düşürür. Eyalette ya da yanında tümen bulundurmak (garnizon) direnişi bastırır; zamanla uyum artar. Harita modu “Direniş” ile bak.</p>`);
    // şablonlar ve eğitim
    const tpl = G.templatesOf(c);
    let th = '<div class="list">';
    for (const id of Object.keys(tpl)) {
      const t = G.T(c.tag, id);
      const locked = Object.keys(tpl[id].b).some((k) => g.BATS[k]?.req && !c.tech[g.BATS[k].req]);
      const ok = !locked && mp.avail >= t.mp;
      th += `<div class="item"><div class="grow"><div class="t">${esc(t.n)}</div><div class="d">${Object.entries(tpl[id].b).map(([k, n]) => `${n}×${g.BATS[k].n}`).join(', ')}${Object.keys(tpl[id].s || {}).length ? ' · ' + Object.keys(tpl[id].s).map((k) => g.SUPPORTS[k].n).join(', ') : ''}</div><div class="d">Yumuşak ${r1(t.sa)} · Sert ${r1(t.ha)} · Savunma ${r1(t.df)} · Atılım ${r1(t.bt)} · Moral ${Math.round(t.org)} · Hız ${t.spd} · Genişlik ${t.w}${t.arm ? ' · Zırh ' + Math.round(t.arm) : ''} · ${t.mp}K asker · ${t.days} gün${locked ? ' · <span class="warn">teknoloji gerekli</span>' : ''}</div></div><div class="btns col"><button class="btn sm ${ok ? 'pri' : ''}" data-act="train" data-v="${id}" data-n="1" ${ok ? '' : 'disabled'}>+1</button><button class="btn sm" data-act="train" data-v="${id}" data-n="5" ${ok && mp.avail >= t.mp * 5 ? '' : 'disabled'}>+5</button><button class="btn sm" data-act="sub" data-v="tpl:${id}">Tasarla</button></div></div>`;
    }
    th += `</div><button class="btn" data-act="tplnew">+ Yeni tümen şablonu</button>`;
    html += sec('Tümen tasarımcısı ve eğitim', th, 'Tümenler başkentte konuşlanır');
    if (c.train.length) {
      let qh = '<div class="list">';
      c.train.forEach((t, i) => {
        const u = G.T(c.tag, t.u);
        let ratio = 1; for (const [e, n] of Object.entries(u.eq)) ratio = Math.min(ratio, (c.stock[e] || 0) / n);
        qh += `<div class="item"><div class="grow"><div class="t">${esc(u.n)}</div><div class="d">${t.d > 0 ? Math.ceil(t.d) + ' gün kaldı' : ratio < 0.25 ? '<span class="warn">Teçhizat bekleniyor</span>' : 'Konuşlanıyor'}</div>${bar(1 - t.d / u.days)}</div><button class="btn sm" data-act="tdel" data-v="${i}" aria-label="İptal">✕</button></div>`;
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

  // Tümen ayrıntısı (HOI4 tümen penceresi)
  function divisionView(c, id) {
    const st = G.st, u = st.units.find((x) => x.id === id);
    if (!u) { UI.sub = null; return PANELS.army(); }
    const s2 = G.unitStats(u), t = s2.t;
    const a = u.army ? G.armyById(c, u.army) : null;
    const gen = G.genOf(u);
    const sup = G.supplyMul(u);
    const state = u.sr ? 'Stratejik konuşlanma' : G.inBattle && G.inBattle.has(u) ? 'Muharebede' : u.ret ? 'Geri çekiliyor' : u.path.length ? `${G.pname(u.path[u.path.length - 1])} yönünde ilerliyor` : 'Mevzide';
    const xl = G.xpName(u.xp);
    let html = `<div class="row" style="gap:10px;align-items:center"><canvas class="nato" data-k="${R.kindOf(u)}" data-c="${R.ccolor(u.t)}" width="44" height="30"></canvas><div class="grow"><div class="t"><b>${esc(t.n)}</b>${u.vol ? ` <span class="pill ally">Gönüllü (${esc(G.cname(u.vol))})</span>` : ''}</div><div class="muted small">${u.loc < NP ? esc(G.pname(u.loc)) : 'Denizde'} · ${state}</div></div></div>`;
    html += kv([['Güç', pct(u.str), u.str < 0.5 ? 'bad' : ''], ['Moral', `${Math.round(Math.max(0, u.org))}/${Math.round(s2.org)}`, u.org < s2.org * 0.3 ? 'bad' : ''], ['Tecrübe', xl], ['Yumuşak saldırı', r1(s2.sa)], ['Sert saldırı', r1(s2.ha)], ['Savunma', r1(s2.df)], ['Atılım', r1(s2.bt)], ['Sertlik', pct(s2.hd)], ['Zırh', Math.round(s2.arm)], ['Zırh delme', Math.round(s2.prc)], ['Genişlik', t.w], ['Hız', r1(s2.spd / 2.4) + ' km/s'], ['Siper', pct(u.ent || 0)], ['İkmal', pct(G.supplyRatio(u)), G.supplyRatio(u) < 0.8 ? 'bad' : ''], ['İkmal kullanımı', r1(G.supplyUse(u))]]);
    html += `<div class="row" style="gap:8px;align-items:center"><span class="small">Tecrübe</span><div class="grow">${bar(u.xp ?? 0.25)}</div></div><div class="small muted" style="margin-top:-6px">${G.XP_LV.map(([, n]) => n === xl ? `<b style="color:var(--paper)">${n}</b>` : n).join(' › ')}</div>`;
    html += sec('Komuta', `<div class="small">${a ? `${esc(a.n)}${gen ? ' · ' + esc(gen.n) : ''}` : 'Ordusuz'}${u.auto ? ' · otomatik kurmay' : ''}</div><div class="small muted">Teçhizat modelleri: piyade ${g.MODEL_N?.inf?.[Math.floor(u.lv?.inf || 1)] || 'Sv ' + r1(u.lv?.inf || 1)}${t.eq.art ? ' · topçu ' + (g.MODEL_N?.art?.[Math.floor(u.lv?.art || 1)] || r1(u.lv?.art || 1)) : ''}${t.eq.tank ? ' · tank ' + (g.MODEL_N?.tank?.[Math.floor(u.lv?.tank || 1)] || r1(u.lv?.tank || 1)) : ''}</div>`);
    html += `<div class="btns"><button class="btn sm" data-act="divonly" data-v="${u.id}">Yalnız bunu seç</button><button class="btn sm" data-act="divrm" data-v="${u.id}">Seçimden çıkar</button>${(c.armies || []).length ? `<button class="btn sm" data-act="divarmy" data-v="${u.id}">Ordusu: ${a ? esc(a.n) : 'yok'} ›</button>` : ''}</div>`;
    html += `<p class="muted small" style="margin:0">Düşmana verilen vuruş, düşmanın sertliğine göre yumuşak ve sert saldırıdan oluşur (sertlik = zırhlı araç oranı). Savunurken savunma, saldırırken atılım gelen vuruşları karşılar: karşılanan vuruşların yalnızca %10'u, fazlası ise %40 oranında hasar verir. Zırh, düşmanın zırh delmesinden yüksekse alınan hasar yarıya kadar düşer. Tecrübe muharebede kazanılır; takviye gelen acemi askerler tecrübeyi düşürür.</p>`;
    return { title: 'Tümen', html };
  }
  function armyDivisions(c, id) {
    const a = G.armyById(c, id); if (!a) { UI.sub = null; return PANELS.army(); }
    const us = G.armyUnits(c, id);
    let html = `<div class="list">`;
    for (const u of us) {
      const s2 = G.unitStats(u);
      html += `<button class="item" data-act="divinfo" data-v="${u.id}"><div class="grow"><div class="t">${esc(s2.t.n)} <span class="muted small">${u.vol ? 'Gönüllü (' + esc(G.cname(u.vol)) + ') · ' : ''}${u.loc < NP ? esc(G.pname(u.loc)) : 'Denizde'} · ${G.xpName(u.xp)}</span></div><div class="row" style="gap:6px"><div class="grow">${bar(u.str, 'g')}</div><div class="grow">${bar(Math.max(0, u.org) / s2.org)}</div></div></div><span class="muted">›</span></button>`;
    }
    return { title: `${a.n} · ${us.length} tümen`, html: html + '</div>' };
  }
  // Muharebe ekranı (HOI4 muharebe penceresi)
  PANELS.battle = () => {
    const st = G.st, n = UI.battleN;
    const b = (G.battles || []).find((x) => x.n === n);
    if (!b) return { title: 'Muharebe', html: `<p class="muted">${n >= 0 ? esc(G.pname(n)) : ''}: muharebe sona erdi.</p>` };
    const te = g.TERRAIN[P[n].te];
    const side = (tag, L, used, isAtt) => {
      const gen = L[0] ? G.genOf(L[0]) : null;
      const usedSet = new Set(used);
      const w = used.reduce((s2, u) => s2 + (u._s?.t.w || 15), 0);
      let h = `<div class="bside"><div class="row" style="gap:6px;align-items:center">${G.flag(tag, 24, 16)}<b>${esc(G.cname(tag))}</b></div><div class="small muted">${isAtt ? 'Saldıran' : 'Savunan'} · ${gen ? esc(gen.n) : 'komutan yok'}</div><div class="small">Cephede ${used.length} tümen (genişlik ${w}/${b.width}) · yedek ${L.length - used.length}</div><div class="bdivs">`;
      for (const u of L.slice(0, 24)) { const s2 = u._s || G.unitStats(u); h += `<div class="bdiv ${usedSet.has(u) ? '' : 'res'}"><span>${s2.t.s}</span>${bar(u.str, 'g')}${bar(Math.max(0, u.org) / s2.org)}</div>`; }
      return h + '</div></div>';
    };
    const mine = b.att === st.player || G.sameFaction(b.att, st.player);
    const theirs = b.def === st.player || G.sameFaction(b.def, st.player);
    const neutral = !mine && !theirs;
    const adv = mine || neutral ? b.adv : 1 - b.adv;
    const mods = [];
    if (te.atk) mods.push([`Arazi: ${te.n}`, `saldırı ${te.atk > 0 ? '+' : ''}${Math.round(te.atk * 100)}%`]);
    if (b.fort) mods.push(['Tahkimat', `savunma +${b.fort * 15}%`]);
    const ent = b.D.reduce((s2, u) => s2 + (u.ent || 0), 0) / Math.max(1, b.D.length);
    if (ent > 0.05) mods.push(['Siper', `savunma +${Math.round(ent * 25)}%`]);
    if (b.amph) mods.push(['Deniz çıkarması', 'saldırı cezası']);
    const pc = st.C[b.att]; const ar = b.A[0]?.army && b.att === st.player ? G.armyById(pc, b.A[0].army) : null;
    if (ar && ar.plan > 0.005) mods.push(['Planlama bonusu', `saldırı +${Math.round(ar.plan * 100)}%`]);
    if (b.aAir !== 1) mods.push(['Saldıran hava gücü', `${b.aAir > 1 ? '+' : ''}${Math.round((b.aAir - 1) * 100)}%`]);
    if (b.dAir !== 1) mods.push(['Savunan hava gücü', `${b.dAir > 1 ? '+' : ''}${Math.round((b.dAir - 1) * 100)}%`]);
    if (b.riv > 0.004) { mods.push(['Nehir geçişi (saldıran)', `saldırı −%${Math.round(b.riv * 100)}`]); if (G.RIVER_DEF * b.riv >= 0.005) mods.push(['Nehir (savunan)', `savunma +%${Math.round(G.RIVER_DEF * b.riv * 100)}`]); }
    if (b.dirs > 1) mods.push([`Kuşatma (${b.dirs} yönden)`, `cephe genişliği +%${Math.min(2, b.dirs - 1) * 50}`]);
    mods.push(['Sertlik (saldıran / savunan)', `%${Math.round((b.hdA || 0) * 100)} / %${Math.round((b.hdD || 0) * 100)}`]);
    const armBlock = (L, prc) => { const k = L.filter((u) => u._s && u._s.arm > prc).length; if (!k) return 0; const f = L.filter((u) => u._s && u._s.arm > prc).reduce((s2, u) => s2 + Math.max(0.5, prc / u._s.arm), 0) / k; return { k, f }; };
    const aB = armBlock(b.A, b.prcD || 0), dB = armBlock(b.D, b.prcA || 0);
    if (aB) mods.push([`Delinemeyen zırh (saldıran, ${aB.k} tümen)`, `alınan hasar −%${Math.round((1 - aB.f) * 100)}`]);
    if (dB) mods.push([`Delinemeyen zırh (savunan, ${dB.k} tümen)`, `alınan hasar −%${Math.round((1 - dB.f) * 100)}`]);
    if (b.hmA && b.hmA !== 1) mods.push(['Tarihî akış dengesi (saldıran)', `${b.hmA > 1 ? '+' : '−'}%${Math.round(Math.abs(b.hmA - 1) * 100)}`]);
    if (b.hmD && b.hmD !== 1) mods.push(['Tarihî akış dengesi (savunan)', `${b.hmD > 1 ? '+' : '−'}%${Math.round(Math.abs(b.hmD - 1) * 100)}`]);
    if (G.wx.snow[n] > 0.3 || G.wx.mud[n] > 0.3) mods.push([`Hava: ${G.weatherName(n)}`, `saldırı −%${Math.round((1 - G.wxAtk(n)) * 100)}`]);
    let html = `<div class="small muted">${esc(G.pname(n))} · ${te.n} · cephe genişliği ${b.width}</div>`;
    html += `<div class="row" style="gap:8px;align-items:center"><b class="${neutral ? 'warn' : adv > 0.55 ? 'good' : adv < 0.45 ? 'bad' : 'warn'}">${neutral ? (adv > 0.6 ? 'Saldıran önde' : adv < 0.4 ? 'Savunan önde' : 'Denge') : adv > 0.6 ? 'Kazanıyoruz' : adv < 0.4 ? 'Kaybediyoruz' : 'Denge'}</b><div class="grow">${bar(adv, adv > 0.55 ? 'g' : adv < 0.45 ? 'r' : '')}</div><span class="small">%${Math.round(adv * 100)}</span></div>`;
    html += `<div class="bgrid">${side(b.att, b.atts, b.A, true)}${side(b.def, b.defs, b.D, false)}</div>`;
    if (b.tac && b.tac.ta) {
      const T = g.TACTICS, tc = b.tac;
      const card = (k, side, lost, win) => { const t = T[k]; return `<div class="tac ${lost ? 'lost' : ''} ${win ? 'win' : ''}"><small>${side}</small><b>${esc(t.n)}</b>${win ? '<span class="pill ally">Sayaç!</span>' : lost ? '<span class="pill war">Sayaçlandı</span>' : ''}<span class="d">${esc(t.d)}</span></div>`; };
      let th = `<div class="tacs">${card(tc.ta, 'Saldıran', tc.cnt === 'd', tc.cnt === 'a')}${card(tc.td, 'Savunan', tc.cnt === 'a', tc.cnt === 'd')}</div>`;
      th += `<div class="small muted">Evre: <b>${G.PHASES[tc.phase] || 'Normal'}</b> · komutan taktik becerisi ${tc.sa} / ${tc.sd} · hasar çarpanı saldıran ×${tc.mA.toFixed(2)}, savunan ×${tc.mD.toFixed(2)}</div>`;
      if (tc.hist.length > 1) th += `<div class="small muted">Önceki: ${tc.hist.slice(1).map(([a, d, c2]) => `${esc(T[a].n)} / ${esc(T[d].n)}${c2 ? ' ✓' : ''}`).join(' · ')}</div>`;
      html += sec('Taktikler', th);
    }
    html += sec('Etkenler', mods.length ? `<div class="mods">${mods.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Özel etken yok.</p>');
    html += `<p class="muted small" style="margin:0">Günlük vuruş: saldıran ${r1(b.hitD)} · savunan ${r1(b.hitA)}. Moral ve gücü biten tümenler geri çekilir; çekilecek yeri kalmayan tümenler imha olur.</p>`;
    return { title: 'Muharebe', html };
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
    html += kv([['Yumuşak saldırı', r1(t.sa)], ['Sert saldırı', r1(t.ha)], ['Savunma', r1(t.df)], ['Atılım', r1(t.bt)], ['Sertlik', pct(t.hd)], ['Moral', Math.round(t.org)], ['Hız', t.spd], ['Zırh', Math.round(t.arm)], ['Zırh delme', Math.round(t.prc)], ['Genişlik', t.w], ['Asker', t.mp + 'K'], ['Eğitim', t.days + ' gün']]);
    html += `<p class="muted small" style="margin:0">Teçhizat: ${Object.entries(t.eq).map(([e, n]) => `${Math.round(n)} ${g.EQUIP[e].s.toLowerCase()}`).join(', ')}. Muharebe genişliği arazinin kaldırabileceği tümen sayısını belirler (ovada 80).</p>`;
    let bh = '<div class="list">';
    for (const [k, b] of Object.entries(g.BATS)) {
      const locked = b.req && !c.tech[b.req];
      const n = tpl.b[k] || 0;
      bh += `<div class="item ${locked ? 'locked' : ''}"><div class="grow"><div class="t">${b.n}</div><div class="d">Yum. ${b.sa} · Sert ${b.ha} · Sv ${b.df} · Atl ${b.bt} · Moral ${b.org} · Hız ${b.spd} · G ${b.w}${b.ap ? ' · Zırh ' + b.ap : ''}${b.hd ? ' · Sertlik %' + Math.round(b.hd * 100) : ''}${locked ? ' · teknoloji gerekli' : ''}</div></div><div class="stepper"><button data-act="tplb" data-k="${id}" data-e="${k}" data-v="-1" ${n ? '' : 'disabled'}>−</button><b>${n}</b><button data-act="tplb" data-k="${id}" data-e="${k}" data-v="1" ${locked || nb >= g.MAX_BATS ? 'disabled' : ''}>+</button></div></div>`;
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
    // bağlı devletler ve özerklik (HOI4)
    const subs = G.subjectsOf(c.tag);
    const autoRow = (x, mine) => { const L = G.AUTO_LV[G.autoLevel(x)], cd = x.autoCd > st.day; return `<div class="item">${G.flag(x.tag, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(x.tag))} <span class="muted small">${L.n}</span></div>${bar((x.auto ?? 30) / 100)}<div class="d">Özerklik %${Math.round(x.auto ?? 30)} · efendiye kaynakların %${Math.round(L.res * 100)}'i ve askerî fabrikaların %${Math.round(L.mil * 100)}'i${x._share && x._share.mil ? ` (${x._share.mil} fabrika)` : ''}</div>${mine ? `<div class="btns" style="margin-top:6px"><button class="btn sm" data-act="auto" data-k="tight" data-v="${x.tag}" ${c.pp >= 50 && !cd ? '' : 'disabled'}>Kontrolü sıkılaştır · 50 SG</button><button class="btn sm" data-act="auto" data-k="give" data-v="${x.tag}" ${cd ? 'disabled' : ''}>Özerklik tanı</button><button class="btn sm" data-act="auto" data-k="free" data-v="${x.tag}">Bağımsızlık ver</button></div>` : `<div class="btns" style="margin-top:6px"><button class="btn sm" data-act="auto" data-k="push" data-v="${x.overlord}" ${c.pp >= 60 && !cd ? '' : 'disabled'}>Daha fazla özerklik iste · 60 SG</button></div>`}</div></div>`; };
    if (subs.length) html += sec('Bağlı devletler', `<p class="muted small" style="margin:0">Özerklik düştükçe bağlı devletin kaynak ve fabrikalarından daha büyük pay alırsın. Savaşta zayıflarsan özerklik hızla artar; %100'de bağımsızlık ilan edilir.</p><div class="list">${subs.map((x) => autoRow(x, true)).join('')}</div>`, `${subs.length}`);
    if (c.overlord && st.C[c.overlord]?.alive) html += sec('Efendi devlet', `<p class="muted small" style="margin:0">${esc(G.cname(c.overlord))} devletine bağlıyız. Özerklik %100 olunca bağımsızlığımızı ilan ederiz.</p><div class="list">${autoRow(c, false)}</div>`);
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
  // Seçimler (yalnızca demokrasiler): sonraki seçim tarihi, son sonuç, askıya alma
  function electionSection(c) {
    if (!G.hasElections(c)) return '';
    const el = G.elecInit(c), P2 = g.PARTY_N;
    const last = el.last ? `Son seçim: ${G.fmtDate(el.last.d)} · ${P2[el.last.top]} önde (iktidar partisi %${Math.round(el.last.p * 100)})` : 'Henüz seçim yapılmadı.';
    let h = `<div class="item"><div class="grow"><div class="t">Sonraki seçim: ${el.susp ? 'askıda' : G.elecDate(c)}</div><div class="d">${last}</div></div></div>`;
    if (el.susp) h += `<button class="item" data-act="elres"><div class="grow"><div class="t">Seçimleri yeniden başlat</div><div class="d">Seçimler askıdayken istikrar -%10. Savaş bitince seçimler kendiliğinden döner.</div></div><span class="muted">›</span></button>`;
    else if (c.enemies.length) { const r = G.elecCanSuspend(c); h += `<button class="item" data-act="elsusp" ${r.ok ? '' : 'disabled'} style="${r.ok ? '' : 'opacity:.5'}"><div class="grow"><div class="t">Seçimleri askıya al · ${G.elecSuspendCost} SG</div><div class="d">Savaş sürerken seçimler durur; karşılığında istikrar -%10.${r.ok ? '' : ' ' + esc(r.why)}</div></div><span class="muted">›</span></button>`; }
    return sec('Seçimler', `<div class="list">${h}</div><p class="muted small" style="margin:0">Seçimde demokratlar %50'yi geçerse iktidar sürer ve istikrar artar; geçemezse en çok oyu alan parti hükümeti kurar.</p>`);
  }
  // Gönüllü kuvvetler: savaştaki bir ülkeye tümen ve uçak gönder, geri çağır
  function volunteerSection(c, tag, x) {
    const sentD = G.volSent(c.tag, tag), sentA = Math.round(G.volAirSent(c.tag, tag));
    const open = x.enemies.length > 0 && !G.atWar(c.tag, tag);
    if (!open && !sentD && !sentA) return '';
    const r = open ? G.volCheck(c.tag, tag) : { ok: false, why: '' };
    let h = kv([['Tümen kotası', `${G.volSent(c.tag)}/${G.volCap(c.tag)}`], ['Hava kotası', `${Math.round(G.volAirSent(c.tag))}/${G.volAirCap(c.tag)}`]]);
    if (sentD || sentA) h += `<p class="small good" style="margin:0">${esc(G.cname(tag))} cephesinde: ${sentD} tümen · ${sentA} uçak</p>`;
    if (open && !r.ok) h += `<p class="small warn" style="margin:0">${esc(r.why)}</p>`;
    if (open) {
      const NM = { fig: 'avcı', cas: 'yakın destek', bom: 'bombardıman' };
      h += `<div class="btns">${[1, 2, 4].map((n) => `<button class="btn sm ${r.ok && r.left >= n ? 'pri' : ''}" data-act="volsend" data-k="${tag}" data-v="${n}" ${r.ok && r.left >= n ? '' : 'disabled'}>${n} tümen</button>`).join('')}</div>`;
      h += `<div class="btns">${g.PLANES.map((e) => [50, 100].filter((n) => e === 'fig' || n === 50).map((n) => { const ok = r.ok && r.airLeft >= n && G.planes(c, e) >= n; return `<button class="btn sm ${ok ? 'pri' : ''}" data-act="volair" data-k="${tag}" data-e="${e}" data-v="${n}" ${ok ? '' : 'disabled'}>${n} ${NM[e]}</button>`; }).join('')).join('')}</div>`;
    }
    if (sentD || sentA) h += `<button class="btn sm" data-act="volback" data-v="${tag}">Gönüllüleri geri çağır</button>`;
    return sec('Gönüllü kuvvetler', `<p class="muted small" style="margin:0">Savaşa girmeden dost bir ülkeye tümen ve uçak gönder. Gönüllüler alıcının komutasında savaşır; insan gücü ve takviye sana yazılır, savaş bitince eve dönerler, deneyim sende kalır. En çok ordunun %10'u.</p>${h}`);
  }
  function countryView(tag) {
    const st = G.st, c = me(), x = st.C[tag], d = G.def(tag);
    const divs = st.units.filter((u) => u.t === tag).length;
    let html = `<div class="row">${G.flag(tag, 54, 36)}<div class="grow"><div style="font-size:20px;font-weight:700">${esc(d.n)}</div><div class="muted small">${esc(d.l)} · <span style="color:${g.IDEOLOGIES[x.ideo].c}">${g.IDEOLOGIES[x.ideo].n}</span>${x.fac ? ' · ' + esc(st.factions[x.fac]?.n || '') : ''}</div><div style="margin-top:4px">${relPills(c.tag, tag)}</div></div></div>`;
    const ratio = G.armyPower(tag) / (G.armyPower(c.tag) + 1);
    html += kv([['Tümen', divs], ['Sivil fab.', x.sum.civ], ['Askerî fab.', x.sum.mil], ['Eyalet', x.sum.provs], ['Ordu gücü', ratio > 1.3 ? 'Bizden güçlü' : ratio < 0.7 ? 'Bizden zayıf' : 'Denk', ratio > 1.3 ? 'bad' : ratio < 0.7 ? 'good' : ''], ['Görüş', G.opinion(tag, c.tag) > 20 ? 'Dostane' : G.opinion(tag, c.tag) < -20 ? 'Düşmanca' : 'Nötr']]);
    if (x.enemies.length) html += `<p class="small" style="margin:0">Savaşta: ${x.enemies.map((t) => esc(G.cname(t))).join(', ')}</p>`;
    if (x.overlord && st.C[x.overlord]?.alive) html += `<p class="small" style="margin:0">${esc(G.cname(x.overlord))} devletine bağlı · ${G.AUTO_LV[G.autoLevel(x)].n} (özerklik %${Math.round(x.auto ?? 30)})</p>`;
    const xs = G.subjectsOf(tag); if (xs.length) html += `<p class="small" style="margin:0">Bağlı devletleri: ${xs.map((y) => esc(G.cname(y.tag))).join(', ')}</p>`;
    const xsp = (x.spirits || []).filter((s) => g.SPIRITS[s]);
    if (xsp.length) html += sec('Ulusal ruhlar', `<div class="list">${xsp.map((s) => spiritHtml(s, x)).join('')}</div>`, `${xsp.length}`);
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
    html += volunteerSection(c, tag, x);
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
    const modes = UI.MODE_N;
    html += sec('Harita modu', `<div class="seg wrap">${Object.entries(modes).map(([k, n]) => `<button class="${R.mode === k ? 'on' : ''}" data-act="setmode" data-v="${k}">${n}</button>`).join('')}</div>`);
    html += sec('Ekran', `<div class="list"><button class="item" data-act="fullscreen"><div class="grow"><div class="t">Tam ekran ve yatay mod</div><div class="d">Telefonu yan çevirince arayüz otomatik olarak yatay düzene geçer. Bu düğme destekleyen tarayıcılarda tam ekrana geçip ekranı yatay kilitler.</div></div><span class="muted">›</span></button></div>`);
    const snd = G.Audio ? G.Audio.on : { music: 0, sfx: 0 };
    html += sec('Ayarlar', `<div class="list"><button class="toggle ${snd.music ? 'on' : ''}" data-act="sound" data-v="music"><span><b>Müzik</b><br><span class="muted small">Ortam müziği; savaştayken uzaktan davul vuruşları.</span></span><i></i></button><button class="toggle ${snd.sfx ? 'on' : ''}" data-act="sound" data-v="sfx"><span><b>Ses efektleri</b><br><span class="muted small">Savaş ilanı borusu, teslim davulu, araştırma çanı, muharebe top sesleri.</span></span><i></i></button><button class="toggle ${R.showWeather ? 'on' : ''}" data-act="wxtoggle"><span><b>Hava durumu katmanı</b><br><span class="muted small">Kar beyaz, çamur kahverengi çizgili gösterilir.</span></span><i></i></button><button class="toggle ${UI.settings.autosave ? 'on' : ''}" data-act="setting" data-v="autosave"><span><b>Aylık otomatik kayıt</b></span><i></i></button><button class="toggle ${UI.settings.news ? 'on' : ''}" data-act="setting" data-v="news"><span><b>Dünya haberleri</b><br><span class="muted small">Büyük tarihî olaylar (Anschluss, Barbarossa, Pearl Harbor…) haber penceresi olarak gelir.</span></span><i></i></button><button class="toggle ${st.opts.hist ? 'on' : ''}" data-act="setting" data-v="hist"><span><b>Tarihî yapay zekâ</b><br><span class="muted small">Açıkken yapay zekâ ülkeleri tarihî olayları izler; senin katılmadığın kilit cepheler (Doğu Cephesi, Çin) tarihî akıştan çok saparsa geride kalan yapay zekâ tarafı muharebede kademeli destek alır. Kapalıysa ülkeler kendi hedeflerini kovalar.</span></span><i></i></button></div>`);
    html += sec('Oyun', `<div class="list"><button class="item" data-act="sub" data-v="log"><div class="grow"><div class="t">Olay günlüğü</div></div><span class="muted">›</span></button><button class="item" data-act="sub" data-v="help"><div class="grow"><div class="t">Nasıl oynanır</div></div><span class="muted">›</span></button><button class="item" data-act="tutorial"><div class="grow"><div class="t">Başlangıç rehberi</div><div class="d">Temel ekranları adım adım gösterir</div></div><span class="muted">›</span></button><button class="item" data-act="sub" data-v="new"><div class="grow"><div class="t">Yeni oyun</div></div><span class="muted">›</span></button></div>`);
    return { title: 'Menü', html };
  };

  const HELP = `<div class="sec"><p style="margin:0">Amaç: 1 Ocak 1936'dan itibaren ülkeni büyük bir savaşa hazırla, ittifaklar kur ve zafer puanı taşıyan şehirleri ele geçir.</p></div>
  <section class="sec"><h3 class="sec-h">Harita</h3><p class="small" style="margin:0">Tek parmakla kaydır, iki parmakla yakınlaştır. Bir eyalete dokununca bilgi kartı açılır. Sağdaki düğmeler harita modunu değiştirir, alan seçimini açar ve başkente döner.</p></section>
  <section class="sec"><h3 class="sec-h">Birlikler</h3><p class="small" style="margin:0">Kendi tümenlerinin bulunduğu eyalete (veya sayaca) dokun: tümenler seçilir. Sonra hedef eyalete dokun: en kısa yol bulunur. Deniz aşırı hedeflerde birlikler gemiyle taşınır; düşman kıyısına çıkarma için yeterli deniz gücü gerekir. Düşman birliği olan eyalete yürümek saldırı başlatır. Muharebe simgesindeki renk üstünlüğü gösterir.</p></section>
  <section class="sec"><h3 class="sec-h">Muharebe</h3><p class="small" style="margin:0">HOI4 muharebe modeli: her tümen her gün düşmana <b>yumuşak saldırı</b> (piyadeye karşı) ve <b>sert saldırı</b> (zırhlılara karşı) karışımıyla vurur; karışımı düşmanın <b>sertliği</b> (zırhlı araç oranı) belirler. Gelen vuruşları savunan <b>savunma</b>, saldıran <b>atılım</b> değeriyle karşılar: karşılanan vuruşların yalnızca %10'u, fazlası ise %40 oranında moral (sarı çizgi) ve güç (yeşil çizgi) kaybettirir. <b>Zırh</b> düşmanın <b>zırh delmesinden</b> yüksekse alınan hasar yarıya kadar iner; bu yüzden tanklara karşı tanksavar desteği ya da kendi tankların gerekir. Birden çok yönden saldırmak cephe genişliğini her yön için %50 artırır. Dağ, orman, bataklık, nehir ve şehirler saldırana ceza verir; tahkimat ve siper savunmayı güçlendirir. Moral biten savunucu geri çekilir; geri çekilecek yeri yoksa kuşatılıp yok olur.</p></section>
  <section class="sec"><h3 class="sec-h">Kara doktrinleri</h3><p class="small" style="margin:0">Araştırma panelindeki doktrin sekmesinde HOI4'teki dört kara doktrininden <b>yalnızca birini</b> seçebilirsin: Mobil Savaş (tank hızı ve atılımı), Üstün Ateş Gücü (topçu ve savunma), Büyük Savaş Planı (planlama ve siper) ya da Kitle Saldırısı (insan gücü ve moral). İlk adımı attığında diğer üç ağaç kilitlenir.</p></section>
  <section class="sec"><h3 class="sec-h">Ekonomi</h3><p class="small" style="margin:0">Sivil fabrikalar inşaat yapar ve kaynak ithal eder. Askerî fabrikalar teçhizat, tersaneler gemi üretir. Çelik ve petrol eksikliği üretimi düşürür. Yasalar daha fazla asker ve fabrika verir ama savaş veya gerginlik gerektirebilir.</p></section>
  <section class="sec"><h3 class="sec-h">Diplomasi</h3><p class="small" style="margin:0">Savaş ilan etmek için önce savaş gerekçesi üret. Demokrasiler yüksek dünya gerginliği olmadan gerekçe üretemez. İttifak üyeleri saldırıya uğrayan müttefiklerini savunur. Bir ülke topraklarının büyük kısmını kaybedince teslim olur.</p></section>
  <section class="sec"><h3 class="sec-h">Tank ve uçak tasarımcısı</h3><p class="small" style="margin:0">Üretim panelindeki Tasarım bürosundan kendi tank, avcı, yakın destek ve bombardıman uçağı modellerini tasarlarsın. Önce araştırdığın şasiyi/gövdeyi seç, sonra modülleri: tankta ana silah, taret, süspansiyon, zırh kalınlığı, motor gücü ve özel modüller; uçakta silahlar, motor, bomba bölmesi, savunma taretleri ve özel modüller (zırh plakası, atılabilir yakıt tankı, bomba nişangâhı…). Her seçim saldırı, yarma, zırh, delme, hız, güvenilirlik, hava/kara/deniz saldırısı, menzil ve üretim maliyetini değiştirir. Zırhı düşmanın delme değerinden yüksek olan tanklar çok daha etkilidir. Tasarımı kaydetmek tecrübe puanı harcar (savaşta ve görevdeki kanatlarla kazanılır). Üretim hattında “Tasarım ▾” ile hattı yeni tasarıma geçirirsin; bu, fabrika verimini bir süre düşürür. Depodaki teçhizat üretilen tasarımların ortalamasıdır ve tümenler ile kanatlar takviye sırasında yeni modelleri yavaşça alır.</p></section>
  <section class="sec"><h3 class="sec-h">Barış konferansı</h3><p class="small" style="margin:0">Bir ülke teslim olunca ona karşı savaşan herkes konferansa katılır. Muharebelerde verdiğin hasar ve işgal ettiğin topraklar oranında puan alırsın. Sırayla bölge talep edilir (sıra her turda en çok puanı kalana geçer). Haritadaki rakam senin için maliyettir: kendi işgal ettiğin yer ucuz, başka bir galibin işgali pahalı, eski asli toprakların yarı fiyat. Puanını kukla devlet kurmak ya da yok olmuş ulusları serbest bırakmak için de harcayabilirsin. Kimsenin almadığı topraklar teslim olan ülkede kalır. Konferans sürerken zaman durur.</p></section>
  <section class="sec"><h3 class="sec-h">Hava kuvvetleri</h3><p class="small" style="margin:0">Dünya, HOI4\'teki gibi hava bölgelerine ayrılmıştır (Hava panelindeki ya da “Hava” harita modundaki kesikli çizgiler). Ürettiğin uçaklar stoka girer; Hava panelinden 100 uçaklık kanatlar kurarsın. Her kanada bir bölge ve görev ver: <b>Hava üstünlüğü</b> (avcı) düşman uçaklarıyla çarpışır ve o bölgedeki kara muharebelerine saldırı/savunma bonusu sağlar; <b>Önleme</b> düşman bombacılarını avlar; <b>Yakın hava desteği</b> bölgedeki muharebelerde tümenlerine ek saldırı verir; <b>Stratejik bombardıman</b> düşman fabrikalarını vurur, üretimini ve savaş desteğini düşürür; <b>Deniz saldırısı</b> düşman filolarını ve konvoylarını hedef alır. “Bölge seç” düğmesine basıp haritada bir yere dokunarak kanadı gönderirsin. <b>Hava üsleri:</b> her kanat bir hava üssüne konuşlanır (haritada ✈ simgesi; rakam üs seviyesi ve oradaki kanat sayısı). Üs seviyesi başına 100 uçak barınır; dolu üste etkinlik düşer. Kanat yalnızca uçağın menzili içindeki bölgelerde görev yapar (avcı ~700 km, YDU ~840 km, bombacı ~1400 km; atılabilir yakıt tankı ve dört motor menzili artırır). Bölge seçerken menzil dışındaysa kanat uygun bir üsse kendiliğinden taşınır; “Üs seç” ile üssü elle de belirleyebilirsin. Üssü düşman ele geçirirse kanat en yakın üsse çekilir. İnşaat panelinden hava üssü kurup büyütebilirsin; stratejik bombardıman düşman üslerini de vurur. Kayıplar stoktan kendiliğinden takviye edilir. “Hava kurmayı” açıkken kanatlar cephelere kendiliğinden dağıtılır.</p></section>
  <section class="sec"><h3 class="sec-h">Harita, şehirler ve boğazlar</h3><p class="small" style="margin:0">Eyaletler gerçek şehirlerin etrafında kuruludur ve 1936\'daki adlarıyla anılır (Danzig, Breslau, Königsberg, Leningrad, Stalingrad…). Yakınlaştıkça daha çok şehir adı görünür. Gemiler Türk Boğazları, Cebelitarık, Danimarka Boğazları, Kiel ve Süveyş kanalları, Panama, Kerç ve Messina\'dan geçebilir; ancak boğazı kontrol eden eyaletlerden biri düşman elindeyse geçemez.</p></section>
  <section class="sec"><h3 class="sec-h">İşgal: direniş ve uyum</h3><p class="small" style="margin:0">Asli toprağın olmayan her işgal edilmiş ya da ilhak edilmiş eyalette HOI4'teki gibi <b>direniş</b> birikir; sürgündeki hükümeti hâlâ savaşan halklarda ve Sovyet, Yugoslav, Çin, Polonya gibi güçlü partizan hareketlerinde daha hızlı. Eyalette ya da komşusunda tümenin varsa (garnizon) direniş bastırılır. Direniş düşük kaldıkça <b>uyum</b> artar. Direniş eyaletten aldığın sanayi ve kaynağı, ikmal merkezlerini ve yerel ikmali düşürür; yüksek direniş demiryollarını sabote eder ve garnizonuna insan gücü kaybettirir. Uyum ise üretimi geri kazandırır. Siyaset panelindeki <b>İşgal Yasası</b> bu dengeyi belirler: Sert Baskı direnişi bastırır ama uyumu yavaşlatır ve garnizonu yıpratır; Sivil Yönetim ve Yerel Öz Yönetim uyumu hızlandırır. Harita modu “Direniş” işgal bölgelerini gösterir.</p></section>
  <section class="sec"><h3 class="sec-h">İkmal, altyapı ve hava</h3><p class="small" style="margin:0">İkmal başkentten ve büyük şehirlerdeki ikmal merkezlerinden demiryolu ve altyapı boyunca akar; uzaklaştıkça azalır. Bir eyalette ikmalin kaldırabileceğinden fazla tümen yığarsan ya da düşman topraklarında çok derine inersen birliklerin saldırı gücü ve toparlanması düşer, ikmalsiz kalanlar yıpranır. İşgal ettiğin şehirler yarım kapasiteyle ikmal merkezi olur; anakaradan kopuk bölgeler yalnızca limanla, konvoy ve deniz üstünlüğüyle beslenir. “İkmal” harita modunda kırmızı yetersiz, yeşil bol ikmali gösterir; kutular ikmal merkezleridir. İnşaat panelinden altyapı kurarak ikmali ve hareket hızını artırabilirsin (ayrıntılar aşağıdaki bölümde). Kuzeyde kışın kar ve tipi saldırıyı, hareketi ve ikmali zorlaştırır, kışa hazırlıksız ordular yıpranır; Doğu Avrupa\'da ilkbahar ve sonbaharda çamur, Asya\'da muson vardır.</p></section>
  <section class="sec"><h3 class="sec-h">Ordular, cepheler ve savaş planları</h3><p class="small" style="margin:0">Oyun, tümenlerin bölgelere göre ordulara ayrılmış ve en iyi komutanların atanmış hâliyle başlar. Haritadaki ordu etiketine (komutan adı) dokunarak orduyu seç. <b>Cepheyi tut</b>: ordu düşman sınırında renkli bir cephe hattı kurar, tümenleri hatta dağıtır ve <b>planlama</b> çubuğu dolar. Ordu seçiliyken bir düşman eyaletine dokun: <b>taarruz oku</b> çizilir. <b>Uygula ▶</b>: taarruz başlar, plan bonusu saldırıya eklenir ve çarpıştıkça azalır. Sayaçlardaki NATO simgeleri tümen türünü (piyade ☒, zırhlı ⬭, motorize, süvari, dağ) gösterir; yeşil çizgi moral, sarı çizgi güçtür. Haritadaki çapraz kılıç simgesine dokununca muharebe ekranı açılır. Tümenler muharebede tecrübe kazanır (Acemi → Kıdemli). “Strat. konuşlan” dost topraklarda 4 kat hızlı taşır ama moral sıfırlanır.</p></section>
  <section class="sec"><h3 class="sec-h">Tümen tasarımcısı</h3><p class="small" style="margin:0">Her şablon piyade, topçu, tank, motorize, dağ, süvari ve deniz piyadesi taburlarından ve destek bölüklerinden (mühendis, keşif, destek topçusu, tanksavar, uçaksavar, lojistik, sahra hastanesi) oluşur. Piyade savunma ve dayanıklılık, topçu yumuşak saldırı, tank atılım, sert saldırı ve zırh getirir. Genişlik, arazinin kaç tümeni aynı anda savaştırabileceğini belirler.</p></section>
  <section class="sec"><h3 class="sec-h">Siyaset</h3><p class="small" style="margin:0">İstikrar fabrika verimini ve siyasi gücü, savaş desteği ise hangi askerlik ve ekonomi yasalarını seçebileceğini belirler. Danışmanlar ve tasarım büroları siyasi güçle atanır. Ulusal ruhlar kalıcı etkilerdir; odaklarla kazanılır ya da kaldırılır. Bir partinin desteği %50'yi geçerse hükümet değişebilir.</p></section>
  <section class="sec"><h3 class="sec-h">Ulusal ruhlar (buff ve debuff)</h3><p class="small" style="margin:0">HOI4'teki gibi her ülke kendine özgü ulusal ruhlarla başlar: Sovyetlerde Büyük Temizlik, ABD'de Büyük Buhran, Macaristan'da Trianon kısıtlamaları, İsviçre'de Ulusal Kale… Yeşil etkiler güçlendirir, kırmızılar zayıflatır. Her kartta ruhun nasıl kalkacağı yazar: bir <b>odakla</b> (odak ayrıntısında “Kaldırır” satırı), bir <b>tarihte</b> (ör. Bled Anlaşması) ya da <b>savaşa girince</b> (tarafsızlık ruhları). Savaş sırasında yeni ruhlar da gelir (Barbarossa Baskını, Stavka reformları, Çin Bataklığı). Başka ülkelerin ruhlarını Diplomasi panelinde ülkeye dokunarak görebilirsin.</p></section>
  <section class="sec"><h3 class="sec-h">Odaklar ve tarihî olaylar</h3><p class="small" style="margin:0">Yönettiğin ülkenin tarihî hamleleri (Anschluss, Münih, Danzig, Barbarossa, Marco Polo Köprüsü, Pearl Harbor, Kış Savaşı…) sabit bir tarihte kendiliğinden olmaz; HOI4'teki gibi ilgili <b>ulusal odağı</b> tamamladığında gerçekleşir. Böylece savaş, odak ağacın ve ordun hazır olmadan başlamaz. Odak ayrıntısında olayın tarihteki günü yazar; o gün geldiğinde olay günlüğüne bir hatırlatma düşer. Odak tamamlanınca karar penceresi açılır: “Bekle” dersen savaş gerekçesini alır, zamanı sen seçersin. Diğer ülkelerin olayları tarihî takvimle sürer.</p></section>
  <section class="sec"><h3 class="sec-h">Değişen tarih</h3><p class="small" style="margin:0">Tarihî gidişat modunda yapay zekâ cepheleri tarihe yakın ilerler. Bu denge savaşların gerçek başlangıcına göre kayar: Barbarossa'yı bir yıl geciktirirsen Doğu Cephesi takvimi de bir yıl kayar. Senin taraf olduğun cephelerde denge büyük ölçüde gevşer; sonuç senin hamlelerine bağlıdır. Kendi muharebelerine hiçbir zaman uygulanmaz.</p></section>
  <section class="sec"><h3 class="sec-h">Kararlar</h3><p class="small" style="margin:0">Siyaset → Kararlar'da siyasi güç harcayarak hükümet kararları alırsın: propaganda, huzur kampanyası, savaş tahvilleri, sınır tahkimatı, ilişki geliştirme ve ülkene özel tarihî kararlar. Süreli kararlar süre boyunca bir değiştirici verir ya da bitince sonuçlanır; her kararın kendi bekleme süresi vardır. Danışman ve yasalar için de siyasi güç gerektiğini unutma.</p></section>
  <section class="sec"><h3 class="sec-h">Nehirler</h3><p class="small" style="margin:0">Haritada mavi çizgilerle gösterilen nehirler, iki komşu il arasındaki geçişi zorlaştırır (HOI4'teki nehir geçişi). <b>Küçük nehir</b> saldırıyı %25, <b>büyük nehir</b> (Ren, Elbe, Oder, Vistül, Tuna, Dinyeper, Don, Volga, Nil, Dicle, Fırat, Yangtze, Sarı Irmak) %50 azaltır; nehri aşan tümenin yürüyüşü de %10 / %25 uzar. Ceza her tümenin geldiği kenara göre hesaplanır: nehir olmayan yönden gelen tümen ceza almaz, bu yüzden nehri geçmeden önce kanatlardan dolanmak ya da birden çok yönden saldırmak işe yarar. <b>İstihkâm</b> destek bölüğü olan tümenlerde ceza %40, <b>deniz piyadesi</b> tümenlerinde %50'ye kadar azalır; aynı hedefe birkaç gün saldırdıkça köprübaşı kurulur ve ceza en çok %40 daha düşer. Savunan taraf da küçük bir nehir bonusu alır. İl kartında komşu nehirler, muharebe panelinde ise “Nehir geçişi” etkeni görünür.</p></section>
  <section class="sec"><h3 class="sec-h">Demiryolları ve ikmal merkezleri</h3><p class="small" style="margin:0">Her eyaletin 0-5 arası bir <b>demiryolu</b> seviyesi vardır; ikmal, yüksek demiryolu seviyeli eyaletlerden geçerken çok daha az zayıflar ve cepheye daha uzağa ulaşır. Gelişmiş ülkelerin ana yurdunda demiryolu yoğundur; Sovyetler, Çin ve sömürgelerde zayıftır. <b>İkmal merkezi</b> başkent ve altyapılı büyük şehirlerde kendiliğinden vardır; İnşaat panelinden altyapısı 2 ve üstü, kıyıda ya da demiryolu bağlı herhangi bir kendi eyaletine yeni bir ikmal merkezi kurabilir, demiryolu seviyesini de kademe kademe artırabilirsin (sivil fabrikalarla). Cephenin gerisinde ikmali zayıf bölgelere merkez ve demiryolu kurmak ilerleyişi sürdürmenin yoludur. Bir eyalet ele geçirilirken demiryolu hasar görür, etkisi yaklaşık 120 günde onarılır; savunmacı geri çekilirken kalıcı hasar da bırakabilir. İşgal edilen yerlerdeki direniş sabotajı demiryolunu aksatır. “İkmal” harita modunda ince çizgiler demiryolu hatlarını (kalın = yüksek seviye), kutular ikmal merkezlerini gösterir. Yapay zekâ da savaşta ikmali zayıf cephelerin gerisine merkez ve demiryolu yapar.</p></section>
  <section class="sec"><h3 class="sec-h">Gönüllüler</h3><p class="small" style="margin:0">Savaşa girmeden dost bir ülkenin savaşına yardım edebilirsin (İspanya İç Savaşı'nda Lejyon Kondor, Kış Savaşı'nda İsveç gönüllüleri, Çin'deki Sovyet pilotları). Diplomasi → ülke sayfasındaki <b>Gönüllü kuvvetler</b> bölümünden <b>tümen</b> ya da <b>uçak</b> gönder. Şartlar: alıcı savaşta olmalı ve ideolojik olarak seni kabul etmeli, dünya gerginliği en az %10 olmalı, alıcının düşmanıyla aynı ittifakta ya da savaşta olmamalısın, alıcıya kara ya da deniz yoluyla ulaşılabilmeli. Kota ordunun ve hava filosunun yaklaşık %10'udur. Gönüllü tümenler alıcının başkentine iner ve onun yapay zekâsı (alıcı sensen sen) tarafından yönetilir; haritada ve tümen ayrıntısında “Gönüllü (Almanya)” etiketi taşır. İnsan gücü ve takviye gönderenden düşer, muharebe deneyimi gönderenin kara tecrübesine eklenir. Alıcının savaşı bitince, alıcı teslim olunca ya da gönderen alıcının düşmanıyla savaşa girince hayatta kalanlar eve döner; istediğin an “Gönüllüleri geri çağır” da diyebilirsin. Yapay zekâ da tarihî olarak (Kondor Lejyonu, İtalyan CTV, Sovyet yardımı, İsveç gönüllüleri) ve serbest modda ideolojik dostlarına gönüllü gönderir.</p></section>
  <section class="sec"><h3 class="sec-h">Seçimler</h3><p class="small" style="margin:0">Demokrasilerde düzenli seçim yapılır (ABD: Kasım 1936, 1940, 1944; İngiltere: Temmuz 1945; Fransa: Mayıs 1936; diğerleri dört yılda bir). Siyaset panelinde sonraki seçim tarihini görürsün. Sonuç parti desteğine ve istikrara bağlıdır: demokratlar %50'yi geçerse iktidar sürer ve istikrar artar; geçemezse en çok oyu alan parti hükümeti kurar (hükümet değişikliği). İstikrarsızlık oyları ılımlı partilerden uçlara kaydırır. Savaştaki bir demokraside seçimler <b>askıya alınabilir</b> (50 siyasi güç; istikrar -%10, savaş bitince seçimler döner). Yapay zekâ parlamenter demokrasileri büyük güçlerle savaşırken seçimi erteler; tarihî modda sonuç tarihte olduğu gibi kalır (Roosevelt yeniden seçilir, 1945'te İngiltere'de İşçi Partisi gelir).</p></section>
  <section class="sec"><h3 class="sec-h">Yakıt</h3><p class="small" style="margin:0">Petrol kaynaklarından (yerli üretim, ithalat ve odakların verdiği sentetik petrol) her gün <b>yakıt</b> üretilir ve sınırlı kapasiteli yakıt deposunda birikir. Motorize ve zırhlı tümenler hareket ederken ve savaşırken, uçak kanatları ile filolar görevdeyken yakıt yakar; barışta ve yerinde dururken çok az harcarlar. Depo kapasitenin %20'sinin altına inince motorlu tümenlerin hızı ve saldırısı en çok −%35, uçakların görev etkinliği −%40, gemilerin gücü −%30 düşer. Ticaret panelindeki Yakıt bölümünde depo, günlük üretim ve tüketim görünür; yakıt azalınca ekranın üstünde “Yakıt azalıyor” uyarısı çıkar. Petrol ithal ederek ya da İnşaat panelinden <b>Sentetik Rafineri</b> kurarak (seviye başına +2,5 yakıt/gün) açığı kapatabilirsin. Yapay zekâ da yakıt azalınca petrol satın alır ve rafineri kurar.</p></section>
  <section class="sec"><h3 class="sec-h">Muharebe taktikleri</h3><p class="small" style="margin:0">HOI4'teki gibi her muharebede iki günde bir saldıran ve savunan birer <b>taktik</b> seçer: Taarruz, Şok Taarruzu, Topçu Barajı, Pusu, Kuşatma, Yarma; savunmada Elastik Savunma, Karşı Saldırı, Ters Darbe, Taktik Çekilme… Seçim tümenlerin bileşimine (zırh, topçu, piyade), doktrine, araziye ve kanatlara bağlıdır. Bazı taktikler rakibin taktiğini <b>sayaçlar</b> ve onu boşa çıkarır; komutanın planlama ile saldırı (ya da savunma) becerisi yüksekse rakibinin taktiğine göre doğru karşılığı seçme şansı artar. <b>Göğüs göğüse</b> evresinde zırh ve topçu zayıflar, <b>Atılım</b> evresinde zırhlılar öne çıkar. Muharebe panelinde iki tarafın taktiğini ve evreyi görürsün.</p></section>
  <section class="sec"><h3 class="sec-h">Dünya haberleri ve Türkiye</h3><p class="small" style="margin:0">Başka ülkelerin büyük tarihî hamleleri (Anschluss, Münih, Barbarossa, Pearl Harbor, D-Günü…) HOI4'teki gibi haber penceresi olarak gelir; Menü → Ayarlar'dan kapatabilirsin. Türkiye ile oynarken tarihî kararlar seni bekler: Hatay'ın katılması ("Hatay Meselesi" odağıyla), Üçlü İttifak Antlaşması, Türk-Alman Dostluk Antlaşması, Varlık Vergisi, Adana Görüşmesi, Kahire Konferansı ve 1945'te Mihvere savaş ilanı. Orta Doğu'da 1941'de Irak'taki Reşid Ali darbesi ve İngiliz-Sovyet İran harekâtı da tarihî akışta yer alır.</p></section>
  <section class="sec"><h3 class="sec-h">Kuklalar ve özerklik</h3><p class="small" style="margin:0">HOI4'teki gibi bazı devletler bir efendiye bağlıdır: 1936'da Mançukuo Japonya'ya, Britanya Hindistanı ve dominyonlar (Kanada, Avustralya, Yeni Zelanda, Güney Afrika) Britanya'ya. Barış konferansında kurduğun kuklalar da böyledir. Her bağlı devletin <b>özerklik</b> puanı vardır: Bütünleşik kukla, Kukla, Dominyon, Özerk. Seviye düştükçe efendi, bağlı devletin kaynaklarının ve askerî fabrikalarının daha büyük payını alır. Efendi savaşta çökmeye başlarsa ya da bağlı devlet güçlenirse özerklik artar; %100'de bağımsızlık ilan edilir. Diplomasi panelinde kontrolü siyasi güçle sıkılaştırabilir, özerklik tanıyabilir ya da bağımsızlık verebilirsin; bağlı devletsen daha fazla özerklik isteyebilirsin.</p></section>
  <section class="sec"><h3 class="sec-h">Deniz muharebesi</h3><p class="small" style="margin:0">HOI4'teki gibi deniz muharebesinde topçu ateşi (muhrip, kruvazör, zırhlı), uçak gemisi saldırısı (avcı uçağın varsa tam güç) ve denizaltı torpidoları birlikte hesaplanır. Hasarı karşı tarafın ateş gücü belirler: güçlü filo zayıfı hızla batırır. <b>Perde:</b> her zırhlı ve uçak gemisi için 3 muhrip ya da kruvazör gerekir; perdesi zayıf filonun büyük gemileri torpido ve uçaklara açık kalır. Muhripler denizaltıları avlar. Donanma panelinde her filonun perde oranı ve son deniz muharebelerinin raporları (iki tarafın gemileri ve kayıpları) görünür; haritadaki mavi halkaya dokunarak da açabilirsin.</p></section>
  <section class="sec"><h3 class="sec-h">Tarihî dönüm noktaları</h3><p class="small" style="margin:0"><b>Compiègne Mütarekesi:</b> Paris düşünce Fransa ateşkes imzalayabilir; kuzey ve Atlantik kıyısı Alman işgalinde kalır, güneyde Pétain'in Vichy hükümeti tarafsız olur. <b>Anton Harekâtı</b> (Kasım 1942) Vichy bölgesini de işgal eder; Müttefikler Paris'i alınca <b>Hür Fransa</b> (de Gaulle) savaşa döner. Doğu Cephesi'nde <b>Mozhaisk ve Luga hatları</b> Moskova ve Leningrad'ı tahkim eder; Japonya saldırmazsa <b>Sibirya tümenleri</b> Ekim 1941'de Moskova'ya gelir. Türkiye için 1945 Sovyet Notası, 1946 çok partili hayat ve 1947 Truman Doktrini olayları vardır.</p></section>
  <section class="sec"><h3 class="sec-h">Savaş planı: aşamalı taarruz ve savunma hattı</h3><p class="small" style="margin:0">Ordu seçiliyken <b>➚ Ok çiz</b> ile ilk hedefi, <b>+ Aşama</b> ile okun ucundan sonraki hedefleri belirlersin; ordu bir hedefi alınca kendiliğinden sıradaki aşamaya geçer (haritada numaralı, kesik oklar). <b>⛉ Savunma hattı</b> ile kendi topraklarında iki eyalete dokunarak dişli bir geri çekilme hattı çizersin; <b>Hatta çekil</b> emri orduyu bu hat boyunca eşit dağıtır. Cephe çökerken orduyu bir nehir ya da dağ hattına çekmek için kullan.</p></section>
  <section class="sec"><h3 class="sec-h">Ses</h3><p class="small" style="margin:0">Oyun müziği ve efektleri cihazında üretilir (internet gerekmez). Savaş ilanında boru, teslimde davul, araştırma ve odak bitince çan, ekrandaki muharebelerde uzak top sesleri duyulur. Ayarlardan müziği ve efektleri ayrı ayrı kapatabilirsin.</p></section>
  <section class="sec"><h3 class="sec-h">Tümen seçimi ve hatta yayma</h3><p class="small" style="margin:0">Haritanın sağındaki seçim düğmesi (kesik kare) bir menü açar: <b>Tüm tümenler</b>, <b>Ekrandakiler</b>, <b>Bölge seç</b> (bir eyalete dokun; o strateji bölgesindeki bütün tümenlerin seçilir ve bölge kısa süre parlar), <b>Alan seç</b> (parmağınla kutu çiz), <b>Emirsiz tümenler</b> ve <b>Cephedekiler</b>. Uzun basış seçime ekler. Uzaklaştırınca HOI4'teki gibi yakın sayaçlar ordu ve ülke bazında birleşir; birleşik sayaca dokununca içindeki bütün tümenler seçilir. Birden çok tümen seçiliyken <b>⟿ Hatta yay</b> ile sınırda bir noktaya dokun: tümenler o noktanın çevresindeki sınır hattına eşit dağılır (yabancı bir eyalete dokunursan o ülkenin sınırına).</p></section>
  <section class="sec"><h3 class="sec-h">Güç dengesi</h3><p class="small" style="margin:0">HOI4'teki gibi bazı ülkelerde iki iç güç arasında bir ibre vardır: ABD'de Yalnızcılık–Müdahalecilik, Almanya'da Nazi Partisi–Generaller, Sovyetlerde Paranoya–Ordunun yükselişi, Japonya'da Kara Ordusu–Donanma, Britanya'da Yatıştırma–Direniş, Türkiye'de Tarafsızlık–Müttefiklere yakınlık, İtalya'da Büyük Konsey–Duçe, Fransa'da Halk Cephesi–Sağ blok. İbrenin bulunduğu kademe (beş kademe) ülkeye değiştirici verir. İbre zamanla kayar, tarihî olaylar onu iter; Siyaset panelinden siyasi güçle bir tarafı destekleyebilirsin.</p></section>
  <section class="sec"><h3 class="sec-h">Hava indirme</h3><p class="small" style="margin:0">"Hava İndirme" teknolojisi Paraşüt Tümeni şablonunu açar. Paraşüt tümenini hava üssü olan bir dost eyalete getir, seç ve "🪂 Hava indirme"ye bas; sonra en fazla 500 km uzaktaki bir eyalete dokun. Hedef bölgede en az %40 hava üstünlüğü gerekir ve düşman birliği bulunan eyalete atlanamaz. Tümen hedefi hemen ele geçirir ama morali çok düşük iner; düşman hattının gerisinde ikmalsiz kalabilir.</p></section>
  <section class="sec"><h3 class="sec-h">Özel projeler ve atom bombası</h3><p class="small" style="margin:0">Araştırma panelindeki <b>Projeler</b> sekmesinde HOI4'teki gibi uzun soluklu gizli programlar vardır: Radar Ağı, Kriptoloji Bürosu (bütün düşmanlara karşı +%12), Penisilin, Jet Motoru ve Manhattan Projesi. Her biri bir ön koşul teknolojisi ve siyasi güç ister; aynı anda tek proje yürür ve hızı araştırma hızına bağlıdır. Manhattan Projesi bitince 120 günde bir atom bombası üretilir. Bomba savaşta olduğun bir düşmanın büyük şehrine atılır: sanayi ve altyapı yıkılır, oradaki birlikler ezilir, düşmanın savaş desteği ve istikrarı düşer. Tarihî modda yapay zekâ bomba kullanmaz.</p></section>
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
    html += `<div class="facts"><span>Arazi <b>${te.n}</b></span><span>Zafer puanı <b>${p.vp}</b></span><span>Fabrika <b>S${pr.civ} A${pr.mil} T${pr.dock}</b></span><span>Tahkimat <b>${pr.fort}/5</b></span><span>Altyapı <b>${pr.inf || 1}/5</b></span><span>Demiryolu <b${G.railOf(pr) < (pr.rail || 0) - 0.05 ? ' class="bad"' : ''}>${pr.rail || 0}/5${G.railOf(pr) < (pr.rail || 0) - 0.05 ? ' (hasarlı)' : ''}</b></span>${G.isHub(i) ? '<span><b class="good">İkmal merkezi</b></span>' : ''}<span>Hava üssü <b>${pr.ab || 0}/10</b></span><span>Hava <b>${G.weatherName(i)}</b></span>${pr.rs != null ? `<span>Direniş <b class="${pr.rs > 0.4 ? 'bad' : ''}">${pct(pr.rs)}</b></span><span>Uyum <b>${pct(pr.cp)}</b></span>${pr.sab >= st.day ? '<span><b class="bad">Sabotaj</b></span>' : ''}` : ''}${G.supAvail[G.st.player] && (pr.c === G.st.player || G.friendly(G.st.player, pr.c)) ? `<span>İkmal <b class="${G.supAvail[G.st.player][i] < 1.5 ? 'bad' : ''}">${r1(G.supAvail[G.st.player][i])}</b></span>` : ''}<span>Nüfus <b>${r1(pr.pop)} M</b></span>${p.st ? `<span>Çelik <b>${p.st}</b></span>` : ''}${p.oil ? `<span>Petrol <b>${p.oil}</b></span>` : ''}${p.c ? '<span><b>Kıyı</b></span>' : ''}</div>`;
    const rvs = [...new Map(G.riversOf(i).map((r) => [r.n, r])).values()]; // komşu nehir kenarları (HOI4: nehir geçişi)
    if (rvs.length) html += `<div class="facts"><span>Nehir <b>${rvs.map((r) => `${esc(r.n)} (${r.big ? 'büyük' : 'küçük'})`).join(', ')}</b></span></div>`;
    if (units.length) html += `<div class="facts">${Object.entries(byTag).map(([t, n]) => `<span>${G.flag(t, 18, 12)} <b>${n}</b> tümen</span>`).join('')}</div>`;
    if (battle) html += `<div class="row" style="gap:8px;align-items:center"><div class="small grow"><span class="pill war">Muharebe</span> ${esc(G.cname(battle.att))} saldırıyor · üstünlük ${pct(battle.adv)}</div><button class="btn sm" data-act="battle" data-v="${battle.n}">Ayrıntı</button></div>`;
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
    if (!sel.length) { R.sel.units.clear(); R.sel.army = null; $('selbar').hidden = true; return; }
    const c0 = me();
    const auto = sel.every((u) => u.auto);
    const locs = new Set(sel.map((u) => u.loc));
    const where = locs.size === 1 ? ([...locs][0] < NP ? G.pname([...locs][0]) : 'Denizde') : `${locs.size} konum`;
    const a0 = R.sel.army ? G.armyById(c0, R.sel.army) : null;
    const avgStr = sel.reduce((s2, u) => s2 + u.str, 0) / sel.length;
    const avgOrg = sel.reduce((s2, u) => s2 + Math.max(0, u.org) / G.unitStats(u).org, 0) / sel.length;
    let html = '';
    if (a0 && sel.every((u) => u.army === a0.id)) {
      // ---- Ordu seçimi (HOI4 ordu kartı) ----
      const gen = a0.gen ? G.genById(c0, a0.gen) : null;
      const mx = G.maxPlan(c0, a0);
      html += `<div class="card-h"><div class="grow"><h3><span class="adot" style="background:${G.armyColor(a0)}"></span>${esc(a0.n)} <span class="muted small">${sel.length} tümen</span></h3><div class="muted small">${gen ? esc(gen.n) + ` · S${gen.atk} Sv${gen.def} P${gen.plan} L${gen.log}` : 'Komutansız'} · Cephe: ${a0.vs ? esc(G.cname(a0.vs)) : 'tüm düşmanlar'}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>`;
      html += `<div class="row" style="gap:8px;align-items:center"><span class="small">Plan %${Math.round((a0.plan || 0) * 100)}/${Math.round(mx * 100)}</span><div class="grow">${bar((a0.plan || 0) / mx, a0.ord === 'atk' ? 'r' : 'g')}</div><span class="small muted">Güç ${pct(avgStr)}</span></div>`;
      html += `<div class="seg sm">${Object.entries(ORD_N).filter(([k]) => k !== 'fb' || (a0.fb && a0.fb.length)).map(([k, n]) => `<button class="${a0.ord === k ? 'on' : ''}" data-act="armyord" data-k="${a0.id}" data-v="${k}">${n}</button>`).join('')}</div>`;
      const fbm = UI.fbMode && UI.fbMode.a === a0.id;
      html += fbm ? `<div class="hint">${UI.fbMode.s == null ? 'Savunma hattının başlangıç eyaletine dokun (kendi toprağın).' : 'Şimdi hattın bitiş eyaletine dokun.'}</div>` : UI.goalMode === a0.id ? `<div class="hint">${UI.goalAppend ? 'Sonraki taarruz aşamasının hedefine dokun.' : 'Taarruz hedefi olacak düşman eyaletine dokun.'}</div>` : `<div class="hint small">Düşman eyaletine dokun: taarruz oku · kendi eyaletine: ordu oraya yürür · sayaca dokun: o yığını seç.${a0.goals && a0.goals.length ? ` · ${a0.goals.length + 1} aşamalı taarruz` : ''}</div>`;
      html += `<div class="tbar"><button class="btn sm ${UI.goalMode === a0.id && !UI.goalAppend ? 'pri' : ''}" data-act="armygoal" data-v="${a0.id}">➚ Ok çiz</button>${a0.goal != null ? `<button class="btn sm ${UI.goalMode === a0.id && UI.goalAppend ? 'pri' : ''}" data-act="armygoaladd" data-v="${a0.id}">+ Aşama</button><button class="btn sm" data-act="armygoalclr" data-v="${a0.id}">Oku sil</button>` : ''}<button class="btn sm ${fbm ? 'pri' : ''}" data-act="armyfb" data-v="${a0.id}">⛉ Savunma hattı</button>${a0.fb && a0.fb.length ? `<button class="btn sm" data-act="armyfbclr" data-v="${a0.id}">Hattı sil</button>` : ''}<button class="btn sm" data-act="armyvs" data-v="${a0.id}">Cephe</button><button class="btn sm" data-act="sub2" data-p="army" data-v="gen:${a0.id}">Komutan</button><button class="btn sm" data-act="armydivs">Tümenler</button></div>`;
    } else {
      // ---- Tümen seçimi ----
      const kinds = {}; for (const u of sel) { const k = R.kindOf(u); kinds[k] = (kinds[k] || 0) + 1; }
      const KN = { inf: 'piyade', arm: 'zırhlı', mot: 'motorize', cav: 'süvari', mtn: 'dağ', mar: 'deniz p.', para: 'paraşüt' };
      html += `<div class="card-h"><div class="grow"><h3>${sel.length} tümen <span class="muted small">${Object.entries(kinds).map(([k, n]) => `${n} ${KN[k]}`).join(' · ')}</span></h3><div class="muted small">${esc(where)} · güç ${pct(avgStr)} · moral ${pct(avgOrg)}${auto ? ' · <b>otomatik kurmay</b>' : ''}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>`;
      if (sel.length > 12) {
        // çok tümen: tür başına özet (sayı, ortalama güç ve moral)
        const by = new Map(); for (const u of sel) { const s2 = G.unitStats(u); const k = s2.t.s; const x = by.get(k) || { n: 0, str: 0, org: 0 }; x.n++; x.str += u.str; x.org += Math.max(0, u.org) / s2.org; by.set(k, x); }
        html += `<div class="ugrp">${[...by].sort((a, b) => b[1].n - a[1].n).map(([k, x]) => `<div class="ug"><b>${esc(k)}</b><span>×${x.n}</span>${bar(x.str / x.n, 'g')}${bar(x.org / x.n)}</div>`).join('')}</div>`;
      } else html += `<div class="units">${sel.map((u) => { const s2 = G.unitStats(u); return `<button class="ubox on" data-act="divinfo" data-v="${u.id}"><b>${s2.t.s}</b>${bar(u.str, 'g')}${bar(Math.max(0, u.org) / s2.org)}</button>`; }).join('')}</div>`;
      const inArmy = sel[0].army && sel.every((u) => u.army === sel[0].army) ? G.armyById(c0, sel[0].army) : null;
      html += `<div class="tbar"><button class="btn sm" data-act="stop">Dur</button><button class="btn sm" data-act="split">Böl</button><button class="btn sm" data-act="stratr" title="Stratejik konuşlanma: 4 kat hızlı, moral sıfırlanır">Strat. konuşlan</button><button class="btn sm ${auto ? 'pri' : ''}" data-act="selauto">Oto</button><button class="btn sm" data-act="selall">Bölgedekiler</button>${inArmy ? `<button class="btn sm" data-act="armypick" data-v="${inArmy.id}">${esc(inArmy.n)}</button>` : `<button class="btn sm" data-act="selarmy">Ordu kur</button>`}</div>`;
      if (sel.length >= 2) html += `<div class="tbar"><button class="btn sm ${UI.lineMode ? 'pri' : ''}" data-act="linemode">⟿ Hatta yay</button><span class="muted small">${UI.lineMode ? 'Sınırda bir noktaya dokun' : 'Tümenleri sınır boyunca eşit dağıt'}</span></div>`;
      const paras = sel.filter((u) => G.isPara && G.isPara(u));
      if (paras.length) html += `<div class="tbar"><button class="btn sm ${UI.paraMode ? 'pri' : ''}" data-act="paramode">🪂 Hava indirme (${paras.length})</button>${paras.some((u) => !G.paraCheck(u).ok) ? `<span class="muted small">${esc(G.paraCheck(paras.find((u) => !G.paraCheck(u).ok)).why)}</span>` : ''}</div>`;
      html += `<div class="hint small">${UI.paraMode ? `İndirme yapılacak eyalete dokun (hava üssünden en fazla ${G.PARA_KM} km).` : auto ? 'Otomatik kurmayda. Elle yönetmek için Oto’yu kapat.' : 'Hedefe dokun: hareket ya da saldırı. Tümene dokun: ayrıntı.'}</div>`;
    }
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
    const btns = `<div class="btns">${opts.map((o, i) => `<button class="btn evopt ${i === 0 ? 'pri' : ''}" data-act="modalopt" data-v="${i}">${esc(o.n)}</button>`).join('')}</div>`;
    const art = G.eventArt ? G.eventArt(p) : '';
    if (p.news) {
      // HOI4 dünya haberi: gazete sayfası
      m.innerHTML = `<div class="dialog news" role="dialog" aria-modal="true"><div class="np-mast"><span>Sayı ${1000 + G.st.day}</span><b>Dünya Postası</b><span>${G.fmtDate(G.st.day)}</span></div><h3>${esc(p.title)}</h3><div class="ev-pic">${art}</div><p class="np-text">${esc(p.text)}</p>${btns}</div>`;
    } else {
      // HOI4 olay penceresi: başlık şeridi, arşiv fotoğrafı, metin, seçenekler
      m.innerHTML = `<div class="dialog ev" role="dialog" aria-modal="true"><div class="ev-head"><h3>${esc(p.title)}</h3></div><div class="ev-pic">${art}</div><p class="eyebrow">${p.eyebrow || G.fmtDate(G.st.day)}</p><p class="ev-text">${esc(p.text)}</p>${btns}</div>`;
    }
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
  ACT.airauto = () => { const c = me(); c.auto.air = c.auto.air ? 0 : 1; if (c.auto.air) G.aiAir(c); UI.render(); };
  ACT.wingmis = (d) => { const c = me(); const w = c.wings.find((x) => x.id === +d.k); if (!w) return; w.mis = d.v; w.manual = 1; UI.render(); };
  ACT.wingpick = (d) => {
    UI.airPick = UI.airPick === +d.v ? null : +d.v;
    if (UI.airPick) { R.setMode('air'); UI.close(); UI.toast('Kanadın görev yapacağı bölgeye haritada dokun.'); R.dirty = 1; } else UI.render();
  };
  ACT.wingauto = (d) => { const c = me(); const w = c.wings.find((x) => x.id === +d.v); if (w) w.manual = 0; G.aiAir(c); UI.render(); };
  ACT.wingdel = (d) => { G.disbandWing(me(), +d.v); UI.render(); };
  ACT.wingnew = (d) => { const c = me(); const w = G.newWing(c, d.v, G.homeRegion(c), d.v === 'bom' ? 'str' : G.WING_TYPES[d.v].m[0]); if (w) { UI.toast(`${UI.wingName(c, w)} kuruldu (${Math.round(w.n)} uçak). Bölge ve görev seç.`, 'good'); if (c.auto.air) G.aiAir(c); } UI.render(); };
  ACT.basepick = (d) => {
    UI.basePick = UI.basePick === +d.v ? null : +d.v; UI.airPick = null;
    if (UI.basePick) { R.setMode('air'); UI.close(); UI.toast('Kanadın konuşlanacağı hava üssüne (✈ simgeli şehir) haritada dokun.'); R.dirty = 1; } else UI.render();
  };
  UI.assignWingBase = (n) => {
    const c = me(); const w = (c.wings || []).find((x) => x.id === UI.basePick); UI.basePick = null;
    if (!w || n < 0 || n >= NP) return false;
    if (!G.baseOk(c.tag, n)) { UI.toast(`${G.pname(n)}: kendi ya da müttefik kontrolünde bir hava üssü değil. İnşaat panelinden hava üssü kurabilirsin.`, 'warn'); UI.open('air'); return true; }
    const free = G.baseCap(n) - G.baseLoad(n) + (w.b === n ? w.max : 0);
    G.setBase(w, n); w.manual = 1;
    if (w.r >= 0 && !G.inRange(c, w, w.r)) UI.toast(`${UI.wingName(c, w)} → ${G.pname(n)} üssü. Uyarı: ${G.AIR.regions[w.r].n} bu üssün menzili dışında.`, 'warn');
    else UI.toast(`${UI.wingName(c, w)} → ${G.pname(n)} üssü${free < w.max ? ' (üs dolu, etkinlik düşer)' : ''}.`, free < w.max ? 'warn' : 'good');
    UI.open('air'); return true;
  };
  UI.assignWingRegion = (n) => {
    const c = me(); const w = (c.wings || []).find((x) => x.id === UI.airPick); UI.airPick = null;
    if (!w || n < 0) return false;
    const r = G.regionOf(n);
    if (!G.inRange(c, w, r) || !G.baseOk(c.tag, w.b)) {
      const b = G.bestBaseFor(c, w, r);
      if (b < 0) { UI.toast(`${G.AIR.regions[r].n} menzil dışında: ${Math.round(G.wingRangeKm(c, w))} km içinde uygun hava üssün yok. Cepheye yakın bir hava üssü kur ya da daha uzun menzilli uçak tasarla.`, 'warn'); UI.open('air'); return true; }
      G.setBase(w, b); UI.toast(`Kanat menzil için ${G.pname(b)} üssüne taşındı.`, 'good');
    }
    w.r = r; w.manual = 1;
    if (!G.WING_TYPES[w.e].m.includes(w.mis)) w.mis = G.WING_TYPES[w.e].m[0];
    UI.toast(`${UI.wingName(c, w)} → ${G.AIR.regions[r].n} (${G.MIS[w.mis].n}).`, 'good');
    UI.open('air'); return true;
  };

  // yakınlaştırırken ekranın ortasındaki nokta yerinde kalır
  UI.ftSetZoom = (z, fx, fy) => {
    const ft = document.getElementById('ftree'); const old = UI.ftZoom();
    if (!ft || z === old) return;
    const cx = (ft.scrollLeft + (fx ?? ft.clientWidth / 2)) / old, cy = (ft.scrollTop + (fy ?? ft.clientHeight / 2)) / old;
    UI.ftZ = z; UI.render(false);
    const f2 = document.getElementById('ftree'); if (!f2) return;
    f2.scrollLeft = cx * z - (fx ?? f2.clientWidth / 2); f2.scrollTop = cy * z - (fy ?? f2.clientHeight / 2);
    UI.ftScroll = [f2.scrollLeft, f2.scrollTop];
  };
  ACT.ftzoom = (d) => { const z = UI.ftZoom(); let i = FT_Z.findIndex((x) => x >= z - 0.001); if (i < 0) i = FT_Z.length - 1; UI.ftSetZoom(FT_Z[Math.max(0, Math.min(FT_Z.length - 1, i + +d.v))]); };
  ACT.ftnext = () => {
    const ft = document.getElementById('ftree'); if (!ft) return;
    const L = [...ft.querySelectorAll('.fn.avail')]; if (!L.length) { UI.toast('Şu an seçilebilir odak yok.'); return; }
    UI.ftIdx = ((UI.ftIdx ?? -1) + 1) % L.length; const n = L[UI.ftIdx];
    ft.scrollTo({ left: Math.max(0, n.offsetLeft - ft.clientWidth / 2 + n.offsetWidth / 2), top: Math.max(0, n.offsetTop - 40), behavior: 'smooth' });
    n.classList.add('flash'); setTimeout(() => n.classList.remove('flash'), 900);
  };
  // barış konferansı eylemleri
  const cfAfter = () => {
    const cf = G.st.conf; if (!cf) return;
    G.confRun(cf);
    G.mapDirty = 1; R.mapDirty = 1; R.dirty = 1;
    if (cf.done) { UI.toast('Konferans sona erdi. Antlaşmayı imzala.', 'good'); }
    UI.render();
  };
  const cfDo = (a) => { const cf = G.st.conf; if (!cf) return; const r = G.confAct(cf, G.st.player, a); if (!r.ok) { UI.toast(r.why || 'Yapılamaz.', 'warn'); return; } cfAfter(); };
  // hedefi haritanın görünen kısmına getir (dikeyde alt pencere haritayı örter)
  UI.focusVis = (n, z) => {
    R.focusOn(n); if (z) { R.cam.z = z; R.clamp(); }
    if (!$('sheet').hidden) { if (R.h > R.w) R.cam.y += ($('sheet').offsetHeight / 2) / R.cam.z; else R.cam.x += ($('sheet').offsetWidth / 2) / R.cam.z; R.clamp(); }
    R.dirty = 1;
  };
  ACT.cfsel = (d) => { const cf = G.st.conf; UI.cfSel = +d.v; if (cf) UI.focusVis(cf.states[+d.v].c); R.dirty = 1; UI.render(); };
  ACT.cftake = (d) => cfDo({ k: 'take', s: +d.v });
  ACT.cfpuppet = () => cfDo({ k: 'puppet' });
  ACT.cfrelease = (d) => cfDo({ k: 'release', t: d.v });
  ACT.cfpass = () => cfDo({ k: 'pass' });
  ACT.cfquit = () => cfDo({ k: 'quit' });
  ACT.cfend = () => { const cf = G.st.conf; if (!cf || !cf.done) return; UI.cfSel = null; G.confEnd(cf); R.setMode('pol'); UI.close(); UI.hud(); };
  UI.confPick = (n) => {
    const cf = G.st.conf; if (!cf || n < 0 || n >= NP) return;
    const s = cf.sOf[n]; if (s == null) { UI.toast(`${G.cname(cf.L)} topraklarından bir bölgeye dokun.`); return; }
    UI.cfSel = s; R.dirty = 1;
    if (UI.panel !== 'peace') UI.open('peace'); else UI.render();
  };
  G.onConference = (cf) => {
    UI.cfSel = null;
    R.setMode('peace');
    $('card').hidden = true; R.sel.units.clear(); R.sel.fleet = null;
    UI.open('peace');
    // ülkenin tamamını göster
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, best = -1, bv = -1;
    for (const s of cf.states) for (const n of s.p) if (G.P[n].vp > bv) { bv = G.P[n].vp; best = n; }
    for (const s of cf.states) for (const n of s.p) if (G.dist(n, best) < 420) { x0 = Math.min(x0, G.nodeX[n]); x1 = Math.max(x1, G.nodeX[n]); y0 = Math.min(y0, G.nodeY[n]); y1 = Math.max(y1, G.nodeY[n]); }
    const port = R.h > R.w, vh = port ? R.h - $('sheet').offsetHeight - 120 : R.h - 80, vw = port ? R.w : R.w - $('sheet').offsetWidth;
    const z = Math.max(0.6, Math.min(4, vw / Math.max(60, (x1 - x0) * 1.25), vh / Math.max(40, (y1 - y0) * 1.25)));
    if (x1 - x0 < G.M.W / 2) { R.cam.x = (x0 + x1) / 2; R.cam.y = (y0 + y1) / 2; R.cam.z = z; R.clamp(); if (port) { R.cam.y += ($('sheet').offsetHeight / 2 - 30) / R.cam.z; } else { R.cam.x += ($('sheet').offsetWidth / 2) / R.cam.z; } R.clamp(); }
    else UI.focusVis(best);
    R.mapDirty = 1; R.dirty = 1;
  };
  ACT.panel = (d) => UI.open(d.p);
  ACT.resinfo = (d) => { const t = UI._resInfo && UI._resInfo[d.k]; if (t) UI.toast(t, 'info'); };
  ACT.alert = (d) => { if (d.n) UI.toast(d.n, 'warn'); if (d.p === 'peace') R.setMode('peace'); UI.panel = d.p; UI.sub = d.s || null; $('card').hidden = true; UI.render(true); };
  ACT.close = () => UI.close();
  ACT.tall = () => { UI.tall = !UI.tall; try { localStorage.setItem('dc_tall', UI.tall ? '1' : ''); } catch (e) {} UI.render(true); };
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
  ACT.decide = (d) => { const c = me(), r = G.takeDecision(c, d.v, d.t || null); const D = g.DEC_BY_ID[d.v]; UI.toast(r.ok ? `${D.n} ${D.days > 0 ? 'başladı' : 'uygulandı'}.` : r.why, r.ok ? 'good' : 'warn'); G.updateSummaries(); UI.render(true); UI.hud(); };
  ACT.bop = (d) => { const r = G.bopAct(+d.v); if (!r.ok) UI.toast(r.why, 'warn'); UI.render(); UI.hud(); };
  ACT.projstart = (d) => { if (G.projStart(me(), d.v)) UI.toast('Proje başladı: ' + g.PROJECTS[d.v].n, 'good'); UI.render(true); UI.hud(); };
  ACT.nuke = (d) => { const n = +d.v; G.queuePopup({ title: 'Atom Bombası', text: `${G.pname(n)} şehrine atom bombası atılsın mı? Şehir yerle bir olur ve dünya gerginliği artar.`, opts: [{ n: 'Bombayı at', fx: () => { G.nuke(me().tag, n); UI.render(true); UI.hud(); } }, { n: 'Vazgeç', fx: () => {} }] }); };
  ACT.auto = (d) => { const c = me(); c.auto[d.v] = c.auto[d.v] ? 0 : 1; UI.render(); };
  ACT.research = (d) => {
    const c = me();
    if (c.res.some((r) => r.id === d.v)) return;
    if (c.res.length >= c.mods.slots) { UI.toast('Boş araştırma yuvası yok. Önce birini iptal et.', 'warn'); const el = document.querySelector('#sheet-body .list'); if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); } return; }
    G.startResearch(c, d.v); UI.resFlash = d.v; UI.slotPick = c.res.length < c.mods.slots ? UI.slotPick : 0;
    UI.toast('Araştırma başladı: ' + g.TECH_BY_ID[d.v].n, 'good');
    UI.render(); $('sheet-body').scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { UI.resFlash = null; }, 1500);
  };
  // boş yuvaya dokununca: seçilebilir teknolojisi olan sekmeye geç, sekmeler ve teknolojiler yansın
  ACT.slotpick = () => {
    const c = me();
    const has = (k) => g.TECHS.some((x) => x.cat === k && G.techAvailable(c, x.id) && !c.res.some((r) => r.id === x.id));
    if (UI.tab.res === 'proj' || !has(UI.tab.res)) { const k = Object.keys(g.TECH_CATS).find(has); if (k) UI.tab.res = k; }
    UI.slotPick = Date.now(); UI.render();
    const tb = $('res-tabs'); if (tb) tb.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { if (UI.panel === 'res') UI.render(); }, 4100);
  };
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
  // tasarımcı eylemleri
  ACT.dznew = (d) => { UI.dz = null; UI.dzLine = d.k != null ? +d.k : null; UI.sub = 'design:' + d.v; UI.render(true); };
  ACT.dztier = (d) => { UI.dz.t = +d.v; UI.render(); };
  ACT.dzmod = (d) => { UI.dz.m[d.k] = d.v; UI.render(); };
  ACT.dzlvl = (d) => { const sl = g.DESIGN[UI.dz.e].slots.find((x) => x.k === d.k); UI.dz.m[d.k] = Math.max(0, Math.min(sl.lvl, (UI.dz.m[d.k] | 0) + +d.v)); UI.render(); };
  ACT.dzreset = () => { UI.dz.m = {}; UI.render(); };
  ACT.dzcopy = (d) => { const c = me(); const x = (c.designs || []).find((y) => y.id === d.v); if (!x) return; UI.dz = { e: x.e, t: x.t, m: Object.assign({}, x.m), n: x.n + ' II' }; UI.dzLine = null; UI.sub = 'design:' + x.e; UI.render(true); };
  ACT.dzdel = (d) => { G.deleteDesign(me(), d.v); UI.render(); };
  ACT.dzsave = (d) => {
    const c = me(), inp = document.getElementById('dz-name'); if (inp) UI.dz.n = inp.value;
    const r = G.saveDesign(c, UI.dz.e, UI.dz);
    if (!r.ok) { UI.toast(r.why, 'warn'); return; }
    if (d.v === 'line' && UI.dzLine != null && c.lines[UI.dzLine]) { const l = c.lines[UI.dzLine]; l.d = r.d.id; l.eff = Math.max(0.1, l.eff * 0.7); }
    UI.toast(`Tasarım kaydedildi: ${r.d.n}`, 'good');
    UI.dz = null; UI.sub = null; UI.render(true);
  };
  ACT.linedesign = (d) => { const c = me(); const l = c.lines[+d.k]; if (!l) return; if (l.d !== d.v) { l.d = d.v; l.lv = G.designById(c, l.e, d.v)?.t || l.lv; l.eff = Math.max(0.1, l.eff * 0.7); } UI.sub = null; UI.toast('Hat yeni tasarıma geçti (verim düştü).', 'good'); UI.render(true); };
  ACT.linedel = (d) => { const c = me(); c.lines.splice(+d.v, 1); UI.render(); };
  ACT.dealdel = (d) => { G.cancelDeal(+d.v); G.refreshTradeCache(); UI.render(); };
  ACT.buy = (d) => { const c = me(); const n = Math.max(1, Math.min(+d.n, Math.floor(G.exportFree(d.k, d.v)))); G.addDeal(c.tag, d.k, d.v, n); G.refreshTradeCache(); G.econCalc(c); UI.toast(`${G.cname(d.k)} ile ${g.RES[d.v].toLowerCase()} anlaşması: ${n} birim.`, 'good'); UI.render(); };
  ACT.fleetsel = (d) => { const c = me(); const f = c.fleets.find((x) => x.id === +d.v); R.sel.fleet = f.id; R.sel.units.clear(); R.focusOn(f.loc, 1.4); UI.close(); UI.renderSel(); R.dirty = 1; UI.toast('Filo seçildi: bir deniz bölgesine dokunarak gönder.'); };
  ACT.fleetmis = (d) => { const f = me().fleets.find((x) => x.id === +d.k); f.mis = d.v; if (d.v === 'hold') f.path = []; UI.render(); UI.renderSel(); };
  ACT.fleethome = (d) => { const f = me().fleets.find((x) => x.id === +d.v); const p = G.fleetPath(f.loc, f.home, me().tag); if (p) { f.path = p; f.prog = 0; } f.mis = 'hold'; UI.render(); UI.renderSel(); };
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
  ACT.addline = (d) => { const c = me(); c.lines.push({ e: d.v, f: 0, eff: 0.3, acc: 0, lv: G.bestLevel(c, d.v), d: G.DESIGNABLE.has(d.v) ? 'std' + Math.floor(G.bestLevel(c, d.v)) : undefined }); UI.toast(`${g.EQUIP[d.v].n} hattı eklendi; + ile fabrika ata.`, 'good'); UI.render(); };
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
    for (const u of st.units) if (ids.includes(u.id)) { u.auto = 0; u.gar = 0; }
    // savaştaysan yeni ordu hemen cepheyi tutar; barışta beklemede kalır
    if (c.enemies.length) { a.ord = 'def'; c._frontsDirty = 1; G.computeFronts(c); }
    UI.toast(`${a.n} kuruldu (${ids.length} tümen)${a.ord === 'def' ? ', cepheyi tutuyor' : '. Emir ver: Cepheyi tut ya da Taarruz'}.`, 'good'); UI.render(); R.dirty = 1;
  };
  ACT.armyadd = (d) => { const c = me(); for (const u of G.st.units) if (R.sel.units.has(u.id) && u.t === c.tag) { u.army = +d.v; u.auto = 0; u.gar = 0; } c._frontsDirty = 1; UI.toast('Tümenler orduya eklendi.', 'good'); UI.render(); UI.renderSel(); };
  ACT.armydel = (d) => { G.disbandArmy(me(), +d.v); UI.render(); };
  ACT.armyord = (d) => {
    const c = me(), a = armyOf(d.k);
    if (d.v === 'fb' && !(a.fb && a.fb.length)) { UI.toast('Önce “⛉ Savunma hattı” ile bir hat çiz.', 'warn'); return; }
    a.ord = d.v; c._frontsDirty = 1;
    if (d.v === 'fb') { for (const u of G.armyUnits(c, a.id)) u.path = []; G.holdLine(c, a); UI.toast(`${a.n} savunma hattına çekiliyor.`); UI.render(); UI.renderSel(); R.dirty = 1; return; }
    if (d.v === 'hold') for (const u of G.armyUnits(c, a.id)) { u.path = []; }
    if (d.v !== 'hold') G.computeFronts(c);
    const noFront = d.v !== 'hold' && !(a.front || []).length;
    UI.toast(noFront ? `${a.n}: ${c.enemies.length || a.vs ? 'yakında cephe yok; tümenleri sınıra taşı ya da cephe ülkesini değiştir' : 'savaşta değilsin; “Cephe” ile bir komşu seçersen sınırda hat kurar'}.` : `${a.n}: ${({ hold: 'beklemede', def: 'cepheyi tutuyor, planlama sürüyor', atk: `taarruz başladı (plan bonusu %${Math.round((a.plan || 0) * 100)})` })[d.v]}.`, noFront ? 'warn' : d.v === 'atk' ? 'major' : 'info');
    UI.render(); UI.renderSel(); R.dirty = 1;
  };
  ACT.armyvs = (d) => {
    const st = G.st, c = me(), a = armyOf(d.v);
    const neigh = new Set(); for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag) for (const j of P[i].a) { const t = st.prov[j].c; if (t !== c.tag) neigh.add(t); }
    const opts = [null, ...new Set([...c.enemies, ...neigh])].filter((t) => t === null || st.C[t]?.alive);
    const k = opts.indexOf(a.vs); a.vs = opts[(k + 1) % opts.length]; c._frontsDirty = 1; G.computeFronts(c);
    UI.toast(`${a.n} cephesi: ${a.vs ? G.cname(a.vs) : 'tüm düşmanlar'}${(a.front || []).length ? ` (${a.front.length} eyalet)` : ''}.`);
    UI.render(); UI.renderSel(); R.dirty = 1;
  };
  UI.selectArmy = (id, focus) => { const c = me(); const us = G.armyUnits(c, +id); if (!us.length) { UI.toast('Orduda tümen yok.', 'warn'); return false; } R.sel.units = new Set(us.map((u) => u.id)); R.sel.army = +id; R.sel.fleet = null; R.sel.prov = -1; if (focus) { const n = R.armyAnchor(G.armyById(c, +id)); R.focusOn(n >= 0 ? n : us[0].loc, 1.6); } UI.close(); $('card').hidden = true; UI.renderSel(); R.dirty = 1; return true; };
  ACT.armysel = (d) => { UI.selectArmy(d.v, true); };
  ACT.armypick = (d) => { UI.selectArmy(d.v, false); };
  ACT.armygoal = (d) => {
    const a = armyOf(d.v); if (!a) return;
    if (UI.goalMode === a.id) { UI.goalMode = null; UI.renderSel(); return; }
    if (!UI.selectArmy(a.id, true)) return;
    UI.goalMode = a.id; UI.renderSel(); UI.toast('Taarruz hedefi olacak eyalete dokun.');
  };
  ACT.armygoalclr = (d) => { const a = armyOf(d.v); if (a) { a.goal = null; a.goals = []; UI.goalMode = null; UI.goalAppend = 0; } UI.render(); UI.renderSel(); R.dirty = 1; };
  // çok aşamalı taarruz: mevcut okun ucundan sonraki hedef
  ACT.armygoaladd = (d) => { const a = armyOf(d.v); if (!a || a.goal == null) return; UI.goalMode = a.id; UI.goalAppend = 1; UI.fbMode = null; UI.renderSel(); UI.toast('Sonraki aşamanın hedef eyaletine dokun.'); };
  // savunma hattı: iki dokunuşla başlangıç ve bitiş
  ACT.armyfb = (d) => { const a = armyOf(d.v); if (!a) return; if (UI.fbMode && UI.fbMode.a === a.id) { UI.fbMode = null; UI.renderSel(); return; } if (!UI.selectArmy(a.id, false)) return; UI.fbMode = { a: a.id, s: null }; UI.goalMode = null; UI.renderSel(); UI.toast('Savunma hattının başlangıç eyaletine dokun.'); };
  ACT.armyfbclr = (d) => { const a = armyOf(d.v); if (!a) return; a.fb = null; if (a.ord === 'fb') { a.ord = 'def'; me()._frontsDirty = 1; } UI.render(); UI.renderSel(); R.dirty = 1; };
  UI.fbTap = (n) => {
    const st = G.st, a = armyOf(UI.fbMode.a); if (!a) { UI.fbMode = null; return; }
    if (n < 0 || n >= NP) { UI.fbMode = null; UI.renderSel(); return; }
    if (UI.fbMode.s == null) {
      if (!G.linePath(st.player, n, n)) { UI.toast('Hat kendi topraklarından geçmeli.', 'warn'); return; }
      UI.fbMode.s = n; R.fbPreview = [n]; UI.renderSel(); R.dirty = 1; return;
    }
    const p = G.linePath(st.player, UI.fbMode.s, n); UI.fbMode = null; R.fbPreview = null;
    if (!p) { UI.toast('Bu iki nokta arasında kendi topraklarından geçen bir hat bulunamadı (en çok 40 eyalet).', 'warn'); UI.renderSel(); return; }
    a.fb = p; UI.toast(`${a.n}: ${p.length} eyaletlik savunma hattı çizildi. “Hatta çekil” emriyle ordu hatta yerleşir.`, 'good');
    UI.renderSel(); R.dirty = 1;
  };
  ACT.armydeploy = (d) => { const c = me(); c.deployArmy = c.deployArmy === +d.v ? null : +d.v; UI.toast(c.deployArmy ? 'Eğitimi biten tümenler bu orduya katılacak.' : 'Yeni tümenler ordusuz konuşlanacak.'); UI.render(); };
  ACT.armydivs = () => { UI.panel = 'army'; UI.sub = 'divs:' + R.sel.army; UI.render(true); };
  ACT.sub2 = (d) => { UI.panel = d.p; UI.sub = d.v; UI.render(true); };
  ACT.divinfo = (d) => { UI.panel = 'army'; UI.sub = 'div:' + d.v; UI.render(true); };
  ACT.divonly = (d) => { R.sel.units = new Set([+d.v]); R.sel.army = null; UI.close(); UI.renderSel(); R.dirty = 1; };
  ACT.divrm = (d) => { R.sel.units.delete(+d.v); R.sel.army = null; UI.close(); UI.renderSel(); R.dirty = 1; };
  ACT.divarmy = (d) => { const c = me(); const u = G.st.units.find((x) => x.id === +d.v); if (!u) return; const L = c.armies || []; const k = L.findIndex((a) => a.id === u.army); const nx = L[k + 1]; u.army = nx ? nx.id : 0; u.auto = 0; u.path = []; UI.render(); R.dirty = 1; };
  ACT.linemode = () => { UI.lineMode = !UI.lineMode; UI.paraMode = false; if (UI.lineMode) UI.toast('Tümenlerin yayılacağı sınır noktasına dokun.'); UI.renderSel(); };
  UI.lineTo = (n) => {
    UI.lineMode = false;
    const sel = G.st.units.filter((u) => R.sel.units.has(u.id) && u.loc < NP);
    const r = G.spreadLine(sel, n, G.st.player);
    if (r.ok) UI.toast(`${r.n} tümen ${r.segs} eyaletlik hatta yayılıyor${r.vs ? ` (${G.cname(r.vs)} sınırı)` : ''}.`, 'good'); else UI.toast(r.why, 'warn');
    R.dirty = 1; UI.renderSel();
  };
  ACT.paramode = () => { UI.paraMode = !UI.paraMode; if (UI.paraMode) UI.toast(`Paraşütçülerin atlayacağı eyalete dokun (en fazla ${G.PARA_KM} km).`); UI.renderSel(); };
  // seçili paraşüt tümenlerini hedef eyalete indir
  UI.paraTo = (n) => {
    UI.paraMode = false;
    const sel = G.st.units.filter((u) => R.sel.units.has(u.id) && G.isPara(u));
    let ok = 0, why = '';
    for (const u of sel) { const r = G.paraDrop(u, n); if (r.ok) ok++; else why = why || r.why; }
    if (ok) { UI.toast(`${ok} paraşüt tümeni ${G.pname(n)} üzerine atladı!`, 'good'); G.log(`Hava indirme: ${ok} paraşüt tümeni ${G.pname(n)} üzerine atladı.`, [G.st.player], 'good'); }
    else UI.toast(why || 'Hava indirme yapılamadı.', 'warn');
    R.dirty = 1; UI.renderSel(); UI.hud();
  };
  ACT.stratr = () => {
    const st = G.st; let n = 0;
    for (const u of st.units) if (R.sel.units.has(u.id) && u.path.length) { if (u.path.some((x) => x >= NP || G.atWar(u.t, st.prov[x]?.c))) continue; u.sr = 1; n++; }
    UI.toast(n ? `${n} tümen stratejik konuşlanmada: demiryoluyla 4 kat hızlı, varışta moral düşük.` : 'Önce dost topraklarda bir hedef seç, sonra Strat. konuşlan’a bas.', n ? 'info' : 'warn');
    R.dirty = 1; UI.renderSel();
  };
  // muharebe ayrıntısı
  ACT.battle = (d) => { UI.panel = 'battle'; UI.battleN = +d.v; UI.sub = null; UI.render(true); };
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
  ACT.clearsel = () => { R.sel.fleet = null; R.sel.units.clear(); R.sel.army = null; UI.goalMode = null; $('selbar').hidden = true; R.dirty = 1; };
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
  ACT.volsend = (d) => { const r = G.sendVolunteers(me().tag, d.k, +d.v); UI.toast(r.ok ? `${r.n} gönüllü tümen ${G.cname(d.k)} cephesine gönderildi.` : r.why, r.ok ? 'good' : 'warn'); G.mapDirty = 1; R.dirty = 1; UI.render(); UI.hud(); };
  ACT.volair = (d) => { const r = G.sendAirVolunteers(me().tag, d.k, d.e, +d.v); UI.toast(r.ok ? `${Math.round(r.n)} uçaklık hava gönüllüsü ${G.cname(d.k)} cephesine gönderildi.` : r.why, r.ok ? 'good' : 'warn'); R.dirty = 1; UI.render(); UI.hud(); };
  ACT.volback = (d) => { const n = G.volReturn(me().tag, d.v, 'geri çağırdın'); UI.toast(n ? 'Gönüllüler eve dönüyor.' : 'Geri çağrılacak gönüllü yok.', n ? 'good' : 'warn'); G.mapDirty = 1; R.dirty = 1; UI.render(); UI.hud(); };
  ACT.elsusp = () => { const r = G.elecSuspend(me()); UI.toast(r.ok ? 'Seçimler askıya alındı.' : r.why, r.ok ? 'warn' : 'bad'); UI.render(); UI.hud(); };
  ACT.elres = () => { G.elecResume(me()); UI.toast('Seçimler yeniden başlıyor.', 'good'); UI.render(); UI.hud(); };
  ACT.lend = (d) => { const ok = G.lend(me().tag, d.k, d.e, +d.v); UI.toast(ok ? `${G.cname(d.k)} ülkesine gönderildi.` : 'Yeterli stok yok.', ok ? 'good' : 'warn'); UI.render(); };
  ACT.op = (d) => { const r = G.startOp(me().tag, d.k, d.v); UI.toast(r.ok ? `${G.OPS[d.v].n} başladı.` : r.why, r.ok ? 'good' : 'warn'); UI.render(); };
  ACT.release = (d) => { const ok = G.makePuppet(me().tag, d.v); UI.toast(ok ? `${G.cname(d.v)} kukla devlet olarak kuruldu.` : 'Kurulamadı.', ok ? 'good' : 'warn'); G.mapDirty = 1; UI.render(); };
  ACT.save = (d) => { const ok = G.saveGame(d.v); UI.toast(ok ? 'Oyun kaydedildi.' : 'Kayıt başarısız: tarayıcı depolaması kullanılamıyor.', ok ? 'good' : 'bad'); UI.render(); };
  ACT.load = (d) => { const ok = G.loadGame(d.v); UI.toast(ok ? 'Kayıt yüklendi.' : 'Kayıt yüklenemedi.', ok ? 'good' : 'bad'); if (ok) { UI.close(); UI.enterGame(); } };
  ACT.setmode = (d) => { R.setMode(d.v); if (d.v === 'sup') G.computeSupplyFor(me()); UI.render(); UI.hud(); };
  ACT.wxtoggle = () => { R.showWeather = !R.showWeather; R.dirty = 1; UI.render(); };
  UI.MODE_N = { pol: 'Siyasi', terrain: 'Arazi', ind: 'Sanayi', fac: 'İttifaklar', sup: 'İkmal', air: 'Hava', occ: 'Direniş' };
  ACT.mapmode = () => { const order = ['pol', 'terrain', 'ind', 'fac', 'sup', 'air', 'occ']; R.setMode(order[(order.indexOf(R.mode) + 1) % order.length]); if (R.mode === 'sup') G.computeSupplyFor(me()); UI.toast('Harita modu: ' + UI.MODE_N[R.mode] + (R.mode === 'sup' ? ' · kırmızı: yetersiz, yeşil: bol ikmal; kutular ikmal merkezleri, çizgiler demiryolları' : R.mode === 'occ' ? ' · işgal altındaki eyaletler: yeşil düşük, kırmızı yüksek direniş' : '')); UI.hud(); };
  ACT.auto = (d) => { const r = G.autoAct(d.k, d.v); if (!r.ok) UI.toast('Bu eylem şu an yapılamaz.', 'bad'); UI.render(true); UI.hud(); };
  ACT.tutorial = () => { UI.close(); if (UI.startTutorial) UI.startTutorial(); };
  ACT.sound = (d) => { if (G.Audio) G.Audio.toggle(d.v); UI.render(); };
  ACT.setting = (d) => { if (d.v === 'hist') G.st.opts.hist = G.st.opts.hist ? 0 : 1; else UI.settings[d.v] = UI.settings[d.v] ? 0 : 1; G.newsOn = !!UI.settings.news; UI.render(); };
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
  // ---------- Tümen seçimi (HOI4): tümü, ekrandakiler, strateji bölgesi, alan, emirsizler, cephedekiler ----------
  ACT.selmenu = () => {
    const m = $('selmenu'); m.hidden = !m.hidden;
    if (!m.hidden && (R.boxMode || R.regionMode)) { R.boxMode = R.regionMode = false; $('btn-box').classList.remove('on'); m.hidden = true; UI.toast('Seçim modu kapandı.'); }
  };
  UI.selectUnits = (us, msg) => {
    R.sel.units = new Set(us.map((u) => u.id)); R.sel.army = null; R.sel.fleet = null; R.sel.prov = -1; UI.goalMode = null; UI.paraMode = false;
    if (!us.length) { UI.toast('Seçilecek tümen yok.', 'warn'); UI.renderSel(); R.dirty = 1; return; }
    UI.close(); $('card').hidden = true; UI.renderSel(); R.dirty = 1;
    UI.toast(`${us.length} tümen seçildi${msg ? ': ' + msg : ''}.`);
  };
  ACT.selpick = (d) => {
    const st = G.st, pl = st.player; $('selmenu').hidden = true;
    const land = st.units.filter((u) => u.t === pl && u.loc < NP);
    if (d.v === 'all') UI.selectUnits(land, 'bütün kara kuvvetleri');
    else if (d.v === 'screen') UI.selectUnits(land.filter((u) => { const s2 = R.toScreen(G.nodeX[u.loc], G.nodeY[u.loc]); return s2.x >= 0 && s2.y >= 0 && s2.x <= R.w && s2.y <= R.h; }), 'ekrandakiler');
    else if (d.v === 'idle') UI.selectUnits(land.filter((u) => !u.army && !u.auto && !u.path.length && !u.gar), 'emirsiz tümenler');
    else if (d.v === 'front') UI.selectUnits(land.filter((u) => P[u.loc].a.some((j) => G.atWar(pl, st.prov[j].c) || G.hostileIn(j, pl))), 'cephedekiler');
    else if (d.v === 'box') { R.boxMode = true; R.regionMode = false; $('btn-box').classList.add('on'); UI.toast('Alan seçimi: harita üzerinde parmağını sürükle.'); }
    else if (d.v === 'region') { R.regionMode = true; R.boxMode = false; $('btn-box').classList.add('on'); UI.toast('Tümenlerini seçmek istediğin bölgeye dokun.'); }
  };
  // strateji bölgesindeki (hava bölgesi) tüm kara tümenlerini seç
  UI.selectRegion = (n) => {
    const st = G.st; R.regionMode = false; $('btn-box').classList.remove('on');
    if (n < 0 || n >= NP || !G.regionOf) return;
    const r = G.regionOf(n);
    const us = st.units.filter((u) => u.t === st.player && u.loc < NP && G.regionOf(u.loc) === r);
    R.regionFlash = { r, t: performance.now() };
    UI.selectUnits(us, `${G.pname(n)} bölgesi`);
  };
  ACT.boxsel = () => { R.boxMode = !R.boxMode; $('btn-box').classList.toggle('on', R.boxMode); UI.toast(R.boxMode ? 'Alan seçimi: harita üzerinde parmağını sürükle.' : 'Alan seçimi kapandı.'); };

  // ---------- Başlangıç ekranı ----------
  const FEATURED = ['TUR', 'GER', 'SOV', 'ENG', 'FRA', 'USA', 'ITA', 'JAP', 'CHI', 'POL'];
  UI.startSel = 'TUR';
  try { UI.tall = localStorage.getItem('dc_tall') === '1'; } catch (e) {}
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
    const ssp = ((g.POLITICS[UI.startSel] || {}).sp || []).concat((g.START_SPIRITS || {})[UI.startSel] || []).filter((s) => g.SPIRITS[s]);
    if (ssp.length) html += `<div class="sec"><h3 class="sec-h">${esc(d.n)} · ulusal ruhlar<span>${ssp.length}</span></h3><div class="list">${ssp.map((s) => spiritHtml(s, null)).join('')}</div></div>`;
    html += `<div class="go"><button class="btn pri" data-act="begin">${G.flag(UI.startSel, 30, 20)} ${esc(d.n)} ile başla</button></div>`;
    $('start-body').innerHTML = html;
  };
  ACT.pick = (d) => { UI.startSel = d.v; UI.renderStart(); };
  ACT.sopt = (d) => { UI.startOpts[d.k] = +d.v; UI.renderStart(); };
  ACT.begin = () => {
    G.newGame(UI.startSel, { hist: UI.startOpts.hist, diff: UI.startOpts.diff });
    G.st.speed = 2; G.st.paused = 1;
    UI.enterGame();
    UI.showModal({ art: 'politics', eyebrow: '1 Ocak 1936', title: G.cname(UI.startSel), text: `${G.def(UI.startSel).l} yönetimindeki ${G.cname(UI.startSel)} yeni bir çağın eşiğinde. Bir ulusal odak seç, araştırmaları başlat ve üretimi düzenle. Hazır olunca zamanı başlat.`, opts: [{ n: 'Göreve başla', fx: () => { if (UI.maybeTutorial) UI.maybeTutorial(); } }] });
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
  G.onCapitulate = (tag, winner, full, cf) => {
    const st = G.st;
    const sum = cf && cf.summary ? ' ' + cf.summary : '';
    if (tag === st.player) {
      if (full) G.queuePopup({ title: 'Teslim olduk', text: 'Ordularımız dağıldı ve ülkemiz galipler arasında paylaşıldı.' + sum + ' Savaşı izlemeye devam edebilir ya da yeni bir oyuna başlayabilirsin.', opts: [{ n: 'Yeni oyun', fx: () => UI.showStart() }, { n: 'İzlemeye devam et', fx: () => {} }] });
      else G.queuePopup({ title: 'Barış antlaşması', text: 'Hükümetimiz teslim oldu ve barış konferansında topraklarımız paylaşıldı.' + sum, opts: [{ n: 'Devam et', fx: () => {} }] });
    } else if (cf && cf.parts.some((p) => p.t === st.player)) {
      G.queuePopup({ title: 'Barış antlaşması imzalandı', eyebrow: G.cname(tag), text: cf.summary, opts: [{ n: 'Tamam', fx: () => {} }] });
    } else if (st.C[tag].major || G.sameFaction(tag, st.player)) {
      G.queuePopup({ title: `${G.cname(tag)} teslim oldu`, text: 'Barış konferansı:' + sum, opts: [{ n: 'Anlaşıldı', fx: () => {} }] });
    }
  };
  G.onGameOver = () => {};
})(window);
