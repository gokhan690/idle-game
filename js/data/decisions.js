// Kararlar (HOI4 "Decisions"): siyasi güçle alınan, süreli ya da anında etkili hükümet kararları.
// Alanlar: id, n ad, d açıklama, cat kategori, cost siyasi güç, days süre (0 = anında), cd bitişten sonra bekleme,
// once: bir kez, tag: yalnızca bu ülke(ler), visible(c) / allowed(c, hedef): görünürlük ve alınabilirlik (true ya da neden metni),
// mod: süre boyunca geçerli değiştirici (c.mods'a eklenir), now(c): alınınca hemen, fx(c, hedef): süre bitince (süre 0 ise hemen),
// fxd: anlık etkilerin metni, spAdd / spRm: bitince eklenen / kaldırılan ulusal ruh, targets(c): hedef ülke listesi,
// ai(c): yapay zekâ için öncelik puanı (yoksa YZ almaz). Yardımcılar game/decisions.js içinde.
(function (g) {
  const G = () => g.G;
  const war = (c) => c.enemies.length > 0;
  const yr = (y) => G().year(G().st.day) >= y;
  const has = (c, sp) => c.spirits.includes(sp);

  g.DEC_CATS = { pol: 'Siyaset', war: 'Savaş ve seferberlik', eco: 'Ekonomi ve sanayi', dip: 'Diplomasi', nat: 'Ulusal kararlar' };

  // Kararlarla gelen ulusal ruhlar
  Object.assign(g.SPIRITS, {
    hatay_ok: { n: 'Hatay Anavatana Katıldı', h: 'Hatay referandumla Türkiye\'ye katıldı; millî birlik duygusu güçlendi.', fx: { stab: 0.03, ws: 0.04 } },
    koy_enst: { n: 'Köy Enstitüleri', h: 'Köylerden yetişen öğretmenler ve ustalar kırsalı kalkındırıyor.', fx: { research: 0.04, stab: 0.02 } },
    buna: { n: 'Buna Sentetik Kauçuğu', h: 'IG Farben tesisleri kömürden kauçuk üretiyor.', fx: { rub: 12 } },
    ural_move: { n: 'Urallardaki Yeni Sanayi', h: 'Doğuya taşınan fabrikalar savaş üretimine yeniden başladı.', fx: { factory: 0.04, construct: 0.03 } },
    purge_scar: { n: 'Tasfiyenin İzleri', h: 'Görevine iade edilen subaylar ordusunu toparlıyor ama güven henüz tam değil.', fx: { landAtk: -0.07, org: -0.05, stab: 0.05 } },
    shelters: { n: 'Sığınak Ağı', h: 'Şehirlerde hava saldırısı sığınakları ve söndürme ekipleri kuruldu.', fx: { civdef: 0.25, stab: 0.02 } },
    empire_conf: { n: 'İmparatorluk Savunma İşbirliği', h: 'Dominyonlarla ortak savunma planı yapıldı.', fx: { ws: 0.04, mp: 0.05 } },
    manchu_settle: { n: 'Mançurya Yerleşimi', h: 'Japon köylüleri ve sanayicileri Mançurya\'ya yerleşiyor.', fx: { steel: 6, factory: 0.02 } },
    libya_colon: { n: 'Libya Kolonizasyonu', h: 'İtalyan ailelerin yerleştirildiği "dördüncü kıyı".', fx: { mp: 0.04, stab: 0.02 } },
    united_front: { n: 'Birleşik Cephe', h: 'Kuomintang ve Komünistler Japonya\'ya karşı ateşkes yaptı.', fx: { stab: 0.06, landDef: 0.04 } },
    burma_rd: { n: 'Burma Yolu', h: 'Dağlardan geçen yol Çin\'e dışarıdan ikmal getiriyor.', fx: { supply: 0.1, steel: 4 } },
    sel_service: { n: 'Seçici Hizmet Yasası', h: 'Barış zamanında ilk zorunlu askerlik: milyonlarca genç kayda geçti.', fx: { mp: 0.15, ws: 0.04 } },
    literacy: { n: 'Okuma Yazma Seferberliği', h: 'Okuma yazma oranı hızla yükseliyor.', fx: { research: 0.03, mp: 0.02 } },
  });

  const D = [
    // ---------- Siyaset ----------
    { id: 'propaganda', n: 'Savaş Propagandası', d: 'Afişler, radyo ve sinema halkı davaya hazırlıyor.', cat: 'pol', cost: 60, days: 90, cd: 30,
      mod: { ws: 0.08 }, allowed: (c) => c.ws < 0.9 || 'Savaş desteği zaten çok yüksek',
      ai: (c) => ((war(c) || G().st.tension > 45) && c.ws < 0.4 ? 3 : 0) },
    { id: 'calm', n: 'Huzur Kampanyası', d: 'Hükümet, grevleri ve gösterileri yatıştırmak için halkla görüşmeler yapıyor.', cat: 'pol', cost: 70, days: 90, cd: 30,
      mod: { stab: 0.06 }, allowed: (c) => c.stab < 0.9 || 'İstikrar zaten çok yüksek',
      ai: (c) => (c.stab < 0.45 ? 4 : 0) },
    { id: 'martial', n: 'Sıkıyönetim', d: 'Orduya yetki verilir; düzen sağlanır ama üretim ve siyasi güç kazanımı zarar görür.', cat: 'pol', cost: 90, days: 60, cd: 120,
      mod: { stab: 0.12, ppM: -0.1, factory: -0.03 }, allowed: (c) => c.stab < 0.4 || 'İstikrar yeterince düşük değil',
      ai: (c) => (c.stab < 0.3 ? 5 : 0) },

    // ---------- Savaş ve seferberlik ----------
    { id: 'drill', n: 'Seferberlik Tatbikatı', d: 'Yedek askerler toplanıp tatbikata alınıyor; eğitim hızlanıyor.', cat: 'war', cost: 60, days: 60, cd: 60,
      mod: { mp: 0.05, train: 0.3 },
      ai: (c) => (war(c) ? 2 : 0) },
    { id: 'officers', n: 'Yedek Subay Eğitimi', d: 'Harp okulları kurslarını hızlandırıyor; birlikler daha tecrübeli ve disiplinli.', cat: 'war', cost: 70, days: 120, cd: 90,
      mod: { xpGain: 0.25, org: 0.03 }, ai: (c) => (war(c) ? 1 : 0) },
    { id: 'civdef', n: 'Sivil Savunma', d: 'Sığınaklar, karartma ve itfaiye ekipleri bombardımanın zararını azaltır.', cat: 'war', cost: 60, days: 90, cd: 90,
      mod: { civdef: 0.25, stab: 0.02 }, allowed: (c) => war(c) || yr(1938) || 'Yalnızca savaşta ya da 1938\'den itibaren',
      ai: (c) => (c.bombed > 0.03 ? 3 : 0) },
    { id: 'convert', n: 'Acil Fabrika Dönüşümü', d: 'Sivil fabrikalar derhal silah üretimine çevrilir. Halk tüketim mallarından yoksun kalır.', cat: 'war', cost: 100, days: 60, cd: 150,
      mod: { stab: -0.03 }, fxd: ['2 sivil fabrika askerî fabrikaya dönüşür'],
      allowed: (c) => (war(c) ? (c.sum.civ >= 6 ? G().decConvertN(c) > 0 || 'Dönüştürülecek fabrika yok' : 'Sivil fabrikalar yetersiz') : 'Yalnızca savaşta'),
      now: (c) => G().decConvert(c, 2),
      ai: (c) => (war(c) && c.sum.civ >= 14 ? 2 : 0) },
    { id: 'border', n: 'Sınır Tahkimatı', d: 'Tehdit altındaki sınır eyaletlerinde istihkâm işleri başlatılır.', cat: 'war', cost: 100, days: 60, cd: 150,
      fxd: ['Düşman ya da tehdit eden komşuya bakan sınır eyaletlerinde +1 tahkimat'],
      allowed: (c) => G().decFortN(c, G().decThreat(c)) > 0 || 'Tahkimat gereken tehdit altında sınır yok',
      fx: (c) => G().decForts(c, 1, G().decThreat(c)),
      ai: (c) => (war(c) && G().decFortN(c, G().decThreat(c)) >= 3 ? 3 : 0) },
    { id: 'arms', n: 'Silah Alımı', d: 'Yurt dışından silah ve cephane satın alınır.', cat: 'war', cost: 100, days: 0, cd: 60,
      fxd: ['+2000 piyade teçhizatı', '+80 topçu'], fx: (c) => { c.stock.inf += 2000; c.stock.art += 80; } },
    { id: 'planes', n: 'Uçak Satın Al', d: 'Dost ülkelerden savaş uçağı alınır.', cat: 'war', cost: 120, days: 0, cd: 90,
      fxd: ['+80 avcı uçağı'], fx: (c) => { c.stock.fig += 80; } },
    { id: 'mob', n: 'Seferberlik Çağrısı', d: 'Yedek askerler silah altına çağrılır.', cat: 'war', cost: 100, days: 0, cd: 180,
      fxd: ['+60 bin insan gücü'], fx: (c) => { c.dead -= 60; } },

    // ---------- Ekonomi ve sanayi ----------
    { id: 'bonds', n: 'Savaş Tahvilleri', d: 'Halka savaş tahvili satılır; fabrikalara kaynak akar ama halk kemer sıkar.', cat: 'eco', cost: 80, days: 90, cd: 60,
      mod: { factory: 0.06, stab: -0.03 }, allowed: (c) => war(c) || 'Yalnızca savaşta',
      ai: (c) => (war(c) ? 3 : 0) },
    { id: 'advisors', n: 'Sanayi Danışmanları', d: 'Yabancı ve yerli sanayiciler fabrika verimini artırmak için çağrılır.', cat: 'eco', cost: 80, days: 120, cd: 90,
      mod: { factory: 0.05, construct: 0.05 }, ai: (c) => (c.sum.mil >= 12 ? 1 : 0) },
    { id: 'infra', n: 'Altyapı Seferberliği', d: 'İşçi taburları yol, köprü ve demiryolu yapımına sevk edilir.', cat: 'eco', cost: 70, days: 90, cd: 90,
      mod: { construct: 0.2, stab: -0.02 }, fxd: ['Bitince en önemli 2 eyalette +1 altyapı'], fx: (c) => G().FX.infra(c, 2),
      ai: (c) => (c.constr.length >= 4 ? 1 : 0) },
    { id: 'steel', n: 'Maden Arama', d: 'Jeologlar yeni demir ve kömür yatakları arıyor.', cat: 'eco', cost: 80, days: 90, cd: 120,
      fxd: ['Kalıcı +3 çelik'], allowed: (c) => (c.fmods.steel || 0) < 9 || 'Bu yönde yeterince arama yapıldı',
      fx: (c) => { c.fmods.steel = (c.fmods.steel || 0) + 3; }, ai: (c) => ((c.fmods.steel || 0) < 6 && c.pp > 300 ? 1 : 0) },
    { id: 'oil', n: 'Petrol Arama', d: 'Sondaj ekipleri yeni petrol sahaları arıyor.', cat: 'eco', cost: 90, days: 120, cd: 150,
      fxd: ['Kalıcı +2 petrol'], allowed: (c) => (c.fmods.oil || 0) < 6 || 'Bu yönde yeterince arama yapıldı',
      fx: (c) => { c.fmods.oil = (c.fmods.oil || 0) + 2; }, ai: (c) => ((c.fmods.oil || 0) < 4 && c.pp > 300 ? 1 : 0) },
    { id: 'civ', n: 'Sanayi Teşviki', d: 'Devlet kredileriyle yeni bir sivil fabrika kurulur.', cat: 'eco', cost: 150, days: 0, cd: 120,
      fxd: ['+1 sivil fabrika'], fx: (c) => G().addFactories(c.tag, 'civ', 1) },
    { id: 'mil', n: 'Silah Sanayii Yatırımı', d: 'Yeni bir silah fabrikası devreye girer.', cat: 'eco', cost: 160, days: 0, cd: 120,
      fxd: ['+1 askerî fabrika'], fx: (c) => G().addFactories(c.tag, 'mil', 1) },

    // ---------- Diplomasi ----------
    { id: 'friend', n: 'İlişkileri Geliştir', d: 'Bir ülkeyle elçilik ziyaretleri, kültür heyetleri ve ticaret görüşmeleri.', cat: 'dip', cost: 40, days: 0, cd: 12,
      fxd: ['Seçilen ülkenin bize bakışı +12 (en çok +60)'],
      targets: (c) => G().decFriendTargets(c),
      allowed: (c, t) => !t || ((G().st.rel || {})[t + '>' + c.tag] || 0) < 55 || 'İlişkiler zaten çok iyi',
      fx: (c, t) => G().decRel(c.tag, t, 12) },
    { id: 'peace_init', n: 'Barış Girişimi', d: 'Büyükelçiler toplantılar düzenler, uluslararası gerginlik azalır; ama halk savaşa daha az istekli olur.', cat: 'dip', cost: 70, days: 60, cd: 90,
      mod: { ws: -0.03 }, fxd: ['Dünya gerginliği -4'],
      allowed: (c) => (war(c) ? 'Savaşta yapılamaz' : G().st.tension >= 15 || 'Dünya gerginliği zaten düşük'),
      now: () => { const st = G().st; st.tension = Math.max(0, st.tension - 4); } },

    // ---------- Genel ulusal kararlar ----------
    { id: 'expert', n: 'Yabancı Uzman Getir', d: 'Yurt dışından bilim insanları ve mühendisler çağrılır.', cat: 'nat', cost: 90, days: 120, cd: 120,
      mod: { research: 0.08 }, ai: (c) => (c.pp > 320 ? 1 : 0) },
    { id: 'sci', n: 'Bilim İnsanı Transferi', d: 'Seçkin araştırmacılar projeleri hızlandırır.', cat: 'nat', cost: 150, days: 0, cd: 180,
      fxd: ['Süren araştırmalara +25 gün ilerleme'], allowed: (c) => c.res.length > 0 || 'Süren araştırma yok',
      fx: (c) => { for (const r of c.res) r.p += 25; } },
    { id: 'literacy', n: 'Okuma Yazma Seferberliği', d: 'Halk okulları ve gece kursları açılır.', cat: 'nat', cost: 80, days: 150, cd: 0, once: 1,
      spAdd: 'literacy', mod: { stab: 0.02 } },

    // ---------- Türkiye ----------
    { id: 'tur_hatay', n: 'Hatay Referandumu', d: 'Hatay Devleti\'nde halk oylaması yapılır ve Türkiye\'ye katılım istenir. Fransa ile ilişkiler gerilir.', cat: 'nat', tag: 'TUR', cost: 60, days: 0, once: 1,
      visible: (c) => !c.focus.done.tur_hatay && yr(1937), allowed: () => yr(1938) || 'Mayıs 1938\'den itibaren',
      spAdd: 'hatay_ok', fxd: ['Fransa ile ilişkiler -10', 'Dünya gerginliği +1,5'],
      fx: (c) => { const G0 = G(); G0.decRel(c.tag, 'FRA', -10); G0.st.tension = Math.min(100, G0.st.tension + 1.5); },
      ai: () => 0 },
    { id: 'tur_straits', n: 'Boğazlar Savunması', d: 'İstanbul ve Çanakkale Boğazları\'nda sahil bataryaları ve istihkâmlar güçlendirilir.', cat: 'nat', tag: 'TUR', cost: 80, days: 60, cd: 300,
      fxd: ['Boğaz bölgesi eyaletlerinde +1 tahkimat'],
      allowed: () => G().decRegionN('TUR', 'straits') > 0 || 'Tahkim edilecek boğaz eyaleti yok',
      fx: (c) => G().decRegionForts(c, 'straits', 1),
      ai: (c) => (yr(1939) && G().decRegionN(c.tag, 'straits') > 0 ? 1 : 0) },
    { id: 'tur_koy', n: 'Köy Enstitüleri', d: 'Köylerden seçilen çocuklar öğretmen ve usta olarak yetiştirilir.', cat: 'nat', tag: 'TUR', cost: 100, days: 120, once: 1,
      spAdd: 'koy_enst', mod: { stab: 0.02 }, visible: () => yr(1937), ai: (c) => (c.pp > 300 ? 1 : 0) },

    // ---------- Almanya ----------
    { id: 'ger_westwall', n: 'Batı Duvarı\'nı İnşa Et', d: 'Siegfried Hattı: Fransa sınırı boyunca beton tahkimatlar ve tank engelleri.', cat: 'nat', tag: 'GER', cost: 100, days: 90, cd: 300,
      mod: { construct: -0.05 }, fxd: ['Batı sınırı eyaletlerinde +2 tahkimat'],
      allowed: (c) => G().decFortN(c, G().decWestWall) > 0 || 'Tahkim edilecek batı sınırı yok',
      fx: (c) => G().decForts(c, 2, G().decWestWall),
      ai: (c) => (yr(1938) && !G().atWar('GER', 'FRA') && G().decFortN(c, G().decWestWall) >= 2 ? 2 : 0) },
    { id: 'ger_buna', n: 'Sentetik Kauçuk', d: 'IG Farben\'in Buna tesisleri kömürden kauçuk üretir; ithalata bağımlılık azalır.', cat: 'nat', tag: 'GER', cost: 90, days: 120, once: 1,
      spAdd: 'buna', mod: { factory: -0.02 }, ai: (c) => (c.pp > 260 ? 2 : 0) },

    // ---------- Sovyetler Birliği ----------
    { id: 'sov_ural', n: 'Sanayiyi Urallara Taşı', d: 'Fabrikalar ve işçiler trenlerle doğuya taşınır; taşıma sürerken üretim aksar.', cat: 'nat', tag: 'SOV', cost: 120, days: 90, once: 1,
      mod: { factory: -0.08 }, spAdd: 'ural_move', fxd: ['+2 askerî, +1 sivil fabrika'],
      allowed: (c) => war(c) || yr(1940) || 'Yalnızca savaşta ya da 1940\'tan itibaren',
      fx: (c) => { G().addFactories(c.tag, 'mil', 2); G().addFactories(c.tag, 'civ', 1); },
      ai: (c) => (war(c) && c.sum.provs < 160 ? 3 : 0) },
    { id: 'sov_stalin', n: 'Stalin Hattı', d: 'Batı sınırı boyunca müstahkem bölgeler kurulur.', cat: 'nat', tag: 'SOV', cost: 90, days: 75, cd: 300,
      fxd: ['Yabancı komşulara bakan sınır eyaletlerinde +1 tahkimat'],
      allowed: (c) => G().decFortN(c, G().decNotFriend(c)) > 0 || 'Tahkim edilecek sınır yok',
      fx: (c) => G().decForts(c, 1, G().decNotFriend(c)),
      ai: (c) => (yr(1939) && G().decFortN(c, G().decNotFriend(c)) >= 3 ? 1 : 0) },
    { id: 'sov_officers', n: 'Subayları Göreve İade Et', d: 'Tasfiyeden kurtulan subaylar hapishanelerden çıkarılıp birliklerine döner.', cat: 'nat', tag: 'SOV', cost: 100, days: 90, once: 1,
      visible: (c) => has(c, 'purge'), allowed: () => yr(1939) || '1939\'dan itibaren',
      spRm: 'purge', spAdd: 'purge_scar', mod: { stab: -0.02 },
      ai: (c) => (yr(1940) && !c.focus.done.sov_purge_end ? 2 : 0) },

    // ---------- Birleşik Krallık ----------
    { id: 'eng_shelters', n: 'Sığınak Ağı', d: 'Anderson sığınakları, karartma ve hava saldırısı gözcüleri örgütlenir.', cat: 'nat', tag: 'ENG', cost: 70, days: 60, once: 1,
      spAdd: 'shelters', allowed: () => yr(1938) || '1938\'den itibaren',
      ai: () => 1 },
    { id: 'eng_empire', n: 'İmparatorluk Savunma Konferansı', d: 'Londra\'da dominyonlarla ortak savunma planı yapılır; dominyonlar siyasi güç kazanır.', cat: 'nat', tag: 'ENG', cost: 90, days: 45, once: 1,
      spAdd: 'empire_conf', fxd: ['Dominyonlarla ilişkiler +15', 'Dominyonlar +20 siyasi güç'],
      fx: (c) => { for (const t of ['CAN', 'AST', 'NZL', 'SAF', 'RAJ']) { const x = G().st.C[t]; if (x && x.alive) { G().decRel(c.tag, t, 15); x.pp = Math.min(2000, x.pp + 20); } } },
      ai: (c) => (yr(1937) ? 1 : 0) },

    // ---------- Fransa ----------
    { id: 'fra_maginot', n: 'Maginot Hattı\'nı Uzat', d: 'Hat, Belçika sınırı boyunca Ardenler ve Kuzey\'e doğru uzatılır.', cat: 'nat', tag: 'FRA', cost: 100, days: 90, cd: 300,
      fxd: ['Almanya, Belçika ve Lüksemburg sınırı eyaletlerinde +1 tahkimat'],
      allowed: (c) => G().decFortN(c, G().decMaginot) > 0 || 'Tahkim edilecek sınır yok',
      fx: (c) => G().decForts(c, 1, G().decMaginot),
      ai: (c) => (yr(1938) && G().decFortN(c, G().decMaginot) >= 2 ? 2 : 0) },
    { id: 'fra_unity', n: 'Ulusal Birlik Hükümeti', d: 'Sağ ve sol bölünmeyi aşmak için ortak bir kabine kurulur.', cat: 'nat', tag: 'FRA', cost: 90, days: 150, cd: 240,
      mod: { stab: 0.08 }, visible: (c) => has(c, 'pol_div'), ai: (c) => (c.stab < 0.5 ? 3 : 0) },

    // ---------- İtalya ----------
    { id: 'ita_libya', n: 'Libya\'yı Sömürgeleştir', d: 'Binlerce İtalyan çiftçi ailesi Libya\'ya yerleştirilir ("dördüncü kıyı").', cat: 'nat', tag: 'ITA', cost: 90, days: 150, once: 1,
      spAdd: 'libya_colon', mod: { ppM: -0.03 }, fxd: ['Bitince en önemli 2 eyalette +1 altyapı'],
      allowed: (c) => G().decOwns(c.tag, ['Trablusgarp', 'Bingazi']) || 'Libya denetimimizde olmalı',
      fx: (c) => G().FX.infra(c, 2), ai: (c) => (G().decOwns(c.tag, ['Trablusgarp', 'Bingazi']) && c.pp > 260 ? 1 : 0) },
    { id: 'ita_modern', n: 'Ordu Modernizasyon Planı', d: 'Eski teçhizat yenilenir, ikmal örgütü iyileştirilir.', cat: 'nat', tag: 'ITA', cost: 100, days: 120, cd: 240,
      mod: { supply: 0.1, org: 0.04 }, visible: (c) => has(c, 'ita_army'), ai: (c) => (c.pp > 280 ? 2 : 0) },

    // ---------- Japonya ----------
    { id: 'jap_manchu', n: 'Mançurya Yerleşimi', d: 'Japon göçmenler ve zaibatsu şirketleri Mançurya\'ya yerleştirilir.', cat: 'nat', tag: 'JAP', cost: 100, days: 120, once: 1,
      spAdd: 'manchu_settle', fxd: ['+1 askerî, +1 sivil fabrika'],
      allowed: (c) => (G().st.C.MAN?.alive && G().sameFaction(c.tag, 'MAN')) || 'Mançukuo müttefikimiz olmalı',
      fx: (c) => { G().addFactories(c.tag, 'mil', 1); G().addFactories(c.tag, 'civ', 1); },
      ai: (c) => (G().st.C.MAN?.alive && c.pp > 260 ? 2 : 0) },
    { id: 'jap_truce', n: 'Ordu-Donanma Uzlaşısı', d: 'İmparatorluk Genel Karargâhı kaynak paylaşımını yeniden düzenler.', cat: 'nat', tag: 'JAP', cost: 90, days: 120, cd: 240,
      mod: { research: 0.05, ppM: 0.08 }, visible: (c) => has(c, 'jap_rivalry'), ai: (c) => (c.pp > 280 ? 1 : 0) },

    // ---------- Amerika Birleşik Devletleri ----------
    { id: 'usa_lend', n: 'Silah ve Kiralama', d: 'Savaşan dost ülkelere teçhizat ödünç verilir; Amerikan fabrikaları da hızlanır.', cat: 'nat', tag: 'USA', cost: 70, days: 0, cd: 60,
      fxd: ['En çok yardım isteyen 3 dosta 800 piyade teçhizatı ve 40 topçu', 'Dostların bize bakışı +6'],
      allowed: (c) => (!yr(1940) ? '1940\'tan itibaren' : c.stock.inf < 3000 ? 'Yeterli stok yok (3000 piyade teçhizatı)' : G().decLendTargets(c).length > 0 || 'Yardıma muhtaç dost yok'),
      fx: (c) => { for (const t of G().decLendTargets(c)) { G().lend(c.tag, t, 'inf', 800); G().lend(c.tag, t, 'art', 40); } },
      ai: (c) => (c.stock.inf > 6000 && G().decLendTargets(c).length ? 2 : 0) },
    { id: 'usa_draft', n: 'Seçici Hizmet Yasası', d: 'Barış zamanında ilk kez zorunlu askerlik başlatılır.', cat: 'nat', tag: 'USA', cost: 80, days: 0, once: 1,
      visible: () => yr(1939), spAdd: 'sel_service', ai: (c) => (yr(1940) ? 3 : 0) },

    // ---------- Çin ----------
    { id: 'chi_front', n: 'Birleşik Cephe', d: 'Kuomintang ile Komünistler iç savaşı askıya alıp Japonya\'ya karşı birleşir.', cat: 'nat', tag: 'CHI', cost: 90, days: 0, once: 1,
      spAdd: 'united_front', fxd: ['Çin Halk Cumhuriyeti ile ilişkiler +30'],
      allowed: (c) => (G().atWar(c.tag, 'JAP') || yr(1937)) || '1937\'den itibaren ya da Japonya ile savaşta',
      fx: (c) => { if (G().st.C.PRC?.alive) G().decRel(c.tag, 'PRC', 30); },
      ai: (c) => (G().atWar(c.tag, 'JAP') ? 3 : 0) },
    { id: 'chi_road', n: 'Burma Yolu\'nu Aç', d: 'Dağlık arazide yol açılır; dış yardım Çin\'e ulaşır.', cat: 'nat', tag: 'CHI', cost: 80, days: 90, once: 1,
      spAdd: 'burma_rd', fxd: ['Bitince en önemli 3 eyalette +1 altyapı'],
      allowed: (c) => war(c) || 'Yalnızca savaşta', fx: (c) => G().FX.infra(c, 3),
      ai: (c) => (war(c) ? 2 : 0) },
  ];
  g.DECISIONS = D;
  g.DEC_BY_ID = {};
  for (const d of D) g.DEC_BY_ID[d.id] = d;
})(window);
