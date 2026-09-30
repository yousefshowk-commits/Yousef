import { useEffect, useState } from 'react';
import { cn } from './cn';

interface Props {
  value: number; // 0..100
  className?: string;
  barClassName?: string;
  color?: string;
  height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  striped?: boolean;
  label?: React.ReactNode;
}

const heights = { xs: 'h-1.5', sm: 'h-2.5', md: 'h-3.5', lg: 'h-6', xl: 'h-10' };

/** Animated progress bar: grows from 0 on mount and smoothly on change. */
export function ProgressBar({ value, className, barClassName, color, height = 'md', striped, label }: Props) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className={cn('relative w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10', heights[height], className)}>
      <div
        className={cn('relative h-full rounded-full transition-[width] duration-1000 ease-out', !color && 'bg-gradient-to-l from-violet-500 via-fuchsia-500 to-amber-400', barClassName)}
        style={{ width: `${w}%`, background: color }}
      >
        {striped && <div className="shine absolute inset-0 rounded-full" />}
      </div>
      {label && <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white">{label}</div>}
    </div>
  );
}
