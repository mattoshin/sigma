"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtPct, fmtDate } from "@/lib/format";
import type { TrackedCall } from "@/lib/types";

export function CallsTable({ calls }: { calls: TrackedCall[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const resolve = async (id: string, outcome: boolean) => {
    setBusy(id);
    try {
      await fetch(`/api/calls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-[12px] uppercase tracking-wide text-faint">
            <th className="px-3 py-2 text-left font-medium">Logged</th>
            <th className="px-3 py-2 text-left font-medium">Call</th>
            <th className="px-3 py-2 text-right font-medium">You</th>
            <th className="px-3 py-2 text-right font-medium">Market</th>
            <th className="px-3 py-2 text-right font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-panel">
              <td className="mono whitespace-nowrap px-3 py-2 text-faint">{fmtDate(c.createdAt)}</td>
              <td className="px-3 py-2 text-fg">{c.claim}</td>
              <td className="mono px-3 py-2 text-right text-accent">{fmtPct(c.predictedProb, 0)}</td>
              <td className="mono px-3 py-2 text-right text-muted">
                {c.marketImpliedProb != null ? fmtPct(c.marketImpliedProb, 0) : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                {c.resolved ? (
                  <Badge variant={c.outcome ? "up" : "down"}>{c.outcome ? "Hit" : "Miss"}</Badge>
                ) : (
                  <div className="flex justify-end gap-1">
                    <Button variant="up" size="icon" disabled={busy === c.id} onClick={() => resolve(c.id, true)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="down" size="icon" disabled={busy === c.id} onClick={() => resolve(c.id, false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
