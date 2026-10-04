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
  listFarmWorlds,
  loadFarmWorldDetail,
  startFarmWorld,
} from "../repositories/farm";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER_A = "farm-user-a";
const USER_B = "farm-user-b";
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

describeIntegration("farm world repository", () => {
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

  test("start creates world, garden bed, and is idempotent", async () => {
    const world = await startFarmWorld(USER_A, ZH);
    expect(world).toBeDefined();
    expect(world!.gold).toBe(40);

    const again = await startFarmWorld(USER_A, ZH);
    expect(again!.id).toBe(world!.id);

    const detail = await loadFarmWorldDetail(USER_A, "zh-vi");
    expect(detail!.beds).toHaveLength(1);
    expect(detail!.beds[0].plotCount).toBe(6);
    expect(detail!.beds[0].plots).toHaveLength(6);
    expect(detail!.beds[0].plots.every((plot) => plot.cardId === null)).toBe(
      true
    );
  });

  test("legacy same-language decks import as beds with planted cards", async () => {
    const legacy = await createDeck(USER_A, {
      name: "Old zh deck",
      sourceLang: "zh",
      targetLang: "vi",
    });
    for (const hanzi of ["一", "二", "三", "四", "五", "六", "七", "八"]) {
      await createCard(USER_A, {
        deckId: legacy.id,
        hanzi,
        pinyin: "x",
        translation: "y",
        examples: [],
        collocations: [],
      });
    }
    const enDeck = await createDeck(USER_A, {
      name: "En deck",
      sourceLang: "en",
      targetLang: "vi",
    });
    await createCard(USER_A, {
      deckId: enDeck.id,
      hanzi: "hello",
      pinyin: "x",
      translation: "y",
      examples: [],
      collocations: [],
    });

    await startFarmWorld(USER_A, ZH);
    const detail = await loadFarmWorldDetail(USER_A, "zh-vi");
    expect(detail!.beds).toHaveLength(2);
    const imported = detail!.beds.find((bed) => bed.deckId === legacy.id)!;
    // ceil(8 cards / 2) = 4, clamped up to START_PLOTS = 6; 6 oldest planted.
    expect(imported.plotCount).toBe(6);
    const plantedHanzi = imported.plots
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((plot) => plot.hanzi);
    expect(plantedHanzi).toEqual(["一", "二", "三", "四", "五", "六"]);
    expect(detail!.beds.some((bed) => bed.deckId === enDeck.id)).toBe(false);
  });

  test("snapshot exposes counts and world state", async () => {
    await startFarmWorld(USER_A, ZH);
    const detail = await loadFarmWorldDetail(USER_A, "zh-vi");
    expect(detail!.dueCount).toBe(0);
    expect(detail!.freshCount).toBe(0);
    expect(detail!.xp).toBe(0);
    expect(detail!.level).toBe(1);

    const overviews = await listFarmWorlds(USER_A);
    expect(overviews).toHaveLength(1);
    expect(overviews[0].dueCount).toBe(0);
  });

  test("user isolation", async () => {
    await startFarmWorld(USER_A, ZH);
    expect(await loadFarmWorldDetail(USER_B, "zh-vi")).toBeUndefined();
    expect(await listFarmWorlds(USER_B)).toEqual([]);
  });
});
