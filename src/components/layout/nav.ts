import { Award, School, BarChart3, Disc3, Gift, LayoutDashboard, PartyPopper, ScrollText, Settings, Target, Trophy, Users, UsersRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, emoji: '🏠', mobile: true },
  { to: '/students', label: 'الطلاب', icon: Users, emoji: '👦', mobile: true },
  { to: '/badges', label: 'الشارات', icon: Award, emoji: '🏅' },
  { to: '/shop', label: 'متجر المكافآت', icon: Gift, emoji: '🎁', mobile: true },
  { to: '/wheel', label: 'عجلة المكافآت', icon: Disc3, emoji: '🎡' },
  { to: '/challenge', label: 'تحدي الفصل', icon: Target, emoji: '🎯' },
  { to: '/leaderboard', label: 'لوحة المتصدرين', icon: Trophy, emoji: '🏆', mobile: true },
  { to: '/groups', label: 'المجموعات', icon: UsersRound, emoji: '👥' },
  { to: '/reports', label: 'التقارير', icon: BarChart3, emoji: '📊' },
  { to: '/certificate', label: 'الشهادات', icon: ScrollText, emoji: '📜' },
  { to: '/celebrate', label: 'صفحة الاحتفال', icon: PartyPopper, emoji: '🎉' },
  { to: '/classes', label: 'فصولي', icon: School, emoji: '🏫' },
  { to: '/settings', label: 'الإعدادات', icon: Settings, emoji: '⚙️' },
];
