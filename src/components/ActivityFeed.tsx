import { Undo2 } from 'lucide-react';
import type { LogEntry, Student } from '../types';
import { formatRelative } from '../utils/date';
import { signed } from '../utils/format';
import { Avatar } from './ui/Avatar';
import { cn } from './ui/cn';

const UNDOABLE = new Set(['award', 'deduct', 'redeem', 'wheel', 'group', 'badge']);

/** Timeline of log entries with optional undo buttons. */
export function ActivityFeed({ entries, students, onUndo, showStudent = true, timeline = false }: { entries: LogEntry[]; students: Map<string, Student>; onUndo?: (id: string) => void; showStudent?: boolean; timeline?: boolean }) {
  if (!entries.length) return <p className="py-8 text-center text-slate-500">لا توجد عمليات بعد ✨</p>;
  return (
    <ol className={cn('space-y-1.5', timeline && 'relative border-s-2 border-dashed border-indigo-200 ps-4 dark:border-indigo-500/30')}>
      {entries.map((e) => {
        const s = e.studentId ? students.get(e.studentId) : undefined;
        const positive = e.amount > 0;
        return (
          <li key={e.id} className={cn('group relative flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-white/70 dark:hover:bg-white/5', e.undone && 'opacity-45')}>
            {timeline && <span className="absolute -start-[1.45rem] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900" />}
            {showStudent && s ? (
              <Avatar student={s} size="sm" ring={false} />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-xl dark:bg-indigo-500/15">{e.icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('truncate font-bold', e.undone && 'line-through')}>
                {showStudent && s && <span>{s.name} • </span>}
                {showStudent && s && <span className="me-1">{e.icon}</span>}
                <span className="font-medium text-slate-600 dark:text-slate-300">{e.label}</span>
              </p>
              <p className="text-xs text-slate-400">{formatRelative(e.createdAt)}{e.undone && ' • تم التراجع'}</p>
            </div>
            {e.amount !== 0 && (
              <span dir="ltr" className={cn('font-display shrink-0 rounded-xl px-2.5 py-0.5 text-lg font-extrabold', positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300')}>
                {signed(e.amount)}
              </span>
            )}
            {onUndo && !e.undone && UNDOABLE.has(e.type) && !e.parentId && (
              <button onClick={() => onUndo(e.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-500/10" title="تراجع" aria-label="تراجع">
                <Undo2 size={17} />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
