"use client";

import { getRegion } from "@/lib/game/content/regions";
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
  const plaques = new Set(snapshot.items.map((item) => item.itemKey));

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
        <h3 className="font-display text-base font-extrabold">Regions</h3>
        <ul className="mt-2 flex flex-col gap-2.5">
          {snapshot.regions.map((region) => {
            const def = getRegion(region.key);
            const plaque = plaques.has(`plaque_${region.key}`);
            return (
              <li key={region.key} data-testid={`region-${region.key}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold">
                    <span aria-hidden="true">{def.icon}</span> {def.name}{" "}
                    {plaque ? (
                      <span title="Mastery plaque earned">🏆</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-bold text-fg-muted">
                    {region.unlocked
                      ? `${region.masteryPct}% mastery`
                      : "Locked"}
                  </span>
                </div>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-black/15">
                  <span
                    className="block h-full rounded-full bg-amber-400 transition-[width] duration-500"
                    style={{ width: `${region.masteryPct}%` }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-fg-muted">
          Grow 80% of a region&apos;s words into forest trees to earn its stone
          plaque.
        </p>
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
