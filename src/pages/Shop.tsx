import { useMemo, useState } from 'react';
import { Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import type { ID, Reward } from '../types';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Field, Input, Toggle } from '../components/ui/Form';
import { EmojiPicker } from '../components/ui/EmojiPicker';
import { StudentPicker } from '../components/students/StudentPicker';
import { ActivityFeed } from '../components/ActivityFeed';
import { COLORS } from '../data/defaults';
import { num, pct } from '../utils/format';
import { uid } from '../utils/id';
import { cn } from '../components/ui/cn';

const blankReward = (): Reward => ({ id: '', name: '', icon: '🎁', description: '', cost: 100, color: COLORS[1], active: true });

export default function Shop() {
  const { state, update } = useStore();
  const { redeem, undo } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const [studentId, setStudentId] = useState<ID | null>(null);
  const [picking, setPicking] = useState<Reward | 'choose' | null>(null);
  const [pending, setPending] = useState<{ reward: Reward; cost: string } | null>(null);
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);

  const student = state.students.find((s) => s.id === studentId);
  const rewards = state.rewards.filter((r) => manage || r.active);
  const studentsMap = useMemo(() => new Map(state.students.map((s) => [s.id, s])), [state.students]);
  const recent = useMemo(() => state.log.filter((e) => e.type === 'redeem').slice(-10).reverse(), [state.log]);

  const startRedeem = (reward: Reward) => {
    if (!student) {
      setPicking(reward);
      return;
    }
    setPending({ reward, cost: String(reward.cost) });
  };

  const doRedeem = () => {
    if (!pending || !student) return;
    const cost = Math.floor(Number(pending.cost));
    if (redeem(student.id, pending.reward.id, cost)) setPending(null);
  };

  const saveReward = () => {
    if (!editing) return;
    if (!editing.name.trim() || editing.cost <= 0) {
      toast({ variant: 'error', icon: '✏️', title: 'أدخل اسم المكافأة وعدد نقاط صحيح' });
      return;
    }
    const r = { ...editing, name: editing.name.trim() };
    update((s) => ({ ...s, rewards: r.id ? s.rewards.map((x) => (x.id === r.id ? r : x)) : [...s.rewards, { ...r, id: uid('rw') }] }));
    setEditing(null);
    toast({ icon: r.icon, title: 'تم حفظ المكافأة' });
  };

  const removeReward = async (r: Reward) => {
    if (await confirm({ title: `حذف «${r.name}»؟`, danger: true, confirmText: 'حذف', icon: r.icon })) {
      update((s) => ({ ...s, rewards: s.rewards.filter((x) => x.id !== r.id) }));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon="🎁"
        title="متجر المكافآت"
        subtitle="استبدل النقاط بمكافآت ممتعة!"
        actions={
          <>
            <Button variant={manage ? 'secondary' : 'outline'} icon={<Settings2 size={18} />} onClick={() => setManage((m) => !m)}>{manage ? 'إنهاء الإدارة' : 'إدارة المكافآت'}</Button>
            {manage && <Button icon={<Plus size={18} />} onClick={() => setEditing(blankReward())}>مكافأة جديدة</Button>}
          </>
        }
      />

      {/* Current shopper */}
      <Card className="flex flex-wrap items-center gap-4 bg-gradient-to-l from-pink-50/80 to-indigo-50/80 dark:from-pink-500/5 dark:to-indigo-500/5">
        {student ? (
          <>
            <Avatar student={student} size="lg" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">المتسوّق الآن</p>
              <p className="font-display text-2xl font-extrabold">{student.name}</p>
              <p className="font-display text-xl font-bold text-sky-600 dark:text-sky-300">💎 {num(student.points)} نقطة متاحة</p>
            </div>
            <Button variant="secondary" onClick={() => setPicking('choose')}>تغيير الطالب</Button>
          </>
        ) : (
          <>
            <div className="animate-float text-5xl">🛍️</div>
            <div className="flex-1">
              <p className="font-display text-xl font-bold">من سيتسوّق اليوم؟</p>
              <p className="text-slate-500">اختر طالبًا لعرض رصيده والمكافآت المتاحة له</p>
            </div>
            <Button onClick={() => setPicking('choose')}>👦 اختيار طالب</Button>
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {rewards.map((r) => {
          const can = !!student && (r.custom || student.points >= r.cost);
          return (
            <div key={r.id} className={cn('glass group relative flex flex-col overflow-hidden rounded-[1.75rem] p-4 text-center transition hover:-translate-y-1.5 hover:shadow-2xl', !r.active && 'opacity-50')}>
              <div className="absolute inset-x-0 top-0 h-24" style={{ background: `linear-gradient(180deg, ${r.color}55, transparent)` }} />
              {manage && (
                <div className="absolute left-2 top-2 z-10 flex gap-1">
                  <button onClick={() => setEditing({ ...r })} className="grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-slate-600 shadow dark:bg-slate-800" aria-label="تعديل"><Pencil size={14} /></button>
                  <button onClick={() => void removeReward(r)} className="grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-rose-600 shadow dark:bg-slate-800" aria-label="حذف"><Trash2 size={14} /></button>
                </div>
              )}
              <div className="relative mx-auto my-2 grid h-24 w-24 place-items-center rounded-full bg-white/70 text-6xl shadow-inner transition group-hover:scale-110 group-hover:rotate-6 dark:bg-white/10">
                {r.icon}
              </div>
              <h3 className="font-display relative text-lg font-bold leading-tight">{r.name}</h3>
              <p className="relative mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{r.description}</p>
              <p className="font-display relative mt-2 text-2xl font-extrabold text-amber-500">{r.custom ? 'نقاط مخصصة' : `${num(r.cost)} ⭐`}</p>
              {student && !r.custom && student.points < r.cost && (
                <div className="relative mt-1">
                  <ProgressBar value={pct(student.points, r.cost)} height="xs" />
                  <p className="mt-1 text-xs text-slate-400">باقي {num(r.cost - student.points)} نقطة</p>
                </div>
              )}
              <Button className="relative mt-3" variant={can ? 'primary' : 'secondary'} disabled={!r.active || (!!student && !can)} onClick={() => startRedeem(r)}>
                🎁 استبدال
              </Button>
            </div>
          );
        })}
      </div>

      <Card>
        <CardTitle icon="🧾" title="آخر عمليات الاستبدال" />
        <ActivityFeed entries={recent} students={studentsMap} onUndo={undo} />
      </Card>

      {/* Choose student */}
      <Modal open={!!picking} onClose={() => setPicking(null)} title="👦 اختر الطالب">
        <StudentPicker
          students={state.students}
          value={studentId}
          onChange={(id) => {
            setStudentId(id);
            const r = picking;
            setPicking(null);
            if (r && r !== 'choose') setPending({ reward: r, cost: String(r.cost) });
          }}
        />
      </Modal>

      {/* Confirm redeem */}
      <Modal open={!!pending} onClose={() => setPending(null)} size="sm">
        {pending && student && (
          <div className="text-center">
            <div className="animate-bounce-in text-7xl">{pending.reward.icon}</div>
            <h3 className="font-display mt-2 text-2xl font-bold">{pending.reward.name}</h3>
            {pending.reward.custom ? (
              <Field label="عدد النقاط المطلوبة" className="mt-4 text-start">
                <Input type="number" min={1} value={pending.cost} onChange={(e) => setPending({ ...pending, cost: e.target.value })} autoFocus />
              </Field>
            ) : null}
            <p className="mt-3 text-lg">
              هل تريد استبدال <b className="text-amber-500">{num(Number(pending.cost) || 0)}</b> نقطة بهذه المكافأة؟
            </p>
            <p className="mt-1 text-sm text-slate-500">
              رصيد {student.name}: {num(student.points)} ← {num(student.points - (Number(pending.cost) || 0))}
            </p>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" onClick={doRedeem}>✅ نعم، استبدال</Button>
              <Button className="flex-1" variant="ghost" onClick={() => setPending(null)}>إلغاء</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit reward */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? '✏️ تعديل المكافأة' : '🎁 مكافأة جديدة'}
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={saveReward}>حفظ</Button></>}
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="اسم المكافأة" className="sm:col-span-2"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="النقاط المطلوبة"><Input type="number" min={1} value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            </div>
            <Field label="وصف مختصر"><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <EmojiPicker value={editing.icon} onChange={(icon) => setEditing({ ...editing, icon })} />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })} className={cn('h-8 w-8 rounded-full', editing.color === c && 'ring-4 ring-offset-2 ring-indigo-400 dark:ring-offset-slate-900')} style={{ background: c }} aria-label={c} />
              ))}
            </div>
            <Toggle checked={editing.active} onChange={(active) => setEditing({ ...editing, active })} label="متاحة في المتجر" />
            <Toggle checked={!!editing.custom} onChange={(custom) => setEditing({ ...editing, custom })} label="نقاط مخصصة" description="يحدد المعلم عدد النقاط عند الاستبدال" />
          </div>
        )}
      </Modal>
    </div>
  );
}
