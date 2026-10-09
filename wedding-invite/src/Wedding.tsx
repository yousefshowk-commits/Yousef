import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";

// ============================================================================
//  دعوة زفاف يوسف & حليمة — 52s vertical film, driven by absolute time (s)
//  so the cuts stay locked to the score (60 BPM, bar = 4 s) at any fps.
// ============================================================================

export const WED_LEN = 52;
const W = 1080, H = 1920, CX = 540;

const C = {
  bg0: "#03100D", bg1: "#0A2520", ink: "#F6EEDC", dim: "rgba(246,238,220,0.62)",
  g0: "#8A6A32", g1: "#C9A15A", g2: "#F6E3B4", g3: "#FFF6DD", blush: "#E9B9AA",
};
const F = {
  ruqaa: "'Aref Ruqaa', serif",
  naskh: "Amiri, serif",
  kufi: "'Reem Kufi', sans-serif",
  latin: "Cormorant, serif",
};

const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const r = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- fonts
const AR = "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC";
const LA = "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212";
const FACES: [string, string, string, string][] = [
  ["Aref Ruqaa", "fonts/wed/aref-ruqaa-arabic-400-normal.woff2", "400", AR],
  ["Aref Ruqaa", "fonts/neon/aref-ruqaa-arabic-700-normal.woff2", "700", AR],
  ["Amiri", "fonts/wed/amiri-arabic-400-normal.woff2", "400", AR],
  ["Amiri", "fonts/wed/amiri-arabic-700-normal.woff2", "700", AR],
  ["Amiri", "fonts/wed/amiri-latin-400-normal.woff2", "400", LA],
  ["Reem Kufi", "fonts/wed/reem-kufi-arabic-400-normal.woff2", "400", AR],
  ["Reem Kufi", "fonts/wed/reem-kufi-arabic-500-normal.woff2", "500", AR],
  ["Reem Kufi", "fonts/wed/reem-kufi-latin-500-normal.woff2", "500", LA],
  ["Cormorant", "fonts/wed/cormorant-garamond-latin-300-normal.woff2", "300", LA],
  ["Cormorant", "fonts/wed/cormorant-garamond-latin-500-normal.woff2", "500", LA],
];
let fontsP: Promise<unknown> | null = null;
const loadFonts = () => (fontsP ||= Promise.all(FACES.map(async ([fam, file, weight, unicodeRange]) => {
  try { const f = new FontFace(fam, `url("${staticFile(file)}")`, { weight, unicodeRange }); await f.load(); (document.fonts as any).add(f); }
  catch { console.warn("font failed", file); }
})));
const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("wedding fonts"));
  useEffect(() => { loadFonts().finally(() => continueRender(h)); }, [h]);
  return <>{children}</>;
};

// ---------------------------------------------------------------- primitives
const gold = (pos: number): React.CSSProperties => ({
  backgroundImage: `linear-gradient(105deg, ${C.g0} 0%, ${C.g1} 18%, ${C.g2} 34%, ${C.g1} 44%, ${C.g3} 50%, ${C.g1} 56%, ${C.g2} 68%, ${C.g0} 100%)`,
  backgroundSize: "260% 100%", backgroundPosition: `${pos}% 50%`,
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
  // tall Ruqaa ascenders (لـ) overshoot the inline box — pad the painted area so they stay gold
  display: "inline-block", padding: "0.45em 0.12em 0.3em", margin: "-0.45em -0.12em -0.3em",
});

/** Calligraphy-style ink reveal: a feathered mask sweeps right→left like a pen. */
const Ink: React.FC<{ t: number; at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; rise?: number }> =
  ({ t, at, dur = 1.4, children, style, rise = 26 }) => {
    const p = r(t, at, at + dur, EIO);
    const edge = lerp(-25, 125, p);
    const mask = `linear-gradient(to left, #000 ${edge - 22}%, rgba(0,0,0,0.35) ${edge - 6}%, transparent ${edge}%)`;
    const k = r(t, at, at + dur * 1.2);
    return (
      <div style={{ WebkitMaskImage: mask, maskImage: mask, transform: `translateY(${(1 - k) * rise}px)`, filter: `blur(${(1 - k) * 6}px)`,
        whiteSpace: "nowrap", direction: "rtl", padding: "0.12em 0.3em 0.32em", ...style }}>{children}</div>
    );
  };

/** Soft fade-up with letter-spacing settle (for small labels). */
const Rise: React.FC<{ t: number; at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; track?: number }> =
  ({ t, at, dur = 1.2, children, style, track = 0 }) => {
    const k = r(t, at, at + dur);
    return <div style={{ opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: `blur(${(1 - k) * 8}px)`,
      letterSpacing: track ? `${lerp(track * 2.2, track, k)}px` : undefined, whiteSpace: "nowrap", ...style }}>{children}</div>;
  };

const Center: React.FC<{ y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ y, children, style }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: "translateY(-50%)", display: "flex", flexDirection: "column",
    alignItems: "center", ...style }}>{children}</div>
);

const Draw: React.FC<{ d: string; p: number; w?: number; stroke?: string; o?: number; fill?: string; cap?: "round" | "butt" }> =
  ({ d, p, w = 2, stroke = "url(#gold)", o = 1, fill = "none", cap = "round" }) =>
    <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} stroke={stroke} strokeWidth={w} fill={fill}
      strokeLinecap={cap} strokeLinejoin="round" opacity={p > 0 ? o : 0} />;

const GoldDefs: React.FC = () => (
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stopColor={C.g0} /><stop offset="0.3" stopColor={C.g2} /><stop offset="0.5" stopColor={C.g1} />
      <stop offset="0.7" stopColor={C.g3} /><stop offset="1" stopColor={C.g0} />
    </linearGradient>
    <radialGradient id="halo"><stop offset="0" stopColor={C.g2} stopOpacity="0.55" /><stop offset="0.4" stopColor={C.g1} stopOpacity="0.16" /><stop offset="1" stopColor={C.g1} stopOpacity="0" /></radialGradient>
  </defs>
);

const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    <GoldDefs />{children}</svg>
);

// ---------------------------------------------------------------- geometry
const poly = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
const square = (cx: number, cy: number, R: number, rot: number) =>
  poly([0, 1, 2, 3].map((i) => { const a = rot + i * Math.PI / 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; }));
const star = (cx: number, cy: number, R: number, n = 8, inner = 0.7654, rot = -Math.PI / 2) =>
  poly(Array.from({ length: n * 2 }, (_, i) => { const a = rot + (i * Math.PI) / n; const rr = i % 2 ? R * inner : R; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; }));
const circle = (cx: number, cy: number, R: number) => `M${cx - R},${cy}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0`;
const arcPath = (cx: number, cy: number, R: number, a0: number, a1: number) => {
  const pt = (a: number) => [cx + R * Math.sin(a * Math.PI / 180), cy - R * Math.cos(a * Math.PI / 180)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  return `M${x0},${y0}A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0},1 ${x1},${y1}`;
};

/** Khatam rosette: two squares, star outline, rings, petals. */
const Rosette: React.FC<{ cx: number; cy: number; R: number; p: number; rot?: number; o?: number; w?: number }> = ({ cx, cy, R, p, rot = 0, o = 1, w = 2.4 }) => {
  const s = (a: number, b: number) => r(p, a, b, EIO);
  const petals = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2; const x1 = cx + Math.cos(a) * R * 0.46, y1 = cy + Math.sin(a) * R * 0.46;
    const x2 = cx + Math.cos(a) * R * 0.62, y2 = cy + Math.sin(a) * R * 0.62;
    return `M${x1},${y1}L${x2},${y2}`;
  }).join("");
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`} opacity={o}>
      <Draw d={circle(cx, cy, R * 1.12)} p={s(0, 0.5)} w={w * 0.6} o={0.6} />
      <Draw d={square(cx, cy, R, -Math.PI / 4)} p={s(0.05, 0.55)} w={w} />
      <Draw d={square(cx, cy, R, 0)} p={s(0.15, 0.65)} w={w} />
      <Draw d={star(cx, cy, R * 0.72)} p={s(0.3, 0.8)} w={w * 0.8} />
      <Draw d={petals} p={s(0.45, 0.9)} w={w * 0.6} o={0.8} />
      <Draw d={circle(cx, cy, R * 0.44)} p={s(0.5, 0.95)} w={w * 0.7} />
      <Draw d={star(cx, cy, R * 0.3, 8, 0.6)} p={s(0.6, 1)} w={w * 0.7} />
      <Draw d={circle(cx, cy, R * 1.22)} p={s(0.35, 1)} w={w * 0.4} o={0.4} />
    </g>
  );
};

// ---------------------------------------------------------------- atmosphere
const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const drift = t * 6;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="bgG" cx="0.5" cy="0.42" r="0.75">
            <stop offset="0" stopColor={C.bg1} /><stop offset="0.6" stopColor="#061814" /><stop offset="1" stopColor={C.bg0} />
          </radialGradient>
          <pattern id="tile" width="180" height="180" patternUnits="userSpaceOnUse" patternTransform={`translate(${drift} ${-drift * 0.6}) rotate(0)`}>
            <path d={star(90, 90, 54)} stroke={C.g1} strokeWidth="1.2" fill="none" />
            <path d={square(90, 90, 30, 0)} stroke={C.g1} strokeWidth="1" fill="none" />
            <path d="M0,0L36,36M180,0L144,36M0,180L36,144M180,180L144,144M90,0L90,36M90,180L90,144M0,90L36,90M180,90L144,90" stroke={C.g1} strokeWidth="1" />
          </pattern>
          <radialGradient id="tileMask" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stopColor="#fff" stopOpacity="0.2" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></radialGradient>
          <mask id="tm"><rect width={W} height={H} fill="url(#tileMask)" /></mask>
          <radialGradient id="vig" cx="0.5" cy="0.5" r="0.72"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.75" /></radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#bgG)" />
        <rect width={W} height={H} fill="url(#tile)" opacity={0.07 * r(t, 0.5, 4)} mask="url(#tm)" />
        <ellipse cx={CX} cy={820 + Math.sin(t * 0.4) * 30} rx={620} ry={720} fill="url(#halo)" opacity={0.28 + 0.06 * Math.sin(t * 0.7)} />
        <rect width={W} height={H} fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};

const Dust: React.FC<{ t: number }> = ({ t }) => {
  const n = 110;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: n }, (_, i) => {
        const sp = 18 + random(`s${i}`) * 50, depth = random(`d${i}`);
        const x = (random(`x${i}`) * W + Math.sin(t * 0.3 + i) * 30 * depth + W) % W;
        const y = ((random(`y${i}`) * (H + 200) - t * sp) % (H + 200) + H + 200) % (H + 200) - 100;
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + random(`f${i}`) * 2.5) + i * 7);
        const rad = 0.8 + depth * 2.8;
        return <circle key={i} cx={x} cy={y} r={rad} fill={i % 7 === 0 ? C.g3 : C.g2} opacity={(0.15 + 0.6 * tw) * (0.3 + depth * 0.7) * r(t, 0, 2)}
          style={{ filter: depth > 0.8 ? "blur(1.5px)" : undefined }} />;
      })}
    </svg>
  );
};

/** Double gold frame with corner rosettes — draws on, holds, and retires at the end. */
const Frame: React.FC<{ t: number }> = ({ t }) => {
  const p = r(t, 0.3, 3.2, EIO), out = 1 - r(t, 50.2, 51.6);
  const m = 44, m2 = 62, cr = 26;
  const rect = (k: number) => `M${CX},${k}L${W - k},${k}L${W - k},${H - k}L${k},${H - k}L${k},${k}Z`;
  const corners: [number, number][] = [[m2, m2], [W - m2, m2], [W - m2, H - m2], [m2, H - m2]];
  return (
    <Svg style={{ opacity: out }}>
      <Draw d={rect(m)} p={p} w={1.6} o={0.75} />
      <Draw d={rect(m2)} p={r(t, 0.6, 3.6, EIO)} w={1} o={0.45} />
      {corners.map(([x, y], i) => (
        <g key={i}><Rosette cx={x} cy={y} R={cr} p={r(t, 1.6 + i * 0.15, 3.4 + i * 0.15)} rot={t * 8} w={1.6} /></g>
      ))}
      {[[CX, m], [CX, H - m]].map(([x, y], i) => (
        <path key={i} d={star(x, y, 12, 4, 0.4)} fill={C.g2} opacity={r(t, 2.6, 3.4)} />
      ))}
    </Svg>
  );
};

const Grain: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ backgroundImage: `url(${staticFile("tex/grain.png")})`, backgroundSize: "380px 380px",
    backgroundPosition: `${(random(`gx${frame}`) * 380) | 0}px ${(random(`gy${frame}`) * 380) | 0}px`, opacity: 0.09, mixBlendMode: "overlay" }} />
);

/** Scene envelope: blur/scale in, breathe, blur/lift out. */
const Scene: React.FC<{ t: number; a: number; b: number; children: React.ReactNode; zin?: number }> = ({ t, a, b, children, zin = 1.06 }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const i = r(t, a, a + 1.4), o = r(t, b - 1.1, b, EIO);
  const breathe = lerp(1, 1.035, (t - a) / (b - a));
  return (
    <AbsoluteFill style={{ opacity: i * (1 - o), filter: `blur(${(1 - i) * 10 + o * 14}px)`,
      transform: `scale(${lerp(zin, 1, i) * breathe * (1 + o * 0.05)}) translateY(${-o * 30}px)` }}>{children}</AbsoluteFill>
  );
};

const Divider: React.FC<{ t: number; at: number; y: number; w?: number }> = ({ t, at, y, w = 260 }) => {
  const p = r(t, at, at + 1.3, EIO);
  return (
    <Svg>
      <Draw d={`M${CX - 24},${y}L${CX - 24 - w},${y}`} p={p} w={1.4} />
      <Draw d={`M${CX + 24},${y}L${CX + 24 + w},${y}`} p={p} w={1.4} />
      <path d={star(CX, y, 13, 4, 0.42)} fill={C.g2} opacity={p} transform={`rotate(${p * 90} ${CX} ${y})`} />
      <circle cx={CX - 34 - w} cy={y} r={3} fill={C.g1} opacity={r(t, at + 1, at + 1.4)} />
      <circle cx={CX + 34 + w} cy={y} r={3} fill={C.g1} opacity={r(t, at + 1, at + 1.4)} />
    </Svg>
  );
};

const glowF = (k = 1) => `drop-shadow(0 0 ${14 * k}px rgba(246,227,180,0.35)) drop-shadow(0 0 ${40 * k}px rgba(201,161,90,0.22))`;
const shimmer = (t: number, at: number, dur = 2.2) => lerp(100, 0, r(t, at, at + dur, EIO));

// ---------------------------------------------------------------- 1 · Opening (0–6)
const Opening: React.FC<{ t: number }> = ({ t }) => {
  const zoom = r(t, 4.7, 6.1, Easing.bezier(0.7, 0, 0.84, 0));
  const cy = 820;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return `M${CX + Math.cos(a) * 360},${cy + Math.sin(a) * 360}L${CX + Math.cos(a) * 470},${cy + Math.sin(a) * 470}`;
  }).join("");
  return (
    <AbsoluteFill style={{ opacity: 1 - r(t, 5.3, 6.1), transform: `scale(${1 + zoom * 2.6})`, transformOrigin: `${CX}px ${cy}px`, filter: `blur(${zoom * 6}px)` }}>
      <Svg style={{ filter: glowF(0.8) }}>
        <circle cx={CX} cy={cy} r={520} fill="url(#halo)" opacity={r(t, 0.5, 3) * 0.7} />
        <Rosette cx={CX} cy={cy} R={300} p={r(t, 0.2, 3.4, (x) => x)} rot={t * 4} />
        <Rosette cx={CX} cy={cy} R={110} p={r(t, 1.2, 3.6, (x) => x)} rot={-t * 10} w={2} />
        <Draw d={rays} p={r(t, 2.4, 3.6)} w={1.4} o={0.7} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + t * 0.07; const k = r(t, 2.6 + i * 0.08, 3.2 + i * 0.08);
          const x = CX + Math.cos(a) * 410, y = cy + Math.sin(a) * 410;
          return <path key={i} d={star(x, y, 14 * k, 4, 0.38)} fill={C.g2} opacity={k} />;
        })}
      </Svg>
      <Center y={1330}>
        <Ink t={t} at={2.7} dur={1.5} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 150, lineHeight: 1.3, filter: glowF() }}>
          <span style={gold(shimmer(t, 3.6))}>دعوة زفاف</span>
        </Ink>
        <Rise t={t} at={3.6} track={14} style={{ fontFamily: F.latin, fontWeight: 500, fontSize: 30, color: C.g2, marginTop: 6, direction: "ltr" }}>
          WEDDING INVITATION
        </Rise>
      </Center>
      <Divider t={t} at={3.4} y={1500} w={200} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- lanterns (scenes 2–3)
const Lantern: React.FC<{ x: number; len: number; t: number; seed: number; s?: number; o: number }> = ({ x, len, t, seed, s = 1, o }) => {
  const sw = Math.sin(t * 0.9 + seed) * 4.5 + Math.sin(t * 0.37 + seed * 2) * 2;
  const flick = 0.75 + 0.25 * Math.sin(t * 11 + seed) * Math.sin(t * 7.3 + seed * 3);
  const y = len;
  return (
    <g transform={`rotate(${sw} ${x} 0)`} opacity={o}>
      <line x1={x} y1={0} x2={x} y2={y} stroke={C.g1} strokeWidth={1.4} opacity={0.7} />
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <circle cx={0} cy={95} r={120} fill="url(#halo)" opacity={0.55 * flick} />
        <path d="M-6,0 L6,0 L4,10 L-4,10Z" fill={C.g1} />
        <path d="M-30,32 Q0,-4 30,32Z" fill="none" stroke="url(#gold)" strokeWidth={2.5} />
        <path d="M-36,32 L36,32 L30,44 L-30,44Z" fill={C.g0} stroke="url(#gold)" strokeWidth={2} />
        <path d="M-30,44 L-38,120 L-24,150 L24,150 L38,120 L30,44Z" fill={`rgba(255,214,140,${0.22 * flick})`} stroke="url(#gold)" strokeWidth={2.4} />
        <path d="M0,44 L0,150 M-34,82 L34,82 M-36,120 L36,120" stroke="url(#gold)" strokeWidth={1.4} opacity={0.8} />
        <path d={star(0, 100, 13, 8, 0.6, 0)} fill={C.g3} opacity={0.6 * flick} />
        <path d="M-24,150 L24,150 L14,168 L-14,168Z" fill={C.g0} stroke="url(#gold)" strokeWidth={2} />
        <path d="M0,168 L0,196" stroke={C.g1} strokeWidth={2} /><circle cx={0} cy={200} r={5} fill={C.g2} />
      </g>
    </g>
  );
};
const Lanterns: React.FC<{ t: number }> = ({ t }) => {
  if (t < 5.5 || t > 21.5) return null;
  const k = r(t, 6, 8, EO), out = r(t, 19.8, 21.2, EIO);
  const drop = (1 - k) * -260 - out * 260;
  return (
    <Svg style={{ transform: `translateY(${drop}px)`, filter: glowF(0.5) }}>
      <Lantern x={190} len={150} t={t} seed={0} s={0.85} o={k} />
      <Lantern x={300} len={60} t={t} seed={2.1} s={0.6} o={k * 0.7} />
      <Lantern x={890} len={190} t={t} seed={1.3} s={0.9} o={k} />
      <Lantern x={780} len={70} t={t} seed={3.7} s={0.55} o={k * 0.7} />
    </Svg>
  );
};

// ---------------------------------------------------------------- 2 · Blessing (6–13)
const Blessing: React.FC<{ t: number }> = ({ t }) => {
  const line = (txt: string, at: number, size: number) => (
    <Ink t={t} at={at} dur={1.6} style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: size, lineHeight: 1.7, filter: glowF(0.8) }}>
      <span style={gold(shimmer(t, at + 1.2, 2.6))}>{txt}</span>
    </Ink>
  );
  return (
    <Scene t={t} a={6} b={13}>
      <Svg style={{ filter: glowF(0.5) }}>
        <Rosette cx={CX} cy={640} R={70} p={r(t, 6.2, 8)} rot={t * 6} w={1.8} />
      </Svg>
      <Center y={1010}>
        {line("بَارَكَ اللهُ لَهُمَا", 6.5, 104)}
        {line("وَبَارَكَ عَلَيْهِمَا", 8.0, 104)}
        {line("وَجَمَعَ بَيْنَهُمَا فِي خَيْر", 9.5, 96)}
      </Center>
      <Divider t={t} at={10.6} y={1390} w={220} />
    </Scene>
  );
};

// ---------------------------------------------------------------- 3 · Hosts (13–21)
const Cartouche: React.FC<{ t: number; at: number; y: number; label: string; name: string }> = ({ t, at, y, label, name }) => {
  const p = r(t, at, at + 1.6, EIO);
  const w = 820, h = 250, x0 = CX - w / 2, y0 = y - h / 2, n = 34;
  const shape = `M${x0 + n},${y0}L${x0 + w - n},${y0}L${x0 + w},${y}L${x0 + w - n},${y0 + h}L${x0 + n},${y0 + h}L${x0},${y}Z`;
  const inner = `M${x0 + n + 4},${y0 + 14}L${x0 + w - n - 4},${y0 + 14}L${x0 + w - 16},${y}L${x0 + w - n - 4},${y0 + h - 14}L${x0 + n + 4},${y0 + h - 14}L${x0 + 16},${y}Z`;
  return (
    <>
      <Svg style={{ filter: glowF(0.4) }}>
        <path d={shape} fill="rgba(10,37,32,0.55)" opacity={r(t, at + 0.4, at + 1.6)} />
        <Draw d={shape} p={p} w={2} />
        <Draw d={inner} p={r(t, at + 0.2, at + 1.8, EIO)} w={1} o={0.5} />
        {[x0, x0 + w].map((x, i) => <path key={i} d={star(x, y, 16, 4, 0.4)} fill={C.g2} opacity={r(t, at + 1.2, at + 1.6)} />)}
      </Svg>
      <Center y={y}>
        <Rise t={t} at={at + 0.5} style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 40, color: C.blush, direction: "rtl" }} track={2}>{label}</Rise>
        <Ink t={t} at={at + 0.8} dur={1.5} style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: 70, lineHeight: 1.45, color: C.ink, marginTop: -8 }}>{name}</Ink>
      </Center>
    </>
  );
};

const Hosts: React.FC<{ t: number }> = ({ t }) => {
  const knot = r(t, 15.2, 16.4, EIO);
  return (
    <Scene t={t} a={13} b={21}>
      <Cartouche t={t} at={13.4} y={700} label="أولاد المرحوم" name="خلفان بن عبدالله المزيني" />
      <Svg style={{ filter: glowF(0.6) }}>
        <Draw d={`M${CX},826 C${CX - 40},880 ${CX + 40},920 ${CX},975`} p={knot} w={1.6} />
        <Rosette cx={CX} cy={900} R={26} p={r(t, 15.6, 16.8)} rot={t * 20} w={1.6} />
      </Svg>
      <Cartouche t={t} at={15.5} y={1100} label="السيد" name="سعيد بن أحمد الهنائي" />
      <Center y={1420}>
        <Rise t={t} at={17.5} dur={1.4} style={{ fontFamily: F.kufi, fontSize: 52, color: C.ink, direction: "rtl" }}>
          يتشرفان بدعوتكم لحضور
        </Rise>
        <Ink t={t} at={18.2} dur={1.4} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 110, lineHeight: 1.4, filter: glowF() }}>
          <span style={gold(shimmer(t, 19, 2))}>حفل زفاف</span>
        </Ink>
      </Center>
    </Scene>
  );
};

// ---------------------------------------------------------------- 4 · The couple (21–31)
const ARCH = (k: number) => {
  const l = 190 + k, rr = 890 - k, base = 1600, spring = 800 + k * 0.5, apex = 410 + k * 1.3;
  return `M${l},${base}L${l},${spring}C${l},${spring - 210} ${CX - 150 + k * 0.4},${apex + 110} ${CX},${apex}` +
    `C${CX + 150 - k * 0.4},${apex + 110} ${rr},${spring - 210} ${rr},${spring}L${rr},${base}`;
};

const Petals: React.FC<{ t: number; from: number; to: number }> = ({ t, from, to }) => {
  if (t < from) return null;
  const k = 1 - r(t, to - 1.2, to);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 46 }, (_, i) => {
        const st = from + random(`pt${i}`) * 5; if (t < st) return null;
        const age = t - st, sp = 90 + random(`ps${i}`) * 110;
        const y = -60 + age * sp; if (y > H + 60) return null;
        const x = random(`px${i}`) * W + Math.sin(age * (0.8 + random(`pw${i}`)) + i) * 70;
        const rot = age * (40 + random(`pr${i}`) * 90) * (i % 2 ? 1 : -1);
        const s = 0.6 + random(`pz${i}`) * 0.9; const flip = Math.cos(age * 2.4 + i);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * flip} ${s})`} opacity={(0.45 + 0.4 * random(`po${i}`)) * k}>
            <path d="M0,-14 C10,-10 12,6 0,14 C-12,6 -10,-10 0,-14Z" fill={i % 4 === 0 ? C.g2 : C.blush} />
          </g>
        );
      })}
    </svg>
  );
};

const Couple: React.FC<{ t: number }> = ({ t }) => {
  const a = r(t, 21.2, 23.6, EIO);
  const ringP = r(t, 25, 26.4, EIO);
  const rays = Array.from({ length: 9 }, (_, i) => {
    const ang = -0.5 + i * 0.125 + Math.sin(t * 0.3 + i) * 0.02;
    return `M${CX},380L${CX + Math.sin(ang) * 1500},${380 + Math.cos(ang) * 1500}L${CX + Math.sin(ang + 0.035) * 1500},${380 + Math.cos(ang + 0.035) * 1500}Z`;
  }).join("");
  return (
    <Scene t={t} a={21} b={31} zin={1.1}>
      <Svg>
        <defs>
          <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.g2} stopOpacity="0.22" /><stop offset="1" stopColor={C.g2} stopOpacity="0" /></linearGradient>
          <clipPath id="archClip"><path d={ARCH(0) + "Z"} /></clipPath>
          <pattern id="archTile" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform={`translate(${t * 4} 0)`}>
            <path d={star(60, 60, 40)} stroke={C.g1} strokeWidth="1" fill="none" /><path d={circle(60, 60, 14)} stroke={C.g1} strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <path d={rays} fill="url(#ray)" opacity={r(t, 22.5, 25) * (0.7 + 0.3 * Math.sin(t * 0.8))} />
        <g clipPath="url(#archClip)">
          <rect x={0} y={0} width={W} height={H} fill="rgba(4,18,15,0.6)" opacity={a} />
          <rect x={0} y={0} width={W} height={H} fill="url(#archTile)" opacity={0.08 * r(t, 22.5, 24.5)} />
          <ellipse cx={CX} cy={980} rx={420} ry={560} fill="url(#halo)" opacity={0.6 * r(t, 22.5, 25)} />
        </g>
        <g style={{ filter: glowF(0.7) }}>
          <Draw d={ARCH(0)} p={a} w={3} />
          <Draw d={ARCH(26)} p={r(t, 21.5, 23.9, EIO)} w={1.2} o={0.6} />
          <Draw d={ARCH(-20)} p={r(t, 21.8, 24.2, EIO)} w={1} o={0.35} />
          <Rosette cx={CX} cy={340} R={34} p={r(t, 22.8, 24.2)} rot={t * 12} w={1.6} />
          <line x1={150} y1={1600} x2={930} y2={1600} stroke="url(#gold)" strokeWidth={2} opacity={a} />
          {/* interlocking rings */}
          <Draw d={circle(CX - 34, 1005, 52)} p={ringP} w={5} />
          <Draw d={circle(CX + 34, 1005, 52)} p={r(t, 25.3, 26.7, EIO)} w={5} />
          <path d={`M${CX + 34},944 l10,-16 l10,16 l-10,10Z`} fill={C.g3} opacity={r(t, 26.3, 26.8)} transform={`rotate(0)`} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const k = r(t, 26.4, 27.6), ang = (i / 6) * Math.PI * 2;
            return <circle key={i} cx={CX + 44 + Math.cos(ang) * (16 + 60 * k)} cy={922 + Math.sin(ang) * (16 + 60 * k)} r={3 * (1 - k)} fill={C.g3} />;
          })}
        </g>
      </Svg>
      <Center y={590}><Rise t={t} at={22.5} track={3} style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 44, color: C.blush }}>ولده</Rise></Center>
      <Center y={770}>
        <Ink t={t} at={23.1} dur={1.8} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 210, lineHeight: 1.35, filter: glowF(1.2) }}>
          <span style={gold(shimmer(t, 24.4, 3))}>يوسف</span>
        </Ink>
      </Center>
      <Center y={1160}><Rise t={t} at={26.2} track={3} style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 44, color: C.blush }}>كريمته</Rise></Center>
      <Center y={1335}>
        <Ink t={t} at={26.9} dur={1.8} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 210, lineHeight: 1.35, filter: glowF(1.2) }}>
          <span style={gold(shimmer(t, 28.2, 3))}>حليمة</span>
        </Ink>
      </Center>
      <Petals t={t} from={23.4} to={31} />
    </Scene>
  );
};

// ---------------------------------------------------------------- 5 · Date & time (31–39)
const Medallion: React.FC<{ t: number; at: number; x: number; y: number; to: number; from: number; label: string; size: number }> =
  ({ t, at, x, y, to, from, label, size }) => {
    const k = r(t, at, at + 1.8, EIO);
    const val = Math.round(lerp(from, to, r(t, at + 0.2, at + 1.8, Easing.bezier(0.2, 0.7, 0.2, 1))));
    return (
      <>
        <Svg style={{ filter: glowF(0.6) }}>
          <path d={star(x, y, 132)} fill="rgba(10,37,32,0.7)" opacity={k} />
          <Draw d={star(x, y, 132)} p={k} w={2.2} />
          <Draw d={circle(x, y, 92)} p={r(t, at + 0.3, at + 1.8, EIO)} w={1} o={0.6} />
        </Svg>
        <div style={{ position: "absolute", left: x - 140, width: 280, top: y - 70, height: 140, display: "flex", alignItems: "center", justifyContent: "center",
          opacity: r(t, at + 0.2, at + 0.9), transform: `scale(${lerp(0.8, 1, k)})` }}>
          <span style={{ fontFamily: F.latin, fontWeight: 500, fontSize: size, lineHeight: 1, ...gold(shimmer(t, at + 1.6, 1.6)), filter: glowF(0.8) }}>{val}</span>
        </div>
        <div style={{ position: "absolute", left: x - 140, width: 280, top: y + 150, textAlign: "center" }}>
          <Rise t={t} at={at + 0.9} style={{ fontFamily: F.kufi, fontSize: 34, color: C.dim }}>{label}</Rise>
        </div>
      </>
    );
  };

const DateTime: React.FC<{ t: number }> = ({ t }) => {
  const cx = CX, cy = 1290, R = 150;
  const sweep = r(t, 35.6, 38.0, EIO);          // 9:00 → 11:30
  const hourA = 270 + 75 * sweep;
  const minA = 900 * sweep;
  const dial = r(t, 34.8, 36.2, EIO);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2; const r0 = i % 3 ? R - 14 : R - 26;
    return `M${cx + Math.sin(a) * r0},${cy - Math.cos(a) * r0}L${cx + Math.sin(a) * (R - 4)},${cy - Math.cos(a) * (R - 4)}`;
  }).join("");
  const hand = (a: number, len: number) => `M${cx},${cy}L${cx + Math.sin(a * Math.PI / 180) * len},${cy - Math.cos(a * Math.PI / 180) * len}`;
  return (
    <Scene t={t} a={31} b={39}>
      <Center y={330}>
        <Rise t={t} at={31.3} style={{ fontFamily: F.kufi, fontSize: 42, color: C.blush, direction: "rtl" }}>وذلك مساء يوم</Rise>
        <Ink t={t} at={31.6} dur={1.3} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 130, lineHeight: 1.35, filter: glowF() }}>
          <span style={gold(shimmer(t, 32.4))}>الأحد</span>
        </Ink>
      </Center>
      {/* RTL reading: day on the right */}
      <Medallion t={t} at={32.5} x={830} y={720} from={1} to={13} label="اليوم" size={104} />
      <Medallion t={t} at={32.9} x={540} y={720} from={1} to={11} label="الشهر" size={104} />
      <Medallion t={t} at={33.3} x={250} y={720} from={2000} to={2026} label="السنة" size={78} />
      <Svg style={{ filter: glowF(0.6) }}>
        <circle cx={cx} cy={cy} r={R} fill="rgba(10,37,32,0.6)" opacity={dial} />
        <Draw d={circle(cx, cy, R)} p={dial} w={2.4} />
        <Draw d={circle(cx, cy, R + 34)} p={r(t, 35, 36.4, EIO)} w={1} o={0.4} />
        <Draw d={ticks} p={r(t, 35.2, 36.2)} w={2} />
        {sweep > 0.001 && <path d={arcPath(cx, cy, R + 34, 270, 270 + 75 * sweep)} stroke={C.g2} strokeWidth={10} fill="none" strokeLinecap="round" />}
        <path d={star(cx + Math.sin(270 * Math.PI / 180) * (R + 34), cy, 12, 4, 0.4)} fill={C.g3} opacity={r(t, 35.5, 35.9)} />
        <g opacity={r(t, 35.3, 35.8)}>
          <path d={hand(hourA, R * 0.52)} stroke={C.g2} strokeWidth={8} strokeLinecap="round" />
          <path d={hand(minA, R * 0.8)} stroke={C.g3} strokeWidth={4} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={10} fill={C.g1} />
        </g>
      </Svg>
      <Center y={1590}>
        <Rise t={t} at={36.0} style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: 60, color: C.ink, direction: "rtl" }}>
          من الساعة <span style={gold(30)}>التاسعة</span>
        </Rise>
        <Rise t={t} at={36.8} style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: 60, color: C.ink, direction: "rtl", marginTop: 6 }}>
          وحتى <span style={gold(30)}>الحادية عشرة والنصف</span> مساءً
        </Rise>
      </Center>
    </Scene>
  );
};

// ---------------------------------------------------------------- 6 · Venue (39–45)
const STARS: [number, number][] = [[210, 330], [330, 250], [470, 300], [560, 210], [690, 280], [820, 230], [900, 360], [760, 420], [600, 470], [420, 440], [300, 520]];
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [2, 9], [4, 7]];
const FORT = (() => {
  const y0 = 1700; let d = `M110,${y0}`;
  const merl = (x0: number, x1: number, top: number, n: number) => {
    let s = `L${x0},${top}`; const w = (x1 - x0) / (n * 2 - 1);
    for (let i = 0; i < n * 2 - 1; i++) { const x = x0 + w * (i + 1); s += i % 2 === 0 ? `L${x - w},${top - 18}L${x},${top - 18}L${x},${top}` : `L${x},${top}`; }
    return s;
  };
  d += `L150,${y0}` + merl(150, 300, 1470, 4) + `L300,1590` + merl(300, 460, 1590, 3) + `L460,1540`;
  d += `L460,1530` + merl(460, 620, 1530, 4) + `L620,1600` + merl(620, 730, 1600, 2);
  d += `L730,1560L740,1560C740,1480 860,1480 860,1560L870,1560L870,${y0}`;
  d += `M890,${y0}L890,1400L885,1380L945,1380L940,1400L940,${y0}M900,1380L900,1350C900,1330 930,1330 930,1350L930,1380M915,1330L915,1300`;
  d += `M110,${y0}L970,${y0}M520,${y0}L520,1640C520,1610 560,1610 560,1640L560,${y0}M800,1480L800,1455`;
  return d;
})();

const Venue: React.FC<{ t: number }> = ({ t }) => (
  <Scene t={t} a={39} b={45}>
    <Svg style={{ filter: glowF(0.6) }}>
      {LINKS.map(([i, j], k) => {
        const [x1, y1] = STARS[i], [x2, y2] = STARS[j];
        return <Draw key={k} d={`M${x1},${y1}L${x2},${y2}`} p={r(t, 39.6 + k * 0.12, 40.4 + k * 0.12)} w={1} o={0.5} />;
      })}
      {STARS.map(([x, y], i) => {
        const k = r(t, 39.3 + i * 0.1, 39.9 + i * 0.1); const tw = 0.7 + 0.3 * Math.sin(t * 3 + i * 2);
        return <g key={i} opacity={k}><circle cx={x} cy={y} r={26} fill="url(#halo)" /><path d={star(x, y, (i % 3 ? 10 : 16) * tw * k, 4, 0.3)} fill={C.g3} /></g>;
      })}
      <Draw d={FORT} p={r(t, 40.2, 43.6, (x) => x)} w={2} o={0.85} />
      <path d={`M${CX},1015c-30,0 -52,22 -52,50c0,38 52,88 52,88s52,-50 52,-88c0,-28 -22,-50 -52,-50z`} fill="none" stroke="url(#gold)" strokeWidth={3}
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - r(t, 42.2, 43.2)} transform={`translate(0 ${-(1 - r(t, 42.2, 43)) * 30})`} />
      <circle cx={CX} cy={1064} r={14} fill={C.g2} opacity={r(t, 42.9, 43.3)} />
    </Svg>
    <Center y={650}>
      <Rise t={t} at={40.6} style={{ fontFamily: F.kufi, fontSize: 42, color: C.blush, marginBottom: 48 }}>في</Rise>
      <Ink t={t} at={40.9} dur={1.6} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 168, lineHeight: 1.35, filter: glowF(1.1) }}>
        <span style={gold(shimmer(t, 41.8, 2.6))}>فندق النجوم</span>
      </Ink>
    </Center>
    <Center y={1250}>
      <Rise t={t} at={42.6} track={4} style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 58, color: C.ink }}>سلطنة عُمان</Rise>
    </Center>
  </Scene>
);

// ---------------------------------------------------------------- 7 · Closing (45–52)
const Closing: React.FC<{ t: number }> = ({ t }) => {
  const fadeAll = 1 - r(t, 50.6, 51.9, EIO);
  return (
    <AbsoluteFill style={{ opacity: fadeAll }}>
      <Scene t={t} a={45} b={53}>
        <Svg style={{ filter: glowF(0.8) }}>
          <Rosette cx={CX} cy={470} R={120} p={r(t, 45.1, 47.6, (x) => x)} rot={-t * 5} />
        </Svg>
        <Center y={850}>
          <Ink t={t} at={45.5} dur={1.6} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 140, lineHeight: 1.35, filter: glowF() }}>
            <span style={gold(shimmer(t, 46.6, 2.4))}>دامت الأفراح</span>
          </Ink>
          <Ink t={t} at={46.6} dur={1.6} style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: 76, lineHeight: 1.6, color: C.ink }}>
            حليفة دياركم العامرة
          </Ink>
        </Center>
        <Divider t={t} at={47.6} y={1130} w={240} />
        <Center y={1330}>
          <Rise t={t} at={48.2} dur={1.4} style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 92, direction: "rtl", filter: glowF(0.8), padding: "0 20px 16px" }}>
            <span style={gold(shimmer(t, 48.6, 2.4))}>يوسف <span style={{ fontFamily: F.latin, fontWeight: 300, fontSize: 80, margin: "0 18px" }}>&amp;</span> حليمة</span>
          </Rise>
          <Rise t={t} at={48.9} track={10} style={{ fontFamily: F.latin, fontWeight: 500, fontSize: 40, color: C.g2, marginTop: 8, direction: "ltr" }}>
            13 · 11 · 2026
          </Rise>
        </Center>
      </Scene>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- root
export const Wedding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = 1 + 0.012 * Math.sin(t * 0.35);
  return (
    <FontGate>
      <AbsoluteFill style={{ backgroundColor: C.bg0, overflow: "hidden" }}>
        <Audio src={staticFile("wed/music.wav")} />
        <Backdrop t={t} />
        <AbsoluteFill style={{ transform: `scale(${cam}) translate(${Math.sin(t * 0.23) * 6}px, ${Math.cos(t * 0.19) * 8}px)` }}>
          <Dust t={t} />
          <Lanterns t={t} />
          <Opening t={t} />
          <Blessing t={t} />
          <Hosts t={t} />
          <Couple t={t} />
          <DateTime t={t} />
          <Venue t={t} />
          <Closing t={t} />
        </AbsoluteFill>
        <Frame t={t} />
        <Grain frame={frame} />
        <AbsoluteFill style={{ backgroundColor: "#000", opacity: 1 - r(t, 0, 0.6) }} />
      </AbsoluteFill>
    </FontGate>
  );
};
