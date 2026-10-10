import { Link } from 'react-router-dom';
import { Menu, Moon, MonitorPlay, Sun, UserRound, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { NotificationBell } from './NotificationBell';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { state, update } = useStore();
  const { settings } = state;
  const set = (patch: Partial<typeof settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  return (
    <header className="no-print sticky top-0 z-20 px-3 pt-3 sm:px-5">
      <div className="glass flex items-center gap-2 rounded-3xl px-3 py-2 sm:px-4">
        <button onClick={onMenu} className="grid h-11 w-11 place-items-center rounded-2xl hover:bg-slate-900/5 lg:hidden dark:hover:bg-white/10" aria-label="القائمة">
          <Menu />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate font-bold leading-tight sm:text-lg">
            {settings.className} <span className="hidden text-slate-400 sm:inline">•</span> <span className="hidden text-slate-500 sm:inline dark:text-slate-400">{settings.schoolName}</span>
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400"><UserRound size={13} aria-hidden className="shrink-0" /> {settings.teacherName} — {settings.term}</p>
        </div>
        <button
          onClick={() => set({ sound: !settings.sound })}
          className="grid h-11 w-11 place-items-center rounded-2xl text-slate-600 transition hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label={settings.sound ? 'كتم الأصوات' : 'تشغيل الأصوات'}
          title={settings.sound ? 'كتم الأصوات' : 'تشغيل الأصوات'}
        >
          {settings.sound ? <Volume2 size={21} /> : <VolumeX size={21} className="text-rose-500" />}
        </button>
        <button
          onClick={() => set({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          className="grid h-11 w-11 place-items-center rounded-2xl text-slate-600 transition hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="تبديل الوضع الداكن"
          title="الوضع الفاتح/الداكن"
        >
          {settings.theme === 'dark' ? <Sun size={21} className="text-amber-400" /> : <Moon size={21} />}
        </button>
        <NotificationBell />
        <Link to="/classroom" className="clay-cta hidden h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-bold text-white transition-colors duration-200 hover:bg-orange-600 sm:flex">
          <MonitorPlay size={18} /> وضع الفصل
        </Link>
      </div>
    </header>
  );
}
