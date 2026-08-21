import { XMLParser } from "fast-xml-parser";

import type { ChannelRecord, ParsedXmltv, ProgrammeRecord, SourceId } from "../types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "channel" || name === "programme" || name === "display-name" || name === "category" || name === "sub-title"
});

export function parseXmltv(xml: string, source: Extract<SourceId, "xmltvfr" | "xmltvfree">): ParsedXmltv {
  const document = parser.parse(xml) as XmltvDocument;
  const channels = asArray(document.tv?.channel).flatMap((channel) => {
    const sourceId = text(channel["@_id"]);
    const displayName = text(channel["display-name"]?.[0]);
    if (!sourceId || !displayName) return [];
    const iconUrl = text(channel.icon?.["@_src"]);
    return [{ source, sourceId, displayName, ...(iconUrl ? { iconUrl } : {}) } satisfies ChannelRecord];
  });

  const programmes = asArray(document.tv?.programme).flatMap((programme) => {
    const sourceId = text(programme["@_id"]) || `${source}:${programme["@_channel"]}:${programme["@_start"]}`;
    const channelSourceId = text(programme["@_channel"]);
    const title = text(asArray(programme.title)[0]);
    const startAt = parseXmltvDate(text(programme["@_start"]));
    if (!channelSourceId || !startAt) return [];
    const subTitle = text(asArray(programme["sub-title"])[0]);
    const description = text(asArray(programme.desc)[0]);
    const categories = asArray(programme.category).map(text).filter(Boolean);
    const stopAt = parseXmltvDate(text(programme["@_stop"]));
    return [{
      source,
      sourceId,
      channelSourceId,
      title,
      ...(subTitle ? { subTitle } : {}),
      ...(description ? { description } : {}),
      categories,
      startAt,
      ...(stopAt ? { stopAt } : {}),
      isPreviouslyShown: Object.prototype.hasOwnProperty.call(programme, "previously-shown")
    } satisfies ProgrammeRecord];
  });

  return { channels, programmes };
}

export function isSportProgramme(programme: ProgrammeRecord): boolean {
  return sportSignals(programme).length > 0;
}

export function sportSignals(programme: ProgrammeRecord): string[] {
  // Conservative first pass: descriptions often contain generic channel
  // metadata and create false positives. Description-based recall can be
  // measured separately once a labelled sample exists.
  const haystack = `${programme.title} ${programme.subTitle ?? ""} ${programme.categories.join(" ")}`.toLocaleLowerCase("fr-FR");
  const patterns: Array<[string, RegExp]> = [
    ["football", /\b(?:football|foot)\b/u],
    ["rugby", /\brugby\b/u],
    ["tennis", /\btennis\b/u],
    ["cyclisme", /\b(?:cyclisme|vélo)\b/u],
    ["f1", /\b(?:formule 1|f1)\b/u],
    ["motogp", /\b(?:motogp|moto gp)\b/u],
    ["basket", /\bbasket(?:ball)?\b/u],
    ["athlétisme", /\bathlétisme\b/u],
    ["golf", /\bgolf\b/u],
    ["ski", /\bski\b/u],
    ["biathlon", /\bbiathlon\b/u],
    ["handball", /\bhandball\b/u],
    ["volley", /\bvolley(?:ball)?\b/u],
    ["judo", /\bjudo\b/u],
    ["boxe", /\bboxe\b/u],
    ["natation", /\bnatation\b/u]
  ];
  return patterns.filter(([, pattern]) => pattern.test(haystack)).map(([name]) => name);
}

function parseXmltvDate(value: string): string | null {
  if (!/^\d{14}(?:\s+[+-]\d{4})?$/.test(value)) return null;
  const parts = value.split(/\s+/);
  const raw = parts[0];
  const offset = parts[1] ?? "+0000";
  if (!raw) return null;
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}${offset.slice(0, 3)}:${offset.slice(3)}`;
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object" && "#text" in value) return String(value["#text"]).trim();
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface XmltvDocument {
  tv?: {
    channel?: XmltvChannel | XmltvChannel[];
    programme?: XmltvProgramme | XmltvProgramme[];
  };
}

interface XmltvChannel {
  "@_id"?: string;
  "display-name"?: Array<string | { "#text"?: string }>;
  icon?: { "@_src"?: string };
}

interface XmltvProgramme {
  "@_id"?: string;
  "@_channel"?: string;
  "@_start"?: string;
  "@_stop"?: string;
  title?: Array<string | { "#text"?: string }>;
  "sub-title"?: Array<string | { "#text"?: string }>;
  desc?: Array<string | { "#text"?: string }>;
  category?: Array<string | { "#text"?: string }>;
  "previously-shown"?: unknown;
}
