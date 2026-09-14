import path from "node:path";

import type { SportEvent } from "../events/model.js";
import { tennisRoundInfo } from "../events/tennis-round.js";
import { tennisPriority } from "../events/watchlist.js";
import { rightsForEvent, type EventRightsProvider } from "../events/rights.js";
import { autoAnnotate, type LiveStatus } from "./auto-annotation.js";
import { writeTextFileAtomic } from "../storage/atomic-file.js";
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
  const tennisProgrammes = report.programmes.filter((programme) => !isQuarantinedProgramme(programme));
  const tennisFallbacks = tennisTournamentEvents(tennisProgrammes, report);
  const espnTennisEvents = events.filter((event) => event.source === "espn-tennis")
    .filter((event) => tennisFallbacks.some((fallback) => normalize(fallback.competition) === normalize(event.competition)));
  const referenceEvents = [
    ...events.filter((event) => event.sport !== "tennis"),
    ...espnTennisEvents,
    ...(espnTennisEvents.length ? [] : tennisFallbacks)
  ];
  const items = referenceEvents
    .map((event) => eventItem(event, referenceEvents, programmes, report.timeZone))
    .sort((left, right) => right.score - left.score
      || (left.eventStartAtUtc ?? "").localeCompare(right.eventStartAtUtc ?? "")
      || left.title.localeCompare(right.title, "fr"));
  // A linear channel cannot carry two full matches simultaneously.
  for (const item of items.filter((value) => value.sport === "football")) {
    for (const broadcast of item.broadcasts) {
      if (broadcast.provenance === "rights" || broadcast.liveStatus === "delayed"
        || broadcast.channelSourceId.startsWith("family:") || /multiplex/iu.test(broadcast.channel)) continue;
      const conflict = items.some((other) => other.id !== item.id && other.sport === "football"
        && other.broadcasts.some((candidate) => candidate.channelSourceId === broadcast.channelSourceId
          && candidate.liveStatus !== "delayed" && candidate.provenance !== "rights"
          && Date.parse(candidate.startAtUtc) < Date.parse(broadcast.stopAtUtc)
          && Date.parse(candidate.stopAtUtc) > Date.parse(broadcast.startAtUtc)));
      if (conflict) {
        broadcast.liveStatus = "unknown";
        broadcast.broadcastAlignedToEvent = false;
        broadcast.liveEvidence = "Conflit : chaîne également attribuée à un autre match simultané";
        item.selectionReasons.push(`${broadcast.channel} : attribution simultanée à vérifier`);
      }
    }
    item.liveStatus = aggregateLiveStatus(item.broadcasts);
  }
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
    candidateCount: referenceEvents.length,
    quarantinedProgrammeCount: [...report.programmes, ...(followingReport?.programmes ?? [])].filter(isQuarantinedProgramme).length,
    selectedCount: items.length,
    limit,
    items,
    catalogueEventCount: referenceEvents.length,
    matchedEventCount,
    unmatchedEventCount: items.length - matchedEventCount,
    footballEventCount: referenceEvents.filter((event) => event.sport === "football").length,
    f1EventCount: referenceEvents.filter((event) => event.sport === "f1").length,
    eventCounts: referenceEvents.reduce<Record<string, number>>((counts, event) => {
      counts[event.sport] = (counts[event.sport] ?? 0) + 1;
      return counts;
    }, {})
  };
}

export async function writePoc4EventReport(reportsRoot: string, report: TonightReport): Promise<string> {
  const filePath = path.join(reportsRoot, `poc4-events-${report.source}-${report.date}.json`);
  await writeTextFileAtomic(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

function eventItem(event: SportEvent, events: readonly SportEvent[], programmes: readonly DayProgramme[], timeZone: string): TonightItem {
  const matches = programmes
    .map((programme) => {
      if (event.sport === "football" && /^football\s*:/iu.test(programme.title)) {
        const leadIn = programmes.find((previous) => previous.channelSourceId === programme.channelSourceId
          && previous.stopAt === programme.startAt && /plateau avant.match/iu.test(previous.title)
          && previous.subTitle && event.participants.every((participant) => entityMatches(participant, previous.subTitle!)));
        if (leadIn) return matchProgramme(event, events, { ...programme, title: leadIn.subTitle! }, timeZone);
      }
      return matchProgramme(event, events, programme, timeZone);
    })
    .filter((value): value is ProgrammeMatch => value !== null)
    .sort((left, right) => right.score - left.score || left.broadcast.startAtUtc.localeCompare(right.broadcast.startAtUtc));
  const strongMatches = matches.filter((match) => match.confidence === "high");
  const retained = strongMatches.length > 0 ? strongMatches : matches.filter((match) => match.confidence === "medium");
  const rawXmltvBroadcasts = collapseAmbiguousNumberedChannels(
    uniqueBroadcasts(retained.map((match) => match.broadcast)),
    timeZone
  );
  const xmltvBroadcasts = (event.sport === "tennis" && isTennisSummaryEvent(event)) || event.sport === "cyclisme"
    ? compactEurosportBroadcasts(rawXmltvBroadcasts, timeZone)
    : rawXmltvBroadcasts;
  const broadcasts = mergeRightsBroadcasts(xmltvBroadcasts, event, timeZone);
  const matchConfidence = strongMatches.length > 0 ? "high" : retained.length > 0 ? "medium" : "none";
  const eventEndAtUtc = event.endAtUtc ?? inferredEnd(event);
  const eventTimeLabel = event.source === "espn-tennis"
    ? event.timeConfidence === "estimated" ? "Horaires à venir" : formatTime(primaryTennisStart(event, timeZone), timeZone)
    : event.sport === "tennis" && isXmltvEvent(event)
    ? "Créneaux TV"
    : event.sport === "cyclisme" && event.timeConfidence === "estimated" && firstCredibleBroadcast(xmltvBroadcasts)
    ? `Dès ${formatTime(firstCredibleBroadcast(xmltvBroadcasts)!.startAtUtc, timeZone).replace(":", "h")}`
    : event.timeConfidence === "estimated"
    ? "Horaire non publié"
    : event.endAtUtc
    ? formatTimeRange(event.startAtUtc, event.endAtUtc, timeZone)
    : formatTime(event.startAtUtc, timeZone);
  const liveStatus = aggregateLiveStatus(broadcasts);
  const matchReasons = retained.flatMap((match) => match.reasons);
  const tennisRounds = event.sport === "tennis"
    ? (event.schedule ?? [])
      .map((entry) => ({ label: entry.roundLabel, rank: entry.roundRank }))
      .filter((value): value is { label: string; rank: number } => Boolean(value.label) && typeof value.rank === "number")
    : [];
  const mostAdvancedTennisRound = tennisRounds.length
    ? tennisRounds.reduce((best, value) => value.rank > best.rank ? value : best)
    : event.sport === "tennis" ? tennisRoundInfo(event.stage, event.competition) : undefined;
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
      ...(xmltvBroadcasts.length
        ? [`${xmltvBroadcasts.length} diffusion${xmltvBroadcasts.length > 1 ? "s" : ""} XMLTV rattachée${xmltvBroadcasts.length > 1 ? "s" : ""}`]
        : []),
      ...(broadcasts.filter((broadcast) => broadcast.provenance === "rights").length
        ? [`${broadcasts.filter((broadcast) => broadcast.provenance === "rights").length} plateforme${broadcasts.filter((broadcast) => broadcast.provenance === "rights").length > 1 ? "s" : ""} couverte${broadcasts.filter((broadcast) => broadcast.provenance === "rights").length > 1 ? "s" : ""} par les droits officiels`]
        : []),
      ...(!broadcasts.length ? ["aucune diffusion ou plateforme identifiée"] : [])
    ])],
    broadcasts,
    eventStartAtUtc: event.startAtUtc,
    eventEndAtUtc,
    eventTimeLabel,
    eventSource: event.source,
    eventSourceId: event.sourceEventId,
    eventStatus: event.status,
    eventStage: event.stage,
    ...(mostAdvancedTennisRound ? { eventRoundLabel: mostAdvancedTennisRound.label, eventRoundRank: mostAdvancedTennisRound.rank } : {}),
    eventImportance: event.importance,
    eventTimeConfidence: event.timeConfidence,
    broadcastMatchConfidence: matchConfidence,
    ...(event.schedule ? { eventSchedule: event.schedule } : {})
  };
}

interface ProgrammeMatch {
  score: number;
  confidence: "high" | "medium";
  reasons: string[];
  broadcast: TonightBroadcast;
}

function matchProgramme(event: SportEvent, events: readonly SportEvent[], programme: DayProgramme, timeZone: string): ProgrammeMatch | null {
  const sport = programme.sportSignals;
  if (!eventSportMatchesProgramme(event.sport, sport)) return null;
  if (event.sport === "football" && /multiplex|grande soir[eé]e|conf[eé]rence|plateau|debrief|d[eé]brief/iu.test(programme.title)) return null;
  const text = `${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`;
  const startDelta = minutesBetween(programme.startAt, event.startAtUtc);
  const endAt = event.endAtUtc ?? inferredEnd(event);
  const afterEventMinutes = minutesBetween(programme.startAt, endAt);
  const programmeStop = Date.parse(programme.stopAt ?? programme.startAt);
  const eventStart = Date.parse(event.startAtUtc);
  let score = 0;
  const reasons: string[] = [];
  if (event.sport === "tennis" && isXmltvEvent(event)) {
    if (tennisTournamentName(programme) !== event.competition) return null;
    if (formatDate(programme.startAt, timeZone) !== event.sourceEventId.slice(0, 10)) return null;
    const programmeStart = Date.parse(programme.startAt);
    if (programmeStart < Date.parse(event.startAtUtc) || programmeStart > Date.parse(event.endAtUtc ?? event.startAtUtc)) return null;
    return {
      score: 95,
      confidence: "high",
      reasons: ["créneau regroupé sous le tournoi identifié par XMLTV"],
      broadcast: toEventBroadcast(programme, event, timeZone)
    };
  }
  if (event.source === "espn-tennis") {
    if (tennisTournamentName(programme) !== event.competition) return null;
    if (formatDate(programme.startAt, timeZone) !== event.sourceEventId.slice(-10)) return null;
    return {
      score: 95,
      confidence: "high",
      reasons: ["tableau ESPN rattaché au tournoi diffusé dans XMLTV"],
      broadcast: toEventBroadcast(programme, event, timeZone)
    };
  }
  if (["football", "volleyball", "tennis", "basket", "rugby"].includes(event.sport)) {
    if (event.sport === "rugby" && (!normalize(text).includes(normalize(event.competition)) || /multiplex|magazine|plateau|avant.match|debrief|d[eé]brief/iu.test(programme.title))) return null;
    if (event.sport === "basket" && event.competition === "Coupe du monde féminine" && !/f[eé]minin|women/iu.test(text)) return null;
    // An explicit fixture title outranks a possibly copied description.
    const fixtureText = ["football", "rugby"].includes(event.sport) && /\s(?:\/|vs\.?|-)\s/iu.test(programme.title)
      ? programme.title : event.sport === "basket" ? text.replace(/\bBleues\b/giu, "France") : text;
    const participantMatches = event.participants.filter((participant) => entityMatches(participant, fixtureText)).length;
    const competitionWindowEvents = competitionEventsInProgrammeWindow(event, events, programme);
    const genericCompetitionMatch = ["football", "volleyball"].includes(event.sport)
      && participantMatches < 2
      && !programme.isPreviouslyShown
      && programmeOverlaps(programme, event.startAtUtc, 30)
      && Math.abs(startDelta) <= 60
      && programmeMatchesCompetition(programme, event.competition)
      && competitionWindowEvents.length === 1 && competitionWindowEvents[0]?.id === event.id;
    const ambiguousNumberedChannelMatch = event.sport === "football"
      && participantMatches < 2
      && !programme.isPreviouslyShown
      && Boolean(numberedChannelFamily(programme.channelName))
      && programmeOverlaps(programme, event.startAtUtc, 30)
      && Math.abs(startDelta) <= 60
      && programmeMatchesCompetition(programme, event.competition)
      && competitionWindowEvents.length > 1;
    const uniqueBasketTimeMatch = event.sport === "basket"
      && participantMatches < 2
      && !programme.isPreviouslyShown
      && programmeOverlaps(programme, event.startAtUtc, 30)
      && Math.abs(startDelta) <= 45
      && normalize(text).includes(normalize(event.competition))
      && competitionWindowEvents.length === 1 && competitionWindowEvents[0]?.id === event.id;
    if (event.participants.length >= 2 && participantMatches < 2
      && !genericCompetitionMatch && !ambiguousNumberedChannelMatch && !uniqueBasketTimeMatch) return null;
    if (ambiguousNumberedChannelMatch) {
      score += 65;
      reasons.push("bouquet secondaire identifié, numéro de chaîne non déterminable dans XMLTV");
    } else if (uniqueBasketTimeMatch) {
      score += 70;
      reasons.push("match de basket unique sur le créneau de la compétition");
    } else if (genericCompetitionMatch) {
      score += 55;
      reasons.push("programme générique rattaché : seul match de la compétition sur ce créneau");
    } else {
      score += event.participants.length >= 2 ? 80 : 45;
      reasons.push(event.sport === "tennis" ? "joueurs reconnus dans le programme" : "participants reconnus dans le programme");
    }
  } else if (event.sport === "cyclisme") {
    if (formatDate(programme.startAt, timeZone) !== formatDate(event.startAtUtc, timeZone)) return null;
    if (!cyclingCompetitionMatches(event, text, `${programme.title} ${programme.subTitle ?? ""}`)) return null;
    return { score: 82, confidence: "high", reasons: ["course UCI reconnue dans XMLTV"], broadcast: toEventBroadcast(programme, event, timeZone) };
  } else if (event.sport === "motogp") {
    const heading = normalize(`${programme.title} ${programme.subTitle ?? ""}`);
    if (/moto\s*[23]|warm up|parade|magazine|debrief|avant|grille/iu.test(heading)
      || (/essais/iu.test(heading) && !/qualif/iu.test(heading))) return null;
    const stageMatch = event.stage === "Qualifications" ? /qualif/iu.test(heading)
      : event.stage === "Sprint" ? /sprint/iu.test(heading)
      : !/sprint|qualif/iu.test(heading) && /course|grand prix/iu.test(heading);
    if (!stageMatch || !f1RaceMatches(event, `${programme.title} ${programme.subTitle ?? ""}`)) return null;
    score += 85;
    reasons.push("Grand Prix et session MotoGP reconnus dans XMLTV");
  } else if (["golf", "athletics"].includes(event.sport)) {
    if (event.competition === "Ultimate Championship" && !/ultimate/iu.test(text)) return null;
    const competitionMatch = meaningfulTokens(event.competition).some((token) => meaningfulTokens(text).includes(token));
    if (!competitionMatch && Math.abs(startDelta) > (event.sport === "athletics" ? 720 : 240)) return null;
    score += competitionMatch ? 62 : 35;
    reasons.push(competitionMatch ? "compétition reconnue dans le programme" : "créneau du sport rapproché de l'événement");
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
  } else if (programmeOverlaps(programme, event.startAtUtc, event.sport === "motogp" && event.stage === "Sprint" ? 20 : 30)) {
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

/**
 * Builds one useful tennis entry per televised tournament. Match-level data is
 * deliberately optional: XMLTV is enough to expose the tournament, channels
 * and broadcast windows without depending on a paid fixtures API.
 */
export function tennisTournamentEvents(programmes: readonly DayProgramme[], report: Pick<DayReport, "date" | "source">): SportEvent[] {
  const groups = new Map<string, { name: string; programmes: DayProgramme[] }>();
  for (const programme of programmes) {
    const name = tennisTournamentName(programme);
    if (!name) continue;
    const key = normalize(name);
    const group = groups.get(key) ?? { name, programmes: [] };
    group.programmes.push(programme);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => {
    const ordered = [...group.programmes].sort((left, right) => left.startAt.localeCompare(right.startAt));
    const startAtUtc = ordered[0]!.startAt;
    const endAtUtc = ordered.reduce((latest, programme) => {
      const stop = programme.stopAt ?? programme.startAt;
      return stop > latest ? stop : latest;
    }, ordered[0]!.stopAt ?? startAtUtc);
    const stages = [...new Set(ordered.map((programme) => tennisProgrammeDetail(programme, group.name)).filter(Boolean))].slice(0, 5);
    const priority = tennisPriority(group.name);
    return {
      id: `${report.source}:tennis-tournament:${report.date}:${key.replace(/\s+/gu, "-")}`,
      source: report.source,
      sourceEventId: `${report.date}:${key}`,
      sport: "tennis",
      title: group.name,
      competition: group.name,
      stage: stages.length ? stages.join(" · ") : "Programme TV du jour",
      participants: [],
      startAtUtc,
      endAtUtc,
      timeConfidence: "estimated",
      status: "scheduled-from-tv",
      importance: priority.importance,
      priorityScore: priority.score,
      priorityReasons: [...priority.reasons, "tournoi diffusé identifié dans le programme TV"]
    } satisfies SportEvent;
  });
}

function tennisTournamentName(programme: DayProgramme): string | null {
  if (!programme.sportSignals.includes("tennis")) return null;
  const title = normalize(programme.title);
  const hasSportCategory = programme.categories.some((category) => /^sport(?:s|if)?$/u.test(normalize(category)));
  if (!/^tennis\b/u.test(title) && !hasSportCategory) return null;
  const text = `${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`;
  const normalized = normalize(text);
  if (/tennis de table|\bwtt\b|mr bean|tennis club|meilleurs moments|best of|documentaire/u.test(normalized)) return null;
  const prefixed = programme.title.match(/^tennis\s*[:\-]\s*(.+)$/iu)?.[1]?.trim();
  if (prefixed && !/^(?:tennis|atp world tour|wta world tour)$/iu.test(prefixed)) {
    return canonicalTennisTournament(prefixed)
      ?? prefixed.replace(/^tournoi\s+(?:atp|wta)\s+(?:de |du |des )?/iu, "").trim();
  }
  return canonicalTennisTournament(`${programme.title} ${programme.subTitle ?? ""}`);
}

function canonicalTennisTournament(value: string): string | null {
  const normalized = normalize(value);
  const known: Array<[RegExp, string]> = [
    [/\bus open\b/u, "US Open"],
    [/\bwimbledon\b/u, "Wimbledon"],
    [/roland garros|french open/u, "Roland-Garros"],
    [/open d australie|australian open/u, "Open d'Australie"],
    [/cincinnati/u, "Cincinnati Open"],
    [/indian wells/u, "Indian Wells"],
    [/monte carlo/u, "Monte-Carlo Masters"],
    [/open (?:du |de )?canada|canadian open/u, "Open du Canada"],
    [/guadalajara/u, "Open de Guadalajara"],
    [/monterrey/u, "Open de Monterrey"],
    [/madrid/u, "Open de Madrid"],
    [/shanghai/u, "Masters de Shanghai"],
    [/billie jean king/u, "Billie Jean King Cup"],
    [/coupe davis|davis cup/u, "Coupe Davis"]
  ];
  const recognised = known.find(([pattern]) => pattern.test(normalized));
  return recognised?.[1] ?? null;
}

function tennisProgrammeDetail(programme: DayProgramme, tournament: string): string {
  const value = (programme.subTitle ?? "").replace(/^tennis$/iu, "").trim();
  if (!value || normalize(value) === normalize(programme.title)) return "";
  const separated = value.match(/^([^|.]+)[|.]\s*(.+)$/u);
  const detail = separated && normalize(separated[1] ?? "") === normalize(tournament) ? separated[2] ?? value : value;
  return detail.replace(/\.+$/u, "");
}

function isXmltvEvent(event: SportEvent): boolean {
  return event.source === "xmltvfr" || event.source === "xmltvfree";
}

function isTennisSummaryEvent(event: SportEvent): boolean {
  return isXmltvEvent(event) || event.source === "espn-tennis";
}

function primaryTennisStart(event: SportEvent, timeZone: string): string {
  const daytime = event.schedule?.filter((entry) => entry.timeConfirmed !== false).find((entry) => {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date(entry.startAtUtc)));
    return hour >= 8;
  });
  return daytime?.startAtUtc ?? event.schedule?.[0]?.startAtUtc ?? event.startAtUtc;
}

function compactEurosportBroadcasts(values: readonly TonightBroadcast[], timeZone: string): TonightBroadcast[] {
  const formatter = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  const grouped = new Map<string, TonightBroadcast[]>();
  for (const value of values) {
    const family = /^eurosport 360(?: \d+)?$/u.test(normalize(value.channel)) ? "Eurosport 360" : value.channel;
    const key = `${normalize(family)}:${value.liveStatus}`;
    const group = grouped.get(key) ?? [];
    group.push({
      ...value,
      channel: family,
      ...(family === "Eurosport 360" ? { channelSourceId: "family:eurosport-360" } : {})
    });
    grouped.set(key, group);
  }
  const compacted: TonightBroadcast[] = [];
  for (const group of grouped.values()) {
    const ordered = group.sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc));
    for (const broadcast of ordered) {
      const previous = compacted.at(-1);
      const previousStop = Date.parse(previous?.stopAtUtc || previous?.startAtUtc || "");
      const currentStart = Date.parse(broadcast.startAtUtc);
      if (previous && previous.channel === broadcast.channel && previous.liveStatus === broadcast.liveStatus
        && currentStart <= previousStop + 15 * 60_000) {
        const stopAtUtc = broadcast.stopAtUtc > previous.stopAtUtc ? broadcast.stopAtUtc : previous.stopAtUtc;
        const endTimeLabel = stopAtUtc ? formatter.format(new Date(stopAtUtc)) : previous.endTimeLabel;
        previous.stopAtUtc = stopAtUtc;
        previous.endTimeLabel = endTimeLabel;
        previous.timeRangeLabel = endTimeLabel ? `${previous.timeLabel}–${endTimeLabel}` : previous.timeLabel;
      } else {
        compacted.push({ ...broadcast });
      }
    }
  }
  return compacted.sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc) || left.channel.localeCompare(right.channel, "fr"));
}

function toEventBroadcast(programme: DayProgramme, event: SportEvent, timeZone: string): TonightBroadcast {
  const annotation = autoAnnotate(programme);
  const formatter = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  const timeLabel = formatter.format(new Date(programme.startAt));
  const endTimeLabel = programme.stopAt ? formatter.format(new Date(programme.stopAt)) : "";
  const programmeText = `${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`;
  const directText = /\b(?:en direct|direct|live)\b/iu.test(programmeText);
  const delayedText = /\b(?:rediffusion|replay|différé|déjà diffusé)\b/iu.test(programmeText);
  const multiplex = /\bmultiplex\b/iu.test(programmeText);
  const overlaps = event.timeConfidence === "confirmed" && (event.schedule?.length
    ? event.schedule.some((entry) => entry.timeConfirmed !== false && programmeOverlaps(programme, entry.startAtUtc, 30))
    : programmeOverlaps(programme, event.startAtUtc, event.sport === "motogp" && event.stage === "Sprint" ? 20 : 30));
  let liveStatus: LiveStatus = "unknown";
  let liveEvidence = "horaire insuffisant pour conclure";
  if (programme.isPreviouslyShown || delayedText) {
    liveStatus = "delayed";
    liveEvidence = programme.isPreviouslyShown ? "rediffusion déclarée par XMLTV" : "indice textuel de rediffusion";
  } else if (directText || annotation.liveStatus === "confirmed") {
    liveStatus = "confirmed";
    liveEvidence = "direct explicite dans le programme";
  } else if (overlaps) {
    liveStatus = "probable";
    liveEvidence = "créneau TV couvrant l'heure officielle de l'événement";
  } else if (annotation.liveStatus === "delayed") {
    liveStatus = "delayed";
    liveEvidence = "indice textuel de rediffusion";
  } else if (event.timeConfidence === "confirmed" && ["football", "volleyball", "basket", "rugby"].includes(event.sport)
    && Date.parse(programme.startAt) >= Date.parse(event.endAtUtc ?? inferredEnd(event))) {
    liveStatus = "delayed";
    liveEvidence = "diffusion après la fin estimée de la rencontre";
  }
  return {
    sourceId: programme.sourceId,
    channel: multiplex ? `${programme.channelName} · Multiplex` : programme.channelName,
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
    provenance: "xmltv",
    // An avant-match is as useful as a programme starting exactly at kick-off:
    // the relevant condition for the green state is that the TV slot covers it.
    broadcastAlignedToEvent: overlaps
  };
}

function programmeMatchesCompetition(programme: DayProgramme, competition: string): boolean {
  // Only an actual generic competition label qualifies, never a description
  // mentioning another fixture or the shared word "Ligue".
  const title = normalize(programme.title).replace(/^football /u, "");
  const league = normalize(competition);
  if (league === "european championships women") return title === "volley ball championnat d europe feminin";
  return title === league || title === league + " bkt";
}

function competitionEventsInProgrammeWindow(event: SportEvent, events: readonly SportEvent[], programme: DayProgramme): SportEvent[] {
  const programmeStart = Date.parse(programme.startAt);
  const programmeStop = Date.parse(programme.stopAt ?? programme.startAt);
  return events.filter((candidate) => candidate.sport === event.sport
    && normalize(candidate.competition) === normalize(event.competition)
    && Date.parse(candidate.startAtUtc) >= programmeStart - 30 * 60_000
    && Date.parse(candidate.startAtUtc) <= programmeStop + 30 * 60_000);
}

function mergeRightsBroadcasts(xmltvBroadcasts: readonly TonightBroadcast[], event: SportEvent, timeZone: string): TonightBroadcast[] {
  const rights = rightsForEvent(event);
  const rightsBroadcasts = rights
    .filter((provider) => !xmltvBroadcasts.some((broadcast) => normalize(broadcast.channel).includes(normalize(provider.name))))
    .map((provider) => toRightsBroadcast(event, provider, timeZone));
  return uniqueBroadcasts([...xmltvBroadcasts, ...rightsBroadcasts]);
}

function toRightsBroadcast(event: SportEvent, provider: EventRightsProvider, timeZone: string): TonightBroadcast {
  const timeLabel = formatTime(event.startAtUtc, timeZone);
  return {
    sourceId: `rights:${event.id}:${normalize(provider.name)}`,
    channel: "",
    channelSourceId: `platform:${normalize(provider.name)}`,
    platform: provider.name,
    startAtUtc: event.startAtUtc,
    stopAtUtc: "",
    startAtLocal: timeLabel,
    timeLabel,
    endTimeLabel: "",
    timeRangeLabel: timeLabel,
    subTitle: "",
    isPreviouslyShown: false,
    liveStatus: "confirmed",
    liveEvidence: `${provider.evidence} · ${provider.sourceUrl}`,
    provenance: "rights",
    broadcastAlignedToEvent: true
  };
}

function inferredEnd(event: SportEvent): string {
  if (event.sport === "motogp") return new Date(Date.parse(event.startAtUtc) + (event.stage === "Sprint" ? 45 : 90) * 60_000).toISOString();
  const minutes = event.sport === "football" || event.sport === "volleyball" || event.sport === "tennis" || event.sport === "basket" || event.sport === "rugby"
    ? 150
    : event.sport === "golf" || event.sport === "athletics"
      ? 240
    : /course/iu.test(event.stage)
      ? 180
      : /qualifications/iu.test(event.stage)
        ? 120
        : 90;
  return new Date(Date.parse(event.startAtUtc) + minutes * 60_000).toISOString();
}

function eventSportMatchesProgramme(eventSport: SportEvent["sport"], signals: readonly string[]): boolean {
  const expected: Record<SportEvent["sport"], readonly string[]> = {
    football: ["football"],
    f1: ["f1"],
    volleyball: ["volley", "volleyball"],
    basket: ["basket", "basketball"],
    rugby: ["rugby"],
    motogp: ["motogp"],
    tennis: ["tennis"],
    golf: ["golf"],
    athletics: ["athlétisme", "athletisme"],
    cyclisme: ["cyclisme"]
  };
  return expected[eventSport].some((signal) => signals.includes(signal));
}

function cyclingCompetitionMatches(event: SportEvent, text: string, heading: string): boolean {
  const names: Record<string, readonly string[]> = {
    "Grand Prix Cycliste de Québec": ["grand prix cycliste de quebec", "gp cycliste de quebec", "gp de quebec"],
    "Grand Prix Cycliste de Montréal": ["grand prix cycliste de montreal", "gp cycliste de montreal", "gp de montreal"],
    "Milano-Sanremo": ["milano sanremo", "milan san remo"],
    "Ronde van Vlaanderen": ["ronde van vlaanderen", "tour des flandres"],
    "Dwars door Vlaanderen": ["dwars door vlaanderen", "a travers la flandre"],
    "ADAC Cyclassics": ["adac cyclassics", "cyclassics"],
    "DSSK - Donostia San Sebastián Klasikoa": ["donostia san sebastian", "clasica san sebastian"],
    "Bretagne Classic - Ouest-France": ["bretagne classic", "ouest france"],
    "La Flèche Wallonne": ["fleche wallonne"],
    "La Flèche Wallonne Féminine": ["fleche wallonne feminine"],
    "Paris-Roubaix": ["paris roubaix"],
    "Paris-Roubaix Femmes avec Zwift": ["paris roubaix femmes", "paris roubaix fem"],
    "Liège-Bastogne-Liège": ["liege bastogne liege"],
    "Liège-Bastogne-Liège Femmes": ["liege bastogne liege femmes", "liege bastogne liege fem"],
    "Amstel Gold Race": ["amstel gold race"],
    "Amstel Gold Race Ladies Edition": ["amstel gold race ladies", "amstel gold race femmes"],
    "Strade Bianche": ["strade bianche"],
    "Strade Bianche Donne": ["strade bianche donne", "strade bianche femmes"],
    "Gent-Wevelgem in Flanders Fields": ["gent wevelgem"],
    "Omloop Nieuwsblad": ["omloop nieuwsblad"],
    "The Great Sprint Classic": ["great sprint classic"],
    "Copenhagen Sprint": ["copenhagen sprint"],
    "Classic Lorient Agglomération - CERATIZIT": ["classic lorient", "ceratizit"],
    "Il Lombardia": ["il lombardia", "tour de lombardie"],
    "Trofeo Alfredo Binda - Comune di Cittiglio": ["trofeo alfredo binda"],
    "Tour de France": ["tour de france"],
    "Giro d'Italia": ["giro d italia", "tour d italie"],
    "La Vuelta": ["la vuelta", "vuelta a espana", "tour d espagne"]
  };
  const normalized = normalize(text);
  const aliases = names[event.competition] ?? [normalize(event.competition)];
  const competitionMatch = aliases.some((alias) => normalized.includes(alias));
  if (!competitionMatch) return false;
  const expectedStage = event.sourceEventId.match(/:stage-(\d+)$/u)?.[1];
  const observedStage = normalize(heading).match(/\b(\d{1,2})(?:e|er|re)?\s+etape\b/u)?.[1];
  if (expectedStage && observedStage && expectedStage !== observedStage) return false;
  const women = /femmes|feminine|women|ladies|donne/iu.test(event.stage);
  const womenMarker = /femmes|feminin|women|ladies|donne/iu.test(text);
  return women ? womenMarker : !womenMarker;
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
  const entityTokens = meaningfulTokens(entity).map(teamAlias).filter((token) => !["real", "athens", "linz"].includes(token));
  const textTokens = new Set(meaningfulTokens(text).map(teamAlias));
  if (!entityTokens.length) return false;
  const matched = entityTokens.filter((token) => textTokens.has(token)).length;
  return matched >= Math.max(1, Math.ceil(entityTokens.length * 0.6));
}

function teamAlias(value: string): string {
  const aliases: Record<string, string> = {
    psg: "paris", parisien: "paris", marseillais: "marseille", om: "marseille",
    inter: "internazionale", milan: "milan", munchen: "munich",
    brugge: "bruges", sevilla: "seville", praha: "prague",
    chakhtior: "shakhtar", chakhtar: "shakhtar", shaktar: "shakhtar",
    sabah: "sabah", bod: "bodo"
  };
  return aliases[value] ?? value;
}

function firstCredibleBroadcast(values: readonly TonightBroadcast[]): TonightBroadcast | undefined {
  return [...values]
    .filter((broadcast) => broadcast.liveStatus !== "delayed")
    .sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc))[0];
}

function numberedChannelFamily(value: string): { id: string; label: string } | null {
  const channel = normalize(value);
  if (/^canal live \d+$/u.test(channel)) return { id: "family:canal-live", label: "Canal+ Live" };
  if (/^bein sports max \d+$/u.test(channel)) return { id: "family:bein-sports-max", label: "beIN Sports Max" };
  return null;
}

function collapseAmbiguousNumberedChannels(values: readonly TonightBroadcast[], timeZone: string): TonightBroadcast[] {
  const ungrouped: TonightBroadcast[] = [];
  const groups = new Map<string, TonightBroadcast[]>();
  for (const value of values) {
    const family = numberedChannelFamily(value.channel);
    if (!family || value.liveStatus === "delayed") {
      ungrouped.push(value);
      continue;
    }
    const key = `${family.id}:${value.startAtUtc.slice(0, 16)}`;
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  const formatter = new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" });
  for (const group of groups.values()) {
    const distinctChannels = new Set(group.map((value) => value.channelSourceId));
    if (distinctChannels.size === 1) {
      ungrouped.push(...group);
      continue;
    }
    const ordered = [...group].sort((left, right) => left.startAtUtc.localeCompare(right.startAtUtc));
    const first = ordered[0]!;
    const family = numberedChannelFamily(first.channel)!;
    const stopAtUtc = ordered.map((value) => value.stopAtUtc).filter(Boolean).sort().at(-1) ?? "";
    const endTimeLabel = stopAtUtc ? formatter.format(new Date(stopAtUtc)) : "";
    ungrouped.push({
      ...first,
      sourceId: `ambiguous:${family.id}:${first.startAtUtc}`,
      channel: family.label,
      channelSourceId: family.id,
      stopAtUtc,
      endTimeLabel,
      timeRangeLabel: endTimeLabel ? `${first.timeLabel}–${endTimeLabel}` : first.timeLabel,
      liveStatus: "unknown",
      liveEvidence: "plusieurs numéros de chaîne contradictoires dans XMLTV",
      broadcastAlignedToEvent: false
    });
  }
  return uniqueBroadcasts(ungrouped);
}

function meaningfulTokens(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length >= 3 && ![
    "football", "foot", "club", "olympique", "sporting", "association", "saint", "germain"
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

function formatDate(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
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
