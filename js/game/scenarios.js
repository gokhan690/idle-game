// Alternatif senaryolar (HOI4 "alternatif tarih"): 1 Ocak 1936 dünyası, bazı ülkelerin geçmişi farklı akmış olarak başlar.
// Alternatif senaryolarda tarihî olay zinciri kapalıdır (serbest dünya); yapay zekâ kendi hedeflerini izler.
(function (g) {
  const G = g.G;
  const rel = (a, b, v) => { const st = G.st; if (!st.C[a] || !st.C[b]) return; st.rel = st.rel || {}; for (const k of [a + '>' + b, b + '>' + a]) st.rel[k] = (st.rel[k] || 0) + v; };
  const off = (...ids) => { for (const id of ids) G.st.ev[id] = 1; };
  const ideo = (tag, i, leader, sup = 0.62) => {
    const c = G.st.C[tag]; if (!c) return;
    c.ideo = i; c.leader = leader; c.scenLock = i;
    c.pop[i] = Math.max(c.pop[i] || 0, sup); G.normalizePop(c);
    G.recomputeMods(c);
  };
  const join = (tag, fid) => { const st = G.st, c = st.C[tag]; if (!c || !st.factions[fid] || c.fac === fid) return; if (c.fac) G.leaveFaction(tag); G.joinFaction(tag, fid); };
  // Mihver olaylarını kapat (Almanya'nın faşist olmadığı senaryolar)
  const noAxisChain = () => off('axis', 'tripartite', 'hunjoin', 'romjoin', 'buljoin', 'anschluss', 'sudeten', 'czeend', 'mr', 'poland', 'barbarossa');

  G.SCENARIOS = [
    { id: 'hist', n: 'Fırtına Yaklaşıyor', y: '1936 · tarihî', d: 'Tarihteki 1 Ocak 1936 dünyası. Almanya yeniden silahlanıyor, İtalya Habeşistan\'da, Japonya Çin\'e göz dikmiş.' },
    { id: 'redger', n: 'Kızıl Almanya', y: '1936 · alternatif tarih', d: '1932 seçimlerini Komünist Parti kazandı; Ernst Thälmann Berlin\'de Sovyet tipi bir cumhuriyet kurdu ve Komintern\'e katıldı. Faşizmin bayrağını Mussolini taşıyor; Batı, kızıl bir Avrupa\'dan korkuyor.',
      apply: (st) => {
        noAxisChain();
        ideo('GER', 'com', 'Ernst Thälmann', 0.7);
        join('GER', 'comintern');
        const it = G.createFaction('ITA', 'Mihver'); if (st.C.HUN) join('HUN', it);
        for (const t of ['ENG', 'FRA', 'POL', 'USA']) rel('GER', t, -30);
        rel('GER', 'SOV', 40); rel('ITA', 'JAP', 20);
        st.tension = 20;
      } },
    { id: 'kaiser', n: 'Kayzer Geri Döndü', y: '1936 · alternatif tarih', d: 'Weimar\'ın çöküşünde ordu, nasyonal sosyalistlerin yerine monarşiyi getirdi. II. Wilhelm tahtında; Almanya Orta Avrupa\'yı kendi etrafında topluyor. Mussolini yalnız, Stalin tedirgin.',
      apply: (st) => {
        noAxisChain();
        ideo('GER', 'neu', 'Kayzer II. Wilhelm', 0.65);
        const c = st.C.GER; c.stabX = (c.stabX || 0) + 0.12;
        const f = G.createFaction('GER', 'Orta Avrupa Birliği');
        for (const t of ['AUS', 'HUN', 'BUL']) if (st.C[t]?.alive) join(t, f);
        G.createFaction('ITA', 'Roma Paktı');
        rel('GER', 'ENG', 10); rel('GER', 'SOV', -25); rel('GER', 'FRA', -15);
        st.tension = 12;
      } },
    { id: 'usafas', n: 'Amerika Önce', y: '1936 · alternatif tarih', d: 'Büyük Buhran\'ın ortasında Huey Long başkanlığı kazandı; Amerika yalnızcılığı bırakıp "Amerika Önce" diyerek silahlanıyor. Atlantik artık güvenli değil.',
      apply: (st) => {
        off('usajoin');
        ideo('USA', 'fas', 'Huey Long', 0.6);
        G.addFactories('USA', 'mil', 8);
        rel('USA', 'ENG', -40); rel('USA', 'GER', 20); rel('USA', 'JAP', -20);
        st.tension = 18;
      } },
    { id: 'redfra', n: 'Halk Cephesi Devrimi', y: '1936 · alternatif tarih', d: 'Paris\'te genel grev devrime dönüştü; Maurice Thorez Fransız Komünü\'nü ilan etti. Fransa Komintern\'de, İngiltere Avrupa\'da yalnız kaldı.',
      apply: (st) => {
        ideo('FRA', 'com', 'Maurice Thorez', 0.66);
        join('FRA', 'comintern');
        rel('FRA', 'ENG', -40); rel('FRA', 'SOV', 40); rel('FRA', 'GER', -30); rel('FRA', 'ITA', -30);
        st.tension = 18;
      } },
    { id: 'ottoman', n: 'Osmanlı Restorasyonu', y: '1936 · alternatif tarih', d: 'Saltanat kaldırılmadı; Halife Abdülmecid anayasal monarşinin başında. Ordu güçlü, kadim topraklar üzerindeki talepler canlı. Türkiye denge oyununun kilit ülkesi.',
      apply: (st) => {
        ideo('TUR', 'neu', 'Halife Abdülmecid', 0.68);
        const c = st.C.TUR; if (!c) return;
        c.stabX = (c.stabX || 0) + 0.1; c.wsX = (c.wsX || 0) + 0.1;
        G.addFactories('TUR', 'mil', 3); G.addFactories('TUR', 'civ', 2);
        rel('TUR', 'ENG', -10); rel('TUR', 'ITA', -10); rel('TUR', 'GER', 10);
        st.tension = 10;
      } },
  ];
  G.scenario = (id) => G.SCENARIOS.find((s) => s.id === id) || G.SCENARIOS[0];
  G.applyScenario = (id) => {
    const s = G.scenario(id), st = G.st;
    if (!s.apply) return;
    st.opts.hist = 0; st.opts.scen = id;
    s.apply(st);
    G.refreshEnemies(); G.relClear && G.relClear();
    G.updateSummaries();
    for (const c of Object.values(st.C)) if (c.alive) { G.recomputeMods(c); G.econCalc(c); }
    G.mapDirty = 1;
    G.log(`Senaryo: ${s.n}. ${s.d}`, [], 'major');
  };
})(window);
