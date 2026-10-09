// Başlangıç rehberi: ilk oyunda adım adım temel ekranları gösterir (vurgu + kısa açıklama).
// Bir kez gösterilir; Menü → "Başlangıç rehberi" ile yeniden açılabilir.
(function (g) {
  const G = g.G, UI = G.UI;
  const STEPS = [
    { t: null, h: 'Demir Cephe\'ye hoş geldin', d: 'Bu kısa rehber oyunun temellerini gösterir. İstediğin an "Geç" ile kapatabilirsin; Menü\'den yeniden açabilirsin.' },
    { t: '#btn-pause', h: 'Zaman', d: '▶ ile zamanı başlat ya da duraklat; tarihin altındaki beş çubuk oyun hızıdır. Üst çubuktaki simgelere dokununca açıklamaları çıkar. Oyun duraklatılmışken de bütün emirleri verebilirsin.' },
    { t: '#hud-alerts', h: 'Uyarılar', d: 'Boşta kalan işleri gösterir: odak seçilmedi, boş araştırma yuvası, inşaat kuyruğu boş, emirsiz tümenler. Dokununca ilgili panel açılır.' },
    { t: '#nav [data-p=pol]', h: 'Siyaset ve odak ağacı', d: 'Ulusal odak ağacından ülkenin yolunu seç. Odaklar fabrika, teknoloji, ittifak ve savaş gerekçesi verir. Yasalar, danışmanlar ve güç dengesi de burada.' },
    { t: '#nav [data-p=res]', h: 'Bilim', d: 'Araştırma yuvalarını hep dolu tut. Boş yuvaya dokununca seçilebilir teknolojiler yanar; Projeler sekmesinde özel projeler var.' },
    { t: '#nav [data-p=con]', h: 'İnşaat ve üretim', d: 'Sivil fabrikalar inşaat yapar, askerî fabrikalar teçhizat üretir. İlk yıllarda sivil fabrika kur, savaş yaklaşınca askerî fabrikaya geç.' },
    { t: '#nav [data-p=army]', h: 'Ordu', d: 'Tümen eğit, ordulara ayır. Orduya "Cepheyi tut" de, plan dolunca "Uygula ▶" ile taarruz et. Ok çizip aşama ekleyebilir, savunma hattı çizebilirsin.' },
    { t: '#btn-box', h: 'Harita ve seçim', d: 'Tümene dokun → seç, hedef eyalete dokun → yürür ya da saldırır. Bu düğme tüm tümenleri, bir bölgeyi ya da bir alanı seçmeni sağlar. İki parmakla yakınlaştır.' },
    { t: '#btn-menu', h: 'Menü', d: 'Kaydet, ayarlar (müzik, ses efektleri, haberler) ve ayrıntılı "Nasıl oynanır" rehberi burada. İyi oyunlar!' },
  ];
  let k = 0, box = null;
  const close = (done) => { if (box) box.remove(); box = null; g.removeEventListener('resize', place); if (done) try { localStorage.setItem('dc_tut', '1'); } catch (e) { /* */ } };
  function place() {
    if (!box) return;
    const S = STEPS[k], spot = box.querySelector('.tut-spot'), card = box.querySelector('.tut-card');
    const el = S.t && document.querySelector(S.t);
    const r = el && !el.hidden && el.getBoundingClientRect();
    if (r && r.width) {
      const pad = 5; spot.hidden = false;
      Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      // kart: hedefin altında yer varsa alta, yoksa üste; yatayda ekrana sığdır
      const cw = Math.min(340, innerWidth - 24), below = r.bottom + 14 + 170 < innerHeight;
      let left = Math.max(12, Math.min(innerWidth - cw - 12, r.left + r.width / 2 - cw / 2));
      if (r.right < innerWidth * 0.25 && innerWidth > innerHeight) left = r.right + 14; // yatayda sol menü: kart sağında
      Object.assign(card.style, { width: cw + 'px', left: left + 'px', top: below || (innerWidth > innerHeight && r.right < innerWidth * 0.25) ? Math.min(innerHeight - 190, (innerWidth > innerHeight && r.right < innerWidth * 0.25 ? r.top : r.bottom + 14)) + 'px' : 'auto', bottom: below || (innerWidth > innerHeight && r.right < innerWidth * 0.25) ? 'auto' : innerHeight - r.top + 14 + 'px' });
    } else {
      spot.hidden = true;
      const cw = Math.min(360, innerWidth - 24);
      Object.assign(card.style, { width: cw + 'px', left: (innerWidth - cw) / 2 + 'px', top: '30%', bottom: 'auto' });
    }
  }
  function show() {
    const S = STEPS[k];
    box.querySelector('.tut-card').innerHTML = `<div class="tut-step">${k + 1} / ${STEPS.length}</div><h3>${S.h}</h3><p>${S.d}</p><div class="tut-btns"><button class="btn sm" data-tut="skip">Geç</button><span class="grow"></span>${k ? '<button class="btn sm" data-tut="prev">Geri</button>' : ''}<button class="btn sm pri" data-tut="next">${k === STEPS.length - 1 ? 'Bitir' : 'İleri'}</button></div>`;
    place();
  }
  UI.startTutorial = () => {
    close(false); k = 0;
    box = document.createElement('div'); box.id = 'tut'; box.innerHTML = '<div class="tut-spot" hidden></div><div class="tut-card" role="dialog" aria-label="Başlangıç rehberi"></div>';
    document.body.appendChild(box);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tut]'); if (!b) return;
      const a = b.dataset.tut;
      if (a === 'skip') close(true);
      else if (a === 'prev') { k = Math.max(0, k - 1); show(); }
      else if (k >= STEPS.length - 1) close(true); else { k++; show(); }
    });
    g.addEventListener('resize', place);
    show();
  };
  UI.maybeTutorial = () => { let seen = false; try { seen = localStorage.getItem('dc_tut') === '1'; } catch (e) { /* */ } if (!seen) setTimeout(UI.startTutorial, 250); };
})(window);
