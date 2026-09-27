import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { ReviewGrade } from "@colyglot/srs";

import type { SeedWord } from "@/lib/game/content/types";
import {
  expandBedCost,
  harvestGold,
  PLOTS_PER_EXPAND,
  START_PLOTS,
  STARTING_GOLD,
} from "@/lib/game/core/economy";
import type { BedView, FarmWorldSnapshot, PlotView } from "@/lib/game/types";

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
  farmWorlds,
  levelFromXp,
  reviewLogs,
  type FarmStats,
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
    });

    // Legacy decks of the same language pair become beds; oldest cards
    // occupy the first slots so the farm never starts empty.
    const legacyDecks = await tx
      .select()
      .from(decks)
      .where(
        and(
          eq(decks.userId, userId),
          eq(decks.sourceLang, input.sourceLang),
          eq(decks.targetLang, input.targetLang)
        )
      )
      .orderBy(asc(decks.createdAt));

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
        .values({ worldId: world.id, deckId: deck.id, plotCount, position })
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
      plots,
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
      .where(eq(farmPlots.bedId, bedId));
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
      await tx.insert(farmPlots).values({ bedId, slotIndex, cardId: card.id });
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

export type ClaimHarvestResult = {
  alreadyClaimed: boolean;
  goldAwarded: number;
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
      goldAwarded: 0,
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
  const goldAwarded = [...firstLogPerCard.values()].reduce(
    (total, log) =>
      total + harvestGold(log.intervalDaysBefore, log.grade as ReviewGrade),
    0
  );
  const cardsHarvested = firstLogPerCard.size;

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
      goldAwarded,
      cardsHarvested,
      gold: updated.gold,
    };
  });
}
