"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Target, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { fmtMoney, fmtPct } from "@/lib/format";

export function TrackCallDialog({
  ticker,
  horizon,
  forward,
  subjectiveProbAbove,
  marketProbAbove,
}: {
  ticker: string;
  horizon: string;
  forward: number;
  subjectiveProbAbove: number;
  marketProbAbove: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [predicted, setPredicted] = React.useState(subjectiveProbAbove);
  const [done, setDone] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setPredicted(subjectiveProbAbove), [subjectiveProbAbove, open]);

  const claim = `${ticker}: P(S_T > ${fmtMoney(forward)} by ${horizon})`;

  const submit = async () => {
    setSaving(true);
    try {
      await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          horizon,
          claim,
          predictedProb: predicted,
          marketImpliedProb: marketProbAbove,
        }),
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setDone(false);
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="accent" size="sm">
          <Target className="h-3.5 w-3.5" />
          Track this call
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-line2 bg-panel p-4 shadow-2xl">
          <Dialog.Title className="text-base font-semibold text-fg">Track a probabilistic call</Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] leading-snug text-muted">
            Log your probability now; we score it against the outcome later. Calibration measures
            decision quality independent of whether this one call hits.
          </Dialog.Description>

          {done ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-sm border border-up/40 bg-up/10 px-3 py-2 text-sm text-up">
                <Check className="h-4 w-4" /> Call logged. It will appear on your scorecard.
              </div>
              <Link href="/calibration" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  View calibration scorecard →
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-sm border border-line bg-panel2 px-3 py-2">
                <div className="mono text-sm text-fg">{claim}</div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-muted">Your probability</span>
                  <span className="mono text-accent">{fmtPct(predicted, 0)}</span>
                </div>
                <Slider value={[predicted]} min={0} max={1} step={0.01} onValueChange={([v]) => setPredicted(v)} />
                <div className="mt-1 flex justify-between text-[12px] text-faint">
                  <span className="mono">market-implied: {fmtPct(marketProbAbove, 0)}</span>
                  <span
                    className="mono"
                    style={{ color: predicted >= marketProbAbove ? "var(--up)" : "var(--down)" }}
                  >
                    your edge: {fmtPct(predicted - marketProbAbove, 0)}
                  </span>
                </div>
              </div>

              <Button variant="accent" size="sm" onClick={submit} disabled={saving} className="w-full">
                {saving ? "Saving…" : "Log call"}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
