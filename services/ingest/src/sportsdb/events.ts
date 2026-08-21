export interface TheSportsDbEvent {
  id: string;
  name: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  startAtUtc: string | null;
  status: string;
  postponed: string;
}

export interface TheSportsDbTvBroadcast {
  id: string;
  eventId: string;
  channel: string;
  country: string;
}

export function parseSportsDbEvents(payload: unknown): TheSportsDbEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const events = record.events ?? record.event;
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
      date: stringValue(record.dateEvent),
      startAtUtc: parseTimestamp(record.strTimestamp),
      status: stringValue(record.strStatus),
      postponed: stringValue(record.strPostponed)
    } satisfies TheSportsDbEvent];
  });
}

export function parseSportsDbTvBroadcasts(payload: unknown): TheSportsDbTvBroadcast[] {
  if (!payload || typeof payload !== "object" || !("tvevent" in payload)) return [];
  const broadcasts = (payload as Record<string, unknown>).tvevent;
  if (!Array.isArray(broadcasts)) return [];
  return broadcasts.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    const id = stringValue(record.id);
    const eventId = stringValue(record.idEvent);
    const channel = stringValue(record.strChannel);
    if (!id || !eventId || !channel) return [];
    return [{ id, eventId, channel, country: stringValue(record.strCountry) } satisfies TheSportsDbTvBroadcast];
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
