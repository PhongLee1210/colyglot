import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { isValidReviewGrade, ReviewGrade } from "@colyglot/srs";

import { DUE_SWEEP_LIMIT } from "@/lib/game/types";
import { computeStreak } from "@/lib/streak";
import { getDb } from "../index";
import {
  cards,
  cardSchedules,
  decks,
  reviewLogs,
  studySessions,
  type Card,
  type CardSchedule,
  type ReviewLog,
  type StudySession,
} from "../schema";

export const DEFAULT_DUE_QUEUE_LIMIT = DUE_SWEEP_LIMIT;

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
  // Pre-review memory strength for the farm economy; 0 for legacy callers.
  intervalDaysBefore?: number;
  // Calibration metrics (GAME_PLAY §3.2/§10.4): the raw facts behind the
  // derived grade, persisted for the threshold-tuning loop.
  elapsedMs?: number;
  hesitated?: boolean;
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

function langCondition(sourceLang: string, targetLang: string) {
  return and(
    eq(decks.sourceLang, sourceLang),
    eq(decks.targetLang, targetLang)
  );
}

export async function getDueQueueForLang(
  userId: string,
  sourceLang: string,
  targetLang: string,
  limit: number = DEFAULT_DUE_QUEUE_LIMIT
): Promise<DueQueueItem[]> {
  return getDb()
    .select({ card: cards, schedule: cardSchedules })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        dueCondition()
      )
    )
    .orderBy(
      asc(sql`${cardSchedules.dueAt} is null`),
      asc(cardSchedules.dueAt),
      asc(cards.createdAt)
    )
    .limit(limit);
}

export async function countDueForLang(
  userId: string,
  sourceLang: string,
  targetLang: string
): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        dueCondition()
      )
    );
  return row?.total ?? 0;
}

export async function countFreshForLang(
  userId: string,
  sourceLang: string,
  targetLang: string
): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        isNull(cardSchedules.cardId)
      )
    );
  return row?.total ?? 0;
}

export const FRESH_QUEUE_LIMIT = 20;

export async function listFreshForLang(
  userId: string,
  sourceLang: string,
  targetLang: string,
  limit: number
): Promise<Card[]> {
  return getDb()
    .select({ card: cards })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        isNull(cardSchedules.cardId)
      )
    )
    .orderBy(asc(cards.createdAt))
    .limit(limit)
    .then((rows) => rows.map((row) => row.card));
}

export async function listCardSchedulesForDeck(
  userId: string,
  deckId: string
): Promise<CardSchedule[]> {
  return getDb()
    .select({ schedule: cardSchedules })
    .from(cardSchedules)
    .innerJoin(cards, eq(cardSchedules.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(decks.userId, userId), eq(decks.id, deckId)))
    .then((rows) => rows.map((row) => row.schedule));
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
  const [log] = await getDb()
    .insert(reviewLogs)
    .values({ ...input, intervalDaysBefore: input.intervalDaysBefore ?? 0 })
    .returning();
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

export async function countReviewsSince(
  userId: string,
  since: Date
): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(reviewLogs)
    .innerJoin(studySessions, eq(reviewLogs.sessionId, studySessions.id))
    .where(
      and(eq(studySessions.userId, userId), gte(reviewLogs.reviewedAt, since))
    );
  return row?.total ?? 0;
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
