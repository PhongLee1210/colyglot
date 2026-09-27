"use client";

import { useEffect, useState } from "react";

import { LANG_PACKS } from "@/lib/game/content";
import { useFarmStore } from "@/lib/game/store/farm-store";
import type { FarmWorldSnapshot } from "@/lib/game/types";

import { FarmScene } from "./farm-scene";
import { HarvestSession } from "./harvest-session";
import { NurserySession } from "./nursery-session";
import { SeedsPanel } from "./seeds-panel";
import { ShortcutRail } from "./shortcut-rail";
import { TopBar } from "./top-bar";
import { useClock } from "./use-clock";
import { useHydrated } from "./use-hydrated";

export function FarmGame({
  initialSnapshot,
  streak,
}: {
  initialSnapshot: FarmWorldSnapshot;
  streak: number;
}) {
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [open, setOpen] = useState<"seeds" | "nursery" | "harvest" | null>(
    null
  );
  const now = useClock();
  const hydrated = useHydrated();
  const navDisabled = !hydrated;

  useEffect(() => {
    hydrate(initialSnapshot);
  }, [initialSnapshot, hydrate]);

  const current = snapshot ?? initialSnapshot;
  const pack = LANG_PACKS[current.world.langKey];
  const tier = pack.tiers[current.world.tier];

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <TopBar
        flag={pack.flag}
        langName={pack.name}
        tierName={tier.name}
        gold={current.world.gold}
        level={current.level}
        xp={current.xp}
        streak={streak}
      />
      <FarmScene snapshot={current} theme={tier.theme} now={now} />
      <nav
        aria-label="Farm actions"
        className="glass fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 flex justify-around rounded-full py-2"
      >
        <button
          type="button"
          className="flex min-h-11 flex-col items-center rounded-full px-5 text-xs font-bold transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
          disabled={navDisabled}
          onClick={() => setOpen("seeds")}
        >
          <span aria-hidden="true" className="text-xl">
            🌰
          </span>
          Seeds
        </button>
        <button
          type="button"
          aria-label={
            current.freshCount > 0
              ? `Nursery, ${current.freshCount} new seedlings`
              : undefined
          }
          className="relative flex min-h-11 flex-col items-center rounded-full px-5 text-xs font-bold transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
          disabled={navDisabled}
          onClick={() => setOpen("nursery")}
        >
          <span aria-hidden="true" className="text-xl">
            🌱
          </span>
          Nursery
          {current.freshCount > 0 ? (
            <span className="absolute -top-1 right-1 rounded-full bg-accent px-1.5 text-[10px] font-extrabold text-on-accent">
              {current.freshCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-label={
            current.dueCount > 0
              ? `Harvest, ${current.dueCount} ready`
              : undefined
          }
          className="relative flex min-h-11 flex-col items-center rounded-full px-5 text-xs font-bold transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
          disabled={navDisabled}
          onClick={() => setOpen("harvest")}
        >
          <span aria-hidden="true" className="text-xl">
            🧺
          </span>
          Harvest
          {current.dueCount > 0 ? (
            <span className="absolute -top-1 right-1 rounded-full bg-accent px-1.5 text-[10px] font-extrabold text-on-accent">
              {current.dueCount}
            </span>
          ) : null}
        </button>
      </nav>
      <ShortcutRail />
      {open === "seeds" ? (
        <SeedsPanel open onClose={() => setOpen(null)} />
      ) : null}
      {open === "nursery" ? (
        <NurserySession onClose={() => setOpen(null)} />
      ) : null}
      {open === "harvest" ? (
        <HarvestSession streak={streak} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
