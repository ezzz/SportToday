import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { TonightReport } from "../reports/tonight.js";
import { validationCsv, validationXlsx } from "./export.js";
import { filteredReport, parseCategoryFilter, parsePeriodFilter } from "./filters.js";
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
  reportsRoot: string;
  host?: string;
  port?: number;
}

export async function startValidationServer(options: ValidationServerOptions): Promise<{ url: string; validationFile: string }> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  const filePath = validationPath(options.reportsRoot, options.report);
  let validation = await loadValidation(filePath, options.report);
  await saveValidation(filePath, validation);
  let writeQueue = Promise.resolve();

  const persist = async (next: ValidationFile): Promise<ValidationFile> => {
    validation = next;
    writeQueue = writeQueue.then(() => saveValidation(filePath, validation));
    await writeQueue;
    return validation;
  };

  const server = createServer(async (request, response) => {
    try {
      setSecurityHeaders(response);
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
      if (request.method === "GET" && url.pathname === "/") return sendHtml(response, validationHtml());
      if (request.method === "GET" && url.pathname === "/api/report") {
        return sendJson(response, { report: options.report, validation, validationFile: filePath });
      }
      if (request.method === "POST" && url.pathname === "/api/validation") {
        const body = await readJson(request);
        const itemId = stringField(body, "itemId");
        const verdict = body.verdict;
        const note = stringField(body, "note", false);
        if (!options.report.items.some((item) => item.id === itemId)) return sendJson(response, { error: "Événement inconnu." }, 404);
        if (!isValidationVerdict(verdict)) return sendJson(response, { error: "Verdict invalide." }, 400);
        return sendJson(response, await persist(updateItemValidation(validation, itemId, verdict, note)));
      }
      if (request.method === "POST" && url.pathname === "/api/missing-event") {
        const body = await readJson(request);
        return sendJson(response, await persist(updateMissingEventNote(validation, stringField(body, "note", false))));
      }
      if (request.method === "GET" && url.pathname === "/export.csv") {
        const report = exportReport(options.report, url);
        return sendDownload(response, validationCsv(report, validation), `validation-tonight-${options.report.date}.csv`, "text/csv; charset=utf-8");
      }
      if (request.method === "GET" && url.pathname === "/export.xlsx") {
        const report = exportReport(options.report, url);
        return sendDownload(response, await validationXlsx(report, validation), `validation-tonight-${options.report.date}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
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
  return { url: `http://${host}:${port}`, validationFile: filePath };
}

function exportReport(report: TonightReport, url: URL): TonightReport {
  return filteredReport(
    report,
    parseCategoryFilter(url.searchParams.get("category")),
    parsePeriodFilter(url.searchParams.get("period"))
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
