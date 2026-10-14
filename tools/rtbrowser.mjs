// Gerçek zamanlı çok oyunculu tarayıcı testi: iki sayfa sahte db/room ile; emirler, karmaşa eşitliği, yeniden katılma,
// kurucu devri ve geri dönüş.  node tools/bundle.mjs && node tools/rtbrowser.mjs <çıktı klasörü> [saniye] [düşen ileti oranı]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const S = process.argv[2], SECS = +(process.argv[3] || 8), DROP = process.argv[4] || '0';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
await ctx.addInitScript({ path: new URL('./netmock.js', import.meta.url).pathname });
const errs = [];
const open = async (uid, q = '') => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(uid + ' ' + e.message)); p.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('CERT')) errs.push(uid + ' ' + m.type() + ' ' + t.slice(0, 160)); }); await p.goto('http://localhost:8765/dist/demir-cephe.html?uid=' + uid + q); await p.evaluate(() => localStorage.setItem('dc_tut', '1')); return p; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const p1 = await open('u1');
await p1.waitForSelector('[data-act=mpcreate]', { timeout: 15000 }); await p1.click('[data-act=mpcreate]'); await p1.waitForSelector('.mpcode');
const code = (await p1.textContent('.mpcode')).trim();
const p2 = await open('u2', '&drop=' + DROP);
await p2.waitForSelector('#mp-code', { timeout: 15000 }); await p2.fill('#mp-code', code); await p2.click('[data-act=mpjoin]:not([data-v])'); await p2.waitForSelector('.mpcode');
await p1.click('[data-act=mppick][data-v=GER]'); await wait(200); await p2.click('[data-act=mppick][data-v=SOV]'); await wait(200);
await p1.click('[data-act=mpopt][data-k=rt][data-v="1"]'); await wait(300);
await p1.screenshot({ path: S + '/rt_lobby.png' });
await p1.click('[data-act=mpstart]');
await p1.waitForFunction(() => G.net.active && G.net.rtOn(), null, { timeout: 15000 });
await p2.waitForFunction(() => G.net.active && G.net.rtOn() && !G.net.rt.syncing, null, { timeout: 20000 });
console.log('ikisi de oyunda', await p1.evaluate(() => [G.st.day, G.st.player, G.net.isHost()]), await p2.evaluate(() => [G.st.day, G.st.player, G.net.isHost(), document.body.classList.contains('mp')]));
// kurucu oynat (hız 3)
await p1.evaluate(() => { G.UI.act("speed", { v: "5" }); G.st.paused = 0; });
const st = (p) => p.evaluate(() => ({ day: G.st.day, max: G.net.rt.maxDay, n: G.net.rt.lastN, sync: G.net.rt.syncing, pend: Object.keys(G.net.rt.pend).length, q: (G.st.mpq || []).length, h: Object.entries(G.net.rt.hashes).slice(-2) }));
let nid2;
for (let t = 0; t < SECS; t++) {
  await wait(1000);
  if (t === 2) nid2 = await p2.evaluate(() => G.net.capture(() => { const c = G.st.C.SOV; const id = G.st.nextId++; c.armies.push({ id, n: 'Canlı Deneme', col: 2 }); c.constr.push({ b: 'mil', p: c.cap, prog: 0 }); return id; }));
  if (t === 3) await p1.evaluate(() => G.net.capture(() => { const c = G.st.C.GER; c.constr.push({ b: 'civ', p: c.cap, prog: 0 }); }));
  if (t === 4) await p2.evaluate(() => { const u = G.st.units.find((x) => x.t === 'SOV'); G.R.sel.units = new Set([u.id]); G.net.capture(() => { u.path = [G.P[u.loc].a[0]]; u.prog = 0; u.auto = 0; }); });
  if (t % 2 === 1) console.log('t', t, JSON.stringify(await st(p1)), JSON.stringify(await st(p2)));
}
// karşılaştır: aynı gündeki karmaşalar
const H1 = await p1.evaluate(() => G.net.rt.hashes), H2 = await p2.evaluate(() => G.net.rt.hashes);
const common = Object.keys(H1).filter((d) => H2[d]);
console.log('ortak karmaşa günleri', common.length, 'eşit', common.filter((d) => H1[d] === H2[d]).length);
console.log('u2 ordusu kurucuda', await p1.evaluate((id) => G.st.C.SOV.armies.some((a) => a.id === id), nid2), 'u2 inşaatı', await p1.evaluate(() => G.st.C.SOV.constr.some((q) => q.b === 'mil')), 'u1 inşaatı u2de', await p2.evaluate(() => G.st.C.GER.constr.length));
await p2.screenshot({ path: S + '/rt_guest.png' }); await p1.screenshot({ path: S + '/rt_host.png' });
// u2 yeniden yüklenir ve yeniden katılır
await p2.reload(); await p2.waitForSelector('[data-act=mpjoin][data-v]', { timeout: 15000 }); await p2.click('[data-act=mpjoin][data-v]');
await p2.waitForFunction(() => G.net.active && G.net.rtOn() && !G.net.rt.syncing, null, { timeout: 20000 });
await wait(3000);
console.log('u2 yeniden katıldı', JSON.stringify(await st(p1)), JSON.stringify(await st(p2)));
// kurucu sayfayı kapatır: u2 devralır
await p1.close();
await p2.waitForFunction(() => G.net.isHost(), null, { timeout: 30000 });
await p2.evaluate(() => { G.st.paused = 0; });
await wait(2500);
console.log('u2 kurucu oldu', JSON.stringify(await st(p2)));
// u1 geri döner: u2 ileride olduğundan u1 ondan eşitlenir
const p3 = await open('u1');
await p3.waitForSelector('[data-act=mpjoin][data-v]', { timeout: 15000 }); await p3.click('[data-act=mpjoin][data-v]');
await p3.waitForFunction(() => G.net.active && G.net.rtOn() && !G.net.rt.syncing, null, { timeout: 30000 });
await wait(4000);
console.log('u1 döndü', await p3.evaluate(() => G.net.isHost()), JSON.stringify(await st(p3)), JSON.stringify(await st(p2)));
const H3 = await p3.evaluate(() => G.net.rt.hashes), H4 = await p2.evaluate(() => G.net.rt.hashes);
const c2 = Object.keys(H3).filter((d) => H4[d]);
console.log('dönüş sonrası ortak', c2.length, 'eşit', c2.filter((d) => H3[d] === H4[d]).length);
console.log('errs', errs.length, JSON.stringify(errs.slice(0, 12)));
await browser.close();
