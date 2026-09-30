import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";

import { ReviewGrade } from "@colyglot/srs";

import {
  getRegion,
  LANG_PACKS,
  masteryOf,
  REGIONS,
  type RegionKey,
} from "@/lib/game/content";
import type { SeedWord } from "@/lib/game/content/types";
import {
  applyStreakBonus,
  expandBedCost,
  graduationThreshold,
  GREENHOUSE_PLOTS,
  harvestGold,
  PLOTS_PER_EXPAND,
  START_PLOTS,
  STARTING_GOLD,
  WREATH_STREAK_DAYS,
} from "@/lib/game/core/economy";
import { findShopItem, SHOP_ITEMS } from "@/lib/game/core/shop";
import type {
  BedView,
  FarmReviewEvent,
  FarmStats,
  FarmWorldSnapshot,
  ForestTreeView,
  PlotView,
  RegionStatus,
} from "@/lib/game/types";
import { computeStreak, longestStreak, toUtcDayKey } from "@/lib/streak";
import { levelFromXp } from "@/lib/xp";

import { getDb } from "../index";
import {
  cards,
  cardSchedules,
  deckProgress,
  decks,
  farmBeds,
  farmHarvestClaims,
  farmItems,
  farmPlots,
  farmSweepDays,
  farmWorlds,
  reviewLogs,
  type FarmWorld,
} from "../schema";
import {
  countDueForLang,
  countFreshForLang,
  FRESH_QUEUE_LIMIT,
  getStudySession,
  listFreshForLang,
} from "./study";

export type StartFarmWorldInput = {
  langKey: string;
  sourceLang: string;
  targetLang: string;
  worldName: string;
  bedName: string;
};

function langPair(langKey: string): {
  sourceLang: string;
  targetLang: string;
} {
  return { sourceLang: langKey.slice(0, 2), targetLang: langKey.slice(3, 5) };
}

function langConditionLocal(sourceLang: string, targetLang: string) {
  return and(
    eq(decks.sourceLang, sourceLang),
    eq(decks.targetLang, targetLang)
  );
}

export type FarmWorldOverview = { world: FarmWorld; dueCount: number };

export async function getFarmWorld(
  userId: string,
  langKey: string
): Promise<FarmWorld | undefined> {
  const [world] = await getDb()
    .select()
    .from(farmWorlds)
    .where(and(eq(farmWorlds.userId, userId), eq(farmWorlds.langKey, langKey)))
    .limit(1);
  return world;
}

export async function startFarmWorld(
  userId: string,
  input: StartFarmWorldInput
): Promise<FarmWorld | undefined> {
  const existing = await getFarmWorld(userId, input.langKey);
  if (existing) {
    return existing;
  }

  return getDb().transaction(async (tx) => {
    const [world] = await tx
      .insert(farmWorlds)
      .values({ userId, langKey: input.langKey, gold: STARTING_GOLD })
      .onConflictDoNothing()
      .returning();
    if (!world) {
      // Raced another start; the winner's world already exists.
      return getFarmWorld(userId, input.langKey);
    }

    const [gardenDeck] = await tx
      .insert(decks)
      .values({
        userId,
        name: input.bedName,
        sourceLang: input.sourceLang,
        targetLang: input.targetLang,
      })
      .returning();

    await tx.insert(farmBeds).values({
      worldId: world.id,
      deckId: gardenDeck.id,
      plotCount: START_PLOTS,
      position: 0,
      regionKey: "homestead",
    });

    // Legacy decks of the same language pair become beds; oldest cards
    // occupy the first slots so the farm never starts empty. Decks that
    // already back a bed (the greenhouse placeholder, another world's
    // bed) are skipped — a deck can be a bed of at most one world.
    const bedDeckRows = await tx
      .select({ deckId: farmBeds.deckId })
      .from(farmBeds);
    const bedDeckIds = new Set(bedDeckRows.map((row) => row.deckId));
    const legacyDecks = (
      await tx
        .select()
        .from(decks)
        .where(
          and(
            eq(decks.userId, userId),
            eq(decks.sourceLang, input.sourceLang),
            eq(decks.targetLang, input.targetLang)
          )
        )
        .orderBy(asc(decks.createdAt))
    ).filter((deck) => !bedDeckIds.has(deck.id));

    let position = 1;
    for (const deck of legacyDecks) {
      if (deck.id === gardenDeck.id) continue;
      const deckCards = await tx
        .select({ id: cards.id })
        .from(cards)
        .where(eq(cards.deckId, deck.id))
        .orderBy(asc(cards.createdAt));
      const plotCount = Math.max(START_PLOTS, Math.ceil(deckCards.length / 2));
      const [bed] = await tx
        .insert(farmBeds)
        .values({
          worldId: world.id,
          deckId: deck.id,
          plotCount,
          position,
          regionKey: "homestead",
        })
        .returning();
      position += 1;
      if (deckCards.length > 0) {
        await tx.insert(farmPlots).values(
          deckCards.slice(0, plotCount).map((card, index) => ({
            bedId: bed.id,
            slotIndex: index,
            cardId: card.id,
          }))
        );
      }
    }

    return world;
  });
}

export async function listFarmWorlds(
  userId: string
): Promise<FarmWorldOverview[]> {
  const worlds = await getDb()
    .select()
    .from(farmWorlds)
    .where(eq(farmWorlds.userId, userId));
  return Promise.all(
    worlds.map(async (world) => {
      const { sourceLang, targetLang } = langPair(world.langKey);
      return {
        world,
        dueCount: await countDueForLang(userId, sourceLang, targetLang),
      };
    })
  );
}

export async function loadFarmWorldDetail(
  userId: string,
  langKey: string
): Promise<FarmWorldSnapshot | undefined> {
  const world = await getFarmWorld(userId, langKey);
  if (!world) {
    return undefined;
  }
  const { sourceLang, targetLang } = langPair(langKey);

  const bedRows = await getDb()
    .select({ bed: farmBeds, deckName: decks.name })
    .from(farmBeds)
    .innerJoin(decks, eq(farmBeds.deckId, decks.id))
    .where(eq(farmBeds.worldId, world.id))
    .orderBy(asc(farmBeds.position));

  const bedIds = bedRows.map((row) => row.bed.id);
  const plotRows = bedIds.length
    ? await getDb()
        .select({
          bedId: farmPlots.bedId,
          slotIndex: farmPlots.slotIndex,
          plantedAt: farmPlots.plantedAt,
          variant: farmPlots.variant,
          cardId: cards.id,
          hanzi: cards.hanzi,
          pinyin: cards.pinyin,
          translation: cards.translation,
          dueAt: cardSchedules.dueAt,
          intervalDays: cardSchedules.intervalDays,
          reviewCount: cardSchedules.reviewCount,
          lapses: cardSchedules.lapses,
        })
        .from(farmPlots)
        .innerJoin(cards, eq(farmPlots.cardId, cards.id))
        .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
        .where(inArray(farmPlots.bedId, bedIds))
    : [];

  const beds: BedView[] = bedRows.map(({ bed, deckName }) => {
    const plots: PlotView[] = Array.from(
      { length: bed.plotCount },
      (_, slotIndex) => {
        const row = plotRows.find(
          (plot) => plot.bedId === bed.id && plot.slotIndex === slotIndex
        );
        return row
          ? {
              slotIndex,
              cardId: row.cardId,
              hanzi: row.hanzi,
              pinyin: row.pinyin,
              translation: row.translation,
              plantedAt: row.plantedAt,
              variant: row.variant,
              schedule:
                row.dueAt !== null && row.intervalDays !== null
                  ? {
                      dueAt: row.dueAt,
                      intervalDays: row.intervalDays,
                      reviewCount: row.reviewCount ?? 0,
                      lapses: row.lapses ?? 0,
                    }
                  : null,
            }
          : {
              slotIndex,
              cardId: null,
              hanzi: null,
              pinyin: null,
              translation: null,
              plantedAt: null,
              variant: 0,
              schedule: null,
            };
      }
    );
    return {
      id: bed.id,
      deckId: bed.deckId,
      name: deckName,
      plotCount: bed.plotCount,
      position: bed.position,
      kind: bed.kind === "greenhouse" ? "greenhouse" : "garden",
      regionKey: bed.regionKey === "market" ? "market" : "homestead",
      plots,
    };
  });

  // The Forest is one rule, applied once (GAME_PLAY §5.1): a word IS an
  // ancient tree when the graduation hook marked it (cards.graduatedAt)
  // and it no longer sits in a plot. The marker — not a derived interval
  // filter — is what lets the first tree graduate at 15 days (§10.2).
  const forestRows = await getDb()
    .select({
      cardId: cards.id,
      hanzi: cards.hanzi,
      pinyin: cards.pinyin,
      translation: cards.translation,
      intervalDays: cardSchedules.intervalDays,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .innerJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .leftJoin(farmPlots, eq(farmPlots.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langConditionLocal(sourceLang, targetLang),
        isNotNull(cards.graduatedAt),
        isNull(farmPlots.id)
      )
    )
    .orderBy(desc(cardSchedules.intervalDays));
  const forest: ForestTreeView[] = forestRows.map((row) => ({
    cardId: row.cardId,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    translation: row.translation,
    intervalDays: row.intervalDays,
  }));

  // Per-region standing (GAME_PLAY §5.3 + §7): unlock gates plus mastery
  // of the region's topic, measured against the Forest. The tree gate uses
  // the same counter the unlock checks — never a differently-shaped query.
  const pack = LANG_PACKS[langKey];
  const forestHanzi = new Set(forest.map((tree) => tree.hanzi));
  const forestTrees = await countForestTrees(userId, sourceLang, targetLang);
  const regions: RegionStatus[] = REGIONS.map((region) => {
    const regionWords =
      pack?.packs
        .filter((seedPack) => region.packKeys.includes(seedPack.key))
        .flatMap((seedPack) => seedPack.words.map((word) => word.hanzi)) ?? [];
    const { pct, mastered } = masteryOf(regionWords, forestHanzi);
    return {
      key: region.key,
      unlocked:
        region.unlockGold === 0 ||
        bedRows.some(({ bed }) => bed.regionKey === region.key),
      goldGateMet: world.gold >= region.unlockGold,
      treesGateMet: forestTrees >= region.unlockTrees,
      mastered,
      masteryPct: pct,
    };
  });

  const items = await getDb()
    .select({ itemKey: farmItems.itemKey, qty: farmItems.qty })
    .from(farmItems)
    .where(eq(farmItems.worldId, world.id));

  const freshCards = await listFreshForLang(
    userId,
    sourceLang,
    targetLang,
    FRESH_QUEUE_LIMIT
  );
  const dueCount = await countDueForLang(userId, sourceLang, targetLang);
  const freshCount = await countFreshForLang(userId, sourceLang, targetLang);
  // Nothing ripe means the sweep is vacuously done for today — the streak
  // survives days the farm asks nothing of the player. A farm that has
  // never grown anything earns no streak, though.
  if (dueCount === 0 && (world.stats.planted > 0 || forest.length > 0)) {
    await recordSweepDay(userId, langKey, new Date());
    const wreathGranted = await grantStreakWreathOnce(
      userId,
      langKey,
      world.id
    );
    if (wreathGranted) items.push({ itemKey: "streak_wreath", qty: 1 });
  }
  const streak = await getSweepStreak(userId, langKey);
  const longest = await getLongestSweepStreak(userId, langKey);

  const [xpRow] = await getDb()
    .select({ xp: sql<number>`coalesce(sum(${deckProgress.xp}), 0)::int` })
    .from(deckProgress)
    .innerJoin(decks, eq(deckProgress.deckId, decks.id))
    .where(
      and(
        eq(deckProgress.userId, userId),
        eq(decks.sourceLang, sourceLang),
        eq(decks.targetLang, targetLang)
      )
    );
  const xp = xpRow?.xp ?? 0;

  return {
    world: {
      id: world.id,
      langKey: world.langKey,
      tier: world.tier,
      gold: world.gold,
      stats: world.stats as FarmStats,
    },
    beds,
    forest,
    streak,
    longestStreak: longest,
    regions,
    items,
    freshQueue: freshCards.map((card) => ({
      cardId: card.id,
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      translation: card.translation,
    })),
    dueCount,
    freshCount,
    xp,
    level: levelFromXp(xp),
  };
}

export type PlantSeedsResult = {
  planted: { hanzi: string; cardId: string; slotIndex: number }[];
  skipped: string[];
  bedFull: boolean;
};

// Trees in the Forest for a language pair — the un-grindable half of the
// region unlock gate (GAME_PLAY §5.3).
async function countForestTrees(
  userId: string,
  sourceLang: string,
  targetLang: string
): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(farmPlots, eq(farmPlots.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        eq(decks.sourceLang, sourceLang),
        eq(decks.targetLang, targetLang),
        isNotNull(cards.graduatedAt),
        isNull(farmPlots.id)
      )
    );
  return row?.total ?? 0;
}

export type UnlockRegionResult =
  | FarmWorldSnapshot
  | "insufficient-gold"
  | "trees-gate"
  | "already-unlocked"
  | undefined;

// Opens the next region behind its dual gate (GAME_PLAY §5.3): the tree
// gate reports first because trees cannot be bought — gold alone never
// unlocks anything. One transaction: atomic gold guard, deck, bed.
export async function unlockRegion(
  userId: string,
  langKey: string,
  regionKey: RegionKey
): Promise<UnlockRegionResult> {
  const world = await getFarmWorld(userId, langKey);
  if (!world) {
    return undefined;
  }
  const region = getRegion(regionKey);
  if (region.unlockGold === 0) {
    // Starter regions come with the farm.
    return "already-unlocked";
  }

  const [existing] = await getDb()
    .select({ id: farmBeds.id })
    .from(farmBeds)
    .where(
      and(eq(farmBeds.worldId, world.id), eq(farmBeds.regionKey, regionKey))
    )
    .limit(1);
  if (existing) {
    return "already-unlocked";
  }

  const { sourceLang, targetLang } = langPair(langKey);
  const forestTrees = await countForestTrees(userId, sourceLang, targetLang);
  if (forestTrees < region.unlockTrees) {
    return "trees-gate";
  }

  const created = await getDb().transaction(async (tx) => {
    const [paid] = await tx
      .update(farmWorlds)
      .set({
        gold: sql`${farmWorlds.gold} - ${region.unlockGold}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(farmWorlds.id, world.id),
          sql`${farmWorlds.gold} >= ${region.unlockGold}`
        )
      )
      .returning();
    if (!paid) {
      return false;
    }

    const [{ maxPosition }] = await tx
      .select({
        maxPosition: sql<number>`coalesce(max(${farmBeds.position}), -1)::int`,
      })
      .from(farmBeds)
      .where(eq(farmBeds.worldId, world.id));
    const [deck] = await tx
      .insert(decks)
      .values({
        userId,
        name: region.bedName,
        sourceLang,
        targetLang,
      })
      .returning();
    await tx.insert(farmBeds).values({
      worldId: world.id,
      deckId: deck.id,
      plotCount: region.startPlots,
      position: maxPosition + 1,
      regionKey: region.key,
    });
    return true;
  });
  if (!created) {
    return "insufficient-gold";
  }
  return loadFarmWorldDetail(userId, langKey);
}

export async function plantSeeds(
  userId: string,
  langKey: string,
  bedId: string,
  words: SeedWord[]
): Promise<PlantSeedsResult | undefined> {
  const [owned] = await getDb()
    .select({ bed: farmBeds, world: farmWorlds })
    .from(farmBeds)
    .innerJoin(farmWorlds, eq(farmBeds.worldId, farmWorlds.id))
    .where(
      and(
        eq(farmBeds.id, bedId),
        eq(farmWorlds.userId, userId),
        eq(farmWorlds.langKey, langKey)
      )
    )
    .limit(1);
  if (!owned) {
    return undefined;
  }
  const result: PlantSeedsResult = { planted: [], skipped: [], bedFull: false };

  await getDb().transaction(async (tx) => {
    const occupied = await tx
      .select({ slotIndex: farmPlots.slotIndex })
      .from(farmPlots)
      .where(and(eq(farmPlots.bedId, bedId), isNotNull(farmPlots.cardId)));
    const taken = new Set(occupied.map((row) => row.slotIndex));
    const freeSlots: number[] = [];
    for (let slot = 0; slot < owned.bed.plotCount; slot += 1) {
      if (!taken.has(slot)) freeSlots.push(slot);
    }
    if (freeSlots.length === 0) {
      result.bedFull = true;
      return;
    }

    const existingHanzi = await tx
      .select({ hanzi: cards.hanzi })
      .from(cards)
      .where(eq(cards.deckId, owned.bed.deckId));
    const knownHanzi = new Set(existingHanzi.map((row) => row.hanzi));

    let slotCursor = 0;
    for (const seed of words) {
      if (knownHanzi.has(seed.hanzi)) {
        result.skipped.push(seed.hanzi);
        continue;
      }
      if (slotCursor >= freeSlots.length) {
        result.skipped.push(seed.hanzi);
        continue;
      }
      const [card] = await tx
        .insert(cards)
        .values({ ...seed, deckId: owned.bed.deckId })
        .returning();
      const slotIndex = freeSlots[slotCursor];
      slotCursor += 1;
      // A graduated word leaves an empty row behind; refill it rather
      // than tripping the bed+slot unique key on insert.
      const reclaimed = await tx
        .update(farmPlots)
        .set({ cardId: card.id, plantedAt: new Date() })
        .where(
          and(eq(farmPlots.bedId, bedId), eq(farmPlots.slotIndex, slotIndex))
        )
        .returning({ id: farmPlots.id });
      if (reclaimed.length === 0) {
        await tx
          .insert(farmPlots)
          .values({ bedId, slotIndex, cardId: card.id });
      }
      result.planted.push({ hanzi: seed.hanzi, cardId: card.id, slotIndex });
    }

    if (result.planted.length > 0) {
      await tx
        .update(farmWorlds)
        .set({
          stats: sql`jsonb_set(${farmWorlds.stats}, '{planted}', ((${farmWorlds.stats} ->> 'planted')::int + ${result.planted.length})::text::jsonb)`,
          updatedAt: new Date(),
        })
        .where(eq(farmWorlds.id, owned.world.id));
    }
  });

  return result;
}

export async function expandFarmBed(
  userId: string,
  bedId: string
): Promise<{ plotCount: number; gold: number } | "insufficient" | undefined> {
  const [row] = await getDb()
    .select({ bed: farmBeds, world: farmWorlds })
    .from(farmBeds)
    .innerJoin(farmWorlds, eq(farmBeds.worldId, farmWorlds.id))
    .where(and(eq(farmBeds.id, bedId), eq(farmWorlds.userId, userId)))
    .limit(1);
  if (!row) {
    return undefined;
  }
  const cost = expandBedCost(row.bed.plotCount);
  const newPlotCount = row.bed.plotCount + PLOTS_PER_EXPAND;

  return getDb().transaction(async (tx) => {
    const [world] = await tx
      .update(farmWorlds)
      .set({ gold: sql`${farmWorlds.gold} - ${cost}`, updatedAt: new Date() })
      .where(
        and(eq(farmWorlds.id, row.world.id), sql`${farmWorlds.gold} >= ${cost}`)
      )
      .returning();
    if (!world) {
      return "insufficient" as const;
    }
    await tx
      .update(farmBeds)
      .set({ plotCount: newPlotCount })
      .where(eq(farmBeds.id, bedId));
    return { plotCount: newPlotCount, gold: world.gold };
  });
}

export type { FarmReviewEvent } from "@/lib/game/types";

// Finds (or lazily creates) the world's 3-slot greenhouse bed. The bed
// needs a deck for the schema's NOT NULL; the placeholder deck never
// holds cards — demoted words keep living in their original decks.
async function ensureGreenhouseBed(
  userId: string,
  world: FarmWorld
): Promise<string> {
  const [existing] = await getDb()
    .select({ id: farmBeds.id })
    .from(farmBeds)
    .where(and(eq(farmBeds.worldId, world.id), eq(farmBeds.kind, "greenhouse")))
    .limit(1);
  if (existing) return existing.id;

  const [{ maxPosition }] = await getDb()
    .select({
      maxPosition: sql<number>`coalesce(max(${farmBeds.position}), -1)::int`,
    })
    .from(farmBeds)
    .where(eq(farmBeds.worldId, world.id));

  const { sourceLang, targetLang } = langPair(world.langKey);
  const [deck] = await getDb()
    .insert(decks)
    .values({
      userId,
      name: "Greenhouse",
      sourceLang,
      targetLang,
    })
    .returning();
  const [bed] = await getDb()
    .insert(farmBeds)
    .values({
      worldId: world.id,
      deckId: deck.id,
      plotCount: GREENHOUSE_PLOTS,
      position: maxPosition + 1,
      kind: "greenhouse",
    })
    .returning();
  return bed.id;
}

// Post-review farm lifecycle (GAME_PLAY §5): a word that reaches 21 days
// graduates out of its plot into the Forest, and a lapsed forest word
// comes back down to a plot (or the greenhouse when the farm is full).
// Both stay reviewable — reviews are card-level, plots are only where
// words are visually farmed.
// Puts a card into a bed slot: graduation leaves empty plot ROWS behind
// (only cardId is nulled), so a refill must update the existing row —
// inserting would trip the bed+slot unique key.
async function reclaimPlot(
  bedId: string,
  slotIndex: number,
  cardId: string
): Promise<boolean> {
  const updated = await getDb()
    .update(farmPlots)
    .set({ cardId, plantedAt: new Date() })
    .where(and(eq(farmPlots.bedId, bedId), eq(farmPlots.slotIndex, slotIndex)))
    .returning({ id: farmPlots.id });
  if (updated.length > 0) return true;
  const inserted = await getDb()
    .insert(farmPlots)
    .values({ bedId, slotIndex, cardId })
    .onConflictDoNothing()
    .returning({ id: farmPlots.id });
  return inserted.length > 0;
}

// Slot indexes that actually hold a card — an emptied row still occupies
// its slot index but is plantable again.
async function occupiedSlots(bedId: string): Promise<Set<number>> {
  const rows = await getDb()
    .select({ slotIndex: farmPlots.slotIndex })
    .from(farmPlots)
    .where(and(eq(farmPlots.bedId, bedId), isNotNull(farmPlots.cardId)));
  return new Set(rows.map((row) => row.slotIndex));
}

export async function applyFarmReviewHooks(
  userId: string,
  cardId: string,
  outcome: {
    intervalDaysBefore: number;
    newIntervalDays: number;
    grade: ReviewGrade;
  }
): Promise<FarmReviewEvent | null> {
  const [cardRow] = await getDb()
    .select({
      card: cards,
      world: farmWorlds,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .innerJoin(farmBeds, eq(farmBeds.deckId, decks.id))
    .innerJoin(farmWorlds, eq(farmBeds.worldId, farmWorlds.id))
    .where(and(eq(cards.id, cardId), eq(decks.userId, userId)))
    .limit(1);
  // The card's deck backs a bed of a DIFFERENT user's world, or the card
  // is not on any farm surface — either way there is nothing to move.
  if (!cardRow || cardRow.world.userId !== userId) {
    return null;
  }

  const [plot] = await getDb()
    .select({ id: farmPlots.id })
    .from(farmPlots)
    .where(eq(farmPlots.cardId, cardId))
    .limit(1);

  const base = {
    hanzi: cardRow.card.hanzi,
    pinyin: cardRow.card.pinyin,
    translation: cardRow.card.translation,
    replanted: false,
    greenhouse: false,
  };

  // Graduation (GAME_PLAY §5.1 + §10.2): the FIRST tree of a virgin world
  // crosses at 15 days, every later one at 21. The marker row makes the
  // Forest membership explicit — a 15-day tree must be visible too.
  const stats = cardRow.world.stats as FarmStats;
  if (
    cardRow.card.graduatedAt === null &&
    plot &&
    outcome.newIntervalDays >=
      graduationThreshold(stats.firstGraduation === true)
  ) {
    const graduatedAt = new Date();
    await getDb().transaction(async (tx) => {
      await tx
        .update(farmPlots)
        .set({ cardId: null, plantedAt: graduatedAt })
        .where(eq(farmPlots.id, plot.id));
      await tx.update(cards).set({ graduatedAt }).where(eq(cards.id, cardId));
      // Spending the first-graduation exception is part of the same
      // crossing — one write, no window where a second tree also slips
      // through at 15.
      await tx
        .update(farmWorlds)
        .set({
          stats: sql`jsonb_set(${farmWorlds.stats}, '{firstGraduation}', 'true'::jsonb)`,
          updatedAt: graduatedAt,
        })
        .where(
          and(
            eq(farmWorlds.id, cardRow.world.id),
            sql`${farmWorlds.stats} ->> 'firstGraduation' is distinct from 'true'`
          )
        );
    });
    return {
      type: "graduation",
      ...base,
      intervalDays: outcome.newIntervalDays,
    };
  }

  // Demotion (GAME_PLAY §5.2): a FORGOT on a graduated tree — at ANY
  // interval, including the 15-day first tree — knocks it back down.
  if (
    outcome.grade === ReviewGrade.FORGOT &&
    cardRow.card.graduatedAt !== null &&
    !plot
  ) {
    const bedRows = await getDb()
      .select({ bed: farmBeds })
      .from(farmBeds)
      .where(eq(farmBeds.worldId, cardRow.world.id))
      .orderBy(asc(farmBeds.position));
    for (const { bed } of bedRows) {
      if (bed.kind === "greenhouse") continue;
      const taken = await occupiedSlots(bed.id);
      for (let slot = 0; slot < bed.plotCount; slot += 1) {
        if (taken.has(slot)) continue;
        if (await reclaimPlot(bed.id, slot, cardId)) {
          await getDb()
            .update(cards)
            .set({ graduatedAt: null })
            .where(eq(cards.id, cardId));
          return {
            type: "demotion",
            ...base,
            intervalDays: outcome.intervalDaysBefore,
            replanted: true,
            greenhouse: false,
          };
        }
      }
    }
    // Farm is full: the greenhouse catches the demoted word so it is
    // never locked out of review (GAME_PLAY §5.2).
    const greenhouseBedId = await ensureGreenhouseBed(userId, cardRow.world);
    const taken = await occupiedSlots(greenhouseBedId);
    for (let slot = 0; slot < GREENHOUSE_PLOTS; slot += 1) {
      if (taken.has(slot)) continue;
      if (await reclaimPlot(greenhouseBedId, slot, cardId)) {
        await getDb()
          .update(cards)
          .set({ graduatedAt: null })
          .where(eq(cards.id, cardId));
        return {
          type: "demotion",
          ...base,
          intervalDays: outcome.intervalDaysBefore,
          replanted: true,
          greenhouse: true,
        };
      }
    }
    // Even the greenhouse is full: the tree keeps its Forest spot and
    // stays schedule-active; it lands in a plot the next time one frees
    // up (a graduation).
    return {
      type: "demotion",
      ...base,
      intervalDays: outcome.intervalDaysBefore,
      replanted: false,
      greenhouse: true,
    };
  }

  return null;
}

export type PurchaseResult =
  { gold: number } | "insufficient" | "owned" | "locked-tier" | undefined;

// Buys one shop item (GAME_PLAY §6.3): atomic gold guard, one row per
// world per item, house tiers strictly in order — the ladder is a
// milestone, not a menu.
export async function purchaseItem(
  userId: string,
  langKey: string,
  itemKey: string
): Promise<PurchaseResult> {
  const item = findShopItem(itemKey);
  if (!item) {
    return undefined;
  }
  const world = await getFarmWorld(userId, langKey);
  if (!world) {
    return undefined;
  }

  const ownedRows = await getDb()
    .select({ itemKey: farmItems.itemKey })
    .from(farmItems)
    .where(eq(farmItems.worldId, world.id));
  const owned = new Set(ownedRows.map((row) => row.itemKey));
  if (owned.has(item.key)) {
    return "owned";
  }
  if (item.houseTier !== undefined) {
    const previous = findShopItem(
      SHOP_ITEMS.find(
        (candidate) => candidate.houseTier === item.houseTier! - 1
      )?.key ?? ""
    );
    if (previous && !owned.has(previous.key)) {
      return "locked-tier";
    }
  }

  return getDb().transaction(async (tx) => {
    const [paid] = await tx
      .update(farmWorlds)
      .set({
        gold: sql`${farmWorlds.gold} - ${item.price}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(farmWorlds.id, world.id),
          sql`${farmWorlds.gold} >= ${item.price}`
        )
      )
      .returning();
    if (!paid) {
      return "insufficient" as const;
    }
    await tx
      .insert(farmItems)
      .values({ worldId: world.id, itemKey: item.key, qty: 1 })
      .onConflictDoNothing();
    return { gold: paid.gold };
  });
}

export async function recordSweepDay(
  userId: string,
  langKey: string,
  now: Date
): Promise<void> {
  await getDb()
    .insert(farmSweepDays)
    .values({ userId, langKey, dayKey: toUtcDayKey(now) })
    .onConflictDoNothing();
}

export async function getSweepStreak(
  userId: string,
  langKey: string,
  now: Date = new Date()
): Promise<number> {
  const rows = await getDb()
    .select({ dayKey: farmSweepDays.dayKey })
    .from(farmSweepDays)
    .where(
      and(eq(farmSweepDays.userId, userId), eq(farmSweepDays.langKey, langKey))
    );
  return computeStreak(
    rows.map((row) => row.dayKey),
    now
  );
}

export async function getLongestSweepStreak(
  userId: string,
  langKey: string
): Promise<number> {
  const rows = await getDb()
    .select({ dayKey: farmSweepDays.dayKey })
    .from(farmSweepDays)
    .where(
      and(eq(farmSweepDays.userId, userId), eq(farmSweepDays.langKey, langKey))
    );
  return longestStreak(rows.map((row) => row.dayKey));
}

// The 7-day-ever memento (GAME_PLAY §6.4): granted exactly once, the
// moment the longest sweep streak reaches the threshold. Returns true
// only on the insert that actually lands, so the caller can surface the
// wreath in the same snapshot it was earned.
async function grantStreakWreathOnce(
  userId: string,
  langKey: string,
  worldId: string
): Promise<boolean> {
  const longest = await getLongestSweepStreak(userId, langKey);
  if (longest < WREATH_STREAK_DAYS) return false;
  const inserted = await getDb()
    .insert(farmItems)
    .values({ worldId, itemKey: "streak_wreath", qty: 1 })
    .onConflictDoNothing()
    .returning({ id: farmItems.id });
  return inserted.length > 0;
}

export type ClaimHarvestResult = {
  alreadyClaimed: boolean;
  baseGold: number;
  goldAwarded: number;
  streakBonus: number;
  streak: number;
  cardsHarvested: number;
  gold: number;
};

export async function claimSessionHarvest(
  userId: string,
  sessionId: string,
  langKey: string
): Promise<ClaimHarvestResult | undefined> {
  const session = await getStudySession(userId, sessionId);
  const world = await getFarmWorld(userId, langKey);
  if (!session || !world) {
    return undefined;
  }
  const { sourceLang, targetLang } = langPair(langKey);

  const logs = await getDb()
    .select({
      cardId: reviewLogs.cardId,
      grade: reviewLogs.grade,
      intervalDaysBefore: reviewLogs.intervalDaysBefore,
    })
    .from(reviewLogs)
    .innerJoin(cards, eq(reviewLogs.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(reviewLogs.sessionId, sessionId),
        eq(decks.userId, userId),
        eq(decks.sourceLang, sourceLang),
        eq(decks.targetLang, targetLang)
      )
    )
    .orderBy(reviewLogs.reviewedAt);

  // Insert-once claim marker makes the whole operation idempotent.
  const [claim] = await getDb()
    .insert(farmHarvestClaims)
    .values({ sessionId, worldId: world.id, goldAwarded: 0 })
    .onConflictDoNothing()
    .returning();
  if (!claim) {
    return {
      alreadyClaimed: true,
      baseGold: 0,
      goldAwarded: 0,
      streakBonus: 0,
      streak: await getSweepStreak(userId, langKey),
      cardsHarvested: 0,
      gold: world.gold,
    };
  }

  // A Forgotten card is requeued for a learning step in the same session;
  // remembering it on the retry must not out-earn remembering it the first
  // time, so only the first review of each card pays. Logs are ordered by
  // review time, so the first entry per card is the paying one.
  const firstLogPerCard = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    if (!firstLogPerCard.has(log.cardId)) {
      firstLogPerCard.set(log.cardId, log);
    }
  }
  const baseGold = [...firstLogPerCard.values()].reduce(
    (total, log) =>
      total + harvestGold(log.intervalDaysBefore, log.grade as ReviewGrade),
    0
  );
  const cardsHarvested = firstLogPerCard.size;

  // The streak pays at the end of a sweep that cleared every ripe crop
  // (GAME_PLAY §6.4): the day only counts once nothing is left due.
  if (cardsHarvested > 0) {
    const remainingDue = await countDueForLang(userId, sourceLang, targetLang);
    if (remainingDue === 0) {
      await recordSweepDay(userId, langKey, new Date());
      await grantStreakWreathOnce(userId, langKey, world.id);
    }
  }
  const streak = await getSweepStreak(userId, langKey);
  const streakBonus = applyStreakBonus(baseGold, streak);
  const goldAwarded = baseGold + streakBonus;

  return getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(farmWorlds)
      .set({
        gold: sql`${farmWorlds.gold} + ${goldAwarded}`,
        stats: sql`jsonb_set(jsonb_set(${farmWorlds.stats}, '{harvested}', ((${farmWorlds.stats} ->> 'harvested')::int + ${cardsHarvested})::text::jsonb), '{goldEarned}', ((${farmWorlds.stats} ->> 'goldEarned')::int + ${goldAwarded})::text::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(farmWorlds.id, world.id))
      .returning();
    await tx
      .update(farmHarvestClaims)
      .set({ goldAwarded })
      .where(eq(farmHarvestClaims.sessionId, sessionId));
    return {
      alreadyClaimed: false,
      baseGold,
      goldAwarded,
      streakBonus,
      streak,
      cardsHarvested,
      gold: updated.gold,
    };
  });
}
