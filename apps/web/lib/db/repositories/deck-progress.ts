import { and, eq, sql } from "drizzle-orm";

import { getDb } from "../index";
import {
  cards,
  deckProgress,
  decks,
  levelFromXp,
  XP_PER_LEVEL,
  type DeckProgress,
} from "../schema";

export async function listDeckProgress(
  userId: string
): Promise<DeckProgress[]> {
  const rows = await getDb()
    .select({ progress: deckProgress })
    .from(deckProgress)
    .innerJoin(decks, eq(deckProgress.deckId, decks.id))
    .where(eq(decks.userId, userId));
  return rows.map((row) => row.progress);
}

export async function addDeckXpForCard(
  userId: string,
  cardId: string,
  xpAmount: number
): Promise<DeckProgress | undefined> {
  const [ownedCard] = await getDb()
    .select({ deckId: cards.deckId })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(cards.id, cardId), eq(decks.userId, userId)))
    .limit(1);
  if (!ownedCard) {
    return undefined;
  }

  const [row] = await getDb()
    .insert(deckProgress)
    .values({
      deckId: ownedCard.deckId,
      userId,
      xp: xpAmount,
      level: levelFromXp(xpAmount),
    })
    .onConflictDoUpdate({
      target: deckProgress.deckId,
      set: {
        xp: sql`${deckProgress.xp} + ${xpAmount}`,
        level: sql`floor((${deckProgress.xp} + ${xpAmount})::numeric / ${XP_PER_LEVEL}) + 1`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
