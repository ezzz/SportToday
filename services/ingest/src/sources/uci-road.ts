import type { SportEvent } from "../events/model.js";

export const uciRoadCalendarUrl = "https://www.uci.org/pressrelease/the-uci-approves-the-2026-calendars-for-the-uci-womens-worldtour-and-uci/4Eom6DCpjNwy5BeppuLXg3";

const grandTourSources = {
  "Tour de France": "https://www.letour.fr/fr/overall-route",
  "Giro d'Italia": "https://www.giroditalia.it/en/info/",
  "La Vuelta": "https://www.lavuelta.es/en/overall-route"
} as const;

/**
 * Dates published by the UCI for the 2026 WorldTour and Women's WorldTour.
 * The official public calendar does not expose a stable unauthenticated feed
 * with stage-level times, therefore this intentionally contains only one-day
 * races and never fabricates a start or finish time.
 */
const oneDayRaces: ReadonlyArray<{ date: string; competition: string; women?: boolean }> = [
  { date: "2026-02-28", competition: "Omloop Nieuwsblad" },
  { date: "2026-02-28", competition: "Omloop Nieuwsblad", women: true },
  { date: "2026-03-07", competition: "Strade Bianche" },
  { date: "2026-03-07", competition: "Strade Bianche Donne", women: true },
  { date: "2026-03-15", competition: "Trofeo Alfredo Binda - Comune di Cittiglio", women: true },
  { date: "2026-03-21", competition: "Milano-Sanremo" },
  { date: "2026-03-21", competition: "Milano-Sanremo Donne", women: true },
  { date: "2026-03-25", competition: "The Great Sprint Classic" },
  { date: "2026-03-26", competition: "The Great Sprint Classic", women: true },
  { date: "2026-03-27", competition: "E3 Saxo Classic" },
  { date: "2026-03-29", competition: "Gent-Wevelgem in Flanders Fields" },
  { date: "2026-03-29", competition: "Gent-Wevelgem in Flanders Fields", women: true },
  { date: "2026-04-01", competition: "Dwars door Vlaanderen" },
  { date: "2026-04-01", competition: "Dwars door Vlaanderen", women: true },
  { date: "2026-04-05", competition: "Ronde van Vlaanderen" },
  { date: "2026-04-05", competition: "Ronde van Vlaanderen", women: true },
  { date: "2026-04-12", competition: "Paris-Roubaix" },
  { date: "2026-04-12", competition: "Paris-Roubaix Femmes avec Zwift", women: true },
  { date: "2026-04-19", competition: "Amstel Gold Race" },
  { date: "2026-04-19", competition: "Amstel Gold Race Ladies Edition", women: true },
  { date: "2026-04-22", competition: "La Flèche Wallonne" },
  { date: "2026-04-22", competition: "La Flèche Wallonne Féminine", women: true },
  { date: "2026-04-26", competition: "Liège-Bastogne-Liège" },
  { date: "2026-04-26", competition: "Liège-Bastogne-Liège Femmes", women: true },
  { date: "2026-05-01", competition: "Eschborn-Frankfurt" },
  { date: "2026-06-20", competition: "Copenhagen Sprint", women: true },
  { date: "2026-06-21", competition: "Copenhagen Sprint" },
  { date: "2026-08-01", competition: "DSSK - Donostia San Sebastián Klasikoa" },
  { date: "2026-08-16", competition: "ADAC Cyclassics" },
  { date: "2026-08-29", competition: "Classic Lorient Agglomération - CERATIZIT", women: true },
  { date: "2026-08-30", competition: "Bretagne Classic - Ouest-France" },
  { date: "2026-09-11", competition: "Grand Prix Cycliste de Québec" },
  { date: "2026-09-13", competition: "Grand Prix Cycliste de Montréal" },
  { date: "2026-10-10", competition: "Il Lombardia" },
  { date: "2026-10-18", competition: "Tour of Guangxi", women: true }
];

/**
 * Published race days only: rest days are deliberately omitted. Keeping the
 * stage number independent from TV listings lets the coverage report detect a
 * missing Grand Tour broadcast instead of discovering the race from XMLTV.
 */
const grandTourRaceDays: ReadonlyArray<{ competition: keyof typeof grandTourSources; dates: readonly string[] }> = [
  {
    competition: "Giro d'Italia",
    dates: [
      "2026-05-08", "2026-05-09", "2026-05-10", "2026-05-12", "2026-05-13", "2026-05-14", "2026-05-15",
      "2026-05-16", "2026-05-17", "2026-05-19", "2026-05-20", "2026-05-21", "2026-05-22", "2026-05-23",
      "2026-05-24", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31"
    ]
  },
  {
    competition: "Tour de France",
    dates: [
      "2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10",
      "2026-07-11", "2026-07-12", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18",
      "2026-07-19", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"
    ]
  },
  {
    competition: "La Vuelta",
    dates: [
      "2026-08-22", "2026-08-23", "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28",
      "2026-08-29", "2026-08-30", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
      "2026-09-06", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"
    ]
  }
];

export function uciRoadEvents(date: string): SportEvent[] {
  const oneDayEvents = oneDayRaces.filter((race) => race.date === date).map((race): SportEvent => ({
    id: `uci-road:${race.date}:${slug(race.competition)}:${race.women ? "women" : "men"}`,
    source: "uci-road",
    sourceEventId: `${race.date}:${slug(race.competition)}:${race.women ? "women" : "men"}`,
    sport: "cyclisme",
    title: "Course",
    competition: race.competition,
    stage: race.women ? "Femmes · horaire sportif non publié" : "Hommes · horaire sportif non publié",
    participants: [],
    // Midday UTC is an internal day anchor only. timeConfidence prevents it
    // from being displayed as a sporting hour or used to infer live status.
    startAtUtc: `${date}T12:00:00.000Z`,
    timeConfidence: "estimated",
    status: "scheduled",
    importance: "A",
    priorityScore: race.women ? 83 : 88,
    priorityReasons: [`Calendrier UCI WorldTour 2026 publié : ${uciRoadCalendarUrl}`, "Horaire sportif non publié dans la source retenue"]
  }));
  const stageEvents = grandTourRaceDays.flatMap((race): SportEvent[] => {
    const stageIndex = race.dates.indexOf(date);
    if (stageIndex < 0) return [];
    const stageNumber = stageIndex + 1;
    const stageLabel = stageNumber === 1 ? "1re étape" : `${stageNumber}e étape`;
    const competitionSlug = slug(race.competition);
    return [{
      id: `uci-road:${date}:${competitionSlug}:stage-${stageNumber}`,
      source: "uci-road",
      sourceEventId: `${date}:${competitionSlug}:stage-${stageNumber}`,
      sport: "cyclisme",
      title: stageLabel,
      competition: race.competition,
      stage: stageLabel,
      participants: [],
      // Internal day anchor only; the first credible TV slot is shown in the UI.
      startAtUtc: `${date}T12:00:00.000Z`,
      timeConfidence: "estimated",
      status: "scheduled",
      importance: "A",
      priorityScore: race.competition === "Tour de France" ? 100 : 94,
      priorityReasons: [
        `Parcours officiel 2026 publié : ${grandTourSources[race.competition]}`,
        `Journée de course confirmée : ${stageLabel}`,
        "Horaire sportif non publié dans le catalogue"
      ]
    }];
  });
  return [...oneDayEvents, ...stageEvents];
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
