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
import { bedName } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";

export function BedRail({
  snapshot,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  now: Date | null;
}) {
  return (
    // A row under the topbar on phones, a column beside the farm from sm
    // up — the panel is a bottom sheet on phones, so the two never meet.
    <div className="pointer-events-none fixed left-2 top-[calc(var(--hud-top)+3.5rem)] z-20 flex max-w-[calc(100vw-11rem)] gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:left-3 sm:max-w-none sm:flex-col sm:overflow-visible [&::-webkit-scrollbar]:hidden">
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
  const t = useT();
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
  // The greenhouse only ever receives demoted words (GAME_PLAY §5.2) —
  // expanding it would be buying recovery slots, which is not a thing.
  const greenhouse = bed.kind === "greenhouse";
  const bedLabel = bedName(t, bed);

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
        toast(t.beds.needGoldToExpand(cost), "danger");
      }
    } catch {
      toast(t.farm.connectionLost, "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-dark pointer-events-auto flex w-max shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-white">
      <span className="font-display text-xs font-extrabold">
        {greenhouse ? "🌱 " : ""}
        {bedLabel}
      </span>
      <span
        data-testid="bed-words"
        className="rounded-full bg-black/30 px-1.5 text-[11px] font-bold"
      >
        {t.beds.wordCount(planted, bed.plotCount)}
      </span>
      {ready > 0 ? (
        <span className="rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] font-bold text-on-accent">
          {t.beds.readyCount(ready)}
        </span>
      ) : null}
      {greenhouse ? null : (
        <button
          type="button"
          aria-label={t.beds.expandAria(bedLabel)}
          className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold transition hover:bg-white/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          onClick={expand}
        >
          {armed ? t.beds.expandArm(cost) : t.beds.expandOffer(cost)}
        </button>
      )}
    </div>
  );
}
