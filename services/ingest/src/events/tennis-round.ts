/** A French, comparable representation of a tennis draw round. */
export interface TennisRoundInfo {
  label: string;
  rank: number;
}

/**
 * ESPN uses labels such as `Round 4` while XMLTV/API-Tennis may use French or
 * English names. Keep the raw value separately, but expose a stable French
 * label and an ordering so a grouped ATP/WTA card can show its most advanced
 * round and annotate only matches that lag behind it.
 */
export function tennisRoundInfo(rawValue: string, tournament = ""): TennisRoundInfo | undefined {
  const raw = rawValue.trim();
  if (!raw) return undefined;
  const value = fold(raw);
  const competition = fold(tournament);
  const qualifying = /\bqualif(?:ying|ication|ications)\b/u.test(value);
  const main = value.replace(/\bqualif(?:ying|ication|ications)\b/gu, "").replace(/\s+/gu, " ").trim();
  const prefix = qualifying ? "Qualifications · " : "";
  const offset = qualifying ? -10 : 0;

  if (/\b(final|finale)\b/u.test(main) && !/semi|demi/u.test(main)) {
    return { label: `${prefix}Finale`, rank: offset + 7 };
  }
  if (/semi|demi/u.test(main)) return { label: `${prefix}Demi-finale`, rank: offset + 6 };
  if (/quarter|quart/u.test(main)) return { label: `${prefix}Quart de finale`, rank: offset + 5 };
  if (/round\s+of\s+16|last\s+16|huitieme|1\/8/u.test(main)) {
    return { label: `${prefix}1/8e de finale`, rank: offset + 4 };
  }

  const numbered = main.match(/(?:round|tour)\s*(?:number\s*)?(\d+)|^(\d+)(?:st|nd|rd|th)?\s+round$/u);
  const roundNumber = Number(numbered?.[1] ?? numbered?.[2]);
  if (Number.isInteger(roundNumber) && roundNumber > 0 && roundNumber < 10) {
    // At a Grand Slam ESPN's Round 4 is the last-16 stage. For other draws,
    // retain the neutral “4e tour” wording rather than assuming a draw size.
    if (!qualifying && roundNumber === 4 && /australian open|roland garros|french open|wimbledon|us open/u.test(competition)) {
      return { label: "1/8e de finale", rank: 4 };
    }
    return { label: `${roundNumber === 1 ? "1er" : `${roundNumber}e`} tour`, rank: offset + roundNumber };
  }
  return undefined;
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("fr-FR");
}
