import type { SportEvent } from "./model.js";

export interface EventRightsProvider {
  name: string;
  kind: "platform";
  sourceUrl: string;
  evidence: string;
}

export interface EventRightsRule {
  id: string;
  sport: SportEvent["sport"];
  competitionAliases: readonly string[];
  validFrom: string;
  validTo: string;
  providers: readonly EventRightsProvider[];
}

/**
 * Rights are deliberately separate from XMLTV. A streaming platform may own
 * the live rights while exposing no linear channel in the EPG feed.
 */
export const eventRightsRules: readonly EventRightsRule[] = [
  {
    id: "laliga-fr-2026-2029",
    sport: "football",
    competitionAliases: ["la liga", "laliga"],
    validFrom: "2026-08-15",
    validTo: "2029-06-30",
    providers: [
      {
        name: "DAZN",
        kind: "platform",
        sourceUrl: "https://www.dazn.com/fr-FR/help/articles/38260730062621-laliga-2026-2027-sur-dazn-tout-ce-que-vous-devez-savoir",
        evidence: "tous les matchs de LaLiga en direct"
      },
      {
        name: "Disney+",
        kind: "platform",
        sourceUrl: "https://thewaltdisneycompany.eu/news/disney-adds-laliga-to-its-live-sports-offering-in-france/",
        evidence: "les 380 matchs de LaLiga en direct via ESPN"
      }
    ]
  },
  {
    id: "serie-a-fr-2026-2027",
    sport: "football",
    competitionAliases: ["serie a"],
    validFrom: "2026-08-01",
    validTo: "2027-07-31",
    providers: [
      {
        name: "DAZN",
        kind: "platform",
        sourceUrl: "https://www.dazn.com/fr-FR/help/articles/16184063399709-abonnements-prix-et-contenu-de-dazn",
        evidence: "intégralité de la Serie A en exclusivité"
      }
    ]
  }
] as const;

export function rightsForEvent(event: SportEvent): readonly EventRightsProvider[] {
  const eventDate = event.startAtUtc.slice(0, 10);
  const competition = normalize(event.competition);
  const rule = eventRightsRules.find((candidate) => candidate.sport === event.sport
    && eventDate >= candidate.validFrom
    && eventDate <= candidate.validTo
    && candidate.competitionAliases.some((alias) => competition === normalize(alias) || competition.includes(normalize(alias))));
  return rule?.providers ?? [];
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/gu, " ").trim();
}
