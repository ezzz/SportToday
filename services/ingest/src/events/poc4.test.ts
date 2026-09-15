import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import os from "node:os";
import path from "node:path";

import { loadEventCatalogue, loadOrFetch } from "./catalogue.js";
import { buildPoc4EventReport } from "../reports/poc4-events.js";
import type { DayProgramme, DayReport } from "../reports/day-filter.js";
import { parseApiFootballEvents } from "../sources/api-football.js";
import { parseApiTennisEvents } from "../sources/api-tennis.js";
import { parseApiVolleyballEvents } from "../sources/api-volleyball.js";
import { parseEspnGolfEvents } from "../sources/espn-golf.js";
import { parseEspnTennisEvents } from "../sources/espn-tennis.js";
import { parseJolpicaEvents } from "../sources/jolpica-f1.js";
import { parseWorldAthleticsEvents } from "../sources/world-athletics.js";
import { parseApiBasketballEvents } from "../sources/api-basketball.js";
import { ultimateAthleticsEvents } from "../sources/ultimate-athletics.js";
import { parseApiRugbyEvents } from "../sources/api-rugby.js";
import { parseMotoGpEvents } from "../sources/motogp.js";
import { uciRoadEvents } from "../sources/uci-road.js";

test("MotoGP : regroupe Q1/Q2, respecte le fuseau et exclut Moto2 et essais libres", () => {
  const session = (shortname: string, date_start: string, date_end = date_start, category = "MotoGP") =>
    ({ shortname, date_start, date_end, category: { name: category }, type: "SESSION" });
  const payload = { events: [{ id: "rsm", kind: "GP", season: { year: 2026 }, shortname: "RSM", broadcasts: [
    session("Q1", "2026-09-12T10:50:00+0200", "2026-09-12T11:05:00+0200"),
    session("Q2", "2026-09-12T11:15:00+0200", "2026-09-12T11:30:00+0200"),
    session("SPR", "2026-09-12T15:00:00+0200"),
    session("FP2", "2026-09-12T10:00:00+0200"),
    session("RAC", "2026-09-12T12:00:00+0200", undefined, "Moto2"),
    session("RAC", "2026-09-12T23:30:00Z")
  ] }] };
  const events = parseMotoGpEvents(payload, "2026-09-12");
  assert.deepEqual(events.map(e => e.stage), ["Qualifications", "Sprint"]);
  assert.equal(events[0]?.startAtUtc, "2026-09-12T08:50:00.000Z");
  assert.equal(events[0]?.endAtUtc, "2026-09-12T09:30:00.000Z");
  assert.equal(events[1]?.endAtUtc, undefined);
  assert.equal(parseMotoGpEvents(payload, "2026-09-13")[0]?.stage, "Course");
  const programmes = [
    dayProgramme("Moto GP : Grand Prix de San Marin - Essais qualificatifs 1 et 2", "2026-09-12T08:45:00Z", "2026-09-12T09:46:00Z", "Canal+ Sport 360", ["motogp"]),
    dayProgramme("Moto GP : Grand Prix de San Marin - Sprint", "2026-09-12T12:55:00Z", "2026-09-12T13:26:00Z", "Canal+ Sport 360", ["motogp"]),
    dayProgramme("Moto2 : Grand Prix de San Marin - Sprint", "2026-09-12T12:55:00Z", "2026-09-12T13:26:00Z", "Wrong category", ["motogp"]),
    dayProgramme("Moto GP : Grand Prix de France - Sprint", "2026-09-12T12:55:00Z", "2026-09-12T13:26:00Z", "Wrong GP", ["motogp"])
  ];
  const report = buildPoc4EventReport(events, dayReport("2026-09-12", programmes));
  assert.equal(report.items.length, 2);
  for (const item of report.items) {
    assert.deepEqual(item.broadcasts.map(b => b.channel), ["Canal+ Sport 360"]);
    assert.equal(item.broadcasts[0]?.liveStatus, "probable");
  }
});

test("sélectionne le Top 14 et distingue l'affiche des autres matchs de rugby", () => {
  const game = { id: 54086, date: "2026-09-06T21:05:00+02:00", week: "1", league: { id: 16 },
    teams: { home: { name: "Stade Rochelais" }, away: { name: "Stade Toulousain" } }, status: { short: "NS" } };
  const events = parseApiRugbyEvents({ response: [game, { ...game, id: 2, league: { id: 1 } }] }, "2026-09-06");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.title, "La Rochelle / Toulouse");
  assert.equal(events[0]?.stage, "Journée 1");
  assert.equal(events[0]?.startAtUtc, "2026-09-06T19:05:00.000Z");
  assert.equal(parseApiRugbyEvents({ response: [game] }, "2026-09-07").length, 0);
  const tv = dayProgramme("Rugby : La Rochelle / Toulouse", "2026-09-06T19:05:00Z", "2026-09-06T21:05:00Z", "Canal+", ["rugby"]);
  tv.subTitle = "Top 14 — 1re journée";
  const wrong = { ...tv, sourceId: "wrong", channelName: "Autre chaîne", title: "Rugby : Toulon / Pau", description: "La Rochelle et Toulouse jouent aussi ce soir." };
  const report = buildPoc4EventReport(events, dayReport("2026-09-06", [tv, wrong]));
  assert.deepEqual(report.items[0]?.broadcasts.map((b) => b.channel), ["Canal+"]);
});

test("limite le basket au Mondial féminin, à la France en poules et à la phase finale", () => {
  const game = (id: number, home: string, league = 284) => ({ id, date: "2026-09-07T12:30:00Z", league: { id: league }, teams: { home: { name: home }, away: { name: "Nigeria W" } } });
  const payload = { response: [game(1, "France W"), game(2, "USA W"), game(3, "France W", 1)] };
  assert.deepEqual(parseApiBasketballEvents(payload, "2026-09-07").map((e) => e.title), ["France / Nigeria"]);
  assert.equal(parseApiBasketballEvents({ response: payload.response.map((game) => ({ ...game, date: "2026-09-08T12:30:00Z" })) }, "2026-09-08").length, 2);
  assert.equal(parseApiBasketballEvents(payload, "2026-09-08").length, 0);
  assert.equal(parseApiBasketballEvents(payload, "2027-09-08").length, 0);
});

test("rattache un programme basket générique quand un seul match de la compétition couvre le créneau", () => {
  const events = parseApiBasketballEvents({ response: [
    { id: 501, date: "2026-09-10T15:45:00Z", league: { id: 284 }, teams: { home: { name: "Belgium W" }, away: { name: "Germany W" } } },
    { id: 502, date: "2026-09-10T18:45:00Z", league: { id: 284 }, teams: { home: { name: "Australia W" }, away: { name: "Spain W" } } }
  ] }, "2026-09-10");
  const early = dayProgramme("Basket-ball : Coupe du monde féminine", "2026-09-10T15:30:00Z", "2026-09-10T17:30:00Z", "beIN SPORTS 1", ["basket"]);
  const late = dayProgramme("Basket-ball : Coupe du monde féminine", "2026-09-10T18:30:00Z", "2026-09-10T20:30:00Z", "beIN SPORTS 1", ["basket"]);
  const report = buildPoc4EventReport(events, dayReport("2026-09-10", [early, late]));

  assert.ok(report.items.every((item) => item.broadcasts[0]?.channel === "beIN SPORTS 1"));
  assert.ok(report.items.every((item) => item.broadcastMatchConfidence === "high"));
});

test("étend le basket à EuroLeague et NBA sans étendre le Mondial féminin hors de sa période", () => {
  const games = [
    { id: 1200, date: "2026-10-01T18:30:00Z", league: { id: 120 }, teams: { home: { name: "AS Monaco" }, away: { name: "Barcelona" } } },
    { id: 1201, date: "2026-10-01T20:00:00Z", league: { id: 12 }, teams: { home: { name: "New York Knicks" }, away: { name: "Boston Celtics" } } },
    { id: 1202, date: "2026-10-01T18:30:00Z", league: { id: 284 }, teams: { home: { name: "France W" }, away: { name: "Spain W" } } }
  ];
  const events = parseApiBasketballEvents({ response: games }, "2026-10-01");
  assert.deepEqual(events.map((event) => event.competition), ["EuroLeague", "NBA"]);
  assert.deepEqual(events.map((event) => event.importance), ["A", "B"]);
});

test("intègre Pro D2 avec un rapprochement TV exigeant la compétition et les équipes", () => {
  const game = { id: 17001, date: "2026-09-11T17:30:00Z", week: 3, league: { id: 17 },
    teams: { home: { name: "SU Agen" }, away: { name: "Biarritz Olympique" } }, status: { short: "NS" } };
  const events = parseApiRugbyEvents({ response: [game] }, "2026-09-11");
  assert.equal(events[0]?.competition, "Pro D2");
  assert.equal(events[0]?.title, "Agen / Biarritz");
  const right = dayProgramme("Rugby : Agen / Biarritz", "2026-09-11T17:30:00Z", "2026-09-11T19:35:00Z", "Canal+ Sport", ["rugby"]);
  right.subTitle = "Pro D2 — 3e journée";
  const wrong = { ...right, sourceId: "wrong-pro-d2", subTitle: "Top 14 — 3e journée" };
  const report = buildPoc4EventReport(events, dayReport("2026-09-11", [right, wrong]));
  assert.deepEqual(report.items[0]?.broadcasts.map((broadcast) => broadcast.channel), ["Canal+ Sport"]);
});

test("référence les classiques UCI sans inventer d'horaire et distingue la course femmes", () => {
  const men = uciRoadEvents("2026-09-11");
  assert.equal(men[0]?.competition, "Grand Prix Cycliste de Québec");
  assert.equal(men[0]?.timeConfidence, "estimated");
  assert.equal(uciRoadEvents("2026-09-12").find((event) => event.competition === "La Vuelta")?.title, "20e étape");
  const women = uciRoadEvents("2026-04-12").find((event) => /Femmes/u.test(event.stage))!;
  const right = dayProgramme("Cyclisme : Paris-Roubaix Femmes", "2026-04-12T12:00:00Z", "2026-04-12T15:00:00Z", "France 3", ["cyclisme"]);
  const wrong = { ...right, sourceId: "men", title: "Cyclisme : Paris-Roubaix" };
  const report = buildPoc4EventReport([women], dayReport("2026-04-12", [right, wrong]));
  assert.equal(report.items[0]?.eventTimeLabel, "Dès 14h00");
  assert.deepEqual(report.items[0]?.broadcasts.map((broadcast) => broadcast.channel), ["France 3"]);
});

test("ajoute les étapes des trois grands tours et ignore la rediffusion de l'étape précédente", () => {
  assert.equal(uciRoadEvents("2026-05-20").find((event) => event.competition === "Giro d'Italia")?.title, "11e étape");
  assert.equal(uciRoadEvents("2026-07-24").find((event) => event.competition === "Tour de France")?.title, "19e étape");
  const vuelta = uciRoadEvents("2026-09-11").find((event) => event.competition === "La Vuelta")!;
  const replay = dayProgramme("La Vuelta | 18e étape", "2026-09-11T02:00:00Z", "2026-09-11T04:00:00Z", "Eurosport 2", ["cyclisme"]);
  const live = dayProgramme("Cyclisme : Tour d'Espagne", "2026-09-11T10:45:00Z", "2026-09-11T16:00:00Z", "Eurosport 360 20", ["cyclisme"]);
  const report = buildPoc4EventReport([vuelta], dayReport("2026-09-11", [replay, live]));

  assert.equal(report.items[0]?.eventTimeLabel, "Dès 12h45");
  assert.deepEqual(report.items[0]?.broadcasts.map((broadcast) => broadcast.channel), ["Eurosport 360"]);
});

test("programme une session Ultimate par jour et ne la rattache pas à la Diamond League", () => {
  const events = ultimateAthleticsEvents("2026-09-11");
  assert.equal(events[0]?.startAtUtc, "2026-09-11T17:00:00.000Z");
  assert.equal(ultimateAthleticsEvents("2026-09-12")[0]?.endAtUtc, "2026-09-12T19:00:00.000Z");
  assert.equal(ultimateAthleticsEvents("2026-09-14").length, 0);
  const wrong = dayProgramme("Athlétisme : Diamond League", "2026-09-11T17:00:00Z", "2026-09-11T20:00:00Z", "Eurosport", ["athlétisme"]);
  const right = { ...wrong, sourceId: "ultimate", title: "Athlétisme : Ultimate Championship", channelName: "Chaîne test" };
  const report = buildPoc4EventReport(events, dayReport("2026-09-11", [wrong, right]));
  assert.deepEqual(report.items[0]?.broadcasts.map((b) => b.channel), ["Chaîne test"]);
});

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

test("normalise les variantes géographiques et orthographiques des équipes", () => {
  const events = parseApiFootballEvents({ response: [
    fixture(111, 2, "UEFA Champions League", "League Stage", "Slavia Praha", "Lens"),
    fixture(112, 2, "UEFA Champions League", "League Stage", "PSV Eindhoven", "Shakhtar Donetsk"),
    fixture(114, 2, "UEFA Champions League", "League Stage", "Bayern München", "Bodo/Glimt")
  ] });
  const slavia = dayProgramme("Slavia Prague / Lens", "2026-08-23T19:00:00Z", "2026-08-23T21:00:00Z", "Canal+ Live 1", ["football"]);
  const psv = dayProgramme("PSV Eindhoven / Chakhtior Donetsk", "2026-08-23T19:00:00Z", "2026-08-23T21:00:00Z", "Canal+ Live 2", ["football"]);
  const bayern = dayProgramme("Bayern Munich / FK Bodø/Glimt", "2026-08-23T18:55:00Z", "2026-08-23T21:00:00Z", "Canal+ Live 3", ["football"]);
  const report = buildPoc4EventReport(events, dayReport("2026-08-23", [slavia, psv, bayern]));

  assert.deepEqual(report.items.find((item) => item.id === "api-football:111")?.broadcasts.map((broadcast) => broadcast.channel), ["Canal+ Live 1"]);
  assert.deepEqual(report.items.find((item) => item.id === "api-football:112")?.broadcasts.map((broadcast) => broadcast.channel), ["Canal+ Live 2"]);
  assert.deepEqual(report.items.find((item) => item.id === "api-football:114")?.broadcasts.map((broadcast) => broadcast.channel), ["Canal+ Live 3"]);
});

test("remplace des numéros de chaînes contradictoires par le bouquet générique", () => {
  const event = parseApiFootballEvents({ response: [
    fixture(113, 2, "UEFA Champions League", "League Stage", "Manchester United", "Sabah FA")
  ] })[0]!;
  const live3 = dayProgramme("Manchester United / Sabah FK", "2026-08-23T18:55:00Z", "2026-08-23T21:00:00Z", "Canal+ Live 3", ["football"]);
  const live4 = { ...live3, sourceId: "live4", channelSourceId: "CanalPlusLive4.fr", channelName: "Canal+ Live 4" };
  const item = buildPoc4EventReport([event], dayReport("2026-08-23", [live3, live4])).items[0]!;

  assert.deepEqual(item.broadcasts.map((broadcast) => broadcast.channel), ["Canal+ Live"]);
  assert.equal(item.broadcasts[0]?.liveStatus, "unknown");
  assert.match(item.broadcasts[0]?.liveEvidence ?? "", /contradictoires/u);
});

test("distingue le multiplex du bouquet secondaire quand les numéros beIN Max sont indéterminables", () => {
  const events = parseApiFootballEvents({ response: [
    fixture(121, 62, "Ligue 2", "Regular Season", "Clermont Foot", "Boulogne"),
    fixture(122, 62, "Ligue 2", "Regular Season", "Rodez", "Grenoble")
  ] });
  const multiplex = dayProgramme("Football : Ligue 2 BKT", "2026-08-23T19:00:00Z", "2026-08-23T21:00:00Z", "beIN SPORTS 1", ["football"]);
  multiplex.description = "Multiplex avec Clermont/Boulogne et Rodez/Grenoble.";
  const max4 = dayProgramme("Football : Ligue 2 BKT", "2026-08-23T19:00:00Z", "2026-08-23T21:00:00Z", "beIN SPORTS MAX 4", ["football"]);
  const max5 = { ...max4, sourceId: "max5", channelSourceId: "beINSPORTSMAX5.fr", channelName: "beIN SPORTS MAX 5" };
  const report = buildPoc4EventReport(events, dayReport("2026-08-23", [multiplex, max4, max5]));

  for (const item of report.items) {
    assert.deepEqual(new Set(item.broadcasts.map((broadcast) => broadcast.channel)), new Set(["beIN SPORTS 1 · Multiplex", "beIN Sports Max"]));
    assert.equal(item.broadcasts.find((broadcast) => broadcast.channel === "beIN Sports Max")?.liveStatus, "unknown");
  }
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

test("un créneau générique ne fuit pas vers les autres horaires ou championnats", () => {
  const events = parseApiFootballEvents({ response: [
    fixture(201, 78, "Bundesliga", "", "Schalke", "Bayern"),
    fixture(202, 78, "Bundesliga", "", "Dortmund", "Hoffenheim"),
    fixture(203, 62, "Ligue 2", "", "Metz", "Rodez")
  ] });
  events.find(event=>event.sourceEventId==="202")!.startAtUtc="2026-08-23T13:30:00.000Z";
  const programme=dayProgramme("Football : Bundesliga","2026-08-23T19:00:00.000Z","2026-08-23T21:00:00.000Z","beIN SPORTS 2",["football"]);
  const otherLeague=dayProgramme("Football : Ligue 1","2026-08-23T19:00:00.000Z","2026-08-23T21:00:00.000Z","Ligue 1+",["football"]);
  const report=buildPoc4EventReport(events,dayReport("2026-08-23",[programme,otherLeague]));
  assert.equal(report.items.find(item=>item.id==="api-football:201")?.broadcasts.length,1);
  assert.equal(report.items.find(item=>item.id==="api-football:202")?.broadcasts.length,0);
  assert.equal(report.items.find(item=>item.id==="api-football:203")?.broadcasts.length,0);
  events.find(event=>event.sourceEventId==="202")!.startAtUtc="2026-08-23T19:00:00.000Z";
  assert.ok(buildPoc4EventReport(events,dayReport("2026-08-23",[programme])).items.every(item=>item.broadcasts.length===0));
});

test("le programme générique du volley féminin reste distinct du masculin", () => {
  const event=parseApiVolleyballEvents({response:[{
    id:9,date:"2026-08-23T19:00:00Z",country:{name:"Europe"},
    league:{name:"European Championships Women"},teams:{home:{name:"Poland W"},away:{name:"Italy W"}},status:{short:"NS"}
  }]})[0]!;
  const programme=dayProgramme("Volley-ball : Championnat d'Europe féminin","2026-08-23T19:00:00.000Z","2026-08-23T21:00:00.000Z","L’Équipe",["volley"]);
  assert.equal(buildPoc4EventReport([event],dayReport("2026-08-23",[programme])).items[0]?.broadcasts.length,1);
  programme.title="Volley-ball : Championnat d'Europe masculin";
  assert.equal(buildPoc4EventReport([event],dayReport("2026-08-23",[programme])).items[0]?.broadcasts.length,0);
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

test("construit la vue Tennis par tournoi depuis les créneaux XMLTV sans API payante", () => {
  const live = dayProgramme("Tennis : US Open", "2026-08-23T18:00:00.000Z", "2026-08-23T21:00:00.000Z", "Eurosport 1", ["tennis"]);
  live.subTitle = "US Open. Demi-finale messieurs.";
  live.description = "En direct de New York.";
  const replay = dayProgramme("Tennis : US Open", "2026-08-23T21:30:00.000Z", "2026-08-23T23:00:00.000Z", "Eurosport 2", ["tennis"]);
  replay.subTitle = "US Open. Demi-finale dames.";
  replay.isPreviouslyShown = true;
  const tableTennis = dayProgramme("Tennis de table : WTT Champions", "2026-08-23T17:00:00.000Z", "2026-08-23T18:00:00.000Z", "L'Équipe", ["tennis"]);
  const documentary = dayProgramme("The Iconic", "2026-08-23T16:00:00.000Z", "2026-08-23T16:30:00.000Z", "TRACE Sport Stars", ["tennis"]);
  documentary.categories = ["Culture Infos"];
  documentary.description = "Retour sur une finale historique à Wimbledon.";
  const monterrey = dayProgramme("Tennis : Tournoi WTA de Monterrey", "2026-08-23T15:00:00.000Z", "2026-08-23T16:30:00.000Z", "beIN SPORTS 3", ["tennis"]);
  monterrey.description = "Une finale disputée quelques jours avant l'US Open.";

  const report = buildPoc4EventReport([], dayReport("2026-08-23", [live, replay, tableTennis, documentary, monterrey]));
  const item = report.items.find((candidate) => candidate.competition === "US Open");

  assert.equal(report.catalogueEventCount, 2);
  assert.ok(report.items.some((candidate) => candidate.competition === "Open de Monterrey"));
  assert.equal(item?.competition, "US Open");
  assert.equal(item?.eventSource, "xmltvfr");
  assert.equal(item?.eventTimeLabel, "Créneaux TV");
  assert.deepEqual(item?.broadcasts.map((broadcast) => [broadcast.channel, broadcast.liveStatus]), [
    ["Eurosport 1", "confirmed"],
    ["Eurosport 2", "delayed"]
  ]);
  assert.match(item?.description ?? "", /Demi-finale messieurs/u);
});

test("regroupe les matchs ESPN Tennis en une ligne ATP et une ligne WTA", () => {
  const tennisEvents = parseEspnTennisEvents(espnTennisFixture(), "2026-09-06", "Europe/Paris");
  const programme = dayProgramme("Tennis : US Open", "2026-09-06T15:00:00.000Z", "2026-09-06T22:30:00.000Z", "Eurosport 1", ["tennis"]);
  const report = buildPoc4EventReport(tennisEvents, dayReport("2026-09-06", [programme]));

  assert.deepEqual(report.items.map((item) => item.title).sort(), ["ATP Hommes", "WTA Femmes"]);
  assert.deepEqual(report.items.map((item) => item.eventTimeLabel).sort(), ["17:40", "20:10"]);
  assert.ok(report.items.every((item) => item.broadcasts[0]?.channel === "Eurosport 1"));
  assert.deepEqual(report.items.find((item) => item.title === "WTA Femmes")?.eventSchedule?.[0]?.participants, ["Taylor Townsend", "Aryna Sabalenka"]);
  assert.equal(report.items.find((item) => item.title === "WTA Femmes")?.eventRoundLabel, "1/8e de finale");
  assert.equal(report.items.find((item) => item.title === "WTA Femmes")?.eventRoundRank, 4);
  const atpSchedule = report.items.find((item) => item.title === "ATP Hommes")?.eventSchedule ?? [];
  assert.deepEqual(atpSchedule.map((entry) => entry.id), ["m1", "m-next-day-france"]);
  assert.equal(atpSchedule[1]?.startAtUtc, "2026-09-07T01:00:00.000Z");
  assert.equal(atpSchedule[1]?.roundLabel, "3e tour");
  assert.equal(atpSchedule[1]?.roundRank, 3);
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
      apiBasketball: { gamesForDate: async () => ({ response: [] }) },
      apiRugby: { gamesForDate: async () => ({ response: [] }) },
      motogp: { calendarForSeason: async () => ({ events: [] }) },
      apiFootball: { fixturesForDate: async () => ({ errors: [], response: [fixture(10, 2, "UEFA Champions League", "Semi-finals", "Paris Saint Germain", "Real Madrid")] }) },
      apiVolleyball: { gamesForDate: async () => ({ response: [{ id: 11, date: "2026-08-26T18:00:00Z", country: { name: "France" }, league: { name: "Ligue A" }, teams: { home: { name: "Tours" }, away: { name: "Montpellier" } }, status: { short: "NS" } }] }) },
      espnTennis: { scoreboardsForDate: async () => ({ tours: [] }) },
      espnGolf: { scoreboardForDate: async () => ({ tours: [{ events: [{ id: "13", name: "The Open", date: "2026-08-26T10:00:00Z" }] }] }) },
      worldAthletics: { calendarForDate: async () => '<script id="__NEXT_DATA__">{"events":[{"id":"14","name":"Diamond League","startDate":"2026-08-26","disciplines":"Track and Field"}]}</script>' },
      jolpicaF1: { scheduleForSeason: async () => ({ MRData: { RaceTable: { Races: [] } } }) }
    });
    assert.equal(catalogue.events.length, 5);
    assert.deepEqual(catalogue.eventCounts, { cyclisme: 1, football: 1, volleyball: 1, golf: 1, athletics: 1 });
    assert.equal(catalogue.sourceErrors.length, 0);
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});

test("n'appelle pas les API-Sports gratuites au-delà de demain", async () => {
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), "sporttoday-future-catalogue-"));
  try {
    let apiSportsCalls = 0;
    const unavailable = async () => { apiSportsCalls += 1; return { response: [] }; };
    await loadEventCatalogue("2026-08-26", {
      dataRoot,
      timeZone: "Europe/Paris",
      dateLimitedSourcesEnabled: false,
      apiFootball: { fixturesForDate: unavailable },
      apiVolleyball: { gamesForDate: unavailable },
      apiBasketball: { gamesForDate: unavailable },
      apiRugby: { gamesForDate: unavailable },
      espnTennis: { scoreboardsForDate: async () => ({ tours: [] }) },
      espnGolf: { scoreboardForDate: async () => ({ tours: [] }) },
      worldAthletics: { calendarForDate: async () => '<script id="__NEXT_DATA__">{"events":[]}</script>' },
      jolpicaF1: { scheduleForSeason: async () => ({ MRData: { RaceTable: { Races: [] } } }) },
      motogp: { calendarForSeason: async () => ({ events: [] }) }
    });
    assert.equal(apiSportsCalls, 0);
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});

test("actualise le cache expiré et conserve la dernière réponse lors d'une panne", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sporttoday-refresh-"));
  const file = path.join(directory, "day.json");
  try {
    let calls = 0;
    const fetchPayload = async () => ({ response: [++calls] });
    await loadOrFetch(file, false, fetchPayload);
    await loadOrFetch(file, false, fetchPayload);
    assert.equal(calls, 1);
    const updated = await loadOrFetch(file, false, fetchPayload, 0);
    assert.deepEqual(updated.payload, { response: [2] });
    const failed = await loadOrFetch(file, true, async () => { throw new Error("offline"); });
    assert.equal(failed.fetchedAt, updated.fetchedAt);
    assert.deepEqual((failed.payload as { response: number[] }).response, [2]);
    assert.match(JSON.stringify(failed.payload), /offline/);
    const recovered = await loadOrFetch(file, true, fetchPayload);
    assert.deepEqual(recovered.payload, { response: [3] });
    const bounded = await loadOrFetch(file, true, async () => await new Promise<never>(() => undefined), 0, 5);
    assert.deepEqual((bounded.payload as { response: number[] }).response, [3]);
    assert.match(JSON.stringify(bounded.payload), /collecte interrompue après 5 ms/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("mutualise une collecte simultanée vers le même cache saisonnier", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sporttoday-shared-cache-"));
  const file = path.join(directory, "season.json");
  try {
    let calls = 0;
    const fetchPayload = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { season: 2026 };
    };
    const results = await Promise.all([
      loadOrFetch(file, false, fetchPayload),
      loadOrFetch(file, false, fetchPayload),
      loadOrFetch(file, false, fetchPayload)
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(results.map((result) => result.payload), [{ season: 2026 }, { season: 2026 }, { season: 2026 }]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

function fixture(id: number, leagueId: number, leagueName: string, round: string, home: string, away: string) {
  return {
    fixture: { id, date: "2026-08-23T21:00:00+02:00", status: { short: "NS" } },
    league: { id: leagueId, name: leagueName, country: "World", round },
    teams: { home: { name: home }, away: { name: away } }
  };
}

function espnTennisFixture() {
  return { tours: [{ tour: "atp", payload: { events: [{
    id: "189-2026", name: "US Open", calendar: { timeZone: "America/New_York" }, groupings: [
      { grouping: { slug: "mens-singles" }, competitions: [{
        id: "m-previous-day", date: "2026-09-06T02:00:00Z", timeValid: true,
        status: { type: { state: "pre" } }, round: { displayName: "Round 4" },
        competitors: [{ athlete: { displayName: "Previous One" } }, { athlete: { displayName: "Previous Two" } }]
      }, {
        id: "m1", date: "2026-09-06T18:10:00Z", timeValid: true,
        status: { type: { state: "pre" } }, round: { displayName: "Round 4" },
        competitors: [{ athlete: { displayName: "Carlos Alcaraz" } }, { athlete: { displayName: "Tommy Paul" } }]
      }, {
        id: "m-next-day-france", date: "2026-09-07T01:00:00Z", timeValid: true,
        status: { type: { state: "pre" } }, round: { displayName: "Round 3" },
        competitors: [{ athlete: { displayName: "Late One" } }, { athlete: { displayName: "Late Two" } }]
      }] },
      { grouping: { slug: "womens-singles" }, competitions: [{
        id: "w1", date: "2026-09-06T15:40:00Z", timeValid: true,
        status: { type: { state: "pre" } }, round: { displayName: "Round 4" },
        competitors: [{ athlete: { displayName: "Taylor Townsend" } }, { athlete: { displayName: "Aryna Sabalenka" } }]
      }] }
    ]
  }] } }] };
}

test("conserve les affiches tennis sans transformer l'heure provisoire en horaire confirmé", () => {
  const payload = espnTennisFixture();
  for (const tour of payload.tours) for (const event of tour.payload.events)
    for (const grouping of event.groupings) for (const match of grouping.competitions) match.timeValid = false;
  const events = parseEspnTennisEvents(payload, "2026-09-06", "Europe/Paris");
  const tv = dayProgramme("Tennis : US Open", "2026-09-06T15:00:00Z", "2026-09-06T23:00:00Z", "Eurosport 1", ["tennis"]);
  const report = buildPoc4EventReport(events, dayReport("2026-09-06", [tv]));
  assert.equal(report.items.length, 2);
  assert.ok(report.items.every((item) => item.eventTimeLabel === "Horaires à venir"));
  assert.ok(report.items.every((item) => item.eventSchedule?.every((entry) => entry.timeConfirmed === false)));
  assert.ok(report.items.every((item) => item.broadcasts.every((broadcast) => broadcast.liveStatus !== "probable")));
});

test("privilégie l'affiche au descriptif copié et utilise le plateau précédant un match générique", () => {
  const events = parseApiFootballEvents({ response: [
    fixture(901, 2, "UEFA Champions League", "League Stage", "Lille", "Real Betis"),
    fixture(902, 2, "UEFA Champions League", "League Stage", "Real Madrid", "Inter")
  ] });
  const madrid = dayProgramme("Real Madrid / Inter Milan", "2026-08-23T19:00:00Z", "2026-08-23T21:00:00Z", "Canal+ Foot", ["football"]);
  madrid.description = "Lille accueille le Real Betis.";
  const before = dayProgramme("Plateau avant-match UEFA Champions League", "2026-08-23T18:54:00Z", "2026-08-23T19:00:00Z", "Canal+", ["football"]);
  before.subTitle = "Lille - Betis Séville";
  const generic = dayProgramme("Football : Ligue des champions", "2026-08-23T19:00:00Z", "2026-08-23T21:00:00Z", "Canal+", ["football"]);
  const report = buildPoc4EventReport(events, dayReport("2026-08-23", [madrid, before, generic]));
  assert.deepEqual(report.items.find((item) => item.title === "Lille / Real Betis")?.broadcasts.map((b) => b.channel), ["Canal+"]);
  assert.deepEqual(report.items.find((item) => item.title === "Real Madrid / Inter")?.broadcasts.map((b) => b.channel), ["Canal+ Foot"]);
});

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
