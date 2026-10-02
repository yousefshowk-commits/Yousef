import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import type { Level, RankingMode, Settings } from '../types';
import { useStore } from '../store/AppStore';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/misc';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Segmented, Toggle } from '../components/ui/Form';
import { createDemoState, createEmptyState } from '../data/demo';
import { downloadBackup, readBackup } from '../services/storage';
import { play } from '../services/sound';
import { sortedLevels } from '../services/stats';
import { uid } from '../utils/id';

function Section({ icon, title, children, id }: { icon: string; title: string; children: ReactNode; id?: string }) {
  return (
    <Card id={id}>
      <CardTitle icon={icon} title={title} />
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const { state, update } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { settings } = state;
  const [amounts, setAmounts] = useState(settings.quickAmounts.join('، '));
  const [newMsg, setNewMsg] = useState('');

  const set = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const setLevel = (idx: number, patch: Partial<Level>) =>
    update((s) => ({ ...s, levels: sortedLevels(s.levels).map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  /** Re-sort by points and renumber so level ids always read 1..n. */
  const normalizeLevels = () =>
    update((s) => ({ ...s, levels: sortedLevels(s.levels).map((l, i) => ({ ...l, id: i + 1, minPoints: i === 0 ? 0 : l.minPoints })) }));

  const saveAmounts = () => {
    const list = [...new Set(amounts.split(/[,،\s]+/).map((x) => Math.floor(Number(x))).filter((x) => x > 0 && x <= 1000))].slice(0, 4);
    if (!list.length) {
      toast({ variant: 'error', icon: '⚠️', title: 'أدخل أرقامًا صحيحة' });
      return;
    }
    set({ quickAmounts: list });
    setAmounts(list.join('، '));
    toast({ icon: '⭐', title: 'تم حفظ الأزرار السريعة' });
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      const data = await readBackup(file);
      const ok = await confirm({ title: 'استيراد النسخة الاحتياطية؟', message: `سيتم استبدال جميع البيانات الحالية ببيانات الملف (${data.students.length} طالب).`, confirmText: 'استيراد', danger: true, icon: '📥' });
      if (!ok) return;
      update(() => ({ ...data, settings: { ...data.settings, onboarded: true } }));
      toast({ icon: '📥', title: 'تم استيراد النسخة الاحتياطية بنجاح' });
    } catch (e) {
      toast({ variant: 'error', icon: '⚠️', title: 'تعذر الاستيراد', description: e instanceof Error ? e.message : undefined });
    }
  };

  const resetPoints = async () => {
    if (!(await confirm({ title: 'تصفير النقاط والسجل؟', message: 'سيبقى الطلاب والمجموعات والإعدادات، وتُحذف النقاط والشارات والسجل. ننصح بتصدير نسخة احتياطية أولًا.', confirmText: 'تصفير', danger: true, icon: '🔄' }))) return;
    update((s) => ({
      ...s,
      log: [],
      achievements: [],
      dailyDone: {},
      challenge: { ...s.challenge, startAt: Date.now(), completedAt: undefined },
      students: s.students.map((st) => ({ ...st, points: 0, totalEarned: 0, totalSpent: 0, badges: [] })),
    }));
    toast({ icon: '🔄', title: 'تم تصفير النقاط — بداية جديدة!' });
  };

  const loadDemo = async () => {
    if (!(await confirm({ title: 'تحميل البيانات التجريبية؟', message: 'سيتم استبدال بياناتك الحالية ببيانات تجريبية.', confirmText: 'تحميل', danger: true, icon: '🎮' }))) return;
    update(() => ({ ...createDemoState(), settings: { ...createDemoState().settings, onboarded: true } }));
    toast({ icon: '🎮', title: 'تم تحميل البيانات التجريبية' });
  };

  const wipe = async () => {
    if (!(await confirm({ title: 'حذف بيانات هذا الفصل؟', message: 'سيتم حذف طلاب هذا الفصل ونقاطهم وإعداداته والعودة لشاشة الإعداد. الفصول الأخرى لن تتأثر. لا يمكن التراجع!', confirmText: 'حذف', danger: true, icon: '🗑️' }))) return;
    window.location.hash = '#/setup';
    update(() => createEmptyState({ isDemo: false, onboarded: false, theme: settings.theme }));
  };

  return (
    <div className="space-y-5">
      <PageHeader icon="⚙️" title="الإعدادات" subtitle="خصّص النظام ليناسب فصلك" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon="🏫" title="معلومات الفصل">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم المدرسة"><Input value={settings.schoolName} onChange={(e) => set({ schoolName: e.target.value })} /></Field>
            <Field label="اسم المعلم/المعلمة"><Input value={settings.teacherName} onChange={(e) => set({ teacherName: e.target.value })} /></Field>
            <Field label="اسم الفصل"><Input value={settings.className} onChange={(e) => set({ className: e.target.value })} /></Field>
            <Field label="الفصل الدراسي"><Input value={settings.term} onChange={(e) => set({ term: e.target.value })} /></Field>
          </div>
        </Section>

        <Section icon="🎛️" title="التفضيلات">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="font-bold">🌓 المظهر</span>
              <Segmented value={settings.theme} onChange={(theme) => set({ theme })} options={[{ value: 'light', label: '☀️ فاتح' }, { value: 'dark', label: '🌙 داكن' }]} />
            </div>
            <Toggle checked={settings.sound} onChange={(sound) => { set({ sound }); if (sound) setTimeout(() => play('points'), 50); }} label="🔊 الأصوات" description="أصوات النقاط والشارات والمستويات والعجلة والاحتفال" />
            <Toggle checked={settings.animations} onChange={(animations) => set({ animations })} label="✨ المؤثرات الحركية" description="Confetti والحركات والانتقالات" />
            <Toggle checked={settings.allowDeduction} onChange={(allowDeduction) => set({ allowDeduction })} label="➖ السماح بخصم النقاط" description="غير مفعّل افتراضيًا — النظام يركز على التعزيز الإيجابي. الخصم يؤثر على الرصيد فقط ولا يُنزل المستوى." />
            <div className="p-3">
              <p className="mb-2 font-bold">🏆 طريقة عرض الترتيب</p>
              <Segmented<RankingMode>
                value={settings.rankingMode}
                onChange={(rankingMode) => set({ rankingMode })}
                options={[{ value: 'individual', label: 'ترتيب فردي' }, { value: 'personal', label: 'تقدم شخصي فقط' }, { value: 'groups', label: 'ترتيب المجموعات' }]}
              />
            </div>
            <div className="flex flex-wrap items-end gap-2 p-3">
              <Field label="⭐ أزرار النقاط السريعة (حتى 4)" className="flex-1"><Input value={amounts} onChange={(e) => setAmounts(e.target.value)} placeholder="1، 2، 5، 10" /></Field>
              <Button variant="secondary" onClick={saveAmounts}>حفظ</Button>
            </div>
          </div>
        </Section>

        <Section icon="🚀" title="المستويات">
          <div className="space-y-2">
            {sortedLevels(state.levels).map((l, i) => (
              <div key={`${l.id}-${i}`} className="grid grid-cols-[3.25rem_1fr_6rem_2.5rem_2.5rem] items-center gap-2">
                <Input value={l.icon} onChange={(e) => setLevel(i, { icon: e.target.value.slice(0, 4) })} className="px-1 text-center text-xl" aria-label="أيقونة المستوى" />
                <Input value={l.name} onChange={(e) => setLevel(i, { name: e.target.value })} aria-label="اسم المستوى" />
                <Input type="number" min={0} disabled={i === 0} value={l.minPoints} onChange={(e) => setLevel(i, { minPoints: Math.max(0, Number(e.target.value) || 0) })} onBlur={normalizeLevels} aria-label="النقاط المطلوبة" />
                <input type="color" value={l.color} onChange={(e) => setLevel(i, { color: e.target.value })} className="h-10 w-10 cursor-pointer rounded-xl border-0 bg-transparent" aria-label="لون المستوى" />
                <button
                  disabled={i === 0 || state.levels.length <= 2}
                  onClick={() => update((s) => ({ ...s, levels: sortedLevels(s.levels).filter((_, j) => j !== i).map((x, j) => ({ ...x, id: j + 1 })) }))}
                  className="grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-500/10"
                  aria-label="حذف المستوى"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">الرقم = مجموع النقاط المكتسبة المطلوبة للوصول للمستوى. تتم الترقية تلقائيًا.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            icon={<Plus size={16} />}
            onClick={() => update((s) => {
              const top = sortedLevels(s.levels).at(-1)!;
              return { ...s, levels: [...s.levels, { id: s.levels.length + 1, name: 'مستوى جديد', icon: '🌟', minPoints: top.minPoints + 300, color: '#f43f5e' }] };
            })}
          >
            إضافة مستوى
          </Button>
        </Section>

        <Section icon="🏷️" title="أسباب منح النقاط">
          <div className="space-y-2">
            {state.reasons.map((r) => (
              <div key={r.id} className="grid grid-cols-[3.25rem_1fr_2.5rem] items-center gap-2">
                <Input value={r.icon} onChange={(e) => update((s) => ({ ...s, reasons: s.reasons.map((x) => (x.id === r.id ? { ...x, icon: e.target.value.slice(0, 4) } : x)) }))} className="px-1 text-center text-xl" aria-label="أيقونة" />
                <Input value={r.label} onChange={(e) => update((s) => ({ ...s, reasons: s.reasons.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)) }))} aria-label="السبب" />
                <button
                  disabled={state.reasons.length <= 1}
                  onClick={() => update((s) => ({ ...s, reasons: s.reasons.filter((x) => x.id !== r.id) }))}
                  className="grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-500/10"
                  aria-label="حذف السبب"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-3" icon={<Plus size={16} />} onClick={() => update((s) => ({ ...s, reasons: [...s.reasons, { id: uid('r'), label: 'سبب جديد', icon: '⭐' }] }))}>
            إضافة سبب
          </Button>
        </Section>

        <Section icon="❤️" title="رسائل التعزيز الإيجابي">
          <div className="flex flex-wrap gap-2">
            {state.encouragements.map((m, i) => (
              <span key={`${m}-${i}`} className="flex items-center gap-1 rounded-full bg-pink-50 py-1 pe-1 ps-3 text-sm font-bold text-pink-700 dark:bg-pink-500/10 dark:text-pink-200">
                {m}
                <button onClick={() => update((s) => ({ ...s, encouragements: s.encouragements.filter((_, j) => j !== i) }))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-pink-100 dark:hover:bg-pink-500/20" aria-label="حذف">×</button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="رسالة تشجيعية جديدة…" onKeyDown={(e) => { if (e.key === 'Enter' && newMsg.trim()) { update((s) => ({ ...s, encouragements: [...s.encouragements, newMsg.trim()] })); setNewMsg(''); } }} />
            <Button disabled={!newMsg.trim()} onClick={() => { update((s) => ({ ...s, encouragements: [...s.encouragements, newMsg.trim()] })); setNewMsg(''); }}>إضافة</Button>
          </div>
        </Section>

        <Section icon="🧩" title="إدارة العناصر">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { to: '/badges', label: 'الشارات', icon: '🏅' },
              { to: '/shop', label: 'المكافآت', icon: '🎁' },
              { to: '/groups', label: 'المجموعات', icon: '👥' },
              { to: '/challenge', label: 'الهدف الجماعي', icon: '🎯' },
              { to: '/wheel', label: 'عجلة الحظ', icon: '🎡' },
              { to: '/students', label: 'الطلاب', icon: '👦' },
            ].map((x) => (
              <Link key={x.to} to={x.to} className="flex flex-col items-center gap-1 rounded-2xl bg-slate-50 p-4 font-bold transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-indigo-500/10">
                <span className="text-3xl">{x.icon}</span>
                {x.label}
              </Link>
            ))}
          </div>
        </Section>

        <Section icon="💾" title="البيانات والنسخ الاحتياطي" id="data">
          <p className="mb-4 text-sm text-slate-500">تُحفظ البيانات تلقائيًا في هذا المتصفح. النسخة الاحتياطية تخص الفصل الحالي فقط، والاستيراد يستبدل بيانات الفصل الحالي. لإدارة الفصول افتح صفحة «فصولي».</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="success" icon={<Download size={18} />} onClick={() => { downloadBackup(state); toast({ icon: '💾', title: 'تم تصدير النسخة الاحتياطية' }); }}>💾 تصدير نسخة احتياطية</Button>
            <Button variant="secondary" icon={<Upload size={18} />} onClick={() => fileRef.current?.click()}>📥 استيراد نسخة احتياطية</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3 dark:border-white/10">
            <Button variant="outline" size="sm" onClick={() => void resetPoints()}>🔄 تصفير النقاط</Button>
            <Button variant="outline" size="sm" onClick={() => void loadDemo()}>🎮 بيانات تجريبية</Button>
            <Button variant="danger" size="sm" onClick={() => void wipe()}>🗑️ حذف بيانات الفصل</Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
