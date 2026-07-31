/** Progressive enhancement for semantic table/list data. */

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

export function Chart({
  type = "bar",
  title = "",
  labels,
  values,
}: {
  type?: string;
  title?: string;
  labels: string[];
  values: number[];
}) {
  const nums = values.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  const W = 500, H = 280;
  const PAD = { top: 40, right: 20, bottom: 64, left: 52 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...nums, 1);

  const titleEl = title && (
    <text x={W / 2} y={22} textAnchor="middle" fontSize={14} fontWeight={600} fontFamily="system-ui" className="rl-t-strong">
      {title}
    </text>
  );

  if (type === "pie") {
    const total = nums.reduce((a, b) => a + b, 0) || 1;
    const cx = W / 2, cy = PAD.top + CH / 2;
    const r = Math.min(CW, CH) / 2 - 8;
    let angle = -Math.PI / 2;
    const slices = nums.map((v, i) => {
      const sweep = (v / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
      const midA = angle + sweep / 2;
      const el = (
        <g key={i}>
          <path
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2},${y2} Z`}
            fill={COLORS[i % COLORS.length]}
            stroke="var(--surface)"
            strokeWidth={2}
          />
          <text x={cx + r * 0.65 * Math.cos(midA)} y={cy + r * 0.65 * Math.sin(midA)} textAnchor="middle" fill="#fff" fontWeight={700} fontSize={11} fontFamily="system-ui">
            {Math.round((v / total) * 100)}%
          </text>
        </g>
      );
      angle += sweep;
      return el;
    });
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 500, display: "block", margin: "0.5rem 0" }}>
        {titleEl}
        {slices}
        {nums.map((_, i) => (
          <g key={`l${i}`}>
            <rect x={PAD.left + (i % 3) * 140} y={PAD.top + CH + 6 + Math.floor(i / 3) * 18} width={10} height={10} fill={COLORS[i % COLORS.length]} rx={2} />
            <text x={PAD.left + (i % 3) * 140 + 14} y={PAD.top + CH + 14 + Math.floor(i / 3) * 18} fontSize={11} fontFamily="system-ui" className="rl-t-muted">
              {labels[i] ?? ""}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  if (type === "line") {
    const pts = nums.map((v, i) => [PAD.left + (i / Math.max(nums.length - 1, 1)) * CW, PAD.top + CH - (v / maxVal) * CH] as const);
    const areaD = pts.length > 1
      ? `M${pts[0]![0]},${PAD.top + CH} ${pts.map((p) => `L${p[0]},${p[1]}`).join(" ")} L${pts[pts.length - 1]![0]},${PAD.top + CH} Z`
      : "";
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 500, display: "block", margin: "0.5rem 0" }}>
        {titleEl}
        <line x1={PAD.left} y1={PAD.top + CH} x2={PAD.left + CW} y2={PAD.top + CH} className="rl-grid" strokeWidth={1} />
        {pts.length > 1 && (
          <>
            <path d={areaD} fill={COLORS[0] + "28"} stroke="none" />
            <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ")} stroke={COLORS[0]} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={4} style={{ fill: "var(--surface)" }} stroke={COLORS[0]} strokeWidth={2} />
            <text x={x} y={PAD.top + CH + 16} textAnchor="middle" fontSize={10} fontFamily="system-ui" className="rl-t-muted">
              {labels[i] ?? ""}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  // bar
  const gap = CW / Math.max(nums.length, 1);
  const barW = Math.max(8, gap * 0.55);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 500, display: "block", margin: "0.5rem 0" }}>
      {titleEl}
      {[0.25, 0.5, 0.75, 1].map((n) => (
        <line key={n} x1={PAD.left} y1={PAD.top + CH - n * CH} x2={PAD.left + CW} y2={PAD.top + CH - n * CH} className="rl-grid" strokeWidth={1} />
      ))}
      <line x1={PAD.left} y1={PAD.top + CH} x2={PAD.left + CW} y2={PAD.top + CH} className="rl-grid" strokeWidth={1} />
      {nums.map((v, i) => {
        const bh = (v / maxVal) * CH;
        const x = PAD.left + i * gap + gap / 2 - barW / 2;
        const y = PAD.top + CH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={COLORS[i % COLORS.length]} rx={3} />
            <text x={x + barW / 2} y={PAD.top + CH + 16} textAnchor="middle" fontSize={10} fontFamily="system-ui" className="rl-t-muted">
              {labels[i] ?? ""}
            </text>
            {v > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={10} fontFamily="system-ui" className="rl-t-muted">
                {v}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
