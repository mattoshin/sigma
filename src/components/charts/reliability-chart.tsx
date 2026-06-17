"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { useChartWidth } from "./chart-utils";
import { fmtPct } from "@/lib/format";
import type { CalibrationBin } from "@/lib/types";

interface Props {
  bins: CalibrationBin[];
  height?: number;
}

/**
 * Reliability diagram. The diagonal is perfect calibration: when you say X%, it
 * happens X% of the time. Points below the diagonal = overconfident (predicted
 * more than occurred); above = underconfident.
 */
export function ReliabilityChart({ bins, height = 280 }: Props) {
  const [ref, width] = useChartWidth();
  const pad = 34;
  const side = Math.min(width, height) - pad;
  const x = scaleLinear().domain([0, 1]).range([pad, pad + side]);
  const y = scaleLinear().domain([0, 1]).range([pad + side, pad]);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        {/* overconfident region (below diagonal) */}
        <path
          d={`M ${x(0)} ${y(0)} L ${x(1)} ${y(1)} L ${x(1)} ${y(0)} Z`}
          fill="var(--down)"
          opacity={0.05}
        />
        {/* grid + axes */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--line)" strokeWidth={1} opacity={0.4} />
            <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} opacity={0.4} />
            <text x={x(t)} y={y(0) + 14} textAnchor="middle" className="mono" fontSize={9} fill="var(--faint)">
              {fmtPct(t, 0)}
            </text>
            <text x={x(0) - 6} y={y(t) + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--faint)">
              {fmtPct(t, 0)}
            </text>
          </g>
        ))}

        {/* perfect-calibration diagonal */}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--faint)" strokeWidth={1} strokeDasharray="4 3" />

        {/* connecting line through bins */}
        {bins.length > 1 && (
          <polyline
            points={bins.map((b) => `${x(b.predictedAvg)},${y(b.observedFreq)}`).join(" ")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.25}
            opacity={0.7}
          />
        )}

        {/* bins */}
        {bins.map((b, i) => (
          <circle
            key={i}
            cx={x(b.predictedAvg)}
            cy={y(b.observedFreq)}
            r={4 + 8 * (b.count / maxCount)}
            fill="var(--accent)"
            fillOpacity={0.45}
            stroke="var(--accent)"
            strokeWidth={1}
          />
        ))}

        <text x={pad + side / 2} y={height - 4} textAnchor="middle" className="mono" fontSize={9} fill="var(--muted)">
          predicted probability
        </text>
        <text
          x={12}
          y={pad + side / 2}
          textAnchor="middle"
          className="mono"
          fontSize={9}
          fill="var(--muted)"
          transform={`rotate(-90 12 ${pad + side / 2})`}
        >
          observed frequency
        </text>
      </svg>
    </div>
  );
}
