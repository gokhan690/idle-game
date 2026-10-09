// Defter (HOI4 "Ledger"): büyük güçlerin ve oyuncunun aylık istatistik kayıtları (grafikler için).
(function (g) {
  const G = g.G;
  G.LEDGER_TAGS = ['GER', 'ITA', 'JAP', 'SOV', 'ENG', 'FRA', 'USA'];
  G.LEDGER_KEYS = ['mil', 'civ', 'div', 'dead'];
  G.ledgerTags = () => { const st = G.st, L = G.LEDGER_TAGS.filter((t) => st.C[t]); if (st.player && !L.includes(st.player) && st.C[st.player]) L.push(st.player); return L; };
  G.ledgerSnap = () => {
    const st = G.st, divs = {};
    for (const u of st.units) divs[u.t] = (divs[u.t] || 0) + 1;
    const led = st.led || (st.led = { d: [], s: {} });
    led.d.push(st.day);
    for (const t of G.ledgerTags()) {
      const c = st.C[t], s = led.s[t] || (led.s[t] = { mil: [], civ: [], div: [], dead: [] });
      // geç eklenen ülke: eksik geçmiş boşlukla doldurulur
      while (s.mil.length < led.d.length - 1) for (const k of G.LEDGER_KEYS) s[k].push(null);
      s.mil.push(c.alive ? c.sum.mil : 0); s.civ.push(c.alive ? c.sum.civ : 0); s.div.push(divs[t] || 0); s.dead.push(Math.round(c.dead || 0));
    }
    if (led.d.length > 160) { led.d.shift(); for (const s of Object.values(led.s)) for (const k of G.LEDGER_KEYS) s[k].shift(); }
  };
  G.ledgerTick = () => { const st = G.st; if (st.day % 30 === 0 || !st.led) G.ledgerSnap(); };
})(window);
