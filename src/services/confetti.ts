import confetti from 'canvas-confetti';

let enabled = true;
export const setAnimationsEnabled = (v: boolean) => {
  enabled = v;
};

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#facc15'];

export function burst(x = 0.5, y = 0.6, count = 80) {
  if (!enabled) return;
  void confetti({ particleCount: count, spread: 75, startVelocity: 38, origin: { x, y }, colors: COLORS, zIndex: 9999, disableForReducedMotion: true });
}

export function starBurst(x = 0.5, y = 0.5) {
  if (!enabled) return;
  void confetti({
    particleCount: 30, spread: 360, startVelocity: 22, gravity: 0.6, ticks: 90, scalar: 1.2,
    shapes: ['star'], colors: ['#facc15', '#fbbf24', '#fde68a'], origin: { x, y }, zIndex: 9999, disableForReducedMotion: true,
  });
}

/** Big multi-second celebration from both sides. */
export function bigCelebration(durationMs = 2500) {
  if (!enabled) return;
  const end = Date.now() + durationMs;
  const frame = () => {
    void confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS, zIndex: 9999 });
    void confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS, zIndex: 9999 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  burst(0.5, 0.4, 150);
}
