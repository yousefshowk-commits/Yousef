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
            cn('flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition', isActive ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200' : 'text-slate-500 dark:text-slate-400')
          }
        >
          <span className="text-xl leading-none">{item.emoji}</span>
          <span className="truncate">{item.label.split(' ')[0]}</span>
        </NavLink>
      ))}
      <button onClick={onMore} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <Menu size={20} />
        <span>المزيد</span>
      </button>
    </nav>
  );
}
