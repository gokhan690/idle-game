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
  bc.onmessage = () => notify();
  const write = (path, data) => { if (data === undefined) localStorage.removeItem(P + path); else localStorage.setItem(P + path, JSON.stringify(data)); bc.postMessage(path); setTimeout(notify, 0); };
  const snap = (path) => { const d = read(path); return { id: path.split('/').pop(), exists: d !== undefined, data: () => clone(d), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const listDocs = (col) => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(P + col + '/')) continue; const rest = k.slice(P.length + col.length + 1); if (rest.includes('/')) continue; out.push(snap(col + '/' + rest)); } return out; };
  const doc = (path) => ({
    id: path.split('/').pop(), path,
    get: async () => snap(path),
    set: async (d) => write(path, clone(d)),
    update: async (d) => { const cur = read(path); if (cur === undefined) throw { code: 'invalid_argument', message: 'yok' }; write(path, Object.assign(cur, clone(d))); },
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
  // room: BroadcastChannel ile anlık mesaj ve presence
  const mkRoom = (name) => {
    const ch = new BroadcastChannel('mockroom:' + name), on = {}, peersF = new Set(), peers = {};
    let me = null;
    ch.onmessage = (e) => { const m = e.data; if (m.k === 'ev') (on[m.topic] || []).forEach((f) => f(m.data, { id: m.from })); else if (m.k === 'pr') { if (m.data == null) delete peers[m.from]; else peers[m.from] = m.data; peersF.forEach((f) => f(Object.entries(peers).map(([id, p]) => ({ id, presence: p, isMe: id === uid })))); } else if (m.k === 'hello' && me) ch.postMessage({ k: 'pr', from: uid, data: me }); };
    const api = {
      emit: async (topic, data) => { ch.postMessage({ k: 'ev', topic, data, from: uid }); },
      on: (topic, f) => { (on[topic] || (on[topic] = [])).push(f); return () => { on[topic] = on[topic].filter((x) => x !== f); }; },
      presence: async (p) => { me = Object.assign({}, me || {}, p); peers[uid] = me; ch.postMessage({ k: 'pr', from: uid, data: me }); peersF.forEach((f) => f(Object.entries(peers).map(([id, pp]) => ({ id, presence: pp, isMe: id === uid })))); },
      onPeers: (f) => { peersF.add(f); setTimeout(() => f(Object.entries(peers).map(([id, p]) => ({ id, presence: p, isMe: id === uid }))), 0); return () => peersF.delete(f); },
      leave: async () => { ch.postMessage({ k: 'pr', from: uid, data: null }); ch.close(); },
    };
    ch.postMessage({ k: 'hello', from: uid });
    return api;
  };
  const room = Object.assign(mkRoom('lobby'), { join: async (n) => mkRoom(n) });
  window.claude = { use: async (name) => ({ db, user, room }[name] || null) };
})();
