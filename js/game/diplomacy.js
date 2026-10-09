// Diplomasi: savaş, barış, ittifaklar, geçiş izni, garantiler.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  G.refreshEnemies = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) c.enemies = [];
    for (const k of Object.keys(st.wars)) {
      const [a, b] = k.split('|');
      if (st.C[a]?.alive && st.C[b]?.alive) { st.C[a].enemies.push(b); st.C[b].enemies.push(a); } else delete st.wars[k];
    }
    for (const c of Object.values(st.C)) { c.eset = new Set(c.enemies); if (!c.enemies.length) c.defensive = 0; }
    G.relClear();
  };

  G.setWar = (a, b) => {
    const st = G.st;
    if (a === b || !st.C[a]?.alive || !st.C[b]?.alive) return;
    const k = G.pairKey(a, b);
    if (st.wars[k]) return;
    st.wars[k] = { since: st.day };
    st.wstart = st.wstart || {}; if (st.wstart[k] == null) st.wstart[k] = st.day; // ilk başlangıç (tarihî eğri çapası)
    G.supDirty = 1;
    delete st.pacts[k];
    delete st.access[a + '>' + b]; delete st.access[b + '>' + a];
    G.refreshEnemies();
    // savaş başlarken karşı tarafın topraklarındaki birlikler kendi topraklarına çekilir
    G.expelUnits((u, pr) => (u.t === a && pr.c === b) || (u.t === b && pr.c === a));
  };
  // Girme hakkı olmayan topraktaki birlikleri en yakın kendi/dost eyaletine taşı
  G.expelUnits = (pred) => {
    const st = G.st; let moved = 0;
    for (const u of st.units) {
      if (u.loc >= NP) continue;
      const pr = st.prov[u.loc];
      if (pred ? !pred(u, pr) : (pr.c === u.t || G.friendly(u.t, pr.c) || G.atWar(u.t, pr.c))) continue;
      const seen = new Set([u.loc]), q = [u.loc]; let dest = -1;
      for (let k = 0; k < q.length && k < 3000; k++) {
        const n = q[k];
        const pn = st.prov[n];
        if (n !== u.loc && (pn.c === u.t || (G.friendly(u.t, pn.c) && !G.atWar(u.t, pn.c)))) { dest = n; break; }
        for (const j of P[n].a) if (!seen.has(j)) { seen.add(j); q.push(j); }
      }
      if (dest < 0) { const c = st.C[u.t]; dest = c && c.cap >= 0 && st.prov[c.cap].c === u.t ? c.cap : -1; }
      if (dest < 0) continue;
      const L = G.unitsAt && G.unitsAt[u.loc]; if (L) { const i = L.indexOf(u); if (i >= 0) L.splice(i, 1); }
      u.loc = dest; u.path = []; u.prog = 0; u.ent = 0;
      if (G.unitsAt) (G.unitsAt[dest] || (G.unitsAt[dest] = [])).push(u);
      moved++;
    }
    return moved;
  };

  G.sideOf = (tag) => { const c = G.st.C[tag]; return c.fac ? G.st.factions[c.fac].members.filter((t) => G.st.C[t].alive) : [tag]; };

  // Savaş ilanı: hedefin ittifakı ve garantörleri savunmaya, saldıranın ittifakı saldırıya katılır.
  G.declareWar = (a, b, opts = {}) => {
    const st = G.st;
    if (G.atWar(a, b) || !st.C[b]?.alive) return false;
    // Vichy Fransası (mütareke ile Anton/kurtuluş arası): YZ onu Mihver'le savaşa sokmaz
    const axisT = (t) => t === 'GER' || G.sameFaction(t, 'GER');
    const vichyLock = st.vichy && !st.vichyLib;
    if (vichyLock && a !== st.player && ((a === 'FRA' && axisT(b)) || (b === 'FRA' && axisT(a)))) return false;
    if (opts.only) { G.setWar(a, b); delete st.goals[a + '>' + b]; G.log(`${G.cname(a)}, ${G.cname(b)}'${G.ek(b)} savaş ilan etti!`, [a, b], 'major'); if (G.onWar) G.onWar(a, b); return true; }
    const def = new Set(G.sideOf(b));
    const targetAtPeace = !st.C[b].enemies.length;
    if (targetAtPeace) for (const [gt, list] of Object.entries(st.guar)) if (list.includes(b) && st.C[gt]?.alive && gt !== a && !G.sameFaction(gt, a) && (!st.opts.hist || ((st.C[gt].major && !st.C[gt].capd) || gt === st.player))) { for (const t of G.sideOf(gt)) def.add(t); }
    def.delete(a);
    if (vichyLock && axisT(a) && b !== 'FRA') def.delete('FRA');
    // saldıranın müttefikleri: YZ aynı ideolojideyse çağrıya uyar, oyuncuya sorulur
    const att = new Set([a]);
    const lateWar = !st.opts.hist || st.day >= G.dayOf('1941-06-01');
    if (!opts.alone) for (const t of G.sideOf(a)) {
      if (t === a || def.has(t)) continue;
      if (t === st.player) { G.queuePopup({ title: 'Silah Çağrısı', text: `Müttefikimiz ${G.cname(a)}, ${G.cname(b)}'${G.ek(b)} savaş ilan etti. Savaşa katılalım mı?`, opts: [{ n: 'Savaşa katıl', fx: () => { for (const y of G.sideOf(b)) if (!G.sameFaction(t, y)) G.setWar(t, y); } }, { n: 'Uzak dur', fx: () => {} }] }); continue; }
      const ct = st.C[t];
      if (ct.overlord === a || (ct.ideo === st.C[a].ideo && ct.ideo !== 'neu' && lateWar)) att.add(t);
    }
    for (const t of def) att.delete(t);
    for (const x of att) for (const y of def) {
      if (st.pacts[G.pairKey(x, y)] && !(x === a && y === b)) continue;
      G.setWar(x, y);
    }
    delete st.goals[a + '>' + b];
    for (const t of def) { const ct = st.C[t]; if (!ct) continue; ct.defensive = 1; ct.wsX = (ct.wsX || 0) + (t === b ? 0.2 : 0.1); }
    st.tension = Math.min(100, st.tension + (st.C[b].major ? 12 : 6));
    const msg = `${G.cname(a)}, ${G.cname(b)}'${G.ek(b)} savaş ilan etti!`;
    G.log(msg, [a, b], 'major');
    if (G.onWar) G.onWar(a, b);
    return true;
  };
  // Türkçe yönelme eki (basit ünlü uyumu)
  G.ek = (tag) => {
    const n = G.cname(tag).toLowerCase();
    const v = [...n].reverse().find((ch) => 'aeıioöuü'.includes(ch)) || 'a';
    const back = 'aıou'.includes(v);
    const last = n[n.length - 1];
    const vowelEnd = 'aeıioöuü'.includes(last);
    return (vowelEnd ? 'y' : '') + (back ? 'a' : 'e');
  };

  G.makePeace = (a, b) => {
    const st = G.st;
    delete st.wars[G.pairKey(a, b)];
    // kontrol iade edilir
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if ((pr.o === a && pr.c === b) || (pr.o === b && pr.c === a)) pr.c = pr.o;
    }
    G.refreshEnemies();
    // yabancı topraktaki birlikleri eve gönder
    for (const u of st.units) {
      if (u.t !== a && u.t !== b) continue;
      if (u.loc >= NP || !G.canEnter(u.t, u.loc)) { const c = st.C[u.t]; const home = st.prov[c.cap]?.c === u.t ? c.cap : G.anyOwnProvince(u.t); if (home >= 0) { u.loc = home; u.path = []; u.prog = 0; } }
    }
    G.rebuildUnitIndex();
    G.mapDirty = 1; G.needSummary = 1;
    G.log(`${G.cname(a)} ile ${G.cname(b)} barış imzaladı.`, [a, b], 'major');
  };

  // ---------- İttifaklar ----------
  G.joinFaction = (tag, fid) => {
    const st = G.st, c = st.C[tag], f = st.factions[fid];
    if (!f || c.fac === fid) return;
    if (c.fac) G.leaveFaction(tag);
    // Katılım mevcut savaşları otomatik birleştirmez; ittifak yalnızca gelecekteki savunma
    // ve geçiş hakları için bağlayıcıdır.
    f.members.push(tag); c.fac = fid;
    G.relClear();
    G.log(`${G.cname(tag)}, ${f.n} ittifakına katıldı.`, [tag, f.leader], 'major');
    st.tension = Math.min(100, st.tension + 2);
    G.mapDirty = 1;
  };
  G.leaveFaction = (tag) => {
    const st = G.st, c = st.C[tag];
    const f = st.factions[c.fac]; if (!f) { c.fac = null; return; }
    f.members = f.members.filter((t) => t !== tag);
    c.fac = null; G.relClear();
    if (f.leader === tag) {
      const next = f.members.find((t) => st.C[t].alive);
      if (next) f.leader = next; else { for (const t of f.members) st.C[t].fac = null; delete st.factions[Object.keys(st.factions).find((k) => st.factions[k] === f)]; }
    }
    G.mapDirty = 1;
  };
  G.createFaction = (tag, name) => {
    const st = G.st;
    const id = 'f' + tag;
    if (st.C[tag].fac) G.leaveFaction(tag);
    st.factions[id] = { n: name, c: g.COUNTRY_DEFS[tag].c, leader: tag, members: [tag] };
    st.C[tag].fac = id; G.relClear();
    G.log(`${G.cname(tag)} yeni bir ittifak kurdu: ${name}`, [tag], 'major');
    return id;
  };

  // Annex (olaylar için): hedefin tüm toprakları alıcıya geçer
  G.annex = (to, from, filter) => {
    const st = G.st;
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i];
      if (pr.o !== from || (filter && !filter(i))) continue;
      pr.o = pr.c = pr.core = to;
    }
    // birlikleri taşı / dağıt
    for (const u of st.units) if (u.t === from && u.loc < NP && st.prov[u.loc].o !== from) u.dead = 1;
    st.units = st.units.filter((u) => !u.dead);
    G.mapDirty = 1; G.needSummary = 1; G.cwDirty = 1;
    G.updateSummaries();
    const c = st.C[from];
    if (c.sum.provs === 0) G.killCountry(from);
    else { if (st.prov[c.cap].o !== from) c.cap = G.anyOwnProvince(from); c.startW = G.coreWeight(from, true); }
    if (st.C[to]) st.C[to].startW = G.coreWeight(to, true);
    G.rebuildUnitIndex();
  };

  G.release = (tag, fromTag, filter) => {
    const st = G.st, c = st.C[tag];
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === fromTag && filter(i)) pr.o = pr.c = pr.core = tag; }
    c.alive = 1;
    G.updateSummaries();
    c.cap = G.anyOwnProvince(tag);
    const d = g.COUNTRY_DEFS[tag];
    let best = -1; for (let i = 0; i < NP; i++) if (st.prov[i].o === tag && (P[i].n === d.cap || (P[i].cs || []).includes(d.cap))) best = i;
    if (best >= 0) c.cap = best;
    G.cwDirty = 1;
    c.startW = G.coreWeight(tag, true);
    const n = Math.max(1, Math.round(c.sum.provs / 2));
    for (let k = 0; k < n; k++) st.units.push(G.makeUnit(tag, 'inf', c.cap, 0.8));
    c.stock.inf = 2000; c.stock.art = 50;
    G.defaultLines(c);
    G.rebuildUnitIndex();
    G.mapDirty = 1;
  };

  // ---------- Kabul değerlendirmesi (YZ) ----------
  G.opinion = (ai, other) => {
    const st = G.st, a = st.C[ai], o = st.C[other];
    let v = 0;
    if (a.ideo === o.ideo) v += a.ideo === 'neu' ? 10 : 35;
    else if ((a.ideo === 'dem' && o.ideo !== 'neu') || (o.ideo === 'dem' && a.ideo !== 'neu') || (a.ideo === 'fas' && o.ideo === 'com') || (a.ideo === 'com' && o.ideo === 'fas')) v -= 30;
    if (G.sameFaction(ai, other)) v += 50;
    if (st.goals[other + '>' + ai] || o.just?.t === ai) v -= 60;
    for (const e of a.enemies) if (G.atWar(other, e)) v += 40;
    for (const e of o.enemies) if (G.sameFaction(ai, e)) v -= 80;
    v += (st.rel && st.rel[ai + '>' + other]) || 0;
    if (a.overlord === other) v += 100;
    return v;
  };

  G.requestAccess = (from, to) => {
    const st = G.st;
    if (G.atWar(from, to)) return false;
    const ok = to === st.player ? false : G.opinion(to, from) > 20 && !st.C[to].enemies.length || G.coBelligerent(from, to);
    if (ok) { st.access[from + '>' + to] = 1; G.relClear(); }
    return ok;
  };
  G.proposePact = (a, b) => {
    const st = G.st;
    if (G.atWar(a, b)) return false;
    const ok = G.opinion(b, a) > -20 && !st.goals[b + '>' + a] && !(st.C[b].just?.t === a);
    if (ok) { st.pacts[G.pairKey(a, b)] = 'nap'; G.log(`${G.cname(a)} ile ${G.cname(b)} saldırmazlık paktı imzaladı.`, [a, b], 'major'); }
    return ok;
  };
  G.inviteToFaction = (leader, tag) => {
    const st = G.st, c = st.C[tag], L = st.C[leader];
    if (!L.fac || c.fac === L.fac) return false;
    if (c.major && st.factions[c.fac]?.leader === tag) return false;
    let v = G.opinion(tag, leader);
    const threat = c.enemies.length ? 30 : 0;
    v += threat + (st.tension > 40 ? 15 : 0) - (c.fac ? 40 : 0) - (c.ideo === 'neu' ? 25 : 0);
    // savaşan ittifaka katılmak riskli
    const fEnemies = new Set(); for (const m of st.factions[L.fac].members) for (const e of st.C[m].enemies) fEnemies.add(e);
    for (const e of fEnemies) if (st.C[e].major && P[st.C[e].cap] && G.dist(st.C[e].cap, c.cap) < 300) v -= 25;
    if (v > 25) { G.joinFaction(tag, L.fac); return true; }
    return false;
  };
  G.askJoinFaction = (tag, fid) => {
    const st = G.st, f = st.factions[fid];
    const v = G.opinion(f.leader, tag) + (st.C[tag].sum.mil > 4 ? 10 : 0);
    if (v > 20) { G.joinFaction(tag, fid); return true; }
    return false;
  };
  G.whitePeace = (a, b) => {
    const st = G.st;
    if (!G.atWar(a, b)) return false;
    const ca = st.C[a], cb = st.C[b];
    // YZ, kendini kaybeden tarafta görürse kabul eder
    const lossA = ca.surrender || 0, lossB = cb.surrender || 0;
    const since = st.day - st.wars[G.pairKey(a, b)].since;
    const ok = since > 60 && (lossB > lossA + 0.15 || (since > 365 && Math.abs(lossA - lossB) < 0.1 && G.rand() < 0.5));
    if (ok) G.makePeace(a, b);
    return ok;
  };
  G.guarantee = (a, b) => { const st = G.st; (st.guar[a] || (st.guar[a] = [])).includes(b) || st.guar[a].push(b); G.log(`${G.cname(a)}, ${G.cname(b)}'${G.ek(b)} bağımsızlık garantisi verdi.`, [a, b], 'info'); };

  G.justifyCost = (c) => Math.round(50 * (1 - Math.min(0.6, c.mods.justify || 0)));
  G.justifyDays = (c) => Math.round(35 * (1 - Math.min(0.6, c.mods.justify || 0)));
  G.tensionNeeded = (c) => (c.ideo === 'dem' ? 60 : c.ideo === 'neu' ? 30 : 0);
  G.canJustify = (a, b) => {
    const st = G.st, c = st.C[a];
    if (a === b || G.atWar(a, b) || G.sameFaction(a, b) || c.just || st.goals[a + '>' + b]) return { ok: false, why: c.just ? 'Zaten bir gerekçe hazırlanıyor.' : 'Uygun değil.' };
    if (st.pacts[G.pairKey(a, b)]) return { ok: false, why: 'Aranızda saldırmazlık paktı var.' };
    if (st.tension < G.tensionNeeded(c)) return { ok: false, why: `Dünya gerginliği en az %${G.tensionNeeded(c)} olmalı.` };
    if (c.pp < G.justifyCost(c)) return { ok: false, why: `${G.justifyCost(c)} siyasi güç gerekli.` };
    return { ok: true };
  };
  G.canDeclare = (a, b) => {
    const st = G.st;
    if (a === b || G.atWar(a, b) || G.sameFaction(a, b)) return false;
    if (st.goals[a + '>' + b] != null) return true;
    // müttefikin düşmanına savaş ilanı serbest
    for (const e of G.sideOf(a)) if (G.atWar(e, b)) return true;
    return false;
  };
  G.startJustify = (a, b) => {
    const st = G.st, c = st.C[a];
    const r = G.canJustify(a, b); if (!r.ok) return r;
    c.pp -= G.justifyCost(c);
    c.just = { t: b, d: G.justifyDays(c) };
    st.tension = Math.min(100, st.tension + 3);
    return { ok: true };
  };
})(window);
