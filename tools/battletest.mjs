import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Uint8Array, performance };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data/map.js', 'js/data/countries.js', 'js/data/content.js', 'js/data/leaders.js', 'js/data/focus.js', 'js/game/core.js', 'js/game/state.js', 'js/game/sim.js', 'js/game/diplomacy.js', 'js/game/ai.js', 'js/game/army.js', 'js/game/politics.js', 'js/game/trade.js', 'js/game/navy.js', 'js/game/turn.js', 'js/game/events.js'])
  vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G;
function run(att, def, opts = {}) {
  G.newGame('NONE');
  const st = G.st;
  // Almanya-Fransa sınırında iki eyalet bul
  let A = -1, B = -1;
  for (let i = 0; i < G.NP && A < 0; i++) if (st.prov[i].o === 'GER') for (const j of G.P[i].a) if (st.prov[j].o === 'FRA' && G.P[j].te === (opts.te ?? 0)) { A = i; B = j; break; }
  if (A < 0) for (let i = 0; i < G.NP && A < 0; i++) if (st.prov[i].o === 'GER') for (const j of G.P[i].a) if (st.prov[j].o === 'FRA') { A = i; B = j; break; }
  st.units = [];
  st.prov[B].fort = opts.fort || 0;
  for (const [t, n] of Object.entries(att)) for (let k = 0; k < n; k++) st.units.push(G.makeUnit('GER', t, A, 1));
  for (const [t, n] of Object.entries(def)) for (let k = 0; k < n; k++) { const u = G.makeUnit('FRA', t, B, 1); u.ent = opts.ent ?? 1; st.units.push(u); }
  G.setWar('GER', 'FRA');
  for (const u of st.units) if (u.t === 'GER') u.path = [B];
  let d = 0;
  for (; d < 60; d++) {
    G._moveAndFight();
    const defs = st.units.filter((u) => u.t === 'FRA' && u.loc === B).length;
    const atts = st.units.filter((u) => u.t === 'GER' && u.path.length).length;
    if (!defs || !atts) break;
  }
  const g = st.units.filter((u) => u.t === 'GER'), f = st.units.filter((u) => u.t === 'FRA');
  const winner = f.some((u) => u.loc === B) ? 'SAVUNMA' : 'SALDIRI';
  console.log(JSON.stringify(att), 'vs', JSON.stringify(def), JSON.stringify(opts), '=>', winner, 'gün', d + 1, 'GER str', g.map((u) => u.str.toFixed(2)).join(','), '| FRA', f.length, f.map((u) => u.str.toFixed(2)).join(','), 'terrain', G.TERRAIN?.[G.P[B].te]?.id || G.P[B].te);
}
run({ inf: 3 }, { inf: 3 });
run({ inf: 6 }, { inf: 3 });
run({ inf: 4 }, { inf: 2 });
run({ arm: 2, inf: 2 }, { inf: 3 });
run({ inf: 6 }, { inf: 3 }, { fort: 3 });
run({ arm: 3, inf: 3 }, { inf: 3 }, { fort: 3 });
run({ inf: 6 }, { inf: 2 }, { te: 3 });
run({ inf: 8 }, { inf: 4 }, { ent: 0 });
