import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAppState } from '../../store/AppStore';
import { formatRelative } from '../../utils/date';
import { cn } from '../ui/cn';

const SEEN_KEY = 'class-rewards:notif-seen';

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** 🔔 Achievement notifications: badges, level ups and class challenges. */
export function NotificationBell() {
  const state = useAppState();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const ref = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      state.log
        .filter((e) => !e.undone && (e.type === 'badge' || e.type === 'levelup' || e.type === 'challenge'))
        .slice(-25)
        .reverse(),
    [state.log],
  );
  const names = useMemo(() => new Map(state.students.map((s) => [s.id, s.name])), [state.students]);
  const unread = items.filter((e) => e.createdAt > seen).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    const now = Date.now();
    setSeen(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative grid h-11 w-11 place-items-center rounded-2xl text-slate-600 transition hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10" aria-label="الإشعارات">
        <Bell size={21} className={cn(unread > 0 && 'animate-wiggle')} />
        {unread > 0 && <span className="absolute -top-0.5 -left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white" dir="ltr">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="animate-slide-up absolute left-0 top-13 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <p className="font-display border-b border-slate-100 px-4 py-3 font-bold dark:border-white/10">🔔 إشعارات الإنجازات</p>
          <div className="max-h-96 overflow-y-auto p-2">
            {items.length === 0 && <p className="p-6 text-center text-slate-500">لا توجد إنجازات بعد</p>}
            {items.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-slate-50 dark:hover:bg-white/5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-xl dark:bg-amber-500/15">{e.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.studentId ? names.get(e.studentId) : 'الفصل'}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{e.label}</p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">{formatRelative(e.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
