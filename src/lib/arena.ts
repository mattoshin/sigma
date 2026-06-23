/**
 * Model Arena: put every model on one axis and measure how much they disagree.
 *
 * The market-implied (risk-neutral) distribution, the analyst's own view, the
 * Street consensus, and the AI analyst are all fit on the SAME price grid
 * (expiry.rnd.points), so overlaying them and measuring their disagreement is
 * pure assembly on top of the existing computeEdge, no new math.
 */

import { computeEdge, makeViewFromStreet } from "@/lib/edge";
import type { ExpiryAnalysis, TickerAnalysis } from "@/lib/analysis";
import type { Distribution, ModelSource, SubjectiveView } from "@/lib/types";

export interface ModelSeries {
  source: ModelSource;
  label: string;
  distribution: Distribution;
  /** E[S_T] under this model vs the market forward, signed. 0 for the market itself. */
  edgePct: number;
}

export interface ModelPair {
  a: ModelSource;
  b: ModelSource;
  /** Total variation distance between the two densities, 0..1. */
  totalVariation: number;
  /** (mean_b − mean_a) / mean_a, the gap in expected price. */
  meanGapPct: number;
}

export interface ModelComparison {
  series: ModelSeries[];
  pairwise: ModelPair[];
}

/** Total variation distance between two densities defined on the same price grid. */
export function totalVariation(a: Distribution, b: Distribution): number {
  const pa = a.points;
  const pb = b.points;
  const n = Math.min(pa.length, pb.length);
  let acc = 0;
  for (let i = 1; i < n; i++) {
    const dx = pa[i].price - pa[i - 1].price;
    acc += Math.abs(pa[i].density - pb[i].density) * dx;
  }
  return Math.min(1, 0.5 * acc);
}

function viewToSeries(
  source: ModelSource,
  label: string,
  view: SubjectiveView,
  analysis: TickerAnalysis,
  expiry: ExpiryAnalysis,
): ModelSeries {
  const { subjective, edge } = computeEdge(
    view,
    expiry,
    analysis.spot,
    analysis.riskFreeRate,
    analysis.dividendYield,
  );
  return { source, label, distribution: subjective, edgePct: edge.ev.edgePct };
}

export function compareModels(args: {
  analysis: TickerAnalysis;
  expiry: ExpiryAnalysis;
  userView: SubjectiveView;
  aiView?: SubjectiveView | null;
}): ModelComparison {
  const { analysis, expiry, userView, aiView } = args;
  const series: ModelSeries[] = [];

  // The market-implied (risk-neutral) density is the reference; its mean IS the
  // forward, so its edge vs the forward is zero by construction.
  series.push({ source: "market", label: "Market (implied)", distribution: expiry.rnd, edgePct: 0 });

  series.push(viewToSeries("user", "Your view", userView, analysis, expiry));

  if (analysis.analysts) {
    const streetView = makeViewFromStreet(analysis.ticker, expiry, analysis.spot, analysis.analysts);
    series.push(viewToSeries("street", "Street", streetView, analysis, expiry));
  }

  if (aiView) {
    series.push(viewToSeries("ai", "AI analyst", aiView, analysis, expiry));
  }

  const pairwise: ModelPair[] = [];
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const A = series[i];
      const B = series[j];
      pairwise.push({
        a: A.source,
        b: B.source,
        totalVariation: totalVariation(A.distribution, B.distribution),
        meanGapPct: (B.distribution.mean - A.distribution.mean) / A.distribution.mean,
      });
    }
  }

  return { series, pairwise };
}

/** Color token for each model's line, shared by the chart, legend, and scoreboard. */
export const MODEL_COLOR: Record<ModelSource, string> = {
  market: "var(--info)", // ocean-cyan, the reference
  user: "var(--warn)", // coral, your view
  street: "var(--violet)", // periwinkle
  ai: "#f5c451", // gold, a distinct categorical hue for the AI series
};

export const MODEL_LABEL: Record<ModelSource, string> = {
  market: "Market",
  user: "You",
  street: "Street",
  ai: "AI",
};
