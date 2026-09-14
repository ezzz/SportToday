import { config } from "../config.js";
import type { SportEvent } from "../events/model.js";

export const basketballWorldCupDates = (date: string): boolean => date >= "2026-09-04" && date <= "2026-09-13";

export const basketballCompetitions = {
  12: { label: "NBA", importance: "B", priority: 78 },
  120: { label: "EuroLeague", importance: "A", priority: 91 },
  284: { label: "Coupe du monde féminine", importance: "A", priority: 88 }
} as const;

type BasketballCompetitionId = keyof typeof basketballCompetitions;

export class ApiBasketballSource {
  async gamesForDate(date: string, timeZone: string): Promise<unknown> {
    if (!config.apiBasketball.apiKey) throw new Error("API-Basketball : clé absente");
    const url = new URL(`${config.apiBasketball.baseUrl}/games`);
    url.searchParams.set("date", date);
    url.searchParams.set("timezone", timeZone);
    const response = await fetch(url, { headers: { "x-apisports-key": config.apiBasketball.apiKey }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`API-Basketball : HTTP ${response.status}`);
    const payload = await response.json() as { errors?: object; response?: unknown[]; warnings?: string[] };
    if (payload.errors && Object.keys(payload.errors).length) throw new Error(`API-Basketball : ${JSON.stringify(payload.errors)}`);
    if (!Array.isArray(payload.response)) throw new Error("API-Basketball : réponse invalide");
    payload.response = payload.response.filter((game) => isBasketballCompetition((game as BasketballGame).league?.id));
    if (!payload.response.length && basketballWorldCupDates(date) && date !== "2026-09-11") {
      payload.warnings = [`Mondial féminin de basket : aucune affiche fournie pour le ${date}, programmation à compléter.`];
    }
    return payload;
  }
}

export function parseApiBasketballEvents(payload: unknown, date: string, timeZone = "Europe/Paris"): SportEvent[] {
  const games = (payload as { response?: BasketballGame[] })?.response;
  if (!Array.isArray(games)) return [];
  return games.flatMap((game): SportEvent[] => {
    if (!isBasketballCompetition(game.league?.id) || !game.id || !game.date || !Number.isFinite(Date.parse(game.date))) return [];
    if (new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(game.date)) !== date) return [];
    const home = game.teams?.home?.name;
    const away = game.teams?.away?.name;
    if (!home || !away) return [];
    const competition = basketballCompetitions[game.league.id];
    const french = /\bFrance\b/i.test(`${home} ${away}`);
    if (game.league.id === 284 && !basketballWorldCupDates(date)) return [];
    if (game.league.id === 284 && !french && date < "2026-09-08") return [];
    const participants = [home, away].map(basketballTeamName);
    return [{
      id: `api-basketball:${game.id}`, source: "api-basketball", sourceEventId: String(game.id),
      sport: "basket", title: participants.join(" / "), competition: competition.label,
      stage: game.league.id === 284 ? (date < "2026-09-08" ? "Phase de groupes" : "Phase finale") : game.week ? `Journée ${game.week}` : "Match", participants,
      startAtUtc: new Date(game.date).toISOString(), timeConfidence: "confirmed", status: game.status?.short ?? "NS",
      importance: competition.importance, priorityScore: french ? 100 : competition.priority,
      priorityReasons: [game.league.id === 284 ? (french ? "Équipe de France féminine" : "Phase finale du Mondial féminin") : `Calendrier API-Basketball — ${competition.label}`]
    }];
  });
}

function isBasketballCompetition(id: number | undefined): id is BasketballCompetitionId {
  return typeof id === "number" && id in basketballCompetitions;
}

export function basketballTeamName(name: string): string {
  const clean = name.replace(/\s+W$/u, "");
  const names: Record<string, string> = { "USA": "États-Unis", "Germany": "Allemagne", "Spain": "Espagne", "Japan": "Japon", "China": "Chine", "Italy": "Italie", "Belgium": "Belgique", "Australia": "Australie", "Hungary": "Hongrie", "Czech Republic": "Tchéquie", "Turkey": "Turquie", "South Korea": "Corée du Sud", "Puerto Rico": "Porto Rico" };
  return names[clean] ?? clean;
}

interface BasketballGame {
  id?: number; date?: string; week?: string | number; league?: { id?: number; name?: string };
  teams?: { home?: { name?: string }; away?: { name?: string } }; status?: { short?: string };
}
