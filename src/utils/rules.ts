import type { BadgeRule, BadgeRuleType, Reason } from '../types';

export const RULE_LABELS: Record<BadgeRuleType, string> = {
  manual: 'يدوية — يمنحها المعلم',
  totalEarned: 'إجمالي النقاط المكتسبة',
  reasonCount: 'عدد مرات سبب معين',
  streak: 'أيام التزام متتالية',
  redemptions: 'عدد المكافآت المستبدلة',
  weeklyPoints: 'نقاط أسبوع واحد',
  level: 'الوصول لمستوى',
};

export function describeRule(rule: BadgeRule, reasons: Reason[]): string {
  const n = rule.threshold ?? 0;
  switch (rule.type) {
    case 'manual':
      return 'تُمنح يدويًا';
    case 'totalEarned':
      return `تلقائيًا عند جمع ${n} نقطة`;
    case 'reasonCount': {
      const r = reasons.find((x) => x.id === rule.reasonId);
      return `تلقائيًا عند ${n} مرات «${r?.label ?? '—'}»`;
    }
    case 'streak':
      return `تلقائيًا بعد ${n} أيام متتالية`;
    case 'redemptions':
      return `تلقائيًا بعد استبدال ${n} مكافآت`;
    case 'weeklyPoints':
      return `تلقائيًا عند ${n} نقطة في أسبوع`;
    case 'level':
      return `تلقائيًا عند الوصول للمستوى ${n}`;
  }
}
