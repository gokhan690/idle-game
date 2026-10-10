// Puan, başarımlar ve oyun sonu (HOI4: 1948 sonunda oyun biter; ülke yok olursa yenilgi).
// Başarımlar cihazda saklanır (arayüz katmanı); burada yalnızca koşullar ve puan hesabı var.
(function (g) {
  const G = g.G;
  const { P, NP } = G;

  G.END_DATE = '1949-01-01';
  // puan: zafer noktaları, eyaletler, sanayi, ordu
  G.score = (tag) => {
    const st = G.st, c = st.C[tag]; if (!c || !c.alive) return 0;
    let vp = 0; for (let i = 0; i < NP; i++) if (st.prov[i].c === tag) vp += P[i].vp || 0;
    const divs = st.units.filter((u) => u.t === tag).length;
    return Math.round(vp * 3 + (c.sum.provs || 0) + (c.sum.civ || 0) * 2 + (c.sum.mil || 0) * 3 + divs * 2);
  };
  G.scoreBoard = () => Object.values(G.st.C).filter((c) => c.alive && (c.major || c.tag === G.st.player)).map((c) => ({ t: c.tag, s: G.score(c.tag) })).sort((a, b) => b.s - a.s);
  // oyunun başındaki değerler (karşılaştırma için; oyuncu ülkesi)
  G.scoreStart = () => {
    const st = G.st, c = st.C[st.player]; if (!c || st.s0) return;
    st.s0 = { provs: c.sum.provs || 0, civ: c.sum.civ || 0, mil: c.sum.mil || 0, divs: st.units.filter((u) => u.t === st.player).length };
  };

  const capOf = (tag) => { const d = g.COUNTRY_DEFS[tag]; return P.findIndex((p) => p.n === d.cap); };
  const holds = (tag, other) => { const i = capOf(other); return i >= 0 && G.st.prov[i].c === tag; };
  const yr = () => G.year(G.st.day);
  const ALT_CAPS = ['alt_kaiser', 'alt_redger', 'alt_longusa', 'alt_redusa', 'alt_commune', 'alt_bourbon', 'alt_ottoman', 'alt_turan', 'alt_redbrit', 'alt_trotsky', 'alt_bukharin', 'alt_redita', 'alt_taisho', 'alt_pol', 'alt_hun', 'alt_rom', 'alt_gre', 'alt_yug', 'alt_chi', 'alt_bul', 'alt_swe', 'alt_bra'];
  // [kimlik, ad, açıklama, koşul(c, st)]
  G.ACH = [
    ['survivor', 'Hayatta Kal', '1945 yılına ülkeni ayakta tutarak ulaş.', (c) => yr() >= 1945],
    ['peace', 'Barışsever', '1940\'a hiç savaşa girmeden ulaş.', (c, st) => yr() >= 1940 && !st.achF?.war],
    ['conqueror', 'Fatih', 'Başlangıçtaki eyalet sayının iki katını kontrol et.', (c, st) => st.s0 && c.sum.provs >= st.s0.provs * 2 && c.sum.provs >= 10],
    ['industry', 'Sanayi Devi', '100 fabrikaya (sivil + askerî) ulaş.', (c) => (c.sum.civ || 0) + (c.sum.mil || 0) >= 100],
    ['army', 'Büyük Ordu', '100 tümenlik bir orduya sahip ol.', (c, st) => st.units.filter((u) => u.t === c.tag).length >= 100],
    ['minor', 'Küçükten Büyüğe', 'Küçük bir devletle 50 fabrikaya ulaş.', (c) => !c.major && (c.sum.civ || 0) + (c.sum.mil || 0) >= 50],
    ['faction', 'İttifak Lideri', 'En az 4 üyeli bir ittifakın lideri ol.', (c, st) => { const f = c.fac && st.factions[c.fac]; return !!f && f.leader === c.tag && f.members.filter((t) => st.C[t]?.alive).length >= 4; }],
    ['capitals', 'Başkentler Fatihi', 'Kendin dışında üç büyük gücün başkentini kontrol et.', (c, st) => ['GER', 'ENG', 'FRA', 'SOV', 'ITA', 'JAP', 'USA'].filter((t) => t !== c.tag && holds(c.tag, t)).length >= 3],
    ['istanbul', 'Boğazların Efendisi', 'Türkiye dışında bir ülkeyle İstanbul\'u kontrol et.', (c) => c.tag !== 'TUR' && P.some((p, i) => p.n === 'İstanbul' && G.st.prov[i].c === c.tag)],
    ['altpath', 'Tarih Yeniden Yazıldı', 'Bir alternatif tarih yolunu sonuna kadar tamamla.', (c) => c.spirits.some((s) => ALT_CAPS.includes(s))],
    ['ottoman', 'Devlet-i Aliyye', 'Türkiye ile Osmanlı Restorasyonu yolunu tamamla.', (c) => c.spirits.includes('alt_ottoman')],
    ['kaiser', 'Kayzer\'in Dönüşü', 'Almanya ile Kaiserreich\'ı kur.', (c) => c.spirits.includes('alt_kaiser')],
    ['civilwar', 'İç Savaş Galibi', 'Bir iç savaşı kazan.', (c, st) => !!st.achF?.civil],
    ['spysteal', 'Endüstriyel Casusluk', 'Casuslarınla bir teknoloji çal.', (c, st) => !!st.achF?.steal],
    ['spycoup', 'Gölge Hükümet', 'Casuslarınla bir ülkede darbe yap.', (c, st) => !!st.achF?.coup],
    ['elite', 'Demir Komutan', 'Elit zorlukta 1945\'e ulaş.', (c, st) => (st.opts.diff ?? 1) >= 3 && yr() >= 1945],
    ['altworld', 'Başka Bir Dünya', 'Alternatif dünya modunda 1940\'a ulaş.', (c, st) => !!st.opts.alt && yr() >= 1940],
  ];
  // oyuncunun bu ayki başarım kontrolü; yeni kazanılanlar G.onAch'a gider (arayüz saklar)
  G.achCheck = () => {
    const st = G.st, c = st.C[st.player];
    if (!c || !c.alive || !G.onAch) return;
    if (c.enemies.length) (st.achF || (st.achF = {})).war = 1;
    for (const [id, n, d, f] of G.ACH) { let ok = false; try { ok = f(c, st); } catch (e) {} if (ok) G.onAch(id, n, d); }
  };
  G.achFlag = (k) => { const st = G.st; (st.achF || (st.achF = {}))[k] = 1; };
  // oyun sonu: tarih dolunca bir kez
  G.endCheck = () => {
    const st = G.st;
    if (st.ended || !st.player || !st.C[st.player]?.alive || st.day < G.dayOf(G.END_DATE)) return;
    st.ended = 1;
    if (G.onGameEnd) G.onGameEnd('time');
  };
})(window);
