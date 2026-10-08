// Güç dengesi (HOI4 "Balance of Power"): bazı ülkelerde iki iç güç arasındaki denge −1..+1 arasında bir ibre.
// İbrenin bulunduğu kademe ülkeye değiştirici verir; zamanla kayar, tarihî olaylar ibreyi iter,
// oyuncu siyasi güçle bir tarafı destekleyebilir. Kademeler: güçlü sol, sol, denge, sağ, güçlü sağ.
(function (g) {
  const G = g.G;
  // b: beş kademe [ad, etkiler]; s: başlangıç; dr(c, st): günlük kayma; ev: olay → itiş; ai: YZ'nin desteklediği yön
  G.BOP = {
    USA: { l: ['Yalnızcılık', '#8f9fb8'], r: ['Müdahalecilik', '#d9b45a'], s: -0.6, ai: 1,
      b: [['Katı yalnızcılık', { stab: 0.1, ws: -0.15, factory: -0.05 }], ['Yalnızcılık', { stab: 0.05, ws: -0.08 }], ['Bölünmüş kamuoyu', {}], ['Demokrasinin cephaneliği', { factory: 0.05, ws: 0.05 }], ['Topyekûn müdahale', { factory: 0.1, ws: 0.15, stab: -0.03 }]],
      dr: (c, st) => (st.day >= G.dayOf('1939-09-01') ? 0.0005 : 0), ev: { poland: 0.15, gelb: 0.15, pearl: 0.8 } },
    GER: { l: ['Nazi Partisi', '#c0503c'], r: ['Generaller', '#8a9a7a'], s: 0, ai: -1,
      b: [['Parti tahakkümü', { ws: 0.1, ppM: 0.1, plan: -0.1, org: -0.05 }], ['Parti etkisi', { ws: 0.05, plan: -0.03 }], ['Parti ve ordu dengede', {}], ['Generallerin sözü', { plan: 0.05, landDef: 0.03 }], ['Ordu devleti', { plan: 0.1, landAtk: 0.05, ws: -0.08 }]],
      dr: (c) => ((c.surrender || 0) > 0.3 ? 0.002 : -0.00015), ev: { anschluss: -0.1, barbarossa: -0.1 } },
    SOV: { l: ['Paranoya', '#a34a4a'], r: ['Ordunun yükselişi', '#c9a34a'], s: -0.7, ai: 1,
      b: [['Terör', { stab: 0.03, plan: -0.05 }], ['Kuşku', { plan: -0.02 }], ['Temkinli güven', {}], ['Stavka', { plan: 0.05, org: 0.03 }], ['Muzaffer Kızıl Ordu', { landAtk: 0.05, plan: 0.08, stab: -0.03 }]],
      // Büyük Temizlik ulusal ruh olarak ayrıca var; ibre tasfiyeden sonra (1939) yavaşça toparlanır
      dr: (c, st) => (c.enemies.length ? 0.0006 : st.day < G.dayOf('1939-01-01') ? -0.0002 : 0.0003), ev: { winter: 0.15, barbarossa: 0.2 } },
    JAP: { l: ['Kara Ordusu', '#b8794a'], r: ['Donanma', '#5f8fb8'], s: -0.3, ai: 0,
      b: [['Ordunun tahakkümü', { landAtk: 0.08, navy: -0.08, stab: -0.05 }], ['Ordu öncelikli', { landAtk: 0.04, navy: -0.03 }], ['Karargâh uzlaşması', {}], ['Donanma öncelikli', { navy: 0.05, landAtk: -0.03 }], ['Donanmanın üstünlüğü', { navy: 0.1, air: 0.05, landAtk: -0.06 }]],
      dr: () => 0, ev: { china: -0.2, pearl: 0.25, midway: -0.25 } },
    ENG: { l: ['Yatıştırma', '#9aa58a'], r: ['Direniş', '#c9a34a'], s: -0.5, ai: 1,
      b: [['Barış her ne pahasına', { stab: 0.08, ws: -0.12 }], ['Yatıştırma', { stab: 0.04, ws: -0.06 }], ['Kararsızlık', {}], ['Yeniden silahlanma', { factory: 0.04, ws: 0.05 }], ['En güzel saatimiz', { ws: 0.15, landDef: 0.05, stab: 0.03 }]],
      dr: (c, st) => (st.day >= G.dayOf('1938-10-01') ? 0.0004 : 0), ev: { sudeten: -0.1, czeend: 0.25, guarpol: 0.1, poland: 0.3, gelb: 0.2 } },
    TUR: { l: ['Tarafsızlık', '#c9b98a'], r: ['Müttefiklere yakınlık', '#6f9fc9'], s: -0.5, ai: -1,
      b: [['Mutlak tarafsızlık', { stab: 0.05, ppM: 0.1, ws: -0.05 }], ['Etkin tarafsızlık', { stab: 0.03 }], ['Denge siyaseti', {}], ['Müttefik yardımı', { factory: 0.03, landDef: 0.03 }], ['Müttefik kampı', { ws: 0.1, factory: 0.05, stab: -0.05 }]],
      dr: () => 0, ev: {} }, // Türkiye olaylarının itişi seçeneklerin içinde (events_ext.js)
    ITA: { l: ['Faşist Büyük Konsey', '#8f8f8f'], r: ['Duçe', '#3c3c3c'], s: 0.5, ai: 1,
      b: [['Konsey isyanı', { stab: -0.1, ws: -0.1 }], ['Konsey muhalefeti', { stab: -0.04 }], ['Rejim dengede', {}], ['Duçe\'nin iradesi', { ws: 0.05, ppM: 0.05 }], ['Tek adam yönetimi', { ws: 0.08, ppM: 0.1, plan: -0.05 }]],
      dr: (c) => ((c.surrender || 0) > 0.1 ? -0.002 : 0), ev: { husky: -0.5, greece: -0.1 } },
    FRA: { l: ['Halk Cephesi', '#c96f6f'], r: ['Sağ blok', '#6f7fc9'], s: -0.4, ai: 1,
      b: [['Halk Cephesi reformları', { stab: 0.03, factory: -0.08 }], ['Sol çoğunluk', { factory: -0.04 }], ['Bölünmüş meclis', {}], ['Ulusal birlik', { factory: 0.04, stab: -0.02 }], ['Otoriter sağ', { factory: 0.06, stab: -0.06, ws: 0.05 }]],
      dr: () => 0, ev: { sudeten: 0.15, poland: 0.1 } },
  };
  G.BOP_COST = 50; G.BOP_STEP = 0.12; G.BOP_CD = 45;
  const band = (v) => (v <= -0.6 ? 0 : v < -0.2 ? 1 : v <= 0.2 ? 2 : v < 0.6 ? 3 : 4);
  G.bopBand = (c) => band(c.bop ?? 0);
  // recomputeMods için: kademenin etkileri
  G.bopFx = (c) => { const B = c && c.bop != null && G.BOP[c.tag]; return B ? B.b[band(c.bop)][1] : null; };
  G.initBop = () => { for (const [t, B] of Object.entries(G.BOP)) { const c = G.st.C[t]; if (c && c.alive && c.bop == null) { c.bop = B.s; c._bopB = band(c.bop); G.recomputeMods(c); } } };
  G.bopShift = (c, d, why) => {
    const B = G.BOP[c.tag]; if (!B || c.bop == null) return;
    c.bop = Math.max(-1, Math.min(1, c.bop + d));
    const nb = band(c.bop);
    if (nb !== c._bopB) {
      c._bopB = nb; G.recomputeMods(c);
      if (c.tag === G.st.player) G.log(`Güç dengesi: ${B.b[nb][0]}${why ? ` (${why})` : ''}.`, [c.tag], 'info');
    }
  };
  // günlük: kayma, olay itişleri, YZ desteği
  G.bopTick = () => {
    const st = G.st;
    for (const [t, B] of Object.entries(G.BOP)) {
      const c = st.C[t]; if (!c || !c.alive) continue;
      if (c.bop == null) { c.bop = B.s; c._bopB = -1; }
      let d = B.dr(c, st) || 0;
      c.bopEv = c.bopEv || {};
      for (const [id, v] of Object.entries(B.ev)) if (st.evOk && st.evOk[id] && !c.bopEv[id]) { c.bopEv[id] = 1; d += v; }
      if (d || c._bopB < 0) G.bopShift(c, d);
      if (c._bopB < 0) { c._bopB = band(c.bop); G.recomputeMods(c); }
      // YZ: serbest modda arada bir tercih ettiği tarafı destekler (tarihî modda ibreyi yalnızca kayma ve olaylar yönetir)
      if (!st.opts.hist && t !== st.player && B.ai && c.pp >= 150 && (st.day + t.charCodeAt(0)) % 120 === 0 && Math.sign(B.ai) * c.bop < 0.5) { c.pp -= G.BOP_COST; G.bopShift(c, B.ai * G.BOP_STEP); }
    }
  };
  G.bopAct = (dir) => {
    const st = G.st, c = st.C[st.player], B = G.BOP[c.tag];
    if (!B || c.bop == null) return { ok: false, why: 'Bu ülkede güç dengesi yok' };
    if (c.pp < G.BOP_COST) return { ok: false, why: `${G.BOP_COST} siyasi güç gerekli` };
    if (c.bopCd > st.day) return { ok: false, why: `${c.bopCd - st.day} gün sonra yeniden destek verebilirsin` };
    c.pp -= G.BOP_COST; c.bopCd = st.day + G.BOP_CD;
    G.bopShift(c, dir * G.BOP_STEP, `${dir < 0 ? B.l[0] : B.r[0]} desteklendi`);
    return { ok: true };
  };
})(window);
