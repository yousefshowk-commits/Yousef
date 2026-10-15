import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'clay-active bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25',
  ghost: 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10',
  danger: 'clay-active bg-rose-600 text-white hover:bg-rose-700',
  success: 'clay-active bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'clay-cta bg-orange-500 text-white hover:bg-orange-600',
  outline: 'border-2 border-indigo-200 bg-white/60 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400/30 dark:bg-transparent dark:text-indigo-200 dark:hover:bg-indigo-500/10',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'min-h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'min-h-13 px-6 text-lg rounded-2xl gap-2',
  xl: 'min-h-16 px-8 text-xl rounded-3xl gap-3',
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
        'inline-flex shrink-0 select-none items-center justify-center font-bold transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
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
