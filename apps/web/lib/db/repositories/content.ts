import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "../index";
import {
  cardRecordings,
  cards,
  decks,
  type Card,
  type CardCollocation,
  type CardExample,
  type CardRecording,
  type Deck,
} from "../schema";

export type CreateDeckInput = {
  name: string;
  sourceLang?: string;
  targetLang?: string;
};

export type CreateCardInput = {
  deckId: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  examples?: CardExample[];
  collocations?: CardCollocation[];
};

export type UpdateCardInput = {
  hanzi?: string;
  pinyin?: string;
  translation?: string;
  examples?: CardExample[];
  collocations?: CardCollocation[];
};

export type SaveCardRecordingInput = {
  cardId: string;
  storagePath: string;
  durationMs?: number;
};

function ownedDeckIds(userId: string) {
  return getDb()
    .select({ id: decks.id })
    .from(decks)
    .where(eq(decks.userId, userId));
}

export async function createDeck(
  userId: string,
  input: CreateDeckInput
): Promise<Deck> {
  const [deck] = await getDb()
    .insert(decks)
    .values({ ...input, userId })
    .returning();
  return deck;
}

export async function getDeck(
  userId: string,
  deckId: string
): Promise<Deck | undefined> {
  const [deck] = await getDb()
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  return deck;
}

export async function listDecks(userId: string): Promise<Deck[]> {
  return getDb()
    .select()
    .from(decks)
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.createdAt));
}

export async function renameDeck(
  userId: string,
  deckId: string,
  name: string
): Promise<Deck | undefined> {
  const [deck] = await getDb()
    .update(decks)
    .set({ name })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning();
  return deck;
}

export async function deleteDeck(
  userId: string,
  deckId: string
): Promise<boolean> {
  const deletedRows = await getDb()
    .delete(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  return deletedRows.length > 0;
}

export async function createCard(
  userId: string,
  input: CreateCardInput
): Promise<Card | undefined> {
  const deck = await getDeck(userId, input.deckId);
  if (!deck) {
    return undefined;
  }
  const [card] = await getDb().insert(cards).values(input).returning();
  return card;
}

export async function getCard(
  userId: string,
  cardId: string
): Promise<Card | undefined> {
  const [card] = await getDb()
    .select({ card: cards })
    .from(cards)
    .where(
      and(eq(cards.id, cardId), inArray(cards.deckId, ownedDeckIds(userId)))
    )
    .limit(1);
  return card?.card;
}

export async function updateCard(
  userId: string,
  cardId: string,
  input: UpdateCardInput
): Promise<Card | undefined> {
  const [card] = await getDb()
    .update(cards)
    .set(input)
    .where(
      and(eq(cards.id, cardId), inArray(cards.deckId, ownedDeckIds(userId)))
    )
    .returning();
  return card;
}

export async function deleteCard(
  userId: string,
  cardId: string
): Promise<boolean> {
  const deletedRows = await getDb()
    .delete(cards)
    .where(
      and(eq(cards.id, cardId), inArray(cards.deckId, ownedDeckIds(userId)))
    )
    .returning({ id: cards.id });
  return deletedRows.length > 0;
}

export async function listCards(
  userId: string,
  deckId: string
): Promise<Card[]> {
  const deck = await getDeck(userId, deckId);
  if (!deck) {
    return [];
  }
  return getDb()
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(asc(cards.createdAt));
}

export async function saveCardRecording(
  userId: string,
  input: SaveCardRecordingInput
): Promise<CardRecording | undefined> {
  const card = await getCard(userId, input.cardId);
  if (!card) {
    return undefined;
  }
  const [recording] = await getDb()
    .insert(cardRecordings)
    .values(input)
    .onConflictDoUpdate({
      target: cardRecordings.cardId,
      set: {
        storagePath: input.storagePath,
        durationMs: input.durationMs ?? 0,
      },
    })
    .returning();
  return recording;
}

export async function getCardRecording(
  userId: string,
  cardId: string
): Promise<CardRecording | undefined> {
  const card = await getCard(userId, cardId);
  if (!card) {
    return undefined;
  }
  const [recording] = await getDb()
    .select()
    .from(cardRecordings)
    .where(eq(cardRecordings.cardId, cardId));
  return recording;
}

export async function deleteCardRecording(
  userId: string,
  cardId: string
): Promise<boolean> {
  const card = await getCard(userId, cardId);
  if (!card) {
    return false;
  }
  const deletedRows = await getDb()
    .delete(cardRecordings)
    .where(eq(cardRecordings.cardId, cardId))
    .returning({ id: cardRecordings.id });
  return deletedRows.length > 0;
}
