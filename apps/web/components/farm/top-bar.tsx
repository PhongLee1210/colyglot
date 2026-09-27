"use client";

import Link from "next/link";

import { XP_PER_LEVEL, xpIntoLevel } from "@/lib/xp";

import { GameSettings } from "./game-settings";

export function TopBar({
  flag,
  langName,
  tierName,
  gold,
  level,
  xp,
  streak,
}: {
  flag: string;
  langName: string;
  tierName: string;
  gold: number;
  level: number;
  xp: number;
  streak: number;
}) {
  const intoLevel = xpIntoLevel(xp);
  return (
    <header className="glass fixed inset-x-3 top-3 z-20 flex items-center justify-between gap-2 rounded-2xl px-4 py-2">
      <Link
        href="/"
        className="flex flex-col rounded-xl px-2 py-0.5 transition hover:bg-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
      >
        <span className="text-sm font-extrabold leading-tight">
          {flag} {langName}
        </span>
        <span className="mt-0.5 w-fit rounded-full bg-white/60 px-1.5 text-xs font-bold text-fg-muted dark:bg-black/35">
          {tierName}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {/* key={gold} remounts the chip so the bump replays per payout */}
        <span
          key={gold}
          data-testid="farm-gold"
          className="flex min-h-9 items-center gap-1 rounded-full bg-white/40 px-2.5 text-sm font-bold text-fg animate-[gold-bump_600ms_ease-out] dark:bg-black/25"
          title="gold"
        >
          💰 {gold}
        </span>
        <span
          className="flex min-h-9 items-center gap-1 rounded-full bg-white/40 px-2.5 text-sm font-bold text-fg dark:bg-black/25"
          title="day streak"
        >
          🔥 {streak}
        </span>
        <span className="flex min-h-9 flex-col items-center justify-center rounded-full bg-white/40 px-2.5 text-xs font-bold leading-tight text-fg dark:bg-black/25">
          <span>Lv {level}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/15">
            <span
              className="block h-full rounded-full bg-green-500"
              style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </span>
        </span>
        <GameSettings />
      </div>
    </header>
  );
}
