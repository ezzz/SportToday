import type { SportEvent } from "../events/model.js";

export const ultimateScheduleUrl = "https://worldathletics.org/en/competitions/world-athletics-ultimate-championship/2026/news/press-releases/ultimate-championship-session-schedule-300-days-to-go";

/** Reviewed official session schedule, not an automatically refreshed feed. */
export function ultimateAthleticsEvents(date: string): SportEvent[] {
  const sessions: Record<string, { start: string; end: string; detail: string }> = {
    "2026-09-11": { start: "19:00", end: "22:00", detail: "Notamment : relais mixte 4 × 100 m, hauteur femmes, perche hommes, 5 000 m hommes et haies hautes." },
    "2026-09-12": { start: "18:00", end: "21:00", detail: "Notamment : 100 m femmes et hommes, 800 m femmes, 1 500 m femmes et perche femmes." },
    "2026-09-13": { start: "18:00", end: "21:00", detail: "Notamment : 200 m femmes et hommes, 800 m hommes, 1 500 m hommes et relais mixte 4 × 400 m." }
  };
  const session = sessions[date];
  if (!session) return [];
  return [{ id: `world-athletics:ultimate:2026:${date}`, source: "world-athletics",
    sourceEventId: `ultimate:2026:${date}`, sport: "athletics", competition: "Ultimate Championship",
    title: `Budapest — Session ${Number(date.slice(-2)) - 10}`, stage: session.detail,
    participants: [], startAtUtc: new Date(`${date}T${session.start}:00+02:00`).toISOString(),
    endAtUtc: new Date(`${date}T${session.end}:00+02:00`).toISOString(), timeConfidence: "confirmed",
    status: "scheduled", importance: "A", priorityScore: 96,
    priorityReasons: [`Calendrier officiel vérifié le 7 septembre 2026, sous réserve de modification : ${ultimateScheduleUrl}`]
  }];
}
