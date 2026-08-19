import type { DayProgramme } from "./day-filter.js";

export type ContentCategory = "Sport Live" | "Sport différé" | "Emission";
export type TriState = "true" | "false" | "unknown";
export type Confidence = "high" | "medium" | "low";

export interface AutoAnnotation {
  contentCategory: ContentCategory;
  isSport: TriState;
  confidence: Confidence;
  reason: string;
  sport: string;
  competition: string;
  participants: string;
  isLive: TriState;
  checkRequired: "true" | "false";
  checkReason: string;
}

export function autoAnnotate(programme: DayProgramme): AutoAnnotation {
  const title = programme.title.toLocaleLowerCase("fr-FR");
  const description = (programme.description ?? "").toLocaleLowerCase("fr-FR");
  const categories = programme.categories.join(" ").toLocaleLowerCase("fr-FR");
  const text = `${title} ${description} ${categories}`;
  const detectedSport = programme.sportSignals[0] ?? "";
  const fiction = /dessin animé|animation|fiction|série|film|jeunesse/.test(categories);
  const promotion = /foot 2 rue|la chaîne officielle|vivez en direct les évènements|la premier league sur canal\+|à bientôt sur|autopromotion|bande annonce|publicité/.test(text);
  const editorial = /résumé|review|magazine|analyse|inside|best of|journal|documentaire|histoires? de|stories|portrait|la vie à|le podium|avant-course|après-course|débrief/.test(title)
    || /retour sur (?:la|le) (?:carrière|saison)|portrait de|documentaire consacré/.test(description);
  const eventPattern = /grand prix|masters?\b|premier league|ligue [1-3]\b|championnat|match|trophée|tour de |tour d['’]|atp\b|wta\b|roland|open d|ufc|combat|finale|demi-finale|quart de finale|cyclassics|arctic race/;

  let isSport: TriState;
  let confidence: Confidence;
  let reason: string;
  if (fiction) {
    isSport = "false";
    confidence = "high";
    reason = "catégorie fiction/animation/jeunesse";
  } else if (promotion) {
    isSport = "false";
    confidence = "high";
    reason = "fiction ou autopromotion";
  } else if (programme.isSportCandidate && editorial) {
    isSport = "true";
    confidence = "medium";
    reason = "programme éditorial sportif";
  } else if (eventPattern.test(text) && programme.isSportCandidate) {
    isSport = "true";
    confidence = "high";
    reason = "événement ou compétition sportive explicite";
  } else if (programme.isSportCandidate && detectedSport) {
    isSport = "unknown";
    confidence = "low";
    reason = "mot-clé sportif sans événement explicite";
  } else {
    isSport = "false";
    confidence = "medium";
    reason = "aucun signal sportif exploitable";
  }

  // A phrase such as "vivez en direct" can belong to an autopromotion. The
  // live/delayed field is only meaningful once the programme is considered
  // sporting; keep it unknown for fiction, promotion and other emissions.
  const isLive = isSport === "false" ? "unknown" : inferLive(text);
  const competition = isSport === "false"
    ? ""
    : extractCompetition(programme.title) || extractCompetition(programme.description ?? "");
  const participants = isSport === "false" ? "" : extractParticipants(programme.title);
  const contentCategory: ContentCategory = isSport === "false"
    ? "Emission"
    : isLive === "true"
      ? "Sport Live"
      : editorial
        ? "Emission"
        : "Sport différé";

  const checks: string[] = [];
  if (isSport === "unknown") checks.push("sport à confirmer");
  if (confidence !== "high") checks.push("classification à confirmer");
  if (isSport === "true" && isLive === "unknown") checks.push("direct ou différé à confirmer");
  if (isSport === "true" && eventPattern.test(text) && !competition) checks.push("compétition à rechercher");
  if (isSport === "true" && eventPattern.test(text) && !participants) checks.push("participants à rechercher");

  return {
    contentCategory,
    isSport,
    confidence,
    reason,
    sport: isSport === "false" ? "" : detectedSport,
    competition,
    participants,
    isLive,
    checkRequired: checks.length > 0 ? "true" : "false",
    checkReason: checks.join("; ")
  };
}

function inferLive(text: string): TriState {
  if (/\b(?:replay|rediffusion|résumé|review|best of|magazine|analyse)\b/.test(text)) return "false";
  if (/\b(?:en direct|direct|live)\b/.test(text)) return "true";
  return "unknown";
}

function extractCompetition(value: string): string {
  const patterns = [
    /\b(?:Premier League|EFL Championship|Ligue [1-3]|Champions League|Europa League|Conference League)\b[^|,.;]*/iu,
    /\b(?:La Vuelta|Vuelta a España)\b/iu,
    /\b(?:Grand Prix|Masters?\s*1000|ATP|WTA|Roland-Garros|Wimbledon|US Open|Open d['’]Australie)\b[^|,.;]*/iu,
    /\b(?:Tour de|Tour d['’]|Championnat (?:de|du)|Coupe (?:de|du)|Trophée (?:de|des))\s+[A-ZÀ-ÖØ-Þ][^|,.;]*/iu
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[0]) return match[0].replace(/\s+/gu, " ").trim().slice(0, 100);
  }
  return "";
}

function extractParticipants(title: string): string {
  // Keep only a simple two-party matchup. A programme can contain several
  // matches in one title; those are deliberately sent to manual review.
  const segment = title.split("|").at(-1)?.trim() ?? title.trim();
  const separators = segment.match(/\s+(?:\/|vs\.?|contre)\s+/giu) ?? [];
  if (separators.length !== 1) return "";
  const match = segment.match(/^(.+?)\s+(?:\/|vs\.?|contre)\s+(.+)$/iu);
  if (!match?.[1] || !match[2]) return "";
  const left = match[1].trim();
  const right = match[2].trim();
  if (left.length > 80 || right.length > 80) return "";
  return `${left} | ${right}`;
}
