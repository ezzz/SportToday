import assert from "node:assert/strict";
import test from "node:test";

import type { TonightReport } from "./tonight.js";
import { buildPoc3SportsDbReport, type SportsDbTargetedClient } from "./poc3-sportsdb.js";

test("rapproche un match ciblé et distingue avant-match et rediffusion", async () => {
  const client: SportsDbTargetedClient = {
    async searchEvents(eventName, date) {
      assert.equal(eventName, "Marseille vs Strasbourg");
      assert.equal(date, "2026-08-21");
      return {
        event: [{
          idEvent: "2489463",
          strTimestamp: "2026-08-21T18:45:00",
          strEvent: "Marseille vs Strasbourg",
          strSport: "Soccer",
          strLeague: "French Ligue 1",
          strHomeTeam: "Marseille",
          strAwayTeam: "Strasbourg",
          strStatus: "NS",
          strPostponed: "no"
        }]
      };
    },
    async tvBroadcastsForEvent(eventId) {
      assert.equal(eventId, "2489463");
      return {
        tvevent: [{ id: "1199896", idEvent: eventId, strCountry: "France", strChannel: "Ligue 1+ 1 FR" }]
      };
    }
  };

  const result = await buildPoc3SportsDbReport(reportFixture(), client);

  assert.equal(result.targetCount, 1);
  assert.equal(result.highConfidenceCount, 1);
  assert.equal(result.probableLiveBroadcastCount, 1);
  assert.equal(result.probableDelayedBroadcastCount, 1);
  assert.deepEqual(result.items[0]?.match?.frenchTvChannels, ["Ligue 1+ 1 FR"]);
  assert.equal(result.items[0]?.broadcasts[0]?.timeDeltaMinutes, -60);
  assert.equal(result.items[0]?.broadcasts[0]?.suggestion, "probable-live");
  assert.equal(result.items[0]?.broadcasts[1]?.timeDeltaMinutes, 150);
  assert.equal(result.items[0]?.broadcasts[1]?.suggestion, "probable-delayed");
  assert.deepEqual(result.items[0]?.attemptedQueries, ["Marseille vs Strasbourg"]);
});

function reportFixture(): TonightReport {
  return {
    iteration: "poc21",
    source: "xmltvfr",
    date: "2026-08-21",
    timeZone: "Europe/Paris",
    generatedAt: "2026-08-21T12:00:00.000Z",
    windowStartUtc: "2026-08-20T22:00:00.000Z",
    eveningStartUtc: "2026-08-21T18:00:00.000Z",
    windowEndUtc: "2026-08-21T22:30:00.000Z",
    programmeCount: 2,
    candidateCount: 2,
    quarantinedProgrammeCount: 0,
    selectedCount: 1,
    limit: 12,
    items: [{
      id: "marseille",
      title: "Football : Ligue 1 | Marseille / Strasbourg",
      description: "",
      sport: "football",
      competition: "Ligue 1",
      participants: "Marseille | Strasbourg",
      contentCategory: "Sport différé",
      isLive: "unknown",
      liveStatus: "unknown",
      titleQuality: "clear",
      confidence: "high",
      score: 100,
      selectionReasons: [],
      broadcasts: [
        broadcast("live", "2026-08-21T17:45:00.000Z", "19:45–23:15"),
        broadcast("replay", "2026-08-21T21:15:00.000Z", "23:15–01:05")
      ]
    }]
  };
}

function broadcast(sourceId: string, startAtUtc: string, timeRangeLabel: string) {
  return {
    sourceId,
    channel: "Ligue 1+",
    channelSourceId: "Ligue1Plus.fr",
    startAtUtc,
    stopAtUtc: new Date(Date.parse(startAtUtc) + 120 * 60_000).toISOString(),
    startAtLocal: timeRangeLabel.slice(0, 5),
    timeLabel: timeRangeLabel.slice(0, 5),
    endTimeLabel: timeRangeLabel.slice(-5),
    timeRangeLabel,
    subTitle: "",
    isPreviouslyShown: false,
    liveStatus: "unknown" as const,
    liveEvidence: "aucune preuve suffisante"
  };
}
