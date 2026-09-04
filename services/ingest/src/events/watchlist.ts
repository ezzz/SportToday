import type { EventImportance } from "./model.js";

export interface EventCompetitionRule {
  name: string;
  keywords: readonly string[];
  baseScore: number;
  importance: EventImportance;
}

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
  { id: 62, name: "Ligue 2", baseScore: 68, importance: "B" },
  { id: 66, name: "Coupe de France", baseScore: 86, importance: "A" },
  { id: 39, name: "Premier League", baseScore: 78, importance: "B" },
  { id: 140, name: "La Liga", baseScore: 73, importance: "B" },
  { id: 135, name: "Serie A", baseScore: 72, importance: "B" },
  { id: 78, name: "Bundesliga", baseScore: 71, importance: "B" }
] as const;

export const footballWatchlistById = new Map(footballWatchlist.map((rule) => [rule.id, rule]));

/**
 * API-Sports exposes volleyball under a separate API but keeps the same
 * x-apisports-key authentication as API-Football. The list is deliberately
 * conservative so the event-first view remains a shortlist rather than a
 * worldwide fixture dump.
 */
export const volleyballWatchlist: readonly EventCompetitionRule[] = [
  { name: "CEV Champions League", keywords: ["champions league", "cev champions"], baseScore: 96, importance: "A" },
  { name: "Ligue des nations", keywords: ["nations league", "vnl"], baseScore: 90, importance: "A" },
  { name: "Championnat du monde", keywords: ["world championship", "world cup", "championnat du monde"], baseScore: 88, importance: "A" },
  { name: "Ligue A française", keywords: ["ligue a", "ligue a men", "ligue a women"], baseScore: 84, importance: "A" },
  { name: "Coupe CEV", keywords: ["cev cup", "challenge cup"], baseScore: 76, importance: "B" },
  { name: "Championnat d'Europe", keywords: ["european championship", "eurovolley"], baseScore: 86, importance: "A" }
] as const;

export function volleyballPriority(competition: string, country: string, teams: readonly string[] = []): { importance: EventImportance; score: number; reasons: string[] } | null {
  const normalized = normalize(competition);
  const rule = volleyballWatchlist.find((candidate) => candidate.keywords.some((keyword) => normalized.includes(normalize(keyword))));
  if (!rule) return null;
  const reasons = [`compétition suivie : ${rule.name}`];
  let score = rule.baseScore;
  let importance = rule.importance;
  if (normalize(country).includes("france")) {
    score += 6;
    reasons.push("compétition française");
  }
  if (teams.some((team) => /france|paris|tours|chaumont|montpellier|nantes|mulhouse/u.test(normalize(team)))) {
    score += 8;
    importance = "A";
    reasons.push("équipe française");
  }
  return { importance, score, reasons };
}

export const tennisWatchlist: readonly EventCompetitionRule[] = [
  { name: "Grand Chelem", keywords: ["australian open", "roland garros", "french open", "wimbledon", "us open"], baseScore: 100, importance: "A" },
  { name: "ATP Finals / WTA Finals", keywords: ["atp finals", "wta finals", "tour finals"], baseScore: 96, importance: "A" },
  { name: "Masters 1000 / WTA 1000", keywords: ["masters 1000", "wta 1000", "indian wells", "miami open", "monte carlo", "madrid open", "rome", "cincinnati", "canadian open", "shanghai"], baseScore: 90, importance: "A" },
  { name: "Coupe Davis / Billie Jean King Cup", keywords: ["davis cup", "billie jean king", "fed cup"], baseScore: 86, importance: "A" },
  { name: "ATP / WTA 500", keywords: ["atp 500", "wta 500"], baseScore: 78, importance: "B" }
] as const;

export function tennisPriority(competition: string): { importance: EventImportance; score: number; reasons: string[] } {
  const normalized = normalize(competition);
  const rule = tennisWatchlist.find((candidate) => candidate.keywords.some((keyword) => normalized.includes(normalize(keyword))));
  if (rule) return { importance: rule.importance, score: rule.baseScore, reasons: [`compétition suivie : ${rule.name}`] };
  return { importance: "C", score: 58, reasons: ["tournoi de tennis retourné par la source"] };
}

export function genericEventPriority(sport: "golf" | "athletics", competition: string): { importance: EventImportance; score: number; reasons: string[] } {
  const normalized = normalize(competition);
  if (sport === "athletics" && /diamond league|ligue de diamant/u.test(normalized)) return { importance: "A", score: 96, reasons: ["étape de la Diamond League"] };
  if (sport === "golf" && /masters|open|pga championship|ryder cup/u.test(normalized)) return { importance: "A", score: 90, reasons: ["tournoi de golf majeur"] };
  return { importance: "B", score: sport === "golf" ? 68 : 72, reasons: [`événement ${sport === "golf" ? "de golf" : "d'athlétisme"} retourné par la source`] };
}

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
