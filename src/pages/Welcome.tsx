import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Form';
import { Particles, Twinkles } from '../components/effects/Particles';
import { createClassState } from '../data/demo';
import { burst } from '../services/confetti';
import { play } from '../services/sound';

/** First-run splash + class setup. */
export default function Welcome() {
  const { state, update } = useStore();
  const [step, setStep] = useState<'welcome' | 'setup'>(() => (window.location.hash.includes('setup') ? 'setup' : 'welcome'));
  const [form, setForm] = useState({
    teacherName: state.settings.isDemo ? '' : state.settings.teacherName,
    schoolName: state.settings.isDemo ? '' : state.settings.schoolName,
    className: state.settings.isDemo ? '' : state.settings.className,
    count: '20',
    names: '',
  });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = () => {
    if (!form.teacherName.trim() || !form.className.trim()) {
      setError('من فضلك اكتب اسم المعلم/المعلمة واسم الفصل');
      return;
    }
    const typed = form.names.split(/\n|،|,/).map((n) => n.trim()).filter(Boolean);
    const count = Math.max(typed.length, Math.min(60, Math.max(0, Number(form.count) || 0)));
    const names = Array.from({ length: count }, (_, i) => typed[i] ?? `طالب ${i + 1}`);
    play('celebrate');
    burst(0.5, 0.5, 160);
    update((s) =>
      createClassState(s, {
        teacherName: form.teacherName.trim(),
        schoolName: form.schoolName.trim() || 'مدرستي',
        className: form.className.trim(),
      }, names),
    );
    window.location.hash = '#/';
  };

  const tryDemo = () => {
    update((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
    window.location.hash = '#/';
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#a78bfa,transparent_50%),radial-gradient(circle_at_80%_80%,#f472b6,transparent_45%),linear-gradient(160deg,#4c1d95,#1e1b4b)] p-4 text-white">
      <Twinkles count={30} />
      <Particles count={18} symbols={['⭐', '🏅', '🎁', '🚀', '💎', '🏆']} />

      {step === 'welcome' ? (
        <div className="animate-slide-up relative z-10 max-w-2xl text-center">
          <div className="animate-bounce-in mx-auto mb-6 w-fit">
            <div className="animate-glow text-[8rem] leading-none sm:text-[10rem]">🏆</div>
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-6xl">أهلاً بك في نظام التعزيز والمكافآت</h1>
          <p className="mt-4 text-xl text-violet-100 sm:text-2xl">“حوّل الإنجازات الصغيرة إلى رحلة مليئة بالنجاح.”</p>
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
          <div className="space-y-4">
            <Field label="اسم المعلم/المعلمة *">
              <Input value={form.teacherName} onChange={(e) => set('teacherName', e.target.value)} placeholder="مثال: أ. مريم أحمد" autoFocus />
            </Field>
            <Field label="اسم المدرسة">
              <Input value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} placeholder="مثال: مدرسة النور الابتدائية" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="اسم الفصل *" className="col-span-2">
                <Input value={form.className} onChange={(e) => set('className', e.target.value)} placeholder="الصف الثالث - ب" />
              </Field>
              <Field label="عدد الطلاب">
                <Input type="number" min={0} max={60} value={form.count} onChange={(e) => set('count', e.target.value)} />
              </Field>
            </div>
            <Field label="أسماء الطلاب (اختياري)" hint="اسم في كل سطر">
              <Textarea value={form.names} onChange={(e) => set('names', e.target.value)} placeholder={'أحمد محمد\nسارة علي\n...'} rows={4} />
            </Field>
            <p className="text-xs text-slate-500">إن لم تكتب الأسماء سننشئ طلابًا بأسماء مؤقتة يمكنك تعديلها لاحقًا.</p>
            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-600 dark:bg-rose-500/10">{error}</p>}
            <Button size="lg" className="w-full" onClick={create}>
              ✨ إنشاء الفصل
            </Button>
            {state.settings.isDemo && (
              <Button variant="ghost" className="w-full" onClick={tryDemo}>
                🎮 جرّب النظام أولًا بالبيانات التجريبية
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
