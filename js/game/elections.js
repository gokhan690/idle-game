// Seçimler (HOI4): demokrasilerde düzenli seçim. Parti desteği (c.pop) ve istikrar sonucu belirler:
// demokratlar %50+ alırsa iktidar sürer ve istikrar artar; aksi hâlde en çok oyu alan parti hükümeti kurar.
// Savaştayken seçimler askıya alınabilir (istikrar -%10). Tarihî modda YZ demokrasilerinin sonucu tarihî kalır.
(function (g) {
  const G = g.G;
  const IDS = ['dem', 'fas', 'com', 'neu'];
  const YEAR = 1461; // dört yıl (gün)

  // Tarihî seçim tarihleri; listesi bitince (ya da hiç olmayanlarda) dört yılda bir
  const HIST = {
    USA: ['1936-11-03', '1940-11-05', '1944-11-07', '1948-11-02'],
    ENG: ['1945-07-05'],
    FRA: ['1936-05-03'],
    CAN: ['1940-03-26', '1945-06-11'],
    AST: ['1937-10-23', '1940-09-21', '1943-08-21'],
    NZL: ['1938-10-15', '1943-09-25'],
    SWE: ['1936-09-20', '1940-09-15', '1944-09-17'],
    BEL: ['1936-05-24', '1939-04-02'],
    HOL: ['1937-05-26'],
    DEN: ['1939-04-03', '1943-03-23'],
    NOR: ['1936-10-19'],
  };
  const PERIOD = { ENG: 5 * 365 + 1, CAN: 5 * 365 + 1 };
  // Başlıca seçimlerin tarihî sonucu (tarihî modda YZ için): yeni lider ve parti kayması
  const LEADER = { 'FRA:1936': 'Léon Blum', 'ENG:1945': 'Clement Attlee' };
  const SHIFT = { 'FRA:1936': { com: 0.05 }, 'ENG:1945': { com: 0.04 } };
  // Anayasal sabit dönemli ya da savaşta da seçim yapan ülkeler (YZ bunları ertelemez)
  const FIXED = new Set(['USA', 'CAN', 'AST', 'NZL']);

  const hash = (tag) => [...tag].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 1000, 7);
  // 'after' gününden sonraki ilk seçim günü
  function nextDate(tag, after) {
    const list = HIST[tag];
    if (list) {
      for (const s of list) { const d = G.dayOf(s); if (d > after) return d; }
      let d = G.dayOf(list[list.length - 1]); const p = PERIOD[tag] || YEAR;
      while (d <= after) d += p;
      return d;
    }
    let d = 90 + Math.floor(hash(tag) * 1.2);
    while (d <= after) d += YEAR;
    return d;
  }
  G.elecInit = (c) => {
    if (!c.el) c.el = { next: nextDate(c.tag, G.st.day - 1), susp: 0, w: 0, last: null };
    return c.el;
  };
  G.elecDate = (c) => { const d = G.dateOf(G.elecInit(c).next); return `${G.AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  // Seçimi olan ülke mi (demokrasi, kukla/teslim/iç savaş dışı)
  G.hasElections = (c) => c.alive && c.ideo === 'dem' && !c.capd && !(c.overlord && G.autoLevel(c) < 2) && !(G.st.civil || []).some((p) => p.includes(c.tag));

  // Oy dağılımı: parti desteği, istikrarsızlık protestosu ve rastgele dalgalanma
  G.elecShares = (c, noise) => {
    const sh = {};
    for (const k of IDS) sh[k] = c.pop[k] || 0;
    const unrest = Math.max(0, 0.45 - (c.stab ?? 0.5));
    if (unrest > 0) { // hoşnutsuz seçmen yönetici partiden diğerlerine kayar
      const mv = sh[c.ideo] * Math.min(0.4, unrest * 1.2), rest = IDS.reduce((s, k) => s + (k === c.ideo ? 0 : sh[k]), 0) || 1;
      sh[c.ideo] -= mv; for (const k of IDS) if (k !== c.ideo) sh[k] += mv * sh[k] / rest;
    }
    if (noise) for (const k of IDS) sh[k] *= 0.9 + G.rand() * 0.2;
    const tot = IDS.reduce((s, k) => s + sh[k], 0) || 1;
    for (const k of IDS) sh[k] /= tot;
    return sh;
  };

  // AI parlamenter demokrasisi, yakın bir büyük güçle savaşırken seçimi erteler (ör. İngiltere)
  const postponed = (c) => {
    if (FIXED.has(c.tag)) return false;
    const st = G.st;
    return c.enemies.some((e) => { const x = st.C[e]; return x?.alive && x.major && !x.capd && c.cap >= 0 && x.cap >= 0 && G.km(c.cap, x.cap) < 3500; });
  };

  const pc = (v) => `%${Math.round(v * 100)}`;
  function holdElection(c) {
    const st = G.st, el = G.elecInit(c), P = g.PARTY_N;
    const year = G.year(st.day);
    const histAI = st.opts.hist && c.tag !== st.player;
    const sh = G.elecShares(c, true);
    const own = c.ideo;
    let top = IDS.reduce((b, k) => (sh[k] > sh[b] ? k : b), own);
    let outcome = sh[own] >= 0.5 ? 'maj' : top === own ? 'plu' : 'chg';
    if (histAI && outcome === 'chg') { outcome = 'plu'; top = own; } // tarihî modda YZ demokrasisi seçimle rejim değiştirmez
    const old = c.leader;
    // parti desteği sonuca doğru kayar
    for (const k of IDS) c.pop[k] = (c.pop[k] || 0) * 0.6 + sh[k] * 0.4;
    G.normalizePop(c);
    const key = c.tag + ':' + year;
    if (histAI && SHIFT[key]) for (const [k, v] of Object.entries(SHIFT[key])) G.addPop(c, k, v);
    let line;
    if (outcome === 'maj') {
      c.stabX = Math.min(0.3, c.stabX + 0.03);
      if (histAI && LEADER[key]) { c.leader = LEADER[key]; line = `${c.leader} önderliğindeki yeni hükümet göreve başladı (${old} dönemi sona erdi).`; }
      else line = `${c.leader} hükümeti güvenoyunu tazeledi; istikrar +%3.`;
    } else if (outcome === 'plu') {
      c.stabX -= 0.01;
      if (histAI && LEADER[key]) { c.leader = LEADER[key]; line = `${c.leader} önderliğinde yeni bir hükümet kuruldu.`; }
      else line = 'En çok oyu alan parti iktidarını sürdürüyor ama çoğunluğu kaybetti; koalisyon pazarlıkları istikrarı bir miktar azalttı.';
    } else {
      line = `${P[top]} seçimi kazandı ve hükümeti devralıyor.`;
    }
    const shares = IDS.map((k) => `${P[k]} ${pc(sh[k])}`).join(', ');
    el.last = { d: st.day, o: outcome, p: sh[own], top };
    el.next = nextDate(c.tag, st.day); el.w = 0;
    // günlüğü küçük ülkelerin seçimleriyle doldurma: yalnızca oyuncu, büyük güçler ve hükümet değişiklikleri
    if (c.tag === st.player || c.major || outcome === 'chg') G.log(`${G.cname(c.tag)} seçimleri: ${shares}. ${line}`, [c.tag], c.tag === st.player || outcome === 'chg' ? 'major' : 'info');
    if (c.tag === st.player) {
      G.queuePopup({ title: `Seçim sonuçları · ${G.cname(c.tag)}`, text: `Oy dağılımı: ${shares}. ${line}`, opts: [{ n: 'Tamam', fx: () => {} }] });
    }
    if (outcome === 'chg') G.setIdeology(c, top);
  }

  // Oyuncunun seçim askısı: yalnızca savaşta; seçimler durur ama istikrar -%10 (politics.js)
  G.elecSuspendCost = 50;
  G.elecCanSuspend = (c) => {
    if (!G.hasElections(c)) return { ok: false, why: 'Seçimler yalnızca demokrasilerde yapılır.' };
    const el = G.elecInit(c);
    if (el.susp) return { ok: false, why: 'Seçimler zaten askıda.' };
    if (!c.enemies.length) return { ok: false, why: 'Yalnızca savaş sırasında askıya alınabilir.' };
    if (c.pp < G.elecSuspendCost) return { ok: false, why: `${G.elecSuspendCost} siyasi güç gerekli.` };
    return { ok: true };
  };
  G.elecSuspend = (c) => {
    const r = G.elecCanSuspend(c); if (!r.ok) return r;
    c.pp -= G.elecSuspendCost; G.elecInit(c).susp = 1;
    G.log(`${G.cname(c.tag)}: savaş nedeniyle seçimler askıya alındı (istikrar -%10).`, [c.tag], 'warn');
    return { ok: true };
  };
  G.elecResume = (c) => {
    const el = G.elecInit(c); if (!el.susp) return false;
    el.susp = 0; el.next = Math.max(el.next, G.st.day + 120);
    G.log(`${G.cname(c.tag)}: seçimler yeniden başlıyor (${G.elecDate(c)}).`, [c.tag], 'info');
    return true;
  };

  G.elecTick = () => {
    const st = G.st;
    for (const c of Object.values(st.C)) {
      if (!G.hasElections(c)) continue;
      const el = G.elecInit(c);
      if (el.susp) { // savaş bitince seçimler kendiliğinden döner
        if (!c.enemies.length) { el.susp = 0; el.next = Math.max(el.next, st.day + 180); if (c.tag === st.player) G.log(`Savaş sona erdi: seçimler ${G.elecDate(c)} için yeniden takvimde.`, [c.tag], 'info'); }
        continue;
      }
      const left = el.next - st.day;
      if (c.tag === st.player) { // seçim öncesi bilgilendirme
        if (left <= 60 && left > 7 && el.w < 1) {
          el.w = 1; const sh = G.elecShares(c, false);
          G.log(`Seçimlere ${left} gün kaldı (${G.elecDate(c)}). Tahmini destek: demokratlar ${pc(sh[c.ideo])}${sh[c.ideo] < 0.5 ? ' (çoğunluk yok!)' : ''}; istikrar ${pc(c.stab ?? 0.5)}.`, [c.tag], 'warn');
        } else if (left <= 7 && left > 0 && el.w < 2) {
          el.w = 2; G.log(`Seçime ${left} gün kaldı. ${c.enemies.length ? 'Savaştasın: Siyaset panelinden seçimleri askıya alabilirsin.' : ''}`.trim(), [c.tag], 'warn');
        }
      }
      if (left > 0) continue;
      if (c.tag !== st.player && postponed(c)) { el.next = st.day + 180; continue; }
      holdElection(c);
    }
  };
})(window);
