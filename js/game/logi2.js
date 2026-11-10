// Ekonomi derinliği (HOI4): lojistik özeti (stok / ihtiyaç / üretim), şablon başına takviye önceliği ve lisanslı üretim.
// Hepsi isteğe bağlı durum (c.rp, c.lic) üzerinden çalışır; kullanılmadıkça simülasyon değişmez.
(function (g) {
  const G = g.G;
  // teçhizat başına: stok, eksik (tümenleri tam güce çıkarmak + eğitimdekiler), günlük üretim, kaç günde kapanır
  G.logistics = (c) => {
    const st = G.st, m = c.mods, need = {}, field = {}, prod = {};
    for (const u of st.units) {
      if ((u.vol || u.t) !== c.tag) continue;
      const def = G.T(u.t, u.u);
      for (const [e, n] of Object.entries(def.eq)) { need[e] = (need[e] || 0) + n * Math.max(0, 1 - u.str); field[e] = (field[e] || 0) + n * u.str; }
    }
    for (const t of c.train || []) { const def = G.T(c.tag, t.u); for (const [e, n] of Object.entries(def.eq)) need[e] = (need[e] || 0) + n; }
    for (const l of c.lines) {
      const eq = g.EQUIP[l.e]; if (eq.ship || eq.convoy || !l.f) continue;
      prod[l.e] = (prod[l.e] || 0) + (l.f * 4.5 * l.eff * (1 + (m.factory || 0)) * (l.lic ? G.LIC_EFF : 1)) / (eq.cost * G.lineCostMul(c, l));
    }
    const keys = [...new Set([...Object.keys(need), ...Object.keys(prod), ...Object.keys(c.stock || {})])].filter((e) => g.EQUIP[e] && !g.EQUIP[e].ship && !g.EQUIP[e].convoy);
    return keys.map((e) => {
      const stock = c.stock[e] || 0, n = need[e] || 0, p = prod[e] || 0, gap = Math.max(0, n - stock);
      return { e, stock, need: n, field: field[e] || 0, prod: p, gap, days: gap <= 0 ? 0 : p > 0 ? Math.ceil(gap / p) : Infinity };
    }).filter((r) => r.stock >= 1 || r.need >= 1 || r.prod > 0).sort((a, b) => b.gap - a.gap || b.need - a.need);
  };
  // takviye önceliği (şablon başına): 0 düşük, 1 normal, 2 yüksek
  G.RP_N = ['Düşük', 'Normal', 'Yüksek'];
  G.RP_MUL = [0.4, 1, 1.6];
  G.rpOf = (c, tid) => (c.rp && c.rp[tid] != null ? c.rp[tid] : 1);
  // düşük öncelikli şablon, stok kıtken (eksik varken) hiç almaz: önce diğerleri dolar
  G.rpMul = (u) => {
    const c = G.st.C[u.vol || u.t]; if (!c || !c.rp) return 1;
    return G.RP_MUL[G.rpOf(c, u.u)] ?? 1;
  };

  // lisanslı üretim: dost bir ülkenin daha ileri teçhizat modelini üret (siyasi güç karşılığı; verim düşük)
  G.LIC_EFF = 0.8; G.LIC_PP = 40;
  G.licAllowed = (a, t, e) => {
    const st = G.st, c = st.C[a], x = st.C[t], eq = g.EQUIP[e];
    if (!c || !x || !x.alive || a === t || !eq || eq.ship || eq.convoy || (G.DESIGNABLE && G.DESIGNABLE.has(e))) return { ok: false, why: 'Uygun değil' };
    if (G.atWar(a, t)) return { ok: false, why: 'Savaştasınız' };
    const mine = c.mods['eq_' + e] || 1, theirs = x.mods['eq_' + e] || 1;
    if (!(x.mods.unlockEq[e] || theirs > 1) || theirs <= mine) return { ok: false, why: 'Bu ülkenin modeli seninkinden ileri değil' };
    if (c.lic && c.lic[e] && c.lic[e].lv >= theirs) return { ok: false, why: 'Bu lisans zaten sende' };
    if (G.opinion(t, a) < 10 && !G.sameFaction(a, t)) return { ok: false, why: `${G.cname(t)} ile ilişkiler yetersiz (görüş 10 ve üstü ya da aynı ittifak)` };
    if ((c.pp || 0) < G.LIC_PP) return { ok: false, why: `${G.LIC_PP} siyasi güç gerekli` };
    return { ok: true, lv: theirs };
  };
  G.licBuy = (a, t, e) => {
    const r = G.licAllowed(a, t, e); if (!r.ok) return r;
    const c = G.st.C[a];
    c.pp -= G.LIC_PP; (c.lic || (c.lic = {}))[e] = { from: t, lv: r.lv };
    c.mods.unlockEq[e] = 1;
    G.log(`${G.cname(a)}, ${G.cname(t)} ülkesinden ${g.EQUIP[e].n} üretim lisansı aldı.`, [a, t], 'info');
    return { ok: true, lv: r.lv };
  };
  // lisans sahibiyle savaş çıkarsa lisans düşer; hatlar kendi modeline döner
  G.licTick = (c) => {
    if (!c.lic) return;
    for (const [e, L] of Object.entries(c.lic)) {
      const own = c.mods['eq_' + e] || 1;
      if (G.atWar(c.tag, L.from) || own >= L.lv) {
        delete c.lic[e];
        for (const l of c.lines) if (l.e === e && l.lic) { delete l.lic; l.lv = Math.min(l.lv || own, own); }
        if (G.isHuman(c.tag)) G.log(own >= L.lv ? `${g.EQUIP[e].n}: kendi modelin lisanslı modele yetişti; lisans gereksiz kaldı.` : `${g.EQUIP[e].n} lisansı iptal oldu (${G.cname(L.from)} ile savaş).`, [c.tag], 'info');
      }
    }
    if (!Object.keys(c.lic).length) delete c.lic;
  };
})(window);
