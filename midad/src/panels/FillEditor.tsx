import type { Fill, GradientStop } from '../state/types';
import { GRADIENTS, TEXTURES } from '../data/presets';
import { ColorInput, Row, Seg, Slider } from '../components/ui';

export function fillPreview(f: Fill): string {
  if (f.type === 'solid') return f.color;
  if (f.type === 'linear') return `linear-gradient(${f.angle + 90}deg, ${f.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})`;
  if (f.type === 'radial') return `radial-gradient(circle, ${f.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})`;
  if (f.type === 'texture') return `linear-gradient(135deg, ${f.color}, ${f.color2}, ${f.color}, ${f.color2})`;
  return 'repeating-conic-gradient(#555 0 25%, #333 0 50%) 0 0/10px 10px';
}

type Kind = 'solid' | 'gradient' | 'texture' | 'none';

export function FillEditor({ fill, onChange, allowNone = true }: { fill: Fill; onChange: (f: Fill, key?: string) => void; allowNone?: boolean }) {
  const kind: Kind = fill.type === 'linear' || fill.type === 'radial' ? 'gradient' : fill.type;
  const setKind = (k: Kind) => {
    if (k === kind) return;
    if (k === 'solid') onChange({ type: 'solid', color: fill.type === 'texture' ? fill.color : fill.type === 'linear' || fill.type === 'radial' ? fill.stops[0].color : '#1a1410' });
    if (k === 'gradient') onChange(GRADIENTS[0].fill);
    if (k === 'texture') onChange(TEXTURES[1].fill);
    if (k === 'none') onChange({ type: 'none' });
  };
  const opts: { v: Kind; label: string }[] = [
    { v: 'solid', label: 'لون' },
    { v: 'gradient', label: 'تدرّج' },
    { v: 'texture', label: 'خامة' },
  ];
  if (allowNone) opts.push({ v: 'none', label: 'بدون' });

  return (
    <div className="space-y-2.5">
      <Seg value={kind} options={opts} onChange={setKind} />
      {fill.type === 'solid' && <ColorInput value={fill.color} onChange={(c) => onChange({ type: 'solid', color: c }, 'fill-color')} />}
      {(fill.type === 'linear' || fill.type === 'radial') && (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {GRADIENTS.map((g) => (
              <button
                key={g.name}
                title={g.name}
                className="h-7 rounded-md border border-black/40 shadow-inner transition-transform hover:scale-105"
                style={{ background: fillPreview(g.fill) }}
                onClick={() => onChange(g.fill)}
              />
            ))}
          </div>
          <Row label="النوع">
            <Seg
              value={fill.type}
              options={[
                { v: 'linear', label: 'خطي' },
                { v: 'radial', label: 'دائري' },
              ]}
              onChange={(t) =>
                onChange(t === 'linear' ? { type: 'linear', stops: fill.stops, angle: fill.type === 'linear' ? fill.angle : 90 } : { type: 'radial', stops: fill.stops })
              }
            />
          </Row>
          {fill.type === 'linear' && (
            <Slider label="الزاوية" value={fill.angle} min={0} max={360} onChange={(v) => onChange({ ...fill, angle: v }, 'grad-angle')} suffix="°" />
          )}
          <StopsEditor stops={fill.stops} onChange={(stops) => onChange({ ...fill, stops } as Fill, 'grad-stops')} />
        </>
      )}
      {fill.type === 'texture' && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {TEXTURES.map((t) => (
              <button
                key={t.name}
                className="rounded-md border border-ink-600 bg-ink-800 px-1 py-1.5 text-[11px] hover:border-gold-500"
                onClick={() => onChange(t.fill)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <Row label="اللون ١">
            <ColorInput value={fill.color} swatches={false} onChange={(c) => onChange({ ...fill, color: c }, 'tex-c1')} />
          </Row>
          <Row label="اللون ٢">
            <ColorInput value={fill.color2} swatches={false} onChange={(c) => onChange({ ...fill, color2: c }, 'tex-c2')} />
          </Row>
          <Slider label="المقياس" value={fill.scale} min={0.2} max={4} step={0.1} onChange={(v) => onChange({ ...fill, scale: v }, 'tex-scale')} />
        </>
      )}
    </div>
  );
}

function StopsEditor({ stops, onChange }: { stops: GradientStop[]; onChange: (s: GradientStop[]) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="h-3 rounded" style={{ background: `linear-gradient(90deg, ${stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})` }} dir="ltr" />
      <div className="flex flex-wrap gap-1.5" dir="ltr">
        {stops.map((s, i) => (
          <label key={i} className="relative h-6 w-6 cursor-pointer overflow-hidden rounded border border-ink-500" style={{ background: s.color }} title={`${Math.round(s.offset * 100)}%`}>
            <input
              type="color"
              className="absolute inset-0 opacity-0"
              value={/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#000000'}
              onChange={(e) => onChange(stops.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
            />
          </label>
        ))}
        {stops.length < 6 && (
          <button
            className="h-6 rounded border border-dashed border-ink-500 px-1.5 text-xs text-ink-300"
            onClick={() => {
              const sorted = [...stops].sort((a, b) => a.offset - b.offset);
              onChange([...sorted.slice(0, -1), { offset: (sorted[sorted.length - 2]?.offset ?? 0) / 2 + 0.5, color: sorted[sorted.length - 1].color }, sorted[sorted.length - 1]].sort((a, b) => a.offset - b.offset));
            }}
          >
            +
          </button>
        )}
        {stops.length > 2 && (
          <button className="h-6 rounded border border-dashed border-ink-500 px-1.5 text-xs text-ink-300" onClick={() => onChange(stops.slice(0, -1).map((s, i, a) => ({ ...s, offset: a.length > 1 ? i / (a.length - 1) : 0 })))}>
            −
          </button>
        )}
      </div>
    </div>
  );
}
