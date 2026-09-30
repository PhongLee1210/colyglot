"use server";

import { review, ReviewGrade } from "@colyglot/srs";

import { requireUserId } from "@/lib/auth/session";
import { addDeckXpForCard } from "@/lib/db/repositories/deck-progress";
import {
  applyFarmReviewHooks,
  type FarmReviewEvent,
} from "@/lib/db/repositories/farm";
import {
  appendReviewLog,
  closeStudySession,
  getCardSchedule,
  openStudySession,
  upsertCardSchedule,
} from "@/lib/db/repositories/study";
import { deriveGrade } from "@/lib/game/core/challenge";
import {
  harvestPreview,
  XP_BY_GRADE,
  type HarvestPreview,
} from "@/lib/game/core/economy";
import type { ActionResult } from "./types";

export type GradeResult = {
  intervalDays: number;
  dueAt: string;
  requeued: boolean;
  goldPreview: HarvestPreview;
  // Graduation into the Forest / demotion back to a plot, when this
  // review crossed a lifecycle threshold (GAME_PLAY §5).
  farmEvent: FarmReviewEvent | null;
};

// The raw facts of one tap — the grade is derived server-side (D2), so a
// tampered client cannot post a grade its response time does not support.
export type GradeOutcomeInput = {
  correct: boolean;
  elapsedMs: number;
  hesitated: boolean;
};

export async function startStudySessionAction(): Promise<ActionResult<string>> {
  const userId = await requireUserId();
  try {
    const session = await openStudySession(userId);
    return { ok: true, data: session.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not start session",
    };
  }
}

export async function gradeCardAction(
  cardId: string,
  sessionId: string,
  outcome: GradeOutcomeInput
): Promise<ActionResult<GradeResult>> {
  const userId = await requireUserId();
  try {
    const current = await getCardSchedule(userId, cardId);
    const state = current
      ? {
          easeFactor: current.easeFactor,
          intervalDays: current.intervalDays,
          dueAt: current.dueAt,
          reviewCount: current.reviewCount,
          consecutiveCorrect: current.consecutiveCorrect,
          lapses: current.lapses,
          lastReviewedAt: current.lastReviewedAt,
        }
      : null;
    const intervalDaysBefore = current?.intervalDays ?? 0;
    const grade = deriveGrade(intervalDaysBefore, {
      correct: outcome.correct,
      elapsedMs: Math.max(0, Math.round(outcome.elapsedMs)),
      hesitated: outcome.hesitated,
    });
    const next = review(state, grade, new Date());
    const upserted = await upsertCardSchedule(userId, cardId, {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      dueAt: next.dueAt,
      reviewCount: next.reviewCount,
      consecutiveCorrect: next.consecutiveCorrect,
      lapses: next.lapses,
      lastReviewedAt: next.lastReviewedAt,
    });
    if (!upserted) {
      return { ok: false, error: "Card not found" };
    }
    const log = await appendReviewLog(userId, {
      cardId,
      sessionId,
      grade,
      intervalDaysBefore,
      elapsedMs: Math.max(0, Math.round(outcome.elapsedMs)),
      hesitated: outcome.hesitated,
    });
    if (!log) {
      return { ok: false, error: "Session not found" };
    }
    await addDeckXpForCard(userId, cardId, XP_BY_GRADE[grade]);
    let farmEvent: FarmReviewEvent | null = null;
    try {
      farmEvent = await applyFarmReviewHooks(userId, cardId, {
        intervalDaysBefore,
        newIntervalDays: next.intervalDays,
        grade,
      });
    } catch {
      // The schedule write already committed; a lifecycle miss must not
      // fail the grade — the word just moves on the next threshold.
    }
    return {
      ok: true,
      data: {
        intervalDays: next.intervalDays,
        dueAt: next.dueAt.toISOString(),
        requeued: grade < ReviewGrade.GOOD,
        goldPreview: harvestPreview(intervalDaysBefore, grade),
        farmEvent,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save grade",
    };
  }
}

export async function finishSessionAction(
  sessionId: string,
  cardsReviewed: number
): Promise<ActionResult<true>> {
  const userId = await requireUserId();
  try {
    const closed = await closeStudySession(userId, sessionId, cardsReviewed);
    if (!closed) {
      return { ok: false, error: "Session not found" };
    }
    return { ok: true, data: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not close session",
    };
  }
}
