# Design: Riptide Cinematic AI Morning Scan

**Status:** APPROVED
**Mode:** Builder
**Repository:** mattoshin/sigma
**Branch:** docs/riptide-ai-portfolio-demo
**Date:** 2026-08-17
**Supersedes:** matthewoshin-main-design-20260617-205835.md

## Problem Statement

Riptide already contains serious equity research machinery: option-implied distributions, user distributions, expected value, half-Kelly sizing, calibration, scenario generation, and an edge radar. The current product asks a visitor to discover that depth by exploring the terminal.

That is the wrong interaction for a portfolio demo. A portfolio visitor needs to understand the product, see the AI work, and reach a convincing result in roughly 60 to 90 seconds. The demo must feel fast and visually distinctive without pretending to be a production trading platform.

The redesigned experience should make one promise: click once, watch Riptide scan a recognizable market universe, and see the three names where market-implied odds deserve attention.

## What Makes This Cool

The main event is a cinematic AI Morning Scan. One click visibly moves through four stages:

1. Load option chains.
2. Reconstruct implied distributions.
3. Rank the largest probability gaps.
4. Stream a concise AI research brief.

The visitor sees the system move from raw market inputs to a prioritized research queue. This demonstrates quantitative modeling, data engineering, interaction design, and applied AI in one short sequence.

The AI is useful because it allocates attention. It does not manufacture prices, probabilities, or expected values. Those values come from deterministic Riptide calculations. A build-time Codex artifact explains why the three computed gaps may matter and what a researcher should inspect next.

## Constraints

- This is a portfolio demo, not a production daily research platform.
- The primary walkthrough must remain reliable without external market-data services.
- AI must never invent or overwrite the displayed financial metrics.
- The existing midnight terminal visual identity should remain recognizable.
- The change should reuse the current quantitative engine and ticker workspaces.
- No authentication, database, scheduled jobs, email alerts, or persistent watchlists.
- Market data provenance, snapshot time, and illustrative-use language must remain visible.
- Motion must respect `prefers-reduced-motion` and the experience must work with keyboard navigation.

## Premises

1. A visitor should understand the product within 15 seconds.
2. `Run AI Morning Scan` is the homepage's dominant action.
3. Quantitative math remains deterministic code. The language model only interprets computed inputs.
4. The core demo uses approximately 16 liquid, recognizable stocks and ETFs with internally consistent bundled snapshots.
5. Optional live lookup may use Alpaca for arbitrary US tickers, with the existing Yahoo provider as a fallback. The core demo does not depend on either provider.
6. Presentation reliability matters more than production infrastructure.
7. The scan should return exactly three priority names so the result feels decisive.

## Cross-Model Perspective

An independent product review proposed framing the experience as a "thesis inbox": a system that identifies which beliefs deserve attention rather than merely summarizing markets. That framing is incorporated into the final output, which returns exactly three priority names and a specific reason to investigate each one.

The review also challenged provider trust and warned against silently mixing market-data sources. For this portfolio scope, the answer is explicit provenance and a snapshot-first core path, not a lengthy provider shadow test. Live data is an optional extension and must be labeled separately from bundled demo data.

## Approaches Considered

### A. Cinematic AI Morning Scan

The homepage runs a four-stage scan, reveals the top three ranked opportunities, streams an AI brief, and links each result into the existing ticker workspace.

**Advantages**

- Communicates the full product story in one interaction.
- Makes the quantitative pipeline visible and legible.
- Demonstrates real AI use with immediate output.
- Reuses the strongest parts of the existing application.
- Supports a reliable presentation path.

**Tradeoffs**

- Requires careful orchestration of progressive states.
- Needs a clearly labeled fallback when the saved AI artifact is invalid or stale.
- Snapshot expansion requires internally consistent data fixtures.

### B. AI Ticker Spotlight

The visitor selects one ticker and receives scenarios, probability gaps, and an AI explanation.

**Advantages**

- Simpler to build and explain.
- Reuses the existing ticker-detail flow directly.
- Reduces initial data requirements.

**Tradeoffs**

- Feels like a conventional stock analyzer.
- Does not show that Riptide can prioritize a market universe.
- Places an extra choice before the first payoff.

### C. Autonomous Research Desk

An agent scans continuously, saves research history, manages watchlists, and sends alerts.

**Advantages**

- Strong long-term product vision.
- Supports genuine daily workflows and retention.
- Creates space for personalization and recurring intelligence.

**Tradeoffs**

- Requires authentication, storage, scheduling, provider reliability work, and alert delivery.
- Creates infrastructure theater for a portfolio visitor who will spend one minute with the product.
- Makes the demo slower to understand and more fragile to present.

## Recommended Approach

Choose Approach A: the Cinematic AI Morning Scan.

### Experience Flow

The homepage begins with a focused promise:

> Find where Street expectations diverge most from the options market before reading twenty research notes.

The main button reads `Run AI Morning Scan`. Activating it starts a visible state machine:

```text
idle
  -> loading_chains
  -> building_distributions
  -> ranking_edges
  -> streaming_brief
       -> complete
       -> demo_fallback

loading_chains | building_distributions | ranking_edges
  -> fatal_error
```

If the bundled brief artifact is missing, invalid, stale, or unavailable before the stream deadline, the state moves to `demo_fallback`, displays a deterministic server-generated fallback brief assembled from the current ranking, and preserves the computed rows. The walkthrough still completes.

The completed state contains:

- A compact distribution visual labeled `Options market (Q)` and `Street consensus (P proxy)`.
- A four-stage progress rail with completed states.
- An AI research brief that appears progressively.
- Exactly three ranked ticker cards.
- Distribution disagreement, expected move, edge, and best-structure EV edge for each result.
- An `Open` action that enters the existing ticker workspace.
- Model, data source, and `as of` metadata.

### Curated Universe

Expand the bundled snapshot universe from 8 to 16 names:

`SPY`, `QQQ`, `AAPL`, `MSFT`, `NVDA`, `AMD`, `META`, `TSLA`, `AMZN`, `GOOGL`, `AVGO`, `NFLX`, `JPM`, `LLY`, `COIN`, and `PLTR`.

This universe balances broad-market anchors, mega-cap technology, semiconductors, financials, healthcare, and high-interest momentum names. Every bundled name must open a valid existing-style ticker workspace.

### Data and AI Architecture

Reuse the existing analysis functions that power ticker pages and the edge radar. Add a dedicated endpoint:

`POST /api/ai/morning-scan`

The endpoint returns `application/x-ndjson`. Each newline contains one validated `MorningScanEvent`. The client consumes `response.body` with a streaming reader and aborts the request when the component unmounts or a new scan begins.

The event contract should be small and typed:

```ts
type MorningScanEvent =
  | { type: "stage"; stage: "chains" | "distributions" | "ranking" | "ai"; status: "running" | "complete" }
  | { type: "ranking"; row: MorningScanRow }
  | { type: "text_delta"; text: string }
  | { type: "complete"; rows: MorningScanRow[]; brief: MorningScanBrief; asOf: string; universeSize: number; durationMs: number; snapshotCohort: string }
  | { type: "error"; message: string };

interface MorningScanRow {
  ticker: string;
  name: string;
  spot: number;
  forward: number;
  streetMean: number;
  edgePct: number;
  divergenceScore: number;
  expectedMovePct: number;
  bestStructure: string;
  bestStructureEdgePct: number;
  snapshotAsOf: string;
  curves: { market: CurvePoint[]; street: CurvePoint[] };
}
```

Rank rows descending by `divergenceScore`, then descending by `abs(edgePct)`, then alphabetically by ticker. Return the first three rows. This keeps the product promise aligned with the actual ranking: Riptide prioritizes the largest probability-distribution disagreements, while directional price edge breaks ties.

The server computes and ranks the quantitative rows from a snapshot-only analysis mode that performs zero FRED, FMP, Yahoo, Alpaca, Anthropic, OpenAI, or other external requests in the public route. A developer-only generation workflow sends the ranked rows and their snapshot-backed evidence, including catalysts when available, to an AI model when a new snapshot cohort is prepared. The current portfolio artifact was produced with OpenAI Codex. The prompt requires explanations to be framed as hypotheses and forbids current-news claims.

The model returns one structured object shaped as `{ summary, items: [{ ticker, thesis, nextQuestion, evidenceIds }] }`. Every supplied catalyst and company fact has a server-assigned evidence ID. The strict Zod schema rejects unknown fields and requires exactly one item for each computed top-three ticker in ranking order. Duplicate, missing, reordered, or unknown tickers are invalid. Every returned evidence ID must belong to that ticker's supplied facts. Model prose is explicitly labeled as an AI-generated hypothesis because schema validation cannot prove semantic entailment. Evidence facts render separately from server-owned snapshot data, so model prose is never presented as the factual source.

The generation workflow caps each narrative field, writes an artifact containing `model`, `generatedAt`, `promptVersion`, `schemaVersion`, `inputDigest`, and the structured brief, then runs the runtime validation suite before accepting the file. `inputDigest` is a SHA-256 digest of canonical JSON containing the complete ranked rows, evidence payload, model identifier, prompt version, and artifact schema version. The route owns canonicalization and hashing, while the generator records the route's digest and shares the same version metadata file. The public route recomputes the digest, requires exact expected metadata values, and uses the artifact only on a complete match. A missing, invalid, incompatible, or stale artifact produces the deterministic server-generated fallback brief.

The public route accepts no user-authored prompt or ticker payload. It enforces a same-origin request check, a small request-body limit, and a capped in-memory per-instance burst limiter. A deployment-level Vercel Firewall rule is recommended before broader promotion but is not required for the current zero-model-call demo route. After validating the bundled artifact, the endpoint emits its approved text as progressive `text_delta` events for the cinematic reveal. Financial values are never accepted from the model artifact. All numbers rendered in result cards come from the current computed rows. The UI labels the model, generation time, snapshot cohort, and content as an AI-generated hypothesis.

The existing runtime radar commentary remains separate from the pre-generated Morning Scan artifact because the two surfaces have different reliability and trust boundaries. The existing scenario route remains available inside ticker workspaces for deeper exploration.

All 16 bundled snapshots belong to one declared cohort. Quote, history, analyst data, and at least one 25-to-45-day option expiry for every ticker must be captured or generated for that cohort. The route emits the cohort ID as `snapshotCohort`, the computation timestamp as `asOf`, and the shared snapshot timestamp on every row as `snapshotAsOf`. Fixture validation runs during tests and fails if any symbol cannot produce a valid row or fewer than three rows remain after analysis.

### Live Data Extension

Alpaca is the preferred optional live provider because its free tier supports US stocks and ETFs, has practical request limits for a demo, and exposes an option-chain endpoint with latest trades, quotes, and Greeks. The existing Yahoo integration remains a fallback.

Live results must be visually labeled. The application must not combine fields from multiple providers inside one result without explicit provenance. A missing Alpaca key must not affect the bundled Morning Scan.

Optional Alpaca lookup is Phase 2 and is not part of this portfolio-demo implementation. The current change ships the bundled 16-symbol Morning Scan and preserves the existing Yahoo live path.

### Reliability Strategy

- Start visual feedback within 150 milliseconds of the click.
- Compute the ranking before revealing the bundled brief.
- The server's 12-second deadline begins when the request reaches the route and covers snapshot analysis, artifact validation, staged reveal delays, and NDJSON delivery. The client enters its running state immediately on CTA activation.
- On artifact or stream timeout after ranking, preserve the computed rows and finish with one `complete` event containing a deterministic brief. Label it `Demo brief, AI artifact unavailable`. It contains no model-generated or externally sourced claims.
- Keep a deterministic seed or fixed snapshot selection so screen recordings are repeatable.
- Do not expose secret API keys to the browser.
- Surface provider, model, and timestamp in the completed state.
- Starting a new scan aborts the previous request and resets state.
- Client disconnects abort active analysis and stream delivery.
- If a stream ends without any terminal event, preserve any ranking already received and enter `demo_fallback`; if no ranking was received, enter `fatal_error`.
- If analysis fails before a valid ranking is available, emit `error` and show a retry action. If ranking rows already exist, preserve them and emit `complete` with a fallback brief.
- Emit exactly one terminal event: `complete` or `error`.

### Visual Direction

Preserve the existing dark terminal foundation, then increase contrast around the scan:

- Electric cyan for probability curves and active pipeline stages.
- Restrained red and green for negative and positive gaps.
- Large editorial headline paired with dense but disciplined data labels.
- A single luminous primary button.
- Animated scan lines, curve drawing, and number transitions that remain subtle enough to preserve credibility.
- A two-column desktop result layout with distribution visualization beside the streamed brief.
- A stacked mobile layout with the ranking cards immediately after the progress rail.

## Open Questions

None. Full-auto defaults are locked for implementation:

- Exactly three results.
- Sixteen bundled symbols.
- Snapshot-first core experience.
- Alpaca as an optional live enhancement.
- Twelve-second scan and brief-delivery fallback threshold.
- No production persistence or scheduling.

## Success Criteria

- A first-time visitor understands Riptide's purpose within 15 seconds.
- Clicking the main CTA produces visible feedback within 150 milliseconds.
- The scan shows its four stages and reaches a result without requiring another choice.
- The first AI-generated brief text appears within 5 seconds under normal conditions.
- The experience completes or enters a labeled fallback within 12 seconds.
- Exactly three ranked names are shown.
- Every displayed financial number is sourced from deterministic application calculations.
- The core scan works without Alpaca credentials.
- The public walkthrough has no runtime Anthropic dependency.
- All 16 curated names open valid ticker workspaces.
- The experience works on mobile and supports keyboard interaction.
- Reduced-motion preferences are honored.
- Existing tests pass, new route and state tests pass, and the production build succeeds.

## Verification Plan

### Unit Tests

- Ranking is deterministic for a fixed snapshot set.
- The top-three selector ranks by divergence score, absolute edge, and ticker in the documented order.
- The bundled model artifact cannot overwrite computed metrics.
- The UI state reducer accepts valid event sequences, ignores duplicate stages, records an internal diagnostic for backward or impossible transitions, preserves ranking rows after invalid events, and accepts only one terminal state.
- The timeout produces a labeled fallback while preserving computed rows.
- Fixture validation confirms all 16 symbols share valid cohort data and produce valid analysis rows.
- UI copy and chart legends identify the model as Street consensus and never imply temporal change.

### Generation Script Tests

- Malformed Codex output is rejected safely.
- Schema-valid but semantically invalid output is rejected, including duplicate, missing, reordered, and unknown tickers or extra fields.
- Unknown evidence IDs are rejected.
- Model output cannot overwrite ranking rows or computed card metrics.
- Model timeouts or unavailable credentials fail generation without modifying the last valid artifact.

### Route Tests

- Stage events arrive in the documented order.
- Ranking arrives before the bundled narrative reveal completes.
- No Anthropic key or model call is available from the public route.
- Provider errors do not affect the bundled scan.
- A truncated stream preserves received ranking rows and enters the fallback state.
- Repeat scans and client disconnects abort in-flight work.
- A pre-ranking analysis exception emits `error`, while a post-ranking failure emits `complete` with a deterministic fallback brief.
- The core route makes zero external market-data requests.
- Cross-origin requests and oversized bodies are rejected before analysis or stream work.
- The bundled brief's `inputDigest` changes when any ranked row, evidence fact, model identifier, prompt version, or schema version changes. Every metadata mismatch enters the deterministic fallback.
- Canonical hashing produces the same digest for equivalent object key orders, changes for meaningful array-order differences, and rejects `NaN`, `Infinity`, or other unsupported numeric values before hashing.
- An end-to-end digest test proves the generator and route use the same canonicalization path.
- Repeated public scans create zero Anthropic calls, and the route-level burst limiter is verified against burst traffic.
- Arbitrary NDJSON transport chunking is parsed correctly: split records, multiple records per chunk, blank lines, CRLF, split UTF-8 bytes, and an unterminated final record.
- Fake-timer races between narrative completion and the stream deadline emit exactly one raw terminal event.

### Interface Tests

- The CTA works by mouse and keyboard.
- Progress and results expose useful accessible labels.
- Reduced-motion mode removes nonessential animation.
- Loading, success, fallback, and failure states do not shift the page unexpectedly.
- Every ranked card opens the corresponding ticker workspace.
- State-transition and timeout tests use fake timers. Browser checks measure CTA feedback with `performance.mark`, while CI asserts the state change occurs on the next animation frame instead of depending on network wall-clock timing.
- Fake timers verify the entire request reaches `complete` or `fallback` within 12 seconds from CTA activation, including delayed analysis time.
- A superseded scan cannot apply delayed ranking, narrative, metadata, or terminal events after a new scan begins.
- Model-controlled narrative containing hostile markup or unsafe link schemes renders as inert text and cannot create executable DOM nodes or unsafe navigation targets.
- A controlled browser test measures CTA activation to first rendered `text_delta`. Deployed-environment verification records the observed value without making CI depend on live network timing.

### Release Checks

- Run the existing Vitest suite.
- Run new Morning Scan tests.
- Run the production Next.js build.
- Complete a desktop and mobile browser walkthrough.
- Verify the live Vercel deployment with a valid brief artifact and with a deliberately stale artifact that must enter fallback.

## Distribution Plan

Use the existing Vercel deployment and current Riptide domain. No new infrastructure is required. The portfolio site should link directly to the Riptide homepage, where the primary CTA begins the complete story.

The final portfolio entry should describe the work in one line:

> An AI equity research terminal that reconstructs market-implied probabilities, ranks the biggest disagreements, and explains what deserves attention next.

## Next Steps

1. Expand the snapshot universe from 8 to 16 names.
2. Define the shared Morning Scan row and event contracts.
3. Build the developer-only validated AI brief generator and input-digest artifact.
4. Build the public streaming Morning Scan endpoint and graceful fallback with no runtime model call.
5. Implement the homepage state machine and cinematic visual states.
6. Add unit, route, accessibility, and browser walkthrough tests.
7. Update the portfolio link and one-line project description.

## The Assignment

After implementation, record one 60-second screen capture that shows the entire portfolio story: click the CTA, watch the four-stage pipeline, reveal the top three names, and open one ticker workspace. The recording is the final proof that the demo communicates without narration.

## What I Noticed

- "Just a demo on my portfolio site" removed the need for production persistence, scheduling, and account infrastructure.
- "Flashy" and "show quick AI use and results" made immediate comprehension the primary product metric.
- "Fullauto" and "stop asking me questions" mean remaining reversible implementation choices should be made autonomously rather than turned into decision gates.
