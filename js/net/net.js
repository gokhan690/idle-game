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
    await db.doc('games/' + gid).set({ host: me, rt: 0, pub: 1, turnDays: 7, hist: 1, alt: 0, diff: 1, status: 'lobby', slots: { [me]: { slot: 0, tag: null } }, created: Date.now(), turn: 0 });
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
  N.leave = () => {
    stopWatch(); leaveRoom();
    N.active = false; N.gid = null; N.game = null; N.phase = ''; N.turn = -1; N.ords = {}; G.simMask = undefined; N.chat = [];
    Object.assign(N.rt, { lastN: -1, maxDay: -1, pend: {}, seen: {}, applied: {}, hashes: {}, out: [], buf: [], recent: [], hold: false, syncing: false });
    refresh();
  };
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
      const prevHost = N.game && N.game.host;
      N.game = s.data(); names();
      if (N.game.status === 'play') {
        joinRoom(gid);
        if (N.game.rt) N.rtWatch(prevHost);
        else if (N.game.turn !== N.turn && !N.loading) N.loadTurn(N.game.turn);
        else if (prevHost !== N.game.host) scanOrds(); // kurucu değişti: hazırsa turu yeni kurucu çözer
      }
      refresh();
    }, () => UI.toast('Oyun bağlantısı koptu; sayfayı yenileyip kodla yeniden katıl.', 'bad')));
    unsubs.push(db.collection(`games/${gid}/ord`).onSnapshot((q) => { N._od = q.docs.map((d) => d.data()); scanOrds(); }));
    unsubs.push(watchChat(db, gid));
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
    G.st.speed = 2; G.st.paused = 1; G.st.mp = { gid: N.gid, days: gm.turnDays, rt: gm.rt ? 1 : 0 };
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
      N.turnStart = r.str; N.turnStartObj = JSON.parse(r.str); G.simMask = '';
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
      G.simMask = ''; // insan ülkelerinin hepsi aynı kurala tabi: olaylar ve konferanslar pencere açmadan çözülür
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

  // ---------- oda: kim çevrimiçi (kurucu devri) ve gerçek zamanlı iletiler ----------
  // Gerçek zamanlı kipte herkes aynı simülasyonu çalıştırır (kilitli adım). Kurucu saati yönetir: ~0,4 sn'de bir "frame"
  // yayar {n, day: tamamlanan gün, sp, pa, c: yeni emirler}; kimse bu günü geçmez. Her emir (durum farkı) kurucuya "cmd" ile
  // gider; kurucu onu bir güne zamanlar (st.mpq) ve çerçeveyle herkese duyurur; herkes o günün başında aynı sırayla uygular.
  // Eylemin yerel etkisi geri alınır, böylece emir her cihazda aynı anda devreye girer. Her 20 günde bir durum karmaşası
  // presence ile karşılaştırılır; uyuşmazlıkta (ya da kayıp çerçevede) oyuncu kurucudan taze anlık görüntü ister ("need" → "snap").
  const RT = (N.rt = { n: 0, lastN: -1, maxDay: -1, idc: 0, q: 0, pend: {}, seen: {}, applied: {}, hashes: {}, out: [], buf: [], recent: [], hold: false, syncing: false, needAt: 0, snapAt: 0, liveAt: 0, sentDay: -1, sentSp: -1, sentPa: -1, sentAt: 0, waitFor: '', joinedAt: 0, hostSeen: 0 });
  N.peers = []; N.evToast = {};
  let room = null, roomGid = null, roomP = null, timer = 0;
  const LAG = 10; // kurucu en geride kalan çevrimiçi oyuncudan en çok bu kadar gün öne geçer
  const livePath = () => [`games/${N.gid}/live/m`, `games/${N.gid}/live/c`];
  N.rtOn = () => !!(N.active && G.st && G.st.mp && G.st.mp.rt);
  const slotOf = (id) => (N.game && N.game.slots && N.game.slots[id] ? N.game.slots[id].slot : null);
  const onlineIds = () => new Set(N.peers.filter((p) => p.by && !p.isMe && p.presence && p.presence.g === N.gid).map((p) => p.by));
  const joinRoom = async (gid) => {
    if (roomGid === gid) return room;
    roomGid = gid;
    const lob = await (roomP || (roomP = caps.capOf('room')));
    if (!lob || !lob.join || roomGid !== gid) return null;
    let r; try { r = await lob.join('dc-' + gid.toLowerCase()); } catch (e) { return null; }
    if (roomGid !== gid) { try { r.leave(); } catch (e) { /* */ } return null; }
    room = r; RT.joinedAt = Date.now();
    r.onPeers((ch) => { N.peers = (ch && ch.peers) || []; if (N.game && onlineIds().has(N.game.host)) RT.hostSeen = Date.now(); N.hud(); });
    r.on('cmd', (m) => onCmd(m));
    r.on('frame', (m) => onFrame(m));
    r.on('need', (m) => onNeed(m));
    r.on('snap', (m) => onSnap(m));
    r.on('evpick', (m) => onEvPick(m));
    pres({ g: gid, slot: N.mySlot() });
    if (!timer) timer = setInterval(pump, 400);
    return r;
  };
  const leaveRoom = () => { if (room) try { room.leave(); } catch (e) { /* */ } room = null; roomGid = null; N.peers = []; if (timer) { clearInterval(timer); timer = 0; } };
  let presLast = '';
  const pres = (p) => { if (!room) return; const s = JSON.stringify(p); if (s === presLast) return; presLast = s; room.presence(p).catch(() => {}); };
  const emit = (topic, data) => { if (room) room.emit(topic, data).catch((e) => console.warn('room', topic, e && e.code)); };

  // durum karmaşası (yerel oyuncu, günlük ve zamanlanmış emirler gibi cihaza özgü alanlar hariç)
  const HSKIP = ['player', 'log', 'led', 'mpq', 'paused', 'speed', 'tsrc', 'tl', 'mpEv'];
  N.stateHash = () => { const o = JSON.parse(G.serialize()); for (const k of HSKIP) delete o[k]; const s = JSON.stringify(o); let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
  // emirden sonra türetilmiş değerler (kayda girmeyen) yeniden hesaplanır; herkeste aynı noktada
  const rederive = () => { const st = G.st; for (const c of Object.values(st.C)) G.recomputeMods(c); G.refreshEnemies(); G.rebuildUnitIndex(); G.updateSummaries(); G.mapDirty = 1; R.mapDirty = 1; };

  // ---- eylem yakalama: önce/sonra farkı, yerel etkiyi geri al, kurucuya gönder ----
  const UI_ONLY = new Set(('alert back battle bcesc boxsel chime clearsel close closecard continue csave cload delsave dipc divinfo divonly exportsave '
    + 'focusclose ftnext ftzoom fullscreen home importsave intelopen intelback ledmetric ledtab load log logf mapmode mapmodeNext mapset newgame '
    + 'opencountry ovgo panel pause pick resinfo save selall selarmy selgroup selmenu selpick selprov setting setmode showc slotpick sopt sound speed '
    + 'tab tall tutorial unsel wxtoggle autosave dzmod dztier dzlvl paramode linemode armygoaladd armysel fleetsel ordclose ordfb').split(' '));
  N.capture = (fn, asTag) => {
    if (!N.rtOn()) return fn();
    if (!N.myTag()) { UI.toast('İzleyicisin: emir veremezsin.', 'warn'); return; }
    if (RT.syncing) { UI.toast('Eşitleniyor; birazdan yeniden dene.', 'warn'); return; }
    G.finishTick();
    const st = G.st, slot = N.mySlot() || 0, sd = G.supDirty, cw = G.cwDirty, nid = st.nextId;
    const a = G.snapObj();
    RT.idc = Math.max(RT.idc, (st.mpIds && st.mpIds[slot]) || 0);
    const base = 1e9 + slot * 1e7 + RT.idc; // oyuncunun yeni nesne kimlikleri ayrı aralıkta
    st.nextId = base;
    let r;
    const pl = st.player; if (asTag) st.player = asTag; // kurucu başka oyuncunun olay seçimini onun adına uygular
    try { r = fn(); } finally {
      if (asTag) st.player = pl;
      const s2 = G.st;
      if (s2 === st) {
        const used = st.nextId - base; st.nextId = nid;
        if (used > 0) { RT.idc += used; st.mpIds = Object.assign({}, st.mpIds, { [slot]: RT.idc }); }
        const b = G.snapObj(), ops = G.stateDiff(a, b);
        if (ops.length) { G.applyPatch(st, G.stateDiff(b, a)); rederive(); sendCmd(ops); }
        G.supDirty = sd; G.cwDirty = cw;
      }
    }
    return r;
  };
  const act0 = UI.act;
  UI.act = (a, ds, el) => (N.rtOn() && !UI_ONLY.has(a) && !a.startsWith('mp') ? N.capture(() => act0(a, ds, el)) : act0(a, ds, el));

  const sendCmd = (ops) => {
    const s = N.mySlot() || 0, q = (RT.q = Math.max(RT.q + 1, Date.now())), o = JSON.stringify(ops), k = s + ':' + q;
    if (o.length > 200000) { UI.toast('Bu emir çok büyük; daha küçük adımlarla dene.', 'bad'); return; }
    const c = { s, q, o };
    if (N.isHost()) { schedule(c); return; }
    RT.pend[k] = { c, t: Date.now(), big: o.length > 3000 };
    transmit(k);
    N.hud();
  };
  const transmit = async (k) => {
    const p = RT.pend[k]; if (!p) return;
    p.t = Date.now();
    if (p.big) {
      if (!p.stored) { await (await D()).doc(`games/${N.gid}/cmd/${p.c.s}_${p.c.q}`).set({ o: p.c.o }); p.stored = 1; }
      emit('cmd', { s: p.c.s, q: p.c.q, r: 1 });
    } else emit('cmd', p.c);
  };
  // kurucu: emri bir güne zamanla (tamamlanan günden sonraki gün başında uygulanır)
  const schedule = async (c) => {
    const k = c.s + ':' + c.q;
    if (RT.seen[k]) return; RT.seen[k] = 1;
    if (c.o == null) {
      const d = await (await D()).doc(`games/${N.gid}/cmd/${c.s}_${c.q}`).get().catch(() => null);
      if (!d || !d.exists) { delete RT.seen[k]; return; }
      c.o = d.data().o;
    } else if (c.o.length > 3000 && N.isHost() && c.s === (N.mySlot() || 0)) {
      await (await D()).doc(`games/${N.gid}/cmd/${c.s}_${c.q}`).set({ o: c.o });
    }
    G.finishTick();
    const st = G.st, e = { k, s: c.s, q: c.q, d: st.day, o: c.o };
    (st.mpq || (st.mpq = [])).push(e);
    RT.out.push(e);
  };
  const onCmd = (m) => {
    if (!N.isHost() || !N.rtOn() || m.sameTab) return;
    const c = m.data || {};
    if (typeof c.s !== 'number' || typeof c.q !== 'number' || slotOf(m.by) !== c.s) return; // gönderen kendi yuvası adına emir verebilir
    if (c.r) schedule({ s: c.s, q: c.q, o: null }); else if (typeof c.o === 'string') schedule({ s: c.s, q: c.q, o: c.o });
  };

  // ---- gün sınırı: zamanı gelen emirleri yuva/sıra düzeninde uygula ----
  G.preDay = () => {
    const st = G.st; if (!st.mpq || !st.mpq.length) return;
    const due = st.mpq.filter((e) => e.d <= st.day && e.o != null).sort((a, b) => a.d - b.d || a.s - b.s || a.q - b.q);
    if (!due.length) return;
    st.mpq = st.mpq.filter((e) => !due.includes(e));
    for (const e of due) { RT.applied[e.k] = 1; try { G.applyPatch(st, JSON.parse(e.o)); } catch (err) { console.error(err); } }
    rederive(); G.supDirty = 1;
  };
  // gerçek zamanlı kipte gün işlenirken yerel oyuncu maskelenir: olaylar ve konferanslar herkeste aynı çözülür
  const syncMask = () => { G.simMask = N.active && G.st && G.st.mp ? '' : undefined; };
  G.dayGate = () => {
    if (!N.rtOn()) return true;
    const st = G.st;
    if (RT.syncing) return false;
    if (N.isHost()) {
      // en geride kalan çevrimiçi oyuncuyu bekle
      RT.waitFor = '';
      const on = onlineIds();
      for (const p of N.peers) if (p.by && on.has(p.by) && !p.presence.away && typeof p.presence.day === 'number' && p.presence.day < st.day - LAG) { RT.waitFor = N.names[p.by] || 'oyuncu'; return false; }
      return true;
    }
    if (st.day >= RT.maxDay) return false;
    for (const e of st.mpq || []) if (e.d <= st.day && e.o == null) return false;
    return true;
  };
  // gün sonu (simülasyonun içinden, gün tamamlanınca): 20 günde bir durum karmaşası
  G.dayEnd = () => {
    if (!N.rtOn()) return;
    const st = G.st;
    if (st.day % 20 === 0) {
      RT.hashes[st.day] = N.stateHash();
      for (const d of Object.keys(RT.hashes)) if (+d < st.day - 200) delete RT.hashes[d];
    }
    // kurucu: dakikada bir (en çok) canlı anlık görüntü; kurucu dönünce ya da kimse yokken sürdürmek için
    if (N.isHost() && st.day % 30 === 0 && Date.now() - RT.liveAt > 60000) { RT.liveAt = Date.now(); setTimeout(() => writeLive(false), 0); }
  };

  // ---- kurucu: çerçeve yayını ----
  const emitFrames = (force) => {
    const st = G.st; if (!st || RT.hold) return;
    const done = G.tickIt ? st.day - 1 : st.day, sp = st.speed || 1, pa = st.paused || UI.modalOpen ? 1 : 0;
    if (!force && !RT.out.length && done === RT.sentDay && sp === RT.sentSp && pa === RT.sentPa && Date.now() - RT.sentAt < 3000) return;
    const out = RT.out; RT.out = [];
    let c = [], size = 0;
    const send = () => { emit('frame', { n: ++RT.n, day: done, sp, pa, c }); c = []; size = 0; };
    for (const e of out) {
      const x = e.o.length <= 3000 ? { k: e.k, s: e.s, q: e.q, d: e.d, o: e.o } : { k: e.k, s: e.s, q: e.q, d: e.d, r: 1 };
      const xs = JSON.stringify(x).length;
      if (size + xs > 3400 && c.length) send();
      c.push(x); size += xs;
    }
    send();
    RT.sentDay = done; RT.sentSp = sp; RT.sentPa = pa; RT.sentAt = Date.now();
  };
  // ---- oyuncu: çerçeve al ----
  const onFrame = (m) => {
    if (m.sameTab || !N.game || m.by !== N.game.host || N.isHost()) return;
    const f = m.data; if (!f || typeof f.n !== 'number') return;
    RT.recent.push(f); if (RT.recent.length > 300) RT.recent.shift();
    if (RT.syncing || !N.rtOn()) { RT.buf.push(f); if (RT.buf.length > 400) RT.buf.shift(); return; }
    applyFrame(f);
  };
  const applyFrame = (f) => {
    if (f.n <= RT.lastN) return;
    if (RT.lastN >= 0 && f.n !== RT.lastN + 1) { requestSync('kayıp çerçeve'); RT.buf.push(f); return; }
    RT.lastN = f.n;
    const st = G.st;
    for (const x of f.c || []) {
      delete RT.pend[x.k];
      if (RT.applied[x.k] || (st.mpq || []).some((e) => e.k === x.k)) continue;
      if (x.d < st.day) { requestSync('geç emir'); return; }
      const e = { k: x.k, s: x.s, q: x.q, d: x.d, o: x.o != null ? x.o : null };
      (st.mpq || (st.mpq = [])).push(e);
      if (e.o == null) fetchRef(e);
    }
    RT.maxDay = Math.max(RT.maxDay, f.day);
    st.paused = 0; // oyuncu izin verilen güne kadar ilerler (kurucu duraklarsa izin verilen gün de durur)
    st.speed = RT.maxDay - st.day > 4 || f.pa ? 5 : f.sp; // geride kalan cihaz yetişmek için hızlanır
    if (RT.maxDay - st.day > 120) requestSync('çok geride');
  };
  const fetchRef = async (e) => {
    for (let k = 0; k < 6 && e.o == null; k++) {
      const d = await (await D()).doc(`games/${N.gid}/cmd/${e.s}_${e.q}`).get().catch(() => null);
      if (d && d.exists) { e.o = d.data().o; return; }
      await new Promise((r) => setTimeout(r, 800));
    }
    if (e.o == null) requestSync('emir okunamadı');
  };

  // ---- eşitleme: taze anlık görüntü ----
  const requestSync = (why) => {
    if (N.isHost() || !N.gid) return;
    if (!RT.syncing) { RT.syncing = true; RT.buf = []; console.warn('eşitleme:', why); N.hud(); }
    if (Date.now() - RT.needAt < 5000) return;
    RT.needAt = Date.now();
    emit('need', { at: Date.now() });
  };
  // Yüklenen durum, kesintisiz çalışanla birebir aynı ilerlemez (muharebe ve hava önbellekleri yüklemede sıfırlanır).
  // Bu yüzden duyurulan her görüntüyü herkes (kurucu dahil) yükler: hepsi aynı noktadan taze başlar. Kurucu, duyuru
  // gidene dek yeni çerçeve yaymaz; oyuncular görüntüden sonraki çerçeveleri halka tampondan yeniden uygular.
  const writeLive = async (announce) => {
    G.finishTick(); emitFrames(true);
    const st = G.st, str = G.serialize(), meta = { day: st.day, fn: RT.n, at: Date.now(), host: N.me };
    RT.liveAt = Date.now();
    if (announce) { RT.hold = true; reloadSelf(str); }
    const [m, c] = livePath();
    try { await G.blobWrite(await D(), m, c, str, meta); } catch (e) { console.warn('canlı görüntü yazılamadı', e); RT.hold = false; return; }
    if (announce) { emit('snap', { at: meta.at }); RT.hold = false; }
  };
  const reloadSelf = (str) => {
    const o = G.st, pl = o.player, sp = o.speed, pa = o.paused;
    G.deserialize(str);
    const st = G.st; st.player = pl; st.speed = sp; st.paused = pa;
    R.mapDirty = 1; G.mapDirty = 1; RT.hashes = {};
    UI.hud(); if (UI.panel) UI.render(); if (UI.renderSel) UI.renderSel();
  };
  const onNeed = (m) => {
    if (!N.isHost() || !N.rtOn() || m.sameTab || slotOf(m.by) == null) return;
    if (Date.now() - RT.snapAt < 3000) { setTimeout(() => onNeed(m), 3200 - (Date.now() - RT.snapAt)); return; }
    RT.snapAt = Date.now();
    writeLive(true);
  };
  const onSnap = (m) => {
    if (m.sameTab || !N.game || m.by !== N.game.host || N.isHost() || !N.gid) return;
    if (!RT.syncing) { RT.syncing = true; RT.buf = []; N.hud(); } // eşit olan oyuncu da aynı görüntüye geçer
    loadLive((m.data && m.data.at) || 0);
  };
  const loadLive = async (at) => {
    if (RT.loadingLive) return; RT.loadingLive = true;
    try {
      const [m, c] = livePath();
      let r = null;
      // duyurulan görüntü (ya da daha yenisi) okunana dek kısa aralıklarla dene
      for (let k = 0; k < 6; k++) { r = await G.blobRead(await D(), m, c).catch(() => null); if (r && (r.meta.at || 0) >= at) break; await new Promise((res) => setTimeout(res, 500)); }
      if (!r || (r.meta.at || 0) < at) { RT.needAt = 0; setTimeout(() => RT.syncing && requestSync('görüntü yok'), 1500); return; }
      enterRt(r.str, r.meta.fn);
      const seen = new Set(), fr = RT.recent.concat(RT.buf).filter((f) => f.n > r.meta.fn && !seen.has(f.n) && seen.add(f.n)).sort((a, b) => a.n - b.n); RT.buf = [];
      for (const f of fr) applyFrame(f);
    } finally { RT.loadingLive = false; }
  };
  // anlık görüntüyü yükle ve gerçek zamanlı oyuna gir
  const enterRt = (str, fn) => {
    const first = !N.active || !$('start').hidden;
    G.deserialize(str);
    const st = G.st, tag = N.myTag();
    st.player = tag || st.player;
    RT.lastN = fn; RT.maxDay = st.day; RT.syncing = false; RT.applied = {}; RT.seen = {}; RT.hashes = {};
    for (const e of st.mpq || []) RT.seen[e.k] = 1;
    RT.idc = Math.max(RT.idc, (st.mpIds && st.mpIds[N.mySlot() || 0]) || 0);
    if (!N.isHost()) st.paused = 1;
    N.active = true; N.phase = 'rt'; N.turn = 0; syncMask();
    R.mapDirty = 1; G.mapDirty = 1;
    if (first) UI.enterGame(); else { UI.hud(); if (UI.panel) UI.render(); UI.renderSel && UI.renderSel(); }
    for (const k of Object.keys(RT.pend)) transmit(k); // yanıtı gelmemiş emirler
    pres({ g: N.gid, slot: N.mySlot(), day: st.day });
    N.hud();
  };
  // gerçek zamanlı oyuna katıl / yeniden bağlan
  N.rtWatch = async (prevHost) => {
    const gm = N.game;
    if (N.isHost()) {
      if (!N.active && !RT.loadingLive) {
        // kurucu: önce canlı görüntü, yoksa başlangıç görüntüsü
        RT.loadingLive = true;
        try {
          const [m, c] = livePath();
          let r = await G.blobRead(await D(), m, c).catch(() => null);
          if (!r) r = await G.blobRead(await D(), `games/${N.gid}/snap/m`, `games/${N.gid}/snap/c`).catch(() => null);
          if (!r) { UI.toast('Oyun görüntüsü bulunamadı.', 'bad'); return; }
          RT.n = Math.max(RT.n, r.meta.fn || 0);
          enterRt(r.str, RT.n);
          G.st.paused = 1;
          // daha ilerideki bir oyuncu çevrimiçiyse kuruculuk ona geçer, biz ondan eşitleniriz
          setTimeout(handBack, 3000);
        } finally { RT.loadingLive = false; }
      } else if (prevHost && prevHost !== N.me) {
        // kuruculuğu devraldık: emir kaydını sürdür
        RT.n = Math.max(RT.n, RT.lastN); RT.seen = Object.assign({}, RT.applied); for (const e of G.st.mpq || []) RT.seen[e.k] = 1;
        RT.syncing = false; RT.buf = [];
        G.st.paused = 0; UI.toast('Kurucu ayrıldı; oyunu artık sen yönetiyorsun.', 'warn'); N.hud();
      }
      return;
    }
    if (!N.active || (prevHost && prevHost !== gm.host)) { RT.lastN = -1; requestSync(N.active ? 'kurucu değişti' : 'katılım'); }
  };
  // dönen kurucu: kendisinden ileride bir oyuncu varsa kuruculuğu ona bırakır
  const handBack = async () => {
    if (!N.isHost() || !N.rtOn()) return;
    const on = onlineIds(); let best = null;
    for (const p of N.peers) if (p.by && on.has(p.by) && slotOf(p.by) != null && typeof p.presence.day === 'number' && p.presence.day > G.st.day && (!best || p.presence.day > best.presence.day)) best = p;
    if (best) { await (await D()).doc('games/' + N.gid).update({ host: best.by }); UI.toast('Diğer oyuncular ilerideydi; oyunu onlardan eşitliyorsun.', 'info'); }
  };
  // kurucu çevrimdışıysa: en ileri günde (eşitlikte en küçük yuvada) olan çevrimiçi oyuncu devralır
  const takeover = async () => {
    const gm = N.game; if (!gm || gm.status !== 'play' || N.isHost() || !N.active || !room) return;
    if (Date.now() - RT.joinedAt < 8000) return;
    const on = onlineIds(); if (on.has(gm.host)) { RT.hostSeen = Date.now(); return; }
    if (Date.now() - Math.max(RT.hostSeen, RT.joinedAt) < 10000) return;
    const rt = N.rtOn(), myDay = G.st ? G.st.day : 0, mySlot = N.mySlot();
    if (mySlot == null || !N.myTag()) return;
    for (const p of N.peers) {
      if (!p.by || !on.has(p.by) || slotOf(p.by) == null) continue;
      const d = typeof p.presence.day === 'number' ? p.presence.day : -1, s = slotOf(p.by);
      if (rt ? d > myDay || (d === myDay && s < mySlot) : s < mySlot) return; // daha uygun biri var
    }
    RT.hostSeen = Date.now();
    await (await D()).doc('games/' + N.gid).update({ host: N.me });
  };
  // düzenli işler: çerçeve yayını, emir yeniden gönderimi, presence, kurucu devri
  const pump = () => {
    if (!N.gid) return;
    syncMask();
    if (RT.syncing && Date.now() - RT.needAt > 6000) requestSync('yanıt yok');
    if (N.rtOn()) {
      if (N.isHost()) { emitFrames(false); evDeadlines(); }
      for (const it of myEvs()) if (!N.evToast[it.seq]) { N.evToast[it.seq] = 1; UI.toast(`Karar bekliyor: ${it.title} (Masa)`, 'warn'); }
      else for (const [k, p] of Object.entries(RT.pend)) if (Date.now() - p.t > 3000) transmit(k);
      pres({ g: N.gid, slot: N.mySlot(), day: G.st.day, hd: presHd(), hh: RT.hashes[presHd()], away: document.hidden ? 1 : null });
      if (!N.isHost()) checkHash();
    } else pres({ g: N.gid, slot: N.mySlot(), day: G.st && N.active ? G.st.day : null });
    takeover();
    N.hud();
  };
  const presHd = () => { const ks = Object.keys(RT.hashes).map(Number); return ks.length ? Math.max(...ks) : null; };
  // kurucunun karmaşası bizimkiyle aynı gün için farklıysa eşitle
  const checkHash = () => {
    if (RT.syncing || !N.game) return;
    const h = N.peers.find((p) => p.by === N.game.host && !p.isMe);
    const hp = h && h.presence; if (!hp || hp.hd == null || !hp.hh) return;
    const mine = RT.hashes[hp.hd];
    if (mine && mine !== hp.hh) { RT.hashes = {}; requestSync(`karmaşa farkı (gün ${hp.hd})`); }
  };
  document.addEventListener('visibilitychange', () => {
    if (!N.rtOn()) return;
    if (document.hidden && N.isHost()) writeLive(false);
    pump();
  });

  // ---------- arayüz: tur çubuğu ----------
  const masaBtn = () => { const n = N.pending() + unread(); return `<button class="btn sm" data-act="mpmasa">Masa${n ? ` <em class="mpbadge">${n}</em>` : ''}</button>`; };
  N.hud = () => {
    let bar = $('mpbar');
    document.body.classList.toggle('mp', !!N.active && !(N.rtOn() && N.isHost())); // gerçek zamanlıda saati kurucu yönetir
    if (!N.active || $('start').hidden === false) { if (bar) bar.hidden = true; return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'mpbar'; bar.className = 'mpbar'; document.getElementById('app').appendChild(bar); }
    const hs = humanSlots(), ready = hs.filter((s) => N.ords[s.slot]).length, on = onlineIds(), hostOff = N.game && room && Date.now() - RT.joinedAt > 6000 && !N.isHost() && !on.has(N.game.host);
    let h;
    if (N.rtOn()) {
      const st = G.st, pn = Object.keys(RT.pend).length;
      h = `<span class="mpt">Canlı</span><span class="mpr">${on.size + 1}/${Math.max(hs.length, on.size + 1)} çevrimiçi</span>`;
      if (!N.myTag()) h += '<span class="muted small">İzleyici</span>';
      if (RT.syncing) h += '<span class="muted small">Eşitleniyor…</span>';
      else if (!N.isHost() && RT.maxDay - st.day > 3) h += `<span class="muted small">Yetişiliyor: ${RT.maxDay - st.day} gün</span>`;
      if (pn) h += `<span class="muted small">${pn} emir yolda</span>`;
      if (N.isHost() && RT.waitFor) h += `<span class="muted small">Bekleniyor: ${esc(RT.waitFor)}</span>`;
      if (hostOff) h += '<span class="muted small">Kurucu çevrimdışı</span>';
      h += masaBtn();
      if (bar.dataset.h !== h) { bar.innerHTML = h; bar.dataset.h = h; }
      bar.hidden = false;
      return;
    }
    h = `<span class="mpt">Tur ${N.turn + 1} · ${(N.game && N.game.turnDays) || 7} gün</span><span class="mpr">${ready}/${hs.length} hazır</span>`;
    if (hostOff) h += '<span class="muted small">Kurucu çevrimdışı</span>';
    if (!N.myTag()) h += '<span class="muted small">İzleyici</span>';
    else if (N.phase === 'orders') h += `<button class="btn sm pri" data-act="mpend" ${N.sending ? 'disabled' : ''}>${N.sending ? 'Gönderiliyor…' : 'Turu bitir'}</button>`;
    else if (N.phase === 'wait') h += `<span class="muted small">Bekleniyor</span>${N.isHost() ? '<button class="btn sm" data-act="mpforce">Beklemeden devam</button>' : ''}`;
    else if (N.phase === 'resolve' || N.busy) h += '<span class="muted small">Tur işleniyor…</span>';
    h += masaBtn();
    if (bar.dataset.h !== h) { bar.innerHTML = h; bar.dataset.h = h; }
    bar.hidden = false;
  };

  // ---------- arayüz: başlangıç ekranı bölümü ve lobi ----------
  UI.mpSection = () => {
    if (N.availState === undefined) { N.availState = null; N.avail().then(async (v) => { N.roomOk = v && !!(await (roomP || (roomP = caps.capOf('room')))); N.availState = v; if (!$('start').hidden) UI.renderStart(); }); }
    if (!N.availState) return '';
    if (N.gid && N.game && N.game.status === 'lobby') return lobbyHtml();
    const recent = myJoined();
    return `<div class="sec"><h3 class="sec-h">Çok oyunculu<span>çevrimiçi</span></h3>
      <p class="muted small" style="margin:0 0 8px">Arkadaşlarınla aynı dünyada oyna: tur tabanlı (herkes emirlerini verip "Turu bitir"e basar) ya da gerçek zamanlı (zaman herkes için birlikte akar). Arkadaşların bu oyunu claude.ai hesaplarıyla açabilmeli (Paylaş menüsünden en az "katkıda bulunabilir" izni).</p>
      <div class="btns"><button class="btn pri" data-act="mpcreate">Oyun kur</button></div>
      <div class="row" style="gap:8px;margin-top:8px"><input id="mp-code" class="mpcode-in" maxlength="6" placeholder="Oyun kodu" autocapitalize="characters" autocomplete="off"><button class="btn" data-act="mpjoin">Katıl</button></div>
      ${recent.length ? `<div class="btns" style="margin-top:6px">${recent.map((c) => `<button class="btn sm" data-act="mpjoin" data-v="${c}">${c}</button>`).join('')}</div>` : ''}${N.openHtml()}</div>`;
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
      ${N.roomOk ? `<div class="seg" style="margin-top:6px">${opt('rt', 0, 'Tur tabanlı')}${opt('rt', 1, 'Gerçek zamanlı')}</div>` : ''}
      ${gm.rt ? '<p class="muted small" style="margin:6px 0 0">Zaman herkes için birlikte akar; hızı ve duraklatmayı kurucu yönetir. Emirler bir iki saniye içinde herkeste aynı anda devreye girer. Tur içi olaylarda ilk seçenek uygulanır.</p>' : `<div class="seg" style="margin-top:6px">${opt('turnDays', 3, 'Tur 3 gün')}${opt('turnDays', 7, 'Tur 7 gün')}${opt('turnDays', 14, 'Tur 14 gün')}</div>`}
      <div class="seg" style="margin-top:6px">${opt('pub', 1, 'Herkese açık')}${opt('pub', 0, 'Yalnız kodla')}</div>
      <div class="btns" style="margin-top:10px">${host ? `<button class="btn pri" data-act="mpstart" ${mine ? '' : 'disabled'}>Oyunu başlat</button>` : '<span class="muted small">Kurucunun başlatması bekleniyor…</span>'}<button class="btn" data-act="mpleave">Lobiden çık</button></div>
      <h3 class="sec-h" style="margin-top:10px">Sohbet</h3>${N.chatHtml()}</div>`;
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
  for (const k of ['pause', 'speed']) { const f = A[k]; A[k] = (d) => { if (N.active && !(N.rtOn() && N.isHost())) { UI.toast(N.rtOn() ? 'Gerçek zamanlı oyunda hızı ve duraklatmayı kurucu yönetir.' : 'Çok oyunculu oyunda zaman turlarla ilerler: "Turu bitir"e bas.', 'info'); return; } f(d); }; }
  // ---------- masa: oyuncular arası teklifler, olay kararları, sohbet ----------
  // Teklifler (st.offers) her iki kipte de duruma girer: gönderen ekler, alıcı kabul/ret eder (emirleri gibi herkese yayılır).
  const OFFER_N = { pact: 'saldırmazlık paktı', access: 'askerî geçiş izni', invite: 'ittifakına katılma daveti', joinfac: 'ittifakına katılma isteği', peace: 'beyaz barış', cta: 'savaşa çağrı' };
  const offerOk = (k, a, b) => {
    const st = G.st;
    switch (k) {
      case 'pact': return !G.atWar(a, b) && !st.pacts[G.pairKey(a, b)];
      case 'access': return !G.atWar(a, b) && !st.access[a + '>' + b];
      case 'invite': return !!st.C[a].fac && st.C[b].fac !== st.C[a].fac;
      case 'joinfac': return !!st.C[b].fac && st.C[a].fac !== st.C[b].fac;
      case 'peace': return G.atWar(a, b);
      case 'cta': return !G.ctaAllowed || G.ctaAllowed(a, b).ok;
    }
    return false;
  };
  const dip0 = A.dip;
  A.dip = (d) => {
    const st = G.st, mine = st.player;
    if (N.active && st.humans && OFFER_N[d.k]) {
      let to = d.v;
      if (d.k === 'joinfac') { const f = st.C[d.v] && st.factions[st.C[d.v].fac]; to = f && f.leader; }
      if (to && to !== mine && G.isHuman(to)) {
        if (!offerOk(d.k, mine, to)) { UI.toast('Bu teklif şu an geçerli değil.', 'warn'); return; }
        if ((st.offers || []).some((o) => o.from === mine && o.to === to && o.k === d.k)) { UI.toast('Bu teklif zaten gönderildi; yanıt bekleniyor.', 'info'); return; }
        (st.offers || (st.offers = [])).push({ id: st.nextId++, from: mine, to, k: d.k, day: st.day });
        G.log(`${G.cname(mine)}, ${G.cname(to)} oyuncusuna ${OFFER_N[d.k]} teklif etti.`, [mine, to], 'info');
        UI.toast(`${G.cname(to)} oyuncusuna ${OFFER_N[d.k]} teklif edildi; yanıtını bekle.`, 'info');
        UI.render(); return;
      }
    }
    dip0(d);
  };
  const applyOffer = (o) => {
    const st = G.st, a = o.from, b = o.to;
    if (!st.C[a] || !st.C[b] || !st.C[a].alive || !st.C[b].alive || !offerOk(o.k, a, b)) return false;
    switch (o.k) {
      case 'pact': st.pacts[G.pairKey(a, b)] = 'nap'; break;
      case 'access': st.access[a + '>' + b] = 1; G.relClear(); break;
      case 'invite': G.joinFaction(b, st.C[a].fac); break;
      case 'joinfac': G.joinFaction(a, st.C[b].fac); break;
      case 'peace': G.makePeace(a, b); break;
      case 'cta': for (const e of st.C[a].enemies) if (!G.atWar(b, e) && !G.sameFaction(b, e) && !st.pacts[G.pairKey(b, e)]) G.setWar(b, e); break;
    }
    G.log(`${G.cname(b)}, ${G.cname(a)} oyuncusunun ${OFFER_N[o.k]} teklifini kabul etti.`, [a, b], 'major');
    G.mapDirty = 1; R.dirty = 1;
    return true;
  };
  // teklife yanıt (oyunun durumunu değiştirir: gerçek zamanlıda yakalanıp herkese iletilir)
  A.offer = (d) => {
    const st = G.st, o = (st.offers || []).find((x) => x.id === +d.v); if (!o) return;
    const mine = st.player;
    if (d.k === 'cancel' && o.from === mine) { st.offers = st.offers.filter((x) => x !== o); UI.toast('Teklif geri alındı.', 'info'); }
    else if (o.to === mine && (d.k === 'acc' || d.k === 'rej')) {
      st.offers = st.offers.filter((x) => x !== o);
      if (d.k === 'acc') { if (applyOffer(o)) UI.toast('Teklif kabul edildi.', 'good'); else UI.toast('Teklif artık geçerli değil.', 'warn'); }
      else { G.log(`${G.cname(mine)}, ${G.cname(o.from)} oyuncusunun ${OFFER_N[o.k]} teklifini reddetti.`, [o.from, mine], 'info'); UI.toast('Teklif reddedildi.', 'info'); }
    }
    UI.render(); UI.hud();
  };

  // olay kararları (gerçek zamanlı): insan ülkesine gelen seçimli olay her cihazda aynı sırayla st.evq'ya yazılır,
  // seçenek işlevleri bellekte tutulur. Sahibi seçer → kurucu seçeneği uygular ve sonucu emir gibi yayar. 15 gün içinde
  // seçilmezse kurucu ilk seçeneği uygular.
  const EVFX = {};
  G.humanQ = (tag, pop) => {
    if (!N.rtOn() || G.simMask === undefined || !G.isHuman(tag) || !pop || !pop.opts || pop.opts.length < 2) return false;
    const st = G.st, seq = (st.evSeq = (st.evSeq || 0) + 1);
    (st.evq || (st.evq = [])).push({ seq, tag, title: String(pop.title || '').slice(0, 120), text: String(pop.text || '').slice(0, 600), opts: pop.opts.map((o) => String(o.n || '').slice(0, 80)), d: st.day + 15 });
    EVFX[seq] = pop.opts;
    return true;
  };
  const hostEvPick = (seq, i, tag) => {
    const st = G.st, it = (st.evq || []).find((x) => x.seq === seq);
    if (!it || it.tag !== tag || !N.isHost()) return;
    const pop = G.onPopup;
    // seçeneğin yan etkisi olarak açılan pencereler: ilk seçenek (kimsenin ekranında pencere açılmaz)
    G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); try { p.opts && p.opts[0] && p.opts[0].fx && p.opts[0].fx(); } catch (e) { console.error(e); } } };
    try {
      N.capture(() => {
        const s = G.st; s.evq = (s.evq || []).filter((x) => x.seq !== seq);
        const fx = EVFX[seq]; delete EVFX[seq];
        const opt = fx && fx[i];
        if (opt && opt.fx) { opt.fx(); G.log(`${G.cname(tag)} · ${it.title}: ${it.opts[i] || ''}`, [tag], 'info'); }
      }, tag);
    } finally { G.onPopup = pop; }
  };
  A.mpevpick = (d) => {
    const seq = +d.k, i = +d.v, tag = N.myTag();
    N.evSent[seq] = 1;
    if (N.isHost()) hostEvPick(seq, i, tag); else emit('evpick', { seq, i });
    UI.toast('Kararın iletildi.', 'info'); UI.render();
  };
  N.evSent = {};
  const onEvPick = (m) => {
    if (!N.isHost() || !N.rtOn() || m.sameTab || !m.data) return;
    const s = N.game.slots[m.by]; if (!s || !s.tag) return;
    hostEvPick(+m.data.seq, +m.data.i, s.tag);
  };
  // kurucu: süresi dolan kararlar ilk seçenekle
  const evDeadlines = () => {
    if (!N.isHost() || !N.rtOn() || RT.syncing) return;
    for (const it of (G.st.evq || []).slice()) if (it.d <= G.st.day) hostEvPick(it.seq, 0, it.tag);
  };

  // sohbet: games/<kod>/chat (son 40 ileti)
  N.chat = []; N.chatRead = 0;
  const watchChat = (db, gid) => db.collection(`games/${gid}/chat`).orderBy('at', 'desc').limit(40).onSnapshot((q) => {
    const L = q.docs.map((d) => d.data()).filter((x) => x && typeof x.t === 'string').reverse();
    const fresh = L.filter((x) => x.at > (N.chat.length ? N.chat[N.chat.length - 1].at : 0) && x.by !== N.me);
    N.chat = L;
    if (UI.panel === 'mp') { N.chatRead = Date.now(); UI.render(); }
    else if (fresh.length && N.chat.length && N.active) UI.toast(`${N.names[fresh[fresh.length - 1].by] || 'Oyuncu'}: ${fresh[fresh.length - 1].t.slice(0, 60)}`, 'info');
    refresh();
  });
  A.mpsay = async () => {
    const el = $('mp-say'); const t = el ? el.value.trim().slice(0, 200) : '';
    if (!t || !N.gid) return;
    el.value = '';
    try { await (await D()).doc(`games/${N.gid}/chat/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`).set({ by: N.me, t, at: Date.now() }); }
    catch (e) { UI.toast('İleti gönderilemedi.', 'bad'); }
  };
  const unread = () => N.chat.filter((x) => x.by !== N.me && x.at > N.chatRead).length;
  const myEvs = () => (G.st && G.st.evq ? G.st.evq.filter((x) => x.tag === N.myTag() && !N.evSent[x.seq]) : []);
  const myOffers = () => (G.st && G.st.offers ? G.st.offers.filter((o) => o.to === N.myTag()) : []);
  N.pending = () => (N.active ? myEvs().length + myOffers().length : 0);
  const chatHtml = () => `<div class="mpchat">${N.chat.length ? N.chat.map((x) => `<div class="mpmsg ${x.by === N.me ? 'me' : ''}"><b>${esc(N.names[x.by] || 'Oyuncu')}</b> ${esc(x.t)}</div>`).join('') : '<p class="muted small" style="margin:0">Henüz ileti yok.</p>'}</div>
    <div class="row" style="gap:8px;margin-top:8px"><input id="mp-say" class="mpsay" maxlength="200" placeholder="İleti yaz…" autocomplete="off" enterkeyhint="send"><button class="btn" data-act="mpsay">Gönder</button></div>`;
  N.chatHtml = chatHtml;

  // masa paneli
  UI.PANELS.mp = () => {
    const st = G.st, mine = N.myTag(), L = UI.L;
    N.chatRead = Date.now();
    let html = '';
    const evs = myEvs();
    if (evs.length) html += L.sec('Bekleyen kararlar', evs.map((it) => `<div class="sec-card"><div class="t"><b>${esc(it.title)}</b> <span class="muted small">· ${Math.max(0, it.d - st.day)} gün içinde</span></div><p class="small" style="margin:4px 0 8px">${esc(it.text)}</p><div class="btns">${it.opts.map((n, i) => `<button class="btn ${i ? '' : 'pri'}" data-act="mpevpick" data-k="${it.seq}" data-v="${i}">${esc(n)}</button>`).join('')}</div></div>`).join(''), String(evs.length));
    const inc = myOffers(), out = (st.offers || []).filter((o) => o.from === mine);
    if (inc.length || out.length) html += L.sec('Diplomasi teklifleri', `<div class="list">${inc.map((o) => `<div class="item"><span>${G.flag(o.from, 30, 20)}</span><div class="grow"><div class="t">${esc(G.cname(o.from))}</div><div class="d">${esc(OFFER_N[o.k])} öneriyor</div></div><button class="btn sm pri" data-act="offer" data-k="acc" data-v="${o.id}">Kabul</button><button class="btn sm" data-act="offer" data-k="rej" data-v="${o.id}">Ret</button></div>`).join('')}${out.map((o) => `<div class="item"><span>${G.flag(o.to, 30, 20)}</span><div class="grow"><div class="t">${esc(G.cname(o.to))}</div><div class="d">${esc(OFFER_N[o.k])} · yanıt bekleniyor</div></div><button class="btn sm" data-act="offer" data-k="cancel" data-v="${o.id}">Geri al</button></div>`).join('')}</div>`);
    const on = onlineIds();
    const pl = Object.entries((N.game && N.game.slots) || {}).filter(([, s]) => s.tag).sort((a, b) => a[1].slot - b[1].slot).map(([id, s]) => {
      const c = st.C[s.tag], live = id === N.me || on.has(id);
      return `<div class="item"><span>${G.flag(s.tag, 30, 20)}</span><div class="grow"><div class="t">${esc(N.names[id] || 'Oyuncu')}${id === N.game.host ? ' <span class="pill">Kurucu</span>' : ''}${id === N.me ? ' <span class="muted small">(sen)</span>' : ''}</div><div class="d">${esc(G.cname(s.tag))}${c && !c.alive ? ' · teslim oldu' : ''}${s.tag !== mine && c && c.alive && G.atWar(mine, s.tag) ? ' · <span class="warn">savaşta</span>' : ''}</div></div><span class="mpdot ${live ? 'on' : ''}" title="${live ? 'çevrimiçi' : 'çevrimdışı'}"></span></div>`;
    }).join('');
    html += L.sec('Oyuncular', `<div class="list">${pl}</div><p class="muted small" style="margin:6px 0 0">Başka bir oyuncuya pakt, ittifak, geçiş izni, barış ya da savaşa çağrı teklifi Diplomasi panelinden gönderilir; o kabul edince gerçekleşir.</p>`);
    html += L.sec('Sohbet', chatHtml());
    return { title: 'Masa', html };
  };
  A.mpmasa = () => { UI.panel = 'mp'; UI.sub = null; $('card').hidden = true; UI.render(true); };
  // üst çubuk uyarısı: bekleyen karar ve teklifler
  const alerts0 = UI.alertsOf;
  UI.alertsOf = (c) => { const al = alerts0(c); const n = N.pending(); if (n) al.unshift(['mp', '', `${n} bekleyen karar ya da teklif`, 'peace', n]); return al; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.id === 'mp-say') { e.preventDefault(); A.mpsay(); } });

  // açık oyunlar (lobi): herkese açık, son 3 saatte kurulmuş
  N.open = { list: null, at: 0 };
  const loadOpen = async () => {
    if (N.open.loading || Date.now() - N.open.at < 20000) return;
    N.open.loading = 1;
    try {
      const q = await (await D()).collection('games').where('status', '==', 'lobby').limit(30).get();
      N.open.list = q.docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((x) => x.pub && x.created > Date.now() - 3 * 3600000 && !(x.slots && x.slots[N.me])).sort((a, b) => b.created - a.created).slice(0, 8);
      const ids = [...new Set(N.open.list.map((x) => x.host))].filter((i) => !N.names[i]);
      if (ids.length) { const u = await caps.user(); if (u && u.profiles) { const ps = await u.profiles(ids).catch(() => ({})); for (const i of ids) N.names[i] = (ps[i] && ps[i].name) || 'Oyuncu'; } }
    } catch (e) { N.open.list = N.open.list || []; } finally { N.open.at = Date.now(); N.open.loading = 0; if (!$('start').hidden) UI.renderStart(); }
  };
  N.openHtml = () => {
    loadOpen();
    const L = N.open.list;
    if (!L || !L.length) return '';
    return `<h3 class="sec-h" style="margin-top:10px">Açık oyunlar<span>${L.length}</span></h3><div class="list">${L.map((x) => `<button class="item" data-act="mpjoin" data-v="${esc(x.id)}"><div class="grow"><div class="t">${esc(N.names[x.host] || 'Oyuncu')} kurdu</div><div class="d">${Object.keys(x.slots || {}).length} oyuncu · ${x.rt ? 'gerçek zamanlı' : `tur ${x.turnDays || 7} gün`} · ${x.hist ? 'tarihî' : 'serbest'}</div></div><span class="btn sm pri">Katıl</span></button>`).join('')}</div>`;
  };
})(window);
