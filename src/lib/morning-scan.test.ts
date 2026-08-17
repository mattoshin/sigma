import { describe, expect, it, vi } from "vitest";
import { UNIVERSE } from "@/lib/config";
import { buildTickerAnalysis } from "@/lib/analysis";
import { loadSnapshot } from "@/lib/data/snapshots";
import { MORNING_SCAN_ARTIFACT } from "@/lib/ai/morning-scan-artifact";
import * as fredProvider from "@/lib/data/providers/fred";
import { compareEdgeSignals, getScreenerRows } from "@/lib/screener";
import {
  buildMorningScanRows,
  morningScanDigest,
  validatedMorningBrief,
} from "@/lib/morning-scan";

describe("AI Morning Scan", () => {
  it("ships a complete 16-name deterministic snapshot universe", () => {
    expect(UNIVERSE).toHaveLength(16);
    expect(UNIVERSE.every((entry) => loadSnapshot(entry.ticker) !== null)).toBe(true);
  });

  it("produces a valid 30-day analysis row for every curated symbol", async () => {
    const fredSpy = vi.spyOn(fredProvider, "getRiskFreeRate");
    const analyses = await Promise.all(
      UNIVERSE.map((entry) => buildTickerAnalysis(entry.ticker, { snapshotOnly: true })),
    );
    expect(analyses).toHaveLength(16);
    expect(
      analyses.every((analysis) =>
        analysis.expiries.some((expiry) => expiry.dte >= 25 && expiry.dte <= 45),
      ),
    ).toBe(true);
    expect(fredSpy).not.toHaveBeenCalled();
    fredSpy.mockRestore();
  });

  it("preserves legacy screener sorting and rejects unknown snapshot tickers", async () => {
    const screener = await getScreenerRows({ snapshotOnly: true });
    expect(screener.every((row, index) => index === 0 || screener[index - 1].vrp >= row.vrp)).toBe(
      true,
    );
    await expect(buildTickerAnalysis("NOTREAL", { snapshotOnly: true })).rejects.toThrow(
      "No snapshot",
    );
  });

  it("applies divergence, absolute-edge, then ticker tie-breaks", () => {
    const signals = [
      { ticker: "ZZZ", edgePct: 0.02, divergenceScore: 0.2 },
      { ticker: "BBB", edgePct: -0.04, divergenceScore: 0.2 },
      { ticker: "AAA", edgePct: 0.04, divergenceScore: 0.2 },
      { ticker: "TOP", edgePct: 0.01, divergenceScore: 0.3 },
    ];
    expect(signals.sort(compareEdgeSignals).map((signal) => signal.ticker)).toEqual([
      "TOP",
      "AAA",
      "BBB",
      "ZZZ",
    ]);
  });

  it("ranks exactly three signals by divergence, then absolute edge", async () => {
    const rows = await buildMorningScanRows();
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.ticker)).toEqual(["SPY", "TSLA", "COIN"]);
    expect(new Set(rows.map((row) => row.snapshotAsOf)).size).toBe(1);
    expect(rows[0].divergenceScore).toBeGreaterThanOrEqual(rows[1].divergenceScore);
    expect(rows[1].divergenceScore).toBeGreaterThanOrEqual(rows[2].divergenceScore);
    rows.forEach((row) => {
      const densities = [...row.curves.market, ...row.curves.street].map(
        (point) => point.density,
      );
      expect(Math.max(...densities)).toBeCloseTo(1);
      expect(Math.min(...densities)).toBeGreaterThanOrEqual(0);
    });
  });

  it("accepts the fresh AI artifact and grounds every citation in row evidence", async () => {
    const rows = await buildMorningScanRows();
    expect(morningScanDigest(rows)).toBe(MORNING_SCAN_ARTIFACT.inputDigest);

    const brief = validatedMorningBrief(rows);
    expect(brief.source).toBe("ai-artifact");
    brief.items.forEach((item, index) => {
      const validIds = new Set(rows[index].evidence.map((evidence) => evidence.id));
      expect(item.ticker).toBe(rows[index].ticker);
      expect(item.evidenceIds.every((id) => validIds.has(id))).toBe(true);
    });
  });

  it("canonicalizes object keys and rejects unsupported numeric values", async () => {
    const rows = await buildMorningScanRows();
    const reordered = rows.map(
      (row) => Object.fromEntries(Object.entries(row).reverse()) as unknown as typeof row,
    );
    expect(morningScanDigest(reordered)).toBe(morningScanDigest(rows));
    const platformNoise = rows.map((row, index) =>
      index === 0 ? { ...row, divergenceScore: row.divergenceScore + 1e-13 } : row,
    );
    expect(morningScanDigest(platformNoise)).toBe(morningScanDigest(rows));
    expect(() => morningScanDigest([{ ...rows[0], spot: Number.NaN }, ...rows.slice(1)])).toThrow(
      "non-finite number",
    );
    expect(() =>
      morningScanDigest([{ ...rows[0], unsupported: undefined }, ...rows.slice(1)] as typeof rows),
    ).toThrow("Unsupported Morning Scan digest value");
  });

  it("falls back when quantitative inputs or artifact versions change", async () => {
    const rows = await buildMorningScanRows();
    const changedRows = rows.map((row, index) =>
      index === 0 ? { ...row, divergenceScore: row.divergenceScore + 0.001 } : row,
    );
    expect(validatedMorningBrief(changedRows).source).toBe("deterministic-fallback");

    const staleArtifact = { ...MORNING_SCAN_ARTIFACT, promptVersion: "old-prompt" };
    expect(validatedMorningBrief(rows, staleArtifact).source).toBe("deterministic-fallback");

    const reorderedArtifact = {
      ...MORNING_SCAN_ARTIFACT,
      items: [...MORNING_SCAN_ARTIFACT.items].reverse(),
    };
    expect(validatedMorningBrief(rows, reorderedArtifact).source).toBe("deterministic-fallback");

    const unknownEvidenceArtifact = {
      ...MORNING_SCAN_ARTIFACT,
      items: MORNING_SCAN_ARTIFACT.items.map((item, index) =>
        index === 0 ? { ...item, evidenceIds: ["SPY:not-real", ...item.evidenceIds.slice(1)] } : item,
      ),
    };
    expect(validatedMorningBrief(rows, unknownEvidenceArtifact).source).toBe(
      "deterministic-fallback",
    );

    const extraFieldArtifact = { ...MORNING_SCAN_ARTIFACT, unexpected: true };
    expect(validatedMorningBrief(rows, extraFieldArtifact).source).toBe("deterministic-fallback");
  });
});
