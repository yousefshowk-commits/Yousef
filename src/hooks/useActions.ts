import { useCallback } from 'react';
import type { ID, Student } from '../types';
import { useStore } from '../store/AppStore';
import { useFx } from '../store/FxProvider';
import { useToast } from '../components/ui/Toast';
import * as engine from '../services/engine';
import { play } from '../services/sound';
import { burst } from '../services/confetti';
import { firstName, g, num, pointsWord } from '../utils/format';
import { pick } from '../utils/id';

type Origin = { x: number; y: number } | undefined;

/**
 * High-level teacher actions: run the pure engine, then trigger sounds,
 * animations and toasts (with undo) for the result.
 */
export function useActions() {
  const { commit, get, update } = useStore();
  const fx = useFx();
  const toast = useToast();

  const undo = useCallback(
    (entryId: ID) => {
      const r = engine.undo(get(), entryId);
      if ('error' in r) {
        toast({ variant: 'error', icon: '⚠️', title: r.error });
        return false;
      }
      commit(() => r);
      play('undo');
      toast({ variant: 'info', icon: '↩️', title: 'تم التراجع عن العملية', description: 'سُجّل التراجع في سجل النشاط' });
      return true;
    },
    [commit, get, toast],
  );

  const awardPoints = useCallback(
    (studentIds: ID[], amount: number, reasonId?: ID, origin?: Origin, extra?: { type?: 'award' | 'wheel'; label?: string; icon?: string }) => {
      if (!studentIds.length || !amount) return;
      const r = commit((s) => engine.award(s, { studentIds, amount, reasonId, ...extra }));
      const s = get();
      const reason = s.reasons.find((x) => x.id === reasonId);
      if (amount > 0) {
        play('points');
        fx.floatPoints(amount, origin);
        const one = studentIds.length === 1 ? s.students.find((x) => x.id === studentIds[0]) : undefined;
        const ids = r.entryIds ?? [];
        toast({
          variant: 'success',
          icon: reason?.icon ?? '⭐',
          title: one
            ? `رائع يا ${firstName(one.name)}! ${g(one.gender, 'حصلت', 'حصلتِ')} على +${amount} ${pointsWord(amount)} 🎉`
            : `رائع! حصل ${studentIds.length} طلاب على +${amount} ${pointsWord(amount)} 🎉`,
          description: extra?.label ?? reason?.label,
          action: ids.length ? { label: 'تراجع', onClick: () => ids.forEach((id) => undo(id)) } : undefined,
        });
      } else {
        play('undo');
        fx.floatPoints(amount, origin);
        toast({
          variant: 'info',
          icon: '➖',
          title: `تم خصم ${num(-amount)} ${pointsWord(amount)}`,
          description: reason?.label,
          action: r.entryId ? { label: 'تراجع', onClick: () => undo(r.entryId!) } : undefined,
        });
      }
      fx.handleEvents(r.events);
    },
    [commit, fx, get, toast, undo],
  );

  const awardGroup = useCallback(
    (groupId: ID, amount: number, reasonId?: ID, origin?: Origin) => {
      const r = commit((s) => engine.awardGroup(s, groupId, amount, reasonId));
      const group = get().groups.find((x) => x.id === groupId);
      play('points');
      fx.floatPoints(amount, origin);
      toast({
        icon: group?.emoji ?? '👥',
        title: `+${amount} ${pointsWord(amount)} لـ${group?.name ?? 'الفريق'} 🎉`,
        action: r.entryId ? { label: 'تراجع', onClick: () => undo(r.entryId!) } : undefined,
      });
      fx.handleEvents(r.events);
    },
    [commit, fx, get, toast, undo],
  );

  const redeem = useCallback(
    (studentId: ID, rewardId: ID, cost: number) => {
      const r = engine.redeem(get(), studentId, rewardId, cost);
      if ('error' in r) {
        toast({ variant: 'error', icon: '💎', title: r.error });
        return false;
      }
      commit(() => r);
      const s = get();
      const st = s.students.find((x) => x.id === studentId)!;
      const reward = s.rewards.find((x) => x.id === rewardId)!;
      play('reward');
      burst(0.5, 0.5, 100);
      toast({
        variant: 'badge',
        icon: reward.icon,
        title: `مبروك يا ${firstName(st.name)}! 🎁`,
        description: `${g(st.gender, 'حصلت', 'حصلتِ')} على «${reward.name}» مقابل ${num(cost)} نقطة`,
        action: r.entryId ? { label: 'تراجع', onClick: () => undo(r.entryId!) } : undefined,
      });
      fx.handleEvents(r.events);
      return true;
    },
    [commit, fx, get, toast, undo],
  );

  const grantBadge = useCallback(
    (studentId: ID, badgeId: ID) => {
      const r = commit((s) => engine.grantBadge(s, studentId, badgeId));
      if (!r.events.length) toast({ variant: 'info', icon: 'ℹ️', title: 'الطالب يملك هذه الشارة مسبقًا' });
      fx.handleEvents(r.events);
    },
    [commit, fx, toast],
  );

  const revokeBadge = useCallback(
    (studentId: ID, badgeId: ID) => {
      commit((s) => engine.revokeBadge(s, studentId, badgeId));
      play('undo');
      toast({ variant: 'info', icon: '↩️', title: 'تم سحب الشارة' });
    },
    [commit, toast],
  );

  const encourage = useCallback(
    (student?: Student) => {
      const msg = pick(get().encouragements.length ? get().encouragements : ['أحسنت!']);
      play('badge');
      burst(0.5, 0.3, 50);
      toast({ variant: 'info', icon: '❤️', title: student ? `${msg} يا ${firstName(student.name)} 💜` : msg, duration: 3500 });
    },
    [get, toast],
  );

  const deleteStudent = useCallback(
    (id: ID) => {
      update((s) => ({ ...s, students: s.students.filter((x) => x.id !== id), log: s.log.filter((e) => e.studentId !== id) }));
    },
    [update],
  );

  return { awardPoints, awardGroup, undo, redeem, grantBadge, revokeBadge, encourage, deleteStudent };
}
