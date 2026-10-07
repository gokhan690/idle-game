// İşgal: direniş ve uyum (HOI4 tarzı).
// Asli toprağı olmayan bir ülkenin kontrolündeki eyaletlerde direniş birikir. Garnizon (eyalette ya da
// komşuda işgalci birlik) ve zamanla artan uyum direnişi bastırır. Direniş, eyaletten alınan sanayi ve
// kaynakları ve ikmal merkezlerini zayıflatır; yüksek direniş demiryolu sabotajına ve garnizon kayıplarına yol açar.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // güçlü partizan hareketleri olan halklar
  const PARTISAN = { SOV: 0.15, YUG: 0.2, CHI: 0.12, PRC: 0.12, GRE: 0.1, POL: 0.12, ALB: 0.1, ETH: 0.15, PHI: 0.1, FRA: 0.05, NOR: 0.05, CZE: 0.05, BEL: 0.03, HOL: 0.03 };
  G.OCC_PARTISAN = PARTISAN;

  // işgal altında mı (direniş birikebilir mi)
  G.isOccupied = (i) => {
    const st = G.st, pr = st.prov[i];
    if (!pr.core || pr.core === pr.c) return false;
    const c = st.C[pr.c]; if (!c) return false;
    if (G.sameFaction(pr.core, pr.c)) return false;
    const k = st.C[pr.core];
    if (k && (k.overlord === pr.c || c.overlord === pr.core)) return false; // kukla-efendi
    return true;
  };

  // Her 10 günde bir: direniş ve uyum güncellemesi
  G.occTick = () => {
    const st = G.st;
    const sab = {};
    const has = (n, tag) => { const L = G.unitsAt[n]; if (!L) return false; for (const u of L) if (u.t === tag || G.sameFaction(u.t, tag)) return true; return false; };
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (!G.isOccupied(i)) { if (pr.rs != null) { delete pr.rs; delete pr.cp; delete pr.sab; } continue; }
      const c = st.C[pr.c];
      if (pr.rs == null) { pr.rs = 0; pr.cp = 0; }
      // garnizon
      const gar = has(i, pr.c) ? 1 : P[i].a.some((j) => has(j, pr.c)) ? 0.6 : 0;
      const core = st.C[pr.core];
      const exile = core && core.alive && G.atWar(pr.core, pr.c);
      let tgt = 0.2 + (exile ? 0.15 : 0) + (PARTISAN[pr.core] || 0) + (P[i].vp >= 10 ? 0.08 : 0) + (c.mods.resist || 0);
      tgt *= (1 - 0.45 * gar) * (1 - 0.7 * pr.cp);
      tgt = clamp(tgt, 0, 0.9);
      pr.rs += (tgt - pr.rs) * 0.08;
      pr.cp = clamp(pr.cp + (pr.rs < 0.25 ? 0.008 : pr.rs > 0.45 ? -0.006 : 0.002) + (c.mods.comply || 0) * 0.01, 0, 0.8);
      // garnizon kayıpları (insan gücü)
      c.dead += pr.rs * pr.rs * 0.4;
      // sabotaj: demiryolu ve ikmal merkezleri bir süre aksar
      if (pr.rs > 0.4 && (!pr.sab || pr.sab < st.day) && G.rand() < (pr.rs - 0.4) * 0.3) {
        pr.sab = st.day + 30;
        sab[pr.c] = (sab[pr.c] || 0) + 1;
      }
    }
    G.needSummary = 1;
    const pl = st.player;
    if (pl && sab[pl]) G.log(`Direniş: işgal altındaki topraklarımızda ${sab[pl]} sabotaj eylemi; demiryolları bir süre aksayacak.`, [pl], 'warn');
  };
  // üretim çarpanı (updateSummaries) ve ikmal çarpanı (logistics)
  G.occMul = (pr) => (pr.rs == null ? 1 : (1 - 0.6 * pr.rs) * (1 + 0.8 * pr.cp));
  G.occSup = (pr, day) => (pr.rs == null ? 1 : (1 - 0.5 * pr.rs) * (pr.sab && pr.sab >= day ? 0.6 : 1));
  // ülke özeti
  G.occSummary = (tag) => {
    const st = G.st; let n = 0, rs = 0, cp = 0, sab = 0;
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c !== tag || pr.rs == null) continue; n++; rs += pr.rs; cp += pr.cp; if (pr.sab >= st.day) sab++; }
    return { n, rs: n ? rs / n : 0, cp: n ? cp / n : 0, sab };
  };
})(window);
