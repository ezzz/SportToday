import { config } from "../config.js";
import { genericEventPriority } from "../events/watchlist.js";
import type { SportEvent } from "../events/model.js";

/**
 * Small POC adapter for the public Diamond League calendar page. World Athletics
 * currently embeds the calendar in the page's __NEXT_DATA__ payload; there is
 * no stable public JSON API documented for this calendar, so this source is
 * intentionally marked estimated and can be disabled by removing its URL.
 */
export class WorldAthleticsSource {
  readonly id = "world-athletics" as const;

  async calendarForDate(date: string): Promise<unknown> {
    if (!config.worldAthletics.baseUrl) return { events: [] };
    const endpoint = new URL(config.worldAthletics.baseUrl);
    endpoint.searchParams.set("season", date.slice(0, 4));
    const response = await fetch(endpoint, { headers: { "user-agent": "SportToday-data-poc/0.1" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`world-athletics: HTTP ${response.status} ${response.statusText}`);
    return response.text();
  }
}

export function parseWorldAthleticsEvents(payload: unknown, date: string): SportEvent[] {
  const root = extractNextData(payload);
  const candidates: Array<Record<string, unknown>> = [];
  collectCalendarEvents(root, date, candidates, 0);
  const events = candidates.map((entry, index) => {
    const name = stringValue(entry.name) || stringValue(entry.title) || "Diamond League";
    const startDate = stringValue(entry.startDate) || stringValue(entry.start_date) || date;
    const endDate = stringValue(entry.endDate) || stringValue(entry.end_date);
    const startAtUtc = dateTimeOrNoon(startDate, date);
    const priority = genericEventPriority("athletics", "Diamond League");
    const id = stringValue(entry.id) || stringValue(entry.key) || `${date}:${name}:${index}`;
    return {
      id: `world-athletics:${id}`,
      source: "world-athletics" as const,
      sourceEventId: id,
      sport: "athletics" as const,
      title: name,
      competition: "Diamond League",
      stage: stringValue(entry.disciplines) || "Athlétisme",
      participants: [],
      startAtUtc,
      // A calendar-only date means "the meeting happens that day", not 14:00.
      // Keep a concrete instant for sorting/matching but don't expose it as an
      // official schedule slot (timeConfidence remains estimated).
      ...(endDate && endDate !== startDate && startDate.includes("T") && endDate.includes("T") ? { endAtUtc: dateTimeOrNoon(endDate, date) } : {}),
      timeConfidence: startDate.includes("T") ? "confirmed" as const : "estimated" as const,
      status: "scheduled",
      importance: priority.importance,
      priorityScore: priority.score,
      priorityReasons: priority.reasons
    } satisfies SportEvent;
  });
  const uniqueEvents = new Map<string, SportEvent>();
  for (const event of events) {
    const identity = calendarIdentity(event);
    // Preserve the first source id so prior validation notes remain attached.
    if (!uniqueEvents.has(identity)) uniqueEvents.set(identity, event);
  }
  return [...uniqueEvents.values()]
    .sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function calendarIdentity(event: SportEvent): string {
  return `${normalize(event.title)}:${event.startAtUtc.slice(0, 10)}:${event.endAtUtc?.slice(0, 10) ?? ""}`;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/gu, " ").trim();
}

function extractNextData(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  const match = payload.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/iu);
  if (!match?.[1]) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function collectCalendarEvents(value: unknown, date: string, output: Array<Record<string, unknown>>, depth: number): void {
  if (depth > 12 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const child of value) collectCalendarEvents(child, date, output, depth + 1);
    return;
  }
  const object = value as Record<string, unknown>;
  const start = stringValue(object.startDate) || stringValue(object.start_date);
  const end = stringValue(object.endDate) || stringValue(object.end_date);
  const name = stringValue(object.name) || stringValue(object.title);
  const discipline = `${stringValue(object.disciplines)} ${stringValue(object.sport)} ${stringValue(object.eventType)}`;
  if (name && start && (start.slice(0, 10) === date || (end && end.slice(0, 10) >= date && start.slice(0, 10) <= date)) && /track|athletic|diamond|field/iu.test(`${name} ${discipline}`)) {
    output.push(object);
  }
  for (const child of Object.values(object)) collectCalendarEvents(child, date, output, depth + 1);
}

function dateTimeOrNoon(value: string, requestedDate: string): string {
  if (value.includes("T") && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  const date = /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : requestedDate;
  return `${date}T12:00:00.000Z`;
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
