import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AI_ENABLED } from "@/lib/config";

const MODEL = process.env.RIPTIDE_AI_MODEL ?? process.env.OSHIN_AI_MODEL ?? "claude-sonnet-4-6";

const SYSTEM = [
  "You are a disciplined equity-research analyst at a probability-and-EV options shop.",
  "You are shown names where the sell-side (Street) implied distribution disagrees most with",
  "the options-market (risk-neutral) distribution. In 3 to 4 tight sentences, explain the most",
  "likely REASONS such gaps exist: the variance risk premium, sell-side target lag, catalyst or",
  "earnings skew, illiquid option wings, or a genuine fundamental disagreement. Close with the one",
  "caveat that the implied distribution is risk-neutral (Q), not real-world (P), so part of any",
  "persistent gap is compensation for risk, not a free lunch. Do not give investment advice.",
  "No hype. No em dashes.",
].join(" ");

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let body: { gaps?: { ticker: string; edgePct: number; divergenceScore: number }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gaps = (body.gaps ?? []).slice(0, 5);
  if (gaps.length === 0) {
    return Response.json({ error: "no gaps provided" }, { status: 400 });
  }

  const lines = gaps
    .map(
      (g) =>
        `${g.ticker}: Street distribution ${(g.edgePct * 100).toFixed(1)}% vs the forward, ` +
        `shape disagreement ${(g.divergenceScore * 100).toFixed(0)}%`,
    )
    .join("\n");

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: `Top edge-radar gaps:\n${lines}` }],
    });
    const commentary = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return Response.json({ commentary, model: MODEL });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
