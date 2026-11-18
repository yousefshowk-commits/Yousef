// نموذج المستند

export interface GradientStop {
  offset: number; // 0..1
  color: string;
}

export type Fill =
  | { type: 'solid'; color: string }
  | { type: 'linear'; stops: GradientStop[]; angle: number }
  | { type: 'radial'; stops: GradientStop[] }
  | { type: 'texture'; texture: TextureKind; color: string; color2: string; scale: number }
  | { type: 'none' };

export type TextureKind = 'marble' | 'foil' | 'wood' | 'grain';

export interface Stroke {
  enabled: boolean;
  color: string;
  width: number;
}

export interface Shadow {
  enabled: boolean;
  color: string;
  dx: number;
  dy: number;
  blur: number;
  opacity: number;
}

export interface Glow {
  enabled: boolean;
  color: string;
  blur: number;
  strength: number; // 1..4
}

export interface Extrude {
  enabled: boolean;
  color: string;
  depth: number;
  angle: number; // درجات
}

export type LayoutMode = 'line' | 'arc' | 'circle' | 'wave' | 'mirror' | 'reflect' | 'rosette';

export interface TextLayout {
  mode: LayoutMode;
  radius: number; // للقوس والدائرة
  arcSide: 'top' | 'bottom';
  rotateStart: number; // درجات — بداية الدائرة
  circleGap: number; // فراغ في الدائرة الكاملة 0..1
  waveAmp: number;
  waveLen: number;
  mirrorGap: number; // سالب = تداخل
  mirrorAxis: 'vertical' | 'horizontal';
  rosetteCount: number;
  rosetteRadius: number;
  reflectOpacity: number;
}

export interface GlyphOverride {
  dx: number;
  dy: number;
  rot: number;
  scale: number;
  color?: string;
  hidden?: boolean;
}

interface BaseObj {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blend: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
}

export interface TextObj extends BaseObj {
  type: 'text';
  text: string;
  fontId: string;
  weight: number; // 400 أو 700 أو قيمة محور متغير
  size: number;
  lineHeight: number; // نسبة من الحجم
  align: 'right' | 'center' | 'left' | 'kashida';
  wordSpacing: number; // بكسل إضافي للمسافة
  autoKashida: number; // عدد الكشائد التلقائية لكل سطر
  features: string[]; // خصائص عامة على كل النص
  clusterFeatures: Record<string, string[]>; // خصائص على حرف بعينه (مفتاح = رقم الحرف)
  overrides: Record<string, GlyphOverride>; // تعديل حرف بعينه (مفتاح = "رقم الحرف.رقم الشكل")
  fill: Fill;
  stroke: Stroke;
  stroke2: Stroke; // إطار خارجي ثانٍ
  shadow: Shadow;
  glow: Glow;
  extrude: Extrude;
  layout: TextLayout;
}

export type ShapeKind =
  | 'rect'
  | 'roundRect'
  | 'ellipse'
  | 'star'
  | 'rubElHizb'
  | 'shamsa'
  | 'medallion'
  | 'flower'
  | 'polygon'
  | 'arch'
  | 'cartouche'
  | 'lozenge'
  | 'crescent'
  | 'frame'
  | 'ornateFrame'
  | 'divider'
  | 'rhombus'
  | 'leaf'
  | 'lantern'
  | 'heart';

export interface ShapeObj extends BaseObj {
  type: 'shape';
  shape: ShapeKind;
  w: number;
  h: number;
  points: number; // للنجمة والمضلع والوردة
  inner: number; // نسبة نصف القطر الداخلي / سماكة الإطار
  fill: Fill;
  stroke: Stroke;
  shadow: Shadow;
}

export interface ImageObj extends BaseObj {
  type: 'image';
  src: string; // data URL
  w: number;
  h: number;
  grayscale: boolean;
}

export type Obj = TextObj | ShapeObj | ImageObj;

export type PaperKind = 'none' | 'parchment' | 'kraft' | 'aged' | 'linen' | 'marble' | 'ebru';
export type PatternKind = 'none' | 'star8' | 'hex' | 'diamond' | 'girih' | 'dots' | 'arabesque';

export interface Background {
  fill: Fill;
  paper: PaperKind;
  paperStrength: number; // 0..1
  pattern: PatternKind;
  patternColor: string;
  patternOpacity: number;
  patternScale: number;
  vignette: number; // 0..1
}

export interface Doc {
  version: 1;
  width: number;
  height: number;
  background: Background;
  objects: Obj[];
}
