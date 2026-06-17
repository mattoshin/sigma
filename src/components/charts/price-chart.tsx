"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area } from "d3-shape";
import { useChartWidth } from "./chart-utils";
import { fmtMoney, fmtDateShort } from "@/lib/format";
import type { PriceBar } from "@/lib/types";

interface Props {
  bars: PriceBar[];
  band?: { upper: number; lower: number; movePct: number };
}

export function PriceChart({ bars, band }: Props) {
  const [ref, width] = useChartWidth();
  const height = Math.round(Math.min(240, Math.max(160, width * 0.2)));
  const padL = 8;
  const padR = 48;
  const padT = 12;
  const padB = 20;

  if (bars.length === 0) return <div ref={ref} style={{ height }} />;

  const closes = bars.map((b) => b.close);
  let yMin = Math.min(...closes);
  let yMax = Math.max(...closes);
  if (band) {
    yMin = Math.min(yMin, band.lower);
    yMax = Math.max(yMax, band.upper);
  }
  const pad = (yMax - yMin) * 0.08;
  const x = scaleLinear().domain([0, bars.length - 1]).range([padL, width - padR]);
  const y = scaleLinear().domain([yMin - pad, yMax + pad]).range([height - padB, padT]);

  const last = closes[closes.length - 1];
  const up = last >= closes[0];
  const color = up ? "var(--up)" : "var(--down)";

  const line = d3line<number>().x((_, i) => x(i)).y((d) => y(d));
  const area = d3area<number>().x((_, i) => x(i)).y0(y(yMin - pad)).y1((d) => y(d));

  const dateTicks = [0, Math.floor(bars.length / 3), Math.floor((2 * bars.length) / 3), bars.length - 1];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* expected move band */}
        {band && (
          <>
            <rect x={padL} y={y(band.upper)} width={width - padR - padL} height={Math.max(0, y(band.lower) - y(band.upper))} fill="var(--accent)" opacity={0.05} />
            {[band.upper, band.lower].map((v, i) => (
              <g key={i}>
                <line x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
                <text x={width - padR + 3} y={y(v) + 3} className="mono" fontSize={9} fill="var(--accent)">
                  {fmtMoney(v, 0)}
                </text>
              </g>
            ))}
          </>
        )}

        {/* y ticks */}
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} opacity={0.4} />
            <text x={width - padR + 3} y={y(t) + 3} className="mono" fontSize={9} fill="var(--faint)">
              {fmtMoney(t, 0)}
            </text>
          </g>
        ))}

        <path d={area(closes) ?? ""} fill="url(#price-fill)" />
        <path d={line(closes) ?? ""} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={x(bars.length - 1)} cy={y(last)} r={2.5} fill={color} />

        {dateTicks.map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="mono" fontSize={9} fill="var(--faint)">
            {fmtDateShort(bars[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
