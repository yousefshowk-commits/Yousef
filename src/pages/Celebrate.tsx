import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { useFx } from '../store/FxProvider';
import { PageHeader } from '../components/ui/misc';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Toggle } from '../components/ui/Form';
import { Avatar } from '../components/ui/Avatar';
import { StudentPicker } from '../components/students/StudentPicker';
import { firstName, g } from '../utils/format';

const PRESETS = ['أنت نجم الفصل اليوم ⭐', 'إنجاز رائع يستحق الاحتفال 🎉', 'فخورون بك جدًا 💜', 'بطل القراءة لهذا الأسبوع 📚', 'تقدم مذهل — استمر! 🚀'];

export default function Celebrate() {
  const { state, update } = useStore();
  const fx = useFx();
  const [studentId, setStudentId] = useState<string | null>(state.students[0]?.id ?? null);
  const [msg, setMsg] = useState('');
  const student = state.students.find((s) => s.id === studentId);
  const badges = student ? state.badges.filter((b) => student.badges.some((x) => x.badgeId === b.id)) : [];

  const go = () => {
    if (!student) return;
    fx.celebrate({
      title: `🏆 مبروك يا ${firstName(student.name)}! 🏆`,
      subtitle: msg.trim() || g(student.gender, 'أنت نجم الفصل اليوم ⭐', 'أنتِ نجمة الفصل اليوم ⭐'),
      student,
      badges: badges.slice(0, 6),
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader icon="🎉" title="صفحة الاحتفال" subtitle="Celebration Mode — حوّل الشاشة إلى احتفال كبير بإنجاز الطالب" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle icon="👦" title="من البطل اليوم؟" />
          <StudentPicker students={state.students} value={studentId} onChange={setStudentId} />
        </Card>
        <Card className="flex flex-col">
          <CardTitle icon="✨" title="رسالة الاحتفال" />
          {student && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-l from-indigo-100 to-pink-100 p-3 dark:from-indigo-500/10 dark:to-pink-500/10">
              <Avatar student={student} size="md" />
              <div>
                <p className="font-display text-xl font-bold">{student.name}</p>
                <p className="text-lg">{badges.map((b) => b.icon).join(' ') || '—'}</p>
              </div>
            </div>
          )}
          <Field label="الرسالة (اختياري)">
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="أنت نجم الفصل اليوم ⭐" />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setMsg(p)} className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200">
                {p}
              </button>
            ))}
          </div>
          <Toggle checked={state.settings.sound} onChange={(sound) => update((s) => ({ ...s, settings: { ...s.settings, sound } }))} label="🔊 المؤثر الصوتي الاحتفالي" />
          <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
            <Button size="xl" variant="warning" onClick={go} disabled={!student}>🎉 احتفل بالطالب</Button>
            <Button size="xl" variant="primary" onClick={() => fx.celebrate({ title: 'أحسنتم يا أبطال! 🌟', subtitle: `${state.settings.className} — فصل رائع ومتميز`, icon: '🏫' })}>🏫 احتفال بالفصل</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
