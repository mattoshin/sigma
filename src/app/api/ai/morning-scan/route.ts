import type { NextRequest } from "next/server";
import { UNIVERSE } from "@/lib/config";
import { SNAPSHOT_COHORT } from "@/lib/data/snapshots";
import {
  buildMorningScanRows,
  deterministicBrief,
  validatedMorningBrief,
} from "@/lib/morning-scan";
import type { MorningScanEvent } from "@/lib/morning-scan-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();
const windows = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
let cachedRows: Awaited<ReturnType<typeof buildMorningScanRows>> | null = null;
let cachedAt = 0;
let inFlightRows: Promise<Awaited<ReturnType<typeof buildMorningScanRows>>> | null = null;

async function scanRows() {
  if (cachedRows && Date.now() - cachedAt < 5 * 60_000) return cachedRows;
  if (!inFlightRows) {
    inFlightRows = buildMorningScanRows().then((rows) => {
      cachedRows = rows;
      cachedAt = Date.now();
      return rows;
    }).finally(() => {
      inFlightRows = null;
    });
  }
  return inFlightRows;
}

export async function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Morning Scan deadline exceeded")), ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  if (!windows.has(key) && windows.size >= 500) {
    for (const [storedKey, value] of windows) {
      if (value.resetAt <= now) windows.delete(storedKey);
    }
    while (windows.size >= 500) {
      const oldest = windows.keys().next().value;
      if (typeof oldest !== "string") break;
      windows.delete(oldest);
    }
  }
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestBodyWithinLimit(req: NextRequest, limit: number): Promise<boolean> {
  if (!req.body) return true;
  const reader = req.body.getReader();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return true;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        return false;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface MorningScanRouteDependencies {
  scan?: typeof scanRows;
  wait?: typeof sleep;
  deadlineMs?: number;
}

export async function handleMorningScan(
  req: NextRequest,
  dependencies: MorningScanRouteDependencies = {},
) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return Response.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 1024) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }
  if (!(await requestBodyWithinLimit(req, 1024))) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }

  const clientId = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(clientId)) {
    return Response.json({ error: "Scan limit reached. Try again in a minute." }, { status: 429 });
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + (dependencies.deadlineMs ?? 12_000);
  const loadRows = dependencies.scan ?? scanRows;
  const wait = dependencies.wait ?? sleep;
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      let rowsForFallback: Awaited<ReturnType<typeof buildMorningScanRows>> | null = null;
      const send = (event: MorningScanEvent) => {
        if (cancelled || req.signal.aborted) return false;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          return true;
        } catch {
          cancelled = true;
          return false;
        }
      };
      const remainingMs = () => {
        const remaining = deadlineAt - Date.now();
        if (remaining <= 0) throw new Error("Morning Scan deadline exceeded");
        return remaining;
      };
      const pause = (ms: number) => withDeadline(wait(ms), remainingMs());

      try {
        send({ type: "stage", stage: "chains", status: "running" });
        const rows = await withDeadline(loadRows(), remainingMs());
        rowsForFallback = rows;
        send({ type: "stage", stage: "chains", status: "complete" });
        await pause(180);

        send({ type: "stage", stage: "distributions", status: "running" });
        await pause(220);
        send({ type: "stage", stage: "distributions", status: "complete" });

        send({ type: "stage", stage: "ranking", status: "running" });
        for (const row of rows) {
          await pause(140);
          send({ type: "ranking", row });
        }
        send({ type: "stage", stage: "ranking", status: "complete" });

        const brief = validatedMorningBrief(rows);
        send({ type: "stage", stage: "ai", status: "running" });
        for (const chunk of brief.summary.match(/.{1,100}/g) ?? [brief.summary]) {
          await pause(120);
          send({ type: "text_delta", text: chunk });
        }
        send({ type: "stage", stage: "ai", status: "complete" });
        send({
          type: "complete",
          rows,
          brief,
          asOf: new Date().toISOString(),
          universeSize: UNIVERSE.length,
          durationMs: Date.now() - startedAt,
          snapshotCohort: SNAPSHOT_COHORT.id,
        });
        if (!cancelled) controller.close();
      } catch (error) {
        if (!cancelled && !req.signal.aborted) {
          if (rowsForFallback) {
            send({
              type: "complete",
              rows: rowsForFallback,
              brief: deterministicBrief(rowsForFallback),
              asOf: new Date().toISOString(),
              universeSize: UNIVERSE.length,
              durationMs: Date.now() - startedAt,
              snapshotCohort: SNAPSHOT_COHORT.id,
            });
          } else {
            send({
              type: "error",
              message: error instanceof Error ? error.message : "Scan failed",
            });
          }
          controller.close();
        }
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: NextRequest) {
  return handleMorningScan(req);
}
