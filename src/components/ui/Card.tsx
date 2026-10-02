import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import { UiIcon } from './UiIcon';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass min-w-0 rounded-3xl p-5', className)} {...rest} />;
}

export function CardTitle({ icon, title, action, className }: { icon?: string; title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h3 className="font-display flex min-w-0 items-center gap-2.5 text-lg font-bold">
        {icon && <UiIcon emoji={icon} size="sm" />}
        <span className="min-w-0">{title}</span>
      </h3>
      {action}
    </div>
  );
}
