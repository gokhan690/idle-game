// Kararlar motoru: alma, süreli kararlar, bekleme süreleri ve yapay zekâ.
// Veri: js/data/decisions.js (g.DECISIONS). Durum: c.dec = [{id, t, s, e}] süren kararlar, c.decCd = {id: yeniden alınabileceği gün}.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  // ---------- Yardımcılar (kararların etkileri) ----------
  // Eyaletleri sınırdaki yabancı komşuya göre tahkim et: pred(komşuyu denetleyen etiket)
  G.decFortN = (c, pred) => {
    const st = G.st; let n = 0;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag || pr.fort >= 5) continue;
      if (P[i].a.some((j) => st.prov[j].c !== c.tag && pred(st.prov[j].c))) n++;
    }
    return n;
  };
  G.decForts = (c, lv, pred) => {
    const st = G.st;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag) continue;
      if (P[i].a.some((j) => st.prov[j].c !== c.tag && pred(st.prov[j].c))) pr.fort = Math.min(5, pr.fort + lv);
    }
  };
  // Tehdit: savaştaki düşman, aleyhimize gerekçe kazanan ya da farklı ittifaktaki büyük güç
  G.decThreat = (c) => (o) => G.atWar(c.tag, o) || !!G.st.goals[o + '>' + c.tag] || (!G.friendly(c.tag, o) && !!G.st.C[o]?.alive && !!G.st.C[o].major);
  G.decNotFriend = (c) => (o) => !!G.st.C[o]?.alive && !G.friendly(c.tag, o);
  G.decWestWall = (o) => o === 'FRA' || o === 'BEL' || o === 'LUX' || o === 'HOL' || o === 'SWI';
  G.decMaginot = (o) => o === 'GER' || o === 'BEL' || o === 'LUX' || o === 'ITA';
  // Bölge seçicisine (FOCUS_REGIONS) göre tahkimat
  G.decRegionN = (tag, region) => { const st = G.st; let n = 0; for (let i = 0; i < NP; i++) if (st.prov[i].c === tag && st.prov[i].fort < 5 && g.FOCUS_REGIONS[region](P[i])) n++; return n; };
  G.decRegionForts = (c, region, lv) => { const st = G.st; for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag && g.FOCUS_REGIONS[region](P[i])) st.prov[i].fort = Math.min(5, st.prov[i].fort + lv); };
  G.decOwns = (tag, names) => { const st = G.st; return names.some((n) => { const i = P.findIndex((p) => p.n === n); return i >= 0 && st.prov[i].c === tag; }); };
  // Sivil fabrikaları askerîye çevir (en değerli eyaletlerden başlayarak)
  G.decConvertN = (c) => { const st = G.st; let n = 0; for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === c.tag && pr.o === c.tag) n += pr.civ; } return n; };
  G.decConvert = (c, n) => {
    const st = G.st, list = [];
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === c.tag && pr.o === c.tag && pr.civ > 0) list.push(i); }
    list.sort((a, b) => P[b].vp - P[a].vp);
    for (let k = 0; k < n && list.length; k++) { const pr = st.prov[list[k % list.length]]; if (pr.civ > 0) { pr.civ--; pr.mil++; } }
    G.needSummary = 1;
  };
  // İki ülkenin birbirine bakışı (en çok ±60)
  G.decRel = (a, b, v) => {
    const st = G.st; st.rel = st.rel || {};
    for (const k of [b + '>' + a, a + '>' + b]) st.rel[k] = Math.max(-60, Math.min(60, (st.rel[k] || 0) + v));
  };
  // "İlişkileri geliştir" hedefleri: en yakın komşular ve büyük güçler
  G.decFriendTargets = (c) => {
    const st = G.st, out = [];
    const cand = Object.values(st.C).filter((x) => x.alive && x.tag !== c.tag && !G.atWar(c.tag, x.tag) && x.overlord !== c.tag && c.overlord !== x.tag && x.cap >= 0 && !(g.COUNTRY_DEFS[x.tag] || {}).hidden);
    cand.sort((a, b) => G.dist(a.cap, c.cap) - G.dist(b.cap, c.cap));
    for (const x of cand.slice(0, 4)) out.push(x.tag);
    for (const x of cand.filter((y) => y.major)) if (!out.includes(x.tag) && out.length < 8) out.push(x.tag);
    return out;
  };
  // "Silah ve Kiralama" alıcıları: savaşan, bakışı iyi dostlar (en zayıf ordudan başlayarak, en çok 3)
  G.decLendTargets = (c) => {
    const st = G.st;
    return Object.values(st.C).filter((x) => x.alive && x.tag !== c.tag && x.enemies.length && !G.atWar(c.tag, x.tag) && (G.friendly(c.tag, x.tag) || (G.opinion(c.tag, x.tag) >= 0 && x.enemies.some((e) => G.opinion(c.tag, e) < -10))))
      .sort((a, b) => G.armyPower(a.tag) - G.armyPower(b.tag)).slice(0, 3).map((x) => x.tag);
  };

  // ---------- Alınabilirlik ----------
  G.decVisible = (c, d) => (!d.tag || (Array.isArray(d.tag) ? d.tag.includes(c.tag) : d.tag === c.tag)) && (!d.visible || !!d.visible(c));
  G.decActive = (c, id) => (c.dec || []).find((x) => x.id === id);
  G.decLeft = (c, id) => Math.max(0, ((c.decCd || {})[id] || 0) - G.st.day);
  // {ok, why}: hedefli kararlarda hedef verilmediyse yalnızca genel koşullar denetlenir
  G.decAvailable = (c, d, tgt) => {
    if (G.decActive(c, d.id)) return { ok: false, why: 'Karar sürüyor' };
    const cd = (c.decCd || {})[d.id] || 0;
    if (cd >= 1e8) return { ok: false, why: 'Bu karar yalnızca bir kez alınabilir' };
    if (cd > G.st.day) return { ok: false, why: `${Math.ceil(cd - G.st.day)} gün sonra yeniden alınabilir` };
    if (c.pp < d.cost) return { ok: false, why: `${d.cost} siyasi güç gerekli` };
    if (d.allowed) { const r = d.allowed(c, tgt); if (r !== true && r !== undefined) return { ok: false, why: typeof r === 'string' ? r : 'Koşullar uygun değil' }; }
    if (d.targets && tgt != null && !d.targets(c).includes(tgt)) return { ok: false, why: 'Geçersiz hedef' };
    return { ok: true };
  };

  // ---------- Alma ve bitirme ----------
  const finish = (c, d, tgt) => {
    if (d.fx) { try { d.fx(c, tgt); } catch (e) { console.error('karar', d.id, e); } }
    if (d.spRm) c.spirits = c.spirits.filter((s) => s !== d.spRm);
    if (d.spAdd && !c.spirits.includes(d.spAdd)) c.spirits.push(d.spAdd);
    G.recomputeMods(c);
    G.needSummary = 1;
  };
  G.takeDecision = (c, id, tgt) => {
    const d = g.DEC_BY_ID[id], st = G.st;
    if (!d) return { ok: false, why: 'Bilinmeyen karar' };
    if (d.targets && tgt == null) return { ok: false, why: 'Hedef ülke seçilmeli' };
    const r = G.decAvailable(c, d, tgt); if (!r.ok) return r;
    c.pp -= d.cost;
    c.dec = c.dec || []; c.decCd = c.decCd || {};
    c.decCd[id] = d.once ? 1e9 : st.day + (d.days || 0) + (d.cd || 0);
    if (d.now) { try { d.now(c, tgt); } catch (e) { console.error('karar', id, e); } }
    if (d.days > 0) {
      c.dec.push({ id, t: tgt || null, s: st.day, e: st.day + d.days });
      G.recomputeMods(c);
    } else finish(c, d, tgt);
    if (c.tag === st.player) G.log(`Karar alındı: ${d.n}${tgt ? ' (' + G.cname(tgt) + ')' : ''}.`, [c.tag], 'good');
    return { ok: true };
  };
  // Süresi dolan kararlar (her gün)
  G.decTick = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.dec || !c.dec.length) continue;
      const done = c.dec.filter((x) => st.day >= x.e);
      if (!done.length) continue;
      c.dec = c.dec.filter((x) => st.day < x.e);
      for (const x of done) {
        const d = g.DEC_BY_ID[x.id]; if (!d) continue;
        finish(c, d, x.t);
        if (c.tag === st.player) G.log(`Karar tamamlandı: ${d.n}.`, [c.tag], 'good');
      }
      G.recomputeMods(c);
    }
  };

  // ---------- Yapay zekâ ----------
  // Danışman ve yasalara ayrılan siyasi gücü tüketmesin: ~45 günde bir, 150 siyasi gücü korur.
  G.aiDecisions = (c) => {
    const st = G.st;
    if (c.pp < 190 || st.day - (c.ai.dec ?? -999) < 45) return;
    let best = null, bs = 0;
    for (const d of g.DECISIONS) {
      if (!d.ai || d.targets || c.pp - d.cost < 150 || !G.decVisible(c, d)) continue;
      const s = d.ai(c); if (!(s > bs)) continue;
      if (!G.decAvailable(c, d).ok) continue;
      best = d; bs = s;
    }
    if (best && G.takeDecision(c, best.id).ok) c.ai.dec = st.day;
  };
})(window);
