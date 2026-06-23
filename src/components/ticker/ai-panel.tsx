"use client";

import * as React from "react";
import { Sparkles, AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { AIScenarioResult, Scenario } from "@/lib/types";

/** Hard ceiling on a single AI generation so a slow model never hangs the UI. */
const AI_TIMEOUT_MS = 45_000;

/** A 503 / missing-key response means the key is unset at runtime, not a transient error. */
const NOT_CONFIGURED = "__ai_not_configured__";

/**
 * POST the scenario request with a client-side timeout. Distinguishes three
 * outcomes: a parsed result, the "not configured" sentinel, or a thrown Error
 * whose message is safe to surface to the user.
 */
async function requestScenarios(body: { ticker: string; expiryIndex: number }): Promise<AIScenarioResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch("/api/ai/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const msg: string = payload.error ?? `Request failed (${res.status})`;
      // The endpoint returns 503 when ANTHROPIC_API_KEY is unset.
      if (res.status === 503 || /not configured|api[_ ]?key/i.test(msg)) {
        throw new Error(NOT_CONFIGURED);
      }
      throw new Error(msg);
    }
    return (await res.json()) as AIScenarioResult;
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error(`The model took longer than ${AI_TIMEOUT_MS / 1000}s to respond. Try again.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function AIPanel({
  ticker,
  expiryIndex,
  aiEnabled,
  onApply,
}: {
  ticker: string;
  expiryIndex: number;
  aiEnabled: boolean;
  onApply: (scenarios: Scenario[]) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AIScenarioResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Runtime detection: the key can be unset even when the server thought it was enabled.
  const [notConfigured, setNotConfigured] = React.useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestScenarios({ ticker, expiryIndex });
      setResult(res);
    } catch (e) {
      if ((e as Error).message === NOT_CONFIGURED) {
        setNotConfigured(true);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show the graceful "not configured" state if the prop says so or we hit a 503 at runtime.
  const aiUnavailable = !aiEnabled || notConfigured;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>AI analyst · anchored scenario tree</PanelTitle>
        <Badge variant="violet">Anchored to implied</Badge>
      </PanelHeader>
      <PanelBody className="space-y-3">
        <p className="text-[13px] leading-snug text-muted">
          The model is handed the options-implied (risk-neutral) probabilities as a base rate and must
          anchor to them. We never surface a bare model probability, production LLMs are
          systematically overconfident, so we correct for it by construction.
        </p>

        {aiUnavailable ? (
          <div className="rounded-sm border border-line bg-panel2 px-3 py-2 text-[13px] text-faint">
            Set <span className="mono text-muted">ANTHROPIC_API_KEY</span> to enable the AI analyst.
            The rest of the terminal works without it.
          </div>
        ) : (
          <Button variant="accent" size="sm" onClick={generate} disabled={loading} aria-busy={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Reasoning…" : result ? "Regenerate" : "Generate scenarios"}
          </Button>
        )}

        {loading && (
          <div className="flex items-center gap-1.5 text-[12px] text-faint" role="status">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Anchoring to the implied distribution… this can take a few seconds.</span>
          </div>
        )}

        {error && !aiUnavailable && (
          <div className="space-y-2 rounded-sm border border-down/40 bg-down/10 px-3 py-2 text-[13px] text-down">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={loading}
              className="border-down/40 text-down hover:bg-down/10"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {result.scenarios.map((s) => (
                <div key={s.id} className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="mono text-sm text-fg">
                      {s.label} · {fmtMoney(s.price)}
                    </span>
                    <Badge variant="violet">{fmtPct(s.probability, 0)}</Badge>
                  </div>
                  {s.rationale && <p className="mt-0.5 text-[12px] leading-snug text-faint">{s.rationale}</p>}
                </div>
              ))}
            </div>

            <div className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] leading-snug text-muted">
              <span className="text-violet">Anchor · </span>
              {result.anchorNote}
            </div>

            {result.evidence.length > 0 && (
              <ul className="space-y-0.5 text-[12px] text-faint">
                {result.evidence.map((e, i) => (
                  <li key={i}>
                    • {e.point} <span className="text-faint/70">({e.source})</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-start gap-1.5 text-[12px] leading-snug text-warn">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{result.caveat}</span>
            </div>

            <Button variant="outline" size="sm" onClick={() => onApply(result.scenarios)}>
              Apply to studio →
            </Button>
            <div className="mono text-[11px] text-faint">model: {result.model}</div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
