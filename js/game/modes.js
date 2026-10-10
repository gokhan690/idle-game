// Oyun modları: zorluk seviyeleri, "Alternatif dünya" modu (YZ ülkeleri alternatif tarih yollarına girer)
// ve iç savaşlara dış müdahale (aynı ideolojideki büyük güçler taraflara silah ve gönüllü yollar).
(function (g) {
  const G = g.G;

  // ---------- Zorluk (HOI4: Kolay / Normal / Zor / Elit) ----------
  G.DIFF = [
    { n: 'Kolay', d: 'Sana +%15 fabrika, +%10 araştırma ve istikrar; yapay zekâ daha zayıf savaşır ve daha temkinli saldırır.', pl: { factory: 0.15, research: 0.1, stab: 0.1, ws: 0.05 }, ai: { factory: -0.1 }, cm: 0.9, aggr: 1.6 },
    { n: 'Normal', d: 'Tarihî denge: kimseye bonus yok.', pl: null, ai: null, cm: 1, aggr: 1.4 },
    { n: 'Zor', d: 'Büyük güçler +%10 fabrika ve +%5 araştırma alır, yapay zekâ daha iyi savaşır ve daha saldırgandır.', pl: { stab: -0.03 }, ai: { factory: 0.05 }, aiMajor: { factory: 0.1, research: 0.05 }, cm: 1.08, aggr: 1.25 },
    { n: 'Elit', d: 'Yapay zekâya +%20 fabrika, +%10 araştırma ve moral; sana istikrar ve savaş desteği cezası. Yalnızca tecrübeli komutanlar için.', pl: { stab: -0.08, ws: -0.05, factory: -0.05 }, ai: { factory: 0.2, research: 0.1, org: 0.05 }, cm: 1.15, aggr: 1.15 },
  ];
  const D = () => G.DIFF[G.st.opts.diff ?? 1] || G.DIFF[1];
  G.diffFx = (c) => { const d = D(); if (c.tag === G.st.player) return d.pl; return (c.major && d.aiMajor) || d.ai; };
  G.diffCombat = (tag) => (tag === G.st.player ? 1 : D().cm);
  G.diffAggr = () => D().aggr;

  // ---------- Alternatif dünya ----------
  // Alternatif köklerin listesi ve her kökün dalındaki odaklar
  const rootsOf = (tag) => (g.FOCUS_NATIONAL[tag] || []).filter((f) => f.alt && !f.pre.length).map((f) => f.id);
  const branch = {};
  const branchOf = (tag, root) => {
    const k = tag + ':' + root; if (branch[k]) return branch[k];
    const all = (g.FOCUS_NATIONAL[tag] || []).filter((f) => f.alt), ids = new Set([root]);
    let grew = 1; while (grew) { grew = 0; for (const f of all) if (!ids.has(f.id) && f.pre.length && f.pre.some((p) => ids.has(p))) { ids.add(f.id); grew = 1; } }
    return (branch[k] = ids);
  };
  G.altSetup = () => {
    const st = G.st; if (!st.opts.alt) return;
    const cands = Object.keys(g.FOCUS_NATIONAL).filter((t) => t !== st.player && st.C[t]?.alive && rootsOf(t).length);
    const n = Math.min(cands.length, 4 + Math.floor(G.rand() * 3));
    st.altPlan = {};
    for (let k = 0; k < n; k++) {
      const i = Math.floor(G.rand() * cands.length), t = cands.splice(i, 1)[0], rs = rootsOf(t);
      st.altPlan[t] = { root: rs[Math.floor(G.rand() * rs.length)], day: 20 + Math.floor(G.rand() * 520) };
    }
  };
  // YZ odak seçimi: planı olan ülke zamanı gelince alternatif dalı izler
  G.altAiPick = (c, list) => {
    const st = G.st; if (!st.opts.alt || !st.altPlan) return null;
    const p = st.altPlan[c.tag]; if (!p || st.day < p.day) return null;
    const ids = branchOf(c.tag, p.root);
    const f = list.find((x) => ids.has(x.id) && G.focusAvailable(c, x));
    if (!f && !c.focus.done[p.root]) delete st.altPlan[c.tag]; // kök artık alınamıyor (tarihî yol seçildi)
    return f || null;
  };
  // planlı ülke, alternatif kökü dışlayan tarihî odakları almaz
  G.altBlocked = (c, f) => {
    const st = G.st; if (!st.opts.alt || !st.altPlan) return false;
    const p = st.altPlan[c.tag]; if (!p || c.focus.done[p.root]) return false;
    const r = (g.FOCUS_NATIONAL[c.tag] || []).find((x) => x.id === p.root);
    return !!(r && r.excl && r.excl.includes(f.id));
  };
  // dünya haberi: bir YZ ülkesi alternatif yola girdi
  G.altRootNews = (c, f) => {
    const st = G.st;
    if (c.tag === st.player || !st.player) return;
    G.log(`${G.cname(c.tag)} alternatif bir yola girdi: ${f.n}.`, [c.tag], 'major');
    if (!G.newsOn || st._newsDay === st.day) return;
    st._newsDay = st.day;
    G.queuePopup({ news: 1, art: 'politics', eyebrow: 'Dünya haberleri · ' + G.fmtDate(st.day), title: `${G.cname(c.tag)}: ${f.n}`, text: f.d, opts: [{ n: 'Dünya değişiyor', fx: () => {} }] });
  };

  // ---------- İç savaşlara dış müdahale ----------
  G.civilAid = () => {
    const st = G.st; if (!st.civil || !st.civil.length) return;
    // taraflardan biri başka yoldan yok olduysa dinamik iç savaş kaydı kapanır
    st.civil = st.civil.filter((p) => p[2] == null || (st.C[p[0]]?.alive && st.C[p[1]]?.alive));
    st.cwVol = st.cwVol || {};
    for (const pr of st.civil) {
      const [a, b] = pr; if (!pr[2] && pr[2] !== 0) continue; // tarihî İspanya İç Savaşı kendi yardımını alır
      if (!st.C[a]?.alive || !st.C[b]?.alive) continue;
      for (const m of Object.values(st.C)) {
        if (!m.alive || !m.major || m.tag === st.player || m.tag === a || m.tag === b || m.enemies.length) continue;
        const side = [a, b].find((t) => st.C[t].ideo === m.ideo && st.C[t === a ? b : a].ideo !== m.ideo);
        if (!side) continue;
        G.lend(m.tag, side, 'inf', 500); G.lend(m.tag, side, 'art', 10);
        const k = m.tag + '>' + side;
        if (!st.cwVol[k] && G.sendVolunteers && G.volCheck(m.tag, side, { force: 1 }).ok) {
          const r = G.sendVolunteers(m.tag, side, 2, { force: 1 });
          if (r && r.ok) { st.cwVol[k] = 1; G.log(`${G.cname(m.tag)}, ${G.cname(side)} saflarına ${r.n} gönüllü tümen gönderdi.`, [m.tag, side], 'info'); }
        }
      }
    }
  };
})(window);
