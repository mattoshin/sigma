/**
 * Snapshot loader. Snapshots are stored as evergreen templates (relative DTEs,
 * undated history); this module rehydrates them into fully-dated domain objects
 * anchored to "now" each time they're read, so the demo never goes stale.
 */

import type {
  AnalystConsensus,
  Catalyst,
  CompanyFacts,
  OptionChain,
  OptionContract,
  OptionExpiry,
  PriceBar,
  Quote,
} from "@/lib/types";

import SPY from "@/lib/data/snapshots/SPY.json";
import AAPL from "@/lib/data/snapshots/AAPL.json";
import NVDA from "@/lib/data/snapshots/NVDA.json";
import QQQ from "@/lib/data/snapshots/QQQ.json";
import TSLA from "@/lib/data/snapshots/TSLA.json";
import MSFT from "@/lib/data/snapshots/MSFT.json";
import AMD from "@/lib/data/snapshots/AMD.json";
import META from "@/lib/data/snapshots/META.json";
import AMZN from "@/lib/data/snapshots/AMZN.json";
import GOOGL from "@/lib/data/snapshots/GOOGL.json";
import AVGO from "@/lib/data/snapshots/AVGO.json";
import NFLX from "@/lib/data/snapshots/NFLX.json";
import JPM from "@/lib/data/snapshots/JPM.json";
import LLY from "@/lib/data/snapshots/LLY.json";
import COIN from "@/lib/data/snapshots/COIN.json";
import PLTR from "@/lib/data/snapshots/PLTR.json";

interface ExpiryTemplate {
  dteTarget: number;
  earnings: boolean;
  calls: OptionContract[];
  puts: OptionContract[];
}
interface SnapshotTemplate {
  ticker: string;
  name: string;
  sector: string;
  hero: boolean;
  spot: number;
  prevClose: number;
  currency: string;
  riskFreeRate: number;
  dividendYield: number;
  atmVol: number;
  earningsDte: number | null;
  expiries: ExpiryTemplate[];
  history: { open: number; high: number; low: number; close: number; volume: number }[];
  catalysts: { type: string; dteTarget: number; label: string; confirmed: boolean }[];
  companyFacts: {
    cik: string;
    name: string;
    metrics: { label: string; value: number; unit: string; period: string }[];
    latestFilingsTemplate: { form: string; daysAgo: number; accession: string }[];
  };
  street: {
    numAnalysts: number;
    targetLow: number;
    targetMean: number;
    targetMedian: number;
    targetHigh: number;
    ratings: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
    recommendationKey: string;
    recommendationMean: number;
    epsNext: { period: string; avg: number; low: number; high: number; numAnalysts: number };
    horizonMonths: number;
  };
}

const TEMPLATES: Record<string, SnapshotTemplate> = {
  SPY: SPY as SnapshotTemplate,
  AAPL: AAPL as SnapshotTemplate,
  NVDA: NVDA as SnapshotTemplate,
  QQQ: QQQ as SnapshotTemplate,
  TSLA: TSLA as SnapshotTemplate,
  MSFT: MSFT as SnapshotTemplate,
  AMD: AMD as SnapshotTemplate,
  META: META as SnapshotTemplate,
  AMZN: AMZN as SnapshotTemplate,
  GOOGL: GOOGL as SnapshotTemplate,
  AVGO: AVGO as SnapshotTemplate,
  NFLX: NFLX as SnapshotTemplate,
  JPM: JPM as SnapshotTemplate,
  LLY: LLY as SnapshotTemplate,
  COIN: COIN as SnapshotTemplate,
  PLTR: PLTR as SnapshotTemplate,
};

export const SNAPSHOT_COHORT = {
  id: "portfolio-demo-2026-08-17",
  asOf: "2026-08-17T00:00:00.000Z",
} as const;

export interface SnapshotBundle {
  quote: Quote;
  chain: OptionChain;
  history: PriceBar[];
  catalysts: Catalyst[];
  companyFacts: CompanyFacts;
  analysts: AnalystConsensus;
  atmVol: number;
  earningsDte: number | null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function businessDaysEndingToday(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  while (out.length < n) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.unshift(isoDate(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export function hasSnapshot(ticker: string): boolean {
  return Boolean(TEMPLATES[ticker.toUpperCase()]);
}

/** Rehydrate a snapshot template into dated domain objects anchored to now. */
export function loadSnapshot(ticker: string): SnapshotBundle | null {
  const tpl = TEMPLATES[ticker.toUpperCase()];
  if (!tpl) return null;

  const now = new Date();
  const asOf = now.toISOString();

  const expiries: OptionExpiry[] = tpl.expiries.map((e) => ({
    expiry: isoDate(addDays(now, e.dteTarget)),
    dte: e.dteTarget,
    t: e.dteTarget / 365,
    calls: e.calls,
    puts: e.puts,
  }));

  const chain: OptionChain = {
    ticker: tpl.ticker,
    spot: tpl.spot,
    asOf,
    delayed: true,
    riskFreeRate: tpl.riskFreeRate,
    dividendYield: tpl.dividendYield,
    expiries,
  };

  const change = tpl.spot - tpl.prevClose;
  const quote: Quote = {
    ticker: tpl.ticker,
    name: tpl.name,
    price: tpl.spot,
    change,
    changePct: change / tpl.prevClose,
    prevClose: tpl.prevClose,
    currency: tpl.currency,
    marketState: "CLOSED",
    asOf,
    delayed: true,
  };

  const dates = businessDaysEndingToday(tpl.history.length);
  const history: PriceBar[] = tpl.history.map((b, i) => ({ date: dates[i], ...b }));

  const catalysts: Catalyst[] = tpl.catalysts.map((c) => ({
    ticker: tpl.ticker,
    type: c.type as Catalyst["type"],
    date: isoDate(addDays(now, c.dteTarget)),
    label: c.label,
    confirmed: c.confirmed,
  }));

  const companyFacts: CompanyFacts = {
    ticker: tpl.ticker,
    cik: tpl.companyFacts.cik,
    name: tpl.companyFacts.name,
    metrics: tpl.companyFacts.metrics,
    latestFilings: tpl.companyFacts.latestFilingsTemplate.map((f) => ({
      form: f.form,
      filed: isoDate(addDays(now, -f.daysAgo)),
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${tpl.companyFacts.cik}&type=${f.form}`,
    })),
  };

  const analysts: AnalystConsensus = {
    ...tpl.street,
    currentPrice: tpl.spot,
    asOf,
    delayed: true,
  };

  return {
    quote,
    chain,
    history,
    catalysts,
    companyFacts,
    analysts,
    atmVol: tpl.atmVol,
    earningsDte: tpl.earningsDte,
  };
}
