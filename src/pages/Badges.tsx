import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Badge, BadgeRuleType, ID } from '../types';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader, Chip, EmptyState } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Segmented } from '../components/ui/Form';
import { EmojiPicker } from '../components/ui/EmojiPicker';
import { Avatar } from '../components/ui/Avatar';
import { StudentPicker } from '../components/students/StudentPicker';
import { COLORS } from '../data/defaults';
import { RULE_LABELS, describeRule } from '../utils/rules';
import { uid } from '../utils/id';
import { cn } from '../components/ui/cn';

const blank = (): Badge => ({ id: '', name: '', icon: '🏅', description: '', color: COLORS[0], rule: { type: 'manual' } });

export default function Badges() {
  const { state, update } = useStore();
  const { grantBadge } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<Badge | null>(null);
  const [granting, setGranting] = useState<Badge | null>(null);
  const [grantTo, setGrantTo] = useState<ID | null>(null);
  const [filter, setFilter] = useState<'all' | 'auto' | 'manual'>('all');

  const list = state.badges.filter((b) => filter === 'all' || (filter === 'manual' ? b.rule.type === 'manual' : b.rule.type !== 'manual'));

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ variant: 'error', icon: '✏️', title: 'اكتب اسم الشارة' });
      return;
    }
    const b = { ...editing, name: editing.name.trim() };
    if (b.rule.type === 'reasonCount' && !b.rule.reasonId) b.rule = { ...b.rule, reasonId: state.reasons[0]?.id };
    update((s) => ({
      ...s,
      badges: b.id ? s.badges.map((x) => (x.id === b.id ? b : x)) : [...s.badges, { ...b, id: uid('b') }],
    }));
    toast({ icon: b.icon, title: b.id ? 'تم تحديث الشارة' : 'تم إنشاء الشارة 🎉' });
    setEditing(null);
  };

  const remove = async (b: Badge) => {
    const ok = await confirm({ title: `حذف شارة «${b.name}»؟`, message: 'ستُزال الشارة من جميع الطلاب الذين يملكونها.', danger: true, confirmText: 'حذف', icon: b.icon });
    if (!ok) return;
    update((s) => ({ ...s, badges: s.badges.filter((x) => x.id !== b.id), students: s.students.map((st) => ({ ...st, badges: st.badges.filter((x) => x.badgeId !== b.id) })) }));
  };

  const setRule = (type: BadgeRuleType) =>
    setEditing((e) => e && { ...e, rule: { type, threshold: type === 'manual' ? undefined : e.rule.threshold ?? 5, reasonId: type === 'reasonCount' ? e.rule.reasonId ?? state.reasons[0]?.id : undefined } });

  return (
    <div>
      <PageHeader
        icon="🏅"
        title="الشارات والإنجازات"
        subtitle="شارات تلقائية تُمنح عند تحقق الشروط، وأخرى يمنحها المعلم يدويًا"
        actions={<Button icon={<Plus size={18} />} onClick={() => setEditing(blank())}>شارة جديدة</Button>}
      />
      <Segmented className="mb-5" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'كل الشارات' }, { value: 'auto', label: '⚡ تلقائية' }, { value: 'manual', label: '✋ يدوية' }]} />

      {list.length === 0 && <EmptyState icon="🏅" title="لا توجد شارات" />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((b) => {
          const holders = state.students.filter((s) => s.badges.some((x) => x.badgeId === b.id));
          return (
            <div key={b.id} className="glass group relative overflow-hidden rounded-[1.75rem] p-5 transition hover:-translate-y-1">
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition group-hover:opacity-50" style={{ background: b.color }} />
              <div className="relative flex items-start gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-5xl shadow-lg transition group-hover:rotate-6 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${b.color}33, ${b.color}77)` }}>
                  {b.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-bold">{b.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{b.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Chip color={b.rule.type === 'manual' ? '#64748b' : '#10b981'}>{b.rule.type === 'manual' ? '✋ يدوية' : '⚡ تلقائية'}</Chip>
                    <Chip>{describeRule(b.rule, state.reasons)}</Chip>
                  </div>
                </div>
              </div>
              <div className="relative mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center">
                  <div className="flex -space-x-2 space-x-reverse">
                    {holders.slice(0, 5).map((s) => (
                      <Avatar key={s.id} student={s} size="xs" />
                    ))}
                  </div>
                  <span className="ms-2 text-sm text-slate-500">{holders.length ? `${holders.length} طالب` : 'لم يحصل عليها أحد بعد'}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => { setGranting(b); setGrantTo(null); }}>منح</Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditing({ ...b, rule: { ...b.rule } })} aria-label="تعديل"><Pencil size={16} /></Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 hover:text-rose-600" onClick={() => void remove(b)} aria-label="حذف"><Trash2 size={16} /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? '✏️ تعديل الشارة' : '✨ شارة جديدة'}
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={save}>حفظ</Button></>}
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم الشارة"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="مثال: بطل الرياضيات" /></Field>
              <Field label="الوصف"><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="متى يحصل عليها الطالب؟" /></Field>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">الأيقونة</p>
              <EmojiPicker value={editing.icon} onChange={(icon) => setEditing({ ...editing, icon })} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">اللون</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })} className={cn('h-8 w-8 rounded-full', editing.color === c && 'ring-4 ring-offset-2 ring-violet-400 dark:ring-offset-slate-900')} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              <p className="mb-2 font-bold">⚙️ شرط الحصول عليها</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="النوع" className="sm:col-span-1">
                  <Select value={editing.rule.type} onChange={(e) => setRule(e.target.value as BadgeRuleType)}>
                    {Object.entries(RULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                {editing.rule.type !== 'manual' && (
                  <Field label="العدد المطلوب">
                    <Input type="number" min={1} value={editing.rule.threshold ?? 1} onChange={(e) => setEditing({ ...editing, rule: { ...editing.rule, threshold: Math.max(1, Number(e.target.value) || 1) } })} />
                  </Field>
                )}
                {editing.rule.type === 'reasonCount' && (
                  <Field label="السبب">
                    <Select value={editing.rule.reasonId ?? ''} onChange={(e) => setEditing({ ...editing, rule: { ...editing.rule, reasonId: e.target.value } })}>
                      {state.reasons.map((r) => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
                    </Select>
                  </Field>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">{describeRule(editing.rule, state.reasons)}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!granting}
        onClose={() => setGranting(null)}
        title={granting ? `${granting.icon} منح شارة «${granting.name}»` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGranting(null)}>إلغاء</Button>
            <Button
              disabled={!grantTo}
              onClick={() => {
                if (granting && grantTo) grantBadge(grantTo, granting.id);
                setGranting(null);
              }}
            >
              🏅 منح الشارة
            </Button>
          </>
        }
      >
        <StudentPicker students={state.students.filter((s) => !granting || !s.badges.some((x) => x.badgeId === granting.id))} value={grantTo} onChange={setGrantTo} />
      </Modal>
    </div>
  );
}
