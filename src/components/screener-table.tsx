"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { ScreenerRowFull } from "@/lib/screener";

type Key = "atmIV" | "realizedVol" | "vrp" | "expectedMovePct" | "spot" | "changePct";

const COLS: { key: Key; label: string }[] = [
  { key: "spot", label: "Last" },
  { key: "changePct", label: "Chg" },
  { key: "atmIV", label: "ATM IV" },
  { key: "realizedVol", label: "RV 30d" },
  { key: "vrp", label: "VRP" },
  { key: "expectedMovePct", label: "Exp move" },
];

export function ScreenerTable({ rows }: { rows: ScreenerRowFull[] }) {
  const [sortKey, setSortKey] = React.useState<Key>("vrp");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");

  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => (dir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
  }, [rows, sortKey, dir]);

  const onSort = (k: Key) => {
    if (k === sortKey) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setDir("desc");
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-[12px] uppercase tracking-wide text-faint">
            <th className="px-3 py-2 text-left font-medium">Ticker</th>
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
            <th className="px-3 py-2 text-right font-medium">Earnings</th>
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
              <td className={`px-3 py-2 text-right ${r.changePct >= 0 ? "text-up" : "text-down"}`}>
                {fmtSignedPct(r.changePct)}
              </td>
              <td className="px-3 py-2 text-right text-accent">{fmtPct(r.atmIV, 1)}</td>
              <td className="px-3 py-2 text-right text-muted">{fmtPct(r.realizedVol, 1)}</td>
              <td className={`px-3 py-2 text-right ${r.vrp >= 0 ? "text-up" : "text-down"}`}>
                {r.vrp >= 0 ? "+" : ""}
                {(r.vrp * 100).toFixed(1)} pts
              </td>
              <td className="px-3 py-2 text-right text-fg">±{fmtPct(r.expectedMovePct, 1)}</td>
              <td className="px-3 py-2 text-right">
                {r.nextCatalyst ? <Badge variant="warn">soon</Badge> : <span className="text-faint">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
