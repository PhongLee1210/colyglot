"use client";

import { STARTING_GOLD } from "@/lib/game/core/economy";
import type { FarmWorldCard } from "@/lib/game/types";

export type TitleOverlayProps = {
  worlds: FarmWorldCard[];
  futureLangs: { langKey: string; name: string }[];
  streak: number;
  activeLangKey: string | null;
  busyLangKey: string | null;
  canBegin: boolean;
  onBegin: () => void;
  onSelectWorld: (world: FarmWorldCard) => void;
};

const primaryButton =
  "rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500";

export function TitleOverlay({
  worlds,
  futureLangs,
  streak,
  activeLangKey,
  busyLangKey,
  canBegin,
  onBegin,
  onSelectWorld,
}: TitleOverlayProps) {
  return (
    <section
      aria-label="Welcome to Colyglot"
      data-testid="title-overlay"
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center"
    >
      <div className="glass flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-6">
        <header className="flex flex-col items-center gap-1 text-center">
          <span aria-hidden="true" className="text-5xl">
            🌱
          </span>
          <h1 className="text-2xl font-extrabold">Colyglot Language Farm</h1>
          <p className="text-sm text-fg-muted">
            Plant words, harvest memories.
          </p>
          {streak > 0 ? (
            <p className="text-sm font-bold">🔥 {streak} day streak</p>
          ) : null}
        </header>

        <div className="flex flex-col gap-2" aria-label="Choose your language">
          {worlds.map((world) => {
            const active = world.langKey === activeLangKey;
            const busy = busyLangKey === world.langKey;
            return (
              <div
                key={world.langKey}
                className={`flex items-center justify-between gap-3 rounded-2xl bg-white/40 p-3 dark:bg-black/25 ${
                  active ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="text-base font-bold">
                    {world.flag} {world.name}
                  </div>
                  <div className="truncate text-xs text-fg-muted">
                    {world.started
                      ? `${world.tierName} · 💰 ${world.gold} · ${world.dueCount} ready to harvest`
                      : `A fresh garden awaits — start with ${STARTING_GOLD} 💰`}
                  </div>
                </div>
                {active ? (
                  <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-extrabold text-primary">
                    Here now
                  </span>
                ) : (
                  <button
                    type="button"
                    data-testid={`title-world-${world.langKey}`}
                    className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
                    disabled={busyLangKey !== null}
                    onClick={() => onSelectWorld(world)}
                  >
                    {busy ? "…" : world.started ? "Play" : "Start"}
                  </button>
                )}
              </div>
            );
          })}
          {futureLangs.map((lang) => (
            <div
              key={lang.langKey}
              className="flex items-center justify-between rounded-2xl border border-dashed border-line p-3 opacity-60"
            >
              <span className="text-sm font-bold">{lang.name}</span>
              <span className="text-xs text-fg-muted">Coming soon</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          data-testid="title-begin"
          className={primaryButton}
          disabled={!canBegin || busyLangKey !== null}
          onClick={onBegin}
        >
          {canBegin ? "Begin →" : "Pick a farm above to begin"}
        </button>
      </div>
    </section>
  );
}
