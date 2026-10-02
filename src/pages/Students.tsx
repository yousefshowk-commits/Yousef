import { useMemo, useState } from 'react';
import { CheckSquare, Plus, Search, X } from 'lucide-react';
import type { ID, Student } from '../types';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useStudentStats } from '../hooks/useStudentStats';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader, EmptyState } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Form';
import { cn } from '../components/ui/cn';
import { StudentCard } from '../components/students/StudentCard';
import { StudentFormModal } from '../components/students/StudentFormModal';
import { AwardModal } from '../components/students/AwardModal';

type SortKey = 'name' | 'stars' | 'points' | 'week' | 'badges' | 'recent';

export default function Students() {
  const { state } = useStore();
  const { deleteStudent } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const stats = useStudentStats(state);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [group, setGroup] = useState<string>('all');
  const [awardIds, setAwardIds] = useState<ID[] | null>(null);
  const [form, setForm] = useState<{ open: boolean; student?: Student }>({ open: false });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<ID>>(new Set());

  const rewardsCount = useMemo(() => {
    const m = new Map<ID, number>();
    for (const e of state.log) if (e.type === 'redeem' && !e.undone && e.studentId) m.set(e.studentId, (m.get(e.studentId) ?? 0) + 1);
    return m;
  }, [state.log]);

  const list = useMemo(() => {
    const term = q.trim();
    const filtered = state.students.filter(
      (s) => (!term || s.name.includes(term)) && (group === 'all' || (group === 'none' ? !s.groupId : s.groupId === group)),
    );
    const by: Record<SortKey, (a: Student, b: Student) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, 'ar'),
      stars: (a, b) => b.totalEarned - a.totalEarned,
      points: (a, b) => b.points - a.points,
      week: (a, b) => (stats.get(b.id)?.week ?? 0) - (stats.get(a.id)?.week ?? 0),
      badges: (a, b) => b.badges.length - a.badges.length,
      recent: (a, b) => b.createdAt - a.createdAt,
    };
    return [...filtered].sort(by[sort]);
  }, [state.students, q, group, sort, stats]);

  const onDelete = async (s: Student) => {
    const ok = await confirm({
      title: `حذف ${s.name}؟`,
      message: 'سيتم حذف الطالب وجميع نقاطه وسجله نهائيًا. لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'نعم، احذف',
      danger: true,
      icon: '🗑️',
    });
    if (!ok) return;
    deleteStudent(s.id);
    toast({ variant: 'info', icon: '🗑️', title: `تم حذف ${s.name}` });
  };

  const toggle = (id: ID) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <div>
      <PageHeader
        icon="👦"
        title="الطلاب"
        subtitle={`${state.students.length} طالب/طالبة في ${state.settings.className}`}
        actions={
          <>
            <Button variant={selecting ? 'secondary' : 'outline'} icon={selecting ? <X size={18} /> : <CheckSquare size={18} />} onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
              {selecting ? 'إلغاء التحديد' : 'تحديد متعدد'}
            </Button>
            <Button icon={<Plus size={18} />} onClick={() => setForm({ open: true })}>
              إضافة طالب
            </Button>
          </>
        }
      />

      <div className="glass mb-5 flex flex-col gap-3 rounded-3xl p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن طالب بالاسم…"
            className="h-11 w-full rounded-2xl border-2 border-transparent bg-white/80 pe-3 ps-11 outline-none focus:border-indigo-400 dark:bg-slate-800/70"
          />
        </div>
        <div className="flex gap-2">
          <Select value={group} onChange={(e) => setGroup(e.target.value)} className="h-11 py-0 sm:w-48" aria-label="تصفية حسب المجموعة">
            <option value="all">👥 كل المجموعات</option>
            {state.groups.map((g) => (
              <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
            ))}
            <option value="none">بدون مجموعة</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-11 py-0 sm:w-48" aria-label="ترتيب">
            <option value="name">🔤 الاسم</option>
            <option value="stars">⭐ النجوم</option>
            <option value="points">💎 رصيد النقاط</option>
            <option value="week">📅 نقاط الأسبوع</option>
            <option value="badges">🏅 الشارات</option>
            <option value="recent">🆕 الأحدث إضافة</option>
          </Select>
        </div>
      </div>

      {/* Group quick filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ id: 'all', label: 'الكل', emoji: '🌈' }, ...state.groups.map((g) => ({ id: g.id, label: g.name, emoji: g.emoji }))].map((c) => (
          <button
            key={c.id}
            onClick={() => setGroup(c.id)}
            className={cn('rounded-full px-4 py-2 text-sm font-bold transition', group === c.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-white/5 dark:text-slate-300')}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={state.students.length ? '🔍' : '🎒'}
          title={state.students.length ? 'لا توجد نتائج' : 'لا يوجد طلاب بعد'}
          text={state.students.length ? 'جرّب كلمة بحث أو مجموعة أخرى' : 'ابدأ بإضافة طلاب فصلك'}
          action={!state.students.length && <Button onClick={() => setForm({ open: true })}>➕ إضافة أول طالب</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {list.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              stats={stats.get(s.id)!}
              badges={state.badges}
              group={state.groups.find((g) => g.id === s.groupId)}
              rewardsCount={rewardsCount.get(s.id) ?? 0}
              selecting={selecting}
              selected={selected.has(s.id)}
              onToggleSelect={() => toggle(s.id)}
              onAward={() => setAwardIds([s.id])}
              onEdit={() => setForm({ open: true, student: s })}
              onDelete={() => void onDelete(s)}
            />
          ))}
        </div>
      )}

      {selecting && (
        <div className="animate-slide-up fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 rounded-3xl bg-slate-900 p-3 text-white shadow-2xl lg:bottom-6">
          <span className="px-2 font-bold">{selected.size} محدد</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map((s) => s.id)))}>
              {selected.size === list.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </Button>
            <Button size="sm" variant="warning" disabled={!selected.size} onClick={() => setAwardIds([...selected])}>
              ⭐ منح نقاط للمحددين
            </Button>
          </div>
        </div>
      )}

      {awardIds && <AwardModal
        studentIds={awardIds}
        onClose={() => {
          if (selecting && awardIds && awardIds.length > 1) exitSelect();
          setAwardIds(null);
        }}
      />}
      <StudentFormModal open={form.open} student={form.student} onClose={() => setForm({ open: false })} />
    </div>
  );
}
