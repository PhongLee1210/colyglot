import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "../index";
import {
  cards,
  cardSchedules,
  decks,
  DEFAULT_DUE_QUEUE_LIMIT,
  isValidReviewGrade,
  LOCAL_USER_ID,
  ReviewGrade,
  reviewLogs,
  studySessions,
  type Card,
  type CardSchedule,
  type ReviewLog,
  type StudySession,
} from "../schema";

export type DueQueueItem = {
  card: Card;
  schedule: CardSchedule | null;
};

export type DueQueueInput = {
  userId?: string;
  limit?: number;
};

export type DeckDueCount = {
  deckId: string;
  dueCount: number;
};

export type ScheduleState = {
  easeFactor: number;
  intervalDays: number;
  dueAt: Date;
  reviewCount: number;
  consecutiveCorrect: number;
  lapses: number;
  lastReviewedAt: Date | null;
};

export type AppendReviewLogInput = {
  cardId: string;
  sessionId: string;
  grade: ReviewGrade;
};

function dueCondition() {
  return or(isNull(cardSchedules.cardId), lte(cardSchedules.dueAt, new Date()));
}

export async function getDueQueue(
  input: DueQueueInput = {}
): Promise<DueQueueItem[]> {
  return getDb()
    .select({ card: cards, schedule: cardSchedules })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(and(eq(decks.userId, input.userId ?? LOCAL_USER_ID), dueCondition()))
    .orderBy(
      // Scheduled cards first (earliest due wins), new cards last.
      asc(sql`${cardSchedules.dueAt} is null`),
      asc(cardSchedules.dueAt),
      asc(cards.createdAt)
    )
    .limit(input.limit ?? DEFAULT_DUE_QUEUE_LIMIT);
}

export async function countDueCardsByDeck(
  userId: string = LOCAL_USER_ID
): Promise<DeckDueCount[]> {
  return getDb()
    .select({ deckId: decks.id, dueCount: sql<number>`count(*)::int` })
    .from(decks)
    .innerJoin(cards, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(and(eq(decks.userId, userId), dueCondition()))
    .groupBy(decks.id);
}

export async function getCardSchedule(
  cardId: string
): Promise<CardSchedule | undefined> {
  const [schedule] = await getDb()
    .select()
    .from(cardSchedules)
    .where(eq(cardSchedules.cardId, cardId));
  return schedule;
}

export async function upsertCardSchedule(
  cardId: string,
  state: ScheduleState
): Promise<CardSchedule> {
  const [schedule] = await getDb()
    .insert(cardSchedules)
    .values({ cardId, ...state })
    .onConflictDoUpdate({ target: cardSchedules.cardId, set: state })
    .returning();
  return schedule;
}

export async function openStudySession(): Promise<StudySession> {
  const [session] = await getDb().insert(studySessions).values({}).returning();
  return session;
}

export async function getStudySession(
  sessionId: string
): Promise<StudySession | undefined> {
  const [session] = await getDb()
    .select()
    .from(studySessions)
    .where(eq(studySessions.id, sessionId));
  return session;
}

export async function closeStudySession(
  sessionId: string,
  cardsReviewed: number
): Promise<StudySession | undefined> {
  const [session] = await getDb()
    .update(studySessions)
    .set({ endedAt: new Date(), cardsReviewed })
    .where(eq(studySessions.id, sessionId))
    .returning();
  return session;
}

export async function appendReviewLog(
  input: AppendReviewLogInput
): Promise<ReviewLog> {
  if (!isValidReviewGrade(input.grade)) {
    throw new RangeError(
      `Review grade must be between ${ReviewGrade.FORGOT} (FORGOT) and ${ReviewGrade.PERFECT} (PERFECT), received: ${input.grade}`
    );
  }
  const [log] = await getDb().insert(reviewLogs).values(input).returning();
  return log;
}

export async function listReviewLogsByCard(
  cardId: string
): Promise<ReviewLog[]> {
  return getDb()
    .select()
    .from(reviewLogs)
    .where(eq(reviewLogs.cardId, cardId))
    .orderBy(asc(reviewLogs.reviewedAt));
}
