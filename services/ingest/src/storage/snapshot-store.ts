import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RawSnapshot } from "../types.js";

export interface StoredSnapshot {
  path: string;
  sha256: string;
  fetchedAt: string;
}

export async function storeSnapshot(root: string, snapshot: RawSnapshot): Promise<StoredSnapshot> {
  const date = snapshot.fetchedAt.replace(/[-:TZ.]/g, "").slice(0, 12);
  const hash = createHash("sha256").update(snapshot.body).digest("hex");
  const directory = path.join(root, "raw", snapshot.source);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${date}-${hash.slice(0, 12)}.${snapshot.extension}`);
  await writeFile(filePath, snapshot.body, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });

  return { path: filePath, sha256: hash, fetchedAt: snapshot.fetchedAt };
}
