import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { SWATCHES } from '../data/presets';

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Section({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink-700/70 py-2">
      <div className="flex items-center gap-2 px-3">
        <button className="flex flex-1 items-center gap-1 py-1 text-[13px] font-bold text-ink-100" onClick={() => setOpen(!open)}>
          <ChevronDown size={14} className={cn('transition-transform', !open && 'rotate-90')} />
          {title}
        </button>
        {right}
      </div>
      {open && <div className="space-y-2.5 px-3 pb-2 pt-1">{children}</div>}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-ink-300">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <Row label={label}>
      <input
        type="range"
        className="range flex-1"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        dir="ltr"
      />
      <input
        type="number"
        className="num w-16"
        value={Number.isInteger(step) ? Math.round(value) : Math.round(value * 100) / 100}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        dir="ltr"
      />
      {suffix && <span className="w-3 text-[10px] text-ink-400">{suffix}</span>}
    </Row>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-200">
      <span
        className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-gold-500' : 'bg-ink-600')}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'right-0.5' : 'right-[18px]')} />
      </span>
      {label}
    </label>
  );
}

export function ColorInput({ value, onChange, swatches = true }: { value: string; onChange: (v: string) => void; swatches?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <label className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-ink-500 shadow-inner" style={{ background: value }}>
          <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <input className="num w-[76px] font-mono text-[11px]" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" />
        {swatches && (
          <button className="rounded px-1 text-[11px] text-ink-300 hover:text-gold-300" onClick={() => setOpen(!open)}>
            ألوان
          </button>
        )}
      </div>
      {open && (
        <div className="mt-1.5 grid grid-cols-8 gap-1">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className="h-5 w-5 rounded border border-black/30"
              style={{ background: c }}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function toHex(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('');
  return '#000000';
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-1 rounded-lg bg-ink-800 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          title={o.title}
          className={cn(
            'flex flex-1 items-center justify-center rounded-md px-1.5 py-1 text-xs transition-colors',
            value === o.v ? 'bg-ink-600 text-gold-200 shadow' : 'text-ink-300 hover:text-ink-100',
          )}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Btn({ children, onClick, active, title, className, disabled }: { children: ReactNode; onClick?: () => void; active?: boolean; title?: string; className?: string; disabled?: boolean }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40',
        active ? 'bg-gold-500 text-ink-900' : 'bg-ink-700 text-ink-100 hover:bg-ink-600',
        className,
      )}
    >
      {children}
    </button>
  );
}
