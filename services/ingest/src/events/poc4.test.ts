import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import os from "node:os";
import path from "node:path";

import { loadEventCatalogue } from "./catalogue.js";
import { buildPoc4EventReport } from "../reports/poc4-events.js";
import type { DayProgramme, DayReport } from "../reports/day-filter.js";
import { parseApiFootballEvents } from "../sources/api-football.js";
import { parseApiTennisEvents } from "../sources/api-tennis.js";
import { parseApiVolleyballEvents } from "../sources/api-volleyball.js";
import { parseEspnGolfEvents } from "../sources/espn-golf.js";
import { parseJolpicaEvents } from "../sources/jolpica-f1.js";
import { parseWorldAthleticsEvents } from "../sources/world-athletics.js";

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
  assert.equal(item?.broadcasts[0]?.broadcastAlignedToEvent, true);
  assert.equal(item?.broadcastMatchConfidence, "high");
});

test("ne classe pas un direct comme replay à cause d'un contexte historique", () => {
  const event = parseApiFootballEvents({ errors: [], response: [
    fixture(104, 39, "Premier League", "Regular Season", "Ipswich", "Liverpool")
  ] })[0]!;
  const programme = dayProgramme("Ipswich / Liverpool", "2026-08-23T18:55:00.000Z", "2026-08-23T21:00:00.000Z", "Canal+ Foot", ["football"]);
  programme.description = "Les deux équipes se retrouvent après leur saison dernière.";

  const report = buildPoc4EventReport([event], dayReport("2026-08-23", [programme]));

  assert.equal(report.items[0]?.broadcasts[0]?.liveStatus, "probable");
});

test("rattache un programme de football générique seulement quand le créneau ne contient qu'un match", () => {
  const event = parseApiFootballEvents({ errors: [], response: [
    fixture(105, 78, "Bundesliga", "Regular Season", "Stuttgart", "Koln")
  ] })[0]!;
  const programme = dayProgramme("Football : Bundesliga", "2026-08-23T18:50:00.000Z", "2026-08-23T21:00:00.000Z", "beIN SPORTS MAX 9", ["football"]);

  const report = buildPoc4EventReport([event], dayReport("2026-08-23", [programme]));

  assert.equal(report.items[0]?.broadcasts[0]?.channel, "beIN SPORTS MAX 9");
  assert.equal(report.items[0]?.broadcastMatchConfidence, "medium");
});

test("ajoute une plateforme de droits quand l'EPG linéaire est absent", () => {
  const event = parseApiFootballEvents({ errors: [], response: [
    fixture(103, 140, "La Liga", "Regular Season", "Barcelona", "Rayo Vallecano")
  ] })[0]!;
  const report = buildPoc4EventReport([event], dayReport("2026-08-23", []));
  const item = report.items[0];

  assert.deepEqual(item?.broadcasts.map((broadcast) => broadcast.platform), ["DAZN", "Disney+"]);
  assert.deepEqual(item?.broadcasts.map((broadcast) => broadcast.provenance), ["rights", "rights"]);
  assert.deepEqual(item?.broadcasts.map((broadcast) => broadcast.liveStatus), ["confirmed", "confirmed"]);
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

test("parse les références Volleyball, Tennis, Golf et Diamond League", () => {
  const volleyball = parseApiVolleyballEvents({ response: [{
    id: 1, date: "2026-08-26T18:00:00+00:00", country: { name: "France" },
    league: { name: "Ligue A", type: "League" },
    teams: { home: { name: "Tours VB" }, away: { name: "Montpellier" } }, status: { short: "NS" }
  }] });
  const tennis = parseApiTennisEvents({ success: 1, result: [{
    event_key: "2", event_date: "2026-08-26", event_time: "20:00",
    event_first_player: "A. Player", event_second_player: "B. Player",
    tournament_name: "US Open", tournament_round: "Quarterfinal"
  }] });
  const golf = parseEspnGolfEvents({ tours: [{ events: [{ id: "3", name: "The Open", date: "2026-08-26T10:00:00Z" }] }] }, "2026-08-26");
  const athletics = parseWorldAthleticsEvents('<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"calendar":[{"id":"4","name":"Weltklasse Zürich","startDate":"2026-08-26","endDate":"2026-08-27","disciplines":"Track and Field"}]}}}</script>', "2026-08-26");

  assert.equal(volleyball[0]?.sport, "volleyball");
  assert.equal(tennis[0]?.competition, "US Open");
  assert.equal(golf[0]?.sport, "golf");
  assert.equal(athletics[0]?.competition, "Diamond League");
  assert.equal(athletics[0]?.timeConfidence, "estimated");
});

test("déduplique un meeting World Athletics présent plusieurs fois dans le calendrier", () => {
  const athletics = parseWorldAthleticsEvents('<script id="__NEXT_DATA__">{"events":[{"id":"first","name":"Diamond League Brussels","startDate":"2026-08-26","endDate":"2026-08-27","disciplines":"Track and Field"},{"id":"second","name":"Diamond League Brussels","startDate":"2026-08-26","endDate":"2026-08-27","disciplines":"Track and Field"}]}</script>', "2026-08-26");
  assert.equal(athletics.length, 1);
  assert.equal(athletics[0]?.sourceEventId, "first");
  assert.equal(athletics[0]?.endAtUtc, undefined);
});

test("agrège les sources événementielles disponibles dans le catalogue", async () => {
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), "sporttoday-catalogue-"));
  try {
    const catalogue = await loadEventCatalogue("2026-08-26", {
      dataRoot,
      timeZone: "Europe/Paris",
      apiFootball: { fixturesForDate: async () => ({ errors: [], response: [fixture(10, 2, "UEFA Champions League", "Semi-finals", "Paris Saint Germain", "Real Madrid")] }) },
      apiVolleyball: { gamesForDate: async () => ({ response: [{ id: 11, date: "2026-08-26T18:00:00Z", country: { name: "France" }, league: { name: "Ligue A" }, teams: { home: { name: "Tours" }, away: { name: "Montpellier" } }, status: { short: "NS" } }] }) },
      apiTennis: { fixturesForDate: async () => ({ success: 1, result: [{ event_key: "12", event_date: "2026-08-26", event_time: "20:00", event_first_player: "A", event_second_player: "B", tournament_name: "US Open" }] }) },
      espnGolf: { scoreboardForDate: async () => ({ tours: [{ events: [{ id: "13", name: "The Open", date: "2026-08-26T10:00:00Z" }] }] }) },
      worldAthletics: { calendarForDate: async () => '<script id="__NEXT_DATA__">{"events":[{"id":"14","name":"Diamond League","startDate":"2026-08-26","disciplines":"Track and Field"}]}</script>' },
      jolpicaF1: { scheduleForSeason: async () => ({ MRData: { RaceTable: { Races: [] } } }) }
    });
    assert.equal(catalogue.events.length, 5);
    assert.deepEqual(catalogue.eventCounts, { football: 1, volleyball: 1, tennis: 1, golf: 1, athletics: 1 });
    assert.equal(catalogue.sourceErrors.length, 0);
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
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
