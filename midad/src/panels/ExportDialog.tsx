import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../state/store';
import { exportJpg, exportPng, exportProject, exportSvg } from '../engine/export';
import { Seg, Toggle, cn } from '../components/ui';

type Fmt = 'png' | 'jpg' | 'svg' | 'project';

export function ExportDialog() {
  const show = useStore((s) => s.showExport);
  const setShow = useStore((s) => s.setShowExport);
  const doc = useStore((s) => s.doc);
  const notify = useStore((s) => s.notify);
  const [fmt, setFmt] = useState<Fmt>('png');
  const [scale, setScale] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [name, setName] = useState('midad');
  const [busy, setBusy] = useState(false);
  if (!show) return null;

  const run = async () => {
    setBusy(true);
    try {
      const n = name.trim() || 'midad';
      if (fmt === 'png') await exportPng(doc, scale, transparent, n);
      if (fmt === 'jpg') await exportJpg(doc, scale, n);
      if (fmt === 'svg') await exportSvg(doc, transparent, n);
      if (fmt === 'project') await exportProject(doc, n);
      notify('تم التصدير ✓');
      setShow(false);
    } catch (e) {
      notify((e as Error).message || 'تعذّر التصدير');
    } finally {
      setBusy(false);
    }
  };

  const fmts: { v: Fmt; t: string; d: string }[] = [
    { v: 'png', t: 'PNG', d: 'صورة عالية الدقة، تدعم الشفافية — للنشر والطباعة' },
    { v: 'jpg', t: 'JPG', d: 'صورة أخف حجمًا للمشاركة' },
    { v: 'svg', t: 'SVG متجه', d: 'الحروف مسارات متجهة — تُفتح في Illustrator وInkscape وتُكبّر بلا حدود' },
    { v: 'project', t: 'مشروع مِداد', d: 'ملف قابل للتعديل لاحقًا في البرنامج' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShow(false)}>
      <div className="w-full max-w-md rounded-2xl border border-ink-600 bg-ink-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gold-200">تصدير اللوحة</h2>
          <button onClick={() => setShow(false)} className="text-ink-400 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {fmts.map((f) => (
            <button
              key={f.v}
              onClick={() => setFmt(f.v)}
              className={cn('block w-full rounded-xl border p-3 text-right', fmt === f.v ? 'border-gold-500 bg-gold-500/10' : 'border-ink-700 hover:border-ink-500')}
            >
              <div className="text-sm font-bold">{f.t}</div>
              <div className="text-[11px] text-ink-400">{f.d}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {(fmt === 'png' || fmt === 'jpg') && (
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-ink-300">الدقة</span>
              <Seg
                value={String(scale)}
                options={[
                  { v: '1', label: '×1' },
                  { v: '2', label: '×2' },
                  { v: '3', label: '×3' },
                  { v: '4', label: '×4' },
                ]}
                onChange={(v) => setScale(Number(v))}
              />
            </div>
          )}
          {(fmt === 'png' || fmt === 'jpg') && (
            <div className="text-[11px] text-ink-400" dir="rtl">
              المقاس الناتج: <span dir="ltr">{Math.round(doc.width * scale)} × {Math.round(doc.height * scale)}</span> بكسل
            </div>
          )}
          {(fmt === 'png' || fmt === 'svg') && <Toggle checked={transparent} onChange={setTransparent} label="خلفية شفافة (الخط والزخارف فقط)" />}
          <label className="flex items-center gap-3 text-xs text-ink-300">
            <span className="w-16">اسم الملف</span>
            <input className="num flex-1" value={name} onChange={(e) => setName(e.target.value)} dir="auto" />
          </label>
        </div>
        <button
          disabled={busy}
          onClick={run}
          className="mt-5 w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-2.5 text-sm font-bold text-ink-900 hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'جارٍ التصدير…' : 'تنزيل'}
        </button>
      </div>
    </div>
  );
}
