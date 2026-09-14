/** Cubo isométrico wireframe con puntos de datos (decorativo, estilo referencia). */
export function IsoCube({ className }: { className?: string }) {
  const dots = [
    [90, 60], [130, 44], [170, 60], [90, 100], [130, 84], [170, 100],
    [130, 124], [110, 150], [150, 150], [70, 84], [190, 84],
  ];
  return (
    <svg viewBox="0 0 260 240" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cubeFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E5EFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0A1A3F" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="cubeFace2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4FB2F0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0A1A3F" stopOpacity="0.04" />
        </linearGradient>
        <filter id="cubeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#cubeGlow)" stroke="#4FB2F0" strokeWidth="1.4" strokeLinejoin="round">
        {/* cara superior */}
        <path d="M130 40 L200 80 L130 120 L60 80 Z" fill="url(#cubeFace)" />
        {/* cara izquierda */}
        <path d="M60 80 L130 120 L130 200 L60 160 Z" fill="url(#cubeFace2)" />
        {/* cara derecha */}
        <path d="M200 80 L130 120 L130 200 L200 160 Z" fill="url(#cubeFace)" />
      </g>

      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.6} fill="#7FD0FF" opacity={0.9} />
      ))}
    </svg>
  );
}
