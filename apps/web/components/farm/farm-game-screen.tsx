import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getUserId } from "@/lib/auth/session";
import { loadFarmWorldDetail } from "@/lib/db/repositories/farm";
import { getCurrentStreak } from "@/lib/db/repositories/study";
import { LANG_PACKS } from "@/lib/game/content";

import { FarmGame } from "./farm-game";
import { StartFarmPrompt } from "./start-farm-prompt";

export async function FarmGameScreen({ langKey }: { langKey: string }) {
  await connection();
  const userId = await getUserId();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!LANG_PACKS[langKey]) {
    redirect("/");
  }
  const [snapshot, streak] = await Promise.all([
    loadFarmWorldDetail(userId, langKey),
    getCurrentStreak(userId),
  ]);
  if (!snapshot) {
    return <StartFarmPrompt langKey={langKey} />;
  }
  return <FarmGame initialSnapshot={snapshot} streak={streak} />;
}
