// İçerik denetimi: odak açıklamalarındaki sayılar ile gerçek etkiler, ön koşul/teknoloji/ruh referansları. node tools/contentcheck.mjs
import { readFileSync } from 'node:fs'; import vm from 'node:vm';
const ROOT=new URL('..', import.meta.url).pathname;
const ctx={console,Math,Date,JSON,Object,Array,Set,Map,Float32Array,Float64Array,Int32Array,Uint8Array,performance}; ctx.window=ctx; vm.createContext(ctx);
for (const f of ['js/data/map.js','js/data/countries.js','js/data/content.js','js/data/leaders.js','js/data/focus.js','js/data/focus_ext.js','js/data/focus_more.js','js/data/focus_alt.js','js/data/focus_minor.js','js/data/rivers.js','js/data/decisions.js']) vm.runInContext(readFileSync(ROOT+f,'utf8'),ctx,{filename:f});
const all=[...ctx.FOCUS_GENERIC.map(f=>['GEN',f]), ...Object.entries(ctx.FOCUS_NATIONAL).flatMap(([t,l])=>l.map(f=>[t,f]))];
const out=[];
const sumU=(u)=>u?Object.values(u).reduce((a,b)=>a+b,0):0;
// sayı + anahtar kelime -> fx değeri
const CNT=[
 [/\+?(\d+)\s*muhrip/i, f=>f.ships?.dd],
 [/\+?(\d+)\s*kruvazör/i, f=>f.ships?.cr],
 [/\+?(\d+)\s*denizaltı/i, f=>f.ships?.ss],
 [/\+?(\d+)\s*(savaş gemisi|zırhlı gemi)/i, f=>f.ships?.bb],
 [/\+(\d+)\s*zırhlı(?! gemi)/i, f=>f.units?.arm],
 [/\+(\d+)\s*motorize/i, f=>f.units?.mot],
 [/\+?(\d+)\s*uçak gemisi/i, f=>f.ships?.cv],
 [/\+?(\d+)\s*(yeni\s*)?tümen/i, f=>sumU(f.units)],
 [/\+?(\d+)\s*(askerî|askeri|silah) fabrika/i, f=>f.addMil],
 [/\+?(\d+)\s*sivil fabrika/i, f=>f.addCiv],
 [/\+?(\d+)\s*tersane/i, f=>f.addDock],
 [/\+?(\d+)\s*(avcı|uçak)\b(?! gemisi)/i, f=>(f.addPlanes||0)],
 [/\+?(\d+)\s*bombardıman/i, f=>f.addBombers],
 [/\+?(\d+)\s*(siyasi güç|SG)\b/, f=>f.pp],
 [/\+?(\d+)\s*araştırma yuvası|\+?(\d+)\s*yuva/i, f=>f.slots],
];
const PCT=[
 [/deniz(\s*gücü)?\s*\+%(\d+)/i,'navy'],[/hava(\s*gücü)?\s*\+%(\d+)/i,'air'],[/ikmal\s*\+%(\d+)/i,'supply'],[/hız\s*\+%(\d+)/i,'speed'],
 [/moral\s*(ve [a-zçğıöşü]+\s*)?\+%(\d+)/i,'org'],[/araştırma(\s*hızı)?\s*\+%(\d+)/i,'research'],[/savaş desteği\s*\+%(\d+)/i,'ws'],[/istikrar\s*\+%(\d+)/i,'stab'],
 [/insan gücü\s*\+%(\d+)/i,'mp'],[/inşaat(\s*hızı)?\s*\+%(\d+)/i,'construct'],[/(zırhlı|zırh) saldırı(sı)?\s*\+%(\d+)/i,'armAtk'],[/(?<!zırhlı |zırh )(kara )?saldırı(sı)?\s*\+%(\d+)/i,'landAtk'],[/(kara )?savunma(sı)?\s*\+%(\d+)/i,'landDef'],[/çıkarma\s*\+%(\d+)/i,'invasion'],[/fabrika verimi\s*\+%(\d+)/i,'factory'],
];
for (const [t,f] of all) {
  const d=f.d||''; if(!d) continue; const fx={...(ctx.SPIRITS[f.fx?.spirit]?.fx||ctx.SPIRITS[f.fx?.spirit]||{}),...(f.fx||{})};
  for (const [re,get] of CNT) { const m=d.match(re); if(!m) continue; const n=+(m[1]||m[2]); const v=get(fx); if(v==null||v===0){ if(!(fx.fn||fx.spirit)) out.push(`${t} ${f.id}: "${m[0]}" ama fx yok`); else out.push(`? ${t} ${f.id}: "${m[0]}" fx'te sayı yok (fn/spirit olabilir)`);} else if(v!==n) out.push(`${t} ${f.id}: "${m[0]}" ≠ fx ${v}`); }
  for (const [re,k] of PCT) { const m=d.match(re); if(!m) continue; const n=+m[m.length-1]; const v=fx[k]; if(v==null){ out.push(`? ${t} ${f.id}: "${m[0]}" fx.${k} yok`); } else if(Math.round(v*100)!==n) out.push(`${t} ${f.id}: "${m[0]}" ≠ fx.${k} ${v}`); }
}
console.log(out.join('\n')); console.log('toplam', all.length, 'sorun', out.filter(x=>!x.startsWith('?')).length, 'şüpheli', out.filter(x=>x.startsWith('?')).length);
// referans bütünlüğü
const ref=[]; const FID=new Set(all.map(([,f])=>f.id));
const T=ctx.TECH_BY_ID||{}; const SP=ctx.SPIRITS;
for (const [t,f] of all) {
  const fx=f.fx||{};
  for (const p of (f.pre||[]).flat(2)) if(!FID.has(p)) ref.push(`${t} ${f.id}: ön koşul ${p} yok`);
  for (const p of f.excl||[]) if(!FID.has(p)) ref.push(`${t} ${f.id}: dışlama ${p} yok`);
  for (const k of ['tech','tech2']) for (const x of [].concat(fx[k]||[])) if(!T[x]) ref.push(`${t} ${f.id}: teknoloji ${x} yok`);
  for (const k of ['spirit','rmSpirit']) for (const x of [].concat(fx[k]||[])) if(!SP[x]) ref.push(`${t} ${f.id}: ruh ${x} yok`);
  for (const u of Object.keys(fx.units||{})) if(!ctx.DEFAULT_TEMPLATES[u]) ref.push(`${t} ${f.id}: birlik türü ${u}?`);
}
const dup={}; for (const [,f] of all) dup[f.id]=(dup[f.id]||0)+1; for (const [k,v] of Object.entries(dup)) if(v>1) ref.push(`yinelenen odak id ${k} x${v}`);
console.log(ref.join('\n')); console.log('referans sorunu', ref.length);
if (ref.length || out.some((x) => !x.startsWith('?'))) process.exitCode = 1;
