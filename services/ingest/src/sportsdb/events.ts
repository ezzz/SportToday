export interface TheSportsDbEvent {
  id: string;
  name: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startAtUtc: string | null;
  status: string;
  postponed: string;
}

export function parseSportsDbEvents(payload: unknown): TheSportsDbEvent[] {
  if (!payload || typeof payload !== "object" || !("events" in payload)) return [];
  const events = payload.events;
  if (!Array.isArray(events)) return [];

  return events.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    const id = stringValue(record.idEvent);
    const name = stringValue(record.strEvent);
    if (!id || !name) return [];
    return [{
      id,
      name,
      sport: stringValue(record.strSport),
      league: stringValue(record.strLeague),
      homeTeam: stringValue(record.strHomeTeam),
      awayTeam: stringValue(record.strAwayTeam),
      startAtUtc: parseTimestamp(record.strTimestamp),
      status: stringValue(record.strStatus),
      postponed: stringValue(record.strPostponed)
    } satisfies TheSportsDbEvent];
  });
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function parseTimestamp(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  const candidate = /(?:Z|[+-]\d{2}:?\d{2})$/u.test(raw) ? raw : `${raw}Z`;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}
