/**
 * Generates realistic, internally-consistent snapshot templates for the demo
 * universe. Output is evergreen: expiries are stored as relative DTEs and
 * rehydrated to real dates at load time, so a snapshot never goes stale.
 *
 * Everything here obeys real relationships a quant would check:
 *   - a put-skew implied-vol smile (downside IV richer than upside),
 *   - option prices consistent with that smile via Black-Scholes,
 *   - a simulated price history at ~0.82x implied vol so realized < implied
 *     (a positive, realistic volatility risk premium),
 *   - open interest / volume that peak at the money and decay in the wings.
 *
 * Run: node scripts/gen-snapshots.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "data", "snapshots");
mkdirSync(OUT, { recursive: true });

// --- math -----------------------------------------------------------------

function normCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function bsPrice(type, S, K, T, r, sig, q) {
  if (T <= 0 || sig <= 0) return Math.max(type === "call" ? S - K : K - S, 0);
  const vs = sig * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sig * sig) * T) / vs;
  const d2 = d1 - vs;
  if (type === "call") return S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  return K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1);
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function strikeStep(spot) {
  if (spot < 40) return 1;
  if (spot < 120) return 2.5;
  if (spot < 320) return 5;
  return 5;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

// --- universe -------------------------------------------------------------

const UNIVERSE = [
  { ticker: "SPY", name: "SPDR S&P 500 ETF", sector: "Index", hero: true, spot: 612.4, atmVol: 0.124, skew: 0.55, curv: 0.9, q: 0.012, earningsDte: null },
  { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", hero: true, spot: 234.6, atmVol: 0.262, skew: 0.45, curv: 1.1, q: 0.004, earningsDte: 12 },
  { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Semiconductors", hero: true, spot: 178.3, atmVol: 0.486, skew: 0.5, curv: 1.4, q: 0.0, earningsDte: 9 },
  { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "Index", hero: false, spot: 538.9, atmVol: 0.171, skew: 0.5, curv: 1.0, q: 0.006, earningsDte: null },
  { ticker: "TSLA", name: "Tesla Inc.", sector: "Autos", hero: false, spot: 412.8, atmVol: 0.572, skew: 0.4, curv: 1.5, q: 0.0, earningsDte: 18 },
  { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology", hero: false, spot: 478.2, atmVol: 0.231, skew: 0.42, curv: 1.0, q: 0.007, earningsDte: 21 },
  { ticker: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors", hero: false, spot: 168.5, atmVol: 0.468, skew: 0.45, curv: 1.3, q: 0.0, earningsDte: 26 },
  { ticker: "META", name: "Meta Platforms Inc.", sector: "Technology", hero: false, spot: 642.1, atmVol: 0.338, skew: 0.44, curv: 1.2, q: 0.004, earningsDte: 15 },
];

const R = 0.043; // risk-free rate

const FACTS = {
  SPY: { cik: "0000884394", rev: null, ni: null },
  AAPL: { cik: "0000320193", rev: 416_000, ni: 102_000 },
  NVDA: { cik: "0001045810", rev: 148_500, ni: 84_300 },
  QQQ: { cik: "0001067839", rev: null, ni: null },
  TSLA: { cik: "0001318605", rev: 102_300, ni: 8_900 },
  MSFT: { cik: "0000789019", rev: 281_700, ni: 104_500 },
  AMD: { cik: "0000002488", rev: 31_200, ni: 2_900 },
  META: { cik: "0001326801", rev: 178_400, ni: 73_100 },
};

// --- builders -------------------------------------------------------------

function ivAt(K, spot, atmVol, skew, curv, T) {
  const m = (K - spot) / spot;
  // Put skew: downside (m<0) richer. Term-scale the smile so it flattens with T.
  const termScale = 1 / Math.sqrt(Math.max(T * 365, 7) / 30);
  const iv = atmVol - skew * m * termScale * 0.5 + curv * m * m * termScale * 0.6;
  return Math.min(Math.max(iv, 0.05), 3);
}

function buildExpiry(cfg, dteTarget, earnings) {
  const { spot, atmVol, skew, curv, q } = cfg;
  const T = dteTarget / 365;
  const step = strikeStep(spot);
  const lo = Math.ceil((spot * 0.62) / step) * step;
  const hi = Math.floor((spot * 1.4) / step) * step;
  const calls = [];
  const puts = [];
  // Earnings expiries carry an extra vol bump (event premium).
  const eventBump = earnings ? 0.06 : 0;
  for (let K = lo; K <= hi + 1e-9; K += step) {
    const iv = ivAt(K, spot, atmVol + eventBump, skew, curv, T);
    const m = (K - spot) / spot;
    const oiBase = Math.round(40000 * Math.exp(-Math.pow(m * 6, 2)) + 80);
    const volBase = Math.round(oiBase * 0.35 + 20);
    for (const type of ["call", "put"]) {
      const px = bsPrice(type, spot, K, T, R, iv, q);
      const spread = Math.max(0.02, px * 0.012);
      const contract = {
        strike: round2(K),
        bid: round2(Math.max(px - spread / 2, 0.01)),
        ask: round2(px + spread / 2),
        last: round2(px),
        mid: round2(px),
        impliedVol: round2(iv),
        openInterest: oiBase,
        volume: volBase,
        type,
        inTheMoney: type === "call" ? K < spot : K > spot,
      };
      if (type === "call") calls.push(contract);
      else puts.push(contract);
    }
  }
  return { dteTarget, earnings, calls, puts };
}

function buildHistory(cfg) {
  const { ticker, spot, atmVol } = cfg;
  const rnd = mulberry32(hash(ticker));
  const n = 252;
  const dailyVol = (atmVol * 0.82) / Math.sqrt(252); // realized below implied -> +VRP
  const drift = 0.07 / 252;
  // Simulate log path, then rescale so the final close equals spot exactly.
  const logs = [0];
  for (let i = 1; i < n; i++) {
    // Box-Muller
    const u1 = Math.max(rnd(), 1e-9);
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    logs.push(logs[i - 1] + drift - 0.5 * dailyVol * dailyVol + dailyVol * z);
  }
  const finalLog = logs[n - 1];
  const bars = logs.map((l, i) => {
    const close = spot * Math.exp(l - finalLog);
    const intraday = close * dailyVol * (0.6 + 0.8 * rnd());
    const open = close * (1 + dailyVol * (rnd() - 0.5));
    const high = Math.max(open, close) + intraday * rnd();
    const low = Math.min(open, close) - intraday * rnd();
    const volume = Math.round(2_000_000 + 8_000_000 * rnd());
    return {
      open: round2(open),
      high: round2(high),
      low: round2(Math.max(low, 0.01)),
      close: round2(close),
      volume,
    };
  });
  return bars;
}

function buildFacts(cfg) {
  const f = FACTS[cfg.ticker] ?? { cik: "0000000000", rev: null, ni: null };
  const metrics = [];
  if (f.rev != null) {
    metrics.push({ label: "Revenue (TTM)", value: f.rev * 1e6, unit: "USD", period: "TTM" });
    metrics.push({ label: "Net income (TTM)", value: f.ni * 1e6, unit: "USD", period: "TTM" });
    metrics.push({ label: "Net margin", value: f.ni / f.rev, unit: "ratio", period: "TTM" });
  }
  return {
    cik: f.cik,
    name: cfg.name,
    metrics,
    latestFilingsTemplate: [
      { form: "10-Q", daysAgo: 24, accession: "0000000000-26-000001" },
      { form: "8-K", daysAgo: 24, accession: "0000000000-26-000002" },
      { form: "10-K", daysAgo: 210, accession: "0000000000-25-000010" },
    ],
  };
}

function buildStreet(cfg) {
  const rnd = mulberry32(hash(cfg.ticker) + 99);
  const spot = cfg.spot;
  const drift = 0.04 + 0.11 * rnd(); // +4%..+15% mean upside over ~12mo (analysts skew bullish)
  const mean = round2(spot * (1 + drift));
  const spread = 0.13 + cfg.atmVol * 0.55; // disagreement widens with vol
  const high = round2(mean * (1 + spread));
  const low = round2(mean * (1 - spread * 0.85));
  const median = round2(mean * (1 - (0.005 + 0.03 * rnd())));
  const n = Math.round(22 + rnd() * 24);
  let strongBuy = Math.round(n * (0.1 + 0.14 * rnd()));
  let buy = Math.round(n * (0.3 + 0.15 * rnd()));
  let hold = Math.round(n * (0.18 + 0.16 * rnd()));
  let sell = Math.max(0, Math.round(n * (0.03 + 0.06 * rnd())));
  let strongSell = Math.max(0, n - strongBuy - buy - hold - sell);
  const recMean = (1 * strongBuy + 2 * buy + 3 * hold + 4 * sell + 5 * strongSell) / Math.max(n, 1);
  const key = recMean < 1.5 ? "strongBuy" : recMean < 2.5 ? "buy" : recMean < 3.5 ? "hold" : recMean < 4.5 ? "sell" : "strongSell";
  const epsAvg = round2(1.5 + 6 * rnd());
  return {
    numAnalysts: n,
    targetLow: low,
    targetMean: mean,
    targetMedian: median,
    targetHigh: high,
    ratings: { strongBuy, buy, hold, sell, strongSell },
    recommendationKey: key,
    recommendationMean: round2(recMean),
    epsNext: { period: "next-q", avg: epsAvg, low: round2(epsAvg * 0.93), high: round2(epsAvg * 1.08), numAnalysts: Math.round(n * 0.7) },
    horizonMonths: 12,
  };
}

// --- emit -----------------------------------------------------------------

const index = [];
for (const cfg of UNIVERSE) {
  const expiries = [];
  // A near weekly (earnings-bearing if a print lands inside it), a front month, ~60d, ~90d.
  const earnDte = cfg.earningsDte;
  const dteSet = [7, 30, 60, 91];
  for (const dte of dteSet) {
    const earnings = earnDte != null && earnDte <= dte && earnDte > (dteSet[dteSet.indexOf(dte) - 1] ?? 0);
    expiries.push(buildExpiry(cfg, dte, earnings));
  }
  const prevClose = round2(cfg.spot * (1 - (0.004 - 0.008 * mulberry32(hash(cfg.ticker) + 7)())));
  const bundle = {
    ticker: cfg.ticker,
    name: cfg.name,
    sector: cfg.sector,
    hero: cfg.hero,
    spot: cfg.spot,
    prevClose,
    currency: "USD",
    riskFreeRate: R,
    dividendYield: cfg.q,
    atmVol: cfg.atmVol,
    earningsDte: cfg.earningsDte,
    expiries,
    history: buildHistory(cfg),
    catalysts:
      cfg.earningsDte != null
        ? [{ type: "earnings", dteTarget: cfg.earningsDte, label: `${cfg.ticker} earnings`, confirmed: true }]
        : [],
    companyFacts: buildFacts(cfg),
    street: buildStreet(cfg),
  };
  writeFileSync(join(OUT, `${cfg.ticker}.json`), JSON.stringify(bundle));
  index.push({ ticker: cfg.ticker, name: cfg.name, sector: cfg.sector, hero: cfg.hero });
  process.stdout.write(`  ${cfg.ticker}: ${expiries.reduce((s, e) => s + e.calls.length + e.puts.length, 0)} contracts\n`);
}

writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
process.stdout.write(`Wrote ${index.length} snapshots + index.json to ${OUT}\n`);
