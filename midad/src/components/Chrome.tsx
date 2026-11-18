import { useRef } from 'react';
import {
  Download,
  FilePlus,
  FolderOpen,
  Hand,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Maximize,
  MousePointer2,
  Palette,
  Quote,
  Redo2,
  Save,
  Shapes,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  PenTool,
  CaseSensitive,
} from 'lucide-react';
import { useStore, type Library, type Tool } from '../state/store';
import { makeDoc, makeImage, makeText } from '../state/factory';
import { exportProject, readProject } from '../engine/export';
import { cn } from './ui';

export function TopBar() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const setDoc = useStore((s) => s.setDoc);
  const doc = useStore((s) => s.doc);
  const select = useStore((s) => s.select);
  const setShowExport = useStore((s) => s.setShowExport);
  const notify = useStore((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex h-12 shrink-0 items-center gap-0.5 overflow-hidden border-b border-ink-700 bg-ink-900 px-2 sm:gap-1 sm:px-3">
      <div className="ml-1 flex shrink-0 items-center gap-2 sm:ml-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-300 to-gold-600 text-ink-900 shadow">
          <PenTool size={17} />
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-[15px] font-bold text-gold-200">مِداد</div>
          <div className="hidden text-[10px] text-ink-400 sm:block">استوديو الخط العربي</div>
        </div>
      </div>
      <BarBtn
        title="لوحة جديدة"
        onClick={() => {
          setDoc(makeDoc({ width: doc.width, height: doc.height, objects: [makeText({ x: doc.width / 2, y: doc.height / 2 })] }));
          select(null);
          notify('لوحة جديدة — يمكنك التراجع بـ Ctrl+Z');
        }}
      >
        <FilePlus size={16} />
        <span className="hidden lg:inline">جديد</span>
      </BarBtn>
      <BarBtn title="فتح مشروع (.midad.json)" onClick={() => fileRef.current?.click()}>
        <FolderOpen size={16} />
        <span className="hidden lg:inline">فتح</span>
      </BarBtn>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setDoc(await readProject(f));
            select(null);
            window.dispatchEvent(new Event('midad:fit'));
            notify('تم فتح المشروع');
          } catch (err) {
            notify((err as Error).message);
          }
        }}
      />
      <BarBtn title="حفظ المشروع (Ctrl+S)" onClick={() => exportProject(doc, 'midad-project')}>
        <Save size={16} />
        <span className="hidden lg:inline">حفظ</span>
      </BarBtn>
      <div className="mx-1 h-6 w-px bg-ink-700 sm:mx-2" />
      <BarBtn title="تراجع (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
        <Undo2 size={16} />
      </BarBtn>
      <BarBtn title="إعادة (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
        <Redo2 size={16} />
      </BarBtn>
      <div className="flex-1" />
      <div className="hidden items-center sm:flex">
        <BarBtn title="تصغير" onClick={() => setZoom(zoom / 1.2)}>
          <ZoomOut size={16} />
        </BarBtn>
        <span className="w-12 text-center text-xs tabular-nums text-ink-300" dir="ltr">
          {Math.round(zoom * 100)}%
        </span>
        <BarBtn title="تكبير" onClick={() => setZoom(zoom * 1.2)}>
          <ZoomIn size={16} />
        </BarBtn>
      </div>
      <BarBtn title="ملاءمة الشاشة" onClick={() => window.dispatchEvent(new Event('midad:fit'))}>
        <Maximize size={16} />
      </BarBtn>
      <div className="mx-1 hidden h-6 w-px bg-ink-700 sm:block" />
      <button
        onClick={() => setShowExport(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-b from-gold-300 to-gold-500 px-2.5 py-1.5 text-sm font-bold text-ink-900 shadow hover:brightness-110 sm:px-3.5"
      >
        <Download size={16} /> تصدير
      </button>
    </header>
  );
}

function BarBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1.5 sm:px-2 text-[13px] text-ink-200 hover:bg-ink-700 disabled:opacity-30">
      {children}
    </button>
  );
}

export function ToolRail() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const library = useStore((s) => s.library);
  const setLibrary = useStore((s) => s.setLibrary);
  const addObj = useStore((s) => s.addObj);
  const doc = useStore((s) => s.doc);
  const notify = useStore((s) => s.notify);
  const imgRef = useRef<HTMLInputElement>(null);

  const tools: { v: Tool; icon: React.ReactNode; label: string }[] = [
    { v: 'select', icon: <MousePointer2 size={19} />, label: 'تحديد' },
    { v: 'letters', icon: <CaseSensitive size={19} />, label: 'تحريك الحروف' },
    { v: 'hand', icon: <Hand size={19} />, label: 'تحريك اللوحة' },
  ];
  const libs: { v: Exclude<Library, null>; icon: React.ReactNode; label: string }[] = [
    { v: 'ideas', icon: <Lightbulb size={19} />, label: 'أفكار' },
    { v: 'fonts', icon: <Type size={19} />, label: 'الخطوط' },
    { v: 'phrases', icon: <Quote size={19} />, label: 'عبارات' },
    { v: 'shapes', icon: <Shapes size={19} />, label: 'زخارف' },
    { v: 'background', icon: <Palette size={19} />, label: 'الخلفية' },
    { v: 'layers', icon: <Layers size={19} />, label: 'الطبقات' },
  ];

  return (
    <nav className="flex w-[60px] shrink-0 sm:w-[68px] flex-col items-center gap-1 overflow-y-auto border-l border-ink-700 bg-ink-900 py-2 scroll-thin">
      {tools.map((t) => (
        <RailBtn key={t.v} active={tool === t.v} onClick={() => setTool(t.v)} label={t.label}>
          {t.icon}
        </RailBtn>
      ))}
      <div className="my-1 h-px w-10 bg-ink-700" />
      <RailBtn
        label="نص جديد"
        onClick={() => {
          addObj(makeText({ x: doc.width / 2, y: doc.height / 2, size: Math.round(Math.min(doc.width, doc.height) * 0.11), text: 'اكتب هنا' }));
          setTimeout(() => window.dispatchEvent(new Event('midad:focus-text')), 50);
        }}
      >
        <span className="text-lg font-bold leading-none">+ع</span>
      </RailBtn>
      <RailBtn label="صورة" onClick={() => imgRef.current?.click()}>
        <ImageIcon size={19} />
      </RailBtn>
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          if (f.size > 12 * 1024 * 1024) return notify('الصورة كبيرة جدًا (الحد 12 ميغابايت)');
          const reader = new FileReader();
          reader.onload = () => {
            const src = String(reader.result);
            const img = new Image();
            img.onload = () => {
              const k = Math.min((doc.width * 0.6) / img.width, (doc.height * 0.6) / img.height, 1);
              addObj(makeImage({ src, w: img.width * k, h: img.height * k, x: doc.width / 2, y: doc.height / 2, name: f.name }));
            };
            img.src = src;
          };
          reader.readAsDataURL(f);
        }}
      />
      <div className="my-1 h-px w-10 bg-ink-700" />
      {libs.map((l) => (
        <RailBtn key={l.v} active={library === l.v} onClick={() => setLibrary(library === l.v ? null : l.v)} label={l.label}>
          {l.icon}
        </RailBtn>
      ))}
    </nav>
  );
}

function RailBtn({ children, active, onClick, label }: { children: React.ReactNode; active?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn('flex w-[52px] flex-col sm:w-14 items-center gap-0.5 rounded-xl py-1.5 text-[10px] transition-colors', active ? 'bg-gold-500/20 text-gold-200' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100')}
    >
      {children}
      <span className="leading-tight">{label}</span>
    </button>
  );
}
