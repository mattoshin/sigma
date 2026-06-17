/**
 * The analyst's subjective distribution.
 *
 * The analyst supplies a small set of scenarios (e.g. bull / base / bear) with
 * probabilities and target prices. We render that as a smooth continuous pdf by
 * placing a normal "bump" at each scenario price, weighted by its probability,
 * and mixing them. The bump width encodes intra-scenario uncertainty and is
 * controlled by `spreadMultiplier` (1.0 ≈ a 6%-of-spot standard deviation per
 * scenario), so the analyst can express "I'm confident in these levels" vs "I
 * have wide error bars" without changing the levels themselves.
 *
 * Crucially, the subjective pdf is evaluated on the SAME price grid as the
 * risk-neutral density, so the two can be overlaid and differenced directly.
 */

import { normPdf, quantileFromCdf, trapz } from "./stats";
import type { Distribution, DistributionPoint, SubjectiveView } from "../types";

const BASE_WIDTH_FRAC = 0.06; // 6% of spot is one scenario's 1-sigma at multiplier=1

/** Normalize scenario probabilities to sum to 1 (idempotent if already valid). */
export function normalizeScenarios(view: SubjectiveView): SubjectiveView {
  const total = view.scenarios.reduce((s, sc) => s + Math.max(sc.probability, 0), 0);
  if (total <= 0) return view;
  return {
    ...view,
    scenarios: view.scenarios.map((sc) => ({
      ...sc,
      probability: Math.max(sc.probability, 0) / total,
    })),
  };
}

/**
 * Build the subjective distribution on a shared price grid.
 * @param gridPrices the price grid from the risk-neutral density (shared x-axis)
 * @param spot used to scale the default bump width
 */
export function subjectiveDistribution(
  view: SubjectiveView,
  gridPrices: number[],
  spot: number,
): Distribution {
  const norm = normalizeScenarios(view);
  const baseWidth = BASE_WIDTH_FRAC * spot;
  const sigma = Math.max(norm.spreadMultiplier * baseWidth, spot * 0.005);

  const rawDensity = gridPrices.map((x) => {
    let d = 0;
    for (const sc of norm.scenarios) {
      d += (sc.probability * normPdf((x - sc.price) / sigma)) / sigma;
    }
    return d;
  });

  const integral = trapz(gridPrices, rawDensity);
  const density = integral > 0 ? rawDensity.map((d) => d / integral) : rawDensity;

  const points: DistributionPoint[] = [];
  const cdf: number[] = [];
  let cum = 0;
  for (let i = 0; i < gridPrices.length; i++) {
    if (i > 0) {
      cum += ((density[i] + density[i - 1]) / 2) * (gridPrices[i] - gridPrices[i - 1]);
    }
    cdf.push(cum);
    points.push({ price: gridPrices[i], density: density[i], cdf: cum });
  }

  const meanVal = trapz(gridPrices, gridPrices.map((x, i) => x * density[i]));
  const variance = trapz(
    gridPrices,
    gridPrices.map((x, i) => (x - meanVal) * (x - meanVal) * density[i]),
  );
  let modeIdx = 0;
  for (let i = 1; i < density.length; i++) if (density[i] > density[modeIdx]) modeIdx = i;

  return {
    kind: "subjective",
    label: "Your view",
    horizon: norm.horizon,
    points,
    mean: meanVal,
    median: quantileFromCdf(gridPrices, cdf, 0.5),
    mode: gridPrices[modeIdx],
    stdev: Math.sqrt(Math.max(variance, 0)),
    q05: quantileFromCdf(gridPrices, cdf, 0.05),
    q25: quantileFromCdf(gridPrices, cdf, 0.25),
    q75: quantileFromCdf(gridPrices, cdf, 0.75),
    q95: quantileFromCdf(gridPrices, cdf, 0.95),
    integral,
    minDensity: Math.min(...density),
  };
}
