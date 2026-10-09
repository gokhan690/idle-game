// Ses ve atmosfer: dosyasız, Web Audio ile üretilen müzik ve efektler (HOI4 havası).
// - Müzik: Re minör akorlarla yavaş ortam müziği; savaştayken uzaktan timpani vuruşları.
// - Efektler: düğme tıkı, savaş ilanı borusu, teslim davulu, araştırma/odak çanı, muharebede uzak top sesleri, atom.
// Tarayıcılar sesi ilk dokunuşta açar; ayarlar (müzik / efekt) cihazda saklanır.
(function (g) {
  const G = g.G;
  const A = (G.Audio = { ctx: null, on: { music: 1, sfx: 1 } });
  try { const s = JSON.parse(localStorage.getItem('dc_snd') || 'null'); if (s) Object.assign(A.on, s); } catch (e) { /* gizli mod */ }
  A.save = () => { try { localStorage.setItem('dc_snd', JSON.stringify(A.on)); } catch (e) { /* */ } };
  let sfxBus, musBus, verb, noiseBuf;
  const now = () => A.ctx.currentTime;
  function build() {
    const AC = g.AudioContext || g.webkitAudioContext; if (!AC) return false;
    const ctx = (A.ctx = new AC());
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    // yankı: üretilmiş darbe yanıtı (2.6 sn sönümlenen gürültü)
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.on.sfx ? 0.55 : 0; sfxBus.connect(master); sfxBus.connect(verb);
    musBus = ctx.createGain(); musBus.gain.value = 0; musBus.connect(master); musBus.connect(verb);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  A.unlock = () => {
    if (!A.ctx && !build()) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (A.on.music) startMusic();
  };
  // ---------- yapı taşları ----------
  const env = (gn, t, a, peak, d) => { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  function tone(freq, t, dur, type, vol, bus, glideTo) {
    const o = A.ctx.createOscillator(), gn = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    env(gn, t, Math.min(0.02, dur / 4), vol, dur); o.connect(gn); gn.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, f0, f1, bus) {
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), gn = A.ctx.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(gn, t, 0.005, vol, dur); s.connect(f); f.connect(gn); gn.connect(bus || sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const ok = () => A.ctx && A.on.sfx && A.ctx.state === 'running';
  // ---------- efektler ----------
  A.click = () => { if (!ok()) return; const t = now(); tone(1250, t, 0.035, 'triangle', 0.05); noise(t, 0.02, 0.03, 4000, 1500); };
  A.boom = (vol = 0.5, far = 1) => { if (!ok()) return; const t = now(); noise(t, 0.9 * far, vol, 900 / far, 90); tone(70, t, 0.6, 'sine', vol * 0.9, sfxBus, 38); };
  A.horn = (vol = 0.35) => {
    if (!ok()) return; const t = now();
    const note = (f, t0, d) => { for (const det of [-6, 6]) { const o = A.ctx.createOscillator(), fl = A.ctx.createBiquadFilter(), gn = A.ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; fl.type = 'lowpass'; fl.frequency.setValueAtTime(500, t0); fl.frequency.linearRampToValueAtTime(1700, t0 + 0.25); fl.frequency.linearRampToValueAtTime(900, t0 + d); gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(vol / 2, t0 + 0.12); gn.gain.setValueAtTime(vol / 2, t0 + d - 0.15); gn.gain.linearRampToValueAtTime(0.0001, t0 + d); o.connect(fl); fl.connect(gn); gn.connect(sfxBus); o.start(t0); o.stop(t0 + d + 0.05); } };
    note(220, t, 0.45); note(293.66, t + 0.5, 0.35); note(329.63, t + 0.9, 1.1);
  };
  A.chime = () => { if (!ok()) return; const t = now(); [1046.5, 1318.5, 1568].forEach((f, k) => tone(f, t + k * 0.09, 0.9, 'sine', 0.07)); };
  A.drumroll = (vol = 0.3) => { if (!ok()) return; const t = now(); for (let k = 0; k < 22; k++) noise(t + k * 0.055, 0.07, vol * (0.3 + 0.7 * k / 22), 2500, 800); noise(t + 1.25, 0.9, vol * 1.4, 1200, 120); tone(98, t + 1.25, 0.9, 'sine', vol, sfxBus, 60); };
  A.bad = () => { if (!ok()) return; const t = now(); tone(196, t, 0.5, 'triangle', 0.09); tone(185, t + 0.25, 0.7, 'triangle', 0.09); };
  // ---------- müzik ----------
  // Re minör: Dm - Bb - F - C - Dm - Gm - A ; her akor 8 saniye, yumuşak "yaylı" pad + bas drone
  const CH = [[146.83, 174.61, 220], [116.54, 146.83, 174.61], [174.61, 220, 261.63], [130.81, 164.81, 196], [146.83, 174.61, 220], [98, 116.54, 146.83], [110, 138.59, 164.81]];
  let mTimer = null, mNext = 0, mStep = 0;
  function pad(freqs, t, dur) {
    const fl = A.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 700; fl.Q.value = 0.6;
    const lfo = A.ctx.createOscillator(), lg = A.ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 250; lfo.connect(lg); lg.connect(fl.frequency); lfo.start(t); lfo.stop(t + dur + 3);
    const gn = A.ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.07, t + 2.4); gn.gain.setValueAtTime(0.07, t + dur - 0.5); gn.gain.linearRampToValueAtTime(0.0001, t + dur + 2.5);
    fl.connect(gn); gn.connect(musBus);
    for (const f of freqs) for (const det of [-8, 0, 8]) { const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + dur + 3); }
    // bas
    const b = A.ctx.createOscillator(), bg = A.ctx.createGain(); b.type = 'sine'; b.frequency.value = freqs[0] / 2; bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.09, t + 2); bg.gain.linearRampToValueAtTime(0.0001, t + dur + 2); b.connect(bg); bg.connect(musBus); b.start(t); b.stop(t + dur + 3);
  }
  function timpani(t, v) { tone(92, t, 0.9, 'sine', v, musBus, 62); noise(t, 0.25, v * 0.5, 600, 120, musBus); }
  function schedule() {
    if (!A.ctx) return;
    while (mNext < now() + 4) {
      const dur = 8, ch = CH[mStep % CH.length];
      pad(ch, mNext, dur);
      const pl = G.st && G.st.C && G.st.C[G.st.player];
      if (pl && pl.enemies && pl.enemies.length && mStep % 2 === 0) { timpani(mNext + 4, 0.16); timpani(mNext + 4.6, 0.11); timpani(mNext + 6, 0.18); }
      mNext += dur; mStep++;
    }
  }
  function startMusic() {
    if (!A.ctx || mTimer) return;
    musBus.gain.cancelScheduledValues(now()); musBus.gain.setValueAtTime(musBus.gain.value, now()); musBus.gain.linearRampToValueAtTime(0.75, now() + 3);
    mNext = Math.max(mNext, now() + 0.1); schedule(); mTimer = setInterval(schedule, 2000);
  }
  function stopMusic() {
    if (!A.ctx) return; clearInterval(mTimer); mTimer = null;
    musBus.gain.cancelScheduledValues(now()); musBus.gain.setValueAtTime(musBus.gain.value, now()); musBus.gain.linearRampToValueAtTime(0, now() + 1.5);
  }
  A.toggle = (k) => {
    A.on[k] = A.on[k] ? 0 : 1; A.save(); A.unlock();
    if (k === 'music') { if (A.on.music) startMusic(); else stopMusic(); }
    if (k === 'sfx' && sfxBus) sfxBus.gain.value = A.on.sfx ? 0.55 : 0;
  };
  // ---------- olaylara bağlama ----------
  A.log = (l) => {
    const st = G.st; if (!st || !st.player || !A.ctx) return;
    const pl = st.player, mine = l.t && l.t.includes(pl);
    if (/savaş ilan etti/.test(l.m)) { if (mine) A.horn(0.4); else if (l.k === 'major') A.horn(0.16); }
    else if (/teslim oldu/.test(l.m) && (mine || l.k === 'major')) A.drumroll(mine ? 0.35 : 0.2);
    else if (/atom bombası/.test(l.m)) A.boom(0.9, 1.8);
    else if (mine && /Araştırma tamamlandı|ulusal odağını tamamladı|özel projesini tamamladı/.test(l.m)) A.chime();
    else if (mine && l.k === 'bad') A.bad();
  };
  // muharebe ortam sesi: ekrandaki muharebeler arttıkça uzaktan top sesleri (oyun akarken)
  let lastBoom = 0;
  setInterval(() => {
    if (!ok() || !G.st || G.st.paused || !G.battles || !G.battles.length || document.hidden) return;
    const R = G.R; let n = 0;
    for (const b of G.battles) { const s = R.toScreen(G.nodeX[b.n], G.nodeY[b.n]); if (s.x > -50 && s.y > -50 && s.x < R.w + 50 && s.y < R.h + 50) n++; }
    if (!n || performance.now() - lastBoom < 900) return;
    if (Math.random() < Math.min(0.85, 0.2 + n * 0.08)) { lastBoom = performance.now(); A.boom(Math.min(0.32, 0.1 + n * 0.02) * (0.6 + Math.random() * 0.4), 1.3 + Math.random()); }
  }, 700);
  document.addEventListener('pointerdown', () => A.unlock(), { capture: true });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-act]'); if (b && !b.disabled) A.click(); }, { capture: true });
  // günlüğe bağlan (ui.js G.onLog'u tanımladıktan sonra yüklenir)
  const prev = G.onLog; G.onLog = (l) => { if (prev) prev(l); try { A.log(l); } catch (e) { /* ses hatası oyunu durdurmasın */ } };
})(window);
