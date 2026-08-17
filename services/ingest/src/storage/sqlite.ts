import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { ParsedXmltv, RawSnapshot, SourceId } from "../types.js";
import type { StoredSnapshot } from "./snapshot-store.js";

export function openDatabase(filePath: string): DatabaseSync {
  return new DatabaseSync(filePath);
}

export async function initializeDatabase(filePath: string): Promise<DatabaseSync> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const database = openDatabase(filePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS source_snapshot (
      id INTEGER PRIMARY KEY,
      source TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      source_url TEXT NOT NULL,
      file_path TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      UNIQUE(source, sha256)
    );
    CREATE TABLE IF NOT EXISTS source_channel (
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      icon_url TEXT,
      PRIMARY KEY(source, source_id)
    );
    CREATE TABLE IF NOT EXISTS source_programme (
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      channel_source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      categories_json TEXT NOT NULL,
      start_at TEXT NOT NULL,
      stop_at TEXT,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY(source, source_id)
    );
  `);
  return database;
}

export function importXmltv(
  database: DatabaseSync,
  source: Extract<SourceId, "xmltvfr" | "xmltvfree">,
  snapshot: RawSnapshot,
  stored: StoredSnapshot,
  parsed: ParsedXmltv
): void {
  const insertSnapshot = database.prepare(`INSERT OR IGNORE INTO source_snapshot
    (source, fetched_at, source_url, file_path, sha256) VALUES (?, ?, ?, ?, ?)`);
  insertSnapshot.run(source, snapshot.fetchedAt, snapshot.url, stored.path, stored.sha256);

  const insertChannel = database.prepare(`INSERT OR REPLACE INTO source_channel
    (source, source_id, display_name, icon_url) VALUES (?, ?, ?, ?)`);
  for (const channel of parsed.channels) {
    insertChannel.run(source, channel.sourceId, channel.displayName, channel.iconUrl ?? null);
  }

  const insertProgramme = database.prepare(`INSERT OR REPLACE INTO source_programme
    (source, source_id, channel_source_id, title, description, categories_json, start_at, stop_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const programme of parsed.programmes) {
    insertProgramme.run(
      source,
      programme.sourceId,
      programme.channelSourceId,
      programme.title,
      programme.description ?? null,
      JSON.stringify(programme.categories),
      programme.startAt,
      programme.stopAt ?? null,
      snapshot.fetchedAt
    );
  }
}
