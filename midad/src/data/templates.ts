// «أفكار» — تصاميم جاهزة يبدأ منها المستخدم ويعدّلها.
import type { Doc } from '../state/types';
import { makeDoc, makeShape, makeText } from '../state/factory';
import { GRADIENTS, TEXTURES } from './presets';

const g = (name: string) => GRADIENTS.find((x) => x.name === name)!.fill;
const tx = (name: string) => TEXTURES.find((x) => x.name === name)!.fill;

export interface Template {
  id: string;
  name: string;
  tag: string;
  build: () => Doc;
}

export const TEMPLATES: Template[] = [
  {
    id: 'basmala-gold',
    name: 'بسملة ذهبية',
    tag: 'لوحة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'radial', stops: [{ offset: 0, color: '#155e47' }, { offset: 1, color: '#04261c' }] },
          paper: 'none',
          paperStrength: 0.4,
          pattern: 'star8',
          patternColor: '#d4af37',
          patternOpacity: 0.12,
          patternScale: 1,
          vignette: 0.35,
        },
        objects: [
          makeShape({ name: 'إطار', shape: 'ornateFrame', x: 540, y: 540, w: 980, h: 980, inner: 0.6, fill: g('ذهب عتيق') }),
          makeShape({ name: 'شمسة', shape: 'shamsa', x: 540, y: 330, w: 150, h: 150, points: 16, fill: g('ذهبي') }),
          makeText({
            name: 'البسملة',
            text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
            fontId: 'amiri',
            weight: 700,
            size: 96,
            x: 540,
            y: 560,
            autoKashida: 2,
            fill: g('ذهبي'),
            shadow: { enabled: true, color: '#000000', dx: 4, dy: 6, blur: 6, opacity: 0.6 },
          }),
          makeShape({ name: 'فاصل', shape: 'divider', x: 540, y: 720, w: 520, h: 40, fill: g('ذهبي') }),
        ],
      }),
  },
  {
    id: 'mashallah-mirror',
    name: 'ما شاء الله — مرآة',
    tag: 'تركيب',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'solid', color: '#f1e3c3' },
          paper: 'parchment',
          paperStrength: 0.6,
          pattern: 'none',
          patternColor: '#7a1f1f',
          patternOpacity: 0.2,
          patternScale: 1,
          vignette: 0.25,
        },
        objects: [
          makeShape({ name: 'ميدالية', shape: 'medallion', x: 540, y: 540, w: 900, h: 900, points: 24, inner: 0.3, fill: { type: 'none' }, stroke: { enabled: true, color: '#7a1f1f', width: 5 } }),
          makeText({
            name: 'ما شاء الله',
            text: 'ما شاء الله',
            fontId: 'aref-ruqaa',
            weight: 700,
            size: 120,
            x: 540,
            y: 540,
            fill: { type: 'solid', color: '#7a1f1f' },
            layout: { mode: 'mirror', mirrorAxis: 'vertical', mirrorGap: 24 },
          }),
        ],
      }),
  },
  {
    id: 'tasbih-circle',
    name: 'دائرة التسبيح',
    tag: 'دائري',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'radial', stops: [{ offset: 0, color: '#1c2f57' }, { offset: 1, color: '#070d1d' }] },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'arabesque',
          patternColor: '#d4af37',
          patternOpacity: 0.08,
          patternScale: 1.4,
          vignette: 0.4,
        },
        objects: [
          makeShape({ name: 'دائرة', shape: 'ellipse', x: 540, y: 540, w: 560, h: 560, fill: { type: 'none' }, stroke: { enabled: true, color: '#d4af37', width: 3 } }),
          makeShape({ name: 'شمسة', shape: 'shamsa', x: 540, y: 540, w: 420, h: 420, points: 24, fill: g('ذهب عتيق'), opacity: 0.25 }),
          makeText({
            name: 'التسبيح',
            text: 'سبحان الله وبحمده ۞ سبحان الله العظيم ۞ ',
            fontId: 'amiri',
            weight: 700,
            size: 76,
            autoKashida: 10,
            x: 540,
            y: 540,
            fill: g('ذهبي'),
            layout: { mode: 'circle', circleGap: 0 },
          }),
          makeText({
            name: 'الله',
            text: 'الله',
            fontId: 'aref-ruqaa',
            weight: 700,
            size: 190,
            x: 540,
            y: 520,
            fill: g('ذهبي'),
            glow: { enabled: true, color: '#ffd76a', blur: 18, strength: 0.8 },
          }),
        ],
      }),
  },
  {
    id: 'muhammad-rosette',
    name: 'وردة كوفية',
    tag: 'زخرفة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'solid', color: '#0d3b2e' },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'girih',
          patternColor: '#e9cf86',
          patternOpacity: 0.1,
          patternScale: 0.8,
          vignette: 0.3,
        },
        objects: [
          makeShape({ name: 'خاتم', shape: 'rubElHizb', x: 540, y: 540, w: 230, h: 230, inner: 0.9, fill: g('ذهبي') }),
          makeText({
            name: 'وردة',
            text: 'محمد',
            fontId: 'reem-kufi',
            weight: 700,
            size: 96,
            x: 540,
            y: 540,
            fill: { type: 'solid', color: '#f3e6c4' },
            layout: { mode: 'rosette', rosetteCount: 6, rosetteRadius: 270 },
          }),
        ],
      }),
  },
  {
    id: 'eid',
    name: 'عيد مبارك',
    tag: 'تهنئة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'radial', stops: [{ offset: 0, color: '#3b1f5c' }, { offset: 1, color: '#0c0718' }] },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'dots',
          patternColor: '#f6e27a',
          patternOpacity: 0.18,
          patternScale: 0.6,
          vignette: 0.4,
        },
        objects: [
          makeShape({ name: 'هلال', shape: 'crescent', x: 760, y: 250, w: 230, h: 230, inner: 0.35, rotation: -20, fill: g('ذهبي'), shadow: { enabled: true, color: '#ffd76a', dx: 0, dy: 0, blur: 20, opacity: 0.6 } }),
          makeShape({ name: 'فانوس', shape: 'lantern', x: 250, y: 260, w: 120, h: 230, fill: g('ذهبي') }),
          makeText({
            name: 'عيد مبارك',
            text: 'عيد مبارك',
            fontId: 'aref-ruqaa',
            weight: 700,
            size: 230,
            x: 540,
            y: 610,
            fill: tx('رقائق ذهب'),
            glow: { enabled: true, color: '#ffcf5a', blur: 16, strength: 0.9 },
          }),
          makeText({
            name: 'تقبل الله',
            text: 'تقبّل الله منا ومنكم',
            fontId: 'el-messiri',
            weight: 500,
            size: 52,
            x: 540,
            y: 830,
            fill: { type: 'solid', color: '#f3e6c4' },
          }),
        ],
      }),
  },
  {
    id: 'wedding',
    name: 'دعوة زفاف',
    tag: 'دعوة',
    build: () =>
      makeDoc({
        width: 1500,
        height: 2100,
        background: {
          fill: { type: 'solid', color: '#f7f0e1' },
          paper: 'linen',
          paperStrength: 0.5,
          pattern: 'none',
          patternColor: '#b08d57',
          patternOpacity: 0.2,
          patternScale: 1,
          vignette: 0.1,
        },
        objects: [
          makeShape({ name: 'محراب', shape: 'arch', x: 750, y: 1080, w: 1240, h: 1820, inner: 0.12, fill: g('ذهب عتيق') }),
          makeText({ name: 'دعاء', text: 'بارك الله لكما وبارك عليكما\nوجمع بينكما في خير', fontId: 'ruwudu', weight: 400, size: 70, lineHeight: 1.9, x: 750, y: 660, fill: { type: 'solid', color: '#6b4d1e' } }),
          makeText({ name: 'العريس', text: 'محمد', fontId: 'ruwudu', weight: 700, size: 230, x: 750, y: 1010, fill: g('ذهب عتيق') }),
          makeText({ name: 'و', text: '&', fontId: 'markazi', weight: 400, size: 110, x: 750, y: 1200, fill: { type: 'solid', color: '#a98b55' } }),
          makeText({ name: 'العروس', text: 'فاطمة', fontId: 'ruwudu', weight: 700, size: 230, x: 750, y: 1390, fill: g('ذهب عتيق') }),
          makeShape({ name: 'فاصل', shape: 'divider', x: 750, y: 1580, w: 640, h: 44, fill: g('ذهب عتيق') }),
          makeText({ name: 'الموعد', text: 'الخميس ١٥ شعبان ١٤٤٨ هـ\nقاعة الياسمين — الساعة الثامنة مساءً', fontId: 'markazi', weight: 500, size: 50, lineHeight: 1.7, x: 750, y: 1740, fill: { type: 'solid', color: '#5d4520' } }),
        ],
      }),
  },
  {
    id: 'kufi-3d',
    name: 'شعار ثلاثي الأبعاد',
    tag: 'شعار',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#1f1a14' }, { offset: 1, color: '#0b0907' }] },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'hex',
          patternColor: '#d4af37',
          patternOpacity: 0.07,
          patternScale: 0.7,
          vignette: 0.45,
        },
        objects: [
          makeText({
            name: 'نور',
            text: 'نُور',
            fontId: 'reem-kufi',
            weight: 700,
            size: 360,
            x: 540,
            y: 500,
            fill: g('ذهبي'),
            stroke: { enabled: true, color: '#fff3c4', width: 2 },
            extrude: { enabled: true, color: '#4a3208', depth: 34, angle: 60 },
            shadow: { enabled: true, color: '#000000', dx: 18, dy: 30, blur: 22, opacity: 0.6 },
          }),
          makeText({ name: 'وصف', text: 'استوديو للتصميم', fontId: 'cairo', weight: 300, size: 54, x: 540, y: 820, fill: { type: 'solid', color: '#d3c9b8' } }),
        ],
      }),
  },
  {
    id: 'poetry',
    name: 'بيت شعر',
    tag: 'شعر',
    build: () =>
      makeDoc({
        width: 1920,
        height: 1080,
        background: {
          fill: { type: 'solid', color: '#e6cf9f' },
          paper: 'aged',
          paperStrength: 0.75,
          pattern: 'none',
          patternColor: '#5c3a1e',
          patternOpacity: 0.2,
          patternScale: 1,
          vignette: 0.45,
        },
        objects: [
          makeShape({ name: 'إطار', shape: 'frame', x: 960, y: 540, w: 1800, h: 960, inner: 0.02, fill: { type: 'solid', color: '#5c3a1e' } }),
          makeText({
            name: 'البيت',
            text: 'على قدر أهل العزم تأتي العزائم\nوتأتي على قدر الكرام المكارم',
            fontId: 'noto-nastaliq',
            weight: 500,
            size: 96,
            lineHeight: 2.3,
            align: 'kashida',
            x: 960,
            y: 520,
            fill: { type: 'solid', color: '#3b2a1a' },
          }),
          makeText({ name: 'الشاعر', text: '— المتنبي', fontId: 'amiri', weight: 400, size: 50, x: 960, y: 900, fill: { type: 'solid', color: '#5c3a1e' } }),
        ],
      }),
  },
  {
    id: 'seal',
    name: 'ختم دائري',
    tag: 'ختم',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'solid', color: '#f5efe2' },
          paper: 'parchment',
          paperStrength: 0.45,
          pattern: 'none',
          patternColor: '#a3121f',
          patternOpacity: 0.2,
          patternScale: 1,
          vignette: 0.1,
        },
        objects: [
          makeShape({ name: 'دائرة خارجية', shape: 'ellipse', x: 540, y: 540, w: 760, h: 760, fill: { type: 'none' }, stroke: { enabled: true, color: '#a3121f', width: 12 }, blend: 'multiply' }),
          makeShape({ name: 'دائرة داخلية', shape: 'ellipse', x: 540, y: 540, w: 520, h: 520, fill: { type: 'none' }, stroke: { enabled: true, color: '#a3121f', width: 6 }, blend: 'multiply' }),
          makeText({ name: 'نص علوي', text: 'مكتبة الخط العربي', fontId: 'amiri', weight: 700, size: 70, x: 540, y: 400, fill: { type: 'solid', color: '#a3121f' }, blend: 'multiply', layout: { mode: 'arc', radius: 290, arcSide: 'top' } }),
          makeText({ name: 'نص سفلي', text: 'تأسست ١٤٤٦ هـ', fontId: 'amiri', weight: 700, size: 60, x: 540, y: 700, fill: { type: 'solid', color: '#a3121f' }, blend: 'multiply', layout: { mode: 'arc', radius: 270, arcSide: 'bottom' } }),
          makeShape({ name: 'نجمة', shape: 'rubElHizb', x: 540, y: 455, w: 70, h: 70, inner: 1, fill: { type: 'solid', color: '#a3121f' }, blend: 'multiply' }),
          makeText({ name: 'الاسم', text: 'مِداد', fontId: 'aref-ruqaa', weight: 700, size: 170, x: 540, y: 575, fill: { type: 'solid', color: '#a3121f' }, blend: 'multiply' }),
        ],
      }),
  },
  {
    id: 'ramadan-wave',
    name: 'رمضان — موجة',
    tag: 'تهنئة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#fbe3d0' }, { offset: 1, color: '#f6c5a5' }] },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'diamond',
          patternColor: '#c0392b',
          patternOpacity: 0.07,
          patternScale: 0.6,
          vignette: 0,
        },
        objects: [
          makeShape({ name: 'فانوس', shape: 'lantern', x: 540, y: 260, w: 150, h: 280, fill: g('غروب') }),
          makeText({
            name: 'رمضان كريم',
            text: 'رمضان كريم',
            fontId: 'lemonada',
            weight: 700,
            size: 118,
            x: 540,
            y: 600,
            fill: g('غروب'),
            stroke2: { enabled: true, color: '#ffffff', width: 10 },
            shadow: { enabled: true, color: '#7a1f1f', dx: 0, dy: 10, blur: 14, opacity: 0.35 },
            layout: { mode: 'wave', waveAmp: 40, waveLen: 520 },
          }),
          makeText({ name: 'تحية', text: 'أعاده الله علينا وعليكم بالخير', fontId: 'tajawal', weight: 700, size: 48, x: 540, y: 850, fill: { type: 'solid', color: '#7a1f1f' } }),
        ],
      }),
  },
  {
    id: 'reflect',
    name: 'انعكاس فضي',
    tag: 'مؤثر',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#20242a' }, { offset: 1, color: '#050607' }] },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'none',
          patternColor: '#ffffff',
          patternOpacity: 0.1,
          patternScale: 1,
          vignette: 0.3,
        },
        objects: [
          makeText({
            name: 'الحمد لله',
            text: 'الحمد لله',
            fontId: 'rakkas',
            weight: 400,
            size: 220,
            x: 540,
            y: 600,
            fill: g('فضي'),
            layout: { mode: 'reflect', mirrorGap: 10, reflectOpacity: 0.4 },
          }),
        ],
      }),
  },
  {
    id: 'thuluth-outline',
    name: 'لوحة بإطار مزدوج',
    tag: 'لوحة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'solid', color: '#f5f5f2' },
          paper: 'marble',
          paperStrength: 0.45,
          pattern: 'none',
          patternColor: '#000000',
          patternOpacity: 0.1,
          patternScale: 1,
          vignette: 0.15,
        },
        objects: [
          makeShape({ name: 'خرطوشة', shape: 'cartouche', x: 540, y: 540, w: 960, h: 520, fill: { type: 'solid', color: '#0e2a47' }, stroke: { enabled: true, color: '#d4af37', width: 8 } }),
          makeText({
            name: 'الآية',
            text: 'وقل رب زدني علمًا',
            fontId: 'rakkas',
            weight: 400,
            size: 150,
            x: 540,
            y: 540,
            fill: { type: 'solid', color: '#ffffff' },
            stroke: { enabled: true, color: '#0e2a47', width: 4 },
            stroke2: { enabled: true, color: '#d4af37', width: 5 },
          }),
        ],
      }),
  },
  {
    id: 'jumuah',
    name: 'جمعة مباركة — إبرو',
    tag: 'تهنئة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'solid', color: '#f3ead7' },
          paper: 'ebru',
          paperStrength: 0.55,
          pattern: 'none',
          patternColor: '#000000',
          patternOpacity: 0.1,
          patternScale: 1,
          vignette: 0.2,
        },
        objects: [
          makeShape({ name: 'لوزة', shape: 'lozenge', x: 540, y: 540, w: 980, h: 440, fill: { type: 'solid', color: '#fffaf0' }, stroke: { enabled: true, color: '#1f618d', width: 6 }, shadow: { enabled: true, color: '#000000', dx: 0, dy: 10, blur: 18, opacity: 0.3 } }),
          makeText({ name: 'جمعة مباركة', text: 'جمعة مباركة', fontId: 'ruwudu', weight: 700, size: 140, x: 540, y: 540, autoKashida: 2, fill: { type: 'solid', color: '#154360' } }),
        ],
      }),
  },
  {
    id: 'graduation',
    name: 'مبارك التخرج',
    tag: 'تهنئة',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#0e1f3d' }, { offset: 1, color: '#1f618d' }] },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'star8',
          patternColor: '#ffffff',
          patternOpacity: 0.06,
          patternScale: 1.2,
          vignette: 0.2,
        },
        objects: [
          makeShape({ name: 'نجمة', shape: 'star', x: 540, y: 300, w: 200, h: 200, points: 5, inner: 0.45, fill: g('ذهبي') }),
          makeText({ name: 'مبارك', text: 'مبارك التخرج', fontId: 'marhey', weight: 700, size: 140, x: 540, y: 560, fill: { type: 'solid', color: '#ffffff' }, stroke2: { enabled: true, color: '#d29b2e', width: 8 } }),
          makeText({ name: 'الاسم', text: 'اكتب الاسم هنا', fontId: 'aref-ruqaa', weight: 700, size: 90, x: 540, y: 770, fill: g('ذهبي') }),
        ],
      }),
  },
  {
    id: 'nastaliq-poem',
    name: 'شعر نستعليق',
    tag: 'شعر',
    build: () =>
      makeDoc({
        width: 1080,
        height: 1350,
        background: {
          fill: { type: 'solid', color: '#efe9dc' },
          paper: 'linen',
          paperStrength: 0.6,
          pattern: 'none',
          patternColor: '#000000',
          patternOpacity: 0.1,
          patternScale: 1,
          vignette: 0.2,
        },
        objects: [
          makeShape({ name: 'ورقة', shape: 'leaf', x: 900, y: 1150, w: 120, h: 230, rotation: 30, fill: { type: 'solid', color: '#117a65' }, opacity: 0.8 }),
          makeText({
            name: 'شعر',
            text: 'أنا البحر في أحشائه الدر كامن\nفهل ساءلوا الغواص عن صدفاتي',
            fontId: 'gulzar',
            weight: 400,
            size: 78,
            lineHeight: 2.4,
            align: 'kashida',
            x: 540,
            y: 620,
            rotation: -8,
            fill: { type: 'solid', color: '#0b5345' },
          }),
          makeText({ name: 'الشاعر', text: 'حافظ إبراهيم', fontId: 'amiri', weight: 400, size: 44, x: 540, y: 960, fill: { type: 'solid', color: '#5d554a' } }),
        ],
      }),
  },
  {
    id: 'blank-dark',
    name: 'صفحة داكنة',
    tag: 'فارغ',
    build: () =>
      makeDoc({
        background: {
          fill: { type: 'solid', color: '#151210' },
          paper: 'none',
          paperStrength: 0.3,
          pattern: 'none',
          patternColor: '#d4af37',
          patternOpacity: 0.1,
          patternScale: 1,
          vignette: 0.3,
        },
        objects: [makeText({ text: 'اكتب هنا', fontId: 'aref-ruqaa', weight: 700, size: 160, fill: g('ذهبي') })],
      }),
  },
];
