// Arayüz duman testi (tarayıcı): oyunu başlatır, bütün panelleri ve alt sayfaları açar, 60 gün oynatır; sayfa hatası olmamalı.
//   python3 -m http.server 8765 &  node tools/bundle.mjs && node tools/uismoke.mjs [çıktı klasörü]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const OUT = process.argv[2] || '';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const errs = []; let panels = 0;
for (const [dev, scen, tag] of [['iPhone 13', 0, 'TUR'], ['iPad (gen 7) landscape', 1941, 'GER']]) {
  const ctx = await browser.newContext({ ...devices[dev] });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${dev}: ${e.message}`));
  await p.goto('http://localhost:8765/dist/demir-cephe.html'); await p.evaluate(() => localStorage.setItem('dc_tut', '1'));
  await p.waitForSelector('[data-act=begin]', { timeout: 20000 });
  if (scen) await p.click(`[data-act=sopt][data-k=scen][data-v="${scen}"]`);
  await p.click(`[data-act=pick][data-v=${tag}]`); await p.click('[data-act=begin]');
  await p.waitForFunction(() => document.getElementById('start').hidden && window.G && G.st, null, { timeout: 20000 });
  for (let i = 0; i < 3; i++) { const m = await p.$('[data-act=modalopt]:visible'); if (m) { await m.click(); await p.waitForTimeout(100); } }
  const res = await p.evaluate(async () => {
    const out = [], UI = G.UI;
    const popAll = () => { while (G.popupQueue.length) { const q = G.popupQueue.shift(); try { q.opts[0].fx(); } catch (e) { out.push('popup ' + e.message); } } };
    const old = G.onPopup; G.onPopup = popAll;
    for (let i = 0; i < 60; i++) G.tick();
    G.onPopup = old;
    let n = 0;
    for (const k of Object.keys(UI.PANELS)) {
      try { UI.panel = k; UI.sub = null; UI.render(true); n++;
        // panelin içindeki sekme ve alt sayfa düğmeleri
        const btns = [...document.querySelectorAll('#sheet-body [data-act=tab], #sheet-body [data-act=sub], #sheet-body [data-act=sub2]')].slice(0, 12);
        for (const b of btns) { try { UI.act(b.dataset.act, b.dataset, b); n++; } catch (e) { out.push(`${k}/${b.dataset.act}:${b.dataset.v} ${e.message}`); } UI.panel = k; }
      } catch (e) { out.push(`${k} ${e.message}`); }
    }
    UI.close();
    // bir orduyu ve bir tümeni seç
    try { const c = G.st.C[G.st.player]; if (c.armies[0]) UI.selectArmy(c.armies[0].id); UI.renderSel(); } catch (e) { out.push('sel ' + e.message); }
    return { out, n };
  });
  panels += res.n; errs.push(...res.out.map((x) => `${dev}: ${x}`));
  if (OUT) await p.screenshot({ path: `${OUT}/smoke_${scen || 1936}.png` });
  await ctx.close();
}
console.log('panel/alt sayfa', panels, 'errors', errs.length, JSON.stringify(errs.slice(0, 15)));
await browser.close();
process.exit(errs.length ? 1 : 0);
