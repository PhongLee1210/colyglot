"use server";

import { requireUserId } from "@/lib/auth/session";
import { upsertMusicSettings } from "@/lib/db/repositories/user-settings";
import { clampMusicVolume } from "@/lib/game/music";

import type { ActionResult } from "./types";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function updateMusicSettingsAction(
  volume: number,
  muted: boolean
): Promise<ActionResult<{ volume: number; muted: boolean }>> {
  const userId = await requireUserId();
  if (!Number.isFinite(volume)) {
    return { ok: false, error: "Invalid volume" };
  }
  if (typeof muted !== "boolean") {
    return { ok: false, error: "Invalid mute state" };
  }
  const settings = {
    volume: clampMusicVolume(volume),
    muted,
  };
  try {
    const saved = await upsertMusicSettings(userId, {
      musicVolume: settings.volume,
      musicMuted: settings.muted,
    });
    return {
      ok: true,
      data: { volume: saved.musicVolume, muted: saved.musicMuted },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
