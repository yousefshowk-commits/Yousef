import type { ReactNode } from 'react';
import { cn } from './cn';

export function PageHeader({ icon, title, subtitle, actions }: { icon: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="animate-float grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-white to-violet-100 text-3xl shadow-lg shadow-violet-500/10 dark:from-slate-800 dark:to-violet-900/40">
          {icon}
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="animate-float text-6xl">{icon}</div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {text && <p className="max-w-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, gradient }: { icon: string; label: string; value: ReactNode; hint?: ReactNode; gradient: string }) {
  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-4 transition hover:-translate-y-1 sm:p-5">
      <div className={cn('absolute -left-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-xl transition group-hover:opacity-40 bg-gradient-to-br', gradient)} />
      <div className={cn('mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg', gradient)}>
        <span className="transition group-hover:scale-125">{icon}</span>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-display text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', !color && 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200', className)}
      style={color ? { background: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}
