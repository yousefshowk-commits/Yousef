import { createPortal } from 'react-dom';
import type { Level, Student } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Twinkles } from './Particles';
import { firstName, g } from '../../utils/format';

export function LevelUpModal({ student, level, onClose }: { student: Student; level: Level; onClose: () => void }) {
  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-bounce-in relative w-full max-w-md overflow-hidden rounded-[2.5rem] p-8 text-center text-white shadow-2xl"
        style={{ background: `linear-gradient(145deg, ${level.color}, #7c3aed 70%, #1e1b4b)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <Twinkles count={18} />
        <p dir="ltr" className="font-display relative animate-pulse text-5xl font-extrabold tracking-wide text-amber-200 drop-shadow-lg">🎉 LEVEL UP!</p>
        <div className="relative mx-auto my-6 w-fit">
          <Avatar student={student} size="xl" className="ring-amber-200/80" />
          <div className="animate-glow absolute -bottom-3 -left-3 grid h-16 w-16 place-items-center rounded-full bg-white text-4xl shadow-xl">
            <span className="animate-wiggle">{level.icon}</span>
          </div>
        </div>
        <h2 className="font-display relative text-3xl font-extrabold">مبارك يا {firstName(student.name)}!</h2>
        <p className="relative mt-2 text-lg text-indigo-100">
          {g(student.gender, 'لقد وصلت', 'لقد وصلتِ')} إلى مستوى <b className="text-amber-200">{level.name}</b> {level.icon}
        </p>
        <p className="relative mt-1 text-sm text-indigo-200">المستوى {level.id}</p>
        <Button size="lg" variant="warning" className="relative mt-7 w-full" onClick={onClose}>
          رائع! 🚀
        </Button>
      </div>
    </div>,
    document.body,
  );
}
