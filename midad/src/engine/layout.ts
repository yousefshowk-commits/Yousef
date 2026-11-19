// تخطيط كائن النص: تشكيل الأسطر، المحاذاة، الكشيدة، تعديلات الحروف، والتراكيب (قوس، دائرة، موجة، مرآة، وردة).
import type { TextObj, GlyphOverride } from '../state/types';
import {
  getLoadedFont,
  glyphData,
  shapeLine,
  transformCmds,
  cmdsBox,
  serializeCmds,
  mul,
  T,
  S,
  R,
  apply,
  type Mat,
  type LoadedFont,
  type ShapedGlyph,
  type PathCmd,
  type PointFn,
} from './hb';
import { applyAutoKashida, TATWEEL } from './kashida';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PlacedGlyph {
  key: string; // "رقم الحرف.رقم الشكل"
  charIndex: number; // رقم الحرف في نص الكائن
  d: string; // المسار في إحداثيات الكائن
  box: Box | null;
  color?: string;
  copy: number; // 0 = الأصل، أكبر = نسخة (مرآة/وردة)
  warpLin: Mat; // الجزء الخطي لتحويل فضاء السطر ← فضاء الكائن (لتحويل السحب)
  hasOverride: boolean;
}

export interface TextLayoutResult {
  ready: boolean;
  glyphs: PlacedGlyph[];
  box: Box; // حدود الكائن (حول الأصل 0,0)
  font: LoadedFont | null;
}

const EMPTY_BOX: Box = { x0: -50, y0: -20, x1: 50, y1: 20 };

let fontVersion = 0;
export function bumpLayoutVersion() {
  fontVersion++;
}

const cache = new WeakMap<TextObj, { v: number; r: TextLayoutResult }>();

export function layoutText(o: TextObj): TextLayoutResult {
  const c = cache.get(o);
  if (c && c.v === fontVersion) return c.r;
  const r = compute(o);
  cache.set(o, { v: fontVersion, r });
  return r;
}

interface LineShape {
  start: number; // بداية السطر في النص الأصلي
  map: number[]; // رقم الحرف الافتراضي ← رقم الحرف الأصلي (داخل السطر)
  glyphs: ShapedGlyph[];
  width: number;
}

function shapeOne(
  lf: LoadedFont,
  o: TextObj,
  line: string,
  start: number,
  kashidas: number,
  wsUnits: number,
): LineShape {
  const { text: vt, map } = applyAutoKashida(line, kashidas);
  // خصائص الحروف المفردة: من أرقام النص الأصلي إلى أرقام النص الافتراضي
  const cf: Record<number, string[]> = {};
  const keys = Object.keys(o.clusterFeatures);
  if (keys.length) {
    const inv = new Map<number, number>();
    map.forEach((orig, vi) => {
      if (vt[vi] !== TATWEEL || line[orig] === TATWEEL) if (!inv.has(orig)) inv.set(orig, vi);
    });
    for (const k of keys) {
      const local = Number(k) - start;
      if (local < 0 || local >= line.length) continue;
      const vi = inv.get(local);
      if (vi !== undefined) cf[vi] = o.clusterFeatures[k];
    }
  }
  const { glyphs, width } = shapeLine(lf, vt, o.features, cf, wsUnits);
  return { start, map, glyphs, width };
}

function unionBox(a: Box | null, b: Box | null): Box | null {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

const linear = (m: Mat): Mat => [m[0], m[1], m[2], m[3], 0, 0];
const DEG = 180 / Math.PI;

function compute(o: TextObj): TextLayoutResult {
  const lf = getLoadedFont(o.fontId, o.weight);
  if (!lf) return { ready: false, glyphs: [], box: EMPTY_BOX, font: null };
  const s = o.size / lf.upem;
  const wsUnits = o.wordSpacing / s;
  const rawLines = o.text.split('\n');
  let start = 0;
  const lines: LineShape[] = rawLines.map((ln) => {
    const r = shapeOne(lf, o, ln, start, o.autoKashida, wsUnits);
    start += ln.length + 1;
    return r;
  });

  // الضبط بالكشيدة: مدّ الأسطر القصيرة حتى تساوي أطولها
  if (o.align === 'kashida' && lines.length > 1) {
    const tat = lf.font.nominalGlyph(0x0640);
    const tatAdv = tat !== undefined ? lf.font.glyphHAdvance(tat) : 0;
    if (tatAdv > 0) {
      const maxW = Math.max(...lines.map((l) => l.width));
      lines.forEach((l, i) => {
        let extra = o.autoKashida;
        for (let iter = 0; iter < 3; iter++) {
          const gap = maxW - lines[i].width;
          const need = Math.floor(gap / tatAdv);
          if (need <= 0) break;
          extra += need;
          const r = shapeOne(lf, o, rawLines[i], l.start, extra, wsUnits);
          if (r.width > maxW + tatAdv * 0.25) break;
          lines[i] = r;
        }
      });
    }
  }

  const maxWpx = Math.max(1, ...lines.map((l) => l.width * s));
  const lineH = o.size * o.lineHeight;
  const asc = lf.ascender * s;
  const desc = lf.descender * s; // سالب
  const L = o.layout;

  interface Pre {
    key: string;
    charIndex: number;
    gid: number;
    m: Mat; // فضاء الخط ← فضاء السطر (مع تعديل الحرف)
    pivotX: number;
    baseline: number;
    line: number;
    ov?: GlyphOverride;
  }
  const pre: Pre[] = [];
  lines.forEach((ln, li) => {
    const wpx = ln.width * s;
    const off =
      o.align === 'left' ? 0 : o.align === 'center' ? (maxWpx - wpx) / 2 : maxWpx - wpx; // يمين والكشيدة
    const baseline = li * lineH;
    const seen = new Map<number, number>();
    for (const g of ln.glyphs) {
      const orig = ln.start + (ln.map[g.cluster] ?? g.cluster);
      const sub = seen.get(orig) ?? 0;
      seen.set(orig, sub + 1);
      const key = `${orig}.${sub}`;
      const gd = glyphData(lf, g.gid);
      let m: Mat = mul(T(off + g.x * s, baseline - g.y * s), S(s, -s));
      let pivotX = off + (g.x + g.ax / 2) * s;
      const ov = o.overrides[key];
      if (gd.ext) {
        const cx = (gd.ext.x0 + gd.ext.x1) / 2;
        const cy = (gd.ext.y0 + gd.ext.y1) / 2;
        const [px, py] = apply(m, cx, cy);
        pivotX = px;
        if (ov && (ov.dx || ov.dy || ov.rot || ov.scale !== 1)) {
          const k: Mat = mul(
            T(ov.dx + px, ov.dy + py),
            mul(mul(R(ov.rot), S(ov.scale || 1)), T(-px, -py)),
          );
          m = mul(k, m);
        }
      }
      pre.push({ key, charIndex: orig, gid: g.gid, m, pivotX, baseline, line: li, ov });
    }
  });

  // مركز الكتلة قبل التركيب
  const blockTop = -asc;
  const blockBottom = (lines.length - 1) * lineH - desc;
  const cx0 = maxWpx / 2;
  const cy0 = (blockTop + blockBottom) / 2;

  // تحويل التركيب: إما مصفوفة صلبة لكل نسخة، أو دالة ثني نقطية (قوس/دائرة/موجة)
  interface Warp {
    m: Mat; // مصفوفة صلبة (أو مصفوفة بعد الثني)
    fn: PointFn | null;
    lin: Mat; // تقريب خطي عند الحرف (لتحويل السحب)
  }
  const center = T(-cx0, -cy0);
  let maxSeg = 1e9;
  let curveFn: ((line: number) => { fn: PointFn; linAt: (px: number) => Mat }) | null = null;
  if (L.mode === 'arc' || L.mode === 'circle') {
    let r: number;
    if (L.mode === 'circle') {
      const gap = Math.min(0.9, Math.max(0, L.circleGap));
      r = maxWpx / (2 * Math.PI * (1 - gap));
    } else r = Math.max(20, L.radius);
    const top = L.arcSide === 'top';
    maxSeg = Math.max(4, r * 0.06);
    curveFn = (line) => {
      const rl = Math.max(5, top ? r - line * lineH : r + line * lineH);
      const base = line * lineH;
      if (top) {
        return {
          fn: (x, y) => {
            const th = (x - cx0) / rl;
            const rr = rl - (y - base);
            return [rr * Math.sin(th), -rr * Math.cos(th)];
          },
          linAt: (px) => R(((px - cx0) / rl) * DEG),
        };
      }
      return {
        fn: (x, y) => {
          const a = Math.PI - (x - cx0) / rl;
          const rr = rl + (y - base);
          return [rr * Math.sin(a), -rr * Math.cos(a)];
        },
        linAt: (px) => R((-(px - cx0) / rl) * DEG),
      };
    };
  } else if (L.mode === 'wave') {
    const lam = Math.max(20, L.waveLen);
    const k = (2 * Math.PI) / lam;
    const A = L.waveAmp;
    maxSeg = Math.max(4, lam / 24);
    curveFn = (line) => {
      const base = line * lineH;
      return {
        fn: (x, y) => {
          const yo = A * Math.sin(k * x);
          const slope = A * k * Math.cos(k * x);
          const n = 1 / Math.hypot(1, slope);
          const d = y - base;
          // نقطة على المنحنى + إزاحة على العمودي
          return [x - cx0 - d * slope * n, base + yo - cy0 + d * n];
        },
        linAt: (px) => R(Math.atan(A * k * Math.cos(k * px)) * DEG),
      };
    };
  }

  const warps = (p: Pre): Warp[] => {
    if (curveFn) {
      const c = curveFn(p.line);
      const rot = L.mode === 'wave' ? I0 : R(L.rotateStart);
      const fn: PointFn = L.mode === 'wave' ? c.fn : (x, y) => {
        const q = c.fn(x, y);
        return apply(rot, q[0], q[1]);
      };
      return [{ m: I0, fn, lin: mul(rot, c.linAt(p.pivotX)) }];
    }
    switch (L.mode) {
      case 'mirror': {
        const g = L.mirrorGap;
        if (L.mirrorAxis === 'vertical') {
          const orig = T(g / 2, -cy0);
          return [orig, mul(S(-1, 1), orig)].map((m) => ({ m, fn: null, lin: linear(m) }));
        }
        const orig = T(-cx0, -blockBottom - g / 2);
        return [orig, mul(S(1, -1), orig)].map((m) => ({ m, fn: null, lin: linear(m) }));
      }
      case 'reflect': {
        const orig = T(-cx0, -blockBottom - L.mirrorGap / 2);
        return [orig, mul(S(1, -1), orig)].map((m) => ({ m, fn: null, lin: linear(m) }));
      }
      case 'rosette': {
        const n = Math.max(2, Math.min(36, Math.round(L.rosetteCount)));
        const out: Warp[] = [];
        for (let i = 0; i < n; i++) {
          const m = mul(R(L.rotateStart + (i * 360) / n), mul(T(0, -L.rosetteRadius), center));
          out.push({ m, fn: null, lin: linear(m) });
        }
        return out;
      }
      default:
        return [{ m: center, fn: null, lin: I0 }];
    }
  };

  // المرور الأول: الأشكال المحوّلة والحدود
  interface Final {
    p: Pre;
    cmds: PathCmd[];
    lin: Mat;
    copy: number;
    box: Box | null;
  }
  const finals: Final[] = [];
  let bb: Box | null = null;
  for (const p of pre) {
    const gd = glyphData(lf, p.gid);
    if (!gd.cmds.length) continue;
    warps(p).forEach((w, copy) => {
      const cmds = transformCmds(gd.cmds, mul(w.m, p.m), w.fn, maxSeg);
      const box = cmdsBox(cmds);
      if (!p.ov?.hidden) bb = unionBox(bb, box);
      finals.push({ p, cmds, lin: w.lin, copy, box });
    });
  }
  const B: Box = bb ?? EMPTY_BOX;
  const ccx = (B.x0 + B.x1) / 2;
  const ccy = (B.y0 + B.y1) / 2;

  const glyphs: PlacedGlyph[] = [];
  for (const f of finals) {
    if (f.p.ov?.hidden) continue;
    glyphs.push({
      key: f.p.key,
      charIndex: f.p.charIndex,
      d: serializeCmds(f.cmds, -ccx, -ccy),
      box: f.box && { x0: f.box.x0 - ccx, y0: f.box.y0 - ccy, x1: f.box.x1 - ccx, y1: f.box.y1 - ccy },
      color: f.p.ov?.color,
      copy: f.copy,
      warpLin: f.lin,
      hasOverride: !!f.p.ov,
    });
  }
  return {
    ready: true,
    glyphs,
    box: { x0: B.x0 - ccx, y0: B.y0 - ccy, x1: B.x1 - ccx, y1: B.y1 - ccy },
    font: lf,
  };
}

const I0: Mat = [1, 0, 0, 1, 0, 0];
