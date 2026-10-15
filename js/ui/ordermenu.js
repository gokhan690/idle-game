// HOI4 tarzı eylem menüsü: kara birlikleri ya da ordu seçiliyken bir eyalete dokununca emir hemen verilmez,
// dokunulan noktada seçenekler çıkar (git, saldır, taarruz oku, cephe ata, savunma hattı, hatta yay, iptal).
// Menü düğmeleri UI.act eylemleridir; gerçek zamanlı çok oyunculuda emir olarak yakalanıp herkese iletilir.
(function (g) {
  const G = g.G, UI = G.UI, R = G.R, ACT = UI.ACT;
  const { esc, me } = UI.L;
  const { NP } = G;
  const $ = (id) => document.getElementById(id);
  const selUnits = () => G.st.units.filter((u) => R.sel.units.has(u.id));
  const armySel = () => (R.sel.army ? G.armyById(me(), R.sel.army) : null);
  let box = null;
  UI.orderMenuOpen = () => !!(box && !box.hidden);
  UI.closeOrderMenu = () => { if (box) box.hidden = true; R.ordTarget = -1; R.dirty = 1; };

  UI.orderMenu = (x, y, n) => {
    const st = G.st, pl = st.player, sel = selUnits();
    if (!sel.length || n < 0) return;
    const a = armySel(), land = n < NP, owner = land ? st.prov[n].c : null;
    const items = []; // [eylem, başlık, açıklama, ek nitelikler]
    const nm = land ? G.pname(n) : G.seaName ? G.seaName(n) : 'Deniz';
    const n0 = `${sel.length} tümen`;
    if (!land) items.push(['ordgo', 'Deniz yoluyla git', `${n0} konvoyla taşınır`]);
    else if (owner === pl || (G.friendly(pl, owner) && !G.atWar(pl, owner))) {
      items.push(['ordgo', 'Buraya git', a ? `${n0} elle yönetilir; ordu onları cepheye geri çekmez` : `${n0} yürür`]);
      if (a) items.push(['ordfb', 'Buradan savunma hattı çiz', 'sonra hattın bitiş eyaletine dokun']);
      if (sel.length >= 2) items.push(['ordline', 'Bu sınır boyunca yay', 'tümenler sınır eyaletlerine eşit dağılır']);
    } else if (G.atWar(pl, owner)) {
      items.push(['ordatk', 'Saldır', `${n0} ${nm} eyaletine yürür`]);
      if (a) {
        items.push(['ordgoal', 'Taarruz oku çiz', 'ordu cephede plan toplar, dolunca “Uygula ▶”']);
        if (a.goal != null) items.push(['ordstage', '+ Sonraki aşama', 'okun ucu alınınca buraya devam eder']);
        items.push(['ordvs', `${G.cname(owner)} cephesini tut`, 'ordu yalnız bu ülkeye karşı hat kurar', ` data-k="${owner}"`]);
      }
    } else {
      const can = G.canEnter(pl, n);
      items.push(['ordgo', 'Buraya git', can ? 'geçiş izni var' : 'geçiş izni yok: önce Diplomasi’den izin al ya da savaş ilan et', can ? '' : ' disabled']);
      if (a) {
        items.push(['ordvs', `${G.cname(owner)} sınırına diz`, 'ordu sınırda bekler; savaş ilanı yapılmaz', ` data-k="${owner}"`]);
        items.push(['ordgoal', 'Taarruz oku çiz', 'savaş ilan edilince uygulanabilir']);
      }
    }
    const fl = land && owner ? G.flag(owner, 24, 16) : '';
    const sub = land ? (owner === pl ? 'kendi toprağın' : G.atWar(pl, owner) ? `<span class="neg">düşman</span> · ${esc(G.cname(owner))}` : esc(G.cname(owner))) : 'deniz bölgesi';
    const html = `<div class="omh">${fl}<div class="grow"><b>${esc(nm)}</b><div class="muted small">${sub}</div></div></div>`
      + items.map(([act, t, d, ex]) => `<button class="omi" data-act="${act}" data-v="${n}"${ex || ''}><b>${esc(t)}</b><span>${esc(d)}</span></button>`).join('')
      + `<button class="omi omx" data-act="ordclose"><b>İptal</b></button>`;
    if (!box) { box = document.createElement('div'); box.id = 'ordmenu'; box.className = 'ordmenu'; $('app').appendChild(box); }
    box.innerHTML = html; box.hidden = false;
    // konum: dokunulan nokta; ekrandan taşmasın, alt yarıda yukarı açılsın
    const W = g.innerWidth, H = g.innerHeight, bw = box.offsetWidth, bh = box.offsetHeight;
    const cv = $('map').getBoundingClientRect(), px = cv.left + x, py = cv.top + y;
    box.style.left = Math.max(8, Math.min(W - bw - 8, px - bw / 2)) + 'px';
    box.style.top = Math.max(8, Math.min(H - bh - 8, py > H * 0.5 ? py - bh - 14 : py + 14)) + 'px';
    R.ordTarget = n; R.dirty = 1;
  };
  // harita kaydırılınca menü kapanır (yeri artık yanlış olur)
  g.addEventListener('pointermove', (e) => { if (box && !box.hidden && e.buttons && e.target && e.target.id === 'map') UI.closeOrderMenu(); });

  const after = () => { UI.closeOrderMenu(); UI.renderSel(); R.dirty = 1; G.mapDirty = 1; };
  // git / saldır: el emri (ordudaki tümenler u.man ile işaretlenir, ordu yapay zekâsı onları geri çekmez)
  ACT.ordgo = (d) => { UI.closeOrderMenu(); UI.orderUnits(selUnits(), +d.v); after(); };
  ACT.ordatk = ACT.ordgo;
  ACT.ordgoal = (d) => { UI.closeOrderMenu(); const a = armySel(); if (a && !UI.setArmyGoal(a, +d.v)) UI.toast('Ok, düşman ya da yabancı bir eyalete çizilmeli.', 'warn'); after(); };
  ACT.ordstage = (d) => {
    UI.closeOrderMenu(); const a = armySel(); if (!a || a.goal == null) return;
    (a.goals || (a.goals = [])).push(+d.v); UI.toast(`${a.n}: ${a.goals.length + 1}. aşama ${G.pname(+d.v)}.`, 'good'); after();
  };
  ACT.ordvs = (d) => {
    UI.closeOrderMenu(); const c = me(), a = armySel(); if (!a || !G.st.C[d.k]) return;
    a.vs = d.k; if (a.ord === 'hold' || a.ord === 'fb') a.ord = 'def';
    for (const u of G.armyUnits(c, a.id)) delete u.man;
    c._frontsDirty = 1; G.computeFronts(c);
    UI.toast(`${a.n}: ${G.cname(d.k)} ${G.atWar(c.tag, d.k) ? 'cephesini tutuyor' : 'sınırına diziliyor'}${(a.front || []).length ? ` (${a.front.length} eyalet)` : ''}.`, 'good');
    after();
  };
  ACT.ordfb = (d) => { UI.closeOrderMenu(); const a = armySel(); if (!a) return; UI.goalMode = null; UI.fbMode = { a: a.id, s: null }; UI.fbTap(+d.v); after(); };
  ACT.ordline = (d) => { UI.closeOrderMenu(); UI.lineTo(+d.v); after(); };
  ACT.ordclose = () => UI.closeOrderMenu();
  // elle yönetilen tümenleri orduya geri bağla
  ACT.unman = () => {
    const c = me(); let n = 0;
    for (const u of selUnits()) if (u.man) { delete u.man; n++; }
    c._frontsDirty = 1;
    UI.toast(n ? `${n} tümen yeniden ordunun emrinde.` : 'Elle yönetilen tümen yok.', n ? 'good' : 'info');
    UI.renderSel(); R.dirty = 1;
  };
  // savaşta bekleyen bütün ordular en yakın cepheyi tutsun
  ACT.armyall = () => {
    const c = me(); let n = 0;
    for (const a of c.armies || []) if (a.ord === 'hold') { a.ord = 'def'; n++; for (const u of G.armyUnits(c, a.id)) delete u.man; }
    c._frontsDirty = 1; G.computeFronts(c);
    UI.toast(n ? `${n} ordu en yakın cepheyi tutuyor.` : 'Beklemede ordu yok.', n ? 'good' : 'info');
    UI.render(); UI.renderSel(); UI.hud(); R.dirty = 1;
  };
})(window);
