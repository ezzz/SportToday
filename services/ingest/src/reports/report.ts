import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ParsedXmltv, SourceId } from "../types.js";
import { isSportProgramme } from "../xmltv/parser.js";
import type { StoredSnapshot } from "../storage/snapshot-store.js";

export async function writeReport(
  reportsRoot: string,
  source: SourceId,
  fetchedAt: string,
  stored: StoredSnapshot,
  parsed: ParsedXmltv
): Promise<string> {
  const programmeDates = parsed.programmes.map((programme) => Date.parse(programme.startAt)).filter(Number.isFinite);
  const horizonDays = programmeDates.length === 0
    ? null
    : Math.max(0, (Math.max(...programmeDates) - Date.now()) / 86_400_000);
  const report = {
    source,
    fetchedAt,
    snapshotPath: stored.path,
    sha256: stored.sha256,
    channelCount: parsed.channels.length,
    programmeCount: parsed.programmes.length,
    sportProgrammeCount: parsed.programmes.filter(isSportProgramme).length,
    programmesWithoutTitle: parsed.programmes.filter((programme) => !programme.title).length,
    programmesWithoutDescription: parsed.programmes.filter((programme) => !programme.description).length,
    horizonDays: horizonDays === null ? null : Number(horizonDays.toFixed(2))
  };

  await mkdir(reportsRoot, { recursive: true });
  const reportPath = path.join(reportsRoot, `${source}-${fetchedAt.replace(/[-:TZ.]/g, "").slice(0, 12)}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}
