import { describe, expect, it } from "vitest";
import { MorningScanNdjsonDecoder } from "@/lib/morning-scan-ndjson";

describe("MorningScanNdjsonDecoder", () => {
  it("handles split records, CRLF, blank lines, UTF-8 boundaries, and a final unterminated record", () => {
    const input = [
      '{"type":"text_delta","text":"probabil',
      'ity ∆"}\r\n\n{"type":"stage","stage":"ai","status":"complete"}',
    ].join("");
    const bytes = new TextEncoder().encode(input);
    const deltaIndex = bytes.indexOf(0xe2);
    const decoder = new MorningScanNdjsonDecoder();

    expect(decoder.push(bytes.slice(0, deltaIndex + 1))).toEqual([]);
    const events = decoder.push(bytes.slice(deltaIndex + 1), true);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text_delta", text: "probability ∆" });
    expect(events[1]).toEqual({ type: "stage", stage: "ai", status: "complete" });
  });

  it("parses multiple complete records from one chunk", () => {
    const decoder = new MorningScanNdjsonDecoder();
    const bytes = new TextEncoder().encode(
      '{"type":"stage","stage":"chains","status":"running"}\n' +
        '{"type":"stage","stage":"chains","status":"complete"}\n',
    );
    expect(decoder.push(bytes, true)).toHaveLength(2);
  });
});
