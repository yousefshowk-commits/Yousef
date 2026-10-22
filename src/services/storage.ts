import type { AppState } from '../types';
import { createDemoState, createEmptyState } from '../data/demo';

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

const LEGACY_KEY = 'class-rewards:state:v1';
const REGISTRY_KEY = 'class-rewards:classes:v1';
const classKey = (id: string) => `class-rewards:class:${id}`;

export interface ClassSummary {
  id: string;
  name: string;
  teacher: string;
  students: number;
}

export interface Registry {
  activeId: string;
  classes: ClassSummary[];
}

export const summarize = (id: string, state: AppState): ClassSummary => ({
  id,
  name: state.settings.className,
  teacher: state.settings.teacherName,
  students: state.students.length,
});

export const newClassId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function readJSON(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn('Could not read', key, err);
    return null;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('Could not save', key, err);
    return false;
  }
}

export function loadClass(id: string): AppState | null {
  const raw = readJSON(classKey(id));
  if (!raw) return null;
  try {
    return normalizeState(raw);
  } catch (err) {
    console.warn('Saved class is invalid', id, err);
    return null;
  }
}

export const saveClass = (id: string, state: AppState) => writeJSON(classKey(id), state);
export const saveRegistry = (reg: Registry) => writeJSON(REGISTRY_KEY, reg);

export function deleteClassData(id: string) {
  try {
    localStorage.removeItem(classKey(id));
  } catch {
    /* ignore */
  }
}

/**
 * Load the class registry and the active class. Migrates the single-class
 * save from earlier versions into the first class of the registry.
 */
export function loadWorkspace(): { registry: Registry; state: AppState } {
  const reg = readJSON(REGISTRY_KEY) as Registry | null;
  if (reg && Array.isArray(reg.classes) && reg.classes.length) {
    const activeId = reg.classes.some((c) => c.id === reg.activeId) ? reg.activeId : reg.classes[0].id;
    const state = loadClass(activeId) ?? createDemoState();
    return { registry: { ...reg, activeId }, state };
  }
  let state: AppState | null = null;
  const legacy = readJSON(LEGACY_KEY);
  if (legacy) {
    try {
      state = normalizeState(legacy);
    } catch {
      state = null;
    }
  }
  state ??= createDemoState();
  const id = newClassId();
  const registry: Registry = { activeId: id, classes: [summarize(id, state)] };
  if (saveClass(id, state) && saveRegistry(registry)) {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }
  return { registry, state };
}

export function downloadBackup(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  const name = state.settings.className.replace(/[\\/:*?"<>|]+/g, '').trim() || 'class';
  a.download = `class-rewards-${name}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.json`;
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
