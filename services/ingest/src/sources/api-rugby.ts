import { config } from "../config.js";
import type { SportEvent } from "../events/model.js";

export const rugbyCompetitions = {
  16: { label: "Top 14", importance: "A", priority: 84 },
  17: { label: "Pro D2", importance: "B", priority: 72 }
} as const;

type RugbyCompetitionId = keyof typeof rugbyCompetitions;

export class ApiRugbySource {
  async gamesForDate(date: string, timeZone: string): Promise<unknown> {
    if (!config.apiRugby.apiKey) throw new Error("API-Rugby : clé absente");
    const url = new URL(`${config.apiRugby.baseUrl}/games`);
    url.searchParams.set("date", date);
    url.searchParams.set("timezone", timeZone);
    const response = await fetch(url, { headers: { "x-apisports-key": config.apiRugby.apiKey }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`API-Rugby : HTTP ${response.status}`);
    const payload = await response.json() as { errors?: object; response?: unknown[] };
    if (payload.errors && Object.keys(payload.errors).length) throw new Error(`API-Rugby : ${JSON.stringify(payload.errors)}`);
    if (!Array.isArray(payload.response)) throw new Error("API-Rugby : réponse invalide");
    return payload;
  }
}

export function rugbyTeamName(name: string): string {
  const names: Record<string, string> = {
    "Stade Rochelais": "La Rochelle", "Stade Toulousain": "Toulouse",
    "Union Bordeaux Begles": "Bordeaux-Bègles", "Union Bordeaux Bègles": "Bordeaux-Bègles",
    "ASM Clermont": "Clermont", "ASM Clermont Auvergne": "Clermont",
    "RC Toulonnais": "Toulon", "Stade Francais Paris": "Stade Français",
    "Stade Français Paris": "Stade Français", "Section Paloise": "Pau",
    "Aviron Bayonnais": "Bayonne", "Castres Olympique": "Castres",
    "Montpellier Herault Rugby": "Montpellier", "USA Perpignan": "Perpignan",
    "SU Agen": "Agen", "Biarritz Olympique": "Biarritz", "US Dax": "Dax",
    "USON Nevers": "Nevers", "US Carcassonne": "Carcassonne", "Valence Romans DR": "Valence Romans"
  };
  return names[name] ?? name;
}

export function parseApiRugbyEvents(payload: unknown, date: string, timeZone = "Europe/Paris"): SportEvent[] {
  const games = (payload as { response?: RugbyGame[] })?.response;
  if (!Array.isArray(games)) return [];
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return games.flatMap((game): SportEvent[] => {
    if (!isRugbyCompetition(game.league?.id) || !game.id || !game.date || !Number.isFinite(Date.parse(game.date))) return [];
    if (formatter.format(new Date(game.date)) !== date) return [];
    const home = game.teams?.home?.name;
    const away = game.teams?.away?.name;
    if (!home || !away) return [];
    const competition = rugbyCompetitions[game.league.id];
    const participants = [home, away].map(rugbyTeamName);
    return [{ id: `api-rugby:${game.id}`, source: "api-rugby", sourceEventId: String(game.id),
      sport: "rugby", title: participants.join(" / "), competition: competition.label,
      stage: game.week ? `Journée ${game.week}` : "Match", participants,
      startAtUtc: new Date(game.date).toISOString(), timeConfidence: "confirmed",
      status: game.status?.short ?? "NS", importance: competition.importance, priorityScore: competition.priority,
      priorityReasons: [`Championnat de France de rugby — ${competition.label}`] }];
  });
}

function isRugbyCompetition(id: number | undefined): id is RugbyCompetitionId {
  return typeof id === "number" && id in rugbyCompetitions;
}

interface RugbyGame {
  id?: number; date?: string; week?: string | number; league?: { id?: number };
  teams?: { home?: { name?: string }; away?: { name?: string } }; status?: { short?: string };
}
