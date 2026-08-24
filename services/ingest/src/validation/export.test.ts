import assert from "node:assert/strict";
import test from "node:test";

import type { TonightReport } from "../reports/tonight.js";
import { validationCsv, validationXlsx } from "./export.js";
import type { ValidationFile } from "./store.js";

test("génère un CSV Excel français et un classeur XLSX", async () => {
  const report = fixtureReport();
  const validation: ValidationFile = {
    version: 1,
    source: "xmltvfr",
    date: report.date,
    updatedAt: "2026-08-19T08:00:00.000Z",
    missingEventNote: "Aucun",
    items: {
      event1: { verdict: "ok", note: "Chaîne et horaire vérifiés", validatedAt: "2026-08-19T08:00:00.000Z" }
    }
  };

  const csv = validationCsv(report, validation);
  assert.deepEqual([...csv.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.match(csv.toString("utf8"), /"Date";"Horaire officiel";"Source événement";"Diffusions"/u);
  assert.match(csv.toString("utf8"), /"OK";"Chaîne et horaire vérifiés"/u);

  const xlsx = await validationXlsx(report, validation);
  assert.equal(xlsx.subarray(0, 2).toString("ascii"), "PK");
  assert.ok(xlsx.length > 4_000);
});

function fixtureReport(): TonightReport {
  return {
    iteration: "poc21",
    source: "xmltvfr",
    date: "2026-08-17",
    timeZone: "Europe/Paris",
    generatedAt: "2026-08-19T08:00:00.000Z",
    windowStartUtc: "2026-08-16T22:00:00.000Z",
    eveningStartUtc: "2026-08-17T18:00:00.000Z",
    windowEndUtc: "2026-08-17T22:30:00.000Z",
    programmeCount: 1,
    candidateCount: 1,
    quarantinedProgrammeCount: 0,
    selectedCount: 1,
    limit: 12,
    items: [{
      id: "event1",
      title: "Paris / Lyon",
      description: "Match",
      sport: "football",
      competition: "Ligue 1",
      participants: "Paris | Lyon",
      contentCategory: "Sport Live",
      isLive: "true",
      liveStatus: "confirmed",
      titleQuality: "clear",
      confidence: "high",
      score: 100,
      selectionReasons: ["participants identifiés"],
      broadcasts: [{
        sourceId: "source1",
        channel: "Canal+ Foot",
        channelSourceId: "canal",
        startAtUtc: "2026-08-17T19:00:00.000Z",
        stopAtUtc: "2026-08-17T21:00:00.000Z",
        startAtLocal: "17/08/2026 21:00",
        timeLabel: "21:00",
        endTimeLabel: "23:00",
        timeRangeLabel: "21:00–23:00",
        subTitle: "Ligue 1. 1re journée.",
        isPreviouslyShown: false,
        liveStatus: "confirmed",
        liveEvidence: "direct explicite dans le programme"
      }]
    }]
  };
}
