// Arayüz: diplomasi paneli, seçimler, gönüllü kuvvetler, istihbarat teşkilatı, ülke sayfası.
(function (g) {
  const G = g.G, R = G.R, UI = G.UI;
  const { P, NP } = G;
  const { $, esc, me, r1, int, pct, bar, sec, kv, FT_Z, fuelOf } = UI.L;
  const PANELS = UI.PANELS, ACT = UI.ACT;
  const spiritHtml = UI.spiritHtml;
  // Diplomasi
  PANELS.dip = () => {
    const st = G.st, c = me();
    if (UI.sub && UI.sub.startsWith('c:')) return countryView(UI.sub.slice(2));
    if (UI.sub === 'intel') return intelView(c);
    let html = '';
    // savaş durumu (HOI4): düşmanların ve bizim teslimiyet ilerlememiz
    if (c.enemies.length) {
      const sbar = (x) => `<div class="row" style="gap:6px;align-items:center"><div class="grow">${bar(Math.min(1, x.surrender || 0), (x.surrender || 0) > 0.6 ? 'r' : '')}</div><span class="small">%${Math.round(Math.min(1, x.surrender || 0) * 100)}</span></div>`;
      const cb = st.contrib || {};
      let wh = `<div class="item">${G.flag(c.tag, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(c.tag))} <span class="muted small">teslimiyet</span></div>${sbar(c)}</div></div>`;
      for (const t of c.enemies.filter((t) => st.C[t]?.alive).sort((a, b) => (st.C[b].surrender || 0) - (st.C[a].surrender || 0))) {
        const x = st.C[t], divs = st.units.reduce((n, u) => n + (u.t === t), 0);
        const my = cb[t] && cb[t][c.tag] ? Math.round(cb[t][c.tag]) : 0;
        wh += `<button class="item" data-act="opencountry" data-v="${t}">${G.flag(t, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(t))} <span class="muted small">${divs} tümen${my ? ` · katkımız ${my}` : ''}</span></div>${sbar(x)}</div><span class="muted">›</span></button>`;
      }
      html += sec('Savaş durumu', `<p class="muted small" style="margin:0">Teslimiyet ilerlemesi: asli topraklarının ne kadarını kaybettiği (zafer noktalarına göre). Eşik dolunca ülke teslim olur ve barış konferansı başlar.</p><div class="list">${wh}</div>`, `${c.enemies.length} düşman`);
    }
    html += intelSummary(c);
    // dünya gerginliği (HOI4): eşikler ve kaynaklar
    const ts = Object.entries(G.TSRC || {}).filter(([t]) => st.C[t]).sort((a, b) => b[1].v - a[1].v).slice(0, 6);
    const need = G.tensionNeeded(c);
    html += sec('Dünya gerginliği', `${bar(st.tension / 100, st.tension > 50 ? 'r' : '')}<p class="small" style="margin:4px 0 0">%${Math.round(st.tension)} · ${g.IDEOLOGIES[c.ideo].n} hükümetin savaş gerekçesi için en az %${need}, ültimatom için %${Math.round(need / 2)} gerginlik gerekir. Kısmi Seferberlik %20, Kapsamlı Askerlik %25, Savaş Ekonomisi %40 ister.</p>${ts.length ? `<div class="list">${ts.map(([t, e]) => `<div class="item">${G.flag(t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(t))} <span class="muted small">+${r1(e.v)}</span></div><div class="d">${Object.entries(e.w).sort((a, b) => b[1] - a[1]).map(([w, v]) => `${esc(w)} +${r1(v)}`).join(' · ')}</div></div></div>`).join('')}</div><p class="muted small" style="margin:0">Oyunun başından beri gerginliği en çok artıranlar.</p>` : ''}`, `%${Math.round(st.tension)}`);
    const fac = c.fac ? st.factions[c.fac] : null;
    if (fac) {
      const lead = fac.leader === c.tag;
      html += sec('İttifak', `<div class="item"><div class="grow"><div class="t">${esc(fac.n)}</div><div class="d">Lider: ${esc(G.cname(fac.leader))}</div><div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${fac.members.filter((t) => st.C[t].alive).map((t) => `<span title="${esc(G.cname(t))}">${G.flag(t, 24, 16)}</span>`).join('')}</div></div></div>${lead ? `<div class="list">${fac.members.filter((t) => t !== c.tag && st.C[t].alive).map((t) => `<div class="item">${G.flag(t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(t))}</div></div><div class="btns"><button class="btn sm" data-act="faclead" data-v="${t}">Liderliği devret</button><button class="btn sm danger" data-act="fackick" data-v="${t}">İhraç et</button></div></div>`).join('')}</div>` : ''}`);
    } else {
      const can = c.major || c.mods.canFaction;
      html += sec('İttifak', `<p class="muted small" style="margin:0">Bir ittifakta değilsin. ${can ? 'Kendi ittifakını kurabilir ya da bir ülkenin sayfasından katılma isteyebilirsin.' : 'Büyük güçlerin ittifaklarına katılma isteyebilirsin. Kendi ittifakın için “İttifak Arayışı” odağı gerekir.'}</p>${can ? `<button class="btn pri" data-act="mkfac">İttifak kur</button>` : ''}`);
    }
    // bağlı devletler ve özerklik (HOI4)
    const subs = G.subjectsOf(c.tag);
    const autoRow = (x, mine) => { const L = G.AUTO_LV[G.autoLevel(x)], cd = x.autoCd > st.day; return `<div class="item">${G.flag(x.tag, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(x.tag))} <span class="muted small">${L.n}</span></div>${bar((x.auto ?? 30) / 100)}<div class="d">Özerklik %${Math.round(x.auto ?? 30)} · efendiye giden pay: kaynak %${Math.round(L.res * 100)}, askerî fabrika %${Math.round(L.mil * 100)}${x._share && x._share.mil ? ` (${x._share.mil} fabrika)` : ''}</div>${mine ? `<div class="btns" style="margin-top:6px"><button class="btn sm" data-act="auto" data-k="tight" data-v="${x.tag}" ${c.pp >= 50 && !cd ? '' : 'disabled'}>Kontrolü sıkılaştır · 50 SG</button><button class="btn sm" data-act="auto" data-k="give" data-v="${x.tag}" ${cd ? 'disabled' : ''}>Özerklik tanı</button><button class="btn sm" data-act="auto" data-k="free" data-v="${x.tag}">Bağımsızlık ver</button></div>` : `<div class="btns" style="margin-top:6px"><button class="btn sm" data-act="auto" data-k="push" data-v="${x.overlord}" ${c.pp >= 60 && !cd ? '' : 'disabled'}>Daha fazla özerklik iste · 60 SG</button></div>`}</div></div>`; };
    if (subs.length) html += sec('Bağlı devletler', `<p class="muted small" style="margin:0">Özerklik düştükçe bağlı devletin kaynak ve fabrikalarından daha büyük pay alırsın. Savaşta zayıflarsan özerklik hızla artar; %100'de bağımsızlık ilan edilir.</p><div class="list">${subs.map((x) => autoRow(x, true)).join('')}</div>`, `${subs.length}`);
    if (c.overlord && st.C[c.overlord]?.alive) html += sec('Efendi devlet', `<p class="muted small" style="margin:0">${esc(G.cname(c.overlord))} devletine bağlıyız. Özerklik %100 olunca bağımsızlığımızı ilan ederiz.</p><div class="list">${autoRow(c, false)}</div>`);
    const tabs = { war: 'Savaşta', near: 'Komşular', major: 'Büyük güçler', all: 'Tümü' };
    html += `<div class="tabs">${Object.entries(tabs).map(([k, n]) => `<button class="${UI.tab.dip === k ? 'on' : ''}" data-act="tab" data-k="dip" data-v="${k}">${n}</button>`).join('')}</div>`;
    const neigh = new Set();
    for (let i = 0; i < NP; i++) if (st.prov[i].c === c.tag) for (const j of P[i].a) neigh.add(st.prov[j].c);
    neigh.delete(c.tag);
    let list = Object.values(st.C).filter((x) => x.alive && x.tag !== c.tag);
    const t = UI.tab.dip;
    if (t === 'war') list = list.filter((x) => G.atWar(c.tag, x.tag));
    if (t === 'near') list = list.filter((x) => neigh.has(x.tag));
    if (t === 'major') list = list.filter((x) => x.major);
    list.sort((a, b) => (b.sum.mil + b.sum.civ) - (a.sum.mil + a.sum.civ));
    let lh = '<div class="list">';
    for (const x of list) lh += `<button class="item" data-act="sub" data-v="c:${x.tag}">${G.flag(x.tag, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(x.tag))}</div><div class="d">${g.IDEOLOGIES[x.ideo].n}${x.fac ? ' · ' + esc(st.factions[x.fac]?.n || '') : ''}</div></div>${relPills(c.tag, x.tag)}<span class="muted">›</span></button>`;
    if (!list.length) lh += `<p class="muted small" style="margin:0">${t === 'war' ? 'Şu an kimseyle savaşta değilsin.' : 'Liste boş.'}</p>`;
    html += lh + '</div>';
    const rel = G.releasable(c.tag);
    if (rel.length) html += sec('Serbest bırakılabilir uluslar', `<div class="list">${rel.map(({ t, n }) => `<div class="item">${G.flag(t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(t))}</div><div class="d">${n} asli eyaleti elimizde</div></div><button class="btn sm pri" data-act="release" data-v="${t}">Kukla olarak kur</button></div>`).join('')}</div>`);
    return { title: 'Diplomasi', html: kv([['Dünya gerginliği', '%' + Math.round(st.tension)], ['Savaşlar', c.enemies.length], ['Gerekçe', c.just ? `${G.cname(c.just.t)} (${c.just.d} gün)` : '—']]) + html };
  };
  function relPills(a, b) {
    const st = G.st; const out = [];
    if (G.atWar(a, b)) out.push('<span class="pill war">Savaş</span>');
    else if (G.sameFaction(a, b)) out.push('<span class="pill ally">Müttefik</span>');
    if (st.pacts[G.pairKey(a, b)]) out.push('<span class="pill pact">Pakt</span>');
    if (st.goals[a + '>' + b] != null) out.push('<span class="pill goal">Gerekçe</span>');
    if (st.access[a + '>' + b]) out.push('<span class="pill pact">Geçiş</span>');
    return out.join(' ');
  }
  // Seçimler (yalnızca demokrasiler): sonraki seçim tarihi, son sonuç, askıya alma
  function electionSection(c) {
    if (!G.hasElections(c)) return '';
    const el = G.elecInit(c), P2 = g.PARTY_N;
    const last = el.last ? `Son seçim: ${G.fmtDate(el.last.d)} · ${P2[el.last.top]} önde (iktidar partisi %${Math.round(el.last.p * 100)})` : 'Henüz seçim yapılmadı.';
    let h = `<div class="item"><div class="grow"><div class="t">Sonraki seçim: ${el.susp ? 'askıda' : G.elecDate(c)}</div><div class="d">${last}</div></div></div>`;
    if (el.susp) h += `<button class="item" data-act="elres"><div class="grow"><div class="t">Seçimleri yeniden başlat</div><div class="d">Seçimler askıdayken istikrar -%10. Savaş bitince seçimler kendiliğinden döner.</div></div><span class="muted">›</span></button>`;
    else if (c.enemies.length) { const r = G.elecCanSuspend(c); h += `<button class="item" data-act="elsusp" ${r.ok ? '' : 'disabled'} style="${r.ok ? '' : 'opacity:.5'}"><div class="grow"><div class="t">Seçimleri askıya al · ${G.elecSuspendCost} SG</div><div class="d">Savaş sürerken seçimler durur; karşılığında istikrar -%10.${r.ok ? '' : ' ' + esc(r.why)}</div></div><span class="muted">›</span></button>`; }
    return sec('Seçimler', `<div class="list">${h}</div><p class="muted small" style="margin:0">Seçimde demokratlar %50'yi geçerse iktidar sürer ve istikrar artar; geçemezse en çok oyu alan parti hükümeti kurar.</p>`);
  }
  UI.electionSection = electionSection;
  // Gönüllü kuvvetler: savaştaki bir ülkeye tümen ve uçak gönder, geri çağır
  function volunteerSection(c, tag, x) {
    const sentD = G.volSent(c.tag, tag), sentA = Math.round(G.volAirSent(c.tag, tag));
    const open = x.enemies.length > 0 && !G.atWar(c.tag, tag);
    if (!open && !sentD && !sentA) return '';
    const r = open ? G.volCheck(c.tag, tag) : { ok: false, why: '' };
    let h = kv([['Tümen kotası', `${G.volSent(c.tag)}/${G.volCap(c.tag)}`], ['Hava kotası', `${Math.round(G.volAirSent(c.tag))}/${G.volAirCap(c.tag)}`]]);
    if (sentD || sentA) h += `<p class="small good" style="margin:0">${esc(G.cname(tag))} cephesinde: ${sentD} tümen · ${sentA} uçak</p>`;
    if (open && !r.ok) h += `<p class="small warn" style="margin:0">${esc(r.why)}</p>`;
    if (open) {
      const NM = { fig: 'avcı', cas: 'yakın destek', bom: 'bombardıman' };
      h += `<div class="btns">${[1, 2, 4].map((n) => `<button class="btn sm ${r.ok && r.left >= n ? 'pri' : ''}" data-act="volsend" data-k="${tag}" data-v="${n}" ${r.ok && r.left >= n ? '' : 'disabled'}>${n} tümen</button>`).join('')}</div>`;
      h += `<div class="btns">${g.PLANES.map((e) => [50, 100].filter((n) => e === 'fig' || n === 50).map((n) => { const ok = r.ok && r.airLeft >= n && G.planes(c, e) >= n; return `<button class="btn sm ${ok ? 'pri' : ''}" data-act="volair" data-k="${tag}" data-e="${e}" data-v="${n}" ${ok ? '' : 'disabled'}>${n} ${NM[e]}</button>`; }).join('')).join('')}</div>`;
    }
    if (sentD || sentA) h += `<button class="btn sm" data-act="volback" data-v="${tag}">Gönüllüleri geri çağır</button>`;
    return sec('Gönüllü kuvvetler', `<p class="muted small" style="margin:0">Savaşa girmeden dost bir ülkeye tümen ve uçak gönder. Gönüllüler alıcının komutasında savaşır; insan gücü ve takviye sana yazılır, savaş bitince eve dönerler, deneyim sende kalır. En çok ordunun %10'u.</p>${h}`);
  }
  // ---------- İstihbarat teşkilatı ----------
  function intelSummary(c) {
    const I = c.intel;
    if (!I) return sec('İstihbarat teşkilatı', `<p class="muted small" style="margin:0">Ajan yetiştir, ülkelere casus ağı kur; ağ güçlenince teknoloji çal, sabotaj yap, şifre kır, direnişi örgütle ya da darbe hazırla.</p><button class="btn pri" data-act="intelfound" ${c.pp >= G.INTEL_FOUND ? '' : 'disabled'}>Teşkilatı kur · ${G.INTEL_FOUND} SG</button>`);
    const nets = Object.entries(I.net).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return sec('İstihbarat teşkilatı', `${kv([['Ajan', `${G.intelFree(c)} boşta / ${I.ag}`], ['Eğitimde', I.tr.length], ['Ağ', Object.keys(I.as).length], ['Operasyon', I.ops.length]])}${nets.length ? `<div class="row" style="flex-wrap:wrap;gap:8px;margin:4px 0">${nets.map(([t, n]) => `<span class="small">${G.flag(t, 21, 14)} %${Math.floor(n)}</span>`).join('')}</div>` : ''}<button class="btn pri" data-act="intelopen">Teşkilatı yönet</button>`);
  }
  function intelView(c) {
    const st = G.st, I = c.intel;
    if (!I) { UI.sub = null; return PANELS.dip(); }
    let html = `<button class="btn sm" data-act="intelback">‹ Diplomasi</button>`;
    const max = G.intelMax(c);
    html += sec('Ajanlar', `${kv([['Toplam', `${I.ag}/${max}`], ['Boşta', G.intelFree(c)], ['Eğitimde', I.tr.length ? I.tr.map((d) => d + ' gün').join(', ') : '—']])}<p class="muted small" style="margin:0">Ajanları bir ülkenin sayfasından (Diplomasi → ülke → Casus ağı) gönder. Her ajan ağı her 5 günde ~%2 büyütür; hedefin karşı istihbaratı yavaşlatır ve ajan yakalayabilir.</p><button class="btn ${I.ag + I.tr.length < max && c.pp >= 25 ? 'pri' : ''}" data-act="intelrec" ${I.ag + I.tr.length < max && c.pp >= 25 ? '' : 'disabled'}>Ajan yetiştir · 25 SG</button>`);
    let uh = '<div class="list">';
    for (const [k, U] of Object.entries(G.INTEL_UPG)) {
      const has = I.up[k], run = I.upq && I.upq.id === k, ok = !has && !I.upq && c.pp >= U.cost;
      uh += `<div class="item"><div class="grow"><div class="t">${U.n}${has ? ' <span class="good small">✓</span>' : ''}</div><div class="d">${U.d}${has ? '' : ` · ${U.cost} SG · ${U.days} gün`}</div>${run ? `<div class="d good">Kuruluyor: ${I.upq.d} gün</div>` : ''}</div>${has || run ? '' : `<button class="btn sm ${ok ? 'pri' : ''}" data-act="intelupg" data-v="${k}" ${ok ? '' : 'disabled'}>Kur</button>`}</div>`;
    }
    html += sec('Geliştirmeler', uh + '</div>');
    const ts = [...new Set(Object.keys(I.net).concat(Object.keys(I.as)))].filter((t) => st.C[t]?.alive).sort((a, b) => (I.net[b] || 0) - (I.net[a] || 0));
    html += sec('Casus ağları', ts.length ? `<div class="list">${ts.map((t) => `<button class="item" data-act="opencountry" data-v="${t}">${G.flag(t, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(t))} <span class="muted small">%${Math.floor(I.net[t] || 0)}</span></div>${bar((I.net[t] || 0) / 100)}<div class="d">${I.as[t] || 0} ajan · karşı istihbarat %${Math.round(G.intelCI(t) * 100)}${I.ops.filter((o) => o.t === t).map((o) => ` · ${G.SPY_OPS[o.op].n} (${o.d} gün)`).join('')}</div></div><span class="muted">›</span></button>`).join('')}</div>` : '<p class="muted small" style="margin:0">Henüz casus ağı yok.</p>');
    const foes = Object.values(st.C).filter((x) => x.alive && x.intel && x.intel.as[c.tag]);
    if (I.up.ci) html += sec('Karşı istihbarat raporu', foes.length ? `<div class="list">${foes.map((x) => `<div class="item">${G.flag(x.tag, 30, 20)}<div class="grow"><div class="t">${esc(G.cname(x.tag))}</div><div class="d">${x.intel.as[c.tag]} ajan · ağ %${Math.floor(x.intel.net[c.tag] || 0)}</div></div></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Ülkemizde bilinen yabancı casus ağı yok.</p>');
    else html += `<p class="muted small">Karşı İstihbarat Dairesi kurulunca ülkendeki yabancı casus ağları burada görünür.</p>`;
    return { title: 'İstihbarat teşkilatı', html };
  }
  function spySection(c, tag) {
    const I = c.intel; if (!I) return '';
    const st = G.st, n = I.net[tag] || 0;
    let h = `<div class="item"><div class="grow"><div class="t">Casus ağı %${Math.floor(n)}</div>${bar(n / 100)}<div class="d">${I.as[tag] || 0} ajan görevde · ${G.intelFree(c)} ajan boşta · karşı istihbarat %${Math.round(G.intelCI(tag) * 100)}</div></div><div class="btns"><button class="btn sm" data-act="intelas" data-k="${tag}" data-v="-1" ${I.as[tag] ? '' : 'disabled'}>−</button><button class="btn sm pri" data-act="intelas" data-k="${tag}" data-v="1" ${G.intelFree(c) ? '' : 'disabled'}>+ Ajan</button></div></div>`;
    for (const [op, O] of Object.entries(G.SPY_OPS)) {
      const run = I.ops.find((o) => o.t === tag && o.op === op), r = G.spyAllowed(c, tag, op);
      h += `<div class="item"><div class="grow"><div class="t">${O.n} <span class="muted small">ağ %${O.net}</span></div><div class="d">${O.d} · ${O.cost} SG · ${O.days} gün${n >= O.net ? ` · başarı %${Math.round(G.intelChance(c, tag, op) * 100)}` : ''}</div>${run ? `<div class="d good">Sürüyor: ${run.d} gün</div>` : !r.ok ? `<div class="d warn">${esc(r.why)}</div>` : ''}</div>${run ? '' : `<button class="btn sm ${r.ok ? 'pri' : ''}" data-act="spyop" data-k="${tag}" data-v="${op}" ${r.ok ? '' : 'disabled'}>Başlat</button>`}</div>`;
    }
    return sec('Casus ağı', `<div class="list">${h}</div>`);
  }
  function countryView(tag) {
    const st = G.st, c = me(), x = st.C[tag], d = G.def(tag);
    const divs = st.units.filter((u) => u.t === tag).length;
    let html = `<div class="row">${G.flag(tag, 54, 36)}<div class="grow"><div style="font-size:20px;font-weight:700">${esc(d.n)}</div><div class="muted small">${esc(d.l)} · <span style="color:${g.IDEOLOGIES[x.ideo].c}">${g.IDEOLOGIES[x.ideo].n}</span>${x.fac ? ' · ' + esc(st.factions[x.fac]?.n || '') : ''}</div><div style="margin-top:4px">${relPills(c.tag, tag)}</div></div></div>`;
    const ratio = G.armyPower(tag) / (G.armyPower(c.tag) + 1);
    html += kv([['Tümen', divs], ['Sivil fab.', x.sum.civ], ['Askerî fab.', x.sum.mil], ['Eyalet', x.sum.provs], ['Ordu gücü', ratio > 1.3 ? 'Bizden güçlü' : ratio < 0.7 ? 'Bizden zayıf' : 'Denk', ratio > 1.3 ? 'bad' : ratio < 0.7 ? 'good' : ''], ['Görüş', G.opinion(tag, c.tag) > 20 ? 'Dostane' : G.opinion(tag, c.tag) < -20 ? 'Düşmanca' : 'Nötr']]);
    if (x.enemies.length) html += `<p class="small" style="margin:0">Savaşta: ${x.enemies.map((t) => esc(G.cname(t))).join(', ')}</p><div class="row" style="gap:6px;align-items:center"><span class="small">Teslimiyet</span><div class="grow">${bar(Math.min(1, x.surrender || 0), (x.surrender || 0) > 0.6 ? 'r' : '')}</div><span class="small">%${Math.round(Math.min(1, x.surrender || 0) * 100)}</span></div>`;
    const bcx = G.borderConflictOf && G.borderConflictOf(c.tag, tag);
    if (bcx) html += sec('Sınır çatışması', `<p class="small" style="margin:0">${esc(bcx.n)} · ${Math.max(0, bcx.e - st.day)} gün kaldı. ${bcx.sc > 2 ? (bcx.a === c.tag ? 'Üstünüz' : 'Gerideyiz') : bcx.sc < -2 ? (bcx.a === c.tag ? 'Gerideyiz' : 'Üstünüz') : 'Denge'} (puan ${bcx.sc.toFixed(1)}). Sınır eyaletine ve komşularına tümen yığarak sonucu etkileyebilirsin.</p><button class="btn danger" data-act="bcesc" data-v="${tag}">Tam savaşa tırmandır</button>`);
    const cwp = (st.civil || []).find((p) => p.includes(tag));
    if (cwp) { const o = cwp[0] === tag ? cwp[1] : cwp[0]; html += sec('İç savaş', `<p class="small" style="margin:0">${esc(G.cname(cwp[1]))} hükümeti ile ${esc(G.cname(cwp[0]))} asileri savaşıyor. Kazanan bütün ülkeyi alır. Taraflardan birine gönüllü, teçhizat ya da casus göndererek savaşın sonucunu etkileyebilirsin.</p><div class="list"><button class="item" data-act="opencountry" data-v="${o}">${G.flag(o, 30, 20)}<div class="grow"><div class="t">Karşı taraf: ${esc(G.cname(o))}</div><div class="d">${esc(st.C[o].leader)} · ${st.C[o].sum.provs} eyalet</div></div><span class="muted">›</span></button></div>`); }
    if (x.overlord && st.C[x.overlord]?.alive) html += `<p class="small" style="margin:0">${esc(G.cname(x.overlord))} devletine bağlı · ${G.AUTO_LV[G.autoLevel(x)].n} (özerklik %${Math.round(x.auto ?? 30)})</p>`;
    const xs = G.subjectsOf(tag); if (xs.length) html += `<p class="small" style="margin:0">Bağlı devletleri: ${xs.map((y) => esc(G.cname(y.tag))).join(', ')}</p>`;
    const xsp = (x.spirits || []).filter((s) => g.SPIRITS[s]);
    if (xsp.length) html += sec('Ulusal ruhlar', `<div class="list">${xsp.map((s) => spiritHtml(s, x)).join('')}</div>`, `${xsp.length}`);
    const acts = [];
    const atWar = G.atWar(c.tag, tag);
    if (!atWar) {
      const j = G.canJustify(c.tag, tag);
      if (st.goals[c.tag + '>' + tag] == null) acts.push(['justify', `Savaş gerekçesi üret (${G.justifyCost(c)} SG, ${G.justifyDays(c)} gün)`, j.ok, j.why]);
      acts.push(['declare', 'Savaş ilan et', G.canDeclare(c.tag, tag), 'Önce savaş gerekçesi gerekir (müttefikinin düşmanına doğrudan ilan edebilirsin).']);
      const myFac = c.fac ? st.factions[c.fac] : null;
      if (myFac && !G.sameFaction(c.tag, tag)) acts.push(['invite', `${myFac.n} ittifakına davet et`, true]);
      if (x.fac && !G.sameFaction(c.tag, tag)) acts.push(['joinfac', `${st.factions[x.fac].n} ittifakına katılmak iste`, !c.fac || st.factions[c.fac].leader !== c.tag, 'Kendi ittifakının lideriysen başka ittifaka katılamazsın.']);
      if (!st.access[c.tag + '>' + tag] && !G.sameFaction(c.tag, tag)) acts.push(['access', 'Askerî geçiş izni iste', true]);
      if (!st.pacts[G.pairKey(c.tag, tag)]) acts.push(['pact', 'Saldırmazlık paktı öner', true]);
      if (!(st.guar[c.tag] || []).includes(tag)) acts.push(['guar', 'Bağımsızlık garantisi ver', true]);
      if (G.ultAllowed) for (const [k, n] of [['border', 'Sınır eyaletlerini talep et (ültimatom)'], ['annex', 'İlhak talep et (ültimatom)']]) { const u = G.ultAllowed(c.tag, tag, k); if (!(k === 'annex' && x.major) && u.why !== 'Ortak kara sınırı yok') acts.push(['ult_' + k, `${n} · ${G.ULT_COST} SG`, u.ok, u.why]); }
      if (G.ctaAllowed && c.enemies.length) { const r2 = G.ctaAllowed(c.tag, tag); if (r2.why !== 'Zaten düşmanlarınla savaşıyor') acts.push(['cta', 'Savaşa çağır', r2.ok, r2.why]); }
      if (G.bcAllowed) { const bc = G.bcAllowed(c.tag, tag); if (bc.why !== 'Ortak kara sınırı yok') acts.push(['bc', `Sınır çatışması başlat (${G.BC_COST} SG, ${G.BC_DAYS} gün)`, bc.ok, bc.why]); }
    } else acts.push(['peace', 'Beyaz barış teklif et', true]);
    let ah = '<div class="list">';
    for (const [k, n, ok, why] of acts) ah += `<button class="item" data-act="dip" data-k="${k}" data-v="${tag}" ${ok ? '' : 'disabled'} style="${ok ? '' : 'opacity:.5'}"><div class="grow"><div class="t">${n}</div>${!ok && why ? `<div class="d warn">${esc(why)}</div>` : ''}</div><span class="muted">›</span></button>`;
    ah += `<button class="item" data-act="showc" data-v="${tag}"><div class="grow"><div class="t">Haritada göster</div></div><span class="muted">›</span></button></div>`;
    html += sec('Eylemler', ah);
    html += volunteerSection(c, tag, x);
    // ticaret ve yardım
    let th = '<div class="list">';
    const emb = st.embargo[c.tag + '>' + tag];
    th += `<button class="item" data-act="embargo" data-v="${tag}"><div class="grow"><div class="t">${emb ? 'Ambargoyu kaldır' : 'Ambargo uygula'}</div><div class="d">Ambargo uygulanan ülke senden kaynak alamaz.</div></div><span class="muted">›</span></button>`;
    if (!atWar) th += `<div class="item"><div class="grow"><div class="t">Ödünç verme-kiralama</div><div class="d">Teçhizat gönder; ilişkiler iyileşir.</div><div class="btns" style="margin-top:6px">${G.LEND.map(([e2, n, nm]) => `<button class="btn sm" data-act="lend" data-k="${tag}" data-e="${e2}" data-v="${n}" ${((e2 === 'conv' ? c.ships.conv : c.stock[e2]) || 0) >= n ? '' : 'disabled'}>${n} ${nm}</button>`).join('')}</div></div></div>`;
    html += sec('Ticaret ve yardım', th + '</div>');
    // istihbarat
    let ih = '<div class="list">';
    for (const [op, O] of Object.entries(G.OPS)) {
      const run = st.ops.find((o) => o.a === c.tag && o.t === tag && o.op === op);
      const r = G.opAllowed(c.tag, tag, op);
      ih += `<div class="item"><div class="grow"><div class="t">${O.n}</div><div class="d">${O.d} · ${O.cost} SG · ${O.days} gün</div>${run ? `<div class="d good">Sürüyor: ${run.d} gün kaldı</div>` : !r.ok ? `<div class="d warn">${esc(r.why)}</div>` : ''}</div>${run ? '' : `<button class="btn sm ${r.ok ? 'pri' : ''}" data-act="op" data-k="${tag}" data-v="${op}" ${r.ok ? '' : 'disabled'}>Başlat</button>`}</div>`;
    }
    html += spySection(c, tag);
    html += sec(c.intel ? 'Siyasi operasyonlar' : 'İstihbarat operasyonları', ih + '</div>');
    return { title: d.n, html };
  }

})(window);
