import { NextRequest } from "next/server";
import { resolveCall } from "@/lib/store/calls";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { outcome?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.outcome !== "boolean") {
    return Response.json({ error: "outcome (boolean) required" }, { status: 400 });
  }
  const updated = await resolveCall(id, body.outcome);
  if (!updated) return Response.json({ error: "call not found" }, { status: 404 });
  return Response.json(updated);
}
