"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Deck name is required" };
  }
  try {
    const deck = await createDeck({ name });
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
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Deck name is required" };
  }
  try {
    const deck = await renameDeck(deckId, trimmed);
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
  try {
    const deleted = await deleteDeck(deckId);
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
  const error = validateCardInput(input);
  if (error) {
    return { ok: false, error: error };
  }
  try {
    const card = await createCard({
      deckId: input.deckId,
      hanzi: input.hanzi.trim(),
      pinyin: input.pinyin.trim(),
      translation: input.translation.trim(),
      examples: input.examples,
      collocations: input.collocations,
    });
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
  const error = validateCardInput({ ...input, deckId });
  if (error) {
    return { ok: false, error: error };
  }
  try {
    const card = await updateCard(cardId, {
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
  try {
    const deleted = await deleteCard(cardId);
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
  await deleteDeck(deckId);
  revalidatePath(DECK_PATH);
  redirect("/");
}
