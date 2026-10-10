// Barış konferansı (HOI4 tarzı): teslim olan ülkenin toprakları, savaşa katkı puanıyla
// sırayla paylaşılır. Bölge talep etme, kukla devlet kurma ve ulus serbest bırakma.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  // ---------- Savaşa katkı ----------
  // Muharebede düşmana verilen hasar (sim.js) katkı puanına eklenir.
  G.contrib = (L, w, v) => {
    const st = G.st, cb = st.contrib || (st.contrib = {});
    const m = cb[L] || (cb[L] = {});
    m[w] = (m[w] || 0) + v;
  };

  // Eyaletin temel değeri (puan maliyeti)
  G.provCost = (i) => {
    const pr = G.st.prov[i];
    return 2 + P[i].vp * 0.35 + (pr.civ + pr.mil) * 1.6 + pr.dock * 0.8;
  };

  // ---------- Konferans bölgeleri (HOI4 "state") ----------
  function buildStates(L) {
    const st = G.st;
    const mine = [];
    for (let i = 0; i < NP; i++) if (st.prov[i].o === L) mine.push(i);
    const seen = new Uint8Array(NP), states = [];
    const sOf = {};
    for (const i0 of mine) {
      if (seen[i0]) continue;
      // aynı asli sahibe ait bitişik eyaletler
      const oc = st.prov[i0].oc, comp = [i0]; seen[i0] = 1;
      for (let k = 0; k < comp.length; k++) for (const j of P[comp[k]].a) if (!seen[j] && st.prov[j].o === L && st.prov[j].oc === oc) { seen[j] = 1; comp.push(j); }
      const k = Math.max(1, Math.round(comp.length / 3.5));
      // tohumlar: en büyük şehir, sonra en uzak eyaletler
      const seeds = [comp.reduce((b, n) => (P[n].vp > P[b].vp ? n : b), comp[0])];
      while (seeds.length < k) {
        let b = -1, bd = -1;
        for (const n of comp) { let d = Infinity; for (const s of seeds) d = Math.min(d, G.dist(n, s)); if (d > bd) { bd = d; b = n; } }
        seeds.push(b);
      }
      const asg = new Map(); const q = [];
      seeds.forEach((s, si) => { asg.set(s, si); q.push(s); });
      const inComp = new Set(comp);
      for (let h = 0; h < q.length; h++) for (const j of P[q[h]].a) if (inComp.has(j) && !asg.has(j)) { asg.set(j, asg.get(q[h])); q.push(j); }
      for (const n of comp) if (!asg.has(n)) asg.set(n, 0);
      const groups = seeds.map(() => []);
      for (const n of comp) groups[asg.get(n)].push(n);
      for (const gr of groups) if (gr.length) { const id = states.length; states.push({ id, p: gr, oc }); for (const n of gr) sOf[n] = id; }
    }
    const used = new Map();
    for (const s of states) {
      const best = s.p.reduce((b, n) => (P[n].vp > P[b].vp ? n : b), s.p[0]);
      const nm = G.pname(best); const k = (used.get(nm) || 0) + 1; used.set(nm, k);
      s.n = k > 1 ? `${nm} ${k}` : nm; s.c = best;
      s.vp = s.p.reduce((a, n) => a + P[n].vp, 0);
      s.ind = s.p.reduce((a, n) => a + st.prov[n].civ + st.prov[n].mil, 0);
    }
    return { states, sOf };
  }

  // ---------- Konferansı başlat ----------
  G.startConference = (L, winners) => {
    const st = G.st, c = st.C[L];
    const parts = winners.filter((t) => st.C[t]?.alive && t !== L);
    if (!parts.length) return null;
    const { states, sOf } = buildStates(L);
    if (!states.length) return null;
    // katkı payı: %55 muharebe, %45 işgal edilen toprak
    const cb = (st.contrib && st.contrib[L]) || {};
    if (G.cwDirty) G.recalcCoreWeights();
    const occ = {}; let occT = 0, batT = 0;
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === L && parts.includes(pr.c)) { const w = G.cw[i] + 0.2; occ[pr.c] = (occ[pr.c] || 0) + w; occT += w; } }
    for (const t of parts) batT += cb[t] || 0;
    let share = parts.map((t) => {
      const b = batT > 0 ? (cb[t] || 0) / batT : 0, o = occT > 0 ? (occ[t] || 0) / occT : 0;
      const wb = batT > 0 ? (occT > 0 ? 0.55 : 1) : 0, wo = occT > 0 ? 1 - wb : 0;
      let v = wb * b + wo * o;
      if (!batT && !occT) v = 1 / parts.length;
      const war = st.wars[G.pairKey(t, L)];
      if (v < 0.03 && war && st.day - war.since > 60) v = 0.03;
      return [t, v];
    }).filter(([, v]) => v > 0.005);
    const sum = share.reduce((a, [, v]) => a + v, 0) || 1;
    let pool = 0; for (const s of states) for (const n of s.p) pool += G.provCost(n);
    pool *= 1.0;
    const conf = {
      L, day: st.day, round: 1, states, sOf,
      own: {}, // eyalet -> { t: alan, by?: serbest bırakan }
      parts: share.map(([t, v]) => ({ t, sh: v / sum, pts: Math.round(pool * v / sum), pass: 0 })).sort((a, b) => b.pts - a.pts),
      ord: [], ti: 0, log: [], puppet: null, rel: [],
      ctrl: {}, // başlangıçtaki kontrol (maliyet için)
      startW: c.startW || 1,
    };
    for (const s of states) for (const n of s.p) conf.ctrl[n] = st.prov[n].c;
    conf.ord = conf.parts.map((p) => p.t);
    return conf;
  };

  const part = (conf, t) => conf.parts.find((p) => p.t === t);
  const free = (conf, s) => s.p.filter((n) => !conf.own[n]);

  // Maliyet çarpanı: kendi işgalin ucuz, başkasının işgali pahalı, asli toprağın yarı fiyat
  G.confCost = (conf, w, provs) => {
    let c = 0;
    for (const n of provs) {
      const pc = conf.ctrl[n], pr = G.st.prov[n];
      let m = pc === w ? 0.6 : pc === conf.L || !conf.parts.some((p) => p.t === pc) ? 1.3 : 1.6;
      if (pr.oc === w) m *= 0.5;
      c += G.provCost(n) * m;
    }
    return Math.round(c);
  };
  G.confStateCost = (conf, w, s) => G.confCost(conf, w, free(conf, s));
  G.confPuppetCost = (conf) => {
    let c = 0; for (const s of conf.states) for (const n of free(conf, s)) c += G.provCost(n);
    return Math.round(c * 0.45);
  };
  // Serbest bırakılabilir uluslar: yok olmuş, asli toprakları L'nin elinde
  G.confReleasable = (conf) => {
    const st = G.st, out = {};
    for (const s of conf.states) for (const n of free(conf, s)) {
      const oc = st.prov[n].oc;
      if (oc === conf.L || st.C[oc]?.alive || !g.COUNTRY_DEFS[oc] || conf.rel.includes(oc)) continue;
      (out[oc] || (out[oc] = [])).push(n);
    }
    return Object.entries(out).filter(([t, l]) => l.length >= 1 && !conf.parts.some((p) => p.t === t)).map(([t, provs]) => ({ t, provs }));
  };
  G.confReleaseCost = (conf, w, provs) => Math.round(G.confCost(conf, w, provs) * 0.5);
  const remainFrac = (conf) => {
    let tot = 0, fr = 0;
    for (const s of conf.states) for (const n of s.p) { const v = G.cw[n] + 0.1; tot += v; if (!conf.own[n]) fr += v; }
    return tot ? fr / tot : 0;
  };
  G.confRemainFrac = remainFrac;
  G.confTurn = (conf) => conf.ord[conf.ti];

  // ---------- Eylemler ----------
  // a: { k: 'take', s } | { k: 'puppet' } | { k: 'release', t } | { k: 'pass' } | { k: 'quit' }
  G.confAct = (conf, w, a) => {
    if (G.confTurn(conf) !== w || conf.done) return { ok: false, why: 'Sıra sende değil.' };
    const p = part(conf, w);
    const L = conf.L;
    if (a.k === 'take') {
      const s = conf.states[a.s]; if (!s) return { ok: false };
      const fl = free(conf, s); if (!fl.length) return { ok: false, why: 'Bu bölge zaten talep edildi.' };
      const cost = G.confCost(conf, w, fl);
      if (cost > p.pts) return { ok: false, why: `${cost} puan gerekli.` };
      p.pts -= cost; for (const n of fl) conf.own[n] = { t: w };
      conf.log.push({ t: w, m: `${s.n} bölgesini talep etti (${cost})` });
    } else if (a.k === 'puppet') {
      if (conf.puppet) return { ok: false };
      const cost = G.confPuppetCost(conf);
      if (cost > p.pts) return { ok: false, why: `${cost} puan gerekli.` };
      if (remainFrac(conf) < 0.05) return { ok: false, why: 'Geriye kukla kuracak toprak kalmadı.' };
      p.pts -= cost; conf.puppet = w;
      for (const s of conf.states) for (const n of free(conf, s)) conf.own[n] = { t: L, by: w };
      conf.log.push({ t: w, m: `${G.cname(L)} topraklarının kalanında kukla devlet kurdu (${cost})` });
    } else if (a.k === 'release') {
      const r = G.confReleasable(conf).find((x) => x.t === a.t); if (!r) return { ok: false };
      const cost = G.confReleaseCost(conf, w, r.provs);
      if (cost > p.pts) return { ok: false, why: `${cost} puan gerekli.` };
      p.pts -= cost; conf.rel.push(a.t);
      for (const n of r.provs) conf.own[n] = { t: a.t, by: w };
      conf.log.push({ t: w, m: `${G.cname(a.t)} ulusunu kukla olarak serbest bıraktı (${cost})` });
    } else if (a.k === 'pass' || a.k === 'quit') {
      p.pass = a.k === 'quit' ? 2 : 1;
      if (a.k === 'quit') conf.log.push({ t: w, m: 'konferanstan çekildi' });
    }
    if (a.k !== 'pass' && a.k !== 'quit') { for (const q of conf.parts) if (q.pass === 1) q.pass = 0; }
    nextTurn(conf);
    return { ok: true };
  };

  function canDoAny(conf, w) {
    const p = part(conf, w);
    if (p.pass === 2) return false;
    for (const s of conf.states) { const fl = free(conf, s); if (fl.length && G.confCost(conf, w, fl) <= p.pts) return true; }
    if (!conf.puppet && remainFrac(conf) >= 0.05 && G.confPuppetCost(conf) <= p.pts) return true;
    return G.confReleasable(conf).some((r) => G.confReleaseCost(conf, w, r.provs) <= p.pts);
  }
  function nextTurn(conf) {
    // herkes pas geçti ya da kimse bir şey alamıyorsa biter
    const active = conf.parts.filter((p) => p.pass !== 2 && canDoAny(conf, p.t) && p.pass !== 1);
    const anyFree = conf.states.some((s) => free(conf, s).length);
    if (!anyFree || !active.length) { conf.done = 1; return; }
    for (let k = 0; k < conf.ord.length; k++) {
      conf.ti++;
      if (conf.ti >= conf.ord.length) {
        conf.ti = 0; conf.round++;
        // HOI4: her tur sıralama kalan puana göre
        conf.ord = conf.parts.slice().sort((a, b) => b.pts - a.pts).map((p) => p.t);
      }
      const p = part(conf, conf.ord[conf.ti]);
      if (p.pass !== 2 && p.pass !== 1 && canDoAny(conf, p.t)) return;
    }
    conf.done = 1;
  }

  // ---------- Yapay zekâ ----------
  G.confAI = (conf, w) => {
    const st = G.st, c = st.C[w], L = conf.L, Lc = st.C[L];
    const p = part(conf, w);
    const top = conf.parts.reduce((b, q) => (q.sh > b.sh ? q : b), conf.parts[0]).t === w;
    const owned = (n) => st.prov[n].o === w || conf.own[n]?.t === w;
    let best = null, bs = 0;
    for (const s of conf.states) {
      const fl = free(conf, s); if (!fl.length) continue;
      const cost = G.confCost(conf, w, fl); if (cost > p.pts) continue;
      const ctrl = fl.filter((n) => conf.ctrl[n] === w).length / fl.length;
      const core = fl.filter((n) => st.prov[n].oc === w).length / fl.length;
      const adj = fl.some((n) => P[n].a.some((j) => owned(j)));
      const other = fl.filter((n) => conf.ctrl[n] !== w && conf.ctrl[n] !== L && conf.parts.some((q) => q.t === conf.ctrl[n] && q.pass !== 2)).length / fl.length;
      if (other >= 0.5 && core < 0.5) continue; // başka bir galibin işgal ettiği bölgeye dokunma
      // asli toprak, işgal ettiği yer ya da küçük bir ülkenin geri kalanı (ana galip)
      const ok = core >= 0.5 || ctrl >= 0.5 || (ctrl > 0 && conf.round > 1) || (top && !Lc.major && adj && ctrl > 0) || (top && !Lc.major && adj && remainFrac(conf) < 0.35);
      if (!ok) continue;
      const val = fl.reduce((a, n) => a + P[n].vp + 1 + 3 * (st.prov[n].civ + st.prov[n].mil) + st.prov[n].dock, 0);
      const sc = (val / Math.max(1, cost)) * (1 + ctrl) * (core >= 0.5 ? 3 : 1) * (adj ? 1.3 : 1);
      if (sc > bs) { bs = sc; best = s; }
    }
    // demokrasiler ve komünistler işgal ettikleri yok olmuş ulusları serbest bırakır
    if (c.ideo === 'dem' || c.ideo === 'com') {
      for (const r of G.confReleasable(conf)) {
        const mine = r.provs.filter((n) => conf.ctrl[n] === w).length;
        if (mine >= r.provs.length * 0.5 && G.confReleaseCost(conf, w, r.provs) <= p.pts) return G.confAct(conf, w, { k: 'release', t: r.t });
      }
    }
    if (best) {
      const fl = free(conf, best);
      if (fl.some((n) => st.prov[n].oc === w) || fl.some((n) => conf.ctrl[n] === w) || !(c.ideo === 'dem')) return G.confAct(conf, w, { k: 'take', s: best.id });
    }
    // büyük gücün kalan toprağında kukla devlet (savaş bittiyse)
    const otherWars = c.enemies.filter((e) => e !== L).length;
    if (top && Lc.major && !otherWars && !conf.puppet && remainFrac(conf) >= 0.25 && G.confPuppetCost(conf) <= p.pts) return G.confAct(conf, w, { k: 'puppet' });
    return G.confAct(conf, w, { k: 'quit' });
  };

  // Oyuncunun sırasına kadar (ya da sonuna kadar) yapay zekâ oynar
  G.confRun = (conf) => {
    let guard = 0;
    while (!conf.done && guard++ < 2000) {
      const w = G.confTurn(conf);
      if (w === G.st.player) return;
      G.confAI(conf, w);
    }
  };

  // ---------- Sonuçları uygula ----------
  G.confFinish = (conf) => {
    const st = G.st, L = conf.L, c = st.C[L];
    const gained = {};
    for (const s of conf.states) for (const n of s.p) {
      const pr = st.prov[n], o = conf.own[n];
      if (o && o.t !== L) {
        pr.o = o.t; if (pr.oc === o.t) pr.core = o.t; // ilhak edilen yabancı toprak asli olmaz (HOI4)
        if (!G.atWar(o.t, pr.c)) pr.c = o.t;
        gained[o.by || o.t] = (gained[o.by || o.t] || 0) + 1;
      } else pr.c = L; // işgal sona erer
    }
    G.cwDirty = 1; G.mapDirty = 1; G.needSummary = 1;
    // serbest bırakılan uluslar
    for (const t of conf.rel) {
      const by = Object.values(conf.own).find((o) => o.t === t)?.by;
      const ct = st.C[t]; ct.alive = 1;
      G.updateSummaries();
      G.puppetSetup(by, t, { units: 1, war: 0 });
    }
    // kalan toprak
    G.updateSummaries();
    let remain = 0; for (let i = 0; i < NP; i++) if (st.prov[i].o === L) remain++;
    const top = conf.parts.reduce((b, q) => (q.sh > b.sh ? q : b), conf.parts[0]).t;
    let full = false;
    if (!remain) full = true;
    else if (conf.puppet) G.puppetSetup(conf.puppet, L, { units: 0, war: 0 });
    else {
      const rem = G.coreWeight(L, true) + (() => { let v = 0; for (let i = 0; i < NP; i++) if (st.prov[i].o === L && st.prov[i].core !== L) v += G.cw[i]; return v; })();
      if (rem < conf.startW * 0.1) {
        // küçük artık: işgal edenine, yoksa en büyük katkı sahibine
        full = true;
        for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o !== L) continue; const k = conf.parts.some((p) => p.t === conf.ctrl[i] && st.C[p.t]?.alive) ? conf.ctrl[i] : top; pr.o = pr.c = k; if (pr.oc === k) pr.core = k; gained[k] = (gained[k] || 0) + 1; }
      }
    }
    // başka ülkelerin topraklarındaki L birlikleri dağılır
    for (const u of st.units) if (u.t === L && (u.loc >= NP || st.prov[u.loc].c !== L)) u.dead = 1;
    st.units = st.units.filter((u) => !u.dead);
    G.cwDirty = 1;
    for (const p of conf.parts) if (st.C[p.t]?.alive) st.C[p.t].startW = G.coreWeight(p.t, true);
    G.updateSummaries();
    if (full) G.killCountry(L);
    else {
      if (st.prov[c.cap]?.o !== L) c.cap = G.anyOwnProvince(L);
      const d = g.COUNTRY_DEFS[L];
      for (let i = 0; i < NP; i++) if (st.prov[i].o === L && (P[i].n === d.cap || (P[i].cs || []).includes(d.cap))) c.cap = i;
      // kalan devlet yeni bir başlangıç ölçüsüyle devam eder (ör. sürgündeki Hollanda hükümeti ve Doğu Hint Adaları)
      c.startW = G.coreWeight(L, false) || G.coreWeight(L, true); c.surrender = 0;
      G.defaultLines && G.defaultLines(c);
    }
    if (st.contrib) delete st.contrib[L];
    G.rebuildUnitIndex(); G.refreshEnemies();
    G.supDirty = 1;
    const parts = Object.entries(gained).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${G.cname(t)} ${n} eyalet`);
    const tail = full ? `${G.cname(L)} haritadan silindi.` : conf.puppet ? `${G.cname(L)}, ${G.cname(conf.puppet)} kuklası oldu.` : `${G.cname(L)} kalan topraklarında tarafsız olarak devam ediyor.`;
    conf.summary = `${parts.length ? parts.join(', ') + ' aldı. ' : 'Toprak el değiştirmedi. '}${conf.rel.length ? conf.rel.map((t) => G.cname(t)).join(', ') + ' serbest bırakıldı. ' : ''}${tail}`;
    conf.full = full; conf.top = top;
    G.log(`Barış konferansı (${G.cname(L)}): ${conf.summary}`, [L, top], 'major');
    return conf;
  };

  // Kukla kurulumu (toprak devri dışında): efendi ideolojisi, ittifak, birlikler
  G.puppetSetup = (over, tag, opt = {}) => {
    const st = G.st, c = st.C[tag], o = st.C[over];
    if (!o) return;
    for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete st.wars[k]; }
    c.alive = 1; c.overlord = over; c.auto = 30; c.ideo = o.ideo; c.pop[o.ideo] = Math.max(c.pop[o.ideo] || 0, 0.6); G.normalizePop(c);
    c.leader = `${G.cname(over)} yanlısı hükümet`;
    G.updateSummaries();
    if (!(c.cap >= 0 && st.prov[c.cap].o === tag)) c.cap = G.anyOwnProvince(tag);
    const d = g.COUNTRY_DEFS[tag];
    for (let i = 0; i < NP; i++) if (st.prov[i].o === tag && (P[i].n === d.cap || (P[i].cs || []).includes(d.cap))) c.cap = i;
    G.cwDirty = 1; c.startW = G.coreWeight(tag, true);
    if (!o.fac) G.createFaction(over, `${G.cname(over)} İttifakı`);
    if (c.fac !== o.fac) { if (c.fac) G.leaveFaction(tag); G.joinFaction(tag, o.fac); }
    if (opt.war !== 0) for (const t of o.enemies) G.setWar(tag, t);
    if (opt.units !== 0) {
      const k = Math.max(1, Math.round(c.sum.provs / 3));
      for (let i = 0; i < k; i++) st.units.push(G.makeUnit(tag, 'inf', c.cap, 0.7));
      c.stock.inf = Math.max(c.stock.inf, 2000); c.stock.art = Math.max(c.stock.art, 60);
    }
    G.defaultLines(c);
    G.rebuildUnitIndex(); G.refreshEnemies();
    G.mapDirty = 1; G.needSummary = 1;
  };
})(window);
