import metadata from "@/lib/ai/morning-scan-metadata.json";

export const MORNING_SCAN_SCHEMA_VERSION = metadata.schemaVersion;
export const MORNING_SCAN_PROMPT_VERSION = metadata.promptVersion;
export const MORNING_SCAN_MODEL = metadata.model;

export type MorningScanStageId = "chains" | "distributions" | "ranking" | "ai";

export interface MorningScanEvidence {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface MorningScanRow {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  spot: number;
  forward: number;
  streetMean: number;
  edgePct: number;
  divergenceScore: number;
  bestStructure: string;
  bestStructureEdgePct: number;
  atmIV: number;
  realizedVol: number;
  vrp: number;
  expectedMovePct: number;
  dte: number;
  catalyst: string | null;
  snapshotAsOf: string;
  curves: {
    market: { price: number; density: number }[];
    street: { price: number; density: number }[];
  };
  evidence: MorningScanEvidence[];
}

export interface MorningScanBriefItem {
  ticker: string;
  thesis: string;
  nextQuestion: string;
  evidenceIds: string[];
}

export interface MorningScanBrief {
  generatedAt: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  inputDigest: string;
  summary: string;
  items: MorningScanBriefItem[];
  source: "ai-artifact" | "deterministic-fallback";
}

export type MorningScanEvent =
  | { type: "stage"; stage: MorningScanStageId; status: "running" | "complete" }
  | { type: "ranking"; row: MorningScanRow }
  | { type: "text_delta"; text: string }
  | {
      type: "complete";
      rows: MorningScanRow[];
      brief: MorningScanBrief;
      asOf: string;
      universeSize: number;
      durationMs: number;
      snapshotCohort: string;
    }
  | { type: "error"; message: string };
