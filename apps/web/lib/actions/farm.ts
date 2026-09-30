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
  startFarmWorld,
  unlockRegion,
  type ClaimHarvestResult,
  type PlantSeedsResult,
} from "@/lib/db/repositories/farm";
import {
  getDueQueueForLang,
  openStudySession,
} from "@/lib/db/repositories/study";
import { isRegionKey, LANG_PACKS, langsFromKey } from "@/lib/game/content";
import type { SeedWord } from "@/lib/game/content/types";
import type { FarmWorldSnapshot, HarvestCard } from "@/lib/game/types";
import type { ActionResult } from "./types";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function startWorldAction(
  langKey: string
): Promise<ActionResult<{ langKey: string }>> {
  const userId = await requireUserId();
  const pack = LANG_PACKS[langKey];
  if (!pack) {
    return { ok: false, error: "Unknown language" };
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
      return { ok: false, error: "Could not start farm" };
    }
    revalidatePath("/");
    return { ok: true, data: { langKey } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
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
    return { ok: false, error: "Unknown language" };
  }
  const wanted = new Set(hanziList);
  const words: SeedWord[] = pack.packs
    .flatMap((seedPack) => seedPack.words)
    .filter((word) => wanted.has(word.hanzi));
  try {
    const result = await plantSeeds(userId, langKey, bedId, words);
    if (!result) {
      return { ok: false, error: "Bed not found" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function expandBedAction(
  bedId: string
): Promise<ActionResult<{ plotCount: number; gold: number }>> {
  const userId = await requireUserId();
  try {
    const result = await expandFarmBed(userId, bedId);
    if (result === undefined) {
      return { ok: false, error: "Bed not found" };
    }
    if (result === "insufficient") {
      return { ok: false, error: "Not enough gold" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
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
      return { ok: false, error: "Nothing to claim" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function openHarvestAction(
  langKey: string
): Promise<ActionResult<{ sessionId: string; queue: HarvestCard[] }>> {
  const userId = await requireUserId();
  const langs = langsFromKey(langKey);
  const world = await getFarmWorld(userId, langKey);
  if (!langs || !world) {
    return { ok: false, error: "Farm not found" };
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
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

// Feeds the in-game language switcher: returns the full world snapshot so
// the client can hydrate its farm store without a page navigation.
export async function switchWorldAction(
  langKey: string
): Promise<ActionResult<FarmWorldSnapshot>> {
  const userId = await requireUserId();
  if (!LANG_PACKS[langKey]) {
    return { ok: false, error: "Unknown language" };
  }
  try {
    const snapshot = await loadFarmWorldDetail(userId, langKey);
    if (!snapshot) {
      return { ok: false, error: "Start this farm first" };
    }
    return { ok: true, data: snapshot };
  } catch {
    return { ok: false, error: "Could not load farm" };
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
    return { ok: false, error: "Unknown region" };
  }
  try {
    const result = await unlockRegion(userId, langKey, regionKey);
    if (result === undefined) {
      return { ok: false, error: "Start this farm first" };
    }
    if (result === "already-unlocked") {
      return { ok: false, error: "Region already unlocked" };
    }
    if (result === "trees-gate") {
      return { ok: false, error: "Not enough forest trees yet" };
    }
    if (result === "insufficient-gold") {
      return { ok: false, error: "Not enough gold" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
