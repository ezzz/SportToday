import { readFile } from "node:fs/promises";
import path from "node:path";

import type { TonightReport } from "../reports/tonight.js";
import { writeTextFileAtomic } from "../storage/atomic-file.js";

export const validationVerdicts = [
  "pending",
  "ok",
  "doubt",
  "off_topic",
  "wrong_channel",
  "wrong_time",
  "wrong_live",
  "duplicate"
] as const;

export type ValidationVerdict = typeof validationVerdicts[number];

export interface ItemValidation {
  verdict: ValidationVerdict;
  note: string;
  validatedAt: string;
  context?: { title: string; sport: string; competition: string };
}

export interface ValidationFile {
  version: 2;
  source: TonightReport["source"];
  date: string;
  updatedAt: string;
  missingEventNote: string;
  debugNote: string;
  items: Record<string, ItemValidation>;
}

export function validationPath(reportsRoot: string, report: TonightReport): string {
  return path.join(reportsRoot, `validation-${report.iteration}-tonight-${report.source}-${report.date}.json`);
}

export async function loadValidation(filePath: string, report: TonightReport): Promise<ValidationFile> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<ValidationFile>;
    const items: Record<string, ItemValidation> = {};
    if (parsed.items && typeof parsed.items === "object") {
      for (const [itemId, value] of Object.entries(parsed.items)) {
        if (!value || typeof value !== "object") continue;
        const candidate = value as Partial<ItemValidation>;
        if (!isValidationVerdict(candidate.verdict)) continue;
        const note = typeof candidate.note === "string" ? candidate.note : "";
        if (candidate.verdict === "pending" && !note.trim()) continue;
        items[itemId] = {
          verdict: candidate.verdict,
          note,
          validatedAt: typeof candidate.validatedAt === "string" ? candidate.validatedAt : "",
          ...(candidate.context && typeof candidate.context.title === "string" && typeof candidate.context.sport === "string" && typeof candidate.context.competition === "string" ? { context: candidate.context } : {})
        };
      }
    }
    return {
      version: 2,
      source: report.source,
      date: report.date,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      missingEventNote: typeof parsed.missingEventNote === "string" ? parsed.missingEventNote : "",
      debugNote: typeof parsed.debugNote === "string" ? parsed.debugNote : "",
      items
    };
  } catch (error) {
    if (isFileNotFound(error)) return emptyValidation(report);
    throw error;
  }
}

export async function saveValidation(filePath: string, validation: ValidationFile): Promise<void> {
  await writeTextFileAtomic(filePath, `${JSON.stringify(validation, null, 2)}\n`);
}

export function updateItemValidation(
  validation: ValidationFile,
  itemId: string,
  verdict: ValidationVerdict,
  note: string,
  context?: ItemValidation["context"]
): ValidationFile {
  const now = new Date().toISOString();
  const normalizedNote = note.trim();
  if (verdict === "pending" && !normalizedNote) {
    const items = { ...validation.items };
    delete items[itemId];
    return { ...validation, updatedAt: now, items };
  }
  return {
    ...validation,
    updatedAt: now,
    items: {
      ...validation.items,
      [itemId]: { verdict, note: normalizedNote, validatedAt: now, ...(context ? { context } : validation.items[itemId]?.context ? { context: validation.items[itemId]!.context } : {}) }
    }
  };
}

export function updateMissingEventNote(validation: ValidationFile, note: string): ValidationFile {
  return { ...validation, missingEventNote: note.trim(), updatedAt: new Date().toISOString() };
}

export function updateDebugNote(validation: ValidationFile, note: string): ValidationFile {
  return { ...validation, debugNote: note.trim(), updatedAt: new Date().toISOString() };
}

export function isValidationVerdict(value: unknown): value is ValidationVerdict {
  return typeof value === "string" && validationVerdicts.includes(value as ValidationVerdict);
}

function emptyValidation(report: TonightReport): ValidationFile {
  return {
    version: 2,
    source: report.source,
    date: report.date,
    updatedAt: "",
    missingEventNote: "",
    debugNote: "",
    items: {}
  };
}

function isFileNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
