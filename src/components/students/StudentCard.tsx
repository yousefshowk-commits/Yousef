import { Link } from 'react-router-dom';
import { Check, Pencil, Trash2, User } from 'lucide-react';
import type { Badge, Group, Student } from '../../types';
import type { StudentStats } from '../../hooks/useStudentStats';
import { Avatar } from '../ui/Avatar';
import { ProgressBar } from '../ui/ProgressBar';
import { cn } from '../ui/cn';
import { num } from '../../utils/format';

interface Props {
  student: Student;
  stats: StudentStats;
  badges: Badge[];
  group?: Group;
  rewardsCount: number;
  selected?: boolean;
  selecting?: boolean;
  onAward: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}

export function StudentCard({ student, stats, badges, group, rewardsCount, selected, selecting, onAward, onEdit, onDelete, onToggleSelect }: Props) {
  const earned = badges.filter((b) => student.badges.some((x) => x.badgeId === b.id));
  const { level } = stats;
  return (
    <div
      className={cn(
        'glass group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.75rem] p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-violet-500/15',
        selected && 'ring-4 ring-violet-500',
      )}
      onClick={selecting ? onToggleSelect : onAward}
      role="button"
      aria-label={`${student.name} — إضافة نقاط`}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && (selecting ? onToggleSelect() : onAward())}
    >
      <div className="absolute inset-x-0 top-0 h-20 opacity-60" style={{ background: `linear-gradient(180deg, ${student.color}40, transparent)` }} />

      {selecting && (
        <span className={cn('absolute left-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full border-2', selected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-300 bg-white dark:bg-slate-800')}>
          {selected && <Check size={16} />}
        </span>
      )}

      {!selecting && (
        <div className="absolute left-2 top-2 z-10 flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <Link to={`/students/${student.id}`} className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-slate-600 hover:text-violet-600 dark:bg-slate-800/80 dark:text-slate-300" title="ملف الطالب" aria-label="ملف الطالب">
            <User size={15} />
          </Link>
          <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-slate-600 hover:text-sky-600 dark:bg-slate-800/80 dark:text-slate-300" title="تعديل" aria-label="تعديل">
            <Pencil size={15} />
          </button>
          <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-slate-600 hover:text-rose-600 dark:bg-slate-800/80 dark:text-slate-300" title="حذف" aria-label="حذف">
            <Trash2 size={15} />
          </button>
        </div>
      )}

      <div className="relative flex flex-col items-center text-center">
        <div className="relative">
          <Avatar student={student} size="lg" className="transition group-hover:scale-105" />
          <span className="absolute -bottom-1 -left-1 grid h-8 w-8 place-items-center rounded-full bg-white text-lg shadow-md dark:bg-slate-800" title={level.level.name}>
            {level.level.icon}
          </span>
          {stats.streak >= 2 && (
            <span className="absolute -right-2 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow" title="أيام متتالية">
              🔥{stats.streak}
            </span>
          )}
        </div>
        <h3 className="font-display mt-2 w-full truncate text-lg font-bold">{student.name}</h3>
        <p className="text-xs font-bold" style={{ color: level.level.color }}>
          المستوى {level.level.id} — {level.level.name}
        </p>
        {group && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{group.emoji} {group.name}</p>}
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-1.5 text-center text-sm">
        <div className="rounded-xl bg-amber-50 py-1.5 dark:bg-amber-500/10" title="مجموع النجوم المكتسبة">
          <p className="font-display text-lg font-extrabold text-amber-600 dark:text-amber-300">⭐ {num(student.totalEarned)}</p>
          <p className="text-[11px] text-slate-500">النجوم</p>
        </div>
        <div className="rounded-xl bg-sky-50 py-1.5 dark:bg-sky-500/10" title="رصيد النقاط القابل للاستبدال">
          <p className="font-display text-lg font-extrabold text-sky-600 dark:text-sky-300">💎 {num(student.points)}</p>
          <p className="text-[11px] text-slate-500">النقاط</p>
        </div>
        <div className="rounded-xl bg-violet-50 py-1.5 dark:bg-violet-500/10">
          <p className="font-bold">🏅 {earned.length}</p>
          <p className="text-[11px] text-slate-500">الشارات</p>
        </div>
        <div className="rounded-xl bg-pink-50 py-1.5 dark:bg-pink-500/10">
          <p className="font-bold">🎁 {rewardsCount}</p>
          <p className="text-[11px] text-slate-500">المكافآت</p>
        </div>
      </div>

      <div className="relative mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>📈 التقدم</span>
          <span>{level.next ? `${num(level.toNext)} للمستوى التالي` : 'أعلى مستوى 💎'}</span>
        </div>
        <ProgressBar value={level.progress} height="sm" color={level.level.color} />
      </div>

      <div className="relative mt-2 flex h-7 items-center justify-center gap-0.5 text-lg">
        {earned.slice(0, 5).map((b) => (
          <span key={b.id} title={b.name}>{b.icon}</span>
        ))}
        {earned.length > 5 && <span className="text-xs font-bold text-slate-400" dir="ltr">+{earned.length - 5}</span>}
        {earned.length === 0 && <span className="text-xs text-slate-400">لا شارات بعد ✨</span>}
      </div>

      {!selecting && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAward();
          }}
          className="relative mt-3 flex h-11 items-center justify-center gap-1 rounded-2xl bg-gradient-to-l from-amber-400 to-orange-500 font-bold text-white shadow-md shadow-orange-500/20 transition hover:brightness-110 active:scale-95"
        >
          + إضافة نقاط
        </button>
      )}
    </div>
  );
}
