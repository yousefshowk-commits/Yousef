import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { NAV } from './nav';
import { cn } from '../ui/cn';

export function MobileNav({ onMore }: { onMore: () => void }) {
  return (
    <nav className="glass no-print fixed inset-x-2 bottom-2 z-30 flex items-stretch justify-around rounded-3xl px-1 py-1.5 lg:hidden" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
      {NAV.filter((n) => n.mobile).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn('flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-xs font-bold transition-colors duration-200', isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400')
          }
        >
          <item.icon size={21} strokeWidth={2.2} aria-hidden />
          <span className="truncate">{item.label.split(' ')[0]}</span>
        </NavLink>
      ))}
      <button onClick={onMore} className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
        <Menu size={21} strokeWidth={2.2} aria-hidden />
        <span>المزيد</span>
      </button>
    </nav>
  );
}
