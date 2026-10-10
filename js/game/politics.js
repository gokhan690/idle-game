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
    c.spirits = (p.sp || []).concat((g.START_SPIRITS || {})[c.tag] || []);
    c.laws.trade = p.trade ?? 1;
    c.laws.occ = 1;
    c.warDays = 0;
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
    if (c.el && c.el.susp) stabWar -= 0.1; // askıya alınmış seçimler
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
  // senaryo kilidi: alternatif tarihte yapay zekâ ülkesinin ideolojisi kolayca geri dönmez
  const locked = (c, k) => c.scenLock && c.tag !== G.st.player && k !== c.scenLock;
  G.addPop = (c, k, v) => { if (v > 0 && locked(c, k)) v *= 0.15; c.pop[k] = clamp((c.pop[k] || 0) + v, 0.01, 0.98); normalizePop(c); };

  G.setIdeology = (c, ideo) => {
    const st = G.st;
    if (c.ideo === ideo) return;
    if (locked(c, ideo) && (c.pop[ideo] || 0) < 0.8) return;
    const old = c.ideo;
    c.ideo = ideo;
    c.leader = (g.ALT_LEADERS[c.tag] || {})[ideo] || `${g.IDEOLOGIES[ideo].n} Hükümet`;
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
  // odak türü (HOI4 simge renkleri): sanayi, kara, hava, deniz, siyaset, diplomasi
  G.focusCat = (f) => {
    const fx = f.fx || {}, k = Object.keys(fx), fn = Array.isArray(fx.fn) ? fx.fn[0] : '';
    if (['demand', 'demandMany', 'guar', 'invite', 'joinFac', 'mkFac', 'pact', 'goal', 'gift'].includes(fn)) return 'dip';
    if (k.some((x) => ['addCiv', 'addMil', 'construct', 'factory', 'effCap', 'addInfra', 'synth', 'stock', 'steel', 'oil', 'al', 'rub', 'tun', 'chr', 'research', 'slots'].includes(x)) || (fx.rb || []).some((r) => r[0] === 'ind' || r[0] === 'elec')) return 'ind';
    if (k.some((x) => ['addPlanes', 'addBombers', 'addCas', 'air'].includes(x)) || (fx.rb || []).some((r) => r[0] === 'air')) return 'air';
    if (k.some((x) => ['navy', 'ships', 'addDock', 'addConv', 'invasion'].includes(x)) || (fx.rb || []).some((r) => r[0] === 'nav')) return 'sea';
    if (k.some((x) => ['landAtk', 'landDef', 'armAtk', 'org', 'units', 'forts', 'tech', 'plan', 'entrench', 'brk', 'train', 'mp', 'speed', 'xpGain'].includes(x)) || fn === 'general' || fn === 'fortRegion' || (fx.rb || []).length) return 'land';
    return 'pol';
  };
  // genel ağacın askerî dalları (ulusal ağaçta aynı türden dal varsa genel dal gösterilmez: her kuvvetin tek yönü olur, HOI4)
  const GEN_BRANCH = { land: { start: 0, w: 4 }, air: { start: 4, w: 2 }, sea: { start: 6, w: 2 } };
  const branchOf = (f) => (f.pol ? null : f.x < 4 ? 'land' : f.x < 6 ? 'air' : f.x < 8 ? 'sea' : null);
  const flCache = {}, llCache = {};
  // denize kıyısı olmayan ülke (deniz dalı gösterilmez); başlangıç durumuna göre bir kez hesaplanır
  const landlocked = (c) => { if (llCache[c.tag] == null && G.homeZone && G.st && G.st.C[c.tag]) llCache[c.tag] = G.homeZone(c) < 0 ? 1 : 0; return llCache[c.tag] === 1; };
  G.focusList = (c) => {
    const ll = landlocked(c), key = c.tag + (ll ? ':L' : '');
    if (flCache[key]) return flCache[key];
    const nat = g.FOCUS_NATIONAL[c.tag];
    let list;
    // ulusal ağaçta en az iki odaklı kara/hava/deniz dalı varsa genel karşılığı çıkar (her kuvvetin tek yönü olur, HOI4);
    // kıyısı olmayan ülkede deniz dalı yok; kalan dallar sola kaydırılır
    const drop = new Set(ll ? ['sea'] : []);
    if (nat) { const cnt = {}; for (const f of nat) { const k = G.focusCat(f); cnt[k] = (cnt[k] || 0) + 1; } for (const k of Object.keys(GEN_BRANCH)) if ((cnt[k] || 0) >= 2) drop.add(k); }
    const shift = (x) => { let d = 0; for (const k of drop) if (x >= GEN_BRANCH[k].start + GEN_BRANCH[k].w) d += GEN_BRANCH[k].w; return d; };
    const gen = g.FOCUS_GENERIC.filter((f) => !drop.has(branchOf(f)) && !(nat && f.pol));
    if (nat) {
      const off = Math.max(...nat.map((f) => f.x)) + 1.5;
      list = nat.concat(gen.map((f) => Object.assign({}, f, { x: f.x + off - shift(f.x) })));
    } else list = drop.size ? gen.map((f) => Object.assign({}, f, { x: f.x - shift(f.x) })) : gen;
    return (flCache[key] = list);
  };
  G.focusById = (c, id) => G.focusList(c).find((f) => f.id === id);
  G.focusDays = (f) => (f && f.days) || g.FOCUS_DAYS;
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
    const SPECIAL = new Set(['addCiv', 'addMil', 'addDock', 'addPlanes', 'addBombers', 'addCas', 'forts', 'tech', 'tech2', 'spirit', 'rmSpirit', 'pop', 'rb', 'tension', 'fn', 'ships', 'stock', 'units', 'addInfra', 'addConv', 'synth']);
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
        case 'ships': if (G.homeZone && G.homeZone(c) < 0) break; for (const [e, n] of Object.entries(v)) c.ships[e] = (c.ships[e] || 0) + n; break; // denize kıyısı olmayan ülke gemi almaz
        case 'stock': for (const [e, n] of Object.entries(v)) c.stock[e] = (c.stock[e] || 0) + n; break;
        case 'units': for (const [t, n] of Object.entries(v)) for (let i = 0; i < n; i++) { const u = G.makeUnit(c.tag, t, c.cap, 1); st.units.push(u); } G.rebuildUnitIndex(); break;
        case 'addInfra': G.FX.infra(c, v); break;
        case 'addConv': c.ships.conv = (c.ships.conv || 0) + v; break;
        case 'fn': try { G.FX[v[0]](c, ...v.slice(1)); } catch (e) { console.error('focus fx', id, e); } break;
      }
    }
    // bu odağın kaldırdığı ulusal ruhlar
    for (const s of c.spirits.slice()) {
      const S = g.SPIRITS[s];
      if (S && S.rm && S.rm.includes(id)) { c.spirits = c.spirits.filter((x) => x !== s); if (c.tag === st.player) G.log(`Ulusal ruh kalktı: ${S.n}.`, [c.tag], 'info'); }
    }
    // odağa bağlı tarihî olay artık tarihinde ayrıca çıkmaz
    if (G.EV_OF_FOCUS && G.EV_OF_FOCUS[id] && c.tag === st.player) st.ev[G.EV_OF_FOCUS[id]] = 1;
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
    // tarihî olayı odakla tetikle (HOI4: "Danzig ya da Savaş" → savaş). Olay koşulu tutmazsa yedek etki
    // uygulanır; oyuncu ertelerse yalnızca savaş gerekçesi türündeki yedek kalır (saldırı zamanını o seçer).
    event(c, id, fb) {
      const st = G.st, e = (G.EVENTS || []).find((x) => x.id === id);
      const fallback = () => { if (fb) G.FX[fb[0]](c, ...fb.slice(1)); };
      if (!e || st.ev[id] || !e.cond()) return fallback();
      st.ev[id] = 1;
      const later = fb && fb[0] === 'goal' ? fallback : () => {};
      if (c.tag === st.player) G.queuePopup({ title: e.title, text: e.text, opts: e.opts.map((o, i) => (i ? { n: o.n, fx: () => { o.fx(); later(); } } : o)) });
      else e.opts[0].fx();
    },
    goal(c, list) {
      const st = G.st;
      for (const t of list) if (alive(t) && !G.atWar(c.tag, t) && !G.sameFaction(c.tag, t)) st.goals[c.tag + '>' + t] = st.day;
      if (c.tag === st.player) G.log(`Savaş gerekçesi kazanıldı: ${list.filter(alive).map(G.cname).join(', ')}`, [c.tag], 'warn');
    },
    pact(c, list) {
      for (const t of list) {
        if (!alive(t) || t === G.st.player) continue;
        const ok = G.proposePact(c.tag, t);
        if (ok && [c.tag, t].sort().join() === 'GER,SOV') G.st.ev.mrPact = 1; // gizli protokol (Doğu Polonya)
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
    infra(c, n) {
      const st = G.st; G.ensureInfra && G.ensureInfra();
      const L = []; for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.c === c.tag && pr.o === c.tag && (pr.inf || 1) < 5) L.push(i); }
      L.sort((a, b) => (P[b].vp - P[a].vp) || ((st.prov[a].inf || 1) - (st.prov[b].inf || 1)));
      for (const i of L.slice(0, n)) st.prov[i].inf = Math.min(5, (st.prov[i].inf || 1) + 1);
      G.supDirty = 1;
    },
    decryptAll(c) { c.decryptAll = 1; },
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
    // işgal yasası: faşistler sert baskı, demokrasiler sivil yönetim (geniş işgal topraklarında)
    if (G.occSummary && atWar && c.pp >= g.LAW_COST + 30) {
      const want = c.ideo === 'fas' ? 0 : c.ideo === 'dem' ? 2 : 1;
      if ((c.laws.occ ?? 1) !== want && G.occSummary(c.tag).n >= 10) { c.pp -= g.LAW_COST; c.laws.occ = want; }
    }
    for (const k of ['eco', 'mob']) {
      const nx = c.laws[k] + 1;
      if (nx >= g.LAWS[k].opts.length || c.pp < g.LAW_COST + 30) continue;
      if (k === 'eco' && nx === 4 && !atWar) continue;
      if (G.lawAllowed(c, k, nx).ok) { c.pp -= g.LAW_COST; c.laws[k] = nx; G.recomputeMods(c); }
    }
  };
})(window);

// ---------- Kukla devletler, istihbarat, ödünç verme ----------
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  G.makePuppet = (over, tag) => {
    const st = G.st, c = st.C[tag], o = st.C[over];
    let n = 0;
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.oc === tag && pr.o === over) { pr.o = pr.c = pr.core = tag; n++; } }
    if (!n) return false;
    for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete st.wars[k]; }
    c.alive = 1; c.overlord = over; c.auto = 30; c.ideo = o.ideo; c.scenLock = 0; c.pop[o.ideo] = Math.max(c.pop[o.ideo] || 0, 0.6); G.normalizePop(c);
    c.leader = `${G.cname(over)} yanlısı hükümet`;
    G.updateSummaries();
    c.cap = G.anyOwnProvince(tag);
    const d = g.COUNTRY_DEFS[tag];
    for (let i = 0; i < NP; i++) if (st.prov[i].o === tag && (P[i].n === d.cap || (P[i].cs || []).includes(d.cap))) c.cap = i;
    G.cwDirty = 1; c.startW = G.coreWeight(tag, true);
    if (!o.fac) G.createFaction(over, `${G.cname(over)} İttifakı`);
    if (c.fac !== o.fac) { if (c.fac) G.leaveFaction(tag); G.joinFaction(tag, o.fac); }
    for (const t of o.enemies) G.setWar(tag, t);
    const k = Math.max(1, Math.round(c.sum.provs / 3));
    for (let i = 0; i < k; i++) st.units.push(G.makeUnit(tag, 'inf', c.cap, 0.7));
    c.stock.inf = Math.max(c.stock.inf, 2000); c.stock.art = Math.max(c.stock.art, 60);
    G.defaultLines(c);
    G.rebuildUnitIndex(); G.refreshEnemies();
    G.mapDirty = 1; G.needSummary = 1;
    G.log(`${G.cname(tag)}, ${G.cname(over)} himayesinde kukla devlet olarak yeniden kuruldu.`, [over, tag], 'major');
    return true;
  };
  // Oyuncunun serbest bırakabileceği uluslar: yok olmuş, asli toprakları oyuncunun elinde
  G.releasable = (tag) => {
    const st = G.st, out = {};
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === tag && pr.oc !== tag && !st.C[pr.oc]?.alive) out[pr.oc] = (out[pr.oc] || 0) + 1; }
    return Object.entries(out).filter(([t]) => !g.COUNTRY_DEFS[t].hidden || st.C[t]).map(([t, n]) => ({ t, n }));
  };

  // ---------- İstihbarat ----------
  G.OPS = {
    propaganda: { n: 'Propaganda Kampanyası', d: 'Hedefin istikrarı ve savaş desteği -%8', cost: 60, days: 30 },
    support: { n: 'İdeolojimizi Destekle', d: 'Hedefte ideolojimizin desteği +%12', cost: 75, days: 45 },
    sabotage: { n: 'Sabotaj', d: 'Hedef 2 askerî fabrika kaybeder', cost: 80, days: 40, war: 1 },
    decrypt: { n: 'Şifre Çözme', d: 'Hedefe karşı muharebede +%12 (1 yıl)', cost: 100, days: 60 },
    coup: { n: 'Darbe', d: 'İdeolojimizin desteği %30 üstündeyse hükümeti devirir', cost: 150, days: 90 },
  };
  G.opAllowed = (a, t, op) => {
    const st = G.st, c = st.C[a], x = st.C[t], O = G.OPS[op];
    if (st.ops.some((o) => o.a === a && o.t === t && o.op === op)) return { ok: false, why: 'Operasyon zaten sürüyor' };
    if (c.pp < O.cost) return { ok: false, why: `${O.cost} siyasi güç gerekli` };
    if (O.war && !G.atWar(a, t) && st.tension < 50) return { ok: false, why: 'Savaşta olmalı ya da gerginlik %50 üstünde' };
    if (op === 'coup') { if (x.major) return { ok: false, why: 'Büyük güçlerde darbe yapılamaz' }; if ((x.pop[c.ideo] || 0) < 0.3) return { ok: false, why: `${g.PARTY_N[c.ideo]} hedefte en az %30 olmalı` }; if (x.ideo === c.ideo) return { ok: false, why: 'Zaten aynı ideoloji' }; }
    if (op === 'support' && x.ideo === c.ideo) return { ok: false, why: 'Zaten aynı ideoloji' };
    return { ok: true };
  };
  G.startOp = (a, t, op) => {
    const r = G.opAllowed(a, t, op); if (!r.ok) return r;
    const c = G.st.C[a]; c.pp -= G.OPS[op].cost;
    G.st.ops.push({ a, t, op, d: G.OPS[op].days });
    return { ok: true };
  };
  G.opsTick = () => {
    const st = G.st;
    for (let k = 0; k < st.ops.length; k++) {
      const o = st.ops[k];
      if (--o.d > 0) continue;
      st.ops.splice(k, 1); k--;
      const c = st.C[o.a], x = st.C[o.t];
      if (!c?.alive || !x?.alive) continue;
      const mine = o.a === st.player || o.t === st.player;
      switch (o.op) {
        case 'propaganda': x.stabX -= 0.08; x.wsX -= 0.08; break;
        case 'support': G.addPop(x, c.ideo, 0.12); break;
        case 'sabotage': { let n = 2; for (let i = 0; i < NP && n > 0; i++) { const pr = st.prov[i]; if (pr.c === o.t && pr.mil > 0 && G.rand() < 0.3) { pr.mil--; n--; } } G.needSummary = 1; break; }
        case 'decrypt': c.decrypt = c.decrypt || {}; c.decrypt[o.t] = st.day + 365; break;
        case 'coup': if ((x.pop[c.ideo] || 0) >= 0.3 && !G.atWar(o.a, o.t)) { G.setIdeology(x, c.ideo); if (c.fac) G.joinFaction(o.t, c.fac); } break;
      }
      if (mine) G.log(`İstihbarat: ${G.OPS[o.op].n} (${G.cname(o.a)} → ${G.cname(o.t)}) tamamlandı.`, [o.a, o.t], o.a === st.player ? 'good' : 'bad');
    }
    // YZ: faşist/komünist büyük güçler yılda bir yakın komşularda ideoloji desteği
    if (st.day % 120 === 17) for (const c of Object.values(st.C)) {
      if (!c.alive || !c.major || c.tag === st.player || (c.ideo !== 'fas' && c.ideo !== 'com') || c.pp < 200) continue;
      const cands = Object.values(st.C).filter((x) => x.alive && !x.major && x.ideo !== c.ideo && G.dist(x.cap, c.cap) < 500);
      if (cands.length) {
        const x = cands[Math.floor(G.rand() * cands.length)];
        // tarihî modda YZ darbe yapmaz ve savaşan/komünist Çin gibi kilit ülkelerde ideoloji oynamaz
        if (st.opts.hist && (x.enemies.length || x.fac || x.overlord || ['PRC', 'CHI', 'SPR', 'SPN'].includes(x.tag))) continue;
        G.startOp(c.tag, x.tag, !st.opts.hist && (x.pop[c.ideo] || 0) >= 0.3 && st.tension > 40 ? 'coup' : 'support');
      }
    }
  };

  // ---------- Ödünç verme ve ambargo ----------
  G.LEND = [['inf', 1000, 'piyade teçhizatı'], ['art', 50, 'topçu'], ['tank', 30, 'tank'], ['fig', 50, 'avcı uçağı'], ['conv', 20, 'konvoy']];
  G.lend = (a, t, e, n) => {
    const st = G.st, c = st.C[a], x = st.C[t];
    if (e === 'conv') { if ((c.ships.conv || 0) < n) return false; c.ships.conv -= n; x.ships.conv = (x.ships.conv || 0) + n; }
    else { if ((c.stock[e] || 0) < n) return false; c.stock[e] -= n; x.stock[e] = (x.stock[e] || 0) + n; }
    st.rel = st.rel || {}; st.rel[t + '>' + a] = Math.min(60, (st.rel[t + '>' + a] || 0) + 6);
    return true;
  };
})(window);
