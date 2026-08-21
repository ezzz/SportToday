import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { autoAnnotate, type Confidence, type ContentCategory, type LiveStatus, type TriState } from "./auto-annotation.js";
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
  endTimeLabel: string;
  timeRangeLabel: string;
  subTitle: string;
  isPreviouslyShown: boolean;
  liveStatus: LiveStatus;
  liveEvidence: string;
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
  liveStatus: LiveStatus;
  titleQuality: "clear" | "unclear";
  confidence: Confidence;
  score: number;
  selectionReasons: string[];
  broadcasts: TonightBroadcast[];
}

export interface TonightReport {
  iteration: "poc21";
  source: DayReport["source"];
  date: string;
  timeZone: string;
  generatedAt: string;
  windowStartUtc: string;
  eveningStartUtc: string;
  windowEndUtc: string;
  programmeCount: number;
  candidateCount: number;
  quarantinedProgrammeCount: number;
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
  const quarantinedProgrammeCount = programmes.filter(isQuarantinedProgramme).length;
  const annotatedProgrammes = refineCompetitionRounds(programmes
    .filter((programme) => !isQuarantinedProgramme(programme))
    .map((programme) => ({ programme, annotation: autoAnnotate(programme) })));
  const candidates = annotatedProgrammes.flatMap(({ programme, annotation }) => {
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
    iteration: "poc21",
    source: report.source,
    date: report.date,
    timeZone: report.timeZone,
    generatedAt: new Date().toISOString(),
    windowStartUtc: windowStart.toISOString(),
    eveningStartUtc: eveningStart.toISOString(),
    windowEndUtc: windowEnd.toISOString(),
    programmeCount: programmes.length,
    candidateCount: candidates.length,
    quarantinedProgrammeCount,
    selectedCount: items.length,
    limit,
    items
  };
}

function refineCompetitionRounds(
  entries: Array<{ programme: DayProgramme; annotation: ReturnType<typeof autoAnnotate> }>
): Array<{ programme: DayProgramme; annotation: ReturnType<typeof autoAnnotate> }> {
  const sequences = new Map<string, { rounds: Set<number>; replayRounds: Set<number> }>();
  for (const entry of entries) {
    const round = competitionRound(entry.programme);
    if (!round) continue;
    const key = competitionSequenceKey(entry);
    const sequence = sequences.get(key) ?? { rounds: new Set<number>(), replayRounds: new Set<number>() };
    sequence.rounds.add(round);
    if (entry.programme.isPreviouslyShown) sequence.replayRounds.add(round);
    sequences.set(key, sequence);
  }
  return entries.map((entry) => {
    const round = competitionRound(entry.programme);
    const key = competitionSequenceKey(entry);
    const sequence = sequences.get(key);
    if (!round || !sequence || sequence.rounds.size < 2 || entry.annotation.liveStatus !== "unknown") return entry;
    const latestRound = Math.max(...sequence.rounds);
    const hasEarlierDeclaredReplay = [...sequence.replayRounds].some((replayRound) => replayRound < latestRound);
    if (round === latestRound && hasEarlierDeclaredReplay) {
      return {
        ...entry,
        annotation: {
          ...entry.annotation,
          liveStatus: "probable",
          contentCategory: "Sport Live",
          checkRequired: "true",
          checkReason: appendReason(entry.annotation.checkReason, "séquence la plus récente de la grille")
        }
      };
    }
    return entry;
  });
}

function competitionSequenceKey(
  entry: { programme: DayProgramme; annotation: ReturnType<typeof autoAnnotate> }
): string {
  const identity = entry.annotation.competition || entry.programme.title;
  return `${entry.annotation.sport}|${normalize(identity)}`;
}

function competitionRound(programme: DayProgramme): number | undefined {
  const value = `${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`;
  const round = value.match(/\bJournée\s+(\d{1,2})\b/iu)?.[1];
  if (round) return Number(round);
  const sequence = value.match(/\b(\d{1,2})(?:er|e|re)\s+(?:tour|jour|étape)\b/iu)?.[1];
  return sequence ? Number(sequence) : undefined;
}

function appendReason(current: string, addition: string): string {
  return current ? `${current}; ${addition}` : addition;
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
  const text = `${programme.title} ${programme.subTitle ?? ""} ${programme.description ?? ""}`.toLocaleLowerCase("fr-FR");
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
  } else if (annotation.liveStatus === "probable") {
    score += 14;
    reasons.push("indices temporels compatibles avec un direct");
  } else if (annotation.liveStatus === "delayed") {
    score -= 22;
    reasons.push("indices de rediffusion détectés");
  } else {
    reasons.push("statut live sans indice suffisant");
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
  if (/résumé|review|best of|retour sur|meilleurs moments|magazine|analyse|documentaire|s['’]imposait|s['’]affrontaient|a remporté/iu.test(text)) score -= 12;
  if (titleQuality(programme.title) === "unclear") {
    score -= 10;
    reasons.push("intitulé peu précis");
  }

  return { score, reasons: [...new Set(reasons)] };
}

function toTonightItem(group: RankedProgramme[], timeZone: string): TonightItem {
  const ranked = [...group].sort((left, right) => right.score - left.score
    || left.programme.startAt.localeCompare(right.programme.startAt));
  const representative = ranked[0];
  if (!representative) throw new Error("Groupe de programmes vide.");
  const broadcasts = uniqueBroadcasts(group.map(({ programme, annotation }) => toBroadcast(programme, annotation, timeZone)));
  const liveStatus = aggregateLiveStatus(broadcasts);
  const score = representative.score + Math.min(6, Math.max(0, broadcasts.length - 1) * 2);
  const reasons = [...representative.reasons];
  if (broadcasts.length > 1) reasons.push(`${broadcasts.length} diffusions trouvées`);
  const replayCount = broadcasts.filter((broadcast) => broadcast.isPreviouslyShown).length;
  if (replayCount) reasons.push(`${replayCount} rediffusion${replayCount > 1 ? "s" : ""} déclarée${replayCount > 1 ? "s" : ""} par XMLTV`);
  const key = eventKey(
    representative.programme,
    representative.annotation.sport,
    representative.annotation.competition,
    representative.annotation.participants
  );
  const participants = representative.annotation.participants || participantsFromDescription(representative.programme, representative.annotation.sport);
  const quality = titleQuality(representative.programme.title);
  return {
    id: createHash("sha256").update(`${representative.programme.source}:${key}`).digest("hex").slice(0, 16),
    title: displayTitle(representative.programme, representative.annotation.sport, participants),
    description: representative.programme.description ?? "",
    sport: representative.annotation.sport || representative.programme.sportSignals[0] || "sport à confirmer",
    competition: representative.annotation.competition,
    participants,
    contentCategory: liveStatus === "confirmed" || liveStatus === "probable"
      ? "Sport Live"
      : representative.annotation.contentCategory === "Emission"
        ? "Emission"
        : "Sport différé",
    isLive: liveStatus === "confirmed" ? "true" : liveStatus === "delayed" ? "false" : "unknown",
    liveStatus,
    titleQuality: quality,
    confidence: representative.annotation.confidence,
    score,
    selectionReasons: [...new Set(reasons)],
    broadcasts
  };
}

function toBroadcast(
  programme: DayProgramme,
  annotation: ReturnType<typeof autoAnnotate>,
  timeZone: string
): TonightBroadcast {
  const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit"
  });
  const timeLabel = timeFormatter.format(new Date(programme.startAt));
  const endTimeLabel = programme.stopAt ? timeFormatter.format(new Date(programme.stopAt)) : "";
  const liveStatus: LiveStatus = programme.isPreviouslyShown ? "delayed" : annotation.liveStatus;
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
    liveEvidence: programme.isPreviouslyShown
      ? "rediffusion déclarée par XMLTV"
      : liveStatus === "confirmed"
        ? "direct explicite dans le programme"
        : liveStatus === "probable"
          ? "indices compatibles avec un direct"
          : liveStatus === "delayed"
            ? "indices textuels de rediffusion"
            : "aucune preuve suffisante"
  };
}

export function isQuarantinedProgramme(programme: DayProgramme): boolean {
  const channelId = programme.channelSourceId.toLocaleLowerCase("fr-FR");
  if (channelId === "perenoel.fr" || channelId === "evenementssports4kuhd.fr") return true;
  const title = programme.title.trim();
  const description = programme.description ?? "";
  return /^Ligue 1\+\s*[2-9]$/iu.test(title)
    && /canaux événements?.*matches?.*direct.*intégralité/iu.test(description);
}

function titleQuality(title: string): "clear" | "unclear" {
  return /^(?:\d+(?:er|e)\s+tour|le match|la course|match amical international|Ligue 1\+\s*\d+)$/iu.test(title.trim())
    ? "unclear"
    : "clear";
}

function participantsFromDescription(programme: DayProgramme, sport: string): string {
  const description = programme.description ?? "";
  const matchup = description.match(/\bopposant\s+([^.,;]+?)\s+(?:et|à)\s+([^.,;]+?)(?:\.|,|;|$)/iu);
  if (matchup?.[1] && matchup[2]) return `${matchup[1].trim()} | ${matchup[2].trim()}`;
  if (sport === "basket" && /\bles Bleus\b/iu.test(description)) {
    const opponent = description.match(/\bdéfier\s+(?:la|le|les|l['’])?\s*([A-ZÀ-ÖØ-Þ][\p{L}'’ -]{2,40})/u)?.[1]
      ?.replace(/\s+en\s+match.*$/iu, "")
      .trim();
    if (opponent) return `${opponent} | France`;
  }
  return "";
}

function displayTitle(programme: DayProgramme, sport: string, participants: string): string {
  const title = programme.title;
  if (/match amical international/iu.test(title) && participants) {
    return `${sportLabel(sport)} : ${participants.replace(" | ", " / ")} — Match amical international`;
  }
  if (/^\d+(?:er|e)\s+tour$/iu.test(title.trim())) return `${sportLabel(sport)} : ${title.trim()}`;
  const stage = programmeStage(programme, sport);
  return stage && !normalize(title).includes(normalize(stage)) ? `${title} — ${stage}` : title;
}

function sportLabel(sport: string): string {
  const labels: Record<string, string> = {
    basket: "Basket-ball",
    golf: "Golf",
    football: "Football",
    tennis: "Tennis"
  };
  return labels[sport] ?? sport.charAt(0).toLocaleUpperCase("fr-FR") + sport.slice(1);
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
  return `${normalize(sport)}|${normalize(identity)}|${normalize(programmeStage(programme, sport))}`;
}

function programmeStage(programme: DayProgramme, sport: string): string {
  if (!programmesNeedStage(sport)) return "";
  const value = programme.subTitle ?? "";
  const patterns = [
    /\b(?:essais libres?\s*\d*|qualifications? sprint|qualifications?|course sprint|course)\b/iu,
    /\b\d+(?:er|e|re)\s+(?:tour|jour|étape)\b/iu,
    /\b(?:finale|demi-finale|quart de finale|quarts de finale)\b/iu
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern)?.[0];
    if (match) return match.replace(/\s+/gu, " ").trim();
  }
  return "";
}

function programmesNeedStage(sport: string): boolean {
  return ["f1", "motogp", "golf", "judo", "tennis"].includes(sport);
}

function aggregateLiveStatus(broadcasts: TonightBroadcast[]): LiveStatus {
  const statuses = new Set(broadcasts.map((broadcast) => broadcast.liveStatus));
  if (statuses.has("confirmed")) return "confirmed";
  if (statuses.has("probable")) return "probable";
  if (statuses.size === 1 && statuses.has("delayed")) return "delayed";
  return "unknown";
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
