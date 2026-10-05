"use client";

import { getRegion, MASTERY_THRESHOLD } from "@/lib/game/content/regions";
import type { FarmWorldSnapshot } from "@/lib/game/types";
import { useT } from "@/lib/i18n/use-t";
import { XP_PER_LEVEL, xpIntoLevel } from "@/lib/xp";

import { panelCardClass } from "./controls";

export function ProgressTab({
  snapshot,
  streak,
  tierKey,
}: {
  snapshot: FarmWorldSnapshot;
  streak: number;
  tierKey: string;
}) {
  const t = useT();
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
            {t.progress.level(snapshot.level)}
          </h3>
          <span className="text-xs font-bold text-fg-muted">
            {t.progress.xpOfTotal(intoLevel, XP_PER_LEVEL)}
          </span>
        </div>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-black/15">
          <span
            className="block h-full rounded-full bg-green-500 transition-[width] duration-500"
            style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
          />
        </span>
        <p className="mt-2 text-xs text-fg-muted">
          {t.farmTiers[tierKey].name} · {t.progress.dayStreak(streak)}
        </p>
      </section>

      <section className={panelCardClass}>
        <h3 className="font-display text-base font-extrabold">
          {t.progress.thisFarm}
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <ProgressStat
            label={t.progress.wordsPlanted}
            value={snapshot.world.stats.planted}
          />
          <ProgressStat
            label={t.progress.harvested}
            value={snapshot.world.stats.harvested}
          />
          <ProgressStat
            label={t.progress.goldEarned}
            value={snapshot.world.stats.goldEarned}
          />
          <ProgressStat
            label={t.progress.goldOnHand}
            value={snapshot.world.gold}
          />
          <ProgressStat
            label={t.progress.plots}
            value={`${growing} / ${plotCount}`}
          />
          <ProgressStat label={t.progress.beds} value={snapshot.beds.length} />
        </dl>
      </section>

      <section className={panelCardClass}>
        <h3 className="font-display text-base font-extrabold">
          {t.progress.regions}
        </h3>
        <ul className="mt-2 flex flex-col gap-2.5">
          {snapshot.regions.map((region) => {
            const def = getRegion(region.key);
            const plaque = plaques.has(`plaque_${region.key}`);
            return (
              <li key={region.key} data-testid={`region-${region.key}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold">
                    <span aria-hidden="true">{def.icon}</span>{" "}
                    {t.regions[region.key].name}{" "}
                    {plaque ? (
                      <span title={t.progress.plaqueEarned}>🏆</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-bold text-fg-muted">
                    {region.unlocked
                      ? t.progress.masteryPct(region.masteryPct)
                      : t.common.locked}
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
          {t.progress.plaqueHint(Math.round(MASTERY_THRESHOLD * 100))}
        </p>
      </section>

      <section className={panelCardClass}>
        <h3 className="font-display text-base font-extrabold">
          {t.progress.rightNow}
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <ProgressStat
            label={t.progress.newSeedlings}
            value={snapshot.freshCount}
          />
          <ProgressStat
            label={t.progress.readyToHarvest}
            value={snapshot.dueCount}
          />
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
