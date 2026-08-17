import type { MorningScanBrief } from "@/lib/morning-scan-contract";

/**
 * Pre-generated AI copy. The public route never invokes a model. Its digest,
 * schema, ticker order, and evidence references are validated before display.
 */
export const MORNING_SCAN_ARTIFACT: Omit<MorningScanBrief, "source"> = {
  generatedAt: "2026-08-17T12:00:00.000Z",
  model: "OpenAI Codex, build-time artifact",
  promptVersion: "morning-scan-v1",
  schemaVersion: "1.0",
  inputDigest: "a2d26e07dad4449780dc3656b6ef65d1d16f609cc09fd4a1ac690080d8053136",
  summary:
    "The widest gaps cluster in index beta and high-volatility retail favorites. The signal is disagreement, not certainty: separate stale Street anchors from genuine risk-premium compensation before expressing a view.",
  items: [
    {
      ticker: "SPY",
      thesis:
        "SPY has the scan's widest distribution-shape disagreement while the Street curve remains above the options forward. That combination can reflect target optimism, index breadth assumptions, or compensation embedded in risk-neutral downside pricing.",
      nextQuestion:
        "Is the gap broad across index constituents, or concentrated in a small group of mega-cap weights?",
      evidenceIds: ["SPY:divergence", "SPY:edge", "SPY:vrp"],
    },
    {
      ticker: "TSLA",
      thesis:
        "TSLA pairs a large directional Street gap with elevated implied volatility and a catalyst inside the selected horizon. The market may be charging heavily for path risk even while sell-side targets preserve upside optionality.",
      nextQuestion:
        "How much of the divergence survives after isolating the earnings-expiry volatility premium?",
      evidenceIds: ["TSLA:divergence", "TSLA:edge", "TSLA:catalyst"],
    },
    {
      ticker: "COIN",
      thesis:
        "COIN's curve disagreement remains high despite a smaller directional gap than TSLA. High implied volatility suggests the shape difference may matter more than the mean, especially if crypto-linked tail risk is driving option prices.",
      nextQuestion:
        "Does the disagreement sit mainly in downside skew, or in a wider two-sided distribution around the forward?",
      evidenceIds: ["COIN:divergence", "COIN:edge", "COIN:iv"],
    },
  ],
};
