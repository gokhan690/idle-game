// Özel projeler (HOI4 1.12): ön koşul teknolojisi araştırılınca başlatılan uzun soluklu gizli programlar.
// Aynı anda bir proje yürütülür; ilerleme araştırma hızına bağlıdır. Manhattan Projesi atom bombası üretimini açar.
// Atom bombası düşman şehrine atılır: sanayi ve altyapı yıkılır, oradaki birlikler ağır kayıp verir, düşmanın
// savaş desteği ve istikrarı çöker.
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  g.PROJECTS = {
    atom: { n: 'Manhattan Projesi', d: 'Atom bombası: 120 günde bir bomba üretilir.', req: 'atom', days: 540, cost: 150 },
    radar: { n: 'Radar Ağı', d: 'Kıyı ve hava savunma radar zinciri: hava gücü +%10, deniz gücü +%5.', req: 'radar', days: 240, cost: 75, fx: { air: 0.1, navy: 0.05 } },
    jet: { n: 'Jet Motoru Programı', d: 'İlk jet avcıları: hava gücü +%15.', req: 'jet', days: 300, cost: 100, fx: { air: 0.15 } },
    crypto: { n: 'Kriptoloji Bürosu', d: 'Düşman şifreleri kırılır: bütün düşmanlara karşı muharebede +%12.', req: 'dec1', days: 360, cost: 100 },
    penicillin: { n: 'Penisilin Üretimi', d: 'Seri antibiyotik üretimi: insan gücü +%5, istikrar +%3.', req: 'comp2', days: 300, cost: 75, fx: { mp: 0.05, stab: 0.03 } },
  };
  G.projAvailable = (c, id) => {
    const p = g.PROJECTS[id], done = c.proj && c.proj.done && c.proj.done[id];
    if (done) return { ok: false, why: 'Tamamlandı' };
    if (c.proj && c.proj.cur) return { ok: false, why: 'Başka bir proje sürüyor' };
    if (!c.tech[p.req]) return { ok: false, why: `Önce ${g.TECH_BY_ID[p.req]?.n || p.req} araştırılmalı` };
    if (c.pp < p.cost) return { ok: false, why: `${p.cost} siyasi güç gerekli` };
    return { ok: true };
  };
  G.projStart = (c, id) => {
    if (!G.projAvailable(c, id).ok) return false;
    c.proj = c.proj || { done: {} };
    c.pp -= g.PROJECTS[id].cost; c.proj.cur = id; c.proj.p = 0;
    if (c.tag === G.st.player) G.log(`Özel proje başladı: ${g.PROJECTS[id].n}.`, [c.tag], 'info');
    return true;
  };
  const finish = (c, id) => {
    const p = g.PROJECTS[id];
    c.proj.done[id] = 1; c.proj.cur = null; c.proj.p = 0;
    if (p.fx) { c.fmods = c.fmods || {}; for (const [k, v] of Object.entries(p.fx)) c.fmods[k] = (c.fmods[k] || 0) + v; G.recomputeMods(c); }
    if (id === 'crypto') c.decryptAll = 1;
    if (id === 'atom') { c.nukes = c.nukes || 0; c.nukeNext = G.st.day + 120; }
    const major = c.major || id === 'atom';
    G.log(`${G.cname(c.tag)} özel projesini tamamladı: ${p.n}.`, [c.tag], c.tag === G.st.player || (id === 'atom' && major) ? 'major' : 'info');
  };
  // günlük: proje ilerlemesi ve atom bombası üretimi
  G.projTick = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!c.alive || !c.proj) continue;
      if (c.proj.cur) { c.proj.p += 1 + (c.mods.research || 0); if (c.proj.p >= g.PROJECTS[c.proj.cur].days) finish(c, c.proj.cur); }
      if (c.proj.done.atom && st.day >= (c.nukeNext || 0)) { c.nukes = (c.nukes || 0) + 1; c.nukeNext = st.day + 120; if (c.tag === st.player) G.log('Bir atom bombası daha hazır.', [c.tag], 'good'); }
    }
  };
  // atom bombası hedefleri: düşmanın elindeki büyük şehirler
  G.nukeTargets = (tag) => {
    const st = G.st, out = [];
    for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (P[i].vp >= 5 && G.atWar(tag, pr.c)) out.push(i); }
    return out.sort((a, b) => P[b].vp - P[a].vp);
  };
  G.nuke = (tag, n) => {
    const st = G.st, c = st.C[tag], pr = st.prov[n], v = pr.c, vc = st.C[v];
    if (!c || !(c.nukes > 0) || !vc || !G.atWar(tag, v)) return false;
    c.nukes--;
    pr.civ = Math.floor(pr.civ * 0.4); pr.mil = Math.floor(pr.mil * 0.4); pr.dock = Math.floor(pr.dock * 0.5);
    pr.inf = Math.max(1, (pr.inf || 1) - 2); if (pr.rail != null) pr.rail = Math.max(0, pr.rail - 2); pr.fort = Math.max(0, pr.fort - 2);
    for (const u of G.unitsAt[n] || []) { u.str *= 0.4; u.org = 0; }
    vc.wsX -= 0.15; vc.stabX -= 0.05;
    st.tension = Math.min(100, st.tension + 5);
    G.needSummary = 1; G.mapDirty = 1; G.supDirty = 1;
    const msg = `${G.cname(tag)} ${G.pname(n)} şehrine atom bombası attı!`;
    G.log(msg, [tag, v], 'major');
    if (st.player && st.player !== tag) G.queuePopup({ eyebrow: 'Dünya haberleri · ' + G.fmtDate(st.day), title: 'Atom Bombası', text: msg + ' Şehir yerle bir oldu; dünya yeni bir çağa girdi.', opts: [{ n: 'Korkunç', fx: () => {} }] });
    return true;
  };
  // YZ: büyük güçler uygun projeleri başlatır; serbest modda (tarihî modda olaylar yönetir) atom bombası kullanır
  G.aiProjects = (c) => {
    const st = G.st;
    if (!c.major || c.tag === st.player) return;
    if (!(c.proj && c.proj.cur) && c.pp >= 180) for (const id of ['radar', 'crypto', 'penicillin', 'jet', 'atom']) if (G.projAvailable(c, id).ok) { G.projStart(c, id); break; }
    if (!st.opts.hist && c.nukes > 0 && c.enemies.length && !(c.nukeCd > st.day)) {
      const t = G.nukeTargets(c.tag).find((i) => st.C[st.prov[i].c]?.major); if (t != null) { G.nuke(c.tag, t); c.nukeCd = st.day + 30; }
    }
  };
})(window);
