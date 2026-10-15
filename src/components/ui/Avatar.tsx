import type { Student } from '../../types';
import { cn } from './cn';

const sizes = { xs: 'h-8 w-8 text-lg', sm: 'h-10 w-10 text-xl', md: 'h-14 w-14 text-3xl', lg: 'h-20 w-20 text-5xl', xl: 'h-28 w-28 text-7xl', '2xl': 'h-40 w-40 text-8xl' };

export function Avatar({ student, size = 'md', className, ring = true }: { student: Pick<Student, 'avatar' | 'photo' | 'color' | 'name'>; size?: keyof typeof sizes; className?: string; ring?: boolean }) {
  return (
    <div
      className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full', ring && 'ring-4 ring-white/80 dark:ring-white/10', sizes[size], className)}
      style={{ background: `linear-gradient(135deg, ${student.color}33, ${student.color}66)` }}
      title={student.name}
    >
      {student.photo ? <img src={student.photo} alt={student.name} className="h-full w-full object-cover" /> : <span className="leading-none">{student.avatar}</span>}
    </div>
  );
}
