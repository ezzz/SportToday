import type { TonightBroadcast } from "../reports/tonight.js";

export type EventSport = "football" | "f1";
export type EventImportance = "A" | "B" | "C";
export type EventTimeConfidence = "confirmed" | "estimated";

export interface SportEvent {
  id: string;
  source: "api-football" | "jolpica-f1";
  sourceEventId: string;
  sport: EventSport;
  title: string;
  competition: string;
  stage: string;
  participants: string[];
  startAtUtc: string;
  endAtUtc?: string;
  timeConfidence: EventTimeConfidence;
  status: string;
  importance: EventImportance;
  priorityScore: number;
  priorityReasons: string[];
  country?: string;
}

export interface EventBroadcastMatch {
  event: SportEvent;
  broadcasts: TonightBroadcast[];
  matchConfidence: "high" | "medium" | "none";
  matchReasons: string[];
}
