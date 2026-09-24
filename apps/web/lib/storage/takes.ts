import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TAKES_DIR = path.join(process.cwd(), ".data", "takes");

const MAX_TAKE_BYTES = 2 * 1024 * 1024;

export type StoredTake = {
  storagePath: string;
  bytes: Buffer;
  contentType: string;
};

export function takeStoragePath(cardId: string): string {
  return `takes/${cardId}.webm`;
}

export async function saveTake(cardId: string, bytes: Buffer): Promise<string> {
  if (bytes.byteLength === 0) {
    throw new Error("Recording is empty");
  }
  if (bytes.byteLength > MAX_TAKE_BYTES) {
    throw new Error("Recording is too large");
  }
  await mkdir(TAKES_DIR, { recursive: true });
  const filePath = path.join(TAKES_DIR, `${cardId}.webm`);
  await writeFile(filePath, bytes);
  return takeStoragePath(cardId);
}

export async function readTake(cardId: string): Promise<StoredTake | null> {
  const filePath = path.join(TAKES_DIR, `${cardId}.webm`);
  try {
    const bytes = await readFile(filePath);
    return {
      storagePath: takeStoragePath(cardId),
      bytes,
      contentType: "audio/webm",
    };
  } catch {
    return null;
  }
}
