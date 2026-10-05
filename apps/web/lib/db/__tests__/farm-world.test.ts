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
