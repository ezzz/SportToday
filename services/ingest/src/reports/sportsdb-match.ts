import type { DayProgramme } from "./day-filter.js";
import type { AutoAnnotation, TriState } from "./auto-annotation.js";
import type { TheSportsDbEvent } from "../sportsdb/events.js";

export type SportsDbMatchConfidence = "high" | "medium" | "low" | "none";
export type SportsDbLiveEvidence =
  | "not-sport"
  | "no-match"
  | "explicit-live"
  | "explicit-delayed"
  | "status-in-play"
  | "status-finished"
  | "status-not-started"
  | "status-postponed"
  | "aligned-event-start"
  | "event-time-offset";

export interface SportsDbMatch {
  eventId: string;
  eventName: string;
  competition: string;
  participants: string;
  startAtUtc: string;
  timeDeltaMinutes: number | null;
  confidence: SportsDbMatchConfidence;
  liveEvidence: SportsDbLiveEvidence;
  suggestedIsLive: TriState;
}

export function matchProgrammeToSportsDb(
  programme: DayProgramme,
  annotation: AutoAnnotation,
  events: TheSportsDbEvent[]
): SportsDbMatch | null {
  if (!events.length || annotation.isSport === "false") return null;

  const programmeText = normalize(`${programme.title} ${programme.description ?? ""} ${programme.categories.join(" ")}`);
  const programmeTime = new Date(programme.startAt).getTime();
  const candidates = events.map((event) => scoreEvent(programmeText, programmeTime, annotation, event))
    .filter((candidate): candidate is ScoredEvent => candidate !== null)
    .sort((left, right) => right.score - left.score || left.event.id.localeCompare(right.event.id));
  const best = candidates[0];
  if (!best || best.score < 45) return null;

  const liveEvidence = inferLiveEvidence(programmeText, best.event, best.timeDeltaMinutes, best.participantMatches);
  return {
    eventId: best.event.id,
    eventName: best.event.name,
    competition: best.event.league,
    participants: participantLabel(best.event),
    startAtUtc: best.event.startAtUtc ?? "",
    timeDeltaMinutes: best.timeDeltaMinutes,
    confidence: best.confidence,
    liveEvidence,
    suggestedIsLive: suggestedLive(liveEvidence)
  };
}

interface ScoredEvent {
  event: TheSportsDbEvent;
  score: number;
  confidence: SportsDbMatchConfidence;
  timeDeltaMinutes: number | null;
  participantMatches: number;
}

function scoreEvent(
  programmeText: string,
  programmeTime: number,
  annotation: AutoAnnotation,
  event: TheSportsDbEvent
): ScoredEvent | null {
  const homeMatch = containsEntity(programmeText, event.homeTeam);
  const awayMatch = containsEntity(programmeText, event.awayTeam);
  const participantMatches = Number(homeMatch) + Number(awayMatch);
  const eventNameMatch = overlapScore(programmeText, normalize(event.name));
  const leagueMatch = Boolean(event.league && containsEntity(programmeText, event.league));
  const sportMatch = Boolean(annotation.sport && sameSport(annotation.sport, event.sport));
  const timeDeltaMinutes = event.startAtUtc
    ? Math.round(Math.abs(programmeTime - new Date(event.startAtUtc).getTime()) / 60_000)
    : null;

  let score = 0;
  if (participantMatches === 2) score += 70;
  else if (participantMatches === 1) score += 32;
  if (eventNameMatch >= 2) score += 20;
  else if (eventNameMatch === 1) score += 8;
  if (leagueMatch) score += 18;
  if (sportMatch) score += 8;
  if (timeDeltaMinutes !== null && timeDeltaMinutes <= 30) score += 15;
  else if (timeDeltaMinutes !== null && timeDeltaMinutes <= 180) score += 8;

  if (participantMatches === 0 && !leagueMatch && eventNameMatch === 0) return null;
  const confidence: SportsDbMatchConfidence = participantMatches === 2
    ? "high"
    : participantMatches === 1 && (leagueMatch || timeDeltaMinutes !== null && timeDeltaMinutes <= 180)
      ? "medium"
      : eventNameMatch >= 2 || leagueMatch
        ? "low"
        : "none";
  return { event, score, confidence, timeDeltaMinutes, participantMatches };
}

function inferLiveEvidence(
  programmeText: string,
  event: TheSportsDbEvent,
  timeDeltaMinutes: number | null,
  participantMatches: number
): SportsDbLiveEvidence {
  if (/\b(?:replay|rediffusion|resume|review|best of|magazine|analyse)\b/u.test(programmeText)) {
    return "explicit-delayed";
  }
  if (/\b(?:en direct|direct|live)\b/u.test(programmeText)) return "explicit-live";
  if (isInPlayStatus(event.status)) return "status-in-play";
  if (isPostponed(event)) return "status-postponed";
  if (isFinishedStatus(event.status)) return "status-finished";
  if (isNotStartedStatus(event.status)) {
    if (participantMatches === 2 && timeDeltaMinutes !== null && timeDeltaMinutes <= 30) return "aligned-event-start";
    if (timeDeltaMinutes !== null && timeDeltaMinutes > 30) return "event-time-offset";
    return "status-not-started";
  }
  if (participantMatches === 2 && timeDeltaMinutes !== null && timeDeltaMinutes <= 30) return "aligned-event-start";
  return "event-time-offset";
}

function suggestedLive(evidence: SportsDbLiveEvidence): TriState {
  if (evidence === "explicit-live" || evidence === "status-in-play" || evidence === "aligned-event-start") return "true";
  if (evidence === "explicit-delayed") return "false";
  return "unknown";
}

function participantLabel(event: TheSportsDbEvent): string {
  if (event.homeTeam && event.awayTeam) return `${event.homeTeam} | ${event.awayTeam}`;
  return event.name;
}

function containsEntity(text: string, entity: string): boolean {
  const normalizedEntity = normalize(entity);
  if (!normalizedEntity) return false;
  if (text.includes(normalizedEntity)) return true;
  const tokens = significantTokens(normalizedEntity);
  return tokens.length >= 2 && tokens.every((token) => text.includes(token));
}

function overlapScore(text: string, value: string): number {
  const tokens = significantTokens(value);
  return tokens.filter((token) => text.includes(token)).length;
}

function significantTokens(value: string): string[] {
  return value.split(" ").filter((token) => token.length >= 3 && !["the", "and", "vs", "contre", "match"].includes(token));
}

function sameSport(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return true;
  if ((a === "football" || a === "foot") && (b === "soccer" || b === "football")) return true;
  return b.includes(a) || a.includes(b);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function isInPlayStatus(status: string): boolean {
  return /^(?:Q[1-4]|OT|HT|IN[1-9]|P[1-5]|1H|2H|3P|LIVE|IN PLAY)$/iu.test(status.trim());
}

function isFinishedStatus(status: string): boolean {
  return /^(?:FT|AOT|FINAL|FINISHED|GAME FINISHED)$/iu.test(status.trim());
}

function isNotStartedStatus(status: string): boolean {
  return /^(?:NS|NOT STARTED)$/iu.test(status.trim());
}

function isPostponed(event: TheSportsDbEvent): boolean {
  return /^(?:yes|true|1)$/iu.test(event.postponed) || /postpon|cancel/i.test(event.status);
}
