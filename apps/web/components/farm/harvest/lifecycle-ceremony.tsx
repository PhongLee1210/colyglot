"use client";

import { useEffect, useState } from "react";

import type { FarmReviewEvent } from "@/lib/game/types";

// The first three graduations cannot be skipped (GAME_PLAY §8.2) — the
// ceremony is the game's emotional payoff, so it earns its screen time.
const SEEN_KEY = "colyglot-graduations-seen";
const MANDATORY_COUNT = 3;
const CEREMONY_HOLD_MS = 2500;

// A lifecycle beat that interrupts the sweep (GAME_PLAY §8.2 / §8.3):
// everything else dims, the word gets its nameplate, then the queue
// resumes. Sad when a tree falls, celebratory when one graduates —
// never humiliating either way.
export function LifecycleCeremony({
  event,
  onDone,
}: {
  event: FarmReviewEvent;
  onDone: () => void;
}) {
  // Skippability is decided once, from the persisted ceremony count — a
  // state initializer (not an effect) keeps the first paint correct.
  const [canSkipNow] = useState(() => {
    if (event.type === "demotion") return true;
    let seen = 0;
    try {
      seen = Number(window.localStorage.getItem(SEEN_KEY) ?? "0");
    } catch {
      seen = MANDATORY_COUNT;
    }
    return seen >= MANDATORY_COUNT;
  });
  const [held, setHeld] = useState(canSkipNow);

  useEffect(() => {
    if (event.type === "graduation") {
      try {
        const seen = Number(window.localStorage.getItem(SEEN_KEY) ?? "0");
        window.localStorage.setItem(SEEN_KEY, String(seen + 1));
      } catch {
        // A private-mode storage failure just means the player can skip.
      }
    }
    if (canSkipNow) return;
    const timer = window.setTimeout(() => setHeld(true), CEREMONY_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [event, canSkipNow]);

  const canContinue = canSkipNow || held;

  const graduation = event.type === "graduation";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={graduation ? "Graduation" : "Demotion"}
      data-testid="lifecycle-ceremony"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/45 p-6 text-center text-white"
    >
      <div className="flex flex-col items-center gap-3 animate-[pop-in_360ms_ease-out] motion-reduce:animate-none">
        <div className="text-5xl" aria-hidden="true">
          {graduation ? "🌳✨" : "🍃"}
        </div>
        <h1 className="text-xl font-extrabold">
          {graduation ? "Graduated to the Forest" : "Back to the soil"}
        </h1>
        <p className="font-hanzi text-4xl font-bold">{event.hanzi}</p>
        <p className="text-sm opacity-90">
          {event.pinyin} · {event.translation}
        </p>
        {graduation ? (
          <p className="text-sm font-semibold">
            Remembered for {event.intervalDays} days — Forest +1 🌲
          </p>
        ) : (
          <p className="max-w-sm text-sm opacity-90">
            The tree came back down. Starting over — this time it will be
            faster.
            {event.greenhouse
              ? " The farm was full, so it waits in the greenhouse."
              : ""}
          </p>
        )}
        <button
          type="button"
          className="mt-1 min-h-11 rounded-full bg-white/90 px-6 py-2 font-bold text-black transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canContinue}
          onClick={onDone}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
