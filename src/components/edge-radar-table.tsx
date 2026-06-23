"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { EdgeRadarRow } from "@/lib/screener";

type Key = "edgePct" | "divergenceScore" | "bestStructureEdgePct";

const COLS: { key: Key; label: string; abs?: boolean }[] = [
  { key: "edgePct", label: "Street edge", abs: true },
  { key: "divergenceScore", label: "Disagreement" },
  { key: "bestStructureEdgePct", label: "Best structure EV", abs: true },
];

export function EdgeRadarTable({ rows, aiEnabled }: { rows: EdgeRadarRow[]; aiEnabled: boolean }) {
  const [sortKey, setSortKey] = React.useState<Key>("edgePct");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [commentary, setCommentary] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => {
    const col = COLS.find((c) => c.key === sortKey);
    const val = (r: EdgeRadarRow) => (col?.abs ? Math.abs(r[sortKey]) : r[sortKey]);
    return [...rows].sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b)));
  }, [rows, sortKey, dir]);

  const onSort = (k: Key) => {
    if (k === sortKey) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setDir("desc");
    }
  };

  const explain = async () => {
    setLoading(true);
    setError(null);
    try {
      const gaps = sorted
        .slice(0, 5)
        .map((r) => ({ ticker: r.ticker, edgePct: r.edgePct, divergenceScore: r.divergenceScore }));
      const res = await fetch("/api/radar/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaps }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setCommentary(data.commentary as string);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {aiEnabled && (
        <div>
          <Button variant="accent" size="sm" onClick={explain} disabled={loading}>
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? "Reasoning…" : "Explain the top gaps with AI"}
          </Button>
          {error && <p className="mt-1 text-[12px] text-down">{error}</p>}
        </div>
      )}
      {commentary && (
        <div className="rounded-md border border-violet/30 bg-violet/5 px-4 py-3 text-[13px] leading-relaxed text-muted">
          <div className="eyebrow mb-1 text-violet">AI · why these gaps exist</div>
          {commentary}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-[12px] uppercase tracking-wide text-faint">
              <th className="px-3 py-2 text-left font-medium">Ticker</th>
              <th className="px-3 py-2 text-right font-medium">Last</th>
              <th className="px-3 py-2 text-right font-medium">Forward</th>
              <th className="px-3 py-2 text-right font-medium">Street E[S]</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right font-medium">
                  <button
                    onClick={() => onSort(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-fg",
                      sortKey === c.key && "text-accent",
                    )}
                  >
                    {c.label}
                    {sortKey === c.key &&
                      (dir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="mono">
            {sorted.map((r) => (
              <tr key={r.ticker} className="border-b border-line/60 last:border-0 hover:bg-panel">
                <td className="px-3 py-2">
                  <Link href={`/t/${r.ticker}`} className="flex items-center gap-2">
                    <span className="w-12 font-semibold text-fg">{r.ticker}</span>
                    <span className="hidden text-faint md:inline">{r.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-right text-fg">{fmtMoney(r.spot)}</td>
                <td className="px-3 py-2 text-right text-info">{fmtMoney(r.forward)}</td>
                <td className="px-3 py-2 text-right text-warn">{fmtMoney(r.modelMean)}</td>
                <td className={`px-3 py-2 text-right ${r.edgePct >= 0 ? "text-up" : "text-down"}`}>
                  {fmtSignedPct(r.edgePct)}
                </td>
                <td className="px-3 py-2 text-right text-fg">{fmtPct(r.divergenceScore, 0)}</td>
                <td className="px-3 py-2 text-right">
                  <span className="text-muted">{r.bestStructure}</span>{" "}
                  <span className={r.bestStructureEdgePct >= 0 ? "text-up" : "text-down"}>
                    {fmtSignedPct(r.bestStructureEdgePct)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] leading-snug text-faint">
        Street E[S] is the sell-side consensus distribution&apos;s expected price, scaled to the expiry.
        Edge is its gap to the options-implied forward; disagreement is the total-variation distance
        between the two full distributions. The implied density is risk-neutral (Q), so part of any
        persistent gap is the variance risk premium, not a free lunch.
      </p>
    </div>
  );
}
