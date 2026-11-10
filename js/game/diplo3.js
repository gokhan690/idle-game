// Diplomasi derinliği (HOI4): savaş hedefi türleri, sürekli diplomatik eylemler ve görüş dökümü.
// Yeni durum alanları (st.goalK, c.dipAct) yalnız oyuncu kullanınca oluşur; yokken simülasyon değişmez.
(function (g) {
  const G = g.G;
  // savaş hedefi türleri: gerekçe maliyeti/süresi ve barış konferansındaki puan çarpanları
  G.GOAL_K = {
    annex: { n: 'İlhak', d: 'Standart gerekçe: konferansta olağan maliyet.', cost: 1, days: 1, take: 1, puppet: 1 },
    border: { n: 'Sınır toprağı', d: 'Ucuz ve hızlı gerekçe; konferansta toprak almak %20 ucuz, kuklalaştırma %25 pahalı.', cost: 0.6, days: 0.7, take: 0.8, puppet: 1.25 },
    puppet: { n: 'Kuklalaştırma', d: 'Konferansta kukla kurmak %40 ucuz, toprak almak %15 pahalı.', cost: 0.8, days: 0.85, take: 1.15, puppet: 0.6 },
  };
  G.goalKind = (a, b) => (G.st.goalK && G.st.goalK[a + '>' + b]) || 'annex';
  G.justifyCostK = (c, k) => Math.round(G.justifyCost(c) * (G.GOAL_K[k] || G.GOAL_K.annex).cost);
  G.justifyDaysK = (c, k) => Math.round(G.justifyDays(c) * (G.GOAL_K[k] || G.GOAL_K.annex).days);
  G.startJustifyK = (a, b, k) => {
    const st = G.st, c = st.C[a], K = G.GOAL_K[k]; if (!K) return { ok: false, why: 'Geçersiz hedef' };
    const r = G.canJustify(a, b);
    // canJustify tam maliyete bakar: daha ucuz hedefte yalnız siyasi güç yetmiyorsa yeniden değerlendir
    if (!r.ok && !(c.pp >= G.justifyCostK(c, k) && /siyasi güç gerekli/.test(r.why || ''))) return r;
    c.pp -= G.justifyCostK(c, k);
    c.just = { t: b, d: G.justifyDaysK(c, k) };
    (st.goalK || (st.goalK = {}))[a + '>' + b] = k;
    st.tension = Math.min(100, st.tension + (k === 'border' ? 2 : 3)); G.tsrc(a, k === 'border' ? 2 : 3, 'savaş gerekçesi');
    return { ok: true };
  };
  // konferans çarpanı: kazananın yenilene karşı savaş hedefi
  G.goalMul = (conf, w, what) => { const st = G.st; if (!st.goalK) return 1; const K = G.GOAL_K[st.goalK[w + '>' + conf.L]]; return K ? K[what] : 1; };

  // sürekli diplomatik eylemler: günlük siyasi güç karşılığı
  G.DIPACT = {
    rel: { n: 'İlişkileri geliştir', d: 'Günde 0,2 siyasi güç; ülkenin sana görüşü her gün artar (en çok +60).', pp: 0.2 },
    ideo: { n: 'İdeolojini yay', d: 'Günde 0,3 siyasi güç; ülkede senin ideolojinin desteği yavaşça artar.', pp: 0.3 },
  };
  G.DIPACT_MAX = 3;
  G.dipActOn = (c, k, t) => !!(c.dipAct && c.dipAct.some((x) => x.k === k && x.t === t));
  G.dipActToggle = (a, k, t) => {
    const st = G.st, c = st.C[a], x = st.C[t];
    if (!G.DIPACT[k] || !x || !x.alive || a === t) return { ok: false, why: 'Geçersiz' };
    if (G.dipActOn(c, k, t)) { c.dipAct = c.dipAct.filter((y) => !(y.k === k && y.t === t)); if (!c.dipAct.length) delete c.dipAct; return { ok: true, on: false }; }
    if (G.atWar(a, t)) return { ok: false, why: 'Savaştasınız' };
    if (k === 'ideo' && (c.ideo === 'neu' || x.ideo === c.ideo)) return { ok: false, why: c.ideo === 'neu' ? 'Bağlantısız yönetimin yayacağı bir ideoloji yok' : 'Bu ülke zaten aynı ideolojide' };
    if ((c.dipAct || []).length >= G.DIPACT_MAX) return { ok: false, why: `Aynı anda en çok ${G.DIPACT_MAX} diplomatik eylem yürütülür` };
    (c.dipAct || (c.dipAct = [])).push({ k, t });
    return { ok: true, on: true };
  };
  G.dipActTick = (c) => {
    const st = G.st;
    for (const a of c.dipAct.slice()) {
      const x = st.C[a.t], D = G.DIPACT[a.k];
      const stop = (why) => { c.dipAct = c.dipAct.filter((y) => y !== a); if (G.isHuman(c.tag)) G.log(`${D.n} (${G.cname(a.t)}) sona erdi: ${why}.`, [c.tag, a.t], 'info'); };
      if (!x || !x.alive || G.atWar(c.tag, a.t)) { stop('ülke artık uygun değil'); continue; }
      if ((c.pp || 0) < D.pp) { stop('siyasi güç tükendi'); continue; }
      c.pp -= D.pp;
      if (a.k === 'rel') {
        st.rel = st.rel || {}; const key = a.t + '>' + c.tag, cur = st.rel[key] || 0;
        if (cur >= 60) { stop('ilişkiler en üst düzeyde'); continue; }
        st.rel[key] = Math.min(60, cur + 0.25); if (st.day % 10 === 0 && G.relClear) G.relClear();
      } else if (a.k === 'ideo') {
        if (x.ideo === c.ideo) { stop('ülke artık aynı ideolojide'); continue; }
        const add = 0.0006, tot = Object.keys(x.pop).reduce((s, k) => s + (k === c.ideo ? 0 : x.pop[k]), 0);
        if (tot > 0.05) { for (const k of Object.keys(x.pop)) if (k !== c.ideo) x.pop[k] -= add * x.pop[k] / tot; x.pop[c.ideo] = (x.pop[c.ideo] || 0) + add; }
      }
    }
    if (!c.dipAct.length) delete c.dipAct;
  };

  // görüş dökümü: G.opinion'ın kalemleri (toplamı G.opinion ile aynıdır)
  G.opinionParts = (ai, other) => {
    const st = G.st, a = st.C[ai], o = st.C[other], out = [];
    const add = (n, v) => { if (v) out.push([n, v]); };
    if (a.ideo === o.ideo) add('Aynı ideoloji', a.ideo === 'neu' ? 10 : 35);
    else if ((a.ideo === 'dem' && o.ideo !== 'neu') || (o.ideo === 'dem' && a.ideo !== 'neu') || (a.ideo === 'fas' && o.ideo === 'com') || (a.ideo === 'com' && o.ideo === 'fas')) add('Karşıt ideoloji', -30);
    if (G.sameFaction(ai, other)) add('Aynı ittifak', 50);
    if (st.goals[other + '>' + ai] || o.just?.t === ai) add('Bize karşı savaş gerekçesi', -60);
    let n1 = 0; for (const e of a.enemies) if (G.atWar(other, e)) n1++;
    add(`Ortak düşman${n1 > 1 ? ' (' + n1 + ')' : ''}`, 40 * n1);
    let n2 = 0; for (const e of o.enemies) if (G.sameFaction(ai, e)) n2++;
    add('Müttefikleriyle savaşta', -80 * n2);
    add('İlişkiler (yardım, ticaret, olaylar)', Math.round(((st.rel && st.rel[ai + '>' + other]) || 0) * 10) / 10);
    if (a.overlord === other) add('Efendi devlet', 100);
    return out;
  };
})(window);
