"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ReviewGrade } from "@colyglot/srs";

import { useToast } from "@/components/ui/toast";
import { claimHarvestAction, openHarvestAction } from "@/lib/actions/farm";
import {
  finishSessionAction,
  gradeCardAction,
  type GradeResult,
} from "@/lib/actions/study";
import type { ActionResult } from "@/lib/actions/types";
import { playAnswerFeedback, playPressHaptic } from "@/lib/game/audio/sfx";
import { LANG_PACKS } from "@/lib/game/content";
import {
  buildChallenge,
  CORRECT_HOLD_MS,
  FEEDBACK_DELAY_MS,
  gradeFromResponse,
  UNDO_WINDOW_MS,
  WRONG_HOLD_MS,
  type Challenge,
  type ChallengeWord,
} from "@/lib/game/core/challenge";
import { cropStage } from "@/lib/game/core/crops";
import { type HarvestPreview } from "@/lib/game/core/economy";
import { useFarmStore } from "@/lib/game/store/farm-store";
import { useFxStore, type HarvestFxInput } from "@/lib/game/store/fx-store";
import { applyClaim } from "@/lib/game/store/reducers";
import type { FarmReviewEvent, HarvestCard } from "@/lib/game/types";

import { HarvestCelebration } from "./celebration";
import { BackToFarmButton, FarmOverlay, FarmPanel } from "./farm-overlay";
import { AnswerReveal } from "./harvest/answer-reveal";
import { ChallengePrompt } from "./harvest/challenge-prompt";
import { ChoiceGrid } from "./harvest/choice-grid";
import { LifecycleCeremony } from "./harvest/lifecycle-ceremony";
import { SpeakButton } from "./speak-button";

// Matches the `harvest-pop` keyframe, so the reward clears exactly as it
// finishes rising rather than lingering over the next question.
const GOLD_POP_MS = 850;

// The player resolves a wrong answer themselves, or the window does it for
// them; either way the correct answer has already had its 1500ms on screen.
type WrongAnswerResolution = { undo: () => void; advance: () => void };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

// A planted card carries its own text, so a word missing from the content
// pack still asks a question instead of blanking the session.
function challengeWord(
  card: HarvestCard,
  pool: readonly ChallengeWord[]
): ChallengeWord {
  return (
    pool.find((item) => item.hanzi === card.hanzi) ?? {
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      translation: card.translation,
      packKey: "",
    }
  );
}

function intervalHint(intervalDays: number): string {
  return intervalDays < 1
    ? "<1d"
    : intervalDays === 1
      ? "1d"
      : `${intervalDays}d`;
}

export function HarvestSession({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [queue, setQueue] = useState<HarvestCard[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<HarvestPreview | null>(null);
  const [nextInterval, setNextInterval] = useState<number | null>(null);
  const [learningStep, setLearningStep] = useState(false);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hesitated, setHesitated] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [undoSpent, setUndoSpent] = useState(false);
  // Card ids that cleared a grade step — the claim only pays for these,
  // so they are also exactly the crops the farm-side FX should play for.
  // A ref, because the finish path runs from a timeout whose closure
  // would otherwise hold a stale Set missing the final graded card.
  const reviewedIdsRef = useRef<Set<string>>(new Set());
  const askedAtRef = useRef(0);
  const resolutionRef = useRef<WrongAnswerResolution | null>(null);
  const [pendingFx, setPendingFx] = useState<{
    entries: HarvestFxInput[];
    goldAwarded: number;
  } | null>(null);
  const [claim, setClaim] = useState<{
    goldAwarded: number;
    cardsHarvested: number;
    streak: number;
    streakBonus: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A graduation/demotion pauses the sweep until the player acknowledges
  // it; the graded card's follow-up queue waits in the ref.
  const [ceremony, setCeremony] = useState<FarmReviewEvent | null>(null);
  const ceremonyNextRef = useRef<HarvestCard[] | null>(null);

  const langKey = snapshot?.world.langKey ?? null;
  const card = queue?.[0] ?? null;

  const pool = useMemo<ChallengeWord[]>(() => {
    const pack = langKey ? LANG_PACKS[langKey] : undefined;
    return (pack?.packs ?? []).flatMap((seedPack) =>
      seedPack.words.map((word) => ({
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        translation: word.translation,
        packKey: seedPack.key,
      }))
    );
  }, [langKey]);

  // Shuffling a fresh grid is non-deterministic, so it happens here on the
  // advance rather than during a render (Rendering Standard, checklist #4).
  const startCard = useCallback(
    (next: HarvestCard[]) => {
      const head = next[0];
      setQueue(next);
      setChallenge(
        head
          ? buildChallenge(challengeWord(head, pool), pool, head.intervalDays)
          : null
      );
      setPicked(null);
      setHesitated(false);
      setCanContinue(false);
      askedAtRef.current = performance.now();
    },
    [pool]
  );

  useEffect(() => {
    if (!preview && !learningStep) return;
    const timer = window.setTimeout(() => {
      setPreview(null);
      setLearningStep(false);
      setNextInterval(null);
    }, GOLD_POP_MS);
    return () => window.clearTimeout(timer);
  }, [preview, learningStep]);

  const finish = useCallback(
    async (reviewedCount: number) => {
      if (sessionId && reviewedCount > 0 && snapshot) {
        try {
          await finishSessionAction(sessionId, reviewedCount);
          const result = await claimHarvestAction(
            sessionId,
            snapshot.world.langKey
          );
          if (result.ok) {
            hydrate(applyClaim(useFarmStore.getState().snapshot!, result.data));
            const entries: HarvestFxInput[] = [];
            useFarmStore.getState().snapshot!.beds.forEach((bed) => {
              bed.plots.forEach((plot) => {
                if (
                  plot.cardId &&
                  plot.hanzi &&
                  reviewedIdsRef.current.has(plot.cardId)
                ) {
                  entries.push({
                    key: `${bed.id}:${plot.slotIndex}`,
                    bedId: bed.id,
                    slotIndex: plot.slotIndex,
                    hanzi: plot.hanzi,
                    stage: cropStage(plot.schedule, new Date()),
                  });
                }
              });
            });
            setPendingFx({ entries, goldAwarded: result.data.goldAwarded });
            setClaim({
              goldAwarded: result.data.goldAwarded,
              cardsHarvested: result.data.cardsHarvested,
              streak: result.data.streak,
              streakBonus: result.data.streakBonus,
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
    },
    [sessionId, snapshot, hydrate, toast, onClose]
  );

  const applyResult = useCallback(
    (target: HarvestCard, result: ActionResult<GradeResult> | null) => {
      if (!result) {
        toast("Connection lost — check your network and try again", "danger");
        setPicked(null);
        setBusy(false);
        askedAtRef.current = performance.now();
        return;
      }
      if (!result.ok) {
        toast(result.error, "danger");
        setPicked(null);
        setBusy(false);
        askedAtRef.current = performance.now();
        return;
      }
      const reviewedCount = reviewed + 1;
      setReviewed(reviewedCount);
      setNextInterval(result.data.intervalDays);
      reviewedIdsRef.current.add(target.cardId);
      // The claim pays once per card per session, so a retry shows the next
      // step instead of gold — forgetting must never out-earn remembering.
      if (retried.has(target.cardId)) {
        setLearningStep(true);
      } else {
        setPreview(result.data.goldPreview);
      }
      if (result.data.requeued) {
        setRetried((prev) => new Set(prev).add(target.cardId));
      }
      const remaining = (queue ?? []).slice(1);
      const next = result.data.requeued ? [...remaining, target] : remaining;
      setBusy(false);
      if (result.data.farmEvent) {
        // The sweep stops for the word's big moment (GAME_PLAY §8.2):
        // the queue resumes when the ceremony closes.
        ceremonyNextRef.current = next;
        setCeremony(result.data.farmEvent);
        if (result.data.farmEvent.type === "graduation") {
          useFxStore.getState().react("cheer");
        }
        return;
      }
      startCard(next);
      if (next.length === 0) {
        void finish(reviewedCount);
      }
    },
    [queue, retried, reviewed, toast, finish, startCard]
  );

  const sendGrade = useCallback(
    async (target: HarvestCard, grade: ReviewGrade) => {
      if (!sessionId) return null;
      try {
        return await gradeCardAction(target.cardId, sessionId, grade);
      } catch {
        return null;
      }
    },
    [sessionId]
  );

  const waitForWrongAnswer = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const settle = (undone: boolean) => {
        window.clearTimeout(timer);
        resolutionRef.current = null;
        resolve(undone);
      };
      const timer = window.setTimeout(() => settle(false), UNDO_WINDOW_MS);
      resolutionRef.current = {
        undo: () => settle(true),
        advance: () => settle(false),
      };
    });
  }, []);

  const answer = useCallback(
    async (choice: string) => {
      if (!card || !challenge || picked !== null || busy) return;
      const elapsedMs = performance.now() - askedAtRef.current;
      const correct = choice === challenge.answer;
      setPicked(choice);
      setBusy(true);
      // 0–80ms: the press sinks with a haptic nudge; the graded feedback
      // beat (color burst + tone) lands at 120ms (GAME_PLAY §8.1).
      playPressHaptic();
      window.setTimeout(() => playAnswerFeedback(correct), FEEDBACK_DELAY_MS);
      const grade = gradeFromResponse({
        correct,
        elapsedMs,
        hesitated,
        tier: challenge.tier,
      });

      if (correct) {
        const [result] = await Promise.all([
          sendGrade(card, grade),
          delay(CORRECT_HOLD_MS),
        ]);
        applyResult(card, result);
        return;
      }

      const continueTimer = window.setTimeout(
        () => setCanContinue(true),
        WRONG_HOLD_MS
      );
      // Holding the write until the undo window closes is what makes undo
      // possible at all: SM-2 mutates the ease factor, so a committed grade
      // cannot be reversed afterwards.
      const undone = await waitForWrongAnswer();
      window.clearTimeout(continueTimer);
      if (undone) {
        setUndoSpent(true);
        setPicked(null);
        setCanContinue(false);
        setBusy(false);
        askedAtRef.current = performance.now();
        return;
      }
      applyResult(card, await sendGrade(card, grade));
    },
    [
      card,
      challenge,
      picked,
      busy,
      hesitated,
      sendGrade,
      applyResult,
      waitForWrongAnswer,
    ]
  );

  const markHesitated = useCallback(() => setHesitated(true), []);

  const closeCeremony = useCallback(() => {
    const next = ceremonyNextRef.current;
    ceremonyNextRef.current = null;
    setCeremony(null);
    if (next) {
      startCard(next);
      if (next.length === 0) {
        void finish(reviewed);
      }
    }
  }, [startCard, finish, reviewed]);

  if (!snapshot) return null;

  if (claim) {
    return (
      <HarvestCelebration
        claim={claim}
        reviewed={reviewed}
        onDone={() => {
          // The opaque grading panel is gone with the celebration, so
          // this is the first moment the farm can actually show the
          // harvest FX; plot entries were captured pre-claim because
          // the refresh clears the crops right after.
          if (pendingFx) {
            useFxStore
              .getState()
              .celebrateHarvest(pendingFx.entries, pendingFx.goldAwarded);
          }
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
            ? `${snapshot.dueCount} ${snapshot.dueCount === 1 ? "crop is" : "crops are"} ready. Answer each one to harvest it.`
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
                  setTotal(result.data.queue.length);
                  startCard(result.data.queue);
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

  // A lapsed card comes back for a learning step; it only counts as
  // harvested once it finally sticks.
  const completed = reviewed - retried.size;
  const pendingRetries = queue.filter((item) =>
    retried.has(item.cardId)
  ).length;
  const answered = picked !== null && challenge !== null;
  const correct = challenge !== null && picked === challenge.answer;

  return (
    <FarmPanel>
      {ceremony ? (
        <LifecycleCeremony event={ceremony} onDone={closeCeremony} />
      ) : null}
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
      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
        {preview ? (
          <div
            aria-live="polite"
            className="pointer-events-none fixed left-1/2 top-1/4 z-10 -translate-x-1/2 rounded-2xl bg-green-600 px-4 py-2 text-center font-bold text-white animate-[harvest-pop_850ms_ease-out]"
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
            className="pointer-events-none fixed left-1/2 top-1/4 z-10 -translate-x-1/2 rounded-2xl bg-orange-500 px-4 py-2 text-center font-bold text-white animate-[harvest-pop_850ms_ease-out]"
          >
            <p className="text-lg">Learning step</p>
            {nextInterval !== null ? (
              <p className="text-xs font-semibold opacity-90">
                next in {intervalHint(nextInterval)}
              </p>
            ) : null}
          </div>
        ) : null}

        {challenge && card ? (
          <>
            <ChallengePrompt
              challenge={challenge}
              retry={retried.has(card.cardId)}
            />
            {/* Needing to hear the word before answering is hesitation,
                and it costs the same as answering slowly. */}
            <span onClickCapture={markHesitated}>
              <SpeakButton text={card.hanzi} />
            </span>
            {answered ? (
              <AnswerReveal
                hanzi={card.hanzi}
                pinyin={card.pinyin}
                translation={card.translation}
                example={card.examples[0]}
                correct={correct}
                canUndo={!undoSpent}
                canContinue={canContinue}
                onUndo={() => resolutionRef.current?.undo()}
                onContinue={() => resolutionRef.current?.advance()}
              />
            ) : (
              <p className="max-w-sm text-sm text-fg-muted animate-[think-breathe_3s_ease-in-out_infinite] motion-reduce:animate-none">
                {challenge.hint}
              </p>
            )}
            <ChoiceGrid
              challenge={challenge}
              picked={picked}
              onPick={answer}
              onHesitate={markHesitated}
            />
          </>
        ) : (
          <div
            aria-hidden="true"
            className="h-80 w-full max-w-md rounded-3xl border border-line bg-surface-2"
          />
        )}
      </div>
    </FarmPanel>
  );
}
