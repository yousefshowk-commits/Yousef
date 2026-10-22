import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../types';
import { deleteClassData, loadClass, loadWorkspace, newClassId, saveClass, saveRegistry, summarize, type Registry } from '../services/storage';
import { createDemoState } from '../data/demo';
import type { Result } from '../services/engine';

interface StoreValue {
  state: AppState;
  /** Replace state with a pure updater. */
  update: (fn: (s: AppState) => AppState) => void;
  /** Run an engine operation atomically and return its result (events, entry ids). */
  commit: (fn: (s: AppState) => Result) => Result;
  /** Read the latest state synchronously (inside event handlers). */
  get: () => AppState;
  /** All classes on this device; `activeId` is the one being shown. */
  registry: Registry;
  switchClass: (id: string) => void;
  /** Store a new class and make it active. Returns its id. */
  addClass: (state: AppState) => string;
  deleteClass: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Look-and-feel preferences follow the teacher across classes. */
const carryPrefs = (from: AppState, to: AppState): AppState => ({
  ...to,
  settings: { ...to.settings, theme: from.settings.theme, sound: from.settings.sound, animations: from.settings.animations },
});

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadWorkspace);
  const [state, setState] = useState<AppState>(initial.state);
  const [registry, setRegistry] = useState<Registry>(initial.registry);
  const ref = useRef(state);
  const regRef = useRef(registry);

  const setReg = useCallback((r: Registry) => {
    regRef.current = r;
    setRegistry(r);
    saveRegistry(r);
  }, []);

  /** Save the active class and keep its summary (name, counts) in the registry current. */
  const persist = useCallback(() => {
    const reg = regRef.current;
    const s = ref.current;
    saveClass(reg.activeId, s);
    const summary = summarize(reg.activeId, s);
    const old = reg.classes.find((c) => c.id === reg.activeId);
    if (!old || old.name !== summary.name || old.teacher !== summary.teacher || old.students !== summary.students) {
      setReg({ ...reg, classes: reg.classes.map((c) => (c.id === reg.activeId ? summary : c)) });
    }
  }, [setReg]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    ref.current = fn(ref.current);
    setState(ref.current);
  }, []);

  const commit = useCallback((fn: (s: AppState) => Result) => {
    const result = fn(ref.current);
    ref.current = result.state;
    setState(result.state);
    return result;
  }, []);

  const get = useCallback(() => ref.current, []);

  const activate = useCallback(
    (id: string, next: AppState, classes: Registry['classes']) => {
      ref.current = next;
      setState(next);
      setReg({ activeId: id, classes });
      saveClass(id, next);
    },
    [setReg],
  );

  const switchClass = useCallback(
    (id: string) => {
      if (id === regRef.current.activeId) return;
      persist();
      const loaded = loadClass(id) ?? { ...createDemoState(), settings: { ...createDemoState().settings, onboarded: true } };
      activate(id, carryPrefs(ref.current, loaded), regRef.current.classes);
    },
    [activate, persist],
  );

  const addClass = useCallback(
    (fresh: AppState) => {
      persist();
      const id = newClassId();
      const next = carryPrefs(ref.current, fresh);
      activate(id, next, [...regRef.current.classes, summarize(id, next)]);
      return id;
    },
    [activate, persist],
  );

  const deleteClass = useCallback(
    (id: string) => {
      const reg = regRef.current;
      if (reg.classes.length <= 1) return;
      const remaining = reg.classes.filter((c) => c.id !== id);
      deleteClassData(id);
      if (id === reg.activeId) {
        const target = remaining[0];
        const loaded = loadClass(target.id) ?? createDemoState();
        activate(target.id, carryPrefs(ref.current, loaded), remaining);
      } else {
        setReg({ ...reg, classes: remaining });
      }
    },
    [activate, setReg],
  );

  // Persist (debounced) on every change, and flush when the page is hidden/closed.
  useEffect(() => {
    const t = setTimeout(persist, 150);
    return () => clearTimeout(t);
  }, [state, persist]);
  useEffect(() => {
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', persist);
    return () => {
      window.removeEventListener('beforeunload', persist);
      document.removeEventListener('visibilitychange', persist);
    };
  }, [persist]);

  const value = useMemo(
    () => ({ state, update, commit, get, registry, switchClass, addClass, deleteClass }),
    [state, update, commit, get, registry, switchClass, addClass, deleteClass],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

export const useAppState = () => useStore().state;
