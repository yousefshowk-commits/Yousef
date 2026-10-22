import { useMemo, useState, type MouseEvent } from 'react';
import { Pencil, Plus, Shuffle, Trash2 } from 'lucide-react';
import type { Group, ID } from '../types';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/misc';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Segmented, Select } from '../components/ui/Form';
import { Avatar } from '../components/ui/Avatar';
import { EmojiPicker } from '../components/ui/EmojiPicker';
import { GroupRace } from '../components/GroupRace';
import { AwardModal } from '../components/students/AwardModal';
import { COLORS } from '../data/defaults';
import { groupTotals } from '../services/stats';
import { num } from '../utils/format';
import { uid } from '../utils/id';
import { cn } from '../components/ui/cn';

const GROUP_EMOJIS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚪', '🦁', '🦅', '🚀', '⭐', '🌈', '⚡', '🔥', '🌊', '🌳'];

export default function Groups() {
  const { state, update } = useStore();
  const { awardGroup } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const [period, setPeriod] = useState<'week' | 'total'>('week');
  const [editing, setEditing] = useState<Group | null>(null);
  const [awardIds, setAwardIds] = useState<ID[] | null>(null);
  const totals = useMemo(() => groupTotals(state), [state]);
  const unassigned = state.students.filter((s) => !s.groupId || !state.groups.some((g) => g.id === s.groupId));

  const save = () => {
    if (!editing || !editing.name.trim()) {
      toast({ variant: 'error', icon: '✏️', title: 'اكتب اسم المجموعة' });
      return;
    }
    const g = { ...editing, name: editing.name.trim() };
    update((s) => ({ ...s, groups: g.id ? s.groups.map((x) => (x.id === g.id ? g : x)) : [...s.groups, { ...g, id: uid('g') }] }));
    setEditing(null);
  };

  const remove = async (g: Group) => {
    if (!(await confirm({ title: `حذف ${g.name}؟`, message: 'سيبقى الطلاب في الفصل بدون مجموعة.', danger: true, confirmText: 'حذف', icon: g.emoji }))) return;
    update((s) => ({ ...s, groups: s.groups.filter((x) => x.id !== g.id), students: s.students.map((st) => (st.groupId === g.id ? { ...st, groupId: null } : st)) }));
  };

  const distribute = async () => {
    if (!state.groups.length) return;
    if (!(await confirm({ title: 'توزيع الطلاب عشوائيًا؟', message: 'سيتم توزيع جميع الطلاب بالتساوي على المجموعات.', confirmText: 'وزّع', icon: '🔀' }))) return;
    const ids = state.students.map((s) => s.id).sort(() => Math.random() - 0.5);
    const assign = new Map(ids.map((id, i) => [id, state.groups[i % state.groups.length].id]));
    update((s) => ({ ...s, students: s.students.map((st) => ({ ...st, groupId: assign.get(st.id) ?? st.groupId })) }));
    toast({ icon: '🔀', title: 'تم توزيع الطلاب على المجموعات' });
  };

  const setStudentGroup = (sid: ID, gid: string) => update((s) => ({ ...s, students: s.students.map((x) => (x.id === sid ? { ...x, groupId: gid || null } : x)) }));

  const give = (gid: ID, amount: number) => (e: MouseEvent) => awardGroup(gid, amount, 'cooperation', { x: e.clientX, y: e.clientY });

  return (
    <div className="space-y-5">
      <PageHeader
        icon="👥"
        title="المجموعات والفرق"
        subtitle="تعاون ومنافسة ممتعة بين الفرق"
        actions={
          <>
            <Button variant="outline" icon={<Shuffle size={18} />} onClick={() => void distribute()}>توزيع عشوائي</Button>
            <Button icon={<Plus size={18} />} onClick={() => setEditing({ id: '', name: '', emoji: '🟣', color: COLORS[0] })}>فريق جديد</Button>
          </>
        }
      />

      <Card>
        <CardTitle icon="🏁" title="منافسة الفرق" action={<Segmented value={period} onChange={setPeriod} options={[{ value: 'week', label: 'هذا الأسبوع' }, { value: 'total', label: 'الإجمالي' }]} />} />
        <GroupRace state={state} period={period} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {state.groups.map((g) => {
          const members = state.students.filter((s) => s.groupId === g.id);
          const t = totals.find((x) => x.groupId === g.id);
          return (
            <Card key={g.id} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-2" style={{ background: g.color }} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl text-3xl" style={{ background: `${g.color}22` }}>{g.emoji}</span>
                  <div>
                    <h3 className="font-display text-xl font-bold">{g.name}</h3>
                    <p className="text-sm text-slate-500">{members.length} أعضاء • {num(t?.total ?? 0)} ⭐ إجمالًا</p>
                  </div>
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditing({ ...g })} aria-label="تعديل"><Pencil size={16} /></Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 hover:text-rose-600" onClick={() => void remove(g)} aria-label="حذف"><Trash2 size={16} /></Button>
                </div>
              </div>
              <div className="my-4 flex min-h-12 flex-wrap gap-1.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-white/70 py-1 pe-3 ps-1 text-sm font-bold dark:bg-white/5">
                    <Avatar student={m} size="xs" ring={false} />
                    {m.name.split(' ')[0]}
                  </div>
                ))}
                {!members.length && <p className="text-sm text-slate-400">لا يوجد أعضاء بعد</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-sm font-bold text-slate-500">نقاط للفريق:</span>
                {[1, 5, 10].map((a) => (
                  <button key={a} onClick={give(g.id, a)} className="font-display rounded-xl px-3 py-2 font-extrabold text-white shadow transition hover:brightness-110 active:scale-95" style={{ background: g.color }}>
                    +{a} ⭐
                  </button>
                ))}
                <Button size="sm" variant="secondary" className="h-10" disabled={!members.length} onClick={() => setAwardIds(members.map((m) => m.id))}>
                  ⭐ لكل الأعضاء
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardTitle icon="🧩" title="تعيين الطلاب للمجموعات" />
        {unassigned.length > 0 && <p className="mb-3 rounded-xl bg-amber-50 p-2 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">⚠️ {unassigned.length} طالب بدون مجموعة</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {state.students.map((s) => (
            <div key={s.id} className={cn('flex items-center gap-2 rounded-2xl p-2', !s.groupId && 'bg-amber-50/60 dark:bg-amber-500/5')}>
              <Avatar student={s} size="xs" ring={false} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</span>
              <Select value={s.groupId ?? ''} onChange={(e) => setStudentGroup(s.id, e.target.value)} className="h-9 w-36 py-0 text-sm" aria-label={`مجموعة ${s.name}`}>
                <option value="">بدون</option>
                {state.groups.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
              </Select>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? '✏️ تعديل الفريق' : '👥 فريق جديد'} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={save}>حفظ</Button></>}>
        {editing && (
          <div className="space-y-4">
            <Field label="اسم الفريق"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="مثال: فريق النجوم" autoFocus /></Field>
            <EmojiPicker value={editing.emoji} onChange={(emoji) => setEditing({ ...editing, emoji })} choices={GROUP_EMOJIS} />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })} className={cn('h-8 w-8 rounded-full', editing.color === c && 'ring-4 ring-offset-2 ring-indigo-400 dark:ring-offset-slate-900')} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
        )}
      </Modal>
      {awardIds && <AwardModal studentIds={awardIds} onClose={() => setAwardIds(null)} />}
    </div>
  );
}
