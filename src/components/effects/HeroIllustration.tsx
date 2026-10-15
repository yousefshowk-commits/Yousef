/** Decorative SVG: podium, trophy and floating stars. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden>
      <defs>
        <linearGradient id="hi-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="hi-pod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="hi-pod2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="hi-pod3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#99f6e4" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="170" rx="100" ry="8" fill="#000" opacity=".08" />
      <rect x="40" y="120" width="52" height="50" rx="8" fill="url(#hi-pod2)" />
      <rect x="94" y="96" width="52" height="74" rx="8" fill="url(#hi-pod)" />
      <rect x="148" y="134" width="52" height="36" rx="8" fill="url(#hi-pod3)" />
      <text x="66" y="152" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">2</text>
      <text x="120" y="140" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">1</text>
      <text x="174" y="159" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">3</text>
      <g className="animate-float" style={{ transformOrigin: '120px 60px' }}>
        <path d="M98 30h44v18a22 22 0 0 1-44 0z" fill="url(#hi-gold)" />
        <path d="M98 34h-10a10 10 0 0 0 10 16M142 34h10a10 10 0 0 1-10 16" stroke="#f59e0b" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="114" y="68" width="12" height="12" fill="#f59e0b" />
        <rect x="104" y="80" width="32" height="10" rx="3" fill="#b45309" />
        <path d="M120 38l3.5 7 7.5 1-5.5 5 1.5 7.5-7-3.8-7 3.8 1.5-7.5-5.5-5 7.5-1z" fill="#fff" opacity=".9" />
      </g>
      <g fill="#facc15">
        <path className="animate-twinkle" style={{ transformOrigin: '40px 40px' }} d="M40 28l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path className="animate-twinkle" style={{ transformOrigin: '200px 50px', animationDelay: '.6s' }} d="M200 40l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" />
        <path className="animate-twinkle" style={{ transformOrigin: '176px 16px', animationDelay: '1.1s' }} d="M176 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        <path className="animate-twinkle" style={{ transformOrigin: '64px 88px', animationDelay: '.3s' }} d="M64 82l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
      </g>
    </svg>
  );
}
