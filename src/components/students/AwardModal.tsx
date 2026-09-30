import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';
import type { ID } from '../../types';
import { useStore } from '../../store/AppStore';
import { useActions } from '../../hooks/useActions';
import { useFx } from '../../store/FxProvider';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmojiPicker } from '../ui/EmojiPicker';
import { Input } from '../ui/Form';
import { cn } from '../ui/cn';
import { uid } from '../../utils/id';
import { firstName, g, num } from '../../utils/format';
import { levelInfo } from '../../services/stats';

let lastAmount = 5;

/**
 * Fast award flow: pick an amount (remembered) → tap a reason → points granted instantly.
 */
export function AwardModal({ studentIds, onClose }: { studentIds: ID[] | null; onClose: () => void }) {
  const { state, update } = useStore();
  const { awardPoints, encourage } = useActions();
  const fx = useFx();
  const [amount, setAmount] = useState(lastAmount);
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [adding, setAdding] = useState(false);
  const [newReason, setNewReason] = useState({ label: '', icon: '⭐' });

  const students = state.students.filter((s) => studentIds?.includes(s.id));
  const single = students.length === 1 ? students[0] : undefined;
  const effective = custom ? Math.max(0, Math.floor(Number(custom))) : amount;

  const give = (reasonId: ID, e: MouseEvent) => {
    if (!effective) return;
    lastAmount = amount;
    awardPoints(studentIds ?? [], mode === 'deduct' ? -effective : effective, reasonId, { x: e.clientX, y: e.clientY });
    onClose();
  };

  const saveReason = () => {
    const label = newReason.label.trim();
    if (!label) return;
    update((s) => ({ ...s, reasons: [...s.reasons, { id: uid('r'), label, icon: newReason.icon || '⭐' }] }));
    setNewReason({ label: '', icon: '⭐' });
    setAdding(false);
  };

  if (!studentIds || students.length === 0) return null;
  const info = single ? levelInfo(state.levels, single.totalEarned) : undefined;

  return (
    <Modal open onClose={onClose} size="lg" title={mode === 'add' ? '⭐ إضافة نقاط' : '➖ خصم نقاط'}>
      <div className="mb-5 flex items-center gap-4">
        {single ? (
          <>
            <Avatar student={single} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-2xl font-bold">{single.name}</p>
              <p className="text-slate-500 dark:text-slate-400">
                💎 {num(single.points)} نقطة • {info?.level.icon} {info?.level.name}
              </p>
            </div>
          </>
        ) : (
          <div>
            <div className="flex -space-x-3 space-x-reverse">
              {students.slice(0, 8).map((s) => (
                <Avatar key={s.id} student={s} size="sm" />
              ))}
            </div>
            <p className="mt-2 font-bold">{students.length} طلاب محددون</p>
          </div>
        )}
      </div>

      {state.settings.allowDeduction && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900/5 p-1 dark:bg-white/5">
          <button onClick={() => setMode('add')} className={cn('flex items-center justify-center gap-1 rounded-xl py-2 font-bold', mode === 'add' ? 'bg-white text-emerald-600 shadow dark:bg-slate-700' : 'text-slate-500')}>
            <Plus size={16} /> إضافة
          </button>
          <button onClick={() => setMode('deduct')} className={cn('flex items-center justify-center gap-1 rounded-xl py-2 font-bold', mode === 'deduct' ? 'bg-white text-rose-600 shadow dark:bg-slate-700' : 'text-slate-500')}>
            <Minus size={16} /> خصم
          </button>
        </div>
      )}

      <p className="mb-2 text-sm font-bold text-slate-500">1. اختر عدد النقاط</p>
      <div className="mb-5 grid grid-cols-5 gap-2">
        {state.settings.quickAmounts.map((a) => (
          <button
            key={a}
            onClick={() => {
              setAmount(a);
              setCustom('');
            }}
            className={cn(
              'font-display rounded-2xl border-2 py-3 text-xl font-extrabold transition active:scale-95',
              !custom && amount === a
                ? mode === 'add' ? 'border-amber-400 bg-gradient-to-b from-amber-300 to-orange-400 text-white shadow-lg shadow-orange-400/30' : 'border-rose-400 bg-rose-500 text-white'
                : 'border-slate-200 hover:border-amber-300 dark:border-white/10',
            )}
          >
            {mode === 'add' ? '+' : '−'}{a} ⭐
          </button>
        ))}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          inputMode="numeric"
          placeholder="عدد"
          aria-label="عدد مخصص"
          className={cn('min-w-0 rounded-2xl border-2 bg-transparent text-center text-lg font-bold outline-none', custom ? 'border-amber-400' : 'border-dashed border-slate-300 dark:border-white/20')}
        />
      </div>

      <p className="mb-2 text-sm font-bold text-slate-500">2. اضغط على السبب لمنح {mode === 'add' ? '' : 'خصم '}<b className="text-amber-500">{num(effective)}</b> نقطة فورًا</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {state.reasons.map((r) => (
          <button
            key={r.id}
            disabled={!effective}
            onClick={(e) => give(r.id, e)}
            className="flex items-center gap-2 rounded-2xl border-2 border-slate-100 bg-white p-3 text-start font-bold transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg active:scale-95 disabled:opacity-40 dark:border-white/10 dark:bg-slate-800"
          >
            <span className="text-2xl">{r.icon}</span>
            <span className="leading-tight">{r.label}</span>
          </button>
        ))}
        <button onClick={() => setAdding((v) => !v)} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 p-3 font-bold text-violet-600 hover:bg-violet-50 dark:border-violet-400/40 dark:text-violet-300 dark:hover:bg-violet-500/10">
          <Plus size={18} /> سبب جديد
        </button>
      </div>

      {adding && (
        <div className="animate-slide-up mt-4 space-y-3 rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10">
          <Input placeholder="اسم السبب، مثال: حفظ السورة" value={newReason.label} onChange={(e) => setNewReason((n) => ({ ...n, label: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && saveReason()} autoFocus />
          <EmojiPicker value={newReason.icon} onChange={(icon) => setNewReason((n) => ({ ...n, icon }))} />
          <Button onClick={saveReason} disabled={!newReason.label.trim()}>
            حفظ السبب
          </Button>
        </div>
      )}

      {single && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <Button variant="secondary" size="sm" onClick={() => encourage(single)}>❤️ تعزيز إيجابي</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              fx.celebrate({ title: `🏆 مبروك يا ${firstName(single.name)}! 🏆`, subtitle: g(single.gender, 'أنت نجم الفصل اليوم ⭐', 'أنتِ نجمة الفصل اليوم ⭐'), student: single, badges: state.badges.filter((b) => single.badges.some((x) => x.badgeId === b.id)).slice(0, 6) });
            }}
          >
            🎉 احتفل بالطالب
          </Button>
          <Link to={`/students/${single.id}`} onClick={onClose} className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10">
            👤 ملف الطالب
          </Link>
        </div>
      )}
    </Modal>
  );
}
