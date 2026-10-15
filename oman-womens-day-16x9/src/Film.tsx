import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { S1Date, S2Ribbons, S3Roles, S4Future, S5Pillars, S6Tribute, S7Finale } from "./Scenes3D";

// ============================================================================
//  يوم المرأة العُمانية — 50s, 16:9, 3D luxury cut.
//  All times below are on the reference timeline (see toRef); every reveal lands
//  on its spoken phrase of the ElevenLabs «Hanan» narration.
// ============================================================================

export const FILM_LEN = 50;
export const VO_AT = 1.6; // narration start on the final timeline

// ---------------------------------------------------------------- time warp
// The picture is authored on a reference timeline (first narration take). The final
// narration (ElevenLabs «Hanan», pauses tightened) speaks each phrase at a different
// moment, so film time is mapped back to reference time through monotone-cubic
// (PCHIP) anchors placed on the first word of every phrase — no speed jumps.
const WARP_NEW = [0.0, 1.6, 3.89, 6.641, 9.945, 12.346, 12.666, 14.672, 17.453, 18.493, 19.719, 20.759, 22.096, 23.616, 25.012, 26.852, 28.052, 29.626, 31.715, 33.323, 35.094, 38.117, 40.023, 42.252, 44.234, 47.594, 50.0];
const WARP_REF = [0.0, 2.0, 4.32, 7.04, 10.08, 12.56, 12.8, 15.04, 17.68, 18.533, 19.52, 20.16, 21.84, 23.24, 24.72, 26.2, 27.04, 28.8, 31.04, 32.56, 34.4, 37.12, 38.8, 40.88, 43.04, 45.68, 50.0];
const pchipSlopes = (x: number[], y: number[]) => {
  const n = x.length, h = x.slice(1).map((v, i) => v - x[i]), d = h.map((hi, i) => (y[i + 1] - y[i]) / hi);
  const m = new Array(n).fill(0);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return m;
};
const WARP_M = pchipSlopes(WARP_NEW, WARP_REF);
export const toRef = (t: number) => {
  const x = WARP_NEW, y = WARP_REF;
  if (t <= x[0]) return y[0];
  if (t >= x[x.length - 1]) return y[y.length - 1];
  let i = 0; while (t > x[i + 1]) i++;
  const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * WARP_M[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * WARP_M[i + 1];
};

const W = 1920, H = 1080;

const C = {
  ivory: "#FBF5EA", dim: "rgba(251,245,234,0.62)",
  g0: "#8C6A2E", g1: "#C9A052", g2: "#F3DDA6", g3: "#FFF7E0", red: "#D7182A", green: "#14A05C",
};
const F = {
  kufi: "'Reem Kufi', sans-serif", messiri: "'El Messiri', serif", naskh: "Amiri, serif", ruqaa: "'Aref Ruqaa', serif",
  bold: "Alexandria, sans-serif", latin: "'Cormorant Garamond', serif",
};

/** scene windows (absolute seconds) — neighbours overlap for the cross-dissolve */
const SC = {
  s1: [0, 7.1], s2: [6.7, 12.9], s3: [12.4, 22.0], s4: [21.5, 31.2], s5: [30.7, 37.3], s6: [36.8, 41.1], s7: [40.6, 50],
} as const;
const XF = 0.4;

const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const r = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], { ...CL, easing: e });

// ---------------------------------------------------------------- fonts
const AR = "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC";
const LA = "U+0000-00FF,U+2000-206F";
const FACES: [string, string, string, string][] = [
  ["Alexandria", "fonts/neon/alexandria-arabic-400-normal.woff2", "400", AR],
  ["Alexandria", "fonts/neon/alexandria-arabic-700-normal.woff2", "700", AR],
  ["Aref Ruqaa", "fonts/neon/aref-ruqaa-arabic-700-normal.woff2", "700", AR],
  ["Amiri", "fonts/owd/amiri-arabic-400-normal.woff2", "400", AR],
  ["Amiri", "fonts/owd/amiri-arabic-700-normal.woff2", "700", AR],
  ["Reem Kufi", "fonts/owd/reem-kufi-arabic-500-normal.woff2", "500", AR],
  ["Reem Kufi", "fonts/owd/reem-kufi-arabic-700-normal.woff2", "700", AR],
  ["Reem Kufi", "fonts/owd/reem-kufi-latin-700-normal.woff2", "700", LA],
  ["El Messiri", "fonts/owd/el-messiri-arabic-700-normal.woff2", "700", AR],
  ["Cormorant Garamond", "fonts/owd/cormorant-garamond-latin-600-normal.woff2", "600", LA],
];
let fontsP: Promise<unknown> | null = null;
const loadFonts = () => (fontsP ||= Promise.all(FACES.map(async ([fam, file, weight, unicodeRange]) => {
  try { const f = new FontFace(fam, `url("${staticFile(file)}")`, { weight, unicodeRange }); await f.load(); (document.fonts as any).add(f); }
  catch { console.warn("font failed", file); }
})));
const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("owd fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => { loadFonts().finally(() => { setOk(true); continueRender(h); }); }, [h]);
  return ok ? <>{children}</> : null;
};

// ---------------------------------------------------------------- type
const goldGrad = (pos: number): React.CSSProperties => ({
  backgroundImage: `linear-gradient(100deg, ${C.g0} 0%, ${C.g1} 18%, ${C.g2} 33%, ${C.g1} 44%, ${C.g3} 50%, ${C.g1} 57%, ${C.g2} 70%, ${C.g0} 100%)`,
  backgroundSize: "260% 100%", backgroundPosition: `${pos}% 50%`,
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
});
const PAD: React.CSSProperties = { display: "inline-block", padding: "0.5em 0.18em 0.4em", margin: "-0.5em -0.18em -0.4em" };

/** Gold type with a real extruded edge (stacked darker layer) + soft cast shadow. */
const Gold3D: React.FC<{ children: React.ReactNode; size: number; font?: string; depth?: number; sheen?: number; style?: React.CSSProperties }> =
  ({ children, size, font = F.messiri, depth = 7, sheen = 50, style }) => {
    const layers = Array.from({ length: depth }, (_, i) => {
      const k = i / depth;
      const c = `rgb(${Math.round(120 - k * 60)},${Math.round(84 - k * 46)},${Math.round(30 - k * 18)})`;
      return `0 ${i + 1}px 0 ${c}`;
    }).join(",") + `, 0 ${depth + 10}px 26px rgba(0,0,0,0.65)`;
    return (
      <span style={{ position: "relative", display: "inline-block", fontFamily: font, fontSize: size, fontWeight: 700, lineHeight: 1.25, whiteSpace: "nowrap", ...style }}>
        <span style={{ ...PAD, color: "#6E4C1A", textShadow: layers }}>{children}</span>
        <span style={{ ...PAD, ...goldGrad(sheen), position: "absolute", left: 0, top: 0 }}>{children}</span>
      </span>
    );
  };

/** Words rise one by one from blur (each word its own span so letters stay joined). */
const Words: React.FC<{ t: number; at: number; text: string; step?: number; style?: React.CSSProperties; hi?: string[]; hiFont?: string }> =
  ({ t, at, text, step = 0.11, style, hi = [], hiFont }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.28em", direction: "rtl", flexWrap: "nowrap", ...style }}>
      {text.split(" ").map((w, i) => {
        const p = r(t, at + i * step, at + i * step + 0.75);
        const isHi = hi.some((h) => w.includes(h));
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 46}px) rotateX(${(1 - p) * 60}deg)`, filter: `blur(${(1 - p) * 10}px)` }}>
            {isHi ? <Gold3D size={(style?.fontSize as number) ?? 80} font={hiFont ?? (style?.fontFamily as string)} depth={5} sheen={30 + t * 6}>{w}</Gold3D> : w}
          </span>
        );
      })}
    </div>
  );

/** Pen-like right→left reveal (calligraphy). */
const Ink: React.FC<{ t: number; at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, at, dur = 1.1, children, style }) => {
  const p = r(t, at, at + dur, EIO);
  const edge = -25 + 150 * p;
  const mask = `linear-gradient(to left, #000 ${edge - 20}%, rgba(0,0,0,0.3) ${edge - 6}%, transparent ${edge}%)`;
  return <div style={{ WebkitMaskImage: mask, maskImage: mask, direction: "rtl", whiteSpace: "nowrap", padding: "0.25em 0.4em 0.45em", ...style }}>{children}</div>;
};

const Line: React.FC<{ y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ y, children, style }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", direction: "rtl", ...style }}>{children}</div>
);

/** Thin gold rule with a diamond, grows from the centre. */
const Rule: React.FC<{ t: number; at: number; y: number; w?: number }> = ({ t, at, y, w = 520 }) => {
  const p = r(t, at, at + 0.9);
  return (
    <div style={{ position: "absolute", top: y, left: W / 2 - (w * p) / 2, width: w * p, height: 2, background: `linear-gradient(90deg, transparent, ${C.g2}, transparent)` }}>
      <div style={{ position: "absolute", left: "50%", top: -6, width: 12, height: 12, marginLeft: -6, transform: "rotate(45deg)", background: C.g2, opacity: p }} />
    </div>
  );
};

const fadeOut = (t: number, a: number, b: number) => 1 - r(t, a, b, EIO);

// ---------------------------------------------------------------- per-scene typography
const T1: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ opacity: fadeOut(t, 6.5, 7.0) }}>
    <Line y={52}><div style={{ fontFamily: F.kufi, fontSize: 28, letterSpacing: "0.5em", color: C.g2, opacity: r(t, 0.8, 1.8) * 0.85 }}>سلطنة عُمان</div></Line>
    <Words t={t} at={4.25} text="تحتفي عُمانُ بنصفِها المُشرِق" hi={["المُشرِق"]} hiFont={F.naskh}
      style={{ position: "absolute", top: 860, left: 0, right: 0, fontFamily: F.naskh, fontWeight: 700, fontSize: 78, color: C.ivory, textShadow: "0 6px 24px rgba(0,0,0,0.7)" }} />
  </AbsoluteFill>
);

const T2: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ opacity: fadeOut(t, 12.3, 12.8) }}>
    <Words t={t} at={7.0} text="بامرأةٍ صنعتِ المجدَ بعزيمتِها" hi={["المجد"]}
      style={{ position: "absolute", top: 140, left: 0, right: 0, fontFamily: F.messiri, fontWeight: 700, fontSize: 96, color: C.ivory, textShadow: "0 8px 30px rgba(0,0,0,0.7)" }} />
    <Words t={t} at={10.05} text="وحملتِ الوطنَ في قلبِها" hi={["الوطن"]}
      style={{ position: "absolute", top: 296, left: 0, right: 0, fontFamily: F.naskh, fontWeight: 700, fontSize: 74, color: C.dim, textShadow: "0 6px 24px rgba(0,0,0,0.7)" }} />
  </AbsoluteFill>
);

const T3: React.FC<{ t: number }> = ({ t }) => {
  const cap = (text: string, a: number, b: number) => {
    const o = r(t, a, a + 0.5) * fadeOut(t, b - 0.35, b);
    return o > 0 && <Line y={56} style={{ opacity: o }}><Words t={t} at={a} text={text} step={0.07} style={{ fontFamily: F.naskh, fontSize: 64, fontWeight: 700, color: C.ivory, textShadow: "0 6px 20px rgba(0,0,0,.7)" }} /></Line>;
  };
  return (
    <AbsoluteFill style={{ opacity: fadeOut(t, 21.5, 22.0) }}>
      {cap("التي تبني الأجيال", 12.95, 14.95)}
      {cap("التي تُنيرُ العقول", 15.05, 17.6)}
      {cap("والطبيبةُ · والمهندسةُ · والقائدةُ", 17.7, 20.2)}
      {t > 20.2 && (
        <Line y={64} style={{ opacity: r(t, 20.25, 20.8) }}>
          <Ink t={t} at={20.25} dur={1.0}><Gold3D size={120} font={F.ruqaa} depth={6} sheen={20 + t * 5}>في كلِّ ميدان</Gold3D></Ink>
        </Line>
      )}
    </AbsoluteFill>
  );
};

const T4: React.FC<{ t: number }> = ({ t }) => {
  const past = fadeOut(t, 24.4, 24.9);
  return (
    <AbsoluteFill style={{ opacity: fadeOut(t, 30.7, 31.2) }}>
      <div style={{ opacity: past }}>
        <Words t={t} at={21.8} text="من أصالةِ القلاع" hi={["القلاع"]}
          style={{ position: "absolute", top: 90, left: 0, right: 0, fontFamily: F.messiri, fontSize: 92, fontWeight: 700, color: C.ivory, textShadow: "0 8px 30px rgba(0,0,0,.7)" }} />
        <Words t={t} at={23.2} text="وعَبَقِ اللُّبان" hi={["اللُّبان"]}
          style={{ position: "absolute", top: 232, left: 0, right: 0, fontFamily: F.naskh, fontSize: 70, fontWeight: 700, color: C.dim, textShadow: "0 6px 24px rgba(0,0,0,.7)" }} />
      </div>
      <Words t={t} at={24.75} text="إلى آفاقِ المستقبل" step={0.09}
        style={{ position: "absolute", top: 120, left: 0, right: 0, fontFamily: F.naskh, fontSize: 64, fontWeight: 700, color: C.ivory, opacity: fadeOut(t, 25.9, 26.3), textShadow: "0 6px 24px rgba(0,0,0,.7)" }} />
      {t > 26.0 && (
        <>
          <Line y={70} style={{ opacity: r(t, 26.1, 26.6) }}><div style={{ fontFamily: F.kufi, fontSize: 40, letterSpacing: "0.35em", color: C.g2 }}>رؤيةُ عُمان</div></Line>
          <Line y={118} style={{ opacity: r(t, 26.4, 26.9), transform: `scale(${1.25 - 0.25 * r(t, 26.4, 27.4)})`, filter: `blur(${(1 - r(t, 26.4, 27.0)) * 14}px)` }}>
            <Gold3D size={250} font={F.kufi} depth={12} sheen={10 + (t - 26) * 18}>٢٠٤٠</Gold3D>
          </Line>
          <Rule t={t} at={27.2} y={470} w={640} />
        </>
      )}
      <Words t={t} at={28.8} text="تمضي بثقةٍ وشموخ" hi={["وشموخ"]}
        style={{ position: "absolute", top: 880, left: 0, right: 0, fontFamily: F.messiri, fontSize: 84, fontWeight: 700, color: C.ivory, textShadow: "0 8px 30px rgba(0,0,0,.7)" }} />
    </AbsoluteFill>
  );
};

const T5: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ opacity: fadeOut(t, 36.8, 37.3) }}>
    {t > 34.9 && (
      <Line y={250} style={{ opacity: r(t, 34.9, 35.4) }}>
        <Ink t={t} at={34.95} dur={0.9}><Gold3D size={84} font={F.ruqaa} depth={6} sheen={20 + t * 5}>في كلِّ إنجاز</Gold3D></Ink>
      </Line>
    )}
  </AbsoluteFill>
);

const T6: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ opacity: fadeOut(t, 40.6, 41.1) }}>
    <div style={{ position: "absolute", right: 120, top: 330, width: 980, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Ink t={t} at={37.05} dur={1.3}><Gold3D size={132} font={F.ruqaa} depth={7} sheen={20 + t * 5}>إليكِ يا ابنةَ عُمان</Gold3D></Ink>
      <div style={{ height: 40 }} />
      <Words t={t} at={38.75} text="كلُّ التقديرِ والوفاء" step={0.12}
        style={{ fontFamily: F.naskh, fontSize: 72, fontWeight: 700, color: C.ivory, textShadow: "0 6px 24px rgba(0,0,0,.7)" }} />
    </div>
  </AbsoluteFill>
);

const T7: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill>
    <Line y={690} style={{ opacity: r(t, 40.85, 41.4), transform: `translateY(${(1 - r(t, 40.85, 41.8)) * 40}px)`, filter: `blur(${(1 - r(t, 40.85, 41.5)) * 12}px)` }}>
      <Gold3D size={124} font={F.messiri} depth={9} sheen={(t - 40.8) * 14}>يومُ المرأةِ العُمانيّة</Gold3D>
    </Line>
    <Rule t={t} at={42.4} y={868} w={700} />
    <Words t={t} at={42.95} text="كلُّ عامٍ وأنتِ فخرُ الوطنِ ونبضُه" step={0.1} hi={["فخرُ"]}
      style={{ position: "absolute", top: 890, left: 0, right: 0, fontFamily: F.naskh, fontSize: 58, fontWeight: 700, color: C.ivory, textShadow: "0 6px 22px rgba(0,0,0,.75)" }} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- backdrop
const khatamTile = (s: number) => {
  const c = s / 2, R = s * 0.34, ri = R * 0.7654;
  const pts = Array.from({ length: 16 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 8, rr = k % 2 ? ri : R;
    return `${(c + Math.cos(a) * rr).toFixed(1)},${(c + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'><polygon points='${pts}' fill='none' stroke='%23E0B25A' stroke-width='1.2'/><circle cx='${c}' cy='${c}' r='${R * 0.25}' fill='none' stroke='%23E0B25A' stroke-width='1'/></svg>`).replace(/%2523/g, "%23")}")`;
};

const Backdrop: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 42%, #3A0D14 0%, #1C070B 45%, #080304 100%)" }} />
    <AbsoluteFill style={{ backgroundImage: khatamTile(140), backgroundSize: "140px 140px", backgroundPosition: `${t * 6}px ${t * 3}px`, opacity: 0.06,
      WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, #000 90%)", maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, #000 90%)" }} />
    {/* flag hint: red band on the leading (right) edge, green glow at the bottom */}
    <AbsoluteFill style={{ background: "linear-gradient(270deg, rgba(215,24,42,0.22) 0%, rgba(215,24,42,0) 14%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(20,160,92,0.12) 0%, rgba(20,160,92,0) 22%)" }} />
  </AbsoluteFill>
);

const Finish: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  // gold light sweep across each cut
  const cuts = [6.9, 12.65, 21.75, 30.95, 37.05, 40.85];
  const sw = cuts.map((c) => r(t, c - 0.45, c + 0.55, EIO)).find((p) => p > 0 && p < 1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sw !== undefined && (
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: Math.sin(sw * Math.PI) * 0.55,
          background: `linear-gradient(115deg, transparent ${sw * 140 - 40}%, rgba(255,214,140,0.65) ${sw * 140 - 20}%, transparent ${sw * 140}%)` }} />
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("tex/grain.png")})`, backgroundPosition: `${(frame * 137) % 512}px ${(frame * 241) % 512}px`, opacity: 0.07, mixBlendMode: "overlay" }} />
      {/* thin gold frame */}
      <div style={{ position: "absolute", inset: 26, border: "1px solid rgba(224,178,90,0.28)" }} />
      <AbsoluteFill style={{ background: "#000", opacity: r(t, 0, 0.6) < 1 ? 1 - r(t, 0, 0.6) : r(t, 49.0, 50, EIO) }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- film
const Stage: React.FC<{ t: number; win: readonly [number, number]; three: React.FC<{ t: number }>; type: React.FC<{ t: number }> }> = ({ t, win, three: S, type: T }) => {
  const [a, b] = win;
  if (t < a || t > b) return null;
  const o = Math.min(a === 0 ? 1 : r(t, a, a + XF, EIO), b >= FILM_LEN ? 1 : 1 - r(t, b - XF, b, EIO));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <ThreeCanvas width={W} height={H} linear={false} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} dpr={1}
        camera={{ fov: 32, near: 0.1, far: 120, position: [0, 0, 12] }} style={{ position: "absolute", inset: 0 }}>
        <S t={t} />
      </ThreeCanvas>
      <T t={t} />
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toRef(frame / fps);
  return (
    <AbsoluteFill style={{ background: "#080304", direction: "rtl" }}>
      <FontGate>
        <Backdrop t={t} />
        <Stage t={t} win={SC.s1} three={S1Date} type={T1} />
        <Stage t={t} win={SC.s2} three={S2Ribbons} type={T2} />
        <Stage t={t} win={SC.s3} three={S3Roles} type={T3} />
        <Stage t={t} win={SC.s4} three={S4Future} type={T4} />
        <Stage t={t} win={SC.s5} three={S5Pillars} type={T5} />
        <Stage t={t} win={SC.s6} three={S6Tribute} type={T6} />
        <Stage t={t} win={SC.s7} three={S7Finale} type={T7} />
        <Finish t={t} />
      </FontGate>
    </AbsoluteFill>
  );
};
