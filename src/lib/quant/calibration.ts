/**
 * Calibration scoring — the verified white space.
 *
 * Forecast accuracy is tracked for sell-side analysts (TipRanks) but never for
 * the USER'S OWN probabilistic calls outside prediction markets. This grades
 * decision quality independent of outcome: a Brier score and a reliability
 * diagram answer "when you say 60%, does it happen ~60% of the time?" — which
 * is exactly how a poker-and-EV shop would want to be measured.
 *
 * Brier score = mean((predicted − outcome)²); 0 is perfect, 0.25 is a coin flip
 * answered "50%", and naive overconfident forecasting scores worse.
 */

import { mean } from "./stats";
import type { CalibrationBin, CalibrationResult, TrackedCall } from "../types";

const BUCKETS: [number, number][] = [
  [0.0, 0.1],
  [0.1, 0.2],
  [0.2, 0.3],
  [0.3, 0.4],
  [0.4, 0.5],
  [0.5, 0.6],
  [0.6, 0.7],
  [0.7, 0.8],
  [0.8, 0.9],
  [0.9, 1.0001],
];

export function calibrate(calls: TrackedCall[]): CalibrationResult {
  const resolved = calls.filter(
    (c) => c.resolved && typeof c.outcome === "boolean",
  );

  if (resolved.length === 0) {
    return {
      brierScore: NaN,
      bins: [],
      count: calls.length,
      resolvedCount: 0,
      overconfidenceIndex: NaN,
    };
  }

  const brierScore = mean(
    resolved.map((c) => {
      const o = c.outcome ? 1 : 0;
      return (c.predictedProb - o) * (c.predictedProb - o);
    }),
  );

  const bins: CalibrationBin[] = BUCKETS.map(([lo, hi]) => {
    const inBin = resolved.filter((c) => c.predictedProb >= lo && c.predictedProb < hi);
    return {
      bucket: `${Math.round(lo * 100)}-${Math.round(Math.min(hi, 1) * 100)}%`,
      predictedAvg: inBin.length ? mean(inBin.map((c) => c.predictedProb)) : (lo + hi) / 2,
      observedFreq: inBin.length ? mean(inBin.map((c) => (c.outcome ? 1 : 0))) : 0,
      count: inBin.length,
    };
  }).filter((b) => b.count > 0);

  const overconfidenceIndex =
    mean(resolved.map((c) => c.predictedProb)) -
    mean(resolved.map((c) => (c.outcome ? 1 : 0)));

  return {
    brierScore,
    bins,
    count: calls.length,
    resolvedCount: resolved.length,
    overconfidenceIndex,
  };
}
