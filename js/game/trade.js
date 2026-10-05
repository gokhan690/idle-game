// Kaynaklar ve uluslararası ticaret: ihracat havuzu, ticaret anlaşmaları, konvoylar.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const RK = g.RES_KEYS;

  // ---------- Eyalet kaynakları (statik) ----------
  G.PR = P.map((p) => {
    const r = { steel: p.st || 0, oil: p.oil || 0, al: 0, rub: 0, tun: 0, chr: 0 };
    for (const [k, a, b, c, d, v] of g.RES_ZONES) if (p.lon >= a && p.lon <= c && p.lat >= b && p.lat <= d) r[k] += v;
    return r;
  });
  // ---------- Kara kütleleri (deniz aşırı ticaret için) ----------
  const lm = new Int32Array(NP).fill(-1);
  {
    let id = 0;
    for (let i = 0; i < NP; i++) {
      if (lm[i] >= 0) continue;
      const q = [i]; lm[i] = id;
      for (let k = 0; k < q.length; k++) for (const j of P[q[k]].a) if (lm[j] < 0) { lm[j] = id; q.push(j); }
      id++;
    }
  }
  G.landmass = lm;
  G.overseas = (a, b) => {
    const ca = G.st.C[a], cb = G.st.C[b];
    if (!ca || !cb || ca.cap < 0 || cb.cap < 0) return true;
    return lm[ca.cap] !== lm[cb.cap];
  };

  // ---------- Anlaşmalar ----------
  // G.st.deals: [{i: alıcı, e: satıcı, r: kaynak, n: miktar}] ; 8 birim = 1 sivil fabrika
  G.dealCiv = (n) => Math.ceil(n / 8);
  // Satılabilir miktar: ticaret yasası sınırı ve ülkenin kendi ihtiyacı
  G.exportPool = (c, r) => {
    const prod = c.sum.res ? c.sum.res[r] : 0;
    const own = c.econ && c.econ.need ? c.econ.need[r] : 0;
    return Math.max(0, Math.min(prod * (c.mods.expCap ?? 0.5), prod - own));
  };
  G.committed = () => {
    const out = {};
    for (const d of G.st.deals) { const o = out[d.e] || (out[d.e] = {}); o[d.r] = (o[d.r] || 0) + d.n; }
    return out;
  };
  G.refreshTradeCache = () => { G._sold = G.committed(); };
  G.exportFree = (tag, r, comm) => {
    const c = G.st.C[tag];
    comm = comm || G.committed();
    return Math.max(0, G.exportPool(c, r) - ((comm[tag] || {})[r] || 0));
  };
  G.canTradeWith = (imp, exp) => {
    const st = G.st;
    if (imp === exp || !st.C[exp]?.alive || G.atWar(imp, exp)) return false;
    if (st.embargo && st.embargo[exp + '>' + imp]) return false;
    for (const e of st.C[imp].enemies) if (G.sameFaction(e, exp)) return false;
    return G.opinion(exp, imp) > -45;
  };
  G.addDeal = (imp, exp, r, n) => {
    const st = G.st;
    const d = st.deals.find((x) => x.i === imp && x.e === exp && x.r === r);
    if (d) d.n += n; else st.deals.push({ i: imp, e: exp, r, n });
  };
  G.cancelDeal = (k) => { G.st.deals.splice(k, 1); };

  // Konvoy ihtiyacı ve teslim oranı
  G.convoyNeed = (tag, fresh) => {
    if (!fresh && G._conv && G._convDay === G.st.day) return G._conv[tag] || 0;
    let need = 0;
    for (const d of G.st.deals) if (d.i === tag && G.overseas(tag, d.e)) need += d.n * 0.5;
    for (const u of G.st.units) if (u.t === tag && (u.loc >= NP || (u.path[0] >= NP))) need += 5;
    return need;
  };
  G.precomputeTrade = () => {
    const st = G.st, cv = {};
    for (const d of st.deals) if (G.overseas(d.i, d.e)) cv[d.i] = (cv[d.i] || 0) + d.n * 0.5;
    for (const u of st.units) if (u.loc >= NP || u.path[0] >= NP) cv[u.t] = (cv[u.t] || 0) + 5;
    G._conv = cv; G._convDay = st.day;
    G._sold = G.committed();
  };
  G.importsOf = (c) => {
    const st = G.st;
    const imp = {}; for (const r of RK) imp[r] = 0;
    let civ = 0, conv = 0;
    const need = G.convoyNeed(c.tag);
    const convRatio = need > 0 ? Math.min(1, (c.ships.conv || 0) / need) : 1;
    for (const d of st.deals) {
      if (d.i !== c.tag) continue;
      civ += G.dealCiv(d.n);
      const sea = G.overseas(c.tag, d.e);
      const f = sea ? convRatio * (1 - (c.raid || 0)) : 1;
      imp[d.r] += d.n * f;
      if (sea) conv += d.n * 0.5;
    }
    let expCiv = 0;
    for (const d of st.deals) if (d.e === c.tag) expCiv += G.dealCiv(d.n);
    return { imp, civ, expCiv, conv, convRatio };
  };

  // Haftalık ticaret: geçersiz anlaşmaları iptal et, YZ ve otomatik ticaret
  G.tradeTick = () => {
    const st = G.st;
    st.deals = st.deals.filter((d) => G.canTradeWith(d.i, d.e) && st.C[d.i]?.alive && d.n > 0);
    // satıcı havuzu aşıldıysa kırp
    const comm = G.committed();
    for (const [tag, rs] of Object.entries(comm)) for (const [r, n] of Object.entries(rs)) {
      const pool = G.exportPool(st.C[tag], r);
      if (n > pool + 0.5) { let over = n - pool; for (let k = st.deals.length - 1; k >= 0 && over > 0; k--) { const d = st.deals[k]; if (d.e !== tag || d.r !== r) continue; const cut = Math.min(d.n, Math.ceil(over)); d.n -= cut; over -= cut; } }
    }
    st.deals = st.deals.filter((d) => d.n > 0);
    G.refreshTradeCache();
    for (const c of Object.values(st.C)) {
      if (!c.alive) continue;
      if (c.tag === st.player && !c.auto.trade) continue;
      G.autoTrade(c);
    }
    G.refreshTradeCache();
  };
  G.autoTrade = (c) => {
    const st = G.st;
    const e = G.econCalc(c);
    const budget = Math.floor(e.civGross * 0.5);
    let spent = e.trade;
    const comm = G.committed();
    for (const r of RK) {
      let def = e.need[r] - e.have[r];
      if (def > 0.05) {
        const cands = Object.values(st.C).filter((x) => x.alive && G.canTradeWith(c.tag, x.tag)).map((x) => ({ t: x.tag, free: G.exportFree(x.tag, r, comm) })).filter((x) => x.free >= 1).sort((a, b) => b.free - a.free);
        for (const x of cands) {
          if (def <= 0 || spent >= budget) break;
          const n = Math.min(x.free, Math.max(4, Math.ceil(def * 1.25)), (budget - spent) * 8);
          if (n < 1) break;
          G.addDeal(c.tag, x.t, r, Math.floor(n));
          (comm[x.t] || (comm[x.t] = {}))[r] = ((comm[x.t] || {})[r] || 0) + n;
          spent += G.dealCiv(n); def -= n;
        }
      } else if (def < -16) {
        const k = st.deals.findIndex((d) => d.i === c.tag && d.r === r);
        if (k >= 0) { const d = st.deals[k]; const cut = Math.min(d.n, Math.floor(-def - 8)); d.n -= cut; if (d.n <= 0) st.deals.splice(k, 1); }
      }
    }
  };
})(window);
