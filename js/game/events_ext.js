// Ek tarihî olaylar ve dünya haberleri (HOI4).
// - Dünya haberleri: yapay zekâ ülkelerinin büyük tarihî hamleleri oyuncuya haber penceresi olarak gelir.
// - Türkiye olay zinciri: Hatay, Üçlü İttifak, Türk-Alman paktı, Varlık Vergisi, Adana ve Kahire görüşmeleri, 1945 savaş ilanı.
// - Orta Doğu: Irak'ta Reşid Ali darbesi ve İngiliz-Sovyet İran harekâtı (1941).
(function (g) {
  const G = g.G;
  const { P, NP } = G;
  const alive = (t) => G.st.C[t]?.alive;
  const ai = (t) => t !== G.st.player;
  const rel = (a, b, v) => { const st = G.st; st.rel = st.rel || {}; st.rel[a + '>' + b] = Math.max(-100, Math.min(100, (st.rel[a + '>' + b] || 0) + v)); };

  // ---------- Dünya haberleri ----------
  G.newsOn = true;
  const NEWS = {
    axis: ['Roma-Berlin Mihveri', 'Mussolini ile Hitler arasındaki anlaşma Avrupa\'nın ortasında yeni bir güç ekseni yarattı.'],
    china: ['Marco Polo Köprüsü', 'Pekin yakınlarındaki çatışma topyekûn bir savaşa dönüştü: Japonya Çin\'e saldırdı.'],
    anschluss: ['Anschluss', 'Alman birlikleri Avusturya\'ya girdi. Viyana Reich\'a bağlandı.'],
    sudeten: ['Münih Anlaşması', 'Chamberlain "çağımız için barış" diyor: Südetler Almanya\'ya bırakıldı.'],
    czeend: ['Prag Düştü', 'Alman birlikleri Prag\'a girdi; Çekoslovakya haritadan silindi.'],
    albania: ['Arnavutluk İşgali', 'İtalyan birlikleri Arnavutluk\'a çıktı; Kral Zogu ülkeden kaçtı.'],
    mr: ['Molotov-Ribbentrop Paktı', 'Dünya şaşkın: Nazi Almanyası ile Sovyetler Birliği saldırmazlık paktı imzaladı.'],
    poland: ['Savaş!', 'Alman orduları Polonya sınırını geçti. İngiltere ve Fransa\'nın tavrı merak ediliyor.'],
    winter: ['Kış Savaşı', 'Kızıl Ordu Finlandiya\'ya saldırdı. Finliler karlı ormanlarda direniyor.'],
    weser: ['Weserübung', 'Almanya Danimarka ve Norveç\'e saldırdı.'],
    gelb: ['Batı Taarruzu', 'Alman zırhlıları Ardenler\'den Fransa\'ya akıyor.'],
    itajoin: ['İtalya Savaşta', 'Mussolini Fransa ve İngiltere\'ye savaş ilan etti.'],
    tripartite: ['Üçlü Pakt', 'Almanya, İtalya ve Japonya Berlin\'de ittifak antlaşması imzaladı.'],
    barbarossa: ['Barbarossa', 'Üç milyon Alman askeri Sovyet sınırını geçti. Tarihin en büyük kara harekâtı başladı.'],
    pearl: ['Pearl Harbor', 'Japon uçakları Pasifik Filosu\'nu vurdu. Amerika savaşa giriyor.'],
    midway: ['Midway', 'Pasifik\'te dönüm noktası: Japonya dört uçak gemisini kaybetti.'],
    husky: ['Sicilya Çıkarması', 'Müttefikler Avrupa\'ya ilk adımı attı: Sicilya\'ya çıkarma.'],
    overlord: ['D-Günü', 'Müttefik orduları Normandiya kıyılarına çıktı.'],
    achse: ['İtalya Teslim Oldu', 'İtalya ateşkes imzaladı; Alman birlikleri yarımadayı işgal ediyor.'],
    madrid: ['Madrid Düştü', 'İspanya İç Savaşı sona erdi: Franco zaferini ilan etti.'],
    augstorm: ['Ağustos Fırtınası', 'Sovyetler Birliği Japonya\'ya savaş ilan etti ve Mançurya\'ya girdi.'],
    jsurrender: ['Japonya Teslim Oldu', 'Hiroşima ve Nagazaki\'den sonra İmparator teslimiyeti kabul etti. İkinci Dünya Savaşı sona erdi.'],
    iraq: ['Irak Darbesi', 'Reşid Ali yönetimi İngiltere\'ye karşı ayaklandı; İngiliz birlikleri Irak\'a giriyor.'],
    iran: ['İran İşgali', 'İngiliz ve Sovyet birlikleri İran\'a girdi; Rıza Şah tahttan çekiliyor.'],
  };
  G.newsFor = (e) => {
    const st = G.st, nw = NEWS[e.id];
    if (!nw || !G.newsOn || !st.player || e.actor === st.player) return;
    if (st._newsDay === st.day) return; // aynı gün birden çok haber penceresi açma
    st._newsDay = st.day;
    G.queuePopup({ eyebrow: 'Dünya haberleri · ' + G.fmtDate(st.day), title: nw[0], text: nw[1], opts: [{ n: 'İlginç', fx: () => {} }] });
  };

  // ---------- Türkiye ----------
  const bop = (v) => { if (G.bopShift && G.st.C.TUR) G.bopShift(G.st.C.TUR, v, 'olay'); };
  const tur = () => G.st.C.TUR;
  const EXT = [
    { id: 'hatay', date: '1939-06-29', actor: 'TUR', title: 'Hatay Türkiye\'ye Katılıyor',
      text: 'Hatay Meclisi Türkiye\'ye katılma kararı aldı. Fransa, Türkiye\'nin olası bir savaşta tarafsız kalması karşılığında itiraz etmiyor.',
      cond: () => alive('TUR') && !G.st.ev.hatayDone && !(alive('FRA') && G.atWar('TUR', 'FRA')),
      opts: [{ n: 'Hatay\'ı anavatana kat', fx: () => {
        const c = tur(); G.st.ev.hatayDone = 1;
        // haritada Hatay ayrı il değilse (Halep eyaleti içinde) toprak yerine siyasi kazanım
        if (alive('FRA') && G.FX && g.FOCUS_REGIONS?.hatay) { let has = false; for (let i = 0; i < NP; i++) if (G.st.prov[i].o === 'FRA' && g.FOCUS_REGIONS.hatay(P[i])) has = true; if (has) G.FX.demand(c, 'FRA', 'hatay'); }
        c.stabX += 0.05; c.wsX += 0.03; c.pp += 50; if (alive('FRA')) rel('FRA', 'TUR', -10);
        G.log('Hatay Türkiye\'ye katıldı: istikrar +%5, savaş desteği +%3, +50 siyasi güç.', ['TUR', 'FRA'], 'major');
      } }, { n: 'Fransa ile ilişkileri bozma', fx: () => { const c = tur(); G.st.ev.hatayDone = 1; if (alive('FRA')) rel('FRA', 'TUR', 15); c.stabX -= 0.03; } }] },
    { id: 'ucluittifak', date: '1939-10-19', actor: 'TUR', title: 'Üçlü İttifak Antlaşması',
      text: 'İngiltere ve Fransa, Akdeniz\'de bir saldırı olursa karşılıklı yardım öngören bir antlaşma öneriyor. Türkiye\'ye silah ve kredi verilecek.',
      cond: () => alive('TUR') && alive('ENG') && !tur().fac && !tur().enemies.length && G.atWar('ENG', 'GER'),
      opts: [{ n: 'Antlaşmayı imzala', fx: () => { const c = tur(); rel('ENG', 'TUR', 25); if (alive('FRA')) rel('FRA', 'TUR', 20); c.stock.inf = (c.stock.inf || 0) + 1500; c.stock.art = (c.stock.art || 0) + 40; c.stock.fig = (c.stock.fig || 0) + 30; G.log('Üçlü İttifak Antlaşması imzalandı: İngiliz silah ve uçak yardımı.', ['TUR', 'ENG'], 'info'); bop(0.25); } },
        { n: 'Tam tarafsız kal', fx: () => { tur().stabX += 0.03; bop(-0.1); } }] },
    { id: 'turger', date: '1941-06-18', actor: 'TUR', title: 'Türk-Alman Dostluk Antlaşması',
      text: 'Almanya Balkanları ele geçirdi ve sınırlarımıza dayandı. Berlin bir saldırmazlık ve dostluk antlaşması öneriyor.',
      cond: () => alive('TUR') && alive('GER') && !G.atWar('TUR', 'GER') && !G.sameFaction('TUR', 'GER'),
      opts: [{ n: 'Antlaşmayı imzala', fx: () => { G.st.pacts[G.pairKey('TUR', 'GER')] = 'nap'; rel('GER', 'TUR', 20); G.log('Türk-Alman Dostluk Antlaşması imzalandı.', ['TUR', 'GER'], 'info'); bop(-0.25); } },
        { n: 'Reddet', fx: () => { rel('GER', 'TUR', -15); tur().wsX += 0.03; } }] },
    { id: 'varlik', date: '1942-11-11', actor: 'TUR', title: 'Varlık Vergisi',
      text: 'Seferberlik altındaki ordu ve yükselen enflasyon hazineyi zorluyor. Hükümet büyük servetlere bir defalık olağanüstü vergi koymayı tartışıyor; uygulamada ağır ve adaletsiz olacağı uyarıları da var.',
      cond: () => alive('TUR') && G.st.tension > 40,
      opts: [{ n: 'Vergiyi uygula', fx: () => { const c = tur(); c.pp += 80; c.stabX -= 0.08; G.log('Varlık Vergisi uygulandı: +80 siyasi güç, istikrar −%8.', ['TUR'], 'warn'); } },
        { n: 'Başka yollarla finanse et', fx: () => { const c = tur(); c.stabX += 0.02; c.wsX -= 0.03; } }] },
    { id: 'adana', date: '1943-01-30', actor: 'TUR', title: 'Adana Görüşmesi',
      text: 'Churchill, İnönü ile Adana\'da görüşmek için geldi. İngiltere Türkiye\'yi silahlandırmayı ve savaşa yaklaştırmayı istiyor.',
      cond: () => alive('TUR') && alive('ENG') && !G.atWar('TUR', 'ENG') && !G.sameFaction('TUR', 'GER'),
      opts: [{ n: 'Müttefik yardımını kabul et', fx: () => { const c = tur(); c.stock.inf = (c.stock.inf || 0) + 2500; c.stock.art = (c.stock.art || 0) + 80; c.stock.fig = (c.stock.fig || 0) + 60; c.stock.tank = (c.stock.tank || 0) + 40; rel('ENG', 'TUR', 15); G.log('Adana Görüşmesi: İngiltere tank, top ve uçak gönderiyor.', ['TUR', 'ENG'], 'good'); bop(0.2); } },
        { n: 'Mesafeli dur', fx: () => { rel('ENG', 'TUR', -10); } }] },
    { id: 'kahire', date: '1943-12-04', actor: 'TUR', title: 'Kahire Konferansı',
      text: 'Roosevelt ve Churchill, Türkiye\'nin savaşa girmesini istiyor. İnönü ordunun hazır olmadığını ve Alman hava saldırılarına açık olduğumuzu düşünüyor.',
      cond: () => alive('TUR') && alive('GER') && !G.atWar('TUR', 'GER') && !G.sameFaction('TUR', 'GER') && !!G.st.factions.allies,
      opts: [{ n: 'Tarafsızlığı koru', fx: () => { tur().stabX += 0.03; } },
        { n: 'Müttefiklere katıl', fx: () => { if (G.st.factions.allies) G.joinFaction('TUR', 'allies'); if (!G.atWar('TUR', 'GER')) G.declareWar('TUR', 'GER'); } }] },
    { id: 'turdow', date: '1945-02-23', actor: 'TUR', title: 'Birleşmiş Milletler Kararı',
      text: 'San Francisco konferansına katılmak için 1 Mart\'a kadar Mihvere savaş ilan etmek gerekiyor. Almanya çöküşün eşiğinde.',
      cond: () => alive('TUR') && alive('GER') && G.st.C.GER.enemies.length > 0 && !G.atWar('TUR', 'GER') && !G.sameFaction('TUR', 'GER'),
      opts: [{ n: 'Almanya ve Japonya\'ya savaş ilan et', fx: () => { if (G.st.factions.allies && !tur().fac) G.joinFaction('TUR', 'allies'); for (const t of ['GER', 'JAP']) if (alive(t) && !G.atWar('TUR', t)) G.setWar('TUR', t); G.log('Türkiye Almanya ve Japonya\'ya savaş ilan etti.', ['TUR'], 'major'); bop(0.5); } },
        { n: 'Tarafsız kal', fx: () => { tur().stabX += 0.02; } }] },
    // ---------- Orta Doğu 1941 ----------
    { id: 'iraq', date: '1941-05-02', actor: 'IRQ', title: 'Reşid Ali Darbesi',
      text: 'Altın Kare subayları hükümeti devirdi. Reşid Ali, Mihver\'den yardım umarak İngiliz üslerini kuşatmak istiyor.',
      cond: () => G.st.opts.hist && alive('IRQ') && alive('ENG') && G.atWar('ENG', 'GER') && !G.st.C.IRQ.fac && !G.atWar('ENG', 'IRQ'),
      opts: [{ n: 'İngiliz üslerini kuşat', fx: () => { G.declareWar('ENG', 'IRQ', { alone: true }); } }, { n: 'İngiltere\'ye bağlı kal', fx: () => {} }] },
    { id: 'iran', date: '1941-08-25', actor: 'ENG', title: 'İngiliz-Sovyet İran Harekâtı',
      text: 'Sovyetlere ikmal yolu açmak ve petrol sahalarını güvenceye almak için İran\'a girilmesi planlandı.',
      cond: () => G.st.opts.hist && alive('PER') && alive('ENG') && alive('SOV') && G.atWar('SOV', 'GER') && !G.st.C.PER.fac && !G.atWar('ENG', 'PER'),
      opts: [{ n: 'İran\'a gir', fx: () => {
        const st = G.st;
        const occupy = () => { for (const t of ['ENG', 'SOV']) { st.access[t + '>PER'] = 1; rel('PER', t, -20); } if (st.C.PER.fac) G.leaveFaction('PER'); const c = st.C.PER; c.leader = 'Muhammed Rıza Pehlevi'; G.log('İran ültimatomu kabul etti: Rıza Şah tahttan çekildi, Müttefikler geçiş hakkı aldı.', ['PER', 'ENG', 'SOV'], 'major'); };
        if (st.player === 'PER') G.queuePopup({ title: 'İngiliz-Sovyet Ültimatomu', text: 'İngiliz ve Sovyet orduları sınırda. Geçiş hakkı ve Alman uzmanların sınır dışı edilmesi isteniyor.', opts: [{ n: 'Kabul et', fx: occupy }, { n: 'Direniş (savaş)', fx: () => { G.declareWar('ENG', 'PER', { alone: true }); G.declareWar('SOV', 'PER', { alone: true }); } }] });
        else occupy(); // YZ İran tarihteki gibi dört gün sonra ateşkes ister ve geçişi kabul eder
      } }, { n: 'Vazgeç', fx: () => {} }] },
    // Irak: Reşid Ali yenilir, İngiliz yanlısı hükümet kurulur (Haziran 1941)
    { id: 'iraqend', date: '1941-05-31', actor: 'ENG', title: 'Bağdat\'a Giriş',
      text: 'Habbaniye kuşatması kırıldı; Reşid Ali ülkeden kaçtı. İngiliz yanlısı hükümet yeniden kuruluyor.',
      cond: () => G.st.opts.hist && alive('IRQ') && alive('ENG') && G.atWar('ENG', 'IRQ') && ai('IRQ') && ai('ENG'), retryUntil: '1941-09-01',
      opts: [{ n: 'İngiliz yanlısı hükümeti kur', fx: () => {
        const st = G.st, c = st.C.IRQ;
        for (const k of Object.keys(st.wars)) { const [a, b] = k.split('|'); if (a === 'IRQ' || b === 'IRQ') delete st.wars[k]; }
        if (c.fac) G.leaveFaction('IRQ');
        G.refreshEnemies();
        for (let i = 0; i < NP; i++) { const pr = st.prov[i]; if (pr.o === 'IRQ') pr.c = 'IRQ'; }
        c.overlord = 'ENG'; c.auto = 45; c.leader = 'Nuri es-Said'; st.access['ENG>IRQ'] = 1;
        G.mapDirty = 1; G.needSummary = 1; G.supDirty = 1;
        G.log('Irak: Reşid Ali yenildi; İngiltere\'ye bağlı yeni hükümet kuruldu.', ['IRQ', 'ENG'], 'major');
      } }] },
  ];
  for (const e of EXT) { e.day = G.dayOf(e.date); e.ext = 1; G.EVENTS.push(e); }
  // Hatay olayı oyuncu için "Hatay Meselesi" odağına bağlıdır
  if (G.FOCUS_EV) { G.FOCUS_EV.hatay = 'tur_hatay'; G.EV_OF_FOCUS.tur_hatay = 'hatay'; }
})(window);
