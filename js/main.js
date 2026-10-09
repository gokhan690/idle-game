// Açılış, oyun döngüsü, dokunmatik/fare girdisi, kayıt ve PWA.
(function (g) {
  const G = g.G, R = G.R, UI = G.UI;
  const { NP } = G;
  const $ = (id) => document.getElementById(id);

  // ---------- Kayıt ----------
  const KEY = (slot) => 'demircephe_save_' + slot;
  const store = {
    get(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { g.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  G.saveGame = (slot) => {
    const st = G.st; if (!st) return false;
    const ok = store.set(KEY(slot), G.serialize());
    if (ok) store.set(KEY(slot) + '_meta', JSON.stringify({ player: st.player, day: st.day }));
    return ok;
  };
  G.saveMeta = (slot) => { const m = store.get(KEY(slot) + '_meta'); try { return m ? JSON.parse(m) : null; } catch (e) { return null; } };
  G.loadGame = (slot) => {
    const s = store.get(KEY(slot)); if (!s) return false;
    try { G.deserialize(s); G.st.paused = 1; R.mapDirty = 1; G.mapDirty = 1; if (G.st.conf) setTimeout(() => G.onConference(G.st.conf), 0); return true; } catch (e) { console.error(e); return false; }
  };

  // ---------- Oyun döngüsü ----------
  const SPEEDS = [0, 0.6, 1.25, 2.5, 5, 12]; // gün/saniye (HOI4 temposu)
  let last = performance.now(), acc = 0, hudT = 0, panelT = 0, lastMonth = -1;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    R.t = now;
    const st = G.st;
    if (st && !st.paused && !UI.modalOpen && st.over !== 1 && $('start').hidden) {
      acc += dt * SPEEDS[st.speed || 1];
      const t0 = performance.now();
      let ticks = 0;
      while (acc >= 1) {
        G.tick(); acc -= 1; ticks++;
        if (performance.now() - t0 > 22) { acc = Math.min(acc, 1); break; }
        if (UI.modalOpen) break;
      }
      if (ticks) {
        R.dirty = 1;
        const m = G.dateOf(st.day).getUTCMonth();
        if (m !== lastMonth) { if (lastMonth >= 0 && UI.settings.autosave) G.saveGame('auto'); lastMonth = m; }
        if (st.day === G.dayOf('1948-01-01')) endOfWar();
      }
    }
    if (st && $('start').hidden) {
      hudT += dt; panelT += dt;
      if (hudT > 0.25) { UI.hud(); hudT = 0; }
      if (panelT > 0.6 && performance.now() - UI.lastTouch > 1500) {
        panelT = 0;
        if (UI.panel && !UI.sub?.startsWith('build:') && !UI.sub?.startsWith('tpl:')) UI.render(false, true);
        if (!$('selbar').hidden) UI.renderSel();
        if (!$('card').hidden && UI.cardProv >= 0) UI.showCard(UI.cardProv);
      }
    }
    if (R.dirty || (G.battles && G.battles.length) || R.mapDirty || G.mapDirty) R.draw();
    requestAnimationFrame(frame);
  }

  function endOfWar() {
    const st = G.st, c = st.C[st.player];
    let vp = 0; for (let i = 0; i < NP; i++) if (st.prov[i].c === st.player) vp += G.P[i].vp;
    const rank = Object.values(st.C).filter((x) => x.alive).map((x) => { let v = 0; for (let i = 0; i < NP; i++) if (st.prov[i].c === x.tag) v += G.P[i].vp; return [x.tag, v]; }).sort((a, b) => b[1] - a[1]);
    const pos = rank.findIndex((r) => r[0] === st.player) + 1;
    G.queuePopup({ eyebrow: '1 Ocak 1948', title: 'Bir çağ kapanıyor', text: `${G.cname(st.player)} ${c.alive ? `${vp} zafer puanıyla dünyada ${pos}. sırada` : 'artık haritada yok'}. En güçlü üç devlet: ${rank.slice(0, 3).map((r) => G.cname(r[0])).join(', ')}. Dilersen oynamaya devam edebilirsin.`, opts: [{ n: 'Devam et', fx: () => {} }, { n: 'Yeni oyun', fx: () => UI.showStart() }] });
  }

  // ---------- Girdi ----------
  const pointers = new Map();
  let gesture = null, longTimer = 0;
  const cv = $('map');
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      gesture = { type: R.boxMode ? 'box' : 'pan', x0: p.x, y0: p.y, t0: performance.now(), moved: 0, cx: R.cam.x, cy: R.cam.y };
      if (R.boxMode) R.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      clearTimeout(longTimer);
      longTimer = setTimeout(() => { if (gesture && !gesture.moved && pointers.size === 1) { gesture.long = 1; onLongPress(p.x, p.y); } }, 480);
    } else if (pointers.size === 2) {
      clearTimeout(longTimer);
      const [a, b] = [...pointers.values()];
      gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: R.cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, moved: 1 };
      R.box = null;
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse' && R.sel.units.size) { const h = R.provAt(p.x, p.y); if (h !== R.hover) { R.hover = h; R.dirty = 1; } }
      return;
    }
    pointers.set(e.pointerId, p);
    if (!gesture) return;
    if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const target = gesture.z0 * d / Math.max(10, gesture.d0);
      R.zoomAt(mx, my, target / R.cam.z);
      R.cam.x -= (mx - gesture.mx) / R.cam.z; R.cam.y -= (my - gesture.my) / R.cam.z;
      gesture.mx = mx; gesture.my = my;
      R.clamp(); R.dirty = 1;
      return;
    }
    const dx = p.x - gesture.x0, dy = p.y - gesture.y0;
    if (Math.abs(dx) + Math.abs(dy) > 8) gesture.moved = 1;
    if (gesture.type === 'box') { R.box.x1 = p.x; R.box.y1 = p.y; R.dirty = 1; return; }
    if (gesture.type === 'pan' && gesture.moved) {
      R.cam.x = gesture.cx - dx / R.cam.z; R.cam.y = gesture.cy - dy / R.cam.z; R.clamp(); R.dirty = 1;
    }
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = pos(e);
    pointers.delete(e.pointerId);
    clearTimeout(longTimer);
    if (!gesture) return;
    if (gesture.type === 'pinch') { if (pointers.size === 0) gesture = null; else { const q = [...pointers.values()][0]; gesture = { type: 'pan', x0: q.x, y0: q.y, cx: R.cam.x, cy: R.cam.y, moved: 1 }; } return; }
    if (gesture.type === 'box') {
      const b = R.box; R.box = null; R.dirty = 1;
      if (gesture.moved) boxSelect(b); else onTap(p.x, p.y);
      gesture = null; return;
    }
    if (!gesture.moved && !gesture.long && performance.now() - gesture.t0 < 600) onTap(p.x, p.y);
    gesture = null;
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); gesture = null; R.box = null; clearTimeout(longTimer); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); R.zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  cv.addEventListener('dblclick', (e) => { const p = pos(e); R.zoomAt(p.x, p.y, 1.8); });

  function boxSelect(b) {
    const st = G.st;
    const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
    R.sel.units.clear();
    for (const u of st.units) {
      if (u.t !== st.player) continue;
      const s = R.toScreen(G.nodeX[u.loc], G.nodeY[u.loc]);
      if (s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) R.sel.units.add(u.id);
    }
    R.boxMode = false; $('btn-box').classList.remove('on');
    if (R.sel.units.size) { UI.close(); $('card').hidden = true; UI.renderSel(); UI.toast(`${R.sel.units.size} tümen seçildi.`); }
    R.dirty = 1;
  }

  function onLongPress(x, y) {
    // uzun basış: birlikleri mevcut seçime ekle
    const st = G.st; if (!st) return;
    const n = R.nodeAt(x, y); if (n < 0) return;
    const L = (G.unitsAt[n] || []).filter((u) => u.t === st.player);
    if (!L.length) return;
    for (const u of L) R.sel.units.add(u.id);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* */ }
    UI.close(); $('card').hidden = true; UI.renderSel(); R.dirty = 1;
  }

  function onTap(x, y) {
    const sm = document.getElementById('selmenu'); if (sm && !sm.hidden) { sm.hidden = true; return; }
    const st = G.st; if (!st || !$('start').hidden) return;
    // hava kanadı için bölge seçimi
    if (UI.airPick) { UI.assignWingRegion(R.nodeAt(x, y)); R.mapDirty = 1; return; }
    if (UI.basePick) { UI.assignWingBase(R.nodeAt(x, y)); R.mapDirty = 1; return; }
    // barış konferansı: bölge seçimi
    if (st.conf && R.mode === 'peace') { UI.confPick(R.nodeAt(x, y)); return; }
    const cnt = R.counterAt(x, y);
    const n = cnt ? cnt.n : R.nodeAt(x, y);
    const selectAt = (node) => {
      const mine = (G.unitsAt[node] || []).filter((u) => u.t === st.player);
      if (!mine.length) return false;
      R.sel.units = new Set(mine.map((u) => u.id));
      R.sel.prov = -1; R.sel.army = null; UI.goalMode = null; UI.paraMode = false; UI.lineMode = false;
      // dikey ekranda seçili yığın kartın altında kalmasın
      const sp = R.toScreen(G.nodeX[node], G.nodeY[node]);
      if (R.h > R.w && sp.y > R.h * 0.42) { R.cam.y += (sp.y - R.h * 0.3) / R.cam.z; R.clamp(); }
      UI.close(); $('card').hidden = true; UI.renderSel(); R.dirty = 1;
      return true;
    };
    const pc = st.C[st.player];
    // birleşik sayaç (uzak zoom): içindeki bütün tümenleri seç
    const pickCnt = (k) => {
      if (!k.merged) { selectAt(k.n); return; }
      R.sel.units = new Set(k.units.map((u) => u.id)); R.sel.prov = -1; R.sel.army = null; UI.goalMode = null; UI.paraMode = false;
      UI.close(); $('card').hidden = true; UI.renderSel(); R.dirty = 1;
    };
    const armyOfCnt = (k) => { const L = k.units || []; const a = L.length && L[0].army; return a && L.every((u) => u.army === a) && G.armyById(pc, a) ? a : 0; };
    const setGoal = (a, node) => {
      const owner = st.prov[node].c;
      if (owner === st.player || G.sameFaction(owner, st.player)) return false;
      a.goal = node; a.goals = []; if (a.ord === 'hold' || a.ord === 'fb') a.ord = 'def';
      if (!G.atWar(st.player, owner)) a.vs = owner;
      pc._frontsDirty = 1; G.computeFronts(pc);
      UI.toast(`${a.n} taarruz oku: ${G.pname(node)}. Plan dolunca “Uygula ▶”.`, 'good');
      return true;
    };
    // hatta yayma modu
    if (UI.lineMode) { if (n >= 0 && n < NP) UI.lineTo(n); else { UI.lineMode = false; UI.renderSel(); } return; }
    // bölge seçimi modu
    if (R.regionMode) { UI.selectRegion(n); return; }
    // hava indirme modu
    if (UI.paraMode) { if (n >= 0 && n < NP) UI.paraTo(n); else { UI.paraMode = false; UI.renderSel(); } return; }
    // savunma hattı çizimi
    if (UI.fbMode) { UI.fbTap(n); return; }
    // taarruz oku modu (+ Aşama: okun ucundan sonraki hedef)
    if (UI.goalMode) {
      const a = G.armyById(pc, UI.goalMode), app = UI.goalAppend; UI.goalMode = null; UI.goalAppend = 0;
      if (a && n >= 0 && n < NP) {
        if (app && a.goal != null) {
          const owner = st.prov[n].c;
          if (owner === st.player || G.sameFaction(owner, st.player)) UI.toast('Aşama hedefi düşman ya da yabancı bir eyalet olmalı.', 'warn');
          else { (a.goals || (a.goals = [])).push(n); UI.toast(`${a.n}: ${a.goals.length + 1}. aşama ${G.pname(n)}.`, 'good'); }
        } else if (!setGoal(a, n)) UI.toast('Ok, düşman ya da yabancı bir eyalete çizilmeli.', 'warn');
      }
      UI.renderSel(); R.dirty = 1; return;
    }
    // ordu etiketi
    if (cnt && cnt.army) { if (R.sel.army === cnt.army) { R.sel.units.clear(); R.sel.army = null; UI.renderSel(); R.dirty = 1; } else UI.selectArmy(cnt.army); return; }
    // muharebe simgesi
    if (!cnt && !R.sel.fleet && !R.sel.units.size) {
      const bm = (R.battleMarks || []).find((m) => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h);
      if (bm && bm.naval) { UI.panel = 'navy'; UI.sub = null; $('card').hidden = true; UI.render(true); const el = [...document.querySelectorAll('#sheet-body .sec-h')].find((h) => /Deniz muharebeleri/.test(h.textContent)); if (el) el.scrollIntoView(); return; }
      if (bm) { UI.panel = 'battle'; UI.sub = null; UI.battleN = bm.b.n; $('card').hidden = true; UI.render(true); return; }
    }
    // filo seçimi ve hareketi
    if (cnt && cnt.fleet && cnt.tag === st.player) { R.sel.fleet = cnt.fleet; R.sel.units.clear(); UI.close(); $('card').hidden = true; UI.renderSel(); R.dirty = 1; return; }
    if (R.sel.fleet) {
      const c = st.C[st.player]; const f = c.fleets.find((x) => x.id === R.sel.fleet);
      if (f && n >= NP) {
        const p = G.fleetPath(f.loc, n, st.player);
        if (p) { f.path = p; f.prog = 0; if (f.mis === 'patrol' || f.mis === 'raid') f.mis = 'hold'; UI.toast(`${f.n} yola çıktı (${p.length} bölge).`); }
        else UI.toast('Bu deniz bölgesine yol yok.', 'warn');
        UI.renderSel(); R.dirty = 1; return;
      }
      R.sel.fleet = null; $('selbar').hidden = true; R.dirty = 1;
      if (n < 0) return;
    }
    if (R.sel.units.size) {
      const sel = st.units.filter((u) => R.sel.units.has(u.id));
      const allHere = sel.length > 0 && (cnt && cnt.merged ? sel.length === cnt.units.length && cnt.units.every((u) => R.sel.units.has(u.id)) : sel.every((u) => u.loc === n));
      if (cnt && cnt.tag === st.player && !cnt.fleet) {
        if (allHere && !R.sel.army) { R.sel.units.clear(); UI.renderSel(); R.dirty = 1; return; }
        const arm = armyOfCnt(cnt);
        if (arm && R.sel.army !== arm) UI.selectArmy(arm); else pickCnt(cnt);
        return;
      }
      if (n < 0 || allHere) { R.sel.units.clear(); R.sel.army = null; UI.renderSel(); R.dirty = 1; return; }
      // ordu seçiliyken düşman eyaleti: taarruz oku (HOI4 savaş planı)
      const a = R.sel.army ? G.armyById(pc, R.sel.army) : null;
      if (a && n < NP && setGoal(a, n)) { UI.renderSel(); R.dirty = 1; return; }
      order(sel, n); return;
    }
    if (cnt && cnt.tag === st.player && !cnt.fleet) { const arm = armyOfCnt(cnt); if (arm) UI.selectArmy(arm); else pickCnt(cnt); return; }
    if (n < 0) { R.sel.prov = -1; $('card').hidden = true; R.dirty = 1; return; }
    if (n >= NP) { selectAt(n); return; }
    R.sel.prov = n;
    if (UI.panel) UI.close();
    UI.showCard(n); R.dirty = 1;
  }

  function order(units, target) {
    const st = G.st;
    let ok = 0, fail = 0, naval = 0, blocked = '';
    const c = st.C[st.player];
    for (const u of units) {
      const s = G.unitStats(u);
      let path = G.findPath(u.loc, target, u.t, s.spd, { naval: false });
      if (!path) {
        path = G.findPath(u.loc, target, u.t, s.spd, { naval: true });
        if (path && path.some((x) => x >= NP)) {
          // deniz yolu: konvoy ve deniz üstünlüğü kontrolü
          const landing = path[path.length - 1];
          const lastSea = [...path].reverse().find((x) => x >= NP);
          const hostileLanding = landing < NP && G.atWar(u.t, st.prov[landing].c);
          const freeConv = (c.ships.conv || 0) - G.convoyNeed(u.t) - naval * 5;
          if (freeConv < 5) { blocked = 'Yeterli konvoy yok: deniz yoluyla taşıma için tümen başına 5 konvoy gerekir.'; path = null; }
          else if (hostileLanding && lastSea != null && G.navalSupremacy(u.t, lastSea) < 0.35) { blocked = 'Çıkarma bölgesinde düşman donanması üstün: önce deniz üstünlüğü kur.'; path = null; }
          else naval++;
        }
      }
      if (path && path.length) { u.path = path; u.prog = 0; u.auto = 0; ok++; } else fail++;
    }
    if (target < NP && !G.canEnter(st.player, target)) UI.toast(`${G.cname(st.prov[target].c)} topraklarına giremezsin: savaş ilan et veya geçiş izni al.`, 'warn');
    else if (blocked) UI.toast(blocked, 'warn');
    else if (!ok) UI.toast('Bu hedefe ulaşılabilecek bir yol yok.', 'warn');
    else if (fail) UI.toast(`${ok} tümen yola çıktı, ${fail} tümen hedefe ulaşamıyor.`, 'warn');
    else if (naval) UI.toast(`${ok} tümen deniz yoluyla gönderildi.`);
    if (ok && st.paused) UI.toast('Oyun duraklatıldı: emirler zaman başlayınca uygulanır.');
    R.dirty = 1; UI.renderSel();
  }

  // klavye kısayolları (masaüstü)
  g.addEventListener('keydown', (e) => {
    if (!G.st || !$('start').hidden || UI.modalOpen) return;
    if (e.code === 'Space') { e.preventDefault(); G.st.paused = !G.st.paused; UI.hud(); }
    else if (/^Digit[1-5]$/.test(e.code)) { G.st.speed = +e.code.slice(5); G.st.paused = 0; UI.hud(); }
    else if (e.code === 'Escape') { if (UI.panel) UI.close(); else { R.sel.units.clear(); $('selbar').hidden = true; R.dirty = 1; } }
  });
  g.addEventListener('orientationchange', () => setTimeout(() => R.resize(), 250));
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.st && $('start').hidden && UI.settings.autosave) G.saveGame('auto'); });

  // ---------- Başlat ----------
  function boot(restore) {
    R.init(cv);
    // arka plan için bir dünya kur (seçim ekranında görünsün)
    if (restore && restore.save) {
      try { G.deserialize(restore.save); UI.enterGame(); } catch (e) { G.newGame('TUR'); UI.showStart(); }
    } else {
      G.newGame('TUR');
      G.st.paused = 1;
      R.cam.z = Math.max(R.minZ, 1.2); R.focusOn(G.st.C.TUR.cap);
      UI.showStart();
    }
    requestAnimationFrame(frame);
  }
  // Önizleme ortamında güncellemelerde durum korunur
  const hot = g.claude && g.claude.hot;
  if (hot && hot.snapshot) try { hot.snapshot(() => ({ save: G.st && $('start').hidden ? G.serialize() : null })); } catch (e) { /* */ }
  if (hot && hot.ready) hot.ready((data) => boot(data || {})); else boot((hot && hot.data) || {});

  // PWA (yalnızca normal web barındırmada)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !g.__NO_SW__) {
    g.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})(window);
