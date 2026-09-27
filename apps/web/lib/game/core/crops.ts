import { overdueRatio } from "@colyglot/srs";

export type CropStage = "fresh" | "growing" | "ready" | "urgent";

export type CropSchedule = { dueAt: Date; intervalDays: number } | null;

// The SM-2 schedule drives the farm's visual state; nothing is stored twice.
export function cropStage(schedule: CropSchedule, now: Date): CropStage {
  if (!schedule) return "fresh";
  if (schedule.dueAt.getTime() > now.getTime()) return "growing";
  const ratio = overdueRatio(
    {
      id: "crop",
      createdAt: now,
      schedule: { dueAt: schedule.dueAt, intervalDays: schedule.intervalDays },
    },
    now
  );
  return (ratio ?? 0) >= 1 ? "urgent" : "ready";
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
