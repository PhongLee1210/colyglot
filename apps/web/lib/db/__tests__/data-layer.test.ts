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

const USER_ID = "user-a";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

async function createDeckWithCard(hanzi = "你好", userId = USER_ID) {
  const deck = await createDeck(userId, { name: "Test Deck" });
  const card = await createCard(userId, {
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
  if (!card) {
    throw new Error("test setup failed: card was not created");
  }
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

  test("createDeck applies language-pair defaults and the owner", async () => {
    const deck = await createDeck(USER_ID, { name: "Chinese Starter" });

    expect(deck.id).toBeDefined();
    expect(deck.sourceLang).toBe("zh");
    expect(deck.targetLang).toBe("vi");
    expect(deck.userId).toBe(USER_ID);
  });

  test("createCard rejects duplicate hanzi within a deck", async () => {
    const { deck } = await createDeckWithCard();

    await expect(
      createCard(USER_ID, {
        deckId: deck.id,
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        translation: "duplicate",
      })
    ).rejects.toThrow();
  });

  test("getDueQueue returns new cards and hides cards scheduled for tomorrow", async () => {
    const { card } = await createDeckWithCard();

    const beforeReview = await getDueQueue(USER_ID);
    expect(beforeReview.map((item) => item.card.id)).toContain(card.id);
    expect(
      beforeReview.find((item) => item.card.id === card.id)?.schedule
    ).toBeNull();

    await upsertCardSchedule(
      USER_ID,
      card.id,
      passedReviewState(new Date(Date.now() + ONE_DAY_MS))
    );

    const afterReview = await getDueQueue(USER_ID);
    expect(afterReview.map((item) => item.card.id)).not.toContain(card.id);
  });

  test("upsertCardSchedule overwrites the previous state", async () => {
    const { card } = await createDeckWithCard();

    await upsertCardSchedule(
      USER_ID,
      card.id,
      passedReviewState(new Date(Date.now() + ONE_DAY_MS))
    );
    const forgotten = await upsertCardSchedule(USER_ID, card.id, {
      easeFactor: 2.2,
      intervalDays: 0,
      dueAt: new Date(),
      reviewCount: 2,
      consecutiveCorrect: 0,
      lapses: 1,
      lastReviewedAt: new Date(),
    });

    expect(forgotten?.easeFactor).toBe(2.2);
    expect(forgotten?.lapses).toBe(1);
    expect((await getDueQueue(USER_ID)).map((item) => item.card.id)).toContain(
      card.id
    );
  });

  test("appendReviewLog rejects grades outside 1–5", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession(USER_ID);

    await expect(
      appendReviewLog(USER_ID, {
        cardId: card.id,
        sessionId: session.id,
        grade: 6 as unknown as ReviewGrade,
      })
    ).rejects.toThrow(RangeError);
  });

  test("review history accumulates and the session closes with counts", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession(USER_ID);

    await appendReviewLog(USER_ID, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
    });
    await appendReviewLog(USER_ID, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.FORGOT,
    });

    const logs = await listReviewLogsByCard(USER_ID, card.id);
    expect(logs.map((log) => log.grade)).toEqual([
      ReviewGrade.GOOD,
      ReviewGrade.FORGOT,
    ]);

    const closed = await closeStudySession(USER_ID, session.id, 2);
    expect(closed?.endedAt).not.toBeNull();
    expect(closed?.cardsReviewed).toBe(2);
  });

  test("saveCardRecording replaces the previous take", async () => {
    const { card } = await createDeckWithCard();

    await saveCardRecording(USER_ID, {
      cardId: card.id,
      storagePath: "card-takes/first.webm",
      durationMs: 1200,
    });
    await saveCardRecording(USER_ID, {
      cardId: card.id,
      storagePath: "card-takes/second.webm",
      durationMs: 800,
    });

    const recording = await getCardRecording(USER_ID, card.id);
    expect(recording?.storagePath).toBe("card-takes/second.webm");
    expect(recording?.durationMs).toBe(800);
  });

  test("countDueCardsByDeck lists only decks with due or new cards", async () => {
    const { deck } = await createDeckWithCard();
    const { deck: otherDeck } = await createDeckWithCard("谢谢");

    await upsertCardSchedule(
      USER_ID,
      (await listCards(USER_ID, deck.id))[0].id,
      passedReviewState(new Date(Date.now() + ONE_DAY_MS))
    );

    const counts = await countDueCardsByDeck(USER_ID);
    expect(counts).toEqual([{ deckId: otherDeck.id, dueCount: 1 }]);
  });

  test("deleteDeck cascades to cards, schedules, logs and recordings", async () => {
    const { deck, card } = await createDeckWithCard();
    const session = await openStudySession(USER_ID);
    await upsertCardSchedule(USER_ID, card.id, passedReviewState(new Date()));
    await appendReviewLog(USER_ID, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.EASY,
    });
    await saveCardRecording(USER_ID, {
      cardId: card.id,
      storagePath: "card-takes/take.webm",
    });

    expect(await deleteDeck(USER_ID, deck.id)).toBe(true);
    expect(await deleteDeck(USER_ID, deck.id)).toBe(false);
    expect(await listCards(USER_ID, deck.id)).toEqual([]);
    expect(await getCardRecording(USER_ID, card.id)).toBeUndefined();
    expect(await listReviewLogsByCard(USER_ID, card.id)).toEqual([]);
  });

  test("getCurrentStreak derives consecutive days from review logs", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession(USER_ID);
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

    expect(await getCurrentStreak(USER_ID, NOW)).toBe(2);
    expect(
      await getCurrentStreak(USER_ID, new Date("2026-09-26T12:00:00Z"))
    ).toBe(0);
  });

  test("getSessionReviewSummary buckets grades and closes with counts", async () => {
    const { card } = await createDeckWithCard();
    const session = await openStudySession(USER_ID);

    await appendReviewLog(USER_ID, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.FORGOT,
    });
    await appendReviewLog(USER_ID, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
    });
    await appendReviewLog(USER_ID, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.PERFECT,
    });
    await closeStudySession(USER_ID, session.id, 2);

    const summary = await getSessionReviewSummary(USER_ID, session.id);
    expect(summary?.totalReviews).toBe(3);
    expect(summary?.againCount).toBe(1);
    expect(summary?.goodCount).toBe(1);
    expect(summary?.easyCount).toBe(1);
    expect(summary?.cardsReviewed).toBe(2);
    expect(summary?.endedAt).not.toBeNull();
  });
});
