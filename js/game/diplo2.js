// HOI4 diplomasisi eklentileri: ültimatom (toprak/ilhak talebi), müttefikleri savaşa çağırma,
// ittifak yönetimi (ihraç, liderlik devri) ve dünya gerginliği kaynakları.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const alive = (t) => !!G.st.C[t]?.alive;

  // ---------- Dünya gerginliği kaynakları (oturum içi; kayda yazılmaz) ----------
  G.TSRC = {};
  G.tsrc = (tag, v, why) => {
    if (!tag || !v) return;
    const e = G.TSRC[tag] || (G.TSRC[tag] = { v: 0, w: {} });
    e.v += v; e.w[why] = (e.w[why] || 0) + v;
  };

  // ---------- Ültimatom ----------
  G.ULT_COST = 50;
  // talep edilecek sınır eyaletleri: hedefin, talep edenin topraklarına komşu eyaletlerinden zafer noktası en yüksek 4'ü
  G.ultProvs = (a, t) => {
    const st = G.st, L = [];
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === t && pr.c === t && P[i].a.some((j) => st.prov[j].c === a)) L.push(i); }
    return L.sort((x, y) => (P[y].vp || 0) - (P[x].vp || 0) || x - y).slice(0, 4);
  };
  G.ultAllowed = (a, t, kind) => {
    const st = G.st, c = st.C[a], x = st.C[t];
    if (!x || !x.alive || a === t) return { ok: false, why: 'Geçersiz hedef' };
    if (G.atWar(a, t)) return { ok: false, why: 'Zaten savaştasınız' };
    if (G.sameFaction(a, t)) return { ok: false, why: 'Aynı ittifaktasınız' };
    if (st.pacts[G.pairKey(a, t)]) return { ok: false, why: 'Saldırmazlık paktı var' };
    if (st.ult && st.ult[a + '>' + t] > st.day) return { ok: false, why: `Yeni talep için ${st.ult[a + '>' + t] - st.day} gün beklemelisin` };
    const need = Math.round(G.tensionNeeded(c) / 2);
    if (st.tension < need) return { ok: false, why: `Dünya gerginliği en az %${need} olmalı` };
    if (kind === 'annex' && x.major) return { ok: false, why: 'Büyük güçlerden ilhak talep edilemez' };
    if (kind === 'border' && !G.ultProvs(a, t).length) return { ok: false, why: 'Ortak kara sınırı yok' };
    if (c.pp < G.ULT_COST) return { ok: false, why: `${G.ULT_COST} siyasi güç gerekli` };
    return { ok: true };
  };
  // hedefin gözünde caydırıcı güç: kendisi, ittifakı ve onu garanti eden büyük güçler
  G.ultDeter = (a, t) => {
    const st = G.st; let v = G.armyPower(t);
    const x = st.C[t];
    if (x.fac) for (const m of st.factions[x.fac]?.members || []) if (m !== t && alive(m) && m !== a) v += G.armyPower(m) * 0.6;
    for (const [gt, list] of Object.entries(st.guar)) if (list.includes(t) && alive(gt) && gt !== a && st.C[gt].major) v += G.armyPower(gt) * 0.5;
    return v;
  };
  G.ultimatum = (a, t, kind) => {
    const st = G.st, c = st.C[a];
    const r = G.ultAllowed(a, t, kind); if (!r.ok) return r;
    c.pp -= G.ULT_COST;
    (st.ult || (st.ult = {}))[a + '>' + t] = st.day + 180;
    const provs = kind === 'annex' ? null : new Set(G.ultProvs(a, t));
    const filter = provs ? (i) => provs.has(i) : null;
    const what = kind === 'annex' ? 'ülkenin tamamını' : `${[...provs].map((i) => P[i].n).join(', ')} eyaletlerini`;
    const accept = () => {
      G.annex(a, t, filter);
      st.tension = Math.min(100, st.tension + (kind === 'annex' ? 8 : 5)); G.tsrc(a, kind === 'annex' ? 8 : 5, 'ültimatom');
      G.log(`${G.cname(t)}, ${G.cname(a)}'${G.ek(a)} boyun eğdi ve ${what} bıraktı.`, [a, t], 'major');
    };
    const refuse = () => {
      st.goals[a + '>' + t] = st.day;
      st.tension = Math.min(100, st.tension + 3); G.tsrc(a, 3, 'ültimatom');
      G.log(`${G.cname(t)}, ${G.cname(a)}'${G.ek(a)} ültimatomunu reddetti. ${G.cname(a)} artık savaş gerekçesine sahip.`, [a, t], 'major');
    };
    if (t === st.player) {
      G.queuePopup({ art: 'diplomacy', title: `${G.cname(a)} Ültimatomu`, text: `${G.cname(a)} hükümeti ${what} talep ediyor. Reddedersek savaş çıkabilir.`, opts: [{ n: 'Kabul et', d: 'Toprak kaybı, savaş yok', fx: accept }, { n: 'Reddet', d: `${G.cname(a)} savaş gerekçesi kazanır`, fx: refuse }] });
      return { ok: true, pending: 1 };
    }
    const ratio = G.armyPower(a) / Math.max(1, G.ultDeter(a, t));
    const need = (kind === 'annex' ? 3 : 1.6) + (st.C[t].ideo !== st.C[a].ideo && st.C[t].ideo === 'dem' ? 0.4 : 0);
    const ok = ratio > need;
    if (ok) accept(); else refuse();
    return { ok: true, accepted: ok, ratio };
  };

  // ---------- Müttefikleri savaşa çağır ----------
  G.ctaAllowed = (a, t) => {
    const st = G.st, c = st.C[a], x = st.C[t];
    if (!c.enemies.length) return { ok: false, why: 'Savaşta değilsin' };
    if (!x || !x.alive || x.capd) return { ok: false, why: 'Geçersiz' };
    if (c.enemies.every((e) => G.atWar(t, e))) return { ok: false, why: 'Zaten düşmanlarınla savaşıyor' };
    if (c.enemies.some((e) => G.sameFaction(t, e))) return { ok: false, why: 'Düşmanınla aynı ittifakta' };
    if (G.atWar(a, t)) return { ok: false, why: 'Bu ülkeyle savaştasın' };
    if (st.cta && st.cta[a + '>' + t] > st.day) return { ok: false, why: `Yeniden çağırmak için ${st.cta[a + '>' + t] - st.day} gün bekle` };
    return { ok: true };
  };
  G.callToArms = (a, t) => {
    const st = G.st, c = st.C[a];
    const r = G.ctaAllowed(a, t); if (!r.ok) return r;
    (st.cta || (st.cta = {}))[a + '>' + t] = st.day + 90;
    const op = G.opinion(t, a);
    const our = G.sideOf(a).reduce((s, x) => s + G.armyPower(x), 0) + G.armyPower(t);
    const their = c.enemies.reduce((s, e) => s + G.armyPower(e), 0);
    const ok = G.sameFaction(a, t) ? op > -20 : op > 30 && our > their * 0.9;
    if (!ok) { G.log(`${G.cname(t)}, ${G.cname(a)} saflarında savaşa girmeyi reddetti.`, [a, t], 'info'); return { ok: true, accepted: false }; }
    for (const e of c.enemies) if (!G.atWar(t, e) && !G.sameFaction(t, e) && !st.pacts[G.pairKey(t, e)]) G.setWar(t, e);
    G.log(`${G.cname(t)}, ${G.cname(a)}'${G.ek(a)} katılarak savaşa girdi!`, [a, t], 'major');
    return { ok: true, accepted: true };
  };

  // ---------- İttifak yönetimi ----------
  G.facKick = (leader, t) => {
    const st = G.st, c = st.C[leader], f = c.fac && st.factions[c.fac];
    if (!f || f.leader !== leader || t === leader || !f.members.includes(t)) return false;
    G.leaveFaction(t); G.log(`${G.cname(t)}, ${f.n} ittifakından çıkarıldı.`, [leader, t], 'major');
    return true;
  };
  G.facLead = (leader, t) => {
    const st = G.st, c = st.C[leader], f = c.fac && st.factions[c.fac];
    if (!f || f.leader !== leader || !f.members.includes(t) || !alive(t)) return false;
    f.leader = t; G.log(`${f.n} ittifakının liderliği ${G.cname(t)}'${G.ek(t)} devredildi.`, [leader, t], 'major');
    return true;
  };
})(window);
