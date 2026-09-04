import assert from "node:assert/strict";
import test from "node:test";

import { rightsForEvent } from "./rights.js";
import type { SportEvent } from "./model.js";

test("couvre LaLiga par les plateformes officielles sur la période du droit", () => {
  const providers = rightsForEvent(event("La Liga", "2026-08-31T19:30:00.000Z"));
  assert.deepEqual(providers.map((provider) => provider.name), ["DAZN", "Disney+"]);
});

test("couvre la Serie A par DAZN sur la saison configurée", () => {
  const providers = rightsForEvent(event("Serie A", "2026-08-31T16:30:00.000Z"));
  assert.deepEqual(providers.map((provider) => provider.name), ["DAZN"]);
});

test("ne propage pas un droit hors période", () => {
  assert.deepEqual(rightsForEvent(event("La Liga", "2025-08-31T19:30:00.000Z")), []);
});

function event(competition: string, startAtUtc: string): SportEvent {
  return {
    id: `${competition}-${startAtUtc}`,
    source: "api-football",
    sourceEventId: "1",
    sport: "football",
    title: "Équipe A / Équipe B",
    competition,
    stage: "Regular Season",
    participants: ["Équipe A", "Équipe B"],
    startAtUtc,
    timeConfidence: "confirmed",
    status: "NS",
    importance: "B",
    priorityScore: 70,
    priorityReasons: []
  };
}
