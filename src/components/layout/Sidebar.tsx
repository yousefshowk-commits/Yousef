import { NavLink } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { NAV } from './nav';
import { ClassSwitcher } from '../classes/ClassSwitcher';
import { cn } from '../ui/cn';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-3 pt-4">
        <ClassSwitcher onNavigate={onNavigate} />
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
                'group flex min-h-11 items-center gap-3 rounded-2xl px-2.5 py-1.5 font-bold transition-colors duration-200',
                isActive
                  ? 'clay-active bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors duration-200',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:text-indigo-300',
                  )}
                >
                  <item.icon size={18} strokeWidth={2.2} />
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <NavLink
          to="/classroom"
          onClick={onNavigate}
          className="clay-cta flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white transition-colors duration-200 hover:bg-orange-600 active:translate-y-px"
        >
          <MonitorPlay size={20} aria-hidden /> وضع الفصل
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
