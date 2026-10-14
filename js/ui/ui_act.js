// Arayüz: eyalet kartı, seçim çubuğu, pencereler, eylem işleyicileri, harita modları, tümen seçimi.
(function (g) {
  const G = g.G, R = G.R, UI = G.UI;
  const { P, NP } = G;
  const { $, esc, me, r1, int, pct, bar, sec, kv, FT_Z, fuelOf } = UI.L;
  const PANELS = UI.PANELS, ACT = UI.ACT;
  const ORD_N = UI.ORD_N;
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
    // HOI4 eyalet ekranı: paylaşılan bina yuvaları ve seviyeli binalar
    {
      const used = pr.civ + pr.mil + pr.dock, slots = Math.max(G.slotsOf(i), used), cells = [];
      for (let k = 0; k < slots; k++) cells.push(k < pr.civ ? 'civ' : k < pr.civ + pr.mil ? 'mil' : k < pr.civ + pr.mil + pr.dock ? 'dock' : '');
      const lvl = (n, v, mx, cls = '') => `<span class="blv ${cls}"><small>${n}</small>${Array.from({ length: mx }, (_, k) => `<i class="${k < v ? 'on' : ''}"></i>`).join('')}</span>`;
      html += `<div class="bslots" aria-label="Bina yuvaları ${used}/${slots}">${cells.map((t) => `<i class="bs ${t}">${t ? G.ICO[t] || '' : ''}</i>`).join('')}<em>${used}/${slots} yuva</em></div><div class="blvs">${lvl('Altyapı', pr.inf || 1, 5)}${lvl('Demiryolu', Math.round(G.railOf(pr)), 5)}${lvl('Tahkimat', pr.fort, 5, 'fort')}${lvl('Hava üssü', Math.ceil((pr.ab || 0) / 2), 5, 'air')}</div>`;
    }
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
      html += `<div class="card-h">${gen ? G.art.genImg(gen, c0.tag) : ''}<div class="grow"><h3><span class="adot" style="background:${G.armyColor(a0)}"></span>${esc(a0.n)} <span class="muted small">${sel.length} tümen</span></h3><div class="muted small">${gen ? esc(gen.n) + ` · S${gen.atk} Sv${gen.def} P${gen.plan} L${gen.log}` : 'Komutansız'} · Cephe: ${a0.vs ? esc(G.cname(a0.vs)) : 'tüm düşmanlar'}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>`;
      html += `<div class="row" style="gap:8px;align-items:center"><span class="small">Plan %${Math.round((a0.plan || 0) * 100)}/${Math.round(mx * 100)}</span><div class="grow">${bar((a0.plan || 0) / mx, a0.ord === 'atk' ? 'r' : 'g')}</div><span class="small muted">Güç ${pct(avgStr)}</span></div>`;
      html += `<div class="seg sm">${Object.entries(ORD_N).filter(([k]) => k !== 'fb' || (a0.fb && a0.fb.length)).map(([k, n]) => `<button class="${a0.ord === k ? 'on' : ''}" data-act="armyord" data-k="${a0.id}" data-v="${k}">${n}</button>`).join('')}</div>`;
      const fbm = UI.fbMode && UI.fbMode.a === a0.id;
      html += fbm ? `<div class="hint">${UI.fbMode.s == null ? 'Savunma hattının başlangıç eyaletine dokun (kendi toprağın).' : 'Şimdi hattın bitiş eyaletine dokun.'}</div>` : UI.goalMode === a0.id ? `<div class="hint">${UI.goalAppend ? 'Sonraki taarruz aşamasının hedefine dokun.' : 'Taarruz hedefi olacak düşman eyaletine dokun.'}</div>` : `<div class="hint small">Düşman eyaletine dokun: taarruz oku · kendi eyaletine: ordu oraya yürür · sayaca dokun: o yığını seç.${a0.goals && a0.goals.length ? ` · ${a0.goals.length + 1} aşamalı taarruz` : ''}</div>`;
      html += `<div class="tbar"><button class="btn sm ${UI.goalMode === a0.id && !UI.goalAppend ? 'pri' : ''}" data-act="armygoal" data-v="${a0.id}">➚ Ok çiz</button>${a0.goal != null ? `<button class="btn sm ${UI.goalMode === a0.id && UI.goalAppend ? 'pri' : ''}" data-act="armygoaladd" data-v="${a0.id}">+ Aşama</button><button class="btn sm" data-act="armygoalclr" data-v="${a0.id}">Oku sil</button>` : ''}<button class="btn sm ${fbm ? 'pri' : ''}" data-act="armyfb" data-v="${a0.id}">⛉ Savunma hattı</button>${a0.fb && a0.fb.length ? `<button class="btn sm" data-act="armyfbclr" data-v="${a0.id}">Hattı sil</button>` : ''}<button class="btn sm" data-act="armyvs" data-v="${a0.id}">Cephe</button><button class="btn sm" data-act="sub2" data-p="army" data-v="gen:${a0.id}">Komutan</button><button class="btn sm" data-act="armydivs">Tümenler</button></div>`;
    } else {
      // ---- Tümen seçimi ----
      const kinds = {}; for (const u of sel) { const k = R.kindOf(u); kinds[k] = (kinds[k] || 0) + 1; }
      const KN = { inf: 'piyade', arm: 'zırhlı', mot: 'motorize', cav: 'süvari', mtn: 'dağ', mar: 'deniz p.', para: 'paraşüt' };
      html += `<div class="card-h">${sel.length === 1 ? G.art.img(G.art.unitOf(sel[0], 1), 'artthumb') : ''}<div class="grow"><h3>${sel.length} tümen <span class="muted small">${Object.entries(kinds).map(([k, n]) => `${n} ${KN[k]}`).join(' · ')}</span></h3><div class="muted small">${esc(where)} · güç ${pct(avgStr)} · moral ${pct(avgOrg)}${auto ? ' · <b>otomatik kurmay</b>' : ''}</div></div><button class="x" data-act="clearsel" aria-label="Seçimi kaldır">✕</button></div>`;
      if (sel.length > 12) {
        // çok tümen: tür başına özet (sayı, ortalama güç ve moral)
        const by = new Map(); for (const u of sel) { const s2 = G.unitStats(u); const k = s2.t.s; const x = by.get(k) || { n: 0, str: 0, org: 0 }; x.n++; x.str += u.str; x.org += Math.max(0, u.org) / s2.org; by.set(k, x); }
        html += `<div class="ugrp">${[...by].sort((a, b) => b[1].n - a[1].n).map(([k, x]) => `<div class="ug"><b>${esc(k)}</b><span>×${x.n}</span>${bar(x.str / x.n, 'g')}${bar(x.org / x.n)}</div>`).join('')}</div>`;
      } else html += `<div class="units">${sel.map((u) => { const s2 = G.unitStats(u); return `<button class="ubox on" data-act="divinfo" data-v="${u.id}"><b>${s2.t.s}</b>${bar(u.str, 'g')}${bar(Math.max(0, u.org) / s2.org)}</button>`; }).join('')}</div>`;
      const encd = sel.filter((u) => u.enc);
      if (encd.length) html += `<div class="tbar encbar"><span class="pill war">Kuşatıldı · ${encd.length} tümen · ${Math.max(...encd.map((u) => u.enc))} gün</span><button class="btn sm danger" data-act="breakout">Kuşatmadan çık</button></div>`;
      const inArmy = sel[0].army && sel.every((u) => u.army === sel[0].army) ? G.armyById(c0, sel[0].army) : null;
      html += `<div class="tbar"><button class="btn sm" data-act="stop">Dur</button><button class="btn sm" data-act="split">Böl</button><button class="btn sm" data-act="withdraw" title="Cephe gerisindeki güvenli hatta çekil">Geri çekil</button><button class="btn sm" data-act="stratr" title="Stratejik konuşlanma: 4 kat hızlı, moral sıfırlanır">Strat. konuşlan</button><button class="btn sm ${auto ? 'pri' : ''}" data-act="selauto">Oto</button><button class="btn sm" data-act="selall">Bölgedekiler</button>${inArmy ? `<button class="btn sm" data-act="armypick" data-v="${inArmy.id}">${esc(inArmy.n)}</button>` : `<button class="btn sm" data-act="selarmy">Ordu kur</button>`}</div>`;
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
    const btns = `<div class="btns">${opts.map((o, i) => `<button class="btn evopt ${i === 0 ? 'pri' : ''}" data-act="modalopt" data-v="${i}">${esc(o.n)}${o.d ? `<small class="evd">${esc(o.d)}</small>` : ''}</button>`).join('')}</div>`;
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
  UI.h = { esc, sec, kv };
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
  ACT.alert = (d) => {
    // kuşatılmış tümenler: hepsini seç ve cebe odaklan
    if (d.p === 'enc') { const L = G.st.units.filter((u) => u.t === G.st.player && u.enc); if (!L.length) return; R.sel.units = new Set(L.map((u) => u.id)); R.sel.army = null; R.focusOn(L[0].loc, 2.5); UI.close(); UI.renderSel(); R.dirty = 1; return; }
    if (d.n) UI.toast(d.n, 'warn'); if (d.p === 'peace') R.setMode('peace'); UI.panel = d.p; UI.sub = d.s || null; $('card').hidden = true; UI.render(true); };
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
  ACT.drill = (d) => { const r = G.drillToggle(me(), +d.v); UI.toast(r.ok ? (r.on ? 'Tatbikat başladı.' : 'Tatbikat durdu.') : r.why, r.ok ? 'good' : 'warn'); UI.render(); };
  ACT.fackick = (d) => { G.facKick(me().tag, d.v); UI.render(); };
  ACT.faclead = (d) => { G.facLead(me().tag, d.v); UI.render(); };
  ACT.bcesc = (d) => { const c = me(), x = G.borderConflictOf(c.tag, d.v); if (x) G.bcEscalate(x, c.tag); UI.render(); UI.hud(); };
  ACT.armyorder = (d) => { const r = G.armyOrder(me(), +d.k, d.v); UI.toast(r.ok ? `${G.ORDERS[d.v].n} verildi.` : r.why, r.ok ? 'good' : 'warn'); UI.render(); UI.hud(); };
  ACT.setgrp = (d) => { const r = G.setArmyGroup(me(), +d.k, +d.v); if (!r.ok && r.why) UI.toast(r.why, 'warn'); UI.sub = null; UI.render(true); };
  ACT.genfm = (d) => { const r = G.promoteFM(me(), +d.v); UI.toast(r.ok ? 'Mareşalliğe terfi etti.' : r.why, r.ok ? 'good' : 'warn'); UI.render(); UI.hud(); };
  ACT.gentr = (d) => { const r = G.trainGeneral(me(), +d.k, d.v); UI.toast(r.ok ? `Eğitim tamamlandı: ${g.GEN_TRAITS[d.v].n}` : r.why, r.ok ? 'good' : 'warn'); UI.sub = 'gens'; UI.render(true); UI.hud(); };
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
  ACT.breakout = () => { let n = 0; for (const u of G.st.units) if (R.sel.units.has(u.id) && u.enc && G.breakout(u)) n++; R.dirty = 1; UI.toast(n ? `${n} tümen kuşatmayı yarmaya çalışıyor.` : 'Çıkış yolu bulunamadı.', n ? 'info' : 'warn'); UI.renderSel(); };
  ACT.withdraw = () => { let n = 0; for (const u of G.st.units) if (R.sel.units.has(u.id) && G.withdraw(u)) n++; R.dirty = 1; UI.toast(n ? `${n} tümen geri çekiliyor.` : 'Geri çekilecek güvenli hat bulunamadı.', n ? 'info' : 'warn'); UI.renderSel(); };
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
      case 'bc': { const r = G.bcStart(c.tag, t); if (!r.ok) UI.toast(r.why, 'warn'); break; }
      case 'ult_border': case 'ult_annex': { const r = G.ultimatum(c.tag, t, d.k.slice(4)); UI.toast(!r.ok ? r.why : r.accepted ? `${G.cname(t)} talebimizi kabul etti!` : `${G.cname(t)} reddetti: artık savaş gerekçemiz var.`, !r.ok ? 'warn' : r.accepted ? 'good' : 'warn'); break; }
      case 'cta': { const r = G.callToArms(c.tag, t); UI.toast(!r.ok ? r.why : r.accepted ? `${G.cname(t)} savaşa katıldı!` : `${G.cname(t)} çağrımızı reddetti.`, !r.ok ? 'warn' : r.accepted ? 'good' : 'warn'); break; }
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
  ACT.lldays = (d) => { UI.llDays = +d.v; UI.render(); };
  ACT.llstart = (d) => { const r = G.llStart(me().tag, d.k, d.e, +d.v, UI.llDays || 180); UI.toast(r.ok ? 'Ödünç verme anlaşması imzalandı.' : r.why, r.ok ? 'good' : 'warn'); UI.render(); };
  ACT.llstop = (d) => { G.llStop(me().tag, d.k, d.v); UI.toast('Anlaşma durduruldu.', 'info'); UI.render(); };
  ACT.lend = (d) => { const ok = G.lend(me().tag, d.k, d.e, +d.v); UI.toast(ok ? `${G.cname(d.k)} ülkesine gönderildi.` : 'Yeterli stok yok.', ok ? 'good' : 'warn'); UI.render(); };
  ACT.intelfound = () => { const r = G.intelFound(me()); if (!r.ok) UI.toast(r.why, 'warn'); UI.render(); UI.hud(); };
  ACT.intelopen = () => { UI.sub = 'intel'; UI.render(true); };
  ACT.intelback = () => { UI.sub = null; UI.render(true); };
  ACT.intelrec = () => { const r = G.intelRecruit(me()); UI.toast(r.ok ? 'Ajan eğitime başladı.' : r.why, r.ok ? 'good' : 'warn'); UI.render(); UI.hud(); };
  ACT.intelupg = (d) => { const r = G.intelUpgrade(me(), d.v); UI.toast(r.ok ? `${G.INTEL_UPG[d.v].n} kuruluyor.` : r.why, r.ok ? 'good' : 'warn'); UI.render(); UI.hud(); };
  ACT.intelas = (d) => { G.intelAssign(me(), d.k, +d.v); UI.render(); };
  ACT.spyop = (d) => { const r = G.spyStart(me(), d.k, d.v); UI.toast(r.ok ? `${G.SPY_OPS[d.v].n} başladı.` : r.why, r.ok ? 'good' : 'warn'); UI.render(); UI.hud(); };
  ACT.op = (d) => { const r = G.startOp(me().tag, d.k, d.v); UI.toast(r.ok ? `${G.OPS[d.v].n} başladı.` : r.why, r.ok ? 'good' : 'warn'); UI.render(); };
  ACT.release = (d) => { const ok = G.makePuppet(me().tag, d.v); UI.toast(ok ? `${G.cname(d.v)} kukla devlet olarak kuruldu.` : 'Kurulamadı.', ok ? 'good' : 'warn'); G.mapDirty = 1; UI.render(); };
  ACT.save = (d) => { const ok = G.saveGame(d.v); UI.toast(ok ? 'Oyun kaydedildi.' : 'Kayıt başarısız: tarayıcı depolaması kullanılamıyor.', ok ? 'good' : 'bad'); UI.render(); };
  ACT.load = (d) => { const ok = G.loadGame(d.v); UI.toast(ok ? 'Kayıt yüklendi.' : 'Kayıt yüklenemedi.', ok ? 'good' : 'bad'); if (ok) { UI.close(); UI.enterGame(); } };
  // yuva silme: ilk dokunuş onay ister, ikincisi siler
  ACT.delsave = (d) => { if (UI.delArm !== d.v) { UI.delArm = d.v; UI.render(); return; } G.saveDel(d.v); UI.delArm = null; UI.toast('Kayıt silindi.', 'info'); UI.render(); };
  ACT.exportsave = async () => { const r = await G.exportSave(); UI.toast(r.ok ? 'Kayıt dosyası indirildi.' : r.why || 'Dosya oluşturulamadı.', r.ok ? 'good' : 'bad'); };
  ACT.mapset = (d) => { UI.settings[d.k] = d.k === 'hires' || d.k === 'big' || d.k === 'q' ? +d.v : d.v; if (d.k === 'q') { R.qAuto = null; R.dprAuto = 0; } UI.saveSettings(); UI.applyMapSettings(); UI.render(); };
  ACT.autosave = (d) => { UI.settings.autosave = +d.v; UI.saveSettings(); UI.render(); };
  // dosyadan yükle (menü ve başlangıç ekranı): dosya seçici panel dışında tek bir gizli girdi; panel yenilense de kaybolmaz
  ACT.importsave = () => {
    let inp = $('imp-file');
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.id = 'imp-file'; inp.hidden = true; inp.addEventListener('change', impPicked); document.body.appendChild(inp); }
    inp.value = ''; inp.click();
  };
  const impPicked = (e) => {
    const inp = e.target; if (!inp.files || !inp.files[0]) return;
    const rd = new FileReader();
    rd.onload = () => {
      const r = G.importSave(String(rd.result)); inp.value = '';
      if (!r.ok) { UI.toast('Kayıt yüklenemedi: ' + r.why, 'bad'); return; }
      UI.toast('Kayıt dosyadan yüklendi.', 'good'); UI.close(); UI.enterGame();
    };
    rd.onerror = () => UI.toast('Dosya okunamadı.', 'bad');
    rd.readAsText(inp.files[0]);
  };
  ACT.setmode = (d) => { R.setMode(d.v); if (d.v === 'sup') G.computeSupplyFor(me()); UI.render(); UI.hud(); };
  ACT.wxtoggle = () => { R.showWeather = !R.showWeather; R.dirty = 1; UI.render(); };
  UI.MODE_N = { pol: 'Siyasi', terrain: 'Arazi', ind: 'Sanayi', res: 'Kaynak', ideo: 'İdeoloji', fac: 'İttifaklar', vp: 'Zafer noktaları', goal: 'Savaş hedefleri', sup: 'İkmal', air: 'Hava', sea: 'Deniz', occ: 'Direniş' };
  UI.MODE_D = { pol: 'Ülkeler ve işgaller', terrain: 'Arazi türleri', ind: 'Fabrika yoğunluğu', res: 'Kahverengi petrol, mavi çelik', ideo: 'İktidar ideolojisi', fac: 'İttifak blokları', vp: 'Şehirlerin zafer noktası', goal: 'Kırmızı savaş, turuncu gerekçe, sarı hazırlanan gerekçe', sup: 'Kırmızı yetersiz, yeşil bol ikmal', air: 'Hava bölgeleri ve üstünlük', sea: 'Deniz bölgelerinde üstünlük', occ: 'İşgaldeki direniş' };
  // HOI4 harita modu çubuğu: düğmeye dokununca tüm modlar açılır
  ACT.mapmode = () => {
    let m = $('mm-menu');
    if (m && !m.hidden) { m.hidden = true; return; }
    if (!m) { m = document.createElement('div'); m.id = 'mm-menu'; document.body.appendChild(m); }
    m.innerHTML = Object.entries(UI.MODE_N).map(([k, n]) => `<button class="${R.mode === k ? 'on' : ''}" data-act="setmode" data-v="${k}"><b>${n}</b><small>${UI.MODE_D[k]}</small></button>`).join('');
    m.hidden = false;
  };
  ACT.setmode = (d) => { $('mm-menu').hidden = true; R.setMode(d.v); if (R.mode === 'sup') G.computeSupplyFor(me()); UI.toast('Harita modu: ' + UI.MODE_N[R.mode] + ' · ' + UI.MODE_D[R.mode]); UI.hud(); };
  ACT.mapmodeNext = () => { const order = Object.keys(UI.MODE_N); R.setMode(order[(order.indexOf(R.mode) + 1) % order.length]); if (R.mode === 'sup') G.computeSupplyFor(me()); UI.toast('Harita modu: ' + UI.MODE_N[R.mode] + (R.mode === 'sup' ? ' · kırmızı: yetersiz, yeşil: bol ikmal; kutular ikmal merkezleri, çizgiler demiryolları' : R.mode === 'occ' ? ' · işgal altındaki eyaletler: yeşil düşük, kırmızı yüksek direniş' : '')); UI.hud(); };
  ACT.auto = (d) => { const r = G.autoAct(d.k, d.v); if (!r.ok) UI.toast('Bu eylem şu an yapılamaz.', 'bad'); UI.render(true); UI.hud(); };
  ACT.tutorial = () => { UI.close(); if (UI.startTutorial) UI.startTutorial(); };
  ACT.sound = (d) => { if (G.Audio) G.Audio.toggle(d.v); UI.render(); };
  ACT.setting = (d) => { if (d.v === 'hist') G.st.opts.hist = G.st.opts.hist ? 0 : 1; else { UI.settings[d.v] = UI.settings[d.v] ? 0 : 1; UI.saveSettings(); } G.newsOn = !!UI.settings.news; UI.render(); };
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

})(window);
