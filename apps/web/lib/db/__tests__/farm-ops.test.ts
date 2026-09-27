import { ReviewGrade } from "@colyglot/srs";
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

import type { SeedWord } from "@/lib/game/content/types";
import { createCard, createDeck } from "../repositories/content";
import {
  claimSessionHarvest,
  expandFarmBed,
  loadFarmWorldDetail,
  plantSeeds,
  startFarmWorld,
} from "../repositories/farm";
import { appendReviewLog, openStudySession } from "../repositories/study";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER = "farm-ops-user";
const ZH = {
  langKey: "zh-vi",
  sourceLang: "zh",
  targetLang: "vi",
  worldName: "中文 · Việt",
  bedName: "Zh garden",
};
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

function word(hanzi: string): SeedWord {
  return {
    hanzi,
    pinyin: "x",
    translation: "y",
    examples: [],
    collocations: [],
  };
}

describeIntegration("farm bed operations and harvest claim", () => {
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
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds cascade`;
  });

  async function gardenBedId(): Promise<string> {
    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    if (!detail) throw new Error("world missing");
    return detail.beds[0].id;
  }

  test("plantSeeds fills free slots and skips duplicates", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();

    const result = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("谢谢"),
    ]);
    expect(result!.planted.map((p) => p.hanzi)).toEqual(["你好", "谢谢"]);
    expect(result!.skipped).toEqual([]);

    const dup = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("再见"),
    ]);
    expect(dup!.planted.map((p) => p.hanzi)).toEqual(["再见"]);
    expect(dup!.skipped).toEqual(["你好"]);
  });

  test("plantSeeds reports bed full", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一", "二", "三", "四", "五", "六"].map(word)
    );
    const result = await plantSeeds(USER, "zh-vi", bedId, [word("七")]);
    expect(result!.bedFull).toBe(true);
    expect(result!.planted).toEqual([]);
  });

  test("plantSeeds returns undefined for another user's bed", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    expect(
      await plantSeeds("other-user", "zh-vi", bedId, [word("你好")])
    ).toBeUndefined();
  });

  test("expandFarmBed charges gold atomically", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();

    const first = await expandFarmBed(USER, bedId);
    expect(first).toEqual({ plotCount: 9, gold: 20 });

    const second = await expandFarmBed(USER, bedId); // costs 40 > 20 remaining
    expect(second).toBe("insufficient");
  });

  test("claimSessionHarvest pays per-grade gold once, scoped to language", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("谢谢"),
    ]);
    const zhCardId = planted!.planted[0].cardId;

    const enDeck = await createDeck(USER, {
      name: "en",
      sourceLang: "en",
      targetLang: "vi",
    });
    const enCard = await createCard(USER, {
      deckId: enDeck.id,
      hanzi: "hello",
      pinyin: "x",
      translation: "y",
      examples: [],
      collocations: [],
    });

    const session = await openStudySession(USER);
    await appendReviewLog(USER, {
      cardId: zhCardId,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
      intervalDaysBefore: 6,
    });
    await appendReviewLog(USER, {
      cardId: enCard!.id,
      sessionId: session.id,
      grade: ReviewGrade.PERFECT,
      intervalDaysBefore: 30,
    });

    const claim = await claimSessionHarvest(USER, session.id, "zh-vi");
    expect(claim).toEqual({
      alreadyClaimed: false,
      goldAwarded: 8,
      cardsHarvested: 1,
      gold: 48,
    });

    const reClaim = await claimSessionHarvest(USER, session.id, "zh-vi");
    expect(reClaim!.alreadyClaimed).toBe(true);
    expect(reClaim!.gold).toBe(48);
  }, 15_000);

  test("same-session requeues are learning steps: gold pays once per card", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("谢谢"),
    ]);
    const lapsedCard = planted!.planted[0].cardId;
    const steadyCard = planted!.planted[1].cardId;

    const session = await openStudySession(USER);
    await appendReviewLog(USER, {
      cardId: lapsedCard,
      sessionId: session.id,
      grade: ReviewGrade.FORGOT,
      intervalDaysBefore: 0,
    });
    // The requeued card comes back in the same session; remembering it now
    // must not pay a second, larger reward.
    await appendReviewLog(USER, {
      cardId: lapsedCard,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
      intervalDaysBefore: 30,
    });
    await appendReviewLog(USER, {
      cardId: steadyCard,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
      intervalDaysBefore: 6,
    });

    const claim = await claimSessionHarvest(USER, session.id, "zh-vi");
    // FORGOT on a fresh card = 1, GOOD relearn = 0, steady GOOD = 8.
    expect(claim!.goldAwarded).toBe(9);
    expect(claim!.cardsHarvested).toBe(2);
  }, 15_000);
});
