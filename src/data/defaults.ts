import type {
  Badge,
  Challenge,
  Group,
  Level,
  Reason,
  Reward,
  Settings,
  WheelSegment,
} from '../types';
import { startOfWeek } from '../utils/date';

export const DEFAULT_REASONS: Reason[] = [
  { id: 'homework', label: 'إنجاز الواجب', icon: '📚' },
  { id: 'participation', label: 'المشاركة', icon: '🙋' },
  { id: 'cooperation', label: 'التعاون', icon: '🤝' },
  { id: 'behavior', label: 'السلوك المتميز', icon: '✨' },
  { id: 'commitment', label: 'الالتزام', icon: '⏰' },
  { id: 'cleanliness', label: 'نظافة الفصل', icon: '🧹' },
  { id: 'reading', label: 'القراءة', icon: '📖' },
  { id: 'goal', label: 'تحقيق هدف', icon: '🎯' },
  { id: 'creative', label: 'فكرة إبداعية', icon: '💡' },
  { id: 'helping', label: 'مساعدة الآخرين', icon: '❤️' },
];

export const DEFAULT_LEVELS: Level[] = [
  { id: 1, name: 'مبتدئ', icon: '🌱', minPoints: 0, color: '#22c55e' },
  { id: 2, name: 'نجم الفصل', icon: '⭐', minPoints: 50, color: '#f59e0b' },
  { id: 3, name: 'منطلق', icon: '🚀', minPoints: 150, color: '#3b82f6' },
  { id: 4, name: 'متميز', icon: '🏅', minPoints: 300, color: '#8b5cf6' },
  { id: 5, name: 'بطل الفصل', icon: '👑', minPoints: 500, color: '#ec4899' },
  { id: 6, name: 'أسطورة الفصل', icon: '💎', minPoints: 800, color: '#06b6d4' },
];

export const DEFAULT_BADGES: Badge[] = [
  { id: 'reader', name: 'قارئ متميز', icon: '📚', color: '#0ea5e9', description: 'حصل على 5 نقاط قراءة أو أكثر', rule: { type: 'reasonCount', reasonId: 'reading', threshold: 5 } },
  { id: 'team', name: 'روح الفريق', icon: '🤝', color: '#10b981', description: 'تعاون مع زملائه 5 مرات', rule: { type: 'reasonCount', reasonId: 'cooperation', threshold: 5 } },
  { id: 'thinker', name: 'المفكر المبدع', icon: '💡', color: '#f59e0b', description: 'قدّم 3 أفكار إبداعية', rule: { type: 'reasonCount', reasonId: 'creative', threshold: 3 } },
  { id: 'committed', name: 'بطل الالتزام', icon: '⏰', color: '#6366f1', description: 'سلسلة التزام لمدة 5 أيام دراسية', rule: { type: 'streak', threshold: 5 } },
  { id: 'friend', name: 'صديق الجميع', icon: '❤️', color: '#ef4444', description: 'ساعد الآخرين 5 مرات', rule: { type: 'reasonCount', reasonId: 'helping', threshold: 5 } },
  { id: 'hunter', name: 'صائد الأهداف', icon: '🎯', color: '#f97316', description: 'حقق 3 أهداف', rule: { type: 'reasonCount', reasonId: 'goal', threshold: 3 } },
  { id: 'weekstar', name: 'نجم الأسبوع', icon: '⭐', color: '#eab308', description: 'جمع 50 نقطة في أسبوع واحد', rule: { type: 'weeklyPoints', threshold: 50 } },
  { id: 'excellent', name: 'الطالب المتميز', icon: '🏆', color: '#a855f7', description: 'جمع 300 نقطة إجمالًا', rule: { type: 'totalEarned', threshold: 300 } },
  { id: 'progress', name: 'تقدم رائع', icon: '🚀', color: '#3b82f6', description: 'وصل إلى المستوى 3', rule: { type: 'level', threshold: 3 } },
  { id: 'monthhero', name: 'بطل الشهر', icon: '👑', color: '#ec4899', description: 'تمنحها المعلمة/المعلم يدويًا لبطل الشهر', rule: { type: 'manual' } },
  { id: 'lucky', name: 'فائز العجلة', icon: '🍀', color: '#22c55e', description: 'فاز بشارة من عجلة المكافآت', rule: { type: 'manual' } },
];

export const DEFAULT_REWARDS: Reward[] = [
  { id: 'activity', name: 'اختيار نشاط الفصل', icon: '🎁', description: 'اختر النشاط الممتع القادم للفصل', cost: 100, color: '#f472b6', active: true },
  { id: 'seat', name: 'اختيار مكان الجلوس', icon: '🪑', description: 'اجلس في المكان الذي تحبه ليوم كامل', cost: 80, color: '#60a5fa', active: true },
  { id: 'game', name: 'وقت لعبة تعليمية', icon: '🎮', description: '15 دقيقة لعبة تعليمية ممتعة', cost: 120, color: '#a78bfa', active: true },
  { id: 'specialbadge', name: 'شارة خاصة', icon: '⭐', description: 'شارة مميزة تُعلّق على لوحة الشرف', cost: 150, color: '#fbbf24', active: true },
  { id: 'story', name: 'اختيار قصة الفصل', icon: '📚', description: 'اختر القصة التي سنقرؤها معًا', cost: 100, color: '#34d399', active: true },
  { id: 'leader', name: 'قائد الفصل ليوم', icon: '👑', description: 'كن قائد الفصل ومساعد المعلم ليوم كامل', cost: 200, color: '#f59e0b', active: true },
  { id: 'art', name: 'نشاط فني إضافي', icon: '🎨', description: 'وقت إضافي للرسم والأعمال الفنية', cost: 120, color: '#fb7185', active: true },
  { id: 'custom', name: 'مكافأة يحددها المعلم', icon: '🎁', description: 'مكافأة خاصة بعدد نقاط تحدده أنت', cost: 50, color: '#2dd4bf', active: true, custom: true },
];

export const DEFAULT_GROUPS: Group[] = [
  { id: 'red', name: 'الفريق الأحمر', emoji: '🔴', color: '#ef4444' },
  { id: 'blue', name: 'الفريق الأزرق', emoji: '🔵', color: '#3b82f6' },
  { id: 'green', name: 'الفريق الأخضر', emoji: '🟢', color: '#22c55e' },
  { id: 'gold', name: 'الفريق الذهبي', emoji: '🟡', color: '#eab308' },
];

export const DEFAULT_WHEEL: WheelSegment[] = [
  { id: 'w5', label: '+5 نقاط', icon: '⭐', color: '#f59e0b', kind: 'points', value: 5 },
  { id: 'wmystery', label: 'مكافأة مفاجئة', icon: '🎁', color: '#ec4899', kind: 'reward' },
  { id: 'w10', label: '+10 نقاط', icon: '⭐', color: '#8b5cf6', kind: 'points', value: 10 },
  { id: 'wbadge', label: 'شارة', icon: '🏅', color: '#10b981', kind: 'badge', badgeId: 'lucky' },
  { id: 'wfun', label: 'نشاط ممتع', icon: '🎮', color: '#3b82f6', kind: 'text' },
  { id: 'wleader', label: 'قائد الفصل', icon: '👑', color: '#f97316', kind: 'text' },
  { id: 'w20', label: '+20 نقطة', icon: '💎', color: '#06b6d4', kind: 'points', value: 20 },
];

export const MYSTERY_REWARDS: string[] = [
  'ملصق مميز من اختيارك 🌟',
  'الخروج أولًا للفسحة 🏃',
  'قلم ملون هدية ✏️',
  'رسالة شكر لوليّ الأمر 💌',
  'اختيار أغنية/نشيد الصباح 🎵',
  'الجلوس على كرسي المعلم لمدة حصة 🪑',
  'مساعد المعلم في توزيع الأوراق 📄',
  'بطاقة "بدون واجب" ليوم واحد 🎫',
];

export const ENCOURAGEMENTS: string[] = [
  'عمل رائع!',
  'استمر يا بطل!',
  'تقدم ممتاز!',
  'أحسنت، أنت تتطور!',
  'مشاركة رائعة!',
  'فخور بك جدًا!',
  'إبداع لا يتوقف!',
  'أنت قدوة لزملائك!',
  'خطوة جميلة نحو النجاح!',
  'ما شاء الله، تميز واضح!',
];

export const DAILY_CHALLENGES: { text: string; reasonId: string; icon: string; target: number }[] = [
  { text: 'شارك 10 طلاب في النقاش اليوم', reasonId: 'participation', icon: '🙋', target: 10 },
  { text: 'أنجز 8 طلاب واجباتهم', reasonId: 'homework', icon: '📚', target: 8 },
  { text: 'ساعد 5 طلاب زملاءهم', reasonId: 'helping', icon: '❤️', target: 5 },
  { text: 'قرأ 6 طلاب قصة قصيرة', reasonId: 'reading', icon: '📖', target: 6 },
  { text: 'فصل نظيف طوال اليوم — 5 نقاط نظافة', reasonId: 'cleanliness', icon: '🧹', target: 5 },
  { text: 'قدّم 4 طلاب أفكارًا إبداعية', reasonId: 'creative', icon: '💡', target: 4 },
  { text: 'تعاون الطلاب في 6 مهام جماعية', reasonId: 'cooperation', icon: '🤝', target: 6 },
];

export const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🐸', '🐵', '🦄', '🐙', '🐳', '🦉', '🐧', '🐰', '🐻', '🐝', '🦋', '🐬', '🦖', '🐢', '🦜', '🐞', '🐹', '🦒', '🐘'];

export const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#a855f7', '#eab308'];

export const ICON_CHOICES = ['📚', '🙋', '🤝', '✨', '⏰', '🧹', '📖', '🎯', '💡', '❤️', '⭐', '🏆', '🚀', '👑', '💎', '🎁', '🎨', '🎮', '🪑', '🏅', '🍀', '🌟', '🔥', '🎵', '⚽', '🧠', '🔬', '✏️', '🌈', '🦸', '🥇', '🎉', '💪', '🌱', '🧩', '🗣️'];

export const DEFAULT_SETTINGS: Settings = {
  schoolName: 'مدرسة المستقبل الابتدائية',
  teacherName: 'أ. مريم',
  className: 'الصف الرابع - أ',
  term: 'الفصل الدراسي الأول',
  theme: 'light',
  sound: true,
  animations: true,
  rankingMode: 'individual',
  allowDeduction: false,
  quickAmounts: [1, 2, 5, 10],
  onboarded: false,
  isDemo: true,
};

export const defaultChallenge = (): Challenge => ({
  title: 'تحدي الأسبوع',
  target: 2000,
  reward: 'حصة أنشطة ممتعة للفصل كله 🎉',
  startAt: startOfWeek(),
});
