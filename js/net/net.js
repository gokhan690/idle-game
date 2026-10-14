// Çok oyunculu (çevrimiçi, eşzamanlı tur): kurucu yetkili.
// - Lobi: games/<kod> belgesi (kurucu, ayarlar, yuvalar {kimlik: {slot, tag}}, durum, tur).
// - Tur başında kurucu anlık görüntüyü games/<kod>/snap altına yazar; herkes onu yükler (yükleme saf olduğu için herkeste aynı).
// - Emir aşamasında oyun durur; herkes emir verir ve "Turu bitir"e basar: tur başına göre durum farkı games/<kod>/ord/t<tur>_<yuva>.
// - Herkes hazır olunca (ya da kurucu beklemeden devam derse) kurucu tur başı görüntüsünü yükler, yamaları yuva sırasıyla
//   uygular, turu simüle eder ve yeni görüntüyü yayınlar. Tur içinde çıkan olaylarda varsayılan seçenek uygulanır.
(function (g) {
  const G = g.G, UI = G.UI, R = G.R;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const caps = G.netCaps;
  const N = (G.net = { active: false, gid: null, me: null, game: null, phase: '', turn: -1, ords: {}, names: {}, busy: false });
  const SLOT_ID = 100000; // istemcilerin yeni kimlik aralığı (çakışmasın)
  const randCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  const D = () => caps.db();
  let unsubs = [];
  const stopWatch = () => { for (const u of unsubs) try { u(); } catch (e) { /* */ } unsubs = []; };
  const myJoined = () => { try { return JSON.parse(localStorage.getItem('dc_mp') || '[]'); } catch (e) { return []; } };
  const remember = (gid) => { try { const L = myJoined().filter((x) => x !== gid); L.unshift(gid); localStorage.setItem('dc_mp', JSON.stringify(L.slice(0, 6))); } catch (e) { /* */ } };

  N.avail = async () => !!((await D()) && (await caps.uid()));
  N.isHost = () => !!(N.game && N.me && N.game.host === N.me);
  N.mySlot = () => (N.game && N.game.slots && N.game.slots[N.me] ? N.game.slots[N.me].slot : null);
  N.myTag = () => (N.game && N.game.slots && N.game.slots[N.me] ? N.game.slots[N.me].tag : null);
  // kontrol edilen insan ülkeleri: yaşayanlar ve dolu yuvalar
  const humanSlots = () => Object.values((N.game && N.game.slots) || {}).filter((s) => s.tag && (!G.st || !G.st.C[s.tag] || G.st.C[s.tag].alive));
  const refresh = () => { if (!$('start').hidden) UI.renderStart(); N.hud(); };
  const names = async () => {
    const ids = Object.keys((N.game && N.game.slots) || {}).filter((i) => !N.names[i]); if (!ids.length) return;
    const u = await caps.user(); if (!u || !u.profiles) return;
    try { const ps = await u.profiles(ids); for (const i of ids) N.names[i] = (ps[i] && ps[i].name) || 'Oyuncu'; refresh(); } catch (e) { /* */ }
  };

  // ---------- lobi ----------
  N.create = async () => {
    const db = await D(), me = await caps.uid(); if (!db || !me) return UI.toast('Çok oyunculu için claude.ai içinde oturum açık olmalı.', 'bad');
    const gid = randCode();
    await db.doc('games/' + gid).set({ host: me, mode: 'turn', turnDays: 7, hist: 1, alt: 0, diff: 1, status: 'lobby', slots: { [me]: { slot: 0, tag: null } }, created: Date.now(), turn: 0 });
    N.watch(gid);
  };
  N.join = async (code) => {
    const db = await D(), me = await caps.uid(); if (!db || !me) return UI.toast('Çok oyunculu için claude.ai içinde oturum açık olmalı.', 'bad');
    const gid = String(code || '').trim().toUpperCase();
    const s = await db.doc('games/' + gid).get().catch(() => null);
    if (!s || !s.exists) return UI.toast('Bu kodla bir oyun bulunamadı.', 'bad');
    const gm = s.data();
    if (!gm.slots[me]) {
      if (gm.status !== 'lobby') return UI.toast('Bu oyun başlamış; yalnızca oyuncuları yeniden katılabilir.', 'bad');
      const slot = Math.max(0, ...Object.values(gm.slots).map((x) => x.slot)) + 1;
      await db.doc('games/' + gid).update({ slots: { [me]: { slot, tag: null } } });
    }
    N.watch(gid);
  };
  N.leave = () => { stopWatch(); N.active = false; N.gid = null; N.game = null; N.phase = ''; N.turn = -1; N.ords = {}; refresh(); };
  N.pick = async (tag) => {
    if (!N.game || N.game.status !== 'lobby') return;
    if (Object.entries(N.game.slots).some(([id, s]) => id !== N.me && s.tag === tag)) return UI.toast('Bu ülkeyi başka bir oyuncu seçti.', 'warn');
    await (await D()).doc('games/' + N.gid).update({ slots: { [N.me]: { tag } } });
  };
  N.setOpt = async (k, v) => { if (N.isHost() && N.game.status === 'lobby') await (await D()).doc('games/' + N.gid).update({ [k]: v }); };
  N.watch = async (gid) => {
    stopWatch();
    const db = await D(); N.me = await caps.uid(); N.gid = gid; remember(gid);
    unsubs.push(db.doc('games/' + gid).onSnapshot((s) => {
      if (!s.exists) { UI.toast('Oyun kapatıldı.', 'warn'); N.leave(); return; }
      N.game = s.data(); names();
      if (N.game.status === 'play' && N.game.turn !== N.turn && !N.loading) N.loadTurn(N.game.turn);
      refresh();
    }, () => UI.toast('Oyun bağlantısı koptu; sayfayı yenileyip kodla yeniden katıl.', 'bad')));
    unsubs.push(db.collection(`games/${gid}/ord`).onSnapshot((q) => { N._od = q.docs.map((d) => d.data()); scanOrds(); }));
  };
  // gelen emirler: bu turunkiler; kurucu herkes hazırsa turu çözer
  const scanOrds = () => {
    N.ords = {};
    for (const x of N._od || []) if (x.turn === N.turn) N.ords[x.slot] = x;
    refresh();
    if (N.isHost() && (N.phase === 'orders' || N.phase === 'wait') && !N.busy && !N.loading && humanSlots().every((s) => N.ords[s.slot])) N.resolve();
  };

  // ---------- oyun başlatma ve turlar ----------
  N.start = async () => {
    if (!N.isHost()) return;
    const gm = N.game, slots = Object.entries(gm.slots).filter(([, s]) => s.tag).sort((a, b) => a[1].slot - b[1].slot);
    if (!slots.length || !gm.slots[N.me].tag) return UI.toast('Önce kendi ülkeni seç.', 'warn');
    const humans = {}, ns = {};
    slots.forEach(([id, s], i) => { humans[s.tag] = i; ns[id] = { slot: i, tag: s.tag }; });
    G.newGame(gm.slots[N.me].tag, { hist: gm.hist, alt: gm.alt, diff: gm.diff, humans });
    G.st.speed = 2; G.st.paused = 1; G.st.mp = { gid: N.gid, days: gm.turnDays };
    N.busy = true;
    try {
      await G.blobWrite(await D(), `games/${N.gid}/snap/m`, `games/${N.gid}/snap/c`, G.serialize(), { turn: 0, day: G.st.day });
      await (await D()).doc('games/' + N.gid).update({ status: 'play', turn: 0, day: G.st.day, slots: ns });
    } finally { N.busy = false; }
  };
  // tur başı: yetkili anlık görüntüyü yükle, emir aşamasına geç
  N.loadTurn = async (turn) => {
    N.loading = true;
    try {
      let r = null;
      for (let k = 0; k < 8; k++) { r = await G.blobRead(await D(), `games/${N.gid}/snap/m`, `games/${N.gid}/snap/c`).catch(() => null); if (r && r.meta.turn === turn) break; await new Promise((res) => setTimeout(res, 700)); }
      if (!r || r.meta.turn !== turn) { UI.toast('Tur görüntüsü alınamadı; yeniden deneniyor.', 'warn'); N.loading = false; setTimeout(() => N.game && N.loadTurn(N.game.turn), 2000); return; }
      const first = N.turn < 0;
      G.deserialize(r.str);
      const st = G.st, tag = N.myTag();
      st.player = tag || st.player; st.paused = 1;
      N.turnStart = r.str; N.turnStartObj = JSON.parse(r.str);
      if (!N.isHost()) st.nextId += (N.mySlot() || 0) * SLOT_ID;
      N.turn = turn; N.active = true; N.ords = {};
      for (const x of N._od || []) if (x.turn === turn) N.ords[x.slot] = x;
      N.phase = N.ords[N.mySlot()] && tag ? 'wait' : 'orders'; // yeniden katılan: emri zaten gönderilmişse bekler
      R.mapDirty = 1; G.mapDirty = 1;
      if (first || !$('start').hidden) UI.enterGame(); else { UI.hud(); if (UI.panel) UI.render(); UI.renderSel && UI.renderSel(); }
      if (st.mpEv && st.mpEv.length) UI.toast(`Geçen turda ${st.mpEv.length} olay: ${st.mpEv.slice(0, 3).join(' · ')}${st.mpEv.length > 3 ? '…' : ''}`, 'info');
      else UI.toast(`Tur ${turn + 1} başladı: emirlerini ver, sonra "Turu bitir".`, 'info');
      if (tag && st.C[tag] && !st.C[tag].alive) { UI.toast('Ülken teslim oldu; oyunu izleyici olarak sürdürüyorsun.', 'warn'); N.endTurn(); }
    } finally { N.loading = false; N.hud(); }
    scanOrds();
  };
  // emirleri gönder: tur başına göre durum farkı
  N.endTurn = async () => {
    if (!N.active || N.phase !== 'orders' || N.sending || !N.myTag()) return;
    if (G.finishTick) G.finishTick();
    N.sending = true; N.hud();
    try {
      const ops = G.stateDiff(N.turnStartObj, G.snapObj());
      const body = JSON.stringify(ops);
      if (body.length > 230000) { UI.toast('Bu turdaki değişiklikler çok büyük; birkaçını geri al ve yeniden dene.', 'bad'); return; }
      await (await D()).doc(`games/${N.gid}/ord/t${N.turn}_${N.mySlot()}`).set({ turn: N.turn, slot: N.mySlot(), ops: body, nextId: G.st.nextId - (N.isHost() ? 0 : (N.mySlot() || 0) * SLOT_ID), n: ops.length });
      N.phase = 'wait';
    } catch (e) { UI.toast('Emirler gönderilemedi: ' + ((e && (e.message || e.code)) || ''), 'bad'); } finally { N.sending = false; N.hud(); }
  };
  // kurucu: turu çöz ve yeni görüntüyü yayınla
  N.resolve = async () => {
    if (!N.isHost() || N.busy) return;
    N.busy = true; N.phase = 'resolve'; N.hud();
    const pop = G.onPopup, evs = [];
    try {
      const gm = N.game, days = gm.turnDays || 7;
      G.deserialize(N.turnStart);
      const st = G.st;
      let nid = st.nextId, bad = 0;
      for (const o of Object.values(N.ords).sort((a, b) => a.slot - b.slot)) { bad += G.applyPatch(st, JSON.parse(o.ops)); nid = Math.max(nid, o.nextId || 0); }
      st.nextId = nid; st.player = N.myTag(); st.mpEv = [];
      // tur içindeki olaylar: varsayılan seçenek uygulanır, oyunculara bildirilir
      G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); if (!p.news && p.title) evs.push(p.title); try { p.opts && p.opts[0] && p.opts[0].fx && p.opts[0].fx(); } catch (e) { console.error(e); } } };
      for (let i = 0; i < days && !st.over; i++) G.tick();
      st.mpEv = evs.slice(0, 12); st.paused = 1;
      const str = G.serialize();
      await G.blobWrite(await D(), `games/${N.gid}/snap/m`, `games/${N.gid}/snap/c`, str, { turn: N.turn + 1, day: st.day });
      await (await D()).doc('games/' + N.gid).update({ turn: N.turn + 1, day: st.day });
      // eski emirleri temizle
      for (const o of Object.values(N.ords)) (await D()).doc(`games/${N.gid}/ord/t${o.turn}_${o.slot}`).delete().catch(() => {});
      if (bad) console.warn('uygulanamayan yama işlemi', bad);
    } catch (e) { console.error(e); UI.toast('Tur çözülemedi: ' + ((e && e.message) || ''), 'bad'); N.phase = 'orders'; } finally { G.onPopup = pop; N.busy = false; N.hud(); }
  };

  // ---------- arayüz: tur çubuğu ----------
  N.hud = () => {
    let bar = $('mpbar');
    document.body.classList.toggle('mp', !!N.active);
    if (!N.active || $('start').hidden === false) { if (bar) bar.hidden = true; return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'mpbar'; bar.className = 'mpbar'; document.getElementById('app').appendChild(bar); }
    const hs = humanSlots(), ready = hs.filter((s) => N.ords[s.slot]).length;
    let h = `<span class="mpt">Tur ${N.turn + 1} · ${(N.game && N.game.turnDays) || 7} gün</span><span class="mpr">${ready}/${hs.length} hazır</span>`;
    if (!N.myTag()) h += '<span class="muted small">İzleyici</span>';
    else if (N.phase === 'orders') h += `<button class="btn sm pri" data-act="mpend" ${N.sending ? 'disabled' : ''}>${N.sending ? 'Gönderiliyor…' : 'Turu bitir'}</button>`;
    else if (N.phase === 'wait') h += `<span class="muted small">Bekleniyor</span>${N.isHost() ? '<button class="btn sm" data-act="mpforce">Beklemeden devam</button>' : ''}`;
    else if (N.phase === 'resolve' || N.busy) h += '<span class="muted small">Tur işleniyor…</span>';
    if (bar.dataset.h !== h) { bar.innerHTML = h; bar.dataset.h = h; }
    bar.hidden = false;
  };

  // ---------- arayüz: başlangıç ekranı bölümü ve lobi ----------
  UI.mpSection = () => {
    if (N.availState === undefined) { N.availState = null; N.avail().then((v) => { N.availState = v; if (!$('start').hidden) UI.renderStart(); }); }
    if (!N.availState) return '';
    if (N.gid && N.game && N.game.status === 'lobby') return lobbyHtml();
    const recent = myJoined();
    return `<div class="sec"><h3 class="sec-h">Çok oyunculu<span>çevrimiçi · tur tabanlı</span></h3>
      <p class="muted small" style="margin:0 0 8px">Arkadaşlarınla aynı dünyada oyna: herkes kendi ülkesine emir verir, "Turu bitir"e basar; tur herkes için birlikte işler. Arkadaşların bu oyunu claude.ai hesaplarıyla açabilmeli (Paylaş menüsünden en az "katkıda bulunabilir" izni).</p>
      <div class="btns"><button class="btn pri" data-act="mpcreate">Oyun kur</button></div>
      <div class="row" style="gap:8px;margin-top:8px"><input id="mp-code" class="mpcode-in" maxlength="6" placeholder="Oyun kodu" autocapitalize="characters" autocomplete="off"><button class="btn" data-act="mpjoin">Katıl</button></div>
      ${recent.length ? `<div class="btns" style="margin-top:6px">${recent.map((c) => `<button class="btn sm" data-act="mpjoin" data-v="${c}">${c}</button>`).join('')}</div>` : ''}</div>`;
  };
  const FEAT = ['GER', 'SOV', 'USA', 'ENG', 'FRA', 'ITA', 'JAP', 'TUR', 'CHI', 'POL', 'SPN', 'ROM'];
  const lobbyHtml = () => {
    const gm = N.game, host = N.isHost(), mine = N.myTag();
    const taken = new Map(Object.entries(gm.slots).filter(([, s]) => s.tag).map(([id, s]) => [s.tag, id]));
    const pl = Object.entries(gm.slots).sort((a, b) => a[1].slot - b[1].slot).map(([id, s]) => `<div class="item"><span>${s.tag ? G.flag(s.tag, 30, 20) : '—'}</span><div class="grow"><div class="t">${esc(N.names[id] || 'Oyuncu')}${id === gm.host ? ' <span class="pill">Kurucu</span>' : ''}${id === N.me ? ' <span class="muted small">(sen)</span>' : ''}</div><div class="d">${s.tag ? esc(G.cname(s.tag)) : 'Ülke seçmedi'}</div></div></div>`).join('');
    const opt = (k, v, n) => `<button class="${gm[k] === v ? 'on' : ''}" data-act="mpopt" data-k="${k}" data-v="${v}" ${host ? '' : 'disabled'}>${n}</button>`;
    return `<div class="sec"><h3 class="sec-h">Çok oyunculu lobi<span>kod</span></h3>
      <div class="mpcode">${N.gid}</div><p class="muted small" style="margin:0 0 8px">Bu kodu arkadaşlarına gönder; oyunu açıp "Katıl"a bassınlar.</p>
      <div class="list">${pl}</div>
      <h3 class="sec-h" style="margin-top:10px">Ülken</h3>
      <div class="minors">${FEAT.map((t) => { const by = taken.get(t); return `<button class="mcard ${mine === t ? 'on' : ''}" data-act="mppick" data-v="${t}" ${by && by !== N.me ? 'disabled' : ''}>${G.flag(t, 24, 16)}<b>${esc(G.cname(t))}</b></button>`; }).join('')}</div>
      <h3 class="sec-h" style="margin-top:10px">Ayarlar${host ? '' : '<span>kurucu belirler</span>'}</h3>
      <div class="seg">${opt('hist', 1, 'Tarihî')}${opt('hist', 0, 'Serbest')}</div>
      <div class="seg" style="margin-top:6px">${G.DIFF.map((x, i) => opt('diff', i, x.n)).join('')}</div>
      <div class="seg" style="margin-top:6px">${opt('turnDays', 3, 'Tur 3 gün')}${opt('turnDays', 7, 'Tur 7 gün')}${opt('turnDays', 14, 'Tur 14 gün')}</div>
      <div class="btns" style="margin-top:10px">${host ? `<button class="btn pri" data-act="mpstart" ${mine ? '' : 'disabled'}>Oyunu başlat</button>` : '<span class="muted small">Kurucunun başlatması bekleniyor…</span>'}<button class="btn" data-act="mpleave">Lobiden çık</button></div></div>`;
  };

  // ---------- eylemler ----------
  const A = UI.ACT;
  A.mpcreate = () => N.create();
  A.mpjoin = (d) => N.join(d.v || ($('mp-code') && $('mp-code').value));
  A.mpleave = () => N.leave();
  A.mppick = (d) => N.pick(d.v);
  A.mpopt = (d) => N.setOpt(d.k, +d.v);
  A.mpstart = () => N.start();
  A.mpend = () => N.endTurn();
  A.mpforce = () => { if (N.isHost() && Object.keys(N.ords).length) N.resolve(); else UI.toast('Önce kendi turunu bitir.', 'warn'); };
  // çok oyunculu turda zamanı oyuncular değil, tur akışı yönetir
  for (const k of ['pause', 'speed']) { const f = A[k]; A[k] = (d) => { if (N.active) { UI.toast('Çok oyunculu oyunda zaman turlarla ilerler: "Turu bitir"e bas.', 'info'); return; } f(d); }; }
})(window);
