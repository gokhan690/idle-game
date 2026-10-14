// Çok oyunculu çekirdek testi (Node): yükleme saflığı, durum farkı/yama doğruluğu ve çok insanlı oyun.
//   node tools/mpcheck.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') + '/';
const mk = () => {
  const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, performance };
  ctx.window = ctx; vm.createContext(ctx);
  const html = readFileSync(ROOT + 'index.html', 'utf8');
  for (const f of [...html.matchAll(/<script src="(js\/(data|game)\/[^"]+)"><\/script>/g)].map((m) => m[1]).concat(['js/net/sync.js'])) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, { filename: f });
  const G = ctx.G; G.W = ctx; G.onPopup = () => { while (G.popupQueue.length) { const p = G.popupQueue.shift(); p.opts[0].fx(); } };
  return G;
};
const hash = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
const SKIP = ['day', 'seed', 'player', 'log', 'led', 's0', 'humans', 'over', 'nextId'];
const strip = (s) => { const o = JSON.parse(s); for (const k of SKIP) delete o[k]; return JSON.stringify(o); };
let fail = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'TAMAM ' : 'HATA  ') + name + (extra ? ' · ' + extra : '')); if (!ok) fail++; };

// 1) yükleme saflığı: uzun oynanmış örnek ile taze örnek aynı kayıttan aynı devamı üretir
{
  const A = mk(); A.newGame('NONE', { hist: 1, seed: 5 });
  while (A.st.day < A.dayOf('1939-09-10')) A.tick();
  const S = A.serialize();
  A.deserialize(S);
  const B = mk(); B.newGame('NONE', { hist: 1, seed: 5 }); B.deserialize(S);
  for (let k = 0; k < 30; k++) { A.tick(); B.tick(); }
  check('yükleme saf (savaşta 30 gün)', hash(A.serialize()) === hash(B.serialize()));
}

// 2) fark ve yama: istemci eylemleri kurucunun durumuna taşınır
{
  const A = mk(); A.newGame('GER', { hist: 1, seed: 3 });
  for (let i = 0; i < 30; i++) A.tick();
  const S0 = A.serialize(), o0 = JSON.parse(S0);
  const st = A.st, c = st.C.GER;
  // tipik oyuncu eylemleri
  const techs = (A.W.TECHS || []).filter((t) => A.techAvailable(c, t.id)).map((t) => t.id);
  if (techs[0]) c.res.push({ id: techs[0], p: 0 });
  const foc = A.focusList(c).find((f) => A.focusAvailable(c, f)); if (foc) { c.focus.cur = foc.id; c.focus.p = 0; }
  c.lines.push({ e: 'inf', f: 2, eff: 0.3, acc: 0, lv: 1 });
  c.constr.push({ b: 'civ', p: c.cap, prog: 0 });
  const mine = st.units.filter((u) => u.t === 'GER').slice(0, 6);
  for (const u of mine) { u.path = [A.P[u.loc].a[0]]; u.prog = 0; u.auto = 0; }
  const gone = mine[5]; st.units = st.units.filter((u) => u !== gone); // birleştirme benzeri silme
  c.armies.push({ id: st.nextId++, n: 'Deneme Ordusu', col: 3 });
  c.laws.trade = 0;
  delete c.decCd.__none__;
  const S1 = A.serialize();
  const ops = A.stateDiff(o0, JSON.parse(S1));
  const B = mk(); B.newGame('GER', { hist: 1, seed: 3 }); B.deserialize(S0);
  const bad = B.applyPatch(B.st, ops);
  // iki taraf da yüklenerek karşılaştırılır (yükleme insan gücü gibi türetilmiş değerleri yeniden hesaplar)
  B.deserialize(B.serialize());
  const R1 = mk(); R1.newGame('GER', { hist: 1, seed: 3 }); R1.deserialize(S1);
  const okP = strip(B.serialize()) === strip(R1.serialize());
  check('yama istemci durumunu birebir üretir', okP, `${ops.length} işlem, ${JSON.stringify(ops).length} bayt, uygulanamayan ${bad}`);
  if (!okP) { const x = JSON.parse(strip(B.serialize())), y = JSON.parse(strip(R1.serialize())); const out = []; const walk = (a, b, p) => { if (out.length > 8 || JSON.stringify(a) === JSON.stringify(b)) return; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + '.' + k); } else out.push(p + ': ' + JSON.stringify(a)?.slice(0, 60) + ' | ' + JSON.stringify(b)?.slice(0, 60)); }; walk(x, y, 'st'); console.log(out.join('\n')); }
  // aynı durumdan (yüklenerek) 20 gün: yamalanmış kurucu = istemcinin yüklenmiş durumu
  const Bs = B.serialize(); B.deserialize(Bs);
  const C = mk(); C.newGame('GER', { hist: 1, seed: 3 }); C.deserialize(Bs);
  for (let k = 0; k < 20; k++) { B.tick(); C.tick(); }
  check('yamalanmış durum 20 gün belirlenimli', hash(B.serialize()) === hash(C.serialize()));
  // eş zamanlı iki istemci: ayrı alanlara yazan yamalar sırayla uygulanınca ikisi de korunur
  const D = mk(); D.newGame('GER', { hist: 1, seed: 3 }); D.deserialize(S0);
  const o1 = JSON.parse(S0); o1.C.ITA.lines.push({ e: 'art', f: 1, eff: 0.3, acc: 0, lv: 1 });
  const opsB = D.stateDiff(JSON.parse(S0), o1);
  D.applyPatch(D.st, ops); D.applyPatch(D.st, opsB);
  check('iki oyuncunun yaması birleşir', D.st.C.ITA.lines.length === o0.C.ITA.lines.length + 1 && D.st.C.GER.lines.length === o0.C.GER.lines.length + 1);
}

// 3) çok insanlı oyun: insan ülkeleri YZ'ye bırakılmaz; tek oyunculu davranış değişmez
{
  const A = mk(); A.newGame('GER', { hist: 1, seed: 9, humans: { GER: 0, SOV: 1 } });
  for (let i = 0; i < 60; i++) A.tick();
  const sovAuto = A.st.units.filter((u) => u.t === 'SOV').every((u) => !u.auto);
  check('ikinci insan ülkesinin (SOV) tümenleri YZ otomatiğinde değil', sovAuto);
  check('isHuman / isLocal', A.isHuman('SOV') && A.isHuman('GER') && !A.isHuman('ITA') && A.isLocal('GER') && !A.isLocal('SOV'), JSON.stringify([A.isHuman('SOV'), A.isHuman('GER'), A.isHuman('ITA'), A.isLocal('GER'), A.isLocal('SOV'), A.st.player, A.st.humans]));
}

// 4) gerçek zamanlı kilitli adım: farklı yerel oyunculu iki cihaz maskeyle günleri birebir aynı işler (savaş, olay, konferans)
{
  const mkH = (pl) => { const X = mk(); X.newGame('GER', { hist: 1, seed: 4, humans: { GER: 0, SOV: 1, ENG: 2 } }); X.st.player = pl; X.simMask = ''; return X; };
  const A = mkH('GER'), B = mkH('SOV');
  const S0 = A.serialize(); B.deserialize(S0); B.st.player = 'SOV'; A.deserialize(S0); A.st.player = 'GER';
  let pops = 0; for (const X of [A, B]) { const f = X.onPopup; X.onPopup = () => { pops += X.popupQueue.length; f(); }; }
  const end = A.dayOf('1941-09-01');
  while (A.st.day < end) { A.tick(); B.tick(); }
  const hA = hash(strip(A.serialize())), hB = hash(strip(B.serialize()));
  check('maskeli kilitli adım 1936→1941 aynı', hA === hB, `gün ${A.st.day}, açılan pencere ${pops}, savaş ${Object.keys(A.st.wars).length}, POL ${A.st.C.POL.alive ? 'ayakta' : 'düştü'}, FRA ${A.st.C.FRA.alive ? 'ayakta' : 'düştü'}`);
}

console.log(fail ? `${fail} test başarısız` : 'tüm testler geçti');
process.exit(fail ? 1 : 0);
