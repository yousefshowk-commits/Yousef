import { NavLink } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { NAV } from './nav';
import { useAppState } from '../../store/AppStore';
import { cn } from '../ui/cn';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { settings } = useAppState();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <div className="animate-float grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-2xl shadow-lg shadow-orange-500/30">🏆</div>
        <div className="min-w-0">
          <p className="font-display truncate text-lg font-extrabold leading-tight">نظام التعزيز</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{settings.className}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 font-bold transition-all',
                isActive
                  ? 'bg-gradient-to-l from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white',
              )
            }
          >
            <span className="text-xl transition-transform group-hover:scale-125">{item.emoji}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <NavLink
          to="/classroom"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-400 to-orange-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110 active:scale-95"
        >
          <MonitorPlay size={20} /> 📺 وضع الفصل
        </NavLink>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="glass no-print fixed inset-y-3 start-3 z-30 hidden w-64 rounded-[2rem] lg:block">
      <SidebarContent />
    </aside>
  );
}
