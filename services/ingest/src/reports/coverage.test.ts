import assert from "node:assert/strict";
import test from "node:test";

import type { SportEvent } from "../events/model.js";
import { buildPoc4EventReport } from "./poc4-events.js";
import { buildCoverageReport } from "./coverage.js";
import type { DayProgramme, DayReport } from "./day-filter.js";

test("mesure les chaînes alimentées, vides et absentes", () => {
  const events: SportEvent[] = [event("match-1", "Paris Saint Germain", "Real Madrid"), event("match-2", "Marseille", "Monaco"), event("match-3", "Barcelona", "Rayo Vallecano", "La Liga")];
  const report = dayReport([programme("Football : PSG / Real Madrid", "Canal+ Foot")]);
  const eventReport = buildPoc4EventReport(events, report);
  const coverage = buildCoverageReport(events, report, eventReport);

  assert.equal(coverage.sourceChannelCount, 2);
  assert.equal(coverage.expectedEventCount, 3);
  assert.equal(coverage.matchedEventCount, 1);
  assert.equal(coverage.rightsOnlyEventCount, 1);
  assert.equal(coverage.unmatchedEventCount, 1);
  assert.equal(coverage.channels.find((channel) => channel.id === "canal-foot")?.status, "present");
  assert.equal(coverage.channels.find((channel) => channel.id === "bein-sports-1")?.status, "present_empty");
  assert.equal(coverage.channels.find((channel) => channel.id === "dazn")?.status, "missing");
  assert.equal(coverage.events.find((event) => event.eventId === "match-2")?.reason, "no_epg_match");
  assert.equal(coverage.events.find((event) => event.eventId === "match-3")?.reason, "rights_only");
});

function event(id: string, home: string, away: string, competition = "UEFA Champions League"): SportEvent {
  return {
    id,
    source: "api-football",
    sourceEventId: id,
    sport: "football",
    title: `${home} / ${away}`,
    competition,
    stage: "Regular Season",
    participants: [home, away],
    startAtUtc: "2026-08-26T19:00:00.000Z",
    timeConfidence: "confirmed",
    status: "NS",
    importance: "A",
    priorityScore: 100,
    priorityReasons: []
  };
}

function programme(title: string, channelName: string): DayProgramme {
  return {
    source: "xmltvfr",
    sourceId: title,
    channelSourceId: channelName,
    title,
    description: "",
    categories: ["Sport"],
    startAt: "2026-08-26T18:50:00.000Z",
    stopAt: "2026-08-26T21:10:00.000Z",
    isPreviouslyShown: false,
    channelName,
    isSportCandidate: true,
    sportSignals: ["football"],
    localStartAt: "26/08/2026 20:50"
  };
}

function dayReport(programmes: DayProgramme[]): DayReport {
  return {
    source: "xmltvfr",
    date: "2026-08-26",
    timeZone: "Europe/Paris",
    windowStartUtc: "2026-08-25T22:00:00.000Z",
    windowEndUtc: "2026-08-26T22:00:00.000Z",
    programmeCount: programmes.length,
    sportCandidateCount: programmes.filter((item) => item.isSportCandidate).length,
    sports: [{ sport: "football", programmeCount: programmes.length }],
    channels: [{ channelName: "Canal+ Foot", programmeCount: programmes.length, sportCandidateCount: programmes.length }],
    availableChannels: [
      { channelSourceId: "canal-foot", channelName: "Canal+ Foot" },
      { channelSourceId: "bein-1", channelName: "beIN Sports 1" }
    ],
    programmes
  };
}
