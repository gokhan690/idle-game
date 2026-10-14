// Telefon uygulaması (PWA): ana ekrana ekleme, yeni sürüm bildirimi ve claude.ai dışı bilgi notu.
(function (g) {
  const G = g.G, UI = G.UI;
  const P = (G.pwa = { prompt: null, update: false, standalone: false });
  try { P.standalone = g.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || g.navigator.standalone === true; } catch (e) { /* */ }
  const ua = (g.navigator && g.navigator.userAgent) || '';
  P.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && g.navigator.maxTouchPoints > 1);
  P.web = /^https?:$/.test(location.protocol) && !g.claude; // claude.ai dışında, normal web barındırmada
  const rerender = () => { const s = document.getElementById('start'); if (s && !s.hidden) UI.renderStart(); else if (UI.panel === 'menu') UI.render(); };
  // Android/Chrome: tarayıcının kurulum isteği saklanır, düğmeyle gösterilir
  g.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); P.prompt = e; rerender(); });
  g.addEventListener('appinstalled', () => { P.prompt = null; P.standalone = true; UI.toast && UI.toast('Demir Cephe ana ekrana eklendi.', 'good'); rerender(); });

  // başlangıç ekranı ve menü bölümü: kurulum ve claude.ai dışı not
  UI.pwaSection = () => {
    let h = '';
    if (P.update) h += '<div class="btns"><button class="btn pri" data-act="appreload">Yeni sürüm hazır · Yenile</button></div>';
    if (!P.standalone && P.web) {
      if (P.prompt) h += '<div class="btns"><button class="btn" data-act="appinstall">Uygulamayı yükle</button></div><p class="muted small" style="margin:6px 0 0">Ana ekrana eklenir; tam ekran ve internetsiz açılır.</p>';
      else if (P.ios) h += '<p class="muted small" style="margin:0">Uygulama gibi oynamak için Safari\'de <b>Paylaş</b> → <b>Ana Ekrana Ekle</b>. Tam ekran ve internetsiz açılır.</p>';
    }
    if (P.web) h += `<p class="muted small" style="margin:${h ? '8px' : '0'} 0 0">Çok oyunculu ve bulut kaydı, oyun claude.ai'deki sayfasından açıldığında çalışır. Burada kayıtlar bu cihazda tutulur; "Dosyaya aktar" ile başka cihaza taşıyabilirsin.</p>`;
    return h;
  };
  UI.ACT.appinstall = async () => {
    const p = P.prompt; if (!p) return;
    P.prompt = null;
    try { p.prompt(); await p.userChoice; } catch (e) { /* */ }
    rerender();
  };
  // yeni sürüm: oyun sürüyorsa önce otomatik kayıt, sonra yenile
  UI.ACT.appreload = () => {
    try { if (G.st && document.getElementById('start').hidden) G.saveGame('auto'); } catch (e) { /* */ }
    location.reload();
  };

  // hizmet çalışanı: kayıt, düzenli güncelleme denetimi, yeni sürüm hazır olunca bildirim
  P.register = () => {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || g.__NO_SW__) return;
    const hadCtl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const check = () => reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    }).catch(() => {});
    // ilk kurulumda değil, yalnızca var olan sürüm değiştiğinde haber ver
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadCtl || P.update) return;
      P.update = true;
      if (UI.toast && document.getElementById('start').hidden) UI.toast('Yeni sürüm hazır: Menü → Uygulama → "Yenile".', 'info');
      rerender();
    });
  };
})(window);
