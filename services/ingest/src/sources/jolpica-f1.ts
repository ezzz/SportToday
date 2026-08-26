import { config } from "../config.js";
import type { EventImportance, SportEvent } from "../events/model.js";

export class JolpicaF1Source {
  readonly id = "jolpica-f1" as const;

  async scheduleForSeason(season: number): Promise<unknown> {
    const endpoint = new URL(`${config.jolpicaF1.baseUrl}/${season}/races/`);
    endpoint.searchParams.set("limit", "100");
    const response = await fetch(endpoint, {
      headers: { "user-agent": "SportToday-data-poc/0.1" },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`jolpica-f1: HTTP ${response.status} ${response.statusText}`);
    return response.json();
  }
}

export function parseJolpicaEvents(payload: unknown, date: string): SportEvent[] {
  const root = objectValue(payload);
  const mrData = objectValue(root?.MRData);
  const raceTable = objectValue(mrData?.RaceTable);
  const races = Array.isArray(raceTable?.Races) ? raceTable.Races : [];
  const events: SportEvent[] = [];
  for (const value of races) {
    const race = objectValue(value);
    if (!race) continue;
    const season = stringValue(race.season);
    const round = stringValue(race.round);
    const name = stringValue(race.raceName);
    const circuit = objectValue(race.Circuit);
    const location = objectValue(circuit?.Location);
    const competition = frenchGrandPrixName(name);
    const base = { season, round, name: competition, country: stringValue(location?.country) };
    addSession(events, race, "Qualifying", "Qualifications", date, base, "A", 94);
    addSession(events, race, "SprintQualifying", "Qualifications sprint", date, base, "B", 87);
    addSession(events, race, "SprintShootout", "Qualifications sprint", date, base, "B", 87);
    addSession(events, race, "Sprint", "Sprint", date, base, "A", 96);
    addSession(events, race, null, "Course", date, base, "A", 110);
    addSession(events, race, "FirstPractice", "Essais libres 1", date, base, "C", 55);
    addSession(events, race, "SecondPractice", "Essais libres 2", date, base, "C", 52);
    addSession(events, race, "ThirdPractice", "Essais libres 3", date, base, "C", 50);
  }
  return [...new Map(events.map((event) => [event.id, event])).values()]
    .sort((left, right) => right.priorityScore - left.priorityScore || left.startAtUtc.localeCompare(right.startAtUtc));
}

function addSession(
  events: SportEvent[],
  race: Record<string, unknown>,
  field: string | null,
  stage: string,
  requestedDate: string,
  base: { season: string; round: string; name: string; country: string },
  importance: EventImportance,
  priorityScore: number
): void {
  const session = field ? objectValue(race[field]) : race;
  const date = stringValue(session?.date);
  const time = stringValue(session?.time);
  if (date !== requestedDate || !time || !base.season || !base.round || !base.name) return;
  const startAtUtc = isoDateTime(date, time);
  if (!startAtUtc) return;
  const code = field ?? "Race";
  events.push({
    id: `jolpica-f1:${base.season}:${base.round}:${code}`,
    source: "jolpica-f1",
    sourceEventId: `${base.season}:${base.round}:${code}`,
    sport: "f1",
    title: `${base.name} — ${stage}`,
    competition: base.name,
    stage,
    participants: [],
    startAtUtc,
    timeConfidence: "confirmed",
    status: "scheduled",
    importance,
    priorityScore,
    priorityReasons: [stage === "Course" ? "course de Formule 1" : `session F1 : ${stage}`],
    country: base.country
  });
}

function frenchGrandPrixName(value: string): string {
  const name = value.replace(/ Grand Prix$/u, "").trim();
  const translations: Record<string, string> = {
    Australian: "d'Australie",
    Bahrain: "de Bahreïn",
    Chinese: "de Chine",
    Japanese: "du Japon",
    Miami: "de Miami",
    Canadian: "du Canada",
    Monaco: "de Monaco",
    Spanish: "d'Espagne",
    Austrian: "d'Autriche",
    British: "de Grande-Bretagne",
    Belgian: "de Belgique",
    Hungarian: "de Hongrie",
    Dutch: "des Pays-Bas",
    Italian: "d'Italie",
    Azerbaijan: "d'Azerbaïdjan",
    Singapore: "de Singapour",
    "United States": "des États-Unis",
    Mexico: "du Mexique",
    "São Paulo": "de São Paulo",
    "Las Vegas": "de Las Vegas",
    Qatar: "du Qatar",
    "Abu Dhabi": "d'Abou Dabi"
  };
  return name ? `Grand Prix ${translations[name] ?? name}` : value;
}

function isoDateTime(date: string, time: string): string {
  const value = `${date}T${time}`;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
