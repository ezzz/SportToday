import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SportEvent } from "../events/model.js";
import { autoAnnotate, type LiveStatus } from "./auto-annotation.js";
import type { DayProgramme, DayReport } from "./day-filter.js";
import { isQuarantinedProgramme, type TonightBroadcast, type TonightItem, type TonightReport } from "./tonight.js";

const DEFAULT_LIMIT = 10;

export function buildPoc4EventReport(
  events: readonly SportEvent[],
  report: DayReport,
  followingReport?: DayReport,
  limit = DEFAULT_LIMIT
): TonightReport {
  const programmes = [...report.programmes, ...(followingReport?.programmes ?? [])]
    .filter((programme) => !isQuarantinedProgramme(programme));
  const items = events
    .map((event) => eventItem(event, programmes, report.timeZone))
    .sort((left, right) => right.score - left.score
      || (left.eventStartAtUtc ?? "").localeCompare(right.eventStartAtUtc ?? "")
      || left.title.localeCompare(right.title, "fr"));
  const matchedEventCount = items.filter((item) => item.broadcasts.length > 0).length;
  const windowStart = zonedDateTime(report.date, 0, 0, report.timeZone);
  const eveningStart = zonedDateTime(report.date, 20, 0, report.timeZone);
  const windowEnd = zonedDateTime(nextDate(report.date), 0, 30, report.timeZone);
  return {
    iteration: "poc41",
    viewMode: "event-first",
    source: report.source,
    date: report.date,
    timeZone: report.timeZone,
    generatedAt: new Date().toISOString(),
    windowStartUtc: windowStart.toISOString(),
    eveningStartUtc: eveningStart.toISOString(),
    windowEndUtc: windowEnd.toISOString(),
    programmeCount: programmes.length,
    candidateCount: events.length,
    quarantinedProgrammeCount: [...report.programmes, ...(followingReport?.programmes ?? [])].filter(isQuarantinedProgramme).length,
    selectedCount: items.length,
    limit,
    items,
    catalogueEventCount: events.length,
    matchedEventCount,
    unmatchedEventCount: items.length - matchedEventCount,
    footballEventCount: events.filter((event) => event.sport === "football").length,
    f1EventCount: events.filter((event) => event.sport === "f1").length
  };
}

export async function writePoc4EventReport(reportsRoot: string, report: TonightReport): Promise<string> {
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `poc4-events-${report.source}-${report.date}.json`);
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}

function eventItem(event: SportEvent, programmes: readonly DayProgramme[], timeZone: string): TonightItem {
  const matches = programmes
    .map((programme) => matchProgramme(event, programme, timeZone))
    .filter((value): value is ProgrammeMatch => value !== null)
    .sort((left, right) => right.score - left.score || left.broadcast.startAtUtc.localeCompare(right.broadcast.startAtUtc));
  const strongMatches = matches.filter((match) => match.confidence === "high");
  const retained = strongMatches.length > 0 ? strongMatches : matches.filter((match) => match.confidence === "medium");
  const broadcasts = uniqueBroadcasts(retained.map((match) => match.broadcast));
  const matchConfidence = strongMatches.length > 0 ? "high" : retained.length > 0 ? "medium" : "none";
  const eventEndAtUtc = event.endAtUtc ?? inferredEnd(event);
  const eventTimeLabel = event.endAtUtc
    ? formatTimeRange(event.startAtUtc, event.endAtUtc, timeZone)
    : formatTime(event.startAtUtc, timeZone);
  const liveStatus = aggregateLiveStatus(broadcasts);
  const matchReasons = retained.flatMap((match) => match.reasons);
  return {
    id: event.id,
    title: event.title,
    description: event.stage ? `${event.competition} · ${event.stage}` : event.competition,
    sport: event.sport,
    competition: event.competition,
    participants: event.participants.join(" | "),
    contentCategory: "Sport Live",
    isLive: "true",
    liveStatus,
    titleQuality: "clear",
    confidence: matchConfidence === "high" ? "high" : matchConfidence === "medium" ? "medium" : "low",
    score: event.priorityScore + (matchConfidence === "high" ? 12 : matchConfidence === "medium" ? 5 : 0),
    selectionReasons: [...new Set([
      ...event.priorityReasons,
      ...matchReasons,
      broadcasts.length ? `${broadcasts.length} diffusion${broadcasts.length > 1 ? "s" : ""} XMLTV rattachée${broadcasts.length > 1 ? "s" : ""}` : "aucune diffusion XMLTV retrouvée"
    ])],
    broadcasts,
    eventStartAtUtc: event.startAtUtc,
    eventEndAtUtc,
    eventTimeLabel,
    eventSource: event.source,
    eventSourceId: event.sourceEventId,
    eventStatus: event.status,
    eventStage: event.stage,
    eventImportance: event.importance,
    eventTimeConfidence: event.timeConfidence,
    broadcastMatchConfidence: matchConfidence
  };
}

interface ProgrammeMatch {
  score: number;
  confidence: "high" | "medium";
  reasons: string[];
  broadcast: TonightBroadcast;
}

function matchProgramme(event: SportEvent, programme: DayProgramme, timeZone: string): ProgrammeMatch | null {
  const sport = programme.sportSignals;
  if (event.sport === "football" && !sport.includes("football")) return null;
  if (event.sport === "f1" && !sport.includes("f1")) return null;
  const text = `${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`;
  const startDelta = minutesBetween(programme.startAt, event.startAtUtc);
  const endAt = event.endAtUtc ?? inferredEnd(event);
  const afterEventMinutes = minutesBetween(programme.startAt, endAt);
  const programmeStop = Date.parse(programme.stopAt ?? programme.startAt);
  const eventStart = Date.parse(event.startAtUtc);
  let score = 0;
  const reasons: string[] = [];
  if (event.sport === "football") {
    const participantMatches = event.participants.filter((participant) => entityMatches(participant, text)).length;
    if (participantMatches < 2) return null;
    score += 80;
    reasons.push("deux équipes reconnues dans le programme");
  } else {
    const stageMatch = f1StageMatches(event.stage, text);
    const raceMatch = f1RaceMatches(event, text);
    if (!stageMatch) return null;
    if (!raceMatch && Math.abs(startDelta) > 150) return null;
    score += stageMatch ? 42 : 0;
    score += raceMatch ? 38 : 10;
    reasons.push(stageMatch ? "session F1 reconnue" : "session F1 à confirmer");
    if (raceMatch) reasons.push("Grand Prix reconnu");
  }
  if (!programme.isPreviouslyShown && programmeStop <= eventStart + 15 * 60_000) return null;
  if (programme.isPreviouslyShown) {
    score += 8;
    reasons.push("rediffusion XMLTV rattachée à l'événement");
  } else if (programmeOverlaps(programme, event.startAtUtc, 30)) {
    score += 25;
    reasons.push("créneau TV couvrant l'heure officielle");
  } else if (startDelta >= -150 && startDelta <= 45) {
    score += 15;
    reasons.push("horaire TV proche de l'heure officielle");
  } else if (afterEventMinutes >= 30 && afterEventMinutes <= 24 * 60) {
    score += 5;
    reasons.push("diffusion postérieure rattachée comme replay possible");
  } else {
    return null;
  }
  const confidence = score >= 90 ? "high" : score >= 60 ? "medium" : null;
  return confidence ? { score, confidence, reasons, broadcast: toEventBroadcast(programme, event, timeZone) } : null;
}

function toEventBroadcast(programme: DayProgramme, event: SportEvent, timeZone: string): TonightBroadcast {
  const annotation = autoAnnotate(programme);
  const formatter = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  const timeLabel = formatter.format(new Date(programme.startAt));
  const endTimeLabel = programme.stopAt ? formatter.format(new Date(programme.stopAt)) : "";
  const directText = /\b(?:en direct|direct|live)\b/iu.test(`${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`);
  const delayedText = /\b(?:rediffusion|replay|différé|déjà diffusé)\b/iu.test(`${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`);
  const overlaps = programmeOverlaps(programme, event.startAtUtc, 30);
  const eventDeltaMinutes = minutesBetween(programme.startAt, event.startAtUtc);
  let liveStatus: LiveStatus = "unknown";
  let liveEvidence = "horaire insuffisant pour conclure";
  if (programme.isPreviouslyShown || delayedText || annotation.liveStatus === "delayed") {
    liveStatus = "delayed";
    liveEvidence = programme.isPreviouslyShown ? "rediffusion déclarée par XMLTV" : "indice textuel de rediffusion";
  } else if (directText || annotation.liveStatus === "confirmed") {
    liveStatus = "confirmed";
    liveEvidence = "direct explicite dans le programme";
  } else if (overlaps) {
    liveStatus = "probable";
    liveEvidence = "créneau TV couvrant l'heure officielle de l'événement";
  }
  return {
    sourceId: programme.sourceId,
    channel: programme.channelName,
    channelSourceId: programme.channelSourceId,
    startAtUtc: programme.startAt,
    stopAtUtc: programme.stopAt ?? "",
    startAtLocal: programme.localStartAt,
    timeLabel,
    endTimeLabel,
    timeRangeLabel: endTimeLabel ? `${timeLabel}–${endTimeLabel}` : timeLabel,
    subTitle: programme.subTitle ?? "",
    isPreviouslyShown: programme.isPreviouslyShown,
    liveStatus,
    liveEvidence,
    broadcastAlignedToEvent: eventDeltaMinutes >= -15 && eventDeltaMinutes <= 15
  };
}

function inferredEnd(event: SportEvent): string {
  const minutes = event.sport === "football"
    ? 135
    : /course/iu.test(event.stage)
      ? 180
      : /qualifications/iu.test(event.stage)
        ? 120
        : 90;
  return new Date(Date.parse(event.startAtUtc) + minutes * 60_000).toISOString();
}

function programmeOverlaps(programme: DayProgramme, instant: string, minimumCoverageMinutes = 0): boolean {
  const start = Date.parse(programme.startAt);
  const stop = Date.parse(programme.stopAt ?? programme.startAt);
  const target = Date.parse(instant);
  return start <= target + 15 * 60_000 && stop >= target + minimumCoverageMinutes * 60_000;
}

function minutesBetween(left: string, right: string): number {
  return Math.round((Date.parse(left) - Date.parse(right)) / 60_000);
}

function entityMatches(entity: string, text: string): boolean {
  const entityTokens = meaningfulTokens(entity).map(teamAlias);
  const textTokens = new Set(meaningfulTokens(text).map(teamAlias));
  if (!entityTokens.length) return false;
  const matched = entityTokens.filter((token) => textTokens.has(token)).length;
  return matched >= Math.max(1, Math.ceil(entityTokens.length * 0.6));
}

function teamAlias(value: string): string {
  const aliases: Record<string, string> = {
    psg: "paris", parisien: "paris", marseillais: "marseille", om: "marseille",
    inter: "internazionale", milan: "milan", munchen: "munich"
  };
  return aliases[value] ?? value;
}

function meaningfulTokens(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length >= 3 && ![
    "football", "club", "olympique", "sporting", "association", "saint", "germain"
  ].includes(token));
}

function f1StageMatches(stage: string, text: string): boolean {
  const normalized = normalize(text);
  if (/parade|on board|grille|warm up|debrief|magazine|resume|best of/u.test(normalized)) return false;
  if (/qualifications sprint/iu.test(stage)) return /qualification.*sprint|sprint.*qualification/u.test(normalized);
  if (/qualifications/iu.test(stage)) return /qualification/u.test(normalized) && !/sprint/u.test(normalized);
  if (/sprint/iu.test(stage)) return /sprint/u.test(normalized) && !/qualification/u.test(normalized);
  if (/course/iu.test(stage)) return /\bcourse\b|grand prix/u.test(normalized) && !/qualification|essais|sprint/u.test(normalized);
  const number = stage.match(/(\d)/u)?.[1];
  return /essais libres/u.test(normalized) && (!number || normalized.includes(number));
}

function f1RaceMatches(event: SportEvent, text: string): boolean {
  const eventTokens = meaningfulTokens(event.competition).filter((token) => !["grand", "prix"].includes(token));
  const textTokens = new Set(meaningfulTokens(text));
  return eventTokens.some((token) => textTokens.has(token));
}

function formatTimeRange(startAt: string, endAt: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  return `${formatter.format(new Date(startAt))}–${formatter.format(new Date(endAt))}`;
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function uniqueBroadcasts(values: readonly TonightBroadcast[]): TonightBroadcast[] {
  return [...new Map(values.map((broadcast) => [`${broadcast.channelSourceId}:${broadcast.startAtUtc}`, broadcast])).values()]
    .sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc) || left.channel.localeCompare(right.channel, "fr"));
}

function aggregateLiveStatus(broadcasts: readonly TonightBroadcast[]): LiveStatus {
  const statuses = new Set(broadcasts.map((broadcast) => broadcast.liveStatus));
  if (statuses.has("confirmed")) return "confirmed";
  if (statuses.has("probable")) return "probable";
  if (statuses.size > 0 && [...statuses].every((status) => status === "delayed")) return "delayed";
  return "unknown";
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/gu, " ").trim();
}

function nextDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function zonedDateTime(date: string, hour: number, minute: number, timeZone: string): Date {
  const guess = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(guess);
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = value.match(/^GMT(?:(\+|-)\d{1,2}(?::(\d{2}))?)?$/u);
  if (!match?.[1]) return guess;
  const sign = match[1] === "+" ? 1 : -1;
  const numbers = value.slice(4).split(":").map(Number);
  const offset = sign * ((numbers[0] ?? 0) * 60 + (numbers[1] ?? 0));
  return new Date(guess.getTime() - offset * 60_000);
}
