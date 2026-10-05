// Siyaset: istikrar, savaş desteği, parti desteği, hükümet değişimi, danışmanlar,
// ulusal odak motoru ve odak özel etkileri.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const IDEOS = ['dem', 'fas', 'com', 'neu'];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  // ---------- Başlangıç ----------
  G.initPolitics = (c) => {
    const d = g.COUNTRY_DEFS[c.tag];
    const p = g.POLITICS[c.tag] || {};
    c.leader = d.l;
    c.stab0 = p.stab ?? (c.ideo === 'dem' ? 0.6 : 0.5);
    c.ws0 = p.ws ?? (c.ideo === 'fas' ? 0.35 : c.ideo === 'com' ? 0.3 : 0.15);
    c.stabX = 0; c.wsX = 0;
    if (p.pop) c.pop = Object.assign({}, p.pop);
    else { c.pop = { dem: 0.1, fas: 0.1, com: 0.1, neu: 0.1 }; c.pop[c.ideo] = 0.7; }
    c.spirits = (p.sp || []).slice();
    c.laws.trade = p.trade ?? 1;
    c.adv = {};
    c.rb = [];
    c.stab = c.stab0; c.ws = c.ws0;
  };

  // ---------- Günlük siyaset ----------
  G.polTick = (c) => {
    const st = G.st, m = c.mods;
    const atWar = c.enemies.length > 0;
    // savaşın etkileri
    let wsWar = 0, stabWar = 0;
    if (atWar) { wsWar += c.defensive ? 0.15 : 0.05; stabWar -= 0.05; }
    wsWar += (st.tension / 100) * (c.ideo === 'dem' ? 0.15 : 0.08);
    const lost = Math.max(0, Math.min(1, (c.surrender || 0)));
    stabWar -= lost * 0.25; wsWar -= lost * 0.1;
    const cas = c.dead / Math.max(50, c.sum.pop * 20);
    wsWar -= Math.min(0.15, cas * 0.3);
    // yönetici ideoloji desteği istikrarı etkiler
    const ruling = c.pop[c.ideo] || 0;
    const popStab = ruling < 0.4 ? (ruling - 0.4) * 0.5 : 0;
    const lawStab = g.LAWS.eco.opts[c.laws.eco].stab || 0;
    c.stab = clamp(c.stab0 + (m.stab || 0) + c.stabX + stabWar + popStab + lawStab);
    c.ws = clamp(c.ws0 + (m.ws || 0) + c.wsX + wsWar);
    c.stabX *= 0.998; c.wsX *= 0.998;
    // parti kayması
    const drift = 0.0004 * (c.stab - 0.45) + (m.drift || 0);
    c.pop[c.ideo] = clamp(c.pop[c.ideo] + drift, 0.05, 0.98);
    normalizePop(c);
    // hükümet değişikliği
    if (st.day % 7 === 0) {
      for (const k of IDEOS) {
        if (k === c.ideo || c.pop[k] < 0.5) continue;
        if (c.tag === st.player) {
          if (c._govPrompt && st.day - c._govPrompt < 120) break;
          c._govPrompt = st.day;
          G.queuePopup({ title: `${g.PARTY_N[k]} yükselişte`, text: `Halkın yarısından fazlası ${g.IDEOLOGIES[k].n.toLowerCase()} bir yönetim istiyor. Hükümeti devredebilir ya da hareketi bastırabilirsin (istikrar -%15, 50 siyasi güç).`, opts: [
            { n: 'Hükümeti devret', fx: () => G.setIdeology(c, k) },
            { n: 'Hareketi bastır', fx: () => { c.pop[k] -= 0.2; normalizePop(c); c.stabX -= 0.15; c.pp = Math.max(0, c.pp - 50); } },
          ] });
        } else G.setIdeology(c, k);
        break;
      }
    }
  };
  function normalizePop(c) {
    const s = IDEOS.reduce((a, k) => a + (c.pop[k] || 0), 0) || 1;
    for (const k of IDEOS) c.pop[k] = (c.pop[k] || 0) / s;
  }
  G.normalizePop = normalizePop;
  G.addPop = (c, k, v) => { c.pop[k] = clamp((c.pop[k] || 0) + v, 0.01, 0.98); normalizePop(c); };

  G.setIdeology = (c, ideo) => {
    const st = G.st;
    if (c.ideo === ideo) return;
    const old = c.ideo;
    c.ideo = ideo;
    c.leader = (g.ALT_LEADERS[c.tag] || {})[ideo] || `${g.PARTY_N[ideo]} Lideri`;
    if ((c.pop[ideo] || 0) < 0.55) { c.pop[ideo] = 0.55; normalizePop(c); }
    c.stabX -= 0.1;
    // ittifak lideriyle ideoloji uyuşmazsa ittifaktan çık
    if (c.fac) { const f = st.factions[c.fac]; if (f && f.leader !== c.tag && st.C[f.leader].ideo !== ideo && !c.enemies.length) G.leaveFaction(c.tag); }
    G.recomputeMods(c);
    G.log(`${G.cname(c.tag)} hükümeti değişti: ${c.leader} (${g.IDEOLOGIES[ideo].n}).`, [c.tag], 'major');
    G.mapDirty = 1;
  };

  // ---------- Yasalar ----------
  G.lawAllowed = (c, k, i) => {
    const o = g.LAWS[k].opts[i];
    if (o.war === 2 && !c.enemies.length) return { ok: false, why: 'Yalnızca savaşta' };
    if ((o.ws || 0) > (c.ws ?? 0) + 1e-9) return { ok: false, why: `%${Math.round(o.ws * 100)} savaş desteği gerekir` };
    return { ok: true };
  };

  // ---------- Danışmanlar ----------
  G.advName = (tag, type) => (g.ADV_NAMES[tag] || {})[type] || g.ADV_TYPES[type].n;
  G.advCost = (c, type) => {
    const r = g.ADV_TYPES[type].r;
    return Math.round(g.ADV_COST[r] * (c.adv && Object.values(c.adv).flat().length > 4 ? 1.2 : 1));
  };
  G.canHire = (c, type) => {
    const r = g.ADV_TYPES[type].r;
    const cur = (c.adv[r] || []);
    if (cur.includes(type)) return { ok: false, why: 'Zaten görevde' };
    if (cur.length >= g.ADV_SLOTS[r]) return { ok: false, why: 'Yuvalar dolu' };
    if (c.pp < G.advCost(c, type)) return { ok: false, why: `${G.advCost(c, type)} siyasi güç gerekli` };
    return { ok: true };
  };
  G.hireAdvisor = (c, type) => {
    const r = G.canHire(c, type); if (!r.ok) return r;
    c.pp -= G.advCost(c, type);
    const role = g.ADV_TYPES[type].r;
    (c.adv[role] || (c.adv[role] = [])).push(type);
    G.recomputeMods(c);
    return { ok: true };
  };
  G.fireAdvisor = (c, type) => {
    const role = g.ADV_TYPES[type].r;
    c.adv[role] = (c.adv[role] || []).filter((t) => t !== type);
    G.recomputeMods(c);
  };

  // ---------- Araştırma bonusu ----------
  G.startResearch = (c, id) => {
    const t = g.TECH_BY_ID[id];
    const r = { id, p: 0, b: 0 };
    const k = (c.rb || []).findIndex((x) => x[0] === t.cat);
    if (k >= 0) { r.b = c.rb[k][1]; c.rb.splice(k, 1); }
    c.res.push(r);
    return r;
  };
  G.resSpeed = (c, id) => {
    const t = g.TECH_BY_ID[id], m = c.mods;
    return 1 + (m.research || 0) + (m['rc_' + t.cat] || 0);
  };

  // ---------- Odak motoru ----------
  const flCache = {};
  G.focusList = (c) => {
    const key = c.tag;
    if (flCache[key]) return flCache[key];
    const nat = g.FOCUS_NATIONAL[c.tag];
    let list;
    if (nat) {
      const off = Math.max(...nat.map((f) => f.x)) + 1.5;
      list = nat.concat(g.FOCUS_GENERIC.filter((f) => !f.pol).map((f) => Object.assign({}, f, { x: f.x + off })));
    } else list = g.FOCUS_GENERIC;
    return (flCache[key] = list);
  };
  G.focusById = (c, id) => G.focusList(c).find((f) => f.id === id);
  G.focusReq = (c, f) => {
    if (!f.req) return { ok: true };
    const st = G.st;
    const [k, v] = f.req.split(':');
    switch (k) {
      case 'war': return { ok: c.enemies.length > 0, why: 'Savaşta olmalısın' };
      case 'peace': return { ok: !c.enemies.length, why: 'Barışta olmalısın' };
      case 'year': return { ok: G.year(st.day) >= +v, why: `${v} yılından itibaren` };
      case 'alive': return { ok: !!st.C[v]?.alive, why: `${G.cname(v)} var olmalı` };
      case 'warWith': return { ok: G.atWar(c.tag, v), why: `${G.cname(v)} ile savaşta olmalısın` };
      case 'tension': return { ok: st.tension >= +v, why: `Dünya gerginliği en az %${v}` };
    }
    return { ok: true };
  };
  G.focusPreOk = (c, f) => f.pre.every((p) => (Array.isArray(p) ? p.some((q) => c.focus.done[q]) : c.focus.done[p]));
  G.focusExcluded = (c, f) => (f.excl || []).some((x) => c.focus.done[x] || c.focus.cur === x);
  G.focusAvailable = (c, f) => !c.focus.done[f.id] && c.focus.cur !== f.id && G.focusPreOk(c, f) && !G.focusExcluded(c, f) && G.focusReq(c, f).ok;

  G.completeFocus = (c, id) => {
    const st = G.st; const f = G.focusById(c, id);
    c.focus.done[id] = 1; c.focus.cur = null; c.focus.p = 0;
    if (!f) return;
    const SPECIAL = new Set(['addCiv', 'addMil', 'addDock', 'addPlanes', 'addBombers', 'addCas', 'forts', 'tech', 'tech2', 'spirit', 'rmSpirit', 'pop', 'rb', 'tension', 'fn', 'ships', 'stock', 'units']);
    for (const [k, v] of Object.entries(f.fx)) {
      if (!SPECIAL.has(k)) { if (typeof v === 'number') c.fmods[k] = (c.fmods[k] || 0) + v; continue; }
      switch (k) {
        case 'addCiv': G.addFactories(c.tag, 'civ', v); break;
        case 'addMil': G.addFactories(c.tag, 'mil', v); break;
        case 'addDock': G.addFactories(c.tag, 'dock', v); break;
        case 'addPlanes': c.stock.fig += v; break;
        case 'addBombers': c.stock.bom += v; break;
        case 'addCas': c.stock.cas += v; break;
        case 'forts': G.borderForts(c.tag, v); break;
        case 'tech': case 'tech2': c.tech[v] = 1; break;
        case 'spirit': if (!c.spirits.includes(v)) c.spirits.push(v); break;
        case 'rmSpirit': c.spirits = c.spirits.filter((s) => s !== v); break;
        case 'pop': if (v === 'auth') G.addPop(c, c.ideo === 'com' ? 'com' : 'fas', 0.1); else for (const [ik, x] of Object.entries(v)) G.addPop(c, ik, x); break;
        case 'rb': for (const r of v) c.rb.push(r); break;
        case 'tension': st.tension = Math.min(100, st.tension + v); break;
        case 'ships': for (const [e, n] of Object.entries(v)) c.ships[e] = (c.ships[e] || 0) + n; break;
        case 'stock': for (const [e, n] of Object.entries(v)) c.stock[e] = (c.stock[e] || 0) + n; break;
        case 'units': for (const [t, n] of Object.entries(v)) for (let i = 0; i < n; i++) { const u = G.makeUnit(c.tag, t, c.cap, 1); st.units.push(u); } G.rebuildUnitIndex(); break;
        case 'fn': try { G.FX[v[0]](c, ...v.slice(1)); } catch (e) { console.error('focus fx', id, e); } break;
      }
    }
    G.recomputeMods(c);
    G.needSummary = 1;
    if (c.tag === st.player) G.log(`Ulusal odak tamamlandı: ${f.n}`, [c.tag], 'good');
    else if (f.fx.fn && g.FOCUS_NATIONAL[c.tag]) G.log(`${G.cname(c.tag)} ulusal odağını tamamladı: ${f.n}`, [c.tag], 'info');
  };

  // ---------- Odak özel etkileri ----------
  const alive = (t) => G.st.C[t]?.alive;
  const regionFilter = (region, target) => (i) => G.st.prov[i].o === target && (!region || g.FOCUS_REGIONS[region](P[i]));
  G.FX = {
    demand(c, target, region) {
      const st = G.st;
      if (!alive(target) || G.atWar(c.tag, target) || G.sameFaction(c.tag, target)) return;
      const has = (() => { for (let i = 0; i < NP; i++) if (regionFilter(region, target)(i)) return true; return false; })();
      if (!has) return;
      const label = region ? 'toprak talebi' : 'ilhak talebi';
      const accept = () => {
        G.annex(c.tag, target, regionFilter(region, target));
        G.log(`${G.cname(target)}, ${G.cname(c.tag)}'${G.ek(c.tag)} boyun eğdi (${label}).`, [c.tag, target], 'major');
        st.tension = Math.min(100, st.tension + 5);
      };
      const refuse = () => {
        st.goals[c.tag + '>' + target] = st.day;
        G.log(`${G.cname(target)} talebi reddetti. ${G.cname(c.tag)} savaş gerekçesi kazandı.`, [c.tag, target], 'warn');
      };
      if (target === st.player) {
        G.queuePopup({ title: `${G.cname(c.tag)}: ${label}`, text: `${G.cname(c.tag)} ${region ? 'bazı topraklarımızı' : 'ülkemizin tamamını'} talep ediyor. Reddedersek savaş çıkabilir.`, opts: [{ n: 'Kabul et', fx: accept }, { n: 'Reddet', fx: refuse }] });
        return;
      }
      const ratio = G.armyPower(c.tag) / (G.sidePower(target, (x) => G.armyPower(x.tag)) + 1);
      const ok = region ? ratio > 1.4 || (ratio > 1 && G.rand() < 0.5) : ratio > 2.5 || (ratio > 1.8 && !st.C[target].fac);
      if (ok && !st.C[target].fac) accept(); else refuse();
    },
    demandMany(c, list) { for (const t of list) G.FX.demand(c, t); },
    goal(c, list) {
      const st = G.st;
      for (const t of list) if (alive(t) && !G.atWar(c.tag, t) && !G.sameFaction(c.tag, t)) st.goals[c.tag + '>' + t] = st.day;
      if (c.tag === st.player) G.log(`Savaş gerekçesi kazanıldı: ${list.filter(alive).map(G.cname).join(', ')}`, [c.tag], 'warn');
    },
    pact(c, list) {
      for (const t of list) {
        if (!alive(t) || t === G.st.player) continue;
        const ok = G.proposePact(c.tag, t);
        if (!ok && c.tag === G.st.player) G.log(`${G.cname(t)} pakt önerisini reddetti.`, [c.tag], 'warn');
      }
    },
    guar(c, list) { for (const t of list) if (alive(t)) G.guarantee(c.tag, t); },
    joinFac(c, leader) {
      const st = G.st;
      if (!alive(leader)) return;
      let fid = st.C[leader].fac;
      if (!fid) fid = G.createFaction(leader, leader === 'GER' ? 'Mihver' : `${G.cname(leader)} İttifakı`);
      if (st.factions[fid].leader !== leader && st.factions[fid].leader === st.player) { G.log('İttifak lideri oyuncu: katılım isteği gönderildi.', [c.tag], 'info'); }
      G.joinFaction(c.tag, fid);
    },
    mkFac(c, name, invites) {
      if (!c.fac) G.createFaction(c.tag, name);
      for (const t of invites || []) if (alive(t) && t !== G.st.player) { const ok = G.inviteToFaction(c.tag, t); if (!ok && c.tag === G.st.player) G.log(`${G.cname(t)} ittifak davetini reddetti.`, [c.tag], 'warn'); }
    },
    invite(c, list) { G.FX.mkFac(c, `${G.cname(c.tag)} İttifakı`, list); },
    leader(c, ideo) { G.setIdeology(c, ideo); },
    leaderName(c, name) { c.leader = name; G.log(`${G.cname(c.tag)}: ${name} yönetimi devraldı.`, [c.tag], 'major'); },
    gift(c, list, eq) { for (const t of list) if (alive(t)) for (const [e, n] of Object.entries(eq)) G.st.C[t].stock[e] = (G.st.C[t].stock[e] || 0) + n; },
    general(c) { const gen = G.newGeneral(c, { good: 1 }); if (c.tag === G.st.player) G.log(`Yeni komutan: ${gen.n}`, [c.tag], 'good'); },
    fortRegion(c, region, lv) {
      const st = G.st;
      for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag && g.FOCUS_REGIONS[region](P[i])) st.prov[i].fort = Math.min(5, st.prov[i].fort + lv);
    },
  };

  // ---------- YZ: odak, danışman, yasa ----------
  G.aiFocus = (c) => {
    if (c.focus.cur) return;
    const list = G.focusList(c);
    const f = list.find((x) => x.ai !== 0 && G.focusAvailable(c, x));
    if (f) { c.focus.cur = f.id; c.focus.p = 0; }
  };
  const ADV_PRIORITY = ['captain', 'warind', 'd_ind', 'a_atk', 'workhorse', 'hc_inf', 'propaganda', 'd_tank', 'air_sup', 'theo', 'a_def', 'figurehead', 'n_fleet', 'recruiter', 'd_plane', 'hc_arm'];
  G.aiAdvisors = (c) => {
    if (c.pp < 220) return;
    for (const t of ADV_PRIORITY) {
      const r = g.ADV_TYPES[t].r;
      if ((r === 'navy' || r === 'ship' || t === 'n_fleet') && (c.sum.dock || 0) < 3) continue;
      if (G.canHire(c, t).ok) { G.hireAdvisor(c, t); return; }
    }
  };
  G.aiLaws = (c) => {
    const atWar = c.enemies.length > 0;
    for (const k of ['eco', 'mob']) {
      const nx = c.laws[k] + 1;
      if (nx >= g.LAWS[k].opts.length || c.pp < g.LAW_COST + 30) continue;
      if (k === 'eco' && nx === 4 && !atWar) continue;
      if (G.lawAllowed(c, k, nx).ok) { c.pp -= g.LAW_COST; c.laws[k] = nx; G.recomputeMods(c); }
    }
  };
})(window);
