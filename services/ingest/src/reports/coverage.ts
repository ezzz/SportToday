import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SportEvent } from "../events/model.js";
import type { DayProgramme, DayReport } from "./day-filter.js";
import type { TonightReport } from "./tonight.js";

/** A diagnostic-only watchlist of French sports channels and their XMLTV aliases. */
export interface CoverageChannelRule {
  id: string;
  label: string;
  priority: number;
  aliases: readonly string[];
}

export const coverageChannelRules: readonly CoverageChannelRule[] = [
  { id: "canal-foot", label: "Canal+ Foot", priority: 100, aliases: ["canal foot"] },
  { id: "canal-sport", label: "Canal+ Sport", priority: 98, aliases: ["canal sport"] },
  { id: "canal-sport-360", label: "Canal+ Sport 360", priority: 96, aliases: ["canal sport 360", "canal sport360", "sport 360"] },
  { id: "canal-live", label: "Canal+ Live", priority: 90, aliases: ["canal live"] },
  { id: "bein-sports-1", label: "beIN Sports 1", priority: 95, aliases: ["bein sports 1", "bein 1"] },
  { id: "bein-sports-2", label: "beIN Sports 2", priority: 94, aliases: ["bein sports 2", "bein 2"] },
  { id: "bein-sports-3", label: "beIN Sports 3", priority: 93, aliases: ["bein sports 3", "bein 3"] },
  { id: "bein-sports-max", label: "beIN Sports MAX", priority: 86, aliases: ["bein sports max", "bein max"] },
  { id: "eurosport-1", label: "Eurosport 1", priority: 88, aliases: ["eurosport 1"] },
  { id: "eurosport-2", label: "Eurosport 2", priority: 87, aliases: ["eurosport 2"] },
  { id: "eurosport-360", label: "Eurosport 360", priority: 80, aliases: ["eurosport 360", "eurosport360"] },
  { id: "lequipe", label: "L'Équipe", priority: 84, aliases: ["l equipe", "lequipe"] },
  { id: "lequipe-live", label: "L'Équipe Live", priority: 78, aliases: ["l equipe live", "lequipe live"] },
  { id: "dazn", label: "DAZN", priority: 82, aliases: ["dazn"] },
  { id: "golf-plus", label: "Golf+", priority: 78, aliases: ["golf plus", "golf+"] },
  { id: "rmc-sport", label: "RMC Sport", priority: 76, aliases: ["rmc sport"] },
  { id: "sport-en-france", label: "Sport en France", priority: 70, aliases: ["sport en france"] },
  { id: "automoto", label: "Automoto", priority: 62, aliases: ["automoto"] }
] as const;

export type CoverageChannelStatus = "present" | "present_empty" | "missing";
export type CoverageEventStatus = "matched" | "unmatched";

export interface CoverageChannel {
  id: string;
  label: string;
  priority: number;
  status: CoverageChannelStatus;
  observedChannelNames: string[];
  programmeCount: number;
  sportProgrammeCount: number;
  firstProgrammeStartAtUtc?: string;
  lastProgrammeStopAtUtc?: string;
}

export interface CoverageEvent {
  eventId: string;
  title: string;
  sport: SportEvent["sport"];
  competition: string;
  importance: SportEvent["importance"];
  startAtUtc: string;
  status: CoverageEventStatus;
  broadcastCount: number;
  channels: string[];
  reason: "matched" | "no_epg_match";
}

export interface CoverageReport {
  iteration: "poc43";
  source: DayReport["source"];
  date: string;
  timeZone: string;
  generatedAt: string;
  programmeCount: number;
  sportProgrammeCount: number;
  sourceChannelCount: number;
  observedPriorityChannelCount: number;
  missingPriorityChannelCount: number;
  emptyPriorityChannelCount: number;
  expectedEventCount: number;
  matchedEventCount: number;
  unmatchedEventCount: number;
  channels: CoverageChannel[];
  events: CoverageEvent[];
  eventSourceErrors: string[];
}

export function buildCoverageReport(
  events: readonly SportEvent[],
  dayReport: DayReport,
  eventReport: TonightReport
): CoverageReport {
  const programmes = dayReport.programmes;
  const directory = dayReport.availableChannels ?? dayReport.channels.map((channel) => ({
    channelSourceId: channel.channelName,
    channelName: channel.channelName
  }));
  const sourceChannelNames = unique(directory.map((channel) => channel.channelName));
  const channels = coverageChannelRules
    .map((rule) => channelCoverage(rule, sourceChannelNames, programmes))
    .sort((left, right) => right.priority - left.priority || left.label.localeCompare(right.label, "fr"));
  const reportItems = new Map(eventReport.items.map((item) => [item.id, item]));
  const eventCoverage = events.map((event): CoverageEvent => {
    const item = reportItems.get(event.id);
    const broadcasts = item?.broadcasts ?? [];
    const matched = broadcasts.length > 0;
    return {
      eventId: event.id,
      title: event.title,
      sport: event.sport,
      competition: event.competition,
      importance: event.importance,
      startAtUtc: event.startAtUtc,
      status: matched ? "matched" : "unmatched",
      broadcastCount: broadcasts.length,
      channels: unique(broadcasts.map((broadcast) => broadcast.channel)),
      reason: matched ? "matched" : "no_epg_match"
    };
  }).sort((left, right) => Number(left.status === "matched") - Number(right.status === "matched")
    || importanceOrder(left.importance) - importanceOrder(right.importance)
    || left.startAtUtc.localeCompare(right.startAtUtc));
  const matchedEventCount = eventCoverage.filter((event) => event.status === "matched").length;

  return {
    iteration: "poc43",
    source: dayReport.source,
    date: dayReport.date,
    timeZone: dayReport.timeZone,
    generatedAt: new Date().toISOString(),
    programmeCount: dayReport.programmeCount,
    sportProgrammeCount: dayReport.sportCandidateCount,
    sourceChannelCount: sourceChannelNames.length,
    observedPriorityChannelCount: channels.filter((channel) => channel.status === "present").length,
    missingPriorityChannelCount: channels.filter((channel) => channel.status === "missing").length,
    emptyPriorityChannelCount: channels.filter((channel) => channel.status === "present_empty").length,
    expectedEventCount: eventCoverage.length,
    matchedEventCount,
    unmatchedEventCount: eventCoverage.length - matchedEventCount,
    channels,
    events: eventCoverage,
    eventSourceErrors: eventReport.eventSourceErrors ?? []
  };
}

export async function writeCoverageReport(reportsRoot: string, report: CoverageReport): Promise<string> {
  await mkdir(reportsRoot, { recursive: true });
  const filePath = path.join(reportsRoot, `poc4-coverage-${report.source}-${report.date}.json`);
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}

function channelCoverage(rule: CoverageChannelRule, sourceChannelNames: readonly string[], programmes: readonly DayProgramme[]): CoverageChannel {
  const observedChannelNames = sourceChannelNames.filter((name) => channelRuleFor(name)?.id === rule.id);
  const matchedProgrammes = programmes.filter((programme) => channelRuleFor(programme.channelName)?.id === rule.id);
  const starts = matchedProgrammes.map((programme) => programme.startAt).sort();
  const stops = matchedProgrammes.map((programme) => programme.stopAt ?? programme.startAt).sort();
  const coverage: CoverageChannel = {
    id: rule.id,
    label: rule.label,
    priority: rule.priority,
    status: matchedProgrammes.length > 0 ? "present" : observedChannelNames.length > 0 ? "present_empty" : "missing",
    observedChannelNames,
    programmeCount: matchedProgrammes.length,
    sportProgrammeCount: matchedProgrammes.filter((programme) => programme.isSportCandidate).length
  };
  if (starts[0]) coverage.firstProgrammeStartAtUtc = starts[0];
  const lastStop = stops.at(-1);
  if (lastStop) coverage.lastProgrammeStopAtUtc = lastStop;
  return coverage;
}

function matchesRule(rule: CoverageChannelRule, name: string): boolean {
  const normalized = normalize(name);
  return rule.aliases.some((alias) => {
    const candidate = normalize(alias);
    return normalized === candidate || normalized.includes(candidate);
  });
}

function channelRuleFor(name: string): CoverageChannelRule | undefined {
  return coverageChannelRules
    .filter((rule) => matchesRule(rule, name))
    .sort((left, right) => longestAlias(right) - longestAlias(left) || right.priority - left.priority)[0];
}

function longestAlias(rule: CoverageChannelRule): number {
  return Math.max(...rule.aliases.map((alias) => normalize(alias).length));
}

function importanceOrder(importance: SportEvent["importance"]): number {
  return importance === "A" ? 0 : importance === "B" ? 1 : 2;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/gu, " ").trim();
}
