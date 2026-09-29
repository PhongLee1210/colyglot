"use client";

import { useCallback, useEffect, useRef } from "react";

import type { Challenge } from "@/lib/game/core/challenge";
import { cn } from "@/lib/utils/cn";

// Wandering between options before committing is the same signal as
// answering slowly, so the grid reports it once the focus has crossed a
// second option (GAME_PLAY §3.2, "đổi lựa chọn giữa chừng").
const HESITATION_FOCUS_COUNT = 2;

function choiceState(
  choice: string,
  answer: string,
  picked: string | null
): "idle" | "correct" | "wrong" | "dimmed" {
  if (picked === null) return "idle";
  if (choice === answer) return "correct";
  if (choice === picked) return "wrong";
  return "dimmed";
}

// Amber, never red: a missed crop needs another day, it is not a failure
// (GAME_PLAY §8.1, "không chói, không đỏ rực").
const STATE_CLASS = {
  idle: "border-line bg-surface hover:bg-surface-2 active:scale-[0.98]",
  correct:
    "border-green-600 bg-green-100 text-green-900 animate-[choice-correct_320ms_ease-out] dark:bg-green-900/40 dark:text-green-100",
  wrong:
    "border-orange-500 bg-orange-100 text-orange-900 animate-[choice-shake_220ms_ease-in-out] dark:bg-orange-900/40 dark:text-orange-100",
  dimmed: "border-line opacity-40",
} as const;

export function ChoiceGrid({
  challenge,
  picked,
  onPick,
  onHesitate,
}: {
  challenge: Challenge;
  picked: string | null;
  onPick: (choice: string) => void;
  onHesitate: () => void;
}) {
  const focused = useRef<Set<string>>(new Set());
  const answered = picked !== null;

  useEffect(() => {
    focused.current = new Set();
  }, [challenge]);

  const noteFocus = useCallback(
    (choice: string) => {
      if (answered) return;
      focused.current.add(choice);
      if (focused.current.size >= HESITATION_FOCUS_COUNT) {
        onHesitate();
      }
    },
    [answered, onHesitate]
  );

  // Number keys make the grid playable without aiming, which keeps the
  // response time the band thresholds measure honest for keyboard players.
  useEffect(() => {
    if (answered) return;
    const pickByNumber = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0) return;
      const choice = challenge.choices[index];
      if (!choice) return;
      event.preventDefault();
      onPick(choice);
    };
    window.addEventListener("keydown", pickByNumber);
    return () => window.removeEventListener("keydown", pickByNumber);
  }, [answered, challenge, onPick]);

  return (
    <div
      role="group"
      aria-label={challenge.question}
      data-testid="harvest-choices"
      className="grid w-full max-w-md grid-cols-2 gap-2"
    >
      {challenge.choices.map((choice, index) => {
        const state = choiceState(choice, challenge.answer, picked);
        return (
          <button
            key={choice}
            type="button"
            aria-disabled={answered}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2 font-bold transition",
              challenge.direction === "produce"
                ? "font-hanzi text-3xl"
                : "text-base",
              STATE_CLASS[state]
            )}
            onFocus={() => noteFocus(choice)}
            onClick={() => {
              if (answered) return;
              onPick(choice);
            }}
          >
            <span
              aria-hidden="true"
              className="text-xs font-semibold text-fg-subtle"
            >
              {index + 1}
            </span>
            {choice}
            {state === "correct" ? <span aria-hidden="true">✓</span> : null}
            {state === "wrong" ? <span aria-hidden="true">✗</span> : null}
          </button>
        );
      })}
    </div>
  );
}
