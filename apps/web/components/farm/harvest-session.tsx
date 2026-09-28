"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { claimHarvestAction, openHarvestAction } from "@/lib/actions/farm";
import { finishSessionAction, gradeCardAction } from "@/lib/actions/study";
import { type HarvestPreview } from "@/lib/game/core/economy";
import { useFarmStore } from "@/lib/game/store/farm-store";
import { applyClaim } from "@/lib/game/store/reducers";
import type { HarvestCard } from "@/lib/game/types";
import { ReviewGrade } from "@colyglot/srs";

import { HarvestCelebration } from "./celebration";
import { BackToFarmButton, FarmOverlay, FarmPanel } from "./farm-overlay";
import { SpeakButton } from "./speak-button";

const GRADE_BUTTONS: {
  grade: ReviewGrade;
  label: string;
  className: string;
}[] = [
  {
    grade: ReviewGrade.FORGOT,
    label: "Forgot",
    className: "bg-red-600 text-white",
  },
  {
    grade: ReviewGrade.HARD,
    label: "Hard",
    className: "bg-orange-500 text-white",
  },
  {
    grade: ReviewGrade.GOOD,
    label: "Good",
    className: "bg-green-600 text-white",
  },
  {
    grade: ReviewGrade.EASY,
    label: "Easy",
    className: "bg-sky-600 text-white",
  },
  {
    grade: ReviewGrade.PERFECT,
    label: "Perfect",
    className: "bg-violet-600 text-white",
  },
];

function intervalHint(intervalDays: number): string {
  return intervalDays < 1
    ? "<1d"
    : intervalDays === 1
      ? "1d"
      : `${intervalDays}d`;
}

export function HarvestSession({
  onClose,
  streak,
}: {
  onClose: () => void;
  streak: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [queue, setQueue] = useState<HarvestCard[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<HarvestPreview | null>(null);
  const [nextInterval, setNextInterval] = useState<number | null>(null);
  const [learningStep, setLearningStep] = useState(false);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [claim, setClaim] = useState<{
    goldAwarded: number;
    cardsHarvested: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!snapshot) return null;

  if (claim) {
    return (
      <HarvestCelebration
        claim={claim}
        reviewed={reviewed}
        streak={streak}
        onDone={() => {
          router.refresh();
          onClose();
        }}
      />
    );
  }

  if (queue === null) {
    return (
      <FarmOverlay>
        <div className="text-4xl">🧺</div>
        <h1 className="text-xl font-extrabold">Harvest</h1>
        <p className="text-sm text-fg-muted">
          {snapshot.dueCount > 0
            ? `${snapshot.dueCount} ${snapshot.dueCount === 1 ? "crop is" : "crops are"} ready. Grade each one to harvest.`
            : "Nothing is ready yet — plant and nurture words first."}
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-line px-6 py-2 font-bold transition hover:bg-surface-2"
            onClick={onClose}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
            disabled={busy || snapshot.dueCount === 0}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const result = await openHarvestAction(snapshot.world.langKey);
                if (result.ok) {
                  setSessionId(result.data.sessionId);
                  setQueue(result.data.queue);
                  setTotal(result.data.queue.length);
                } else {
                  setError(result.error);
                }
              } catch {
                toast(
                  "Connection lost — check your network and try again",
                  "danger"
                );
              }
              setBusy(false);
            }}
          >
            Begin harvest
          </button>
        </div>
      </FarmOverlay>
    );
  }

  if (queue.length === 0) {
    return (
      <FarmOverlay>
        <div className="text-4xl">🌿</div>
        <h1 className="text-xl font-extrabold">All caught up</h1>
        <p className="text-sm text-fg-muted">Every crop is still growing.</p>
        <BackToFarmButton onClick={onClose} />
      </FarmOverlay>
    );
  }

  const card = queue[0];
  // A lapsed card comes back for a learning step; it only counts as
  // harvested once it finally sticks.
  const completed = reviewed - retried.size;
  const pendingRetries = queue.filter((item) =>
    retried.has(item.cardId)
  ).length;

  async function finish(reviewedCount: number) {
    if (sessionId && reviewedCount > 0) {
      try {
        await finishSessionAction(sessionId, reviewedCount);
        const result = await claimHarvestAction(
          sessionId,
          snapshot!.world.langKey
        );
        if (result.ok) {
          hydrate(applyClaim(useFarmStore.getState().snapshot!, result.data));
          setClaim({
            goldAwarded: result.data.goldAwarded,
            cardsHarvested: result.data.cardsHarvested,
          });
          return;
        }
      } catch {
        toast(
          "Connection lost — your gold is saved, retry from the farm",
          "danger"
        );
      }
    }
    onClose();
  }

  async function grade(selected: ReviewGrade) {
    if (busy || preview || learningStep || !sessionId) return;
    setBusy(true);
    let result;
    try {
      result = await gradeCardAction(card.cardId, sessionId, selected);
    } catch {
      toast("Connection lost — check your network and try again", "danger");
      setBusy(false);
      return;
    }
    if (!result.ok) {
      toast(result.error, "danger");
      setBusy(false);
      return;
    }
    const reviewedCount = reviewed + 1;
    setRevealed(false);
    setReviewed(reviewedCount);
    setNextInterval(result.data.intervalDays);
    // The claim pays once per card per session, so a retry shows the next
    // step instead of gold — forgetting must never out-earn remembering.
    const isRetry = retried.has(card.cardId);
    if (!isRetry) {
      setPreview(result.data.goldPreview);
    } else {
      setLearningStep(true);
    }
    if (result.data.requeued) {
      setRetried((prev) => new Set(prev).add(card.cardId));
    }
    // Busy holds through the pop window; the timeout releases it and,
    // once the basket empties, flows straight into the celebration.
    // `busy` blocks concurrent grades, so this render's queue is current.
    const remaining = queue!.slice(1);
    const next = result.data.requeued ? [...remaining, card] : remaining;
    setTimeout(() => {
      setPreview(null);
      setLearningStep(false);
      setNextInterval(null);
      setQueue(next);
      setBusy(false);
      if (next.length === 0) {
        void finish(reviewedCount);
      }
    }, 850);
  }

  return (
    <FarmPanel>
      <header className="flex items-center justify-between border-b border-line p-4">
        <h1 className="text-lg font-extrabold">🧺 Harvest</h1>
        <span className="text-sm text-fg-muted">
          {total ? `${completed} of ${total}` : `${completed} harvested`}
          {pendingRetries > 0 ? ` · ${pendingRetries} to retry` : ""}
        </span>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-1 text-sm transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          onClick={() => finish(reviewed)}
        >
          Finish
        </button>
      </header>
      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {preview ? (
          <div
            aria-live="polite"
            className="pointer-events-none fixed left-1/2 top-1/3 z-10 -translate-x-1/2 rounded-2xl bg-green-600 px-4 py-2 text-center font-bold text-white animate-[harvest-pop_850ms_ease-out]"
          >
            <p className="text-lg">+{preview.total} 💰</p>
            <p className="text-xs font-semibold opacity-90">
              {preview.base} base × {preview.multiplier}
              {nextInterval !== null
                ? ` · next in ${intervalHint(nextInterval)}`
                : ""}
            </p>
          </div>
        ) : learningStep ? (
          <div
            aria-live="polite"
            className="pointer-events-none fixed left-1/2 top-1/3 z-10 -translate-x-1/2 rounded-2xl bg-orange-500 px-4 py-2 text-center font-bold text-white animate-[harvest-pop_850ms_ease-out]"
          >
            <p className="text-lg">Learning step</p>
            {nextInterval !== null ? (
              <p className="text-xs font-semibold opacity-90">
                next in {intervalHint(nextInterval)}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          aria-label={`Card: ${card.hanzi}`}
          aria-expanded={revealed}
          className="perspective-card mx-auto block min-h-80 w-full max-w-md transition-transform hover:scale-[1.02] active:scale-[0.99]"
          onClick={() => setRevealed(true)}
        >
          <span
            className="preserve-3d relative block h-80 w-full"
            style={{
              transition: "transform 480ms ease",
              transform: revealed ? "rotateY(180deg)" : undefined,
            }}
          >
            <span className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-line bg-surface p-8">
              {retried.has(card.cardId) ? (
                <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-700 dark:text-orange-300">
                  Retry
                </span>
              ) : card.fresh ? (
                <span className="rounded-full bg-line px-3 py-1 text-xs font-bold">
                  New word
                </span>
              ) : null}
              <span className="font-hanzi text-6xl font-bold">
                {card.hanzi}
              </span>
              <span className="text-xl text-fg-muted">{card.pinyin}</span>
              {!revealed ? (
                <span className="text-sm text-fg-subtle">Tap to reveal</span>
              ) : null}
            </span>
            <span
              className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-line bg-surface p-8"
              style={{ transform: "rotateY(180deg)" }}
            >
              <span className="font-hanzi text-5xl font-bold">
                {card.hanzi}
              </span>
              <span className="text-lg text-fg-muted">{card.pinyin}</span>
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                {card.translation}
              </span>
              {card.examples[0] ? (
                <span className="max-w-xs text-sm text-fg-muted">
                  <span className="font-hanzi">{card.examples[0].hanzi}</span>
                  {" — "}
                  {card.examples[0].translation}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        <SpeakButton text={card.hanzi} />
        {revealed ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <div className="flex w-full flex-wrap justify-center gap-2">
              {GRADE_BUTTONS.map((button) => (
                <button
                  key={button.label}
                  type="button"
                  className={`flex min-h-11 min-w-16 flex-1 items-center justify-center rounded-2xl px-2 py-1.5 text-sm font-bold transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${button.className}`}
                  disabled={busy}
                  onClick={() => grade(button.grade)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </FarmPanel>
  );
}
