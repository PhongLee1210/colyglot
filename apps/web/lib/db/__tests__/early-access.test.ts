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
import { EARLY_ACCESS_CARD_LIMIT } from "@/lib/game/core/access";
import { getDb } from "../index";
import {
  countCardsForUser,
  getCardRecording,
  listDecks,
  saveCardRecording,
} from "../repositories/content";
import {
  getFarmWorld,
  loadFarmWorldDetail,
  plantSeeds,
  startFarmWorld,
} from "../repositories/farm";
import {
  ensureUserAccount,
  getUserTier,
  promoteToStandard,
} from "../repositories/user-account";
import { userAccounts } from "../schema";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER = "early-access-user";
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

describeIntegration("early access tier", () => {
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
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds, farm_sweep_days, user_settings, user_accounts cascade`;
  });

  async function gardenBedId(): Promise<string> {
    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    if (!detail) throw new Error("world missing");
    return detail.beds[0].id;
  }

  test("getUserTier fails closed to EARLY_ACCESS without an account row", async () => {
    expect(await getUserTier(USER)).toBe("EARLY_ACCESS");
  });

  test("ensureUserAccount is idempotent and promotion is sticky", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await ensureUserAccount(USER, "EARLY_ACCESS");
    let rows = await getDb().select().from(userAccounts);
    expect(rows).toHaveLength(1);
    expect(rows[0].tier).toBe("EARLY_ACCESS");
    expect(rows[0].upgradedAt).toBeNull();

    await promoteToStandard(USER);
    rows = await getDb().select().from(userAccounts);
    expect(rows[0].tier).toBe("STANDARD");
    expect(rows[0].upgradedAt).not.toBeNull();

    await ensureUserAccount(USER, "EARLY_ACCESS");
    expect(await getUserTier(USER)).toBe("STANDARD");
  });

  test("plantSeeds stops at the card cap and skips the rest", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();

    const result = await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一", "二", "三", "四", "五"].map(word),
      3
    );

    expect(result!.planted.map((entry) => entry.hanzi)).toEqual([
      "一",
      "二",
      "三",
    ]);
    expect(result!.skipped).toEqual(["四", "五"]);
    expect(result!.capReached).toBe(true);
    expect(result!.cardsRemaining).toBe(0);
  }, 15_000);

  test("plantSeeds counts existing cards against the cap", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    await plantSeeds(USER, "zh-vi", bedId, [word("一")], 3);

    const result = await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["二", "三"].map(word),
      3
    );

    expect(result!.planted).toHaveLength(2);
    expect(result!.capReached).toBe(true);
    expect(result!.cardsRemaining).toBe(0);
  }, 15_000);

  test("a partial plant fills the remaining quota exactly", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    await plantSeeds(USER, "zh-vi", bedId, ["一", "二"].map(word), 3);

    const result = await plantSeeds(USER, "zh-vi", bedId, [word("三")], 3);

    expect(result!.planted).toHaveLength(1);
    expect(result!.cardsRemaining).toBe(0);
    expect(result!.capReached).toBe(true);
  }, 15_000);

  test("null cardLimit plants freely past the EARLY_ACCESS cap", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();

    const result = await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一", "二", "三", "四", "五", "六"].map(word),
      null
    );

    expect(result!.planted).toHaveLength(6);
    expect(result!.capReached).toBe(false);
    expect(result!.cardsRemaining).toBeNull();
  }, 15_000);

  test("loadFarmWorldDetail surfaces the EARLY_ACCESS quota", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一"].map(word),
      EARLY_ACCESS_CARD_LIMIT
    );

    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    expect(detail!.access).toEqual({
      tier: "EARLY_ACCESS",
      cardsUsed: 1,
      cardLimit: EARLY_ACCESS_CARD_LIMIT,
    });
  }, 15_000);

  test("promoteToStandard keeps decks, cards, and farm rows on the same uuid", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一", "二"].map(word),
      EARLY_ACCESS_CARD_LIMIT
    );

    await promoteToStandard(USER);

    expect(await getUserTier(USER)).toBe("STANDARD");
    expect(await listDecks(USER)).toHaveLength(1);
    expect(await countCardsForUser(USER)).toBe(2);
    expect(await getFarmWorld(USER, "zh-vi")).toBeDefined();
    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    expect(detail!.access).toEqual({
      tier: "STANDARD",
      cardsUsed: 2,
      cardLimit: null,
    });
  }, 15_000);

  test("audio takes are not gated by tier", async () => {
    await ensureUserAccount(USER, "EARLY_ACCESS");
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一"].map(word),
      EARLY_ACCESS_CARD_LIMIT
    );
    const cardId = planted!.planted[0].cardId;

    const saved = await saveCardRecording(USER, {
      cardId,
      storagePath: `${USER}/takes/${cardId}.webm`,
      durationMs: 1200,
    });
    expect(saved).toBeDefined();

    const fetched = await getCardRecording(USER, cardId);
    expect(fetched?.storagePath).toBe(`${USER}/takes/${cardId}.webm`);
  }, 15_000);
});
