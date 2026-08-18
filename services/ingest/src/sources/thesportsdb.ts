import { config } from "../config.js";

/**
 * TheSportsDB enriches sport events; it is not an EPG replacement.
 * The raw adapter stays small; parsing and conservative matching live in the
 * sportsdb/events and reports/sportsdb-match modules.
 */
export class TheSportsDbSource {
  readonly id = "thesportsdb" as const;

  async eventsForDay(date: string, league?: string, sport?: string): Promise<unknown> {
    const endpoint = new URL(`${config.thesportsdb.baseUrl}/${config.thesportsdb.apiKey}/eventsday.php`);
    endpoint.searchParams.set("d", date);
    if (league) endpoint.searchParams.set("l", league);
    if (sport) endpoint.searchParams.set("s", sport);

    const response = await fetch(endpoint, {
      headers: { "user-agent": "SportToday-data-poc/0.1" }
    });
    if (!response.ok) {
      throw new Error(`thesportsdb: HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}
