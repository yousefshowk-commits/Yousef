import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const field =
  'w-full rounded-2xl border-2 border-slate-200 bg-white/80 px-4 py-2.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/15 dark:border-white/10 dark:bg-slate-800/70';

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
      {children}
      {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
    </span>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <Label hint={hint}>{label}</Label>
      {children}
    </label>
  );
}

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(field, className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(field, 'min-h-24', className)} {...p} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(field, 'cursor-pointer', className)} {...p} />;

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl p-3 text-start transition hover:bg-slate-900/5 dark:hover:bg-white/5"
    >
      <span>
        <span className="block font-bold">{label}</span>
        {description && <span className="block text-sm text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <span className={cn('relative h-8 w-14 shrink-0 rounded-full transition-colors', checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600')}>
        <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-1' : 'left-7')} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-2xl bg-slate-900/5 p-1 dark:bg-white/5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-xl px-3.5 py-2 text-sm font-bold transition',
            value === o.value ? 'bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
