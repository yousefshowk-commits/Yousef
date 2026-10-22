import { useMemo } from 'react';
import type { AppState, ID } from '../types';
import { earnedBetween, levelInfo, streakFor, type LevelInfo } from '../services/stats';
import { startOfWeek } from '../utils/date';

export interface StudentStats {
  level: LevelInfo;
  streak: number;
  week: number;
}

/** Derived per-student numbers, memoised on the log/students/levels. */
export function useStudentStats(state: AppState): Map<ID, StudentStats> {
  const { students, log, levels } = state;
  return useMemo(() => {
    const from = startOfWeek();
    const map = new Map<ID, StudentStats>();
    for (const s of students) {
      map.set(s.id, {
        level: levelInfo(levels, s.totalEarned),
        streak: streakFor(log, s.id),
        week: earnedBetween(log, from, Infinity, s.id),
      });
    }
    return map;
  }, [students, log, levels]);
}
