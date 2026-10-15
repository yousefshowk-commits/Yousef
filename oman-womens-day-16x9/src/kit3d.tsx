import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { random } from "remotion";

// ============================================================================
//  3D kit — Omani palette (lacquer red, emerald green, polished gold, ivory)
// ============================================================================

export const COL = {
  gold: "#E0B25A", goldDeep: "#9A7230", red: "#8E0B18", redHi: "#D81F30", green: "#0B7D47", greenHi: "#11A35E",
  ivory: "#F5ECDC", ink: "#0A0506",
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => { const k = clamp01(x); return 1 - Math.pow(1 - k, 3); };
export const easeIO = (x: number) => { const k = clamp01(x); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const easeBack = (x: number) => { const k = clamp01(x); const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Studio reflections for the metals (procedural, no HDR download). */
export const Env: React.FC<{ intensity?: number }> = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    pm.dispose();
  }, [gl, scene]);
  return null;
};

/** Sets the default camera every frame (pure function of time). */
export const Cam: React.FC<{ pos: [number, number, number]; look?: [number, number, number]; fov?: number; roll?: number }> =
  ({ pos, look = [0, 0, 0], fov = 32, roll = 0 }) => {
    const { camera } = useThree();
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...pos);
    cam.up.set(Math.sin(roll), Math.cos(roll), 0);
    cam.lookAt(...look);
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    return null;
  };

/** Warm key, cool fill and red/green rims — shared by every scene. */
export const Lights: React.FC<{ t: number; power?: number }> = ({ t, power = 1 }) => (
  <>
    <ambientLight intensity={0.18} />
    <directionalLight position={[4 + Math.sin(t * 0.5) * 3, 6, 6]} intensity={2.6 * power} color="#FFE7BF" />
    <directionalLight position={[-6, 2, 3]} intensity={0.6} color="#BFD6FF" />
    <pointLight position={[-7, 3, -5]} intensity={45} distance={30} color={COL.redHi} />
    <pointLight position={[7, 3, -5]} intensity={40} distance={30} color={COL.greenHi} />
  </>
);

// ---------------------------------------------------------------- materials
export const useMats = () => useMemo(() => ({
  gold: new THREE.MeshStandardMaterial({ color: COL.gold, metalness: 1, roughness: 0.2, envMapIntensity: 1.35 }),
  goldSatin: new THREE.MeshStandardMaterial({ color: "#C99A45", metalness: 1, roughness: 0.42, envMapIntensity: 1.1 }),
  red: new THREE.MeshPhysicalMaterial({ color: COL.red, metalness: 0.05, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 0.55 }),
  green: new THREE.MeshPhysicalMaterial({ color: COL.green, metalness: 0.05, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 0.55 }),
  ivory: new THREE.MeshPhysicalMaterial({ color: COL.ivory, metalness: 0, roughness: 0.35, clearcoat: 0.6, envMapIntensity: 0.7 }),
  floor: new THREE.MeshStandardMaterial({ color: "#1C080C", metalness: 0.1, roughness: 0.72, envMapIntensity: 0.05 }),
}), []);

// ---------------------------------------------------------------- shapes
/** 8-point star {8/2} (two overlapping squares) as a closed contour. */
const starPts = (R: number, rot = 0) => {
  const pts: THREE.Vector2[] = [];
  const ri = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
  for (let k = 0; k < 16; k++) {
    const a = rot + Math.PI / 2 + (k * Math.PI) / 8;
    const r = k % 2 ? ri : R;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return pts;
};
const circlePts = (r: number, n = 64) => Array.from({ length: n }, (_, k) => new THREE.Vector2(Math.cos((k / n) * Math.PI * 2) * r, Math.sin((k / n) * Math.PI * 2) * r));

export const starGeo = (R: number, holeR: number, depth = 0.3, bevel = 0.06) => {
  const s = new THREE.Shape(starPts(R));
  if (holeR > 0) s.holes.push(new THREE.Path(circlePts(holeR).reverse()));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 5, curveSegments: 24 });
  g.center();
  return g;
};
export const starOutlineGeo = (R: number, w: number, depth = 0.2) => {
  const s = new THREE.Shape(starPts(R));
  s.holes.push(new THREE.Path(starPts(R - w).reverse()));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 });
  g.center();
  return g;
};
export const squareRingGeo = (half: number, w: number, depth = 0.28) => {
  const sq = (h: number) => [new THREE.Vector2(-h, -h), new THREE.Vector2(h, -h), new THREE.Vector2(h, h), new THREE.Vector2(-h, h)];
  const s = new THREE.Shape(sq(half));
  s.holes.push(new THREE.Path(sq(half - w).reverse()));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 5 });
  g.center();
  return g;
};

/** Omani pointed arch (window/door) contour, base at y=0. */
export const archShape = (w: number, h: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h * 0.6);
  s.quadraticCurveTo(-w / 2, h * 0.9, 0, h);
  s.quadraticCurveTo(w / 2, h * 0.9, w / 2, h * 0.6);
  s.lineTo(w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
};
export const archFrameGeo = (w: number, h: number, t: number, depth = 0.18) => {
  const s = archShape(w, h);
  const inner = archShape(w - 2 * t, h - 1.6 * t);
  const hole = new THREE.Path(inner.getPoints(24).map((p) => new THREE.Vector2(p.x, p.y + t * 0.6)).reverse());
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 4, curveSegments: 24 });
};
/** Flat arch panel whose UVs span 0..1 so a label texture maps onto it. */
export const archPanelGeo = (w: number, h: number) => {
  const g = new THREE.ShapeGeometry(archShape(w, h), 24);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / h);
  return g;
};

/** Fort silhouette: round tower, curtain wall with merlons, gate, square tower. */
export const fortGeo = () => {
  const s = new THREE.Shape();
  const merl = (x0: number, x1: number, y: number, n: number, mh = 0.22) => {
    const w = (x1 - x0) / (n * 2 - 1);
    for (let i = 0; i < n * 2 - 1; i++) {
      const xa = x0 + i * w, xb = xa + w;
      if (i % 2 === 0) { s.lineTo(xa, y + mh); s.lineTo(xb, y + mh); s.lineTo(xb, y); }
      else { s.lineTo(xb, y); }
    }
  };
  s.moveTo(-4.2, 0);
  s.lineTo(-4.2, 3.0); merl(-4.2, -2.4, 3.0, 4, 0.3); // round tower (front silhouette)
  s.lineTo(-2.4, 1.9); merl(-2.4, 1.6, 1.9, 7);        // curtain wall
  s.lineTo(1.6, 2.6); merl(1.6, 3.2, 2.6, 3, 0.26);    // square tower
  s.lineTo(3.2, 1.6); merl(3.2, 4.4, 1.6, 3);
  s.lineTo(4.4, 0); s.lineTo(-4.2, 0);
  const gate = archShape(0.9, 1.35).getPoints(20).map((p) => new THREE.Vector2(p.x - 0.4, p.y));
  s.holes.push(new THREE.Path(gate.reverse()));
  for (const [x, y] of [[-3.3, 2.1], [2.4, 1.7], [-1.6, 1.15], [0.8, 1.15]] as const) {
    s.holes.push(new THREE.Path(archShape(0.26, 0.5).getPoints(10).map((p) => new THREE.Vector2(p.x + x, p.y + y)).reverse()));
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 });
};

/** Omani incense burner (mabkhara) profile, lathed. */
export const mabkharaGeo = () => {
  const p = [
    [0, 0], [0.55, 0], [0.58, 0.06], [0.42, 0.14], [0.3, 0.5], [0.28, 0.62], [0.5, 0.7], [0.62, 0.86], [0.66, 1.05],
    [0.6, 1.1], [0.5, 1.1], [0, 1.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(p, 48);
};

// ---------------------------------------------------------------- textures
/** Soft round sprite for dust / smoke. */
export const useSoftDot = () => useMemo(() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}, []);

const goldFill = (g: CanvasRenderingContext2D, y0: number, y1: number) => {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, "#FFF4D2"); gr.addColorStop(0.35, "#F0CC7A"); gr.addColorStop(0.62, "#C2913E"); gr.addColorStop(1, "#F6DB98");
  return gr;
};

/** Arabic label rendered with the loaded web fonts onto a canvas. */
export const labelTexture = (opts: {
  w: number; h: number; lines: { text: string; font: string; y: number; color?: string }[]; bg?: string; border?: boolean; ornament?: boolean;
}) => {
  const c = document.createElement("canvas"); c.width = opts.w; c.height = opts.h;
  const g = c.getContext("2d")!;
  if (opts.bg) {
    const gr = g.createLinearGradient(0, 0, 0, opts.h);
    gr.addColorStop(0, opts.bg); gr.addColorStop(1, "#000000");
    g.fillStyle = opts.bg; g.fillRect(0, 0, opts.w, opts.h);
    g.globalAlpha = 0.45; g.fillStyle = gr; g.fillRect(0, 0, opts.w, opts.h); g.globalAlpha = 1;
  }
  if (opts.border) {
    g.strokeStyle = goldFill(g, 0, opts.h); g.lineWidth = 10; g.strokeRect(14, 14, opts.w - 28, opts.h - 28);
    g.lineWidth = 3; g.strokeRect(34, 34, opts.w - 68, opts.h - 68);
  }
  if (opts.ornament) {
    // small khatam above the word
    const cx = opts.w / 2, cy = opts.h * 0.3, R = opts.w * 0.11;
    g.strokeStyle = goldFill(g, cy - R, cy + R); g.lineWidth = 6;
    for (const rot of [0, Math.PI / 4]) {
      g.beginPath();
      for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
      g.closePath(); g.stroke();
    }
    g.beginPath(); g.arc(cx, cy, R * 0.32, 0, Math.PI * 2); g.fillStyle = goldFill(g, cy - R, cy + R); g.fill();
  }
  g.textAlign = "center"; g.textBaseline = "middle"; (g as any).direction = "rtl";
  for (const l of opts.lines) {
    g.font = l.font;
    g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = l.color ?? goldFill(g, l.y - 90, l.y + 90);
    g.fillText(l.text, opts.w / 2, l.y);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};

// ---------------------------------------------------------------- particles
/** Floating gold dust with depth (additive sprites), deterministic in time. */
export const Dust: React.FC<{ t: number; n?: number; spread?: [number, number, number]; center?: [number, number, number]; size?: number; color?: string; seed?: string; rise?: number; opacity?: number }> =
  ({ t, n = 260, spread = [22, 13, 16], center = [0, 0, -3], size = 0.07, color = "#FFD27A", seed = "dust", rise = 0.12, opacity = 0.9 }) => {
    const tex = useSoftDot();
    const { geo, base } = useMemo(() => {
      const base = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        base[i * 4] = (random(`${seed}x${i}`) - 0.5) * spread[0];
        base[i * 4 + 1] = (random(`${seed}y${i}`) - 0.5) * spread[1];
        base[i * 4 + 2] = (random(`${seed}z${i}`) - 0.5) * spread[2];
        base[i * 4 + 3] = random(`${seed}p${i}`) * 100;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      return { geo, base };
    }, [n, seed, spread[0], spread[1], spread[2]]);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      const ph = base[i * 4 + 3];
      let y = base[i * 4 + 1] + t * rise * (0.5 + (ph % 1));
      y = ((y + spread[1] / 2) % spread[1] + spread[1]) % spread[1] - spread[1] / 2;
      pos.setXYZ(i, center[0] + base[i * 4] + Math.sin(t * 0.3 + ph) * 0.25, center[1] + y, center[2] + base[i * 4 + 2] + Math.cos(t * 0.25 + ph) * 0.2);
    }
    pos.needsUpdate = true;
    return (
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial map={tex} size={size} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} color={color} opacity={opacity} />
      </points>
    );
  };

/** A flowing satin ribbon (rebuilt each frame from a sine path). */
export const Ribbon: React.FC<{ t: number; y: number; z: number; width: number; mat: THREE.Material; phase: number; amp?: number; len?: number; speed?: number; twist?: number }> =
  ({ t, y, z, width, mat, phase, amp = 0.7, len = 34, speed = 1, twist = 0.5 }) => {
    const N = 220;
    const geo = useMemo(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 1) * 2 * 3), 3));
      const idx: number[] = [];
      for (let i = 0; i < N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
      g.setIndex(idx);
      return g;
    }, []);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = (u - 0.5) * len;
      const w = phase + x * 0.28 + t * 1.3 * speed;
      const cy = y + Math.sin(w) * amp + Math.sin(w * 0.47 + 1.3) * amp * 0.5;
      const cz = z + Math.cos(w * 0.8) * 0.9;
      const ang = Math.sin(w * 0.6 + 0.7) * twist * Math.PI;
      const dy = Math.cos(ang) * width / 2, dz = Math.sin(ang) * width / 2;
      pos.setXYZ(i * 2, x, cy + dy, cz + dz);
      pos.setXYZ(i * 2 + 1, x, cy - dy, cz - dz);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return <mesh geometry={geo} material={mat} frustumCulled={false} />;
  };
