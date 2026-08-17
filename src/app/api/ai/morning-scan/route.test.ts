import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleMorningScan, POST, withDeadline } from "@/app/api/ai/morning-scan/route";
import type { MorningScanEvent } from "@/lib/morning-scan-contract";

describe("POST /api/ai/morning-scan", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects cross-origin and oversized requests before starting work", async () => {
    const crossOrigin = await POST(
      new NextRequest("http://localhost:3000/api/ai/morning-scan", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const oversized = await POST(
      new NextRequest("http://localhost:3000/api/ai/morning-scan", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-length": "2048" },
      }),
    );
    expect(oversized.status).toBe(413);

    const chunked = await POST(
      new NextRequest("http://localhost:3000/api/ai/morning-scan", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
        body: "x".repeat(2048),
      }),
    );
    expect(chunked.status).toBe(413);
  });

  it("streams ordered stages, three rankings, and exactly one terminal event", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/ai/morning-scan", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "x-forwarded-for": "test-runner" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as MorningScanEvent);
    expect(events.filter((event) => event.type === "ranking")).toHaveLength(3);
    expect(events.filter((event) => event.type === "complete" || event.type === "error")).toHaveLength(1);

    const runningStages = events
      .filter((event) => event.type === "stage" && event.status === "running")
      .map((event) => (event.type === "stage" ? event.stage : ""));
    expect(runningStages).toEqual(["chains", "distributions", "ranking", "ai"]);
    const complete = events.find((event) => event.type === "complete");
    expect(complete?.type === "complete" && complete.brief.source).toBe("ai-artifact");
  });

  it("rate-limits bursts before running more scan work", async () => {
    const responses = await Promise.all(
      Array.from({ length: 13 }, () =>
        POST(
          new NextRequest("http://localhost:3000/api/ai/morning-scan", {
            method: "POST",
            headers: { origin: "http://localhost:3000", "x-forwarded-for": "rate-test" },
          }),
        ),
      ),
    );
    expect(responses.slice(0, 12).every((response) => response.status === 200)).toBe(true);
    expect(responses[12].status).toBe(429);
    await Promise.all(responses.slice(0, 12).map((response) => response.body?.cancel()));
  });

  it("expires rate-limit windows and enforces analysis deadlines", async () => {
    vi.useFakeTimers({ now: new Date("2026-08-17T12:00:00.000Z") });
    const makeRequest = () =>
      POST(
        new NextRequest("http://localhost:3000/api/ai/morning-scan", {
          method: "POST",
          headers: { origin: "http://localhost:3000", "x-forwarded-for": "rate-reset" },
        }),
      );
    const burst = await Promise.all(Array.from({ length: 13 }, makeRequest));
    expect(burst[12].status).toBe(429);
    await Promise.all(burst.slice(0, 12).map((response) => response.body?.cancel()));

    vi.advanceTimersByTime(60_001);
    const reset = await makeRequest();
    expect(reset.status).toBe(200);
    await reset.body?.cancel();

    const deadline = withDeadline(new Promise<never>(() => {}), 100);
    vi.advanceTimersByTime(100);
    await expect(deadline).rejects.toThrow("deadline exceeded");
  });

  it("closes with exactly one error when the full route deadline expires before ranking", async () => {
    vi.useFakeTimers();
    const response = await handleMorningScan(
      new NextRequest("http://localhost:3000/api/ai/morning-scan", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "x-forwarded-for": "deadline-route" },
      }),
      { scan: () => new Promise(() => {}), deadlineMs: 100 },
    );
    const body = response.text();
    await vi.advanceTimersByTimeAsync(101);
    const events = (await body)
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as MorningScanEvent);
    const terminalIndexes = events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.type === "complete" || event.type === "error");

    expect(terminalIndexes).toHaveLength(1);
    expect(terminalIndexes[0].event.type).toBe("error");
    expect(terminalIndexes[0].index).toBe(events.length - 1);
  });
});
