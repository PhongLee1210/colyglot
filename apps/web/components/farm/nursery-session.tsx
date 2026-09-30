"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { claimHarvestAction } from "@/lib/actions/farm";
import {
  finishSessionAction,
  gradeCardAction,
  startStudySessionAction,
  type GradeResult,
} from "@/lib/actions/study";
import type { ActionResult } from "@/lib/actions/types";
import { playAnswerFeedback, playPressHaptic } from "@/lib/game/audio/sfx";
import { findWord, LANG_PACKS } from "@/lib/game/content";
import {
  buildChallenge,
  CORRECT_HOLD_MS,
  FEEDBACK_DELAY_MS,
  gradeFromResponse,
  WRONG_HOLD_MS,
  type Challenge,
  type ChallengeWord,
} from "@/lib/game/core/challenge";
import { useFarmStore } from "@/lib/game/store/farm-store";
import type { FreshCardView } from "@/lib/game/types";

import { BackToFarmButton, FarmOverlay, FarmPanel } from "./farm-overlay";
import { AnswerReveal } from "./harvest/answer-reveal";
import { ChallengePrompt } from "./harvest/challenge-prompt";
import { ChoiceGrid } from "./harvest/choice-grid";
import { SpeakButton } from "./speak-button";

type Phase = "intro" | "quiz";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

// A planted card carries its own text, so a word missing from the content
// pack still gets a working question grid.
function challengeWord(
  card: FreshCardView,
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

export function NurserySession({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const [queue, setQueue] = useState<FreshCardView[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [picked, setPicked] = useState<string | null>(null);
  const [hesitated, setHesitated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [graded, setGraded] = useState(0);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  // Frozen at mount: a snapshot refresh mid-session drops graded seedlings
  // from `freshQueue`, which would shift the queue under the player.
  const [freshQueue] = useState(() => snapshot?.freshQueue ?? []);
  const askedAtRef = useRef(0);
  const card = queue === null ? freshQueue[0] : queue[0];

  const langKey = snapshot?.world.langKey ?? null;
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

  const word = card && langKey ? findWord(langKey, card.hanzi) : null;

  // Building a grid shuffles, which is non-deterministic — it happens on
  // the advance, never during a render (Rendering Standard, checklist #4).
  const startCard = useCallback(
    (next: FreshCardView[]) => {
      const head = next[0];
      setQueue(next);
      setChallenge(
        head ? buildChallenge(challengeWord(head, pool), pool, 0) : null
      );
      // A never-reviewed word is always a seedling question (GAME_PLAY
      // §3.1): characters plus pinyin, four meanings to choose from.
      setPhase("intro");
      setPicked(null);
      setHesitated(false);
    },
    [pool]
  );

  const beginQuiz = useCallback(() => {
    setPhase("quiz");
    setPicked(null);
    setHesitated(false);
    askedAtRef.current = performance.now();
  }, []);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    const result = await startStudySessionAction();
    if (!result.ok) {
      toast(result.error, "danger");
      return null;
    }
    setSessionId(result.data);
    return result.data;
  }, [sessionId, toast]);

  const finish = useCallback(
    async (gradedCount: number) => {
      if (sessionId && gradedCount > 0) {
        try {
          await finishSessionAction(sessionId, gradedCount);
          await claimHarvestAction(sessionId, snapshot!.world.langKey);
          router.refresh();
        } catch {
          toast(
            "Connection lost — your progress is saved, gold can be claimed later",
            "danger"
          );
        }
      }
      onClose();
    },
    [sessionId, snapshot, router, toast, onClose]
  );

  const advance = useCallback(
    async (target: FreshCardView, result: ActionResult<GradeResult> | null) => {
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
      const gradedCount = graded + 1;
      setGraded(gradedCount);
      const remaining = (queue ?? []).slice(1);
      const next = result.data.requeued ? [...remaining, target] : remaining;
      if (result.data.requeued) {
        setRetried((prev) => new Set(prev).add(target.cardId));
      }
      if (next.length === 0) {
        setQueue([]);
        setChallenge(null);
        void finish(gradedCount);
        return;
      }
      startCard(next);
      setBusy(false);
    },
    [queue, graded, toast, finish, startCard]
  );

  const answer = useCallback(
    async (choice: string) => {
      if (!card || !challenge || picked !== null || busy) return;
      const elapsedMs = performance.now() - askedAtRef.current;
      const correct = choice === challenge.answer;
      setPicked(choice);
      setBusy(true);
      playPressHaptic();
      window.setTimeout(() => playAnswerFeedback(correct), FEEDBACK_DELAY_MS);
      const grade = gradeFromResponse({
        correct,
        elapsedMs,
        hesitated,
        tier: challenge.tier,
      });

      const id = sessionId ?? (await ensureSession());
      if (!id) {
        setPicked(null);
        setBusy(false);
        return;
      }
      try {
        if (correct) {
          const [result] = await Promise.all([
            gradeCardAction(card.cardId, id, grade),
            delay(CORRECT_HOLD_MS),
          ]);
          advance(card, result);
          return;
        }
        // The wrong answer holds with its correction on screen — that is
        // where the learning happens (GAME_PLAY §8.1) — then commits and
        // requeues the seedling for one more pass this session.
        await delay(WRONG_HOLD_MS + 500);
        advance(card, await gradeCardAction(card.cardId, id, grade));
      } catch {
        advance(card, null);
      }
    },
    [
      card,
      challenge,
      picked,
      busy,
      hesitated,
      sessionId,
      ensureSession,
      advance,
    ]
  );

  const markHesitated = useCallback(() => setHesitated(true), []);

  if (!snapshot) return null;

  if (queue !== null && queue.length === 0) {
    return (
      <FarmOverlay>
        <div className="text-4xl">🌱</div>
        <h1 className="text-xl font-extrabold">Nursery complete</h1>
        <p className="text-sm text-fg-muted">
          {graded === 0
            ? "No new seedlings — plant more seeds first."
            : `${graded} new ${graded === 1 ? "word" : "words"} planted in memory.`}
        </p>
        <BackToFarmButton onClick={() => void finish(graded)} />
      </FarmOverlay>
    );
  }

  if (!card) {
    return (
      <FarmOverlay>
        <div className="text-4xl">🌱</div>
        <h1 className="text-xl font-extrabold">Nursery</h1>
        <p className="text-sm text-fg-muted">
          No new seedlings — plant more seeds first.
        </p>
        <BackToFarmButton onClick={() => void finish(0)} />
      </FarmOverlay>
    );
  }

  const answered = picked !== null && challenge !== null;
  const correct = challenge !== null && picked === challenge.answer;
  const remaining = queue ?? freshQueue;

  return (
    <FarmPanel>
      <header className="flex items-center justify-between border-b border-line p-4">
        <h1 className="text-lg font-extrabold">🌱 Nursery</h1>
        <span className="text-sm text-fg-muted">
          {remaining.length} seedling{remaining.length === 1 ? "" : "s"} left
        </span>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-1 text-sm transition hover:bg-surface-2"
          onClick={() => void finish(graded)}
        >
          Stop
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
        {/* key replays the drop for every new seedling */}
        <div
          key={card.cardId}
          className="flex flex-col items-center gap-2 animate-[seed-drop_420ms_ease-out] motion-reduce:animate-none"
        >
          <div className="text-2xl" aria-hidden="true">
            🌱
          </div>
          <div className="font-hanzi text-6xl font-bold">{card.hanzi}</div>
          <div className="text-xl text-fg-muted">{card.pinyin}</div>
          <div className="text-2xl font-bold">{card.translation}</div>
          <span onClickCapture={markHesitated}>
            <SpeakButton text={card.hanzi} />
          </span>
          {word?.examples[0] ? (
            <p className="mt-2 max-w-sm rounded-2xl border border-line bg-surface-2 p-3 text-sm">
              <span className="font-hanzi">{word.examples[0].hanzi}</span>
              <br />
              <span className="text-fg-muted">{word.examples[0].pinyin}</span>
              <br />
              <span className="font-semibold">
                {word.examples[0].translation}
              </span>
            </p>
          ) : null}
        </div>

        {phase === "intro" ? (
          <button
            type="button"
            className="min-h-11 rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
            onClick={beginQuiz}
          >
            Check my memory
          </button>
        ) : challenge ? (
          <>
            <ChallengePrompt
              challenge={challenge}
              retry={retried.has(card.cardId)}
            />
            {answered ? (
              <AnswerReveal
                hanzi={card.hanzi}
                pinyin={card.pinyin}
                translation={card.translation}
                example={word?.examples[0]}
                correct={correct}
                canUndo={false}
                canContinue={false}
                onUndo={() => {}}
                onContinue={() => {}}
              />
            ) : null}
            <ChoiceGrid
              challenge={challenge}
              picked={picked}
              onPick={answer}
              onHesitate={markHesitated}
            />
          </>
        ) : null}

        {phase === "intro" ? (
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-5 py-2 font-bold transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => startCard((queue ?? freshQueue).slice(1))}
          >
            Skip
          </button>
        ) : null}
      </div>
    </FarmPanel>
  );
}
