/**
 * Developer-only AI artifact generator.
 *
 * Start the app, then run: pnpm generate:morning-scan
 * The public Morning Scan route never runs Codex or reads model credentials.
 */
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_URL = process.env.RIPTIDE_APP_URL ?? "http://localhost:3000";
const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT = join(ROOT, "src", "lib", "ai", "morning-scan-artifact.ts");
const METADATA = JSON.parse(
  readFileSync(join(ROOT, "src", "lib", "ai", "morning-scan-metadata.json"), "utf8"),
);

const response = await fetch(`${APP_URL}/api/ai/morning-scan`, {
  method: "POST",
  headers: { Origin: APP_URL, "Content-Type": "application/json" },
  body: "{}",
});
if (!response.ok) throw new Error(`Morning Scan returned ${response.status}`);
const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
const complete = events.find((event) => event.type === "complete");
if (!complete) throw new Error("Morning Scan did not emit a complete event");

const tickers = complete.rows.map((row) => row.ticker);
const narrativeRows = complete.rows.map((row) =>
  Object.fromEntries(Object.entries(row).filter(([key]) => key !== "curves")),
);
const evidenceByTicker = Object.fromEntries(
  complete.rows.map((row) => [row.ticker, row.evidence.map(({ id, label, value, detail }) => ({ id, label, value, detail }))]),
);
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items"],
  properties: {
    summary: { type: "string", minLength: 40, maxLength: 700 },
    items: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ticker", "thesis", "nextQuestion", "evidenceIds"],
        properties: {
          ticker: { type: "string", enum: tickers },
          thesis: { type: "string", minLength: 40, maxLength: 700 },
          nextQuestion: { type: "string", minLength: 20, maxLength: 300 },
          evidenceIds: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
        },
      },
    },
  },
};

const temporary = mkdtempSync(join(tmpdir(), "riptide-morning-scan-"));
const schemaPath = join(temporary, "schema.json");
const resultPath = join(temporary, "result.json");
writeFileSync(schemaPath, JSON.stringify(schema));

const prompt = `You are writing a concise equity-research brief for a portfolio demo.
Use only the supplied quantitative rows and evidence. Treat every explanation as a hypothesis.
Return exactly one item for each ticker in this exact order: ${tickers.join(", ")}.
Every evidenceIds value must be copied from that ticker's evidence. Do not give investment advice.

ROWS:\n${JSON.stringify(narrativeRows)}\n\nEVIDENCE:\n${JSON.stringify(evidenceByTicker)}`;

const run = spawnSync(
  "codex",
  ["exec", "--ephemeral", "--ignore-rules", "--sandbox", "read-only", "--output-schema", schemaPath, "--output-last-message", resultPath, "-"],
  { cwd: ROOT, input: prompt, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] },
);
if (run.status !== 0) {
  rmSync(temporary, { recursive: true, force: true });
  throw new Error(`Codex artifact generation failed with exit ${run.status}`);
}

const generated = JSON.parse(readFileSync(resultPath, "utf8"));
const exactOrder = tickers.every((ticker, index) => generated.items[index]?.ticker === ticker);
const grounded = generated.items.every((item) => {
  const allowed = new Set((evidenceByTicker[item.ticker] ?? []).map((evidence) => evidence.id));
  return item.evidenceIds.every((id) => allowed.has(id));
});
if (!exactOrder || !grounded) {
  rmSync(temporary, { recursive: true, force: true });
  throw new Error("Generated artifact failed ticker-order or evidence-ID validation");
}

const artifact = {
  generatedAt: new Date().toISOString(),
  model: METADATA.model,
  promptVersion: METADATA.promptVersion,
  schemaVersion: METADATA.schemaVersion,
  inputDigest: complete.brief.inputDigest,
  ...generated,
};
const source = `import type { MorningScanBrief } from "@/lib/morning-scan-contract";\n\n` +
  `/** Pre-generated and runtime-validated AI brief. */\n` +
  `export const MORNING_SCAN_ARTIFACT: Omit<MorningScanBrief, "source"> = ${JSON.stringify(artifact, null, 2)};\n`;
const stagedOutput = `${OUTPUT}.next`;
const rollbackOutput = `${OUTPUT}.rollback`;
const previousSource = readFileSync(OUTPUT, "utf8");

try {
  writeFileSync(stagedOutput, source);
  renameSync(stagedOutput, OUTPUT);

  const validation = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "src/lib/morning-scan.test.ts"],
    { cwd: ROOT, encoding: "utf8", stdio: "inherit" },
  );
  if (validation.status !== 0) {
    throw new Error("Generated artifact was rejected by the runtime validation suite");
  }

  process.stdout.write(`Updated and runtime-validated ${OUTPUT}\n`);
} catch (error) {
  writeFileSync(rollbackOutput, previousSource);
  renameSync(rollbackOutput, OUTPUT);
  throw error;
} finally {
  rmSync(stagedOutput, { force: true });
  rmSync(rollbackOutput, { force: true });
  rmSync(temporary, { recursive: true, force: true });
}
