import "server-only";

import { getUserId } from "@/lib/auth/session";
import { listFarmWorlds } from "@/lib/db/repositories/farm";
import { getCurrentStreak } from "@/lib/db/repositories/study";
import { LANG_PACKS } from "@/lib/game/content";

export const FUTURE_LANGS: { langKey: string; name: string }[] = [
  { langKey: "en-vi", name: "English · Việt" },
];

export type TitleScreenData = {
  signedIn: boolean;
  streak: number;
  worlds: {
    langKey: string;
    name: string;
    flag: string;
    tierName: string;
    gold: number;
    dueCount: number;
    started: boolean;
  }[];
  futureLangs: { langKey: string; name: string }[];
};

export async function loadTitleScreenData(): Promise<TitleScreenData> {
  const userId = await getUserId();
  if (!userId) {
    return {
      signedIn: false,
      streak: 0,
      worlds: Object.values(LANG_PACKS).map((pack) => ({
        langKey: pack.key,
        name: pack.name,
        flag: pack.flag,
        tierName: pack.tiers[0].name,
        gold: 0,
        dueCount: 0,
        started: false,
      })),
      futureLangs: FUTURE_LANGS,
    };
  }

  const [overviews, streak] = await Promise.all([
    listFarmWorlds(userId),
    getCurrentStreak(userId),
  ]);

  return {
    signedIn: true,
    streak,
    worlds: Object.values(LANG_PACKS).map((pack) => {
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
    }),
    futureLangs: FUTURE_LANGS,
  };
}
