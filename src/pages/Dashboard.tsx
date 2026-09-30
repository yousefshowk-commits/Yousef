import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useFx } from '../store/FxProvider';
import { useConfirm } from '../components/ui/Confirm';
import { Card, CardTitle } from '../components/ui/Card';
import { StatCard } from '../components/ui/misc';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ActivityFeed } from '../components/ActivityFeed';
import { TrendChart } from '../components/charts/Charts';
import { HeroIllustration } from '../components/effects/HeroIllustration';
import {
  challengeProgress,
  dailyChallenge,
  dailyChallengeProgress,
  dailySeries,
  studentOfWeek,
  totalBadges,
  totalDistributed,
  totalRedemptions,
} from '../services/stats';
import { dayKey, formatDate, formatShortDate } from '../utils/date';
import { firstName, g, num, pct } from '../utils/format';
import { uid } from '../utils/id';

export default function Dashboard() {
  const { state, update } = useStore();
  const { undo, encourage } = useActions();
  const fx = useFx();
  const confirm = useConfirm();
  const { settings } = state;

  const sow = useMemo(() => studentOfWeek(state), [state]);
  const progress = useMemo(() => challengeProgress(state), [state]);
  const series = useMemo(() => dailySeries(state.log, 14).map((d) => ({ label: formatShortDate(d.t), value: d.points })), [state.log]);
  const recent = useMemo(() => state.log.filter((e) => e.type !== 'undo').slice(-8).reverse(), [state.log]);
  const studentsMap = useMemo(() => new Map(state.students.map((s) => [s.id, s])), [state.students]);
  const daily = dailyChallenge();
  const dailyProgress = dailyChallengeProgress(state);
  const dailyDone = !!state.dailyDone[dayKey()];
  const todayPoints = series[series.length - 1]?.value ?? 0;

  const completeDaily = () => {
    update((s) => ({
      ...s,
      dailyDone: { ...s.dailyDone, [dayKey()]: true },
      achievements: [...s.achievements, { id: uid('a'), title: `التحدي اليومي: ${daily.text}`, icon: daily.icon, achievedAt: Date.now() }],
    }));
    fx.celebrate({ title: 'أنجزنا تحدي اليوم! 🎯', subtitle: daily.text, icon: daily.icon });
  };

  const startMyClass = async () => {
    const ok = await confirm({
      title: 'حذف البيانات التجريبية؟',
      message: 'سيتم حذف الطلاب والنقاط التجريبية، ثم تنتقل لإعداد فصلك الحقيقي. ستبقى المكافآت والشارات والإعدادات الافتراضية.',
      confirmText: 'نعم، ابدأ فصلي',
      danger: true,
      icon: '🧹',
    });
    if (!ok) return;
    window.location.hash = '#/setup';
    update((s) => ({ ...s, settings: { ...s.settings, onboarded: false } }));
  };

  return (
    <div className="space-y-6">
      {settings.isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="font-bold text-amber-800 dark:text-amber-200">🎮 أنت تستخدم بيانات تجريبية لاستكشاف النظام.</p>
          <Button variant="warning" size="sm" onClick={startMyClass}>
            🧹 حذف البيانات التجريبية وبدء فصلي
          </Button>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-violet-600 via-fuchsia-500 to-orange-400 p-6 text-white shadow-xl shadow-violet-500/25 sm:p-8">
        <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="text-center md:text-start">
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">🏆 نظام التعزيز والمكافآت</h1>
            <p className="mt-2 text-lg text-white/90 sm:text-xl">“كل إنجاز صغير يقود إلى نجاح كبير”</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm md:justify-start">
              <span className="rounded-full bg-white/20 px-3 py-1.5 font-bold backdrop-blur">🏫 {settings.className}</span>
              <span className="rounded-full bg-white/20 px-3 py-1.5 font-bold backdrop-blur">👩‍🏫 {settings.teacherName}</span>
              <span className="rounded-full bg-white/20 px-3 py-1.5 font-bold backdrop-blur">📅 {formatDate(Date.now())}</span>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              <Link to="/students" className="rounded-2xl bg-white px-5 py-3 font-bold text-violet-700 shadow-lg transition hover:scale-105 active:scale-95">⭐ منح نقاط</Link>
              <Link to="/classroom" className="rounded-2xl bg-white/20 px-5 py-3 font-bold backdrop-blur transition hover:bg-white/30">📺 وضع الفصل</Link>
              <button onClick={() => encourage()} className="rounded-2xl bg-white/20 px-5 py-3 font-bold backdrop-blur transition hover:bg-white/30">❤️ تعزيز إيجابي</button>
            </div>
          </div>
          <HeroIllustration className="h-40 w-52 shrink-0 drop-shadow-xl sm:h-48 sm:w-64" />
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon="👦" label="عدد الطلاب" value={num(state.students.length)} gradient="from-sky-300 to-blue-500" hint={`${state.groups.length} مجموعات`} />
        <StatCard icon="⭐" label="مجموع النقاط الموزعة" value={num(totalDistributed(state))} gradient="from-amber-300 to-orange-500" hint={`اليوم: +${num(todayPoints)}`} />
        <StatCard icon="🎁" label="المكافآت الممنوحة" value={num(totalRedemptions(state))} gradient="from-pink-300 to-rose-500" />
        <StatCard icon="🏅" label="الشارات المكتسبة" value={num(totalBadges(state))} gradient="from-violet-300 to-purple-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Student of the week */}
        <Card className="relative overflow-hidden">
          <CardTitle icon="⭐" title="طالب الأسبوع" />
          {sow ? (
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="animate-glow rounded-full">
                  <Avatar student={sow.student} size="xl" className="ring-amber-300" />
                </div>
                <span className="animate-wiggle absolute -top-4 left-1/2 -translate-x-1/2 text-4xl">👑</span>
              </div>
              <p className="font-display mt-3 text-2xl font-extrabold">{sow.student.name}</p>
              <p className="text-slate-500 dark:text-slate-400">{g(sow.student.gender, 'جمع', 'جمعت')} <b className="text-amber-500">{num(sow.points)}</b> نقطة هذا الأسبوع</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => fx.celebrate({ title: `🏆 مبروك يا ${firstName(sow.student.name)}! 🏆`, subtitle: g(sow.student.gender, 'أنت طالب الأسبوع ⭐', 'أنتِ طالبة الأسبوع ⭐'), student: sow.student })}
              >
                🎉 احتفل
              </Button>
            </div>
          ) : (
            <p className="py-8 text-center text-slate-500">لم تُمنح نقاط هذا الأسبوع بعد</p>
          )}
        </Card>

        {/* Class challenge */}
        <Card>
          <CardTitle icon="🎯" title={state.challenge.title} action={<Link to="/challenge" className="text-sm font-bold text-violet-600 dark:text-violet-300">التفاصيل ←</Link>} />
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            إذا وصل الفصل إلى <b>{num(state.challenge.target)}</b> نقطة يحصل الجميع على: {state.challenge.reward}
          </p>
          <ProgressBar value={pct(progress, state.challenge.target)} height="lg" striped label={`${pct(progress, state.challenge.target)}%`} />
          <p className="font-display mt-3 text-center text-2xl font-extrabold">
            {num(Math.min(progress, state.challenge.target))} / {num(state.challenge.target)} ⭐
          </p>
          {state.challenge.completedAt && <p className="mt-2 text-center font-bold text-emerald-600">🏆 تم إنجاز التحدي!</p>}
        </Card>

        {/* Daily challenge */}
        <Card>
          <CardTitle icon="📅" title="تحدي اليوم" />
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-violet-50 p-3 dark:bg-violet-500/10">
            <span className="animate-float text-4xl">{daily.icon}</span>
            <p className="font-bold">{daily.text}</p>
          </div>
          <ProgressBar value={pct(dailyProgress, daily.target)} color="linear-gradient(90deg,#10b981,#06b6d4)" />
          <p className="mt-2 text-center text-sm text-slate-500">{num(Math.min(dailyProgress, daily.target))} / {daily.target}</p>
          {dailyDone ? (
            <p className="mt-3 text-center font-bold text-emerald-600">✅ تم إنجاز تحدي اليوم!</p>
          ) : (
            <Button variant={dailyProgress >= daily.target ? 'success' : 'outline'} size="sm" className="mt-3 w-full" onClick={completeDaily}>
              {dailyProgress >= daily.target ? '🎉 أنجزنا التحدي — احتفل!' : '✔️ تسجيل التحدي كمنجز'}
            </Button>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle icon="📈" title="تقدم الفصل — آخر 14 يومًا" action={<Link to="/reports" className="text-sm font-bold text-violet-600 dark:text-violet-300">التقارير ←</Link>} />
          <TrendChart data={series} height={260} name="نقاط اليوم" />
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle icon="🕒" title="آخر العمليات" />
          <div className="max-h-[300px] overflow-y-auto">
            <ActivityFeed entries={recent} students={studentsMap} onUndo={undo} />
          </div>
        </Card>
      </div>

      {state.achievements.length > 0 && (
        <Card>
          <CardTitle icon="🏆" title="إنجازات الفصل الجماعية" />
          <div className="flex flex-wrap gap-2">
            {[...state.achievements].reverse().slice(0, 8).map((a) => (
              <span key={a.id} className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-amber-100 to-orange-100 px-3 py-2 text-sm font-bold text-amber-900 dark:from-amber-500/15 dark:to-orange-500/15 dark:text-amber-200">
                <span className="text-xl">{a.icon}</span> {a.title} <span className="font-normal opacity-70">— {formatShortDate(a.achievedAt)}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
