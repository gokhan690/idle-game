// Meydan okumalar: oyuncunun oyun başında isteğe bağlı seçtiği tarihî hedefler (ör. "Paris'i 1940 sonundan önce al").
// Seçilmezse (st.chal yok) hiçbir şey yapmaz; seçilirse aylık başarım denetiminde ilerler: başarı ya da başarısızlık
// st.chal.s'ye (1 / -1) yazılır ve G.onChal ile arayüze bildirilir. Çok oyunculu oyunda kullanılmaz.
(function (g) {
  const G = g.G;
  const idxOf = {};
  const prov = (name) => { if (idxOf[name] === undefined) idxOf[name] = G.P.findIndex((p) => p.n === name); return idxOf[name]; };
  const held = (tag, name) => { const i = prov(name); return i >= 0 && G.st.prov[i].c === tag; };
  const alive = (tag) => !!(G.st.C[tag] && G.st.C[tag].alive);
  const capHeld = (c) => c.cap >= 0 && G.st.prov[c.cap].c === c.tag;
  const fab = (c) => (c.sum.civ || 0) + (c.sum.mil || 0);
  // by: bu tarihten önce ok() gerçekleşmeli · hold: bu tarihe dek fail() hiç gerçekleşmemeli
  G.CHAL = [
    { id: 'ger_blitz', t: ['GER'], n: 'Yıldırım Harbi', d: 'Paris\'i 31 Aralık 1940\'tan önce ele geçir.', by: '1940-12-31', ok: () => held('GER', 'Paris') },
    { id: 'ger_moscow', t: ['GER'], n: 'Tayfun Harekâtı', d: 'Moskova\'yı 1942 sonundan önce ele geçir.', by: '1942-12-31', ok: () => held('GER', 'Moskova') },
    { id: 'sov_berlin', t: ['SOV'], n: 'Berlin\'e!', d: 'Berlin\'i 8 Mayıs 1945\'ten önce ele geçir.', by: '1945-05-08', ok: () => held('SOV', 'Berlin') },
    { id: 'sov_hold', t: ['SOV'], n: 'Bir Adım Geri Yok', d: 'Moskova, Leningrad ve Stalingrad 1944\'e dek hiç düşmesin.', hold: '1944-01-01', fail: () => !held('SOV', 'Moskova') || !held('SOV', 'Leningrad') || !held('SOV', 'Stalingrad') },
    { id: 'eng_never', t: ['ENG'], n: 'Asla Teslim Olmayacağız', d: 'Londra 1945 sonuna dek düşmesin.', hold: '1945-12-31', fail: () => !held('ENG', 'Londra') },
    { id: 'eng_suez', t: ['ENG'], n: 'İmparatorluğun Can Damarı', d: 'Kahire ve Süveyş 1943\'e dek elinde kalsın.', hold: '1943-01-01', fail: () => !held('ENG', 'Kahire') || !held('ENG', 'Süveyş') },
    { id: 'fra_stand', t: ['FRA'], n: 'Geçemeyecekler', d: 'Paris 1941\'e dek düşmesin.', hold: '1941-01-01', fail: () => !held('FRA', 'Paris') },
    { id: 'pol_stand', t: ['POL'], n: 'Polonya Henüz Ölmedi', d: 'Varşova 1 Temmuz 1940\'a dek düşmesin.', hold: '1940-07-01', fail: () => !held('POL', 'Varşova') },
    { id: 'ita_mare', t: ['ITA'], n: 'Mare Nostrum', d: 'Malta ve İskenderiye\'yi 1942 sonundan önce ele geçir.', by: '1942-12-31', ok: () => held('ITA', 'Malta') && held('ITA', 'İskenderiye') },
    { id: 'jap_china', t: ['JAP'], n: 'Çin Seferi', d: 'Nanking ve Chongqing\'i 1941 sonundan önce ele geçir.', by: '1941-12-31', ok: () => held('JAP', 'Nanking') && held('JAP', 'Chongqing') },
    { id: 'jap_south', t: ['JAP'], n: 'Güney Kaynak Bölgesi', d: 'Singapur ve Manila\'yı 1 Temmuz 1942\'den önce ele geçir.', by: '1942-07-01', ok: () => held('JAP', 'Singapur') && held('JAP', 'Manila') },
    { id: 'usa_tokyo', t: ['USA'], n: 'Pasifik\'te Zafer', d: 'Japonya\'yı 2 Eylül 1945\'ten önce teslim al ya da Tokyo\'yu ele geçir.', by: '1945-09-02', ok: () => held('USA', 'Tokyo') || !alive('JAP') },
    { id: 'chi_hold', t: ['CHI'], n: 'Direniş Savaşı', d: 'Chongqing 1945\'e dek düşmesin.', hold: '1945-01-01', fail: () => !held('CHI', 'Chongqing') },
    { id: 'tur_neutral', t: ['TUR'], n: 'Millî Şef\'in Dengesi', d: '1945\'e dek hiçbir savaşa girme ve istikrarı %50\'nin üstünde tut.', hold: '1945-01-01', fail: (c) => c.enemies.length > 0 || (c.stab ?? 0.5) < 0.5 },
    { id: 'tur_power', t: ['TUR'], n: 'Sanayi Hamlesi', d: '1942 sonundan önce 40 fabrikaya (sivil + askerî) ulaş.', by: '1942-12-31', ok: (c) => fab(c) >= 40 },
    { id: 'any_survive', t: '*', n: 'Ayakta Kal', d: '1945\'e dek ülkeni ve başkentini koru.', hold: '1945-01-01', fail: (c) => !capHeld(c) },
    { id: 'any_ind', t: '*', n: 'Sanayileşme', d: 'Başlangıçtaki fabrika sayını 1942 sonundan önce iki katına çıkar.', by: '1942-12-31', ok: (c, ch) => fab(c) >= Math.max(4, ch.f0 * 2) },
    { id: 'any_conquer', t: '*', n: 'Toprak Genişlemesi', d: 'Başlangıçtaki eyalet sayını 1944 sonundan önce iki katına çıkar.', by: '1944-12-31', ok: (c, ch) => (c.sum.provs || 0) >= Math.max(6, ch.p0 * 2) },
  ];
  G.chalById = (id) => G.CHAL.find((x) => x.id === id);
  // ülkeye ve başlangıç gününe uygun meydan okumalar (ülkeye özgüler önce)
  G.chalFor = (tag, day) => G.CHAL.filter((x) => (x.t === '*' || x.t.includes(tag)) && G.dayOf(x.by || x.hold) > (day || 0) + 60).sort((a, b) => (a.t === '*') - (b.t === '*'));
  // seç: başlangıç değerleri kaydedilir; ilk anda geçersizse (zaten olmuş ya da başarısız) reddedilir
  G.chalStart = (id) => {
    const st = G.st, c = st.C[st.player], x = G.chalById(id);
    if (!c || !x) return { ok: false, why: 'Bilinmeyen meydan okuma' };
    const ch = { id, s: 0, t0: st.day, f0: fab(c), p0: c.sum.provs || 0 };
    if (x.by && x.ok(c, ch)) return { ok: false, why: 'Bu hedef bu başlangıçta zaten gerçekleşmiş.' };
    if (x.hold && x.fail(c, ch)) return { ok: false, why: 'Bu hedef bu başlangıçta zaten tutmuyor.' };
    st.chal = ch;
    return { ok: true };
  };
  // aylık denetim (G.achCheck içinden)
  G.chalCheck = () => {
    const st = G.st, ch = st.chal;
    if (!ch || ch.s || st.humans) return;
    const c = st.C[st.player], x = G.chalById(ch.id); if (!c || !x) return;
    let r = 0;
    if (!c.alive) r = -1;
    else if (x.by) r = x.ok(c, ch) ? 1 : st.day > G.dayOf(x.by) ? -1 : 0;
    else if (x.hold) r = x.fail(c, ch) ? -1 : st.day >= G.dayOf(x.hold) ? 1 : 0;
    if (!r) return;
    ch.s = r; ch.at = st.day;
    G.log(`Meydan okuma ${r > 0 ? 'başarıldı' : 'kaybedildi'}: ${x.n}`, [c.tag], r > 0 ? 'good' : 'bad');
    if (G.onChal) G.onChal(x, r);
  };
})(window);
