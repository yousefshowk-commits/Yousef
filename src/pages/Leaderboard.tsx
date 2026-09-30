import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RankingMode, Student } from '../types';
import { useStore } from '../store/AppStore';
import { PageHeader } from '../components/ui/misc';
import { Card } from '../components/ui/Card';
import { Segmented } from '../components/ui/Form';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { GroupRace } from '../components/GroupRace';
import { earnedBetween, levelInfo } from '../services/stats';
import { startOfMonth, startOfWeek } from '../utils/date';
import { num } from '../utils/format';
import { cn } from '../components/ui/cn';

type Period = 'week' | 'month' | 'all';

export default function Leaderboard() {
  const { state } = useStore();
  const mode = state.settings.rankingMode;
  const [tab, setTab] = useState<RankingMode>(mode);
  const [period, setPeriod] = useState<Period>('week');

  const scored = useMemo(() => {
    const from = period === 'week' ? startOfWeek() : period === 'month' ? startOfMonth() : 0;
    return state.students
      .map((s) => ({ s, score: period === 'all' ? s.totalEarned : earnedBetween(state.log, from, Infinity, s.id) }))
      .sort((a, b) => b.score - a.score);
  }, [state.students, state.log, period]);

  const personal = useMemo(() => {
    const w = startOfWeek();
    const prev = new Date(w);
    prev.setDate(prev.getDate() - 7);
    return state.students
      .map((s) => {
        const thisWeek = earnedBetween(state.log, w, Infinity, s.id);
        const lastWeek = earnedBetween(state.log, prev.getTime(), w, s.id);
        return { s, thisWeek, lastWeek, diff: thisWeek - lastWeek };
      })
      .sort((a, b) => a.s.name.localeCompare(b.s.name, 'ar'));
  }, [state.students, state.log]);

  const tabs = [
    ...(mode === 'individual' ? [{ value: 'individual' as const, label: '🏆 الترتيب الفردي' }] : []),
    { value: 'personal' as const, label: '📈 التقدم الشخصي' },
    { value: 'groups' as const, label: '👥 ترتيب المجموعات' },
  ];
  const activeTab = tab === 'individual' && mode !== 'individual' ? 'personal' : tab;
  const badgeIcons = (s: Student) => state.badges.filter((b) => s.badges.some((x) => x.badgeId === b.id));
  const podium = [scored[1], scored[0], scored[2]];
  const heights = ['h-28', 'h-40', 'h-20'];
  const medals = ['🥈', '🥇', '🥉'];
  const podiumColors = ['from-slate-300 to-slate-400', 'from-amber-300 to-amber-500', 'from-orange-300 to-orange-500'];

  return (
    <div className="space-y-5">
      <PageHeader icon="🏆" title="لوحة المتصدرين" subtitle="احتفل بالمتميزين وشجّع الجميع على التقدم" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={activeTab} onChange={setTab} options={tabs} />
        {activeTab === 'individual' && (
          <Segmented value={period} onChange={setPeriod} options={[{ value: 'week', label: 'هذا الأسبوع' }, { value: 'month', label: 'هذا الشهر' }, { value: 'all', label: 'الكل' }]} />
        )}
      </div>
      {mode !== 'individual' && (
        <p className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
          🔒 الترتيب الفردي مخفي حسب الإعدادات — يتم التركيز على التقدم الشخصي وترتيب المجموعات. <Link to="/settings" className="font-bold underline">تغيير</Link>
        </p>
      )}

      {activeTab === 'individual' && (
        <>
          <Card className="overflow-hidden pt-10">
            <div className="mx-auto flex max-w-2xl items-end justify-center gap-2 sm:gap-5">
              {podium.map((p, i) =>
                p ? (
                  <div key={p.s.id} className="animate-slide-up flex flex-1 flex-col items-center" style={{ animationDelay: `${[0.2, 0, 0.35][i]}s` }}>
                    <span className={cn('text-4xl', i === 1 && 'animate-wiggle text-5xl')}>{i === 1 ? '👑' : medals[i]}</span>
                    <div className={cn('my-2', i === 1 && 'animate-glow rounded-full')}>
                      <Avatar student={p.s} size={i === 1 ? 'xl' : 'lg'} />
                    </div>
                    <Link to={`/students/${p.s.id}`} className="font-display w-full truncate text-center text-base font-bold hover:text-violet-600 sm:text-lg">{p.s.name}</Link>
                    <p className="font-display text-xl font-extrabold text-amber-500">{num(p.score)} ⭐</p>
                    <div className={cn('mt-2 flex w-full flex-col items-center justify-start rounded-t-3xl bg-gradient-to-b pt-3 shadow-inner', heights[i], podiumColors[i])}>
                      <span className="text-4xl">{medals[i]}</span>
                      <span className="font-display text-lg font-extrabold text-white/90">المركز {[2, 1, 3][i]}</span>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex-1" />
                ),
              )}
            </div>
          </Card>
          <Card className="p-2 sm:p-3">
            <ol>
              {scored.slice(3).map((x, i) => {
                const info = levelInfo(state.levels, x.s.totalEarned);
                return (
                  <li key={x.s.id} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-white/60 dark:hover:bg-white/5">
                    <span className="font-display w-8 text-center text-lg font-bold text-slate-400">{i + 4}</span>
                    <Avatar student={x.s} size="sm" ring={false} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/students/${x.s.id}`} className="block truncate font-bold hover:text-violet-600">{x.s.name}</Link>
                      <p className="text-xs" style={{ color: info.level.color }}>{info.level.icon} {info.level.name}</p>
                    </div>
                    <span className="hidden gap-0.5 sm:flex">{badgeIcons(x.s).slice(0, 4).map((b) => <span key={b.id} title={b.name}>{b.icon}</span>)}</span>
                    <span className="font-display min-w-16 text-left text-lg font-extrabold text-amber-500">{num(x.score)} ⭐</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </>
      )}

      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {personal.map(({ s, thisWeek, lastWeek, diff }) => {
            const info = levelInfo(state.levels, s.totalEarned);
            const improving = diff > 0;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar student={s} size="md" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/students/${s.id}`} className="font-display block truncate text-lg font-bold hover:text-violet-600">{s.name}</Link>
                    <p className="text-xs" style={{ color: info.level.color }}>{info.level.icon} {info.level.name}</p>
                  </div>
                  <span className={cn('rounded-xl px-2 py-1 text-sm font-bold', improving ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : diff === 0 ? 'bg-slate-100 text-slate-500 dark:bg-white/5' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10')}>
                    {improving ? `📈 +${num(diff)}` : diff === 0 ? '➖ ثابت' : '💪 استمر'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5"><p className="text-slate-500">الأسبوع الماضي</p><p className="font-display text-lg font-bold">{num(lastWeek)}</p></div>
                  <div className="rounded-xl bg-violet-50 p-2 dark:bg-violet-500/10"><p className="text-slate-500">هذا الأسبوع</p><p className="font-display text-lg font-bold text-violet-600 dark:text-violet-300">{num(thisWeek)}</p></div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={info.progress} height="sm" color={info.level.color} />
                  <p className="mt-1 text-xs text-slate-500">{info.next ? `${num(info.toNext)} نقطة للمستوى التالي ${info.next.icon}` : 'أعلى مستوى 💎'}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h3 className="font-display mb-4 text-lg font-bold">📅 هذا الأسبوع</h3><GroupRace state={state} period="week" /></Card>
          <Card><h3 className="font-display mb-4 text-lg font-bold">🏁 الإجمالي</h3><GroupRace state={state} /></Card>
        </div>
      )}
      <p className="text-center text-xs text-slate-400">آخر تحديث: الآن • يتم احتساب النقاط المكتسبة فقط (لا يُخصم الاستبدال من الترتيب)</p>
    </div>
  );
}
