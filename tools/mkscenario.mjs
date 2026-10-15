// Başlangıç senaryolarını üretir: dünyayı tarihî kipte (herkes yapay zekâ) belirtilen tarihe dek oynatır,
// durumu gzip + base64 olarak js/data/scenarios.js içine gömer. Oyun bu görüntüyü yükleyip seçilen ülkeyi oyuncuya verir.
//   node tools/mkscenario.mjs [tohum]
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') + '/';
const SEED = +(process.argv[2] || 11);
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, performance };
ctx.window = ctx; vm.createContext(ctx);
const html = readFileSync(ROOT + 'index.html', 'utf8');
for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1]).filter((f) => !f.includes('scenarios'))) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
const G = ctx.G;
G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
const LIST = [
  { k: '1939', date: '1939-08-28', n: 'Savaşın Eşiği', d: 'Ağustos 1939: Avusturya ve Çekoslovakya Almanya\'nın, Molotov-Ribbentrop Paktı imzalandı, Polonya krizi doruğunda.' },
  { k: '1941', date: '1941-06-14', n: 'Barbarossa Arifesi', d: 'Haziran 1941: Fransa düştü, Britanya tek başına direniyor, Almanya ile Sovyetler sınırda karşı karşıya.' },
];
G.newGame('NONE', { hist: 1, seed: SEED });
const out = {};
for (const sc of LIST) {
  const end = G.dayOf(sc.date);
  const t0 = Date.now();
  while (G.st.day < end) G.tick();
  const st = G.st;
  st.log = (st.log || []).slice(-40);
  const str = G.serialize();
  const z = gzipSync(Buffer.from(str, 'utf8'), { level: 9 }).toString('base64');
  // başlangıç ekranı için ülke özetleri (yaşayanlar)
  const sum = {};
  for (const c of Object.values(st.C)) if (c.alive && c.sum && c.sum.provs) sum[c.tag] = { civ: c.sum.civ || 0, mil: c.sum.mil || 0, div: st.units.filter((u) => u.t === c.tag).length, l: c.leader, id: c.ideo, w: c.enemies.length };
  out[sc.k] = { n: sc.n, d: sc.d, day: st.day, z };
  out[sc.k].sum = sum;
  const alive = (t) => (st.C[t] && st.C[t].alive ? '+' : '-');
  console.log(`${sc.k}: ${G.fmtDate(st.day)} · ${Math.round(str.length / 1024)} KB → ${Math.round(z.length / 1024)} KB · ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
  console.log(`   AUS${alive('AUS')} CZE${alive('CZE')} POL${alive('POL')} FRA${alive('FRA')} SPR${alive('SPR')} ALB${alive('ALB')} · GER-SOV savaş ${G.atWar('GER', 'SOV')} · GER-ENG savaş ${G.atWar('GER', 'ENG')} · pakt ${!!st.pacts[G.pairKey('GER', 'SOV')]} · JAP-CHI ${G.atWar('JAP', 'CHI')} · ülke ${Object.keys(sum).length}`);
}
const js = `// Otomatik üretildi: tools/mkscenario.mjs (tohum ${SEED}). Elle düzenleme.\n// Başlangıç senaryoları: tarihî kipte belirtilen tarihe dek oynatılmış dünya (gzip + base64) ve ülke özetleri.\nwindow.SCENARIOS = ${JSON.stringify(out)};\n`;
writeFileSync(ROOT + 'js/data/scenarios.js', js);
console.log('yazıldı js/data/scenarios.js', Math.round(js.length / 1024), 'KB');
