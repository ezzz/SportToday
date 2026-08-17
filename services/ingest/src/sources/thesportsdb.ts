import { config } from "../config.js";

/**
 * TheSportsDB enriches sport events; it is not an EPG replacement.
 * This adapter is intentionally small until the XMLTV event matching rules
 * and the required API tier are validated.
 */
export class TheSportsDbSource {
  readonly id = "thesportsdb" as const;

  async eventsForDay(date: string, league?: string): Promise<unknown> {
    const endpoint = new URL(`${config.thesportsdb.baseUrl}/${config.thesportsdb.apiKey}/eventsday.php`);
    endpoint.searchParams.set("d", date);
    if (league) endpoint.searchParams.set("l", league);

    const response = await fetch(endpoint, {
      headers: { "user-agent": "SportToday-data-poc/0.1" }
    });
    if (!response.ok) {
      throw new Error(`thesportsdb: HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}
