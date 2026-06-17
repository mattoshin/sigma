"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveCatmullRom } from "d3-shape";
import { useChartWidth } from "./chart-utils";
import { fmtMoney, fmtPct } from "@/lib/format";

interface Props {
  smile: { strike: number; iv: number }[];
  forward: number;
  height?: number;
}

export function SmileChart({ smile, forward, height = 200 }: Props) {
  const [ref, width] = useChartWidth();
  const padL = 38;
  const padR = 12;
  const padT = 12;
  const padB = 22;

  if (smile.length === 0) return <div ref={ref} style={{ height }} />;

  const strikes = smile.map((s) => s.strike);
  const ivs = smile.map((s) => s.iv);
  const x = scaleLinear().domain([Math.min(...strikes), Math.max(...strikes)]).range([padL, width - padR]);
  const y = scaleLinear().domain([Math.min(...ivs) * 0.92, Math.max(...ivs) * 1.05]).range([height - padB, padT]);

  const line = d3line<{ strike: number; iv: number }>()
    .x((d) => x(d.strike))
    .y((d) => y(d.iv))
    .curve(curveCatmullRom);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} opacity={0.4} />
            <text x={padL - 4} y={y(t) + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--faint)">
              {fmtPct(t, 0)}
            </text>
          </g>
        ))}
        {x.ticks(5).map((t) => (
          <text key={t} x={x(t)} y={height - 6} textAnchor="middle" className="mono" fontSize={9} fill="var(--faint)">
            {fmtMoney(t, 0)}
          </text>
        ))}

        {/* forward marker */}
        <line x1={x(forward)} x2={x(forward)} y1={padT} y2={height - padB} stroke="var(--info)" strokeWidth={1} strokeDasharray="4 3" />

        <path d={line(smile) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={1.75} />
        {smile.map((s, i) => (
          <circle key={i} cx={x(s.strike)} cy={y(s.iv)} r={1.5} fill="var(--accent)" opacity={0.6} />
        ))}
      </svg>
    </div>
  );
}
