import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { CardListSkeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <AppShell>
      <Suspense fallback={<CardListSkeleton count={4} />}>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}
