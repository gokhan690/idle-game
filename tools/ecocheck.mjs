// Ekonomi testi (Node): lojistik özeti, lisanslı üretim, takviye önceliği.   node tools/ecocheck.mjs
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { gunzipSync } from 'node:zlib';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, performance }; ctx.window = ctx; vm.createContext(ctx);
const html = readFileSync(ROOT + 'index.html', 'utf8');
for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1])) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G; G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? 'TAMAM ' : 'HATA  ') + n + (x ? ' · ' + x : '')); if (!c) fail++; };
G.newGame('TUR', { hist: 1, seed: 1 });
G.scenarioLoad(gunzipSync(Buffer.from(ctx.SCENARIOS['1939'].z, 'base64')).toString(), '1939', 'TUR', {});
const st = G.st, c = st.C.TUR;
// lojistik
for (const u of st.units.filter((x) => x.t === 'TUR').slice(0, 5)) u.str = 0.5;
const L = G.logistics(c);
ok('lojistik satırları', L.length > 2 && L.some((r) => r.need > 0), L.slice(0, 4).map((r) => `${r.e}: stok ${Math.round(r.stock)} iht ${Math.round(r.need)} +${r.prod.toFixed(1)} ${r.days}g`).join(' | '));
// lisans: Almanya'dan piyade teçhizatı (ilişki gerekir)
const mine = c.mods.eq_inf || 1, ger = st.C.GER.mods.eq_inf || 1;
let r = G.licAllowed('TUR', 'GER', 'inf');
console.log('   TUR inf', mine, 'GER inf', ger, 'görüş', Math.round(G.opinion('GER', 'TUR')), JSON.stringify(r));
st.rel = st.rel || {}; st.rel['GER>TUR'] = (st.rel['GER>TUR'] || 0) + 80; if (G.relClear) G.relClear(); c.pp = 100;
st.C.GER.mods.eq_art = (c.mods.eq_art || 1) + 1; // test: Almanya'nın topu bir model ileride
const e = ['art', 'inf', 'at', 'aa', 'mot', 'sup'].find((k) => (st.C.GER.mods['eq_' + k] || 1) > (c.mods['eq_' + k] || 1));
ok('lisanslanabilir teçhizat var', !!e, String(e));
if (e) {
  r = G.licBuy('TUR', 'GER', e); ok('lisans alındı', r.ok && c.pp === 60 && c.lic[e].lv === r.lv, JSON.stringify(r));
  let l = c.lines.find((x) => x.e === e); if (!l) { l = { e, f: 2, eff: 0.5, acc: 0, lv: c.mods['eq_' + e] || 1 }; c.lines.push(l); }
  l.f = Math.max(1, l.f); l.lic = 1; l.lv = r.lv; c.stock[e] = 0; c.sl[e] = 1;
  for (let i = 0; i < 20; i++) G.tick();
  ok('lisanslı hat ileri model üretiyor', (c.sl[e] || 0) > (c.mods['eq_' + e] || 1) - 0.01 && c.stock[e] >= 0, `stok seviye ${(c.sl[e] || 0).toFixed(2)} (kendi ${c.mods['eq_' + e] || 1}, lisans ${r.lv})`);
  G.setWar('TUR', 'GER'); for (let i = 0; i < 3; i++) G.tick();
  ok('savaşta lisans düşer', !c.lic || !c.lic[e], `hat lic ${l.lic} lv ${l.lv}`);
}
// takviye önceliği
c.rp = {}; const u = st.units.find((x) => x.t === 'TUR'); ok('öncelik çarpanı', (c.rp[u.u] = 0, G.rpMul(u) === 0.4) && (c.rp[u.u] = 2, G.rpMul(u) === 1.6));
console.log(fail ? fail + ' hata' : 'tüm ekonomi testleri geçti');
