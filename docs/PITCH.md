# Sigma — interview playbook

How to demo this in the room, and how to defend it. Distilled from research on SIG's culture and the equity-research tooling landscape.

## The one-liner

> "Every research tool you pay for ships a number where the honest answer is a distribution. Sigma puts my view and the options market's implied distribution on the same axis, quantifies the disagreement as expected value, sizes it with half-Kelly, and then grades whether my probabilities were actually any good."

That sentence speaks SIG's native language — EV, distributions, edge, process over outcome — and signals you understand they are an options market maker, not an asset gatherer.

## Frame it right (this matters at SIG specifically)

- SIG's core business is **options market making**. Their equity analysts sit on trading desks and feed views on **implied vol and expected moves around catalysts**. So lead with vol and EV, not DCFs and price targets.
- Position Sigma as a **complement** to Bloomberg + their proprietary stack, not a replacement. You're adding the one reasoning layer they don't surface.
- Talk **edge, mispricing, sizing, and the firm's own PnL** — never "client value" or "AUM."

## The 5-minute demo flow

1. **Open `/t/SPY`.** Point at the hero chart: "Blue is the market's risk-neutral density from the live option chain. Amber is my view. The shaded region is where I disagree — that's the edge, and I can read the market's odds vs mine at any price by hovering."
2. **Drag a scenario slider.** "Everything recomputes live — my distribution, the EV of expressing this via stock vs options, and the half-Kelly size. Research that ends in a bet, not a price target."
3. **Hit the expected-move strip.** "The market's pricing ±X% into the print. If there's earnings, IV crushes ~40% overnight — so a right directional call can still lose long premium. That's the trader-brain difference between a view and a trade."
4. **Open the vol panel.** "Implied is above realized — that's the volatility risk premium. Which is also why I'm careful: the implied curve is **risk-neutral**, not real-world odds."
5. **Generate AI scenarios** (if a key is set). "I don't trust the model's raw probability — LLMs are overconfident. So I hand it the options-implied base rate and make it anchor, justify deviations, and admit its own uncertainty."
6. **Track the call → `/calibration`.** "And here's the part nobody ships: I score my *own* calls with a Brier score and reliability diagram. Process over outcome — exactly how a poker shop would measure itself."

## Defensible answers to the obvious pushback

- **"How do you get the implied distribution?"** Breeden-Litzenberger: the risk-neutral density is the discounted second derivative of call price w.r.t. strike. I don't differentiate raw quotes — too noisy, gives negative densities. I fit a cubic spline to the IV smile (Shimko), reprice, then take the discrete butterfly second difference. Tails are extended and the density is renormalized; I show the integral and non-negativity as diagnostics.
- **"Isn't that just risk-neutral, not real probabilities?"** Correct, and that's the whole point — I label it Q, not P. The gap is the variance risk premium; I display IV − realized explicitly and offer a transparent drift adjustment rather than pretending to do Ross recovery. Mislabeling Q as P is the error I specifically avoid.
- **"Why half-Kelly?"** Full Kelly is optimal only if my probabilities are exactly right, which they never are. Half-Kelly absorbs estimation error. Negative f* means don't bet.
- **"Aren't implied distributions already a thing?"** Yes — in *trading* tools (IBKR Probability Lab, TradingView). I'm not claiming that's novel. What's missing is bridging the *fundamental research* workflow to it, and scoring the user's *own* calibration. That's the wedge.
- **"LLMs hallucinate probabilities."** Agreed — they're RLHF-overconfident. So I never use a bare model probability; I anchor it to the options-implied base rate and surface the caveat.

## What NOT to claim

- Don't say implied distributions are new.
- Don't cite a market-size or "X% time saved" stat (the ones floating around trace to a single vendor and don't hold up).
- Don't pitch it as a cheaper Bloomberg or a 10-K chatbot — that lane is commoditizing.

## Demo hygiene

- Run on the default snapshot mode (it can't break). Mention `SIGMA_FORCE_LIVE=1` pulls live chains for any ticker, and the production upgrade is a licensed options feed (Polygon).
- Everything is labeled delayed/illustrative — say so. Honesty about provenance reads as sophistication to this audience.
- Demo on SPY and AAPL (dense chains → clean densities).
