import { gunzipSync } from "node:zlib";

import { parseXmltv } from "../xmltv/parser.js";
import type { ParsedXmltv, RawSnapshot, SourceId } from "../types.js";
import { HttpDataSource } from "./data-source.js";

export abstract class XmltvSource extends HttpDataSource {
  abstract readonly id: Extract<SourceId, "xmltvfr" | "xmltvfree">;

  async parse(snapshot: RawSnapshot): Promise<ParsedXmltv> {
    if (snapshot.extension === "xz") {
      throw new Error(`${this.id}: XZ snapshots are archived but parsing is not implemented yet`);
    }

    const xml = snapshot.extension === "gz"
      ? gunzipSync(snapshot.body).toString("utf8")
      : snapshot.body.toString("utf8");

    return parseXmltv(xml, this.id);
  }
}
