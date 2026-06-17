import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import type { Provenance } from "@/lib/types";

/**
 * Honesty about data provenance reads as sophistication to this audience, not
 * weakness. Every data surface carries one of these.
 */
export function DataTag({ delayed, className }: { delayed?: boolean; className?: string }) {
  return (
    <Badge variant={delayed ? "warn" : "outline"} className={className}>
      {delayed ? "Delayed / Illustrative" : "Snapshot"}
    </Badge>
  );
}

export function ProvenanceLine({ provenance, className }: { provenance: Provenance; className?: string }) {
  return (
    <div className={cn("mono flex items-center gap-2 text-[10px] text-faint", className)}>
      <DataTag delayed={provenance.delayed} />
      <span>
        src: {provenance.source} · as of {new Date(provenance.asOf).toLocaleString("en-US")}
      </span>
      {provenance.note && <span className="text-faint">· {provenance.note}</span>}
    </div>
  );
}
