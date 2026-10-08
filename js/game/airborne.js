// Hava indirme (HOI4): paraşütçü taburlarından oluşan tümenler, hava üssü olan bir eyaletten 500 km içindeki
// bir eyalete atlar. Hedef bölgede hava üstünlüğü gerekir; düşman birliği bulunan eyalete atlanamaz.
// Atlayan tümen hedefi ele geçirir ama morali çok düşük iner; düşman hattının gerisinde ikmalsiz kalabilir.
(function (g) {
  const G = g.G;
  const { NP } = G;
  G.PARA_KM = 500;
  G.isPara = (u) => (G.T(u.t, u.u).para || 0) >= 0.75;
  G.paraCheck = (u, n) => {
    const st = G.st, pr = st.prov[u.loc], s = G.unitStats(u);
    if (!G.isPara(u)) return { ok: false, why: 'Yalnızca paraşüt tümenleri atlayabilir' };
    if (u.loc >= NP || !pr || !(pr.ab > 0) || !(pr.c === u.t || G.friendly(u.t, pr.c))) return { ok: false, why: 'Tümen hava üssü olan bir dost eyalette olmalı' };
    if (u.path.length || (G.inBattle && G.inBattle.has(u))) return { ok: false, why: 'Hareket hâlindeki ya da muharebedeki tümen atlayamaz' };
    if (u.paraCd > st.day) return { ok: false, why: `Tümen yeniden toplanıyor (${u.paraCd - st.day} gün)` };
    if (u.org < s.org * 0.7) return { ok: false, why: 'Moral en az %70 olmalı' };
    if (n == null) return { ok: true };
    if (n < 0 || n >= NP || n === u.loc) return { ok: false, why: 'Hedef bir kara eyaleti olmalı' };
    const tp = st.prov[n];
    if (!(tp.c === u.t || G.friendly(u.t, tp.c) || G.atWar(u.t, tp.c))) return { ok: false, why: 'Savaşta olmadığın bir ülkeye atlanamaz' };
    if (G.hostileIn(n, u.t)) return { ok: false, why: 'Hedefte düşman birlikleri var' };
    const km = G.km(u.loc, n);
    if (km > G.PARA_KM) return { ok: false, why: `Menzil dışında (${Math.round(km)} km > ${G.PARA_KM} km)` };
    const r = G.regionOf ? G.regionOf(n) : -1;
    if (G.atWar(u.t, tp.c) && r >= 0 && G.airSup(u.t, r) < 0.4) return { ok: false, why: 'Hedef bölgede hava üstünlüğü yok (en az %40)' };
    return { ok: true };
  };
  G.paraDrop = (u, n) => {
    const r = G.paraCheck(u, n); if (!r.ok) return r;
    const st = G.st, s = G.unitStats(u), from = u.loc;
    const L = G.unitsAt[from]; if (L) { const k = L.indexOf(u); if (k >= 0) L.splice(k, 1); }
    u.loc = n; u.path = []; u.prog = 0; u.ent = 0; u.sr = 0; u.gar = 0;
    (G.unitsAt[n] || (G.unitsAt[n] = [])).push(u);
    u.org = s.org * 0.3; u.str = Math.max(0.05, u.str * 0.95); u.paraCd = st.day + 20;
    G.capture(n, u.t);
    G.mapDirty = 1;
    return { ok: true };
  };
})(window);
