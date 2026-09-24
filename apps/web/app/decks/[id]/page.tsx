import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { DeckDetailContent } from "@/components/decks/deck-detail-content";
import { CardListSkeleton } from "@/components/ui/skeleton";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AppShell backHref="/">
      <Suspense fallback={<CardListSkeleton count={4} />}>
        <DeckDetailContent params={params} />
      </Suspense>
    </AppShell>
  );
}
