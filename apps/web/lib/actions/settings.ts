"use server";

import { requireUserId } from "@/lib/auth/session";
import {
  upsertMusicSettings,
  upsertUiLang,
} from "@/lib/db/repositories/user-settings";
import { clampMusicVolume } from "@/lib/game/music";
import { UI_LANGS, type UiLang } from "@/lib/i18n/ui-langs";

import type { ActionResult } from "./types";

export async function updateMusicSettingsAction(
  volume: number,
  muted: boolean
): Promise<ActionResult<{ volume: number; muted: boolean }>> {
  const userId = await requireUserId();
  if (!Number.isFinite(volume)) {
    return { ok: false, error: "INVALID_VOLUME" };
  }
  if (typeof muted !== "boolean") {
    return { ok: false, error: "INVALID_MUTE_STATE" };
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
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

export async function updateUiLangAction(
  lang: string
): Promise<ActionResult<{ uiLang: UiLang }>> {
  const userId = await requireUserId();
  if (!UI_LANGS.includes(lang as UiLang)) {
    return { ok: false, error: "INVALID_UI_LANG" };
  }
  try {
    const saved = await upsertUiLang(userId, lang as UiLang);
    return { ok: true, data: { uiLang: saved } };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}
