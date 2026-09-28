"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { expandBedAction } from "@/lib/actions/farm";
import { cropStage } from "@/lib/game/core/crops";
import { expandBedCost } from "@/lib/game/core/economy";
import { useFarmStore } from "@/lib/game/store/farm-store";
import { useFxStore } from "@/lib/game/store/fx-store";
import { applyExpand } from "@/lib/game/store/reducers";
import type { FarmWorldSnapshot } from "@/lib/game/types";

export function BedRail({
  snapshot,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  now: Date | null;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-3 top-[4.4rem] z-10 flex gap-2 overflow-x-auto pb-1 sm:inset-x-auto sm:left-3 sm:top-24 sm:flex-col sm:overflow-visible">
      {snapshot.beds.map((bed) => (
        <BedChip key={bed.id} snapshot={snapshot} bed={bed} now={now} />
      ))}
    </div>
  );
}

function BedChip({
  snapshot,
  bed,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  bed: FarmWorldSnapshot["beds"][number];
  now: Date | null;
}) {
  const hydrate = useFarmStore((state) => state.hydrate);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const planted = bed.plots.filter((plot) => plot.hanzi).length;
  const ready =
    now === null
      ? 0
      : bed.plots.filter((plot) => {
          if (!plot.hanzi || !plot.schedule) return false;
          const stage = cropStage(plot.schedule, now);
          return stage === "ready" || stage === "urgent";
        }).length;
  const cost = expandBedCost(bed.plotCount);

  async function expand() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setBusy(true);
    try {
      const result = await expandBedAction(bed.id);
      if (result.ok) {
        hydrate(
          applyExpand(snapshot, bed.id, result.data.plotCount, result.data.gold)
        );
        useFxStore.getState().react("hop");
      } else {
        toast(`Need ${cost} gold to expand`, "danger");
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass pointer-events-auto flex shrink-0 items-center gap-2 rounded-2xl px-3 py-1.5">
      <span className="text-xs font-extrabold text-fg">{bed.name}</span>
      <span
        data-testid="bed-words"
        className="rounded-full bg-white/40 px-1.5 text-[11px] font-bold text-fg dark:bg-black/30"
      >
        {planted}/{bed.plotCount} words
      </span>
      {ready > 0 ? (
        <span className="rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] font-bold text-on-accent">
          {ready} ready
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`Expand ${bed.name}`}
        className="rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-bold text-fg transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/35"
        disabled={busy}
        onClick={expand}
      >
        {armed ? `Spend ${cost}💰?` : `+3 · ${cost}💰`}
      </button>
    </div>
  );
}
