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
    "heuristicSport", "heuristicSignals", "autoIsSport", "autoConfidence", "autoReason", "autoSport",
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
    "", "", "", "", "", "", "", "", "", "", ""
  ];
}

interface AutoAnnotation {
  isSport: "true" | "false" | "unknown";
  confidence: "high" | "medium" | "low";
  reason: string;
  sport: string;
}

function autoAnnotate(programme: DayProgramme): AutoAnnotation {
  const title = programme.title.toLocaleLowerCase("fr-FR");
  const description = (programme.description ?? "").toLocaleLowerCase("fr-FR");
  const categories = programme.categories.join(" ").toLocaleLowerCase("fr-FR");
  const text = `${title} ${description} ${categories}`;
  const sport = programme.sportSignals[0] ?? "";

  if (/dessin animé|animation|fiction|série|film|jeunesse/.test(categories)) {
    return { isSport: "false", confidence: "high", reason: "catégorie fiction/animation/jeunesse", sport };
  }

  if (/foot 2 rue|la chaîne officielle|vivez en direct les évènements|à bientôt sur|autopromotion|bande annonce|publicité/.test(text)) {
    return { isSport: "false", confidence: "high", reason: "fiction ou autopromotion", sport };
  }

  const eventPattern = /grand prix|masters?\b|premier league|ligue 1|championnat|match|trophée|tour de |atp\b|wta\b|roland|open d|ufc|combat|finale|demi-finale|quart de finale|cyclassics|arctic race/;
  if (eventPattern.test(text) && programme.isSportCandidate) {
    return { isSport: "true", confidence: "high", reason: "événement ou compétition sportive explicite", sport };
  }

  if (programme.isSportCandidate && /résumé|review|magazine|analyse|inside|best of|journal/.test(title)) {
    return { isSport: "true", confidence: "medium", reason: "programme éditorial sportif", sport };
  }

  if (programme.isSportCandidate && sport) {
    return { isSport: "unknown", confidence: "low", reason: "mot-clé sportif sans événement explicite", sport };
  }

  return { isSport: "false", confidence: "medium", reason: "aucun signal sportif exploitable", sport };
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
