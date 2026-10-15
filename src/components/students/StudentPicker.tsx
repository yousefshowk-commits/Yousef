import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ID, Student } from '../../types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';

/** Compact searchable avatar grid for choosing a single student. */
export function StudentPicker({ students, value, onChange, className }: { students: Student[]; value: ID | null; onChange: (id: ID) => void; className?: string }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => students.filter((s) => s.name.includes(q.trim())), [students, q]);
  return (
    <div className={className}>
      <div className="relative mb-3">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن طالب…" className="w-full rounded-2xl border-2 border-slate-200 bg-white/80 py-2.5 pe-3 ps-10 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-slate-800/70" />
      </div>
      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn('flex flex-col items-center gap-1 rounded-2xl p-2 transition hover:bg-indigo-50 dark:hover:bg-white/5', value === s.id && 'bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-500/20')}
          >
            <Avatar student={s} size="sm" ring={false} />
            <span className="w-full truncate text-xs font-bold">{s.name}</span>
          </button>
        ))}
        {list.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-500">لا يوجد طلاب</p>}
      </div>
    </div>
  );
}
