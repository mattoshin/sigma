/**
 * Edge screener. Ranks the universe by where the market's vol pricing looks
 * richest vs what the stock has delivered (the volatility risk premium), and
 * surfaces the implied expected move and next catalyst per name.
 *
 * A full version overlays a fundamental/AI distribution per name and ranks by
 * its divergence from the implied density; here we rank by the computable,
 * honest VRP signal and flag it as such.
 */

import { UNIVERSE } from "@/lib/config";
import { buildTickerAnalysis } from "@/lib/analysis";
import { loadSnapshot } from "@/lib/data/snapshots";
import { computeEdge, makeViewFromStreet } from "@/lib/edge";
import { totalVariation } from "@/lib/arena";
import type { Catalyst, Distribution } from "@/lib/types";

export interface TapeRow {
  ticker: string;
  price: number;
  changePct: number;
}

/** Lightweight tape feed (snapshot-only, no RND compute) for the header marquee. */
export function getTickerTape(): TapeRow[] {
  return UNIVERSE.map((u) => {
    const s = loadSnapshot(u.ticker);
    return { ticker: u.ticker, price: s?.quote.price ?? 0, changePct: s?.quote.changePct ?? 0 };
  });
}

export interface ScreenerRowFull {
  ticker: string;
  name: string;
  sector: string;
  spot: number;
  atmIV: number;
  realizedVol: number;
  vrp: number;
  expectedMovePct: number;
  nextCatalyst?: Catalyst;
  changePct: number;
}

export async function getScreenerRows(options: { snapshotOnly?: boolean } = {}): Promise<ScreenerRowFull[]> {
  const rows = await Promise.all(
    UNIVERSE.map(async (u) => {
      const a = await buildTickerAnalysis(u.ticker, options);
      const ref = a.expiries.find((e) => e.dte >= 25 && e.dte <= 45) ?? a.expiries[0];
      return {
        ticker: u.ticker,
        name: u.name,
        sector: u.sector,
        spot: a.spot,
        atmIV: ref?.atmIV ?? a.vrp.atmIV,
        realizedVol: a.realizedVol30,
        vrp: a.vrp.vrp,
        expectedMovePct: ref?.expectedMove.movePct ?? 0,
        nextCatalyst: a.catalysts.find((c) => c.type === "earnings"),
        changePct: a.quote.changePct,
      };
    }),
  );
  return rows.sort((x, y) => y.vrp - x.vrp);
}

// ---------------------------------------------------------------------------
// Edge Radar, the agentic scan, where a model's distribution disagrees most
// with what the options market is pricing.
// ---------------------------------------------------------------------------

export interface EdgeRadarRow {
  ticker: string;
  name: string;
  spot: number;
  forward: number;
  /** E[S_T] under the model's distribution. */
  modelMean: number;
  /** (modelMean − forward) / forward, the signed directional mispricing. */
  edgePct: number;
  /** Best non-stock structure to express the gap, and its EV edge as % of cost. */
  bestStructure: string;
  bestStructureEdgePct: number;
  /** Total-variation distance between the model and the implied density, 0..1. */
  divergenceScore: number;
  atmIV: number;
  realizedVol: number;
  vrp: number;
  expectedMovePct: number;
  dte: number;
  nextCatalyst?: Catalyst;
  curves?: {
    market: { price: number; density: number }[];
    street: { price: number; density: number }[];
  };
  delayed: boolean;
}

export function compareEdgeSignals(
  x: Pick<EdgeRadarRow, "ticker" | "edgePct" | "divergenceScore">,
  y: Pick<EdgeRadarRow, "ticker" | "edgePct" | "divergenceScore">,
): number {
  return (
    y.divergenceScore - x.divergenceScore ||
    Math.abs(y.edgePct) - Math.abs(x.edgePct) ||
    x.ticker.localeCompare(y.ticker)
  );
}

function downsampleCurve(distribution: Distribution): { price: number; density: number }[] {
  const step = Math.max(1, Math.ceil(distribution.points.length / 48));
  return distribution.points
    .filter((_, index) => index % step === 0)
    .map((point) => ({ price: point.price, density: point.density }));
}

function chartCurves(
  marketDistribution: Distribution,
  streetDistribution: Distribution,
): NonNullable<EdgeRadarRow["curves"]> {
  const market = downsampleCurve(marketDistribution);
  const street = downsampleCurve(streetDistribution);
  const sharedMax = Math.max(
    ...market.map((point) => point.density),
    ...street.map((point) => point.density),
    1e-9,
  );
  const normalize = (points: { price: number; density: number }[]) =>
    points.map((point) => ({ ...point, density: point.density / sharedMax }));

  return { market: normalize(market), street: normalize(street) };
}

/**
 * Run the Street's distribution against the options-implied density across the
 * whole universe and rank by the size of the disagreement. The Street view
 * carries a real directional drift (analyst targets) and dispersion, so unlike a
 * symmetric default view it genuinely parts ways with what options price. Names
 * without sell-side coverage are skipped.
 */
export async function getEdgeRadarRows(
  options: { snapshotOnly?: boolean; includeCurves?: boolean } = {},
): Promise<EdgeRadarRow[]> {
  const rows = await Promise.all(
    UNIVERSE.map(async (u): Promise<EdgeRadarRow | null> => {
      const a = await buildTickerAnalysis(u.ticker, options);
      const exp = a.expiries.find((e) => e.dte >= 25 && e.dte <= 45) ?? a.expiries[0];
      if (!exp || !a.analysts) return null;

      const view = makeViewFromStreet(a.ticker, exp, a.spot, a.analysts);
      const { subjective, edge } = computeEdge(
        view,
        exp,
        a.spot,
        a.riskFreeRate,
        a.dividendYield,
      );
      const best = [...edge.strategies]
        .filter((s) => s.label !== "Long stock")
        .sort((x, y) => (y.evEdge ?? 0) - (x.evEdge ?? 0))[0];

      return {
        ticker: u.ticker,
        name: u.name,
        spot: a.spot,
        forward: exp.forward,
        modelMean: subjective.mean,
        edgePct: edge.ev.edgePct,
        bestStructure: best?.label ?? "-",
        bestStructureEdgePct: best?.evEdgePct ?? 0,
        divergenceScore: totalVariation(subjective, exp.rnd),
        atmIV: exp.atmIV,
        realizedVol: a.realizedVol30,
        vrp: a.vrp.vrp,
        expectedMovePct: exp.expectedMove.movePct,
        dte: exp.dte,
        nextCatalyst: a.catalysts.find((c) => c.date <= exp.expiry),
        curves: options.includeCurves ? chartCurves(exp.rnd, subjective) : undefined,
        delayed: a.quote.delayed,
      };
    }),
  );

  return rows
    .filter((r): r is EdgeRadarRow => r !== null)
    .sort(compareEdgeSignals);
}
