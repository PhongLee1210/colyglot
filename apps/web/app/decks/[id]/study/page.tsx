import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { StudyContent } from "@/components/study/study-content";
import { CardListSkeleton } from "@/components/ui/skeleton";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AppShell backHref="/" account={false}>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <StudyContent params={params} />
      </Suspense>
    </AppShell>
  );
}
