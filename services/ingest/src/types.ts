export type SourceId = "xmltvfr" | "xmltvfree" | "thesportsdb";

export interface RawSnapshot {
  source: SourceId;
  fetchedAt: string;
  url: string;
  contentType: string | null;
  extension: "xml" | "gz" | "xz" | "json";
  body: Buffer;
}

export interface ChannelRecord {
  source: SourceId;
  sourceId: string;
  displayName: string;
  iconUrl?: string;
}

export interface ProgrammeRecord {
  source: SourceId;
  sourceId: string;
  channelSourceId: string;
  title: string;
  subTitle?: string;
  description?: string;
  categories: string[];
  startAt: string;
  stopAt?: string;
  isPreviouslyShown: boolean;
}

export interface ParsedXmltv {
  channels: ChannelRecord[];
  programmes: ProgrammeRecord[];
}

export interface SourceReport {
  source: SourceId;
  fetchedAt: string;
  snapshotPath: string;
  channelCount: number;
  programmeCount: number;
  sportProgrammeCount: number;
  programmesWithoutTitle: number;
  programmesWithoutDescription: number;
  horizonDays: number | null;
}
