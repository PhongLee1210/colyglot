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

import { DEFAULT_MUSIC_VOLUME } from "@/lib/game/music";
import { ReviewGrade } from "@colyglot/srs";
import { getDb } from "../index";
import { createCard, listDecks } from "../repositories/content";
import { listDeckProgress } from "../repositories/deck-progress";
import { startFarmWorld } from "../repositories/farm";
import {
  appendReviewLog,
  getCardSchedule,
  openStudySession,
  upsertCardSchedule,
} from "../repositories/study";
import { resetUserData } from "../repositories/user-data";
import {
  getMusicSettings,
  upsertMusicSettings,
} from "../repositories/user-settings";
import { farmBeds, farmPlots, farmWorlds } from "../schema";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER_A = "reset-user-a";
const USER_B = "reset-user-b";

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

describeIntegration("resetUserData", () => {
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
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, farm_worlds, deck_progress, user_settings cascade`;
  });

  test("wipes every table owned by the user and leaves others intact", async () => {
    const seed = async (userId: string) => {
      await startFarmWorld(userId, {
        langKey: "zh-vi",
        sourceLang: "zh",
        targetLang: "vi",
        worldName: `${userId} world`,
        bedName: `${userId} garden`,
      });
      const [deck] = await listDecks(userId);
      const card = await createCard(userId, {
        deckId: deck.id,
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        translation: "xin chào",
        examples: [],
      });
      const session = await openStudySession(userId);
      await upsertCardSchedule(userId, card!.id, {
        easeFactor: 2.5,
        intervalDays: 1,
        dueAt: new Date(),
        reviewCount: 1,
        consecutiveCorrect: 1,
        lapses: 0,
        lastReviewedAt: new Date(),
      });
      await appendReviewLog(userId, {
        cardId: card!.id,
        sessionId: session.id,
        grade: ReviewGrade.GOOD,
      });
      await upsertMusicSettings(userId, { musicVolume: 55, musicMuted: true });
      return { deckId: deck.id, cardId: card!.id };
    };

    const seededA = await seed(USER_A);
    const seededB = await seed(USER_B);

    await resetUserData(USER_A);

    expect(await listDecks(USER_A)).toHaveLength(0);
    expect(await getCardSchedule(USER_A, seededA.cardId)).toBeUndefined();
    expect(await listDeckProgress(USER_A)).toHaveLength(0);
    expect(await getMusicSettings(USER_A)).toEqual({
      musicVolume: DEFAULT_MUSIC_VOLUME,
      musicMuted: false,
    });

    const [worldA] = await getDb().select().from(farmWorlds);
    expect(worldA.userId).toBe(USER_B);

    const orphanedChildren = await rawClient`
      select
        (select count(*) from review_logs where card_id = ${seededA.cardId}) as logs,
        (select count(*) from card_schedules where card_id = ${seededA.cardId}) as schedules,
        (select count(*) from farm_beds where deck_id = ${seededA.deckId}) as beds,
        (select count(*) from farm_plots where bed_id in (select id from farm_beds)) as plots
    `;
    expect(Number(orphanedChildren[0].logs)).toBe(0);
    expect(Number(orphanedChildren[0].schedules)).toBe(0);
    expect(Number(orphanedChildren[0].beds)).toBe(0);

    expect(await listDecks(USER_B)).toHaveLength(1);
    expect(await getCardSchedule(USER_B, seededB.cardId)).toBeDefined();
    const beds = await getDb().select().from(farmBeds);
    expect(beds).toHaveLength(1);
    expect(beds[0].deckId).toBe(seededB.deckId);
    expect(await getDb().select().from(farmPlots)).toHaveLength(0);
  }, 20_000);
});
