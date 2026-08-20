import assert from "node:assert/strict";
import test from "node:test";

import type { TonightItem, TonightReport } from "../reports/tonight.js";
import { filteredReport, matchesSports } from "./filters.js";

test("filtre par catégorie et par soirée avec une limite par vue", () => {
  const report = fixtureReport([
    item("morning-live", "Sport Live", "2026-08-17T08:00:00.000Z", "confirmed"),
    item("evening-live", "Sport Live", "2026-08-17T19:00:00.000Z", "probable"),
    item("evening-unknown", "Sport différé", "2026-08-17T19:30:00.000Z", "unknown"),
    item("evening-delayed", "Sport différé", "2026-08-17T20:00:00.000Z", "delayed"),
    item("overlap-live", "Sport Live", "2026-08-17T17:30:00.000Z", "confirmed", "2026-08-17T18:30:00.000Z")
  ]);

  assert.deepEqual(filteredReport(report, "live", "evening").items.map(({ id }) => id), ["evening-live", "overlap-live"]);
  assert.deepEqual(filteredReport(report, "live", "day").items.map(({ id }) => id), ["morning-live", "evening-live", "overlap-live"]);
  assert.deepEqual(filteredReport(report, "uncertain", "evening").items.map(({ id }) => id), ["evening-unknown"]);
  assert.deepEqual(filteredReport(report, "delayed", "evening").items.map(({ id }) => id), ["evening-delayed"]);
  assert.deepEqual(filteredReport(report, "all", "day", ["tennis"]).items.map(({ id }) => id), []);
  assert.equal(matchesSports(report.items[0]!, []), true);
});

test("limite à deux événements par compétition dans la sélection principale", () => {
  const league1 = item("league-1", "Sport Live", "2026-08-17T19:00:00.000Z", "probable");
  const league2 = item("league-2", "Sport Live", "2026-08-17T19:05:00.000Z", "probable");
  const league3 = item("league-3", "Sport Live", "2026-08-17T19:10:00.000Z", "probable");
  league1.competition = league2.competition = league3.competition = "Ligue 3";
  const tennis = item("tennis", "Sport Live", "2026-08-17T20:00:00.000Z", "probable");
  tennis.sport = "tennis";
  tennis.competition = "US Open";

  const selected = filteredReport(fixtureReport([league1, league2, league3, tennis]), "live", "evening");
  assert.deepEqual(selected.items.map(({ id }) => id), ["league-1", "league-2", "tennis"]);
});

function item(
  id: string,
  contentCategory: TonightItem["contentCategory"],
  startAtUtc: string,
  liveStatus: TonightItem["liveStatus"],
  stopAtUtc = ""
): TonightItem {
  const isLive = liveStatus === "confirmed" ? "true" : liveStatus === "delayed" ? "false" : "unknown";
  return {
    id,
    title: id,
    description: "",
    sport: "football",
    competition: "",
    participants: "",
    contentCategory,
    isLive,
    liveStatus,
    titleQuality: "clear",
    confidence: "high",
    score: 100,
    selectionReasons: [],
    broadcasts: [{
      sourceId: id,
      channel: "Test",
      channelSourceId: "test",
      startAtUtc,
      stopAtUtc,
      startAtLocal: startAtUtc,
      timeLabel: startAtUtc.slice(11, 16),
      endTimeLabel: stopAtUtc.slice(11, 16),
      timeRangeLabel: stopAtUtc ? `${startAtUtc.slice(11, 16)}–${stopAtUtc.slice(11, 16)}` : startAtUtc.slice(11, 16)
    }]
  };
}

function fixtureReport(items: TonightItem[]): TonightReport {
  return {
    iteration: "poc2",
    source: "xmltvfr",
    date: "2026-08-17",
    timeZone: "Europe/Paris",
    generatedAt: "",
    windowStartUtc: "2026-08-16T22:00:00.000Z",
    eveningStartUtc: "2026-08-17T18:00:00.000Z",
    windowEndUtc: "2026-08-17T22:30:00.000Z",
    programmeCount: items.length,
    candidateCount: items.length,
    quarantinedProgrammeCount: 0,
    selectedCount: items.length,
    limit: 12,
    items
  };
}
