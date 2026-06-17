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
import type { Catalyst } from "@/lib/types";

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

export async function getScreenerRows(): Promise<ScreenerRowFull[]> {
  const rows = await Promise.all(
    UNIVERSE.map(async (u) => {
      const a = await buildTickerAnalysis(u.ticker);
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
