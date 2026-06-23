"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveBasis } from "d3-shape";
import { useChartWidth } from "./chart-utils";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { DistributionPoint } from "@/lib/types";

export interface DistSeries {
  key: string;
  label: string;
  color: string;
  points: DistributionPoint[];
}

function priceAtCdf(points: DistributionPoint[], target: number): number {
  for (const p of points) if (p.cdf >= target) return p.price;
  return points[points.length - 1].price;
}

function nearest(points: DistributionPoint[], price: number): DistributionPoint {
  let best = points[0];
  for (const p of points) if (Math.abs(p.price - price) < Math.abs(best.price - price)) best = p;
  return best;
}

/**
 * Overlays N probability densities on one axis. Reuses the same d3 scaffolding
 * as the hero DistributionChart, but for an arbitrary set of model series. The
 * hero chart stays untouched; this one is for the Arena's model comparison.
 */
export function MultiDistributionChart({
  series,
  forward,
}: {
  series: DistSeries[];
  forward: number;
}) {
  const [ref, width] = useChartWidth();
  const [hoverX, setHoverX] = React.useState<number | null>(null);
  const height = Math.round(Math.min(420, Math.max(240, width * 0.42)));

  const padL = 8;
  const padR = 12;
  const padT = 16;
  const padB = 26;

  const usable = series.filter((s) => s.points.length > 1);

  if (usable.length === 0) {
    return <div ref={ref} className="w-full" style={{ height }} />;
  }

  // Domain across the meaningful mass of every series.
  const xMin = Math.min(...usable.map((s) => priceAtCdf(s.points, 0.004)));
  const xMax = Math.max(...usable.map((s) => priceAtCdf(s.points, 0.996)));
  const maxDensity = Math.max(
    ...usable.flatMap((s) =>
      s.points.filter((p) => p.price >= xMin && p.price <= xMax).map((p) => p.density),
    ),
  );

  const x = scaleLinear().domain([xMin, xMax]).range([padL, width - padR]);
  const y = scaleLinear().domain([0, maxDensity * 1.12]).range([height - padB, padT]);

  const lineGen = d3line<DistributionPoint>()
    .x((d) => x(d.price))
    .y((d) => y(d.density))
    .curve(curveBasis);

  const hoverPrice = hoverX != null ? x.invert(hoverX) : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverX(e.clientX - rect.left);
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        {x.ticks(6).map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={padT}
              y2={height - padB}
              stroke="var(--line)"
              strokeWidth={1}
              opacity={0.5}
            />
            <text
              x={x(t)}
              y={height - padB + 14}
              textAnchor="middle"
              className="mono"
              fontSize={11}
              fill="var(--faint)"
            >
              {fmtMoney(t, 0)}
            </text>
          </g>
        ))}

        {/* market forward marker */}
        <line
          x1={x(forward)}
          x2={x(forward)}
          y1={padT}
          y2={height - padB}
          stroke="var(--info)"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        <text x={x(forward) + 3} y={padT + 8} className="mono" fontSize={10} fill="var(--info)">
          F
        </text>

        {usable.map((s) => {
          const pts = s.points.filter((p) => p.price >= xMin && p.price <= xMax);
          return (
            <path
              key={s.key}
              d={lineGen(pts) ?? ""}
              fill="none"
              stroke={s.color}
              strokeWidth={s.key === "market" ? 2 : 1.6}
              opacity={0.95}
            />
          );
        })}

        {hoverPrice != null && (
          <line
            x1={x(hoverPrice)}
            x2={x(hoverPrice)}
            y1={padT}
            y2={height - padB}
            stroke="var(--fg)"
            strokeWidth={1}
            opacity={0.35}
          />
        )}
      </svg>

      {hoverPrice != null && (
        <div
          className="pointer-events-none absolute top-1 space-y-0.5 rounded-sm border border-line2 bg-panel2 px-2 py-1.5 text-[12px] shadow-xl"
          style={{ left: Math.min(Math.max(x(hoverPrice) - 76, 0), width - 156) }}
        >
          <div className="mono mb-1 text-fg">{fmtMoney(hoverPrice)}</div>
          {usable.map((s) => (
            <div key={s.key} className="mono flex items-center justify-between gap-3" style={{ color: s.color }}>
              <span className="flex items-center gap-1">
                <i className="inline-block h-1.5 w-2.5" style={{ background: s.color }} /> {s.label}
              </span>
              <span>P(&gt;) {fmtPct(1 - nearest(s.points, hoverPrice).cdf, 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
