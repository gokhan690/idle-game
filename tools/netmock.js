// Test için sahte claude.use: db, user ve room yetenekleri tarayıcıda (aynı köken) localStorage ve BroadcastChannel ile taklit edilir.
// Playwright: page.addInitScript({ path: 'tools/netmock.js' }); kullanıcı kimliği sayfa adresindeki ?uid= ile seçilir.
(function () {
  const uid = new URLSearchParams(location.search).get('uid') || 'u1';
  const P = 'mockdb:';
  const bc = new BroadcastChannel('mockdb');
  const subs = new Set();
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const read = (path) => { const v = localStorage.getItem(P + path); return v ? JSON.parse(v) : undefined; };
  const notify = () => { for (const f of subs) try { f(); } catch (e) { console.error(e); } };
  // diğer sekmenin yazısı localStorage'a kanal iletisinden sonra yansıyabilir: storage olayı da dinlenir
  bc.onmessage = () => { notify(); setTimeout(notify, 80); };
  window.addEventListener('storage', (e) => { if (!e.key || e.key.startsWith(P)) notify(); });
  const write = (path, data) => { if (data === undefined) localStorage.removeItem(P + path); else localStorage.setItem(P + path, JSON.stringify(data)); bc.postMessage(path); setTimeout(notify, 0); };
  // update: iç içe nesneler özyinelemeli birleşir, diziler ve diğer değerler bütünüyle değişir (gerçek db gibi)
  const merge = (a, b) => { for (const k in b) { const v = b[k]; if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], v); else a[k] = v; } return a; };
  const snap = (path) => { const d = read(path); return { id: path.split('/').pop(), exists: d !== undefined, data: () => clone(d), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const listDocs = (col) => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(P + col + '/')) continue; const rest = k.slice(P.length + col.length + 1); if (rest.includes('/')) continue; out.push(snap(col + '/' + rest)); } return out; };
  const doc = (path) => ({
    id: path.split('/').pop(), path,
    get: async () => snap(path),
    set: async (d) => write(path, clone(d)),
    update: async (d) => { const cur = read(path); if (cur === undefined) throw { code: 'invalid_argument', message: 'yok' }; write(path, merge(cur, clone(d))); },
    delete: async () => write(path, undefined),
    onSnapshot: (next) => { let last = ''; const f = () => { const s = JSON.stringify(read(path) ?? null); if (s !== last) { last = s; next(snap(path)); } }; subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    acquire: async () => ({ acquired: true }),
    collection: (c) => col(path + '/' + c),
  });
  const col = (path, filters = [], ord = null, lim = 0) => {
    const run = () => { let d = listDocs(path); for (const [f, op, v] of filters) d = d.filter((x) => { const y = x.data()[f]; return op === '==' ? y === v : op === '>=' ? y >= v : op === '>' ? y > v : op === '<' ? y < v : op === '<=' ? y <= v : true; }); if (ord) d.sort((a, b) => (a.data()[ord[0]] > b.data()[ord[0]] ? 1 : -1) * (ord[1] === 'desc' ? -1 : 1)); if (lim) d = d.slice(0, lim); return { docs: d, size: d.length, empty: !d.length, docChanges: () => d.map((x, i) => ({ type: 'added', doc: x, oldIndex: -1, newIndex: i })) }; };
    return {
      where: (f, op, v) => col(path, filters.concat([[f, op, v]]), ord, lim),
      orderBy: (f, dir) => col(path, filters, [f, dir || 'asc'], lim),
      limit: (n) => col(path, filters, ord, n),
      get: async () => run(),
      onSnapshot: (next) => { let last = ''; const f = () => { const r = run(); const s = JSON.stringify(r.docs.map((x) => [x.id, x.data()])); if (s !== last) { last = s; next(r); } }; subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
      doc: (id) => doc(path + '/' + (id || Math.random().toString(36).slice(2))),
      add: async (d) => { const r = doc(path + '/' + Math.random().toString(36).slice(2)); await r.set(d); return r; },
    };
  };
  const db = { doc, collection: (p) => col(p) };
  const user = { id: async () => uid, me: async () => ({ id: uid, name: 'Oyuncu ' + uid, isMe: true }), isOwner: async () => uid === 'u1', canEdit: async () => true, can: async () => true, profiles: async (ids) => Object.fromEntries(ids.map((i) => [i, { id: i, name: 'Oyuncu ' + i }])) };
  // room: BroadcastChannel ile anlık mesaj ve presence (gerçek API biçimi: msg {topic, data, by, peer, isMe, sameTab}; onPeers {peers, joined, left, updated})
  const tab = Math.random().toString(36).slice(2, 10);
  const drop = +(new URLSearchParams(location.search).get('drop') || 0); // test: iletilerin bu oranı düşer
  const mkRoom = (name) => {
    const ch = new BroadcastChannel('mockroom:' + name), on = {}, peersF = new Set(), peers = {};
    let me = null, snap = Object.freeze([]);
    const seen = {};
    // yaşam sinyali: kapanan sekme (unload olayı gelmese de) 6 sn sonra odadan düşer
    setInterval(() => {
      if (me) ch.postMessage({ k: 'pr', pid: tab, by: uid, data: me });
      const gone = Object.keys(peers).filter((pid) => pid !== tab && Date.now() - (seen[pid] || 0) > 6000);
      if (gone.length) { const L = gone.map((pid) => peers[pid]); for (const pid of gone) delete peers[pid]; fire([], L); }
    }, 1500);
    const mkPeer = (pid, by, pr) => Object.freeze({ peer: pid, by, isMe: by === uid, sameTab: pid === tab, kind: 'viewer', guest: false, presence: pr, updatedAt: Date.now() });
    const fire = (joined, left) => { snap = Object.freeze(Object.values(peers)); const ch2 = { peers: snap, joined: joined || [], left: left || [], updated: [] }; peersF.forEach((f) => f(ch2)); };
    const deliver = (topic, data, pid, by) => (on[topic] || []).forEach((f) => f({ topic, data: clone(data), by, peer: pid, isMe: by === uid, sameTab: pid === tab, kind: 'viewer', guest: false }));
    ch.onmessage = (e) => {
      const m = e.data;
      if (m.k === 'ev') { if (drop && Math.random() < drop) return; deliver(m.topic, m.data, m.pid, m.by); }
      else if (m.k === 'pr') { if (m.data == null) { const p = peers[m.pid]; delete peers[m.pid]; delete seen[m.pid]; fire([], p ? [p] : []); } else { seen[m.pid] = Date.now(); const ch2 = JSON.stringify(m.data) !== JSON.stringify(peers[m.pid] && peers[m.pid].presence); if (!ch2) return; const nw = !peers[m.pid]; peers[m.pid] = mkPeer(m.pid, m.by, m.data); fire(nw ? [peers[m.pid]] : []); } }
      else if (m.k === 'hello' && me) ch.postMessage({ k: 'pr', pid: tab, by: uid, data: me });
    };
    const api = {
      emit: async (topic, data) => { if (JSON.stringify(data ?? null).length > 4096) throw { code: 'invalid_argument', message: '4 KiB' }; ch.postMessage({ k: 'ev', topic, data, pid: tab, by: uid }); setTimeout(() => deliver(topic, data, tab, uid), 0); },
      on: (topic, f) => { (on[topic] || (on[topic] = [])).push(f); return () => { on[topic] = on[topic].filter((x) => x !== f); }; },
      presence: async (p) => { me = Object.assign({}, me || {}, p); for (const k in me) if (me[k] === null) delete me[k]; peers[tab] = mkPeer(tab, uid, me); ch.postMessage({ k: 'pr', pid: tab, by: uid, data: me }); fire(); },
      peers: () => snap,
      onPeers: (f) => { peersF.add(f); setTimeout(() => f({ peers: snap, joined: snap, left: [], updated: [] }), 0); return () => peersF.delete(f); },
      leave: async () => { ch.postMessage({ k: 'pr', pid: tab, by: uid, data: null }); ch.close(); },
    };
    addEventListener('pagehide', () => { try { ch.postMessage({ k: 'pr', pid: tab, by: uid, data: null }); } catch (e) { /* */ } });
    ch.postMessage({ k: 'hello', pid: tab, by: uid });
    return api;
  };
  const room = Object.assign(mkRoom('lobby'), { join: async (n) => mkRoom(n) });
  window.claude = { use: async (name) => ({ db, user, room }[name] || null) };
})();
