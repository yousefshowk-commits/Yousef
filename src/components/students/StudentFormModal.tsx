import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import type { Student } from '../../types';
import { useStore } from '../../store/AppStore';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select } from '../ui/Form';
import { Avatar } from '../ui/Avatar';
import { AVATARS, COLORS } from '../../data/defaults';
import { makeStudent } from '../../data/demo';
import { resizeImage } from '../../utils/image';
import { cn } from '../ui/cn';

type Draft = Pick<Student, 'name' | 'gender' | 'avatar' | 'photo' | 'color' | 'groupId'>;

/** Add (student = undefined) or edit a student. */
export function StudentFormModal({ open, student, onClose }: { open: boolean; student?: Student; onClose: () => void }) {
  const { state, update } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const blank = (): Draft => ({ name: '', gender: 'm', avatar: AVATARS[state.students.length % AVATARS.length], color: COLORS[state.students.length % COLORS.length], groupId: state.groups[0]?.id ?? null, photo: undefined });
  const [draft, setDraft] = useState<Draft>(blank);

  useEffect(() => {
    if (open) setDraft(student ? { name: student.name, gender: student.gender, avatar: student.avatar, photo: student.photo, color: student.color, groupId: student.groupId } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student]);

  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      set({ photo: await resizeImage(file) });
    } catch {
      toast({ variant: 'error', icon: '🖼️', title: 'تعذر قراءة الصورة' });
    }
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      toast({ variant: 'error', icon: '✏️', title: 'اكتب اسم الطالب أولًا' });
      return;
    }
    if (student) {
      update((s) => ({ ...s, students: s.students.map((x) => (x.id === student.id ? { ...x, ...draft, name } : x)) }));
      toast({ icon: '✅', title: 'تم حفظ التعديلات' });
    } else {
      const created = { ...makeStudent(name, state.students.length, draft.gender, draft.groupId), ...draft, name };
      update((s) => ({ ...s, students: [...s.students, created] }));
      toast({ icon: '👋', title: `أهلًا ${name}! تمت إضافته للفصل` });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? '✏️ تعديل بيانات الطالب' : '➕ إضافة طالب'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={save}>{student ? 'حفظ التعديلات' : 'إضافة الطالب'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar student={{ ...draft, name: draft.name || '?' }} size="xl" />
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" icon={<Camera size={16} />} onClick={() => fileRef.current?.click()}>
              رفع صورة
            </Button>
            {draft.photo && (
              <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} onClick={() => set({ photo: undefined })}>
                إزالة الصورة
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>

        <Field label="اسم الطالب/الطالبة">
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثال: أحمد محمد" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="الجنس">
            <Select value={draft.gender} onChange={(e) => set({ gender: e.target.value as Student['gender'] })}>
              <option value="m">طالب 👦</option>
              <option value="f">طالبة 👧</option>
            </Select>
          </Field>
          <Field label="المجموعة">
            <Select value={draft.groupId ?? ''} onChange={(e) => set({ groupId: e.target.value || null })}>
              <option value="">بدون مجموعة</option>
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">الأفاتار</p>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
            {AVATARS.map((a) => (
              <button key={a} type="button" onClick={() => set({ avatar: a, photo: undefined })} className={cn('grid aspect-square place-items-center rounded-xl text-2xl transition hover:scale-110', draft.avatar === a && !draft.photo ? 'bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-500/20' : 'hover:bg-slate-100 dark:hover:bg-white/10')}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">اللون</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set({ color: c })} className={cn('h-9 w-9 rounded-full transition hover:scale-110', draft.color === c && 'ring-4 ring-offset-2 ring-indigo-400 dark:ring-offset-slate-900')} style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
