/** Dates calendaires locales (YYYY-MM-DD), sans arithmétique sur les heures DST. */
export function upcomingWindow(baseDate: string) {
  const start = new Date(baseDate + 'T12:00:00Z');
  const weekday = start.getUTCDay();
  const singleDay = weekday === 5 || weekday === 6;
  const endOffset = singleDay ? 2 : weekday === 0 ? 7 : 7 - weekday;
  const from = new Date(start);
  from.setUTCDate(from.getUTCDate() + 2);
  const through = new Date(start);
  through.setUTCDate(through.getUTCDate() + endOffset);
  return { from: from.toISOString().slice(0, 10), through: through.toISOString().slice(0, 10), singleDay, label: singleDay ? 'Après-demain' : 'À venir' };
}
