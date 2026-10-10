import type { Gender } from '../types';

const nf = new Intl.NumberFormat('ar-EG');
/** Numbers are rendered with Western digits for readability on boards; keep a helper for Arabic digits. */
export const num = (n: number): string => Math.round(n).toLocaleString('en-US');
export const arNum = (n: number): string => nf.format(n);

export const pct = (value: number, total: number): number =>
  total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / total) * 100)));

/** Gendered word helper: g(gender, 'حصلت', 'حصلتِ'). */
export const g = (gender: Gender, male: string, female: string): string =>
  gender === 'f' ? female : male;

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export const pointsWord = (n: number): string => {
  const a = Math.abs(n);
  if (a === 1) return 'نقطة';
  if (a === 2) return 'نقطتان';
  if (a >= 3 && a <= 10) return 'نقاط';
  return 'نقطة';
};

export const signed = (n: number): string => (n > 0 ? `+${num(n)}` : n < 0 ? `−${num(-n)}` : '0');
