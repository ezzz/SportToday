import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { autoAnnotate, type Confidence, type ContentCategory, type TriState } from "./auto-annotation.js";
import type { DayProgramme, DayReport } from "./day-filter.js";

const DAY_START_HOUR = 0;
const EVENING_START_HOUR = 20;
const TONIGHT_END_MINUTES_AFTER_MIDNIGHT = 30;
const DEFAULT_LIMIT = 12;

export interface TonightBroadcast {
  sourceId: string;
  channel: string;
  channelSourceId: string;
  startAtUtc: string;
  stopAtUtc: string;
  startAtLocal: string;
  timeLabel: string;
}

export interface TonightItem {
  id: string;
  title: string;
  description: string;
  sport: string;
  competition: string;
  participants: string;
  contentCategory: ContentCategory;
  isLive: TriState;
  confidence: Confidence;
  score: number;
  selectionReasons: string[];
  broadcasts: TonightBroadcast[];
}

export interface TonightReport {
  source: DayReport["source"];
  date: string;
  timeZone: string;
  generatedAt: string;
  windowStartUtc: string;
  eveningStartUtc: string;
  windowEndUtc: string;
  programmeCount: number;
  candidateCount: number;
  selectedCount: number;
  limit: number;
  items: TonightItem[];
}

export function buildTonightReport(
  report: DayReport,
  followingReport?: DayReport,
  limit = DEFAULT_LIMIT
): TonightReport {
  const windowStart = zonedDateTime(report.date, DAY_START_HOUR, 0, report.timeZone);
  const eveningStart = zonedDateTime(report.date, EVENING_START_HOUR, 0, report.timeZone);
  const windowEnd = zonedDateTime(nextDate(report.date), 0, TONIGHT_END_MINUTES_AFTER_MIDNIGHT, report.timeZone);
  const programmes = [...report.programmes, ...(followingReport?.programmes ?? [])]
    .filter((programme) => {
      const start = new Date(programme.startAt).getTime();
      return start >= windowStart.getTime() && start < windowEnd.getTime();
    });
  const candidates = programmes.flatMap((programme) => {
    const annotation = autoAnnotate(programme);
    if (annotation.isSport === "false") return [];
    const ranking = rankProgramme(programme, annotation);
    if (ranking.score < 30) return [];
    return [{ programme, annotation, ...ranking }];
  });

  const groups = new Map<string, RankedProgramme[]>();
  for (const candidate of candidates) {
    const key = eventKey(candidate.programme, candidate.annotation.sport, candidate.annotation.competition, candidate.annotation.participants);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  const items = [...groups.values()]
    .map((group) => toTonightItem(group, report.timeZone))
    .sort((left, right) => right.score - left.score
      || categoryOrder(left.contentCategory) - categoryOrder(right.contentCategory)
      || firstStart(left).localeCompare(firstStart(right))
      || left.title.localeCompare(right.title, "fr"));

  return {
    source: report.source,
    date: report.date,
    timeZone: report.timeZone,
    generatedAt: new Date().toISOString(),
    windowStartUtc: windowStart.toISOString(),
    eveningStartUtc: eveningStart.toISOString(),
    windowEndUtc: windowEnd.toISOString(),
    programmeCount: programmes.length,
    candidateCount: candidates.length,
    selectedCount: items.length,
    limit,
    items
  };
}

export async function writeTonightReport(reportsRoot: string, report: TonightReport): Promise<string> {
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `tonight-${report.source}-${report.date}.json`);
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}

interface RankedProgramme {
  programme: DayProgramme;
  annotation: ReturnType<typeof autoAnnotate>;
  score: number;
  reasons: string[];
}

function rankProgramme(
  programme: DayProgramme,
  annotation: ReturnType<typeof autoAnnotate>
): { score: number; reasons: string[] } {
  const text = `${programme.title} ${programme.description ?? ""}`.toLocaleLowerCase("fr-FR");
  const reasons: string[] = [];
  let score = 0;

  if (annotation.isSport === "true") {
    score += 35;
    reasons.push("événement sportif explicite");
  } else {
    score += 12;
    reasons.push("signal sportif à confirmer");
  }
  if (annotation.confidence === "high") score += 18;
  else if (annotation.confidence === "medium") score += 8;
  if (annotation.participants) {
    score += 24;
    reasons.push("participants identifiés");
  }
  if (annotation.competition) {
    score += 16;
    reasons.push("compétition identifiée");
  }
  if (annotation.isLive === "true") {
    score += 28;
    reasons.push("direct explicite");
  } else if (annotation.isLive === "unknown") {
    score += 4;
    reasons.push("statut live à confirmer");
  }
  if (annotation.contentCategory === "Sport Live") score += 15;
  else if (annotation.contentCategory === "Emission") score -= 18;
  if (/grand prix|masters?\b|premier league|ligue [1-3]\b|championnat|finale|tour de |tour d['’]|la vuelta|atp\b|wta\b|ufc|combat|trophée|open d/iu.test(programme.title)) {
    score += 14;
    reasons.push("compétition notable dans le titre");
  } else if (/^(?:la course|le match)$/iu.test(programme.title.trim()) && annotation.competition) {
    score += 8;
    reasons.push("événement générique contextualisé par la description");
  }
  if (/beIN|canal\+|eurosport|rmc sport|l'équipe|sport en france|golf\+/iu.test(programme.channelName)) {
    score += 5;
    reasons.push("chaîne sportive identifiée");
  }
  if (/résumé|review|best of|magazine|analyse|documentaire/iu.test(text)) score -= 12;

  return { score, reasons: [...new Set(reasons)] };
}

function toTonightItem(group: RankedProgramme[], timeZone: string): TonightItem {
  const ranked = [...group].sort((left, right) => right.score - left.score
    || left.programme.startAt.localeCompare(right.programme.startAt));
  const representative = ranked[0];
  if (!representative) throw new Error("Groupe de programmes vide.");
  const broadcasts = uniqueBroadcasts(group.map(({ programme }) => toBroadcast(programme, timeZone)));
  const score = representative.score + Math.min(6, Math.max(0, broadcasts.length - 1) * 2);
  const reasons = [...representative.reasons];
  if (broadcasts.length > 1) reasons.push(`${broadcasts.length} diffusions trouvées`);
  const key = eventKey(
    representative.programme,
    representative.annotation.sport,
    representative.annotation.competition,
    representative.annotation.participants
  );
  return {
    id: createHash("sha256").update(`${representative.programme.source}:${key}`).digest("hex").slice(0, 16),
    title: representative.programme.title,
    description: representative.programme.description ?? "",
    sport: representative.annotation.sport || representative.programme.sportSignals[0] || "sport à confirmer",
    competition: representative.annotation.competition,
    participants: representative.annotation.participants,
    contentCategory: representative.annotation.contentCategory,
    isLive: representative.annotation.isLive,
    confidence: representative.annotation.confidence,
    score,
    selectionReasons: [...new Set(reasons)],
    broadcasts
  };
}

function toBroadcast(programme: DayProgramme, timeZone: string): TonightBroadcast {
  return {
    sourceId: programme.sourceId,
    channel: programme.channelName,
    channelSourceId: programme.channelSourceId,
    startAtUtc: programme.startAt,
    stopAtUtc: programme.stopAt ?? "",
    startAtLocal: programme.localStartAt,
    timeLabel: new Intl.DateTimeFormat("fr-FR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(programme.startAt))
  };
}

function uniqueBroadcasts(broadcasts: TonightBroadcast[]): TonightBroadcast[] {
  const unique = new Map<string, TonightBroadcast>();
  for (const broadcast of broadcasts) {
    unique.set(`${broadcast.channelSourceId}:${broadcast.startAtUtc}`, broadcast);
  }
  return [...unique.values()].sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc)
    || left.channel.localeCompare(right.channel, "fr"));
}

function eventKey(programme: DayProgramme, sport: string, competition: string, participants: string): string {
  const identity = participants || competition || programme.title;
  return `${normalize(sport)}|${normalize(identity)}`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/\b(?:en direct|direct|live|replay|rediffusion|resume|magazine)\b/gu, " ")
    .replace(/\b(?:de|du|des|la|le|les)\b/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function categoryOrder(category: ContentCategory): number {
  return category === "Sport Live" ? 0 : category === "Sport différé" ? 1 : 2;
}

function firstStart(item: TonightItem): string {
  return item.broadcasts[0]?.startAtUtc ?? "";
}

function nextDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function zonedDateTime(date: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const localAsUtc = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hour, minute);
  let instant = localAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    instant = localAsUtc - offsetMinutes(new Date(instant), timeZone) * 60_000;
  }
  return new Date(instant);
}

function offsetMinutes(date: Date, timeZone: string): number {
  const value = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = value.match(/^GMT(?:(\+|-)\d{1,2}(?::(\d{2}))?)?$/u);
  if (!match?.[1]) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const [hours, minutes] = value.slice(4).split(":").map(Number);
  return sign * ((hours ?? 0) * 60 + (minutes ?? 0));
}
