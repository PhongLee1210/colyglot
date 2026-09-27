"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { expandBedAction } from "@/lib/actions/farm";
import { shade } from "@/lib/game/art/palette";
import type { FarmTheme } from "@/lib/game/content/types";
import { cropStage } from "@/lib/game/core/crops";
import { expandBedCost } from "@/lib/game/core/economy";
import { applyExpand, useFarmStore } from "@/lib/game/store/farm-store";
import type { FarmWorldSnapshot } from "@/lib/game/types";

import { CropArt } from "./art/crop-art";
import {
  Butterfly,
  Cloud,
  Fence,
  Flower,
  Pond,
  Rock,
  Shed,
  Sun,
  Tree,
  grassTexture,
} from "./art/farm-decor";
import { PlotTile } from "./art/plot-tile";

function bedReadyCount(
  bed: FarmWorldSnapshot["beds"][number],
  now: Date | null
): number {
  if (!now) return 0;
  return bed.plots.filter((plot) => {
    if (!plot.hanzi || !plot.schedule) return false;
    const stage = cropStage(plot.schedule, now);
    return stage === "ready" || stage === "urgent";
  }).length;
}

export function FarmScene({
  snapshot,
  theme,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  theme: FarmTheme;
  now: Date | null;
}) {
  const hydrate = useFarmStore((state) => state.hydrate);
  const { toast } = useToast();
  const [busyBed, setBusyBed] = useState<string | null>(null);
  // Spending gold deserves a confirm step; the arm resets after 4s.
  const [armedBed, setArmedBed] = useState<string | null>(null);

  useEffect(() => {
    if (!armedBed) return;
    const timer = setTimeout(() => setArmedBed(null), 4000);
    return () => clearTimeout(timer);
  }, [armedBed]);

  async function expand(bedId: string, plotCount: number) {
    if (armedBed !== bedId) {
      setArmedBed(bedId);
      return;
    }
    setArmedBed(null);
    setBusyBed(bedId);
    try {
      const result = await expandBedAction(bedId);
      if (result.ok) {
        hydrate(
          applyExpand(snapshot, bedId, result.data.plotCount, result.data.gold)
        );
      } else {
        toast(`Need ${expandBedCost(plotCount)} gold to expand`, "danger");
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    } finally {
      setBusyBed(null);
    }
  }

  return (
    <div
      className="relative min-h-dvh overflow-x-clip pb-36 pt-24"
      style={{
        background: `linear-gradient(to bottom, ${theme.sky[0]}, ${theme.sky[1]} 42%, ${theme.ground[0]} 42.5%, ${theme.ground[1]})`,
      }}
    >
      {/* Sky band — sun, drifting clouds, one butterfly; pure decor. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden">
        <Sun className="absolute right-6 top-4 w-16 sm:w-20" />
        <Cloud className="absolute left-[6%] top-8 w-24" />
        <Cloud
          className="absolute left-[38%] top-16 w-32"
          style={{ animationDelay: "-30s" }}
        />
        <Cloud
          className="absolute right-[28%] top-4 w-20 opacity-80"
          style={{ animationDelay: "-55s" }}
        />
        <Butterfly className="absolute left-[22%] top-28 w-5" delay={400} />
      </div>

      <div
        className="relative mx-auto w-full max-w-3xl px-4 lg:max-w-5xl"
        style={grassTexture(theme.ground)}
      >
        <Fence
          posts={10}
          className="mx-auto mb-[-4px] block h-7 w-full max-w-md"
        />

        {/* A ready-crop legend so the metaphor is self-explaining; kept in
            flow above the beds so the fixed action bar never covers it. */}
        <div className="glass mx-auto mb-6 flex w-fit items-center gap-4 rounded-full px-4 py-2 text-xs font-semibold text-fg">
          <CropArt
            stage="fresh"
            variant={0}
            theme={theme}
            className="h-5 w-5"
            animated={false}
          />
          <span>New</span>
          <CropArt
            stage="growing"
            variant={1}
            theme={theme}
            className="h-5 w-5"
            animated={false}
          />
          <span>Growing</span>
          <CropArt
            stage="ready"
            variant={2}
            theme={theme}
            className="h-5 w-5"
            animated={false}
          />
          <span>Ready</span>
          <CropArt
            stage="urgent"
            variant={0}
            theme={theme}
            className="h-5 w-5"
            animated={false}
          />
          <span>Urgent</span>
        </div>

        {snapshot.beds.map((bed) => {
          const ready = bedReadyCount(bed, now);
          return (
            <section
              key={bed.id}
              className="relative mb-6 rounded-3xl border-2 p-4"
              style={{
                borderColor: shade(theme.plotBorder, 0.15),
                background: `${shade(theme.ground[0], -0.04)}cc`,
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-white drop-shadow">
                  {bed.name}
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                    {bed.plots.filter((plot) => plot.hanzi).length}/
                    {bed.plotCount} words
                  </span>
                  {ready > 0 ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: theme.accent }}
                    >
                      {ready} ready
                    </span>
                  ) : null}
                </h2>
                <button
                  type="button"
                  aria-label={`Expand ${bed.name}`}
                  className="glass rounded-full px-3 py-1.5 text-xs font-bold text-fg transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busyBed === bed.id}
                  onClick={() => expand(bed.id, bed.plotCount)}
                >
                  {armedBed === bed.id
                    ? `Spend ${expandBedCost(bed.plotCount)}💰?`
                    : `+3 plots · 💰 ${expandBedCost(bed.plotCount)}`}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {bed.plots.map((plot) => (
                  <PlotTile
                    key={plot.slotIndex}
                    plot={plot}
                    theme={theme}
                    now={now}
                  />
                ))}
              </div>
              <Tree className="pointer-events-none absolute -top-8 right-6 hidden w-12 sm:block" />
            </section>
          );
        })}

        {/* Ground decor row — shed, pond, flowers, rocks; pointer-transparent. */}
        <div className="pointer-events-none relative flex items-end justify-between gap-4 overflow-visible px-1 pb-6 sm:px-8">
          <Shed className="w-20 shrink-0 sm:w-24" />
          <Flower className="w-4 shrink-0" hue="pink" />
          <Pond className="w-32 shrink-0 sm:w-40" />
          <Flower className="w-4 shrink-0" hue="yellow" />
          <Rock className="w-10 shrink-0" />
        </div>
      </div>
    </div>
  );
}
