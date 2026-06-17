/**
 * Paper portfolio model for the Portfolio dashboard.
 *
 * Format is modeled on a paper-trading fund dashboard (NAV, return vs SPY,
 * capital and risk blocks, top movers, positions). The numbers here are
 * generated illustrative filler computed from the snapshot prices, NOT anyone
 * else's real book. Swap the POSITIONS config below for real holdings anytime.
 */

import { loadSnapshot } from "@/lib/data/snapshots";

export interface PortfolioConfig {
  name: string;
  inception: string;
  startNav: number;
  cash: number;
  positions: { ticker: string; side: "long" | "short"; shares: number; avgCost: number }[];
}

// ---- the book (illustrative filler; edit to real holdings) ----------------
export const PORTFOLIO: PortfolioConfig = {
  name: "MATTHEW OSHIN",
  inception: "2025-01-02",
  startNav: 25_000_000,
  cash: 8_000_000,
  positions: [
    { ticker: "NVDA", side: "long", shares: 30_000, avgCost: 110 },
    { ticker: "AAPL", side: "long", shares: 18_000, avgCost: 195 },
    { ticker: "AMD", side: "long", shares: 22_000, avgCost: 132 },
    { ticker: "MSFT", side: "long", shares: 7_000, avgCost: 405 },
    { ticker: "META", side: "long", shares: 4_500, avgCost: 540 },
    { ticker: "SPY", side: "long", shares: 6_000, avgCost: 618 },
    { ticker: "QQQ", side: "long", shares: 5_000, avgCost: 545 },
    { ticker: "TSLA", side: "short", shares: 6_000, avgCost: 455 },
  ],
};

export interface PositionRow {
  ticker: string;
  name: string;
  side: "long" | "short";
  shares: number;
  avgCost: number;
  last: number;
  dayChangePct: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  weight: number; // share of gross exposure
}

export interface MoverRow {
  ticker: string;
  pnl: number;
  contributionPct: number; // contribution to start NAV
  note: string;
}

export interface PortfolioModel {
  name: string;
  inception: string;
  asOf: string;
  delayed: boolean;
  nav: number;
  startNav: number;
  itdReturn: number;
  itdVsSpy: number;
  ytdReturn: number;
  ytdVsSpy: number;
  riskAdjustedItd: number;
  riskAdjustedYtd: number;
  capital: {
    cash: number;
    long: number;
    short: number;
    gross: number;
    net: number;
    cashPct: number;
    longPct: number;
    shortPct: number;
    netPct: number;
  };
  risk: {
    hitRate: number;
    winLoss: number;
    maxDD: number;
    sharpe: number;
    avgCashPct: number;
    closedLots: number;
  };
  positions: PositionRow[];
  contributors: MoverRow[];
  detractors: MoverRow[];
  curve: { navIndex: number[]; spyIndex: number[]; points: number };
  summary: { realizedLifetime: number; unrealized: number; trades: number; openLong: number; openShort: number };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
function std(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Build a cumulative-return index that ends exactly at `target`, seeded. */
function buildIndex(seed: number, target: number, n: number, vol: number): number[] {
  const rnd = mulberry32(seed);
  const logs = [0];
  for (let i = 1; i < n; i++) {
    const u1 = Math.max(rnd(), 1e-9);
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    logs.push(logs[i - 1] + vol * z);
  }
  // Rescale so the final cumulative return equals the target.
  const finalLog = logs[n - 1];
  const targetLog = Math.log(1 + target);
  return logs.map((l, i) => Math.exp(l + (targetLog - finalLog) * (i / (n - 1))) - 1);
}

function maxDrawdown(index: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const r of index) {
    const eq = 1 + r;
    if (eq > peak) peak = eq;
    mdd = Math.min(mdd, eq / peak - 1);
  }
  return mdd;
}

export function buildPortfolio(): PortfolioModel {
  const cfg = PORTFOLIO;
  const asOf = new Date().toISOString();

  const positions: PositionRow[] = cfg.positions.map((p) => {
    const snap = loadSnapshot(p.ticker);
    const last = snap?.quote.price ?? p.avgCost;
    const dayChangePct = snap?.quote.changePct ?? 0;
    const name = snap?.quote.name ?? p.ticker;
    const marketValue = p.shares * last;
    const costBasis = p.shares * p.avgCost;
    const unrealizedPnl = p.side === "long" ? (last - p.avgCost) * p.shares : (p.avgCost - last) * p.shares;
    return {
      ticker: p.ticker,
      name,
      side: p.side,
      shares: p.shares,
      avgCost: p.avgCost,
      last,
      dayChangePct,
      marketValue,
      costBasis,
      unrealizedPnl,
      unrealizedPct: costBasis ? unrealizedPnl / costBasis : 0,
      weight: 0, // filled after gross is known
    };
  });

  const long = positions.filter((p) => p.side === "long").reduce((s, p) => s + p.marketValue, 0);
  const short = positions.filter((p) => p.side === "short").reduce((s, p) => s + p.marketValue, 0);
  const gross = long + short;
  const net = long - short;
  const nav = cfg.cash + long - short;
  for (const p of positions) p.weight = gross ? p.marketValue / gross : 0;

  const itdReturn = nav / cfg.startNav - 1;
  const spyItd = 0.114;
  const ytdReturn = itdReturn * 0.58;
  const spyYtd = 0.062;
  const cashPct = nav ? cfg.cash / nav : 0;
  const riskAdjustedItd = itdReturn / Math.max(1 - cashPct, 0.2);
  const riskAdjustedYtd = ytdReturn / Math.max(1 - cashPct, 0.2);

  // Movers by contribution to start NAV.
  const sorted = [...positions].sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
  const toMover = (p: PositionRow): MoverRow => ({
    ticker: p.ticker,
    pnl: p.unrealizedPnl,
    contributionPct: p.unrealizedPnl / cfg.startNav,
    note: p.side === "short" ? "short" : "held",
  });
  const contributors = sorted.filter((p) => p.unrealizedPnl > 0).slice(0, 5).map(toMover);
  const detractors = sorted.filter((p) => p.unrealizedPnl < 0).reverse().slice(0, 5).map(toMover);

  const winners = positions.filter((p) => p.unrealizedPnl > 0);
  const losers = positions.filter((p) => p.unrealizedPnl < 0);
  const hitRate = positions.length ? winners.length / positions.length : 0;
  const avgWin = mean(winners.map((p) => p.unrealizedPnl));
  const avgLoss = Math.abs(mean(losers.map((p) => p.unrealizedPnl))) || 1;
  const winLoss = avgWin / avgLoss;

  const points = 410;
  const navIndex = buildIndex(7, itdReturn, points, 0.011);
  const spyIndex = buildIndex(99, spyItd, points, 0.008);
  const dailyRet: number[] = [];
  for (let i = 1; i < navIndex.length; i++) {
    dailyRet.push((1 + navIndex[i]) / (1 + navIndex[i - 1]) - 1);
  }
  const sharpe = std(dailyRet) ? (mean(dailyRet) / std(dailyRet)) * Math.sqrt(252) : 0;
  const maxDD = maxDrawdown(navIndex);

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return {
    name: cfg.name,
    inception: cfg.inception,
    asOf,
    delayed: true,
    nav,
    startNav: cfg.startNav,
    itdReturn,
    itdVsSpy: itdReturn - spyItd,
    ytdReturn,
    ytdVsSpy: ytdReturn - spyYtd,
    riskAdjustedItd,
    riskAdjustedYtd,
    capital: {
      cash: cfg.cash,
      long,
      short,
      gross,
      net,
      cashPct,
      longPct: nav ? long / nav : 0,
      shortPct: nav ? short / nav : 0,
      netPct: nav ? net / nav : 0,
    },
    risk: {
      hitRate,
      winLoss,
      maxDD,
      sharpe,
      avgCashPct: cashPct,
      closedLots: 72,
    },
    positions: sorted,
    contributors,
    detractors,
    curve: { navIndex, spyIndex, points },
    summary: {
      realizedLifetime: nav - cfg.startNav - totalUnrealized,
      unrealized: totalUnrealized,
      trades: 148,
      openLong: positions.filter((p) => p.side === "long").length,
      openShort: positions.filter((p) => p.side === "short").length,
    },
  };
}
