"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import {
  createCard,
  createDeck,
  deleteCard,
  deleteDeck,
  renameDeck,
  updateCard,
} from "@/lib/db/repositories/content";
import type { Card, CardCollocation, CardExample, Deck } from "@/lib/db/schema";
import type { ActionResult } from "./types";

const DECK_PATH = "/";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export type DeckInput = {
  name: string;
};

export async function createDeckAction(
  input: DeckInput
): Promise<ActionResult<Deck>> {
  const userId = await requireUserId();
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Deck name is required" };
  }
  try {
    const deck = await createDeck(userId, { name });
    revalidatePath(DECK_PATH);
    return { ok: true, data: deck };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function renameDeckAction(
  deckId: string,
  name: string
): Promise<ActionResult<Deck>> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Deck name is required" };
  }
  try {
    const deck = await renameDeck(userId, deckId, trimmed);
    if (!deck) {
      return { ok: false, error: "Deck not found" };
    }
    revalidatePath(DECK_PATH);
    revalidatePath(`/decks/${deckId}`);
    return { ok: true, data: deck };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function deleteDeckAction(
  deckId: string
): Promise<ActionResult<true>> {
  const userId = await requireUserId();
  try {
    const deleted = await deleteDeck(userId, deckId);
    if (!deleted) {
      return { ok: false, error: "Deck not found" };
    }
    revalidatePath(DECK_PATH);
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export type CardInput = {
  deckId: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  examples: CardExample[];
  collocations: CardCollocation[];
};

function validateCardInput(input: CardInput): string | null {
  if (!input.hanzi.trim()) {
    return "Hanzi is required";
  }
  if (!input.pinyin.trim()) {
    return "Pinyin is required";
  }
  if (!input.translation.trim()) {
    return "Translation is required";
  }
  return null;
}

export async function createCardAction(
  input: CardInput
): Promise<ActionResult<Card>> {
  const userId = await requireUserId();
  const error = validateCardInput(input);
  if (error) {
    return { ok: false, error: error };
  }
  try {
    const card = await createCard(userId, {
      deckId: input.deckId,
      hanzi: input.hanzi.trim(),
      pinyin: input.pinyin.trim(),
      translation: input.translation.trim(),
      examples: input.examples,
      collocations: input.collocations,
    });
    if (!card) {
      return { ok: false, error: "Deck not found" };
    }
    revalidatePath(`/decks/${input.deckId}`);
    return { ok: true, data: card };
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message.includes("cards_deck_id_hanzi_key")
    ) {
      return {
        ok: false,
        error: "A card with this hanzi already exists in the deck",
      };
    }
    return { ok: false, error: toMessage(cause) };
  }
}

export async function updateCardAction(
  cardId: string,
  deckId: string,
  input: Omit<CardInput, "deckId">
): Promise<ActionResult<Card>> {
  const userId = await requireUserId();
  const error = validateCardInput({ ...input, deckId });
  if (error) {
    return { ok: false, error: error };
  }
  try {
    const card = await updateCard(userId, cardId, {
      hanzi: input.hanzi.trim(),
      pinyin: input.pinyin.trim(),
      translation: input.translation.trim(),
      examples: input.examples,
      collocations: input.collocations,
    });
    if (!card) {
      return { ok: false, error: "Card not found" };
    }
    revalidatePath(`/decks/${deckId}`);
    return { ok: true, data: card };
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message.includes("cards_deck_id_hanzi_key")
    ) {
      return {
        ok: false,
        error: "A card with this hanzi already exists in the deck",
      };
    }
    return { ok: false, error: toMessage(cause) };
  }
}

export async function deleteCardAction(
  cardId: string,
  deckId: string
): Promise<ActionResult<true>> {
  const userId = await requireUserId();
  try {
    const deleted = await deleteCard(userId, cardId);
    if (!deleted) {
      return { ok: false, error: "Card not found" };
    }
    revalidatePath(`/decks/${deckId}`);
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function deleteDeckAndRedirectAction(
  deckId: string
): Promise<void> {
  const userId = await requireUserId();
  await deleteDeck(userId, deckId);
  revalidatePath(DECK_PATH);
  redirect("/");
}
