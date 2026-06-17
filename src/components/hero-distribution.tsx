/**
 * The home signature: the product's defining artifact — the market's implied
 * density and the analyst's view on one axis, divergence shaded as edge.
 * Pure server-rendered SVG (decorative, not interactive). Two normal curves
 * with a deliberate bullish, tighter "view" so the edge reads at a glance.
 */

const W = 1000;
const H = 340;
const PAD = { l: 16, r: 16, t: 20, b: 28 };
const N = 181;
const XMIN = -3.8;
const XMAX = 3.8;

function pdf(x: number, mu: number, sd: number): number {
  return Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}

export function HeroDistribution() {
  const baseline = H - PAD.b;
  const top = PAD.t;
  const px = (x: number) => PAD.l + ((x - XMIN) / (XMAX - XMIN)) * (W - PAD.l - PAD.r);

  const xs = Array.from({ length: N }, (_, i) => XMIN + ((XMAX - XMIN) * i) / (N - 1));
  const market = xs.map((x) => pdf(x, 0, 1));
  const view = xs.map((x) => pdf(x, 0.55, 0.82));
  const maxD = Math.max(...market, ...view);
  const py = (d: number) => baseline - (d / maxD) * (baseline - top) * 0.94;

  const line = (arr: number[]) => xs.map((x, i) => `${px(x).toFixed(1)},${py(arr[i]).toFixed(1)}`).join(" ");

  // Per-segment divergence fills, colored by sign of (view − market).
  const segments = [];
  for (let i = 0; i < N - 1; i++) {
    const up = (view[i] + view[i + 1]) / 2 >= (market[i] + market[i + 1]) / 2;
    segments.push({
      d: `M ${px(xs[i])} ${py(market[i])} L ${px(xs[i + 1])} ${py(market[i + 1])} L ${px(xs[i + 1])} ${py(view[i + 1])} L ${px(xs[i])} ${py(view[i])} Z`,
      up,
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Implied vs subjective distribution">
      <defs>
        <linearGradient id="hero-market" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--info)" stopOpacity={0.14} />
          <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* baseline */}
      <line x1={PAD.l} y1={baseline} x2={W - PAD.r} y2={baseline} stroke="var(--line)" strokeWidth={1} />

      {/* market area */}
      <polygon points={`${px(XMIN)},${baseline} ${line(market)} ${px(XMAX)},${baseline}`} fill="url(#hero-market)" />

      {/* divergence shading */}
      {segments.map((s, i) => (
        <path key={i} d={s.d} fill={s.up ? "var(--up)" : "var(--down)"} opacity={s.up ? 0.26 : 0.22} />
      ))}

      {/* curves */}
      <polyline points={line(market)} fill="none" stroke="var(--info)" strokeWidth={2} />
      <polyline points={line(view)} fill="none" stroke="var(--accent)" strokeWidth={2} />

      {/* forward marker */}
      <line x1={px(0)} y1={top} x2={px(0)} y2={baseline} stroke="var(--info)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />

      {/* labels */}
      <text x={px(-2.1)} y={py(pdf(-1.4, 0, 1)) - 8} className="mono" fontSize={13} fill="var(--info)">
        market-implied (Q)
      </text>
      <text x={px(0.9)} y={py(pdf(0.55, 0.55, 0.82)) - 8} className="mono" fontSize={13} fill="var(--accent)">
        your view
      </text>
      <text x={px(1.75)} y={baseline - 26} className="mono" fontSize={12} fill="var(--up)">
        edge ▸
      </text>
    </svg>
  );
}
