// Parmak izi (Node): 1941 senaryosu, Almanya oyuncu, sabit tohum, ordular cepheyi tutar; N gün sonra durum karması.
// Simülasyon davranışı değişti mi diye regresyon denetimi.   node tools/fpcheck.mjs [gün]
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { gunzipSync } from 'node:zlib'; import { createHash } from 'node:crypto';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, performance }; ctx.window = ctx; vm.createContext(ctx);
const html = readFileSync(ROOT + 'index.html', 'utf8');
for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1])) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G; G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
G.newGame('TUR', { hist: 1, seed: 1 });
G.scenarioLoad(gunzipSync(Buffer.from(ctx.SCENARIOS['1941'].z, 'base64')).toString(), '1941', 'GER', {});
G.st.seed = 777; const c = G.st.C.GER;
for (const a of c.armies) a.ord = 'def'; c._frontsDirty = 1;
const N = +(process.argv[2] || 25), t0 = performance.now();
for (let d = 0; d < N; d++) G.tick();
console.log(createHash('md5').update(G.serialize()).digest('hex').slice(0, 10), 'ms/gün', ((performance.now() - t0) / N).toFixed(1));
