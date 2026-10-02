import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { PageHeader, EmptyState } from '../components/ui/misc';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Form';
import { StudentPicker } from '../components/students/StudentPicker';
import { levelInfo } from '../services/stats';
import { formatDate } from '../utils/date';
import { g } from '../utils/format';
import { cn } from '../components/ui/cn';

const TYPES = [
  { id: 'excellence', title: 'شهادة تميز', icon: '🏆' },
  { id: 'thanks', title: 'شهادة شكر وتقدير', icon: '🌟' },
  { id: 'achievement', title: 'شهادة إنجاز', icon: '🎖️' },
  { id: 'hero', title: 'شهادة بطل الشهر', icon: '👑' },
];

const THEMES = {
  gold: { border: '#d97706', accent: '#f59e0b', soft: '#fef3c7' },
  violet: { border: '#7c3aed', accent: '#a855f7', soft: '#ede9fe' },
  teal: { border: '#0d9488', accent: '#14b8a6', soft: '#ccfbf1' },
};

function Corner({ color, className }: { color: string; className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn('absolute h-[14%] w-auto', className)} aria-hidden>
      <path d="M4 96 V30 Q4 4 30 4 H96" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M16 96 V38 Q16 16 38 16 H96" fill="none" stroke={color} strokeWidth="2" opacity=".6" />
      <circle cx="30" cy="30" r="8" fill={color} />
      <path d="M30 18 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#fff" opacity=".9" transform="translate(0 5) scale(1)" />
    </svg>
  );
}

export default function Certificate() {
  const { state } = useStore();
  const [params] = useSearchParams();
  const [studentId, setStudentId] = useState<string | null>(params.get('student') ?? state.students[0]?.id ?? null);
  const [type, setType] = useState(TYPES[0].id);
  const [theme, setTheme] = useState<keyof typeof THEMES>('gold');
  const [message, setMessage] = useState('');

  // A4 landscape page setup only while this page is mounted.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@media print { @page { size: A4 landscape; margin: 0; } html, body { width: 297mm; height: 210mm; } }';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const student = state.students.find((s) => s.id === studentId);
  const t = TYPES.find((x) => x.id === type)!;
  const c = THEMES[theme];
  const info = student ? levelInfo(state.levels, student.totalEarned) : null;
  const defaultMsg = student ? g(student.gender, 'تقديرًا لتميزه وإنجازاته الرائعة، وتحفيزًا له لمواصلة التفوق والنجاح.', 'تقديرًا لتميزها وإنجازاتها الرائعة، وتحفيزًا لها لمواصلة التفوق والنجاح.') : '';

  if (!state.students.length) return <EmptyState icon="📜" title="لا يوجد طلاب" text="أضف طلابًا أولًا لإنشاء الشهادات" />;

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="no-print">
        <PageHeader icon="📜" title="مولّد الشهادات" subtitle="شهادات جاهزة للطباعة بحجم A4" actions={<Button icon={<Printer size={18} />} onClick={() => window.print()} disabled={!student}>🖨️ طباعة الشهادة</Button>} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[20rem_1fr] print:block">
        <Card className="no-print space-y-4 self-start">
          <StudentPicker students={state.students} value={studentId} onChange={setStudentId} />
          <Field label="نوع الشهادة">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.title}</option>)}
            </Select>
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">لون التصميم</p>
            <div className="flex gap-2">
              {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((k) => (
                <button key={k} onClick={() => setTheme(k)} className={cn('h-10 w-10 rounded-full', theme === k && 'ring-4 ring-offset-2 ring-indigo-400 dark:ring-offset-slate-900')} style={{ background: THEMES[k].border }} aria-label={k} />
              ))}
            </div>
          </div>
          <Field label="نص الشهادة (اختياري)">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={defaultMsg} />
          </Field>
        </Card>

        {student && (
          <div className="overflow-x-auto print:overflow-visible">
            <div
              id="certificate"
              className="relative mx-auto aspect-[297/210] w-full min-w-[560px] overflow-hidden bg-white text-slate-800 shadow-2xl print:m-0 print:h-[210mm] print:w-[297mm] print:min-w-0 print:shadow-none"
              style={{ containerType: 'inline-size', fontFamily: 'Tajawal, sans-serif' }}
              dir="rtl"
            >
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${c.soft}, #fff 60%)` }} />
              <div className="absolute inset-[2.2cqw] rounded-[1.2cqw] border-[0.5cqw]" style={{ borderColor: c.border }} />
              <div className="absolute inset-[3.2cqw] rounded-[0.8cqw] border-[0.15cqw] border-dashed" style={{ borderColor: c.accent }} />
              <Corner color={c.border} className="right-[2.2cqw] top-[2.2cqw] -scale-x-100" />
              <Corner color={c.border} className="left-[2.2cqw] top-[2.2cqw]" />
              <Corner color={c.border} className="bottom-[2.2cqw] right-[2.2cqw] rotate-180" />
              <Corner color={c.border} className="bottom-[2.2cqw] left-[2.2cqw] -scale-y-100" />

              <div className="relative flex h-full flex-col items-center justify-between px-[10cqw] py-[5.5cqw] text-center">
                <div className="flex w-full items-start justify-between text-[1.3cqw] text-slate-500">
                  <span>{state.settings.schoolName}</span>
                  <span>{state.settings.term}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[6cqw] leading-none">{t.icon}</div>
                  <h1 className="font-display mt-[0.6cqw] text-[5cqw] font-extrabold leading-tight" style={{ color: c.border }}>{t.title}</h1>
                  <div className="mt-[0.4cqw] h-[0.3cqw] w-[18cqw] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
                </div>
                <div>
                  <p className="text-[2cqw] text-slate-600">{g(student.gender, 'تُمنح هذه الشهادة للطالب', 'تُمنح هذه الشهادة للطالبة')}</p>
                  <p className="font-display my-[0.8cqw] text-[5.4cqw] font-extrabold leading-tight text-slate-900">{student.name}</p>
                  <p className="mx-auto max-w-[70cqw] text-[1.9cqw] leading-relaxed text-slate-600">{message.trim() || defaultMsg}</p>
                  <p className="mt-[0.8cqw] text-[1.5cqw] font-bold" style={{ color: c.border }}>
                    ⭐ {student.totalEarned} نقطة • {info?.level.icon} مستوى {info?.level.name} • 🏅 {student.badges.length} شارة
                  </p>
                </div>
                <div className="grid w-full grid-cols-3 items-end text-[1.5cqw]">
                  <div>
                    <p className="font-bold">{state.settings.teacherName}</p>
                    <div className="mx-auto mt-[0.6cqw] h-px w-[16cqw] bg-slate-400" />
                    <p className="mt-[0.3cqw] text-slate-500">المعلم/المعلمة</p>
                  </div>
                  <div className="flex justify-center">
                    <div className="grid h-[9cqw] w-[9cqw] place-items-center rounded-full border-[0.4cqw] text-[4cqw]" style={{ borderColor: c.accent, background: c.soft }}>🏅</div>
                  </div>
                  <div>
                    <p className="font-bold">{state.settings.className}</p>
                    <div className="mx-auto mt-[0.6cqw] h-px w-[16cqw] bg-slate-400" />
                    <p className="mt-[0.3cqw] text-slate-500">{formatDate(Date.now())}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
