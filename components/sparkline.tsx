export function Sparkline({
  points,
  width = 280,
  height = 60,
  color = "var(--color-blue-glow)"
}: {
  points: Array<{ x: number | string; y: number | null }>;
  width?: number;
  height?: number;
  color?: string;
}) {
  const valid = points
    .map((p, i) => ({ idx: i, y: p.y }))
    .filter((p): p is { idx: number; y: number } => p.y !== null && Number.isFinite(p.y));

  if (valid.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-[var(--color-subtle)]"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const min = Math.min(...valid.map((p) => p.y));
  const max = Math.max(...valid.map((p) => p.y));
  const range = max - min || 1;
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const xStep = valid.length > 1 ? innerW / (valid.length - 1) : 0;

  const coords = valid.map((p, i) => ({
    cx: padX + i * xStep,
    cy: padY + innerH - ((p.y - min) / range) * innerH
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(" ");
  const fillPath = `${path} L${coords[coords.length - 1].cx.toFixed(1)},${(padY + innerH).toFixed(1)} L${coords[0].cx.toFixed(1)},${(padY + innerH).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="trend">
      <defs>
        <linearGradient id="spark-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#spark-fade)" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={2} fill={color} />
      ))}
    </svg>
  );
}
