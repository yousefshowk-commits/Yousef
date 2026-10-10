import { useMemo, useState } from 'react';
import { useStore } from '../store/AppStore';
import { useFx } from '../store/FxProvider';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/misc';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Form';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { ColumnChart } from '../components/charts/Charts';
import { challengeProgress, dailyChallenge, dailyChallengeProgress, dailySeries, earnedBetween } from '../services/stats';
import { formatDate, formatShortDate, formatWeekday, startOfWeek } from '../utils/date';
import { num, pct } from '../utils/format';
import { uid } from '../utils/id';

export default function ChallengePage() {
  const { state, update } = useStore();
  const fx = useFx();
  const confirm = useConfirm();
  const toast = useToast();
  const ch = state.challenge;
  const progress = challengeProgress(state);
  const percent = pct(progress, ch.target);
  const [form, setForm] = useState({ title: ch.title, target: String(ch.target), reward: ch.reward });

  const days = useMemo(() => dailySeries(state.log, 7).map((d) => ({ label: formatWeekday(d.t), value: d.points })), [state.log]);
  const contributors = useMemo(
    () =>
      state.students
        .map((s) => ({ s, p: earnedBetween(state.log, ch.startAt, Infinity, s.id) }))
        .filter((x) => x.p > 0)
        .sort((a, b) => b.p - a.p)
        .slice(0, 8),
    [state.students, state.log, ch.startAt],
  );
  const daily = dailyChallenge();
  const dailyP = dailyChallengeProgress(state);

  const saveEdit = () => {
    const target = Math.max(10, Number(form.target) || 0);
    update((s) => ({ ...s, challenge: { ...s.challenge, title: form.title.trim() || 'تحدي الفصل', reward: form.reward.trim(), target, completedAt: s.challenge.completedAt && challengeProgress(s) >= target ? s.challenge.completedAt : undefined } }));
    toast({ icon: '🎯', title: 'تم حفظ التحدي' });
  };

  const startNew = async () => {
    const ok = await confirm({ title: 'بدء تحدٍ جديد؟', message: 'سيبدأ عدّاد النقاط من الصفر اعتبارًا من الآن. يبقى سجل الإنجازات محفوظًا.', confirmText: 'ابدأ', icon: '🚀' });
    if (!ok) return;
    const target = Math.max(10, Number(form.target) || ch.target);
    update((s) => ({ ...s, challenge: { title: form.title.trim() || 'تحدي الفصل', reward: form.reward.trim(), target, startAt: Date.now() } }));
    toast({ icon: '🚀', title: 'انطلق تحدٍ جديد!' });
  };

  const markDone = () => {
    if (ch.completedAt) return;
    update((s) => ({
      ...s,
      challenge: { ...s.challenge, completedAt: Date.now() },
      achievements: [...s.achievements, { id: uid('a'), title: `${ch.title}: ${ch.reward}`, icon: '🏆', achievedAt: Date.now() }],
    }));
    fx.celebrate({ title: 'إنجاز جماعي رائع! 🏆', subtitle: `${ch.title} — ${ch.reward}`, icon: '🏆' });
  };

  const oldWeek = ch.startAt < startOfWeek() && !ch.completedAt;

  return (
    <div className="space-y-5">
      <PageHeader icon="🎯" title="تحدي الفصل" subtitle="Classroom Challenge — نعمل معًا لهدف واحد!" />

      <Card className="relative overflow-hidden p-6 text-center sm:p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-orange-400/10" />
        <div className="relative">
          <div className="animate-float mx-auto text-7xl">{ch.completedAt ? '🏆' : '🎯'}</div>
          <h2 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">{ch.title}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            “إذا وصل الفصل إلى <b className="text-indigo-600 dark:text-indigo-300">{num(ch.target)}</b> نقطة، يحصل الجميع على: <b>{ch.reward}</b>”
          </p>
          <p className="mt-1 text-sm text-slate-400">منذ {formatDate(ch.startAt)}</p>
          <div className="mx-auto mt-8 max-w-3xl">
            <ProgressBar value={percent} height="xl" striped label={<span className="font-display text-xl">{percent}%</span>} />
            <p className="font-display mt-4 text-4xl font-extrabold sm:text-5xl">
              <span className="text-gradient">{num(Math.min(progress, ch.target))}</span> <span className="text-slate-400">/ {num(ch.target)}</span> ⭐
            </p>
            {!ch.completedAt && <p className="mt-2 text-slate-500">باقي {num(Math.max(0, ch.target - progress))} نقطة فقط! 💪</p>}
          </div>
          {ch.completedAt ? (
            <div className="mt-6 space-y-3">
              <p className="text-xl font-bold text-emerald-600">🏆 أنجز الفصل التحدي في {formatDate(ch.completedAt)}</p>
              <Button variant="warning" onClick={() => fx.celebrate({ title: 'إنجاز جماعي رائع! 🏆', subtitle: `${ch.title} — ${ch.reward}`, icon: '🏆' })}>🎉 احتفلوا مرة أخرى</Button>
            </div>
          ) : (
            <Button variant="outline" className="mt-6" onClick={markDone}>✔️ اعتبار التحدي منجزًا</Button>
          )}
          {oldWeek && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">📅 بدأ هذا التحدي في أسبوع سابق — يمكنك بدء تحدٍ جديد لهذا الأسبوع.</p>}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon="📊" title="نقاط الفصل — آخر 7 أيام" />
          <ColumnChart data={days} height={230} highlightLast name="نقاط اليوم" />
        </Card>
        <Card>
          <CardTitle icon="🤝" title="أبطال التحدي" />
          <p className="mb-3 text-sm text-slate-500">كل نقطة يجمعها أي طالب تقرّب الفصل من الهدف</p>
          <ul className="space-y-2">
            {contributors.map(({ s, p }) => (
              <li key={s.id} className="flex items-center gap-2">
                <Avatar student={s} size="xs" ring={false} />
                <span className="flex-1 truncate font-bold">{s.name}</span>
                <span className="font-bold text-amber-500">+{num(p)}</span>
              </li>
            ))}
            {!contributors.length && <li className="text-slate-500">لا توجد نقاط بعد</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon="📅" title="التحدي اليومي" />
          <div className="flex items-center gap-4">
            <span className="animate-float text-6xl">{daily.icon}</span>
            <div className="flex-1">
              <p className="text-lg font-bold">{daily.text}</p>
              <ProgressBar className="mt-2" value={pct(dailyP, daily.target)} color="linear-gradient(90deg,#10b981,#06b6d4)" />
              <p className="mt-1 text-sm text-slate-500">{num(Math.min(dailyP, daily.target))} / {daily.target} — يتجدد التحدي كل يوم تلقائيًا</p>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle icon="⚙️" title="إعداد التحدي" />
          <div className="space-y-3">
            <Field label="اسم التحدي"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="الهدف (نقاط)"><Input type="number" min={10} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
              <Field label="المكافأة الجماعية" className="col-span-2"><Input value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveEdit}>💾 حفظ التعديلات</Button>
              <Button variant="secondary" onClick={() => void startNew()}>🚀 بدء تحدٍ جديد</Button>
            </div>
          </div>
        </Card>
      </div>

      {state.achievements.length > 0 && (
        <Card>
          <CardTitle icon="🏆" title="سجل الإنجازات الجماعية" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...state.achievements].reverse().map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
                <span className="text-3xl">{a.icon}</span>
                <span className="flex-1 font-bold">{a.title}</span>
                <span className="text-sm text-slate-500">{formatShortDate(a.achievedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
