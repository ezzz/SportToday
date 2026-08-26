import { config } from "../config.js";
import { tennisPriority } from "../events/watchlist.js";
import type { SportEvent } from "../events/model.js";

/** Optional API-Tennis adapter (separate account/key from API-Sports). */
export class ApiTennisSource {
  readonly id = "api-tennis" as const;

  async fixturesForDate(date: string, timeZone: string): Promise<unknown> {
    if (!config.apiTennis.apiKey) throw new Error("API_TENNIS_KEY absente : source Tennis optionnelle non activée.");
    const endpoint = new URL(config.apiTennis.baseUrl);
    endpoint.searchParams.set("method", "get_fixtures");
    endpoint.searchParams.set("APIkey", config.apiTennis.apiKey);
    endpoint.searchParams.set("date_start", date);
    endpoint.searchParams.set("date_stop", date);
    endpoint.searchParams.set("timezone", timeZone);
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`api-tennis: HTTP ${response.status} ${response.statusText}`);
    const payload: unknown = await response.json();
    const root = objectValue(payload);
    if (root?.success !== 1 || !Array.isArray(root.result)) throw new Error("api-tennis: réponse sans fixtures.");
    return payload;
  }
}

export function parseApiTennisEvents(payload: unknown, timeZone = config.timeZone): SportEvent[] {
  const root = objectValue(payload);
  const fixtures = Array.isArray(root?.result) ? root.result : [];
  return fixtures.flatMap((value): SportEvent[] => {
    const entry = objectValue(value);
    const sourceId = stringValue(entry?.event_key);
    const date = stringValue(entry?.event_date);
    const time = stringValue(entry?.event_time);
    const first = stringValue(entry?.event_first_player);
    const second = stringValue(entry?.event_second_player);
    const tournament = stringValue(entry?.tournament_name) || stringValue(entry?.event_type_type);
    if (!sourceId || !date || !time || !first || !second || !tournament) return [];
    const startAtUtc = zonedDateTime(date, time, timeZone);
    if (!startAtUtc) return [];
    const priority = tennisPriority(tournament);
    const round = stringValue(entry?.tournament_round) || stringValue(entry?.event_type_type) || "Match";
    return [{
      id: `api-tennis:${sourceId}`,
      source: "api-tennis",
      sourceEventId: sourceId,
      sport: "tennis",
      title: `${first} / ${second}`,
      competition: tournament,
      stage: round,
      participants: [first, second],
      startAtUtc,
      timeConfidence: "confirmed",
      status: stringValue(entry?.event_status) || "scheduled",
      importance: priority.importance,
      priorityScore: priority.score,
      priorityReasons: priority.reasons
    }];
  }).sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

function zonedDateTime(date: string, time: string, timeZone: string): string {
  const local = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
  if (!Number.isFinite(local.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(local);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = zone.match(/^GMT(?:(\+|-)\d{1,2}(?::(\d{2}))?)?$/u);
  if (!match?.[1]) return local.toISOString();
  const numbers = zone.slice(4).split(":").map(Number);
  const offset = (match[1] === "+" ? 1 : -1) * ((numbers[0] ?? 0) * 60 + (numbers[1] ?? 0));
  return new Date(local.getTime() - offset * 60_000).toISOString();
}
