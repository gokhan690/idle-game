import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ROOT = new URL('..', import.meta.url).pathname;
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Uint8Array, performance };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data/map.js', 'js/data/countries.js', 'js/data/content.js', 'js/data/leaders.js', 'js/data/focus.js', 'js/data/focus_ext.js', 'js/data/focus_more.js', 'js/data/rivers.js', 'js/data/decisions.js', 'js/game/core.js', 'js/game/rivers.js', 'js/game/tactics.js', 'js/game/state.js', 'js/game/sim.js', 'js/game/diplomacy.js', 'js/game/ai.js', 'js/game/army.js', 'js/game/politics.js', 'js/game/trade.js', 'js/game/navy.js', 'js/game/logistics.js', 'js/game/airwar.js', 'js/game/peace.js', 'js/game/design.js', 'js/game/airbase.js', 'js/game/occupation.js', 'js/game/decisions.js', 'js/game/events.js', 'js/game/events_ext.js', 'js/game/hist_ext.js', 'js/game/autonomy.js', 'js/game/projects.js', 'js/game/airborne.js', 'js/game/bop.js', 'js/game/fuel.js', 'js/game/volunteers.js', 'js/game/elections.js', 'js/game/ledger.js', 'js/game/scenarios.js'])
  vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G;
function run(att, def, opts = {}) {
  G.newGame('NONE');
  const st = G.st;
  // Almanya-Fransa sınırında iki eyalet bul
  let A = -1, B = -1;
  for (let i = 0; i < G.NP && A < 0; i++) if (st.prov[i].o === 'GER') for (const j of G.P[i].a) if (st.prov[j].o === 'FRA' && G.P[j].te === (opts.te ?? 0) && (opts.lv == null || G.riverEdge(i, j) === opts.lv)) { A = i; B = j; break; }
  if (A < 0 && opts.lv != null) { console.log('uygun nehir kenarı yok', opts.lv); return; }
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
  console.log(JSON.stringify(att), 'vs', JSON.stringify(def), JSON.stringify(opts), '=>', winner, 'gün', d + 1, 'GER str', g.map((u) => u.str.toFixed(2)).join(','), '| FRA', f.length, f.map((u) => u.str.toFixed(2)).join(','), 'terrain', G.TERRAIN?.[G.P[B].te]?.id || G.P[B].te, 'nehir', G.riverEdge(A, B));
}
run({ inf: 3 }, { inf: 3 });
run({ inf: 6 }, { inf: 3 });
run({ inf: 4 }, { inf: 2 });
run({ arm: 2, inf: 2 }, { inf: 3 });
run({ inf: 6 }, { inf: 3 }, { fort: 3 });
run({ arm: 3, inf: 3 }, { inf: 3 }, { fort: 3 });
run({ inf: 6 }, { inf: 2 }, { te: 3 });
run({ inf: 8 }, { inf: 4 }, { ent: 0 });
run({ inf: 1 }, { inf: 1 });
run({ inf: 2 }, { inf: 1 });
run({ arm: 1 }, { inf: 1 });
run({ arm: 2 }, { inf: 1 });
run({ arm: 2, inf: 4 }, { inf: 3 }, { te: 1 });
// nehir geçişi: aynı güçler nehirsiz / küçük nehir / büyük nehir kenarında
for (const lv of [0, 1, 2]) run({ inf: 6 }, { inf: 3 }, { lv });
for (const lv of [0, 1, 2]) run({ inf: 4 }, { inf: 4 }, { lv });
