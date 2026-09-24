const DAY_MS = 24 * 60 * 60 * 1000;

export function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeStreak(dayKeys: Iterable<string>, now: Date): number {
  const days = new Set(dayKeys);
  const today = toUtcDayKey(now);
  const yesterday = toUtcDayKey(new Date(now.getTime() - DAY_MS));

  let cursorKey = days.has(today)
    ? today
    : days.has(yesterday)
      ? yesterday
      : "";
  if (!cursorKey) {
    return 0;
  }

  let streak = 0;
  while (days.has(cursorKey)) {
    streak += 1;
    const cursorTime = Date.parse(`${cursorKey}T00:00:00.000Z`) - DAY_MS;
    cursorKey = toUtcDayKey(new Date(cursorTime));
  }
  return streak;
}
