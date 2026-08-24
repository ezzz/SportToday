import assert from "node:assert/strict";
import test from "node:test";

import { buildPoc4EventReport } from "../reports/poc4-events.js";
import type { DayProgramme, DayReport } from "../reports/day-filter.js";
import { parseApiFootballEvents } from "../sources/api-football.js";
import { parseJolpicaEvents } from "../sources/jolpica-f1.js";

test("filtre API-Football sur la watchlist et classe une grande affiche", () => {
  const events = parseApiFootballEvents({
    errors: [],
    response: [
      fixture(101, 2, "UEFA Champions League", "Semi-finals", "Paris Saint Germain", "Real Madrid"),
      fixture(102, 999, "Friendly", "Regular Season", "Club A", "Club B")
    ]
  });

  assert.equal(events.length, 1);
  assert.equal(events[0]?.title, "Paris Saint Germain / Real Madrid");
  assert.equal(events[0]?.importance, "A");
  assert.ok((events[0]?.priorityScore ?? 0) > 120);
});

test("convertit les sessions Jolpica de la date demandée", () => {
  const events = parseJolpicaEvents({
    MRData: { RaceTable: { Races: [{
      season: "2026",
      round: "12",
      raceName: "Belgian Grand Prix",
      date: "2026-08-23",
      time: "13:00:00Z",
      Qualifying: { date: "2026-08-22", time: "14:00:00Z" },
      Sprint: { date: "2026-08-23", time: "09:00:00Z" },
      Circuit: { Location: { country: "Belgium" } }
    }] } }
  }, "2026-08-23");

  assert.deepEqual(events.map((event) => event.stage), ["Course", "Sprint"]);
  assert.equal(events[0]?.competition, "Grand Prix de Belgique");
});

test("rattache la prise d'antenne XMLTV à l'événement officiel", () => {
  const event = parseApiFootballEvents({ errors: [], response: [
    fixture(101, 2, "UEFA Champions League", "Semi-finals", "Paris Saint Germain", "Real Madrid")
  ] })[0]!;
  const programme = dayProgramme(
    "Football : PSG / Real Madrid",
    "2026-08-23T18:50:00.000Z",
    "2026-08-23T21:10:00.000Z",
    "Canal+ Foot",
    ["football"]
  );
  const report = buildPoc4EventReport([event], dayReport("2026-08-23", [programme]));
  const item = report.items[0];

  assert.equal(report.iteration, "poc41");
  assert.equal(item?.eventTimeLabel, "21:00");
  assert.equal(item?.broadcasts.length, 1);
  assert.equal(item?.broadcasts[0]?.liveStatus, "probable");
  assert.equal(item?.broadcastMatchConfidence, "high");
});

test("écarte l'avant-course terminé au départ et un magazine sur un autre Grand Prix", () => {
  const event = parseJolpicaEvents({ MRData: { RaceTable: { Races: [{
    season: "2026", round: "12", raceName: "Dutch Grand Prix", date: "2026-08-23", time: "13:00:00Z",
    Circuit: { Location: { country: "Netherlands" } }
  }] } } }, "2026-08-23")[0]!;
  const preShow = dayProgramme("Grand Prix des Pays-Bas", "2026-08-23T11:35:00.000Z", "2026-08-23T13:00:00.000Z", "Canal+ Series", ["f1"]);
  const otherRace = dayProgramme("On Board F1", "2026-08-23T11:31:00.000Z", "2026-08-23T11:52:00.000Z", "Canal+", ["f1"]);
  otherRace.subTitle = "Grand Prix de Hongrie";
  const race = dayProgramme("Formule 1 : Grand Prix des Pays-Bas", "2026-08-23T13:00:00.000Z", "2026-08-23T14:46:00.000Z", "Canal+", ["f1"]);
  race.subTitle = "Grand Prix des Pays-Bas. La course.";

  const report = buildPoc4EventReport([event], dayReport("2026-08-23", [preShow, otherRace, race]));

  assert.deepEqual(report.items[0]?.broadcasts.map((broadcast) => broadcast.channel), ["Canal+"]);
});

function fixture(id: number, leagueId: number, leagueName: string, round: string, home: string, away: string) {
  return {
    fixture: { id, date: "2026-08-23T21:00:00+02:00", status: { short: "NS" } },
    league: { id: leagueId, name: leagueName, country: "World", round },
    teams: { home: { name: home }, away: { name: away } }
  };
}

function dayProgramme(title: string, startAt: string, stopAt: string, channelName: string, sportSignals: string[]): DayProgramme {
  return {
    source: "xmltvfr",
    sourceId: title,
    channelSourceId: channelName,
    channelName,
    title,
    description: "",
    categories: ["Sport"],
    startAt,
    stopAt,
    isPreviouslyShown: false,
    isSportCandidate: true,
    sportSignals,
    localStartAt: startAt
  };
}

function dayReport(date: string, programmes: DayProgramme[]): DayReport {
  return {
    source: "xmltvfr",
    date,
    timeZone: "Europe/Paris",
    windowStartUtc: "2026-08-22T22:00:00.000Z",
    windowEndUtc: "2026-08-23T22:00:00.000Z",
    programmeCount: programmes.length,
    sportCandidateCount: programmes.length,
    sports: [],
    channels: [],
    programmes
  };
}
