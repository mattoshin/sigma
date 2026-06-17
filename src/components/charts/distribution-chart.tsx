"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area, curveBasis } from "d3-shape";
import { useChartWidth, nearestByPrice } from "./chart-utils";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { DistributionPoint } from "@/lib/types";

interface Props {
  rnd: DistributionPoint[];
  subjective?: DistributionPoint[];
  forward: number;
  spot: number;
  scenarios?: { price: number; label: string }[];
  band?: { lower: number; upper: number };
}

interface MergedPt {
  price: number;
  r: number;
  s: number;
  rCdf: number;
  sCdf: number;
}

function priceAtCdf(points: DistributionPoint[], target: number): number {
  for (const p of points) if (p.cdf >= target) return p.price;
  return points[points.length - 1].price;
}

export function DistributionChart({
  rnd,
  subjective,
  forward,
  spot,
  scenarios = [],
  band,
}: Props) {
  const [ref, width] = useChartWidth();
  const [hoverX, setHoverX] = React.useState<number | null>(null);
  // Height tracks width so the chart fills fluidly yet never flattens on wide screens.
  const height = Math.round(Math.min(470, Math.max(260, width * 0.34)));

  const padL = 8;
  const padR = 12;
  const padT = 16;
  const padB = 26;

  // Domain: clip to the meaningful mass (0.4%..99.6%) of either distribution.
  const xMin = Math.min(
    priceAtCdf(rnd, 0.004),
    subjective ? priceAtCdf(subjective, 0.004) : Infinity,
  );
  const xMax = Math.max(
    priceAtCdf(rnd, 0.996),
    subjective ? priceAtCdf(subjective, 0.996) : -Infinity,
  );

  const merged: MergedPt[] = rnd
    .map((p, i) => ({
      price: p.price,
      r: p.density,
      s: subjective?.[i]?.density ?? 0,
      rCdf: p.cdf,
      sCdf: subjective?.[i]?.cdf ?? 0,
    }))
    .filter((p) => p.price >= xMin && p.price <= xMax);

  const maxDensity = Math.max(...merged.map((d) => Math.max(d.r, d.s)));

  const x = scaleLinear().domain([xMin, xMax]).range([padL, width - padR]);
  const y = scaleLinear().domain([0, maxDensity * 1.12]).range([height - padB, padT]);

  const rndLine = d3line<MergedPt>().x((d) => x(d.price)).y((d) => y(d.r)).curve(curveBasis);
  const subjLine = d3line<MergedPt>().x((d) => x(d.price)).y((d) => y(d.s)).curve(curveBasis);

  const rndArea = d3area<MergedPt>()
    .x((d) => x(d.price))
    .y0(y(0))
    .y1((d) => y(d.r))
    .curve(curveBasis);

  const excessArea = d3area<MergedPt>()
    .x((d) => x(d.price))
    .y0((d) => y(d.r))
    .y1((d) => y(d.s))
    .defined((d) => subjective != null && d.s >= d.r)
    .curve(curveBasis);

  const deficitArea = d3area<MergedPt>()
    .x((d) => x(d.price))
    .y0((d) => y(d.r))
    .y1((d) => y(d.s))
    .defined((d) => subjective != null && d.s < d.r)
    .curve(curveBasis);

  const hover = hoverX != null ? nearestByPrice(merged, x.invert(hoverX)) : null;

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
        {/* expected-move band */}
        {band && (
          <rect
            x={x(Math.max(band.lower, xMin))}
            y={padT}
            width={Math.max(0, x(Math.min(band.upper, xMax)) - x(Math.max(band.lower, xMin)))}
            height={height - padB - padT}
            fill="var(--accent)"
            opacity={0.05}
          />
        )}

        {/* x grid + ticks */}
        {x.ticks(6).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={padT} y2={height - padB} stroke="var(--line)" strokeWidth={1} opacity={0.5} />
            <text x={x(t)} y={height - padB + 14} textAnchor="middle" className="mono" fontSize={11} fill="var(--faint)">
              {fmtMoney(t, 0)}
            </text>
          </g>
        ))}

        {/* risk-neutral baseline area + curve */}
        <path d={rndArea(merged) ?? ""} fill="var(--info)" opacity={0.08} />
        {/* divergence shading */}
        {subjective && <path d={excessArea(merged) ?? ""} fill="var(--up)" opacity={0.28} />}
        {subjective && <path d={deficitArea(merged) ?? ""} fill="var(--down)" opacity={0.28} />}

        {/* curves */}
        <path d={rndLine(merged) ?? ""} fill="none" stroke="var(--info)" strokeWidth={1.75} />
        {subjective && <path d={subjLine(merged) ?? ""} fill="none" stroke="var(--warn)" strokeWidth={1.75} />}

        {/* forward + spot markers */}
        <VLine xPos={x(forward)} top={padT} bottom={height - padB} color="var(--info)" dash="4 3" label="F" />
        {Math.abs(spot - forward) / forward > 0.002 && (
          <VLine xPos={x(spot)} top={padT} bottom={height - padB} color="var(--faint)" dash="2 3" label="S" />
        )}

        {/* scenario ticks */}
        {scenarios.map((s, i) =>
          s.price >= xMin && s.price <= xMax ? (
            <g key={i}>
              <line x1={x(s.price)} x2={x(s.price)} y1={height - padB - 6} y2={height - padB} stroke="var(--accent)" strokeWidth={1.5} />
              <text x={x(s.price)} y={padT - 4} textAnchor="middle" className="mono" fontSize={10} fill="var(--accent)">
                {s.label[0]}
              </text>
            </g>
          ) : null,
        )}

        {/* hover crosshair */}
        {hover && (
          <line x1={x(hover.price)} x2={x(hover.price)} y1={padT} y2={height - padB} stroke="var(--fg)" strokeWidth={1} opacity={0.4} />
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute top-1 rounded-sm border border-line2 bg-panel2 px-2 py-1 text-[12px] shadow-xl"
          style={{ left: Math.min(Math.max(x(hover.price) - 60, 0), width - 130) }}
        >
          <div className="mono text-fg">{fmtMoney(hover.price)}</div>
          <div className="mono text-info">mkt P(&gt;) {fmtPct(1 - hover.rCdf, 0)}</div>
          {subjective && <div className="mono text-warn">you P(&gt;) {fmtPct(1 - hover.sCdf, 0)}</div>}
          {subjective && (
            <div className="mono" style={{ color: 1 - hover.sCdf >= 1 - hover.rCdf ? "var(--up)" : "var(--down)" }}>
              edge {fmtPct(hover.rCdf - hover.sCdf, 0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VLine({
  xPos,
  top,
  bottom,
  color,
  dash,
  label,
}: {
  xPos: number;
  top: number;
  bottom: number;
  color: string;
  dash: string;
  label: string;
}) {
  return (
    <g>
      <line x1={xPos} x2={xPos} y1={top} y2={bottom} stroke={color} strokeWidth={1} strokeDasharray={dash} />
      <text x={xPos + 3} y={top + 8} className="mono" fontSize={10} fill={color}>
        {label}
      </text>
    </g>
  );
}
