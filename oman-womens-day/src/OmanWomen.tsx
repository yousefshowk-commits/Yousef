import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";

// ============================================================================
//  يوم المرأة العُمانية — 17 أكتوبر
//  40s vertical motion film. Everything is driven by absolute time (seconds)
//  so the cuts stay locked to the score (100 BPM → beat 0.6s, bar 2.4s).
// ============================================================================

export const OWD_LEN = 40;
const W = 1080, H = 1920, CX = 540, CY = 960;
const BEAT = 0.6, BAR = 2.4;

const C = {
  ink: "#0B0607", ink2: "#170A0C", ink3: "#22100F",
  red: "#D7182A", redD: "#8E0E1B", green: "#0F9A55", greenD: "#07552F",
  ivory: "#FBF5EA", sand: "#E8D6B3", dim: "rgba(251,245,234,0.55)",
  g0: "#8C6A2E", g1: "#C9A052", g2: "#F3DDA6", g3: "#FFF7E0",
};
const F = {
  bold: "Alexandria, sans-serif",
  ruqaa: "'Aref Ruqaa', serif",
  naskh: "Amiri, serif",
  kufi: "'Reem Kufi', sans-serif",
  messiri: "'El Messiri', sans-serif",
  latin: "'Cormorant Garamond', serif",
};

const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const EI = Easing.bezier(0.7, 0, 0.84, 0);
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const r = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** decaying punch after time `at` (1 → 0) */
const punch = (t: number, at: number, k = 7) => (t < at ? 0 : Math.exp(-(t - at) * k));

// ---------------------------------------------------------------- fonts
const AR = "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC";
const LA = "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212";
const FACES: [string, string, string, string][] = [
  ["Alexandria", "fonts/neon/alexandria-arabic-400-normal.woff2", "400", AR],
  ["Alexandria", "fonts/neon/alexandria-arabic-700-normal.woff2", "700", AR],
  ["Alexandria", "fonts/neon/alexandria-arabic-900-normal.woff2", "900", AR],
  ["Alexandria", "fonts/neon/alexandria-latin-400-normal.woff2", "400", LA],
  ["Alexandria", "fonts/neon/alexandria-latin-900-normal.woff2", "900", LA],
  ["Aref Ruqaa", "fonts/neon/aref-ruqaa-arabic-700-normal.woff2", "700", AR],
  ["Amiri", "fonts/owd/amiri-arabic-400-normal.woff2", "400", AR],
  ["Amiri", "fonts/owd/amiri-arabic-700-normal.woff2", "700", AR],
  ["Reem Kufi", "fonts/owd/reem-kufi-arabic-500-normal.woff2", "500", AR],
  ["Reem Kufi", "fonts/owd/reem-kufi-arabic-700-normal.woff2", "700", AR],
  ["Reem Kufi", "fonts/owd/reem-kufi-latin-500-normal.woff2", "500", LA],
  ["Reem Kufi", "fonts/owd/reem-kufi-latin-700-normal.woff2", "700", LA],
  ["El Messiri", "fonts/owd/el-messiri-arabic-700-normal.woff2", "700", AR],
  ["Cormorant Garamond", "fonts/owd/cormorant-garamond-latin-500-normal.woff2", "500", LA],
  ["Cormorant Garamond", "fonts/owd/cormorant-garamond-latin-700-normal.woff2", "700", LA],
];
let fontsP: Promise<unknown> | null = null;
const loadFonts = () => (fontsP ||= Promise.all(FACES.map(async ([fam, file, weight, unicodeRange]) => {
  try { const f = new FontFace(fam, `url("${staticFile(file)}")`, { weight, unicodeRange }); await f.load(); (document.fonts as any).add(f); }
  catch { console.warn("font failed", file); }
})));
const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("owd fonts"));
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

/** Mask reveal: slides the word up from behind a hard edge + de-blur. */
const Up: React.FC<{ t: number; at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number }> =
  ({ t, at, dur = 0.7, children, style, from = 110 }) => {
    const p = r(t, at, at + dur);
    return (
      <div style={{ overflow: "hidden", padding: "0.3em 0.2em 0.38em", margin: "-0.3em -0.2em -0.38em", ...style }}>
        <div style={{ transform: `translateY(${(1 - p) * from}%) rotate(${(1 - p) * 4}deg)`, opacity: p > 0 ? 1 : 0, filter: `blur(${(1 - p) * 8}px)` }}>{children}</div>
      </div>
    );
  };

/** Pen-like ink reveal right→left (for calligraphy). */
const Ink: React.FC<{ t: number; at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ t, at, dur = 1.1, children, style }) => {
    const p = r(t, at, at + dur, EIO);
    const edge = lerp(-25, 125, p);
    const mask = `linear-gradient(to left, #000 ${edge - 20}%, rgba(0,0,0,0.3) ${edge - 6}%, transparent ${edge}%)`;
    const k = r(t, at, at + dur * 1.3);
    return (
      <div style={{ WebkitMaskImage: mask, maskImage: mask, transform: `translateY(${(1 - k) * 30}px) scale(${1.06 - k * 0.06})`,
        whiteSpace: "nowrap", direction: "rtl", padding: "0.2em 0.35em 0.4em", ...style }}>{children}</div>
    );
  };

/** Words that tumble in one by one (each word is its own span so Arabic joins stay intact). */
const Words: React.FC<{ t: number; at: number; text: string; step?: number; style?: React.CSSProperties; color?: (i: number) => React.CSSProperties }> =
  ({ t, at, text, step = 0.12, style, color }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.26em", direction: "rtl", flexWrap: "wrap", ...style }}>
      {text.split(" ").map((w, i) => {
        const p = r(t, at + i * step, at + i * step + 0.6);
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.8 + p * 0.2})`,
            filter: `blur(${(1 - p) * 10}px)`, ...(color ? color(i) : {}) }}>{w}</span>
        );
      })}
    </div>
  );

// ---------------------------------------------------------------- geometry
/** Khatam (8-point star) made of two squares, as one path. */
const khatam = (cx: number, cy: number, R: number, rot = 0) => {
  const sq = (a0: number) => [0, 1, 2, 3].map((i) => {
    const a = a0 + (i * Math.PI) / 2 + rot;
    return `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
  });
  return `M${sq(Math.PI / 4).join("L")}Z M${sq(0).join("L")}Z`;
};
/** Outline of the 8-point star (16 vertices). */
const star8 = (cx: number, cy: number, R: number, rot = 0) => {
  const ri = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8) ;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 + rot - Math.PI / 2;
    const rr = i % 2 === 0 ? R : ri * 0.92;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};
/** Petal ring: 8 lens shapes around a centre. */
const petals = (cx: number, cy: number, R0: number, R1: number, n = 8, rot = 0) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n + rot;
    const x0 = cx + R0 * Math.cos(a), y0 = cy + R0 * Math.sin(a);
    const x1 = cx + R1 * Math.cos(a), y1 = cy + R1 * Math.sin(a);
    const w = (R1 - R0) * 0.42;
    const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    d += `M${x0},${y0} Q${mx + nx},${my + ny} ${x1},${y1} Q${mx - nx},${my - ny} ${x0},${y0} `;
  }
  return d;
};

/** A path that draws itself (pathLength-normalised). */
const Draw: React.FC<{ d: string; p: number; stroke?: string; w?: number; fill?: string; fillO?: number; glow?: boolean; cap?: "round" | "butt" }> =
  ({ d, p, stroke = "url(#gold)", w = 3, fill = "none", fillO = 0, glow, cap = "round" }) => (
    <>
      {fillO > 0 && <path d={d} fill={fill} opacity={fillO} />}
      <path d={d} pathLength={1} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap={cap} strokeLinejoin="round"
        strokeDasharray="1 1" strokeDashoffset={1 - Math.max(0.0001, p)} style={glow ? { filter: "drop-shadow(0 0 10px rgba(243,221,166,0.55))" } : undefined} />
    </>
  );

const GoldDefs: React.FC = () => (
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={C.g0} /><stop offset="0.35" stopColor={C.g2} /><stop offset="0.5" stopColor={C.g3} />
      <stop offset="0.7" stopColor={C.g1} /><stop offset="1" stopColor={C.g0} />
    </linearGradient>
    <linearGradient id="tri" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={C.red} /><stop offset="0.5" stopColor={C.g2} /><stop offset="1" stopColor={C.green} />
    </linearGradient>
  </defs>
);

/** The big rosette: khatam stars, petals, rings — each layer draws on. */
const Rosette: React.FC<{ t: number; at: number; R?: number; cx?: number; cy?: number; spin?: number; w?: number }> =
  ({ t, at, R = 380, cx = CX, cy = CY, spin = 6, w = 3 }) => {
    const p = (i: number, d = 1.2) => r(t, at + i * 0.16, at + i * 0.16 + d, EIO);
    const rot = ((t - at) * spin * Math.PI) / 180;
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <GoldDefs />
        <g transform={`rotate(${(t - at) * spin} ${cx} ${cy})`}>
          <Draw d={`M${cx + R},${cy} A${R},${R} 0 1 1 ${cx - R},${cy} A${R},${R} 0 1 1 ${cx + R},${cy}`} p={p(0)} w={w * 0.7} />
          <Draw d={`M${cx + R * 1.08},${cy} A${R * 1.08},${R * 1.08} 0 1 1 ${cx - R * 1.08},${cy} A${R * 1.08},${R * 1.08} 0 1 1 ${cx + R * 1.08},${cy}`} p={p(1)} w={w * 0.35} />
          <Draw d={khatam(cx, cy, R * 0.98)} p={p(2)} w={w} glow />
          <Draw d={khatam(cx, cy, R * 0.98, Math.PI / 8)} p={p(3)} w={w * 0.5} stroke={C.red} />
          <Draw d={petals(cx, cy, R * 0.28, R * 0.7, 8, Math.PI / 8)} p={p(4)} w={w * 0.8} />
          <Draw d={star8(cx, cy, R * 0.36, 0)} p={p(5)} w={w * 0.8} stroke={C.green} />
          <Draw d={star8(cx, cy, R * 0.2, Math.PI / 8)} p={p(6)} w={w * 0.7} />
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i * Math.PI) / 8 - rot * 0;
            const k = r(t, at + 1.1 + i * 0.03, at + 1.5 + i * 0.03);
            return <circle key={i} cx={cx + R * 1.08 * Math.cos(a)} cy={cy + R * 1.08 * Math.sin(a)} r={7 * k} fill={i % 2 ? C.g2 : C.red} />;
          })}
        </g>
      </svg>
    );
  };

// ---------------------------------------------------------------- atmosphere
const Lattice: React.FC<{ t: number; o?: number }> = ({ t, o = 0.07 }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o }}>
    <defs>
      <pattern id="lat" width={180} height={180} patternUnits="userSpaceOnUse" patternTransform={`translate(${-t * 12} ${t * 20}) rotate(0)`}>
        <path d={khatam(90, 90, 62)} fill="none" stroke={C.g2} strokeWidth={1.4} />
        <path d={star8(90, 90, 30)} fill="none" stroke={C.g2} strokeWidth={1} />
        <path d="M0 90H28M152 90H180M90 0V28M90 152V180" stroke={C.g2} strokeWidth={1} />
      </pattern>
    </defs>
    <rect width={W} height={H} fill="url(#lat)" />
  </svg>
);

const Glows: React.FC<{ t: number; boost: number }> = ({ t, boost }) => {
  const a = 0.32 + boost * 0.25;
  return (
    <>
      <div style={{ position: "absolute", width: 1400, height: 1400, borderRadius: "50%", left: -560 + Math.sin(t * 0.4) * 120, top: -380 + Math.cos(t * 0.3) * 140,
        background: `radial-gradient(circle, rgba(215,24,42,${a}) 0%, transparent 62%)` }} />
      <div style={{ position: "absolute", width: 1500, height: 1500, borderRadius: "50%", left: 260 + Math.cos(t * 0.35) * 140, top: 960 + Math.sin(t * 0.28) * 160,
        background: `radial-gradient(circle, rgba(15,154,85,${a * 0.85}) 0%, transparent 62%)` }} />
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", left: 90, top: 520 + Math.sin(t * 0.5) * 80,
        background: `radial-gradient(circle, rgba(243,221,166,${0.07 + boost * 0.1}) 0%, transparent 65%)` }} />
    </>
  );
};

/** Floating gold dust (frankincense embers). */
const Dust: React.FC<{ t: number; n?: number; o?: number }> = ({ t, n = 46, o = 1 }) => (
  <>
    {Array.from({ length: n }).map((_, i) => {
      const x = random(`dx${i}`) * W, sp = 18 + random(`ds${i}`) * 50, s = 2 + random(`dz${i}`) * 5;
      const y = (H + 60 - ((random(`dy${i}`) * H + t * sp) % (H + 120)));
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + random(`dt${i}`)) + i));
      return <div key={i} style={{ position: "absolute", left: x + Math.sin(t * 0.7 + i) * 18, top: y, width: s, height: s, borderRadius: s,
        background: i % 5 === 0 ? C.red : C.g2, opacity: tw * 0.7 * o, boxShadow: `0 0 ${s * 3}px ${C.g2}` }} />;
    })}
  </>
);

const Frame: React.FC<{ t: number }> = ({ t }) => {
  const p = r(t, 0.3, 1.6);
  const mono: React.CSSProperties = { fontFamily: F.kufi, fontWeight: 500, fontSize: 22, letterSpacing: 6, color: C.dim, position: "absolute", direction: "ltr" };
  const prog = t / OWD_LEN;
  const scene = [0, 4.8, 9.6, 14.4, 19.2, 24, 28.8, 33.6].filter((s) => t >= s).length;
  return (
    <AbsoluteFill style={{ opacity: p * r(OWD_LEN - t, 0.2, 1.2, EIO) }}>
      <div style={{ ...mono, top: 64, left: 64 }}>17 · 10 · OMAN<div style={{ width: 70 * p, height: 3, marginTop: 12, background: `linear-gradient(90deg, ${C.red}, ${C.ivory}, ${C.green})` }} /></div>
      <div style={{ ...mono, top: 64, right: 64, textAlign: "right" }}>OMANI WOMEN'S DAY<br /><span style={{ color: "rgba(251,245,234,0.3)" }}>CH. 0{scene} / 08</span></div>
      <div style={{ ...mono, bottom: 66, left: 64, color: "rgba(251,245,234,0.3)", fontSize: 19 }}>MOTION STUDY — 2026</div>
      <div style={{ ...mono, bottom: 66, right: 64, color: "rgba(251,245,234,0.3)", fontSize: 19, fontFamily: F.kufi }}>{(t).toFixed(2).padStart(5, "0")}s</div>
      {[[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]].map(([x, y], i) => (
        <svg key={i} width={36} height={36} style={{ position: "absolute", left: x - 18, top: y - 18 }}>
          <path d="M18 0V36M0 18H36" stroke="rgba(251,245,234,0.22)" strokeWidth={2} />
        </svg>
      ))}
      <div style={{ position: "absolute", bottom: 0, right: 0, height: 5, width: `${prog * 100}%`, background: `linear-gradient(270deg, ${C.red}, ${C.ivory} 50%, ${C.green})` }} />
    </AbsoluteFill>
  );
};

const Finish: React.FC<{ t: number }> = ({ t }) => {
  const f = Math.floor(t * 30);
  return (
    <>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("tex/grain.png")})`, backgroundSize: "400px 400px",
        backgroundPosition: `${(f * 137) % 400}px ${(f * 71) % 400}px`, mixBlendMode: "overlay", opacity: 0.2, pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none" }} />
    </>
  );
};

// ---------------------------------------------------------------- transitions
/** Diagonal flag sweep: red / ivory / green bands cross the frame right→left. Covers fully at `at`. */
const FlagWipe: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  if (t < at - 0.5 || t > at + 0.6) return null;
  const bands = [C.red, C.ivory, C.green, C.ink];
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {bands.map((c, i) => {
        const a = at - 0.42 + i * 0.07, b = at + 0.18 + i * 0.07;
        const x = interpolate(t, [a, at - 0.05 + i * 0.03, b], [1700, 0, -1900], { ...CL, easing: EIO });
        return <div key={i} style={{ position: "absolute", top: -600, left: -300 + x + i * 30, width: 1700, height: 3200, background: c,
          transform: "rotate(-18deg)", boxShadow: "0 0 80px rgba(0,0,0,0.45)" }} />;
      })}
    </AbsoluteFill>
  );
};

/** Scene wrapper: renders only in its window, adds a camera push + blur/zoom-through out. */
const Scene: React.FC<{ t: number; a: number; b: number; children: (lt: number) => React.ReactNode; out?: "zoom" | "cut"; push?: number }> =
  ({ t, a, b, children, out = "zoom", push = 0.06 }) => {
    if (t < a - 0.05 || t > b + 0.4) return null;
    const lt = t - a;
    const d = b - a;
    const inK = r(lt, 0, 0.45);
    const o = out === "zoom" ? r(t, b - 0.35, b + 0.25, EI) : 0;
    const sc = (1 + (lt / d) * push) * (1 + o * 0.5) * (0.97 + inK * 0.03);
    return (
      <AbsoluteFill style={{ transform: `scale(${sc})`, opacity: (out === "cut" && t > b ? 0 : 1) * (1 - o), filter: o > 0.01 ? `blur(${o * 22}px)` : undefined }}>
        {children(lt)}
      </AbsoluteFill>
    );
  };

// ============================================================================
//  S1 · 0.0–4.8  Rosette draws itself, then «١٧» slams in on the downbeat
// ============================================================================
const S1: React.FC<{ lt: number }> = ({ lt }) => {
  const hit = 2.4;
  const k = r(lt, hit, hit + 0.5);
  const pu = punch(lt, hit, 6);
  const shine = interpolate(lt, [hit, 4.8], [120, -20]);
  const pre = r(lt, 0.2, 1.6);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${0.9 + lt * 0.03 + pu * 0.06})` }}>
        <Rosette t={lt} at={0.15} R={400} spin={7} />
      </div>
      {/* light ring burst on the hit */}
      <div style={{ position: "absolute", left: CX - 300, top: CY - 300, width: 600, height: 600, borderRadius: "50%",
        border: `${6 * (1 - r(lt, hit, hit + 0.9))}px solid ${C.g3}`, transform: `scale(${0.4 + r(lt, hit, hit + 0.9) * 1.8})`,
        opacity: lt > hit ? 1 - r(lt, hit, hit + 0.9) : 0 }} />
      <div style={abs(CY + 480, { opacity: pre * (1 - k) })}>
        <Words t={lt} at={0.6} step={0.18} text="في يومٍ يحمل اسمها" style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 58, color: C.sand, letterSpacing: 2 }} />
      </div>
      <div style={abs(CY - 300, { transform: `scale(${lerp(2.6, 1, k) + pu * 0.08})`, opacity: k })}>
        <div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 420, lineHeight: 1, ...gold(shine), filter: `drop-shadow(0 20px 60px rgba(0,0,0,0.6))` }}>١٧</div>
      </div>
      <div style={abs(CY + 210)}>
        <Up t={lt} at={hit + 0.35} style={{ display: "inline-block" }}>
          <div style={{ fontFamily: F.messiri, fontWeight: 700, fontSize: 92, color: C.ivory, letterSpacing: 4 }}>أكتوبر</div>
        </Up>
      </div>
      <div style={abs(CY + 370, { opacity: r(lt, hit + 0.8, hit + 1.4) })}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 22, fontFamily: F.latin, fontWeight: 700, fontSize: 30, letterSpacing: 12, color: C.dim, direction: "ltr" }}>
          <span style={{ width: 80 * r(lt, hit + 0.8, hit + 1.6), height: 2, background: C.red }} />
          OMAN · MMXXVI
          <span style={{ width: 80 * r(lt, hit + 0.8, hit + 1.6), height: 2, background: C.green }} />
        </div>
      </div>
    </>
  );
};

// ============================================================================
//  S2 · 4.8–9.6  «إلى كلِّ امرأةٍ عُمانيّة»
// ============================================================================
const S2: React.FC<{ lt: number }> = ({ lt }) => {
  const shine = interpolate(lt, [1.6, 4.8], [130, -30]);
  const bar = r(lt, 0.2, 1.0, EIO);
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <GoldDefs />
        {/* three vertical flag lines that grow */}
        {[C.red, C.ivory, C.green].map((c, i) => (
          <rect key={i} x={120 + i * 22} y={420} width={6} height={1080 * r(lt, 0.1 + i * 0.1, 1.2 + i * 0.1, EIO)} fill={c} opacity={0.9} />
        ))}
        <Draw d={khatam(860, 300, 90)} p={r(lt, 0.5, 1.8, EIO)} w={2.5} />
        <Draw d={star8(860, 300, 44)} p={r(lt, 0.8, 2.0, EIO)} w={2} stroke={C.red} />
      </svg>
      <div style={abs(520, { textAlign: "right", right: 210, left: 0 })}>
        <Up t={lt} at={0.25}><div style={{ fontFamily: F.kufi, fontWeight: 700, fontSize: 64, color: C.sand, letterSpacing: 2 }}>إلى كلِّ</div></Up>
      </div>
      <div style={abs(640, { textAlign: "right", right: 200, left: 0 })}>
        <Up t={lt} at={0.65} dur={0.8}><div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 210, lineHeight: 1.1, color: C.ivory }}>امرأةٍ</div></Up>
      </div>
      <div style={abs(880, { textAlign: "right", right: 150, left: 0 })}>
        <Ink t={lt} at={1.35} dur={1.2}>
          <span style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 250, lineHeight: 1.3, ...gold(shine) }}>عُمانيّة</span>
        </Ink>
      </div>
      <div style={{ position: "absolute", right: 210, top: 1300, width: 620 * bar, height: 3, background: `linear-gradient(270deg, ${C.red}, ${C.g2}, ${C.green})`, opacity: r(lt, 2.2, 2.6) }} />
      <div style={abs(1350, { textAlign: "right", right: 210, left: 0 })}>
        <Words t={lt} at={2.5} step={0.14} text="تصنعُ الفرقَ… كلَّ يوم" style={{ justifyContent: "flex-start", fontFamily: F.naskh, fontWeight: 700, fontSize: 70, color: C.ivory }}
          color={(i) => (i === 1 ? { color: C.red } : {})} />
      </div>
    </>
  );
};

// ============================================================================
//  S3 · 9.6–14.4  Roles — one per beat, each with its own typographic treatment
// ============================================================================
const ROLES = ["الأمّ", "المعلّمة", "الطبيبة", "المهندسة", "الباحثة", "الفنّانة", "رائدةُ الأعمال", "القائدة"];
const S3: React.FC<{ lt: number }> = ({ lt }) => {
  const i = Math.min(ROLES.length - 1, Math.floor(lt / BEAT));
  const bt = lt - i * BEAT;
  const pu = Math.exp(-bt * 9);
  const last = i === ROLES.length - 1;
  const styles: React.CSSProperties[] = [
    { fontFamily: F.bold, fontWeight: 900, color: C.ivory },
    { fontFamily: F.ruqaa, fontWeight: 700, ...gold(50) },
    { fontFamily: F.bold, fontWeight: 900, color: "transparent", WebkitTextStroke: `3px ${C.ivory}` },
    { fontFamily: F.messiri, fontWeight: 700, color: C.ink, background: C.ivory, padding: "0 40px 30px", borderRadius: 8 },
    { fontFamily: F.bold, fontWeight: 900, color: C.green },
    { fontFamily: F.ruqaa, fontWeight: 700, color: C.ivory },
    { fontFamily: F.bold, fontWeight: 900, color: C.ivory, background: C.red, padding: "0 40px 30px", borderRadius: 8 },
    { fontFamily: F.ruqaa, fontWeight: 700, ...gold(lerp(140, -20, r(lt, 4.2, 6.0, (x) => x))) },
  ];
  const size = i === 6 ? 140 : i === 3 ? 160 : last ? 290 : 220;
  const enter = r(bt, 0, 0.22);
  const dir = i % 2 ? 1 : -1;
  const ringR = 360 + pu * 40;
  return (
    <>
      {/* flash on every beat */}
      <AbsoluteFill style={{ background: i % 3 === 0 ? C.red : i % 3 === 1 ? C.green : C.ivory, opacity: pu * 0.12 }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <GoldDefs />
        <g transform={`rotate(${lt * 40} ${CX} ${CY})`}>
          <circle cx={CX} cy={CY} r={ringR} fill="none" stroke="url(#gold)" strokeWidth={2} strokeDasharray="4 18" />
          <circle cx={CX} cy={CY} r={ringR + 40} fill="none" stroke="rgba(251,245,234,0.15)" strokeWidth={1} />
          {ROLES.map((_, k) => {
            const a = (k / ROLES.length) * Math.PI * 2;
            return <circle key={k} cx={CX + (ringR + 40) * Math.cos(a)} cy={CY + (ringR + 40) * Math.sin(a)} r={k <= i ? 10 : 5} fill={k === i ? C.red : k < i ? C.g2 : "rgba(251,245,234,0.3)"} />;
          })}
        </g>
        <path d={khatam(CX, CY, 250 + pu * 30, lt * 0.5)} fill="none" stroke={C.red} strokeWidth={2} opacity={0.5} />
      </svg>
      <div style={abs(500, { opacity: r(lt, 0, 0.3) })}>
        <div style={{ fontFamily: F.kufi, fontWeight: 700, fontSize: 56, color: C.sand, letterSpacing: 6 }}>هي</div>
      </div>
      <div style={abs(CY - size * 0.72, { transform: `translateX(${(1 - enter) * dir * 120}px) scale(${1 + pu * 0.1 - (1 - enter) * 0.2}) skewX(${(1 - enter) * dir * -12}deg)`,
        opacity: enter, filter: `blur(${(1 - enter) * 12}px)` })}>
        <span style={{ display: "inline-block", fontSize: size, lineHeight: 1.25, whiteSpace: "nowrap", ...styles[i] }}>{ROLES[i]}</span>
      </div>
      {/* ghost trail of the previous word */}
      {i > 0 && bt < 0.25 && (
        <div style={abs(CY - 160, { opacity: (1 - bt / 0.25) * 0.4, transform: `translateX(${-dir * bt * 900}px)`, filter: "blur(6px)" })}>
          <span style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 220, color: C.ivory }}>{ROLES[i - 1]}</span>
        </div>
      )}
      <div style={abs(1380, { direction: "ltr" })}>
        <span style={{ fontFamily: F.kufi, fontWeight: 700, fontSize: 40, color: C.ivory, letterSpacing: 8 }}>{String(i + 1).padStart(2, "0")}</span>
        <span style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 40, color: "rgba(251,245,234,0.35)", letterSpacing: 8 }}> / 08</span>
      </div>
    </>
  );
};

// ============================================================================
//  S4 · 14.4–19.2  Fort blueprint draws itself — «شريكةٌ في بناء عُمان»
// ============================================================================
const fortPaths = () => {
  const g = 1420; // ground
  const P: { d: string; at: number; w?: number; c?: string }[] = [];
  P.push({ d: `M40 ${g}H1040`, at: 0, w: 3 });
  // long wall with stepped merlons
  let wall = `M90 ${g}V1180`;
  for (let x = 90; x < 560; x += 52) wall += `H${x + 14}V1150H${x + 38}V1180`;
  wall += `H560`;
  P.push({ d: wall, at: 0.25 });
  // round tower (Nizwa-like drum)
  P.push({ d: `M560 ${g}L585 900Q720 860 855 900L880 ${g}`, at: 0.45, w: 3.5 });
  let crown = `M570 905`;
  for (let x = 570; x < 870; x += 37) crown += `L${x + 8} 860L${x + 28} 860L${x + 37} 905`;
  P.push({ d: crown, at: 0.9 });
  P.push({ d: `M600 1010Q720 980 840 1010M594 1120Q720 1090 846 1120`, at: 1.1, w: 1.6, c: "rgba(243,221,166,0.6)" });
  // tower windows (pointed arches)
  [640, 720, 800].forEach((x, i) => P.push({ d: `M${x - 18} 1280V1235Q${x - 18} 1205 ${x} 1190Q${x + 18} 1205 ${x + 18} 1235V1280`, at: 1.3 + i * 0.1, w: 2.2 }));
  // gate with pointed arch
  P.push({ d: `M240 ${g}V1300Q240 1235 300 1215Q360 1235 360 1300V${g}`, at: 0.8, w: 3 });
  P.push({ d: `M262 ${g}V1305Q262 1255 300 1240Q338 1255 338 1305V${g}`, at: 1.0, w: 1.6, c: C.red });
  // right annex
  let annex = `M880 ${g}V1220`;
  for (let x = 880; x < 1000; x += 40) annex += `H${x + 10}V1195H${x + 30}V1220`;
  annex += `H1000V${g}`;
  P.push({ d: annex, at: 0.6 });
  // palms
  const palm = (x: number, h: number, s: number) =>
    `M${x} ${g}Q${x + 14 * s} ${g - h / 2} ${x + 6 * s} ${g - h}` +
    [[-90, -30], [-70, 20], [80, -20], [70, 30], [-20, -70], [30, -60]].map(([dx, dy]) =>
      ` M${x + 6 * s} ${g - h}Q${x + 6 * s + dx * 0.5} ${g - h + dy - 30} ${x + 6 * s + dx} ${g - h + dy + 30}`).join("");
  P.push({ d: palm(470, 330, 1), at: 1.5, w: 2.4, c: C.green });
  P.push({ d: palm(960, 260, -1), at: 1.65, w: 2.4, c: C.green });
  // flag on the tower
  P.push({ d: `M720 860V720`, at: 1.7, w: 2.5 });
  return P;
};
const FORT = fortPaths();
const S4: React.FC<{ lt: number }> = ({ lt }) => {
  const shine = interpolate(lt, [1.6, 4.8], [130, -30]);
  const flag = r(lt, 1.95, 2.6);
  const wave = Math.sin(lt * 7) * 4;
  return (
    <>
      {/* blueprint grid */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.18 * r(lt, 0, 0.6) }}>
        {Array.from({ length: 13 }).map((_, i) => <line key={`v${i}`} x1={i * 90} y1={0} x2={i * 90} y2={H} stroke={C.g2} strokeWidth={0.7} />)}
        {Array.from({ length: 22 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 90} x2={W} y2={i * 90} stroke={C.g2} strokeWidth={0.7} />)}
      </svg>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `translateY(${-lt * 14}px)` }}>
        <GoldDefs />
        <path d={`M585 ${1420}L585 900Q720 860 855 900L880 1420Z`} fill="url(#gold)" opacity={0.12 * r(lt, 1.6, 2.6)} />
        {FORT.map((p, i) => <Draw key={i} d={p.d} p={r(lt, p.at, p.at + 1.0, EIO)} w={p.w ?? 2.6} stroke={p.c ?? "url(#gold)"} glow={!p.c} />)}
        {/* flag: red hoist band + white / red / green */}
        <g transform={`translate(720 722) scale(${flag} 1)`} opacity={flag}>
          <path d={`M0 0H24V64H0Z`} fill={C.red} />
          <path d={`M24 0Q60 ${wave} 96 0V21Q60 ${21 + wave} 24 21Z`} fill={C.ivory} />
          <path d={`M24 21Q60 ${21 + wave} 96 21V43Q60 ${43 + wave} 24 43Z`} fill={C.red} />
          <path d={`M24 43Q60 ${43 + wave} 96 43V64Q60 ${64 + wave} 24 64Z`} fill={C.green} />
        </g>
        {/* measurement annotations */}
        <g opacity={r(lt, 1.8, 2.3)} fontFamily="Reem Kufi" fontSize={18} fill={C.dim} letterSpacing={3}>
          <path d="M560 1460H880M560 1450V1470M880 1450V1470" stroke={C.dim} strokeWidth={1.5} />
          <text x={720} y={1495} textAnchor="middle">BUILT TOGETHER</text>
        </g>
      </svg>
      <div style={abs(300)}>
        <Up t={lt} at={0.3}><div style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 46, color: C.sand, letterSpacing: 3 }}>من القلاع إلى المستقبل</div></Up>
      </div>
      <div style={abs(390)}>
        <Up t={lt} at={0.6} dur={0.8}><div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 200, lineHeight: 1.15, color: C.ivory }}>شريكةٌ</div></Up>
      </div>
      <div style={abs(1530)}>
        <Words t={lt} at={1.7} step={0.16} text="في بناءِ عُمان" style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: 104 }}
          color={(i) => (i === 2 ? { ...gold(shine) } : { color: C.ivory })} />
      </div>
    </>
  );
};

// ============================================================================
//  S5 · 19.2–24.0  Voice — a living waveform horizon
// ============================================================================
const S5: React.FC<{ lt: number }> = ({ lt }) => {
  const N = 56;
  const env = r(lt, 0.1, 1.2, EIO);
  const beats = Array.from({ length: 8 }).map((_, i) => i * BEAT);
  return (
    <>
      {/* expanding rings on beats */}
      {beats.map((b, i) => {
        const k = (lt - b) / 2.2;
        if (k < 0 || k > 1) return null;
        return <div key={i} style={{ position: "absolute", left: CX - 200, top: 1040 - 200, width: 400, height: 400, borderRadius: "50%",
          border: `2px solid ${i % 2 ? C.green : C.red}`, transform: `scale(${0.3 + k * 2.6})`, opacity: (1 - k) * 0.7 }} />;
      })}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <GoldDefs />
        {Array.from({ length: N }).map((_, i) => {
          const x = 60 + (i / (N - 1)) * 960;
          const c = Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);
          const beatK = Math.exp(-((lt % BEAT) / BEAT) * 4);
          const h = env * (40 + 300 * (1 - c * c) * (0.45 + 0.55 * Math.abs(Math.sin(lt * 5.2 + i * 0.55) * Math.cos(lt * 2.3 - i * 0.21))) * (0.8 + beatK * 0.3));
          const col = c < 0.33 ? C.g2 : i < N / 2 ? C.red : C.green;
          return <rect key={i} x={x - 5} y={1040 - h / 2} width={10} height={h} rx={5} fill={col} opacity={0.9 - c * 0.4} />;
        })}
        <line x1={0} y1={1040} x2={W} y2={1040} stroke="rgba(251,245,234,0.2)" strokeWidth={1} />
      </svg>
      <div style={abs(380)}>
        <Up t={lt} at={0.3}><div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 150, lineHeight: 1.2, color: C.ivory }}>حضورُها</div></Up>
      </div>
      <div style={abs(560)}>
        <Ink t={lt} at={0.9} dur={1.0}><span style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 190, color: C.red, textShadow: "0 0 50px rgba(215,24,42,0.5)" }}>صوتٌ</span></Ink>
      </div>
      <div style={abs(1330)}>
        <Up t={lt} at={2.4}><div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 150, lineHeight: 1.2, color: C.ivory }}>وأثرُها</div></Up>
      </div>
      <div style={abs(1500)}>
        <Ink t={lt} at={3.0} dur={1.0}><span style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 190, color: C.green, textShadow: "0 0 50px rgba(15,154,85,0.5)" }}>باقٍ</span></Ink>
      </div>
    </>
  );
};

// ============================================================================
//  S6 · 24.0–28.8  Mosaic — tiles flip in a wave, values appear
// ============================================================================
const COLS = 4, ROWS = 7, TW = W / COLS, TH = H / ROWS;
const VALUES: Record<string, string> = { "1-1": "العلم", "1-3": "العمل", "2-0": "العطاء", "3-2": "الإبداع", "5-1": "الطموح", "5-3": "الأصالة", "4-0": "الصبر", "2-2": "الحكمة" };
const S6: React.FC<{ lt: number }> = ({ lt }) => {
  const palette = [C.red, C.ink3, C.green, C.ivory, C.redD, C.greenD, C.g1];
  const close = r(lt, 3.4, 4.4, EIO);
  return (
    <>
      <AbsoluteFill style={{ perspective: 1600 }}>
        {Array.from({ length: ROWS * COLS }).map((_, n) => {
          const row = Math.floor(n / COLS), col = n % COLS;
          const key = `${row}-${col}`;
          const word = VALUES[key];
          const dist = Math.hypot(col - 1.5, row - 3) ;
          const at = 0.1 + dist * 0.16;
          const flip = r(lt, at, at + 0.7, EIO);
          const bg = word ? (row + col) % 2 ? C.red : C.green : palette[Math.floor(random(`t${n}`) * palette.length)];
          const dark = bg === C.ivory || bg === C.g1;
          const shrink = 1 - close * (0.55 + random(`c${n}`) * 0.3);
          return (
            <div key={n} style={{ position: "absolute", left: col * TW, top: row * TH, width: TW, height: TH, padding: 6,
              transform: `scale(${shrink}) rotateY(${180 - flip * 180}deg)`, opacity: 1 - close * 0.85, transformStyle: "preserve-3d" }}>
              <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 14, position: "relative", overflow: "hidden",
                backfaceVisibility: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                <svg width={TW - 12} height={TH - 12} style={{ position: "absolute", inset: 0, opacity: word ? 0.22 : 0.35 }}>
                  <path d={khatam((TW - 12) / 2, (TH - 12) / 2, 70, (row + col) * 0.2)} fill="none" stroke={dark ? C.ink : C.g2} strokeWidth={2} />
                  <path d={star8((TW - 12) / 2, (TH - 12) / 2, 34)} fill="none" stroke={dark ? C.ink : C.g2} strokeWidth={1.5} />
                </svg>
                {word && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: F.messiri, fontWeight: 700, fontSize: 58, color: C.ivory, direction: "rtl", paddingBottom: 10 }}>{word}</div>
                )}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      {/* centre lockup after tiles disperse */}
      <div style={abs(CY - 210, { opacity: close })}>
        <div style={{ fontFamily: F.kufi, fontWeight: 500, fontSize: 48, color: C.sand, letterSpacing: 4 }}>قيمٌ تحملُها</div>
      </div>
      <div style={abs(CY - 120, { opacity: close, transform: `scale(${lerp(1.3, 1, close)})` })}>
        <span style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 210, lineHeight: 1.3, ...gold(interpolate(lt, [3.4, 4.8], [120, 0])) }}>جيلاً بعد جيل</span>
      </div>
    </>
  );
};

// ============================================================================
//  S7 · 28.8–33.6  Roots & wings
// ============================================================================
type Seg = { d: string; at: number; w: number };
const buildRoots = () => {
  const segs: Seg[] = [];
  const grow = (x: number, y: number, a: number, len: number, w: number, depth: number, at: number, seed: string) => {
    if (depth > 6 || len < 18) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const bend = (random(seed + "b") - 0.5) * len * 0.5;
    const mx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, my = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
    segs.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, at, w });
    const kids = depth < 2 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const da = (k - (kids - 1) / 2) * (0.5 + random(seed + k) * 0.35);
      grow(x2, y2, a + da, len * (0.66 + random(seed + "l" + k) * 0.12), w * 0.68, depth + 1, at + 0.22, seed + k);
    }
  };
  [-0.35, 0, 0.35].forEach((o, i) => grow(CX, 1060, Math.PI / 2 + o, 150, 9, 0, 0.5, `root${i}`));
  return segs;
};
const ROOTS = buildRoots();
const S7: React.FC<{ lt: number }> = ({ lt }) => {
  const tilt = r(lt, 2.2, 3.4, EIO);
  const line = r(lt, 0.05, 0.7, EIO);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${tilt * 260}px)` }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <GoldDefs />
        <line x1={CX - 500 * line} y1={1060} x2={CX + 500 * line} y2={1060} stroke="url(#tri)" strokeWidth={4} />
        {ROOTS.map((s, i) => <Draw key={i} d={s.d} p={r(lt, s.at, s.at + 0.5, (x) => x)} w={s.w} />)}
      </svg>
      {/* wings: embers that lift off from the line, in V-formation streams */}
      {Array.from({ length: 70 }).map((_, i) => {
        const st = 2.2 + random(`w${i}`) * 1.4;
        const k = (lt - st) / 2.4;
        if (k < 0) return null;
        const side = i % 2 ? 1 : -1;
        const x = CX + side * (20 + random(`wx${i}`) * 80 + k * (180 + random(`wv${i}`) * 300));
        const y = 1060 - k * (700 + random(`wy${i}`) * 500);
        const s = 4 + random(`ws${i}`) * 8;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: s * 2.4, height: s, borderRadius: s,
          background: i % 3 === 0 ? C.red : i % 3 === 1 ? C.g2 : C.green, opacity: Math.max(0, 1 - k) ,
          transform: `rotate(${side * (-35 - k * 20)}deg)`, boxShadow: `0 0 ${s * 2}px ${C.g2}` }} />;
      })}
      <div style={abs(820)}>
        <Words t={lt} at={0.6} step={0.25} text="هي الجذورُ" style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 140, color: C.ivory }}
          color={(i) => (i === 1 ? { ...gold(60) } : {})} />
      </div>
      <div style={abs(400 - 260 * 0)}>
        <Words t={lt} at={2.5} step={0.25} text="وهي الأجنحة" style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 140, color: C.ivory, marginTop: -200 }}
          color={(i) => (i === 1 ? { fontFamily: F.ruqaa, fontWeight: 700, color: C.red, textShadow: "0 0 40px rgba(215,24,42,0.5)" } : {})} />
      </div>
    </div>
  );
};

// ============================================================================
//  S8 · 33.6–40.0  Finale lockup
// ============================================================================
const S8: React.FC<{ lt: number }> = ({ lt }) => {
  const shine = interpolate(lt, [0.6, 5.5], [140, -40]);
  const pu = punch(lt, 0.2, 5);
  const burst = r(lt, 0.2, 1.6);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1.3 + pu * 0.05})`, opacity: 0.3 }}>
        <Rosette t={lt} at={0} R={420} spin={-5} w={2.4} />
      </div>
      {/* radial burst of rays */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: (1 - burst) * 0.9 }}>
        {Array.from({ length: 32 }).map((_, i) => {
          const a = (i / 32) * Math.PI * 2;
          const r0 = 120 + burst * 500, r1 = r0 + 160 * (1 - burst) + 40;
          return <line key={i} x1={CX + r0 * Math.cos(a)} y1={CY + r0 * Math.sin(a)} x2={CX + r1 * Math.cos(a)} y2={CY + r1 * Math.sin(a)}
            stroke={i % 3 === 0 ? C.red : i % 3 === 1 ? C.g2 : C.green} strokeWidth={4} strokeLinecap="round" />;
        })}
      </svg>
      <div style={abs(CY - 400)}>
        <Up t={lt} at={0.3}><div style={{ fontFamily: F.kufi, fontWeight: 700, fontSize: 64, color: C.sand, letterSpacing: 8 }}>يوم</div></Up>
      </div>
      <div style={abs(CY - 300)}>
        <Ink t={lt} at={0.5} dur={1.3}>
          <span style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 230, lineHeight: 1.25, ...gold(shine), filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.7))" }}>المرأة</span>
        </Ink>
      </div>
      <div style={abs(CY - 40)}>
        <Ink t={lt} at={1.0} dur={1.3}>
          <span style={{ fontFamily: F.ruqaa, fontWeight: 700, fontSize: 230, lineHeight: 1.25, ...gold(shine + 20), filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.7))" }}>العُمانيّة</span>
        </Ink>
      </div>
      <div style={abs(CY + 300, { opacity: r(lt, 1.9, 2.5) })}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 28, direction: "rtl" }}>
          <span style={{ width: 120 * r(lt, 1.9, 2.8, EIO), height: 3, background: C.green }} />
          <span style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 70, color: C.ivory }}>١٧ أكتوبر</span>
          <span style={{ width: 120 * r(lt, 1.9, 2.8, EIO), height: 3, background: C.red }} />
        </div>
      </div>
      <div style={abs(CY + 470)}>
        <Words t={lt} at={2.7} step={0.16} text="كلُّ عامٍ وأنتِ مُلهِمة" style={{ fontFamily: F.naskh, fontWeight: 700, fontSize: 76, color: C.ivory }}
          color={(i) => (i === 3 ? { color: C.red } : {})} />
      </div>
    </>
  );
};

// ============================================================================
export const OmanWomen: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  // camera shake on the big hits
  const hits = [2.4, 33.8];
  const sh = hits.reduce((s, h) => s + punch(t, h, 9), 0);
  const shx = Math.sin(t * 90) * 14 * sh, shy = Math.cos(t * 77) * 10 * sh;
  const boost = Math.exp(-((t % BAR) / BAR) * 5) * (t > 2.4 ? 1 : 0.3);
  const end = r(t, OWD_LEN - 1.2, OWD_LEN - 0.1, EIO);
  return (
    <FontGate>
      <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 30%, ${C.ink3} 0%, ${C.ink} 65%)`, overflow: "hidden" }}>
        <Glows t={t} boost={boost} />
        <Lattice t={t} o={0.06 + boost * 0.03} />
        <Dust t={t} />
        <AbsoluteFill style={{ transform: `translate(${shx}px, ${shy}px)` }}>
          <Scene t={t} a={0} b={4.8} out="cut">{(lt) => <S1 lt={lt} />}</Scene>
          <Scene t={t} a={4.8} b={9.6}>{(lt) => <S2 lt={lt} />}</Scene>
          <Scene t={t} a={9.6} b={14.4} out="cut" push={0}>{(lt) => <S3 lt={lt} />}</Scene>
          <Scene t={t} a={14.4} b={19.2}>{(lt) => <S4 lt={lt} />}</Scene>
          <Scene t={t} a={19.2} b={24.0}>{(lt) => <S5 lt={lt} />}</Scene>
          <Scene t={t} a={24.0} b={28.8} push={0.03}>{(lt) => <S6 lt={lt} />}</Scene>
          <Scene t={t} a={28.8} b={33.6} out="cut">{(lt) => <S7 lt={lt} />}</Scene>
          <Scene t={t} a={33.6} b={OWD_LEN + 1} push={0.05}>{(lt) => <S8 lt={lt} />}</Scene>
        </AbsoluteFill>
        <FlagWipe t={t} at={4.8} />
        <FlagWipe t={t} at={14.4} />
        <FlagWipe t={t} at={33.6} />
        {/* white flash into the roles sequence */}
        <AbsoluteFill style={{ background: C.ivory, opacity: punch(t, 9.6, 10) * 0.8 * (t < 10.5 ? 1 : 0) }} />
        <Frame t={t} />
        <Finish t={t} />
        <AbsoluteFill style={{ background: "#000", opacity: end }} />
        <Audio src={staticFile("owd/score.wav")} />
      </AbsoluteFill>
    </FontGate>
  );
};
