import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';

export interface ToastOptions {
  title: string;
  description?: string;
  icon?: string;
  variant?: 'success' | 'info' | 'error' | 'badge' | 'level';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((t: ToastOptions) => void) | null>(null);

const variantStyles: Record<NonNullable<ToastOptions['variant']>, string> = {
  success: 'from-emerald-500 to-teal-500',
  info: 'from-violet-500 to-fuchsia-500',
  error: 'from-rose-500 to-red-500',
  badge: 'from-amber-400 to-orange-500',
  level: 'from-sky-500 to-indigo-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (t: ToastOptions) => {
      const id = ++counter.current;
      setItems((l) => [...l.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), t.duration ?? (t.action ? 6000 : 3500));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3 sm:top-5" aria-live="polite">
          {items.map((t) => (
            <div
              key={t.id}
              className="animate-slide-up pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-3 pe-2 shadow-xl shadow-violet-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/95"
              role="status"
            >
              <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl shadow-inner', variantStyles[t.variant ?? 'success'])}>
                <span className="animate-pop">{t.icon ?? '🎉'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug">{t.title}</p>
                {t.description && <p className="text-sm text-slate-500 dark:text-slate-400">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  className="rounded-xl bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-200"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => dismiss(t.id)} aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
