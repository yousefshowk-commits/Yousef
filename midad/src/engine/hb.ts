// محرك التشكيل: تحميل الخطوط في HarfBuzz وتشكيل النص العربي وتحويل الأشكال إلى مسارات.
import * as hb from 'harfbuzzjs';
import { getFont, type FontDef, featureLabel, isUsefulFeature } from '../data/fonts';
import { embeddedFont } from './embedded';

export interface PathCmd {
  type: string; // M L Q C Z
  values: number[];
}

export interface GlyphData {
  cmds: PathCmd[];
  ext: { x0: number; y0: number; x1: number; y1: number } | null; // بوحدات الخط، y للأعلى
}

export interface LoadedFont {
  key: string;
  def: FontDef;
  font: hb.Font;
  face: hb.Face;
  upem: number;
  ascender: number;
  descender: number;
  features: { tag: string; label: string; hint?: string }[];
  glyphs: Map<number, GlyphData>;
}

const BASE = import.meta.env.BASE_URL;
const blobCache = new Map<string, Promise<hb.Face>>();
const fontCache = new Map<string, LoadedFont>();
const pending = new Map<string, Promise<LoadedFont>>();
const listeners = new Set<() => void>();

/** إشعار الواجهة عند اكتمال تحميل خط */
export function onFontsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function fileFor(def: FontDef, weight: number): string {
  if (!def.variable && def.bold && weight >= 600) return def.bold;
  return def.file;
}

// بيانات الخطوط المستوردة من جهاز المستخدم (file = "user:<id>")
const userBuffers = new Map<string, ArrayBuffer>();

export function setUserFontBuffer(file: string, data: ArrayBuffer) {
  userBuffers.set(file, data);
}

/** حذف خط من الذاكرة المؤقتة (عند حذف خط مستورد) */
export function forgetFont(fontId: string, file: string) {
  userBuffers.delete(file);
  blobCache.delete(file);
  for (const k of [...fontCache.keys()]) if (k.startsWith(`${fontId}@`)) fontCache.delete(k);
}

export function notifyFontsChanged() {
  listeners.forEach((fn) => fn());
}

function loadFace(file: string): Promise<hb.Face> {
  let p = blobCache.get(file);
  if (!p && file.startsWith('user:')) {
    const buf = userBuffers.get(file);
    p = buf ? Promise.resolve(new hb.Face(new hb.Blob(buf.slice(0)))) : Promise.reject(new Error('الخط المستورد غير موجود'));
    blobCache.set(file, p);
  }
  if (!p) {
    const emb = embeddedFont(file);
    if (emb) {
      p = Promise.resolve(new hb.Face(new hb.Blob(emb)));
      blobCache.set(file, p);
    }
  }
  if (!p) {
    p = fetch(`${BASE}fonts/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`تعذر تحميل الخط ${file}`);
        return r.arrayBuffer();
      })
      .then((buf) => new hb.Face(new hb.Blob(buf)));
    blobCache.set(file, p);
  }
  return p;
}

export function fontKey(fontId: string, weight: number): string {
  const def = getFont(fontId);
  if (def.variable) {
    const w = Math.max(def.variable.min, Math.min(def.variable.max, Math.round(weight || def.variable.def)));
    return `${def.id}@${w}`;
  }
  return `${def.id}@${fileFor(def, weight)}`;
}

/** يعيد الخط إن كان محمّلًا، وإلا يبدأ تحميله ويعيد null */
export function getLoadedFont(fontId: string, weight: number): LoadedFont | null {
  const key = fontKey(fontId, weight);
  const f = fontCache.get(key);
  if (f) return f;
  void loadFont(fontId, weight);
  return null;
}

export function loadFont(fontId: string, weight: number): Promise<LoadedFont> {
  const key = fontKey(fontId, weight);
  const cached = fontCache.get(key);
  if (cached) return Promise.resolve(cached);
  let p = pending.get(key);
  if (p) return p;
  const def = getFont(fontId);
  p = loadFace(fileFor(def, weight)).then((face) => {
    const font = new hb.Font(face);
    if (def.variable) {
      const w = Number(key.split('@')[1]);
      font.setVariations([new hb.Variation('wght', w)]);
    }
    const ext = font.hExtents();
    const upem = face.upem;
    const tags = new Set<string>();
    const features: { tag: string; label: string; hint?: string }[] = [];
    try {
      const all = face.getTableFeatureTags('GSUB');
      all.forEach((tag, i) => {
        if (!isUsefulFeature(tag) || tags.has(tag)) return;
        tags.add(tag);
        let fromFont: string | undefined;
        try {
          const ids = face.getFeatureNameIds('GSUB', i);
          if (ids && ids.uiLabelNameId) {
            const n = face.getName(ids.uiLabelNameId, 'ar') || face.getName(ids.uiLabelNameId, 'en');
            if (n) fromFont = n;
          }
        } catch {
          /* لا أسماء */
        }
        features.push({ tag, label: featureLabel(tag), hint: fromFont });
      });
    } catch {
      /* لا GSUB */
    }
    features.sort((a, b) => a.tag.localeCompare(b.tag));
    const lf: LoadedFont = {
      key,
      def,
      font,
      face,
      upem,
      ascender: ext.ascender,
      descender: ext.descender,
      features,
      glyphs: new Map(),
    };
    fontCache.set(key, lf);
    pending.delete(key);
    listeners.forEach((fn) => fn());
    return lf;
  });
  pending.set(key, p);
  return p;
}

export function glyphData(lf: LoadedFont, gid: number): GlyphData {
  let g = lf.glyphs.get(gid);
  if (!g) {
    const cmds = lf.font.glyphToJson(gid) as PathCmd[];
    const e = lf.font.glyphExtents(gid);
    const ext =
      e && e.width !== 0
        ? {
            x0: e.xBearing,
            x1: e.xBearing + e.width,
            y1: e.yBearing,
            y0: e.yBearing + e.height,
          }
        : null;
    g = { cmds, ext };
    lf.glyphs.set(gid, g);
  }
  return g;
}

export interface ShapedGlyph {
  gid: number;
  cluster: number; // رقم الحرف داخل السطر
  x: number; // موضع القلم + الإزاحة (وحدات الخط)
  y: number;
  ax: number;
}

// ———— ثنائية الاتجاه (مبسطة): أساس السطر من اليمين لليسار، والأرقام واللاتينية مقاطع من اليسار لليمين
function charDir(ch: number): 'R' | 'L' | 'N' {
  if (
    (ch >= 0x0600 && ch <= 0x065f) ||
    (ch >= 0x066a && ch <= 0x06ef) ||
    (ch >= 0x06fa && ch <= 0x08ff) ||
    (ch >= 0xfb50 && ch <= 0xfdff) ||
    (ch >= 0xfe70 && ch <= 0xfeff) ||
    ch === 0x200f
  )
    return 'R';
  if (
    (ch >= 0x30 && ch <= 0x39) ||
    (ch >= 0x41 && ch <= 0x5a) ||
    (ch >= 0x61 && ch <= 0x7a) ||
    (ch >= 0x0660 && ch <= 0x0669) ||
    (ch >= 0x06f0 && ch <= 0x06f9) ||
    (ch >= 0xc0 && ch <= 0x24f) ||
    ch === 0x200e
  )
    return 'L';
  return 'N';
}

interface Run {
  start: number;
  end: number;
  rtl: boolean;
}

function bidiRuns(text: string): Run[] {
  const n = text.length;
  if (!n) return [];
  const dirs: ('R' | 'L' | 'N')[] = [];
  for (let i = 0; i < n; i++) dirs.push(charDir(text.charCodeAt(i)));
  // المحايد بين حرفين لاتينيين يتبعهما، وإلا يتبع الأساس (يمين)
  const resolved = dirs.map((d, i) => {
    if (d !== 'N') return d;
    let prev: string = 'R';
    for (let j = i - 1; j >= 0; j--) if (dirs[j] !== 'N') { prev = dirs[j]; break; }
    let next: string = 'R';
    for (let j = i + 1; j < n; j++) if (dirs[j] !== 'N') { next = dirs[j]; break; }
    // الفواصل العشرية والنقطتان بين الأرقام
    return prev === 'L' && next === 'L' ? 'L' : 'R';
  });
  const runs: Run[] = [];
  let s = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || resolved[i] !== resolved[s]) {
      runs.push({ start: s, end: i, rtl: resolved[s] === 'R' });
      s = i;
    }
  }
  return runs;
}

/**
 * تشكيل سطر واحد. يعيد الأشكال بترتيبها المرئي (من اليسار لليمين) مع العرض الكلي.
 * features: خصائص عامة، clusterFeatures: خصائص لحرف بعينه (رقم الحرف داخل السطر).
 */
export function shapeLine(
  lf: LoadedFont,
  text: string,
  features: string[],
  clusterFeatures: Record<number, string[]>,
  wordSpacing: number,
): { glyphs: ShapedGlyph[]; width: number } {
  const runs = bidiRuns(text);
  const feats: hb.Feature[] = features.map((t) => new hb.Feature(t, 1));
  for (const [k, tags] of Object.entries(clusterFeatures)) {
    const c = Number(k);
    for (const t of tags) feats.push(new hb.Feature(t, 1, c, c + 1));
  }
  // الأساس من اليمين: المقاطع تُرسم بترتيب معكوس
  const visualRuns = [...runs].reverse();
  const out: ShapedGlyph[] = [];
  let pen = 0;
  for (const run of visualRuns) {
    const buf = new hb.Buffer();
    buf.addText(text, run.start, run.end - run.start);
    buf.setDirection(run.rtl ? hb.Direction.RTL : hb.Direction.LTR);
    buf.setScript(run.rtl ? 'Arab' : 'Latn');
    buf.setLanguage(run.rtl ? 'ar' : 'en');
    hb.shape(lf.font, buf, feats);
    const infos = buf.getGlyphInfos();
    const pos = buf.getGlyphPositions();
    for (let i = 0; i < infos.length; i++) {
      const cl = infos[i].cluster;
      let ax = pos[i].xAdvance;
      if (wordSpacing && text[cl] === ' ' && ax > 0) ax += wordSpacing;
      out.push({ gid: infos[i].codepoint, cluster: cl, x: pen + pos[i].xOffset, y: pos[i].yOffset, ax });
      pen += ax;
    }
  }
  return { glyphs: out, width: pen };
}

// ———— المصفوفات وتحويل المسارات
export type Mat = [number, number, number, number, number, number]; // a b c d e f

export const I: Mat = [1, 0, 0, 1, 0, 0];

export function mul(m: Mat, n: Mat): Mat {
  // m × n (n يُطبّق أولًا)
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const T = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const S = (sx: number, sy = sx): Mat => [sx, 0, 0, sy, 0, 0];
export const R = (deg: number): Mat => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
};

export function apply(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function invert(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function cmdsToPath(cmds: PathCmd[], m: Mat): string {
  let s = '';
  for (const c of cmds) {
    const v = c.values;
    s += c.type;
    for (let i = 0; i + 1 < v.length; i += 2) {
      const [x, y] = apply(m, v[i], v[i + 1]);
      s += `${r2(x)} ${r2(y)} `;
    }
  }
  return s;
}

// ———— الثني الحقيقي للمسارات (للقوس والدائرة والموجة): كل نقطة تُحوّل على حدة مع تقسيم القطع الطويلة
export type PointFn = (x: number, y: number) => [number, number];

function lerp(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** يطبّق المصفوفة m ثم الدالة fn على أوامر المسار. maxSeg: أقصى طول للقطعة قبل التقسيم (بعد m) */
export function transformCmds(cmds: PathCmd[], m: Mat, fn: PointFn | null, maxSeg: number): PathCmd[] {
  const out: PathCmd[] = [];
  let cur = [0, 0];
  let start = [0, 0];
  const P = (x: number, y: number) => apply(m, x, y) as number[];
  const W = (p: number[]) => (fn ? fn(p[0], p[1]) : (p as [number, number]));
  for (const c of cmds) {
    const v = c.values;
    if (c.type === 'M') {
      cur = P(v[0], v[1]);
      start = cur;
      out.push({ type: 'M', values: W(cur) });
    } else if (c.type === 'L') {
      const p = P(v[0], v[1]);
      const n = fn ? Math.min(24, Math.max(1, Math.ceil(Math.hypot(p[0] - cur[0], p[1] - cur[1]) / maxSeg))) : 1;
      for (let i = 1; i <= n; i++) out.push({ type: 'L', values: W(lerp(cur, p, i / n)) });
      cur = p;
    } else if (c.type === 'Q') {
      const c1 = P(v[0], v[1]);
      const p = P(v[2], v[3]);
      const n = fn ? Math.min(12, Math.max(1, Math.ceil((Math.hypot(c1[0] - cur[0], c1[1] - cur[1]) + Math.hypot(p[0] - c1[0], p[1] - c1[1])) / maxSeg))) : 1;
      let p0 = cur;
      let q1 = c1;
      for (let i = n; i >= 1; i--) {
        // تقسيم دي كاستلجو عند t = 1/i من القطعة المتبقية
        const t = 1 / i;
        const a = lerp(p0, q1, t);
        const b = lerp(q1, p, t);
        const mid = lerp(a, b, t);
        const w = W(mid);
        out.push({ type: 'Q', values: [...W(a), ...w] });
        p0 = mid;
        q1 = b;
      }
      cur = p;
    } else if (c.type === 'C') {
      const c1 = P(v[0], v[1]);
      const c2 = P(v[2], v[3]);
      const p = P(v[4], v[5]);
      const len = Math.hypot(c1[0] - cur[0], c1[1] - cur[1]) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(p[0] - c2[0], p[1] - c2[1]);
      const n = fn ? Math.min(12, Math.max(1, Math.ceil(len / maxSeg))) : 1;
      let p0 = cur;
      let a1 = c1;
      let a2 = c2;
      for (let i = n; i >= 1; i--) {
        const t = 1 / i;
        const ab = lerp(p0, a1, t);
        const bc = lerp(a1, a2, t);
        const cd = lerp(a2, p, t);
        const abc = lerp(ab, bc, t);
        const bcd = lerp(bc, cd, t);
        const mid = lerp(abc, bcd, t);
        out.push({ type: 'C', values: [...W(ab), ...W(abc), ...W(mid)] });
        p0 = mid;
        a1 = bcd;
        a2 = cd;
      }
      cur = p;
    } else if (c.type === 'Z') {
      out.push({ type: 'Z', values: [] });
      cur = start;
    }
  }
  return out;
}

export function cmdsBox(cmds: PathCmd[]): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of cmds) {
    for (let i = 0; i + 1 < c.values.length; i += 2) {
      const x = c.values[i];
      const y = c.values[i + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
}

export function serializeCmds(cmds: PathCmd[], dx: number, dy: number): string {
  let s = '';
  for (const c of cmds) {
    s += c.type;
    const v = c.values;
    for (let i = 0; i + 1 < v.length; i += 2) s += `${r2(v[i] + dx)} ${r2(v[i + 1] + dy)} `;
  }
  return s;
}
