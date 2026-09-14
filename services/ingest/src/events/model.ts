import type { TonightBroadcast } from "../reports/tonight.js";

/** Sports currently supported by the event-first reference catalogue. */
export type EventSport = "football" | "f1" | "volleyball" | "tennis" | "golf" | "athletics" | "basket" | "rugby" | "motogp" | "cyclisme";
export type EventImportance = "A" | "B" | "C";
export type EventTimeConfidence = "confirmed" | "estimated";

export interface SportEventScheduleEntry {
  id: string;
  startAtUtc: string;
  participants: string[];
  round: string;
  timeConfirmed?: boolean;
  roundLabel?: string;
  roundRank?: number;
  status: string;
}

export interface SportEvent {
  id: string;
  source: "motogp" | "api-football" | "jolpica-f1" | "api-volleyball" | "api-basketball" | "api-rugby" | "api-tennis" | "espn-tennis" | "espn-golf" | "world-athletics" | "uci-road" | "xmltvfr" | "xmltvfree";
  sourceEventId: string;
  sport: EventSport;
  title: string;
  competition: string;
  stage: string;
  participants: string[];
  schedule?: SportEventScheduleEntry[];
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
