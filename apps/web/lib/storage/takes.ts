import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TAKES_BUCKET = "takes";

const MAX_TAKE_BYTES = 2 * 1024 * 1024;

const TAKE_CONTENT_TYPE = "audio/webm";

export type StoredTake = {
  storagePath: string;
  bytes: Buffer;
  contentType: string;
};

export function takeStoragePath(userId: string, cardId: string): string {
  return `takes/${userId}/${cardId}.webm`;
}

function objectPath(userId: string, cardId: string): string {
  return `${userId}/${cardId}.webm`;
}

export async function saveTake(
  userId: string,
  cardId: string,
  bytes: Buffer
): Promise<string> {
  if (bytes.byteLength === 0) {
    throw new Error("Recording is empty");
  }
  if (bytes.byteLength > MAX_TAKE_BYTES) {
    throw new Error("Recording is too large");
  }
  const { error } = await getSupabaseAdmin()
    .storage.from(TAKES_BUCKET)
    .upload(objectPath(userId, cardId), bytes, {
      contentType: TAKE_CONTENT_TYPE,
      upsert: true,
    });
  if (error) {
    throw new Error(`Take upload failed: ${error.message}`);
  }
  return takeStoragePath(userId, cardId);
}

export async function readTake(
  userId: string,
  cardId: string
): Promise<StoredTake | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(TAKES_BUCKET)
    .download(objectPath(userId, cardId));
  if (error) {
    if (
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === "404"
    ) {
      return null;
    }
    throw new Error(`Take download failed: ${error.message}`);
  }
  return {
    storagePath: takeStoragePath(userId, cardId),
    bytes: Buffer.from(await data.arrayBuffer()),
    contentType: TAKE_CONTENT_TYPE,
  };
}
