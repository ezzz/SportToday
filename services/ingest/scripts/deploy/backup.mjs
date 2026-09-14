import { cp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = process.env.INGEST_DATA_DIR ?? "/app/data";
const reportsDir = process.env.REPORTS_DIR ?? "/app/reports";
const backupDir = process.env.BACKUP_DIR ?? "/app/backups";
const stamp = `${new Date().toISOString().replace(/[-:TZ.]/gu, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
const destination = path.join(backupDir, `sporttoday-${stamp}`);
const databasePath = path.join(dataDir, "sporttoday.sqlite");

await mkdir(destination, { recursive: true });
const backupDatabasePath = path.join(destination, "sporttoday.sqlite");
if (existsSync(databasePath)) {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("PRAGMA busy_timeout = 5000;");
    const escapedPath = backupDatabasePath.replaceAll("'", "''");
    database.exec(`VACUUM INTO '${escapedPath}'`);
  } finally {
    database.close();
  }
} else {
  await writeFile(path.join(destination, "NO-DATABASE"), "La base n'existait pas au moment de la sauvegarde.\n", "utf8");
}

if (existsSync(reportsDir)) await cp(reportsDir, path.join(destination, "reports"), { recursive: true });
const rawDir = path.join(dataDir, "raw");
if (existsSync(rawDir)) await cp(rawDir, path.join(destination, "raw"), { recursive: true });
await writeFile(path.join(destination, "metadata.json"), `${JSON.stringify({
  createdAt: new Date().toISOString(),
  database: existsSync(databasePath),
  reports: existsSync(reportsDir),
  raw: existsSync(rawDir)
}, null, 2)}\n`, "utf8");

console.log(destination);
