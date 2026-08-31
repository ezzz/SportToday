import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { TonightReport } from "../reports/tonight.js";
import type { CoverageReport } from "../reports/coverage.js";
import { validationCsv, validationXlsx } from "./export.js";
import { filteredReport, parseCategoryFilter, parsePeriodFilter, parseSportFilters } from "./filters.js";
import {
  isValidationVerdict,
  loadValidation,
  saveValidation,
  updateItemValidation,
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
}

export async function startValidationServer(options: ValidationServerOptions): Promise<{ url: string; validationFile: string }> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  const reportsByDate: Record<string, { report: TonightReport; programmeReport?: TonightReport; coverageReport?: CoverageReport }> = options.reportsByDate ?? {
    [options.report.date]: {
      report: options.report,
      ...(options.programmeReport ? { programmeReport: options.programmeReport } : {}),
      ...(options.coverageReport ? { coverageReport: options.coverageReport } : {})
    }
  };
  const defaultDate = options.report.date;
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
    writeQueue = writeQueue.then(() => saveValidation(filePath, next));
    await writeQueue;
    return next;
  };

  const server = createServer(async (request, response) => {
    try {
      setSecurityHeaders(response);
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
      if (request.method === "GET" && url.pathname === "/") return sendHtml(response, validationHtml());
      if (request.method === "GET" && url.pathname === "/api/report") {
        const bundle = bundleForDate(url.searchParams.get("date"));
        const selectedDate = bundle.report.date;
        return sendJson(response, {
          report: bundle.report,
          programmeReport: bundle.programmeReport ?? null,
          coverageReport: bundle.coverageReport ?? null,
          validation: validationForDate(selectedDate),
          validationFile: filePaths.get(selectedDate),
          availableDates: Object.keys(reportsByDate).sort()
        });
      }
      if (request.method === "POST" && url.pathname === "/api/refresh") {
        if (!options.refreshReports) return sendJson(response, { refreshed: false, availableDates: Object.keys(reportsByDate).sort() });
        const refreshed = await options.refreshReports();
        for (const [date, bundle] of Object.entries(refreshed)) {
          reportsByDate[date] = bundle;
          const filePath = validationPath(options.reportsRoot, bundle.report);
          const loaded = await loadValidation(filePath, bundle.report);
          await saveValidation(filePath, loaded);
          validations.set(date, loaded);
          filePaths.set(date, filePath);
        }
        return sendJson(response, { refreshed: true, availableDates: Object.keys(reportsByDate).sort() });
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
  return { url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`, validationFile: filePaths.get(defaultDate)! };
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
