import { config } from "../config.js";
import { footballPriority } from "../events/watchlist.js";
import type { SportEvent } from "../events/model.js";

export class ApiFootballSource {
  readonly id = "api-football" as const;

  async fixturesForDate(date: string, timeZone: string): Promise<unknown> {
    if (!config.apiFootball.apiKey) throw new Error("API_FOOTBALL_KEY est absente de services/ingest/.env.");
    const endpoint = new URL(`${config.apiFootball.baseUrl}/fixtures`);
    endpoint.searchParams.set("date", date);
    endpoint.searchParams.set("timezone", timeZone);
    const response = await fetch(endpoint, {
      headers: { "x-apisports-key": config.apiFootball.apiKey },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`api-football: HTTP ${response.status} ${response.statusText}`);
    const payload: unknown = await response.json();
    assertApiFootballSuccess(payload);
    return payload;
  }
}

export function parseApiFootballEvents(payload: unknown): SportEvent[] {
  const root = objectValue(payload);
  const fixtures = Array.isArray(root?.response) ? root.response : [];
  return fixtures.flatMap((value): SportEvent[] => {
    const entry = objectValue(value);
    const fixture = objectValue(entry?.fixture);
    const league = objectValue(entry?.league);
    const teams = objectValue(entry?.teams);
    const home = objectValue(teams?.home);
    const away = objectValue(teams?.away);
    const fixtureId = numberValue(fixture?.id);
    const leagueId = numberValue(league?.id);
    const homeName = stringValue(home?.name);
    const awayName = stringValue(away?.name);
    const startAtUtc = isoValue(fixture?.date);
    if (fixtureId === null || leagueId === null || !homeName || !awayName || !startAtUtc) return [];
    const round = stringValue(league?.round);
    const priority = footballPriority(leagueId, round, [homeName, awayName]);
    if (!priority) return [];
    const competition = stringValue(league?.name) || `Compétition ${leagueId}`;
    const status = objectValue(fixture?.status);
    return [{
      id: `api-football:${fixtureId}`,
      source: "api-football",
      sourceEventId: String(fixtureId),
      sport: "football",
      title: `${homeName} / ${awayName}`,
      competition,
      stage: round,
      participants: [homeName, awayName],
      startAtUtc,
      timeConfidence: "confirmed",
      status: stringValue(status?.short) || stringValue(status?.long) || "unknown",
      importance: priority.importance,
      priorityScore: priority.score,
      priorityReasons: priority.reasons,
      country: stringValue(league?.country)
    }];
  }).sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function assertApiFootballSuccess(payload: unknown): void {
  const root = objectValue(payload);
  if (!root) throw new Error("api-football: réponse JSON invalide.");
  const errors = root.errors;
  if (Array.isArray(errors) && errors.length > 0) throw new Error(`api-football: ${errors.map(String).join(", ")}`);
  if (errors && typeof errors === "object" && Object.keys(errors).length > 0) {
    throw new Error(`api-football: ${Object.values(errors).map(String).join(", ")}`);
  }
  if (!Array.isArray(root.response)) throw new Error("api-football: champ response absent.");
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoValue(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "";
  return new Date(value).toISOString();
}
