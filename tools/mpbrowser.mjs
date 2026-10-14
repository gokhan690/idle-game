// Çok oyunculu tarayıcı testi: iki sayfa (u1 kurucu, u2 katılan) sahte db/room ile lobi, turlar, yeniden katılma, beklemeden devam.
//   python3 -m http.server 8765 &  node tools/bundle.mjs && node tools/mpbrowser.mjs <çıktı klasörü> [tur sayısı]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const S = process.argv[2], TURNS = +(process.argv[3] || 3);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.addInitScript({ path: new URL('./netmock.js', import.meta.url).pathname });
const errs = [];
const open = async (uid) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(uid + ' ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(uid + ' console ' + m.text().slice(0, 200)); }); await p.goto('http://localhost:8765/dist/demir-cephe.html?uid=' + uid); await p.evaluate(() => localStorage.setItem('dc_tut', '1')); return p; };
const p1 = await open('u1');
await p1.waitForSelector('[data-act=mpcreate]', { timeout: 15000 });
await p1.click('[data-act=mpcreate]');
await p1.waitForSelector('.mpcode', { timeout: 5000 });
const code = (await p1.textContent('.mpcode')).trim();
console.log('kod', code);
const p2 = await open('u2');
await p2.waitForSelector('#mp-code', { timeout: 15000 });
await p2.fill('#mp-code', code.toLowerCase()); await p2.click('[data-act=mpjoin]:not([data-v])');
await p2.waitForSelector('.mpcode', { timeout: 5000 });
await p1.click('[data-act=mppick][data-v=GER]'); await p1.waitForTimeout(200);
await p2.click('[data-act=mppick][data-v=SOV]'); await p2.waitForTimeout(300);
// u2 Almanya'yı seçemez
console.log('u2 GER düğmesi kapalı', await p2.$eval('[data-act=mppick][data-v=GER]', (b) => b.disabled));
await p1.click('[data-act=mpopt][data-k=turnDays][data-v="3"]'); await p1.waitForTimeout(200);
await p1.screenshot({ path: S + '/mp_lobby_host.png' }); await p2.screenshot({ path: S + '/mp_lobby_guest.png' });
console.log('u2 görüyor: tur 3 gün', await p2.$eval('[data-act=mpopt][data-k=turnDays][data-v="3"]', (b) => b.classList.contains('on')));
await p1.click('[data-act=mpstart]');
await p1.waitForFunction(() => G.net.active && G.net.phase === 'orders', null, { timeout: 15000 });
await p2.waitForFunction(() => G.net.active && G.net.phase === 'orders', null, { timeout: 15000 });
const st0 = async (p) => p.evaluate(() => ({ day: G.st.day, player: G.st.player, humans: G.st.humans, turn: G.net.turn, start: document.getElementById('start').hidden }));
console.log('başlangıç', JSON.stringify(await st0(p1)), JSON.stringify(await st0(p2)));
await p2.screenshot({ path: S + '/mp_turn0_guest.png' });
for (let t = 0; t < TURNS; t++) {
  // u2: bir araştırma ve bir üretim hattı; u1: bir inşaat
  const ord2 = await p2.evaluate(() => { const c = G.st.C.SOV; const tid = (window.TECHS || []).filter((x) => G.techAvailable(c, x.id) && !c.res.some((r) => r.id === x.id)).map((x) => x.id)[0]; if (tid && c.res.length < 5) c.res.push({ id: tid, p: 0 }); const nid = G.st.nextId++; c.armies.push({ id: nid, n: 'Deneme ' + nid, col: 2 }); return { tid, nid }; });
  const ord1 = await p1.evaluate(() => { const c = G.st.C.GER; c.constr.push({ b: 'civ', p: c.cap, prog: 0 }); return c.constr.length; });
  await p2.click('[data-act=mpend]');
  await p2.waitForFunction(() => G.net.phase === 'wait', null, { timeout: 5000 });
  await p1.waitForFunction(() => document.querySelector('#mpbar .mpr') && document.querySelector('#mpbar .mpr').textContent.startsWith('1/'), null, { timeout: 5000 });
  if (t === 0) await p1.screenshot({ path: S + '/mp_wait_host.png' });
  const tt = Date.now();
  await p1.click('[data-act=mpend]');
  await p1.waitForFunction((n) => G.net.turn === n && G.net.phase === 'orders', t + 1, { timeout: 30000 });
  await p2.waitForFunction((n) => G.net.turn === n && G.net.phase === 'orders', t + 1, { timeout: 30000 });
  const r = await Promise.all([p1, p2].map((p) => p.evaluate((nid) => { const s = G.serialize(); let x = 2166136261; const o = JSON.parse(s); delete o.player; delete o.nextId; const j = JSON.stringify(o); for (let i = 0; i < j.length; i++) { x ^= j.charCodeAt(i); x = Math.imul(x, 16777619); } return { day: G.st.day, h: (x >>> 0).toString(16), army: G.st.C.SOV.armies.some((a) => a.id === nid), res: G.st.C.SOV.res.map((r) => r.id).join(','), gcon: G.st.C.GER.constr.length, player: G.st.player, ev: (G.st.mpEv || []).length }; }, ord2.nid)));
  console.log(`tur ${t + 1}: ${Date.now() - tt} ms`, JSON.stringify(r[0]), r[0].h === r[1].h ? 'AYNI' : 'FARKLI ' + JSON.stringify(r[1]), 'u2 araştırma', ord2.tid, r[0].res.includes(ord2.tid || '#'), 'u1 inşaat', ord1, r[1].gcon);
}
const [A1, A2] = await Promise.all([p1, p2].map((p) => p.evaluate(() => G.serialize())));
{ const x = JSON.parse(A1), y = JSON.parse(A2); const out = []; const walk = (a, b, p) => { if (out.length > 12 || JSON.stringify(a) === JSON.stringify(b)) return; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + '.' + k); } else out.push(p + ': ' + JSON.stringify(a)?.slice(0, 80) + ' | ' + JSON.stringify(b)?.slice(0, 80)); }; walk(x, y, 'st'); console.log(out.join(String.fromCharCode(10))); }
await p1.screenshot({ path: S + '/mp_turn_host.png' }); await p2.screenshot({ path: S + '/mp_turn_guest.png' });
// u2 emrini gönderir, sonra sayfayı yeniler ve son kodla geri katılır: beklemede kalmalı
await p2.click('[data-act=mpend]'); await p2.waitForFunction(() => G.net.phase === 'wait');
await p2.reload(); await p2.waitForSelector('[data-act=mpjoin][data-v]', { timeout: 15000 });
await p2.click('[data-act=mpjoin][data-v]');
await p2.waitForFunction((n) => G.net.turn === n, TURNS, { timeout: 15000 });
console.log('u2 yeniden katıldı', JSON.stringify(await p2.evaluate(() => ({ ph: G.net.phase, t: G.net.turn, pl: G.st.player, start: document.getElementById('start').hidden }))));
// kurucu sayfayı yeniler, geri katılır, kendi turunu bitirir: tur çözülmeli
await p1.reload(); await p1.waitForSelector('[data-act=mpjoin][data-v]', { timeout: 15000 }); await p1.click('[data-act=mpjoin][data-v]');
await p1.waitForFunction((n) => G.net.turn === n && G.net.phase === 'orders', TURNS, { timeout: 15000 });
await p1.click('[data-act=mpend]');
await p2.waitForFunction((n) => G.net.turn === n && G.net.phase === 'orders', TURNS + 1, { timeout: 30000 });
console.log('yeniden bağlanma sonrası tur', await p2.evaluate(() => G.net.turn), await p1.evaluate(() => G.net.turn));
// kurucu beklemeden devam eder
await p1.waitForFunction((n) => G.net.turn === n && G.net.phase === 'orders', TURNS + 1, { timeout: 30000 });
await p1.click('[data-act=mpend]'); await p1.waitForSelector('[data-act=mpforce]'); await p1.click('[data-act=mpforce]');
await p2.waitForFunction((n) => G.net.turn === n && G.net.phase === 'orders', TURNS + 2, { timeout: 30000 });
console.log('beklemeden devam: tur', await p2.evaluate(() => [G.net.turn, G.st.day, G.st.nextId]));
// zaman düğmeleri kilitli
await p2.evaluate(() => G.UI.act({ act: 'pause' }));
console.log('u2 duraklatma engelli', await p2.evaluate(() => G.st.paused === 1));
console.log('errs', JSON.stringify(errs.slice(0, 10)), errs.length);
await browser.close();
