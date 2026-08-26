import { config } from "../config.js";
import { volleyballPriority } from "../events/watchlist.js";
import type { SportEvent } from "../events/model.js";

/** API-Sports Volleyball adapter. It is optional and only runs when a key is configured. */
export class ApiVolleyballSource {
  readonly id = "api-volleyball" as const;

  async gamesForDate(date: string, timeZone: string): Promise<unknown> {
    if (!config.apiVolleyball.apiKey) throw new Error("API_FOOTBALL_KEY est absente : elle est également utilisée par API-Volleyball.");
    const endpoint = new URL(`${config.apiVolleyball.baseUrl}/games`);
    endpoint.searchParams.set("date", date);
    endpoint.searchParams.set("timezone", timeZone);
    const response = await fetch(endpoint, { headers: { "x-apisports-key": config.apiVolleyball.apiKey }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`api-volleyball: HTTP ${response.status} ${response.statusText}`);
    const payload: unknown = await response.json();
    assertApiSportsSuccess(payload, "api-volleyball");
    return payload;
  }
}

export function parseApiVolleyballEvents(payload: unknown): SportEvent[] {
  const root = objectValue(payload);
  const games = Array.isArray(root?.response) ? root.response : [];
  return games.flatMap((value): SportEvent[] => {
    const entry = objectValue(value);
    const gameId = numberValue(entry?.id);
    const date = isoValue(entry?.date);
    const league = objectValue(entry?.league);
    const teams = objectValue(entry?.teams);
    const home = objectValue(teams?.home);
    const away = objectValue(teams?.away);
    const homeName = stringValue(home?.name);
    const awayName = stringValue(away?.name);
    const competition = stringValue(league?.name);
    if (gameId === null || !date || !homeName || !awayName || !competition) return [];
    const country = stringValue(objectValue(entry?.country)?.name) || stringValue(league?.country);
    const priority = volleyballPriority(competition, country, [homeName, awayName]);
    if (!priority) return [];
    const status = objectValue(entry?.status);
    const stage = stringValue(league?.type) || "Match";
    return [{
      id: `api-volleyball:${gameId}`,
      source: "api-volleyball",
      sourceEventId: String(gameId),
      sport: "volleyball",
      title: `${homeName} / ${awayName}`,
      competition,
      stage,
      participants: [homeName, awayName],
      startAtUtc: date,
      timeConfidence: "confirmed",
      status: stringValue(status?.short) || stringValue(status?.long) || "unknown",
      importance: priority.importance,
      priorityScore: priority.score,
      priorityReasons: priority.reasons,
      country
    }];
  }).sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function assertApiSportsSuccess(payload: unknown, source: string): void {
  const root = objectValue(payload);
  if (!root) throw new Error(`${source}: réponse JSON invalide.`);
  const errors = root.errors;
  if (Array.isArray(errors) && errors.length > 0) throw new Error(`${source}: ${errors.map(String).join(", ")}`);
  if (errors && typeof errors === "object" && Object.keys(errors).length > 0) throw new Error(`${source}: ${Object.values(errors).map(String).join(", ")}`);
  if (!Array.isArray(root.response)) throw new Error(`${source}: champ response absent.`);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

function numberValue(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

function isoValue(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "";
  return new Date(value).toISOString();
}
