import { ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  orderSessionQueue,
  review as previewReview,
  ReviewGrade,
} from "@colyglot/srs";

import { StudySession } from "@/components/study/study-session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getDeck } from "@/lib/db/repositories/content";
import { getDueQueue, openStudySession } from "@/lib/db/repositories/study";
import type { Card } from "@/lib/db/schema";
import Link from "next/link";

export type SessionCard = {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  examples: Card["examples"];
  collocations: Card["collocations"];
  hints: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
};

export async function StudyContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id: deckId } = await params;
  const deck = await getDeck(deckId);
  if (!deck) {
    notFound();
  }

  const dueItems = (await getDueQueue()).filter(
    (item) => item.card.deckId === deckId
  );
  const now = new Date();
  const queue = orderSessionQueue(
    dueItems.map((item) => ({
      id: item.card.id,
      createdAt: item.card.createdAt,
      schedule: item.schedule,
      card: item.card,
    })),
    now
  );

  if (queue.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<ShieldCheck className="size-full" aria-hidden />}
          title="All caught up!"
          description="No cards are due in this deck right now. Come back when the scheduler brings them back — or add more cards."
          action={
            <div className="flex gap-2">
              <Link href={`/decks/${deckId}`}>
                <Button variant="secondary">Back to deck</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const session = await openStudySession();
  const cards: SessionCard[] = queue.map((item) => {
    const state = item.schedule
      ? {
          easeFactor: item.schedule.easeFactor,
          intervalDays: item.schedule.intervalDays,
          dueAt: item.schedule.dueAt,
          reviewCount: item.schedule.reviewCount,
          consecutiveCorrect: item.schedule.consecutiveCorrect,
          lapses: item.schedule.lapses,
          lastReviewedAt: item.schedule.lastReviewedAt,
        }
      : null;
    return {
      id: item.card.id,
      hanzi: item.card.hanzi,
      pinyin: item.card.pinyin,
      translation: item.card.translation,
      examples: item.card.examples,
      collocations: item.card.collocations,
      hints: {
        again: previewReview(state, ReviewGrade.FORGOT, now).intervalDays,
        hard: previewReview(state, ReviewGrade.HARD, now).intervalDays,
        good: previewReview(state, ReviewGrade.GOOD, now).intervalDays,
        easy: previewReview(state, ReviewGrade.EASY, now).intervalDays,
      },
    };
  });

  return (
    <StudySession
      deckId={deckId}
      deckName={deck.name}
      sessionId={session.id}
      initialQueue={cards}
    />
  );
}
