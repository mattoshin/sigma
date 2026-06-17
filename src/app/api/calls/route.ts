import { NextRequest } from "next/server";
import { addCall, listCalls } from "@/lib/store/calls";

export async function GET() {
  const calls = await listCalls();
  return Response.json({ calls });
}

export async function POST(req: NextRequest) {
  let body: {
    ticker?: string;
    horizon?: string;
    claim?: string;
    predictedProb?: number;
    marketImpliedProb?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.ticker || !body.claim || typeof body.predictedProb !== "number") {
    return Response.json({ error: "ticker, claim, predictedProb required" }, { status: 400 });
  }

  const call = await addCall({
    ticker: body.ticker,
    horizon: body.horizon ?? "",
    claim: body.claim,
    predictedProb: Math.min(1, Math.max(0, body.predictedProb)),
    marketImpliedProb: body.marketImpliedProb,
  });
  return Response.json(call, { status: 201 });
}
