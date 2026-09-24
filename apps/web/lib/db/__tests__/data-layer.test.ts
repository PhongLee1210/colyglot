import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { getDb } from "../index";
import {
  createCard,
  createDeck,
  deleteDeck,
  getCardRecording,
  listCards,
  saveCardRecording,
} from "../repositories/content";
import {
  appendReviewLog,
  closeStudySession,
  countDueCardsByDeck,
  getCurrentStreak,
  getDueQueue,
  getSessionReviewSummary,
  listReviewLogsByCard,
  openStudySession,
  upsertCardSchedule,
  type ScheduleState,
} from "../repositories/study";
import { ReviewGrade, reviewLogs } from "../schema";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

async function createDeckWithCard(hanzi = "你好") {
  const deck = await createDeck({ name: "Test Deck" });
  const card = await createCard({
    deckId: deck.id,
    hanzi,
    pinyin: "nǐ hǎo",
    translation: "xin chào",
    examples: [
      {
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma",
        translation: "Bạn có khỏe không?",
      },
    ],
  });
  return { deck, card };
}

function passedReviewState(dueAt: Date): ScheduleState {
  return {
    easeFactor: 2.5,
    intervalDays: 1,
    dueAt,
    reviewCount: 1,
    consecutiveCorrect: 1,
    lapses: 0,
    lastReviewedAt: new Date(),
  };
}

describeIntegration("data layer round-trip", () => {
  let rawClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    rawClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    await migrate(drizzle(rawClient), { migrationsFolder: MIGRATIONS_FOLDER });
  });

  afterAll(async () => {
    await rawClient?.end();
  });

  beforeEach(async () => {
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings cascade`;
  });

  test("createDeck applies language-pair and user defaults", async () => {
    const deck = await createDeck({ name: "Chinese Starter" });

    expect(deck.id).toBeDefined();
    expect(deck.sourceLang).toBe("zh");
    expect(deck.targetLang).toBe("vi");
    expect(deck.userId).toBe("local");
  });

  test("createCard rejects duplicate hanzi within a deck", async () => {
    const { deck } = await createDeckWithCard();

    await expect(
      createCard({
        deckId: deck.id,
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        translation: "duplicate",
      })
    ).rejects.toThrow();
  });

  test("getDueQueue returns new cards and hides cards scheduled for tomorrow", async () => {
    const { card } = await createDeckWithCard();

    const beforeReview = await getDueQueue();
    expect(beforeReview.map((item) => item.card.id)).toContain(card.id);
    expect(
      beforeReview.find((item) => item.card.id === card.id)?.schedule
    ).toBeNull();

    await upsertCardSchedule(
      card.id,
      passedReviewState(new Date(Date.now() + ONE_DAY_MS))
    );

    const afterReview = await getDueQueue();
    expect(afterReview.map((item) => item.card.id)).not.toContain(card.id);
  });

  test("upsertCardSchedule overwrites the previous state", async () => {
    const { card } = await createDeckWithCard();

    await upsertCardSchedule(
      card.id,
      passedReviewState(new Date(Date.now() + ONE_DAY_MS))
    );
    const forgotten = await upsertCardSchedule(card.id, {
      easeFactor: 2.2,
      intervalDays: 0,
      dueAt: new Date(),
      reviewCount: 2,
      consecutiveCorrect: 0,
      lapses: 1,
      lastReviewedAt: new Date(),
    });

    expect(forgotten.easeFactor).toBe(2.2);
    expect(forgotten.lapses).toBe(1);
    expect((await getDueQueue()).map((item) => item.card.id)).toContain(
      card.id
    );
  });

  test("appendReviewLog rejects grades outside 1–5", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession();

    await expect(
      appendReviewLog({
        cardId: card.id,
        sessionId: session.id,
        grade: 6 as unknown as ReviewGrade,
      })
    ).rejects.toThrow(RangeError);
  });

  test("review history accumulates and the session closes with counts", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession();

    await appendReviewLog({
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
    });
    await appendReviewLog({
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.FORGOT,
    });

    const logs = await listReviewLogsByCard(card.id);
    expect(logs.map((log) => log.grade)).toEqual([
      ReviewGrade.GOOD,
      ReviewGrade.FORGOT,
    ]);

    const closed = await closeStudySession(session.id, 2);
    expect(closed?.endedAt).not.toBeNull();
    expect(closed?.cardsReviewed).toBe(2);
  });

  test("saveCardRecording replaces the previous take", async () => {
    const { card } = await createDeckWithCard();

    await saveCardRecording({
      cardId: card.id,
      storagePath: "card-takes/first.webm",
      durationMs: 1200,
    });
    await saveCardRecording({
      cardId: card.id,
      storagePath: "card-takes/second.webm",
      durationMs: 800,
    });

    const recording = await getCardRecording(card.id);
    expect(recording?.storagePath).toBe("card-takes/second.webm");
    expect(recording?.durationMs).toBe(800);
  });

  test("countDueCardsByDeck lists only decks with due or new cards", async () => {
    const { deck } = await createDeckWithCard();
    const { deck: otherDeck } = await createDeckWithCard("谢谢");

    await upsertCardSchedule(
      (await listCards(deck.id))[0].id,
      passedReviewState(new Date(Date.now() + ONE_DAY_MS))
    );

    const counts = await countDueCardsByDeck();
    expect(counts).toEqual([{ deckId: otherDeck.id, dueCount: 1 }]);
  });

  test("deleteDeck cascades to cards, schedules, logs and recordings", async () => {
    const { deck, card } = await createDeckWithCard();
    const session = await openStudySession();
    await upsertCardSchedule(card.id, passedReviewState(new Date()));
    await appendReviewLog({
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.EASY,
    });
    await saveCardRecording({
      cardId: card.id,
      storagePath: "card-takes/take.webm",
    });

    expect(await deleteDeck(deck.id)).toBe(true);
    expect(await deleteDeck(deck.id)).toBe(false);
    expect(await listCards(deck.id)).toEqual([]);
    expect(await getCardRecording(card.id)).toBeUndefined();
    expect(await listReviewLogsByCard(card.id)).toEqual([]);
  });

  test("getCurrentStreak derives consecutive days from review logs", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession();
    const db = getDb();
    const NOW = new Date("2026-09-24T12:00:00Z");

    await db.insert(reviewLogs).values([
      {
        cardId: card.id,
        sessionId: session.id,
        grade: ReviewGrade.GOOD,
        reviewedAt: new Date("2026-09-23T10:00:00Z"),
      },
      {
        cardId: card.id,
        sessionId: session.id,
        grade: ReviewGrade.EASY,
        reviewedAt: new Date("2026-09-24T01:00:00Z"),
      },
      {
        cardId: card.id,
        sessionId: session.id,
        grade: ReviewGrade.FORGOT,
        reviewedAt: new Date("2026-09-24T22:00:00Z"),
      },
    ]);

    expect(await getCurrentStreak(NOW)).toBe(2);
    expect(await getCurrentStreak(new Date("2026-09-26T12:00:00Z"))).toBe(0);
  });

  test("getSessionReviewSummary buckets grades and closes with counts", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession();

    await appendReviewLog({
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.FORGOT,
    });
    await appendReviewLog({
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
    });
    await appendReviewLog({
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.PERFECT,
    });
    await closeStudySession(session.id, 2);

    const summary = await getSessionReviewSummary(session.id);
    expect(summary?.totalReviews).toBe(3);
    expect(summary?.againCount).toBe(1);
    expect(summary?.goodCount).toBe(1);
    expect(summary?.easyCount).toBe(1);
    expect(summary?.cardsReviewed).toBe(2);
    expect(summary?.endedAt).not.toBeNull();
  });
});
