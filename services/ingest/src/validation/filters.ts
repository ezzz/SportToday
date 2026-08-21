import type { TonightItem, TonightReport } from "../reports/tonight.js";

export const categoryFilters = ["live", "uncertain", "delayed", "editorial", "all"] as const;
export const periodFilters = ["evening", "day"] as const;

export type CategoryFilter = typeof categoryFilters[number];
export type PeriodFilter = typeof periodFilters[number];

export function parseCategoryFilter(value: string | null): CategoryFilter {
  return categoryFilters.includes(value as CategoryFilter) ? value as CategoryFilter : "live";
}

export function parsePeriodFilter(value: string | null): PeriodFilter {
  return periodFilters.includes(value as PeriodFilter) ? value as PeriodFilter : "evening";
}

export function parseSportFilters(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((sport) => sport.trim()).filter(Boolean))];
}

export function filteredReport(
  report: TonightReport,
  category: CategoryFilter,
  period: PeriodFilter,
  sports: readonly string[] = []
): TonightReport {
  const matching = report.items
    .map((item) => ({ ...item, broadcasts: matchingBroadcasts(item, report, category, period) }))
    .filter((item) => item.broadcasts.length > 0)
    .filter((item) => matchesSports(item, sports));
  const items = diversifiedSelection(matching, Math.max(1, report.limit));
  return { ...report, selectedCount: items.length, items };
}

export function matchesSports(item: TonightItem, sports: readonly string[]): boolean {
  return sports.length === 0 || sports.includes(item.sport);
}

export function matchesCategory(item: TonightItem, category: CategoryFilter): boolean {
  if (category === "all") return true;
  if (category === "live") return item.broadcasts.some((broadcast) => broadcast.liveStatus === "confirmed" || broadcast.liveStatus === "probable");
  if (category === "uncertain") return item.contentCategory !== "Emission" && item.broadcasts.some((broadcast) => broadcast.liveStatus === "unknown");
  if (category === "delayed") return item.broadcasts.some((broadcast) => broadcast.liveStatus === "delayed");
  return item.contentCategory === "Emission";
}

export function matchesPeriod(item: TonightItem, report: TonightReport, period: PeriodFilter): boolean {
  if (period === "day") return true;
  const start = Date.parse(report.eveningStartUtc);
  const end = Date.parse(report.windowEndUtc);
  return item.broadcasts.some((broadcast) => broadcastOverlaps(broadcast.startAtUtc, broadcast.stopAtUtc, start, end));
}

export function matchingBroadcasts(
  item: TonightItem,
  report: TonightReport,
  category: CategoryFilter,
  period: PeriodFilter
): TonightItem["broadcasts"] {
  const periodStart = Date.parse(report.eveningStartUtc);
  const periodEnd = Date.parse(report.windowEndUtc);
  return item.broadcasts.filter((broadcast) => {
    const categoryMatch = category === "all"
      || (category === "live" && (broadcast.liveStatus === "confirmed" || broadcast.liveStatus === "probable"))
      || (category === "uncertain" && item.contentCategory !== "Emission" && broadcast.liveStatus === "unknown")
      || (category === "delayed" && broadcast.liveStatus === "delayed")
      || (category === "editorial" && item.contentCategory === "Emission");
    const periodMatch = period === "day" || broadcastOverlaps(broadcast.startAtUtc, broadcast.stopAtUtc, periodStart, periodEnd);
    return categoryMatch && periodMatch;
  });
}

function broadcastOverlaps(startAtUtc: string, stopAtUtc: string, periodStart: number, periodEnd: number): boolean {
  const broadcastStart = Date.parse(startAtUtc);
  const parsedStop = Date.parse(stopAtUtc);
  const broadcastStop = Number.isFinite(parsedStop) && parsedStop > broadcastStart ? parsedStop : broadcastStart;
  return broadcastStart < periodEnd && (broadcastStop > periodStart || broadcastStart >= periodStart);
}

export function diversifiedSelection(items: readonly TonightItem[], limit: number, competitionCap = 2): TonightItem[] {
  const selected: TonightItem[] = [];
  const competitionCounts = new Map<string, number>();
  for (const item of items) {
    if (selected.length >= limit) break;
    const key = diversityKey(item);
    const count = competitionCounts.get(key) ?? 0;
    if (count >= competitionCap) continue;
    competitionCounts.set(key, count + 1);
    selected.push(item);
  }
  return selected;
}

function diversityKey(item: TonightItem): string {
  const competition = item.competition.trim().toLocaleLowerCase("fr-FR");
  return competition ? `${item.sport}|${competition}` : `${item.sport}|${item.title.toLocaleLowerCase("fr-FR")}`;
}
