import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  parseSportsDbEvents,
  parseSportsDbTvBroadcasts,
  type TheSportsDbEvent,
  type TheSportsDbTvBroadcast
} from "../sportsdb/events.js";
import type { TonightBroadcast, TonightItem, TonightReport } from "./tonight.js";

export type Poc3MatchConfidence = "high" | "medium" | "none";
export type Poc3BroadcastSuggestion = "probable-live" | "probable-delayed" | "unknown";

export interface Poc3BroadcastAssessment {
  channel: string;
  timeRangeLabel: string;
  xmltvLiveStatus: TonightBroadcast["liveStatus"];
  timeDeltaMinutes: number | null;
  suggestion: Poc3BroadcastSuggestion;
  reason: string;
}

export interface Poc3MatchedEvent {
  id: string;
  name: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startAtUtc: string;
  status: string;
  confidence: Poc3MatchConfidence;
  frenchTvChannels: string[];
  returnedTvChannels: Array<{ channel: string; country: string }>;
}

export interface Poc3ItemResult {
  itemId: string;
  title: string;
  participants: string;
  competition: string;
  query: string;
  attemptedQueries: string[];
  match: Poc3MatchedEvent | null;
  broadcasts: Poc3BroadcastAssessment[];
}

export interface Poc3SportsDbReport {
  iteration: "poc3";
  source: TonightReport["source"];
  date: string;
  generatedAt: string;
  strategy: "targeted-free-event-search";
  targetCount: number;
  matchedCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  unmatchedCount: number;
  probableLiveBroadcastCount: number;
  probableDelayedBroadcastCount: number;
  frenchTvChannelMatchCount: number;
  items: Poc3ItemResult[];
}

export interface SportsDbTargetedClient {
  searchEvents(eventName: string, date: string): Promise<unknown>;
  tvBroadcastsForEvent(eventId: string): Promise<unknown>;
}

export async function buildPoc3SportsDbReport(
  report: TonightReport,
  client: SportsDbTargetedClient,
  limit = 12
): Promise<Poc3SportsDbReport> {
  const targets = report.items
    .filter((item) => item.sport === "football" && splitParticipants(item.participants) !== null)
    .slice(0, Math.min(8, Math.max(1, limit)));
  const items: Poc3ItemResult[] = [];

  // The public API allows 30 requests/minute. Keeping the calls sequential and
  // the panel at 8 events makes this POC deterministic and rate-limit safe,
  // even with one fallback search and one TV lookup per event.
  for (const item of targets) {
    items.push(await assessItem(item, report.date, client));
  }

  const matched = items.filter((item) => item.match !== null);
  return {
    iteration: "poc3",
    source: report.source,
    date: report.date,
    generatedAt: new Date().toISOString(),
    strategy: "targeted-free-event-search",
    targetCount: items.length,
    matchedCount: matched.length,
    highConfidenceCount: matched.filter((item) => item.match?.confidence === "high").length,
    mediumConfidenceCount: matched.filter((item) => item.match?.confidence === "medium").length,
    unmatchedCount: items.filter((item) => item.match === null).length,
    probableLiveBroadcastCount: items.flatMap((item) => item.broadcasts).filter((item) => item.suggestion === "probable-live").length,
    probableDelayedBroadcastCount: items.flatMap((item) => item.broadcasts).filter((item) => item.suggestion === "probable-delayed").length,
    frenchTvChannelMatchCount: matched.filter((item) => (item.match?.frenchTvChannels.length ?? 0) > 0).length,
    items
  };
}

export async function writePoc3SportsDbReport(reportsRoot: string, report: Poc3SportsDbReport): Promise<string> {
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `poc3-sportsdb-${report.source}-${report.date}.json`);
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}

async function assessItem(
  item: TonightItem,
  date: string,
  client: SportsDbTargetedClient
): Promise<Poc3ItemResult> {
  const participants = splitParticipants(item.participants);
  if (!participants) throw new Error(`Participants invalides pour ${item.title}`);
  const queries = eventQueries(participants);
  let events: TheSportsDbEvent[] = [];
  let query = queries[0] ?? "";
  for (const candidateQuery of queries) {
    query = candidateQuery;
    events = parseSportsDbEvents(await client.searchEvents(candidateQuery, date));
    if (events.length) break;
  }
  const best = selectBestEvent(events, participants, date);
  if (!best || best.confidence === "none") {
    return {
      itemId: item.id,
      title: item.title,
      participants: item.participants,
      competition: item.competition,
      query,
      attemptedQueries: queries,
      match: null,
      broadcasts: item.broadcasts.map((broadcast) => unknownAssessment(broadcast, "aucun événement TheSportsDB suffisamment proche"))
    };
  }

  const tvBroadcasts = parseSportsDbTvBroadcasts(await client.tvBroadcastsForEvent(best.event.id));
  const match = toMatchedEvent(best.event, best.confidence, tvBroadcasts);
  return {
    itemId: item.id,
    title: item.title,
    participants: item.participants,
    competition: item.competition,
    query,
    attemptedQueries: queries,
    match,
    broadcasts: item.broadcasts.map((broadcast) => assessBroadcast(broadcast, best.event, best.confidence))
  };
}

function selectBestEvent(
  events: TheSportsDbEvent[],
  participants: readonly [string, string],
  date: string
): { event: TheSportsDbEvent; confidence: Poc3MatchConfidence; score: number } | null {
  const candidates = events.map((event) => {
    const direct = Number(entityMatches(participants[0], event.homeTeam)) + Number(entityMatches(participants[1], event.awayTeam));
    const reverse = Number(entityMatches(participants[0], event.awayTeam)) + Number(entityMatches(participants[1], event.homeTeam));
    const participantMatches = Math.max(direct, reverse);
    const eventDate = event.date || event.startAtUtc?.slice(0, 10) || "";
    const dateMatches = eventDate === date;
    const score = participantMatches * 45 + (dateMatches ? 10 : 0);
    const confidence: Poc3MatchConfidence = participantMatches === 2 && dateMatches
      ? "high"
      : participantMatches >= 1 && dateMatches
        ? "medium"
        : "none";
    return { event, confidence, score };
  }).sort((left, right) => right.score - left.score || left.event.id.localeCompare(right.event.id));
  return candidates[0] ?? null;
}

function toMatchedEvent(
  event: TheSportsDbEvent,
  confidence: Poc3MatchConfidence,
  tvBroadcasts: TheSportsDbTvBroadcast[]
): Poc3MatchedEvent {
  const returnedTvChannels = tvBroadcasts.map((broadcast) => ({ channel: broadcast.channel, country: broadcast.country }));
  return {
    id: event.id,
    name: event.name,
    league: event.league,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    startAtUtc: event.startAtUtc ?? "",
    status: event.status,
    confidence,
    frenchTvChannels: tvBroadcasts.filter((broadcast) => normalize(broadcast.country) === "france").map((broadcast) => broadcast.channel),
    returnedTvChannels
  };
}

function assessBroadcast(
  broadcast: TonightBroadcast,
  event: TheSportsDbEvent,
  confidence: Poc3MatchConfidence
): Poc3BroadcastAssessment {
  if (broadcast.liveStatus === "delayed") {
    return {
      channel: broadcast.channel,
      timeRangeLabel: broadcast.timeRangeLabel,
      xmltvLiveStatus: broadcast.liveStatus,
      timeDeltaMinutes: signedDeltaMinutes(broadcast.startAtUtc, event.startAtUtc),
      suggestion: "probable-delayed",
      reason: "rediffusion déjà déclarée par XMLTV"
    };
  }
  const delta = signedDeltaMinutes(broadcast.startAtUtc, event.startAtUtc);
  if (confidence !== "high" || delta === null) return unknownAssessment(broadcast, "matching ou horaire insuffisant");
  if (delta >= -120 && delta <= 15) {
    return {
      channel: broadcast.channel,
      timeRangeLabel: broadcast.timeRangeLabel,
      xmltvLiveStatus: broadcast.liveStatus,
      timeDeltaMinutes: delta,
      suggestion: "probable-live",
      reason: delta < 0
        ? `prise d'antenne ${Math.abs(delta)} min avant le début de l'événement`
        : `prise d'antenne alignée à ${delta} min du début de l'événement`
    };
  }
  if (delta >= 120) {
    return {
      channel: broadcast.channel,
      timeRangeLabel: broadcast.timeRangeLabel,
      xmltvLiveStatus: broadcast.liveStatus,
      timeDeltaMinutes: delta,
      suggestion: "probable-delayed",
      reason: `diffusion ${delta} min après le début de l'événement football`
    };
  }
  return unknownAssessment(broadcast, `écart de ${delta} min non concluant`, delta);
}

function unknownAssessment(
  broadcast: TonightBroadcast,
  reason: string,
  timeDeltaMinutes: number | null = null
): Poc3BroadcastAssessment {
  return {
    channel: broadcast.channel,
    timeRangeLabel: broadcast.timeRangeLabel,
    xmltvLiveStatus: broadcast.liveStatus,
    timeDeltaMinutes,
    suggestion: "unknown",
    reason
  };
}

function signedDeltaMinutes(broadcastStartAtUtc: string, eventStartAtUtc: string | null): number | null {
  if (!eventStartAtUtc) return null;
  const broadcast = Date.parse(broadcastStartAtUtc);
  const event = Date.parse(eventStartAtUtc);
  if (!Number.isFinite(broadcast) || !Number.isFinite(event)) return null;
  return Math.round((broadcast - event) / 60_000);
}

function splitParticipants(value: string): [string, string] | null {
  const parts = value.split("|").map((participant) => participant.trim()).filter(Boolean);
  return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null;
}

function eventQueries(participants: readonly [string, string]): string[] {
  const exact = `${participants[0]} vs ${participants[1]}`;
  const normalized = `${sportsDbSearchName(participants[0])} vs ${sportsDbSearchName(participants[1])}`;
  return [...new Set([exact, normalized])];
}

function sportsDbSearchName(value: string): string {
  return value
    .replace(/-sur-Mer\b/giu, "")
    .replace(/\bParis-SG\b/giu, "Paris Saint-Germain")
    .replace(/\bHambourg\b/giu, "Hamburg")
    .replace(/\s+/gu, " ")
    .trim();
}

function entityMatches(left: string, right: string): boolean {
  const a = normalizeTeam(left);
  const b = normalizeTeam(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const aTokens = significantTokens(a);
  const bTokens = significantTokens(b);
  return aTokens.some((token) => bTokens.includes(token));
}

function normalizeTeam(value: string): string {
  return normalize(value)
    .replace(/\b(?:fc|afc|cf|rc|sc|olympique|club)\b/gu, " ")
    .replace(/\bparis sg\b/gu, "paris saint germain")
    .replace(/\bhambourg\b/gu, "hamburg")
    .replace(/\s+/gu, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  const generic = new Set(["city", "united", "athletic", "sporting", "saint", "club", "football"]);
  return value.split(" ").filter((token) => token.length >= 3 && !generic.has(token));
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
