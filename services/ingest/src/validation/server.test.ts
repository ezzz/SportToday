import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { TonightItem, TonightReport } from "../reports/tonight.js";
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
    assert.deepEqual(reportPayload.weekPreview, []);

    const prototypeResponse = await fetch(`${server.url}/prototype`);
    assert.equal(prototypeResponse.status, 200);
    const prototype = await prototypeResponse.text();
    assert.match(prototype, /SportToday — Prototype UX/u);
    assert.match(prototype, /data-panel="upcoming">À venir/u);
    assert.match(prototype, /Mes accès TV/u);
    assert.match(prototype, /Dès 15:00/u);
    assert.match(prototype, /Afficher les 2 autres matchs/u);

    const savedResponse = await fetch(`${server.url}/api/debug-note`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: report.date, note: "  anomalie depuis le site  " })
    });
    assert.equal(savedResponse.status, 200);
    const saved = await savedResponse.json() as { debugNote: string };
    assert.equal(saved.debugNote, "anomalie depuis le site");

    const feedbackResponse = await fetch(`${server.url}/feedback.json`);
    assert.equal(feedbackResponse.status, 200);
    assert.match(feedbackResponse.headers.get("content-disposition") ?? "", /sporttoday-feedback\.json/u);
    const feedback = await feedbackResponse.json() as { feedback: Array<{ date: string; debugNote: string }> };
    assert.equal(feedback.feedback.find((entry) => entry.date === report.date)?.debugNote, "anomalie depuis le site");
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

test("l'aperçu transmet les favoris, le tour et la précision horaire depuis Aujourd'hui et Demain", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sporttoday-preview-'));
  const report = { ...fixtureReport(), viewMode: 'event-first' as const };
  const item: TonightItem = {
    id: 'future', title: 'Finale', description: '', sport: 'tennis', competition: 'Tournoi',
    participants: 'Joueur A | Joueur B', contentCategory: 'Sport Live', isLive: 'unknown',
    liveStatus: 'unknown', titleQuality: 'clear', confidence: 'high', score: 90,
    selectionReasons: [], broadcasts: [], eventRoundLabel: 'Finale',
    eventTimeConfidence: 'estimated', eventStartAtUtc: '2026-09-11T13:00:00Z'
  };
  const server = await startValidationServer({ report, reportsRoot: directory, host: '127.0.0.1', port: 0,
    reportsByDate: {
      '2026-09-09': { report },
      '2026-09-10': { report: { ...report, date: '2026-09-10' } },
      '2026-09-11': { report: { ...report, date: '2026-09-11', items: [item] } }
    }
  });
  try {
    for (const date of ['2026-09-09', '2026-09-10']) {
      const response = await fetch(`${server.url}/api/report?date=${date}`);
      const payload = await response.json() as { weekPreview: Array<Partial<TonightItem> & { date: string }> };
      assert.equal(payload.weekPreview.length, 1);
      assert.equal(payload.weekPreview[0]?.date, '2026-09-11');
      assert.equal(payload.weekPreview[0]?.participants, item.participants);
      assert.equal(payload.weekPreview[0]?.eventRoundLabel, 'Finale');
      assert.equal(payload.weekPreview[0]?.eventTimeConfidence, 'estimated');
    }
    const saveNote = await fetch(`${server.url}/api/validation`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-11', itemId: item.id, note: 'Horaire à corriger' })
    });
    assert.equal(saveNote.status, 200);
    const saveVerdict = await fetch(`${server.url}/api/validation`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-11', itemId: item.id, verdict: 'wrong_time' })
    });
    assert.equal(saveVerdict.status, 200);
    const saved = await saveVerdict.json() as { items: Record<string, { note: string; context: { competition: string } }> };
    assert.equal(saved.items.future?.note, 'Horaire à corriger');
    assert.equal(saved.items.future?.context.competition, 'Tournoi');
    const invalidDate = await fetch(`${server.url}/api/validation`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-21', itemId: item.id, note: 'Ne pas rattacher à aujourd’hui' })
    });
    assert.equal(invalidDate.status, 400);
    const feedback = await (await fetch(`${server.url}/feedback.json`)).json() as { feedback: Array<{ date: string; items: Record<string, { note: string }> }> };
    assert.equal(feedback.feedback.find(entry => entry.date === '2026-09-11')?.items.future?.note, 'Horaire à corriger');
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("le dimanche, À venir exclut le lundi depuis Aujourd'hui et Demain", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sporttoday-upcoming-sunday-"));
  const base = { ...fixtureReport(), date: "2026-09-20", viewMode: "event-first" as const };
  const event: TonightItem = { id: "future", title: "Match", description: "", sport: "football", competition: "Ligue 1",
    participants: "", contentCategory: "Sport Live", isLive: "unknown", liveStatus: "unknown", titleQuality: "clear",
    confidence: "high", score: 90, selectionReasons: [], broadcasts: [] };
  const monday = { ...base, date: "2026-09-21", items: [{ ...event, id: "monday" }] };
  const tuesday = { ...base, date: "2026-09-22", items: [{ ...event, id: "tuesday" }] };
  const server = await startValidationServer({ report: base, reportsRoot: directory, host: "127.0.0.1", port: 0,
    reportsByDate: { [base.date]: { report: base }, [monday.date]: { report: monday }, [tuesday.date]: { report: tuesday } }
  });
  try {
    for (const date of [base.date, monday.date]) {
      const payload = await (await fetch(`${server.url}/api/report?date=${date}`)).json() as { weekPreview: Array<{ date: string }> };
      assert.deepEqual(payload.weekPreview.map(item => item.date), [tuesday.date]);
    }
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
