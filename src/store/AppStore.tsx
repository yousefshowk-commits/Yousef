import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../types';
import { loadState, saveState } from '../services/storage';
import type { Result } from '../services/engine';

interface StoreValue {
  state: AppState;
  /** Replace state with a pure updater. */
  update: (fn: (s: AppState) => AppState) => void;
  /** Run an engine operation atomically and return its result (events, entry ids). */
  commit: (fn: (s: AppState) => Result) => Result;
  /** Read the latest state synchronously (inside event handlers). */
  get: () => AppState;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const ref = useRef(state);

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

  // Persist (debounced) on every change, and flush when the page is hidden/closed.
  useEffect(() => {
    const t = setTimeout(() => saveState(state), 150);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const flush = () => saveState(ref.current);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const value = useMemo(() => ({ state, update, commit, get }), [state, update, commit, get]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

export const useAppState = () => useStore().state;
