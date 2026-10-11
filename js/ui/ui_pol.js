// Arayüz: siyaset paneli, kararlar, odak ağacı, araştırma, güç dengesi, özel projeler, etki metinleri, ulusal ruhlar.
(function (g) {
  const G = g.G, R = G.R, UI = G.UI;
  const { P, NP } = G;
  const { $, esc, me, r1, int, pct, bar, sec, kv, FT_Z, fuelOf } = UI.L;
  const PANELS = UI.PANELS, ACT = UI.ACT;
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
    html += UI.electionSection(c);
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
  const FOCUS_ICO = { ind: 'civ', land: 'tank', air: 'air', sea: 'navy', pol: 'pp', dip: 'hand' };
  const FOCUS_CAT = { ind: ['Sanayi', '#d6aa4c'], land: ['Kara', '#c9614a'], air: ['Hava', '#8fc3e8'], sea: ['Deniz', '#4c7fd0'], pol: ['Siyaset', '#a783d1'], dip: ['Diplomasi', '#6dba73'] };
  const focusCat = (f) => G.focusCat(f);
  // varsayılan yakınlaştırma: dikeyde birkaç sütun, yatayda daha fazlası sığsın
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
      nodes += `<button class="fn ${cls}${f.alt ? ' alt' : ''}${mini ? ' mini' : ''}${UI.fsel === f.id ? ' sel' : ''}" style="left:${p.x}px;top:${p.y}px;width:${NW}px;height:${NH}px;--fc:${cat}" data-act="focus" data-v="${f.id}" aria-label="${esc(f.n)}">${G.ico ? G.ico(FOCUS_ICO[focusCat(f)], 'fic') : ''}<span class="t">${done ? '✓ ' : ''}${esc(f.n)}</span>${mini ? '' : `<span class="dd">${days}</span>`}${active ? `<i class="fp" style="width:${(c.focus.p / G.focusDays(f) * 100).toFixed(0)}%"></i>` : ''}</button>`;
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
      html += `<div class="fdetail"><div class="row"><div class="grow"><div class="t">${esc(sf.n)}</div><div class="d"><span class="fcat" style="--fc:${FOCUS_CAT[focusCat(sf)][1]}">${FOCUS_CAT[focusCat(sf)][0]}</span>${sf.alt ? ' <span class="fcat altc">Alternatif tarih</span>' : ''} ${esc(sf.d)}</div>${fxParts(sf.fx).length ? `<div class="fxl">${fxChips(sf.fx)}</div>` : ''}${sfx}<div class="d ${avail ? 'good' : 'warn'}">${why}</div></div><button class="x" data-act="focusclose" aria-label="Kapat" style="width:32px;height:32px;color:var(--muted)">✕</button></div>${avail ? `<button class="btn pri" data-act="focusgo" data-v="${sf.id}">${c.focus.cur ? 'Bu odağa geç' : 'Odağı başlat'}</button>` : ''}</div>`;
    }
    return { title: g.FOCUS_NATIONAL[c.tag] ? `${G.cname(c.tag)} odak ağacı` : 'Odak ağacı', html };
  }

  function lawPicker(c, k) {
    const L = g.LAWS[k];
    let html = `<p class="muted small" style="margin:0">Yasa değişikliği ${g.LAW_COST} siyasi güç ister. Seçenekler savaş desteğine (şu an ${pct(c.ws ?? 0)}) ve dünya gerginliğine (şu an %${Math.round(G.st.tension)}) bağlıdır; bazıları yalnızca savaşta ya da belirli ideolojilerde açılır.</p><div class="list">`;
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
    if (tab === 'doc') lh += `<p class="muted small" style="margin:0">HOI4'teki gibi dört kara doktrini dalından yalnızca birini izleyebilirsin: ${Object.values(g.DOC_TREES).join(', ')}. İlk araştırma dalı belirler.${G.docTree(c) ? ` Seçilen dal: <b>${g.DOC_TREES[G.docTree(c)]}</b>.` : ''} Deniz doktrinlerinde de üç daldan biri seçilir: ${Object.values(g.NAV_DOC_TREES).join(', ')}.${G.navDocTree(c) ? ` Seçilen: <b>${g.NAV_DOC_TREES[G.navDocTree(c)]}</b>.` : ''}</p>`;
    for (const t of g.TECHS.filter((x) => x.cat === tab).sort((a, b) => ((G.docTreeOf(a.id) || (G.navDocOf(a.id) ? 'y' + G.navDocOf(a.id) : 'z')).localeCompare(G.docTreeOf(b.id) || (G.navDocOf(b.id) ? 'y' + G.navDocOf(b.id) : 'z'))) || a.year - b.year)) {
      const done = c.tech[t.id], active = c.res.some((r) => r.id === t.id), avail = G.techAvailable(c, t.id);
      const cost = G.techCost(c, t.id);
      const ahead = t.year > yr ? ` · <span class="warn">${t.year - yr} yıl erken</span>` : '';
      const cls = done ? 'done' : active ? 'active' : avail ? '' : 'locked';
      const tr = G.docTreeOf(t.id), curTr = G.docTree(c);
      const ntr = G.navDocOf(t.id), curN = G.navDocTree(c);
      const pre = !done && !avail && !active ? (ntr && curN && curN !== ntr ? `<span class="warn">Başka bir deniz doktrini seçildi (${g.NAV_DOC_TREES[curN]})</span>` : tr && curTr && curTr !== tr ? `<span class="warn">Başka bir doktrin dalı seçildi (${g.DOC_TREES[curTr]})</span>` : `Önce: ${t.pre.map((p) => g.TECH_BY_ID[p].n).join(', ')}`) : esc(t.d || fxText(t.fx));
      const bon = (c.rb || []).find((x) => x[0] === t.cat);
      lh += `<button class="item ${cls}${avail && !active && glow ? ' glow' : ''}" data-act="research" data-v="${t.id}" ${avail ? '' : 'disabled'}><div class="grow"><div class="t">${done ? '✓ ' : ''}${esc(t.n)} <span class="muted small">${t.year}</span></div><div class="d">${pre}</div><div class="d">${done ? 'Tamamlandı' : active ? 'Araştırılıyor' : `~${Math.ceil(cost / (G.resSpeed(c, t.id) * (1 + (bon ? bon[1] : 0))))} gün`}${bon && avail ? ` · <span class="good">bonus +%${Math.round(bon[1] * 100)}</span>` : ''}${!done && G.techShare(c, t.id) ? ` · <span class="good">ittifak paylaşımı +%${Math.round(G.techShare(c, t.id) * 100)}</span>` : ''}${ahead}</div></div></button>`;
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

})(window);
