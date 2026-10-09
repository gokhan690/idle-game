// Tüm oyunu tek bir HTML dosyasına paketler.
//   dist/demir-cephe.html          : tek başına açılabilen tam sayfa (çevrimdışı)
//   dist/demir-cephe.artifact.html : iskeletsiz gövde (barındırılan önizlemeler için)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'css/style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = scripts.map((s) => `/* ${s} */\n` + readFileSync(join(ROOT, s), 'utf8').replace(/<\/script/gi, '<\\/script')).join('\n');
const app = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<!--/APP-->'));
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&family=Big+Shoulders+Stencil+Display:wght@700;800&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap">';
const icon = 'data:image/svg+xml,' + encodeURIComponent(readFileSync(join(ROOT, 'icons/icon.svg'), 'utf8'));

mkdirSync(join(ROOT, 'dist'), { recursive: true });
const full = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#151a16">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Demir Cephe</title>
<link rel="icon" href="${icon}">
${fonts}
<style>${css}</style>
</head>
<body>
${app}
<script>window.__NO_SW__ = true;</script>
<script>${js}</script>
</body>
</html>
`;
writeFileSync(join(ROOT, 'dist/demir-cephe.html'), full);

const body = `<title>Demir Cephe</title>
${fonts}
<style>${css}</style>
${app}
<script>window.__NO_SW__ = true;</script>
<script>${js}</script>
`;
writeFileSync(join(ROOT, 'dist/demir-cephe.artifact.html'), body);
console.log('dist/demir-cephe.html', (full.length / 1048576).toFixed(2), 'MB');
