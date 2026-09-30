import { eq } from "drizzle-orm";

import { DEFAULT_MUSIC_VOLUME } from "@/lib/game/music";
import { DEFAULT_UI_LANG, UI_LANGS, type UiLang } from "@/lib/i18n/ui-langs";

import { getDb } from "../index";
import { userSettings, type UserSettings } from "../schema";

export type MusicSettingsRow = Pick<UserSettings, "musicVolume" | "musicMuted">;

const DEFAULT_MUSIC_SETTINGS: MusicSettingsRow = {
  musicVolume: DEFAULT_MUSIC_VOLUME,
  musicMuted: false,
};

export async function getMusicSettings(
  userId: string
): Promise<MusicSettingsRow> {
  const [row] = await getDb()
    .select({
      musicVolume: userSettings.musicVolume,
      musicMuted: userSettings.musicMuted,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row ?? DEFAULT_MUSIC_SETTINGS;
}

export async function upsertMusicSettings(
  userId: string,
  settings: MusicSettingsRow
): Promise<MusicSettingsRow> {
  const { musicVolume, musicMuted } = settings;
  if (!Number.isInteger(musicVolume) || musicVolume < 0 || musicVolume > 100) {
    throw new RangeError("musicVolume must be an integer between 0 and 100");
  }
  const [row] = await getDb()
    .insert(userSettings)
    .values({ userId, musicVolume, musicMuted })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { musicVolume, musicMuted, updatedAt: new Date() },
    })
    .returning({
      musicVolume: userSettings.musicVolume,
      musicMuted: userSettings.musicMuted,
    });
  return row!;
}

export async function getUiLang(userId: string): Promise<UiLang> {
  const [row] = await getDb()
    .select({ uiLang: userSettings.uiLang })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  const lang = row?.uiLang;
  return UI_LANGS.includes(lang as UiLang) ? (lang as UiLang) : DEFAULT_UI_LANG;
}

export async function upsertUiLang(
  userId: string,
  lang: UiLang
): Promise<UiLang> {
  if (!UI_LANGS.includes(lang)) {
    throw new RangeError(`uiLang must be one of ${UI_LANGS.join(", ")}`);
  }
  const [row] = await getDb()
    .insert(userSettings)
    .values({ userId, uiLang: lang })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { uiLang: lang, updatedAt: new Date() },
    })
    .returning({ uiLang: userSettings.uiLang });
  return row!.uiLang as UiLang;
}
