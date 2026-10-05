import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getSweepStreak,
  listFarmWorlds,
  loadFarmWorldDetail,
} from "@/lib/db/repositories/farm";
import { getUserTier } from "@/lib/db/repositories/user-account";
import {
  getMusicSettings,
  getUiLang,
} from "@/lib/db/repositories/user-settings";
import { LANG_PACKS } from "@/lib/game/content";
import { DEFAULT_MUSIC_VOLUME } from "@/lib/game/music";
import type { FarmWorldCard } from "@/lib/game/types";
import { DEFAULT_UI_LANG } from "@/lib/i18n/ui-langs";

import { FarmGame } from "./farm-game";

const FUTURE_LANGS: { langKey: string; name: string }[] = [
  { langKey: "en-vi", name: "English · Việt" },
];

function buildWorldCards(
  overviews: Awaited<ReturnType<typeof listFarmWorlds>>
): FarmWorldCard[] {
  return Object.values(LANG_PACKS).map((pack) => {
    const overview = overviews.find(
      (entry) => entry.world.langKey === pack.key
    );
    return {
      langKey: pack.key,
      name: pack.name,
      flag: pack.flag,
      tierKey: pack.tiers[overview?.world.tier ?? 0].key,
      gold: overview?.world.gold ?? 0,
      dueCount: overview?.dueCount ?? 0,
      started: Boolean(overview),
    };
  });
}

export async function FarmGameScreen({ langKey }: { langKey?: string }) {
  await connection();
  const user = await getCurrentUser();
  if (langKey && !LANG_PACKS[langKey]) {
    redirect("/");
  }

  if (!user) {
    const firstLangKey = Object.values(LANG_PACKS)[0]?.key;
    if (!firstLangKey) {
      return null;
    }
    return (
      <FarmGame
        langKey={firstLangKey}
        initialSnapshot={null}
        worlds={buildWorldCards([])}
        futureLangs={FUTURE_LANGS}
        streak={0}
        skipTitle={false}
        musicSettings={{ volume: DEFAULT_MUSIC_VOLUME, muted: false }}
        initialUiLang={DEFAULT_UI_LANG}
        accessTier="none"
      />
    );
  }

  const userId = user.id;
  const [overviews, musicSettings, uiLang, tier] = await Promise.all([
    listFarmWorlds(userId),
    getMusicSettings(userId),
    getUiLang(userId),
    getUserTier(userId),
  ]);

  // The game boots straight into a world: an explicit ?lang wins, then the
  // first started world, then the first registered pack (fresh start).
  const effectiveLangKey =
    langKey ?? overviews[0]?.world.langKey ?? Object.values(LANG_PACKS)[0]?.key;
  if (!effectiveLangKey) {
    redirect("/sign-in");
  }

  const [snapshot, streak] = await Promise.all([
    loadFarmWorldDetail(userId, effectiveLangKey),
    // The streak counts swept farms per world (GAME_PLAY §6.4), not bare
    // review days — the snapshot recomputes it, the prop covers the boot.
    getSweepStreak(userId, effectiveLangKey),
  ]);

  return (
    <FarmGame
      langKey={effectiveLangKey}
      initialSnapshot={snapshot ?? null}
      worlds={buildWorldCards(overviews)}
      futureLangs={FUTURE_LANGS}
      streak={streak}
      skipTitle={Boolean(langKey && snapshot)}
      musicSettings={{
        volume: musicSettings.musicVolume,
        muted: musicSettings.musicMuted,
      }}
      initialUiLang={uiLang}
      accessTier={tier}
    />
  );
}
