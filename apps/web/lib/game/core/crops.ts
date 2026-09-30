import { overdueRatio } from "@colyglot/srs";

import { GRADUATION_INTERVAL_DAYS } from "@/lib/game/core/economy";

export type CropStage = "fresh" | "growing" | "ready" | "urgent";

export type CropSchedule = { dueAt: Date; intervalDays: number } | null;

// The SM-2 schedule drives the farm's visual state; nothing is stored twice.
export function cropStage(schedule: CropSchedule, now: Date): CropStage {
  if (!schedule) return "fresh";
  if (schedule.dueAt.getTime() > now.getTime()) return "growing";
  return (cropOverdueRatio(schedule, now) ?? 0) >= 1 ? "urgent" : "ready";
}

// Graduation countdown (GAME_PLAY §6.2): once a crop's interval reaches
// 14 days it is one good review away from becoming a forest tree, so it
// earns the star badge and the warm glow. The window holds until the 21d
// graduation threshold (15d for a world's first tree).
export const GRADUATION_SOON_MIN_DAYS = 14;

export function nearGraduation(schedule: CropSchedule): boolean {
  return (
    schedule !== null &&
    schedule.intervalDays >= GRADUATION_SOON_MIN_DAYS &&
    schedule.intervalDays < GRADUATION_INTERVAL_DAYS
  );
}

// Whole days until the review that could graduate this crop; null unless
// the countdown is live. Never 0 — the review itself might be today.
export function daysToGraduation(
  schedule: CropSchedule,
  now: Date
): number | null {
  if (schedule === null || !nearGraduation(schedule)) return null;
  const ms = schedule.dueAt.getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

export function formatWait(dueAt: Date, now: Date): string {
  const ms = dueAt.getTime() - now.getTime();
  if (ms <= 60 * 1000) return "now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

// Wilting is a forecast, not a punishment (GAME_PLAY §4): intensity must
// be PROPORTIONAL to how far past due a word is — 0 at the urgent
// threshold (ratio 1), fully wilted at ratio 3.
export const WILT_MAX_OVERDUE_RATIO = 3;

export function cropOverdueRatio(
  schedule: CropSchedule,
  now: Date
): number | null {
  if (!schedule) return null;
  return overdueRatio(
    {
      id: "crop",
      createdAt: now,
      schedule: { dueAt: schedule.dueAt, intervalDays: schedule.intervalDays },
    },
    now
  );
}

export function wiltIntensity(schedule: CropSchedule, now: Date): number {
  const ratio = cropOverdueRatio(schedule, now);
  if (ratio === null) return 0;
  return Math.min(Math.max((ratio - 1) / (WILT_MAX_OVERDUE_RATIO - 1), 0), 1);
}
