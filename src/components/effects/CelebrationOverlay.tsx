import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Badge, Student } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Particles, Twinkles } from './Particles';
import { bigCelebration } from '../../services/confetti';

export interface CelebrationData {
  title: string;
  subtitle?: string;
  student?: Student;
  badges?: Badge[];
  icon?: string;
}

export function CelebrationOverlay({ data, onClose }: { data: CelebrationData; onClose: () => void }) {
  useEffect(() => {
    bigCelebration(3500);
    const again = setInterval(() => bigCelebration(1200), 4500);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(again);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#7c3aed_0%,#4c1d95_45%,#1e1b4b_100%)] p-6 text-center text-white"
      onClick={onClose}
      role="dialog"
      aria-label="احتفال"
    >
      <Twinkles />
      <Particles />
      <div
        className="animate-spin-slow pointer-events-none absolute h-[140vmax] w-[140vmax]"
        style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,.07) 0deg 12deg, transparent 12deg 30deg)' }}
      />

      <button className="absolute left-4 top-4 z-10 rounded-full bg-white/15 p-3 transition hover:bg-white/25" onClick={onClose} aria-label="إغلاق">
        <X />
      </button>

      <div className="relative z-10 flex flex-col items-center">
        {data.student ? (
          <div className="animate-bounce-in mb-6">
            <div className="animate-glow rounded-full">
              <Avatar student={data.student} size="2xl" className="ring-8 ring-amber-300/80" />
            </div>
          </div>
        ) : (
          <div className="animate-bounce-in mb-4">
            <div className="animate-glow text-[9rem] leading-none sm:text-[12rem]">{data.icon ?? '🏆'}</div>
          </div>
        )}
        <h1 className="font-display animate-pop text-5xl font-extrabold leading-tight drop-shadow-[0_6px_30px_rgba(250,204,21,.6)] sm:text-7xl lg:text-8xl" style={{ animationDelay: '.2s' }}>
          {data.title}
        </h1>
        {data.subtitle && (
          <p className="animate-slide-up mt-4 max-w-3xl text-xl font-bold text-violet-100 sm:text-3xl" style={{ animationDelay: '.45s' }}>
            {data.subtitle}
          </p>
        )}
        {!!data.badges?.length && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {data.badges.map((b, i) => (
              <div key={b.id} className="animate-bounce-in flex flex-col items-center gap-1" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
                <div className="animate-float grid h-20 w-20 place-items-center rounded-3xl bg-white/15 text-5xl shadow-xl ring-2 ring-white/30 backdrop-blur" style={{ animationDelay: `${i * 0.2}s` }}>
                  {b.icon}
                </div>
                <span className="text-sm font-bold">{b.name}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-10 text-sm text-violet-200/80">اضغط في أي مكان للإغلاق</p>
      </div>
    </div>,
    document.body,
  );
}
