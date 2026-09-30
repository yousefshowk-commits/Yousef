import { useMemo } from 'react';

/** Decorative rising stars/particles for celebration screens. */
export function Particles({ count = 40, symbols = ['⭐', '✨', '🌟', '💫', '🎉', '💎'] }: { count?: number; symbols?: string[] }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 3.5 + Math.random() * 4,
        size: 14 + Math.random() * 26,
        symbol: symbols[i % symbols.length],
      })),
    [count, symbols],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((p) => (
        <span
          key={p.id}
          className="animate-rise absolute bottom-[-40px]"
          style={{ left: `${p.left}%`, fontSize: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}

export function Twinkles({ count = 24 }: { count?: number }) {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ id: i, top: Math.random() * 100, left: Math.random() * 100, delay: Math.random() * 2, size: 6 + Math.random() * 10 })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {items.map((p) => (
        <span
          key={p.id}
          className="animate-twinkle absolute rounded-full bg-white"
          style={{ top: `${p.top}%`, left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, boxShadow: '0 0 12px 4px rgba(255,255,255,.6)' }}
        />
      ))}
    </div>
  );
}
