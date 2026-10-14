// Çok oyunculu eşitleme: durum farkı (diff) ve yama.
// İstemci bir eylemden önceki ve sonraki durumu karşılaştırır, küçük bir işlem listesi üretir ve kurucuya gönderir;
// kurucu yamayı kendi (yetkili) durumuna uygular. Kurucu düzenli olarak anlık görüntü yayınlar ve herkes onu yükler.
// İşlem: [yol, değer] — yol bölümleri nesne anahtarı (dize), dizi sırası (sayı) ya da kimlikli dizi öğesi ({ id });
// değer undefined ise silinir. Kimlik taşıyan nesnelerden oluşan diziler (tümenler, ordular, filolar) kimliğe göre
// karşılaştırılır: ekleme sona yapılır, silme yerinde. Uzunluğu değişen sıradan diziler bütünüyle değiştirilir.
(function (g) {
  const G = g.G;
  // kurucunun yetkili olduğu alanlar: istemci yaması bunlara dokunmaz
  const SKIP_TOP = new Set(['day', 'seed', 'player', 'log', 'led', 's0', 'humans', 'over', 'nextId']);
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const idArr = (a) => a.length > 0 && a.every((x) => isObj(x) && (typeof x.id === 'number' || typeof x.id === 'string'));
  const same = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b));

  G.stateDiff = (a, b) => {
    const ops = [];
    const walk = (x, y, path) => {
      if (same(x, y)) return;
      if (isObj(x) && isObj(y)) {
        for (const k in y) {
          if (path.length === 0 && SKIP_TOP.has(k)) continue;
          if (!(k in x)) ops.push([path.concat([k]), y[k]]);
          else walk(x[k], y[k], path.concat([k]));
        }
        for (const k in x) if (!(k in y) && !(path.length === 0 && SKIP_TOP.has(k))) ops.push([path.concat([k]), undefined]);
        return;
      }
      if (Array.isArray(x) && Array.isArray(y)) {
        if ((idArr(x) || !x.length) && (idArr(y) || !y.length) && (x.length || y.length)) {
          const xm = new Map(x.map((e) => [e.id, e])), ym = new Set();
          for (const e of y) { ym.add(e.id); const o = xm.get(e.id); if (o === undefined) ops.push([path.concat([{ id: e.id }]), e]); else walk(o, e, path.concat([{ id: e.id }])); }
          for (const e of x) if (!ym.has(e.id)) ops.push([path.concat([{ id: e.id }]), undefined]);
          return;
        }
        if (x.length === y.length) { for (let i = 0; i < y.length; i++) walk(x[i], y[i], path.concat([i])); return; }
      }
      ops.push([path, y]);
    };
    walk(a, b, []);
    return ops;
  };

  // yamayı canlı duruma uygula (değerler kopyalanır); uygulanamayan işlemler sayılır ve atlanır
  G.applyPatch = (st, ops) => {
    let bad = 0;
    const cp = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    for (const [path, val] of ops) {
      if (!path.length) { bad++; continue; }
      let o = st, ok = true;
      for (let k = 0; k < path.length - 1; k++) {
        const s = path[k];
        if (s !== null && typeof s === 'object') { if (!Array.isArray(o)) { ok = false; break; } o = o.find((e) => e && e.id === s.id); }
        else o = o[s];
        if (o === undefined || o === null || typeof o !== 'object') { ok = false; break; }
      }
      if (!ok) { bad++; continue; }
      const last = path[path.length - 1];
      if (last !== null && typeof last === 'object') {
        if (!Array.isArray(o)) { bad++; continue; }
        const i = o.findIndex((e) => e && e.id === last.id);
        if (val === undefined) { if (i >= 0) o.splice(i, 1); }
        else if (i >= 0) o[i] = cp(val); else o.push(cp(val));
      } else if (val === undefined) { if (Array.isArray(o)) o.splice(last, 1); else delete o[last]; }
      else o[last] = cp(val);
    }
    return bad;
  };

  // bir eylemin oluşturduğu fark: önce/sonra anlık görüntü (yalnızca kayda giren durum)
  G.snapObj = () => JSON.parse(G.serialize());
  G.diffAround = (fn) => { const a = G.snapObj(); fn(); return G.stateDiff(a, G.snapObj()); };
})(window);
