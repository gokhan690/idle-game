// Muharebe taktikleri (HOI4): her muharebede iki günde bir saldıran ve savunan birer taktik seçer.
// Seçim tümen bileşimine (zırh, topçu, piyade), doktrine ve arazi/kanatlara bağlıdır; komutanın planlama
// ve saldırı/savunma becerisi rakibin taktiğine "sayaç" seçme olasılığını artırır. Sayaçlanan taktiğin
// etkisi boşa çıkar. Bazı taktikler muharebe evresini değiştirir: Göğüs göğüse (zırh ve topçu zayıflar),
// Atılım (zırhlı birlikler öne çıkar). Ortalama etki nötrdür; taktikler çeşitlilik ve komutan farkı yaratır.
(function (g) {
  const G = g.G;
  // my: kendi hasarımız, their: düşmanın bize verdiği hasar, ph: evre, c: sayaçladığı taktik
  // w(x): seçim ağırlığı; x = { arm, art, inf, dirs, riv, doc, te }
  const T = g.TACTICS = {
    // saldıran
    attack: { s: 'a', n: 'Saldırı', d: 'Düz taarruz.', my: 1, their: 1, w: () => 4 },
    assault: { s: 'a', n: 'Taarruz', d: 'Hasar +%15, alınan hasar +%10.', my: 1.15, their: 1.1, c: 'delay', w: (x) => 2 + 2 * x.inf },
    shock: { s: 'a', n: 'Şok Taarruzu', d: 'Zırhlı hücum: hasar +%25.', my: 1.25, their: 1, c: 'defend', w: (x) => 0.3 + 4 * x.arm + (x.doc === 'm' ? 1 : 0) },
    infiltration: { s: 'a', n: 'Sızma Taarruzu', d: 'Düşman hasarı −%15.', my: 1.05, their: 0.85, c: 'counter', w: (x) => 1 + 2 * x.inf * (x.te === 'forest' || x.te === 'jungle' || x.te === 'hills' || x.te === 'mountain' ? 1.5 : 0.6) },
    ambush: { s: 'a', n: 'Pusu', d: 'Düşmanın karşı saldırısını boşa çıkarır.', my: 1.05, their: 0.95, c: 'counter', w: (x) => 1 + x.inf },
    barrage: { s: 'a', n: 'Topçu Barajı', d: 'Topçu ateşi: hasar +%20.', my: 1.2, their: 1, c: 'elastic', w: (x) => 0.3 + 4 * x.art + (x.doc === 'f' ? 1.2 : 0) },
    mass: { s: 'a', n: 'Kitle Hücumu', d: 'Hasar +%25, alınan hasar +%20.', my: 1.25, their: 1.2, c: 'withdraw', w: (x) => 0.5 + 2 * x.inf + (x.doc === 'a' ? 2 : 0) },
    breakthrough: { s: 'a', n: 'Yarma', d: 'Atılım evresine geçer: zırhlılar öne çıkar.', my: 1.1, their: 0.95, ph: 'brk', c: 'delay', w: (x) => 0.2 + 3 * x.arm + (x.doc === 'm' ? 1 : 0) },
    encircle: { s: 'a', n: 'Kuşatma', d: 'Birden çok yönden: hasar +%20.', my: 1.2, their: 0.95, c: 'withdraw', w: (x) => (x.dirs > 1 ? 1.5 + x.dirs : 0) },
    bridge: { s: 'a', n: 'Köprübaşı Kur', d: 'Nehir geçişinde hasar +%20.', my: 1.2, their: 1, w: (x) => (x.riv > 0 ? 3 : 0) },
    cqc: { s: 'a', n: 'Göğüs Göğüse', d: 'Yakın muharebe evresi: zırh ve topçu zayıflar.', my: 1, their: 1, ph: 'cqc', w: (x) => 0.5 + 2 * x.inf * (x.te === 'urban' || x.te === 'forest' || x.te === 'jungle' ? 2 : 0.5) },
    // savunan
    defend: { s: 'd', n: 'Savunma', d: 'Mevzileri tut.', my: 1, their: 1, w: () => 4 },
    counter: { s: 'd', n: 'Karşı Saldırı', d: 'Hasar +%20; saldıranın kuşatmasını bozar.', my: 1.2, their: 1.05, c: 'encircle', w: (x) => 1 + 1.5 * x.arm + x.inf },
    elastic: { s: 'd', n: 'Elastik Savunma', d: 'Alınan hasar −%20; taarruzu boşa çıkarır.', my: 0.95, their: 0.8, c: 'assault', w: (x) => 1.5 + (x.doc === 'm' || x.doc === 'g' ? 1 : 0) },
    delay: { s: 'd', n: 'Geciktirme', d: 'İki taraf da −%15 hasar; sızmayı durdurur.', my: 0.85, their: 0.85, c: 'infiltration', w: () => 1.5 },
    withdraw: { s: 'd', n: 'Taktik Çekilme', d: 'Alınan hasar −%30, verilen −%25; şok taarruzunu boşa çıkarır.', my: 0.75, their: 0.7, c: 'shock', w: () => 1 },
    backhand: { s: 'd', n: 'Ters Darbe', d: 'Zırhlı karşı darbe: hasar +%25; yarmayı durdurur.', my: 1.25, their: 1, c: 'breakthrough', w: (x) => 0.2 + 3 * x.arm },
    dbarrage: { s: 'd', n: 'Savunma Barajı', d: 'Topçu: hasar +%20; kitle hücumunu kırar.', my: 1.2, their: 1, c: 'mass', w: (x) => 0.3 + 4 * x.art + (x.doc === 'f' ? 1 : 0) },
    holdout: { s: 'd', n: 'Mevzide Direnme', d: 'Yakın muharebede alınan hasar −%15.', my: 1, their: 0.85, c: 'cqc', w: (x) => 0.5 + 2 * x.inf + (x.doc === 'g' ? 1 : 0) },
  };
  const AT = Object.keys(T).filter((k) => T[k].s === 'a'), DT = Object.keys(T).filter((k) => T[k].s === 'd');
  G.PHASES = { normal: 'Normal', cqc: 'Göğüs göğüse', brk: 'Atılım' };
  // tarafın bileşimi: zırh, topçu ve piyade payları (genişliğe göre ağırlıklı)
  const comp = (L) => {
    let arm = 0, art = 0, w = 0;
    for (const u of L) {
      const t = u._s.t, uw = t.w || 15, sa = (t.K.inf.sa + t.K.art.sa + t.K.tank.sa + t.K.flat.sa) || 1;
      arm += uw * (t.tanks / (t.nb || 1)); art += uw * Math.min(1, t.K.art.sa / sa); w += uw;
    }
    arm /= w || 1; art /= w || 1;
    return { arm, art, inf: Math.max(0, 1 - arm - art * 0.5) };
  };
  const skill = (L, side) => {
    let best = 0;
    for (const u of L) { const gen = G.genOf(u); if (gen) best = Math.max(best, gen.plan + (side === 'a' ? gen.atk : gen.def)); }
    return best;
  };
  const pick = (keys, x) => {
    let tot = 0; const ws = keys.map((k) => { const v = Math.max(0, T[k].w(x)); tot += v; return v; });
    let r = G.rand() * tot;
    for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) return keys[i]; }
    return keys[0];
  };
  G.btac = G.btac || {};
  // Muharebe için bu günün taktik çarpanları: hitD (düşmana verilen) ve hitA (saldırana verilen) çarpanları
  G.battleTactics = (n, A, D, attTag, defTag, dirs, riv) => {
    const st = G.st;
    let b = G.btac[n];
    if (!b || b.day < st.day - 2 || b.day > st.day || b.att !== attTag) b = G.btac[n] = { att: attTag, ta: null, td: null, phase: 'normal', ph: 0, next: st.day, hist: [], day: st.day };
    b.day = st.day;
    const ca = comp(A), cd = comp(D);
    const sa = skill(A, 'a'), sd = skill(D, 'd');
    if (st.day >= b.next) {
      const te = g.TERRAIN[G.P[n].te].id;
      const xa = Object.assign({ dirs, riv, doc: G.docTree(st.C[attTag]), te }, ca), xd = Object.assign({ dirs, riv, doc: G.docTree(st.C[defTag]), te }, cd);
      let ta = pick(AT, xa), td = pick(DT, xd);
      // komutan üstünlüğü: rakibin taktiğini görüp onu sayaçlayan taktiğe geçme şansı
      const edge = (sa - sd) * 0.07;
      if (edge > 0 && G.rand() < Math.min(0.5, edge)) { const k = AT.find((k2) => T[k2].c === td && T[k2].w(xa) > 0); if (k) ta = k; }
      else if (edge < 0 && G.rand() < Math.min(0.5, -edge)) { const k = DT.find((k2) => T[k2].c === ta && T[k2].w(xd) > 0); if (k) td = k; }
      b.ta = ta; b.td = td; b.next = st.day + 2;
      b.cnt = T[ta].c === td ? 'a' : T[td].c === ta ? 'd' : null;
      // evre: taktik bir evre açarsa 4 gün sürer; sayaçlanırsa evre açılmaz
      const ph = (b.cnt !== 'd' && T[ta].ph) || (b.cnt !== 'a' && T[td].ph) || null;
      if (ph) { b.phase = ph; b.ph = st.day + 4; } else if (st.day >= b.ph) b.phase = 'normal';
      b.hist.unshift([ta, td, b.cnt]); if (b.hist.length > 6) b.hist.length = 6;
    }
    const A2 = b.cnt === 'd' ? T.attack : T[b.ta], D2 = b.cnt === 'a' ? T.defend : T[b.td];
    let mA = A2.my * D2.their, mD = D2.my * A2.their;
    if (b.cnt === 'a') mA *= 1.05; else if (b.cnt === 'd') mD *= 1.05; // inisiyatif
    // evre etkisi: göğüs göğüse zırh ve topçuyu zayıflatır; atılımda zırhlılar güçlenir
    if (b.phase === 'cqc') { mA *= 1 - 0.3 * ca.arm - 0.2 * ca.art; mD *= 1 - 0.3 * cd.arm - 0.2 * cd.art; }
    else if (b.phase === 'brk') mA *= 1 + 0.25 * ca.arm;
    b.sa = sa; b.sd = sd;
    return { mA, mD, b };
  };
  // kayıp muharebe durumları temizlenir
  G.tacticsGC = () => { const st = G.st; for (const k of Object.keys(G.btac)) if (G.btac[k].day < st.day - 3) delete G.btac[k]; };
})(window);
