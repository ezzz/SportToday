import assert from "node:assert/strict";
import test from "node:test";

import type { TonightItem, TonightReport } from "../reports/tonight.js";
import { filteredReport } from "./filters.js";

test("filtre par catégorie et par soirée avec une limite par vue", () => {
  const report = fixtureReport([
    item("morning-live", "Sport Live", "2026-08-17T08:00:00.000Z"),
    item("evening-live", "Sport Live", "2026-08-17T19:00:00.000Z"),
    item("evening-unknown", "Sport différé", "2026-08-17T19:30:00.000Z", "unknown"),
    item("evening-delayed", "Sport différé", "2026-08-17T20:00:00.000Z", "false")
  ]);

  assert.deepEqual(filteredReport(report, "live", "evening").items.map(({ id }) => id), ["evening-live", "evening-unknown"]);
  assert.deepEqual(filteredReport(report, "live", "day").items.map(({ id }) => id), ["morning-live", "evening-live", "evening-unknown"]);
  assert.deepEqual(filteredReport(report, "delayed", "evening").items.map(({ id }) => id), ["evening-delayed"]);
});

function item(
  id: string,
  contentCategory: TonightItem["contentCategory"],
  startAtUtc: string,
  isLive: TonightItem["isLive"] = contentCategory === "Sport Live" ? "true" : "false"
): TonightItem {
  return {
    id,
    title: id,
    description: "",
    sport: "football",
    competition: "",
    participants: "",
    contentCategory,
    isLive,
    confidence: "high",
    score: 100,
    selectionReasons: [],
    broadcasts: [{
      sourceId: id,
      channel: "Test",
      channelSourceId: "test",
      startAtUtc,
      stopAtUtc: "",
      startAtLocal: startAtUtc,
      timeLabel: startAtUtc.slice(11, 16)
    }]
  };
}

function fixtureReport(items: TonightItem[]): TonightReport {
  return {
    source: "xmltvfr",
    date: "2026-08-17",
    timeZone: "Europe/Paris",
    generatedAt: "",
    windowStartUtc: "2026-08-16T22:00:00.000Z",
    eveningStartUtc: "2026-08-17T18:00:00.000Z",
    windowEndUtc: "2026-08-17T22:30:00.000Z",
    programmeCount: items.length,
    candidateCount: items.length,
    selectedCount: items.length,
    limit: 12,
    items
  };
}
