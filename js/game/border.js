// Sınır çatışmaları (HOI4 border conflicts): iki ülke tam savaş olmadan tek bir sınır eyaletinde çatışır.
// 45 gün boyunca sınırdaki birliklerin gücü karşılaştırılır; kazanan eyaleti alır (saldıran kazanırsa) ve savaş desteği kazanır.
// Saldıran istediği an çatışmayı tam savaşa tırmandırabilir. Tarihî modda YZ'ler arasındaki tarihî çatışmalar (Hasan Gölü,
// Halhin Gol, Fransız-Tay) yalnızca haber ve harita işaretidir; tarihî akışı değiştirmez.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const alive = (t) => !!G.st.C[t]?.alive;
  G.BC_DAYS = 45;
  G.BC_COST = 50;
  const list = () => G.st.bc || [];
  G.borderConflictOf = (a, b) => list().find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  // a'nın b'ye karşı çatışma başlatabileceği en iyi eyalet: a'nın birliklerinin en çok bulunduğu sınır
  G.bcTarget = (a, b) => {
    const st = G.st; let best = -1, bv = -1;
    for (let i = 0; i < NP; i++) {
      if (st.prov[i].c !== b) continue;
      if (!P[i].a.some((j) => st.prov[j].c === a)) continue;
      let v = 0.1; for (const j of P[i].a) for (const u of G.unitsAt[j] || []) if (u.t === a) v += 1;
      v += (P[i].vp || 0) * 0.01;
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  };
  G.bcAllowed = (a, b) => {
    const st = G.st, c = st.C[a];
    if (!alive(b) || a === b) return { ok: false, why: 'Geçersiz hedef' };
    if (G.atWar(a, b)) return { ok: false, why: 'Zaten savaştasınız' };
    if (G.sameFaction(a, b)) return { ok: false, why: 'Aynı ittifaktasınız' };
    if (st.pacts[G.pairKey(a, b)]) return { ok: false, why: 'Saldırmazlık paktı var' };
    if (G.borderConflictOf(a, b)) return { ok: false, why: 'Çatışma zaten sürüyor' };
    if (c.enemies.length) return { ok: false, why: 'Savaştayken sınır çatışması başlatılamaz' };
    if (G.bcTarget(a, b) < 0) return { ok: false, why: 'Ortak kara sınırı yok' };
    if (c.pp < G.BC_COST) return { ok: false, why: `${G.BC_COST} siyasi güç gerekli` };
    return { ok: true };
  };
  G.bcStart = (a, b, opts = {}) => {
    const st = G.st;
    if (!opts.free) { const r = G.bcAllowed(a, b); if (!r.ok) return r; st.C[a].pp -= G.BC_COST; }
    const prov = opts.prov ?? G.bcTarget(a, b); if (prov < 0) return { ok: false, why: 'Sınır yok' };
    const x = { a, b, prov, s: st.day, e: st.day + (opts.days || G.BC_DAYS), sc: 0, hist: opts.hist ? 1 : 0, win: opts.win || null, n: opts.n || `${P[prov].n} Sınır Çatışması` };
    (st.bc || (st.bc = [])).push(x);
    if (!x.hist) { st.tension = Math.min(100, st.tension + 2); G.tsrc(a, 2, 'sınır çatışması'); }
    G.log(`${x.n}: ${G.cname(a)} ile ${G.cname(b)} sınırda çatışıyor.`, [a, b], 'major');
    if (b === st.player) G.queuePopup({ art: 'war', title: x.n, text: `${G.cname(a)} birlikleri ${P[prov].n} yakınında sınırımızı geçti. Bu tam bir savaş değil; ${G.BC_DAYS} gün boyunca sınırdaki kuvvetlerimiz karşılık verecek. Kaybedersek eyaleti yitiririz.`, opts: [{ n: 'Sınırı savunacağız', fx: () => {} }, { n: 'Savaş ilan et', d: 'Çatışma tam savaşa döner', fx: () => G.bcEscalate(x, b) }] });
    return { ok: true, x };
  };
  // sınırdaki güç: eyalette ve komşularında bulunan tümenler
  const sidePow = (t, prov) => { let v = 0; for (const n of [prov, ...P[prov].a]) for (const u of G.unitsAt[n] || []) if (u.t === t) v += G.unitPower(u); return v; };
  G.bcEscalate = (x, by) => {
    const st = G.st;
    st.bc = list().filter((y) => y !== x);
    const other = by === x.a ? x.b : x.a;
    st.goals[by + '>' + other] = st.day;
    G.declareWar(by, other);
    G.log(`${x.n} tam savaşa dönüştü.`, [x.a, x.b], 'major');
  };
  G.bcTick = () => {
    const st = G.st; if (!st.bc || !st.bc.length) return;
    for (const x of st.bc.slice()) {
      if (!alive(x.a) || !alive(x.b) || G.atWar(x.a, x.b)) { st.bc = st.bc.filter((y) => y !== x); continue; }
      if (!x.hist) {
        const pa = sidePow(x.a, x.prov), pb = sidePow(x.b, x.prov) * 1.15; // savunan avantajı
        x.sc += (pa - pb) / (pa + pb + 1) + (G.rand() - 0.5) * 0.3;
        // çatışmadaki birlikler yıpranır
        for (const n of [x.prov, ...P[x.prov].a]) for (const u of G.unitsAt[n] || []) if (u.t === x.a || u.t === x.b) { u.str = Math.max(0.3, u.str - 0.002); u._sd = -1; }
      }
      if (st.day < x.e) continue;
      st.bc = st.bc.filter((y) => y !== x);
      const win = x.hist ? x.win : x.sc > 2 ? x.a : x.sc < -2 ? x.b : null;
      if (x.hist) { G.log(`${x.n} sona erdi: ${win ? G.cname(win) + ' üstün geldi' : 'sonuçsuz'}.`, [x.a, x.b], 'major'); continue; }
      const A = st.C[x.a], B = st.C[x.b];
      if (win === x.a) {
        G.annex(x.a, x.b, (i) => i === x.prov);
        A.wsX += 0.05; B.wsX -= 0.03; B.stabX -= 0.03;
        G.log(`${x.n}: ${G.cname(x.a)} kazandı ve ${P[x.prov].n} eyaletini aldı.`, [x.a, x.b], 'major');
      } else if (win === x.b) {
        B.wsX += 0.05; A.wsX -= 0.04; A.stabX -= 0.03;
        G.log(`${x.n}: ${G.cname(x.b)} sınırı korudu, saldırı püskürtüldü.`, [x.a, x.b], 'major');
      } else G.log(`${x.n}: sonuçsuz bitti, cephe eski hâline döndü.`, [x.a, x.b], 'info');
      if (x.a === st.player || x.b === st.player) G.queuePopup({ art: win === st.player ? 'surrender' : 'war', title: x.n, text: win === st.player ? 'Sınırdaki çatışmayı kazandık. Ordumuzun itibarı yükseldi.' : win ? 'Sınırdaki çatışmayı kaybettik.' : 'Çatışma iki tarafın da kesin üstünlük kuramadığı bir ateşkesle bitti.', opts: [{ n: 'Tamam', fx: () => {} }] });
    }
    G.mapDirty = 1;
  };
  // tarihî sınır çatışmaları (yalnızca tarihî modda, YZ'ler arasında haber ve harita işareti; oyuncu taraf ise gerçek çatışma)
  const HIST = [
    ['hasan', '1938-07-29', 'JAP', 'SOV', 'Hunchun', 'Hasan Gölü Muharebesi', 'SOV', 14],
    ['khalkhin', '1939-05-11', 'MAN', 'MON', 'Hailar', 'Halhin Gol Muharebesi', 'MON', 128],
    ['franthai', '1940-11-23', 'SIA', 'FRA', 'Battambang', 'Fransız-Tay Savaşı', 'SIA', 60],
  ];
  G.bcHistTick = () => {
    const st = G.st; if (!st.opts.hist) return;
    for (const [id, d, a, b, near, n, win, days] of HIST) {
      const day = G.dayOf(d);
      if (st.day !== day || !alive(a) || !alive(b) || G.atWar(a, b)) continue;
      // çatışma eyaleti: savunanın, adı verilen yere komşu ya da kendisi olan eyaleti
      const k = P.findIndex((p) => p.n === near); if (k < 0) continue;
      const own = (i) => st.prov[i].c === b;
      const prov = own(k) ? k : P[k].a.find(own) ?? -1;
      if (prov < 0) continue;
      const pl = G.isHuman(a) || G.isHuman(b);
      G.bcStart(a, b, { prov, n, hist: pl ? 0 : 1, win, days, free: 1 });
    }
  };
  // YZ (tarihî olmayan modlar): saldırgan ideolojiler yılda bir zayıf komşularla sınır çatışması başlatabilir
  G.bcAi = () => {
    const st = G.st; if (st.opts.hist || st.day < 200) return;
    for (const c of Object.values(st.C)) {
      if (!c.alive || G.isHuman(c.tag) || c.enemies.length || (c.ideo !== 'fas' && c.ideo !== 'com') || G.rand() > 0.08) continue;
      if (c.lastBc && st.day - c.lastBc < 365) continue;
      const neigh = new Set(); for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag) for (const j of P[i].a) neigh.add(st.prov[j].c);
      const cands = [...neigh].filter((t) => t !== c.tag && alive(t) && G.bcAllowed(c.tag, t).ok && G.armyPower(t) < G.armyPower(c.tag) * 0.8);
      if (!cands.length) continue;
      const t = cands[Math.floor(G.rand() * cands.length)];
      if (G.bcStart(c.tag, t).ok) c.lastBc = st.day;
    }
  };
})(window);
