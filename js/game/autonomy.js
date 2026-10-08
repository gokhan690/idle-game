// Kuklalar ve özerklik (HOI4): efendi ülkeye bağlı devletlerin özerklik puanı (0-100) ve seviyesi.
// Seviye düştükçe efendi, bağlı devletin kaynaklarının ve askerî fabrikalarının daha büyük payını alır.
// Özerklik efendi zayıfladıkça (savaşta teslime yaklaşınca) ve bağlı devlet güçlendikçe artar; 100'e
// ulaşınca bağlı devlet bağımsızlığını ilan eder. Efendi siyasi güçle kontrolü sıkılaştırabilir ya da özerklik verebilir.
(function (g) {
  const G = g.G;
  const { NP } = G;
  G.AUTO_LV = [
    { n: 'Bütünleşik kukla', res: 0.6, mil: 0.4 },
    { n: 'Kukla', res: 0.4, mil: 0.25 },
    { n: 'Dominyon', res: 0.2, mil: 0.1 },
    { n: 'Özerk', res: 0.1, mil: 0.05 },
  ];
  G.autoLevel = (c) => Math.max(0, Math.min(3, Math.floor((c.auto ?? 30) / 25)));
  G.subjectsOf = (tag) => Object.values(G.st.C).filter((x) => x.alive && x.overlord === tag);
  // tarihî bağlı devletler (1936)
  const START = { MAN: ['JAP', 15], RAJ: ['ENG', 55], CAN: ['ENG', 80], AST: ['ENG', 80], NZL: ['ENG', 80], SAF: ['ENG', 78] };
  G.initSubjects = () => {
    const st = G.st;
    for (const [t, [o, a]] of Object.entries(START)) { const c = st.C[t]; if (c && c.alive && st.C[o]?.alive && !c.overlord) { c.overlord = o; c.auto = a; } }
  };
  // efendiye katkı: updateSummaries sonunda bağlı devletin kaynak ve askerî fabrika payı efendiye geçer
  G.subjectShares = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.overlord) continue;
      const o = st.C[c.overlord]; if (!o || !o.alive || G.atWar(c.tag, o.tag)) continue;
      const L = G.AUTO_LV[G.autoLevel(c)], s = c.sum, so = o.sum;
      const m = Math.floor(s.mil * L.mil); s.mil -= m; so.mil += m;
      for (const r of g.RES_KEYS) { const x = s.res[r] * L.res; s.res[r] -= x; so.res[r] += x; }
      s.steel = s.res.steel; s.oil = s.res.oil; so.steel = so.res.steel; so.oil = so.res.oil;
      c._share = { mil: m, res: L.res };
    }
  };
  const indep = (c, why) => {
    const st = G.st, o = c.overlord;
    c.overlord = null; c.auto = 100;
    if (c.leader && /yanlısı hükümet/.test(c.leader)) c.leader = g.COUNTRY_DEFS[c.tag]?.l || c.leader;
    G.needSummary = 1;
    const msg = `${G.cname(c.tag)} bağımsızlığını ilan etti (${why}).`;
    G.log(msg, [c.tag, o], c.tag === st.player || o === st.player ? 'major' : 'info');
    if (c.tag === st.player || o === st.player) G.queuePopup({ title: 'Bağımsızlık', text: msg, opts: [{ n: 'Tamam', fx: () => {} }] });
  };
  // 10 günde bir: özerklik değişimi, bağımsızlık, YZ efendilerin kontrolü
  G.autoTick = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.overlord) continue;
      const o = st.C[c.overlord];
      if (!o || !o.alive) { indep(c, 'efendi devlet yıkıldı'); continue; }
      if (G.atWar(c.tag, o.tag)) { indep(c, 'efendisine karşı savaşta'); continue; }
      let d = 0;
      if (o.enemies.length && (o.surrender || 0) > 0.3) d += 2 * Math.min(1, o.surrender); // efendi çöküyor
      if (c.sum.mil + c.sum.civ > 0.5 * (o.sum.mil + o.sum.civ)) d += 0.4; // bağlı devlet güçlü
      if ((c.pop?.[o.ideo] || 0) < 0.3) d += 0.2; // efendinin ideolojisine destek düşük
      if (o.sum.mil > 5 * Math.max(1, c.sum.mil)) d -= 0.15; // efendinin ezici üstünlüğü
      c.auto = Math.max(0, Math.min(100, (c.auto ?? 30) + d));
      if (c.auto >= 100) { indep(c, 'özerklik tamamlandı'); continue; }
      // YZ efendi: özerklik çok yükselirse siyasi güçle kontrolü sıkılaştırır
      if (o.tag !== st.player && c.auto > 70 && G.autoLevel(c) < 3 && o.pp >= 160 && !(c.autoCd > st.day)) { o.pp -= 50; c.auto -= 12; c.autoCd = st.day + 90; }
    }
  };
  // oyuncu eylemleri
  G.autoAct = (k, tag) => {
    const st = G.st, me = st.C[st.player], c = st.C[tag];
    if (!c || !me) return { ok: false };
    if (k === 'tight') { // efendi: kontrolü sıkılaştır
      if (c.overlord !== me.tag || me.pp < 50 || c.autoCd > st.day) return { ok: false };
      me.pp -= 50; c.auto = Math.max(0, (c.auto ?? 30) - 15); c.autoCd = st.day + 60; c.stabX -= 0.03;
    } else if (k === 'give') { // efendi: özerklik tanı (ilişki ve istikrar)
      if (c.overlord !== me.tag || c.autoCd > st.day) return { ok: false };
      c.auto = Math.min(99, (c.auto ?? 30) + 20); c.autoCd = st.day + 60; st.rel = st.rel || {}; st.rel[tag + '>' + me.tag] = (st.rel[tag + '>' + me.tag] || 0) + 15;
    } else if (k === 'free') { // efendi: bağımsızlık ver
      if (c.overlord !== me.tag) return { ok: false };
      indep(c, `${G.cname(me.tag)} bağımsızlık tanıdı`);
    } else if (k === 'push') { // bağlı devlet: özerklik iste
      if (me.overlord !== tag || me.pp < 60 || me.autoCd > st.day) return { ok: false };
      me.pp -= 60; me.auto = Math.min(100, (me.auto ?? 30) + 10); me.autoCd = st.day + 60;
      if (me.auto >= 100) indep(me, 'özerklik tamamlandı');
    } else return { ok: false };
    G.needSummary = 1;
    return { ok: true };
  };
})(window);
