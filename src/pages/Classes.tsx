import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ClassSetupForm, type ClassSetupValues } from '../components/classes/ClassSetupForm';
import { createClassState } from '../data/demo';
import { burst } from '../services/confetti';
import { play } from '../services/sound';
import { cn } from '../components/ui/cn';

const CLASS_EMOJIS = ['🏫', '📘', '📗', '📙', '📕', '🎒', '✏️', '🧮', '🔬', '🎨'];

/** All classes on this device: switch, add, delete. */
export default function Classes() {
  const { state, get, registry, switchClass, addClass, deleteClass } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const open = (id: string) => {
    switchClass(id);
    navigate('/');
  };

  const create = ({ settings, names }: ClassSetupValues) => {
    addClass(createClassState(get(), settings, names));
    setAdding(false);
    play('celebrate');
    burst(0.5, 0.5, 120);
    toast({ icon: '🏫', title: `تم إنشاء ${settings.className}`, description: `${names.length} طالب — يمكنك التبديل بين الفصول من القائمة الجانبية` });
    navigate('/');
  };

  const remove = async (id: string, name: string, students: number) => {
    const ok = await confirm({
      title: `حذف ${name}؟`,
      message: `سيتم حذف الفصل و${students} طالب وكل نقاطهم وسجلهم نهائيًا. صدّر نسخة احتياطية أولًا إن احتجت إليها.`,
      confirmText: 'حذف الفصل',
      danger: true,
      icon: '🗑️',
    });
    if (!ok) return;
    deleteClass(id);
    toast({ variant: 'info', icon: '🗑️', title: `تم حذف ${name}` });
  };

  return (
    <div>
      <PageHeader
        icon="🏫"
        title="فصولي"
        subtitle={`${registry.classes.length} ${registry.classes.length === 1 ? 'فصل' : 'فصول'} — لكل فصل طلابه ونقاطه وسجله الخاص`}
        actions={<Button icon={<Plus size={18} />} onClick={() => setAdding(true)}>فصل جديد</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {registry.classes.map((c, i) => {
          const active = c.id === registry.activeId;
          const summary = active ? { ...c, name: state.settings.className, teacher: state.settings.teacherName, students: state.students.length } : c;
          return (
            <div key={c.id} className={cn('glass flex flex-col gap-4 rounded-[1.75rem] p-5 transition', active ? 'ring-4 ring-indigo-500/60' : 'hover:-translate-y-1')}>
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-3xl dark:bg-indigo-500/15">{CLASS_EMOJIS[i % CLASS_EMOJIS.length]}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display truncate text-xl font-bold">{summary.name}</h3>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">👩‍🏫 {summary.teacher}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">👦 {summary.students} طالب/طالبة</p>
                </div>
                {active && <span className="flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white"><Check size={14} /> الحالي</span>}
              </div>
              <div className="mt-auto flex gap-2">
                <Button className="flex-1" variant={active ? 'secondary' : 'primary'} onClick={() => open(c.id)}>
                  {active ? 'لوحة التحكم' : 'فتح الفصل'}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-rose-600"
                  disabled={registry.classes.length <= 1}
                  title={registry.classes.length <= 1 ? 'لا يمكن حذف الفصل الوحيد' : 'حذف الفصل'}
                  aria-label="حذف الفصل"
                  onClick={() => void remove(c.id, summary.name, summary.students)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          );
        })}
        <button
          onClick={() => setAdding(true)}
          className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-[1.75rem] border-2 border-dashed border-indigo-300 p-5 font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-400/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          <Plus size={32} />
          إضافة فصل جديد
        </button>
      </div>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        الفصل الجديد يبدأ بنفس أسباب النقاط والمستويات والشارات والمكافآت الموجودة في الفصل الحالي، ويمكنك تعديلها لاحقًا من الإعدادات.
      </p>

      <Modal open={adding} onClose={() => setAdding(false)} title="🏫 فصل جديد">
        <ClassSetupForm initial={{ teacherName: state.settings.teacherName, schoolName: state.settings.schoolName }} onSubmit={create} />
      </Modal>
    </div>
  );
}
