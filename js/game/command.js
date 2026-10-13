// Komuta Gücü (HOI4): ordu emirleri, mareşal terfisi, komutan eğitimi ve ordu grupları için harcanan kaynak.
// Yalnızca oyuncu ülkesinde (ve tarihî olmayan modlarda YZ'de) birikir; c.cp ilk kullanımda oluşur.
// Ordu grubu: bir mareşal birden çok orduyu yönetir, saldırı/savunma becerisinin yarısı bu ordulara eklenir.
(function (g) {
  const G = g.G;
  G.CP_MAX = 100;
  G.cpEnsure = (c) => { if (c && c.cp == null) c.cp = 30; return c; };
  G.cpRate = (c) => {
    const fm = (c.gens || []).filter((x) => x.fm).length;
    return 0.35 + Math.min(3, fm) * 0.08 + (c.mods.cpRate || 0);
  };
  G.cpTick = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!c.alive || c.cp == null) continue;
      c.cp = Math.min(G.CP_MAX, c.cp + G.cpRate(c));
      for (const a of c.armies || []) if (a.drill) drillDay(c, a);
    }
  };
  // tatbikat (HOI4 ordu eğitimi): barışta ordudaki tümenler "Düzenli" seviyesine kadar tecrübe kazanır;
  // her tümen günde 3 piyade teçhizatı yıpratır. Savaş başlayınca ya da teçhizat bitince durur.
  G.DRILL_CAP = 0.5;
  const drillDay = (c, a) => {
    const st = G.st;
    if (c.enemies.length) { a.drill = 0; if (c.tag === st.player) G.log(`${a.n}: savaş nedeniyle tatbikat sona erdi.`, [c.tag], 'info'); return; }
    const us = G.armyUnits(c, a.id).filter((u) => (u.xp ?? 0.25) < G.DRILL_CAP && u.loc < G.NP);
    if (!us.length) { a.drill = 0; if (c.tag === st.player) G.log(`${a.n}: tatbikat tamamlandı, tümenler düzenli seviyede.`, [c.tag], 'good'); return; }
    const need = us.length * 3;
    if ((c.stock.inf || 0) < need) { a.drill = 0; if (c.tag === st.player) G.log(`${a.n}: piyade teçhizatı yetersiz, tatbikat durdu.`, [c.tag], 'warn'); return; }
    c.stock.inf -= need;
    for (const u of us) { u.xp = Math.min(G.DRILL_CAP, (u.xp ?? 0.25) + 0.004); u._sd = -1; }
  };
  G.drillToggle = (c, armyId) => {
    const a = G.armyById(c, armyId); if (!a) return { ok: false, why: 'Ordu yok' };
    if (a.drill) { a.drill = 0; return { ok: true, on: 0 }; }
    if (c.enemies.length) return { ok: false, why: 'Savaşta tatbikat yapılamaz' };
    a.drill = 1; return { ok: true, on: 1 };
  };
  // YZ (tarihî olmayan modlar): savaştaki büyük güçler ayda bir ülke geneli emir verir
  // (taarruzdaysa Taarruz Emri, toprak kaybediyorsa Savunma Emri; 15 gün)
  G.aiCommand = () => {
    const st = G.st; if (st.opts.hist) return;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.major || c.tag === st.player || !c.enemies.length) continue;
      if (c.aiOrd && c.aiOrd.until > st.day - 20) continue;
      c.aiOrd = { k: (c.surrender || 0) > 0.15 ? 'def' : 'atk', until: st.day + 15 };
    }
  };
  // tümen şerefi ve adları: zafer sayısı (u.win), 4 zaferde "Muhafız" unvanı (+%5 saldırı ve savunma).
  // Tarihî modda yalnızca oyuncunun tümenleri; tarihî olmayan modlarda herkes. Aynı tümen haftada bir zafer sayar.
  G.GUARD_WINS = 4;
  G.honorWin = (us, foe, n) => {
    const st = G.st;
    for (const u of us) {
      if (st.opts.hist && u.t !== st.player) continue;
      if (u.hwd != null && st.day - u.hwd < 7) continue;
      u.hwd = st.day; u.win = (u.win || 0) + 1;
      if (!u.gd && u.win >= G.GUARD_WINS) {
        u.gd = 1; u._sd = -1;
        if (u.t === st.player) G.log(`${G.divName(u)} ${G.pname(n)} zaferinden sonra "Muhafız" unvanı aldı (+%5 saldırı ve savunma).`, [u.t], 'good');
      }
    }
  };
  // tümen adı: oyuncunun tümenlerine sıra numarası (ilk gösterimde verilir), muhafızlara unvan
  G.divName = (u) => {
    const st = G.st, c = st.C[u.t], t = G.T(u.t, u.u);
    if (u.no == null && u.t === st.player && c) u.no = c.divNo = (c.divNo || 0) + 1;
    return `${u.gd ? 'Muhafız ' : ''}${u.no ? u.no + '. ' : ''}${t.n}`;
  };
  // deniz çıkarması hazırlık süresi (gün): deniz piyadesi ve çıkarma doktrinleri kısaltır
  G.invPrep = (c, u) => { const t = G.T(u.t, u.u); return Math.max(4, Math.round(14 - (t.amph || 0) * 8 - (c.mods.invasion || 0) * 12)); };
  // ordu emirleri: KG harcayarak süreli bonus
  G.ORDERS = {
    atk: { n: 'Taarruz Emri', d: '15 gün saldırı ve atılım +%10', cost: 30, days: 15 },
    def: { n: 'Savunma Emri', d: '15 gün savunma +%15', cost: 25, days: 15 },
    blitz: { n: 'Yıldırım Harekâtı', d: '10 gün zırhlı ve motorlu tümenlerin hızı ve saldırısı +%15', cost: 40, days: 10 },
  };
  const spend = (c, n) => { G.cpEnsure(c); if (c.cp < n) return false; c.cp -= n; return true; };
  G.armyOrder = (c, armyId, k) => {
    const O = G.ORDERS[k], a = G.armyById(c, armyId);
    if (!O || !a) return { ok: false, why: 'Geçersiz' };
    if (a.boost && a.boost.until > G.st.day) return { ok: false, why: 'Bu orduya verilmiş bir emir sürüyor' };
    if (!spend(c, O.cost)) return { ok: false, why: `${O.cost} komuta gücü gerekli` };
    a.boost = { k, until: G.st.day + O.days };
    for (const u of G.armyUnits(c, armyId)) u._sd = -1; // istatistik önbelleğini yenile
    return { ok: true };
  };
  // ordu biriminin emir ve ordu grubu çarpanları (unitStats içinden)
  G.armyMul = (c, u, t) => {
    const a = u.army && G.armyById(c, u.army);
    if (!a) { const o = c.aiOrd; return o && o.until > G.st.day ? (o.k === 'atk' ? { atk: 1.08, def: 1, spd: 1 } : { atk: 1, def: 1.1, spd: 1 }) : null; }
    let atk = 1, def = 1, spd = 1;
    if (a.boost && a.boost.until > G.st.day) {
      if (a.boost.k === 'atk') atk *= 1.1;
      else if (a.boost.k === 'def') def *= 1.15;
      else if (a.boost.k === 'blitz' && t.mob) { atk *= 1.15; spd *= 1.15; }
    }
    if (a.grp) { const fm = G.genById(c, a.grp); if (fm && fm.fm) { atk *= 1 + 0.02 * fm.atk; def *= 1 + 0.02 * fm.def; } }
    return atk === 1 && def === 1 && spd === 1 ? null : { atk, def, spd };
  };
  // mareşal terfisi ve komutan eğitimi
  G.promoteFM = (c, genId) => {
    const gen = G.genById(c, genId); if (!gen || gen.fm) return { ok: false, why: 'Zaten mareşal' };
    if (gen.lvl < 3) return { ok: false, why: 'En az 3. seviye general olmalı' };
    if (!spend(c, 40)) return { ok: false, why: '40 komuta gücü gerekli' };
    gen.fm = 1;
    return { ok: true };
  };
  G.trainGeneral = (c, genId, trait) => {
    const gen = G.genById(c, genId); if (!gen) return { ok: false, why: 'Komutan yok' };
    if (gen.tr.length >= 4) return { ok: false, why: 'En fazla 4 özellik' };
    if (gen.tr.includes(trait) || !g.GEN_TRAITS[trait] || trait === 'brilliant') return { ok: false, why: 'Uygun değil' };
    if (!spend(c, 50)) return { ok: false, why: '50 komuta gücü gerekli' };
    gen.tr.push(trait);
    return { ok: true };
  };
  // ordu grubu: mareşal en çok 4 orduyu yönetir
  G.setArmyGroup = (c, armyId, fmId) => {
    const a = G.armyById(c, armyId); if (!a) return { ok: false };
    if (!fmId) { delete a.grp; return { ok: true }; }
    const fm = G.genById(c, fmId); if (!fm || !fm.fm) return { ok: false, why: 'Yalnızca mareşaller ordu grubu yönetir' };
    if ((c.armies || []).filter((x) => x.grp === fmId && x.id !== armyId).length >= 4) return { ok: false, why: 'Bir mareşal en çok 4 ordu yönetir' };
    a.grp = fmId;
    for (const u of G.armyUnits(c, armyId)) u._sd = -1;
    return { ok: true };
  };
})(window);
