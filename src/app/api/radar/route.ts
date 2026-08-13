import { NextResponse } from "next/server";
import { UNIVERSE } from "@/lib/config";
import { buildTickerAnalysis } from "@/lib/analysis";
import { computeEdge, makeViewFromStreet } from "@/lib/edge";
import { totalVariation } from "@/lib/arena";
import { annualizedVolFromStdev } from "@/lib/radar-math";

export const dynamic = "force-dynamic";

// Public feed of Riptide's own edge signal, so a sibling app can trade off
// the same distribution-vs-market disagreement the Edge Radar page ranks by,
// instead of duplicating the quant engine. annualizedVol is derived from the
// model's own stdev (real, from Breeden-Litzenberger/Shimko), not assumed.
export async function GET() {
  const rows = await Promise.all(
    UNIVERSE.map(async (u) => {
      try {
        const a = await buildTickerAnalysis(u.ticker);
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

        const annualizedVol = annualizedVolFromStdev(subjective.stdev, a.spot, exp.dte);

        return {
          ticker: u.ticker,
          name: u.name,
          sector: u.sector,
          spot: a.spot,
          forward: exp.forward,
          modelMean: subjective.mean,
          edgePct: edge.ev.edgePct,
          divergenceScore: totalVariation(subjective, exp.rnd),
          annualizedVol,
          riskFreeRate: a.riskFreeRate,
          dte: exp.dte,
          delayed: a.quote.delayed,
        };
      } catch {
        return null;
      }
    }),
  );

  const clean = rows.filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json(
    { asOf: new Date().toISOString(), rows: clean },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
