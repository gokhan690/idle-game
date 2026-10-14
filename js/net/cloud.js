// Bulut kaydı: claude.ai içinde açılan oyunda kayıtlar kişiye özel veri alanında (data/users/<kimlik>/) saklanır;
// başka cihazda aynı hesapla açınca kaldığın yerden devam edersin. Kayıt gzip ile sıkıştırılıp base64'e çevrilir ve
// 180 KB'lık parçalara bölünür (belge sınırı 256 KiB). Önce parçalar yeni sürüm ekiyle yazılır, en son meta belge
// güncellenir, ardından eski sürümün parçaları silinir: yazma yarıda kalırsa eski kayıt sağlam kalır.
// Ortak yardımcılar (sıkıştırma, parçalama) çok oyunculu anlık görüntülerde de kullanılır (G.net).
(function (g) {
  const G = g.G;
  const CH = 180000;
  const capOf = (name) => (g.claude && typeof g.claude.use === 'function' ? g.claude.use(name).catch(() => null) : Promise.resolve(null));
  let dbP = null, userP = null, uidP = null;
  const db = () => dbP || (dbP = capOf('db'));
  const user = () => userP || (userP = capOf('user'));
  const uid = () => uidP || (uidP = user().then((u) => (u ? u.id().catch(() => null) : null)));

  // ---- sıkıştırma ve base64 ----
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const pipe = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());
  const canZip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  G.packStr = async (str) => {
    const raw = new TextEncoder().encode(str);
    const z = canZip() ? await pipe(raw, new CompressionStream('gzip')) : raw;
    return { z: canZip() ? 1 : 0, s: b64(z) };
  };
  G.unpackStr = async (p) => {
    const u = unb64(p.s);
    const raw = p.z ? await pipe(u, new DecompressionStream('gzip')) : u;
    return new TextDecoder().decode(raw);
  };
  const split = (s) => { const out = []; for (let i = 0; i < s.length; i += CH) out.push(s.slice(i, i + CH)); return out; };

  // ---- parçalı yazma / okuma (yol öneki altında: <pre>_<ver>_<k>) ----
  // meta belgesi { ver, n, z, ...ek } ; parçalar { b }
  G.blobWrite = async (D, metaPath, chunkPre, str, extra) => {
    const old = await D.doc(metaPath).get().catch(() => null);
    const prev = old && old.exists ? old.data() : null;
    const p = await G.packStr(str), parts = split(p.s), ver = Date.now().toString(36);
    for (let k = 0; k < parts.length; k++) await D.doc(`${chunkPre}_${ver}_${k}`).set({ b: parts[k] });
    await D.doc(metaPath).set(Object.assign({ ver, n: parts.length, z: p.z, size: str.length }, extra || {}));
    if (prev && prev.ver && prev.ver !== ver) for (let k = 0; k < (prev.n || 0); k++) D.doc(`${chunkPre}_${prev.ver}_${k}`).delete().catch(() => {});
    return { ver, n: parts.length };
  };
  G.blobRead = async (D, metaPath, chunkPre) => {
    const m = await D.doc(metaPath).get();
    if (!m.exists) return null;
    const meta = m.data();
    const parts = await Promise.all(Array.from({ length: meta.n }, (_, k) => D.doc(`${chunkPre}_${meta.ver}_${k}`).get()));
    if (parts.some((x) => !x.exists)) throw new Error('Kayıt parçaları eksik (yazma sürerken açılmış olabilir); biraz sonra yeniden dene.');
    return { meta, str: await G.unpackStr({ z: meta.z, s: parts.map((x) => x.data().b).join('') }) };
  };

  // ---- bulut kayıt yuvaları ----
  G.CLOUD_SLOTS = ['c1', 'c2', 'c3', 'cauto'];
  const base = async () => { const [D, id] = await Promise.all([db(), uid()]); return D && id ? { D, pre: `data/users/${id}` } : null; };
  G.cloud = {
    // bulut kullanılabilir mi (claude.ai içinde, oturum açık)
    ready: async () => !!(await base()),
    metas: async () => {
      const b = await base(); if (!b) return null;
      const out = {};
      await Promise.all(G.CLOUD_SLOTS.map(async (s) => { const m = await b.D.doc(`${b.pre}/sv_${s}`).get().catch(() => null); out[s] = m && m.exists ? m.data() : null; }));
      return out;
    },
    save: async (slot) => {
      const st = G.st; if (!st) return { ok: false, why: 'Oyun yok' };
      const b = await base(); if (!b) return { ok: false, why: 'Bulut kullanılamıyor' };
      try {
        if (G.finishTick) G.finishTick();
        await G.blobWrite(b.D, `${b.pre}/sv_${slot}`, `${b.pre}/sc_${slot}`, G.serialize(), { t: Date.now(), tag: st.player, day: st.day, v: G.SAVE_V });
        return { ok: true };
      } catch (e) { return { ok: false, why: (e && (e.message || e.code)) || 'Yazılamadı' }; }
    },
    load: async (slot) => {
      const b = await base(); if (!b) return { ok: false, why: 'Bulut kullanılamıyor' };
      try {
        const r = await G.blobRead(b.D, `${b.pre}/sv_${slot}`, `${b.pre}/sc_${slot}`);
        if (!r) return { ok: false, why: 'Bu yuvada kayıt yok' };
        return { ok: true, str: r.str, meta: r.meta };
      } catch (e) { return { ok: false, why: (e && (e.message || e.code)) || 'Okunamadı' }; }
    },
    del: async (slot) => {
      const b = await base(); if (!b) return false;
      const m = await b.D.doc(`${b.pre}/sv_${slot}`).get().catch(() => null);
      if (m && m.exists) { const d = m.data(); for (let k = 0; k < (d.n || 0); k++) b.D.doc(`${b.pre}/sc_${slot}_${d.ver}_${k}`).delete().catch(() => {}); }
      await b.D.doc(`${b.pre}/sv_${slot}`).delete().catch(() => {});
      return true;
    },
  };
  G.netCaps = { db, user, uid, capOf };
})(window);
