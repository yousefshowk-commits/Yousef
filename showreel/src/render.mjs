import { chromium } from 'playwright';
import fs from 'fs';
const [,, outDir, framesArg, samplesArg] = process.argv;
const frames = framesArg.includes('-') ? (() => { const [a, b, s = 1] = framesArg.split(/[-:]/).map(Number); const o = []; for (let f = a; f <= b; f += s) o.push(f); return o; })() : framesArg.split(',').map(Number);
const samples = Number(samplesArg || 4);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => console.log('PAGE', m.text())); page.on('pageerror', e => console.log('ERR', e.message));
await page.goto('file://' + process.cwd() + '/index.html');
await page.evaluate(() => window.ready);
const t0 = Date.now();
for (const f of frames) {
  const d = await page.evaluate(([f, s]) => window.renderFrame(f, s), [f, samples]);
  fs.writeFileSync(`${outDir}/f${String(f).padStart(4, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
}
console.log('done', frames.length, 'frames in', (Date.now() - t0) / 1000, 's');
await browser.close();
