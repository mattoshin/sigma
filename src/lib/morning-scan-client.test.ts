import { describe, expect, it } from "vitest";
import { consumeMorningScanStream } from "@/lib/morning-scan-client";
import type { MorningScanEvent, MorningScanRow } from "@/lib/morning-scan-contract";

const row = { ticker: "SPY" } as MorningScanRow;

function responseFrom(events: MorningScanEvent[], terminate = true): Response {
  const body = events.map((event) => JSON.stringify(event)).join("\n") + (terminate ? "\n" : "");
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson" } });
}

describe("Morning Scan stream consumer", () => {
  it("delivers progressive events and a successful terminal result", async () => {
    const progress: string[] = [];
    const complete = {
      type: "complete",
      rows: [row],
      brief: { source: "ai-artifact" },
      asOf: "2026-08-17T00:00:00.000Z",
      universeSize: 16,
      durationMs: 100,
      snapshotCohort: "demo",
    } as MorningScanEvent;
    const outcome = await consumeMorningScanStream(
      responseFrom([
        { type: "stage", stage: "chains", status: "running" },
        { type: "ranking", row },
        complete,
      ]),
      new AbortController().signal,
      (event) => progress.push(event.type),
    );

    expect(progress).toEqual(["stage", "ranking"]);
    expect(outcome.status).toBe("complete");
  });

  it("preserves rows when a stream is truncated or reports a late error", async () => {
    for (const terminal of [undefined, { type: "error", message: "late failure" } as const]) {
      const events: MorningScanEvent[] = [{ type: "ranking", row }];
      if (terminal) events.push(terminal);
      const outcome = await consumeMorningScanStream(
        responseFrom(events, terminal !== undefined),
        new AbortController().signal,
        () => {},
      );
      expect(outcome).toMatchObject({ status: "fallback", rows: [row] });
    }
  });

  it("returns a fatal error when no ranking is available", async () => {
    const outcome = await consumeMorningScanStream(
      responseFrom([{ type: "error", message: "analysis failed" }]),
      new AbortController().signal,
      () => {},
    );
    expect(outcome).toEqual({ status: "error", message: "analysis failed" });
  });

  it("rejects an aborted scan so a rerun cannot apply stale events", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      consumeMorningScanStream(responseFrom([]), controller.signal, () => {}),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
