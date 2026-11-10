// HOI4 ekran akışı: bildirim yığını (tamamlanan işler), otomatik duraklatma ayarları, üst çubuk dökümleri,
// tümen listesi paneli ve eyalete uzun basınca hızlı bilgi.
(function (g) {
  const G = g.G, UI = G.UI, R = G.R, ACT = UI.ACT;
  const { esc, me, r1, int, pct, bar, sec, kv } = UI.L;
  const { NP } = G;
  const $ = (id) => document.getElementById(id);
  // varsayılan duraklatma ayarları (cihazda saklanır)
  for (const [k, v] of [['pz_war', 1], ['pz_enc', 1], ['pz_focus', 0], ['pz_res', 0]]) if (UI.settings[k] == null) UI.settings[k] = v;

  // ---- bildirim yığını: tamamlanan işler simge olarak birikir; dokun = ilgili panel ----
  UI.notes = [];
  const RULES = [
    [/^Araştırma tamamlandı/, 'res', '', 'res', 'pz_res'],
    [/^Ulusal odak tamamlandı/, 'pol', 'tree', 'focus', 'pz_focus'],
    [/eğitimini tamamladı/, 'army', '', 'div'],
    [/denize indirildi/, 'navy', '', 'navy'],
    [/tamamlandı: /, 'con', '', 'con'],
    [/^Karar tamamlandı|^Özel proje/, 'pol', '', 'pp'],
    [/taarruz hedefine ulaştı|hedefini aldı/, 'army', '', 'war'],
  ];
  const noMp = () => !(G.net && G.net.active);
  const pauseFor = (why) => { const st = G.st; if (!noMp() || st.paused) return; st.paused = 1; UI.toast(`Oyun duraklatıldı: ${why}`, 'warn'); UI.hud(); };
  const toast0 = UI.toast; let mute = 0;
  UI.toast = (m, k) => { if (!mute) toast0(m, k); };
  const prev = G.onLog;
  G.onLog = (l) => {
    const st = G.st, pl = st.player; let hit = null;
    if (pl && l.t && l.t.includes(pl) && (l.k === 'good' || l.k === 'info')) hit = RULES.find((r) => r[0].test(l.m));
    if (hit) {
      UI.notes.push({ p: hit[1], s: hit[2], ic: hit[3], m: l.m, d: st.day });
      if (UI.notes.length > 30) UI.notes.shift();
      mute = 1; try { if (prev) prev(l); } finally { mute = 0; }
      if (hit[4] && UI.settings[hit[4]]) pauseFor(l.m);
      UI.noteBar();
      return;
    }
    if (prev) prev(l);
    // otomatik duraklatma: savaş ilanı ve kuşatma
    if (pl && l.t && l.t.includes(pl)) {
      if (UI.settings.pz_war && /savaş ilan etti|ile savaştayız/.test(l.m)) pauseFor('savaş');
      else if (UI.settings.pz_enc && /kuşat/i.test(l.m) && l.k === 'bad') pauseFor('kuşatma');
    }
  };
  UI.noteBar = () => {
    let el = $('notebar');
    const st = G.st;
    if (st) UI.notes = UI.notes.filter((n) => st.day - n.d < 30 && st.day >= n.d);
    const show = st && UI.notes.length && $('start').hidden && $('sheet').hidden;
    if (!show) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement('div'); el.id = 'notebar'; el.className = 'notebar'; $('app').appendChild(el); }
    // aynı türden bildirimler tek simgede toplanır (sayı rozetiyle)
    const grp = new Map(); for (const n of UI.notes) { const k = n.p + '|' + (n.s || ''); const x = grp.get(k) || { n, c: 0 }; x.n = n; x.c++; grp.set(k, x); }
    const h = [...grp].map(([k, x]) => `<button class="note" data-act="note" data-v="${esc(k)}" title="${esc(x.n.m)}" aria-label="${esc(x.n.m)}">${G.ico(x.n.ic)}${x.c > 1 ? `<em>${x.c}</em>` : ''}</button>`).join('');
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
    el.hidden = false;
  };
  ACT.note = (d) => { const L = UI.notes.filter((x) => x.p + '|' + (x.s || '') === d.v), n = L[L.length - 1]; if (!n) return; UI.notes = UI.notes.filter((x) => !L.includes(x)); UI.toast(L.length > 1 ? `${L.length} bildirim: ${n.m}` : n.m, 'good'); UI.panel = n.p; UI.sub = n.s || null; $('card').hidden = true; UI.render(true); UI.noteBar(); };
  ACT.noteclr = () => { UI.notes = []; UI.noteBar(); };
  const hud0 = UI.hud; UI.hud = () => { hud0(); UI.noteBar(); };

  // ---- üst çubuk dökümleri (HOI4 ipucu pencereleri): siyasi güç, istikrar, savaş desteği, insan gücü ----
  const BRK = { pp: 'Siyasi güç', stab: 'İstikrar', ws: 'Savaş desteği', mp: 'İnsan gücü' };
  const sg = (v, d = 2) => ((v >= 0 ? '+' : '') + v.toFixed(d)).replace('.', ',').replace('-', '−');
  const pp100 = (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  UI.PANELS.info = () => {
    const c = me(), m = c.mods, k = UI.sub || 'pp'; let rows = [], note = '';
    if (k === 'pp') {
      const stabM = ((c.stab ?? 0.5) - 0.5) * 0.4, drain = (c.dipAct || []).reduce((s, a) => s + G.DIPACT[a.k].pp, 0);
      rows = [['Temel', '+2,00'], ['Danışman, ruh ve yasalar', sg(m.pp || 0)], ['Çarpan (ruhlar, odaklar)', pp100(m.ppM || 0)], ['İstikrar etkisi', pp100(stabM)], ['Günlük kazanç', sg(c.ppDay || 2)]];
      if (drain) rows.push(['Diplomatik eylemler', sg(-drain)], ['Net', sg((c.ppDay || 2) - drain)]);
      note = `Elde ${int(c.pp)} siyasi güç. Danışman atamak, yasa değiştirmek, karar almak, savaş gerekçesi ve lisans için harcanır.`;
    } else if (k === 'stab') {
      const base = c.stab0 ?? 0.5, md = m.stab || 0, ev = c.stabX || 0, rest = (c.stab ?? 0.5) - base - md - ev;
      rows = [['Temel', pct(base)], ['Ruhlar, danışmanlar, odaklar', pp100(md)], ['Olaylar ve kararlar', pp100(ev)], ['Savaş, parti desteği ve yasalar', pp100(rest)], ['Toplam', pct(c.stab ?? 0.5)]];
      note = 'İstikrar %50\'nin üstündeyse siyasi güç ve fabrika verimi artar; %40\'ın altında üretim düşer, darbe ve grev riski doğar.';
    } else if (k === 'ws') {
      const base = c.ws0 ?? 0.2, md = m.ws || 0, ev = c.wsX || 0, rest = (c.ws ?? 0.2) - base - md - ev;
      rows = [['Temel', pct(base)], ['Ruhlar, danışmanlar, odaklar', pp100(md)], ['Olaylar ve kararlar', pp100(ev)], ['Savaşın gidişi, kayıplar, gerginlik', pp100(rest)], ['Toplam', pct(c.ws ?? 0.2)]];
      note = 'Savaş desteği askerlik ve ekonomi yasalarının önünü açar; düşükse teslim olma eşiği de düşer.';
    } else {
      const mp = G.manpower(c, true), field = c._mpu || 0, tr = c.train.reduce((s, t) => s + G.T(c.tag, t.u).mp, 0);
      rows = [['Askere alınabilir nüfus', G.fmtMP(mp.max)], ['Sahadaki tümenler', '−' + G.fmtMP(field)], ['Eğitimdekiler', '−' + G.fmtMP(tr)], ['Kayıplar (toplam)', '−' + G.fmtMP(c.dead || 0)], ['Kullanılabilir', G.fmtMP(mp.avail)]];
      note = `Askerlik yasası nüfusun %${r1((m.mpRate || 0) * 100)} kadarını askere alır. Yasayı Siyaset panelinden değiştirebilirsin.`;
    }
    const html = `<div class="btns" style="margin-bottom:8px">${Object.entries(BRK).map(([kk, n]) => `<button class="btn sm ${k === kk ? 'pri' : ''}" data-act="sub" data-v="${kk}">${n}</button>`).join('')}</div>`
      + `<div class="list">${rows.map(([n, v], i) => `<div class="item"><div class="grow"><div class="${i === rows.length - 1 ? 't' : 'd'}">${esc(n)}</div></div><b>${v}</b></div>`).join('')}</div><p class="muted small" style="margin:8px 0 0">${esc(note)}</p>`;
    return { title: BRK[k] + ' · döküm', html };
  };
  UI.PANEL_ICO.info = 'pp'; UI.PANEL_ICO.divs = 'div';
  const resinfo0 = ACT.resinfo;
  ACT.resinfo = (d) => { if (BRK[d.k]) { UI.panel = 'info'; UI.sub = d.k; $('card').hidden = true; UI.render(true); } else resinfo0(d); };

  // ---- tümen listesi: durum süzgeci; satıra dokun = seç ve odaklan ----
  const FILT = { all: 'Tümü', idle: 'Ordusuz', weak: 'Takviye bekleyen', enc: 'Kuşatılmış', man: 'Elle yönetilen', move: 'Yolda' };
  const fok = (u, f) => f === 'all' || (f === 'idle' && !u.army) || (f === 'weak' && u.str < 0.8) || (f === 'enc' && u.enc) || (f === 'man' && u.man) || (f === 'move' && u.path.length);
  UI.PANELS.divs = () => {
    const st = G.st, c = me(), f = UI.divF || 'all';
    const all = st.units.filter((u) => u.t === c.tag), L = all.filter((u) => fok(u, f));
    let html = `<div class="btns" style="margin-bottom:8px">${Object.entries(FILT).map(([k, n]) => `<button class="btn sm ${f === k ? 'pri' : ''}" data-act="divf" data-v="${k}">${n} · ${all.filter((u) => fok(u, k)).length}</button>`).join('')}</div>`;
    if (L.length > 1) html += `<div class="btns" style="margin-bottom:6px"><button class="btn sm" data-act="divfsel">Bu ${L.length} tümeni seç</button></div>`;
    html += `<div class="list">${L.slice(0, 80).map((u) => { const s = G.unitStats(u), a = u.army ? G.armyById(c, u.army) : null; return `<button class="item" data-act="divgo" data-v="${u.id}"><div class="grow"><div class="t">${esc(s.t.n || s.t.s)} <span class="muted small">${u.loc < NP ? esc(G.pname(u.loc)) : 'denizde'}</span></div><div class="d">${a ? esc(a.n) : 'ordusuz'}${u.path.length ? ' · yolda' : ''}${u.man ? ' · elle' : ''}${u.enc ? ' · <span class="neg">kuşatıldı</span>' : ''}</div>${bar(u.str, 'g')}${bar(Math.max(0, u.org) / s.org)}</div><b>${pct(u.str)}</b></button>`; }).join('') || '<p class="muted small" style="margin:0">Bu süzgeçte tümen yok.</p>'}</div>`;
    if (L.length > 80) html += `<p class="muted small" style="margin:6px 0 0">İlk 80 tümen gösteriliyor (${L.length}).</p>`;
    return { title: 'Tümenler', html };
  };
  ACT.divf = (d) => { UI.divF = d.v; UI.render(); };
  ACT.divgo = (d) => { const u = G.st.units.find((x) => x.id === +d.v); if (!u) return; R.sel.units = new Set([u.id]); R.sel.army = null; R.sel.fleet = null; if (u.loc < NP) R.focusOn(u.loc, Math.max(R.cam.z, 2)); UI.close(); UI.renderSel(); R.dirty = 1; };
  ACT.divfsel = () => { const c = me(), f = UI.divF || 'all'; UI.selectUnits(G.st.units.filter((u) => u.t === c.tag && fok(u, f) && u.loc < NP), FILT[f]); };
  ACT.divlist = () => { UI.panel = 'divs'; UI.sub = null; $('card').hidden = true; UI.render(true); };

  // ---- duraklatma ayarları bölümü (menü) ----
  UI.pauseSection = () => `<div class="list">${[['pz_war', 'Savaş ilanında duraklat', 'Biri bize ya da biz birine savaş ilan edince.'], ['pz_enc', 'Kuşatmada duraklat', 'Tümenlerimiz kuşatılınca ya da teslim olunca.'], ['pz_focus', 'Odak bitince duraklat', 'Ulusal odak tamamlanınca yenisini seçmen için.'], ['pz_res', 'Araştırma bitince duraklat', 'Boşalan araştırma yuvasını doldurman için.']].map(([k, n, d]) => `<button class="toggle ${UI.settings[k] ? 'on' : ''}" data-act="setting" data-v="${k}"><span><b>${n}</b><br><span class="muted small">${d}</span></span><i></i></button>`).join('')}</div>`;
})(window);
