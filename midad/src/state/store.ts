import { create } from 'zustand';
import type { Doc, Obj, TextObj } from './types';
import { cloneObj, makeDoc, makeText } from './factory';
import { remapIndexKeys } from '../engine/kashida';

export type Tool = 'select' | 'letters' | 'hand';
export type Library = 'fonts' | 'ideas' | 'phrases' | 'shapes' | 'background' | 'layers' | null;

interface HistoryEntry {
  doc: Doc;
  key?: string;
  t: number;
}

interface State {
  doc: Doc;
  selectedId: string | null;
  glyphKey: string | null; // الحرف المحدد في وضع تحريك الحروف
  tool: Tool;
  library: Library;
  zoom: number;
  past: HistoryEntry[];
  future: Doc[];
  clipboard: Obj | null;
  showExport: boolean;
  toast: string | null;

  setDoc: (doc: Doc, key?: string) => void;
  updateObj: (id: string, patch: Partial<Obj>, key?: string) => void;
  updateText: (id: string, fn: (o: TextObj) => Partial<TextObj>, key?: string) => void;
  setText: (id: string, text: string) => void;
  addObj: (o: Obj) => void;
  removeObj: (id: string) => void;
  duplicate: (id: string) => void;
  moveLayer: (id: string, dir: 1 | -1 | 'top' | 'bottom') => void;
  select: (id: string | null) => void;
  selectGlyph: (key: string | null) => void;
  setTool: (t: Tool) => void;
  setLibrary: (l: Library) => void;
  setZoom: (z: number) => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  setShowExport: (v: boolean) => void;
  notify: (msg: string) => void;
}

const STORAGE_KEY = 'midad:doc:v1';
const MAX_HISTORY = 120;

function loadInitial(): Doc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Doc;
      if (d && d.version === 1 && Array.isArray(d.objects)) return d;
    }
  } catch {
    /* تخزين غير متاح */
  }
  return makeDoc({ objects: [makeText({ x: 540, y: 540 })] });
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave(doc: Doc) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* ممتلئ أو غير متاح */
    }
  }, 400);
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<State>((set, get) => {
  /** تطبيق تعديل على المستند مع تسجيله في السجل. key: دمج التعديلات المتتالية من نفس المصدر (مثل المنزلقات) */
  const commit = (doc: Doc, key?: string) => {
    const { past, doc: prev } = get();
    const now = Date.now();
    const last = past[past.length - 1];
    let nextPast = past;
    if (!(key && last && last.key === key && (key.startsWith('drag:') || now - last.t < 1200))) {
      nextPast = [...past, { doc: prev, key, t: now }].slice(-MAX_HISTORY);
    } else {
      nextPast = [...past.slice(0, -1), { ...last, t: now }];
    }
    set({ doc, past: nextPast, future: [] });
    scheduleSave(doc);
  };

  const mapObjs = (fn: (o: Obj) => Obj): Doc => {
    const d = get().doc;
    return { ...d, objects: d.objects.map(fn) };
  };

  return {
    doc: loadInitial(),
    selectedId: null,
    glyphKey: null,
    tool: 'select',
    library: 'ideas',
    zoom: 0.6,
    past: [],
    future: [],
    clipboard: null,
    showExport: false,
    toast: null,

    setDoc: (doc, key) => commit(doc, key),
    updateObj: (id, patch, key) => commit(mapObjs((o) => (o.id === id ? ({ ...o, ...patch } as Obj) : o)), key),
    updateText: (id, fn, key) =>
      commit(mapObjs((o) => (o.id === id && o.type === 'text' ? { ...o, ...fn(o) } : o)), key),
    setText: (id, text) =>
      commit(
        mapObjs((o) => {
          if (o.id !== id || o.type !== 'text') return o;
          return {
            ...o,
            text,
            overrides: remapIndexKeys(o.text, text, o.overrides),
            clusterFeatures: remapIndexKeys(o.text, text, o.clusterFeatures),
          };
        }),
        `text-${id}`,
      ),
    addObj: (o) => {
      const d = get().doc;
      commit({ ...d, objects: [...d.objects, o] });
      set({ selectedId: o.id, glyphKey: null });
    },
    removeObj: (id) => {
      const d = get().doc;
      commit({ ...d, objects: d.objects.filter((o) => o.id !== id) });
      if (get().selectedId === id) set({ selectedId: null, glyphKey: null });
    },
    duplicate: (id) => {
      const d = get().doc;
      const o = d.objects.find((x) => x.id === id);
      if (!o) return;
      const c = cloneObj(o);
      c.x += 30;
      c.y += 30;
      c.name = `${o.name} (نسخة)`;
      commit({ ...d, objects: [...d.objects, c] });
      set({ selectedId: c.id, glyphKey: null });
    },
    moveLayer: (id, dir) => {
      const d = get().doc;
      const arr = [...d.objects];
      const i = arr.findIndex((o) => o.id === id);
      if (i < 0) return;
      const [o] = arr.splice(i, 1);
      let j: number;
      if (dir === 'top') j = arr.length;
      else if (dir === 'bottom') j = 0;
      else j = Math.max(0, Math.min(arr.length, i + dir));
      arr.splice(j, 0, o);
      commit({ ...d, objects: arr });
    },
    select: (id) => set({ selectedId: id, glyphKey: null }),
    selectGlyph: (key) => set({ glyphKey: key }),
    setTool: (t) => set({ tool: t, glyphKey: null }),
    setLibrary: (l) => set({ library: l }),
    setZoom: (z) => set({ zoom: Math.max(0.05, Math.min(6, z)) }),
    undo: () => {
      const { past, doc, future } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set({ doc: prev.doc, past: past.slice(0, -1), future: [doc, ...future], glyphKey: null });
      scheduleSave(prev.doc);
    },
    redo: () => {
      const { past, doc, future } = get();
      if (!future.length) return;
      const next = future[0];
      set({ doc: next, past: [...past, { doc, t: Date.now() }], future: future.slice(1), glyphKey: null });
      scheduleSave(next);
    },
    copy: () => {
      const { doc, selectedId } = get();
      const o = doc.objects.find((x) => x.id === selectedId);
      if (o) set({ clipboard: o });
    },
    paste: () => {
      const { clipboard } = get();
      if (!clipboard) return;
      const c = cloneObj(clipboard);
      c.x += 40;
      c.y += 40;
      get().addObj(c);
    },
    setShowExport: (v) => set({ showExport: v }),
    notify: (msg) => {
      clearTimeout(toastTimer);
      set({ toast: msg });
      toastTimer = setTimeout(() => set({ toast: null }), 2600);
    },
  };
});

export function useSelected(): Obj | null {
  return useStore((s) => s.doc.objects.find((o) => o.id === s.selectedId) ?? null);
}
