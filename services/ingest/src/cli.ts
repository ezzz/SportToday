import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { config, isXmltvSource } from "./config.js";
import { buildDayReport, writeDayReport } from "./reports/day-filter.js";
import { writeReport } from "./reports/report.js";
import { XmltvFrSource } from "./sources/xmltvfr.js";
import { XmltvFreeSource } from "./sources/xmltvfree.js";
import type { XmltvSource } from "./sources/xmltv.js";
import { TheSportsDbSource } from "./sources/thesportsdb.js";
import { storeSnapshot } from "./storage/snapshot-store.js";
import { importXmltv, initializeDatabase, openDatabase } from "./storage/sqlite.js";

const command = process.argv[2] ?? "help";
const requestedSources = sourceArguments();

if (command === "fetch") {
  await fetchSources(requestedSources);
} else if (command === "report") {
  console.log("Les rapports sont générés pendant xmltv:fetch dans ce premier squelette.");
} else if (command === "day") {
  await reportDay();
} else if (command === "sportsdb:fetch") {
  await fetchSportsDb();
} else {
  printHelp();
}

async function fetchSportsDb(): Promise<void> {
  const date = argumentValue("--date") ?? new Date().toISOString().slice(0, 10);
  const payload = await new TheSportsDbSource().eventsForDay(date);
  const directory = path.join(config.dataRoot, "raw", "thesportsdb");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${date}.json`);
  await writeFile(filePath, `${JSON.stringify({ fetchedAt: new Date().toISOString(), date, payload }, null, 2)}\n`, "utf8");
  console.log(`thesportsdb: ${filePath}`);
}

async function reportDay(): Promise<void> {
  const source = argumentValue("--source") ?? "xmltvfr";
  const date = argumentValue("--date") ?? new Date().toISOString().slice(0, 10);
  if (!isXmltvSource(source)) {
    throw new Error(`Source invalide: ${source}. Utilisez xmltvfr ou xmltvfree.`);
  }

  const database = openDatabase(config.sqlitePath);
  try {
    const report = buildDayReport(database, source, date, config.timeZone);
    const reportPath = await writeDayReport(config.reportsRoot, report);
    console.log(`${source} ${date} (${config.timeZone})`);
    console.log(`  programmes: ${report.programmeCount}`);
    console.log(`  candidats sport: ${report.sportCandidateCount}`);
    console.log(`  chaînes: ${report.channels.length}`);
    console.log(`  sports: ${report.sports.map((item) => `${item.sport}=${item.programmeCount}`).join(", ")}`);
    console.log(`  report: ${reportPath}`);
    for (const programme of report.programmes.filter((item) => item.isSportCandidate).slice(0, 20)) {
      console.log(`  ${programme.localStartAt}  ${programme.channelName}  [${programme.sportSignals.join(", ")}]  ${programme.title}`);
    }
  } finally {
    database.close();
  }
}

async function fetchSources(sources: string[]): Promise<void> {
  await mkdir(config.dataRoot, { recursive: true });
  const database = await initializeDatabase(config.sqlitePath);
  const sourceObjects = sources
    .filter(isXmltvSource)
    .filter((source) => source !== "xmltvfree" || Boolean(config.xmltv.xmltvfree))
    .map(sourceObject);

  if (sourceObjects.length === 0) {
    console.error("Aucune source XMLTV configurée. Définissez XMLTVFREE_URL ou utilisez --source=xmltvfr.");
    process.exitCode = 1;
    return;
  }

  for (const source of sourceObjects) {
    try {
      const snapshot = await source.fetch();
      const stored = await storeSnapshot(config.dataRoot, snapshot);
      const parsed = await source.parse(snapshot);
      importXmltv(database, source.id, snapshot, stored, parsed);
      const reportPath = await writeReport(config.reportsRoot, source.id, snapshot.fetchedAt, stored, parsed);
      console.log(`${source.id}: ${parsed.channels.length} chaînes, ${parsed.programmes.length} programmes`);
      console.log(`  snapshot: ${stored.path}`);
      console.log(`  report:   ${reportPath}`);
    } catch (error) {
      console.error(`${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
  database.close();
}

function sourceObject(source: "xmltvfr" | "xmltvfree"): XmltvSource {
  return source === "xmltvfr" ? new XmltvFrSource() : new XmltvFreeSource();
}

function sourceArguments(): string[] {
  const argument = process.argv.find((value) => value.startsWith("--source="));
  return argument ? argument.slice("--source=".length).split(",").filter(Boolean) : ["xmltvfr", "xmltvfree"];
}

function argumentValue(name: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

function printHelp(): void {
  console.log(`SportToday ingestion POC

Usage:
  npm run xmltv:fetch
  npm run xmltv:fetch -- --source=xmltvfr
  npm run xmltv:fetch -- --source=xmltvfr,xmltvfree
  npm run xmltv:day -- --source=xmltvfr --date=YYYY-MM-DD
  npm run sportsdb:fetch -- --date=YYYY-MM-DD
`);
}
