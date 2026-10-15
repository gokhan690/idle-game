// Senaryo ve meydan okuma testi (Node): 1939/1941 görüntülerini birkaç ülkeyle yükleyip 30 gün oynatır.
//   node tools/scencheck.mjs
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { gunzipSync } from 'node:zlib';
const ROOT = new URL('..', import.meta.url).pathname;
const mk = () => { const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, performance }; ctx.window = ctx; vm.createContext(ctx);
  const html = readFileSync(ROOT + 'index.html', 'utf8');
  for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1])) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
  const G = ctx.G; G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } }; return { G, W: ctx }; };
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? 'TAMAM ' : 'HATA  ') + n + (x ? ' · ' + x : '')); if (!c) fail++; };
for (const k of ['1939', '1941']) for (const tag of ['TUR', 'GER', 'POL', 'SOV']) {
  const { G, W } = mk(); G.newGame('TUR', { hist: 1, seed: 1 });
  const sc = W.SCENARIOS[k]; const str = gunzipSync(Buffer.from(sc.z, 'base64')).toString();
  if (!sc.sum[tag]) { ok(`${k} ${tag} listede yok (beklenen değilse)`, true); continue; }
  try {
    G.scenarioLoad(str, k, tag, { diff: 1 });
    const st = G.st, d0 = st.day;
    const chals = G.chalFor(tag, d0).map((x) => x.id);
    const r = chals.length ? G.chalStart(chals[0]) : { ok: false, why: 'yok' };
    for (let i = 0; i < 30; i++) G.tick();
    ok(`${k} ${tag}`, st.day === d0 + 30 && st.player === tag && st.C[tag].armies.length > 0, `${G.fmtDate(d0)} → ${G.fmtDate(st.day)}, ordu ${st.C[tag].armies.length}, meydan ${chals.join(',')} → ${chals[0]} ${r.ok ? 'kabul' : r.why}`);
  } catch (e) { ok(`${k} ${tag}`, false, e.message); }
}
// özel kontroller
{ const { G, W } = mk(); G.newGame('TUR', { hist: 1, seed: 1 });
  G.scenarioLoad(gunzipSync(Buffer.from(W.SCENARIOS['1939'].z, 'base64')).toString(), '1939', 'GER', {});
  ok('1939 ger_blitz kabul', G.chalStart('ger_blitz').ok);
  ok('1939 any_survive kabul', G.chalStart('any_survive').ok);
  // hızlı denetim: meydan okuma ilerlesin
  G.chalStart('any_survive'); let r = null; G.onChal = (x, v) => { r = v; };
  const c = G.st.C.GER; c.cap = G.P.findIndex((p) => p.n === 'Paris'); G.chalCheck();
  ok('başkent elde değilse kaybedilir', r === -1 && G.st.chal.s === -1);
}
{ const { G, W } = mk(); G.newGame('TUR', { hist: 1, seed: 1 });
  G.scenarioLoad(gunzipSync(Buffer.from(W.SCENARIOS['1941'].z, 'base64')).toString(), '1941', 'POL', {});
  const r = G.chalStart('pol_stand'); ok('1941 pol_stand reddedilir (tarih geçmiş)', !G.chalFor('POL', G.st.day).some((x) => x.id === 'pol_stand'), r.why || '');
  ok('1941 listede AUS yok', !W.SCENARIOS['1941'].sum.AUS);
}
console.log(fail ? fail + ' hata' : 'tüm senaryo testleri geçti');
