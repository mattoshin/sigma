/**
 * Model presets, the analyst's saved "models" for the Model Lab.
 *
 * A preset is a named SubjectiveView (scenarios + conviction). Presets are
 * per-browser authoring scratch space, not shared and not server-scored, so
 * they live in localStorage rather than the .data/ call store. Everything here
 * is SSR-guarded and best-effort: a blocked or full storage degrades to "no
 * presets" rather than throwing.
 */

import type { ModelPreset, SubjectiveView } from "@/lib/types";

const KEY = "riptide-presets";

function readAll(): ModelPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ModelPreset[]) : [];
  } catch {
    return [];
  }
}

function writeAll(all: ModelPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: presets are best-effort, never fatal */
  }
}

/** All saved presets, optionally filtered to one ticker, newest first. */
export function listPresets(ticker?: string): ModelPreset[] {
  const all = readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ticker ? all.filter((p) => p.ticker === ticker) : all;
}

/** Save (or overwrite, by ticker+name) a named view. Returns the stored preset. */
export function savePreset(name: string, ticker: string, view: SubjectiveView): ModelPreset {
  const preset: ModelPreset = {
    id: `${ticker}:${name}`,
    name,
    ticker,
    createdAt: new Date().toISOString(),
    view,
  };
  writeAll([...readAll().filter((p) => p.id !== preset.id), preset]);
  return preset;
}

export function deletePreset(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}
