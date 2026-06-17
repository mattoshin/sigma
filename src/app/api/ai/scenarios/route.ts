import { NextRequest } from "next/server";
import { buildTickerAnalysis } from "@/lib/analysis";
import { generateScenarios, type ScenarioEngineInput } from "@/lib/ai/anthropic";
import { AI_ENABLED } from "@/lib/config";
import type { DistributionPoint } from "@/lib/types";

function cdfAt(points: DistributionPoint[], price: number): number {
  let best = points[0];
  for (const p of points) if (Math.abs(p.price - price) < Math.abs(best.price - price)) best = p;
  return best.cdf;
}
const probAbove = (points: DistributionPoint[], price: number) => 1 - cdfAt(points, price);

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let body: { ticker?: string; expiryIndex?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  let analysis;
  try {
    analysis = await buildTickerAnalysis(body.ticker);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 404 });
  }

  const exp = analysis.expiries[body.expiryIndex ?? 0] ?? analysis.expiries[0];
  if (!exp) return Response.json({ error: "no expiry available" }, { status: 404 });

  const f = exp.forward;
  const emPct = exp.expectedMove.movePct;
  const pts = exp.rnd.points;
  const impliedProbs = [
    { label: `Finish above the forward (${f.toFixed(2)})`, prob: probAbove(pts, f) },
    { label: `Finish above +1 expected move (${(f * (1 + emPct)).toFixed(2)})`, prob: probAbove(pts, f * (1 + emPct)) },
    { label: `Finish below −1 expected move (${(f * (1 - emPct)).toFixed(2)})`, prob: cdfAt(pts, f * (1 - emPct)) },
  ];

  const catalyst = analysis.catalysts.find((c) => c.type === "earnings")?.label;

  const input: ScenarioEngineInput = {
    ticker: analysis.ticker,
    name: analysis.name,
    sector: analysis.sector,
    horizon: exp.expiry,
    dte: exp.dte,
    spot: analysis.spot,
    forward: exp.forward,
    atmIV: exp.atmIV,
    realizedVol: analysis.realizedVol30,
    vrp: analysis.vrp.vrp,
    expectedMovePct: emPct,
    isEarnings: exp.earnings,
    impliedProbs,
    companyFacts: analysis.companyFacts?.metrics,
    catalyst,
    recentFilings: analysis.companyFacts?.latestFilings.map((x) => ({ form: x.form, filed: x.filed })),
  };

  try {
    const result = await generateScenarios(input);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
