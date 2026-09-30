import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Pencil, Printer, Trash2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useFx } from '../store/FxProvider';
import { useConfirm } from '../components/ui/Confirm';
import { Card, CardTitle } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Segmented, Select } from '../components/ui/Form';
import { EmptyState } from '../components/ui/misc';
import { ActivityFeed } from '../components/ActivityFeed';
import { ColumnChart } from '../components/charts/Charts';
import { AwardModal } from '../components/students/AwardModal';
import { StudentFormModal } from '../components/students/StudentFormModal';
import { levelInfo, sortedLevels, streakFor, weeklySeries } from '../services/stats';
import { formatDate, formatShortDate, startOfMonth, startOfWeek } from '../utils/date';
import { firstName, g, num } from '../utils/format';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useStore();
  const { undo, grantBadge, revokeBadge, encourage, deleteStudent } = useActions();
  const fx = useFx();
  const confirm = useConfirm();
  const [award, setAward] = useState(false);
  const [edit, setEdit] = useState(false);
  const [range, setRange] = useState<'all' | 'week' | 'month'>('all');
  const [badgeToGrant, setBadgeToGrant] = useState('');

  const student = state.students.find((s) => s.id === id);
  const studentsMap = useMemo(() => new Map(state.students.map((s) => [s.id, s])), [state.students]);
  const weeks = useMemo(() => (student ? weeklySeries(state.log, 8, student.id) : []), [state.log, student]);

  const entries = useMemo(() => {
    if (!student) return [];
    const from = range === 'week' ? startOfWeek() : range === 'month' ? startOfMonth() : 0;
    return state.log.filter((e) => e.studentId === student.id && e.type !== 'undo' && e.createdAt >= from).reverse();
  }, [state.log, student, range]);

  if (!student) {
    return <EmptyState icon="🔍" title="الطالب غير موجود" action={<Link to="/students" className="font-bold text-violet-600">العودة للطلاب</Link>} />;
  }

  const info = levelInfo(state.levels, student.totalEarned);
  const streak = streakFor(state.log, student.id);
  const thisWeek = weeks[weeks.length - 1]?.points ?? 0;
  const lastWeek = weeks[weeks.length - 2]?.points ?? 0;
  const diff = thisWeek - lastWeek;
  const earnedBadges = state.badges.filter((b) => student.badges.some((x) => x.badgeId === b.id));
  const missingBadges = state.badges.filter((b) => !student.badges.some((x) => x.badgeId === b.id));
  const rewards = state.log.filter((e) => e.studentId === student.id && e.type === 'redeem' && !e.undone);

  const onDelete = async () => {
    const ok = await confirm({ title: `حذف ${student.name}؟`, message: 'سيتم حذف الطالب وسجله نهائيًا.', confirmText: 'حذف', danger: true, icon: '🗑️' });
    if (ok) {
      deleteStudent(student.id);
      navigate('/students');
    }
  };

  const stats = [
    { icon: '💎', label: 'النقاط الحالية', value: num(student.points), cls: 'text-sky-600 dark:text-sky-300' },
    { icon: '🏆', label: 'إجمالي النقاط المكتسبة', value: num(student.totalEarned), cls: 'text-amber-600 dark:text-amber-300' },
    { icon: '🎁', label: 'النقاط المصروفة', value: num(student.totalSpent), cls: 'text-pink-600 dark:text-pink-300' },
    { icon: '🏅', label: 'الشارات', value: num(earnedBadges.length), cls: 'text-violet-600 dark:text-violet-300' },
    { icon: '🔥', label: 'أيام الالتزام المتتالية', value: num(streak), cls: 'text-orange-600 dark:text-orange-300' },
  ];

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/students" className="flex items-center gap-1 font-bold text-slate-500 hover:text-violet-600">
          <ArrowRight size={18} /> الطلاب
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" icon={<Printer size={16} />} onClick={() => window.print()}>طباعة التقرير</Button>
          <Link to={`/certificate?student=${student.id}`} className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10">📜 شهادة</Link>
          <Button size="sm" variant="ghost" icon={<Pencil size={16} />} onClick={() => setEdit(true)}>تعديل</Button>
          <Button size="sm" variant="ghost" icon={<Trash2 size={16} />} className="hover:text-rose-600" onClick={() => void onDelete()}>حذف</Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden text-center print:block">
        <p className="text-xl font-bold">تقرير الطالب — {state.settings.schoolName}</p>
        <p>{state.settings.className} • {state.settings.teacherName} • {formatDate(Date.now())}</p>
      </div>

      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-28" style={{ background: `linear-gradient(135deg, ${student.color}55, ${info.level.color}33)` }} />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-end">
          <div className="relative">
            <Avatar student={student} size="xl" />
            <span className="animate-float absolute -bottom-2 -left-2 grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-lg dark:bg-slate-800">{info.level.icon}</span>
          </div>
          <div className="flex-1 text-center sm:text-start">
            <h1 className="font-display text-3xl font-extrabold">{student.name}</h1>
            <p className="font-bold" style={{ color: info.level.color }}>🚀 المستوى {info.level.id} — {info.level.name}</p>
            <p className="text-sm text-slate-500">{state.groups.find((x) => x.id === student.groupId)?.name ?? 'بدون مجموعة'}</p>
          </div>
          <div className="no-print flex flex-wrap justify-center gap-2">
            <Button variant="warning" onClick={() => setAward(true)}>+ إضافة نقاط</Button>
            <Button variant="secondary" onClick={() => encourage(student)}>❤️ تعزيز</Button>
            <Button
              variant="primary"
              onClick={() => fx.celebrate({ title: `🏆 مبروك يا ${firstName(student.name)}! 🏆`, subtitle: g(student.gender, 'فخورون بإنجازاتك الرائعة ⭐', 'فخورون بإنجازاتكِ الرائعة ⭐'), student, badges: earnedBadges.slice(0, 6) })}
            >
              🎉 احتفل
            </Button>
          </div>
        </div>
        <div className="relative mt-6">
          <div className="mb-1.5 flex justify-between text-sm font-bold">
            <span>📊 التقدم نحو {info.next ? `«${info.next.name}» ${info.next.icon}` : 'القمة'}</span>
            <span className="text-slate-500">{info.next ? `باقي ${num(info.toNext)} نقطة` : 'أعلى مستوى! 💎'}</span>
          </div>
          <ProgressBar value={info.progress} height="lg" striped color={`linear-gradient(90deg, ${info.level.color}, ${info.next?.color ?? info.level.color})`} label={`${info.progress}%`} />
          <div className="mt-3 flex justify-between gap-1 overflow-x-auto">
            {sortedLevels(state.levels).map((l) => (
              <div key={l.id} className={`flex min-w-12 flex-col items-center text-center text-xs ${student.totalEarned >= l.minPoints ? '' : 'opacity-35 grayscale'}`}>
                <span className="text-2xl">{l.icon}</span>
                <span className="font-bold">{l.name}</span>
                <span className="text-slate-400">{num(l.minPoints)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div className="text-3xl">{s.icon}</div>
            <p className={`font-display text-3xl font-extrabold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon="📊" title="مقارنة بنفسه — آخر 8 أسابيع" />
          <div className={`mb-3 rounded-2xl p-3 text-center font-bold ${diff >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
            هذا الأسبوع: {num(thisWeek)} ⭐ • الأسبوع الماضي: {num(lastWeek)} ⭐
            <br />
            {diff > 0 ? `📈 تحسن بمقدار ${num(diff)} نقطة — ${g(student.gender, 'أنت تتطور!', 'أنتِ تتطورين!')}` : diff === 0 ? '➖ نفس مستوى الأسبوع الماضي' : `💪 ${num(-diff)} نقطة للوصول لمستوى الأسبوع الماضي`}
          </div>
          <ColumnChart data={weeks.map((w) => ({ label: formatShortDate(w.t), value: w.points }))} height={200} highlightLast name="نقاط الأسبوع" />
        </Card>

        <Card>
          <CardTitle icon="🏅" title="الشارات" />
          {earnedBadges.length === 0 && <p className="py-4 text-center text-slate-500">لم يحصل على شارات بعد — قريبًا! ✨</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {earnedBadges.map((b) => (
              <div key={b.id} className="group relative flex flex-col items-center rounded-2xl p-2 text-center" style={{ background: `${b.color}18` }}>
                <span className="text-4xl transition group-hover:scale-125">{b.icon}</span>
                <span className="mt-1 text-xs font-bold">{b.name}</span>
                <button
                  onClick={() => revokeBadge(student.id, b.id)}
                  className="no-print absolute left-1 top-1 hidden h-6 w-6 place-items-center rounded-full bg-white text-xs text-rose-500 shadow group-hover:grid dark:bg-slate-800"
                  title="سحب الشارة"
                  aria-label="سحب الشارة"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {missingBadges.length > 0 && (
            <div className="no-print mt-4 flex gap-2">
              <Select value={badgeToGrant} onChange={(e) => setBadgeToGrant(e.target.value)} aria-label="اختر شارة">
                <option value="">اختر شارة لمنحها يدويًا…</option>
                {missingBadges.map((b) => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </Select>
              <Button
                disabled={!badgeToGrant}
                onClick={() => {
                  grantBadge(student.id, badgeToGrant);
                  setBadgeToGrant('');
                }}
              >
                منح
              </Button>
            </div>
          )}
          {rewards.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 font-bold">🎁 المكافآت المستبدلة ({rewards.length})</p>
              <div className="flex flex-wrap gap-2">
                {rewards.map((r) => (
                  <span key={r.id} className="rounded-xl bg-pink-50 px-2.5 py-1 text-sm dark:bg-pink-500/10">{r.icon} {r.label.replace('استبدال: ', '')}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle
          icon="🕒"
          title="سجل الطالب"
          action={<Segmented value={range} onChange={setRange} options={[{ value: 'all', label: 'الكل' }, { value: 'week', label: 'الأسبوع' }, { value: 'month', label: 'الشهر' }]} className="no-print" />}
        />
        <ActivityFeed entries={entries} students={studentsMap} onUndo={undo} showStudent={false} timeline />
      </Card>

      {award && <AwardModal studentIds={[student.id]} onClose={() => setAward(false)} />}
      <StudentFormModal open={edit} student={student} onClose={() => setEdit(false)} />
    </div>
  );
}
