// Tank ve uçak tasarımcısı (HOI4 tarzı): şasi/gövde + modüller -> özellik vektörü ve maliyet.
// Depodaki teçhizatın kalitesi üretilen tasarımların ağırlıklı ortalamasıdır (c.sq).
(function (g) {
  const G = g.G;

  // ---------- Veri ----------
  // fx: istatistiklere oransal ekleme (0.1 = +%10); cost: maliyete oransal ekleme; req: gereken şasi seviyesi
  const TANK_TIER = ['', 'Hafif Tank Şasisi', 'Orta Tank Şasisi', 'Ağır Tank Şasisi', 'Modern Tank Şasisi'];
  const PLANE_TIER = {
    fig: ['', 'Çift Kanatlı Gövde', 'Tek Kanatlı Gövde (1938)', 'Gelişmiş Gövde (1940)', 'Jet Gövde (1944)'],
    cas: ['', 'Hafif Gövde (1936)', 'Hafif Gövde (1938)', 'Hafif Gövde (1940)', 'Jet Gövde (1944)'],
    bom: ['', 'Orta Gövde (1936)', 'Orta/Ağır Gövde (1938)', 'Ağır Gövde (1940)', 'Jet Gövde (1944)'],
  };
  const SPECIAL_T = [
    { id: 'none', n: 'Boş', fx: {} },
    { id: 'radio', n: 'Telsiz', fx: { a: 0.04, d: 0.04 }, cost: 0.03 },
    { id: 'slope', n: 'Eğimli zırh', fx: { r: 0.12 }, cost: 0.08, req: 2 },
    { id: 'smoke', n: 'Sis atar', fx: { d: 0.06 }, cost: 0.03 },
    { id: 'spare', n: 'Yedek parça', fx: { rel: 0.06 }, cost: 0.02 },
    { id: 'skirt', n: 'Zırh etekleri', fx: { r: 0.06, s: -0.02 }, cost: 0.04, req: 3 },
  ];
  const SPECIAL_P = [
    { id: 'none', n: 'Boş', fx: {} },
    { id: 'armor', n: 'Zırh plakası', fx: { df: 0.25, aa: -0.05 }, cost: 0.05 },
    { id: 'sst', n: 'Sızdırmaz yakıt deposu', fx: { df: 0.15 }, cost: 0.04 },
    { id: 'drop', n: 'Atılabilir yakıt tankı', fx: { rg: 0.5 }, cost: 0.03 },
    { id: 'radio', n: 'Telsiz', fx: { aa: 0.05, ga: 0.04 }, cost: 0.03 },
  ];
  g.DESIGN = {
    tank: {
      n: 'Tank', tierN: TANK_TIER, stats: [['a', 'Saldırı (yumuşak)'], ['d', 'Yarma'], ['r', 'Zırh'], ['p', 'Delme'], ['s', 'Hız'], ['rel', 'Güvenilirlik']],
      slots: [
        { k: 'gun', n: 'Ana silah', def: 'sc', opts: [
          { id: 'mg', n: 'Makineli tüfek', fx: { a: -0.1, p: -0.4 }, cost: -0.1 },
          { id: 'sc', n: 'Küçük top', fx: {} },
          { id: 'how', n: 'Kısa namlulu obüs', fx: { a: 0.25, p: -0.3 }, cost: 0.1 },
          { id: 'mc', n: 'Orta top', fx: { a: 0.08, p: 0.3 }, cost: 0.12, req: 2 },
          { id: 'hc', n: 'Ağır top', fx: { a: 0.12, p: 0.6, s: -0.05 }, cost: 0.25, req: 3 },
        ] },
        { k: 'tur', n: 'Taret', def: '2', opts: [
          { id: '1', n: 'Tek kişilik', fx: { a: -0.05, d: -0.05 }, cost: -0.05 },
          { id: '2', n: 'İki kişilik', fx: {} },
          { id: '3', n: 'Üç kişilik', fx: { a: 0.06, d: 0.06 }, cost: 0.08, req: 2 },
        ] },
        { k: 'sus', n: 'Süspansiyon', def: 'leaf', opts: [
          { id: 'leaf', n: 'Yaprak yay', fx: {} },
          { id: 'bog', n: 'Bojili', fx: { rel: 0.05, s: -0.03 } },
          { id: 'tor', n: 'Burulma çubuğu', fx: { s: 0.05, rel: 0.03 }, cost: 0.05, req: 2 },
        ] },
        { k: 'arm', n: 'Zırh kalınlığı', lvl: 4, per: { fx: { r: 0.08, s: -0.03 }, cost: 0.04 } },
        { k: 'eng', n: 'Motor gücü', lvl: 4, per: { fx: { s: 0.04, rel: -0.015 }, cost: 0.03 } },
        { k: 'sp1', n: 'Özel modül 1', def: 'none', opts: SPECIAL_T },
        { k: 'sp2', n: 'Özel modül 2', def: 'none', opts: SPECIAL_T, req: 2 },
      ],
    },
    fig: {
      n: 'Avcı uçağı', tierN: PLANE_TIER.fig, stats: [['aa', 'Hava saldırısı'], ['df', 'Hava savunması'], ['ga', 'Kara saldırısı'], ['rg', 'Menzil'], ['rel', 'Güvenilirlik']],
      slots: [
        { k: 'w1', n: 'Ana silah', def: 'mg', opts: [
          { id: 'mg', n: 'Makineli tüfekler', fx: {} },
          { id: 'hmg', n: 'Ağır makineli tüfekler', fx: { aa: 0.12 }, cost: 0.08 },
          { id: 'cn', n: '20 mm top', fx: { aa: 0.25, ga: 0.4 }, cost: 0.15, req: 2 },
          { id: 'cn2', n: 'Çift 20 mm top', fx: { aa: 0.4, ga: 0.6 }, cost: 0.25, req: 3 },
        ] },
        { k: 'w2', n: 'Ek silah', def: 'none', opts: [
          { id: 'none', n: 'Boş', fx: {} },
          { id: 'mg', n: 'Ek makineli tüfek', fx: { aa: 0.08 }, cost: 0.04 },
          { id: 'bomb', n: 'Bomba kilidi', fx: { ga: 0.5, aa: -0.05 }, cost: 0.05 },
        ] },
        { k: 'eng', n: 'Motor', def: 'std', opts: [
          { id: 'std', n: 'Standart motor', fx: {} },
          { id: 'boost', n: 'Güçlendirilmiş motor', fx: { aa: 0.1, rel: -0.04 }, cost: 0.1 },
        ] },
        { k: 'sp1', n: 'Özel modül 1', def: 'none', opts: SPECIAL_P },
        { k: 'sp2', n: 'Özel modül 2', def: 'none', opts: SPECIAL_P, req: 2 },
      ],
    },
    cas: {
      n: 'Yakın destek uçağı', tierN: PLANE_TIER.cas, stats: [['ga', 'Kara saldırısı'], ['na', 'Deniz saldırısı'], ['df', 'Hava savunması'], ['aa', 'Hava saldırısı'], ['rg', 'Menzil'], ['rel', 'Güvenilirlik']],
      slots: [
        { k: 'w1', n: 'Ana silah', def: 'bl', opts: [
          { id: 'bl', n: 'Bomba kilidi', fx: {} },
          { id: 'hbl', n: 'Ağır bomba kilidi', fx: { ga: 0.25 }, cost: 0.1 },
          { id: 'at', n: 'Tanksavar topu', fx: { ga: 0.2 }, cost: 0.12, req: 2 },
          { id: 'tor', n: 'Torpido rafı', fx: { na: 0.6, ga: -0.3 }, cost: 0.06 },
          { id: 'rkt', n: 'Roket rafları', fx: { ga: 0.3 }, cost: 0.15, req: 3 },
        ] },
        { k: 'w2', n: 'Savunma silahı', def: 'none', opts: [
          { id: 'none', n: 'Boş', fx: {} },
          { id: 'mg', n: 'Arka makineli tüfek', fx: { df: 0.12, aa: 0.1 }, cost: 0.04 },
        ] },
        { k: 'eng', n: 'Motor', def: 'std', opts: [
          { id: 'std', n: 'Standart motor', fx: {} },
          { id: 'boost', n: 'Güçlendirilmiş motor', fx: { ga: 0.08, df: 0.05, rel: -0.04 }, cost: 0.1 },
        ] },
        { k: 'sp1', n: 'Özel modül 1', def: 'none', opts: SPECIAL_P.concat([{ id: 'dive', n: 'Pike freni', fx: { ga: 0.12 }, cost: 0.04 }]) },
        { k: 'sp2', n: 'Özel modül 2', def: 'none', opts: SPECIAL_P.concat([{ id: 'dive', n: 'Pike freni', fx: { ga: 0.12 }, cost: 0.04 }]), req: 2 },
      ],
    },
    bom: {
      n: 'Bombardıman uçağı', tierN: PLANE_TIER.bom, stats: [['sb', 'Stratejik bombardıman'], ['na', 'Deniz saldırısı'], ['ga', 'Kara saldırısı'], ['df', 'Hava savunması'], ['rg', 'Menzil'], ['rel', 'Güvenilirlik']],
      slots: [
        { k: 'eng', n: 'Motor sayısı', def: '2', opts: [
          { id: '2', n: 'İki motor', fx: {} },
          { id: '4', n: 'Dört motor (ağır)', fx: { sb: 0.5, na: 0.2, rg: 0.5, ga: 0.1 }, cost: 0.55, req: 2 },
        ] },
        { k: 'bay', n: 'Bomba bölmesi', def: 'std', opts: [
          { id: 'std', n: 'Bomba bölmesi', fx: {} },
          { id: 'big', n: 'Büyük bomba bölmesi', fx: { sb: 0.25, ga: 0.15 }, cost: 0.12 },
          { id: 'tor', n: 'Torpido bölmesi', fx: { na: 0.6, sb: -0.3 }, cost: 0.05 },
        ] },
        { k: 'tur', n: 'Savunma taretleri', lvl: 3, per: { fx: { df: 0.12, rg: -0.05 }, cost: 0.05 } },
        { k: 'sp1', n: 'Özel modül 1', def: 'none', opts: SPECIAL_P.concat([{ id: 'sight', n: 'Bomba nişangâhı', fx: { sb: 0.15, na: 0.1 }, cost: 0.06, req: 2 }, { id: 'nav', n: 'Telsiz navigasyon', fx: { sb: 0.08 }, cost: 0.03 }]) },
        { k: 'sp2', n: 'Özel modül 2', def: 'none', opts: SPECIAL_P.concat([{ id: 'sight', n: 'Bomba nişangâhı', fx: { sb: 0.15, na: 0.1 }, cost: 0.06, req: 2 }, { id: 'nav', n: 'Telsiz navigasyon', fx: { sb: 0.08 }, cost: 0.03 }]), req: 2 },
      ],
    },
  };
  G.DESIGNABLE = new Set(Object.keys(g.DESIGN));

  // ---------- Temel değerler ----------
  // Varsayılan tasarım eski seviye sistemini birebir verir (tank: 1+0.25(L-1); uçak: L).
  function base(e, L) {
    if (e === 'tank') { const m = 1 + 0.25 * (L - 1); return { a: m, d: m, r: m, p: m, s: L === 3 ? 0.88 : 1, rel: 0.9 }; }
    const pl = { aa: 0.25 * L, ga: 0.25 * L, sb: 0, na: 0.2 * L, df: 1, rg: 1, rel: 0.9 };
    if (e === 'fig') { pl.aa = L; pl.rg = 1; }
    if (e === 'cas') { pl.ga = L; pl.na = L; pl.rg = 1.2; }
    if (e === 'bom') { pl.sb = L; pl.na = L; pl.ga = L; pl.aa = 0.1 * L; pl.rg = 2; }
    return pl;
  }
  const cacheStd = new Map(), cacheCus = new WeakMap();
  G.designStats = (e, d) => {
    const ck = d.std ? e + d.t : null;
    const hit = ck ? cacheStd.get(ck) : cacheCus.get(d);
    if (hit) return hit;
    const r = calcStats(e, d);
    if (ck) cacheStd.set(ck, r); else cacheCus.set(d, r);
    return r;
  };
  G.designPreview = (e, d) => calcStats(e, d);
  function calcStats(e, d) {
    const D = g.DESIGN[e], b = base(e, d.t);
    const add = {}; let cost = 0;
    const put = (fx, k = 1) => { for (const [s, v] of Object.entries(fx || {})) add[s] = (add[s] || 0) + v * k; };
    for (const sl of D.slots) {
      if (sl.lvl) { const n = Math.max(0, Math.min(sl.lvl, d.m[sl.k] | 0)); put(sl.per.fx, n); cost += sl.per.cost * n; continue; }
      const o = sl.opts.find((x) => x.id === (d.m[sl.k] ?? sl.def)) || sl.opts[0];
      put(o.fx); cost += o.cost || 0;
    }
    const v = {};
    for (const [k, x] of Object.entries(b)) v[k] = k === 'rel' ? Math.max(0.5, Math.min(1, x + (add[k] || 0))) : Math.max(0, x * (1 + (add[k] || 0)));
    return { v, cm: Math.max(0.5, 1 + cost) };
  }
  G.defaultDesign = (e, t) => ({ id: 'std' + t, e, t, n: (g.MODEL_N[e] || [])[t] || `Seviye ${t}`, m: {}, std: 1 });
  // Ülkenin kullanabileceği tasarımlar: açık seviyelerin standart modelleri + özel tasarımlar
  G.designsFor = (c, e) => {
    const best = Math.floor(G.bestLevel(c, e));
    const out = [];
    for (let t = 1; t <= best; t++) out.push(G.defaultDesign(e, t));
    for (const d of c.designs || []) if (d.e === e && d.t <= best) out.push(d);
    return out;
  };
  G.designById = (c, e, id) => {
    if (id && id.startsWith && id.startsWith('std')) return G.defaultDesign(e, +id.slice(3));
    return (c.designs || []).find((d) => d.id === id && d.e === e) || null;
  };
  G.lineDesign = (c, l) => {
    if (!G.DESIGNABLE.has(l.e)) return null;
    return (l.d && G.designById(c, l.e, l.d)) || G.defaultDesign(l.e, Math.round(l.lv || G.bestLevel(c, l.e)));
  };
  G.lineCostMul = (c, l) => { const d = G.lineDesign(c, l); return d ? G.designStats(l.e, d).cm : 1; };
  // vektörden eşdeğer seviye (arayüz ve eski hesaplar için)
  G.vecLevel = (e, v) => {
    if (e === 'tank') return 1 + ((v.a + v.d + v.r + v.p) / 4 - 1) / 0.25;
    return e === 'fig' ? v.aa : e === 'cas' ? v.ga : v.sb;
  };
  G.stockVec = (c, e) => {
    const sq = c.sq || (c.sq = {});
    if (!sq[e]) sq[e] = G.designStats(e, G.defaultDesign(e, Math.max(1, Math.round(G.lvl(c, e))))).v;
    return sq[e];
  };
  G.blendVec = (a, b, k) => { const o = {}; for (const key of Object.keys(b)) o[key] = (a[key] ?? b[key]) * (1 - k) + b[key] * k; return o; };
  G.vecDiff = (a, b) => { let d = 0; for (const k of Object.keys(b)) d = Math.max(d, Math.abs((a[k] ?? 0) - b[k])); return d; };
  // üretim: depoya eklenen teçhizat kalite ortalamasını değiştirir
  G.stockAdd = (c, e, old, add, d) => {
    const v = G.designStats(e, d).v;
    const cur = G.stockVec(c, e);
    c.sq[e] = old + add > 0 ? G.blendVec(cur, v, add / (old + add)) : v;
    c.sl[e] = G.vecLevel(e, c.sq[e]);
  };

  // ---------- Tasarım kaydetme (tecrübe puanı) ----------
  G.XP_KIND = { tank: 'axp', fig: 'fxp', cas: 'fxp', bom: 'fxp' };
  G.designCost = (e, d) => {
    const D = g.DESIGN[e]; let n = 0;
    for (const sl of D.slots) { if (sl.lvl) n += d.m[sl.k] | 0; else if ((d.m[sl.k] ?? sl.def) !== sl.def) n++; }
    return 10 + 5 * n;
  };
  G.designValid = (c, e, d) => {
    const D = g.DESIGN[e];
    if (d.t < 1 || d.t > G.bestLevel(c, e)) return 'Bu şasi henüz araştırılmadı.';
    for (const sl of D.slots) {
      if (sl.req && d.t < sl.req && (sl.lvl ? d.m[sl.k] | 0 : (d.m[sl.k] ?? sl.def) !== sl.def)) return `${sl.n} bu şaside kullanılamaz.`;
      if (sl.lvl) continue;
      const o = sl.opts.find((x) => x.id === (d.m[sl.k] ?? sl.def));
      if (!o) return 'Geçersiz modül.';
      if (o.req && d.t < o.req) return `${o.n} için daha gelişmiş şasi gerekli.`;
    }
    return null;
  };
  G.saveDesign = (c, e, draft) => {
    const err = G.designValid(c, e, draft); if (err) return { ok: false, why: err };
    const cost = G.designCost(e, draft), k = G.XP_KIND[e];
    const have = c[k] ?? 30;
    if (have < cost) return { ok: false, why: `${cost} tecrübe puanı gerekli (${Math.floor(have)} var).` };
    c[k] = have - cost;
    const d = { id: 'd' + G.st.nextId++, e, t: draft.t, n: (draft.n || '').trim().slice(0, 28) || `${g.DESIGN[e].n} ${(c.designs || []).length + 1}`, m: Object.assign({}, draft.m) };
    (c.designs || (c.designs = [])).push(d);
    return { ok: true, d };
  };
  G.deleteDesign = (c, id) => {
    c.designs = (c.designs || []).filter((d) => d.id !== id);
    for (const l of c.lines) if (l.d === id) l.d = null;
  };
  // Günlük tecrübe kazancı: savaşta muharebeler ve görevdeki kanatlar
  G.xpTick = (c) => {
    const war = c.enemies.length > 0;
    let bat = 0; if (war && G.battles) for (const b of G.battles) if (b.att === c.tag || b.def === c.tag) bat++;
    let wings = 0; if (war) for (const w of c.wings || []) if (w.r >= 0 && w.n > 10) wings++;
    c.axp = Math.min(500, (c.axp ?? 30) + 0.06 + (c.mods.xpGain || 0) * 0.05 + Math.min(0.5, bat * 0.02));
    c.fxp = Math.min(500, (c.fxp ?? 30) + 0.05 + Math.min(0.4, wings * 0.03));
  };

  // ---------- Yapay zekâ tasarımları (büyük güçler, ulusal tercihlere göre) ----------
  // maliyeti standarda yakın tutulur (denge); 1936 başında standart modeller kullanılır
  const AI_PRESET = {
    tank: (c, t) => ({ gun: t >= 3 ? 'hc' : 'mc', tur: '3', sus: 'tor', arm: c.tag === 'SOV' ? 1 : 0, eng: 0, sp1: 'radio', sp2: c.tag === 'SOV' ? 'slope' : 'none' }),
    fig: (c, t) => ({ w1: t >= 3 ? 'cn' : 'hmg', w2: 'none', eng: 'std', sp1: 'sst', sp2: c.tag === 'USA' || c.tag === 'ENG' ? 'drop' : 'none' }),
    cas: (c, t) => ({ w1: c.tag === 'GER' || c.tag === 'SOV' ? 'at' : 'hbl', w2: 'none', eng: 'std', sp1: c.tag === 'GER' ? 'dive' : 'none', sp2: 'none' }),
    bom: (c, t) => ({ eng: c.tag === 'USA' || c.tag === 'ENG' ? '4' : '2', bay: c.tag === 'JAP' || c.tag === 'ITA' ? 'tor' : 'std', tur: 1, sp1: 'sight', sp2: 'none' }),
  };
  G.aiDesign = (c, e) => {
    if (!c.major || !G.DESIGNABLE.has(e) || c.tag === G.st.player) return null;
    const t = Math.floor(G.bestLevel(c, e));
    if (t < 2) return null;
    const id = 'ai' + e + t;
    let d = (c.designs || []).find((x) => x.id === id);
    if (!d) {
      d = { id, e, t, n: `${(g.MODEL_N[e] || [])[t] || g.DESIGN[e].n} (${G.cname(c.tag).slice(0, 3)})`, m: AI_PRESET[e](c, t) };
      if (G.designValid(c, e, d)) return null;
      (c.designs || (c.designs = [])).push(d);
    }
    return id;
  };

  // ---------- Hava kanadı kalitesi ----------
  const MIS_STAT = { sup: 'aa', int: 'aa', cas: 'ga', str: 'sb', nav: 'na' };
  G.wingQ = (c, w) => w.q || (w.q = Object.assign({}, G.stockVec(c, w.e)));
  G.wingPower = (c, w) => w.n * (G.wingQ(c, w)[MIS_STAT[w.mis]] || 0.2) * (1 + (c.mods.air || 0));
})(window);
