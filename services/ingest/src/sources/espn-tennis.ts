import { config } from "../config.js";
import type { SportEvent, SportEventScheduleEntry } from "../events/model.js";
import { tennisRoundInfo } from "../events/tennis-round.js";
import { tennisPriority } from "../events/watchlist.js";

/** Optional, non-contractual ESPN scoreboard used for the Tennis POC. */
export class EspnTennisSource {
  readonly id = "espn-tennis" as const;

  async scoreboardsForDate(date: string): Promise<unknown> {
    if (!config.espnTennis.enabled) return { tours: [] };
    const tours = ["atp", "wta"] as const;
    const results = await Promise.allSettled(tours.map(async (tour) => {
      const endpoint = new URL(`${config.espnTennis.baseUrl}/${tour}/scoreboard`);
      endpoint.searchParams.set("dates", date.replace(/-/gu, ""));
      const response = await fetch(endpoint, {
        headers: { "user-agent": "SportToday-data-poc/0.1" },
        signal: AbortSignal.timeout(15_000)
      });
      if (!response.ok) throw new Error(`espn-tennis (${tour}): HTTP ${response.status} ${response.statusText}`);
      return { tour, payload: await response.json() as unknown };
    }));
    const warnings = results.flatMap((result, index) => result.status === "rejected"
      ? [`ESPN Tennis (${tours[index]}) : ${String(result.reason)}`] : []);
    if (results.every((result) => result.status === "rejected")) throw new Error(warnings.join(" · "));
    return { tours: results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []), warnings };
  }
}

export function parseEspnTennisEvents(payload: unknown, date: string, timeZone = config.timeZone): SportEvent[] {
  const root = objectValue(payload);
  const payloads = Array.isArray(root?.tours)
    ? root.tours.map((entry) => objectValue(entry)?.payload).filter((entry) => entry !== undefined)
    : [payload];
  const groups = new Map<string, { tournamentId: string; tournament: string; tour: "ATP" | "WTA"; entries: SportEventScheduleEntry[] }>();

  for (const tourPayload of payloads) {
    const events = arrayValue(objectValue(tourPayload)?.events);
    for (const eventValue of events) {
      const event = objectValue(eventValue);
      const tournamentId = stringValue(event?.id);
      const tournament = stringValue(event?.name) || stringValue(event?.shortName);
      if (!event || !tournamentId || !tournament) continue;
      // ESPN exposes the tournament's IANA zone (for example America/New_York).
      // Select the requested tournament day in that zone before displaying it
      // in Europe/Paris; an evening match can therefore legitimately be on J+1
      // after midnight for the French user.
      const tournamentTimeZone = stringValue(objectValue(event.calendar)?.timeZone) || timeZone;
      for (const groupingValue of arrayValue(event.groupings)) {
        const grouping = objectValue(groupingValue);
        const groupingInfo = objectValue(grouping?.grouping);
        const slug = stringValue(groupingInfo?.slug);
        const tour = slug === "mens-singles" ? "ATP" : slug === "womens-singles" ? "WTA" : null;
        if (!tour) continue;
        const key = `${tournamentId}:${tour}`;
        const group = groups.get(key) ?? { tournamentId, tournament, tour, entries: [] };
        for (const competitionValue of arrayValue(grouping?.competitions)) {
          const competition = objectValue(competitionValue);
          const id = stringValue(competition?.id);
          const startAtUtc = isoDate(competition?.date) || isoDate(competition?.startDate);
          const players = competitors(competition);
          if (!id || !startAtUtc || !sameLocalDate(startAtUtc, date, tournamentTimeZone) || competition?.timeValid === false || players.length !== 2) continue;
          const round = stringValue(objectValue(competition?.round)?.displayName);
          const roundInfo = tennisRoundInfo(round, tournament);
          group.entries.push({
            id,
            startAtUtc,
            participants: players,
            round,
            ...(roundInfo ? { roundLabel: roundInfo.label, roundRank: roundInfo.rank } : {}),
            status: stringValue(objectValue(objectValue(competition?.status)?.type)?.state) || "scheduled"
          });
        }
        groups.set(key, group);
      }
    }
  }

  return [...groups.values()].flatMap((group) => {
    const entries = [...new Map(group.entries.map((entry) => [entry.id, entry])).values()]
      .sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc));
    if (!entries.length) return [];
    const priority = tennisPriority(group.tournament);
    const endAtUtc = new Date(Date.parse(entries.at(-1)!.startAtUtc) + 150 * 60_000).toISOString();
    return [{
      id: `espn-tennis:${group.tournamentId}:${group.tour.toLocaleLowerCase()}:${date}`,
      source: "espn-tennis",
      sourceEventId: `${group.tournamentId}:${group.tour}:${date}`,
      sport: "tennis",
      title: group.tour === "ATP" ? "ATP Hommes" : "WTA Femmes",
      competition: group.tournament,
      stage: group.tour,
      participants: [],
      schedule: entries,
      startAtUtc: entries[0]!.startAtUtc,
      endAtUtc,
      timeConfidence: "confirmed",
      status: entries.some((entry) => entry.status === "in") ? "in" : "scheduled",
      importance: priority.importance,
      priorityScore: priority.score + 4,
      priorityReasons: [...priority.reasons, `programme ${group.tour} détaillé par ESPN`]
    } satisfies SportEvent];
  }).sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function competitors(competition: Record<string, unknown> | null): string[] {
  return arrayValue(competition?.competitors).flatMap((value) => {
    const name = stringValue(objectValue(objectValue(value)?.athlete)?.displayName);
    return name && name !== "TBD" ? [name] : [];
  }).slice(0, 2);
}

function sameLocalDate(value: string, date: string, timeZone: string): boolean {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) === date;
}

function isoDate(value: unknown): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
}

function arrayValue(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
