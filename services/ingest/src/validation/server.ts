import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { TonightReport } from "../reports/tonight.js";
import type { CoverageReport } from "../reports/coverage.js";
import { validationCsv, validationXlsx } from "./export.js";
import { filteredReport, parseCategoryFilter, parsePeriodFilter, parseSportFilters } from "./filters.js";
import {
  isValidationVerdict,
  loadValidation,
  saveValidation,
  updateItemValidation,
  updateDebugNote,
  updateMissingEventNote,
  validationPath,
  type ValidationFile
} from "./store.js";
import { validationHtml } from "./ui.js";

export interface ValidationServerOptions {
  report: TonightReport;
  programmeReport?: TonightReport;
  coverageReport?: CoverageReport;
  reportsByDate?: Record<string, { report: TonightReport; programmeReport?: TonightReport; coverageReport?: CoverageReport }>;
  reportsRoot: string;
  host?: string;
  port?: number;
  refreshReports?: () => Promise<Record<string, { report: TonightReport; programmeReport?: TonightReport; coverageReport?: CoverageReport }>>;
  refreshIntervalMs?: number;
  rollingDate?: boolean;
  log?: (message: string) => void;
}

export interface ValidationServerHandle {
  url: string;
  validationFile: string;
  close: () => Promise<void>;
}

export async function startValidationServer(options: ValidationServerOptions): Promise<ValidationServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  const reportsByDate: Record<string, { report: TonightReport; programmeReport?: TonightReport; coverageReport?: CoverageReport }> = options.reportsByDate ?? {
    [options.report.date]: {
      report: options.report,
      ...(options.programmeReport ? { programmeReport: options.programmeReport } : {}),
      ...(options.coverageReport ? { coverageReport: options.coverageReport } : {})
    }
  };
  let defaultDate = options.report.date;
  const validations = new Map<string, ValidationFile>();
  const filePaths = new Map<string, string>();
  for (const bundle of Object.values(reportsByDate)) {
    const filePath = validationPath(options.reportsRoot, bundle.report);
    const loaded = await loadValidation(filePath, bundle.report);
    await saveValidation(filePath, loaded);
    validations.set(bundle.report.date, loaded);
    filePaths.set(bundle.report.date, filePath);
  }
  let writeQueue = Promise.resolve();
  let lastRefreshStartedAt: string | undefined;
  let lastRefreshCompletedAt: string | undefined;
  let lastRefreshError: string | undefined;

  const applyRefreshedReports = async (refreshed: Record<string, { report: TonightReport; programmeReport?: TonightReport; coverageReport?: CoverageReport }>): Promise<void> => {
    if (!Object.keys(refreshed).length) throw new Error("Actualisation vide : les rapports précédents sont conservés.");
    const nextValidations = new Map<string, { validation: ValidationFile; filePath: string }>();
    for (const [date, bundle] of Object.entries(refreshed)) {
      const filePath = validationPath(options.reportsRoot, bundle.report);
      const loaded = await loadValidation(filePath, bundle.report);
      await saveValidation(filePath, loaded);
      nextValidations.set(date, { validation: loaded, filePath });
    }
    for (const date of Object.keys(reportsByDate)) {
      if (!(date in refreshed)) delete reportsByDate[date];
    }
    for (const [date, bundle] of Object.entries(refreshed)) {
      reportsByDate[date] = bundle;
      const next = nextValidations.get(date)!;
      validations.set(date, next.validation);
      filePaths.set(date, next.filePath);
    }
    defaultDate = Object.keys(reportsByDate).sort()[0] ?? defaultDate;
  };

  let refreshInFlight: Promise<void> | undefined;
  let lastBusyLogAt = 0;
  const refreshInBackground = (reason: string): Promise<void> => {
    if (!options.refreshReports) return Promise.resolve();
    if (refreshInFlight) {
      const now = Date.now();
      if (now - lastBusyLogAt >= 10 * 60_000) {
        const elapsedMs = lastRefreshStartedAt ? now - Date.parse(lastRefreshStartedAt) : 0;
        options.log?.(`[refresh] reporté (${reason}) : actualisation en cours depuis ${formatRefreshDuration(elapsedMs)}.`);
        lastBusyLogAt = now;
      }
      return refreshInFlight;
    }
    const startedAt = Date.now();
    lastBusyLogAt = 0;
    lastRefreshStartedAt = new Date(startedAt).toISOString();
    options.log?.(`[refresh] démarrage (${reason})`);
    refreshInFlight = (async () => {
      try {
        await applyRefreshedReports(await options.refreshReports!());
        lastRefreshCompletedAt = new Date().toISOString();
        lastRefreshError = undefined;
        options.log?.(`[refresh] terminé en ${Math.round((Date.now() - startedAt) / 1000)} s`);
      } catch (error) {
        lastRefreshError = error instanceof Error ? error.message : String(error);
        options.log?.(`[refresh] échec : ${lastRefreshError}`);
      } finally {
        refreshInFlight = undefined;
      }
    })();
    return refreshInFlight;
  };

  const bundleForDate = (date: string | null | undefined): { report: TonightReport; programmeReport?: TonightReport; coverageReport?: CoverageReport } => {
    const bundle = reportsByDate[date ?? ""] ?? reportsByDate[defaultDate];
    if (!bundle) throw new Error("Date indisponible.");
    return bundle;
  };
  const validationForDate = (date: string): ValidationFile => {
    const validation = validations.get(date);
    if (!validation) throw new Error("Date indisponible.");
    return validation;
  };
  const persist = async (date: string, next: ValidationFile): Promise<ValidationFile> => {
    validations.set(date, next);
    const filePath = filePaths.get(date);
    if (!filePath) throw new Error("Date indisponible.");
    const pendingWrite = writeQueue.then(() => saveValidation(filePath, next));
    // Keep the queue usable after one failed disk write; a transient volume
    // error must not disable all subsequent feedback saves.
    writeQueue = pendingWrite.catch(() => undefined);
    await pendingWrite;
    return next;
  };

  const server = createServer(async (request, response) => {
    try {
      setSecurityHeaders(response);
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
      if (request.method === "GET" && url.pathname === "/") return sendHtml(response, validationHtml());
      if (request.method === "GET" && url.pathname === "/healthz") {
        const current = bundleForDate(defaultDate).report;
        const sourceErrors = current.eventSourceErrors ?? [];
        return sendJson(response, {
          status: lastRefreshError || sourceErrors.length > 0 ? "degraded" : "ok",
          generatedAt: current.generatedAt,
          dataDate: current.date,
          sourceErrors,
          refreshing: Boolean(refreshInFlight),
          lastRefreshStartedAt,
          lastRefreshCompletedAt,
          lastRefreshError,
          availableDates: Object.keys(reportsByDate).sort()
        });
      }
      if (request.method === "GET" && url.pathname === "/api/report") {
        const bundle = bundleForDate(url.searchParams.get("date"));
        const selectedDate = bundle.report.date;
        return sendJson(response, {
          report: bundle.report,
          programmeReport: bundle.programmeReport ?? null,
          coverageReport: bundle.coverageReport ?? null,
          validation: validationForDate(selectedDate),
          availableDates: Object.keys(reportsByDate).sort(),
          weekPreview: weekPreviewItems(reportsByDate, selectedDate)
        });
      }
      if (request.method === "POST" && url.pathname === "/api/validation") {
        const body = await readJson(request);
        const bundle = bundleForDate(stringField(body, "date", false));
        const selectedDate = bundle.report.date;
        const selectedValidation = validationForDate(selectedDate);
        const itemId = stringField(body, "itemId");
        const verdict = body.verdict;
        const note = stringField(body, "note", false);
        if (!bundle.report.items.some((item) => item.id === itemId)) return sendJson(response, { error: "Événement inconnu." }, 404);
        if (!isValidationVerdict(verdict)) return sendJson(response, { error: "Verdict invalide." }, 400);
        return sendJson(response, await persist(selectedDate, updateItemValidation(selectedValidation, itemId, verdict, note)));
      }
      if (request.method === "POST" && url.pathname === "/api/missing-event") {
        const body = await readJson(request);
        const bundle = bundleForDate(stringField(body, "date", false));
        const selectedDate = bundle.report.date;
        return sendJson(response, await persist(selectedDate, updateMissingEventNote(validationForDate(selectedDate), stringField(body, "note", false))));
      }
      if (request.method === "POST" && url.pathname === "/api/debug-note") {
        const body = await readJson(request);
        const bundle = bundleForDate(stringField(body, "date", false));
        const selectedDate = bundle.report.date;
        return sendJson(response, await persist(selectedDate, updateDebugNote(validationForDate(selectedDate), stringField(body, "note", false))));
      }
      if (request.method === "GET" && url.pathname === "/feedback.json") {
        const body = Buffer.from(`${JSON.stringify({
          exportedAt: new Date().toISOString(),
          feedback: await persistedFeedback(options.reportsRoot)
        }, null, 2)}\n`, "utf8");
        return sendDownload(response, body, "sporttoday-feedback.json", "application/json; charset=utf-8");
      }
      if (request.method === "GET" && url.pathname === "/export.csv") {
        const bundle = bundleForDate(url.searchParams.get("date"));
        const report = exportReport(bundle.report, url);
        return sendDownload(response, validationCsv(report, validationForDate(bundle.report.date)), `validation-tonight-${bundle.report.date}.csv`, "text/csv; charset=utf-8");
      }
      if (request.method === "GET" && url.pathname === "/export.xlsx") {
        const bundle = bundleForDate(url.searchParams.get("date"));
        const report = exportReport(bundle.report, url);
        return sendDownload(response, await validationXlsx(report, validationForDate(bundle.report.date)), `validation-tonight-${bundle.report.date}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
      if (request.method === "GET" && url.pathname === "/favicon.ico") {
        response.writeHead(204);
        return response.end();
      }
      return sendJson(response, { error: "Route introuvable." }, 404);
    } catch (error) {
      console.error(error);
      return sendJson(response, { error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const timers: NodeJS.Timeout[] = [];
  if (options.refreshReports && (options.refreshIntervalMs ?? 0) > 0) {
    const intervalMs = options.refreshIntervalMs!;
    const refreshTimer = setInterval(() => { void refreshInBackground("planifié"); }, intervalMs);
    refreshTimer.unref();
    timers.push(refreshTimer);
    options.log?.(`[refresh] planifié toutes les ${formatRefreshInterval(intervalMs)}.`);
    if (options.rollingDate) {
      const dateTimer = setInterval(() => {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: options.report.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        if (defaultDate !== today) void refreshInBackground("changement de journée");
      }, 60_000);
      dateTimer.unref();
      timers.push(dateTimer);
    }
  }
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  return {
    url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${boundPort}`,
    validationFile: filePaths.get(defaultDate)!,
    close: async () => {
      for (const timer of timers) clearInterval(timer);
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}

async function persistedFeedback(reportsRoot: string): Promise<Array<ValidationFile & { file: string }>> {
  const names = (await readdir(reportsRoot))
    .filter((name) => /^validation-.*\.json$/u.test(name))
    .sort();
  const entries = await Promise.all(names.map(async (name) => {
    try {
      const parsed = JSON.parse(await readFile(path.join(reportsRoot, name), "utf8")) as Partial<ValidationFile>;
      if (typeof parsed.date !== "string" || typeof parsed.source !== "string" || !parsed.items || typeof parsed.items !== "object") return null;
      return { ...parsed, file: name } as ValidationFile & { file: string };
    } catch {
      return null;
    }
  }));
  return entries.filter((entry): entry is ValidationFile & { file: string } => entry !== null)
    .sort((left, right) => left.date.localeCompare(right.date) || left.file.localeCompare(right.file));
}

function weekPreviewItems(
  reportsByDate: Record<string, { report: TonightReport }>,
  selectedDate: string
) {
  return Object.entries(reportsByDate)
    .filter(([date, bundle]) => date > selectedDate && bundle.report.viewMode === "event-first")
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([date, bundle]) => bundle.report.items.map((item) => ({
      date,
      id: item.id,
      title: item.title,
      sport: item.sport,
      competition: item.competition,
      score: item.score,
      broadcasts: item.broadcasts,
      eventStartAtUtc: item.eventStartAtUtc,
      eventEndAtUtc: item.eventEndAtUtc,
      eventTimeLabel: item.eventTimeLabel,
      eventStatus: item.eventStatus,
      eventStage: item.eventStage,
      eventImportance: item.eventImportance
    })));
}

function formatRefreshInterval(intervalMs: number): string {
  const hours = intervalMs / 3_600_000;
  return Number.isInteger(hours) ? `${hours} h` : `${Math.round(intervalMs / 60_000)} min`;
}

function formatRefreshDuration(durationMs: number): string {
  if (durationMs < 60_000) return `${Math.max(1, Math.round(durationMs / 1_000))} s`;
  return `${Math.round(durationMs / 60_000)} min`;
}

function exportReport(report: TonightReport, url: URL): TonightReport {
  return filteredReport(
    report,
    parseCategoryFilter(url.searchParams.get("category")),
    parsePeriodFilter(url.searchParams.get("period")),
    parseSportFilters(url.searchParams.get("sports"))
  );
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 100_000) throw new Error("Corps de requête trop volumineux.");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON invalide.");
  return parsed as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, name: string, required = true): string {
  const value = body[name];
  if (typeof value === "string") return value;
  if (!required && value === undefined) return "";
  throw new Error(`Champ ${name} invalide.`);
}

function sendHtml(response: ServerResponse, body: string): void {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(body);
}

function sendJson(response: ServerResponse, body: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendDownload(response: ServerResponse, body: Buffer, filename: string, contentType: string): void {
  response.writeHead(200, {
    "content-type": contentType,
    "content-length": String(body.length),
    "content-disposition": `attachment; filename="${filename}"`
  });
  response.end(body);
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("content-security-policy", "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'");
}
