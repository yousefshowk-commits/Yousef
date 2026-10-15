import {
  Award, BarChart3, CalendarDays, CalendarRange, ClipboardList, Disc3, Flag, Gift, Hand, Handshake, Heart, History,
  LayoutGrid, PartyPopper, Receipt, Rocket, Save, School, ScrollText, Settings, SlidersHorizontal, Sparkles, Sprout,
  Star, Tags, Target, TrendingUp, Trophy, Users, UsersRound, Zap, type LucideIcon,
} from 'lucide-react';
import { cn } from './cn';

type Tone = 'indigo' | 'orange' | 'amber' | 'emerald' | 'sky' | 'rose' | 'violet';

/**
 * Interface icons are SVG (Lucide), not emoji. Call sites keep passing the emoji they
 * were written with; this maps it to an icon + a color tone in one place.
 */
const MAP: Record<string, [LucideIcon, Tone]> = {
  '👦': [Users, 'sky'],
  '⭐': [Star, 'amber'],
  '🎁': [Gift, 'rose'],
  '🏅': [Award, 'violet'],
  '📅': [CalendarDays, 'indigo'],
  '🗓️': [CalendarRange, 'sky'],
  '🙋': [Hand, 'emerald'],
  '📈': [TrendingUp, 'emerald'],
  '📊': [BarChart3, 'indigo'],
  '🏆': [Trophy, 'amber'],
  '📜': [ScrollText, 'amber'],
  '🎯': [Target, 'rose'],
  '🎡': [Disc3, 'orange'],
  '🎉': [PartyPopper, 'rose'],
  '⚙️': [Settings, 'indigo'],
  '🧾': [Receipt, 'rose'],
  '🧩': [LayoutGrid, 'indigo'],
  '🤝': [Handshake, 'emerald'],
  '🕒': [History, 'indigo'],
  '📋': [ClipboardList, 'indigo'],
  '👥': [UsersRound, 'sky'],
  '🏷️': [Tags, 'indigo'],
  '🏁': [Flag, 'orange'],
  '✨': [Sparkles, 'violet'],
  '⚡': [Zap, 'amber'],
  '🏫': [School, 'indigo'],
  '🌱': [Sprout, 'emerald'],
  '🚀': [Rocket, 'indigo'],
  '🎛️': [SlidersHorizontal, 'indigo'],
  '❤️': [Heart, 'rose'],
  '💾': [Save, 'emerald'],
};

const TONES: Record<Tone, string> = {
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
};

const SIZES = {
  sm: { box: 'h-9 w-9 rounded-xl', icon: 18 },
  md: { box: 'h-12 w-12 rounded-2xl', icon: 22 },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 26 },
};

/** Decorative icon tile (always next to a visible label, so hidden from screen readers). */
export function UiIcon({ emoji, size = 'md', className }: { emoji: string; size?: keyof typeof SIZES; className?: string }) {
  const entry = MAP[emoji];
  const s = SIZES[size];
  if (!entry) {
    return <span aria-hidden className={cn('grid shrink-0 place-items-center bg-indigo-100 text-xl dark:bg-indigo-500/15', s.box, className)}>{emoji}</span>;
  }
  const [Icon, tone] = entry;
  return (
    <span aria-hidden className={cn('clay-tile grid shrink-0 place-items-center', s.box, TONES[tone], className)}>
      <Icon size={s.icon} strokeWidth={2.2} />
    </span>
  );
}
