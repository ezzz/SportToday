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
      sub_title TEXT,
      description TEXT,
      categories_json TEXT NOT NULL,
      start_at TEXT NOT NULL,
      stop_at TEXT,
      is_previously_shown INTEGER NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY(source, source_id)
    );
  `);
  ensureColumn(database, "source_programme", "sub_title", "TEXT");
  ensureColumn(database, "source_programme", "is_previously_shown", "INTEGER NOT NULL DEFAULT 0");
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
    (source, source_id, channel_source_id, title, sub_title, description, categories_json, start_at, stop_at, is_previously_shown, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const programme of parsed.programmes) {
    insertProgramme.run(
      source,
      programme.sourceId,
      programme.channelSourceId,
      programme.title,
      programme.subTitle ?? null,
      programme.description ?? null,
      JSON.stringify(programme.categories),
      programme.startAt,
      programme.stopAt ?? null,
      programme.isPreviouslyShown ? 1 : 0,
      snapshot.fetchedAt
    );
  }
}

function ensureColumn(database: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: unknown }>;
  if (columns.some((candidate) => candidate.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
