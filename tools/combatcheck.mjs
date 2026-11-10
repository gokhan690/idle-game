// Muharebe ve komuta testi (Node): destek saldırısı, kurmay planı, son adama kadar.   node tools/combatcheck.mjs
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { gunzipSync } from 'node:zlib';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, performance }; ctx.window = ctx; vm.createContext(ctx);
const html = readFileSync(ROOT + 'index.html', 'utf8');
for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1])) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G; G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? 'TAMAM ' : 'HATA  ') + n + (x ? ' · ' + x : '')); if (!c) fail++; };
G.newGame('TUR', { hist: 1, seed: 1 });
G.scenarioLoad(gunzipSync(Buffer.from(ctx.SCENARIOS['1939'].z, 'base64')).toString(), '1939', 'GER', {});
const st = G.st, c = st.C.GER; G.declareWar('GER', 'POL'); G.tick();
// destek saldırısı: Polonya'ya komşu bir yığın, savunanı olan bir hedef
let done = false;
for (const u of st.units.filter((x) => x.t === 'GER' && x.loc < G.NP)) {
  const tgt = G.P[u.loc].a.find((j) => j < G.NP && st.prov[j].c === 'POL' && (G.unitsAt[j] || []).some((e) => e.t === 'POL'));
  if (tgt == null) continue;
  const stack = (G.unitsAt[u.loc] || []).filter((x) => x.t === 'GER'), home = u.loc;
  for (const x of stack) { x.path = [tgt]; x.prog = 0; x.sup = 1; x.man = 1; }
  let fought = false;
  for (let i = 0; i < 40; i++) { G.tick(); if ((G.battles || []).some((b) => b.n === tgt)) fought = true; }
  ok('destek saldırısı: muharebe oldu', fought);
  ok('destek saldırısı: tümenler yerinde kaldı', stack.filter((x) => !x.dead).every((x) => x.loc === home), `hedef sahibi ${st.prov[tgt].c}, yığın ${stack.length}`);
  // savunan kalmayınca: destekleyen tümen eyalete girmez
  st.units = st.units.filter((e) => !(e.loc === tgt && e.t !== 'GER')); G.rebuildUnitIndex();
  const live = stack.filter((x) => !x.dead); for (const x of live) { x.org = G.unitStats(x).org; x.path = [tgt]; x.prog = 0; x.sup = 1; }
  for (let i = 0; i < 12; i++) G.tick();
  ok('destek: boş eyalete ilerlemedi', live.every((x) => x.loc === home && !x.path.length && !x.sup), 'sahip ' + st.prov[tgt].c);
  done = true; break;
}
ok('destek hedefi bulundu', done);
// kurmay planı
const a = c.armies[0]; a.plan = 0; c.cp = 100;
let r = G.armyOrder(c, a.id, 'staff'); ok('kurmay planı', r.ok && a.plan >= G.maxPlan(c, a) - 0.01 && c.cp === 55, `plan ${a.plan.toFixed(2)} kg ${c.cp}`);
r = G.armyOrder(c, a.id, 'stand'); ok('son adama kadar', r.ok && G.lastStand(G.armyUnits(c, a.id)[0]), `kg ${c.cp}`);
const u0 = G.armyUnits(c, a.id)[0]; u0._sd = -1; const sp1 = G.unitStats(u0).df;
a.boost = null; u0._sd = -1; const sp0 = G.unitStats(u0).df;
ok('savunma çarpanı', sp1 > sp0 * 1.05, `${sp0.toFixed(1)} → ${sp1.toFixed(1)}`);
console.log(fail ? fail + ' hata' : 'tüm muharebe testleri geçti');
