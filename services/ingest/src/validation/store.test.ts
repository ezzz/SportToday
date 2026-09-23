import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { TonightReport } from "../reports/tonight.js";
import { loadValidation, saveValidation, updateDebugNote, updateItemValidation, validationPath, type ValidationFile } from "./store.js";

test("sauvegarde les verdicts, retire les entrées vides et conserve les retours des événements retirés", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sporttoday-validation-"));
  const filePath = path.join(directory, "validation.json");
  const report = fixtureReport();
  try {
    const initial: ValidationFile = {
      version: 2,
      source: "xmltvfr",
      date: report.date,
      updatedAt: "",
      missingEventNote: "",
      debugNote: "",
      items: {
        event1: { verdict: "pending", note: "", validatedAt: "" },
        obsolete: { verdict: "ok", note: "ancienne ligne", validatedAt: "" }
      }
    };
    await saveValidation(filePath, initial);
    assert.match(validationPath(directory, report), /validation-poc21-tonight-xmltvfr-2026-08-17\.json$/u);
    const loaded = await loadValidation(filePath, report);
    assert.deepEqual(loaded.items, { obsolete: initial.items.obsolete });

    const checked = updateItemValidation(loaded, "event1", "ok", "vérifié");
    await saveValidation(filePath, checked);
    assert.equal(JSON.parse(await readFile(filePath, "utf8")).items.event1.verdict, "ok");
    assert.deepEqual(updateItemValidation(checked, "event1", "pending", "").items, { obsolete: initial.items.obsolete });
    const contextual = updateItemValidation(checked, 'event1', 'wrong_time', 'horaire incorrect', { title: 'Paris / Lyon', sport: 'football', competition: 'Ligue 1' });
    await saveValidation(filePath, contextual);
    const reloaded = await loadValidation(filePath, { ...report, items: [] });
    assert.equal(reloaded.items.event1?.note, 'horaire incorrect');
    assert.equal(reloaded.items.event1?.context?.competition, 'Ligue 1');
    assert.equal(updateDebugNote(checked, "  test depuis le VPS  ").debugNote, "test depuis le VPS");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureReport(): TonightReport {
  return {
    iteration: "poc21",
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
