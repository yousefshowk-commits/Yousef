import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import lip from "./lipsync.json";

// ============================================================================
//  الزكاة — 15s vertical motion film with a talking character.
//  Everything is a pure function of absolute time t (seconds), so the cuts stay
//  locked to the narration take (placed at VO seconds). Mouth = analysed audio.
// ============================================================================

export const ZK_LEN = 15;
const W = 1080, H = 1920, CX = 540;
const VO = 0.4; // narration offset in the film

const C = {
  ink: "#020A08", ink2: "#06201A", em: "#0C5A43", emL: "#17A47C", mint: "#8BF5CF",
  ivory: "#FBF6EC", dim: "rgba(251,246,236,0.58)", faint: "rgba(251,246,236,0.12)",
  g0: "#7E5E26", g1: "#C9A052", g2: "#F3DDA6", g3: "#FFF8E3", warm: "#FFB765", rose: "#FF7A6B",
  skin: "#D6A07A", skinD: "#B9805B", beard: "#2A1C15", thobe: "#F5F1E8", thobeD: "#DCD5C6",
};
const F = {
  bold: "Alexandria, sans-serif", ruqaa: "'Aref Ruqaa', serif", naskh: "Amiri, serif",
  kufi: "'Reem Kufi', sans-serif", mono: "'JetBrains Mono', monospace",
};

const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const EI = Easing.bezier(0.7, 0, 0.84, 0);
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const r = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const punch = (t: number, at: number, k = 7) => (t < at ? 0 : Math.exp(-(t - at) * k));
/** damped spring 0 → 1 with overshoot */
const spr = (t: number, at: number, w = 16, d = 7) => { const x = t - at; return x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(w * x); };
const ar = (s: string) => s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]).replace(".", "٫");

// ---------------------------------------------------------------- fonts
const AR = "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC";
const LA = "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212";
const FACES: [string, string, string, string?][] = [
  ["Alexandria", "fonts/neon/alexandria-arabic-400-normal.woff2", "400", AR],
  ["Alexandria", "fonts/neon/alexandria-arabic-700-normal.woff2", "700", AR],
  ["Alexandria", "fonts/neon/alexandria-arabic-900-normal.woff2", "900", AR],
  ["Alexandria", "fonts/neon/alexandria-latin-400-normal.woff2", "400", LA],
  ["Alexandria", "fonts/neon/alexandria-latin-900-normal.woff2", "900", LA],
  ["Aref Ruqaa", "fonts/neon/aref-ruqaa-arabic-700-normal.woff2", "700", AR],
  ["Amiri", "fonts/zk/amiri-arabic-400-normal.woff2", "400", AR],
  ["Amiri", "fonts/zk/amiri-arabic-700-normal.woff2", "700", AR],
  ["Reem Kufi", "fonts/zk/reem-kufi-arabic-500-normal.woff2", "500", AR],
  ["Reem Kufi", "fonts/zk/reem-kufi-arabic-700-normal.woff2", "700", AR],
  ["JetBrains Mono", "fonts/JetBrainsMono.ttf", "100 800"],
];
let fontsP: Promise<unknown> | null = null;
const loadFonts = () => (fontsP ||= Promise.all(FACES.map(async ([fam, file, weight, unicodeRange]) => {
  try {
    const f = new FontFace(fam, `url("${staticFile(file)}")`, unicodeRange ? { weight, unicodeRange } : { weight });
    await f.load(); (document.fonts as any).add(f);
  } catch { console.warn("font failed", file); }
})));
const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("zk fonts"));
  useEffect(() => { loadFonts().finally(() => continueRender(h)); }, [h]);
  return <>{children}</>;
};

// ---------------------------------------------------------------- type styles
const gold = (pos: number): React.CSSProperties => ({
  backgroundImage: `linear-gradient(105deg, ${C.g0} 0%, ${C.g1} 18%, ${C.g2} 34%, ${C.g1} 44%, ${C.g3} 50%, ${C.g1} 56%, ${C.g2} 68%, ${C.g0} 100%)`,
  backgroundSize: "260% 100%", backgroundPosition: `${pos}% 50%`,
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
  display: "inline-block", padding: "0.45em 0.14em 0.32em", margin: "-0.45em -0.14em -0.32em",
});
const abs = (y: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: "absolute", left: 0, right: 0, top: y, textAlign: "center", direction: "rtl", ...extra,
});
/** rise-from-blur reveal of one element at time `at` */
const rise = (t: number, at: number, dy = 50, d = 0.5): React.CSSProperties => {
  const p = r(t, at, at + d);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined };
};
const Chip: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.mint }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "12px 30px", borderRadius: 999,
    border: `2px solid ${color}55`, background: `${color}14`, color, fontFamily: F.bold, fontWeight: 700, fontSize: 36 }}>
    <span style={{ width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 14px ${color}` }} />{children}
  </span>
);

// ---------------------------------------------------------------- geometry
const star8 = (cx: number, cy: number, R: number, k = 0.76) => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 2 ? R * k : R;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(" ");
};
const Check: React.FC<{ s: number; size?: number }> = ({ s, size = 92 }) => (
  <div style={{ width: size, height: size, borderRadius: size / 2, background: `linear-gradient(135deg, ${C.g2}, ${C.g1})`,
    transform: `scale(${s})`, boxShadow: `0 0 40px ${C.g1}88`, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke={C.ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

// ---------------------------------------------------------------- coin
const Coin: React.FC<{ size: number; flip?: number; dull?: number; id: string; glow?: number }> = ({ size, flip = 0, dull = 0, id, glow = 0 }) => {
  const sx = Math.cos(flip);
  const back = sx < 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", transform: `scaleX(${Math.max(0.04, Math.abs(sx))})`,
      filter: glow ? `drop-shadow(0 0 ${glow * 30}px ${C.g1})` : undefined }}>
      <defs>
        <radialGradient id={`cg${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={dull ? "#9AA39F" : C.g3} /><stop offset="0.45" stopColor={dull ? "#6D7672" : C.g2} />
          <stop offset="1" stopColor={dull ? "#3A423F" : C.g0} />
        </radialGradient>
      </defs>
      <circle cx={50} cy={50} r={48} fill={`url(#cg${id})`} />
      <circle cx={50} cy={50} r={40} fill="none" stroke={dull ? "#4A524F" : back ? C.g1 : C.g0} strokeWidth={2.5} opacity={0.8} />
      <polygon points={star8(50, 50, 26, 0.72)} fill="none" stroke={dull ? "#4A524F" : C.g0} strokeWidth={3} opacity={0.9} />
      <circle cx={50} cy={50} r={7} fill={dull ? "#4A524F" : C.g0} opacity={0.7} />
      {!dull && <path d="M20,34 A34,34 0 0 1 46,14" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55} />}
    </svg>
  );
};

// ================================================================ CHARACTER
type Pose = [number, number]; // shoulder°, elbow° (positive = outward / up for that side)
const REST: Pose = [10, 6], POINT: Pose = [158, 12], PRESENT: Pose = [58, 72], OFFER: Pose = [92, 46], HEART: Pose = [-24, -114], ASK: Pose = [40, 92];
const poseAt = (t: number, keys: [number, Pose][]): Pose => {
  let p: Pose = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, pk] = keys[i]; const k = spr(t, tk, 11, 7.5);
    p = [lerp(p[0], pk[0], k), lerp(p[1], pk[1], k)];
  }
  return p;
};

const Arm: React.FC<{ pose: Pose; mirror?: boolean; point?: boolean; wob: number }> = ({ pose, mirror, point, wob }) => {
  const [s, e] = pose;
  return (
    <g transform={mirror ? "translate(600 0) scale(-1 1)" : undefined}>
      <g transform={`rotate(${s + wob} 160 560)`}>
        <line x1={160} y1={560} x2={160} y2={706} stroke={C.thobeD} strokeWidth={86} strokeLinecap="round" />
        <line x1={160} y1={560} x2={160} y2={706} stroke={C.thobe} strokeWidth={76} strokeLinecap="round" />
        <g transform={`rotate(${e} 160 706)`}>
          <line x1={160} y1={706} x2={160} y2={836} stroke={C.thobe} strokeWidth={66} strokeLinecap="round" />
          <line x1={142} y1={826} x2={178} y2={826} stroke={C.g1} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
          {point && <rect x={150} y={850} width={20} height={58} rx={10} fill={C.skin} />}
          <ellipse cx={160} cy={862} rx={31} ry={34} fill={C.skin} />
          <path d="M136,850 q-18,8 -12,26" stroke={C.skin} strokeWidth={16} strokeLinecap="round" fill="none" />
        </g>
      </g>
    </g>
  );
};

const Character: React.FC<{ t: number }> = ({ t }) => {
  const li = Math.round((t - VO) * 60);
  const open = lip.open[li] ?? 0;
  const wide = lip.wide[li] ?? 0.5;
  const nrg = (lip.open[li - 6] ?? 0) * 0.5 + (lip.open[li - 12] ?? 0) * 0.5;
  // expression timeline
  const smile = 0.45 + 0.2 * r(t, 4.4, 4.8) - 0.15 * r(t, 6.2, 6.5) + 0.5 * r(t, 10.5, 10.9) - 0.1 * r(t, 12.0, 12.4);
  const brow = 0.9 * (r(t, 0.85, 1.0) - r(t, 1.7, 2.0)) + 0.7 * (r(t, 5.3, 5.45) - r(t, 5.9, 6.1)) + 0.5 * (r(t, 2.5, 2.7) - r(t, 3.4, 3.7)) + nrg * 0.25;
  const lookY = -1 * (r(t, 2.25, 2.45) - r(t, 3.9, 4.1)) - 0.5 * (r(t, 9.4, 9.6) - r(t, 10.4, 10.6));
  const lookX = 0.8 * (r(t, 6.5, 6.7) - r(t, 7.45, 7.6)) - 0.8 * (r(t, 7.6, 7.75) - r(t, 8.8, 9.0)) + 0.7 * (r(t, 10.7, 10.9) - r(t, 11.7, 11.9));
  const blinkT = [0.9, 3.1, 5.0, 7.0, 9.1, 11.0, 12.6, 14.2];
  const blink = blinkT.reduce((m, b) => Math.min(m, Math.abs(t - b) < 0.07 ? Math.abs(t - b) / 0.07 : 1), 1);
  const tilt = 6 * (r(t, 0.9, 1.2) - r(t, 1.8, 2.1)) - 4 * (r(t, 12.2, 12.6)) + Math.sin(t * 2.1) * 1.2 + (nrg - 0.3) * 3;
  const nod = nrg * 9 + Math.sin(t * 3) * 1.5;
  const breathe = Math.sin(t * 2.4) * 3;
  // entrance
  const ent = spr(t, 0.12, 12, 6.5);
  const squash = 1 + (punch(t, 0.42, 9) * 0.06) * Math.sin((t - 0.42) * 30);
  const L = poseAt(t, [[0, REST], [2.25, POINT], [3.95, REST], [4.4, PRESENT], [6.0, REST], [6.5, PRESENT], [9.2, OFFER], [12.05, REST]]);
  const R = poseAt(t, [[0, REST], [0.75, ASK], [1.85, REST], [7.55, PRESENT], [9.15, REST], [10.65, ASK], [11.9, REST], [12.25, HEART]]);
  const wob = Math.sin(t * 5) * 2 * Math.min(1, nrg * 2);
  // mouth geometry
  const mo = Math.min(1, open * 1.15);
  const mw = 44 + (wide - 0.5) * 26 + smile * 6;
  const mh = 3 + mo * 34;
  const my = 392;
  const corner = (smile - 0.4) * 10;

  return (
    <div style={{ position: "absolute", left: CX - 330, top: 1088, width: 660, height: 880,
      transform: `translateY(${(1 - ent) * 820}px) scaleY(${squash})`, transformOrigin: "50% 100%" }}>
      <svg width={660} height={880} viewBox="0 0 600 800" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="thobeG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#E9E3D6" /><stop offset="0.45" stopColor={C.thobe} /><stop offset="1" stopColor="#CFC7B6" />
          </linearGradient>
          <radialGradient id="skinG" cx="45%" cy="38%" r="70%"><stop offset="0" stopColor="#E3B08A" /><stop offset="1" stopColor={C.skinD} /></radialGradient>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0.75" stopColor={C.g2} stopOpacity={0} /><stop offset="1" stopColor={C.g2} stopOpacity={0.55} /></linearGradient>
          <clipPath id="mouthClip"><path d={`M${300 - mw / 2},${my} Q300,${my - 6 - corner} ${300 + mw / 2},${my} Q300,${my + mh * 1.25 + 4} ${300 - mw / 2},${my}Z`} /></clipPath>
        </defs>
        <g transform={`translate(0 ${breathe})`}>
          {/* body */}
          <path d="M40,820 C44,660 100,560 214,522 L386,522 C500,560 556,660 560,820 Z" fill="url(#thobeG)" />
          <path d="M40,820 C44,660 100,560 214,522 L386,522 C500,560 556,660 560,820 Z" fill="url(#rim)" />
          <path d="M262,522 Q300,560 338,522" fill="none" stroke={C.thobeD} strokeWidth={8} />
          <line x1={300} y1={548} x2={300} y2={820} stroke={C.g1} strokeWidth={5} opacity={0.75} />
          {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={300} cy={575 + i * 40} r={5} fill={C.g1} opacity={0.85} />)}
          {/* furakha tassel */}
          <g transform={`rotate(${Math.sin(t * 3.2) * 6 + wob * 1.5} 318 540)`}>
            <path d="M318,540 C322,580 316,610 320,650" stroke={C.thobeD} strokeWidth={5} fill="none" />
            <path d="M308,648 h24 l6,46 h-36z" fill={C.thobeD} />
            <path d="M310,650 h20" stroke={C.g1} strokeWidth={4} />
          </g>
        </g>
        <Arm pose={L} point={t > 2.2 && t < 4.0} wob={wob} />
        <Arm pose={R} mirror wob={-wob} />
        {/* neck + head */}
        <g transform={`translate(0 ${breathe * 0.6})`}>
          <rect x={262} y={432} width={76} height={100} rx={24} fill={C.skinD} />
          <g transform={`rotate(${tilt} 300 470) translate(0 ${nod * 0.35})`}>
            <ellipse cx={184} cy={318} rx={20} ry={30} fill={C.skinD} /><ellipse cx={416} cy={318} rx={20} ry={30} fill={C.skinD} />
            <ellipse cx={300} cy={305} rx={120} ry={136} fill="url(#skinG)" />
            {/* beard */}
            <path d="M182,318 C184,430 238,466 300,466 C362,466 416,430 418,318 C408,370 390,388 366,392 C350,372 250,372 234,392 C210,388 192,370 182,318Z" fill={C.beard} />
            {/* blush */}
            <ellipse cx={226} cy={352} rx={22} ry={12} fill={C.rose} opacity={0.12 + smile * 0.18} />
            <ellipse cx={374} cy={352} rx={22} ry={12} fill={C.rose} opacity={0.12 + smile * 0.18} />
            {/* nose */}
            <path d="M300,300 C292,334 284,346 296,352 Q304,355 312,350" fill="none" stroke={C.skinD} strokeWidth={6} strokeLinecap="round" />
            {/* mouth */}
            <path d={`M${300 - mw / 2},${my} Q300,${my - 6 - corner} ${300 + mw / 2},${my} Q300,${my + mh * 1.25 + 4} ${300 - mw / 2},${my}Z`} fill="#3B0F10" />
            <g clipPath="url(#mouthClip)">
              <rect x={260} y={my - 12} width={80} height={10 + mo * 6} rx={4} fill="#FFF8F0" />
              <ellipse cx={300} cy={my + mh * 1.1 + 4} rx={mw * 0.32} ry={10} fill="#C4545A" />
            </g>
            <path d={`M${300 - mw / 2 - 4},${my - corner * 0.3} Q300,${my - 8 - corner} ${300 + mw / 2 + 4},${my - corner * 0.3}`} fill="none" stroke={C.beard} strokeWidth={7} strokeLinecap="round" />
            {/* moustache */}
            <path d={`M244,${my - 8} C262,${my - 30} 290,${my - 26} 300,${my - 16} C310,${my - 26} 338,${my - 30} 356,${my - 8} C336,${my - 16} 312,${my - 12} 300,${my - 6} C288,${my - 12} 264,${my - 16} 244,${my - 8}Z`} fill={C.beard} />
            {/* eyes */}
            {[256, 344].map((ex, i) => (
              <g key={i}>
                <ellipse cx={ex} cy={298} rx={22} ry={18 * blink} fill="#fff" />
                {blink > 0.3 && <>
                  <circle cx={ex + lookX * 7} cy={300 + lookY * 6} r={12} fill="#2B1A12" />
                  <circle cx={ex + lookX * 7 + 4} cy={295 + lookY * 6} r={4} fill="#fff" />
                </>}
                <path d={`M${ex - 24},${298 - 14 * blink} Q${ex},${298 - 24 * blink} ${ex + 24},${298 - 14 * blink}`} fill="none" stroke={C.beard} strokeWidth={4} opacity={0.6} />
              </g>
            ))}
            {/* brows */}
            <path d={`M228,${262 - brow * 14} Q254,${248 - brow * 18} 280,${258 - brow * 10}`} fill="none" stroke={C.beard} strokeWidth={13} strokeLinecap="round" />
            <path d={`M320,${258 - brow * 10} Q346,${248 - brow * 18} 372,${262 - brow * 14}`} fill="none" stroke={C.beard} strokeWidth={13} strokeLinecap="round" />
            {/* kumma (Omani embroidered cap) */}
            <path d="M176,250 C176,148 236,110 300,110 C364,110 424,148 424,250 C380,230 220,230 176,250Z" fill={C.thobe} />
            <path d="M176,250 C220,230 380,230 424,250 L424,262 C380,244 220,244 176,262Z" fill={C.em} />
            {[...Array(9)].map((_, i) => {
              const a = -Math.PI + (i + 0.5) * (Math.PI / 9);
              return <g key={i}>
                <path d={`M${300 + Math.cos(a) * 60},${236 + Math.sin(a) * 60} L${300 + Math.cos(a) * 118},${236 + Math.sin(a) * 118}`} stroke={C.em} strokeWidth={4} opacity={0.75} />
                <circle cx={300 + Math.cos(a) * 92} cy={236 + Math.sin(a) * 92} r={6} fill={C.g1} />
              </g>;
            })}
            <path d="M210,214 C250,196 350,196 390,214" fill="none" stroke={C.g1} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" />
            <polygon points={star8(300, 150, 16, 0.6)} fill={C.em} />
          </g>
        </g>
      </svg>
    </div>
  );
};

// ================================================================ BACKGROUND
const Background: React.FC<{ t: number }> = ({ t }) => {
  const warm = r(t, 10.6, 11.6) - r(t, 12.0, 12.6) * 0.6;
  const pulse = punch(t, 0.35, 3) + punch(t, 2.65, 4) * 0.6 + punch(t, 12.0, 2.5) * 0.8;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(100% 60% at 50% 34%, ${warm > 0.01 ? `rgba(120,70,20,${0.35 * warm})` : "transparent"} 0%, transparent 70%), radial-gradient(130% 75% at 50% 30%, #0D3528 0%, ${C.ink2} 42%, ${C.ink} 100%)` }}>
      {/* star tessellation */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.55 + pulse * 0.3 }}>
        <defs>
          <pattern id="tess" width={180} height={180} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${-t * 14}) rotate(0)`}>
            <polygon points={star8(90, 90, 62, 0.7)} fill="none" stroke={C.g1} strokeWidth={1.4} opacity={0.22} />
            <rect x={60} y={60} width={60} height={60} fill="none" stroke={C.g1} strokeWidth={1} opacity={0.12} transform="rotate(45 90 90)" />
            <circle cx={0} cy={0} r={6} fill={C.g1} opacity={0.15} /><circle cx={180} cy={180} r={6} fill={C.g1} opacity={0.15} />
          </pattern>
          <radialGradient id="tm" cx="50%" cy="36%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity={0.9} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></radialGradient>
          <mask id="tmask"><rect width={W} height={H} fill="url(#tm)" /></mask>
        </defs>
        <rect width={W} height={H} fill="url(#tess)" mask="url(#tmask)" />
      </svg>
      {/* god rays */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 200 + i * 260, top: -300, width: 180 + i * 40, height: 2000,
          background: "linear-gradient(90deg, transparent, rgba(243,221,166,0.07), transparent)",
          transform: `rotate(${-18 + i * 9 + Math.sin(t * 0.7 + i) * 3}deg)`, transformOrigin: "top center", opacity: 0.7 + Math.sin(t * 1.3 + i * 2) * 0.3 }} />
      ))}
      {/* dust */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[...Array(46)].map((_, i) => {
          const x0 = random(`dx${i}`) * W, sp = 20 + random(`ds${i}`) * 60, ph = random(`dp${i}`);
          const y = ((1 - ((t * sp / H + ph) % 1)) * (H + 100)) - 50;
          const s = 1 + random(`dr${i}`) * 3;
          return <circle key={i} cx={x0 + Math.sin(t * 0.8 + i) * 20} cy={y} r={s} fill={C.g2} opacity={0.15 + random(`do${i}`) * 0.45} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

const Finish: React.FC<{ t: number; f: number }> = ({ t, f }) => (
  <>
    {/* ground fade behind the character */}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 70%, rgba(2,10,8,0.65) 100%)", pointerEvents: "none" }} />
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("tex/grain.png")})`, backgroundSize: "400px 400px",
      backgroundPosition: `${(f * 137) % 400}px ${(f * 71) % 400}px`, mixBlendMode: "overlay", opacity: 0.2 }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />
  </>
);

const CHAPTERS = [0, 2.0, 4.2, 6.1, 9.2, 12.0, ZK_LEN];
const NAMES = ["THE QUESTION", "THE PILLAR", "THE RATE", "THE CONDITIONS", "THE EFFECT", "THE PROMISE"];
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const idx = Math.max(0, CHAPTERS.findIndex((c, i) => t >= c && t < CHAPTERS[i + 1]));
  const tc = `00:${String(Math.floor(t)).padStart(2, "0")}:${String(Math.floor((t % 1) * 30)).padStart(2, "0")}`;
  const op = r(t, 0.2, 0.8);
  const mono: React.CSSProperties = { fontFamily: F.mono, fontSize: 22, letterSpacing: 4, color: C.dim };
  return (
    <AbsoluteFill style={{ opacity: op, pointerEvents: "none" }}>
      <div style={{ ...mono, position: "absolute", top: 64, left: 64 }}>
        ZAKAT<span style={{ color: C.g1 }}> / </span>الزكاة
        <div style={{ width: 60 + 140 * ((t - CHAPTERS[idx]) / (CHAPTERS[idx + 1] - CHAPTERS[idx])), height: 3, background: C.g1, marginTop: 12, boxShadow: `0 0 10px ${C.g1}` }} />
      </div>
      <div style={{ ...mono, position: "absolute", top: 64, right: 64, textAlign: "right" }}>
        {String(idx + 1).padStart(2, "0")}<span style={{ color: "rgba(251,246,236,0.3)" }}> / 06</span><br />
        <span style={{ color: C.g2, fontSize: 18 }}>{NAMES[idx]}</span>
      </div>
      <div style={{ ...mono, position: "absolute", bottom: 60, right: 64, fontSize: 18, color: "rgba(251,246,236,0.35)" }}>{tc}</div>
      {[[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]].map(([x, y], i) => (
        <svg key={i} width={40} height={40} style={{ position: "absolute", left: x - 20, top: y - 20 }}>
          <path d="M20 0V40M0 20H40" stroke="rgba(243,221,166,0.3)" strokeWidth={2} />
        </svg>
      ))}
      <div style={{ position: "absolute", bottom: 0, right: 0, height: 6, width: `${(t / ZK_LEN) * 100}%`, background: `linear-gradient(90deg, ${C.g2}, ${C.g1})`, boxShadow: `0 0 16px ${C.g1}` }} />
    </AbsoluteFill>
  );
};

/** chapter wrapper: blur/scale in, blur/scale out */
const Ch: React.FC<{ t: number; a: number; b: number; noOut?: boolean; children: React.ReactNode }> = ({ t, a, b, noOut, children }) => {
  if (t < a - 0.02 || t > b + 0.02) return null;
  const i = r(t, a, a + 0.38), o = noOut ? 0 : r(t, b - 0.3, b, EI);
  return (
    <AbsoluteFill style={{ opacity: Math.min(i * 1.4, 1) * (1 - o), filter: i < 1 || o > 0 ? `blur(${(1 - i) * 18 + o * 22}px)` : undefined,
      transform: `scale(${1.07 - 0.07 * i - 0.08 * o}) translateY(${-o * 70}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

/** gold slash wipe at a cut */
const Slash: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const p = r(t, at - 0.12, at + 0.22, EIO);
  if (p <= 0 || p >= 1) return null;
  return (
    <div style={{ position: "absolute", left: -400, top: lerp(H + 400, -900, p), width: W + 800, height: 26,
      background: `linear-gradient(90deg, transparent, ${C.g2}, ${C.g3}, ${C.g2}, transparent)`, transform: "rotate(-18deg)",
      boxShadow: `0 0 60px ${C.g1}, 0 0 140px ${C.g1}88`, opacity: Math.sin(p * Math.PI) }} />
  );
};

// ================================================================ CH1 — the question
const Ch1: React.FC<{ t: number }> = ({ t }) => {
  const land = 0.38;
  const fall = r(t, 0, land, EI);
  const cy = t < land ? lerp(-260, 470, fall) : 470 - punch(t, land, 9) * Math.sin((t - land) * 26) * 26;
  const flip = t < land ? t * 34 : Math.PI * 4 + (1 - punch(t, land, 5)) * Math.PI * 2;
  const sw = r(t, land, land + 0.7);
  return (
    <Ch t={t} a={0} b={2.05}>
      {/* shockwave + flash */}
      {t > land && <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={CX} cy={470} r={140 + sw * 560} fill="none" stroke={C.g2} strokeWidth={(1 - sw) * 18} opacity={1 - sw} />
        <circle cx={CX} cy={470} r={140 + r(t, land + 0.08, land + 0.9) * 420} fill="none" stroke={C.mint} strokeWidth={3} opacity={1 - r(t, land + 0.08, land + 0.9)} />
        <circle cx={CX} cy={470} r={260} fill={C.g3} opacity={punch(t, land, 10) * 0.6} />
      </svg>}
      {/* rosette rings around the coin */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`rotate(${t * 14} ${CX} 470)`} opacity={r(t, 0.45, 0.9)}>
          <polygon points={star8(CX, 470, 210, 0.78)} fill="none" stroke={C.g1} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - r(t, 0.45, 1.2)} />
          <circle cx={CX} cy={470} r={250} fill="none" stroke={C.g1} strokeWidth={2} strokeDasharray="4 14" opacity={0.6} />
        </g>
        <g transform={`rotate(${-t * 9} ${CX} 470)`} opacity={r(t, 0.6, 1.0)}>
          <polygon points={star8(CX, 470, 290, 0.86)} fill="none" stroke={C.mint} strokeWidth={1.5} opacity={0.35} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - r(t, 0.6, 1.5)} />
        </g>
      </svg>
      {/* motion-blur ghosts while falling */}
      {t < land && [3, 2, 1].map((k) => (
        <div key={k} style={{ position: "absolute", left: CX - 120, top: lerp(-260, 470, r(t - k * 0.025, 0, land, EI)) - 120, opacity: 0.18 * (4 - k) / 3 }}>
          <Coin size={240} flip={flip - k * 0.5} id={`g${k}`} />
        </div>
      ))}
      <div style={{ position: "absolute", left: CX - 120, top: cy - 120 }}>
        <Coin size={240} flip={flip} id="hero" glow={0.4 + punch(t, land, 4)} />
      </div>
      <div style={abs(205, rise(t, 0.5))}><Chip>سؤالٌ في ١٥ ثانية</Chip></div>
      {/* words of the question pop on the voice */}
      <div style={abs(745, { fontFamily: F.bold, fontWeight: 700, fontSize: 66, color: C.ivory, display: "flex", justifyContent: "center", gap: 22 })}>
        {["هل", "تعلمُ", "ما", "هي"].map((w, i) => {
          const at = 0.42 + i * 0.13, p = spr(t, at, 18, 9);
          return <span key={i} style={{ display: "inline-block", opacity: r(t, at, at + 0.12), transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})` }}>{w}</span>;
        })}
      </div>
      <div style={abs(818, { fontFamily: F.ruqaa, fontSize: 250, lineHeight: 1.1 })}>
        <span style={{ display: "inline-block", clipPath: `inset(-40% ${(1 - r(t, 0.95, 1.45, EIO)) * 100}% -40% 0)`,
          filter: `drop-shadow(0 0 ${20 + punch(t, 1.45, 4) * 50}px rgba(201,160,82,0.55))`, transform: `scale(${1 + punch(t, 1.45, 6) * 0.06})` }}>
          <span style={gold(lerp(100, 0, r(t, 0.95, 2.0, EIO)))}>الزكاة؟</span>
        </span>
      </div>
    </Ch>
  );
};

// ================================================================ CH2 — the third pillar
const PILLARS = ["الشهادة", "الصلاة", "الزكاة", "الصوم", "الحج"];
const Ch2: React.FC<{ t: number }> = ({ t }) => {
  const hi = r(t, 2.6, 2.95);
  const zoom = r(t, 3.85, 4.28, EI);
  const aw = 150, gap = 26, base = 1010, x0 = CX - (5 * aw + 4 * gap) / 2;
  const archPath = (x: number, h: number, w = aw) =>
    `M${x},${base} L${x},${base - h + w * 0.55} Q${x},${base - h + 30} ${x + w / 2},${base - h} Q${x + w},${base - h + 30} ${x + w},${base - h + w * 0.55} L${x + w},${base} Z`;
  if (t < 1.98 || t > 4.3) return null;
  const ii = r(t, 2.0, 2.35);
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, ii * 1.4) * (1 - r(t, 4.1, 4.3)), filter: ii < 1 ? `blur(${(1 - ii) * 16}px)` : undefined,
      transform: `scale(${1 + zoom * 9})`, transformOrigin: `${CX}px ${base - 230}px` }}>
      <div style={abs(170, { ...rise(t, 2.05), fontFamily: F.bold, fontWeight: 900, fontSize: 118, color: C.ivory })}>
        الرُّكنُ <span style={{ ...gold(lerp(100, 20, r(t, 2.5, 3.5))), filter: `drop-shadow(0 0 ${hi * 30}px ${C.g1}88)` }}>الثالث</span>
      </div>
      <div style={abs(345, { ...rise(t, 2.95), fontFamily: F.bold, fontWeight: 400, fontSize: 46, color: C.dim })}>من أركانِ الإسلامِ الخمسة</div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="archG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1C6A52" stopOpacity={0.7} /><stop offset="1" stopColor="#0A2B22" stopOpacity={0.3} /></linearGradient>
          <linearGradient id="archGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.g2} /><stop offset="1" stopColor={C.g0} /></linearGradient>
        </defs>
        {/* rays behind the 3rd arch */}
        <g opacity={hi * 0.8} transform={`rotate(${t * 20} ${CX} ${base - 260})`}>
          {[...Array(16)].map((_, i) => <path key={i} d={`M${CX},${base - 260} L${CX - 18},${base - 900} L${CX + 18},${base - 900}Z`} fill={C.g2} opacity={0.12} transform={`rotate(${i * 22.5} ${CX} ${base - 260})`} />)}
        </g>
        {PILLARS.map((name, k) => {
          const i = 4 - k; // RTL: first pillar on the right
          const x = x0 + i * (aw + gap);
          const g = spr(t, 2.08 + k * 0.08, 13, 7);
          const isZ = k === 2;
          const h = 330 + (isZ ? hi * 90 : 0);
          const dim = isZ ? 1 : 1 - hi * 0.6;
          return (
            <g key={k} opacity={dim} transform={`translate(0 ${(1 - g) * 420}) translate(${x + aw / 2} ${base}) scale(1 ${Math.max(0.01, g)}) translate(${-x - aw / 2} ${-base})`}>
              <path d={archPath(x, h)} fill={isZ && hi > 0 ? "url(#archGold)" : "url(#archG)"} fillOpacity={isZ ? 0.25 + hi * 0.75 : 1} stroke={C.g1} strokeWidth={3} />
              <path d={archPath(x + 16, h - 22, aw - 32)} fill="none" stroke={isZ ? C.g3 : C.g1} strokeWidth={1.5} opacity={0.5} />
              <polygon points={star8(x + aw / 2, base - h + 110, 26, 0.6)} fill={isZ && hi > 0.5 ? C.ink : C.g1} opacity={0.85} />
              <text x={x + aw / 2} y={base - h + 210} textAnchor="middle" fontFamily="Alexandria" fontWeight={900} fontSize={64} fill={isZ && hi > 0.5 ? C.ink : C.ivory}>{ar(String(k + 1))}</text>
              <text x={x + aw / 2} y={base + 50} textAnchor="middle" fontFamily="Alexandria" fontWeight={700} fontSize={30} fill={isZ ? C.g2 : C.dim} opacity={r(t, 2.4 + k * 0.05, 2.7 + k * 0.05)}>{name}</text>
            </g>
          );
        })}
        <line x1={x0 - 30} y1={base} x2={W - x0 + 30} y2={base} stroke={C.g1} strokeWidth={2} opacity={0.6 * r(t, 2.0, 2.4)} />
      </svg>
    </AbsoluteFill>
  );
};

// ================================================================ CH3 — 2.5 %
const Ch3: React.FC<{ t: number }> = ({ t }) => {
  const v = 2.5 * r(t, 4.4, 5.15, EIO);
  const num = v.toFixed(1);
  const hit = punch(t, 5.15, 6);
  const pick = 19; // the one coin in forty
  const pk = spr(t, 5.2, 12, 6);
  return (
    <Ch t={t} a={4.2} b={6.15}>
      <div style={abs(120, { fontFamily: F.bold, fontWeight: 900, fontSize: 280, lineHeight: 1.15, direction: "rtl", transform: `scale(${1 + hit * 0.08})` })}>
        <span style={{ ...gold(lerp(100, 0, r(t, 4.4, 6))), filter: `drop-shadow(0 0 ${30 + hit * 60}px rgba(201,160,82,0.5))` }}>{ar(num)}٪</span>
      </div>
      <div style={abs(470, { ...rise(t, 5.45, 30, 0.35) })}><Chip color={C.g2}>فقط</Chip></div>
      {[...Array(40)].map((_, i) => {
        const col = i % 8, row = Math.floor(i / 8);
        const x = 190 + col * 100, y = 620 + row * 88;
        const d = Math.hypot(col - 3.5, row - 2) * 0.05;
        const s = spr(t, 4.45 + d, 16, 8);
        const isP = i === pick;
        const dimK = isP ? 0 : r(t, 5.2, 5.5);
        return (
          <div key={i} style={{ position: "absolute", left: x - 36, top: y - 36 - (isP ? pk * 46 : 0), width: 72, height: 72,
            transform: `scale(${s * (isP ? 1 + pk * 0.5 : 1)})`, opacity: 1 - dimK * 0.65, zIndex: isP ? 2 : 1 }}>
            {isP ? <Coin size={72} flip={r(t, 5.1, 5.45) * Math.PI * 2} id="pick" glow={pk} dull={t < 5.15 ? 1 : 0} /> :
              <svg width={72} height={72} viewBox="0 0 100 100"><circle cx={50} cy={50} r={44} fill="rgba(23,164,124,0.12)" stroke={C.emL} strokeWidth={4} /><polygon points={star8(50, 50, 22, 0.7)} fill="none" stroke={C.emL} strokeWidth={3} opacity={0.6} /></svg>}
          </div>
        );
      })}
      {t > 5.2 && <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={190 + 3 * 100} cy={620 + 2 * 88 - 46} r={40 + r(t, 5.2, 5.9) * 140} fill="none" stroke={C.g2} strokeWidth={4} opacity={1 - r(t, 5.2, 5.9)} />
      </svg>}
      <div style={abs(1040, { ...rise(t, 5.35, 30), fontFamily: F.bold, fontWeight: 700, fontSize: 42, color: C.ivory })}>
        <span style={{ color: C.g2 }}>١</span> من كلِّ <span style={{ color: C.g2 }}>٤٠</span>
      </div>
    </Ch>
  );
};

// ================================================================ CH4 — nisab & hawl
const Glass: React.FC<{ x: number; y: number; w: number; h: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 40,
    background: "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))", border: "1.5px solid rgba(243,221,166,0.28)",
    boxShadow: "0 50px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)", overflow: "hidden", ...style }}>{children}</div>
);
const Ch4: React.FC<{ t: number }> = ({ t }) => {
  const c1 = spr(t, 6.55, 12, 7), c2 = spr(t, 7.5, 12, 7);
  const fill = r(t, 6.75, 7.4, EIO);
  const ok1 = spr(t, 7.38, 16, 7);
  const orbit = r(t, 7.7, 8.7, Easing.inOut(Easing.quad));
  const month = Math.min(12, Math.floor(orbit * 12) + (orbit > 0 ? 1 : 0));
  const ok2 = spr(t, 8.72, 16, 7);
  const cw = 450, ch = 560, cy0 = 470;
  return (
    <Ch t={t} a={6.1} b={9.25}>
      <div style={abs(170, rise(t, 6.15))}><Chip>من مالِك</Chip></div>
      <div style={abs(250, { ...rise(t, 6.35), fontFamily: F.bold, fontWeight: 900, fontSize: 112, color: C.ivory })}>
        <span style={gold(lerp(100, 10, r(t, 6.3, 8)))}>بشرطَين</span>
      </div>
      {/* card 1 — nisab (right, read first) */}
      <Glass x={W - 60 - cw} y={cy0} w={cw} h={ch} style={{ opacity: Math.min(1, c1 * 1.5), transform: `translateY(${(1 - c1) * 160}px) rotate(${(1 - c1) * 6}deg)` }}>
        <div style={{ ...abs(34), fontFamily: F.bold, fontWeight: 900, fontSize: 56, color: C.ivory }}>النِّصاب</div>
        <div style={{ ...abs(110), fontFamily: F.bold, fontSize: 28, color: C.dim }}>بلغَ المالُ حدًّا معيّنًا</div>
        <svg width={cw} height={ch} style={{ position: "absolute", inset: 0 }}>
          {/* gold bars */}
          {[0, 1, 2].map((i) => {
            const s = spr(t, 6.7 + i * 0.17, 16, 8);
            const bx = 70 + (i === 2 ? 60 : i * 120), by = 440 - (i === 2 ? 70 : 0);
            return <g key={i} transform={`translate(0 ${(1 - s) * -120})`} opacity={Math.min(1, s * 2)}>
              <path d={`M${bx},${by} L${bx + 22},${by - 60} L${bx + 118},${by - 60} L${bx + 140},${by} Z`} fill={C.g1} />
              <path d={`M${bx + 22},${by - 60} L${bx + 118},${by - 60} L${bx + 108},${by - 46} L${bx + 32},${by - 46}Z`} fill={C.g3} opacity={0.8} />
              <path d={`M${bx},${by} L${bx + 140},${by} L${bx + 130},${by + 10} L${bx + 10},${by + 10}Z`} fill={C.g0} />
            </g>;
          })}
          {/* meter */}
          <rect x={360} y={180} width={40} height={300} rx={20} fill="rgba(255,255,255,0.06)" stroke="rgba(243,221,166,0.3)" />
          <rect x={366} y={186 + 288 * (1 - fill)} width={28} height={288 * fill} rx={14} fill={C.g1} />
          <line x1={330} y1={270} x2={410} y2={270} stroke={C.mint} strokeWidth={3} strokeDasharray="8 8" />
        </svg>
        <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", fontFamily: F.bold, fontWeight: 700, fontSize: 30, color: C.g2, direction: "rtl" }}>≈ ٨٥ غرامًا من الذهب</div>
        <div style={{ position: "absolute", top: 160, left: 44 }}><Check s={ok1} size={84} /></div>
      </Glass>
      {/* card 2 — hawl */}
      <Glass x={60} y={cy0} w={cw} h={ch} style={{ opacity: Math.min(1, c2 * 1.5), transform: `translateY(${(1 - c2) * 160}px) rotate(${(1 - c2) * -6}deg)` }}>
        <div style={{ ...abs(34), fontFamily: F.bold, fontWeight: 900, fontSize: 56, color: C.ivory }}>الحَوْل</div>
        <div style={{ ...abs(110), fontFamily: F.bold, fontSize: 28, color: C.dim }}>ومرَّ عليه عامٌ هجريّ</div>
        <svg width={cw} height={ch} style={{ position: "absolute", inset: 0 }}>
          <circle cx={cw / 2} cy={330} r={130} fill="none" stroke="rgba(243,221,166,0.18)" strokeWidth={3} />
          <circle cx={cw / 2} cy={330} r={130} fill="none" stroke={C.g1} strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - orbit}
            transform={`rotate(-90 ${cw / 2} 330)`} strokeLinecap="round" />
          {[...Array(12)].map((_, i) => {
            const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
            const lit = orbit * 12 >= i + 0.01 || (i === 0 && orbit > 0);
            return <circle key={i} cx={cw / 2 + Math.cos(a) * 130} cy={330 + Math.sin(a) * 130} r={lit ? 9 : 6} fill={lit ? C.g2 : "rgba(243,221,166,0.3)"} />;
          })}
          {/* the travelling crescent */}
          {(() => {
            const a = -Math.PI / 2 + orbit * Math.PI * 2, mx = cw / 2 + Math.cos(a) * 130, my = 330 + Math.sin(a) * 130;
            return <g opacity={r(t, 7.6, 7.75)}>
              <circle cx={mx} cy={my} r={30} fill={C.g3} style={{ filter: `drop-shadow(0 0 16px ${C.g2})` } as any} />
              <circle cx={mx + 12} cy={my - 8} r={26} fill="#173A30" />
            </g>;
          })()}
          <circle cx={cw / 2} cy={330} r={130 + r(t, 8.72, 9.2) * 60} fill="none" stroke={C.g2} strokeWidth={4} opacity={(1 - r(t, 8.72, 9.2)) * (t > 8.72 ? 1 : 0)} />
        </svg>
        <div style={{ position: "absolute", top: 268, left: 0, right: 0, textAlign: "center", fontFamily: F.bold, fontWeight: 900, fontSize: 84, color: C.ivory, direction: "rtl" }}>{ar(String(month))}</div>
        <div style={{ position: "absolute", top: 365, left: 0, right: 0, textAlign: "center", fontFamily: F.bold, fontSize: 26, color: C.dim }}>شهرًا</div>
        <div style={{ position: "absolute", top: 160, right: 44 }}><Check s={ok2} size={84} /></div>
      </Glass>
    </Ch>
  );
};

// ================================================================ CH5 — purify & bring joy
const STACKS = [[-160, 4], [-80, 7], [0, 10], [80, 6], [160, 3]] as const;
const Pile: React.FC<{ dull: boolean }> = ({ dull }) => (
  <svg width={520} height={420} viewBox="-260 -380 520 420" style={{ overflow: "visible" }}>
    {STACKS.map(([x, n], si) => (
      <g key={si}>
        {[...Array(n)].map((_, k) => (
          <g key={k} transform={`translate(${x + (k % 2 ? 2 : -2)} ${-k * 26})`}>
            <ellipse cx={0} cy={10} rx={64} ry={18} fill={dull ? "#3E4643" : C.g0} />
            <rect x={-64} y={-6} width={128} height={16} fill={dull ? "#4E5753" : C.g1} />
            <ellipse cx={0} cy={-6} rx={64} ry={18} fill={dull ? "#7A8380" : C.g2} />
            <ellipse cx={0} cy={-6} rx={44} ry={11} fill="none" stroke={dull ? "#5A635F" : C.g1} strokeWidth={3} />
          </g>
        ))}
      </g>
    ))}
  </svg>
);
const Sparkle: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) => (
  <svg width={80} height={80} viewBox="-40 -40 80 80" style={{ position: "absolute", left: x - 40, top: y - 40, transform: `scale(${s}) rotate(${rot}deg)`, overflow: "visible" }}>
    <path d="M0,-38 C4,-6 6,-4 38,0 C6,4 4,6 0,38 C-4,6 -6,4 -38,0 C-6,-4 -4,-6 0,-38Z" fill={C.g3} style={{ filter: `drop-shadow(0 0 10px ${C.g2})` } as any} />
  </svg>
);
const House: React.FC<{ light: number }> = ({ light }) => (
  <svg width={300} height={300} viewBox="0 0 300 300" style={{ overflow: "visible" }}>
    <circle cx={150} cy={170} r={150} fill={C.warm} opacity={light * 0.22} style={{ filter: "blur(30px)" } as any} />
    <rect x={40} y={110} width={220} height={170} fill="#1D4A3C" stroke={C.g1} strokeWidth={3} />
    {[...Array(6)].map((_, i) => <rect key={i} x={40 + i * 40} y={92} width={24} height={20} fill="#1D4A3C" stroke={C.g1} strokeWidth={3} />)}
    <path d="M128,280 L128,214 Q150,184 172,214 L172,280Z" fill={light > 0.1 ? C.warm : "#0E2A22"} opacity={0.4 + light * 0.6} />
    {[70, 196].map((x) => <path key={x} d={`M${x},190 L${x},150 Q${x + 17},128 ${x + 34},150 L${x + 34},190Z`} fill={C.warm} opacity={0.15 + light * 0.85} />)}
    <path d="M150,26 C170,48 190,52 150,78 C110,52 130,48 150,26Z" fill={C.g1} opacity={0} />
  </svg>
);
const Ch5: React.FC<{ t: number }> = ({ t }) => {
  const sweep = r(t, 9.55, 10.25, EIO);
  const slide = r(t, 10.4, 10.8, EIO);
  const pileX = lerp(CX, 330, slide), pileY = 980;
  const hx = 800, hy = 690;
  const house = spr(t, 10.5, 13, 7);
  const coinsIn = [...Array(8)].map((_, i) => r(t, 10.8 + i * 0.085 + 0.45, 10.8 + i * 0.085 + 0.5, (x) => x));
  const light = Math.min(1, coinsIn.reduce((a, b) => a + b, 0) / 6);
  const heart = spr(t, 11.45, 14, 6);
  const A = 1 - r(t, 10.45, 10.65), B = r(t, 10.5, 10.8);
  return (
    <Ch t={t} a={9.2} b={12.15}>
      {/* headline A / B */}
      <div style={abs(200, { opacity: A, transform: `translateY(${-(1 - A) * 60}px)`, filter: A < 1 ? `blur(${(1 - A) * 12}px)` : undefined })}>
        <div style={{ ...rise(t, 9.3), fontFamily: F.bold, fontWeight: 900, fontSize: 124, color: C.ivory }}>
          <span style={gold(lerp(100, 0, r(t, 9.4, 10.4)))}>تُطهِّرُ</span> مالَك
        </div>
      </div>
      <div style={abs(200, { opacity: B, transform: `translateY(${(1 - B) * 60}px)`, filter: B < 1 ? `blur(${(1 - B) * 12}px)` : undefined })}>
        <div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 124, color: C.ivory }}>
          وتُسعِدُ <span style={gold(lerp(100, 0, r(t, 10.6, 11.6)))}>غيرَك</span>
        </div>
      </div>
      {/* pile: dull → purified by a light sweep (right to left) */}
      <div style={{ position: "absolute", left: pileX - 260, top: pileY - 380 }}>
        <Pile dull />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(-20% 0 -20% ${(1 - sweep) * 100}%)` }}><Pile dull={false} /></div>
        {sweep > 0 && sweep < 1 && <div style={{ position: "absolute", top: -60, bottom: -20, left: 520 * (1 - sweep) - 20, width: 40,
          background: `linear-gradient(90deg, transparent, ${C.g3}, transparent)`, boxShadow: `0 0 50px ${C.g2}` }} />}
      </div>
      {/* falling grey dust as it purifies */}
      {[...Array(18)].map((_, i) => {
        const at = 9.55 + (1 - (i % 9) / 9) * 0.7, p = r(t, at, at + 0.9, (x) => x);
        if (p <= 0 || p >= 1) return null;
        const x = pileX - 230 + (i % 9) * 58 + random(`fx${i}`) * 20;
        return <div key={i} style={{ position: "absolute", left: x, top: pileY - 240 + random(`fy${i}`) * 180 + p * 160, width: 8, height: 8, borderRadius: 4, background: "#7A8380", opacity: 1 - p }} />;
      })}
      {[[pileX - 120, pileY - 260, 9.75], [pileX + 40, pileY - 330, 9.95], [pileX + 150, pileY - 170, 10.1], [pileX - 40, pileY - 120, 10.25]].map(([x, y, at], i) => (
        <Sparkle key={i} x={x} y={y} s={Math.max(0, Math.sin(r(t, at, at + 0.5, (z) => z) * Math.PI)) * 1.1} rot={t * 90} />
      ))}
      {/* the house */}
      <div style={{ position: "absolute", left: hx - 150, top: hy - 150, transform: `scale(${house * 1.45})`, transformOrigin: "50% 100%" }}>
        <House light={light} />
      </div>
      {/* coins travelling in arcs */}
      {coinsIn.map((_, i) => {
        const a0 = 10.8 + i * 0.085, p = r(t, a0, a0 + 0.5, Easing.inOut(Easing.quad));
        if (p <= 0 || p >= 1) return null;
        const sx = pileX, sy = pileY - 300, ex = hx, ey = hy + 110;
        const x = lerp(sx, ex, p), y = lerp(sy, ey, p) - Math.sin(p * Math.PI) * 280;
        return <div key={i} style={{ position: "absolute", left: x - 30, top: y - 30 }}><Coin size={60} flip={p * 9 + i} id={`f${i}`} /></div>;
      })}
      {/* heart */}
      <svg width={180} height={180} viewBox="-50 -50 100 100" style={{ position: "absolute", left: hx - 90, top: hy - 420, transform: `scale(${heart}) translateY(${Math.sin(t * 4) * 4}px)`, overflow: "visible" }}>
        <path d="M0,30 C-50,-5 -30,-45 0,-22 C30,-45 50,-5 0,30Z" fill={C.rose} style={{ filter: `drop-shadow(0 0 18px ${C.rose})` } as any} />
      </svg>
      {heart > 0 && [...Array(10)].map((_, i) => {
        const a = (i / 10) * Math.PI * 2, p = r(t, 11.45, 12.0);
        return <div key={i} style={{ position: "absolute", left: hx + Math.cos(a) * (60 + p * 140) - 6, top: hy - 330 + Math.sin(a) * (60 + p * 140) - 6, width: 12, height: 12, borderRadius: 6, background: i % 2 ? C.g2 : C.rose, opacity: 1 - p }} />;
      })}
    </Ch>
  );
};

// ================================================================ CH6 — the promise
const Ch6: React.FC<{ t: number }> = ({ t }) => {
  const d = r(t, 12.05, 13.1, EIO);
  const words1 = [["وما", 12.1], ["نقصَ", 12.32], ["مالٌ", 12.62]] as const;
  const words2 = [["من", 12.98], ["صدقة", 13.18]] as const;
  const W1 = (w: string, at: number, i: number) => {
    const p = spr(t, at, 14, 8);
    return <span key={i} style={{ display: "inline-block", opacity: r(t, at, at + 0.2), transform: `translateY(${(1 - p) * 60}px) scale(${0.8 + 0.2 * p})`,
      filter: t < at + 0.25 ? `blur(${(1 - r(t, at, at + 0.25)) * 12}px)` : undefined }}>
      <span style={gold(lerp(100, 0, r(t, at, 15)) + Math.sin(t) * 2)}>{w}</span></span>;
  };
  const sweep = r(t, 14.0, 14.7, EIO);
  return (
    <Ch t={t} a={11.9} b={ZK_LEN + 1} noOut>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`rotate(${t * 6} ${CX} 640)`}>
          <polygon points={star8(CX, 640, 400, 0.8)} fill="none" stroke={C.g1} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d} opacity={0.75} />
          <polygon points={star8(CX, 640, 330, 0.8)} fill="rgba(201,160,82,0.05)" stroke={C.g1} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - r(t, 12.2, 13.3, EIO)} opacity={0.5} />
          {[...Array(16)].map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <circle key={i} cx={CX + Math.cos(a) * 455} cy={640 + Math.sin(a) * 455} r={5} fill={C.g2} opacity={r(t, 12.6 + i * 0.03, 12.9 + i * 0.03)} />;
          })}
        </g>
        <circle cx={CX} cy={640} r={455} fill="none" stroke={C.g1} strokeWidth={1} strokeDasharray="3 12" opacity={0.4 * d} transform={`rotate(${-t * 10} ${CX} 640)`} />
      </svg>
      <div style={abs(395, { fontFamily: F.ruqaa, fontSize: 150, lineHeight: 1.3, display: "flex", justifyContent: "center", gap: 34 })}>
        {words1.map(([w, at], i) => W1(w, at, i))}
      </div>
      <div style={abs(585, { fontFamily: F.ruqaa, fontSize: 196, lineHeight: 1.3, display: "flex", justifyContent: "center", gap: 40,
        filter: `drop-shadow(0 0 ${24 + punch(t, 13.25, 3) * 50}px rgba(201,160,82,0.5))` })}>
        {words2.map(([w, at], i) => W1(w, at, i + 3))}
      </div>
      {/* light sweep over the lockup */}
      {sweep > 0 && sweep < 1 && <div style={{ position: "absolute", top: 380, height: 560, left: lerp(W + 100, -300, sweep), width: 200,
        background: "linear-gradient(90deg, transparent, rgba(255,248,227,0.35), transparent)", transform: "skewX(-18deg)", mixBlendMode: "screen" }} />}
      <div style={abs(925, { ...rise(t, 13.7, 30), fontFamily: F.bold, fontWeight: 400, fontSize: 34, color: C.dim, letterSpacing: 1 })}>
        حديثٌ شريف <span style={{ color: C.g1 }}>·</span> رواه مسلم
      </div>
    </Ch>
  );
};

// ================================================================ ROOT
export const Zakat: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const shake = punch(t, 0.38, 8) * 16 + punch(t, 2.65, 10) * 6 + punch(t, 5.15, 10) * 7 + punch(t, 13.25, 6) * 5;
  const sx = Math.sin(t * 83) * shake, sy = Math.cos(t * 71) * shake;
  const push = 1 + t * 0.002;
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
        <Background t={t} />
        <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${push})` }}>
          <Ch1 t={t} />
          <Ch2 t={t} />
          <Ch3 t={t} />
          <Ch4 t={t} />
          <Ch5 t={t} />
          <Ch6 t={t} />
          {[2.0, 4.2, 6.1, 9.2, 12.0].map((c) => <Slash key={c} t={t} at={c} />)}
        </AbsoluteFill>
        <AbsoluteFill style={{ transform: `translate(${sx * 0.5}px, ${sy * 0.5}px)` }}>
          <Character t={t} />
        </AbsoluteFill>
        <Finish t={t} f={f} />
        <Hud t={t} />
        {/* opening fade from black */}
        <AbsoluteFill style={{ background: "#000", opacity: 1 - r(t, 0, 0.25), pointerEvents: "none" }} />
      </AbsoluteFill>
    </FontGate>
  );
};
