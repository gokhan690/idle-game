// Genel iç savaş (HOI4): alternatif tarih yolunda eski rejim yanlıları ülkenin bir bölümünü alıp ayaklanır.
// Asi ülke oyun sırasında yaratılır (dinamik ülke tanımı st.dyn'de saklanır, kayıt yüklenince yeniden kaydedilir).
// Taraflardan biri teslim olunca öteki ülkenin tamamını alır (st.civil).
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

  // dinamik ülke tanımlarını kaydet / temizle
  G.dynRegister = (st) => { for (const [t, d] of Object.entries((st && st.dyn) || {})) g.COUNTRY_DEFS[t] = d; };
  G.dynClear = () => { for (const [t, d] of Object.entries(g.COUNTRY_DEFS)) if (d.dyn) delete g.COUNTRY_DEFS[t]; };

  // c: iç savaşa giren ülke; o: { n: asi adı, l: lider, id: ideoloji, share: toprak payı }
  G.civilWar = (c, o) => {
    const st = G.st, tag = c.tag;
    let rt = tag + 'X', k = 2; while (st.C[rt] && st.C[rt].alive) rt = tag + 'X' + k++;
    const base = g.COUNTRY_DEFS[tag];
    const def = Object.assign({}, base, { n: o.n, l: o.l, id: o.id, c: darken(base.c || '#777777', 0.62), hidden: 1, major: 0, dyn: 1, cap: null });
    g.COUNTRY_DEFS[rt] = def; (st.dyn || (st.dyn = {}))[rt] = def;
    const r = G.newCountry(rt); st.C[rt] = r;
    r.ideo = o.id; r.leader = o.l; r.pop[o.id] = 0.7; G.normalizePop(r);
    // başkente kara yoluyla bağlı ana yurt (sömürgeler hariç); en uzak ucundan başlayıp payı kadar bitişik bölge seç
    const ownSet = new Set(); for (let i = 0; i < NP; i++) if (st.prov[i].o === tag && st.prov[i].c === tag) ownSet.add(i);
    const home = [c.cap], hs = new Set(home);
    for (let h = 0; h < home.length; h++) for (const j of P[home[h]].a) if (ownSet.has(j) && !hs.has(j)) { hs.add(j); home.push(j); }
    const want = Math.max(2, Math.min(home.length - 2, Math.round(home.length * (o.share || 0.3))));
    let seed = home[home.length - 1], bd = -1; for (const i of home) { const d = G.dist(i, c.cap); if (d > bd) { bd = d; seed = i; } }
    const pick = new Set([seed]), q = [seed];
    for (let h = 0; h < q.length && pick.size < want; h++) for (const j of P[q[h]].a) { if (pick.size >= want) break; if (hs.has(j) && !pick.has(j) && j !== c.cap) { pick.add(j); q.push(j); } }
    G.release(rt, tag, (i) => pick.has(i));
    // asi bölgesindeki birlikler ve ordunun payı kadar tümen ayaklanmaya katılır (bölge dışındakiler asi topraklarına geçer); üstüne milis tümenleri
    const pl = [...pick], mine = st.units.filter((u) => u.t === tag && u.loc < NP), sh = o.share || 0.3;
    const quota = Math.round(mine.length * sh);
    const flip = (u, loc) => { u.t = rt; u.auto = 1; u.army = 0; u.path = []; u.gar = 0; u.prog = 0; if (loc != null) u.loc = loc; };
    let n = 0; for (const u of mine) if (pick.has(u.loc)) { flip(u); n++; }
    for (let k = 0, i = 0; n < quota && i < mine.length; i++) { const u = mine[(i * 7) % mine.length]; if (u.t === tag) { flip(u, pl[k++ % pl.length]); n++; } }
    const mil = Math.max(4, Math.round(mine.length * sh * 0.5));
    for (let k = 0; k < mil; k++) st.units.push(G.makeUnit(rt, k % 4 === 3 ? 'art' : 'inf', pl[k % pl.length], 0.9));
    r.stock.inf += 2500; r.stock.art += 60;
    if (c.ships && r.ships) { for (const e of ['dd', 'cr', 'ss']) { const m = Math.floor((c.ships[e] || 0) * 0.3); c.ships[e] -= m; r.ships[e] = (r.ships[e] || 0) + m; } }
    G.rebuildUnitIndex(); G.updateSummaries(); G.needSummary = 1;
    G.setWar(rt, tag);
    st.civil = (st.civil || []).concat([[rt, tag, st.day]]);
    G.cwDirty = 1; c.startW = G.coreWeight(tag, true); r.startW = G.coreWeight(rt, true);
    // aynı ideolojideki büyük güçler asilere teçhizat yollar
    for (const m of Object.values(st.C)) if (m.alive && m.major && m.tag !== tag && m.ideo === o.id && G.lend) G.lend(m.tag, rt, 'inf', 800);
    G.mapDirty = 1;
    G.log(`${G.cname(tag)} iç savaşa sürüklendi: ${o.n} (${o.l}) ayaklandı!`, [tag, rt], 'major');
    if (tag === st.player || rt === st.player) G.queuePopup({ art: 'war', title: `${G.cname(tag)} İç Savaşı`, text: `Eski rejim yanlıları yeni hükümeti tanımıyor. ${o.l} önderliğindeki ${o.n} ülkenin ${pick.size} eyaletinde ayaklandı; bölgedeki birliklerin bir kısmı onlara katıldı. İç savaşı kazanan bütün ülkeyi alır.`, opts: [{ n: 'İsyanı bastıracağız', fx: () => {} }] });
    return rt;
  };

  // HOI4: alternatif tarih yoluna giren ülkenin kendi tarihî olayları kapanır (dünyanın geri kalanı tarihî akışa devam eder)
  G.closeHistEvents = (c) => {
    const st = G.st; let n = 0;
    for (const e of G.EVENTS || []) if (e.actor === c.tag && !st.ev[e.id]) { st.ev[e.id] = 1; n++; }
    c.altPath = 1;
    if (c.tag === st.player && n) G.log(`Alternatif tarih yolu: ${G.cname(c.tag)} için ${n} tarihî olay artık gerçekleşmeyecek; dünyanın geri kalanı tarihî akışını sürdürüyor.`, [c.tag], 'info');
  };
})(window);
