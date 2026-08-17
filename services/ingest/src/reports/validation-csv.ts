import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { DayProgramme, DayReport } from "./day-filter.js";

const DEFAULT_SPORT_LIMIT = 100;
const DEFAULT_NON_SPORT_LIMIT = 50;

export async function writeValidationCsv(
  reportsRoot: string,
  report: DayReport,
  sportLimit = DEFAULT_SPORT_LIMIT,
  nonSportLimit = DEFAULT_NON_SPORT_LIMIT
): Promise<{ path: string; sportCount: number; nonSportCount: number }> {
  const sportCandidates = report.programmes
    .filter((programme) => programme.isSportCandidate)
    .sort(stableOrder)
    .slice(0, sportLimit);
  const nonSportCandidates = report.programmes
    .filter((programme) => !programme.isSportCandidate)
    .sort(stableOrder)
    .slice(0, nonSportLimit);
  const rows = [
    ...sportCandidates.map((programme) => rowFor(programme, report.date, "heuristic_candidate")),
    ...nonSportCandidates.map((programme) => rowFor(programme, report.date, "heuristic_non_candidate"))
  ];

  const header = [
    "rowId", "validationType", "source", "date", "channel", "channelSourceId",
    "startAtUtc", "startAtLocal", "stopAtUtc", "title", "description", "categories",
    "heuristicSport", "heuristicSignals", "isSport", "sport", "competition", "participants",
    "isLive", "channelCorrect", "timeCorrect", "referenceUrl", "referenceStartAt", "checkedAt", "notes"
  ];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `validation-${report.source}-${report.date}.csv`);
  await writeFile(filePath, csv, "utf8");
  return { path: filePath, sportCount: sportCandidates.length, nonSportCount: nonSportCandidates.length };
}

function rowFor(programme: DayProgramme, date: string, validationType: string): string[] {
  return [
    programme.sourceId,
    validationType,
    programme.source,
    date,
    programme.channelName,
    programme.channelSourceId,
    programme.startAt,
    programme.localStartAt,
    programme.stopAt ?? "",
    programme.title,
    programme.description ?? "",
    programme.categories.join("|"),
    programme.isSportCandidate ? "true" : "false",
    programme.sportSignals.join("|"),
    "", "", "", "", "", "", "", "", "", "", ""
  ];
}

function stableOrder(left: DayProgramme, right: DayProgramme): number {
  return hash(`${left.source}:${left.sourceId}`).localeCompare(hash(`${right.source}:${right.sourceId}`));
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function csvCell(value: string): string {
  const safeValue = /^[=+@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}
