import type { Fill, PaperKind, PatternKind } from '../state/types';

export const SWATCHES = [
  '#111111', '#3b2a1a', '#5c3a1e', '#7a1f1f', '#a3121f', '#c0392b', '#d35400', '#e67e22',
  '#c9a227', '#d4af37', '#f1c40f', '#f5e6c4', '#fffaf0', '#ffffff', '#1e8449', '#0b5345',
  '#117a65', '#16a085', '#1f618d', '#154360', '#0e2a47', '#2c3e50', '#6c3483', '#4a235a',
];

export const GRADIENTS: { name: string; fill: Fill }[] = [
  {
    name: 'ذهبي',
    fill: {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#8a6a1f' },
        { offset: 0.25, color: '#f6e27a' },
        { offset: 0.5, color: '#c9982c' },
        { offset: 0.75, color: '#f9e7a1' },
        { offset: 1, color: '#9c7a2b' },
      ],
    },
  },
  {
    name: 'ذهب عتيق',
    fill: {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#5e4410' },
        { offset: 0.45, color: '#c8a24a' },
        { offset: 0.6, color: '#e9cf86' },
        { offset: 1, color: '#6d5014' },
      ],
    },
  },
  {
    name: 'فضي',
    fill: {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#6b6e73' },
        { offset: 0.3, color: '#f4f6f8' },
        { offset: 0.55, color: '#9ea3a8' },
        { offset: 0.8, color: '#eef1f3' },
        { offset: 1, color: '#70757a' },
      ],
    },
  },
  {
    name: 'نحاسي',
    fill: {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#6e2f12' },
        { offset: 0.35, color: '#e59866' },
        { offset: 0.6, color: '#b5562a' },
        { offset: 1, color: '#f0b27a' },
      ],
    },
  },
  {
    name: 'وردي ذهبي',
    fill: {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#9c5b5b' },
        { offset: 0.4, color: '#f5c6b8' },
        { offset: 0.7, color: '#c98b7f' },
        { offset: 1, color: '#f8dcd2' },
      ],
    },
  },
  {
    name: 'زمردي',
    fill: {
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#0b3d2e' },
        { offset: 0.5, color: '#27ae60' },
        { offset: 1, color: '#0e6655' },
      ],
    },
  },
  {
    name: 'ليل',
    fill: {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#0f2027' },
        { offset: 0.5, color: '#203a43' },
        { offset: 1, color: '#2c5364' },
      ],
    },
  },
  {
    name: 'غروب',
    fill: {
      type: 'linear',
      angle: 0,
      stops: [
        { offset: 0, color: '#ff512f' },
        { offset: 0.5, color: '#f09819' },
        { offset: 1, color: '#dd2476' },
      ],
    },
  },
  {
    name: 'قوس قزح',
    fill: {
      type: 'linear',
      angle: 0,
      stops: [
        { offset: 0, color: '#e74c3c' },
        { offset: 0.2, color: '#f39c12' },
        { offset: 0.4, color: '#f1c40f' },
        { offset: 0.6, color: '#2ecc71' },
        { offset: 0.8, color: '#3498db' },
        { offset: 1, color: '#9b59b6' },
      ],
    },
  },
  {
    name: 'لازوردي',
    fill: {
      type: 'radial',
      stops: [
        { offset: 0, color: '#5dade2' },
        { offset: 1, color: '#1a237e' },
      ],
    },
  },
];

export const TEXTURES: { name: string; fill: Fill }[] = [
  { name: 'رخام', fill: { type: 'texture', texture: 'marble', color: '#f4f1ea', color2: '#6b6b6b', scale: 1 } },
  { name: 'رقائق ذهب', fill: { type: 'texture', texture: 'foil', color: '#8a6417', color2: '#ffe9a0', scale: 1 } },
  { name: 'خشب', fill: { type: 'texture', texture: 'wood', color: '#5d3a1a', color2: '#b07a43', scale: 1 } },
  { name: 'حبيبات', fill: { type: 'texture', texture: 'grain', color: '#1b1b1b', color2: '#5a5a5a', scale: 1 } },
];

export const PAPERS: { id: PaperKind; label: string; base: string }[] = [
  { id: 'none', label: 'بدون', base: '#ffffff' },
  { id: 'parchment', label: 'رَق', base: '#f1e3c3' },
  { id: 'aged', label: 'ورق قديم', base: '#e6cf9f' },
  { id: 'kraft', label: 'كرافت', base: '#c49a6c' },
  { id: 'linen', label: 'كتّان', base: '#efe9dc' },
  { id: 'marble', label: 'رخام', base: '#f5f5f2' },
  { id: 'ebru', label: 'إبرو', base: '#f3ead7' },
];

export const PATTERNS: { id: PatternKind; label: string }[] = [
  { id: 'none', label: 'بدون' },
  { id: 'star8', label: 'نجمي ثماني' },
  { id: 'girih', label: 'مثمّن ومربع' },
  { id: 'arabesque', label: 'دوائر متداخلة' },
  { id: 'hex', label: 'سداسي' },
  { id: 'diamond', label: 'معيّنات' },
  { id: 'dots', label: 'نقاط' },
];

export const BG_PRESETS: { name: string; fill: Fill }[] = [
  { name: 'أبيض', fill: { type: 'solid', color: '#ffffff' } },
  { name: 'عاجي', fill: { type: 'solid', color: '#f7f0e1' } },
  { name: 'أسود', fill: { type: 'solid', color: '#111111' } },
  { name: 'أخضر داكن', fill: { type: 'solid', color: '#0d3b2e' } },
  { name: 'كحلي', fill: { type: 'solid', color: '#0e1f3d' } },
  { name: 'عنابي', fill: { type: 'solid', color: '#4a0f17' } },
  {
    name: 'ليل',
    fill: { type: 'radial', stops: [{ offset: 0, color: '#23395b' }, { offset: 1, color: '#0a0f1f' }] },
  },
  {
    name: 'زمرد',
    fill: { type: 'radial', stops: [{ offset: 0, color: '#1d6b52' }, { offset: 1, color: '#062a20' }] },
  },
  {
    name: 'رمل',
    fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#f6e7c8' }, { offset: 1, color: '#d9b77e' }] },
  },
  {
    name: 'فجر',
    fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#fbe3d0' }, { offset: 1, color: '#c0a3d6' }] },
  },
];

export const CANVAS_PRESETS: { name: string; w: number; h: number }[] = [
  { name: 'مربع (إنستغرام)', w: 1080, h: 1080 },
  { name: 'قصة / ستوري', w: 1080, h: 1920 },
  { name: 'أفقي HD', w: 1920, h: 1080 },
  { name: 'A4 عمودي', w: 2480, h: 3508 },
  { name: 'A4 أفقي', w: 3508, h: 2480 },
  { name: 'لوحة 50×70', w: 2500, h: 3500 },
  { name: 'بطاقة دعوة', w: 1500, h: 2100 },
  { name: 'غلاف تويتر/إكس', w: 1500, h: 500 },
];
