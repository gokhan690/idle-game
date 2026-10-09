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
// Hatta yayılma (HOI4 cephe hattı): seçili tümenler, hedef noktaya en yakın sınır parçası boyunca eşit dağılır.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  G.spreadLine = (us, n, tag) => {
    const st = G.st;
    if (!us.length || n < 0 || n >= NP) return { ok: false, why: 'Bir kara eyaletine dokun' };
    const own = (i) => st.prov[i].c === tag || (G.friendly(tag, st.prov[i].c) && !G.atWar(tag, st.prov[i].c));
    // hangi ülkeye karşı: dokunulan yer yabancıysa onun sahibi, değilse savaştaki düşmanlar ya da en yakın yabancı komşu
    const vs = own(n) ? null : st.prov[n].c;
    let F;
    if (vs || G.st.C[tag].enemies.length) F = new Set(G.frontier(tag, vs));
    else { F = new Set(); for (let i = 0; i < NP; i++) if (own(i) && P[i].a.some((j) => !own(j))) F.add(i); } // barışta: bütün yabancı sınırlar
    if (!F.size) return { ok: false, why: 'Yakında sınır hattı yok' };
    // dokunulan yere en yakın sınır eyaletinden başlayıp hat boyunca komşu sınır eyaletlerini topla
    const want = Math.max(1, Math.min(F.size, Math.ceil(us.length / 2)));
    const start = [...F].sort((a, b) => G.dist(a, n) - G.dist(b, n))[0];
    const seg = [start], seen = new Set([start]);
    for (let k = 0; k < seg.length && seg.length < want; k++) {
      const nb = P[seg[k]].a.filter((j) => F.has(j) && !seen.has(j)).sort((a, b) => G.dist(a, n) - G.dist(b, n));
      for (const j of nb) { if (seg.length >= want) break; seen.add(j); seg.push(j); }
    }
    // hat kopuksa en yakın diğer sınır eyaletleriyle tamamla
    // hat kısa ya da kopuksa yalnızca yakındaki (~450 km) diğer sınır eyaletleriyle tamamla; yoksa eyalet başına daha çok tümen
    if (seg.length < want) for (const j of [...F].sort((a, b) => G.dist(a, n) - G.dist(b, n))) { if (seg.length >= want || G.dist(j, start) > 45) break; if (!seen.has(j)) { seen.add(j); seg.push(j); } }
    // yuvalar: her eyalete sırayla; tümenler en yakın boş yuvaya
    const slots = []; for (let k = 0; k < us.length; k++) slots.push(seg[k % seg.length]);
    const left = us.slice(); let ok = 0;
    for (const sl of slots) {
      let bi = -1, bd = Infinity;
      for (let k = 0; k < left.length; k++) { const d = G.dist(left[k].loc, sl); if (d < bd) { bd = d; bi = k; } }
      if (bi < 0) break;
      const u = left.splice(bi, 1)[0];
      if (u.loc === sl) { u.path = []; ok++; continue; }
      const p = G.findPath(u.loc, sl, u.t, G.unitStats(u).spd, { naval: false });
      if (p && p.length) { u.path = p; u.prog = 0; u.auto = 0; u.gar = 0; ok++; }
    }
    return { ok: ok > 0, n: ok, segs: seg.length, vs, why: ok ? '' : 'Tümenler hatta ulaşamıyor' };
  };
})(window);
