import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Search, Unlock, ChevronUp, ChevronDown, Type, Image as ImageIcon, Shapes, Upload, Trash2 } from 'lucide-react';
import { useSelected, useStore } from '../state/store';
import { CATEGORIES, FONTS, cssFamily, type FontCategory } from '../data/fonts';
import { TEMPLATES } from '../data/templates';
import { PHRASE_GROUPS } from '../data/phrases';
import { SHAPE_LIBRARY, shapePath } from '../data/shapes';
import { BG_PRESETS, CANVAS_PRESETS, PAPERS, PATTERNS } from '../data/presets';
import { makeShape, makeText } from '../state/factory';
import { DocSvg } from '../components/render';
import { ensureCssFont } from '../engine/export';
import { deleteUserFont, importFontFile } from '../engine/userFonts';
import { ColorInput, Row, Section, Slider, cn } from '../components/ui';
import { FillEditor, fillPreview } from './FillEditor';
import type { Doc } from '../state/types';

export function Library() {
  const library = useStore((s) => s.library);
  const titles: Record<string, string> = {
    fonts: 'الخطوط',
    ideas: 'أفكار جاهزة',
    phrases: 'عبارات ورموز',
    shapes: 'زخارف وأشكال',
    background: 'الخلفية واللوحة',
    layers: 'الطبقات',
  };
  if (!library) return null;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 px-4 py-3 text-sm font-bold text-gold-200">{titles[library]}</div>
      <div className="flex-1 overflow-y-auto scroll-thin">
        {library === 'fonts' && <FontsLib />}
        {library === 'ideas' && <IdeasLib />}
        {library === 'phrases' && <PhrasesLib />}
        {library === 'shapes' && <ShapesLib />}
        {library === 'background' && <BackgroundLib />}
        {library === 'layers' && <LayersLib />}
      </div>
    </div>
  );
}

function newTextSize(doc: Doc) {
  return Math.round(Math.min(doc.width, doc.height) * 0.11);
}

// ———— الخطوط
function FontsLib() {
  const sel = useSelected();
  const doc = useStore((s) => s.doc);
  const updateObj = useStore((s) => s.updateObj);
  const addObj = useStore((s) => s.addObj);
  const notify = useStore((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState<FontCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const sample = sel?.type === 'text' ? sel.text.split('\n')[0].slice(0, 40) || 'بسم الله' : 'بسم الله الرحمن الرحيم';
  const hasMine = FONTS.some((f) => f.user);
  const cats = CATEGORIES.filter((c) => c.id !== 'mine' || hasMine);
  const list = FONTS.filter((f) => (cat === 'all' || f.category === cat) && (!q || f.name.includes(q) || f.latin.toLowerCase().includes(q.toLowerCase())));
  const apply = (id: string) => {
    const def = FONTS.find((f) => f.id === id)!;
    const weight = def.variable ? def.variable.def : 400;
    if (sel?.type === 'text') updateObj(sel.id, { fontId: id, weight, overrides: {}, clusterFeatures: {}, features: [] });
    else addObj(makeText({ fontId: id, weight, x: doc.width / 2, y: doc.height / 2, size: newTextSize(doc), text: 'بسم الله الرحمن الرحيم' }));
  };
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let last: string | null = null;
    const msgs: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const { def, warning } = await importFontFile(f);
        last = def.id;
        msgs.push(warning ? `«${def.name}»: ${warning}` : `أُضيف «${def.name}»`);
      } catch (e) {
        msgs.push((e as Error).message);
      }
    }
    setBusy(false);
    if (last) {
      setCat('mine');
      apply(last);
    }
    notify(msgs.join(' — '));
  };
  return (
    <div className="space-y-3 p-3">
      <div className="rounded-xl border border-dashed border-gold-600/60 bg-gold-500/5 p-3">
        <button
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-gold-300 to-gold-500 px-3 py-2 text-sm font-bold text-ink-900 hover:brightness-110 disabled:opacity-60"
        >
          <Upload size={15} /> {busy ? 'جارٍ الاستيراد…' : 'استيراد خط من جهازك'}
        </button>
        <input
          ref={fileRef}
          id="font-import"
          type="file"
          multiple
          accept=".ttf,.otf,.ttc,font/ttf,font/otf"
          className="hidden"
          onChange={(e) => {
            const fl = e.target.files;
            void onFiles(fl).finally(() => (e.target.value = ''));
          }}
        />
        <div className="mt-2 text-[11px] leading-5 text-ink-400">
          ملفات TTF أو OTF — مثل خط حمّلته من أحد مواقع الخطوط العربية. يعمل كأي خط في البرنامج (تحريك الحروف، الكشيدة، البدائل، التصدير)، ويُحفظ في هذا المتصفح فقط ولا يُرفع لأي مكان. تأكد أن رخصة الخط تسمح لك باستخدامه.
        </div>
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2">
        <Search size={14} className="text-ink-400" />
        <input id="font-search" className="w-full bg-transparent py-1.5 text-sm outline-none" placeholder="ابحث عن خط…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1">
        <Chip on={cat === 'all'} onClick={() => setCat('all')}>
          الكل ({FONTS.length})
        </Chip>
        {cats.map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)} title={c.hint}>
            {c.label}
          </Chip>
        ))}
      </div>
      {cat !== 'all' && <div className="text-[11px] text-ink-400">{CATEGORIES.find((c) => c.id === cat)?.hint}</div>}
      <div className="space-y-2">
        {list.map((f) => (
          <div key={f.id} className="relative">
            <FontCard id={f.id} name={f.name} latin={f.latin} cat={CATEGORIES.find((c) => c.id === f.category)!.label} sample={sample} active={sel?.type === 'text' && sel.fontId === f.id} onClick={() => apply(f.id)} />
            {f.user &&
              (confirmDel === f.id ? (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-ink-900/95 p-1 text-[11px] shadow">
                  <span className="px-1 text-ink-200">حذف الخط؟</span>
                  <button className="rounded bg-red-800 px-2 py-0.5 text-white hover:bg-red-700" onClick={() => { setConfirmDel(null); void deleteUserFont(f.id).then(() => notify(`حُذف «${f.name}»`)); }}>
                    حذف
                  </button>
                  <button className="rounded bg-ink-700 px-2 py-0.5 text-ink-100" onClick={() => setConfirmDel(null)}>
                    إلغاء
                  </button>
                </div>
              ) : (
                <button title="حذف هذا الخط من المتصفح" className="absolute bottom-2 left-2 rounded-md p-1 text-ink-400 hover:bg-red-900/60 hover:text-white" onClick={() => setConfirmDel(f.id)}>
                  <Trash2 size={13} />
                </button>
              ))}
          </div>
        ))}
        {cat === 'mine' && !list.length && <div className="py-6 text-center text-[12px] text-ink-400">لم تستورد أي خط بعد.</div>}
      </div>
      <div className="pt-2 text-center text-[10px] leading-5 text-ink-500">الخطوط المضمّنة مفتوحة المصدر (OFL وما يماثلها) — تعمل دون إنترنت.</div>
    </div>
  );
}

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button title={title} onClick={onClick} className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', on ? 'border-gold-500 bg-gold-500 text-ink-900' : 'border-ink-600 text-ink-300 hover:border-ink-400')}>
      {children}
    </button>
  );
}

function FontCard({ id, name, latin, cat, sample, active, onClick }: { id: string; name: string; latin: string; cat: string; sample: string; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          ensureCssFont(id);
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn('block w-full rounded-xl border p-3 text-right transition-colors', active ? 'border-gold-500 bg-gold-500/10' : 'border-ink-700 bg-ink-800/50 hover:border-ink-500')}
    >
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-bold text-ink-100">{name}</span>
        <span className="text-ink-500" dir="ltr">
          {latin} · {cat}
        </span>
      </div>
      <div className="truncate py-1 text-[28px] leading-[1.6] text-ink-50" style={{ fontFamily: visible ? `${cssFamily(id)}, var(--font-ui)` : 'var(--font-ui)', opacity: visible ? 1 : 0.3 }}>
        {sample}
      </div>
    </button>
  );
}

// ———— الأفكار
function IdeasLib() {
  const setDoc = useStore((s) => s.setDoc);
  const select = useStore((s) => s.select);
  const notify = useStore((s) => s.notify);
  const docs = useMemo(() => TEMPLATES.map((t) => ({ t, doc: t.build() })), []);
  return (
    <div className="grid grid-cols-2 gap-2.5 p-3">
      {docs.map(({ t, doc }) => (
        <button
          key={t.id}
          className="group overflow-hidden rounded-xl border border-ink-700 bg-ink-800 text-right transition-colors hover:border-gold-500"
          onClick={() => {
            setDoc(t.build());
            select(null);
            window.dispatchEvent(new Event('midad:fit'));
            notify('تم فتح الفكرة — يمكنك التراجع بـ Ctrl+Z');
          }}
        >
          <div className="flex aspect-square items-center justify-center bg-ink-950 p-1.5">
            <DocSvg doc={doc} prefix={`t-${t.id}-`} width="100%" height="100%" />
          </div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[12px] font-bold">{t.name}</span>
            <span className="rounded bg-ink-700 px-1.5 text-[10px] text-ink-300">{t.tag}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ———— العبارات
function PhrasesLib() {
  const doc = useStore((s) => s.doc);
  const sel = useSelected();
  const addObj = useStore((s) => s.addObj);
  const fontId = sel?.type === 'text' ? sel.fontId : 'amiri';
  const weight = sel?.type === 'text' ? sel.weight : 400;
  const fill = sel?.type === 'text' ? sel.fill : undefined;
  ensureCssFont(fontId);
  return (
    <div className="p-3">
      <div className="mb-3 text-[11px] text-ink-400">انقر على عبارة لإضافتها بالخط الحالي ({FONTS.find((f) => f.id === fontId)?.name}).</div>
      {PHRASE_GROUPS.map((g) => (
        <div key={g.title} className="mb-4">
          <div className="mb-1.5 text-[12px] font-bold text-gold-300">{g.title}</div>
          <div className={cn(g.title.startsWith('رموز') ? 'grid grid-cols-6 gap-1.5' : 'space-y-1.5')}>
            {g.items.map((p) => (
              <button
                key={p}
                className={cn(
                  'w-full rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2 text-ink-50 hover:border-gold-500',
                  g.title.startsWith('رموز') ? 'px-1 text-center text-2xl' : 'text-right text-lg leading-8',
                )}
                style={{ fontFamily: `${cssFamily(fontId)}, ${cssFamily('amiri')}, var(--font-ui)`, whiteSpace: 'pre-line' }}
                onClick={() =>
                  addObj(
                    makeText({
                      text: p,
                      fontId,
                      weight,
                      x: doc.width / 2,
                      y: doc.height / 2,
                      size: newTextSize(doc) * (p.length > 30 ? 0.6 : 1),
                      ...(fill ? { fill } : {}),
                    }),
                  )
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ———— الأشكال
function ShapesLib() {
  const doc = useStore((s) => s.doc);
  const addObj = useStore((s) => s.addObj);
  const k = Math.min(doc.width, doc.height) / 1080;
  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      {SHAPE_LIBRARY.map((s) => {
        const w = s.w;
        const h = s.h;
        const d = shapePath({ shape: s.kind, w, h, points: s.points ?? 8, inner: s.inner ?? 0.5 });
        const m = Math.max(w, h) * 0.6;
        return (
          <button
            key={s.kind}
            className="flex flex-col items-center gap-1 rounded-xl border border-ink-700 bg-ink-800/60 p-2 hover:border-gold-500"
            onClick={() =>
              addObj(
                makeShape({
                  name: s.label,
                  shape: s.kind,
                  w: s.w * k,
                  h: s.h * k,
                  points: s.points ?? 8,
                  inner: s.inner ?? 0.5,
                  x: doc.width / 2,
                  y: doc.height / 2,
                  fill: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#8a6a1f' }, { offset: 0.3, color: '#f6e27a' }, { offset: 0.6, color: '#c9982c' }, { offset: 1, color: '#9c7a2b' }] },
                }),
              )
            }
          >
            <svg viewBox={`${-m} ${-m} ${m * 2} ${m * 2}`} className="h-14 w-14">
              <path d={d} fill="#d29b2e" fillRule="evenodd" />
            </svg>
            <span className="text-[11px] text-ink-200">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ———— الخلفية
function BackgroundLib() {
  const doc = useStore((s) => s.doc);
  const setDoc = useStore((s) => s.setDoc);
  const b = doc.background;
  const setBg = (p: Partial<typeof b>, key?: string) => setDoc({ ...doc, background: { ...b, ...p } }, key);
  const setSize = (w: number, h: number) => {
    // نقل العناصر نسبيًا للحفاظ على التوسيط
    const dx = (w - doc.width) / 2;
    const dy = (h - doc.height) / 2;
    setDoc({ ...doc, width: w, height: h, objects: doc.objects.map((o) => ({ ...o, x: o.x + dx, y: o.y + dy })) });
  };
  return (
    <div>
      <Section title="مقاس اللوحة">
        <div className="grid grid-cols-2 gap-1.5">
          {CANVAS_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setSize(p.w, p.h)}
              className={cn('rounded-lg border px-2 py-1.5 text-right text-[11px]', doc.width === p.w && doc.height === p.h ? 'border-gold-500 text-gold-200' : 'border-ink-600 text-ink-300 hover:border-ink-400')}
            >
              {p.name}
              <span className="block text-[10px] text-ink-500" dir="ltr">
                {p.w}×{p.h}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-300">
          عرض
          <input type="number" className="num w-20" dir="ltr" value={doc.width} onChange={(e) => setSize(Math.max(50, Math.min(8000, Number(e.target.value) || 50)), doc.height)} />
          ارتفاع
          <input type="number" className="num w-20" dir="ltr" value={doc.height} onChange={(e) => setSize(doc.width, Math.max(50, Math.min(8000, Number(e.target.value) || 50)))} />
        </div>
      </Section>
      <Section title="لون الخلفية">
        <div className="grid grid-cols-5 gap-1.5">
          {BG_PRESETS.map((p) => (
            <button key={p.name} title={p.name} className="h-8 rounded-md border border-black/40" style={{ background: fillPreview(p.fill) }} onClick={() => setBg({ fill: p.fill })} />
          ))}
        </div>
        <FillEditor fill={b.fill} onChange={(f, k) => setBg({ fill: f }, k)} />
      </Section>
      <Section title="خامة الورق">
        <div className="grid grid-cols-4 gap-1.5">
          {PAPERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setBg(p.id === 'none' ? { paper: 'none' } : { paper: p.id, fill: { type: 'solid', color: p.base } })}
              className={cn('rounded-lg border px-1 py-2 text-[11px]', b.paper === p.id ? 'border-gold-500 text-gold-200' : 'border-ink-600 text-ink-300')}
            >
              <span className="mx-auto mb-1 block h-5 w-8 rounded" style={{ background: p.base }} />
              {p.label}
            </button>
          ))}
        </div>
        {b.paper !== 'none' && <Slider label="الشدة" value={b.paperStrength} min={0} max={1} step={0.05} onChange={(v) => setBg({ paperStrength: v }, 'paper-s')} />}
      </Section>
      <Section title="نقش هندسي">
        <div className="grid grid-cols-4 gap-1.5">
          {PATTERNS.map((p) => (
            <button key={p.id} onClick={() => setBg({ pattern: p.id })} className={cn('rounded-lg border px-1 py-1.5 text-[11px]', b.pattern === p.id ? 'border-gold-500 text-gold-200' : 'border-ink-600 text-ink-300')}>
              {p.label}
            </button>
          ))}
        </div>
        {b.pattern !== 'none' && (
          <>
            <Row label="اللون">
              <ColorInput value={b.patternColor} onChange={(c) => setBg({ patternColor: c }, 'pat-c')} />
            </Row>
            <Slider label="الوضوح" value={b.patternOpacity} min={0.02} max={1} step={0.01} onChange={(v) => setBg({ patternOpacity: v }, 'pat-o')} />
            <Slider label="الحجم" value={b.patternScale} min={0.2} max={4} step={0.05} onChange={(v) => setBg({ patternScale: v }, 'pat-s')} />
          </>
        )}
      </Section>
      <Section title="تظليل الأطراف">
        <Slider label="الشدة" value={b.vignette} min={0} max={1} step={0.05} onChange={(v) => setBg({ vignette: v }, 'vig')} />
      </Section>
    </div>
  );
}

// ———— الطبقات
function LayersLib() {
  const doc = useStore((s) => s.doc);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const updateObj = useStore((s) => s.updateObj);
  const moveLayer = useStore((s) => s.moveLayer);
  const list = [...doc.objects].reverse();
  if (!list.length) return <div className="p-4 text-sm text-ink-400">لا توجد عناصر بعد.</div>;
  return (
    <div className="space-y-1 p-2">
      {list.map((o) => (
        <div
          key={o.id}
          onClick={() => select(o.id)}
          className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5', selectedId === o.id ? 'border-gold-500 bg-gold-500/10' : 'border-transparent hover:bg-ink-800')}
        >
          <span className="text-ink-400">{o.type === 'text' ? <Type size={14} /> : o.type === 'shape' ? <Shapes size={14} /> : <ImageIcon size={14} />}</span>
          <input
            className="min-w-0 flex-1 truncate bg-transparent text-[13px] outline-none"
            value={o.type === 'text' && o.name === 'نص' ? o.text.split('\n')[0].slice(0, 30) : o.name}
            onChange={(e) => updateObj(o.id, { name: e.target.value }, `name-${o.id}`)}
          />
          <button className="text-ink-400 hover:text-ink-100" onClick={(e) => { e.stopPropagation(); moveLayer(o.id, 1); }} title="للأمام">
            <ChevronUp size={14} />
          </button>
          <button className="text-ink-400 hover:text-ink-100" onClick={(e) => { e.stopPropagation(); moveLayer(o.id, -1); }} title="للخلف">
            <ChevronDown size={14} />
          </button>
          <button className="text-ink-400 hover:text-ink-100" onClick={(e) => { e.stopPropagation(); updateObj(o.id, { locked: !o.locked }); }}>
            {o.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button className="text-ink-400 hover:text-ink-100" onClick={(e) => { e.stopPropagation(); updateObj(o.id, { visible: !o.visible }); }}>
            {o.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      ))}
    </div>
  );
}
