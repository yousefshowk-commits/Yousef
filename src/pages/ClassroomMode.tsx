import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Maximize, Minimize, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import type { ID } from '../types';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useFx } from '../store/FxProvider';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { cn } from '../components/ui/cn';
import { challengeProgress, levelInfo } from '../services/stats';
import { firstName, g, num, pct } from '../utils/format';

/** Full-screen, touch-first board for smart boards: tap student → tap +N. */
export default function ClassroomMode() {
  const { state, update } = useStore();
  const { awardPoints, encourage } = useActions();
  const fx = useFx();
  const [reasonId, setReasonId] = useState(state.reasons.find((r) => r.id === 'participation')?.id ?? state.reasons[0]?.id);
  const [active, setActive] = useState<ID | null>(null);
  const [group, setGroup] = useState('all');
  const [full, setFull] = useState(!!document.fullscreenElement);
  const dark = state.settings.theme === 'dark';

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Fullscreen may be blocked (iframe / iOS) — the layout is already full-window. */
    }
  };

  const students = useMemo(() => state.students.filter((s) => group === 'all' || s.groupId === group).sort((a, b) => a.name.localeCompare(b.name, 'ar')), [state.students, group]);
  const activeStudent = state.students.find((s) => s.id === active);
  const progress = challengeProgress(state);
  const cols = students.length > 24 ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-8' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6';

  const give = (amount: number) => (e: MouseEvent) => {
    if (!active) return;
    awardPoints([active], amount, reasonId, { x: e.clientX, y: e.clientY });
    setActive(null);
  };

  return (
    <div className={cn('fixed inset-0 z-40 flex flex-col overflow-hidden', dark ? 'bg-[#0b1020] text-white' : 'bg-gradient-to-br from-indigo-100 via-pink-50 to-amber-50 text-slate-800')}>
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3 sm:px-5">
        <div className="me-auto flex items-center gap-2">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{state.settings.className}</p>
            <p className="text-xs opacity-70">📺 وضع الفصل — اضغط على الطالب لمنحه النقاط</p>
          </div>
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="h-12 rounded-2xl border-0 bg-white/80 px-3 font-bold text-slate-700 shadow dark:bg-white/10 dark:text-white" aria-label="المجموعة">
          <option value="all">👥 الكل</option>
          {state.groups.map((gr) => <option key={gr.id} value={gr.id}>{gr.emoji} {gr.name}</option>)}
        </select>
        <button onClick={() => update((s) => ({ ...s, settings: { ...s.settings, sound: !s.settings.sound } }))} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 shadow dark:bg-white/10" aria-label="الصوت">
          {state.settings.sound ? <Volume2 /> : <VolumeX className="text-rose-500" />}
        </button>
        <button onClick={() => update((s) => ({ ...s, settings: { ...s.settings, theme: dark ? 'light' : 'dark' } }))} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 shadow dark:bg-white/10" aria-label="المظهر">
          {dark ? <Sun className="text-amber-400" /> : <Moon />}
        </button>
        <button onClick={() => void toggleFull()} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 shadow dark:bg-white/10" aria-label="ملء الشاشة">
          {full ? <Minimize /> : <Maximize />}
        </button>
        <Link to="/" onClick={() => document.fullscreenElement && void document.exitFullscreen()} className="flex h-12 items-center gap-1 rounded-2xl bg-rose-500 px-4 font-bold text-white shadow" aria-label="خروج">
          <X size={20} /> خروج
        </Link>
      </div>

      {/* Reason chips */}
      <div className="flex gap-2 overflow-x-auto px-3 py-3 sm:px-5">
        {state.reasons.map((r) => (
          <button
            key={r.id}
            onClick={() => setReasonId(r.id)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-base font-bold transition', reasonId === r.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'bg-white/70 dark:bg-white/10')}
          >
            <span className="text-xl">{r.icon}</span> {r.label}
          </button>
        ))}
      </div>

      {/* Students */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 sm:px-5">
        <div className={cn('grid gap-3', cols)}>
          {students.map((s) => {
            const info = levelInfo(state.levels, s.totalEarned);
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className="group flex flex-col items-center rounded-[1.75rem] bg-white/85 p-3 shadow-lg shadow-indigo-900/5 transition hover:-translate-y-1 hover:shadow-xl active:scale-95 sm:p-4 dark:bg-white/10"
              >
                <div className="relative">
                  <Avatar student={s} size="lg" className="transition group-hover:scale-110" />
                  <span className="absolute -bottom-1 -left-1 text-2xl">{info.level.icon}</span>
                </div>
                <p className="font-display mt-2 w-full truncate text-lg font-extrabold sm:text-xl">{s.name}</p>
                <p className="font-display text-xl font-extrabold text-amber-500">⭐ {num(s.totalEarned)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Class challenge */}
      <div className="px-3 pb-3 sm:px-5">
        <div className="flex items-center gap-3 rounded-3xl bg-white/80 p-3 shadow dark:bg-white/10">
          <span className="text-2xl">🎯</span>
          <div className="flex-1">
            <ProgressBar value={pct(progress, state.challenge.target)} height="md" striped />
          </div>
          <span className="font-display whitespace-nowrap font-extrabold">{num(Math.min(progress, state.challenge.target))} / {num(state.challenge.target)} ⭐</span>
        </div>
      </div>

      {/* Award popover */}
      {activeStudent && (
        <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="animate-bounce-in w-full max-w-lg rounded-[2.5rem] bg-white p-6 text-center text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-fit"><Avatar student={activeStudent} size="xl" /></div>
            <p className="font-display mt-3 text-3xl font-extrabold">{activeStudent.name}</p>
            <p className="text-slate-500">
              {state.reasons.find((r) => r.id === reasonId)?.icon} {state.reasons.find((r) => r.id === reasonId)?.label} • ⭐ {num(activeStudent.totalEarned)}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[1, 5, 10].map((a) => (
                <button key={a} onClick={give(a)} className="font-display rounded-3xl bg-gradient-to-b from-amber-300 to-orange-500 py-6 text-4xl font-extrabold text-white shadow-xl shadow-orange-500/30 transition hover:brightness-110 active:scale-90">
                  ⭐ +{a}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => { encourage(activeStudent); setActive(null); }} className="rounded-2xl bg-pink-100 py-3 text-lg font-bold text-pink-700 dark:bg-pink-500/15 dark:text-pink-200">❤️ تعزيز</button>
              <button
                onClick={() => {
                  const st = activeStudent;
                  setActive(null);
                  fx.celebrate({ title: `🏆 مبروك يا ${firstName(st.name)}! 🏆`, subtitle: g(st.gender, 'أنت نجم الفصل ⭐', 'أنتِ نجمة الفصل ⭐'), student: st, badges: state.badges.filter((b) => st.badges.some((x) => x.badgeId === b.id)).slice(0, 6) });
                }}
                className="rounded-2xl bg-indigo-100 py-3 text-lg font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
              >
                🎉 احتفل
              </button>
            </div>
            <button onClick={() => setActive(null)} className="mt-4 text-slate-500">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
