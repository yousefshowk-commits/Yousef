import type { Background, Doc, ImageObj, ShapeObj, TextObj, TextLayout } from './types';

let counter = 0;
export function newId(): string {
  counter++;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export const DEFAULT_LAYOUT: TextLayout = {
  mode: 'line',
  radius: 360,
  arcSide: 'top',
  rotateStart: 0,
  circleGap: 0.08,
  waveAmp: 30,
  waveLen: 400,
  mirrorGap: 0,
  mirrorAxis: 'vertical',
  rosetteCount: 8,
  rosetteRadius: 160,
  reflectOpacity: 0.35,
};

type DeepPartialText = Partial<Omit<TextObj, 'layout'>> & { layout?: Partial<TextLayout> };

export function makeText(p: DeepPartialText = {}): TextObj {
  const { layout, ...rest } = p;
  return {
    id: newId(),
    type: 'text',
    name: 'نص',
    x: 540,
    y: 540,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blend: 'normal',
    text: 'بسم الله الرحمن الرحيم',
    fontId: 'amiri',
    weight: 400,
    size: 120,
    lineHeight: 1.6,
    align: 'center',
    wordSpacing: 0,
    autoKashida: 0,
    features: [],
    clusterFeatures: {},
    overrides: {},
    fill: { type: 'solid', color: '#1a1410' },
    stroke: { enabled: false, color: '#ffffff', width: 4 },
    stroke2: { enabled: false, color: '#000000', width: 4 },
    shadow: { enabled: false, color: '#000000', dx: 6, dy: 8, blur: 8, opacity: 0.45 },
    glow: { enabled: false, color: '#ffd76a', blur: 14, strength: 1.5 },
    extrude: { enabled: false, color: '#5a3d0c', depth: 16, angle: 55 },
    ...rest,
    layout: { ...DEFAULT_LAYOUT, ...(layout ?? {}) },
  };
}

export function makeShape(p: Partial<ShapeObj> = {}): ShapeObj {
  return {
    id: newId(),
    type: 'shape',
    name: 'شكل',
    x: 540,
    y: 540,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blend: 'normal',
    shape: 'ellipse',
    w: 400,
    h: 400,
    points: 8,
    inner: 0.5,
    fill: { type: 'solid', color: '#c9a227' },
    stroke: { enabled: false, color: '#5a3d0c', width: 4 },
    shadow: { enabled: false, color: '#000000', dx: 6, dy: 8, blur: 10, opacity: 0.4 },
    ...p,
  };
}

export function makeImage(p: Partial<ImageObj> & { src: string; w: number; h: number }): ImageObj {
  return {
    id: newId(),
    type: 'image',
    name: 'صورة',
    x: 540,
    y: 540,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blend: 'normal',
    grayscale: false,
    ...p,
  };
}

export const DEFAULT_BG: Background = {
  fill: { type: 'solid', color: '#f7f0e1' },
  paper: 'parchment',
  paperStrength: 0.4,
  pattern: 'none',
  patternColor: '#b08d57',
  patternOpacity: 0.25,
  patternScale: 1,
  vignette: 0.15,
};

export function makeDoc(p: Partial<Doc> = {}): Doc {
  return {
    version: 1,
    width: 1080,
    height: 1080,
    background: { ...DEFAULT_BG, ...(p.background ?? {}) },
    objects: [],
    ...p,
  } as Doc;
}

/** نسخة عميقة بمعرّف جديد */
export function cloneObj<T extends { id: string }>(o: T): T {
  return { ...(JSON.parse(JSON.stringify(o)) as T), id: newId() };
}
