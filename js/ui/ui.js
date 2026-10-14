// Arayüz çekirdeği: yardımcılar, üst şerit, bildirimler, panel çerçevesi. Paneller ve eylemler ui_*.js dosyalarında.
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
  // ayarlar cihazda saklanır (otomatik kayıt aralığı ay cinsinden: 0 kapalı)
  try { Object.assign(UI.settings, JSON.parse(localStorage.getItem('dc_settings') || '{}')); } catch (e) { /* */ }
  UI.saveSettings = () => { try { localStorage.setItem('dc_settings', JSON.stringify(UI.settings)); } catch (e) { /* */ } };
  G.newsOn = !!UI.settings.news;
  // harita görünümü: resimli sayaç ve yüksek çözünürlük (render.js okur)
  UI.applyMapSettings = () => { R.ctrArt = UI.settings.ctr === 'art'; R.ctrBig = UI.settings.big === 1; const q = UI.settings.q ?? (UI.settings.hires === 0 ? 1 : 2); R.quality = R.qAuto != null ? Math.min(q, R.qAuto) : q; const cap = [1.5, 2, 3][R.quality]; if (R.dprCap !== cap) { R.dprCap = cap; if (R.cv) R.resize(); } R.dirty = 1; };
  UI.applyMapSettings();

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
    // HOI4 gibi saatli tarih (gün içi ilerleme)
    const hh = Math.floor((G.dayFrac || 0) * 24);
    $('hud-date').textContent = `${String(hh).padStart(2, '0')}:00, ${G.fmtDate(st.day)}`;
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
      ['cp', int(G.cpEnsure(c).cp), '', 'Komuta gücü', `+${G.cpRate(c).toFixed(2)}/gün · en çok ${G.CP_MAX}. Ordu emirleri, mareşal terfisi ve komutan eğitimi için harcanır.`],
      ['civ', `${Math.round(civUsed)}/${s.civ}`, '', 'Sivil fabrikalar (kullanılan/toplam)', `${e.civFree || 0} inşaatta, kalanı tüketim malı ve ticarette`],
      ['mil', `${Math.round(milA0)}/${s.mil}`, s.mil - milA0 > 0 ? 'warn' : '', 'Askerî fabrikalar (atanan/toplam)', ''],
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
    const hr = res.map(([k, v, cl, n]) => `<button class="res ${cl}" data-act="resinfo" data-k="${k}" title="${n}">${G.med(k)}<b>${v}</b></button>`).join('');
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
    UI.delArm = null;
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
    const tk = PANEL_ICO[UI.panel];
    $('sheet-title').innerHTML = (tk && G.ico ? G.ico(tk, 'tico') : '') + esc(out.title);
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
    // NATO simgesi tuvali cihaz çözünürlüğünde (CSS boyutu sabit kalır; 3× ekranda bulanıklaşmaz)
    for (const cv of body.querySelectorAll('canvas.nato')) {
      const d = Math.min(3, Math.max(1, Math.ceil(g.devicePixelRatio || 1)));
      if (!cv._w) { cv._w = +cv.getAttribute('width') || 44; cv._h = +cv.getAttribute('height') || 30; cv.width = cv._w * d; cv.height = cv._h * d; }
      const w = cv._w, h = cv._h;
      const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
      x.fillStyle = cv.dataset.c; x.fillRect(0, 0, w, h); R.drawNato(x, cv.dataset.k, 8, 6, 28, 18, R.luminance(cv.dataset.c) > 0.55 ? '#14160f' : '#f4efe0');
    }
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
  // HOI4 menü simgeleri (alt/sol menü ve panel başlığı aynı seti kullanır)
  const PANEL_ICO = { pol: 'pp', res: 'res', prod: 'mil', con: 'con', trade: 'trade', army: 'div', navy: 'navy', dip: 'hand', air: 'air', menu: 'dec', ledger: 'dec' };
  UI.PANEL_ICO = PANEL_ICO;
  if (G.ico) document.querySelectorAll('#nav [data-p]').forEach((b) => { const k = PANEL_ICO[b.dataset.p]; const i = b.querySelector('.ic'); if (k && i) i.outerHTML = G.ico(k, 'navi'); b.setAttribute('aria-label', b.textContent.trim()); });
  const sec = (title, inner, aside = '') => `<section class="sec"><h3 class="sec-h">${title}${aside ? `<span>${aside}</span>` : ''}</h3>${inner}</section>`;
  const kv = (pairs) => `<div class="kv">${pairs.map(([k, v, cl]) => `<div><small>${k}</small><b class="${cl || ''}">${v}</b></div>`).join('')}</div>`;

  // odak ağacı yakınlaştırma kademeleri (siyaset paneli ve eylemler kullanır)
  const FT_Z = [0.45, 0.6, 0.75, 0.9, 1.1];
  // yakıt deposu özeti (üst şerit ve ticaret paneli kullanır)
  const fuelOf = (c) => { if (c.fuel == null) G.fuelInit(c); const cap = c._fcap || G.fuelCap(c); return { fuel: c.fuel, cap, fr: c.fuel / cap }; };
  // ---------- Paneller ve eylemler arası paylaşım ----------
  // paneller ui_*.js dosyalarında; ortak yardımcılar UI.L üzerinden alınır
  const ACT = {};
  UI.PANELS = PANELS; UI.ACT = ACT;
  UI.L = { $, esc, me, r1, int, pct, bar, sec, kv, FT_Z, fuelOf };
})(window);
