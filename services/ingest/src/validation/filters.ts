import type { TonightItem, TonightReport } from "../reports/tonight.js";

export const categoryFilters = ["live", "delayed", "editorial", "all"] as const;
export const periodFilters = ["evening", "day"] as const;

export type CategoryFilter = typeof categoryFilters[number];
export type PeriodFilter = typeof periodFilters[number];

export function parseCategoryFilter(value: string | null): CategoryFilter {
  return categoryFilters.includes(value as CategoryFilter) ? value as CategoryFilter : "live";
}

export function parsePeriodFilter(value: string | null): PeriodFilter {
  return periodFilters.includes(value as PeriodFilter) ? value as PeriodFilter : "evening";
}

export function filteredReport(
  report: TonightReport,
  category: CategoryFilter,
  period: PeriodFilter
): TonightReport {
  const items = report.items
    .filter((item) => matchesCategory(item, category))
    .filter((item) => matchesPeriod(item, report, period))
    .slice(0, Math.max(1, report.limit));
  return { ...report, selectedCount: items.length, items };
}

export function matchesCategory(item: TonightItem, category: CategoryFilter): boolean {
  if (category === "all") return true;
  if (category === "live") {
    return item.contentCategory === "Sport Live"
      || (item.contentCategory === "Sport différé" && item.isLive === "unknown");
  }
  if (category === "delayed") return item.contentCategory === "Sport différé" && item.isLive === "false";
  return item.contentCategory === "Emission";
}

export function matchesPeriod(item: TonightItem, report: TonightReport, period: PeriodFilter): boolean {
  if (period === "day") return true;
  const start = Date.parse(report.eveningStartUtc);
  const end = Date.parse(report.windowEndUtc);
  return item.broadcasts.some((broadcast) => {
    const broadcastStart = Date.parse(broadcast.startAtUtc);
    return broadcastStart >= start && broadcastStart < end;
  });
}
