import type { AppState } from '../types';
import { groupTotals } from '../services/stats';
import { ProgressBar } from './ui/ProgressBar';
import { num } from '../utils/format';

/** Visual team competition: one animated bar per group, scaled to the leader. */
export function GroupRace({ state, period = 'total' }: { state: AppState; period?: 'total' | 'week' }) {
  const totals = groupTotals(state);
  const rows = state.groups.map((g) => {
    const t = totals.find((x) => x.groupId === g.id)!;
    return { g, value: period === 'week' ? t.week : t.total, members: t.members };
  }).sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-slate-500">لا توجد مجموعات</p>;
  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <div key={r.g.id}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-bold">
              <span className="text-2xl">{i === 0 && r.value > 0 ? '👑' : r.g.emoji}</span>
              {r.g.name}
              <span className="text-xs font-normal text-slate-500">({r.members} أعضاء)</span>
            </span>
            <span className="font-display text-xl font-extrabold">{num(r.value)} ⭐</span>
          </div>
          <ProgressBar value={(r.value / max) * 100} height="lg" striped={i === 0} color={`linear-gradient(90deg, ${r.g.color}, ${r.g.color}bb)`} />
        </div>
      ))}
    </div>
  );
}
