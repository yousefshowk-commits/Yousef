import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Doc } from '../state/types';
import { DocSvg } from '../components/render';
import { loadFont } from './hb';
import { bumpLayoutVersion } from './layout';
import { FONT_MAP, cssFamily } from '../data/fonts';
import { embeddedFont } from './embedded';

/** تأكد من تحميل كل خطوط المستند قبل التصدير */
export async function ensureFonts(doc: Doc): Promise<void> {
  const jobs = doc.objects.filter((o) => o.type === 'text').map((o) => loadFont(o.fontId, o.weight));
  await Promise.all(jobs);
  bumpLayoutVersion();
}

export async function docToSvgString(doc: Doc, transparent = false): Promise<string> {
  await ensureFonts(doc);
  const markup = renderToStaticMarkup(createElement(DocSvg, { doc, transparent, prefix: 'x' }));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
}

export async function docToCanvas(doc: Doc, scale: number, transparent: boolean, bgForJpg?: string): Promise<HTMLCanvasElement> {
  const svg = await docToSvgString(doc, transparent);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('تعذر رسم الصورة'));
      img.src = url;
    });
    const w = Math.round(doc.width * scale);
    const h = Math.round(doc.height * scale);
    const max = 16384;
    if (w > max || h > max) throw new Error('المقاس كبير جدًا، اختر مضاعفًا أصغر');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    if (bgForJpg) {
      ctx.fillStyle = bgForJpg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface DownloadsNs {
  save: (r: { filename: string; data: Blob }) => Promise<{ status: string }>;
}
type ClaudeHost = { use?: (name: string) => Promise<unknown> };

/** حفظ ملف: عبر قدرة التنزيل في claude.ai إن كانت متاحة، وإلا رابط تنزيل عادي */
export async function download(blob: Blob, name: string): Promise<void> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const ns = (await host.use('downloads').catch(() => null)) as DownloadsNs | null;
    if (ns) {
      try {
        await ns.save({ filename: name, data: blob });
        return;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'declined') throw new Error('أُلغي الحفظ');
        if (code === 'rate_limited') throw new Error('هناك نافذة حفظ مفتوحة بالفعل، حاول بعد لحظة');
        throw new Error('الحفظ غير متاح في هذا العرض');
      }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportPng(doc: Doc, scale: number, transparent: boolean, name: string) {
  const c = await docToCanvas(doc, scale, transparent);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (!blob) throw new Error('فشل إنشاء الصورة');
  await download(blob, `${name}.png`);
}

export async function exportJpg(doc: Doc, scale: number, name: string) {
  const c = await docToCanvas(doc, scale, false, '#ffffff');
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.93));
  if (!blob) throw new Error('فشل إنشاء الصورة');
  await download(blob, `${name}.jpg`);
}

export async function exportSvg(doc: Doc, transparent: boolean, name: string) {
  const s = await docToSvgString(doc, transparent);
  await download(new Blob([s], { type: 'image/svg+xml' }), `${name}.svg`);
}

export function exportProject(doc: Doc, name: string): Promise<void> {
  return download(new Blob([JSON.stringify(doc)], { type: 'application/json' }), `${name}.midad.json`);
}

export async function readProject(file: File): Promise<Doc> {
  const text = await file.text();
  const d = JSON.parse(text) as Doc;
  if (!d || d.version !== 1 || !Array.isArray(d.objects)) throw new Error('ملف غير صالح');
  return d;
}

// ———— معاينة الخطوط في الواجهة عبر CSS
const registered = new Set<string>();
export function ensureCssFont(id: string) {
  if (registered.has(id)) return;
  const def = FONT_MAP[id];
  if (!def || def.user) return; // المستورد يُسجَّل من بياناته مباشرة
  registered.add(id);
  try {
    const emb = embeddedFont(def.file);
    const ff = new FontFace(cssFamily(id), emb ?? `url(${import.meta.env.BASE_URL}fonts/${def.file})`);
    document.fonts.add(ff);
    void ff.load().catch(() => undefined);
  } catch {
    /* المتصفح لا يدعم FontFace */
  }
}
