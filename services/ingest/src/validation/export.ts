import ExcelJS from "exceljs";

import type { TonightItem, TonightReport } from "../reports/tonight.js";
import type { ItemValidation, ValidationFile, ValidationVerdict } from "./store.js";

const headers = [
  "Date",
  "Diffusions",
  "Titre",
  "Sport",
  "Compétition",
  "Participants",
  "Catégorie",
  "Live",
  "Score",
  "Raisons de sélection",
  "Validation",
  "Commentaire"
] as const;

export function validationCsv(report: TonightReport, validation: ValidationFile): Buffer {
  const rows = exportRows(report, validation);
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  return Buffer.from(`\uFEFF${lines}\r\n`, "utf8");
}

export async function validationXlsx(report: TonightReport, validation: ValidationFile): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SportToday POC";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Sélection", {
    views: [{ state: "frozen", ySplit: 1 }]
  });
  worksheet.addRow([...headers]);
  for (const row of exportRows(report, validation)) worksheet.addRow(row);

  worksheet.autoFilter = { from: "A1", to: `L${Math.max(1, worksheet.rowCount)}` };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF172033" } };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.columns = [
    { width: 13 },
    { width: 34 },
    { width: 38 },
    { width: 16 },
    { width: 28 },
    { width: 30 },
    { width: 17 },
    { width: 12 },
    { width: 9 },
    { width: 44 },
    { width: 22 },
    { width: 38 }
  ];
  for (const row of worksheet.getRows(2, Math.max(0, worksheet.rowCount - 1)) ?? []) {
    row.alignment = { vertical: "top", wrapText: true };
    const verdict = String(row.getCell(11).value ?? "");
    if (verdict === "OK") row.getCell(11).fill = solidFill("FFDDF5E5");
    else if (verdict === "À valider") row.getCell(11).fill = solidFill("FFFFF3CD");
    else row.getCell(11).fill = solidFill("FFFADBD8");
  }

  const summary = workbook.addWorksheet("Résumé");
  summary.addRows([
    ["Source", report.source],
    ["Date", report.date],
    ["Fenêtre", `${report.windowStartUtc} → ${report.windowEndUtc}`],
    ["Événements sélectionnés", report.selectedCount],
    ["Dernière sauvegarde", validation.updatedAt || "Pas encore validé"],
    ["Événement majeur manquant", validation.missingEventNote]
  ]);
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 80;
  summary.getColumn(1).font = { bold: true };

  const content = await workbook.xlsx.writeBuffer();
  return Buffer.from(content);
}

type ExportRow = string[];

function exportRows(report: TonightReport, validation: ValidationFile): ExportRow[] {
  return report.items.map((item) => {
    const itemValidation = validation.items[item.id];
    return [
      report.date,
      broadcastLabel(item),
      item.title,
      item.sport,
      item.competition,
      item.participants,
      categoryLabel(item),
      liveLabel(item.isLive),
      String(item.score),
      item.selectionReasons.join(" | "),
      verdictLabel(itemValidation?.verdict ?? "pending"),
      itemValidation?.note ?? ""
    ];
  });
}

function categoryLabel(item: TonightItem): string {
  if (item.contentCategory === "Sport différé" && item.isLive === "unknown") return "Direct à confirmer";
  return item.contentCategory;
}

function broadcastLabel(item: TonightItem): string {
  return item.broadcasts.map((broadcast) => `${broadcast.timeLabel} — ${broadcast.channel}`).join(" | ");
}

function verdictLabel(verdict: ValidationVerdict): string {
  const labels: Record<ValidationVerdict, string> = {
    pending: "À valider",
    ok: "OK",
    doubt: "DOUTE",
    off_topic: "KO : hors sujet",
    wrong_channel: "KO : mauvaise chaîne",
    wrong_time: "KO : mauvais horaire",
    wrong_live: "KO : Live/Différé",
    duplicate: "KO : doublon"
  };
  return labels[verdict];
}

function liveLabel(value: TonightItem["isLive"]): string {
  return value === "true" ? "Live" : value === "false" ? "Non-live" : "À confirmer";
}

function csvCell(value: string): string {
  const safeValue = /^[=+@-]/u.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
