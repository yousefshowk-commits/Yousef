import type { AppState, ID, Level, LogEntry, Student } from '../types';
import { DAILY_CHALLENGES } from '../data/defaults';
import { DAY, dayKey, startOfDay, startOfMonth, startOfWeek } from '../utils/date';

/** A positive, still-valid point gain (student awards, wheel wins, group bonus). */
export const isEarning = (e: LogEntry): boolean =>
  !e.undone && e.amount > 0 && (e.type === 'award' || e.type === 'wheel' || e.type === 'group');

export function earnedBetween(log: LogEntry[], from: number, to = Infinity, studentId?: ID): number {
  let sum = 0;
  for (const e of log) {
    if (e.createdAt < from || e.createdAt >= to || !isEarning(e)) continue;
    if (studentId && e.studentId !== studentId) continue;
    sum += e.amount;
  }
  return sum;
}

// ---------- Levels ----------

export function sortedLevels(levels: Level[]): Level[] {
  return [...levels].sort((a, b) => a.minPoints - b.minPoints);
}

export interface LevelInfo {
  level: Level;
  index: number;
  next?: Level;
  progress: number; // 0..100 toward next level
  toNext: number;
}

export function levelInfo(levels: Level[], totalEarned: number): LevelInfo {
  const list = sortedLevels(levels);
  let index = 0;
  for (let i = 0; i < list.length; i++) if (totalEarned >= list[i].minPoints) index = i;
  const level = list[index];
  const next = list[index + 1];
  if (!next) return { level, index, progress: 100, toNext: 0 };
  const span = next.minPoints - level.minPoints;
  const progress = Math.round(((totalEarned - level.minPoints) / span) * 100);
  return { level, index, next, progress: Math.max(0, Math.min(100, progress)), toNext: next.minPoints - totalEarned };
}

// ---------- Per-student counters ----------

export const reasonCount = (log: LogEntry[], studentId: ID, reasonId: ID): number =>
  log.filter((e) => e.studentId === studentId && e.type === 'award' && !e.undone && e.reasonId === reasonId && e.amount > 0).length;

export const redemptionCount = (log: LogEntry[], studentId: ID): number =>
  log.filter((e) => e.studentId === studentId && e.type === 'redeem' && !e.undone).length;

/**
 * Consecutive school days (ending today or the last school day) on which the
 * student earned points. Fridays/Saturdays without activity don't break it.
 */
export function streakFor(log: LogEntry[], studentId: ID, now = Date.now()): number {
  const days = new Set<string>();
  for (const e of log) if (e.studentId === studentId && isEarning(e)) days.add(dayKey(e.createdAt));
  if (days.size === 0) return 0;
  let cursor = startOfDay(now);
  // Today not active yet? Streak is still alive from yesterday.
  if (!days.has(dayKey(cursor))) cursor -= DAY;
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const key = dayKey(cursor);
    const wd = new Date(cursor).getDay();
    if (days.has(key)) streak++;
    else if (wd !== 5 && wd !== 6) break;
    cursor -= DAY;
  }
  return streak;
}

// ---------- Class level ----------

export function studentOfWeek(state: AppState): { student: Student; points: number } | null {
  const from = startOfWeek();
  let best: { student: Student; points: number } | null = null;
  for (const s of state.students) {
    const p = earnedBetween(state.log, from, Infinity, s.id);
    if (p > 0 && (!best || p > best.points)) best = { student: s, points: p };
  }
  return best;
}

export function challengeProgress(state: AppState): number {
  return earnedBetween(state.log, state.challenge.startAt);
}

export function groupTotals(state: AppState): { groupId: ID; total: number; members: number; week: number }[] {
  const weekFrom = startOfWeek();
  return state.groups.map((g) => {
    const members = state.students.filter((s) => s.groupId === g.id);
    const ids = new Set(members.map((m) => m.id));
    let total = 0;
    let week = 0;
    for (const e of state.log) {
      if (!isEarning(e)) continue;
      const belongs = e.groupId === g.id || (e.studentId && ids.has(e.studentId));
      if (!belongs) continue;
      total += e.amount;
      if (e.createdAt >= weekFrom) week += e.amount;
    }
    return { groupId: g.id, total, members: members.length, week };
  });
}

export function dailyChallenge(now = Date.now()) {
  const idx = Math.floor(startOfDay(now) / DAY) % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[idx];
}

export function dailyChallengeProgress(state: AppState, now = Date.now()): number {
  const ch = dailyChallenge(now);
  const from = startOfDay(now);
  return state.log.filter((e) => e.type === 'award' && !e.undone && e.createdAt >= from && e.reasonId === ch.reasonId && e.amount > 0).length;
}

// ---------- Series for charts ----------

export function dailySeries(log: LogEntry[], days: number, studentId?: ID) {
  const today = startOfDay();
  const out: { key: string; t: number; points: number; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = today - i * DAY;
    out.push({ key: dayKey(t), t, points: 0, count: 0 });
  }
  const map = new Map(out.map((o) => [o.key, o]));
  for (const e of log) {
    if (!isEarning(e) || (studentId && e.studentId !== studentId)) continue;
    const o = map.get(dayKey(e.createdAt));
    if (o) {
      o.points += e.amount;
      o.count++;
    }
  }
  return out;
}

export function weeklySeries(log: LogEntry[], weeks: number, studentId?: ID) {
  const cur = startOfWeek();
  const out: { t: number; points: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    // Use date arithmetic (not DAY*7) so DST shifts don't skew boundaries.
    const d = new Date(cur);
    d.setDate(d.getDate() - i * 7);
    out.push({ t: d.getTime(), points: 0 });
  }
  for (const e of log) {
    if (!isEarning(e) || (studentId && e.studentId !== studentId)) continue;
    for (let i = out.length - 1; i >= 0; i--) {
      if (e.createdAt >= out[i].t) {
        const end = i + 1 < out.length ? out[i + 1].t : Infinity;
        if (e.createdAt < end) out[i].points += e.amount;
        break;
      }
    }
  }
  return out;
}

export function monthlySeries(log: LogEntry[], months: number, studentId?: ID) {
  const out: { t: number; points: number }[] = [];
  const base = new Date(startOfMonth());
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    out.push({ t: d.getTime(), points: 0 });
  }
  for (const e of log) {
    if (!isEarning(e) || (studentId && e.studentId !== studentId)) continue;
    for (let i = out.length - 1; i >= 0; i--) {
      if (e.createdAt >= out[i].t) {
        out[i].points += e.amount;
        break;
      }
    }
  }
  return out;
}

export function reasonBreakdown(state: AppState, from = 0) {
  const counts = new Map<string, { count: number; points: number }>();
  for (const e of state.log) {
    if (e.type !== 'award' || e.undone || e.amount <= 0 || e.createdAt < from || !e.reasonId) continue;
    const c = counts.get(e.reasonId) ?? { count: 0, points: 0 };
    c.count++;
    c.points += e.amount;
    counts.set(e.reasonId, c);
  }
  return state.reasons
    .map((r) => ({ reason: r, ...(counts.get(r.id) ?? { count: 0, points: 0 }) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function rewardUsage(state: AppState) {
  const counts = new Map<string, number>();
  for (const e of state.log) {
    if (e.type !== 'redeem' || e.undone || !e.rewardId) continue;
    counts.set(e.rewardId, (counts.get(e.rewardId) ?? 0) + 1);
  }
  return state.rewards
    .map((r) => ({ reward: r, count: counts.get(r.id) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function badgeCounts(state: AppState) {
  return state.badges
    .map((b) => ({ badge: b, count: state.students.filter((s) => s.badges.some((x) => x.badgeId === b.id)).length }))
    .sort((a, b) => b.count - a.count);
}

export const totalBadges = (state: AppState) => state.students.reduce((n, s) => n + s.badges.length, 0);
export const totalRedemptions = (state: AppState) => state.log.filter((e) => e.type === 'redeem' && !e.undone).length;
export const totalDistributed = (state: AppState) => state.log.reduce((n, e) => n + (isEarning(e) ? e.amount : 0), 0);
