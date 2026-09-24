import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

import { computeStreak } from "@/lib/streak";
import { getDb } from "../index";
import {
  cards,
  cardSchedules,
  decks,
  DEFAULT_DUE_QUEUE_LIMIT,
  isValidReviewGrade,
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

function ownedCardCondition(cardId: string, userId: string) {
  return and(
    eq(cards.id, cardId),
    sql`exists (select 1 from ${decks} where ${decks.id} = ${cards.deckId} and ${decks.userId} = ${userId})`
  );
}

export async function getDueQueue(
  userId: string,
  limit: number = DEFAULT_DUE_QUEUE_LIMIT
): Promise<DueQueueItem[]> {
  return getDb()
    .select({ card: cards, schedule: cardSchedules })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(and(eq(decks.userId, userId), dueCondition()))
    .orderBy(
      // Scheduled cards first (earliest due wins), new cards last.
      asc(sql`${cardSchedules.dueAt} is null`),
      asc(cardSchedules.dueAt),
      asc(cards.createdAt)
    )
    .limit(limit);
}

export async function countDueCardsByDeck(
  userId: string
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
  userId: string,
  cardId: string
): Promise<CardSchedule | undefined> {
  const [row] = await getDb()
    .select({ schedule: cardSchedules })
    .from(cardSchedules)
    .innerJoin(cards, eq(cardSchedules.cardId, cards.id))
    .where(ownedCardCondition(cardId, userId))
    .limit(1);
  return row?.schedule;
}

export async function upsertCardSchedule(
  userId: string,
  cardId: string,
  state: ScheduleState
): Promise<CardSchedule | undefined> {
  const owned = await getCardSchedule(userId, cardId);
  if (!owned && !(await cardBelongsToUser(userId, cardId))) {
    return undefined;
  }
  const [schedule] = await getDb()
    .insert(cardSchedules)
    .values({ cardId, ...state })
    .onConflictDoUpdate({ target: cardSchedules.cardId, set: state })
    .returning();
  return schedule;
}

async function cardBelongsToUser(userId: string, cardId: string) {
  const [card] = await getDb()
    .select({ id: cards.id })
    .from(cards)
    .where(ownedCardCondition(cardId, userId))
    .limit(1);
  return Boolean(card);
}

export async function openStudySession(userId: string): Promise<StudySession> {
  const [session] = await getDb()
    .insert(studySessions)
    .values({ userId })
    .returning();
  return session;
}

export async function getStudySession(
  userId: string,
  sessionId: string
): Promise<StudySession | undefined> {
  const [session] = await getDb()
    .select()
    .from(studySessions)
    .where(
      and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId))
    );
  return session;
}

export async function closeStudySession(
  userId: string,
  sessionId: string,
  cardsReviewed: number
): Promise<StudySession | undefined> {
  const [session] = await getDb()
    .update(studySessions)
    .set({ endedAt: new Date(), cardsReviewed })
    .where(
      and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId))
    )
    .returning();
  return session;
}

export async function appendReviewLog(
  userId: string,
  input: AppendReviewLogInput
): Promise<ReviewLog | undefined> {
  if (!isValidReviewGrade(input.grade)) {
    throw new RangeError(
      `Review grade must be between ${ReviewGrade.FORGOT} (FORGOT) and ${ReviewGrade.PERFECT} (PERFECT), received: ${input.grade}`
    );
  }
  const cardOwned = await cardBelongsToUser(userId, input.cardId);
  const session = await getStudySession(userId, input.sessionId);
  if (!cardOwned || !session) {
    return undefined;
  }
  const [log] = await getDb().insert(reviewLogs).values(input).returning();
  return log;
}

export async function listReviewLogsByCard(
  userId: string,
  cardId: string
): Promise<ReviewLog[]> {
  const owned = await cardBelongsToUser(userId, cardId);
  if (!owned) {
    return [];
  }
  return getDb()
    .select()
    .from(reviewLogs)
    .where(eq(reviewLogs.cardId, cardId))
    .orderBy(asc(reviewLogs.reviewedAt));
}

export async function getCurrentStreak(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const rows = await getDb()
    .selectDistinct({
      day: sql<string>`to_char(${reviewLogs.reviewedAt} at time zone 'utc', 'YYYY-MM-DD')`,
    })
    .from(reviewLogs)
    .innerJoin(studySessions, eq(reviewLogs.sessionId, studySessions.id))
    .where(eq(studySessions.userId, userId));
  return computeStreak(
    rows.map((row) => row.day),
    now
  );
}

export type SessionReviewSummary = {
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  cardsReviewed: number;
  totalReviews: number;
  againCount: number;
  goodCount: number;
  easyCount: number;
};

export async function getSessionReviewSummary(
  userId: string,
  sessionId: string
): Promise<SessionReviewSummary | undefined> {
  const [row] = await getDb()
    .select({
      session: studySessions,
      total: sql<number>`count(*)::int`,
      againCount: sql<number>`count(*) filter (where ${reviewLogs.grade} <= ${ReviewGrade.HARD})::int`,
      goodCount: sql<number>`count(*) filter (where ${reviewLogs.grade} = ${ReviewGrade.GOOD})::int`,
      easyCount: sql<number>`count(*) filter (where ${reviewLogs.grade} >= ${ReviewGrade.EASY})::int`,
    })
    .from(studySessions)
    .leftJoin(reviewLogs, eq(reviewLogs.sessionId, studySessions.id))
    .where(
      and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId))
    )
    .groupBy(studySessions.id);

  if (!row) {
    return undefined;
  }
  return {
    sessionId: row.session.id,
    startedAt: row.session.startedAt,
    endedAt: row.session.endedAt,
    cardsReviewed: row.session.cardsReviewed,
    totalReviews: row.total,
    againCount: row.againCount,
    goodCount: row.goodCount,
    easyCount: row.easyCount,
  };
}
