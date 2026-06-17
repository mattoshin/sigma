/**
 * The hybrid data accessor.
 *
 * Demo-safe by default: any universe ticker resolves to its baked snapshot, so
 * a live interview demo cannot break on a flaky feed. Set SIGMA_FORCE_LIVE=1 to
 * prefer live data for every ticker, with automatic snapshot fallback on error.
 * Either way, every payload carries provenance (source + as-of + delayed flag).
 */

import { DEMO_SNAPSHOT_FIRST } from "@/lib/config";
import { hasSnapshot, loadSnapshot, type SnapshotBundle } from "./snapshots";
import { getLiveChain, getLiveHistory, getLiveQuote } from "./providers/yahoo";
import { getCompanyFactsLive } from "./providers/edgar";
import type {
  Catalyst,
  CompanyFacts,
  OptionChain,
  PriceBar,
  Provenance,
  Quote,
  WithProvenance,
} from "@/lib/types";

function snapProvenance(note = "illustrative snapshot"): Provenance {
  return { source: "snapshot", asOf: new Date().toISOString(), delayed: true, note };
}
function liveProvenance(): Provenance {
  return { source: "yahoo", asOf: new Date().toISOString(), delayed: true };
}

export interface TickerBundle {
  ticker: string;
  quote: WithProvenance<Quote>;
  chain: WithProvenance<OptionChain>;
  history: WithProvenance<PriceBar[]>;
  catalysts: Catalyst[];
  companyFacts: CompanyFacts | null;
  /** Reference at-the-money vol from the snapshot, when available. */
  atmVol?: number;
  earningsDte?: number | null;
}

function bundleFromSnapshot(snap: SnapshotBundle, note?: string): TickerBundle {
  const p = snapProvenance(note);
  return {
    ticker: snap.quote.ticker,
    quote: { data: snap.quote, provenance: p },
    chain: { data: snap.chain, provenance: p },
    history: { data: snap.history, provenance: p },
    catalysts: snap.catalysts,
    companyFacts: snap.companyFacts,
    atmVol: snap.atmVol,
    earningsDte: snap.earningsDte,
  };
}

export async function getTickerBundle(ticker: string): Promise<TickerBundle> {
  const t = ticker.toUpperCase();
  const snap = loadSnapshot(t);

  // Demo-safe path: universe tickers resolve to snapshot unless live is forced.
  if (snap && DEMO_SNAPSHOT_FIRST) {
    return bundleFromSnapshot(snap);
  }

  // Live path (works for ANY ticker), with snapshot fallback on error.
  try {
    const [quote, chain, history] = await Promise.all([
      getLiveQuote(t),
      getLiveChain(t),
      getLiveHistory(t),
    ]);
    let companyFacts: CompanyFacts | null = snap?.companyFacts ?? null;
    try {
      companyFacts = (await getCompanyFactsLive(t)) ?? companyFacts;
    } catch {
      /* keep snapshot facts */
    }
    return {
      ticker: t,
      quote: { data: quote, provenance: liveProvenance() },
      chain: { data: chain, provenance: liveProvenance() },
      history: { data: history, provenance: liveProvenance() },
      catalysts: snap?.catalysts ?? [],
      companyFacts,
      atmVol: snap?.atmVol,
      earningsDte: snap?.earningsDte,
    };
  } catch (err) {
    if (snap) return bundleFromSnapshot(snap, "live feed unavailable — snapshot fallback");
    throw new Error(`No data for ${t}: ${(err as Error).message}`);
  }
}

/** Snapshot-only access for the screener (deterministic, fast, never live). */
export function getSnapshot(ticker: string): SnapshotBundle | null {
  return loadSnapshot(ticker);
}

export { hasSnapshot };
