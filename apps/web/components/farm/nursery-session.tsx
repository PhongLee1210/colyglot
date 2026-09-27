"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { claimHarvestAction } from "@/lib/actions/farm";
import {
  finishSessionAction,
  gradeCardAction,
  startStudySessionAction,
} from "@/lib/actions/study";
import { ReviewGrade } from "@/lib/db/schema";
import { LANG_PACKS, findWord } from "@/lib/game/content";
import { useFarmStore } from "@/lib/game/store/farm-store";

import { BackToFarmButton, FarmOverlay, FarmPanel } from "./farm-overlay";
import { SpeakButton } from "./speak-button";

// Self-grading only works after an actual recall attempt: the intro shows
// the word, the recall step hides the meaning and asks for it, and only
// then do the three honest grades appear (SM-2 anchors 1 / 3 / 4).
const NURSERY_GRADES: {
  grade: ReviewGrade;
  label: string;
  className: string;
}[] = [
  {
    grade: ReviewGrade.FORGOT,
    label: "Again",
    className: "bg-red-600 text-white",
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
];

type Phase = "intro" | "recall" | "grade";

// Fisher–Yates: `sort(() => Math.random() - 0.5)` skews positions, which
// lets learners guess the answer slot instead of recalling the meaning.
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildChoices(translation: string, pool: string[]): string[] {
  const distractors = shuffle(
    [...new Set(pool)].filter((candidate) => candidate !== translation)
  ).slice(0, 2);
  return shuffle([translation, ...distractors]);
}

export function NurserySession({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [graded, setGraded] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("intro");
  const [choices, setChoices] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  // Frozen at mount: a snapshot refresh mid-session drops graded seedlings
  // from `freshQueue`, which would shift the index past unseen cards.
  const [queue] = useState(() => snapshot?.freshQueue ?? []);
  const card = queue[index];
  const done = index >= queue.length;
  const word = card ? findWord(snapshot!.world.langKey, card.hanzi) : null;
  const translationPool = card
    ? (LANG_PACKS[snapshot!.world.langKey]?.packs ?? []).flatMap((pack) =>
        pack.words.map((item) => item.translation)
      )
    : [];

  if (!snapshot) return null;

  async function ensureSession(): Promise<string> {
    if (!sessionId) {
      const result = await startStudySessionAction();
      if (!result.ok) throw new Error(result.error);
      setSessionId(result.data);
      return result.data;
    }
    return sessionId;
  }

  function nextCard() {
    setIndex((i) => i + 1);
    setPhase("intro");
    setChoices([]);
    setPicked(null);
  }

  function skip() {
    if (!card) return;
    setSkipped((prev) => new Set(prev).add(card.cardId));
    nextCard();
  }

  async function plantGrade(selected: ReviewGrade) {
    if (!card || busy) return;
    setBusy(true);
    try {
      const id = await ensureSession();
      const result = await gradeCardAction(card.cardId, id, selected);
      if (result.ok) {
        setGraded((count) => count + 1);
        nextCard();
      } else {
        toast(result.error, "danger");
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not save grade",
        "danger"
      );
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (sessionId && graded > 0) {
      try {
        await finishSessionAction(sessionId, graded);
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
  }

  if (done) {
    return (
      <FarmOverlay>
        <div className="text-4xl">🌱</div>
        <h1 className="text-xl font-extrabold">Nursery complete</h1>
        <p className="text-sm text-fg-muted">
          {graded === 0
            ? "No new seedlings — plant more seeds first."
            : `${graded} new ${graded === 1 ? "word" : "words"} planted in memory.`}
        </p>
        <BackToFarmButton onClick={finish} />
      </FarmOverlay>
    );
  }

  return (
    <FarmPanel>
      <header className="flex items-center justify-between border-b border-line p-4">
        <h1 className="text-lg font-extrabold">🌱 Nursery</h1>
        <span className="text-sm text-fg-muted">
          {index + 1} / {queue.length}
        </span>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-1 text-sm transition hover:bg-surface-2"
          onClick={finish}
        >
          Stop
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div
          className="flex gap-1.5"
          aria-label={`Word ${index + 1} of ${queue.length}`}
        >
          {queue.map((item, i) => (
            <span
              key={item.cardId}
              aria-hidden="true"
              className={`h-1.5 w-4 rounded-full transition-colors ${
                i < index
                  ? skipped.has(item.cardId)
                    ? "bg-line"
                    : "bg-green-500"
                  : "bg-line"
              }`}
            />
          ))}
        </div>
        {/* key replays the drop for every new seedling */}
        <div
          key={card.cardId}
          className="flex flex-col items-center gap-2 animate-[seed-drop_420ms_ease-out]"
        >
          <div className="text-2xl" aria-hidden="true">
            🌱
          </div>
          <div className="font-hanzi text-6xl font-bold">{card.hanzi}</div>
          <div className="text-xl text-fg-muted">{card.pinyin}</div>
          {phase !== "intro" ? (
            <div className="min-h-14" aria-live="polite">
              {picked !== null ? (
                <div className="text-2xl font-bold">{card.translation}</div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{card.translation}</div>
              <SpeakButton text={card.hanzi} />
              {word?.examples[0] ? (
                <p className="mt-2 max-w-sm rounded-2xl border border-line bg-surface-2 p-3 text-sm">
                  <span className="font-hanzi">{word.examples[0].hanzi}</span>
                  <br />
                  <span className="text-fg-muted">
                    {word.examples[0].pinyin}
                  </span>
                  <br />
                  <span className="font-semibold">
                    {word.examples[0].translation}
                  </span>
                </p>
              ) : null}
            </>
          )}
          {phase !== "intro" ? <SpeakButton text={card.hanzi} /> : null}
        </div>

        {phase === "intro" ? (
          <button
            type="button"
            className="min-h-11 rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
            onClick={() => {
              setChoices(buildChoices(card.translation, translationPool));
              setPhase("recall");
            }}
          >
            Check my memory
          </button>
        ) : null}

        {phase === "recall" ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <p className="text-sm font-semibold text-fg-muted">
              What does <span className="font-hanzi">{card.hanzi}</span> mean?
            </p>
            <div className="flex w-full flex-col gap-2">
              {choices.map((choice) => {
                const isPicked = picked === choice;
                const isCorrect = choice === card.translation;
                return (
                  <button
                    key={choice}
                    type="button"
                    className={`min-h-11 rounded-2xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${
                      picked === null
                        ? "border-line hover:bg-surface-2"
                        : isCorrect
                          ? "border-green-600 bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100"
                          : isPicked
                            ? "border-red-500 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
                            : "border-line opacity-50"
                    }`}
                    disabled={picked !== null || busy}
                    onClick={() => setPicked(choice)}
                  >
                    {choice}
                    {picked !== null && isCorrect ? " ✓" : ""}
                    {picked !== null && isPicked && !isCorrect ? " ✗" : ""}
                  </button>
                );
              })}
            </div>
            {picked === null ? (
              <button
                type="button"
                className="text-sm font-semibold text-fg-muted underline underline-offset-4 transition hover:text-fg"
                onClick={() => setPicked(card.translation)}
              >
                Just show me
              </button>
            ) : (
              <button
                type="button"
                className="min-h-11 rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500"
                onClick={() => setPhase("grade")}
              >
                Continue
              </button>
            )}
          </div>
        ) : null}

        {phase === "grade" ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <p className="text-sm font-semibold text-fg-muted">
              How well did you know it?
            </p>
            <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
              {NURSERY_GRADES.map((button) => (
                <button
                  key={button.label}
                  type="button"
                  className={`min-h-11 rounded-full px-6 py-2 text-sm font-bold transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${button.className}`}
                  disabled={busy}
                  onClick={() => plantGrade(button.grade)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase !== "grade" ? (
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-5 py-2 font-bold transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={skip}
          >
            Skip
          </button>
        ) : null}
      </div>
    </FarmPanel>
  );
}
