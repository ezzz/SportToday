import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

import type { ProgrammeRecord, SourceId } from "../types.js";
import { sportSignals } from "../xmltv/parser.js";

export interface DayProgramme extends ProgrammeRecord {
  channelName: string;
  isSportCandidate: boolean;
  sportSignals: string[];
  localStartAt: string;
}

export interface DayReport {
  source: Extract<SourceId, "xmltvfr" | "xmltvfree">;
  date: string;
  timeZone: string;
  windowStartUtc: string;
  windowEndUtc: string;
  programmeCount: number;
  sportCandidateCount: number;
  sports: Array<{ sport: string; programmeCount: number }>;
  channels: Array<{ channelName: string; programmeCount: number; sportCandidateCount: number }>;
  /** All channels known to the source, including channels with no programme on this date. */
  availableChannels?: Array<{ channelSourceId: string; channelName: string }>;
  programmes: DayProgramme[];
}

export function buildDayReport(
  database: DatabaseSync,
  source: Extract<SourceId, "xmltvfr" | "xmltvfree">,
  date: string,
  timeZone: string
): DayReport {
  validateDate(date);
  const windowStart = zonedMidnight(date, timeZone);
  const windowEnd = zonedMidnight(nextDate(date), timeZone);
  const rows = database.prepare(`
    SELECT
      p.source_id,
      p.channel_source_id,
      p.title,
      p.sub_title,
      p.description,
      p.categories_json,
      p.start_at,
      p.stop_at,
      p.is_previously_shown,
      c.display_name AS channel_name
    FROM source_programme p
    LEFT JOIN source_channel c
      ON c.source = p.source AND c.source_id = p.channel_source_id
    WHERE p.source = ?
      AND p.start_at >= ?
      AND p.start_at < ?
    ORDER BY p.start_at ASC
  `).all(source, windowStart.toISOString(), windowEnd.toISOString()) as Array<Record<string, unknown>>;
  const channelRows = database.prepare(`
    SELECT source_id, display_name
    FROM source_channel
    WHERE source = ?
      AND (
        last_seen_at = (SELECT MAX(last_seen_at) FROM source_channel WHERE source = ?)
        OR (last_seen_at IS NULL AND (SELECT MAX(last_seen_at) FROM source_channel WHERE source = ?) IS NULL)
      )
    ORDER BY display_name ASC
  `).all(source, source, source) as Array<Record<string, unknown>>;

  const programmes = rows.map((row) => {
    const categories = parseCategories(row.categories_json);
    const programme: ProgrammeRecord = {
      source,
      sourceId: String(row.source_id ?? ""),
      channelSourceId: String(row.channel_source_id ?? ""),
      title: String(row.title ?? ""),
      ...(row.sub_title ? { subTitle: String(row.sub_title) } : {}),
      ...(row.description ? { description: String(row.description) } : {}),
      categories,
      startAt: String(row.start_at),
      ...(row.stop_at ? { stopAt: String(row.stop_at) } : {}),
      isPreviouslyShown: Number(row.is_previously_shown ?? 0) === 1
    };
    const signals = sportSignals(programme);
    return {
      ...programme,
      channelName: String(row.channel_name ?? programme.channelSourceId),
      isSportCandidate: signals.length > 0,
      sportSignals: signals,
      localStartAt: formatLocal(programme.startAt, timeZone)
    } satisfies DayProgramme;
  });

  const channelMap = new Map<string, { programmeCount: number; sportCandidateCount: number }>();
  const sportMap = new Map<string, number>();
  for (const programme of programmes) {
    const counts = channelMap.get(programme.channelName) ?? { programmeCount: 0, sportCandidateCount: 0 };
    counts.programmeCount += 1;
    if (programme.isSportCandidate) counts.sportCandidateCount += 1;
    channelMap.set(programme.channelName, counts);
    for (const signal of programme.sportSignals) {
      sportMap.set(signal, (sportMap.get(signal) ?? 0) + 1);
    }
  }

  return {
    source,
    date,
    timeZone,
    windowStartUtc: windowStart.toISOString(),
    windowEndUtc: windowEnd.toISOString(),
    programmeCount: programmes.length,
    sportCandidateCount: programmes.filter((programme) => programme.isSportCandidate).length,
    sports: [...sportMap.entries()]
      .map(([sport, programmeCount]) => ({ sport, programmeCount }))
      .sort((left, right) => right.programmeCount - left.programmeCount || left.sport.localeCompare(right.sport)),
    channels: [...channelMap.entries()]
      .map(([channelName, counts]) => ({ channelName, ...counts }))
      .sort((left, right) => right.sportCandidateCount - left.sportCandidateCount || left.channelName.localeCompare(right.channelName)),
    availableChannels: channelRows.map((row) => ({
      channelSourceId: String(row.source_id ?? ""),
      channelName: String(row.display_name ?? row.source_id ?? "")
    })).filter((channel) => channel.channelName),
    programmes
  };
}

export async function writeDayReport(reportsRoot: string, report: DayReport): Promise<string> {
  await mkdir(reportsRoot, { recursive: true });
  const reportPath = path.join(reportsRoot, `day-${report.source}-${report.date}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

function parseCategories(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function validateDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Date invalide: ${value}. Utilisez YYYY-MM-DD.`);
  }
}

function nextDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function zonedMidnight(date: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  const offset = offsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offset * 60_000);
}

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset"
  }).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = value.match(/^GMT(?:(\+|-)\d{1,2}(?::(\d{2}))?)?$/);
  if (!match?.[1]) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const numbers = value.slice(4).split(":").map(Number);
  return sign * ((numbers[0] ?? 0) * 60 + (numbers[1] ?? 0));
}

function formatLocal(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
