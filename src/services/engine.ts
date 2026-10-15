/**
 * Pure state operations. Every function takes the current AppState and returns
 * the next state plus a list of side-effect events (level ups, badges, class
 * challenge completion) for the FX layer to celebrate.
 */
import type { AppState, Badge, EngineEvent, ID, LogEntry, Student } from '../types';
import { uid } from '../utils/id';
import { startOfWeek } from '../utils/date';
import { challengeProgress, earnedBetween, levelInfo, reasonCount, redemptionCount, streakFor } from './stats';

export interface Result {
  state: AppState;
  events: EngineEvent[];
  /** Id of the primary log entry created (for undo toasts). */
  entryId?: ID;
  entryIds?: ID[];
}

const mapStudent = (state: AppState, id: ID, fn: (s: Student) => Student): AppState => ({
  ...state,
  students: state.students.map((s) => (s.id === id ? fn(s) : s)),
});

const badgeLabel = (b: Badge) => `حصل على شارة «${b.name}»`;

function ruleMet(state: AppState, student: Student, badge: Badge): boolean {
  const r = badge.rule;
  const th = r.threshold ?? 0;
  switch (r.type) {
    case 'manual':
      return false;
    case 'totalEarned':
      return student.totalEarned >= th;
    case 'reasonCount':
      return !!r.reasonId && reasonCount(state.log, student.id, r.reasonId) >= th;
    case 'streak':
      return streakFor(state.log, student.id) >= th;
    case 'redemptions':
      return redemptionCount(state.log, student.id) >= th;
    case 'weeklyPoints':
      return earnedBetween(state.log, startOfWeek(), Infinity, student.id) >= th;
    case 'level':
      return levelInfo(state.levels, student.totalEarned).level.id >= th;
  }
}

/** Grant auto badges whose conditions are now met. */
export function evaluateAutoBadges(state: AppState, studentIds: ID[], parentId?: ID, now = Date.now()): Result {
  const events: EngineEvent[] = [];
  let next = state;
  for (const sid of studentIds) {
    if (!next.students.some((s) => s.id === sid)) continue;
    for (const badge of next.badges) {
      if (badge.rule.type === 'manual') continue;
      const student = next.students.find((s) => s.id === sid)!;
      if (student.badges.some((b) => b.badgeId === badge.id)) continue;
      if (!ruleMet(next, student, badge)) continue;
      const entry: LogEntry = {
        id: uid('l'), type: 'badge', studentId: sid, amount: 0, badgeId: badge.id,
        label: badgeLabel(badge), icon: badge.icon, createdAt: now, parentId,
      };
      next = mapStudent({ ...next, log: [...next.log, entry] }, sid, (s) => ({
        ...s, badges: [...s.badges, { badgeId: badge.id, earnedAt: now, logId: entry.id }],
      }));
      events.push({ type: 'badge', studentId: sid, badge });
    }
  }
  return { state: next, events };
}

function checkChallenge(state: AppState, now: number): Result {
  const ch = state.challenge;
  if (ch.completedAt || challengeProgress(state) < ch.target) return { state, events: [] };
  const completed = { ...ch, completedAt: now };
  return {
    state: {
      ...state,
      challenge: completed,
      achievements: [...state.achievements, { id: uid('a'), title: `${ch.title}: ${ch.reward}`, icon: '🏆', achievedAt: now }],
      log: [...state.log, { id: uid('l'), type: 'challenge', amount: 0, label: `أنجز الفصل «${ch.title}»`, icon: '🏆', createdAt: now }],
    },
    events: [{ type: 'challengeComplete', challenge: completed }],
  };
}

export interface AwardInput {
  studentIds: ID[];
  amount: number;
  reasonId?: ID;
  label?: string;
  icon?: string;
  type?: 'award' | 'wheel';
}

/** Award (or, with a negative amount, deduct) points for one or many students. */
export function award(state: AppState, input: AwardInput, now = Date.now()): Result {
  const reason = state.reasons.find((r) => r.id === input.reasonId);
  const events: EngineEvent[] = [];
  const entryIds: ID[] = [];
  let next = state;
  const deduct = input.amount < 0;

  for (const sid of input.studentIds) {
    const before = next.students.find((s) => s.id === sid);
    if (!before) continue;
    const entry: LogEntry = {
      id: uid('l'),
      type: deduct ? 'deduct' : input.type ?? 'award',
      studentId: sid,
      amount: deduct ? -Math.min(before.points, -input.amount) : input.amount,
      reasonId: reason?.id,
      label: input.label ?? reason?.label ?? (deduct ? 'خصم نقاط' : 'تعزيز'),
      icon: input.icon ?? reason?.icon ?? (deduct ? '➖' : '⭐'),
      createdAt: now,
    };
    entryIds.push(entry.id);
    next = { ...next, log: [...next.log, entry] };
    next = mapStudent(next, sid, (s) =>
      deduct
        // Deductions only affect the spendable balance — levels never go down.
        ? { ...s, points: Math.max(0, s.points + entry.amount) }
        : { ...s, points: s.points + entry.amount, totalEarned: s.totalEarned + entry.amount },
    );
    if (deduct) continue;

    const after = next.students.find((s) => s.id === sid)!;
    const lb = levelInfo(next.levels, before.totalEarned);
    const la = levelInfo(next.levels, after.totalEarned);
    if (la.index > lb.index) {
      next = {
        ...next,
        log: [...next.log, {
          id: uid('l'), type: 'levelup', studentId: sid, amount: 0, level: la.level.id,
          label: `وصل إلى مستوى «${la.level.name}»`, icon: la.level.icon, createdAt: now, parentId: entry.id,
        }],
      };
      events.push({ type: 'levelUp', studentId: sid, level: la.level });
    }
    const b = evaluateAutoBadges(next, [sid], entry.id, now);
    next = b.state;
    events.push(...b.events);
  }

  if (!deduct) {
    const c = checkChallenge(next, now);
    next = c.state;
    events.push(...c.events);
  }
  return { state: next, events, entryId: entryIds[0], entryIds };
}

/** Group bonus — points credited to the team itself (not individual members). */
export function awardGroup(state: AppState, groupId: ID, amount: number, reasonId?: ID, now = Date.now()): Result {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group || amount <= 0) return { state, events: [] };
  const reason = state.reasons.find((r) => r.id === reasonId);
  const entry: LogEntry = {
    id: uid('l'), type: 'group', groupId, amount, reasonId: reason?.id,
    label: `${group.name}${reason ? ` — ${reason.label}` : ''}`, icon: group.emoji, createdAt: now,
  };
  const c = checkChallenge({ ...state, log: [...state.log, entry] }, now);
  return { ...c, entryId: entry.id };
}

export function redeem(state: AppState, studentId: ID, rewardId: ID, cost: number, now = Date.now()): Result | { error: string } {
  const student = state.students.find((s) => s.id === studentId);
  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!student || !reward) return { error: 'بيانات غير صحيحة' };
  if (cost <= 0) return { error: 'عدد النقاط غير صحيح' };
  if (student.points < cost) return { error: `الرصيد غير كافٍ — يحتاج ${cost - student.points} نقطة إضافية` };
  const entry: LogEntry = {
    id: uid('l'), type: 'redeem', studentId, rewardId, amount: -cost,
    label: `استبدال: ${reward.name}`, icon: reward.icon, createdAt: now,
  };
  let next = mapStudent({ ...state, log: [...state.log, entry] }, studentId, (s) => ({
    ...s, points: s.points - cost, totalSpent: s.totalSpent + cost,
  }));
  const b = evaluateAutoBadges(next, [studentId], entry.id, now);
  next = b.state;
  return { state: next, events: b.events, entryId: entry.id };
}

export function grantBadge(state: AppState, studentId: ID, badgeId: ID, now = Date.now()): Result {
  const student = state.students.find((s) => s.id === studentId);
  const badge = state.badges.find((b) => b.id === badgeId);
  if (!student || !badge || student.badges.some((b) => b.badgeId === badgeId)) return { state, events: [] };
  const entry: LogEntry = {
    id: uid('l'), type: 'badge', studentId, amount: 0, badgeId, label: badgeLabel(badge), icon: badge.icon, createdAt: now,
  };
  return {
    state: mapStudent({ ...state, log: [...state.log, entry] }, studentId, (s) => ({
      ...s, badges: [...s.badges, { badgeId, earnedAt: now, logId: entry.id }],
    })),
    events: [{ type: 'badge', studentId, badge }],
    entryId: entry.id,
  };
}

export function revokeBadge(state: AppState, studentId: ID, badgeId: ID, now = Date.now()): Result {
  const student = state.students.find((s) => s.id === studentId);
  const earned = student?.badges.find((b) => b.badgeId === badgeId);
  const badge = state.badges.find((b) => b.id === badgeId);
  if (!student || !earned) return { state, events: [] };
  const log = state.log.map((e) => (e.id === earned.logId ? { ...e, undone: true } : e));
  log.push({ id: uid('l'), type: 'undo', studentId, amount: 0, undoOf: earned.logId, label: `سحب شارة «${badge?.name ?? ''}»`, icon: '↩️', createdAt: now });
  return {
    state: mapStudent({ ...state, log }, studentId, (s) => ({ ...s, badges: s.badges.filter((b) => b.badgeId !== badgeId) })),
    events: [],
  };
}

/** Revert a log entry (and entries it caused, like auto badges/level ups). */
export function undo(state: AppState, entryId: ID, now = Date.now()): Result | { error: string } {
  const entry = state.log.find((e) => e.id === entryId);
  if (!entry) return { error: 'العملية غير موجودة' };
  if (entry.undone) return { error: 'تم التراجع عن هذه العملية مسبقًا' };
  if (entry.type === 'undo' || entry.type === 'challenge') return { error: 'لا يمكن التراجع عن هذه العملية' };

  const toRevert = new Set<ID>([entry.id]);
  for (const e of state.log) if (e.parentId === entry.id && !e.undone) toRevert.add(e.id);

  let next: AppState = { ...state, log: state.log.map((e) => (toRevert.has(e.id) ? { ...e, undone: true } : e)) };

  if (entry.studentId) {
    const sid = entry.studentId;
    const removeBadgeLogs = new Set(state.log.filter((e) => toRevert.has(e.id) && e.type === 'badge').map((e) => e.id));
    next = mapStudent(next, sid, (s) => {
      let { points, totalEarned, totalSpent } = s;
      if (entry.type === 'award' || entry.type === 'wheel') {
        points = Math.max(0, points - entry.amount);
        totalEarned = Math.max(0, totalEarned - entry.amount);
      } else if (entry.type === 'deduct') {
        points = points - entry.amount; // amount is negative → refund
      } else if (entry.type === 'redeem') {
        points = points - entry.amount;
        totalSpent = Math.max(0, totalSpent + entry.amount);
      }
      return { ...s, points, totalEarned, totalSpent, badges: s.badges.filter((b) => !removeBadgeLogs.has(b.logId)) };
    });
  }

  next = {
    ...next,
    log: [...next.log, {
      id: uid('l'), type: 'undo', studentId: entry.studentId, groupId: entry.groupId, amount: 0, undoOf: entry.id,
      label: `تراجع: ${entry.label}`, icon: '↩️', createdAt: now,
    }],
  };
  return { state: next, events: [] };
}
