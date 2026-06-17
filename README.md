# Oshin

**Equity research in distributions, not price targets.**

> Your terminal tells you the number. Oshin tells you the odds, where your odds disagree with the market's price, and whether you've earned the right to trust your own.

Oshin is an equity-research terminal built for a probability-and-EV way of thinking. Instead of a consensus mean or a single price target, it derives the market's full **risk-neutral probability distribution** from the live option chain, overlays the analyst's **own distribution**, and quantifies the gap between them as **expected value** and a **half-Kelly** position size. It then scores the analyst's probabilistic calls over time with a **Brier score and reliability diagram**.

It is deliberately *not* a cheaper Bloomberg or a "chat with a 10-K." It assumes you already have the terminal and the proprietary analytics, and adds the one reasoning layer those don't surface.

---

## The wedge (and why it's defensible)

Options-implied distributions already exist in *trading* tools (IBKR Probability Lab, TradingView). That is **not** the novelty here, and Oshin never claims it is. The genuinely open white space, which survives a skeptical read:

1. **Bridging the fundamental research workflow to the implied distribution.** No fundamental-research product puts the analyst's catalyst distribution and the options market's implied distribution on one axis and reconciles them. That is Oshin's hero surface.
2. **Scoring the user's *own* probabilistic calls.** Forecast accuracy is tracked for sell-side analysts (TipRanks), but calibration of *your* forecasts lives only in prediction markets, never in an equity-research UI.

And the single highest-credibility detail: the implied density is labeled **risk-neutral (Q)**, not real-world (P). Oshin surfaces the **volatility risk premium** explicitly and offers a transparent Q→P adjustment, rather than mislabeling Q as P, the red-flag error naive "implied probability" tools make.

---

## What's in it

- **Distribution studio** (`/t/[ticker]`), the analyst's Bull/Base/Bear view rendered as a smooth density, overlaid on the options-implied risk-neutral density (Breeden-Litzenberger). The divergence is shaded as edge; hover reads "the market's odds vs your odds at every price."
- **Edge & EV**, every view ends in an expected value, a strategy comparison (long stock / ATM call / OTM call / ATM put priced under your density vs market cost), and a half-Kelly size.
- **Expected-move strip**, implied move into the next catalyst by two reconciling methods (IV and `0.85 × straddle`), with an IV-crush estimate for earnings expiries.
- **Volatility panel**, IV vs realized vol, the volatility risk premium, and the implied-vol smile.
- **AI analyst**, a scenario tree anchored to the options-implied base rate (never a bare model probability), with an explicit overconfidence caveat. Requires an Anthropic key; the rest works without it.
- **Calibration scorecard** (`/calibration`), Brier score + reliability diagram on your own tracked calls.
- **Edge screener** (`/screener`), the universe ranked by volatility risk premium.
- **Methodology** (`/methodology`), the math, written to be defended: Breeden-Litzenberger, the Shimko IV-spline, GEV/flat-IV tails, expected-move reconciliation, EV, the Q-vs-P/VRP distinction, Kelly, and calibration.

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Then press <kbd>⌘K</kbd> and type a ticker (SPY, AAPL, NVDA, …), or open `/t/SPY`.

### Environment (all optional)

| Variable | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables the AI analyst (anchored scenario engine). Without it, everything else works and the AI panel shows a friendly disabled state. |
| `OSHIN_AI_MODEL` | Override the model (default `claude-sonnet-4-6`). |
| `OSHIN_FORCE_LIVE=1` | Prefer live data (yahoo-finance2) for every ticker, with automatic snapshot fallback on error. Default is snapshot-first so a live demo can't break. |
| `FMP_API_KEY` | financialmodelingprep.com. Adds per-firm rating actions, the DCF fair-value anchor, and key ratios to the ticker workspace. Free tier works for most endpoints. |
| `FRED_API_KEY` | fred.stlouisfed.org/docs/api/api_key.html. Uses the live 3-month Treasury yield as the risk-free rate in pricing instead of a constant. Free. |
| `FINNHUB_API_KEY` | finnhub.io. Quotes, news, recommendation trends as a cross-check/fallback. Free 60 req/min. |
| `ALPHAVANTAGE_API_KEY` | alphavantage.co. EOD historical options (25 req/day) for a future historical-implied study. Free. |

Put them in `.env.local` (copy `.env.local.example`). Every feature degrades gracefully to existing behavior when its key is absent.

### Data & honesty

The demo runs on baked, internally-consistent **snapshots** (a put-skewed smile, prices consistent with it, and a simulated history whose realized vol sits *below* implied so the VRP is real). They're stored as evergreen templates, relative DTEs rehydrated to "today" at load, so the demo never goes stale or breaks. Everything is labeled **delayed / illustrative**. Flip `OSHIN_FORCE_LIVE=1` to pull live option chains for any ticker.

Regenerate the snapshots with:

```bash
node scripts/gen-snapshots.mjs
```

---

## The quant engine

Pure, dependency-free TypeScript in `src/lib/quant/`, unit-tested in `src/lib/quant/quant.test.ts`. The headline test feeds the Breeden-Litzenberger pipeline a chain priced off a *flat* implied-vol surface and asserts it recovers the closed-form Black-Scholes lognormal density, the correctness contract.

```bash
pnpm test         # 12 proof tests
pnpm typecheck
pnpm build
```

---

## Project structure

```
src/
  lib/
    quant/        black-scholes, risk-neutral density, expected move, EV, kelly, vrp, calibration (+ tests)
    data/         hybrid accessor, yahoo + edgar providers, baked snapshots
    ai/           anchored scenario engine (Anthropic)
    store/        tracked-call store (file-backed; Supabase-ready interface)
    analysis.ts   server-side assembler (data -> quant -> serializable view model)
    edge.ts       client-side scenario -> edge recompute (instant slider feedback)
  components/
    ui/           terminal design primitives (shadcn-style, Radix where needed)
    charts/       custom d3/SVG: distribution overlay, price, smile, reliability
    ticker/       the distribution-studio workspace
  app/            home, /t/[ticker], /screener, /calibration, /methodology, /api/*
```

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Radix · d3 · Vitest. Calibration store is file-backed locally behind a thin interface, ready to swap to Supabase.

See [`docs/PITCH.md`](docs/PITCH.md) for how to demo this in an interview and the defensible answers to the obvious quant pushback.

---

*Illustrative research tooling. Data delayed / illustrative. Not investment advice.*
