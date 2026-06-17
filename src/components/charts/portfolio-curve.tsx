"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import { useChartWidth } from "./chart-utils";
import { fmtSignedPct } from "@/lib/format";

export function PortfolioCurve({ navIndex, spyIndex }: { navIndex: number[]; spyIndex: number[] }) {
  const [ref, width] = useChartWidth();
  const height = Math.round(Math.min(360, Math.max(220, width * 0.32)));
  const padL = 8;
  const padR = 52;
  const padT = 14;
  const padB = 22;

  if (navIndex.length === 0) return <div ref={ref} style={{ height }} />;

  const all = [...navIndex, ...spyIndex];
  const yMin = Math.min(...all, 0);
  const yMax = Math.max(...all, 0);
  const pad = (yMax - yMin) * 0.08 || 0.02;
  const x = scaleLinear().domain([0, navIndex.length - 1]).range([padL, width - padR]);
  const y = scaleLinear().domain([yMin - pad, yMax + pad]).range([height - padB, padT]);

  const mk = (arr: number[]) =>
    d3line<number>().x((_, i) => x(i)).y((d) => y(d)).curve(curveMonotoneX)(arr) ?? "";

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        {y.ticks(5).map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "var(--line2)" : "var(--line)"}
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : "3 4"}
              opacity={t === 0 ? 0.8 : 0.4}
            />
            <text x={width - padR + 4} y={y(t) + 3} className="mono" fontSize={11} fill="var(--faint)">
              {fmtSignedPct(t, 0)}
            </text>
          </g>
        ))}

        <path d={mk(spyIndex)} fill="none" stroke="var(--faint)" strokeWidth={1.25} strokeDasharray="4 3" />
        <path d={mk(navIndex)} fill="none" stroke="var(--accent)" strokeWidth={2} />
      </svg>

      <div className="absolute right-1 top-0 flex gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-accent">
          <i className="inline-block h-0.5 w-3 bg-accent" /> NAV
        </span>
        <span className="flex items-center gap-1 text-faint">
          <i className="inline-block h-0.5 w-3 bg-faint" /> SPY
        </span>
      </div>
    </div>
  );
}
