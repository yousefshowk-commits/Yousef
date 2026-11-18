// لوحة الرسم: العرض، التحديد، السحب والتحجيم والتدوير، وضع تحريك الحروف، التكبير والتحريك.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { Obj, TextObj } from '../state/types';
import { BackgroundNode, ObjNode, shapeBox } from './render';
import { layoutText, type Box, type PlacedGlyph } from '../engine/layout';
import { apply, invert, mul, R, S, T, type Mat } from '../engine/hb';

export function objMatrix(o: Obj): Mat {
  const k = Math.tan((o.skewX * Math.PI) / 180);
  return mul(T(o.x, o.y), mul(R(o.rotation), mul([1, 0, k, 1, 0, 0], S(o.scaleX, o.scaleY))));
}

export function objBox(o: Obj): Box {
  if (o.type === 'text') return layoutText(o).box;
  if (o.type === 'shape') return shapeBox(o);
  return { x0: -o.w / 2, y0: -o.h / 2, x1: o.w / 2, y1: o.h / 2 };
}

type Drag =
  | { kind: 'move'; id: string; start: [number, number]; ox: number; oy: number; key: string }
  | { kind: 'scale'; id: string; mode: 'corner' | 'x' | 'y'; start: [number, number]; sx: number; sy: number; key: string }
  | { kind: 'rotate'; id: string; start: [number, number]; rot: number; key: string }
  | { kind: 'glyph'; id: string; gkey: string; start: [number, number]; dx: number; dy: number; inv: Mat; key: string }
  | { kind: 'pan'; startClient: [number, number]; pan: [number, number] };

const ACCENT = '#e0a43a';

export function Stage() {
  const doc = useStore((s) => s.doc);
  const selectedId = useStore((s) => s.selectedId);
  const glyphKey = useStore((s) => s.glyphKey);
  const tool = useStore((s) => s.tool);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const select = useStore((s) => s.select);
  const selectGlyph = useStore((s) => s.selectGlyph);
  const updateObj = useStore((s) => s.updateObj);
  const updateText = useStore((s) => s.updateText);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [spaceDown, setSpaceDown] = useState(false);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, [number, number]>());
  const pinch = useRef<{ dist: number; zoom: number; mid: [number, number] } | null>(null);
  const prevZoom = useRef(zoom);

  const fit = useCallback(() => {
    const { w, h } = size;
    const z = Math.min((w - 80) / doc.width, (h - 80) / doc.height);
    const zz = Math.max(0.05, z);
    prevZoom.current = zz;
    setZoom(zz);
    setPan([doc.width / 2 - w / zz / 2, doc.height / 2 - h / zz / 2]);
  }, [size, doc.width, doc.height, setZoom]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ملاءمة عند تغيّر المقاس أو أبعاد المستند
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, doc.width, doc.height]);

  useEffect(() => {
    const onFit = () => fit();
    window.addEventListener('midad:fit', onFit);
    return () => window.removeEventListener('midad:fit', onFit);
  }, [fit]);

  // التكبير من الأزرار يحافظ على المركز
  useEffect(() => {
    const pz = prevZoom.current;
    if (pz !== zoom) {
      setPan(([px, py]) => {
        const cx = px + size.w / pz / 2;
        const cy = py + size.h / pz / 2;
        return [cx - size.w / zoom / 2, cy - size.h / zoom / 2];
      });
      prevZoom.current = zoom;
    }
  }, [zoom, size.w, size.h]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setSpaceDown(true);
        e.preventDefault();
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  const toDoc = (clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return [pan[0] + (clientX - r.left) / zoom, pan[1] + (clientY - r.top) / zoom];
  };

  // عجلة الفأرة: تكبير مع Ctrl أو تحريك
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = useStore.getState();
      if (e.ctrlKey || e.metaKey) {
        const r = svg.getBoundingClientRect();
        const z0 = st.zoom;
        const z1 = Math.max(0.05, Math.min(6, z0 * Math.exp(-e.deltaY * 0.0022)));
        setPan(([px, py]) => {
          const mx = px + (e.clientX - r.left) / z0;
          const my = py + (e.clientY - r.top) / z0;
          return [mx - (e.clientX - r.left) / z1, my - (e.clientY - r.top) / z1];
        });
        prevZoom.current = z1;
        st.setZoom(z1);
      } else {
        const z = st.zoom;
        setPan(([px, py]) => [px + (e.shiftKey ? e.deltaY : e.deltaX) / z, py + (e.shiftKey ? 0 : e.deltaY) / z]);
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const selected = doc.objects.find((o) => o.id === selectedId) ?? null;

  const startDrag = (e: React.PointerEvent, d: Drag) => {
    e.stopPropagation();
    drag.current = d;
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a[0] - b[0], a[1] - b[1]),
        zoom,
        mid: toDoc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2),
      };
      drag.current = null;
      return;
    }
    if (tool === 'hand' || spaceDown || e.button === 1) {
      startDrag(e, { kind: 'pan', startClient: [e.clientX, e.clientY], pan });
      return;
    }
    if (tool === 'letters' && glyphKey) selectGlyph(null);
    else select(null);
  };

  const onPointerDownObj = (e: React.PointerEvent, o: Obj) => {
    if (e.button === 1 || tool === 'hand' || spaceDown) return onPointerDownBg(e);
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (o.id !== selectedId) select(o.id);
    if (o.locked) {
      e.stopPropagation();
      return;
    }
    const p = toDoc(e.clientX, e.clientY);
    startDrag(e, { kind: 'move', id: o.id, start: p, ox: o.x, oy: o.y, key: `drag:${o.id}:${Date.now()}` });
  };

  const onPointerDownHandle = (e: React.PointerEvent, kind: 'corner' | 'x' | 'y' | 'rotate') => {
    if (!selected || selected.locked) return;
    const p = toDoc(e.clientX, e.clientY);
    const key = `drag:${selected.id}:${Date.now()}`;
    if (kind === 'rotate') startDrag(e, { kind: 'rotate', id: selected.id, start: p, rot: selected.rotation, key });
    else startDrag(e, { kind: 'scale', id: selected.id, mode: kind, start: p, sx: selected.scaleX, sy: selected.scaleY, key });
  };

  const onPointerDownGlyph = (e: React.PointerEvent, o: TextObj, g: PlacedGlyph) => {
    if (e.button === 1 || spaceDown) return onPointerDownBg(e);
    selectGlyph(g.key);
    const ov = o.overrides[g.key];
    const m = objMatrix(o);
    const lin: Mat = [m[0], m[1], m[2], m[3], 0, 0];
    // فرق نقطتين في فضاء المستند ← فضاء السطر
    const inv = invert(mul(lin, g.warpLin));
    startDrag(e, {
      kind: 'glyph',
      id: o.id,
      gkey: g.key,
      start: toDoc(e.clientX, e.clientY),
      dx: ov?.dx ?? 0,
      dy: ov?.dy ?? 0,
      inv,
      key: `drag:${o.id}:${g.key}:${Date.now()}`,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const z1 = Math.max(0.05, Math.min(6, (pinch.current.zoom * dist) / pinch.current.dist));
      const r = svgRef.current!.getBoundingClientRect();
      const mx = (a[0] + b[0]) / 2 - r.left;
      const my = (a[1] + b[1]) / 2 - r.top;
      prevZoom.current = z1;
      setZoom(z1);
      setPan([pinch.current.mid[0] - mx / z1, pinch.current.mid[1] - my / z1]);
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      setPan([d.pan[0] - (e.clientX - d.startClient[0]) / zoom, d.pan[1] - (e.clientY - d.startClient[1]) / zoom]);
      return;
    }
    const p = toDoc(e.clientX, e.clientY);
    const o = doc.objects.find((x) => x.id === d.id);
    if (!o) return;
    if (d.kind === 'move') {
      let nx = d.ox + p[0] - d.start[0];
      let ny = d.oy + p[1] - d.start[1];
      const th = 8 / zoom;
      const v = Math.abs(nx - doc.width / 2) < th;
      const h = Math.abs(ny - doc.height / 2) < th;
      if (v && !e.altKey) nx = doc.width / 2;
      if (h && !e.altKey) ny = doc.height / 2;
      setGuides({ v: v && !e.altKey, h: h && !e.altKey });
      updateObj(o.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 }, d.key);
    } else if (d.kind === 'rotate') {
      const a0 = Math.atan2(d.start[1] - o.y, d.start[0] - o.x);
      const a1 = Math.atan2(p[1] - o.y, p[0] - o.x);
      let r = d.rot + ((a1 - a0) * 180) / Math.PI;
      r = ((((r + 180) % 360) + 360) % 360) - 180;
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      else if (Math.abs(r) < 2) r = 0;
      updateObj(o.id, { rotation: Math.round(r * 10) / 10 }, d.key);
    } else if (d.kind === 'scale') {
      const rinv = invert(mul(R(o.rotation), [1, 0, Math.tan((o.skewX * Math.PI) / 180), 1, 0, 0]));
      const l0 = apply(rinv, d.start[0] - o.x, d.start[1] - o.y);
      const l1 = apply(rinv, p[0] - o.x, p[1] - o.y);
      if (d.mode === 'corner') {
        const f = Math.hypot(l1[0], l1[1]) / Math.max(1e-3, Math.hypot(l0[0], l0[1]));
        updateObj(o.id, { scaleX: round3(d.sx * f), scaleY: round3(d.sy * f) }, d.key);
      } else if (d.mode === 'x') {
        const f = Math.abs(l1[0]) / Math.max(1e-3, Math.abs(l0[0]));
        updateObj(o.id, { scaleX: round3(d.sx * f) }, d.key);
      } else {
        const f = Math.abs(l1[1]) / Math.max(1e-3, Math.abs(l0[1]));
        updateObj(o.id, { scaleY: round3(d.sy * f) }, d.key);
      }
    } else if (d.kind === 'glyph' && o.type === 'text') {
      const [ddx, ddy] = apply(d.inv, p[0] - d.start[0], p[1] - d.start[1]);
      updateText(
        o.id,
        (t) => {
          const prev = t.overrides[d.gkey] ?? { dx: 0, dy: 0, rot: 0, scale: 1 };
          return {
            overrides: { ...t.overrides, [d.gkey]: { ...prev, dx: Math.round(d.dx + ddx), dy: Math.round(d.dy + ddy) } },
          };
        },
        d.key,
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
    setGuides({ v: false, h: false });
  };

  const vbW = size.w / zoom;
  const vbH = size.h / zoom;
  const px = 1 / zoom; // بكسل شاشة واحد بوحدات المستند

  // طبقة التحديد
  let selection: React.ReactNode = null;
  if (selected && selected.visible) {
    const m = objMatrix(selected);
    const b = objBox(selected);
    const pad = 6 * px;
    const bx = { x0: b.x0 - pad / Math.abs(selected.scaleX || 1), y0: b.y0 - pad / Math.abs(selected.scaleY || 1), x1: b.x1 + pad / Math.abs(selected.scaleX || 1), y1: b.y1 + pad / Math.abs(selected.scaleY || 1) };
    const c = [
      apply(m, bx.x0, bx.y0),
      apply(m, bx.x1, bx.y0),
      apply(m, bx.x1, bx.y1),
      apply(m, bx.x0, bx.y1),
    ];
    const midTop = apply(m, (bx.x0 + bx.x1) / 2, bx.y0);
    const midR = apply(m, bx.x1, (bx.y0 + bx.y1) / 2);
    const midL = apply(m, bx.x0, (bx.y0 + bx.y1) / 2);
    const midB = apply(m, (bx.x0 + bx.x1) / 2, bx.y1);
    // اتجاه «الأعلى» للكائن لوضع مقبض التدوير
    const up = [midTop[0] - (c[0][0] + c[2][0]) / 2, midTop[1] - (c[0][1] + c[2][1]) / 2];
    const ul = Math.hypot(up[0], up[1]) || 1;
    const rot = [midTop[0] + (up[0] / ul) * 28 * px, midTop[1] + (up[1] / ul) * 28 * px];
    const hs = 9 * px;
    const showHandles = tool === 'select' && !selected.locked;
    selection = (
      <g>
        <polygon
          points={c.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={tool === 'letters' ? '#7aa7ff' : ACCENT}
          strokeWidth={1.5 * px}
          strokeDasharray={`${5 * px} ${4 * px}`}
          pointerEvents="none"
        />
        {showHandles && (
          <>
            <line x1={midTop[0]} y1={midTop[1]} x2={rot[0]} y2={rot[1]} stroke={ACCENT} strokeWidth={1.5 * px} />
            <circle
              cx={rot[0]}
              cy={rot[1]}
              r={7 * px}
              fill="#fff"
              stroke={ACCENT}
              strokeWidth={2 * px}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => onPointerDownHandle(e, 'rotate')}
            />
            {c.map((p, i) => (
              <rect
                key={i}
                x={p[0] - hs / 2}
                y={p[1] - hs / 2}
                width={hs}
                height={hs}
                fill="#fff"
                stroke={ACCENT}
                strokeWidth={2 * px}
                style={{ cursor: i % 2 === 0 ? 'nwse-resize' : 'nesw-resize' }}
                onPointerDown={(e) => onPointerDownHandle(e, 'corner')}
              />
            ))}
            {[midL, midR].map((p, i) => (
              <rect
                key={`x${i}`}
                x={p[0] - hs / 2.6}
                y={p[1] - hs / 1.4}
                width={hs / 1.3}
                height={hs * 1.4}
                rx={2 * px}
                fill="#fff"
                stroke={ACCENT}
                strokeWidth={1.5 * px}
                style={{ cursor: 'ew-resize' }}
                onPointerDown={(e) => onPointerDownHandle(e, 'x')}
              />
            ))}
            {[midTop, midB].map((p, i) => (
              <rect
                key={`y${i}`}
                x={p[0] - hs / 1.4}
                y={p[1] - hs / 2.6}
                width={hs * 1.4}
                height={hs / 1.3}
                rx={2 * px}
                fill="#fff"
                stroke={ACCENT}
                strokeWidth={1.5 * px}
                style={{ cursor: 'ns-resize' }}
                onPointerDown={(e) => onPointerDownHandle(e, 'y')}
              />
            ))}
          </>
        )}
      </g>
    );
  }

  // طبقة الحروف (وضع تحريك الحروف)
  let glyphLayer: React.ReactNode = null;
  if (tool === 'letters' && selected?.type === 'text' && selected.visible) {
    const lay = layoutText(selected);
    const gs = lay.glyphs
      .filter((g) => g.copy === 0 && g.box)
      .sort((a, b) => area(b.box!) - area(a.box!));
    const sel = lay.glyphs.find((g) => g.copy === 0 && g.key === glyphKey);
    glyphLayer = (
      <g transform={`matrix(${objMatrix(selected).join(' ')})`}>
        {gs.map((g) => (
          <rect
            key={g.key}
            className="glyph-hit"
            x={g.box!.x0}
            y={g.box!.y0}
            width={Math.max(g.box!.x1 - g.box!.x0, 4)}
            height={Math.max(g.box!.y1 - g.box!.y0, 4)}
            onPointerDown={(e) => onPointerDownGlyph(e, selected, g)}
          />
        ))}
        {sel && (
          <g pointerEvents="none">
            <path d={sel.d} fill="#3b82f6" fillOpacity={0.55} />
            {sel.box && (
              <rect
                x={sel.box.x0}
                y={sel.box.y0}
                width={sel.box.x1 - sel.box.x0}
                height={sel.box.y1 - sel.box.y0}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5 * px / Math.abs(selected.scaleX || 1)}
              />
            )}
          </g>
        )}
      </g>
    );
  }

  const cursor = tool === 'hand' || spaceDown ? (drag.current?.kind === 'pan' ? 'grabbing' : 'grab') : 'default';

  return (
    <div ref={wrapRef} className="stage-wrap relative h-full w-full overflow-hidden" dir="ltr">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={`${pan[0]} ${pan[1]} ${vbW} ${vbH}`}
        style={{ cursor, touchAction: 'none', display: 'block' }}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => {
          if (selected?.type === 'text') window.dispatchEvent(new Event('midad:focus-text'));
        }}
      >
        <defs>
          <clipPath id="doc-clip">
            <rect x={0} y={0} width={doc.width} height={doc.height} />
          </clipPath>
          <filter id="doc-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx={0} dy={6 * px} stdDeviation={14 * px} floodColor="#000" floodOpacity={0.55} />
          </filter>
        </defs>
        <rect x={0} y={0} width={doc.width} height={doc.height} fill="#fff" filter="url(#doc-shadow)" />
        <g clipPath="url(#doc-clip)">
          <BackgroundNode doc={doc} />
          {doc.objects.map((o) => (
            <ObjNode key={o.id} o={o} />
          ))}
        </g>
        {/* مناطق النقر للكائنات */}
        {doc.objects.map((o) => {
            if (!o.visible) return null;
            if (tool === 'letters' && o.id === selectedId && o.type === 'text') return null;
            const b = objBox(o);
            return (
              <rect
                key={`hit-${o.id}`}
                transform={`matrix(${objMatrix(o).join(' ')})`}
                x={b.x0}
                y={b.y0}
                width={b.x1 - b.x0}
                height={b.y1 - b.y0}
                fill="transparent"
                style={{ cursor: o.locked ? 'not-allowed' : tool === 'select' ? 'move' : 'pointer' }}
                onPointerDown={(e) => onPointerDownObj(e, o)}
              />
            );
          })}
        {guides.v && <line x1={doc.width / 2} y1={-1e4} x2={doc.width / 2} y2={1e4} stroke="#ff4fa3" strokeWidth={px} />}
        {guides.h && <line x1={-1e4} y1={doc.height / 2} x2={1e4} y2={doc.height / 2} stroke="#ff4fa3" strokeWidth={px} />}
        {selection}
        {glyphLayer}
      </svg>
    </div>
  );
}

function area(b: Box) {
  return (b.x1 - b.x0) * (b.y1 - b.y0);
}
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
