// Diplomasi testi (Node): savaş hedefi türleri, konferans çarpanı, sürekli eylemler, görüş dökümü.   node tools/dipcheck.mjs
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
// görüş dökümü toplamı = G.opinion (birçok çift)
let bad = 0, n = 0; const tags = Object.keys(st.C).filter((t) => st.C[t].alive).slice(0, 30);
for (const a of tags) for (const b of tags) if (a !== b) { n++; const s = G.opinionParts(a, b).reduce((x, y) => x + y[1], 0); if (Math.abs(s - G.opinion(a, b)) > 0.06) bad++; }
ok('görüş dökümü toplamı G.opinion ile aynı', bad === 0, `${n} çift, fark ${bad}`);
// savaş hedefi: sınır toprağı daha ucuz ve hızlı
c.pp = 200; c.just = null; const full = G.justifyCost(c), t = 'YUG';
let r = G.startJustifyK('GER', t, 'border');
ok('sınır gerekçesi', r.ok && c.pp === 200 - Math.round(full * 0.6) && c.just.d === Math.round(G.justifyDays(c) * 0.7) && G.goalKind('GER', t) === 'border', `SG ${c.pp}, gün ${c.just && c.just.d}`);
for (let i = 0; i < 40 && c.just; i++) G.tick();
ok('gerekçe tamamlandı', st.goals['GER>' + t] != null && G.canDeclare('GER', t));
// konferans çarpanı
const conf = { L: t };
ok('konferans çarpanı', G.goalMul(conf, 'GER', 'take') === 0.8 && G.goalMul(conf, 'GER', 'puppet') === 1.25 && G.goalMul(conf, 'ITA', 'take') === 1);
// sürekli eylemler
c.pp = 50; const rel0 = (st.rel && st.rel['HUN>GER']) || 0;
r = G.dipActToggle('GER', 'rel', 'HUN'); ok('ilişki eylemi başladı', r.ok && r.on);
const popF = st.C.SWE.pop.fas || 0; r = G.dipActToggle('GER', 'ideo', 'SWE'); ok('ideoloji eylemi başladı', r.ok && r.on, JSON.stringify(r));
const pp0 = c.pp, ppDay = c.ppDay || 0; for (let i = 0; i < 20; i++) G.tick();
ok('ilişki arttı', ((st.rel['HUN>GER'] || 0) - rel0) > 4.5, `+${((st.rel['HUN>GER'] || 0) - rel0).toFixed(1)}`);
ok('ideoloji desteği arttı', (st.C.SWE.pop.fas || 0) > popF + 0.008, `${popF.toFixed(3)} → ${(st.C.SWE.pop.fas || 0).toFixed(3)}`);
r = G.dipActToggle('GER', 'rel', 'HUN'); ok('eylem durdu', r.ok && !r.on && c.dipAct.length === 1);
console.log(fail ? fail + ' hata' : 'tüm diplomasi testleri geçti');
process.exit(fail ? 1 : 0);
