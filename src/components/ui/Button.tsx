import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-l from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110',
  secondary: 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25',
  ghost: 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10',
  danger: 'bg-gradient-to-l from-rose-600 to-red-500 text-white shadow-lg shadow-rose-500/25 hover:brightness-110',
  success: 'bg-gradient-to-l from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110',
  warning: 'bg-gradient-to-l from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:brightness-110',
  outline: 'border-2 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-400/30 dark:text-violet-200 dark:hover:bg-violet-500/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-13 px-6 text-lg rounded-2xl gap-2',
  xl: 'h-16 px-8 text-xl rounded-3xl gap-3',
  icon: 'h-11 w-11 rounded-2xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-bold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
