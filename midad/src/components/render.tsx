// رسم المستند كـ SVG — يُستخدم في المحرر وفي التصدير (SVG/PNG).
import { createContext, useContext, type ReactNode } from 'react';

/** بادئة للمعرفات حتى لا تتعارض عدة رسوم SVG في الصفحة نفسها */
export const IdPrefix = createContext('');
import type { Background, Doc, Fill, ImageObj, Obj, ShapeObj, Shadow, Glow, TextObj } from '../state/types';
import { layoutText, type Box } from '../engine/layout';
import { shapePath } from '../data/shapes';

export function objTransform(o: Obj): string {
  let t = `translate(${o.x} ${o.y})`;
  if (o.rotation) t += ` rotate(${o.rotation})`;
  if (o.skewX) t += ` skewX(${o.skewX})`;
  if (o.scaleX !== 1 || o.scaleY !== 1) t += ` scale(${o.scaleX} ${o.scaleY})`;
  return t;
}

// ———— التعبئة
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function FillDef({ id, fill, box }: { id: string; fill: Fill; box: Box }): ReactNode {
  if (fill.type === 'linear') {
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const a = (fill.angle * Math.PI) / 180;
    // زاوية 0 = من اليسار لليمين، 90 = من الأعلى للأسفل
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hw = (box.x1 - box.x0) / 2;
    const hh = (box.y1 - box.y0) / 2;
    const len = Math.abs(dx) * hw + Math.abs(dy) * hh || 1;
    return (
      <linearGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        x1={cx - dx * len}
        y1={cy - dy * len}
        x2={cx + dx * len}
        y2={cy + dy * len}
      >
        {fill.stops.map((s, i) => (
          <stop key={i} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
    );
  }
  if (fill.type === 'radial') {
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const r = Math.max(box.x1 - box.x0, box.y1 - box.y0) / 1.6;
    return (
      <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
        {fill.stops.map((s, i) => (
          <stop key={i} offset={s.offset} stopColor={s.color} />
        ))}
      </radialGradient>
    );
  }
  if (fill.type === 'texture') {
    const [r1, g1, b1] = hexToRgb(fill.color);
    const [r2, g2, b2] = hexToRgb(fill.color2);
    const sc = Math.max(0.2, fill.scale || 1);
    const cfg = {
      marble: { type: 'turbulence', freq: `${0.004 / sc} ${0.012 / sc}`, oct: 5, rep: 3 },
      foil: { type: 'fractalNoise', freq: `${0.03 / sc}`, oct: 4, rep: 4 },
      wood: { type: 'fractalNoise', freq: `${0.003 / sc} ${0.09 / sc}`, oct: 3, rep: 5 },
      grain: { type: 'fractalNoise', freq: `${0.6 / sc}`, oct: 2, rep: 1 },
    }[fill.texture];
    const table = (a: number, b: number) => {
      const vals: number[] = [];
      for (let i = 0; i <= cfg.rep; i++) vals.push((i % 2 === 0 ? a : b) / 255);
      return vals.map((v) => v.toFixed(3)).join(' ');
    };
    return (
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type={cfg.type as 'turbulence'} baseFrequency={cfg.freq} numOctaves={cfg.oct} seed={7} result="n" />
        <feColorMatrix in="n" type="saturate" values="0" result="g" />
        <feComponentTransfer in="g" result="c">
          <feFuncR type="table" tableValues={table(r1, r2)} />
          <feFuncG type="table" tableValues={table(g1, g2)} />
          <feFuncB type="table" tableValues={table(b1, b2)} />
          <feFuncA type="linear" slope={0} intercept={1} />
        </feComponentTransfer>
        <feComposite in="c" in2="SourceAlpha" operator="in" />
      </filter>
    );
  }
  return null;
}

function fillAttrs(fill: Fill, id: string): { fill: string; filter?: string } {
  switch (fill.type) {
    case 'solid':
      return { fill: fill.color };
    case 'linear':
    case 'radial':
      return { fill: `url(#${id})` };
    case 'texture':
      return { fill: fill.color, filter: `url(#${id})` };
    default:
      return { fill: 'none' };
  }
}

// ———— الظل والتوهج
function EffectsFilter({ id, shadow, glow }: { id: string; shadow?: Shadow; glow?: Glow }): ReactNode {
  const sh = shadow?.enabled;
  const gl = glow?.enabled;
  if (!sh && !gl) return null;
  return (
    <filter id={id} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
      {gl && (
        <>
          <feGaussianBlur in="SourceAlpha" stdDeviation={glow!.blur} result="gb" />
          <feFlood floodColor={glow!.color} result="gc" />
          <feComposite in="gc" in2="gb" operator="in" result="g1" />
          <feComponentTransfer in="g1" result="glow">
            <feFuncA type="linear" slope={glow!.strength} />
          </feComponentTransfer>
        </>
      )}
      {sh && (
        <>
          <feGaussianBlur in="SourceAlpha" stdDeviation={shadow!.blur} result="sb" />
          <feOffset in="sb" dx={shadow!.dx} dy={shadow!.dy} result="so" />
          <feFlood floodColor={shadow!.color} floodOpacity={shadow!.opacity} result="sc" />
          <feComposite in="sc" in2="so" operator="in" result="shadow" />
        </>
      )}
      <feMerge>
        {sh && <feMergeNode in="shadow" />}
        {gl && <feMergeNode in="glow" />}
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

// ———— النص
export function TextNode({ o }: { o: TextObj }) {
  const prefix = useContext(IdPrefix);
  const lay = layoutText(o);
  if (!lay.ready) return null;
  const pid = `m${prefix}${o.id}`;
  const box = lay.box;
  const isReflect = o.layout.mode === 'reflect';
  const main = lay.glyphs.filter((g) => !isReflect || g.copy === 0);
  const refl = isReflect ? lay.glyphs.filter((g) => g.copy > 0) : [];
  const plain = main.filter((g) => !g.color);
  const colored = main.filter((g) => g.color);
  const dAll = main.map((g) => g.d).join('');
  const dPlain = plain.map((g) => g.d).join('');
  const fa = fillAttrs(o.fill, `${pid}-f`);
  const hasFx = o.shadow.enabled || o.glow.enabled;

  const ex = o.extrude;
  const exCopies: ReactNode[] = [];
  if (ex.enabled && ex.depth > 0) {
    const steps = Math.min(40, Math.max(1, Math.round(ex.depth)));
    const a = (ex.angle * Math.PI) / 180;
    const stepLen = ex.depth / steps;
    for (let i = steps; i >= 1; i--) {
      exCopies.push(
        <use
          key={i}
          href={`#${pid}-all`}
          transform={`translate(${Math.cos(a) * stepLen * i} ${Math.sin(a) * stepLen * i})`}
          fill={ex.color}
          stroke={ex.color}
          strokeWidth={stepLen * 1.5 + (o.stroke.enabled ? o.stroke.width * 2 : 0)}
          strokeLinejoin="round"
        />,
      );
    }
  }

  let reflBox: Box | null = null;
  for (const g of refl) {
    if (!g.box) continue;
    reflBox = reflBox
      ? { x0: Math.min(reflBox.x0, g.box.x0), y0: Math.min(reflBox.y0, g.box.y0), x1: Math.max(reflBox.x1, g.box.x1), y1: Math.max(reflBox.y1, g.box.y1) }
      : { ...g.box };
  }

  return (
    <g transform={objTransform(o)} opacity={o.opacity} style={o.blend !== 'normal' ? { mixBlendMode: o.blend } : undefined}>
      <defs>
        <path id={`${pid}-all`} d={dAll} />
        <FillDef id={`${pid}-f`} fill={o.fill} box={box} />
        <EffectsFilter id={`${pid}-fx`} shadow={o.shadow} glow={o.glow} />
        {reflBox && (
          <linearGradient id={`${pid}-rg`} gradientUnits="userSpaceOnUse" x1={0} y1={reflBox.y0} x2={0} y2={reflBox.y1}>
            <stop offset={0} stopColor="#fff" stopOpacity={1} />
            <stop offset={1} stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        )}
        {reflBox && (
          <mask id={`${pid}-rm`} maskUnits="userSpaceOnUse" x={reflBox.x0 - 10} y={reflBox.y0 - 10} width={reflBox.x1 - reflBox.x0 + 20} height={reflBox.y1 - reflBox.y0 + 20}>
            <rect x={reflBox.x0 - 10} y={reflBox.y0 - 10} width={reflBox.x1 - reflBox.x0 + 20} height={reflBox.y1 - reflBox.y0 + 20} fill={`url(#${pid}-rg)`} />
          </mask>
        )}
      </defs>
      <g filter={hasFx ? `url(#${pid}-fx)` : undefined}>
        {exCopies}
        {o.stroke2.enabled && (
          <use
            href={`#${pid}-all`}
            fill={o.stroke2.color}
            stroke={o.stroke2.color}
            strokeWidth={(o.stroke.enabled ? o.stroke.width * 2 : 0) + o.stroke2.width * 2}
            strokeLinejoin="round"
          />
        )}
        {o.stroke.enabled && (
          <use href={`#${pid}-all`} fill={o.stroke.color} stroke={o.stroke.color} strokeWidth={o.stroke.width * 2} strokeLinejoin="round" />
        )}
        {o.fill.type !== 'none' && <path d={dPlain} fill={fa.fill} filter={fa.filter} />}
        {colored.map((g) => (
          <path key={`${g.key}-${g.copy}`} d={g.d} fill={g.color} />
        ))}
      </g>
      {refl.length > 0 && (
        <g opacity={o.layout.reflectOpacity} mask={`url(#${pid}-rm)`}>
          <path d={refl.map((g) => g.d).join('')} fill={fa.fill} filter={fa.filter} />
        </g>
      )}
    </g>
  );
}

// ———— الأشكال
export function shapeBox(o: ShapeObj): Box {
  return { x0: -o.w / 2, y0: -o.h / 2, x1: o.w / 2, y1: o.h / 2 };
}

export function ShapeNode({ o }: { o: ShapeObj }) {
  const pid = `m${useContext(IdPrefix)}${o.id}`;
  const d = shapePath(o);
  const fa = fillAttrs(o.fill, `${pid}-f`);
  return (
    <g transform={objTransform(o)} opacity={o.opacity} style={o.blend !== 'normal' ? { mixBlendMode: o.blend } : undefined}>
      <defs>
        <FillDef id={`${pid}-f`} fill={o.fill} box={shapeBox(o)} />
        <EffectsFilter id={`${pid}-fx`} shadow={o.shadow} />
      </defs>
      <g filter={o.shadow.enabled ? `url(#${pid}-fx)` : undefined}>
        <path
          d={d}
          fillRule="evenodd"
          fill={fa.fill}
          filter={fa.filter}
          stroke={o.stroke.enabled ? o.stroke.color : 'none'}
          strokeWidth={o.stroke.enabled ? o.stroke.width : 0}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

// ———— الصور
export function ImageNode({ o }: { o: ImageObj }) {
  const pid = `m${useContext(IdPrefix)}${o.id}`;
  return (
    <g transform={objTransform(o)} opacity={o.opacity} style={o.blend !== 'normal' ? { mixBlendMode: o.blend } : undefined}>
      {o.grayscale && (
        <defs>
          <filter id={`${pid}-gs`}>
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      )}
      <image
        href={o.src}
        x={-o.w / 2}
        y={-o.h / 2}
        width={o.w}
        height={o.h}
        preserveAspectRatio="none"
        filter={o.grayscale ? `url(#${pid}-gs)` : undefined}
      />
    </g>
  );
}

export function ObjNode({ o }: { o: Obj }) {
  if (!o.visible) return null;
  if (o.type === 'text') return <TextNode o={o} />;
  if (o.type === 'shape') return <ShapeNode o={o} />;
  return <ImageNode o={o} />;
}

// ———— الخلفية
function PaperFilter({ id, kind }: { id: string; kind: Background['paper'] }): ReactNode {
  switch (kind) {
    case 'parchment':
    case 'aged':
      return (
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves={4} seed={3} result="big" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={9} result="fine" />
          <feColorMatrix in="big" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 -1.6 0.95" result="blot" />
          <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 -1.4 0.95" result="grain" />
          <feMerge>
            <feMergeNode in="blot" />
            <feMergeNode in="grain" />
          </feMerge>
        </filter>
      );
    case 'kraft':
      return (
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.6" numOctaves={3} seed={5} result="fib" />
          <feColorMatrix in="fib" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 0 0.08  0 0 0 -1.8 1.2" />
        </filter>
      );
    case 'linen':
      return (
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.015" numOctaves={2} seed={2} result="a" />
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.9" numOctaves={2} seed={4} result="b" />
          <feComposite in="a" in2="b" operator="arithmetic" k2={0.5} k3={0.5} result="ab" />
          <feColorMatrix in="ab" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 -2 1.25" />
        </filter>
      );
    case 'marble':
      return (
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.003 0.008" numOctaves={6} seed={11} result="t" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.35  0 0 0 0 0.38  -2.2 0 0 0 0.8" />
        </filter>
      );
    case 'ebru':
      return (
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.006" numOctaves={4} seed={21} result="t" />
          <feComponentTransfer in="t" result="c">
            <feFuncR type="table" tableValues="0.1 0.85 0.2 0.75 0.95" />
            <feFuncG type="table" tableValues="0.25 0.35 0.45 0.55 0.8" />
            <feFuncB type="table" tableValues="0.55 0.3 0.7 0.25 0.6" />
            <feFuncA type="table" tableValues="0.9 0.2 0.8 0.15 0.85" />
          </feComponentTransfer>
        </filter>
      );
    default:
      return null;
  }
}

function PatternDef({ id, b }: { id: string; b: Background }): ReactNode {
  const t = 120 * b.patternScale;
  const c = b.patternColor;
  const sw = Math.max(1, t * 0.018);
  const common = { fill: 'none', stroke: c, strokeWidth: sw };
  const star = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 16; i++) {
      const rr = i % 2 === 0 ? r : r * 0.765;
      const a = -Math.PI / 2 + (i * Math.PI) / 8;
      pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
    }
    return pts.join(' ');
  };
  let content: ReactNode = null;
  switch (b.pattern) {
    case 'star8':
      content = (
        <>
          <polygon points={star(t / 2, t / 2, t * 0.36)} {...common} />
          {[
            [0, 0],
            [t, 0],
            [0, t],
            [t, t],
          ].map(([x, y], i) => (
            <polygon key={i} points={star(x, y, t * 0.36)} {...common} />
          ))}
          <line x1={t / 2} y1={0} x2={t / 2} y2={t * 0.14} {...common} />
          <line x1={t / 2} y1={t} x2={t / 2} y2={t * 0.86} {...common} />
          <line x1={0} y1={t / 2} x2={t * 0.14} y2={t / 2} {...common} />
          <line x1={t} y1={t / 2} x2={t * 0.86} y2={t / 2} {...common} />
        </>
      );
      break;
    case 'girih': {
      const k = t * 0.2929; // ضلع المثمن المنتظم في مربع
      content = (
        <>
          <polygon
            points={`${k},0 ${t - k},0 ${t},${k} ${t},${t - k} ${t - k},${t} ${k},${t} 0,${t - k} 0,${k}`}
            {...common}
          />
          <polygon points={`${t / 2},${t * 0.22} ${t * 0.78},${t / 2} ${t / 2},${t * 0.78} ${t * 0.22},${t / 2}`} {...common} />
        </>
      );
      break;
    }
    case 'arabesque':
      content = (
        <>
          {[
            [0, 0],
            [t, 0],
            [0, t],
            [t, t],
            [t / 2, t / 2],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={t / 2} {...common} />
          ))}
        </>
      );
      break;
    case 'hex': {
      const h = t * 0.866;
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={t * 1.5} height={h * 2}>
          <path
            d={`M0 ${h} L${t * 0.25} 0 H${t * 0.75} L${t} ${h} L${t * 0.75} ${h * 2} H${t * 0.25} Z M${t} ${h} H${t * 1.5}`}
            {...common}
          />
        </pattern>
      );
    }
    case 'diamond':
      content = <path d={`M${t / 2} 0 L${t} ${t / 2} L${t / 2} ${t} L0 ${t / 2} Z`} {...common} />;
      break;
    case 'dots':
      content = <circle cx={t / 2} cy={t / 2} r={t * 0.06} fill={c} />;
      break;
    default:
      return null;
  }
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={t} height={t}>
      {content}
    </pattern>
  );
}

export function BackgroundNode({ doc, transparent }: { doc: Doc; transparent?: boolean }) {
  const b = doc.background;
  const px = useContext(IdPrefix);
  const box: Box = { x0: 0, y0: 0, x1: doc.width, y1: doc.height };
  const fa = fillAttrs(b.fill, `${px}bg-f`);
  return (
    <g>
      <defs>
        <FillDef id={`${px}bg-f`} fill={b.fill} box={box} />
        <PaperFilter id={`${px}bg-paper`} kind={b.paper} />
        <PatternDef id={`${px}bg-pat`} b={b} />
        {b.vignette > 0 && (
          <radialGradient id={`${px}bg-vig`} cx="50%" cy="50%" r="70%">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={b.vignette} />
          </radialGradient>
        )}
      </defs>
      {!transparent && b.fill.type !== 'none' && (
        <rect x={0} y={0} width={doc.width} height={doc.height} fill={fa.fill} filter={fa.filter} />
      )}
      {!transparent && b.paper !== 'none' && (
        <rect x={0} y={0} width={doc.width} height={doc.height} fill="#fff" filter={`url(#${px}bg-paper)`} opacity={b.paperStrength} />
      )}
      {b.pattern !== 'none' && (
        <rect x={0} y={0} width={doc.width} height={doc.height} fill={`url(#${px}bg-pat)`} opacity={b.patternOpacity} />
      )}
      {!transparent && b.vignette > 0 && <rect x={0} y={0} width={doc.width} height={doc.height} fill={`url(#${px}bg-vig)`} />}
    </g>
  );
}

/** المستند كاملًا كعنصر SVG مستقل (للتصدير) */
export function DocSvg({ doc, transparent, prefix = '', width, height }: { doc: Doc; transparent?: boolean; prefix?: string; width?: number | string; height?: number | string }) {
  return (
    <IdPrefix.Provider value={prefix}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width ?? doc.width}
        height={height ?? doc.height}
        viewBox={`0 0 ${doc.width} ${doc.height}`}
      >
        <defs>
          <clipPath id={`${prefix}clip`}>
            <rect x={0} y={0} width={doc.width} height={doc.height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${prefix}clip)`}>
          <BackgroundNode doc={doc} transparent={transparent} />
          {doc.objects.map((o) => (
            <ObjNode key={o.id} o={o} />
          ))}
        </g>
      </svg>
    </IdPrefix.Provider>
  );
}
