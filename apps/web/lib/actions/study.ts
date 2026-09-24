"use server";

import { revalidatePath } from "next/cache";

import { review } from "@colyglot/srs";

import { requireUserId } from "@/lib/auth/session";
import {
  appendReviewLog,
  closeStudySession,
  getCardSchedule,
  openStudySession,
  upsertCardSchedule,
} from "@/lib/db/repositories/study";
import { ReviewGrade } from "@/lib/db/schema";
import type { ActionResult } from "./types";

export type GradeResult = {
  intervalDays: number;
  dueAt: string;
  requeued: boolean;
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
  grade: ReviewGrade
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
    const log = await appendReviewLog(userId, { cardId, sessionId, grade });
    if (!log) {
      return { ok: false, error: "Session not found" };
    }
    return {
      ok: true,
      data: {
        intervalDays: next.intervalDays,
        dueAt: next.dueAt.toISOString(),
        requeued: grade < ReviewGrade.GOOD,
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

export async function revalidateDeckAction(deckId: string): Promise<void> {
  await requireUserId();
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/");
}
