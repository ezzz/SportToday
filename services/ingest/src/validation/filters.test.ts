import assert from "node:assert/strict";
import test from "node:test";

import type { TonightItem, TonightReport } from "../reports/tonight.js";
import { filteredReport, matchesCategory, matchesPeriod, matchesSports, parsePeriodFilter } from "./filters.js";

test("filtre par catégorie et par soirée avec une limite par vue", () => {
  const report = fixtureReport([
    item("morning-live", "Sport Live", "2026-08-17T08:00:00.000Z", "confirmed"),
    item("evening-live", "Sport Live", "2026-08-17T19:00:00.000Z", "probable"),
    item("evening-unknown", "Sport différé", "2026-08-17T19:30:00.000Z", "unknown"),
    item("evening-delayed", "Sport différé", "2026-08-17T20:00:00.000Z", "delayed"),
    item("overlap-live", "Sport Live", "2026-08-17T17:30:00.000Z", "confirmed", "2026-08-17T18:30:00.000Z")
  ]);

  assert.deepEqual(filteredReport(report, "live", "evening").items.map(({ id }) => id), ["evening-live", "evening-unknown", "overlap-live"]);
  assert.deepEqual(filteredReport(report, "live", "day").items.map(({ id }) => id), ["morning-live", "evening-live", "evening-unknown", "overlap-live"]);
  assert.deepEqual(filteredReport(report, "uncertain", "evening").items.map(({ id }) => id), ["evening-unknown"]);
  assert.deepEqual(filteredReport(report, "delayed", "evening").items.map(({ id }) => id), ["evening-delayed"]);
  assert.deepEqual(filteredReport(report, "all", "day", ["tennis"]).items.map(({ id }) => id), []);
  assert.equal(matchesSports(report.items[0]!, []), true);
});

test("propose par défaut les événements en cours ou dans les trois prochaines heures", () => {
  const report = fixtureReport([]);
  const ongoing = item("ongoing", "Sport Live", "2026-08-17T11:00:00.000Z", "confirmed", "2026-08-17T13:00:00.000Z");
  const upcoming = item("upcoming", "Sport Live", "2026-08-17T14:30:00.000Z", "confirmed", "2026-08-17T16:00:00.000Z");
  const later = item("later", "Sport Live", "2026-08-17T16:01:00.000Z", "confirmed", "2026-08-17T18:00:00.000Z");
  const finished = item("finished", "Sport Live", "2026-08-17T09:00:00.000Z", "confirmed", "2026-08-17T11:59:00.000Z");
  const now = new Date("2026-08-17T12:00:00.000Z");

  assert.equal(parsePeriodFilter(null), "now");
  assert.equal(matchesPeriod(ongoing, report, "now", now), true);
  assert.equal(matchesPeriod(upcoming, report, "now", now), true);
  assert.equal(matchesPeriod(later, report, "now", now), false);
  assert.equal(matchesPeriod(finished, report, "now", now), false);

  const split = item("split", "Sport Live", "2026-08-17T10:00:00.000Z", "confirmed", "2026-08-17T11:00:00.000Z");
  split.eventTimeConfidence = "estimated";
  split.broadcasts.push({ ...split.broadcasts[0]!, sourceId: "split-later", startAtUtc: "2026-08-17T16:00:00.000Z", stopAtUtc: "2026-08-17T17:00:00.000Z" });
  assert.equal(matchesPeriod(split, report, "now", now), false);
});

test("ne présente pas comme direct un événement dont tous les créneaux sont des replays", () => {
  const replay = item("replay", "Sport Live", "2026-08-17T19:00:00.000Z", "delayed");
  replay.eventSource = "api-football";
  assert.equal(matchesCategory(replay, "live"), false);
  assert.equal(matchesCategory(replay, "delayed"), true);
  const report = { ...fixtureReport([replay]), iteration: "poc41" as const, viewMode: "event-first" as const };
  assert.deepEqual(filteredReport(report, "live", "day").items, []);
  assert.deepEqual(filteredReport(report, "delayed", "day").items[0]?.broadcasts.map(({ sourceId }) => sourceId), ["replay"]);
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

test("filtre les créneaux d'une même carte individuellement", () => {
  const mixed = item("mixed", "Sport Live", "2026-08-17T19:00:00.000Z", "probable", "2026-08-17T21:00:00.000Z");
  mixed.broadcasts.push({
    ...mixed.broadcasts[0]!,
    sourceId: "mixed-replay",
    startAtUtc: "2026-08-17T21:30:00.000Z",
    stopAtUtc: "2026-08-17T23:00:00.000Z",
    timeLabel: "21:30",
    endTimeLabel: "23:00",
    timeRangeLabel: "21:30–23:00",
    isPreviouslyShown: true,
    liveStatus: "delayed",
    liveEvidence: "rediffusion déclarée par XMLTV"
  });
  const report = fixtureReport([mixed]);

  assert.deepEqual(filteredReport(report, "live", "evening").items[0]?.broadcasts.map(({ sourceId }) => sourceId), ["mixed"]);
  assert.deepEqual(filteredReport(report, "delayed", "evening").items[0]?.broadcasts.map(({ sourceId }) => sourceId), ["mixed-replay"]);
});

test("retire un événement POC4 sans diffusion de la vue principale", () => {
  const event = item("official-event", "Sport Live", "2026-08-17T19:00:00.000Z", "unknown");
  event.broadcasts = [];
  event.eventSource = "api-football";
  event.eventStartAtUtc = "2026-08-17T19:00:00.000Z";
  event.eventEndAtUtc = "2026-08-17T21:15:00.000Z";
  event.broadcastMatchConfidence = "none";
  const report = { ...fixtureReport([event]), iteration: "poc41" as const, viewMode: "event-first" as const };

  assert.deepEqual(filteredReport(report, "live", "evening").items.map(({ id }) => id), []);
  assert.deepEqual(filteredReport(report, "uncertain", "evening").items.map(({ id }) => id), []);
});

test("utilise le créneau TV pour filtrer un événement dont l'horaire sportif n'est pas publié", () => {
  const event = item("uci", "Sport Live", "2026-08-17T10:00:00.000Z", "unknown");
  event.eventSource = "uci-road";
  event.eventStartAtUtc = "2026-08-17T12:00:00.000Z";
  event.eventTimeConfidence = "estimated";
  const report = { ...fixtureReport([event]), iteration: "poc41" as const, viewMode: "event-first" as const };
  assert.equal(matchesPeriod(event, report, "evening"), false);
  event.broadcasts[0]!.startAtUtc = "2026-08-17T19:00:00.000Z";
  event.broadcasts[0]!.stopAtUtc = "2026-08-17T21:00:00.000Z";
  assert.equal(matchesPeriod(event, report, "evening"), true);
});

test("exporte tous les événements du catalogue même au-delà des plafonds de sélection", () => {
  const items=Array.from({length:15},(_,index)=>({
    ...item(String(index),"Sport Live","2026-08-17T19:00:00.000Z","probable"),
    eventSource:"api-football" as const, competition:"Ligue 2",
    eventStartAtUtc:"2026-08-17T19:00:00.000Z"
  }));
  const report={...fixtureReport(items),viewMode:"event-first" as const,limit:3};
  assert.equal(filteredReport(report,"live","day").items.length,15);
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
      timeRangeLabel: stopAtUtc ? `${startAtUtc.slice(11, 16)}–${stopAtUtc.slice(11, 16)}` : startAtUtc.slice(11, 16),
      subTitle: "",
      isPreviouslyShown: liveStatus === "delayed",
      liveStatus,
      liveEvidence: "test"
    }]
  };
}

function fixtureReport(items: TonightItem[]): TonightReport {
  return {
    iteration: "poc21",
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
