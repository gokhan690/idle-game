// Arayüz: ülke genel bakış ekranı (HOI4 tarzı tek bakışta ülke durumu ve yapılacaklar).
// Üst çubuktaki bayrağa dokununca açılır; her kart ilgili panele götürür.
(function (g) {
  const G = g.G, UI = G.UI;
  const { esc, me, r1, int, pct, bar, sec } = UI.L;
  const PANELS = UI.PANELS;

  // kart: başlık, büyük değer, ayrıntı satırları; dokununca panel (ve alt sayfa)
  const card = (p, sub, ico, title, big, lines, cls = '') => `<button class="ovc ${cls}" data-act="ovgo" data-p="${p}" data-s="${sub || ''}"><span class="ovh">${G.ico ? G.ico(ico, 'tico') : ''}${esc(title)}</span>${big != null ? `<b class="ovbig">${big}</b>` : ''}${lines.filter(Boolean).map((l) => `<span class="ovl">${l}</span>`).join('')}</button>`;

  PANELS.ov = () => {
    const st = G.st, c = me(), d = G.def(c.tag), id = g.IDEOLOGIES[c.ideo], s = c.sum, e = c.econ || {};
    const fac = c.fac ? st.factions[c.fac] : null;
    // başlık: lider portresi, bayrak, ad, ideoloji, istikrar ve savaş desteği
    const por = G.art && G.art.leader ? G.art.img(G.art.leader(c.tag, c.leader, c.ideo), 'portrait-m') : '';
    let html = `<div class="ovhead">${por}<div class="grow"><div class="row" style="gap:8px">${G.flag(c.tag, 36, 24)}<b class="ovname">${esc(d.n)}</b></div><div class="muted small">${esc(c.leader)} · <span style="color:${id.c}">${id.n}</span>${fac ? ' · ' + esc(fac.n) : ''}</div>`
      + `<div class="ovbar"><span>İstikrar <b>${pct(c.stab ?? 0.5)}</b></span>${bar(c.stab ?? 0.5, (c.stab ?? 0.5) < 0.4 ? 'r' : 'g')}</div><div class="ovbar"><span>Savaş desteği <b>${pct(c.ws ?? 0.2)}</b></span>${bar(c.ws ?? 0.2)}</div></div></div>`;
    // yapılacaklar: üst çubuk uyarılarının açıklamalı listesi
    const al = UI.alertsOf(c);
    const todo = al.length
      ? `<div class="list">${al.map(([p, sub, n, ic, cnt]) => `<button class="item ovtodo" data-act="alert" data-p="${p}" data-s="${sub}" data-n="">${G.ico ? G.ico(ic, 'tico') : ''}<div class="grow"><div class="t">${esc(n)}</div></div>${cnt > 1 ? `<span class="pill">${cnt}</span>` : ''}<span class="muted">›</span></button>`).join('')}</div>`
      : '<p class="muted small" style="margin:0">Bekleyen iş yok: araştırma, üretim, inşaat ve odak düzenli.</p>';
    // meydan okuma (seçildiyse): durum ve kalan süre
    if (st.chal && G.chalById) {
      const x = G.chalById(st.chal.id);
      if (x) {
        const left = G.dayOf(x.by || x.hold) - st.day, ch = st.chal;
        const durum = ch.s > 0 ? '<span class="pos">Başarıldı</span>' : ch.s < 0 ? '<span class="neg">Kaybedildi</span>' : `Sürüyor · ${Math.max(0, left)} gün kaldı`;
        html += sec('Meydan okuma', `<div class="sec-card"><div class="t"><b>${esc(x.n)}</b></div><p class="small" style="margin:4px 0">${esc(x.d)}</p><div class="small">${durum}${!ch.s && x.hold ? ' · koşul bozulmadıkça tarih gelince başarılır' : ''}</div></div>`);
      }
    }
    html += sec('Yapılacaklar', todo, al.length ? String(al.length) : '');
    // kartlar
    const milA = c.lines.reduce((a, l) => a + (g.EQUIP[l.e].fac === 'mil' ? l.f : 0), 0);
    const divs = st.units.filter((u) => u.t === c.tag);
    const enc = divs.filter((u) => u.enc).length;
    const avgStr = divs.length ? divs.reduce((a, u) => a + u.str, 0) / divs.length : 0;
    const cur = c.focus.cur ? G.focusById(c, c.focus.cur) : null;
    const resNames = c.res.slice(0, 2).map((r) => esc((g.TECH_BY_ID[r.id] || {}).n || r.id));
    const shortR = g.RES_KEYS.filter((r) => (e.ratio || {})[r] < 0.95);
    const wars = c.enemies.slice(0, 6);
    let cards = '';
    cards += card('prod', '', 'mil', 'Sanayi', `${s.civ + s.mil + s.dock}`, [`Sivil ${s.civ} · Askerî ${s.mil} · Tersane ${s.dock}`, `Hatlarda ${Math.round(milA)}/${s.mil} askerî fabrika`, e.civFree ? `${e.civFree} sivil fabrika inşaatta` : '']);
    cards += card('army', '', 'div', 'Kara ordusu', `${divs.length}`, [`Ortalama güç ${pct(avgStr)}${c.train.length ? ` · +${c.train.length} eğitimde` : ''}`, `İnsan gücü ${G.fmtMP(c.mpAvail || 0)}`, enc ? `<span class="bad">${enc} tümen kuşatıldı</span>` : (c.pow ? `Esir ${G.fmtMP(c.pow)}` : '')], enc ? 'alarm' : '');
    cards += card('navy', '', 'navy', 'Deniz ve hava', null, [`Deniz gücü <b>${int(G.navyPower(c))}</b>`, `Hava gücü <b>${int(G.airPower(c))}</b>`, `Konvoy ${int(c.ships.conv || 0)}`]);
    cards += card('res', '', 'res', 'Araştırma', `${c.res.length}/${c.mods.slots}`, [resNames.length ? resNames.join(', ') : '<span class="warn">Araştırma yok</span>']);
    cards += card('pol', 'tree', 'focus', 'Ulusal odak', null, [cur ? `<b>${esc(cur.n)}</b>` : '<span class="warn">Odak seçilmedi</span>', cur ? `${Math.ceil(G.focusDays(cur) - c.focus.p)} gün kaldı` : '']);
    cards += card('pol', '', 'pp', 'Siyaset', int(c.pp), [`Siyasi güç +${r1(c.ppDay || 2)}/gün`, `${id.n} %${Math.round((c.pop[c.ideo] || 0) * 100)}`]);
    cards += card('dip', '', 'war', wars.length ? 'Savaşlar' : 'Diplomasi', wars.length ? String(c.enemies.length) : null, [wars.length ? `<span class="ovflags">${wars.map((t) => G.flag(t, 24, 16)).join('')}</span>` : 'Barış', fac ? esc(fac.n) : 'İttifak yok'], wars.length ? 'alarm' : '');
    cards += card('trade', '', 'steel', 'Kaynaklar', null, [shortR.length ? `<span class="bad">Açık: ${shortR.map((r) => g.RES[r]).join(', ')}</span>` : '<span class="good">Kaynaklar yeterli</span>', `Çelik ${int(s.steel)}/${int(e.needSteel || 0)} · Petrol ${int(s.oil)}/${int(e.needOil || 0)}`]);
    html += sec('Ülke', `<div class="ovgrid">${cards}</div>`);
    return { title: 'Genel bakış', html };
  };
  UI.ACT.ovgo = (dd) => { UI.panel = dd.p; UI.sub = dd.s || null; UI.render(true); };
})(window);
