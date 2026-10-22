import React, { useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import {
  COL, Cam, Dust, Env, Lights, Ribbon, archFrameGeo, archPanelGeo, clamp01, ease, easeBack, easeIO, fortGeo, labelTexture,
  lerp, mabkharaGeo, seg, squareRingGeo, starOutlineGeo, useMats, useSoftDot,
} from "./kit3d";

// Times are absolute film seconds (VO starts at 2.0s). See Film.tsx for the phrase map.

const AR_BIG = (px: number) => `700 ${px}px "Reem Kufi", "El Messiri", sans-serif`;
const AR_SER = (px: number) => `700 ${px}px "El Messiri", "Amiri", serif`;

// ---------------------------------------------------------------- medallion
/** Gold khatam medallion: two square frames lock into the 8-point star around a red lacquer disc. */
const Medallion: React.FC<{ t: number; build: number; label?: THREE.Texture; glow?: number }> = ({ t, build, label, glow = 1 }) => {
  const m = useMats();
  const g = useMemo(() => ({
    sq: squareRingGeo(1.25, 0.2, 0.26),
    star: starOutlineGeo(2.35, 0.06, 0.08),
  }), []);
  const a = ease(seg(build, 0, 0.75));
  const b = ease(seg(build, 0.1, 0.85));
  const c = easeBack(seg(build, 0.55, 1));
  return (
    <group>
      <mesh geometry={g.sq} material={m.gold}
        position={[lerp(-7, 0, a), lerp(4, 0, a), lerp(-14, 0, a)]}
        rotation={[lerp(2.2, 0, a), lerp(-1.6, 0, a), lerp(-3, 0, a)]} />
      <mesh geometry={g.sq} material={m.gold}
        position={[lerp(7, 0, b), lerp(-4, 0, b), lerp(-14, 0.02, b)]}
        rotation={[lerp(-2, 0, b), lerp(1.8, 0, b), lerp(3.6, Math.PI / 4, b)]} />
      <group scale={c}>
        <mesh material={m.red} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.04]}>
          <cylinderGeometry args={[0.98, 0.98, 0.2, 72]} />
        </mesh>
        <mesh material={m.gold}><torusGeometry args={[1.0, 0.055, 20, 96]} /></mesh>
        <mesh material={m.green}><torusGeometry args={[0.86, 0.03, 16, 96]} /></mesh>
        <mesh material={m.goldSatin} rotation={[0, 0, t * 0.05]}><torusGeometry args={[2.02, 0.03, 12, 160]} /></mesh>
        <mesh geometry={g.star} material={m.goldSatin} position={[0, 0, -0.25]} rotation={[0, 0, Math.PI / 8 + t * 0.03]} />
        {label && (
          <mesh position={[0, 0, 0.09]}>
            <planeGeometry args={[1.86, 1.86]} />
            <meshBasicMaterial map={label} transparent toneMapped={false} />
          </mesh>
        )}
      </group>
      <pointLight position={[1.6, 1.8, 3.2]} intensity={4 * glow * c} distance={9} color="#FFD58A" />
    </group>
  );
};

const useDateLabel = () => useMemo(() => labelTexture({
  w: 512, h: 512,
  lines: [{ text: "١٧", font: AR_BIG(250), y: 215 }, { text: "أكتوبر", font: AR_SER(92), y: 390 }],
}), []);

// ---------------------------------------------------------------- S1  ١٧ أكتوبر
export const S1Date: React.FC<{ t: number }> = ({ t }) => {
  const label = useDateLabel();
  const build = seg(t, 0.15, 2.05);
  const lock = Math.max(0, t - 2.0);
  const tilt = Math.sin(t * 0.55) * 0.18 * clamp01(lock);
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 12, 30]} />
      <Cam pos={[Math.sin(t * 0.2) * 0.6, 0.35, lerp(12.5, 10.8, easeIO(seg(t, 0, 7)))]} look={[0, 0.35, 0]} />
      <group position={[0, 0.72, 0]} scale={0.9} rotation={[tilt * 0.4, tilt, 0]}>
        <Medallion t={t} build={build} label={label} />
      </group>
      {/* shock ring at the lock */}
      {lock > 0 && lock < 1.4 && (
        <mesh position={[0, 0.72, -0.3]} scale={1.9 + ease(lock / 1.4) * 3}>
          <ringGeometry args={[0.98, 1.0, 128]} />
          <meshBasicMaterial color="#FFD98F" transparent opacity={(1 - lock / 1.4) * 0.8} toneMapped={false} />
        </mesh>
      )}
      <Dust t={t} />
      <Dust t={t} n={60} size={0.16} seed="big" opacity={0.35} center={[0, 0, -8]} />
    </>
  );
};

// ---------------------------------------------------------------- S2  ribbons
export const S2Ribbons: React.FC<{ t: number }> = ({ t }) => {
  const m = useMats();
  const rm = useMemo(() => ({
    red: Object.assign(m.red.clone(), { side: THREE.DoubleSide }),
    green: Object.assign(m.green.clone(), { side: THREE.DoubleSide }),
    gold: Object.assign(m.gold.clone(), { side: THREE.DoubleSide }),
    ivory: Object.assign(m.ivory.clone(), { side: THREE.DoubleSide }),
  }), [m]);
  const star = useMemo(() => starOutlineGeo(3.6, 0.08, 0.1), []);
  const k = t - 6.7;
  const enter = ease(seg(k, 0, 1.6));
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 10, 34]} />
      <Cam pos={[lerp(1.5, -1.5, seg(k, 0, 6.2)), -0.9, 12]} look={[0, -0.6, 0]} />
      <group position={[lerp(-14, 0, enter), 0, 0]}>
        <Ribbon t={t} y={-1.5} z={0.6} width={0.95} mat={rm.red} phase={0} amp={0.55} />
        <Ribbon t={t} y={-2.05} z={-0.2} width={0.6} mat={rm.ivory} phase={0.9} amp={0.6} twist={0.35} />
        <Ribbon t={t} y={-2.6} z={0.2} width={0.95} mat={rm.green} phase={1.7} amp={0.5} />
        <Ribbon t={t} y={-1.0} z={-1.0} width={0.16} mat={rm.gold} phase={2.6} amp={0.7} twist={0.8} />
        <Ribbon t={t} y={-3.2} z={1.2} width={0.12} mat={rm.gold} phase={3.4} amp={0.5} twist={0.8} />
      </group>
      <mesh geometry={star} material={m.goldSatin} position={[3.5, 1.4, -7]} rotation={[0.3, -0.4, t * 0.12]} />
      <mesh geometry={star} material={m.goldSatin} position={[-5, 2.4, -10]} scale={0.6} rotation={[-0.2, 0.5, -t * 0.1]} />
      <Dust t={t} seed="s2" />
    </>
  );
};

// ---------------------------------------------------------------- S3  roles carousel
export const ROLES = [
  { word: "الأُمّ", at: 12.8, bg: COL.red },
  { word: "المعلِّمة", at: 15.0, bg: COL.green },
  { word: "الطبيبة", at: 17.7, bg: COL.red },
  { word: "المهندسة", at: 18.5, bg: COL.green },
  { word: "القائدة", at: 19.5, bg: COL.red },
];
const NR = ROLES.length;
const STEP = (Math.PI * 2) / NR;

const carouselAngle = (t: number) => {
  let phi = -0 + 0.9 * (1 - ease(seg(t, 12.4, 13.2)));
  for (let i = 1; i < NR; i++) phi -= STEP * easeIO(seg(t, ROLES[i].at - 0.45, ROLES[i].at + 0.15));
  phi -= Math.max(0, t - 20.1) * 0.32 * ease(seg(t, 20.1, 21));
  return phi;
};

const Card: React.FC<{ i: number; t: number; phi: number }> = ({ i, t, phi }) => {
  const m = useMats();
  const r = ROLES[i];
  const geo = useMemo(() => ({ frame: archFrameGeo(2.1, 3.1, 0.16, 0.2), panel: archPanelGeo(1.84, 2.86) }), []);
  const tex = useMemo(() => labelTexture({
    w: 512, h: 796, bg: r.bg === COL.red ? "#9E1020" : "#0C6E3F", ornament: true,
    lines: [{ text: r.word, font: AR_SER(r.word.length > 6 ? 104 : 124), y: 520 }],
  }), [r.word, r.bg]);
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0, envMapIntensity: 0.35, color: "#E6E6E6" }), [tex]);
  const a = i * STEP + phi;
  const R = 4.6;
  // facing amount (1 when in front)
  const face = Math.max(0, Math.cos(a));
  const active = Math.exp(-Math.pow((t - r.at - 0.4) / 1.6, 2)) * (t < 20.1 ? 1 : 0.2);
  const appear = easeBack(seg(t, 12.4 + i * 0.08, 13.2 + i * 0.08));
  return (
    <group position={[Math.sin(a) * R, -1.9 + active * 0.15, Math.cos(a) * R]} rotation={[0, a, 0]} scale={appear * (0.8 + active * 0.1)}>
      <mesh geometry={geo.frame} material={m.gold} position={[0, 0, -0.1]} />
      <mesh geometry={geo.panel} material={panelMat} position={[0, 0.13, 0.0]} />
      <mesh geometry={geo.panel} material={m.goldSatin} position={[0, 0.13, -0.08]} rotation={[0, Math.PI, 0]} />
      <mesh material={m.goldSatin} position={[0, -0.12, 0]}><boxGeometry args={[2.4, 0.24, 0.6]} /></mesh>
      {face > 0.9 && <pointLight position={[0, 3.4, 2.4]} intensity={active * 6} distance={6} color="#FFE2A6" />}
    </group>
  );
};

export const S3Roles: React.FC<{ t: number }> = ({ t }) => {
  const m = useMats();
  const phi = carouselAngle(t);
  const pull = easeIO(seg(t, 20.0, 21.6));
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 13, 32]} />
      <Cam pos={[0, lerp(0.1, 4.6, pull), lerp(11.8, 16.5, pull)]} look={[0, lerp(-0.75, -1.4, pull), 0]} />
      {ROLES.map((_, i) => <Card key={i} i={i} t={t} phi={phi} />)}
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.03, 0]}>
        <circleGeometry args={[8.5, 96]} />
      </mesh>
      <mesh material={m.gold} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.0, 0]}>
        <ringGeometry args={[6.6, 6.68, 160]} />
      </mesh>
      <Dust t={t} seed="s3" center={[0, 1, -2]} />
    </>
  );
};

// ---------------------------------------------------------------- plume (frankincense smoke)
const Plume: React.FC<{ t: number; origin: [number, number, number]; n?: number; height?: number; size?: number; color?: string; seed?: string }> =
  ({ t, origin, n = 140, height = 5, size = 0.55, color = "#FFF1DA", seed = "plume" }) => {
    const tex = useSoftDot();
    const geo = useMemo(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      return g;
    }, [n]);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colA = geo.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const ph = random(`${seed}${i}`);
      const life = ((t * 0.22 + ph) % 1 + 1) % 1;
      const sw = Math.sin(life * 7 + ph * 20) * 0.5 * life + Math.sin(t * 0.7 + ph * 9) * 0.15 * life;
      pos.setXYZ(i, origin[0] + sw + (random(`${seed}x${i}`) - 0.5) * 0.3 * life, origin[1] + life * height, origin[2] + Math.cos(life * 5 + ph * 7) * 0.4 * life);
      const a = Math.sin(Math.PI * Math.min(1, life * 1.15)) * 0.45;
      colA.setXYZ(i, c.r * a, c.g * a, c.b * a);
    }
    pos.needsUpdate = true; colA.needsUpdate = true;
    return (
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial map={tex} size={size} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} vertexColors />
      </points>
    );
  };

// ---------------------------------------------------------------- S4  heritage → 2040
export const S4Future: React.FC<{ t: number }> = ({ t }) => {
  const m = useMats();
  const g = useMemo(() => ({ fort: fortGeo(), mab: mabkharaGeo() }), []);
  const crane = easeIO(seg(t, 24.5, 26.6));
  const k = t - 21.5;
  const bars = 28;
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 12, 34]} />
      <Cam
        pos={[lerp(-1.2, 0, crane) + Math.sin(t * 0.3) * 0.3, lerp(-0.2, 12.4, crane), lerp(lerp(11.5, 10.5, seg(k, 0, 3)), 11.5, crane)]}
        look={[lerp(0.2, 0, crane), lerp(0.4, 9.6, crane), lerp(0, -2.5, crane)]} />
      {/* heritage: fort + mabkhara with frankincense */}
      <group position={[-0.9, -1.7, -1.6]} rotation={[0, 0.28, 0]} scale={[0.82, 0.82 * ease(seg(k, 0, 1.2)), 0.82]}>
        <mesh geometry={g.fort} material={m.gold} position={[0, 0, -0.45]} />
      </group>
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
        <planeGeometry args={[60, 40]} />
      </mesh>
      <group position={[3.6, -1.7, 1.6]} scale={easeBack(seg(t, 22.9, 23.6)) * 1.1}>
        <mesh geometry={g.mab} material={m.gold} />
        <mesh material={m.red} position={[0, 0.12, 0]}><boxGeometry args={[1.2, 0.24, 1.2]} /></mesh>
        <pointLight position={[0, 1.25, 0]} intensity={8} distance={4} color="#FF7A3A" />
      </group>
      <Plume t={t} origin={[3.6, -0.5, 1.6]} height={7} size={1.3} seed="smokeA" color="#9C9286" />
      <Plume t={t + 3} origin={[3.6, -0.5, 1.6]} height={9} n={90} size={2.4} seed="smokeB" color="#6E655C" />
      {/* future: rising ring of light-bars + orbiting rings */}
      <group position={[0, 8.2, -2]}>
        {Array.from({ length: bars }, (_, i) => {
          const a = (i / bars) * Math.PI * 2;
          const h = (0.5 + 1.6 * Math.pow(Math.abs(Math.cos(a / 2)), 2) + random(`bar${i}`) * 0.5) * ease(seg(t, 25.0 + (i % 7) * 0.07, 26.4 + (i % 7) * 0.07));
          return (
            <mesh key={i} material={i % 3 === 0 ? m.red : i % 3 === 1 ? m.gold : m.green} position={[Math.sin(a + t * 0.12) * 3.6, -1.6 + h / 2, Math.cos(a + t * 0.12) * 3.6 - 1.5]}>
              <boxGeometry args={[0.2, Math.max(0.001, h), 0.2]} />
            </mesh>
          );
        })}
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={i === 1 ? m.gold : m.goldSatin} position={[0, -1.6 + i * 0.05, -1.5]} rotation={[Math.PI / 2 + Math.sin(t * 0.6 + i) * 0.05, 0, 0]} scale={ease(seg(t, 25.6 + i * 0.25, 26.8 + i * 0.25))}>
            <torusGeometry args={[4.3 + i * 0.45, 0.03, 12, 200]} />
          </mesh>
        ))}
        <pointLight position={[0, 1.5, -1.5]} intensity={30 * ease(seg(t, 25.8, 27))} distance={10} color="#FFD58A" />
      </group>
      <Dust t={t} seed="s4" center={[0, 4, -3]} spread={[24, 22, 16]} />
    </>
  );
};

// ---------------------------------------------------------------- S5  three pillars + arch
export const PILLARS = [
  { x: 3.7, at: 31.0, text: "شريكةٌ في البناء", mat: "red" as const },
  { x: 0, at: 32.5, text: "حاضرةٌ في القرار", mat: "ivory" as const },
  { x: -3.7, at: 34.4, text: "أثرُها باقٍ", mat: "green" as const },
];
const Pillar: React.FC<{ t: number; i: number }> = ({ t, i }) => {
  const m = useMats();
  const p = PILLARS[i];
  const grow = easeBack(seg(t, p.at - 0.25, p.at + 0.75));
  const plaque = useMemo(() => labelTexture({
    w: 900, h: 300, bg: "#16090B", border: true,
    lines: [{ text: p.text, font: AR_SER(104), y: 158 }],
  }), [p.text]);
  const show = seg(t, p.at - 0.1, p.at + 0.5);
  return (
    <group position={[p.x, -2, 0]}>
      <mesh material={m.goldSatin} position={[0, 0.25, 0]}><boxGeometry args={[1.7, 0.5, 1.7]} /></mesh>
      <group position={[0, 0.5, 0]} scale={[1, Math.max(0.001, grow), 1]}>
        <mesh material={m[p.mat]} position={[0, 1.8, 0]}><cylinderGeometry args={[0.56, 0.62, 3.6, 40, 1]} /></mesh>
        {[0.15, 3.45].map((y) => <mesh key={y} material={m.gold} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.64, 0.07, 16, 64]} /></mesh>)}
        <mesh material={m.gold} position={[0, 3.75, 0]}><boxGeometry args={[1.6, 0.36, 1.6]} /></mesh>
      </group>
      <mesh position={[0, 0.25, 0.9]} scale={0.6 + 0.4 * ease(show)}>
        <planeGeometry args={[2.85, 0.95]} />
        <meshBasicMaterial map={plaque} transparent opacity={ease(show)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 4.6, 1.5]} intensity={10 * grow} distance={6} color="#FFE0A0" />
    </group>
  );
};

export const S5Pillars: React.FC<{ t: number }> = ({ t }) => {
  const m = useMats();
  const archP = easeIO(seg(t, 34.6, 35.9));
  const archGeo = useMemo(() => new THREE.TorusGeometry(3.7, 0.12, 16, 120, Math.PI * Math.max(0.001, archP)), [Math.round(archP * 200)]);
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 14, 34]} />
      <Cam pos={[Math.sin((t - 30.7) * 0.12) * 2.2, 1.4, lerp(16.5, 15, seg(t, 30.7, 37.2))]} look={[0, 1.1, 0]} />
      {PILLARS.map((_, i) => <Pillar key={i} t={t} i={i} />)}
      <group position={[0, 2.25, 0]} scale={[1, 0.5, 1]}>
        <mesh geometry={archGeo} material={m.gold} rotation={[0, 0, 0]} />
      </group>
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}><planeGeometry args={[60, 40]} /></mesh>
      <Dust t={t} seed="s5" center={[0, 1.5, -3]} />
    </>
  );
};

// ---------------------------------------------------------------- S6  rose petals (Jebel Akhdar damask rose)
const petalGeo = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(0.45, -0.35, 0.45, 0.35, 0.12, 0.5);
  s.quadraticCurveTo(0, 0.42, -0.12, 0.5);
  s.bezierCurveTo(-0.45, 0.35, -0.45, -0.35, 0, -0.5);
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, (p.getX(i) ** 2) * 0.9 - (p.getY(i) + 0.5) * 0.15);
  g.computeVertexNormals();
  return g;
};
export const Petals: React.FC<{ t: number; t0: number; n?: number }> = ({ t, t0, n = 110 }) => {
  const geo = useMemo(petalGeo, []);
  const mats = useMemo(() => ["#B0122A", "#D42A44", "#8E0C1E", "#E0566A"].map((c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color("#FFB3C0"), side: THREE.DoubleSide })), []);
  const k = t - t0;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const r = (s: string) => random(`pet${s}${i}`);
        const speed = 0.9 + r("v") * 0.8;
        const y = 7 - ((k * speed + r("y") * 14) % 14);
        const x = (r("x") - 0.5) * 22 + Math.sin(k * 0.8 + r("p") * 9) * 0.8;
        const z = (r("z") - 0.5) * 10 - 1;
        return (
          <mesh key={i} geometry={geo} material={mats[i % 4]} position={[x, y, z]} scale={0.22 + r("s") * 0.18}
            rotation={[k * (1 + r("a")) + r("b") * 6, k * 0.7 * (r("c") - 0.5) * 3 + r("d") * 6, k * (r("e") - 0.5) * 2]} />
        );
      })}
    </group>
  );
};

export const S6Tribute: React.FC<{ t: number }> = ({ t }) => {
  const k = t - 36.8;
  const label = useMemo(() => labelTexture({ w: 512, h: 512, lines: [{ text: "عُمان", font: `700 170px "Aref Ruqaa", serif`, y: 250 }] }), []);
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 10, 30]} />
      <Cam pos={[0, 0, lerp(13, 11.8, seg(k, 0, 4.2))]} look={[0, 0, 0]} />
      <group position={[-3.1, 0.1, -0.5]} rotation={[0.15, 0.45 + k * 0.08, 0.1]}>
        <Medallion t={t} build={1} label={label} />
      </group>
      <Petals t={t} t0={36.8} />
      <Dust t={t} seed="s6" />
    </>
  );
};

// ---------------------------------------------------------------- S7  finale lockup
export const S7Finale: React.FC<{ t: number }> = ({ t }) => {
  const m = useMats();
  const label = useDateLabel();
  const rm = useMemo(() => ({
    red: Object.assign(m.red.clone(), { side: THREE.DoubleSide }),
    green: Object.assign(m.green.clone(), { side: THREE.DoubleSide }),
    gold: Object.assign(m.gold.clone(), { side: THREE.DoubleSide }),
  }), [m]);
  const k = t - 40.6;
  const build = seg(k, 0.0, 1.0);
  const burst = Math.max(0, t - 40.9);
  const tex = useSoftDot();
  const burstGeo = useMemo(() => {
    const n = 220, g = new THREE.BufferGeometry(), dirs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = random(`bu${i}`) * 2 - 1, th = random(`bt${i}`) * Math.PI * 2, s = Math.sqrt(1 - u * u), sp = 0.6 + random(`bs${i}`);
      dirs.set([s * Math.cos(th) * sp, u * sp, s * Math.sin(th) * sp * 0.6], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return { g, dirs, n };
  }, []);
  const bp = burstGeo.g.attributes.position as THREE.BufferAttribute;
  const dist = 7 * (1 - Math.exp(-burst * 1.6));
  for (let i = 0; i < burstGeo.n; i++) bp.setXYZ(i, burstGeo.dirs[i * 3] * dist, 0.9 + burstGeo.dirs[i * 3 + 1] * dist - burst * burst * 0.08, burstGeo.dirs[i * 3 + 2] * dist);
  bp.needsUpdate = true;
  return (
    <>
      <Env />
      <Lights t={t} />
      <fog attach="fog" args={["#12060a", 12, 34]} />
      <Cam pos={[Math.sin(k * 0.15) * 0.5, 0.4, lerp(13.4, 12.2, easeIO(seg(k, 0, 9.4)))]} look={[0, 0.4, 0]} />
      <group position={[0, 1.25, 0]} scale={0.74} rotation={[Math.sin(t * 0.5) * 0.06, Math.sin(t * 0.4) * 0.2, 0]}>
        <Medallion t={t} build={0.55 + 0.45 * build} label={label} glow={1.3} />
      </group>
      <group position={[0, -1.75, -3.5]}>
        <Ribbon t={t} y={-2.7} z={-1.2} width={0.8} mat={rm.red} phase={0.5} amp={0.4} speed={0.7} />
        <Ribbon t={t} y={-3.4} z={-1.6} width={0.8} mat={rm.green} phase={2.0} amp={0.4} speed={0.7} />
        <Ribbon t={t} y={-2.2} z={-2.4} width={0.14} mat={rm.gold} phase={3.1} amp={0.5} speed={0.7} twist={0.8} />
      </group>
      {burst > 0 && (
        <points geometry={burstGeo.g} frustumCulled={false}>
          <pointsMaterial map={tex} size={0.14} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#FFD27A" opacity={Math.exp(-burst * 0.35)} />
        </points>
      )}
      <Dust t={t} seed="s7" />
      <Dust t={t} n={70} size={0.18} seed="big7" opacity={0.3} center={[0, 0, -8]} />
    </>
  );
};
