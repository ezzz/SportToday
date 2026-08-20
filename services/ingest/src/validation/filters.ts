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
    .filter((item) => matchesCategory(item, category))
    .filter((item) => matchesPeriod(item, report, period))
    .filter((item) => matchesSports(item, sports));
  const items = diversifiedSelection(matching, Math.max(1, report.limit));
  return { ...report, selectedCount: items.length, items };
}

export function matchesSports(item: TonightItem, sports: readonly string[]): boolean {
  return sports.length === 0 || sports.includes(item.sport);
}

export function matchesCategory(item: TonightItem, category: CategoryFilter): boolean {
  if (category === "all") return true;
  if (category === "live") {
    return item.liveStatus === "confirmed" || item.liveStatus === "probable";
  }
  if (category === "uncertain") return item.liveStatus === "unknown" && item.contentCategory !== "Emission";
  if (category === "delayed") return item.liveStatus === "delayed";
  return item.contentCategory === "Emission";
}

export function matchesPeriod(item: TonightItem, report: TonightReport, period: PeriodFilter): boolean {
  if (period === "day") return true;
  const start = Date.parse(report.eveningStartUtc);
  const end = Date.parse(report.windowEndUtc);
  return item.broadcasts.some((broadcast) => {
    const broadcastStart = Date.parse(broadcast.startAtUtc);
    const parsedStop = Date.parse(broadcast.stopAtUtc);
    const broadcastStop = Number.isFinite(parsedStop) && parsedStop > broadcastStart ? parsedStop : broadcastStart;
    return broadcastStart < end && (broadcastStop > start || broadcastStart >= start);
  });
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
