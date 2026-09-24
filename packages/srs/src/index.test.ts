import { describe, expect, test } from "bun:test";

import {
  DEFAULT_EASE_FACTOR,
  isValidReviewGrade,
  MIN_EASE_FACTOR,
  newSchedule,
  orderSessionQueue,
  review,
  ReviewGrade,
  type ScheduleState,
} from "./index";

const T0 = new Date("2026-09-24T09:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

describe("review — story 3.1 worked example (golden sequence)", () => {
  test("rows 1-4: Good, Perfect, Good, Hard from a fresh card", () => {
    let state: ScheduleState | null = null;

    state = review(state, ReviewGrade.EASY, T0);
    expect(round(state.easeFactor)).toBe(2.5);
    expect(state.intervalDays).toBe(1);
    expect(state.dueAt.getTime()).toBe(T0.getTime() + 1 * DAY_MS);

    const afterFirst = state as ScheduleState;
    state = review(afterFirst, ReviewGrade.PERFECT, afterFirst.dueAt);
    expect(round(state.easeFactor)).toBe(2.6);
    expect(state.intervalDays).toBe(6);
    expect(state.dueAt.getTime()).toBe(afterFirst.dueAt.getTime() + 6 * DAY_MS);

    const afterSecond = state as ScheduleState;
    state = review(afterSecond, ReviewGrade.EASY, afterSecond.dueAt);
    expect(round(state.easeFactor)).toBe(2.6);
    expect(state.intervalDays).toBe(16);
    expect(state.dueAt.getTime()).toBe(
      afterSecond.dueAt.getTime() + 16 * DAY_MS
    );

    const afterThird = state as ScheduleState;
    state = review(afterThird, ReviewGrade.GOOD, afterThird.dueAt);
    expect(round(state.easeFactor)).toBe(2.46);
    expect(state.intervalDays).toBe(39);
    expect(state.dueAt.getTime()).toBe(
      afterThird.dueAt.getTime() + 39 * DAY_MS
    );
  });

  test("row 5: lapse resets repetitions and interval to 1 day", () => {
    const lapsed = review(
      {
        ...newSchedule(T0),
        easeFactor: 2.46,
        intervalDays: 39,
        reviewCount: 4,
      },
      ReviewGrade.FORGOT,
      T0
    );

    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.consecutiveCorrect).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.dueAt.getTime()).toBe(T0.getTime() + 1 * DAY_MS);
  });
});

describe("review — sequences", () => {
  test("all-correct long streak compounds intervals on ease", () => {
    let state: ScheduleState | null = null;
    let now = T0;
    for (let i = 0; i < 10; i++) {
      state = review(state, ReviewGrade.PERFECT, now);
      now = state.dueAt;
    }
    const finalState = state as ScheduleState;
    expect(finalState.easeFactor).toBeGreaterThan(DEFAULT_EASE_FACTOR);
    expect(finalState.intervalDays).toBeGreaterThan(100);
    expect(finalState.consecutiveCorrect).toBe(10);
    expect(finalState.lapses).toBe(0);
  });

  test("all-wrong floors the ease factor at 1.3 and keeps interval at 1", () => {
    let state: ScheduleState | null = null;
    let now = T0;
    for (let i = 0; i < 20; i++) {
      state = review(state, ReviewGrade.FORGOT, now);
      now = state.dueAt;
    }
    const finalState = state as ScheduleState;
    expect(finalState.easeFactor).toBe(MIN_EASE_FACTOR);
    expect(finalState.intervalDays).toBe(1);
    expect(finalState.lapses).toBe(20);
  });

  test("alternating pass/lapse keeps relearning from interval 1", () => {
    let state: ScheduleState | null = null;
    let now = T0;
    for (let i = 0; i < 8; i++) {
      const grade = i % 2 === 0 ? ReviewGrade.EASY : ReviewGrade.HARD;
      state = review(state, grade, now);
      now = state.dueAt;
    }
    const finalState = state as ScheduleState;
    expect(finalState.reviewCount).toBe(8);
    expect(finalState.lapses).toBe(4);
    expect(finalState.intervalDays).toBe(1);
  });

  test("same inputs always produce the same schedule (determinism)", () => {
    const run = () => {
      let state: ScheduleState | null = null;
      let now = T0;
      for (const grade of [4, 5, 3, 2, 4, 5]) {
        state = review(state, grade as ReviewGrade, now);
        now = state.dueAt;
      }
      return state as ScheduleState;
    };
    expect(run()).toEqual(run());
  });

  test("time injection: reviewing the same card at different clocks shifts due dates", () => {
    const a = review(null, ReviewGrade.EASY, T0);
    const b = review(null, ReviewGrade.EASY, new Date(T0.getTime() + DAY_MS));
    expect(b.dueAt.getTime() - a.dueAt.getTime()).toBe(DAY_MS);
  });

  test("rejects grades outside 1-5", () => {
    expect(() => review(null, 0 as ReviewGrade, T0)).toThrow(RangeError);
    expect(() => review(null, 6 as ReviewGrade, T0)).toThrow(RangeError);
    expect(isValidReviewGrade(2.5)).toBe(false);
  });
});

describe("orderSessionQueue", () => {
  const base = { createdAt: T0 };

  test("urgent decay first, then scheduled-due, then new cards", () => {
    const now = new Date(T0.getTime() + 30 * DAY_MS);
    const queue = orderSessionQueue(
      [
        {
          ...base,
          id: "new-1",
          schedule: null,
          createdAt: new Date(T0.getTime() + DAY_MS),
        },
        {
          ...base,
          id: "due-soon",
          schedule: {
            dueAt: new Date(T0.getTime() + 29 * DAY_MS),
            intervalDays: 30,
          },
        },
        {
          ...base,
          id: "urgent",
          schedule: { dueAt: T0, intervalDays: 1 },
        },
        {
          ...base,
          id: "new-0",
          schedule: null,
          createdAt: T0,
        },
      ],
      now
    );

    expect(queue.map((item) => item.id)).toEqual([
      "urgent",
      "due-soon",
      "new-0",
      "new-1",
    ]);
  });

  test("future-due cards are excluded is the caller's concern; queue only reorders what it gets", () => {
    const now = T0;
    const queue = orderSessionQueue(
      [
        {
          ...base,
          id: "future",
          schedule: {
            dueAt: new Date(now.getTime() + DAY_MS),
            intervalDays: 1,
          },
        },
        { ...base, id: "now", schedule: { dueAt: now, intervalDays: 1 } },
      ],
      now
    );
    expect(queue.map((item) => item.id)).toEqual(["now", "future"]);
  });
});
