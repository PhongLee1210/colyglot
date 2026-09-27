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
  getMusicSettings,
  upsertMusicSettings,
} from "../repositories/user-settings";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER_A = "settings-user-a";
const USER_B = "settings-user-b";
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

describeIntegration("user settings repository", () => {
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
    await rawClient`truncate table user_settings`;
  });

  test("returns defaults when the user has no row", async () => {
    expect(await getMusicSettings(USER_A)).toEqual({
      musicVolume: 20,
      musicMuted: false,
    });
  });

  test("upserts music settings and updates them on conflict", async () => {
    await upsertMusicSettings(USER_A, { musicVolume: 55, musicMuted: false });
    expect(await getMusicSettings(USER_A)).toEqual({
      musicVolume: 55,
      musicMuted: false,
    });

    await upsertMusicSettings(USER_A, { musicVolume: 10, musicMuted: true });
    expect(await getMusicSettings(USER_A)).toEqual({
      musicVolume: 10,
      musicMuted: true,
    });
  });

  test("isolates settings per user", async () => {
    await upsertMusicSettings(USER_A, { musicVolume: 90, musicMuted: true });
    expect(await getMusicSettings(USER_B)).toEqual({
      musicVolume: 20,
      musicMuted: false,
    });
  });

  test("rejects out-of-range volumes", async () => {
    await expect(
      upsertMusicSettings(USER_A, { musicVolume: 101, musicMuted: false })
    ).rejects.toThrow(RangeError);
    await expect(
      upsertMusicSettings(USER_A, { musicVolume: 2.5, musicMuted: false })
    ).rejects.toThrow(RangeError);
  });
});
