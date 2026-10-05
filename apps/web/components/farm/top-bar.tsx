"use client";

import { useRef } from "react";

import type { FarmWorldCard } from "@/lib/game/types";
import { useT } from "@/lib/i18n/use-t";
import { XP_PER_LEVEL, xpIntoLevel } from "@/lib/xp";

import { GameSettings } from "./game-settings";
import { useHudTopVar } from "./hud/use-hud-top";

const statChipClass =
  "flex min-h-9 items-center gap-1 rounded-full bg-black/25 px-2.5 text-sm font-bold text-white";

export function TopBar({
  flag,
  langName,
  tierKey,
  gold,
  level,
  xp,
  streak,
  worlds,
  activeLangKey,
  busyLangKey,
  onSelectWorld,
  onOpenWorlds,
}: {
  flag: string;
  langName: string;
  tierKey: string;
  gold: number;
  level: number;
  xp: number;
  streak: number;
  worlds: FarmWorldCard[];
  activeLangKey: string | null;
  busyLangKey: string | null;
  onSelectWorld: (world: FarmWorldCard) => void;
  onOpenWorlds: () => void;
}) {
  const t = useT();
  const intoLevel = xpIntoLevel(xp);
  const barRef = useRef<HTMLElement>(null);
  useHudTopVar(barRef);

  return (
    // One bar on phones; from sm up the bar itself disappears and its two
    // groups float as separate capsules so more of the farm shows through.
    <header
      ref={barRef}
      className="glass-dark fixed inset-x-3 top-3 z-30 flex items-center gap-2 rounded-2xl px-2 py-1.5 sm:border-transparent sm:bg-transparent sm:p-0 sm:shadow-none sm:[backdrop-filter:none]"
    >
      <button
        type="button"
        aria-label={t.topBar.switchLanguage}
        title={t.topBar.switchLanguage}
        onClick={onOpenWorlds}
        className="flex flex-col rounded-xl px-2 py-0.5 text-left text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 sm:glass-dark sm:rounded-2xl sm:px-4 sm:py-1.5"
      >
        <span className="font-display text-sm font-extrabold leading-tight">
          {flag} {langName}
        </span>
        <span className="mt-0.5 w-fit rounded-full bg-black/25 px-1.5 text-xs font-bold text-white/85">
          {t.farmTiers[tierKey].name}
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2 sm:glass-dark sm:rounded-2xl sm:px-2.5 sm:py-1.5">
        {/* key={gold} remounts the chip so the bump replays per payout */}
        <span
          key={gold}
          data-testid="farm-gold"
          className={`${statChipClass} animate-[gold-bump_600ms_ease-out]`}
          title={t.topBar.gold}
        >
          💰 {gold}
        </span>
        <span className={statChipClass} title={t.topBar.dayStreak}>
          🔥 {streak}
        </span>
        <span className="flex min-h-9 flex-col items-center justify-center rounded-full bg-black/25 px-2.5 text-xs font-bold leading-tight text-white">
          <span>{t.topBar.level(level)}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/35">
            <span
              className="block h-full rounded-full bg-green-500"
              style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </span>
        </span>
        <GameSettings
          worlds={worlds}
          activeLangKey={activeLangKey}
          busyLangKey={busyLangKey}
          onSelectWorld={onSelectWorld}
        />
      </div>
    </header>
  );
}
