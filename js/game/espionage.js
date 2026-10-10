// İstihbarat teşkilatı (HOI4 La Résistance): ajan yetiştir, ülkelere gönderip casus ağı kur, ağ yeterince güçlenince
// operasyon düzenle (teknoloji çalma, sabotaj, şifre kırma, direniş, propaganda, darbe). Geliştirmeler teşkilatı güçlendirir;
// karşı istihbarat düşman ağlarını yavaşlatır ve ajan yakalar.
// Durum yalnızca teşkilat kurulunca oluşur (c.intel). YZ büyük güçleri tarihî olmayan modlarda kendi teşkilatını kurar.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const alive = (t) => !!G.st.C[t]?.alive;

  G.INTEL_FOUND = 150;
  G.INTEL_UPG = {
    school: { n: 'Ajan Okulu', d: 'Ajan sınırı +2, eğitim süresi yarıya iner, ağlar %25 hızlı kurulur.', cost: 60, days: 45 },
    ci: { n: 'Karşı İstihbarat Dairesi', d: 'Düşman ağları ülkende %40 yavaş kurulur, düşman ajanlarını yakalama şansın artar.', cost: 60, days: 45 },
    field: { n: 'Saha Operasyonları', d: 'Operasyon başarı şansı +%15, başarısızlıkta ajan kaybı yarıya iner.', cost: 70, days: 60 },
    crypto: { n: 'Kriptoloji Dairesi', d: 'Şifre kırma etkisi 2 yıl sürer; ülkene karşı kırılan şifrelerin etkisi yarıya iner.', cost: 70, days: 60 },
    prop: { n: 'Propaganda Bürosu', d: 'Kalıcı istikrar +%3, savaş desteği +%3; propaganda operasyonları iki kat etkili.', cost: 50, days: 45 },
  };
  G.SPY_OPS = {
    propaganda: { n: 'Kara Propaganda', d: 'Hedefin istikrarı ve savaş desteği −%6 (Propaganda Bürosu ile −%12).', net: 20, cost: 30, days: 20 },
    resist: { n: 'Direnişi Örgütle', d: 'Hedefin işgal ettiği topraklarda direniş artar, uyum düşer.', net: 30, cost: 40, days: 30 },
    sabotage: { n: 'Sanayi Sabotajı', d: 'Hedef 2 askerî fabrika kaybeder (Saha Operasyonları ile 3).', net: 35, cost: 45, days: 30 },
    steal: { n: 'Teknoloji Çal', d: 'Hedefin bildiği, senin araştırabileceğin bir teknolojiyi ele geçir.', net: 45, cost: 60, days: 40 },
    decrypt: { n: 'Şifreleri Kır', d: 'Hedefe karşı muharebede +%12 (1 yıl, Kriptoloji ile 2 yıl).', net: 50, cost: 60, days: 45 },
    coup: { n: 'Darbe Hazırla', d: 'Hedefte ideolojinin desteği en az %25 ise hükümeti devirir (büyük güçlerde olmaz).', net: 70, cost: 120, days: 60 },
  };
  G.intelMax = (c) => !c.intel ? 0 : 2 + (c.major ? 1 : 0) + (c.intel.up.school ? 2 : 0);
  G.intelCI = (tag) => { const x = G.st.C[tag]; if (!x) return 0; return (x.major ? 0.2 : 0.1) + (x.intel && x.intel.up.ci ? 0.4 : 0); };
  G.intelFree = (c) => { const I = c.intel; if (!I) return 0; return I.ag - Object.values(I.as).reduce((a, b) => a + b, 0); };
  G.intelChance = (c, t, op) => { const I = c.intel, n = (I.net[t] || 0); return clamp(0.5 + n / 200 + (I.up.field ? 0.15 : 0) - G.intelCI(t) * 0.5 - (op === 'coup' ? 0.15 : 0), 0.05, 0.95); };

  G.intelFound = (c) => {
    if (c.intel) return { ok: false, why: 'Teşkilat zaten kurulu' };
    if (c.pp < G.INTEL_FOUND) return { ok: false, why: `${G.INTEL_FOUND} siyasi güç gerekli` };
    c.pp -= G.INTEL_FOUND;
    c.intel = { ag: 1, tr: [], as: {}, net: {}, up: {}, upq: null, ops: [] };
    if (c.tag === G.st.player) G.log('İstihbarat teşkilatı kuruldu. İlk ajanımız göreve hazır.', [c.tag], 'good');
    return { ok: true };
  };
  G.intelRecruit = (c) => {
    const I = c.intel; if (!I) return { ok: false, why: 'Önce teşkilatı kur' };
    if (I.ag + I.tr.length >= G.intelMax(c)) return { ok: false, why: 'Ajan sınırı dolu' };
    if (c.pp < 25) return { ok: false, why: '25 siyasi güç gerekli' };
    c.pp -= 25; I.tr.push(I.up.school ? 15 : 30);
    return { ok: true };
  };
  G.intelAssign = (c, t, dv) => {
    const I = c.intel; if (!I || t === c.tag) return false;
    if (dv > 0 && G.intelFree(c) < 1) return false;
    if (dv < 0 && !(I.as[t] > 0)) return false;
    I.as[t] = (I.as[t] || 0) + dv; if (!I.as[t]) delete I.as[t];
    return true;
  };
  G.intelUpgrade = (c, id) => {
    const I = c.intel, U = G.INTEL_UPG[id];
    if (!I || !U || I.up[id]) return { ok: false, why: 'Kullanılamaz' };
    if (I.upq) return { ok: false, why: 'Başka bir geliştirme sürüyor' };
    if (c.pp < U.cost) return { ok: false, why: `${U.cost} siyasi güç gerekli` };
    c.pp -= U.cost; I.upq = { id, d: U.days };
    return { ok: true };
  };
  G.spyAllowed = (c, t, op) => {
    const I = c.intel, O = G.SPY_OPS[op], x = G.st.C[t];
    if (!I) return { ok: false, why: 'İstihbarat teşkilatı yok' };
    if (!x || !x.alive) return { ok: false, why: 'Hedef yok' };
    if (I.ops.some((o) => o.t === t && o.op === op)) return { ok: false, why: 'Operasyon sürüyor' };
    if ((I.net[t] || 0) < O.net) return { ok: false, why: `Casus ağı en az %${O.net} olmalı (şu an %${Math.floor(I.net[t] || 0)})` };
    if (c.pp < O.cost) return { ok: false, why: `${O.cost} siyasi güç gerekli` };
    if (op === 'coup') { if (x.major) return { ok: false, why: 'Büyük güçlerde darbe olmaz' }; if (x.ideo === c.ideo) return { ok: false, why: 'Zaten aynı ideoloji' }; if ((x.pop[c.ideo] || 0) < 0.25) return { ok: false, why: `${g.PARTY_N[c.ideo]} hedefte en az %25 olmalı` }; }
    if (op === 'steal' && !stealable(c, x).length) return { ok: false, why: 'Çalınabilecek teknoloji yok' };
    if (op === 'resist' && !occupiedBy(t).length) return { ok: false, why: 'Hedefin işgal ettiği toprak yok' };
    return { ok: true };
  };
  const stealable = (c, x) => Object.keys(x.tech).filter((id) => G.techAvailable(c, id));
  const occupiedBy = (t) => { const L = []; for (let i = 0; i < NP; i++) { const pr = G.st.prov[i]; if (pr.c === t && pr.rs != null) L.push(i); } return L; };
  G.spyStart = (c, t, op) => {
    const r = G.spyAllowed(c, t, op); if (!r.ok) return r;
    c.pp -= G.SPY_OPS[op].cost; c.intel.ops.push({ t, op, d: G.SPY_OPS[op].days });
    return { ok: true };
  };
  const rel = (a, b, v) => { const st = G.st; st.rel = st.rel || {}; st.rel[b + '>' + a] = clamp((st.rel[b + '>' + a] || 0) + v, -100, 100); };
  // operasyonun sonucu
  const resolve = (c, o) => {
    const st = G.st, x = st.C[o.t], I = c.intel, pl = st.player, mine = c.tag === pl, vict = o.t === pl;
    if (!x || !x.alive) return;
    const O = G.SPY_OPS[o.op];
    if (G.rand() > G.intelChance(c, o.t, o.op)) {
      // başarısız: ajan yakalanır, ağ zarar görür
      I.net[o.t] = Math.max(0, (I.net[o.t] || 0) - 30);
      if (G.rand() < (I.up.field ? 0.2 : 0.4) && I.as[o.t] > 0) { I.as[o.t]--; I.ag--; if (!I.as[o.t]) delete I.as[o.t]; }
      rel(c.tag, o.t, -15);
      if (mine) G.log(`İstihbarat: ${O.n} (${G.cname(o.t)}) başarısız oldu; ajanlarımız deşifre edildi.`, [c.tag, o.t], 'bad');
      else if (vict) G.log(`Karşı istihbarat: ${G.cname(c.tag)} casuslarının "${O.n}" girişimini engelledik.`, [o.t, c.tag], 'good');
      return;
    }
    I.net[o.t] = Math.max(0, (I.net[o.t] || 0) - 25);
    let what = '';
    switch (o.op) {
      case 'propaganda': { const k = I.up.prop ? 0.12 : 0.06; x.stabX -= k; x.wsX -= k; what = `istikrar ve savaş desteği −%${Math.round(k * 100)}`; break; }
      case 'resist': { let n = 0; for (const i of occupiedBy(o.t)) { const pr = st.prov[i]; pr.rs = Math.min(0.9, pr.rs + 0.2); pr.cp = Math.max(0, (pr.cp || 0) - 0.15); n++; } what = `${n} işgal eyaletinde direniş arttı`; break; }
      case 'sabotage': { let n = I.up.field ? 3 : 2; const L = []; for (let i = 0; i < NP; i++) if (st.prov[i].c === o.t && st.prov[i].mil > 0) L.push(i); for (let k = 0; k < n && L.length; k++) { const i = L[Math.floor(G.rand() * L.length)]; if (st.prov[i].mil > 0) st.prov[i].mil--; } G.needSummary = 1; what = `${n} askerî fabrika yok edildi`; break; }
      case 'steal': { const L = stealable(c, x); if (L.length) { const id = L[Math.floor(G.rand() * L.length)]; c.tech[id] = 1; G.recomputeMods(c); what = `teknoloji ele geçirildi: ${g.TECH_BY_ID[id].n}`; } break; }
      case 'decrypt': { c.decrypt = c.decrypt || {}; const half = x.intel && x.intel.up.crypto; c.decrypt[o.t] = st.day + (I.up.crypto ? 730 : 365) / (half ? 2 : 1); what = 'şifreleri kırıldı'; break; }
      case 'coup': if (!G.atWar(c.tag, o.t) && (x.pop[c.ideo] || 0) >= 0.25) { G.setIdeology(x, c.ideo); x.leader = (g.ALT_LEADERS[o.t] || {})[c.ideo] || x.leader; if (c.fac && G.st.factions[c.fac]) G.joinFaction(o.t, c.fac); what = 'hükümet devrildi'; } break;
    }
    if (mine && (o.op === 'steal' || o.op === 'coup') && what && G.achFlag) G.achFlag(o.op);
    if (mine) G.log(`İstihbarat: ${O.n} (${G.cname(o.t)}) başarılı — ${what}.`, [c.tag, o.t], 'good');
    else if (vict) G.log(`Düşman casusları (${G.cname(c.tag)}): ${O.n} — ${what}.`, [o.t, c.tag], 'bad');
  };

  // 5 günde bir: eğitim, geliştirme, ağ kurma, ajan yakalama, operasyonlar
  G.intelTick = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      const I = c.intel; if (!I) continue;
      if (!c.alive) { delete c.intel; continue; }
      // eğitim
      for (let k = 0; k < I.tr.length; k++) if ((I.tr[k] -= 5) <= 0) { I.tr.splice(k--, 1); I.ag++; if (c.tag === st.player) G.log('İstihbarat: yeni ajan eğitimini tamamladı.', [c.tag], 'info'); }
      // geliştirme
      if (I.upq && (I.upq.d -= 5) <= 0) { I.up[I.upq.id] = 1; if (c.tag === st.player) G.log(`İstihbarat: ${G.INTEL_UPG[I.upq.id].n} kuruldu.`, [c.tag], 'good'); I.upq = null; G.recomputeMods(c); }
      // ağlar
      for (const t of Object.keys(I.net)) if (!I.as[t]) { I.net[t] -= 1.5; if (I.net[t] <= 0) delete I.net[t]; }
      for (const [t, n] of Object.entries(I.as)) {
        if (!alive(t)) { delete I.as[t]; delete I.net[t]; I.ag -= n; continue; }
        const ci = G.intelCI(t);
        I.net[t] = Math.min(100, (I.net[t] || 0) + n * 2.2 * (I.up.school ? 1.25 : 1) * (1 - ci));
        // karşı istihbarat ajan yakalar (yüksek ağ daha görünür)
        if (G.rand() < ci * 0.03 * (1 + (I.net[t] || 0) / 100)) {
          I.as[t]--; I.ag--; if (!I.as[t]) delete I.as[t];
          I.net[t] = Math.max(0, I.net[t] - 15);
          rel(c.tag, t, -10);
          if (c.tag === st.player) G.log(`İstihbarat: ${G.cname(t)} ajanımızı yakaladı.`, [c.tag, t], 'bad');
          else if (t === st.player) G.log(`Karşı istihbarat: ${G.cname(c.tag)} ajanı yakalandı.`, [t, c.tag], 'good');
        }
      }
      // operasyonlar
      for (let k = 0; k < I.ops.length; k++) { const o = I.ops[k]; if ((o.d -= 5) > 0) continue; I.ops.splice(k--, 1); resolve(c, o); }
    }
    if (!st.opts.hist && st.day % 30 === 2) aiIntel();
  };
  // propaganda bürosu kalıcı etkisi (recomputeMods)
  G.intelFx = (c) => (c.intel && c.intel.up.prop ? { stab: 0.03, ws: 0.03 } : null);

  // YZ (tarihî olmayan modlar): büyük güçler 1937'den sonra teşkilat kurar, düşmanlarına ve rakiplerine ağ örüp operasyon yapar
  function aiIntel() {
    const st = G.st;
    if (st.day < 365) return;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.major || c.tag === st.player) continue;
      if (!c.intel) { c.pp += G.INTEL_FOUND; G.intelFound(c); continue; } // YZ teşkilatı bedelsiz kurulur
      const I = c.intel;
      if (I.ag + I.tr.length < G.intelMax(c) && c.pp > 40) G.intelRecruit(c);
      if (!I.upq && c.pp > 90) { const u = ['ci', 'school', 'field', 'crypto', 'prop'].find((k) => !I.up[k]); if (u) G.intelUpgrade(c, u); }
      // hedefler: savaştaki düşmanlar, sonra ideolojik rakip büyük güçler
      const tg = c.enemies.filter(alive).concat(Object.values(st.C).filter((x) => x.alive && x.major && x.tag !== c.tag && x.ideo !== c.ideo && G.opinion(c.tag, x.tag) < -20).map((x) => x.tag));
      for (const t of tg) { if (G.intelFree(c) < 1) break; if (!I.as[t]) G.intelAssign(c, t, 1); }
      for (const t of Object.keys(I.as)) {
        const n = I.net[t] || 0, war = G.atWar(c.tag, t);
        const pick = war ? ['decrypt', 'sabotage', 'resist', 'propaganda'] : ['steal', 'propaganda'];
        for (const op of pick) if (n >= G.SPY_OPS[op].net && G.spyAllowed(c, t, op).ok && c.pp > G.SPY_OPS[op].cost + 20) { G.spyStart(c, t, op); break; }
      }
    }
  }
})(window);
