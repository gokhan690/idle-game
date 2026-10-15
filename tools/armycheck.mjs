// Ordu yönetimi testi (Node): savaş başında ordular yerinde kalır, cepheler orduya yakın, el emri korunur.
//   node tools/armycheck.mjs
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { gunzipSync } from 'node:zlib';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, performance }; ctx.window = ctx; vm.createContext(ctx);
const html = readFileSync(ROOT + 'index.html', 'utf8');
for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1])) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G; G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? 'TAMAM ' : 'HATA  ') + n + (x ? ' · ' + x : '')); if (!c) fail++; };
G.newGame('TUR', { hist: 1, seed: 1 });
G.scenarioLoad(gunzipSync(Buffer.from(ctx.SCENARIOS['1939'].z, 'base64')).toString(), '1939', 'GER', {});
const st = G.st, c = st.C.GER;
const pos0 = new Map(st.units.filter((u) => u.t === 'GER').map((u) => [u.id, u.loc]));
G.declareWar('GER', 'POL');
for (let i = 0; i < 8; i++) G.tick();
ok('savaş başladı', c.enemies.length > 0, c.enemies.join(','));
ok('ordular beklemede kaldı', (c.armies || []).every((a) => a.ord === 'hold'), (c.armies || []).map((a) => a.ord).join(','));
const moved = st.units.filter((u) => u.t === 'GER' && u.army && pos0.has(u.id) && pos0.get(u.id) !== u.loc).length;
ok('ordu tümenleri kendi başına yürümedi', moved === 0, `yer değiştiren ${moved}`);
// tüm ordular en yakın cepheyi tutsun
for (const a of c.armies) a.ord = 'def';
G.computeFronts(c);
let worst = 0, empty = 0;
for (const a of c.armies) {
  const us = G.armyUnits(c, a.id).filter((u) => u.loc < G.NP); if (!us.length) continue;
  if (!(a.front || []).length) { empty++; continue; }
  const near = Math.min(...a.front.map((n) => Math.min(...us.map((u) => G.km(u.loc, n)))));
  worst = Math.max(worst, near);
  console.log('   ', a.n, us.length, 'tümen · cephe', a.front.length, 'eyalet · en yakın', Math.round(near), 'km · ', G.cname(G.st.prov[a.front[0]].c === 'GER' ? (G.P[a.front[0]].a.map((j) => G.st.prov[j].c).find((t) => G.atWar('GER', t)) || '?') : '?'));
}
ok('cepheler orduya yakın', worst <= G.FRONT_KM + 50, `en uzak ${Math.round(worst)} km, cephesiz ${empty}`);
// el emri: bir ordu tümenini uzak bir dost eyalete gönder, 30 gün sonra orada olmalı
const a0 = c.armies.find((a) => G.armyUnits(c, a.id).length > 2);
const u = G.armyUnits(c, a0.id)[0];
const target = G.P.findIndex((p, i) => p.n === 'Münih' && st.prov[i].c === 'GER');
const p = G.findPath(u.loc, target, u.t, G.unitStats(u).spd, { naval: false });
u.path = p; u.prog = 0; u.man = 1;
for (let i = 0; i < 40; i++) G.tick();
ok('el emri korundu (Münih)', u.loc === target, `şimdi ${G.pname(u.loc)}, man ${u.man}`);
console.log(fail ? fail + ' hata' : 'tüm ordu testleri geçti');
