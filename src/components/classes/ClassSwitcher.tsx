import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { cn } from '../ui/cn';

/** Sidebar header: shows the current class and switches between classes. */
export function ClassSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { state, registry, switchClass } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="تبديل الفصل"
        className="flex w-full items-center gap-3 rounded-2xl p-2 text-start transition hover:bg-violet-50 dark:hover:bg-white/5"
      >
        <span className="animate-float grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-2xl shadow-lg shadow-orange-500/30">🏆</span>
        <span className="min-w-0 flex-1">
          <span className="font-display block truncate text-lg font-extrabold leading-tight">نظام التعزيز</span>
          <span className="block truncate text-xs font-bold text-violet-600 dark:text-violet-300">{state.settings.className}</span>
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="animate-slide-up absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <p className="px-3 pb-1 pt-3 text-xs font-bold text-slate-400">فصولي ({registry.classes.length})</p>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {registry.classes.map((c) => {
              const active = c.id === registry.activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    switchClass(c.id);
                    go('/');
                  }}
                  className={cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start transition', active ? 'bg-violet-50 dark:bg-violet-500/15' : 'hover:bg-slate-50 dark:hover:bg-white/5')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{active ? state.settings.className : c.name}</span>
                    <span className="block text-xs text-slate-500">{active ? state.students.length : c.students} طالب</span>
                  </span>
                  {active && <Check size={16} className="shrink-0 text-violet-600 dark:text-violet-300" />}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-1 border-t border-slate-100 p-1.5 dark:border-white/10">
            <button onClick={() => go('/classes')} className="flex items-center justify-center gap-1 rounded-xl py-2 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-white/5">
              <Plus size={16} /> فصل جديد
            </button>
            <button onClick={() => go('/classes')} className="rounded-xl py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
              إدارة الفصول
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
