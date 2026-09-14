import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { TonightReport } from "../reports/tonight.js";
import { startValidationServer } from "./server.js";

test("expose un healthcheck sans chemin local et permet l'arrêt propre", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sporttoday-server-"));
  const report = fixtureReport();
  const server = await startValidationServer({
    report,
    reportsRoot: directory,
    host: "127.0.0.1",
    port: 0
  });
  try {
    const response = await fetch(`${server.url}/healthz`);
    assert.equal(response.status, 200);
    const health = await response.json() as Record<string, unknown>;
    assert.equal(health.status, "ok");
    assert.equal(health.dataDate, report.date);
    assert.equal("validationFile" in health, false);

    const reportResponse = await fetch(`${server.url}/api/report`);
    const reportPayload = await reportResponse.json() as Record<string, unknown>;
    assert.equal("validationFile" in reportPayload, false);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("signale une couverture dégradée quand une source événementielle est partielle", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sporttoday-server-degraded-"));
  const report = { ...fixtureReport(), eventSourceErrors: ["ESPN Tennis : délai dépassé"] };
  const server = await startValidationServer({ report, reportsRoot: directory, host: "127.0.0.1", port: 0 });
  try {
    const response = await fetch(`${server.url}/healthz`);
    const health = await response.json() as { status: string; sourceErrors: string[] };
    assert.equal(health.status, "degraded");
    assert.deepEqual(health.sourceErrors, report.eventSourceErrors);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function fixtureReport(): TonightReport {
  return {
    iteration: "poc21",
    source: "xmltvfr",
    date: "2026-09-09",
    timeZone: "Europe/Paris",
    generatedAt: "2026-09-09T08:00:00.000Z",
    windowStartUtc: "2026-09-08T22:00:00.000Z",
    eveningStartUtc: "2026-09-09T18:00:00.000Z",
    windowEndUtc: "2026-09-09T22:30:00.000Z",
    programmeCount: 0,
    candidateCount: 0,
    quarantinedProgrammeCount: 0,
    selectedCount: 0,
    limit: 10,
    items: []
  };
}
