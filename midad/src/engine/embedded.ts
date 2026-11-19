// نسخة الملف الواحد (تعمل دون خادم ولا إنترنت): الخطوط مضمّنة في الصفحة نفسها كـ base64.
declare global {
  interface Window {
    __MIDAD_FONTS?: Record<string, string>;
  }
}

const decoded = new Map<string, ArrayBuffer>();

export function isOfflineBuild(): boolean {
  return typeof window !== 'undefined' && !!window.__MIDAD_FONTS;
}

/** بيانات خط مضمّن (نسخة جديدة في كل مرة لأن HarfBuzz وFontFace قد ينقلانها) */
export function embeddedFont(file: string): ArrayBuffer | null {
  const src = window.__MIDAD_FONTS?.[file];
  if (!src) return null;
  let buf = decoded.get(file);
  if (!buf) {
    const bin = atob(src);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    buf = bytes.buffer;
    decoded.set(file, buf);
  }
  return buf.slice(0);
}

/** خط الواجهة: في الملف الواحد لا يمكن تحميله من CSS، فيُسجَّل من البيانات المضمّنة */
export function registerEmbeddedUiFont() {
  for (const [file, weight] of [
    ['IBMPlexSansArabic-Regular.ttf', '400'],
    ['IBMPlexSansArabic-Bold.ttf', '700'],
  ] as const) {
    const data = embeddedFont(file);
    if (!data) continue;
    try {
      const ff = new FontFace('midad-ui', data, { weight });
      document.fonts.add(ff);
      void ff.load().catch(() => undefined);
    } catch {
      /* خط بديل من النظام */
    }
  }
}
