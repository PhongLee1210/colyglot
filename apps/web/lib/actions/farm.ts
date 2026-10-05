"use server";

import { revalidatePath } from "next/cache";

import { orderSessionQueue } from "@colyglot/srs";

import { requireUserId } from "@/lib/auth/session";
import {
  claimSessionHarvest,
  expandFarmBed,
  getFarmWorld,
  loadFarmWorldDetail,
  plantSeeds,
  purchaseItem,
  startFarmWorld,
  unlockRegion,
  type ClaimHarvestResult,
  type PlantSeedsResult,
} from "@/lib/db/repositories/farm";
import {
  getDueQueueForLang,
  openStudySession,
} from "@/lib/db/repositories/study";
import { getUserTier } from "@/lib/db/repositories/user-account";
import { isRegionKey, LANG_PACKS, langsFromKey } from "@/lib/game/content";
import type { SeedWord } from "@/lib/game/content/types";
import { EARLY_ACCESS_CARD_LIMIT } from "@/lib/game/core/access";
import type { FarmWorldSnapshot, HarvestCard } from "@/lib/game/types";

import type { ActionResult } from "./types";

export async function startWorldAction(
  langKey: string
): Promise<ActionResult<{ langKey: string }>> {
  const userId = await requireUserId();
  const pack = LANG_PACKS[langKey];
  if (!pack) {
    return { ok: false, error: "UNKNOWN_LANGUAGE" };
  }
  try {
    const world = await startFarmWorld(userId, {
      langKey,
      sourceLang: pack.sourceLang,
      targetLang: pack.targetLang,
      worldName: pack.name,
      bedName: `${pack.name} garden`,
    });
    if (!world) {
      return { ok: false, error: "COULD_NOT_START_FARM" };
    }
    revalidatePath("/");
    return { ok: true, data: { langKey } };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

export async function plantSeedsAction(
  langKey: string,
  bedId: string,
  hanziList: string[]
): Promise<ActionResult<PlantSeedsResult>> {
  const userId = await requireUserId();
  const pack = LANG_PACKS[langKey];
  if (!pack) {
    return { ok: false, error: "UNKNOWN_LANGUAGE" };
  }
  const wanted = new Set(hanziList);
  const words: SeedWord[] = pack.packs
    .flatMap((seedPack) => seedPack.words)
    .filter((word) => wanted.has(word.hanzi));
  try {
    const tier = await getUserTier(userId);
    const result = await plantSeeds(
      userId,
      langKey,
      bedId,
      words,
      tier === "EARLY_ACCESS" ? EARLY_ACCESS_CARD_LIMIT : null
    );
    if (!result) {
      return { ok: false, error: "BED_NOT_FOUND" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

export async function expandBedAction(
  bedId: string
): Promise<ActionResult<{ plotCount: number; gold: number }>> {
  const userId = await requireUserId();
  try {
    const result = await expandFarmBed(userId, bedId);
    if (result === undefined) {
      return { ok: false, error: "BED_NOT_FOUND" };
    }
    if (result === "insufficient") {
      return { ok: false, error: "NOT_ENOUGH_GOLD" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

export async function claimHarvestAction(
  sessionId: string,
  langKey: string
): Promise<ActionResult<ClaimHarvestResult>> {
  const userId = await requireUserId();
  try {
    const result = await claimSessionHarvest(userId, sessionId, langKey);
    if (!result) {
      return { ok: false, error: "NOTHING_TO_CLAIM" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

export async function openHarvestAction(
  langKey: string
): Promise<ActionResult<{ sessionId: string; queue: HarvestCard[] }>> {
  const userId = await requireUserId();
  const langs = langsFromKey(langKey);
  const world = await getFarmWorld(userId, langKey);
  if (!langs || !world) {
    return { ok: false, error: "FARM_NOT_FOUND" };
  }
  try {
    const session = await openStudySession(userId);
    const queue = await getDueQueueForLang(
      userId,
      langs.sourceLang,
      langs.targetLang
    );
    // One sweep, one queue: words the player is closest to losing come
    // first, so a neglected farm is caught up from the worst end.
    const ordered = orderSessionQueue(
      queue.map((item) => ({
        id: item.card.id,
        createdAt: item.card.createdAt,
        schedule: item.schedule
          ? {
              dueAt: item.schedule.dueAt,
              intervalDays: item.schedule.intervalDays,
            }
          : null,
        item,
      })),
      new Date()
    );
    return {
      ok: true,
      data: {
        sessionId: session.id,
        queue: ordered.map(({ item }) => ({
          cardId: item.card.id,
          hanzi: item.card.hanzi,
          pinyin: item.card.pinyin,
          translation: item.card.translation,
          examples: item.card.examples,
          fresh: item.schedule === null,
          intervalDays: item.schedule?.intervalDays ?? 0,
        })),
      },
    };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

// Buys one shop item (GAME_PLAY §6.3); returns the post-purchase gold so
// the HUD chip stays honest without a full refresh.
export async function buyItemAction(
  langKey: string,
  itemKey: string
): Promise<ActionResult<{ gold: number }>> {
  const userId = await requireUserId();
  if (!LANG_PACKS[langKey]) {
    return { ok: false, error: "UNKNOWN_LANGUAGE" };
  }
  try {
    const result = await purchaseItem(userId, langKey, itemKey);
    if (result === undefined) {
      return { ok: false, error: "ITEM_NOT_FOUND" };
    }
    if (result === "owned") {
      return { ok: false, error: "ALREADY_OWNED" };
    }
    if (result === "locked-tier") {
      return { ok: false, error: "HOUSE_TIER_ORDER" };
    }
    if (result === "insufficient") {
      return { ok: false, error: "NOT_ENOUGH_GOLD" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}

// Feeds the in-game language switcher: returns the full world snapshot so
// the client can hydrate its farm store without a page navigation.
export async function switchWorldAction(
  langKey: string
): Promise<ActionResult<FarmWorldSnapshot>> {
  const userId = await requireUserId();
  if (!LANG_PACKS[langKey]) {
    return { ok: false, error: "UNKNOWN_LANGUAGE" };
  }
  try {
    const snapshot = await loadFarmWorldDetail(userId, langKey);
    if (!snapshot) {
      return { ok: false, error: "START_FARM_FIRST" };
    }
    return { ok: true, data: snapshot };
  } catch {
    return { ok: false, error: "COULD_NOT_LOAD_FARM" };
  }
}

// Opens the next region behind its dual gate (GAME_PLAY §5.3); returns the
// refreshed snapshot so the client hydrates without a navigation.
export async function unlockRegionAction(
  langKey: string,
  regionKey: string
): Promise<ActionResult<FarmWorldSnapshot>> {
  const userId = await requireUserId();
  if (!LANG_PACKS[langKey] || !isRegionKey(regionKey)) {
    return { ok: false, error: "UNKNOWN_REGION" };
  }
  try {
    const result = await unlockRegion(userId, langKey, regionKey);
    if (result === undefined) {
      return { ok: false, error: "START_FARM_FIRST" };
    }
    if (result === "already-unlocked") {
      return { ok: false, error: "REGION_ALREADY_UNLOCKED" };
    }
    if (result === "trees-gate") {
      return { ok: false, error: "NOT_ENOUGH_TREES" };
    }
    if (result === "insufficient-gold") {
      return { ok: false, error: "NOT_ENOUGH_GOLD" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "SOMETHING_WENT_WRONG" };
  }
}
