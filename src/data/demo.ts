import type { AppState, Gender, LogEntry, Settings, Student } from '../types';
import {
  AVATARS,
  COLORS,
  DEFAULT_BADGES,
  DEFAULT_GROUPS,
  DEFAULT_LEVELS,
  DEFAULT_REASONS,
  DEFAULT_REWARDS,
  DEFAULT_SETTINGS,
  DEFAULT_WHEEL,
  ENCOURAGEMENTS,
  defaultChallenge,
} from './defaults';
import { seededRandom, pick, uid } from '../utils/id';
import { DAY, startOfDay } from '../utils/date';
import { evaluateAutoBadges } from '../services/engine';
import { challengeProgress, levelInfo } from '../services/stats';

export function makeStudent(name: string, index: number, gender: Gender = 'm', groupId: string | null = null): Student {
  return {
    id: uid('s'),
    name,
    gender,
    avatar: AVATARS[index % AVATARS.length],
    color: COLORS[index % COLORS.length],
    groupId,
    points: 0,
    totalEarned: 0,
    totalSpent: 0,
    badges: [],
    createdAt: Date.now(),
  };
}

export function createEmptyState(settings: Partial<Settings> = {}): AppState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    students: [],
    reasons: DEFAULT_REASONS.map((r) => ({ ...r })),
    levels: DEFAULT_LEVELS.map((l) => ({ ...l })),
    badges: DEFAULT_BADGES.map((b) => ({ ...b, rule: { ...b.rule } })),
    rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
    groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
    wheel: DEFAULT_WHEEL.map((w) => ({ ...w })),
    log: [],
    challenge: defaultChallenge(),
    achievements: [],
    encouragements: [...ENCOURAGEMENTS],
    dailyDone: {},
  };
}

/** Create a real class from the onboarding form, keeping the teacher's customisations. */
export function createClassState(prev: AppState, settings: Partial<Settings>, names: string[]): AppState {
  const base = createEmptyState({
    ...prev.settings,
    ...settings,
    isDemo: false,
    onboarded: true,
  });
  const groups = base.groups;
  return {
    ...base,
    reasons: prev.reasons,
    levels: prev.levels,
    badges: prev.badges,
    rewards: prev.rewards,
    wheel: prev.wheel,
    encouragements: prev.encouragements,
    students: names.map((n, i) => makeStudent(n, i, 'm', groups[i % groups.length]?.id ?? null)),
  };
}

const DEMO_STUDENTS: [string, Gender][] = [
  ['أحمد خالد', 'm'], ['سارة محمد', 'f'], ['محمد علي', 'm'], ['ليان أحمد', 'f'],
  ['عمر يوسف', 'm'], ['نورة سعد', 'f'], ['يوسف إبراهيم', 'm'], ['جود عبدالله', 'f'],
  ['خالد فهد', 'm'], ['ريم ناصر', 'f'], ['عبدالله سالم', 'm'], ['لمى فيصل', 'f'],
  ['فيصل حمد', 'm'], ['هيا منصور', 'f'], ['سلمان راشد', 'm'], ['رهف ماجد', 'f'],
];

export function createDemoState(): AppState {
  const rnd = seededRandom(20260930);
  const state = createEmptyState({ isDemo: true, onboarded: false });
  const students = DEMO_STUDENTS.map(([name, gender], i) =>
    makeStudent(name, i, gender, state.groups[i % state.groups.length].id),
  );
  // Each student gets a "diligence" factor so the leaderboard looks natural.
  const diligence = students.map(() => 0.35 + rnd() * 0.65);
  const weightedReasons = ['participation', 'participation', 'homework', 'homework', 'behavior', 'cooperation', 'reading', 'helping', 'commitment', 'creative', 'goal', 'cleanliness'];
  const amounts = [1, 1, 2, 2, 2, 5, 5, 5, 10];
  const log: LogEntry[] = [];
  const today = startOfDay();

  for (let d = 34; d >= 0; d--) {
    const day = today - d * DAY;
    const wd = new Date(day).getDay();
    if (wd === 5 || wd === 6) continue; // weekend
    students.forEach((s, i) => {
      const events = Math.floor(diligence[i] * 3.2 * rnd() + (rnd() < diligence[i] ? 1 : 0));
      for (let k = 0; k < events; k++) {
        const reasonId = pick(weightedReasons, rnd);
        const reason = state.reasons.find((r) => r.id === reasonId)!;
        const amount = pick(amounts, rnd);
        const t = day + (7.5 + rnd() * 6) * 60 * 60 * 1000;
        if (t > Date.now()) continue;
        log.push({ id: uid('l'), type: 'award', studentId: s.id, amount, reasonId, label: reason.label, icon: reason.icon, createdAt: t });
        s.points += amount;
        s.totalEarned += amount;
      }
    });
    // A few group bonuses.
    if (rnd() < 0.3) {
      const g = pick(state.groups, rnd);
      log.push({ id: uid('l'), type: 'group', groupId: g.id, amount: 10, reasonId: 'cooperation', label: `${g.name} — التعاون`, icon: g.emoji, createdAt: day + 11 * 3600 * 1000 });
    }
  }

  // Some reward redemptions for the top students.
  students.forEach((s, i) => {
    const reward = state.rewards[i % 7];
    if (s.points >= reward.cost + 20 && rnd() < 0.8) {
      const t = today - Math.floor(rnd() * 10) * DAY + 12 * 3600 * 1000;
      log.push({ id: uid('l'), type: 'redeem', studentId: s.id, rewardId: reward.id, amount: -reward.cost, label: `استبدال: ${reward.name}`, icon: reward.icon, createdAt: Math.min(t, Date.now() - 60000) });
      s.points -= reward.cost;
      s.totalSpent += reward.cost;
    }
  });

  // Level up entries for the timeline.
  for (const s of students) {
    const info = levelInfo(state.levels, s.totalEarned);
    for (const lv of state.levels) {
      if (lv.id > 1 && lv.id <= info.level.id) {
        log.push({ id: uid('l'), type: 'levelup', studentId: s.id, amount: 0, level: lv.id, label: `وصل إلى مستوى «${lv.name}»`, icon: lv.icon, createdAt: today - (6 - lv.id) * 4 * DAY + 13 * 3600 * 1000 });
      }
    }
  }

  log.sort((a, b) => a.createdAt - b.createdAt);
  let demo: AppState = { ...state, students, log };
  demo = evaluateAutoBadges(demo, students.map((s) => s.id), undefined, Date.now() - 3600 * 1000).state;

  // Hand-picked manual badge for the demo "hero of the month".
  const top = [...demo.students].sort((a, b) => b.totalEarned - a.totalEarned)[0];
  const heroLog: LogEntry = { id: uid('l'), type: 'badge', studentId: top.id, amount: 0, badgeId: 'monthhero', label: 'حصل على شارة «بطل الشهر»', icon: '👑', createdAt: Date.now() - 2 * 3600 * 1000 };
  demo = {
    ...demo,
    log: [...demo.log, heroLog],
    students: demo.students.map((s) => (s.id === top.id ? { ...s, badges: [...s.badges, { badgeId: 'monthhero', earnedAt: heroLog.createdAt, logId: heroLog.id }] } : s)),
    achievements: [{ id: uid('a'), title: 'تحدي القراءة الأسبوعي: 50 قصة مقروءة', icon: '📚', achievedAt: today - 9 * DAY }],
  };
  // Keep the demo class challenge reachable but not yet complete (~75%).
  const progress = challengeProgress(demo);
  demo.challenge = { ...demo.challenge, target: Math.max(300, Math.ceil((progress * 1.3 + 40) / 100) * 100) };
  return demo;
}
