"use client";

import { Users } from "lucide-react";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/tooltip";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import type { AnalystConsensus } from "@/lib/types";

const KEY_LABEL: Record<string, string> = {
  strongBuy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  strongSell: "Strong Sell",
};

function ratingTone(key: string): "up" | "down" | "default" {
  if (key === "strongBuy" || key === "buy") return "up";
  if (key === "sell" || key === "strongSell") return "down";
  return "default";
}

export function StreetPanel({
  analysts,
  spot,
  onSeed,
}: {
  analysts: AnalystConsensus;
  spot: number;
  onSeed: () => void;
}) {
  const upside = (analysts.targetMean - spot) / spot;
  const disagreement = (analysts.targetHigh - analysts.targetLow) / analysts.targetMean;
  const disLabel = disagreement > 0.4 ? "wide disagreement" : disagreement > 0.2 ? "moderate spread" : "tight consensus";

  const r = analysts.ratings;
  const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell || 1;
  const segs = [
    { n: r.strongBuy, c: "bg-up", label: "Strong buy" },
    { n: r.buy, c: "bg-up/55", label: "Buy" },
    { n: r.hold, c: "bg-faint", label: "Hold" },
    { n: r.sell, c: "bg-down/55", label: "Sell" },
    { n: r.strongSell, c: "bg-down", label: "Strong sell" },
  ];

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <Users className="h-3.5 w-3.5 text-violet" />
          The Street · analyst models
        </PanelTitle>
        <div className="flex items-center gap-2">
          <Badge variant="violet">{analysts.numAnalysts} analysts</Badge>
          <InfoHint>
            The aggregate of every covering analyst&apos;s model, kept as a distribution instead of one
            mean target. Free Yahoo data; ~12-month target horizon (the named per-firm targets need a
            paid feed, and the full Excel models are licensed via Visible Alpha / Bloomberg).
          </InfoHint>
        </div>
      </PanelHeader>
      <PanelBody className="space-y-4">
        {/* headline */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Mean target · ~12mo</span>
            <span className="mono text-2xl font-bold leading-none text-violet">{fmtMoney(analysts.targetMean)}</span>
            <span className={`mono text-[13px] ${upside >= 0 ? "text-up" : "text-down"}`}>
              {fmtSignedPct(upside)} vs spot
            </span>
          </div>
          <Badge variant={ratingTone(analysts.recommendationKey) === "up" ? "up" : ratingTone(analysts.recommendationKey) === "down" ? "down" : "default"}>
            {KEY_LABEL[analysts.recommendationKey] ?? analysts.recommendationKey}
          </Badge>
        </div>

        {/* dispersion bar */}
        <DispersionBar
          low={analysts.targetLow}
          mean={analysts.targetMean}
          median={analysts.targetMedian}
          high={analysts.targetHigh}
          spot={spot}
        />

        <div className="mono text-[12px] text-muted">
          Range {fmtMoney(analysts.targetLow, 0)}–{fmtMoney(analysts.targetHigh, 0)} ·{" "}
          <span className="text-fg">{fmtPct(disagreement, 0)}</span> spread ({disLabel})
        </div>

        {/* rating distribution */}
        <div className="space-y-1.5">
          <div className="flex h-2 w-full overflow-hidden rounded-sm">
            {segs.map(
              (s, i) => s.n > 0 && <div key={i} className={s.c} style={{ width: `${(s.n / total) * 100}%` }} title={`${s.label}: ${s.n}`} />,
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-faint">
            <span><span className="text-up">{r.strongBuy + r.buy}</span> buy</span>
            <span><span className="text-muted">{r.hold}</span> hold</span>
            <span><span className="text-down">{r.sell + r.strongSell}</span> sell</span>
            {analysts.epsNext && (
              <span className="ml-auto">
                next-Q EPS est <span className="mono text-muted">{fmtMoney(analysts.epsNext.avg)}</span> ({fmtMoney(analysts.epsNext.low)}–{fmtMoney(analysts.epsNext.high)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-[11px] leading-snug text-faint">
            Seed Bull/Base/Bear from the Street, scaled to your selected expiry.
          </span>
          <Button variant="accent" size="sm" onClick={onSeed}>
            Seed my view →
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

function DispersionBar({
  low,
  mean,
  median,
  high,
  spot,
}: {
  low: number;
  mean: number;
  median: number;
  high: number;
  spot: number;
}) {
  const min = Math.min(low, spot);
  const max = Math.max(high, spot);
  const pad = (max - min) * 0.07 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const span = hi - lo || 1;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / span) * 100))}%`;

  return (
    <div className="relative h-14 select-none">
      {/* mean value label */}
      <div className="absolute top-0 -translate-x-1/2" style={{ left: pct(mean) }}>
        <span className="mono text-[12px] text-violet">{fmtMoney(mean, 0)}</span>
      </div>

      {/* track */}
      <div className="absolute left-0 right-0 top-7 h-1.5 rounded-full bg-line">
        <div
          className="absolute h-full rounded-full bg-violet/30"
          style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }}
        />
        <div className="absolute -top-1 h-3.5 w-0.5 bg-violet" style={{ left: pct(mean) }} />
        <div className="absolute -top-0.5 h-2.5 w-px bg-violet/60" style={{ left: pct(median) }} />
        <div className="absolute -top-1 h-3.5 w-0.5 bg-fg" style={{ left: pct(spot) }} />
      </div>

      {/* bottom labels */}
      <div className="absolute bottom-0 left-0 mono text-[11px] text-faint">{fmtMoney(low, 0)}</div>
      <div className="absolute bottom-0 -translate-x-1/2 mono text-[11px] text-fg" style={{ left: pct(spot) }}>
        now {fmtMoney(spot, 0)}
      </div>
      <div className="absolute bottom-0 right-0 mono text-[11px] text-faint">{fmtMoney(high, 0)}</div>
    </div>
  );
}
