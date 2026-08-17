"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  Check,
  Database,
  GitCompareArrows,
  LoaderCircle,
  Play,
  Radar,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type {
  MorningScanBrief,
  MorningScanBriefItem,
  MorningScanRow,
  MorningScanStageId,
} from "@/lib/morning-scan-contract";
import { consumeMorningScanStream } from "@/lib/morning-scan-client";

const STAGES: { id: MorningScanStageId; label: string; detail: string; icon: typeof Database }[] = [
  { id: "chains", label: "Load chains", detail: "16 snapshots", icon: Database },
  { id: "distributions", label: "Build curves", detail: "Q vs Street", icon: GitCompareArrows },
  { id: "ranking", label: "Rank gaps", detail: "TV distance", icon: Radar },
  { id: "ai", label: "Synthesize", detail: "AI hypothesis", icon: BrainCircuit },
];

type StageStatus = "waiting" | "running" | "complete";

interface CompleteState {
  rows: MorningScanRow[];
  brief: MorningScanBrief;
  asOf: string;
  universeSize: number;
  durationMs: number;
  snapshotCohort: string;
}

function DistributionSpark({ row }: { row: MorningScanRow }) {
  const allPrices = [...row.curves.market, ...row.curves.street].map((point) => point.price);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const span = Math.max(maxPrice - minPrice, 1);
  const curve = (points: MorningScanRow["curves"]["market"]) =>
    points
      .map((point) => {
        const x = ((point.price - minPrice) / span) * 128;
        return `${x.toFixed(1)},${(52 - point.density * 42).toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg viewBox="0 0 128 58" className="h-16 w-full" role="img" aria-label={`${row.ticker} options-implied and Street distributions`}>
      <line x1="0" y1="52" x2="128" y2="52" stroke="var(--line2)" />
      <polyline className="scan-curve scan-curve-market" points={curve(row.curves.market)} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <polyline className="scan-curve scan-curve-street" points={curve(row.curves.street)} fill="none" stroke="var(--warn)" strokeWidth="2" />
    </svg>
  );
}

function StageRail({ stages }: { stages: Record<MorningScanStageId, StageStatus> }) {
  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden border-y border-line bg-line lg:grid-cols-4">
      {STAGES.map((stage, index) => {
        const status = stages[stage.id];
        const Icon = stage.icon;
        return (
          <li key={stage.id} className={`scan-stage scan-stage-${status} bg-canvas/95 px-3 py-3`}>
            <div className="flex items-center gap-2.5">
              <span className="mono text-[10px] text-faint">0{index + 1}</span>
              <Icon className="h-3.5 w-3.5" />
              <span className="mono text-[11px] font-semibold uppercase tracking-[0.12em]">{stage.label}</span>
              {status === "complete" ? (
                <Check className="ml-auto h-3.5 w-3.5" />
              ) : status === "running" ? (
                <LoaderCircle className="ml-auto h-3.5 w-3.5 animate-spin" />
              ) : null}
            </div>
            <div className="mono mt-1.5 pl-[54px] text-[10px] uppercase tracking-wider text-faint">{stage.detail}</div>
          </li>
        );
      })}
    </ol>
  );
}

function RankedSignal({ row, briefItem }: { row: MorningScanRow; briefItem?: MorningScanBriefItem }) {
  const citedEvidence = briefItem
    ? briefItem.evidenceIds
        .map((id) => row.evidence.find((evidence) => evidence.id === id))
        .filter((evidence): evidence is MorningScanRow["evidence"][number] => Boolean(evidence))
    : row.evidence.slice(0, 3);
  return (
    <article className={`scan-result group relative overflow-hidden border border-line bg-panel/70 ${row.rank === 1 ? "lg:col-span-2" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="grid h-full gap-4 p-4 sm:grid-cols-[1fr_148px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="mono text-[10px] text-accent">#{row.rank.toString().padStart(2, "0")}</span>
            <Link href={`/t/${row.ticker}`} className="display text-2xl font-semibold text-fg transition-colors hover:text-accent">
              {row.ticker}
            </Link>
            <span className="eyebrow truncate">{row.sector}</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-faint" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{briefItem?.thesis ?? "Quantitative signal ready for review."}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {citedEvidence.map((evidence) => (
              <span key={evidence.id} title={evidence.detail} className="mono rounded-sm border border-line bg-canvas/60 px-2 py-1 text-[10px] uppercase tracking-wider text-muted">
                {evidence.label} <strong className="ml-1 font-medium text-fg">{evidence.value}</strong>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <DistributionSpark row={row} />
          <div className="mono flex items-center justify-between text-[9px] uppercase tracking-wider text-faint">
            <span className="text-accent">Options market (Q)</span>
            <span className="text-warn">Street (P proxy)</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="eyebrow">Divergence</span>
            <span className="mono text-lg font-semibold text-accent">{(row.divergenceScore * 100).toFixed(0)}</span>
          </div>
        </div>
      </div>
      <div className="mono border-t border-line px-4 py-2 text-[10px] uppercase tracking-wider text-faint">
        Best tested expression <span className="ml-2 text-fg">{row.bestStructure}</span>
        <span className={`ml-2 ${row.bestStructureEdgePct >= 0 ? "text-up" : "text-down"}`}>
          {row.bestStructureEdgePct >= 0 ? "+" : ""}
          {(row.bestStructureEdgePct * 100).toFixed(1)}% EV / cost
        </span>
        <span className="ml-2 text-muted">Expected move ±{(row.expectedMovePct * 100).toFixed(1)}%</span>
      </div>
    </article>
  );
}

export function MorningScan({ tickers }: { tickers: string[] }) {
  const [status, setStatus] = React.useState<"idle" | "running" | "complete" | "fallback" | "error">("idle");
  const [stages, setStages] = React.useState<Record<MorningScanStageId, StageStatus>>({
    chains: "waiting",
    distributions: "waiting",
    ranking: "waiting",
    ai: "waiting",
  });
  const [rankedRows, setRankedRows] = React.useState<MorningScanRow[]>([]);
  const [aiText, setAiText] = React.useState("");
  const [complete, setComplete] = React.useState<CompleteState | null>(null);
  const [error, setError] = React.useState("");
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const runScan = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("running");
    setStages({ chains: "waiting", distributions: "waiting", ranking: "waiting", ai: "waiting" });
    setRankedRows([]);
    setAiText("");
    setComplete(null);
    setError("");

    try {
      const response = await fetch("/api/ai/morning-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: controller.signal,
      });
      const outcome = await consumeMorningScanStream(response, controller.signal, (event) => {
        if (event.type === "stage") {
          setStages((current) => ({ ...current, [event.stage]: event.status }));
        } else if (event.type === "ranking") {
          setRankedRows((current) => [...current, event.row]);
        } else if (event.type === "text_delta") {
          setAiText((current) => current + event.text);
        }
      });

      if (outcome.status === "complete") {
        setComplete(outcome.event);
        if (outcome.event.brief.source === "deterministic-fallback") {
          setError("The saved AI brief was unavailable. Deterministic rankings were preserved.");
          setStatus("fallback");
        } else {
          setStatus("complete");
        }
      } else if (outcome.status === "fallback") {
        setRankedRows(outcome.rows);
        setError(outcome.message);
        setStatus("fallback");
      } else {
        throw new Error(outcome.message);
      }
    } catch (scanError) {
      if (controller.signal.aborted) return;
      setError(scanError instanceof Error ? scanError.message : "Scan failed");
      setStatus("error");
    }
  }, []);

  const visibleRows = complete?.rows ?? rankedRows;

  return (
    <section id="morning-scan" className="relative overflow-hidden border-b border-line scan-hero">
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div className={`scan-sonar ${status === "running" ? "scan-sonar-active" : ""}`} aria-hidden>
        <span /><span /><span /><i />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:py-14">
        <div className="grid items-end gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="eyebrow text-accent">AI Morning Scan · 30-day horizon</span>
            </div>
            <h1 className="display mt-5 max-w-3xl text-[clamp(2.7rem,5.7vw,5.4rem)] font-semibold leading-[0.93] tracking-[-0.055em] text-fg">
              Find where Street expectations <span className="scan-outline">break</span> from the market.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Riptide turns option chains into probability distributions, ranks the widest disagreements, then uses AI to frame the next research question.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runScan}
                disabled={status === "running"}
                className="scan-cta mono inline-flex h-11 items-center gap-2.5 rounded-sm bg-accent px-5 text-xs font-bold uppercase tracking-[0.14em] text-canvas transition hover:bg-fg disabled:cursor-wait disabled:opacity-80"
              >
                {status === "running" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : status === "complete" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                {status === "running" ? "Scanning universe" : status === "complete" ? "Run it again" : "Run AI Morning Scan"}
              </button>
              <span className="mono text-[11px] uppercase tracking-wider text-faint">16 names · 4 quant stages · zero live dependencies</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-md border border-line2 bg-canvas/75 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${status === "running" ? "bg-accent pulse-dot" : status === "complete" ? "bg-up" : "bg-faint"}`} />
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted">Riptide signal engine</span>
              </div>
              <span className="mono text-[10px] text-faint">SNAPSHOT / DELAYED</span>
            </div>
            <StageRail stages={stages} />
            <div className="relative min-h-[304px] p-4">
              {status === "idle" ? (
                <div className="flex min-h-[270px] flex-col justify-between">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {tickers.map((ticker, index) => (
                      <span key={ticker} className="scan-ticker mono text-center text-[10px] font-semibold tracking-wider text-faint" style={{ animationDelay: `${index * 55}ms` }}>
                        {ticker}
                      </span>
                    ))}
                  </div>
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.03]">
                    <Radar className="h-10 w-10 text-accent/70" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Awaiting instruction</span>
                    <span className="mono text-[10px] text-faint">READY</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2" aria-live="polite">
                  {visibleRows.map((row) => (
                    <div key={row.ticker} className="scan-mini-result grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-line py-3 last:border-0">
                      <span className="mono text-[10px] text-accent">0{row.rank}</span>
                      <div>
                        <div className="mono text-sm font-semibold text-fg">{row.ticker}</div>
                        <div className="mt-0.5 text-xs text-faint">{row.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="mono text-sm text-accent">{(row.divergenceScore * 100).toFixed(0)}</div>
                        <div className="eyebrow">shape gap</div>
                      </div>
                    </div>
                  ))}
                  {stages.ai === "running" && (
                    <div className="mt-3 flex gap-2 border-t border-violet/20 pt-3 text-xs leading-relaxed text-muted">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" />
                      <span>{aiText || "Synthesizing evidence-grounded hypotheses..."}</span>
                    </div>
                  )}
                  {(status === "error" || status === "fallback") && (
                    <div className={`mono py-5 text-center text-xs ${status === "error" ? "text-down" : "text-warn"}`}>
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {complete && (
          <div className="scan-results-enter mt-10 border-t border-line pt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="eyebrow text-accent">Scan complete · {complete.durationMs}ms</div>
                <h2 className="display mt-1 text-2xl font-semibold text-fg">Three gaps worth investigating now</h2>
              </div>
              <div className="mono text-[10px] uppercase tracking-wider text-faint">
                {complete.universeSize} names · {complete.snapshotCohort} · computed {new Date(complete.asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {complete.rows.map((row, index) => (
                <RankedSignal key={row.ticker} row={row} briefItem={complete.brief.items[index]} />
              ))}
            </div>
            <div className="mt-3 grid gap-3 border border-violet/25 bg-violet/[0.04] p-4 lg:grid-cols-[200px_1fr]">
              <div>
                <div className="flex items-center gap-2 text-violet">
                  <Sparkles className="h-4 w-4" />
                  <span className="eyebrow text-violet">
                    {complete.brief.source === "ai-artifact" ? "AI research brief" : "Demo brief"}
                  </span>
                </div>
                <div className="mono mt-2 text-[10px] uppercase leading-relaxed tracking-wider text-faint">
                  {complete.brief.model}<br />
                  {complete.brief.source === "ai-artifact"
                    ? `Generated ${new Date(complete.brief.generatedAt).toLocaleDateString()} · unverified hypothesis`
                    : "AI artifact unavailable"}
                </div>
              </div>
              <div>
                <p className="text-sm leading-relaxed text-fg">{complete.brief.summary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {complete.brief.items.map((item) => (
                    <Link key={item.ticker} href={`/t/${item.ticker}`} className="group border-l border-violet/30 pl-3 text-xs leading-relaxed text-muted hover:text-fg">
                      <span className="mono block text-[10px] font-semibold text-violet">NEXT / {item.ticker}</span>
                      {item.nextQuestion}
                      <ArrowUpRight className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
