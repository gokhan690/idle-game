// Masa testi: açık oyunlar listesi, lobi ve oyun içi sohbet, oyuncular arası pakt teklifi, gerçek zamanlıda olay kararı.
//   node tools/bundle.mjs && node tools/masabrowser.mjs <çıktı klasörü>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const S = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
await ctx.addInitScript({ path: new URL('./netmock.js', import.meta.url).pathname });
const errs = [];
const open = async (uid) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(uid + ' ' + e.message)); p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('CERT')) errs.push(uid + ' ' + t.slice(0, 160)); }); await p.goto('http://localhost:8765/dist/demir-cephe.html?uid=' + uid); await p.evaluate(() => localStorage.setItem('dc_tut', '1')); return p; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const p1 = await open('u1');
await p1.waitForSelector('[data-act=mpcreate]', { timeout: 15000 }); await p1.click('[data-act=mpcreate]'); await p1.waitForSelector('.mpcode');
const code = (await p1.textContent('.mpcode')).trim();
// açık oyunlar listesi: u2 kodu yazmadan listeden katılır
const p2 = await open('u2');
await p2.waitForSelector(`[data-act=mpjoin][data-v="${code}"]`, { timeout: 30000 });
console.log('açık oyunlarda görünüyor', true);
await p2.click(`.list [data-act=mpjoin][data-v="${code}"]`); await p2.waitForSelector('.mpcode');
// lobide sohbet
await p2.fill('#mp-say', 'Merhaba kral!'); await p2.click('[data-act=mpsay]');
await p1.waitForFunction(() => G.net.chat.some((x) => x.t === 'Merhaba kral!'), null, { timeout: 8000 });
console.log('lobi sohbeti iletildi');
await p1.click('[data-act=mppick][data-v=GER]'); await wait(200); await p2.click('[data-act=mppick][data-v=SOV]'); await wait(200);
await p1.click('[data-act=mpopt][data-k=rt][data-v="1"]'); await wait(300);
await p1.click('[data-act=mpstart]');
await p1.waitForFunction(() => G.net.active && G.net.rtOn(), null, { timeout: 15000 });
await p2.waitForFunction(() => G.net.active && G.net.rtOn() && !G.net.rt.syncing, null, { timeout: 20000 });
await p1.evaluate(() => { G.UI.act('speed', { v: '3' }); G.st.paused = 0; });
// teklif: SOV → GER saldırmazlık paktı
await p2.evaluate(() => G.UI.act('dip', { k: 'pact', v: 'GER' }));
await p1.waitForFunction(() => (G.st.offers || []).some((o) => o.from === 'SOV' && o.k === 'pact'), null, { timeout: 15000 });
console.log('teklif kurucuda', await p1.evaluate(() => JSON.stringify(G.st.offers)), 'uyarı', await p1.evaluate(() => G.net.pending()));
await p1.evaluate(() => G.UI.act('mpmasa'));
await wait(300); await p1.screenshot({ path: S + '/masa_host.png' });
const oid = await p1.evaluate(() => G.st.offers[0].id);
await p1.evaluate((id) => G.UI.act('offer', { k: 'acc', v: String(id) }), oid);
await p2.waitForFunction(() => !!G.st.pacts[G.pairKey('GER', 'SOV')] && !(G.st.offers || []).length, null, { timeout: 15000 });
console.log('pakt iki tarafta', await p1.evaluate(() => G.st.pacts[G.pairKey('GER', 'SOV')]), await p2.evaluate(() => G.st.pacts[G.pairKey('GER', 'SOV')]));
// olay kararı: kurucuda SOV için seçimli olay
await p1.evaluate(() => G.net.capture(() => G.humanQ('SOV', { title: 'Deneme olayı', text: 'Seç bakalım.', opts: [{ n: 'Birinci', fx: () => { G.st.C.SOV.testMark = 'A'; } }, { n: 'İkinci', fx: () => { G.st.C.SOV.testMark = 'B'; } }] })));
await p2.waitForFunction(() => (G.st.evq || []).some((x) => x.tag === 'SOV'), null, { timeout: 15000 });
await p2.evaluate(() => G.UI.act('mpmasa')); await wait(400);
await p2.screenshot({ path: S + '/masa_guest.png' });
await p2.click('[data-act=mpevpick][data-v="1"]');
await p2.waitForFunction(() => G.st.C.SOV.testMark === 'B' && !(G.st.evq || []).length, null, { timeout: 15000 });
console.log('olay kararı', await p1.evaluate(() => G.st.C.SOV.testMark), await p2.evaluate(() => G.st.C.SOV.testMark));
// oyun içi sohbet
await p1.fill('#mp-say', 'Pakt tamam.'); await p1.press('#mp-say', 'Enter');
await p2.waitForFunction(() => G.net.chat.some((x) => x.t === 'Pakt tamam.'), null, { timeout: 8000 });
console.log('oyun içi sohbet iletildi');
await wait(6000);
const H1 = await p1.evaluate(() => G.net.rt.hashes), H2 = await p2.evaluate(() => G.net.rt.hashes);
const c = Object.keys(H1).filter((d) => H2[d]); console.log('karmaşa ortak', c.length, 'eşit', c.filter((d) => H1[d] === H2[d]).length, 'eşitleme', await p2.evaluate(() => G.net.rt.syncing));
console.log('errs', errs);
await browser.close();
