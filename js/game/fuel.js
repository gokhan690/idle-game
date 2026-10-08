// Yakıt (HOI4 tarzı): petrol her gün yakıta dönüşür ve kapasitesi sınırlı depoda birikir.
// Motorlu/zırhlı tümenler hareket ve muharebede, uçak kanatları ve filolar görevde yakıt yakar.
// Yakıt biterse motorlu tümenlerin hızı ve saldırısı, uçakların görev etkinliği, gemilerin gücü düşer.
(function (g) {
  const G = g.G;
  const { NP } = G;

  const F = G.FUEL = {
    rate: 0.6, // 1 birim serbest petrol -> yakıt
    base: 300, perOil: 3.5, perRef: 30, // depo kapasitesi: taban + üretilen petrol + rafineri seviyesi
    refOut: 2.5, refMax: 5, // sentetik rafineri: seviye başına günlük yakıt
    start: 0.8, // başlangıçta deponun doluluğu
    mv: 0.55, idle: 0.04, // motorlu tümen ağırlığı başına günlük yakıt (hareket/muharebe), durağan oranı
    air: 0.005, airIdle: 0.0015, // uçak başına günlük yakıt (savaşta / barışta)
    nav: 0.07, navIdle: 0.1, // gemi ağırlığı başına günlük yakıt, limanda/barışta oran
    low: 0.2, // depo bu orandan azsa ceza başlar
    minUnit: 0.35, minAir: 0.4, minNavy: 0.3, // yakıt bittiğinde en çok kayıp
  };
  const SHIP_W = { dd: 0.5, cr: 1, bb: 2, cv: 2, ss: 0.4 };

  // Seviyeli yapı: sentetik rafineri (eyalet başına 0-5)
  g.BUILDINGS.ref = { n: 'Sentetik Rafineri', cost: 5000, s: 'Rafineri', max: F.refMax };
  if (G.LEVEL_B) G.LEVEL_B.add('ref');
  G.ensureRefineries = () => { const pv = G.st.prov; if (pv[0].ref == null) for (const pr of pv) pr.ref = 0; };

  // Şablonun yakıt ağırlığı: tank taburu 1, motorize tabur 0,45 (önbellekli)
  const unitW = (t) => {
    if (t._fw == null) t._fw = t.mob > 0 ? t.tanks + Math.max(0, t.mob * t.nb - t.tanks) * 0.45 : 0;
    return t._fw;
  };

  // ---------- Depo ----------
  G.fuelCap = (c) => F.base + F.perOil * Math.max(0, (c.sum.res && c.sum.res.oil) || 0) + F.perRef * (c._ref || 0);
  // 0..1: depo kapasitenin %20'sinin üstündeyse 1, boşaldıkça 0'a iner
  G.fuelRatio = (c) => (c.fuel == null || !c._fcap ? 1 : Math.max(0, Math.min(1, c.fuel / (F.low * c._fcap))));
  // depo yoksa (yeni oyun, eski kayıt) kapasitenin %80'i ile başlatır
  G.fuelInit = (c) => { c._fcap = G.fuelCap(c); if (c.fuel == null) c.fuel = c._fcap * F.start; };
  // çarpanlar: yakıt oranı 0'a yaklaştıkça en çok minUnit/minAir/minNavy kadar kayıp
  G.fuelMul = (u) => {
    const c = G.st.C[u.t], r = G.fuelRatio(c);
    if (r >= 1) return 1;
    const t = G.T(u.t, u.u);
    return t.mob > 0 ? 1 - F.minUnit * (1 - r) * Math.min(1, t.mob * 1.25) : 1;
  };
  G.fuelAirMul = (c) => 1 - F.minAir * (1 - G.fuelRatio(c));
  G.fuelNavyMul = (c) => 1 - F.minNavy * (1 - G.fuelRatio(c));
  // Yakıt için ayrılması gereken petrol (günlük); ticarette satılmaz, düşük depoda ithal edilir
  G.fuelOilKeep = (c) => ((c.fuelDem || 0) / F.rate) * 0.9;
  G.fuelOilWant = (c) => (c.fuel != null && c._fcap && c.fuel < 0.6 * c._fcap ? ((c.fuelDem || 0) / F.rate) * 1.1 : 0);

  // ---------- Günlük döngü ----------
  G.fuelTick = () => {
    const st = G.st;
    G.ensureRefineries();
    const dem = {}, ref = {};
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.ref > 0) ref[pr.c] = (ref[pr.c] || 0) + pr.ref * (pr.o === pr.c ? 1 : 0.5); }
    // kara: yalnızca motorlu/zırhlı tümenler; hareket ya da muharebedeyken tam, dururken çok az
    for (const u of st.units) {
      if (u.dead || u.loc >= NP) continue;
      const w = unitW(G.T(u.t, u.u)); if (!w) continue;
      const active = !u.sr && (u.path.length > 0 || u.prog > 0 || (G.inBattle && G.inBattle.has(u)));
      dem[u.t] = (dem[u.t] || 0) + w * u.str * F.mv * (active ? 1 : F.idle);
    }
    for (const c of Object.values(st.C)) {
      if (!c.alive) continue;
      // hava: görevdeki kanatlar
      const war = c.enemies.length > 0;
      let d = dem[c.tag] || 0;
      for (const w of c.wings || []) if (w.n >= 1 && w.r >= 0 && w._eff > 0) d += w.n * (w.e === 'bom' ? 1.5 : 1) * (war ? F.air : F.airIdle);
      // deniz: yalnızca yolda olan ya da ana limanından uzaktaki filolar tam yakar
      for (const f of c.fleets || []) {
        let sw = 0; for (const e of g.SHIPS) sw += (f.sh[e] || 0) * SHIP_W[e];
        d += sw * F.nav * (f.path.length || (war && f.loc !== f.home) ? 1 : F.navIdle);
      }
      c._ref = ref[c.tag] || 0;
      G.fuelInit(c); const cap = c._fcap = G.fuelCap(c);
      const e = c.econ, oil = e && e.have ? Math.max(0, e.have.oil - e.need.oil) : 0;
      const inn = oil * F.rate + c._ref * F.refOut;
      const out = Math.min(d, c.fuel + inn);
      c.fuel = Math.max(0, Math.min(cap, c.fuel + inn - out));
      // gösterim ve ticaret için üstel ortalamalar
      const k = c.fuelIn == null ? 1 : 0.08;
      c.fuelIn = (c.fuelIn || 0) + (inn - (c.fuelIn || 0)) * k;
      c.fuelOut = (c.fuelOut || 0) + (out - (c.fuelOut || 0)) * k;
      c.fuelDem = (c.fuelDem || 0) + (d - (c.fuelDem || 0)) * k;
    }
  };

  // ---------- Yapay zekâ: yakıt düşükken sentetik rafineri ----------
  G.aiFuelBuild = (c) => {
    const st = G.st;
    if (!c._fcap || c.fuel >= 0.4 * c._fcap || (c.fuelDem || 0) < c.fuelIn * 0.8 + 1 || c.constr.length >= 6) return;
    if (c.constr.some((q) => q.b === 'ref') || G.rand() > 0.5) return;
    G.ensureRefineries();
    let best = -1, bv = -1;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag || pr.o !== c.tag || (pr.ref || 0) >= F.refMax) continue;
      const v = G.P[i].vp + pr.civ * 0.5 + (i === c.cap ? 3 : 0) - (pr.ref || 0) * 4;
      if (v > bv) { bv = v; best = i; }
    }
    if (best >= 0) c.constr.push({ b: 'ref', p: best, prog: 0 });
  };
})(window);
