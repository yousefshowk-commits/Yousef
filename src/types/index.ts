export type ID = string;

export type Gender = 'm' | 'f';

export interface EarnedBadge {
  badgeId: ID;
  earnedAt: number;
  /** Log entry that granted the badge (used for undo). */
  logId: ID;
}

export interface Student {
  id: ID;
  name: string;
  gender: Gender;
  /** Emoji avatar, used when no photo is set. */
  avatar: string;
  /** Optional photo as a (resized) data URL. */
  photo?: string;
  color: string;
  groupId: ID | null;
  /** Spendable balance (💎). */
  points: number;
  /** Lifetime earned points (⭐) — drives levels. */
  totalEarned: number;
  /** Points spent in the reward shop (🎁). */
  totalSpent: number;
  badges: EarnedBadge[];
  createdAt: number;
}

export interface Reason {
  id: ID;
  label: string;
  icon: string;
}

export interface Level {
  id: number;
  name: string;
  icon: string;
  minPoints: number;
  color: string;
}

export type BadgeRuleType =
  | 'manual'
  | 'totalEarned'
  | 'reasonCount'
  | 'streak'
  | 'redemptions'
  | 'weeklyPoints'
  | 'level';

export interface BadgeRule {
  type: BadgeRuleType;
  threshold?: number;
  reasonId?: ID;
}

export interface Badge {
  id: ID;
  name: string;
  icon: string;
  description: string;
  color: string;
  rule: BadgeRule;
}

export interface Reward {
  id: ID;
  name: string;
  icon: string;
  description: string;
  cost: number;
  color: string;
  /** Teacher sets the cost at redeem time. */
  custom?: boolean;
  active: boolean;
}

export interface Group {
  id: ID;
  name: string;
  emoji: string;
  color: string;
}

export type WheelKind = 'points' | 'badge' | 'reward' | 'text';

export interface WheelSegment {
  id: ID;
  label: string;
  icon: string;
  color: string;
  kind: WheelKind;
  value?: number;
  badgeId?: ID;
}

export type LogType =
  | 'award'
  | 'deduct'
  | 'redeem'
  | 'badge'
  | 'levelup'
  | 'wheel'
  | 'group'
  | 'challenge'
  | 'undo';

export interface LogEntry {
  id: ID;
  type: LogType;
  studentId?: ID;
  groupId?: ID;
  /** Signed point delta applied to the student/group (0 for badges/levels). */
  amount: number;
  reasonId?: ID;
  rewardId?: ID;
  badgeId?: ID;
  level?: number;
  label: string;
  icon: string;
  createdAt: number;
  undone?: boolean;
  /** Entries created as a consequence of another entry (auto-badge, level-up). */
  parentId?: ID;
  /** For 'undo' entries — the entry that was reverted. */
  undoOf?: ID;
}

export interface Challenge {
  title: string;
  target: number;
  reward: string;
  startAt: number;
  completedAt?: number;
}

export interface ClassAchievement {
  id: ID;
  title: string;
  icon: string;
  achievedAt: number;
}

export type RankingMode = 'individual' | 'personal' | 'groups';
export type Theme = 'light' | 'dark';

export interface Settings {
  schoolName: string;
  teacherName: string;
  className: string;
  term: string;
  theme: Theme;
  sound: boolean;
  animations: boolean;
  rankingMode: RankingMode;
  allowDeduction: boolean;
  quickAmounts: number[];
  onboarded: boolean;
  isDemo: boolean;
}

export interface AppState {
  version: 1;
  settings: Settings;
  students: Student[];
  reasons: Reason[];
  levels: Level[];
  badges: Badge[];
  rewards: Reward[];
  groups: Group[];
  wheel: WheelSegment[];
  log: LogEntry[];
  challenge: Challenge;
  achievements: ClassAchievement[];
  encouragements: string[];
  /** yyyy-mm-dd → completed */
  dailyDone: Record<string, boolean>;
}

/** Side-effect events emitted by engine operations, consumed by the FX layer. */
export type EngineEvent =
  | { type: 'levelUp'; studentId: ID; level: Level }
  | { type: 'badge'; studentId: ID; badge: Badge }
  | { type: 'challengeComplete'; challenge: Challenge };
