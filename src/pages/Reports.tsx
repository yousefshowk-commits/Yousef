import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import type { AppState } from '../types';
import { useStore } from '../store/AppStore';
import { useStudentStats } from '../hooks/useStudentStats';
import { PageHeader, StatCard } from '../components/ui/misc';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Form';
import { ColumnChart, MultiLineChart, RankedBars, TrendChart } from '../components/charts/Charts';
import { badgeCounts, dailySeries, earnedBetween, isEarning, monthlySeries, reasonBreakdown, rewardUsage, weeklySeries } from '../services/stats';
import { formatDate, formatMonth, formatShortDate, startOfMonth, startOfWeek } from '../utils/date';
import { num } from '../utils/format';

function groupWeekly(state: AppState, weeks: number) {
  const base = weeklySeries([], weeks);
  const rows = base.map((w) => ({ label: formatShortDate(w.t) } as Record<string, string | number>));
  const memberOf = new Map(state.students.map((s) => [s.id, s.groupId]));
  for (const g of state.groups) rows.forEach((r) => (r[g.id] = 0));
  for (const e of state.log) {
    if (!isEarning(e)) continue;
    const gid = e.groupId ?? (e.studentId ? memberOf.get(e.studentId) : undefined);
    if (!gid || !state.groups.some((g) => g.id === gid)) continue;
    for (let i = base.length - 1; i >= 0; i--) {
      if (e.createdAt >= base[i].t) {
        rows[i][gid] = (rows[i][gid] as number) + e.amount;
        break;
      }
    }
  }
  return rows;
}

export default function Reports() {
  const { state } = useStore();
  const stats = useStudentStats(state);
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? '');

  const weekly = useMemo(() => weeklySeries(state.log, 8).map((w) => ({ label: formatShortDate(w.t), value: w.points })), [state.log]);
  const monthly = useMemo(() => monthlySeries(state.log, 6).map((m) => ({ label: formatMonth(m.t), value: m.points })), [state.log]);
  const daily = useMemo(() => dailySeries(state.log, 30).map((d) => ({ label: formatShortDate(d.t), value: d.count })), [state.log]);
  const reasons = useMemo(() => reasonBreakdown(state).map((r) => ({ label: `${r.reason.icon} ${r.reason.label}`, value: r.count })), [state]);
  const rewards = useMemo(() => rewardUsage(state).map((r) => ({ label: `${r.reward.icon} ${r.reward.name}`, value: r.count })), [state]);
  const badges = useMemo(() => badgeCounts(state).filter((b) => b.count > 0).map((b) => ({ label: `${b.badge.icon} ${b.badge.name}`, value: b.count })), [state]);
  const groupsRows = useMemo(() => groupWeekly(state, 6), [state]);
  const studentWeeks = useMemo(() => (studentId ? weeklySeries(state.log, 8, studentId).map((w) => ({ label: formatShortDate(w.t), value: w.points })) : []), [state.log, studentId]);

  const weekPts = earnedBetween(state.log, startOfWeek());
  const monthPts = earnedBetween(state.log, startOfMonth());
  const activeToday = new Set(state.log.filter((e) => isEarning(e) && e.createdAt >= new Date().setHours(0, 0, 0, 0)).map((e) => e.studentId)).size;
  const avg = state.students.length ? Math.round(state.students.reduce((n, s) => n + s.totalEarned, 0) / state.students.length) : 0;
  const table = [...state.students].sort((a, b) => b.totalEarned - a.totalEarned);

  return (
    <div className="space-y-5">
      <PageHeader icon="📊" title="التقارير" subtitle={`${state.settings.className} — ${formatDate(Date.now())}`} actions={<Button variant="outline" icon={<Printer size={18} />} onClick={() => window.print()}>طباعة التقرير</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="📅" label="نقاط هذا الأسبوع" value={num(weekPts)} />
        <StatCard icon="🗓️" label="نقاط هذا الشهر" value={num(monthPts)} />
        <StatCard icon="🙋" label="طلاب نشطون اليوم" value={`${activeToday}/${state.students.length}`} />
        <StatCard icon="📈" label="متوسط نقاط الطالب" value={num(avg)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardTitle icon="📅" title="النقاط الأسبوعية (8 أسابيع)" /><ColumnChart data={weekly} highlightLast name="نقاط الأسبوع" /></Card>
        <Card><CardTitle icon="🗓️" title="النقاط الشهرية (6 أشهر)" /><ColumnChart data={monthly} highlightLast name="نقاط الشهر" /></Card>
        <Card className="lg:col-span-2"><CardTitle icon="⚡" title="نشاط الفصل — عدد مرات التعزيز يوميًا (30 يومًا)" /><TrendChart data={daily} name="مرات التعزيز" /></Card>
        <Card><CardTitle icon="🏷️" title="أكثر أسباب منح النقاط" />{reasons.length ? <RankedBars data={reasons} name="مرات" /> : <p className="py-8 text-center text-slate-500">لا توجد بيانات</p>}</Card>
        <Card><CardTitle icon="🎁" title="المكافآت الأكثر استخدامًا" />{rewards.length ? <RankedBars data={rewards} name="مرات الاستبدال" /> : <p className="py-8 text-center text-slate-500">لم تُستبدل مكافآت بعد</p>}</Card>
        <Card><CardTitle icon="🏅" title="الشارات المكتسبة" />{badges.length ? <RankedBars data={badges} name="عدد الطلاب" /> : <p className="py-8 text-center text-slate-500">لا توجد شارات مكتسبة</p>}</Card>
        <Card>
          <CardTitle icon="👥" title="تقدم المجموعات (6 أسابيع)" />
          <MultiLineChart data={groupsRows} series={state.groups.map((g) => ({ key: g.id, name: `${g.emoji} ${g.name}`, color: g.color }))} />
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle
            icon="🌱"
            title="تطور الطالب"
            action={
              <div className="no-print flex items-center gap-2">
                <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-10 w-48 py-0" aria-label="اختر طالبًا">
                  {state.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                {studentId && <Link to={`/students/${studentId}`} className="whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-300">🖨️ تقرير الطالب</Link>}
              </div>
            }
          />
          {studentId ? <ColumnChart data={studentWeeks} highlightLast name="نقاط الأسبوع" /> : <p className="py-8 text-center text-slate-500">لا يوجد طلاب</p>}
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardTitle icon="📋" title="جدول الطلاب" />
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-white/10">
              <th className="p-2 text-start">#</th>
              <th className="p-2 text-start">الطالب</th>
              <th className="p-2 text-start">المستوى</th>
              <th className="p-2 text-start">⭐ المكتسب</th>
              <th className="p-2 text-start">💎 الرصيد</th>
              <th className="p-2 text-start">🎁 المصروف</th>
              <th className="p-2 text-start">🏅 الشارات</th>
              <th className="p-2 text-start">📅 هذا الأسبوع</th>
              <th className="p-2 text-start">🔥 التزام</th>
            </tr>
          </thead>
          <tbody>
            {table.map((s, i) => {
              const st = stats.get(s.id)!;
              return (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <td className="p-2 text-slate-400">{i + 1}</td>
                  <td className="p-2 font-bold"><Link to={`/students/${s.id}`} className="hover:text-indigo-600">{s.avatar} {s.name}</Link></td>
                  <td className="p-2">{st.level.level.icon} {st.level.level.name}</td>
                  <td className="p-2 font-bold">{num(s.totalEarned)}</td>
                  <td className="p-2">{num(s.points)}</td>
                  <td className="p-2">{num(s.totalSpent)}</td>
                  <td className="p-2">{s.badges.length}</td>
                  <td className="p-2">{num(st.week)}</td>
                  <td className="p-2">{st.streak}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
