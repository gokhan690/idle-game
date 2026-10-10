// Arayüzsüz simülasyon testi: node tools/simtest.mjs [gün] [oyuncu]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Uint8Array, performance };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data/map.js', 'js/data/countries.js', 'js/data/content.js', 'js/data/leaders.js', 'js/data/focus.js', 'js/data/focus_ext.js', 'js/data/focus_more.js', 'js/data/focus_alt.js', 'js/data/rivers.js', 'js/data/decisions.js', 'js/game/core.js', 'js/game/rivers.js', 'js/game/tactics.js', 'js/game/state.js', 'js/game/sim.js', 'js/game/diplomacy.js', 'js/game/ai.js', 'js/game/army.js', 'js/game/politics.js', 'js/game/trade.js', 'js/game/navy.js', 'js/game/logistics.js', 'js/game/airwar.js', 'js/game/peace.js', 'js/game/design.js', 'js/game/airbase.js', 'js/game/occupation.js', 'js/game/decisions.js', 'js/game/events.js', 'js/game/events_ext.js', 'js/game/hist_ext.js', 'js/game/autonomy.js', 'js/game/projects.js', 'js/game/airborne.js', 'js/game/bop.js', 'js/game/fuel.js', 'js/game/volunteers.js', 'js/game/elections.js', 'js/game/ledger.js', 'js/game/civilwar.js'])
  vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G;
const days = +(process.argv[2] || 2200), player = process.argv[3] || 'NONE';
G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
G.onLog = (l) => { if (l.k === 'major') console.log(G.fmtDate(G.st.day), '|', l.m); };
let t0 = performance.now();
G.newGame(player, { hist: process.argv[4] === 'free' ? 0 : 1 });
console.log('setup ms', (performance.now() - t0).toFixed(0), 'units', G.st.units.length);
t0 = performance.now();
let slow = 0;
for (let d = 0; d < days; d++) {
  const a = performance.now();
  G.tick();
  const dt = performance.now() - a; if (dt > slow) slow = dt;
  if (d % 365 === 364) {
    const st = G.st;
    const majors = ['GER', 'SOV', 'ENG', 'FRA', 'ITA', 'JAP', 'USA', 'CHI', 'TUR', 'POL'];
    console.log('=== ', G.fmtDate(st.day), 'units', st.units.length, 'avg ms/day', ((performance.now() - t0) / (d + 1)).toFixed(2), 'max', slow.toFixed(1), 'tension', st.tension.toFixed(0));
    for (const t of majors) { const c = st.C[t]; if (!c.alive) { console.log(t, 'DEAD'); continue; } const n = st.units.filter((u) => u.t === t).length; console.log(t, 'provs', c.sum.provs, 'civ', c.sum.civ, 'mil', c.sum.mil, 'div', n, 'mp', Math.round(c.mpAvail), 'pp', Math.round(c.pp), 'techs', Object.keys(c.tech).length, 'war', c.enemies.join(','), 'fig', Math.round(c.stock.fig), 'inf', Math.round(c.stock.inf), 'sur', (c.surrender || 0).toFixed(2)); }
  }
}
