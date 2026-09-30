import { useRef, useState } from 'react';
import { Plus, Settings2, Shuffle, Trash2 } from 'lucide-react';
import type { ID, WheelKind, WheelSegment } from '../types';
import { useStore } from '../store/AppStore';
import { useActions } from '../hooks/useActions';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/misc';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Input, Select } from '../components/ui/Form';
import { StudentPicker } from '../components/students/StudentPicker';
import { COLORS, MYSTERY_REWARDS } from '../data/defaults';
import { play } from '../services/sound';
import { bigCelebration } from '../services/confetti';
import { firstName, g } from '../utils/format';
import { pick, uid } from '../utils/id';

const SIZE = 320;
const R = SIZE / 2;

function slicePath(i: number, n: number) {
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
  const r = R - 6;
  const x0 = R + r * Math.cos(a0), y0 = R + r * Math.sin(a0);
  const x1 = R + r * Math.cos(a1), y1 = R + r * Math.sin(a1);
  return `M${R},${R} L${x0},${y0} A${r},${r} 0 ${n <= 2 ? 1 : 0} 1 ${x1},${y1} Z`;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

export default function Wheel() {
  const { state, update } = useStore();
  const { awardPoints, grantBadge } = useActions();
  const toast = useToast();
  const [studentId, setStudentId] = useState<ID | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ seg: WheelSegment; detail: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const rotation = useRef(0);
  const wheelRef = useRef<SVGGElement>(null);

  const segments = state.wheel;
  const n = segments.length;
  const student = state.students.find((s) => s.id === studentId);

  const applyResult = (seg: WheelSegment) => {
    if (!student) return;
    let detail = '';
    if (seg.kind === 'points' && seg.value) {
      awardPoints([student.id], seg.value, undefined, undefined, { type: 'wheel', label: `عجلة المكافآت: ${seg.label}`, icon: '🎡' });
      detail = `${g(student.gender, 'حصلت', 'حصلتِ')} على ${seg.label} ⭐`;
    } else if (seg.kind === 'badge') {
      const target = state.badges.find((b) => b.id === seg.badgeId && !student.badges.some((x) => x.badgeId === b.id))
        ?? state.badges.find((b) => b.rule.type === 'manual' && !student.badges.some((x) => x.badgeId === b.id));
      if (target) {
        grantBadge(student.id, target.id);
        detail = `شارة «${target.name}» ${target.icon}`;
      } else {
        awardPoints([student.id], 10, undefined, undefined, { type: 'wheel', label: 'عجلة المكافآت: بديل الشارة', icon: '🎡' });
        detail = 'يملك كل الشارات! حصل على +10 نقاط بدلًا منها';
      }
    } else {
      detail = seg.kind === 'reward' ? pick(MYSTERY_REWARDS) : seg.label;
      update((s) => ({
        ...s,
        log: [...s.log, { id: uid('l'), type: 'wheel', studentId: student.id, amount: 0, label: `عجلة المكافآت: ${detail}`, icon: seg.icon, createdAt: Date.now() }],
      }));
    }
    play('wheelWin');
    bigCelebration(1500);
    setResult({ seg, detail });
  };

  const spin = () => {
    if (spinning || n < 2) return;
    if (!student) {
      setPicking(true);
      return;
    }
    const index = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    const targetMod = (360 - (index * seg + seg / 2 + jitter) + 360) % 360;
    const start = rotation.current;
    const delta = 360 * 6 + ((targetMod - (start % 360)) + 360) % 360;
    const duration = 5200;
    const t0 = performance.now();
    let lastTick = Math.floor(start / seg);
    setSpinning(true);
    setResult(null);

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const angle = start + delta * easeOut(t);
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${angle}deg)`;
      const tick = Math.floor(angle / seg);
      if (tick !== lastTick) {
        lastTick = tick;
        play('wheelTick');
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        rotation.current = angle;
        setSpinning(false);
        applyResult(segments[index]);
      }
    };
    requestAnimationFrame(frame);
  };

  const setSeg = (id: ID, patch: Partial<WheelSegment>) => update((s) => ({ ...s, wheel: s.wheel.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));

  return (
    <div>
      <PageHeader icon="🎡" title="عجلة المكافآت" subtitle="اختر طالبًا ثم أدر العجلة واكتشف مفاجأته!" actions={<Button variant="outline" icon={<Settings2 size={18} />} onClick={() => setEditing(true)}>تعديل العجلة</Button>} />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
        <Card className="flex flex-col items-center gap-6 py-8">
          <div className="relative" style={{ width: 'min(calc(100vw - 5.5rem), 440px)', aspectRatio: '1' }}>
            {/* Pointer */}
            <div className="absolute left-1/2 top-[-14px] z-10 -translate-x-1/2 drop-shadow-lg">
              <svg width="44" height="54" viewBox="0 0 44 54"><path d="M22 54 L4 14 A20 20 0 1 1 40 14 Z" fill="#f43f5e" stroke="#fff" strokeWidth="4" /><circle cx="22" cy="18" r="7" fill="#fff" /></svg>
            </div>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full drop-shadow-2xl">
              <circle cx={R} cy={R} r={R} fill="#fbbf24" />
              <g ref={wheelRef} style={{ transformOrigin: `${R}px ${R}px`, transform: `rotate(${rotation.current}deg)` }}>
                {segments.map((s, i) => {
                  const mid = ((i + 0.5) / n) * 360;
                  return (
                    <g key={s.id}>
                      <path d={slicePath(i, n)} fill={s.color} stroke="#fff" strokeWidth="2" />
                      <g transform={`rotate(${mid} ${R} ${R})`}>
                        <g transform={mid > 90 && mid < 270 ? `rotate(180 ${R} 60)` : undefined}>
                          <text x={R} y={mid > 90 && mid < 270 ? 84 : 46} textAnchor="middle" fontSize="26">{s.icon}</text>
                          <text x={R} y={mid > 90 && mid < 270 ? 50 : 74} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" style={{ fontFamily: 'Tajawal' }}>{s.label}</text>
                        </g>
                      </g>
                    </g>
                  );
                })}
              </g>
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return <circle key={i} cx={R + (R - 3) * Math.cos(a)} cy={R + (R - 3) * Math.sin(a)} r="3" fill="#fff" opacity={i % 2 ? 0.9 : 0.5} />;
              })}
              <circle cx={R} cy={R} r="34" fill="#fff" stroke="#fbbf24" strokeWidth="6" />
              <text x={R} y={R + 11} textAnchor="middle" fontSize="30">🎡</text>
            </svg>
          </div>
          <Button size="xl" variant="warning" onClick={spin} disabled={spinning || n < 2} className="min-w-60">
            {spinning ? '🎡 تدور…' : '🎡 أدر العجلة!'}
          </Button>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle icon="👦" title="الطالب المحظوظ" />
            {student ? (
              <div className="flex items-center gap-3">
                <Avatar student={student} size="lg" />
                <div className="flex-1">
                  <p className="font-display text-xl font-bold">{student.name}</p>
                  <p className="text-sm text-slate-500">💎 {student.points} نقطة</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">لم يتم اختيار طالب بعد</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setPicking(true)} disabled={spinning}>اختيار طالب</Button>
              <Button variant="outline" icon={<Shuffle size={16} />} disabled={spinning || !state.students.length} onClick={() => setStudentId(pick(state.students).id)}>عشوائي</Button>
            </div>
          </Card>
          <Card>
            <CardTitle icon="🎁" title="جوائز العجلة" />
            <ul className="space-y-1.5">
              {segments.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-xl p-1.5">
                  <span className="h-4 w-4 rounded-full" style={{ background: s.color }} />
                  <span className="text-xl">{s.icon}</span>
                  <span className="font-bold">{s.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={picking} onClose={() => setPicking(false)} title="👦 اختر الطالب">
        <StudentPicker students={state.students} value={studentId} onChange={(id) => { setStudentId(id); setPicking(false); }} />
      </Modal>

      <Modal open={!!result} onClose={() => setResult(null)} size="sm">
        {result && student && (
          <div className="text-center">
            <p className="font-display text-2xl font-extrabold text-violet-600 dark:text-violet-300">🎉 مبروك يا {firstName(student.name)}!</p>
            <div className="animate-bounce-in my-4 text-8xl">{result.seg.icon}</div>
            <p className="font-display text-2xl font-bold">{result.seg.label}</p>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">{result.detail}</p>
            <Button className="mt-6 w-full" size="lg" onClick={() => setResult(null)}>رائع! 🎊</Button>
          </div>
        )}
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="⚙️ تعديل جوائز العجلة" size="lg" footer={<Button onClick={() => setEditing(false)}>تم</Button>}>
        <div className="space-y-2">
          {segments.map((s) => (
            <div key={s.id} className="grid grid-cols-[3rem_1fr_7rem_4.5rem_2.5rem] items-center gap-2 max-sm:grid-cols-[3rem_1fr_2.5rem]">
              <Input value={s.icon} onChange={(e) => setSeg(s.id, { icon: e.target.value.slice(0, 4) })} className="px-1 text-center text-xl" aria-label="الأيقونة" />
              <Input value={s.label} onChange={(e) => setSeg(s.id, { label: e.target.value })} aria-label="النص" />
              <Select value={s.kind} onChange={(e) => setSeg(s.id, { kind: e.target.value as WheelKind, value: e.target.value === 'points' ? s.value ?? 5 : undefined, badgeId: e.target.value === 'badge' ? 'lucky' : undefined })} className="max-sm:col-span-2" aria-label="النوع">
                <option value="points">نقاط</option>
                <option value="badge">شارة</option>
                <option value="reward">مكافأة مفاجئة</option>
                <option value="text">نشاط/نص</option>
              </Select>
              {s.kind === 'points' ? (
                <Input type="number" min={1} value={s.value ?? 5} onChange={(e) => setSeg(s.id, { value: Math.max(1, Number(e.target.value) || 1) })} aria-label="عدد النقاط" />
              ) : <span />}
              <button
                onClick={() => (n > 2 ? update((st) => ({ ...st, wheel: st.wheel.filter((w) => w.id !== s.id) })) : toast({ variant: 'error', icon: '🎡', title: 'العجلة تحتاج جائزتين على الأقل' }))}
                className="grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                aria-label="حذف"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          className="mt-4"
          icon={<Plus size={16} />}
          disabled={n >= 12}
          onClick={() => update((s) => ({ ...s, wheel: [...s.wheel, { id: uid('w'), label: '+3 نقاط', icon: '⭐', color: COLORS[s.wheel.length % COLORS.length], kind: 'points', value: 3 }] }))}
        >
          إضافة جائزة
        </Button>
      </Modal>
    </div>
  );
}
