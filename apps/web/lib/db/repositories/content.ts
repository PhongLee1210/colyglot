import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "../index";
import {
  cardRecordings,
  cards,
  decks,
  LOCAL_USER_ID,
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
  userId?: string;
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

export async function createDeck(input: CreateDeckInput): Promise<Deck> {
  const [deck] = await getDb().insert(decks).values(input).returning();
  return deck;
}

export async function getDeck(deckId: string): Promise<Deck | undefined> {
  const [deck] = await getDb().select().from(decks).where(eq(decks.id, deckId));
  return deck;
}

export async function listDecks(
  userId: string = LOCAL_USER_ID
): Promise<Deck[]> {
  return getDb()
    .select()
    .from(decks)
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.createdAt));
}

export async function renameDeck(
  deckId: string,
  name: string
): Promise<Deck | undefined> {
  const [deck] = await getDb()
    .update(decks)
    .set({ name })
    .where(eq(decks.id, deckId))
    .returning();
  return deck;
}

export async function deleteDeck(deckId: string): Promise<boolean> {
  const deletedRows = await getDb()
    .delete(decks)
    .where(eq(decks.id, deckId))
    .returning({ id: decks.id });
  return deletedRows.length > 0;
}

export async function createCard(input: CreateCardInput): Promise<Card> {
  const [card] = await getDb().insert(cards).values(input).returning();
  return card;
}

export async function getCard(cardId: string): Promise<Card | undefined> {
  const [card] = await getDb().select().from(cards).where(eq(cards.id, cardId));
  return card;
}

export async function updateCard(
  cardId: string,
  input: UpdateCardInput
): Promise<Card | undefined> {
  const [card] = await getDb()
    .update(cards)
    .set(input)
    .where(eq(cards.id, cardId))
    .returning();
  return card;
}

export async function deleteCard(cardId: string): Promise<boolean> {
  const deletedRows = await getDb()
    .delete(cards)
    .where(eq(cards.id, cardId))
    .returning({ id: cards.id });
  return deletedRows.length > 0;
}

export async function listCards(deckId: string): Promise<Card[]> {
  return getDb()
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(asc(cards.createdAt));
}

export async function saveCardRecording(
  input: SaveCardRecordingInput
): Promise<CardRecording> {
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
  cardId: string
): Promise<CardRecording | undefined> {
  const [recording] = await getDb()
    .select()
    .from(cardRecordings)
    .where(eq(cardRecordings.cardId, cardId));
  return recording;
}

export async function deleteCardRecording(cardId: string): Promise<boolean> {
  const deletedRows = await getDb()
    .delete(cardRecordings)
    .where(eq(cardRecordings.cardId, cardId))
    .returning({ id: cardRecordings.id });
  return deletedRows.length > 0;
}
