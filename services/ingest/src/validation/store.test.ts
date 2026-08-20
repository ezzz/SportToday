import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { TonightReport } from "../reports/tonight.js";
import { loadValidation, saveValidation, updateItemValidation, validationPath, type ValidationFile } from "./store.js";

test("sauvegarde les verdicts et retire les entrées en attente ou obsolètes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sporttoday-validation-"));
  const filePath = path.join(directory, "validation.json");
  const report = fixtureReport();
  try {
    const initial: ValidationFile = {
      version: 1,
      source: "xmltvfr",
      date: report.date,
      updatedAt: "",
      missingEventNote: "",
      items: {
        event1: { verdict: "pending", note: "", validatedAt: "" },
        obsolete: { verdict: "ok", note: "ancienne ligne", validatedAt: "" }
      }
    };
    await saveValidation(filePath, initial);
    assert.match(validationPath(directory, report), /validation-poc2-tonight-xmltvfr-2026-08-17\.json$/u);
    const loaded = await loadValidation(filePath, report);
    assert.deepEqual(loaded.items, {});

    const checked = updateItemValidation(loaded, "event1", "ok", "vérifié");
    await saveValidation(filePath, checked);
    assert.equal(JSON.parse(await readFile(filePath, "utf8")).items.event1.verdict, "ok");
    assert.deepEqual(updateItemValidation(checked, "event1", "pending", "").items, {});
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureReport(): TonightReport {
  return {
    iteration: "poc2",
    source: "xmltvfr",
    date: "2026-08-17",
    timeZone: "Europe/Paris",
    generatedAt: "",
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
      description: "",
      sport: "football",
      competition: "Ligue 1",
      participants: "Paris | Lyon",
      contentCategory: "Sport différé",
      isLive: "unknown",
      liveStatus: "unknown",
      titleQuality: "clear",
      confidence: "high",
      score: 100,
      selectionReasons: [],
      broadcasts: []
    }]
  };
}
