// OMAN CHIPS — Motion Design Showreel. Deterministic, time-based canvas renderer.
const W = 1920, H = 1080, FPS = 60, DUR = 15;
const C = {
  red: '#D9241C', redD: '#9C130F', redL: '#F2503A', yel: '#FFC72C', yelD: '#F2A900',
  cream: '#FFF4DC', ink: '#160B08', green: '#0E7A3D', white: '#FFFFFF',
};
const AR = 'Lalezar', AN = 'Anton', SG = '"Space Grotesk"', AB = '"Archivo Black"';

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outBack: (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
};
const spring = (t, f = 2, d = 6) => t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(TAU * f * t);
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ---------- impacts drive camera shake + chromatic aberration ----------
const IMPACTS = [
  { t: 1.70, a: 20 }, { t: 1.95, a: 7 }, { t: 5.20, a: 36 }, { t: 6.32, a: 8 },
  { t: 10.70, a: 18 }, { t: 11.70, a: 24 }, { t: 14.20, a: 6 },
];
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const im of IMPACTS) {
    const k = t - im.t; if (k < 0 || k > 1) continue;
    const a = im.a * Math.exp(-9 * k);
    x += a * Math.sin(k * 71 + im.t * 13); y += a * Math.cos(k * 83 + im.t * 7);
    r += a * 0.0012 * Math.sin(k * 57 + im.t);
  }
  return { x, y, r };
}
function aberration(t) {
  let a = 0;
  for (const im of IMPACTS) { const k = t - im.t; if (k >= 0 && k < .6) a += im.a * 0.55 * Math.exp(-11 * k); }
  return a;
}

// ---------- drawing helpers ----------
function T(c, s, x, y, size, font, fill, o = {}) {
  c.font = `${o.w || 400} ${size}px ${font}`;
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
  c.letterSpacing = (o.ls || 0) + 'px'; c.direction = o.dir || 'ltr';
  if (fill) { c.fillStyle = fill; c.fillText(s, x, y); }
  if (o.stroke) { c.lineWidth = o.lw || 3; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
}
function measure(c, s, size, font, o = {}) {
  c.font = `${o.w || 400} ${size}px ${font}`; c.letterSpacing = (o.ls || 0) + 'px'; c.direction = o.dir || 'ltr';
  return c.measureText(s).width;
}
function layout(c, str, size, font, ls = 0, w = 400) {
  c.font = `${w} ${size}px ${font}`; c.letterSpacing = '0px'; c.direction = 'ltr';
  const arr = []; let x = 0;
  for (const ch of str) { const cw = c.measureText(ch).width; arr.push({ ch, x, w: cw }); x += cw + ls; }
  return { arr, w: x - ls };
}
function longShadow(c, s, x, y, size, font, col, n, o = {}) {
  for (let i = n; i >= 1; i--) T(c, s, x + i * 1.6, y + i * 1.6, size, font, col, o);
}
function chipShape(c, r, seed) {
  const a = seed * 1.37, N = 44;
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const th = i / N * TAU;
    const rr = r * (1 + 0.065 * Math.sin(3 * th + a) + 0.035 * Math.sin(7 * th + a * 2.1) + 0.02 * Math.sin(13 * th + a * .7));
    const px = Math.cos(th) * rr, py = Math.sin(th) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function drawChip(c, x, y, r, rot, tilt, seed, alpha = 1) {
  if (r < 1) return;
  c.save(); c.translate(x, y); c.rotate(rot);
  const ty = Math.cos(tilt); c.scale(1, Math.max(Math.abs(ty), 0.09));
  c.globalAlpha *= alpha;
  chipShape(c, r, seed);
  const g = c.createRadialGradient(-r * .3, -r * .3, r * .05, 0, 0, r * 1.05);
  g.addColorStop(0, ty > 0 ? '#FFE69A' : '#F7C860'); g.addColorStop(.65, '#F4B845'); g.addColorStop(1, '#D98A22');
  c.fillStyle = g; c.fill();
  c.save(); c.clip();
  c.strokeStyle = 'rgba(165,92,18,.33)'; c.lineWidth = r * .055;
  for (let k = -3; k <= 3; k++) {
    const yy = k * r * .3;
    c.beginPath(); c.moveTo(-r * 1.1, yy);
    c.bezierCurveTo(-r * .4, yy - r * .16, r * .3, yy + r * .2, r * 1.1, yy + r * .02); c.stroke();
  }
  const R = rng(seed + 11);
  c.fillStyle = 'rgba(200,132,37,.38)';
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc((R() - .5) * r * 1.2, (R() - .5) * r * 1.2, r * (.1 + R() * .1), 0, TAU); c.fill(); }
  c.fillStyle = '#C3301A';
  for (let i = 0; i < 11; i++) { c.beginPath(); c.arc((R() - .5) * r * 1.4, (R() - .5) * r * 1.4, r * (.03 + R() * .035), 0, TAU); c.fill(); }
  c.restore();
  chipShape(c, r, seed);
  c.lineWidth = r * .045; c.strokeStyle = 'rgba(150,78,10,.55)'; c.stroke();
  c.restore();
}
function bagPath(c, w, h) {
  const hw = w / 2, hh = h / 2, teeth = 18, amp = 9;
  c.beginPath(); c.moveTo(-hw, -hh);
  for (let i = 1; i <= teeth; i++) { const x = -hw + w * i / teeth; c.lineTo(x - w / teeth / 2, -hh - amp); c.lineTo(x, -hh); }
  c.quadraticCurveTo(hw + 46, 0, hw, hh);
  for (let i = 1; i <= teeth; i++) { const x = hw - w * i / teeth; c.lineTo(x + w / teeth / 2, hh + amp); c.lineTo(x, hh); }
  c.quadraticCurveTo(-hw - 46, 0, -hw, -hh); c.closePath();
}
function drawBag(c, x, y, w, h, rotY, rotZ) {
  c.save(); c.translate(x, y); c.rotate(rotZ);
  const cs = Math.cos(rotY), front = cs >= 0;
  c.scale(Math.max(Math.abs(cs), 0.03), 1);
  bagPath(c, w, h); c.save(); c.clip();
  const g = c.createLinearGradient(-w / 2 - 30, 0, w / 2 + 30, 0);
  g.addColorStop(0, C.redD); g.addColorStop(.25, C.red); g.addColorStop(.45, '#EF4632'); g.addColorStop(.72, C.red); g.addColorStop(1, '#7E0E0B');
  c.fillStyle = g; c.fillRect(-w, -h, w * 2, h * 2);
  // seals
  c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-w, -h / 2 - 20, w * 2, 56); c.fillRect(-w, h / 2 - 36, w * 2, 56);
  c.strokeStyle = 'rgba(255,255,255,.13)'; c.lineWidth = 2;
  for (let xx = -w / 2 - 20; xx < w / 2 + 20; xx += 9) {
    c.beginPath(); c.moveTo(xx, -h / 2 - 20); c.lineTo(xx, -h / 2 + 34); c.moveTo(xx, h / 2 - 34); c.lineTo(xx, h / 2 + 20); c.stroke();
  }
  const s = w / 440;
  c.save(); c.scale(s, s);
  if (front) {
    // yellow swoosh band
    c.beginPath(); c.moveTo(-270, 60); c.bezierCurveTo(-90, 10, 90, 120, 270, 50);
    c.lineTo(270, 175); c.bezierCurveTo(90, 250, -90, 140, -270, 190); c.closePath();
    c.fillStyle = C.yel; c.fill();
    c.beginPath(); c.moveTo(-270, 42); c.bezierCurveTo(-90, -8, 90, 102, 270, 32);
    c.strokeStyle = C.cream; c.lineWidth = 6; c.stroke();
    longShadow(c, 'OMAN', 0, -132, 104, AB, '#6E0B08', 6, { align: 'center' });
    T(c, 'OMAN', 0, -132, 104, AB, C.cream, { align: 'center' });
    longShadow(c, 'CHIPS', 0, -32, 104, AB, '#6E0B08', 6, { align: 'center' });
    T(c, 'CHIPS', 0, -32, 104, AB, C.yel, { align: 'center' });
    T(c, 'شيبس عُمان', 0, 22, 44, AR, C.cream, { align: 'center', dir: 'rtl' });
    drawChip(c, -85, 140, 62, -.4, .7, 3); drawChip(c, 70, 150, 70, .5, .6, 5); drawChip(c, -5, 175, 56, .1, .9, 8);
    c.fillStyle = C.ink; c.beginPath(); c.roundRect(-70, 222, 140, 40, 20); c.fill();
    T(c, 'CHILI', 0, 251, 26, SG, C.yel, { align: 'center', w: 700, ls: 6 });
  } else {
    T(c, 'صُنع في عُمان', 0, -20, 46, AR, 'rgba(255,244,220,.55)', { align: 'center', dir: 'rtl' });
    c.fillStyle = 'rgba(255,244,220,.5)';
    for (let i = 0; i < 26; i++) c.fillRect(-90 + i * 7, 60, (i % 3) + 1.5, 70);
  }
  c.restore();
  c.fillStyle = `rgba(30,0,0,${(1 - Math.abs(cs)) * .55})`; c.fillRect(-w, -h, w * 2, h * 2);
  const sx = Math.sin(rotY) * w * .45 - w * .18;
  const sg = c.createLinearGradient(sx - 70, 0, sx + 70, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.26)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg; c.fillRect(-w, -h, w * 2, h * 2);
  c.restore();
  bagPath(c, w, h); c.lineWidth = 3; c.strokeStyle = 'rgba(70,0,0,.6)'; c.stroke();
  c.restore();
}
function sunburst(c, cx, cy, n, R, rot, col) {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < n; i += 2) { c.moveTo(cx, cy); c.arc(cx, cy, R, rot + i * TAU / n, rot + (i + 1) * TAU / n); c.closePath(); }
  c.fill();
}
function star8(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = i / 16 * TAU - Math.PI / 2, rr = i % 2 ? r * .72 : r;
    i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
}
function circleText(c, str, x, y, r, rot, size, col) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.font = `700 ${size}px ${SG}`; c.letterSpacing = '0px'; c.direction = 'ltr';
  c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle';
  const total = [...str].reduce((s, ch) => s + c.measureText(ch).width + 3, 0);
  const k = TAU * r / total;
  let a = 0;
  for (const ch of str) {
    const cw = (c.measureText(ch).width + 3) * k;
    c.save(); c.rotate(a + cw / r / 2); c.translate(0, -r); c.fillText(ch, 0, 0); c.restore();
    a += cw / r;
  }
  c.restore();
}
function maskUp(c, x, y, w, h, p, fn) { // slide content up from under a mask line
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.translate(0, (1 - E.outExpo(p)) * h); fn(); c.restore();
}

// ---------- precomputed layers ----------
let halftone, vignette, grains = [];
function prep() {
  halftone = document.createElement('canvas'); halftone.width = W; halftone.height = H;
  const h = halftone.getContext('2d'); h.fillStyle = '#F5B300';
  for (let y = 0; y < H + 34; y += 30) for (let x = 0; x < W + 34; x += 30) {
    const d = Math.hypot(x - W / 2, y - H / 2) / 1100;
    const r = 1 + 13 * Math.pow(d, 1.6);
    h.beginPath(); h.arc(x + ((y / 30) % 2) * 15, y, Math.min(r, 14), 0, TAU); h.fill();
  }
  vignette = document.createElement('canvas'); vignette.width = W; vignette.height = H;
  const v = vignette.getContext('2d');
  const g = v.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
  v.fillStyle = g; v.fillRect(0, 0, W, H);
  const R = rng(99);
  for (let k = 0; k < 6; k++) {
    const n = document.createElement('canvas'); n.width = 960; n.height = 540;
    const nc = n.getContext('2d'), id = nc.createImageData(960, 540);
    for (let i = 0; i < id.data.length; i += 4) { const v2 = R() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v2; id.data[i + 3] = 255; }
    nc.putImageData(id, 0, 0); grains.push(n);
  }
}

// =====================================================================
// SCENE 0 — boot / intro (0 → 1.5)
// =====================================================================
function S0(c, t) {
  c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
  const g = prog(t, 0, .5);
  c.fillStyle = `rgba(255,244,220,${.09 * g})`;
  for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) c.fillRect(x - 1.5, y - 1.5, 3, 3);
  const cl = E.outExpo(prog(t, .05, .6));
  c.strokeStyle = 'rgba(255,244,220,.22)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(W / 2 - cl * W / 2, H / 2); c.lineTo(W / 2 + cl * W / 2, H / 2);
  c.moveTo(W / 2, H / 2 - cl * H / 2); c.lineTo(W / 2, H / 2 + cl * H / 2); c.stroke();

  const words = [['MOTION', .42, .62], ['DESIGN', .62, .82], ['SHOWREEL', .82, 1.06]];
  words.forEach(([w, a, b], i) => {
    if (t < a || t >= b) return;
    const p = prog(t, a, b), sc = lerp(1.14, 1, E.outExpo(p));
    c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc);
    const draw = (dx) => {
      if (i === 1) T(c, w, dx, 0, 330, AN, null, { align: 'center', base: 'middle', stroke: C.yel, lw: 5, ls: 10 });
      else T(c, w, dx, 0, 330, AN, i ? C.yel : C.cream, { align: 'center', base: 'middle', ls: 10 });
    };
    if (p < .2) { // glitch slice
      const o = (1 - p / .2) * 60;
      c.save(); c.beginPath(); c.rect(-W, -H, W * 2, H - 30); c.clip(); draw(o); c.restore();
      c.save(); c.beginPath(); c.rect(-W, -30, W * 2, H); c.clip(); draw(-o); c.restore();
    } else draw(0);
    c.restore();
  });

  const showDot = t < .42 || t >= 1.06;
  if (showDot) {
    const r = t < .42 ? 16 * spring(t - .08, 2.2, 7) : 16 + 6 * Math.sin(prog(t, 1.06, 1.12) * Math.PI);
    c.fillStyle = C.yel; c.beginPath(); c.arc(W / 2, H / 2, Math.max(r, 0), 0, TAU); c.fill();
  }
  if (t < .42) {
    const rp = E.inOutCubic(prog(t, .1, .4));
    c.strokeStyle = C.yel; c.lineWidth = 3; c.beginPath();
    c.arc(W / 2, H / 2, 70, -Math.PI / 2 + t * 3, -Math.PI / 2 + t * 3 + rp * TAU); c.stroke();
    c.save(); c.setLineDash([4, 12]); c.strokeStyle = `rgba(255,199,44,${.5 * g})`; c.lineWidth = 2;
    c.beginPath(); c.arc(W / 2, H / 2, 112 + t * 20, t * 2, t * 2 + TAU); c.stroke(); c.restore();
  }
  if (t >= 1.06) { // ring burst
    const p = prog(t, 1.06, 1.4);
    c.strokeStyle = `rgba(255,244,220,${1 - p})`; c.lineWidth = 3 * (1 - p) + .5;
    c.beginPath(); c.arc(W / 2, H / 2, 20 + E.outExpo(p) * 260, 0, TAU); c.stroke();
  }
}

// =====================================================================
// SCENE 1 — kinetic type hero (1.5 → 4.1)
// =====================================================================
function S1(c, lt) {
  c.fillStyle = C.red; c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1200);
  rg.addColorStop(0, 'rgba(255,120,60,.28)'); rg.addColorStop(1, 'rgba(70,0,0,.45)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  if (lt < 0) return;
  c.save();
  const z = 1 + .03 * lt; c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
  // marquee outlines
  const ma = clamp(lt / .4) * .2;
  const ms = 'OMAN CHIPS — ';
  const mw = measure(c, ms, 170, AN, { ls: 4 });
  for (let r = 0; r < 6; r++) {
    const dir = r % 2 ? 1 : -1, y = 70 + r * 190;
    let off = ((lt * 260 * dir + r * 333) % mw + mw) % mw;
    for (let x = -mw + off - mw; x < W + mw; x += mw)
      T(c, ms, x, y, 170, AN, null, { base: 'middle', ls: 4, stroke: `rgba(255,244,220,${ma})`, lw: 2 });
  }
  // OMAN slam
  const land = .2;
  if (lt > 0) {
    let y, sx = 1, sy = 1;
    if (lt < land) { const p = lt / land; y = lerp(-760, 0, p * p); sy = 1 + .22 * p; sx = 1 - .08 * p; }
    else { const k = lt - land, s = Math.exp(-7 * k) * Math.cos(TAU * 3 * k); y = 0; sy = 1 - .2 * s; sx = 1 + .13 * s; }
    c.save(); c.translate(160, 500 + y); c.scale(sx, sy);
    longShadow(c, 'OMAN', 0, 0, 440, AN, C.redD, 9);
    T(c, 'OMAN', 0, 0, 440, AN, C.cream);
    c.restore();
  }
  // CHIPS letters fly in from right
  const L = layout(c, 'CHIPS', 440, AN, 0);
  const x0 = 1760 - L.w;
  L.arr.forEach((o, i) => {
    const a = .3 + i * .045, p = E.outExpo(prog(lt, a, a + .55));
    if (lt < a) return;
    c.save(); c.translate(x0 + o.x + (1 - p) * 1100, 905);
    c.transform(1, 0, (1 - p) * -.6, 1, 0, 0);
    longShadow(c, o.ch, 0, 0, 440, AN, C.redD, 9);
    T(c, o.ch, 0, 0, 440, AN, C.yel); c.restore();
  });
  // spinning chip + orbit crumbs
  if (lt > .5) {
    const s = spring(lt - .5, 1.6, 5);
    for (let i = 0; i < 9; i++) {
      const a = lt * 1.6 + i * TAU / 9, rr = 230 * s;
      drawChip(c, 1440 + Math.cos(a) * rr, 300 + Math.sin(a) * rr * .45, 16 * s, a * 2, a, 20 + i);
    }
    drawChip(c, 1440, 300, 155 * s, lt * 1.1, lt * 3.2, 7);
  }
  // arabic reveal
  const ap = E.inOutCubic(prog(lt, .75, 1.25));
  if (ap > 0) {
    const aw = measure(c, 'شيبس عُمان', 112, AR, { dir: 'rtl' });
    c.save(); c.beginPath(); c.rect(160 + aw * (1 - ap), 600, aw * ap + 10, 300); c.clip();
    T(c, 'شيبس عُمان', 160 + (1 - ap) * 80, 860, 112, AR, C.cream, { dir: 'rtl' });
    c.restore();
    c.fillStyle = C.yel; c.fillRect(160, 885, aw * E.outExpo(prog(lt, .95, 1.5)), 8);
    const tp = prog(lt, 1.1, 1.6);
    const tag = 'THE TASTE OF HOME';
    T(c, tag.slice(0, Math.floor(tp * tag.length)), 162, 700, 28, SG, C.cream, { w: 700, ls: 8 });
  }
  c.restore();
}

// =====================================================================
// SCENE 2 — CRUNCH impact simulation (4.0 → 6.6)
// =====================================================================
const SHARDS = (() => {
  const R = rng(5), N = 15, out = []; let a = 0;
  const angs = []; for (let i = 0; i < N; i++) angs.push(i / N * TAU + (R() - .5) * .25);
  for (let i = 0; i < N; i++) {
    const a0 = angs[i], a1 = angs[(i + 1) % N] + (i === N - 1 ? TAU : 0), am = (a0 + a1) / 2;
    out.push({ a0, a1, am, v: 900 + R() * 1100, w: (R() - .5) * 14, jx: (R() - .5) * 20, jy: (R() - .5) * 20, vz: .3 + R() * .9 });
  }
  return out;
})();
const CRUMBS = (() => {
  const R = rng(17), out = [];
  for (let i = 0; i < 70; i++) { const a = R() * TAU; out.push({ a, v: 300 + R() * 1500, r: 4 + R() * 12, w: (R() - .5) * 20, s: 30 + i }); }
  return out;
})();
function S2(c, lt) {
  c.fillStyle = C.yel; c.fillRect(0, 0, W, H);
  const hz = 1 + .04 * Math.max(lt, 0) + (lt > 1.2 ? .08 * Math.exp(-6 * (lt - 1.2)) : 0);
  c.save(); c.translate(W / 2, H / 2); c.scale(hz, hz); c.translate(-W / 2, -H / 2); c.drawImage(halftone, 0, 0); c.restore();
  if (lt < 0) return;
  const k = lt - 1.2, hit = k >= 0;
  // speed lines
  if (hit && k < .7) {
    const R = rng(3), e = E.outExpo(k / .7);
    c.fillStyle = `rgba(22,11,8,${.9 * (1 - k / .7)})`;
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * TAU + R() * .1, r0 = lerp(160, 520, e) + R() * 60, r1 = r0 + lerp(80, 900, e) * (.5 + R() * .5), wd = .012 + R() * .012;
      c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
      c.lineTo(W / 2 + Math.cos(a + wd) * r1, H / 2 + Math.sin(a + wd) * r1);
      c.lineTo(W / 2 + Math.cos(a - wd) * r1, H / 2 + Math.sin(a - wd) * r1); c.fill();
    }
  }
  // CRUNCH letters
  const L = layout(c, 'CRUNCH', 400, AN, 14);
  const x0 = W / 2 - L.w / 2;
  L.arr.forEach((o, i) => {
    const a = .2 + i * .125, p = prog(lt, a, a + .4);
    if (lt < a) return;
    let sc = Math.max(0, E.outBack(p)), rot = (1 - E.outCubic(p)) * (i % 2 ? -.5 : .5), dy = (1 - E.outCubic(p)) * 140;
    if (hit) {
      const d = Math.exp(-5 * k);
      rot += d * .22 * Math.sin(k * 38 + i * 2); dy -= 110 * d * Math.abs(Math.sin(k * 14 + i)); sc *= 1 + .12 * Math.exp(-9 * k);
    }
    c.save(); c.translate(x0 + o.x + o.w / 2, 650 + dy); c.rotate(rot); c.scale(sc, sc);
    longShadow(c, o.ch, -o.w / 2, 0, 400, AN, C.red, 10);
    T(c, o.ch, -o.w / 2, 0, 400, AN, C.ink); c.restore();
  });
  // incoming chip
  if (lt > .7 && !hit) {
    const p = prog(lt, .7, 1.2), e = E.inCubic(p);
    drawChip(c, lerp(-300, W / 2, e), H / 2 - Math.sin(p * Math.PI) * 160, lerp(70, 210, e), lt * 9, .5 + lt * 2, 9);
  }
  // shards + crumbs
  if (hit && k < 1.6) {
    const g = 2200;
    CRUMBS.forEach(cr => {
      const x = W / 2 + Math.cos(cr.a) * cr.v * k, y = H / 2 + Math.sin(cr.a) * cr.v * k + .5 * g * k * k;
      drawChip(c, x, y, cr.r, cr.w * k, cr.w * k * .7, cr.s);
    });
    SHARDS.forEach((s, i) => {
      const x = W / 2 + s.jx + Math.cos(s.am) * s.v * k, y = H / 2 + s.jy + Math.sin(s.am) * s.v * k + .5 * g * k * k;
      const sc = 1 + s.vz * k;
      c.save(); c.translate(x, y); c.rotate(s.w * k); c.scale(sc, sc);
      c.beginPath(); c.moveTo(Math.cos(s.am) * 6, Math.sin(s.am) * 6);
      for (let j = 0; j <= 4; j++) { const a = lerp(s.a0, s.a1, j / 4); c.lineTo(Math.cos(a) * 300, Math.sin(a) * 300); }
      c.closePath(); c.clip();
      drawChip(c, -Math.cos(s.am) * 6, -Math.sin(s.am) * 6, 210, 1.2 * 9, .5 + 1.2 * 2, 9);
      c.restore();
    });
  }
  // KRRSH sticker
  if (hit) {
    const s = spring(k, 2.4, 5);
    c.save(); c.translate(1560, 235); c.rotate(-.2 + .05 * Math.sin(lt * 5)); c.scale(s, s);
    c.beginPath();
    for (let i = 0; i <= 36; i++) { const a = i / 36 * TAU, r = i % 2 ? 150 : 205; i ? c.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * .8) : c.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * .8); }
    c.closePath(); c.fillStyle = C.red; c.fill(); c.lineWidth = 7; c.strokeStyle = C.ink; c.lineJoin = 'round'; c.stroke();
    T(c, 'KRRSH!', 4, 6, 104, AN, C.ink, { align: 'center', base: 'middle', ls: 4 });
    T(c, 'KRRSH!', 0, 0, 104, AN, C.cream, { align: 'center', base: 'middle', ls: 4 });
    c.restore();
  }
  // EVERY. SINGLE. BITE.
  const words = ['EVERY.', 'SINGLE.', 'BITE.'], st = [1.45, 1.7, 1.95];
  const ws = words.map(w => measure(c, w, 74, SG, { w: 700, ls: 2 })), gap = 34;
  let wx = W / 2 - (ws.reduce((a, b) => a + b) + gap * 2) / 2;
  words.forEach((w, i) => {
    const p = prog(lt, st[i], st[i] + .4);
    if (p > 0) maskUp(c, wx - 10, 870, ws[i] + 20, 100, p, () => T(c, w, wx, 950, 74, SG, i === 2 ? C.red : C.ink, { w: 700, ls: 2 }));
    wx += ws[i] + gap;
  });
  // impact flash
  if (hit && k < .12) { c.fillStyle = `rgba(255,255,255,${.85 * (1 - k / .12)})`; c.fillRect(0, 0, W, H); }
}

// =====================================================================
// SCENE 3 — MADE IN OMAN pattern + reveals (6.3 → 9.05)
// =====================================================================
function S3(c, lt) {
  c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
  if (lt < -.05) return;
  const gl = c.createRadialGradient(W / 2, 560, 50, W / 2, 560, 900);
  gl.addColorStop(0, 'rgba(217,36,28,.42)'); gl.addColorStop(1, 'rgba(217,36,28,0)');
  c.fillStyle = gl; c.fillRect(0, 0, W, H);
  // geometric pattern (8-point stars) drawn on
  c.save(); c.translate(W / 2, H / 2); c.rotate(.03 * lt); const z = 1.05 + .03 * lt; c.scale(z, z);
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,199,44,.24)';
  const sp = 170;
  for (let gy = -4; gy <= 4; gy++) for (let gx = -7; gx <= 7; gx++) {
    const x = gx * sp, y = gy * sp, d = Math.hypot(x, y);
    const p = E.outCubic(prog(lt, d / 2600, d / 2600 + .7));
    if (p <= 0) continue;
    const per = 16 * 2 * 68 * Math.sin(Math.PI / 16) * 1.3;
    c.setLineDash([per * p, per]);
    star8(c, x, y, 68); c.stroke();
    c.beginPath(); c.moveTo(x + sp / 2, y - 22 * p); c.lineTo(x + sp / 2 + 22 * p, y); c.lineTo(x + sp / 2, y + 22 * p); c.lineTo(x + sp / 2 - 22 * p, y); c.closePath(); c.stroke();
  }
  c.setLineDash([]); c.restore();
  // PROUDLY
  const pr = 'PROUDLY';
  const pl = layout(c, pr, 34, SG, 18, 700);
  pl.arr.forEach((o, i) => {
    const a = prog(lt, .05 + i * .04, .3 + i * .04);
    c.globalAlpha = a; T(c, o.ch, W / 2 - pl.w / 2 + o.x, 300 - (1 - E.outCubic(a)) * 20, 34, SG, C.yel, { w: 700 }); c.globalAlpha = 1;
  });
  // Arabic headline
  const ap = prog(lt, .15, .75);
  if (ap > 0) maskUp(c, 0, 330, W, 330, ap, () => T(c, 'صُنع في عُمان', W / 2, 590, 250, AR, C.cream, { align: 'center', dir: 'rtl' }));
  // MADE IN OMAN outline → fill
  const op = prog(lt, .5, .7);
  if (op > 0) {
    const mw = measure(c, 'MADE IN OMAN', 130, AN, { ls: 8 });
    c.globalAlpha = op; T(c, 'MADE IN OMAN', W / 2, 760, 130, AN, null, { align: 'center', ls: 8, stroke: C.yel, lw: 2.5 }); c.globalAlpha = 1;
    const fp = E.inOutCubic(prog(lt, .7, 1.2));
    c.save(); c.beginPath(); c.rect(W / 2 - mw / 2 - 10, 600, (mw + 20) * fp, 200); c.clip();
    T(c, 'MADE IN OMAN', W / 2, 760, 130, AN, C.yel, { align: 'center', ls: 8 }); c.restore();
  }
  // tri-band (flag colours)
  const bp = E.outExpo(prog(lt, .9, 1.4));
  if (bp > 0) {
    const bw = 720 * bp, bx = W / 2 - bw / 2;
    [[C.white, 0], [C.red, 1], [C.green, 2]].forEach(([col, i]) => { c.fillStyle = col; c.fillRect(bx + bw / 3 * i, 792, bw / 3 + .5, 9); });
  }
  // stats
  const stats = [
    [p => Math.round(100 * p) + '%', 'OMANI'],
    [p => Math.round(24 * p) + '/7', 'CRAVINGS'],
    [p => p < 1 ? String(Math.floor(p * 999)) : '∞', 'CRUNCH'],
  ];
  stats.forEach(([fn, lab], i) => {
    const a = 1.1 + i * .1, p = prog(lt, a, a + .4), cp = E.outCubic(prog(lt, a, a + .9));
    const x = 560 + i * 400;
    if (p > 0) {
      maskUp(c, x - 200, 850, 400, 100, p, () => T(c, fn(cp), x, 935, 92, AN, C.cream, { align: 'center' }));
      c.globalAlpha = p; T(c, lab, x, 978, 24, SG, 'rgba(255,244,220,.6)', { align: 'center', w: 700, ls: 8 }); c.globalAlpha = 1;
    }
    if (i) { const dp = E.outExpo(prog(lt, 1.1, 1.6)); c.fillStyle = 'rgba(255,199,44,.5)'; c.fillRect(x - 200, 910 - 50 * dp, 2, 100 * dp); }
  });
}

// =====================================================================
// SCENE 4 — icon animation: the legendary combo (8.9 → 11.62)
// =====================================================================
function drawBread(c, d) {
  c.beginPath(); c.arc(0, 0, 125, 0, TAU);
  c.fillStyle = '#EBC07A'; c.globalAlpha = d.fill; c.fill(); c.globalAlpha = 1;
  if (d.fill > 0) {
    const R = rng(4); c.fillStyle = `rgba(190,120,50,${.6 * d.fill})`;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse((R() - .5) * 160, (R() - .5) * 160, 14 + R() * 18, 8 + R() * 10, R() * 3, 0, TAU); c.fill(); }
  }
  c.lineWidth = 7; c.strokeStyle = C.ink;
  c.setLineDash([800 * d.draw, 800]); c.beginPath(); c.arc(0, 0, 125, -Math.PI / 2, TAU - Math.PI / 2); c.stroke();
  c.setLineDash([560 * d.draw, 560]); c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 88, Math.PI / 2, TAU + Math.PI / 2); c.stroke();
  c.setLineDash([]);
}
function drawJar(c, d) {
  c.lineWidth = 7; c.strokeStyle = C.ink; c.lineJoin = 'round';
  c.globalAlpha = d.fill;
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(-85, -70, 170, 175, 26); c.fill();
  c.fillStyle = C.yel; c.beginPath(); c.roundRect(-97, -118, 194, 54, 14); c.fill();
  c.fillStyle = C.red; c.fillRect(-85, -10, 170, 64);
  T(c, 'CHEESE', 0, 33, 30, SG, C.cream, { align: 'center', w: 700, ls: 3 });
  c.globalAlpha = 1;
  c.setLineDash([700 * d.draw, 700]);
  c.beginPath(); c.roundRect(-85, -70, 170, 175, 26); c.stroke();
  c.beginPath(); c.roundRect(-97, -118, 194, 54, 14); c.stroke();
  c.setLineDash([]);
}
function drawSandwich(c, d) {
  c.save(); c.rotate(-.32);
  c.lineWidth = 7; c.strokeStyle = C.ink; c.lineJoin = 'round';
  // chips poking out
  if (d.fill > 0) { drawChip(c, 170, -40, 46 * d.fill, .4, .5, 2); drawChip(c, 190, 30, 40 * d.fill, -.6, .6, 6); drawChip(c, 150, 70, 34 * d.fill, 1, .4, 13); }
  c.globalAlpha = d.fill;
  c.fillStyle = '#E9B46A'; c.beginPath(); c.roundRect(-190, -72, 340, 144, 72); c.fill();
  c.strokeStyle = 'rgba(150,80,20,.55)'; c.lineWidth = 6;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-140 + i * 60, -60); c.lineTo(-170 + i * 60, 60); c.stroke(); }
  c.fillStyle = '#F6E2B8'; c.beginPath(); c.ellipse(150, 0, 42, 72, 0, 0, TAU); c.fill();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 9; c.beginPath(); c.ellipse(150, 0, 24, 46, 0, 0, TAU); c.stroke();
  c.globalAlpha = 1; c.strokeStyle = C.ink; c.lineWidth = 7;
  c.setLineDash([1000 * d.draw, 1000]);
  c.beginPath(); c.roundRect(-190, -72, 340, 144, 72); c.stroke();
  c.beginPath(); c.ellipse(150, 0, 42, 72, 0, 0, TAU); c.stroke();
  c.setLineDash([]);
  c.restore();
}
function S4(c, lt) {
  c.fillStyle = C.cream; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(22,11,8,.07)';
  for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) c.fillRect(x - 1.5, y - 1.5, 3, 3);
  if (lt < 0) return;
  // typewriter title
  const title = 'THE LEGENDARY OMANI COMBO';
  const n = Math.floor(prog(lt, .02, .5) * title.length);
  const tw = measure(c, title, 44, SG, { w: 700, ls: 10 });
  T(c, title.slice(0, n), W / 2 - tw / 2, 205, 44, SG, C.red, { w: 700, ls: 10 });
  const cx = W / 2 - tw / 2 + measure(c, title.slice(0, n), 44, SG, { w: 700, ls: 10 });
  if (Math.floor(lt * 6) % 2 === 0 || n < title.length) { c.fillStyle = C.red; c.fillRect(cx + 4, 168, 22, 44); }
  const items = [
    { x: 330, a: .3, fn: drawBread, lab: 'KHUBZ', ar: 'خبز' },
    { x: 760, a: .8, fn: drawJar, lab: 'CREAM CHEESE', ar: 'جبن' },
    { x: 1185, a: 1.3, fn: null, lab: 'OMAN CHIPS', ar: 'شيبس عُمان' },
    { x: 1610, a: 1.55, fn: drawSandwich, lab: 'THE SANDWICH', ar: 'الساندويش' },
  ];
  const ops = [{ x: 545, a: .55, s: '+' }, { x: 972, a: 1.05, s: '+' }, { x: 1395, a: 1.425, s: '=' }];
  ops.forEach(o => {
    if (lt < o.a) return;
    const s = spring(lt - o.a, 2.2, 6), r = (1 - E.outCubic(prog(lt, o.a, o.a + .4))) * -Math.PI;
    c.save(); c.translate(o.x, 520); c.rotate(r); c.scale(s, s);
    T(c, o.s, 0, 8, 150, AN, C.red, { align: 'center', base: 'middle' }); c.restore();
  });
  items.forEach((it, i) => {
    if (lt < it.a) return;
    const k = lt - it.a, s = spring(k, 2, 5.5), bob = Math.sin(lt * 3.2 + i) * 6 * clamp(k / .5);
    if (i === 3) {
      const rays = E.outExpo(prog(k, 0, .5));
      c.save(); c.globalAlpha = .9; sunburst(c, it.x, 520, 24, 260 * rays, lt * .6, C.yel); c.restore();
    }
    c.save(); c.translate(it.x, 520 + bob); c.scale(s, s);
    const d = { draw: E.inOutCubic(prog(k, 0, .45)), fill: E.outCubic(prog(k, .2, .45)) };
    if (it.fn) it.fn(c, d); else drawBag(c, 0, 0, 200, 280, Math.sin(lt * 2.5) * .35, Math.sin(lt * 1.8) * .06);
    c.restore();
    const lp = prog(k, .1, .5);
    maskUp(c, it.x - 220, 690, 440, 70, lp, () => T(c, it.lab, it.x, 745, 46, AN, C.ink, { align: 'center', ls: 3 }));
    maskUp(c, it.x - 220, 755, 440, 70, prog(k, .18, .58), () => T(c, it.ar, it.x, 810, 42, AR, C.red, { align: 'center', dir: 'rtl' }));
  });
  // ICONIC stamp slam
  const sa = 1.68;
  if (lt > sa) {
    const k = lt - sa, p = prog(k, 0, .12), sc = lerp(2.6, 1, E.inCubic(p)) + (p >= 1 ? .06 * Math.exp(-8 * (k - .12)) * Math.sin((k - .12) * 40) : 0);
    c.save(); c.translate(1700, 330); c.rotate(-.22); c.scale(sc, sc); c.globalAlpha = clamp(p * 3);
    c.lineWidth = 9; c.strokeStyle = C.red; c.beginPath(); c.roundRect(-165, -62, 330, 124, 14); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.roundRect(-150, -48, 300, 96, 8); c.stroke();
    T(c, 'ICONIC', 0, 6, 92, AN, C.red, { align: 'center', base: 'middle', ls: 8 });
    c.restore();
  }
}

// =====================================================================
// SCENE 5 — 3D bag + particle rain + end card (11.35 → 15)
// =====================================================================
const RAIN = (() => {
  const R = rng(42), out = [];
  for (let i = 0; i < 48; i++) {
    const d = .3 + R() * 1.3;
    out.push({ x: R() * W, d, ts: .1 + R() * 2.2, r0: R() * TAU, w: (R() - .5) * 4, t0: R() * 3, w2: 1 + R() * 3, s: 50 + i });
  }
  return out.sort((a, b) => a.d - b.d);
})();
function rainChip(c, ch, lt) {
  const k = lt - ch.ts; if (k < 0) return;
  const y = -150 + (380 + 520 * ch.d) * k + 260 * k * k;
  if (y > H + 200) return;
  const blur = ch.d > 1.3;
  if (blur) c.filter = 'blur(4px)';
  drawChip(c, ch.x + Math.sin(k * 2 + ch.r0) * 40, y, 58 * ch.d, ch.r0 + ch.w * k, ch.t0 + ch.w2 * k, ch.s, ch.d < .7 ? .75 : 1);
  if (blur) c.filter = 'none';
}
function S5(c, lt) {
  c.fillStyle = C.red; c.fillRect(0, 0, W, H);
  const ra = E.outExpo(prog(lt, 0, .7));
  sunburst(c, W / 2, 560, 32, 1900 * ra, lt * .18, 'rgba(255,110,70,.22)');
  const rg = c.createRadialGradient(W / 2, 560, 100, W / 2, 560, 1150);
  rg.addColorStop(0, 'rgba(255,170,90,.25)'); rg.addColorStop(1, 'rgba(60,0,0,.5)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  if (lt < 0) return;
  RAIN.filter(r => r.d <= 1).forEach(r => rainChip(c, r, lt));
  // left type
  [['THE', 90, 360, C.yel, 1.0], ['CRUNCH', 170, 540, C.cream, 1.1], ['OF OMAN', 150, 705, C.cream, 1.2]].forEach(([s, sz, y, col, a]) => {
    const p = prog(lt, a, a + .45);
    if (p > 0) maskUp(c, 120, y - sz, 700, sz + 20, p, () => { longShadow(c, s, 150, y, sz, AN, C.redD, 6); T(c, s, 150, y, sz, AN, col); });
  });
  // right arabic
  const p1 = prog(lt, 1.15, 1.6), p2 = prog(lt, 1.3, 1.75);
  if (p1 > 0) maskUp(c, 1180, 360, 620, 200, p1, () => { longShadow(c, 'شيبس عُمان', 1770, 530, 118, AR, C.redD, 6, { align: 'right', dir: 'rtl' }); T(c, 'شيبس عُمان', 1770, 530, 118, AR, C.yel, { align: 'right', dir: 'rtl' }); });
  if (p2 > 0) maskUp(c, 1180, 560, 620, 120, p2, () => T(c, 'طعم عُمان', 1770, 655, 86, AR, C.cream, { align: 'right', dir: 'rtl' }));
  // badge
  const bs = spring(lt - 1.45, 1.8, 5);
  if (bs > 0) {
    c.save(); c.translate(1640, 860); c.scale(bs, bs);
    c.fillStyle = C.yel; c.beginPath(); c.arc(0, 0, 112, 0, TAU); c.fill();
    circleText(c, 'CRUNCHY • SPICY • ICONIC • ', 0, 0, 86, lt * .9, 22, C.ink);
    drawChip(c, 0, 0, 44, lt, .4, 3);
    c.restore();
  }
  // the bag
  const bt = lt - .16;
  if (bt > 0) {
    const y = 565 + 980 * (1 - spring(bt, 1.3, 5.5));
    const rotY = -TAU * (1 - E.outCubic(prog(bt, 0, .95))) + .2 * Math.sin(lt * 2.1) * prog(bt, .8, 1.4);
    const rotZ = .45 * (1 - spring(bt, 1.1, 4.5)) + .035 * Math.sin(lt * 1.7);
    c.save(); c.fillStyle = 'rgba(40,0,0,.3)'; c.beginPath(); c.ellipse(W / 2, 905, 220 * clamp(1 - (y - 565) / 900), 26, 0, 0, TAU); c.fill(); c.restore();
    drawBag(c, W / 2, y + Math.sin(lt * 2.4) * 8 * prog(bt, .6, 1), 430, 600, rotY, rotZ);
  }
  RAIN.filter(r => r.d > 1).forEach(r => rainChip(c, r, lt));
}
function endCard(c, t) {
  const lt = t - 11.35, p = E.inOutExpo(prog(t, 13.95, 14.4));
  c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
  const k = lerp(1, .6, p), cy = lerp(540, 425, p);
  c.save(); c.translate(W / 2, cy); c.scale(k, k); c.translate(-W / 2, -H / 2);
  c.beginPath(); c.roundRect(0, 0, W, H, 36 * p); c.clip();
  S5(c, lt); c.restore();
  if (p > 0) {
    c.strokeStyle = `rgba(255,244,220,${.5 * p})`; c.lineWidth = 2;
    c.beginPath(); c.roundRect(W / 2 - W * k / 2 - 12, cy - H * k / 2 - 12, W * k + 24, H * k + 24, 30); c.stroke();
  }
  const a1 = prog(t, 14.25, 14.65), a2 = prog(t, 14.35, 14.75);
  if (a1 > 0) maskUp(c, 0, 790, W, 90, a1, () => T(c, 'MOTION DESIGN SHOWREEL — 2026', W / 2, 860, 66, AN, C.cream, { align: 'center', ls: 6 }));
  if (a2 > 0) maskUp(c, 0, 880, W, 60, a2, () => T(c, 'KINETIC TYPE  ·  SIMULATION  ·  PATTERN  ·  ICONOGRAPHY  ·  3D  ·  PARTICLES', W / 2, 920, 24, SG, 'rgba(255,244,220,.6)', { align: 'center', w: 700, ls: 5 }));
  const a3 = prog(t, 14.45, 14.7);
  if (a3 > 0) { c.globalAlpha = a3; T(c, 'designed & animated by Claude  —  100% code, 0 keyframes', W / 2, 975, 22, SG, C.yel, { align: 'center', w: 500, ls: 2 }); c.globalAlpha = 1; }
}

// ---------- transitions ----------
function rotPts(pts, ang, cx, cy) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return pts.map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]);
}
function barsPath(c, t, t0) {
  const N = 7, span = 2900, bw = span / N, ang = -.38;
  c.beginPath();
  for (let i = 0; i < N; i++) {
    const p = E.inOutCubic(prog(t, t0 + i * .03, t0 + i * .03 + .24));
    if (p <= 0) continue;
    const x0 = -span / 2 + i * bw, L = 3000 * p;
    const y0 = i % 2 ? 1500 - L : -1500;
    const q = rotPts([[x0, y0], [x0 + bw + 2, y0], [x0 + bw + 2, y0 + L], [x0, y0 + L]], ang, W / 2, H / 2);
    c.moveTo(...q[0]); q.slice(1).forEach(pt => c.lineTo(...pt)); c.closePath();
  }
}
function drawScene(c, t) {
  c.save();
  const sh = shake(t);
  c.translate(W / 2 + sh.x, H / 2 + sh.y); c.rotate(sh.r); c.translate(-W / 2, -H / 2);
  c.fillStyle = '#000'; c.fillRect(-100, -100, W + 200, H + 200);
  if (t < 1.5) {
    S0(c, t);
    const r1 = E.inExpo(prog(t, 1.1, 1.42)) * 1250, r2 = E.inExpo(prog(t, 1.17, 1.5)) * 1250;
    if (r1 > 0) { c.fillStyle = C.yel; c.beginPath(); c.arc(W / 2, H / 2, r1 + 20, 0, TAU); c.fill(); }
    if (r2 > 0) { c.save(); c.beginPath(); c.arc(W / 2, H / 2, r2, 0, TAU); c.clip(); S1(c, t - 1.5); c.restore(); }
  } else if (t < 4.1) {
    S1(c, t - 1.5);
    if (t >= 3.65) {
      barsPath(c, t, 3.65); c.fillStyle = C.cream; c.fill();
      c.save(); barsPath(c, t, 3.72); c.clip(); S2(c, t - 4.0); c.restore();
    }
  } else if (t < 6.3) {
    S2(c, t - 4.0);
  } else if (t < 6.65) {
    S3(c, t - 6.3);
    const p = E.inExpo(prog(t, 6.3, 6.62)), d = p * 600;
    [[-1, 0], [1, H / 2]].forEach(([dir, y0]) => {
      c.save(); c.translate(0, dir * d); c.rotate(dir * p * .04);
      c.beginPath(); c.rect(-200, y0, W + 400, H / 2); c.clip(); S2(c, t - 4.0); c.restore();
    });
    c.fillStyle = `rgba(255,244,220,${1 - p})`; c.fillRect(0, H / 2 - 3, W, 6);
  } else if (t < 8.75) {
    S3(c, t - 6.3);
  } else if (t < 9.08) {
    S3(c, t - 6.3);
    const p = E.inCubic(prog(t, 8.75, 9.05)), p2 = E.inCubic(prog(t, 8.71, 9.0));
    const sq = (s, rot) => { c.beginPath(); c.save(); c.translate(W / 2, H / 2); c.rotate(rot); c.rect(-s / 2, -s / 2, s, s); c.restore(); };
    sq(p2 * 2500, Math.PI / 4 + p2 * Math.PI / 2); c.fillStyle = C.yel; c.fill();
    c.save(); sq(p * 2500, Math.PI / 4 + p * Math.PI / 2); c.clip(); S4(c, t - 8.9); c.restore();
  } else if (t < 11.3) {
    S4(c, t - 8.9);
  } else if (t < 11.64) {
    S4(c, t - 8.9);
    const p = E.inExpo(prog(t, 11.3, 11.62)), p2 = E.inExpo(prog(t, 11.26, 11.58));
    const ox = lerp(1610, W / 2, p), oy = lerp(520, H / 2, p);
    c.save(); c.translate(ox, oy); c.rotate(p2 * 2); chipShape(c, p2 * 2300, 9); c.restore(); c.fillStyle = C.yel; c.fill();
    c.save(); c.save(); c.translate(ox, oy); c.rotate(p * 2); chipShape(c, p * 2200, 9); c.restore(); c.clip(); S5(c, t - 11.35); c.restore();
  } else if (t < 13.95) {
    S5(c, t - 11.35);
  } else {
    endCard(c, t);
  }
  c.restore();
}

// ---------- overlay UI ----------
const LABELS = [[0, '00 — INTRO'], [1.5, '01 — KINETIC TYPE'], [4.0, '02 — IMPACT / SIMULATION'], [6.4, '03 — PATTERN / REVEALS'], [9.0, '04 — ICON ANIMATION'], [11.5, '05 — 3D / PARTICLES']];
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*';
function scramble(s, p, seed) {
  const R = rng(seed); let o = '';
  for (let i = 0; i < s.length; i++) o += (s[i] === ' ' || p > i / s.length) ? s[i] : GLYPHS[Math.floor(R() * GLYPHS.length)];
  return o;
}
function overlay(c, T0, f) {
  const a = 1 - E.inOutCubic(prog(T0, 13.9, 14.3));
  if (a > 0) {
    c.save(); c.globalAlpha = a * .9; c.globalCompositeOperation = 'difference';
    c.strokeStyle = '#fff'; c.lineWidth = 2; const m = 44, l = 34;
    c.beginPath();
    c.moveTo(m, m + l); c.lineTo(m, m); c.lineTo(m + l, m);
    c.moveTo(W - m - l, m); c.lineTo(W - m, m); c.lineTo(W - m, m + l);
    c.moveTo(m, H - m - l); c.lineTo(m, H - m); c.lineTo(m + l, H - m);
    c.moveTo(W - m - l, H - m); c.lineTo(W - m, H - m); c.lineTo(W - m, H - m - l);
    c.stroke();
    T(c, 'SHOWREEL ’26  /  OMAN CHIPS', 84, 86, 20, SG, '#fff', { w: 700, ls: 4 });
    const fr = f % FPS, sec = Math.floor(f / FPS);
    T(c, `00:00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`, W - 84, 86, 20, SG, '#fff', { w: 700, ls: 4, align: 'right' });
    let li = 0; LABELS.forEach((L, i) => { if (T0 >= L[0]) li = i; });
    const sp = prog(T0, LABELS[li][0], LABELS[li][0] + .35);
    T(c, scramble(LABELS[li][1], sp, f), 84, H - 74, 20, SG, '#fff', { w: 700, ls: 4 });
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(W - 84 - 260, H - 82, 260, 3);
    c.fillStyle = '#fff'; c.fillRect(W - 84 - 260, H - 82, 260 * T0 / DUR, 3);
    c.restore();
    if (Math.floor(T0 * 2) % 2 === 0) { c.globalAlpha = a; c.fillStyle = '#FF3B30'; c.beginPath(); c.arc(W - 84 - 230, 79, 6, 0, TAU); c.fill(); c.globalAlpha = 1; }
  }
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .12; c.drawImage(grains[f % grains.length], 0, 0, W, H); c.restore();
  c.drawImage(vignette, 0, 0);
  const fo = prog(T0, 14.72, 15);
  if (fo > 0) { c.fillStyle = `rgba(0,0,0,${E.inCubic(fo)})`; c.fillRect(0, 0, W, H); }
}

// ---------- frame compositor (motion blur + aberration) ----------
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const mk = () => { const k = document.createElement('canvas'); k.width = W; k.height = H; return k; };
const buf = mk(), bctx = buf.getContext('2d');
const chan = [mk(), mk(), mk()];
function applyAberration(amt) {
  const cols = ['#f00', '#0f0', '#00f'];
  chan.forEach((k, i) => {
    const x = k.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.drawImage(cv, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = cols[i]; x.fillRect(0, 0, W, H);
  });
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  [2, 1, 0].forEach((i) => {
    const s = 1 + (i * amt) / 960;
    ctx.drawImage(chan[i], W / 2 - W * s / 2, H / 2 - H * s / 2, W * s, H * s);
  });
  ctx.globalCompositeOperation = 'source-over';
}
function composeFrame(f, samples = 4) {
  const T0 = f / FPS, shutter = 1 / 120;
  for (let i = 0; i < samples; i++) {
    const t = samples > 1 ? T0 - shutter / 2 + shutter * (i + .5) / samples : T0;
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.filter = 'none';
    drawScene(bctx, Math.max(0, t));
    ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(buf, 0, 0);
  }
  ctx.globalAlpha = 1;
  const ab = aberration(T0);
  if (ab > .6) applyAberration(ab);
  overlay(ctx, T0, f);
}
window.IMPACTS = IMPACTS;
window.renderFrame = (f, s) => { composeFrame(f, s); return cv.toDataURL('image/jpeg', .94); };
window.ready = (async () => {
  await Promise.all([
    document.fonts.load(`400 100px ${AN}`, 'OMAN'), document.fonts.load(`400 100px ${AB}`, 'OMAN'),
    document.fonts.load(`700 100px ${SG}`, 'ABC'), document.fonts.load(`500 100px ${SG}`, 'abc'),
    document.fonts.load(`400 100px ${AR}`, 'شيبس عُمان صنع في طعم خبز جبن الساندويش'),
  ]);
  prep(); return true;
})();
