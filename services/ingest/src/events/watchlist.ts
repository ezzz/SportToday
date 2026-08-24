import type { EventImportance } from "./model.js";

export interface FootballCompetitionRule {
  id: number;
  name: string;
  baseScore: number;
  importance: EventImportance;
}

export const footballWatchlist: readonly FootballCompetitionRule[] = [
  { id: 2, name: "UEFA Champions League", baseScore: 96, importance: "A" },
  { id: 3, name: "UEFA Europa League", baseScore: 90, importance: "A" },
  { id: 848, name: "UEFA Conference League", baseScore: 84, importance: "B" },
  { id: 61, name: "Ligue 1", baseScore: 84, importance: "A" },
  { id: 66, name: "Coupe de France", baseScore: 86, importance: "A" },
  { id: 39, name: "Premier League", baseScore: 78, importance: "B" },
  { id: 140, name: "La Liga", baseScore: 73, importance: "B" },
  { id: 135, name: "Serie A", baseScore: 72, importance: "B" },
  { id: 78, name: "Bundesliga", baseScore: 71, importance: "B" }
] as const;

export const footballWatchlistById = new Map(footballWatchlist.map((rule) => [rule.id, rule]));

const frenchPriorityTeams = [
  "Paris Saint Germain", "Paris Saint-Germain", "PSG", "Marseille", "Monaco",
  "Lyon", "Lille", "Nice", "Rennes", "Lens", "Strasbourg"
] as const;

const europeanPriorityTeams = [
  "Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United",
  "Tottenham", "Real Madrid", "Barcelona", "Atletico Madrid", "Bayern Munich",
  "Borussia Dortmund", "Inter", "Juventus", "AC Milan", "Napoli"
] as const;

export function footballPriority(
  leagueId: number,
  round: string,
  teams: readonly string[]
): { importance: EventImportance; score: number; reasons: string[] } | null {
  const rule = footballWatchlistById.get(leagueId);
  if (!rule) return null;
  let score = rule.baseScore;
  let importance = rule.importance;
  const reasons = [`compétition suivie : ${rule.name}`];
  const stage = round.toLocaleLowerCase("fr-FR");
  if (/final(?!es)/u.test(stage)) {
    score += 25;
    importance = "A";
    reasons.push("finale");
  } else if (/semi|demi/u.test(stage)) {
    score += 18;
    importance = "A";
    reasons.push("demi-finale");
  } else if (/quarter|quart/u.test(stage)) {
    score += 12;
    importance = "A";
    reasons.push("quart de finale");
  } else if (/round of 16|huiti/u.test(stage)) {
    score += 7;
    reasons.push("phase éliminatoire");
  }
  const frenchTeam = teams.find((team) => teamMatches(team, frenchPriorityTeams));
  if (frenchTeam) {
    score += leagueId === 2 || leagueId === 3 || leagueId === 848 ? 18 : 9;
    importance = "A";
    reasons.push(`équipe française prioritaire : ${frenchTeam}`);
  }
  const marqueeCount = teams.filter((team) => teamMatches(team, europeanPriorityTeams)).length;
  if (marqueeCount >= 2) {
    score += 14;
    importance = "A";
    reasons.push("grande affiche européenne");
  } else if (marqueeCount === 1) {
    score += 5;
    reasons.push("club européen prioritaire");
  }
  return { importance, score, reasons };
}

function teamMatches(value: string, candidates: readonly string[]): boolean {
  const normalized = normalize(value);
  return candidates.some((candidate) => {
    const expected = normalize(candidate);
    return normalized === expected || normalized.includes(expected) || expected.includes(normalized);
  });
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/gu, " ").trim();
}
