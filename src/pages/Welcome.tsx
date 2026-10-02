import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { Button } from '../components/ui/Button';
import { ClassSetupForm, type ClassSetupValues } from '../components/classes/ClassSetupForm';
import { Particles, Twinkles } from '../components/effects/Particles';
import { createClassState } from '../data/demo';
import { burst } from '../services/confetti';
import { play } from '../services/sound';

/** First-run splash + class setup. */
export default function Welcome() {
  const { state, update } = useStore();
  const [step, setStep] = useState<'welcome' | 'setup'>(() => (window.location.hash.includes('setup') ? 'setup' : 'welcome'));
  const create = ({ settings, names }: ClassSetupValues) => {
    play('celebrate');
    burst(0.5, 0.5, 160);
    update((s) => createClassState(s, settings, names));
    window.location.hash = '#/';
  };

  const tryDemo = () => {
    update((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
    window.location.hash = '#/';
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#818cf8,transparent_50%),radial-gradient(circle_at_80%_85%,rgba(251,146,60,.45),transparent_45%),linear-gradient(160deg,#4338ca,#1e1b4b)] p-4 text-white">
      <Twinkles count={30} />
      <Particles count={18} symbols={['⭐', '🏅', '🎁', '🚀', '💎', '🏆']} />

      {step === 'welcome' ? (
        <div className="animate-slide-up relative z-10 max-w-2xl text-center">
          <div className="animate-bounce-in mx-auto mb-6 w-fit">
            <div className="animate-glow text-[8rem] leading-none sm:text-[10rem]">🏆</div>
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-6xl">أهلاً بك في نظام التعزيز والمكافآت</h1>
          <p className="mt-4 text-xl text-indigo-100 sm:text-2xl">“حوّل الإنجازات الصغيرة إلى رحلة مليئة بالنجاح.”</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            {['⭐ نقاط ونجوم', '🏅 شارات إنجاز', '🎁 متجر مكافآت', '🎡 عجلة الحظ', '📊 تقارير ذكية'].map((f) => (
              <span key={f} className="rounded-full bg-white/15 px-4 py-2 font-bold backdrop-blur">{f}</span>
            ))}
          </div>
          <Button size="xl" variant="warning" className="mt-10 animate-pulse hover:animate-none" onClick={() => setStep('setup')}>
            🚀 ابدأ الآن
          </Button>
        </div>
      ) : (
        <div className="animate-slide-up relative z-10 w-full max-w-lg rounded-[2rem] bg-white p-6 text-slate-800 shadow-2xl sm:p-8 dark:bg-slate-900 dark:text-slate-100">
          <div className="mb-6 text-center">
            <div className="animate-float text-6xl">🏫</div>
            <h2 className="font-display mt-2 text-3xl font-extrabold">إعداد الفصل</h2>
            <p className="text-slate-500">خطوة واحدة وتبدأ رحلة التحفيز!</p>
          </div>
          <ClassSetupForm
            initial={state.settings.isDemo ? undefined : { teacherName: state.settings.teacherName, schoolName: state.settings.schoolName }}
            onSubmit={create}
            footer={
              state.settings.isDemo && (
                <Button variant="ghost" className="w-full" onClick={tryDemo}>
                  🎮 جرّب النظام أولًا بالبيانات التجريبية
                </Button>
              )
            }
          />
        </div>
      )}
    </div>
  );
}
