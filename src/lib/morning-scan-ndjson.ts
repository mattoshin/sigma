import type { MorningScanEvent } from "@/lib/morning-scan-contract";

/** Stateful UTF-8 decoder for arbitrarily chunked NDJSON response bodies. */
export class MorningScanNdjsonDecoder {
  private readonly decoder = new TextDecoder();
  private buffer = "";

  push(value: Uint8Array, done = false): MorningScanEvent[] {
    this.buffer += this.decoder.decode(value, { stream: !done });
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";
    if (done && this.buffer.trim()) {
      lines.push(this.buffer);
      this.buffer = "";
    }
    return lines
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as MorningScanEvent);
  }
}
