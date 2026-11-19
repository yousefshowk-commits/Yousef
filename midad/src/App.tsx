import { useEffect, useReducer } from 'react';
import { TopBar, ToolRail } from './components/Chrome';
import { Stage } from './components/Stage';
import { Library } from './panels/Library';
import { Properties } from './panels/Properties';
import { ExportDialog } from './panels/ExportDialog';
import { useStore } from './state/store';
import { onFontsChanged, loadFont } from './engine/hb';
import { bumpLayoutVersion } from './engine/layout';
import { exportProject } from './engine/export';
import { loadUserFonts } from './engine/userFonts';

export default function App() {
  const library = useStore((s) => s.library);
  const toast = useStore((s) => s.toast);
  const hasSel = useStore((s) => s.selectedId !== null);
  const [, force] = useReducer((x: number) => x + 1, 0);

  // إعادة الرسم عند اكتمال تحميل أي خط
  useEffect(
    () =>
      onFontsChanged(() => {
        bumpLayoutVersion();
        force();
      }),
    [],
  );

  // تحميل مسبق للخطوط الأكثر استخدامًا
  useEffect(() => {
    void loadFont('amiri', 400);
    void loadFont('aref-ruqaa', 700);
    void loadUserFonts();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const st = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const sel = st.doc.objects.find((o) => o.id === st.selectedId);
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        exportProject(st.doc, 'midad-project').catch((err: Error) => st.notify(err.message));
      } else if (mod && e.key.toLowerCase() === 'c') {
        st.copy();
      } else if (mod && e.key.toLowerCase() === 'v') {
        st.paste();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (sel) st.duplicate(sel.id);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (sel && st.tool === 'letters' && st.glyphKey && sel.type === 'text') {
          const k = st.glyphKey;
          const prev = sel.overrides[k] ?? { dx: 0, dy: 0, rot: 0, scale: 1 };
          st.updateText(sel.id, (o) => ({ overrides: { ...o.overrides, [k]: { ...prev, hidden: true } } }));
        } else if (sel) st.removeObj(sel.id);
      } else if (e.key === 'Escape') {
        if (st.glyphKey) st.selectGlyph(null);
        else if (st.tool !== 'select') st.setTool('select');
        else st.select(null);
      } else if (e.key.startsWith('Arrow') && sel) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        if (st.tool === 'letters' && st.glyphKey && sel.type === 'text') {
          const k = st.glyphKey;
          st.updateText(
            sel.id,
            (o) => {
              const prev = o.overrides[k] ?? { dx: 0, dy: 0, rot: 0, scale: 1 };
              return { overrides: { ...o.overrides, [k]: { ...prev, dx: prev.dx + dx, dy: prev.dy + dy } } };
            },
            'nudge-g',
          );
        } else st.updateObj(sel.id, { x: sel.x + dx, y: sel.y + dy }, 'nudge');
      } else if (!mod && (e.key === 'v' || e.key === 'V')) st.setTool('select');
      else if (!mod && (e.key === 'l' || e.key === 'L')) st.setTool('letters');
      else if (!mod && (e.key === 'h' || e.key === 'H')) st.setTool('hand');
      else if (!mod && (e.key === '+' || e.key === '=')) st.setZoom(st.zoom * 1.2);
      else if (!mod && e.key === '-') st.setZoom(st.zoom / 1.2);
      else if (!mod && e.key === '0') window.dispatchEvent(new Event('midad:fit'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" dir="rtl">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <ToolRail />
        {library && (
          <aside className="absolute inset-y-0 right-[60px] z-20 w-[min(300px,calc(100vw-60px))] border-l sm:right-[68px] border-ink-700 bg-ink-900 shadow-2xl lg:static lg:z-auto lg:shadow-none">
            <Library />
          </aside>
        )}
        <main className="relative min-w-0 flex-1">
          <Stage />
        </main>
        <aside
          className={`border-ink-700 bg-ink-900 max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:h-[46%] max-md:rounded-t-2xl max-md:border-t max-md:shadow-2xl md:w-[310px] md:shrink-0 md:border-r ${hasSel ? 'block' : 'hidden md:block'}`}
        >
          <Properties />
        </aside>
      </div>
      <ExportDialog />
      {toast && (
        <div className="toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-ink-50 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
