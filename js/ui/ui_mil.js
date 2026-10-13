// Arayüz: üretim ve tasarım bürosu, ticaret ve yakıt, donanma, hava kuvvetleri, barış konferansı, inşaat, ordu, muharebe, komutanlar, tümen şablonları.
(function (g) {
  const G = g.G, R = G.R, UI = G.UI;
  const { P, NP } = G;
  const { $, esc, me, r1, int, pct, bar, sec, kv, FT_Z, fuelOf } = UI.L;
  const PANELS = UI.PANELS, ACT = UI.ACT;
  // Üretim
  // ---------- Tasarım bürosu (tank ve uçak tasarımcısı) ----------
  const XPN = { axp: 'Kara tecrübesi', fxp: 'Hava tecrübesi', nxp: 'Deniz tecrübesi' };
  const STAT_SHOW = {
    fp: (v) => '%' + Math.round(v * 100), ar: (v) => '%' + Math.round(v * 100), asw: (v) => '%' + Math.round(v * 100), sp: (v) => '%' + Math.round(v * 100),
    a: (v) => r1(v * 13), d: (v) => r1(v * 30), r: (v) => r1(v * 10), p: (v) => `${r1(v * 5)} / ${Math.round(v * 15)}`, s: (v) => Math.round(v * 9 * 4) + ' km/s', rel: (v) => '%' + Math.round(v * 100),
    aa: (v) => r1(v * 10), df: (v) => r1(v * 10), ga: (v) => r1(v * 10), sb: (v) => r1(v * 10), na: (v) => r1(v * 10), rg: (v) => Math.round(v * 500) + ' km',
  };
  const statTable = (e, st0, ref) => {
    const D = g.DESIGN[e];
    return `<div class="dzst">${D.stats.map(([k, n]) => { const v = st0.v[k] || 0, r = ref ? ref.v[k] || 0 : v; const dlt = r ? (v - r) / r : 0; return `<div><span>${n}</span><b>${STAT_SHOW[k](v)}</b><span class="${dlt > 0.005 ? 'good' : dlt < -0.005 ? 'bad' : 'muted'} small">${Math.abs(dlt) > 0.005 ? (dlt > 0 ? '+' : '') + Math.round(dlt * 100) + '%' : '—'}</span></div>`; }).join('')}<div><span>Üretim maliyeti</span><b>${r1(g.EQUIP[e].cost * st0.cm)}</b><span class="${st0.cm > (ref ? ref.cm : st0.cm) + 0.005 ? 'bad' : st0.cm < (ref ? ref.cm : st0.cm) - 0.005 ? 'good' : 'muted'} small">×${st0.cm.toFixed(2)}</span></div></div>`;
  };
  function designer(c, e) {
    const D = g.DESIGN[e], best = Math.floor(G.bestLevel(c, e));
    if (!UI.dz || UI.dz.e !== e) UI.dz = { e, t: Math.max(1, best), m: {}, n: '' };
    const dz = UI.dz; if (dz.t > best) dz.t = Math.max(1, best);
    const xk = G.XP_KIND[e], cost = G.designCost(e, dz), err = G.designValid(c, e, dz);
    const pv = G.designPreview(e, dz), ref = G.designStats(e, G.defaultDesign(e, dz.t));
    let html = G.art.img(G.art.vehicle(e, dz.t, c.tag), 'vehbanner') + `<div class="row" style="justify-content:space-between;align-items:center"><span class="small">${XPN[xk]}: <b>${Math.floor(c[xk] ?? 30)}</b></span><span class="small">Kaydetme: <b class="${(c[xk] ?? 30) >= cost ? '' : 'bad'}">${cost} tecrübe</b></span></div>`;
    if (D.ship) html += `<p class="muted small" style="margin:0">Gemi gücü çarpanı: <b>×${G.shipPow(e, pv.v).toFixed(2)}</b>. Bu tasarımla üretilen gemiler filodaki ${esc(D.n.toLowerCase())} ortalama gücünü değiştirir (mevcut ortalama ×${G.shipQ(c, e).toFixed(2)}).</p>`;
    html += sec(D.n === 'Tank' ? 'Şasi' : 'Gövde', `<div class="seg sm wrap">${D.tierN.slice(1).map((n, i) => `<button class="${dz.t === i + 1 ? 'on' : ''}" data-act="dztier" data-v="${i + 1}" ${i + 1 > best ? 'disabled' : ''}>${esc(n)}</button>`).join('')}</div>`);
    let mh = '';
    for (const sl of D.slots) {
      const lock = sl.req && dz.t < sl.req;
      if (sl.lvl) {
        const n = dz.m[sl.k] | 0;
        mh += `<div class="dzslot"><div class="row" style="justify-content:space-between;align-items:center"><span class="t">${sl.n}</span><div class="stepper"><button data-act="dzlvl" data-k="${sl.k}" data-v="-1" aria-label="Azalt">−</button><b>${n}/${sl.lvl}</b><button data-act="dzlvl" data-k="${sl.k}" data-v="1" aria-label="Artır" ${lock ? 'disabled' : ''}>+</button></div></div><div class="muted small">${Object.entries(sl.per.fx).map(([k, v]) => `${(D.stats.find((x) => x[0] === k) || [k, k])[1]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(', ')} · maliyet +${Math.round(sl.per.cost * 100)}% (kademe başına)</div></div>`;
        continue;
      }
      const cur = dz.m[sl.k] ?? sl.def;
      mh += `<div class="dzslot"><span class="t">${sl.n}${lock ? ` <span class="muted small">(${D.tierN[sl.req]} gerekli)</span>` : ''}</span><div class="seg sm wrap">${sl.opts.map((o) => `<button class="${cur === o.id ? 'on' : ''}" data-act="dzmod" data-k="${sl.k}" data-v="${o.id}" ${lock || (o.req && dz.t < o.req) ? 'disabled' : ''}>${esc(o.n)}</button>`).join('')}</div></div>`;
    }
    html += sec('Modüller', mh);
    html += sec('Özellikler', statTable(e, pv, ref) + '<p class="muted small" style="margin:0">Yüzdeler aynı şasinin standart modeline göredir.</p>');
    html += `<label class="field"><span>Tasarım adı</span><input id="dz-name" value="${esc(dz.n)}" maxlength="28" placeholder="${esc(D.n)} ${(c.designs || []).filter((x) => x.e === e).length + 1}"></label>`;
    if (err) html += `<p class="small warn" style="margin:0">${esc(err)}</p>`;
    html += `<div class="btns"><button class="btn pri" data-act="dzsave" ${err ? 'disabled' : ''}>Kaydet</button>${UI.dzLine != null ? `<button class="btn" data-act="dzsave" data-v="line" ${err ? 'disabled' : ''}>Kaydet ve hatta ata</button>` : ''}<button class="btn" data-act="dzreset">Sıfırla</button></div>`;
    return { title: `${g.EQUIP[e].s} tasarımcısı`, html };
  }
  function linePicker(c, i) {
    const l = c.lines[i]; if (!l) { UI.sub = null; return PANELS.prod(); }
    const cur = G.lineDesign(c, l), list = G.designsFor(c, l.e).reverse();
    const ref = G.designStats(l.e, G.defaultDesign(l.e, Math.floor(G.bestLevel(c, l.e))));
    let html = G.art.img(G.art.vehicle(l.e, cur ? cur.t : Math.floor(G.bestLevel(c, l.e)), c.tag), 'vehbanner') + `<p class="muted small" style="margin:0">Hattın ürettiği tasarımı değiştirmek fabrika verimini düşürür (yeniden donanım).</p>`;
    html += `<div class="list">${list.map((d) => { const st0 = G.designStats(l.e, d), on = cur && cur.id === d.id; return `<div class="item ${on ? 'active' : ''}"><div class="grow"><div class="t">${esc(d.n)} <span class="muted small">${esc(g.DESIGN[l.e].tierN[d.t])}</span></div>${statTable(l.e, st0, ref)}</div>${on ? '<span class="muted small">üretimde</span>' : `<button class="btn sm pri" data-act="linedesign" data-k="${i}" data-v="${d.id}">Seç</button>`}</div>`; }).join('')}</div>`;
    html += `<div class="btns"><button class="btn pri" data-act="dznew" data-v="${l.e}" data-k="${i}">+ Yeni tasarım</button></div>`;
    return { title: `${g.EQUIP[l.e].n}: tasarım seç`, html };
  }

  PANELS.prod = () => {
    const c = me(), s = c.sum, e = c.econ || {}, m = c.mods;
    if (UI.sub && UI.sub.startsWith('design:')) return designer(c, UI.sub.slice(7));
    if (UI.sub && UI.sub.startsWith('line:')) return linePicker(c, +UI.sub.slice(5));
    let milA = 0, dockA = 0;
    for (const l of c.lines) (g.EQUIP[l.e].fac === 'mil' ? (milA += l.f) : (dockA += l.f));
    let html = kv([
      ['Askerî fab.', `${milA}/${s.mil}`, milA > s.mil ? 'bad' : ''],
      ['Tersane', `${dockA}/${s.dock}`, dockA > s.dock ? 'bad' : ''],
      ['Fabrika verimi', (m.factory >= 0 ? '+' : '') + Math.round(((m.factory || 0) + (e.stabF || 0)) * 100) + '%'],
      ['Bombardıman', c.bombed ? '-' + pct(c.bombed) : '—', c.bombed ? 'bad' : ''],
    ]);
    const short = g.RES_KEYS.filter((r) => (e.ratio || {})[r] < 1);
    if (short.length) html += `<p class="small warn" style="margin:0">Kaynak açığı: ${short.map((r) => g.RES[r]).join(', ')}. Eksik kaynak gerektiren hatlar yavaşlar. Ticaret panelinden satın al.</p>`;
    const effCap = Math.min(1, 0.6 + (m.effCap || 0));
    const line = (l, i) => {
      const eq = g.EQUIP[l.e];
      const best = G.bestLevel(c, l.e), lv = l.lv || best;
      const out = eq.ship || eq.convoy ? (l.f * 2.5 * (1 + (m.factory || 0))) : (l.f * 4.5 * l.eff * (1 + (m.factory || 0)) / (eq.cost * G.lineCostMul(c, l)));
      const stock = eq.convoy ? `${int(c.ships.conv || 0)} konvoy` : eq.ship ? `${Math.round(G.navyCount(c, l.e))} gemi` : `Stok ${int(c.stock[l.e] || 0)}`;
      const rate = eq.convoy ? `${r1(out / eq.cost)}/gün` : eq.ship ? `${l.f ? Math.ceil((eq.cost - (l.acc || 0)) / Math.max(0.1, out)) + ' günde 1' : 'durdu'}` : `${r1(out)}/gün`;
      const dsg = G.lineDesign(c, l);
      const model = dsg ? dsg.n : (g.MODEL_N[l.e] || [])[lv];
      const upg = !dsg && !eq.ship && !eq.convoy && lv < best;
      const dUp = dsg && dsg.t < Math.floor(best);
      const resTxt = Object.entries(eq.res).map(([r, v]) => `${g.RES[r].slice(0, 3)} ${r1(v * l.f)}`).join(' · ');
      return `<div class="item line">${G.art.eqImg(l.e, dsg ? dsg.t : lv, c.tag)}<div class="grow"><div class="t">${eq.n}${model ? ` <span class="muted small">${model}</span>` : ''}</div><div class="d">${stock} · ${rate}${eq.ship || eq.convoy ? '' : ` · verim ${pct(l.eff)}/${pct(effCap)}`}</div><div class="d">${resTxt}</div>${eq.ship ? bar((l.acc || 0) / eq.cost) : bar(l.eff / effCap, 'g')}
        <div class="btns" style="margin-top:4px">${dsg ? `<button class="btn sm ${dUp ? 'pri' : ''}" data-act="sub" data-v="line:${i}">${dUp ? 'Yeni şasi var · ' : ''}Tasarım ▾</button>` : ''}${upg ? `<button class="btn sm pri" data-act="lineup" data-v="${i}">Yeni modele geç: ${(g.MODEL_N[l.e] || [])[best] || 'Seviye ' + best}</button>` : ''}<button class="btn sm danger" data-act="linedel" data-v="${i}">Hattı sil</button></div></div>
        <div class="stepper"><button data-act="line" data-e="${l.e}" data-i="${i}" data-v="-1" aria-label="Azalt">−</button><b>${l.f}</b><button data-act="line" data-e="${l.e}" data-i="${i}" data-v="1" aria-label="Artır">+</button></div></div>`;
    };
    const idx = (fac) => c.lines.map((l, i) => [l, i]).filter(([l]) => g.EQUIP[l.e].fac === fac);
    const avail = (fac) => Object.entries(g.EQUIP).filter(([k, v]) => v.fac === fac && (m.unlockEq[k] || (!v.req && fac === 'mil') || (v.req && c.tech[v.req]) || k === 'conv' || k === 'sup'));
    html += sec('Kara ve hava üretimi', `<div class="list">${idx('mil').map(([l, i]) => line(l, i)).join('')}</div><div class="btns">${avail('mil').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>`, `${s.mil - milA} boşta`);
    html += sec('Tersaneler', `<div class="list">${idx('dock').map(([l, i]) => line(l, i)).join('') || '<p class="muted small" style="margin:0">Tersane hattı yok. İnşaat panelinden kıyı eyaletlerine tersane kurabilirsin.</p>'}</div>${s.dock ? `<div class="btns">${avail('dock').map(([k, v]) => `<button class="btn sm" data-act="addline" data-v="${k}">+ ${v.s}</button>`).join('')}</div>` : ''}`, `${s.dock - dockA} boşta`);
    // teçhizat stoğu ve modeller
    const rows = ['inf', 'sup', 'art', 'at', 'aa', 'mot', 'tank', 'fig', 'cas', 'bom'].map((k) => `<div><small>${g.EQUIP[k].s}</small><b>${int(c.stock[k] || 0)}</b><span class="muted small">${(g.MODEL_N[k] || [])[Math.round(G.lvl(c, k))] || 'Model ' + r1(G.lvl(c, k))}</span></div>`).join('');
    // tasarım bürosu
    const cus = (c.designs || []).filter((d) => !d.id.startsWith('ai'));
    let dh = `<div class="row" style="gap:12px"><span class="small">${XPN.axp}: <b>${Math.floor(c.axp ?? 30)}</b></span><span class="small">${XPN.fxp}: <b>${Math.floor(c.fxp ?? 30)}</b></span><span class="small">${XPN.nxp}: <b>${Math.floor(c.nxp ?? 30)}</b></span></div>`;
    dh += `<div class="btns">${[...G.DESIGNABLE].filter((k) => m.unlockEq[k] || !g.EQUIP[k].req || c.tech[g.EQUIP[k].req]).map((k) => `<button class="btn sm" data-act="dznew" data-v="${k}">+ ${g.EQUIP[k].s} tasarla</button>`).join('')}</div>`;
    if (cus.length) dh += `<div class="list">${cus.map((d) => { const st0 = G.designStats(d.e, d); return `<div class="item"><div class="grow"><div class="t">${esc(d.n)} <span class="muted small">${esc(g.DESIGN[d.e].tierN[d.t])}</span></div>${statTable(d.e, st0, G.designStats(d.e, G.defaultDesign(d.e, d.t)))}</div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm" data-act="dzcopy" data-v="${d.id}">Kopyala</button><button class="btn sm danger" data-act="dzdel" data-v="${d.id}">Sil</button></div></div>`; }).join('')}</div>`;
    else dh += '<p class="muted small" style="margin:0">Tasarım yok. Şasi/gövde ve modülleri seçip kendi tankını ve uçağını tasarla; sonra üretim hattında “Tasarım ▾” ile üretime al. Tasarım kaydetmek tecrübe puanı harcar (savaşta ve görevlerde kazanılır).</p>';
    html += sec('Tasarım bürosu', dh, `${cus.length} tasarım`);
    html += sec('Teçhizat deposu', `<div class="kv">${rows}</div><p class="muted small" style="margin:0">Yeni teknoloji araştırınca hatları “Yeni modele geç” ile güncelle. Ordudaki tümenler depodaki yeni modelleri takviye sırasında yavaşça alır.</p>`);
    return { title: 'Üretim', html };
  };

  // Ticaret
  // Yakıt deposu: miktar, kapasite ve doluluk (depo ilk günde kurulmamışsa varsayılanla başlatılır)
  const fuelSec = (c) => {
    const f = fuelOf(c), inn = c.fuelIn || 0, out = c.fuelOut || 0, dem = c.fuelDem || 0, net = inn - out;
    const lvl = f.fr < 0.2 ? 'r' : f.fr < 0.4 ? '' : 'g';
    let h = `<div class="fuelbar">${bar(f.fr, lvl)}</div>`;
    h += kv([['Yakıt deposu', `${int(f.fuel)} / ${int(f.cap)}`, f.fr < 0.2 ? 'bad' : ''], ['Günlük üretim', '+' + r1(inn), 'good'], ['Günlük tüketim', '-' + r1(out), out < dem - 0.5 ? 'bad' : ''], ['Net', (net >= 0 ? '+' : '') + r1(net), net < 0 ? 'bad' : 'good'], ['Rafineri', int(c._ref || 0)]]);
    const r = G.fuelRatio(c);
    h += r < 1
      ? `<p class="warn small" style="margin:6px 0 0">Yakıt azalıyor: motorlu ve zırhlı tümenlerin hızı ve saldırısı −%${Math.round((1 - G.fuelMul({ t: c.tag, u: 'arm' })) * 100)}, uçak görev etkinliği −%${Math.round((1 - G.fuelAirMul(c)) * 100)}, deniz gücü −%${Math.round((1 - G.fuelNavyMul(c)) * 100)}. Petrol ithal et ya da Sentetik Rafineri kur.</p>`
      : `<p class="muted small" style="margin:6px 0 0">Petrol her gün yakıta dönüşür (kullanılmayan petrolün %${Math.round(G.FUEL.rate * 100)}'i). Motorlu tümenler, uçaklar ve gemiler görevdeyken yakıt yakar; depo %20'nin altına inerse ceza başlar.</p>`;
    return sec('Yakıt', h, 'günlük birim');
  };
  PANELS.trade = () => {
    const st = G.st, c = me(), e = c.econ || {};
    if (UI.sub && UI.sub.startsWith('buy:')) return buyPicker(c, UI.sub.slice(4));
    let html = kv([['İthalat (fab.)', `${e.trade || 0}`], ['İhracat (fab.)', `+${e.expCiv || 0}`], ['Konvoy', `${int(c.ships.conv || 0)} / ${int(G.convoyNeed(c.tag))}`, (e.convRatio ?? 1) < 1 ? 'bad' : ''], ['Konvoy akını', c.raid ? '-' + pct(c.raid) : '—', c.raid ? 'bad' : ''], ['Ticaret yasası', g.LAWS.trade.opts[c.laws.trade].n]]);
    html += fuelSec(c);
    html += `<button class="toggle ${c.auto.trade ? 'on' : ''}" data-act="auto" data-v="trade"><span><b>Ticaret bakanı</b><br><span class="muted small">Açıksa eksik kaynakları otomatik satın alır, fazlayı iptal eder.</span></span><i></i></button>`;
    let rh = '<div class="restable"><div class="rh"><span>Kaynak</span><span>Üretim</span><span>İthal</span><span>Satılan</span><span>İhtiyaç</span><span></span></div>';
    const sold = (G._sold && G._sold[c.tag]) || {};
    for (const r of g.RES_KEYS) {
      const prod = c.sum.res[r] || 0, imp = (e.imp || {})[r] || 0, need = (e.need || {})[r] || 0, bal = (e.have || {})[r] - need;
      rh += `<div class="rr ${bal < -0.5 ? 'neg' : ''}"><span><b>${g.RES[r]}</b></span><span>${r1(prod)}</span><span>${r1(imp)}</span><span>${r1(sold[r] || 0)}</span><span>${r1(need)}</span><span><button class="btn sm" data-act="sub" data-v="buy:${r}">Al</button></span></div>`;
    }
    html += sec('Kaynaklar', rh + '</div>', 'günlük birim');
    const mine = st.deals.map((d, k) => [d, k]).filter(([d]) => d.i === c.tag);
    let dh = '<div class="list">';
    for (const [d, k] of mine) dh += `<div class="item">${G.flag(d.e, 26, 17)}<div class="grow"><div class="t">${g.RES[d.r]} ${int(d.n)}</div><div class="d">${esc(G.cname(d.e))} · ${G.dealCiv(d.n)} sivil fabrika${G.overseas(c.tag, d.e) ? ' · deniz aşırı (konvoy gerekir)' : ' · kara yolu'}</div></div><button class="btn sm" data-act="dealdel" data-v="${k}" aria-label="İptal">✕</button></div>`;
    if (!mine.length) dh += '<p class="muted small" style="margin:0">İthalat anlaşması yok.</p>';
    html += sec('İthalat anlaşmaları', dh + '</div>', `${mine.length}`);
    const out = st.deals.filter((d) => d.e === c.tag);
    if (out.length) html += sec('İhracat', `<div class="list">${out.map((d) => `<div class="item">${G.flag(d.i, 26, 17)}<div class="grow"><div class="t">${g.RES[d.r]} ${int(d.n)}</div><div class="d">${esc(G.cname(d.i))} · +${G.dealCiv(d.n)} sivil fabrika</div></div></div>`).join('')}</div>`);
    return { title: 'Ticaret', html };
  };
  function buyPicker(c, r) {
    const st = G.st, comm = G.committed();
    const list = Object.values(st.C).filter((x) => x.alive && x.tag !== c.tag).map((x) => ({ t: x.tag, free: G.exportFree(x.tag, r, comm), ok: G.canTradeWith(c.tag, x.tag) })).filter((x) => x.free >= 1).sort((a, b) => b.free - a.free);
    let html = `<p class="muted small" style="margin:0">${g.RES[r]} satan ülkeler. Her 8 birim 1 sivil fabrikaya mal olur. Deniz aşırı anlaşmalar konvoy ister.</p><div class="list">`;
    for (const x of list.slice(0, 30)) html += `<div class="item">${G.flag(x.t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(x.t))}</div><div class="d">Satılabilir ${r1(x.free)}${G.overseas(c.tag, x.t) ? ' · deniz aşırı' : ' · kara yolu'}${x.ok ? '' : ' · <span class="warn">ticarete kapalı</span>'}</div></div><div class="btns"><button class="btn sm pri" data-act="buy" data-k="${x.t}" data-v="${r}" data-n="8" ${x.ok && x.free >= 4 ? '' : 'disabled'}>+8</button><button class="btn sm" data-act="buy" data-k="${x.t}" data-v="${r}" data-n="${Math.floor(x.free)}" ${x.ok ? '' : 'disabled'}>Tümü</button></div></div>`;
    if (!list.length) html += '<p class="muted">Şu an satan ülke yok.</p>';
    return { title: `${g.RES[r]} satın al`, html: html + '</div>' };
  }

  // Donanma ve hava
  PANELS.navy = () => {
    const st = G.st, c = me();
    let html = kv([['Deniz gücü', int(G.navyPower(c))], ['Konvoy', int(c.ships.conv || 0)], ['Akın kaybı', c.raid ? pct(c.raid) : '—', c.raid ? 'bad' : ''], ['Hava gücü', int(G.airPower(c))], ['Hava üstünlüğü', c.enemies.length ? ((c.airMod || 1) >= 1 ? '+' : '') + Math.round(((c.airMod || 1) - 1) * 100) + '%' : '—', (c.airMod || 1) >= 1 ? 'good' : 'bad']]);
    let fh = '<div class="list">';
    for (const f of c.fleets) {
      const p = G.fleetPower(c, f);
      const where = SEA_N(f.loc);
      fh += `<div class="item army"><div class="grow"><div class="row"><div class="t grow">${esc(f.n)} <span class="muted small">${where}${f.path.length ? ' · yolda' : ''}</span></div><button class="btn sm" data-act="fleetsel" data-v="${f.id}">Seç</button></div>
        <div class="d">${g.SHIPS.filter((e2) => f.sh[e2] >= 0.5).map((e2) => `${Math.round(f.sh[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(' · ') || 'gemi yok'} · güç ${int(p)}</div>
        ${(f.sh.bb || 0) + (f.sh.cv || 0) >= 0.5 ? (() => { const sc = G.screenOf(c, f); return `<div class="d ${sc < 0.6 ? 'warn' : 'good'}">Perde %${Math.round(sc * 100)}${sc < 1 ? ' · büyük gemi başına 3 muhrip/kruvazör gerekir; perdesiz zırhlılar torpido ve uçaklara açık' : ''}</div>`; })() : ''}
        <div class="seg sm">${Object.entries(G.MISSIONS).map(([k, n]) => `<button class="${f.mis === k ? 'on' : ''}" data-act="fleetmis" data-k="${f.id}" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="btns"><button class="btn sm" data-act="fleethome" data-v="${f.id}">Limana dön</button><button class="btn sm" data-act="fleetauto" data-v="${f.id}">${f.auto ? '✓ ' : ''}Yeni gemiler buraya</button>${c.fleets.length > 1 ? `<button class="btn sm danger" data-act="fleetmerge" data-v="${f.id}">Birleştir</button>` : ''}</div></div></div>`;
    }
    if (!c.fleets.length) fh += '<p class="muted small" style="margin:0">Filon yok. Tersane kurup gemi üret.</p>';
    const res = g.SHIPS.filter((e2) => c.ships[e2] >= 1);
    fh += `</div>${res.length ? `<div class="item"><div class="grow"><div class="t">Yedek gemiler</div><div class="d">${res.map((e2) => `${Math.floor(c.ships[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(' · ')}</div></div><button class="btn sm pri" data-act="fleetnew">Yeni filo kur</button></div>` : ''}`;
    fh += '<p class="muted small" style="margin:0">Devriye: yakındaki zayıf düşman filolarına saldırır. Saldırı: daha uzağa ve cesurca saldırır. Konvoy akını: düşman ticaretini ve konvoylarını vurur. Refakat: kendi konvoylarını korur. Bir filoyu “Seç”ip haritada bir deniz bölgesine dokunarak elle taşıyabilirsin.</p>';
    html += sec('Filolar', fh);
    // deniz muharebesi raporları (HOI4)
    const reps = st.navRep || [];
    if (reps.length) {
      const L = (o) => g.SHIPS.filter((e2) => (o[e2] || 0) >= 0.5).map((e2) => `${Math.round(o[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(', ') || 'kayıp yok';
      const N = (o) => g.SHIPS.filter((e2) => (o[e2] || 0) >= 0.5).map((e2) => `${Math.round(o[e2])} ${g.EQUIP[e2].s.toLowerCase()}`).join(', ');
      let rh = '<div class="list">';
      for (const r of reps) {
        const lm = g.SHIPS.reduce((a, e2) => a + (r.lMe[e2] || 0) * g.EQUIP[e2].str, 0), lo = g.SHIPS.reduce((a, e2) => a + (r.lOp[e2] || 0) * g.EQUIP[e2].str, 0);
        const won = lo > lm * 1.2, lost = lm > lo * 1.2;
        rh += `<div class="item nbrep"><div class="grow"><div class="t">${esc(SEA_N(r.zone))} <span class="pill ${won ? 'ally' : lost ? 'enemy' : ''}">${won ? 'Zafer' : lost ? 'Yenilgi' : 'Berabere'}</span></div><div class="d muted">${G.fmtDate(r.day)}${r.last > r.day ? ' – ' + G.fmtDate(r.last) : ''} · ${esc(G.cname(r.me))} – ${esc(G.cname(r.op))}</div>
          <div class="nbcols"><div><b>Biz</b><span>${esc(N(r.nMe))}</span><span class="bad">Kayıp: ${esc(L(r.lMe))}</span><span class="muted">Perde %${Math.round((r.scMe ?? 1) * 100)}${r.airMe ? ' · uçak gemisi' : ''}</span></div><div><b>Düşman</b><span>${esc(N(r.nOp))}</span><span class="good">Kayıp: ${esc(L(r.lOp))}</span><span class="muted">Perde %${Math.round((r.scOp ?? 1) * 100)}${r.airOp ? ' · uçak gemisi' : ''}</span></div></div></div></div>`;
      }
      html += sec('Deniz muharebeleri', rh + '</div><p class="muted small" style="margin:0">Topçu ateşi, uçak gemisi saldırısı ve denizaltı torpidoları birlikte hesaplanır. Perdesi zayıf filonun zırhlı ve uçak gemileri ağır kayıp verir; muhripler denizaltıları avlar.</p>');
    }
    return { title: 'Donanma', html };
  };
  // ---------- Hava kuvvetleri (HOI4 tarzı) ----------
  const WIC = { fig: '✈', cas: '⬇', bom: '✦' };
  UI.wingName = (c, w) => { const k = c.wings.filter((x) => x.e === w.e).indexOf(w) + 1; return `${k}. ${G.WING_TYPES[w.e].n} Kanadı${w.vol ? ` · Gönüllü (${G.cname(w.vol)})` : ''}`; };
  PANELS.air = () => {
    const st = G.st, c = me();
    if (!c.wings) G.initWings(c);
    const tot = (e) => int(G.planes(c, e));
    let html = kv([['Avcı', tot('fig')], ['Yakın destek', tot('cas')], ['Bombardıman', tot('bom')], ['Stokta avcı', int(c.stock.fig || 0)], ['Stokta YDU', int(c.stock.cas || 0)], ['Stokta bombacı', int(c.stock.bom || 0)]]);
    html += `<button class="toggle ${c.auto.air ? 'on' : ''}" data-act="airauto"><span><b>Hava kurmayı (otomatik)</b><br><span class="muted small">Açıkken kanatlar cephelere, düşman sanayisine ve filolarına kendiliğinden atanır. Elle bölge verdiğin kanatlar sende kalır.</span></span><i></i></button>`;
    let wh = '<div class="list">';
    for (const w of c.wings) {
      const reg = w.r >= 0 ? G.AIR.regions[w.r] : null;
      const sup = reg ? G.airSup(c.tag, w.r) : 0.5;
      const pick = UI.airPick === w.id;
      wh += `<div class="item army ${pick ? 'active' : ''}"><div class="grow">
        <div class="row" style="gap:8px"><div class="t grow"><span class="wic">${WIC[w.e]}</span> ${esc(UI.wingName(c, w))} <span class="muted small">${Math.round(w.n)}/${w.max} uçak · ${g.MODEL_N?.[w.e]?.[Math.floor(G.lvl(c, w.e))] || ''}</span></div>${w.manual ? '<span class="pill">elle</span>' : '<span class="pill ally">oto</span>'}</div>
        ${bar(w.n / w.max, 'g')}
        <div class="small">Bölge: <b>${reg ? esc(reg.n) : '—'}</b>${reg && c.enemies.length ? ` · hava üstünlüğü <b class="${sup > 0.55 ? 'good' : sup < 0.45 ? 'bad' : 'warn'}">%${Math.round(sup * 100)}</b>` : ''}</div>
        <div class="small">Üs: <b>${w.b >= 0 ? esc(G.pname(w.b)) : '—'}</b>${w.b >= 0 ? ` <span class="muted">(seviye ${st.prov[w.b].ab || 0}, ${Math.round(G.baseLoad(w.b) / 100)}/${st.prov[w.b].ab || 0} kanat)</span>` : ''} · menzil ${Math.round(G.wingRangeKm(c, w))} km${reg && w.b >= 0 ? (G.inRange(c, w, w.r) ? ` · hedefe ${Math.round(G.regionKm(w.b, w.r))} km` : ' · <b class="bad">hedef menzil dışında</b>') : ''}${w._eff > 0 && w._eff < 1 ? ` · <b class="warn">üs dolu: etkinlik %${Math.round(w._eff * 100)}</b>` : ''}</div>
        <div class="seg sm">${G.WING_TYPES[w.e].m.map((k) => `<button class="${w.mis === k ? 'on' : ''}" data-act="wingmis" data-k="${w.id}" data-v="${k}">${G.MIS[k].n}</button>`).join('')}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm ${pick ? 'pri' : ''}" data-act="wingpick" data-v="${w.id}">${pick ? 'Haritada bölgeye dokun…' : 'Bölge seç (harita)'}</button><button class="btn sm ${UI.basePick === w.id ? 'pri' : ''}" data-act="basepick" data-v="${w.id}">Üs seç (harita)</button>${w.manual ? `<button class="btn sm" data-act="wingauto" data-v="${w.id}">Kurmaya bırak</button>` : ''}<button class="btn sm danger" data-act="wingdel" data-v="${w.id}">Dağıt</button></div>
      </div></div>`;
    }
    if (!c.wings.length) wh += '<p class="muted small" style="margin:0">Hava kanadın yok. Üretim panelinden uçak üret; stokta 10+ uçak olunca buradan kanat kur.</p>';
    wh += `</div><div class="btns">${g.PLANES.map((e) => `<button class="btn ${c.stock[e] >= 10 ? 'pri' : ''}" data-act="wingnew" data-v="${e}" ${c.stock[e] >= 10 ? '' : 'disabled'}>+ ${G.WING_TYPES[e].n} kanadı (${int(Math.min(G.WING_MAX, c.stock[e] || 0))})</button>`).join('')}</div>`;
    html += sec('Hava kanatları', wh, `${c.wings.length} kanat`);
    // görev rehberi
    html += sec('Görevler', `<div class="mods">${Object.entries(G.MIS).map(([k, m]) => `<div><span><b>${m.n}</b><br><span class="muted small">${m.d}</span></span><b class="small">${Object.entries(G.WING_TYPES).filter(([, t]) => t.m.includes(k)).map(([, t]) => t.n).join(', ')}</b></div>`).join('')}</div><p class="muted small" style="margin:6px 0 0">Kanat yalnızca kendi ya da müttefik toprağı bulunan veya ona komşu bölgelerde görev yapabilir (menzil). Kayıplar stoktaki uçaklarla kendiliğinden takviye edilir. Harita modu “Hava” bölgeleri ve hava üstünlüğünü gösterir.</p>`);
    // çekişmeli bölgeler
    if (c.enemies.length && G.airR) {
      const rows = [];
      for (const [r, m] of G.airR) { const tags = Object.keys(m); if (!tags.some((t) => t === c.tag || G.sameFaction(t, c.tag)) && !tags.some((t) => G.atWar(t, c.tag))) continue; if (!tags.some((t) => G.atWar(t, c.tag))) continue; rows.push([r, G.airSup(c.tag, r)]); }
      rows.sort((a, b) => a[1] - b[1]);
      if (rows.length) html += sec('Hava savaşı', `<div class="mods">${rows.slice(0, 12).map(([r, v]) => `<div><span>${esc(G.AIR.regions[r].n)}</span><b class="${v > 0.55 ? 'good' : v < 0.45 ? 'bad' : 'warn'}">%${Math.round(v * 100)}</b></div>`).join('')}</div>`, 'bizim hava üstünlüğümüz');
    }
    return { title: 'Hava kuvvetleri', html };
  };
  // Barış konferansı
  PANELS.peace = () => {
    const st = G.st, cf = st.conf;
    if (!cf) return { title: 'Barış konferansı', html: '<p class="muted">Şu an süren bir barış konferansı yok.</p>' };
    const me0 = st.player, p = cf.parts.find((q) => q.t === me0), turn = G.confTurn(cf), myTurn = turn === me0 && !cf.done;
    let html = `<div class="cfhead">${G.flag(cf.L, 30, 20)}<div class="grow"><b>${esc(G.cname(cf.L))}</b> <span class="muted small">tur ${cf.round}</span><div class="small">${cf.done ? '<b class="good">Paylaşım tamamlandı</b>' : myTurn ? '<b class="good">Sıra sende</b>' : 'Sıra: ' + esc(G.cname(turn))}</div></div>${cf.parts.map((q) => `<span class="cfpart ${q.t === turn ? 'on' : ''} ${q.pass === 2 ? 'off' : ''}" title="${esc(G.cname(q.t))} · katkı %${Math.round(q.sh * 100)}">${G.flag(q.t, 22, 15)}<b>${q.pts}</b></span>`).join('')}</div>`;
    // seçili bölge
    const sel = UI.cfSel != null ? cf.states[UI.cfSel] : null;
    if (sel) {
      const fl = sel.p.filter((n) => !cf.own[n]);
      const cost = fl.length ? G.confCost(cf, me0, fl) : 0;
      const ctrl = {}; for (const n of sel.p) ctrl[cf.ctrl[n]] = (ctrl[cf.ctrl[n]] || 0) + 1;
      const owner = !fl.length ? cf.own[sel.p[0]] : null;
      html += `<div class="item active"><div class="grow"><div class="t">${esc(sel.n)} <span class="muted small">${sel.p.length} eyalet · ${sel.vp} ZP · ${sel.ind} fabrika</span></div><div class="d">İşgalci: ${Object.entries(ctrl).map(([t, n]) => `${esc(G.cname(t))} ${n}`).join(', ')}${sel.oc !== cf.L ? ` · asli sahibi ${esc(G.cname(sel.oc))}` : ''}</div>${owner ? `<div class="d">Talep eden: <b>${esc(G.cname(owner.by || owner.t))}</b></div>` : ''}</div>${fl.length && myTurn ? `<button class="btn sm ${cost <= p.pts ? 'pri' : ''}" data-act="cftake" data-v="${sel.id}" ${cost <= p.pts ? '' : 'disabled'}>Talep et · ${cost}</button>` : ''}</div>`;
    } else if (!cf.done) html += '<p class="muted small" style="margin:0">Haritada bir bölgeye dokun ya da aşağıdan seç. Rakam senin için maliyet: kendi işgalin ucuz, başkasının işgali pahalı, eski asli toprakların yarı fiyat.</p>';
    if (myTurn) html += '<div class="btns"><button class="btn" data-act="cfpass">Pas geç</button><button class="btn danger" data-act="cfquit">Konferanstan çekil</button></div>';
    else if (cf.done) html += '<div class="btns"><button class="btn pri" data-act="cfend">Antlaşmayı imzala</button></div>';
    if (myTurn) {
      const pc = G.confPuppetCost(cf), canP = !cf.puppet && G.confRemainFrac(cf) >= 0.05;
      let ah = '';
      if (canP) ah += `<div class="item"><div class="grow"><div class="t">Kukla devlet kur</div><div class="d">Talep edilmemiş tüm topraklarda ${esc(G.cname(cf.L))} sana bağlı kukla olur.</div></div><button class="btn sm ${pc <= p.pts ? 'pri' : ''}" data-act="cfpuppet" ${pc <= p.pts ? '' : 'disabled'}>${pc}</button></div>`;
      for (const r of G.confReleasable(cf)) { const rc = G.confReleaseCost(cf, me0, r.provs); ah += `<div class="item">${G.flag(r.t, 26, 17)}<div class="grow"><div class="t">${esc(G.cname(r.t))} ulusunu serbest bırak</div><div class="d">${r.provs.length} asli eyaleti · sana bağlı kukla olur</div></div><button class="btn sm ${rc <= p.pts ? 'pri' : ''}" data-act="cfrelease" data-v="${r.t}" ${rc <= p.pts ? '' : 'disabled'}>${rc}</button></div>`; }
      if (ah) html += sec('Özel talepler', `<div class="list">${ah}</div>`, `${p.pts} puanın var`);
    }
    // bölgeler
    const rows = cf.states.map((s) => { const fl = s.p.filter((n) => !cf.own[n]); return { s, fl, cost: fl.length ? G.confCost(cf, me0, fl) : 1e9 }; }).sort((a, b) => (a.fl.length ? 0 : 1) - (b.fl.length ? 0 : 1) || a.cost - b.cost);
    html += sec('Bölgeler', `<div class="list">${rows.map(({ s, fl, cost }) => { const o = !fl.length ? cf.own[s.p[0]] : null; return `<button class="item ${UI.cfSel === s.id ? 'active' : ''}" data-act="cfsel" data-v="${s.id}">${o ? G.flag(o.by || o.t, 22, 15) : ''}<div class="grow"><div class="t">${esc(s.n)}</div><div class="d">${s.p.length} eyalet · ${s.vp} ZP · ${s.ind} fabrika${o ? ` · ${esc(G.cname(o.t))}${o.by && o.by !== o.t ? ' (' + esc(G.cname(o.by)) + ')' : ''}` : ''}</div></div>${fl.length ? `<b class="${p && cost <= p.pts ? 'good' : 'muted'}">${cost}</b>` : ''}</button>`; }).join('')}</div>`, `${cf.states.length} bölge`);
    if (cf.log.length) html += sec('Konferans günlüğü', `<div class="list">${cf.log.slice().reverse().slice(0, 30).map((l) => `<div class="item">${G.flag(l.t, 22, 15)}<div class="grow"><div class="d">${esc(G.cname(l.t))}: ${esc(l.m)}</div></div></div>`).join('')}</div>`);
    return { title: 'Barış konferansı', html };
  };
  const SEA_N = (n) => {
    if (n < NP) return G.pname(n);
    const s = G.SEAS[n - NP];
    const near = s.p.map((i) => P[i]).sort((a, b) => b.vp - a.vp)[0];
    return near ? `${near.n.startsWith('#') ? 'Açık deniz' : near.n} açıkları` : 'Açık deniz';
  };
  G.seaName = SEA_N;

  // İnşaat
  PANELS.con = () => {
    const st = G.st, c = me(), e = c.econ || {}, m = c.mods;
    if (UI.sub && UI.sub.startsWith('build:')) return buildPicker(c, UI.sub.slice(6));
    let html = kv([['Sivil fabrika', c.sum.civ], ['Tüketim malları', e.cg || 0], ['İthalat', e.trade || 0], ['İnşaatta', Math.floor(e.civFree || 0), 'good'], ['Hız', '+%' + Math.round((m.construct || 0) * 100)]]);
    let civ = e.civFree || 0;
    let qh = '<div class="list">';
    c.constr.forEach((q, i) => {
      const b = g.BUILDINGS[q.b]; const n = Math.min(15, Math.max(0, civ)); civ -= n;
      const rate = n * 5 * (1 + (m.construct || 0));
      qh += `<div class="item"><div class="grow"><div class="t">${b.n}</div><div class="d">${esc(G.pname(q.p))} · ${Math.floor(n)} fabrika · ${rate > 0 ? Math.ceil((b.cost - q.prog) / rate) + ' gün' : 'beklemede'}</div>${bar(q.prog / b.cost)}</div><div class="btns">${i ? `<button class="btn sm" data-act="cup" data-v="${i}" aria-label="Öne al">▲</button>` : ''}<button class="btn sm" data-act="cdel" data-v="${i}" aria-label="Kaldır">✕</button></div></div>`;
    });
    if (!c.constr.length) qh += '<p class="muted small" style="margin:0">Kuyruk boş. Sivil fabrikalar boşta bekliyor.</p>';
    html += sec('İnşaat kuyruğu', qh + '</div>', `${c.constr.length} proje`);
    html += sec('Yeni proje', `<div class="list">${Object.entries(g.BUILDINGS).map(([k, b]) => `<button class="item" data-act="sub" data-v="build:${k}"><div class="grow"><div class="t">${b.n}</div><div class="d">${int(b.cost)} inşaat puanı${k === 'fort' ? ' · eyalet savunması +%15/kademe' : k === 'dock' ? ' · yalnızca kıyı' : k === 'inf' ? ' · ikmal akışı ve hareket hızı artar' : k === 'rail' ? ' · ikmal uzağa daha az zayıflayarak akar' : k === 'hub' ? ' · yeni ikmal kaynağı (altyapı 2+, kıyı ya da demiryolu)' : k === 'ab' ? ' · seviye başına 100 uçak, en fazla 10' : k === 'ref' ? ' · seviye başına günlük +2,5 yakıt ve +30 depo, en fazla 5' : ''}</div></div><span class="muted">›</span></button>`).join('')}</div>`);
    return { title: 'İnşaat', html };
  };
  const lowSup = (c, i) => { const r = G.supRatio[c.tag]; return r && r[i] < 0.8; };
  function buildPicker(c, type) {
    const st = G.st, b = g.BUILDINGS[type];
    const rows = [];
    for (let i = 0; i < NP; i++) {
      const pr = st.prov[i]; if (pr.c !== c.tag) continue;
      if (!G.LEVEL_B.has(type) && pr.o !== c.tag) continue;
      if (b.coastal && !P[i].c) continue;
      if (type === 'hub' && !G.canHub(i)) continue;
      const queued = c.constr.filter((q) => q.p === i && (G.LEVEL_B.has(type) ? q.b === type : !G.LEVEL_B.has(q.b))).length;
      const free = type === 'fort' ? 5 - pr.fort - queued : type === 'inf' ? 5 - (pr.inf || 1) - queued : type === 'ab' ? 10 - (pr.ab || 0) - queued : type === 'rail' ? 5 - (pr.rail || 0) - queued : type === 'hub' ? 1 - queued : type === 'ref' ? g.BUILDINGS.ref.max - (pr.ref || 0) - queued : G.freeSlots(i) - queued;
      if (free <= 0) continue;
      const border = P[i].a.some((j) => st.prov[j].c !== c.tag);
      const front = type === 'ab' ? P[i].a.some((j) => P[j].a.some((k) => G.atWar(c.tag, st.prov[k].c))) : false;
      const score = type === 'ab' ? (front ? 80 : 0) + (pr.ab || 0) * 6 + P[i].vp + (i === c.cap ? 20 : 0) : type === 'fort' ? (P[i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) ? 100 : 0) + (border ? 50 : 0) + P[i].vp : type === 'inf' ? (G.supRatio[c.tag] && G.supRatio[c.tag][i] < 0.8 ? 80 : 0) + (border ? 30 : 0) + P[i].vp - (pr.inf || 1) * 5 : type === 'rail' ? (lowSup(c, i) ? 80 : 0) + (border ? 30 : 0) + P[i].vp - (pr.rail || 0) * 6 : type === 'hub' ? (lowSup(c, i) ? 80 : 0) + (border ? 20 : 0) + P[i].vp * 2 : free * 3 + P[i].vp;
      rows.push({ i, free, score, border });
    }
    rows.sort((a, b2) => b2.score - a.score);
    let html = `<p class="muted small" style="margin:0">${b.n} için eyalet seç. ${type === 'fort' ? 'Sınır ve cephe eyaletleri üstte.' : type === 'inf' ? 'İkmali zayıf ve sınırdaki eyaletler üstte. Altyapı ikmal akışını ve hareket hızını artırır.' : type === 'rail' ? 'İkmali zayıf ve sınırdaki eyaletler üstte. Her demiryolu kademesi ikmalin o eyaletten geçerken zayıflamasını azaltır; işgal edilen eyaletlerde hasarlıdır, zamanla onarılır.' : type === 'hub' ? 'Altyapısı 2 ve üstü, kıyıda ya da demiryolu bağlı eyaletlerde kurulur. İkmal merkezi, büyük bir şehir gibi çevresine ikmal yayar; cephenin gerisindeki zayıf ikmalli bölgelere kur.' : type === 'ab' ? 'Cepheye yakın ve büyük üsler üstte. Her seviye 100 uçak (bir kanat) barındırır; kanatlar yalnızca üslerinden menzil içindeki bölgelerde görev yapar.' : type === 'ref' ? 'Büyük şehirler üstte. Rafineri petrol gerektirmeden günlük yakıt üretir ve yakıt deposunu büyütür.' : 'En çok boş yuvası olan eyaletler üstte.'}</p><div class="list">`;
    for (const r of rows.slice(0, 40)) {
      const pr = st.prov[r.i];
      html += `<button class="item" data-act="build" data-b="${type}" data-v="${r.i}"><div class="grow"><div class="t">${esc(G.pname(r.i))}</div><div class="d">${type === 'fort' ? `Tahkimat ${pr.fort}/5${r.border ? ' · sınır' : ''}` : type === 'inf' ? `Altyapı ${pr.inf || 1}/5${r.border ? ' · sınır' : ''}${G.supAvail[c.tag] ? ' · ikmal ' + r1(G.supAvail[c.tag][r.i]) : ''}` : type === 'rail' ? `Demiryolu ${pr.rail || 0}/5 · altyapı ${pr.inf || 1}/5${r.border ? ' · sınır' : ''}${G.supAvail[c.tag] ? ' · ikmal ' + r1(G.supAvail[c.tag][r.i]) : ''}` : type === 'hub' ? `Altyapı ${pr.inf || 1}/5 · demiryolu ${pr.rail || 0}/5${P[r.i].c ? ' · kıyı' : ''}${G.supAvail[c.tag] ? ' · ikmal ' + r1(G.supAvail[c.tag][r.i]) : ''}` : type === 'ref' ? `Rafineri ${pr.ref || 0}/${b.max}` : type === 'ab' ? `Hava üssü ${pr.ab || 0}/10 · ${Math.round(G.baseLoad(r.i) / 100)}/${pr.ab || 0} kanat${P[r.i].a.some((j) => G.atWar(c.tag, st.prov[j].c)) ? ' · cephe' : ''}` : `Boş yuva ${r.free} · S${pr.civ} A${pr.mil} T${pr.dock}`}</div></div><span class="btn sm pri">Ekle</span></button>`;
    }
    if (!rows.length) html += '<p class="muted">Uygun eyalet yok.</p>';
    return { title: b.n, html: html + '</div>' };
  }

  // Ordu
  const ORD_N = { hold: 'Bekle', def: 'Cepheyi tut', atk: 'Uygula ▶', fb: 'Hatta çekil' };
  UI.ORD_N = ORD_N;
  const genLine = (gen) => `${esc(gen.n)} <span class="muted small">${gen.fm ? 'Mareşal' : 'General'} · ${gen.lvl}. seviye</span>`;
  const genSkills = (gen) => `<span class="skills"><b title="Saldırı">S ${gen.atk}</b><b title="Savunma">Sv ${gen.def}</b><b title="Planlama">P ${gen.plan}</b><b title="Lojistik">L ${gen.log}</b></span>${gen.tr.length ? `<div class="d">${gen.tr.map((t) => g.GEN_TRAITS[t].n).join(' · ')}</div>` : ''}`;
  PANELS.army = () => {
    const st = G.st, c = me();
    if (UI.sub && UI.sub.startsWith('tpl:')) return templateDesigner(c, UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('gen:')) return generalPicker(c, +UI.sub.slice(4));
    if (UI.sub === 'gens') return generalList(c);
    if (UI.sub && UI.sub.startsWith('grp:')) return groupPicker(c, +UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('gtr:')) return traitPicker(c, +UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('div:')) return divisionView(c, +UI.sub.slice(4));
    if (UI.sub && UI.sub.startsWith('divs:')) return armyDivisions(c, +UI.sub.slice(5));
    const mine = st.units.filter((u) => u.t === c.tag);
    const mp = G.manpower(c);
    let html = kv([['İnsan gücü', G.fmtMP(mp.avail), mp.avail < 30 ? 'bad' : ''], ['Toplam', G.fmtMP(mp.max)], ['Tümen', mine.length], ['Eğitimde', c.train.length], ['Piyade T.', int(c.stock.inf)], ['Topçu', int(c.stock.art)], ['Tank', int(c.stock.tank)], ['Motorlu', int(c.stock.mot)]]);
    // ordular
    const enemies = c.enemies.slice();
    let oh = '<div class="list">';
    for (const a of c.armies || []) {
      const us = G.armyUnits(c, a.id);
      const gen = a.gen ? G.genById(c, a.gen) : null;
      const str = us.length ? us.reduce((s, u) => s + u.str, 0) / us.length : 0;
      const battle = (G.battles || []).filter((b) => us.some((u) => u.loc === b.n || u.path[0] === b.n)).length;
      const mx = G.maxPlan(c, a);
      oh += `<div class="item army" style="border-left:4px solid ${G.armyColor(a)}"><div class="grow">
        <div class="row" style="gap:8px"><div class="t grow">${esc(a.n)} <span class="muted small">${us.length}/${G.ARMY_MAX} tümen${battle ? ` · <span class="bad">${battle} muharebe</span>` : ''}</span></div><button class="btn sm" data-act="armysel" data-v="${a.id}">Haritada seç</button></div>
        <button class="genrow" data-act="sub" data-v="gen:${a.id}">${gen ? `${G.art.genImg(gen, c.tag)}<div class="grow"><div>${genLine(gen)}</div>${genSkills(gen)}</div>` : '<span class="warn">Komutan ata ›</span>'}</button>
        <div class="small muted">Cephe: ${a.vs ? esc(G.cname(a.vs)) : 'tüm düşmanlar'} · ${a.front && a.front.length ? a.front.length + ' eyaletlik hat' : 'hat yok'}${a.goal != null ? ' · hedef: ' + esc(G.pname(a.goal)) : ''}</div>
        <div class="row" style="gap:8px;align-items:center"><span class="small">Plan %${Math.round((a.plan || 0) * 100)}/${Math.round(mx * 100)}</span><div class="grow">${bar((a.plan || 0) / mx, a.ord === 'atk' ? 'r' : 'g')}</div></div>
        <div class="seg sm">${Object.entries(ORD_N).map(([k, n]) => `<button class="${a.ord === k ? 'on' : ''}" data-act="armyord" data-k="${a.id}" data-v="${k}">${n}</button>`).join('')}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="armyvs" data-v="${a.id}">Cephe değiştir</button><button class="btn sm" data-act="armygoal" data-v="${a.id}">Taarruz oku çiz</button>${a.goal != null ? `<button class="btn sm" data-act="armygoalclr" data-v="${a.id}">Oku sil</button>` : ''}<button class="btn sm ${c.deployArmy === a.id ? 'pri' : ''}" data-act="armydeploy" data-v="${a.id}">Yeni tümenler buraya</button><button class="btn sm" data-act="armyadd" data-v="${a.id}" ${R.sel.units.size ? '' : 'disabled'}>Seçilileri ekle</button><button class="btn sm danger" data-act="armydel" data-v="${a.id}">Dağıt</button></div>
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">${a.boost && a.boost.until > st.day ? `<span class="pill ally">${G.ORDERS[a.boost.k].n}: ${a.boost.until - st.day} gün</span>` : Object.entries(G.ORDERS).map(([k, O]) => `<button class="btn sm" data-act="armyorder" data-k="${a.id}" data-v="${k}" ${(c.cp || 0) >= O.cost ? '' : 'disabled'} title="${O.d}">${O.n} · ${O.cost} KG</button>`).join('')}<button class="btn sm ${a.drill ? 'pri' : ''}" data-act="drill" data-v="${a.id}" ${c.enemies.length && !a.drill ? 'disabled' : ''} title="Barışta tümenler Düzenli seviyesine kadar tecrübe kazanır; tümen başına günde 3 piyade teçhizatı">${a.drill ? 'Tatbikatı durdur' : 'Tatbikat'}</button><button class="btn sm" data-act="sub" data-v="grp:${a.id}">Ordu grubu: ${a.grp && G.genById(c, a.grp) ? esc(G.genById(c, a.grp).n) : 'yok'}</button></div>
        <div class="row" style="gap:6px"><div class="grow">${bar(str, 'g')}</div></div></div></div>`;
    }
    oh += `<p class="muted small" style="margin:0">HOI4'teki gibi: orduya bir <b>cephe</b> ver (“Cepheyi tut”), istersen <b>taarruz oku</b> çiz. Cephede beklerken <b>planlama</b> dolar; hazır olunca <b>Uygula</b> ile taarruz başlar ve plan bonusu saldırıya eklenir. Ordu başına en fazla ${G.ARMY_MAX} tümen.</p>`;
    oh += `</div><div class="btns"><button class="btn pri" data-act="armynew">${R.sel.units.size ? `Seçili ${R.sel.units.size} tümenden ordu kur` : 'Ordusuz tümenlerden ordu kur'}</button><button class="btn" data-act="sub" data-v="gens">Komutanlar (${c.gens.length})</button></div>`;
    html += sec('Ordular', oh, enemies.length ? `${enemies.length} düşman` : 'barış');
    const oc = G.occSummary ? G.occSummary(c.tag) : null;
    if (oc && oc.n) html += sec('İşgal altındaki topraklar', kv([['Eyalet', oc.n], ['Ort. direniş', pct(oc.rs), oc.rs > 0.4 ? 'bad' : ''], ['Ort. uyum', pct(oc.cp)], ['Sabotaj', oc.sab, oc.sab ? 'bad' : ''], ['İşgal yasası', g.LAWS.occ.opts[c.laws.occ ?? 1].n]]) + `<p class="muted small" style="margin:0">Direniş, işgal ettiğin yerlerden gelen sanayiyi ve ikmali düşürür. Eyalette ya da yanında tümen bulundurmak (garnizon) direnişi bastırır; zamanla uyum artar. Harita modu “Direniş” ile bak.</p>`);
    // şablonlar ve eğitim
    const tpl = G.templatesOf(c);
    let th = '<div class="list">';
    for (const id of Object.keys(tpl)) {
      const t = G.T(c.tag, id);
      const locked = Object.keys(tpl[id].b).some((k) => g.BATS[k]?.req && !c.tech[g.BATS[k].req]);
      const ok = !locked && mp.avail >= t.mp;
      th += `<div class="item"><div class="grow"><div class="t">${esc(t.n)}</div><div class="d">${Object.entries(tpl[id].b).map(([k, n]) => `${n}×${g.BATS[k].n}`).join(', ')}${Object.keys(tpl[id].s || {}).length ? ' · ' + Object.keys(tpl[id].s).map((k) => g.SUPPORTS[k].n).join(', ') : ''}</div><div class="d">Yumuşak ${r1(t.sa)} · Sert ${r1(t.ha)} · Savunma ${r1(t.df)} · Atılım ${r1(t.bt)} · Moral ${Math.round(t.org)} · Hız ${t.spd} · Genişlik ${t.w}${t.arm ? ' · Zırh ' + Math.round(t.arm) : ''} · ${t.mp}K asker · ${t.days} gün${locked ? ' · <span class="warn">teknoloji gerekli</span>' : ''}</div></div><div class="btns col"><button class="btn sm ${ok ? 'pri' : ''}" data-act="train" data-v="${id}" data-n="1" ${ok ? '' : 'disabled'}>+1</button><button class="btn sm" data-act="train" data-v="${id}" data-n="5" ${ok && mp.avail >= t.mp * 5 ? '' : 'disabled'}>+5</button><button class="btn sm" data-act="sub" data-v="tpl:${id}">Tasarla</button></div></div>`;
    }
    th += `</div><button class="btn" data-act="tplnew">+ Yeni tümen şablonu</button>`;
    html += sec('Tümen tasarımcısı ve eğitim', th, 'Tümenler başkentte konuşlanır');
    if (c.train.length) {
      let qh = '<div class="list">';
      c.train.forEach((t, i) => {
        const u = G.T(c.tag, t.u);
        let ratio = 1; for (const [e, n] of Object.entries(u.eq)) ratio = Math.min(ratio, (c.stock[e] || 0) / n);
        qh += `<div class="item"><div class="grow"><div class="t">${esc(u.n)}</div><div class="d">${t.d > 0 ? Math.ceil(t.d) + ' gün kaldı' : ratio < 0.25 ? '<span class="warn">Teçhizat bekleniyor</span>' : 'Konuşlanıyor'}</div>${bar(1 - t.d / u.days)}</div><button class="btn sm" data-act="tdel" data-v="${i}" aria-label="İptal">✕</button></div>`;
      });
      html += sec('Eğitim kuyruğu', qh + '</div>');
    }
    const free = mine.filter((u) => !u.army);
    const autoN = free.filter((u) => u.auto).length;
    html += sec('Ordusuz tümenler', `<button class="toggle ${autoN === free.length && free.length ? 'on' : ''}" data-act="allauto"><span><b>Otomatik kurmay</b><br><span class="muted small">${autoN}/${free.length} ordusuz tümen yapay zekâ komutasında.</span></span><i></i></button>`);
    const groups = new Map();
    for (const u of mine) { const k = u.loc; let gl = groups.get(k); if (!gl) groups.set(k, (gl = [])); gl.push(u); }
    const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    let gh = '<div class="list">';
    for (const [loc, gl] of rows.slice(0, 50)) {
      const types = {}; for (const u of gl) { const s = G.T(u.t, u.u).s; types[s] = (types[s] || 0) + 1; }
      const str = gl.reduce((s, u) => s + u.str, 0) / gl.length;
      const org = gl.reduce((s, u) => s + u.org / G.unitStats(u).org, 0) / gl.length;
      const moving = gl.filter((u) => u.path.length).length;
      const name = loc < NP ? G.pname(loc) : 'Denizde';
      gh += `<button class="item" data-act="selgroup" data-v="${loc}"><div class="grow"><div class="t">${esc(name)}</div><div class="d">${Object.entries(types).map(([k, n]) => `${n} ${k}`).join(' · ')}${moving ? ` · ${moving} hareket hâlinde` : ''}</div><div class="row" style="gap:6px"><div class="grow">${bar(str, 'g')}</div><div class="grow">${bar(org)}</div></div></div><span class="muted">›</span></button>`;
    }
    html += sec('Konuşlanma', gh + '</div>', `${rows.length} konum · yeşil güç, sarı moral`);
    return { title: 'Ordu', html };
  };

  // Tümen ayrıntısı (HOI4 tümen penceresi)
  function divisionView(c, id) {
    const st = G.st, u = st.units.find((x) => x.id === id);
    if (!u) { UI.sub = null; return PANELS.army(); }
    const s2 = G.unitStats(u), t = s2.t;
    const a = u.army ? G.armyById(c, u.army) : null;
    const gen = G.genOf(u);
    const sup = G.supplyMul(u);
    const state = u.sr ? 'Stratejik konuşlanma' : G.inBattle && G.inBattle.has(u) ? 'Muharebede' : u.ret ? 'Geri çekiliyor' : u.path.length ? `${G.pname(u.path[u.path.length - 1])} yönünde ilerliyor` : 'Mevzide';
    const xl = G.xpName(u.xp);
    let html = G.art.img(G.art.unitOf(u), 'artbanner') + `<div class="row" style="gap:10px;align-items:center"><canvas class="nato" data-k="${R.kindOf(u)}" data-c="${R.ccolor(u.t)}" width="44" height="30"></canvas><div class="grow"><div class="t"><b>${esc(t.n)}</b>${u.vol ? ` <span class="pill ally">Gönüllü (${esc(G.cname(u.vol))})</span>` : ''}</div><div class="muted small">${u.loc < NP ? esc(G.pname(u.loc)) : 'Denizde'} · ${state}</div></div></div>`;
    html += kv([['Güç', pct(u.str), u.str < 0.5 ? 'bad' : ''], ['Moral', `${Math.round(Math.max(0, u.org))}/${Math.round(s2.org)}`, u.org < s2.org * 0.3 ? 'bad' : ''], ['Tecrübe', xl], ['Yumuşak saldırı', r1(s2.sa)], ['Sert saldırı', r1(s2.ha)], ['Savunma', r1(s2.df)], ['Atılım', r1(s2.bt)], ['Sertlik', pct(s2.hd)], ['Zırh', Math.round(s2.arm)], ['Zırh delme', Math.round(s2.prc)], ['Genişlik', t.w], ['Hız', r1(s2.spd / 2.4) + ' km/s'], ['Siper', pct(u.ent || 0)], ['İkmal', pct(G.supplyRatio(u)), G.supplyRatio(u) < 0.8 ? 'bad' : ''], ['İkmal kullanımı', r1(G.supplyUse(u))]]);
    html += `<div class="row" style="gap:8px;align-items:center"><span class="small">Tecrübe</span><div class="grow">${bar(u.xp ?? 0.25)}</div></div><div class="small muted" style="margin-top:-6px">${G.XP_LV.map(([, n]) => n === xl ? `<b style="color:var(--paper)">${n}</b>` : n).join(' › ')}</div>`;
    html += sec('Komuta', `<div class="small">${a ? `${esc(a.n)}${gen ? ' · ' + esc(gen.n) : ''}` : 'Ordusuz'}${u.auto ? ' · otomatik kurmay' : ''}</div><div class="small muted">Teçhizat modelleri: piyade ${g.MODEL_N?.inf?.[Math.floor(u.lv?.inf || 1)] || 'Model ' + r1(u.lv?.inf || 1)}${t.eq.art ? ' · topçu ' + (g.MODEL_N?.art?.[Math.floor(u.lv?.art || 1)] || r1(u.lv?.art || 1)) : ''}${t.eq.tank ? ' · tank ' + (g.MODEL_N?.tank?.[Math.floor(u.lv?.tank || 1)] || r1(u.lv?.tank || 1)) : ''}</div>`);
    html += `<div class="btns"><button class="btn sm" data-act="divonly" data-v="${u.id}">Yalnız bunu seç</button><button class="btn sm" data-act="divrm" data-v="${u.id}">Seçimden çıkar</button>${(c.armies || []).length ? `<button class="btn sm" data-act="divarmy" data-v="${u.id}">Ordusu: ${a ? esc(a.n) : 'yok'} ›</button>` : ''}</div>`;
    html += `<p class="muted small" style="margin:0">Düşmana verilen vuruş, düşmanın sertliğine göre yumuşak ve sert saldırıdan oluşur (sertlik = zırhlı araç oranı). Savunurken savunma, saldırırken atılım gelen vuruşları karşılar: karşılanan vuruşların yalnızca %10'u, fazlası ise %40 oranında hasar verir. Zırh, düşmanın zırh delmesinden yüksekse alınan hasar yarıya kadar düşer. Tecrübe muharebede kazanılır; takviye gelen acemi askerler tecrübeyi düşürür.</p>`;
    return { title: 'Tümen', html };
  }
  function armyDivisions(c, id) {
    const a = G.armyById(c, id); if (!a) { UI.sub = null; return PANELS.army(); }
    const us = G.armyUnits(c, id);
    let html = `<div class="list">`;
    for (const u of us) {
      const s2 = G.unitStats(u);
      html += `<button class="item" data-act="divinfo" data-v="${u.id}">${G.art.img(G.art.unitOf(u), 'artthumb')}<div class="grow"><div class="t">${esc(s2.t.n)} <span class="muted small">${u.vol ? 'Gönüllü (' + esc(G.cname(u.vol)) + ') · ' : ''}${u.loc < NP ? esc(G.pname(u.loc)) : 'Denizde'} · ${G.xpName(u.xp)}</span></div><div class="row" style="gap:6px"><div class="grow">${bar(u.str, 'g')}</div><div class="grow">${bar(Math.max(0, u.org) / s2.org)}</div></div></div><span class="muted">›</span></button>`;
    }
    return { title: `${a.n} · ${us.length} tümen`, html: html + '</div>' };
  }
  // Muharebe ekranı (HOI4 muharebe penceresi)
  PANELS.battle = () => {
    const st = G.st, n = UI.battleN;
    const b = (G.battles || []).find((x) => x.n === n);
    if (!b) return { title: 'Muharebe', html: `<p class="muted">${n >= 0 ? esc(G.pname(n)) : ''}: muharebe sona erdi.</p>` };
    const te = g.TERRAIN[P[n].te];
    const side = (tag, L, used, isAtt) => {
      const gen = L[0] ? G.genOf(L[0]) : null;
      const usedSet = new Set(used);
      const w = used.reduce((s2, u) => s2 + (u._s?.t.w || 15), 0);
      let h = `<div class="bside"><div class="row" style="gap:6px;align-items:center">${G.flag(tag, 24, 16)}<b>${esc(G.cname(tag))}</b></div><div class="small muted">${isAtt ? 'Saldıran' : 'Savunan'} · ${gen ? esc(gen.n) : 'komutan yok'}</div><div class="small">Cephede ${used.length} tümen (genişlik ${w}/${b.width}) · yedek ${L.length - used.length}</div><div class="bdivs">`;
      for (const u of L.slice(0, 24)) { const s2 = u._s || G.unitStats(u); h += `<div class="bdiv ${usedSet.has(u) ? '' : 'res'}"><span>${s2.t.s}</span>${bar(u.str, 'g')}${bar(Math.max(0, u.org) / s2.org)}</div>`; }
      return h + '</div></div>';
    };
    const mine = b.att === st.player || G.sameFaction(b.att, st.player);
    const theirs = b.def === st.player || G.sameFaction(b.def, st.player);
    const neutral = !mine && !theirs;
    const adv = mine || neutral ? b.adv : 1 - b.adv;
    const mods = [];
    if (te.atk) mods.push([`Arazi: ${te.n}`, `saldırı ${te.atk > 0 ? '+' : ''}${Math.round(te.atk * 100)}%`]);
    if (b.fort) mods.push(['Tahkimat', `savunma +${b.fort * 15}%`]);
    const ent = b.D.reduce((s2, u) => s2 + (u.ent || 0), 0) / Math.max(1, b.D.length);
    if (ent > 0.05) mods.push(['Siper', `savunma +${Math.round(ent * 25)}%`]);
    if (b.amph) mods.push(['Deniz çıkarması', 'saldırı cezası']);
    const pc = st.C[b.att]; const ar = b.A[0]?.army && b.att === st.player ? G.armyById(pc, b.A[0].army) : null;
    if (ar && ar.plan > 0.005) mods.push(['Planlama bonusu', `saldırı +${Math.round(ar.plan * 100)}%`]);
    if (b.aAir !== 1) mods.push(['Saldıran hava gücü', `${b.aAir > 1 ? '+' : ''}${Math.round((b.aAir - 1) * 100)}%`]);
    if (b.dAir !== 1) mods.push(['Savunan hava gücü', `${b.dAir > 1 ? '+' : ''}${Math.round((b.dAir - 1) * 100)}%`]);
    if (b.riv > 0.004) { mods.push(['Nehir geçişi (saldıran)', `saldırı −%${Math.round(b.riv * 100)}`]); if (G.RIVER_DEF * b.riv >= 0.005) mods.push(['Nehir (savunan)', `savunma +%${Math.round(G.RIVER_DEF * b.riv * 100)}`]); }
    if (b.dirs > 1) mods.push([`Kuşatma (${b.dirs} yönden)`, `cephe genişliği +%${Math.min(2, b.dirs - 1) * 50}`]);
    mods.push(['Sertlik (saldıran / savunan)', `%${Math.round((b.hdA || 0) * 100)} / %${Math.round((b.hdD || 0) * 100)}`]);
    const armBlock = (L, prc) => { const k = L.filter((u) => u._s && u._s.arm > prc).length; if (!k) return 0; const f = L.filter((u) => u._s && u._s.arm > prc).reduce((s2, u) => s2 + Math.max(0.5, prc / u._s.arm), 0) / k; return { k, f }; };
    const aB = armBlock(b.A, b.prcD || 0), dB = armBlock(b.D, b.prcA || 0);
    if (aB) mods.push([`Delinemeyen zırh (saldıran, ${aB.k} tümen)`, `alınan hasar −%${Math.round((1 - aB.f) * 100)}`]);
    if (dB) mods.push([`Delinemeyen zırh (savunan, ${dB.k} tümen)`, `alınan hasar −%${Math.round((1 - dB.f) * 100)}`]);
    if (b.hmA && b.hmA !== 1) mods.push(['Tarihî akış dengesi (saldıran)', `${b.hmA > 1 ? '+' : '−'}%${Math.round(Math.abs(b.hmA - 1) * 100)}`]);
    if (b.hmD && b.hmD !== 1) mods.push(['Tarihî akış dengesi (savunan)', `${b.hmD > 1 ? '+' : '−'}%${Math.round(Math.abs(b.hmD - 1) * 100)}`]);
    if (G.wx.snow[n] > 0.3 || G.wx.mud[n] > 0.3) mods.push([`Hava: ${G.weatherName(n)}`, `saldırı −%${Math.round((1 - G.wxAtk(n)) * 100)}`]);
    // muharebe sahnesi: iki tarafın baskın tümen türü, arazi ve nehir
    const domK = (L) => { const k = {}; for (const u of L) { const x = G.art.kindOf(u); k[x] = (k[x] || 0) + 1; } return Object.entries(k).sort((a2, b2) => b2[1] - a2[1])[0]?.[0] || 'inf'; };
    const aK = domK(b.A.length ? b.A : b.atts), dK = domK(b.D.length ? b.D : b.defs);
    let html = G.art.img(G.art.battle(b.att, aK, aK === 'arm' ? G.art.tankLvl(st.C[b.att]) : 1, b.def, dK, dK === 'arm' ? G.art.tankLvl(st.C[b.def]) : 1, te.id, b.riv > 0.004), 'artbanner');
    html += `<div class="small muted">${esc(G.pname(n))} · ${te.n} · cephe genişliği ${b.width}</div>`;
    html += `<div class="row" style="gap:8px;align-items:center"><b class="${neutral ? 'warn' : adv > 0.55 ? 'good' : adv < 0.45 ? 'bad' : 'warn'}">${neutral ? (adv > 0.6 ? 'Saldıran önde' : adv < 0.4 ? 'Savunan önde' : 'Denge') : adv > 0.6 ? 'Kazanıyoruz' : adv < 0.4 ? 'Kaybediyoruz' : 'Denge'}</b><div class="grow">${bar(adv, adv > 0.55 ? 'g' : adv < 0.45 ? 'r' : '')}</div><span class="small">%${Math.round(adv * 100)}</span></div>`;
    html += `<div class="bgrid">${side(b.att, b.atts, b.A, true)}${side(b.def, b.defs, b.D, false)}</div>`;
    if (b.tac && b.tac.ta) {
      const T = g.TACTICS, tc = b.tac;
      const card = (k, side, lost, win) => { const t = T[k]; return `<div class="tac ${lost ? 'lost' : ''} ${win ? 'win' : ''}"><small>${side}</small><b>${esc(t.n)}</b>${win ? '<span class="pill ally">Sayaç!</span>' : lost ? '<span class="pill war">Sayaçlandı</span>' : ''}<span class="d">${esc(t.d)}</span></div>`; };
      let th = `<div class="tacs">${card(tc.ta, 'Saldıran', tc.cnt === 'd', tc.cnt === 'a')}${card(tc.td, 'Savunan', tc.cnt === 'a', tc.cnt === 'd')}</div>`;
      th += `<div class="small muted">Evre: <b>${G.PHASES[tc.phase] || 'Normal'}</b> · komutan taktik becerisi ${tc.sa} / ${tc.sd} · hasar çarpanı saldıran ×${tc.mA.toFixed(2)}, savunan ×${tc.mD.toFixed(2)}</div>`;
      if (tc.hist.length > 1) th += `<div class="small muted">Önceki: ${tc.hist.slice(1).map(([a, d, c2]) => `${esc(T[a].n)} / ${esc(T[d].n)}${c2 ? ' ✓' : ''}`).join(' · ')}</div>`;
      html += sec('Taktikler', th);
    }
    html += sec('Etkenler', mods.length ? `<div class="mods">${mods.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Özel etken yok.</p>');
    html += `<p class="muted small" style="margin:0">Günlük vuruş: saldıran ${r1(b.hitD)} · savunan ${r1(b.hitA)}. Moral ve gücü biten tümenler geri çekilir; çekilecek yeri kalmayan tümenler imha olur.</p>`;
    return { title: 'Muharebe', html };
  };

  function generalList(c) {
    let html = `<p class="muted small" style="margin:0">Komutanlar muharebede tecrübe kazanır, seviye atlar ve yeni özellikler edinir. Saldırı (S) ve savunma (Sv) muharebe gücünü, planlama (P) muharebenin ilk günlerini ve siperi, lojistik (L) ikmali etkiler.</p><div class="list">`;
    for (const gen of c.gens) {
      const a = (c.armies || []).find((x) => x.gen === gen.id);
      const grp = (c.armies || []).filter((x) => x.grp === gen.id);
      html += `<div class="item">${G.art.genImg(gen, c.tag, 'portrait-m')}<div class="grow"><div class="t">${genLine(gen)}</div>${genSkills(gen)}<div class="d">${a ? esc(a.n) + ' komutanı' : 'Görevsiz'}${grp.length ? ` · ordu grubu: ${grp.map((x) => esc(x.n)).join(', ')}` : ''} · tecrübe ${Math.round(gen.xp)}/${40 * gen.lvl}</div><div class="btns" style="margin-top:4px">${gen.fm ? '' : `<button class="btn sm" data-act="genfm" data-v="${gen.id}" ${gen.lvl >= 3 && (c.cp || 0) >= 40 ? '' : 'disabled'}>Mareşal yap · 40 KG${gen.lvl < 3 ? ' (3. seviye gerekir)' : ''}</button>`}<button class="btn sm" data-act="sub" data-v="gtr:${gen.id}" ${gen.tr.length < 4 ? '' : 'disabled'}>Özellik eğitimi · 50 KG</button></div></div></div>`;
    }
    html += `</div><button class="btn pri" data-act="newgen" ${c.pp >= 50 ? '' : 'disabled'}>Yeni komutan ata (50 SG)</button><p class="muted small">Komuta gücü: ${int(c.cp || 0)}/${G.CP_MAX} (+${G.cpRate(c).toFixed(2)}/gün). Mareşaller ordu grubu yönetir: bağlı ordulara saldırı ve savunma becerisi başına +%2 verir ve komuta gücü kazancını artırır.</p>`;
    return { title: 'Komutanlar', html };
  }
  function groupPicker(c, armyId) {
    const a = G.armyById(c, armyId); if (!a) { UI.sub = null; return PANELS.army(); }
    const fms = c.gens.filter((x) => x.fm);
    let html = `<p class="muted small" style="margin:0">${esc(a.n)} için ordu grubu mareşali seç. Bir mareşal en çok 4 ordu yönetir; bağlı ordular mareşalin saldırı ve savunma becerisinin her puanı için +%2 alır.</p><div class="list">`;
    html += `<button class="item" data-act="setgrp" data-k="${a.id}" data-v="0"><div class="grow"><div class="t">Ordu grubu yok</div></div></button>`;
    for (const fm of fms) { const n = (c.armies || []).filter((x) => x.grp === fm.id).length; html += `<button class="item ${a.grp === fm.id ? 'active' : ''}" data-act="setgrp" data-k="${a.id}" data-v="${fm.id}"><div class="grow"><div class="t">${genLine(fm)}</div>${genSkills(fm)}<div class="d">${n}/4 ordu</div></div></button>`; }
    if (!fms.length) html += '<p class="muted">Mareşalin yok. Komutanlar listesinden bir generali mareşalliğe terfi ettir.</p>';
    return { title: 'Ordu grubu', html: html + '</div>' };
  }
  function traitPicker(c, genId) {
    const gen = G.genById(c, genId); if (!gen) { UI.sub = 'gens'; return generalList(c); }
    let html = `<p class="muted small" style="margin:0">${esc(gen.n)} için eğitim seç (50 komuta gücü). Şu an ${int(c.cp || 0)} KG.</p><div class="list">`;
    for (const [k, T] of Object.entries(g.GEN_TRAITS)) { if (k === 'brilliant' || gen.tr.includes(k)) continue; html += `<button class="item" data-act="gentr" data-k="${gen.id}" data-v="${k}" ${(c.cp || 0) >= 50 ? '' : 'disabled'}><div class="grow"><div class="t">${esc(T.n)}</div><div class="d">${esc(T.d)}</div></div></button>`; }
    return { title: 'Komutan eğitimi', html: html + '</div>' };
  }
  function generalPicker(c, armyId) {
    const a = G.armyById(c, armyId);
    let html = `<p class="muted small" style="margin:0">${esc(a.n)} için komutan seç. Bir general en iyi 24 tümene kadar komuta eder; mareşaller büyük ordularda da tam etki gösterir.</p><div class="list">`;
    const sorted = c.gens.slice().sort((x, y) => (y.atk + y.def + y.plan + y.log) - (x.atk + x.def + x.plan + x.log));
    for (const gen of sorted) {
      const other = (c.armies || []).find((x) => x.gen === gen.id && x.id !== armyId);
      html += `<button class="item ${a.gen === gen.id ? 'active' : ''}" data-act="setgen" data-k="${armyId}" data-v="${gen.id}">${G.art.genImg(gen, c.tag)}<div class="grow"><div class="t">${genLine(gen)}</div>${genSkills(gen)}${other ? `<div class="d warn">Şu an ${esc(other.n)} komutanı</div>` : ''}</div></button>`;
    }
    return { title: 'Komutan seç', html: html + '</div>' };
  }
  function templateDesigner(c, id) {
    const tpl = G.templatesOf(c)[id];
    if (!tpl) { UI.sub = null; return PANELS.army(); }
    const t = G.T(c.tag, id);
    const nb = Object.values(tpl.b).reduce((a, b) => a + b, 0);
    const ns = Object.values(tpl.s || {}).filter(Boolean).length;
    let html = G.art.img(G.art.tplOf(c, tpl), 'artbanner') + `<label class="field"><span>Şablon adı</span><input id="tpl-name" data-tpl="${id}" value="${esc(tpl.n)}" maxlength="28"></label>`;
    html += kv([['Yumuşak saldırı', r1(t.sa)], ['Sert saldırı', r1(t.ha)], ['Savunma', r1(t.df)], ['Atılım', r1(t.bt)], ['Sertlik', pct(t.hd)], ['Moral', Math.round(t.org)], ['Hız', t.spd], ['Zırh', Math.round(t.arm)], ['Zırh delme', Math.round(t.prc)], ['Genişlik', t.w], ['Asker', t.mp + 'K'], ['Eğitim', t.days + ' gün']]);
    html += `<p class="muted small" style="margin:0">Teçhizat: ${Object.entries(t.eq).map(([e, n]) => `${Math.round(n)} ${g.EQUIP[e].s.toLowerCase()}`).join(', ')}. Muharebe genişliği arazinin kaldırabileceği tümen sayısını belirler (ovada 80).</p>`;
    let bh = '<div class="list">';
    for (const [k, b] of Object.entries(g.BATS)) {
      const locked = b.req && !c.tech[b.req];
      const n = tpl.b[k] || 0;
      bh += `<div class="item ${locked ? 'locked' : ''}"><div class="grow"><div class="t">${b.n}</div><div class="d">Yum. ${b.sa} · Sert ${b.ha} · Sv ${b.df} · Atl ${b.bt} · Moral ${b.org} · Hız ${b.spd} · G ${b.w}${b.ap ? ' · Zırh ' + b.ap : ''}${b.hd ? ' · Sertlik %' + Math.round(b.hd * 100) : ''}${locked ? ' · teknoloji gerekli' : ''}</div></div><div class="stepper"><button data-act="tplb" data-k="${id}" data-e="${k}" data-v="-1" ${n ? '' : 'disabled'}>−</button><b>${n}</b><button data-act="tplb" data-k="${id}" data-e="${k}" data-v="1" ${locked || nb >= g.MAX_BATS ? 'disabled' : ''}>+</button></div></div>`;
    }
    html += sec('Muharebe taburları', bh + '</div>', `${nb}/${g.MAX_BATS}`);
    let sh = '<div class="list">';
    for (const [k, s] of Object.entries(g.SUPPORTS)) {
      const locked = s.req && !c.tech[s.req];
      const on = !!(tpl.s || {})[k];
      sh += `<button class="toggle ${on ? 'on' : ''}" data-act="tpls" data-k="${id}" data-v="${k}" ${locked || (!on && ns >= g.MAX_SUP) ? 'disabled' : ''} style="${locked ? 'opacity:.45' : ''}"><span><b>${s.n}</b><br><span class="muted small">${s.d}${locked ? ' · teknoloji gerekli' : ''}</span></span><i></i></button>`;
    }
    html += sec('Destek bölükleri', sh + '</div>', `${ns}/${g.MAX_SUP}`);
    if (!g.DEFAULT_TEMPLATES[id]) html += `<button class="btn danger" data-act="tpldel" data-v="${id}">Şablonu sil</button>`;
    html += '<p class="muted small" style="margin:0">Değişiklikler hemen geçerlidir. Mevcut tümenler yeni teçhizat ihtiyacını takviye ile tamamlar.</p>';
    return { title: 'Tümen tasarımcısı', html };
  }

})(window);
