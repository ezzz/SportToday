import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { DayProgramme, DayReport } from "./day-filter.js";
import { autoAnnotate, type ContentCategory } from "./auto-annotation.js";
import { matchProgrammeToSportsDb } from "./sportsdb-match.js";
import type { TheSportsDbEvent } from "../sportsdb/events.js";

const DEFAULT_SPORT_LIMIT = 100;
const DEFAULT_NON_SPORT_LIMIT = 50;

export async function writeValidationCsv(
  reportsRoot: string,
  report: DayReport,
  sportLimit = DEFAULT_SPORT_LIMIT,
  nonSportLimit = DEFAULT_NON_SPORT_LIMIT,
  sportsDbEvents: TheSportsDbEvent[] = []
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
  const rows = selected.map(({ programme, validationType }) => rowFor(programme, report.date, validationType, sportsDbEvents));

  const header = [
    "rowId", "validationType", "contentCategory", "source", "date", "channel", "channelSourceId",
    "startAtUtc", "startAtLocal", "stopAtUtc", "title", "description", "categories",
    "heuristicSport", "heuristicSignals", "autoIsSport", "autoConfidence", "autoReason", "autoSport",
    "autoCompetition", "autoParticipants", "autoIsLive", "checkRequired", "checkReason",
    "sportsDbEventId", "sportsDbEvent", "sportsDbCompetition", "sportsDbParticipants",
    "sportsDbStartAt", "sportsDbTimeDeltaMinutes", "sportsDbMatchConfidence", "sportsDbLiveEvidence",
    "isSport", "sport", "competition", "participants",
    "isLive", "channelCorrect", "timeCorrect", "referenceUrl", "referenceStartAt", "checkedAt", "notes"
  ];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `validation-${report.source}-${report.date}.csv`);
  await writeFile(filePath, csv, "utf8");
  return { path: filePath, sportCount: sportCandidates.length, nonSportCount: nonSportCandidates.length };
}

function rowFor(
  programme: DayProgramme,
  date: string,
  validationType: string,
  sportsDbEvents: TheSportsDbEvent[]
): string[] {
  const annotation = autoAnnotate(programme);
  const sportsDbMatch = matchProgrammeToSportsDb(programme, annotation, sportsDbEvents);
  const effectiveIsLive = sportsDbMatch && sportsDbMatch.suggestedIsLive !== "unknown"
    ? sportsDbMatch.suggestedIsLive
    : annotation.isLive;
  const checkReasons = [annotation.checkReason];
  if (sportsDbMatch && sportsDbMatch.suggestedIsLive === "unknown" && annotation.isSport !== "false") {
    checkReasons.push("preuve TheSportsDB insuffisante pour le direct");
  }
  const checkReason = checkReasons.filter(Boolean).join("; ");
  const checkRequired = annotation.checkRequired === "true" || checkReason !== annotation.checkReason ? "true" : "false";
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
    effectiveIsLive,
    checkRequired,
    checkReason,
    sportsDbMatch?.eventId ?? "",
    sportsDbMatch?.eventName ?? "",
    sportsDbMatch?.competition ?? "",
    sportsDbMatch?.participants ?? "",
    sportsDbMatch?.startAtUtc ?? "",
    sportsDbMatch?.timeDeltaMinutes === null || sportsDbMatch?.timeDeltaMinutes === undefined
      ? ""
      : String(sportsDbMatch.timeDeltaMinutes),
    sportsDbMatch?.confidence ?? "none",
    sportsDbMatch?.liveEvidence ?? (annotation.isSport === "false" ? "not-sport" : "no-match"),
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
