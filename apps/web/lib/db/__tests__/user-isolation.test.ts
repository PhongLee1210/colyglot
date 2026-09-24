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

import {
  createCard,
  createDeck,
  deleteCard,
  deleteCardRecording,
  deleteDeck,
  getCard,
  getCardRecording,
  getDeck,
  listCards,
  listDecks,
  renameDeck,
  saveCardRecording,
  updateCard,
} from "../repositories/content";
import {
  appendReviewLog,
  closeStudySession,
  countDueCardsByDeck,
  getCardSchedule,
  getCurrentStreak,
  getDueQueue,
  getStudySession,
  openStudySession,
  upsertCardSchedule,
} from "../repositories/study";
import { ReviewGrade } from "../schema";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER_A = "user-a";
const USER_B = "user-b";

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

describeIntegration("user isolation", () => {
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

  test("user B never sees user A's decks and cards", async () => {
    const { deck, card } = await createOwnedDeckWithCard();

    expect(await listDecks(USER_B)).toEqual([]);
    expect(await getDeck(USER_B, deck.id)).toBeUndefined();
    expect(await getCard(USER_B, card.id)).toBeUndefined();
    expect(await listCards(USER_B, deck.id)).toEqual([]);

    expect(await getDeck(USER_A, deck.id)).toBeDefined();
    expect(await getCard(USER_A, card.id)).toBeDefined();
  });

  test("user B cannot mutate user A's decks and cards", async () => {
    const { deck, card } = await createOwnedDeckWithCard();

    expect(await renameDeck(USER_B, deck.id, "Hijacked")).toBeUndefined();
    expect(await deleteDeck(USER_B, deck.id)).toBe(false);
    expect(
      await updateCard(USER_B, card.id, { translation: "hijacked" })
    ).toBeUndefined();
    expect(await deleteCard(USER_B, card.id)).toBe(false);

    const deckAfter = await getDeck(USER_A, deck.id);
    const cardAfter = await getCard(USER_A, card.id);
    expect(deckAfter?.name).toBe("Isolation Deck");
    expect(cardAfter?.translation).toBe("xin chào");
  });

  test("user B cannot create cards in user A's deck", async () => {
    const { deck } = await createOwnedDeckWithCard();

    const card = await createCard(USER_B, {
      deckId: deck.id,
      hanzi: "谢谢",
      pinyin: "xiè xie",
      translation: "cảm ơn",
    });

    expect(card).toBeUndefined();
    expect((await listCards(USER_A, deck.id)).length).toBe(1);
  });

  test("user B's due queue and deck counts exclude user A's cards", async () => {
    const { card } = await createOwnedDeckWithCard();

    expect((await getDueQueue(USER_B)).map((i) => i.card.id)).not.toContain(
      card.id
    );
    expect(await countDueCardsByDeck(USER_B)).toEqual([]);
    expect((await getDueQueue(USER_A)).map((i) => i.card.id)).toContain(
      card.id
    );
  });

  test("user B cannot schedule or review user A's cards", async () => {
    const { card } = await createOwnedDeckWithCard();
    const session = await openStudySession(USER_A);

    expect(
      await upsertCardSchedule(USER_B, card.id, {
        easeFactor: 2.5,
        intervalDays: 1,
        dueAt: new Date(),
        reviewCount: 1,
        consecutiveCorrect: 1,
        lapses: 0,
        lastReviewedAt: new Date(),
      })
    ).toBeUndefined();
    expect(await getCardSchedule(USER_B, card.id)).toBeUndefined();

    expect(
      await appendReviewLog(USER_B, {
        cardId: card.id,
        sessionId: session.id,
        grade: ReviewGrade.GOOD,
      })
    ).toBeUndefined();
  });

  test("user B cannot read or close user A's study session", async () => {
    await createOwnedDeckWithCard();
    const session = await openStudySession(USER_A);

    expect(await getStudySession(USER_B, session.id)).toBeUndefined();
    expect(await closeStudySession(USER_B, session.id, 1)).toBeUndefined();
    expect((await getStudySession(USER_A, session.id))?.endedAt).toBeNull();
  });

  test("streaks count only the user's own reviews", async () => {
    const { card } = await createOwnedDeckWithCard();
    const session = await openStudySession(USER_A);

    const log = await appendReviewLog(USER_A, {
      cardId: card.id,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
    });
    expect(log).toBeDefined();

    expect(await getCurrentStreak(USER_A)).toBe(1);
    expect(await getCurrentStreak(USER_B)).toBe(0);
  });

  test("user B cannot read or write user A's card recording", async () => {
    const { card } = await createOwnedDeckWithCard();

    await saveCardRecording(USER_A, {
      cardId: card.id,
      storagePath: "takes/user-a/take.webm",
      durationMs: 900,
    });

    expect(await getCardRecording(USER_B, card.id)).toBeUndefined();
    expect(
      await saveCardRecording(USER_B, {
        cardId: card.id,
        storagePath: "takes/user-b/take.webm",
      })
    ).toBeUndefined();
    expect(await deleteCardRecording(USER_B, card.id)).toBe(false);

    const recording = await getCardRecording(USER_A, card.id);
    expect(recording?.storagePath).toBe("takes/user-a/take.webm");
  });

  test("schema enforces ownership columns", async () => {
    const sessionColumn = await rawClient`
      select is_nullable from information_schema.columns
      where table_name = 'study_sessions' and column_name = 'user_id'
    `;
    expect(sessionColumn[0]?.is_nullable).toBe("NO");

    const deckDefault = await rawClient`
      select column_default from information_schema.columns
      where table_name = 'decks' and column_name = 'user_id'
    `;
    expect(deckDefault[0]?.column_default).toBeNull();

    let decksRejected = false;
    try {
      await rawClient`insert into decks (name) values ('No owner')`;
    } catch {
      decksRejected = true;
    }
    expect(decksRejected).toBe(true);

    let sessionsRejected = false;
    try {
      await rawClient`insert into study_sessions (cards_reviewed) values (0)`;
    } catch {
      sessionsRejected = true;
    }
    expect(sessionsRejected).toBe(true);
  });
});

async function createOwnedDeckWithCard() {
  const deck = await createDeck(USER_A, { name: "Isolation Deck" });
  const card = await createCard(USER_A, {
    deckId: deck.id,
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    translation: "xin chào",
  });
  if (!card) {
    throw new Error("test setup failed: card was not created");
  }
  return { deck, card };
}
