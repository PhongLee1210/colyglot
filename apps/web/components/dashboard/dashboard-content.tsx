import { ChevronRight, Flame, Layers } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { CreateDeckDialog } from "@/components/dashboard/create-deck-dialog";
import { DataError } from "@/components/data-error";
import { EmptyState } from "@/components/ui/empty-state";
import { listDecks } from "@/lib/db/repositories/content";
import {
  countDueCardsByDeck,
  getCurrentStreak,
} from "@/lib/db/repositories/study";

export async function DashboardContent() {
  await connection();
  let data: Awaited<ReturnType<typeof loadDashboard>>;
  try {
    data = await loadDashboard();
  } catch (error) {
    console.error("loadDashboard failed", error);
    return (
      <DataError message="Couldn't load your decks. Check your connection and try again." />
    );
  }

  const { decks, dueCounts, streak } = data;
  const dueByDeck = new Map(dueCounts.map((row) => [row.deckId, row.dueCount]));
  const totalDue = dueCounts.reduce((sum, row) => sum + row.dueCount, 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4">
        <span
          className="pointer-events-none absolute -right-3 -bottom-8 font-hanzi text-[150px] leading-none font-black text-fg opacity-[0.04] select-none"
          aria-hidden
        >
          學
        </span>
        <div
          className="pointer-events-none absolute -top-12 -left-12 size-40 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/12 text-orange-500">
            <Flame className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-2xl leading-none font-bold">{streak}</p>
            <p className="text-xs text-fg-muted">
              day{streak === 1 ? "" : "s"} streak
            </p>
          </div>
        </div>
        <div className="relative text-right">
          <p className="text-2xl leading-none font-bold text-primary">
            {totalDue}
          </p>
          <p className="text-xs text-fg-muted">
            card{totalDue === 1 ? "" : "s"} due
          </p>
        </div>
      </section>

      {decks.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-full" aria-hidden />}
          title="No decks yet"
          description="Create your first deck and start building vocabulary — or study the starter deck once it's seeded."
          action={<CreateDeckDialog />}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
              Decks
            </h2>
            <CreateDeckDialog />
          </div>
          <ul className="flex flex-col gap-3">
            {decks.map((deck, index) => {
              const due = dueByDeck.get(deck.id) ?? 0;
              return (
                <li
                  key={deck.id}
                  className="animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
                >
                  <Link
                    href={`/decks/${deck.id}`}
                    className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary active:scale-[0.99] active:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">
                        {deck.name}
                      </p>
                      <p className="text-xs tracking-wide text-fg-subtle uppercase">
                        {deck.sourceLang} → {deck.targetLang}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          due > 0
                            ? "flex min-h-9 items-center rounded-full bg-primary px-3.5 text-sm font-bold text-on-primary"
                            : "flex min-h-9 items-center rounded-full bg-surface-2 px-3.5 text-sm font-semibold text-fg-subtle"
                        }
                      >
                        {due}
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-fg-subtle"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

async function loadDashboard() {
  const [decks, dueCounts, streak] = await Promise.all([
    listDecks(),
    countDueCardsByDeck(),
    getCurrentStreak(),
  ]);
  return { decks, dueCounts, streak };
}
