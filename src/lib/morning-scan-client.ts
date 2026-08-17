import type { MorningScanEvent, MorningScanRow } from "@/lib/morning-scan-contract";
import { MorningScanNdjsonDecoder } from "@/lib/morning-scan-ndjson";

type CompleteEvent = Extract<MorningScanEvent, { type: "complete" }>;

export type MorningScanStreamOutcome =
  | { status: "complete"; event: CompleteEvent }
  | { status: "fallback"; rows: MorningScanRow[]; message: string }
  | { status: "error"; message: string };

function abortError(): DOMException {
  return new DOMException("Morning Scan was cancelled", "AbortError");
}

export async function consumeMorningScanStream(
  response: Response,
  signal: AbortSignal,
  onProgress: (event: MorningScanEvent) => void,
): Promise<MorningScanStreamOutcome> {
  if (!response.ok || !response.body) {
    return { status: "error", message: `Scan unavailable (${response.status})` };
  }
  if (signal.aborted) throw abortError();

  const reader = response.body.getReader();
  const decoder = new MorningScanNdjsonDecoder();
  const rows: MorningScanRow[] = [];
  const cancelReader = () => void reader.cancel();
  signal.addEventListener("abort", cancelReader, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw abortError();

      for (const event of decoder.push(value ?? new Uint8Array(), done)) {
        if (event.type === "ranking") rows.push(event.row);
        if (event.type === "complete") return { status: "complete", event };
        if (event.type === "error") {
          return rows.length > 0
            ? {
                status: "fallback",
                rows,
                message: "The research brief stopped early. Quantitative rankings were preserved.",
              }
            : { status: "error", message: event.message };
        }
        onProgress(event);
      }

      if (done) {
        return rows.length > 0
          ? {
              status: "fallback",
              rows,
              message: "The research brief stopped early. Quantitative rankings were preserved.",
            }
          : { status: "error", message: "Scan stream ended before ranking completed." };
      }
    }
  } finally {
    signal.removeEventListener("abort", cancelReader);
    void reader.cancel();
  }
}
