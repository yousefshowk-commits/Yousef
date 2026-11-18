import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  FlipHorizontal,
  Lock,
  Trash2,
  Unlock,
  Hand,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import { useSelected, useStore } from '../state/store';
import type { ImageObj, LayoutMode, Obj, ShapeObj, TextObj, Stroke, Shadow } from '../state/types';
import { Btn, ColorInput, Row, Section, Seg, Slider, Toggle, cn } from '../components/ui';
import { FillEditor } from './FillEditor';
import { getFont, cssFamily } from '../data/fonts';
import { HARAKAT, SPECIAL_CHARS } from '../data/phrases';
import { layoutText } from '../engine/layout';
import { getLoadedFont } from '../engine/hb';
import { manualKashidaPos, TATWEEL } from '../engine/kashida';
import { ensureCssFont } from '../engine/export';

type Tab = 'text' | 'color' | 'fx' | 'compose' | 'letters';

export function Properties() {
  const o = useSelected();
  if (!o) return <NoSelection />;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scroll-thin">
        {o.type === 'text' && <TextProps o={o} />}
        {o.type === 'shape' && <ShapeProps o={o} />}
        {o.type === 'image' && <ImageProps o={o} />}
        <TransformProps o={o} />
      </div>
    </div>
  );
}

function NoSelection() {
  return (
    <div className="space-y-4 p-4 text-sm leading-7 text-ink-300">
      <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-4">
        <div className="mb-1 font-bold text-gold-300">ابدأ من هنا</div>
        <ul className="list-disc space-y-1 pr-4 text-[13px]">
          <li>اختر فكرة جاهزة من «أفكار» أو أضف نصًا جديدًا.</li>
          <li>انقر على أي عنصر لتعديله، واسحبه لتحريكه.</li>
          <li>انقر مرتين على النص لتعديل الكتابة.</li>
          <li>أداة «تحريك الحروف» تتيح لك سحب كل حرف وحركة على حدة.</li>
          <li>الكشيدة تمدّ الحروف المتصلة، والبدائل تغيّر شكل الحرف.</li>
        </ul>
      </div>
      <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-4 text-[12px]">
        <div className="mb-1 font-bold text-ink-100">اختصارات</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <span>تراجع / إعادة</span>
          <span dir="ltr" className="text-left">Ctrl+Z / Ctrl+Y</span>
          <span>نسخ / لصق</span>
          <span dir="ltr" className="text-left">Ctrl+C / Ctrl+V</span>
          <span>تكرار</span>
          <span dir="ltr" className="text-left">Ctrl+D</span>
          <span>حذف</span>
          <span dir="ltr" className="text-left">Delete</span>
          <span>تحريك دقيق</span>
          <span dir="ltr" className="text-left">← ↑ → ↓ (Shift ×10)</span>
          <span>تكبير</span>
          <span dir="ltr" className="text-left">Ctrl + عجلة</span>
          <span>تحريك اللوحة</span>
          <span dir="ltr" className="text-left">Space + سحب</span>
          <span>حفظ المشروع</span>
          <span dir="ltr" className="text-left">Ctrl+S</span>
        </div>
      </div>
    </div>
  );
}

// ———————————————— النص
function TextProps({ o }: { o: TextObj }) {
  const [tab, setTab] = useState<Tab>('text');
  const tool = useStore((s) => s.tool);
  useEffect(() => {
    if (tool === 'letters') setTab('letters');
  }, [tool]);
  const tabs: { v: Tab; label: string }[] = [
    { v: 'text', label: 'النص' },
    { v: 'color', label: 'التلوين' },
    { v: 'fx', label: 'المؤثرات' },
    { v: 'compose', label: 'التركيب' },
    { v: 'letters', label: 'الحروف' },
  ];
  return (
    <div>
      <div className="sticky top-0 z-10 flex gap-0.5 border-b border-ink-700 bg-ink-900 px-2 pt-2">
        {tabs.map((t) => (
          <button
            key={t.v}
            className={cn(
              'flex-1 rounded-t-lg px-1 py-2 text-[12px] font-bold transition-colors',
              tab === t.v ? 'bg-ink-800 text-gold-300' : 'text-ink-400 hover:text-ink-100',
            )}
            onClick={() => setTab(t.v)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'text' && <TextTab o={o} />}
      {tab === 'color' && <ColorTab o={o} />}
      {tab === 'fx' && <FxTab o={o} />}
      {tab === 'compose' && <ComposeTab o={o} />}
      {tab === 'letters' && <LettersTab o={o} />}
    </div>
  );
}

function TextTab({ o }: { o: TextObj }) {
  const setText = useStore((s) => s.setText);
  const update = useStore((s) => s.updateObj);
  const setLibrary = useStore((s) => s.setLibrary);
  const ref = useRef<HTMLTextAreaElement>(null);
  const def = getFont(o.fontId);
  ensureCssFont(o.fontId);
  ensureCssFont('amiri');

  useEffect(() => {
    const f = () => {
      ref.current?.focus();
      ref.current?.select();
    };
    window.addEventListener('midad:focus-text', f);
    return () => window.removeEventListener('midad:focus-text', f);
  }, []);

  const insert = (ch: string) => {
    const el = ref.current;
    if (!el) return setText(o.id, o.text + ch);
    const s = el.selectionStart ?? o.text.length;
    const e = el.selectionEnd ?? s;
    const next = o.text.slice(0, s) + ch + o.text.slice(e);
    setText(o.id, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ch.length, s + ch.length);
    });
  };

  return (
    <>
      <Section title="الكتابة">
        <textarea
          ref={ref}
          dir="rtl"
          value={o.text}
          onChange={(e) => setText(o.id, e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-ink-600 bg-ink-950 p-2.5 text-xl leading-relaxed text-ink-50 outline-none focus:border-gold-500"
          style={{ fontFamily: `${cssFamily(o.fontId)}, var(--font-ui)` }}
        />
        <div>
          <div className="mb-1 text-[11px] text-ink-400">التشكيل — يُضاف عند موضع المؤشر</div>
          <div className="grid grid-cols-6 gap-1">
            {HARAKAT.map((h) => (
              <button
                key={h.ch}
                title={h.label}
                onClick={() => insert(h.ch)}
                className="h-9 rounded-md bg-ink-800 text-2xl leading-none text-ink-50 hover:bg-ink-600"
                style={{ fontFamily: `${cssFamily('amiri')}, serif` }}
              >
                {'◌' + h.ch}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {SPECIAL_CHARS.map((h, i) => (
              <button
                key={i}
                title={h.label}
                onClick={() => insert(h.ch)}
                className="rounded-md bg-ink-800 px-2 py-1 text-[11px] text-ink-200 hover:bg-ink-600"
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </Section>
      <Section title="الخط">
        <button
          className="flex w-full items-center justify-between rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 hover:border-gold-500"
          onClick={() => setLibrary('fonts')}
        >
          <span className="text-2xl" style={{ fontFamily: `${cssFamily(o.fontId)}, var(--font-ui)` }}>
            {def.name}
          </span>
          <span className="text-[11px] text-ink-400">تغيير الخط ←</span>
        </button>
        <WeightControl o={o} />
        <Slider label="الحجم" value={o.size} min={10} max={800} onChange={(v) => update(o.id, { size: v }, 'size')} />
        <Slider label="تباعد الأسطر" value={o.lineHeight} min={0.5} max={4} step={0.05} onChange={(v) => update(o.id, { lineHeight: v }, 'lh')} />
        <Row label="المحاذاة">
          <Seg
            value={o.align}
            options={[
              { v: 'right', label: <AlignRight size={15} />, title: 'يمين' },
              { v: 'center', label: <AlignCenter size={15} />, title: 'وسط' },
              { v: 'left', label: <AlignLeft size={15} />, title: 'يسار' },
              { v: 'kashida', label: 'ـــ', title: 'ضبط الأسطر بالكشيدة' },
            ]}
            onChange={(v) => update(o.id, { align: v })}
          />
        </Row>
        <Slider label="كشيدة تلقائية" value={o.autoKashida} min={0} max={30} onChange={(v) => update(o.id, { autoKashida: v }, 'kashida')} />
        <Slider label="تباعد الكلمات" value={o.wordSpacing} min={-60} max={300} onChange={(v) => update(o.id, { wordSpacing: v }, 'ws')} />
      </Section>
      <FeaturesSection o={o} />
    </>
  );
}

function WeightControl({ o }: { o: TextObj }) {
  const update = useStore((s) => s.updateObj);
  const def = getFont(o.fontId);
  if (def.variable)
    return (
      <Slider
        label="السماكة"
        value={Math.max(def.variable.min, Math.min(def.variable.max, o.weight))}
        min={def.variable.min}
        max={def.variable.max}
        step={10}
        onChange={(v) => update(o.id, { weight: v }, 'weight')}
      />
    );
  if (def.bold)
    return (
      <Row label="السماكة">
        <Seg
          value={o.weight >= 600 ? 'b' : 'r'}
          options={[
            { v: 'r', label: 'عادي' },
            { v: 'b', label: 'عريض' },
          ]}
          onChange={(v) => update(o.id, { weight: v === 'b' ? 700 : 400 })}
        />
      </Row>
    );
  return null;
}

function FeaturesSection({ o }: { o: TextObj }) {
  const update = useStore((s) => s.updateObj);
  const lf = getLoadedFont(o.fontId, o.weight);
  const feats = lf?.features ?? [];
  if (!feats.length) return null;
  return (
    <Section title="البدائل الأسلوبية (لكل النص)" defaultOpen={false}>
      <div className="text-[11px] leading-5 text-ink-400">أشكال بديلة للحروف يوفّرها هذا الخط. لتغيير حرف واحد فقط استخدم تبويب «الحروف».</div>
      <div className="flex flex-wrap gap-1.5">
        {feats.map((f) => {
          const on = o.features.includes(f.tag);
          return (
            <button
              key={f.tag}
              title={f.hint}
              className={cn('rounded-md border px-2 py-1 text-[11px]', on ? 'border-gold-500 bg-gold-500/20 text-gold-200' : 'border-ink-600 text-ink-300 hover:border-ink-400')}
              onClick={() => update(o.id, { features: on ? o.features.filter((t) => t !== f.tag) : [...o.features, f.tag] })}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function StrokeEditor({ label, s, onChange }: { label: string; s: Stroke; onChange: (s: Stroke, key?: string) => void }) {
  return (
    <Section title={label} defaultOpen={s.enabled} right={<Toggle checked={s.enabled} onChange={(v) => onChange({ ...s, enabled: v })} />}>
      <Row label="اللون">
        <ColorInput value={s.color} onChange={(c) => onChange({ ...s, color: c, enabled: true }, `${label}-c`)} />
      </Row>
      <Slider label="السماكة" value={s.width} min={0.5} max={60} step={0.5} onChange={(v) => onChange({ ...s, width: v, enabled: true }, `${label}-w`)} />
    </Section>
  );
}

function ColorTab({ o }: { o: TextObj }) {
  const update = useStore((s) => s.updateObj);
  return (
    <>
      <Section title="التعبئة">
        <FillEditor fill={o.fill} onChange={(f, k) => update(o.id, { fill: f }, k)} />
      </Section>
      <StrokeEditor label="حدّ داخلي" s={o.stroke} onChange={(s, k) => update(o.id, { stroke: s }, k)} />
      <StrokeEditor label="حدّ خارجي" s={o.stroke2} onChange={(s, k) => update(o.id, { stroke2: s }, k)} />
    </>
  );
}

function ShadowEditor({ s, onChange }: { s: Shadow; onChange: (s: Shadow, key?: string) => void }) {
  return (
    <Section title="الظل" defaultOpen={s.enabled} right={<Toggle checked={s.enabled} onChange={(v) => onChange({ ...s, enabled: v })} />}>
      <Row label="اللون">
        <ColorInput value={s.color} onChange={(c) => onChange({ ...s, color: c, enabled: true }, 'sh-c')} />
      </Row>
      <Slider label="أفقي" value={s.dx} min={-100} max={100} onChange={(v) => onChange({ ...s, dx: v, enabled: true }, 'sh-dx')} />
      <Slider label="رأسي" value={s.dy} min={-100} max={100} onChange={(v) => onChange({ ...s, dy: v, enabled: true }, 'sh-dy')} />
      <Slider label="التمويه" value={s.blur} min={0} max={60} onChange={(v) => onChange({ ...s, blur: v, enabled: true }, 'sh-b')} />
      <Slider label="الشفافية" value={s.opacity} min={0} max={1} step={0.05} onChange={(v) => onChange({ ...s, opacity: v, enabled: true }, 'sh-o')} />
    </Section>
  );
}

function FxTab({ o }: { o: TextObj }) {
  const update = useStore((s) => s.updateObj);
  const g = o.glow;
  const e = o.extrude;
  return (
    <>
      <ShadowEditor s={o.shadow} onChange={(s, k) => update(o.id, { shadow: s }, k)} />
      <Section title="توهّج" defaultOpen={g.enabled} right={<Toggle checked={g.enabled} onChange={(v) => update(o.id, { glow: { ...g, enabled: v } })} />}>
        <Row label="اللون">
          <ColorInput value={g.color} onChange={(c) => update(o.id, { glow: { ...g, color: c, enabled: true } }, 'gl-c')} />
        </Row>
        <Slider label="الانتشار" value={g.blur} min={1} max={60} onChange={(v) => update(o.id, { glow: { ...g, blur: v, enabled: true } }, 'gl-b')} />
        <Slider label="القوة" value={g.strength} min={0.2} max={4} step={0.1} onChange={(v) => update(o.id, { glow: { ...g, strength: v, enabled: true } }, 'gl-s')} />
      </Section>
      <Section title="بروز ثلاثي الأبعاد" defaultOpen={e.enabled} right={<Toggle checked={e.enabled} onChange={(v) => update(o.id, { extrude: { ...e, enabled: v } })} />}>
        <Row label="اللون">
          <ColorInput value={e.color} onChange={(c) => update(o.id, { extrude: { ...e, color: c, enabled: true } }, 'ex-c')} />
        </Row>
        <Slider label="العمق" value={e.depth} min={1} max={80} onChange={(v) => update(o.id, { extrude: { ...e, depth: v, enabled: true } }, 'ex-d')} />
        <Slider label="الاتجاه" value={e.angle} min={0} max={360} onChange={(v) => update(o.id, { extrude: { ...e, angle: v, enabled: true } }, 'ex-a')} suffix="°" />
      </Section>
      <BlendSection o={o} />
    </>
  );
}

function BlendSection({ o }: { o: Obj }) {
  const update = useStore((s) => s.updateObj);
  return (
    <Section title="الشفافية والدمج">
      <Slider label="الشفافية" value={o.opacity} min={0} max={1} step={0.01} onChange={(v) => update(o.id, { opacity: v }, 'opacity')} />
      <Row label="الدمج">
        <select className="num flex-1" value={o.blend} onChange={(e) => update(o.id, { blend: e.target.value as Obj['blend'] })}>
          <option value="normal">عادي</option>
          <option value="multiply">ضرب (كالحبر على الورق)</option>
          <option value="screen">تفتيح</option>
          <option value="overlay">تراكب</option>
          <option value="soft-light">ضوء ناعم</option>
        </select>
      </Row>
    </Section>
  );
}

const MODES: { v: LayoutMode; label: string; icon: ReactNode }[] = [
  { v: 'line', label: 'سطر', icon: <path d="M4 12h16" /> },
  { v: 'arc', label: 'قوس', icon: <path d="M4 16 Q12 4 20 16" /> },
  { v: 'circle', label: 'دائرة', icon: <circle cx="12" cy="12" r="7" /> },
  { v: 'wave', label: 'موجة', icon: <path d="M3 12 Q7 6 11 12 T19 12 T23 12" /> },
  { v: 'mirror', label: 'مرآة', icon: <path d="M12 3v18M5 8l4 4-4 4M19 8l-4 4 4 4" /> },
  { v: 'reflect', label: 'انعكاس', icon: <path d="M4 10h16M6 14h12M8 18h8" /> },
  { v: 'rosette', label: 'وردة', icon: <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" /> },
];

function ComposeTab({ o }: { o: TextObj }) {
  const update = useStore((s) => s.updateObj);
  const L = o.layout;
  const set = (p: Partial<typeof L>, key?: string) => update(o.id, { layout: { ...L, ...p } }, key);
  return (
    <>
      <Section title="شكل التركيب">
        <div className="grid grid-cols-4 gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.v}
              onClick={() => {
                if (m.v === 'arc' && L.mode !== 'arc') {
                  const b = layoutText(o).box;
                  set({ mode: 'arc', radius: Math.round(Math.max(120, (b.x1 - b.x0) / 2.9)) });
                } else set({ mode: m.v });
              }}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px]',
                L.mode === m.v ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-600 text-ink-300 hover:border-ink-400',
              )}
            >
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                {m.icon}
              </svg>
              {m.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="إعدادات التركيب">
        {L.mode === 'line' && <div className="text-[12px] text-ink-400">النص على سطر مستقيم. جرّب «قوس» أو «دائرة» للتراكيب الدائرية، أو «مرآة» للخط المتناظر.</div>}
        {L.mode === 'arc' && (
          <>
            <Slider label="نصف القطر" value={L.radius} min={40} max={3000} onChange={(v) => set({ radius: v }, 'radius')} />
            <Row label="الموضع">
              <Seg
                value={L.arcSide}
                options={[
                  { v: 'top', label: 'أعلى الدائرة' },
                  { v: 'bottom', label: 'أسفل الدائرة' },
                ]}
                onChange={(v) => set({ arcSide: v })}
              />
            </Row>
            <Slider label="الدوران" value={L.rotateStart} min={-180} max={180} onChange={(v) => set({ rotateStart: v }, 'rs')} suffix="°" />
          </>
        )}
        {L.mode === 'circle' && (
          <>
            <Slider label="الفراغ" value={L.circleGap} min={0} max={0.8} step={0.01} onChange={(v) => set({ circleGap: v }, 'cg')} />
            <Slider label="نقطة البداية" value={L.rotateStart} min={-180} max={180} onChange={(v) => set({ rotateStart: v }, 'rs')} suffix="°" />
            <Row label="الاتجاه">
              <Seg
                value={L.arcSide}
                options={[
                  { v: 'top', label: 'خارج الدائرة' },
                  { v: 'bottom', label: 'داخل الدائرة' },
                ]}
                onChange={(v) => set({ arcSide: v })}
              />
            </Row>
            <div className="text-[11px] text-ink-400">نصف القطر يُحسب تلقائيًا من طول النص. كبّر الخط أو أضف كشيدة لتكبير الدائرة.</div>
          </>
        )}
        {L.mode === 'wave' && (
          <>
            <Slider label="الارتفاع" value={L.waveAmp} min={-200} max={200} onChange={(v) => set({ waveAmp: v }, 'wa')} />
            <Slider label="الطول" value={L.waveLen} min={40} max={2000} onChange={(v) => set({ waveLen: v }, 'wl')} />
          </>
        )}
        {L.mode === 'mirror' && (
          <>
            <Row label="المحور">
              <Seg
                value={L.mirrorAxis}
                options={[
                  { v: 'vertical', label: 'يمين ↔ يسار' },
                  { v: 'horizontal', label: 'أعلى ↕ أسفل' },
                ]}
                onChange={(v) => set({ mirrorAxis: v })}
              />
            </Row>
            <Slider label="المسافة" value={L.mirrorGap} min={-400} max={400} onChange={(v) => set({ mirrorGap: v }, 'mg')} />
            <div className="text-[11px] text-ink-400">المسافة السالبة تجعل النصين يتداخلان كما في لوحات «المثنّى».</div>
          </>
        )}
        {L.mode === 'reflect' && (
          <>
            <Slider label="المسافة" value={L.mirrorGap} min={-200} max={300} onChange={(v) => set({ mirrorGap: v }, 'mg')} />
            <Slider label="الشفافية" value={L.reflectOpacity} min={0.05} max={1} step={0.05} onChange={(v) => set({ reflectOpacity: v }, 'ro')} />
          </>
        )}
        {L.mode === 'rosette' && (
          <>
            <Slider label="عدد التكرار" value={L.rosetteCount} min={2} max={24} onChange={(v) => set({ rosetteCount: v }, 'rc')} />
            <Slider label="البُعد عن المركز" value={L.rosetteRadius} min={-500} max={1500} onChange={(v) => set({ rosetteRadius: v }, 'rr')} />
            <Slider label="الدوران" value={L.rotateStart} min={-180} max={180} onChange={(v) => set({ rotateStart: v }, 'rs')} suffix="°" />
          </>
        )}
      </Section>
    </>
  );
}

// ———————————————— الحروف
function LettersTab({ o }: { o: TextObj }) {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const glyphKey = useStore((s) => s.glyphKey);
  const updateText = useStore((s) => s.updateText);
  const setText = useStore((s) => s.setText);
  const selectGlyph = useStore((s) => s.selectGlyph);
  const lf = getLoadedFont(o.fontId, o.weight);
  const lay = layoutText(o);
  const g = glyphKey ? lay.glyphs.find((x) => x.key === glyphKey && x.copy === 0) : null;
  const ov = (glyphKey && o.overrides[glyphKey]) || { dx: 0, dy: 0, rot: 0, scale: 1 };
  const nOv = Object.keys(o.overrides).length + Object.keys(o.clusterFeatures).length;

  const setOv = (p: Partial<typeof ov>, key?: string) => {
    if (!glyphKey) return;
    updateText(o.id, (t) => ({ overrides: { ...t.overrides, [glyphKey]: { ...ov, ...p } } }), key);
  };

  const charIndex = g?.charIndex ?? -1;
  const ch = charIndex >= 0 ? o.text[charIndex] : '';
  const kashidaPos = charIndex >= 0 ? manualKashidaPos(o.text, charIndex) : -1;
  const addKashida = () => {
    if (kashidaPos < 0) return;
    setText(o.id, o.text.slice(0, kashidaPos) + TATWEEL + o.text.slice(kashidaPos));
  };
  const canRemove = kashidaPos >= 0 && o.text[kashidaPos] === TATWEEL;
  const removeKashida = () => {
    if (!canRemove) return;
    setText(o.id, o.text.slice(0, kashidaPos) + o.text.slice(kashidaPos + 1));
  };
  const cf = charIndex >= 0 ? o.clusterFeatures[String(charIndex)] ?? [] : [];
  const toggleCf = (tag: string) => {
    updateText(o.id, (t) => {
      const cur = t.clusterFeatures[String(charIndex)] ?? [];
      const next = cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag];
      const map = { ...t.clusterFeatures };
      if (next.length) map[String(charIndex)] = next;
      else delete map[String(charIndex)];
      return { clusterFeatures: map };
    });
  };

  return (
    <>
      <Section title="تحريك الحروف والحركات">
        {tool !== 'letters' ? (
          <div className="space-y-2">
            <div className="text-[12px] leading-6 text-ink-300">فعّل أداة تحريك الحروف، ثم انقر على أي حرف أو حركة أو نقطة تشكيل في اللوحة واسحبها لمكانها — كما يفعل الخطاط عند تركيب اللوحة.</div>
            <Btn active onClick={() => setTool('letters')} className="w-full">
              <Hand size={14} /> تفعيل تحريك الحروف
            </Btn>
          </div>
        ) : !g ? (
          <div className="text-[12px] leading-6 text-ink-300">انقر على حرف في اللوحة لتحديده. الحركات (الفتحة والشدة…) أشكال مستقلة يمكن تحريكها أيضًا.</div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-800 text-3xl" style={{ fontFamily: `${cssFamily(o.fontId)}, serif` }}>
                {ch === ' ' ? '␣' : /[ً-ٰٟ]/.test(ch) ? '◌' + ch : ch}
              </div>
              <div className="flex-1 text-[11px] text-ink-400">
                الحرف رقم {charIndex + 1}
                <br />
                اسحبه في اللوحة أو اضبطه هنا
              </div>
              <Btn title="إعادة الحرف لوضعه" onClick={() => updateText(o.id, (t) => { const m = { ...t.overrides }; delete m[glyphKey!]; return { overrides: m }; })}>
                <RotateCcw size={13} />
              </Btn>
            </div>
            <Slider label="أفقي" value={ov.dx} min={-600} max={600} onChange={(v) => setOv({ dx: v }, 'g-dx')} />
            <Slider label="رأسي" value={ov.dy} min={-600} max={600} onChange={(v) => setOv({ dy: v }, 'g-dy')} />
            <Slider label="تدوير" value={ov.rot} min={-180} max={180} onChange={(v) => setOv({ rot: v }, 'g-r')} suffix="°" />
            <Slider label="حجم" value={ov.scale} min={0.2} max={4} step={0.05} onChange={(v) => setOv({ scale: v }, 'g-s')} />
            <Row label="لون خاص">
              <Toggle checked={!!ov.color} onChange={(v) => setOv({ color: v ? '#c0392b' : undefined })} />
              {ov.color && <ColorInput value={ov.color} swatches={false} onChange={(c) => setOv({ color: c }, 'g-c')} />}
            </Row>
            <Row label="إخفاء">
              <Toggle checked={!!ov.hidden} onChange={(v) => setOv({ hidden: v })} />
            </Row>
            <Row label="كشيدة بعده">
              <Btn onClick={removeKashida} disabled={!canRemove} title="تقصير">
                <Minus size={13} />
              </Btn>
              <Btn onClick={addKashida} disabled={kashidaPos < 0} title="تطويل">
                <Plus size={13} />
              </Btn>
              {kashidaPos < 0 && <span className="text-[10px] text-ink-500">الحرف لا يتصل بما بعده</span>}
            </Row>
            {lf && lf.features.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] text-ink-400">شكل بديل لهذا الحرف فقط:</div>
                <div className="flex flex-wrap gap-1">
                  {lf.features.map((f) => (
                    <button
                      key={f.tag}
                      title={f.hint}
                      onClick={() => toggleCf(f.tag)}
                      className={cn('rounded-md border px-2 py-0.5 text-[11px]', cf.includes(f.tag) ? 'border-gold-500 bg-gold-500/20 text-gold-200' : 'border-ink-600 text-ink-300')}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Section>
      <Section title="إدارة التعديلات">
        <div className="text-[12px] text-ink-400">عدد الحروف المعدّلة: {nOv}</div>
        <div className="flex gap-2">
          <Btn
            disabled={!nOv}
            onClick={() => {
              updateText(o.id, () => ({ overrides: {}, clusterFeatures: {} }));
              selectGlyph(null);
            }}
          >
            <RotateCcw size={13} /> إعادة كل الحروف
          </Btn>
          {tool === 'letters' && <Btn onClick={() => setTool('select')}>إنهاء التحريك</Btn>}
        </div>
      </Section>
    </>
  );
}

// ———————————————— الأشكال والصور
function ShapeProps({ o }: { o: ShapeObj }) {
  const update = useStore((s) => s.updateObj);
  const hasPoints = ['star', 'polygon', 'flower', 'medallion', 'shamsa'].includes(o.shape);
  const hasInner = ['star', 'flower', 'medallion', 'roundRect', 'frame', 'ornateFrame', 'arch', 'crescent', 'rubElHizb'].includes(o.shape);
  return (
    <>
      <Section title="الشكل">
        <Slider label="العرض" value={o.w} min={4} max={5000} onChange={(v) => update(o.id, { w: v }, 'w')} />
        <Slider label="الارتفاع" value={o.h} min={4} max={5000} onChange={(v) => update(o.id, { h: v }, 'h')} />
        {hasPoints && <Slider label="الرؤوس" value={o.points} min={3} max={48} onChange={(v) => update(o.id, { points: v }, 'pts')} />}
        {hasInner && <Slider label="النسبة" value={o.inner} min={0} max={1} step={0.01} onChange={(v) => update(o.id, { inner: v }, 'inner')} />}
      </Section>
      <Section title="التعبئة">
        <FillEditor fill={o.fill} onChange={(f, k) => update(o.id, { fill: f }, k)} />
      </Section>
      <Section title="الحد" defaultOpen={o.stroke.enabled} right={<Toggle checked={o.stroke.enabled} onChange={(v) => update(o.id, { stroke: { ...o.stroke, enabled: v } })} />}>
        <Row label="اللون">
          <ColorInput value={o.stroke.color} onChange={(c) => update(o.id, { stroke: { ...o.stroke, color: c, enabled: true } }, 'st-c')} />
        </Row>
        <Slider label="السماكة" value={o.stroke.width} min={0.5} max={80} step={0.5} onChange={(v) => update(o.id, { stroke: { ...o.stroke, width: v, enabled: true } }, 'st-w')} />
      </Section>
      <ShadowEditor s={o.shadow} onChange={(s, k) => update(o.id, { shadow: s }, k)} />
      <BlendSection o={o} />
    </>
  );
}

function ImageProps({ o }: { o: ImageObj }) {
  const update = useStore((s) => s.updateObj);
  return (
    <>
      <Section title="الصورة">
        <Row label="رمادي">
          <Toggle checked={o.grayscale} onChange={(v) => update(o.id, { grayscale: v })} />
        </Row>
      </Section>
      <BlendSection o={o} />
    </>
  );
}

// ———————————————— التحويل (مشترك)
function TransformProps({ o }: { o: Obj }) {
  const update = useStore((s) => s.updateObj);
  const doc = useStore((s) => s.doc);
  const duplicate = useStore((s) => s.duplicate);
  const removeObj = useStore((s) => s.removeObj);
  const moveLayer = useStore((s) => s.moveLayer);
  const [lockRatio, setLockRatio] = useState(true);
  return (
    <Section title="الموضع والتحويل" defaultOpen={o.type !== 'text'}>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="س" value={o.x} onChange={(v) => update(o.id, { x: v }, 'x')} />
        <NumField label="ص" value={o.y} onChange={(v) => update(o.id, { y: v }, 'y')} />
      </div>
      <Slider label="التدوير" value={o.rotation} min={-180} max={180} onChange={(v) => update(o.id, { rotation: v }, 'rot')} suffix="°" />
      <Slider
        label="التكبير"
        value={Math.abs(o.scaleX)}
        min={0.05}
        max={5}
        step={0.01}
        onChange={(v) => {
          const sx = Math.sign(o.scaleX || 1) * v;
          const ratio = Math.abs(o.scaleY / (o.scaleX || 1));
          update(o.id, lockRatio ? { scaleX: sx, scaleY: Math.sign(o.scaleY || 1) * v * ratio } : { scaleX: sx }, 'sx');
        }}
      />
      {!lockRatio && <Slider label="تكبير رأسي" value={Math.abs(o.scaleY)} min={0.05} max={5} step={0.01} onChange={(v) => update(o.id, { scaleY: Math.sign(o.scaleY || 1) * v }, 'sy')} />}
      <Row label="">
        <Toggle checked={lockRatio} onChange={setLockRatio} label="حفظ النسبة" />
      </Row>
      <Slider label="الإمالة" value={o.skewX} min={-60} max={60} onChange={(v) => update(o.id, { skewX: v }, 'skew')} suffix="°" />
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Btn title="توسيط أفقي" onClick={() => update(o.id, { x: doc.width / 2 })}>توسيط ↔</Btn>
        <Btn title="توسيط رأسي" onClick={() => update(o.id, { y: doc.height / 2 })}>توسيط ↕</Btn>
        <Btn title="قلب أفقي" onClick={() => update(o.id, { scaleX: -o.scaleX })}>
          <FlipHorizontal size={14} />
        </Btn>
        <Btn title="قلب رأسي" onClick={() => update(o.id, { scaleY: -o.scaleY })}>
          <FlipHorizontal size={14} className="rotate-90" />
        </Btn>
        <Btn title="إعادة التحويل" onClick={() => update(o.id, { rotation: 0, scaleX: 1, scaleY: 1, skewX: 0 })}>
          <RotateCcw size={14} />
        </Btn>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Btn title="إلى الأمام" onClick={() => moveLayer(o.id, 'top')}>
          <ArrowUpToLine size={14} />
        </Btn>
        <Btn title="إلى الخلف" onClick={() => moveLayer(o.id, 'bottom')}>
          <ArrowDownToLine size={14} />
        </Btn>
        <Btn title="تكرار" onClick={() => duplicate(o.id)}>
          <Copy size={14} /> تكرار
        </Btn>
        <Btn title={o.locked ? 'فك القفل' : 'قفل'} onClick={() => update(o.id, { locked: !o.locked })} active={o.locked}>
          {o.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </Btn>
        <Btn title="حذف" onClick={() => removeObj(o.id)} className="!bg-red-900/60 hover:!bg-red-800">
          <Trash2 size={14} />
        </Btn>
      </div>
    </Section>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-300">
      {label}
      <input type="number" className="num w-full" dir="ltr" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
