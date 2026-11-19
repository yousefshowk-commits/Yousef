// يدمج نسخة --mode offline مع كل الخطوط في ملف HTML واحد: release/midad.html
// الاستخدام: npm run build:offline
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-offline');
const fontsDir = join(root, 'public', 'fonts');

let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
const jsFile = assets.find((f) => f.endsWith('.js'));
const cssFile = assets.find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('شغّل vite build --mode offline أولًا');

const js = readFileSync(join(dist, 'assets', jsFile), 'utf8').replace(/<\/script/gi, '<\\/script');
// خط الواجهة يُسجَّل من البيانات المضمّنة، فنحذف @font-face التي تشير لملفات خارجية
const css = readFileSync(join(dist, 'assets', cssFile), 'utf8').replace(/@font-face\{[^}]*fonts\/[^}]*\}/g, '');

const fonts = {};
let bytes = 0;
for (const f of readdirSync(fontsDir).sort()) {
  if (!/\.(ttf|otf)$/i.test(f)) continue;
  const b = readFileSync(join(fontsDir, f));
  bytes += b.length;
  fonts[f] = b.toString('base64');
}
const licenses = readFileSync(join(fontsDir, 'LICENSES-OFL.txt'), 'utf8').replace(/--/g, '- -');

html = html
  .replace(/<script type="module"[^>]*src="[^"]*"><\/script>/, '')
  .replace(/<link rel="modulepreload"[^>]*>/g, '')
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`)
  // دوال الاستبدال تمنع تفسير $ داخل الكود كأنماط استبدال
  .replace(
    '</body>',
    () => `<script>window.__MIDAD_FONTS=${JSON.stringify(fonts)};</script>\n<script type="module">${js}</script>\n</body>`,
  )
  .replace('<html', () => `<!--\nمِداد — استوديو الخط العربي (نسخة الملف الواحد، تعمل دون إنترنت)\n\n${licenses}\n-->\n<html`);
// التعليق يجب أن يأتي بعد doctype
html = html.replace(/^(<!--[\s\S]*?-->\n)(<!doctype html>\n?)/i, '$2$1');

mkdirSync(join(root, 'release'), { recursive: true });
const out = join(root, 'release', 'midad.html');
writeFileSync(out, html);
console.log(`release/midad.html — ${(html.length / 1048576).toFixed(1)} MB (${Object.keys(fonts).length} خطًا، ${(bytes / 1048576).toFixed(1)} MB قبل الترميز)`);
