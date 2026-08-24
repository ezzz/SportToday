import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { config, isXmltvSource } from "./config.js";
import { loadEventCatalogue } from "./events/catalogue.js";
import { buildDayReport, writeDayReport } from "./reports/day-filter.js";
import { buildPoc3SportsDbReport, writePoc3SportsDbReport } from "./reports/poc3-sportsdb.js";
import { buildPoc4EventReport, writePoc4EventReport } from "./reports/poc4-events.js";
import { writeReport } from "./reports/report.js";
import { buildTonightReport, writeTonightReport, type TonightReport } from "./reports/tonight.js";
import { writeValidationCsv } from "./reports/validation-csv.js";
import { XmltvFrSource } from "./sources/xmltvfr.js";
import { XmltvFreeSource } from "./sources/xmltvfree.js";
import type { XmltvSource } from "./sources/xmltv.js";
import { TheSportsDbSource } from "./sources/thesportsdb.js";
import { parseSportsDbEvents } from "./sportsdb/events.js";
import { storeSnapshot } from "./storage/snapshot-store.js";
import { importXmltv, initializeDatabase, openDatabase } from "./storage/sqlite.js";
import { startValidationServer } from "./validation/server.js";

const command = process.argv[2] ?? "help";
const requestedSources = sourceArguments();

if (command === "fetch") {
  await fetchSources(requestedSources);
} else if (command === "report") {
  console.log("Les rapports sont générés pendant xmltv:fetch dans ce premier squelette.");
} else if (command === "day") {
  await reportDay();
} else if (command === "export-csv") {
  await exportValidationCsv();
} else if (command === "tonight") {
  await reportTonight();
} else if (command === "validation-web") {
  await serveValidation();
} else if (command === "sportsdb:fetch") {
  await fetchSportsDb();
} else if (command === "sportsdb:poc3") {
  await reportPoc3SportsDb();
} else if (command === "poc4:report") {
  await reportPoc4(false);
} else if (command === "poc4:web") {
  await reportPoc4(true);
} else {
  printHelp();
}

async function reportPoc4(serve: boolean): Promise<void> {
  const source = xmltvSourceArgument();
  const date = argumentValue("--date") ?? todayInTimeZone(config.timeZone);
  const limit = numericArgument("--limit", 10);
  const port = numericArgument("--port", 4173);
  const host = argumentValue("--host") ?? "127.0.0.1";
  const database = openDatabase(config.sqlitePath);
  try {
    const dates = serve ? [date, nextDate(date), nextDate(nextDate(date))] : [date];
    const bundles = Object.fromEntries(await Promise.all(dates.map(async (selectedDate) => {
      const bundle = await buildPoc4Bundle(database, source, selectedDate, limit);
      await writePoc4EventReport(config.reportsRoot, bundle.report);
      return [selectedDate, bundle] as const;
    })));
    const bundle = bundles[date];
    if (!bundle) throw new Error(`Rapport POC-4 introuvable pour ${date}.`);
    const { report, programmeReport } = bundle;
    const filePath = path.join(config.reportsRoot, `poc4-events-${source}-${date}.json`);
    console.log(`POC-4.1 événements — ${source} ${date}`);
    console.log(`  catalogue: ${report.catalogueEventCount} (${report.footballEventCount} football, ${report.f1EventCount} F1)`);
    console.log(`  diffusions retrouvées: ${report.matchedEventCount}`);
    console.log(`  sans diffusion XMLTV: ${report.unmatchedEventCount}`);
    for (const error of report.eventSourceErrors ?? []) console.log(`  source indisponible: ${error}`);
    console.log(`  report: ${filePath}`);
    for (const item of report.items.slice(0, limit)) {
      const channels = item.broadcasts.map((broadcast) => `${broadcast.channel} ${broadcast.timeRangeLabel}`).join(" | ");
      console.log(`  [${item.eventImportance}] ${item.eventTimeLabel} ${item.title} → ${channels || "diffusion non retrouvée"}`);
    }
    if (serve) {
      const server = await startValidationServer({
        report,
        programmeReport,
        reportsRoot: config.reportsRoot,
        reportsByDate: bundles,
        host,
        port
      });
      console.log(`Validation POC-4.1 disponible sur ${server.url}`);
      console.log(`  dates disponibles: ${dates.join(", ")}`);
      console.log(`  validations: ${server.validationFile}`);
      console.log("  Ctrl+C pour arrêter le serveur.");
    }
  } finally {
    database.close();
  }
}

interface Poc4Bundle {
  report: TonightReport;
  programmeReport: TonightReport;
}

async function buildPoc4Bundle(
  database: ReturnType<typeof openDatabase>,
  source: "xmltvfr" | "xmltvfree",
  date: string,
  limit: number
): Promise<Poc4Bundle> {
  const day = buildDayReport(database, source, date, config.timeZone);
  const followingDay = buildDayReport(database, source, nextDate(date), config.timeZone);
  const programmeReport = buildTonightReport(day, followingDay, Math.max(12, limit));
  const catalogue = await loadEventCatalogue(date, {
    dataRoot: config.dataRoot,
    timeZone: config.timeZone,
    refresh: hasFlag("--refresh-events")
  });
  const report = buildPoc4EventReport(catalogue.events, day, followingDay, limit);
  report.eventSourceErrors = catalogue.sourceErrors;
  return { report, programmeReport };
}

async function reportPoc3SportsDb(): Promise<void> {
  const source = xmltvSourceArgument();
  const date = argumentValue("--date") ?? todayInTimeZone(config.timeZone);
  const limit = numericArgument("--limit", 12);
  const database = openDatabase(config.sqlitePath);
  try {
    const tonight = buildTonightReport(
      buildDayReport(database, source, date, config.timeZone),
      buildDayReport(database, source, nextDate(date), config.timeZone),
      limit
    );
    const report = await buildPoc3SportsDbReport(tonight, new TheSportsDbSource(), limit);
    const filePath = await writePoc3SportsDbReport(config.reportsRoot, report);
    console.log(`POC-3 TheSportsDB ciblé — ${source} ${date}`);
    console.log(`  événements testés: ${report.targetCount}`);
    console.log(`  correspondances: ${report.matchedCount} (${report.highConfidenceCount} fortes, ${report.mediumConfidenceCount} moyennes)`);
    console.log(`  directs probables: ${report.probableLiveBroadcastCount}`);
    console.log(`  différés probables: ${report.probableDelayedBroadcastCount}`);
    console.log(`  événements avec diffuseur français retourné: ${report.frenchTvChannelMatchCount}`);
    console.log(`  report: ${filePath}`);
    for (const item of report.items) {
      console.log(`  ${item.match ? "MATCH" : "-----"}  ${item.participants}  →  ${item.match?.name ?? "aucune correspondance"}`);
      for (const broadcast of item.broadcasts) {
        console.log(`         ${broadcast.timeRangeLabel} ${broadcast.channel}  ${broadcast.suggestion}  delta=${broadcast.timeDeltaMinutes ?? "?"} min`);
      }
    }
  } finally {
    database.close();
  }
}

async function reportTonight(): Promise<void> {
  const source = xmltvSourceArgument();
  const date = argumentValue("--date") ?? todayInTimeZone(config.timeZone);
  const limit = numericArgument("--limit", 12);
  const database = openDatabase(config.sqlitePath);
  try {
    const report = buildTonightReport(
      buildDayReport(database, source, date, config.timeZone),
      buildDayReport(database, source, nextDate(date), config.timeZone),
      limit
    );
    const filePath = await writeTonightReport(config.reportsRoot, report);
    console.log(`${source} ${date} — sélection de la journée`);
    console.log(`  fenêtre: ${report.windowStartUtc} → ${report.windowEndUtc}`);
    console.log(`  candidats: ${report.candidateCount}`);
    console.log(`  programmes en quarantaine: ${report.quarantinedProgrammeCount}`);
    console.log(`  événements indexés: ${report.selectedCount}`);
    console.log(`  maximum par vue filtrée: ${report.limit}`);
    console.log(`  report: ${filePath}`);
    for (const item of report.items) {
      const broadcast = item.broadcasts[0];
      console.log(`  ${broadcast?.timeRangeLabel ?? "--:--"}  ${broadcast?.channel ?? ""}  [${item.sport}]  ${item.title}  ${item.liveStatus}  score=${item.score}`);
    }
  } finally {
    database.close();
  }
}

async function serveValidation(): Promise<void> {
  const source = xmltvSourceArgument();
  const date = argumentValue("--date") ?? todayInTimeZone(config.timeZone);
  const limit = numericArgument("--limit", 12);
  const port = numericArgument("--port", 4173);
  const database = openDatabase(config.sqlitePath);
  try {
    const report = buildTonightReport(
      buildDayReport(database, source, date, config.timeZone),
      buildDayReport(database, source, nextDate(date), config.timeZone),
      limit
    );
    const reportPath = await writeTonightReport(config.reportsRoot, report);
    const server = await startValidationServer({ report, reportsRoot: config.reportsRoot, port });
    console.log(`Validation SportToday disponible sur ${server.url}`);
    console.log(`  sélection: ${reportPath}`);
    console.log(`  validations: ${server.validationFile}`);
    console.log("  Ctrl+C pour arrêter le serveur.");
  } finally {
    database.close();
  }
}

async function fetchSportsDb(): Promise<void> {
  const date = argumentValue("--date") ?? new Date().toISOString().slice(0, 10);
  const payload = await new TheSportsDbSource().eventsForDay(date);
  const events = parseSportsDbEvents(payload);
  const directory = path.join(config.dataRoot, "raw", "thesportsdb");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${date}.json`);
  await writeFile(filePath, `${JSON.stringify({ fetchedAt: new Date().toISOString(), date, payload }, null, 2)}\n`, "utf8");
  console.log(`thesportsdb: ${filePath}`);
  console.log(`  événements: ${events.length}`);
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

async function exportValidationCsv(): Promise<void> {
  const source = argumentValue("--source") ?? "xmltvfr";
  const date = argumentValue("--date") ?? new Date().toISOString().slice(0, 10);
  if (!isXmltvSource(source)) {
    throw new Error(`Source invalide: ${source}. Utilisez xmltvfr ou xmltvfree.`);
  }

  const sportLimit = numericArgument("--sports-limit", 100);
  const nonSportLimit = numericArgument("--non-sports-limit", 50);
  const database = openDatabase(config.sqlitePath);
  try {
    const report = buildDayReport(database, source, date, config.timeZone);
    const sportsDbEvents = hasFlag("--with-sportsdb")
      ? await fetchSportsDbEvents(date, report.sports.map((item) => item.sport))
      : [];
    const exported = await writeValidationCsv(config.reportsRoot, report, sportLimit, nonSportLimit, sportsDbEvents);
    console.log(`CSV: ${exported.path}`);
    console.log(`  candidats sportifs: ${exported.sportCount}`);
    console.log(`  non-candidats: ${exported.nonSportCount}`);
    console.log(`  événements TheSportsDB: ${sportsDbEvents.length}`);
  } finally {
    database.close();
  }
}

async function fetchSportsDbEvents(date: string, signals: string[] = []) {
  const sports = [...new Set(signals.map((signal) => sportsDbName(signal)).filter(Boolean))];
  const payload = await new TheSportsDbSource().eventsForDay(date);
  const payloads = [payload];
  for (const sport of sports) {
    payloads.push(await new TheSportsDbSource().eventsForDay(date, undefined, sport));
  }
  const events = [...new Map(payloads.flatMap(parseSportsDbEvents).map((event) => [event.id, event])).values()];
  const directory = path.join(config.dataRoot, "raw", "thesportsdb");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${date}.json`);
  await writeFile(filePath, `${JSON.stringify({ fetchedAt: new Date().toISOString(), date, sports, payloads }, null, 2)}\n`, "utf8");
  return events;
}

function sportsDbName(signal: string): string {
  const names: Record<string, string> = {
    football: "Soccer",
    tennis: "Tennis",
    rugby: "Rugby",
    cyclisme: "Cycling",
    f1: "Motorsport",
    motogp: "Motorsport",
    basket: "Basketball",
    athlétisme: "Athletics",
    golf: "Golf",
    ski: "Skiing",
    biathlon: "Biathlon",
    handball: "Handball",
    volley: "Volleyball",
    judo: "Judo",
    boxe: "Boxing",
    natation: "Swimming"
  };
  return names[signal] ?? "";
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

function xmltvSourceArgument(): "xmltvfr" | "xmltvfree" {
  const source = argumentValue("--source") ?? "xmltvfr";
  if (!isXmltvSource(source)) throw new Error(`Source invalide: ${source}. Utilisez xmltvfr ou xmltvfree.`);
  return source;
}

function sourceArguments(): string[] {
  const argument = process.argv.find((value) => value.startsWith("--source="));
  return argument ? argument.slice("--source=".length).split(",").filter(Boolean) : ["xmltvfr", "xmltvfree"];
}

function argumentValue(name: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

function numericArgument(name: string, fallback: number): number {
  const value = Number(argumentValue(name));
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function nextDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function todayInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function printHelp(): void {
  console.log(`SportToday ingestion POC

Usage:
  npm run xmltv:fetch
  npm run xmltv:fetch -- --source=xmltvfr
  npm run xmltv:fetch -- --source=xmltvfr,xmltvfree
  npm run xmltv:day -- --source=xmltvfr --date=YYYY-MM-DD
  npm run xmltv:tonight -- --source=xmltvfr [--date=YYYY-MM-DD] --limit=12
  npm run xmltv:export-csv -- --source=xmltvfr --date=YYYY-MM-DD
  npm run xmltv:export-csv -- --source=xmltvfr --date=YYYY-MM-DD --with-sportsdb
  npm run validation:web -- --source=xmltvfr [--date=YYYY-MM-DD] --limit=12 --port=4173
  npm run sportsdb:fetch -- --date=YYYY-MM-DD
  npm run sportsdb:poc3 -- --source=xmltvfr --date=YYYY-MM-DD --limit=12
  npm run poc4:report -- --source=xmltvfr [--date=YYYY-MM-DD] --limit=10 [--refresh-events]
  npm run poc4:web -- --source=xmltvfr [--date=YYYY-MM-DD] --limit=10 --port=4173 [--host=0.0.0.0] [--refresh-events]
`);
}
