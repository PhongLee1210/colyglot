"use client";

import type { FarmWorldSnapshot } from "@/lib/game/types";
import { XP_PER_LEVEL, xpIntoLevel } from "@/lib/xp";

import { panelCardClass } from "./controls";

export function ProgressTab({
  snapshot,
  streak,
  tierName,
}: {
  snapshot: FarmWorldSnapshot;
  streak: number;
  tierName: string;
}) {
  const intoLevel = xpIntoLevel(snapshot.xp);
  const plotCount = snapshot.beds.reduce((sum, bed) => sum + bed.plotCount, 0);
  const growing = snapshot.beds.reduce(
    (sum, bed) => sum + bed.plots.filter((plot) => plot.cardId).length,
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <section className={panelCardClass}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-extrabold">
            Level {snapshot.level}
          </h3>
          <span className="text-xs font-bold text-fg-muted">
            {intoLevel} / {XP_PER_LEVEL} XP
          </span>
        </div>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-black/15">
          <span
            className="block h-full rounded-full bg-green-500 transition-[width] duration-500"
            style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
          />
        </span>
        <p className="mt-2 text-xs text-fg-muted">
          {tierName} · {streak} day streak
        </p>
      </section>

      <section className={panelCardClass}>
        <h3 className="font-display text-base font-extrabold">This farm</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <ProgressStat
            label="Words planted"
            value={snapshot.world.stats.planted}
          />
          <ProgressStat
            label="Harvested"
            value={snapshot.world.stats.harvested}
          />
          <ProgressStat
            label="Gold earned"
            value={snapshot.world.stats.goldEarned}
          />
          <ProgressStat label="Gold on hand" value={snapshot.world.gold} />
          <ProgressStat label="Plots" value={`${growing} / ${plotCount}`} />
          <ProgressStat label="Beds" value={snapshot.beds.length} />
        </dl>
      </section>

      <section className={panelCardClass}>
        <h3 className="font-display text-base font-extrabold">Right now</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <ProgressStat label="New seedlings" value={snapshot.freshCount} />
          <ProgressStat label="Ready to harvest" value={snapshot.dueCount} />
        </dl>
      </section>
    </div>
  );
}

function ProgressStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="font-display text-lg font-extrabold">{value}</dd>
    </div>
  );
}
