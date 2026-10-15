import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { EngineEvent, Level, Student } from '../types';
import { useStore } from './AppStore';
import { useToast } from '../components/ui/Toast';
import { LevelUpModal } from '../components/effects/LevelUpModal';
import { CelebrationOverlay, type CelebrationData } from '../components/effects/CelebrationOverlay';
import { bigCelebration, burst, setAnimationsEnabled, starBurst } from '../services/confetti';
import { play, setSoundEnabled } from '../services/sound';
import { firstName, g } from '../utils/format';

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  negative?: boolean;
}

interface FxValue {
  handleEvents: (events: EngineEvent[]) => void;
  /** "+5 ⭐" flying up from a screen point + star burst. */
  floatPoints: (amount: number, origin?: { x: number; y: number }) => void;
  celebrate: (data: CelebrationData) => void;
}

const FxContext = createContext<FxValue | null>(null);

export function FxProvider({ children }: { children: ReactNode }) {
  const { state, get } = useStore();
  const toast = useToast();
  const [levelQueue, setLevelQueue] = useState<{ student: Student; level: Level }[]>([]);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const counter = useRef(0);

  useEffect(() => setSoundEnabled(state.settings.sound), [state.settings.sound]);
  useEffect(() => {
    setAnimationsEnabled(state.settings.animations);
    document.documentElement.classList.toggle('no-motion', !state.settings.animations);
  }, [state.settings.animations]);

  const floatPoints = useCallback((amount: number, origin?: { x: number; y: number }) => {
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const id = ++counter.current;
    setFloaters((l) => [...l, { id, x, y, text: `${amount > 0 ? '+' : '−'}${Math.abs(amount)} ⭐`, negative: amount < 0 }]);
    setTimeout(() => setFloaters((l) => l.filter((f) => f.id !== id)), 1300);
    if (amount > 0) starBurst(x / window.innerWidth, y / window.innerHeight);
  }, []);

  const handleEvents = useCallback(
    (events: EngineEvent[]) => {
      const s = get();
      const levelUps: { student: Student; level: Level }[] = [];
      for (const ev of events) {
        if (ev.type === 'levelUp') {
          const student = s.students.find((x) => x.id === ev.studentId);
          if (student) levelUps.push({ student, level: ev.level });
        } else if (ev.type === 'badge') {
          const student = s.students.find((x) => x.id === ev.studentId);
          if (!student) continue;
          play('badge');
          toast({
            variant: 'badge',
            icon: ev.badge.icon,
            title: `🔔 شارة جديدة: ${ev.badge.name}`,
            description: `${firstName(student.name)} ${g(student.gender, 'حصل', 'حصلت')} على شارة «${ev.badge.name}» 🏅`,
            duration: 4500,
          });
          burst(0.5, 0.2, 60);
        } else if (ev.type === 'challengeComplete') {
          play('celebrate');
          setCelebration({ title: 'إنجاز جماعي رائع!', subtitle: `أكمل الفصل «${ev.challenge.title}» — ${ev.challenge.reward}`, icon: '🏆' });
        }
      }
      if (levelUps.length) {
        play('levelup');
        bigCelebration(1800);
        setLevelQueue((q) => [...q, ...levelUps]);
      }
    },
    [get, toast],
  );

  const celebrate = useCallback((data: CelebrationData) => {
    play('celebrate');
    setCelebration(data);
  }, []);

  const closeCelebration = useCallback(() => setCelebration(null), []);
  const current = levelQueue[0];

  return (
    <FxContext.Provider value={{ handleEvents, floatPoints, celebrate }}>
      {children}
      {current && !celebration && (
        <LevelUpModal
          student={current.student}
          level={current.level}
          onClose={() => setLevelQueue((q) => q.slice(1))}
        />
      )}
      {celebration && <CelebrationOverlay data={celebration} onClose={closeCelebration} />}
      {createPortal(
        <div className="pointer-events-none fixed inset-0 z-[110]" aria-hidden>
          {floaters.map((f) => (
            <span
              key={f.id}
              className={`animate-fly-up font-display absolute whitespace-nowrap text-4xl font-extrabold drop-shadow-[0_4px_10px_rgba(0,0,0,.25)] ${f.negative ? 'text-rose-500' : 'text-amber-400'}`}
              style={{ left: f.x, top: f.y - 30 }}
            >
              {f.text}
            </span>
          ))}
        </div>,
        document.body,
      )}
    </FxContext.Provider>
  );
}

export function useFx() {
  const ctx = useContext(FxContext);
  if (!ctx) throw new Error('useFx must be used inside FxProvider');
  return ctx;
}
