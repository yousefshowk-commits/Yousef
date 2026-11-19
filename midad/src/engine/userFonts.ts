// الخطوط المستوردة من جهاز المستخدم: تُحفظ في IndexedDB داخل هذا المتصفح فقط ولا تُرفع لأي مكان.
import * as hb from 'harfbuzzjs';
import { addFontDef, removeFontDef, cssFamily, FONT_MAP, type FontDef } from '../data/fonts';
import { forgetFont, notifyFontsChanged, setUserFontBuffer } from './hb';
import { bumpLayoutVersion } from './layout';

interface Rec {
  id: string;
  name: string;
  latin: string;
  data: ArrayBuffer;
  variable?: { min: number; max: number; def: number };
  added: number;
}

const DB_NAME = 'midad-fonts';
const STORE = 'fonts';
const MAX_BYTES = 30 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((res, rej) => {
        const t = db.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }),
  );
}

const cssFaces = new Map<string, FontFace>();

function register(rec: Rec) {
  const file = `user:${rec.id}`;
  setUserFontBuffer(file, rec.data);
  addFontDef({ id: rec.id, name: rec.name, latin: rec.latin, category: 'mine', file, user: true, variable: rec.variable });
  try {
    const ff = new FontFace(cssFamily(rec.id), rec.data.slice(0));
    document.fonts.add(ff);
    cssFaces.set(rec.id, ff);
    void ff.load().catch(() => undefined);
  } catch {
    /* المعاينة اختيارية */
  }
}

/** تحميل الخطوط المحفوظة عند بدء البرنامج */
export async function loadUserFonts(): Promise<number> {
  try {
    const all = await tx<Rec[]>('readonly', (s) => s.getAll() as IDBRequest<Rec[]>);
    all.sort((a, b) => a.added - b.added).forEach(register);
    if (all.length) {
      bumpLayoutVersion();
      notifyFontsChanged();
    }
    return all.length;
  } catch {
    return 0; // تخزين المتصفح غير متاح (نافذة خاصة مثلًا)
  }
}

function sniff(buf: ArrayBuffer): 'sfnt' | 'woff' | 'woff2' | 'unknown' {
  const v = new DataView(buf);
  if (buf.byteLength < 12) return 'unknown';
  const tag = v.getUint32(0);
  if (tag === 0x00010000 || tag === 0x4f54544f /* OTTO */ || tag === 0x74727565 /* true */ || tag === 0x74746366 /* ttcf */) return 'sfnt';
  if (tag === 0x774f4646) return 'woff';
  if (tag === 0x774f4632) return 'woff2';
  return 'unknown';
}

/** استيراد ملف خط. يرمي خطأ برسالة عربية واضحة عند الرفض. يعيد الخط وتحذيرًا إن وُجد. */
export async function importFontFile(file: File): Promise<{ def: FontDef; warning?: string }> {
  if (file.size > MAX_BYTES) throw new Error(`«${file.name}» أكبر من 30 ميغابايت`);
  const data = await file.arrayBuffer();
  const kind = sniff(data);
  if (kind === 'woff' || kind === 'woff2') throw new Error(`«${file.name}» بصيغة WOFF المخصصة للمواقع — استخدم نسخة TTF أو OTF من الخط`);
  if (kind !== 'sfnt') throw new Error(`«${file.name}» ليس ملف خط صالحًا (TTF أو OTF)`);

  const face = new hb.Face(new hb.Blob(data.slice(0)));
  const uni = face.collectUnicodes();
  if (!uni.length) throw new Error(`تعذّرت قراءة «${file.name}»`);
  let arabic = 0;
  for (const u of uni) if (u >= 0x0621 && u <= 0x064a) arabic++;

  const pick = (id: number) => face.getName(id, 'ar') || face.getName(id, 'en') || '';
  const base = file.name.replace(/\.(ttf|otf|ttc)$/i, '');
  const family = pick(16) || pick(1) || base;
  const sub = pick(17) || pick(2);
  const latin = face.getName(16, 'en') || face.getName(1, 'en') || base;
  const name = sub && !/^(regular|normal|book)$/i.test(sub) ? `${family} ${sub}` : family;

  let variable: Rec['variable'];
  try {
    const w = face.getAxisInfos().wght;
    if (w) variable = { min: w.min, max: w.max, def: w.default };
  } catch {
    /* لا محاور */
  }

  // نفس الخط المستورد سابقًا يُستبدل ولا يتكرر
  const existing = Object.values(FONT_MAP).find((f) => f.user && f.latin === latin && f.name === name);
  const id = existing?.id ?? `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const rec: Rec = { id, name, latin, data, variable, added: Date.now() };
  if (existing) forgetFont(id, `user:${id}`);
  try {
    await tx('readwrite', (s) => s.put(rec));
  } catch {
    // يبقى الخط متاحًا في هذه الجلسة فقط
    register(rec);
    bumpLayoutVersion();
    notifyFontsChanged();
    return { def: FONT_MAP[id], warning: 'تعذّر حفظ الخط في المتصفح؛ سيبقى متاحًا حتى تغلق الصفحة' };
  }
  register(rec);
  bumpLayoutVersion();
  notifyFontsChanged();
  return {
    def: FONT_MAP[id],
    warning: arabic < 20 ? 'هذا الخط لا يحتوي على الحروف العربية — ستظهر الكتابة العربية بخط بديل أو فارغة' : undefined,
  };
}

export async function deleteUserFont(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    /* نكمل الحذف من الذاكرة */
  }
  const ff = cssFaces.get(id);
  if (ff) document.fonts.delete(ff);
  cssFaces.delete(id);
  forgetFont(id, `user:${id}`);
  removeFontDef(id);
  bumpLayoutVersion();
  notifyFontsChanged();
}
