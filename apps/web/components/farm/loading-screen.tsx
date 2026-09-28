"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

import type { FarmTheme } from "@/lib/game/content/types";
import { LOADING_STEPS, loadingStepIndex } from "@/lib/game/loading-steps";

const MIN_DISPLAY_MS = 600;
const FADE_MS = 450;

export function LoadingScreen({
  theme,
  ready,
  onDone,
}: {
  theme: FarmTheme;
  ready: boolean;
  onDone: () => void;
}) {
  const { progress, errors } = useProgress();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const complete = ready && minElapsed && errors.length === 0;

  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(timer);
  }, [complete, onDone]);

  const failed = errors.length > 0;
  const step = LOADING_STEPS[loadingStepIndex(progress)];

  return (
    <div
      aria-busy={!complete}
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6 text-center transition-opacity duration-500 ${
        complete ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        background: `linear-gradient(to bottom, ${theme.sky[0]}, ${theme.sky[1]} 46%, ${theme.ground[1]})`,
      }}
    >
      <span
        aria-hidden="true"
        className="text-6xl animate-bounce motion-reduce:animate-none"
      >
        🌱
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-white drop-shadow-sm">
          Colyglot Language Farm
        </h1>
        <p
          className="text-sm font-semibold text-white/85"
          data-testid="loading-step"
        >
          {failed ? "The farm needs a little help." : step}
        </p>
      </div>
      {failed ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800"
        >
          Try again
        </button>
      ) : (
        <div
          role="progressbar"
          aria-label="Loading the farm"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-black/25"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-lime-400 transition-[width] duration-300"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
