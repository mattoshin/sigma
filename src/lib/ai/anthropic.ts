/**
 * AI scenario engine.
 *
 * Built around the verified constraint that production LLMs are RLHF-
 * overconfident and do NOT natively emit calibrated probabilities. So we don't
 * ask the model for a bare probability. We hand it the options-implied
 * (risk-neutral) probabilities as a base rate and require it to anchor to them,
 * justify any deviation with specific evidence, and return its own
 * overconfidence caveat. The output feeds the same EV engine as a manual view.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AIScenarioResult, Scenario } from "@/lib/types";

const MODEL = process.env.SIGMA_AI_MODEL ?? "claude-sonnet-4-6";

export interface ScenarioEngineInput {
  ticker: string;
  name: string;
  sector: string;
  horizon: string;
  dte: number;
  spot: number;
  forward: number;
  atmIV: number;
  realizedVol: number;
  vrp: number;
  expectedMovePct: number;
  isEarnings: boolean;
  /** The anchor: options-implied (risk-neutral) probabilities of key outcomes. */
  impliedProbs: { label: string; prob: number }[];
  companyFacts?: { label: string; value: number; unit: string; period: string }[];
  catalyst?: string;
  recentFilings?: { form: string; filed: string }[];
}

const SYSTEM = `You are a disciplined equity research analyst at a probability-and-EV-driven options market maker (think Susquehanna). You think in distributions, not price targets.

You will be given the OPTIONS-IMPLIED (risk-neutral) probabilities for a name's outcomes over a horizon. These are your BASE RATE. Your job:
1. Propose a Bull / Base / Bear scenario set with explicit price levels and probabilities for the terminal price at the horizon.
2. ANCHOR your probabilities to the implied base rate. Only deviate where you have a specific, evidence-based reason, and state that reason. Small, justified deviations are credible; large unexplained ones are not.
3. Remember the implied distribution is RISK-NEUTRAL (Q), not real-world (P): risk aversion inflates downside probabilities, so the true odds are usually a touch less bearish than implied. You may lean slightly against the implied downside on that basis, but say so.
4. Express genuine uncertainty. Do not output more confident probabilities than the evidence supports. You are known to be systematically overconfident; correct for it.
Probabilities across the three scenarios must sum to 1.0.`;

const TOOL = {
  name: "emit_scenarios",
  description: "Emit the anchored scenario set, evidence, and honesty caveat.",
  input_schema: {
    type: "object" as const,
    properties: {
      scenarios: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            label: { type: "string", enum: ["Bull", "Base", "Bear"] },
            probability: { type: "number", description: "0..1" },
            price: { type: "number", description: "terminal price level for this scenario" },
            rationale: { type: "string", description: "one sentence, evidence-grounded" },
          },
          required: ["label", "probability", "price", "rationale"],
        },
      },
      anchorNote: {
        type: "string",
        description: "How your probabilities relate to the options-implied base rate, including any deviation and why.",
      },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            point: { type: "string" },
            source: { type: "string" },
          },
          required: ["point", "source"],
        },
      },
      caveat: {
        type: "string",
        description: "An honest caveat about model overconfidence and what would change this view.",
      },
    },
    required: ["scenarios", "anchorNote", "evidence", "caveat"],
  },
};

export async function generateScenarios(input: ScenarioEngineInput): Promise<AIScenarioResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });

  const factsLine = input.companyFacts?.length
    ? input.companyFacts.map((f) => `${f.label}: ${f.value.toLocaleString()} ${f.unit} (${f.period})`).join("; ")
    : "n/a";
  const filingsLine = input.recentFilings?.length
    ? input.recentFilings.map((f) => `${f.form} filed ${f.filed}`).join(", ")
    : "n/a";

  const userPrompt = `Name: ${input.name} (${input.ticker}), sector ${input.sector}.
Horizon: ${input.horizon} (${input.dte} days).${input.isEarnings ? " An EARNINGS report lands inside this horizon." : ""}
Spot: ${input.spot.toFixed(2)}. Risk-neutral forward: ${input.forward.toFixed(2)}.
ATM implied vol: ${(input.atmIV * 100).toFixed(1)}%. Trailing realized vol: ${(input.realizedVol * 100).toFixed(1)}%. Vol risk premium (IV-RV): ${(input.vrp * 100).toFixed(1)} pts.
Options-implied expected move: +/-${(input.expectedMovePct * 100).toFixed(1)}%.
Catalyst: ${input.catalyst ?? "none flagged"}.
Recent filings: ${filingsLine}.
Headline fundamentals: ${factsLine}.

OPTIONS-IMPLIED (risk-neutral) BASE RATES:
${input.impliedProbs.map((p) => `- ${p.label}: ${(p.prob * 100).toFixed(0)}%`).join("\n")}

Emit your anchored Bull/Base/Bear scenario set via the tool.`;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "emit_scenarios" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return structured scenarios");
  }
  const out = block.input as {
    scenarios: { label: string; probability: number; price: number; rationale: string }[];
    anchorNote: string;
    evidence: { point: string; source: string }[];
    caveat: string;
  };

  // Normalize probabilities to sum to 1 defensively.
  const total = out.scenarios.reduce((s, x) => s + Math.max(x.probability, 0), 0) || 1;
  const scenarios: Scenario[] = out.scenarios.map((s, i) => ({
    id: `ai-${i}`,
    label: s.label,
    probability: Math.max(s.probability, 0) / total,
    price: s.price,
    rationale: s.rationale,
    source: "ai",
  }));

  return {
    ticker: input.ticker,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    scenarios,
    anchorNote: out.anchorNote,
    evidence: out.evidence,
    caveat: out.caveat,
  };
}
