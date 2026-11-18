// فهرس الخطوط — كل الخطوط من Google Fonts برخصة OFL، محمّلة محليًا (مقتطعة للعربية واللاتينية الأساسية).

export type FontCategory =
  | 'naskh'
  | 'thuluth'
  | 'ruqaa'
  | 'diwani'
  | 'nastaliq'
  | 'kufi'
  | 'maghribi'
  | 'display'
  | 'modern';

export const CATEGORIES: { id: FontCategory; label: string; hint: string }[] = [
  { id: 'naskh', label: 'نسخ', hint: 'خط المصاحف والكتب، واضح ومتوازن' },
  { id: 'thuluth', label: 'ثلث وجليّ', hint: 'خطوط عريضة للعناوين واللوحات' },
  { id: 'ruqaa', label: 'رقعة', hint: 'سريع وأنيق، للعبارات والتهاني' },
  { id: 'diwani', label: 'ديواني', hint: 'متداخل ومنحني، للمراسيم والدعوات' },
  { id: 'nastaliq', label: 'نستعليق وفارسي', hint: 'مائل ورشيق، للشعر' },
  { id: 'kufi', label: 'كوفي', hint: 'هندسي بزوايا حادة، للشعارات' },
  { id: 'maghribi', label: 'مغربي وساحلي', hint: 'خطوط غرب إفريقيا والمغرب' },
  { id: 'display', label: 'زخرفي', hint: 'خطوط عرض مميزة' },
  { id: 'modern', label: 'حديث', hint: 'خطوط معاصرة للتصميم' },
];

export interface FontDef {
  id: string;
  name: string; // الاسم العربي
  latin: string;
  category: FontCategory;
  file: string; // ملف الوزن العادي
  bold?: string; // ملف الوزن العريض (للخطوط غير المتغيرة)
  variable?: { min: number; max: number; def: number }; // محور الوزن wght
}

export const FONTS: FontDef[] = [
  // نسخ
  { id: 'amiri', name: 'أميري', latin: 'Amiri', category: 'naskh', file: 'Amiri-Regular.ttf', bold: 'Amiri-Bold.ttf' },
  { id: 'amiri-quran', name: 'أميري قرآن', latin: 'Amiri Quran', category: 'naskh', file: 'AmiriQuran-Regular.ttf' },
  { id: 'scheherazade', name: 'شهرزاد', latin: 'Scheherazade New', category: 'naskh', file: 'ScheherazadeNew-Regular.ttf', bold: 'ScheherazadeNew-Bold.ttf' },
  { id: 'lateef', name: 'لطيف', latin: 'Lateef', category: 'naskh', file: 'Lateef-Regular.ttf', bold: 'Lateef-Bold.ttf' },
  { id: 'noto-naskh', name: 'نوتو نسخ', latin: 'Noto Naskh Arabic', category: 'naskh', file: 'NotoNaskhArabic-VF.ttf', variable: { min: 400, max: 700, def: 400 } },
  { id: 'markazi', name: 'مركزي', latin: 'Markazi Text', category: 'naskh', file: 'MarkaziText-VF.ttf', variable: { min: 400, max: 700, def: 400 } },
  { id: 'harmattan', name: 'هرمتان', latin: 'Harmattan', category: 'naskh', file: 'Harmattan-Regular.ttf', bold: 'Harmattan-Bold.ttf' },

  // ثلث وعرض
  { id: 'rakkas', name: 'ركاز', latin: 'Rakkas', category: 'thuluth', file: 'Rakkas-Regular.ttf' },
  { id: 'katibeh', name: 'كاتبة', latin: 'Katibeh', category: 'thuluth', file: 'Katibeh-Regular.ttf' },
  { id: 'jomhuria', name: 'جمهورية', latin: 'Jomhuria', category: 'thuluth', file: 'Jomhuria-Regular.ttf' },
  { id: 'lalezar', name: 'لاله‌زار', latin: 'Lalezar', category: 'thuluth', file: 'Lalezar-Regular.ttf' },

  // رقعة
  { id: 'aref-ruqaa', name: 'عارف رقعة', latin: 'Aref Ruqaa', category: 'ruqaa', file: 'ArefRuqaa-Regular.ttf', bold: 'ArefRuqaa-Bold.ttf' },

  // ديواني
  { id: 'ruwudu', name: 'رُوُدو', latin: 'Ruwudu', category: 'diwani', file: 'Ruwudu-Regular.ttf', bold: 'Ruwudu-Bold.ttf' },
  { id: 'vibes', name: 'فايبز', latin: 'Vibes', category: 'diwani', file: 'Vibes-Regular.ttf' },

  // نستعليق
  { id: 'noto-nastaliq', name: 'نوتو نستعليق', latin: 'Noto Nastaliq Urdu', category: 'nastaliq', file: 'NotoNastaliqUrdu-VF.ttf', variable: { min: 400, max: 700, def: 400 } },
  { id: 'gulzar', name: 'گلزار', latin: 'Gulzar', category: 'nastaliq', file: 'Gulzar-Regular.ttf' },
  { id: 'mirza', name: 'ميرزا', latin: 'Mirza', category: 'nastaliq', file: 'Mirza-Regular.ttf', bold: 'Mirza-Bold.ttf' },

  // كوفي
  { id: 'reem-kufi', name: 'ريم كوفي', latin: 'Reem Kufi', category: 'kufi', file: 'ReemKufi-VF.ttf', variable: { min: 400, max: 700, def: 400 } },
  { id: 'reem-kufi-fun', name: 'ريم كوفي مرح', latin: 'Reem Kufi Fun', category: 'kufi', file: 'ReemKufiFun-VF.ttf', variable: { min: 400, max: 700, def: 400 } },
  { id: 'noto-kufi', name: 'نوتو كوفي', latin: 'Noto Kufi Arabic', category: 'kufi', file: 'NotoKufiArabic-VF.ttf', variable: { min: 100, max: 900, def: 400 } },
  { id: 'qahiri', name: 'قاهري', latin: 'Qahiri', category: 'kufi', file: 'Qahiri-Regular.ttf' },
  { id: 'kufam', name: 'كوفام', latin: 'Kufam', category: 'kufi', file: 'Kufam-VF.ttf', variable: { min: 400, max: 900, def: 400 } },
  { id: 'el-messiri', name: 'المسيري', latin: 'El Messiri', category: 'kufi', file: 'ElMessiri-VF.ttf', variable: { min: 400, max: 700, def: 400 } },
  { id: 'handjet', name: 'هاندجت (فسيفساء)', latin: 'Handjet', category: 'kufi', file: 'Handjet-VF.ttf', variable: { min: 100, max: 900, def: 400 } },

  // مغربي
  { id: 'alkalami', name: 'القلمي', latin: 'Alkalami', category: 'maghribi', file: 'Alkalami-Regular.ttf' },

  // زخرفي
  { id: 'lemonada', name: 'ليمونادة', latin: 'Lemonada', category: 'display', file: 'Lemonada-VF.ttf', variable: { min: 300, max: 700, def: 500 } },
  { id: 'badeen', name: 'بديع', latin: 'Badeen Display', category: 'display', file: 'BadeenDisplay-Regular.ttf' },
  { id: 'blaka', name: 'بلاكا', latin: 'Blaka', category: 'display', file: 'Blaka-Regular.ttf' },
  { id: 'blaka-hollow', name: 'بلاكا مفرّغ', latin: 'Blaka Hollow', category: 'display', file: 'BlakaHollow-Regular.ttf' },
  { id: 'marhey', name: 'مرحي', latin: 'Marhey', category: 'display', file: 'Marhey-VF.ttf', variable: { min: 300, max: 700, def: 500 } },
  { id: 'baloo', name: 'بالو بهيجان', latin: 'Baloo Bhaijaan 2', category: 'display', file: 'BalooBhaijaan2-VF.ttf', variable: { min: 400, max: 800, def: 600 } },
  { id: 'playpen', name: 'بلايبن', latin: 'Playpen Sans Arabic', category: 'display', file: 'PlaypenSansArabic-VF.ttf', variable: { min: 100, max: 800, def: 500 } },

  // حديث
  { id: 'cairo', name: 'القاهرة', latin: 'Cairo', category: 'modern', file: 'Cairo-VF.ttf', variable: { min: 200, max: 1000, def: 600 } },
  { id: 'tajawal', name: 'تجوال', latin: 'Tajawal', category: 'modern', file: 'Tajawal-Regular.ttf', bold: 'Tajawal-Bold.ttf' },
  { id: 'almarai', name: 'المراعي', latin: 'Almarai', category: 'modern', file: 'Almarai-Regular.ttf', bold: 'Almarai-Bold.ttf' },
  { id: 'changa', name: 'شنغا', latin: 'Changa', category: 'modern', file: 'Changa-VF.ttf', variable: { min: 200, max: 800, def: 500 } },
  { id: 'mada', name: 'مدى', latin: 'Mada', category: 'modern', file: 'Mada-VF.ttf', variable: { min: 200, max: 900, def: 500 } },
  { id: 'readex', name: 'ريدكس', latin: 'Readex Pro', category: 'modern', file: 'ReadexPro-VF.ttf', variable: { min: 160, max: 700, def: 400 } },
  { id: 'plex', name: 'بلكس عربي', latin: 'IBM Plex Sans Arabic', category: 'modern', file: 'IBMPlexSansArabic-Regular.ttf', bold: 'IBMPlexSansArabic-Bold.ttf' },
  { id: 'alexandria', name: 'الإسكندرية', latin: 'Alexandria', category: 'modern', file: 'Alexandria-VF.ttf', variable: { min: 100, max: 900, def: 500 } },
  { id: 'vazirmatn', name: 'وزیرمتن', latin: 'Vazirmatn', category: 'modern', file: 'Vazirmatn-VF.ttf', variable: { min: 100, max: 900, def: 400 } },
  { id: 'zain', name: 'زين', latin: 'Zain', category: 'modern', file: 'Zain-Regular.ttf', bold: 'Zain-Bold.ttf' },
  { id: 'beiruti', name: 'بيروتي', latin: 'Beiruti', category: 'modern', file: 'Beiruti-VF.ttf', variable: { min: 200, max: 900, def: 500 } },
  { id: 'fustat', name: 'فسطاط', latin: 'Fustat', category: 'modern', file: 'Fustat-VF.ttf', variable: { min: 200, max: 800, def: 500 } },
  { id: 'noto-sans', name: 'نوتو سانس', latin: 'Noto Sans Arabic', category: 'modern', file: 'NotoSansArabic-VF.ttf', variable: { min: 100, max: 900, def: 400 } },
];

export const FONT_MAP: Record<string, FontDef> = Object.fromEntries(FONTS.map((f) => [f.id, f]));

export function getFont(id: string): FontDef {
  return FONT_MAP[id] ?? FONTS[0];
}

/** اسم عائلة CSS لمعاينة الخط في الواجهة (FontFace) */
export function cssFamily(id: string): string {
  return `midad-${id}`;
}

// أسماء الخصائص الطباعية (البدائل) بالعربية
export const FEATURE_LABELS: Record<string, string> = {
  salt: 'أشكال بديلة',
  swsh: 'تذييلات (سوَش)',
  jalt: 'بدائل الضبط',
  dlig: 'تراكيب اختيارية',
  aalt: 'كل البدائل',
  clig: 'تراكيب سياقية',
  hist: 'أشكال تاريخية',
  onum: 'أرقام قديمة',
  pnum: 'أرقام متناسبة',
  tnum: 'أرقام جدولية',
};

export function featureLabel(tag: string, fromFont?: string): string {
  if (fromFont) return fromFont;
  if (FEATURE_LABELS[tag]) return FEATURE_LABELS[tag];
  const ss = /^ss(\d\d)$/.exec(tag);
  if (ss) return `نمط بديل ${Number(ss[1]).toLocaleString('ar-EG')}`;
  const cv = /^cv(\d\d)$/.exec(tag);
  if (cv) return `شكل حرف ${Number(cv[1]).toLocaleString('ar-EG')}`;
  return tag;
}

/** الخصائص التي تهم الخطاط (نخفي الكسور والأرقام العلوية ونحوها) */
export function isUsefulFeature(tag: string): boolean {
  return /^(ss\d\d|cv\d\d|salt|swsh|jalt|dlig|clig|hist)$/.test(tag);
}
