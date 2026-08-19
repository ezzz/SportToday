import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { TonightReport } from "../reports/tonight.js";

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
}

export interface ValidationFile {
  version: 1;
  source: TonightReport["source"];
  date: string;
  updatedAt: string;
  missingEventNote: string;
  items: Record<string, ItemValidation>;
}

export function validationPath(reportsRoot: string, report: TonightReport): string {
  return path.join(reportsRoot, `validation-tonight-${report.source}-${report.date}.json`);
}

export async function loadValidation(filePath: string, report: TonightReport): Promise<ValidationFile> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<ValidationFile>;
    const items: Record<string, ItemValidation> = {};
    const reportItemIds = new Set(report.items.map((item) => item.id));
    if (parsed.items && typeof parsed.items === "object") {
      for (const [itemId, value] of Object.entries(parsed.items)) {
        if (!reportItemIds.has(itemId)) continue;
        if (!value || typeof value !== "object") continue;
        const candidate = value as Partial<ItemValidation>;
        if (!isValidationVerdict(candidate.verdict)) continue;
        const note = typeof candidate.note === "string" ? candidate.note : "";
        if (candidate.verdict === "pending" && !note.trim()) continue;
        items[itemId] = {
          verdict: candidate.verdict,
          note,
          validatedAt: typeof candidate.validatedAt === "string" ? candidate.validatedAt : ""
        };
      }
    }
    return {
      version: 1,
      source: report.source,
      date: report.date,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      missingEventNote: typeof parsed.missingEventNote === "string" ? parsed.missingEventNote : "",
      items
    };
  } catch (error) {
    if (isFileNotFound(error)) return emptyValidation(report);
    throw error;
  }
}

export async function saveValidation(filePath: string, validation: ValidationFile): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(validation, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

export function updateItemValidation(
  validation: ValidationFile,
  itemId: string,
  verdict: ValidationVerdict,
  note: string
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
      [itemId]: { verdict, note: normalizedNote, validatedAt: now }
    }
  };
}

export function updateMissingEventNote(validation: ValidationFile, note: string): ValidationFile {
  return { ...validation, missingEventNote: note.trim(), updatedAt: new Date().toISOString() };
}

export function isValidationVerdict(value: unknown): value is ValidationVerdict {
  return typeof value === "string" && validationVerdicts.includes(value as ValidationVerdict);
}

function emptyValidation(report: TonightReport): ValidationFile {
  return {
    version: 1,
    source: report.source,
    date: report.date,
    updatedAt: "",
    missingEventNote: "",
    items: {}
  };
}

function isFileNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
