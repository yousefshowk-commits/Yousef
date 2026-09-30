import type { AppState } from '../types';
import { createDemoState, createEmptyState } from '../data/demo';

const KEY = 'class-rewards:state:v1';

/** Fill in any fields missing from older/partial saves so the app never crashes on load. */
export function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') throw new Error('ملف غير صالح');
  const r = raw as Partial<AppState>;
  if (!Array.isArray(r.students) || !r.settings) throw new Error('الملف لا يحتوي على بيانات فصل صالحة');
  const base = createEmptyState();
  return {
    ...base,
    ...r,
    version: 1,
    settings: { ...base.settings, ...r.settings },
    challenge: { ...base.challenge, ...(r.challenge ?? {}) },
    students: r.students.map((s) => ({
      ...s,
      groupId: s.groupId ?? null,
      badges: Array.isArray(s.badges) ? s.badges : [],
      points: Number(s.points) || 0,
      totalEarned: Number(s.totalEarned) || 0,
      totalSpent: Number(s.totalSpent) || 0,
    })),
    log: Array.isArray(r.log) ? r.log : [],
    dailyDone: r.dailyDone ?? {},
  };
}

export function loadState(): AppState {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return normalizeState(JSON.parse(text));
  } catch (err) {
    console.warn('Could not load saved state, starting with demo data.', err);
  }
  return createDemoState();
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('Could not save state', err);
    return false;
  }
}

export function clearSavedState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function downloadBackup(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `class-rewards-backup-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File): Promise<AppState> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('الملف ليس بصيغة JSON صحيحة');
  }
  return normalizeState(parsed);
}
