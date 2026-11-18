// الكشيدة (التطويل): مواضعها الصحيحة وإدراجها.

export const TATWEEL = 'ـ';

export function isMark(ch: number): boolean {
  return (
    (ch >= 0x0610 && ch <= 0x061a) ||
    (ch >= 0x064b && ch <= 0x065f) ||
    ch === 0x0670 ||
    (ch >= 0x06d6 && ch <= 0x06dc) ||
    (ch >= 0x06df && ch <= 0x06e8) ||
    (ch >= 0x06ea && ch <= 0x06ed) ||
    (ch >= 0x08d3 && ch <= 0x08ff)
  );
}

// حروف تتصل بما بعدها (ثنائية الاتصال) — ومنها الكشيدة نفسها
const DUAL = new Set(
  'بتثجحخسشصضطظعغفقكلمنهيئىـپچڤگکیٹڈ'.split('').map((c) => c.charCodeAt(0)),
);
// حروف عربية تتصل بما قبلها
function isJoiningLetter(ch: number): boolean {
  return (ch >= 0x0620 && ch <= 0x064a) || ch === 0x0640 || (ch >= 0x0671 && ch <= 0x06d3) || ch === 0x06d5;
}

/** مواضع الإدراج المسموحة: رقم الحرف الذي تُدرج الكشيدة قبله، مع أولوية */
export function kashidaSlots(text: string): { at: number; prio: number; word: number }[] {
  const slots: { at: number; prio: number; word: number }[] = [];
  let word = 0;
  let wordSlots: { at: number; prio: number; word: number }[] = [];
  const flush = () => {
    if (wordSlots.length) {
      // الأولوية: آخر اتصال في الكلمة (قبل الحرف الأخير) ثم الأول ثم الباقي
      wordSlots[wordSlots.length - 1].prio = 0;
      if (wordSlots.length > 1) wordSlots[0].prio = 1;
      slots.push(...wordSlots);
      wordSlots = [];
    }
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 0x20 || ch === 0x0a) {
      flush();
      word++;
      continue;
    }
    if (!DUAL.has(ch)) continue;
    // تخطَّ الحركات بعد الحرف
    let j = i + 1;
    while (j < text.length && isMark(text.charCodeAt(j))) j++;
    if (j < text.length && isJoiningLetter(text.charCodeAt(j))) {
      // لا كشيدة في «لا» (لام ألف) ولا بعد كشيدة مباشرة يدويًا يكفي
      const next = text[j];
      if (text[i] === 'ل' && 'اأإآ'.includes(next)) continue;
      wordSlots.push({ at: j, prio: 2, word });
    }
  }
  flush();
  return slots;
}

/**
 * يُدرج n كشيدة موزّعة على المواضع حسب الأولوية.
 * يعيد النص الجديد وخريطة: لكل حرف في النص الجديد رقمه في النص الأصلي (الكشيدة المضافة تأخذ رقم ما قبلها).
 */
export function applyAutoKashida(text: string, n: number): { text: string; map: number[] } {
  const identity = () => Array.from({ length: text.length }, (_, i) => i);
  if (n <= 0) return { text, map: identity() };
  const slots = kashidaSlots(text);
  if (!slots.length) return { text, map: identity() };
  // ترتيب: حسب الأولوية ثم توزيع بالتناوب على الكلمات
  const ordered = [...slots].sort((a, b) => a.prio - b.prio || a.word - b.word);
  const counts = new Map<number, number>();
  for (let k = 0; k < n; k++) {
    const s = ordered[k % ordered.length];
    counts.set(s.at, (counts.get(s.at) ?? 0) + 1);
  }
  let out = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = counts.get(i);
    if (c) {
      for (let k = 0; k < c; k++) {
        out += TATWEEL;
        map.push(Math.max(0, i - 1));
      }
    }
    out += text[i];
    map.push(i);
  }
  return { text: out, map };
}

/** موضع إدراج كشيدة يدوية بعد حرف معيّن (بعد حركاته) — أو -1 إن لم يكن الحرف متصلًا بما بعده */
export function manualKashidaPos(text: string, charIndex: number): number {
  const ch = text.charCodeAt(charIndex);
  if (!DUAL.has(ch)) return -1;
  let j = charIndex + 1;
  while (j < text.length && isMark(text.charCodeAt(j))) j++;
  if (j >= text.length || !isJoiningLetter(text.charCodeAt(j))) return -1;
  return j;
}

/**
 * عند تعديل النص: إعادة ترقيم المفاتيح المرتبطة بأرقام الحروف (البادئة المشتركة ثابتة، واللاحقة تُزاح).
 */
export function remapIndexKeys<T>(
  oldText: string,
  newText: string,
  rec: Record<string, T>,
): Record<string, T> {
  if (oldText === newText) return rec;
  let p = 0;
  while (p < oldText.length && p < newText.length && oldText[p] === newText[p]) p++;
  let s = 0;
  while (
    s < oldText.length - p &&
    s < newText.length - p &&
    oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]
  )
    s++;
  const delta = newText.length - oldText.length;
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec)) {
    const [idxStr, sub] = k.split('.');
    const idx = Number(idxStr);
    let ni: number;
    if (idx < p) ni = idx;
    else if (idx >= oldText.length - s) ni = idx + delta;
    else continue; // الجزء المحذوف/المعدّل
    out[sub !== undefined ? `${ni}.${sub}` : String(ni)] = v;
  }
  return out;
}
