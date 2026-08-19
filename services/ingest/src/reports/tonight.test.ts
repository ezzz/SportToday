import assert from "node:assert/strict";
import test from "node:test";

import type { DayProgramme, DayReport } from "./day-filter.js";
import { buildTonightReport } from "./tonight.js";

test("sélectionne la soirée, exclut la fiction et regroupe les diffusions", () => {
  const first = programme("match-a", "Football : Ligue 1 | Paris / Lyon", "2026-08-17T17:00:00.000Z", "Canal+ Foot", ["Football"], ["football"]);
  const duplicate = programme("match-b", "Football : Ligue 1 | Paris / Lyon", "2026-08-17T17:00:00.000Z", "beIN SPORTS 1", ["Football"], ["football"]);
  const fiction = programme("fiction", "Foot 2 rue", "2026-08-17T18:00:00.000Z", "France 4", ["Dessin animé", "Jeunesse"], ["football"]);
  const late = programme("judo", "Judo : Grand Prix de Paris", "2026-08-17T22:20:00.000Z", "RMC Sport 1", ["Judo"], ["judo"]);
  const tooLate = programme("late", "Tennis : Masters 1000 de Paris", "2026-08-17T22:40:00.000Z", "Eurosport 1", ["Tennis"], ["tennis"]);
  const report = buildTonightReport(dayReport("2026-08-17", [first, duplicate, fiction]), dayReport("2026-08-18", [late, tooLate]));

  assert.equal(report.programmeCount, 4);
  assert.equal(report.items.some((item) => item.title === "Foot 2 rue"), false);
  assert.equal(report.items.some((item) => item.title.includes("Masters 1000")), false);
  const match = report.items.find((item) => item.participants === "Paris | Lyon");
  assert.equal(match?.broadcasts.length, 2);
  assert.equal(report.items.some((item) => item.title.includes("Grand Prix de Paris")), true);
});

test("respecte le changement d'heure Europe/Paris", () => {
  const report = buildTonightReport(dayReport("2026-10-25", []), dayReport("2026-10-26", []));
  assert.equal(report.windowStartUtc, "2026-10-25T17:00:00.000Z");
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
