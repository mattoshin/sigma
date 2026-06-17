/**
 * Server-side analysis assembler.
 *
 * Runs a ticker's data through the quant engine once and produces a single,
 * serializable object the UI can render. The risk-neutral density, expected
 * move, and VRP don't depend on the analyst's view, so they're computed here.
 * The subjective distribution and the edge DO depend on the view, so those are
 * recomputed client-side (see lib/edge.ts) for instant slider feedback.
 */

import { getTickerBundle } from "@/lib/data";
import { universeEntry } from "@/lib/config";
import { riskNeutralDensity, probAbove } from "@/lib/quant/impliedDistribution";
import { expectedMove } from "@/lib/quant/expectedMove";
import { realizedVol } from "@/lib/quant/realizedVol";
import { volRiskPremium } from "@/lib/quant/vrp";
import type {
  Catalyst,
  CompanyFacts,
  Distribution,
  ExpectedMove,
  OptionExpiry,
  PriceBar,
  Provenance,
  Quote,
  VolRiskPremium,
} from "@/lib/types";

export interface ExpiryAnalysis {
  expiry: string;
  dte: number;
  earnings: boolean;
  forward: number;
  atmIV: number;
  rnd: Distribution;
  smile: { strike: number; iv: number }[];
  expectedMove: ExpectedMove;
  warnings: string[];
  /** Chain trimmed to strikes near spot, for client-side EV strategy pricing. */
  expiryChain: OptionExpiry;
  /** "Market's odds at every price" — downsampled P(S_T > K) from the RND. */
  probAbove: { price: number; prob: number }[];
}

export interface TickerAnalysis {
  ticker: string;
  name: string;
  sector: string;
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
  quote: Quote;
  chainProvenance: Provenance;
  expiries: ExpiryAnalysis[];
  vrp: VolRiskPremium;
  realizedVol21: number;
  realizedVol30: number;
  history: PriceBar[];
  catalysts: Catalyst[];
  companyFacts: CompanyFacts | null;
  earningsDte: number | null;
}

function trimExpiry(exp: OptionExpiry, spot: number): OptionExpiry {
  const lo = spot * 0.7;
  const hi = spot * 1.3;
  return {
    ...exp,
    calls: exp.calls.filter((c) => c.strike >= lo && c.strike <= hi),
    puts: exp.puts.filter((p) => p.strike >= lo && p.strike <= hi),
  };
}

export async function buildTickerAnalysis(ticker: string): Promise<TickerAnalysis> {
  const bundle = await getTickerBundle(ticker);
  const chain = bundle.chain.data;
  const spot = chain.spot;
  const r = chain.riskFreeRate;
  const q = chain.dividendYield;
  const entry = universeEntry(bundle.ticker);
  const earningsDte = bundle.earningsDte ?? null;

  const expiries: ExpiryAnalysis[] = [];
  let prevDte = 0;
  for (const exp of chain.expiries) {
    const isEarnings =
      earningsDte != null && earningsDte <= exp.dte && earningsDte > prevDte;
    prevDte = exp.dte;
    try {
      const rndRes = riskNeutralDensity(exp, {
        spot,
        riskFreeRate: r,
        dividendYield: q,
        gridSize: 241, // enough for a smooth chart + accurate integrals, lighter to ship to the client
      });
      const em = expectedMove(exp, {
        spot,
        riskFreeRate: r,
        dividendYield: q,
        isEarningsExpiry: isEarnings,
      });
      em.ticker = bundle.ticker;

      // Downsample the prob-above curve for transport.
      const pa = probAbove(rndRes.distribution);
      const step = Math.max(1, Math.floor(pa.length / 60));
      const probAboveDs = pa.filter((_, i) => i % step === 0);

      expiries.push({
        expiry: exp.expiry,
        dte: exp.dte,
        earnings: isEarnings,
        forward: rndRes.forward,
        atmIV: rndRes.atmIV,
        rnd: rndRes.distribution,
        smile: rndRes.smile,
        expectedMove: em,
        warnings: rndRes.warnings,
        expiryChain: trimExpiry(exp, spot),
        probAbove: probAboveDs,
      });
    } catch {
      // Skip an expiry that can't form a clean density (too few strikes).
      continue;
    }
  }

  // Reference vol: prefer the ~30-day expiry's ATM IV for the VRP read.
  const ref =
    expiries.find((e) => e.dte >= 25 && e.dte <= 45) ?? expiries[0];
  const rv21 = realizedVol(bundle.history.data, 21);
  const rv30 = realizedVol(bundle.history.data, 30);
  const vrp = volRiskPremium(bundle.ticker, ref?.atmIV ?? bundle.atmVol ?? 0, rv21, rv30);

  return {
    ticker: bundle.ticker,
    name: bundle.quote.data.name ?? entry?.name ?? bundle.ticker,
    sector: entry?.sector ?? "—",
    spot,
    riskFreeRate: r,
    dividendYield: q,
    quote: bundle.quote.data,
    chainProvenance: bundle.chain.provenance,
    expiries,
    vrp,
    realizedVol21: rv21,
    realizedVol30: rv30,
    history: bundle.history.data,
    catalysts: bundle.catalysts,
    companyFacts: bundle.companyFacts,
    earningsDte,
  };
}
