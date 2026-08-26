import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiFootballSource, parseApiFootballEvents } from "../sources/api-football.js";
import { ApiTennisSource, parseApiTennisEvents } from "../sources/api-tennis.js";
import { ApiVolleyballSource, parseApiVolleyballEvents } from "../sources/api-volleyball.js";
import { EspnGolfSource, parseEspnGolfEvents } from "../sources/espn-golf.js";
import { JolpicaF1Source, parseJolpicaEvents } from "../sources/jolpica-f1.js";
import { WorldAthleticsSource, parseWorldAthleticsEvents } from "../sources/world-athletics.js";
import { config } from "../config.js";
import type { SportEvent } from "./model.js";

export interface EventCatalogue {
  date: string;
  generatedAt: string;
  events: SportEvent[];
  footballEventCount: number;
  f1EventCount: number;
  eventCounts: Record<string, number>;
  snapshots: string[];
  sourceErrors: string[];
}

export interface EventCatalogueOptions {
  dataRoot: string;
  timeZone: string;
  refresh?: boolean;
  apiFootball?: Pick<ApiFootballSource, "fixturesForDate">;
  apiVolleyball?: Pick<ApiVolleyballSource, "gamesForDate">;
  apiTennis?: Pick<ApiTennisSource, "fixturesForDate">;
  espnGolf?: Pick<EspnGolfSource, "scoreboardForDate">;
  worldAthletics?: Pick<WorldAthleticsSource, "calendarForDate">;
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
  const volleyballPath = path.join(options.dataRoot, "raw", "api-volleyball", `${date}.json`);
  const tennisPath = path.join(options.dataRoot, "raw", "api-tennis", `${date}.json`);
  const golfPath = path.join(options.dataRoot, "raw", "espn-golf", `${date}.json`);
  const athleticsPath = path.join(options.dataRoot, "raw", "world-athletics", `${date}.json`);
  const f1Path = path.join(options.dataRoot, "raw", "jolpica-f1", `${season}.json`);
  const volleyballEnabled = Boolean(options.apiVolleyball || config.apiVolleyball.apiKey);
  const tennisEnabled = Boolean(options.apiTennis || config.apiTennis.apiKey);
  const golfEnabled = Boolean(options.espnGolf || config.espnGolf.enabled);
  const athleticsEnabled = Boolean(options.worldAthletics || config.worldAthletics.baseUrl);
  const [footballResult, volleyballResult, tennisResult, golfResult, athleticsResult, f1Result] = await Promise.allSettled([
    loadOrFetch(
      footballPath,
      Boolean(options.refresh),
      () => (options.apiFootball ?? new ApiFootballSource()).fixturesForDate(date, options.timeZone)
    ),
    volleyballEnabled
      ? loadOrFetch(
          volleyballPath,
          Boolean(options.refresh),
          () => (options.apiVolleyball ?? new ApiVolleyballSource()).gamesForDate(date, options.timeZone)
        )
      : Promise.resolve({ fetchedAt: new Date().toISOString(), payload: { response: [] } } satisfies CachedPayload),
    tennisEnabled
      ? loadOrFetch(
          tennisPath,
          Boolean(options.refresh),
          () => (options.apiTennis ?? new ApiTennisSource()).fixturesForDate(date, options.timeZone)
        )
      : Promise.resolve({ fetchedAt: new Date().toISOString(), payload: { result: [] } } satisfies CachedPayload),
    golfEnabled
      ? loadOrFetch(
          golfPath,
          Boolean(options.refresh),
          () => (options.espnGolf ?? new EspnGolfSource()).scoreboardForDate(date)
        )
      : Promise.resolve({ fetchedAt: new Date().toISOString(), payload: { events: [] } } satisfies CachedPayload),
    athleticsEnabled
      ? loadOrFetch(
          athleticsPath,
          Boolean(options.refresh),
          () => (options.worldAthletics ?? new WorldAthleticsSource()).calendarForDate(date)
        )
      : Promise.resolve({ fetchedAt: new Date().toISOString(), payload: { events: [] } } satisfies CachedPayload),
    loadOrFetch(
      f1Path,
      Boolean(options.refresh),
      () => (options.jolpicaF1 ?? new JolpicaF1Source()).scheduleForSeason(season)
    )
  ]);
  const footballEvents = footballResult.status === "fulfilled" ? parseApiFootballEvents(footballResult.value.payload) : [];
  const volleyballEvents = volleyballResult.status === "fulfilled" ? parseApiVolleyballEvents(volleyballResult.value.payload) : [];
  const tennisEvents = tennisResult.status === "fulfilled" ? parseApiTennisEvents(tennisResult.value.payload, options.timeZone) : [];
  const golfEvents = golfResult.status === "fulfilled" ? parseEspnGolfEvents(golfResult.value.payload, date) : [];
  const athleticsEvents = athleticsResult.status === "fulfilled" ? parseWorldAthleticsEvents(athleticsResult.value.payload, date) : [];
  const f1Events = f1Result.status === "fulfilled" ? parseJolpicaEvents(f1Result.value.payload, date) : [];
  const sourceErrors = [
    ...(footballResult.status === "rejected" ? [`API-Football : ${errorMessage(footballResult.reason)}`] : []),
    ...(volleyballResult.status === "rejected" ? [`API-Volleyball : ${errorMessage(volleyballResult.reason)}`] : []),
    ...(tennisResult.status === "rejected" ? [`API-Tennis : ${errorMessage(tennisResult.reason)}`] : []),
    ...(golfResult.status === "rejected" ? [`ESPN Golf : ${errorMessage(golfResult.reason)}`] : []),
    ...(athleticsResult.status === "rejected" ? [`World Athletics : ${errorMessage(athleticsResult.reason)}`] : []),
    ...(f1Result.status === "rejected" ? [`Jolpica F1 : ${errorMessage(f1Result.reason)}`] : [])
  ];
  const allEvents = [...footballEvents, ...volleyballEvents, ...tennisEvents, ...golfEvents, ...athleticsEvents, ...f1Events]
    .sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
  return {
    date,
    generatedAt: new Date().toISOString(),
    events: allEvents,
    footballEventCount: footballEvents.length,
    f1EventCount: f1Events.length,
    eventCounts: allEvents.reduce<Record<string, number>>((counts, event) => {
      counts[event.sport] = (counts[event.sport] ?? 0) + 1;
      return counts;
    }, {}),
    snapshots: [
      ...(footballResult.status === "fulfilled" ? [footballPath] : []),
      ...(volleyballResult.status === "fulfilled" ? [volleyballPath] : []),
      ...(tennisResult.status === "fulfilled" && tennisEnabled ? [tennisPath] : []),
      ...(golfResult.status === "fulfilled" && golfEnabled ? [golfPath] : []),
      ...(athleticsResult.status === "fulfilled" && athleticsEnabled ? [athleticsPath] : []),
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
