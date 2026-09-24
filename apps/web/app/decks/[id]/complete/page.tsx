import { CircleCheckBig } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeck } from "@/lib/db/repositories/content";
import {
  getCurrentStreak,
  getSessionReviewSummary,
} from "@/lib/db/repositories/study";

export default async function CompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AppShell backHref="/">
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <CompleteContent params={params} searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}

async function CompleteContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const [{ id: deckId }, query] = await Promise.all([params, searchParams]);
  const sessionParam = query.session;
  const sessionId = Array.isArray(sessionParam)
    ? sessionParam[0]
    : sessionParam;
  if (!sessionId) {
    notFound();
  }
  const [deck, summary, streak] = await Promise.all([
    getDeck(deckId).catch(() => undefined),
    getSessionReviewSummary(sessionId).catch(() => undefined),
    getCurrentStreak().catch(() => 0),
  ]);
  if (!summary) {
    notFound();
  }

  const durationMs =
    (summary.endedAt ?? summary.startedAt).getTime() -
    summary.startedAt.getTime();
  const minutes = Math.max(1, Math.round(durationMs / 60_000));

  return (
    <div className="relative flex flex-1 flex-col items-center gap-6 py-6">
      <span
        className="pointer-events-none absolute -top-2 right-0 font-hanzi text-[130px] leading-none font-black text-fg opacity-[0.04] select-none"
        aria-hidden
      >
        成
      </span>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-success/20 blur-2xl"
          aria-hidden
        />
        <div className="flex size-16 animate-[pop-in_420ms_cubic-bezier(0.34,1.56,0.64,1)_both] items-center justify-center rounded-full bg-green-500/12 text-success">
          <CircleCheckBig className="size-8" aria-hidden />
        </div>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Session complete</h1>
        <p className="text-sm text-fg-muted">
          {deck
            ? `${deck.name} · about ${minutes} min`
            : `About ${minutes} min`}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <div className="animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_80ms_both]">
          <Stat label="Cards reviewed" value={summary.cardsReviewed} />
        </div>
        <div className="animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_140ms_both]">
          <Stat label="Reviews" value={summary.totalReviews} />
        </div>
        <div className="animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_200ms_both]">
          <Stat label="Day streak" value={streak} accent />
        </div>
        <div className="col-span-2 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Grade split
          </p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="bg-red-500"
              style={{
                width: `${pct(summary.againCount, summary.totalReviews)}%`,
              }}
            />
            <div
              className="bg-primary"
              style={{
                width: `${pct(summary.goodCount, summary.totalReviews)}%`,
              }}
            />
            <div
              className="bg-accent"
              style={{
                width: `${pct(summary.easyCount, summary.totalReviews)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-fg-muted">
            <span className="text-red-500">{summary.againCount} again</span>
            <span className="text-primary">{summary.goodCount} good</span>
            <span className="text-yellow-600 dark:text-yellow-400">
              {summary.easyCount} easy
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Link href={`/decks/${deckId}`} className="w-full">
          <Button block size="lg">
            Back to deck
          </Button>
        </Link>
        <Link href="/" className="w-full">
          <Button block size="lg" variant="secondary">
            Dashboard
          </Button>
        </Link>
      </div>
      <p className="text-center text-xs text-fg-subtle">
        Graded cards are scheduled — the scheduler brings them back right when
        you&apos;re about to forget.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <span className={`text-2xl font-bold ${accent ? "text-orange-500" : ""}`}>
        {value}
      </span>
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  );
}

function pct(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}
