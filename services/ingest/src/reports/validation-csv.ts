import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { DayProgramme, DayReport } from "./day-filter.js";
import { autoAnnotate, type ContentCategory } from "./auto-annotation.js";

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
  const selected = [
    ...sportCandidates.map((programme) => ({ programme, validationType: "heuristic_candidate" })),
    ...nonSportCandidates.map((programme) => ({ programme, validationType: "heuristic_non_candidate" }))
  ].sort((left, right) => categoryOrder(autoAnnotate(left.programme).contentCategory) - categoryOrder(autoAnnotate(right.programme).contentCategory)
    || left.programme.startAt.localeCompare(right.programme.startAt)
    || left.programme.channelName.localeCompare(right.programme.channelName));
  const rows = selected.map(({ programme, validationType }) => rowFor(programme, report.date, validationType));

  const header = [
    "rowId", "validationType", "contentCategory", "source", "date", "channel", "channelSourceId",
    "startAtUtc", "startAtLocal", "stopAtUtc", "title", "description", "categories",
    "heuristicSport", "heuristicSignals", "autoIsSport", "autoConfidence", "autoReason", "autoSport",
    "autoCompetition", "autoParticipants", "autoIsLive", "checkRequired", "checkReason",
    "isSport", "sport", "competition", "participants",
    "isLive", "channelCorrect", "timeCorrect", "referenceUrl", "referenceStartAt", "checkedAt", "notes"
  ];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `validation-${report.source}-${report.date}.csv`);
  await writeFile(filePath, csv, "utf8");
  return { path: filePath, sportCount: sportCandidates.length, nonSportCount: nonSportCandidates.length };
}

function rowFor(programme: DayProgramme, date: string, validationType: string): string[] {
  const annotation = autoAnnotate(programme);
  return [
    programme.sourceId,
    validationType,
    annotation.contentCategory,
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
    annotation.isSport,
    annotation.confidence,
    annotation.reason,
    annotation.sport,
    annotation.competition,
    annotation.participants,
    annotation.isLive,
    annotation.checkRequired,
    annotation.checkReason,
    "", "", "", "", "", "", "", "", "", "", ""
  ];
}
function categoryOrder(category: ContentCategory): number {
  return category === "Sport Live" ? 0 : category === "Sport différé" ? 1 : 2;
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
