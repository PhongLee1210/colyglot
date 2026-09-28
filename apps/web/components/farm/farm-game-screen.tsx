import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getUserId } from "@/lib/auth/session";
import {
  listFarmWorlds,
  loadFarmWorldDetail,
} from "@/lib/db/repositories/farm";
import { getCurrentStreak } from "@/lib/db/repositories/study";
import { getMusicSettings } from "@/lib/db/repositories/user-settings";
import { LANG_PACKS } from "@/lib/game/content";
import type { FarmWorldCard } from "@/lib/game/types";

import { FarmGame } from "./farm-game";

const FUTURE_LANGS: { langKey: string; name: string }[] = [
  { langKey: "en-vi", name: "English · Việt" },
];

export async function FarmGameScreen({ langKey }: { langKey?: string }) {
  await connection();
  const userId = await getUserId();
  if (!userId) {
    redirect("/sign-in");
  }
  if (langKey && !LANG_PACKS[langKey]) {
    redirect("/");
  }
  const [overviews, streak, musicSettings] = await Promise.all([
    listFarmWorlds(userId),
    getCurrentStreak(userId),
    getMusicSettings(userId),
  ]);

  // The game boots straight into a world: an explicit ?lang wins, then the
  // first started world, then the first registered pack (fresh start).
  const effectiveLangKey =
    langKey ?? overviews[0]?.world.langKey ?? Object.values(LANG_PACKS)[0]?.key;
  if (!effectiveLangKey) {
    redirect("/sign-in");
  }

  const snapshot = await loadFarmWorldDetail(userId, effectiveLangKey);

  const worlds: FarmWorldCard[] = Object.values(LANG_PACKS).map((pack) => {
    const overview = overviews.find(
      (entry) => entry.world.langKey === pack.key
    );
    return {
      langKey: pack.key,
      name: pack.name,
      flag: pack.flag,
      tierName: pack.tiers[overview?.world.tier ?? 0].name,
      gold: overview?.world.gold ?? 0,
      dueCount: overview?.dueCount ?? 0,
      started: Boolean(overview),
    };
  });

  return (
    <FarmGame
      langKey={effectiveLangKey}
      initialSnapshot={snapshot ?? null}
      worlds={worlds}
      futureLangs={FUTURE_LANGS}
      streak={streak}
      skipTitle={Boolean(langKey && snapshot)}
      musicSettings={{
        volume: musicSettings.musicVolume,
        muted: musicSettings.musicMuted,
      }}
    />
  );
}
