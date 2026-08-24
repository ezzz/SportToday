import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiFootballSource, parseApiFootballEvents } from "../sources/api-football.js";
import { JolpicaF1Source, parseJolpicaEvents } from "../sources/jolpica-f1.js";
import type { SportEvent } from "./model.js";

export interface EventCatalogue {
  date: string;
  generatedAt: string;
  events: SportEvent[];
  footballEventCount: number;
  f1EventCount: number;
  snapshots: string[];
  sourceErrors: string[];
}

export interface EventCatalogueOptions {
  dataRoot: string;
  timeZone: string;
  refresh?: boolean;
  apiFootball?: Pick<ApiFootballSource, "fixturesForDate">;
  jolpicaF1?: Pick<JolpicaF1Source, "scheduleForSeason">;
}

interface CachedPayload {
  fetchedAt: string;
  payload: unknown;
}

export async function loadEventCatalogue(date: string, options: EventCatalogueOptions): Promise<EventCatalogue> {
  validateDate(date);
  const season = Number(date.slice(0, 4));
  const footballPath = path.join(options.dataRoot, "raw", "api-football", `${date}.json`);
  const f1Path = path.join(options.dataRoot, "raw", "jolpica-f1", `${season}.json`);
  const [footballResult, f1Result] = await Promise.allSettled([
    loadOrFetch(
      footballPath,
      Boolean(options.refresh),
      () => (options.apiFootball ?? new ApiFootballSource()).fixturesForDate(date, options.timeZone)
    ),
    loadOrFetch(
      f1Path,
      Boolean(options.refresh),
      () => (options.jolpicaF1 ?? new JolpicaF1Source()).scheduleForSeason(season)
    )
  ]);
  const footballEvents = footballResult.status === "fulfilled" ? parseApiFootballEvents(footballResult.value.payload) : [];
  const f1Events = f1Result.status === "fulfilled" ? parseJolpicaEvents(f1Result.value.payload, date) : [];
  const sourceErrors = [
    ...(footballResult.status === "rejected" ? [`API-Football : ${errorMessage(footballResult.reason)}`] : []),
    ...(f1Result.status === "rejected" ? [`Jolpica F1 : ${errorMessage(f1Result.reason)}`] : [])
  ];
  return {
    date,
    generatedAt: new Date().toISOString(),
    events: [...footballEvents, ...f1Events]
      .sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc)),
    footballEventCount: footballEvents.length,
    f1EventCount: f1Events.length,
    snapshots: [
      ...(footballResult.status === "fulfilled" ? [footballPath] : []),
      ...(f1Result.status === "fulfilled" ? [f1Path] : [])
    ],
    sourceErrors
  };
}

async function loadOrFetch(filePath: string, refresh: boolean, fetchPayload: () => Promise<unknown>): Promise<CachedPayload> {
  if (!refresh) {
    try {
      const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
      const cache = cachedPayload(parsed);
      if (cache) return cache;
    } catch (error) {
      if (!isFileNotFound(error)) throw error;
    }
  }
  const cache = { fetchedAt: new Date().toISOString(), payload: await fetchPayload() } satisfies CachedPayload;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return cache;
}

function cachedPayload(value: unknown): CachedPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<CachedPayload>;
  return typeof candidate.fetchedAt === "string" && "payload" in candidate
    ? { fetchedAt: candidate.fetchedAt, payload: candidate.payload }
    : null;
}

function validateDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Date invalide: ${value}. Utilisez YYYY-MM-DD.`);
  }
}

function isFileNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
