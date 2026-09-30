"use server";

import { requireUserId } from "@/lib/auth/session";
import {
  upsertMusicSettings,
  upsertUiLang,
} from "@/lib/db/repositories/user-settings";
import { clampMusicVolume } from "@/lib/game/music";
import { UI_LANGS, type UiLang } from "@/lib/i18n/ui-langs";

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

export async function updateUiLangAction(
  lang: string
): Promise<ActionResult<{ uiLang: UiLang }>> {
  const userId = await requireUserId();
  if (!UI_LANGS.includes(lang as UiLang)) {
    return { ok: false, error: "Invalid interface language" };
  }
  try {
    const saved = await upsertUiLang(userId, lang as UiLang);
    return { ok: true, data: { uiLang: saved } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
