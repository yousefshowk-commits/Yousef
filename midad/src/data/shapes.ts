// توليد الأشكال الزخرفية كمسارات SVG متمركزة حول (0,0) بعرض w وارتفاع h.
import type { ShapeKind, ShapeObj } from '../state/types';

const f = (n: number) => Math.round(n * 100) / 100;

function poly(pts: [number, number][]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
}

function starPts(n: number, rx: number, ry: number, inner: number, rot = -Math.PI / 2): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 1 : inner;
    const a = rot + (i * Math.PI) / n;
    pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]);
  }
  return pts;
}

function ellipse(rx: number, ry: number): string {
  return `M${f(-rx)} 0A${f(rx)} ${f(ry)} 0 1 0 ${f(rx)} 0A${f(rx)} ${f(ry)} 0 1 0 ${f(-rx)} 0Z`;
}

function rect(x: number, y: number, w: number, h: number, r = 0): string {
  if (!r) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  r = Math.min(r, w / 2, h / 2);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
}

/** حافة متموجة (فصوص) حول قطع ناقص */
function scalloped(n: number, rx: number, ry: number, depth: number): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = Math.cos(a) * rx * (1 - depth);
    const y = Math.sin(a) * ry * (1 - depth);
    if (i === 0) d += `M${f(x)} ${f(y)}`;
    else {
      const am = a - Math.PI / n;
      const cx = Math.cos(am) * rx * (1 + depth * 0.6);
      const cy = Math.sin(am) * ry * (1 + depth * 0.6);
      d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
    }
  }
  return d + 'Z';
}

function flower(n: number, rx: number, ry: number, inner: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const a1 = a0 + (2 * Math.PI) / n;
    const am = (a0 + a1) / 2;
    const p0 = [Math.cos(a0) * rx * inner, Math.sin(a0) * ry * inner];
    const p1 = [Math.cos(a1) * rx * inner, Math.sin(a1) * ry * inner];
    const c1 = [Math.cos(am - 0.35) * rx * 1.15, Math.sin(am - 0.35) * ry * 1.15];
    const c2 = [Math.cos(am + 0.35) * rx * 1.15, Math.sin(am + 0.35) * ry * 1.15];
    if (i === 0) d += `M${f(p0[0])} ${f(p0[1])}`;
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p1[0])} ${f(p1[1])}`;
  }
  return d + 'Z';
}

function arch(w: number, h: number, inner: number): string {
  // محراب: قوس مدبب فوق مستطيل، مع فراغ داخلي
  const outer = (x: number, y: number, ww: number, hh: number) => {
    const shoulder = y + hh * 0.42;
    return `M${f(x)} ${f(y + hh)}V${f(shoulder)}C${f(x)} ${f(y + hh * 0.15)} ${f(x + ww * 0.32)} ${f(y + hh * 0.06)} ${f(x + ww / 2)} ${f(y)}C${f(x + ww * 0.68)} ${f(y + hh * 0.06)} ${f(x + ww)} ${f(y + hh * 0.15)} ${f(x + ww)} ${f(shoulder)}V${f(y + hh)}Z`;
  };
  const t = Math.max(2, Math.min(w, h) * inner * 0.25);
  return outer(-w / 2, -h / 2, w, h) + (inner > 0 ? outer(-w / 2 + t, -h / 2 + t * 1.6, w - 2 * t, h - t * 2.6) : '');
}

function cartouche(w: number, h: number): string {
  // خرطوشة بأطراف مقعرة
  const x = -w / 2;
  const y = -h / 2;
  const c = Math.min(w, h) * 0.22;
  return `M${f(x + c)} ${f(y)}H${f(x + w - c)}A${f(c)} ${f(c)} 0 0 0 ${f(x + w)} ${f(y + c)}V${f(y + h - c)}A${f(c)} ${f(c)} 0 0 0 ${f(x + w - c)} ${f(y + h)}H${f(x + c)}A${f(c)} ${f(c)} 0 0 0 ${f(x)} ${f(y + h - c)}V${f(y + c)}A${f(c)} ${f(c)} 0 0 0 ${f(x + c)} ${f(y)}Z`;
}

function lozenge(w: number, h: number): string {
  // شكل بيضاوي بطرفين مدببين (لوزة)
  return `M${f(-w / 2)} 0C${f(-w * 0.25)} ${f(-h * 0.62)} ${f(w * 0.25)} ${f(-h * 0.62)} ${f(w / 2)} 0C${f(w * 0.25)} ${f(h * 0.62)} ${f(-w * 0.25)} ${f(h * 0.62)} ${f(-w / 2)} 0Z`;
}

function crescent(w: number, h: number, inner: number): string {
  // هلال: تقاطع دائرتين — قوس الدائرة الكبيرة ثم قوس الدائرة الداخلية المزاحة
  const R0 = 1;
  const r = 0.82;
  const d = 0.25 + Math.max(0, Math.min(1, inner)) * 0.5;
  const x = (R0 * R0 - r * r + d * d) / (2 * d);
  const y = Math.sqrt(Math.max(0, R0 * R0 - x * x));
  const sx = w / 2;
  const sy = h / 2;
  const largeInner = x - d > 0 ? 1 : 0;
  return `M${f(x * sx)} ${f(-y * sy)}A${f(sx)} ${f(sy)} 0 1 0 ${f(x * sx)} ${f(y * sy)}A${f(r * sx)} ${f(r * sy)} 0 ${largeInner} 1 ${f(x * sx)} ${f(-y * sy)}Z`;
}

function frame(w: number, h: number, inner: number): string {
  const t = Math.max(2, Math.min(w, h) * inner * 0.2);
  return rect(-w / 2, -h / 2, w, h) + rect(-w / 2 + t, -h / 2 + t, w - 2 * t, h - 2 * t);
}

function ornateFrame(w: number, h: number, inner: number): string {
  // إطار مزدوج بزوايا مربعة ونجوم صغيرة
  const t = Math.max(2, Math.min(w, h) * (0.01 + inner * 0.02));
  const g = t * 2.6;
  let d = '';
  d += rect(-w / 2, -h / 2, w, h) + rect(-w / 2 + t, -h / 2 + t, w - 2 * t, h - 2 * t);
  const iw = w - 2 * (t + g);
  const ih = h - 2 * (t + g);
  d += rect(-iw / 2, -ih / 2, iw, ih) + rect(-iw / 2 + t * 0.6, -ih / 2 + t * 0.6, iw - t * 1.2, ih - t * 1.2);
  const cs = (t + g) * 1.25;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const cx = sx * (w / 2 - (t + g) / 2);
    const cy = sy * (h / 2 - (t + g) / 2);
    d += poly(starPts(8, cs / 2, cs / 2, 0.55).map(([x, y]) => [x + cx, y + cy] as [number, number]));
  }
  // معينات في منتصف الأضلاع
  const m = (t + g) * 0.7;
  for (const [cx, cy] of [
    [0, -h / 2 + (t + g) / 2],
    [0, h / 2 - (t + g) / 2],
    [-w / 2 + (t + g) / 2, 0],
    [w / 2 - (t + g) / 2, 0],
  ]) {
    d += poly([
      [cx, cy - m / 2],
      [cx + m, cy],
      [cx, cy + m / 2],
      [cx - m, cy],
    ]);
  }
  return d;
}

function divider(w: number, h: number): string {
  // فاصل: خطان مدببان ومعين في المنتصف
  const t = Math.max(1.5, h * 0.08);
  const dm = h / 2;
  const side = (dir: number) =>
    poly([
      [dir * dm * 1.4, -t],
      [dir * w / 2, 0],
      [dir * dm * 1.4, t],
    ]);
  const diamond = poly([
    [0, -dm],
    [dm, 0],
    [0, dm],
    [-dm, 0],
  ]);
  const r = dm * 0.18;
  return side(-1) + side(1) + diamond + ellipseAt(-dm * 1.25, 0, r, r) + ellipseAt(dm * 1.25, 0, r, r);
}

function ellipseAt(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}

function leaf(w: number, h: number): string {
  return `M0 ${f(h / 2)}C${f(-w * 0.75)} ${f(h * 0.1)} ${f(-w * 0.35)} ${f(-h * 0.35)} 0 ${f(-h / 2)}C${f(w * 0.35)} ${f(-h * 0.35)} ${f(w * 0.75)} ${f(h * 0.1)} 0 ${f(h / 2)}Z`;
}

function lantern(w: number, h: number): string {
  // فانوس رمضان مبسّط
  const x = w / 2;
  const y = h / 2;
  return (
    `M${f(-x * 0.18)} ${f(-y)}H${f(x * 0.18)}L${f(x * 0.3)} ${f(-y * 0.78)}H${f(-x * 0.3)}Z` +
    `M${f(-x * 0.55)} ${f(-y * 0.72)}H${f(x * 0.55)}L${f(x)} ${f(-y * 0.45)}V${f(y * 0.45)}L${f(x * 0.55)} ${f(y * 0.72)}H${f(-x * 0.55)}L${f(-x)} ${f(y * 0.45)}V${f(-y * 0.45)}Z` +
    `M${f(-x * 0.4)} ${f(y * 0.78)}H${f(x * 0.4)}L${f(x * 0.15)} ${f(y)}H${f(-x * 0.15)}Z` +
    // نوافذ (تُفرّغ بقاعدة evenodd)
    `M${f(-x * 0.62)} ${f(-y * 0.38)}H${f(-x * 0.12)}V${f(y * 0.38)}H${f(-x * 0.62)}Z` +
    `M${f(x * 0.12)} ${f(-y * 0.38)}H${f(x * 0.62)}V${f(y * 0.38)}H${f(x * 0.12)}Z`
  );
}

function heart(w: number, h: number): string {
  return `M0 ${f(h * 0.45)}C${f(-w * 0.9)} ${f(-h * 0.1)} ${f(-w * 0.35)} ${f(-h * 0.75)} 0 ${f(-h * 0.22)}C${f(w * 0.35)} ${f(-h * 0.75)} ${f(w * 0.9)} ${f(-h * 0.1)} 0 ${f(h * 0.45)}Z`;
}

export function shapePath(o: Pick<ShapeObj, 'shape' | 'w' | 'h' | 'points' | 'inner'>): string {
  const { w, h } = o;
  const rx = w / 2;
  const ry = h / 2;
  switch (o.shape) {
    case 'rect':
      return rect(-rx, -ry, w, h);
    case 'roundRect':
      return rect(-rx, -ry, w, h, Math.min(w, h) * 0.5 * Math.max(0.02, o.inner));
    case 'ellipse':
      return ellipse(rx, ry);
    case 'star':
      return poly(starPts(Math.max(3, o.points), rx, ry, o.inner));
    case 'rubElHizb': {
      // خاتم: مربعان متداخلان
      return poly(starPts(8, rx, ry, 0.765, -Math.PI / 2)) + (o.inner < 0.99 ? ellipse(rx * o.inner * 0.55, ry * o.inner * 0.55) : '');
    }
    case 'shamsa':
      return poly(starPts(Math.max(8, o.points), rx, ry, 0.8)) + ellipse(rx * 0.62, ry * 0.62);
    case 'medallion':
      return scalloped(Math.max(6, o.points), rx, ry, 0.08 + o.inner * 0.12);
    case 'flower':
      return flower(Math.max(3, o.points), rx, ry, o.inner);
    case 'polygon': {
      const n = Math.max(3, o.points);
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
      }
      return poly(pts);
    }
    case 'arch':
      return arch(w, h, o.inner);
    case 'cartouche':
      return cartouche(w, h);
    case 'lozenge':
      return lozenge(w, h);
    case 'crescent':
      return crescent(w, h, o.inner);
    case 'frame':
      return frame(w, h, o.inner);
    case 'ornateFrame':
      return ornateFrame(w, h, o.inner);
    case 'divider':
      return divider(w, h);
    case 'rhombus':
      return poly([
        [0, -ry],
        [rx, 0],
        [0, ry],
        [-rx, 0],
      ]);
    case 'leaf':
      return leaf(w, h);
    case 'lantern':
      return lantern(w, h);
    case 'heart':
      return heart(w, h);
  }
}

export const SHAPE_LIBRARY: { kind: ShapeKind; label: string; w: number; h: number; points?: number; inner?: number }[] = [
  { kind: 'ornateFrame', label: 'إطار مزخرف', w: 900, h: 600, inner: 1 },
  { kind: 'frame', label: 'إطار بسيط', w: 900, h: 600, inner: 0.15 },
  { kind: 'arch', label: 'محراب', w: 500, h: 700, inner: 0.3 },
  { kind: 'cartouche', label: 'خرطوشة', w: 700, h: 260 },
  { kind: 'lozenge', label: 'لوزة', w: 700, h: 300 },
  { kind: 'shamsa', label: 'شمسة', w: 500, h: 500, points: 16 },
  { kind: 'medallion', label: 'ميدالية', w: 500, h: 500, points: 12, inner: 0.5 },
  { kind: 'rubElHizb', label: 'خاتم ثماني', w: 500, h: 500, inner: 1 },
  { kind: 'star', label: 'نجمة', w: 400, h: 400, points: 12, inner: 0.6 },
  { kind: 'flower', label: 'وردة', w: 400, h: 400, points: 8, inner: 0.45 },
  { kind: 'crescent', label: 'هلال', w: 300, h: 300, inner: 0.3 },
  { kind: 'lantern', label: 'فانوس', w: 220, h: 400 },
  { kind: 'divider', label: 'فاصل', w: 600, h: 50 },
  { kind: 'rhombus', label: 'نقطة (معين)', w: 60, h: 60 },
  { kind: 'leaf', label: 'ورقة', w: 160, h: 300 },
  { kind: 'heart', label: 'قلب', w: 300, h: 280 },
  { kind: 'ellipse', label: 'دائرة', w: 400, h: 400 },
  { kind: 'roundRect', label: 'مستطيل مستدير', w: 600, h: 300, inner: 0.15 },
  { kind: 'rect', label: 'مستطيل', w: 600, h: 300 },
  { kind: 'polygon', label: 'مضلع', w: 400, h: 400, points: 8 },
];
