import { config } from "../config.js";
import type { SportEvent } from "../events/model.js";

/** Public schedule used by MotoGP.com, not a contractual API. */
export class MotoGpSource {
  async calendarForSeason(year: number): Promise<unknown> {
    const url = new URL(`${config.motogp.baseUrl}/events`);
    url.searchParams.set("seasonYear", String(year));
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`MotoGP : HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("MotoGP : calendrier invalide");
    // Keep schedule metadata only, excluding images and circuit descriptions.
    return { events: payload.filter((event: CalendarEvent) => event.season?.year === year && event.kind === "GP")
      .map((event: CalendarEvent) => ({ id: event.id, name: event.name, shortname: event.shortname,
        url: event.url, season: event.season, kind: event.kind,
        broadcasts: event.broadcasts?.filter((session) => session.category?.name === "MotoGP" && session.type === "SESSION") })) };
  }
}

export function parseMotoGpEvents(payload: unknown, date: string, timeZone = "Europe/Paris"): SportEvent[] {
  const events = (payload as { events?: CalendarEvent[] })?.events;
  if (!Array.isArray(events)) return [];
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return events.flatMap((event): SportEvent[] => {
    if (!event.id || event.kind !== "GP" || event.season?.year !== Number(date.slice(0, 4))) return [];
    const sessions = (event.broadcasts ?? []).filter((session) => session.type === "SESSION"
      && session.category?.name === "MotoGP" && ["Q1", "Q2", "SPR", "RAC"].includes(session.shortname ?? "")
      && session.date_start && Number.isFinite(Date.parse(session.date_start))
      && formatter.format(new Date(session.date_start)) === date);
    const competition = grandPrixName(event);
    return ["Qualifications", "Sprint", "Course"].flatMap((stage): SportEvent[] => {
      const selected = sessions.filter((session) => stage === "Qualifications" ? /^Q[12]$/u.test(session.shortname ?? "")
        : session.shortname === (stage === "Sprint" ? "SPR" : "RAC"))
        .sort((a, b) => Date.parse(a.date_start!) - Date.parse(b.date_start!));
      if (!selected.length) return [];
      const startAtUtc = new Date(selected[0]!.date_start!).toISOString();
      const end = Math.max(...selected.map((s) => Date.parse(s.date_end ?? "")));
      const id = `${event.id}:${stage}:${date}`;
      return [{ id: `motogp:${id}`, source: "motogp", sourceEventId: id, sport: "motogp", competition,
        title: stage, stage, participants: [], startAtUtc,
        ...(Number.isFinite(end) && end > Date.parse(startAtUtc) ? { endAtUtc: new Date(end).toISOString() } : {}),
        timeConfidence: "confirmed", status: selected[0]?.status ?? "scheduled", importance: "A",
        priorityScore: stage === "Course" ? 96 : stage === "Sprint" ? 90 : 80,
        priorityReasons: ["Calendrier officiel MotoGP.com", "Catégorie MotoGP uniquement"] }];
    });
  }).sort((a, b) => a.startAtUtc.localeCompare(b.startAtUtc));
}

function grandPrixName(event: CalendarEvent): string {
  const names: Record<string, string> = { RSM: "de Saint-Marin", FRA: "de France", ITA: "d'Italie", CAT: "de Catalogne", SPA: "d'Espagne", ARA: "d'Aragon", GBR: "de Grande-Bretagne", GER: "d'Allemagne", AUT: "d'Autriche", NED: "des Pays-Bas", JPN: "du Japon", INA: "d'Indonésie", AUS: "d'Australie", MAL: "de Malaisie", VAL: "de Valence", POR: "du Portugal", THA: "de Thaïlande", AME: "des Amériques", QAT: "du Qatar", BRA: "du Brésil", CZE: "de Tchéquie", HUN: "de Hongrie" };
  return names[event.shortname ?? ""] ? `Grand Prix ${names[event.shortname!]}` : event.name?.trim() || `Grand Prix ${event.url ?? event.id}`;
}

interface CalendarEvent {
  id?: string; name?: string; shortname?: string; url?: string; kind?: string; season?: { year?: number };
  broadcasts?: Array<{ id?: string; shortname?: string; type?: string; date_start?: string; date_end?: string; status?: string; category?: { name?: string } }>;
}
