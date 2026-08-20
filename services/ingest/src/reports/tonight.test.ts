import assert from "node:assert/strict";
import test from "node:test";

import type { DayProgramme, DayReport } from "./day-filter.js";
import { buildTonightReport } from "./tonight.js";

test("sélectionne la journée, exclut la fiction et regroupe les diffusions", () => {
  const morning = programme("morning", "Tennis : Masters 1000 de Paris", "2026-08-17T08:00:00.000Z", "Eurosport 1", ["Tennis"], ["tennis"]);
  const first = programme("match-a", "Football : Ligue 1 | Paris / Lyon", "2026-08-17T17:00:00.000Z", "Canal+ Foot", ["Football"], ["football"]);
  const duplicate = programme("match-b", "Football : Ligue 1 | Paris / Lyon", "2026-08-17T17:00:00.000Z", "beIN SPORTS 1", ["Football"], ["football"]);
  const fiction = programme("fiction", "Foot 2 rue", "2026-08-17T18:00:00.000Z", "France 4", ["Dessin animé", "Jeunesse"], ["football"]);
  const late = programme("judo", "Judo : Grand Prix de Paris", "2026-08-17T22:20:00.000Z", "RMC Sport 1", ["Judo"], ["judo"]);
  const tooLate = programme("late", "Tennis : Masters 1000 de Paris", "2026-08-17T22:40:00.000Z", "Eurosport 1", ["Tennis"], ["tennis"]);
  const report = buildTonightReport(dayReport("2026-08-17", [morning, first, duplicate, fiction]), dayReport("2026-08-18", [late, tooLate]));

  assert.equal(report.iteration, "poc2");
  assert.equal(report.programmeCount, 5);
  const masters = report.items.find((item) => item.title.includes("Masters 1000"));
  assert.equal(masters?.broadcasts.length, 1);
  assert.equal(masters?.broadcasts[0]?.sourceId, "morning");
  assert.equal(report.items.some((item) => item.title === "Foot 2 rue"), false);
  const match = report.items.find((item) => item.participants === "Paris | Lyon");
  assert.equal(match?.broadcasts.length, 2);
  assert.equal(match?.broadcasts[0]?.timeRangeLabel, "19:00–20:30");
  assert.equal(report.items.some((item) => item.title.includes("Grand Prix de Paris")), true);
});

test("sépare les directs probables des rediffusions et met les chaînes douteuses en quarantaine", () => {
  const probable = programme("probable", "Football : Ligue 3 | Paris / Lyon", "2026-08-17T19:00:00.000Z", "Canal+ Foot", ["Football"], ["football"]);
  probable.description = "Première période du match de la Journée 3 opposant Paris et Lyon.";
  const previousRound = programme("previous", "Football : Ligue 3 | Rouen / Caen", "2026-08-17T10:00:00.000Z", "Canal+ Foot", ["Football"], ["football"]);
  previousRound.description = "Première période du match de la Journée 2 opposant Rouen et Caen.";
  const replay = programme("replay", "Rugby : finale", "2026-08-17T20:00:00.000Z", "Canal+ Sport", ["Rugby"], ["rugby"]);
  replay.description = "Retour sur la finale 2025 où les deux équipes s'affrontaient.";
  const obsolete = programme("obsolete", "Football : Premier League | Arsenal / Chelsea", "2026-08-17T20:30:00.000Z", "PereNoel.fr", ["Football"], ["football"]);
  const slate = programme("slate", "Ligue 1+ 2", "2026-08-17T18:00:00.000Z", "Ligue 1+ 2", ["Football"], ["football"]);
  slate.description = "Les canaux événements pour suivre tous vos matches en direct et en intégralité.";

  const report = buildTonightReport(dayReport("2026-08-17", [probable, previousRound, replay, obsolete, slate]));

  assert.equal(report.quarantinedProgrammeCount, 2);
  assert.equal(report.items.find((item) => item.title.includes("Paris / Lyon"))?.liveStatus, "probable");
  assert.equal(report.items.find((item) => item.title.includes("Rouen / Caen"))?.liveStatus, "delayed");
  assert.equal(report.items.find((item) => item.title === "Rugby : finale")?.liveStatus, "delayed");
  assert.equal(report.items.some((item) => item.broadcasts.some((broadcast) => broadcast.channelSourceId === "PereNoel.fr")), false);
  assert.equal(report.items.some((item) => item.title === "Ligue 1+ 2"), false);
});

test("respecte le changement d'heure Europe/Paris", () => {
  const report = buildTonightReport(dayReport("2026-10-25", []), dayReport("2026-10-26", []));
  assert.equal(report.windowStartUtc, "2026-10-24T22:00:00.000Z");
  assert.equal(report.eveningStartUtc, "2026-10-25T19:00:00.000Z");
  assert.equal(report.windowEndUtc, "2026-10-25T23:30:00.000Z");
});

function programme(
  sourceId: string,
  title: string,
  startAt: string,
  channelName: string,
  categories: string[],
  sportSignals: string[]
): DayProgramme {
  return {
    source: "xmltvfr",
    sourceId,
    channelSourceId: channelName,
    channelName,
    title,
    description: "",
    categories,
    startAt,
    stopAt: new Date(new Date(startAt).getTime() + 90 * 60_000).toISOString(),
    isSportCandidate: sportSignals.length > 0,
    sportSignals,
    localStartAt: startAt
  };
}

function dayReport(date: string, programmes: DayProgramme[]): DayReport {
  const day = Number(date.slice(-2));
  const start = new Date(Date.UTC(2026, 7, day - 1, 22));
  const end = new Date(start.getTime() + 24 * 60 * 60_000);
  return {
    source: "xmltvfr",
    date,
    timeZone: "Europe/Paris",
    windowStartUtc: start.toISOString(),
    windowEndUtc: end.toISOString(),
    programmeCount: programmes.length,
    sportCandidateCount: programmes.filter((item) => item.isSportCandidate).length,
    sports: [],
    channels: [],
    programmes
  };
}
