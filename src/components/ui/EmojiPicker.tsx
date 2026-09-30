import { ICON_CHOICES } from '../../data/defaults';
import { cn } from './cn';

export function EmojiPicker({ value, onChange, choices = ICON_CHOICES }: { value: string; onChange: (v: string) => void; choices?: string[] }) {
  return (
    <div>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
        {choices.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={cn('grid aspect-square place-items-center rounded-xl text-2xl transition hover:scale-110 hover:bg-violet-100 dark:hover:bg-white/10', value === e && 'bg-violet-100 ring-2 ring-violet-500 dark:bg-violet-500/20')}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
        <span>أو اكتب رمزًا:</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 8))}
          className="w-20 rounded-xl border-2 border-slate-200 bg-transparent px-2 py-1 text-center text-xl dark:border-white/10"
          aria-label="رمز مخصص"
        />
      </div>
    </div>
  );
}
