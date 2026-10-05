"use client";

import { useEffect } from "react";

import { cropStage, daysToGraduation, waitSpan } from "@/lib/game/core/crops";
import { useSelectionStore } from "@/lib/game/store/selection-store";
import type { FarmWorldSnapshot } from "@/lib/game/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { bedName } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";

function stageLine(
  t: Dictionary,
  plot: FarmWorldSnapshot["beds"][number]["plots"][number],
  now: Date | null
): string | null {
  if (!plot.hanzi || !plot.schedule || now === null) return null;
  switch (cropStage(plot.schedule, now)) {
    case "fresh":
      return t.plot.stageFresh;
    case "growing":
      return t.plot.stageGrowing(t.wait(waitSpan(plot.schedule.dueAt, now)));
    case "ready":
      return t.plot.stageReady;
    case "urgent":
      return t.plot.stageUrgent;
  }
}

// Graduation countdown (GAME_PLAY §6.2): the tapped plot tells the player
// exactly how close their word is to becoming a forest tree.
function GraduationLine({
  schedule,
  now,
}: {
  schedule: NonNullable<
    FarmWorldSnapshot["beds"][number]["plots"][number]["schedule"]
  >;
  now: Date;
}) {
  const t = useT();
  const days = daysToGraduation(schedule, now);
  if (days === null) return null;
  return (
    <p
      data-testid="graduation-countdown"
      className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400"
    >
      {t.plot.graduatesIn(days)}
    </p>
  );
}

// Glass info card for the tapped plot: bottom-anchored above the dock on
// phones, bottom-left beside the farm from sm up so it never lands under
// the side panel. Reads the shared selection store and offers the natural
// next action (harvest a ripe crop, plant an empty plot).
export function PlotInfoCard({
  snapshot,
  now,
  onOpenSeeds,
  onOpenHarvest,
}: {
  snapshot: FarmWorldSnapshot;
  now: Date | null;
  onOpenSeeds: () => void;
  onOpenHarvest: () => void;
}) {
  const t = useT();
  const selection = useSelectionStore((state) => state.plot);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  useEffect(() => {
    if (!selection) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") clearSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, clearSelection]);

  if (!selection) return null;
  const bed = snapshot.beds.find(
    (candidate) => candidate.id === selection.bedId
  );
  const plot = bed?.plots.find(
    (candidate) => candidate.slotIndex === selection.slotIndex
  );
  if (!bed || !plot) return null;

  const line = stageLine(t, plot, now);
  const stage =
    plot.hanzi && plot.schedule && now !== null
      ? cropStage(plot.schedule, now)
      : null;
  const ready = stage === "ready" || stage === "urgent";

  function act(open: () => void) {
    clearSelection();
    open();
  }

  return (
    <aside
      data-testid="plot-info"
      role="dialog"
      aria-label={
        plot.hanzi ? t.plot.ariaDetails(plot.hanzi) : t.plot.ariaEmptyDetails
      }
      className="glass-warm fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-30 rounded-2xl p-4 text-fg sm:inset-x-auto sm:left-3 sm:w-72"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-fg-muted">
          {bedName(t, bed)}
        </p>
        <button
          type="button"
          aria-label={t.plot.close}
          className="-m-1 flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
          onClick={clearSelection}
        >
          ✕
        </button>
      </div>

      {plot.hanzi ? (
        <>
          <p className="mt-1 font-hanzi text-3xl font-bold leading-tight">
            {plot.hanzi}
            <span className="ml-2 font-sans text-sm font-normal text-fg-muted">
              {plot.pinyin}
            </span>
          </p>
          <p className="text-sm font-semibold">{plot.translation}</p>
          {line ? <p className="mt-1 text-xs text-fg-muted">{line}</p> : null}
          {plot.hanzi && plot.schedule && now !== null ? (
            <GraduationLine schedule={plot.schedule} now={now} />
          ) : null}
          {ready ? (
            <button
              type="button"
              className="mt-3 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-extrabold text-on-accent transition hover:brightness-105 active:scale-95"
              onClick={() => act(onOpenHarvest)}
            >
              {t.plot.harvestNow}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm font-bold">{t.plot.emptyPlot}</p>
          <p className="mt-1 text-xs text-fg-muted">{t.plot.plantHint}</p>
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-extrabold text-on-accent transition hover:brightness-105 active:scale-95"
            onClick={() => act(onOpenSeeds)}
          >
            {t.plot.plantSeeds}
          </button>
        </>
      )}
    </aside>
  );
}
