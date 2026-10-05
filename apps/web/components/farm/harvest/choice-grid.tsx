"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FEEDBACK_DELAY_MS,
  INPUT_BUFFER_MS,
  type Challenge,
} from "@/lib/game/core/challenge";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils/cn";

// Wandering between options before committing is the same signal as
// answering slowly, so the grid reports it once the focus has crossed a
// second option (GAME_PLAY §3.2, "đổi lựa chọn giữa chừng").
const HESITATION_FOCUS_COUNT = 2;

function choiceState(
  choice: string,
  answer: string,
  picked: string | null,
  revealed: boolean
): "idle" | "pressed" | "correct" | "wrong" | "dimmed" {
  if (picked === null) return "idle";
  if (!revealed) return choice === picked ? "pressed" : "dimmed";
  if (choice === answer) return "correct";
  if (choice === picked) return "wrong";
  return "dimmed";
}

// Amber, never red: a missed crop needs another day, it is not a failure
// (GAME_PLAY §8.1, "không chói, không đỏ rực"). The pressed state is the
// 0–80ms channel — the button sinks before the 120ms reveal beat. The
// shake duration is spelled out because Tailwind scans class strings
// literally (SHAKE_MS keeps the code side testable).
const STATE_CLASS = {
  idle: "border-line bg-surface hover:bg-surface-2 active:scale-[0.98]",
  pressed: "border-line bg-surface-2 scale-[0.97]",
  correct:
    "border-green-600 bg-green-100 text-green-900 animate-[choice-correct_320ms_ease-out] dark:bg-green-900/40 dark:text-green-100",
  wrong:
    "border-orange-500 bg-orange-100 text-orange-900 animate-[choice-shake_120ms_ease-in-out] dark:bg-orange-900/40 dark:text-orange-100",
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
  const t = useT();
  const focused = useRef<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  // An early tap in the dying milliseconds of the previous hold, waiting
  // to be replayed onto the choice now sitting under the same finger
  // (GAME_PLAY §8.4 rule 3).
  const bufferedTapRef = useRef<{ x: number; y: number; at: number } | null>(
    null
  );
  const answered = picked !== null;
  // The color burst, chime and shake land together at 120ms, not at 0 —
  // the graded beat the moment loop is tuned around. Keyed by challenge
  // object so the next card starts unrevealed without an effect reset.
  const [revealedFor, setRevealedFor] = useState<Challenge | null>(null);
  const revealed = revealedFor === challenge;

  useEffect(() => {
    focused.current = new Set();
  }, [challenge]);

  useEffect(() => {
    if (!answered) return;
    const timer = window.setTimeout(
      () => setRevealedFor(challenge),
      FEEDBACK_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [answered, challenge]);

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

  // Replays a buffered early tap: if the finger landed within the buffer
  // window of this grid appearing, the choice under the same spot is
  // picked as though the tap had landed on it.
  useEffect(() => {
    if (answered) return;
    const buffered = bufferedTapRef.current;
    bufferedTapRef.current = null;
    if (!buffered) return;
    if (performance.now() - buffered.at > INPUT_BUFFER_MS) return;
    const grid = gridRef.current;
    if (!grid) return;
    const hit = [...grid.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => {
        const rect = button.getBoundingClientRect();
        return (
          buffered.x >= rect.left &&
          buffered.x <= rect.right &&
          buffered.y >= rect.top &&
          buffered.y <= rect.bottom
        );
      }
    );
    if (!hit) return;
    const index = Number(hit.dataset.index);
    const choice = challenge.choices[index];
    if (choice) onPick(choice);
  }, [challenge, answered, onPick]);

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
      ref={gridRef}
      role="group"
      aria-label={t.challenge.question[challenge.direction]}
      data-testid="harvest-choices"
      className="grid w-full max-w-md grid-cols-2 gap-2"
      onPointerDown={(event) => {
        // Input never locks (GAME_PLAY §8.4 rule 2): a tap while the
        // feedback hold runs is buffered, not dropped.
        if (answered) {
          bufferedTapRef.current = {
            x: event.clientX,
            y: event.clientY,
            at: performance.now(),
          };
        }
      }}
    >
      {challenge.choices.map((choice, index) => {
        const state = choiceState(choice, challenge.answer, picked, revealed);
        return (
          <button
            key={choice}
            type="button"
            data-index={index}
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
