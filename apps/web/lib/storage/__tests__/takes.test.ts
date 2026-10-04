import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readTake, saveTake, takeStoragePath } from "../takes";

const databaseUrl = process.env.DATABASE_URL ?? "";
const hasStorageEnv = Boolean(
  databaseUrl &&
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const describeIntegration = hasStorageEnv ? describe : describe.skip;

const USER_ID = "storage-test-user";
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

function takeBytes(size: number, fill: number): Buffer {
  return Buffer.alloc(size, fill);
}

describeIntegration("take storage adapter", () => {
  let rawClient: ReturnType<typeof postgres>;
  let cardId: string;

  beforeAll(async () => {
    cardId = randomUUID();
    rawClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    await migrate(drizzle(rawClient), { migrationsFolder: MIGRATIONS_FOLDER });
  });

  afterAll(async () => {
    if (rawClient) {
      await getSupabaseAdmin()
        .storage.from("takes")
        .remove([`${USER_ID}/${cardId}.webm`])
        .catch(() => undefined);
      await rawClient.end();
    }
  });

  test("saveTake and readTake round-trip bytes and metadata", async () => {
    const bytes = takeBytes(1024, 0xab);

    const storagePath = await saveTake(USER_ID, cardId, bytes);
    expect(storagePath).toBe(takeStoragePath(USER_ID, cardId));

    const stored = await readTake(USER_ID, cardId);
    expect(stored?.storagePath).toBe(storagePath);
    expect(stored?.contentType).toBe("audio/webm");
    expect(Buffer.compare(stored!.bytes, bytes)).toBe(0);
  });

  test("saveTake replaces the previous take for the same card", async () => {
    const first = takeBytes(512, 0x11);
    const second = takeBytes(256, 0x22);

    await saveTake(USER_ID, cardId, first);
    await saveTake(USER_ID, cardId, second);

    const stored = await readTake(USER_ID, cardId);
    expect(stored?.bytes.byteLength).toBe(second.byteLength);
    expect(Buffer.compare(stored!.bytes, second)).toBe(0);
  });

  test("saveTake rejects empty recordings", async () => {
    await expect(saveTake(USER_ID, cardId, takeBytes(0, 0))).rejects.toThrow(
      "Recording is empty"
    );
  });

  test("saveTake rejects recordings above the 2MB limit", async () => {
    await expect(
      saveTake(USER_ID, cardId, takeBytes(2 * 1024 * 1024 + 1, 0x33))
    ).rejects.toThrow("Recording is too large");
  });

  test("readTake returns null for a missing take", async () => {
    expect(await readTake(USER_ID, randomUUID())).toBeNull();
  });
});
