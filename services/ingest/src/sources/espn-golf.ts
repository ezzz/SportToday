import { config } from "../config.js";
import { genericEventPriority } from "../events/watchlist.js";
import type { SportEvent } from "../events/model.js";

/**
 * ESPN's public scoreboard is used only as an optional POC fallback for golf.
 * It is not treated as a contractual API: disable it with ESPN_GOLF_ENABLED=false
 * if the endpoint becomes unavailable or its terms are not suitable.
 */
export class EspnGolfSource {
  readonly id = "espn-golf" as const;

  async scoreboardForDate(date: string): Promise<unknown> {
    if (!config.espnGolf.enabled) return { events: [] };
    const events = await Promise.all(["pga", "lpga"].map(async (tour) => {
      const endpoint = new URL(`${config.espnGolf.baseUrl}/${tour}/scoreboard`);
      endpoint.searchParams.set("dates", date.replace(/-/gu, ""));
      const response = await fetch(endpoint, { headers: { "user-agent": "SportToday-data-poc/0.1" }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`espn-golf (${tour}): HTTP ${response.status} ${response.statusText}`);
      return response.json() as Promise<unknown>;
    }));
    return { tours: events };
  }
}

export function parseEspnGolfEvents(payload: unknown, date: string): SportEvent[] {
  const root = objectValue(payload);
  const payloads = Array.isArray(root?.tours) ? root.tours : [payload];
  const events: SportEvent[] = [];
  for (const tourPayload of payloads) {
    const tourRoot = objectValue(tourPayload);
    const entries = Array.isArray(tourRoot?.events) ? tourRoot.events : [];
    for (const value of entries) {
      const event = objectValue(value);
      if (!event) continue;
      const eventId = stringValue(event.id);
      const name = stringValue(event.name) || stringValue(event.shortName);
      const start = firstDate(event.date, event.startDate, date);
      if (!eventId || !name || !start || !sameDate(start, date)) continue;
      const competition = stringValue(objectValue(event.league)?.name) || name;
      const priority = genericEventPriority("golf", competition);
      events.push({
        id: `espn-golf:${eventId}`,
        source: "espn-golf",
        sourceEventId: eventId,
        sport: "golf",
        title: name,
        competition,
        stage: "Tournoi",
        participants: participantNames(event),
        startAtUtc: start,
        timeConfidence: "confirmed",
        status: statusValue(event),
        importance: priority.importance,
        priorityScore: priority.score,
        priorityReasons: priority.reasons
      });
    }
  }
  return [...new Map(events.map((event) => [event.id, event])).values()]
    .sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function participantNames(event: Record<string, unknown>): string[] {
  const competitors = Array.isArray(event.competitors) ? event.competitors : [];
  return competitors.flatMap((value) => {
    const competitor = objectValue(value);
    const athlete = objectValue(competitor?.athlete);
    const name = stringValue(athlete?.displayName) || stringValue(competitor?.displayName) || stringValue(competitor?.name);
    return name ? [name] : [];
  }).slice(0, 8);
}

function firstDate(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) continue;
    return new Date(value).toISOString();
  }
  return "";
}

function sameDate(value: string, date: string): boolean {
  return value.slice(0, 10) === date || new Intl.DateTimeFormat("en-CA", { timeZone: config.timeZone }).format(new Date(value)) === date;
}

function statusValue(event: Record<string, unknown>): string {
  const status = objectValue(event.status);
  return stringValue(status?.type) || stringValue(status?.name) || "scheduled";
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
