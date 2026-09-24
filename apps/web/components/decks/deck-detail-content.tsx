import { ChevronRight, PenLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DataError } from "@/components/data-error";
import { CardFormDialog } from "@/components/decks/card-form-dialog";
import { CardRowActions } from "@/components/decks/card-row-actions";
import { DeleteDeckButton } from "@/components/decks/delete-deck-button";
import { RenameDeckDialog } from "@/components/decks/rename-deck-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { getDeck, listCards } from "@/lib/db/repositories/content";
import { countDueCardsByDeck } from "@/lib/db/repositories/study";

export async function DeckDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id: deckId } = await params;
  let data: Awaited<ReturnType<typeof loadData>>;
  try {
    data = await loadData(deckId);
  } catch {
    return <DataError message="Couldn't load this deck. Try again." />;
  }

  const { deck, cards, dueCount } = data;
  if (!deck) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{deck.name}</h1>
            <p className="text-xs uppercase tracking-wide text-fg-subtle">
              {deck.sourceLang} → {deck.targetLang} · {cards.length} card
              {cards.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <RenameDeckDialog deckId={deck.id} currentName={deck.name} />
            <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
          </div>
        </div>
        <Link
          href={`/decks/${deck.id}/study`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 text-sm font-semibold text-on-primary shadow-sm transition-transform hover:brightness-110 active:scale-[0.99] dark:from-primary-600 dark:to-primary-400"
        >
          {dueCount > 0
            ? `Study ${dueCount} due card${dueCount === 1 ? "" : "s"}`
            : "Study this deck"}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Cards
        </h2>
        <CardFormDialog deckId={deck.id} />
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<PenLine className="size-full" aria-hidden />}
          title="No cards in this deck"
          description="Add your first card — hanzi, pinyin, translation, examples and collocations."
          action={<CardFormDialog deckId={deck.id} label="Add card" />}
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {cards.map((card, index) => (
            <li
              key={card.id}
              className="animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_both] flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="min-w-0">
                <p className="font-hanzi text-lg font-bold" lang="zh-CN">
                  {card.hanzi}
                </p>
                <p className="font-mono text-xs tracking-widest text-fg-muted">
                  {card.pinyin}
                </p>
                <p className="mt-0.5 truncate text-sm text-fg">
                  {card.translation}
                </p>
                {card.examples.length > 0 ? (
                  <p
                    className="font-hanzi mt-1 truncate text-xs text-fg-subtle"
                    lang="zh-CN"
                  >
                    e.g. {card.examples[0]?.hanzi}
                  </p>
                ) : null}
              </div>
              <CardRowActions deckId={deck.id} card={card} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function loadData(deckId: string) {
  const [deck, cards, dueCounts] = await Promise.all([
    getDeck(deckId),
    listCards(deckId),
    countDueCardsByDeck(),
  ]);
  const dueCount =
    dueCounts.find((row) => row.deckId === deckId)?.dueCount ?? 0;
  return { deck, cards, dueCount };
}
