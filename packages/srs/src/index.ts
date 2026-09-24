export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_EASE_FACTOR = 2.5;
export const SECOND_INTERVAL_DAYS = 6;
export const FIRST_INTERVAL_DAYS = 1;

export enum ReviewGrade {
  FORGOT = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
  PERFECT = 5,
}

export function isValidReviewGrade(grade: number): grade is ReviewGrade {
  return (
    Number.isInteger(grade) &&
    grade >= ReviewGrade.FORGOT &&
    grade <= ReviewGrade.PERFECT
  );
}

export const LAPSE_GRADE_THRESHOLD = ReviewGrade.GOOD;

export type ScheduleState = {
  easeFactor: number;
  intervalDays: number;
  dueAt: Date;
  reviewCount: number;
  consecutiveCorrect: number;
  lapses: number;
  lastReviewedAt: Date | null;
};

export type QueueItem = {
  id: string;
  createdAt: Date;
  schedule: {
    dueAt: Date;
    intervalDays: number;
  } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function newSchedule(now: Date): ScheduleState {
  return {
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    dueAt: now,
    reviewCount: 0,
    consecutiveCorrect: 0,
    lapses: 0,
    lastReviewedAt: null,
  };
}

function nextEaseFactor(easeFactor: number, grade: ReviewGrade): number {
  const q = grade;
  const penalty = 5 - q;
  const delta = 0.1 - penalty * (0.08 + penalty * 0.02);
  return Math.max(MIN_EASE_FACTOR, easeFactor + delta);
}

function nextIntervalDays(
  intervalDays: number,
  easeFactor: number,
  repetitions: number
): number {
  if (repetitions <= 1) {
    return FIRST_INTERVAL_DAYS;
  }
  if (repetitions === 2) {
    return SECOND_INTERVAL_DAYS;
  }
  return Math.max(SECOND_INTERVAL_DAYS, Math.round(intervalDays * easeFactor));
}

export function review(
  state: ScheduleState | null,
  grade: ReviewGrade,
  now: Date
): ScheduleState {
  if (!isValidReviewGrade(grade)) {
    throw new RangeError(
      `Review grade must be an integer between ${ReviewGrade.FORGOT} and ${ReviewGrade.PERFECT}, received: ${grade}`
    );
  }

  const previous = state ?? newSchedule(now);
  const easeFactor = nextEaseFactor(previous.easeFactor, grade);
  const lapsed = grade < LAPSE_GRADE_THRESHOLD;
  const repetitions = lapsed ? 0 : previous.reviewCount + 1;
  const intervalDays = lapsed
    ? FIRST_INTERVAL_DAYS
    : nextIntervalDays(previous.intervalDays, easeFactor, repetitions);

  return {
    easeFactor,
    intervalDays,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    reviewCount: previous.reviewCount + 1,
    consecutiveCorrect: lapsed ? 0 : previous.consecutiveCorrect + 1,
    lapses: previous.lapses + (lapsed ? 1 : 0),
    lastReviewedAt: now,
  };
}

export function isDue(state: ScheduleState, now: Date): boolean {
  return state.dueAt.getTime() <= now.getTime();
}

const URGENT_OVERDUE_RATIO = 1;

export function overdueRatio(item: QueueItem, now: Date): number | null {
  if (!item.schedule) {
    return null;
  }
  const intervalMs = Math.max(item.schedule.intervalDays, 1) * DAY_MS;
  return (now.getTime() - item.schedule.dueAt.getTime()) / intervalMs;
}

export function orderSessionQueue<T extends QueueItem>(
  items: readonly T[],
  now: Date
): T[] {
  const urgent: T[] = [];
  const due: T[] = [];
  const fresh: T[] = [];
  const later: T[] = [];

  for (const item of items) {
    if (!item.schedule) {
      fresh.push(item);
    } else if (item.schedule.dueAt.getTime() <= now.getTime()) {
      const ratio = overdueRatio(item, now);
      if (ratio !== null && ratio >= URGENT_OVERDUE_RATIO) {
        urgent.push(item);
      } else {
        due.push(item);
      }
    } else {
      later.push(item);
    }
  }

  urgent.sort(
    (a, b) => (overdueRatio(b, now) ?? 0) - (overdueRatio(a, now) ?? 0)
  );
  due.sort(
    (a, b) =>
      (a.schedule?.dueAt.getTime() ?? 0) - (b.schedule?.dueAt.getTime() ?? 0)
  );
  fresh.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  later.sort(
    (a, b) =>
      (a.schedule?.dueAt.getTime() ?? 0) - (b.schedule?.dueAt.getTime() ?? 0)
  );

  return [...urgent, ...due, ...fresh, ...later];
}
