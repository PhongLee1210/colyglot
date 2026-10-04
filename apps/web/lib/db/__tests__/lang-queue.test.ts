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

import { createCard, createDeck } from "../repositories/content";
import {
  countDueForLang,
  countFreshForLang,
  getDueQueueForLang,
  listFreshForLang,
} from "../repositories/study";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER = "lang-queue-user";
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

describeIntegration("language-scoped study queries", () => {
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
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds, farm_sweep_days, user_accounts cascade`;
  });

  test("queues are scoped to the language pair", async () => {
    const zhDeck = await createDeck(USER, {
      name: "zh deck",
      sourceLang: "zh",
      targetLang: "vi",
    });
    const enDeck = await createDeck(USER, {
      name: "en deck",
      sourceLang: "en",
      targetLang: "vi",
    });
    const zhCard = await createCard(USER, {
      deckId: zhDeck.id,
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      translation: "xin chào",
      examples: [],
      collocations: [],
    });
    await createCard(USER, {
      deckId: enDeck.id,
      hanzi: "hello",
      pinyin: "hello",
      translation: "xin chào",
      examples: [],
      collocations: [],
    });

    const queue = await getDueQueueForLang(USER, "zh", "vi");
    expect(queue).toHaveLength(1);
    expect(queue[0].card.id).toBe(zhCard!.id);
    expect(await countDueForLang(USER, "zh", "vi")).toBe(1);
    expect(await countDueForLang(USER, "en", "vi")).toBe(1);

    const fresh = await listFreshForLang(USER, "zh", "vi", 10);
    expect(fresh.map((card) => card.hanzi)).toEqual(["你好"]);
    expect(await countFreshForLang(USER, "zh", "vi")).toBe(1);
  });
});
