import type { ReactNode } from 'react';
import { cn } from './cn';
import { UiIcon } from './UiIcon';

export function PageHeader({ icon, title, subtitle, actions }: { icon: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <UiIcon emoji={icon} size="lg" />
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

export function StatCard({ icon, label, value, hint }: { icon: string; label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="glass group flex min-w-0 items-start gap-3 rounded-3xl p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
      <UiIcon emoji={icon} size="md" className="transition-transform duration-200 group-hover:scale-110" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-display text-3xl font-extrabold tabular-nums leading-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', !color && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200', className)}
      style={color ? { background: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}
