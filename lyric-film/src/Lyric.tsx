import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { FontGate } from "../components/FontLoader";

// ============================================================================
//  «عوّدت قلبي» — lyric film. Everything is driven by absolute time in seconds,
//  locked to the vocal's word timestamps, so fps can be changed freely.
// ============================================================================

export const SONG_LEN = 30.43;
const W = 1080, H = 1920, CX = 540, CY = 960;

const C = {
  bg: "#050408", ink: "#F7EEE6", dim: "#8E8392", rose: "#FF3B6B", roseDeep: "#9E0F3A",
  amber: "#FFB561", night: "#0A1236", moon: "#FFE7C2", cyan: "#3FE3FF", plum: "#1B0A1F",
};
const F = {
  heavy: "Alexandria, 'IBM Plex Sans Arabic', sans-serif",
  script: "'Aref Ruqaa', Alexandria, serif",
  mono: "'JetBrains Mono', monospace",
  body: "'IBM Plex Sans Arabic', sans-serif",
};
// beat grid from the track analysis (~83 BPM)
const BEATS = [0.36, 1.07, 1.79, 2.46, 3.18, 3.85, 4.57, 5.27, 6.01, 6.71, 7.34, 7.96, 8.59, 9.31, 9.98, 10.66, 11.38, 12.1, 12.84,
  13.51, 14.21, 14.91, 15.63, 16.35, 17.04, 17.76, 18.46, 19.16, 19.88, 20.6, 21.29, 21.99, 22.71, 23.41, 24.13, 24.82, 25.54,
  26.26, 26.96, 27.68, 28.56, 28.82, 29.02];

const EO = Easing.bezier(0.16, 1, 0.3, 1);      // expo-ish out
const EIO = Easing.bezier(0.65, 0, 0.35, 1);    // in-out
const EI = Easing.bezier(0.55, 0, 1, 0.45);     // in
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const r = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });
const pulse = (t: number, k = 7) => { let p = 0; for (const b of BEATS) if (t >= b) p = Math.max(p, Math.exp(-(t - b) * k)); return p; };
const glow = (c: string, k = 1) => `0 0 ${8 * k}px ${c}, 0 0 ${28 * k}px ${c}AA, 0 0 ${70 * k}px ${c}55`;
const dglow = (c: string, k = 1) => `drop-shadow(0 0 ${10 * k}px ${c}) drop-shadow(0 0 ${34 * k}px ${c}88)`;

type Clk = { t: number; fps: number; frame: number; spec: number[]; bass: number };
const Ctx = React.createContext<Clk>({ t: 0, fps: 30, frame: 0, spec: [], bass: 0 });
const useClk = () => React.useContext(Ctx);
const useSpr = () => { const { t, fps } = useClk(); return (a: number, cfg: Record<string, number> = { damping: 14, stiffness: 130 }) => t < a ? 0 : spring({ frame: (t - a) * fps, fps, config: cfg }); };

// ----------------------------------------------------------------------------
//  Primitives
// ----------------------------------------------------------------------------
const Row: React.FC<{ y: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ y, gap = 34, children, style }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: "translateY(-50%)", display: "flex", justifyContent: "center",
    alignItems: "center", gap, direction: "rtl", ...style }}>{children}</div>
);

type Kind = "slam" | "rise" | "drop" | "soft";
// A single word with a time-locked entrance. Whole words only: Arabic shaping must never be split.
const Word: React.FC<{ at: number; kind?: Kind; font: string; size: number; color: string; weight?: number; glowC?: string; glowK?: number;
  style?: React.CSSProperties; children: React.ReactNode }> = ({ at, kind = "rise", font, size, color, weight = 700, glowC, glowK = 1, style, children }) => {
  const { t } = useClk(); const spr = useSpr();
  const base: React.CSSProperties = { fontFamily: font, fontSize: size, color, fontWeight: weight, lineHeight: 1.25, whiteSpace: "nowrap",
    textShadow: glowC ? glow(glowC, glowK) : undefined, display: "inline-block", ...style };
  if (t < at - 0.02) return <span style={{ ...base, opacity: 0 }}>{children}</span>;
  if (kind === "slam") {
    const s = spr(at, { damping: 11, stiffness: 190 });
    const b = (1 - r(t, at, at + 0.22)) * 26;
    return <span style={{ ...base, opacity: r(t, at, at + 0.1), transform: `scale(${interpolate(s, [0, 1], [2.1, 1])})`, filter: `blur(${b}px)` }}>{children}</span>;
  }
  if (kind === "drop") {
    const s = spr(at, { damping: 13, stiffness: 150 });
    return <span style={{ ...base, opacity: r(t, at, at + 0.15), transform: `translateY(${(1 - s) * -120}px) rotate(${(1 - s) * -6}deg)`,
      filter: `blur(${(1 - r(t, at, at + 0.3)) * 14}px)` }}>{children}</span>;
  }
  if (kind === "soft") {
    const p = r(t, at, at + 0.9);
    return <span style={{ ...base, opacity: p, filter: `blur(${(1 - p) * 22}px)`, transform: `scale(${1.12 - p * 0.12})` }}>{children}</span>;
  }
  // rise: masked reveal from below (px padding keeps descenders & dots intact)
  const p = r(t, at, at + 0.55);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", padding: `${size * 0.25}px ${size * 0.15}px ${size * 0.35}px`, margin: `${-size * 0.25}px ${-size * 0.15}px ${-size * 0.35}px` }}>
      <span style={{ ...base, transform: `translateY(${(1 - p) * 110}%) skewY(${(1 - p) * 8}deg)`, opacity: p > 0 ? 1 : 0 }}>{children}</span>
    </span>
  );
};

// N copies of the same content, each clipped to one strip and offset independently.
// Lets us wave / glitch connected Arabic script without breaking letter joins.
const Sliced: React.FC<{ n: number; axis: "x" | "y"; off: (i: number) => [number, number]; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ n, axis, off, children, style }) => (
    <div style={{ position: "relative", ...style }}>
      <div style={{ visibility: "hidden" }}>{children}</div>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 100 - 0.15, b = 100 - ((i + 1) / n) * 100 - 0.15;
        const clip = axis === "x" ? `inset(-40% ${b}% -40% ${a}%)` : `inset(${a}% -20% ${b}% -20%)`;
        const [dx, dy] = off(i);
        return <div key={i} style={{ position: "absolute", inset: 0, clipPath: clip, transform: `translate(${dx}px, ${dy}px)` }}>{children}</div>;
      })}
    </div>
  );

const HEART = "M50 90 C 22 68, 2 50, 2 29 C 2 13, 14 2, 28 2 C 39 2, 46 8, 50 17 C 54 8, 61 2, 72 2 C 86 2, 98 13, 98 29 C 98 50, 78 68, 50 90 Z";

// ECG polyline. Complexes at the given centres; drawn from right to left (RTL).
const ecgPath = (y: number, centres: [number, number][]) => {
  const pts: [number, number][] = [];
  const shape: [number, number][] = [[-150, 0], [-118, -14], [-86, 0], [-42, 0], [-26, 22], [0, -1], [24, 0.5], [40, 0], [92, 0], [128, -26], [164, 0]];
  const sorted = [...centres].sort((a, b) => b[0] - a[0]);
  pts.push([W + 40, y]);
  for (const [cx, amp] of sorted) for (let k = shape.length - 1; k >= 0; k--) {
    const [dx, dy] = shape[k];
    pts.push([cx + dx, y + (Math.abs(dy) === 1 || dy === 0.5 ? dy * amp : dy * Math.max(0.4, amp / 260))]);
  }
  pts.push([-40, y]);
  return "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
};

const Particles: React.FC<{ at: number; n: number; x: number; y: number; seed: string; speed?: number; colors: string[]; life?: number; grav?: number }> =
  ({ at, n, x, y, seed, speed = 900, colors, life = 1.6, grav = 500 }) => {
    const { t } = useClk();
    const dt = t - at;
    if (dt < 0 || dt > life) return null;
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: n }, (_, i) => {
          const ang = random(`${seed}a${i}`) * Math.PI * 2, v = speed * (0.25 + random(`${seed}v${i}`) * 0.75);
          const drag = 1 - Math.exp(-dt * 2.6);
          const px = x + Math.cos(ang) * v * drag / 2.6, py = y + Math.sin(ang) * v * drag / 2.6 + grav * dt * dt * 0.5;
          const sz = 3 + random(`${seed}s${i}`) * 9, o = 1 - dt / life, c = colors[i % colors.length];
          const star = i % 3 === 0;
          return star ? (
            <path key={i} d={`M${px} ${py - sz * 2}Q${px} ${py} ${px + sz * 2} ${py}Q${px} ${py} ${px} ${py + sz * 2}Q${px} ${py} ${px - sz * 2} ${py}Q${px} ${py} ${px} ${py - sz * 2}Z`}
              fill={c} opacity={o} transform={`rotate(${dt * 200 + i * 20} ${px} ${py})`} />
          ) : <circle key={i} cx={px} cy={py} r={sz * 0.6} fill={c} opacity={o * 0.9} />;
        })}
      </svg>
    );
  };

const Shock: React.FC<{ at: number; x: number; y: number; color: string; max?: number; dur?: number; width?: number }> = ({ at, x, y, color, max = 900, dur = 0.9, width = 6 }) => {
  const { t } = useClk();
  const p = (t - at) / dur;
  if (p < 0 || p > 1) return null;
  const e = EO(p);
  return <div style={{ position: "absolute", left: x - max * e, top: y - max * e, width: max * e * 2, height: max * e * 2, borderRadius: "50%",
    border: `${width * (1 - p) + 1}px solid ${color}`, opacity: 1 - p, boxShadow: `0 0 40px ${color}, inset 0 0 40px ${color}55` }} />;
};

// ----------------------------------------------------------------------------
//  World: background grade, bokeh, grain, vignette
// ----------------------------------------------------------------------------
const Grade: React.FC = () => {
  const { t, bass } = useClk();
  const keys = [0, 4.3, 5.0, 7.0, 7.8, 13.6, 14.4, 21.0, 22.0, 27.6, 28.5, 30.4];
  const top = interpolateColors(t, keys, ["#0B0410", "#14040C", "#2A0B10", "#2A0B10", "#081038", "#060A26", "#0A0710", "#0E0814", "#0B0D16", "#160611", "#000000", "#1A0410"]);
  const mid = interpolateColors(t, keys, ["#3A0718", "#4A0820", "#6A1A18", "#6A1A18", "#1B2A66", "#101A48", "#1A0F24", "#2A0F2C", "#1A1D33", "#3A0A20", "#000000", "#5A0A24"]);
  const k = 0.55 + bass * 0.6;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 50% 50%, ${mid} 0%, ${top} 60%, #020103 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(45% 28% at 50% 50%, ${mid}, transparent 70%)`, opacity: k, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const Bokeh: React.FC = () => {
  const { t } = useClk();
  const col = interpolateColors(t, [0, 5, 7.8, 14.4, 22, 28.5], [C.rose, C.amber, C.moon, C.ink, "#9FB4FF", C.rose]);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs><filter id="bk"><feGaussianBlur stdDeviation="6" /></filter></defs>
      <g filter="url(#bk)">
        {Array.from({ length: 34 }, (_, i) => {
          const sp = 20 + random(`bs${i}`) * 50;
          const x = random(`bx${i}`) * W + Math.sin(t * 0.4 + i) * 30;
          const y = ((random(`by${i}`) * (H + 200) - t * sp) % (H + 200) + H + 200) % (H + 200) - 100;
          const rr = 4 + random(`br${i}`) * 22;
          return <circle key={i} cx={x} cy={y} r={rr} fill={col} opacity={0.05 + random(`bo${i}`) * 0.14} />;
        })}
      </g>
    </svg>
  );
};

const Finish: React.FC = () => {
  const { frame } = useClk();
  return (
    <>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("tex/grain.png")})`, backgroundSize: "380px 380px",
        backgroundPosition: `${(frame * 137) % 380}px ${(frame * 71) % 380}px`, mixBlendMode: "overlay", opacity: 0.26 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, transparent 50%, rgba(0,0,0,0.78) 100%)" }} />
    </>
  );
};

// ----------------------------------------------------------------------------
//  HUD — the "motion designer" layer: live BPM, verse counter, spectrum, timecode
// ----------------------------------------------------------------------------
const HUD: React.FC = () => {
  const { t, fps, frame, spec } = useClk();
  const on = r(t, 0.3, 1.0) * (1 - r(t, 27.5, 27.7));
  const fin = r(t, 29.2, 29.6) * (1 - r(t, 29.9, 30.3));
  const o = Math.max(on, fin);
  if (o <= 0) return null;
  const verse = t < 7.6 ? 1 : t < 14.2 ? 2 : t < 21.6 ? 3 : 4;
  let bpm = 83 + Math.round(Math.sin(t * 1.3) * 1.5);
  if (t > 26.5 && t < 27.7) bpm = Math.round(interpolate(t, [26.5, 27.3], [84, 151], CL) + random(`bpm${frame}`) * 9);
  const pz = pulse(t, 9);
  const tc = (s: number) => { const ff = Math.floor((s % 1) * fps); const ss = Math.floor(s); return `00:00:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`; };
  const mono: React.CSSProperties = { fontFamily: F.mono, fontSize: 24, letterSpacing: 4, color: "rgba(247,238,230,0.62)", direction: "ltr" };
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ ...mono, position: "absolute", top: 86, left: 70, display: "flex", alignItems: "center", gap: 16 }}>
        <svg width={30} height={28} viewBox="0 0 100 92" style={{ transform: `scale(${1 + pz * 0.35})`, filter: `drop-shadow(0 0 ${6 + pz * 14}px ${C.rose})` }}>
          <path d={HEART} fill={C.rose} />
        </svg>
        <span>{String(bpm).padStart(3, "0")} BPM</span>
      </div>
      <div style={{ ...mono, position: "absolute", top: 86, right: 70, textAlign: "right" }}>
        VERSE {String(verse).padStart(2, "0")} / 04
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          {[1, 2, 3, 4].map((v) => <div key={v} style={{ width: 44, height: 4, background: v <= verse ? C.rose : "rgba(255,255,255,0.15)",
            boxShadow: v === verse ? `0 0 12px ${C.rose}` : undefined }} />)}
        </div>
      </div>
      <div style={{ ...mono, position: "absolute", bottom: 92, left: 70, fontSize: 22 }}>{tc(t)}</div>
      <div style={{ position: "absolute", bottom: 92, right: 70, fontFamily: F.body, fontSize: 26, color: "rgba(247,238,230,0.55)", direction: "rtl" }}>عوّدت قلبي</div>
      <svg width={300} height={50} style={{ position: "absolute", bottom: 84, left: CX - 150 }}>
        {Array.from({ length: 30 }, (_, i) => {
          const v = spec[(i % 15) + 1] ?? 0; const h = 3 + Math.min(1, v * 3.2) * 44;
          return <rect key={i} x={i * 10} y={25 - h / 2} width={4} height={h} rx={2} fill={i % 5 === 0 ? C.rose : "rgba(247,238,230,0.55)"} />;
        })}
      </svg>
      {[[46, 46], [W - 46, 46], [46, H - 46], [W - 46, H - 46]].map(([x, y], i) => (
        <svg key={i} width={36} height={36} style={{ position: "absolute", left: x - 18, top: y - 18 }}>
          <path d="M18 0V36M0 18H36" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
        </svg>
      ))}
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  01 — عوّدت قلبي على صوتك  (0.0 → 4.8)
// ----------------------------------------------------------------------------
const S1: React.FC = () => {
  const { t, spec } = useClk(); const spr = useSpr();
  if (t > 4.85) return null;
  const pz = pulse(t);
  const draw = r(t, 0.0, 0.95, EIO);
  const collapse = r(t, 1.0, 1.55, EIO);
  const heartDraw = r(t, 1.02, 2.0, EIO);
  const hs = 1 + pz * 0.07 * r(t, 1.4, 1.8);
  const out = r(t, 3.95, 4.8, EI);
  const ringIn = r(t, 2.84, 3.3);
  const ecgAmp = 120 + pz * 200;
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + out * 6})`, transformOrigin: `${CX}px ${CY - 20}px`, opacity: 1 - r(t, 4.4, 4.8), filter: `blur(${out * 10}px)` }}>
      {/* ECG monitor line, then it collapses into the heart */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `scaleX(${1 - collapse})`, transformOrigin: `${CX}px ${CY}px`, opacity: 1 - collapse * 0.9 }}>
        <path d={ecgPath(CY, [[860, ecgAmp * 0.7], [CX, ecgAmp], [220, ecgAmp * 0.7]])} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw}
          fill="none" stroke={C.rose} strokeWidth={6} strokeLinejoin="round" style={{ filter: dglow(C.rose, 0.8) }} />
      </svg>
      {/* audio-reactive radial spectrum around the heart */}
      {ringIn > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 96 }, (_, i) => {
            const a = (i / 96) * Math.PI * 2 - Math.PI / 2;
            const idx = 1 + Math.floor((i < 48 ? i : 95 - i) / 2);
            const v = Math.min(1, (spec[idx] ?? 0) * 3.4);
            const r0 = 380 * hs, len = (12 + v * 170 + pz * 18) * ringIn;
            return <line key={i} x1={CX + Math.cos(a) * r0} y1={CY - 20 + Math.sin(a) * r0} x2={CX + Math.cos(a) * (r0 + len)} y2={CY - 20 + Math.sin(a) * (r0 + len)}
              stroke={interpolateColors(i % 48, [0, 24, 47], [C.rose, C.amber, C.rose])} strokeWidth={6} strokeLinecap="round" opacity={0.85} />;
          })}
        </svg>
      )}
      {/* heart */}
      <div style={{ position: "absolute", left: CX - 300, top: CY - 300, width: 600, height: 552, transform: `scale(${hs})` }}>
        <svg width={600} height={552} viewBox="0 0 100 92" style={{ overflow: "visible" }}>
          <path d={HEART} fill={C.rose} opacity={r(t, 1.9, 2.6) * 0.1 + pz * 0.06} />
          <path d={HEART} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - heartDraw} fill="none" stroke={C.rose} strokeWidth={1.1}
            strokeLinejoin="round" style={{ filter: dglow(C.rose, 0.6) }} />
          <path d={HEART} fill="none" stroke={C.ink} strokeWidth={0.25} opacity={0.5 * heartDraw} transform="translate(50 46) scale(0.9) translate(-50 -46)" />
        </svg>
      </div>
      <Row y={CY - 50}>
        <Word at={1.02} kind="soft" font={F.script} size={190} color={C.ink} glowC={C.rose} glowK={0.9}>قلبي</Word>
      </Row>
      <Row y={330}>
        <Word at={0.22} kind="slam" font={F.heavy} size={190} weight={900} color={C.ink} glowC={C.rose} glowK={0.35}>عوّدت</Word>
      </Row>
      <Row y={1560} gap={30}>
        <Word at={2.36} kind="drop" font={F.heavy} size={110} weight={700} color={C.dim}>على</Word>
        <Word at={2.84} kind="slam" font={F.heavy} size={180} weight={900} color={C.ink} glowC={C.amber} glowK={0.4 + pz * 0.6}>صوتك</Word>
      </Row>
      <Shock at={2.84} x={CX} y={CY - 20} color={C.amber} max={700} />
      <Shock at={1.02} x={CX} y={CY - 20} color={C.rose} max={520} dur={0.7} width={3} />
      {/* rose flash when we dive into the heart */}
      <AbsoluteFill style={{ background: C.rose, opacity: r(t, 4.3, 4.7) * 0.5, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  02 — وضحكاتك  (4.4 → 7.9)
// ----------------------------------------------------------------------------
const S2: React.FC = () => {
  const { t } = useClk(); const spr = useSpr();
  if (t < 4.4 || t > 7.9) return null;
  const inP = r(t, 4.45, 5.1);
  const exit = r(t, 6.95, 7.75, EI);
  const s = spr(5.12, { damping: 9, stiffness: 140 });
  const amp = t < 5.12 ? 0 : 24 * Math.exp(-(t - 5.12) * 1.3) + 7;
  const wave = (i: number, lag = 0): [number, number] => [0, Math.sin((t - lag) * 13 - i * 0.38) * amp * (0.6 + 0.4 * Math.sin(i * 0.9))];
  const word = <div style={{ fontFamily: F.script, fontSize: 250, fontWeight: 700, lineHeight: 1.5, whiteSpace: "nowrap", padding: "0 30px",
    background: `linear-gradient(100deg, ${C.amber} 10%, ${C.rose} 55%, #FF7FA3 90%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>وضحكاتك</div>;
  const outline = (op: number) => <div style={{ fontFamily: F.script, fontSize: 250, fontWeight: 700, lineHeight: 1.5, whiteSpace: "nowrap", padding: "0 30px",
    color: "transparent", WebkitTextStroke: `2px rgba(255,181,97,${op})` }}>وضحكاتك</div>;
  return (
    <AbsoluteFill style={{ opacity: inP, transform: `translateY(${exit * 1500}px)`, filter: `blur(${exit * 16}px)` }}>
      {/* typographic marquee texture */}
      <AbsoluteFill style={{ opacity: r(t, 4.6, 5.3) * 0.13, direction: "rtl" }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} style={{ position: "absolute", top: i * 185 - 40, left: -400, whiteSpace: "nowrap", fontFamily: F.heavy, fontWeight: 900, fontSize: 150,
            color: i % 2 ? "transparent" : C.amber, WebkitTextStroke: i % 2 ? `2px ${C.ink}` : undefined,
            transform: `translateX(${(i % 2 ? 1 : -1) * (t - 4.4) * 160 + (i % 2 ? -300 : 0)}px)` }}>
            {"ضحكاتك ✦ ضحكاتك ✦ ضحكاتك ✦ ضحكاتك ✦ "}
          </div>
        ))}
      </AbsoluteFill>
      {/* echo trails */}
      {[-1, 1].flatMap((d) => [1, 2].map((k) => (
        <div key={`${d}${k}`} style={{ position: "absolute", left: 0, right: 0, top: CY + d * k * 260, transform: `translateY(-50%) scale(${s})`, display: "flex", justifyContent: "center", direction: "rtl", opacity: r(t, 5.2 + k * 0.12, 5.6 + k * 0.12) }}>
          <Sliced n={14} axis="x" off={(i) => wave(i, k * 0.09)}>{outline(k === 1 ? 0.3 : 0.12)}</Sliced>
        </div>
      )))}
      {/* the laugh */}
      <div style={{ position: "absolute", left: 0, right: 0, top: CY, transform: `translateY(-50%) scale(${interpolate(s, [0, 1], [0.2, 1])}) rotate(${Math.sin(t * 9) * 2 * Math.min(1, amp / 30)}deg)`,
        display: "flex", justifyContent: "center", direction: "rtl", opacity: r(t, 5.1, 5.2), filter: dglow(C.rose, 0.7) }}>
        <Sliced n={40} axis="x" off={(i) => wave(i)}>{word}</Sliced>
      </div>
      <Particles at={5.12} n={90} x={CX} y={CY} seed="laugh" colors={[C.amber, C.rose, C.ink, "#FF8FB0"]} speed={1500} />
      <Particles at={6.01} n={36} x={CX} y={CY} seed="laugh2" colors={[C.amber, C.ink]} speed={900} life={1.2} />
      <Shock at={5.12} x={CX} y={CY} color={C.amber} max={1000} />
      <Row y={1400}>
        <Word at={5.5} kind="rise" font={F.mono} size={26} weight={400} color={C.amber} style={{ letterSpacing: 10, direction: "ltr" }}>( THE SOUND I LIVE FOR )</Word>
      </Row>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  03 — أسهر عليها إلين النوم يدركني  (6.9 → 14.3)
// ----------------------------------------------------------------------------
const Lids: React.FC<{ p: number }> = ({ p }) => {
  if (p <= 0.001) return null;
  const h = p * (CY + 140);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: -500, width: W + 1000, height: 2000, top: h - 2000, borderRadius: "0 0 50% 50% / 0 0 22% 22%", background: "#000",
        boxShadow: `0 30px 60px rgba(0,0,0,0.9), 0 6px 0 ${C.roseDeep}55` }} />
      <div style={{ position: "absolute", left: -500, width: W + 1000, height: 2000, top: H - h, borderRadius: "50% 50% 0 0 / 22% 22% 0 0", background: "#000",
        boxShadow: `0 -30px 60px rgba(0,0,0,0.9)` }} />
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const { t } = useClk();
  if (t < 6.9 || t > 14.35) return null;
  const enter = r(t, 6.95, 7.95, EO);
  const drowsy = r(t, 12.9, 13.6, EIO);
  const breathe = (Math.sin((t - 12.4) * 5) * 0.5 + 0.5) * drowsy;
  const minutes = interpolate(t, [7.6, 13.6], [23 * 60 + 41, 28 * 60 + 12], CL);
  const hh = Math.floor(minutes / 60) % 24, mm = Math.floor(minutes % 60);
  const clock = `${String(hh % 12 === 0 ? 12 : hh % 12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${hh >= 12 && hh < 24 ? "PM" : "AM"}`;
  const hand = (t - 7) * 140;
  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - enter) * -1300}px)`, filter: `blur(${(1 - enter) * 14}px)` }}>
      {/* stars */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 170 }, (_, i) => {
          const x = random(`sx${i}`) * W, y = random(`sy${i}`) * H * 0.95;
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.5 + random(`st${i}`) * 4) + i));
          const rr = 0.8 + random(`sr${i}`) * 2.4;
          return <circle key={i} cx={x - (t - 7) * 6 * rr} cy={y} r={rr} fill={C.moon} opacity={tw * 0.9} />;
        })}
        {/* shooting star */}
        {t > 10.2 && t < 11.0 && (() => { const p = r(t, 10.2, 10.9, EIO); const x = 980 - p * 700, y = 180 + p * 330;
          return <line x1={x} y1={y} x2={x + 160} y2={y - 76} stroke={C.moon} strokeWidth={3} strokeLinecap="round" opacity={1 - p} style={{ filter: dglow(C.moon, 0.5) }} />; })()}
      </svg>
      {/* moon */}
      <svg width={360} height={360} viewBox="0 0 360 360" style={{ position: "absolute", left: 640, top: 210 + (1 - enter) * 120, overflow: "visible", filter: dglow(C.moon, 1.3) }}>
        <defs><mask id="cres"><rect width={360} height={360} fill="#fff" /><circle cx={232} cy={140} r={112} fill="#000" /></mask></defs>
        <circle cx={180} cy={180} r={120} fill={C.moon} mask="url(#cres)" />
      </svg>
      {/* clock face */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.32 * r(t, 7.6, 8.6) * (1 - drowsy * 0.6) }}>
        <circle cx={CX} cy={1010} r={420} fill="none" stroke={C.moon} strokeWidth={2} />
        {Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2; const l = i % 5 ? 14 : 34;
          return <line key={i} x1={CX + Math.cos(a) * 420} y1={1010 + Math.sin(a) * 420} x2={CX + Math.cos(a) * (420 - l)} y2={1010 + Math.sin(a) * (420 - l)} stroke={C.moon} strokeWidth={i % 5 ? 2 : 4} />; })}
        <line x1={CX} y1={1010} x2={CX} y2={1010 - 360} stroke={C.amber} strokeWidth={4} transform={`rotate(${hand} ${CX} 1010)`} />
        <line x1={CX} y1={1010} x2={CX} y2={1010 - 230} stroke={C.moon} strokeWidth={8} strokeLinecap="round" transform={`rotate(${hand / 12} ${CX} 1010)`} />
        <circle cx={CX} cy={1010} r={10} fill={C.amber} />
      </svg>
      <div style={{ filter: `blur(${breathe * 7 + drowsy * 2}px)`, transform: `translateY(${drowsy * 30}px) rotate(${drowsy * -2}deg)`, opacity: 1 - drowsy * 0.35 }}>
        <Row y={720} gap={40}>
          <Word at={7.94} kind="rise" font={F.heavy} size={200} weight={900} color={C.ink} glowC={C.moon} glowK={0.35}>أسهر</Word>
          <Word at={9.26} kind="soft" font={F.script} size={205} color={C.amber} glowC={C.amber} glowK={0.5}>عليها</Word>
        </Row>
        <Row y={1000} gap={30}>
          <Word at={11.0} kind="rise" font={F.heavy} size={130} weight={700} color={C.dim}>إلين</Word>
          <Word at={11.64} kind="rise" font={F.heavy} size={160} weight={800} color={C.ink}>النوم</Word>
        </Row>
        <Row y={1270}>
          <Word at={12.42} kind="soft" font={F.script} size={220} color={C.ink} glowC={C.rose} glowK={0.8}>يدركني</Word>
        </Row>
      </div>
      <Row y={1560}>
        <span style={{ fontFamily: F.mono, fontSize: 44, letterSpacing: 8, color: C.moon, opacity: r(t, 8.0, 8.6) * (1 - drowsy * 0.7), direction: "ltr",
          textShadow: glow(C.amber, 0.4) }}>{clock}</span>
      </Row>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  04 — ما فيه أحدٍ في البشر سوّى بي سواتك  (14.2 → 21.9)
// ----------------------------------------------------------------------------
const DOTS = (() => {
  const out: { x: number; y: number; r: number; s: number }[] = [];
  const cols = 15, rows = 26;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = (i + 0.5) * (W / cols) + (random(`dx${i}-${j}`) - 0.5) * 50 + (j % 2) * 18;
    const y = (j + 0.5) * (H / rows) + (random(`dy${i}-${j}`) - 0.5) * 40;
    if (Math.hypot(x - CX, y - 1080) < 70) continue;
    out.push({ x, y, r: 4 + random(`dr${i}-${j}`) * 6, s: random(`ds${i}-${j}`) });
  }
  return out;
})();

const S4: React.FC = () => {
  const { t } = useClk(); const spr = useSpr();
  if (t < 14.2 || t > 21.9) return null;
  const pz = pulse(t);
  const pull = r(t, 15.6, 16.8, EIO), push = r(t, 16.98, 19.1, EIO);
  const cam = 1.35 - pull * 0.35 + push * 0.18;
  const lonely = r(t, 16.98, 17.8);
  const chosen = spr(16.98, { damping: 10, stiffness: 90 });
  const boom = r(t, 19.16, 19.9);
  const exit = r(t, 20.9, 21.85, EI);
  const dotR = 9 + chosen * 26 + pz * 8 * chosen;
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, filter: `blur(${exit * 20}px)`, transform: `scale(${1 + exit * 0.3})` }}>
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${CX}px 1080px` }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {DOTS.map((d, i) => {
            const dist = Math.hypot(d.x - CX, d.y - 1080);
            const appear = r(t, 14.3 + dist / 2400, 14.7 + dist / 2400);
            const wx = Math.sin(t * (0.6 + d.s) + i) * 10, wy = Math.cos(t * (0.5 + d.s) + i * 1.3) * 6;
            const flee = lonely * (60 + d.s * 120) * (dist < 1 ? 0 : 1);
            const ax = (d.x - CX) / (dist || 1), ay = (d.y - 1080) / (dist || 1);
            const o = appear * (0.45 - lonely * 0.33 + (d.s > 0.93 ? 0.3 : 0) * (1 - lonely));
            return <circle key={i} cx={d.x + wx + ax * flee} cy={d.y + wy + ay * flee} r={d.r * (1 - lonely * 0.3)} fill={C.ink} opacity={o} />;
          })}
        </svg>
        {/* the one */}
        <div style={{ position: "absolute", left: CX - dotR, top: 1080 - dotR, width: dotR * 2, height: dotR * 2, borderRadius: "50%",
          background: interpolateColors(lonely, [0, 1], [C.ink, C.rose]), opacity: r(t, 14.3, 14.6) * (1 - boom),
          boxShadow: lonely > 0 ? glow(C.rose, 1 + chosen + pz) : undefined }} />
      </AbsoluteFill>
      {/* ring that the dot becomes */}
      {boom > 0 && (
        <div style={{ position: "absolute", left: CX - 420, top: 1080 - 420, width: 840, height: 840, borderRadius: "50%", border: `5px solid ${C.rose}`,
          transform: `scale(${0.1 + EO(boom) * 0.9 + pz * 0.03})`, boxShadow: glow(C.rose, 1.2), opacity: 0.9 }} />
      )}
      <Shock at={19.16} x={CX} y={1080} color={C.rose} max={1300} dur={1.1} width={10} />
      <Particles at={19.16} n={110} x={CX} y={1080} seed="one" colors={[C.rose, C.ink, C.amber]} speed={1900} grav={300} life={1.8} />
      <AbsoluteFill style={{ background: C.ink, opacity: (1 - r(t, 19.16, 19.4)) * (t >= 19.16 ? 0.35 : 0), mixBlendMode: "screen" }} />
      <Row y={340} gap={30}>
        <Word at={14.44} kind="drop" font={F.heavy} size={140} weight={900} color={C.ink}>ما</Word>
        <Word at={14.72} kind="drop" font={F.heavy} size={140} weight={900} color={C.ink}>فيه</Word>
        <Word at={15.04} kind="slam" font={F.heavy} size={150} weight={900} color={C.rose} glowC={C.rose} glowK={0.5}>أحدٍ</Word>
      </Row>
      <Row y={520} gap={24}>
        <Word at={15.7} kind="rise" font={F.heavy} size={100} weight={600} color={C.dim}>في</Word>
        <Word at={16.04} kind="rise" font={F.heavy} size={120} weight={800} color={C.ink}>البشر</Word>
      </Row>
      <Row y={740} gap={30}>
        <Word at={16.98} kind="soft" font={F.script} size={160} color={C.amber} glowC={C.amber} glowK={0.4}>سوّى</Word>
        <Word at={17.62} kind="soft" font={F.script} size={160} color={C.amber} glowC={C.amber} glowK={0.4}>بي</Word>
      </Row>
      <Row y={1090}>
        <Word at={19.16} kind="slam" font={F.script} size={270} color={C.ink} glowC={C.rose} glowK={1.1 + pz * 0.6}>سواتك</Word>
      </Row>
      <Row y={1600}>
        <Word at={19.6} kind="rise" font={F.mono} size={26} weight={400} color={C.rose} style={{ letterSpacing: 10, direction: "ltr" }}>1 / 8,000,000,000</Word>
      </Row>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  05 — اسمك إذا مر بين الناس يربكني  (21.2 → 28.1)
// ----------------------------------------------------------------------------
const People: React.FC<{ layer: number }> = ({ layer }) => {
  const { t } = useClk();
  const L = [
    { n: 14, s: 0.5, speed: 70, blur: 5, color: "#2C2546", ground: 1560, op: 0.55 },
    { n: 10, s: 0.85, speed: 150, blur: 1.5, color: "#3D2E50", ground: 1780, op: 0.75 },
    { n: 6, s: 1.9, speed: 420, blur: 16, color: "#0A070E", ground: 2300, op: 0.92 },
  ][layer];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: `blur(${L.blur}px)`, opacity: L.op }}>
      {Array.from({ length: L.n }, (_, i) => {
        const dir = random(`pd${layer}${i}`) > 0.5 ? 1 : -1;
        const span = W + 500 * L.s;
        const x0 = random(`px${layer}${i}`) * span;
        const x = (((x0 + dir * L.speed * (t - 21) * (0.8 + random(`pv${layer}${i}`) * 0.4)) % span) + span) % span - 250 * L.s;
        const s = L.s * (0.85 + random(`ps${layer}${i}`) * 0.3);
        const bob = Math.abs(Math.sin(t * 5.5 + i * 2)) * 10 * s;
        const bw = 120 * s, bh = 360 * s, hr = 42 * s;
        const top = L.ground - bh - bob;
        return (
          <g key={i}>
            <rect x={x - bw / 2} y={top} width={bw} height={bh + 400} rx={bw / 2} fill={L.color} />
            <circle cx={x} cy={top - hr - 10 * s} r={hr} fill={L.color} />
          </g>
        );
      })}
    </svg>
  );
};

const S5: React.FC = () => {
  const { t, frame } = useClk();
  if (t < 21.2 || t > 28.15) return null;
  const inP = r(t, 21.3, 22.2);
  const g = t >= 26.58 ? Math.max(0.35, 1 - (t - 26.58) * 0.5) * (t < 27.7 ? 1 : 0) : 0;
  const rnd = (k: string) => random(`${k}${frame}`) - 0.5;
  const write = r(t, 22.26, 23.3, EIO);
  const passX = (1 - r(t, 24.22, 24.7)) * -760;
  const crowdSpeed = 1 + r(t, 25.0, 26.0) * 0.6;
  void crowdSpeed;
  return (
    <AbsoluteFill style={{ opacity: inP, transform: `translate(${rnd("shx") * 34 * g}px, ${rnd("shy") * 26 * g}px)` }}>
      <AbsoluteFill style={{ opacity: r(t, 21.3, 22.3) }}><People layer={0} /><People layer={1} /></AbsoluteFill>
      {/* name, hand-written right → left with a glowing nib */}
      <Row y={600}>
        <div style={{ position: "relative", display: "inline-block", transform: `translate(${rnd("nx") * 18 * g}px, ${rnd("ny") * 12 * g}px)` }}>
          <div style={{ fontFamily: F.script, fontSize: 320, fontWeight: 700, color: C.ink, lineHeight: 1.45, padding: "0 40px", textShadow: glow(C.rose, 0.9),
            clipPath: `inset(-20% -5% -20% ${(1 - write) * 100}%)` }}>اسمك</div>
          {write > 0 && write < 1 && (
            <div style={{ position: "absolute", top: "48%", left: `${(1 - write) * 100}%`, width: 26, height: 26, marginLeft: -13, borderRadius: 13,
              background: "#fff", boxShadow: glow(C.rose, 1.6) }} />
          )}
          <svg width="100%" height={30} style={{ position: "absolute", bottom: 40, left: 0, overflow: "visible" }}>
            <path d="M 760 10 C 560 30, 300 -6, 40 16" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - r(t, 23.0, 23.6, EIO)}
              fill="none" stroke={C.rose} strokeWidth={6} strokeLinecap="round" style={{ filter: dglow(C.rose, 0.6) }} />
          </svg>
        </div>
      </Row>
      <Row y={970} gap={30}>
        <Word at={23.54} kind="rise" font={F.heavy} size={120} weight={600} color={C.dim}>إذا</Word>
        <div style={{ position: "relative", transform: `translateX(${passX}px)`, opacity: t >= 24.2 ? 1 : 0 }}>
          {[3, 2, 1].map((k) => (
            <span key={k} style={{ position: "absolute", left: 0, top: 0, fontFamily: F.heavy, fontWeight: 900, fontSize: 170, lineHeight: 1.25, color: C.rose,
              opacity: (1 - r(t, 24.22, 24.75)) * (0.5 / k), transform: `translateX(${-k * 70 * (1 - r(t, 24.22, 24.75))}px)`, filter: `blur(${k * 4}px)` }}>مر</span>
          ))}
          <span style={{ position: "relative", fontFamily: F.heavy, fontWeight: 900, fontSize: 170, lineHeight: 1.25, color: C.ink, textShadow: glow(C.rose, 0.4),
            filter: `blur(${(1 - r(t, 24.22, 24.7)) * 10}px)` }}>مر</span>
        </div>
      </Row>
      <Row y={1250} gap={30}>
        <Word at={25.12} kind="rise" font={F.heavy} size={130} weight={700} color={C.ink}>بين</Word>
        <Word at={25.86} kind="rise" font={F.heavy} size={150} weight={800} color={C.ink}>الناس</Word>
      </Row>
      {/* foreground passers-by cut in front of the type */}
      <AbsoluteFill style={{ opacity: r(t, 21.6, 22.6) }}><People layer={2} /></AbsoluteFill>
      {/* glitch: RGB split + displaced slices */}
      <Row y={1560}>
        <div style={{ position: "relative", opacity: t >= 26.56 ? 1 : 0, transform: `scale(${t >= 26.58 ? 1 + Math.exp(-(t - 26.58) * 9) * 0.5 : 1})` }}>
          {g > 0 && [[C.cyan, -1], [C.rose, 1]].map(([c, s]) => (
            <div key={c as string} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", transform: `translate(${(s as number) * (8 + Math.abs(rnd(`rg${c}`)) * 26) * g}px, ${rnd(`rv${c}`) * 8 * g}px)` }}>
              <span style={{ fontFamily: F.heavy, fontWeight: 900, fontSize: 210, lineHeight: 1.35, color: c as string, padding: "0 20px", display: "inline-block" }}>يربكني</span>
            </div>
          ))}
          <Sliced n={9} axis="y" off={(i) => [random(`gl${i}-${Math.floor(frame / 2)}`) > 0.6 ? rnd(`gs${i}`) * 90 * g : 0, 0]}>
            <span style={{ fontFamily: F.heavy, fontWeight: 900, fontSize: 210, lineHeight: 1.35, color: C.ink, padding: "0 20px", display: "inline-block" }}>يربكني</span>
          </Sliced>
        </div>
      </Row>
      {/* scanlines + flicker during the glitch */}
      {g > 0 && <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 6px)",
        opacity: 0.6 + rnd("fl") * 0.4 }} />}
      {g > 0 && random(`blk${frame}`) > 0.7 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: random(`by${frame}`) * H, height: 30 + random(`bh${frame}`) * 120,
          background: random(`bc${frame}`) > 0.5 ? C.rose : C.cyan, mixBlendMode: "difference", opacity: 0.8 }} />
      )}
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
//  06 — flatline → the last hit (27.9 → end)
// ----------------------------------------------------------------------------
const S6: React.FC = () => {
  const { t, frame } = useClk(); const spr = useSpr();
  if (t < 27.95) return null;
  const HIT = 28.56;
  const flat = t < HIT;
  const spike = t >= HIT ? Math.exp(-(t - HIT) * 4) : 0;
  const lineAmp = flat ? 4 + Math.sin(t * 40) * 2 : 640 * spike;
  const hs = spr(HIT + 0.04, { damping: 9, stiffness: 110 });
  const pz = pulse(t, 6);
  const shake = t >= HIT ? Math.exp(-(t - HIT) * 6) * 30 : 0;
  const fade = r(t, 29.95, 30.43, EIO);
  const lineO = flat ? r(t, 28.0, 28.15) : 1 - r(t, HIT + 0.2, HIT + 0.7);
  return (
    <AbsoluteFill style={{ transform: `translate(${(random(`fx${frame}`) - 0.5) * shake}px, ${(random(`fy${frame}`) - 0.5) * shake}px)`, opacity: 1 - fade }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: lineO }}>
        <path d={ecgPath(CY, [[CX, lineAmp]])} fill="none" stroke={C.rose} strokeWidth={flat ? 3 : 7} strokeLinejoin="round" style={{ filter: dglow(C.rose, 0.8) }} />
      </svg>
      {flat && (
        <Row y={CY + 120}>
          <span style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: 10, color: C.rose, opacity: 0.4 + 0.6 * (Math.floor(t * 4) % 2), direction: "ltr" }}>— — —</span>
        </Row>
      )}
      {t >= HIT && (
        <>
          <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% 45%, ${C.rose}AA, transparent 70%)`, opacity: 0.35 + pz * 0.4 }} />
          <div style={{ position: "absolute", left: CX - 270, top: 820 - 260, width: 540, height: 497, transform: `scale(${hs * (1 + pz * 0.06)})`, filter: dglow(C.rose, 1.6) }}>
            <svg width={540} height={497} viewBox="0 0 100 92">
              <defs><radialGradient id="hg" cx="40%" cy="35%" r="75%"><stop offset="0%" stopColor="#FF8FAE" /><stop offset="55%" stopColor={C.rose} /><stop offset="100%" stopColor={C.roseDeep} /></radialGradient></defs>
              <path d={HEART} fill="url(#hg)" />
              <path d="M24 18 C 16 20, 11 27, 12 34" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.55} />
            </svg>
          </div>
          <Shock at={HIT} x={CX} y={820} color={C.rose} max={1400} dur={1.0} width={14} />
          <Shock at={HIT + 0.12} x={CX} y={820} color={C.amber} max={1100} dur={1.0} width={6} />
          <Shock at={28.82} x={CX} y={820} color={C.ink} max={800} dur={0.8} width={4} />
          <Particles at={HIT} n={150} x={CX} y={820} seed="fin" colors={[C.rose, C.amber, C.ink, "#FF8FB0"]} speed={2400} grav={260} life={1.9} />
          <Row y={1340}>
            <Word at={28.72} kind="rise" font={F.script} size={170} color={C.ink} glowC={C.rose} glowK={0.6}>عوّدت قلبي</Word>
          </Row>
          <Row y={1490}>
            <Word at={28.95} kind="rise" font={F.heavy} size={64} weight={600} color={C.dim}>على صوتك وضحكاتك</Word>
          </Row>
          <Row y={1600}>
            <Word at={29.15} kind="soft" font={F.mono} size={22} weight={400} color={C.rose} style={{ letterSpacing: 12, direction: "ltr" }}>A LYRIC FILM — 2026</Word>
          </Row>
          <AbsoluteFill style={{ background: "#fff", opacity: (1 - r(t, HIT, HIT + 0.22, EO)) * 0.9 }} />
        </>
      )}
    </AbsoluteFill>
  );
};

// CRT power-off: squashes the whole frame into a line, then a dot (27.65 → 28.05)
const CRT: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useClk();
  const a = r(t, 27.62, 27.82, EI), b = r(t, 27.82, 28.0, EI);
  if (t < 27.62) return <>{children}</>;
  if (t > 28.02) return null;
  return (
    <AbsoluteFill style={{ transform: `scale(${1 - b * 0.995}, ${1 - a * 0.996})`, filter: `brightness(${1 + a * 3})` }}>{children}</AbsoluteFill>
  );
};

// ----------------------------------------------------------------------------
export const Lyric: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const src = staticFile("song.mp3");
  const audio = useAudioData(src);
  const spec = audio ? visualizeAudio({ fps, frame, audioData: audio, numberOfSamples: 64, smoothing: true }) : [];
  const bass = spec.length ? (spec[0] + spec[1] + spec[2] + spec[3]) / 4 : 0;
  // slow handheld camera drift
  const drift = `translate(${Math.sin(t * 0.7) * 6}px, ${Math.cos(t * 0.53) * 8}px) rotate(${Math.sin(t * 0.31) * 0.35}deg)`;
  return (
    <FontGate>
      <Ctx.Provider value={{ t, fps, frame, spec, bass }}>
        <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
          <Audio src={src} />
          <CRT>
            <Grade />
            <Bokeh />
            <AbsoluteFill style={{ transform: drift }}>
              <S1 /><S2 /><S3 /><S4 /><S5 />
            </AbsoluteFill>
            <Lids p={r(t, 13.55, 14.22, EIO) - r(t, 14.3, 14.85, EO)} />
          </CRT>
          <S6 />
          <HUD />
          <Finish />
        </AbsoluteFill>
      </Ctx.Provider>
    </FontGate>
  );
};
