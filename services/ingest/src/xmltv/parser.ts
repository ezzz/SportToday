import { XMLParser } from "fast-xml-parser";

import type { ChannelRecord, ParsedXmltv, ProgrammeRecord, SourceId } from "../types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "channel" || name === "programme" || name === "display-name" || name === "category"
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
    const description = text(asArray(programme.desc)[0]);
    const categories = asArray(programme.category).map(text).filter(Boolean);
    const stopAt = parseXmltvDate(text(programme["@_stop"]));
    return [{
      source,
      sourceId,
      channelSourceId,
      title,
      ...(description ? { description } : {}),
      categories,
      startAt,
      ...(stopAt ? { stopAt } : {})
    } satisfies ProgrammeRecord];
  });

  return { channels, programmes };
}

export function isSportProgramme(programme: ProgrammeRecord): boolean {
  const haystack = `${programme.title} ${programme.description ?? ""} ${programme.categories.join(" ")}`.toLocaleLowerCase("fr-FR");
  return /football|foot|rugby|tennis|cyclisme|vélo|formule 1|f1|motogp|moto gp|basket|athlétisme|golf|ski|biathlon|handball|volley|judo|boxe|natation|sport/.test(haystack);
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
  desc?: Array<string | { "#text"?: string }>;
  category?: Array<string | { "#text"?: string }>;
}
