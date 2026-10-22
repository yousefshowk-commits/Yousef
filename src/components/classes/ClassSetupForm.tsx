import { useState, type ReactNode } from 'react';
import type { Settings } from '../../types';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Form';

export interface ClassSetupValues {
  settings: Pick<Settings, 'teacherName' | 'schoolName' | 'className'>;
  names: string[];
}

/** Teacher / school / class / students form used by onboarding and "new class". */
export function ClassSetupForm({ initial, submitLabel = '✨ إنشاء الفصل', onSubmit, footer }: {
  initial?: Partial<Pick<Settings, 'teacherName' | 'schoolName'>>;
  submitLabel?: string;
  onSubmit: (v: ClassSetupValues) => void;
  footer?: ReactNode;
}) {
  const [form, setForm] = useState({ teacherName: initial?.teacherName ?? '', schoolName: initial?.schoolName ?? '', className: '', count: '20', names: '' });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.teacherName.trim() || !form.className.trim()) {
      setError('من فضلك اكتب اسم المعلم/المعلمة واسم الفصل');
      return;
    }
    const typed = form.names.split(/\n|،|,/).map((n) => n.trim()).filter(Boolean);
    const count = Math.max(typed.length, Math.min(60, Math.max(0, Number(form.count) || 0)));
    onSubmit({
      settings: { teacherName: form.teacherName.trim(), schoolName: form.schoolName.trim() || 'مدرستي', className: form.className.trim() },
      names: Array.from({ length: count }, (_, i) => typed[i] ?? `طالب ${i + 1}`),
    });
  };

  return (
    <div className="space-y-4">
      <Field label="اسم المعلم/المعلمة *">
        <Input id="setup-teacher" value={form.teacherName} onChange={(e) => set('teacherName', e.target.value)} placeholder="مثال: أ. مريم أحمد" autoFocus />
      </Field>
      <Field label="اسم المدرسة">
        <Input id="setup-school" value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} placeholder="مثال: مدرسة النور الابتدائية" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="اسم الفصل *" className="col-span-2">
          <Input id="setup-class" value={form.className} onChange={(e) => set('className', e.target.value)} placeholder="الصف الثالث - ب" />
        </Field>
        <Field label="عدد الطلاب">
          <Input id="setup-count" type="number" min={0} max={60} value={form.count} onChange={(e) => set('count', e.target.value)} />
        </Field>
      </div>
      <Field label="أسماء الطلاب (اختياري)" hint="اسم في كل سطر">
        <Textarea id="setup-names" value={form.names} onChange={(e) => set('names', e.target.value)} placeholder={'أحمد محمد\nسارة علي\n...'} rows={4} />
      </Field>
      <p className="text-xs text-slate-500">إن لم تكتب الأسماء سننشئ طلابًا بأسماء مؤقتة يمكنك تعديلها لاحقًا.</p>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-600 dark:bg-rose-500/10">{error}</p>}
      <Button size="lg" className="w-full" onClick={submit}>
        {submitLabel}
      </Button>
      {footer}
    </div>
  );
}
