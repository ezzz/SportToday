import type { RawSnapshot, SourceId } from "../types.js";

export interface DataSource {
  readonly id: SourceId;
  fetch(): Promise<RawSnapshot>;
}

export abstract class HttpDataSource implements DataSource {
  abstract readonly id: SourceId;

  protected abstract readonly url: string;

  async fetch(): Promise<RawSnapshot> {
    if (!this.url) {
      throw new Error(`${this.id}: no URL configured`);
    }

    const response = await fetch(this.url, {
      headers: { "user-agent": "SportToday-data-poc/0.1" }
    });

    if (!response.ok) {
      throw new Error(`${this.id}: HTTP ${response.status} ${response.statusText}`);
    }

    const body = Buffer.from(await response.arrayBuffer());
    const extension = extensionFor(this.url, response.headers.get("content-type"));

    return {
      source: this.id,
      fetchedAt: new Date().toISOString(),
      url: this.url,
      contentType: response.headers.get("content-type"),
      extension,
      body
    };
  }
}

function extensionFor(url: string, contentType: string | null): RawSnapshot["extension"] {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".gz") || contentType?.includes("gzip")) return "gz";
  if (pathname.endsWith(".xz") || contentType?.includes("xz")) return "xz";
  if (contentType?.includes("json") || pathname.endsWith(".json")) return "json";
  return "xml";
}
