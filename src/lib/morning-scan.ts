import { createHash } from "node:crypto";
import { z } from "zod";
import { UNIVERSE } from "@/lib/config";
import { SNAPSHOT_COHORT } from "@/lib/data/snapshots";
import { getEdgeRadarRows } from "@/lib/screener";
import { MORNING_SCAN_ARTIFACT } from "@/lib/ai/morning-scan-artifact";
import {
  MORNING_SCAN_MODEL,
  MORNING_SCAN_PROMPT_VERSION,
  MORNING_SCAN_SCHEMA_VERSION,
  type MorningScanBrief,
  type MorningScanEvidence,
  type MorningScanRow,
} from "@/lib/morning-scan-contract";

const ArtifactSchema = z
  .object({
    generatedAt: z.string().datetime(),
    model: z.literal(MORNING_SCAN_MODEL),
    promptVersion: z.literal(MORNING_SCAN_PROMPT_VERSION),
    schemaVersion: z.literal(MORNING_SCAN_SCHEMA_VERSION),
    inputDigest: z.string().regex(/^[a-f0-9]{64}$/),
    summary: z.string().min(40).max(700),
    items: z
      .array(
        z
          .object({
            ticker: z.string().min(1).max(6),
            thesis: z.string().min(40).max(700),
            nextQuestion: z.string().min(20).max(300),
            evidenceIds: z.array(z.string()).min(2).max(4),
          })
          .strict(),
      )
      .length(3),
  })
  .strict();

function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function evidenceFor(row: Omit<MorningScanRow, "rank" | "evidence">): MorningScanEvidence[] {
  const evidence: MorningScanEvidence[] = [
    {
      id: `${row.ticker}:divergence`,
      label: "Shape gap",
      value: pct(row.divergenceScore, 0),
      detail: "Total-variation distance between Street and options-implied distributions.",
    },
    {
      id: `${row.ticker}:edge`,
      label: "Street vs forward",
      value: `${row.edgePct >= 0 ? "+" : ""}${pct(row.edgePct)}`,
      detail: "Street distribution mean relative to the risk-neutral forward.",
    },
    {
      id: `${row.ticker}:iv`,
      label: "ATM implied vol",
      value: pct(row.atmIV),
      detail: `${row.dte}-day at-the-money implied volatility from the snapshot chain.`,
    },
    {
      id: `${row.ticker}:vrp`,
      label: "IV minus RV",
      value: `${row.vrp >= 0 ? "+" : ""}${(row.vrp * 100).toFixed(1)} pts`,
      detail: "Implied volatility less trailing 30-day realized volatility.",
    },
  ];

  if (row.catalyst) {
    evidence.push({
      id: `${row.ticker}:catalyst`,
      label: "Catalyst",
      value: row.catalyst,
      detail: "Confirmed catalyst inside the selected option horizon.",
    });
  }

  return evidence;
}

export async function buildMorningScanRows(): Promise<MorningScanRow[]> {
  const ranked = await getEdgeRadarRows({ snapshotOnly: true, includeCurves: true });
  return ranked.slice(0, 3).map((row, index) => {
    const base = {
      rank: index + 1,
      ticker: row.ticker,
      name: row.name,
      sector: UNIVERSE.find((entry) => entry.ticker === row.ticker)?.sector ?? "Other",
      spot: row.spot,
      forward: row.forward,
      streetMean: row.modelMean,
      edgePct: row.edgePct,
      divergenceScore: row.divergenceScore,
      bestStructure: row.bestStructure,
      bestStructureEdgePct: row.bestStructureEdgePct,
      atmIV: row.atmIV,
      realizedVol: row.realizedVol,
      vrp: row.vrp,
      expectedMovePct: row.expectedMovePct,
      dte: row.dte,
      catalyst: row.nextCatalyst?.label ?? null,
      snapshotAsOf: SNAPSHOT_COHORT.asOf,
      curves: row.curves ?? { market: [], street: [] },
    };
    return { ...base, evidence: evidenceFor(base) };
  });
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Morning Scan digest contains a non-finite number");
    const stableValue = Object.is(value, -0) ? 0 : Number(value.toPrecision(12));
    return JSON.stringify(stableValue);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported Morning Scan digest value: ${typeof value}`);
}

function canonicalInput(rows: MorningScanRow[]): string {
  const narrativeRows = rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => key !== "curves")),
  );
  return canonicalJson({
    model: MORNING_SCAN_MODEL,
    promptVersion: MORNING_SCAN_PROMPT_VERSION,
    schemaVersion: MORNING_SCAN_SCHEMA_VERSION,
    rows: narrativeRows,
  });
}

export function morningScanDigest(rows: MorningScanRow[]): string {
  return createHash("sha256").update(canonicalInput(rows)).digest("hex");
}

export function deterministicBrief(rows: MorningScanRow[]): MorningScanBrief {
  return {
    generatedAt: new Date().toISOString(),
    model: "Riptide deterministic fallback",
    promptVersion: MORNING_SCAN_PROMPT_VERSION,
    schemaVersion: MORNING_SCAN_SCHEMA_VERSION,
    inputDigest: morningScanDigest(rows),
    summary:
      "The scan completed, but its saved AI artifact no longer matches the quantitative input. The ranked evidence below remains valid and deterministic.",
    items: rows.map((row) => ({
      ticker: row.ticker,
      thesis: `${row.ticker} ranks #${row.rank} with a ${(row.divergenceScore * 100).toFixed(0)}% shape gap and a ${row.edgePct >= 0 ? "positive" : "negative"} Street-to-forward difference.`,
      nextQuestion: "Which part of the distribution creates the disagreement, and what evidence would close it?",
      evidenceIds: row.evidence.slice(0, 2).map((item) => item.id),
    })),
    source: "deterministic-fallback",
  };
}

export function validatedMorningBrief(
  rows: MorningScanRow[],
  artifact: unknown = MORNING_SCAN_ARTIFACT,
): MorningScanBrief {
  const parsed = ArtifactSchema.safeParse(artifact);
  const expectedDigest = morningScanDigest(rows);
  if (!parsed.success || parsed.data.inputDigest !== expectedDigest) return deterministicBrief(rows);

  const exactOrder = rows.every((row, index) => parsed.data.items[index]?.ticker === row.ticker);
  const evidenceGrounded = parsed.data.items.every((item, index) => {
    const validIds = new Set(rows[index].evidence.map((evidence) => evidence.id));
    return item.evidenceIds.every((id) => validIds.has(id));
  });
  if (!exactOrder || !evidenceGrounded) return deterministicBrief(rows);

  return { ...parsed.data, source: "ai-artifact" };
}
