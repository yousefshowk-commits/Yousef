import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { FontGate } from "./FontGate";

// ============================================================================
//  «طيارتي» — lyric film. Everything is driven by absolute time in seconds,
//  locked to the vocal's word timestamps, so fps can be changed freely.
//  Lyrics on screen are only the eight lines supplied for the film; the
//  middle section of the song (21–30.6s) plays as a lyric-free flight.
// ============================================================================

export const SONG_LEN = 36.86;
export const FILM_LEN = 38.6;
const W = 1080, H = 1920, CX = 540, CY = 960;

const C = {
  ink: "#1D2A44", inkSoft: "#33456B", paper: "#FFF6E6", paperBack: "#F1DFC0", paperEdge: "#E2C99E",
  coral: "#FF5A4E", coralDeep: "#C2332C", sun: "#FFC93C", sunDeep: "#F29E1F", teal: "#17B8A6", sky: "#4C9BEE",
  white: "#FFFFFF", wood: "#8A5A2B", rose: "#FF7FA3",
};
const F = {
  display: "Lalezar, 'Baloo Bhaijaan 2', sans-serif",
  round: "'Baloo Bhaijaan 2', sans-serif",
  script: "'Aref Ruqaa', 'Baloo Bhaijaan 2', serif",
  mono: "'JetBrains Mono', monospace",
};
// beat grid from the track analysis (~95.7 BPM)
const BEATS = [1.51, 2.16, 2.76, 3.37, 4.02, 4.62, 5.22, 5.85, 6.46, 7.08, 7.71, 8.34, 8.96, 9.57, 10.22, 10.82, 11.42, 12.05, 12.68, 13.28,
  13.91, 14.54, 15.14, 15.77, 16.37, 17.0, 17.6, 18.23, 18.83, 19.44, 20.06, 20.71, 21.32, 21.94, 22.55, 23.17, 23.78, 24.4, 25.03, 25.66,
  26.26, 26.89, 27.49, 28.14, 28.75, 29.37, 29.98, 30.6, 31.21, 31.86, 32.46, 33.07, 33.69, 34.32, 34.92, 35.55, 36.15];
const BAR = 4 * 0.6275;

const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const EI = Easing.bezier(0.55, 0, 1, 0.45);
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const r = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
const kf = (t: number, ts: number[], vs: number[], e: (x: number) => number = EIO) => interpolate(t, ts, vs, { ...CL, easing: e });
const pulse = (t: number, k = 7) => { let p = 0; for (const b of BEATS) if (t >= b) p = Math.max(p, Math.exp(-(t - b) * k)); return p; };
const shadow = (c: string, d = 8) => `0 ${d}px 0 ${c}, 0 ${d + 10}px 26px rgba(29,42,68,0.28)`;
const dshadow = (c: string, d = 8) => `drop-shadow(0 ${d}px 0 ${c}) drop-shadow(0 ${d + 8}px 18px rgba(29,42,68,0.25))`;

// ----------------------------------------------------------------------------
//  Wind and camera are integrated over time, so speed changes never make
//  clouds or speed lines jump.
// ----------------------------------------------------------------------------
const windSpeed = (t: number) =>
  50 + 950 * r(t, 7.5, 7.75) * (1 - r(t, 8.5, 9.4)) + 380 * r(t, 13.8, 14.3) * (1 - r(t, 15.9, 16.4)) + 900 * r(t, 15.3, 15.45) * (1 - r(t, 15.5, 16.2))
  + 120 * r(t, 21, 22) * (1 - r(t, 30.4, 31.2));
const riseSpeed = (t: number) => 1250 * r(t, 12.55, 12.75) * (1 - r(t, 13.1, 14.1, EIO)) + 160 * r(t, 13.8, 14.3) * (1 - r(t, 16, 16.6)) - 900 * r(t, 20.9, 21.2) * (1 - r(t, 21.3, 22.1));
const integrate = (fn: (t: number) => number, t: number) => { let s = 0; const dt = 1 / 120; for (let x = 0; x < t; x += dt) s += fn(x) * Math.min(dt, t - x); return s; };

type Clk = { t: number; fps: number; frame: number; spec: number[]; bass: number; wind: number; pan: number };
const Ctx = React.createContext<Clk>({ t: 0, fps: 30, frame: 0, spec: [], bass: 0, wind: 0, pan: 0 });
const useClk = () => React.useContext(Ctx);
const sprAt = (t: number, fps: number, a: number, cfg: Record<string, number> = { damping: 14, stiffness: 130 }) =>
  t < a ? 0 : spring({ frame: (t - a) * fps, fps, config: cfg });
const useSpr = () => { const { t, fps } = useClk(); return (a: number, cfg?: Record<string, number>) => sprAt(t, fps, a, cfg); };

// ----------------------------------------------------------------------------
//  Kite state: one hero kite whose path runs through the whole film
// ----------------------------------------------------------------------------
type KS = { x: number; y: number; rot: number; s: number };
const FLIGHT0 = 21.0, FIG = 2 * BAR; // figure-eight period = 2 bars
const fig8 = (t: number) => { const w = (2 * Math.PI) / FIG, u = t - 21.32; return { x: CX + 300 * Math.sin(w * u), y: 860 + 190 * Math.sin(2 * w * u), vx: Math.cos(w * u), vy: Math.cos(2 * w * u) }; };
const hero = (t: number): KS => {
  // falling sheet → fold at centre → up for line 2 → sweep (سريعة) → top-right for the string
  let x = kf(t, [0, 3.9, 4.6, 6.2, 6.9, 7.55, 8.05, 8.06, 8.8, 11.4, 12.4, 12.62, 13.7, 15.3, 15.6, 16.2, 16.6, 18.6, 19.2], [540, 540, 540, 540, 830, 830, -420, 1500, 770, 770, 560, 540, 540, 540, 540, 540, 540, 540, 770]);
  let y = kf(t, [0, 1.3, 3.9, 4.6, 6.2, 6.9, 7.55, 8.05, 8.06, 8.8, 11.4, 12.4, 12.62, 13.7, 15.3, 15.6, 16.2, 16.6, 18.6, 19.2], [-460, 900, 900, 520, 520, 420, 420, 1000, 1000, 470, 470, 1000, 1000, 360, 600, 960, 960, 600, 600, 330]);
  let rot = kf(t, [0, 1.3, 6.2, 6.9, 7.55, 7.7, 8.05, 8.06, 8.8, 9.2, 11.4, 11.5, 12.4, 12.62, 13.0, 13.7, 17.4, 17.9, 18.6, 19.2], [-40, 0, 0, 12, 12, -28, -28, -18, -18, 8, 8, -6, -4, -4, 4, 0, 0, -26, -10, 6]);
  let s = kf(t, [0, 3.9, 4.6, 6.2, 6.9, 8.8, 12.62, 13.7, 15.3, 15.6, 16.2, 16.6, 18.6, 19.2], [1.7, 1.7, 1.0, 1.0, 0.72, 0.8, 0.95, 0.85, 0.85, 2.1, 2.1, 1.1, 1.1, 0.78]);
  // falling-leaf sway before it lands
  if (t < 1.4) { const k = 1 - r(t, 0, 1.4, EIO); x += Math.sin(t * 6) * 160 * k; rot += Math.sin(t * 6 + 0.6) * 22 * k; }
  // tug on «أسحبها»
  if (t > 11.36 && t < 12.6) { const j = Math.exp(-(t - 11.36) * 6) * Math.sin((t - 11.36) * 30); y += j * 40; rot += j * 6; }
  // lazy bob whenever it is parked
  x += Math.sin(t * 1.7) * 10; y += Math.sin(t * 2.3 + 1) * 12; rot += Math.sin(t * 1.9) * 3;
  // flight: figure-eight, with a loop-the-loop on the bar at 26.26
  const fl = r(t, FLIGHT0, 22.2, EIO) * (1 - r(t, 30.3, 31.4, EIO));
  if (fl > 0) {
    const f = fig8(t);
    const loop = r(t, 26.26, 27.5, EIO);
    const lx = Math.sin(loop * Math.PI * 2) * 170, ly = (Math.cos(loop * Math.PI * 2) - 1) * 170;
    x = x + (f.x + lx - x) * fl; y = y + (f.y + ly - y) * fl;
    rot = rot + (f.vx * 20 + loop * 360 - rot) * fl;
    s = s + (0.9 - s) * fl;
  }
  // reprise: centre stage, then lifts for the end card
  const rp = r(t, 30.6, 31.6, EIO);
  if (rp > 0) {
    const yy = kf(t, [31, 33.5, 34.2, 36.1, 36.6], [800, 800, 700, 700, 640]);
    const ss = kf(t, [31, 33.5, 34.2, 36.1, 36.6], [1.25, 1.25, 1.05, 1.05, 1.35]);
    x = x + (540 + Math.sin(t * 1.7) * 10 - x) * rp; y = y + (yy + Math.sin(t * 2.3) * 14 - y) * rp; s = s + (ss - s) * rp; rot = rot + (Math.sin(t * 1.9) * 4 - rot) * rp;
  }
  return { x, y, rot, s };
};
const toWorld = (k: KS, lx: number, ly: number) => {
  const a = (k.rot * Math.PI) / 180;
  return [k.x + k.s * (Math.cos(a) * lx - Math.sin(a) * ly), k.y + k.s * (Math.sin(a) * lx + Math.cos(a) * ly)] as const;
};
// where the flyer's hand holds the string (off-frame)
const hand = (t: number) => [kf(t, [0, 8.4, 8.9, 11.2, 11.8, 21, 22, 30.6, 31.4], [540, 540, -200, -200, 540, 540, 380, 380, 540]),
  kf(t, [0, 8.4, 8.9, 11.2, 11.8], [2120, 2120, 1720, 1720, 2120])] as const;

// ----------------------------------------------------------------------------
//  The kite. Square sheet → two flaps fold over creases → panels paint in.
//  Geometry: sheet T(0,-200) R(200,0) B(0,200) L(-200,0); fold R across the
//  crease B→Q, Q=(130,-70); the remaining quad T,Q,B,Q' is the kite.
// ----------------------------------------------------------------------------
const KT = [0, -200], KR = [130, -70], KB = [0, 200], KL = [-130, -70], KC = [0, -70];
const flapPts = (p: number, side: 1 | -1) => {
  const proj = [115.8 * side, -40.5], rel = [84.2 * side, 40.5];
  const c = Math.cos(Math.PI * p);
  return { pts: [KB, [proj[0] + rel[0] * c, proj[1] + rel[1] * c], [130 * side, -70]], c };
};
const poly = (pts: number[][]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

const Kite: React.FC<{ k: KS; id: string; fold?: number; paint?: number; spar?: number; c1?: string; c2?: string; glow?: number }> =
  ({ k, id, fold = 2, paint = 1, spar = 1, c1 = C.coral, c2 = C.sun, glow = 0 }) => {
    const fr = flapPts(Math.min(1, Math.max(0, fold)), 1), fl = flapPts(Math.min(1, Math.max(0, fold - 1)), -1);
    const flap = (f: { pts: number[][]; c: number }, key: string) => (
      <g key={key}>
        <polygon points={poly(f.pts)} fill={f.c >= 0 ? interpolateColors(f.c, [0, 1], [C.paperEdge, C.paper]) : interpolateColors(-f.c, [0, 1], [C.paperEdge, C.paperBack])}
          stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      </g>
    );
    const sheetPaint = paint < 0.999;
    return (
      <g transform={`translate(${k.x} ${k.y}) rotate(${k.rot}) scale(${k.s})`} style={glow ? { filter: `drop-shadow(0 0 ${30 * glow}px rgba(255,255,255,0.9))` } : undefined}>
        <defs><clipPath id={`kc${id}`}><circle cx={0} cy={-70} r={Math.max(0.01, paint * 290)} /></clipPath></defs>
        {/* soft ground shadow so it sits in the sky */}
        <polygon points={poly([KT, KR, KB, KL])} transform="translate(14 22)" fill="rgba(29,42,68,0.18)" />
        {sheetPaint && (
          <>
            <polygon points={poly([KB, [130, -70], KT, [-130, -70]])} fill={C.paper} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
            {fold > 0.01 && <line x1={0} y1={200} x2={130} y2={-70} stroke={C.paperEdge} strokeWidth={3} />}
            {fold > 1.01 && <line x1={0} y1={200} x2={-130} y2={-70} stroke={C.paperEdge} strokeWidth={3} />}
            {/* the untouched corners of the sheet, then the flaps */}
            {fold < 2 && fold <= 1 && flap(flapPts(0, -1), "l0")}
            {flap(fr, "r")}
            {fold > 1 && flap(fl, "l")}
          </>
        )}
        <g clipPath={`url(#kc${id})`}>
          <polygon points={poly([KT, KC, KL])} fill={c1} />
          <polygon points={poly([KT, KR, KC])} fill={c2} />
          <polygon points={poly([KL, KC, KB])} fill={c2} />
          <polygon points={poly([KC, KR, KB])} fill={c1} />
          <polygon points={poly([KT, KR, KC])} fill="rgba(255,255,255,0.22)" />
          <polygon points={poly([KC, KR, KB])} fill="rgba(0,0,0,0.08)" />
          <polygon points={poly([KT, KR, KB, KL])} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          {/* tiny paper-fold highlight */}
          <path d="M -20 -168 L -96 -84" stroke="rgba(255,255,255,0.75)" strokeWidth={7} strokeLinecap="round" />
        </g>
        <line x1={0} y1={-200} x2={0} y2={200} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - spar} stroke={C.wood} strokeWidth={7} strokeLinecap="round" />
        <line x1={130} y1={-70} x2={-130} y2={-70} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - spar} stroke={C.wood} strokeWidth={7} strokeLinecap="round" />
        {spar > 0.99 && <circle cx={0} cy={-70} r={9} fill={C.ink} />}
      </g>
    );
  };

// Tail: sampled from the kite's own past positions, so it trails any motion.
const tailPts = (pos: (t: number) => KS, t: number, n: number, dt = 0.04, droop = 10) => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const tt = t - i * dt; const k = pos(tt); const [bx, by] = toWorld(k, 0, 200);
    out.push([bx + Math.sin(tt * 4 + i * 0.5) * i * 1.4, by + i * droop * k.s]);
  }
  return out;
};
const smooth = (pts: [number, number][]) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const l = pts[pts.length - 1]; return d + ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
};
const BOWS = [C.coral, C.sun, C.teal, C.rose];
const Tail: React.FC<{ pts: [number, number][]; s: number; seed?: number }> = ({ pts, s, seed = 0 }) => {
  // break the tail where it teleports (the off-screen jump in the سريعة sweep)
  const segs: [number, number][][] = [[]];
  pts.forEach((p, i) => { if (i && Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 260) segs.push([]); segs[segs.length - 1].push(p); });
  return (
    <g>
      {segs.map((sg, j) => <path key={j} d={smooth(sg)} fill="none" stroke={C.ink} strokeWidth={4 * Math.max(0.6, s)} strokeLinecap="round" />)}
      {pts.map((p, i) => {
        if (i % 4 !== 3 || i + 1 >= pts.length) return null;
        const q = pts[i + 1]; const a = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
        const z = 22 * Math.max(0.5, s);
        return <g key={i} transform={`translate(${p[0]} ${p[1]}) rotate(${a + 90})`}>
          <polygon points={`0,0 ${-z},${-z * 0.6} ${-z},${z * 0.6}`} fill={BOWS[(i / 4 + seed) % 4 | 0]} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
          <polygon points={`0,0 ${z},${-z * 0.6} ${z},${z * 0.6}`} fill={BOWS[(i / 4 + seed) % 4 | 0]} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
          <circle r={4} fill={C.ink} />
        </g>;
      })}
    </g>
  );
};

// ----------------------------------------------------------------------------
//  Primitives
// ----------------------------------------------------------------------------
const Row: React.FC<{ y: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ y, gap = 34, children, style }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: "translateY(-50%)", display: "flex", justifyContent: "center",
    alignItems: "center", gap, direction: "rtl", ...style }}>{children}</div>
);

type Kind = "slam" | "rise" | "drop" | "soft" | "pop";
// A single word with a time-locked entrance. Whole words only: Arabic shaping must never be split.
const Word: React.FC<{ at: number; out?: number; kind?: Kind; font?: string; size: number; color?: string; sh?: string; shD?: number;
  style?: React.CSSProperties; children: React.ReactNode }> = ({ at, out, kind = "rise", font = F.display, size, color = C.white, sh = C.ink, shD, style, children }) => {
  const { t } = useClk(); const spr = useSpr();
  const pz = t >= at ? pulse(t, 9) : 0;
  const o = out === undefined ? 1 : 1 - r(t, out, out + 0.35, EI);
  const base: React.CSSProperties = { fontFamily: font, fontSize: size, color, fontWeight: 400, lineHeight: 1.6, whiteSpace: "nowrap",
    textShadow: sh ? shadow(sh, shD ?? Math.round(size / 22)) : undefined, display: "inline-block", ...style };
  const outT = out === undefined ? "" : ` translateY(${-r(t, out, out + 0.35, EI) * 80}px)`;
  if (t < at - 0.02) return <span style={{ ...base, opacity: 0 }}>{children}</span>;
  if (kind === "slam") {
    const s = spr(at, { damping: 10, stiffness: 200 });
    return <span style={{ ...base, opacity: r(t, at, at + 0.08) * o, transform: `scale(${interpolate(s, [0, 1], [2.3, 1]) + pz * 0.04})${outT}`,
      filter: `blur(${(1 - r(t, at, at + 0.2)) * 20}px)` }}>{children}</span>;
  }
  if (kind === "pop") {
    const s = spr(at, { damping: 8, stiffness: 170 });
    return <span style={{ ...base, opacity: o, transform: `scale(${s + pz * 0.04}) rotate(${(1 - s) * -14}deg)${outT}` }}>{children}</span>;
  }
  if (kind === "drop") {
    const s = spr(at, { damping: 11, stiffness: 160 });
    return <span style={{ ...base, opacity: r(t, at, at + 0.12) * o, transform: `translateY(${(1 - s) * -160}px) rotate(${(1 - s) * -8}deg)${outT}` }}>{children}</span>;
  }
  if (kind === "soft") {
    const p = r(t, at, at + 0.7);
    return <span style={{ ...base, opacity: p * o, filter: `blur(${(1 - p) * 18}px)`, transform: `scale(${1.15 - p * 0.15})${outT}` }}>{children}</span>;
  }
  // rise: masked reveal from below (generous padding keeps harakat & descenders intact)
  const p = r(t, at, at + 0.5);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", padding: `${size * 0.4}px ${size * 0.2}px ${size * 0.4}px`, margin: `${-size * 0.4}px ${-size * 0.2}px ${-size * 0.4}px`, opacity: o }}>
      <span style={{ ...base, transform: `translateY(${(1 - p) * 120}%) rotate(${(1 - p) * 6}deg)${outT}`, opacity: p > 0 ? 1 : 0 }}>{children}</span>
    </span>
  );
};

// N copies of the same content, each clipped to one strip and offset independently.
// Lets us wave connected Arabic script (air, ribbon) without breaking letter joins.
const Sliced: React.FC<{ n: number; axis: "x" | "y"; off: (i: number) => [number, number]; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ n, axis, off, children, style }) => (
    <div style={{ position: "relative", ...style }}>
      <div style={{ visibility: "hidden" }}>{children}</div>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 100 - 0.12, b = 100 - ((i + 1) / n) * 100 - 0.12;
        const clip = axis === "x" ? `inset(-40% ${b}% -40% ${a}%)` : `inset(${a}% -20% ${b}% -20%)`;
        const [dx, dy] = off(i);
        return <div key={i} style={{ position: "absolute", inset: 0, clipPath: clip, transform: `translate(${dx}px, ${dy}px)` }}>{children}</div>;
      })}
    </div>
  );

const Particles: React.FC<{ at: number; n: number; x: number; y: number; seed: string; speed?: number; colors: string[]; life?: number; grav?: number }> =
  ({ at, n, x, y, seed, speed = 900, colors, life = 1.6, grav = 700 }) => {
    const { t } = useClk();
    const dt = t - at;
    if (dt < 0 || dt > life) return null;
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: n }, (_, i) => {
          const ang = random(`${seed}a${i}`) * Math.PI * 2, v = speed * (0.25 + random(`${seed}v${i}`) * 0.75);
          const drag = 1 - Math.exp(-dt * 2.6);
          const px = x + (Math.cos(ang) * v * drag) / 2.6, py = y + (Math.sin(ang) * v * drag) / 2.6 + grav * dt * dt * 0.5;
          const sz = 8 + random(`${seed}s${i}`) * 14, o = 1 - Math.pow(dt / life, 2), c = colors[i % colors.length];
          const spin = dt * (300 + random(`${seed}r${i}`) * 600) + i * 40;
          // paper confetti: little squares tumbling in 3D (squashed by cos)
          return <rect key={i} x={px - sz / 2} y={py - sz / 2} width={sz} height={sz * (0.3 + 0.7 * Math.abs(Math.cos(spin / 60)))} fill={c} opacity={o}
            stroke={C.ink} strokeWidth={1.5} transform={`rotate(${spin} ${px} ${py})`} />;
        })}
      </svg>
    );
  };

const Shock: React.FC<{ at: number; x: number; y: number; color: string; max?: number; dur?: number; width?: number }> = ({ at, x, y, color, max = 900, dur = 0.9, width = 8 }) => {
  const { t } = useClk();
  const p = (t - at) / dur;
  if (p < 0 || p > 1) return null;
  const e = EO(p);
  return <div style={{ position: "absolute", left: x - max * e, top: y - max * e, width: max * e * 2, height: max * e * 2, borderRadius: "50%",
    border: `${width * (1 - p) + 1}px solid ${color}`, opacity: 1 - p }} />;
};

// A gust: a wind stroke that ends in a curl, drawn on and blown off.
const Gust: React.FC<{ at: number; y: number; seed: number; len?: number; dur?: number; color?: string; dir?: 1 | -1 }> = ({ at, y, seed, len = 700, dur = 0.9, color = C.white, dir = -1 }) => {
  const { t } = useClk();
  const p = (t - at) / dur;
  if (p < 0 || p > 1) return null;
  const x0 = dir < 0 ? W + 100 - p * (W + len) * 1.1 : -100 + p * (W + len) * 1.1;
  const d = `M ${x0} ${y} c ${-dir * -len * 0.35} -40 ${-dir * -len * 0.7} 40 ${-dir * -len} 0 c ${-dir * -60} -40 ${-dir * -10} -110 ${-dir * 40} -70 c ${-dir * 30} 30 ${-dir * 0} 60 ${-dir * -25} 40`;
  const head = r(p, 0, 0.45), tail = r(p, 0.35, 1);
  return <path d={d} pathLength={1} strokeDasharray={`${Math.max(0.001, head - tail)} 2`} strokeDashoffset={-tail} fill="none" stroke={color}
    strokeWidth={7 + random(`gw${seed}`) * 6} strokeLinecap="round" opacity={0.9} />;
};

// Torn-paper label for «من ورق أصنعها»
const tornClip = (seed: string) => {
  const top: string[] = [], bot: string[] = [];
  for (let i = 0; i <= 24; i++) { const x = (i / 24) * 100; top.push(`${x}% ${random(`${seed}t${i}`) * 7}%`); bot.push(`${100 - x}% ${100 - random(`${seed}b${i}`) * 7}%`); }
  return `polygon(${[...top, ...bot].join(",")})`;
};
const Strip: React.FC<{ at: number; out?: number; rot: number; size: number; seed: string; children: React.ReactNode; color?: string; bg?: string }> =
  ({ at, out, rot, size, seed, children, color = C.ink, bg = C.paper }) => {
    const { t } = useClk(); const spr = useSpr();
    if (t < at - 0.02) return null;
    const s = spr(at, { damping: 9, stiffness: 210 });
    const blow = out === undefined ? 0 : r(t, out, out + 0.7, EI);
    const pz = pulse(t, 9);
    return (
      <div style={{ position: "relative", display: "inline-block", transform: `translate(${-blow * 1300}px, ${-blow * 300 + Math.sin(blow * 9) * 40}px) rotate(${rot + (1 - s) * 20 - blow * 50}deg) scale(${interpolate(s, [0, 1], [1.8, 1]) + pz * 0.025})`,
        opacity: r(t, at, at + 0.06), filter: `drop-shadow(0 ${14 * s}px 0 rgba(29,42,68,0.28))` }}>
        <div style={{ clipPath: tornClip(seed), background: bg, padding: `${size * 0.05}px ${size * 0.42}px ${size * 0.12}px`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${staticFile("grain.png")})`, backgroundSize: "300px", opacity: 0.18, mixBlendMode: "multiply" }} />
          <svg style={{ position: "absolute", inset: size * 0.12, width: `calc(100% - ${size * 0.24}px)`, height: `calc(100% - ${size * 0.24}px)`, overflow: "visible" }}>
            <rect x={0} y={0} width="100%" height="100%" rx={10} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="16 12" strokeDashoffset={-t * 70} />
          </svg>
          <span style={{ position: "relative", fontFamily: F.display, fontSize: size, color, lineHeight: 1.65, whiteSpace: "nowrap", direction: "rtl" }}>{children}</span>
        </div>
      </div>
    );
  };

// ----------------------------------------------------------------------------
//  World: sky grade, sun, clouds, grain
// ----------------------------------------------------------------------------
const Sky: React.FC = () => {
  const { t, bass } = useClk();
  const keys = [0, 6.3, 11.3, 16.3, 21, 26, 30.4, 31.4, 36.2, 37.2, FILM_LEN];
  const top = interpolateColors(t, keys, ["#5AA8F0", "#3D8FE6", "#4C9BEE", "#2E7BDB", "#2A86E0", "#3B6FD8", "#5468D2", "#FF9A6A", "#F0707C", "#FFE3C4", "#FFE3C4"]);
  const bot = interpolateColors(t, keys, ["#D4F0FF", "#BFE6FF", "#DDF3FF", "#AEE0FF", "#FFE9B8", "#FFD7A0", "#FFC6A0", "#FFE1A0", "#FFCDA5", C.paper, C.paper]);
  return (
    <div style={{ position: "absolute", left: -520, top: -520, width: W + 1040, height: H + 1040 }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${bot} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(40% 25% at 30% 30%, rgba(255,240,200,${0.35 + bass * 0.5}), transparent 70%)` }} />
    </div>
  );
};

const Sun: React.FC = () => {
  const { t } = useClk();
  const pz = pulse(t, 6);
  const o = 1 - r(t, 36.4, 37.0);
  const x = 200, y = kf(t, [0, 30.6, 31.6], [330, 330, 420]);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o, overflow: "visible" }}>
      <g transform={`translate(${x} ${y}) rotate(${t * 14}) scale(${1 + pz * 0.12})`}>
        {Array.from({ length: 14 }, (_, i) => (
          <polygon key={i} points="-22,-110 22,-110 0,-190" fill={C.sun} opacity={0.8} transform={`rotate(${(i / 14) * 360})`} />
        ))}
        <circle r={96} fill={C.sun} stroke={C.sunDeep} strokeWidth={6} />
        <circle r={70} fill="#FFDA6B" />
      </g>
    </svg>
  );
};

const CLOUD_LAYERS = [
  { n: 7, s: 0.55, k: 0.35, o: 0.55, blur: 2 },
  { n: 6, s: 1.0, k: 0.75, o: 0.9, blur: 0 },
  { n: 3, s: 2.2, k: 1.6, o: 0.38, blur: 10 },
];
const Clouds: React.FC<{ layer: number }> = ({ layer }) => {
  const { t, wind, pan } = useClk();
  const L = CLOUD_LAYERS[layer];
  const spanX = W + 900 * L.s, spanY = H + 700 * L.s;
  const fade = 1 - r(t, 36.6, 37.4);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: L.o * fade, filter: L.blur ? `blur(${L.blur}px)` : undefined, overflow: "visible" }}>
      {Array.from({ length: L.n }, (_, i) => {
        const x = ((((random(`cx${layer}${i}`) * spanX - wind * L.k) % spanX) + spanX) % spanX) - 450 * L.s;
        const y = ((((random(`cy${layer}${i}`) * spanY + pan * L.k) % spanY) + spanY) % spanY) - 350 * L.s;
        const s = L.s * (0.7 + random(`cs${layer}${i}`) * 0.6);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            {[[-110, 20, 70], [-40, -20, 95], [50, -5, 85], [120, 25, 60], [0, 35, 80]].map(([dx, dy, rr], j) => (
              <circle key={j} cx={dx} cy={dy + 10} r={rr} fill="#CFE3F7" />
            ))}
            {[[-110, 20, 70], [-40, -20, 95], [50, -5, 85], [120, 25, 60], [0, 35, 80]].map(([dx, dy, rr], j) => (
              <circle key={j} cx={dx} cy={dy} r={rr} fill={C.white} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

// horizontal speed streaks (سريعة) and radial ones (تندفع)
const Speed: React.FC = () => {
  const { t, wind } = useClk();
  const hz = r(t, 7.5, 7.7) * (1 - r(t, 8.6, 9.2));
  const air = r(t, 13.9, 14.4) * (1 - r(t, 16.0, 16.4)) * 0.6;
  const k = Math.max(hz, air);
  const rad = r(t, 15.3, 15.4) * (1 - r(t, 15.6, 16.3));
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {k > 0 && Array.from({ length: 34 }, (_, i) => {
        const len = 180 + random(`sl${i}`) * 520, sp = 2.2 + random(`ss${i}`) * 2.5;
        const span = W + len + 200;
        const x = ((((random(`sx${i}`) * span - wind * sp) % span) + span) % span) - len;
        const y = 120 + random(`sy${i}`) * (H - 240);
        return <line key={i} x1={x} y1={y} x2={x + len} y2={y} stroke={C.white} strokeWidth={3 + random(`sw${i}`) * 7} strokeLinecap="round" opacity={k * (0.35 + random(`so${i}`) * 0.5)} />;
      })}
      {rad > 0 && Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2 + random(`ra${i}`) * 0.1;
        const ph = ((t * (2.2 + random(`rs${i}`)) + random(`rp${i}`)) % 1);
        const r0 = 160 + ph * 1100, r1 = r0 + 160 + random(`rl${i}`) * 260;
        return <line key={i} x1={CX + Math.cos(a) * r0} y1={CY + Math.sin(a) * r0} x2={CX + Math.cos(a) * r1} y2={CY + Math.sin(a) * r1}
          stroke={C.white} strokeWidth={4 + ph * 8} strokeLinecap="round" opacity={rad * (1 - ph) * 0.9} />;
      })}
    </svg>
  );
};

const Finish: React.FC = () => {
  const { frame } = useClk();
  return (
    <>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.png")})`, backgroundSize: "384px 384px",
        backgroundPosition: `${(frame * 137) % 384}px ${(frame * 71) % 384}px`, mixBlendMode: "overlay", opacity: 0.22 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 65% at 50% 50%, transparent 55%, rgba(29,42,68,0.32) 100%)" }} />
    </>
  );
};

// ----------------------------------------------------------------------------
//  HUD — line counter, BPM, altitude, spectrum, timecode
// ----------------------------------------------------------------------------
const LINE_STARTS = [1.46, 3.96, 6.4, 8.86, 11.36, 13.84, 16.36, 18.74];
const HUD: React.FC = () => {
  const { t, fps, frame, spec, pan } = useClk();
  const o = r(t, 0.3, 1.0) * (1 - r(t, 36.0, 36.4));
  if (o <= 0) return null;
  let line = 0; LINE_STARTS.forEach((s, i) => { if (t >= s - 0.05) line = i + 1; });
  const label = t >= 30.6 ? "REPRISE" : t >= 21.0 ? "IN FLIGHT" : `LINE ${String(Math.max(1, line)).padStart(2, "0")} / 08`;
  const pz = pulse(t, 9);
  const fast = t > 7.55 && t < 9.0;
  const kmh = Math.round(18 + 96 * r(t, 7.6, 7.8) * (1 - r(t, 8.4, 9.0)) + random(`kmh${Math.floor(frame / 3)}`) * 3);
  const alt = Math.max(2, Math.round(4 + pan / 22 + (t > 21 && t < 30.6 ? 30 + Math.sin(t) * 6 : 0)));
  const tc = (s: number) => `00:00:${String(Math.floor(s)).padStart(2, "0")}:${String(Math.floor((s % 1) * fps)).padStart(2, "0")}`;
  const mono: React.CSSProperties = { fontFamily: F.mono, fontSize: 24, letterSpacing: 4, color: "rgba(29,42,68,0.72)", direction: "ltr", fontWeight: 500 };
  const k = hero(t);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ ...mono, position: "absolute", top: 86, left: 70, display: "flex", alignItems: "center", gap: 16 }}>
        <svg width={34} height={44} viewBox="-150 -220 300 440" style={{ transform: `scale(${1 + pz * 0.3}) rotate(${Math.sin(t * 2) * 8}deg)` }}>
          <polygon points={poly([KT, KR, KB, KL])} fill={C.coral} stroke={C.ink} strokeWidth={24} strokeLinejoin="round" />
        </svg>
        <span>096 BPM</span>
      </div>
      <div style={{ ...mono, position: "absolute", top: 86, right: 70, textAlign: "right" }}>
        {label}
        <div style={{ display: "flex", gap: 7, marginTop: 14, justifyContent: "flex-end" }}>
          {Array.from({ length: 8 }, (_, v) => <div key={v} style={{ width: 30, height: 5, borderRadius: 3,
            background: t >= 21 || v < line ? C.coral : "rgba(29,42,68,0.18)" }} />)}
        </div>
      </div>
      <div style={{ ...mono, position: "absolute", bottom: 92, left: 70, fontSize: 22 }}>{tc(t)}</div>
      <div style={{ ...mono, position: "absolute", bottom: 92, right: 70, fontSize: 22, textAlign: "right" }}>
        {fast ? <span style={{ color: C.coralDeep }}>SPD {String(kmh).padStart(3, "0")} km/h</span> : <>ALT {String(alt).padStart(3, "0")} m</>}
      </div>
      {/* altitude gauge on the right edge, needle follows the kite */}
      <svg width={40} height={600} style={{ position: "absolute", right: 34, top: 660 }}>
        {Array.from({ length: 31 }, (_, i) => <line key={i} x1={i % 5 ? 26 : 14} x2={40} y1={i * 20} y2={i * 20} stroke="rgba(29,42,68,0.35)" strokeWidth={2} />)}
        <polygon points={`0,${Math.max(0, Math.min(600, k.y / 3.2)) - 9} 14,${Math.max(0, Math.min(600, k.y / 3.2))} 0,${Math.max(0, Math.min(600, k.y / 3.2)) + 9}`} fill={C.coral} />
      </svg>
      <svg width={300} height={50} style={{ position: "absolute", bottom: 84, left: CX - 150 }}>
        {Array.from({ length: 30 }, (_, i) => {
          const v = spec[(i % 15) + 1] ?? 0; const h = 3 + Math.min(1, v * 3.2) * 44;
          return <rect key={i} x={i * 10} y={25 - h / 2} width={4} height={h} rx={2} fill={i % 5 === 0 ? C.coral : "rgba(29,42,68,0.5)"} />;
        })}
      </svg>
      {[[46, 46], [W - 46, 46], [46, H - 46], [W - 46, H - 46]].map(([x, y], i) => (
        <svg key={i} width={36} height={36} style={{ position: "absolute", left: x - 18, top: y - 18 }}>
          <path d="M18 0V36M0 18H36" stroke="rgba(29,42,68,0.3)" strokeWidth={2} />
        </svg>
      ))}
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  Hero kite layer: string, tail, kite (shared by every scene)
// ----------------------------------------------------------------------------
const HEART_L = "C 46 8, 39 2, 28 2 C 14 2, 2 13, 2 29 C 2 50, 22 68, 50 90";
const HEART_R = "C 54 8, 61 2, 72 2 C 86 2, 98 13, 98 29 C 98 50, 78 68, 50 90";
// transform heart-space path commands to world space
const heartPath = (cmds: string, hx: number, hy: number, k: number) =>
  cmds.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => `${(hx + (+a - 50) * k).toFixed(1)} ${(hy + (+b - 46) * k).toFixed(1)}`);

const HeartString: React.FC<{ at: number; out: number; hx: number; hy: number; k: number }> = ({ at, out, hx, hy, k }) => {
  const { t } = useClk();
  if (t < at || t > out + 0.5) return null;
  const kk = hero(t); const [bx, by] = toWorld(kk, 0, 200);
  const cusp = [hx, hy + (17 - 46) * k], tip = [hx, hy + (90 - 46) * k];
  const main = `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${bx + 40} ${(by + cusp[1]) / 2} ${cusp[0]} ${cusp[1]} ${heartPath(HEART_L, hx, hy, k)} Q ${tip[0] - 60} ${tip[1] + 160} ${tip[0]} ${H + 200}`;
  const right = `M ${cusp[0]} ${cusp[1]} ${heartPath(HEART_R, hx, hy, k)}`;
  const pA = r(t, at, at + 0.95, EIO), pB = r(t, at + 0.18, at + 0.7, EIO);
  const o = 1 - r(t, out, out + 0.45);
  const pz = pulse(t, 8);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o, overflow: "visible" }}>
      <path d={heartPath(`M 50 90 ${"C 22 68, 2 50, 2 29 C 2 13, 14 2, 28 2 C 39 2, 46 8, 50 17 C 54 8, 61 2, 72 2 C 86 2, 98 13, 98 29 C 98 50, 78 68, 50 90 Z"}`, hx, hy, k)}
        fill={C.rose} opacity={r(t, at + 0.7, at + 1.1) * (0.35 + pz * 0.2)} transform={`translate(${hx} ${hy}) scale(${1 + pz * 0.04}) translate(${-hx} ${-hy})`} />
      <path d={main} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pA} fill="none" stroke={C.white} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d={right} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pB} fill="none" stroke={C.white} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const HeroLayer: React.FC = () => {
  const { t } = useClk();
  const k = hero(t);
  const fold = kf(t, [1.5, 2.1, 2.16, 2.7], [0, 1, 1, 2], EIO);
  const paint = r(t, 2.7, 3.15, EO);
  const spar = r(t, 2.9, 3.4, EIO);
  // plain string to the hand, hidden while the heart string is drawn
  const heartOn = (t > 2.65 && t < 4.35) || (t > 32.35 && t < 34.0);
  const strO = r(t, 3.0, 3.6) * (heartOn ? 0 : 1) * (1 - r(t, 36.3, 36.8)) * (t > 7.55 && t < 8.7 ? 0 : 1);
  const [bx, by] = toWorld(k, 0, -40);
  const [hx, hy] = hand(t);
  const taut = Math.max(r(t, 11.36, 11.5) * (1 - r(t, 12.6, 13.6)), r(t, 15.3, 15.4) * (1 - r(t, 15.8, 16.3)));
  const sag = (1 - taut) * (130 + Math.sin(t * 3) * 25);
  const mx = (bx + hx) / 2 + sag * 0.9, my = (by + hy) / 2 + sag * 0.3;
  const vib = Math.max(0, 1 - (t - 11.36) * 2) * (t > 11.36 ? 1 : 0);
  const tailN = Math.round(26 * r(t, 3.85, 4.5));
  const pts = tailN > 1 ? tailPts(hero, t, tailN) : [];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {strO > 0 && <path d={`M ${bx} ${by} Q ${mx + Math.sin(t * 60) * 18 * vib} ${my} ${hx} ${hy}`} fill="none" stroke={C.white} strokeWidth={t > 8.8 && t < 11.3 ? 3 : 5}
        opacity={strO * 0.95} strokeLinecap="round" />}
      {pts.length > 1 && <Tail pts={pts} s={k.s} />}
      <Kite k={k} id="hero" fold={fold} paint={paint} spar={spar} />
    </svg>
  );
};

// ----------------------------------------------------------------------------
//  01 — طيارتي أحبها  (0 → 3.95): the sheet falls, folds itself, string draws a heart
// ----------------------------------------------------------------------------
const S1: React.FC = () => {
  const { t } = useClk();
  if (t > 4.4) return null;
  return (
    <AbsoluteFill>
      <HeartString at={2.7} out={3.85} hx={CX} hy={1560} k={5.6} />
      <Row y={300}>
        <Word at={1.46} out={3.8} kind="slam" size={210} color={C.white} sh={C.ink}>طَيَّارَتِي</Word>
      </Row>
      <Row y={1560}>
        <Word at={2.7} out={3.8} kind="pop" font={F.script} size={160} color={C.white} sh={C.coralDeep} shD={6}>أُحِبُّهَا</Word>
      </Row>
      <Shock at={2.7} x={CX} y={900} color={C.white} max={760} />
      <Particles at={2.72} n={60} x={CX} y={900} seed="paint" colors={[C.coral, C.sun, C.teal, C.white]} speed={1700} />
      {/* fold "tick" marks: a quick crease flash on each beat-locked fold */}
      {[2.1, 2.7].map((a) => t > a && t < a + 0.3 && <AbsoluteFill key={a} style={{ background: C.white, opacity: (1 - (t - a) / 0.3) * 0.25 }} />)}
      <Row y={1660}>
        <span style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: 10, color: C.ink, opacity: r(t, 0.4, 0.9) * (1 - r(t, 1.4, 1.6)), direction: "ltr" }}>FOLD · 01 · 02</span>
      </Row>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  02 — من ورق أصنعها  (3.95 → 6.4): torn paper stickers, then the wind takes them
// ----------------------------------------------------------------------------
const S2: React.FC = () => {
  const { t } = useClk();
  if (t < 3.9 || t > 7.3) return null;
  return (
    <AbsoluteFill>
      <Row y={1050} gap={40}>
        <Strip at={3.96} out={6.25} rot={-4} size={130} seed="min">مِنْ</Strip>
        <Strip at={4.38} out={6.3} rot={3} size={150} seed="waraq" bg={C.sun}>وَرَقٍ</Strip>
      </Row>
      <Row y={1340}>
        <Strip at={5.18} out={6.38} rot={-2} size={190} seed="asnaa" bg={C.coral} color={C.white}>أَصْنَعُهَا</Strip>
      </Row>
      <Particles at={5.2} n={40} x={CX} y={1340} seed="snip" colors={[C.paper, C.sun, C.coral]} speed={1300} life={1.3} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <Gust at={6.1} y={1120} seed={1} />
        <Gust at={6.2} y={1400} seed={2} len={900} />
        <Gust at={6.3} y={900} seed={3} len={500} />
      </svg>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  03 — طيارتي سريعة  (6.4 → 8.8): speed lines, gusts, a smear-frame word
// ----------------------------------------------------------------------------
const S3: React.FC = () => {
  const { t } = useClk(); const spr = useSpr();
  if (t < 6.3 || t > 9.1) return null;
  const s = spr(7.64, { damping: 12, stiffness: 240 });
  const x = (1 - s) * 1400;
  const exit = r(t, 8.55, 8.95, EI);
  const pz = pulse(t, 9);
  const big: React.CSSProperties = { fontFamily: F.display, fontSize: 290, lineHeight: 1.6, whiteSpace: "nowrap", display: "inline-block", padding: "0 30px" };
  return (
    <AbsoluteFill style={{ transform: `translateX(${-exit * 1600}px)` }}>
      <Row y={560}>
        <Word at={6.4} out={8.55} kind="drop" size={150} color={C.ink} sh={C.white} shD={6}>طَيَّارَتِي</Word>
      </Row>
      {t >= 7.6 && (
        <Row y={980}>
          <div style={{ position: "relative", transform: `translateX(${x}px) skewX(${-16 * (1 - s) - 8}deg) scale(${1 + pz * 0.05})` }}>
            {[4, 3, 2, 1].map((k) => (
              <span key={k} style={{ ...big, position: "absolute", left: 0, top: 0, color: [C.coral, C.sun, C.teal, C.white][k - 1],
                transform: `translateX(${k * (60 + (1 - s) * 260)}px)`, opacity: (0.55 / k) * (1 - r(t, 7.9, 8.4)) + 0.08, filter: `blur(${k * 2}px)` }}>سَرِيعَة</span>
            ))}
            <span style={{ ...big, position: "relative", color: C.white, textShadow: shadow(C.coralDeep, 12) }}>سَرِيعَة</span>
          </div>
        </Row>
      )}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[7.58, 7.7, 7.85, 8.0, 8.2].map((a, i) => <Gust key={a} at={a} y={300 + ((i * 397) % 1300)} seed={10 + i} len={600 + i * 90} dur={0.6} />)}
      </svg>
      <AbsoluteFill style={{ background: C.white, opacity: (t >= 7.64 ? 1 - r(t, 7.64, 7.85) : 0) * 0.45 }} />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  04 — خيوطها رفيعة  (8.86 → 11.3): hairline type laid along the string
// ----------------------------------------------------------------------------
const S4: React.FC = () => {
  const { t } = useClk();
  if (t < 8.7 || t > 11.6) return null;
  const k = hero(t); const [bx, by] = toWorld(k, 0, -40); const [hx, hy] = hand(t);
  const ang = (Math.atan2(by - hy, bx - hx) * 180) / Math.PI;
  const at = (f: number, off: number) => {
    const x = hx + (bx - hx) * f, y = hy + (by - hy) * f; const a = (ang * Math.PI) / 180;
    return { left: x + Math.sin(a) * off, top: y - Math.cos(a) * off };
  };
  const exit = r(t, 11.2, 11.5, EI);
  const thin = (sz: number, stroke: number): React.CSSProperties => ({ fontFamily: F.round, fontWeight: 400, fontSize: sz, lineHeight: 1.6, whiteSpace: "nowrap",
    color: "transparent", WebkitTextStroke: `${stroke}px ${C.white}`, direction: "rtl", display: "inline-block" });
  const p1 = r(t, 8.86, 9.6, EIO), p2 = r(t, 10.16, 10.8, EIO);
  const lbl = (pos: { left: number; top: number }, p: number, children: React.ReactNode) => (
    <div style={{ position: "absolute", left: pos.left, top: pos.top, transform: `translate(-50%, -50%) rotate(${ang}deg)`, opacity: 1 - exit }}>
      <div style={{ clipPath: `inset(-30% -5% -30% ${(1 - p) * 100}%)` }}>{children}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      {lbl(at(0.66, -95), p1, <span style={thin(150, 3)}>خُيُوطُهَا</span>)}
      {lbl(at(0.32, 95), p2, <span style={{ ...thin(170, 1.6 + (1 - p2) * 3) }}>رَفِيعَة</span>)}
      {/* caliper callout on the thread */}
      {(() => {
        const pos = at(0.18, -70); const o = r(t, 10.5, 10.8) * (1 - exit);
        return <div style={{ position: "absolute", left: pos.left, top: pos.top, transform: `translate(-50%,-50%) rotate(${ang}deg)`, opacity: o,
          fontFamily: F.mono, fontSize: 24, letterSpacing: 4, color: C.white, direction: "ltr", whiteSpace: "nowrap" }}>⟷ Ø 0.8 mm</div>;
      })()}
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  05 — أسحبها فترتفع  (11.36 → 13.8): tug, then the camera falls away below it
// ----------------------------------------------------------------------------
const S5: React.FC = () => {
  const { t } = useClk(); const spr = useSpr();
  if (t < 11.3 || t > 14.3) return null;
  const tug = t > 11.36 ? Math.exp(-(t - 11.36) * 7) * Math.sin((t - 11.36) * 34) : 0;
  const rise = r(t, 12.62, 13.6, EO);
  const out = r(t, 13.65, 14.0, EI);
  const s2 = spr(12.62, { damping: 12, stiffness: 120 });
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Row y={1250} style={{ transform: `translate(${tug * 30}px, calc(-50% + ${tug * 40 + rise * 300}px))` }}>
        <Word at={11.36} kind="slam" size={190} color={C.white} sh={C.ink}>أَسْحَبُهَا</Word>
      </Row>
      {/* rope-pull arrows */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: r(t, 11.4, 11.6) * (1 - r(t, 12.4, 12.7)) }}>
        {[0, 1, 2].map((i) => { const y = 1480 + i * 70 + ((t * 300) % 70); return <polyline key={i} points={`${CX - 50},${y - 30} ${CX},${y + 10} ${CX + 50},${y - 30}`} fill="none" stroke={C.white} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.8 - i * 0.22} />; })}
      </svg>
      {t >= 12.6 && (
        <Row y={1500 - s2 * 700}>
          <span style={{ fontFamily: F.display, fontSize: 230, lineHeight: 1.6, color: C.sun, textShadow: shadow(C.ink, 10), display: "inline-block",
            transform: `scaleY(${1 + (1 - s2) * 0.6})`, opacity: r(t, 12.62, 12.7) }}>فَتَرْتَفِعْ</span>
        </Row>
      )}
      {/* rising arrows / streaks underneath */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: r(t, 12.62, 12.8) * (1 - r(t, 13.2, 13.7)) }}>
        {Array.from({ length: 18 }, (_, i) => { const x = 80 + random(`ux${i}`) * 920; const y = ((random(`uy${i}`) * H + (t - 12.6) * 2600) % (H + 400)) - 200;
          return <line key={i} x1={x} y1={y} x2={x} y2={y + 160 + random(`ul${i}`) * 200} stroke={C.white} strokeWidth={5} strokeLinecap="round" opacity={0.6} />; })}
      </svg>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  06 — وفي الهواء تندفع  (13.84 → 16.3): the air ripples the word, then a dash
// ----------------------------------------------------------------------------
const S6: React.FC = () => {
  const { t } = useClk(); const spr = useSpr();
  if (t < 13.7 || t > 16.5) return null;
  const amp = 26 * r(t, 14.26, 14.8) * (1 - r(t, 15.2, 15.6) * 0.6);
  const out = r(t, 16.0, 16.35, EI);
  const dash = spr(15.34, { damping: 11, stiffness: 150 });
  const word = <span style={{ fontFamily: F.display, fontSize: 250, lineHeight: 1.6, color: C.white, whiteSpace: "nowrap", display: "inline-block", padding: "0 30px",
    textShadow: shadow(C.teal, 10) }}>الْهَوَاءِ</span>;
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${1 + out * 0.4})` }}>
      <Row y={1190}>
        <Word at={13.84} kind="soft" size={130} color={C.ink} sh={C.white} shD={5}>وَفِي</Word>
      </Row>
      <Row y={1440} style={{ opacity: r(t, 14.26, 14.45) * (1 - r(t, 15.3, 15.5)), transform: `translateY(-50%) scale(${0.85 + r(t, 14.26, 14.7) * 0.15})` }}>
        <Sliced n={34} axis="x" off={(i) => [0, Math.sin(t * 9 - i * 0.42) * amp]}>{word}</Sliced>
      </Row>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[14.26, 14.55, 14.9, 15.1].map((a, i) => <Gust key={a} at={a} y={1300 + (i % 2) * 300 - i * 40} seed={20 + i} len={700} dur={0.85} dir={i % 2 ? 1 : -1} />)}
      </svg>
      {t >= 15.3 && (
        <Row y={1640}>
          <span style={{ fontFamily: F.display, fontSize: 280, lineHeight: 1.6, color: C.coral, textShadow: shadow(C.ink, 12), display: "inline-block",
            transform: `scale(${interpolate(dash, [0, 1], [0.2, 1])})`, filter: `blur(${(1 - r(t, 15.34, 15.55)) * 16}px)` }}>تَنْدَفِعْ</span>
        </Row>
      )}
      <Shock at={15.34} x={CX} y={CY} color={C.white} max={1200} width={14} />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  07 — برأسها تميل  (16.36 → 18.7): the whole frame leans with the kite
// ----------------------------------------------------------------------------
const tilt = (t: number, fps: number) => {
  const a = sprAt(t, fps, 16.36, { damping: 9, stiffness: 90 }) * 4;
  const b = sprAt(t, fps, 17.56, { damping: 6, stiffness: 70 }) * -17;
  const back = sprAt(t, fps, 18.6, { damping: 8, stiffness: 80 }) * 13;
  return a + b + back;
};
const S7: React.FC = () => {
  const { t } = useClk();
  if (t < 16.2 || t > 19.0) return null;
  const out = r(t, 18.55, 18.85, EI);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Row y={1100}>
        <Word at={16.36} kind="drop" size={180} color={C.white} sh={C.ink}>بِرَأْسِهَا</Word>
      </Row>
      <Row y={1380}>
        <Word at={17.56} kind="pop" size={240} color={C.sun} sh={C.ink} style={{ transform: "skewX(-12deg)" }}>تَمِيلُ</Word>
      </Row>
      {/* spirit level: the bubble slides as the frame leans */}
      <div style={{ position: "absolute", left: CX - 170, top: 1610, width: 340, height: 54, borderRadius: 27, border: `4px solid ${C.ink}`, background: "rgba(255,255,255,0.55)",
        opacity: r(t, 16.5, 16.8) * (1 - out) }}>
        <div style={{ position: "absolute", left: 150 - 12, top: 0, bottom: 0, width: 2, background: C.ink, opacity: 0.4 }} />
        <div style={{ position: "absolute", left: 150 + 26, top: 0, bottom: 0, width: 2, background: C.ink, opacity: 0.4 }} />
        <div style={{ position: "absolute", top: 8, width: 64, height: 30, borderRadius: 15, background: C.teal,
          left: 138 + Math.max(-130, Math.min(130, tilt(t, 60) * -9)) }} />
      </div>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  08 — وذيلها طويل  (18.74 → 21.0): the tail unrolls into a ribbon with the last word
// ----------------------------------------------------------------------------
const RIB_W = 960, RIB_H = 240, RIB_Y = 1250;
const ribWave = (t: number, i: number, n: number) => Math.sin(t * 6.5 - (i / n) * 9) * 30 + Math.sin(t * 3.1 - (i / n) * 4) * 14;
const S8: React.FC = () => {
  const { t } = useClk();
  if (t < 18.6 || t > 22.0) return null;
  const k = hero(t); const [bx, by] = toWorld(k, 0, 200);
  const grow = r(t, 18.74, 19.7, EIO);
  const unroll = r(t, 20.02, 20.7, EO);
  const away = r(t, 20.95, 21.8, EI);
  const n = 56;
  // ribbon right end (RTL: it unrolls from the right toward the left)
  const ax = CX + RIB_W / 2 - 10, ay = RIB_Y + ribWave(t, n - 1, n);
  const tailPath = `M ${bx} ${by} C ${bx + 160} ${by + 260 + Math.sin(t * 3) * 40}, ${ax + 260} ${ay - 420}, ${ax} ${ay - RIB_H / 2 + 30}`;
  // bows along the extended tail
  const bows = Array.from({ length: 7 }, (_, i) => {
    const u = (i + 1) / 8; if (u > grow) return null;
    const p0 = [bx, by], p1 = [bx + 160, by + 260 + Math.sin(t * 3) * 40], p2 = [ax + 260, ay - 420], p3 = [ax, ay - RIB_H / 2 + 30];
    const bz = (j: number) => (1 - u) ** 3 * p0[j] + 3 * (1 - u) ** 2 * u * p1[j] + 3 * (1 - u) * u * u * p2[j] + u ** 3 * p3[j];
    const z = 24;
    return <g key={i} transform={`translate(${bz(0)} ${bz(1)}) rotate(${Math.sin(t * 5 + i) * 25})`}>
      <polygon points={`0,0 ${-z},${-z * 0.6} ${-z},${z * 0.6}`} fill={BOWS[i % 4]} stroke={C.ink} strokeWidth={3} />
      <polygon points={`0,0 ${z},${-z * 0.6} ${z},${z * 0.6}`} fill={BOWS[i % 4]} stroke={C.ink} strokeWidth={3} />
    </g>;
  });
  const ribbon = (
    <div style={{ width: RIB_W, height: RIB_H, position: "relative", background: `linear-gradient(180deg, #FF8576 0%, ${C.coral} 45%, ${C.coralDeep} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{ position: "absolute", inset: "16px 0", borderTop: "4px dashed rgba(255,255,255,0.7)", borderBottom: "4px dashed rgba(255,255,255,0.7)" }} />
      <span style={{ fontFamily: F.display, fontSize: 175, lineHeight: 1.6, color: C.white, textShadow: `0 7px 0 ${C.coralDeep}`, whiteSpace: "nowrap", marginTop: 12 }}>طَوِيلُ</span>
    </div>
  );
  const edge = (1 - unroll) * RIB_W; // x (from left) where the rolled-up part sits
  const ei = Math.min(n - 1, Math.floor((edge / RIB_W) * n));
  return (
    <AbsoluteFill style={{ transform: `translate(${-away * 1400}px, ${-away * 500}px) rotate(${-away * 14}deg)`, opacity: 1 - r(t, 21.5, 21.9) }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={tailPath} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
        {bows}
      </svg>
      <Row y={RIB_Y - 330}>
        <Word at={18.74} kind="rise" size={160} color={C.white} sh={C.ink} out={20.9}>وَذَيْلُهَا</Word>
      </Row>
      {t >= 19.9 && (
        <div style={{ position: "absolute", left: CX - RIB_W / 2, top: RIB_Y - RIB_H / 2, filter: dshadow("rgba(29,42,68,0.35)", 10) }}>
          <div style={{ clipPath: `inset(-60% 0 -60% ${edge}px)` }}>
            <Sliced n={n} axis="x" off={(i) => [0, ribWave(t, i, n)]}>{ribbon}</Sliced>
          </div>
          {/* the roll, riding the wave at the unrolling edge */}
          {unroll < 0.995 && (
            <div style={{ position: "absolute", left: edge - 30, top: -18 + ribWave(t, ei, n), width: 60 + (1 - unroll) * 30, height: RIB_H + 36, borderRadius: 40,
              background: `linear-gradient(90deg, ${C.coralDeep}, #FF9C90 45%, ${C.coral} 70%, ${C.coralDeep})`, border: `4px solid ${C.ink}` }} />
          )}
        </div>
      )}
      <Particles at={20.65} n={50} x={CX - RIB_W / 2} y={RIB_Y} seed="ribbon" colors={[C.sun, C.teal, C.white, C.coral]} speed={1400} life={1.3} />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  09 — instrumental flight  (21.0 → 30.6): rooftops, a sky of kites, a loop
// ----------------------------------------------------------------------------
const ROOFS = (() => {
  const out: { x: number; w: number; h: number; kind: number }[] = [];
  let x = -40; let i = 0;
  while (x < W + 40) { const w = 90 + random(`rw${i}`) * 150; out.push({ x, w, h: 160 + random(`rh${i}`) * 260, kind: Math.floor(random(`rk${i}`) * 4) }); x += w - 4; i++; }
  return out;
})();
const Rooftops: React.FC = () => {
  const { t } = useClk();
  const up = r(t, 21.0, 22.2, EO) * (1 - r(t, 30.3, 31.1, EI));
  if (up <= 0) return null;
  const pz = pulse(t, 8);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - up) * 700}px)` }}>
      {/* far skyline */}
      <g opacity={0.5} transform={`translate(${-((t - 21) * 18) % 200} 0)`}>
        {ROOFS.map((b, i) => <rect key={i} x={b.x * 1.1 - 60} y={H - b.h - 140} width={b.w} height={b.h + 200} fill="#7FA6D9" />)}
      </g>
      <g>
        {ROOFS.map((b, i) => {
          const top = H - b.h + 40;
          return (
            <g key={i}>
              <rect x={b.x} y={top} width={b.w} height={b.h} fill={C.inkSoft} stroke={C.ink} strokeWidth={4} />
              <rect x={b.x - 6} y={top - 14} width={b.w + 12} height={18} fill={C.ink} />
              {b.kind === 0 && <g><rect x={b.x + b.w * 0.3} y={top - 70} width={46} height={56} rx={8} fill="#E8EEF7" stroke={C.ink} strokeWidth={4} /><rect x={b.x + b.w * 0.3 + 8} y={top - 84} width={30} height={16} fill={C.ink} /></g>}
              {b.kind === 1 && <path d={`M ${b.x + b.w * 0.2} ${top - 14} q ${b.w * 0.3} -${b.w * 0.55} ${b.w * 0.6} 0 Z`} fill={C.teal} stroke={C.ink} strokeWidth={4} />}
              {b.kind === 2 && <g><rect x={b.x + b.w * 0.6} y={top - 260} width={26} height={250} fill="#E8EEF7" stroke={C.ink} strokeWidth={4} /><circle cx={b.x + b.w * 0.6 + 13} cy={top - 270} r={18} fill={C.sun} stroke={C.ink} strokeWidth={4} /></g>}
              {Array.from({ length: Math.floor(b.w / 46) }, (_, j) => (
                <rect key={j} x={b.x + 18 + j * 46} y={top + 40} width={24} height={34} rx={4} fill={random(`win${i}-${j}`) > 0.6 ? C.sun : "#506590"} opacity={0.6 + pz * 0.4 * (random(`wb${i}-${j}`) > 0.7 ? 1 : 0)} />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const FRIENDS = [
  { at: 22.55, x: 210, y: 520, s: 0.42, c1: C.teal, c2: C.white },
  { at: 23.78, x: 880, y: 640, s: 0.36, c1: C.rose, c2: C.sun },
  { at: 25.03, x: 330, y: 1180, s: 0.32, c1: C.sun, c2: C.sky },
  { at: 27.49, x: 820, y: 1140, s: 0.4, c1: C.sky, c2: C.white },
  { at: 28.75, x: 560, y: 360, s: 0.3, c1: C.coral, c2: C.teal },
];
const friend = (i: number) => (t: number): KS => {
  const f = FRIENDS[i];
  const up = r(t, f.at, f.at + 1.3, EO);
  const leave = r(t, 30.2, 31.0, EI);
  return { x: f.x + Math.sin(t * 1.3 + i) * 40 + (1 - up) * (i % 2 ? 120 : -120), y: f.y + Math.sin(t * 1.7 + i * 2) * 26 + (1 - up) * 1300 - leave * 1700,
    rot: Math.sin(t * 1.5 + i) * 10, s: f.s };
};
const Flight: React.FC = () => {
  const { t } = useClk();
  if (t < 20.9 || t > 31.2) return null;
  const o = r(t, 21.0, 21.8) * (1 - r(t, 30.6, 31.2));
  const downbeats = BEATS.filter((b, i) => b > 21.3 && b < 30.5 && i % 4 === 0);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {/* marquee of the title behind everything */}
      <AbsoluteFill style={{ direction: "rtl", opacity: 0.16 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ position: "absolute", top: 120 + i * 230, left: -600, whiteSpace: "nowrap", fontFamily: F.display, fontSize: 190, lineHeight: 1.4,
            color: i % 2 ? "transparent" : C.white, WebkitTextStroke: i % 2 ? `3px ${C.white}` : undefined,
            transform: `translateX(${(i % 2 ? 1 : -1) * (t - 21) * 140 + (i % 2 ? -500 : 0)}px)` }}>
            {"طَيَّارَتِي ✦ طَيَّارَتِي ✦ طَيَّارَتِي ✦ طَيَّارَتِي ✦ "}
          </div>
        ))}
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {FRIENDS.map((f, i) => {
          if (t < f.at) return null;
          const pos = friend(i); const k = pos(t); const [bx, by] = toWorld(k, 0, -40);
          return (
            <g key={i}>
              <path d={`M ${bx} ${by} Q ${bx + 60} ${(by + H) / 2} ${bx - 80 + i * 40} ${H + 60}`} fill="none" stroke={C.white} strokeWidth={2.5} opacity={0.7} />
              <Tail pts={tailPts(pos, t, 18, 0.05, 11)} s={k.s} seed={i + 1} />
              <Kite k={k} id={`f${i}`} c1={f.c1} c2={f.c2} />
            </g>
          );
        })}
        {/* birds */}
        {Array.from({ length: 6 }, (_, i) => {
          const x = W + 100 - ((t - 21) * (90 + i * 14) + i * 230) % (W + 300), y = 300 + i * 70 + Math.sin(t + i) * 30;
          const f = Math.sin(t * 11 + i * 2) * 14;
          return <path key={i} d={`M ${x - 26} ${y - f} Q ${x - 12} ${y - 10} ${x} ${y} Q ${x + 12} ${y - 10} ${x + 26} ${y - f}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" opacity={0.7} />;
        })}
      </svg>
      {downbeats.map((b, i) => { const k = hero(b); return <Particles key={b} at={b} n={26} x={k.x} y={k.y} seed={`db${i}`} colors={[C.coral, C.sun, C.teal, C.white]} speed={900} life={1.1} />; })}
      <Shock at={26.26} x={CX} y={CY} color={C.white} max={1100} width={12} />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  10 — reprise  (31.1 → 36.0): the first two lines return in sunset light
// ----------------------------------------------------------------------------
const S10: React.FC = () => {
  const { t } = useClk();
  if (t < 30.9 || t > 36.5) return null;
  return (
    <AbsoluteFill>
      <HeartString at={32.4} out={33.5} hx={CX} hy={1490} k={4.4} />
      <Row y={300}>
        <Word at={31.14} out={36.0} kind="slam" size={190} color={C.white} sh={C.coralDeep}>طَيَّارَتِي</Word>
      </Row>
      <Row y={1490}>
        <Word at={32.4} out={33.45} kind="pop" font={F.script} size={120} color={C.white} sh={C.coralDeep} shD={6}>أُحِبُّهَا</Word>
      </Row>
      <Row y={1240} gap={40}>
        <Strip at={33.64} out={35.6} rot={-4} size={120} seed="min2">مِنْ</Strip>
        <Strip at={34.06} out={35.65} rot={3} size={140} seed="waraq2" bg={C.sun}>وَرَقٍ</Strip>
      </Row>
      <Row y={1510}>
        <Strip at={34.86} out={35.7} rot={-2} size={180} seed="asnaa2" bg={C.teal} color={C.white}>أَصْنَعُهَا</Strip>
      </Row>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <Gust at={35.5} y={1300} seed={41} />
        <Gust at={35.6} y={1560} seed={42} len={900} />
      </svg>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  11 — the last «طيارتي» and the end card  (36.1 → end)
// ----------------------------------------------------------------------------
const S11: React.FC = () => {
  const { t } = useClk();
  if (t < 36.0) return null;
  return (
    <AbsoluteFill>
      <Row y={1330}>
        <Word at={36.1} kind="slam" size={250} color={C.coral} sh={C.ink}>طَيَّارَتِي</Word>
      </Row>
      <Shock at={36.1} x={CX} y={640} color={C.coral} max={1300} width={14} />
      <Shock at={36.22} x={CX} y={640} color={C.sun} max={1000} width={8} />
      <Particles at={36.1} n={140} x={CX} y={640} seed="fin" colors={[C.coral, C.sun, C.teal, C.white, C.rose]} speed={2400} grav={520} life={2.2} />
      <Row y={1530}>
        <Word at={36.55} kind="rise" font={F.mono} size={24} color={C.ink} sh="" style={{ letterSpacing: 12, direction: "ltr", fontWeight: 500 }}>A LYRIC FILM — 2026</Word>
      </Row>
      <AbsoluteFill style={{ background: C.white, opacity: (t >= 36.1 ? 1 - r(t, 36.1, 36.35) : 0) * 0.7 }} />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
export const Tayarati: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const src = staticFile("song.mp3");
  const audio = useAudioData(src);
  const spec = audio ? visualizeAudio({ fps, frame, audioData: audio, numberOfSamples: 64, smoothing: true }) : [];
  const bass = spec.length ? (spec[0] + spec[1] + spec[2] + spec[3]) / 4 : 0;
  const wind = integrate(windSpeed, t), pan = integrate(riseSpeed, t);
  const pz = pulse(t, 10);
  // camera: lean for «تميل», jolt for «أسحبها», shake on «سريعة»/«تندفع», a kick on every beat
  const shake = Math.max(t > 7.64 ? Math.exp(-(t - 7.64) * 5) : 0, t > 15.34 ? Math.exp(-(t - 15.34) * 5) : 0, t > 36.1 ? Math.exp(-(t - 36.1) * 5) : 0) * 26;
  const jolt = t > 11.36 ? Math.exp(-(t - 11.36) * 6) * Math.sin((t - 11.36) * 28) * 26 : 0;
  const cam = `translate(${(random(`cx${frame}`) - 0.5) * shake}px, ${(random(`cy${frame}`) - 0.5) * shake + jolt}px) rotate(${tilt(t, fps) + Math.sin(t * 0.4) * 0.4}deg) scale(${1 + pz * 0.012})`;
  const endFade = r(t, FILM_LEN - 0.5, FILM_LEN);
  return (
    <FontGate>
      <Ctx.Provider value={{ t, fps, frame, spec, bass, wind, pan }}>
        <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
          <Audio src={src} />
          <AbsoluteFill style={{ transform: cam }}>
            <Sky />
            <Sun />
            <Clouds layer={0} />
            <Clouds layer={1} />
            <Rooftops />
            <Speed />
            <Flight />
            <S2 /><S3 /><S4 /><S5 /><S6 /><S7 /><S8 /><S10 />
            <HeroLayer />
            <S1 /><S11 />
            <Clouds layer={2} />
          </AbsoluteFill>
          <HUD />
          <Finish />
          <AbsoluteFill style={{ background: C.paper, opacity: endFade }} />
        </AbsoluteFill>
      </Ctx.Provider>
    </FontGate>
  );
};
