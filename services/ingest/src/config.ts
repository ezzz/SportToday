import path from "node:path";

import "dotenv/config";

import type { SourceId } from "./types.js";

const dataRoot = process.env.INGEST_DATA_DIR ?? path.resolve("data");

export const config = {
  dataRoot,
  sqlitePath: path.join(dataRoot, "sporttoday.sqlite"),
  reportsRoot: path.resolve("reports"),
  timeZone: process.env.POC_TIMEZONE ?? "Europe/Paris",
  xmltv: {
    xmltvfr: process.env.XMLTVFR_URL ?? "https://xmltvfr.fr/xmltv/xmltv_fr.xml.gz",
    xmltvfree: process.env.XMLTVFREE_URL ?? "http://xmltvfree.free.fr/xmltv.xml.gz"
  },
  thesportsdb: {
    baseUrl: process.env.THESPORTSDB_BASE_URL ?? "https://www.thesportsdb.com/api/v1/json",
    apiKey: process.env.THESPORTSDB_API_KEY ?? "123"
  },
  apiFootball: {
    baseUrl: process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
    apiKey: process.env.API_FOOTBALL_KEY ?? ""
  },
  jolpicaF1: {
    baseUrl: process.env.JOLPICA_F1_BASE_URL ?? "https://api.jolpi.ca/ergast/f1"
  }
} as const;

export function isXmltvSource(value: string): value is Extract<SourceId, "xmltvfr" | "xmltvfree"> {
  return value === "xmltvfr" || value === "xmltvfree";
}
