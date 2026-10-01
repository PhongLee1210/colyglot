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

import { LANG_PACKS } from "@/lib/game/content";
import type { SeedWord } from "@/lib/game/content/types";
import type { FarmWorldSnapshot } from "@/lib/game/types";
import { createCard, createDeck } from "../repositories/content";
import {
  applyFarmReviewHooks,
  claimSessionHarvest,
  expandFarmBed,
  getSweepStreak,
  loadFarmWorldDetail,
  plantSeeds,
  purchaseItem,
  recordSweepDay,
  startFarmWorld,
  unlockRegion,
} from "../repositories/farm";
import {
  appendReviewLog,
  openStudySession,
  upsertCardSchedule,
} from "../repositories/study";

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
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds, farm_sweep_days cascade`;
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
  }, 15_000);

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
  }, 15_000);

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
    // The planted card has no schedule row in this fixture, so it still
    // reads as due after the claim: no sweep day, no streak, no bonus.
    expect(claim).toMatchObject({
      alreadyClaimed: false,
      goldAwarded: 8,
      streakBonus: 0,
      streak: 0,
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

  test("a word crossing 21 days graduates: plot freed, forest gains a tree", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [word("你好")]);
    const cardId = planted!.planted[0].cardId;

    // The committed review pushed the interval past the graduation mark.
    await upsertCardSchedule(USER, cardId, {
      easeFactor: 2.5,
      intervalDays: 24,
      dueAt: new Date(Date.now() + 24 * 86_400_000),
      reviewCount: 5,
      consecutiveCorrect: 5,
      lapses: 0,
      lastReviewedAt: new Date(),
    });

    const event = await applyFarmReviewHooks(USER, cardId, {
      intervalDaysBefore: 15,
      newIntervalDays: 24,
      grade: ReviewGrade.GOOD,
    });
    expect(event).toMatchObject({
      type: "graduation",
      hanzi: "你好",
      intervalDays: 24,
    });

    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    expect(detail!.beds[0].plots[0].cardId).toBeNull();
    expect(detail!.forest).toHaveLength(1);
    expect(detail!.forest[0]).toMatchObject({
      hanzi: "你好",
      intervalDays: 24,
    });
  }, 15_000);

  test("a lapsed forest word demotes back into a free plot", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [word("你好")]);
    const cardId = planted!.planted[0].cardId;

    // Graduate first, then the schedule resets on a FORGOT review.
    await applyFarmReviewHooks(USER, cardId, {
      intervalDaysBefore: 15,
      newIntervalDays: 24,
      grade: ReviewGrade.GOOD,
    });
    const event = await applyFarmReviewHooks(USER, cardId, {
      intervalDaysBefore: 24,
      newIntervalDays: 1,
      grade: ReviewGrade.FORGOT,
    });
    expect(event).toMatchObject({
      type: "demotion",
      hanzi: "你好",
      replanted: true,
      greenhouse: false,
    });

    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    expect(detail!.beds[0].plots[0].hanzi).toBe("你好");
    expect(detail!.forest).toHaveLength(0);
  }, 15_000);

  test("a full farm sends demoted words to the greenhouse, three slots max", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const hanzi = ["一", "二", "三", "四", "五", "六"];
    const planted = await plantSeeds(USER, "zh-vi", bedId, hanzi.map(word));
    const cardOf = (index: number) => planted!.planted[index].cardId;

    // Graduate every word; the garden empties.
    for (let i = 0; i < hanzi.length; i++) {
      await applyFarmReviewHooks(USER, cardOf(i), {
        intervalDaysBefore: 15,
        newIntervalDays: 24,
        grade: ReviewGrade.GOOD,
      });
    }
    // Refill the garden with new plantings, leaving no free plot.
    await plantSeeds(USER, "zh-vi", bedId, [
      word("九"),
      word("十"),
      word("十一"),
      word("十二"),
      word("十三"),
      word("十四"),
    ]);

    const first = await applyFarmReviewHooks(USER, cardOf(0), {
      intervalDaysBefore: 24,
      newIntervalDays: 1,
      grade: ReviewGrade.FORGOT,
    });
    expect(first).toMatchObject({
      type: "demotion",
      replanted: true,
      greenhouse: true,
    });

    await applyFarmReviewHooks(USER, cardOf(1), {
      intervalDaysBefore: 24,
      newIntervalDays: 1,
      grade: ReviewGrade.FORGOT,
    });
    await applyFarmReviewHooks(USER, cardOf(2), {
      intervalDaysBefore: 24,
      newIntervalDays: 1,
      grade: ReviewGrade.FORGOT,
    });

    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    const greenhouse = detail!.beds.find((bed) => bed.kind === "greenhouse");
    expect(greenhouse).toBeDefined();
    expect(greenhouse!.plots.filter((plot) => plot.hanzi)).toHaveLength(3);
    expect(greenhouse!.plotCount).toBe(3);

    // The fourth demotion overflows the greenhouse but never throws.
    const overflow = await applyFarmReviewHooks(USER, cardOf(3), {
      intervalDaysBefore: 24,
      newIntervalDays: 1,
      grade: ReviewGrade.FORGOT,
    });
    expect(overflow).toMatchObject({ type: "demotion", replanted: false });
  }, 30_000);

  test("the first tree graduates at 15 days exactly once (GAME_PLAY §10.2)", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [
      word("一"),
      word("二"),
    ]);

    // First word of a virgin world: 15 days is enough.
    const first = await applyFarmReviewHooks(USER, planted!.planted[0].cardId, {
      intervalDaysBefore: 6,
      newIntervalDays: 15,
      grade: ReviewGrade.GOOD,
    });
    expect(first).toMatchObject({ type: "graduation", intervalDays: 15 });

    // A real graduation follows a committed review — the schedule row the
    // Forest view joins on exists.
    await upsertCardSchedule(USER, planted!.planted[0].cardId, {
      easeFactor: 2.5,
      intervalDays: 15,
      dueAt: new Date(Date.now() + 15 * 86_400_000),
      reviewCount: 4,
      consecutiveCorrect: 4,
      lapses: 0,
      lastReviewedAt: new Date(),
    });

    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    // The 15-day tree IS in the Forest — membership is the marker, not a
    // derived >= 21 filter.
    expect(detail!.forest).toHaveLength(1);
    expect(detail!.forest[0]).toMatchObject({ hanzi: "一", intervalDays: 15 });
    expect(detail!.world.stats.firstGraduation).toBe(true);

    // The exception is spent: the second word at 15 does NOT graduate…
    const second = await applyFarmReviewHooks(
      USER,
      planted!.planted[1].cardId,
      { intervalDaysBefore: 6, newIntervalDays: 15, grade: ReviewGrade.GOOD }
    );
    expect(second).toBeNull();
    // …but 21 still does.
    const later = await applyFarmReviewHooks(USER, planted!.planted[1].cardId, {
      intervalDaysBefore: 15,
      newIntervalDays: 21,
      grade: ReviewGrade.GOOD,
    });
    expect(later).toMatchObject({ type: "graduation" });
  }, 20_000);

  test("FORGOT on a 15-day forest tree demotes on the marker, not the interval", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [word("一")]);
    const cardId = planted!.planted[0].cardId;

    await applyFarmReviewHooks(USER, cardId, {
      intervalDaysBefore: 6,
      newIntervalDays: 15,
      grade: ReviewGrade.GOOD,
    });
    // 15 < 21: the old interval-based demotion check would have missed it.
    const event = await applyFarmReviewHooks(USER, cardId, {
      intervalDaysBefore: 15,
      newIntervalDays: 1,
      grade: ReviewGrade.FORGOT,
    });
    expect(event).toMatchObject({
      type: "demotion",
      replanted: true,
      greenhouse: false,
    });
    expect((await loadFarmWorldDetail(USER, "zh-vi"))!.forest).toHaveLength(0);
  }, 15_000);

  describe("region unlock (GAME_PLAY §5.3)", () => {
    test("homestead is unlocked from the start; market gates on trees first", async () => {
      await startFarmWorld(USER, ZH);
      const detail = await loadFarmWorldDetail(USER, "zh-vi");
      expect(detail!.regions).toHaveLength(2);
      expect(detail!.regions[0]).toMatchObject({
        key: "homestead",
        unlocked: true,
      });
      expect(detail!.regions[1]).toMatchObject({
        key: "market",
        unlocked: false,
        treesGateMet: false,
      });

      // 40 starting gold < 1200, and no forest trees: the tree gate
      // reports first because trees cannot be bought.
      const rejected = await unlockRegion(USER, "zh-vi", "market");
      expect(rejected).toBe("trees-gate");
    }, 15_000);

    test("market rejects without gold even at 25 trees, then unlocks once", async () => {
      await startFarmWorld(USER, ZH);
      const bedId = await gardenBedId();
      // 25 forest trees: plant a bed's worth, graduate it (freeing every
      // plot), plant the next batch — the real path a player takes.
      const hanzi = [
        "一",
        "二",
        "三",
        "四",
        "五",
        "六",
        "七",
        "八",
        "九",
        "十",
        "十一",
        "十二",
        "十三",
        "十四",
        "十五",
        "十六",
        "十七",
        "十八",
        "十九",
        "二十",
        "廿一",
        "廿二",
        "廿三",
        "廿四",
        "廿五",
      ];
      let graduated = 0;
      let cursor = 0;
      while (graduated < 25) {
        const batch = hanzi.slice(cursor, cursor + 6).map(word);
        cursor += batch.length;
        const planted = await plantSeeds(USER, "zh-vi", bedId, batch);
        for (const entry of planted!.planted) {
          await applyFarmReviewHooks(USER, entry.cardId, {
            intervalDaysBefore: 15,
            // The first tree crosses at 15 (§10.2), every later one at
            // 21 — 24 clears both.
            newIntervalDays: 24,
            grade: ReviewGrade.GOOD,
          });
          graduated += 1;
        }
      }

      // Starting gold (40) < 1200 with trees satisfied.
      expect(await unlockRegion(USER, "zh-vi", "market")).toBe(
        "insufficient-gold"
      );

      await rawClient`update farm_worlds set gold = 2000 where user_id = ${USER} and lang_key = 'zh-vi'`;

      const result = await unlockRegion(USER, "zh-vi", "market");
      expect(result).toMatchObject({ world: { gold: 800 } });
      const snapshot = result as FarmWorldSnapshot;
      const market = snapshot.beds.find((bed) => bed.regionKey === "market");
      expect(market).toBeDefined();
      expect(market!.plotCount).toBe(12);
      expect(snapshot.regions[1]).toMatchObject({
        key: "market",
        unlocked: true,
        treesGateMet: true,
      });

      // Second attempt: already unlocked, nothing charged again.
      expect(await unlockRegion(USER, "zh-vi", "market")).toBe(
        "already-unlocked"
      );
      const after = await loadFarmWorldDetail(USER, "zh-vi");
      expect(after!.world.gold).toBe(800);
      expect(
        after!.beds.filter((bed) => bed.regionKey === "market")
      ).toHaveLength(1);
    }, 240_000);

    test("mastering a region grants its stone plaque once (GAME_PLAY §7)", async () => {
      await startFarmWorld(USER, ZH);
      const bedId = await gardenBedId();
      const greetings =
        LANG_PACKS[ZH.langKey].packs.find((pack) => pack.key === "greetings")
          ?.words ?? [];
      // 80% of the greetings topic grown into trees masters homestead.
      const needed = Math.ceil(greetings.length * 0.8);
      let graduated = 0;
      let cursor = 0;
      while (graduated < needed) {
        const batch = greetings.slice(cursor, cursor + 6);
        cursor += batch.length;
        const planted = await plantSeeds(USER, "zh-vi", bedId, batch);
        for (const entry of planted!.planted) {
          // The committed review that pushes a word to tree age always
          // writes its schedule first — the Forest view joins on it.
          await upsertCardSchedule(USER, entry.cardId, {
            easeFactor: 2.5,
            intervalDays: 24,
            dueAt: new Date(Date.now() + 24 * 86_400_000),
            reviewCount: 5,
            consecutiveCorrect: 5,
            lapses: 0,
            lastReviewedAt: new Date(),
          });
          await applyFarmReviewHooks(USER, entry.cardId, {
            intervalDaysBefore: 15,
            newIntervalDays: 24,
            grade: ReviewGrade.GOOD,
          });
          graduated += 1;
        }
      }

      const first = await loadFarmWorldDetail(USER, "zh-vi");
      const homestead = first!.regions.find(
        (region) => region.key === "homestead"
      );
      expect(homestead).toMatchObject({ mastered: true });
      const plaque = first!.items.find(
        (item) => item.itemKey === "plaque_homestead"
      );
      expect(plaque?.qty).toBe(1);

      // The plaque is earned history: reloading never mints a second.
      const second = await loadFarmWorldDetail(USER, "zh-vi");
      expect(
        second!.items.filter((item) => item.itemKey === "plaque_homestead")
      ).toHaveLength(1);
    }, 120_000);
  });

  test("clearing the farm records a sweep day and pays the streak bonus", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [word("你好")]);
    const cardId = planted!.planted[0].cardId;

    // The review committed and moved the word out of the due queue.
    await upsertCardSchedule(USER, cardId, {
      easeFactor: 2.5,
      intervalDays: 6,
      dueAt: new Date(Date.now() + 6 * 86_400_000),
      reviewCount: 2,
      consecutiveCorrect: 2,
      lapses: 0,
      lastReviewedAt: new Date(),
    });
    // Two earlier sweep days put today's sweep at a 3-day streak.
    const DAY = 86_400_000;
    await recordSweepDay(USER, "zh-vi", new Date(Date.now() - 2 * DAY));
    await recordSweepDay(USER, "zh-vi", new Date(Date.now() - DAY));

    const session = await openStudySession(USER);
    await appendReviewLog(USER, {
      cardId,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
      intervalDaysBefore: 6,
    });

    const claim = await claimSessionHarvest(USER, session.id, "zh-vi");
    // Base 8 + 10% streak bonus (3-day streak, GAME_PLAY §6.4).
    expect(claim).toMatchObject({
      goldAwarded: 9,
      baseGold: 8,
      streakBonus: 1,
      streak: 3,
      cardsHarvested: 1,
    });
    expect(await getSweepStreak(USER, "zh-vi")).toBe(3);
  }, 15_000);

  test("a farm with nothing due keeps the streak alive on load", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [word("你好")]);
    // The word is growing with a future due date: nothing is ripe.
    await upsertCardSchedule(USER, planted!.planted[0].cardId, {
      easeFactor: 2.5,
      intervalDays: 6,
      dueAt: new Date(Date.now() + 6 * 86_400_000),
      reviewCount: 2,
      consecutiveCorrect: 2,
      lapses: 0,
      lastReviewedAt: new Date(),
    });
    const DAY = 86_400_000;
    await recordSweepDay(USER, "zh-vi", new Date(Date.now() - DAY));

    await loadFarmWorldDetail(USER, "zh-vi");
    expect(await getSweepStreak(USER, "zh-vi")).toBe(2);
  }, 15_000);

  test("a 7-day-ever sweep run grants the streak wreath once (GAME_PLAY §6.4)", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [word("谢谢")]);
    await upsertCardSchedule(USER, planted!.planted[0].cardId, {
      easeFactor: 2.5,
      intervalDays: 6,
      dueAt: new Date(Date.now() + 6 * 86_400_000),
      reviewCount: 2,
      consecutiveCorrect: 2,
      lapses: 0,
      lastReviewedAt: new Date(),
    });
    const DAY = 86_400_000;
    for (let back = 6; back >= 1; back--) {
      await recordSweepDay(USER, "zh-vi", new Date(Date.now() - back * DAY));
    }
    // The load records today's sweep day (nothing due), crossing 7 days
    // ever — the wreath lands exactly once and the history is exposed.
    const first = await loadFarmWorldDetail(USER, "zh-vi");
    expect(first!.longestStreak).toBe(7);
    const wreath = first!.items.find(
      (item) => item.itemKey === "streak_wreath"
    );
    expect(wreath?.qty).toBe(1);

    const second = await loadFarmWorldDetail(USER, "zh-vi");
    expect(
      second!.items.filter((item) => item.itemKey === "streak_wreath")
    ).toHaveLength(1);
  }, 15_000);

  describe("shop purchases (GAME_PLAY §6.3)", () => {
    test("buying charges gold atomically and writes farm_items once", async () => {
      await startFarmWorld(USER, ZH);
      await rawClient`update farm_worlds set gold = 500 where user_id = ${USER} and lang_key = 'zh-vi'`;

      const bought = await purchaseItem(USER, "zh-vi", "fence_stone");
      expect(bought).toEqual({ gold: 440 });

      const detail = await loadFarmWorldDetail(USER, "zh-vi");
      expect(detail!.items).toContainEqual({ itemKey: "fence_stone", qty: 1 });

      // Second buy: owned, nothing charged.
      expect(await purchaseItem(USER, "zh-vi", "fence_stone")).toBe("owned");
      expect((await loadFarmWorldDetail(USER, "zh-vi"))!.world.gold).toBe(440);
    }, 15_000);

    test("insufficient gold and out-of-order house tiers are rejected", async () => {
      await startFarmWorld(USER, ZH);
      // Starting gold 40 < 60.
      expect(await purchaseItem(USER, "zh-vi", "fence_stone")).toBe(
        "insufficient"
      );

      await rawClient`update farm_worlds set gold = 3000 where user_id = ${USER} and lang_key = 'zh-vi'`;
      expect(await purchaseItem(USER, "zh-vi", "house_2")).toBe("locked-tier");
      expect(await purchaseItem(USER, "zh-vi", "house_1")).toMatchObject({
        gold: 2_700,
      });
      expect(await purchaseItem(USER, "zh-vi", "house_2")).toMatchObject({
        gold: 1_800,
      });
      // 1_800 < 2_500 — the villa waits.
      expect(await purchaseItem(USER, "zh-vi", "house_3")).toBe("insufficient");
    }, 15_000);

    test("unknown items and other users' worlds are rejected", async () => {
      await startFarmWorld(USER, ZH);
      expect(await purchaseItem(USER, "zh-vi", "rocket")).toBeUndefined();
      expect(await purchaseItem("stranger", "zh-vi", "fence_stone")).toBe(
        undefined
      );
    }, 15_000);
  });
});
