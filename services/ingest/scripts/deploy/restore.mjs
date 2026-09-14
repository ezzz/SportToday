import { cp, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const argumentsList = process.argv.slice(2);
const fromIndex = argumentsList.indexOf("--from");
const source = fromIndex >= 0 ? argumentsList[fromIndex + 1] : undefined;
if (!source || !argumentsList.includes("--confirm")) {
  throw new Error("Usage: node restore.mjs --from /app/backups/sporttoday-YYYYMMDDhhmmss --confirm");
}

const dataDir = process.env.INGEST_DATA_DIR ?? "/app/data";
const reportsDir = process.env.REPORTS_DIR ?? "/app/reports";
const sourceDatabase = path.join(source, "sporttoday.sqlite");
if (!existsSync(sourceDatabase)) throw new Error(`Base absente de la sauvegarde : ${sourceDatabase}`);

await mkdir(dataDir, { recursive: true });
const stamp = `${new Date().toISOString().replace(/[-:TZ.]/gu, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
const currentDatabase = path.join(dataDir, "sporttoday.sqlite");
if (existsSync(currentDatabase)) await rename(currentDatabase, `${currentDatabase}.before-restore-${stamp}`);
await cp(sourceDatabase, currentDatabase);

const sourceReports = path.join(source, "reports");
if (existsSync(reportsDir)) await rename(reportsDir, `${reportsDir}.before-restore-${stamp}`);
await mkdir(reportsDir, { recursive: true });
if (existsSync(sourceReports)) await cp(sourceReports, reportsDir, { recursive: true });
const sourceRaw = path.join(source, "raw");
const currentRaw = path.join(dataDir, "raw");
if (existsSync(currentRaw)) await rename(currentRaw, `${currentRaw}.before-restore-${stamp}`);
if (existsSync(sourceRaw)) await cp(sourceRaw, currentRaw, { recursive: true });

console.log(`Restauration terminée depuis ${source}. Redémarrez le service.`);
